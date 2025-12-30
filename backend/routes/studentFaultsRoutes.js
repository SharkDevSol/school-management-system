const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;
require('dotenv').config();

// Security middleware
const { authenticateToken } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/inputValidation');
const { multerFileFilter } = require('../middleware/fileValidation');

// Apply input sanitization to all routes
router.use(sanitizeInputs);

// All faults routes require authentication
router.use(authenticateToken);

const uploadDir = path.join(__dirname, 'Uploads');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf|mp4|avi|mkv/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images, PDFs, and videos are allowed'));
  },
}).single('attachment');

// Initialize faults schema
const initializeFaultsSchema = async () => {
  try {
    console.log('Initializing faults schema: class_students_fault');
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS class_students_fault
    `);
    console.log('Schema class_students_fault created or already exists');
  } catch (error) {
    console.error('Error initializing faults schema:', error.message);
    // Don't throw - let the server continue running
  }
};
initializeFaultsSchema();

// Get all classes
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

// Get students for a class
router.get('/students/:className', async (req, res) => {
  const { className } = req.params;
  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    console.error('Validation failed: Invalid className', { className });
    return res.status(400).json({ error: 'Invalid class name' });
  }
  try {
    console.log(`Fetching students for class: ${className}`);
    const result = await pool.query(`
      SELECT school_id, class_id, student_name
      FROM public."${className}"
      ORDER BY LOWER(student_name) ASC
    `);
    console.log(`Fetched ${result.rows.length} students for ${className}`);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching students for ${className}:`, error);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message });
  }
});

// Get faults for a class
router.get('/faults/:className', async (req, res) => {
  const { className } = req.params;
  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    console.error('Validation failed: Invalid className', { className });
    return res.status(400).json({ error: 'Invalid class name' });
  }
  try {
    console.log(`Fetching faults for class: ${className}`);
    const tableExists = await pool.query(`
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'class_students_fault'
      AND table_name = $1
    `, [className]);
    
    if (tableExists.rows.length === 0) {
      console.log(`No faults table exists for ${className}`);
      return res.json([]);
    }

    const result = await pool.query(`
      SELECT id, school_id, class_id, student_name, date, type, level, description, reported_by, action_taken, attachment
      FROM class_students_fault."${className}"
      ORDER BY date DESC
    `);
    console.log(`Fetched ${result.rows.length} faults for ${className}`);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching faults for ${className}:`, error);
    res.status(500).json({ error: 'Failed to fetch faults', details: error.message });
  }
});

// Add new fault
router.post('/add-fault', upload, async (req, res) => {
  const { className, student_name, fault_type, fault_level, date, description, reported_by } = req.body;
  const attachment = req.file ? req.file.filename : null;

  if (!className || !student_name || !fault_type || !fault_level || !date || !description || !reported_by) {
    console.error('Validation failed: Missing required fields', { className, student_name, fault_type, fault_level, date, description, reported_by });
    return res.status(400).json({ error: 'All fields except attachment are required' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    console.error('Validation failed: Invalid className', { className });
    return res.status(400).json({ error: 'Invalid class name' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`Adding fault for ${student_name} in class ${className}`);

    // Verify class exists
    const classExists = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    `, [className]);
    if (classExists.rows.length === 0) {
      console.error(`Class does not exist: ${className}`);
      throw new Error(`Class ${className} does not exist`);
    }

    // Get student details
    const studentResult = await client.query(`
      SELECT school_id, class_id
      FROM public."${className}"
      WHERE student_name = $1
    `, [student_name]);
    if (studentResult.rows.length === 0) {
      console.error(`Student not found: ${student_name} in class ${className}`);
      throw new Error(`Student ${student_name} not found in class ${className}`);
    }
    const { school_id, class_id } = studentResult.rows[0];

    // Create faults table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS class_students_fault."${className}" (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL,
        class_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        type VARCHAR(50) NOT NULL,
        level VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        reported_by VARCHAR(100) NOT NULL,
        action_taken VARCHAR(255),
        attachment VARCHAR(255)
      )
    `);
    console.log(`Faults table for ${className} created or already exists`);

    // Insert fault
    const result = await client.query(`
      INSERT INTO class_students_fault."${className}" (
        school_id, class_id, student_name, date, type, level, description, reported_by, action_taken, attachment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [school_id, class_id, student_name, date, fault_type, fault_level, description, reported_by, null, attachment]);

    await client.query('COMMIT');
    console.log(`Fault added for ${student_name} in class ${className}, ID: ${result.rows[0].id}`);
    res.status(201).json({ message: 'Fault added successfully', faultId: result.rows[0].id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error adding fault for ${student_name} in class ${className}:`, error);
    res.status(500).json({ error: 'Failed to add fault', details: error.message });
  } finally {
    client.release();
  }
});

// Edit fault
router.put('/edit-fault/:className/:faultId', upload, async (req, res) => {
  const { className, faultId } = req.params;
  const { fault_type, fault_level, date, description, reported_by, action_taken } = req.body;
  const attachment = req.file ? req.file.filename : null;

  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    console.error('Validation failed: Invalid className', { className });
    return res.status(400).json({ error: 'Invalid class name' });
  }

  if (!fault_type || !fault_level || !date || !description || !reported_by) {
    console.error('Validation failed: Missing required fields', { fault_type, fault_level, date, description, reported_by });
    return res.status(400).json({ error: 'All fields except attachment and action_taken are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`Editing fault ID ${faultId} in class ${className}`);

    // Verify fault exists
    const faultExists = await client.query(`
      SELECT 1 FROM class_students_fault."${className}"
      WHERE id = $1
    `, [faultId]);
    if (faultExists.rows.length === 0) {
      console.error(`Fault not found: ID ${faultId} in class ${className}`);
      throw new Error(`Fault ID ${faultId} not found in class ${className}`);
    }

    // Get old attachment to delete if new one is uploaded
    if (attachment) {
      const oldAttachment = await client.query(`
        SELECT attachment FROM class_students_fault."${className}"
        WHERE id = $1
      `, [faultId]);
      if (oldAttachment.rows[0].attachment) {
        try {
          await fs.unlink(path.join(uploadDir, oldAttachment.rows[0].attachment));
          console.log(`Deleted old attachment: ${oldAttachment.rows[0].attachment}`);
        } catch (error) {
          console.warn(`Failed to delete old attachment: ${oldAttachment.rows[0].attachment}`, error);
        }
      }
    }

    // Update fault
    const result = await client.query(`
      UPDATE class_students_fault."${className}"
      SET date = $1, type = $2, level = $3, description = $4, reported_by = $5, action_taken = $6, attachment = COALESCE($7, attachment)
      WHERE id = $8
      RETURNING id
    `, [date, fault_type, fault_level, description, reported_by, action_taken || null, attachment, faultId]);

    await client.query('COMMIT');
    console.log(`Fault ID ${faultId} updated in class ${className}`);
    res.status(200).json({ message: 'Fault updated successfully', faultId: result.rows[0].id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error updating fault ID ${faultId} in class ${className}:`, error);
    res.status(500).json({ error: 'Failed to update fault', details: error.message });
  } finally {
    client.release();
  }
});

// Delete fault
router.delete('/delete-fault/:className/:faultId', async (req, res) => {
  const { className, faultId } = req.params;

  if (!/^[a-zA-Z0-9_]+$/.test(className)) {
    console.error('Validation failed: Invalid className', { className });
    return res.status(400).json({ error: 'Invalid class name' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`Deleting fault ID ${faultId} in class ${className}`);

    // Get attachment to delete
    const fault = await client.query(`
      SELECT attachment FROM class_students_fault."${className}"
      WHERE id = $1
    `, [faultId]);
    if (fault.rows.length === 0) {
      console.error(`Fault not found: ID ${faultId} in class ${className}`);
      throw new Error(`Fault ID ${faultId} not found in class ${className}`);
    }

    if (fault.rows[0].attachment) {
      try {
        await fs.unlink(path.join(uploadDir, fault.rows[0].attachment));
        console.log(`Deleted attachment: ${fault.rows[0].attachment}`);
      } catch (error) {
        console.warn(`Failed to delete attachment: ${fault.rows[0].attachment}`, error);
      }
    }

    // Delete fault
    await client.query(`
      DELETE FROM class_students_fault."${className}"
      WHERE id = $1
    `, [faultId]);

    await client.query('COMMIT');
    console.log(`Fault ID ${faultId} deleted from class ${className}`);
    res.status(200).json({ message: 'Fault deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error deleting fault ID ${faultId} in class ${className}:`, error);
    res.status(500).json({ error: 'Failed to delete fault', details: error.message });
  } finally {
    client.release();
  }
});

// Get reports data
router.get('/reports', async (req, res) => {
  try {
    console.log('Fetching reports data');
    const client = await pool.connect();
    try {
      // Get all fault tables
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'class_students_fault'
      `);
      const classTables = tablesResult.rows.map(row => row.table_name);

      // Total unique students with faults
      let uniqueStudents = 0;
      const studentSet = new Set();
      const classFaultCounts = [];
      const studentFaultCounts = [];

      for (const className of classTables) {
        // Count faults per class
        const faultCountResult = await client.query(`
          SELECT COUNT(*) as fault_count
          FROM class_students_fault."${className}"
        `);
        const faultCount = parseInt(faultCountResult.rows[0].fault_count);
        classFaultCounts.push({ className, faultCount });

        // Get unique students with faults per class
        const studentsResult = await client.query(`
          SELECT DISTINCT student_name
          FROM class_students_fault."${className}"
        `);
        studentsResult.rows.forEach(row => studentSet.add(`${row.student_name}:${className}`));

        // Count faults per student in this class
        const studentCounts = await client.query(`
          SELECT student_name, COUNT(*) as fault_count
          FROM class_students_fault."${className}"
          GROUP BY student_name
          ORDER BY fault_count DESC
        `);
        studentCounts.rows.forEach(row => {
          studentFaultCounts.push({
            student_name: row.student_name,
            className,
            fault_count: parseInt(row.fault_count),
          });
        });
      }

      uniqueStudents = studentSet.size;

      // Sort classes by fault count (descending)
      classFaultCounts.sort((a, b) => b.faultCount - a.faultCount);

      // Sort students by fault count (descending)
      studentFaultCounts.sort((a, b) => b.fault_count - a.fault_count);

      console.log('Reports data fetched:', { uniqueStudents, classFaultCounts, studentFaultCounts });
      res.json({
        uniqueStudents,
        classFaultCounts,
        studentFaultCounts: studentFaultCounts.slice(0, 5), // Top 5 students
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports', details: error.message });
  }
});

module.exports = router;