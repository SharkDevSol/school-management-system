const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all attendance tables for a class (weekly attendance)
router.get('/tables/:className', async (req, res) => {
  const { className } = req.params;

  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    return res.status(400).json({ error: 'Invalid class name. Use alphanumeric characters and underscores only.' });
  }

  try {
    const schemaName = `class_${className}_weekly_attendance`;
    
    // Check if schema exists
    const schemaExists = await pool.query(`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
    `, [schemaName]);

    if (schemaExists.rows.length === 0) {
      return res.json([]);
    }

    // Get all table names from the weekly attendance schema
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name DESC
    `, [schemaName]);

    const tables = result.rows.map(row => row.table_name);
    res.json(tables);
  } catch (error) {
    console.error('Error fetching attendance tables:', error);
    res.status(500).json({ error: 'Failed to fetch attendance tables', details: error.message });
  }
});

// Get attendance for a specific student by school_id (weekly attendance)
router.get('/student/:className/:tableName/:schoolId', async (req, res) => {
  const { className, tableName, schoolId } = req.params;

  if (!/^[a-zA-Z0-9_]+$/.test(className) || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return res.status(400).json({ error: 'Invalid class name or table name.' });
  }

  try {
    const schemaName = `class_${className}_weekly_attendance`;
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaName, tableName]);

    if (tableExists.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance table not found' });
    }

    // Get attendance records for the student
    // Extract week date from table name (week_YYYY_MM_DD -> YYYY-MM-DD)
    const weekDate = tableName.replace('week_', '').replace(/_/g, '-');
    
    // school_id in attendance table is VARCHAR, so cast to string for comparison
    const result = await pool.query(`
      SELECT id, school_id, class_id, student_name,
             monday, tuesday, wednesday, thursday, friday, saturday, sunday,
             created_at, updated_at,
             $2 as week_start,
             $3 as attendance_name
      FROM "${schemaName}"."${tableName}"
      WHERE school_id = $1::text
      ORDER BY student_name ASC
    `, [String(schoolId), weekDate, tableName]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message });
  }
});

module.exports = router;
