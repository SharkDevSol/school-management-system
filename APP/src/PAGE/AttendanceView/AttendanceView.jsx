import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  FiEye, FiCalendar, FiSearch, 
  FiUserCheck, FiUsers, FiRefreshCw, FiChevronLeft,
  FiCheck, FiX, FiClock, FiShield, FiArrowUp, FiArrowDown,
  FiSettings
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import styles from "./AttendanceView.module.css";

// Attendance mark calculation - P=100%, L=50%, E=75%, A=0%
const calculateAttendanceMark = (student, schoolDays) => {
  const weights = { 'P': 100, 'L': 50, 'E': 75, 'A': 0 };
  
  let totalWeight = 0;
  let recordCount = 0;
  
  schoolDays.forEach(day => {
    if (student[day] && weights.hasOwnProperty(student[day])) {
      totalWeight += weights[student[day]];
      recordCount++;
    }
  });
  
  return recordCount > 0 ? Math.round(totalWeight / recordCount) : null;
};

// Get color class based on attendance percentage
const getMarkColorClass = (percentage) => {
  if (percentage === null) return 'markNA';
  if (percentage >= 90) return 'markGreen';
  if (percentage >= 75) return 'markYellow';
  return 'markRed';
};

// Sort students by attendance mark
const sortByMark = (students, order = 'desc') => {
  return [...students].sort((a, b) => {
    const markA = a.mark ?? -1;
    const markB = b.mark ?? -1;
    return order === 'asc' ? markA - markB : markB - markA;
  });
};

const AttendanceView = () => {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [weeklyTables, setWeeklyTables] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [schoolDays, setSchoolDays] = useState(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [classTeachers, setClassTeachers] = useState([]);

  const dayLabels = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

  useEffect(() => { 
    fetchClasses(); 
    fetchSchoolDays();
    fetchClassTeachers();
  }, []);
  
  useEffect(() => { 
    if (selectedClass) fetchWeeklyTables(); 
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await axios.get('https://school-management-system-daul.onrender.com/api/class-teacher/classes');
      setClasses(response.data);
      if (response.data.length > 0) {
        setSelectedClass(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSchoolDays = async () => {
    try {
      const response = await axios.get('https://school-management-system-daul.onrender.com/api/class-teacher/school-days');
      if (response.data.schoolDays) {
        setSchoolDays(response.data.schoolDays);
      }
    } catch (error) {
      console.error('Error fetching school days:', error);
    }
  };

  const fetchClassTeachers = async () => {
    try {
      const response = await axios.get('https://school-management-system-daul.onrender.com/api/class-teacher/assignments');
      setClassTeachers(response.data);
    } catch (error) {
      console.error('Error fetching class teachers:', error);
    }
  };

  const fetchWeeklyTables = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/class-teacher/weekly-tables/${selectedClass}`);
      setWeeklyTables(response.data);
      
      // Auto-select latest week
      if (response.data.length > 0) {
        const latestWeek = response.data[0].replace('week_', '').replace(/_/g, '-');
        setSelectedWeek(latestWeek);
        fetchWeeklyAttendance(latestWeek);
      } else {
        setAttendanceData([]);
      }
    } catch (error) {
      console.error('Error fetching weekly tables:', error);
      setWeeklyTables([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyAttendance = async (weekStart) => {
    if (!selectedClass || !weekStart) return;
    setLoading(true);
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/class-teacher/weekly-attendance/${selectedClass}/${weekStart}`);
      if (response.data.exists) {
        setAttendanceData(response.data.data);
      } else {
        setAttendanceData([]);
      }
    } catch (error) {
      console.error('Error fetching weekly attendance:', error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWeek) {
      fetchWeeklyAttendance(selectedWeek);
    }
  }, [selectedWeek]);

  const getClassTeacher = (className) => {
    const assignment = classTeachers.find(ct => ct.assigned_class === className);
    return assignment ? assignment.teacher_name : 'Not Assigned';
  };

  const calculateTableStats = (data) => {
    let present = 0, absent = 0, late = 0, permission = 0, total = 0;
    
    data.forEach(student => {
      schoolDays.forEach(day => {
        if (student[day]) {
          total++;
          if (student[day] === 'P') present++;
          else if (student[day] === 'A') absent++;
          else if (student[day] === 'L') late++;
          else if (student[day] === 'E') permission++;
        }
      });
    });
    
    return { 
      studentCount: data.length,
      total, present, absent, late, permission,
      presentPercent: total > 0 ? Math.round((present / total) * 100) : 0,
      absentPercent: total > 0 ? Math.round((absent / total) * 100) : 0
    };
  };

  const getStatusIcon = (value) => {
    if (value === 'P') return <FiCheck className={styles.iconPresent} />;
    if (value === 'A') return <FiX className={styles.iconAbsent} />;
    if (value === 'L') return <FiClock className={styles.iconLate} />;
    if (value === 'E') return <FiShield className={styles.iconPermission} />;
    return <span className={styles.iconEmpty}>-</span>;
  };

  // Add marks to attendance data and filter
  const dataWithMarks = attendanceData.map(student => ({
    ...student,
    mark: calculateAttendanceMark(student, schoolDays)
  }));

  const filteredData = dataWithMarks.filter(student =>
    student.student_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort filtered data by mark
  const sortedData = sortByMark(filteredData, sortOrder);

  // Calculate overall stats for current view
  const overallStats = calculateTableStats(attendanceData);

  // Toggle sort order
  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  return (
    <motion.div className={styles.container} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><FiUserCheck /></div>
          <div>
            <h1>{t('attendanceView') || 'Attendance View'}</h1>
            <p>{t('attendanceViewDesc') || 'View and analyze attendance records'}</p>
          </div>
        </div>
        <Link to="/class-teacher-assignment" className={styles.assignBtn}>
          <FiSettings /> Assign Teachers
        </Link>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.selectGroup}>
          <label>Class:</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            {classes.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
        {weeklyTables.length > 0 && (
          <div className={styles.selectGroup}>
            <label>Week:</label>
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
              {weeklyTables.map(table => {
                const weekDate = table.replace('week_', '').replace(/_/g, '-');
                return <option key={table} value={weekDate}>{weekDate}</option>;
              })}
            </select>
          </div>
        )}
        <button className={styles.refreshBtn} onClick={fetchWeeklyTables}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Class Teacher Info */}
      <div className={styles.teacherInfo}>
        <span>Class Teacher: <strong>{getClassTeacher(selectedClass)}</strong></span>
      </div>

      {/* Overview/Stats */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loader}></div>
          <p>Loading attendance data...</p>
        </div>
      ) : weeklyTables.length === 0 ? (
        <div className={styles.emptyState}>
          <FiCalendar size={64} />
          <h3>No attendance records</h3>
          <p>No weekly attendance data found for {selectedClass}</p>
          <p className={styles.emptyHint}>Class teacher needs to create weekly attendance first</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className={styles.summaryRow}>
            <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
              <FiUsers />
              <div>
                <span className={styles.summaryNum}>{overallStats.studentCount}</span>
                <span className={styles.summaryLabel}>Students</span>
              </div>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryPresent}`}>
              <FiCheck />
              <div>
                <span className={styles.summaryNum}>{overallStats.present}</span>
                <span className={styles.summaryLabel}>Present</span>
              </div>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryAbsent}`}>
              <FiX />
              <div>
                <span className={styles.summaryNum}>{overallStats.absent}</span>
                <span className={styles.summaryLabel}>Absent</span>
              </div>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryLate}`}>
              <FiClock />
              <div>
                <span className={styles.summaryNum}>{overallStats.late}</span>
                <span className={styles.summaryLabel}>Late</span>
              </div>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryPermission}`}>
              <FiShield />
              <div>
                <span className={styles.summaryNum}>{overallStats.permission}</span>
                <span className={styles.summaryLabel}>Permission</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className={styles.searchBox}>
            <FiSearch />
            <input 
              type="text" 
              placeholder="Search student..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Attendance Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.attendanceTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  {schoolDays.map(day => (
                    <th key={day}>{dayLabels[day]}</th>
                  ))}
                  <th className={styles.markHeader} onClick={toggleSort}>
                    Mark {sortOrder === 'desc' ? <FiArrowDown /> : <FiArrowUp />}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((student, idx) => (
                  <tr key={`${student.school_id}-${student.class_id}`}>
                    <td>{idx + 1}</td>
                    <td className={styles.studentName}>{student.student_name}</td>
                    {schoolDays.map(day => (
                      <td key={day}>{getStatusIcon(student[day])}</td>
                    ))}
                    <td>
                      <span className={`${styles.markBadge} ${styles[getMarkColorClass(student.mark)]}`}>
                        {student.mark !== null ? `${student.mark}%` : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            <span><FiCheck className={styles.iconPresent} /> Present (P)</span>
            <span><FiX className={styles.iconAbsent} /> Absent (A)</span>
            <span><FiClock className={styles.iconLate} /> Late (L)</span>
            <span><FiShield className={styles.iconPermission} /> Permission (E)</span>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default AttendanceView;
