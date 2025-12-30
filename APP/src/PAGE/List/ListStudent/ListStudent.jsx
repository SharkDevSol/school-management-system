// ListStudent.jsx - Modern Student List with File Display
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiSearch, FiFilter, FiEye, FiEyeOff, FiEdit2, FiTrash2, 
  FiDownload, FiFile, FiX, FiRefreshCw, FiLock, FiCopy,
  FiPhone, FiUser, FiCalendar, FiBook, FiGrid, FiList, FiCamera, FiUpload,
  FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import Webcam from 'react-webcam';
import { getFileType, getFileIcon, isFileField, getFileUrl, formatLabel, getFileName, looksLikeFile } from '../utils/fileUtils';
import { useApp } from '../../../context/AppContext';
import styles from './ListStudent.module.css';

const ListStudent = () => {
  const { t } = useApp();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editFile, setEditFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [allColumns, setAllColumns] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const webcamRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showGuardianPassword, setShowGuardianPassword] = useState(false);
  const itemsPerPage = 12;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => { fetchClasses(); }, []);
  useEffect(() => { if (selectedClass) fetchStudents(selectedClass); }, [selectedClass]);
  useEffect(() => { filterStudentData(); }, [students, searchTerm, filterGender]);

  const fetchClasses = async () => {
    try {
      const response = await axios.get('https://excellence.oddag.et/api/student-list/classes');
      setClasses(response.data);
      if (response.data.length > 0) setSelectedClass(response.data[0]);
      const formRes = await axios.get('https://excellence.oddag.et/api/students/form-structure');
      setCustomFields(formRes.data?.customFields || []);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchStudents = async (className) => {
    setLoading(true);
    try {
      const response = await axios.get(`https://excellence.oddag.et/api/student-list/students/${className}`);
      const studentsWithIds = response.data.map((student, index) => ({
        ...student, uniqueId: `${student.student_name}-${index}-${Date.now()}`, displayId: index + 1
      }));
      setStudents(studentsWithIds);
      if (studentsWithIds.length > 0) {
        const cols = Object.keys(studentsWithIds[0]).filter(k => !['uniqueId', 'displayId', 'id'].includes(k))
          .map(key => ({ key, label: formatLabel(key), type: getColumnType(key), isCustomField: customFields.some(f => f.name === key) }));
        setAllColumns(cols);
      }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const filterStudentData = () => {
    let filtered = students.filter(student => {
      const matchesSearch = student.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.guardian_name?.toLowerCase().includes(searchTerm.toLowerCase()) || student.guardian_phone?.includes(searchTerm);
      const matchesGender = filterGender === 'all' || student.gender === filterGender;
      return matchesSearch && matchesGender;
    });
    setFilteredStudents(filtered);
    setCurrentPage(1);
  };

  const getColumnType = (key) => {
    if (key === 'image_student') return 'image';
    if (key.includes('date') || key.includes('dob')) return 'date';
    if (key.includes('password')) return 'password';
    const cf = customFields.find(f => f.name === key);
    return cf?.type || 'text';
  };

  const getStudentFiles = (student) => {
    return Object.entries(student).filter(([key, value]) => 
      value && key !== 'image_student' && (isFileField(key) || looksLikeFile(value))
    );
  };

  const renderFileIcon = (type) => {
    const iconInfo = getFileIcon(type);
    const IconComponent = iconInfo.icon;
    return <IconComponent style={{ color: iconInfo.color }} />;
  };

  const openFilePreview = (filename, fieldName) => {
    const fileType = getFileType(filename);
    const url = getFileUrl(filename, 'student');
    setShowFilePreview({ filename: getFileName(filename), fieldName, fileType, url });
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete ${student.student_name}?`)) return;
    try {
      if (student.school_id && student.class_id) {
        await axios.delete(`https://excellence.oddag.et/api/student-list/student/${selectedClass}/${student.school_id}/${student.class_id}`);
      }
      setStudents(prev => prev.filter(s => s.uniqueId !== student.uniqueId));
    } catch (error) { alert('Failed to delete'); }
  };

  const openEditModal = (student) => { 
    setSelectedStudent(student); 
    setEditFormData(student); 
    setEditFile(null); 
    setShowEditModal(true); 
  };

  const handleEditChange = (e) => { 
    setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); 
  };

  const handleFileChange = (e) => { 
    const file = e.target.files[0]; 
    if (file) { 
      setEditFile(file); 
      setEditFormData(prev => ({ ...prev, image_student: file.name })); 
    } 
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc).then(res => res.blob()).then(blob => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setEditFile(file); 
        setEditFormData(prev => ({ ...prev, image_student: file.name })); 
        setShowCamera(false);
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault(); 
    setLoading(true);
    try {
      if (selectedStudent.school_id && selectedStudent.class_id) {
        const formData = new FormData();
        Object.entries(editFormData).forEach(([key, value]) => {
          if (!['uniqueId', 'displayId', 'id'].includes(key) && value != null) formData.append(key, value.toString());
        });
        if (editFile) formData.append('image_student', editFile);
        await axios.put(`https://excellence.oddag.et/api/student-list/student/${selectedClass}/${selectedStudent.school_id}/${selectedStudent.class_id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setStudents(prev => prev.map(s => s.uniqueId === selectedStudent.uniqueId ? { ...editFormData, uniqueId: s.uniqueId, displayId: s.displayId } : s));
      setShowEditModal(false);
    } catch (error) { alert('Failed to update'); }
    finally { setLoading(false); }
  };

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const currentStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && students.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Loading students...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <motion.div className={styles.header} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><FiUsers /></div>
          <div>
            <h1>{t('studentDirectory')}</h1>
            <p>{t('studentDirectoryDesc')}</p>
          </div>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statBox}>
            <span className={styles.statNum}>{filteredStudents.length}</span>
            <span className={styles.statLabel}>{t('students')}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNum}>{classes.length}</span>
            <span className={styles.statLabel}>{t('classes')}</span>
          </div>
        </div>
      </motion.div>

      {/* Class Tabs */}
      <motion.div className={styles.classTabs} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {classes.map(cls => (
          <button 
            key={cls} 
            className={`${styles.classTab} ${selectedClass === cls ? styles.active : ''}`} 
            onClick={() => { setSelectedClass(cls); setCurrentPage(1); }}
          >
            <FiBook /> {cls}
          </button>
        ))}
      </motion.div>

      {/* Controls */}
      <motion.div className={styles.controls} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className={styles.searchBox}>
          <FiSearch />
          <input 
            type="text" 
            placeholder={t('searchStudents')} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <FiFilter />
            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
              <option value="all">{t('allGenders')}</option>
              <option value="Male">{t('male')}</option>
              <option value="Female">{t('female')}</option>
            </select>
          </div>
        </div>
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`} 
            onClick={() => setViewMode('grid')}
          >
            <FiGrid />
          </button>
          <button 
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`} 
            onClick={() => setViewMode('list')}
          >
            <FiList />
          </button>
        </div>
        <button className={styles.refreshBtn} onClick={() => fetchStudents(selectedClass)}>
          <FiRefreshCw /> {t('refresh')}
        </button>
      </motion.div>

      {/* Student Grid */}
      {currentStudents.length === 0 ? (
        <div className={styles.emptyState}>
          <FiUsers size={64} />
          <h3>{t('noStudentsFound')}</h3>
          <p>{t('tryAdjustingFilters')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <motion.div className={styles.studentGrid} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AnimatePresence>
            {currentStudents.map((student, index) => {
              const fileFields = getStudentFiles(student);
              return (
                <motion.div 
                  key={student.uniqueId} 
                  className={styles.studentCard}
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ y: -5 }}
                  onClick={() => { setSelectedStudent(student); setShowModal(true); }}
                >
                  <div className={styles.cardHeader}>
                    {student.image_student ? (
                      <img 
                        src={getFileUrl(student.image_student, 'student')} 
                        alt={student.student_name} 
                        className={styles.studentImage}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}><FiUser /></div>
                    )}
                    <div className={styles.cardBadges}>
                      {student.gender && (
                        <span className={`${styles.badge} ${student.gender === 'Male' ? styles.badgeMale : styles.badgeFemale}`}>
                          {student.gender}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.studentName}>{student.student_name || 'Unknown'}</h3>
                    <p className={styles.studentClass}>{student.class || selectedClass}</p>
                    <div className={styles.cardInfo}>
                      {student.age && (
                        <div className={styles.infoItem}><FiCalendar /> Age: {student.age}</div>
                      )}
                      {student.guardian_name && (
                        <div className={styles.infoItem}><FiUser /> {student.guardian_name}</div>
                      )}
                      {student.guardian_phone && (
                        <div className={styles.infoItem}><FiPhone /> {student.guardian_phone}</div>
                      )}
                    </div>
                    {fileFields.length > 0 && (
                      <div className={styles.cardFiles}>
                        <span className={styles.filesLabel}>
                          <FiFile /> {fileFields.length} {fileFields.length > 1 ? t('documents') : t('document')}
                        </span>
                        <div className={styles.filesList}>
                          {fileFields.slice(0, 3).map(([key, value]) => (
                            <div 
                              key={key} 
                              className={styles.fileChip}
                              onClick={(e) => { e.stopPropagation(); openFilePreview(value, formatLabel(key)); }}
                            >
                              {renderFileIcon(getFileType(value))}
                              <span>{formatLabel(key)}</span>
                            </div>
                          ))}
                          {fileFields.length > 3 && (
                            <span className={styles.moreFiles}>+{fileFields.length - 3}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    <button 
                      className={styles.actionBtn}
                      onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); setShowModal(true); }}
                    >
                      <FiEye /> {t('view')}
                    </button>
                    <button 
                      className={styles.actionBtn}
                      onClick={(e) => { e.stopPropagation(); openEditModal(student); }}
                    >
                      <FiEdit2 />
                    </button>
                    <button 
                      className={styles.actionBtn}
                      onClick={(e) => { e.stopPropagation(); handleDelete(student); }}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* List View */
        <motion.div className={styles.tableWrapper} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <table className={styles.studentTable}>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Class</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Guardian</th>
                <th>Documents</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentStudents.map((student) => {
                const fileFields = getStudentFiles(student);
                return (
                  <tr key={student.uniqueId} onClick={() => { setSelectedStudent(student); setShowModal(true); }}>
                    <td>
                      {student.image_student ? (
                        <img src={getFileUrl(student.image_student, 'student')} alt="" className={styles.tableImage} />
                      ) : (
                        <div className={styles.tableAvatar}><FiUser /></div>
                      )}
                    </td>
                    <td><strong>{student.student_name}</strong></td>
                    <td>{student.class || selectedClass}</td>
                    <td>
                      <span className={`${styles.tableBadge} ${student.gender === 'Male' ? styles.badgeMale : styles.badgeFemale}`}>
                        {student.gender || '-'}
                      </span>
                    </td>
                    <td>{student.age || '-'}</td>
                    <td>{student.guardian_name || '-'}</td>
                    <td>
                      {fileFields.length > 0 ? (
                        <div className={styles.tableFiles}>
                          {fileFields.slice(0, 2).map(([key, value]) => (
                            <span 
                              key={key} 
                              className={styles.tableFileChip}
                              onClick={(e) => { e.stopPropagation(); openFilePreview(value, formatLabel(key)); }}
                            >
                              {renderFileIcon(getFileType(value))}
                            </span>
                          ))}
                          {fileFields.length > 2 && (
                            <span className={styles.moreCount}>+{fileFields.length - 2}</span>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      <div className={styles.tableActions}>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); setShowModal(true); }}>
                          <FiEye />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(student); }}>
                          <FiEdit2 />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(student); }}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
            <FiChevronLeft /> {t('previous')}
          </button>
          <span>{t('page')} {currentPage} {t('of')} {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            {t('next')} <FiChevronRight />
          </button>
        </div>
      )}


      {/* Student Detail Modal */}
      <AnimatePresence>
        {showModal && selectedStudent && (
          <motion.div 
            className={styles.modalOverlay} 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              className={styles.modal}
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <FiX />
              </button>
              <div className={styles.modalHeader}>
                {selectedStudent.image_student ? (
                  <img 
                    src={getFileUrl(selectedStudent.image_student, 'student')} 
                    alt="" 
                    className={styles.modalImage}
                    onClick={() => openFilePreview(selectedStudent.image_student, 'Profile Photo')}
                  />
                ) : (
                  <div className={styles.modalAvatar}><FiUser /></div>
                )}
                <div className={styles.modalHeaderInfo}>
                  <h2>{selectedStudent.student_name}</h2>
                  <p>{selectedStudent.class || selectedClass}</p>
                  <div className={styles.modalBadges}>
                    {selectedStudent.gender && (
                      <span className={`${styles.badge} ${selectedStudent.gender === 'Male' ? styles.badgeMale : styles.badgeFemale}`}>
                        {selectedStudent.gender}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.modalSection}>
                  <h3><FiUser /> {t('basicInformation')}</h3>
                  <div className={styles.infoGrid}>
                    {Object.entries(selectedStudent)
                      .filter(([key, value]) => !isFileField(key) && !looksLikeFile(value) && !['uniqueId', 'displayId', 'id', 'password', 'guardian_password'].includes(key))
                      .map(([key, value]) => (
                        <div key={key} className={styles.infoRow}>
                          <span className={styles.infoLabel}>{formatLabel(key)}</span>
                          <span className={styles.infoValue}>{value || '-'}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
                
                {/* Credentials Section */}
                {(selectedStudent.password || selectedStudent.guardian_password || selectedStudent.username || selectedStudent.guardian_username) && (
                  <div className={styles.modalSection}>
                    <h3><FiLock /> {t('loginCredentials')}</h3>
                    <div className={styles.credentialsGrid}>
                      {/* Student Credentials */}
                      {(selectedStudent.username || selectedStudent.password) && (
                        <div className={styles.credentialCard}>
                          <h4>{t('studentAccount')}</h4>
                          {selectedStudent.username && (
                            <div className={styles.credentialRow}>
                              <span className={styles.credentialLabel}>{t('username')}</span>
                              <div className={styles.credentialValue}>
                                <span>{selectedStudent.username}</span>
                                <button className={styles.copyBtn} onClick={() => copyToClipboard(selectedStudent.username)} title="Copy"><FiCopy /></button>
                              </div>
                            </div>
                          )}
                          {selectedStudent.password && (
                            <div className={styles.credentialRow}>
                              <span className={styles.credentialLabel}>{t('password')}</span>
                              <div className={styles.credentialValue}>
                                <span className={styles.passwordText}>{showStudentPassword ? selectedStudent.password : '••••••••'}</span>
                                <button className={styles.toggleBtn} onClick={() => setShowStudentPassword(!showStudentPassword)} title={showStudentPassword ? 'Hide' : 'Show'}>
                                  {showStudentPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                                <button className={styles.copyBtn} onClick={() => copyToClipboard(selectedStudent.password)} title="Copy"><FiCopy /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Guardian Credentials */}
                      {(selectedStudent.guardian_username || selectedStudent.guardian_password) && (
                        <div className={styles.credentialCard}>
                          <h4>{t('guardianAccount')}</h4>
                          {selectedStudent.guardian_username && (
                            <div className={styles.credentialRow}>
                              <span className={styles.credentialLabel}>{t('username')}</span>
                              <div className={styles.credentialValue}>
                                <span>{selectedStudent.guardian_username}</span>
                                <button className={styles.copyBtn} onClick={() => copyToClipboard(selectedStudent.guardian_username)} title="Copy"><FiCopy /></button>
                              </div>
                            </div>
                          )}
                          {selectedStudent.guardian_password && (
                            <div className={styles.credentialRow}>
                              <span className={styles.credentialLabel}>{t('password')}</span>
                              <div className={styles.credentialValue}>
                                <span className={styles.passwordText}>{showGuardianPassword ? selectedStudent.guardian_password : '••••••••'}</span>
                                <button className={styles.toggleBtn} onClick={() => setShowGuardianPassword(!showGuardianPassword)} title={showGuardianPassword ? 'Hide' : 'Show'}>
                                  {showGuardianPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                                <button className={styles.copyBtn} onClick={() => copyToClipboard(selectedStudent.guardian_password)} title="Copy"><FiCopy /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Documents Section */}
                {(() => {
                  const fileFields = Object.entries(selectedStudent).filter(([key, value]) => value && (isFileField(key) || looksLikeFile(value)));
                  if (fileFields.length === 0) return null;
                  return (
                    <div className={styles.modalSection}>
                      <h3><FiFile /> {t('documentsAndFiles')}</h3>
                      <div className={styles.documentsGrid}>
                        {fileFields.map(([key, value]) => {
                          const fileType = getFileType(value);
                          const url = getFileUrl(value, 'student');
                          return (
                            <div 
                              key={key} 
                              className={styles.documentCard}
                              onClick={() => openFilePreview(value, formatLabel(key))}
                            >
                              <div className={styles.documentPreviewArea}>
                                {fileType === 'image' ? (
                                  <img src={url} alt="" className={styles.documentImage} />
                                ) : (
                                  <div className={styles.documentIconLarge}>
                                    {renderFileIcon(fileType)}
                                  </div>
                                )}
                                <div className={styles.documentOverlay}>
                                  <FiEye /> Preview
                                </div>
                              </div>
                              <div className={styles.documentInfo}>
                                <span className={styles.documentName}>{formatLabel(key)}</span>
                                <span className={styles.documentFile}>{getFileName(value)}</span>
                              </div>
                              <div className={styles.documentActions}>
                                <a 
                                  href={url} 
                                  download 
                                  onClick={(e) => e.stopPropagation()} 
                                  className={styles.downloadBtn}
                                >
                                  <FiDownload /> {t('download')}
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedStudent && (
          <motion.div 
            className={styles.modalOverlay} 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div 
              className={styles.editModal}
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.editHeader}>
                <h2>Edit Student</h2>
                <button onClick={() => setShowEditModal(false)}><FiX /></button>
              </div>
              <form onSubmit={handleEditSubmit} className={styles.editForm}>
                <div className={styles.editPhotoSection}>
                  {editFormData.image_student ? (
                    <img 
                      src={editFile ? URL.createObjectURL(editFile) : getFileUrl(editFormData.image_student, 'student')} 
                      alt="" 
                      className={styles.editPhoto} 
                    />
                  ) : (
                    <div className={styles.editPhotoPlaceholder}><FiUser /></div>
                  )}
                  <div className={styles.photoButtons}>
                    <label className={styles.uploadBtn}>
                      <FiUpload /> Upload
                      <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                    </label>
                    <button type="button" className={styles.cameraBtn} onClick={() => setShowCamera(true)}>
                      <FiCamera /> Camera
                    </button>
                  </div>
                </div>
                <div className={styles.editFields}>
                  {allColumns.filter(col => !isFileField(col.key) && col.type !== 'password').slice(0, 10).map(col => (
                    <div key={col.key} className={styles.editField}>
                      <label>{col.label}</label>
                      <input 
                        type="text" 
                        name={col.key} 
                        value={editFormData[col.key] || ''} 
                        onChange={handleEditChange} 
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.editActions}>
                  <button type="button" onClick={() => setShowEditModal(false)} className={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.saveBtn} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Modal */}
      {showCamera && (
        <div className={styles.cameraModal}>
          <div className={styles.cameraContent}>
            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className={styles.webcam} />
            <div className={styles.cameraActions}>
              <button onClick={() => setShowCamera(false)}>Cancel</button>
              <button onClick={capturePhoto} className={styles.captureBtn}>
                <FiCamera /> Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <AnimatePresence>
        {showFilePreview && (
          <motion.div 
            className={styles.filePreviewOverlay}
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setShowFilePreview(null)}
          >
            <motion.div 
              className={styles.filePreviewModal}
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.filePreviewHeader}>
                <h3>
                  {renderFileIcon(showFilePreview.fileType)} {showFilePreview.fieldName}
                </h3>
                <button onClick={() => setShowFilePreview(null)}><FiX /></button>
              </div>
              <div className={styles.filePreviewContent}>
                {showFilePreview.fileType === 'image' ? (
                  <img src={showFilePreview.url} alt={showFilePreview.fieldName} />
                ) : showFilePreview.fileType === 'pdf' ? (
                  <iframe src={showFilePreview.url} title="PDF Preview" />
                ) : (
                  <div className={styles.filePreviewFallback}>
                    <div className={styles.fallbackIcon}>
                      {renderFileIcon(showFilePreview.fileType)}
                    </div>
                    <h4>{showFilePreview.filename}</h4>
                    <p>This file type cannot be previewed in the browser</p>
                  </div>
                )}
              </div>
              <div className={styles.filePreviewFooter}>
                <span>{showFilePreview.filename}</span>
                <a href={showFilePreview.url} download className={styles.downloadButton}>
                  <FiDownload /> Download
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListStudent;
