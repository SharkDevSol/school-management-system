const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// --- DYNAMIC HELPER FUNCTIONS --- (unchanged)
const getAllStaffRoles = async () => {
    const client = await pool.connect();
    try {
        // Query to find all schemas that start with 'staff_'
        const staffSchemasResult = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'staff_%'");
        const allRoles = new Set();

        for (const schema of staffSchemasResult.rows) {
            // For each staff schema, find all tables (which represent departments/classes)
            const tablesResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name != 'staff_counter'", [schema.schema_name]);
            for (const table of tablesResult.rows) {
                // Get the distinct roles from each table
                const rolesResult = await client.query(`SELECT DISTINCT role FROM "${schema.schema_name}"."${table.table_name}" WHERE role IS NOT NULL`);
                rolesResult.rows.forEach(row => allRoles.add(row.role));
            }
        }
        console.log("Dynamically fetched roles:", Array.from(allRoles));
        return Array.from(allRoles).sort();
    } catch (error) {
        console.error('Error fetching all staff roles:', error);
        // Return a safe default list if the dynamic fetch fails
        return ['Teacher', 'Director', 'Coordinator', 'Supervisor', 'Accountant', 'Nurse'];
    } finally {
        client.release();
    }
};

// Helper to get terms from the marklist configuration
const getTermsFromMarklistConfig = async () => {
  try {
    // This query targets the table from your marklist files
    const result = await pool.query('SELECT term_count FROM subjects_of_school_schema.school_config WHERE id = 1');
    if (result.rows.length === 0) {
        console.log("No marklist config found, defaulting to 3 terms.");
        return ['Term 1', 'Term 2', 'Term 3']; // Default if no config found
    }
    const termCount = result.rows[0]?.term_count || 3;
    const terms = [];
    for (let i = 1; i <= termCount; i++) {
      terms.push(`Term ${i}`);
    }
    console.log("Dynamically fetched terms:", terms);
    return terms;
  } catch (error) {
    console.error('Error fetching terms from marklist config, using defaults:', error);
    return ['Term 1', 'Term 2', 'Term 3'];
  }
};

// Helper to get staff by role (used in /staff/:role)
const getStaffByRole = async (role) => {
  const client = await pool.connect();
  try {
    const staffSchemasResult = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'staff_%'");
    let allStaff = [];
    for (const schema of staffSchemasResult.rows) {
      const tablesResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name != 'staff_counter'", [schema.schema_name]);
      for (const table of tablesResult.rows) {
        const staffResult = await client.query(`SELECT * FROM "${schema.schema_name}"."${table.table_name}" WHERE role = $1`, [role]);
        allStaff = allStaff.concat(staffResult.rows.map(row => ({ ...row, schema: schema.schema_name, class: table.table_name })));
      }
    }
    return allStaff.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching staff by role:', error);
    return [];
  } finally {
    client.release();
  }
};

// Updated helper to get students from a class (used in /:id/form) - now queries classes_schema instead of students
const getStudentsFromClass = async (className) => {
  const client = await pool.connect();
  try {
    // Querying from classes_schema as per marklist routes
    const result = await client.query(`SELECT student_name, age as student_age, gender as student_gender FROM classes_schema."${className}" ORDER BY student_name`);
    return result.rows;
  } catch (error) {
    console.error('Error fetching students from class:', error);
    return [];
  } finally {
    client.release();
  }
};

// New helper to get classes connected to a specific subject (from marklist mappings)
const getClassesForSubject = async (subjectName) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT class_name FROM subjects_of_school_schema.subject_class_mappings WHERE subject_name = $1 ORDER BY class_name',
      [subjectName]
    );
    return result.rows.map(row => row.class_name);
  } catch (error) {
    console.error('Error fetching classes for subject:', error);
    return [];
  }
};

// --- API ROUTES (CORRECT ORDER) ---

// GET /api/evaluations/areas
router.get('/areas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM evaluation_areas ORDER BY area_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({ error: 'Failed to fetch areas' });
  }
});

// POST /api/evaluations/areas - Create new evaluation area
router.post('/areas', async (req, res) => {
  try {
    const { area_name, description } = req.body;
    if (!area_name || !area_name.trim()) {
      return res.status(400).json({ error: 'Area name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO evaluation_areas (area_name, description) VALUES ($1, $2) RETURNING *',
      [area_name.trim(), description?.trim() || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating evaluation area:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'An area with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create evaluation area' });
  }
});

// DELETE /api/evaluations/areas/:id - Delete evaluation area
router.delete('/areas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid area ID' });
    }
    
    // Check if area is being used by any evaluations
    const usageCheck = await pool.query(
      'SELECT COUNT(*) FROM evaluations WHERE evaluation_area_id = $1',
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete this area because it is being used by existing evaluations' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM evaluation_areas WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Evaluation area not found' });
    }
    
    res.json({ message: 'Evaluation area deleted successfully' });
  } catch (error) {
    console.error('Error deleting evaluation area:', error);
    res.status(500).json({ error: 'Failed to delete evaluation area' });
  }
});

// GET /api/evaluations/subjects
router.get('/subjects', async (req, res) => {
  try {
    // Assuming subjects table in subjects_of_school_schema
    const result = await pool.query('SELECT id, subject_name FROM subjects_of_school_schema.subjects ORDER BY subject_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Updated GET /api/evaluations/subjects-classes (now supports optional ?subject= param for filtered classes)
router.get('/subjects-classes', async (req, res) => {
  const { subject } = req.query; // Optional subject filter
  try {
    let result;
    if (subject) {
      // Return only classes for the specified subject
      result = await pool.query(
        'SELECT subject_name, class_name FROM subjects_of_school_schema.subject_class_mappings WHERE subject_name = $1 ORDER BY class_name',
        [subject]
      );
    } else {
      // Return all mappings if no subject specified
      result = await pool.query(
        'SELECT subject_name, class_name FROM subjects_of_school_schema.subject_class_mappings ORDER BY subject_name, class_name'
      );
    }
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subject-class mappings:', error);
    res.status(500).json({ error: 'Failed to fetch subject-class mappings' });
  }
});

// GET /api/evaluations/roles (Now dynamic)
router.get('/roles', async (req, res) => { 
    try { 
        const roles = await getAllStaffRoles();
        res.json(roles); 
    } catch (error) { 
        res.status(500).json({ error: 'Failed to fetch distinct roles' }); 
    } 
});

// GET /api/evaluations/terms (Now dynamic)
router.get('/terms', async (req, res) => { 
    try { 
        const terms = await getTermsFromMarklistConfig();
        res.json(terms); 
    } catch (error) { 
        res.status(500).json({ error: 'Failed to fetch terms' }); 
    } 
});

// GET staff evaluations by global_staff_id
router.get('/staff-evaluations/:globalStaffId', async (req, res) => {
  try {
    const { globalStaffId } = req.params;
    if (isNaN(parseInt(globalStaffId))) {
      return res.status(400).json({ error: 'Invalid globalStaffId format' });
    }
    const result = await pool.query(`
      SELECT e.*, ea.area_name 
      FROM evaluations e 
      LEFT JOIN evaluation_areas ea ON e.evaluation_area_id = ea.id 
      WHERE e.staff_global_id = $1 
      ORDER BY e.created_at DESC
    `, [globalStaffId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching staff evaluations:', error);
    res.status(500).json({ error: 'Failed to fetch staff evaluations', details: error.message });
  }
});

// GET /api/evaluations/list (New route for listing all evaluations)
router.get('/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, ea.area_name 
      FROM evaluations e 
      LEFT JOIN evaluation_areas ea ON e.evaluation_area_id = ea.id 
      ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching evaluations list:', error);
    res.status(500).json({ error: 'Failed to fetch evaluations', details: error.message });
  }
});

// GET /api/evaluations/staff/:role
router.get('/staff/:role', async (req, res) => { 
  try { 
    const { role } = req.params; 
    const staffMembers = await getStaffByRole(role); 
    res.json(staffMembers); 
  } catch (error) { 
    res.status(500).json({ error: 'Failed to fetch staff members' }); 
  } 
});

// POST /api/evaluations
router.post('/', async (req, res) => { 
  const client = await pool.connect(); 
  try { 
    await client.query('BEGIN'); 
    const { evaluation_name, evaluation_area_id, subject_name, class_name, staff_role, staff_global_id, staff_name, term, form_columns } = req.body; 
    if (!evaluation_name || !evaluation_area_id || !subject_name || !class_name || !staff_role || !staff_global_id || !staff_name || !term) 
      return res.status(400).json({ error: 'Missing required fields' }); 
    const evalResult = await client.query(`INSERT INTO evaluations (evaluation_name, evaluation_area_id, subject_name, class_name, staff_role, staff_global_id, staff_name, term) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [evaluation_name, evaluation_area_id, subject_name, class_name, staff_role, staff_global_id, staff_name, term]); 
    const evaluation = evalResult.rows[0]; 
    if (form_columns && Array.isArray(form_columns)) { 
      for (let i = 0; i < form_columns.length; i++) { 
        await client.query('INSERT INTO evaluation_forms (evaluation_id, column_name, column_order, max_points) VALUES ($1, $2, $3, $4)', [evaluation.id, form_columns[i].name, i + 1, form_columns[i].max_points || 5]); 
      } 
    } 
    await client.query('COMMIT'); 
    res.status(201).json(evaluation); 
  } catch (error) { 
    await client.query('ROLLBACK'); 
    res.status(500).json({ error: 'Failed to create evaluation' }); 
  } finally { 
    client.release(); 
  } 
});

// GET /api/evaluations/:id
router.get('/:id', async (req, res) => { 
  try { 
    const { id } = req.params; 
    if (isNaN(parseInt(id))) return res.status(400).json({ error: 'Invalid ID format' }); 
    const evalResult = await pool.query(`SELECT e.*, ea.area_name FROM evaluations e LEFT JOIN evaluation_areas ea ON e.evaluation_area_id = ea.id WHERE e.id = $1`, [id]); 
    if (evalResult.rows.length === 0) return res.status(404).json({ error: 'Evaluation not found' }); 
    const evaluation = evalResult.rows[0]; 
    const formResult = await pool.query('SELECT * FROM evaluation_forms WHERE evaluation_id = $1 ORDER BY column_order', [id]); 
    evaluation.form_columns = formResult.rows; 
    res.json(evaluation); 
  } catch (error) { 
    res.status(500).json({ error: 'Failed to fetch evaluation' }); 
  } 
});

// GET /api/evaluations/:id/form
router.get('/:id/form', async (req, res) => { 
  try { 
    const { id } = req.params; 
    if (isNaN(parseInt(id))) return res.status(400).json({ error: 'Invalid Evaluation ID' }); 
    const evalResult = await pool.query('SELECT * FROM evaluations WHERE id = $1', [id]); 
    if (evalResult.rows.length === 0) return res.status(404).json({ error: 'Evaluation not found' }); 
    const evaluation = evalResult.rows[0]; 
    const formColsResult = await pool.query('SELECT id, column_name, max_points FROM evaluation_forms WHERE evaluation_id = $1 ORDER BY column_order', [id]); 
    const formColumns = formColsResult.rows; 
    const students = await getStudentsFromClass(evaluation.class_name); 
    const responsesResult = await pool.query('SELECT student_name, column_name, score, notes FROM evaluation_responses WHERE evaluation_id = $1 AND student_name = ANY($2::text[])', [id, students.map(s => s.student_name)]); 
    const studentsWithScores = students.map(student => { 
      const studentResponses = responsesResult.rows.filter(r => r.student_name === student.student_name); 
      const scores = {}; 
      studentResponses.forEach(response => { 
        const criteria = formColumns.find(c => c.column_name === response.column_name); 
        if (criteria) scores[criteria.id] = { score: response.score, notes: response.notes }; 
      }); 
      return { ...student, scores }; 
    }); 
    res.json({ 
      evaluation, 
      areas: [{ 
        id: 1, 
        area_name: 'General Criteria', 
        criteria: formColumns.map(c => ({ id: c.id, criteria_name: c.column_name, max_points: c.max_points })) 
      }], 
      students: studentsWithScores 
    }); 
  } catch (error) { 
    res.status(500).json({ error: 'Failed to fetch evaluation form data' }); 
  } 
});

// POST /api/evaluations/:id/responses
router.post('/:id/responses', async (req, res) => { 
  const client = await pool.connect(); 
  try { 
    await client.query('BEGIN'); 
    const { id } = req.params; 
    const { responses } = req.body; 
    if (!Array.isArray(responses)) return res.status(400).json({ error: 'responses must be an array' }); 

    // Fetch evaluation to get class_name
    const evalResult = await client.query('SELECT class_name FROM evaluations WHERE id = $1', [id]);
    if (evalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    const evaluationClassName = evalResult.rows[0].class_name;

    for (const studentResponse of responses) { 
      const { student_name, student_age, student_gender, student_class, scores } = studentResponse; 
      const effectiveStudentClass = student_class || evaluationClassName;
      if (!student_name || !effectiveStudentClass || !scores) {
        console.warn('Skipping invalid student response:', { student_name, student_class: effectiveStudentClass, hasScores: !!scores });
        continue;
      }
      for (const [column_name, scoreData] of Object.entries(scores)) { 
        if (scoreData.score === undefined || scoreData.score === null) {
          console.warn('Skipping invalid score data for column:', column_name);
          continue;
        }
        await client.query(`INSERT INTO evaluation_responses (evaluation_id, student_name, student_age, student_gender, student_class, column_name, score, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (evaluation_id, student_name, column_name) DO UPDATE SET score = $7, notes = $8, updated_at = CURRENT_TIMESTAMP`, [id, student_name, student_age || null, student_gender || null, effectiveStudentClass, column_name, scoreData.score, scoreData.notes || '']); 
      } 
    } 
    await client.query('COMMIT'); 
    res.json({ message: 'Responses saved successfully' }); 
  } catch (error) { 
    await client.query('ROLLBACK'); 
    console.error('Error in POST /api/evaluations/:id/responses:', error);
    res.status(500).json({ error: 'Failed to save responses', details: error.message }); 
  } finally { 
    client.release(); 
  } 
});

// DELETE /api/evaluations/:id
router.delete('/:id', async (req, res) => { 
  try { 
    const { id } = req.params; 
    if (isNaN(parseInt(id))) return res.status(400).json({ error: 'Invalid ID format' }); 
    const deleteResult = await pool.query('DELETE FROM evaluations WHERE id = $1', [id]); 
    if (deleteResult.rowCount === 0) return res.status(404).json({ error: 'Evaluation not found' }); 
    res.json({ message: 'Evaluation deleted successfully' }); 
  } catch (error) { 
    res.status(500).json({ error: 'Failed to delete evaluation' }); 
  } 
});

// Initialize tables on module load
const initializeEvaluationTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS evaluation_areas (id SERIAL PRIMARY KEY, area_name VARCHAR(100) NOT NULL UNIQUE, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await client.query(`CREATE TABLE IF NOT EXISTS evaluations (id SERIAL PRIMARY KEY, evaluation_name VARCHAR(200) NOT NULL, evaluation_area_id INTEGER REFERENCES evaluation_areas(id) ON DELETE SET NULL, subject_name VARCHAR(100) NOT NULL, class_name VARCHAR(100) NOT NULL, staff_role VARCHAR(100) NOT NULL, staff_global_id INTEGER NOT NULL, staff_name VARCHAR(100) NOT NULL, term VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await client.query(`CREATE TABLE IF NOT EXISTS evaluation_forms (id SERIAL PRIMARY KEY, evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE, column_name VARCHAR(100) NOT NULL, column_order INTEGER NOT NULL, max_points INTEGER NOT NULL DEFAULT 5, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await client.query(`CREATE TABLE IF NOT EXISTS evaluation_responses (id SERIAL PRIMARY KEY, evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE, student_name VARCHAR(100) NOT NULL, student_age INTEGER, student_gender VARCHAR(50), student_class VARCHAR(100) NOT NULL, column_name VARCHAR(100) NOT NULL, score INTEGER, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(evaluation_id, student_name, column_name));`);
    await client.query('CREATE INDEX IF NOT EXISTS idx_evaluations_staff_global_id ON evaluations(staff_global_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_evaluations_class_name ON evaluations(class_name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_evaluation_responses_evaluation_id ON evaluation_responses(evaluation_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_evaluation_forms_evaluation_id ON evaluation_forms(evaluation_id);');

    // Seed default areas if table is empty
    const areasCount = await client.query('SELECT COUNT(*) FROM evaluation_areas');
    if (parseInt(areasCount.rows[0].count) === 0) {
      const defaultAreas = [
        { area_name: 'Teaching Performance', description: 'Aspects related to instructional delivery and content mastery.' },
        { area_name: 'Classroom Management', description: 'Handling student behavior, engagement, and environment.' },
        { area_name: 'Professional Development', description: 'Ongoing learning, collaboration, and self-improvement.' },
        { area_name: 'Student Support', description: 'Guidance, feedback, and holistic student care.' }
      ];
      for (const area of defaultAreas) {
        await client.query(
          'INSERT INTO evaluation_areas (area_name, description) VALUES ($1, $2)',
          [area.area_name, area.description]
        );
      }
      console.log('Seeded default evaluation areas:', defaultAreas.map(a => a.area_name).join(', '));
    }

    await client.query('COMMIT');
    console.log('Evaluation tables initialized successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing evaluation tables:', error);
  } finally {
    client.release();
  }
};

// Call initialize on startup
initializeEvaluationTables().catch(console.error);

module.exports = router;