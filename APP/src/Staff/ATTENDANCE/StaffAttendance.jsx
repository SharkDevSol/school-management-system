import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUserCheck, FiUsers, FiCalendar, FiSave, FiRefreshCw,
  FiCheck, FiX, FiClock, FiAlertCircle
} from 'react-icons/fi';
import styles from './StaffAttendance.module.css';

const StaffAttendance = () => {
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [assignedClass, setAssignedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [staffInfo, setStaffInfo] = useState(null);

  useEffect(() => {
    checkClassTeacherStatus();
  }, []);

  useEffect(() => {
    if (assignedClass) {
      fetchStudents();
      fetchExistingAttendance();
    }
  }, [assignedClass, selectedDate]);

  const checkClassTeacherStatus = async () => {
    setLoading(true);
    try {
      // Get staff info from localStorage
      const storedStaff = localStorage.getItem('staffUser');
      if (!storedStaff) {
        setIsClassTeacher(false);
        setLoading(false);
        return;
      }

      const staff = JSON.parse(storedStaff);
      setStaffInfo(staff);

      // Check if this staff is a class teacher
      const response = await axios.get(
        `https://school-management-system-daul.onrender.com/api/class-teacher/check/${staff.global_staff_id}`
      );

      setIsClassTeacher(response.data.isClassTeacher);
      setAssignedClass(response.data.assignedClass);
    } catch (error) {
      console.error('Error checking class teacher status:', error);
      setIsClassTeacher(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!assignedClass) return;
    
    try {
      const response = await axios.get(
        `https://school-management-system-daul.onrender.com/api/class-teacher/students/${assignedClass}`
      );
      setStudents(response.data);
      
      // Initialize attendance records for all students
      const initialRecords = {};
      response.data.forEach(student => {
        const key = `${student.school_id}-${student.class_id}`;
        if (!attendanceRecords[key]) {
          initialRecords[key] = {
            school_id: student.school_id,
            class_id: student.class_id,
            student_name: student.student_name,
            status: 'present',
            notes: ''
          };
        }
      });
      setAttendanceRecords(prev => ({ ...initialRecords, ...prev }));
    } catch (error) {
      console.error('Error fetching students:', error);
      setMessage({ type: 'error', text: 'Failed to load students' });
    }
  };

  const fetchExistingAttendance = async () => {
    if (!assignedClass) return;
    
    try {
      const response = await axios.get(
        `https://school-management-system-daul.onrender.com/api/class-teacher/attendance/${assignedClass}/${selectedDate}`
      );
      
      if (response.data.length > 0) {
        const existingRecords = {};
        response.data.forEach(record => {
          const key = `${record.school_id}-${record.class_id}`;
          existingRecords[key] = {
            school_id: record.school_id,
            class_id: record.class_id,
            student_name: record.student_name,
            status: record.status,
            notes: record.notes || ''
          };
        });
        setAttendanceRecords(existingRecords);
      }
    } catch (error) {
      console.error('Error fetching existing attendance:', error);
    }
  };

  const handleStatusChange = (studentKey, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentKey]: {
        ...prev[studentKey],
        status
      }
    }));
  };

  const handleNotesChange = (studentKey, notes) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentKey]: {
        ...prev[studentKey],
        notes
      }
    }));
  };

  const markAllAs = (status) => {
    const updatedRecords = {};
    students.forEach(student => {
      const key = `${student.school_id}-${student.class_id}`;
      updatedRecords[key] = {
        school_id: student.school_id,
        class_id: student.class_id,
        student_name: student.student_name,
        status,
        notes: attendanceRecords[key]?.notes || ''
      };
    });
    setAttendanceRecords(updatedRecords);
  };

  const saveAttendance = async () => {
    if (!staffInfo || !assignedClass) return;

    setSaving(true);
    try {
      const records = Object.values(attendanceRecords);
      
      await axios.post('https://school-management-system-daul.onrender.com/api/class-teacher/mark-attendance', {
        className: assignedClass,
        date: selectedDate,
        records,
        markedBy: staffInfo.name,
        globalStaffId: staffInfo.global_staff_id
      });

      setMessage({ type: 'success', text: 'Attendance saved successfully!' });
    } catch (error) {
      console.error('Error saving attendance:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to save attendance' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats
  const stats = {
    total: students.length,
    present: Object.values(attendanceRecords).filter(r => r.status === 'present').length,
    absent: Object.values(attendanceRecords).filter(r => r.status === 'absent').length,
    late: Object.values(attendanceRecords).filter(r => r.status === 'late').length
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isClassTeacher) {
    return (
      <div className={styles.notAssigned}>
        <FiAlertCircle size={64} />
        <h2>Not Assigned as Class Teacher</h2>
        <p>You are not currently assigned as a class teacher.</p>
        <p>Contact your administrator to be assigned to a class.</p>
      </div>
    );
  }

  return (
    <motion.div className={styles.container} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><FiUserCheck /></div>
          <div>
            <h1>Mark Attendance</h1>
            <p>Class: <strong>{assignedClass}</strong></p>
          </div>
        </div>
      </div>

      {message.text && (
        <motion.div 
          className={`${styles.message} ${styles[message.type]}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {message.type === 'success' ? <FiCheck /> : <FiX />}
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}><FiX /></button>
        </motion.div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.dateGroup}>
          <FiCalendar />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className={styles.quickActions}>
          <button onClick={() => markAllAs('present')} className={styles.presentBtn}>
            <FiCheck /> All Present
          </button>
          <button onClick={() => markAllAs('absent')} className={styles.absentBtn}>
            <FiX /> All Absent
          </button>
        </div>
        <button className={styles.refreshBtn} onClick={fetchStudents}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <FiUsers />
          <div>
            <span className={styles.statNum}>{stats.total}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statPresent}`}>
          <FiCheck />
          <div>
            <span className={styles.statNum}>{stats.present}</span>
            <span className={styles.statLabel}>Present</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statAbsent}`}>
          <FiX />
          <div>
            <span className={styles.statNum}>{stats.absent}</span>
            <span className={styles.statLabel}>Absent</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statLate}`}>
          <FiClock />
          <div>
            <span className={styles.statNum}>{stats.late}</span>
            <span className={styles.statLabel}>Late</span>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className={styles.studentList}>
        <AnimatePresence>
          {students.map((student, idx) => {
            const key = `${student.school_id}-${student.class_id}`;
            const record = attendanceRecords[key] || { status: 'present', notes: '' };
            
            return (
              <motion.div 
                key={key}
                className={styles.studentCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <div className={styles.studentInfo}>
                  <span className={styles.studentNum}>{idx + 1}</span>
                  <div className={styles.studentAvatar}>
                    {student.image_student ? (
                      <img src={`https://school-management-system-daul.onrender.com/Uploads/${student.image_student}`} alt="" />
                    ) : (
                      <FiUsers />
                    )}
                  </div>
                  <div className={styles.studentDetails}>
                    <span className={styles.studentName}>{student.student_name}</span>
                    <span className={styles.studentId}>ID: {student.school_id}-{student.class_id}</span>
                  </div>
                </div>
                
                <div className={styles.statusButtons}>
                  <button 
                    className={`${styles.statusBtn} ${styles.presentBtn} ${record.status === 'present' ? styles.active : ''}`}
                    onClick={() => handleStatusChange(key, 'present')}
                  >
                    <FiCheck /> P
                  </button>
                  <button 
                    className={`${styles.statusBtn} ${styles.absentBtn} ${record.status === 'absent' ? styles.active : ''}`}
                    onClick={() => handleStatusChange(key, 'absent')}
                  >
                    <FiX /> A
                  </button>
                  <button 
                    className={`${styles.statusBtn} ${styles.lateBtn} ${record.status === 'late' ? styles.active : ''}`}
                    onClick={() => handleStatusChange(key, 'late')}
                  >
                    <FiClock /> L
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Save Button */}
      <div className={styles.saveSection}>
        <button 
          className={styles.saveBtn} 
          onClick={saveAttendance}
          disabled={saving || students.length === 0}
        >
          {saving ? (
            <>
              <div className={styles.smallLoader}></div>
              Saving...
            </>
          ) : (
            <>
              <FiSave /> Save Attendance
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default StaffAttendance;
