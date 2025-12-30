const express = require('express');
const pool = require('../config/db');
const router = express.Router();
require('dotenv').config();

// Security middleware
const { authenticateToken } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/inputValidation');

// Apply input sanitization
router.use(sanitizeInputs);

// All chat routes require authentication
router.use(authenticateToken);

// Helper to get io instance
const getIo = (req) => req.app.get('socketio');

// Drop and recreate tables to fix the schema
const initializeChatTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS chat_schema;');

    // Drop existing tables in correct order
    await client.query('DROP TABLE IF EXISTS chat_schema.chat_logs CASCADE;');
    await client.query('DROP TABLE IF EXISTS chat_schema.requests CASCADE;');
    await client.query('DROP TABLE IF EXISTS chat_schema.users CASCADE;');

    // Users table - with string IDs for all users
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_schema.users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        username VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert sample users
    await client.query(`
      INSERT INTO chat_schema.users (id, name, role, username) 
      VALUES 
        ('1', 'Admin Director', 'director', 'director'),
        ('2', 'Math Teacher', 'teacher', 'teacher_math'),
        ('3', 'Science Teacher', 'teacher', 'teacher_science'),
        ('4', 'English Teacher', 'teacher', 'teacher_english')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Requests table - both sender and recipient as VARCHAR
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_schema.requests (
        id SERIAL PRIMARY KEY,
        sender_id VARCHAR(100) NOT NULL,
        recipient_id VARCHAR(100) NOT NULL,
        questions JSONB NOT NULL,
        responses JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'pending',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Chat logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_schema.chat_logs (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES chat_schema.requests(id),
        action VARCHAR(50),
        actor_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_requests_sender ON chat_schema.requests(sender_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_requests_recipient ON chat_schema.requests(recipient_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_requests_status ON chat_schema.requests(status);');

    console.log('Chat schema and tables recreated successfully.');
  } catch (error) {
    console.error('Error initializing chat tables:', error);
  } finally {
    client.release();
  }
};

// Call initialize on startup
initializeChatTables().catch(console.error);

// POST a new request (no authentication)
router.post('/requests', async (req, res) => {
  const { recipientId, questions, senderId = '1' } = req.body; // Default senderId to director ('1')

  console.log('Received request:', { recipientId, questions, senderId });

  if (!recipientId || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Recipient and at least one question are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure sender exists in users table
    const senderExists = await client.query(
      'SELECT id FROM chat_schema.users WHERE id = $1',
      [senderId]
    );

    if (senderExists.rows.length === 0) {
      // Create a temporary user for the sender if it doesn't exist
      await client.query(
        'INSERT INTO chat_schema.users (id, name, role) VALUES ($1, $2, $3)',
        [senderId, `User ${senderId}`, 'unknown']
      );
    }

    // Ensure recipient exists in users table
    const recipientExists = await client.query(
      'SELECT id FROM chat_schema.users WHERE id = $1',
      [recipientId]
    );

    if (recipientExists.rows.length === 0) {
      // Create a user for the recipient if it doesn't exist
      if (recipientId.startsWith('guardian_')) {
        const guardianName = recipientId.replace(/^guardian_/, '').replace(/_/g, ' ');
        await client.query(
          'INSERT INTO chat_schema.users (id, name, role) VALUES ($1, $2, $3)',
          [recipientId, guardianName, 'guardian']
        );
      } else if (recipientId.startsWith('staff_')) {
        // Create a staff user if it doesn't exist
        const staffName = recipientId.replace(/^staff_/, '').replace(/_/g, ' ');
        await client.query(
          'INSERT INTO chat_schema.users (id, name, role) VALUES ($1, $2, $3)',
          [recipientId, `Staff ${staffName}`, 'teacher']
        );
      }
    }
    
    console.log('Message will be sent from:', senderId, 'to:', recipientId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newRequest = await client.query(
      'INSERT INTO chat_schema.requests (sender_id, recipient_id, questions, status, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [senderId, recipientId, JSON.stringify(questions), 'pending', expiresAt]
    ).then(res => res.rows[0]);

    // Get sender info for the socket event
    const sender = await client.query(
      'SELECT name, role FROM chat_schema.users WHERE id = $1',
      [senderId]
    ).then(res => res.rows[0]);

    const requestWithDetails = {
      ...newRequest,
      senderName: sender?.name,
      senderRole: sender?.role
    };

    // Audit log
    await client.query(
      'INSERT INTO chat_schema.chat_logs (request_id, action, actor_id) VALUES ($1, $2, $3)',
      [newRequest.id, 'request_sent', senderId]
    );

    // Emit to recipient
    console.log('Emitting new_request to room:', recipientId);
    getIo(req).to(recipientId).emit('new_request', requestWithDetails);

    await client.query('COMMIT');
    
    console.log('Request created:', newRequest.id, 'from:', senderId, 'to:', recipientId);
    console.log('Message details - sender:', senderId, 'recipient:', recipientId, 'questions:', questions);
    res.status(201).json(newRequest);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending request:', error);
    res.status(500).json({ error: 'Failed to send request.', details: error.message });
  } finally {
    client.release();
  }
});

// GET all requests/chats (no authentication)
router.get('/', async (req, res) => {
  try {
    const requests = await pool.query(
      `SELECT r.*, s.name as sender_name, s.role as sender_role
       FROM chat_schema.requests r
       LEFT JOIN chat_schema.users s ON r.sender_id = s.id
       ORDER BY r.created_at DESC`
    );
    
    res.json(requests.rows);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// GET contacts (no authentication)
router.get('/contacts', async (req, res) => {
  try {
    let allTeachers = [];
    let allGuardians = [];

    // Get teachers from school_schema_points.teachers (real teachers in the system)
    try {
      const teachersResult = await pool.query(
        `SELECT global_staff_id, teacher_name, role 
         FROM school_schema_points.teachers 
         WHERE teacher_name IS NOT NULL AND teacher_name != ''`
      );
      
      teachersResult.rows.forEach(row => {
        // Use staff_ prefix consistently for all staff members
        const staffId = `staff_${row.global_staff_id}`;
        allTeachers.push({
          id: staffId,
          name: row.teacher_name,
          role: row.role?.toLowerCase() === 'director' ? 'director' : 'teacher',
          unreadCount: 0
        });

        // Auto-create user for this teacher in the background
        (async () => {
          const client = await pool.connect();
          try {
            const exists = await client.query(
              'SELECT id FROM chat_schema.users WHERE id = $1',
              [staffId]
            );
            
            if (exists.rows.length === 0) {
              await client.query(
                'INSERT INTO chat_schema.users (id, name, role) VALUES ($1, $2, $3)',
                [staffId, row.teacher_name, row.role?.toLowerCase() === 'director' ? 'director' : 'teacher']
              );
            }
          } finally {
            client.release();
          }
        })().catch(console.error);
      });
    } catch (teacherError) {
      console.warn('Could not fetch teachers from school_schema_points:', teacherError.message);
      
      // Fallback to chat_schema.users if school_schema_points doesn't exist
      const staffUsers = await pool.query(
        'SELECT id, name, role, username FROM chat_schema.users WHERE role IN ($1, $2)',
        ['teacher', 'director']
      );
      
      staffUsers.rows.forEach(user => {
        allTeachers.push({
          id: user.id.toString(),
          name: user.name,
          role: user.role,
          username: user.username,
          unreadCount: 0
        });
      });
    }

    // Also get staff from staff type schemas (Teachers, Administrative Staff, etc.)
    try {
      const staffSchemas = ['staff_teachers', 'staff_administrative_staff', 'staff_supportive_staff'];
      
      for (const schema of staffSchemas) {
        try {
          // Get all tables in this schema
          const tablesResult = await pool.query(
            `SELECT table_name FROM information_schema.tables 
             WHERE table_schema = $1 AND table_name != 'staff_counter'`,
            [schema]
          );
          
          for (const tableRow of tablesResult.rows) {
            const tableName = tableRow.table_name;
            try {
              const staffResult = await pool.query(
                `SELECT global_staff_id, name, role 
                 FROM "${schema}"."${tableName}" 
                 WHERE name IS NOT NULL AND name != ''`
              );
              
              staffResult.rows.forEach(row => {
                const staffId = `staff_${row.global_staff_id}`;
                // Check if already added
                if (!allTeachers.find(t => t.id === staffId)) {
                  const isDirector = row.role?.toLowerCase() === 'director';
                  allTeachers.push({
                    id: staffId,
                    name: row.name,
                    role: isDirector ? 'director' : 'teacher',
                    unreadCount: 0
                  });

                  // Auto-create user
                  (async () => {
                    const client = await pool.connect();
                    try {
                      const exists = await client.query(
                        'SELECT id FROM chat_schema.users WHERE id = $1',
                        [staffId]
                      );
                      
                      if (exists.rows.length === 0) {
                        await client.query(
                          'INSERT INTO chat_schema.users (id, name, role) VALUES ($1, $2, $3)',
                          [staffId, row.name, isDirector ? 'director' : 'teacher']
                        );
                      }
                    } finally {
                      client.release();
                    }
                  })().catch(console.error);
                }
              });
            } catch (tableError) {
              console.warn(`Could not access table ${schema}.${tableName}:`, tableError.message);
            }
          }
        } catch (schemaError) {
          console.warn(`Could not access schema ${schema}:`, schemaError.message);
        }
      }
    } catch (staffError) {
      console.warn('Could not fetch staff from schemas:', staffError.message);
    }

    // Get guardians from classes_schema with their students
    const tablesResult = await pool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
      ['classes_schema']
    );
    
    const tables = tablesResult.rows.map(row => row.table_name);

    // Use a Map to track guardians and their students
    const guardianMap = new Map();
    
    for (const table of tables) {
      try {
        const guardiansResult = await pool.query(
          `SELECT student_name, guardian_name as name, guardian_username as username, guardian_phone as phone 
           FROM classes_schema."${table}" 
           WHERE guardian_name IS NOT NULL AND guardian_name != ''`
        );
        
        guardiansResult.rows.forEach(row => {
          // Normalize the guardian name for comparison (lowercase, trimmed)
          const normalizedName = row.name.toLowerCase().trim();
          const guardianId = row.username ? `guardian_${row.username}` : `guardian_${row.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
          
          if (guardianMap.has(normalizedName)) {
            // Add student to existing guardian
            const guardian = guardianMap.get(normalizedName);
            if (row.student_name && !guardian.students.some(s => s.name === row.student_name && s.class === table)) {
              guardian.students.push({ name: row.student_name, class: table });
            }
          } else {
            // Create new guardian entry with students array
            guardianMap.set(normalizedName, {
              id: guardianId,
              name: row.name,
              role: 'guardian',
              phone: row.phone || '',
              students: row.student_name ? [{ name: row.student_name, class: table }] : [],
              unreadCount: 0
            });

            // Auto-create user for this guardian in the background
            (async () => {
              const client = await pool.connect();
              try {
                const exists = await client.query(
                  'SELECT id FROM chat_schema.users WHERE id = $1',
                  [guardianId]
                );
                
                if (exists.rows.length === 0) {
                  await client.query(
                    'INSERT INTO chat_schema.users (id, name, role) VALUES ($1, $2, $3)',
                    [guardianId, row.name, 'guardian']
                  );
                }
              } finally {
                client.release();
              }
            })().catch(console.error);
          }
        });
      } catch (tableError) {
        console.warn(`Could not access table ${table}:`, tableError.message);
      }
    }
    
    // Convert guardian map to array
    allGuardians = Array.from(guardianMap.values());

    // Remove duplicates from teachers
    const uniqueTeachers = allTeachers.filter((teacher, index, self) => 
      index === self.findIndex(t => t.id === teacher.id)
    );

    // Remove duplicates from guardians
    const uniqueGuardians = allGuardians.filter((guardian, index, self) => 
      index === self.findIndex(g => g.id === guardian.id)
    );

    // Always include the default admin/director with staff_ prefix
    const hasDirector = uniqueTeachers.some(t => t.role === 'director');
    if (!hasDirector) {
      uniqueTeachers.unshift({
        id: 'staff_admin',
        name: 'Admin Director',
        role: 'director',
        unreadCount: 0
      });
    }

    const allContacts = [...uniqueTeachers, ...uniqueGuardians];
    // Sort: teachers first, then directors, then guardians, then by name
    allContacts.sort((a, b) => {
      // Teachers first
      if (a.role === 'teacher' && b.role !== 'teacher') return -1;
      if (a.role !== 'teacher' && b.role === 'teacher') return 1;
      // Then directors
      if (a.role === 'director' && b.role === 'guardian') return -1;
      if (a.role === 'guardian' && b.role === 'director') return 1;
      // Then by name
      return a.name.localeCompare(b.name);
    });

    res.json(allContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts.', details: error.message });
  }
});

// GET requests for a specific user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const requests = await pool.query(
      `SELECT r.*, s.name as sender_name, s.role as sender_role
       FROM chat_schema.requests r
       LEFT JOIN chat_schema.users s ON r.sender_id = s.id
       WHERE r.recipient_id = $1 OR r.sender_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    
    res.json(requests.rows);
  } catch (error) {
    console.error('Error fetching user chats:', error);
    res.status(500).json({ error: 'Failed to fetch user chats' });
  }
});

// POST a response to a request (no authentication) - FIXED VERSION
router.post('/requests/:id/respond', async (req, res) => {
  const { id } = req.params;
  const { responses } = req.body;

  console.log('Received response for request:', id, 'Responses:', responses);

  if (!Array.isArray(responses) || responses.length === 0) {
    return res.status(400).json({ error: 'Responses array is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const request = await client.query(
      'SELECT * FROM chat_schema.requests WHERE id = $1',
      [id]
    ).then(res => res.rows[0]);

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is no longer pending.' });
    }

    // Parse questions safely
    let questions;
    try {
      questions = typeof request.questions === 'string' 
        ? JSON.parse(request.questions) 
        : request.questions;
    } catch (parseError) {
      console.error('Error parsing questions:', parseError);
      return res.status(500).json({ error: 'Invalid questions format in request.' });
    }

    if (!Array.isArray(questions)) {
      return res.status(500).json({ error: 'Questions are not in valid format.' });
    }

    if (responses.length !== questions.length) {
      return res.status(400).json({ error: `Must respond to all ${questions.length} questions.` });
    }

    const now = new Date();
    const formattedResponses = responses.map((r, index) => ({
      questionIndex: index,
      question: questions[index],
      answer: typeof r === 'object' ? (r.answer || r.response || '') : (r || ''),
      timestamp: now.toISOString(),
    }));

    console.log('Formatted responses:', formattedResponses);

    const updatedRequest = await client.query(
      'UPDATE chat_schema.requests SET responses = $1, status = $2 WHERE id = $3 RETURNING *',
      [JSON.stringify(formattedResponses), 'responded', id]
    ).then(res => res.rows[0]);

    await client.query(
      'INSERT INTO chat_schema.chat_logs (request_id, action, actor_id) VALUES ($1, $2, $3)',
      [id, 'response_added', request.recipient_id]
    );

    // Emit to original sender
    getIo(req).to(request.sender_id).emit('new_response', updatedRequest);

    await client.query('COMMIT');
    
    console.log('Response added successfully for request:', id);
    res.json(updatedRequest);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding response:', error);
    res.status(500).json({ error: 'Failed to add response.', details: error.message });
  } finally {
    client.release();
  }
});

// GET specific request by ID (no authentication)
router.get('/requests/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const request = await pool.query(
      `SELECT r.*, s.name as sender_name, s.role as sender_role
       FROM chat_schema.requests r
       LEFT JOIN chat_schema.users s ON r.sender_id = s.id
       WHERE r.id = $1`,
      [id]
    ).then(res => res.rows[0]);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// GET filtered contacts for a teacher - only guardians from classes they teach
// Includes student names and classes for each guardian
router.get('/contacts/teacher/:staffId', async (req, res) => {
  const { staffId } = req.params;
  
  try {
    const guardianMap = new Map(); // guardianId -> guardian data with students array
    
    // Get classes assigned to this teacher (as class teacher)
    const classTeacherResult = await pool.query(`
      SELECT assigned_class FROM school_schema_points.class_teachers 
      WHERE global_staff_id = $1 AND is_active = true
    `, [staffId]);
    
    const assignedClasses = classTeacherResult.rows.map(r => r.assigned_class);
    
    // Also get classes from schedule (subjects taught)
    try {
      const scheduleResult = await pool.query(`
        SELECT DISTINCT class_name FROM schedule_schema.schedule 
        WHERE teacher_name = (
          SELECT teacher_name FROM school_schema_points.teachers 
          WHERE global_staff_id = $1
        )
      `, [staffId]);
      
      scheduleResult.rows.forEach(r => {
        if (r.class_name && !assignedClasses.includes(r.class_name)) {
          assignedClasses.push(r.class_name);
        }
      });
    } catch (scheduleError) {
      console.warn('Could not fetch schedule classes:', scheduleError.message);
    }
    
    // If no classes assigned, return empty list
    if (assignedClasses.length === 0) {
      return res.json([]);
    }
    
    // Get guardians and their students from each assigned class
    for (const className of assignedClasses) {
      try {
        const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
        if (!validTableName) continue;
        
        const studentsResult = await pool.query(`
          SELECT student_name, guardian_name as name, guardian_username as username, guardian_phone as phone 
          FROM classes_schema."${className}" 
          WHERE guardian_name IS NOT NULL AND guardian_name != ''
        `);
        
        studentsResult.rows.forEach(row => {
          const guardianId = row.username 
            ? `guardian_${row.username}` 
            : `guardian_${row.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
          
          if (guardianMap.has(guardianId)) {
            // Add student to existing guardian
            const guardian = guardianMap.get(guardianId);
            guardian.students.push({
              name: row.student_name,
              class: className
            });
          } else {
            // Create new guardian entry
            guardianMap.set(guardianId, {
              id: guardianId,
              name: row.name,
              role: 'guardian',
              phone: row.phone || '',
              students: [{
                name: row.student_name,
                class: className
              }],
              unreadCount: 0
            });
          }
        });
      } catch (tableError) {
        console.warn(`Could not access class table ${className}:`, tableError.message);
      }
    }
    
    // Convert map to array and sort by name
    const guardians = Array.from(guardianMap.values());
    guardians.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json(guardians);
  } catch (error) {
    console.error('Error fetching teacher contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts', details: error.message });
  }
});

// GET all contacts for admin/director - all guardians
router.get('/contacts/admin', async (req, res) => {
  try {
    const guardians = [];
    const seenGuardianIds = new Set();
    
    // Get all class tables
    const tablesResult = await pool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
      ['classes_schema']
    );
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    // Get guardians from all classes
    for (const table of tables) {
      try {
        const validTableName = /^[a-zA-Z0-9_]+$/.test(table);
        if (!validTableName) continue;
        
        const guardiansResult = await pool.query(`
          SELECT guardian_name as name, guardian_username as username, guardian_phone as phone 
          FROM classes_schema."${table}" 
          WHERE guardian_name IS NOT NULL AND guardian_name != ''
        `);
        
        guardiansResult.rows.forEach(row => {
          const guardianId = row.username 
            ? `guardian_${row.username}` 
            : `guardian_${row.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
          
          if (!seenGuardianIds.has(guardianId)) {
            seenGuardianIds.add(guardianId);
            guardians.push({
              id: guardianId,
              name: row.name,
              role: 'guardian',
              phone: row.phone || '',
              wardClass: table,
              unreadCount: 0
            });
          }
        });
      } catch (tableError) {
        console.warn(`Could not access class table ${table}:`, tableError.message);
      }
    }
    
    guardians.sort((a, b) => a.name.localeCompare(b.name));
    res.json(guardians);
  } catch (error) {
    console.error('Error fetching admin contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts', details: error.message });
  }
});

// GET filtered contacts for a guardian - only teachers of their wards + directors
// Includes subjects taught for each teacher
router.get('/contacts/guardian/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const teacherMap = new Map(); // teacherId -> teacher data with subjects array
    const wardClasses = new Set(); // Use Set to avoid duplicates
    
    // Get all class tables to find wards
    const tablesResult = await pool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
      ['classes_schema']
    );
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    // Find wards' classes by guardian username - search multiple ways
    for (const table of tables) {
      try {
        const validTableName = /^[a-zA-Z0-9_]+$/.test(table);
        if (!validTableName) continue;
        
        // Search by guardian_username (exact match and variations)
        const wardsResult = await pool.query(`
          SELECT student_name, class FROM classes_schema."${table}" 
          WHERE guardian_username = $1 
             OR guardian_username = $2
             OR LOWER(guardian_username) = LOWER($1)
             OR guardian_name ILIKE $3
        `, [username, username.replace(/_/g, ' '), `%${username.replace(/_/g, ' ')}%`]);
        
        if (wardsResult.rows.length > 0) {
          wardClasses.add(table);
        }
      } catch (tableError) {
        console.warn(`Could not access class table ${table}:`, tableError.message);
      }
    }
    
    // Convert Set to Array
    const wardClassesArray = Array.from(wardClasses);
    
    // Get teachers for each ward's class
    for (const className of wardClassesArray) {
      try {
        // Get class teacher
        const classTeacherResult = await pool.query(`
          SELECT ct.global_staff_id, ct.teacher_name 
          FROM school_schema_points.class_teachers ct
          WHERE ct.assigned_class = $1 AND ct.is_active = true
        `, [className]);
        
        classTeacherResult.rows.forEach(row => {
          const teacherId = `staff_${row.global_staff_id}`;
          if (teacherMap.has(teacherId)) {
            const teacher = teacherMap.get(teacherId);
            if (!teacher.subjects.includes('Class Teacher')) {
              teacher.subjects.push('Class Teacher');
            }
            if (!teacher.classes.includes(className)) {
              teacher.classes.push(className);
            }
          } else {
            teacherMap.set(teacherId, {
              id: teacherId,
              name: row.teacher_name,
              role: 'teacher',
              subjects: ['Class Teacher'],
              classes: [className],
              isClassTeacher: true,
              unreadCount: 0
            });
          }
        });
        
        // Get subject teachers from schedule with their subjects
        try {
          const scheduleResult = await pool.query(`
            SELECT DISTINCT s.teacher_name, s.subject_name, t.global_staff_id
            FROM schedule_schema.schedule s
            LEFT JOIN school_schema_points.teachers t ON s.teacher_name = t.teacher_name
            WHERE s.class_name = $1 AND t.global_staff_id IS NOT NULL
          `, [className]);
          
          scheduleResult.rows.forEach(row => {
            const teacherId = `staff_${row.global_staff_id}`;
            if (teacherMap.has(teacherId)) {
              const teacher = teacherMap.get(teacherId);
              if (row.subject_name && !teacher.subjects.includes(row.subject_name)) {
                teacher.subjects.push(row.subject_name);
              }
              if (!teacher.classes.includes(className)) {
                teacher.classes.push(className);
              }
            } else {
              teacherMap.set(teacherId, {
                id: teacherId,
                name: row.teacher_name,
                role: 'teacher',
                subjects: row.subject_name ? [row.subject_name] : [],
                classes: [className],
                isClassTeacher: false,
                unreadCount: 0
              });
            }
          });
        } catch (scheduleError) {
          console.warn('Could not fetch schedule teachers:', scheduleError.message);
        }
      } catch (error) {
        console.warn(`Error getting teachers for class ${className}:`, error.message);
      }
    }
    
    // Always include directors/administrators
    try {
      const directorsResult = await pool.query(`
        SELECT global_staff_id, teacher_name 
        FROM school_schema_points.teachers 
        WHERE LOWER(role) = 'director'
      `);
      
      directorsResult.rows.forEach(row => {
        const directorId = `staff_${row.global_staff_id}`;
        if (!teacherMap.has(directorId)) {
          teacherMap.set(directorId, {
            id: directorId,
            name: row.teacher_name,
            role: 'director',
            subjects: ['Administration'],
            classes: [],
            unreadCount: 0
          });
        }
      });
    } catch (directorError) {
      console.warn('Could not fetch directors:', directorError.message);
    }
    
    // Also check staff schemas for directors
    try {
      const staffSchemas = ['staff_teachers', 'staff_administrative_staff'];
      for (const schema of staffSchemas) {
        try {
          const schemaTablesResult = await pool.query(
            `SELECT table_name FROM information_schema.tables 
             WHERE table_schema = $1 AND table_name != 'staff_counter'`,
            [schema]
          );
          
          for (const tableRow of schemaTablesResult.rows) {
            const tableName = tableRow.table_name;
            try {
              const staffResult = await pool.query(
                `SELECT global_staff_id, name, role 
                 FROM "${schema}"."${tableName}" 
                 WHERE LOWER(role) = 'director' AND name IS NOT NULL`
              );
              
              staffResult.rows.forEach(row => {
                const staffId = `staff_${row.global_staff_id}`;
                if (!teacherMap.has(staffId)) {
                  teacherMap.set(staffId, {
                    id: staffId,
                    name: row.name,
                    role: 'director',
                    subjects: ['Administration'],
                    classes: [],
                    unreadCount: 0
                  });
                }
              });
            } catch (tableError) {
              // Skip inaccessible tables
            }
          }
        } catch (schemaError) {
          // Skip inaccessible schemas
        }
      }
    } catch (staffError) {
      console.warn('Could not fetch staff directors:', staffError.message);
    }
    
    // Convert map to array
    const teachers = Array.from(teacherMap.values());
    
    // Fallback: always include default admin if no directors found (with staff_ prefix)
    if (!teachers.some(t => t.role === 'director')) {
      teachers.push({
        id: 'staff_admin',
        name: 'Admin Director',
        role: 'director',
        subjects: ['Administration'],
        classes: [],
        unreadCount: 0
      });
    }
    
    // Sort: teachers first, then directors (so teachers appear at top)
    teachers.sort((a, b) => {
      if (a.role === 'teacher' && b.role !== 'teacher') return -1;
      if (a.role !== 'teacher' && b.role === 'teacher') return 1;
      return a.name.localeCompare(b.name);
    });
    
    console.log('Returning contacts for guardian:', username, teachers.map(t => ({ id: t.id, name: t.name, role: t.role })));
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching guardian contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts', details: error.message });
  }
});

module.exports = router;