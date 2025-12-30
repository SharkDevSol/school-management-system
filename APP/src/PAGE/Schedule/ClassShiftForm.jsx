import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './ScheduleDashboard.module.css';

const ClassShiftForm = ({ classSubjects, totalShifts, onNext, onPrevious }) => {
  const [shiftAssignments, setShiftAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, [classSubjects]);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get('/api/schedule/class-subject-configs');
      const configs = response.data;
      setShiftAssignments(classSubjects.map(sc => {
        const config = configs.find(c => c.subject_class === sc);
        return { subject_class: sc, shift_id: config ? config.shift_id : 1 };
      }));
    } catch (error) {
      console.error('Error fetching configs:', error);
      setShiftAssignments(classSubjects.map(sc => ({ subject_class: sc, shift_id: 1 })));
      setError('Failed to load existing shift assignments. Using defaults.');
    }
  };

  const handleShiftChange = (subjectClass, shiftId) => {
    setShiftAssignments(prev => prev.map(assign => 
      assign.subject_class === subjectClass ? { ...assign, shift_id: parseInt(shiftId) } : assign
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await axios.post('/api/schedule/set-class-subject-shifts', { assignments: shiftAssignments });
      setSuccess('Shift assignments saved!');
      onNext();
    } catch (error) {
      console.error('Error saving shift assignments:', error);
      setError('Failed to save shift assignments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.configForm}>
      <h3>Assign Shifts to Class-Subjects</h3>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
      {classSubjects.map(subjectClass => (
        <div key={subjectClass} className={styles.formGroup}>
          <label>{subjectClass}:</label>
          <select
            value={shiftAssignments.find(a => a.subject_class === subjectClass)?.shift_id || 1}
            onChange={e => handleShiftChange(subjectClass, e.target.value)}
          >
            {Array.from({ length: totalShifts }, (_, i) => i + 1).map(shift => (
              <option key={shift} value={shift}>Shift {shift}</option>
            ))}
          </select>
        </div>
      ))}
      <div className={styles.navigation}>
        <button type="button" onClick={onPrevious} className={styles.secondaryButton}>
          Previous
        </button>
        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? 'Saving...' : 'Save and Next'}
        </button>
      </div>
    </form>
  );
};

export default ClassShiftForm;