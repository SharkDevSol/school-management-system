import { useState, useEffect } from 'react';
import styles from './AdminSubAccounts.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiPlus, FiEdit2, FiTrash2, FiSearch, 
  FiX, FiCheck, FiToggleLeft, FiToggleRight, FiEye, FiEyeOff
} from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PermissionSelector from '../../COMPONENTS/PermissionSelector';
import { useApp } from '../../context/AppContext';

const API_BASE = 'https://school-management-system-daul.onrender.com/api/admin/sub-accounts';

const AdminSubAccounts = () => {
  const { t } = useApp();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    permissions: []
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE);
      const data = await response.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load sub-accounts');
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormData({ name: '', email: '', username: '', password: '', permissions: [] });
    setErrors({});
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      email: account.email,
      username: account.username,
      password: '',
      permissions: account.permissions || []
    });
    setErrors({});
    setShowPassword(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData({ name: '', email: '', username: '', password: '', permissions: [] });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!editingAccount && !formData.password) newErrors.password = 'Password is required';
    else if (formData.password && formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = editingAccount ? `${API_BASE}/${editingAccount.id}` : API_BASE;
      const method = editingAccount ? 'PUT' : 'POST';
      
      const payload = { ...formData };
      if (editingAccount && !payload.password) {
        delete payload.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(editingAccount ? 'Account updated successfully' : 'Account created successfully');
        closeModal();
        fetchAccounts();
      } else {
        toast.error(data.error || 'Operation failed');
        if (data.code === 'DUPLICATE_USERNAME') {
          setErrors(prev => ({ ...prev, username: 'Username already exists' }));
        } else if (data.code === 'DUPLICATE_EMAIL') {
          setErrors(prev => ({ ...prev, email: 'Email already exists' }));
        }
      }
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error('Failed to save account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`${API_BASE}/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Account deleted successfully');
        setShowDeleteModal(false);
        setDeleteTarget(null);
        fetchAccounts();
      } else {
        toast.error(data.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const handleToggleStatus = async (account) => {
    try {
      const response = await fetch(`${API_BASE}/${account.id}/status`, { method: 'PATCH' });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message);
        fetchAccounts();
      } else {
        toast.error(data.error || 'Failed to toggle status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to toggle status');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePermissionsChange = (permissions) => {
    setFormData(prev => ({ ...prev, permissions }));
  };

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <ToastContainer position="top-right" autoClose={3000} />

      <div className={styles.header}>
        <div className={styles.titleSection}>
          <FiUsers className={styles.titleIcon} />
          <h1>{t('adminSubAccounts')}</h1>
        </div>
        <div className={styles.orangeLine}></div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder={t('searchByNameEmailUsername')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <motion.button
          className={styles.addButton}
          onClick={openCreateModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FiPlus /> {t('createSubAccount')}
        </motion.button>
      </div>

      {loading ? (
        <div className={styles.loading}>{t('loading')}</div>
      ) : filteredAccounts.length === 0 ? (
        <div className={styles.empty}>
          {searchTerm ? t('noAccountsMatchSearch') : t('noSubAccountsCreated')}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('email')}</th>
                <th>{t('username')}</th>
                <th>{t('permissions')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(account => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td>{account.email}</td>
                  <td>{account.username}</td>
                  <td>
                    <span className={styles.permissionBadge}>
                      {account.permissionCount || (account.permissions?.length || 0)} {t('permissionsCount')}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${account.is_active ? styles.active : styles.inactive}`}>
                      {account.is_active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => openEditModal(account)}
                        title="Edit"
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.toggleBtn}`}
                        onClick={() => handleToggleStatus(account)}
                        title={account.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {account.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => { setDeleteTarget(account); setShowDeleteModal(true); }}
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div 
              className={styles.modal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>{editingAccount ? t('editSubAccount') : t('createSubAccount')}</h2>
                <button className={styles.closeBtn} onClick={closeModal}>
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>{t('name')} *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={errors.name ? styles.inputError : ''}
                      placeholder={t('enterFullName')}
                    />
                    {errors.name && <span className={styles.error}>{t('nameRequired')}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label>{t('email')} *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={errors.email ? styles.inputError : ''}
                      placeholder={t('enterEmailAddress')}
                    />
                    {errors.email && <span className={styles.error}>{errors.email === 'Invalid email format' ? t('invalidEmailFormat') : t('emailRequired')}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label>{t('username')} *</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className={errors.username ? styles.inputError : ''}
                      placeholder={t('enterUsername')}
                    />
                    {errors.username && <span className={styles.error}>{errors.username === 'Username already exists' ? t('usernameAlreadyExists') : t('usernameRequired')}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label>{t('password')} {editingAccount ? `(${t('leaveBlankToKeepCurrent')})` : '*'}</label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={errors.password ? styles.inputError : ''}
                        placeholder={editingAccount ? t('enterNewPassword') : t('enterPassword')}
                      />
                      <button 
                        type="button" 
                        className={styles.togglePassword}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {errors.password && <span className={styles.error}>{errors.password === 'Password must be at least 6 characters' ? t('passwordMinLength') : t('passwordRequired')}</span>}
                  </div>
                </div>

                <div className={styles.permissionsSection}>
                  <PermissionSelector
                    selectedPermissions={formData.permissions}
                    onChange={handlePermissionsChange}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={submitting}>
                    {submitting ? t('saving') : (editingAccount ? t('update') : t('create'))}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && deleteTarget && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div 
              className={styles.deleteModal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>{t('deleteSubAccount')}</h3>
              <p>{t('confirmDeleteAccount')} <strong>{deleteTarget.name}</strong>?</p>
              <p className={styles.warning}>{t('actionCannotBeUndone')}</p>
              <div className={styles.deleteActions}>
                <button 
                  className={styles.cancelBtn} 
                  onClick={() => setShowDeleteModal(false)}
                >
                  {t('cancel')}
                </button>
                <button 
                  className={styles.confirmDeleteBtn}
                  onClick={handleDelete}
                >
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminSubAccounts;
