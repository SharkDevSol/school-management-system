import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBook, FiHome, FiEdit, FiClock, FiSearch, FiUpload, FiCalendar, FiX } from 'react-icons/fi';
import { FaChalkboardTeacher } from 'react-icons/fa';
import styles from './POSTS.module.css';

const POSTS = () => {
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPost, setNewPost] = useState({
    type: 'post',
    title: '',
    content: '',
    subject: '',
    grade: '',
    deadline: '',
    visibility: 'all',
    attachments: []
  });
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);

  const posts = [
    {
      id: 1,
      type: 'assignment',
      title: 'Algebra Final Project',
      content: 'Complete the algebraic equations worksheet and submit before deadline.',
      teacher: 'Mr. Johnson',
      subject: 'Math',
      grade: 'Grade 10',
      date: '2023-06-15',
      deadline: '2023-06-30',
      attachments: ['worksheet.pdf']
    },
    {
      id: 2,
      type: 'homework',
      title: 'Reading Comprehension',
      content: 'Read chapter 5 and answer the questions at the end.',
      teacher: 'Ms. Smith',
      subject: 'English',
      grade: 'Grade 9',
      date: '2023-06-14',
      deadline: '2023-06-17',
      attachments: ['chapter5.pdf']
    },
    {
      id: 3,
      type: 'post',
      title: 'Field Trip Announcement',
      content: 'We will be visiting the science museum next Friday. Permission slips due Wednesday.',
      teacher: 'Admin',
      subject: 'General',
      grade: 'All',
      date: '2023-06-10',
      attachments: ['permission_slip.pdf', 'museum_info.jpg']
    }
  ];

  const postTypes = [
    { id: 'posts', label: 'Posts', icon: <FiEdit /> },
    { id: 'assignments', label: 'Assignments', icon: <FiBook /> },
    { id: 'homework', label: 'Homework', icon: <FiHome /> }
  ];

  const grades = ['All', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const subjects = ['Math', 'English', 'Science', 'History', 'Art', 'General'];

  const filteredPosts = posts.filter(post => {
    const matchesGrade = !selectedGrade || post.grade === selectedGrade || selectedGrade === 'All';
    const matchesSubject = !selectedSubject || post.subject === selectedSubject || selectedSubject === 'All';
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activeTab === 'posts' || post.type === activeTab;
    
    return matchesGrade && matchesSubject && matchesSearch && matchesType;
  });

  const getPostTypeColor = (type) => {
    switch(type) {
      case 'assignment': return '#FF7B25';
      case 'homework': return '#4CAF50';
      default: return '#2196F3';
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const daysUntilDeadline = (deadline) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPost(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map(file => ({
      name: file.name,
      type: file.type.split('/')[0],
      size: file.size
    }));
    
    setAttachmentPreviews(previews);
    setNewPost(prev => ({
      ...prev,
      attachments: files
    }));
  };

  const removeAttachment = (index) => {
    const updatedPreviews = [...attachmentPreviews];
    updatedPreviews.splice(index, 1);
    setAttachmentPreviews(updatedPreviews);
    
    const updatedFiles = [...newPost.attachments];
    updatedFiles.splice(index, 1);
    setNewPost(prev => ({
      ...prev,
      attachments: updatedFiles
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the post data to your backend
    console.log('New post:', newPost);
    setIsCreatingPost(false);
    // Reset form
    setNewPost({
      type: 'post',
      title: '',
      content: '',
      subject: '',
      grade: '',
      deadline: '',
      visibility: 'all',
      attachments: []
    });
    setAttachmentPreviews([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Class Posts</h1>
        <button 
          className={styles.createButton}
          onClick={() => setIsCreatingPost(true)}
        >
          <FiEdit /> Create Post
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.dropdowns}>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className={styles.select}
          >
            <option value="">All Grades</option>
            {grades.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className={styles.select}
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tabs}>
        {postTypes.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {isCreatingPost && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modalOverlay}
            onClick={() => setIsCreatingPost(false)}
          >
            <motion.div 
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
              className={styles.modal} 
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>Create New Post</h2>
                <button 
                  className={styles.closeButton}
                  onClick={() => setIsCreatingPost(false)}
                >
                  <FiX />
                </button>
              </div>
              
              <form className={styles.postForm} onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label>Post Type</label>
                  <select 
                    name="type"
                    value={newPost.type}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                    required
                  >
                    <option value="post">General Post</option>
                    <option value="assignment">Assignment</option>
                    <option value="homework">Homework</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Subject *</label>
                  <select
                    name="subject"
                    value={newPost.subject}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Grade</label>
                  <select
                    name="grade"
                    value={newPost.grade}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                  >
                    <option value="">All Grades</option>
                    {grades.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Title *</label>
                  <input 
                    type="text" 
                    name="title"
                    placeholder="Enter title" 
                    value={newPost.title}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Description *</label>
                  <textarea 
                    name="content"
                    placeholder="Enter post content" 
                    value={newPost.content}
                    onChange={handleInputChange}
                    className={styles.formTextarea} 
                    rows={4}
                    required
                  />
                </div>
                
                {(newPost.type === 'assignment' || newPost.type === 'homework') && (
                  <div className={styles.formGroup}>
                    <label>Deadline *</label>
                    <div className={styles.dateInput}>
                      <FiCalendar className={styles.dateIcon} />
                      <input 
                        type="date" 
                        name="deadline"
                        value={newPost.deadline}
                        onChange={handleInputChange}
                        className={styles.formInput}
                        required={newPost.type === 'assignment' || newPost.type === 'homework'}
                      />
                    </div>
                  </div>
                )}
                
                <div className={styles.formGroup}>
                  <label>Attachments</label>
                  <div className={styles.uploadArea}>
                    <label htmlFor="file-upload" className={styles.uploadLabel}>
                      <FiUpload className={styles.uploadIcon} />
                      <p>Drag & drop files here or click to browse</p>
                      <input 
                        id="file-upload"
                        type="file" 
                        multiple 
                        className={styles.fileInput}
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  
                  {attachmentPreviews.length > 0 && (
                    <div className={styles.attachmentPreviews}>
                      {attachmentPreviews.map((file, index) => (
                        <div key={index} className={styles.attachmentPreviewItem}>
                          <div className={styles.fileInfo}>
                            {file.type === 'image' ? (
                              <FiBook className={styles.fileIcon} />
                            ) : (
                              <FiUpload className={styles.fileIcon} />
                            )}
                            <span>{file.name}</span>
                            <span className={styles.fileSize}>
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <button
                            type="button"
                            className={styles.removeAttachment}
                            onClick={() => removeAttachment(index)}
                          >
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className={styles.formGroup}>
                  <label>Visibility</label>
                  <select
                    name="visibility"
                    value={newPost.visibility}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                  >
                    <option value="all">All students in selected grade</option>
                    <option value="section">Specific section/class</option>
                  </select>
                </div>
                
                <div className={styles.formButtons}>
                  <button 
                    type="button" 
                    className={styles.cancelButton} 
                    onClick={() => setIsCreatingPost(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={!newPost.subject || !newPost.title || !newPost.content}
                  >
                    Post Now
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.postsGrid}>
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={styles.postCard}
            >
              <div className={styles.postHeader}>
                <div className={styles.teacherInfo}>
                  <FaChalkboardTeacher className={styles.teacherIcon} />
                  <div>
                    <h3>{post.teacher}</h3>
                    <p>{post.subject} • {post.grade}</p>
                  </div>
                </div>
                <span 
                  className={styles.postType}
                  style={{ backgroundColor: getPostTypeColor(post.type) }}
                >
                  {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                </span>
              </div>
              
              <div className={styles.postContent}>
                <h4>{post.title}</h4>
                <p>{post.content}</p>
                <div className={styles.postMeta}>
                  <span className={styles.postDate}>
                    <FiClock /> {formatDate(post.date)}
                  </span>
                  {post.deadline && (
                    <span className={styles.deadline}>
                      Due in {daysUntilDeadline(post.deadline)} days
                    </span>
                  )}
                </div>
              </div>
              
              {post.attachments && post.attachments.length > 0 && (
                <div className={styles.attachments}>
                  <h5>Attachments:</h5>
                  <div className={styles.attachmentList}>
                    {post.attachments.map((file, index) => (
                      <div key={index} className={styles.attachmentItem}>
                        {file.endsWith('.pdf') ? (
                          <FiBook className={styles.fileIcon} />
                        ) : (
                          <FiUpload className={styles.fileIcon} />
                        )}
                        <span>{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className={styles.noPosts}>
            No posts found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
};

export default POSTS;