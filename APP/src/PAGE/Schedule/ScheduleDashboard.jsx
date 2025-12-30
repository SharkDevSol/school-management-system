// PAGE/Schedule/ScheduleDashboard.jsx - UPDATED WITH CONFLICT RESOLUTION STATUS
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../../context/AppContext';
import styles from './ScheduleDashboard.module.css';

const ScheduleDashboard = () => {
  const { t } = useApp();
  const [activeShift, setActiveShift] = useState(1);
  const [schedule, setSchedule] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedConflict, setExpandedConflict] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [teacherStats, setTeacherStats] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [partTimeTeacherDetails, setPartTimeTeacherDetails] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('timetable');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');
  const [systemStatus, setSystemStatus] = useState('checking');
  const [conflictResolutionStatus, setConflictResolutionStatus] = useState('idle'); // NEW
  const navigate = useNavigate();

  const daysOfWeek = [
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' },
    { id: 7, name: 'Sunday', short: 'Sun' }
  ];

  useEffect(() => {
    fetchAllData();
  }, [activeShift, forceRefresh]);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      console.log('Starting comprehensive data fetch...');
      
      // Fetch all data in parallel
      const [scheduleResponse, conflictsResponse, configResponse, debugResponse, classesResponse] = await Promise.all([
        axios.get('/api/schedule/schedule'),
        axios.get('/api/schedule/conflicts'),
        axios.get('/api/schedule/config'),
        axios.get('/api/schedule/debug-schedule-status'),
        axios.get('/api/schedule/all-classes')
      ]);

      console.log('=== DATA FETCH COMPLETE ===');
      console.log('Schedule slots:', scheduleResponse.data.length);
      console.log('All classes:', classesResponse.data.length);
      console.log('Config:', configResponse.data);
      
      // Enhanced part-time analysis
      const partTimeSlots = scheduleResponse.data.filter(slot => 
        slot.teacher_type === 'part_time' || 
        (slot.staff_work_time && slot.staff_work_time.toLowerCase().includes('part'))
      );
      
      console.log('Part-time analysis:', {
        totalPartTimeSlots: partTimeSlots.length,
        partTimeTeachers: [...new Set(partTimeSlots.map(slot => slot.teacher_name))],
        partTimeClasses: [...new Set(partTimeSlots.map(slot => slot.class_name))]
      });

      setSchedule(scheduleResponse.data);
      setConflicts(conflictsResponse.data);
      setConfig(configResponse.data);
      setDebugInfo(debugResponse.data);
      setAllClasses(classesResponse.data);

      // Calculate teacher stats and generate recommendations
      if (scheduleResponse.data && scheduleResponse.data.length > 0) {
        calculateTeacherStats(scheduleResponse.data);
        generateRecommendations(scheduleResponse.data);
      }

      // Update system status
      updateSystemStatus(scheduleResponse.data, debugResponse.data, classesResponse.data);

      // Fetch part-time teacher details
      await fetchPartTimeTeacherDetails();

    } catch (error) {
      console.error('Error fetching all data:', error);
      setError('Failed to load schedule data. Please check if the schedule was generated in Task 7.');
      setSystemStatus('error');
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  // NEW: Handle automatic conflict resolution
  const handleAutoResolveConflicts = async () => {
    setConflictResolutionStatus('resolving');
    setError('');
    setSuccess('');
    try {
      const result = await axios.post('/api/schedule/auto-resolve-conflicts');
      
      setSuccess(`✅ Automatic conflict resolution completed! ${result.data.conflicts_resolved} conflicts resolved out of ${result.data.conflicts_detected} detected.`);
      setConflictResolutionStatus('resolved');
      
      // Refresh data to show updated schedule
      await fetchAllData();
    } catch (error) {
      setError('Failed to automatically resolve conflicts: ' + error.message);
      setConflictResolutionStatus('error');
    }
  };

  const updateSystemStatus = (scheduleData, debugData, classesData) => {
    if (!scheduleData || scheduleData.length === 0) {
      setSystemStatus('no_schedule');
    } else if (debugData?.partTimeSlots?.part_time_slots === 0 && debugData?.partTimeTeachers?.part_time_count > 0) {
      setSystemStatus('part_time_issues');
    } else if (classesData.length === 0) {
      setSystemStatus('no_classes');
    } else {
      setSystemStatus('healthy');
    }
  };

  const fetchPartTimeTeacherDetails = async () => {
    try {
      const response = await axios.get('/api/schedule/debug-part-time-teachers');
      console.log('Part-time teacher details:', response.data);
      setPartTimeTeacherDetails(response.data);
    } catch (error) {
      console.error('Error fetching part-time teacher details:', error);
      // Create fallback from schedule data
      const partTimeSlots = schedule.filter(slot => 
        slot.teacher_type === 'part_time' || 
        (slot.staff_work_time && slot.staff_work_time.toLowerCase().includes('part'))
      );
      
      const fallbackData = {
        part_time_teachers: [...new Set(partTimeSlots.map(slot => ({
          teacher_name: slot.teacher_name,
          teacher_type: 'part_time',
          staff_work_time: slot.staff_work_time || 'Part Time',
          work_days: [...new Set(partTimeSlots
            .filter(s => s.teacher_name === slot.teacher_name)
            .map(s => s.day_of_week)
          )].sort()
        })))],
        summary: {
          total_part_time_teachers: new Set(partTimeSlots.map(slot => slot.teacher_name)).size,
          total_part_time_slots: partTimeSlots.length
        }
      };
      setPartTimeTeacherDetails(fallbackData);
    }
  };

  const calculateTeacherStats = (scheduleData) => {
    const stats = {};
    
    scheduleData.forEach(slot => {
      const teacherName = slot.teacher_name;
      if (!teacherName) return;
      
      if (!stats[teacherName]) {
        stats[teacherName] = {
          periods: 0,
          days: new Set(),
          classes: new Set(),
          subjects: new Set(),
          workTime: slot.staff_work_time || 'Full Time',
          teacherType: slot.teacher_type || (slot.staff_work_time && slot.staff_work_time.toLowerCase().includes('part') ? 'part_time' : 'full_time'),
          shift1: 0,
          shift2: 0,
          periodsByDay: {}
        };
      }
      
      stats[teacherName].periods++;
      stats[teacherName].days.add(slot.day_of_week);
      stats[teacherName].classes.add(slot.class_name);
      stats[teacherName].subjects.add(slot.subject_name);
      
      // Track periods by day
      if (!stats[teacherName].periodsByDay[slot.day_of_week]) {
        stats[teacherName].periodsByDay[slot.day_of_week] = 0;
      }
      stats[teacherName].periodsByDay[slot.day_of_week]++;
      
      const shiftId = normalizeShiftId(slot.shift_id);
      if (shiftId === 1) {
        stats[teacherName].shift1++;
      } else {
        stats[teacherName].shift2++;
      }
    });
    
    setTeacherStats(stats);
  };

  const generateRecommendations = (scheduleData) => {
    if (!config) return;
    
    const recs = [];
    const classesInSchedule = [...new Set(scheduleData.map(slot => slot.class_name))].filter(Boolean);
    const schoolDays = config.school_days || [1, 2, 3, 4, 5];
    const periods = Array.from({ length: config.periods_per_shift || 7 }, (_, i) => i + 1);
    
    // Check for classes with no schedule data in current shift
    allClasses.forEach(className => {
      const hasDataInShift = scheduleData.some(slot => 
        slot.class_name === className && 
        normalizeShiftId(slot.shift_id) === activeShift
      );
      
      if (!hasDataInShift) {
        recs.push({
          type: 'MISSING_CLASS_DATA',
          class: className,
          shift: activeShift,
          message: `No schedule data found for ${className} in Shift ${activeShift}`,
          suggestion: 'Check if this class is assigned to the correct shift in Task 7 configuration',
          priority: 'high'
        });
      }
    });
    
    // Check for empty periods
    classesInSchedule.forEach(className => {
      schoolDays.forEach(dayId => {
        periods.forEach(period => {
          const hasSlot = scheduleData.some(slot => 
            slot.class_name === className && 
            slot.day_of_week === dayId && 
            slot.period_number === period &&
            normalizeShiftId(slot.shift_id) === activeShift
          );
          
          if (!hasSlot) {
            recs.push({
              type: 'EMPTY_PERIOD',
              class: className,
              day: daysOfWeek.find(d => d.id === dayId)?.name || `Day ${dayId}`,
              period: period,
              shift: activeShift,
              message: `Empty period in ${className} on ${daysOfWeek.find(d => d.id === dayId)?.name} Period ${period} (Shift ${activeShift})`,
              suggestion: 'Consider assigning a teacher or moving existing assignments',
              priority: 'medium'
            });
          }
        });
      });
    });
    
    // Check for teacher overutilization
    Object.entries(teacherStats).forEach(([teacherName, stats]) => {
      if (stats.periods > 30) {
        recs.push({
          type: 'TEACHER_OVERUTILIZED',
          teacher: teacherName,
          periods: stats.periods,
          message: `${teacherName} is scheduled for ${stats.periods} periods (max recommended: 30)`,
          suggestion: 'Consider redistributing some periods to other teachers',
          priority: 'high'
        });
      }
      
      if (stats.teacherType === 'part_time' && stats.periods > 20) {
        recs.push({
          type: 'PART_TIME_OVERLOAD',
          teacher: teacherName,
          periods: stats.periods,
          message: `Part-time teacher ${teacherName} is scheduled for ${stats.periods} periods`,
          suggestion: 'Reduce workload for part-time teacher',
          priority: 'high'
        });
      }

      // Check part-time teacher daily limits
      if (stats.teacherType === 'part_time') {
        Object.entries(stats.periodsByDay).forEach(([day, dayPeriods]) => {
          if (dayPeriods > 4) {
            recs.push({
              type: 'PART_TIME_DAILY_OVERLOAD',
              teacher: teacherName,
              day: daysOfWeek.find(d => d.id === parseInt(day))?.name || `Day ${day}`,
              periods: dayPeriods,
              message: `Part-time teacher ${teacherName} has ${dayPeriods} periods on ${daysOfWeek.find(d => d.id === parseInt(day))?.name} (max 4)`,
              suggestion: 'Reduce daily workload for part-time teacher',
              priority: 'high'
            });
          }
        });
      }
    });
    
    // Sort by priority
    recs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    setRecommendations(recs);
  };

  const fetchDebugInfo = async () => {
    try {
      const response = await axios.get('/api/schedule/debug-schedule-status');
      setDebugInfo(response.data);
    } catch (error) {
      console.error('Error fetching debug info:', error);
    }
  };

  const fetchConflicts = async () => {
    try {
      const response = await axios.get('/api/schedule/conflicts');
      setConflicts(response.data);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/schedule/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const toggleConflict = (id) => {
    setExpandedConflict(expandedConflict === id ? null : id);
  };

  const refreshSchedule = () => {
    fetchAllData();
  };

  const generateCompleteSchedule = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // First sync teachers
      await axios.post('/api/schedule/enhanced-sync-teachers');
      
      // Generate complete conflict-free schedule
      const response = await axios.post('/api/schedule/generate-complete-schedule');
      
      // Refresh all data
      await fetchAllData();
      
      setSuccess(`✅ Complete schedule generated! ${response.data.total_slots} slots created with ${response.data.conflicts} conflicts.`);
      setConflictResolutionStatus('resolved');
    } catch (error) {
      setError('❌ Schedule generation failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const forceRefreshData = async () => {
    setLoading(true);
    try {
      await axios.post('/api/schedule/enhanced-sync-teachers');
      const response = await axios.post('/api/schedule/force-regenerate-schedule');
      await fetchAllData();
      setSuccess(`✅ Schedule regenerated! ${response.data.slots_generated} slots created.`);
    } catch (error) {
      setError('❌ Refresh failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const debugPartTimeSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/schedule/debug-part-time-schedule');
      console.log('Part-time schedule debug:', response.data);
      
      if (response.data.part_time_slots.length === 0) {
        setError('❌ No part-time teacher slots found in schedule. Please regenerate schedule in Task 7.');
      } else {
        setSuccess(`✅ Found ${response.data.part_time_slots.length} part-time teacher slots across ${response.data.summary.days.length} days`);
      }
    } catch (error) {
      console.error('Debug part-time schedule failed:', error);
      setError('Debug failed. Please check if part-time teachers are properly assigned in Task 6.');
    } finally {
      setLoading(false);
    }
  };

  const normalizeShiftId = (shiftId) => {
    if (shiftId === null || shiftId === undefined) return 1;
    if (typeof shiftId === 'string') return parseInt(shiftId, 10);
    if (typeof shiftId === 'boolean') return shiftId ? 1 : 2;
    return shiftId;
  };

  // Enhanced filtering to include all classes
  const filteredSchedule = schedule.filter(slot => {
    const slotShiftId = normalizeShiftId(slot.shift_id);
    return slotShiftId === activeShift;
  });

  // Get classes - include ALL classes, not just those with schedule data
  const classes = allClasses.length > 0 ? allClasses.sort() : 
    [...new Set(filteredSchedule.map(slot => slot.class_name))]
      .filter(Boolean)
      .sort();

  // Get periods from config
  const periods = Array.from({ length: config?.periods_per_shift || 7 }, (_, i) => i + 1);

  // Get school days from config
  const schoolDays = config?.school_days || [1, 2, 3, 4, 5];

  // Enhanced getSubjectForSlot to handle missing data better
  const getSubjectForSlot = (className, dayId, periodNumber) => {
    const slot = filteredSchedule.find(s => 
      s.class_name === className && 
      s.day_of_week === dayId && 
      s.period_number === periodNumber
    );
    
    if (!slot) return null;

    const teacherName = slot.teacher_name;
    const workTime = slot.staff_work_time || 'Full Time';
    const teacherType = slot.teacher_type || (workTime.toLowerCase().includes('part') ? 'part_time' : 'full_time');

    // Enhanced conflict detection
    const hasConflict = filteredSchedule.some(otherSlot => 
      otherSlot.teacher_name === teacherName &&
      otherSlot.day_of_week === dayId &&
      otherSlot.period_number === periodNumber &&
      otherSlot.id !== slot.id &&
      otherSlot.class_name !== className
    );

    return {
      subject: slot.subject_name || 'No Subject',
      teacher: teacherName || 'No Teacher',
      code: slot.subject_code,
      shiftGroup: slot.shift_group,
      workTime: workTime,
      teacherType: teacherType,
      hasConflict: hasConflict,
      isPartTime: teacherType === 'part_time'
    };
  };

  // Get slot counts for each shift
  const getShiftSlotCounts = () => {
    const shift1Count = schedule.filter(slot => normalizeShiftId(slot.shift_id) === 1).length;
    const shift2Count = schedule.filter(slot => normalizeShiftId(slot.shift_id) === 2).length;
    return { shift1: shift1Count, shift2: shift2Count };
  };

  const shiftCounts = getShiftSlotCounts();

  // Enhanced teacher stats for current shift
  const getCurrentShiftTeacherStats = () => {
    const currentStats = {};
    
    filteredSchedule.forEach(slot => {
      const teacherName = slot.teacher_name;
      if (!teacherName) return;
      
      if (!currentStats[teacherName]) {
        currentStats[teacherName] = {
          periods: 0,
          days: new Set(),
          classes: new Set(),
          workTime: slot.staff_work_time || 'Full Time',
          teacherType: slot.teacher_type || (slot.staff_work_time && slot.staff_work_time.toLowerCase().includes('part') ? 'part_time' : 'full_time'),
          periodsByDay: {}
        };
      }
      
      currentStats[teacherName].periods++;
      currentStats[teacherName].days.add(slot.day_of_week);
      currentStats[teacherName].classes.add(slot.class_name);
      
      // Track periods by day
      if (!currentStats[teacherName].periodsByDay[slot.day_of_week]) {
        currentStats[teacherName].periodsByDay[slot.day_of_week] = 0;
      }
      currentStats[teacherName].periodsByDay[slot.day_of_week]++;
    });
    
    return currentStats;
  };

  const currentShiftTeacherStats = getCurrentShiftTeacherStats();

  // Enhanced conflict analysis
  const analyzeConflicts = () => {
    const teacherConflicts = conflicts.filter(c => c.conflict_type === 'TEACHER_DOUBLE_BOOKING');
    const insufficientSlots = conflicts.filter(c => c.conflict_type === 'INSUFFICIENT_SLOTS');
    const otherConflicts = conflicts.filter(c => 
      c.conflict_type !== 'TEACHER_DOUBLE_BOOKING' && 
      c.conflict_type !== 'INSUFFICIENT_SLOTS'
    );

    return {
      teacherConflicts,
      insufficientSlots,
      otherConflicts,
      total: conflicts.length
    };
  };

  const conflictAnalysis = analyzeConflicts();

  // Get part-time teacher summary
  const getPartTimeTeacherSummary = () => {
    const partTimeTeachers = Object.entries(currentShiftTeacherStats)
      .filter(([_, stats]) => stats.teacherType === 'part_time')
      .map(([teacherName, stats]) => ({
        name: teacherName,
        ...stats
      }));

    return partTimeTeachers;
  };

  const partTimeTeachers = getPartTimeTeacherSummary();

  // Calculate period times
  const calculatePeriodTime = (period) => {
    if (!config) return '';
    
    const startTime = activeShift === 1 ? '07:00' : '13:00';
    const periodDuration = config.period_duration || 45;
    const breakDuration = config.short_break_duration || 10;
    
    const periodStart = new Date(`2000-01-01T${startTime}`);
    periodStart.setMinutes(periodStart.getMinutes() + (period - 1) * (periodDuration + breakDuration));
    
    const periodEnd = new Date(periodStart);
    periodEnd.setMinutes(periodEnd.getMinutes() + periodDuration);
    
    const formatTime = (date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${ampm}`;
    };
    
    return `${formatTime(periodStart)} - ${formatTime(periodEnd)}`;
  };

  // Filter classes for dropdown
  const filteredClasses = selectedClass === 'all' 
    ? classes 
    : classes.filter(cls => cls === selectedClass);

  // Filter days for display
  const filteredDays = selectedDay === 'all'
    ? daysOfWeek.filter(day => schoolDays.includes(day.id))
    : daysOfWeek.filter(day => day.id === parseInt(selectedDay));

  // Get system status message
  const getSystemStatusMessage = () => {
    switch (systemStatus) {
      case 'healthy':
        return '✅ System is healthy and schedule is loaded';
      case 'no_schedule':
        return '❌ No schedule generated. Please complete Task 7.';
      case 'part_time_issues':
        return '⚠️ Part-time teachers detected but may have scheduling issues';
      case 'no_classes':
        return '❌ No classes found. Please complete previous tasks.';
      case 'error':
        return '❌ System error occurred';
      default:
        return '🔍 Checking system status...';
    }
  };

  // NEW: Get conflict resolution status message
  const getConflictResolutionStatus = () => {
    switch (conflictResolutionStatus) {
      case 'resolving':
        return '🔄 Resolving conflicts...';
      case 'resolved':
        return '✅ Conflicts resolved';
      case 'error':
        return '❌ Conflict resolution failed';
      default:
        return '';
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <h1>School Schedule Dashboard</h1>
          <div className={styles.headerActions}>
            <Link to="/tasks" className={styles.navLink}>← Back to Tasks</Link>
            <button onClick={refreshSchedule} className={styles.refreshButton}>
              🔄 Refresh
            </button>
            <button onClick={generateCompleteSchedule} className={styles.forceRefreshButton}>
              ✨ Generate Complete Schedule
            </button>
            
            {conflicts.length > 0 && (
              <button 
                onClick={handleAutoResolveConflicts} 
                disabled={conflictResolutionStatus === 'resolving'}
                className={styles.resolveButton}
              >
                {conflictResolutionStatus === 'resolving' ? '🔄 Resolving...' : '⚡ Fix Conflicts'}
              </button>
            )}
            {lastRefresh && (
              <span className={styles.lastRefresh}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Shift Selection</label>
            <div className={styles.shiftToggle}>
              <button
                className={activeShift === 1 ? styles.active : ''}
                onClick={() => setActiveShift(1)}
              >
                Shift 1 ({shiftCounts.shift1} slots)
              </button>
              <button
                className={activeShift === 2 ? styles.active : ''}
                onClick={() => setActiveShift(2)}
              >
                Shift 2 ({shiftCounts.shift2} slots)
              </button>
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Schedule Info</label>
            <div className={styles.scheduleInfo}>
              {config && (
                <>
                  <span>{config.periods_per_shift} periods/day</span>
                  <span>{config.period_duration} mins each</span>
                  <span>{schoolDays.length} teaching days</span>
                  <span>{classes.length} classes</span>
                  {conflictResolutionStatus && (
                    <span className={styles.conflictStatus}>
                      {getConflictResolutionStatus()}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      {debugInfo && (
        <div className={styles.systemStatus}>
          <div className={styles.statusHeader}>
            <h3>System Status</h3>
            <span className={styles.statusIndicator}>
              {getSystemStatusMessage()}
            </span>
          </div>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Total Slots:</span>
              <span className={styles.statusValue}>{schedule.length}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Shift 1 Slots:</span>
              <span className={styles.statusValue}>{shiftCounts.shift1}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Shift 2 Slots:</span>
              <span className={styles.statusValue}>{shiftCounts.shift2}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>All Classes:</span>
              <span className={styles.statusValue}>{allClasses.length}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Part-Time Teachers:</span>
              <span className={styles.statusValue}>
                {Object.values(teacherStats).filter(t => t.teacherType === 'part_time').length}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Conflicts:</span>
              <span className={`${styles.statusValue} ${conflicts.length > 0 ? styles.hasConflicts : ''}`}>
                {conflicts.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error and Success Messages */}
      {error && (
        <div className={styles.error}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorText}>{error}</div>
        </div>
      )}

      {success && (
        <div className={styles.success}>
          <div className={styles.successIcon}>✅</div>
          <div className={styles.successText}>{success}</div>
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading schedule data...</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={styles.tabNavigation}>
        <button 
          className={activeTab === 'timetable' ? styles.activeTab : ''}
          onClick={() => setActiveTab('timetable')}
        >
          📅 Timetable
        </button>
        <button 
          className={activeTab === 'teachers' ? styles.activeTab : ''}
          onClick={() => setActiveTab('teachers')}
        >
          👨‍🏫 Teachers
        </button>
        <button 
          className={activeTab === 'conflicts' ? styles.activeTab : ''}
          onClick={() => setActiveTab('conflicts')}
        >
          ⚠️ Conflicts ({conflicts.length})
        </button>
      </div>

      {/* Main Content Based on Active Tab */}
      {activeTab === 'timetable' && (
        <div className={styles.timetableContainer}>
          <div className={styles.timetableHeader}>
            <h2>School Timetable - Shift {activeShift}</h2>
            <div className={styles.timetableFilters}>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Classes</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <select 
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Days</option>
                {daysOfWeek.filter(day => schoolDays.includes(day.id)).map(day => (
                  <option key={day.id} value={day.id}>{day.name}</option>
                ))}
              </select>
            </div>
          </div>

          {schedule.length === 0 ? (
            <div className={styles.noScheduleMessage}>
              <div className={styles.noScheduleIcon}>📋</div>
              <h4>No Schedule Generated</h4>
              <p>You haven't generated a schedule yet. Please complete Task 7 to create your school timetable.</p>
              <button 
                onClick={() => navigate('/tasks/7')}
                className={styles.primaryButton}
              >
                Go to Task 7 to Generate Schedule
              </button>
            </div>
          ) : (
            <div className={styles.timetableView}>
              {filteredDays.map(day => {
                const daySchedule = filteredSchedule.filter(slot => slot.day_of_week === day.id);
                
                return (
                  <div key={day.id} className={styles.dayTimetable}>
                    <div className={styles.dayHeader}>
                      <h3>{day.name}</h3>
                      <span className={styles.dayPeriods}>
                        {daySchedule.length} periods • {new Set(daySchedule.map(s => s.teacher_name)).size} teachers • {new Set(daySchedule.map(s => s.class_name)).size} classes
                      </span>
                    </div>
                    
                    <div className={styles.tableContainer}>
                      <table className={styles.timetableTable}>
                        <thead>
                          <tr>
                            <th className={styles.periodHeader}>Period</th>
                            {filteredClasses.map(className => (
                              <th key={className} className={styles.classHeader}>
                                {className}
                                <div className={styles.classStats}>
                                  {daySchedule.filter(s => s.class_name === className).length} periods
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {periods.map(period => (
                            <tr key={period} className={styles.periodRow}>
                              <td className={styles.periodNumber}>
                                <strong>Period {period}</strong>
                                <div className={styles.periodTime}>
                                  {calculatePeriodTime(period)}
                                </div>
                              </td>
                              {filteredClasses.map(className => {
                                const slotData = getSubjectForSlot(className, day.id, period);
                                const isEmpty = !slotData;
                                const hasConflict = slotData?.hasConflict;
                                const isPartTime = slotData?.isPartTime;
                                
                                return (
                                  <td key={className} className={`${styles.subjectCell} ${
                                    isEmpty ? styles.emptySlot : ''
                                  } ${hasConflict ? styles.conflictSlot : ''} ${
                                    isPartTime ? styles.partTimeSlot : ''
                                  }`}>
                                    {slotData ? (
                                      <div className={styles.subjectContent}>
                                        <div className={styles.subjectName}>
                                          {slotData.subject}
                                          {isPartTime && <span className={styles.partTimeIndicator}> ⏱️</span>}
                                        </div>
                                        <div className={styles.teacherName}>
                                          {slotData.teacher}
                                          {isPartTime && <span className={styles.partTimeBadge}>PT</span>}
                                        </div>
                                        <div className={styles.teacherDetails}>
                                          <span className={`${styles.workTimeBadge} ${
                                            isPartTime ? styles.partTime : styles.fullTime
                                          }`}>
                                            {slotData.workTime}
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={styles.emptySlotContent}>
                                        <span className={styles.emptyText}>Free</span>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className={styles.daySummary}>
                      <div className={styles.summaryItem}>
                        <strong>Teachers Today:</strong> {new Set(daySchedule.map(s => s.teacher_name)).size}
                      </div>
                      <div className={styles.summaryItem}>
                        <strong>Part-Time Teachers:</strong> {
                          new Set(daySchedule.filter(s => 
                            s.teacher_type === 'part_time' || 
                            (s.staff_work_time && s.staff_work_time.toLowerCase().includes('part'))
                          ).map(s => s.teacher_name)).size
                        }
                      </div>
                      <div className={styles.summaryItem}>
                        <strong>Subjects:</strong> {new Set(daySchedule.map(s => s.subject_name)).size}
                      </div>
                      <div className={styles.summaryItem}>
                        <strong>Periods Utilization:</strong> {daySchedule.length}/{periods.length * filteredClasses.length}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Teachers Tab */}
      {activeTab === 'teachers' && (
        <div className={styles.teacherSummary}>
          <div className={styles.sectionHeader}>
            <h3>👨‍🏫 Teacher Schedule Summary - Shift {activeShift}</h3>
            <div className={styles.teacherStatsOverview}>
              <span className={styles.teacherCount}>
                {Object.keys(currentShiftTeacherStats).length} teachers
              </span>
              <span className={styles.workTimeBreakdown}>
                {Object.values(currentShiftTeacherStats).filter(s => s.teacherType === 'full_time').length} Full-Time • 
                {Object.values(currentShiftTeacherStats).filter(s => s.teacherType === 'part_time').length} Part-Time
              </span>
            </div>
          </div>
          
          {/* Part-Time Teachers Section */}
          {partTimeTeachers.length > 0 && (
            <div className={styles.partTimeTeachersSection}>
              <h4>⏱️ Part-Time Teachers</h4>
              <div className={styles.teacherGrid}>
                {partTimeTeachers
                  .sort((a, b) => b.periods - a.periods)
                  .map((teacher, index) => (
                    <div key={`part-time-${index}`} className={`${styles.teacherCard} ${styles.partTimeCard}`}>
                      <div className={styles.teacherInfo}>
                        <h4 className={styles.teacherName}>{teacher.name}</h4>
                        <div className={styles.teacherStats}>
                          <span className={styles.periodCount}>{teacher.periods} periods</span>
                          <span className={styles.classCount}>{teacher.classes.size} classes</span>
                          <span className={`${styles.workTime} ${styles.partTime}`}>
                            {teacher.workTime}
                          </span>
                        </div>
                      </div>
                      <div className={styles.teacherDetails}>
                        <div className={styles.detailItem}>
                          <strong>Teaching Days:</strong> {teacher.days.size} days
                        </div>
                        <div className={styles.detailItem}>
                          <strong>Classes:</strong> {Array.from(teacher.classes).join(', ')}
                        </div>
                        <div className={styles.detailItem}>
                          <strong>Work Type:</strong> Part-Time
                        </div>
                        {teacher.periodsByDay && Object.keys(teacher.periodsByDay).length > 0 && (
                          <div className={styles.detailItem}>
                            <strong>Daily Breakdown:</strong>
                            <div className={styles.dailyPeriods}>
                              {Object.entries(teacher.periodsByDay).map(([day, count]) => (
                                <span key={day} className={styles.dayPeriod}>
                                  {daysOfWeek.find(d => d.id === parseInt(day))?.short}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Full-Time Teachers Section */}
          <div className={styles.fullTimeTeachersSection}>
            <h4>👨‍🏫 Full-Time Teachers</h4>
            <div className={styles.teacherGrid}>
              {Object.entries(currentShiftTeacherStats)
                .filter(([_, stats]) => stats.teacherType === 'full_time')
                .sort(([,a], [,b]) => b.periods - a.periods)
                .slice(0, 12)
                .map(([teacherName, stats]) => (
                  <div key={teacherName} className={styles.teacherCard}>
                    <div className={styles.teacherInfo}>
                      <h4 className={styles.teacherName}>{teacherName}</h4>
                      <div className={styles.teacherStats}>
                        <span className={styles.periodCount}>{stats.periods} periods</span>
                        <span className={styles.classCount}>{stats.classes.size} classes</span>
                        <span className={`${styles.workTime} ${styles.fullTime}`}>
                          {stats.workTime}
                        </span>
                      </div>
                    </div>
                    <div className={styles.teacherDetails}>
                      <div className={styles.detailItem}>
                        <strong>Teaching Days:</strong> {stats.days.size} days
                      </div>
                      <div className={styles.detailItem}>
                        <strong>Classes:</strong> {Array.from(stats.classes).join(', ')}
                      </div>
                      <div className={styles.detailItem}>
                        <strong>Work Type:</strong> Full-Time
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Conflicts Tab */}
      {activeTab === 'conflicts' && (
        <div className={styles.conflictsSection}>
          <div className={styles.sectionHeader}>
            <h3>⚠️ Schedule Conflicts</h3>
            <div className={styles.conflictStats}>
              <span className={styles.conflictStat}>
                Total: <strong>{conflictAnalysis.total}</strong>
              </span>
              <span className={styles.conflictStat}>
                Teacher Conflicts: <strong>{conflictAnalysis.teacherConflicts.length}</strong>
              </span>
              <span className={styles.conflictStat}>
                Insufficient Slots: <strong>{conflictAnalysis.insufficientSlots.length}</strong>
              </span>
            </div>
          </div>

          {conflicts.length === 0 ? (
            <div className={styles.noConflicts}>
              <div className={styles.noDataIcon}>✅</div>
              <h4>No Schedule Conflicts Found</h4>
              <p>Your schedule has been generated successfully without any conflicts.</p>
              
              {/* NEW: Auto-resolution success message */}
              {conflictResolutionStatus === 'resolved' && (
                <div className={styles.autoResolutionSuccess}>
                  <p>✅ All conflicts were automatically resolved during schedule generation.</p>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.conflictsList}>
              <div className={styles.conflictResolutionHeader}>
                <h4>Detected Conflicts</h4>
                <p>The system has detected {conflicts.length} conflicts that need attention.</p>
                
                {/* NEW: Auto-resolution option */}
                <div className={styles.autoResolutionOption}>
                  <button 
                    onClick={handleAutoResolveConflicts}
                    disabled={conflictResolutionStatus === 'resolving'}
                    className={styles.autoResolveButton}
                  >
                    {conflictResolutionStatus === 'resolving' ? (
                      <>
                        <span className={styles.spinner}></span>
                        Resolving Conflicts...
                      </>
                    ) : (
                      '⚡ Auto-Resolve All Conflicts'
                    )}
                  </button>
                  <p className={styles.autoResolutionHelp}>
                    The system will automatically attempt to resolve these conflicts by moving conflicting slots to available time periods.
                  </p>
                </div>
              </div>
              
              {conflicts.map((conflict, index) => (
                <div key={index} className={styles.conflictItem}>
                  <div 
                    className={styles.conflictHeader}
                    onClick={() => toggleConflict(conflict.id)}
                  >
                    <div className={styles.conflictType}>
                      <span className={styles.conflictIcon}>⚠️</span>
                      {conflict.conflict_type}
                    </div>
                    <div className={styles.conflictDetails}>
                      {conflict.teacher_name && <span>Teacher: {conflict.teacher_name}</span>}
                      {conflict.class_name && <span>Class: {conflict.class_name}</span>}
                      {conflict.day_of_week && <span>Day: {daysOfWeek.find(d => d.id === conflict.day_of_week)?.name}</span>}
                    </div>
                    <div className={styles.expandIcon}>
                      {expandedConflict === conflict.id ? '▲' : '▼'}
                    </div>
                  </div>
                  {expandedConflict === conflict.id && (
                    <div className={styles.conflictExpanded}>
                      <div className={styles.conflictDescription}>
                        <strong>Details:</strong>
                        <pre>{JSON.stringify(conflict.conflict_details, null, 2)}</pre>
                      </div>
                      <div className={styles.conflictActions}>
                        <button className={styles.resolveButton}>
                          Mark as Resolved
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleDashboard;