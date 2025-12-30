// routes/staffRoutes.js - FIXED PHONE NUMBER TYPE
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;
require('dotenv').config();

// Security middleware
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, schemas, sanitizeInputs } = require('../middleware/inputValidation');
const { fileValidator, multerFileFilter } = require('../middleware/fileValidation');
const { uploadLimiter } = require('../middleware/rateLimiter');

const {
  initializeStaffUsersTable,
  createStaffUser,
  verifyCredentials,
  getStaffProfile,
} = require('./staff_auth');

// Add JSON middleware specifically for this router
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.use(sanitizeInputs);

// ---------------------------------------------------------------------
// 1. Multer – file uploads (dynamic fields for custom uploads)
// ---------------------------------------------------------------------
const uploadDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const uniq = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniq}${path.extname(file.originalname)}`);
  },
});

// Create dynamic multer configuration that accepts any field with file validation
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max (reduced for security)
  fileFilter: multerFileFilter // Add file type validation
}).any(); // Use .any() to accept any field names

// ---------------------------------------------------------------------
// 2. Global staff-counter (global_staff_id)
// ---------------------------------------------------------------------
const initializeStaffCounter = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_counter (
        id SERIAL PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
    `);
    const { rows } = await pool.query(
      'SELECT count FROM staff_counter WHERE id = 1'
    );
    if (rows.length === 0) {
      await pool.query('INSERT INTO staff_counter (id, count) VALUES (1, 0)');
    }
    console.log('Staff counter initialized');
  } catch (e) {
    console.error('Staff counter init error:', e);
  }
};

const getNextGlobalStaffId = async () => {
  const { rows } = await pool.query(
    'UPDATE staff_counter SET count = count + 1 WHERE id = 1 RETURNING count'
  );
  return rows[0].count;
};

// ---------------------------------------------------------------------
// 3. Schedule schema (teachers + availability)
// ---------------------------------------------------------------------
const ensureScheduleSchemaColumns = async (client) => {
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS schedule_schema');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_schema.teachers (
        id SERIAL PRIMARY KEY,
        global_staff_id INTEGER NOT NULL UNIQUE,
        teacher_name VARCHAR(100) NOT NULL,
        teacher_type VARCHAR(50) NOT NULL DEFAULT 'full_time',
        max_periods_per_day INTEGER DEFAULT 4,
        max_periods_per_week INTEGER DEFAULT 20,
        work_days TEXT[] DEFAULT '{}',
        preferred_shifts TEXT[] DEFAULT '{}',
        max_hours_per_day INTEGER DEFAULT 8,
        max_hours_per_week INTEGER DEFAULT 40,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_schema.teacher_availability (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER REFERENCES schedule_schema.teachers(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        shift_group VARCHAR(50) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(teacher_id, day_of_week, shift_group)
      )
    `);

    const cols = [
      { name: 'work_days', type: 'TEXT[]', def: "'{}'" },
      { name: 'preferred_shifts', type: 'TEXT[]', def: "'{}'" },
      { name: 'max_hours_per_day', type: 'INTEGER', def: '8' },
      { name: 'max_hours_per_week', type: 'INTEGER', def: '40' },
    ];

    for (const c of cols) {
      const exists = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='schedule_schema' AND table_name='teachers' AND column_name=$1`,
        [c.name]
      );
      if (exists.rowCount === 0) {
        await client.query(
          `ALTER TABLE schedule_schema.teachers ADD COLUMN ${c.name} ${c.type} DEFAULT ${c.def}`
        );
      }
    }
    console.log('Schedule schema ensured');
  } catch (e) {
    console.error('Schedule schema error:', e);
    throw e;
  }
};

const initializeScheduleSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureScheduleSchemaColumns(client);
    await client.query('COMMIT');
    console.log('Schedule schema initialized');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Schedule schema init failed:', e);
    throw e;
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------------------
// 3.1 School Schema Points - Teachers Table
// ---------------------------------------------------------------------
const initializeSchoolSchemaPoints = async () => {
  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.teachers (
        id SERIAL PRIMARY KEY,
        global_staff_id INTEGER NOT NULL UNIQUE,
        teacher_name VARCHAR(100) NOT NULL,
        staff_work_time VARCHAR(50) NOT NULL DEFAULT 'Full Time',
        role VARCHAR(100) NOT NULL,
        staff_enrollment_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add unique constraint for teacher_name
    try {
      await pool.query(`
        ALTER TABLE school_schema_points.teachers 
        ADD CONSTRAINT teachers_teacher_name_unique UNIQUE (teacher_name)
      `);
    } catch (error) {
      console.log('Teacher name unique constraint might already exist:', error.message);
    }

    console.log('School schema points teachers table initialized');
  } catch (e) {
    console.error('School schema points init error:', e);
    throw e;
  }
};

const addTeacherToSchoolSchemaPoints = async (
  client,
  globalStaffId,
  teacherName,
  staffWorkTime,
  role,
  staffEnrollmentType
) => {
  try {
    // Ensure work time is properly formatted
    const formattedWorkTime = staffWorkTime === 'Part time' ? 'Part Time' : 
                            staffWorkTime === 'Full time' ? 'Full Time' :
                            staffWorkTime || 'Full Time';

    await client.query(`
      INSERT INTO school_schema_points.teachers 
        (global_staff_id, teacher_name, staff_work_time, role, staff_enrollment_type)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (global_staff_id) 
      DO UPDATE SET
        teacher_name = EXCLUDED.teacher_name,
        staff_work_time = EXCLUDED.staff_work_time,
        role = EXCLUDED.role,
        staff_enrollment_type = EXCLUDED.staff_enrollment_type,
        updated_at = CURRENT_TIMESTAMP
    `, [globalStaffId, teacherName, formattedWorkTime, role, staffEnrollmentType]);
    
    console.log(`Teacher ${teacherName} added to school_schema_points.teachers with work time: ${formattedWorkTime}`);
  } catch (e) {
    console.error('addTeacherToSchoolSchemaPoints error:', e);
    throw e;
  }
};

// ---------------------------------------------------------------------
// 3.2 School Schema Points - Teachers Period Table
// ---------------------------------------------------------------------
const initializeTeachersPeriodTable = async () => {
  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.teachers_period (
        id SERIAL PRIMARY KEY,
        teacher_name VARCHAR(100) NOT NULL,
        class_name VARCHAR(50) NOT NULL,
        subject_name VARCHAR(100) NOT NULL,
        staff_work_time VARCHAR(20) DEFAULT 'Full Time',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(teacher_name, class_name, subject_name)
      )
    `);
    console.log('Teachers period table initialized');
  } catch (e) {
    console.error('Teachers period table init error:', e);
    throw e;
  }
};

// ---------------------------------------------------------------------
// 4. FORM METADATA SYSTEM - NEW FOR FIELD TYPE PRESERVATION
// ---------------------------------------------------------------------
const initializeFormMetadata = async () => {
  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS form_metadata');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS form_metadata.field_types (
        id SERIAL PRIMARY KEY,
        schema_name VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        column_name VARCHAR(100) NOT NULL,
        field_type VARCHAR(50) NOT NULL,
        required BOOLEAN DEFAULT FALSE,
        options JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(schema_name, table_name, column_name)
      )
    `);
    
    console.log('Form metadata system initialized');
  } catch (e) {
    console.error('Form metadata init error:', e);
    throw e;
  }
};

// ---------------------------------------------------------------------
// 5. Helper utilities
// ---------------------------------------------------------------------
const sanitizeStaffTypeToSchema = (type) =>
  `staff_${type.replace(/\s+/g, '_').toLowerCase()}`;
const sanitizeClassName = (name) =>
  name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

const BASE_COLUMNS = new Set([
  'global_staff_id',
  'staff_id',
  'image_staff',
  'name',
  'gender',
  'role',
  'staff_enrollment_type',
  'staff_work_time',
]);

const updateStaffIds = async (schemaName, className) => {
  const { rows } = await pool.query(
    `SELECT id FROM "${schemaName}"."${className}" ORDER BY LOWER(name) ASC`
  );
  for (let i = 0; i < rows.length; i++) {
    await pool.query(
      `UPDATE "${schemaName}"."${className}" SET staff_id = $1 WHERE id = $2`,
      [i + 1, rows[i].id]
    );
  }
};

// FIXED: Completely rewritten to handle day conversion properly
const extractPartTimeSchedule = (data) => {
  const dayMap = {
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 7,
  };

  console.log('Extracting schedule from data:', {
    work_days: data.work_days,
    shifts: data.shifts,
    availability: data.availability,
    max_hours_per_day: data.max_hours_per_day,
    max_hours_per_week: data.max_hours_per_week
  });

  // Handle work_days - ensure it's an array
  let workDays = data.work_days || [];
  if (typeof workDays === 'string') {
    try {
      workDays = JSON.parse(workDays);
    } catch (e) {
      console.error('Error parsing work_days:', e);
      workDays = [];
    }
  }

  // Handle shifts - ensure it's an array
  let shifts = data.shifts || [];
  if (typeof shifts === 'string') {
    try {
      shifts = JSON.parse(shifts);
    } catch (e) {
      console.error('Error parsing shifts:', e);
      shifts = [];
    }
  }

  // Handle availability - this is the main issue
  let availabilityData = data.availability || [];
  if (typeof availabilityData === 'string') {
    try {
      availabilityData = JSON.parse(availabilityData);
      console.log('Successfully parsed availability from string to:', availabilityData);
    } catch (e) {
      console.error('Error parsing availability JSON:', e);
      availabilityData = [];
    }
  }

  // Process availability slots
  const availability = [];
  if (Array.isArray(availabilityData)) {
    for (const slot of availabilityData) {
      if (slot && slot.active === true) {
        // Convert day name to integer - this is the critical fix
        const dayName = slot.day;
        const dayNumber = dayMap[dayName];
        
        if (dayNumber === undefined) {
          console.warn(`Invalid day name: "${dayName}", skipping slot. Valid days:`, Object.keys(dayMap));
          continue;
        }

        availability.push({
          day_of_week: dayNumber, // This MUST be an integer
          shift_group: slot.shift || 'morning',
          start_time: slot.start_time || '07:00',
          end_time: slot.end_time || '17:30',
          is_available: true,
        });
      }
    }
  }

  console.log('Processed availability slots:', availability);

  return {
    work_days: workDays.length ? workDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    preferred_shifts: shifts.length ? shifts : ['morning', 'afternoon'],
    availability,
    max_hours_per_day: parseInt(data.max_hours_per_day) || 8,
    max_hours_per_week: parseInt(data.max_hours_per_week) || 40,
  };
};

// FIXED: Completely rewritten to handle work_days conversion properly
const addTeacherToScheduleSystem = async (
  client,
  globalStaffId,
  teacherName,
  schedule,
  teacherType = 'part_time'
) => {
  try {
    await ensureScheduleSchemaColumns(client);

    // Convert work_days from string names to integers if needed
    const dayMap = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 7,
    };

    let workDaysArray = schedule.work_days || [];
    
    // If work_days contains string day names, convert to integers
    if (workDaysArray.length > 0 && typeof workDaysArray[0] === 'string') {
      workDaysArray = workDaysArray.map(day => dayMap[day] || 1); // Default to Monday if invalid
      console.log('Converted work_days from strings to integers:', workDaysArray);
    }

    console.log('Adding teacher to schedule system:', {
      globalStaffId,
      teacherName,
      teacherType,
      schedule: {
        work_days: workDaysArray,
        preferred_shifts: schedule.preferred_shifts,
        availability_count: schedule.availability ? schedule.availability.length : 0,
        max_hours_per_day: schedule.max_hours_per_day,
        max_hours_per_week: schedule.max_hours_per_week
      }
    });

    const { rows } = await client.query(
      `INSERT INTO schedule_schema.teachers
         (global_staff_id, teacher_name, teacher_type,
          work_days, preferred_shifts, max_hours_per_day, max_hours_per_week)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (global_staff_id) DO UPDATE SET
         teacher_name=$2, teacher_type=$3,
         work_days=$4, preferred_shifts=$5,
         max_hours_per_day=$6, max_hours_per_week=$7,
         updated_at=CURRENT_TIMESTAMP
       RETURNING id`,
      [
        globalStaffId,
        teacherName,
        teacherType,
        workDaysArray, // Use the converted integer array
        schedule.preferred_shifts,
        schedule.max_hours_per_day,
        schedule.max_hours_per_week,
      ]
    );

    const teacherId = rows[0].id;
    
    // Only process availability if we have data
    if (schedule.availability && schedule.availability.length > 0) {
      await client.query(
        'DELETE FROM schedule_schema.teacher_availability WHERE teacher_id = $1',
        [teacherId]
      );

      let insertedSlots = 0;
      for (const slot of schedule.availability) {
        try {
          // CRITICAL: Ensure day_of_week is an integer
          const dayOfWeek = parseInt(slot.day_of_week);
          if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
            console.warn(`Invalid day_of_week: ${slot.day_of_week}, must be 1-7. Skipping slot.`);
            continue;
          }

          console.log('Inserting availability slot:', {
            teacherId,
            day_of_week: dayOfWeek,
            shift_group: slot.shift_group,
            start_time: slot.start_time,
            end_time: slot.end_time
          });

          await client.query(
            `INSERT INTO schedule_schema.teacher_availability
               (teacher_id, day_of_week, shift_group, start_time, end_time, is_available)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              teacherId,
              dayOfWeek, // This is now guaranteed to be an integer
              slot.shift_group,
              slot.start_time,
              slot.end_time,
              slot.is_available,
            ]
          );
          insertedSlots++;
        } catch (slotError) {
          console.error('Error inserting availability slot:', slotError);
          // Continue with other slots even if one fails
        }
      }
      console.log(`Successfully inserted ${insertedSlots} availability slots for teacher ${teacherName}`);
    } else {
      console.log('No availability slots to insert for teacher:', teacherName);
    }
  } catch (e) {
    console.error('addTeacherToScheduleSystem error:', e);
    throw e;
  }
};

// ---------------------------------------------------------------------
// 6. Startup initialisations
// ---------------------------------------------------------------------
initializeStaffCounter();
initializeStaffUsersTable();
initializeScheduleSchema();
initializeSchoolSchemaPoints();
initializeTeachersPeriodTable();
initializeFormMetadata();

// ---------------------------------------------------------------------
// 7. ROUTES
// ---------------------------------------------------------------------

// 7.1 Serve uploaded files
router.get('/uploads/:filename', async (req, res) => {
  try {
    const filePath = path.join(uploadDir, req.params.filename);
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) return res.status(404).json({ error: 'File not found' });
    res.sendFile(filePath);
  } catch (e) {
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// 7.2 Part-time schedule options (for UI)
router.get('/part-time-options', async (req, res) => {
  res.json({
    days: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    shifts: ['morning', 'afternoon', 'evening'],
    default_times: {
      morning: { start_time: '07:00', end_time: '12:30' },
      afternoon: { start_time: '12:30', end_time: '17:30' },
      evening: { start_time: '17:30', end_time: '21:00' },
    },
    max_hours: { per_day: 8, per_week: 40 },
  });
});

// 7.3 List classes for a staff type
router.get('/classes', async (req, res) => {
  const { staffType } = req.query;
  if (!staffType)
    return res.status(400).json({ error: 'staffType required' });

  const schema = sanitizeStaffTypeToSchema(staffType);
  try {
    const { rows } = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_name <> 'staff_counter'`,
      [schema]
    );
    res.json(rows.map((r) => r.table_name));
  } catch (e) {
    res
      .status(500)
      .json({ error: 'Failed to fetch classes', details: e.message });
  }
});

// 7.4 Column metadata for a specific form - FIXED FIELD TYPES
router.get('/columns/:staffType/:className', async (req, res) => {
  const { staffType, className: raw } = req.params;
  const className = sanitizeClassName(raw);
  const schema = sanitizeStaffTypeToSchema(staffType);

  try {
    // Get database column info
    const { rows } = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2`,
      [schema, className]
    );

    // Get field type metadata
    const { rows: metadataRows } = await pool.query(
      `SELECT column_name, field_type, required, options
       FROM form_metadata.field_types
       WHERE schema_name = $1 AND table_name = $2`,
      [schema, className]
    );

    // Create metadata lookup
    const metadataLookup = {};
    metadataRows.forEach(row => {
      metadataLookup[row.column_name] = {
        field_type: row.field_type,
        required: row.required,
        options: row.options
      };
    });

    const columns = rows.map((c) => {
      let fieldType;
      let options = [];
      let required = c.is_nullable === 'NO';

      // Use metadata if available - this preserves the original field types
      if (metadataLookup[c.column_name]) {
        fieldType = metadataLookup[c.column_name].field_type;
        required = metadataLookup[c.column_name].required;
        options = metadataLookup[c.column_name].options || [];
        
        console.log(`Using metadata for ${c.column_name}: ${fieldType}`);
      } 
      // Fallback to database type mapping only for standard fields
      else if (c.column_name === 'image_staff') {
        fieldType = 'upload';
      }
      else if (c.data_type === 'boolean') {
        fieldType = 'checkbox';
      }
      else if (c.data_type === 'integer' || c.data_type === 'numeric' || c.data_type === 'bigint') {
        fieldType = 'number';
      }
      else if (c.data_type === 'date') {
        fieldType = 'date';
      }
      else if (c.data_type.includes('character varying') || c.data_type === 'text') {
        // Check for upload field patterns
        if (c.column_name.includes('_file') || c.column_name.includes('_upload') || 
            c.column_name.includes('_image') || c.column_name.includes('_photo') ||
            c.column_name.includes('_document')) {
          fieldType = 'upload';
        } else {
          fieldType = 'text';
        }
      }
      else {
        fieldType = 'text';
      }

      return {
        column_name: c.column_name,
        data_type: fieldType, // Use the preserved field type
        is_nullable: c.is_nullable,
        required: required,
        options: options
      };
    });

    // Add dropdown options for standard fields
    const addOpts = (name, opts) => {
      const col = columns.find((c) => c.column_name === name);
      if (col) {
        col.options = opts;
        // Don't override the data_type if it's already set from metadata
        if (!metadataLookup[name]) {
          col.data_type = 'select';
        }
      }
    };
    
    addOpts('gender', ['Male', 'Female', 'Other']);
    addOpts('role', [
      'Teacher',
      'Director',
      'Coordinator',
      'Supervisor',
      'Deputy director',
      'Purchaser',
      'Cashier',
      'Accountant',
      'Guard',
      'Cleaner',
      'Department Head',
      'Counselor',
      'Instructor',
      'Librarian',
      'Nurse',
      'Technician',
      'Assistant',
      'Manager',
      'Trainer',
      'Advisor',
      'Inspector',
    ]);
    addOpts('staff_enrollment_type', ['Permanent', 'Contract']);
    addOpts('staff_work_time', ['Full Time', 'Part Time']);

    console.log('Returning columns with preserved types:', columns.map(c => ({ name: c.column_name, type: c.data_type })));
    res.json(columns);
  } catch (e) {
    console.error('Error fetching columns:', e);
    res
      .status(500)
      .json({ error: 'Failed to fetch columns', details: e.message });
  }
});

// 7.5 CREATE FORM (dynamic table per staff type) - FIXED PHONE FIELD TYPE
router.post('/create-form', async (req, res) => {
  // Validate request body exists
  if (!req.body) {
    return res.status(400).json({ error: 'Request body is missing' });
  }

  const { staffType, className: raw, customFields = [] } = req.body;
  
  // Validate required fields
  if (!staffType || !raw) {
    return res.status(400).json({ 
      error: 'Missing required fields: staffType and className are required' 
    });
  }

  if (
    !['Supportive Staff', 'Administrative Staff', 'Teachers'].includes(staffType) ||
    !raw
  )
    return res.status(400).json({ error: 'Invalid staffType or className' });

  const className = sanitizeClassName(raw);
  const schema = sanitizeStaffTypeToSchema(staffType);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Create schema and table
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    const existing = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_name <> 'staff_counter'`,
      [schema]
    );
    if (existing.rowCount)
      throw new Error('A form already exists for this staff type');

    if (!/^[a-z0-9_]+$/.test(className))
      throw new Error('Class name may only contain letters, numbers and _');

    const baseCols = [
      'id SERIAL PRIMARY KEY',
      'global_staff_id INTEGER NOT NULL',
      'staff_id INTEGER NOT NULL',
      'image_staff VARCHAR(255)',
      'name VARCHAR(100) NOT NULL',
      'gender VARCHAR(50) NOT NULL',
      'role VARCHAR(100) NOT NULL',
      'staff_enrollment_type VARCHAR(50) NOT NULL',
      'staff_work_time VARCHAR(50) NOT NULL',
    ];

    // PostgreSQL reserved keywords that cannot be used as column names
    const reservedKeywords = [
      'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'asymmetric', 
      'authorization', 'binary', 'both', 'case', 'cast', 'check', 'collate', 'column', 
      'concurrently', 'constraint', 'create', 'cross', 'current_catalog', 'current_date', 
      'current_role', 'current_schema', 'current_time', 'current_timestamp', 'current_user', 
      'default', 'deferrable', 'desc', 'distinct', 'do', 'else', 'end', 'except', 'false', 
      'fetch', 'for', 'foreign', 'from', 'grant', 'group', 'having', 'in', 'initially', 
      'intersect', 'into', 'join', 'lateral', 'leading', 'left', 'like', 'limit', 'localtime', 
      'localtimestamp', 'natural', 'not', 'null', 'offset', 'on', 'only', 'or', 'order', 
      'using', 'verbose', 'when', 'where', 'window', 'with'
    ];

    // Process custom fields
    for (const f of customFields) {
      if (BASE_COLUMNS.has(f.name)) continue;
      
      let def = '';
      let fieldType = f.type;
      
      // Validate field name
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.name)) {
        throw new Error(`Invalid field name: "${f.name}". Field names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
      }

      // Check if field name is a reserved keyword
      if (reservedKeywords.includes(f.name.toLowerCase())) {
        throw new Error(`Field name "${f.name}" is a PostgreSQL reserved keyword. Please choose a different name.`);
      }

      // Map field types to database types - PRESERVE ORIGINAL TYPES
      // SPECIAL CASE: For phone fields, use BIGINT to handle large numbers
      if (f.name === 'phone') {
        def = 'BIGINT';
        fieldType = 'number';
      } else {
        switch (f.type) {
          case 'text':
            def = 'VARCHAR(255)';
            break;
          case 'textarea':
            def = 'TEXT'; // Use TEXT for longer content
            fieldType = 'textarea'; // Preserve the textarea type
            break;
          case 'number':
            def = 'BIGINT'; // Changed from INTEGER to BIGINT for large numbers
            break;
          case 'date':
            def = 'DATE';
            break;
          case 'checkbox':
            def = 'BOOLEAN DEFAULT FALSE';
            fieldType = 'checkbox'; // Preserve the checkbox type
            break;
          case 'select':
            def = 'VARCHAR(255)';
            fieldType = 'select'; // Preserve the select type
            break;
          case 'multiple-checkbox':
            def = 'VARCHAR(255)'; // Store as comma-separated values or JSON
            fieldType = 'multiple-checkbox'; // Preserve the multiple-checkbox type
            break;
          case 'upload':
            def = 'VARCHAR(255)'; // Store file paths
            fieldType = 'upload'; // Preserve the upload type
            break;
          default:
            def = 'VARCHAR(255)';
        }
      }
      
      baseCols.push(`${f.name} ${def}${f.required ? ' NOT NULL' : ''}`);

      // Store field metadata with preserved types
      await client.query(`
        INSERT INTO form_metadata.field_types 
        (schema_name, table_name, column_name, field_type, required, options)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [schema, className, f.name, fieldType, f.required, JSON.stringify(f.options || [])]);
      
      console.log(`Stored metadata for ${f.name}: type=${fieldType}, required=${f.required}, db_type=${def}`);
    }

    // Create the main table
    await client.query(
      `CREATE TABLE "${schema}"."${className}" (${baseCols.join(', ')})`
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Form created successfully' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Create form error:', e);
    res.status(500).json({ error: 'Failed to create form', details: e.message });
  } finally {
    client.release();
  }
});

// 7.6 DELETE FORM
router.delete('/delete-form', async (req, res) => {
  const { staffType, className: raw } = req.body;
  if (!staffType || !raw)
    return res.status(400).json({ error: 'staffType & className required' });

  const className = sanitizeClassName(raw);
  const schema = sanitizeStaffTypeToSchema(staffType);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Delete main table
    await client.query(`DROP TABLE IF EXISTS "${schema}"."${className}" CASCADE`);
    
    // Delete metadata
    await client.query(`
      DELETE FROM form_metadata.field_types 
      WHERE schema_name = $1 AND table_name = $2
    `, [schema, className]);
    
    await client.query('COMMIT');
    res.json({ message: 'Form deleted' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Delete failed', details: e.message });
  } finally {
    client.release();
  }
});

// 7.7 ADD SINGLE STAFF (with files, user account, schedule) - FIXED MULTER
router.post('/add-staff', upload, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      staffType,
      class: rawClass,
      uploadFields: rawUploadFields = '[]',
    } = req.body;
    const className = sanitizeClassName(rawClass);
    const schema = sanitizeStaffTypeToSchema(staffType);
    const uploadFields = JSON.parse(rawUploadFields);

    // ---- Parse form data (JSON-stringified values from frontend) ----
    const formData = {};
    for (const [k, v] of Object.entries(req.body)) {
      if (!['staffType', 'class', 'uploadFields'].includes(k)) {
        try {
          // Try to parse as JSON first
          formData[k] = JSON.parse(v);
        } catch {
          // If parsing fails, use the raw value
          formData[k] = v;
        }
      }
    }

    console.log('Parsed form data:', {
      staffType, className, 
      formDataKeys: Object.keys(formData),
      availabilityType: typeof formData.availability,
      availability: formData.availability
    });

    // ---- Verify table exists & fetch columns ----
    const colRes = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2`,
      [schema, className]
    );
    if (colRes.rowCount === 0)
      throw new Error('Target table does not exist');

    const tableCols = colRes.rows.map((r) => r.column_name);
    const insertData = {};
    for (const c of tableCols) {
      if (formData.hasOwnProperty(c)) insertData[c] = formData[c];
    }

    // ---- File handling with dynamic field names ----
    const files = req.files || [];
    console.log('Received files:', files.map(f => ({ fieldname: f.fieldname, filename: f.filename })));

    // Handle image_staff
    const imageStaffFile = files.find(f => f.fieldname === 'image_staff');
    if (imageStaffFile) {
      insertData.image_staff = imageStaffFile.filename;
    }

    // Handle custom upload fields
    for (const field of uploadFields) {
      const file = files.find(f => f.fieldname === field);
      if (file) {
        insertData[field] = file.filename;
        console.log(`Assigned file ${file.filename} to field ${field}`);
      }
    }

    // ---- IDs ----
    const globalStaffId = await getNextGlobalStaffId();
    const max = await client.query(
      `SELECT COALESCE(MAX(staff_id),0) AS m FROM "${schema}"."${className}"`
    );
    const staffId = max.rows[0].m + 1;

    // ---- Ensure staff_work_time is properly formatted ----
    if (insertData.staff_work_time) {
      insertData.staff_work_time = insertData.staff_work_time === 'Part time' ? 'Part Time' :
                                  insertData.staff_work_time === 'Full time' ? 'Full Time' :
                                  insertData.staff_work_time;
    } else {
      insertData.staff_work_time = 'Full Time';
    }

    // Handle multiple-checkbox fields (convert arrays to strings)
    for (const key in insertData) {
      if (Array.isArray(insertData[key])) {
        insertData[key] = insertData[key].join(',');
      }
    }

    // ---- INSERT ----
    const cols = ['global_staff_id', 'staff_id', ...Object.keys(insertData)];
    const vals = [globalStaffId, staffId, ...Object.values(insertData)];
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    
    console.log('Inserting data with columns:', cols);
    console.log('Inserting data with values:', vals);

    const ins = await client.query(
      `INSERT INTO "${schema}"."${className}" (${cols.join(
        ', '
      )}) VALUES (${placeholders}) RETURNING id`,
      vals
    );

    // ---- USER ACCOUNT ----
    let userCredentials = null;
    if (formData.name) {
      try {
        userCredentials = await createStaffUser(
          globalStaffId,
          formData.name,
          staffType,
          className
        );
      } catch (e) {
        console.error('User creation error:', e);
      }
    }

    // ---- SCHOOL SCHEMA POINTS - TEACHERS TABLE ----
    let schoolSchemaError = null;
    if (formData.role === 'Teacher' && formData.name) {
      try {
        await addTeacherToSchoolSchemaPoints(
          client,
          globalStaffId,
          formData.name,
          formData.staff_work_time || 'Full Time',
          formData.role,
          formData.staff_enrollment_type || 'Permanent'
        );
      } catch (e) {
        schoolSchemaError = e.message;
        console.error('School schema points error:', e);
      }
    }

    // ---- SCHEDULE (only for Teachers) ----
    let scheduleError = null;
    if (staffType === 'Teachers' && formData.name) {
      try {
        const isPart = formData.staff_work_time === 'Part Time';
        console.log(`Processing schedule for ${formData.name}, isPartTime: ${isPart}`);
        
        const sched = isPart
          ? extractPartTimeSchedule(formData)
          : {
              work_days: [1, 2, 3, 4, 5], // Use integers instead of strings for full-time
              preferred_shifts: ['morning', 'afternoon'],
              availability: [],
              max_hours_per_day: 8,
              max_hours_per_week: 40,
            };
        
        console.log('Schedule data to be inserted:', sched);
        
        await addTeacherToScheduleSystem(
          client,
          globalStaffId,
          formData.name,
          sched,
          isPart ? 'part_time' : 'full_time'
        );
      } catch (e) {
        scheduleError = e.message;
        console.error('Schedule system error:', e);
      }
    }

    await updateStaffIds(schema, className);
    await client.query('COMMIT');

    res.json({
      message: 'Staff added successfully',
      userCredentials,
      schoolSchemaError,
      scheduleError,
      teacherData: formData.role === 'Teacher' ? {
        name: formData.name,
        workTime: formData.staff_work_time,
        globalStaffId: globalStaffId
      } : null
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Add staff failed:', e);
    res.status(500).json({ error: 'Add staff failed', details: e.message });
  } finally {
    client.release();
  }
});

// 7.8 EXCEL / BULK UPLOAD
router.post('/upload-excel', async (req, res) => {
  const client = await pool.connect();
  try {
    const { staffType, className: rawClass, data } = req.body;
    if (!Array.isArray(data) || data.length === 0)
      return res.status(400).json({ error: 'Invalid data' });

    const className = sanitizeClassName(rawClass);
    const schema = sanitizeStaffTypeToSchema(staffType);

    // ---- column info ----
    const colInfo = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2`,
      [schema, className]
    );
    const required = colInfo.rows
      .filter(
        (c) =>
          c.is_nullable === 'NO' &&
          !['id', 'global_staff_id', 'staff_id'].includes(c.column_name)
      )
      .map((c) => c.column_name);
    const allCols = colInfo.rows
      .filter((c) => !['id', 'global_staff_id', 'staff_id'].includes(c.column_name))
      .map((c) => c.column_name);

    // ---- validation ----
    const invalid = new Set();
    const missing = new Set();
    for (const row of data) {
      const keys = Object.keys(row).filter(
        (k) => !['id', 'global_staff_id', 'staff_id'].includes(k)
      );
      keys.forEach((k) => !allCols.includes(k) && invalid.add(k));
      required.forEach((r) => {
        if (
          row[r] === undefined ||
          row[r] === null ||
          row[r] === ''
        )
          missing.add(r);
      });
    }
    if (invalid.size)
      return res
        .status(400)
        .json({ error: `Invalid columns: ${[...invalid].join(', ')}` });
    if (missing.size)
      return res
        .status(400)
        .json({ error: `Missing required: ${[...missing].join(', ')}` });

    await client.query('BEGIN');
    const maxStaff = await client.query(
      `SELECT COALESCE(MAX(staff_id),0) AS m FROM "${schema}"."${className}"`
    );
    let curStaffId = maxStaff.rows[0].m;

    const createdUsers = [];
    const schoolSchemaErrors = [];
    const teacherData = [];

    for (const row of data) {
      curStaffId++;
      const globalStaffId = await getNextGlobalStaffId();

      const insertObj = {};
      for (const c of allCols) {
        if (row.hasOwnProperty(c)) {
          const type = colInfo.rows.find((ci) => ci.column_name === c).data_type;
          insertObj[c] =
            type === 'boolean'
              ? row[c] === true || row[c] === 'true'
              : row[c];
        }
      }

      // Format work time consistently
      if (insertObj.staff_work_time) {
        insertObj.staff_work_time = insertObj.staff_work_time === 'Part time' ? 'Part Time' :
                                   insertObj.staff_work_time === 'Full time' ? 'Full Time' :
                                   insertObj.staff_work_time;
      } else {
        insertObj.staff_work_time = 'Full Time';
      }

      const cols = ['global_staff_id', 'staff_id', ...Object.keys(insertObj)];
      const vals = [
        globalStaffId,
        curStaffId,
        ...Object.values(insertObj),
      ];
      const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(
        `INSERT INTO "${schema}"."${className}" (${cols.join(
          ', '
        )}) VALUES (${ph})`,
        vals
      );

      // Track teacher data for response
      if (row.role === 'Teacher' && row.name) {
        teacherData.push({
          name: row.name,
          workTime: insertObj.staff_work_time,
          globalStaffId: globalStaffId
        });
      }

      // user + schedule + school schema points
      if (row.name) {
        try {
          const creds = await createStaffUser(
            globalStaffId,
            row.name,
            staffType,
            className
          );
          if (creds) createdUsers.push({ name: row.name, ...creds });

          // Add to school_schema_points.teachers if role is Teacher
          if (row.role === 'Teacher') {
            try {
              await addTeacherToSchoolSchemaPoints(
                client,
                globalStaffId,
                row.name,
                insertObj.staff_work_time || 'Full Time',
                row.role,
                row.staff_enrollment_type || 'Permanent'
              );
            } catch (e) {
              schoolSchemaErrors.push({ name: row.name, error: e.message });
            }
          }

          if (row.role === 'Teacher') {
            const isPart = insertObj.staff_work_time === 'Part Time';
            const sched = isPart
              ? extractPartTimeSchedule(row)
              : {
                  work_days: [1, 2, 3, 4, 5], // Use integers instead of strings for full-time
                  preferred_shifts: ['morning', 'afternoon'],
                  availability: [],
                  max_hours_per_day: 8,
                  max_hours_per_week: 40,
                };
            await addTeacherToScheduleSystem(
              client,
              globalStaffId,
              row.name,
              sched,
              isPart ? 'part_time' : 'full_time'
            );
          }
        } catch (e) {
          console.error('User/Schedule bulk error:', e);
        }
      }
    }

    await updateStaffIds(schema, className);
    await client.query('COMMIT');
    res.json({ 
      message: 'Bulk upload successful', 
      createdUsers,
      teacherData,
      schoolSchemaErrors: schoolSchemaErrors.length > 0 ? schoolSchemaErrors : undefined
    });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Bulk upload failed', details: e.message });
  } finally {
    client.release();
  }
});

// 7.9 LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username & password required' });

  try {
    const user = await verifyCredentials(username, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const profile = await getStaffProfile(
      user.globalStaffId,
      user.staffType,
      user.className
    );
    if (!profile)
      return res.status(404).json({ error: 'Profile not found' });

    const role =
      user.staffType === 'Teachers'
        ? 'teacher'
        : 'staff';

    // Generate JWT token with proper secret
    const token = jwt.sign(
      { 
        id: user.globalStaffId, 
        role, 
        username: user.username,
        staffType: user.staffType,
        className: user.className
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.globalStaffId,
        username: user.username,
        role,
        staffType: user.staffType,
        className: user.className,
      },
      profile,
    });
  } catch (e) {
    res.status(500).json({ error: 'Login failed', details: e.message });
  }
});

// 7.10 PROFILE BY USERNAME (protected route)
router.get('/profile/:username', authenticateToken, async (req, res) => {
  const { username } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT global_staff_id, staff_type, class_name
       FROM staff_users WHERE username = $1`,
      [username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const profile = await getStaffProfile(
      rows[0].global_staff_id,
      rows[0].staff_type,
      rows[0].class_name
    );

    res.json({
      user: {
        username,
        staffType: rows[0].staff_type,
        className: rows[0].class_name,
      },
      profile,
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: 'Profile fetch failed', details: e.message });
  }
});

// 7.11 FETCH ALL STAFF DATA FOR A CLASS (includes credentials from staff_users table)
router.get('/data/:staffType/:className', async (req, res) => {
  const { staffType, className: raw } = req.params;
  const className = sanitizeClassName(raw);
  const schema = sanitizeStaffTypeToSchema(staffType);

  try {
    // Join with staff_users to get username and plain password for admin viewing
    const { rows } = await pool.query(
      `SELECT s.*, u.username, u.password_plain as password
       FROM "${schema}"."${className}" s
       LEFT JOIN staff_users u ON s.global_staff_id = u.global_staff_id
       ORDER BY LOWER(s.name) ASC`
    );
    res.json({ data: rows });
  } catch (e) {
    res
      .status(500)
      .json({ error: 'Data fetch failed', details: e.message });
  }
});

// 7.12 GET TEACHER WORK TIMES
router.get('/teacher-work-times', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT teacher_name, staff_work_time 
      FROM school_schema_points.teachers 
      WHERE role = 'Teacher'
      ORDER BY teacher_name
    `);
    
    const workTimeMap = {};
    rows.forEach(row => {
      workTimeMap[row.teacher_name] = row.staff_work_time;
    });
    
    res.json(workTimeMap);
  } catch (e) {
    console.error('Error fetching teacher work times:', e);
    res.status(500).json({ error: 'Failed to fetch teacher work times', details: e.message });
  }
});

// 7.13 DELETE staff member
router.delete('/delete-staff', async (req, res) => {
  const { globalStaffId, staffType, className: raw } = req.body;
  
  if (!globalStaffId || !staffType || !raw) {
    return res.status(400).json({ error: 'Missing required fields: globalStaffId, staffType, className' });
  }

  const className = sanitizeClassName(raw);
  const schema = sanitizeStaffTypeToSchema(staffType);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get staff details before deletion for cleanup
    const staffResult = await client.query(
      `SELECT * FROM "${schema}"."${className}" WHERE global_staff_id = $1`,
      [globalStaffId]
    );

    if (staffResult.rows.length === 0) {
      throw new Error('Staff member not found');
    }

    const staff = staffResult.rows[0];

    // Delete from main staff table
    await client.query(
      `DELETE FROM "${schema}"."${className}" WHERE global_staff_id = $1`,
      [globalStaffId]
    );

    // Delete from staff_users table
    await client.query(
      'DELETE FROM staff_users WHERE global_staff_id = $1',
      [globalStaffId]
    );

    // Delete from school_schema_points.teachers if exists
    await client.query(
      'DELETE FROM school_schema_points.teachers WHERE global_staff_id = $1',
      [globalStaffId]
    );

    // Delete from schedule_schema.teachers if exists
    await client.query(
      'DELETE FROM schedule_schema.teachers WHERE global_staff_id = $1',
      [globalStaffId]
    );

    // Delete from teacher_availability if exists
    await client.query(
      `DELETE FROM schedule_schema.teacher_availability 
       WHERE teacher_id IN (
         SELECT id FROM schedule_schema.teachers WHERE global_staff_id = $1
       )`,
      [globalStaffId]
    );

    // Clean up uploaded files
    if (staff.image_staff) {
      try {
        await fs.unlink(path.join(uploadDir, staff.image_staff));
      } catch (fileError) {
        console.warn('Could not delete staff image:', fileError.message);
      }
    }

    await client.query('COMMIT');
    
    res.json({ 
      message: 'Staff member deleted successfully',
      deletedStaff: {
        name: staff.name,
        globalStaffId: staff.global_staff_id
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff member', details: error.message });
  } finally {
    client.release();
  }
});

// 7.14 UPDATE staff member
router.put('/update-staff', upload, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { globalStaffId, staffType, className: raw, updates: updatesStr } = req.body;
    
    if (!globalStaffId || !staffType || !raw || !updatesStr) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const className = sanitizeClassName(raw);
    const schema = sanitizeStaffTypeToSchema(staffType);
    const updates = JSON.parse(updatesStr);

    // Handle file uploads
    const files = req.files || [];
    const updateData = { ...updates };

    // Process image upload
    const imageStaffFile = files.find(f => f.fieldname === 'image_staff');
    if (imageStaffFile) {
      const oldStaff = await client.query(
        `SELECT image_staff FROM "${schema}"."${className}" WHERE global_staff_id = $1`,
        [globalStaffId]
      );

      // Delete old image if exists
      if (oldStaff.rows[0]?.image_staff) {
        try {
          await fs.unlink(path.join(uploadDir, oldStaff.rows[0].image_staff));
        } catch (fileError) {
          console.warn('Could not delete old image:', fileError.message);
        }
      }

      updateData.image_staff = imageStaffFile.filename;
    }

    // Build dynamic update query
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        setClauses.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(globalStaffId);

    const updateQuery = `
      UPDATE "${schema}"."${className}" 
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE global_staff_id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      throw new Error('Staff member not found');
    }

    const updatedStaff = result.rows[0];

    // Update related tables if needed
    if (updates.name || updates.role || updates.staff_work_time) {
      // Update school_schema_points.teachers
      await client.query(`
        UPDATE school_schema_points.teachers 
        SET teacher_name = $1, role = $2, staff_work_time = $3, updated_at = CURRENT_TIMESTAMP
        WHERE global_staff_id = $4
      `, [
        updates.name || updatedStaff.name,
        updates.role || updatedStaff.role,
        updates.staff_work_time || updatedStaff.staff_work_time,
        globalStaffId
      ]);

      // Update schedule_schema.teachers
      await client.query(`
        UPDATE schedule_schema.teachers 
        SET teacher_name = $1, teacher_type = $2, updated_at = CURRENT_TIMESTAMP
        WHERE global_staff_id = $3
      `, [
        updates.name || updatedStaff.name,
        (updates.staff_work_time || updatedStaff.staff_work_time) === 'Part Time' ? 'part_time' : 'full_time',
        globalStaffId
      ]);
    }

    await client.query('COMMIT');
    
    res.json({ 
      message: 'Staff member updated successfully',
      updatedStaff: updatedStaff
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff member', details: error.message });
  } finally {
    client.release();
  }
});

// 7.15 GET staff member by ID
router.get('/staff/:globalStaffId', async (req, res) => {
  const { globalStaffId } = req.params;
  
  if (!globalStaffId) {
    return res.status(400).json({ error: 'Global staff ID is required' });
  }

  try {
    // Search across all staff tables
    const staffTypes = ['Supportive Staff', 'Administrative Staff', 'Teachers'];
    let staffMember = null;

    for (const staffType of staffTypes) {
      const schema = sanitizeStaffTypeToSchema(staffType);
      
      // Get all classes for this staff type
      const classesResult = await pool.query(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = $1`,
        [schema]
      );

      for (const row of classesResult.rows) {
        const className = row.table_name;
        const result = await pool.query(
          `SELECT * FROM "${schema}"."${className}" WHERE global_staff_id = $1`,
          [globalStaffId]
        );

        if (result.rows.length > 0) {
          staffMember = {
            ...result.rows[0],
            staffType,
            className
          };
          break;
        }
      }
      
      if (staffMember) break;
    }

    if (!staffMember) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json({ staff: staffMember });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff member', details: error.message });
  }
});

// 7.16 UPDATE TEACHER WORK TIME
router.put('/teacher-work-time', async (req, res) => {
  const { teacherName, workTime } = req.body;
  
  if (!teacherName || !workTime) {
    return res.status(400).json({ error: 'Teacher name and work time are required' });
  }

  // Validate work time
  const formattedWorkTime = workTime === 'Part time' ? 'Part Time' : 
                          workTime === 'Full time' ? 'Full Time' :
                          workTime;
  
  if (!['Full Time', 'Part Time'].includes(formattedWorkTime)) {
    return res.status(400).json({ error: 'Work time must be either "Full Time" or "Part Time"' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update in school_schema_points.teachers
    await client.query(`
      UPDATE school_schema_points.teachers 
      SET staff_work_time = $1, updated_at = CURRENT_TIMESTAMP
      WHERE teacher_name = $2
    `, [formattedWorkTime, teacherName]);

    // Update in schedule_schema.teachers
    await client.query(`
      UPDATE schedule_schema.teachers 
      SET teacher_type = $1, updated_at = CURRENT_TIMESTAMP
      WHERE teacher_name = $2
    `, [formattedWorkTime === 'Part Time' ? 'part_time' : 'full_time', teacherName]);

    await client.query('COMMIT');
    res.json({ 
      message: `Teacher work time updated successfully to ${formattedWorkTime}`,
      teacherName,
      workTime: formattedWorkTime
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error updating teacher work time:', e);
    res.status(500).json({ error: 'Failed to update teacher work time', details: e.message });
  } finally {
    client.release();
  }
});

// 7.17 MIGRATE SCHEDULE SCHEMA
router.post('/migrate-schedule-schema', async (req, res) => {
  try {
    await initializeScheduleSchema();
    res.json({ message: 'Schedule schema migration completed' });
  } catch (e) {
    res.status(500).json({ error: 'Migration failed', details: e.message });
  }
});

// 7.18 GET STAFF PROFILE BY ID (authenticated)
router.get('/profile-by-id/:globalStaffId', authenticateToken, async (req, res) => {
  try {
    const { globalStaffId } = req.params;
    const { staffType, className } = req.query;
    
    if (!staffType || !className) {
      return res.status(400).json({ error: 'staffType and className are required' });
    }
    
    const profile = await getStaffProfile(parseInt(globalStaffId), staffType, className);
    
    if (!profile) {
      return res.status(404).json({ error: 'Staff profile not found' });
    }
    
    res.json(profile);
  } catch (e) {
    console.error('Get profile error:', e);
    res.status(500).json({ error: 'Failed to get profile', details: e.message });
  }
});

module.exports = router;