import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';
import styles from './StudentLogin.module.css';

const StudentLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('https://excellence.oddag.et/api/students/login', {
        username,
        password,
      });
      const { role, student } = response.data;
      if (role === 'student') {
        navigate(`/app/student/${student.username}`);
      } else {
        setError('Please use the Guardian Login page for guardian accounts.');
      }
    } catch (err) {
      // Check if it's a network/connection error
      if (!err.response) {
        setError('Cannot connect to server. Please check your internet connection or try again later.');
      } else if (err.response.status === 401) {
        setError('Invalid username or password. Please try again.');
      } else if (err.response.status === 404) {
        setError('User not found. Please check your username.');
      } else if (err.response.status >= 500) {
        setError('Server error. Please try again later or contact administrator.');
      } else {
        setError(err.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={styles.loginCard}
      >
        <h2 className={styles.title}>Student Portal Login</h2>
        <p className={styles.subtitle}>Access your student profile</p>
        {error && <p className={styles.errorMessage}>{error}</p>}
        <form onSubmit={handleLogin} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              <FiUser className={styles.icon} /> Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={styles.input}
              placeholder="Enter your username"
              disabled={isLoading}
              aria-describedby="username-error"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              <FiLock className={styles.icon} /> Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
              placeholder="Enter your password"
              disabled={isLoading}
              aria-describedby="password-error"
            />
          </div>
          <motion.button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiLogIn className={styles.buttonIcon} />
            {isLoading ? 'Logging in...' : 'Login'}
          </motion.button>
        </form>
        <p className={styles.footerText}>
          Need help? Contact your school administrator or{' '}
          <a href="/app/guardian-login" className={styles.link}>try Guardian Login</a>.
        </p>
      </motion.div>
    </div>
  );
};

export default StudentLogin;