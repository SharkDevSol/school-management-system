// ReportCard.jsx - Printable Student Report Card with Multiple Designs & Multi-Term Support
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './ReportCard.module.css';
import { 
  FaPrint, FaUserGraduate, FaSchool, 
  FaCalendarAlt, FaSpinner, FaAward,
  FaDownload, FaUsers, FaPalette, FaCheck, FaLayerGroup
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { useApp } from '../../../context/AppContext';

const API_BASE_URL = 'https://school-management-system-daul.onrender.com/api';

// Design Templates
const DESIGNS = [
  { id: 'classic', name: 'Classic', primaryColor: '#11998e', secondaryColor: '#38ef7d', accent: '#2d3748' },
  { id: 'modern', name: 'Modern Blue', primaryColor: '#667eea', secondaryColor: '#764ba2', accent: '#1a202c' },
  { id: 'elegant', name: 'Elegant Gold', primaryColor: '#b8860b', secondaryColor: '#daa520', accent: '#2c1810' },
  { id: 'professional', name: 'Professional', primaryColor: '#1e3a5f', secondaryColor: '#3d5a80', accent: '#0d1b2a' },
  { id: 'vibrant', name: 'Vibrant', primaryColor: '#e63946', secondaryColor: '#f77f00', accent: '#1d3557' },
  { id: 'minimal', name: 'Minimal', primaryColor: '#2d3436', secondaryColor: '#636e72', accent: '#000000' }
];

const ReportCard = () => {
  const { theme } = useApp();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTerms, setSelectedTerms] = useState([1]); // Multi-term selection
  const [termCount, setTermCount] = useState(2);
  const [reportData, setReportData] = useState(null);
  const [multiTermData, setMultiTermData] = useState(null); // Combined term data
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(DESIGNS[0]);
  const [showDesignPicker, setShowDesignPicker] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printAllStudents, setPrintAllStudents] = useState(false);
  const [allStudentsData, setAllStudentsData] = useState([]);

  const [schoolInfo, setSchoolInfo] = useState({
    name: 'School Management System',
    address: '',
    phone: '',
    email: '',
    academicYear: '',
    logo: null
  });
  const printContainerRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [classesRes, configRes, brandingRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/mark-list/classes`),
          axios.get(`${API_BASE_URL}/mark-list/config`),
          axios.get(`${API_BASE_URL}/admin/branding`)
        ]);
        setClasses(classesRes.data || []);
        setTermCount(configRes.data?.term_count || 2);
        if (classesRes.data?.length > 0) setSelectedClass(classesRes.data[0]);
        const branding = brandingRes.data;
        setSchoolInfo({
          name: branding.website_name || 'School Management System',
          address: branding.school_address || '',
          phone: branding.school_phone || '',
          email: branding.school_email || '',
          academicYear: branding.academic_year || '',
          logo: branding.school_logo ? `https://school-management-system-daul.onrender.com/uploads/branding/${branding.school_logo}` : null
        });
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);


  // Fetch students when class changes
  useEffect(() => {
    if (!selectedClass) return;
    const fetchStudents = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/mark-list/comprehensive-ranking/${selectedClass}/1`);
        const studentList = response.data.rankings || [];
        setStudents(studentList);
        if (studentList.length > 0) setSelectedStudent(studentList[0].studentName);
        else setSelectedStudent('');
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  // Fetch report data when student or terms change
  useEffect(() => {
    if (!selectedClass || !selectedStudent || selectedTerms.length === 0) return;
    fetchMultiTermData();
  }, [selectedClass, selectedStudent, selectedTerms]);

  const fetchMultiTermData = async () => {
    setLoadingReport(true);
    try {
      const termDataPromises = selectedTerms.map(term =>
        axios.get(`${API_BASE_URL}/mark-list/comprehensive-ranking/${selectedClass}/${term}`)
      );
      const responses = await Promise.all(termDataPromises);
      
      const termsData = responses.map((res, idx) => {
        const rankings = res.data.rankings || [];
        const studentData = rankings.find(s => s.studentName === selectedStudent);
        return {
          term: selectedTerms[idx],
          data: studentData ? { ...studentData, className: selectedClass, term: selectedTerms[idx], totalStudents: rankings.length } : null,
          subjects: res.data.subjects || []
        };
      });

      // Combine multi-term data
      if (termsData.length === 1) {
        setReportData(termsData[0].data);
        setMultiTermData(null);
      } else {
        const combined = combineTermsData(termsData);
        setMultiTermData(combined);
        setReportData(termsData[0].data);
      }

      // Fetch all students for print all
      const allStudents = responses[0].data.rankings || [];
      const allStudentsWithTerms = await Promise.all(
        allStudents.map(async (student) => {
          if (selectedTerms.length === 1) {
            return { ...student, className: selectedClass, term: selectedTerms[0], totalStudents: allStudents.length };
          }
          const studentTermsData = termsData.map(td => {
            const found = responses[termsData.indexOf(td)]?.data?.rankings?.find(s => s.studentName === student.studentName);
            return { term: td.term, data: found };
          });
          return combineTermsData(studentTermsData.map((std, i) => ({
            term: selectedTerms[i],
            data: std.data ? { ...std.data, className: selectedClass, term: selectedTerms[i], totalStudents: allStudents.length } : null
          })));
        })
      );
      setAllStudentsData(allStudentsWithTerms.filter(s => s));
    } catch (error) {
      console.error('Error fetching report:', error);
      setReportData(null);
      setMultiTermData(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const combineTermsData = (termsData) => {
    const validTerms = termsData.filter(t => t.data);
    if (validTerms.length === 0) return null;

    const firstTerm = validTerms[0].data;
    const combinedSubjects = {};
    const termAverages = [];

    validTerms.forEach(({ term, data }) => {
      if (data?.subjects) {
        Object.entries(data.subjects).forEach(([subject, subData]) => {
          if (!combinedSubjects[subject]) {
            combinedSubjects[subject] = { terms: {}, totalSum: 0, count: 0 };
          }
          combinedSubjects[subject].terms[term] = subData.total || 0;
          combinedSubjects[subject].totalSum += subData.total || 0;
          combinedSubjects[subject].count++;
        });
      }
      termAverages.push({ term, average: data?.average || 0 });
    });

    // Calculate subject averages
    Object.keys(combinedSubjects).forEach(subject => {
      combinedSubjects[subject].average = combinedSubjects[subject].totalSum / combinedSubjects[subject].count;
    });

    const totalAverage = termAverages.reduce((sum, t) => sum + t.average, 0) / termAverages.length;

    return {
      studentName: firstTerm.studentName,
      className: firstTerm.className,
      totalStudents: firstTerm.totalStudents,
      terms: selectedTerms,
      termAverages,
      subjects: combinedSubjects,
      totalAverage,
      isMultiTerm: true
    };
  };


  const calculateGrade = (marks) => {
    if (marks >= 90) return { grade: 'A+', remark: 'Excellent', color: '#27ae60' };
    if (marks >= 80) return { grade: 'A', remark: 'Very Good', color: '#2ecc71' };
    if (marks >= 70) return { grade: 'B+', remark: 'Good', color: '#3498db' };
    if (marks >= 60) return { grade: 'B', remark: 'Satisfactory', color: '#f39c12' };
    if (marks >= 50) return { grade: 'C', remark: 'Fair', color: '#e67e22' };
    if (marks >= 40) return { grade: 'D', remark: 'Needs Improvement', color: '#e74c3c' };
    return { grade: 'F', remark: 'Fail', color: '#c0392b' };
  };

  const handleTermToggle = (term) => {
    setSelectedTerms(prev => {
      if (prev.includes(term)) {
        if (prev.length === 1) return prev; // Keep at least one term
        return prev.filter(t => t !== term).sort((a, b) => a - b);
      }
      return [...prev, term].sort((a, b) => a - b);
    });
  };

  const handlePrint = (printAll = false) => {
    setPrintAllStudents(printAll);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsPrinting(false), 500);
    }, 100);
  };

  const handleDownloadPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const cardWidth = pageWidth / 2;
    const cardHeight = pageHeight / 2;
    const cardsToProcess = allStudentsData.length > 0 ? allStudentsData : [multiTermData || reportData];
    
    for (let i = 0; i < cardsToProcess.length; i++) {
      const cardIndex = i % 4;
      if (i > 0 && cardIndex === 0) pdf.addPage();
      const col = cardIndex % 2;
      const row = Math.floor(cardIndex / 2);
      const x = col * cardWidth + 5;
      const y = row * cardHeight + 5;
      
      pdf.setFontSize(8);
      pdf.text(`Report Card - ${cardsToProcess[i]?.studentName || 'Student'}`, x, y + 10);
    }
    pdf.save(`ReportCards_${selectedClass}_Terms${selectedTerms.join('-')}.pdf`);
  };

  // Single Term Report Card Component (A6 size - 4 per A4)
  const SingleReportCard = ({ data, design }) => {
    if (!data) return null;
    const d = design || selectedDesign;
    const isMulti = data.isMultiTerm;
    
    return (
      <div className={styles.reportCard} style={{ '--primary': d.primaryColor, '--secondary': d.secondaryColor, '--accent': d.accent }}>
        {/* Header */}
        <div className={styles.cardHeader} style={{ background: `linear-gradient(135deg, ${d.primaryColor}, ${d.secondaryColor})` }}>
          <div className={styles.logoSection}>
            {schoolInfo.logo ? <img src={schoolInfo.logo} alt="Logo" className={styles.schoolLogo} /> : <FaSchool className={styles.logoIcon} />}
          </div>
          <div className={styles.schoolDetails}>
            <h2>{schoolInfo.name}</h2>
          </div>
          <div className={styles.termBadge}>
            <span>{isMulti ? `Terms ${data.terms.join(', ')}` : `Term ${data.term}`}</span>
            {schoolInfo.academicYear && <small>{schoolInfo.academicYear}</small>}
          </div>
        </div>

        {/* Student Info Row */}
        <div className={styles.studentRow}>
          <div className={styles.studentInfo}>
            <div className={styles.infoItem}><label>Student:</label><strong>{data.studentName}</strong></div>
            <div className={styles.infoItem}><label>Class:</label><strong>{data.className}</strong></div>
          </div>
          {!isMulti && data.rank && (
            <div className={styles.studentRank} style={{ background: `${d.primaryColor}15`, borderColor: d.primaryColor }}>
              <span className={styles.rankNum}>{data.rank}</span>
              <span className={styles.rankOf}>/{data.totalStudents}</span>
            </div>
          )}
        </div>

        {/* Marks Table */}
        <table className={styles.marksTable}>
          <thead style={{ background: d.primaryColor }}>
            <tr>
              <th>Subject</th>
              {isMulti ? (
                <>
                  {data.terms.map(t => <th key={t}>T{t}</th>)}
                  <th>Avg</th>
                </>
              ) : (
                <>
                  <th>Marks</th>
                  <th>Grade</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {isMulti ? (
              Object.entries(data.subjects).slice(0, 6).map(([subject, subData]) => {
                const { grade, color } = calculateGrade(subData.average || 0);
                return (
                  <tr key={subject}>
                    <td>{subject}</td>
                    {data.terms.map(t => <td key={t} className={styles.markCell}>{subData.terms[t] || '-'}</td>)}
                    <td><span className={styles.gradeBadge} style={{ background: `${color}20`, color }}>{subData.average?.toFixed(0)}</span></td>
                  </tr>
                );
              })
            ) : (
              data.subjects && Object.entries(data.subjects).slice(0, 6).map(([subject, subData]) => {
                const { grade, color } = calculateGrade(subData.total || 0);
                return (
                  <tr key={subject}>
                    <td>{subject}</td>
                    <td className={styles.markCell}>{subData.total || 0}</td>
                    <td><span className={styles.gradeBadge} style={{ background: `${color}20`, color }}>{grade}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Summary Row */}
        <div className={styles.summaryRow} style={{ borderColor: d.primaryColor }}>
          {isMulti ? (
            <>
              {data.termAverages.map(ta => (
                <div key={ta.term} className={styles.summaryItem}>
                  <label>T{ta.term}</label>
                  <strong>{ta.average?.toFixed(1)}%</strong>
                </div>
              ))}
              <div className={styles.summaryItem}>
                <label>Total Avg</label>
                <strong style={{ color: d.primaryColor }}>{data.totalAverage?.toFixed(1)}%</strong>
              </div>
              <div className={styles.summaryItem}>
                <label>Grade</label>
                <strong style={{ color: calculateGrade(data.totalAverage || 0).color }}>{calculateGrade(data.totalAverage || 0).grade}</strong>
              </div>
            </>
          ) : (
            <>
              <div className={styles.summaryItem}>
                <label>Average</label>
                <strong style={{ color: d.primaryColor }}>{data.average?.toFixed(1) || 0}%</strong>
              </div>
              <div className={styles.summaryItem}>
                <label>Grade</label>
                <strong style={{ color: calculateGrade(data.average || 0).color }}>{calculateGrade(data.average || 0).grade}</strong>
              </div>
              <div className={styles.summaryItem}>
                <label>Status</label>
                <strong className={data.overallStatus === 'Pass' ? styles.passText : styles.failText}>{data.overallStatus || 'N/A'}</strong>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };


  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <FaSpinner className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  const displayData = multiTermData || reportData;

  return (
    <div className={`${styles.container} ${isPrinting ? styles.printMode : ''}`}>
      {/* Screen UI - Hidden when printing */}
      {!isPrinting && (
        <div className={styles.screenOnly}>
          {/* Header */}
          <div className={styles.header} style={{ background: `linear-gradient(135deg, ${theme?.primaryColor || '#11998e'}, ${theme?.secondaryColor || '#38ef7d'})` }}>
            <div className={styles.headerContent}>
              <FaAward className={styles.headerIcon} />
              <div>
                <h1>Student Report Card</h1>
                <p>Generate and print report cards (A6 size - 4 per A4 page)</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <label><FaSchool /> Class</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                {classes.length === 0 ? <option value="">No classes</option> : classes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
            </div>

            <div className={styles.controlGroup}>
              <label><FaUserGraduate /> Student</label>
              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} disabled={students.length === 0}>
                {students.length === 0 ? <option value="">No students</option> : students.map(s => <option key={s.studentName} value={s.studentName}>{s.studentName} (#{s.rank})</option>)}
              </select>
            </div>

            <div className={styles.controlGroup}>
              <label><FaLayerGroup /> Terms</label>
              <div className={styles.termSelector}>
                {Array.from({ length: termCount }, (_, i) => i + 1).map(term => (
                  <button
                    key={term}
                    className={`${styles.termBtn} ${selectedTerms.includes(term) ? styles.termActive : ''}`}
                    onClick={() => handleTermToggle(term)}
                  >
                    T{term}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.controlGroup}>
              <label><FaPalette /> Design</label>
              <div className={styles.designSelector}>
                <button className={styles.designBtn} onClick={() => setShowDesignPicker(!showDesignPicker)} style={{ background: selectedDesign.primaryColor }}>
                  {selectedDesign.name}
                </button>
                {showDesignPicker && (
                  <div className={styles.designDropdown}>
                    {DESIGNS.map(d => (
                      <div key={d.id} className={`${styles.designOption} ${selectedDesign.id === d.id ? styles.selected : ''}`}
                           onClick={() => { setSelectedDesign(d); setShowDesignPicker(false); }}>
                        <div className={styles.designPreview} style={{ background: `linear-gradient(135deg, ${d.primaryColor}, ${d.secondaryColor})` }}></div>
                        <span>{d.name}</span>
                        {selectedDesign.id === d.id && <FaCheck />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.actionButtons}>
              <motion.button className={styles.printBtn} onClick={() => handlePrint(false)} whileHover={{ scale: 1.05 }} disabled={!displayData}>
                <FaPrint /> Print Single
              </motion.button>
              <motion.button className={styles.printAllBtn} onClick={() => handlePrint(true)} whileHover={{ scale: 1.05 }} disabled={allStudentsData.length === 0}>
                <FaUsers /> Print All ({allStudentsData.length})
              </motion.button>
              <motion.button className={styles.pdfBtn} onClick={handleDownloadPDF} whileHover={{ scale: 1.05 }} disabled={!displayData}>
                <FaDownload /> PDF
              </motion.button>
            </div>
          </div>

          {/* Multi-term info */}
          {selectedTerms.length > 1 && (
            <div className={styles.multiTermInfo}>
              <FaLayerGroup /> Showing combined report for Terms: {selectedTerms.join(', ')}
            </div>
          )}

          {/* Preview */}
          {loadingReport ? (
            <div className={styles.loadingReport}><FaSpinner className={styles.spinner} /><p>Loading...</p></div>
          ) : !displayData ? (
            <div className={styles.noData}><FaUserGraduate className={styles.noDataIcon} /><h3>No data available</h3><p>Select a class and student with marks entered.</p></div>
          ) : (
            <div className={styles.previewSection}>
              <h3>Preview (A6 Card)</h3>
              <div className={styles.previewCard}>
                <SingleReportCard data={displayData} design={selectedDesign} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print Container - Only visible when printing */}
      {isPrinting && (
        <div className={styles.printContainer} ref={printContainerRef}>
          <div className={styles.printPages}>
            {printAllStudents && allStudentsData.length > 0 ? (
              allStudentsData.map((studentData, index) => (
                <div key={index} className={styles.printCard}>
                  <SingleReportCard data={studentData} design={selectedDesign} />
                </div>
              ))
            ) : displayData ? (
              <div className={styles.printCard}>
                <SingleReportCard data={displayData} design={selectedDesign} />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportCard;
