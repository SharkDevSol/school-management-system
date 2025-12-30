import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './StaffLogin.module.css';

const StaffLogin = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
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
      const response = await axios.post('https://school-management-system-daul.onrender.com/api/staff/login', credentials);
      
      if (response.data.message === 'Login successful') {
        // Store JWT token for API authentication
        if (response.data.token) {
          localStorage.setItem('authToken', response.data.token);
        }
        
        // Store user data in localStorage
        localStorage.setItem('staffUser', JSON.stringify(response.data.user));
        localStorage.setItem('staffProfile', JSON.stringify(response.data.profile));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userType', 'staff');
        
        // Navigate to profile page
        navigate('/app/staff');
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
        setMessage(error.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <h2 className={styles.title}>Staff Login</h2>
        <p className={styles.subtitle}>Enter your credentials to access your profile</p>
        
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
              placeholder="Enter your username"
              disabled={isLoading}
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
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        {message && (
          <div className={`${styles.message} ${message.includes('successful') ? styles.success : styles.error}`}>
            {message}
          </div>
        )}
        
        <div className={styles.footer}>
          <p>Need help? Contact your administrator</p>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;

