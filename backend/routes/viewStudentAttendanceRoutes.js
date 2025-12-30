const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all class names
router.get('/classes', async (req, res) => {
  try {
    console.log('Fetching all class names from public schema');
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name NOT IN ('users', 'school_student_count')
      ORDER BY table_name
    `);
    const classes = result.rows.map(row => row.table_name);
    console.log('Fetched classes:', classes);
    res.json(classes);
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
    console.log(`Fetching attendance tables for schema: class_${className}_attendance`);
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `, [`class_${className}_attendance`]);
    const tables = result.rows.map(row => row.table_name);
    console.log(`Tables fetched for ${className}:`, tables);
    res.json(tables);
  } catch (error) {
    console.error(`Error fetching tables for ${className}:`, error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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

    console.log(`Checking if class exists: public."${className}"`);
    const classExists = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    `, [className]);

    if (classExists.rows.length === 0) {
      console.error('Class does not exist in public schema:', className);
      throw new Error(`Class ${className} does not exist in public schema`);
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

    console.log(`Fetching students for class: public."${className}"`);
    const studentsResult = await client.query(`
      SELECT school_id, class_id, student_name, age, gender
      FROM public."${className}"
      ORDER BY LOWER(student_name) ASC
    `);

    if (studentsResult.rows.length === 0) {
      console.warn(`No students found in class: ${className}`);
      throw new Error(`No students found in class ${className}`);
    }

    const attendanceData = studentsResult.rows.map(student => [
      attendanceName,
      weekStart,
      student.school_id.toString(),
      student.class_id.toString(),
      student.student_name,
      student.age,
      student.gender
    ]);

    const values = attendanceData.map(row => `
      ('${row[0].replace(/'/g, "''")}', '${row[1]}', '${row[2]}', '${row[3]}', '${row[4].replace(/'/g, "''")}', ${row[5] || 'NULL'}, '${row[6] || ''}')
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
router.get('/attendance/:className/:tableName/:weekStart', async (req, res) => {
  const { className, tableName, weekStart } = req.params;
  try {
    console.log(`Fetching attendance for ${className}, table: ${tableName}, week: ${weekStart}`);
    const result = await pool.query(`
      SELECT id, attendance_name, week_start, school_id, class_id, student_name, age, gender,
             monday, tuesday, wednesday, thursday, friday, saturday, sunday
      FROM class_${className}_attendance."${tableName}"
      WHERE week_start::DATE = $1::DATE
    `, [weekStart]);
    console.log(`Attendance fetched for ${tableName}:`, result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching attendance for ${tableName}:`, error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;