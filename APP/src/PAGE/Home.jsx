// Updated PAGE/Home.jsx - With AppContext integration and permission filtering
import { useState, useEffect, useMemo } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { filterNavByPermissions } from "../utils/permissionUtils";
import { 
  FiHome, FiUser, FiUsers, FiBook, FiCalendar, 
  FiMessageSquare, FiFileText, FiSettings, 
  FiFilePlus, 
  FiChevronDown, FiChevronRight, FiMenu, 
  FiLogOut, FiUser as FiProfile, 
  FiSearch, FiAward,
  FiPieChart, FiDatabase,
  FiCheckCircle
} from "react-icons/fi";
import { FaGraduationCap, FaChalkboardTeacher, FaRegCalendarAlt } from "react-icons/fa";

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, profile, t } = useApp();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    registration: true,
    lists: true,
    academic: true,
    administration: true
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('userType');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('authToken'); // Clear JWT token
    navigate("/login");
  };

  const navItems = [
    {
      path: "/",
      icon: <FiHome className={styles.navIcon} />,
      label: t('dashboard'),
      section: null,
    },
    {
      section: t('registration'),
      sectionKey: 'registration',
      icon: <FiUser className={styles.sectionIcon} />,
      items: [
        {
          path: "/create-register-student",
          icon: <FaGraduationCap className={styles.navIcon} />,
          label: t('registerStudent'),
        },
        {
          path: "/create-register-staff",
          icon: <FaChalkboardTeacher className={styles.navIcon} />,
          label: t('registerStaff'),
        },
      ],
    },
    {
      section: t('lists'),
      sectionKey: 'lists',
      icon: <FiDatabase className={styles.sectionIcon} />,
      items: [
        {
          path: "/list-student",
          icon: <FiUsers className={styles.navIcon} />,
          label: t('students'),
        },
        {
          path: "/list-staff",
          icon: <FiUsers className={styles.navIcon} />,
          label: t('staff'),
        },
        {
          path: "/list-guardian",
          icon: <FiUsers className={styles.navIcon} />,
          label: t('guardians'),
        },
      ],
    },
    {
      section: t('academic'),
      sectionKey: 'academic',
      icon: <FiBook className={styles.sectionIcon} />,
      items: [
        {
          path: "/evaluation",
          icon: <FiPieChart className={styles.navIcon} />,
          label: t('evaluation'),
        },
        {
          path: "/evaluation-book",
          icon: <FiBook className={styles.navIcon} />,
          label: t('evaluationBook'),
        },
        {
          path: "/evaluation-book/reports",
          icon: <FiFileText className={styles.navIcon} />,
          label: t('evalBookReports'),
        },
        {
          path: "/mark-list-view",
          icon: <FiFileText className={styles.navIcon} />,
          label: t('markLists'),
        },
        {
          path: "/attendance-view",
          icon: <FaRegCalendarAlt className={styles.navIcon} />,
          label: t('attendance'),
        },
        {
          path: "/create-attendance",
          icon: <FiFilePlus className={styles.navIcon} />,
          label: t('createAttendance'),
        },
        {
          path: "/create-mark-list",
          icon: <FiFilePlus className={styles.navIcon} />,
          label: t('createMarklist'),
        },
        {
          path: "/report-card",
          icon: <FiAward className={styles.navIcon} />,
          label: t('reportCard'),
        },
        {
          path: "/schedule",
          icon: <FiCalendar className={styles.navIcon} />,
          label: t('schedule'),
        },
        {
          path: "/post",
          icon: <FiMessageSquare className={styles.navIcon} />,
          label: t('post'),
        },
        {
          path: "/tasks",
          icon: <FiCheckCircle className={styles.navIcon} />,
          label: t('tasks'),
        },
      ],
    },
    {
      section: t('administration'),
      sectionKey: 'administration',
      icon: <FiSettings className={styles.sectionIcon} />,
      items: [
        {
          path: "/communication",
          icon: <FiMessageSquare className={styles.navIcon} />,
          label: t('communication'),
        },
        {
          path: "/class-teacher-assignment",
          icon: <FaChalkboardTeacher className={styles.navIcon} />,
          label: t('classTeachers'),
        },
        {
          path: "/evaluation-book/assignments",
          icon: <FiUsers className={styles.navIcon} />,
          label: t('evalBookAssignments'),
        },
        {
          path: "/settings",
          icon: <FiSettings className={styles.navIcon} />,
          label: t('settings'),
        },
        {
          path: "/admin-sub-accounts",
          icon: <FiUsers className={styles.navIcon} />,
          label: t('subAccounts'),
        },
      ],
    },
  ];

  // Get user type and permissions for filtering navigation
  const userType = localStorage.getItem('userType') || 'admin';
  let userPermissions = [];
  try {
    const storedPermissions = localStorage.getItem('userPermissions');
    if (storedPermissions) {
      userPermissions = JSON.parse(storedPermissions);
    }
  } catch (e) {
    console.error('Error parsing permissions:', e);
  }

  // Filter navigation items based on user permissions
  const filteredNavItems = useMemo(() => {
    return filterNavByPermissions(navItems, userPermissions, userType);
  }, [userPermissions, userType]);

  return (
    <div className={styles.container}>
      {/* Profile Header */}
      {!isMobile ? (
        <motion.header 
          className={styles.profileHeader}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          style={{ 
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` 
          }}
        >
          <div className={styles.searchContainer}>
            <FiSearch className={styles.searchIcon} />
            <input 
              type="search" 
              placeholder={t('search')}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.profileControls}>
            <motion.div 
              className={styles.profileDropdown}
              onClick={() => setProfileOpen(!profileOpen)}
              whileHover={{ scale: 1.02 }}
            >
              <div className={styles.profileAvatar}>
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt="Profile" className={styles.avatarImage} />
                ) : (
                  <FiProfile className={styles.avatarIcon} />
                )}
              </div>
              <span className={styles.profileName}>{profile.name}</span>
              <FiChevronDown 
                className={`${styles.dropdownArrow} ${profileOpen ? styles.rotated : ''}`} 
              />
            </motion.div>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  className={styles.dropdownMenu}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link to="/settings" className={styles.dropdownItem}>
                    <FiProfile className={styles.dropdownIcon} /> {t('myProfile')}
                  </Link>
                  <Link to="/settings" className={styles.dropdownItem}>
                    <FiSettings className={styles.dropdownIcon} /> {t('settings')}
                  </Link>
                  <motion.button
                    onClick={handleLogout}
                    className={styles.dropdownItem}
                    whileHover={{ x: 5 }}
                  >
                    <FiLogOut className={styles.dropdownIcon} /> {t('logout')}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.header>
      ) : (
        <motion.header 
          className={styles.profileHeader}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          style={{ 
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` 
          }}
        >
          <motion.button 
            className={styles.menuButton}
            onClick={() => setMobileMenuOpen(true)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FiMenu />
          </motion.button>

          <div className={styles.logoText}>Skulify</div>

          <motion.div 
            className={styles.profileDropdown}
            onClick={() => setProfileOpen(!profileOpen)}
            whileHover={{ scale: 1.02 }}
          >
            <div className={styles.profileAvatar}>
              {profile.profileImage ? (
                <img src={profile.profileImage} alt="Profile" className={styles.avatarImage} />
              ) : (
                <FiProfile className={styles.avatarIcon} />
              )}
            </div>
            <FiChevronDown 
              className={`${styles.dropdownArrow} ${profileOpen ? styles.rotated : ''}`} 
            />
          </motion.div>
        </motion.header>
      )}

      {/* Sidebar Navigation */}
      <motion.nav
        className={`${styles.sidebar} ${mobileMenuOpen ? styles.mobileOpen : ""}`}
        initial={{ x: isMobile ? -300 : 0 }}
        animate={{
          x: mobileMenuOpen ? 0 : isMobile ? -300 : 0,
          width: isMobile ? "80%" : "280px",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ 
          background: `linear-gradient(180deg, ${theme.primaryColor}dd, ${theme.secondaryColor}dd)` 
        }}
      >
        <div className={styles.logo}>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={styles.logoText}
          >
            Skulify
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.3 }}
            className={styles.logoSubtext}
          >
            School Management System
          </motion.p>
        </div>

        <ul className={styles.navLinks}>
          {filteredNavItems.map((item, index) => {
            if (item.path) {
              return (
                <motion.li
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={item.path}
                    className={`${styles.navLink} ${
                      location.pathname === item.path ? styles.active : ""
                    }`}
                    style={location.pathname === item.path ? {
                      background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`
                    } : {}}
                  >
                    <span className={styles.icon}>{item.icon}</span>
                    <span className={styles.linkText}>{item.label}</span>
                  </Link>
                </motion.li>
              );
            } else {
              const sectionKey = item.sectionKey;
              return (
                <li key={index} className={styles.navSection}>
                  <motion.div
                    className={styles.sectionHeader}
                    onClick={() => toggleSection(sectionKey)}
                    whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                  >
                    <div className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>{item.icon}</span>
                      <span>{item.section}</span>
                    </div>
                    {expandedSections[sectionKey] ? (
                      <FiChevronDown className={styles.chevronIcon} />
                    ) : (
                      <FiChevronRight className={styles.chevronIcon} />
                    )}
                  </motion.div>
                  <AnimatePresence>
                    {expandedSections[sectionKey] && (
                      <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className={styles.subMenu}
                      >
                        {item.items.map((subItem, subIndex) => (
                          <motion.li 
                            key={subIndex} 
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Link
                              to={subItem.path}
                              className={`${styles.navLink} ${
                                location.pathname === subItem.path ? styles.active : ""
                              }`}
                              style={location.pathname === subItem.path ? {
                                background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`
                              } : {}}
                            >
                              <span className={styles.icon}>{subItem.icon}</span>
                              <span className={styles.linkText}>{subItem.label}</span>
                            </Link>
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              );
            }
          })}
        </ul>

        {/* Mobile Profile and Logout */}
        {isMobile && (
          <motion.div 
            className={styles.mobileProfileMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Link to="/settings" className={styles.mobileProfileLink}>
              <FiProfile className={styles.mobileMenuIcon} /> {t('myProfile')}
            </Link>
            <motion.button 
              onClick={handleLogout} 
              className={styles.mobileLogoutBtn}
              whileHover={{ x: 5 }}
            >
              <FiLogOut className={styles.mobileMenuIcon} /> {t('logout')}
            </motion.button>
          </motion.div>
        )}
      </motion.nav>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && isMobile && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Profile Dropdown */}
      {profileOpen && isMobile && (
        <motion.div
          className={styles.mobileProfileDropdown}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Link to="/settings" className={styles.dropdownItem}>
            <FiProfile className={styles.dropdownIcon} /> {t('myProfile')}
          </Link>
          <Link to="/settings" className={styles.dropdownItem}>
            <FiSettings className={styles.dropdownIcon} /> {t('settings')}
          </Link>
          <motion.button 
            onClick={handleLogout} 
            className={styles.dropdownItem}
            whileHover={{ x: 5 }}
          >
            <FiLogOut className={styles.dropdownIcon} /> {t('logout')}
          </motion.button>
        </motion.div>
      )}

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={styles.contentWrapper}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default Home;
