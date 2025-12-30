import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiCalendar, FiBook, FiAward, FiLogOut, FiEdit2 } from 'react-icons/fi';
import { FaGraduationCap, FaIdCard, FaChartLine } from 'react-icons/fa';
import styles from './ProfileStudents.module.css';

const ProfileStudents = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [studentData, setStudentData] = useState({
    name: 'Ibrahim Kamil',
    grade: '10',
    section: 'A',
    studentId: '12345',
    email: 'ibrahim@example.com',
    phone: '+251 912345678',
    dob: '14 Aug 2007',
    gpa: '3.8',
    attendance: '95%',
    subjects: [
      { name: 'Mathematics', score: '90%' },
      { name: 'English', score: '85%' },
      { name: 'Physics', score: '88%' },
      { name: 'Chemistry', score: '82%' },
      { name: 'Biology', score: '91%' },
    ],
    achievements: ['Top Performer', 'Perfect Attendance', 'Science Fair Winner']
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren"
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
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.logoutButton}>
          <FiLogOut size={18} /> Logout
        </button>
      </div>

      <motion.div 
        className={styles.profileContainer}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Profile Header */}
        <motion.div className={styles.profileHeader} variants={itemVariants}>
          <div className={styles.avatarContainer}>
            <motion.div 
              className={styles.avatar}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <FiUser size={48} />
            </motion.div>
            <button 
              className={styles.editAvatarButton}
              onClick={() => setIsEditing(!isEditing)}
            >
              <FiEdit2 size={14} />
            </button>
          </div>
          <div className={styles.profileInfo}>
            <h1>{studentData.name}</h1>
            <div className={styles.metaInfo}>
              <span><FaGraduationCap /> Grade {studentData.grade}</span>
              <span>Section {studentData.section}</span>
              <span><FaIdCard /> ID: {studentData.studentId}</span>
            </div>
          </div>
        </motion.div>

        {/* Basic Information */}
        <motion.div className={styles.card} variants={itemVariants}>
          <div className={styles.cardHeader}>
            <h2>Basic Information</h2>
            <button 
              className={styles.editButton}
              onClick={() => setIsEditing(!isEditing)}
            >
              <FiEdit2 size={16} /> {isEditing ? 'Save' : 'Edit'}
            </button>
          </div>
          <div className={styles.cardContent}>
            {isEditing ? (
              <div className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label><FiMail /> Email</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={studentData.email} 
                    onChange={handleInputChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label><FiPhone /> Phone</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    value={studentData.phone} 
                    onChange={handleInputChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label><FiCalendar /> Date of Birth</label>
                  <input 
                    type="text" 
                    name="dob" 
                    value={studentData.dob} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            ) : (
              <ul className={styles.infoList}>
                <li><FiMail /> <span>Email:</span> {studentData.email}</li>
                <li><FiPhone /> <span>Phone:</span> {studentData.phone}</li>
                <li><FiCalendar /> <span>Date of Birth:</span> {studentData.dob}</li>
              </ul>
            )}
          </div>
        </motion.div>

        {/* Academic Information */}
        <motion.div className={styles.card} variants={itemVariants}>
          <div className={styles.cardHeader}>
            <h2><FiBook /> Academic Information</h2>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.academicStats}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{studentData.gpa}</div>
                <div className={styles.statLabel}>GPA</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{studentData.attendance}</div>
                <div className={styles.statLabel}>Attendance</div>
              </div>
            </div>
            
            <h3 className={styles.subheader}><FaChartLine /> Recent Marks</h3>
            <div className={styles.subjectsGrid}>
              {studentData.subjects.map((subject, index) => (
                <motion.div 
                  key={index}
                  className={styles.subjectCard}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className={styles.subjectName}>{subject.name}</div>
                  <div className={styles.subjectScore}>{subject.score}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Achievements */}
        {studentData.achievements.length > 0 && (
          <motion.div className={styles.card} variants={itemVariants}>
            <div className={styles.cardHeader}>
              <h2><FiAward /> Achievements</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.achievementsList}>
                {studentData.achievements.map((achievement, index) => (
                  <motion.div 
                    key={index}
                    className={styles.achievementBadge}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {achievement}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ProfileStudents;