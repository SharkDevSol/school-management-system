// ListStaff.jsx - Modern Staff List with File Display
import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiSearch, FiFilter, FiEye, FiEyeOff, FiTrash2, 
  FiDownload, FiFile, FiX, FiRefreshCw, FiLock, FiCopy,
  FiPhone, FiMail, FiUser, FiBriefcase, FiGrid, FiList,
  FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { getFileType, getFileIcon, isFileField, getFileUrl, formatLabel, getFileName, looksLikeFile } from '../utils/fileUtils';
import { useApp } from '../../../context/AppContext';
import styles from './ListStaff.module.css';

const ListStaff = () => {
  const { t } = useApp();
  const [staffData, setStaffData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(null);
  const [staffTypes, setStaffTypes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const itemsPerPage = 12;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => { fetchAllStaff(); }, []);
  useEffect(() => { filterStaffData(); }, [staffData, searchTerm, filterRole, filterType]);

  const fetchAllStaff = async () => {
    setLoading(true);
    try {
      const types = ['Supportive Staff', 'Administrative Staff', 'Teachers'];
      let allStaff = [];
      const foundTypes = [];
      
      for (const staffType of types) {
        try {
          const classesResponse = await axios.get(`https://school-management-system-daul.onrender.com/api/staff/classes?staffType=${encodeURIComponent(staffType)}`);
          if (classesResponse.data.length > 0) foundTypes.push(staffType);
          
          for (const className of classesResponse.data) {
            const dataResponse = await axios.get(`https://school-management-system-daul.onrender.com/api/staff/data/${staffType}/${className}`);
            const staffWithMeta = dataResponse.data.data.map((staff, idx) => ({ 
              ...staff, 
              staffType, 
              className,
              uniqueId: `${staffType}-${className}-${idx}-${Date.now()}-${Math.random()}`
            }));
            allStaff = [...allStaff, ...staffWithMeta];
          }
        } catch (err) { console.warn(`No data for: ${staffType}`); }
      }
      
      setStaffTypes(foundTypes);
      setStaffData(allStaff);
      setFilteredData(allStaff);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const filterStaffData = () => {
    let filtered = staffData.filter(staff => {
      const name = staff.full_name || staff.name || '';
      const email = staff.email || '';
      const phone = staff.phone || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
      const matchesRole = filterRole === 'all' || staff.role === filterRole;
      const matchesType = filterType === 'all' || staff.staffType === filterType;
      return matchesSearch && matchesRole && matchesType;
    });
    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const getStaffFiles = (staff) => {
    return Object.entries(staff).filter(([key, value]) => 
      value && key !== 'image_staff' && (isFileField(key) || looksLikeFile(value))
    );
  };

  const openFilePreview = (filename, fieldName) => {
    const fileType = getFileType(filename);
    const url = getFileUrl(filename, 'staff');
    setShowFilePreview({ filename: getFileName(filename), fieldName, fileType, url });
  };

  const handleDelete = async (staff) => {
    if (!window.confirm(`Delete ${staff.full_name || staff.name}?`)) return;
    try {
      // Add delete API call here if needed
      setStaffData(prev => prev.filter(s => s.uniqueId !== staff.uniqueId));
    } catch (error) { alert('Failed to delete'); }
  };

  const renderFileIcon = (type) => {
    const iconInfo = getFileIcon(type);
    const IconComponent = iconInfo.icon;
    return <IconComponent style={{ color: iconInfo.color }} />;
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentStaff = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && staffData.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Loading staff...</p>
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
            <h1>{t('staffDirectory')}</h1>
            <p>{t('staffDirectoryDesc')}</p>
          </div>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statBox}>
            <span className={styles.statNum}>{filteredData.length}</span>
            <span className={styles.statLabel}>{t('totalStaff')}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNum}>{staffTypes.length}</span>
            <span className={styles.statLabel}>{t('categories')}</span>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div className={styles.controls} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className={styles.searchBox}>
          <FiSearch />
          <input 
            type="text" 
            placeholder={t('searchStaff')} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <FiFilter />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">{t('allTypes')}</option>
              {staffTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
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
        <button className={styles.refreshBtn} onClick={fetchAllStaff}>
          <FiRefreshCw /> {t('refresh')}
        </button>
      </motion.div>

      {/* Staff Display */}
      {currentStaff.length === 0 ? (
        <div className={styles.emptyState}>
          <FiUsers size={64} />
          <h3>{t('noStaffFound')}</h3>
          <p>{t('tryAdjustingFilters')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <motion.div className={styles.staffGrid} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AnimatePresence>
            {currentStaff.map((staff, index) => {
              const fileFields = getStaffFiles(staff);
              return (
                <motion.div 
                  key={staff.uniqueId} 
                  className={styles.staffCard}
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ y: -5 }}
                  onClick={() => { setSelectedStaff(staff); setShowModal(true); }}
                >
                  <div className={styles.cardHeader}>
                    {staff.image_staff ? (
                      <img 
                        src={getFileUrl(staff.image_staff, 'staff')} 
                        alt={staff.full_name || staff.name} 
                        className={styles.staffImage}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}><FiUser /></div>
                    )}
                    <div className={styles.cardBadges}>
                      {staff.employment_type && (
                        <span className={`${styles.badge} ${staff.employment_type === 'Full-time' ? styles.badgeFull : styles.badgePart}`}>
                          {staff.employment_type}
                        </span>
                      )}
                      {staff.staffType && (
                        <span className={`${styles.badge} ${styles.badgeType}`}>
                          {staff.staffType.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.staffName}>{staff.full_name || staff.name || 'Unknown'}</h3>
                    <p className={styles.staffRole}>{staff.role || staff.position || staff.staffType}</p>
                    <div className={styles.cardInfo}>
                      {staff.email && (
                        <div className={styles.infoItem}><FiMail /> {staff.email}</div>
                      )}
                      {staff.phone && (
                        <div className={styles.infoItem}><FiPhone /> {staff.phone}</div>
                      )}
                      {staff.department && (
                        <div className={styles.infoItem}><FiBriefcase /> {staff.department}</div>
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
                      onClick={(e) => { e.stopPropagation(); setSelectedStaff(staff); setShowModal(true); }}
                    >
                      <FiEye /> {t('view')}
                    </button>
                    <button 
                      className={styles.actionBtn}
                      onClick={(e) => { e.stopPropagation(); handleDelete(staff); }}
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
        /* Table View */
        <motion.div className={styles.tableWrapper} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <table className={styles.staffTable}>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Type</th>
                <th>Role</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Documents</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentStaff.map((staff) => {
                const fileFields = getStaffFiles(staff);
                return (
                  <tr key={staff.uniqueId} onClick={() => { setSelectedStaff(staff); setShowModal(true); }}>
                    <td>
                      {staff.image_staff ? (
                        <img src={getFileUrl(staff.image_staff, 'staff')} alt="" className={styles.tableImage} />
                      ) : (
                        <div className={styles.tableAvatar}><FiUser /></div>
                      )}
                    </td>
                    <td><strong>{staff.full_name || staff.name}</strong></td>
                    <td>{staff.staffType}</td>
                    <td>{staff.role || staff.position || '-'}</td>
                    <td>{staff.email || '-'}</td>
                    <td>{staff.phone || '-'}</td>
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
                      ) : (
                        <span className={styles.noFiles}>-</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.tableActions}>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedStaff(staff); setShowModal(true); }}>
                          <FiEye />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(staff); }}>
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
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <FiChevronLeft /> {t('previous')}
          </button>
          <span>{t('page')} {currentPage} {t('of')} {totalPages}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
          >
            {t('next')} <FiChevronRight />
          </button>
        </div>
      )}


      {/* Staff Detail Modal */}
      <AnimatePresence>
        {showModal && selectedStaff && (
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
                {selectedStaff.image_staff ? (
                  <img 
                    src={getFileUrl(selectedStaff.image_staff, 'staff')} 
                    alt="" 
                    className={styles.modalImage}
                    onClick={() => openFilePreview(selectedStaff.image_staff, 'Profile Photo')}
                  />
                ) : (
                  <div className={styles.modalAvatar}><FiUser /></div>
                )}
                <div className={styles.modalHeaderInfo}>
                  <h2>{selectedStaff.full_name || selectedStaff.name}</h2>
                  <p>{selectedStaff.role || selectedStaff.position || selectedStaff.staffType}</p>
                  <div className={styles.modalBadges}>
                    {selectedStaff.employment_type && (
                      <span className={`${styles.badge} ${selectedStaff.employment_type === 'Full-time' ? styles.badgeFull : styles.badgePart}`}>
                        {selectedStaff.employment_type}
                      </span>
                    )}
                    {selectedStaff.staffType && (
                      <span className={`${styles.badge} ${styles.badgeType}`}>
                        {selectedStaff.staffType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.modalSection}>
                  <h3><FiUser /> {t('basicInformation')}</h3>
                  <div className={styles.infoGrid}>
                    {Object.entries(selectedStaff)
                      .filter(([key, value]) => !isFileField(key) && !looksLikeFile(value) && !['uniqueId', 'id', 'global_staff_id', 'staff_id', 'password', 'password_hash', 'staffType', 'className'].includes(key))
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
                {(selectedStaff.username || selectedStaff.password || selectedStaff.password_hash) && (
                  <div className={styles.modalSection}>
                    <h3><FiLock /> {t('loginCredentials')}</h3>
                    <div className={styles.credentialsGrid}>
                      {selectedStaff.username && (
                        <div className={styles.credentialRow}>
                          <span className={styles.credentialLabel}>{t('username')}</span>
                          <div className={styles.credentialValue}>
                            <span>{selectedStaff.username}</span>
                            <button 
                              className={styles.copyBtn}
                              onClick={() => copyToClipboard(selectedStaff.username)}
                              title="Copy username"
                            >
                              <FiCopy />
                            </button>
                          </div>
                        </div>
                      )}
                      {(selectedStaff.password || selectedStaff.password_hash) && (
                        <div className={styles.credentialRow}>
                          <span className={styles.credentialLabel}>{t('password')}</span>
                          <div className={styles.credentialValue}>
                            <span className={styles.passwordText}>
                              {showPassword ? (selectedStaff.password || selectedStaff.password_hash || '-') : '••••••••'}
                            </span>
                            <button 
                              className={styles.toggleBtn}
                              onClick={() => setShowPassword(!showPassword)}
                              title={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                            <button 
                              className={styles.copyBtn}
                              onClick={() => copyToClipboard(selectedStaff.password || selectedStaff.password_hash || '')}
                              title="Copy password"
                            >
                              <FiCopy />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Documents Section */}
                {(() => {
                  const fileFields = Object.entries(selectedStaff).filter(([key, value]) => value && (isFileField(key) || looksLikeFile(value)));
                  if (fileFields.length === 0) return null;
                  return (
                    <div className={styles.modalSection}>
                      <h3><FiFile /> {t('documentsAndFiles')}</h3>
                      <div className={styles.documentsGrid}>
                        {fileFields.map(([key, value]) => {
                          const fileType = getFileType(value);
                          const url = getFileUrl(value, 'staff');
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
                  <FiDownload /> {t('download')}
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListStaff;
