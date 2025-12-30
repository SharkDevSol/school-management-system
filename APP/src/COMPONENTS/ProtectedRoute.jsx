import { Navigate, useLocation } from 'react-router-dom';
import { hasPathPermission } from '../utils/permissionUtils';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const location = useLocation();
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userType = localStorage.getItem('userType') || 'admin';
  
  // Get permissions from localStorage
  let permissions = [];
  try {
    const storedPermissions = localStorage.getItem('userPermissions');
    if (storedPermissions) {
      permissions = JSON.parse(storedPermissions);
    }
  } catch (e) {
    console.error('Error parsing permissions:', e);
  }

  if (!isLoggedIn) {
    // Redirect to login page, but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check permission for sub-accounts
  if (userType === 'sub-account') {
    const currentPath = location.pathname;
    
    // Always allow access to root path
    if (currentPath === '/' || currentPath === '') {
      return children;
    }
    
    // Check if user has permission for this path
    if (!hasPathPermission(permissions, currentPath, userType)) {
      // Redirect to home or show unauthorized message
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '60vh',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h2 style={{ color: '#d93025', marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            You don't have permission to access this page.
          </p>
          <a 
            href="/" 
            style={{ 
              color: '#667eea', 
              textDecoration: 'none',
              padding: '10px 20px',
              border: '1px solid #667eea',
              borderRadius: '6px'
            }}
          >
            Go to Home
          </a>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
