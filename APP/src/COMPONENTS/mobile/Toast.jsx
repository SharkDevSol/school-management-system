import React, { useEffect, useState } from 'react';
import { FiCheck, FiX, FiInfo, FiAlertCircle } from 'react-icons/fi';
import styles from './Toast.module.css';

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheck />;
      case 'error':
        return <FiAlertCircle />;
      case 'info':
      default:
        return <FiInfo />;
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`${styles.toast} ${styles[type]} ${isExiting ? styles.exiting : ''}`}
      role="alert"
      aria-live="polite"
    >
      <span className={styles.icon}>{getIcon()}</span>
      <span className={styles.message}>{message}</span>
      <button 
        className={styles.closeButton}
        onClick={handleClose}
        aria-label="Close notification"
      >
        <FiX />
      </button>
    </div>
  );
};

// Toast Container for managing multiple toasts
export const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const success = (message, duration) => addToast(message, 'success', duration);
  const error = (message, duration) => addToast(message, 'error', duration);
  const info = (message, duration) => addToast(message, 'info', duration);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    ToastContainer: () => <ToastContainer toasts={toasts} onRemove={removeToast} />
  };
};

export default Toast;
