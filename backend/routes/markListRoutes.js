const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Initialize subjects_of_school_schema and required tables
const initializeSubjectsSchema = async () => {
  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS subjects_of_school_schema`);
    
    // Create subjects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects_of_school_schema.subjects (
        id SERIAL PRIMARY KEY,
        subject_name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create subject_class_mappings table for selective subject-class mappings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects_of_school_schema.subject_class_mappings (
        id SERIAL PRIMARY KEY,
        subject_name VARCHAR(100) NOT NULL,
        class_name VARCHAR(50) NOT NULL,
        subject_class VARCHAR(150) GENERATED ALWAYS AS (subject_name || ' Class ' || class_name) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(subject_name, class_name),
        FOREIGN KEY (subject_name) REFERENCES subjects_of_school_schema.subjects(subject_name) ON DELETE CASCADE
      )
    `);
    
    // Create teachers_subjects table for mapping teachers to subject-class combinations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects_of_school_schema.teachers_subjects (
        id SERIAL PRIMARY KEY,
        teacher_name VARCHAR(100) NOT NULL,
        subject_class VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(teacher_name, subject_class)
      )
    `);
    
    // Create school_config table for storing term count
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects_of_school_schema.school_config (
        id SERIAL PRIMARY KEY,
        term_count INTEGER NOT NULL DEFAULT 2,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default term count if not exists
    const configResult = await pool.query('SELECT * FROM subjects_of_school_schema.school_config WHERE id = 1');
    if (configResult.rows.length === 0) {
      await pool.query('INSERT INTO subjects_of_school_schema.school_config (id, term_count) VALUES (1, 2)');
    }
    
    console.log('Subjects schema initialized successfully');
  } catch (error) {
    console.error('Error initializing subjects schema:', error);
  }
};

initializeSubjectsSchema();

// Helper function to get class-subject mappings
const getClassSubjectMappings = async () => {
  try {
    const result = await pool.query(`
      SELECT subject_name, class_name, subject_class
      FROM subjects_of_school_schema.subject_class_mappings
      ORDER BY subject_name, class_name
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching class-subject mappings:', error);
    return [];
  }
};

// Route to configure subjects and terms
router.post('/configure-subjects', async (req, res) => {
  const { subjectCount, subjectNames, termCount } = req.body;
  
  if (!subjectCount || !subjectNames || !termCount) {
    return res.status(400).json({ error: 'Subject count, subject names, and term count are required' });
  }
  
  if (subjectNames.length !== parseInt(subjectCount)) {
    return res.status(400).json({ error: 'Number of subject names must match subject count' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear existing subjects
    await client.query('DELETE FROM subjects_of_school_schema.subjects');
    
    // Insert new subjects
    for (const subjectName of subjectNames) {
      if (subjectName.trim()) {
        await client.query(
          'INSERT INTO subjects_of_school_schema.subjects (subject_name) VALUES ($1)',
          [subjectName.trim()]
        );
      }
    }
    
    // Update term count
    await client.query(
      'UPDATE subjects_of_school_schema.school_config SET term_count = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [parseInt(termCount)]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Subjects and terms configured successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error configuring subjects:', error);
    res.status(500).json({ error: 'Failed to configure subjects', details: error.message });
  } finally {
    client.release();
  }
});

// Route to get all subjects
router.get('/subjects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects_of_school_schema.subjects ORDER BY subject_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects', details: error.message });
  }
});

// Route to get school configuration (term count)
router.get('/config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects_of_school_schema.school_config WHERE id = 1');
    res.json(result.rows[0] || { term_count: 2 });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config', details: error.message });
  }
});

// Route to get all classes
router.get('/classes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name AS class_name FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
    `);
    const classes = result.rows.map(row => row.class_name);
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes', details: error.message });
  }
});

// Route to map subjects to classes
router.post('/map-subjects-classes', async (req, res) => {
  const { mappings } = req.body; // Array of { className, subjectName }
  
  if (!mappings || !Array.isArray(mappings)) {
    return res.status(400).json({ error: 'Mappings array is required' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear existing mappings
    await client.query('DELETE FROM subjects_of_school_schema.subject_class_mappings');
    
    // Validate and insert new mappings
    for (const mapping of mappings) {
      if (!mapping.className || !mapping.subjectName) {
        continue;
      }
      
      // Validate class exists in classes_schema
      const classResult = await client.query(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'classes_schema' AND table_name = $1`,
        [mapping.className]
      );
      if (classResult.rows.length === 0) {
        throw new Error(`Class ${mapping.className} not found in classes_schema`);
      }
      
      // Validate subject exists
      const subjectResult = await client.query(
        'SELECT subject_name FROM subjects_of_school_schema.subjects WHERE subject_name = $1',
        [mapping.subjectName]
      );
      if (subjectResult.rows.length === 0) {
        throw new Error(`Subject ${mapping.subjectName} not found`);
      }
      
      // Insert mapping
      await client.query(
        'INSERT INTO subjects_of_school_schema.subject_class_mappings (class_name, subject_name) VALUES ($1, $2)',
        [mapping.className, mapping.subjectName]
      );
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Subject-class mappings saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error mapping subjects to classes:', error);
    res.status(500).json({ error: 'Failed to map subjects to classes', details: error.message });
  } finally {
    client.release();
  }
});

// Route to get subject-class mappings
router.get('/subjects-classes', async (req, res) => {
  try {
    const mappings = await getClassSubjectMappings();
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching subject-class mappings:', error);
    res.status(500).json({ error: 'Failed to fetch mappings', details: error.message });
  }
});

// Route to create mark list forms for subjects
router.post('/create-mark-forms', async (req, res) => {
  const { subjectName, className, termNumber, markComponents } = req.body;
  
  if (!subjectName || !className || !termNumber || !markComponents) {
    return res.status(400).json({ error: 'Subject name, class name, term number, and mark components are required' });
  }
  
  // Validate that mark components total 100%
  const totalPercentage = markComponents.reduce((sum, component) => sum + component.percentage, 0);
  if (totalPercentage !== 100) {
    return res.status(400).json({ error: 'Mark components must total 100%' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Validate class exists in classes_schema
    const classResult = await client.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'classes_schema' AND table_name = $1`,
      [className]
    );
    if (classResult.rows.length === 0) {
      throw new Error(`Class ${className} not found in classes_schema`);
    }
    
    // Validate subject exists
    const subjectResult = await client.query(
      'SELECT subject_name FROM subjects_of_school_schema.subjects WHERE subject_name = $1',
      [subjectName]
    );
    if (subjectResult.rows.length === 0) {
      throw new Error(`Subject ${subjectName} not found`);
    }
    
    // Create schema for the subject if it doesn't exist
    const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // Create table name for the specific class and term
    const tableName = `${className.toLowerCase()}_term_${termNumber}`;
    
    // Build column definitions
    const baseColumns = [
      'id SERIAL PRIMARY KEY',
      'student_name VARCHAR(100) NOT NULL',
      'age INTEGER',
      'gender VARCHAR(20)'
    ];
    
    const markColumns = markComponents.map(component => 
      `${component.name.toLowerCase().replace(/\s+/g, '_')} DECIMAL(5,2) DEFAULT 0`
    );
    
    const additionalColumns = [
      'total DECIMAL(5,2) DEFAULT 0',
      'pass_status VARCHAR(10) DEFAULT \'Fail\'',
      'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    ];
    
    const allColumns = [...baseColumns, ...markColumns, ...additionalColumns];
    
    // Drop table if exists and create new one
    await client.query(`DROP TABLE IF EXISTS ${schemaName}.${tableName}`);
    await client.query(`CREATE TABLE ${schemaName}.${tableName} (${allColumns.join(', ')})`);
    
    // Get students from the class table in classes_schema
    const studentsResult = await client.query(`SELECT student_name, age, gender FROM classes_schema."${className}"`);
    
    for (const student of studentsResult.rows) {
      const insertColumns = ['student_name', 'age', 'gender'];
      const insertValues = [student.student_name, student.age, student.gender];
      const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
      
      await client.query(
        `INSERT INTO ${schemaName}.${tableName} (${insertColumns.join(', ')}) VALUES (${placeholders})`,
        insertValues
      );
    }
    
    // Store mark form configuration with unique constraint
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.form_config (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(50) NOT NULL,
        term_number INTEGER NOT NULL,
        mark_components JSONB NOT NULL,
        pass_threshold DECIMAL(5,2) DEFAULT 50.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_class_term UNIQUE (class_name, term_number)
      )
    `);
    
    await client.query(`
      INSERT INTO ${schemaName}.form_config (class_name, term_number, mark_components, pass_threshold)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ON CONSTRAINT unique_class_term DO UPDATE SET
        mark_components = EXCLUDED.mark_components,
        pass_threshold = EXCLUDED.pass_threshold,
        created_at = CURRENT_TIMESTAMP
    `, [className, termNumber, JSON.stringify(markComponents), 50.00]);
    
    await client.query('COMMIT');
    res.json({ 
      message: 'Mark list form created successfully',
      schemaName,
      tableName,
      studentsCount: studentsResult.rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating mark form:', error);
    res.status(500).json({ error: 'Failed to create mark form', details: error.message });
  } finally {
    client.release();
  }
});

// Route to get mark list for a specific subject, class, and term
router.get('/mark-list/:subjectName/:className/:termNumber', async (req, res) => {
  const { subjectName, className, termNumber } = req.params;
  
  try {
    const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
    const tableName = `${className.toLowerCase()}_term_${termNumber}`;
    
    // Get mark list data
    const result = await pool.query(`SELECT * FROM ${schemaName}.${tableName} ORDER BY student_name`);
    
    // Get form configuration
    const configResult = await pool.query(
      `SELECT * FROM ${schemaName}.form_config WHERE class_name = $1 AND term_number = $2`,
      [className, termNumber]
    );
    
    res.json({
      markList: result.rows,
      config: configResult.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching mark list:', error);
    res.status(500).json({ error: 'Failed to fetch mark list', details: error.message });
  }
});

// Route to update marks for a student
router.put('/update-marks', async (req, res) => {
  const { subjectName, className, termNumber, studentId, marks } = req.body;
  
  if (!subjectName || !className || !termNumber || !studentId || !marks) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
    const tableName = `${className.toLowerCase()}_term_${termNumber}`;
    
    // Get form configuration to validate marks
    const configResult = await client.query(
      `SELECT * FROM ${schemaName}.form_config WHERE class_name = $1 AND term_number = $2`,
      [className, termNumber]
    );
    
    if (configResult.rows.length === 0) {
      throw new Error('Form configuration not found');
    }
    
    const config = configResult.rows[0];
    const markComponents = config.mark_components;
    
    // Build update query
    const updateColumns = [];
    const updateValues = [];
    let total = 0;
    
    for (const component of markComponents) {
      const componentKey = component.name.toLowerCase().replace(/\s+/g, '_');
      if (marks[componentKey] !== undefined) {
        const mark = parseFloat(marks[componentKey]);
        const maxMark = component.percentage;
        
        // Ensure mark doesn't exceed component percentage
        const finalMark = Math.min(mark, maxMark);
        updateColumns.push(`${componentKey} = $${updateValues.length + 1}`);
        updateValues.push(finalMark);
        total += finalMark;
      }
    }
    
    // Ensure total doesn't exceed 100
    total = Math.min(total, 100);
    
    // Determine pass status
    const passStatus = total >= config.pass_threshold ? 'Pass' : 'Fail';
    
    updateColumns.push(`total = $${updateValues.length + 1}`);
    updateValues.push(total);
    updateColumns.push(`pass_status = $${updateValues.length + 1}`);
    updateValues.push(passStatus);
    updateColumns.push(`updated_at = CURRENT_TIMESTAMP`);
    
    updateValues.push(studentId);
    
    const updateQuery = `
      UPDATE ${schemaName}.${tableName} 
      SET ${updateColumns.join(', ')} 
      WHERE id = $${updateValues.length}
    `;
    
    await client.query(updateQuery, updateValues);
    
    await client.query('COMMIT');
    res.json({ message: 'Marks updated successfully', total, passStatus });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating marks:', error);
    res.status(500).json({ error: 'Failed to update marks', details: error.message });
  } finally {
    client.release();
  }
});

// Route to get teachers from staff
router.get('/teachers', async (req, res) => {
  try {
    // Get all staff schemas
    const schemasResult = await pool.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name LIKE 'staff_%'
    `);
    
    const teachers = [];
    
    for (const schema of schemasResult.rows) {
      const schemaName = schema.schema_name;
      
      // Get tables in this schema
      const tablesResult = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name != 'staff_counter'
      `, [schemaName]);
      
      for (const table of tablesResult.rows) {
        const tableName = table.table_name;
        
        // Get teachers from this table
        const teachersResult = await pool.query(`
          SELECT name, role FROM "${schemaName}"."${tableName}" 
          WHERE role = 'Teacher'
        `);
        
        teachers.push(...teachersResult.rows.map(row => ({
          name: row.name,
          role: row.role,
          schema: schemaName,
          table: tableName
        })));
      }
    }
    
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers', details: error.message });
  }
});

// Route to calculate class ranking
router.get('/ranking/:className/:termNumber', async (req, res) => {
  const { className, termNumber } = req.params;
  
  try {
    // Validate class exists
    const classResult = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'classes_schema' AND table_name = $1`,
      [className]
    );
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: `Class ${className} not found` });
    }
    
    // Get subjects for this class
    const subjectsResult = await pool.query(
      'SELECT subject_name FROM subjects_of_school_schema.subject_class_mappings WHERE class_name = $1',
      [className]
    );
    
    const subjects = subjectsResult.rows;
    
    // Fetch marks from each subject
    const studentData = {};
    
    for (const subject of subjects) {
      const subjectName = subject.subject_name;
      const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
      const tableName = `${className.toLowerCase()}_term_${termNumber}`;
      
      try {
        const marksResult = await pool.query(`SELECT student_name, total FROM ${schemaName}.${tableName}`);
        
        for (const mark of marksResult.rows) {
          if (!studentData[mark.student_name]) {
            studentData[mark.student_name] = { totalMarks: 0, subjectCount: 0 };
          }
          studentData[mark.student_name].totalMarks += mark.total || 0;
          studentData[mark.student_name].subjectCount++;
        }
      } catch (error) {
        console.log(`No marks for ${subjectName} yet`);
      }
    }
    
    // Calculate averages
    const rankings = Object.entries(studentData).map(([studentName, data]) => ({
      studentName,
      average: data.subjectCount > 0 ? data.totalMarks / data.subjectCount : 0
    }));
    
    // Sort by average (descending) and assign ranks
    rankings.sort((a, b) => b.average - a.average);
    rankings.forEach((student, index) => {
      student.rank = index + 1;
    });
    
    res.json({
      className,
      termNumber,
      rankings,
      subjects: subjects.map(s => s.subject_name)
    });
  } catch (error) {
    console.error('Error calculating class ranking:', error);
    res.status(500).json({ error: 'Failed to calculate class ranking', details: error.message });
  }
});

// Route to get available subject-class combinations for teacher assignment
router.get('/subject-class-combinations', async (req, res) => {
  try {
    const mappings = await getClassSubjectMappings();
    res.json(mappings.map(mapping => ({
      subject_name: mapping.subject_name,
      class_name: mapping.class_name,
      subject_class: mapping.subject_class
    })));
  } catch (error) {
    console.error('Error fetching subject-class combinations:', error);
    res.status(500).json({ error: 'Failed to fetch combinations', details: error.message });
  }
});

// Route to get mark list forms for a teacher
router.get('/teacher-mark-lists/:teacherName', async (req, res) => {
  const { teacherName } = req.params;
  
  try {
    // Get teacher's assigned subject-class combinations
    const assignmentsResult = await pool.query(
      'SELECT subject_class FROM subjects_of_school_schema.teachers_subjects WHERE teacher_name = $1',
      [teacherName]
    );
    
    if (assignmentsResult.rows.length === 0) {
      return res.json({ message: 'No subjects assigned to this teacher', assignments: [] });
    }
    
    const assignments = assignmentsResult.rows;
    const markListForms = [];
    
    // Get term count
    const configResult = await pool.query('SELECT term_count FROM subjects_of_school_schema.school_config WHERE id = 1');
    const termCount = configResult.rows[0]?.term_count || 2;
    
    for (const assignment of assignments) {
      // Parse subject and class from subject_class string
      const match = assignment.subject_class.match(/^(.+) Class (.+)$/);
      if (match) {
        const [, subjectName, className] = match;
        
        // Check which terms have mark list forms
        const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
        
        for (let term = 1; term <= termCount; term++) {
          const tableName = `${className.toLowerCase()}_term_${term}`;
          
          try {
            // Check if table exists
            const tableExistsResult = await pool.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = $1 AND table_name = $2
              )
            `, [schemaName, tableName]);
            
            if (tableExistsResult.rows[0].exists) {
              markListForms.push({
                subjectName,
                className,
                termNumber: term,
                subjectClass: assignment.subject_class,
                formId: `${subjectName}_${className}_${term}`
              });
            }
          } catch (error) {
            console.log(`Table ${schemaName}.${tableName} does not exist`);
          }
        }
      }
    }
    
    res.json({
      teacherName,
      assignments: markListForms
    });
  } catch (error) {
    console.error('Error fetching teacher mark lists:', error);
    res.status(500).json({ error: 'Failed to fetch teacher mark lists', details: error.message });
  }
});

// Route to calculate and update all totals for a specific mark list
router.post('/calculate-totals', async (req, res) => {
  const { subjectName, className, termNumber } = req.body;
  
  if (!subjectName || !className || !termNumber) {
    return res.status(400).json({ error: 'Subject name, class name, and term number are required' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
    const tableName = `${className.toLowerCase()}_term_${termNumber}`;
    
    // Get form configuration
    const configResult = await client.query(
      `SELECT * FROM ${schemaName}.form_config WHERE class_name = $1 AND term_number = $2`,
      [className, termNumber]
    );
    
    if (configResult.rows.length === 0) {
      throw new Error('Form configuration not found');
    }
    
    const config = configResult.rows[0];
    const markComponents = config.mark_components;
    
    // Get all students
    const studentsResult = await client.query(`SELECT id FROM ${schemaName}.${tableName}`);
    
    for (const student of studentsResult.rows) {
      // Calculate total for this student
      let total = 0;
      const componentColumns = markComponents.map(comp => 
        comp.name.toLowerCase().replace(/\s+/g, '_')
      );
      
      const studentDataResult = await client.query(
        `SELECT ${componentColumns.join(', ')} FROM ${schemaName}.${tableName} WHERE id = $1`,
        [student.id]
      );
      
      if (studentDataResult.rows.length > 0) {
        const studentData = studentDataResult.rows[0];
        
        markComponents.forEach(component => {
          const componentKey = component.name.toLowerCase().replace(/\s+/g, '_');
          const mark = parseFloat(studentData[componentKey]) || 0;
          const maxMark = component.percentage;
          total += Math.min(mark, maxMark);
        });
        
        // Ensure total doesn't exceed 100
        total = Math.min(total, 100);
        
        // Determine pass status
        const passStatus = total >= config.pass_threshold ? 'Pass' : 'Fail';
        
        // Update student record
        await client.query(
          `UPDATE ${schemaName}.${tableName} 
           SET total = $1, pass_status = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [total, passStatus, student.id]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Totals calculated and updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error calculating totals:', error);
    res.status(500).json({ error: 'Failed to calculate totals', details: error.message });
  } finally {
    client.release();
  }
});

// Route to get comprehensive class ranking with detailed breakdown
router.get('/comprehensive-ranking/:className/:termNumber', async (req, res) => {
  const { className, termNumber } = req.params;
  
  try {
    // Validate class exists in classes_schema
    const classResult = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'classes_schema' AND table_name = $1`,
      [className]
    );
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: `Class ${className} not found in classes_schema` });
    }
    
    // Get subjects for this class from subject_class_mappings
    const subjectsResult = await pool.query(
      'SELECT subject_name FROM subjects_of_school_schema.subject_class_mappings WHERE class_name = $1',
      [className]
    );
    
    const subjects = subjectsResult.rows;
    const studentData = {};
    const subjectDetails = {};
    
    // Get marks from each subject
    for (const subject of subjects) {
      const subjectName = subject.subject_name;
      const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
      const tableName = `${className.toLowerCase()}_term_${termNumber}`;
      
      try {
        // Get marks and form configuration
        const [marksResult, configResult] = await Promise.all([
          pool.query(`SELECT student_name, total, pass_status FROM ${schemaName}.${tableName}`),
          pool.query(`SELECT * FROM ${schemaName}.form_config WHERE class_name = $1 AND term_number = $2`, 
                    [className, termNumber])
        ]);
        
        subjectDetails[subjectName] = {
          config: configResult.rows[0] || null,
          hasData: marksResult.rows.length > 0
        };
        
        for (const mark of marksResult.rows) {
          if (!studentData[mark.student_name]) {
            studentData[mark.student_name] = {
              studentName: mark.student_name,
              subjects: {},
              totalMarks: 0,
              subjectCount: 0,
              passedSubjects: 0,
              failedSubjects: 0
            };
          }
          
          const total = Math.min(mark.total || 0, 100);
          studentData[mark.student_name].subjects[subjectName] = {
            total: total,
            status: mark.pass_status || 'Fail'
          };
          studentData[mark.student_name].totalMarks += total;
          studentData[mark.student_name].subjectCount++;
          
          if (mark.pass_status === 'Pass') {
            studentData[mark.student_name].passedSubjects++;
          } else {
            studentData[mark.student_name].failedSubjects++;
          }
        }
      } catch (error) {
        console.log(`Mark list not found for ${subjectName} ${className} term ${termNumber}`);
        subjectDetails[subjectName] = {
          config: null,
          hasData: false
        };
      }
    }
    
    // Calculate averages and rankings
    const rankings = Object.values(studentData).map(student => ({
      ...student,
      average: student.subjectCount > 0 ? student.totalMarks / student.subjectCount : 0,
      overallStatus: student.failedSubjects === 0 && student.subjectCount > 0 ? 'Pass' : 'Fail'
    }));
    
    // Sort by average (descending) and assign ranks
    rankings.sort((a, b) => {
      if (b.average !== a.average) {
        return b.average - a.average;
      }
      // If averages are equal, sort by total marks
      return b.totalMarks - a.totalMarks;
    });
    
    rankings.forEach((student, index) => {
      student.rank = index + 1;
      // Add ordinal suffix
      const rank = student.rank;
      let suffix = 'th';
      if (rank % 10 === 1 && rank % 100 !== 11) suffix = 'st';
      else if (rank % 10 === 2 && rank % 100 !== 12) suffix = 'nd';
      else if (rank % 10 === 3 && rank % 100 !== 13) suffix = 'rd';
      student.rankDisplay = `${rank}${suffix}`;
    });
    
    res.json({
      className,
      termNumber,
      rankings,
      subjects: subjects.map(s => s.subject_name),
      subjectDetails,
      summary: {
        totalStudents: rankings.length,
        totalSubjects: subjects.length,
        averageClassScore: rankings.length > 0 ? 
          rankings.reduce((sum, s) => sum + s.average, 0) / rankings.length : 0,
        passRate: rankings.length > 0 ? 
          (rankings.filter(s => s.overallStatus === 'Pass').length / rankings.length) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Error calculating comprehensive ranking:', error);
    res.status(500).json({ error: 'Failed to calculate ranking', details: error.message });
  }
});

// Route to get mark list statistics
router.get('/statistics/:subjectName/:className/:termNumber', async (req, res) => {
  const { subjectName, className, termNumber } = req.params;
  
  try {
    const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
    const tableName = `${className.toLowerCase()}_term_${termNumber}`;
    
    // Get all marks
    const marksResult = await pool.query(`
      SELECT total, pass_status FROM ${schemaName}.${tableName}
      WHERE total IS NOT NULL
    `);
    
    if (marksResult.rows.length === 0) {
      return res.json({ message: 'No marks found', statistics: null });
    }
    
    const marks = marksResult.rows.map(row => row.total);
    const passCount = marksResult.rows.filter(row => row.pass_status === 'Pass').length;
    const failCount = marksResult.rows.length - passCount;
    
    // Calculate statistics
    const total = marks.reduce((sum, mark) => sum + mark, 0);
    const average = total / marks.length;
    const highest = Math.max(...marks);
    const lowest = Math.min(...marks);
    
    // Calculate median
    const sortedMarks = [...marks].sort((a, b) => a - b);
    const median = sortedMarks.length % 2 === 0
      ? (sortedMarks[sortedMarks.length / 2 - 1] + sortedMarks[sortedMarks.length / 2]) / 2
      : sortedMarks[Math.floor(sortedMarks.length / 2)];
    
    // Grade distribution
    const gradeDistribution = {
      'A (90-100)': marks.filter(m => m >= 90).length,
      'B (80-89)': marks.filter(m => m >= 80 && m < 90).length,
      'C (70-79)': marks.filter(m => m >= 70 && m < 80).length,
      'D (60-69)': marks.filter(m => m >= 60 && m < 70).length,
      'F (0-59)': marks.filter(m => m < 60).length
    };
    
    res.json({
      subjectName,
      className,
      termNumber,
      statistics: {
        totalStudents: marks.length,
        average: Math.round(average * 100) / 100,
        highest,
        lowest,
        median: Math.round(median * 100) / 100,
        passCount,
        failCount,
        passRate: Math.round((passCount / marks.length) * 100 * 100) / 100,
        gradeDistribution
      }
    });
  } catch (error) {
    console.error('Error calculating statistics:', error);
    res.status(500).json({ error: 'Failed to calculate statistics', details: error.message });
  }
});

router.get('/classes/:teacherId', async (req, res) => {
  const { teacherId } = req.params;
  try {
    const { getTeacherClasses } = require('../utils/permissions');
    const classes = await getTeacherClasses(teacherId);
    res.json({ classes });
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes', details: error.message });
  }
});

// Route to bulk update marks (for importing from spreadsheet)
router.post('/bulk-update-marks', async (req, res) => {
  const { subjectName, className, termNumber, marksData } = req.body;
  
  if (!subjectName || !className || !termNumber || !marksData || !Array.isArray(marksData)) {
    return res.status(400).json({ error: 'All fields are required and marksData must be an array' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
    const tableName = `${className.toLowerCase()}_term_${termNumber}`;
    
    // Get form configuration
    const configResult = await client.query(
      `SELECT * FROM ${schemaName}.form_config WHERE class_name = $1 AND term_number = $2`,
      [className, termNumber]
    );
    
    if (configResult.rows.length === 0) {
      throw new Error('Form configuration not found');
    }
    
    const config = configResult.rows[0];
    const markComponents = config.mark_components;
    
    let updatedCount = 0;
    
    for (const studentMarks of marksData) {
      const { studentName, marks } = studentMarks;
      
      if (!studentName || !marks) continue;
      
      // Find student by name
      const studentResult = await client.query(
        `SELECT id FROM ${schemaName}.${tableName} WHERE LOWER(student_name) = LOWER($1)`,
        [studentName]
      );
      
      if (studentResult.rows.length === 0) {
        console.log(`Student not found: ${studentName}`);
        continue;
      }
      
      const studentId = studentResult.rows[0].id;
      
      // Build update query
      const updateColumns = [];
      const updateValues = [];
      let total = 0;
      
      for (const component of markComponents) {
        const componentKey = component.name.toLowerCase().replace(/\s+/g, '_');
        if (marks[componentKey] !== undefined) {
          const mark = parseFloat(marks[componentKey]);
          const maxMark = component.percentage;
          
          // Ensure mark doesn't exceed component percentage
          const finalMark = Math.min(mark, maxMark);
          updateColumns.push(`${componentKey} = $${updateValues.length + 1}`);
          updateValues.push(finalMark);
          total += finalMark;
        }
      }
      
      if (updateColumns.length === 0) continue;
      
      // Ensure total doesn't exceed 100
      total = Math.min(total, 100);
      
      // Determine pass status
      const passStatus = total >= config.pass_threshold ? 'Pass' : 'Fail';
      
      updateColumns.push(`total = $${updateValues.length + 1}`);
      updateValues.push(total);
      updateColumns.push(`pass_status = $${updateValues.length + 1}`);
      updateValues.push(passStatus);
      updateColumns.push(`updated_at = CURRENT_TIMESTAMP`);
      
      updateValues.push(studentId);
      
      const updateQuery = `
        UPDATE ${schemaName}.${tableName} 
        SET ${updateColumns.join(', ')} 
        WHERE id = $${updateValues.length}
      `;
      
      await client.query(updateQuery, updateValues);
      updatedCount++;
    }
    
    await client.query('COMMIT');
    res.json({ 
      message: `Bulk update completed successfully. ${updatedCount} students updated.`,
      updatedCount 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk update:', error);
    res.status(500).json({ error: 'Failed to bulk update marks', details: error.message });
  } finally {
    client.release();
  }
});

// Route to assign teachers to subject-class combinations
router.post('/assign-teachers', async (req, res) => {
  const { assignments } = req.body; // Array of { teacherName, subjectClass }
  
  if (!assignments || !Array.isArray(assignments)) {
    return res.status(400).json({ error: 'Assignments array is required' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Optional: Clear existing assignments if you want to replace all
    // await client.query('DELETE FROM subjects_of_school_schema.teachers_subjects');
    
    // Validate and insert new assignments
    for (const assignment of assignments) {
      if (!assignment.teacherName || !assignment.subjectClass) {
        continue;
      }
      
      // Validate subject_class exists
      const mappingResult = await client.query(
        'SELECT subject_class FROM subjects_of_school_schema.subject_class_mappings WHERE subject_class = $1',
        [assignment.subjectClass]
      );
      if (mappingResult.rows.length === 0) {
        throw new Error(`Subject-class combination ${assignment.subjectClass} not found`);
      }
      
      // Validate teacher exists (basic check; expand as needed)
      const teacherSchemasResult = await client.query(`
        SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'staff_%'
      `);
      let teacherExists = false;
      for (const schema of teacherSchemasResult.rows) {
        const schemaName = schema.schema_name;
        const tablesResult = await client.query(`
          SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name != 'staff_counter'
        `, [schemaName]);
        for (const table of tablesResult.rows) {
          const tableName = table.table_name;
          const teacherCheck = await client.query(`
            SELECT name FROM "${schemaName}"."${tableName}" WHERE name = $1 AND role = 'Teacher'
          `, [assignment.teacherName]);
          if (teacherCheck.rows.length > 0) {
            teacherExists = true;
            break;
          }
        }
        if (teacherExists) break;
      }
      if (!teacherExists) {
        throw new Error(`Teacher ${assignment.teacherName} not found`);
      }
      
      // Insert or update assignment (ignores duplicates)
      await client.query(
        `INSERT INTO subjects_of_school_schema.teachers_subjects (teacher_name, subject_class) 
         VALUES ($1, $2)
         ON CONFLICT (teacher_name, subject_class) DO NOTHING`,
        [assignment.teacherName, assignment.subjectClass]
      );
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Teachers assigned successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning teachers:', error);
    res.status(500).json({ error: 'Failed to assign teachers', details: error.message });
  } finally {
    client.release();
  }
});

// Route to get teacher assignments
router.get('/teacher-assignments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT teacher_name, subject_class, created_at 
      FROM subjects_of_school_schema.teachers_subjects 
      ORDER BY teacher_name, subject_class
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments', details: error.message });
  }
});

// Route to get all marks for a specific student
router.get('/student-marks/:schoolId/:className', async (req, res) => {
  const { schoolId, className } = req.params;
  
  try {
    // First, get the student's name from their school_id
    let studentName = null;
    try {
      const studentResult = await pool.query(`
        SELECT student_name FROM classes_schema."${className}" 
        WHERE school_id = $1
      `, [schoolId]);
      if (studentResult.rows.length > 0) {
        studentName = studentResult.rows[0].student_name;
      }
    } catch (e) {
      // Try alternative: get from any class table
      const tablesResult = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'classes_schema'
      `);
      for (const table of tablesResult.rows) {
        try {
          const result = await pool.query(`
            SELECT student_name FROM classes_schema."${table.table_name}" 
            WHERE school_id = $1
          `, [schoolId]);
          if (result.rows.length > 0) {
            studentName = result.rows[0].student_name;
            break;
          }
        } catch (err) {
          continue;
        }
      }
    }
    
    if (!studentName) {
      return res.json({ marks: [], message: 'Student not found' });
    }
    
    // Get all subjects mapped to this class
    const subjectsResult = await pool.query(`
      SELECT subject_name 
      FROM subjects_of_school_schema.subject_class_mappings 
      WHERE class_name = $1
    `, [className]);
    
    const marks = [];
    
    for (const subjectRow of subjectsResult.rows) {
      const subjectName = subjectRow.subject_name;
      const schemaName = `subject_${subjectName.toLowerCase().replace(/\s+/g, '_')}_schema`;
      
      // Check all terms (1-4)
      for (let term = 1; term <= 4; term++) {
        const tableName = `${className.toLowerCase().replace(/\s+/g, '_')}_term_${term}`;
        
        try {
          // Check if table exists and get student's marks by student_name
          const studentMarks = await pool.query(`
            SELECT * FROM ${schemaName}.${tableName} 
            WHERE student_name = $1
          `, [studentName]);
          
          if (studentMarks.rows.length > 0) {
            const studentData = studentMarks.rows[0];
            
            // Get form config for mark components
            const configResult = await pool.query(`
              SELECT mark_components FROM ${schemaName}.form_config 
              WHERE class_name = $1 AND term_number = $2
            `, [className, term]);
            
            const components = [];
            if (configResult.rows.length > 0 && configResult.rows[0].mark_components) {
              for (const comp of configResult.rows[0].mark_components) {
                const compKey = comp.name.toLowerCase().replace(/\s+/g, '_');
                components.push({
                  name: comp.name,
                  score: studentData[compKey] || 0,
                  max: comp.percentage
                });
              }
            }
            
            marks.push({
              subject_name: subjectName,
              term_number: term,
              total: studentData.total || 0,
              pass_status: studentData.pass_status || 'N/A',
              components
            });
          }
        } catch (tableError) {
          // Table doesn't exist for this term, skip
          continue;
        }
      }
    }
    
    res.json({ marks });
  } catch (error) {
    console.error('Error fetching student marks:', error);
    res.status(500).json({ error: 'Failed to fetch student marks', details: error.message });
  }
});

module.exports = router;