import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  FiPlus, FiCalendar, FiUsers, FiCheck, FiX, FiClock, 
  FiShield, FiSave, FiRefreshCw, FiAlertCircle, FiCheckCircle
} from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import styles from "./CreateAttendance.module.css";

const CreateAttendance = () => {
  const { t } = useApp();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [weeklyTables, setWeeklyTables] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [schoolDays, setSchoolDays] = useState(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [mode, setMode] = useState('create');

  const dayLabels = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
  const statusOptions = [
    { value: '', label: '-' },
    { value: 'P', label: 'Present' },
    { value: 'A', label: 'Absent' },
    { value: 'L', label: 'Late' },
    { value: 'E', label: 'Permission' }
  ];

  useEffect(() => {
    fetchClasses();
    fetchSchoolDays();
    setDefaultWeekStart();
  }, []);

  useEffect(() => { if (selectedClass) fetchWeeklyTables(); }, [selectedClass]);

  const setDefaultWeekStart = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    setWeekStart(monday.toISOString().split('T')[0]);
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get('https://excellence.oddag.et/api/class-teacher/classes');
      setClasses(response.data);
      if (response.data.length > 0) setSelectedClass(response.data[0]);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch classes' });
    }
  };

  const fetchSchoolDays = async () => {
    try {
      const response = await axios.get('https://excellence.oddag.et/api/class-teacher/school-days');
      if (response.data.schoolDays) setSchoolDays(response.data.schoolDays);
    } catch (error) { console.error('Error fetching school days:', error); }
  };

  const fetchWeeklyTables = async () => {
    try {
      const response = await axios.get(`https://excellence.oddag.et/api/class-teacher/weekly-tables/${selectedClass}`);
      setWeeklyTables(response.data);
    } catch (error) { setWeeklyTables([]); }
  };


  const createWeeklyAttendance = async () => {
    if (!selectedClass || !weekStart) {
      setMessage({ type: 'error', text: 'Please select a class and week start date' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await axios.post('https://excellence.oddag.et/api/admin-attendance/create-weekly', {
        className: selectedClass,
        weekStart: weekStart
      });
      setMessage({ type: 'success', text: response.data.message });
      fetchWeeklyTables();
      setSelectedWeek(weekStart);
      setMode('edit');
      fetchWeeklyAttendance(weekStart);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create attendance' });
    } finally { setLoading(false); }
  };

  const fetchWeeklyAttendance = async (week) => {
    if (!selectedClass || !week) return;
    setLoading(true);
    try {
      const response = await axios.get(`https://excellence.oddag.et/api/class-teacher/weekly-attendance/${selectedClass}/${week}`);
      if (response.data.exists) setAttendanceData(response.data.data);
      else setAttendanceData([]);
    } catch (error) { setAttendanceData([]); }
    finally { setLoading(false); }
  };

  const loadExistingWeek = (week) => {
    setSelectedWeek(week);
    setMode('edit');
    fetchWeeklyAttendance(week);
  };

  const handleAttendanceChange = (studentIndex, day, value) => {
    const updated = [...attendanceData];
    updated[studentIndex] = { ...updated[studentIndex], [day]: value };
    setAttendanceData(updated);
  };

  const markAllForDay = (day, value) => {
    setAttendanceData(attendanceData.map(student => ({ ...student, [day]: value })));
  };

  const saveAttendance = async () => {
    if (!selectedClass || !selectedWeek || attendanceData.length === 0) {
      setMessage({ type: 'error', text: 'No attendance data to save' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await axios.put(
        `https://excellence.oddag.et/api/admin-attendance/update-weekly/${selectedClass}/${selectedWeek}`,
        { records: attendanceData }
      );
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save attendance' });
    } finally { setSaving(false); }
  };

  return (
    <motion.div className={styles.container} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><FiPlus /></div>
          <div>
            <h1>{t('createAttendance') || 'Create Attendance'}</h1>
            <p>{t('createAttendanceDesc') || 'Create and manage attendance for any class'}</p>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
          {message.text}
        </div>
      )}

      <div className={styles.modeTabs}>
        <button className={`${styles.modeTab} ${mode === 'create' ? styles.active : ''}`} onClick={() => setMode('create')}>
          <FiPlus /> {t('createNewWeek')}
        </button>
        <button className={`${styles.modeTab} ${mode === 'edit' ? styles.active : ''}`} onClick={() => setMode('edit')}>
          <FiCalendar /> {t('editExisting')}
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.selectGroup}>
          <label>{t('classLabel')}</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            {classes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>
        </div>

        {mode === 'create' ? (
          <>
            <div className={styles.selectGroup}>
              <label>{t('weekStartMonday')}</label>
              <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={styles.dateInput} />
            </div>
            <button className={styles.createBtn} onClick={createWeeklyAttendance} disabled={loading}>
              {loading ? <FiRefreshCw className={styles.spinning} /> : <FiPlus />} {t('createAttendanceBtn')}
            </button>
          </>
        ) : (
          <>
            <div className={styles.selectGroup}>
              <label>{t('selectWeekLabel')}</label>
              <select value={selectedWeek} onChange={(e) => loadExistingWeek(e.target.value)}>
                <option value="">{t('selectWeekOption')}</option>
                {weeklyTables.map(table => {
                  const weekDate = table.replace('week_', '').replace(/_/g, '-');
                  return <option key={table} value={weekDate}>{weekDate}</option>;
                })}
              </select>
            </div>
            {attendanceData.length > 0 && (
              <button className={styles.saveBtn} onClick={saveAttendance} disabled={saving}>
                {saving ? <FiRefreshCw className={styles.spinning} /> : <FiSave />} {t('saveAttendanceBtn')}
              </button>
            )}
          </>
        )}
      </div>


      {mode === 'create' && weeklyTables.length > 0 && (
        <div className={styles.existingWeeks}>
          <h3><FiCalendar /> {t('existingAttendanceWeeks')} {selectedClass}</h3>
          <div className={styles.weeksList}>
            {weeklyTables.map(table => {
              const weekDate = table.replace('week_', '').replace(/_/g, '-');
              return (
                <div key={table} className={styles.weekItem} onClick={() => loadExistingWeek(weekDate)}>
                  <FiCalendar /> {weekDate}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'edit' && selectedWeek && (
        <>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loader}></div>
              <p>{t('loadingAttendanceData')}</p>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className={styles.emptyState}>
              <FiUsers size={64} />
              <h3>{t('noAttendanceData')}</h3>
              <p>{t('selectWeekToEdit')}</p>
            </div>
          ) : (
            <>
              <div className={styles.tableInfo}>
                <FiUsers /> {attendanceData.length} students | Week: {selectedWeek}
              </div>

              <div className={styles.quickActions}>
                <span>{t('quickMarkAll')}</span>
                {schoolDays.map(day => (
                  <div key={day} className={styles.quickDayGroup}>
                    <span className={styles.dayLabel}>{dayLabels[day]}</span>
                    <button onClick={() => markAllForDay(day, 'P')} className={styles.quickP}>P</button>
                    <button onClick={() => markAllForDay(day, 'A')} className={styles.quickA}>A</button>
                  </div>
                ))}
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.attendanceTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('studentName')}</th>
                      {schoolDays.map(day => <th key={day}>{dayLabels[day]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map((student, idx) => (
                      <tr key={`${student.school_id}-${student.class_id}`}>
                        <td>{idx + 1}</td>
                        <td className={styles.studentName}>{student.student_name}</td>
                        {schoolDays.map(day => (
                          <td key={day}>
                            <select
                              value={student[day] || ''}
                              onChange={(e) => handleAttendanceChange(idx, day, e.target.value)}
                              className={`${styles.statusSelect} ${styles[`status${student[day]}`]}`}
                            >
                              {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.value || '-'}</option>)}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.legend}>
                <span><FiCheck className={styles.iconPresent} /> {t('presentP')}</span>
                <span><FiX className={styles.iconAbsent} /> {t('absentA')}</span>
                <span><FiClock className={styles.iconLate} /> {t('lateL')}</span>
                <span><FiShield className={styles.iconPermission} /> {t('permissionE')}</span>
              </div>
            </>
          )}
        </>
      )}
    </motion.div>
  );
};

export default CreateAttendance;
