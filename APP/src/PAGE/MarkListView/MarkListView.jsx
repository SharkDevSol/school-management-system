// MarkListView.jsx - Display All Student Marks with All Subjects
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './MarkListView.module.css';
import {
  FaPrint,
  FaFileExcel,
  FaFilePdf,
  FaChartBar,
  FaSearch,
  FaUserGraduate,
  FaBook,
  FaCalendarAlt,
  FaSpinner,
  FaTrophy,
  FaChartLine,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useApp } from '../../context/AppContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://excellence.oddag.et/api';

const MarkListView = () => {
  const { t, theme } = useApp();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [markConfig, setMarkConfig] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [termCount, setTermCount] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [viewMode, setViewMode] = useState('ranking'); // 'subject' or 'ranking'
  const [rankingData, setRankingData] = useState(null);
  const markListRef = useRef(null);

  // Fetch available classes and config
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [classesRes, configRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/mark-list/classes`),
          axios.get(`${API_BASE_URL}/mark-list/config`),
        ]);
        setClasses(classesRes.data || []);
        setTermCount(configRes.data?.term_count || 2);
        if (classesRes.data?.length > 0) {
          setSelectedClass(classesRes.data[0]);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch subjects when class changes
  useEffect(() => {
    if (!selectedClass) return;
    const fetchSubjects = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/mark-list/subjects-classes`);
        const classSubjects = response.data?.filter((m) => m.class_name === selectedClass) || [];
        setSubjects(classSubjects);
        if (classSubjects.length > 0) {
          setSelectedSubject(classSubjects[0].subject_name);
        } else {
          setSelectedSubject('');
          setStudents([]);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setSubjects([]);
      }
    };
    fetchSubjects();
  }, [selectedClass]);

  // Fetch marks for single subject view
  useEffect(() => {
    if (!selectedClass || !selectedSubject || !selectedTerm || viewMode !== 'subject') return;
    const fetchMarks = async () => {
      setLoadingMarks(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/mark-list/mark-list/${selectedSubject}/${selectedClass}/${selectedTerm}`
        );
        setStudents(response.data.markList || []);
        setMarkConfig(response.data.config || null);
      } catch (error) {
        console.error('Error fetching marks:', error);
        setStudents([]);
        setMarkConfig(null);
      } finally {
        setLoadingMarks(false);
      }
    };
    fetchMarks();
  }, [selectedClass, selectedSubject, selectedTerm, viewMode]);

  // Fetch comprehensive class ranking with all subjects
  useEffect(() => {
    if (!selectedClass || !selectedTerm || viewMode !== 'ranking') return;
    const fetchRanking = async () => {
      setLoadingMarks(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/mark-list/comprehensive-ranking/${selectedClass}/${selectedTerm}`
        );
        setRankingData(response.data);
      } catch (error) {
        console.error('Error fetching ranking:', error);
        setRankingData(null);
      } finally {
        setLoadingMarks(false);
      }
    };
    fetchRanking();
  }, [selectedClass, selectedTerm, viewMode]);

  const calculateGrade = (marks) => {
    if (marks >= 90) return 'A+';
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B+';
    if (marks >= 60) return 'B';
    if (marks >= 50) return 'C';
    if (marks >= 40) return 'D';
    return 'F';
  };

  const getGradeColor = (grade) => {
    if (grade === 'A+' || grade === 'A') return '#27ae60';
    if (grade === 'B+' || grade === 'B') return '#f39c12';
    if (grade === 'C') return '#e67e22';
    return '#e74c3c';
  };

  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true;
    return student.student_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => (b.total || 0) - (a.total || 0));

  // Statistics for subject view
  const totalStudents = filteredStudents.length;
  const marks = filteredStudents.map((s) => s.total || 0);
  const averageMark = marks.length > 0 ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) : 0;
  const passCount = filteredStudents.filter((s) => s.pass_status === 'Pass').length;
  const failCount = totalStudents - passCount;

  // Get mark components from config
  const markComponents = markConfig?.mark_components || [];

  // Get all subjects from ranking data
  const allSubjects = rankingData?.subjects || [];


  const exportToExcel = () => {
    if (viewMode === 'subject') {
      const worksheet = XLSX.utils.json_to_sheet(
        sortedStudents.map((student, index) => {
          const row = { Rank: index + 1, 'Student Name': student.student_name };
          markComponents.forEach((comp) => {
            const key = comp.name.toLowerCase().replace(/\s+/g, '_');
            row[comp.name] = student[key] || 0;
          });
          row['Total'] = student.total || 0;
          row['Grade'] = calculateGrade(student.total || 0);
          row['Status'] = student.pass_status || 'N/A';
          return row;
        })
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mark List');
      XLSX.writeFile(workbook, `${selectedClass}_${selectedSubject}_Term${selectedTerm}_Marks.xlsx`);
    } else {
      // Export ranking with all subjects
      const worksheet = XLSX.utils.json_to_sheet(
        (rankingData?.rankings || []).map((student) => {
          const row = { Rank: student.rank, 'Student Name': student.studentName };
          allSubjects.forEach((subject) => {
            row[subject] = student.subjects?.[subject]?.total || '-';
          });
          row['Total'] = student.totalMarks?.toFixed(1) || 0;
          row['Average'] = student.average?.toFixed(1) || 0;
          row['Grade'] = calculateGrade(student.average || 0);
          row['Status'] = student.overallStatus || 'N/A';
          return row;
        })
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Class Ranking');
      XLSX.writeFile(workbook, `${selectedClass}_Term${selectedTerm}_AllSubjects_Rankings.xlsx`);
    }
  };

  const exportToPDF = () => {
    const input = markListRef.current;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const filename =
        viewMode === 'subject'
          ? `${selectedClass}_${selectedSubject}_Term${selectedTerm}_Marks.pdf`
          : `${selectedClass}_Term${selectedTerm}_AllSubjects_Rankings.pdf`;
      pdf.save(filename);
    });
  };

  const printMarkList = () => window.print();

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <FaSpinner className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <motion.div className={styles.container} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <FaChartBar className={styles.headerIcon} />
          <div>
            <h1>Student Mark List</h1>
            <p>View and analyze student academic performance across all subjects</p>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'ranking' ? styles.active : ''}`}
          onClick={() => setViewMode('ranking')}
        >
          <FaTrophy /> All Subjects & Ranking
        </button>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'subject' ? styles.active : ''}`}
          onClick={() => setViewMode('subject')}
        >
          <FaBook /> Single Subject
        </button>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaUserGraduate />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>
              {viewMode === 'subject' ? totalStudents : rankingData?.rankings?.length || 0}
            </span>
            <span className={styles.statLabel}>Students</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e3f2fd' }}>
            <FaBook style={{ color: '#2196f3' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>
              {viewMode === 'subject' ? subjects.length : allSubjects.length}
            </span>
            <span className={styles.statLabel}>Subjects</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fff3e0' }}>
            <FaChartLine style={{ color: '#ff9800' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>
              {viewMode === 'subject' ? averageMark : rankingData?.summary?.averageClassScore?.toFixed(1) || 0}%
            </span>
            <span className={styles.statLabel}>Class Average</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e8f5e9' }}>
            <FaCheckCircle style={{ color: '#4caf50' }} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>
              {viewMode === 'subject'
                ? passCount
                : rankingData?.rankings?.filter((r) => r.overallStatus === 'Pass').length || 0}
            </span>
            <span className={styles.statLabel}>Passed</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>
            <FaBook /> Class
          </label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {viewMode === 'subject' && (
          <div className={styles.filterGroup}>
            <label>
              <FaBook /> Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={subjects.length === 0}
            >
              {subjects.length === 0 ? (
                <option value="">No subjects available</option>
              ) : (
                subjects.map((sub) => (
                  <option key={sub.subject_name} value={sub.subject_name}>
                    {sub.subject_name}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <div className={styles.filterGroup}>
          <label>
            <FaCalendarAlt /> Term
          </label>
          <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
            {Array.from({ length: termCount }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Term {i + 1}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.searchBox}>
          <FaSearch />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>


      {/* Mark List Table */}
      <div ref={markListRef} className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h2>
            {viewMode === 'subject'
              ? `${selectedClass} - ${selectedSubject} - Term ${selectedTerm}`
              : `${selectedClass} - All Subjects - Term ${selectedTerm}`}
          </h2>
          {viewMode === 'ranking' && allSubjects.length > 0 && (
            <span className={styles.subjectCount}>{allSubjects.length} Subjects</span>
          )}
          {viewMode === 'subject' && markConfig && (
            <span className={styles.passThreshold}>Pass Mark: {markConfig.pass_threshold || 50}%</span>
          )}
        </div>

        {loadingMarks ? (
          <div className={styles.loadingMarks}>
            <FaSpinner className={styles.spinner} />
            <p>Loading marks...</p>
          </div>
        ) : viewMode === 'ranking' ? (
          // All Subjects Ranking View
          !rankingData?.rankings?.length ? (
            <div className={styles.noData}>
              <FaTrophy className={styles.noDataIcon} />
              <h3>No ranking data</h3>
              <p>No marks available for this class. Please ensure marks have been entered.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.markTable}>
                <thead>
                  <tr>
                    <th className={styles.stickyCol}>Rank</th>
                    <th className={styles.stickyCol2}>Student Name</th>
                    {allSubjects.map((subject) => (
                      <th key={subject} className={styles.subjectHeader}>
                        {subject}
                      </th>
                    ))}
                    <th className={styles.totalCol}>Total</th>
                    <th className={styles.avgCol}>Average</th>
                    <th>Grade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {rankingData.rankings
                      .filter((student) => {
                        if (!searchQuery) return true;
                        return student.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
                      })
                      .map((student, index) => {
                        const grade = calculateGrade(student.average || 0);
                        return (
                          <motion.tr
                            key={student.studentName}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={student.overallStatus === 'Pass' ? styles.passed : styles.failed}
                          >
                            <td className={`${styles.rank} ${styles.stickyCol}`}>
                              {student.rank <= 3 ? (
                                <span className={`${styles.medal} ${styles[`medal${student.rank}`]}`}>
                                  {student.rank}
                                </span>
                              ) : (
                                student.rank
                              )}
                            </td>
                            <td className={`${styles.studentName} ${styles.stickyCol2}`}>
                              {student.studentName}
                            </td>
                            {allSubjects.map((subject) => {
                              const subjectData = student.subjects?.[subject];
                              const subjectMark = subjectData?.total || 0;
                              const subjectStatus = subjectData?.status;
                              const hasData = subjectData !== undefined;
                              return (
                                <td
                                  key={subject}
                                  className={`${styles.subjectMark} ${
                                    hasData
                                      ? subjectStatus === 'Pass'
                                        ? styles.subjectPass
                                        : styles.subjectFail
                                      : styles.noMark
                                  }`}
                                >
                                  {hasData ? subjectMark : '-'}
                                </td>
                              );
                            })}
                            <td className={styles.totalMark}>{student.totalMarks?.toFixed(0) || 0}</td>
                            <td className={styles.avgMark}>
                              <span
                                className={styles.avgBadge}
                                style={{
                                  background: `${getGradeColor(grade)}20`,
                                  color: getGradeColor(grade),
                                }}
                              >
                                {student.average?.toFixed(1) || 0}%
                              </span>
                            </td>
                            <td>
                              <span
                                className={styles.grade}
                                style={{
                                  background: `${getGradeColor(grade)}20`,
                                  color: getGradeColor(grade),
                                }}
                              >
                                {grade}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`${styles.status} ${
                                  styles[student.overallStatus?.toLowerCase() || 'fail']
                                }`}
                              >
                                {student.overallStatus || 'N/A'}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )
        ) : // Single Subject View
        sortedStudents.length === 0 ? (
          <div className={styles.noData}>
            <FaUserGraduate className={styles.noDataIcon} />
            <h3>No marks found</h3>
            <p>No student marks available for the selected subject.</p>
          </div>
        ) : (
          <table className={styles.markTable}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student Name</th>
                {markComponents.map((comp) => (
                  <th key={comp.name}>
                    {comp.name} ({comp.percentage}%)
                  </th>
                ))}
                <th>Total</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sortedStudents.map((student, index) => {
                  const grade = calculateGrade(student.total || 0);
                  return (
                    <motion.tr
                      key={student.id || student.student_name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={student.pass_status === 'Pass' ? styles.passed : styles.failed}
                    >
                      <td className={styles.rank}>
                        {index < 3 ? (
                          <span className={`${styles.medal} ${styles[`medal${index + 1}`]}`}>{index + 1}</span>
                        ) : (
                          index + 1
                        )}
                      </td>
                      <td className={styles.studentName}>{student.student_name}</td>
                      {markComponents.map((comp) => {
                        const key = comp.name.toLowerCase().replace(/\s+/g, '_');
                        return (
                          <td key={comp.name} className={styles.componentMark}>
                            {student[key] || 0}
                          </td>
                        );
                      })}
                      <td className={styles.marks}>{student.total || 0}</td>
                      <td>
                        <span
                          className={styles.grade}
                          style={{ background: `${getGradeColor(grade)}20`, color: getGradeColor(grade) }}
                        >
                          {grade}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.status} ${styles[student.pass_status?.toLowerCase() || 'fail']}`}
                        >
                          {student.pass_status || 'N/A'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <motion.button
          className={styles.excelBtn}
          onClick={exportToExcel}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={
            (viewMode === 'subject' && sortedStudents.length === 0) ||
            (viewMode === 'ranking' && !rankingData?.rankings?.length)
          }
        >
          <FaFileExcel /> Export Excel
        </motion.button>
        <motion.button
          className={styles.pdfBtn}
          onClick={exportToPDF}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={
            (viewMode === 'subject' && sortedStudents.length === 0) ||
            (viewMode === 'ranking' && !rankingData?.rankings?.length)
          }
        >
          <FaFilePdf /> Export PDF
        </motion.button>
        <motion.button
          className={styles.printBtn}
          onClick={printMarkList}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={
            (viewMode === 'subject' && sortedStudents.length === 0) ||
            (viewMode === 'ranking' && !rankingData?.rankings?.length)
          }
        >
          <FaPrint /> Print
        </motion.button>
      </div>
    </motion.div>
  );
};

export default MarkListView;
