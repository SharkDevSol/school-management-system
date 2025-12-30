import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import styles from './Login.module.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setMessage('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.post('https://school-management-system-daul.onrender.com/api/admin/login', credentials);
      
      if (response.data.message === 'Login successful' || response.data.success) {
        const user = response.data.user;
        const token = response.data.token;
        
        // Store JWT token for API authentication
        if (token) {
          localStorage.setItem('authToken', token);
        }
        
        localStorage.setItem('adminUser', JSON.stringify(user));
        localStorage.setItem('userType', user.userType || 'admin');
        localStorage.setItem('isLoggedIn', 'true');
        // Store permissions for sub-accounts
        if (user.permissions) {
          localStorage.setItem('userPermissions', JSON.stringify(user.permissions));
        } else {
          localStorage.removeItem('userPermissions');
        }
        
        const redirectPath = location.state?.from?.pathname || '/';
        navigate(redirectPath, { replace: true });
      }
    } catch (error) {
      // Check if it's a network/connection error
      if (!error.response) {
        setMessage('Cannot connect to server. Please check your internet connection or try again later.');
      } else if (error.response.status === 401) {
        setMessage('Invalid username or password. Please try again.');
      } else if (error.response.status === 404) {
        setMessage('User not found. Please check your username.');
      } else if (error.response.status >= 500) {
        setMessage('Server error. Please try again later or contact administrator.');
      } else {
        setMessage(error.response?.data?.error || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.logoSection}>
          <div className={styles.logo}>🎓</div>
          <h1 className={styles.title}>School Management System</h1>
          <p className={styles.subtitle}>Admin Login</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.label}>Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Enter admin username"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Enter password"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <div className={styles.options}>
            <label className={styles.rememberMe}>
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className={styles.forgotPassword}>Forgot password?</a>
          </div>
          
          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.loadingSpinner}></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        {message && (
          <div className={`${styles.message} ${styles.error}`}>
            {message}
          </div>
        )}
        
        <div className={styles.footer}>
          <p>© 2025 School Management System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
