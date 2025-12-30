const express = require('express');
const router = express.Router();
const cors = require('cors');
const db = require('../config/db');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Security middleware
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/inputValidation');
const { multerFileFilter } = require('../middleware/fileValidation');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Enable CORS for all routes in this router
router.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://excellence.oddag.et'
    : 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Apply input sanitization
router.use(sanitizeInputs);

// Configure multer for file uploads - support multiple file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Use the centralized file filter from security middleware
const fileFilter = multerFileFilter;

// Allowed MIME types for reference (actual validation in multerFileFilter)
const allowedMimes = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get all classes
router.get('/classes', async (req, res) => {
  try {
    const result = await db.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['classes_schema']);
    res.json(result.rows.map(row => row.table_name));
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get columns for a specific class
router.get('/columns/:className', async (req, res) => {
  const { className } = req.params;
  try {
    const result = await db.query(
      'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
      ['classes_schema', className]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching columns:', err);
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
});

// Get form structure including custom field metadata
router.get('/form-structure', async (req, res) => {
  try {
    // First check if the table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'school_schema_points' 
        AND table_name = 'classes'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      return res.json({ classes: [], customFields: [] });
    }
    
    // Check if custom_fields column exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'school_schema_points' 
      AND table_name = 'classes' 
      AND column_name = 'custom_fields'
    `);
    
    if (columnCheck.rows.length === 0) {
      // Column doesn't exist, return empty custom fields
      const result = await db.query('SELECT class_names FROM school_schema_points.classes WHERE id = 1');
      if (result.rows.length > 0) {
        return res.json({
          classes: result.rows[0].class_names,
          customFields: []
        });
      } else {
        return res.json({ classes: [], customFields: [] });
      }
    }
    
    // Column exists, query with custom_fields
    const result = await db.query('SELECT class_names, custom_fields FROM school_schema_points.classes WHERE id = 1');
    if (result.rows.length > 0) {
      let customFields = [];
      try {
        // Parse the JSONB field if it exists and is valid
        if (result.rows[0].custom_fields) {
          customFields = Array.isArray(result.rows[0].custom_fields) 
            ? result.rows[0].custom_fields 
            : JSON.parse(result.rows[0].custom_fields);
        }
      } catch (err) {
        console.error('Error parsing custom_fields:', err);
        customFields = [];
      }
      
      res.json({
        classes: result.rows[0].class_names,
        customFields: customFields
      });
    } else {
      res.json({ classes: [], customFields: [] });
    }
  } catch (err) {
    console.error('Error fetching form structure:', err);
    // If any error, return empty
    return res.json({ classes: [], customFields: [] });
  }
});

// Search for guardian by phone
router.get('/search-guardian/:phone', async (req, res) => {
  const { phone } = req.params;
  try {
    const tables = (await db.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['classes_schema'])).rows.map(row => row.table_name);
    console.log(`Searching for guardian with phone: ${phone} across tables: ${tables.join(', ')}`);
    for (const table of tables) {
      const result = await db.query(
        `SELECT guardian_name, guardian_username, guardian_password FROM classes_schema."${table}" WHERE guardian_phone = $1 LIMIT 1`,
        [phone]
      );
      if (result.rows.length > 0) {
        console.log(`Guardian found in table ${table}:`, result.rows[0]);
        return res.json({
          guardian_name: result.rows[0].guardian_name,
          guardian_username: result.rows[0].guardian_username,
          guardian_password: result.rows[0].guardian_password
        });
      }
    }
    console.log(`No guardian found for phone: ${phone}`);
    res.status(404).json({ error: 'Guardian not found for the provided phone number' });
  } catch (err) {
    console.error('Error searching guardian:', err);
    res.status(500).json({ error: 'Failed to search guardian', details: err.message });
  }
});

// Create form structure - FIXED JSON SERIALIZATION
router.post('/create-form', async (req, res) => {
  const { classCount, classes, customFields } = req.body;
  
  // Validate input
  if (!classes || !Array.isArray(classes) || classes.length === 0) {
    return res.status(400).json({ error: 'Classes array is required and cannot be empty' });
  }

  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Drop and recreate schema
    await client.query('DROP SCHEMA IF EXISTS classes_schema CASCADE');
    await client.query('CREATE SCHEMA classes_schema');
    
    // Create tables for each class
    for (const className of classes) {
      // Basic columns that every table should have
      const baseColumns = [
        'id SERIAL PRIMARY KEY',
        'school_id INTEGER',
        'class_id INTEGER',
        'image_student VARCHAR(255)',
        'student_name VARCHAR(255) NOT NULL',
        'age INTEGER NOT NULL',
        'gender VARCHAR(50) NOT NULL',
        'class VARCHAR(50) NOT NULL',
        'username VARCHAR(255)',
        'password VARCHAR(255)',
        'guardian_name VARCHAR(255) NOT NULL',
        'guardian_phone VARCHAR(20) NOT NULL',
        'guardian_relation VARCHAR(50) NOT NULL',
        'guardian_username VARCHAR(255)',
        'guardian_password VARCHAR(255)'
      ];
      
      // Add custom fields
      const customColumns = [];
      if (customFields && Array.isArray(customFields)) {
        customFields.forEach(field => {
          if (!field.name || !field.type) {
            throw new Error('Invalid custom field: name and type are required');
          }
          
          let columnType;
          switch (field.type) {
            case 'number':
              columnType = 'INTEGER';
              break;
            case 'date':
              columnType = 'DATE';
              break;
            case 'checkbox':
              columnType = 'BOOLEAN';
              break;
            case 'textarea':
            case 'multi-select':
              columnType = 'TEXT';
              break;
            case 'select':
            case 'upload':
            case 'text':
            default:
              columnType = 'VARCHAR(255)';
          }
          
          const notNull = field.required ? ' NOT NULL' : '';
          customColumns.push(`${field.name} ${columnType}${notNull}`);
        });
      }
      
      // Combine all columns
      const allColumns = [...baseColumns, ...customColumns];
      const createTableSQL = `CREATE TABLE classes_schema."${className}" (${allColumns.join(', ')})`;
      
      console.log(`Creating table: ${createTableSQL}`);
      await client.query(createTableSQL);
    }

    // Ensure school_schema_points schema exists
    await client.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    
    // Create global ID tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.global_id_tracker (
        id SERIAL PRIMARY KEY,
        last_school_id INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Initialize global ID tracker if empty
    const trackerCheck = await client.query('SELECT COUNT(*) FROM school_schema_points.global_id_tracker');
    if (parseInt(trackerCheck.rows[0].count) === 0) {
      await client.query('INSERT INTO school_schema_points.global_id_tracker (last_school_id) VALUES (0)');
    }
    
    // Drop and recreate the classes table with proper JSONB handling
    await client.query('DROP TABLE IF EXISTS school_schema_points.classes');
    await client.query(`
      CREATE TABLE school_schema_points.classes (
        id INTEGER PRIMARY KEY, 
        class_count INTEGER NOT NULL, 
        class_names TEXT[] NOT NULL,
        custom_fields JSONB DEFAULT '[]'::jsonb
      )
    `);
    
    // FIX: Properly serialize customFields for JSONB
    let customFieldsForDB = null;
    if (customFields && Array.isArray(customFields) && customFields.length > 0) {
      customFieldsForDB = JSON.stringify(customFields.map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
        required: Boolean(field.required),
        options: Array.isArray(field.options) ? field.options : []
      })));
    } else {
      customFieldsForDB = JSON.stringify([]);
    }
    
    // Insert or update the form structure
    await client.query(`
      INSERT INTO school_schema_points.classes (id, class_count, class_names, custom_fields)
      VALUES (1, $1, $2, $3::jsonb)
      ON CONFLICT (id) DO UPDATE 
      SET class_count = EXCLUDED.class_count, 
          class_names = EXCLUDED.class_names, 
          custom_fields = EXCLUDED.custom_fields
    `, [classes.length, classes, customFieldsForDB]);

    await client.query('COMMIT');
    
    res.json({ 
      message: 'Form structure created successfully',
      classes,
      customFields: customFieldsForDB ? JSON.parse(customFieldsForDB) : []
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating form:', err);
    res.status(500).json({ error: 'Failed to create form', details: err.message });
  } finally {
    client.release();
  }
});

// Fix constraints for existing tables
router.post('/fix-constraints', async (req, res) => {
  try {
    const tables = (await db.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['classes_schema'])).rows.map(row => row.table_name);
    
    for (const table of tables) {
      const constraints = await db.query(`
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = (
          SELECT oid FROM pg_class WHERE relname = $1
        ) AND contype = 'u'
      `, [table]);
      
      for (const constraint of constraints.rows) {
        await db.query(`ALTER TABLE classes_schema."${table}" DROP CONSTRAINT IF EXISTS "${constraint.conname}"`);
      }
    }
    
    res.json({ message: 'Constraints fixed successfully' });
  } catch (err) {
    console.error('Error fixing constraints:', err);
    res.status(500).json({ error: 'Failed to fix constraints', details: err.message });
  }
});

// Delete form structure
router.delete('/delete-form', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    await client.query('DROP SCHEMA IF EXISTS classes_schema CASCADE');
    
    // Also clear the form structure data
    await client.query('DELETE FROM school_schema_points.classes WHERE id = 1');
    
    await client.query('COMMIT');
    res.json({ message: 'Form structure deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting form:', err);
    res.status(500).json({ error: 'Failed to delete form', details: err.message });
  } finally {
    client.release();
  }
});

// Initialize global ID tracker (can be called separately to fix the missing table issue)
router.post('/init-global-tracker', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Ensure schema exists
    await client.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    
    // Create global ID tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.global_id_tracker (
        id SERIAL PRIMARY KEY,
        last_school_id INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Initialize if empty
    const trackerCheck = await client.query('SELECT COUNT(*) FROM school_schema_points.global_id_tracker');
    if (parseInt(trackerCheck.rows[0].count) === 0) {
      await client.query('INSERT INTO school_schema_points.global_id_tracker (last_school_id) VALUES (0)');
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Global ID tracker initialized successfully',
      details: 'The global_id_tracker table has been created and initialized'
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing global tracker:', err);
    res.status(500).json({ error: 'Failed to initialize global tracker', details: err.message });
  } finally {
    client.release();
  }
});

// Add student - UPDATED WITH AUTO-TABLE CREATION AND GLOBAL ID LOGIC
router.post('/add-student', upload.any(), async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const formData = req.body;
    const files = req.files;
    const className = formData.class;
    
    if (!className) {
      throw new Error('Class name is required');
    }
    
    // Ensure global_id_tracker table exists (auto-create if missing)
    try {
      await client.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS school_schema_points.global_id_tracker (
          id SERIAL PRIMARY KEY,
          last_school_id INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Initialize if empty
      const trackerCheck = await client.query('SELECT COUNT(*) FROM school_schema_points.global_id_tracker');
      if (parseInt(trackerCheck.rows[0].count) === 0) {
        await client.query('INSERT INTO school_schema_points.global_id_tracker (last_school_id) VALUES (0)');
      }
    } catch (err) {
      console.error('Error ensuring global_id_tracker exists:', err);
      throw new Error('Failed to initialize global ID tracking system');
    }
    
    // Generate automatic IDs with new logic:
    // school_id: Global sequential counter across ALL classes
    // class_id: Sequential counter within each class
    
    // Step 1: Get and increment global school_id
    const globalIdResult = await client.query(`
      UPDATE school_schema_points.global_id_tracker 
      SET last_school_id = last_school_id + 1, updated_at = CURRENT_TIMESTAMP
      RETURNING last_school_id
    `);
    
    const newSchoolId = globalIdResult.rows[0].last_school_id;
    
    // Step 2: Get the maximum class_id for this specific class
    const classIdResult = await client.query(
      `SELECT COALESCE(MAX(class_id), 0) as max_class_id 
       FROM classes_schema."${className}"`
    );
    
    const newClassId = (classIdResult.rows[0].max_class_id || 0) + 1;
    
    // Generate credentials
    const studentUsername = `${formData.student_name.toLowerCase().replace(/\s/g, '')}_${Math.floor(Math.random() * 10000)}`;
    const studentPassword = uuidv4().slice(0, 8);
    const guardianUsername = formData.guardian_username || `${formData.guardian_name.toLowerCase().replace(/\s/g, '')}_${Math.floor(Math.random() * 10000)}`;
    const guardianPassword = formData.guardian_password || uuidv4().slice(0, 8);
    
    // Get columns with their data types
    const columnsResult = await client.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
      ['classes_schema', className]
    );
    
    const validColumns = columnsResult.rows.map(row => row.column_name);
    
    const insertData = {
      school_id: newSchoolId,
      class_id: newClassId,
      student_name: formData.student_name,
      age: parseInt(formData.age),
      gender: formData.gender,
      class: className,
      username: studentUsername,
      password: studentPassword,
      guardian_name: formData.guardian_name,
      guardian_phone: formData.guardian_phone,
      guardian_relation: formData.guardian_relation,
      guardian_username: guardianUsername,
      guardian_password: guardianPassword
    };
    
    // Handle student image
    const imageFile = files.find(file => file.fieldname === 'image_student');
    if (imageFile) {
      insertData.image_student = `/Uploads/${imageFile.filename}`;
    }
    
    // Process custom fields based on their data types
    Object.keys(formData).forEach(key => {
      if (validColumns.includes(key) && !insertData[key]) {
        const col = columnsResult.rows.find(col => col.column_name === key);
        if (!col) return;
        
        const value = formData[key];
        
        switch (col.data_type) {
          case 'integer':
            insertData[key] = value ? parseInt(value) : null;
            break;
          case 'boolean':
            insertData[key] = value === 'true' || value === true || value === 'on';
            break;
          case 'text':
            // Handle textarea and multi-select fields
            insertData[key] = value || null;
            break;
          case 'date':
            insertData[key] = value || null;
            break;
          default:
            insertData[key] = value || null;
        }
      }
    });
    
    // Handle file uploads for custom upload fields
    files.forEach(file => {
      if (file.fieldname !== 'image_student' && validColumns.includes(file.fieldname)) {
        insertData[file.fieldname] = `/Uploads/${file.filename}`;
      }
    });
    
    const columns = Object.keys(insertData).filter(key => validColumns.includes(key));
    const values = columns.map(key => insertData[key]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    const insertQuery = `INSERT INTO classes_schema."${className}" (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await client.query(insertQuery, values);
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Student added successfully',
      student_username: studentUsername,
      student_password: studentPassword,
      guardian_username: guardianUsername,
      guardian_password: guardianPassword,
      generated_ids: {
        school_id: newSchoolId,
        class_id: newClassId
      },
      id_explanation: {
        school_id: 'Unique across all students in all classes',
        class_id: `Unique within ${className} class only`
      }
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error inserting student:', err);
    
    if (err.code === '23505' && err.constraint && err.constraint.includes('guardian_username')) {
      return res.status(500).json({ 
        error: 'Database constraint violation. Please run the fix constraints endpoint or recreate the form structure.',
        details: 'Guardian username unique constraint still exists in the database'
      });
    }
    
    res.status(500).json({ error: 'Failed to add student', details: err.message });
  } finally {
    client.release();
  }
});

// Get global ID statistics
router.get('/id-statistics', async (req, res) => {
  try {
    // Ensure global_id_tracker table exists first
    try {
      await db.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
      await db.query(`
        CREATE TABLE IF NOT EXISTS school_schema_points.global_id_tracker (
          id SERIAL PRIMARY KEY,
          last_school_id INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      console.error('Error ensuring global_id_tracker exists:', err);
    }
    
    // Get current global school_id
    const globalIdResult = await db.query('SELECT last_school_id FROM school_schema_points.global_id_tracker LIMIT 1');
    
    // Get class-wise student counts
    const tables = (await db.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['classes_schema'])).rows.map(row => row.table_name);
    
    const classStats = [];
    for (const table of tables) {
      const countResult = await db.query(`SELECT COUNT(*) as student_count FROM classes_schema."${table}"`);
      const maxClassIdResult = await db.query(`SELECT COALESCE(MAX(class_id), 0) as max_class_id FROM classes_schema."${table}"`);
      
      classStats.push({
        class_name: table,
        student_count: parseInt(countResult.rows[0].student_count),
        max_class_id: parseInt(maxClassIdResult.rows[0].max_class_id)
      });
    }
    
    res.json({
      global_school_id: globalIdResult.rows[0]?.last_school_id || 0,
      class_statistics: classStats
    });
    
  } catch (err) {
    console.error('Error fetching ID statistics:', err);
    res.status(500).json({ error: 'Failed to fetch ID statistics', details: err.message });
  }
});

// Reset global ID counter (admin function)
router.post('/reset-global-ids', async (req, res) => {
  const { confirmation } = req.body;
  
  if (confirmation !== 'RESET_ALL_IDS') {
    return res.status(400).json({ error: 'Confirmation code required to reset global IDs' });
  }
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Ensure global_id_tracker exists
    await client.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.global_id_tracker (
        id SERIAL PRIMARY KEY,
        last_school_id INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Reset global ID tracker
    await client.query('UPDATE school_schema_points.global_id_tracker SET last_school_id = 0, updated_at = CURRENT_TIMESTAMP');
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Global school ID counter reset to 0',
      note: 'Class IDs remain unchanged in individual class tables'
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error resetting global IDs:', err);
    res.status(500).json({ error: 'Failed to reset global IDs', details: err.message });
  } finally {
    client.release();
  }
});

// Student and Guardian Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const tables = (await db.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['classes_schema'])).rows.map(row => row.table_name);
    
    let user = null;
    let role = null;
    
    // Search for student
    for (const table of tables) {
      const result = await db.query(
        `SELECT * FROM classes_schema."${table}" WHERE username = $1 AND password = $2`,
        [username, password]
      );
      
      if (result.rows.length > 0) {
        user = result.rows[0];
        role = 'student';
        break;
      }
    }
    
    // If not found as student, search for guardian
    if (!user) {
      for (const table of tables) {
        const result = await db.query(
          `SELECT * FROM classes_schema."${table}" WHERE guardian_username = $1 AND guardian_password = $2`,
          [username, password]
        );
        
        if (result.rows.length > 0) {
          user = result.rows[0];
          role = 'guardian';
          break;
        }
      }
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    res.json({
      role,
      student: user
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Get student profile
router.get('/profile/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const tables = (await db.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['classes_schema'])).rows.map(row => row.table_name);
    
    let student = null;
    
    for (const table of tables) {
      const result = await db.query(
        `SELECT * FROM classes_schema."${table}" WHERE username = $1`,
        [username]
      );
      
      if (result.rows.length > 0) {
        student = result.rows[0];
        break;
      }
    }
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({
      role: 'student',
      student
    });
    
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get guardian profile with all their wards
router.get('/guardian-profile/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const tables = (await db.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['classes_schema'])).rows.map(row => row.table_name);
    
    let wards = [];
    
    for (const table of tables) {
      const result = await db.query(
        `SELECT * FROM classes_schema."${table}" WHERE guardian_username = $1`,
        [username]
      );
      
      if (result.rows.length > 0) {
        wards = wards.concat(result.rows);
      }
    }
    
    if (wards.length === 0) {
      return res.status(404).json({ error: 'Guardian not found' });
    }
    
    res.json({
      role: 'guardian',
      student: wards
    });
    
  } catch (err) {
    console.error('Guardian profile fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch guardian profile' });
  }
});

module.exports = router;