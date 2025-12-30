// Permission Utility Functions
import { ADMIN_PERMISSIONS, getPermissionByKey, getPermissionPath } from '../config/adminPermissions';

/**
 * Filter navigation items based on user permissions
 * @param {Array} navItems - Array of navigation items
 * @param {Array} permissions - Array of permission keys
 * @param {string} userType - 'admin' or 'sub-account'
 * @returns {Array} Filtered navigation items
 */
export const filterNavByPermissions = (navItems, permissions, userType) => {
  // Primary admin has full access
  if (userType === 'admin' || !permissions || permissions.length === 0) {
    return navItems;
  }

  // Get all permitted paths
  const permittedPaths = permissions
    .map(key => getPermissionPath(key))
    .filter(path => path !== null);

  // Filter navigation items
  return navItems
    .map(item => {
      // Single item (not a section)
      if (item.path) {
        const isPermitted = permittedPaths.some(
          permittedPath => item.path === permittedPath || item.path.startsWith(permittedPath + '/')
        );
        return isPermitted ? item : null;
      }

      // Section with sub-items
      if (item.items) {
        const filteredItems = item.items.filter(subItem => 
          permittedPaths.some(
            permittedPath => subItem.path === permittedPath || subItem.path.startsWith(permittedPath + '/')
          )
        );

        // Only include section if it has permitted items
        if (filteredItems.length > 0) {
          return { ...item, items: filteredItems };
        }
        return null;
      }

      return item;
    })
    .filter(item => item !== null);
};

/**
 * Check if user has a specific permission
 * @param {Array} permissions - Array of permission keys
 * @param {string} requiredPermission - Permission key to check
 * @param {string} userType - 'admin' or 'sub-account'
 * @returns {boolean} Whether user has the permission
 */
export const hasPermission = (permissions, requiredPermission, userType) => {
  // Primary admin has all permissions
  if (userType === 'admin') {
    return true;
  }

  // Empty permissions for sub-account means no access
  if (!permissions || permissions.length === 0) {
    return false;
  }

  return permissions.includes(requiredPermission);
};

/**
 * Check if user has permission to access a specific path
 * @param {Array} permissions - Array of permission keys
 * @param {string} path - Path to check
 * @param {string} userType - 'admin' or 'sub-account'
 * @returns {boolean} Whether user can access the path
 */
export const hasPathPermission = (permissions, path, userType) => {
  // Primary admin has full access
  if (userType === 'admin') {
    return true;
  }

  // Empty permissions for sub-account means no access
  if (!permissions || permissions.length === 0) {
    return false;
  }

  const permittedPaths = permissions
    .map(key => getPermissionPath(key))
    .filter(p => p !== null);

  return permittedPaths.some(
    permittedPath => path === permittedPath || path.startsWith(permittedPath + '/')
  );
};

/**
 * Get count of permissions
 * @param {Array} permissions - Array of permission keys
 * @returns {number} Number of permissions
 */
export const getPermissionCount = (permissions) => {
  if (!permissions || !Array.isArray(permissions)) {
    return 0;
  }
  return permissions.length;
};

/**
 * Get permissions grouped by category for display
 * @param {Array} selectedPermissions - Array of selected permission keys
 * @returns {Object} Permissions grouped by category with selection state
 */
export const getPermissionsWithSelection = (selectedPermissions = []) => {
  const result = {};
  
  Object.entries(ADMIN_PERMISSIONS).forEach(([categoryKey, category]) => {
    result[categoryKey] = {
      label: category.label,
      permissions: category.permissions.map(perm => ({
        ...perm,
        selected: selectedPermissions.includes(perm.key)
      }))
    };
  });

  return result;
};

/**
 * Get all permission keys for a category
 * @param {string} categoryKey - Category key (e.g., 'registration', 'lists')
 * @returns {Array} Array of permission keys in that category
 */
export const getCategoryPermissionKeys = (categoryKey) => {
  const category = ADMIN_PERMISSIONS[categoryKey];
  if (!category) return [];
  return category.permissions.map(p => p.key);
};

/**
 * Check if all permissions in a category are selected
 * @param {string} categoryKey - Category key
 * @param {Array} selectedPermissions - Array of selected permission keys
 * @returns {boolean} Whether all permissions in category are selected
 */
export const isCategoryFullySelected = (categoryKey, selectedPermissions) => {
  const categoryKeys = getCategoryPermissionKeys(categoryKey);
  return categoryKeys.every(key => selectedPermissions.includes(key));
};

/**
 * Check if any permission in a category is selected
 * @param {string} categoryKey - Category key
 * @param {Array} selectedPermissions - Array of selected permission keys
 * @returns {boolean} Whether any permission in category is selected
 */
export const isCategoryPartiallySelected = (categoryKey, selectedPermissions) => {
  const categoryKeys = getCategoryPermissionKeys(categoryKey);
  const hasAny = categoryKeys.some(key => selectedPermissions.includes(key));
  const hasAll = categoryKeys.every(key => selectedPermissions.includes(key));
  return hasAny && !hasAll;
};

export default {
  filterNavByPermissions,
  hasPermission,
  hasPathPermission,
  getPermissionCount,
  getPermissionsWithSelection,
  getCategoryPermissionKeys,
  isCategoryFullySelected,
  isCategoryPartiallySelected
};
