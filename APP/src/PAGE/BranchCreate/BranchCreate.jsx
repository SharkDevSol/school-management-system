import React, { useState } from 'react';
import styles from './BranchCreate.module.css';
import { FiUpload, FiCalendar, FiMapPin, FiPhone, FiMail, FiUser, FiSave, FiRefreshCw } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { regions } from './regionsData'; // Assume we have a regions data file

const BranchCreate = () => {
  const [formData, setFormData] = useState({
    branchName: '',
    branchCode: generateBranchCode(),
    region: '',
    address: '',
    phone: '',
    email: '',
    principalName: '',
    principalPhone: '',
    establishDate: '',
    logo: null,
    status: true,
    logoPreview: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  function generateBranchCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            logo: file,
            logoPreview: reader.result
          }));
        };
        reader.readAsDataURL(file);
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      // Simulate API call
      setTimeout(() => {
        setIsSubmitting(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }, 1500);
    } else {
      setErrors(validationErrors);
    }
  };

  const handleReset = () => {
    setFormData({
      branchName: '',
      branchCode: generateBranchCode(),
      region: '',
      address: '',
      phone: '',
      email: '',
      principalName: '',
      principalPhone: '',
      establishDate: '',
      logo: null,
      status: true,
      logoPreview: null
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.branchName.trim()) newErrors.branchName = 'Branch name is required';
    if (!formData.region) newErrors.region = 'Region is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.principalName.trim()) newErrors.principalName = 'Principal name is required';
    if (!formData.establishDate) newErrors.establishDate = 'Establish date is required';
    
    return newErrors;
  };

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.icon}>🏫</span> Create New School Branch
        </h1>
        <p className={styles.subtitle}>Fill in the details below to register a new branch</p>
      </div>

      {showSuccess && (
        <motion.div 
          className={styles.successMessage}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
        >
          Branch created successfully!
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Branch Information */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Branch Information</h2>
            
            <div className={styles.formGroup}>
              <label htmlFor="branchName" className={styles.label}>
                Branch Name <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  id="branchName"
                  name="branchName"
                  value={formData.branchName}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.branchName ? styles.error : ''}`}
                  placeholder="Enter branch name"
                />
                {errors.branchName && <span className={styles.errorMessage}>{errors.branchName}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="branchCode" className={styles.label}>
                Branch Code
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  id="branchCode"
                  name="branchCode"
                  value={formData.branchCode}
                  readOnly
                  className={`${styles.input} ${styles.readOnly}`}
                />
                <button 
                  type="button" 
                  className={styles.generateButton}
                  onClick={() => setFormData(prev => ({ ...prev, branchCode: generateBranchCode() }))}
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="region" className={styles.label}>
                Region/City <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <div className={`${styles.selectWrapper} ${errors.region ? styles.error : ''}`}>
                  <FiMapPin className={styles.inputIcon} />
                  <select
                    id="region"
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="">Select Region/City</option>
                    {regions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
                {errors.region && <span className={styles.errorMessage}>{errors.region}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="address" className={styles.label}>
                Full Address <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={`${styles.textarea} ${errors.address ? styles.error : ''}`}
                  placeholder="Enter full address"
                  rows="3"
                />
                {errors.address && <span className={styles.errorMessage}>{errors.address}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.label}>
                Phone Number <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <div className={`${styles.inputWithIcon} ${errors.phone ? styles.error : ''}`}>
                  <FiPhone className={styles.inputIcon} />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Enter phone number"
                  />
                </div>
                {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email Address <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <div className={`${styles.inputWithIcon} ${errors.email ? styles.error : ''}`}>
                  <FiMail className={styles.inputIcon} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Enter email address"
                  />
                </div>
                {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
              </div>
            </div>
          </div>

          {/* Principal Information */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Principal Information</h2>
            
            <div className={styles.formGroup}>
              <label htmlFor="principalName" className={styles.label}>
                Principal Name <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <div className={`${styles.inputWithIcon} ${errors.principalName ? styles.error : ''}`}>
                  <FiUser className={styles.inputIcon} />
                  <input
                    type="text"
                    id="principalName"
                    name="principalName"
                    value={formData.principalName}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Enter principal's name"
                  />
                </div>
                {errors.principalName && <span className={styles.errorMessage}>{errors.principalName}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="principalPhone" className={styles.label}>
                Principal Phone
              </label>
              <div className={styles.inputWrapper}>
                <div className={styles.inputWithIcon}>
                  <FiPhone className={styles.inputIcon} />
                  <input
                    type="tel"
                    id="principalPhone"
                    name="principalPhone"
                    value={formData.principalPhone}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Enter principal's phone"
                  />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="establishDate" className={styles.label}>
                Establish Date <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <div className={`${styles.inputWithIcon} ${errors.establishDate ? styles.error : ''}`}>
                  <FiCalendar className={styles.inputIcon} />
                  <input
                    type="date"
                    id="establishDate"
                    name="establishDate"
                    value={formData.establishDate}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>
                {errors.establishDate && <span className={styles.errorMessage}>{errors.establishDate}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="logo" className={styles.label}>
                Upload Logo
              </label>
              <div className={styles.uploadWrapper}>
                <label htmlFor="logo" className={styles.uploadLabel}>
                  <FiUpload className={styles.uploadIcon} />
                  <span>{formData.logo ? formData.logo.name : 'Choose File'}</span>
                  <input
                    type="file"
                    id="logo"
                    name="logo"
                    onChange={handleChange}
                    className={styles.fileInput}
                    accept="image/*"
                  />
                </label>
                {formData.logoPreview && (
                  <div className={styles.logoPreview}>
                    <img src={formData.logoPreview} alt="Logo preview" className={styles.previewImage} />
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Branch Status
              </label>
              <div className={styles.toggleWrapper}>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    name="status"
                    checked={formData.status}
                    onChange={handleChange}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span className={styles.toggleLabel}>
                  {formData.status ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <motion.button
            type="button"
            onClick={handleReset}
            className={styles.resetButton}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiRefreshCw className={styles.buttonIcon} />
            Reset
          </motion.button>
          
          <motion.button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSubmitting ? (
              <span className={styles.spinner}></span>
            ) : (
              <>
                <FiSave className={styles.buttonIcon} />
                Create Branch
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default BranchCreate;