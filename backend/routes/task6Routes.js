// routes/task6Routes.js
const express = require('express');
const db = require('../config/db');
const router = express.Router();

// Create teachers_period table
const initializeTeachersPeriodTable = async () => {
  try {
    await db.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.teachers_period (
        id SERIAL PRIMARY KEY,
        teacher_name VARCHAR(100) NOT NULL,
        staff_work_time VARCHAR(50) NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        subject_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(teacher_name, class_name, subject_name)
      )
    `);
    
    console.log('Teachers period table initialized successfully');
  } catch (error) {
    console.error('Error initializing teachers period table:', error);
  }
};

// Initialize on module load
initializeTeachersPeriodTable();

// Merge teachers with classes and subjects
router.post('/merge-teachers-classes', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Clear existing data
    await client.query('DELETE FROM school_schema_points.teachers_period');

    // Get all class-subject mappings
    const classSubjectsResult = await client.query(`
      SELECT class_name, subject_name 
      FROM school_schema_points.class_subjects 
      ORDER BY class_name, subject_name
    `);

    // Get all teachers
    const teachersResult = await client.query(`
      SELECT teacher_name, staff_work_time 
      FROM school_schema_points.teachers 
      WHERE role = 'Teacher'
      ORDER BY teacher_name
    `);

    const classSubjects = classSubjectsResult.rows;
    const teachers = teachersResult.rows;

    if (classSubjects.length === 0) {
      return res.status(400).json({ 
        error: 'No class-subject mappings found. Please complete Task 5 first.' 
      });
    }

    if (teachers.length === 0) {
      return res.status(400).json({ 
        error: 'No teachers found. Please add teachers first.' 
      });
    }

    // Merge data - round-robin assignment
    let insertedCount = 0;
    
    for (let i = 0; i < classSubjects.length; i++) {
      const classSubject = classSubjects[i];
      const teacher = teachers[i % teachers.length];
      
      await client.query(
        `INSERT INTO school_schema_points.teachers_period 
         (teacher_name, staff_work_time, class_name, subject_name) 
         VALUES ($1, $2, $3, $4)`,
        [teacher.teacher_name, teacher.staff_work_time, classSubject.class_name, classSubject.subject_name]
      );
      
      insertedCount++;
    }

    await client.query('COMMIT');
    
    res.json({ 
      message: `Successfully merged ${insertedCount} class-subject combinations with ${teachers.length} teachers`,
      insertedCount,
      teacherCount: teachers.length,
      classSubjectCount: classSubjects.length
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in Task 6 merge:', err);
    res.status(500).json({ 
      error: 'Failed to merge teachers and classes', 
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// Get merged teachers_period data
router.get('/teachers-period', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT teacher_name, staff_work_time, class_name, subject_name, created_at
      FROM school_schema_points.teachers_period 
      ORDER BY class_name, subject_name, teacher_name
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching teachers_period data:', err);
    res.status(500).json({ 
      error: 'Failed to fetch teachers period data', 
      details: err.message 
    });
  }
});

// Check if Task 6 data exists
router.get('/check-data', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT COUNT(*) as count FROM school_schema_points.teachers_period
    `);
    
    const hasData = result.rows[0].count > 0;
    
    res.json({ 
      hasData: hasData,
      recordCount: parseInt(result.rows[0].count)
    });
  } catch (err) {
    console.error('Error checking Task 6 data:', err);
    res.status(500).json({ 
      error: 'Failed to check Task 6 data', 
      details: err.message 
    });
  }
});

module.exports = router;