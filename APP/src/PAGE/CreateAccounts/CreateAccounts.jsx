import React, { useState } from 'react';
import styles from './CreateAccounts.module.css';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiLock, FiCheck, FiX, FiUpload, FiArrowLeft } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CreateAccounts = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    role: '',
    department: '',
    username: '',
    password: '',
    confirmPassword: '',
    status: true,
    profilePicture: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = ['Teacher', 'Admin', 'Librarian', 'Principal', 'Counselor'];
  const departments = ['Science', 'English', 'Mathematics', 'History', 'IT', 'HR', 'Administration'];
  const genders = ['Male', 'Female', 'Other'];

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      
      // Simulate API call
      setTimeout(() => {
        console.log('Form submitted:', formData);
        setIsSubmitting(false);
        toast.success('Staff account created successfully!');
        // Reset form after successful submission
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          gender: '',
          role: '',
          department: '',
          username: '',
          password: '',
          confirmPassword: '',
          status: true,
          profilePicture: null
        });
      }, 1500);
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      gender: '',
      role: '',
      department: '',
      username: '',
      password: '',
      confirmPassword: '',
      status: true,
      profilePicture: null
    });
    setErrors({});
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Teacher': return '#4CAF50';
      case 'Admin': return '#F44336';
      case 'Librarian': return '#9C27B0';
      case 'Principal': return '#FF9800';
      case 'Counselor': return '#2196F3';
      default: return '#607D8B';
    }
  };

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className={styles.header}>
        <h1>
          <FiUser className={styles.titleIcon} />
          Create School Staff Account
        </h1>
        <div className={styles.orangeLine}></div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Full Name */}
          <div className={styles.formGroup}>
            <label htmlFor="fullName">
              <FiUser className={styles.inputIcon} />
              Full Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={`${styles.input} ${errors.fullName ? styles.error : ''}`}
              placeholder="Enter full name"
            />
            {errors.fullName && <span className={styles.errorMessage}>{errors.fullName}</span>}
          </div>

          {/* Email */}
          <div className={styles.formGroup}>
            <label htmlFor="email">
              <FiMail className={styles.inputIcon} />
              Email Address <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`${styles.input} ${errors.email ? styles.error : ''}`}
              placeholder="Enter email address"
            />
            {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
          </div>

          {/* Phone */}
          <div className={styles.formGroup}>
            <label htmlFor="phone">
              <FiPhone className={styles.inputIcon} />
              Phone Number <span className={styles.required}>*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`${styles.input} ${errors.phone ? styles.error : ''}`}
              placeholder="Enter phone number"
            />
            {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
          </div>

          {/* Gender */}
          <div className={styles.formGroup}>
            <label htmlFor="gender">
              <FiUser className={styles.inputIcon} />
              Gender <span className={styles.required}>*</span>
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={`${styles.select} ${errors.gender ? styles.error : ''}`}
            >
              <option value="">Select gender</option>
              {genders.map(gender => (
                <option key={gender} value={gender}>{gender}</option>
              ))}
            </select>
            {errors.gender && <span className={styles.errorMessage}>{errors.gender}</span>}
          </div>

          {/* Role */}
          <div className={styles.formGroup}>
            <label htmlFor="role">
              <FiUser className={styles.inputIcon} />
              Role <span className={styles.required}>*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`${styles.select} ${errors.role ? styles.error : ''}`}
            >
              <option value="">Select role</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            {errors.role && <span className={styles.errorMessage}>{errors.role}</span>}
            {formData.role && (
              <span 
                className={styles.roleBadge}
                style={{ backgroundColor: getRoleColor(formData.role) }}
              >
                {formData.role}
              </span>
            )}
          </div>

          {/* Department */}
          <div className={styles.formGroup}>
            <label htmlFor="department">
              <FiUser className={styles.inputIcon} />
              Department <span className={styles.required}>*</span>
            </label>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={`${styles.select} ${errors.department ? styles.error : ''}`}
            >
              <option value="">Select department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            {errors.department && <span className={styles.errorMessage}>{errors.department}</span>}
          </div>

          {/* Username */}
          <div className={styles.formGroup}>
            <label htmlFor="username">
              <FiUser className={styles.inputIcon} />
              Username <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`${styles.input} ${errors.username ? styles.error : ''}`}
              placeholder="Enter username"
            />
            {errors.username && <span className={styles.errorMessage}>{errors.username}</span>}
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <label htmlFor="password">
              <FiLock className={styles.inputIcon} />
              Password <span className={styles.required}>*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`${styles.input} ${errors.password ? styles.error : ''}`}
              placeholder="Enter password"
            />
            {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">
              <FiLock className={styles.inputIcon} />
              Confirm Password <span className={styles.required}>*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`${styles.input} ${errors.confirmPassword ? styles.error : ''}`}
              placeholder="Confirm password"
            />
            {errors.confirmPassword && <span className={styles.errorMessage}>{errors.confirmPassword}</span>}
          </div>

          {/* Status */}
          <div className={styles.formGroup}>
            <label className={styles.switchLabel}>
              Status
            </label>
            <div className={styles.toggleContainer}>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  name="status"
                  checked={formData.status}
                  onChange={handleChange}
                />
                <span className={`${styles.slider} ${styles.round}`}></span>
              </label>
              <span className={styles.statusText}>
                {formData.status ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Profile Picture */}
          <div className={styles.formGroup}>
            <label htmlFor="profilePicture">
              <FiUpload className={styles.inputIcon} />
              Profile Picture (Optional)
            </label>
            <div className={styles.uploadContainer}>
              <input
                type="file"
                id="profilePicture"
                name="profilePicture"
                onChange={handleChange}
                className={styles.fileInput}
                accept="image/*"
              />
              <label htmlFor="profilePicture" className={styles.uploadButton}>
                Choose File
              </label>
              {formData.profilePicture && (
                <span className={styles.fileName}>{formData.profilePicture.name}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <motion.button
            type="submit"
            className={styles.submitButton}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </motion.button>
          
          <motion.button
            type="button"
            className={styles.resetButton}
            onClick={handleReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Reset
          </motion.button>
          
          <motion.button
            type="button"
            className={styles.cancelButton}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiArrowLeft className={styles.buttonIcon} />
            Cancel
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default CreateAccounts;