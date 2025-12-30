const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Admin: Create weekly attendance for any class (no teacher assignment check)
router.post('/create-weekly', async (req, res) => {
  const { className, weekStart } = req.body;

  if (!className || !weekStart) {
    return res.status(400).json({ error: 'className and weekStart are required' });
  }

  const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
  if (!validTableName) {
    return res.status(400).json({ error: 'Invalid class name provided.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const schemaName = `class_${className}_weekly_attendance`;
    const tableName = `week_${weekStart.replace(/-/g, '_')}`;
    
    // Create schema if not exists
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Check if table already exists
    const tableExists = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaName, tableName]);

    if (tableExists.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Attendance for week starting ${weekStart} already exists` });
    }

    // Create weekly attendance table
    await client.query(`
      CREATE TABLE "${schemaName}"."${tableName}" (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL,
        class_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        monday VARCHAR(1),
        tuesday VARCHAR(1),
        wednesday VARCHAR(1),
        thursday VARCHAR(1),
        friday VARCHAR(1),
        saturday VARCHAR(1),
        sunday VARCHAR(1),
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_student_${tableName} UNIQUE (school_id, class_id)
      )
    `);

    // Fetch students and populate the table
    const studentsResult = await client.query(`
      SELECT school_id, class_id, student_name
      FROM classes_schema."${className}"
      WHERE school_id IS NOT NULL AND class_id IS NOT NULL AND student_name IS NOT NULL
      ORDER BY LOWER(student_name) ASC
    `);

    if (studentsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No valid students found in this class' });
    }

    // Insert students into the weekly attendance table
    let insertedCount = 0;
    for (const student of studentsResult.rows) {
      if (student.school_id && student.class_id && student.student_name) {
        await client.query(`
          INSERT INTO "${schemaName}"."${tableName}" 
          (school_id, class_id, student_name, created_by)
          VALUES ($1, $2, $3, $4)
        `, [String(student.school_id), String(student.class_id), String(student.student_name), 'Admin']);
        insertedCount++;
      }
    }

    if (insertedCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No valid students could be added to attendance' });
    }

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      message: `Weekly attendance created for ${className} starting ${weekStart} (${insertedCount} students)`,
      tableName 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating weekly attendance:', error);
    res.status(500).json({ error: 'Failed to create weekly attendance', details: error.message });
  } finally {
    client.release();
  }
});

// Admin: Update weekly attendance for any class (no teacher assignment check)
router.put('/update-weekly/:className/:weekStart', async (req, res) => {
  const { className, weekStart } = req.params;
  const { records } = req.body;

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'records array is required' });
  }

  const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
  if (!validTableName) {
    return res.status(400).json({ error: 'Invalid class name provided.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const schemaName = `class_${className}_weekly_attendance`;
    const tableName = `week_${weekStart.replace(/-/g, '_')}`;
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaName, tableName]);

    if (tableExists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Weekly attendance not found. Please create it first.' });
    }

    // Update each record
    for (const record of records) {
      const { school_id, class_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = record;
      
      await client.query(`
        UPDATE "${schemaName}"."${tableName}"
        SET monday = $1, tuesday = $2, wednesday = $3, thursday = $4, 
            friday = $5, saturday = $6, sunday = $7, updated_at = CURRENT_TIMESTAMP
        WHERE school_id = $8 AND class_id = $9
      `, [
        monday || null, tuesday || null, wednesday || null, thursday || null,
        friday || null, saturday || null, sunday || null,
        school_id, class_id
      ]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `${records.length} attendance records updated` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating weekly attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance', details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
