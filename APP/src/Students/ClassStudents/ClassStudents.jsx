import React, { useState } from "react";
import {
  FiSearch,
  FiDownload,
  FiUpload,
  FiClock,
  FiBookmark,
} from "react-icons/fi";
import { FaChalkboardTeacher } from "react-icons/fa";
import { motion } from "framer-motion";
import styles from "./ClassStudents.module.css";

const ClassStudents = () => {
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedSubject, setSelectedSubject] = useState("Math");
  const [searchQuery, setSearchQuery] = useState("");

  // Sample data
  const subjects = ["Math", "Physics", "English", "Chemistry", "Biology"];
  const teachers = {
    Math: { name: "Mr. Abdi Hope", avatar: <FaChalkboardTeacher /> },
    Physics: { name: "Ms. Sarah Smith", avatar: <FaChalkboardTeacher /> },
    English: { name: "Mr. James Wilson", avatar: <FaChalkboardTeacher /> },
  };

  const [allPosts, setAllPosts] = useState({
    Math: [
      {
        id: 1,
        title: "Chapter 5 Review",
        content:
          "Tomorrow we'll review Chapter 5 on quadratic equations. Please complete the practice problems before class.",
        date: "Aug 14, 09:15",
        attachments: [{ name: "Chapter5_Review.pdf", type: "pdf" }],
        isPinned: true,
        isNew: true,
      },
      {
        id: 2,
        title: "Practice Problems",
        content:
          "Here are some additional practice problems for algebra. We'll go over them next week.",
        date: "Aug 12, 15:30",
        attachments: [{ name: "Algebra_Practice.jpg", type: "image" }],
        isPinned: false,
        isNew: false,
      },
    ],
    Physics: [
      {
        id: 1,
        title: "Newton's Laws",
        content:
          "Read about Newton's Laws of Motion for next class. We'll be doing hands-on experiments to demonstrate each law.",
        date: "Aug 13, 10:00",
        attachments: [],
        isPinned: false,
        isNew: true,
      },
      {
        id: 2,
        title: "Lab Safety Reminder",
        content:
          "Remember to review the lab safety guidelines before tomorrow's experiment.",
        date: "Aug 11, 14:20",
        attachments: [{ name: "Lab_Safety.pdf", type: "pdf" }],
        isPinned: true,
        isNew: false,
      },
    ],
    English: [
      {
        id: 1,
        title: "Reading Assignment",
        content:
          'For next week, read chapters 3-5 of "To Kill a Mockingbird". Be prepared to discuss the themes and characters.',
        date: "Aug 15, 11:45",
        attachments: [{ name: "Reading_Guide.pdf", type: "pdf" }],
        isPinned: true,
        isNew: true,
      },
      {
        id: 2,
        title: "Essay Guidelines",
        content:
          "The essay on symbolism in literature is due next Friday. Here are the detailed guidelines and rubric.",
        date: "Aug 10, 13:10",
        attachments: [{ name: "Essay_Rubric.pdf", type: "pdf" }],
        isPinned: false,
        isNew: false,
      },
    ],
    Chemistry: [
      {
        id: 1,
        title: "Periodic Table Quiz",
        content:
          "There will be a quiz on the first 36 elements of the periodic table next Monday.",
        date: "Aug 14, 16:30",
        attachments: [{ name: "Periodic_Table.pdf", type: "pdf" }],
        isPinned: false,
        isNew: true,
      },
      {
        id: 2,
        title: "Lab Report Format",
        content:
          "All lab reports must follow the new format template. See attached example.",
        date: "Aug 9, 09:00",
        attachments: [{ name: "Lab_Report_Template.docx", type: "docx" }],
        isPinned: true,
        isNew: false,
      },
    ],
    Biology: [
      {
        id: 1,
        title: "Microscope Lab",
        content:
          "Bring your lab notebooks for tomorrow's microscope examination of plant cells.",
        date: "Aug 16, 08:45",
        attachments: [],
        isPinned: false,
        isNew: true,
      },
      {
        id: 2,
        title: "Midterm Study Guide",
        content:
          "The study guide for next week's midterm exam is now available.",
        date: "Aug 8, 15:15",
        attachments: [{ name: "Bio_Midterm_Guide.pdf", type: "pdf" }],
        isPinned: true,
        isNew: false,
      },
    ],
  });

  const [allAssignments, setAllAssignments] = useState({
    Math: [
      {
        id: 1,
        title: "Algebra Homework",
        description:
          "Complete all problems from chapter 4. Show your work for full credit.",
        dueDate: "Aug 20, 23:59",
        attachments: [{ name: "Homework_4.pdf", type: "pdf" }],
        isSubmitted: false,
        isNew: true,
      },
      {
        id: 2,
        title: "Quadratic Equations Quiz",
        description: "Online quiz covering material from chapters 1-3",
        dueDate: "Aug 15, 23:59",
        attachments: [],
        isSubmitted: true,
        isNew: false,
      },
    ],
    Physics: [
      {
        id: 1,
        title: "Motion Lab Report",
        description: "Write a lab report based on last week's experiment",
        dueDate: "Aug 18, 23:59",
        attachments: [{ name: "Lab_Guidelines.pdf", type: "pdf" }],
        isSubmitted: false,
        isNew: true,
      },
      {
        id: 2,
        title: "Newton's Laws Worksheet",
        description: "Complete the worksheet on Newton's three laws of motion",
        dueDate: "Aug 22, 23:59",
        attachments: [{ name: "Newtons_Laws.pdf", type: "pdf" }],
        isSubmitted: false,
        isNew: true,
      },
    ],
    English: [
      {
        id: 1,
        title: "Book Report - To Kill a Mockingbird",
        description:
          "Write a 3-page report analyzing the themes in Harper Lee's novel",
        dueDate: "Aug 25, 23:59",
        attachments: [{ name: "BookReport_Guidelines.pdf", type: "pdf" }],
        isSubmitted: false,
        isNew: true,
      },
      {
        id: 2,
        title: "Vocabulary Quiz",
        description: "Study the 20 vocabulary words from chapter 5",
        dueDate: "Aug 19, 23:59",
        attachments: [{ name: "Vocab_List.pdf", type: "pdf" }],
        isSubmitted: true,
        isNew: false,
      },
    ],
    Chemistry: [
      {
        id: 1,
        title: "Periodic Table Project",
        description: "Create a creative representation of the periodic table",
        dueDate: "Aug 28, 23:59",
        attachments: [{ name: "Project_Requirements.pdf", type: "pdf" }],
        isSubmitted: false,
        isNew: true,
      },
      {
        id: 2,
        title: "Chemical Equations Practice",
        description: "Balance 20 chemical equations from the textbook",
        dueDate: "Aug 21, 23:59",
        attachments: [],
        isSubmitted: false,
        isNew: true,
      },
    ],
    Biology: [
      {
        id: 1,
        title: "Cell Structure Lab",
        description: "Complete the lab report on cell structure observations",
        dueDate: "Aug 24, 23:59",
        attachments: [{ name: "Lab_Worksheet.pdf", type: "pdf" }],
        isSubmitted: false,
        isNew: true,
      },
      {
        id: 2,
        title: "Photosynthesis Quiz",
        description: "Multiple choice quiz on the photosynthesis process",
        dueDate: "Aug 17, 23:59",
        attachments: [],
        isSubmitted: true,
        isNew: false,
      },
    ],
  });

  const currentTeacher = teachers[selectedSubject] || {
    name: "Teacher Name",
    avatar: <FaChalkboardTeacher />,
  };

  const filteredPosts =
    allPosts[selectedSubject]?.filter(
      (post) =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const filteredAssignments =
    allAssignments[selectedSubject]?.filter(
      (assignment) =>
        assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const handleSubmitAssignment = (assignmentId) => {
    setAllAssignments((prev) => ({
      ...prev,
      [selectedSubject]: prev[selectedSubject].map((assignment) =>
        assignment.id === assignmentId
          ? { ...assignment, isSubmitted: true }
          : assignment
      ),
    }));
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Top Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.selectWrapper}>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className={styles.subjectSelect}
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.searchBar}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.sortOptions}>
          <select className={styles.sortSelect}>
            <option>Newest first</option>
            <option>Oldest first</option>
          </select>
        </div>
      </div>

      {/* Subject Header */}
      <div className={styles.subjectHeader}>
        <h1>{selectedSubject}</h1>
        <div className={styles.teacherInfo}>
          <span className={styles.teacherAvatar}>{currentTeacher.avatar}</span>
          <span>{currentTeacher.name}</span>
        </div>
        <p className={styles.subjectDescription}>
          Grade 10 {selectedSubject} – Semester 1
        </p>
      </div>

      {/* Content Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabButton} ${
              activeTab === "posts" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("posts")}
          >
            Posts
          </button>
          <button
            className={`${styles.tabButton} ${
              activeTab === "assignments" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("assignments")}
          >
            Assignments
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={styles.contentArea}>
        {activeTab === "posts" ? (
          <div className={styles.postsContainer}>
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <motion.div
                  key={post.id}
                  className={`${styles.postCard} ${
                    post.isNew ? styles.newPost : ""
                  } ${post.isPinned ? styles.pinnedPost : ""}`}
                  whileHover={{ scale: 1.01 }}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {post.isPinned && (
                    <div className={styles.pinnedBadge}>
                      <FiBookmark /> Pinned
                    </div>
                  )}
                  <div className={styles.postHeader}>
                    <div className={styles.postAvatar}>
                      {currentTeacher.avatar}
                    </div>
                    <div className={styles.postMeta}>
                      <span className={styles.postAuthor}>
                        {currentTeacher.name}
                      </span>
                      <span className={styles.postDate}>{post.date}</span>
                    </div>
                  </div>
                  <div className={styles.postContent}>
                    <h3>{post.title}</h3>
                    <p>{post.content}</p>
                  </div>
                  {post.attachments.length > 0 && (
                    <div className={styles.postAttachments}>
                      {post.attachments.map((file, index) => (
                        <a
                          key={index}
                          href="#"
                          className={styles.attachmentLink}
                        >
                          <FiDownload /> {file.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className={styles.postActions}>
                    <button className={styles.commentButton}>Comment</button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>No posts found for {selectedSubject}</p>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.assignmentsContainer}>
            {filteredAssignments.length > 0 ? (
              filteredAssignments.map((assignment) => (
                <motion.div
                  key={assignment.id}
                  className={`${styles.assignmentCard} ${
                    assignment.isNew ? styles.newAssignment : ""
                  }`}
                  whileHover={{ scale: 1.01 }}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.assignmentHeader}>
                    <h3>{assignment.title}</h3>
                    <div className={styles.dueDate}>
                      <FiClock /> Due: {assignment.dueDate}
                      {new Date(assignment.dueDate) < new Date() && (
                        <span className={styles.overdue}>Overdue</span>
                      )}
                    </div>
                  </div>
                  <p className={styles.assignmentDescription}>
                    {assignment.description}
                  </p>
                  {assignment.attachments.length > 0 && (
                    <div className={styles.assignmentAttachments}>
                      {assignment.attachments.map((file, index) => (
                        <a
                          key={index}
                          href="#"
                          className={styles.attachmentLink}
                        >
                          <FiDownload /> {file.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className={styles.assignmentActions}>
                    {assignment.isSubmitted ? (
                      <button className={styles.submittedButton}>
                        Submitted
                      </button>
                    ) : (
                      <button
                        className={styles.submitButton}
                        onClick={() => handleSubmitAssignment(assignment.id)}
                      >
                        <FiUpload /> Submit Assignment
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>No assignments found for {selectedSubject}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ClassStudents;
