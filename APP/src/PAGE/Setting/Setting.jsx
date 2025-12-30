import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import styles from './Setting.module.css';
import { useApp } from '../../context/AppContext';
import { FiUser, FiLock, FiGlobe, FiSun, FiImage, FiSave, FiCheck, FiX, FiCamera, FiUpload, FiHome } from 'react-icons/fi';

const Setting = () => {
  const { theme, updateTheme, language, updateLanguage, profile, updateProfile, websiteName, updateWebsiteName, t } = useApp();
  
  const fileInputRef = useRef(null);
  const iconInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('profile');
  
  // Local profile state for form
  const [localProfile, setLocalProfile] = useState({
    name: profile.name,
    email: profile.email,
    profileImage: profile.profileImage
  });
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Local theme state
  const [localTheme, setLocalTheme] = useState(theme);
  
  // Web icon state - loaded from database
  const [webIcon, setWebIcon] = useState(null);
  const [webIconUrl, setWebIconUrl] = useState(null);
  
  // Website name state - loaded from database
  const [localWebsiteName, setLocalWebsiteName] = useState(websiteName);
  
  // School info state
  const [schoolInfo, setSchoolInfo] = useState({
    address: '',
    phone: '',
    email: '',
    academicYear: ''
  });
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(null);
  const logoInputRef = useRef(null);
  
  // Messages
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  
  // Load branding settings from database on mount
  useEffect(() => {
    loadBrandingSettings();
  }, []);
  
  const loadBrandingSettings = async () => {
    try {
      const response = await axios.get('https://school-management-system-daul.onrender.com/api/admin/branding');
      const data = response.data;
      
      setLocalWebsiteName(data.website_name || 'School Management System');
      updateWebsiteName(data.website_name || 'School Management System');
      
      if (data.website_icon) {
        const iconUrl = `https://school-management-system-daul.onrender.com/uploads/branding/${data.website_icon}`;
        setWebIcon(data.website_icon);
        setWebIconUrl(iconUrl);
        
        // Update favicon
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = iconUrl;
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      
      // Load school info
      setSchoolInfo({
        address: data.school_address || '',
        phone: data.school_phone || '',
        email: data.school_email || '',
        academicYear: data.academic_year || ''
      });
      
      if (data.school_logo) {
        const logoUrl = `https://school-management-system-daul.onrender.com/uploads/branding/${data.school_logo}`;
        setSchoolLogo(data.school_logo);
        setSchoolLogoUrl(logoUrl);
      }
      
      // Update theme from database
      if (data.primary_color || data.secondary_color) {
        const newTheme = {
          ...theme,
          primaryColor: data.primary_color || theme.primaryColor,
          secondaryColor: data.secondary_color || theme.secondaryColor,
          mode: data.theme_mode || theme.mode
        };
        setLocalTheme(newTheme);
        updateTheme(newTheme);
      }
    } catch (error) {
      console.error('Failed to load branding settings:', error);
    }
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'om', name: 'Afaan Oromoo', flag: '🇪🇹' },
    { code: 'am', name: 'አማርኛ (Amharic)', flag: '🇪🇹' },
    { code: 'so', name: 'Soomaali', flag: '🇸🇴' },
    { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  const colorPresets = [
    { name: 'Purple', primary: '#667eea', secondary: '#764ba2' },
    { name: 'Blue', primary: '#2196F3', secondary: '#1976D2' },
    { name: 'Green', primary: '#4CAF50', secondary: '#388E3C' },
    { name: 'Orange', primary: '#FF9800', secondary: '#F57C00' },
    { name: 'Red', primary: '#f44336', secondary: '#d32f2f' },
    { name: 'Teal', primary: '#009688', secondary: '#00796B' },
    { name: 'Pink', primary: '#E91E63', secondary: '#C2185B' },
    { name: 'Indigo', primary: '#3F51B5', secondary: '#303F9F' }
  ];

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Profile handlers
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setLocalProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalProfile(prev => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      updateProfile(localProfile);
      showMessage('success', t('success') + '! Profile updated.');
    } catch (error) {
      showMessage('error', t('error') + ': Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Password handlers
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
      await axios.post('/api/admin/change-password', {
        username: adminUser.username,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      showMessage('success', t('success') + '! Password changed.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Theme handlers
  const handleColorPreset = (preset) => {
    const newTheme = { ...localTheme, primaryColor: preset.primary, secondaryColor: preset.secondary };
    setLocalTheme(newTheme);
    updateTheme(newTheme);
  };

  const handleCustomColor = (e, colorType) => {
    const newTheme = { ...localTheme, [colorType]: e.target.value };
    setLocalTheme(newTheme);
    updateTheme(newTheme);
  };

  const toggleDarkMode = () => {
    const newTheme = { ...localTheme, mode: localTheme.mode === 'light' ? 'dark' : 'light' };
    setLocalTheme(newTheme);
    updateTheme(newTheme);
  };

  const saveTheme = async () => {
    setLoading(true);
    try {
      updateTheme(localTheme);
      await saveThemeToDatabase();
      showMessage('success', t('success') + '! Theme saved to database.');
    } catch (error) {
      showMessage('error', 'Failed to save theme');
    } finally {
      setLoading(false);
    }
  };

  // Language handler
  const handleLanguageChange = (langCode) => {
    updateLanguage(langCode);
    showMessage('success', `Language changed to ${languages.find(l => l.code === langCode)?.name}`);
  };

  // Website name handler
  const handleWebsiteNameChange = (e) => {
    setLocalWebsiteName(e.target.value);
  };

  const saveWebsiteName = async () => {
    setLoading(true);
    try {
      await axios.put('https://school-management-system-daul.onrender.com/api/admin/branding', {
        website_name: localWebsiteName
      });
      
      // Update context and document title
      updateWebsiteName(localWebsiteName);
      document.title = localWebsiteName;
      showMessage('success', 'Website name saved to database!');
    } catch (error) {
      console.error('Failed to save website name:', error);
      showMessage('error', 'Failed to save website name');
    } finally {
      setLoading(false);
    }
  };

  // School info handlers
  const handleSchoolInfoChange = (e) => {
    const { name, value } = e.target;
    setSchoolInfo(prev => ({ ...prev, [name]: value }));
  };

  const saveSchoolInfo = async () => {
    setLoading(true);
    try {
      await axios.put('https://school-management-system-daul.onrender.com/api/admin/branding', {
        school_address: schoolInfo.address,
        school_phone: schoolInfo.phone,
        school_email: schoolInfo.email
      });
      showMessage('success', 'School information saved successfully!');
    } catch (error) {
      console.error('Failed to save school info:', error);
      showMessage('error', 'Failed to save school information');
    } finally {
      setLoading(false);
    }
  };

  // School logo handler
  const handleSchoolLogoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('logo', file);
        
        const response = await axios.post('https://school-management-system-daul.onrender.com/api/admin/branding/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const logoUrl = `https://school-management-system-daul.onrender.com${response.data.logoUrl}`;
        setSchoolLogo(response.data.logo);
        setSchoolLogoUrl(logoUrl);
        
        showMessage('success', 'School logo saved successfully!');
      } catch (error) {
        console.error('Failed to upload logo:', error);
        showMessage('error', 'Failed to upload logo');
      } finally {
        setLoading(false);
      }
    }
  };

  // Web icon handler - uploads to server and saves to database
  const handleWebIconChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('icon', file);
        
        const response = await axios.post('https://school-management-system-daul.onrender.com/api/admin/branding/icon', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const iconUrl = `https://school-management-system-daul.onrender.com${response.data.iconUrl}`;
        setWebIcon(response.data.icon);
        setWebIconUrl(iconUrl);
        
        // Update favicon
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = iconUrl;
        document.getElementsByTagName('head')[0].appendChild(link);
        
        showMessage('success', 'Web icon saved to database!');
      } catch (error) {
        console.error('Failed to upload icon:', error);
        showMessage('error', 'Failed to upload icon');
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Save theme to database
  const saveThemeToDatabase = async () => {
    try {
      await axios.put('https://school-management-system-daul.onrender.com/api/admin/branding', {
        primary_color: localTheme.primaryColor,
        secondary_color: localTheme.secondaryColor,
        theme_mode: localTheme.mode
      });
    } catch (error) {
      console.error('Failed to save theme to database:', error);
    }
  };

  const tabs = [
    { id: 'profile', label: t('profile'), icon: <FiUser /> },
    { id: 'password', label: t('password'), icon: <FiLock /> },
    { id: 'theme', label: t('theme'), icon: <FiSun /> },
    { id: 'language', label: t('language'), icon: <FiGlobe /> },
    { id: 'branding', label: t('branding'), icon: <FiImage /> },
    { id: 'schoolInfo', label: t('schoolInfo') || 'School Info', icon: <FiHome /> }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('settingsTitle')}</h1>
        <p className={styles.subtitle}>{t('settingsSubtitle')}</p>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === 'success' ? <FiCheck /> : <FiX />}
          {message.text}
        </div>
      )}

      <div className={styles.settingsLayout}>
        <div className={styles.sidebar}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? {
                background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`
              } : {}}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('profileSettings')}</h2>
              
              <div className={styles.profileImageSection}>
                <div className={styles.profileImageWrapper}>
                  {localProfile.profileImage ? (
                    <img src={localProfile.profileImage} alt="Profile" className={styles.profileImage} />
                  ) : (
                    <div className={styles.profilePlaceholder} style={{
                      background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`
                    }}>
                      <FiUser />
                    </div>
                  )}
                  <button 
                    className={styles.changeImageBtn}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: theme.primaryColor }}
                  >
                    <FiCamera />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  style={{ display: 'none' }}
                />
                <p className={styles.imageHint}>Click to change profile picture</p>
              </div>

              <div className={styles.formGroup}>
                <label>{t('fullName')}</label>
                <input
                  type="text"
                  name="name"
                  value={localProfile.name}
                  onChange={handleProfileChange}
                  placeholder="Enter your name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>{t('emailAddress')}</label>
                <input
                  type="email"
                  name="email"
                  value={localProfile.email}
                  onChange={handleProfileChange}
                  placeholder="Enter your email"
                />
              </div>

              <button 
                className={styles.saveBtn} 
                onClick={saveProfile} 
                disabled={loading}
                style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
              >
                <FiSave /> {loading ? t('loading') : t('saveProfile')}
              </button>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('changePassword')}</h2>
              
              <div className={styles.formGroup}>
                <label>{t('currentPassword')}</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                />
              </div>

              <div className={styles.formGroup}>
                <label>{t('newPassword')}</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                />
              </div>

              <div className={styles.formGroup}>
                <label>{t('confirmPassword')}</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                />
              </div>

              <button 
                className={styles.saveBtn} 
                onClick={changePassword} 
                disabled={loading}
                style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
              >
                <FiLock /> {loading ? t('loading') : t('changePassword')}
              </button>
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('themeSettings')}</h2>
              
              <div className={styles.themeToggle}>
                <span>{t('darkMode')}</span>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={localTheme.mode === 'dark'}
                    onChange={toggleDarkMode}
                  />
                  <span className={styles.slider} style={localTheme.mode === 'dark' ? {
                    background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`
                  } : {}}></span>
                </label>
              </div>

              <div className={styles.colorPresets}>
                <h3>{t('colorPresets')}</h3>
                <div className={styles.presetGrid}>
                  {colorPresets.map(preset => (
                    <button
                      key={preset.name}
                      className={styles.presetBtn}
                      style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
                      onClick={() => handleColorPreset(preset)}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.customColors}>
                <h3>{t('customColors')}</h3>
                <div className={styles.colorPickers}>
                  <div className={styles.colorPicker}>
                    <label>{t('primaryColor')}</label>
                    <div className={styles.colorInputWrapper}>
                      <input
                        type="color"
                        value={localTheme.primaryColor}
                        onChange={(e) => handleCustomColor(e, 'primaryColor')}
                      />
                      <span>{localTheme.primaryColor}</span>
                    </div>
                  </div>
                  <div className={styles.colorPicker}>
                    <label>{t('secondaryColor')}</label>
                    <div className={styles.colorInputWrapper}>
                      <input
                        type="color"
                        value={localTheme.secondaryColor}
                        onChange={(e) => handleCustomColor(e, 'secondaryColor')}
                      />
                      <span>{localTheme.secondaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.themePreview}>
                <h3>{t('preview')}</h3>
                <div 
                  className={styles.previewBox}
                  style={{ background: `linear-gradient(135deg, ${localTheme.primaryColor}, ${localTheme.secondaryColor})` }}
                >
                  <span>Theme Preview</span>
                </div>
              </div>

              <button 
                className={styles.saveBtn} 
                onClick={saveTheme}
                style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
              >
                <FiSave /> {t('saveTheme')}
              </button>
            </div>
          )}

          {/* Language Tab */}
          {activeTab === 'language' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('languageSettings')}</h2>
              
              <div className={styles.languageGrid}>
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    className={`${styles.languageBtn} ${language === lang.code ? styles.active : ''}`}
                    onClick={() => handleLanguageChange(lang.code)}
                    style={language === lang.code ? {
                      borderColor: theme.primaryColor,
                      background: `linear-gradient(135deg, ${theme.primaryColor}15, ${theme.secondaryColor}15)`
                    } : {}}
                  >
                    <span className={styles.flag}>{lang.flag}</span>
                    <span className={styles.langName}>{lang.name}</span>
                    {language === lang.code && <FiCheck className={styles.checkIcon} style={{ color: theme.primaryColor }} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('brandingSettings')}</h2>
              <p className={styles.hint} style={{ marginBottom: '20px', color: '#4CAF50' }}>
                ✓ All branding settings are saved to the database and persist across sessions
              </p>
              
              {/* Website Name Section */}
              <div className={styles.brandingSection}>
                <h3>Website / School Name</h3>
                <p className={styles.hint}>This name appears in the header and browser title</p>
                
                <div className={styles.formGroup}>
                  <input
                    type="text"
                    value={localWebsiteName}
                    onChange={handleWebsiteNameChange}
                    placeholder="Enter your school or website name"
                    className={styles.websiteNameInput}
                  />
                </div>
                
                <div className={styles.namePreview}>
                  <span className={styles.previewLabel}>Preview:</span>
                  <span className={styles.previewName} style={{ color: theme.primaryColor }}>{localWebsiteName}</span>
                </div>
                
                <button 
                  className={styles.saveBtn}
                  onClick={saveWebsiteName}
                  disabled={loading}
                  style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
                >
                  <FiSave /> {loading ? 'Saving...' : 'Save Name to Database'}
                </button>
              </div>
              
              {/* Website Icon Section */}
              <div className={styles.brandingSection}>
                <h3>{t('websiteIcon')}</h3>
                <p className={styles.hint}>This icon appears in browser tabs (saved to database)</p>
                
                <div className={styles.iconUpload}>
                  <div className={styles.iconPreview}>
                    {webIconUrl ? (
                      <img src={webIconUrl} alt="Web Icon" />
                    ) : (
                      <div className={styles.iconPlaceholder}>🎓</div>
                    )}
                  </div>
                  <button 
                    className={styles.uploadBtn}
                    onClick={() => iconInputRef.current?.click()}
                    disabled={loading}
                    style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                  >
                    <FiUpload /> {loading ? 'Uploading...' : t('uploadIcon')}
                  </button>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWebIconChange}
                    style={{ display: 'none' }}
                  />
                </div>
                <p className={styles.iconHint}>Recommended: 32x32 or 64x64 pixels, PNG or ICO format</p>
              </div>
            </div>
          )}

          {/* School Info Tab */}
          {activeTab === 'schoolInfo' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('schoolInfo') || 'School Information'}</h2>
              <p className={styles.hint} style={{ marginBottom: '20px', color: '#4CAF50' }}>
                ✓ School information is displayed on report cards and official documents
              </p>
              
              {/* School Logo Section */}
              <div className={styles.brandingSection}>
                <h3>{t('schoolLogo') || 'School Logo'}</h3>
                <p className={styles.hint}>This logo appears on report cards and official documents</p>
                
                <div className={styles.iconUpload}>
                  <div className={styles.logoPreview}>
                    {schoolLogoUrl ? (
                      <img src={schoolLogoUrl} alt="School Logo" />
                    ) : (
                      <div className={styles.iconPlaceholder}>🏫</div>
                    )}
                  </div>
                  <button 
                    className={styles.uploadBtn}
                    onClick={() => logoInputRef.current?.click()}
                    disabled={loading}
                    style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
                  >
                    <FiUpload /> {loading ? 'Uploading...' : t('uploadLogo') || 'Upload Logo'}
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSchoolLogoChange}
                    style={{ display: 'none' }}
                  />
                </div>
                <p className={styles.iconHint}>Recommended: 200x200 pixels or larger, PNG or JPG format</p>
              </div>
              
              {/* School Details Section */}
              <div className={styles.brandingSection}>
                <h3>{t('schoolDetails') || 'School Details'}</h3>
                
                <div className={styles.formGroup}>
                  <label>{t('schoolAddress') || 'School Address'}</label>
                  <input
                    type="text"
                    name="address"
                    value={schoolInfo.address}
                    onChange={handleSchoolInfoChange}
                    placeholder="Enter school address"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>{t('schoolPhone') || 'Phone Number'}</label>
                  <input
                    type="text"
                    name="phone"
                    value={schoolInfo.phone}
                    onChange={handleSchoolInfoChange}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>{t('schoolEmail') || 'Email Address'}</label>
                  <input
                    type="email"
                    name="email"
                    value={schoolInfo.email}
                    onChange={handleSchoolInfoChange}
                    placeholder="Enter email address"
                  />
                </div>
                
                {schoolInfo.academicYear && (
                  <div className={styles.namePreview} style={{ marginBottom: '16px' }}>
                    <span className={styles.previewLabel}>{t('academicYear') || 'Academic Year'}:</span>
                    <span className={styles.previewName} style={{ color: theme.primaryColor }}>{schoolInfo.academicYear}</span>
                    <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>(Set from Task 1)</span>
                  </div>
                )}
                
                <button 
                  className={styles.saveBtn}
                  onClick={saveSchoolInfo}
                  disabled={loading}
                  style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
                >
                  <FiSave /> {loading ? 'Saving...' : t('saveSchoolInfo') || 'Save School Information'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setting;
