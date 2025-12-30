const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Get all unique guardians aggregated from all class tables
router.get("/guardians", async (req, res) => {
  try {
    // Get all class tables from classes_schema (same pattern as studentRoutes)
    const tablesResult = await db.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1', 
      ['classes_schema']
    );
    
    const classes = tablesResult.rows.map(row => row.table_name);
    
    if (classes.length === 0) {
      return res.json([]);
    }

    // Aggregate guardians from all class tables
    const guardiansMap = new Map();
    
    for (const className of classes) {
      try {
        const result = await db.query(`
          SELECT 
            guardian_name,
            guardian_phone,
            guardian_relation,
            guardian_username,
            guardian_password,
            student_name,
            school_id,
            class_id,
            image_student,
            age,
            gender
          FROM classes_schema."${className}"
          WHERE guardian_name IS NOT NULL AND guardian_name != ''
        `);
        
        for (const row of result.rows) {
          // Use guardian_phone as unique key (or guardian_name if no phone)
          const key = row.guardian_phone || row.guardian_name;
          
          if (guardiansMap.has(key)) {
            // Add student to existing guardian
            const guardian = guardiansMap.get(key);
            guardian.students.push({
              student_name: row.student_name,
              class: className,
              school_id: row.school_id,
              class_id: row.class_id,
              image_student: row.image_student,
              age: row.age,
              gender: row.gender
            });
          } else {
            // Create new guardian entry
            guardiansMap.set(key, {
              id: key,
              guardian_name: row.guardian_name,
              guardian_phone: row.guardian_phone || '',
              guardian_relation: row.guardian_relation || '',
              guardian_username: row.guardian_username || '',
              guardian_password: row.guardian_password || '',
              students: [{
                student_name: row.student_name,
                class: className,
                school_id: row.school_id,
                class_id: row.class_id,
                image_student: row.image_student,
                age: row.age,
                gender: row.gender
              }]
            });
          }
        }
      } catch (err) {
        console.warn(`Error fetching from class ${className}:`, err.message);
      }
    }
    
    const guardians = Array.from(guardiansMap.values());
    guardians.sort((a, b) => (a.guardian_name || '').localeCompare(b.guardian_name || ''));
    
    res.json(guardians);
  } catch (error) {
    console.error("Error fetching guardians:", error);
    res.status(500).json({ error: "Failed to fetch guardians", details: error.message });
  }
});


// Get students for a specific guardian
router.get("/guardian/:guardianId/students", async (req, res) => {
  const { guardianId } = req.params;
  
  try {
    // Get all class tables (same pattern as studentRoutes)
    const tablesResult = await db.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1', 
      ['classes_schema']
    );
    
    const classes = tablesResult.rows.map(row => row.table_name);
    const students = [];
    
    for (const className of classes) {
      try {
        const result = await db.query(`
          SELECT 
            student_name,
            school_id,
            class_id,
            age,
            gender,
            image_student,
            username,
            class
          FROM classes_schema."${className}"
          WHERE guardian_phone = $1 OR guardian_name = $1
        `, [guardianId]);
        
        // Add class name to each student
        const studentsWithClass = result.rows.map(s => ({
          ...s,
          class: s.class || className
        }));
        
        students.push(...studentsWithClass);
      } catch (err) {
        console.warn(`Error fetching students from ${className}:`, err.message);
      }
    }
    
    res.json(students);
  } catch (error) {
    console.error("Error fetching guardian students:", error);
    res.status(500).json({ error: "Failed to fetch students", details: error.message });
  }
});

module.exports = router;
