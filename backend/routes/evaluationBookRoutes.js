const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// ============================================================================
// ACCESS CONTROL MIDDLEWARE
// ============================================================================

/**
 * Middleware to verify teacher has access to a specific class
 * Returns 403 if teacher is not assigned to the class
 */
const verifyTeacherClassAccess = async (req, res, next) => {
  try {
    const teacherId = req.query.teacherId || req.params.teacherId || req.body.teacher_global_id;
    const className = req.params.className || req.body.class_name;
    
    // Skip if no teacher/class context or if values are invalid
    if (!teacherId || !className || teacherId === 'null' || teacherId === 'undefined') {
      return next();
    }

    // Validate teacherId is a valid integer
    const parsedTeacherId = parseInt(teacherId, 10);
    if (isNaN(parsedTeacherId)) {
      return next(); // Skip validation if teacherId is not a valid number
    }

    const result = await pool.query(
      'SELECT id FROM evaluation_book_teacher_assignments WHERE teacher_global_id = $1 AND class_name = $2',
      [parsedTeacherId, className]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Teacher is not assigned to this class' 
      });
    }

    next();
  } catch (error) {
    console.error('Error in teacher access control:', error);
    res.status(500).json({ error: 'Access control check failed' });
  }
};

/**
 * Get classes assigned to a specific teacher
 */
const getTeacherAssignedClasses = async (teacherId) => {
  if (!teacherId || teacherId === 'null' || teacherId === 'undefined') {
    return [];
  }
  const parsedTeacherId = parseInt(teacherId, 10);
  if (isNaN(parsedTeacherId)) {
    return [];
  }
  const result = await pool.query(
    'SELECT class_name FROM evaluation_book_teacher_assignments WHERE teacher_global_id = $1',
    [parsedTeacherId]
  );
  return result.rows.map(r => r.class_name);
};

/**
 * Middleware to verify guardian has access to a specific evaluation
 * Returns 403 if the evaluation doesn't belong to guardian's ward
 */
const verifyGuardianWardAccess = async (req, res, next) => {
  try {
    const guardianId = req.params.guardianId || req.body.guardian_id;
    const evaluationId = req.params.evaluationId || req.params.id || req.body.daily_evaluation_id;
    
    if (!guardianId) {
      return next(); // Skip if no guardian context
    }

    if (evaluationId) {
      // Check if evaluation belongs to this guardian
      const result = await pool.query(
        'SELECT id FROM evaluation_book_daily_entries WHERE id = $1 AND guardian_id = $2',
        [evaluationId, guardianId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: 'This evaluation does not belong to your ward' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error in guardian access control:', error);
    res.status(500).json({ error: 'Access control check failed' });
  }
};

/**
 * Get wards (students) for a guardian
 */
const getGuardianWards = async (guardianId) => {
  const result = await pool.query(
    'SELECT DISTINCT student_name FROM evaluation_book_daily_entries WHERE guardian_id = $1',
    [guardianId]
  );
  return result.rows.map(r => r.student_name);
};

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

const initializeEvaluationBookTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Master evaluation form templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluation_book_templates (
        id SERIAL PRIMARY KEY,
        template_name VARCHAR(200) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Template fields (customizable form structure)
    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluation_book_template_fields (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES evaluation_book_templates(id) ON DELETE CASCADE,
        field_name VARCHAR(100) NOT NULL,
        field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'number', 'textarea', 'rating', 'select', 'multi-select', 'checkbox', 'date', 'upload')),
        field_order INTEGER NOT NULL,
        is_guardian_field BOOLEAN DEFAULT false,
        max_rating INTEGER,
        required BOOLEAN DEFAULT true,
        options JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add options column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluation_book_template_fields' AND column_name = 'options') THEN
          ALTER TABLE evaluation_book_template_fields ADD COLUMN options JSONB DEFAULT '[]';
        END IF;
      END $$;
    `);
    
    // Update field_type constraint to include new types (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN 
        ALTER TABLE evaluation_book_template_fields DROP CONSTRAINT IF EXISTS evaluation_book_template_fields_field_type_check;
        ALTER TABLE evaluation_book_template_fields ADD CONSTRAINT evaluation_book_template_fields_field_type_check 
          CHECK (field_type IN ('text', 'number', 'textarea', 'rating', 'select', 'multi-select', 'checkbox', 'date', 'upload'));
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;
    `);

    // Teacher-to-class assignments for evaluation book
    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluation_book_teacher_assignments (
        id SERIAL PRIMARY KEY,
        teacher_global_id INTEGER NOT NULL,
        teacher_name VARCHAR(100) NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        assigned_by INTEGER NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(teacher_global_id, class_name)
      );
    `);


    // Daily evaluation entries
    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluation_book_daily_entries (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES evaluation_book_templates(id) ON DELETE SET NULL,
        teacher_global_id INTEGER NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        guardian_id VARCHAR(100),
        evaluation_date DATE NOT NULL,
        field_values JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'responded', 'completed')),
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(template_id, class_name, student_name, evaluation_date)
      );
    `);

    // Guardian feedback responses
    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluation_book_guardian_feedback (
        id SERIAL PRIMARY KEY,
        daily_evaluation_id INTEGER REFERENCES evaluation_book_daily_entries(id) ON DELETE CASCADE,
        guardian_id VARCHAR(100) NOT NULL,
        feedback_text TEXT NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(daily_evaluation_id)
      );
    `);

    // Create indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_eb_daily_entries_teacher ON evaluation_book_daily_entries(teacher_global_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_eb_daily_entries_class ON evaluation_book_daily_entries(class_name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_eb_daily_entries_guardian ON evaluation_book_daily_entries(guardian_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_eb_daily_entries_date ON evaluation_book_daily_entries(evaluation_date);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_eb_daily_entries_status ON evaluation_book_daily_entries(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_eb_feedback_guardian ON evaluation_book_guardian_feedback(guardian_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_eb_template_fields_template ON evaluation_book_template_fields(template_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_eb_teacher_assignments_teacher ON evaluation_book_teacher_assignments(teacher_global_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_eb_teacher_assignments_class ON evaluation_book_teacher_assignments(class_name);');

    await client.query('COMMIT');
    console.log('Evaluation Book tables initialized successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing Evaluation Book tables:', error);
  } finally {
    client.release();
  }
};

// Initialize tables on module load
initializeEvaluationBookTables().catch(console.error);

// ============================================================================
// TEMPLATE ROUTES (Admin)
// ============================================================================

// GET /api/evaluation-book/templates - List all templates
router.get('/templates', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM evaluation_book_template_fields WHERE template_id = t.id) as field_count
      FROM evaluation_book_templates t 
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/evaluation-book/templates/:id - Get single template with fields
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const templateResult = await pool.query('SELECT * FROM evaluation_book_templates WHERE id = $1', [id]);
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    const template = templateResult.rows[0];
    const fieldsResult = await pool.query(
      'SELECT * FROM evaluation_book_template_fields WHERE template_id = $1 ORDER BY field_order',
      [id]
    );
    template.fields = fieldsResult.rows;
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});


// POST /api/evaluation-book/templates - Create new template
router.post('/templates', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { template_name, description, is_active, created_by, fields } = req.body;
    
    if (!template_name || !created_by) {
      return res.status(400).json({ error: 'template_name and created_by are required' });
    }

    const templateResult = await client.query(
      `INSERT INTO evaluation_book_templates (template_name, description, is_active, created_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [template_name, description || null, is_active !== false, created_by]
    );
    const template = templateResult.rows[0];

    if (fields && Array.isArray(fields)) {
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        await client.query(
          `INSERT INTO evaluation_book_template_fields 
           (template_id, field_name, field_type, field_order, is_guardian_field, max_rating, required, options)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [template.id, field.field_name, field.field_type, i + 1, field.is_guardian_field || false, field.max_rating || null, field.required !== false, JSON.stringify(field.options || [])]
        );
      }
    }

    await client.query('COMMIT');
    
    // Fetch complete template with fields
    const completeTemplate = await pool.query('SELECT * FROM evaluation_book_templates WHERE id = $1', [template.id]);
    const fieldsResult = await pool.query('SELECT * FROM evaluation_book_template_fields WHERE template_id = $1 ORDER BY field_order', [template.id]);
    completeTemplate.rows[0].fields = fieldsResult.rows;
    
    res.status(201).json(completeTemplate.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  } finally {
    client.release();
  }
});

// PUT /api/evaluation-book/templates/:id - Update template
router.put('/templates/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { template_name, description, is_active, fields } = req.body;

    const updateResult = await client.query(
      `UPDATE evaluation_book_templates 
       SET template_name = COALESCE($1, template_name),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [template_name, description, is_active, id]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Template not found' });
    }

    // Update fields if provided
    if (fields && Array.isArray(fields)) {
      await client.query('DELETE FROM evaluation_book_template_fields WHERE template_id = $1', [id]);
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        await client.query(
          `INSERT INTO evaluation_book_template_fields 
           (template_id, field_name, field_type, field_order, is_guardian_field, max_rating, required, options)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, field.field_name, field.field_type, i + 1, field.is_guardian_field || false, field.max_rating || null, field.required !== false, JSON.stringify(field.options || [])]
        );
      }
    }

    await client.query('COMMIT');
    
    // Fetch updated template
    const template = await pool.query('SELECT * FROM evaluation_book_templates WHERE id = $1', [id]);
    const fieldsResult = await pool.query('SELECT * FROM evaluation_book_template_fields WHERE template_id = $1 ORDER BY field_order', [id]);
    template.rows[0].fields = fieldsResult.rows;
    
    res.json(template.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  } finally {
    client.release();
  }
});

// DELETE /api/evaluation-book/templates/:id - Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM evaluation_book_templates WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});


// ============================================================================
// TEACHER ASSIGNMENT ROUTES (Admin)
// ============================================================================

// GET /api/evaluation-book/assignments - List all assignments
router.get('/assignments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM evaluation_book_teacher_assignments 
      ORDER BY class_name, teacher_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/evaluation-book/assignments/teacher/:teacherId - Get assignments for a teacher
router.get('/assignments/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Validate teacherId
    if (!teacherId || teacherId === 'null' || teacherId === 'undefined') {
      return res.json([]);
    }
    
    const parsedTeacherId = parseInt(teacherId, 10);
    if (isNaN(parsedTeacherId)) {
      return res.json([]);
    }
    
    const result = await pool.query(
      'SELECT * FROM evaluation_book_teacher_assignments WHERE teacher_global_id = $1 ORDER BY class_name',
      [parsedTeacherId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({ error: 'Failed to fetch teacher assignments' });
  }
});

// POST /api/evaluation-book/assignments - Create assignment
router.post('/assignments', async (req, res) => {
  try {
    const { teacher_global_id, teacher_name, class_name, assigned_by } = req.body;
    
    if (!teacher_global_id || !teacher_name || !class_name || !assigned_by) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await pool.query(
      `INSERT INTO evaluation_book_teacher_assignments (teacher_global_id, teacher_name, class_name, assigned_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [teacher_global_id, teacher_name, class_name, assigned_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'This teacher is already assigned to this class' });
    }
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// DELETE /api/evaluation-book/assignments/:id - Remove assignment
router.delete('/assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM evaluation_book_teacher_assignments WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ message: 'Assignment removed successfully' });
  } catch (error) {
    console.error('Error removing assignment:', error);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

// ============================================================================
// TEACHER CLASS DATA ROUTES
// ============================================================================

// GET /api/evaluation-book/teacher/:teacherId/class/:className - Get class data with students and template
router.get('/teacher/:teacherId/class/:className', async (req, res) => {
  try {
    const { teacherId, className } = req.params;
    
    // Validate teacherId
    if (!teacherId || teacherId === 'null' || teacherId === 'undefined') {
      return res.status(400).json({ error: 'Invalid teacher ID' });
    }
    
    const parsedTeacherId = parseInt(teacherId, 10);
    if (isNaN(parsedTeacherId)) {
      return res.status(400).json({ error: 'Invalid teacher ID format' });
    }
    
    // Verify teacher is assigned to this class
    const assignmentCheck = await pool.query(
      'SELECT id FROM evaluation_book_teacher_assignments WHERE teacher_global_id = $1 AND class_name = $2',
      [parsedTeacherId, className]
    );
    
    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied', message: 'Teacher is not assigned to this class' });
    }
    
    // Get active template
    const templateResult = await pool.query(
      'SELECT id, template_name FROM evaluation_book_templates WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    const template = templateResult.rows[0] || null;
    
    // Validate class name for SQL injection prevention
    const validTableName = /^[a-zA-Z0-9_]+$/.test(className);
    if (!validTableName) {
      return res.status(400).json({ error: 'Invalid class name provided' });
    }
    
    // Get students from the class table with guardian info
    const studentsResult = await pool.query(
      `SELECT student_name, school_id, class_id, guardian_name, guardian_phone, guardian_username
       FROM classes_schema."${className}"
       ORDER BY LOWER(student_name) ASC`
    );
    
    // Map students with guardian_id (using guardian_username or guardian_phone as ID)
    const studentsWithGuardian = studentsResult.rows.map(s => ({
      ...s,
      guardian_id: s.guardian_username || s.guardian_phone || null
    }));
    
    res.json({
      className,
      template,
      students: studentsWithGuardian
    });
  } catch (error) {
    console.error('Error fetching class data:', error);
    res.status(500).json({ error: 'Failed to fetch class data' });
  }
});

// ============================================================================
// DAILY EVALUATION ROUTES (Teacher)
// ============================================================================

// GET /api/evaluation-book/daily/class/:className - Get evaluations for a class
router.get('/daily/class/:className', async (req, res) => {
  try {
    const { className } = req.params;
    const { date, teacherId } = req.query;
    
    let query = `
      SELECT e.*, f.feedback_text, f.submitted_at as feedback_submitted_at
      FROM evaluation_book_daily_entries e
      LEFT JOIN evaluation_book_guardian_feedback f ON e.id = f.daily_evaluation_id
      WHERE e.class_name = $1
    `;
    const params = [className];
    
    if (date) {
      params.push(date);
      query += ` AND e.evaluation_date = $${params.length}`;
    }
    if (teacherId) {
      params.push(teacherId);
      query += ` AND e.teacher_global_id = $${params.length}`;
    }
    
    query += ' ORDER BY e.evaluation_date DESC, e.student_name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching class evaluations:', error);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// POST /api/evaluation-book/daily - Create daily evaluation entries
router.post('/daily', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { template_id, teacher_global_id, class_name, evaluation_date, entries } = req.body;
    
    if (!template_id || !teacher_global_id || !class_name || !evaluation_date || !entries) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const createdEntries = [];
    for (const entry of entries) {
      const result = await client.query(
        `INSERT INTO evaluation_book_daily_entries 
         (template_id, teacher_global_id, class_name, student_name, guardian_id, evaluation_date, field_values, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         ON CONFLICT (template_id, class_name, student_name, evaluation_date) 
         DO UPDATE SET field_values = $7, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [template_id, teacher_global_id, class_name, entry.student_name, entry.guardian_id || null, evaluation_date, JSON.stringify(entry.field_values || {})]
      );
      createdEntries.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json(createdEntries);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating daily evaluations:', error);
    res.status(500).json({ error: 'Failed to create evaluations' });
  } finally {
    client.release();
  }
});


// POST /api/evaluation-book/daily/send - Send evaluations to guardians
router.post('/daily/send', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { evaluation_ids } = req.body;
    
    if (!evaluation_ids || !Array.isArray(evaluation_ids)) {
      return res.status(400).json({ error: 'evaluation_ids array is required' });
    }

    const result = await client.query(
      `UPDATE evaluation_book_daily_entries 
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1::int[]) AND status = 'pending'
       RETURNING *`,
      [evaluation_ids]
    );

    await client.query('COMMIT');
    res.json({ message: `${result.rowCount} evaluations sent to guardians`, entries: result.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending evaluations:', error);
    res.status(500).json({ error: 'Failed to send evaluations' });
  } finally {
    client.release();
  }
});

// GET /api/evaluation-book/daily/:id - Get single evaluation
router.get('/daily/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT e.*, t.template_name, f.feedback_text, f.submitted_at as feedback_submitted_at
      FROM evaluation_book_daily_entries e
      LEFT JOIN evaluation_book_templates t ON e.template_id = t.id
      LEFT JOIN evaluation_book_guardian_feedback f ON e.id = f.daily_evaluation_id
      WHERE e.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation' });
  }
});

// ============================================================================
// GUARDIAN ROUTES
// ============================================================================

// GET /api/evaluation-book/daily/guardian/:guardianId - Get evaluations for guardian
router.get('/daily/guardian/:guardianId', async (req, res) => {
  try {
    const { guardianId } = req.params;
    const { status, studentName } = req.query;
    
    let query = `
      SELECT e.*, t.template_name, f.feedback_text, f.submitted_at as feedback_submitted_at
      FROM evaluation_book_daily_entries e
      LEFT JOIN evaluation_book_templates t ON e.template_id = t.id
      LEFT JOIN evaluation_book_guardian_feedback f ON e.id = f.daily_evaluation_id
      WHERE e.guardian_id = $1
    `;
    const params = [guardianId];
    
    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }
    if (studentName) {
      params.push(studentName);
      query += ` AND e.student_name = $${params.length}`;
    }
    
    query += ' ORDER BY e.evaluation_date DESC';
    
    const result = await pool.query(query, params);
    
    // Fetch template fields for each unique template_id to map field IDs to names
    const templateIds = [...new Set(result.rows.filter(r => r.template_id).map(r => r.template_id))];
    const fieldMaps = {};
    
    for (const templateId of templateIds) {
      const fieldsResult = await pool.query(
        'SELECT id, field_name, field_type FROM evaluation_book_template_fields WHERE template_id = $1 ORDER BY field_order',
        [templateId]
      );
      fieldMaps[templateId] = {};
      fieldsResult.rows.forEach(f => {
        fieldMaps[templateId][f.id] = { name: f.field_name, type: f.field_type };
      });
    }
    
    // Transform field_values to use field names instead of IDs
    const transformedRows = result.rows.map(row => {
      const fieldMap = fieldMaps[row.template_id] || {};
      const namedFieldValues = {};
      
      if (row.field_values) {
        Object.entries(row.field_values).forEach(([fieldId, value]) => {
          const fieldInfo = fieldMap[fieldId];
          const fieldName = fieldInfo?.name || `Field ${fieldId}`;
          namedFieldValues[fieldName] = value;
        });
      }
      
      return {
        ...row,
        field_values: namedFieldValues,
        field_definitions: Object.values(fieldMap)
      };
    });
    
    res.json(transformedRows);
  } catch (error) {
    console.error('Error fetching guardian evaluations:', error);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// POST /api/evaluation-book/feedback - Submit guardian feedback
router.post('/feedback', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { daily_evaluation_id, guardian_id, feedback_text } = req.body;
    
    if (!daily_evaluation_id || !guardian_id || !feedback_text) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify the evaluation exists and belongs to this guardian
    const evalCheck = await client.query(
      'SELECT id, status FROM evaluation_book_daily_entries WHERE id = $1 AND guardian_id = $2',
      [daily_evaluation_id, guardian_id]
    );
    
    if (evalCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Evaluation not found or access denied' });
    }

    // Insert or update feedback
    const feedbackResult = await client.query(
      `INSERT INTO evaluation_book_guardian_feedback (daily_evaluation_id, guardian_id, feedback_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (daily_evaluation_id) DO UPDATE SET feedback_text = $3, submitted_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [daily_evaluation_id, guardian_id, feedback_text]
    );

    // Update evaluation status
    await client.query(
      `UPDATE evaluation_book_daily_entries 
       SET status = 'responded', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [daily_evaluation_id]
    );

    await client.query('COMMIT');
    res.status(201).json(feedbackResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  } finally {
    client.release();
  }
});

// GET /api/evaluation-book/feedback/:evaluationId - Get feedback for evaluation
router.get('/feedback/:evaluationId', async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const result = await pool.query(
      'SELECT * FROM evaluation_book_guardian_feedback WHERE daily_evaluation_id = $1',
      [evaluationId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});


// ============================================================================
// REPORT ROUTES
// ============================================================================

// GET /api/evaluation-book/reports/admin - Admin reports (all data)
router.get('/reports/admin', async (req, res) => {
  try {
    const { startDate, endDate, className, teacherId, studentName } = req.query;
    
    let query = `
      SELECT e.*, t.template_name, f.feedback_text, f.submitted_at as feedback_submitted_at
      FROM evaluation_book_daily_entries e
      LEFT JOIN evaluation_book_templates t ON e.template_id = t.id
      LEFT JOIN evaluation_book_guardian_feedback f ON e.id = f.daily_evaluation_id
      WHERE 1=1
    `;
    const params = [];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND e.evaluation_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND e.evaluation_date <= $${params.length}`;
    }
    if (className) {
      params.push(className);
      query += ` AND e.class_name = $${params.length}`;
    }
    if (teacherId) {
      params.push(teacherId);
      query += ` AND e.teacher_global_id = $${params.length}`;
    }
    if (studentName) {
      params.push(`%${studentName}%`);
      query += ` AND e.student_name ILIKE $${params.length}`;
    }
    
    query += ' ORDER BY e.evaluation_date DESC, e.class_name, e.student_name';
    
    const result = await pool.query(query, params);
    
    // Fetch template fields for each unique template_id to map field IDs to names
    const templateIds = [...new Set(result.rows.filter(r => r.template_id).map(r => r.template_id))];
    const fieldMaps = {};
    
    for (const templateId of templateIds) {
      const fieldsResult = await pool.query(
        'SELECT id, field_name, field_type FROM evaluation_book_template_fields WHERE template_id = $1 ORDER BY field_order',
        [templateId]
      );
      fieldMaps[templateId] = {};
      fieldsResult.rows.forEach(f => {
        fieldMaps[templateId][f.id] = { name: f.field_name, type: f.field_type };
      });
    }
    
    // Transform field_values to use field names instead of IDs
    const transformedRows = result.rows.map(row => {
      const fieldMap = fieldMaps[row.template_id] || {};
      const namedFieldValues = {};
      
      if (row.field_values) {
        Object.entries(row.field_values).forEach(([fieldId, value]) => {
          const fieldInfo = fieldMap[fieldId];
          const fieldName = fieldInfo?.name || `Field ${fieldId}`;
          namedFieldValues[fieldName] = value;
        });
      }
      
      return {
        ...row,
        field_values: namedFieldValues
      };
    });
    
    // Calculate summary stats
    const total = transformedRows.length;
    const pending = transformedRows.filter(r => r.status === 'pending').length;
    const sent = transformedRows.filter(r => r.status === 'sent').length;
    const responded = transformedRows.filter(r => r.status === 'responded' || r.status === 'completed').length;
    
    res.json({
      summary: {
        totalEvaluations: total,
        pendingResponses: pending + sent,
        completedResponses: responded,
        responseRate: total > 0 ? Math.round((responded / total) * 100) : 0
      },
      entries: transformedRows
    });
  } catch (error) {
    console.error('Error fetching admin report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// GET /api/evaluation-book/reports/teacher/:teacherId - Teacher reports (assigned classes only)
router.get('/reports/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate, className, studentName } = req.query;
    
    // Get teacher's assigned classes
    const assignmentsResult = await pool.query(
      'SELECT class_name FROM evaluation_book_teacher_assignments WHERE teacher_global_id = $1',
      [teacherId]
    );
    const assignedClasses = assignmentsResult.rows.map(r => r.class_name);
    
    if (assignedClasses.length === 0) {
      return res.json({ summary: { totalEvaluations: 0, pendingResponses: 0, completedResponses: 0, responseRate: 0 }, entries: [] });
    }
    
    let query = `
      SELECT e.*, t.template_name, f.feedback_text, f.submitted_at as feedback_submitted_at
      FROM evaluation_book_daily_entries e
      LEFT JOIN evaluation_book_templates t ON e.template_id = t.id
      LEFT JOIN evaluation_book_guardian_feedback f ON e.id = f.daily_evaluation_id
      WHERE e.class_name = ANY($1::text[])
    `;
    const params = [assignedClasses];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND e.evaluation_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND e.evaluation_date <= $${params.length}`;
    }
    if (className && assignedClasses.includes(className)) {
      params.push(className);
      query += ` AND e.class_name = $${params.length}`;
    }
    if (studentName) {
      params.push(`%${studentName}%`);
      query += ` AND e.student_name ILIKE $${params.length}`;
    }
    
    query += ' ORDER BY e.evaluation_date DESC, e.class_name, e.student_name';
    
    const result = await pool.query(query, params);
    
    // Fetch template fields for each unique template_id to map field IDs to names
    const templateIds = [...new Set(result.rows.filter(r => r.template_id).map(r => r.template_id))];
    const fieldMaps = {};
    
    for (const templateId of templateIds) {
      const fieldsResult = await pool.query(
        'SELECT id, field_name, field_type FROM evaluation_book_template_fields WHERE template_id = $1 ORDER BY field_order',
        [templateId]
      );
      fieldMaps[templateId] = {};
      fieldsResult.rows.forEach(f => {
        fieldMaps[templateId][f.id] = { name: f.field_name, type: f.field_type };
      });
    }
    
    // Transform field_values to use field names instead of IDs
    const transformedRows = result.rows.map(row => {
      const fieldMap = fieldMaps[row.template_id] || {};
      const namedFieldValues = {};
      
      if (row.field_values) {
        Object.entries(row.field_values).forEach(([fieldId, value]) => {
          const fieldInfo = fieldMap[fieldId];
          const fieldName = fieldInfo?.name || `Field ${fieldId}`;
          namedFieldValues[fieldName] = value;
        });
      }
      
      return {
        ...row,
        field_values: namedFieldValues
      };
    });
    
    const total = transformedRows.length;
    const responded = transformedRows.filter(r => r.status === 'responded' || r.status === 'completed').length;
    
    res.json({
      summary: {
        totalEvaluations: total,
        pendingResponses: total - responded,
        completedResponses: responded,
        responseRate: total > 0 ? Math.round((responded / total) * 100) : 0
      },
      entries: transformedRows
    });
  } catch (error) {
    console.error('Error fetching teacher report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// GET /api/evaluation-book/reports/guardian/:guardianId - Guardian reports (wards only)
router.get('/reports/guardian/:guardianId', async (req, res) => {
  try {
    const { guardianId } = req.params;
    const { startDate, endDate, studentName } = req.query;
    
    let query = `
      SELECT e.*, t.template_name, f.feedback_text, f.submitted_at as feedback_submitted_at
      FROM evaluation_book_daily_entries e
      LEFT JOIN evaluation_book_templates t ON e.template_id = t.id
      LEFT JOIN evaluation_book_guardian_feedback f ON e.id = f.daily_evaluation_id
      WHERE e.guardian_id = $1
    `;
    const params = [guardianId];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND e.evaluation_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND e.evaluation_date <= $${params.length}`;
    }
    if (studentName) {
      params.push(studentName);
      query += ` AND e.student_name = $${params.length}`;
    }
    
    query += ' ORDER BY e.evaluation_date DESC, e.student_name';
    
    const result = await pool.query(query, params);
    
    res.json({
      entries: result.rows,
      wards: [...new Set(result.rows.map(r => r.student_name))]
    });
  } catch (error) {
    console.error('Error fetching guardian report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// ============================================================================
// HELPER ROUTES
// ============================================================================

// GET /api/evaluation-book/classes - Get all classes (for dropdowns)
router.get('/classes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name as class_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema' 
      ORDER BY table_name
    `);
    res.json(result.rows.map(r => r.class_name));
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/evaluation-book/teachers - Get all teachers (for dropdowns)
router.get('/teachers', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const staffSchemasResult = await client.query(
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'staff_%'"
      );
      let allTeachers = [];
      
      for (const schema of staffSchemasResult.rows) {
        const tablesResult = await client.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name != 'staff_counter'",
          [schema.schema_name]
        );
        for (const table of tablesResult.rows) {
          const staffResult = await client.query(
            `SELECT global_staff_id, name, role FROM "${schema.schema_name}"."${table.table_name}" WHERE role = 'Teacher'`
          );
          allTeachers = allTeachers.concat(staffResult.rows);
        }
      }
      
      res.json(allTeachers.sort((a, b) => a.name.localeCompare(b.name)));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// GET /api/evaluation-book/students/:className - Get students in a class
router.get('/students/:className', async (req, res) => {
  try {
    const { className } = req.params;
    const result = await pool.query(
      `SELECT student_name, age, gender FROM classes_schema."${className}" ORDER BY student_name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// ============================================================================
// TEACHER CLASS VIEW ROUTES
// ============================================================================

// GET /api/evaluation-book/teacher/:teacherId/classes - Get teacher's assigned classes with student counts
router.get('/teacher/:teacherId/classes', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Get assigned classes
    const assignmentsResult = await pool.query(
      'SELECT class_name FROM evaluation_book_teacher_assignments WHERE teacher_global_id = $1 ORDER BY class_name',
      [teacherId]
    );
    
    if (assignmentsResult.rows.length === 0) {
      return res.json([]);
    }

    // Get student counts for each class
    const classesWithCounts = await Promise.all(
      assignmentsResult.rows.map(async (row) => {
        try {
          const countResult = await pool.query(
            `SELECT COUNT(*) as student_count FROM classes_schema."${row.class_name}"`
          );
          return {
            class_name: row.class_name,
            student_count: parseInt(countResult.rows[0]?.student_count || 0)
          };
        } catch (err) {
          return { class_name: row.class_name, student_count: 0 };
        }
      })
    );

    res.json(classesWithCounts);
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({ error: 'Failed to fetch teacher classes' });
  }
});

// GET /api/evaluation-book/teacher/:teacherId/class/:className - Verify teacher access to class
router.get('/teacher/:teacherId/class/:className', verifyTeacherClassAccess, async (req, res) => {
  try {
    const { teacherId, className } = req.params;
    
    // Get students in the class
    const studentsResult = await pool.query(
      `SELECT student_name, age, gender FROM classes_schema."${className}" ORDER BY student_name`
    );

    // Get active template
    const templateResult = await pool.query(
      'SELECT * FROM evaluation_book_templates WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );

    res.json({
      class_name: className,
      students: studentsResult.rows,
      template: templateResult.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching class details:', error);
    res.status(500).json({ error: 'Failed to fetch class details' });
  }
});

module.exports = router;
