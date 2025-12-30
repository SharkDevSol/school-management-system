import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FiUser, FiUsers, FiFileText, FiMessageSquare, FiPhone, FiList, FiCalendar, FiSettings, FiBook, FiSend, FiCheck, FiAlertCircle } from 'react-icons/fi';
import GuardianCommunications from '../PAGE/Communication/GuardianCommunications';
import { useApp } from '../context/AppContext';
import {
  MobileProfileLayout,
  BottomNavigation,
  ProfileHeader,
  CollapsibleCard,
  SkeletonLoader,
  PostCard,
  WardCarousel,
  useToast,
  SettingsTab
} from './mobile';
import styles from './GuardianProfile.module.css';

const GuardianProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [wards, setWards] = useState([]);
  const [guardianInfo, setGuardianInfo] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedWard, setSelectedWard] = useState(null);
  const [wardMarks, setWardMarks] = useState({});
  const [marksLoading, setMarksLoading] = useState(false);
  const [selectedMarkWard, setSelectedMarkWard] = useState(null);
  // Attendance state
  const [attendanceTables, setAttendanceTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [wardAttendance, setWardAttendance] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [selectedAttendanceWard, setSelectedAttendanceWard] = useState(null);
  
  // Evaluation Book state
  const [evalBookEvaluations, setEvalBookEvaluations] = useState([]);
  const [evalBookLoading, setEvalBookLoading] = useState(false);
  const [selectedEvalWard, setSelectedEvalWard] = useState(null);
  const [evalBookView, setEvalBookView] = useState('list'); // 'list', 'feedback', or 'reports'
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [selectedReportWard, setSelectedReportWard] = useState(null);
  
  const toast = useToast();

  const navItems = [
    { id: 'profile', label: 'Profile', icon: <FiUser /> },
    { id: 'marklist', label: 'Marks', icon: <FiList /> },
    { id: 'posts', label: 'Posts', icon: <FiFileText />, centered: true },
    { id: 'evalbook', label: 'Eval Book', icon: <FiBook /> },
    { id: 'attendance', label: 'Attendance', icon: <FiCalendar /> },
    { id: 'communications', label: 'Messages', icon: <FiMessageSquare /> },
    { id: 'settings', label: 'Settings', icon: <FiSettings /> }
  ];

  const fetchProfile = useCallback(async () => {
    try {
      // First verify guardian role
      const response = await axios.get(`https://excellence.oddag.et/api/students/guardian-profile/${username}`);
      if (response.data.role !== 'guardian') {
        setError('This page is for guardians only.');
        return;
      }
      
      // Fetch all guardians with associated students (same as ListGuardian)
      const guardiansResponse = await axios.get('https://excellence.oddag.et/api/guardian-list/guardians');
      const currentGuardian = guardiansResponse.data.find(
        guardian => guardian.guardian_username === username
      );
      
      if (currentGuardian) {
        // Set all associated students from all class tables
        setWards(currentGuardian.students || []);
        setGuardianInfo({
          guardian_name: currentGuardian.guardian_name,
          guardian_phone: currentGuardian.guardian_phone,
          guardian_username: currentGuardian.guardian_username
        });
      } else {
        // Fallback to original method if guardian not found in list
        setWards(response.data.student || []);
        if (response.data.student && response.data.student.length > 0) {
          setGuardianInfo({
            guardian_name: response.data.student[0].guardian_name,
            guardian_phone: response.data.student[0].guardian_phone,
            guardian_username: response.data.student[0].guardian_username
          });
        }
      }
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
      const response = await axios.get(`https://excellence.oddag.et/api/posts/profile/guardian/${schoolId}`);
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
    if (wards.length > 0) {
      fetchProfilePosts(wards[0].school_id);
      setSelectedMarkWard(wards[0]); // Default to first ward
    }
  }, [wards, fetchProfilePosts]);

  // Fetch marks for a ward
  const fetchWardMarks = useCallback(async (ward) => {
    if (!ward?.school_id || !ward?.class) return;
    setMarksLoading(true);
    try {
      const response = await axios.get(
        `https://excellence.oddag.et/api/mark-list/student-marks/${ward.school_id}/${encodeURIComponent(ward.class)}`
      );
      setWardMarks(prev => ({
        ...prev,
        [ward.school_id]: response.data.marks || []
      }));
    } catch (err) {
      console.error('Error fetching ward marks:', err);
    } finally {
      setMarksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'marklist' && selectedMarkWard) {
      if (!wardMarks[selectedMarkWard.school_id]) {
        fetchWardMarks(selectedMarkWard);
      }
    }
  }, [activeTab, selectedMarkWard, wardMarks, fetchWardMarks]);

  // Helper function: Map attendance value to display indicator
  const getAttendanceIndicator = (value) => {
    if (value === 'P') return 'P';
    if (value === 'A') return 'A';
    if (value === 'L') return 'L';
    return '-';
  };

  // Helper function: Calculate attendance summary
  const calculateAttendanceSummary = (record) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let present = 0, absent = 0, late = 0;
    days.forEach(day => {
      const val = record[day];
      if (val === 'P') present++;
      else if (val === 'A') absent++;
      else if (val === 'L') late++;
    });
    return { present, absent, late, total: 7 };
  };

  // Fetch attendance tables for a ward's class
  const fetchAttendanceTables = useCallback(async (ward) => {
    if (!ward?.class) {
      setAttendanceError('No class assigned');
      return;
    }
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const className = ward.class.replace(/\s+/g, '_');
      const response = await axios.get(
        `https://excellence.oddag.et/api/guardian-attendance/tables/${encodeURIComponent(className)}`
      );
      setAttendanceTables(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedTable(response.data[0]);
      } else {
        setSelectedTable(null);
      }
    } catch (err) {
      console.error('Error fetching attendance tables:', err);
      setAttendanceError('Failed to load attendance periods');
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  // Fetch attendance for a specific ward and table
  const fetchWardAttendance = useCallback(async (ward, tableName) => {
    if (!ward?.class || !ward?.school_id || !tableName) return;
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const className = ward.class.replace(/\s+/g, '_');
      const response = await axios.get(
        `https://excellence.oddag.et/api/guardian-attendance/student/${encodeURIComponent(className)}/${encodeURIComponent(tableName)}/${ward.school_id}`
      );
      setWardAttendance(prev => ({
        ...prev,
        [`${ward.school_id}_${tableName}`]: response.data || []
      }));
    } catch (err) {
      console.error('Error fetching ward attendance:', err);
      setAttendanceError('Failed to load attendance data');
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  // Effect: Set default attendance ward
  useEffect(() => {
    if (wards.length > 0 && !selectedAttendanceWard) {
      setSelectedAttendanceWard(wards[0]);
    }
  }, [wards, selectedAttendanceWard]);

  // Effect: Fetch attendance tables when tab is active
  useEffect(() => {
    if (activeTab === 'attendance' && selectedAttendanceWard) {
      fetchAttendanceTables(selectedAttendanceWard);
    }
  }, [activeTab, selectedAttendanceWard, fetchAttendanceTables]);

  // Effect: Fetch attendance when table is selected
  useEffect(() => {
    if (activeTab === 'attendance' && selectedAttendanceWard && selectedTable) {
      const key = `${selectedAttendanceWard.school_id}_${selectedTable}`;
      if (!wardAttendance[key]) {
        fetchWardAttendance(selectedAttendanceWard, selectedTable);
      }
    }
  }, [activeTab, selectedAttendanceWard, selectedTable, wardAttendance, fetchWardAttendance]);

  // Fetch evaluation book entries for guardian - searches by guardian_id and ward names
  const fetchEvalBookEvaluations = useCallback(async (guardianId, wardsList) => {
    if (!guardianId) return;
    setEvalBookLoading(true);
    try {
      // First try fetching by guardian_id
      const response = await axios.get(
        `https://excellence.oddag.et/api/evaluation-book/daily/guardian/${encodeURIComponent(guardianId)}`
      );
      let evaluations = response.data || [];
      
      // If no evaluations found and we have wards, try fetching by student names
      if (evaluations.length === 0 && wardsList && wardsList.length > 0) {
        const wardNames = wardsList.map(w => w.student_name);
        // Fetch evaluations for each ward by their class
        for (const ward of wardsList) {
          if (ward.class && ward.student_name) {
            try {
              const classResponse = await axios.get(
                `https://excellence.oddag.et/api/evaluation-book/daily/class/${encodeURIComponent(ward.class)}`
              );
              const wardEvals = (classResponse.data || []).filter(
                e => e.student_name === ward.student_name
              );
              evaluations = [...evaluations, ...wardEvals];
            } catch (classErr) {
              console.warn(`Could not fetch evaluations for class ${ward.class}:`, classErr);
            }
          }
        }
        // Remove duplicates by id
        evaluations = evaluations.filter((e, index, self) => 
          index === self.findIndex(t => t.id === e.id)
        );
      }
      
      setEvalBookEvaluations(evaluations);
    } catch (err) {
      console.error('Error fetching evaluation book:', err);
      setEvalBookEvaluations([]);
    } finally {
      setEvalBookLoading(false);
    }
  }, []);

  // Effect: Fetch evaluations when tab is active
  useEffect(() => {
    if (activeTab === 'evalbook' && guardianInfo?.guardian_username) {
      fetchEvalBookEvaluations(guardianInfo.guardian_username, wards);
    }
  }, [activeTab, guardianInfo, wards, fetchEvalBookEvaluations]);

  // Open feedback form for an evaluation
  const openFeedbackForm = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setFeedbackText(evaluation.feedback_text || '');
    setEvalBookView('feedback');
  };

  // Submit feedback
  const submitFeedback = async () => {
    if (!selectedEvaluation || !feedbackText.trim()) {
      toast.error('Please enter feedback');
      return;
    }
    setFeedbackSaving(true);
    try {
      await axios.post('https://excellence.oddag.et/api/evaluation-book/feedback', {
        daily_evaluation_id: selectedEvaluation.id,
        guardian_id: guardianInfo?.guardian_username,
        feedback_text: feedbackText.trim()
      });
      toast.success('Feedback submitted!');
      setEvalBookView('list');
      setSelectedEvaluation(null);
      setFeedbackText('');
      // Refresh evaluations
      if (guardianInfo?.guardian_username) {
        fetchEvalBookEvaluations(guardianInfo.guardian_username);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast.error(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setFeedbackSaving(false);
    }
  };

  // Back to evaluation list
  const backToEvalList = () => {
    setEvalBookView('list');
    setSelectedEvaluation(null);
    setFeedbackText('');
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setPostsLoading(true);
    await fetchProfile();
    if (wards.length > 0) {
      await fetchProfilePosts(wards[0].school_id);
    }
    toast.success('Profile refreshed');
  };

  const handleLike = async (postId) => {
    try {
      await axios.put(`https://excellence.oddag.et/api/posts/${postId}/like`);
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
    navigate('/app/guardian-login');
  };

  const renderProfileTab = () => (
    <>
      <ProfileHeader
        name={guardianInfo?.guardian_name}
        subtitle={`Guardian | ${wards.length} Ward${wards.length !== 1 ? 's' : ''}`}
        fallbackInitial={guardianInfo?.guardian_name?.charAt(0)}
      />

      <CollapsibleCard title="Contact Information" icon={<FiPhone />} defaultExpanded={true}>
        <div className={styles.fieldsStack}>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>Phone</span>
            <span className={styles.fieldValue}>{guardianInfo?.guardian_phone}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>Username</span>
            <span className={styles.fieldValue}>{guardianInfo?.guardian_username}</span>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title={`My Wards (${wards.length})`} icon={<FiUsers />} defaultExpanded={true}>
        <div className={styles.wardsSummary}>
          {wards.length === 0 ? (
            <div className={styles.emptyState}>
              <FiUsers className={styles.emptyIcon} />
              <p>No wards found</p>
            </div>
          ) : null}
          {wards.map((ward, index) => {
            // Helper to get proper image URL
            const getImageUrl = (imagePath) => {
              if (!imagePath) return null;
              const cleanPath = imagePath.replace(/^\/?(uploads|Uploads)\//i, '');
              return `https://excellence.oddag.et/uploads/${cleanPath}`;
            };
            
            return (
              <div key={ward.id || index} className={styles.wardDetailCard}>
                <div className={styles.wardDetailHeader}>
                  <div className={styles.wardDetailAvatar}>
                    {ward.image_student ? (
                      <img
                        src={getImageUrl(ward.image_student)}
                        alt={ward.student_name}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : null}
                    <span className={styles.wardAvatarFallback} style={{ display: ward.image_student ? 'none' : 'flex' }}>
                      {ward.student_name?.charAt(0)}
                    </span>
                  </div>
                  <div className={styles.wardDetailInfo}>
                    <span className={styles.wardDetailName}>{ward.student_name}</span>
                    <span className={styles.wardDetailClass}>Class: {ward.class}</span>
                  </div>
                </div>
                <div className={styles.wardDetailStats}>
                  <div className={styles.wardStatItem}>
                    <span className={styles.wardStatLabel}>School ID</span>
                    <span className={styles.wardStatValue}>{ward.school_id}</span>
                  </div>
                  <div className={styles.wardStatItem}>
                    <span className={styles.wardStatLabel}>Class ID</span>
                    <span className={styles.wardStatValue}>{ward.class_id}</span>
                  </div>
                  <div className={styles.wardStatItem}>
                    <span className={styles.wardStatLabel}>Age</span>
                    <span className={styles.wardStatValue}>{ward.age}</span>
                  </div>
                  <div className={styles.wardStatItem}>
                    <span className={styles.wardStatLabel}>Gender</span>
                    <span className={styles.wardStatValue}>{ward.gender}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleCard>
    </>
  );

  const renderMarkListTab = () => {
    const currentMarks = selectedMarkWard ? wardMarks[selectedMarkWard.school_id] || [] : [];
    
    return (
      <div className={styles.markListContainer}>
        <h2 className={styles.tabTitle}>Ward Report Cards</h2>
        
        {/* Ward Selector */}
        {wards.length > 1 && (
          <div className={styles.wardSelector}>
            {wards.map((ward) => (
              <button
                key={ward.school_id}
                className={`${styles.wardSelectorBtn} ${selectedMarkWard?.school_id === ward.school_id ? styles.wardSelectorActive : ''}`}
                onClick={() => {
                  setSelectedMarkWard(ward);
                  if (!wardMarks[ward.school_id]) {
                    fetchWardMarks(ward);
                  }
                }}
              >
                <span className={styles.wardSelectorAvatar}>
                  {ward.student_name?.charAt(0)}
                </span>
                <span className={styles.wardSelectorName}>{ward.student_name}</span>
              </button>
            ))}
          </div>
        )}
        
        {/* Selected Ward Info */}
        {selectedMarkWard && (
          <div className={styles.selectedWardInfo}>
            <span className={styles.selectedWardName}>{selectedMarkWard.student_name}</span>
            <span className={styles.selectedWardClass}>Class {selectedMarkWard.class}</span>
          </div>
        )}
        
        {marksLoading ? (
          <SkeletonLoader type="card" count={3} />
        ) : currentMarks.length > 0 ? (
          <div className={styles.markListCards}>
            {currentMarks.map((subject, index) => (
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
  };

  const renderAttendanceTab = () => {
    const currentKey = selectedAttendanceWard ? `${selectedAttendanceWard.school_id}_${selectedTable}` : null;
    const currentAttendance = currentKey ? wardAttendance[currentKey] || [] : [];

    return (
      <div className={styles.attendanceContainer}>
        <h2 className={styles.tabTitle}>Ward Attendance</h2>

        {/* Ward Selector - only show if multiple wards */}
        {wards.length > 1 && (
          <div className={styles.wardSelector}>
            {wards.map((ward) => (
              <button
                key={ward.school_id}
                className={`${styles.wardSelectorBtn} ${selectedAttendanceWard?.school_id === ward.school_id ? styles.wardSelectorActive : ''}`}
                onClick={() => {
                  setSelectedAttendanceWard(ward);
                  setSelectedTable(null);
                  setAttendanceTables([]);
                }}
              >
                <span className={styles.wardSelectorAvatar}>
                  {ward.student_name?.charAt(0)}
                </span>
                <span className={styles.wardSelectorName}>{ward.student_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected Ward Info */}
        {selectedAttendanceWard && (
          <div className={styles.selectedWardInfo}>
            <span className={styles.selectedWardName}>{selectedAttendanceWard.student_name}</span>
            <span className={styles.selectedWardClass}>Class {selectedAttendanceWard.class}</span>
          </div>
        )}

        {/* Error State */}
        {attendanceError && (
          <div className={styles.errorState}>
            <p>{attendanceError}</p>
            <button 
              className={styles.retryButton}
              onClick={() => fetchAttendanceTables(selectedAttendanceWard)}
            >
              Retry
            </button>
          </div>
        )}

        {/* No class assigned */}
        {selectedAttendanceWard && !selectedAttendanceWard.class && (
          <div className={styles.emptyState}>
            <FiCalendar className={styles.emptyIcon} />
            <p>Attendance unavailable - no class assigned</p>
          </div>
        )}

        {/* Period Selector */}
        {!attendanceError && selectedAttendanceWard?.class && attendanceTables.length > 0 && (
          <div className={styles.periodSelector}>
            <label className={styles.periodLabel}>Select Week:</label>
            <select
              className={styles.periodDropdown}
              value={selectedTable || ''}
              onChange={(e) => setSelectedTable(e.target.value)}
            >
              {attendanceTables.map((table) => {
                // Format week_YYYY_MM_DD to readable date
                const weekDate = table.replace('week_', '').replace(/_/g, '-');
                return (
                  <option key={table} value={table}>
                    Week of {new Date(weekDate).toLocaleDateString()}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Loading State */}
        {attendanceLoading && <SkeletonLoader type="card" count={2} />}

        {/* Empty Tables State */}
        {!attendanceLoading && !attendanceError && selectedAttendanceWard?.class && attendanceTables.length === 0 && (
          <div className={styles.emptyState}>
            <FiCalendar className={styles.emptyIcon} />
            <p>No attendance periods found</p>
          </div>
        )}

        {/* Attendance Cards */}
        {!attendanceLoading && !attendanceError && currentAttendance.length > 0 && (
          <div className={styles.attendanceCards}>
            {currentAttendance.map((record, index) => {
              const summary = calculateAttendanceSummary(record);
              const weekDate = record.week_start || selectedTable?.replace('week_', '').replace(/_/g, '-');
              return (
                <div key={index} className={styles.attendanceCard}>
                  <div className={styles.attendanceHeader}>
                    <span className={styles.attendancePeriod}>{record.student_name}</span>
                    <span className={styles.weekStart}>
                      Week of {weekDate ? new Date(weekDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className={styles.daysGrid}>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className={styles.dayItem}>
                        <span className={styles.dayLabel}>{day.slice(0, 3).toUpperCase()}</span>
                        <span className={`${styles.dayStatus} ${styles[`status${getAttendanceIndicator(record[day])}`]}`}>
                          {getAttendanceIndicator(record[day])}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.summaryRow}>
                    <span className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Present:</span>
                      <span className={styles.summaryValueP}>{summary.present}</span>
                    </span>
                    <span className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Absent:</span>
                      <span className={styles.summaryValueA}>{summary.absent}</span>
                    </span>
                    <span className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Late:</span>
                      <span className={styles.summaryValueL}>{summary.late}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No attendance data for selected period */}
        {!attendanceLoading && !attendanceError && selectedTable && currentAttendance.length === 0 && attendanceTables.length > 0 && (
          <div className={styles.emptyState}>
            <FiCalendar className={styles.emptyIcon} />
            <p>No attendance records for this period</p>
          </div>
        )}
      </div>
    );
  };

  const renderPostsTab = () => (
    <div className={styles.postsContainer}>
      <h2 className={styles.tabTitle}>Posts for Guardians</h2>
      {postsLoading ? (
        <SkeletonLoader type="card" count={3} />
      ) : profilePosts.length > 0 ? (
        profilePosts.map(post => (
          <PostCard key={post.id} post={post} onLike={handleLike} />
        ))
      ) : (
        <div className={styles.emptyState}>
          <FiFileText className={styles.emptyIcon} />
          <p>No posts available yet</p>
        </div>
      )}
    </div>
  );

  const renderCommunicationsTab = () => (
    <div className={styles.communicationsContainer}>
      <GuardianCommunications wards={wards} guardianInfo={guardianInfo} />
    </div>
  );

  const renderSettingsTab = () => (
    <SettingsTab userId={username} userType="guardian" />
  );

  const renderEvalBookTab = () => {
    // Feedback form view
    if (evalBookView === 'feedback' && selectedEvaluation) {
      const fieldValues = selectedEvaluation.field_values || {};
      return (
        <div className={styles.evalBookContainer}>
          <div className={styles.evalBookHeader}>
            <button className={styles.evalBackBtn} onClick={backToEvalList}>
              ← Back
            </button>
            <div className={styles.evalHeaderInfo}>
              <h3>{selectedEvaluation.student_name}</h3>
              <span>{new Date(selectedEvaluation.evaluation_date).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Teacher's Evaluation */}
          <CollapsibleCard title="Teacher's Evaluation" icon={<FiFileText />} defaultExpanded={true}>
            <div className={styles.evalFieldsList}>
              {Object.entries(fieldValues).map(([fieldName, value]) => (
                <div key={fieldName} className={styles.evalFieldItem}>
                  <span className={styles.evalFieldLabel}>{fieldName}</span>
                  <span className={styles.evalFieldValue}>{value}</span>
                </div>
              ))}
              {Object.keys(fieldValues).length === 0 && (
                <p className={styles.noData}>No evaluation data available</p>
              )}
            </div>
          </CollapsibleCard>

          {/* Guardian Feedback */}
          <CollapsibleCard title="Your Feedback" icon={<FiMessageSquare />} defaultExpanded={true}>
            <div className={styles.feedbackForm}>
              <textarea
                className={styles.feedbackTextarea}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Enter your feedback about your ward's progress..."
                rows={5}
              />
              <button 
                className={styles.feedbackSubmitBtn}
                onClick={submitFeedback}
                disabled={feedbackSaving || !feedbackText.trim()}
              >
                <FiSend /> {feedbackSaving ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </CollapsibleCard>
        </div>
      );
    }

    // Reports view
    if (evalBookView === 'reports') {
      const wardEvaluations = selectedReportWard 
        ? evalBookEvaluations.filter(e => e.student_name === selectedReportWard)
        : evalBookEvaluations;
      
      const totalEvals = wardEvaluations.length;
      const respondedEvals = wardEvaluations.filter(e => e.status === 'responded' || e.feedback_text).length;
      const pendingEvals = totalEvals - respondedEvals;
      
      // Group by month
      const groupedByMonth = wardEvaluations.reduce((acc, e) => {
        const month = new Date(e.evaluation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        if (!acc[month]) acc[month] = [];
        acc[month].push(e);
        return acc;
      }, {});

      return (
        <div className={styles.evalBookContainer}>
          <div className={styles.evalReportHeader}>
            <button className={styles.evalBackBtn} onClick={() => setEvalBookView('list')}>
              ← Back
            </button>
            <h3>Evaluation Reports</h3>
          </div>

          {/* Ward Selector */}
          {wards.length > 1 && (
            <div className={styles.evalWardSelector}>
              <label>Select Ward:</label>
              <select 
                value={selectedReportWard || ''} 
                onChange={(e) => setSelectedReportWard(e.target.value || null)}
              >
                <option value="">All Wards</option>
                {wards.map(w => (
                  <option key={w.student_name} value={w.student_name}>{w.student_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Summary Cards */}
          <div className={styles.evalReportSummary}>
            <div className={styles.evalSummaryCard}>
              <span className={styles.evalSummaryValue}>{totalEvals}</span>
              <span className={styles.evalSummaryLabel}>Total</span>
            </div>
            <div className={styles.evalSummaryCard}>
              <span className={styles.evalSummaryValue} style={{ color: '#16a34a' }}>{respondedEvals}</span>
              <span className={styles.evalSummaryLabel}>Responded</span>
            </div>
            <div className={styles.evalSummaryCard}>
              <span className={styles.evalSummaryValue} style={{ color: '#d97706' }}>{pendingEvals}</span>
              <span className={styles.evalSummaryLabel}>Pending</span>
            </div>
          </div>

          {/* Reports by Month */}
          {Object.keys(groupedByMonth).length === 0 ? (
            <div className={styles.emptyState}>
              <FiFileText className={styles.emptyIcon} />
              <p>No evaluation reports yet</p>
            </div>
          ) : (
            <div className={styles.evalReportMonths}>
              {Object.entries(groupedByMonth).map(([month, evals]) => (
                <div key={month} className={styles.evalMonthGroup}>
                  <h4 className={styles.evalMonthTitle}>{month}</h4>
                  <div className={styles.evalMonthList}>
                    {evals.map(evaluation => (
                      <div key={evaluation.id} className={styles.evalReportItem} onClick={() => openFeedbackForm(evaluation)}>
                        <div className={styles.evalReportItemInfo}>
                          <span className={styles.evalReportItemName}>{evaluation.student_name}</span>
                          <span className={styles.evalReportItemDate}>
                            {new Date(evaluation.evaluation_date).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`${styles.evalReportItemStatus} ${evaluation.feedback_text ? styles.statusDone : styles.statusPend}`}>
                          {evaluation.feedback_text ? '✓' : '○'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // List view
    return (
      <div className={styles.evalBookContainer}>
        <h2 className={styles.tabTitle}>Evaluation Book</h2>
        
        {/* View Reports Button */}
        {evalBookEvaluations.length > 0 && (
          <button className={styles.evalViewReportsBtn} onClick={() => setEvalBookView('reports')}>
            <FiFileText /> View Reports
          </button>
        )}
        
        {evalBookLoading ? (
          <SkeletonLoader type="card" count={3} />
        ) : evalBookEvaluations.length === 0 ? (
          <div className={styles.emptyState}>
            <FiBook className={styles.emptyIcon} />
            <p>No evaluations received yet</p>
            <small>Evaluations from teachers will appear here</small>
          </div>
        ) : (
          <div className={styles.evalBookList}>
            {evalBookEvaluations.map((evaluation) => (
              <div key={evaluation.id} className={styles.evalBookCard}>
                <div className={styles.evalCardHeader}>
                  <div className={styles.evalCardInfo}>
                    <span className={styles.evalStudentName}>{evaluation.student_name}</span>
                    <span className={styles.evalDate}>
                      {new Date(evaluation.evaluation_date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`${styles.evalStatus} ${styles[`status${evaluation.status}`]}`}>
                    {evaluation.status === 'responded' ? 'Responded' : 
                     evaluation.status === 'sent' ? 'Pending' : evaluation.status}
                  </span>
                </div>
                <div className={styles.evalCardClass}>
                  <FiUsers /> {evaluation.class_name}
                </div>
                {evaluation.feedback_text && (
                  <div className={styles.evalFeedbackPreview}>
                    <FiCheck /> Feedback submitted
                  </div>
                )}
                <button 
                  className={styles.evalViewBtn}
                  onClick={() => openFeedbackForm(evaluation)}
                >
                  {evaluation.feedback_text ? 'View / Edit Feedback' : 'Add Feedback'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'marklist':
        return renderMarkListTab();
      case 'evalbook':
        return renderEvalBookTab();
      case 'attendance':
        return renderAttendanceTab();
      case 'posts':
        return renderPostsTab();
      case 'communications':
        return renderCommunicationsTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderProfileTab();
    }
  };

  if (isLoading) {
    return (
      <MobileProfileLayout title="Guardian Profile" onLogout={handleLogout}>
        <SkeletonLoader type="profile" />
        <BottomNavigation items={navItems} activeItem={activeTab} onItemClick={setActiveTab} />
      </MobileProfileLayout>
    );
  }

  if (error) {
    return (
      <MobileProfileLayout title="Guardian Profile" onLogout={handleLogout}>
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

  if (!guardianInfo || wards.length === 0) {
    return (
      <MobileProfileLayout title="Guardian Profile" onLogout={handleLogout}>
        <div className={styles.errorContainer}>
          <p>Guardian not found.</p>
        </div>
        <BottomNavigation items={navItems} activeItem={activeTab} onItemClick={setActiveTab} />
      </MobileProfileLayout>
    );
  }

  return (
    <MobileProfileLayout
      title="Guardian Profile"
      onLogout={handleLogout}
      onRefresh={handleRefresh}
    >
      {renderContent()}
      <BottomNavigation items={navItems} activeItem={activeTab} onItemClick={setActiveTab} />
      <toast.ToastContainer />
    </MobileProfileLayout>
  );
};

export default GuardianProfile;
