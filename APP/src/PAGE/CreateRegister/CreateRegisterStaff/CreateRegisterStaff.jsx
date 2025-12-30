// CreateRegisterStaff.jsx - Modern Staff Registration Design
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiUserPlus, FiTrash2, FiX, FiFolder, FiClipboard,
  FiBriefcase, FiShield, FiBook, FiPlus
} from 'react-icons/fi';
import styles from './CreateRegisterStaff.module.css';
import StaffForm from './StaffForm';
import { useApp } from '../../../context/AppContext';

const CreateRegisterStaff = () => {
  const { t } = useApp();
  const [staffType, setStaffType] = useState('');
  const [classes, setClasses] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(false);

  const staffTypes = [
    { id: 'Supportive Staff', labelKey: 'supportiveStaff', icon: FiBriefcase, descKey: 'supportiveStaffDesc' },
    { id: 'Administrative Staff', labelKey: 'administrativeStaff', icon: FiShield, descKey: 'administrativeStaffDesc' },
    { id: 'Teachers', labelKey: 'teachers', icon: FiBook, descKey: 'teachersDesc' }
  ];

  useEffect(() => {
    if (staffType) {
      fetchClasses();
    }
  }, [staffType]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`https://excellence.oddag.et/api/staff/classes?staffType=${encodeURIComponent(staffType)}`);
      setClasses(response.data);
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({ type: 'error', text: `Error fetching forms: ${error.response?.data?.error || error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleStaffTypeChange = (type) => {
    setStaffType(type);
    setSelectedClass(null);
    setClasses([]);
  };

  const handleDelete = async (cls, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the form "${cls}"?`)) return;
    
    setLoading(true);
    try {
      await axios.delete('https://excellence.oddag.et/api/staff/delete-form', {
        data: { staffType, className: cls }
      });
      setMessage({ type: 'success', text: 'Form deleted successfully' });
      fetchClasses();
    } catch (error) {
      setMessage({ type: 'error', text: `Error deleting form: ${error.response?.data?.error || error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedClass(null);
  };

  const handleFormSuccess = (responseData) => {
    // Handle teacher-specific success feedback
    if (responseData?.teacherData) {
      setMessage({ 
        type: 'success', 
        text: `✅ Staff member "${responseData.teacherData.name}" added successfully as ${responseData.teacherData.workTime} teacher!` 
      });
    } else if (responseData?.schoolSchemaError) {
      setMessage({ 
        type: 'warning', 
        text: `⚠️ Staff added but teacher table update failed: ${responseData.schoolSchemaError}` 
      });
    } else {
      setMessage({ type: 'success', text: '✅ Staff member added successfully!' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <motion.div 
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <FiUserPlus />
          </div>
          <div className={styles.headerTitle}>
            <h1>{t('staffRegistration')}</h1>
            <p>{t('staffRegistrationDesc')}</p>
          </div>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{classes.length}</span>
            <span className={styles.statLabel}>{t('forms')}</span>
          </div>
        </div>
      </motion.div>

      {/* Message */}
      <AnimatePresence>
        {message.text && (
          <motion.div 
            className={`${styles.message} ${styles[message.type]}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff Type Selection */}
      <motion.div 
        className={styles.typeSelection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2><FiUsers /> {t('selectStaffType')}</h2>
        <div className={styles.typeGrid}>
          {staffTypes.map((type) => {
            const Icon = type.icon;
            return (
              <motion.div
                key={type.id}
                className={`${styles.typeCard} ${staffType === type.id ? styles.active : ''}`}
                onClick={() => handleStaffTypeChange(type.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={styles.typeIcon}>
                  <Icon />
                </div>
                <h3>{t(type.labelKey)}</h3>
                <p>{t(type.descKey)}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Forms Section */}
      {staffType && (
        <motion.div 
          className={styles.formsSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={styles.sectionHeader}>
            <h2><FiFolder /> {t('availableForms')} - {staffType}</h2>
          </div>

          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><FiClipboard /></div>
              <h3>{t('loading')}</h3>
            </div>
          ) : classes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><FiClipboard /></div>
              <h3>{t('noFormsFound')}</h3>
              <p>{t('createFormFirst')}</p>
            </div>
          ) : (
            <div className={styles.formsGrid}>
              {classes.map((cls, index) => (
                <motion.div
                  key={cls}
                  className={styles.formCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedClass(cls)}
                >
                  <div className={styles.formCardHeader}>
                    <div className={styles.formIcon}>
                      <FiClipboard />
                    </div>
                    <span className={styles.formBadge}>{t('active')}</span>
                  </div>
                  <h3>{cls.replace(/_/g, ' ')}</h3>
                  <p>{t('clickToAdd')}</p>
                  <div className={styles.formActions}>
                    <button className={styles.addBtn}>
                      <FiPlus /> {t('addStaff')}
                    </button>
                    <button 
                      className={styles.deleteBtn}
                      onClick={(e) => handleDelete(cls, e)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedClass && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div 
              className={styles.modalContent}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>
                  <FiUserPlus /> {t('addStaffTo')} {selectedClass.replace(/_/g, ' ')}
                </h2>
                <button className={styles.closeBtn} onClick={closeModal}>
                  <FiX />
                </button>
              </div>
              <div className={styles.modalBody}>
                <StaffForm 
                  staffTypeProp={staffType} 
                  classNameProp={selectedClass}
                  onSuccess={handleFormSuccess}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreateRegisterStaff;
