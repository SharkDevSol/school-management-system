// PAGE/CreateMarklist/SubjectMappingSetup.jsx
import React, { useState, useEffect } from 'react';
import styles from './CreateMarklist/CreateMarklist.module.css';

const SubjectConfiguration = ({ onSubjectsConfigured }) => {
  const [subjectCount, setSubjectCount] = useState(3);
  const [subjectNames, setSubjectNames] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [existingSubjects, setExistingSubjects] = useState([]);

  useEffect(() => {
    fetchExistingData();
  }, []);

  const fetchExistingData = async () => {
    try {
      const response = await fetch('/api/mark-list/subjects');
      const subjects = await response.json();
      setExistingSubjects(subjects);

      if (subjects.length > 0) {
        setSubjectCount(subjects.length);
        setSubjectNames(subjects.map(s => s.subject_name));
      }
    } catch (error) {
      console.error('Error fetching existing subjects:', error);
    }
  };

  const handleSubjectCountChange = (count) => {
    const newCount = parseInt(count) || 1;
    // Limit to reasonable range (1-50)
    const validCount = Math.max(1, Math.min(50, newCount));
    setSubjectCount(validCount);
    
    const newSubjectNames = [...subjectNames];
    if (validCount > subjectNames.length) {
      for (let i = subjectNames.length; i < validCount; i++) {
        newSubjectNames.push('');
      }
    } else {
      newSubjectNames.splice(validCount);
    }
    setSubjectNames(newSubjectNames);
  };

  const handleSubjectNameChange = (index, name) => {
    const newSubjectNames = [...subjectNames];
    newSubjectNames[index] = name;
    setSubjectNames(newSubjectNames);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (subjectNames.some(name => !name.trim())) {
      setMessage('Please fill in all subject names');
      setLoading(false);
      return;
    }

    try {
      // Get term count from schedule config
      const setupResponse = await fetch('/api/schedule/config');
      const setupData = await setupResponse.json();
      const termCount = setupData.terms || 2;

      const response = await fetch('/api/mark-list/configure-subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectCount,
          subjectNames: subjectNames.filter(name => name.trim()),
          termCount,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage('Subjects configured successfully!');
        fetchExistingData();
        if (onSubjectsConfigured) {
          onSubjectsConfigured();
        }
      } else {
        setMessage(result.error || 'Failed to configure subjects');
      }
    } catch (error) {
      setMessage('Error configuring subjects: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.content}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>📚</div>
        <h2>Subject Configuration</h2>
        <p>Set up the subjects for your school</p>
      </div>

      {existingSubjects.length > 0 && (
        <div className={styles.existingConfig}>
          <h3>Current Subjects</h3>
          <div className={styles.configSummary}>
            <div className={styles.configItem}>
              <strong>Subjects ({existingSubjects.length}):</strong>
              <span>{existingSubjects.map(s => s.subject_name).join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.configForm}>
        <div className={styles.inputGroup}>
          <label htmlFor="subjectCount">Number of Subjects:</label>
          <input
            type="number"
            id="subjectCount"
            value={subjectCount}
            onChange={(e) => handleSubjectCountChange(e.target.value)}
            className={styles.modernInput}
            min="1"
            max="50"
            placeholder="Enter number of subjects"
          />
          <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
            Enter any number (1-50)
          </small>
        </div>

        <div className={styles.inputGroup}>
          <label>Subject Names:</label>
          <div className={styles.subjectInputs}>
            {Array.from({ length: subjectCount }, (_, index) => (
              <div key={index} className={styles.inputWithIcon}>
                <span className={styles.subjectNumber}>{index + 1}</span>
                <input
                  type="text"
                  value={subjectNames[index] || ''}
                  onChange={(e) => handleSubjectNameChange(index, e.target.value)}
                  placeholder={`Enter subject ${index + 1} name`}
                  className={styles.modernInput}
                  required
                />
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className={`${styles.message} ${message.includes('successfully') ? styles.success : styles.error}`}>
            {message}
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button type="submit" disabled={loading} className={styles.primaryButton}>
            {loading ? 'Configuring...' : 'Save Subjects'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ClassSubjectMapping = ({ onMappingCompleted }) => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [existingMappings, setExistingMappings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [classesResponse, subjectsResponse, mappingsResponse] = await Promise.all([
        fetch('/api/mark-list/classes'),
        fetch('/api/mark-list/subjects'),
        fetch('/api/mark-list/subjects-classes')
      ]);

      const [classesData, subjectsData, mappingsData] = await Promise.all([
        classesResponse.json(),
        subjectsResponse.json(),
        mappingsResponse.json()
      ]);

      setClasses(classesData);
      setSubjects(subjectsData);
      setExistingMappings(mappingsData);

      // Initialize mapping state
      const mappingState = {};
      mappingsData.forEach(mapping => {
        const key = `${mapping.class_name}-${mapping.subject_name}`;
        mappingState[key] = true;
      });
      setMappings(mappingState);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Error loading data: ' + error.message);
    }
  };

  const handleMappingChange = (className, subjectName, isChecked) => {
    const key = `${className}-${subjectName}`;
    setMappings(prev => ({
      ...prev,
      [key]: isChecked
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const mappingsArray = [];
      Object.entries(mappings).forEach(([key, isSelected]) => {
        if (isSelected) {
          const [className, subjectName] = key.split('-');
          mappingsArray.push({ className, subjectName });
        }
      });

      // Save to subject_class_mappings
      const response = await fetch('/api/mark-list/map-subjects-classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mappings: mappingsArray }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage('Class-subject mappings saved successfully!');
        fetchData();
        if (onMappingCompleted) {
          onMappingCompleted();
        }
      } else {
        setMessage(result.error || 'Failed to save mappings');
      }
    } catch (error) {
      setMessage('Error saving mappings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (classes.length === 0 || subjects.length === 0) {
    return (
      <div className={styles.content}>
        <div className={styles.emptyState}>
          <h3>No Data Available</h3>
          <p>
            {classes.length === 0 && 'No classes found. Please create student classes first.'}
            {subjects.length === 0 && 'No subjects found. Please configure subjects first.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>🔄</div>
        <h2>Class-Subject Mapping</h2>
        <p>Select which subjects are taught in each class</p>
      </div>

      {existingMappings.length > 0 && (
        <div className={styles.existingConfig}>
          <h3>Current Mappings</h3>
          <div className={styles.mappingSummary}>
            {classes.map(className => {
              const classMappings = existingMappings.filter(m => m.class_name === className);
              return classMappings.length > 0 ? (
                <div key={className} className={styles.classMapping}>
                  <strong>{className}:</strong>
                  <span>{classMappings.map(m => m.subject_name).join(', ')}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles.tableContainer}>
          <div className={styles.tableScroll}>
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th className={styles.classHeader}>Classes / Subjects</th>
                  {subjects.map(subject => (
                    <th key={subject.id} className={styles.subjectHeader}>
                      {subject.subject_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classes.map(className => (
                  <tr key={className}>
                    <td className={styles.classCell}>{className}</td>
                    {subjects.map(subject => (
                      <td key={subject.id} className={styles.subjectCell}>
                        <label className={styles.radioContainer}>
                          <input
                            type="checkbox"
                            checked={mappings[`${className}-${subject.subject_name}`] || false}
                            onChange={(e) => handleMappingChange(
                              className, 
                              subject.subject_name, 
                              e.target.checked
                            )}
                          />
                          <span className={styles.radioCheckmark}></span>
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {message && (
          <div className={`${styles.message} ${message.includes('successfully') ? styles.success : styles.error}`}>
            {message}
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button type="submit" disabled={loading} className={styles.primaryButton}>
            {loading ? 'Saving...' : 'Save Mappings'}
          </button>
        </div>
      </form>
    </div>
  );
};

const SubjectMappingSetup = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [subjectsConfigured, setSubjectsConfigured] = useState(false);
  const [mappingCompleted, setMappingCompleted] = useState(false);

  const steps = [
    { number: 1, title: 'Subject Setup', completed: subjectsConfigured },
    { number: 2, title: 'Class Mapping', completed: mappingCompleted }
  ];

  const handleSubjectsConfigured = () => {
    setSubjectsConfigured(true);
    setCurrentStep(2);
  };

  const handleMappingCompleted = () => {
    setMappingCompleted(true);
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Subject & Class Setup</h1>
        <p>Configure subjects and map them to classes</p>
        
        <div className={styles.progressSteps}>
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <button
                className={`${styles.stepIndicator} ${
                  step.completed ? styles.completed : 
                  currentStep === step.number ? styles.active : ''
                }`}
                onClick={() => setCurrentStep(step.number)}
              >
                <span className={styles.stepIconInner}>
                  {step.completed ? '✓' : step.number}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div className={styles.stepConnector}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {currentStep === 1 && (
        <SubjectConfiguration onSubjectsConfigured={handleSubjectsConfigured} />
      )}

      {currentStep === 2 && (
        <ClassSubjectMapping onMappingCompleted={handleMappingCompleted} />
      )}
    </div>
  );
};

export default SubjectMappingSetup;