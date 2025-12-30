// COMPONENTS/InitialRedirect.jsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPermissionByKey } from '../config/adminPermissions';

// Total number of setup tasks
const TOTAL_TASKS = 7;

function InitialRedirect({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if we're at the root path
    if (location.pathname !== '/') {
      return;
    }

    const userType = localStorage.getItem('userType') || 'admin';
    
    // Check if all setup tasks are completed
    const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '[]');
    const allTasksCompleted = completedTasks.length >= TOTAL_TASKS;

    if (userType === 'admin') {
      // If tasks are not all completed, redirect to tasks page
      if (!allTasksCompleted) {
        navigate('/tasks', { replace: true });
      } else {
        // All tasks completed, go to dashboard
        navigate('/dashboard', { replace: true });
      }
    } else if (userType === 'sub-account') {
      // Sub-account: check tasks first, then permissions
      if (!allTasksCompleted) {
        navigate('/tasks', { replace: true });
        return;
      }
      
      // Sub-account goes to first permitted page
      let permissions = [];
      try {
        const storedPermissions = localStorage.getItem('userPermissions');
        if (storedPermissions) {
          permissions = JSON.parse(storedPermissions);
        }
      } catch (e) {
        console.error('Error parsing permissions:', e);
      }

      if (permissions.length > 0) {
        // Get the first permission's path
        const firstPermission = getPermissionByKey(permissions[0]);
        if (firstPermission && firstPermission.path) {
          navigate(firstPermission.path, { replace: true });
        } else {
          // Fallback to dashboard if permission not found
          navigate('/dashboard', { replace: true });
        }
      } else {
        // No permissions, stay at root (will show access denied or empty)
        navigate('/dashboard', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  return children;
}

export default InitialRedirect;
