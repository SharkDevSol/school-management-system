import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './FloatingButton.module.css';

const list = {
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      staggerDirection: -1
    }
  },
  hidden: {
    opacity: 0,
    transition: {
      when: 'afterChildren',
      staggerChildren: 0.05
    }
  }
};

const item = {
  visible: { opacity: 1, y: 0, scale: 1 },
  hidden: { opacity: 0, y: 10, scale: 0.8 }
};

const btn = {
  visible: { rotate: 45 },
  hidden: { rotate: 0 }
};

function FloatingButton({ children, triggerContent, className }) {
  const ref = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div className={`${styles.floatingContainer} ${className || ''}`} ref={ref}>
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            className={styles.floatingList}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={list}
          >
            {children}
          </motion.ul>
        )}
      </AnimatePresence>
      <motion.div
        className={styles.triggerWrapper}
        variants={btn}
        animate={isOpen ? 'visible' : 'hidden'}
        onClick={() => setIsOpen(!isOpen)}
      >
        {triggerContent}
      </motion.div>
    </div>
  );
}

function FloatingButtonItem({ children, onClick }) {
  return (
    <motion.li 
      className={styles.floatingItem} 
      variants={item}
      onClick={onClick}
    >
      {children}
    </motion.li>
  );
}

export { FloatingButton, FloatingButtonItem };
