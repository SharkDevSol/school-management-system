import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FiUser, FiUsers, FiFileText, FiList, FiInfo, FiSettings } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import {
  MobileProfileLayout,
  BottomNavigation,
  ProfileHeader,
  CollapsibleCard,
  SkeletonLoader,
  PostCard,
  useToast,
  ClassCommunicationTab,
  SettingsTab
} from './mobile';
import styles from './StudentProfile.module.css';

const StudentProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [markListData, setMarkListData] = useState([]);
  const [markListLoading, setMarkListLoading] = useState(false);
  const toast = useToast();
  const { t } = useApp();

  const navItems = [
    { id: 'profile', label: t('profile'), icon: <FiUser /> },
    { id: 'class', label: t('classComm'), icon: <FiUsers /> },
    { id: 'posts', label: t('posts'), icon: <FiFileText />, centered: true },
    { id: 'marklist', label: t('marklist'), icon: <FiList /> },
    { id: 'settings', label: t('settings'), icon: <FiSettings /> }
  ];

  const fetchProfile = useCallback(async () => {
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/students/profile/${username}`);
      setStudent(response.data.student);
      setError('');
    } catch (err) {
      setError('Failed to fetch profile data. You may not be authorized to view this page.');
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  const fetchProfilePosts = useCallback(async (schoolId) => {
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/posts/profile/student/${schoolId}`);
      setProfilePosts(response.data.map(post => ({ ...post, localLikes: post.likes || 0 })));
    } catch (err) {
      console.error('Error fetching profile posts:', err);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username, fetchProfile]);

  useEffect(() => {
    if (student) {
      fetchProfilePosts(student.school_id);
    }
  }, [student, fetchProfilePosts]);

  // Fetch student's mark list
  const fetchMarkList = useCallback(async () => {
    if (!student?.school_id || !student?.class) return;
    setMarkListLoading(true);
    try {
      const response = await axios.get(
        `https://school-management-system-daul.onrender.com/api/mark-list/student-marks/${student.school_id}/${encodeURIComponent(student.class)}`
      );
      setMarkListData(response.data.marks || []);
    } catch (err) {
      console.error('Error fetching mark list:', err);
    } finally {
      setMarkListLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (activeTab === 'marklist' && student) {
      fetchMarkList();
    }
  }, [activeTab, student, fetchMarkList]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setPostsLoading(true);
    await fetchProfile();
    if (student) {
      await fetchProfilePosts(student.school_id);
    }
    toast.success('Profile refreshed');
  };

  const handleLike = async (postId) => {
    try {
      await axios.put(`https://school-management-system-daul.onrender.com/api/posts/${postId}/like`);
      setProfilePosts(prev => 
        prev.map(post => 
          post.id === postId 
            ? { ...post, localLikes: (post.localLikes || 0) + 1 }
            : post
        )
      );
      toast.success('Post liked!');
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Failed to like post');
    }
  };

  const handleLogout = () => {
    navigate('/app/student-login');
  };

  const getAdditionalFields = () => {
    if (!student) return [];
    const standardFields = new Set([
      'student_name', 'class', 'age', 'gender', 'school_id', 'class_id',
      'guardian_name', 'guardian_phone', 'guardian_relation', 'id', 'password',
      'image_student', 'username', 'guardian_username', 'guardian_password'
    ]);
    
    return Object.entries(student)
      .filter(([key, value]) => value && !standardFields.has(key))
      .map(([key, value]) => ({
        label: key.replace(/_/g, ' '),
        value: String(value)
      }));
  };

  // Helper function to get proper image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    // Remove leading slash and any 'uploads/' or 'Uploads/' prefix
    const cleanPath = imagePath.replace(/^\/?(uploads|Uploads)\//i, '');
    return `https://school-management-system-daul.onrender.com/uploads/${cleanPath}`;
  };

  const renderProfileTab = () => (
    <>
      <ProfileHeader
        imageUrl={getImageUrl(student.image_student)}
        name={student.student_name}
        subtitle={`Class: ${student.class} | Roll No: ${student.class_id}`}
        fallbackInitial={student.student_name?.charAt(0)}
      />

      <CollapsibleCard title={t('basicInformation')} icon={<FiUser />} defaultExpanded={true}>
        <div className={styles.fieldsStack}>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>{t('class')}</span>
            <span className={styles.fieldValue}>{student.class}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>Class ID / Roll No</span>
            <span className={styles.fieldValue}>{student.class_id}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>{t('age')}</span>
            <span className={styles.fieldValue}>{student.age}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>{t('allGenders').replace('All ', '')}</span>
            <span className={styles.fieldValue}>{student.gender}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>School ID</span>
            <span className={styles.fieldValue}>{student.school_id}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>{t('username')}</span>
            <span className={styles.fieldValue}>{student.username}</span>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title={t('guardian')} icon={<FiUsers />} defaultExpanded={true}>
        <div className={styles.fieldsStack}>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>{t('fullName')}</span>
            <span className={styles.fieldValue}>{student.guardian_name}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>{t('phone')}</span>
            <span className={styles.fieldValue}>{student.guardian_phone}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>{t('role')}</span>
            <span className={styles.fieldValue}>{student.guardian_relation}</span>
          </div>
        </div>
      </CollapsibleCard>

      {getAdditionalFields().length > 0 && (
        <CollapsibleCard title={t('profileInformation')} icon={<FiInfo />} defaultExpanded={false}>
          <div className={styles.fieldsStack}>
            {getAdditionalFields().map((field, index) => (
              <div key={index} className={styles.fieldItem}>
                <span className={styles.fieldLabel}>{field.label}</span>
                <span className={styles.fieldValue}>{field.value}</span>
              </div>
            ))}
          </div>
        </CollapsibleCard>
      )}
    </>
  );

  const renderPostsTab = () => (
    <div className={styles.postsContainer}>
      <h2 className={styles.tabTitle}>{t('posts')}</h2>
      {postsLoading ? (
        <SkeletonLoader type="card" count={3} />
      ) : profilePosts.length > 0 ? (
        profilePosts.map(post => (
          <PostCard key={post.id} post={post} onLike={handleLike} />
        ))
      ) : (
        <div className={styles.emptyState}>
          <FiFileText className={styles.emptyIcon} />
          <p>{t('noPosts')}</p>
        </div>
      )}
    </div>
  );

  const renderMarkListTab = () => (
    <div className={styles.markListContainer}>
      <h2 className={styles.tabTitle}>{t('reportCard')}</h2>
      {markListLoading ? (
        <SkeletonLoader type="card" count={3} />
      ) : markListData.length > 0 ? (
        <div className={styles.markListCards}>
          {markListData.map((subject, index) => (
            <div key={index} className={styles.subjectCard}>
              <div className={styles.subjectHeader}>
                <span className={styles.subjectName}>{subject.subject_name}</span>
                <span className={`${styles.statusBadge} ${subject.pass_status === 'Pass' ? styles.statusPass : styles.statusFail}`}>
                  {subject.pass_status}
                </span>
              </div>
              <div className={styles.marksGrid}>
                {subject.components && subject.components.map((comp, idx) => (
                  <div key={idx} className={styles.markItem}>
                    <span className={styles.markLabel}>{comp.name}</span>
                    <span className={styles.markValue}>{comp.score}/{comp.max}</span>
                  </div>
                ))}
              </div>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Total</span>
                <span className={styles.totalValue}>{subject.total}/100</span>
              </div>
              <div className={styles.termInfo}>Term {subject.term_number}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <FiList className={styles.emptyIcon} />
          <p>No marks available yet</p>
        </div>
      )}
    </div>
  );

  const renderClassTab = () => (
    <ClassCommunicationTab
      userType="student"
      userId={student?.school_id}
      userName={student?.student_name}
      userClass={student?.class}
    />
  );

  const renderSettingsTab = () => (
    <SettingsTab userId={username} userType="student" />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'class':
        return renderClassTab();
      case 'posts':
        return renderPostsTab();
      case 'marklist':
        return renderMarkListTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderProfileTab();
    }
  };

  if (isLoading) {
    return (
      <MobileProfileLayout title="Student Profile" onLogout={handleLogout}>
        <SkeletonLoader type="profile" />
        <BottomNavigation items={navItems} activeItem={activeTab} onItemClick={setActiveTab} />
      </MobileProfileLayout>
    );
  }

  if (error) {
    return (
      <MobileProfileLayout title="Student Profile" onLogout={handleLogout}>
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button onClick={fetchProfile} className={styles.retryButton}>
            Try Again
          </button>
        </div>
        <BottomNavigation items={navItems} activeItem={activeTab} onItemClick={setActiveTab} />
      </MobileProfileLayout>
    );
  }

  if (!student) {
    return (
      <MobileProfileLayout title="Student Profile" onLogout={handleLogout}>
        <div className={styles.errorContainer}>
          <p>Student not found.</p>
        </div>
        <BottomNavigation items={navItems} activeItem={activeTab} onItemClick={setActiveTab} />
      </MobileProfileLayout>
    );
  }

  return (
    <MobileProfileLayout 
      title="Student Profile" 
      onLogout={handleLogout}
      onRefresh={handleRefresh}
    >
      {renderContent()}
      <BottomNavigation items={navItems} activeItem={activeTab} onItemClick={setActiveTab} />
      <toast.ToastContainer />
    </MobileProfileLayout>
  );
};

export default StudentProfile;
