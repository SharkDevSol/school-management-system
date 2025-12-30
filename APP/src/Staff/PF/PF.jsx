import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUserEdit, FaQrcode, FaPhone, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaChalkboardTeacher, FaGraduationCap, FaCertificate, FaIdCard, FaLock } from 'react-icons/fa';
import { FiEdit, FiClock, FiAward } from 'react-icons/fi';
import styles from './PF.module.css';

const PF = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  
  // Sample staff data
  const staffData = {
    name: "Ahmed Musa",
    position: "Math Teacher",
    department: "Mathematics",
    status: "active",
    staffId: "TCH-1023",
    dob: "12 March 1985",
    gender: "Male",
    phone: "+251 911 234 567",
    email: "ahmed.musa@school.com",
    address: "Dire Dawa, Ethiopia",
    hireDate: "01 September 2020",
    yearsOfService: "5 years",
    currentGrade: "Grade 9 & Grade 10",
    subjects: "Mathematics, Physics",
    qualification: "BSc in Mathematics",
    experience: "10+ Years Teaching",
    certifications: "Teaching License, STEM Training",
    qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Staff:TCH-1023"
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'work', label: 'Work Details' },
    { id: 'documents', label: 'Documents' },
    { id: 'password', label: 'Change Password' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <motion.div 
      className={styles.profileContainer}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Cover Photo Section */}
      <div className={styles.coverPhoto}>
        <div className={styles.profileActions}>
          <motion.button 
            className={styles.editButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsEditing(!isEditing)}
          >
            <FaUserEdit /> {isEditing ? 'Cancel Editing' : 'Edit Profile'}
          </motion.button>
          <motion.div 
            className={styles.qrCode}
            whileHover={{ scale: 1.1 }}
          >
            <img src={staffData.qrCode} alt="QR Code" />
            <FaQrcode className={styles.qrIcon} />
          </motion.div>
        </div>
      </div>

      {/* Profile Header */}
      <motion.div className={styles.profileHeader} variants={itemVariants}>
        <div className={styles.profilePicture}>
          <div className={styles.pictureWrapper}>
            <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Profile" />
            {isEditing && (
              <div className={styles.editPictureOverlay}>
                <FiEdit />
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.profileInfo}>
          <h1>{staffData.name}</h1>
          <div className={styles.positionBadge}>
            {staffData.position}
          </div>
          <div className={styles.department}>
            {staffData.department} Department
          </div>
          <div className={`${styles.status} ${staffData.status === 'active' ? styles.active : styles.inactive}`}>
            {staffData.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
          </div>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div className={styles.tabs} variants={itemVariants}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <motion.div className={styles.tabContent} variants={itemVariants}>
        {activeTab === 'personal' && (
          <div className={styles.infoSection}>
            <h2><FaIdCard /> Personal Information</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Full Name</span>
                <span className={styles.infoValue}>{staffData.name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Staff ID</span>
                <span className={styles.infoValue}>{staffData.staffId}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Date of Birth</span>
                <span className={styles.infoValue}><FaCalendarAlt /> {staffData.dob}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Gender</span>
                <span className={styles.infoValue}>{staffData.gender}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Phone Number</span>
                <span className={styles.infoValue}><FaPhone /> {staffData.phone}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email Address</span>
                <span className={styles.infoValue}><FaEnvelope /> {staffData.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Address</span>
                <span className={styles.infoValue}><FaMapMarkerAlt /> {staffData.address}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'work' && (
          <div className={styles.infoSection}>
            <h2><FaChalkboardTeacher /> Work & Academic Details</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Hire Date</span>
                <span className={styles.infoValue}><FaCalendarAlt /> {staffData.hireDate}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Years of Service</span>
                <span className={styles.infoValue}><FiClock /> {staffData.yearsOfService}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Current Grade Teaching</span>
                <span className={styles.infoValue}>{staffData.currentGrade}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Subjects</span>
                <span className={styles.infoValue}>{staffData.subjects}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Qualification</span>
                <span className={styles.infoValue}><FaGraduationCap /> {staffData.qualification}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Experience</span>
                <span className={styles.infoValue}>{staffData.experience}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Certifications</span>
                <span className={styles.infoValue}><FaCertificate /> {staffData.certifications}</span>
              </div>
            </div>

            <h2 className={styles.timelineHeader}><FiAward /> Activity Timeline</h2>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <h3>Joined School</h3>
                  <p>September 2020</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <h3>Completed STEM Training</h3>
                  <p>March 2022</p>
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <h3>Teacher of the Month</h3>
                  <p>November 2023</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className={styles.documentsSection}>
            <h2>Documents</h2>
            <div className={styles.documentCards}>
              <motion.div 
                className={styles.documentCard}
                whileHover={{ y: -5 }}
              >
                <FaCertificate className={styles.documentIcon} />
                <h3>Teaching License</h3>
                <p>Uploaded: 15 Jan 2020</p>
                <button className={styles.downloadButton}>Download</button>
              </motion.div>
              <motion.div 
                className={styles.documentCard}
                whileHover={{ y: -5 }}
              >
                <FaGraduationCap className={styles.documentIcon} />
                <h3>Degree Certificate</h3>
                <p>Uploaded: 20 Aug 2019</p>
                <button className={styles.downloadButton}>Download</button>
              </motion.div>
              <motion.div 
                className={styles.documentCard}
                whileHover={{ y: -5 }}
              >
                <FaIdCard className={styles.documentIcon} />
                <h3>ID Copy</h3>
                <p>Uploaded: 10 Sep 2020</p>
                <button className={styles.downloadButton}>Download</button>
              </motion.div>
              <motion.div 
                className={styles.documentCard}
                whileHover={{ y: -5 }}
              >
                <div className={styles.uploadArea}>
                  <FiEdit className={styles.uploadIcon} />
                  <p>Upload New Document</p>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className={styles.passwordSection}>
            <h2><FaLock /> Change Password</h2>
            <form className={styles.passwordForm}>
              <div className={styles.formGroup}>
                <label>Current Password</label>
                <input type="password" placeholder="Enter current password" />
              </div>
              <div className={styles.formGroup}>
                <label>New Password</label>
                <input type="password" placeholder="Enter new password" />
              </div>
              <div className={styles.formGroup}>
                <label>Confirm New Password</label>
                <input type="password" placeholder="Confirm new password" />
              </div>
              <motion.button 
                className={styles.saveButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Update Password
              </motion.button>
            </form>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PF;