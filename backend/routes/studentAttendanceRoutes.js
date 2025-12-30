const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Get all class names from school_schema_points.classes (actual student classes only)
router.get("/classes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT class_names FROM school_schema_points.classes WHERE id = 1
    `);
    
    if (result.rows.length > 0 && result.rows[0].class_names) {
      res.json(result.rows[0].class_names);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes", details: error.message });
  }
});

// Get students for a specific class (for attendance marking)
router.get("/students/:className", async (req, res) => {
  const { className } = req.params;
  try {
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    const result = await pool.query(`
      SELECT school_id, class_id, student_name, age, gender, image_student
      FROM classes_schema."${className}"
      ORDER BY LOWER(student_name) ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching students for ${className}:`, error);
    res.status(500).json({ error: "Failed to fetch students", details: error.message });
  }
});

// Ensure attendance table exists for a class
const ensureAttendanceTable = async (client, className) => {
  const schemaName = `class_${className}_daily_attendance`;
  
  // Check if schema exists
  const schemaExists = await client.query(`
    SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
  `, [schemaName]);

  if (schemaExists.rows.length === 0) {
    await client.query(`CREATE SCHEMA "${schemaName}"`);
  }

  // Check if table exists
  const tableExists = await client.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = $1 AND table_name = 'attendance'
  `, [schemaName]);

  if (tableExists.rows.length === 0) {
    await client.query(`
      CREATE TABLE "${schemaName}".attendance (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL,
        class_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        attendance_date DATE NOT NULL,
        status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
        marked_by VARCHAR(100),
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        CONSTRAINT unique_daily_attendance UNIQUE (school_id, class_id, attendance_date)
      )
    `);
    await client.query(`CREATE INDEX idx_${className}_att_date ON "${schemaName}".attendance(attendance_date)`);
    await client.query(`CREATE INDEX idx_${className}_att_status ON "${schemaName}".attendance(status)`);
  }
  
  return schemaName;
};


// Get attendance records for a class and date
router.get("/records/:className/:date", async (req, res) => {
  const { className, date } = req.params;
  
  try {
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    const schemaName = `class_${className}_daily_attendance`;
    
    // Check if schema/table exists
    const tableExists = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = 'attendance'
    `, [schemaName]);

    if (tableExists.rows.length === 0) {
      return res.json([]); // No attendance records yet
    }

    const result = await pool.query(`
      SELECT * FROM "${schemaName}".attendance
      WHERE attendance_date = $1
      ORDER BY LOWER(student_name) ASC
    `, [date]);

    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching attendance for ${className}:`, error);
    res.status(500).json({ error: "Failed to fetch attendance", details: error.message });
  }
});

// Mark attendance for students
router.post("/mark", async (req, res) => {
  const { className, date, records } = req.body;

  if (!className || !date || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: "className, date, and records array are required" });
  }

  const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
  if (!validTableName) {
    return res.status(400).json({ error: "Invalid class name provided." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const schemaName = await ensureAttendanceTable(client, className);
    
    for (const record of records) {
      const { school_id, class_id, student_name, status, notes } = record;
      
      if (!school_id || !class_id || !student_name || !status) {
        throw new Error("Each record must have school_id, class_id, student_name, and status");
      }

      if (!['present', 'absent', 'late'].includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be present, absent, or late`);
      }

      // Upsert attendance record
      await client.query(`
        INSERT INTO "${schemaName}".attendance 
          (school_id, class_id, student_name, attendance_date, status, notes, marked_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (school_id, class_id, attendance_date)
        DO UPDATE SET status = $5, notes = $6, marked_at = CURRENT_TIMESTAMP
      `, [school_id, class_id, student_name, date, status, notes || null]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `${records.length} attendance records saved` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error marking attendance:", error);
    res.status(500).json({ error: "Failed to mark attendance", details: error.message });
  } finally {
    client.release();
  }
});

// Get attendance history with filters
router.get("/history", async (req, res) => {
  const { className, dateFrom, dateTo, status, student } = req.query;

  try {
    if (!className) {
      return res.status(400).json({ error: "className is required" });
    }

    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    const schemaName = `class_${className}_daily_attendance`;
    
    const tableExists = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = 'attendance'
    `, [schemaName]);

    if (tableExists.rows.length === 0) {
      return res.json([]);
    }

    let query = `SELECT * FROM "${schemaName}".attendance WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (dateFrom) {
      query += ` AND attendance_date >= $${paramIndex++}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND attendance_date <= $${paramIndex++}`;
      params.push(dateTo);
    }
    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (student) {
      query += ` AND LOWER(student_name) LIKE $${paramIndex++}`;
      params.push(`%${student.toLowerCase()}%`);
    }

    query += ` ORDER BY attendance_date DESC, LOWER(student_name) ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    res.status(500).json({ error: "Failed to fetch history", details: error.message });
  }
});

// Get attendance statistics
router.get("/stats/:className", async (req, res) => {
  const { className } = req.params;
  const { dateFrom, dateTo } = req.query;

  try {
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: "Invalid class name provided." });
    }

    const schemaName = `class_${className}_daily_attendance`;
    
    const tableExists = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = 'attendance'
    `, [schemaName]);

    if (tableExists.rows.length === 0) {
      return res.json({ total: 0, present: 0, absent: 0, late: 0 });
    }

    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'present') as present,
        COUNT(*) FILTER (WHERE status = 'absent') as absent,
        COUNT(*) FILTER (WHERE status = 'late') as late
      FROM "${schemaName}".attendance WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (dateFrom) {
      query += ` AND attendance_date >= $${paramIndex++}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND attendance_date <= $${paramIndex++}`;
      params.push(dateTo);
    }

    const result = await pool.query(query, params);
    const stats = result.rows[0];
    
    res.json({
      total: parseInt(stats.total),
      present: parseInt(stats.present),
      absent: parseInt(stats.absent),
      late: parseInt(stats.late)
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics", details: error.message });
  }
});

module.exports = router;
