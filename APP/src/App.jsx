// Updated App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./PAGE/Home";
import CreateRegisterStaff from "./PAGE/CreateRegister/CreateRegisterStaff/CreateRegisterStaff";
import CreateRegisterStudent from "./PAGE/CreateRegister/CreateRegisterStudent/CreateRegisterStudent";
import StudentFormBuilder from "./PAGE/CreateRegister/CreateRegisterStudent/StudentFormBuilder";
import StaffFormBuilder from "./PAGE/CreateRegister/CreateRegisterStaff/StaffFormBuilder";
import ListStudent from "./PAGE/List/ListStudent/ListStudent";
import ListStaff from "./PAGE/List/ListStaff/ListStaff";
import ListGuardian from "./PAGE/List/ListGuardian/ListGuardian";
import { EvaluationManager } from "./PAGE/Evaluation/Evaluation";  // Changed to named import
import EvaluationFormPage from "./PAGE/Evaluation/EvaluationFormPage";
import EvaluationFormDisplay from "./PAGE/Evaluation/EvaluationFormDisplay";
import EvaluationDetailsView from "./PAGE/Evaluation/EvaluationDetailsView";
import ErrorBoundary from "./COMPONENTS/ErrorBoundary";
import MarkListView from "./PAGE/MarkListView/MarkListView";
import AttendanceView from "./PAGE/AttendanceView/AttendanceView";
import CreateAttendance from "./PAGE/AttendanceView/CreateAttendance";
// Counsellor removed - not used
import Post from "./PAGE/Post/Post";
import MarkListSystem from "./PAGE/CreateMarklist/CreateMarklist/CreateMarklist";
import MarkListManagement from "./PAGE/CreateMarklist/MarkListManagement";
// SubjectMappingSetup removed - not used
import "./PAGE/CreateMarklist/CreateMarklist/MarkListFrontend.css";
import ReportCard from "./PAGE/CreateMarklist/ReportCard/ReportCard";
// Roaster removed - not used
import CreateAccounts from "./PAGE/CreateAccounts/CreateAccounts";
// PaymentList removed
// BranchCreate removed - not used
import Dashboard from "./PAGE/Dashboard/Dashboard";
import StudentFaults from "./PAGE/StudentFaults/StudentFaultsS";
import ScheduleDashboard from "./PAGE/Schedule/ScheduleDashboard";
import ScheduleTimetable from "./PAGE/Schedule/ScheduleTimetable";
import ClassRequirementsForm from './PAGE/Schedule/ClassRequirementsForm';
import ClassShiftForm from './PAGE/Schedule/ClassShiftForm';
import Setting from "./PAGE/Setting/Setting";
import Students from "./Students/Students";
import Staff from "./Staff/Staff";
import PostStudents from "./Students/PostStudents/PostStudents";
import ClassStudents from "./Students/ClassStudents/ClassStudents";
import CommunicationStudents from "./Students/CommunicationStudents/CommunicationStudents";
import ProfileStudents from "./Students/ProfileStudents/ProfileStudents";
import POSTS from "./Staff/POSTS/POSTS";
import PF from "./Staff/PF/PF";
import MRLIST from "./Staff/MRLIST/MRLIST";
import EVA from "./Staff/EVA/EVA";
import PV from "./Staff/PV/PV";
import COMSTA from "./Staff/COMSTA/COMSTA";
import StaffAttendance from "./Staff/ATTENDANCE/StaffAttendance";
import ClassTeacherAssignment from "./PAGE/AttendanceView/ClassTeacherAssignment";
import StaffLogin from "./COMPONENTS/StaffLogin";
import StaffProfile from "./COMPONENTS/StaffProfile";
import StudentProfile from "./COMPONENTS/StudentProfile";
import GuardianProfile from "./COMPONENTS/GuardianProfile";
import StudentLogin from "./COMPONENTS/StudentLogin";
import GuardianLogin from "./COMPONENTS/GuardianLogin";
import DirectorCommunication from "./PAGE/Communication/DirectorCommunication";
import AdminCommunications from "./PAGE/Communication/AdminCommunications";
import { EvaluationBookFormBuilder, TeacherAssignmentManager, TeacherClassList, DailyEvaluationForm, GuardianEvaluationInbox, GuardianFeedbackForm, EvaluationBookReports } from "./PAGE/EvaluationBook";
import { Provider } from 'react-redux';
import { store } from '../src/PAGE/store';
import InitialRedirect from "./COMPONENTS/InitialRedirect";  
import ProtectedRoute from "./COMPONENTS/ProtectedRoute";
import Login from "./PAGE/Login/Login";
import TaskPage from "./PAGE/TaskPage";  
import TaskDetail from "./PAGE/TaskDetail";  
import StaffForm from "./PAGE/CreateRegister/CreateRegisterStaff/StaffForm"; 
import AdminSubAccounts from "./PAGE/AdminSubAccounts/AdminSubAccounts";
import { useParams } from "react-router-dom";

// Redirect components for legacy routes with params
const StudentProfileRedirect = () => {
  const { username } = useParams();
  return <Navigate to={`/app/student/${username}`} replace />;
};

const GuardianProfileRedirect = () => {
  const { username } = useParams();
  return <Navigate to={`/app/guardian/${username}`} replace />;
};

function App() {
  return (
    <div>
      <Provider store={store}>
        <Routes>
          {/* Public Route - Login */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <InitialRedirect>
                <Home />
              </InitialRedirect>
            </ProtectedRoute>
          }>
              <Route index element={<Post />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="create-register-student" element={<CreateRegisterStudent />} />
              <Route path="Student-Form-Builder" element={<StudentFormBuilder />} />
              <Route path="Staff-Form-Builder" element={<StaffFormBuilder />} />
              <Route path="create-register-staff" element={<CreateRegisterStaff />} />
              <Route path="list-student" element={<ListStudent />} />
              <Route path="list-staff" element={<ListStaff />} />
              <Route path="list-guardian" element={<ListGuardian />} />
              <Route
                path="evaluation"
                element={
                  <ErrorBoundary>
                    <EvaluationManager />
                  </ErrorBoundary>
                }
              />
              <Route
                path="evaluation-form/:evaluationId"
                element={
                  <ErrorBoundary>
                    <EvaluationFormPage />
                  </ErrorBoundary>
                }
              />
              <Route path="/evaluation-form/:id" element={<EvaluationFormDisplay />} />
              <Route path="/evaluation/:id" element={<EvaluationDetailsView />} />
              <Route path="evaluation-book" element={<EvaluationBookFormBuilder />} />
              <Route path="evaluation-book/assignments" element={<TeacherAssignmentManager />} />
              <Route path="evaluation-book/teacher" element={<TeacherClassList />} />
              <Route path="evaluation-book/daily/:className" element={<DailyEvaluationForm />} />
              <Route path="evaluation-book/guardian" element={<GuardianEvaluationInbox />} />
              <Route path="evaluation-book/guardian/feedback/:evaluationId" element={<GuardianFeedbackForm />} />
              <Route path="evaluation-book/reports" element={<EvaluationBookReports />} />
              <Route path="mark-list-view" element={<MarkListView />} />
              <Route path="attendance-view" element={<AttendanceView />} />
              <Route path="create-attendance" element={<CreateAttendance />} />
              <Route path="class-teacher-assignment" element={<ClassTeacherAssignment />} />
              <Route path="communication" element={<AdminCommunications />} />
              {/* Counsellor route removed */}
              <Route path="create-mark-list" element={<MarkListSystem />} />
              <Route path="Mark-List-Management" element={<MarkListManagement />} />
              {/* Subject-Mapping-Setup route removed */}
              <Route path="post" element={<Post />} />
              {/* Roaster route removed */}
              <Route path="report-card" element={<ReportCard />} />
              <Route path="create-accounts" element={<CreateAccounts />} />
              <Route path="admin-sub-accounts" element={<AdminSubAccounts />} />
              {/* Payment route removed */}
              <Route path="settings" element={<Setting />} />
              {/* Branch-create route removed */}
              <Route path="schedule" element={<ScheduleDashboard />} />
              <Route path="schedule/Timetable" element={<ScheduleTimetable />} />
              <Route path="schedule/ClassShiftForm" element={<ClassShiftForm />} />
              <Route path="schedule/requirements" element={<ClassRequirementsForm />} />

              {/* New route for StaffForm */}
              <Route path="staff-form/:staffType/:className" element={<StaffForm />} />
              
              {/* Tasks routes - inside Home layout */}
              <Route path="tasks" element={<TaskPage />} />
              <Route path="tasks/:taskId" element={<TaskDetail />} />
              
              {/* Student Faults */}
              <Route path="student-faults" element={<StudentFaults />} />
            </Route>
            <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>}>
              <Route index element={<PostStudents />} />
              <Route path="class-students" element={<ClassStudents />} />
              <Route path="communication-students" element={<CommunicationStudents />} />
              <Route path="profile-students" element={<ProfileStudents />} />
            </Route>
            <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>}>
              <Route index element={<PV />} />
              <Route path="post-staff-new" element={<POSTS />} />
              <Route path="attendance-staff" element={<StaffAttendance />} />
              <Route path="mark-list-staff" element={<MRLIST />} />
              <Route path="evaluation-staff-control" element={<EVA />} />
              <Route path="profile-staff" element={<PF />} />
              <Route path="communication-staff" element={<COMSTA />} />
            </Route>
            
            {/* ============================================== */}
            {/* MOBILE APP ROUTES - Completely Standalone      */}
            {/* These routes are independent from the main app */}
            {/* Access via: /app/student-login, /app/staff-profile, etc. */}
            {/* ============================================== */}
            <Route path="/app/student-login" element={<StudentLogin />} />
            <Route path="/app/guardian-login" element={<GuardianLogin />} />
            <Route path="/app/staff-login" element={<StaffLogin />} />
            <Route path="/app/student/:username" element={<StudentProfile />} />
            <Route path="/app/guardian/:username" element={<GuardianProfile />} />
            <Route path="/app/staff" element={<StaffProfile />} />
            
            {/* Legacy route redirects - for backward compatibility */}
            <Route path="/student-login" element={<Navigate to="/app/student-login" replace />} />
            <Route path="/guardian-login" element={<Navigate to="/app/guardian-login" replace />} />
            <Route path="/staff-login" element={<Navigate to="/app/staff-login" replace />} />
            <Route path="/student-profile/:username" element={<StudentProfileRedirect />} />
            <Route path="/guardian-profile/:username" element={<GuardianProfileRedirect />} />
            <Route path="/staff-profile" element={<Navigate to="/app/staff" replace />} />
          </Routes>
      </Provider>
    </div>
  );
}

export default App;