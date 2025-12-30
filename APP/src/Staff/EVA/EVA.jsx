import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiFilter, FiCalendar, FiClock, FiSave, FiCheck, 
  FiEdit, FiTrash2, FiDownload, FiPlus, FiSearch,
  FiChevronLeft, FiChevronRight, FiPrinter, FiFileText
} from 'react-icons/fi';
import { FaChalkboardTeacher, FaUserGraduate } from 'react-icons/fa';
import styles from './EVA.module.css';

const EVA = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [grade, setGrade] = useState('');
  const [classSection, setClassSection] = useState('');
  const [subject, setSubject] = useState('');
  const [evaluationTitle, setEvaluationTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const evaluationsPerPage = 5;

  // Sample data
  const allEvaluations = [
    { 
      id: 1, 
      title: 'Midterm Practical Test', 
      grade: '9A', 
      subject: 'Science', 
      date: '2025-03-12',
      time: '10:00',
      status: 'done',
      students: [
        { id: 1, name: 'Ahmed Musa', criteria1: 8, criteria2: 9, criteria3: 7, remarks: 'Good' },
        { id: 2, name: 'Fatuma Ali', criteria1: 7, criteria2: 8, criteria3: 9, remarks: 'Very Good' },
        { id: 3, name: 'Hana Mohammed', criteria1: 9, criteria2: 10, criteria3: 9, remarks: 'Excellent' }
      ],
      criteria: ['Knowledge', 'Practical Skills', 'Presentation']
    },
    { 
      id: 2, 
      title: 'Class Participation', 
      grade: '10B', 
      subject: 'English', 
      date: '2025-04-02',
      time: '14:00',
      status: 'draft',
      students: [
        { id: 1, name: 'John Doe', criteria1: 6, criteria2: 7, criteria3: 8, remarks: 'Improving' },
        { id: 2, name: 'Jane Smith', criteria1: 9, criteria2: 9, criteria3: 9, remarks: 'Consistent' }
      ],
      criteria: ['Participation', 'Homework', 'Group Work']
    },
    { 
      id: 3, 
      title: 'Math Project', 
      grade: '8A', 
      subject: 'Math', 
      date: '2025-04-15',
      time: '09:30',
      status: 'done',
      students: [
        { id: 1, name: 'Ali Hassan', criteria1: 10, criteria2: 9, criteria3: 10, remarks: 'Outstanding' },
        { id: 2, name: 'Sara Ahmed', criteria1: 8, criteria2: 8, criteria3: 7, remarks: 'Good effort' }
      ],
      criteria: ['Accuracy', 'Creativity', 'Timeliness']
    }
  ];

  const [evaluations, setEvaluations] = useState(allEvaluations);
  const [editableStudents, setEditableStudents] = useState([]);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  useEffect(() => {
    filterEvaluations();
  }, [filterGrade, filterSubject, filterStatus, filterFromDate, filterToDate, searchQuery]);

  const filterEvaluations = () => {
    let filtered = [...allEvaluations];
    
    if (filterGrade) {
      filtered = filtered.filter(evalItem => evalItem.grade.includes(filterGrade));
    }
    
    if (filterSubject) {
      filtered = filtered.filter(evalItem => evalItem.subject.toLowerCase().includes(filterSubject.toLowerCase()));
    }
    
    if (filterStatus) {
      filtered = filtered.filter(evalItem => evalItem.status === filterStatus);
    }
    
    if (filterFromDate) {
      filtered = filtered.filter(evalItem => new Date(evalItem.date) >= new Date(filterFromDate));
    }
    
    if (filterToDate) {
      filtered = filtered.filter(evalItem => new Date(evalItem.date) <= new Date(filterToDate));
    }
    
    if (searchQuery) {
      filtered = filtered.filter(evalItem => 
        evalItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evalItem.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evalItem.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setEvaluations(filtered);
    setCurrentPage(1);
  };

  const handleScoreChange = (id, field, value) => {
    setEditableStudents(prev => prev.map(student => 
      student.id === id ? { ...student, [field]: value } : student
    ));
  };

  const calculateTotal = (student) => {
    return student.criteria1 + student.criteria2 + student.criteria3;
  };

  const handleViewEvaluation = (evalItem) => {
    setSelectedEvaluation(evalItem);
    setEditableStudents([...evalItem.students]);
  };

  const handleBackToList = () => {
    setSelectedEvaluation(null);
  };

  const handleSaveEvaluation = () => {
    const updatedEvaluations = evaluations.map(evalItem => 
      evalItem.id === selectedEvaluation.id 
        ? { ...evalItem, students: editableStudents, status: 'done' } 
        : evalItem
    );
    
    setEvaluations(updatedEvaluations);
    setSelectedEvaluation({ ...selectedEvaluation, students: editableStudents, status: 'done' });
    alert('Evaluation saved successfully!');
  };

  const handleSaveDraft = () => {
    const updatedEvaluations = evaluations.map(evalItem => 
      evalItem.id === selectedEvaluation.id 
        ? { ...evalItem, students: editableStudents } 
        : evalItem
    );
    
    setEvaluations(updatedEvaluations);
    setSelectedEvaluation({ ...selectedEvaluation, students: editableStudents });
    alert('Draft saved successfully!');
  };

  const handleExportPDF = () => {
    alert('Exporting to PDF...');
    // In a real app, this would generate a PDF
  };

  const handleExportExcel = () => {
    alert('Exporting to Excel...');
    // In a real app, this would generate an Excel file
  };

  // Pagination logic
  const indexOfLastEvaluation = currentPage * evaluationsPerPage;
  const indexOfFirstEvaluation = indexOfLastEvaluation - evaluationsPerPage;
  const currentEvaluations = evaluations.slice(indexOfFirstEvaluation, indexOfLastEvaluation);
  const totalPages = Math.ceil(evaluations.length / evaluationsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {selectedEvaluation ? (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button onClick={handleBackToList} className={styles.backButton}>
            <FiChevronLeft /> Back to Evaluations
          </button>
          
          <div className={styles.evaluationHeader}>
            <h2>{selectedEvaluation.title}</h2>
            <div className={styles.evaluationMeta}>
              <span>Grade & Subject: {selectedEvaluation.grade} – {selectedEvaluation.subject}</span>
              <span>Date & Time: {new Date(selectedEvaluation.date).toLocaleDateString()} – {selectedEvaluation.time}</span>
              <span className={`${styles.statusBadge} ${selectedEvaluation.status === 'done' ? styles.done : styles.draft}`}>
                {selectedEvaluation.status === 'done' ? 'Completed' : 'Draft'}
              </span>
            </div>
            
            <div className={styles.exportButtons}>
              <button onClick={handleExportPDF} className={styles.exportButton}>
                <FiFileText /> Export PDF
              </button>
              <button onClick={handleExportExcel} className={styles.exportButton}>
                <FiDownload /> Export Excel
              </button>
              <button onClick={() => window.print()} className={styles.exportButton}>
                <FiPrinter /> Print
              </button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.evaluationTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>{selectedEvaluation.criteria[0]} (/10)</th>
                  <th>{selectedEvaluation.criteria[1]} (/10)</th>
                  <th>{selectedEvaluation.criteria[2]} (/10)</th>
                  <th>Total (/30)</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {editableStudents.map((student, index) => (
                  <motion.tr 
                    key={student.id}
                    whileHover={{ backgroundColor: 'rgba(255, 152, 0, 0.1)' }}
                    onClick={() => console.log('Show student details:', student)}
                    className={styles.clickableRow}
                  >
                    <td>{index + 1}</td>
                    <td>{student.name}</td>
                    <td>
                      {selectedEvaluation.status === 'draft' ? (
                        <input 
                          type="number" 
                          min="0" 
                          max="10"
                          value={student.criteria1}
                          onChange={(e) => handleScoreChange(student.id, 'criteria1', parseInt(e.target.value) || 0)}
                        />
                      ) : (
                        student.criteria1
                      )}
                    </td>
                    <td>
                      {selectedEvaluation.status === 'draft' ? (
                        <input 
                          type="number" 
                          min="0" 
                          max="10"
                          value={student.criteria2}
                          onChange={(e) => handleScoreChange(student.id, 'criteria2', parseInt(e.target.value) || 0)}
                        />
                      ) : (
                        student.criteria2
                      )}
                    </td>
                    <td>
                      {selectedEvaluation.status === 'draft' ? (
                        <input 
                          type="number" 
                          min="0" 
                          max="10"
                          value={student.criteria3}
                          onChange={(e) => handleScoreChange(student.id, 'criteria3', parseInt(e.target.value) || 0)}
                        />
                      ) : (
                        student.criteria3
                      )}
                    </td>
                    <td>{calculateTotal(student)}/30</td>
                    <td>
                      {selectedEvaluation.status === 'draft' ? (
                        <input 
                          type="text" 
                          value={student.remarks}
                          onChange={(e) => handleScoreChange(student.id, 'remarks', e.target.value)}
                          placeholder="Add remarks"
                        />
                      ) : (
                        student.remarks
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedEvaluation.status === 'draft' && (
            <div className={styles.actionButtons}>
              <button onClick={handleSaveDraft} className={styles.saveDraftButton}>
                <FiSave /> Save as Draft
              </button>
              <button onClick={handleSaveEvaluation} className={styles.submitButton}>
                <FiCheck /> Submit Evaluation
              </button>
            </div>
          )}
        </motion.div>
      ) : (
        <>
          <div className={styles.header}>
            <div className={styles.title}>
              <FaChalkboardTeacher className={styles.titleIcon} />
              <h1>Evaluation Assessment</h1>
            </div>
            <div className={styles.tabs}>
              <button 
                className={`${styles.tabButton} ${activeTab === 'new' ? styles.active : ''}`}
                onClick={() => setActiveTab('new')}
              >
                New Evaluation
              </button>
              <button 
                className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
                onClick={() => setActiveTab('history')}
              >
                Evaluation History
              </button>
            </div>
          </div>

          {activeTab === 'new' ? (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className={styles.filterSection}>
                <h2><FiFilter className={styles.sectionIcon} /> Evaluation Setup</h2>
                <div className={styles.filterGrid}>
                  <div className={styles.filterGroup}>
                    <label>Grade</label>
                    <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                      <option value="">Select Grade</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12</option>
                    </select>
                  </div>
                  <div className={styles.filterGroup}>
                    <label>Class/Section</label>
                    <select value={classSection} onChange={(e) => setClassSection(e.target.value)}>
                      <option value="">Select Class</option>
                      <option value="9A">9A</option>
                      <option value="9B">9B</option>
                      <option value="10A">10A</option>
                      <option value="10B">10B</option>
                    </select>
                  </div>
                  <div className={styles.filterGroup}>
                    <label>Subject</label>
                    <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                      <option value="">Select Subject</option>
                      <option value="math">Math</option>
                      <option value="english">English</option>
                      <option value="science">Science</option>
                      <option value="history">History</option>
                    </select>
                  </div>
                  <div className={styles.filterGroup}>
                    <label>Title of Evaluation</label>
                    <input 
                      type="text" 
                      value={evaluationTitle}
                      onChange={(e) => setEvaluationTitle(e.target.value)}
                      placeholder="e.g. Midterm Practical Test"
                    />
                  </div>
                  <div className={styles.filterGroup}>
                    <label>Date</label>
                    <div className={styles.dateTimeInput}>
                      <FiCalendar className={styles.inputIcon} />
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.filterGroup}>
                    <label>Time</label>
                    <div className={styles.dateTimeInput}>
                      <FiClock className={styles.inputIcon} />
                      <input 
                        type="time" 
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.evaluationSection}>
                <h2><FaUserGraduate className={styles.sectionIcon} /> Student Evaluation</h2>
                <div className={styles.tableContainer}>
                  <table className={styles.evaluationTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Criteria 1 (/10)</th>
                        <th>Criteria 2 (/10)</th>
                        <th>Criteria 3 (/10)</th>
                        <th>Total (/30)</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableStudents.map((student, index) => (
                        <motion.tr 
                          key={student.id}
                          whileHover={{ backgroundColor: 'rgba(255, 152, 0, 0.1)' }}
                        >
                          <td>{index + 1}</td>
                          <td>{student.name}</td>
                          <td>
                            <input 
                              type="number" 
                              min="0" 
                              max="10"
                              value={student.criteria1}
                              onChange={(e) => handleScoreChange(student.id, 'criteria1', parseInt(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              min="0" 
                              max="10"
                              value={student.criteria2}
                              onChange={(e) => handleScoreChange(student.id, 'criteria2', parseInt(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              min="0" 
                              max="10"
                              value={student.criteria3}
                              onChange={(e) => handleScoreChange(student.id, 'criteria3', parseInt(e.target.value) || 0)}
                            />
                          </td>
                          <td>{calculateTotal(student)}/30</td>
                          <td>
                            <input 
                              type="text" 
                              value={student.remarks}
                              onChange={(e) => handleScoreChange(student.id, 'remarks', e.target.value)}
                              placeholder="Add remarks"
                            />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.actionButtons}>
                  <button className={styles.saveDraftButton}>
                    <FiSave /> Save as Draft
                  </button>
                  <button className={styles.submitButton}>
                    <FiCheck /> Submit Evaluation
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className={styles.historySection}>
                <div className={styles.searchFilterContainer}>
                  <div className={styles.searchBox}>
                    <FiSearch className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Search evaluations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className={styles.historyFilters}>
                    <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                      <option value="">All Grades</option>
                      <option value="8">Grade 8</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                    </select>
                    
                    <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                      <option value="">All Subjects</option>
                      <option value="math">Math</option>
                      <option value="english">English</option>
                      <option value="science">Science</option>
                    </select>
                    
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="">All Statuses</option>
                      <option value="done">Completed</option>
                      <option value="draft">Draft</option>
                    </select>
                    
                    <div className={styles.dateInputGroup}>
                      <FiCalendar className={styles.inputIcon} />
                      <input 
                        type="date" 
                        placeholder="From date"
                        value={filterFromDate}
                        onChange={(e) => setFilterFromDate(e.target.value)}
                      />
                    </div>
                    
                    <div className={styles.dateInputGroup}>
                      <FiCalendar className={styles.inputIcon} />
                      <input 
                        type="date" 
                        placeholder="To date"
                        value={filterToDate}
                        onChange={(e) => setFilterToDate(e.target.value)}
                      />
                    </div>
                    
                    <button onClick={filterEvaluations} className={styles.filterButton}>
                      <FiFilter /> Apply Filters
                    </button>
                  </div>
                </div>

                <div className={styles.historyTableContainer}>
                  <table className={styles.historyTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Evaluation Title</th>
                        <th>Grade</th>
                        <th>Subject</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentEvaluations.map((evalItem, index) => (
                        <motion.tr 
                          key={evalItem.id}
                          whileHover={{ backgroundColor: 'rgba(255, 152, 0, 0.1)' }}
                        >
                          <td>{indexOfFirstEvaluation + index + 1}</td>
                          <td>{evalItem.title}</td>
                          <td>{evalItem.grade}</td>
                          <td>{evalItem.subject}</td>
                          <td>{new Date(evalItem.date).toLocaleDateString()}</td>
                          <td>{evalItem.time}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${evalItem.status === 'done' ? styles.done : styles.draft}`}>
                              {evalItem.status === 'done' ? 'Completed' : 'Draft'}
                            </span>
                          </td>
                          <td>
                            <div className={styles.historyActions}>
                              <button 
                                onClick={() => handleViewEvaluation(evalItem)}
                                className={styles.viewButton}
                                title="View/Edit"
                              >
                                <FiEdit />
                              </button>
                              <button 
                                onClick={handleExportPDF}
                                className={styles.downloadButton}
                                title="Download PDF"
                              >
                                <FiFileText />
                              </button>
                              <button 
                                onClick={handleExportExcel}
                                className={styles.downloadButton}
                                title="Download Excel"
                              >
                                <FiDownload />
                              </button>
                              <button 
                                className={styles.deleteButton}
                                title="Delete"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {evaluations.length === 0 && (
                  <div className={styles.noResults}>
                    No evaluations found matching your criteria.
                  </div>
                )}

                {evaluations.length > 0 && (
                  <div className={styles.pagination}>
                    <button 
                      onClick={() => paginate(currentPage - 1)} 
                      disabled={currentPage === 1}
                      className={styles.paginationButton}
                    >
                      <FiChevronLeft />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`${styles.paginationButton} ${currentPage === number ? styles.activePage : ''}`}
                      >
                        {number}
                      </button>
                    ))}
                    
                    <button 
                      onClick={() => paginate(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                      className={styles.paginationButton}
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default EVA;