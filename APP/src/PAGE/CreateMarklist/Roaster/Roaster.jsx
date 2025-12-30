import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit2, FiPrinter, FiDownload, FiCalendar, FiUser, FiHome, FiBook } from 'react-icons/fi';
import { FaChalkboardTeacher, FaSchool } from 'react-icons/fa';
import styles from './Roaster.module.css';

// Constants declared outside component to avoid re-initialization
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIME_SLOTS = ['8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00'];
const CLASSES = ['Grade 7A', 'Grade 7B', 'Grade 8A', 'Grade 8B'];
const TEACHERS = ['Mr. Bekele', 'Ms. Johnson', 'Mr. Smith', 'Ms. Lee'];
const ROOMS = ['Room 101', 'Room 102', 'Lab 1', 'Gym'];
const SUBJECTS = [
  { name: 'Math', emoji: '🧮', color: '#FF9E80' },
  { name: 'English', emoji: '📝', color: '#81D4FA' },
  { name: 'Physics', emoji: '⚗️', color: '#CE93D8' },
  { name: 'History', emoji: '📜', color: '#A5D6A7' },
  { name: 'Biology', emoji: '🧬', color: '#80CBC4' },
  { name: 'PE', emoji: '🏃‍♂️', color: '#FFCC80' },
  { name: 'Geography', emoji: '🌍', color: '#B39DDB' },
  { name: 'Chemistry', emoji: '🧪', color: '#F48FB1' },
  { name: 'ICT', emoji: '💻', color: '#90CAF9' },
];

// Helper functions declared outside component
function getCurrentWeek() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4); // Friday
  
  return {
    start: startOfWeek.toLocaleDateString(),
    end: endOfWeek.toLocaleDateString()
  };
}

function generateSampleSchedule() {
  const schedule = {};
  DAYS.forEach(day => {
    schedule[day] = {};
    TIME_SLOTS.forEach((slot) => {
      // Randomly assign some subjects with 70% probability
      if (Math.random() > 0.3) {
        const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
        const teacher = TEACHERS[Math.floor(Math.random() * TEACHERS.length)];
        const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
        
        schedule[day][slot] = {
          subject,
          teacher,
          room,
          isEmpty: false
        };
      } else {
        schedule[day][slot] = { isEmpty: true };
      }
    });
  });
  return schedule;
}

function getPreviousWeek() {
  const prevWeek = new Date();
  prevWeek.setDate(prevWeek.getDate() - 7);
  return getCurrentWeek(prevWeek);
}

function getNextWeek() {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return getCurrentWeek(nextWeek);
}

const Roaster = () => {
  // State for view modes and filters
  const [viewMode, setViewMode] = useState('class');
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [notification, setNotification] = useState(null);

  // Sample schedule data
  const [schedule, setSchedule] = useState(() => {
    const initialSchedule = {};
    CLASSES.forEach(cls => {
      initialSchedule[cls] = generateSampleSchedule();
    });
    return initialSchedule;
  });

  // Handle slot click
  const handleSlotClick = (day, time) => {
    if (editMode) {
      setCurrentSlot({ day, time });
      setShowEditModal(true);
    }
  };

  // Save edited slot
  const handleSaveSlot = (newData) => {
    const updatedSchedule = { ...schedule };
    updatedSchedule[selectedClass][currentSlot.day][currentSlot.time] = newData;
    setSchedule(updatedSchedule);
    setShowEditModal(false);
    showNotification('Schedule updated successfully!');
  };

  // Show notification
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  // Calculate teaching hours per teacher
  const calculateTeachingHours = () => {
    const hours = {};
    TEACHERS.forEach(teacher => hours[teacher] = 0);
    
    Object.values(schedule[selectedClass]).forEach(day => {
      Object.values(day).forEach(slot => {
        if (!slot.isEmpty && slot.teacher) {
          hours[slot.teacher] += 1;
        }
      });
    });
    
    return hours;
  };

  // Toggle admin mode
  const toggleAdminMode = () => {
    setIsAdmin(!isAdmin);
    showNotification(isAdmin ? 'Admin mode disabled' : 'Admin mode enabled');
  };

  return (
    <div className={styles.roasterContainer}>
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={styles.notification}
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          <FaChalkboardTeacher className={styles.titleIcon} />
          Class Schedule Roaster
        </h1>
        
        <div className={styles.adminToggle} onClick={toggleAdminMode}>
          <FiUser className={styles.adminIcon} />
          {isAdmin ? 'Admin Mode' : 'View Mode'}
        </div>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="viewMode">
            <FaSchool className={styles.filterIcon} />
            View Mode:
          </label>
          <select 
            id="viewMode" 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)}
            className={styles.select}
          >
            <option value="class">Class-wise</option>
            <option value="teacher">Teacher-wise</option>
            <option value="room">Room-wise</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="class">
            <FiBook className={styles.filterIcon} />
            Class:
          </label>
          <select 
            id="class" 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className={styles.select}
          >
            {CLASSES.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="week">
            <FiCalendar className={styles.filterIcon} />
            Week:
          </label>
          <div className={styles.weekDisplay}>
            {selectedWeek.start} to {selectedWeek.end}
          </div>
          <button 
            className={styles.weekNavButton}
            onClick={() => setSelectedWeek(getPreviousWeek())}
          >
            &lt;
          </button>
          <button 
            className={styles.weekNavButton}
            onClick={() => setSelectedWeek(getNextWeek())}
          >
            &gt;
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {isAdmin && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`${styles.actionButton} ${editMode ? styles.activeEdit : ''}`}
            onClick={() => setEditMode(!editMode)}
          >
            <FiEdit2 className={styles.actionIcon} />
            {editMode ? 'Editing...' : 'Edit Roaster'}
          </motion.button>
        )}
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={styles.actionButton}
          onClick={() => window.print()}
        >
          <FiPrinter className={styles.actionIcon} />
          Print
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={styles.actionButton}
          onClick={() => alert('PDF download would be implemented here')}
        >
          <FiDownload className={styles.actionIcon} />
          Download PDF
        </motion.button>
      </div>

      {/* Teaching Hours Summary */}
      <div className={styles.summary}>
        <h3>Teaching Hours This Week:</h3>
        <div className={styles.hoursGrid}>
          {Object.entries(calculateTeachingHours()).map(([teacher, hours]) => (
            <div key={teacher} className={styles.hourItem}>
              <span className={styles.teacherName}>{teacher}:</span>
              <span className={styles.hourCount}>{hours} hours</span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Grid */}
      <div className={styles.scheduleContainer}>
        <div className={styles.scheduleGrid}>
          {/* Header row */}
          <div className={`${styles.gridCell} ${styles.timeHeader}`}>Time</div>
          {DAYS.map(day => (
            <div key={day} className={`${styles.gridCell} ${styles.dayHeader}`}>
              {day}
            </div>
          ))}

          {/* Time slots */}
          {TIME_SLOTS.map(time => (
            <React.Fragment key={time}>
              <div className={`${styles.gridCell} ${styles.timeSlot}`}>
                {time}
              </div>
              
              {DAYS.map(day => {
                const slotData = schedule[selectedClass][day]?.[time] || { isEmpty: true };
                
                return (
                  <motion.div
                    key={`${day}-${time}`}
                    whileHover={{ scale: 1.02, zIndex: 1 }}
                    className={`${styles.gridCell} ${styles.scheduleSlot} ${
                      slotData.isEmpty ? styles.emptySlot : ''
                    }`}
                    style={{
                      backgroundColor: slotData.subject?.color || 'transparent',
                      cursor: editMode ? 'pointer' : 'default'
                    }}
                    onClick={() => handleSlotClick(day, time)}
                  >
                    {!slotData.isEmpty && (
                      <div className={styles.slotContent}>
                        <div className={styles.subject}>
                          {slotData.subject.emoji} {slotData.subject.name}
                        </div>
                        <div className={styles.teacher}>{slotData.teacher}</div>
                        <div className={styles.room}>
                          <FiHome className={styles.roomIcon} /> {slotData.room}
                        </div>
                      </div>
                    )}
                    {slotData.isEmpty && (
                      <div className={styles.emptyContent}>-</div>
                    )}
                    {editMode && (
                      <div className={styles.editOverlay}>
                        <FiEdit2 className={styles.editIcon} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modalOverlay}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Edit Schedule Slot</h3>
              <p>
                {currentSlot.day}, {currentSlot.time} - {selectedClass}
              </p>
              
              <div className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label>Subject:</label>
                  <select className={styles.modalSelect}>
                    <option value="">Select Subject</option>
                    {SUBJECTS.map(subj => (
                      <option key={subj.name} value={subj.name}>
                        {subj.emoji} {subj.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Teacher:</label>
                  <select className={styles.modalSelect}>
                    <option value="">Select Teacher</option>
                    {TEACHERS.map(teacher => (
                      <option key={teacher} value={teacher}>{teacher}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Room:</label>
                  <select className={styles.modalSelect}>
                    <option value="">Select Room</option>
                    {ROOMS.map(room => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.modalButtons}>
                  <button 
                    className={styles.cancelButton}
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.saveButton}
                    onClick={() => {
                      handleSaveSlot({
                        subject: SUBJECTS[0],
                        teacher: TEACHERS[0],
                        room: ROOMS[0],
                        isEmpty: false
                      });
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Roaster;