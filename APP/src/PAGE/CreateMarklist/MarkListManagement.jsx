// PAGE/CreateMarklist/MarkListManagement.jsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import './CreateMarklist/MarkListFrontend.css';

const MarkListForm = () => {
  const { t } = useApp();
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjectClassMappings, setSubjectClassMappings] = useState([]);
  const [config, setConfig] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [markComponents, setMarkComponents] = useState([
    { name: 'Test 1', percentage: 20 },
    { name: 'Test 2', percentage: 30 },
    { name: 'Quiz', percentage: 10 },
    { name: 'Final', percentage: 40 }
  ]);
  const [markList, setMarkList] = useState([]);
  const [formConfig, setFormConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState('create');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [subjectsRes, classesRes, mappingsRes, configRes] = await Promise.all([
        fetch('/api/mark-list/subjects'),
        fetch('/api/mark-list/classes'),
        fetch('/api/mark-list/subjects-classes'),
        fetch('/api/schedule/config')
      ]);

      const [subjectsData, classesData, mappingsData, configData] = await Promise.all([
        subjectsRes.json(),
        classesRes.json(),
        mappingsRes.json(),
        configRes.json()
      ]);

      setSubjects(subjectsData);
      setClasses(classesData);
      setSubjectClassMappings(mappingsData);
      setConfig({ term_count: configData.terms || 2 });
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setMessage('Error loading data: ' + error.message);
    }
  };

  const getAvailableClasses = () => {
    if (!selectedSubject) return [];
    return subjectClassMappings
      .filter(mapping => mapping.subject_name === selectedSubject)
      .map(mapping => mapping.class_name);
  };

  const handleComponentChange = (index, field, value) => {
    const newComponents = [...markComponents];
    newComponents[index][field] = field === 'percentage' ? parseInt(value) || 0 : value;
    setMarkComponents(newComponents);
  };

  const addComponent = () => {
    setMarkComponents([...markComponents, { name: '', percentage: 0 }]);
  };

  const removeComponent = (index) => {
    if (markComponents.length > 1) {
      const newComponents = markComponents.filter((_, i) => i !== index);
      setMarkComponents(newComponents);
    }
  };

  const getTotalPercentage = () => {
    return markComponents.reduce((sum, component) => sum + (component.percentage || 0), 0);
  };

  const handleCreateForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!selectedSubject || !selectedClass) {
      setMessage('Please select both subject and class');
      setLoading(false);
      return;
    }

    if (getTotalPercentage() !== 100) {
      setMessage('Mark components must total exactly 100%');
      setLoading(false);
      return;
    }

    if (markComponents.some(comp => !comp.name.trim())) {
      setMessage('Please fill in all component names');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/mark-list/create-mark-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectName: selectedSubject,
          className: selectedClass,
          termNumber: selectedTerm,
          markComponents: markComponents
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`Mark list form created successfully! ${result.studentsCount} students added.`);
        setViewMode('view');
        await loadMarkList();
      } else {
        setMessage(result.error || 'Failed to create mark form');
      }
    } catch (error) {
      setMessage('Error creating mark form: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMarkList = async () => {
    if (!selectedSubject || !selectedClass || !selectedTerm) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/mark-list/mark-list/${selectedSubject}/${selectedClass}/${selectedTerm}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setMarkList(data.markList);
        setFormConfig(data.config);
        setViewMode('view');
      } else {
        setMessage('Mark list not found for this combination');
        setMarkList([]);
        setFormConfig(null);
      }
    } catch (error) {
      setMessage('Error loading mark list: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId, componentKey, value) => {
    const newMarkList = markList.map(student => {
      if (student.id === studentId) {
        return {
          ...student,
          [componentKey]: parseFloat(value) || 0
        };
      }
      return student;
    });
    setMarkList(newMarkList);
  };

  const saveMarks = async (studentId) => {
    const student = markList.find(s => s.id === studentId);
    if (!student) return;

    setLoading(true);
    try {
      const marks = {};
      if (formConfig && formConfig.mark_components) {
        formConfig.mark_components.forEach(component => {
          const componentKey = component.name.toLowerCase().replace(/\s+/g, '_');
          marks[componentKey] = student[componentKey] || 0;
        });
      }

      const response = await fetch('/api/mark-list/update-marks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectName: selectedSubject,
          className: selectedClass,
          termNumber: selectedTerm,
          studentId: studentId,
          marks: marks
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        const updatedMarkList = markList.map(s => {
          if (s.id === studentId) {
            return {
              ...s,
              total: result.total,
              pass_status: result.passStatus
            };
          }
          return s;
        });
        setMarkList(updatedMarkList);
        setMessage(`Marks saved for ${student.student_name}`);
      } else {
        setMessage(result.error || 'Failed to save marks');
      }
    } catch (error) {
      setMessage('Error saving marks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mark-list-form">
      <div className="form-header">
        <h2>Mark List Management</h2>
        <div className="mode-toggle">
          <button 
            className={viewMode === 'create' ? 'active' : ''}
            onClick={() => setViewMode('create')}
          >
            Create Form
          </button>
          <button 
            className={viewMode === 'view' ? 'active' : ''}
            onClick={() => setViewMode('view')}
          >
            View/Edit Marks
          </button>
        </div>
      </div>

      <div className="form-controls">
        <div className="control-group">
          <label>Subject:</label>
          <select 
            value={selectedSubject} 
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedClass('');
            }}
          >
            <option value="">Select Subject</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.subject_name}>
                {subject.subject_name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Class:</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={!selectedSubject}
          >
            <option value="">Select Class</option>
            {getAvailableClasses().map(className => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Term:</label>
          <select 
            value={selectedTerm} 
            onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
          >
            {Array.from({ length: config?.term_count || 2 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Term {i + 1}
              </option>
            ))}
          </select>
        </div>

        {viewMode === 'view' && (
          <button 
            onClick={loadMarkList}
            disabled={!selectedSubject || !selectedClass}
            className="load-btn"
          >
            Load Mark List
          </button>
        )}
      </div>

      {viewMode === 'create' && (
        <div className="create-form">
          <h3>Mark Components Configuration</h3>
          <div className="components-list">
            {markComponents.map((component, index) => (
              <div key={index} className="component-row">
                <input
                  type="text"
                  placeholder="Component name (e.g., Test 1)"
                  value={component.name}
                  onChange={(e) => handleComponentChange(index, 'name', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Percentage"
                  value={component.percentage}
                  onChange={(e) => handleComponentChange(index, 'percentage', e.target.value)}
                  min="0"
                  max="100"
                />
                <span className="percentage-sign">%</span>
                {markComponents.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeComponent(index)}
                    className="remove-btn"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="component-actions">
            <button type="button" onClick={addComponent} className="add-btn">
              Add Component
            </button>
            <div className={`total-percentage ${getTotalPercentage() === 100 ? 'valid' : 'invalid'}`}>
              Total: {getTotalPercentage()}%
            </div>
          </div>

          <button 
            onClick={handleCreateForm}
            disabled={loading || !selectedSubject || !selectedClass || getTotalPercentage() !== 100}
            className="create-btn"
          >
            {loading ? 'Creating...' : 'Create Mark List Form'}
          </button>
        </div>
      )}

      {viewMode === 'view' && markList.length > 0 && (
        <div className="mark-list-view">
          <h3>
            {selectedSubject} - {selectedClass} - Term {selectedTerm}
          </h3>
          <div className="table-container">
            <table className="marks-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  {formConfig && formConfig.mark_components && formConfig.mark_components.map(component => (
                    <th key={component.name}>
                      {component.name} ({component.percentage}%)
                    </th>
                  ))}
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {markList.map(student => (
                  <tr key={student.id}>
                    <td className="student-name">{student.student_name}</td>
                    <td>{student.age}</td>
                    <td>{student.gender}</td>
                    {formConfig && formConfig.mark_components && formConfig.mark_components.map(component => {
                      const componentKey = component.name.toLowerCase().replace(/\s+/g, '_');
                      return (
                        <td key={component.name}>
                          <input
                            type="number"
                            value={student[componentKey] || 0}
                            onChange={(e) => handleMarkChange(student.id, componentKey, e.target.value)}
                            min="0"
                            max={component.percentage}
                            className="mark-input"
                          />
                        </td>
                      );
                    })}
                    <td className="total-cell">{student.total || 0}</td>
                    <td className={`status-cell ${student.pass_status?.toLowerCase()}`}>
                      {student.pass_status || 'Fail'}
                    </td>
                    <td>
                      <button 
                        onClick={() => saveMarks(student.id)}
                        className="save-btn"
                        disabled={loading}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('successfully') || message.includes('saved') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

const TeacherAssignment = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjectClassCombinations, setSubjectClassCombinations] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [existingAssignments, setExistingAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teachersResponse, combinationsResponse, assignmentsResponse] = await Promise.all([
        fetch('/api/mark-list/teachers'),
        fetch('/api/mark-list/subject-class-combinations'),
        fetch('/api/mark-list/teacher-assignments')
      ]);

      const [teachersData, combinationsData, assignmentsData] = await Promise.all([
        teachersResponse.json(),
        combinationsResponse.json(),
        assignmentsResponse.json()
      ]);

      setTeachers(teachersData);
      setSubjectClassCombinations(combinationsData);
      setExistingAssignments(assignmentsData);

      const assignmentState = {};
      assignmentsData.forEach(assignment => {
        const key = `${assignment.teacher_name}-${assignment.subject_class}`;
        assignmentState[key] = true;
      });
      setAssignments(assignmentState);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Error loading data: ' + error.message);
    }
  };

  const handleAssignmentChange = (teacherName, subjectClass, isChecked) => {
    const key = `${teacherName}-${subjectClass}`;
    setAssignments(prev => ({
      ...prev,
      [key]: isChecked
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const assignmentsArray = [];
      Object.entries(assignments).forEach(([key, isSelected]) => {
        if (isSelected) {
          const [teacherName, subjectClass] = key.split('-');
          assignmentsArray.push({ teacherName, subjectClass });
        }
      });

      const response = await fetch('/api/mark-list/assign-teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignments: assignmentsArray }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage('Teacher assignments saved successfully!');
        fetchData();
      } else {
        setMessage(result.error || 'Failed to save assignments');
      }
    } catch (error) {
      setMessage('Error saving assignments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentCountForTeacher = (teacherName) => {
    return subjectClassCombinations.filter(combination => 
      assignments[`${teacherName}-${combination.subject_class}`]
    ).length;
  };

  if (teachers.length === 0 || subjectClassCombinations.length === 0) {
    return (
      <div className="teacher-assignment">
        <div className="empty-state">
          <h2>No Data Available</h2>
          <p>
            {teachers.length === 0 && 'No teachers found. Please add teachers to staff first.'}
            {subjectClassCombinations.length === 0 && 'No subject-class combinations found. Please configure subjects and map them to classes first.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-assignment">
      <div className="assignment-header">
        <h2>Teacher-Subject Assignment</h2>
        <p>Assign teachers to subject-class combinations</p>
      </div>

      {existingAssignments.length > 0 && (
        <div className="existing-assignments">
          <h3>Current Assignments Summary</h3>
          <div className="summary-grid">
            {teachers.map(teacher => (
              <div key={teacher.name} className="teacher-summary">
                <strong>{teacher.name}:</strong>
                <span>{getAssignmentCountForTeacher(teacher.name)} assignments</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="assignment-form">
        <div className="assignment-table-container">
          <table className="assignment-table">
            <thead>
              <tr>
                <th className="teacher-header">Teachers / Subject Classes</th>
                {subjectClassCombinations.map(combination => (
                  <th key={`${combination.subject_name}-${combination.class_name}`} className="subject-header">
                    <div className="subject-class-header">
                      <div className="subject-name">{combination.subject_name}</div>
                      <div className="class-name">Class {combination.class_name}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map(teacher => (
                <tr key={teacher.name}>
                  <td className="teacher-name">
                    <div className="teacher-info">
                      <div className="name">{teacher.name}</div>
                      <div className="role">{teacher.role}</div>
                    </div>
                  </td>
                  {subjectClassCombinations.map(combination => (
                    <td key={`${combination.subject_name}-${combination.class_name}`} className="assignment-cell">
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={assignments[`${teacher.name}-${combination.subject_class}`] || false}
                          onChange={(e) => handleAssignmentChange(
                            teacher.name, 
                            combination.subject_class,
                            e.target.checked
                          )}
                        />
                        <span className="checkmark">✓</span>
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Saving Assignments...' : 'Save Teacher Assignments'}
        </button>
      </form>
    </div>
  );
};

const ClassRanking = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [termCount, setTermCount] = useState(2);
  const [ranking, setRanking] = useState(null);
  const [allTermsData, setAllTermsData] = useState(null); // All terms averages
  const [showAllTerms, setShowAllTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [classesRes, configRes] = await Promise.all([
        fetch('/api/mark-list/classes'),
        fetch('/api/schedule/config')
      ]);

      const [classesData, configData] = await Promise.all([
        classesRes.json(),
        configRes.json()
      ]);

      setClasses(classesData);
      setTermCount(configData.terms || 2);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setMessage('Error loading data: ' + error.message);
    }
  };

  const loadRanking = async () => {
    if (!selectedClass) {
      setMessage('Please select a class');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        `/api/mark-list/comprehensive-ranking/${selectedClass}/${selectedTerm}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setRanking(data);
        setMessage('');
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to load ranking');
        setRanking(null);
      }
    } catch (error) {
      setMessage('Error loading ranking: ' + error.message);
      setRanking(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTermsAverages = async () => {
    if (!selectedClass) {
      setMessage('Please select a class');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const termPromises = Array.from({ length: termCount }, (_, i) =>
        fetch(`/api/mark-list/comprehensive-ranking/${selectedClass}/${i + 1}`).then(r => r.ok ? r.json() : null)
      );
      const termsData = await Promise.all(termPromises);
      
      // Combine all terms data
      const studentsMap = {};
      termsData.forEach((termData, termIndex) => {
        if (!termData?.rankings) return;
        termData.rankings.forEach(student => {
          if (!studentsMap[student.studentName]) {
            studentsMap[student.studentName] = {
              studentName: student.studentName,
              termAverages: {},
              totalAverage: 0,
              termCount: 0
            };
          }
          studentsMap[student.studentName].termAverages[termIndex + 1] = student.average;
          studentsMap[student.studentName].totalAverage += student.average;
          studentsMap[student.studentName].termCount++;
        });
      });

      // Calculate final averages and sort
      const combinedRankings = Object.values(studentsMap).map(student => ({
        ...student,
        finalAverage: student.termCount > 0 ? student.totalAverage / student.termCount : 0
      })).sort((a, b) => b.finalAverage - a.finalAverage);

      // Add ranks
      combinedRankings.forEach((student, index) => {
        student.rank = index + 1;
      });

      setAllTermsData({
        className: selectedClass,
        termCount,
        rankings: combinedRankings
      });
      setShowAllTerms(true);
    } catch (error) {
      setMessage('Error loading all terms: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="class-ranking">
      <div className="ranking-header">
        <h2>Class Ranking System</h2>
        <p>View comprehensive class rankings by term or all terms combined</p>
      </div>

      <div className="ranking-controls">
        <div className="control-group">
          <label>Class:</label>
          <select 
            value={selectedClass} 
            onChange={(e) => { setSelectedClass(e.target.value); setShowAllTerms(false); }}
          >
            <option value="">Select Class</option>
            {classes.map(className => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Term:</label>
          <select 
            value={selectedTerm} 
            onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
            disabled={showAllTerms}
          >
            {Array.from({ length: termCount }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Term {i + 1}
              </option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => { setShowAllTerms(false); loadRanking(); }}
          disabled={loading || !selectedClass}
          className="load-btn"
        >
          {loading && !showAllTerms ? 'Loading...' : 'Load Single Term'}
        </button>

        <button 
          onClick={loadAllTermsAverages}
          disabled={loading || !selectedClass}
          className="load-btn all-terms-btn"
          style={{ background: '#667eea' }}
        >
          {loading && showAllTerms ? 'Loading...' : 'Load All Terms Averages'}
        </button>
      </div>

      {/* All Terms View */}
      {showAllTerms && allTermsData && (
        <div className="ranking-content">
          <div className="ranking-summary">
            <h3>{allTermsData.className} - All Terms Combined Summary</h3>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-value">{allTermsData.rankings.length}</span>
                <span className="stat-label">Total Students</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{allTermsData.termCount}</span>
                <span className="stat-label">Terms</span>
              </div>
            </div>
          </div>

          <div className="ranking-table-container">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th className="rank-header">Rank</th>
                  <th className="student-header">Student Name</th>
                  {Array.from({ length: termCount }, (_, i) => (
                    <th key={i + 1}>Term {i + 1} Avg</th>
                  ))}
                  <th style={{ background: '#667eea' }}>Total Average</th>
                </tr>
              </thead>
              <tbody>
                {allTermsData.rankings.map(student => (
                  <tr key={student.studentName} className="student-row">
                    <td className="rank-cell">
                      <div className="rank-badge">{student.rank}</div>
                    </td>
                    <td className="student-name-cell">{student.studentName}</td>
                    {Array.from({ length: termCount }, (_, i) => (
                      <td key={i + 1} className="average-cell">
                        {student.termAverages[i + 1]?.toFixed(1) || '-'}%
                      </td>
                    ))}
                    <td className="average-cell" style={{ fontWeight: 'bold', color: '#667eea' }}>
                      {student.finalAverage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Term View */}
      {!showAllTerms && ranking && (
        <div className="ranking-content">
          <div className="ranking-summary">
            <h3>
              {ranking.className} - Term {ranking.termNumber} Summary
            </h3>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-value">{ranking.summary.totalStudents}</span>
                <span className="stat-label">Total Students</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{ranking.summary.totalSubjects}</span>
                <span className="stat-label">Total Subjects</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{ranking.summary.averageClassScore.toFixed(1)}%</span>
                <span className="stat-label">Class Average</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{ranking.summary.passRate.toFixed(1)}%</span>
                <span className="stat-label">Pass Rate</span>
              </div>
            </div>
          </div>

          <div className="ranking-table-container">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th className="rank-header">Rank</th>
                  <th className="student-header">Student Name</th>
                  {ranking.subjects.map(subject => (
                    <th key={subject} className="subject-header">
                      {subject}
                    </th>
                  ))}
                  <th>Total</th>
                  <th>Average</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ranking.rankings.map(student => (
                  <tr key={student.studentName} className="student-row">
                    <td className="rank-cell">
                      <div className="rank-badge">
                        {student.rankDisplay}
                      </div>
                    </td>
                    <td className="student-name-cell">
                      {student.studentName}
                    </td>
                    {ranking.subjects.map(subject => (
                      <td key={subject} className="subject-score-cell">
                        {student.subjects[subject] ? (
                          <div className="score-container">
                            <span className="score-value">
                              {student.subjects[subject].total}
                            </span>
                            <span className="score-status">
                              {student.subjects[subject].status}
                            </span>
                          </div>
                        ) : (
                          <span className="no-data">-</span>
                        )}
                      </td>
                    ))}
                    <td className="total-score-cell">
                      {student.totalMarks}
                    </td>
                    <td className="average-cell">
                      {student.average.toFixed(1)}%
                    </td>
                    <td className="overall-status-cell">
                      {student.overallStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

const MarkListManagement = () => {
  const [activeTab, setActiveTab] = useState('forms');

  const tabs = [
    { id: 'forms', label: 'Mark List Forms', component: MarkListForm },
    { id: 'teachers', label: 'Teacher Assignment', component: TeacherAssignment },
    { id: 'ranking', label: 'Class Ranking', component: ClassRanking }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="mark-list-system">
      <div className="system-header">
        <h1>Mark List Management System</h1>
        <p>Manage mark lists, teacher assignments, and class rankings</p>
      </div>

      <div className="system-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="system-content">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default MarkListManagement;