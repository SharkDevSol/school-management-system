import { useState, useEffect } from 'react';
import styles from './PermissionSelector.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronRight, FiCheck, FiMinus } from 'react-icons/fi';
import { ADMIN_PERMISSIONS } from '../config/adminPermissions';
import { 
  getCategoryPermissionKeys, 
  isCategoryFullySelected, 
  isCategoryPartiallySelected 
} from '../utils/permissionUtils';

const PermissionSelector = ({ selectedPermissions = [], onChange, disabled = false }) => {
  const [expandedCategories, setExpandedCategories] = useState({
    registration: true,
    lists: true,
    academic: true,
    administration: true
  });

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const handlePermissionToggle = (permissionKey) => {
    if (disabled) return;
    
    const newPermissions = selectedPermissions.includes(permissionKey)
      ? selectedPermissions.filter(p => p !== permissionKey)
      : [...selectedPermissions, permissionKey];
    
    onChange(newPermissions);
  };

  const handleSelectAllCategory = (categoryKey) => {
    if (disabled) return;
    
    const categoryKeys = getCategoryPermissionKeys(categoryKey);
    const isFullySelected = isCategoryFullySelected(categoryKey, selectedPermissions);
    
    let newPermissions;
    if (isFullySelected) {
      // Deselect all in category
      newPermissions = selectedPermissions.filter(p => !categoryKeys.includes(p));
    } else {
      // Select all in category
      const existingOther = selectedPermissions.filter(p => !categoryKeys.includes(p));
      newPermissions = [...existingOther, ...categoryKeys];
    }
    
    onChange(newPermissions);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    
    const allKeys = Object.keys(ADMIN_PERMISSIONS).flatMap(
      categoryKey => getCategoryPermissionKeys(categoryKey)
    );
    
    if (selectedPermissions.length === allKeys.length) {
      onChange([]);
    } else {
      onChange(allKeys);
    }
  };

  const totalPermissions = Object.values(ADMIN_PERMISSIONS).reduce(
    (sum, cat) => sum + cat.permissions.length, 0
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Permissions</h3>
        <div className={styles.headerActions}>
          <span className={styles.count}>
            {selectedPermissions.length} / {totalPermissions} selected
          </span>
          <button 
            type="button"
            className={styles.selectAllBtn}
            onClick={handleSelectAll}
            disabled={disabled}
          >
            {selectedPermissions.length === totalPermissions ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      <div className={styles.categories}>
        {Object.entries(ADMIN_PERMISSIONS).map(([categoryKey, category]) => {
          const isExpanded = expandedCategories[categoryKey];
          const isFullySelected = isCategoryFullySelected(categoryKey, selectedPermissions);
          const isPartiallySelected = isCategoryPartiallySelected(categoryKey, selectedPermissions);

          return (
            <div key={categoryKey} className={styles.category}>
              <div 
                className={styles.categoryHeader}
                onClick={() => toggleCategory(categoryKey)}
              >
                <div className={styles.categoryLeft}>
                  {isExpanded ? (
                    <FiChevronDown className={styles.chevron} />
                  ) : (
                    <FiChevronRight className={styles.chevron} />
                  )}
                  <span className={styles.categoryLabel}>{category.label}</span>
                  <span className={styles.categoryCount}>
                    ({category.permissions.filter(p => selectedPermissions.includes(p.key)).length}/{category.permissions.length})
                  </span>
                </div>
                <button
                  type="button"
                  className={`${styles.categoryCheckbox} ${isFullySelected ? styles.checked : ''} ${isPartiallySelected ? styles.partial : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAllCategory(categoryKey);
                  }}
                  disabled={disabled}
                >
                  {isFullySelected && <FiCheck />}
                  {isPartiallySelected && <FiMinus />}
                </button>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={styles.permissionsList}
                  >
                    {category.permissions.map(permission => (
                      <label 
                        key={permission.key} 
                        className={`${styles.permissionItem} ${disabled ? styles.disabled : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.key)}
                          onChange={() => handlePermissionToggle(permission.key)}
                          disabled={disabled}
                          className={styles.checkbox}
                        />
                        <span className={styles.permissionLabel}>{permission.label}</span>
                        <span className={styles.permissionPath}>{permission.path}</span>
                      </label>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionSelector;
