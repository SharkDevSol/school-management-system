// Admin Permissions Configuration
// Defines all available admin permissions grouped by category

export const ADMIN_PERMISSIONS = {
  registration: {
    label: 'Registration',
    permissions: [
      { key: 'register_student', label: 'Register Student', path: '/create-register-student' },
      { key: 'register_staff', label: 'Register Staff', path: '/create-register-staff' },
      { key: 'student_form_builder', label: 'Student Form Builder', path: '/Student-Form-Builder' },
      { key: 'staff_form_builder', label: 'Staff Form Builder', path: '/Staff-Form-Builder' },
    ],
  },
  lists: {
    label: 'Lists',
    permissions: [
      { key: 'list_students', label: 'View Students', path: '/list-student' },
      { key: 'list_staff', label: 'View Staff', path: '/list-staff' },
      { key: 'list_guardians', label: 'View Guardians', path: '/list-guardian' },
    ],
  },
  academic: {
    label: 'Academic',
    permissions: [
      { key: 'evaluation', label: 'Evaluation', path: '/evaluation' },
      { key: 'evaluation_book', label: 'Evaluation Book', path: '/evaluation-book' },
      { key: 'evaluation_book_reports', label: 'Eval Book Reports', path: '/evaluation-book/reports' },
      { key: 'mark_list_view', label: 'Mark Lists', path: '/mark-list-view' },
      { key: 'attendance_view', label: 'Attendance', path: '/attendance-view' },
      { key: 'create_attendance', label: 'Create Attendance', path: '/create-attendance' },
      { key: 'create_mark_list', label: 'Create Mark List', path: '/create-mark-list' },
      { key: 'mark_list_management', label: 'Mark List Management', path: '/Mark-List-Management' },
      { key: 'report_card', label: 'Report Card', path: '/report-card' },
      { key: 'schedule', label: 'Schedule', path: '/schedule' },
      { key: 'post', label: 'Posts', path: '/post' },
      { key: 'tasks', label: 'Tasks', path: '/tasks' },
    ],
  },
  administration: {
    label: 'Administration',
    permissions: [
      { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
      { key: 'communication', label: 'Communication', path: '/communication' },
      { key: 'class_teacher_assignment', label: 'Class Teachers', path: '/class-teacher-assignment' },
      { key: 'evaluation_book_assignments', label: 'Eval Book Assignments', path: '/evaluation-book/assignments' },
      { key: 'settings', label: 'Settings', path: '/settings' },
      { key: 'admin_sub_accounts', label: 'Sub-Accounts', path: '/admin-sub-accounts' },
    ],
  },
};

// Get all permission keys as a flat array
export const getAllPermissionKeys = () => {
  const keys = [];
  Object.values(ADMIN_PERMISSIONS).forEach(category => {
    category.permissions.forEach(perm => {
      keys.push(perm.key);
    });
  });
  return keys;
};

// Get all permissions as a flat array
export const getAllPermissions = () => {
  const permissions = [];
  Object.values(ADMIN_PERMISSIONS).forEach(category => {
    permissions.push(...category.permissions);
  });
  return permissions;
};

// Get permission by key
export const getPermissionByKey = (key) => {
  for (const category of Object.values(ADMIN_PERMISSIONS)) {
    const found = category.permissions.find(p => p.key === key);
    if (found) return found;
  }
  return null;
};

// Get path for a permission key
export const getPermissionPath = (key) => {
  const permission = getPermissionByKey(key);
  return permission ? permission.path : null;
};

// Get all paths for given permission keys
export const getPermittedPaths = (permissionKeys) => {
  return permissionKeys
    .map(key => getPermissionPath(key))
    .filter(path => path !== null);
};

// Check if a path is permitted for given permission keys
export const isPathPermitted = (path, permissionKeys) => {
  // Empty permissions array means full access (primary admin)
  if (!permissionKeys || permissionKeys.length === 0) {
    return true;
  }
  
  const permittedPaths = getPermittedPaths(permissionKeys);
  
  // Check exact match or if path starts with a permitted path
  return permittedPaths.some(permittedPath => 
    path === permittedPath || path.startsWith(permittedPath + '/')
  );
};

export default ADMIN_PERMISSIONS;
