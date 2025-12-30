// StaffForm.jsx - COMPLETE FIXED CODE
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import styles from './CreateRegisterStaff.module.css';

const StaffForm = ({ staffTypeProp, classNameProp, onSuccess }) => {
  const { staffType: paramStaffType, className: paramClassName } = useParams();
  const staffType = staffTypeProp || paramStaffType;
  const className = classNameProp || paramClassName;
  const navigate = useNavigate();
  const [columns, setColumns] = useState([]);
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', 'warning'
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [partTimeOptions, setPartTimeOptions] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partTimeOptionsError, setPartTimeOptionsError] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [teacherStatus, setTeacherStatus] = useState(null); // Track teacher table status
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Teacher-specific validation function
  const validateTeacherFields = () => {
    const errors = {};
    const isTeacherRole = formData.role === 'Teacher';
    
    if (isTeacherRole) {
      // Validate name is required for teachers
      if (!formData.name || formData.name.trim() === '') {
        errors.name = 'Name is required for teachers';
      }
      
      // Validate staff_work_time is required for teachers
      if (!formData.staff_work_time) {
        errors.staff_work_time = 'Work time is required for teachers';
      }
      
      // Validate schedule for part-time teachers
      if (formData.staff_work_time === 'Part Time') {
        if (!formData.work_days || formData.work_days.length === 0) {
          errors.schedule = 'Schedule information is required for part-time teachers';
        }
        if (!formData.shifts || formData.shifts.length === 0) {
          errors.schedule = 'Please select at least one shift for part-time teachers';
        }
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Standard dropdown options
  const standardOptions = {
    gender: ['Male', 'Female'],
    role: [
      'Teacher', 'Director', 'Coordinator', 'Supervisor', 
      'Deputy director', 'Purchaser', 'Cashier', 'Accountant', 
      'Guard', 'Cleaner', 'Department Head', 'Counselor', 
      'Instructor', 'Librarian', 'Nurse', 'Technician', 
      'Assistant', 'Manager', 'Trainer', 'Advisor', 'Inspector'
    ],
    staff_enrollment_type: ['Permanent', 'Contract'],
    staff_work_time: ['Full Time', 'Part Time']
  };

  // File type configurations
  const fileTypeConfig = {
    image_staff: {
      accept: "image/*",
      description: "Staff photo (JPEG, PNG, JPG)",
      isImage: true
    },
    default: {
      accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png",
      description: "Documents (PDF, Word, Excel, PowerPoint), Images (JPG, PNG)",
      isImage: false
    }
  };

  useEffect(() => {
    fetchColumns();
    fetchPartTimeOptions();
  }, [staffType, className]);

  const fetchPartTimeOptions = async () => {
    try {
      const response = await axios.get('/api/staff/part-time-options');
      setPartTimeOptions(response.data);
      setPartTimeOptionsError(false);
    } catch (error) {
      console.error('Error fetching part-time options:', error);
      setPartTimeOptionsError(true);
      setPartTimeOptions({
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        shifts: ['morning', 'afternoon'],
        default_times: {
          morning: { start_time: '07:00', end_time: '12:30' },
          afternoon: { start_time: '12:30', end_time: '17:30' }
        }
      });
    }
  };

  const fetchColumns = async () => {
    try {
      const response = await axios.get(`/api/staff/columns/${encodeURIComponent(staffType)}/${encodeURIComponent(className)}`);
      
      // Use the columns exactly as returned from the backend (with preserved types)
      setColumns(response.data);
      
      const initialFormData = {};
      response.data.forEach(col => {
        if (!['id', 'global_staff_id', 'staff_id'].includes(col.column_name)) {
          if (col.data_type === 'checkbox' || col.data_type === 'boolean') {
            initialFormData[col.column_name] = false;
          } else if (col.data_type === 'multiple-checkbox') {
            initialFormData[col.column_name] = [];
          } else {
            initialFormData[col.column_name] = '';
          }
        }
      });
      setFormData(initialFormData);
      setGeneratedCredentials(null);
    } catch (error) {
      setMessage(`Error fetching form columns: ${error.response?.data?.error || error.message}`);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      setMessage('❌ Camera access denied. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      canvasRef.current.toBlob((blob) => {
        const file = new File([blob], `staff-photo-${Date.now()}.jpg`, { 
          type: 'image/jpeg' 
        });
        
        setFiles(prev => ({ ...prev, image_staff: file }));
        setMessage('✅ Photo captured successfully!');
        stopCamera();
      }, 'image/jpeg', 0.95);
    }
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      // Increased file size limit to 30MB
      if (file.size > 30 * 1024 * 1024) {
        setMessage(`❌ File size too large. Please select a file smaller than 30MB.`);
        e.target.value = '';
        return;
      }

      const config = fileTypeConfig[fieldName] || fileTypeConfig.default;
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const allowedExtensions = config.accept.includes('*') 
        ? true 
        : config.accept.split(',').some(ext => file.name.toLowerCase().endsWith(ext.replace('.', '')));
      
      if (!allowedExtensions) {
        setMessage(`❌ Invalid file type for ${formatFieldLabel(fieldName)}. Allowed: ${config.description}`);
        e.target.value = '';
        return;
      }

      setFiles({ ...files, [fieldName]: file });
      setMessage(`✅ File "${file.name}" selected for ${formatFieldLabel(fieldName)}`);
    }
  };

  const handleWorkTimeChange = (e) => {
    const workTime = e.target.value;
    setFormData({ ...formData, staff_work_time: workTime });
    
    if (workTime === 'Part Time') {
      if (!partTimeOptions) {
        setMessage('Schedule options not available. Please try again.');
        return;
      }
      setShowScheduleModal(true);
    }
  };

  const handleScheduleSave = (scheduleData) => {
    setFormData({
      ...formData,
      work_days: scheduleData.work_days,
      shifts: scheduleData.shifts,
      availability: scheduleData.availability,
      max_hours_per_day: scheduleData.max_hours_per_day,
      max_hours_per_week: scheduleData.max_hours_per_week
    });
    setShowScheduleModal(false);
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get(`/api/staff/data/${encodeURIComponent(staffType)}/${encodeURIComponent(className)}`);
      const data = response.data.data;
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, className);
      XLSX.writeFile(wb, `${className}_staff.xlsx`);
    } catch (error) {
      setMessage(`Error downloading data: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleUploadExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const wb = XLSX.read(event.target.result, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        const response = await axios.post('/api/staff/upload-excel', { staffType, className, data });
        setMessage('Excel uploaded successfully');
        if (response.data.createdUsers && response.data.createdUsers.length > 0) {
          alert(`Successfully uploaded Excel. ${response.data.createdUsers.length} new user(s) created.`);
        }
      } catch (error) {
        setMessage(`Error uploading Excel: ${error.response?.data?.error || error.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSelectChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleCheckboxChange = (fieldName, checked) => {
    setFormData(prev => ({ ...prev, [fieldName]: checked }));
  };

  const handleMultipleCheckboxChange = (fieldName, option, checked) => {
    setFormData(prev => {
      const currentValues = Array.isArray(prev[fieldName]) ? prev[fieldName] : [];
      if (checked) {
        return { ...prev, [fieldName]: [...currentValues, option] };
      } else {
        return { ...prev, [fieldName]: currentValues.filter(item => item !== option) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    // Validate teacher-specific fields before submission
    if (!validateTeacherFields()) {
      setMessage('❌ Please fix the validation errors before submitting');
      setMessageType('error');
      return;
    }
    
    setIsSubmitting(true);
    setMessage('');
    setMessageType('');
    setTeacherStatus(null);
    
    const formDataToSend = new FormData();
    formDataToSend.append('staffType', staffType);
    formDataToSend.append('class', className);
    
    // Add all form data
    Object.keys(formData).forEach(key => {
      if (key === 'availability' && Array.isArray(formData[key])) {
        formDataToSend.append(key, JSON.stringify(formData[key]));
      } else if (key === 'work_days' && Array.isArray(formData[key])) {
        formDataToSend.append(key, JSON.stringify(formData[key]));
      } else if (key === 'shifts' && Array.isArray(formData[key])) {
        formDataToSend.append(key, JSON.stringify(formData[key]));
      } else {
        formDataToSend.append(key, formData[key]);
      }
    });
    
    // Add all files with their original field names
    Object.keys(files).forEach(key => {
      if (files[key]) {
        formDataToSend.append(key, files[key]);
      }
    });
    
    const uploadFields = columns.filter(col => col.data_type === 'upload').map(col => col.column_name);
    formDataToSend.append('uploadFields', JSON.stringify(uploadFields));

    try {
      const response = await axios.post('/api/staff/add-staff', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Handle teacher-specific response data
      if (response.data.teacherData) {
        setTeacherStatus({
          success: true,
          name: response.data.teacherData.name,
          workTime: response.data.teacherData.workTime,
          globalStaffId: response.data.teacherData.globalStaffId
        });
      }
      
      // Handle schoolSchemaError (teacher table insertion error)
      if (response.data.schoolSchemaError) {
        setTeacherStatus({
          success: false,
          error: response.data.schoolSchemaError
        });
        setMessage('⚠️ Staff added but teacher table update failed');
        setMessageType('warning');
      } else {
        setMessage('✅ Staff member added successfully');
        setMessageType('success');
      }
      
      if (response.data.userCredentials) {
        setGeneratedCredentials(response.data.userCredentials);
      } else {
        setGeneratedCredentials(null);
      }

      if (response.data.scheduleError) {
        setMessage(prev => prev + ` (Schedule: ${response.data.scheduleError})`);
      }

      // Reset form
      const initialFormData = {};
      columns.forEach(col => {
        if (!['id', 'global_staff_id', 'staff_id'].includes(col.column_name)) {
          if (col.data_type === 'checkbox' || col.data_type === 'boolean') {
            initialFormData[col.column_name] = false;
          } else if (col.data_type === 'multiple-checkbox') {
            initialFormData[col.column_name] = [];
          } else {
            initialFormData[col.column_name] = '';
          }
        }
      });
      setFormData(initialFormData);
      setFiles({});
      setValidationErrors({});
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(response.data);
      }

    } catch (error) {
      console.error('Error adding staff:', error);
      setMessage(`❌ Error adding staff: ${error.response?.data?.error || error.message}`);
      setMessageType('error');
      setGeneratedCredentials(null);
      setTeacherStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFieldLabel = (fieldName) => {
    return fieldName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getFileAcceptTypes = (fieldName) => {
    return fileTypeConfig[fieldName]?.accept || fileTypeConfig.default.accept;
  };

  const getFileTypeDescription = (fieldName) => {
    return fileTypeConfig[fieldName]?.description || fileTypeConfig.default.description;
  };

  const isImageField = (fieldName) => {
    return fileTypeConfig[fieldName]?.isImage || false;
  };

  const renderField = (col) => {
    const fieldName = col.column_name;
    const value = formData[fieldName] || '';
    const isRequired = col.is_nullable === 'NO';

    const isStandardDropdown = standardOptions[fieldName] && standardOptions[fieldName].length > 0;

    // Special handling for image_staff field with camera and file upload
    if (fieldName === 'image_staff') {
      const hasFile = files[fieldName];
      
      return (
        <div key={fieldName} className={styles.fieldGroup}>
          <label>{formatFieldLabel(fieldName)} {isRequired && <span className={styles.required}>*</span>}</label>
          
          <div className={styles.uploadSection}>
            {/* Camera Option */}
            <div className={styles.cameraSection}>
              <button
                type="button"
                onClick={startCamera}
                className={styles.cameraButton}
              >
                📷 Take Photo
              </button>
              <span className={styles.optionSeparator}>or</span>
              
              {/* File Upload Option */}
              <div className={styles.fileUploadOption}>
                <input
                  type="file"
                  onChange={(e) => handleFileChange(e, fieldName)}
                  className={styles.hiddenInput}
                  accept={getFileAcceptTypes(fieldName)}
                  id={`file-upload-${fieldName}`}
                />
                <label htmlFor={`file-upload-${fieldName}`} className={styles.uploadLabel}>
                  📁 Upload Image
                </label>
              </div>
            </div>
            
            {/* File Status */}
            {hasFile && (
              <div className={styles.fileStatus}>
                <span className={styles.fileIcon}>
                  {isImageField(fieldName) ? '🖼️' : '📄'}
                </span>
                <span className={styles.fileName}>{files[fieldName].name}</span>
                <span className={styles.fileSize}>
                  ({(files[fieldName].size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <button 
                  type="button" 
                  onClick={() => {
                    const newFiles = { ...files };
                    delete newFiles[fieldName];
                    setFiles(newFiles);
                  }}
                  className={styles.removeFileButton}
                >
                  ✕
                </button>
              </div>
            )}
            
            {/* File Type Info */}
            <div className={styles.fileInputInfo}>
              <small>{getFileTypeDescription(fieldName)} (Max 30MB)</small>
            </div>
          </div>
        </div>
      );
    }

    // Regular upload fields (non-image_staff)
    if (col.data_type === 'upload') {
      const hasFile = files[fieldName];
      
      return (
        <div key={fieldName} className={styles.fieldGroup}>
          <label>{formatFieldLabel(fieldName)} {isRequired && <span className={styles.required}>*</span>}</label>
          
          <div className={styles.uploadSection}>
            <div className={styles.fileInputContainer}>
              <input
                type="file"
                onChange={(e) => handleFileChange(e, fieldName)}
                className={styles.fileInput}
                accept={getFileAcceptTypes(fieldName)}
                required={isRequired && !hasFile}
                id={`file-upload-${fieldName}`}
              />
              <label htmlFor={`file-upload-${fieldName}`} className={styles.uploadLabel}>
                📎 Choose File
              </label>
              <div className={styles.fileInputInfo}>
                <small>{getFileTypeDescription(fieldName)} (Max 30MB)</small>
              </div>
            </div>
            
            {hasFile && (
              <div className={styles.fileStatus}>
                <span className={styles.fileIcon}>
                  {isImageField(fieldName) ? '🖼️' : '📄'}
                </span>
                <span className={styles.fileName}>{files[fieldName].name}</span>
                <span className={styles.fileSize}>
                  ({(files[fieldName].size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <button 
                  type="button" 
                  onClick={() => {
                    const newFiles = { ...files };
                    delete newFiles[fieldName];
                    setFiles(newFiles);
                  }}
                  className={styles.removeFileButton}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (fieldName === 'staff_work_time') {
      return (
        <div key={fieldName} className={styles.fieldGroup}>
          <label>{formatFieldLabel(fieldName)} {isRequired && <span className={styles.required}>*</span>}</label>
          <select
            value={value}
            onChange={handleWorkTimeChange}
            required={isRequired}
            className={styles.select}
          >
            <option value="">Select Work Time</option>
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
          </select>
          {value === 'Part Time' && formData.availability && (
            <div className={styles.scheduleSummary}>
              <p><strong>Schedule Summary:</strong></p>
              <p>Days: {formData.work_days?.join(', ') || 'Not set'}</p>
              <p>Shifts: {formData.shifts?.join(', ') || 'Not set'}</p>
              <p>Active Slots: {formData.availability?.filter(slot => slot.active).length || 0}</p>
              <button 
                type="button" 
                onClick={() => setShowScheduleModal(true)}
                className={styles.editScheduleButton}
              >
                Edit Schedule
              </button>
            </div>
          )}
        </div>
      );
    }

    // Checkbox field
    if (col.data_type === 'checkbox') {
      return (
        <div key={fieldName} className={styles.fieldGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleCheckboxChange(fieldName, e.target.checked)}
              className={styles.checkbox}
              required={isRequired}
            />
            {formatFieldLabel(fieldName)}
            {isRequired && <span className={styles.required}>*</span>}
          </label>
        </div>
      );
    }

    // Multiple checkbox field
    if (col.data_type === 'multiple-checkbox' && col.options) {
      return (
        <div key={fieldName} className={styles.fieldGroup}>
          <label>{formatFieldLabel(fieldName)} {isRequired && <span className={styles.required}>*</span>}</label>
          <div className={styles.checkboxGroup}>
            {col.options.map(option => (
              <label key={option} className={styles.checkboxOption}>
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option)}
                  onChange={(e) => handleMultipleCheckboxChange(fieldName, option, e.target.checked)}
                  className={styles.checkbox}
                />
                {option}
              </label>
            ))}
          </div>
          {Array.isArray(value) && value.length > 0 && (
            <div className={styles.selectionSummary}>
              Selected: {value.join(', ')}
            </div>
          )}
        </div>
      );
    }

    // Single Select Dropdown
    if ((col.data_type === 'select' || isStandardDropdown) && col.options) {
      return (
        <div key={fieldName} className={styles.fieldGroup}>
          <label>{formatFieldLabel(fieldName)} {isRequired && <span className={styles.required}>*</span>}</label>
          <select
            value={value}
            onChange={(e) => handleSelectChange(fieldName, e.target.value)}
            required={isRequired}
            className={styles.select}
          >
            <option value="">Select {formatFieldLabel(fieldName)}</option>
            {col.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      );
    }

    // Textarea field
    if (col.data_type === 'textarea') {
      return (
        <div key={fieldName} className={styles.fieldGroup}>
          <label>{formatFieldLabel(fieldName)} {isRequired && <span className={styles.required}>*</span>}</label>
          <textarea
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className={styles.textarea}
            required={isRequired}
            rows={4}
          />
        </div>
      );
    }

    if (col.data_type === 'text' || col.data_type === 'character varying') {
      return (
        <div key={fieldName} className={styles.fieldGroup}>
          <label>{formatFieldLabel(fieldName)} {isRequired && <span className={styles.required}>*</span>}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className={styles.input}
            required={isRequired}
          />
        </div>
      );
    }

    if (col.data_type === 'integer' || col.data_type === 'numeric') {
      return (
        <div key={fieldName} className={styles.fieldGroup}>
          <label>{formatFieldLabel(fieldName)} {isRequired && <span className={styles.required}>*</span>}</label>
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className={styles.input}
            required={isRequired}
          />
        </div>
      );
    }

    if (col.data_type === 'date') {
      return (
        <div key={fieldName} className={styles.fieldGroup}>
          <label>{formatFieldLabel(fieldName)} {isRequired && <span className={styles.required}>*</span>}</label>
          <input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className={styles.input}
            required={isRequired}
          />
        </div>
      );
    }

    return (
      <div key={fieldName} className={styles.fieldGroup}>
        <label>{formatFieldLabel(fieldName)} {isRequired && <span className={styles.required}>*</span>}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          className={styles.input}
          required={isRequired}
        />
      </div>
    );
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h2>Add Staff to {className?.replace(/_/g, ' ')} ({staffType})</h2>
        {!staffTypeProp && (
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            ← Back
          </button>
        )}
      </div>
      
      <div className={styles.formActions}>
        <button onClick={handleDownload} className={styles.actionButton}>
          📥 Download Excel
        </button>
        <label className={styles.actionButton}>
          📤 Upload Excel
          <input type="file" accept=".xlsx, .xls" onChange={handleUploadExcel} className={styles.hiddenInput} />
        </label>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`${styles.messageBox} ${styles[messageType]}`}>
          {message}
        </div>
      )}

      {/* Teacher Status Display */}
      {teacherStatus && (
        <div className={`${styles.statusBox} ${teacherStatus.success ? styles.statusSuccess : styles.statusError}`}>
          <h4>{teacherStatus.success ? '✅ Teacher Added Successfully' : '⚠️ Teacher Table Error'}</h4>
          {teacherStatus.success ? (
            <div className={styles.teacherInfo}>
              <p><strong>Name:</strong> {teacherStatus.name}</p>
              <p><strong>Work Time:</strong> {teacherStatus.workTime}</p>
              <p><strong>Staff ID:</strong> {teacherStatus.globalStaffId}</p>
            </div>
          ) : (
            <p className={styles.errorText}>{teacherStatus.error}</p>
          )}
        </div>
      )}

      {/* Credentials Display */}
      {generatedCredentials && (
        <div className={styles.credentialsBox}>
          <h4>🔐 New Staff Credentials</h4>
          <div className={styles.credentialItem}>
            <span className={styles.credentialLabel}>Username:</span>
            <span className={styles.credentialValue}>{generatedCredentials.username}</span>
          </div>
          <div className={styles.credentialItem}>
            <span className={styles.credentialLabel}>Password:</span>
            <span className={styles.credentialValue}>{generatedCredentials.password}</span>
          </div>
          <p className={styles.credentialNote}>{generatedCredentials.message}</p>
        </div>
      )}

      {/* Camera Modal */}
      {cameraActive && (
        <div className={styles.cameraModal}>
          <div className={styles.cameraContent}>
            <h3>📷 Take Staff Photo</h3>
            <video ref={videoRef} autoPlay playsInline className={styles.cameraVideo} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className={styles.cameraControls}>
              <button type="button" onClick={capturePhoto} className={styles.captureButton}>
                📸 Capture Photo
              </button>
              <button type="button" onClick={stopCamera} className={styles.cancelButton}>
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.staffForm}>
        <div className={styles.formGrid}>
          {columns
            .filter(col => !['id', 'global_staff_id', 'staff_id'].includes(col.column_name))
            .map(col => {
              const fieldName = col.column_name;
              const hasError = validationErrors[fieldName];
              return (
                <div key={fieldName} className={hasError ? styles.fieldError : ''}>
                  {renderField(col)}
                  {hasError && <span className={styles.errorMessage}>{validationErrors[fieldName]}</span>}
                </div>
              );
            })
          }
        </div>
        
        {/* Schedule validation error */}
        {validationErrors.schedule && (
          <div className={styles.scheduleError}>
            ⚠️ {validationErrors.schedule}
          </div>
        )}
        
        <div className={styles.submitSection}>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className={styles.spinner}></span>
                Adding Staff...
              </>
            ) : (
              '➕ Add Staff'
            )}
          </button>
        </div>
      </form>

      {showScheduleModal && partTimeOptions && (
        <PartTimeScheduleModal
          options={partTimeOptions}
          existingData={formData}
          onSave={handleScheduleSave}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
};

// Part Time Schedule Modal Component (keep the same as before)
const PartTimeScheduleModal = ({ options, existingData, onSave, onClose }) => {
  const [selectedDays, setSelectedDays] = useState(existingData.work_days || []);
  const [selectedShifts, setSelectedShifts] = useState(existingData.shifts || []);
  const [availability, setAvailability] = useState([]);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(existingData.max_hours_per_day || 8);
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState(existingData.max_hours_per_week || 40);

  useEffect(() => {
    const initialAvailability = [];
    options.days.forEach(day => {
      options.shifts.forEach(shift => {
        const existingSlot = existingData.availability?.find(
          slot => slot.day === day && slot.shift === shift
        );
        initialAvailability.push({
          day: day,
          shift: shift,
          start_time: existingSlot?.start_time || options.default_times[shift]?.start_time || '07:00',
          end_time: existingSlot?.end_time || options.default_times[shift]?.end_time || '17:30',
          active: existingSlot?.active || (existingData.work_days?.includes(day) && existingData.shifts?.includes(shift))
        });
      });
    });
    setAvailability(initialAvailability);
  }, [options, existingData]);

  const handleDayToggle = (day) => {
    const newSelectedDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    setSelectedDays(newSelectedDays);

    const updatedAvailability = availability.map(slot => ({
      ...slot,
      active: newSelectedDays.includes(slot.day) && selectedShifts.includes(slot.shift)
    }));
    setAvailability(updatedAvailability);
  };

  const handleShiftToggle = (shift) => {
    const newSelectedShifts = selectedShifts.includes(shift)
      ? selectedShifts.filter(s => s !== shift)
      : [...selectedShifts, shift];
    setSelectedShifts(newSelectedShifts);

    const updatedAvailability = availability.map(slot => ({
      ...slot,
      active: selectedDays.includes(slot.day) && newSelectedShifts.includes(slot.shift)
    }));
    setAvailability(updatedAvailability);
  };

  const handleTimeChange = (day, shift, field, value) => {
    const updatedAvailability = availability.map(slot => 
      slot.day === day && slot.shift === shift
        ? { ...slot, [field]: value }
        : slot
    );
    setAvailability(updatedAvailability);
  };

  const handleSlotToggle = (day, shift) => {
    const updatedAvailability = availability.map(slot => 
      slot.day === day && slot.shift === shift
        ? { ...slot, active: !slot.active }
        : slot
    );
    setAvailability(updatedAvailability);
  };

  const handleSelectAll = (type) => {
    if (type === 'days') {
      const allDays = [...options.days];
      setSelectedDays(allDays);
      const updatedAvailability = availability.map(slot => ({
        ...slot,
        active: allDays.includes(slot.day) && selectedShifts.includes(slot.shift)
      }));
      setAvailability(updatedAvailability);
    } else if (type === 'shifts') {
      const allShifts = [...options.shifts];
      setSelectedShifts(allShifts);
      const updatedAvailability = availability.map(slot => ({
        ...slot,
        active: selectedDays.includes(slot.day) && allShifts.includes(slot.shift)
      }));
      setAvailability(updatedAvailability);
    }
  };

  const handleDeselectAll = (type) => {
    if (type === 'days') {
      setSelectedDays([]);
      const updatedAvailability = availability.map(slot => ({
        ...slot,
        active: false
      }));
      setAvailability(updatedAvailability);
    } else if (type === 'shifts') {
      setSelectedShifts([]);
      const updatedAvailability = availability.map(slot => ({
        ...slot,
        active: false
      }));
      setAvailability(updatedAvailability);
    }
  };

  const handleSave = () => {
    const activeSlots = availability.filter(slot => slot.active);
    onSave({
      work_days: selectedDays,
      shifts: selectedShifts,
      availability: activeSlots,
      max_hours_per_day: maxHoursPerDay,
      max_hours_per_week: maxHoursPerWeek
    });
  };

  const calculateTotalHours = () => {
    let totalMinutes = 0;
    availability.forEach(slot => {
      if (slot.active && slot.start_time && slot.end_time) {
        const start = new Date(`1970-01-01T${slot.start_time}`);
        const end = new Date(`1970-01-01T${slot.end_time}`);
        const diff = (end - start) / (1000 * 60);
        totalMinutes += diff;
      }
    });
    return (totalMinutes / 60).toFixed(2);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>Part-Time Schedule Setup</h3>
        
        <div className={styles.scheduleSection}>
          <div className={styles.sectionHeader}>
            <h4>Select Available Days</h4>
            <div className={styles.bulkActions}>
              <button type="button" onClick={() => handleSelectAll('days')} className={styles.bulkButton}>
                Select All
              </button>
              <button type="button" onClick={() => handleDeselectAll('days')} className={styles.bulkButton}>
                Deselect All
              </button>
            </div>
          </div>
          <div className={styles.daySelection}>
            {options.days.map(day => (
              <button
                key={day}
                type="button"
                className={`${styles.dayButton} ${selectedDays.includes(day) ? styles.selected : ''}`}
                onClick={() => handleDayToggle(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.scheduleSection}>
          <div className={styles.sectionHeader}>
            <h4>Select Preferred Shifts</h4>
            <div className={styles.bulkActions}>
              <button type="button" onClick={() => handleSelectAll('shifts')} className={styles.bulkButton}>
                Select All
              </button>
              <button type="button" onClick={() => handleDeselectAll('shifts')} className={styles.bulkButton}>
                Deselect All
              </button>
            </div>
          </div>
          <div className={styles.shiftSelection}>
            {options.shifts.map(shift => (
              <button
                key={shift}
                type="button"
                className={`${styles.shiftButton} ${selectedShifts.includes(shift) ? styles.selected : ''}`}
                onClick={() => handleShiftToggle(shift)}
              >
                {shift.charAt(0).toUpperCase() + shift.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.scheduleSection}>
          <h4>Set Maximum Hours</h4>
          <div className={styles.hoursInput}>
            <div className={styles.hourInputGroup}>
              <label>Max Hours Per Day:</label>
              <input
                type="number"
                value={maxHoursPerDay}
                onChange={(e) => setMaxHoursPerDay(parseInt(e.target.value) || 0)}
                min="1"
                max="24"
                className={styles.numberInput}
              />
            </div>
            <div className={styles.hourInputGroup}>
              <label>Max Hours Per Week:</label>
              <input
                type="number"
                value={maxHoursPerWeek}
                onChange={(e) => setMaxHoursPerWeek(parseInt(e.target.value) || 0)}
                min="1"
                max="168"
                className={styles.numberInput}
              />
            </div>
          </div>
        </div>

        <div className={styles.scheduleSection}>
          <div className={styles.sectionHeader}>
            <h4>Set Specific Times (Total: {calculateTotalHours()} hours)</h4>
            <p className={styles.helpText}>Check the boxes and set times for each day-shift combination</p>
          </div>
          <div className={styles.availabilityGrid}>
            {availability.map((slot, index) => (
              <div key={`${slot.day}-${slot.shift}`} className={`${styles.availabilitySlot} ${slot.active ? styles.active : ''}`}>
                <label className={styles.slotLabel}>
                  <input
                    type="checkbox"
                    checked={slot.active}
                    onChange={() => handleSlotToggle(slot.day, slot.shift)}
                    className={styles.slotCheckbox}
                  />
                  <span className={styles.slotText}>
                    {slot.day} - {slot.shift}
                  </span>
                </label>
                {slot.active && (
                  <div className={styles.timeInputs}>
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => handleTimeChange(slot.day, slot.shift, 'start_time', e.target.value)}
                      className={styles.timeInput}
                    />
                    <span className={styles.timeSeparator}>to</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => handleTimeChange(slot.day, slot.shift, 'end_time', e.target.value)}
                      className={styles.timeInput}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button type="button" onClick={handleSave} className={styles.primaryButton}>
            Save Schedule
          </button>
          <button type="button" onClick={onClose} className={styles.secondaryButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffForm;