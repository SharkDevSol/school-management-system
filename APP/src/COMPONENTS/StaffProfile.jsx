import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiClipboard, FiFileText, FiMessageSquare, FiEye, FiBriefcase, FiUserCheck, FiCalendar, FiCheck, FiX, FiClock, FiSave, FiArrowLeft, FiBook, FiBarChart2, FiAlertCircle, FiEdit, FiList, FiSearch, FiUsers, FiSettings, FiSend, FiStar } from 'react-icons/fi';
import axios from 'axios';
import TeacherCommunications from '../PAGE/Communication/TeacherCommunications';
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
import styles from './StaffProfile.module.css';

const StaffProfile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [profilePosts, setProfilePosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useApp();

  // Attendance state
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [assignedClass, setAssignedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [creatingAttendance, setCreatingAttendance] = useState(false);
  const [weeklyTables, setWeeklyTables] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [weeklyAttendanceExists, setWeeklyAttendanceExists] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [schoolDays, setSchoolDays] = useState(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [newWeekDate, setNewWeekDate] = useState('');
  const [showNewWeekModal, setShowNewWeekModal] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState('mark'); // 'mark' or 'view'

  // Inline Evaluation Form state
  const [evaluationView, setEvaluationView] = useState('list'); // 'list', 'form', or 'report'
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(null);
  const [evaluationFormData, setEvaluationFormData] = useState(null);
  const [formStudents, setFormStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  // Evaluation Report state
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  // Get Monday of a week from any date
  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Format date as YYYY-MM-DD
  const formatDate = (date) => date.toISOString().split('T')[0];

  // Get current week's Monday
  const currentWeekMonday = formatDate(getMonday(new Date()));

  // Get next week's Monday
  const getNextWeekMonday = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatDate(getMonday(nextWeek));
  };

  // All days of the week for reference
  const dayLabels = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

  // Schedule state for teachers
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  // Mark List state
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [markListLoading, setMarkListLoading] = useState(false);
  const [selectedMarkListSubject, setSelectedMarkListSubject] = useState('');
  const [selectedMarkListClass, setSelectedMarkListClass] = useState('');
  const [selectedMarkListTerm, setSelectedMarkListTerm] = useState(1);
  const [markListData, setMarkListData] = useState([]);
  const [markListConfig, setMarkListConfig] = useState(null);
  const [markListMessage, setMarkListMessage] = useState('');
  const [savingMarks, setSavingMarks] = useState(false);
  const [markListSearchQuery, setMarkListSearchQuery] = useState('');

  // Evaluation Book state
  const [evalBookAssignments, setEvalBookAssignments] = useState([]);
  const [evalBookLoading, setEvalBookLoading] = useState(false);
  const [hasEvalBookAccess, setHasEvalBookAccess] = useState(false);
  const [evalBookView, setEvalBookView] = useState('list'); // 'list' or 'form'
  const [selectedEvalClass, setSelectedEvalClass] = useState(null);
  const [evalTemplate, setEvalTemplate] = useState(null);
  const [evalStudents, setEvalStudents] = useState([]);
  const [evalEntries, setEvalEntries] = useState({});
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0]);
  const [evalFormLoading, setEvalFormLoading] = useState(false);
  const [evalFormSaving, setEvalFormSaving] = useState(false);
  const [evalFormError, setEvalFormError] = useState('');
  const [evalFormSuccess, setEvalFormSuccess] = useState('');
  
  // Evaluation Book Reports state
  const [evalReports, setEvalReports] = useState([]);
  const [evalReportsLoading, setEvalReportsLoading] = useState(false);
  const [selectedEvalReport, setSelectedEvalReport] = useState(null);

  // Dynamic nav items based on role (class teacher and teacher)
  const getNavItems = () => {
    const items = [
      { id: 'profile', label: t('profile'), icon: <FiUser /> }
    ];
    
    // Add Schedule tab for teachers
    if (isTeacher) {
      items.push({ id: 'schedule', label: t('schedule'), icon: <FiCalendar /> });
    }
    
    // Add Mark List tab for teachers with assignments
    if (isTeacher) {
      items.push({ id: 'marklist', label: t('marklist'), icon: <FiList /> });
    }
    
    // Add Class Communication tab for teachers
    if (isTeacher) {
      items.push({ id: 'class', label: t('classComm'), icon: <FiUsers /> });
    }
    
    // Posts in center position with centered flag
    items.push({ id: 'posts', label: t('posts'), icon: <FiFileText />, centered: true });
    
    // Add Attendance tab for class teachers
    if (isClassTeacher) {
      items.push({ id: 'attendance', label: t('attendance'), icon: <FiUserCheck /> });
    }
    
    // Add Evaluation Book tab for all teachers
    if (isTeacher || isClassTeacher) {
      items.push({ id: 'evalbook', label: t('evalBook') || 'Eval Book', icon: <FiBook /> });
    }
    
    items.push(
      { id: 'evaluations', label: t('evaluations'), icon: <FiClipboard /> },
      { id: 'communications', label: t('messages'), icon: <FiMessageSquare /> },
      { id: 'settings', label: t('settings'), icon: <FiSettings /> }
    );
    
    return items;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('staffUser');
    const storedProfile = localStorage.getItem('staffProfile');
    if (!storedUser || !storedProfile) {
      navigate('/app/staff-login');
      return;
    }
    try {
      const userData = JSON.parse(storedUser);
      const profileData = JSON.parse(storedProfile);
      setUser(userData);
      setProfile(profileData);
      fetchStaffEvaluations(profileData.global_staff_id);
      fetchProfilePosts(profileData.global_staff_id);
      checkClassTeacherStatus(profileData.global_staff_id, profileData.name);
      
      // Check if user is a teacher and fetch their schedule and mark lists
      // Show schedule for anyone with staffType containing "teacher" or who is a class teacher
      const staffTypeLower = userData.staffType?.toLowerCase() || '';
      if (staffTypeLower.includes('teacher') || staffTypeLower === 'teacher') {
        setIsTeacher(true);
        fetchTeacherSchedule(profileData.name);
        fetchTeacherMarkLists(profileData.name);
      }
      
      // Check evaluation book assignments for this teacher
      fetchEvalBookAssignments(profileData.global_staff_id);
    } catch (error) {
      navigate('/app/staff-login');
      return;
    }
    setIsLoading(false);
  }, [navigate]);

  // Check if staff is a class teacher
  const checkClassTeacherStatus = async (globalStaffId, profileName) => {
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/class-teacher/check/${globalStaffId}`);
      setIsClassTeacher(response.data.isClassTeacher);
      setAssignedClass(response.data.assignedClass);
      if (response.data.isClassTeacher && response.data.assignedClass) {
        fetchStudentsForAttendance(response.data.assignedClass);
        fetchSchoolDays();
        // Class teachers are also teachers - show schedule for them
        if (!isTeacher) {
          setIsTeacher(true);
          fetchTeacherSchedule(profileName);
        }
      }
    } catch (error) {
      console.error('Error checking class teacher status:', error);
    }
  };

  // Fetch teacher's personal schedule
  const fetchTeacherSchedule = async (teacherName) => {
    if (!teacherName) return;
    setScheduleLoading(true);
    try {
      const response = await axios.get('https://school-management-system-daul.onrender.com/api/schedule/schedule-by-teacher');
      const allSchedules = response.data;
      
      // Find this teacher's schedule
      const mySchedule = allSchedules[teacherName];
      if (mySchedule && mySchedule.schedule) {
        setTeacherSchedule(mySchedule.schedule);
      } else {
        setTeacherSchedule([]);
      }
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      setTeacherSchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  // Fetch teacher's assigned mark lists
  const fetchTeacherMarkLists = async (teacherName) => {
    if (!teacherName) return;
    setMarkListLoading(true);
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/mark-list/teacher-mark-lists/${encodeURIComponent(teacherName)}`);
      setTeacherAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Error fetching teacher mark lists:', error);
      setTeacherAssignments([]);
    } finally {
      setMarkListLoading(false);
    }
  };

  // Fetch evaluation book assignments for this teacher
  const fetchEvalBookAssignments = async (globalStaffId) => {
    if (!globalStaffId) return;
    setEvalBookLoading(true);
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/evaluation-book/assignments/teacher/${globalStaffId}`);
      const assignments = response.data || [];
      setEvalBookAssignments(assignments);
      setHasEvalBookAccess(assignments.length > 0);
    } catch (error) {
      console.error('Error fetching evaluation book assignments:', error);
      setEvalBookAssignments([]);
      setHasEvalBookAccess(false);
    } finally {
      setEvalBookLoading(false);
    }
  };

  // Open evaluation form for a class
  const openEvalBookForm = async (className) => {
    if (!profile?.global_staff_id) return;
    setSelectedEvalClass(className);
    setEvalFormLoading(true);
    setEvalFormError('');
    setEvalFormSuccess('');
    setEvalBookView('form');
    
    try {
      // Fetch class data with students and template
      const response = await axios.get(
        `https://school-management-system-daul.onrender.com/api/evaluation-book/teacher/${profile.global_staff_id}/class/${encodeURIComponent(className)}`
      );
      const data = response.data;
      setEvalStudents(data.students || []);
      
      if (data.template) {
        // Fetch full template with fields
        const templateRes = await axios.get(`https://school-management-system-daul.onrender.com/api/evaluation-book/templates/${data.template.id}`);
        setEvalTemplate(templateRes.data);
      }
      
      // Initialize entries for each student
      const initialEntries = {};
      (data.students || []).forEach(student => {
        initialEntries[student.student_name] = { field_values: {}, guardian_id: student.guardian_id || '' };
      });
      setEvalEntries(initialEntries);
    } catch (error) {
      console.error('Error loading evaluation form:', error);
      setEvalFormError(error.response?.data?.error || 'Failed to load evaluation form');
    } finally {
      setEvalFormLoading(false);
    }
  };

  // Handle field change in evaluation form
  const handleEvalFieldChange = (studentName, fieldId, value) => {
    setEvalEntries(prev => ({
      ...prev,
      [studentName]: {
        ...prev[studentName],
        field_values: {
          ...prev[studentName]?.field_values,
          [fieldId]: value
        }
      }
    }));
  };

  // Save evaluation entries
  const saveEvalEntries = async (sendToGuardians = false) => {
    if (!evalTemplate || !profile?.global_staff_id) return;
    setEvalFormSaving(true);
    setEvalFormError('');
    setEvalFormSuccess('');
    
    try {
      const entriesPayload = evalStudents.map(student => ({
        student_name: student.student_name,
        guardian_id: student.guardian_id || null,
        field_values: evalEntries[student.student_name]?.field_values || {}
      }));
      
      const response = await axios.post('https://school-management-system-daul.onrender.com/api/evaluation-book/daily', {
        template_id: evalTemplate.id,
        teacher_global_id: profile.global_staff_id,
        class_name: selectedEvalClass,
        evaluation_date: evalDate,
        entries: entriesPayload
      });
      
      if (sendToGuardians && response.data?.length > 0) {
        const evalIds = response.data.map(e => e.id);
        await axios.post('https://school-management-system-daul.onrender.com/api/evaluation-book/daily/send', {
          evaluation_ids: evalIds
        });
        setEvalFormSuccess('Evaluations saved and sent to guardians!');
      } else {
        setEvalFormSuccess('Evaluations saved successfully!');
      }
      
      toast.success(sendToGuardians ? 'Sent to guardians!' : 'Saved!');
    } catch (error) {
      console.error('Error saving evaluations:', error);
      setEvalFormError(error.response?.data?.error || 'Failed to save evaluations');
      toast.error('Failed to save');
    } finally {
      setEvalFormSaving(false);
    }
  };

  // Back to class list
  const backToEvalBookList = () => {
    setEvalBookView('list');
    setSelectedEvalClass(null);
    setEvalTemplate(null);
    setEvalStudents([]);
    setEvalEntries({});
    setEvalFormError('');
    setEvalFormSuccess('');
  };

  // Fetch evaluation reports for teacher
  const fetchEvalReports = async () => {
    if (!profile?.global_staff_id) return;
    setEvalReportsLoading(true);
    try {
      const response = await axios.get(
        `https://school-management-system-daul.onrender.com/api/evaluation-book/reports/teacher/${profile.global_staff_id}`
      );
      setEvalReports(response.data?.entries || []);
    } catch (error) {
      console.error('Error fetching eval reports:', error);
      setEvalReports([]);
    } finally {
      setEvalReportsLoading(false);
    }
  };

  // Show reports view
  const showEvalReports = () => {
    setEvalBookView('reports');
    fetchEvalReports();
  };

  // Get unique subjects from assignments
  const getMarkListSubjects = () => {
    const subjects = [...new Set(teacherAssignments.map(a => a.subjectName))];
    return subjects;
  };

  // Get classes for selected subject
  const getMarkListClasses = () => {
    if (!selectedMarkListSubject) return [];
    const classes = [...new Set(
      teacherAssignments
        .filter(a => a.subjectName === selectedMarkListSubject)
        .map(a => a.className)
    )];
    return classes;
  };

  // Get terms for selected subject and class
  const getMarkListTerms = () => {
    if (!selectedMarkListSubject || !selectedMarkListClass) return [];
    const terms = teacherAssignments
      .filter(a => a.subjectName === selectedMarkListSubject && a.className === selectedMarkListClass)
      .map(a => a.termNumber);
    return [...new Set(terms)].sort();
  };

  // Load mark list data
  const loadMarkListData = async () => {
    if (!selectedMarkListSubject || !selectedMarkListClass || !selectedMarkListTerm) return;
    setMarkListLoading(true);
    setMarkListMessage('');
    try {
      const response = await axios.get(
        `https://school-management-system-daul.onrender.com/api/mark-list/mark-list/${encodeURIComponent(selectedMarkListSubject)}/${encodeURIComponent(selectedMarkListClass)}/${selectedMarkListTerm}`
      );
      setMarkListData(response.data.markList || []);
      setMarkListConfig(response.data.config || null);
    } catch (error) {
      console.error('Error loading mark list:', error);
      setMarkListMessage('Failed to load mark list');
      setMarkListData([]);
      setMarkListConfig(null);
    } finally {
      setMarkListLoading(false);
    }
  };

  // Handle mark change
  const handleMarkListMarkChange = (studentId, componentKey, value) => {
    setMarkListData(prev => prev.map(student => {
      if (student.id === studentId) {
        return { ...student, [componentKey]: parseFloat(value) || 0 };
      }
      return student;
    }));
  };

  // Save marks for a student
  const saveStudentMarks = async (studentId) => {
    const student = markListData.find(s => s.id === studentId);
    if (!student || !markListConfig) return;

    setSavingMarks(true);
    try {
      const marks = {};
      markListConfig.mark_components.forEach(component => {
        const componentKey = component.name.toLowerCase().replace(/\s+/g, '_');
        marks[componentKey] = student[componentKey] || 0;
      });

      const response = await axios.put('https://school-management-system-daul.onrender.com/api/mark-list/update-marks', {
        subjectName: selectedMarkListSubject,
        className: selectedMarkListClass,
        termNumber: selectedMarkListTerm,
        studentId: studentId,
        marks: marks
      });

      // Update local state with new total and status
      setMarkListData(prev => prev.map(s => {
        if (s.id === studentId) {
          return { ...s, total: response.data.total, pass_status: response.data.passStatus };
        }
        return s;
      }));
      toast.success(`Marks saved for ${student.student_name}`);
    } catch (error) {
      console.error('Error saving marks:', error);
      toast.error('Failed to save marks');
    } finally {
      setSavingMarks(false);
    }
  };

  // Calculate progress
  const getMarkListProgress = () => {
    if (!markListData.length || !markListConfig) return { completed: 0, total: 0, percentage: 0 };
    const total = markListData.length;
    const completed = markListData.filter(student => {
      return markListConfig.mark_components.every(comp => {
        const key = comp.name.toLowerCase().replace(/\s+/g, '_');
        return student[key] > 0;
      });
    }).length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  // Fetch school days from schedule config
  const fetchSchoolDays = async () => {
    try {
      const response = await axios.get('https://school-management-system-daul.onrender.com/api/class-teacher/school-days');
      if (response.data.schoolDays && response.data.schoolDays.length > 0) {
        setSchoolDays(response.data.schoolDays);
        setSelectedDay(response.data.schoolDays[0]); // Set first school day as default
      }
    } catch (error) {
      console.error('Error fetching school days:', error);
      // Keep default school days
      setSelectedDay('monday');
    }
  };

  // Fetch students for attendance
  const fetchStudentsForAttendance = async (className) => {
    setAttendanceLoading(true);
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/class-teacher/students/${className}`);
      setStudents(response.data);
      
      // Fetch weekly tables
      await fetchWeeklyTables(className);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch weekly attendance tables
  const fetchWeeklyTables = async (className) => {
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/class-teacher/weekly-tables/${className}`);
      setWeeklyTables(response.data);
      
      // Auto-select current week if exists, otherwise latest
      const currentWeekTable = `week_${currentWeekMonday.replace(/-/g, '_')}`;
      if (response.data.includes(currentWeekTable)) {
        setSelectedWeek(currentWeekMonday);
        fetchWeeklyAttendance(className, currentWeekMonday);
      } else if (response.data.length > 0) {
        const latestWeek = response.data[0].replace('week_', '').replace(/_/g, '-');
        setSelectedWeek(latestWeek);
        fetchWeeklyAttendance(className, latestWeek);
      }
    } catch (error) {
      console.error('Error fetching weekly tables:', error);
    }
  };

  // Fetch weekly attendance data
  const fetchWeeklyAttendance = async (className, weekStart) => {
    if (!className || !weekStart) return;
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/class-teacher/weekly-attendance/${className}/${weekStart}`);
      setWeeklyAttendanceExists(response.data.exists);
      
      if (response.data.exists && response.data.data.length > 0) {
        const records = {};
        response.data.data.forEach(record => {
          const key = `${record.school_id}-${record.class_id}`;
          records[key] = {
            school_id: record.school_id,
            class_id: record.class_id,
            student_name: record.student_name,
            monday: record.monday || '',
            tuesday: record.tuesday || '',
            wednesday: record.wednesday || '',
            thursday: record.thursday || '',
            friday: record.friday || '',
            saturday: record.saturday || '',
            sunday: record.sunday || ''
          };
        });
        setAttendanceRecords(records);
      } else {
        // Initialize empty records from students
        const records = {};
        students.forEach(student => {
          const key = `${student.school_id}-${student.class_id}`;
          records[key] = {
            school_id: student.school_id,
            class_id: student.class_id,
            student_name: student.student_name,
            monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: ''
          };
        });
        setAttendanceRecords(records);
      }
    } catch (error) {
      console.error('Error fetching weekly attendance:', error);
    }
  };

  // Effect to refetch attendance when week changes
  useEffect(() => {
    if (assignedClass && isClassTeacher && selectedWeek) {
      fetchWeeklyAttendance(assignedClass, selectedWeek);
    }
  }, [selectedWeek, assignedClass, isClassTeacher]);

  // Handle attendance status change for a specific day
  const handleAttendanceStatusChange = (studentKey, day, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentKey]: { 
        ...prev[studentKey],
        [day]: status
      }
    }));
  };

  // Mark all students with same status for selected day
  const markAllAs = (status) => {
    const updatedRecords = { ...attendanceRecords };
    students.forEach(student => {
      const key = `${student.school_id}-${student.class_id}`;
      if (updatedRecords[key]) {
        updatedRecords[key] = {
          ...updatedRecords[key],
          [selectedDay]: status
        };
      }
    });
    setAttendanceRecords(updatedRecords);
  };

  // Create new weekly attendance
  const createWeeklyAttendance = async (weekStart = null) => {
    if (!profile || !assignedClass) return;
    
    const targetWeek = weekStart || newWeekDate || currentWeekMonday;
    // Ensure we use the Monday of the selected week
    const mondayOfWeek = formatDate(getMonday(new Date(targetWeek)));
    
    setCreatingAttendance(true);
    try {
      await axios.post('https://school-management-system-daul.onrender.com/api/class-teacher/create-weekly-attendance', {
        className: assignedClass,
        weekStart: mondayOfWeek,
        globalStaffId: profile.global_staff_id
      });
      toast.success(`Weekly attendance created for week of ${mondayOfWeek}!`);
      setSelectedWeek(mondayOfWeek);
      setShowNewWeekModal(false);
      setNewWeekDate('');
      await fetchWeeklyTables(assignedClass);
      await fetchWeeklyAttendance(assignedClass, mondayOfWeek);
    } catch (error) {
      console.error('Error creating weekly attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to create weekly attendance');
    } finally {
      setCreatingAttendance(false);
    }
  };

  // Quick create for next week
  const createNextWeekAttendance = () => {
    createWeeklyAttendance(getNextWeekMonday());
  };

  // Save weekly attendance
  const saveAttendance = async () => {
    if (!profile || !assignedClass || !selectedWeek || students.length === 0) return;
    setSavingAttendance(true);
    try {
      const records = students
        .filter(student => student.school_id && student.class_id)
        .map(student => {
          const key = `${student.school_id}-${student.class_id}`;
          const record = attendanceRecords[key] || {};
          return {
            school_id: String(student.school_id),
            class_id: String(student.class_id),
            monday: record.monday || null,
            tuesday: record.tuesday || null,
            wednesday: record.wednesday || null,
            thursday: record.thursday || null,
            friday: record.friday || null,
            saturday: record.saturday || null,
            sunday: record.sunday || null
          };
        });
      
      await axios.put(`https://school-management-system-daul.onrender.com/api/class-teacher/weekly-attendance/${assignedClass}/${selectedWeek}`, {
        records,
        globalStaffId: profile.global_staff_id
      });
      toast.success('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  const fetchStaffEvaluations = async (staffId) => {
    if (!staffId) return;
    setEvaluationsLoading(true);
    try {
      const response = await fetch(`https://school-management-system-daul.onrender.com/api/evaluations/staff-evaluations/${staffId}`);
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data);
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setEvaluationsLoading(false);
    }
  };

  // Fetch evaluation form data for inline editing
  const fetchEvaluationForm = async (evaluationId) => {
    if (!evaluationId) return;
    setFormLoading(true);
    setFormError('');
    try {
      const response = await fetch(`https://school-management-system-daul.onrender.com/api/evaluations/${evaluationId}/form`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch evaluation form');
      }
      const formData = await response.json();
      
      setEvaluationFormData(formData);
      setFormStudents(formData.students || []);
      
      // Initialize scores state from existing student scores
      const initialScores = {};
      (formData.students || []).forEach(student => {
        initialScores[student.student_name] = {};
        (formData.areas || []).forEach(area => {
          (area.criteria || []).forEach(criterion => {
            const existingScore = student.scores?.[criterion.id];
            initialScores[student.student_name][criterion.id] = {
              score: existingScore?.score || 0,
              notes: existingScore?.notes || ''
            };
          });
        });
      });
      setScores(initialScores);
      setSelectedEvaluationId(evaluationId);
      setEvaluationView('form');
    } catch (error) {
      console.error('Error fetching evaluation form:', error);
      setFormError(error.message || 'Failed to load evaluation form');
    } finally {
      setFormLoading(false);
    }
  };

  // Fetch evaluation report data for viewing
  const fetchEvaluationReport = async (evaluationId) => {
    if (!evaluationId) return;
    setReportLoading(true);
    setReportError('');
    setEvaluationView('report'); // Set view immediately so back button is visible
    try {
      const response = await fetch(`https://school-management-system-daul.onrender.com/api/evaluations/${evaluationId}/form`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch evaluation report');
      }
      const data = await response.json();
      setReportData(data);
      setSelectedEvaluationId(evaluationId);
    } catch (error) {
      console.error('Error fetching evaluation report:', error);
      setReportError(error.message || 'Failed to load evaluation report');
    } finally {
      setReportLoading(false);
    }
  };

  // Update score for a student/criterion
  const updateScore = (studentName, criterionId, field, value) => {
    setScores(prev => ({
      ...prev,
      [studentName]: {
        ...prev[studentName],
        [criterionId]: {
          ...prev[studentName]?.[criterionId],
          [field]: field === 'score' ? Math.max(0, parseInt(value) || 0) : value
        }
      }
    }));
  };

  // Calculate total score for a student
  const calculateStudentTotal = (studentName) => {
    if (!evaluationFormData?.areas || !scores[studentName]) return { total: 0, max: 0 };
    
    let total = 0;
    let max = 0;
    evaluationFormData.areas.forEach(area => {
      (area.criteria || []).forEach(criterion => {
        total += scores[studentName]?.[criterion.id]?.score || 0;
        max += criterion.max_points || 0;
      });
    });
    return { total, max };
  };

  // Save evaluation scores
  const saveEvaluationScores = async () => {
    if (!selectedEvaluationId || !evaluationFormData) return;
    
    setFormSaving(true);
    setFormError('');
    
    const responsesPayload = formStudents.map(student => {
      const studentScores = {};
      evaluationFormData.areas.forEach(area => {
        (area.criteria || []).forEach(criterion => {
          const scoreData = scores[student.student_name]?.[criterion.id];
          if (scoreData) {
            studentScores[criterion.criteria_name] = {
              score: scoreData.score,
              notes: scoreData.notes
            };
          }
        });
      });
      
      return {
        student_name: student.student_name,
        student_age: student.student_age,
        student_gender: student.student_gender,
        student_class: evaluationFormData.evaluation.class_name,
        scores: studentScores
      };
    });
    
    try {
      const response = await fetch(`https://school-management-system-daul.onrender.com/api/evaluations/${selectedEvaluationId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: responsesPayload })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save scores');
      }
      
      toast.success('Evaluation scores saved successfully!');
      // Refresh evaluations list to update status
      if (profile) {
        fetchStaffEvaluations(profile.global_staff_id);
      }
    } catch (error) {
      console.error('Error saving evaluation scores:', error);
      toast.error(error.message || 'Failed to save scores');
      setFormError(error.message);
    } finally {
      setFormSaving(false);
    }
  };

  // Navigate back to evaluation list
  const handleBackToEvaluationList = () => {
    setEvaluationView('list');
    setSelectedEvaluationId(null);
    setEvaluationFormData(null);
    setFormStudents([]);
    setScores({});
    setFormError('');
    setReportData(null);
    setReportError('');
    // Refresh list to show updated status
    if (profile) {
      fetchStaffEvaluations(profile.global_staff_id);
    }
  };

  const fetchProfilePosts = async (staffId) => {
    try {
      const response = await axios.get(`https://school-management-system-daul.onrender.com/api/posts/profile/staff/${staffId}`);
      setProfilePosts(response.data.map(post => ({ ...post, localLikes: post.likes || 0 })));
    } catch (error) {
      console.error('Error fetching profile posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (profile) {
      setPostsLoading(true);
      setEvaluationsLoading(true);
      await Promise.all([
        fetchStaffEvaluations(profile.global_staff_id),
        fetchProfilePosts(profile.global_staff_id)
      ]);
      toast.success('Profile refreshed');
    }
  };

  const handleLike = async (postId) => {
    try {
      await axios.put(`https://school-management-system-daul.onrender.com/api/posts/${postId}/like`);
      setProfilePosts(prev =>
        prev.map(post =>
          post.id === postId ? { ...post, localLikes: (post.localLikes || 0) + 1 } : post
        )
      );
      toast.success('Post liked!');
    } catch (error) {
      toast.error('Failed to like post');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staffUser');
    localStorage.removeItem('staffProfile');
    navigate('/app/staff-login');
  };

  const formatFieldName = (fieldName) => {
    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFieldValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value.toString();
  };

  const getImageUrl = (filename) => {
    if (!filename) return null;
    return `/api/staff/uploads/${filename}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return styles.statusCompleted;
      case 'pending': return styles.statusPending;
      case 'in_progress': return styles.statusInProgress;
      default: return styles.statusDefault;
    }
  };

  const excludeFields = ['id', 'global_staff_id', 'staff_id', 'image_staff'];
  const profileFields = profile
    ? Object.entries(profile).filter(([key]) => !excludeFields.includes(key))
    : [];

  const renderProfileTab = () => (
    <>
      <ProfileHeader
        imageUrl={profile?.image_staff ? getImageUrl(profile.image_staff) : null}
        name={profile?.name || 'Staff Member'}
        subtitle={user?.staffType || 'Staff'}
        fallbackInitial={profile?.name?.charAt(0) || 'S'}
      />
      <CollapsibleCard title={t('profileInformation')} icon={<FiUser />} defaultExpanded={true}>
        <div className={styles.fieldsStack}>
          {profileFields.map(([key, value], index) => (
            <div key={`profile-${key}-${index}`} className={styles.fieldItem}>
              <span className={styles.fieldLabel}>{formatFieldName(key)}</span>
              <span className={styles.fieldValue}>{formatFieldValue(value)}</span>
            </div>
          ))}
        </div>
      </CollapsibleCard>
      <CollapsibleCard title={t('accountInformation')} icon={<FiBriefcase />} defaultExpanded={true}>
        <div className={styles.fieldsStack}>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>{t('username')}</span>
            <span className={styles.fieldValue}>{user?.username}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>{t('role')}</span>
            <span className={styles.fieldValue}>{user?.staffType}</span>
          </div>
          <div className={styles.fieldItem}>
            <span className={styles.fieldLabel}>{t('department')}</span>
            <span className={styles.fieldValue}>{user?.className}</span>
          </div>
        </div>
      </CollapsibleCard>
    </>
  );

  // Render evaluation list view
  const renderEvaluationList = () => (
    <div className={styles.evaluationsContainer}>
      <h2 className={styles.tabTitle}>{t('evaluations')}</h2>
      {evaluationsLoading ? (
        <SkeletonLoader type="card" count={3} />
      ) : evaluations.length > 0 ? (
        <div className={styles.evaluationsList}>
          {evaluations.map((evaluation, index) => (
            <div key={`eval-${evaluation.id}-${index}`} className={`${styles.evaluationCard} ${evaluation.status === 'completed' ? styles.evaluationCardCompleted : styles.evaluationCardPending}`}>
              <div className={styles.evaluationHeader}>
                <h3 className={styles.evaluationName}>{evaluation.evaluation_name}</h3>
                <span className={`${styles.statusBadge} ${getStatusColor(evaluation.status)}`}>
                  {evaluation.status}
                </span>
              </div>
              <div className={styles.evaluationDetails}>
                <div className={styles.evaluationDetail}>
                  <span className={styles.detailLabel}>Subject</span>
                  <span className={styles.detailValue}>{evaluation.subject_name}</span>
                </div>
                <div className={styles.evaluationDetail}>
                  <span className={styles.detailLabel}>Class</span>
                  <span className={styles.detailValue}>{evaluation.class_name}</span>
                </div>
                <div className={styles.evaluationDetail}>
                  <span className={styles.detailLabel}>Term</span>
                  <span className={styles.detailValue}>{evaluation.term}</span>
                </div>
              </div>
              <div className={styles.evaluationActions}>
                <button className={`${styles.actionButton} ${styles.fillFormBtn}`} onClick={() => fetchEvaluationForm(evaluation.id)}>
                  <FiEdit /><span>{t('fillForm')}</span>
                </button>
                <button className={`${styles.actionButton} ${styles.viewReportBtn}`} onClick={() => fetchEvaluationReport(evaluation.id)}>
                  <FiEye /><span>{t('viewReport')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <FiClipboard className={styles.emptyIcon} />
          <p>{t('noEvaluations')}</p>
        </div>
      )}
    </div>
  );

  // Render inline evaluation form
  const renderEvaluationForm = () => {
    if (formLoading) {
      return (
        <div className={styles.evaluationsContainer}>
          <SkeletonLoader type="card" count={5} />
        </div>
      );
    }

    if (formError) {
      return (
        <div className={styles.evaluationsContainer}>
          <div className={styles.formErrorState}>
            <FiAlertCircle className={styles.emptyIcon} />
            <p>{formError}</p>
            <button onClick={handleBackToEvaluationList} className={styles.backBtn}>
              <FiArrowLeft /> {t('back')}
            </button>
          </div>
        </div>
      );
    }

    if (!evaluationFormData) return null;

    const evaluation = evaluationFormData.evaluation;

    return (
      <div className={styles.evaluationsContainer}>
        {/* Form Header */}
        <div className={styles.evalFormHeader}>
          <button onClick={handleBackToEvaluationList} className={styles.backBtn}>
            <FiArrowLeft /> {t('back')}
          </button>
          <div className={styles.evalFormTitle}>
            <h2>{evaluation.evaluation_name}</h2>
            <div className={styles.evalFormMeta}>
              <span><FiBook /> {evaluation.subject_name}</span>
              <span><FiUserCheck /> {evaluation.class_name}</span>
              <span><FiCalendar /> {evaluation.term}</span>
            </div>
          </div>
        </div>

        {/* Students List with Scores */}
        <div className={styles.evalFormStudents}>
          {formStudents.length > 0 ? (
            formStudents.map((student, studentIndex) => {
              const totals = calculateStudentTotal(student.student_name);
              const studentKey = `${studentIndex}-${student.student_name}`;
              return (
                <div key={studentKey} className={styles.evalStudentCard}>
                  <div className={styles.evalStudentHeader}>
                    <div className={styles.evalStudentInfo}>
                      <span className={styles.evalStudentNum}>{studentIndex + 1}</span>
                      <div>
                        <h4 className={styles.evalStudentName}>{student.student_name}</h4>
                        <span className={styles.evalStudentDetails}>
                          Age: {student.student_age} | {student.student_gender}
                        </span>
                      </div>
                    </div>
                    <div className={styles.evalStudentTotal}>
                      <FiBarChart2 />
                      <span>{totals.total}/{totals.max}</span>
                    </div>
                  </div>

                  {/* Criteria by Area */}
                  <div className={styles.evalCriteriaList}>
                    {evaluationFormData.areas?.map(area => (
                      <div key={area.id} className={styles.evalAreaSection}>
                        <h5 className={styles.evalAreaName}>{area.area_name}</h5>
                        {area.criteria?.map(criterion => (
                          <div key={criterion.id} className={styles.evalCriterionRow}>
                            <div className={styles.evalCriterionInfo}>
                              <span className={styles.evalCriterionName}>{criterion.criteria_name}</span>
                              <span className={styles.evalCriterionMax}>Max: {criterion.max_points}</span>
                            </div>
                            <div className={styles.evalCriterionInputs}>
                              <select
                                value={scores[student.student_name]?.[criterion.id]?.score || 0}
                                onChange={(e) => updateScore(student.student_name, criterion.id, 'score', e.target.value)}
                                className={styles.evalScoreSelect}
                              >
                                {Array.from({ length: criterion.max_points + 1 }, (_, i) => (
                                  <option key={i} value={i}>{i}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Notes..."
                                value={scores[student.student_name]?.[criterion.id]?.notes || ''}
                                onChange={(e) => updateScore(student.student_name, criterion.id, 'notes', e.target.value)}
                                className={styles.evalNotesInput}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.emptyState}>
              <FiUserCheck className={styles.emptyIcon} />
              <p>No students found for this class</p>
            </div>
          )}
        </div>

        {/* Save Button */}
        {formStudents.length > 0 && (
          <div className={styles.evalFormActions}>
            <button 
              onClick={saveEvaluationScores} 
              className={styles.evalSaveBtn}
              disabled={formSaving}
            > 
              {formSaving ? 'Saving...' : <><FiSave /> Save All Scores</>}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render evaluation report view (read-only)
  const renderEvaluationReport = () => {
    if (reportLoading) {
      return (
        <div className={styles.evaluationsContainer}>
          <div className={styles.reportLoadingHeader}>
            <button onClick={handleBackToEvaluationList} className={styles.backBtnAlt}>
              <FiArrowLeft /> {t('back')}
            </button>
            <span className={styles.loadingText}>Loading report...</span>
          </div>
          <SkeletonLoader type="card" count={5} />
        </div>
      );
    }

    if (reportError) {
      return (
        <div className={styles.evaluationsContainer}>
          <div className={styles.reportLoadingHeader}>
            <button onClick={handleBackToEvaluationList} className={styles.backBtnAlt}>
              <FiArrowLeft /> {t('back')}
            </button>
          </div>
          <div className={styles.formErrorState}>
            <FiAlertCircle className={styles.emptyIcon} />
            <p>{reportError}</p>
          </div>
        </div>
      );
    }

    if (!reportData) return null;

    const evaluation = reportData.evaluation;

    // Calculate totals for each student
    const calculateReportTotal = (student) => {
      let total = 0;
      let max = 0;
      (reportData.areas || []).forEach(area => {
        (area.criteria || []).forEach(criterion => {
          const score = student.scores?.[criterion.id]?.score || 0;
          total += score;
          max += criterion.max_points || 0;
        });
      });
      return { total, max, percentage: max > 0 ? Math.round((total / max) * 100) : 0 };
    };

    return (
      <div className={styles.evaluationsContainer}>
        {/* Fixed Back Button */}
        <div className={styles.fixedBackButtonContainer}>
          <button onClick={handleBackToEvaluationList} className={styles.fixedBackButton}>
            <FiArrowLeft /> Back to Evaluations
          </button>
        </div>
        
        {/* Report Header */}
        <div className={styles.evalReportHeader}>
          <div className={styles.evalReportTitle}>
            <h2>{evaluation.evaluation_name}</h2>
            <span className={styles.evalReportSubtitle}>{t('viewReport')}</span>
            <div className={styles.evalFormMeta}>
              <span><FiBook /> {evaluation.subject_name}</span>
              <span><FiUserCheck /> {evaluation.class_name}</span>
              <span><FiCalendar /> {evaluation.term}</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className={styles.evalReportStats}>
          <div className={styles.evalReportStat}>
            <span className={styles.evalReportStatNum}>{reportData.students?.length || 0}</span>
            <small>Students</small>
          </div>
          <div className={styles.evalReportStat}>
            <span className={styles.evalReportStatNum}>
              {reportData.areas?.reduce((sum, area) => sum + (area.criteria?.length || 0), 0) || 0}
            </span>
            <small>Criteria</small>
          </div>
          <div className={styles.evalReportStat}>
            <span className={styles.evalReportStatNum}>
              {reportData.students?.length > 0 
                ? Math.round(reportData.students.reduce((sum, s) => sum + calculateReportTotal(s).percentage, 0) / reportData.students.length)
                : 0}%
            </span>
            <small>Avg Score</small>
          </div>
        </div>

        {/* Students Report */}
        <div className={styles.evalReportStudents}>
          {reportData.students?.length > 0 ? (
            reportData.students.map((student, studentIndex) => {
              const totals = calculateReportTotal(student);
              const studentKey = `report-${studentIndex}-${student.student_name}`;
              return (
                <div key={studentKey} className={styles.evalReportStudentCard}>
                  <div className={styles.evalReportStudentHeader}>
                    <div className={styles.evalStudentInfo}>
                      <span className={styles.evalStudentNum}>{studentIndex + 1}</span>
                      <div>
                        <h4 className={styles.evalStudentName}>{student.student_name}</h4>
                        <span className={styles.evalStudentDetails}>
                          Age: {student.student_age} | {student.student_gender}
                        </span>
                      </div>
                    </div>
                    <div className={`${styles.evalReportScore} ${totals.percentage >= 70 ? styles.scoreGood : totals.percentage >= 50 ? styles.scoreAvg : styles.scoreLow}`}>
                      <span className={styles.evalReportScoreNum}>{totals.total}/{totals.max}</span>
                      <span className={styles.evalReportScorePercent}>{totals.percentage}%</span>
                    </div>
                  </div>

                  {/* Criteria Scores */}
                  <div className={styles.evalReportCriteria}>
                    {reportData.areas?.map(area => (
                      <div key={area.id} className={styles.evalReportArea}>
                        <h5 className={styles.evalReportAreaName}>{area.area_name}</h5>
                        <div className={styles.evalReportCriteriaList}>
                          {area.criteria?.map(criterion => {
                            const scoreData = student.scores?.[criterion.id];
                            const score = scoreData?.score || 0;
                            const scorePercent = criterion.max_points > 0 ? Math.round((score / criterion.max_points) * 100) : 0;
                            return (
                              <div key={criterion.id} className={styles.evalReportCriterionRow}>
                                <div className={styles.evalReportCriterionInfo}>
                                  <span className={styles.evalReportCriterionName}>{criterion.criteria_name}</span>
                                  <div className={styles.evalReportScoreBar}>
                                    <div 
                                      className={`${styles.evalReportScoreBarFill} ${scorePercent >= 70 ? styles.barGood : scorePercent >= 50 ? styles.barAvg : styles.barLow}`}
                                      style={{ width: `${scorePercent}%` }}
                                    />
                                  </div>
                                </div>
                                <span className={styles.evalReportCriterionScore}>
                                  {score}/{criterion.max_points}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Notes if any */}
                        {area.criteria?.some(c => student.scores?.[c.id]?.notes) && (
                          <div className={styles.evalReportNotes}>
                            {area.criteria.map(criterion => {
                              const notes = student.scores?.[criterion.id]?.notes;
                              if (!notes) return null;
                              return (
                                <div key={`note-${criterion.id}`} className={styles.evalReportNote}>
                                  <strong>{criterion.criteria_name}:</strong> {notes}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.emptyState}>
              <FiUserCheck className={styles.emptyIcon} />
              <p>No student data available</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main evaluations tab renderer
  const renderEvaluationsTab = () => {
    if (evaluationView === 'form') {
      return renderEvaluationForm();
    }
    if (evaluationView === 'report') {
      return renderEvaluationReport();
    }
    return renderEvaluationList();
  };

  const renderPostsTab = () => (
    <div className={styles.feedContainer}>
      {postsLoading ? (
        <SkeletonLoader type="card" count={3} />
      ) : profilePosts.length > 0 ? (
        <div className={styles.postsFeed}>
          {profilePosts.map(post => <PostCard key={post.id} post={post} onLike={handleLike} />)}
        </div>
      ) : (
        <div className={styles.emptyFeed}>
          <div className={styles.emptyFeedIcon}>
            <FiFileText />
          </div>
          <h3>No Posts Yet</h3>
          <p>When there are posts for you, they'll show up here.</p>
        </div>
      )}
    </div>
  );

  const renderCommunicationsTab = () => (
    <div className={styles.communicationsContainer}>
      <TeacherCommunications user={profile} />
    </div>
  );

  // Day number to name mapping for schedule display
  const dayNumberToLabel = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
  const dayFullNames = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' };

  // Get unique periods and days from schedule
  const getScheduleGrid = () => {
    const periods = [...new Set(teacherSchedule.map(s => s.period))].sort((a, b) => a - b);
    const days = [...new Set(teacherSchedule.map(s => s.day))].sort((a, b) => a - b);
    return { periods, days };
  };

  // Get slot for specific day and period
  const getSlotForDayPeriod = (day, period) => {
    return teacherSchedule.find(s => s.day === day && s.period === period);
  };

  // Get shift label
  const getShiftLabel = (shift) => {
    if (shift === 1) return 'Morning Shift';
    if (shift === 2) return 'Afternoon Shift';
    return `Shift ${shift}`;
  };

  // Get unique shifts from schedule
  const getUniqueShifts = () => {
    return [...new Set(teacherSchedule.map(s => s.shift))].filter(Boolean).sort();
  };

  // Group schedule by shift
  const getScheduleByShift = () => {
    const byShift = {};
    teacherSchedule.forEach(slot => {
      const shiftKey = slot.shift || 1;
      if (!byShift[shiftKey]) {
        byShift[shiftKey] = [];
      }
      byShift[shiftKey].push(slot);
    });
    return byShift;
  };

  const renderScheduleTab = () => {
    const { periods, days } = getScheduleGrid();
    const totalPeriods = teacherSchedule.length;
    const totalDays = days.length;
    const shifts = getUniqueShifts();
    const scheduleByShift = getScheduleByShift();

    return (
      <div className={styles.scheduleContainer}>
        <h2 className={styles.tabTitle}>{t('mySchedule')}</h2>
        
        {scheduleLoading ? (
          <SkeletonLoader type="card" count={5} />
        ) : teacherSchedule.length > 0 ? (
          <>
            {/* Summary Stats */}
            <div className={styles.scheduleStats}>
              <div className={styles.scheduleStat}>
                <span className={styles.scheduleStatNum}>{totalPeriods}</span>
                <small>Total Periods</small>
              </div>
              <div className={styles.scheduleStat}>
                <span className={styles.scheduleStatNum}>{totalDays}</span>
                <small>Days/Week</small>
              </div>
              <div className={styles.scheduleStat}>
                <span className={styles.scheduleStatNum}>{shifts.length}</span>
                <small>Shift(s)</small>
              </div>
            </div>

            {/* Schedule grouped by Shift */}
            {shifts.map(shift => {
              const shiftSlots = scheduleByShift[shift] || [];
              const shiftDays = [...new Set(shiftSlots.map(s => s.day))].sort();
              const shiftPeriods = [...new Set(shiftSlots.map(s => s.period))].sort((a, b) => a - b);
              
              return (
                <div key={shift} className={styles.shiftSection}>
                  {/* Shift Header */}
                  <div className={`${styles.shiftHeader} ${shift === 2 ? styles.shiftHeader2 : styles.shiftHeader1}`}>
                    <FiClock />
                    <span>{getShiftLabel(shift)}</span>
                    <span className={styles.shiftPeriodCount}>{shiftSlots.length} periods</span>
                  </div>

                  {/* Timetable Grid for this shift */}
                  <div className={styles.timetableWrapper}>
                    <div className={styles.timetableGrid}>
                      {/* Header Row - Periods */}
                      <div className={`${styles.timetableHeader} ${shift === 2 ? styles.timetableHeader2 : ''}`}>
                        <div className={styles.timetableCorner}>Day</div>
                        {shiftPeriods.map(period => (
                          <div key={period} className={styles.timetablePeriodHeader}>
                            P{period}
                          </div>
                        ))}
                      </div>

                      {/* Day Rows */}
                      {shiftDays.map(day => (
                        <div key={day} className={styles.timetableRow}>
                          <div className={styles.timetableDayCell}>
                            {dayNumberToLabel[day]}
                          </div>
                          {shiftPeriods.map(period => {
                            const slot = shiftSlots.find(s => s.day === day && s.period === period);
                            return (
                              <div key={period} className={`${styles.timetableCell} ${slot ? (shift === 2 ? styles.timetableCellShift2 : styles.timetableCellFilled) : ''}`}>
                                {slot ? (
                                  <>
                                    <span className={styles.cellClass}>{slot.class}</span>
                                    <span className={styles.cellSubject}>{slot.subject}</span>
                                  </>
                                ) : (
                                  <span className={styles.cellEmpty}>-</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed List for this shift */}
                  <div className={styles.scheduleList}>
                    {shiftDays.map(day => {
                      const daySlots = shiftSlots.filter(s => s.day === day).sort((a, b) => a.period - b.period);
                      if (daySlots.length === 0) return null;
                      return (
                        <div key={day} className={styles.scheduleDayCard}>
                          <div className={`${styles.scheduleDayHeader} ${shift === 2 ? styles.scheduleDayHeader2 : ''}`}>
                            <FiCalendar />
                            <span>{dayFullNames[day]}</span>
                            <span className={styles.dayPeriodCount}>{daySlots.length} periods</span>
                          </div>
                          <div className={styles.schedulePeriods}>
                            {daySlots.map((slot, idx) => (
                              <div key={idx} className={styles.schedulePeriodItem}>
                                <div className={`${styles.periodNumber} ${shift === 2 ? styles.periodNumber2 : ''}`}>P{slot.period}</div>
                                <div className={styles.periodDetails}>
                                  <span className={styles.periodClass}>{slot.class}</span>
                                  <span className={styles.periodSubject}>{slot.subject}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className={styles.emptyState}>
            <FiCalendar className={styles.emptyIcon} />
            <p>No schedule assigned yet</p>
            <small>Your teaching schedule will appear here once assigned</small>
          </div>
        )}
      </div>
    );
  };

  // Render Mark List Tab
  const renderMarkListTab = () => {
    const subjects = getMarkListSubjects();
    const classes = getMarkListClasses();
    const terms = getMarkListTerms();
    const progress = getMarkListProgress();
    
    // Filter students by search query
    const filteredMarkListData = markListData.filter(student =>
      student.student_name?.toLowerCase().includes(markListSearchQuery.toLowerCase())
    );

    return (
      <div className={styles.markListContainer}>
        <h2 className={styles.tabTitle}><FiList /> Mark List</h2>
        
        {markListLoading && !markListData.length ? (
          <SkeletonLoader type="card" count={3} />
        ) : teacherAssignments.length === 0 ? (
          <div className={styles.emptyState}>
            <FiList className={styles.emptyIcon} />
            <p>No mark lists assigned</p>
            <small>You will see your assigned mark lists here once the admin assigns you to subjects</small>
          </div>
        ) : (
          <>
            {/* Filter Controls */}
            <div className={styles.markListFilters}>
              <div className={styles.filterGroup}>
                <label>Subject</label>
                <select 
                  value={selectedMarkListSubject} 
                  onChange={(e) => {
                    setSelectedMarkListSubject(e.target.value);
                    setSelectedMarkListClass('');
                    setSelectedMarkListTerm(1);
                    setMarkListData([]);
                    setMarkListConfig(null);
                  }}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label>Class</label>
                <select 
                  value={selectedMarkListClass} 
                  onChange={(e) => {
                    setSelectedMarkListClass(e.target.value);
                    setSelectedMarkListTerm(1);
                    setMarkListData([]);
                    setMarkListConfig(null);
                  }}
                  disabled={!selectedMarkListSubject}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label>Term</label>
                <select 
                  value={selectedMarkListTerm} 
                  onChange={(e) => {
                    setSelectedMarkListTerm(parseInt(e.target.value));
                    setMarkListData([]);
                    setMarkListConfig(null);
                  }}
                  disabled={!selectedMarkListClass}
                >
                  {terms.length > 0 ? terms.map(term => (
                    <option key={term} value={term}>Term {term}</option>
                  )) : (
                    <option value="">No terms available</option>
                  )}
                </select>
              </div>
              
              <button 
                className={styles.loadMarkListBtn}
                onClick={loadMarkListData}
                disabled={!selectedMarkListSubject || !selectedMarkListClass || !terms.length || markListLoading}
              >
                {markListLoading ? 'Loading...' : 'Load'}
              </button>
            </div>

            {/* Mark List Content */}
            {markListData.length > 0 && markListConfig && (
              <>
                {/* Progress Bar */}
                <div className={styles.markListProgress}>
                  <div className={styles.progressInfo}>
                    <span>{progress.completed}/{progress.total} completed</span>
                    <span>{Math.round(progress.percentage)}%</span>
                  </div>
                  <div className={styles.progressBarContainer}>
                    <div 
                      className={styles.progressBarFill} 
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Search */}
                <div className={styles.markListSearch}>
                  <FiSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={markListSearchQuery}
                    onChange={(e) => setMarkListSearchQuery(e.target.value)}
                  />
                </div>

                {/* Student Cards */}
                <div className={styles.markListStudents}>
                  {filteredMarkListData.map((student, idx) => (
                    <div key={student.id} className={styles.markListStudentCard}>
                      <div className={styles.studentHeader}>
                        <span className={styles.studentNum}>{idx + 1}</span>
                        <div className={styles.studentInfo}>
                          <span className={styles.studentName}>{student.student_name}</span>
                          <span className={styles.studentMeta}>{student.gender} • Age {student.age}</span>
                        </div>
                        <div className={`${styles.studentStatus} ${student.pass_status === 'Pass' ? styles.statusPass : styles.statusFail}`}>
                          {student.total || 0}
                        </div>
                      </div>
                      
                      <div className={styles.markInputs}>
                        {markListConfig.mark_components.map(component => {
                          const componentKey = component.name.toLowerCase().replace(/\s+/g, '_');
                          return (
                            <div key={component.name} className={styles.markInputGroup}>
                              <label>{component.name} ({component.percentage}%)</label>
                              <input
                                type="number"
                                min="0"
                                max={component.percentage}
                                value={student[componentKey] || 0}
                                onChange={(e) => handleMarkListMarkChange(student.id, componentKey, e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                      
                      <button 
                        className={styles.saveStudentBtn}
                        onClick={() => saveStudentMarks(student.id)}
                        disabled={savingMarks}
                      >
                        <FiSave /> Save
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {markListMessage && (
              <div className={styles.markListMessage}>{markListMessage}</div>
            )}
          </>
        )}
      </div>
    );
  };

  // Calculate attendance stats for selected day
  const attendanceStats = {
    total: students.length,
    present: Object.values(attendanceRecords).filter(r => r[selectedDay] === 'P').length,
    absent: Object.values(attendanceRecords).filter(r => r[selectedDay] === 'A').length,
    late: Object.values(attendanceRecords).filter(r => r[selectedDay] === 'L').length,
    permission: Object.values(attendanceRecords).filter(r => r[selectedDay] === 'E').length
  };

  // Check if current week attendance exists
  const currentWeekExists = weeklyTables.includes(`week_${currentWeekMonday.replace(/-/g, '_')}`);
  
  // Check if next week attendance exists
  const nextWeekMonday = getNextWeekMonday();
  const nextWeekExists = weeklyTables.includes(`week_${nextWeekMonday.replace(/-/g, '_')}`);

  // Calculate weekly report for a student
  const getStudentWeeklyReport = (studentKey) => {
    const record = attendanceRecords[studentKey] || {};
    let present = 0, absent = 0, late = 0, permission = 0;
    schoolDays.forEach(day => {
      if (record[day] === 'P') present++;
      else if (record[day] === 'A') absent++;
      else if (record[day] === 'L') late++;
      else if (record[day] === 'E') permission++;
    });
    const total = schoolDays.length;
    const attendanceRate = total > 0 ? Math.round(((present + late * 0.5 + permission * 0.75) / total) * 100) : 0;
    return { present, absent, late, permission, total, attendanceRate };
  };

  // Get status icon
  const getStatusIcon = (status) => {
    if (status === 'P') return <span className={styles.statusIconP}>✓</span>;
    if (status === 'A') return <span className={styles.statusIconA}>✗</span>;
    if (status === 'L') return <span className={styles.statusIconL}>◐</span>;
    if (status === 'E') return <span className={styles.statusIconE}>E</span>;
    return <span className={styles.statusIconEmpty}>-</span>;
  };

  const renderAttendanceTab = () => (
    <div className={styles.attendanceContainer}>
      {/* Header */}
      <div className={styles.attHeader}>
        <div className={styles.attHeaderTop}>
          <h2><FiUserCheck /> {t('attendance')}</h2>
          <span className={styles.classBadge}>{assignedClass}</span>
        </div>
        
        {/* Mode Toggle */}
        <div className={styles.modeToggle}>
          <button 
            className={`${styles.modeBtn} ${attendanceMode === 'mark' ? styles.modeBtnActive : ''}`}
            onClick={() => setAttendanceMode('mark')}
          >
            <FiUserCheck /> {t('markAttendance')}
          </button>
          <button 
            className={`${styles.modeBtn} ${attendanceMode === 'view' ? styles.modeBtnActive : ''}`}
            onClick={() => setAttendanceMode('view')}
          >
            <FiEye /> {t('viewReport')}
          </button>
        </div>
      </div>

      {/* Week Selector */}
      <div className={styles.weekRow}>
        {weeklyTables.length > 0 ? (
          <select 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className={styles.weekSelect}
          >
            {weeklyTables.map(table => {
              const weekDate = table.replace('week_', '').replace(/_/g, '-');
              return (
                <option key={table} value={weekDate}>Week of {weekDate}</option>
              );
            })}
          </select>
        ) : (
          <span className={styles.noWeeksText}>No attendance yet</span>
        )}
        <button onClick={() => setShowNewWeekModal(true)} className={styles.newWeekBtn}>
          <FiCalendar /> + {t('createWeek')}
        </button>
      </div>

      {/* Quick Create */}
      {(!currentWeekExists || !nextWeekExists) && (
        <div className={styles.quickCreateRow}>
          {!currentWeekExists && (
            <button onClick={() => createWeeklyAttendance(currentWeekMonday)} className={styles.quickCreateBtn} disabled={creatingAttendance}>
              + {t('currentWeek')}
            </button>
          )}
          {!nextWeekExists && (
            <button onClick={createNextWeekAttendance} className={styles.quickCreateBtnAlt} disabled={creatingAttendance}>
              + {t('nextWeek')}
            </button>
          )}
        </div>
      )}

      {/* New Week Modal */}
      {showNewWeekModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewWeekModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Create Week Attendance</h3>
            <p>Select a date to create attendance for that week. The system will use the Monday of the selected week.</p>
            <label className={styles.modalLabel}>Select Week Start Date</label>
            <input 
              type="date" 
              value={newWeekDate} 
              onChange={(e) => setNewWeekDate(e.target.value)} 
              className={styles.modalInput}
              placeholder="Select date"
            />
            <div className={styles.modalButtons}>
              <button onClick={() => setShowNewWeekModal(false)} className={styles.modalCancelBtn}>
                Cancel
              </button>
              <button 
                onClick={() => createWeeklyAttendance()} 
                className={styles.modalCreateBtn} 
                disabled={!newWeekDate || creatingAttendance}
              >
                {creatingAttendance ? 'Creating...' : 'Create Week'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARK MODE */}
      {attendanceMode === 'mark' && weeklyAttendanceExists && (
        <>
          {/* Day Tabs */}
          <div className={styles.dayTabs}>
            {schoolDays.map(day => (
              <button
                key={day}
                className={`${styles.dayTab} ${selectedDay === day ? styles.dayTabActive : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                {dayLabels[day]}
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActionsRow}>
            <button onClick={() => markAllAs('P')} className={styles.qaBtnP}><FiCheck /></button>
            <button onClick={() => markAllAs('A')} className={styles.qaBtnA}><FiX /></button>
            <button onClick={() => markAllAs('L')} className={styles.qaBtnL}><FiClock /></button>
            <button onClick={() => markAllAs('E')} className={styles.qaBtnE}>E</button>
          </div>

          {/* Stats */}
          <div className={styles.statsRow}>
            <div className={styles.statBox}><span className={styles.statNumP}>{attendanceStats.present}</span><small>Present</small></div>
            <div className={styles.statBox}><span className={styles.statNumA}>{attendanceStats.absent}</span><small>Absent</small></div>
            <div className={styles.statBox}><span className={styles.statNumL}>{attendanceStats.late}</span><small>Late</small></div>
            <div className={styles.statBox}><span className={styles.statNumE}>{attendanceStats.permission}</span><small>Perm.</small></div>
          </div>

          {/* Student List for Marking */}
          <div className={styles.studentList}>
            {students.map((student, idx) => {
              const key = `${student.school_id}-${student.class_id}`;
              const record = attendanceRecords[key] || {};
              const currentStatus = record[selectedDay] || '';
              
              return (
                <div key={key} className={styles.studentRow}>
                  <div className={styles.studentInfo}>
                    <span className={styles.sNum}>{idx + 1}</span>
                    <span className={styles.sName}>{student.student_name}</span>
                  </div>
                  <div className={styles.markBtns}>
                    <button className={`${styles.mBtn} ${styles.mBtnP} ${currentStatus === 'P' ? styles.mBtnActive : ''}`} onClick={() => handleAttendanceStatusChange(key, selectedDay, 'P')}>P</button>
                    <button className={`${styles.mBtn} ${styles.mBtnA} ${currentStatus === 'A' ? styles.mBtnActive : ''}`} onClick={() => handleAttendanceStatusChange(key, selectedDay, 'A')}>A</button>
                    <button className={`${styles.mBtn} ${styles.mBtnL} ${currentStatus === 'L' ? styles.mBtnActive : ''}`} onClick={() => handleAttendanceStatusChange(key, selectedDay, 'L')}>L</button>
                    <button className={`${styles.mBtn} ${styles.mBtnE} ${currentStatus === 'E' ? styles.mBtnActive : ''}`} onClick={() => handleAttendanceStatusChange(key, selectedDay, 'E')}>E</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save Button */}
          <div className={styles.saveSection}>
            <button className={styles.saveBtn} onClick={saveAttendance} disabled={savingAttendance}>
              {savingAttendance ? t('loading') : <><FiSave /> {t('saveAttendance')}</>}
            </button>
          </div>
        </>
      )}

      {/* VIEW/REPORT MODE */}
      {attendanceMode === 'view' && weeklyAttendanceExists && (
        <>
          {/* Weekly Report Header */}
          <div className={styles.reportHeader}>
            <h3>Weekly Report - {selectedWeek}</h3>
          </div>

          {/* Report Table */}
          <div className={styles.reportTable}>
            <div className={styles.reportHeaderRow}>
              <span className={styles.reportColName}>Student</span>
              {schoolDays.map(day => (
                <span key={day} className={styles.reportColDay}>{dayLabels[day]}</span>
              ))}
              <span className={styles.reportColRate}>%</span>
            </div>
            
            {students.map((student, idx) => {
              const key = `${student.school_id}-${student.class_id}`;
              const record = attendanceRecords[key] || {};
              const report = getStudentWeeklyReport(key);
              
              return (
                <div key={key} className={styles.reportRow}>
                  <span className={styles.reportColName}>
                    <span className={styles.reportNum}>{idx + 1}</span>
                    {student.student_name}
                  </span>
                  {schoolDays.map(day => (
                    <span key={day} className={styles.reportColDay}>
                      {getStatusIcon(record[day])}
                    </span>
                  ))}
                  <span className={`${styles.reportColRate} ${report.attendanceRate >= 80 ? styles.rateGood : report.attendanceRate >= 60 ? styles.rateWarn : styles.rateBad}`}>
                    {report.attendanceRate}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className={styles.reportSummary}>
            <h4>Week Summary</h4>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Total Students</span>
                <span className={styles.summaryValue}>{students.length}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>School Days</span>
                <span className={styles.summaryValue}>{schoolDays.length}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Avg. Attendance</span>
                <span className={styles.summaryValue}>
                  {students.length > 0 
                    ? Math.round(students.reduce((sum, s) => sum + getStudentWeeklyReport(`${s.school_id}-${s.class_id}`).attendanceRate, 0) / students.length)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!weeklyAttendanceExists && !attendanceLoading && (
        <div className={styles.emptyState}>
          <FiCalendar className={styles.emptyIcon} />
          <p>No attendance for this week</p>
          <small>Create a new week to start marking attendance</small>
        </div>
      )}

      {attendanceLoading && <SkeletonLoader type="card" count={5} />}
    </div>
  );

  const renderEvalBookTab = () => {
    // Show form view
    if (evalBookView === 'form') {
      return (
        <div className={styles.evalBookContainer}>
          {/* Header with back button */}
          <div className={styles.evalFormHeader}>
            <button className={styles.evalBackBtn} onClick={backToEvalBookList}>
              <FiArrowLeft /> {t('back') || 'Back'}
            </button>
            <div className={styles.evalFormTitle}>
              <h3>{selectedEvalClass}</h3>
              <span>{evalDate}</span>
            </div>
          </div>

          {evalFormError && (
            <div className={styles.evalFormError}>
              <FiAlertCircle /> {evalFormError}
            </div>
          )}
          {evalFormSuccess && (
            <div className={styles.evalFormSuccess}>
              <FiCheck /> {evalFormSuccess}
            </div>
          )}

          {evalFormLoading ? (
            <div style={{ padding: '0 16px' }}>
              <SkeletonLoader type="card" count={5} />
            </div>
          ) : !evalTemplate ? (
            <div className={styles.emptyState}>
              <FiAlertCircle className={styles.emptyIcon} />
              <p>{t('noTemplate') || 'No evaluation template found'}</p>
              <small>{t('contactAdmin') || 'Contact administrator to set up a template'}</small>
            </div>
          ) : (
            <>
              {/* Date selector */}
              <div className={styles.evalDatePicker}>
                <label><FiCalendar /> {t('evaluationDate') || 'Date'}:</label>
                <input 
                  type="date" 
                  value={evalDate} 
                  onChange={(e) => setEvalDate(e.target.value)}
                />
              </div>

              {/* Student evaluations */}
              <div className={styles.evalStudentsList}>
                {evalStudents.map((student, idx) => (
                  <CollapsibleCard 
                    key={student.student_name} 
                    title={`${idx + 1}. ${student.student_name}`} 
                    icon={<FiUser />}
                    defaultExpanded={idx === 0}
                  >
                    <div className={styles.evalFieldsList}>
                      {evalTemplate.fields?.filter(f => !f.is_guardian_field).map(field => (
                        <div key={field.id} className={styles.evalFieldItem}>
                          <label className={styles.evalFieldLabel}>
                            {field.field_name}
                            {field.required && <span className={styles.required}>*</span>}
                          </label>
                          
                          {field.field_type === 'rating' ? (
                            <div className={styles.evalRating}>
                              {[...Array(field.max_rating || 5)].map((_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className={`${styles.evalStar} ${(evalEntries[student.student_name]?.field_values?.[field.id] || 0) > i ? styles.evalStarActive : ''}`}
                                  onClick={() => handleEvalFieldChange(student.student_name, field.id, i + 1)}
                                >
                                  <FiStar />
                                </button>
                              ))}
                              <span className={styles.evalRatingValue}>
                                {evalEntries[student.student_name]?.field_values?.[field.id] || 0}/{field.max_rating || 5}
                              </span>
                            </div>
                          ) : field.field_type === 'textarea' ? (
                            <textarea
                              className={styles.evalTextarea}
                              value={evalEntries[student.student_name]?.field_values?.[field.id] || ''}
                              onChange={(e) => handleEvalFieldChange(student.student_name, field.id, e.target.value)}
                              placeholder={`Enter ${field.field_name.toLowerCase()}...`}
                              rows={3}
                            />
                          ) : field.field_type === 'number' ? (
                            <input
                              type="number"
                              className={styles.evalInput}
                              value={evalEntries[student.student_name]?.field_values?.[field.id] || ''}
                              onChange={(e) => handleEvalFieldChange(student.student_name, field.id, e.target.value)}
                              placeholder={`Enter ${field.field_name.toLowerCase()}...`}
                            />
                          ) : field.field_type === 'date' ? (
                            <input
                              type="date"
                              className={styles.evalInput}
                              value={evalEntries[student.student_name]?.field_values?.[field.id] || ''}
                              onChange={(e) => handleEvalFieldChange(student.student_name, field.id, e.target.value)}
                            />
                          ) : field.field_type === 'select' ? (
                            <select
                              className={styles.evalSelect}
                              value={evalEntries[student.student_name]?.field_values?.[field.id] || ''}
                              onChange={(e) => handleEvalFieldChange(student.student_name, field.id, e.target.value)}
                            >
                              <option value="">Select {field.field_name.toLowerCase()}...</option>
                              {(field.options || []).map((opt, optIdx) => (
                                <option key={optIdx} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.field_type === 'multi-select' ? (
                            <div className={styles.evalMultiSelect}>
                              {(field.options || []).map((opt, optIdx) => {
                                const currentValues = evalEntries[student.student_name]?.field_values?.[field.id] || [];
                                const isChecked = Array.isArray(currentValues) ? currentValues.includes(opt) : false;
                                return (
                                  <label key={optIdx} className={styles.evalMultiOption}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const current = Array.isArray(currentValues) ? [...currentValues] : [];
                                        if (e.target.checked) {
                                          current.push(opt);
                                        } else {
                                          const idx = current.indexOf(opt);
                                          if (idx > -1) current.splice(idx, 1);
                                        }
                                        handleEvalFieldChange(student.student_name, field.id, current);
                                      }}
                                    />
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : field.field_type === 'checkbox' ? (
                            <label className={styles.evalCheckbox}>
                              <input
                                type="checkbox"
                                checked={evalEntries[student.student_name]?.field_values?.[field.id] || false}
                                onChange={(e) => handleEvalFieldChange(student.student_name, field.id, e.target.checked)}
                              />
                              <span>{field.field_name}</span>
                            </label>
                          ) : field.field_type === 'upload' ? (
                            <div className={styles.evalUpload}>
                              <input
                                type="file"
                                className={styles.evalFileInput}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleEvalFieldChange(student.student_name, field.id, file.name);
                                  }
                                }}
                              />
                              {evalEntries[student.student_name]?.field_values?.[field.id] && (
                                <span className={styles.evalFileName}>
                                  {evalEntries[student.student_name]?.field_values?.[field.id]}
                                </span>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              className={styles.evalInput}
                              value={evalEntries[student.student_name]?.field_values?.[field.id] || ''}
                              onChange={(e) => handleEvalFieldChange(student.student_name, field.id, e.target.value)}
                              placeholder={`Enter ${field.field_name.toLowerCase()}...`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleCard>
                ))}
              </div>

              {/* Action button */}
              <div className={styles.evalBookActions}>
                <button 
                  className={styles.evalBookSubmitBtn}
                  onClick={() => saveEvalEntries(true)}
                  disabled={evalFormSaving}
                >
                  <FiSend /> {evalFormSaving ? t('sending') || 'Sending...' : t('saveAndSend') || 'Save & Send'}
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    // Show reports view
    if (evalBookView === 'reports') {
      return (
        <div className={styles.evalBookContainer}>
          <div className={styles.evalFormHeader}>
            <button className={styles.evalBackBtn} onClick={backToEvalBookList}>
              <FiArrowLeft /> {t('back') || 'Back'}
            </button>
            <div className={styles.evalFormTitle}>
              <h3>{t('evalReports') || 'Evaluation Reports'}</h3>
            </div>
          </div>

          {evalReportsLoading ? (
            <div style={{ padding: '0 16px' }}>
              <SkeletonLoader type="card" count={5} />
            </div>
          ) : evalReports.length === 0 ? (
            <div className={styles.emptyState}>
              <FiFileText className={styles.emptyIcon} />
              <p>{t('noReports') || 'No evaluation reports yet'}</p>
            </div>
          ) : (
            <div className={styles.evalReportsList}>
              {evalReports.map((report) => (
                <div key={report.id} className={styles.evalReportCard} onClick={() => setSelectedEvalReport(report)}>
                  <div className={styles.evalReportHeader}>
                    <span className={styles.evalReportStudent}>{report.student_name}</span>
                    <span className={`${styles.evalReportStatus} ${report.status === 'responded' ? styles.statusResponded : styles.statusPending}`}>
                      {report.status === 'responded' ? 'Responded' : 'Pending'}
                    </span>
                  </div>
                  <div className={styles.evalReportMeta}>
                    <span><FiUsers /> {report.class_name}</span>
                    <span><FiCalendar /> {new Date(report.evaluation_date).toLocaleDateString()}</span>
                  </div>
                  {report.feedback_text && (
                    <div className={styles.evalReportFeedback}>
                      <FiMessageSquare /> Guardian feedback received
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Report Detail Modal */}
          {selectedEvalReport && (
            <div className={styles.evalReportModal} onClick={() => setSelectedEvalReport(null)}>
              <div className={styles.evalReportModalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.evalReportModalHeader}>
                  <h3>{selectedEvalReport.student_name}</h3>
                  <button onClick={() => setSelectedEvalReport(null)}>×</button>
                </div>
                <div className={styles.evalReportModalBody}>
                  <p><strong>Class:</strong> {selectedEvalReport.class_name}</p>
                  <p><strong>Date:</strong> {new Date(selectedEvalReport.evaluation_date).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> {selectedEvalReport.status}</p>
                  
                  <h4>Evaluation Data</h4>
                  <div className={styles.evalReportFields}>
                    {Object.entries(selectedEvalReport.field_values || {}).map(([key, value]) => (
                      <div key={key} className={styles.evalReportFieldItem}>
                        <span>{key}:</span> <span>{value}</span>
                      </div>
                    ))}
                  </div>
                  
                  {selectedEvalReport.feedback_text && (
                    <>
                      <h4>Guardian Feedback</h4>
                      <div className={styles.evalReportFeedbackBox}>
                        {selectedEvalReport.feedback_text}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Show class list view
    return (
      <div className={styles.evalBookContainer}>
        {/* Header */}
        <div className={styles.evalBookHeader}>
          <h2><FiBook /> {t('evalBook') || 'Evaluation Book'}</h2>
          <p>{t('evalBookDesc') || 'Daily student evaluations for guardians'}</p>
        </div>

        {/* View Reports Button */}
        <button className={styles.evalViewReportsBtn} onClick={showEvalReports}>
          <FiFileText /> {t('viewReports') || 'View Reports'}
        </button>

        {/* Class List */}
        {evalBookLoading ? (
          <div style={{ padding: '0 16px' }}>
            <SkeletonLoader type="card" count={3} />
          </div>
        ) : evalBookAssignments.length === 0 ? (
          <div className={styles.emptyState}>
            <FiBook className={styles.emptyIcon} />
            <p>{t('noEvalBookAssignments') || 'No evaluation book classes assigned'}</p>
            <small>{t('contactAdmin') || 'Contact your administrator to get assigned to classes'}</small>
          </div>
        ) : (
          <div className={styles.evalBookList}>
            {evalBookAssignments.map((assignment, index) => (
              <div 
                key={assignment.id || index} 
                className={styles.evalBookItem}
                onClick={() => openEvalBookForm(assignment.class_name)}
              >
                <div className={styles.evalBookIcon}>
                  <FiUsers />
                </div>
                <div className={styles.evalBookInfo}>
                  <span className={styles.evalBookClass}>{assignment.class_name}</span>
                  <span className={styles.evalBookStudents}>
                    {t('tapToFill') || 'Tap to fill evaluation form'}
                  </span>
                </div>
                <span className={styles.evalBookArrow}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSettingsTab = () => (
    <SettingsTab userId={user?.username} userType="staff" />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileTab();
      case 'schedule': return isTeacher ? renderScheduleTab() : renderProfileTab();
      case 'marklist': return isTeacher ? renderMarkListTab() : renderProfileTab();
      case 'class': return isTeacher ? (
        <ClassCommunicationTab
          userType="teacher"
          userId={profile?.global_staff_id}
          userName={profile?.name}
        />
      ) : renderProfileTab();
      case 'attendance': return isClassTeacher ? renderAttendanceTab() : renderProfileTab();
      case 'evalbook': return renderEvalBookTab();
      case 'evaluations': return renderEvaluationsTab();
      case 'posts': return renderPostsTab();
      case 'communications': return renderCommunicationsTab();
      case 'settings': return renderSettingsTab();
      default: return renderProfileTab();
    }
  };

  if (isLoading) {
    return (
      <MobileProfileLayout title="Staff Profile" onLogout={handleLogout}>
        <SkeletonLoader type="profile" />
        <BottomNavigation items={getNavItems()} activeItem={activeTab} onItemClick={setActiveTab} />
      </MobileProfileLayout>
    );
  }

  if (!user || !profile) {
    return (
      <MobileProfileLayout title="Staff Profile" onLogout={handleLogout}>
        <div className={styles.errorContainer}>
          <p>Unable to load profile data</p>
          <button onClick={() => navigate('/app/staff-login')} className={styles.retryButton}>Go to Login</button>
        </div>
        <BottomNavigation items={getNavItems()} activeItem={activeTab} onItemClick={setActiveTab} />
      </MobileProfileLayout>
    );
  }

  return (
    <MobileProfileLayout title="Staff Profile" onLogout={handleLogout} onRefresh={handleRefresh}>
      {renderContent()}
      <BottomNavigation items={getNavItems()} activeItem={activeTab} onItemClick={setActiveTab} />
      <toast.ToastContainer />
    </MobileProfileLayout>
  );
};

export default StaffProfile;
