import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { motion } from 'framer-motion';
import Webcam from 'react-webcam';
import {
  FiUser, FiCalendar, FiBook, FiChevronDown, FiUpload, FiEdit2, FiType,
  FiCamera, FiPlus, FiTrash2, FiEye, FiCheckSquare, FiXCircle, FiDownload, FiCopy,
  FiVideo, FiX, FiFile
} from 'react-icons/fi';
import axios from 'axios';
import * as XLSX from 'xlsx';
import styles from './CreateRegisterStudent.module.css';

const AddStudentS = () => {
  const { register, handleSubmit, formState: { errors }, setValue, reset, control, clearErrors, trigger } = useForm({
    mode: 'onChange',
    defaultValues: {
      class: '',
      isGuardianExisting: 'no',
      student_name: '',
      age: '',
      gender: '',
      guardian_name: '',
      guardian_phone: '',
      guardian_relation: ''
    }
  });
  
  const isGuardianExisting = useWatch({ name: 'isGuardianExisting', control });
  const [previewMode, setPreviewMode] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [customFilePreviews, setCustomFilePreviews] = useState({});
  const [newCredentials, setNewCredentials] = useState(null);
  const [fetchedGuardian, setFetchedGuardian] = useState(null);
  const [guardianSearchError, setGuardianSearchError] = useState('');
  const [formStructure, setFormStructure] = useState({ customFields: [] });
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState(null);
  const webcamRef = useRef(null);
  
  // Multi-select states
  const [multiSelectValues, setMultiSelectValues] = useState({});

  const genderOptions = ['Male', 'Female'];

  // Fixed field type detection with proper array checking
  const getFieldType = (column) => {
    // Safely check if customFields exists and is an array
    const customFields = formStructure.customFields;
    if (customFields && Array.isArray(customFields)) {
      const customField = customFields.find(field => field && field.name === column.column_name);
      if (customField && customField.type) {
        return customField.type;
      }
    }
    
    // Simple pattern matching based on column name
    const name = column.column_name.toLowerCase();
    
    if (name.includes('date') || name.includes('dob') || name.includes('birth')) return 'date';
    if (name.includes('number') || name.includes('age') || name.includes('count')) return 'number';
    if (name.includes('checkbox') || name.includes('bool') || name.includes('flag')) return 'checkbox';
    if (name.includes('textarea') || name.includes('description') || name.includes('bio')) return 'textarea';
    if (name.includes('multi') || name.includes('select') || name.includes('options')) return 'multi-select';
    if (name.includes('select') || name.includes('dropdown') || name.includes('choice')) return 'select';
    if (name.includes('upload') || name.includes('file') || name.includes('image') || name.includes('photo')) return 'upload';
    
    // Fallback to database type
    if (column.data_type === 'integer') return 'number';
    if (column.data_type === 'date') return 'date';
    if (column.data_type === 'boolean') return 'checkbox';
    if (column.data_type === 'text') return 'textarea';
    
    return 'text';
  };

  // Fixed field options with proper array checking
  const getFieldOptions = (column) => {
    const customFields = formStructure.customFields;
    if (customFields && Array.isArray(customFields)) {
      const customField = customFields.find(field => field && field.name === column.column_name);
      if (customField && Array.isArray(customField.options)) {
        return customField.options;
      }
    }
    return ['Option 1', 'Option 2', 'Option 3'];
  };

  // Camera capture function
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      if (cameraMode === 'image_student') {
        setPhotoPreview(imageSrc);
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setValue('image_student', file);
          });
      } else {
        setCustomFilePreviews(prev => ({ ...prev, [cameraMode]: imageSrc }));
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setValue(cameraMode, file);
          });
      }
      setShowCamera(false);
      setCameraMode(null);
    }
  }, [cameraMode, webcamRef, setValue]);

  // Camera component
  const CameraModal = () => (
    <div className={styles.cameraModal}>
      <div className={styles.cameraContent}>
        <div className={styles.cameraHeader}>
          <h3>Take a Photo</h3>
          <button 
            type="button" 
            onClick={() => {
              setShowCamera(false);
              setCameraMode(null);
            }}
            className={styles.closeCamera}
          >
            <FiX />
          </button>
        </div>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className={styles.webcam}
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user"
          }}
        />
        <div className={styles.cameraControls}>
          <button 
            type="button" 
            onClick={capture}
            className={styles.captureButton}
          >
            <FiCamera size={24} />
            Capture Photo
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    setIsLoading(true);
    axios.get('https://excellence.oddag.et/api/students/classes', { timeout: 10000 })
      .then(response => {
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setAvailableClasses(response.data);
          if (response.data[0]) {
            setSelectedClass(response.data[0]);
            setValue('class', response.data[0]);
            fetchColumns(response.data[0]);
          }
        } else {
          setErrorMessage('No form structure exists. Please create it first in Task 2.');
        }
      })
      .catch(error => {
        console.error('Error fetching classes:', error);
        setErrorMessage(`Failed to fetch classes: ${error.message}`);
      })
      .finally(() => setIsLoading(false));

    // Fetch form structure with custom field metadata
    axios.get('https://excellence.oddag.et/api/students/form-structure', { timeout: 10000 })
      .then(response => {
        // Ensure we have a valid structure with arrays
        const data = response.data || {};
        setFormStructure({
          classes: Array.isArray(data.classes) ? data.classes : [],
          customFields: Array.isArray(data.customFields) ? data.customFields : []
        });
      })
      .catch(error => {
        console.error('Error fetching form structure:', error);
        // Set empty structure on error
        setFormStructure({ classes: [], customFields: [] });
      });
  }, [setValue]);

  // Initialize multi-select values when columns change
  useEffect(() => {
    const multiSelectColumns = tableColumns.filter(col => getFieldType(col) === 'multi-select');
    const initialValues = {};
    multiSelectColumns.forEach(col => {
      initialValues[col.column_name] = [];
    });
    setMultiSelectValues(initialValues);
  }, [tableColumns, formStructure]);

  useEffect(() => {
    if (isGuardianExisting === 'yes') {
      setFetchedGuardian(null);
      setGuardianSearchError('');
      setValue('guardian_name', '');
      setValue('guardian_phone', '');
      setValue('guardian_relation', '');
      clearErrors(['guardian_name', 'guardian_phone', 'guardian_relation']);
    } else {
      setFetchedGuardian(null);
      setGuardianSearchError('');
      setValue('guardian_phone', '');
      setValue('guardian_relation', '');
      clearErrors(['guardian_phone', 'guardian_relation']);
    }
  }, [isGuardianExisting, setValue, clearErrors]);

  const fetchColumns = async (className) => {
    if (!className) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`https://excellence.oddag.et/api/students/columns/${className}`, { timeout: 10000 });
      if (response.data && Array.isArray(response.data)) {
        setTableColumns(response.data.filter(col => !['username', 'password', 'guardian_username', 'guardian_password'].includes(col.column_name)));
      } else {
        setTableColumns([]);
      }
    } catch (error) {
      console.error('Error fetching columns:', error);
      setErrorMessage(`Failed to fetch columns: ${error.message}`);
      setTableColumns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuardianSearch = async (phone) => {
    if (!phone.trim()) {
      setFetchedGuardian(null);
      setGuardianSearchError('');
      setValue('guardian_name', '');
      setValue('guardian_relation', '');
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await axios.get(`https://excellence.oddag.et/api/students/search-guardian/${encodeURIComponent(phone)}`, { timeout: 10000 });
      setFetchedGuardian({
        name: response.data.guardian_name,
        phone,
        username: response.data.guardian_username,
        password: response.data.guardian_password
      });
      setValue('guardian_name', response.data.guardian_name);
      setValue('guardian_phone', phone);
      setGuardianSearchError('');
      clearErrors(['guardian_phone', 'guardian_name']);
      
      // If guardian exists but user selected "New Guardian", show warning
      if (isGuardianExisting === 'no') {
        setGuardianSearchError('This phone number is already registered. Please select "Existing Guardian" or use a different phone number.');
      }
    } catch (error) {
      console.error('Guardian search error:', error);
      setFetchedGuardian(null);
      setValue('guardian_phone', phone);
      
      if (error.response?.status === 404) {
        // Guardian not found - this is normal for new guardians
        if (isGuardianExisting === 'yes') {
          setGuardianSearchError('No guardian found with this phone number. Please verify the number or register as a new guardian.');
        } else {
          // For new guardians, no error - this is expected
          setGuardianSearchError('');
          setValue('guardian_name', '');
        }
      } else {
        // Other errors
        setGuardianSearchError(`Failed to search guardian: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e, fieldName = 'image_student', acceptedTypes = 'image/*') => {
    const file = e.target.files[0];
    if (file) {
      // Check file type if specific types are required
      if (acceptedTypes !== '*/*') {
        const accepted = acceptedTypes.split(',').map(type => type.trim());
        const fileType = file.type;
        const fileName = file.name.toLowerCase();
        
        let isValidType = accepted.some(type => {
          if (type === 'image/*') return fileType.startsWith('image/');
          if (type === 'application/pdf') return fileType === 'application/pdf';
          if (type.includes('sheet') || type.includes('excel')) 
            return fileType.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
          if (type.includes('document') || type.includes('word')) 
            return fileType.includes('document') || fileName.endsWith('.docx') || fileName.endsWith('.doc');
          return fileType === type || fileName.endsWith(type.replace('.', ''));
        });
        
        if (!isValidType) {
          setErrorMessage(`Invalid file type for ${fieldName}. Accepted types: ${acceptedTypes}`);
          return;
        }
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (fieldName === 'image_student') {
          setPhotoPreview(reader.result);
        } else {
          setCustomFilePreviews(prev => ({ ...prev, [fieldName]: reader.result }));
        }
      };
      
      // Only try to read as data URL for images, for other files just store the file info
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        if (fieldName === 'image_student') {
          setPhotoPreview(null);
        } else {
          setCustomFilePreviews(prev => ({ 
            ...prev, 
            [fieldName]: `File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)` 
          }));
        }
      }
      
      setValue(fieldName, file);
    }
  };

  const handleMultiSelectChange = (fieldName, value, checked) => {
    setMultiSelectValues(prev => {
      const currentValues = prev[fieldName] || [];
      let newValues;
      if (checked) {
        newValues = [...currentValues, value];
      } else {
        newValues = currentValues.filter(item => item !== value);
      }
      
      setValue(fieldName, newValues.join(','));
      
      return {
        ...prev,
        [fieldName]: newValues
      };
    });
  };

  const handleClassChange = (e) => {
    const className = e.target.value;
    setSelectedClass(className);
    setValue('class', className);
    fetchColumns(className);
  };

  const handleDeleteForm = async () => {
    if (window.confirm('Are you sure you want to delete the form structure? This will drop all class tables.')) {
      setIsLoading(true);
      try {
        await axios.delete('https://excellence.oddag.et/api/students/delete-form');
        setAvailableClasses([]);
        setTableColumns([]);
        setSelectedClass('');
        setValue('class', '');
        setErrorMessage('');
        setShowSuccess(false);
        setFormStructure({ classes: [], customFields: [] });
      } catch (error) {
        setErrorMessage('Failed to delete form: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDownload = async () => {
    if (!selectedClass) return;
    try {
      const columns = tableColumns.map(col => col.column_name);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([columns]);
      XLSX.utils.book_append_sheet(wb, ws, selectedClass);
      XLSX.writeFile(wb, `${selectedClass}_template.xlsx`);
    } catch (error) {
      setErrorMessage('Failed to download template: ' + error.message);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        console.log(data);
      };
      reader.readAsBinaryString(file);
    }
  };

  const onSubmit = async (data) => {
    if (previewMode) {
      setPreviewMode(false);
      return;
    }

    const isValid = await trigger();
    if (!isValid) {
      setErrorMessage('Please fix the validation errors before submitting.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setShowSuccess(false);
    try {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      const files = document.querySelectorAll('input[type="file"]');
      files.forEach(fileInput => {
        if (fileInput.files[0]) {
          formData.append(fileInput.name || 'file', fileInput.files[0]);
        }
      });

      const response = await axios.post('https://excellence.oddag.et/api/students/add-student', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 10000
      });
      setNewCredentials({
        student_username: response.data.student_username,
        student_password: response.data.student_password,
        guardian_username: response.data.guardian_username,
        guardian_password: response.data.guardian_password
      });
      setShowSuccess(true);
      reset();
      setPhotoPreview(null);
      setCustomFilePreviews({});
      setFetchedGuardian(null);
      setMultiSelectValues({});
    } catch (err) {
      setErrorMessage('Failed to add student: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const renderUploadOptions = (fieldName, label, acceptTypes = 'image/*') => {
    const isImageField = fieldName === 'image_student';
    const acceptString = isImageField ? 'image/*' : acceptTypes;
    
    return (
      <div className={styles.uploadOptions}>
        <label className={styles.uploadOption}>
          <FiUpload />
          Upload File
          <input
            type="file"
            accept={acceptString}
            onChange={(e) => handleFileUpload(e, fieldName, acceptString)}
            className={styles.fileInput}
            disabled={isLoading}
          />
        </label>
        {isImageField && (
          <button
            type="button"
            onClick={() => {
              setCameraMode(fieldName);
              setShowCamera(true);
            }}
            className={styles.uploadOption}
            disabled={isLoading}
          >
            <FiCamera />
            Take Photo
          </button>
        )}
      </div>
    );
  };

  // Render multi-select field
  const renderMultiSelectField = (column) => {
    const options = getFieldOptions(column);
    const currentValues = multiSelectValues[column.column_name] || [];

    return (
      <div className={styles.multiSelectContainer}>
        <div className={styles.multiSelectLabel}>Select options:</div>
        <div className={styles.multiSelectOptions}>
          {options.map((option, index) => (
            <label key={`${column.column_name}-option-${index}`} className={styles.multiSelectOption}>
              <input
                type="checkbox"
                checked={currentValues.includes(option)}
                onChange={(e) => handleMultiSelectChange(column.column_name, option, e.target.checked)}
                disabled={previewMode || isLoading}
                className={styles.multiSelectCheckbox}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {errors[column.column_name] && (
          <span className={styles.errorMessage}>{errors[column.column_name].message}</span>
        )}
      </div>
    );
  };

  // Render select dropdown field
  const renderSelectField = (column, validationRules) => {
    const options = getFieldOptions(column);

    return (
      <div className={styles.selectWrapper}>
        <select
          {...register(column.column_name, validationRules)}
          disabled={previewMode || isLoading}
          className={`${styles.select} ${errors[column.column_name] ? styles.error : ''}`}
        >
          <option value="">{`Select ${column.column_name.replace(/_/g, ' ')}`}</option>
          {options.map((option, i) => (
            <option key={`${column.column_name}-option-${i}`} value={option}>{option}</option>
          ))}
        </select>
        <FiChevronDown className={styles.selectIcon} />
        {errors[column.column_name] && <span className={styles.errorMessage}>{errors[column.column_name].message}</span>}
      </div>
    );
  };

  // Render upload field
  const renderUploadField = (column, isRequired) => {
    const preview = customFilePreviews[column.column_name];
    
    return (
      <div className={styles.formGroup}>
        <label>{column.column_name.replace(/_/g, ' ')}{isRequired ? <span className={styles.required}>*</span> : ''}</label>
        {preview ? (
          <div className={styles.photoPreview}>
            {preview.startsWith('data:image') ? (
              <img src={preview} alt="Preview" />
            ) : (
              <div className={styles.filePreview}>
                <FiFile size={24} />
                <span>{preview}</span>
              </div>
            )}
            {!previewMode && (
              <button
                type="button"
                className={styles.removePhoto}
                onClick={() => {
                  setCustomFilePreviews(prev => {
                    const newPreviews = { ...prev };
                    delete newPreviews[column.column_name];
                    return newPreviews;
                  });
                  setValue(column.column_name, null);
                }}
                disabled={isLoading}
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        ) : (
          !previewMode && renderUploadOptions(
            column.column_name, 
            column.column_name.replace(/_/g, ' '),
            'image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
          )
        )}
        {errors[column.column_name] && (
          <span className={styles.errorMessage}>{errors[column.column_name].message}</span>
        )}
      </div>
    );
  };

  // Render custom field based on type
  const renderCustomField = (column) => {
    const isRequired = column.is_nullable === 'NO';
    const validationRules = isRequired ? { required: `${column.column_name.replace(/_/g, ' ')} is required` } : {};
    const fieldType = getFieldType(column);

    // Handle upload field separately
    if (fieldType === 'upload') {
      return renderUploadField(column, isRequired);
    }

    return (
      <div key={column.column_name} className={styles.formGroup}>
        <label>{column.column_name.replace(/_/g, ' ')}{isRequired ? <span className={styles.required}>*</span> : ''}</label>
        
        {fieldType === 'multi-select' ? (
          renderMultiSelectField(column)
        ) : fieldType === 'select' ? (
          renderSelectField(column, validationRules)
        ) : fieldType === 'checkbox' ? (
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              {...register(column.column_name)}
              disabled={previewMode || isLoading}
              className={styles.checkboxInput}
            />
            <label className={styles.checkboxLabel}>
              {column.column_name.replace(/_/g, ' ')}
            </label>
            {errors[column.column_name] && <span className={styles.errorMessage}>{errors[column.column_name].message}</span>}
          </div>
        ) : fieldType === 'textarea' ? (
          <textarea
            {...register(column.column_name, {
              ...validationRules,
              minLength: { value: 2, message: 'Must be at least 2 characters' }
            })}
            disabled={previewMode || isLoading}
            className={`${styles.textarea} ${errors[column.column_name] ? styles.error : ''}`}
            placeholder={column.column_name.replace(/_/g, ' ')}
            rows={4}
          />
        ) : fieldType === 'date' ? (
          <input
            type="date"
            {...register(column.column_name, validationRules)}
            disabled={previewMode || isLoading}
            className={`${styles.input} ${errors[column.column_name] ? styles.error : ''}`}
          />
        ) : fieldType === 'number' ? (
          <input
            type="number"
            {...register(column.column_name, {
              ...validationRules,
              validate: {
                validNumber: (value) => !value || !isNaN(value) || 'Must be a valid number'
              }
            })}
            disabled={previewMode || isLoading}
            className={`${styles.input} ${errors[column.column_name] ? styles.error : ''}`}
            placeholder={column.column_name.replace(/_/g, ' ')}
          />
        ) : (
          <input
            type="text"
            {...register(column.column_name, {
              ...validationRules,
              minLength: { value: 2, message: 'Must be at least 2 characters' }
            })}
            disabled={previewMode || isLoading}
            className={`${styles.input} ${errors[column.column_name] ? styles.error : ''}`}
            placeholder={column.column_name.replace(/_/g, ' ')}
          />
        )}
        {errors[column.column_name] && (
          <span className={styles.errorMessage}>{errors[column.column_name].message}</span>
        )}
      </div>
    );
  };

  return (
    <motion.div className={styles.container} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {showCamera && <CameraModal />}
      
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {showSuccess && newCredentials && (
          <div className={styles.successMessage}>
            <p>Student added successfully!</p>
            <div className={styles.credentials}>
              <p>Student Username: {newCredentials.student_username} <FiCopy onClick={() => handleCopy(newCredentials.student_username)} /></p>
              <p>Student Password: {newCredentials.student_password} <FiCopy onClick={() => handleCopy(newCredentials.student_password)} /></p>
              <p>Guardian Username: {newCredentials.guardian_username} <FiCopy onClick={() => handleCopy(newCredentials.guardian_username)} /></p>
              <p>Guardian Password: {newCredentials.guardian_password} <FiCopy onClick={() => handleCopy(newCredentials.guardian_password)} /></p>
            </div>
          </div>
        )}
        {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
        {isLoading && <p className={styles.loadingMessage}>Loading...</p>}

        <div className={styles.formGrid}>
          {/* Student Information Section */}
          <div className={styles.section}>
            <h2><FiUser /> Student Information</h2>
            <div className={styles.formGroup}>
              <label>Class<span className={styles.required}>*</span></label>
              <div className={styles.selectWrapper}>
                <select
                  {...register('class', { required: 'Class is required' })}
                  onChange={handleClassChange}
                  disabled={previewMode || isLoading || availableClasses.length === 0}
                  className={`${styles.select} ${errors.class ? styles.error : ''}`}
                >
                  <option value="">Select Class</option>
                  {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
                <FiChevronDown className={styles.selectIcon} />
                {errors.class && <span className={styles.errorMessage}>{errors.class.message}</span>}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Student Name<span className={styles.required}>*</span></label>
              <input
                {...register('student_name', { 
                  required: 'Student name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  pattern: {
                    value: /^[A-Za-z\s]+$/,
                    message: 'Name can only contain letters and spaces'
                  }
                })}
                disabled={previewMode || isLoading}
                className={`${styles.input} ${errors.student_name ? styles.error : ''}`}
                placeholder="Enter student's full name"
              />
              {errors.student_name && <span className={styles.errorMessage}>{errors.student_name.message}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Age<span className={styles.required}>*</span></label>
              <input
                type="number"
                {...register('age', { 
                  required: 'Age is required', 
                  min: { value: 3, message: 'Age must be at least 3' },
                  max: { value: 100, message: 'Age must be less than 100' }
                })}
                disabled={previewMode || isLoading}
                className={`${styles.input} ${errors.age ? styles.error : ''}`}
                placeholder="Enter age"
              />
              {errors.age && <span className={styles.errorMessage}>{errors.age.message}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Gender<span className={styles.required}>*</span></label>
              <div className={styles.selectWrapper}>
                <select
                  {...register('gender', { required: 'Gender is required' })}
                  disabled={previewMode || isLoading}
                  className={`${styles.select} ${errors.gender ? styles.error : ''}`}
                >
                  <option value="">Select Gender</option>
                  {genderOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <FiChevronDown className={styles.selectIcon} />
                {errors.gender && <span className={styles.errorMessage}>{errors.gender.message}</span>}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Student Photo</label>
              {photoPreview ? (
                <div className={styles.photoPreview}>
                  <img src={photoPreview} alt="Student Preview" />
                  {!previewMode && (
                    <button
                      type="button"
                      className={styles.removePhoto}
                      onClick={() => {
                        setPhotoPreview(null);
                        setValue('image_student', null);
                      }}
                      disabled={isLoading}
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              ) : (
                !previewMode && renderUploadOptions('image_student', 'Upload Student Photo')
              )}
            </div>
          </div>

          {/* Guardian Information Section */}
          <div className={styles.section}>
            <h2><FiUser /> Guardian Information</h2>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input type="radio" value="no" {...register('isGuardianExisting')} disabled={isLoading} />
                New Guardian
              </label>
              <label className={styles.radioOption}>
                <input type="radio" value="yes" {...register('isGuardianExisting')} disabled={isLoading} />
                Existing Guardian
              </label>
            </div>
            <div className={styles.formGroup}>
              <label>Guardian Phone<span className={styles.required}>*</span></label>
              <input
                {...register('guardian_phone', { 
                  required: 'Guardian phone is required',
                  pattern: {
                    value: /^[0-9+\-\s()]{10,}$/,
                    message: 'Please enter a valid phone number'
                  }
                })}
                onBlur={(e) => handleGuardianSearch(e.target.value)}
                disabled={previewMode || isLoading || (isGuardianExisting === 'yes' && fetchedGuardian)}
                className={`${styles.input} ${errors.guardian_phone ? styles.error : ''}`}
                placeholder="Enter guardian's phone number"
              />
              {errors.guardian_phone && <span className={styles.errorMessage}>{errors.guardian_phone.message}</span>}
              {guardianSearchError && <span className={styles.errorMessage}>{guardianSearchError}</span>}
              {fetchedGuardian && isGuardianExisting === 'yes' && (
                <span className={styles.confirmMessage}>Guardian found: {fetchedGuardian.name}</span>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>Guardian Name<span className={styles.required}>*</span></label>
              <input
                {...register('guardian_name', { 
                  required: 'Guardian name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  pattern: {
                    value: /^[A-Za-z\s]+$/,
                    message: 'Name can only contain letters and spaces'
                  }
                })}
                disabled={previewMode || isLoading || (isGuardianExisting === 'yes' && fetchedGuardian)}
                className={`${styles.input} ${errors.guardian_name ? styles.error : ''}`}
                placeholder="Enter guardian's full name"
              />
              {errors.guardian_name && <span className={styles.errorMessage}>{errors.guardian_name.message}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Guardian Relation<span className={styles.required}>*</span></label>
              <input
                {...register('guardian_relation', { 
                  required: 'Guardian relation is required',
                  minLength: { value: 2, message: 'Relation must be at least 2 characters' }
                })}
                disabled={previewMode || isLoading}
                className={`${styles.input} ${errors.guardian_relation ? styles.error : ''}`}
                placeholder="e.g., Father, Mother, Guardian"
              />
              {errors.guardian_relation && <span className={styles.errorMessage}>{errors.guardian_relation.message}</span>}
            </div>
          </div>
        </div>

        {/* Custom Fields Section */}
        <div className={styles.section}>
          <h2>Custom Fields</h2>
          <div className={styles.formGrid}>
            {tableColumns
              .filter(col => !['id', 'school_id', 'class_id', 'image_student', 'student_name', 'age', 'gender', 'class', 'guardian_name', 'guardian_phone', 'guardian_relation'].includes(col.column_name))
              .map(column => renderCustomField(column))
            }
          </div>
        </div>

        <div className={styles.formFooter}>
          {!previewMode ? (
            <button
              type="submit"
              className={`${styles.button} ${styles.primary}`}
              disabled={isLoading || (isGuardianExisting === 'yes' && !fetchedGuardian)}
            >
              <FiPlus /> Add Student
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => setPreviewMode(false)}
              disabled={isLoading}
            >
              Back to Edit
            </button>
          )}
          {availableClasses.length > 0 && (
            <>
              <button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                onClick={handleDeleteForm}
                disabled={isLoading}
              >
                <FiXCircle /> Delete Form
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                onClick={handleDownload}
                disabled={isLoading}
              >
                <FiDownload /> Download Excel
              </button>
              <label className={`${styles.button} ${styles.secondary}`}>
                <FiUpload /> Upload Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className={styles.fileInput}
                  disabled={isLoading}
                />
              </label>
            </>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default AddStudentS;