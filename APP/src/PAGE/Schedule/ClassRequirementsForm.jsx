import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './ScheduleDashboard.module.css';

const ClassRequirementsForm = ({ classSubjects, onNext, onPrevious }) => {
  const [periodAssignments, setPeriodAssignments] = useState([]);
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
      setPeriodAssignments(classSubjects.map(sc => {
        const config = configs.find(c => c.subject_class === sc);
        return { 
          subject_class: sc, 
          periods_per_week: config ? config.periods_per_week : 
            sc.match(/Math/i) ? 5 : sc.match(/English|eng/i) ? 3 : 4 
        };
      }));
    } catch (error) {
      console.error('Error fetching configs:', error);
      setPeriodAssignments(classSubjects.map(sc => ({
        subject_class: sc,
        periods_per_week: sc.match(/Math/i) ? 5 : sc.match(/English|eng/i) ? 3 : 4
      })));
      setError('Failed to load existing period assignments. Using defaults.');
    }
  };

  const handlePeriodChange = (subjectClass, periods) => {
    setPeriodAssignments(prev => prev.map(assign => 
      assign.subject_class === subjectClass ? { ...assign, periods_per_week: parseInt(periods) } : assign
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await axios.post('/api/schedule/set-class-subject-periods', { assignments: periodAssignments });
      setSuccess('Period assignments saved!');
      onNext();
    } catch (error) {
      console.error('Error saving period assignments:', error);
      setError('Failed to save period assignments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.configForm}>
      <h3>Assign Periods per Week</h3>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
      {classSubjects.map(subjectClass => (
        <div key={subjectClass} className={styles.formGroup}>
          <label>{subjectClass}:</label>
          <input
            type="number"
            value={periodAssignments.find(a => a.subject_class === subjectClass)?.periods_per_week || 4}
            onChange={e => handlePeriodChange(subjectClass, e.target.value)}
            min="1"
            max="20"
            required
          />
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

export default ClassRequirementsForm;