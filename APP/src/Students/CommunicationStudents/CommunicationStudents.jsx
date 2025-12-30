import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiSearch, FiFilter, FiDownload, FiAlertTriangle, FiInfo, FiClock } from 'react-icons/fi';
import { FaUserCircle } from 'react-icons/fa';
import styles from './CommunicationStudents.module.css';

const CommunicationStudents = () => {
  const [reportText, setReportText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState([
    {
      id: 1,
      author: 'Super Admin',
      date: '2025-08-14 10:20 AM',
      text: 'The meeting will be held tomorrow at 9:00 AM.',
      category: 'urgent',
      pinned: true,
      attachments: []
    },
    {
      id: 2,
      author: 'Super Admin',
      date: '2025-08-12 3:40 PM',
      text: 'The library will be closed next week.',
      category: 'info',
      pinned: false,
      attachments: ['library_schedule.pdf']
    }
  ]);
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;

    const newReport = {
      id: Date.now(),
      author: 'Super Admin',
      date: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      text: reportText,
      category: selectedCategory,
      pinned: false,
      attachments: file ? [file.name] : []
    };

    setReports([newReport, ...reports]);
    setReportText('');
    setFile(null);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const togglePin = (id) => {
    setReports(reports.map(report => 
      report.id === id ? { ...report, pinned: !report.pinned } : report
    ));
  };

  const filteredReports = reports
    .filter(report => 
      report.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.author.toLowerCase().includes(searchQuery.toLowerCase())
    .sort((a, b) => (a.pinned === b.pinned) ? 0 : a.pinned ? -1 : 1));

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'urgent': return <FiAlertTriangle className={styles.urgentIcon} />;
      case 'reminder': return <FiClock className={styles.reminderIcon} />;
      default: return <FiInfo className={styles.infoIcon} />;
    }
  };

  return (
    <div className={styles.container}>
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.title}
      >
        Communication Portal
      </motion.h1>

      {/* Report Submission Area */}
      <motion.div 
        className={styles.submissionArea}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className={styles.adminHeader}>
          <FaUserCircle className={styles.adminAvatar} />
          <span className={styles.adminName}>Super Admin</span>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.reportForm}>
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Write your report here..."
            className={styles.textArea}
            rows={5}
          />
          
          <div className={styles.formControls}>
            <div className={styles.fileUpload}>
              <label htmlFor="file-upload" className={styles.uploadButton}>
                <FiUpload /> Attach File
              </label>
              <input 
                id="file-upload" 
                type="file" 
                onChange={handleFileChange} 
                className={styles.fileInput}
              />
              {file && <span className={styles.fileName}>{file.name}</span>}
            </div>
            
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.categorySelect}
            >
              <option value="info">Information</option>
              <option value="reminder">Reminder</option>
              <option value="urgent">Urgent</option>
            </select>
            
            <button type="submit" className={styles.submitButton}>
              Publish Report
            </button>
          </div>
        </form>
      </motion.div>

      {/* Search & Filter */}
      <motion.div 
        className={styles.searchFilter}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className={styles.searchBar}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search in reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button className={styles.filterButton}>
          <FiFilter /> Filter
        </button>
      </motion.div>

      {/* Report History */}
      <motion.div 
        className={styles.reportHistory}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className={styles.historyTitle}>Report History</h2>
        
        <AnimatePresence>
          {filteredReports.length > 0 ? (
            <div className={styles.reportsList}>
              {filteredReports.map((report) => (
                <motion.div
                  key={report.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`${styles.reportCard} ${styles[report.category]} ${report.pinned ? styles.pinned : ''}`}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.authorInfo}>
                      <FaUserCircle className={styles.avatar} />
                      <div>
                        <span className={styles.authorName}>{report.author}</span>
                        <span className={styles.reportDate}>{report.date}</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button 
                        onClick={() => togglePin(report.id)} 
                        className={`${styles.pinButton} ${report.pinned ? styles.pinned : ''}`}
                      >
                      </button>
                      {getCategoryIcon(report.category)}
                    </div>
                  </div>
                  
                  <div className={styles.cardBody}>
                    <p className={styles.reportText}>{report.text}</p>
                    
                    {report.attachments.length > 0 && (
                      <div className={styles.attachments}>
                        {report.attachments.map((file, index) => (
                          <a key={index} href="#" className={styles.attachmentLink}>
                            <FiDownload /> {file}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={styles.emptyState}
            >
              No reports found matching your search.
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default CommunicationStudents;