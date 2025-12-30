import React, { useState, useEffect } from 'react';
import styles from './Counsellor.module.css';
import { FiSearch, FiCalendar, FiUser, FiBook, FiPrinter, FiDownload, FiPlus } from 'react-icons/fi';
import { FaChalkboardTeacher, FaRegCalendarAlt, FaRegStickyNote } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const Counsellor = () => {
  // Sample student data
  const [students, setStudents] = useState([
    { id: 1, name: 'Hana Ali', class: '7A', issueType: 'Academic Stress', status: 'In Progress', lastVisit: 'Jul 25', notes: ['Low confidence in math', 'Plan: Daily study + weekly feedback'] },
    { id: 2, name: 'Abdisa K.', class: '8B', issueType: 'Behavioral', status: 'Resolved', lastVisit: 'Jul 20', notes: ['Classroom disruptions', 'Improved after parent meeting'] },
    { id: 3, name: 'Fikadu J.', class: '9B', issueType: 'Social', status: 'Follow-Up', lastVisit: 'Jul 28', notes: ['Peer relationship issues', 'Group activities planned'] },
    { id: 4, name: 'Liya T.', class: '6C', issueType: 'Personal', status: 'New', lastVisit: 'Aug 1', notes: ['Family situation affecting studies'] },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssue, setSelectedIssue] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [appointments, setAppointments] = useState([
    { id: 1, studentId: 1, studentName: 'Hana Ali', date: 'Aug 5', time: '10:00 AM', location: 'Office A', mode: 'In-person' },
    { id: 2, studentId: 3, studentName: 'Fikadu J.', date: 'Aug 6', time: '11:30 AM', location: 'Online', mode: 'Online' },
  ]);
  const [newAppointment, setNewAppointment] = useState({
    studentId: '',
    date: '',
    time: '',
    location: '',
    mode: 'In-person',
    reminder: true
  });

  // Filter students based on search and filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.class.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIssue = selectedIssue === 'All' || student.issueType.includes(selectedIssue);
    const matchesStatus = selectedStatus === 'All' || student.status === selectedStatus;
    return matchesSearch && matchesIssue && matchesStatus;
  });

  // Stats calculation
  const totalStudents = students.length;
  const newThisWeek = students.filter(s => s.lastVisit >= 'Jul 30').length;
  const appointmentsToday = appointments.filter(a => a.date === 'Aug 5').length;
  const followUpsDue = students.filter(s => s.status === 'Follow-Up').length;

  // Add new note to student
  const addNote = () => {
    if (newNote.trim() && selectedStudent) {
      const updatedStudents = students.map(student => {
        if (student.id === selectedStudent.id) {
          return { ...student, notes: [...student.notes, newNote] };
        }
        return student;
      });
      setStudents(updatedStudents);
      setNewNote('');
    }
  };

  // Add new appointment
  const addAppointment = () => {
    if (newAppointment.studentId && newAppointment.date && newAppointment.time) {
      const student = students.find(s => s.id === parseInt(newAppointment.studentId));
      const newAppt = {
        id: appointments.length + 1,
        studentId: parseInt(newAppointment.studentId),
        studentName: student.name,
        date: newAppointment.date,
        time: newAppointment.time,
        location: newAppointment.location,
        mode: newAppointment.mode
      };
      setAppointments([...appointments, newAppt]);
      setNewAppointment({
        studentId: '',
        date: '',
        time: '',
        location: '',
        mode: 'In-person',
        reminder: true
      });
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <motion.header 
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.title}>
          <FaChalkboardTeacher className={styles.icon} />
          <h1>Student Counseling Dashboard</h1>
        </div>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span>Total Students</span>
            <strong>{totalStudents}</strong>
          </div>
          <div className={styles.statCard}>
            <span>New This Week</span>
            <strong>{newThisWeek}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Today's Appointments</span>
            <strong>{appointmentsToday}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Follow-Ups Due</span>
            <strong>{followUpsDue}</strong>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Left Column - Student List */}
        <motion.div 
          className={styles.studentSection}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className={styles.controls}>
            <div className={styles.search}>
              <FiSearch className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search student or class..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              value={selectedIssue} 
              onChange={(e) => setSelectedIssue(e.target.value)}
              className={styles.filter}
            >
              <option value="All">All Issues</option>
              <option value="Academic">Academic</option>
              <option value="Behavioral">Behavioral</option>
              <option value="Social">Social</option>
              <option value="Personal">Personal</option>
            </select>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={styles.filter}
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Follow-Up">Follow-Up</option>
            </select>
          </div>

          <div className={styles.studentTable}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Issue Type</th>
                  <th>Status</th>
                  <th>Last Visit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <motion.tr 
                    key={student.id}
                    whileHover={{ backgroundColor: 'rgba(255, 165, 0, 0.1)' }}
                    onClick={() => setSelectedStudent(student)}
                    className={`${styles.studentRow} ${selectedStudent?.id === student.id ? styles.selected : ''}`}
                  >
                    <td>{student.name}</td>
                    <td>{student.class}</td>
                    <td>
                      <span className={`${styles.issueTag} ${styles[student.issueType.replace(' ', '')]}`}>
                        {student.issueType}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.status} ${styles[student.status.replace('-', '')]}`}>
                        {student.status}
                      </span>
                    </td>
                    <td>{student.lastVisit}</td>
                    <td>
                      <button 
                        className={styles.viewButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudent(student);
                        }}
                      >
                        View <FiPlus className={styles.buttonIcon} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Right Column - Details */}
        <motion.div 
          className={styles.detailSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {selectedStudent ? (
            <AnimatePresence>
              <motion.div
                key={selectedStudent.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.studentHeader}>
                  <h2>
                    <FiUser className={styles.detailIcon} /> 
                    {selectedStudent.name} - {selectedStudent.class}
                  </h2>
                  <div className={styles.studentMeta}>
                    <span className={`${styles.issueTag} ${styles[selectedStudent.issueType.replace(' ', '')]}`}>
                      {selectedStudent.issueType}
                    </span>
                    <span className={`${styles.status} ${styles[selectedStudent.status.replace('-', '')]}`}>
                      {selectedStudent.status}
                    </span>
                    <span>Last Visit: {selectedStudent.lastVisit}</span>
                  </div>
                </div>

                <div className={styles.tabs}>
                  <button className={styles.activeTab}>Notes</button>
                  <button>History</button>
                  <button>Documents</button>
                </div>

                <div className={styles.notesSection}>
                  <h3>
                    <FaRegStickyNote className={styles.detailIcon} /> 
                    Counseling Notes
                  </h3>
                  <div className={styles.notesList}>
                    {selectedStudent.notes.map((note, index) => (
                      <div key={index} className={styles.note}>
                        <div className={styles.noteDate}>{selectedStudent.lastVisit}</div>
                        <p>{note}</p>
                      </div>
                    ))}
                  </div>
                  <div className={styles.addNote}>
                    <textarea 
                      placeholder="Add new note..." 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                    <button onClick={addNote} className={styles.primaryButton}>
                      Save Note
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className={styles.emptyState}>
              <FiUser className={styles.emptyIcon} />
              <p>Select a student to view details</p>
            </div>
          )}

          <div className={styles.appointmentsSection}>
            <h3>
              <FaRegCalendarAlt className={styles.detailIcon} /> 
              Upcoming Appointments
            </h3>
            <div className={styles.appointmentsList}>
              {appointments.map(appointment => (
                <div key={appointment.id} className={styles.appointment}>
                  <div className={styles.appointmentDate}>
                    <strong>{appointment.date}</strong> @ {appointment.time}
                  </div>
                  <div className={styles.appointmentDetails}>
                    <span>{appointment.studentName}</span>
                    <span className={styles.appointmentMode}>{appointment.mode}</span>
                    {appointment.location && <span>{appointment.location}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.addAppointment}>
              <h4>Schedule New Appointment</h4>
              <div className={styles.formGroup}>
                <label>Student</label>
                <select 
                  value={newAppointment.studentId}
                  onChange={(e) => setNewAppointment({...newAppointment, studentId: e.target.value})}
                >
                  <option value="">Select student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>{student.name} ({student.class})</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Date</label>
                  <input 
                    type="date" 
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Time</label>
                  <input 
                    type="time" 
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Location</label>
                  <input 
                    type="text" 
                    placeholder="Office A, Online, etc."
                    value={newAppointment.location}
                    onChange={(e) => setNewAppointment({...newAppointment, location: e.target.value})}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Mode</label>
                  <select 
                    value={newAppointment.mode}
                    onChange={(e) => setNewAppointment({...newAppointment, mode: e.target.value})}
                  >
                    <option value="In-person">In-person</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>
                  <input 
                    type="checkbox" 
                    checked={newAppointment.reminder}
                    onChange={(e) => setNewAppointment({...newAppointment, reminder: e.target.checked})}
                  />
                  Send reminder notification
                </label>
              </div>
              <button onClick={addAppointment} className={styles.primaryButton}>
                Schedule Appointment
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Counsellor;