const prisma = require('../prisma/client');
const pool = require('../config/db'); // For legacy queries

// Helper: Get teacher's classes from existing markListRoutes data
async function getTeacherClasses(teacherId) {
  const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { name: true } });
  if (!teacher) return [];
  const result = await pool.query(`
    SELECT subject_class FROM subjects_of_school_schema.teachers_subjects 
    WHERE teacher_name = $1
  `, [teacher.name]);
  return result.rows.map(row => {
    const parts = row.subject_class.split(' Class ');
    return { subject: parts[0], className: parts[1] };
  });
}

// Helper: Get guardians from specific classes (query per-class tables)
async function getGuardiansFromClasses(classes) {
  const allGuardians = [];
  const tablesResult = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['classes_schema']);
  const tables = tablesResult.rows.map(r => r.table_name);
  for (const cls of classes) {
    if (tables.includes(cls.className)) {
      const result = await pool.query(`
        SELECT DISTINCT guardian_name, guardian_username FROM classes_schema."${cls.className}" 
        WHERE guardian_username IS NOT NULL
      `);
      allGuardians.push(...result.rows.map(row => ({
        id: row.guardian_username, // Assume username as temp id; map to User.id if needed
        name: row.guardian_name,
        className: cls.className,
        studentName: 'Multiple' // Aggregate or query per student
      })));
    }
  }
  return allGuardians; // Group in frontend if needed
}

// Helper: Get guardian's classes from students
async function getGuardianClasses(guardianId) {
  // Query all class tables for guardian_username
  const gUser = await prisma.user.findUnique({ where: { id: guardianId }, select: { username: true } });
  if (!gUser) return [];
  const tablesResult = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['classes_schema']);
  const tables = tablesResult.rows.map(r => r.table_name);
  const classes = [];
  for (const table of tables) {
    const result = await pool.query(`SELECT * FROM classes_schema."${table}" WHERE guardian_username = $1`, [gUser.username]);
    if (result.rows.length > 0) {
      classes.push(table); // className = table
    }
  }
  return classes;
}

// Helper: Get teachers from classes
async function getTeachersFromClasses(classes) {
  const allTeachers = [];
  for (const className of classes) {
    const result = await pool.query(`
      SELECT DISTINCT teacher_name FROM subjects_of_school_schema.teachers_subjects 
      WHERE subject_class LIKE $1
    `, [`% Class ${className}`]);
    allTeachers.push(...result.rows.map(row => ({
      id: row.teacher_name, // Temp; map to User.id
      name: row.teacher_name,
      className,
      subject: 'Multiple' // Extract from subject_class
    })));
  }
  return allTeachers;
}

async function canSendMessage(senderId, recipientId) {
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { role: true } });
  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } });

  if (!sender || !recipient) return false;

  // Director <-> Guardian
  if (sender.role === 'director' && recipient.role === 'guardian') return true;
  if (sender.role === 'guardian' && recipient.role === 'director') return true;

  // Teacher <-> Guardian: check shared class
  if ((sender.role === 'teacher' && recipient.role === 'guardian') || 
      (sender.role === 'guardian' && recipient.role === 'teacher')) {
    const teacherId = sender.role === 'teacher' ? senderId : recipientId;
    const guardianId = sender.role === 'guardian' ? senderId : recipientId;
    const teacherClasses = await getTeacherClasses(teacherId);
    const guardianClasses = await getGuardianClasses(guardianId);
    const shared = teacherClasses.some(tc => guardianClasses.includes(tc.className));
    return shared;
  }

  return false;
}

module.exports = { canSendMessage, getTeacherClasses, getGuardiansFromClasses, getGuardianClasses, getTeachersFromClasses };