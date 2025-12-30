import React from 'react';
import styles from './SkeletonLoader.module.css';

const SkeletonLoader = ({ type = 'text', count = 1, width, height }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'avatar':
        return (
          <div 
            className={`${styles.skeleton} ${styles.avatar}`}
            style={{ width: width || 100, height: height || 100 }}
          />
        );
      
      case 'text':
        return Array.from({ length: count }).map((_, index) => (
          <div 
            key={index}
            className={`${styles.skeleton} ${styles.text}`}
            style={{ 
              width: width || (index === count - 1 ? '60%' : '100%'),
              height: height || 16
            }}
          />
        ));
      
      case 'card':
        return Array.from({ length: count }).map((_, index) => (
          <div key={index} className={`${styles.skeleton} ${styles.card}`}>
            <div className={styles.cardHeader}>
              <div className={`${styles.skeleton} ${styles.cardIcon}`} />
              <div className={`${styles.skeleton} ${styles.cardTitle}`} />
            </div>
            <div className={styles.cardContent}>
              <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '100%' }} />
              <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '80%' }} />
              <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '60%' }} />
            </div>
          </div>
        ));
      
      case 'list':
        return Array.from({ length: count }).map((_, index) => (
          <div key={index} className={styles.listItem}>
            <div className={`${styles.skeleton} ${styles.listAvatar}`} />
            <div className={styles.listContent}>
              <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '70%' }} />
              <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '50%', height: 12 }} />
            </div>
          </div>
        ));
      
      case 'profile':
        return (
          <div className={styles.profileSkeleton}>
            <div className={styles.profileHeader}>
              <div className={`${styles.skeleton} ${styles.avatar}`} style={{ width: 100, height: 100 }} />
              <div className={`${styles.skeleton} ${styles.text}`} style={{ width: 150, height: 24, marginTop: 12 }} />
              <div className={`${styles.skeleton} ${styles.text}`} style={{ width: 200, height: 16, marginTop: 8 }} />
            </div>
            <div className={styles.profileCards}>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className={`${styles.skeleton} ${styles.card}`}>
                  <div className={styles.cardHeader}>
                    <div className={`${styles.skeleton} ${styles.cardIcon}`} />
                    <div className={`${styles.skeleton} ${styles.cardTitle}`} />
                  </div>
                  <div className={styles.cardContent}>
                    <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '100%' }} />
                    <div className={`${styles.skeleton} ${styles.text}`} style={{ width: '80%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return <div className={styles.skeleton} style={{ width, height }} />;
    }
  };

  return <div className={styles.skeletonWrapper}>{renderSkeleton()}</div>;
};

export default SkeletonLoader;
