import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiFile, FiSearch, FiFilter, FiDownload, FiClock, FiCheckCircle, FiAlertCircle, FiXCircle } from 'react-icons/fi';
import { FaRegEye } from 'react-icons/fa';
import styles from './COMSTA.module.css';

const COMSTA = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [attachment, setAttachment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const reports = [
    {
      id: 1,
      title: 'Broken Projector in Class 9A',
      date: '2025-03-14',
      time: '09:30 AM',
      status: 'seen',
      priority: 'high',
      message: 'The projector in Class 9A is not working properly. The image is flickering and colors are distorted. Needs immediate attention as it affects daily teaching.',
      attachment: 'projector_issue.jpg'
    },
    {
      id: 2,
      title: 'Missing Attendance Sheet',
      date: '2025-03-15',
      time: '11:45 AM',
      status: 'pending',
      priority: 'medium',
      message: 'The attendance sheet for March 10th is missing from the staff room. Please check if it was misplaced or collected by someone else.',
      attachment: null
    },
    {
      id: 3,
      title: 'Library Book Shortage',
      date: '2025-03-17',
      time: '15:10',
      status: 'resolved',
      priority: 'low',
      message: 'Several reference books for the Science department are missing from the library shelves. Students are having difficulty completing their assignments.',
      attachment: 'missing_books.pdf'
    },
  ];

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         report.date.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit logic would go here
    alert('Report submitted successfully!');
    setTitle('');
    setMessage('');
    setPriority('medium');
    setAttachment(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'seen': return <FiCheckCircle className={styles.seen} />;
      case 'pending': return <FiClock className={styles.pending} />;
      case 'resolved': return <FiCheckCircle className={styles.resolved} />;
      case 'rejected': return <FiXCircle className={styles.rejected} />;
      default: return <FiAlertCircle />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={styles.container}
    >
      <h1 className={styles.title}>Communication Staff</h1>
      
      {/* Send Report Section */}
      <motion.div 
        className={styles.sendReport}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2><FiSend /> Send Report to Super Admin</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Report Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Broken Projector in Class 9A"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="message">Report Message</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detailed explanation of the problem or issue"
              required
              rows={5}
            />
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="priority">Priority Level</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="attachment">
                <FiFile /> Attachment (Optional)
              </label>
              <input
                type="file"
                id="attachment"
                onChange={(e) => setAttachment(e.target.files[0])}
                accept="image/*,.pdf,.doc,.docx"
              />
            </div>
          </div>
          
          <motion.button
            type="submit"
            className={`${styles.submitButton} ${styles[priority]}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiSend /> Send to Super Admin
          </motion.button>
        </form>
      </motion.div>
      
      {/* Report History Section */}
      <motion.div 
        className={styles.reportHistory}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className={styles.historyHeader}>
          <h2><FiClock /> Report History</h2>
          <div className={styles.controls}>
            <div className={styles.searchBox}>
              <FiSearch />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="seen">Seen</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className={styles.exportButton}>
              <FiDownload /> Export
            </button>
          </div>
        </div>
        
        <div className={styles.responsiveTable}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Report Title</th>
                <th>Date</th>
                <th>Time</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report, index) => (
                <motion.tr
                  key={report.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td>{index + 1}</td>
                  <td>{report.title}</td>
                  <td>{report.date}</td>
                  <td>{report.time}</td>
                  <td>
                    <span className={`${styles.priorityBadge} ${styles[report.priority]}`}>
                      {report.priority}
                    </span>
                  </td>
                  <td>
                    <span className={styles.statusCell}>
                      {getStatusIcon(report.status)}
                      <span className={styles[report.status]}>{report.status}</span>
                    </span>
                  </td>
                  <td>
                    <button className={styles.viewButton}>
                      <FaRegEye /> View
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default COMSTA;