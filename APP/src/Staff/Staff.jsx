import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaPenAlt, 
  FaClipboardList, 
  FaChartLine, 
  FaUser, 
  FaComments,
  FaBars,
  FaTimes,
  FaPlus,
  FaBell,
  FaSearch,
  FaUserCheck
} from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import styles from './Staff.module.css';

const Staff = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "", icon: <FaHome />, label: "Home" },
    { path: "post-staff-new", icon: <FaPenAlt />, label: "Post" },
    { path: "attendance-staff", icon: <FaUserCheck />, label: "Attendance" },
    { path: "mark-list-staff", icon: <FaClipboardList />, label: "Marks" },
    { path: "evaluation-staff-control", icon: <FaChartLine />, label: "Evaluation" },
    { path: "profile-staff", icon: <FaUser />, label: "Profile" },
  ];

  useEffect(() => {
    const currentPath = location.pathname.split('/').pop() || "";
    setActiveTab(currentPath);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren"
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const mobileMenuVariants = {
    hidden: { y: '100%', opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    },
    exit: { 
      y: '100%', 
      opacity: 0,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div 
      className={styles.staffContainer}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <motion.div 
          className={styles.logoContainer}
          variants={itemVariants}
        >
          <div className={styles.logo}>EduStaff</div>
          <div className={styles.logoSubtext}>Staff Portal</div>
        </motion.div>
        
        <nav className={styles.nav}>
          <ul>
            {navItems.map((item, index) => (
              <motion.li key={index} variants={itemVariants}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => 
                    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                  }
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navText}>{item.label}</span>
                </NavLink>
              </motion.li>
            ))}
          </ul>
        </nav>
        
        <motion.div 
          className={styles.logoutContainer}
          variants={itemVariants}
        >
          <button className={styles.logoutButton}>
            <FiLogOut className={styles.logoutIcon} />
            <span className={styles.logoutText}>Logout</span>
          </button>
        </motion.div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.contentWrapper}>
        {/* Mobile Header */}
        <header className={`${styles.mobileHeader} ${isScrolled ? styles.scrolled : ''}`}>
          <div className={styles.mobileHeaderContent}>
            <button 
              className={styles.mobileMenuButton}
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
            <div className={styles.mobileLogo}>EduStaff</div>
            <div className={styles.mobileActions}>
              <button className={styles.mobileActionButton}>
                <FaSearch />
              </button>
              <button className={styles.mobileActionButton}>
                <FaBell />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Bottom Navigation (like Instagram) */}
        <nav className={styles.mobileBottomNav}>
          {navItems.map((item, index) => (
            <NavLink 
              key={index}
              to={item.path} 
              className={({ isActive }) => 
                isActive ? `${styles.mobileBottomNavLink} ${styles.active}` : styles.mobileBottomNavLink
              }
            >
              <span className={styles.mobileBottomNavIcon}>{item.icon}</span>
            </NavLink>
          ))}
        </nav>

        {/* Mobile Menu (Full Screen) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              className={styles.mobileMenuOverlay}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={mobileMenuVariants}
            >
              <div className={styles.mobileMenuHeader}>
                <div className={styles.mobileMenuLogo}>EduStaff Portal</div>
                <button 
                  className={styles.mobileMenuCloseButton}
                  onClick={toggleMobileMenu}
                >
                  <FaTimes />
                </button>
              </div>
              
              <nav className={styles.mobileNav}>
                <ul>
                  {navItems.map((item, index) => (
                    <motion.li 
                      key={index} 
                      variants={itemVariants}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <NavLink 
                        to={item.path} 
                        className={({ isActive }) => 
                          isActive ? `${styles.mobileNavLink} ${styles.active}` : styles.mobileNavLink
                        }
                      >
                        <span className={styles.mobileNavIcon}>{item.icon}</span>
                        <span className={styles.mobileNavText}>{item.label}</span>
                      </NavLink>
                    </motion.li>
                  ))}
                </ul>
              </nav>
              
              <motion.div 
                className={styles.mobileLogout}
                variants={itemVariants}
              >
                <button className={styles.mobileLogoutButton}>
                  <FiLogOut className={styles.mobileLogoutIcon} />
                  <span>Logout</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={styles.mainContent}>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            key={location.pathname}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Floating Action Button (Mobile) */}
      {/* <motion.button 
        className={styles.floatingActionButton}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FaPlus />
      </motion.button> */}
    </motion.div>
  );
};

export default Staff;