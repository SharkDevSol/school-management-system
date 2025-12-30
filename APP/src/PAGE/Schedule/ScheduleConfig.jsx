import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ClassShiftForm from './ClassShiftForm';
import ClassRequirementsForm from './ClassRequirementsForm';
import styles from './ScheduleDashboard.module.css';

const ScheduleConfig = () => {
  const [step, setStep] = useState(1);
  const [basicConfig, setBasicConfig] = useState({
    periods_per_shift: 7,
    period_duration: 45,
    short_break_duration: 10,
    total_shifts: 2,
    teaching_days_per_week: 5,
    school_days: [1, 2, 3, 4, 5],
    shift1_morning_start: '07:00',
    shift1_morning_end: '12:30',
    shift1_afternoon_start: '12:30',
    shift1_afternoon_end: '17:30',
    shift2_morning_start: '07:00',
    shift2_morning_end: '12:30',
    shift2_afternoon_start: '12:30',
    shift2_afternoon_end: '17:30'
  });
  const [classSubjects, setClassSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const daysOfWeek = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' },
    { id: 7, name: 'Sunday' }
  ];

  useEffect(() => {
    fetchBasicConfig();
    fetchClassSubjects();
    fetchTeachers();
  }, []);

  const fetchBasicConfig = async () => {
    try {
      const response = await axios.get('/api/schedule/config');
      if (response.data) {
        setBasicConfig(response.data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      setError('Failed to load configuration. Using defaults.');
    }
  };

  const fetchClassSubjects = async () => {
    try {
      const response = await axios.get('/api/schedule/class-subjects');
      setClassSubjects(response.data);
    } catch (error) {
      console.error('Error fetching class-subjects:', error);
      setError('Failed to load class-subjects. Please try again.');
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get('/api/staff/teachers');
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
      setError('Failed to load teachers. You can manually enter teacher names.');
    }
  };

  const handleBasicChange = (e) => {
    const { name, value } = e.target;
    setBasicConfig(prev => ({ ...prev, [name]: parseInt(value) || value }));
  };

  const handleDayToggle = (dayId) => {
    setBasicConfig(prev => {
      const school_days = prev.school_days.includes(dayId)
        ? prev.school_days.filter(d => d !== dayId)
        : [...prev.school_days, dayId];
      return { ...prev, school_days, teaching_days_per_week: school_days.length };
    });
  };

  const handleBasicSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await axios.put('/api/schedule/config', basicConfig);
      setSuccess('Basic configuration saved!');
      setStep(2);
    } catch (error) {
      console.error('Error saving basic config:', error);
      setError('Failed to save basic configuration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    setStep(prev => Math.min(prev + 1, 4));
    setSuccess('');
    setError('');
  };

  const handlePreviousStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
    setSuccess('');
    setError('');
  };

  return (
    <div className={styles.configContainer}>
      <h2>Schedule Configuration</h2>
      <div className={styles.progressBar}>
        <div className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}>Basic Settings</div>
        <div className={`${styles.progressStep} ${step >= 2 ? styles.active : ''}`}>Shift Assignments</div>
        <div className={`${styles.progressStep} ${step >= 3 ? styles.active : ''}`}>Period Requirements</div>
        <div className={`${styles.progressStep} ${step >= 4 ? styles.active : ''}`}>Teacher Assignments</div>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
      {step === 1 && (
        <form onSubmit={handleBasicSubmit} className={styles.configForm}>
          <div className={styles.formGroup}>
            <label>Periods per Shift:</label>
            <input
              type="number"
              name="periods_per_shift"
              value={basicConfig.periods_per_shift}
              onChange={handleBasicChange}
              min="1"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Period Duration (minutes):</label>
            <input
              type="number"
              name="period_duration"
              value={basicConfig.period_duration}
              onChange={handleBasicChange}
              min="1"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Short Break Duration (minutes):</label>
            <input
              type="number"
              name="short_break_duration"
              value={basicConfig.short_break_duration}
              onChange={handleBasicChange}
              min="0"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Total Shifts:</label>
            <select name="total_shifts" value={basicConfig.total_shifts} onChange={handleBasicChange}>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>School Days:</label>
            <div className={styles.dayButtons}>
              {daysOfWeek.map(day => (
                <button
                  key={day.id}
                  type="button"
                  className={basicConfig.school_days.includes(day.id) ? styles.active : ''}
                  onClick={() => handleDayToggle(day.id)}
                >
                  {day.name}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Shift 1 Morning Start:</label>
            <input
              type="time"
              name="shift1_morning_start"
              value={basicConfig.shift1_morning_start}
              onChange={handleBasicChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Shift 1 Morning End:</label>
            <input
              type="time"
              name="shift1_morning_end"
              value={basicConfig.shift1_morning_end}
              onChange={handleBasicChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Shift 1 Afternoon Start:</label>
            <input
              type="time"
              name="shift1_afternoon_start"
              value={basicConfig.shift1_afternoon_start}
              onChange={handleBasicChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Shift 1 Afternoon End:</label>
            <input
              type="time"
              name="shift1_afternoon_end"
              value={basicConfig.shift1_afternoon_end}
              onChange={handleBasicChange}
              required
            />
          </div>
          {basicConfig.total_shifts >= 2 && (
            <>
              <div className={styles.formGroup}>
                <label>Shift 2 Morning Start:</label>
                <input
                  type="time"
                  name="shift2_morning_start"
                  value={basicConfig.shift2_morning_start}
                  onChange={handleBasicChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Shift 2 Morning End:</label>
                <input
                  type="time"
                  name="shift2_morning_end"
                  value={basicConfig.shift2_morning_end}
                  onChange={handleBasicChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Shift 2 Afternoon Start:</label>
                <input
                  type="time"
                  name="shift2_afternoon_start"
                  value={basicConfig.shift2_afternoon_start}
                  onChange={handleBasicChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Shift 2 Afternoon End:</label>
                <input
                  type="time"
                  name="shift2_afternoon_end"
                  value={basicConfig.shift2_afternoon_end}
                  onChange={handleBasicChange}
                  required
                />
              </div>
            </>
          )}
          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Saving...' : 'Save and Next'}
          </button>
        </form>
      )}
      {step === 2 && (
        <ClassShiftForm
          classSubjects={classSubjects}
          totalShifts={basicConfig.total_shifts}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
        />
      )}
      {step === 3 && (
        <ClassRequirementsForm
          classSubjects={classSubjects}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
        />
      )}
      {step === 4 && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError('');
          setSuccess('');
          try {
            const assignments = classSubjects.map(sc => ({
              subject_class: sc,
              teacher_name: document.getElementById(`teacher-${sc}`).value
            }));
            await axios.post('/api/schedule/set-class-subject-teachers', { assignments });
            setSuccess('Teacher assignments saved!');
            setStep(5);
          } catch (error) {
            console.error('Error saving teacher assignments:', error);
            setError('Failed to save teacher assignments: ' + error.message);
          } finally {
            setLoading(false);
          }
        }} className={styles.configForm}>
          <h3>Assign Teachers to Class-Subjects</h3>
          {classSubjects.map(subjectClass => (
            <div key={subjectClass} className={styles.formGroup}>
              <label>{subjectClass}:</label>
              {teachers.length > 0 ? (
                <select
                  id={`teacher-${subjectClass}`}
                  defaultValue=""
                  required
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.name} value={teacher.name}>
                      {teacher.name} ({teacher.staff_work_time || 'No work time specified'})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`teacher-${subjectClass}`}
                  type="text"
                  placeholder="Enter teacher name"
                  required
                />
              )}
            </div>
          ))}
          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Saving...' : 'Save and Finish'}
          </button>
          <div className={styles.navigation}>
            <button type="button" onClick={handlePreviousStep} className={styles.secondaryButton}>
              Previous
            </button>
          </div>
        </form>
      )}
      {step === 5 && (
        <div>
          <h3>Configuration Complete</h3>
          <p>All configurations have been saved. You can now generate the schedule in the Dashboard.</p>
          <Link to="/schedule" className={styles.submitButton}>
            Go to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
};

export default ScheduleConfig;