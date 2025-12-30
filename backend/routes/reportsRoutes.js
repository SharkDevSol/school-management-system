const express = require('express');
const router = express.Router();
const pool = require('../config/db');
require('dotenv').config();

// Security middleware
const { authenticateToken } = require('../middleware/auth');

// All report routes require authentication
router.use(authenticateToken);

// ============================================================
// OVERVIEW REPORTS
// ============================================================

// GET /api/reports/overview - Complete system overview
router.get('/overview', async (req, res) => {
  try {
    const overview = {
      students: await getStudentStats(),
      staff: await getStaffStats(),
      classes: await getClassStats(),
      faults: await getFaultStats(),
      attendance: await getAttendanceStats(),
      evaluations: await getEvaluationStats()
    };
    res.json({ success: true, data: overview, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Overview report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// STUDENT REPORTS
// ============================================================

// GET /api/reports/students/summary - Student summary statistics
router.get('/students/summary', async (req, res) => {
  try {
    const data = await getStudentStats();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/students/by-class - Students count per class
router.get('/students/by-class', async (req, res) => {
  try {
    const classes = await getClassList();
    const data = [];

    for (const className of classes) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM classes_schema."${className}"`);
        const genderResult = await pool.query(`
          SELECT gender, COUNT(*) as count FROM classes_schema."${className}" 
          WHERE gender IS NOT NULL GROUP BY gender
        `);
        data.push({
          className,
          total: parseInt(result.rows[0]?.count) || 0,
          male: parseInt(genderResult.rows.find(r => r.gender?.toLowerCase() === 'male')?.count) || 0,
          female: parseInt(genderResult.rows.find(r => r.gender?.toLowerCase() === 'female')?.count) || 0
        });
      } catch (e) { /* skip */ }
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/students/by-gender - Gender distribution
router.get('/students/by-gender', async (req, res) => {
  try {
    const stats = await getStudentStats();
    res.json({ 
      success: true, 
      data: {
        male: stats.male,
        female: stats.female,
        total: stats.total,
        malePercent: stats.total > 0 ? ((stats.male / stats.total) * 100).toFixed(1) : 0,
        femalePercent: stats.total > 0 ? ((stats.female / stats.total) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/students/by-age - Age distribution
router.get('/students/by-age', async (req, res) => {
  try {
    const classes = await getClassList();
    const ageGroups = {};
    for (const className of classes) {
      try {
        const result = await pool.query(`SELECT age, COUNT(*) as count FROM classes_schema."${className}" WHERE age IS NOT NULL GROUP BY age`);
        result.rows.forEach(row => {
          const age = parseInt(row.age) || 0;
          ageGroups[age] = (ageGroups[age] || 0) + parseInt(row.count);
        });
      } catch (e) { /* skip */ }
    }
    const data = Object.entries(ageGroups).map(([age, count]) => ({ age: parseInt(age), count })).sort((a, b) => a.age - b.age);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================
// STAFF REPORTS
// ============================================================

// GET /api/reports/staff/summary - Staff summary statistics
router.get('/staff/summary', async (req, res) => {
  try {
    const data = await getStaffStats();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/staff/by-type - Staff by type (Teachers, Admin, Support)
router.get('/staff/by-type', async (req, res) => {
  try {
    const staffTypes = ['staff_teachers', 'staff_administrative_staff', 'staff_supportive_staff'];
    const data = [];
    for (const schema of staffTypes) {
      try {
        const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [schema]);
        let count = 0;
        for (const t of tables.rows) {
          const result = await pool.query(`SELECT COUNT(*) as count FROM "${schema}"."${t.table_name}"`);
          count += parseInt(result.rows[0]?.count) || 0;
        }
        data.push({ type: schema.replace('staff_', '').replace(/_/g, ' '), count });
      } catch (e) { /* skip */ }
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/staff/by-role - Staff by role
router.get('/staff/by-role', async (req, res) => {
  try {
    const staffTypes = ['staff_teachers', 'staff_administrative_staff', 'staff_supportive_staff'];
    const roles = {};
    for (const schema of staffTypes) {
      try {
        const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [schema]);
        for (const t of tables.rows) {
          const result = await pool.query(`SELECT role, COUNT(*) as count FROM "${schema}"."${t.table_name}" WHERE role IS NOT NULL GROUP BY role`);
          result.rows.forEach(row => { roles[row.role] = (roles[row.role] || 0) + parseInt(row.count); });
        }
      } catch (e) { /* skip */ }
    }
    const data = Object.entries(roles).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/staff/by-gender - Staff gender distribution
router.get('/staff/by-gender', async (req, res) => {
  try {
    const staffTypes = ['staff_teachers', 'staff_administrative_staff', 'staff_supportive_staff'];
    let male = 0, female = 0, total = 0;
    for (const schema of staffTypes) {
      try {
        const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [schema]);
        for (const t of tables.rows) {
          const result = await pool.query(`SELECT gender, COUNT(*) as count FROM "${schema}"."${t.table_name}" WHERE gender IS NOT NULL GROUP BY gender`);
          result.rows.forEach(row => {
            const count = parseInt(row.count) || 0;
            total += count;
            if (row.gender?.toLowerCase() === 'male') male += count;
            else if (row.gender?.toLowerCase() === 'female') female += count;
          });
        }
      } catch (e) { /* skip */ }
    }
    res.json({ success: true, data: { male, female, total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================
// ACADEMIC REPORTS
// ============================================================

// GET /api/reports/academic/class-performance - Performance by class
router.get('/academic/class-performance', async (req, res) => {
  try {
    const data = await getClassPerformance();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/academic/subject-averages - Average scores by subject
router.get('/academic/subject-averages', async (req, res) => {
  try {
    const data = await getSubjectAverages();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/academic/top-performers - Top performing students
router.get('/academic/top-performers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await getTopPerformers(limit);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/academic/bottom-performers - Students needing support
router.get('/academic/bottom-performers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await getBottomPerformers(limit);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/academic/class-rankings - Class rankings by average score
router.get('/academic/class-rankings', async (req, res) => {
  try {
    const data = await getClassRankings();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/academic/pass-fail-rates - Pass/fail rates by class
router.get('/academic/pass-fail-rates', async (req, res) => {
  try {
    const data = await getPassFailRates();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================
// BEHAVIOR/FAULTS REPORTS
// ============================================================

// GET /api/reports/faults/summary - Faults summary
router.get('/faults/summary', async (req, res) => {
  try {
    const data = await getFaultStats();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/faults/by-class - Faults count per class
router.get('/faults/by-class', async (req, res) => {
  try {
    const data = await getFaultsByClass();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/faults/by-type - Faults by type
router.get('/faults/by-type', async (req, res) => {
  try {
    const data = await getFaultsByType();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/faults/by-level - Faults by severity level
router.get('/faults/by-level', async (req, res) => {
  try {
    const data = await getFaultsByLevel();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/faults/recent - Recent faults (last 7 days)
router.get('/faults/recent', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 20;
    const data = await getRecentFaults(days, limit);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/faults/top-offenders - Students with most faults
router.get('/faults/top-offenders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await getTopOffenders(limit);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/faults/trends - Fault trends over time
router.get('/faults/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await getFaultTrends(days);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================
// ATTENDANCE REPORTS
// ============================================================

// GET /api/reports/attendance/summary - Attendance summary
router.get('/attendance/summary', async (req, res) => {
  try {
    const data = await getAttendanceStats();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/attendance/by-class - Attendance rates per class
router.get('/attendance/by-class', async (req, res) => {
  try {
    const data = await getAttendanceByClass();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/attendance/by-day - Attendance by day of week
router.get('/attendance/by-day', async (req, res) => {
  try {
    const data = await getAttendanceByDay();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/attendance/trends - Attendance trends over time
router.get('/attendance/trends', async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 4;
    const data = await getAttendanceTrends(weeks);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/attendance/absentees - Frequently absent students
router.get('/attendance/absentees', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await getFrequentAbsentees(limit);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================
// EVALUATION REPORTS
// ============================================================

// GET /api/reports/evaluations/summary - Evaluation summary
router.get('/evaluations/summary', async (req, res) => {
  try {
    const data = await getEvaluationStats();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/evaluations/by-class - Evaluations per class
router.get('/evaluations/by-class', async (req, res) => {
  try {
    const data = await getEvaluationsByClass();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/evaluations/response-rates - Guardian response rates
router.get('/evaluations/response-rates', async (req, res) => {
  try {
    const data = await getEvaluationResponseRates();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// POSTS/ANNOUNCEMENTS REPORTS
// ============================================================

// GET /api/reports/posts/summary - Posts summary
router.get('/posts/summary', async (req, res) => {
  try {
    const data = await getPostStats();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/posts/by-audience - Posts by target audience
router.get('/posts/by-audience', async (req, res) => {
  try {
    const data = await getPostsByAudience();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/posts/recent - Recent posts
router.get('/posts/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await getRecentPosts(limit);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================
// SCHEDULE REPORTS
// ============================================================

// GET /api/reports/schedule/summary - Schedule summary
router.get('/schedule/summary', async (req, res) => {
  try {
    const data = await getScheduleStats();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/schedule/teacher-workload - Teacher workload distribution
router.get('/schedule/teacher-workload', async (req, res) => {
  try {
    const data = await getTeacherWorkload();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GUARDIAN REPORTS
// ============================================================

// GET /api/reports/guardians/summary - Guardian summary
router.get('/guardians/summary', async (req, res) => {
  try {
    const data = await getGuardianStats();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/guardians/engagement - Guardian engagement metrics
router.get('/guardians/engagement', async (req, res) => {
  try {
    const data = await getGuardianEngagement();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ACTIVITY REPORTS
// ============================================================

// GET /api/reports/activity/recent - Recent system activity
router.get('/activity/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await getRecentActivity(limit);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function getClassList() {
  const result = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema' ORDER BY table_name`);
  return result.rows.map(r => r.table_name);
}

async function getStudentStats() {
  const classes = await getClassList();
  let total = 0, male = 0, female = 0;
  for (const className of classes) {
    try {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM classes_schema."${className}"`);
      total += parseInt(countResult.rows[0]?.count) || 0;
      const genderResult = await pool.query(`SELECT gender, COUNT(*) as count FROM classes_schema."${className}" WHERE gender IS NOT NULL GROUP BY gender`);
      genderResult.rows.forEach(row => {
        if (row.gender?.toLowerCase() === 'male') male += parseInt(row.count) || 0;
        else if (row.gender?.toLowerCase() === 'female') female += parseInt(row.count) || 0;
      });
    } catch (e) { /* skip */ }
  }
  return { total, male, female, classCount: classes.length };
}

async function getStaffStats() {
  const staffTypes = ['staff_teachers', 'staff_administrative_staff', 'staff_supportive_staff'];
  let total = 0, teachers = 0, admin = 0, support = 0;
  for (const schema of staffTypes) {
    try {
      const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [schema]);
      for (const t of tables.rows) {
        const result = await pool.query(`SELECT COUNT(*) as count FROM "${schema}"."${t.table_name}"`);
        const count = parseInt(result.rows[0]?.count) || 0;
        total += count;
        if (schema === 'staff_teachers') teachers += count;
        else if (schema === 'staff_administrative_staff') admin += count;
        else support += count;
      }
    } catch (e) { /* skip */ }
  }
  return { total, teachers, admin, support };
}

async function getClassStats() {
  const classes = await getClassList();
  return { total: classes.length, list: classes };
}


async function getFaultStats() {
  let total = 0, uniqueStudents = 0, critical = 0, thisWeek = 0;
  try {
    const schemaExists = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'class_students_fault')`);
    if (schemaExists.rows[0]?.exists) {
      const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'class_students_fault'`);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      for (const t of tables.rows) {
        try {
          const result = await pool.query(`SELECT COUNT(*) as total, COUNT(DISTINCT student_name) as unique_students FROM class_students_fault."${t.table_name}"`);
          total += parseInt(result.rows[0]?.total) || 0;
          uniqueStudents += parseInt(result.rows[0]?.unique_students) || 0;
          const criticalResult = await pool.query(`SELECT COUNT(*) as count FROM class_students_fault."${t.table_name}" WHERE LOWER(level) = 'high'`);
          critical += parseInt(criticalResult.rows[0]?.count) || 0;
          const weekResult = await pool.query(`SELECT COUNT(*) as count FROM class_students_fault."${t.table_name}" WHERE date >= $1`, [weekAgo]);
          thisWeek += parseInt(weekResult.rows[0]?.count) || 0;
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* skip */ }
  return { total, uniqueStudents, critical, thisWeek };
}

async function getFaultsByClass() {
  const data = [];
  try {
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'class_students_fault'`);
    for (const t of tables.rows) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count, COUNT(DISTINCT student_name) as students FROM class_students_fault."${t.table_name}"`);
        data.push({ className: t.table_name, faultCount: parseInt(result.rows[0]?.count) || 0, studentCount: parseInt(result.rows[0]?.students) || 0 });
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
  return data.sort((a, b) => b.faultCount - a.faultCount);
}

async function getFaultsByType() {
  const types = {};
  try {
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'class_students_fault'`);
    for (const t of tables.rows) {
      try {
        const result = await pool.query(`SELECT type, COUNT(*) as count FROM class_students_fault."${t.table_name}" WHERE type IS NOT NULL GROUP BY type`);
        result.rows.forEach(row => { types[row.type] = (types[row.type] || 0) + parseInt(row.count); });
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
  return Object.entries(types).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}

async function getFaultsByLevel() {
  const levels = {};
  try {
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'class_students_fault'`);
    for (const t of tables.rows) {
      try {
        const result = await pool.query(`SELECT level, COUNT(*) as count FROM class_students_fault."${t.table_name}" WHERE level IS NOT NULL GROUP BY level`);
        result.rows.forEach(row => { levels[row.level] = (levels[row.level] || 0) + parseInt(row.count); });
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
  return Object.entries(levels).map(([level, count]) => ({ level, count })).sort((a, b) => b.count - a.count);
}


async function getRecentFaults(days, limit) {
  const data = [];
  const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - days);
  try {
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'class_students_fault'`);
    for (const t of tables.rows) {
      try {
        const result = await pool.query(`SELECT student_name, type, level, date, description FROM class_students_fault."${t.table_name}" WHERE date >= $1 ORDER BY date DESC LIMIT $2`, [cutoffDate, limit]);
        result.rows.forEach(row => { data.push({ ...row, className: t.table_name, daysAgo: Math.floor((new Date() - new Date(row.date)) / (1000 * 60 * 60 * 24)) }); });
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
  return data.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}

async function getTopOffenders(limit) {
  const students = {};
  try {
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'class_students_fault'`);
    for (const t of tables.rows) {
      try {
        const result = await pool.query(`SELECT student_name, COUNT(*) as count FROM class_students_fault."${t.table_name}" GROUP BY student_name`);
        result.rows.forEach(row => {
          if (!students[row.student_name]) students[row.student_name] = { studentName: row.student_name, faultCount: 0, classes: [] };
          students[row.student_name].faultCount += parseInt(row.count);
          if (!students[row.student_name].classes.includes(t.table_name)) students[row.student_name].classes.push(t.table_name);
        });
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
  return Object.values(students).sort((a, b) => b.faultCount - a.faultCount).slice(0, limit);
}

async function getFaultTrends(days) {
  const trends = {};
  const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - days);
  try {
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'class_students_fault'`);
    for (const t of tables.rows) {
      try {
        const result = await pool.query(`SELECT DATE(date) as fault_date, COUNT(*) as count FROM class_students_fault."${t.table_name}" WHERE date >= $1 GROUP BY DATE(date)`, [cutoffDate]);
        result.rows.forEach(row => { const d = row.fault_date.toISOString().split('T')[0]; trends[d] = (trends[d] || 0) + parseInt(row.count); });
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
  return Object.entries(trends).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
}


async function getAttendanceStats() {
  let totalRecords = 0, present = 0, absent = 0, late = 0, permission = 0;
  try {
    const schemas = await pool.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'class_%_attendance'`);
    for (const s of schemas.rows) {
      const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [s.schema_name]);
      for (const t of tables.rows) {
        try {
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
          for (const day of days) {
            const result = await pool.query(`SELECT ${day}, COUNT(*) as count FROM "${s.schema_name}"."${t.table_name}" WHERE ${day} IS NOT NULL GROUP BY ${day}`);
            result.rows.forEach(row => {
              const count = parseInt(row.count) || 0;
              totalRecords += count;
              const status = row[day]?.toLowerCase();
              if (status === 'p' || status === 'present') present += count;
              else if (status === 'a' || status === 'absent') absent += count;
              else if (status === 'l' || status === 'late') late += count;
              else if (status === 'e' || status === 'permission') permission += count;
            });
          }
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* skip */ }
  const rate = totalRecords > 0 ? ((present / totalRecords) * 100).toFixed(1) : 0;
  return { totalRecords, present, absent, late, permission, attendanceRate: rate };
}

async function getAttendanceByClass() {
  const data = [];
  try {
    const schemas = await pool.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'class_%_attendance'`);
    for (const s of schemas.rows) {
      const className = s.schema_name.replace('class_', '').replace('_attendance', '');
      let present = 0, total = 0;
      const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [s.schema_name]);
      for (const t of tables.rows) {
        try {
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
          for (const day of days) {
            const result = await pool.query(`SELECT ${day}, COUNT(*) as count FROM "${s.schema_name}"."${t.table_name}" WHERE ${day} IS NOT NULL GROUP BY ${day}`);
            result.rows.forEach(row => {
              const count = parseInt(row.count) || 0;
              total += count;
              if (row[day]?.toLowerCase() === 'p' || row[day]?.toLowerCase() === 'present') present += count;
            });
          }
        } catch (e) { /* skip */ }
      }
      const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
      data.push({ className, present, total, attendanceRate: parseFloat(rate) });
    }
  } catch (e) { /* skip */ }
  return data.sort((a, b) => b.attendanceRate - a.attendanceRate);
}

async function getAttendanceByDay() {
  const days = { monday: { present: 0, total: 0 }, tuesday: { present: 0, total: 0 }, wednesday: { present: 0, total: 0 }, thursday: { present: 0, total: 0 }, friday: { present: 0, total: 0 } };
  try {
    const schemas = await pool.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'class_%_attendance'`);
    for (const s of schemas.rows) {
      const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [s.schema_name]);
      for (const t of tables.rows) {
        for (const day of Object.keys(days)) {
          try {
            const result = await pool.query(`SELECT ${day}, COUNT(*) as count FROM "${s.schema_name}"."${t.table_name}" WHERE ${day} IS NOT NULL GROUP BY ${day}`);
            result.rows.forEach(row => {
              days[day].total += parseInt(row.count) || 0;
              if (row[day]?.toLowerCase() === 'p' || row[day]?.toLowerCase() === 'present') days[day].present += parseInt(row.count) || 0;
            });
          } catch (e) { /* skip */ }
        }
      }
    }
  } catch (e) { /* skip */ }
  return Object.entries(days).map(([day, stats]) => ({ day, ...stats, rate: stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0 }));
}


async function getAttendanceTrends(weeks) { return []; /* Implement based on your data structure */ }
async function getFrequentAbsentees(limit) { return []; /* Implement based on your data structure */ }

async function getClassPerformance() {
  const data = [];
  try {
    const classes = await getClassList();
    for (const className of classes) {
      let totalScore = 0, studentCount = 0, subjectCount = 0;
      const schemaCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'subjects_of_school_schema')`);
      if (schemaCheck.rows[0]?.exists) {
        const subjects = await pool.query(`SELECT subject_name FROM subjects_of_school_schema.subject_class_mappings WHERE class_name = $1`, [className]);
        for (const sub of subjects.rows) {
          const schemaName = `subject_${sub.subject_name.toLowerCase().replace(/\s+/g, '_')}_schema`;
          const tableName = `${className.toLowerCase()}_term_1`;
          try {
            const tableExists = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`, [schemaName, tableName]);
            if (tableExists.rows[0]?.exists) {
              const marks = await pool.query(`SELECT AVG(total) as avg, COUNT(*) as count FROM "${schemaName}"."${tableName}" WHERE total IS NOT NULL`);
              if (marks.rows[0]?.avg) { totalScore += parseFloat(marks.rows[0].avg); subjectCount++; studentCount = Math.max(studentCount, parseInt(marks.rows[0].count) || 0); }
            }
          } catch (e) { /* skip */ }
        }
      }
      if (subjectCount > 0) data.push({ className, average: (totalScore / subjectCount).toFixed(1), studentCount, subjectCount });
    }
  } catch (e) { /* skip */ }
  return data.sort((a, b) => parseFloat(b.average) - parseFloat(a.average));
}

async function getSubjectAverages() {
  const subjects = {};
  try {
    const schemaCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'subjects_of_school_schema')`);
    if (schemaCheck.rows[0]?.exists) {
      const mappings = await pool.query(`SELECT DISTINCT subject_name FROM subjects_of_school_schema.subject_class_mappings`);
      for (const sub of mappings.rows) {
        const schemaName = `subject_${sub.subject_name.toLowerCase().replace(/\s+/g, '_')}_schema`;
        try {
          const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name LIKE '%_term_%'`, [schemaName]);
          let total = 0, count = 0;
          for (const t of tables.rows) {
            const marks = await pool.query(`SELECT AVG(total) as avg FROM "${schemaName}"."${t.table_name}" WHERE total IS NOT NULL`);
            if (marks.rows[0]?.avg) { total += parseFloat(marks.rows[0].avg); count++; }
          }
          if (count > 0) subjects[sub.subject_name] = (total / count).toFixed(1);
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* skip */ }
  return Object.entries(subjects).map(([subject, average]) => ({ subject, average: parseFloat(average) })).sort((a, b) => b.average - a.average);
}


async function getTopPerformers(limit) {
  const students = [];
  try {
    const classes = await getClassList();
    for (const className of classes) {
      const schemaCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'subjects_of_school_schema')`);
      if (schemaCheck.rows[0]?.exists) {
        const subjects = await pool.query(`SELECT subject_name FROM subjects_of_school_schema.subject_class_mappings WHERE class_name = $1`, [className]);
        const studentScores = {};
        for (const sub of subjects.rows) {
          const schemaName = `subject_${sub.subject_name.toLowerCase().replace(/\s+/g, '_')}_schema`;
          const tableName = `${className.toLowerCase()}_term_1`;
          try {
            const tableExists = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`, [schemaName, tableName]);
            if (tableExists.rows[0]?.exists) {
              const marks = await pool.query(`SELECT student_name, total FROM "${schemaName}"."${tableName}" WHERE total IS NOT NULL`);
              marks.rows.forEach(row => {
                if (!studentScores[row.student_name]) studentScores[row.student_name] = { studentName: row.student_name, className, totalScore: 0, subjectCount: 0 };
                studentScores[row.student_name].totalScore += parseFloat(row.total) || 0;
                studentScores[row.student_name].subjectCount++;
              });
            }
          } catch (e) { /* skip */ }
        }
        Object.values(studentScores).forEach(s => { if (s.subjectCount > 0) { s.averageScore = (s.totalScore / s.subjectCount).toFixed(1); students.push(s); } });
      }
    }
  } catch (e) { /* skip */ }
  return students.sort((a, b) => parseFloat(b.averageScore) - parseFloat(a.averageScore)).slice(0, limit);
}

async function getBottomPerformers(limit) {
  const students = await getTopPerformers(1000);
  return students.sort((a, b) => parseFloat(a.averageScore) - parseFloat(b.averageScore)).slice(0, limit);
}

async function getClassRankings() {
  const data = await getClassPerformance();
  return data.map((cls, index) => ({ ...cls, rank: index + 1 }));
}

async function getPassFailRates() {
  const data = [];
  try {
    const classes = await getClassList();
    for (const className of classes) {
      let pass = 0, fail = 0;
      const schemaCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'subjects_of_school_schema')`);
      if (schemaCheck.rows[0]?.exists) {
        const subjects = await pool.query(`SELECT subject_name FROM subjects_of_school_schema.subject_class_mappings WHERE class_name = $1`, [className]);
        for (const sub of subjects.rows) {
          const schemaName = `subject_${sub.subject_name.toLowerCase().replace(/\s+/g, '_')}_schema`;
          const tableName = `${className.toLowerCase()}_term_1`;
          try {
            const tableExists = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`, [schemaName, tableName]);
            if (tableExists.rows[0]?.exists) {
              const result = await pool.query(`SELECT pass_status, COUNT(*) as count FROM "${schemaName}"."${tableName}" WHERE pass_status IS NOT NULL GROUP BY pass_status`);
              result.rows.forEach(row => { if (row.pass_status === 'Pass') pass += parseInt(row.count); else fail += parseInt(row.count); });
            }
          } catch (e) { /* skip */ }
        }
      }
      const total = pass + fail;
      if (total > 0) data.push({ className, pass, fail, total, passRate: ((pass / total) * 100).toFixed(1), failRate: ((fail / total) * 100).toFixed(1) });
    }
  } catch (e) { /* skip */ }
  return data.sort((a, b) => parseFloat(b.passRate) - parseFloat(a.passRate));
}


async function getEvaluationStats() {
  let total = 0, responded = 0, pending = 0;
  try {
    const schemaCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'evaluation_book_schema')`);
    if (schemaCheck.rows[0]?.exists) {
      const tableCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'evaluation_book_schema' AND table_name = 'daily_evaluations')`);
      if (tableCheck.rows[0]?.exists) {
        const result = await pool.query(`SELECT COUNT(*) as total, SUM(CASE WHEN guardian_response IS NOT NULL THEN 1 ELSE 0 END) as responded FROM evaluation_book_schema.daily_evaluations`);
        total = parseInt(result.rows[0]?.total) || 0;
        responded = parseInt(result.rows[0]?.responded) || 0;
        pending = total - responded;
      }
    }
  } catch (e) { /* skip */ }
  const responseRate = total > 0 ? ((responded / total) * 100).toFixed(1) : 0;
  return { total, responded, pending, responseRate };
}

async function getEvaluationsByClass() { return []; /* Implement based on your data structure */ }
async function getEvaluationResponseRates() { return []; /* Implement based on your data structure */ }

async function getPostStats() {
  let total = 0, thisWeek = 0, thisMonth = 0;
  try {
    const schemaCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'posts_schema')`);
    if (schemaCheck.rows[0]?.exists) {
      const result = await pool.query(`SELECT COUNT(*) as total FROM posts_schema.posts`);
      total = parseInt(result.rows[0]?.total) || 0;
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const weekResult = await pool.query(`SELECT COUNT(*) as count FROM posts_schema.posts WHERE created_at >= $1`, [weekAgo]);
      thisWeek = parseInt(weekResult.rows[0]?.count) || 0;
      const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
      const monthResult = await pool.query(`SELECT COUNT(*) as count FROM posts_schema.posts WHERE created_at >= $1`, [monthAgo]);
      thisMonth = parseInt(monthResult.rows[0]?.count) || 0;
    }
  } catch (e) { /* skip */ }
  return { total, thisWeek, thisMonth };
}

async function getPostsByAudience() {
  const data = [];
  try {
    const schemaCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'posts_schema')`);
    if (schemaCheck.rows[0]?.exists) {
      const tableCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'posts_schema' AND table_name = 'post_audiences')`);
      if (tableCheck.rows[0]?.exists) {
        const result = await pool.query(`SELECT audience_type, COUNT(*) as count FROM posts_schema.post_audiences GROUP BY audience_type`);
        result.rows.forEach(row => data.push({ audience: row.audience_type, count: parseInt(row.count) }));
      }
    }
  } catch (e) { /* skip */ }
  return data.sort((a, b) => b.count - a.count);
}

async function getRecentPosts(limit) {
  const data = [];
  try {
    const schemaCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'posts_schema')`);
    if (schemaCheck.rows[0]?.exists) {
      const result = await pool.query(`SELECT id, title, author_name, author_type, created_at, likes, comments FROM posts_schema.posts ORDER BY created_at DESC LIMIT $1`, [limit]);
      result.rows.forEach(row => data.push({ ...row, daysAgo: Math.floor((new Date() - new Date(row.created_at)) / (1000 * 60 * 60 * 24)) }));
    }
  } catch (e) { /* skip */ }
  return data;
}


async function getScheduleStats() {
  let totalTeachers = 0, totalClasses = 0, totalPeriods = 0;
  try {
    const schemaCheck = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'schedule_schema')`);
    if (schemaCheck.rows[0]?.exists) {
      const teacherResult = await pool.query(`SELECT COUNT(*) as count FROM schedule_schema.teachers`);
      totalTeachers = parseInt(teacherResult.rows[0]?.count) || 0;
      const periodResult = await pool.query(`SELECT COUNT(*) as count FROM school_schema_points.teachers_period`);
      totalPeriods = parseInt(periodResult.rows[0]?.count) || 0;
    }
    totalClasses = (await getClassList()).length;
  } catch (e) { /* skip */ }
  return { totalTeachers, totalClasses, totalPeriods };
}

async function getTeacherWorkload() {
  const data = [];
  try {
    const result = await pool.query(`SELECT teacher_name, COUNT(*) as periods FROM school_schema_points.teachers_period GROUP BY teacher_name ORDER BY periods DESC`);
    result.rows.forEach(row => data.push({ teacherName: row.teacher_name, periods: parseInt(row.periods) }));
  } catch (e) { /* skip */ }
  return data;
}

async function getGuardianStats() {
  let total = 0, withAccounts = 0;
  try {
    const classes = await getClassList();
    for (const className of classes) {
      try {
        const result = await pool.query(`SELECT COUNT(DISTINCT guardian_name) as total, COUNT(DISTINCT guardian_username) as with_accounts FROM classes_schema."${className}" WHERE guardian_name IS NOT NULL`);
        total += parseInt(result.rows[0]?.total) || 0;
        withAccounts += parseInt(result.rows[0]?.with_accounts) || 0;
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
  return { total, withAccounts, withoutAccounts: total - withAccounts };
}

async function getGuardianEngagement() { return { responseRate: 0, activeGuardians: 0 }; /* Implement based on your data */ }

async function getRecentActivity(limit) {
  const activities = [];
  // Get recent faults
  const faults = await getRecentFaults(7, 5);
  faults.forEach(f => activities.push({ type: 'fault', title: 'Student Fault', description: `${f.student_name} - ${f.type}`, date: f.date, className: f.className }));
  // Get recent posts
  const posts = await getRecentPosts(5);
  posts.forEach(p => activities.push({ type: 'post', title: p.title, description: `By ${p.author_name}`, date: p.created_at }));
  return activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}

module.exports = router;
