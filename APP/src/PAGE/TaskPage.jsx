// TaskPage.jsx - Modern Task Dashboard Design
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiCheckCircle, FiClock, FiArrowRight, FiTarget, FiCalendar,
  FiSettings, FiUsers, FiUserPlus, FiBook, FiGrid, FiLayers, FiCpu
} from 'react-icons/fi';
import styles from './TaskPage.module.css';
import { useApp } from '../context/AppContext';

const TOTAL_TASKS = 7;

function TaskPage() {
  const { t } = useApp();
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('completedTasks') || '[]');
    setCompleted(stored);
    // No longer auto-redirect when all tasks completed - allow users to view/review tasks
  }, []);

  const progress = Math.round((completed.length / 7) * 100);

  const tasks = [
    { 
      id: 1, 
      title: "School Year Setup", 
      description: "Configure the academic year, terms, and basic school settings to get started.",
      icon: FiCalendar,
      time: "5-10 min"
    },
    { 
      id: 2, 
      title: "Create Student Registration Form", 
      description: "Design and set up classes with custom fields for student registration.",
      icon: FiUsers,
      time: "10-15 min"
    },
    { 
      id: 3, 
      title: "Create Staff Registration Form", 
      description: "Configure staff types and custom fields for staff registration system.",
      icon: FiUserPlus,
      time: "10-15 min"
    },
    { 
      id: 4, 
      title: "Add Staff Members", 
      description: "Register staff members using the forms you've created.",
      icon: FiUserPlus,
      time: "15-20 min"
    },
    { 
      id: 5, 
      title: "Configure Subjects & Classes", 
      description: "Set up subjects and map them to appropriate classes.",
      icon: FiBook,
      time: "10-15 min"
    },
    { 
      id: 6, 
      title: "Teacher-Class-Subject Mapping", 
      description: "Assign teachers to their classes and subjects for scheduling.",
      icon: FiGrid,
      time: "15-20 min"
    },
    { 
      id: 7, 
      title: "Schedule Configuration", 
      description: "Configure schedule settings and generate timetables automatically.",
      icon: FiCpu,
      time: "20-30 min"
    },
  ];

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
            <FiTarget />
          </div>
          <div className={styles.headerTitle}>
            <h1>Setup Tasks</h1>
            <p>Complete these tasks to set up your school management system</p>
          </div>
        </div>
      </motion.div>

      {/* Progress Section */}
      <motion.div 
        className={styles.progressSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className={styles.progressHeader}>
          <div className={styles.progressTitle}>
            <FiLayers /> {t('overallProgress')}
          </div>
          <div className={styles.progressStats}>
            <div className={styles.progressStat}>
              <span className={styles.progressStatNum}>{completed.length}</span>
              <span className={styles.progressStatLabel}>{t('completed')}</span>
            </div>
            <div className={styles.progressStat}>
              <span className={styles.progressStatNum}>{7 - completed.length}</span>
              <span className={styles.progressStatLabel}>{t('pending')}</span>
            </div>
          </div>
        </div>
        <div className={styles.progressBarContainer}>
          <motion.div 
            className={styles.progressBar}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <span className={styles.progressPercent}>{progress}%</span>
        </div>
      </motion.div>

      {/* Task Grid */}
      <div className={styles.taskGrid}>
        {tasks.map((task, index) => {
          const isCompleted = completed.includes(task.id);
          const Icon = task.icon;
          
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Link to={`/tasks/${task.id}`} className={styles.taskLink}>
                <div className={`${styles.taskCard} ${isCompleted ? styles.completed : ''}`}>
                  <div className={styles.taskHeader}>
                    <div className={styles.taskNumber}>
                      {isCompleted ? <FiCheckCircle /> : task.id}
                    </div>
                    <div className={`${styles.taskStatus} ${isCompleted ? styles.statusCompleted : styles.statusPending}`}>
                      {isCompleted ? (
                        <><FiCheckCircle /> {t('taskCompleted')}</>
                      ) : (
                        <><FiClock /> {t('taskPending')}</>
                      )}
                    </div>
                  </div>
                  
                  <h3 className={styles.taskTitle}>{task.title}</h3>
                  <p className={styles.taskDescription}>{task.description}</p>
                  
                  <div className={styles.taskFooter}>
                    <div className={styles.taskMeta}>
                      <FiClock /> {task.time}
                    </div>
                    <div className={styles.taskAction}>
                      {isCompleted ? 'Review' : 'Start'} <FiArrowRight />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default TaskPage;
