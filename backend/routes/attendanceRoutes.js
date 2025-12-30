const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all class names from school_schema_points.classes (the actual student classes)
router.get('/classes', async (req, res) => {
  try {
    console.log('Fetching class names from school_schema_points.classes');
    const result = await pool.query(`
      SELECT class_names FROM school_schema_points.classes WHERE id = 1
    `);
    
    if (result.rows.length > 0 && result.rows[0].class_names) {
      const classes = result.rows[0].class_names;
      console.log('Fetched classes:', classes);
      res.json(classes);
    } else {
      console.log('No classes found');
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes', details: error.message });
  }
});

// Get all attendance tables for a class
router.get('/tables/:className', async (req, res) => {
  const { className } = req.params;

  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    console.error('Validation failed: Invalid className', { className });
    return res.status(400).json({ error: 'Invalid class name. Use alphanumeric characters and underscores only.' });
  }

  try {
    console.log(`Checking schema: class_${className}_attendance`);
    const schemaExists = await pool.query(`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    `, [`class_${className}_attendance`]);

    if (schemaExists.rows.length === 0) {
      console.warn(`Schema class_${className}_attendance does not exist`);
      return res.status(404).json({ error: `Schema for class ${className} does not exist. Ensure class is created.` });
    }

    console.log(`Fetching attendance tables for class_${className}_attendance`);
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
    `, [`class_${className}_attendance`]);
    const tables = result.rows.map(row => row.table_name);
    console.log(`Fetched tables for ${className}:`, tables);
    res.json(tables);
  } catch (error) {
    console.error(`Error fetching tables for class_${className}_attendance:`, error);
    res.status(500).json({ error: `Failed to fetch tables for ${className}`, details: error.message });
  }
});

// Create a new attendance table
router.post('/create/:className', async (req, res) => {
  const { className } = req.params;
  const { attendanceName, weekStart } = req.body;

  if (!className || !attendanceName || !weekStart) {
    console.error('Validation failed: Missing className, attendanceName, or weekStart', { className, attendanceName, weekStart });
    return res.status(400).json({ error: 'Class name, attendance name, and week start are required' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(className) || !/^[a-zA-Z0-9_]+$/.test(attendanceName)) {
    console.error('Validation failed: Invalid className or attendanceName', { className, attendanceName });
    return res.status(400).json({ error: 'Invalid class name or attendance name. Use alphanumeric characters and underscores only.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`Starting transaction for class ${className}, table ${attendanceName}`);

    console.log(`Checking if class exists: classes_schema."${className}"`);
    const classExists = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'classes_schema' AND table_name = $1
    `, [className]);

    if (classExists.rows.length === 0) {
      console.error('Class does not exist in classes_schema:', className);
      throw new Error(`Class ${className} does not exist in classes_schema`);
    }

    console.log(`Checking schema: class_${className}_attendance`);
    const schemaExists = await client.query(`
      SELECT 1 FROM information_schema.schemata
      WHERE schema_name = $1
    `, [`class_${className}_attendance`]);

    if (schemaExists.rows.length === 0) {
      console.log(`Creating schema: class_${className}_attendance`);
      await client.query(`CREATE SCHEMA class_${className}_attendance`);
    }

    console.log(`Creating attendance table: class_${className}_attendance."${attendanceName}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS class_${className}_attendance."${attendanceName}" (
        id SERIAL PRIMARY KEY,
        attendance_name VARCHAR(100) NOT NULL,
        week_start DATE NOT NULL,
        school_id VARCHAR(50) NOT NULL,
        class_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        age INTEGER,
        gender VARCHAR(10),
        monday VARCHAR(1),
        tuesday VARCHAR(1),
        wednesday VARCHAR(1),
        thursday VARCHAR(1),
        friday VARCHAR(1),
        saturday VARCHAR(1),
        sunday VARCHAR(1),
        CONSTRAINT unique_${attendanceName}_attendance UNIQUE (attendance_name, week_start, school_id, class_id)
      )
    `);
    console.log(`Table ${attendanceName} created in class_${className}_attendance`);

    console.log(`Checking for existing attendance records: ${attendanceName} for ${weekStart}`);
    const existing = await client.query(`
      SELECT 1 FROM class_${className}_attendance."${attendanceName}"
      WHERE attendance_name = $1 AND week_start = $2
      LIMIT 1
    `, [attendanceName, weekStart]);

    if (existing.rows.length > 0) {
      console.warn(`Attendance records already exist: ${attendanceName} for ${className} on ${weekStart}`);
      throw new Error(`Attendance '${attendanceName}' already exists for ${className} for week starting ${weekStart}`);
    }

    console.log(`Fetching students for class: classes_schema."${className}"`);
    const studentsResult = await client.query(`
      SELECT school_id, class_id, student_name, age, gender
      FROM classes_schema."${className}"
      ORDER BY LOWER(student_name) ASC
    `);

    if (studentsResult.rows.length === 0) {
      console.warn(`No students found in class: ${className}`);
      throw new Error(`No students found in class ${className}`);
    }

    const attendanceData = studentsResult.rows.map(student => [
      attendanceName,
      weekStart,
      (student.school_id || '0').toString(),
      (student.class_id || '0').toString(),
      student.student_name || 'Unknown',
      student.age,
      student.gender
    ]);

    const values = attendanceData.map(row => `
      ('${(row[0] || '').replace(/'/g, "''")}', '${row[1]}', '${row[2]}', '${row[3]}', '${(row[4] || '').replace(/'/g, "''")}', ${row[5] || 'NULL'}, '${row[6] || ''}')
    `).join(',');

    console.log(`Inserting attendance records into class_${className}_attendance."${attendanceName}"`);
    const result = await client.query(`
      INSERT INTO class_${className}_attendance."${attendanceName}" (
        attendance_name, week_start, school_id, class_id, student_name, age, gender
      )
      VALUES ${values}
      RETURNING id, attendance_name, week_start, school_id, class_id, student_name, age, gender
    `);

    await client.query('COMMIT');
    console.log(`Created ${result.rows.length} attendance records for ${className} in table ${attendanceName}`);
    res.status(201).json({
      message: `Table '${attendanceName}' created successfully in class_${className}_attendance`,
      ids: result.rows.map(row => row.id)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error creating attendance for class ${className}, table ${attendanceName}:`, error);
    res.status(500).json({ error: 'Table creation failed', details: error.message });
  } finally {
    client.release();
  }
});

// Get attendance for a class and week
router.get('/attendance/:className/:attendanceName/:weekStart', async (req, res) => {
  const { className, attendanceName, weekStart } = req.params;

  if (!/^[a-zA-Z0-9_]+$/.test(className) || !/^[a-zA-Z0-9_]+$/.test(attendanceName)) {
    console.error('Validation failed: Invalid className or attendanceName', { className, attendanceName });
    return res.status(400).json({ error: 'Invalid class name or attendance name. Use alphanumeric characters and underscores only.' });
  }

  try {
    console.log(`Checking schema: class_${className}_attendance`);
    const schemaExists = await pool.query(`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    `, [`class_${className}_attendance`]);

    if (schemaExists.rows.length === 0) {
      console.warn(`Schema class_${className}_attendance does not exist`);
      return res.status(404).json({ error: `Schema for class ${className} does not exist. Ensure class is created.` });
    }

    console.log(`Checking if attendance table exists: class_${className}_attendance."${attendanceName}"`);
    const tableExists = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    `, [`class_${className}_attendance`, attendanceName]);

    if (tableExists.rows.length === 0) {
      console.warn(`Attendance table does not exist: ${attendanceName} for class: ${className}`);
      return res.status(404).json({ error: `No attendance records found for ${className}. Create a new attendance record.` });
    }

    console.log(`Fetching attendance for ${className}, ${attendanceName}, ${weekStart}`);
    const result = await pool.query(`
      SELECT id, attendance_name, week_start, school_id, class_id, student_name, age, gender,
             monday, tuesday, wednesday, thursday, friday, saturday, sunday
      FROM class_${className}_attendance."${attendanceName}"
      WHERE attendance_name = $1 AND week_start = $2
      ORDER BY LOWER(student_name) ASC
    `, [attendanceName, weekStart]);

    console.log(`Fetched ${result.rows.length} attendance records for ${className} from table ${attendanceName}`);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching attendance for class ${className}, table ${attendanceName}:`, error);
    res.status(500).json({ error: `Failed to fetch attendance for ${className}`, details: error.message });
  }
});

// Update attendance records
router.put('/attendance/:className/:attendanceName/:weekStart', async (req, res) => {
  const { className, attendanceName, weekStart } = req.params;
  const attendanceUpdates = req.body;

  if (!/^[a-zA-Z0-9_]+$/.test(className) || !/^[a-zA-Z0-9_]+$/.test(attendanceName)) {
    console.error('Validation failed: Invalid className or attendanceName', { className, attendanceName });
    return res.status(400).json({ error: 'Invalid class name or attendance name. Use alphanumeric characters and underscores only.' });
  }

  if (!Array.isArray(attendanceUpdates)) {
    console.error('Invalid request format: Payload must be an array', { attendanceUpdates });
    return res.status(400).json({ error: 'Invalid request format', message: 'Payload must be an array of attendance records' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`Updating attendance for ${className}, ${attendanceName}, ${weekStart}`);

    console.log(`Checking schema: class_${className}_attendance`);
    const schemaExists = await client.query(`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    `, [`class_${className}_attendance`]);

    if (schemaExists.rows.length === 0) {
      console.warn(`Schema class_${className}_attendance does not exist`);
      throw new Error(`Schema class_${className}_attendance does not exist. Ensure class is created.`);
    }

    for (const update of attendanceUpdates) {
      const { school_id, class_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = update;

      if (!school_id || !class_id) {
        console.warn('Missing school_id or class_id in update', { school_id, class_id });
        throw new Error('Missing school_id or class_id in record');
      }

      const attendanceData = {
        monday: monday || null,
        tuesday: tuesday || null,
        wednesday: wednesday || null,
        thursday: thursday || null,
        friday: friday || null,
        saturday: saturday || null,
        sunday: sunday || null
      };

      console.log(`Updating record for school_id: ${school_id}, class_id: ${class_id} in table ${attendanceName}`);
      const result = await client.query(`
        UPDATE class_${className}_attendance."${attendanceName}"
        SET monday = $1, tuesday = $2, wednesday = $3, thursday = $4,friday = $5, saturday = $6, sunday = $7
        WHERE attendance_name = $8 AND week_start = $9 AND school_id = $10 AND class_id = $11
        RETURNING *
      `, [
        attendanceData.monday,
        attendanceData.tuesday,
        attendanceData.wednesday,
        attendanceData.thursday,
        attendanceData.friday,
        attendanceData.saturday,
        attendanceData.sunday,
        attendanceName,
        weekStart,
        school_id.toString(),
        class_id.toString()
      ]);

      if (result.rows.length === 0) {
        console.warn(`Attendance record not found for ${school_id}-${class_id} in ${className}, table ${attendanceName}`);
        throw new Error(`Attendance record not found for student ${school_id}-${class_id}`);
      }
    }

    await client.query('COMMIT');
    console.log(`Updated ${attendanceUpdates.length} attendance records for ${className} in table ${attendanceName}`);
    res.status(200).json({
      success: true,
      message: `${attendanceUpdates.length} records updated successfully`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error during transaction for ${className}, table ${attendanceName}:`, error);
    res.status(500).json({ error: 'Attendance update failed', details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;