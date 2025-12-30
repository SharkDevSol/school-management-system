// PAGE/Schedule/ScheduleTimetable.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './ScheduleTimetable.module.css';

const ScheduleTimetable = () => {
  const [activeWeek, setActiveWeek] = useState('A');
  const [activeShift, setActiveShift] = useState(1);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);

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
    fetchScheduleData();
    fetchConfig();
  }, [activeWeek, activeShift]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`/api/schedule/week/${activeWeek}`);
      console.log('Raw schedule data:', response.data);
      setSchedule(response.data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError('Failed to load schedule data. Please generate a schedule first in Task 7.');
    } finally {
      setLoading(false);
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

  // Get unique classes and periods
  const classes = [...new Set(schedule.map(slot => slot.class_name))].filter(Boolean).sort();
  const periods = Array.from({ length: config?.periods_per_shift || 7 }, (_, i) => i + 1);

  // Filter schedule for current shift
  const filteredSchedule = schedule.filter(slot => slot.shift_id === activeShift);

  console.log('Filtered schedule:', filteredSchedule);
  console.log('Classes:', classes);
  console.log('Periods:', periods);

  // Get subject for a specific class, day, and period
  const getSubjectForSlot = (className, dayId, periodNumber) => {
    const slot = filteredSchedule.find(s => 
      s.class_name === className && 
      s.day_of_week === dayId && 
      s.period_number === periodNumber
    );
    return slot ? {
      subject: slot.subject_name,
      teacher: slot.teacher_name,
      code: slot.subject_code
    } : null;
  };

  const refreshSchedule = () => {
    fetchScheduleData();
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading timetable data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <div className={styles.errorIcon}>⚠️</div>
        <div className={styles.errorText}>{error}</div>
        <button onClick={refreshSchedule} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  if (schedule.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📅</div>
        <h3>No Timetable Data Available</h3>
        <p>Please generate a schedule in Task 7 first.</p>
      </div>
    );
  }

  return (
    <div className={styles.timetableContainer}>
      {/* Header Controls */}
      <div className={styles.headerControls}>
        <div className={styles.weekSelector}>
          <label>Week:</label>
          <div className={styles.weekButtons}>
            <button
              className={activeWeek === 'A' ? styles.active : ''}
              onClick={() => setActiveWeek('A')}
            >
              Week A
            </button>
            <button
              className={activeWeek === 'B' ? styles.active : ''}
              onClick={() => setActiveWeek('B')}
            >
              Week B
            </button>
          </div>
        </div>

        <div className={styles.shiftSelector}>
          <label>Shift:</label>
          <div className={styles.shiftButtons}>
            <button
              className={activeShift === 1 ? styles.active : ''}
              onClick={() => setActiveShift(1)}
            >
              Shift 1 (Morning)
            </button>
            <button
              className={activeShift === 2 ? styles.active : ''}
              onClick={() => setActiveShift(2)}
            >
              Shift 2 (Afternoon)
            </button>
          </div>
        </div>

        <button onClick={refreshSchedule} className={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>

      {/* Timetable for each day */}
      {daysOfWeek.map(day => {
        // Only show days that have schedule data or are school days
        const daySchedule = filteredSchedule.filter(slot => slot.day_of_week === day.id);
        
        if (daySchedule.length === 0) return null;

        return (
          <div key={day.id} className={styles.dayTimetable}>
            <h2 className={styles.dayHeader}>{day.name}</h2>
            
            <div className={styles.tableContainer}>
              <table className={styles.timetableTable}>
                <thead>
                  <tr>
                    <th className={styles.classHeader}>Classes</th>
                    {periods.map(period => (
                      <th key={period} className={styles.periodHeader}>
                        Period {period}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classes.map(className => (
                    <tr key={className} className={styles.classRow}>
                      <td className={styles.classNameCell}>Class {className}</td>
                      {periods.map(period => {
                        const slotData = getSubjectForSlot(className, day.id, period);
                        return (
                          <td key={period} className={styles.subjectCell}>
                            {slotData ? (
                              <div className={styles.subjectInfo}>
                                <div className={styles.subjectName}>
                                  {slotData.subject}
                                </div>
                                <div className={styles.teacherName}>
                                  {slotData.teacher}
                                </div>
                                {slotData.code && (
                                  <div className={styles.subjectCode}>
                                    {slotData.code}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={styles.emptySlot}>-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filteredSchedule.length === 0 && (
        <div className={styles.noData}>
          <div className={styles.noDataIcon}>🔍</div>
          <h3>No Schedule Data for Current Selection</h3>
          <p>No schedule found for Shift {activeShift} in Week {activeWeek}.</p>
          <p>Try changing the shift or generate a new schedule.</p>
        </div>
      )}

      {/* Summary */}
      <div className={styles.summary}>
        <h3>📊 Timetable Summary - Week {activeWeek}, Shift {activeShift}</h3>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNumber}>{classes.length}</span>
            <span className={styles.summaryLabel}>Classes</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNumber}>{periods.length}</span>
            <span className={styles.summaryLabel}>Periods per Day</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNumber}>
              {new Set(filteredSchedule.map(s => s.teacher_name)).size}
            </span>
            <span className={styles.summaryLabel}>Teachers</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNumber}>
              {new Set(filteredSchedule.map(s => s.subject_name)).size}
            </span>
            <span className={styles.summaryLabel}>Subjects</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTimetable;