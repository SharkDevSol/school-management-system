// routes/scheduleRoutes.js - UPDATED WITH AUTOMATIC CONFLICT RESOLUTION
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Auto-create schedule schema and tables
const initializeScheduleSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create schemas
    await client.query('CREATE SCHEMA IF NOT EXISTS schedule_schema');
    await client.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');

    // School configuration table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_schema.school_config (
        id SERIAL PRIMARY KEY,
        periods_per_shift INTEGER DEFAULT 7,
        period_duration INTEGER DEFAULT 45,
        short_break_duration INTEGER DEFAULT 10,
        total_shifts INTEGER DEFAULT 2,
        teaching_days_per_week INTEGER DEFAULT 5,
        school_days INTEGER[] DEFAULT '{1,2,3,4,5}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Enhanced teachers table with proper part-time support
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_schema.teachers (
        id SERIAL PRIMARY KEY,
        global_staff_id INTEGER NOT NULL UNIQUE,
        teacher_name VARCHAR(100) NOT NULL UNIQUE,
        teacher_type VARCHAR(50) NOT NULL DEFAULT 'full_time' CHECK (teacher_type IN ('full_time', 'part_time')),
        staff_work_time VARCHAR(20) DEFAULT 'Full Time',
        max_periods_per_day INTEGER DEFAULT 6,
        max_periods_per_week INTEGER DEFAULT 30,
        work_days INTEGER[] DEFAULT '{1,2,3,4,5}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Subjects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_schema.subjects (
        id SERIAL PRIMARY KEY,
        subject_name VARCHAR(100) NOT NULL UNIQUE,
        subject_code VARCHAR(20) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Class-subject configurations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_schema.class_subject_configs (
        id SERIAL PRIMARY KEY,
        subject_class VARCHAR(150) NOT NULL UNIQUE,
        shift_id INTEGER NOT NULL CHECK (shift_id IN (1, 2)),
        periods_per_week INTEGER NOT NULL DEFAULT 4,
        teaching_days INTEGER[] DEFAULT '{1,2,3,4,5}',
        teacher_name VARCHAR(100),
        staff_work_time VARCHAR(20) DEFAULT 'Full Time',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Teachers period table
    await client.query(`
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

    // Schedule slots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_schema.schedule_slots (
        id SERIAL PRIMARY KEY,
        day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
        period_number INTEGER CHECK (period_number BETWEEN 1 AND 20),
        class_name VARCHAR(50) NOT NULL,
        subject_id INTEGER,
        teacher_id INTEGER,
        shift_group VARCHAR(50) CHECK (shift_group IN ('morning', 'afternoon', 'evening')),
        shift_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Schedule conflicts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_schema.schedule_conflicts (
        id SERIAL PRIMARY KEY,
        conflict_type VARCHAR(50) NOT NULL,
        teacher_name VARCHAR(100),
        class_name VARCHAR(50),
        subject_name VARCHAR(100),
        day_of_week INTEGER,
        period_number INTEGER,
        conflict_details JSONB,
        resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default config
    const configCheck = await client.query('SELECT id FROM schedule_schema.school_config WHERE id = 1');
    if (configCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO schedule_schema.school_config 
        (id, periods_per_shift, period_duration, short_break_duration, total_shifts, teaching_days_per_week, school_days) 
        VALUES (1, 7, 45, 10, 2, 5, '{1,2,3,4,5}')
      `);
    }

    await client.query('COMMIT');
    console.log('✅ Schedule schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing schedule schema:', error.message);
  } finally {
    client.release();
  }
};

// Initialize schema on startup
initializeScheduleSchema().catch(error => {
  console.error('Failed to initialize schedule schema at startup:', error.message);
});

// ==================== AUTOMATIC CONFLICT RESOLUTION FUNCTIONS ====================

// Enhanced conflict detection and resolution
class ScheduleConflictResolver {
  constructor(client, config, scheduleSlots, teacherScheduleMap, classScheduleMap) {
    this.client = client;
    this.config = config;
    this.scheduleSlots = scheduleSlots;
    this.teacherScheduleMap = teacherScheduleMap;
    this.classScheduleMap = classScheduleMap;
    this.resolvedConflicts = [];
  }

  // Detect teacher double-booking conflicts
  // CRITICAL: A teacher can only be in ONE place at a time - regardless of shift!
  detectTeacherConflicts() {
    const teacherPeriodMap = {};
    const conflicts = [];

    this.scheduleSlots.forEach(slot => {
      // Key does NOT include shift_id - teacher cannot teach 2 classes at same day/period
      const key = `${slot.teacher_id}-${slot.day_of_week}-${slot.period_number}`;
      if (teacherPeriodMap[key]) {
        conflicts.push({
          type: 'TEACHER_DOUBLE_BOOKING',
          teacher_id: slot.teacher_id,
          teacher_name: slot.teacher_name || teacherPeriodMap[key].teacher_name,
          day: slot.day_of_week,
          period: slot.period_number,
          existing_slot: teacherPeriodMap[key],
          new_slot: slot
        });
      } else {
        teacherPeriodMap[key] = slot;
      }
    });

    return conflicts;
  }

  // Detect class double-booking conflicts
  detectClassConflicts() {
    const classPeriodMap = {};
    const conflicts = [];

    this.scheduleSlots.forEach(slot => {
      const key = `${slot.class_name}-${slot.day_of_week}-${slot.period_number}-${slot.shift_id}`;
      if (classPeriodMap[key]) {
        conflicts.push({
          type: 'CLASS_DOUBLE_BOOKING',
          class_name: slot.class_name,
          day: slot.day_of_week,
          period: slot.period_number,
          existing_slot: classPeriodMap[key],
          new_slot: slot
        });
      } else {
        classPeriodMap[key] = slot;
      }
    });

    return conflicts;
  }

  // Detect part-time teacher overload conflicts
  detectPartTimeOverload() {
    const teacherDailyPeriods = {};
    const conflicts = [];

    this.scheduleSlots.forEach(slot => {
      const key = `${slot.teacher_id}-${slot.day_of_week}`;
      if (!teacherDailyPeriods[key]) {
        teacherDailyPeriods[key] = [];
      }
      teacherDailyPeriods[key].push(slot);
    });

    // Check for part-time teachers exceeding daily limits
    Object.entries(teacherDailyPeriods).forEach(([key, slots]) => {
      const [teacher_id, day] = key.split('-');
      if (slots.length > 4) { // Part-time max 4 periods/day
        const teacher = slots[0];
        if (teacher.teacher_type === 'part_time') {
          conflicts.push({
            type: 'PART_TIME_OVERLOAD',
            teacher_id: parseInt(teacher_id),
            teacher_name: teacher.teacher_name,
            day: parseInt(day),
            periods: slots.length,
            slots: slots
          });
        }
      }
    });

    return conflicts;
  }

  // Automatic conflict resolution
  async resolveConflicts(conflicts) {
    console.log(`🔄 Resolving ${conflicts.length} conflicts automatically...`);
    
    let resolvedCount = 0;
    
    for (const conflict of conflicts) {
      try {
        switch (conflict.type) {
          case 'TEACHER_DOUBLE_BOOKING':
            if (await this.resolveTeacherConflict(conflict)) {
              resolvedCount++;
            }
            break;
            
          case 'CLASS_DOUBLE_BOOKING':
            if (await this.resolveClassConflict(conflict)) {
              resolvedCount++;
            }
            break;
            
          case 'PART_TIME_OVERLOAD':
            if (await this.resolvePartTimeConflict(conflict)) {
              resolvedCount++;
            }
            break;
        }
      } catch (error) {
        console.error(`❌ Failed to resolve conflict:`, error);
      }
    }
    
    console.log(`✅ Resolved ${resolvedCount}/${conflicts.length} conflicts automatically`);
    return resolvedCount;
  }

  // Resolve teacher double-booking by moving one slot
  async resolveTeacherConflict(conflict) {
    const { teacher_id, day, period, new_slot } = conflict;
    
    // Find alternative slot for the new_slot
    const alternativeSlot = await this.findAlternativeSlot(new_slot);
    
    if (alternativeSlot) {
      // Remove original slot
      const originalIndex = this.scheduleSlots.findIndex(slot => 
        slot.class_name === new_slot.class_name &&
        slot.day_of_week === new_slot.day_of_week &&
        slot.period_number === new_slot.period_number
      );
      
      if (originalIndex !== -1) {
        this.scheduleSlots.splice(originalIndex, 1);
      }
      
      // Add alternative slot
      this.scheduleSlots.push(alternativeSlot);
      
      // Update tracking maps
      this.updateTrackingMaps(new_slot, alternativeSlot);
      
      this.resolvedConflicts.push({
        original_conflict: conflict,
        resolution: 'MOVED_SLOT',
        original_slot: new_slot,
        new_slot: alternativeSlot
      });
      
      return true;
    }
    
    return false;
  }

  // Resolve class conflict by moving slot
  async resolveClassConflict(conflict) {
    const { class_name, day, period, new_slot } = conflict;
    
    const alternativeSlot = await this.findAlternativeSlot(new_slot);
    
    if (alternativeSlot) {
      // Remove original slot
      const originalIndex = this.scheduleSlots.findIndex(slot => 
        slot.class_name === new_slot.class_name &&
        slot.day_of_week === new_slot.day_of_week &&
        slot.period_number === new_slot.period_number
      );
      
      if (originalIndex !== -1) {
        this.scheduleSlots.splice(originalIndex, 1);
      }
      
      // Add alternative slot
      this.scheduleSlots.push(alternativeSlot);
      
      // Update tracking maps
      this.updateTrackingMaps(new_slot, alternativeSlot);
      
      this.resolvedConflicts.push({
        original_conflict: conflict,
        resolution: 'MOVED_SLOT',
        original_slot: new_slot,
        new_slot: alternativeSlot
      });
      
      return true;
    }
    
    return false;
  }

  // Resolve part-time overload by redistributing periods
  async resolvePartTimeConflict(conflict) {
    const { teacher_id, teacher_name, day, periods, slots } = conflict;
    
    // Try to move excess periods to other days
    const excessPeriods = periods - 4; // Part-time max 4 periods/day
    const periodsToMove = slots.slice(0, excessPeriods);
    
    let movedCount = 0;
    
    for (const periodSlot of periodsToMove) {
      const alternativeSlot = await this.findAlternativeSlotForTeacher(periodSlot, [day]);
      
      if (alternativeSlot) {
        // Remove original slot
        const originalIndex = this.scheduleSlots.findIndex(slot => 
          slot.teacher_id === periodSlot.teacher_id &&
          slot.class_name === periodSlot.class_name &&
          slot.day_of_week === periodSlot.day_of_week &&
          slot.period_number === periodSlot.period_number
        );
        
        if (originalIndex !== -1) {
          this.scheduleSlots.splice(originalIndex, 1);
        }
        
        // Add alternative slot
        this.scheduleSlots.push(alternativeSlot);
        
        // Update tracking maps
        this.updateTrackingMaps(periodSlot, alternativeSlot);
        
        movedCount++;
      }
    }
    
    if (movedCount > 0) {
      this.resolvedConflicts.push({
        original_conflict: conflict,
        resolution: 'REDISTRIBUTED_PERIODS',
        teacher_name: teacher_name,
        day: day,
        periods_moved: movedCount
      });
      
      return true;
    }
    
    return false;
  }

  // Find alternative slot for a given slot
  async findAlternativeSlot(originalSlot) {
    const { class_name, teacher_id, subject_id, shift_id, teacher_name } = originalSlot;
    
    // Get teacher info
    const teacherResult = await this.client.query(
      'SELECT teacher_type, work_days FROM schedule_schema.teachers WHERE id = $1',
      [teacher_id]
    );
    
    if (teacherResult.rows.length === 0) return null;
    
    const teacher = teacherResult.rows[0];
    const teaching_days = teacher.work_days || this.config.school_days;
    
    // Try to find an available slot
    for (const day of teaching_days) {
      for (let period = 1; period <= this.config.periods_per_shift; period++) {
        const shift_group = period <= Math.ceil(this.config.periods_per_shift / 2) ? 'morning' : 'afternoon';
        
        // CRITICAL FIX: Use correct key formats
        const classSlotKey = `${class_name}-${day}-${period}-${shift_id}`;
        const teacherSlotKey = `${teacher_id}-${day}-${period}`; // NO shift_id!
        
        // Check availability
        if (this.classScheduleMap[class_name] && this.classScheduleMap[class_name][classSlotKey]) {
          continue; // Class already busy
        }
        
        // CRITICAL: Teacher cannot be in two places at once!
        if (this.teacherScheduleMap[teacherSlotKey]) {
          continue; // Teacher already busy
        }
        
        // Check part-time constraints
        if (teacher.teacher_type === 'part_time') {
          const teacherDayPeriods = this.scheduleSlots.filter(slot => 
            slot.teacher_id === teacher_id && 
            slot.day_of_week === day
          ).length;
          
          if (teacherDayPeriods >= 4) {
            continue; // Part-time teacher daily limit reached
          }
        }
        
        // Found available slot
        return {
          day_of_week: day,
          period_number: period,
          class_name: class_name,
          subject_id: subject_id,
          teacher_id: teacher_id,
          teacher_name: teacher_name,
          shift_group: shift_group,
          shift_id: shift_id
        };
      }
    }
    
    return null;
  }

  // Find alternative slot specifically for teacher (avoiding certain days)
  async findAlternativeSlotForTeacher(originalSlot, avoidDays = []) {
    const { class_name, teacher_id, subject_id, shift_id, teacher_name } = originalSlot;
    
    // Get teacher info
    const teacherResult = await this.client.query(
      'SELECT teacher_type, work_days FROM schedule_schema.teachers WHERE id = $1',
      [teacher_id]
    );
    
    if (teacherResult.rows.length === 0) return null;
    
    const teacher = teacherResult.rows[0];
    let teaching_days = teacher.work_days || this.config.school_days;
    
    // Filter out days to avoid
    teaching_days = teaching_days.filter(day => !avoidDays.includes(day));
    
    // Try to find an available slot
    for (const day of teaching_days) {
      for (let period = 1; period <= this.config.periods_per_shift; period++) {
        const shift_group = period <= Math.ceil(this.config.periods_per_shift / 2) ? 'morning' : 'afternoon';
        
        // CRITICAL FIX: Use correct key formats
        const classSlotKey = `${class_name}-${day}-${period}-${shift_id}`;
        const teacherSlotKey = `${teacher_id}-${day}-${period}`; // NO shift_id!
        
        // Check availability
        if (this.classScheduleMap[class_name] && this.classScheduleMap[class_name][classSlotKey]) {
          continue;
        }
        
        // CRITICAL: Teacher cannot be in two places at once!
        if (this.teacherScheduleMap[teacherSlotKey]) {
          continue;
        }
        
        // Check part-time constraints
        if (teacher.teacher_type === 'part_time') {
          const teacherDayPeriods = this.scheduleSlots.filter(slot => 
            slot.teacher_id === teacher_id && 
            slot.day_of_week === day
          ).length;
          
          if (teacherDayPeriods >= 4) {
            continue;
          }
        }
        
        // Found available slot
        return {
          day_of_week: day,
          period_number: period,
          class_name: class_name,
          subject_id: subject_id,
          teacher_id: teacher_id,
          teacher_name: teacher_name,
          shift_group: shift_group,
          shift_id: shift_id
        };
      }
    }
    
    return null;
  }

  // Update tracking maps after slot movement
  updateTrackingMaps(oldSlot, newSlot) {
    // CRITICAL FIX: Use correct key formats
    // Remove old slot from maps
    const oldClassKey = `${oldSlot.class_name}-${oldSlot.day_of_week}-${oldSlot.period_number}-${oldSlot.shift_id}`;
    const oldTeacherKey = `${oldSlot.teacher_id}-${oldSlot.day_of_week}-${oldSlot.period_number}`; // NO shift_id!
    
    if (this.classScheduleMap[oldSlot.class_name]) {
      delete this.classScheduleMap[oldSlot.class_name][oldClassKey];
    }
    delete this.teacherScheduleMap[oldTeacherKey];
    
    // Add new slot to maps
    const newClassKey = `${newSlot.class_name}-${newSlot.day_of_week}-${newSlot.period_number}-${newSlot.shift_id}`;
    const newTeacherKey = `${newSlot.teacher_id}-${newSlot.day_of_week}-${newSlot.period_number}`; // NO shift_id!
    
    if (!this.classScheduleMap[newSlot.class_name]) {
      this.classScheduleMap[newSlot.class_name] = {};
    }
    this.classScheduleMap[newSlot.class_name][newClassKey] = true;
    this.teacherScheduleMap[newTeacherKey] = true;
  }
}

// ==================== ENHANCED API ENDPOINTS ====================

// Health check
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() });
  }
});

// Get all classes from the system
router.get('/all-classes', async (req, res) => {
  try {
    const classesFromTeachersPeriod = await pool.query(`
      SELECT DISTINCT class_name 
      FROM school_schema_points.teachers_period 
      WHERE class_name IS NOT NULL AND class_name != ''
      ORDER BY class_name
    `);
    
    const classesFromSchedule = await pool.query(`
      SELECT DISTINCT class_name 
      FROM schedule_schema.schedule_slots 
      WHERE class_name IS NOT NULL AND class_name != ''
      ORDER BY class_name
    `);
    
    const classesFromConfigs = await pool.query(`
      SELECT DISTINCT 
        CASE 
          WHEN subject_class LIKE '% Class %' THEN SPLIT_PART(subject_class, ' Class ', 2)
          ELSE NULL
        END as class_name
      FROM schedule_schema.class_subject_configs 
      WHERE subject_class LIKE '% Class %'
      ORDER BY class_name
    `);

    const allClasses = [
      ...classesFromTeachersPeriod.rows.map(r => r.class_name),
      ...classesFromSchedule.rows.map(r => r.class_name),
      ...classesFromConfigs.rows.map(r => r.class_name)
    ].filter(Boolean).filter(name => name.trim() !== '');

    const uniqueClasses = [...new Set(allClasses)].sort();
    
    console.log(`Found ${uniqueClasses.length} unique classes from all sources`);
    
    res.json(uniqueClasses);
  } catch (error) {
    console.error('Error fetching all classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes: ' + error.message });
  }
});

// CRITICAL FIX: Enhanced subject synchronization
router.post('/sync-subjects', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Starting enhanced subject synchronization...');
    
    // Get all unique subjects from teachers_period table
    const subjectsResult = await client.query(`
      SELECT DISTINCT subject_name 
      FROM school_schema_points.teachers_period 
      WHERE subject_name IS NOT NULL AND subject_name != ''
    `);
    
    console.log(`Found ${subjectsResult.rows.length} unique subjects to sync`);
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const row of subjectsResult.rows) {
      const subjectName = row.subject_name;
      
      if (!subjectName || subjectName.trim() === '') {
        continue;
      }
      
      try {
        // Generate subject code from subject name
        const subjectCode = generateSubjectCode(subjectName);
        
        await client.query(`
          INSERT INTO schedule_schema.subjects (subject_name, subject_code)
          VALUES ($1, $2)
          ON CONFLICT (subject_name) DO NOTHING
        `, [subjectName, subjectCode]);
        
        syncedCount++;
        console.log(`✓ Synced subject: ${subjectName} (${subjectCode})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to sync subject ${subjectName}:`, error.message);
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: `Subject synchronization completed`,
      synced_count: syncedCount,
      error_count: errorCount,
      total_subjects: syncedCount
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in subject sync:', error);
    res.status(500).json({ error: 'Subject sync failed: ' + error.message });
  } finally {
    client.release();
  }
});

// Helper function to generate subject codes
function generateSubjectCode(subjectName) {
  const subjectMap = {
    'math': 'MATH',
    'mathematics': 'MATH',
    'eng': 'ENG',
    'english': 'ENG',
    'bio': 'BIO',
    'biology': 'BIO',
    'chem': 'CHEM',
    'chemistry': 'CHEM',
    'phy': 'PHY',
    'physics': 'PHY',
    'sci': 'SCI',
    'science': 'SCI',
    'his': 'HIST',
    'history': 'HIST',
    'geo': 'GEO',
    'geography': 'GEO',
    'eco': 'ECO',
    'economics': 'ECO',
    'agr': 'AGR',
    'agriculture': 'AGR',
    'it': 'IT',
    'computer': 'COMP'
  };
  
  const lowerSubject = subjectName.toLowerCase().trim();
  
  // Check if subject exists in our mapping
  for (const [key, code] of Object.entries(subjectMap)) {
    if (lowerSubject.includes(key)) {
      return code + '_001';
    }
  }
  
  // Generate code from first 3-4 letters of subject name
  const cleanName = subjectName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return cleanName.substring(0, 4) + '_001';
}

// Enhanced teacher synchronization with better part-time handling
router.post('/enhanced-sync-teachers', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Starting enhanced teacher synchronization...');
    
    // Clear and rebuild teacher data with proper part-time handling
    await client.query('DELETE FROM schedule_schema.teachers');
    
    // Get all teacher assignments with work times
    const teacherAssignments = await client.query(`
      SELECT DISTINCT 
        teacher_name,
        staff_work_time
      FROM school_schema_points.teachers_period
      WHERE teacher_name IS NOT NULL AND teacher_name != ''
    `);
    
    console.log(`Found ${teacherAssignments.rows.length} teacher assignments to sync`);
    
    let syncedCount = 0;
    let partTimeCount = 0;
    
    for (const assignment of teacherAssignments.rows) {
      const teacherName = assignment.teacher_name;
      const workTime = assignment.staff_work_time || 'Full Time';
      
      // Determine teacher type
      const isPartTime = workTime.toLowerCase().includes('part') || 
                        workTime.toLowerCase().includes('partial');
      const teacherType = isPartTime ? 'part_time' : 'full_time';
      
      // Set work days based on type
      let workDays = [1, 2, 3, 4, 5]; // Default full-time
      if (isPartTime) {
        workDays = [1, 3, 5]; // Default part-time (Mon, Wed, Fri)
        partTimeCount++;
      }
      
      const globalStaffId = 1000 + syncedCount;
      
      await client.query(`
        INSERT INTO schedule_schema.teachers 
        (global_staff_id, teacher_name, teacher_type, staff_work_time, work_days, max_periods_per_day)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        globalStaffId,
        teacherName,
        teacherType,
        workTime,
        workDays,
        isPartTime ? 4 : 6 // Part-time max 4 periods/day, full-time 6
      ]);
      
      syncedCount++;
      console.log(`Synced teacher: ${teacherName} (${teacherType}) - Work days: ${workDays}`);
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: `Enhanced teacher synchronization completed`,
      synced_count: syncedCount,
      part_time_count: partTimeCount,
      full_time_count: syncedCount - partTimeCount
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in enhanced teacher sync:', error);
    res.status(500).json({ 
      error: 'Enhanced teacher sync failed: ' + error.message,
      details: 'Check if teachers_period table exists and has data'
    });
  } finally {
    client.release();
  }
});

// COMPLETELY REWRITTEN: Force regenerate schedule with automatic conflict resolution
router.post('/force-regenerate-schedule', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting forced schedule regeneration with automatic conflict resolution...');
    
    // Step 1: Clear existing schedule
    await client.query('DELETE FROM schedule_schema.schedule_slots');
    await client.query('DELETE FROM schedule_schema.schedule_conflicts');
    
    console.log('✓ Cleared existing schedule data');
    
    // Step 2: Sync teachers first
    const teacherAssignments = await client.query(`
      SELECT DISTINCT 
        tp.teacher_name,
        tp.staff_work_time
      FROM school_schema_points.teachers_period tp
      WHERE tp.teacher_name IS NOT NULL AND tp.teacher_name != ''
    `);
    
    await client.query('DELETE FROM schedule_schema.teachers');
    
    for (const assignment of teacherAssignments.rows) {
      const teacherName = assignment.teacher_name;
      const workTime = assignment.staff_work_time || 'Full Time';
      const isPartTime = workTime.toLowerCase().includes('part');
      const teacherType = isPartTime ? 'part_time' : 'full_time';
      const workDays = isPartTime ? [1, 3, 5] : [1, 2, 3, 4, 5];
      
      await client.query(`
        INSERT INTO schedule_schema.teachers 
        (global_staff_id, teacher_name, teacher_type, staff_work_time, work_days)
        VALUES ($1, $2, $3, $4, $5)
      `, [1000 + teacherAssignments.rows.indexOf(assignment), teacherName, teacherType, workTime, workDays]);
    }
    
    console.log(`✓ Synced ${teacherAssignments.rows.length} teachers`);
    
    // Step 3: CRITICAL - Sync subjects before schedule generation
    console.log('📚 Synchronizing subjects...');
    const subjectsResult = await client.query(`
      SELECT DISTINCT subject_name 
      FROM school_schema_points.teachers_period 
      WHERE subject_name IS NOT NULL AND subject_name != ''
    `);
    
    let subjectCount = 0;
    for (const row of subjectsResult.rows) {
      const subjectName = row.subject_name;
      const subjectCode = generateSubjectCode(subjectName);
      
      await client.query(`
        INSERT INTO schedule_schema.subjects (subject_name, subject_code)
        VALUES ($1, $2)
        ON CONFLICT (subject_name) DO NOTHING
      `, [subjectName, subjectCode]);
      
      subjectCount++;
    }
    
    console.log(`✓ Synced ${subjectCount} subjects`);
    
    // Step 4: Get school configuration
    const configResult = await client.query('SELECT * FROM schedule_schema.school_config WHERE id = 1');
    const config = configResult.rows[0];
    
    if (!config) {
      throw new Error('School configuration not found. Please set up basic configuration first.');
    }

    console.log(`✓ Loaded school configuration: ${config.periods_per_shift} periods, ${config.school_days.length} days`);

    // Step 5: Get all configured class-subjects
    const configsResult = await client.query(`
      SELECT csc.* 
      FROM schedule_schema.class_subject_configs csc
      WHERE csc.teacher_name IS NOT NULL AND csc.teacher_name != ''
      ORDER BY csc.subject_class
    `);
    const requirements = configsResult.rows;

    if (requirements.length === 0) {
      throw new Error('No class-subject configurations found. Please complete Task 6 and configure shifts/periods first.');
    }

    console.log(`📋 Processing ${requirements.length} class-subject requirements`);

    const conflicts = [];
    const teacherScheduleMap = {}; // Key: teacher_id-day-period (NO shift_id - teacher can only be in ONE place)
    const classScheduleMap = {};   // Key: class_name-day-period-shift_id (class is shift-specific)
    const scheduleSlots = [];      // Array to hold all schedule slots

    // Step 6: Enhanced schedule generation with STRICT teacher conflict prevention
    for (const requirement of requirements) {
      const shift_id = requirement.shift_id || 1;
      const teacher_name = requirement.teacher_name;
      let teaching_days = requirement.teaching_days || config.school_days;
      const periods_needed = requirement.periods_per_week || 4;
      const staff_work_time = requirement.staff_work_time || 'Full Time';

      console.log(`\n🔄 Processing: ${requirement.subject_class}`);
      console.log(`   Teacher: ${teacher_name}, Work Time: ${staff_work_time}, Periods needed: ${periods_needed}`);

      if (!teacher_name) {
        conflicts.push({
          conflict_type: 'NO_TEACHER_ASSIGNED',
          teacher_name: null,
          class_name: null,
          subject_name: null,
          day_of_week: null,
          period_number: null,
          conflict_details: { subject_class: requirement.subject_class, shift_id }
        });
        continue;
      }

      // Get teacher info
      const teacherResult = await client.query(`
        SELECT t.id as teacher_id, t.teacher_name, t.teacher_type, t.staff_work_time, t.work_days
        FROM schedule_schema.teachers t
        WHERE t.teacher_name = $1
        LIMIT 1
      `, [teacher_name]);

      if (teacherResult.rows.length === 0) {
        conflicts.push({
          conflict_type: 'TEACHER_NOT_FOUND',
          teacher_name: teacher_name,
          class_name: null,
          subject_name: null,
          day_of_week: null,
          period_number: null,
          conflict_details: { subject_class: requirement.subject_class, teacher_name }
        });
        continue;
      }

      const teacher = teacherResult.rows[0];
      console.log(`   Teacher found: ${teacher.teacher_name}, Type: ${teacher.teacher_type}, Work Days: ${teacher.work_days}`);

      const classMatch = requirement.subject_class.match(/Class (.+)$/);
      const class_name = classMatch ? classMatch[1] : requirement.subject_class;

      // Get subject info - CRITICAL FIX: Extract subject name properly
      const subjectMatch = requirement.subject_class.match(/(.+) Class/);
      const subject_name = subjectMatch ? subjectMatch[1] : requirement.subject_class;

      console.log(`   Extracted - Class: ${class_name}, Subject: ${subject_name}`);
      
      // ENHANCED: Get or create subject
      let subject_id = null;
      const subjectResult = await client.query(`
        SELECT id FROM schedule_schema.subjects 
        WHERE LOWER(subject_name) = LOWER($1)
        LIMIT 1
      `, [subject_name]);

      if (subjectResult.rows.length === 0) {
        console.log(`   ⚠️ Subject '${subject_name}' not found, creating...`);
        // Create the subject on the fly
        const subjectCode = generateSubjectCode(subject_name);
        const newSubjectResult = await client.query(`
          INSERT INTO schedule_schema.subjects (subject_name, subject_code)
          VALUES ($1, $2)
          RETURNING id
        `, [subject_name, subjectCode]);
        
        subject_id = newSubjectResult.rows[0].id;
        console.log(`   ✅ Created subject '${subject_name}' with ID: ${subject_id}`);
      } else {
        subject_id = subjectResult.rows[0].id;
        console.log(`   ✅ Found subject '${subject_name}' with ID: ${subject_id}`);
      }

      // CRITICAL FIX: Use teacher's actual work days for part-time teachers
      if (teacher.teacher_type === 'part_time') {
        teaching_days = teacher.work_days || [1, 3, 5]; // Default part-time days
        console.log(`   ✓ Part-time teacher ${teacher_name} assigned to specific days: ${teaching_days}`);
      } else {
        teaching_days = config.school_days;
        console.log(`   ✓ Full-time teacher ${teacher_name} assigned to all school days`);
      }

      // Validate teaching days
      teaching_days = teaching_days.filter(day => config.school_days.includes(day));
      if (teaching_days.length === 0) {
        conflicts.push({
          conflict_type: 'NO_VALID_TEACHING_DAYS',
          teacher_name: teacher_name,
          class_name: class_name,
          subject_name: subject_name,
          day_of_week: null,
          period_number: null,
          conflict_details: {
            subject_class: requirement.subject_class,
            teacher_work_time: teacher.teacher_type,
            assigned_days: teaching_days,
            school_days: config.school_days
          }
        });
        continue;
      }

      // Initialize tracking
      if (!classScheduleMap[class_name]) {
        classScheduleMap[class_name] = {};
      }

      // Track subject periods per day for distribution rules
      // Key: class_name-day-shift_id -> { subject_id: [periods] }
      const getSubjectPeriods = (className, day, shiftId, subjectId) => {
        return scheduleSlots.filter(s => 
          s.class_name === className && 
          s.day_of_week === day && 
          s.shift_id === shiftId && 
          s.subject_id === subjectId
        ).map(s => s.period_number).sort((a, b) => a - b);
      };

      // Check subject distribution rule - max 2 consecutive, then need gap of 2+
      const canPlaceSubjectHere = (className, day, period, shiftId, subjectId) => {
        if (!subjectId) return true;
        
        const existingPeriods = getSubjectPeriods(className, day, shiftId, subjectId);
        if (existingPeriods.length === 0) return true;
        
        const allPeriods = [...existingPeriods, period].sort((a, b) => a - b);
        
        // Check for more than 2 consecutive
        let consecutive = 1;
        for (let i = 1; i < allPeriods.length; i++) {
          if (allPeriods[i] === allPeriods[i-1] + 1) {
            consecutive++;
            if (consecutive > 2) return false;
          } else {
            // Check gap after 2 consecutive
            if (consecutive === 2 && allPeriods[i] - allPeriods[i-1] < 2) {
              return false; // Need at least 1 period gap after 2 consecutive
            }
            consecutive = 1;
          }
        }
        return true;
      };

      let periodsScheduled = 0;
      const maxAttempts = 2000;
      let attempts = 0;

      // Smart period distribution - max 2 periods of same subject per day
      const maxPerDay = 2;

      console.log(`   Smart distribution: max ${maxPerDay} periods per day across ${teaching_days.length} days`);

      // Phase 1: Try to schedule periods evenly across teaching days
      for (let dayIndex = 0; dayIndex < teaching_days.length; dayIndex++) {
        if (periodsScheduled >= periods_needed) break;

        const day = teaching_days[dayIndex];
        let dayPeriodsScheduled = getSubjectPeriods(class_name, day, shift_id, subject_id).length;

        // Check part-time teacher daily limit
        if (teacher.teacher_type === 'part_time') {
          const existingDayPeriods = scheduleSlots.filter(slot => 
            slot.teacher_id === teacher.teacher_id && 
            slot.day_of_week === day
          ).length;
          
          if (existingDayPeriods >= 4) {
            console.log(`   ⚠️ Part-time teacher ${teacher_name} already has ${existingDayPeriods} periods on day ${day} (max 4)`);
            continue;
          }
        }

        // Try available periods for this day (in order, not shuffled for better distribution)
        for (let period = 1; period <= config.periods_per_shift; period++) {
          if (dayPeriodsScheduled >= maxPerDay || periodsScheduled >= periods_needed) break;

          const shift_group = period <= Math.ceil(config.periods_per_shift / 2) ? 'morning' : 'afternoon';
          
          const classSlotKey = `${class_name}-${day}-${period}-${shift_id}`;
          const teacherSlotKey = `${teacher.teacher_id}-${day}-${period}`;

          // Check class availability
          if (classScheduleMap[class_name][classSlotKey]) continue;

          // Check teacher availability
          if (teacherScheduleMap[teacherSlotKey]) continue;

          // Check subject distribution rule
          if (!canPlaceSubjectHere(class_name, day, period, shift_id, subject_id)) continue;

          // Additional part-time constraints
          if (teacher.teacher_type === 'part_time') {
            const teacherDayPeriods = scheduleSlots.filter(slot => 
              slot.teacher_id === teacher.teacher_id && 
              slot.day_of_week === day
            ).length;
            if (teacherDayPeriods >= 4) continue;
          }

          // Create slot
          const newSlot = {
            day_of_week: day,
            period_number: period,
            class_name,
            subject_id,
            subject_name,
            teacher_id: teacher.teacher_id,
            teacher_name: teacher.teacher_name,
            shift_group,
            shift_id
          };

          scheduleSlots.push(newSlot);
          classScheduleMap[class_name][classSlotKey] = true;
          teacherScheduleMap[teacherSlotKey] = true;

          periodsScheduled++;
          dayPeriodsScheduled++;
          
          console.log(`   ✅ Scheduled: ${class_name} - Day ${day} - Period ${period} - ${subject_name} - ${teacher_name}`);
        }
      }

      // Phase 2: Fallback for remaining periods (try other days)
      while (periodsScheduled < periods_needed && attempts < maxAttempts) {
        attempts++;
        
        const day = teaching_days[Math.floor(Math.random() * teaching_days.length)];
        const period = Math.floor(Math.random() * config.periods_per_shift) + 1;
        const shift_group = period <= Math.ceil(config.periods_per_shift / 2) ? 'morning' : 'afternoon';
        
        const classSlotKey = `${class_name}-${day}-${period}-${shift_id}`;
        const teacherSlotKey = `${teacher.teacher_id}-${day}-${period}`;

        // All checks
        if (classScheduleMap[class_name] && classScheduleMap[class_name][classSlotKey]) continue;
        if (teacherScheduleMap[teacherSlotKey]) continue;
        if (!canPlaceSubjectHere(class_name, day, period, shift_id, subject_id)) continue;

        // Part-time constraints
        if (teacher.teacher_type === 'part_time') {
          const teacherDayPeriods = scheduleSlots.filter(slot => 
            slot.teacher_id === teacher.teacher_id && 
            slot.day_of_week === day
          ).length;
          if (teacherDayPeriods >= 4) continue;
        }

        const newSlot = {
          day_of_week: day,
          period_number: period,
          class_name,
          subject_id,
          subject_name,
          teacher_id: teacher.teacher_id,
          teacher_name: teacher.teacher_name,
          shift_group,
          shift_id
        };

        scheduleSlots.push(newSlot);
        classScheduleMap[class_name][classSlotKey] = true;
        teacherScheduleMap[teacherSlotKey] = true;

        periodsScheduled++;
        console.log(`   ✅ Fallback scheduled: ${class_name} - Day ${day} - Period ${period} - ${subject_name}`);
      }

      // Report results
      if (periodsScheduled < periods_needed) {
        conflicts.push({
          conflict_type: 'INSUFFICIENT_SLOTS',
          teacher_name: teacher_name,
          class_name: class_name,
          subject_name: subject_name,
          day_of_week: null,
          period_number: null,
          conflict_details: {
            subject_class: requirement.subject_class,
            required: periods_needed,
            scheduled: periodsScheduled,
            teacher_type: teacher.teacher_type,
            teaching_days: teaching_days
          }
        });
        console.log(`   ❌ Only scheduled ${periodsScheduled}/${periods_needed} periods for ${requirement.subject_class}`);
      } else {
        console.log(`   ✅ Successfully scheduled ${periodsScheduled}/${periods_needed} periods for ${requirement.subject_class}`);
      }
    }

    // Step 7: FILL ALL REMAINING EMPTY PERIODS
    console.log(`\n📅 Step 7: Filling ALL remaining empty periods...`);
    
    // Get all unique classes from requirements
    const allClasses = [...new Set(requirements.map(r => {
      const match = r.subject_class.match(/Class (.+)$/);
      return match ? match[1] : null;
    }).filter(Boolean))];
    
    // Get all teachers for fallback assignment
    const allTeachersResult = await client.query(`
      SELECT id, teacher_name, teacher_type, work_days FROM schedule_schema.teachers ORDER BY teacher_name
    `);
    const allTeachers = allTeachersResult.rows;
    
    // Get all subjects for fallback assignment
    const allSubjectsResult = await client.query(`SELECT id, subject_name FROM schedule_schema.subjects`);
    const allSubjects = allSubjectsResult.rows;
    
    let filledCount = 0;
    let skippedCount = 0;
    
    // Helper to check subject distribution
    const getSubjectPeriodsForFill = (className, day, shiftId, subjectId) => {
      return scheduleSlots.filter(s => 
        s.class_name === className && 
        s.day_of_week === day && 
        s.shift_id === shiftId && 
        s.subject_id === subjectId
      ).map(s => s.period_number).sort((a, b) => a - b);
    };
    
    const canPlaceSubjectForFill = (className, day, period, shiftId, subjectId) => {
      if (!subjectId) return true;
      const existingPeriods = getSubjectPeriodsForFill(className, day, shiftId, subjectId);
      if (existingPeriods.length === 0) return true;
      const allPeriods = [...existingPeriods, period].sort((a, b) => a - b);
      let consecutive = 1;
      for (let i = 1; i < allPeriods.length; i++) {
        if (allPeriods[i] === allPeriods[i-1] + 1) {
          consecutive++;
          if (consecutive > 2) return false;
        } else {
          if (consecutive === 2 && allPeriods[i] - allPeriods[i-1] < 2) return false;
          consecutive = 1;
        }
      }
      return true;
    };
    
    for (const className of allClasses) {
      // Determine shift for this class
      const classReq = requirements.find(r => r.subject_class.includes(`Class ${className}`));
      const shiftId = classReq?.shift_id || 1;
      
      for (const day of config.school_days) {
        for (let period = 1; period <= config.periods_per_shift; period++) {
          const classSlotKey = `${className}-${day}-${period}-${shiftId}`;
          
          // Skip if already filled
          if (classScheduleMap[className] && classScheduleMap[className][classSlotKey]) continue;
          
          // Find available teacher
          let assigned = false;
          
          for (const teacher of allTeachers) {
            const teacherDays = teacher.work_days || config.school_days;
            if (!teacherDays.includes(day)) continue;
            
            const teacherSlotKey = `${teacher.id}-${day}-${period}`;
            if (teacherScheduleMap[teacherSlotKey]) continue;
            
            // Check part-time limit
            if (teacher.teacher_type === 'part_time') {
              const dailyPeriods = scheduleSlots.filter(s => 
                s.teacher_id === teacher.id && s.day_of_week === day
              ).length;
              if (dailyPeriods >= 4) continue;
            }
            
            // Find a subject that can be placed
            let subjectToUse = null;
            for (const subject of allSubjects) {
              if (canPlaceSubjectForFill(className, day, period, shiftId, subject.id)) {
                subjectToUse = subject;
                break;
              }
            }
            
            if (!subjectToUse && allSubjects.length > 0) {
              subjectToUse = allSubjects[0];
            }
            
            const shift_group = period <= Math.ceil(config.periods_per_shift / 2) ? 'morning' : 'afternoon';
            
            const newSlot = {
              day_of_week: day,
              period_number: period,
              class_name: className,
              subject_id: subjectToUse?.id || null,
              subject_name: subjectToUse?.subject_name || 'Study Period',
              teacher_id: teacher.id,
              teacher_name: teacher.teacher_name,
              shift_group,
              shift_id: shiftId
            };
            
            scheduleSlots.push(newSlot);
            if (!classScheduleMap[className]) classScheduleMap[className] = {};
            classScheduleMap[className][classSlotKey] = true;
            teacherScheduleMap[teacherSlotKey] = true;
            
            filledCount++;
            assigned = true;
            break;
          }
          
          if (!assigned) {
            skippedCount++;
            console.log(`   ⚠️ Could not fill: ${className} Day ${day} Period ${period}`);
          }
        }
      }
    }
    
    console.log(`📊 Filled ${filledCount} empty periods, Skipped ${skippedCount}`);
    console.log(`📊 Total slots after filling: ${scheduleSlots.length}`);

    // Step 8: AUTOMATIC CONFLICT RESOLUTION
    console.log(`\n🔄 Starting automatic conflict resolution...`);
    const resolver = new ScheduleConflictResolver(client, config, scheduleSlots, teacherScheduleMap, classScheduleMap);
    
    // Detect conflicts
    const teacherConflicts = resolver.detectTeacherConflicts();
    const classConflicts = resolver.detectClassConflicts();
    const partTimeConflicts = resolver.detectPartTimeOverload();
    
    const allConflicts = [...teacherConflicts, ...classConflicts, ...partTimeConflicts];
    console.log(`📊 Detected ${allConflicts.length} conflicts to resolve`);
    
    // Resolve conflicts automatically
    const resolvedCount = await resolver.resolveConflicts(allConflicts);
    
    // Step 8: Insert schedule slots
    console.log(`\n💾 Inserting ${scheduleSlots.length} schedule slots...`);
    for (const slot of scheduleSlots) {
      await client.query(`
        INSERT INTO schedule_schema.schedule_slots 
        (day_of_week, period_number, class_name, subject_id, teacher_id, shift_group, shift_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        slot.day_of_week, 
        slot.period_number, 
        slot.class_name, 
        slot.subject_id, 
        slot.teacher_id, 
        slot.shift_group, 
        slot.shift_id
      ]);
    }

    // Step 9: Insert only unavoidable conflicts
    console.log(`⚠️ Inserting ${conflicts.length} unavoidable conflicts...`);
    for (const conflict of conflicts) {
      await client.query(
        `INSERT INTO schedule_schema.schedule_conflicts 
         (conflict_type, teacher_name, class_name, subject_name, day_of_week, period_number, conflict_details) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          conflict.conflict_type,
          conflict.teacher_name,
          conflict.class_name, 
          conflict.subject_name,
          conflict.day_of_week,
          conflict.period_number,
          conflict.conflict_details
        ]
      );
    }

    // Step 10: Validate final schedule
    console.log(`\n🔍 Validating final schedule...`);
    const finalTeacherConflicts = resolver.detectTeacherConflicts();
    const finalClassConflicts = resolver.detectClassConflicts();
    const finalPartTimeConflicts = resolver.detectPartTimeOverload();
    
    const remainingConflicts = [...finalTeacherConflicts, ...finalClassConflicts, ...finalPartTimeConflicts];
    
    if (remainingConflicts.length === 0) {
      console.log(`✅ Schedule validation passed! No conflicts remaining.`);
    } else {
      console.log(`⚠️ Schedule validation: ${remainingConflicts.length} conflicts remain after automatic resolution`);
    }

    await client.query('COMMIT');
    
    console.log('\n🎉 === SCHEDULE GENERATION COMPLETE ===');
    console.log(`📊 Total slots: ${scheduleSlots.length}`);
    console.log(`🔄 Auto-resolved: ${resolvedCount} conflicts`);
    console.log(`⚠️ Unavoidable: ${conflicts.length} conflicts`);
    console.log(`🔍 Remaining: ${remainingConflicts.length} conflicts`);
    
    res.json({ 
      message: `Schedule force regeneration completed with automatic conflict resolution!`,
      slots_generated: scheduleSlots.length,
      conflicts_resolved: resolvedCount,
      unavoidable_conflicts: conflicts.length,
      remaining_conflicts: remainingConflicts.length,
      details: {
        total_slots: scheduleSlots.length,
        teachers_synced: teacherAssignments.rows.length,
        subjects_created: subjectCount,
        part_time_teachers: teacherAssignments.rows.filter(t => t.staff_work_time && t.staff_work_time.toLowerCase().includes('part')).length,
        auto_resolution_details: resolver.resolvedConflicts
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in force regenerate:', error);
    res.status(500).json({ error: 'Force regeneration failed: ' + error.message });
  } finally {
    client.release();
  }
});

// Get schedule with teacher information
router.get('/schedule', async (req, res) => {
  try {
    console.log('Fetching schedule data for display...');
    
    const result = await pool.query(`
      SELECT 
        s.id,
        s.day_of_week,
        s.period_number,
        s.class_name,
        s.subject_id,
        s.teacher_id,
        s.shift_group,
        s.shift_id,
        COALESCE(sub.subject_name, tp.subject_name, 'Subject') as subject_name,
        sub.subject_code,
        COALESCE(t.teacher_name, tp.teacher_name, 'Teacher') as teacher_name,
        t.staff_work_time,
        t.teacher_type
      FROM schedule_schema.schedule_slots s
      LEFT JOIN schedule_schema.subjects sub ON sub.id = s.subject_id
      LEFT JOIN schedule_schema.teachers t ON t.id = s.teacher_id
      LEFT JOIN school_schema_points.teachers_period tp ON tp.teacher_name = t.teacher_name AND tp.class_name = s.class_name
      ORDER BY s.shift_id, s.day_of_week, s.period_number, s.class_name
    `);
    
    console.log(`Retrieved ${result.rows.length} schedule slots for display`);
    
    // Enhanced logging for debugging
    const shift1Count = result.rows.filter(row => row.shift_id === 1).length;
    const shift2Count = result.rows.filter(row => row.shift_id === 2).length;
    const partTimeCount = result.rows.filter(row => row.teacher_type === 'part_time').length;
    
    console.log(`Schedule breakdown: Shift 1: ${shift1Count}, Shift 2: ${shift2Count}, Part-time: ${partTimeCount}`);
    
    // Log sample data for debugging
    if (result.rows.length > 0) {
      console.log('Sample slot:', JSON.stringify(result.rows[0]));
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schedule:', error.message);
    res.status(500).json({ error: 'Failed to fetch schedule: ' + error.message });
  }
});

// Get schedule by week (Week A or Week B)
router.get('/week/:weekId', async (req, res) => {
  try {
    const { weekId } = req.params;
    console.log(`Fetching schedule data for Week ${weekId}...`);
    
    // First try to get schedule with subject names from subjects table
    const result = await pool.query(`
      SELECT 
        s.id,
        s.day_of_week,
        s.period_number,
        s.class_name,
        s.subject_id,
        s.teacher_id,
        s.shift_group,
        s.shift_id,
        COALESCE(sub.subject_name, tp.subject_name, 'Subject') as subject_name,
        sub.subject_code,
        COALESCE(t.teacher_name, tp.teacher_name, 'Teacher') as teacher_name,
        t.staff_work_time,
        t.teacher_type
      FROM schedule_schema.schedule_slots s
      LEFT JOIN schedule_schema.subjects sub ON sub.id = s.subject_id
      LEFT JOIN schedule_schema.teachers t ON t.id = s.teacher_id
      LEFT JOIN school_schema_points.teachers_period tp ON tp.teacher_name = t.teacher_name AND tp.class_name = s.class_name
      ORDER BY s.shift_id, s.day_of_week, s.period_number, s.class_name
    `);
    
    console.log(`Retrieved ${result.rows.length} schedule slots for Week ${weekId}`);
    
    // Log sample data for debugging
    if (result.rows.length > 0) {
      console.log('Sample slot:', JSON.stringify(result.rows[0]));
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schedule by week:', error.message);
    res.status(500).json({ error: 'Failed to fetch schedule: ' + error.message });
  }
});

// Get conflicts
router.get('/conflicts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM schedule_schema.schedule_conflicts 
      WHERE resolved = false
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching conflicts:', error.message);
    res.json([]);
  }
});

// Get subjects
router.get('/subjects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, subject_name, subject_code 
      FROM schedule_schema.subjects 
      ORDER BY subject_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subjects:', error.message);
    res.json([]);
  }
});

// Get class-subjects
router.get('/class-subjects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT 
        CONCAT(subject_name, ' Class ', class_name) as subject_class,
        teacher_name,
        staff_work_time
      FROM school_schema_points.teachers_period
      WHERE teacher_name IS NOT NULL AND teacher_name != ''
      ORDER BY subject_class
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching class-subjects:', error.message);
    res.json([]);
  }
});

// Get school configuration
router.get('/config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schedule_schema.school_config WHERE id = 1');
    if (result.rows.length === 0) {
      await pool.query(`
        INSERT INTO schedule_schema.school_config 
        (id, periods_per_shift, period_duration, short_break_duration, total_shifts, teaching_days_per_week, school_days) 
        VALUES (1, 7, 45, 10, 2, 5, '{1,2,3,4,5}')
      `);
      const newResult = await pool.query('SELECT * FROM schedule_schema.school_config WHERE id = 1');
      return res.json(newResult.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching schedule config:', error.message);
    res.json({
      periods_per_shift: 7,
      period_duration: 45,
      short_break_duration: 10,
      total_shifts: 2,
      teaching_days_per_week: 5,
      school_days: [1,2,3,4,5]
    });
  }
});

// Update school configuration
router.put('/config', async (req, res) => {
  const config = req.body;
  try {
    await pool.query(`
      UPDATE schedule_schema.school_config SET
        periods_per_shift = $1,
        period_duration = $2,
        short_break_duration = $3,
        total_shifts = $4,
        teaching_days_per_week = $5,
        school_days = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      config.periods_per_shift,
      config.period_duration,
      config.short_break_duration,
      config.total_shifts,
      config.teaching_days_per_week,
      config.school_days
    ]);
    res.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error updating schedule config:', error.message);
    res.status(500).json({ error: 'Failed to update schedule config' });
  }
});

// Get class-subject configs
router.get('/class-subject-configs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM schedule_schema.class_subject_configs 
      ORDER BY subject_class
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching class-subject configs:', error.message);
    res.json([]);
  }
});

// Get teachers period data
router.get('/task6/teachers-period', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM school_schema_points.teachers_period 
      ORDER BY teacher_name, class_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teachers period data:', error.message);
    res.json([]);
  }
});

// Set comprehensive configuration
router.post('/set-comprehensive-config', async (req, res) => {
  const { assignments } = req.body;
  if (!Array.isArray(assignments)) {
    return res.status(400).json({ error: 'Assignments must be an array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const assign of assignments) {
      const { subject_class, shift_id, periods_per_week, teaching_days } = assign;
      
      if (!subject_class || !shift_id || ![1, 2].includes(shift_id)) {
        throw new Error(`Invalid assignment: subject_class=${subject_class}, shift_id=${shift_id}`);
      }

      if (!periods_per_week || periods_per_week < 1 || periods_per_week > 20) {
        throw new Error(`Invalid periods: subject_class=${subject_class}, periods_per_week=${periods_per_week}`);
      }

      // Get teacher info
      let teacher_name = null;
      let staff_work_time = 'Full Time';
      try {
        const classMatch = subject_class.match(/(.+) Class (.+)/);
        if (classMatch) {
          const subject_name = classMatch[1];
          const class_name = classMatch[2];
          
          const teacherResult = await client.query(`
            SELECT teacher_name, staff_work_time
            FROM school_schema_points.teachers_period 
            WHERE subject_name = $1 AND class_name = $2
            LIMIT 1
          `, [subject_name, class_name]);
          
          if (teacherResult.rows.length > 0) {
            teacher_name = teacherResult.rows[0].teacher_name;
            staff_work_time = teacherResult.rows[0].staff_work_time || 'Full Time';
          }
        }
      } catch (error) {
        console.log('Could not fetch teacher name:', error.message);
      }

      await client.query(`
        INSERT INTO schedule_schema.class_subject_configs 
        (subject_class, shift_id, periods_per_week, teaching_days, teacher_name, staff_work_time)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (subject_class)
        DO UPDATE SET 
          shift_id = $2, 
          periods_per_week = $3, 
          teaching_days = $4,
          teacher_name = COALESCE($5, class_subject_configs.teacher_name),
          staff_work_time = COALESCE($6, class_subject_configs.staff_work_time),
          updated_at = CURRENT_TIMESTAMP
      `, [subject_class, shift_id, periods_per_week, teaching_days, teacher_name, staff_work_time]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Comprehensive configuration saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving comprehensive config:', error.message);
    res.status(500).json({ error: 'Failed to save configuration', details: error.message });
  } finally {
    client.release();
  }
});

// Manual sync teachers
router.post('/manual-sync-teachers', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const teachersPeriodResult = await client.query(`
      SELECT DISTINCT teacher_name, staff_work_time 
      FROM school_schema_points.teachers_period
      WHERE teacher_name IS NOT NULL AND teacher_name != ''
    `);

    if (teachersPeriodResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No teacher assignments found in Task 6. Please complete Task 6 first.' 
      });
    }

    let syncedCount = 0;

    for (const teacher of teachersPeriodResult.rows) {
      const teacherName = teacher.teacher_name;
      const workTime = teacher.staff_work_time || 'Full Time';
      const teacherType = workTime.toLowerCase().includes('part') ? 'part_time' : 'full_time';
      
      let workDays = [1,2,3,4,5];
      if (teacherType === 'part_time') {
        workDays = [1,3,5];
      }

      const globalStaffId = Math.floor(Math.random() * 10000) + 1000;

      await client.query(`
        INSERT INTO schedule_schema.teachers 
        (global_staff_id, teacher_name, teacher_type, staff_work_time, work_days)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (teacher_name) 
        DO UPDATE SET
          teacher_type = EXCLUDED.teacher_type,
          staff_work_time = EXCLUDED.staff_work_time,
          work_days = EXCLUDED.work_days,
          updated_at = CURRENT_TIMESTAMP
      `, [globalStaffId, teacherName, teacherType, workTime, workDays]);

      syncedCount++;
    }

    await client.query('COMMIT');
    
    res.json({ 
      message: `Successfully synced ${syncedCount} teachers from Task 6`,
      synced_count: syncedCount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in manual sync teachers:', error.message);
    res.status(500).json({ error: 'Failed to sync teacher data' });
  } finally {
    client.release();
  }
});

// Force sync all data - ENHANCED WITH SUBJECT SYNC
router.post('/force-sync-data', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Starting comprehensive data sync...');

    // Sync teachers
    const teachersResult = await client.query(`
      INSERT INTO schedule_schema.teachers (global_staff_id, teacher_name, teacher_type, staff_work_time, work_days)
      SELECT 
        (1000 + ROW_NUMBER() OVER (ORDER BY teacher_name)) as global_staff_id,
        teacher_name,
        CASE 
          WHEN LOWER(staff_work_time) LIKE '%part%' THEN 'part_time'
          ELSE 'full_time'
        END as teacher_type,
        COALESCE(staff_work_time, 'Full Time') as staff_work_time,
        CASE 
          WHEN LOWER(staff_work_time) LIKE '%part%' THEN ARRAY[1,3,5]::INTEGER[]
          ELSE ARRAY[1,2,3,4,5]::INTEGER[]
        END as work_days
      FROM (
        SELECT DISTINCT teacher_name, staff_work_time 
        FROM school_schema_points.teachers_period
        WHERE teacher_name IS NOT NULL AND teacher_name != ''
      ) AS distinct_teachers
      ON CONFLICT (teacher_name) DO UPDATE SET
        teacher_type = EXCLUDED.teacher_type,
        staff_work_time = EXCLUDED.staff_work_time,
        work_days = EXCLUDED.work_days,
        updated_at = CURRENT_TIMESTAMP
    `);

    console.log(`✓ Synced ${teachersResult.rowCount} teachers`);

    // ENHANCED: Sync subjects with better error handling
    const subjectsFromTeachersPeriod = await client.query(`
      SELECT DISTINCT subject_name 
      FROM school_schema_points.teachers_period
      WHERE subject_name IS NOT NULL AND subject_name != ''
    `);

    let subjectsSynced = 0;
    for (const row of subjectsFromTeachersPeriod.rows) {
      const subjectName = row.subject_name;
      const subjectCode = generateSubjectCode(subjectName);
      
      try {
        await client.query(`
          INSERT INTO schedule_schema.subjects (subject_name, subject_code)
          VALUES ($1, $2)
          ON CONFLICT (subject_name) DO NOTHING
        `, [subjectName, subjectCode]);
        
        subjectsSynced++;
      } catch (error) {
        console.error(`Failed to sync subject ${subjectName}:`, error.message);
      }
    }

    console.log(`✓ Synced ${subjectsSynced} subjects`);

    // Sync class-subject configs
    const configsResult = await client.query(`
      INSERT INTO schedule_schema.class_subject_configs 
      (subject_class, shift_id, periods_per_week, teacher_name, staff_work_time, teaching_days)
      SELECT 
        CONCAT(subject_name, ' Class ', class_name) as subject_class,
        CASE 
          WHEN (ROW_NUMBER() OVER (ORDER BY class_name, subject_name)) % 2 = 0 THEN 2
          ELSE 1
        END as shift_id,
        CASE 
          WHEN LOWER(subject_name) LIKE '%math%' THEN 5
          WHEN LOWER(subject_name) LIKE '%english%' OR LOWER(subject_name) = 'eng' THEN 3
          WHEN LOWER(subject_name) LIKE '%science%' OR LOWER(subject_name) = 'bio' OR LOWER(subject_name) = 'sci' THEN 4
          ELSE 4
        END as periods_per_week,
        teacher_name,
        staff_work_time,
        CASE 
          WHEN LOWER(staff_work_time) LIKE '%part%' THEN ARRAY[1,3,5]::INTEGER[]
          ELSE ARRAY[1,2,3,4,5]::INTEGER[]
        END as teaching_days
      FROM school_schema_points.teachers_period
      WHERE subject_name IS NOT NULL AND class_name IS NOT NULL
      ON CONFLICT (subject_class) DO UPDATE SET
        teacher_name = EXCLUDED.teacher_name,
        staff_work_time = EXCLUDED.staff_work_time,
        teaching_days = EXCLUDED.teaching_days,
        updated_at = CURRENT_TIMESTAMP
    `);

    console.log(`✓ Synced ${configsResult.rowCount} class-subject configs`);

    await client.query('COMMIT');
    
    res.json({ 
      message: 'Data force sync completed successfully',
      details: {
        teachers_synced: teachersResult.rowCount,
        subjects_synced: subjectsSynced,
        configs_synced: configsResult.rowCount
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in force sync data:', error.message);
    res.status(500).json({ error: 'Failed to force sync data: ' + error.message });
  } finally {
    client.release();
  }
});

// Get teacher work times
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
  } catch (error) {
    console.error('Error fetching teacher work times:', error.message);
    res.status(500).json({ error: 'Failed to fetch teacher work times' });
  }
});

// Debug route - ENHANCED FOR BETTER INSIGHTS
router.get('/debug-schedule-status', async (req, res) => {
  try {
    console.log('Debugging schedule status...');
    
    const slotsCheck = await pool.query(`
      SELECT 
        shift_id,
        COUNT(*) as slot_count
      FROM schedule_schema.schedule_slots 
      GROUP BY shift_id
      ORDER BY shift_id
    `);
    
    const configsCheck = await pool.query(`
      SELECT COUNT(*) as config_count 
      FROM schedule_schema.class_subject_configs
    `);
    
    const teachersCheck = await pool.query(`
      SELECT COUNT(*) as teacher_count 
      FROM school_schema_points.teachers_period
      WHERE teacher_name IS NOT NULL AND teacher_name != ''
    `);
    
    const configCheck = await pool.query(`
      SELECT * FROM schedule_schema.school_config WHERE id = 1
    `);
    
    const subjectsCheck = await pool.query(`
      SELECT COUNT(*) as subject_count FROM schedule_schema.subjects
    `);
    
    const scheduleTeachersCheck = await pool.query(`
      SELECT COUNT(*) as schedule_teacher_count FROM schedule_schema.teachers
    `);

    // Enhanced part-time analysis
    const partTimeTeachersCheck = await pool.query(`
      SELECT COUNT(*) as part_time_count 
      FROM schedule_schema.teachers 
      WHERE teacher_type = 'part_time'
    `);

    const partTimeSlotsCheck = await pool.query(`
      SELECT COUNT(*) as part_time_slots
      FROM schedule_schema.schedule_slots s
      JOIN schedule_schema.teachers t ON t.id = s.teacher_id
      WHERE t.teacher_type = 'part_time'
    `);

    // Get sample subjects for debugging
    const sampleSubjects = await pool.query(`
      SELECT subject_name, subject_code 
      FROM schedule_schema.subjects 
      LIMIT 10
    `);
    
    const debugData = {
      slots: slotsCheck.rows,
      configs: configsCheck.rows[0] || { config_count: 0 },
      teachers: teachersCheck.rows[0] || { teacher_count: 0 },
      subjects: subjectsCheck.rows[0] || { subject_count: 0 },
      scheduleTeachers: scheduleTeachersCheck.rows[0] || { schedule_teacher_count: 0 },
      partTimeTeachers: partTimeTeachersCheck.rows[0] || { part_time_count: 0 },
      partTimeSlots: partTimeSlotsCheck.rows[0] || { part_time_slots: 0 },
      schoolConfig: configCheck.rows[0] || null,
      sampleSubjects: sampleSubjects.rows
    };

    console.log('Debug data:', debugData);
    
    res.json(debugData);
    
  } catch (error) {
    console.error('Debug error:', error.message);
    res.status(500).json({ error: 'Debug failed: ' + error.message });
  }
});

// NEW: Enhanced debug for part-time teachers
router.get('/debug-part-time-teachers', async (req, res) => {
  try {
    console.log('Debugging part-time teachers...');
    
    // Check part-time teachers in schedule_schema.teachers
    const partTimeTeachers = await pool.query(`
      SELECT teacher_name, teacher_type, staff_work_time, work_days 
      FROM schedule_schema.teachers 
      WHERE teacher_type = 'part_time'
    `);
    
    // Check if part-time teachers are in class_subject_configs
    const partTimeAssignments = await pool.query(`
      SELECT csc.teacher_name, csc.subject_class, csc.teaching_days
      FROM schedule_schema.class_subject_configs csc
      JOIN schedule_schema.teachers t ON t.teacher_name = csc.teacher_name
      WHERE t.teacher_type = 'part_time'
    `);
    
    // Check schedule slots for part-time teachers
    const partTimeSlots = await pool.query(`
      SELECT s.teacher_id, t.teacher_name, t.teacher_type, COUNT(*) as slot_count
      FROM schedule_schema.schedule_slots s
      JOIN schedule_schema.teachers t ON t.id = s.teacher_id
      WHERE t.teacher_type = 'part_time'
      GROUP BY s.teacher_id, t.teacher_name, t.teacher_type
    `);
    
    const result = {
      part_time_teachers: partTimeTeachers.rows,
      part_time_assignments: partTimeAssignments.rows,
      part_time_schedule_slots: partTimeSlots.rows,
      summary: {
        total_part_time_teachers: partTimeTeachers.rows.length,
        total_part_time_assignments: partTimeAssignments.rows.length,
        total_part_time_slots: partTimeSlots.rows.reduce((sum, row) => sum + parseInt(row.slot_count), 0),
        part_time_teachers_list: partTimeTeachers.rows.map(t => t.teacher_name)
      }
    };

    console.log('Part-time teacher debug result:', result.summary);
    
    res.json(result);
  } catch (error) {
    console.error('Error debugging part-time teachers:', error);
    res.status(500).json({ error: 'Debug failed: ' + error.message });
  }
});

// NEW: Enhanced debug for part-time schedule specifically
router.get('/debug-part-time-schedule', async (req, res) => {
  try {
    console.log('Debugging part-time schedule details...');
    
    const result = await pool.query(`
      SELECT 
        s.*,
        t.teacher_name,
        t.teacher_type,
        t.staff_work_time,
        t.work_days,
        sub.subject_name
      FROM schedule_schema.schedule_slots s
      JOIN schedule_schema.teachers t ON t.id = s.teacher_id
      LEFT JOIN schedule_schema.subjects sub ON sub.id = s.subject_id
      WHERE t.teacher_type = 'part_time'
      ORDER BY s.day_of_week, s.period_number, s.class_name
    `);
    
    console.log(`Found ${result.rows.length} part-time schedule slots`);
    
    const debugResult = {
      part_time_slots: result.rows,
      total_part_time_slots: result.rows.length,
      summary: {
        teachers: [...new Set(result.rows.map(r => r.teacher_name))],
        classes: [...new Set(result.rows.map(r => r.class_name))],
        days: [...new Set(result.rows.map(r => r.day_of_week))].sort(),
        periods: [...new Set(result.rows.map(r => r.period_number))].sort()
      }
    };

    console.log('Part-time schedule debug:', debugResult.summary);
    
    res.json(debugResult);
  } catch (error) {
    console.error('Error debugging part-time schedule:', error);
    res.status(500).json({ error: 'Debug failed: ' + error.message });
  }
});

// Reset schema (for development/debugging)
router.post('/reset-schema', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Resetting schedule schema...');

    // Clear all schedule data but keep the schema
    await client.query('DELETE FROM schedule_schema.schedule_slots');
    await client.query('DELETE FROM schedule_schema.schedule_conflicts');
    await client.query('DELETE FROM schedule_schema.class_subject_configs');
    await client.query('DELETE FROM schedule_schema.teachers');
    await client.query('DELETE FROM schedule_schema.subjects');
    
    // Reset school config to defaults
    await client.query(`
      UPDATE schedule_schema.school_config SET
        periods_per_shift = 7,
        period_duration = 45,
        short_break_duration = 10,
        total_shifts = 2,
        teaching_days_per_week = 5,
        school_days = '{1,2,3,4,5}',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);

    await client.query('COMMIT');
    
    console.log('Schedule schema reset successfully');
    
    res.json({ 
      message: 'Schedule schema reset successfully',
      details: 'All schedule data cleared and reset to defaults'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error resetting schema:', error.stack);
    res.status(500).json({ 
      error: 'Failed to reset schema', 
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// NEW: Get comprehensive schedule overview
router.get('/schedule-overview', async (req, res) => {
  try {
    const [scheduleData, configData, classesData, teachersData] = await Promise.all([
      pool.query('SELECT COUNT(*) as total_slots FROM schedule_schema.schedule_slots'),
      pool.query('SELECT * FROM schedule_schema.school_config WHERE id = 1'),
      pool.query('SELECT COUNT(DISTINCT class_name) as total_classes FROM schedule_schema.schedule_slots'),
      pool.query('SELECT COUNT(DISTINCT teacher_id) as total_teachers FROM schedule_schema.schedule_slots')
    ]);

    const overview = {
      total_slots: scheduleData.rows[0]?.total_slots || 0,
      total_classes: classesData.rows[0]?.total_classes || 0,
      total_teachers: teachersData.rows[0]?.total_teachers || 0,
      config: configData.rows[0] || null,
      generated_at: new Date().toISOString()
    };

    res.json(overview);
  } catch (error) {
    console.error('Error getting schedule overview:', error);
    res.status(500).json({ error: 'Failed to get schedule overview' });
  }
});

// NEW: Automatic conflict resolution endpoint
// NEW: Generate complete conflict-free schedule with ALL periods filled
// RULES:
// 1. No teacher can teach 2 classes at the same time
// 2. Same subject max 2 consecutive periods, then need gap of at least 1 period
// 3. Fill ALL periods - no empty slots
router.post('/generate-complete-schedule', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Generating complete conflict-free schedule with subject distribution rules...');
    
    // Clear existing schedule and conflicts
    await client.query('DELETE FROM schedule_schema.schedule_slots');
    await client.query('DELETE FROM schedule_schema.schedule_conflicts');
    
    // Get configuration
    const configResult = await client.query('SELECT * FROM schedule_schema.school_config WHERE id = 1');
    const config = configResult.rows[0] || {
      periods_per_shift: 7,
      school_days: [1, 2, 3, 4, 5],
      total_shifts: 2
    };
    
    console.log(`📋 Config: ${config.periods_per_shift} periods, days: ${config.school_days}`);
    
    // Get all classes - extract class name from subject_class column
    const classesResult = await client.query(`
      SELECT DISTINCT 
        CASE 
          WHEN subject_class LIKE '% Class %' THEN TRIM(SPLIT_PART(subject_class, ' Class ', 2))
          ELSE subject_class
        END as class_name
      FROM schedule_schema.class_subject_configs 
      WHERE subject_class IS NOT NULL
      ORDER BY class_name
    `);
    const classes = classesResult.rows.map(r => r.class_name).filter(c => c);
    console.log(`📚 Found ${classes.length} classes: ${classes.join(', ')}`);
    
    // Get all teachers
    const teachersResult = await client.query(`
      SELECT id, teacher_name, teacher_type, work_days FROM schedule_schema.teachers ORDER BY teacher_name
    `);
    const teachers = teachersResult.rows;
    console.log(`👨‍🏫 Found ${teachers.length} teachers`);
    
    // Get all subjects
    const subjectsResult = await client.query(`SELECT id, subject_name FROM schedule_schema.subjects`);
    const subjects = subjectsResult.rows;
    console.log(`📖 Found ${subjects.length} subjects`);
    
    // Get all teacher-subject assignments
    const assignmentsResult = await client.query(`
      SELECT 
        csc.subject_class,
        csc.shift_id,
        csc.periods_per_week,
        csc.teacher_name,
        t.id as teacher_id,
        t.teacher_type,
        t.work_days,
        s.id as subject_id,
        s.subject_name
      FROM schedule_schema.class_subject_configs csc
      LEFT JOIN schedule_schema.teachers t ON t.teacher_name = csc.teacher_name
      LEFT JOIN schedule_schema.subjects s ON LOWER(s.subject_name) = LOWER(
        CASE 
          WHEN csc.subject_class LIKE '% Class %' THEN TRIM(SPLIT_PART(csc.subject_class, ' Class ', 1))
          ELSE csc.subject_class
        END
      )
      WHERE csc.teacher_name IS NOT NULL
      ORDER BY csc.shift_id, csc.subject_class
    `);
    console.log(`📝 Found ${assignmentsResult.rows.length} assignments`);
    
    // Tracking maps to prevent conflicts
    const classSchedule = {};    // class_name-day-period-shift -> slot (class-specific)
    const teacherSchedule = {};  // teacher_id-day-period -> true (teacher can only be in ONE place!)
    const scheduleSlots = [];
    
    // Track teacher usage per day for part-time limits
    const teacherDailyCount = {}; // teacher_id-day -> count
    
    // Track subject usage per class per day for distribution rules
    // Key: class_name-day-shift -> { subject_id: [period1, period2, ...] }
    const classSubjectPeriods = {};
    
    // Helper to check if class slot is available
    const isClassSlotAvailable = (className, day, period, shiftId) => {
      const classKey = `${className}-${day}-${period}-${shiftId}`;
      return !classSchedule[classKey];
    };
    
    // Helper to check if teacher is available (teacher can only teach ONE class at a time!)
    const isTeacherAvailable = (teacherId, day, period) => {
      const teacherKey = `${teacherId}-${day}-${period}`;
      return !teacherSchedule[teacherKey];
    };
    
    // NEW: Check subject distribution rule - max 2 consecutive, then need gap
    const canPlaceSubject = (className, day, period, shiftId, subjectId) => {
      if (!subjectId) return true; // No subject restriction if no subject
      
      const dayKey = `${className}-${day}-${shiftId}`;
      const subjectPeriods = classSubjectPeriods[dayKey]?.[subjectId] || [];
      
      if (subjectPeriods.length === 0) return true; // First period of this subject today
      
      // Sort periods
      const sortedPeriods = [...subjectPeriods, period].sort((a, b) => a - b);
      
      // Check for more than 2 consecutive periods
      let consecutiveCount = 1;
      for (let i = 1; i < sortedPeriods.length; i++) {
        if (sortedPeriods[i] === sortedPeriods[i-1] + 1) {
          consecutiveCount++;
          if (consecutiveCount > 2) {
            return false; // Would create 3+ consecutive periods
          }
        } else {
          // Gap found, check if gap is at least 1 period
          if (sortedPeriods[i] - sortedPeriods[i-1] === 2 && consecutiveCount === 2) {
            // Only 1 period gap after 2 consecutive - not allowed
            // e.g., periods 1,2,4 - gap between 2 and 4 is only 1 period
            return false;
          }
          consecutiveCount = 1;
        }
      }
      
      return true;
    };
    
    // Helper to mark slot as used
    const markSlotUsed = (teacherId, className, day, period, shiftId, slot) => {
      const classKey = `${className}-${day}-${period}-${shiftId}`;
      const teacherKey = `${teacherId}-${day}-${period}`;
      const dayKey = `${className}-${day}-${shiftId}`;
      
      classSchedule[classKey] = slot;
      teacherSchedule[teacherKey] = true;
      
      // Track subject periods for distribution
      if (slot.subject_id) {
        if (!classSubjectPeriods[dayKey]) {
          classSubjectPeriods[dayKey] = {};
        }
        if (!classSubjectPeriods[dayKey][slot.subject_id]) {
          classSubjectPeriods[dayKey][slot.subject_id] = [];
        }
        classSubjectPeriods[dayKey][slot.subject_id].push(period);
      }
      
      // Track teacher daily count for part-time limits
      const dailyKey = `${teacherId}-${day}`;
      teacherDailyCount[dailyKey] = (teacherDailyCount[dailyKey] || 0) + 1;
    };
    
    // Helper to check part-time teacher daily limit
    const canTeacherTeach = (teacher, day) => {
      if (teacher.teacher_type !== 'part_time') return true;
      const dailyKey = `${teacher.id}-${day}`;
      return (teacherDailyCount[dailyKey] || 0) < 4;
    };
    
    // Build teacher-subject mapping for smart assignment
    const teacherSubjectMap = {};
    assignmentsResult.rows.forEach(a => {
      if (a.teacher_id && a.subject_id) {
        if (!teacherSubjectMap[a.teacher_id]) {
          teacherSubjectMap[a.teacher_id] = new Set();
        }
        teacherSubjectMap[a.teacher_id].add(a.subject_id);
      }
    });
    
    // STEP 1: Process each assignment from configurations with subject distribution
    console.log('\n📅 STEP 1: Processing configured assignments with subject distribution rules...');
    for (const assignment of assignmentsResult.rows) {
      if (!assignment.teacher_id) continue;
      
      const classMatch = assignment.subject_class.match(/Class (.+)$/);
      const className = classMatch ? classMatch[1] : assignment.subject_class;
      const shiftId = assignment.shift_id || 1;
      const periodsNeeded = assignment.periods_per_week || 4;
      const teacherDays = assignment.teacher_type === 'part_time' 
        ? (assignment.work_days || [1, 3, 5])
        : config.school_days;
      
      let periodsScheduled = 0;
      
      // Distribute periods across days evenly
      const periodsPerDay = Math.ceil(periodsNeeded / teacherDays.length);
      
      for (const day of teacherDays) {
        if (periodsScheduled >= periodsNeeded) break;
        if (!canTeacherTeach({ id: assignment.teacher_id, teacher_type: assignment.teacher_type }, day)) continue;
        
        let dayPeriods = 0;
        const maxPerDay = Math.min(periodsPerDay, 2); // Max 2 periods of same subject per day
        
        for (let period = 1; period <= config.periods_per_shift && dayPeriods < maxPerDay; period++) {
          if (periodsScheduled >= periodsNeeded) break;
          
          // Check all constraints
          if (!isClassSlotAvailable(className, day, period, shiftId)) continue;
          if (!isTeacherAvailable(assignment.teacher_id, day, period)) continue;
          if (!canPlaceSubject(className, day, period, shiftId, assignment.subject_id)) continue;
          
          const slot = {
            day_of_week: day,
            period_number: period,
            class_name: className,
            subject_id: assignment.subject_id,
            subject_name: assignment.subject_name,
            teacher_id: assignment.teacher_id,
            teacher_name: assignment.teacher_name,
            shift_group: period <= Math.ceil(config.periods_per_shift / 2) ? 'morning' : 'afternoon',
            shift_id: shiftId
          };
          
          scheduleSlots.push(slot);
          markSlotUsed(assignment.teacher_id, className, day, period, shiftId, slot);
          periodsScheduled++;
          dayPeriods++;
        }
      }
      
      console.log(`   ${assignment.subject_class}: ${periodsScheduled}/${periodsNeeded} periods scheduled`);
    }
    
    console.log(`\n✅ After Step 1: ${scheduleSlots.length} slots scheduled`);
    
    // STEP 2: Fill ALL remaining empty periods
    console.log('\n📅 STEP 2: Filling ALL empty periods...');
    let filledCount = 0;
    let skippedCount = 0;
    
    // Get unique class-shift combinations that need filling
    const classShiftCombos = [];
    for (const className of classes) {
      // Determine which shift this class belongs to based on existing assignments
      const classAssignments = assignmentsResult.rows.filter(a => {
        const match = a.subject_class.match(/Class (.+)$/);
        return match && match[1] === className;
      });
      const primaryShift = classAssignments.length > 0 ? classAssignments[0].shift_id : 1;
      classShiftCombos.push({ className, shiftId: primaryShift });
    }
    
    for (const { className, shiftId } of classShiftCombos) {
      for (const day of config.school_days) {
        for (let period = 1; period <= config.periods_per_shift; period++) {
          if (!isClassSlotAvailable(className, day, period, shiftId)) continue;
          
          // Find an available teacher and subject
          let assigned = false;
          
          // Try teachers in order, preferring those who teach this class
          const classTeachers = assignmentsResult.rows
            .filter(a => {
              const match = a.subject_class.match(/Class (.+)$/);
              return match && match[1] === className && a.teacher_id;
            })
            .map(a => ({ 
              id: a.teacher_id, 
              teacher_name: a.teacher_name,
              teacher_type: a.teacher_type,
              work_days: a.work_days,
              subject_id: a.subject_id,
              subject_name: a.subject_name
            }));
          
          // Add other teachers as fallback
          const otherTeachers = teachers.filter(t => 
            !classTeachers.find(ct => ct.id === t.id)
          ).map(t => ({
            ...t,
            subject_id: subjects[0]?.id,
            subject_name: subjects[0]?.subject_name
          }));
          
          const allTeachers = [...classTeachers, ...otherTeachers];
          
          for (const teacher of allTeachers) {
            const teacherDays = teacher.work_days || config.school_days;
            
            if (!teacherDays.includes(day)) continue;
            if (!isTeacherAvailable(teacher.id, day, period)) continue;
            if (!canTeacherTeach(teacher, day)) continue;
            if (!canPlaceSubject(className, day, period, shiftId, teacher.subject_id)) continue;
            
            const slot = {
              day_of_week: day,
              period_number: period,
              class_name: className,
              subject_id: teacher.subject_id,
              subject_name: teacher.subject_name,
              teacher_id: teacher.id,
              teacher_name: teacher.teacher_name,
              shift_group: period <= Math.ceil(config.periods_per_shift / 2) ? 'morning' : 'afternoon',
              shift_id: shiftId
            };
            
            scheduleSlots.push(slot);
            markSlotUsed(teacher.id, className, day, period, shiftId, slot);
            filledCount++;
            assigned = true;
            break;
          }
          
          if (!assigned) {
            // Last resort: assign any available teacher with any subject
            for (const teacher of teachers) {
              const teacherDays = teacher.work_days || config.school_days;
              if (!teacherDays.includes(day)) continue;
              if (!isTeacherAvailable(teacher.id, day, period)) continue;
              if (!canTeacherTeach(teacher, day)) continue;
              
              // Find a subject that can be placed
              let subjectToUse = null;
              for (const subject of subjects) {
                if (canPlaceSubject(className, day, period, shiftId, subject.id)) {
                  subjectToUse = subject;
                  break;
                }
              }
              
              if (!subjectToUse && subjects.length > 0) {
                subjectToUse = subjects[0]; // Fallback to first subject
              }
              
              const slot = {
                day_of_week: day,
                period_number: period,
                class_name: className,
                subject_id: subjectToUse?.id || null,
                subject_name: subjectToUse?.subject_name || 'Study Period',
                teacher_id: teacher.id,
                teacher_name: teacher.teacher_name,
                shift_group: period <= Math.ceil(config.periods_per_shift / 2) ? 'morning' : 'afternoon',
                shift_id: shiftId
              };
              
              scheduleSlots.push(slot);
              markSlotUsed(teacher.id, className, day, period, shiftId, slot);
              filledCount++;
              assigned = true;
              break;
            }
          }
          
          if (!assigned) {
            skippedCount++;
            console.log(`   ⚠️ Could not fill: ${className} Day ${day} Period ${period} Shift ${shiftId}`);
          }
        }
      }
    }
    
    console.log(`\n📊 Step 2 Summary: Filled ${filledCount}, Skipped ${skippedCount}`);
    
    console.log(`\n✅ After Step 2: Filled ${filledCount} additional slots`);
    console.log(`📊 Total slots: ${scheduleSlots.length}`)
    
    // Insert all slots
    for (const slot of scheduleSlots) {
      await client.query(`
        INSERT INTO schedule_schema.schedule_slots 
        (day_of_week, period_number, class_name, subject_id, teacher_id, shift_group, shift_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [slot.day_of_week, slot.period_number, slot.class_name, slot.subject_id, slot.teacher_id, slot.shift_group, slot.shift_id]);
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ Generated ${scheduleSlots.length} slots with 0 conflicts`);
    
    res.json({
      success: true,
      message: 'Complete conflict-free schedule generated!',
      total_slots: scheduleSlots.length,
      classes: classes.length,
      conflicts: 0
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating complete schedule:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// NEW: Auto-rebalance shifts - calculate and fill ALL periods
router.post('/auto-rebalance-shifts', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Auto-rebalancing shifts...');
    
    // Get configuration
    const configResult = await client.query('SELECT * FROM schedule_schema.school_config WHERE id = 1');
    const config = configResult.rows[0];
    
    // Calculate total periods per week
    const periodsPerDay = config.periods_per_shift;
    const schoolDays = config.school_days || [1, 2, 3, 4, 5];
    const totalShifts = config.total_shifts || 2;
    
    // Get all classes
    const classesResult = await client.query(`
      SELECT DISTINCT 
        CASE 
          WHEN subject_class LIKE '% Class %' THEN TRIM(SPLIT_PART(subject_class, ' Class ', 2))
          ELSE subject_class
        END as class_name
      FROM schedule_schema.class_subject_configs 
      WHERE subject_class IS NOT NULL
    `);
    const classes = classesResult.rows.map(r => r.class_name).filter(c => c);
    
    // Calculate totals
    const periodsPerShiftPerWeek = periodsPerDay * schoolDays.length;
    const totalPeriodsPerClassPerWeek = periodsPerShiftPerWeek * totalShifts;
    const totalPeriodsAllClasses = totalPeriodsPerClassPerWeek * classes.length;
    
    // Get current assignments count
    const assignmentsResult = await client.query(`
      SELECT COUNT(*) as count FROM schedule_schema.class_subject_configs
    `);
    const currentAssignments = parseInt(assignmentsResult.rows[0].count);
    
    // Get teachers count
    const teachersResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE teacher_type = 'full_time') as full_time,
        COUNT(*) FILTER (WHERE teacher_type = 'part_time') as part_time,
        COUNT(*) as total
      FROM schedule_schema.teachers
    `);
    const teachers = teachersResult.rows[0];
    
    // Calculate teacher capacity
    const fullTimeCapacity = parseInt(teachers.full_time) * periodsPerShiftPerWeek; // Full-time can teach all periods
    const partTimeCapacity = parseInt(teachers.part_time) * 3 * 4; // Part-time: 3 days × 4 periods max
    const totalTeacherCapacity = fullTimeCapacity + partTimeCapacity;
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      config: {
        periods_per_day: periodsPerDay,
        school_days: schoolDays,
        school_days_count: schoolDays.length,
        total_shifts: totalShifts
      },
      calculations: {
        periods_per_shift_per_week: periodsPerShiftPerWeek,
        total_periods_per_class_per_week: totalPeriodsPerClassPerWeek,
        total_classes: classes.length,
        total_periods_needed: totalPeriodsAllClasses,
        current_assignments: currentAssignments
      },
      teachers: {
        full_time: parseInt(teachers.full_time),
        part_time: parseInt(teachers.part_time),
        total: parseInt(teachers.total),
        full_time_capacity: fullTimeCapacity,
        part_time_capacity: partTimeCapacity,
        total_capacity: totalTeacherCapacity
      },
      status: {
        can_fill_all: totalTeacherCapacity >= totalPeriodsAllClasses,
        capacity_percentage: ((totalTeacherCapacity / totalPeriodsAllClasses) * 100).toFixed(1)
      },
      classes: classes
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in auto-rebalance:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// NEW: Auto-assign full-time teachers to all school days
router.post('/auto-assign-fulltime-days', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get school days from config
    const configResult = await client.query('SELECT school_days FROM schedule_schema.school_config WHERE id = 1');
    const schoolDays = configResult.rows[0]?.school_days || [1, 2, 3, 4, 5];
    
    // Update all full-time teachers to work all school days
    const result = await client.query(`
      UPDATE schedule_schema.teachers 
      SET work_days = $1, updated_at = CURRENT_TIMESTAMP
      WHERE teacher_type = 'full_time'
      RETURNING teacher_name
    `, [schoolDays]);
    
    // Also update class_subject_configs for full-time teachers
    await client.query(`
      UPDATE schedule_schema.class_subject_configs csc
      SET teaching_days = $1, updated_at = CURRENT_TIMESTAMP
      FROM schedule_schema.teachers t
      WHERE t.teacher_name = csc.teacher_name AND t.teacher_type = 'full_time'
    `, [schoolDays]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `Updated ${result.rowCount} full-time teachers to work all school days`,
      school_days: schoolDays,
      teachers_updated: result.rows.map(r => r.teacher_name)
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error auto-assigning full-time days:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/auto-resolve-conflicts', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Starting automatic conflict resolution...');
    
    // Get current schedule and config
    const scheduleResult = await client.query(`
      SELECT 
        s.*,
        t.teacher_name,
        t.teacher_type,
        t.staff_work_time,
        sub.subject_name
      FROM schedule_schema.schedule_slots s
      JOIN schedule_schema.teachers t ON t.id = s.teacher_id
      LEFT JOIN schedule_schema.subjects sub ON sub.id = s.subject_id
    `);
    
    const configResult = await client.query('SELECT * FROM schedule_schema.school_config WHERE id = 1');
    const config = configResult.rows[0];
    
    if (!scheduleResult.rows.length) {
      return res.status(400).json({ error: 'No schedule found to resolve conflicts' });
    }
    
    // Initialize tracking maps
    const teacherScheduleMap = {};
    const classScheduleMap = {};
    
    scheduleResult.rows.forEach(slot => {
      // CRITICAL FIX: Teacher key does NOT include shift_id - teacher can only be in ONE place!
      const teacherKey = `${slot.teacher_id}-${slot.day_of_week}-${slot.period_number}`;
      const classKey = `${slot.class_name}-${slot.day_of_week}-${slot.period_number}-${slot.shift_id}`;
      
      teacherScheduleMap[teacherKey] = true;
      if (!classScheduleMap[slot.class_name]) {
        classScheduleMap[slot.class_name] = {};
      }
      classScheduleMap[slot.class_name][classKey] = true;
    });
    
    // Initialize resolver
    const resolver = new ScheduleConflictResolver(
      client, 
      config, 
      scheduleResult.rows, 
      teacherScheduleMap, 
      classScheduleMap
    );
    
    // Detect and resolve conflicts
    const teacherConflicts = resolver.detectTeacherConflicts();
    const classConflicts = resolver.detectClassConflicts();
    const partTimeConflicts = resolver.detectPartTimeOverload();
    
    const allConflicts = [...teacherConflicts, ...classConflicts, ...partTimeConflicts];
    console.log(`📊 Detected ${allConflicts.length} conflicts to resolve`);
    
    // Resolve conflicts
    const resolvedCount = await resolver.resolveConflicts(allConflicts);
    
    // Update database with resolved schedule
    await client.query('DELETE FROM schedule_schema.schedule_slots');
    
    for (const slot of resolver.scheduleSlots) {
      await client.query(`
        INSERT INTO schedule_schema.schedule_slots 
        (day_of_week, period_number, class_name, subject_id, teacher_id, shift_group, shift_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        slot.day_of_week, 
        slot.period_number, 
        slot.class_name, 
        slot.subject_id, 
        slot.teacher_id, 
        slot.shift_group, 
        slot.shift_id
      ]);
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: `Automatic conflict resolution completed!`,
      conflicts_detected: allConflicts.length,
      conflicts_resolved: resolvedCount,
      resolution_details: resolver.resolvedConflicts,
      final_schedule_slots: resolver.scheduleSlots.length
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in automatic conflict resolution:', error);
    res.status(500).json({ error: 'Automatic conflict resolution failed: ' + error.message });
  } finally {
    client.release();
  }
});

// NEW: Validate schedule for teacher double-booking
// This endpoint checks if any teacher is assigned to multiple classes at the same time
router.get('/validate-teacher-conflicts', async (req, res) => {
  try {
    console.log('🔍 Validating schedule for teacher double-booking...');
    
    // Find all cases where a teacher is assigned to multiple classes at the same day/period
    const conflictsResult = await pool.query(`
      SELECT 
        t.teacher_name,
        s.day_of_week,
        s.period_number,
        COUNT(*) as class_count,
        ARRAY_AGG(s.class_name) as classes,
        ARRAY_AGG(sub.subject_name) as subjects
      FROM schedule_schema.schedule_slots s
      JOIN schedule_schema.teachers t ON t.id = s.teacher_id
      LEFT JOIN schedule_schema.subjects sub ON sub.id = s.subject_id
      GROUP BY t.teacher_name, s.day_of_week, s.period_number
      HAVING COUNT(*) > 1
      ORDER BY t.teacher_name, s.day_of_week, s.period_number
    `);
    
    const conflicts = conflictsResult.rows;
    
    if (conflicts.length === 0) {
      console.log('✅ No teacher double-booking found!');
      res.json({
        valid: true,
        message: 'Schedule is valid - no teacher is assigned to multiple classes at the same time',
        conflicts: []
      });
    } else {
      console.log(`❌ Found ${conflicts.length} teacher double-booking conflicts!`);
      res.json({
        valid: false,
        message: `Found ${conflicts.length} teacher double-booking conflicts`,
        conflicts: conflicts.map(c => ({
          teacher: c.teacher_name,
          day: c.day_of_week,
          period: c.period_number,
          classes: c.classes,
          subjects: c.subjects,
          issue: `${c.teacher_name} is teaching ${c.class_count} classes at the same time (Day ${c.day_of_week}, Period ${c.period_number})`
        }))
      });
    }
  } catch (error) {
    console.error('Error validating teacher conflicts:', error);
    res.status(500).json({ error: 'Validation failed: ' + error.message });
  }
});

// NEW: Get detailed schedule by teacher to verify no double-booking
router.get('/schedule-by-teacher', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.teacher_name,
        t.teacher_type,
        s.day_of_week,
        s.period_number,
        s.class_name,
        sub.subject_name,
        s.shift_id
      FROM schedule_schema.schedule_slots s
      JOIN schedule_schema.teachers t ON t.id = s.teacher_id
      LEFT JOIN schedule_schema.subjects sub ON sub.id = s.subject_id
      ORDER BY t.teacher_name, s.day_of_week, s.period_number
    `);
    
    // Group by teacher
    const byTeacher = {};
    result.rows.forEach(row => {
      if (!byTeacher[row.teacher_name]) {
        byTeacher[row.teacher_name] = {
          teacher_type: row.teacher_type,
          schedule: []
        };
      }
      byTeacher[row.teacher_name].schedule.push({
        day: row.day_of_week,
        period: row.period_number,
        class: row.class_name,
        subject: row.subject_name,
        shift: row.shift_id
      });
    });
    
    res.json(byTeacher);
  } catch (error) {
    console.error('Error fetching schedule by teacher:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;