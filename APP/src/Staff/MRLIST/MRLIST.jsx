import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiSave, FiShare2, FiDownload, FiSearch } from 'react-icons/fi';
import { FaCheckCircle, FaRegClock } from 'react-icons/fa';
import styles from './MRLIST.module.css';

const MRLIST = () => {
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [term, setTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([
    { id: 1, name: 'Ahmed Musa', studentId: '1001', score: 85, status: 'saved' },
    { id: 2, name: 'Fatuma Ali', studentId: '1002', score: 78, status: 'saved' },
    { id: 3, name: 'Hana Mohammed', studentId: '1003', score: '', status: 'pending' },
    { id: 4, name: 'John Doe', studentId: '1004', score: 92, status: 'saved' },
    { id: 5, name: 'Jane Smith', studentId: '1005', score: '', status: 'pending' },
  ]);

  const handleScoreChange = (id, value) => {
    const updatedStudents = students.map(student => {
      if (student.id === id) {
        return {
          ...student,
          score: value,
          status: value === '' ? 'pending' : 'unsaved'
        };
      }
      return student;
    });
    setStudents(updatedStudents);
  };

  const saveScore = (id) => {
    const updatedStudents = students.map(student => {
      if (student.id === id && student.status === 'unsaved') {
        return {
          ...student,
          status: 'saved'
        };
      }
      return student;
    });
    setStudents(updatedStudents);
  };

  const saveAll = () => {
    const updatedStudents = students.map(student => ({
      ...student,
      status: student.status === 'unsaved' ? 'saved' : student.status
    }));
    setStudents(updatedStudents);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentId.includes(searchQuery)
  );

  const completedCount = students.filter(s => s.status === 'saved').length;
  const completionPercentage = (completedCount / students.length) * 100;

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.header}>
        <h1 className={styles.title}>Mark List</h1>
        <div className={styles.actions}>
          <button className={styles.exportBtn}>
            <FiDownload /> Export
          </button>
          <button className={styles.shareBtn}>
            <FiShare2 /> Share
          </button>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <label htmlFor="grade">Grade</label>
          <select id="grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">Select Grade</option>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11</option>
            <option value="12">Grade 12</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="subject">Subject</label>
          <select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Select Subject</option>
            <option value="math">Mathematics</option>
            <option value="science">Science</option>
            <option value="english">English</option>
            <option value="history">History</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="term">Term</label>
          <select id="term" value={term} onChange={(e) => setTerm(e.target.value)}>
            <option value="">Select Term</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
          </select>
        </div>

        <button className={styles.loadBtn}>
          <FiFilter /> Load Class
        </button>
      </div>

      <div className={styles.searchSection}>
        <div className={styles.searchBox}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <motion.div 
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <span>{completedCount}/{students.length} completed</span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.markTable}>
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, index) => (
              <motion.tr
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={student.status === 'pending' ? styles.pendingRow : ''}
              >
                <td>{index + 1}</td>
                <td>{student.name}</td>
                <td>{student.studentId}</td>
                <td>
                  <div className={styles.scoreInput}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={student.score}
                      onChange={(e) => handleScoreChange(student.id, e.target.value)}
                      onBlur={() => saveScore(student.id)}
                    />
                    {student.status === 'unsaved' && (
                      <button 
                        className={styles.saveBtn}
                        onClick={() => saveScore(student.id)}
                      >
                        <FiSave />
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  <div className={`${styles.status} ${styles[student.status]}`}>
                    {student.status === 'saved' ? (
                      <>
                        <FaCheckCircle /> Saved
                      </>
                    ) : (
                      <>
                        <FaRegClock /> Pending
                      </>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        <div className={styles.tableFooter}>
          <div className={styles.classAverage}>
            Class Average: <span>82.5</span>
          </div>
          <button className={styles.saveAllBtn} onClick={saveAll}>
            <FiSave /> Save All Changes
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MRLIST;