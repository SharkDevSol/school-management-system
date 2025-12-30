import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUserCircle,
  FaHeart, 
  FaRegHeart, 
  FaComment, 
  FaShare,
  FaChevronDown
} from 'react-icons/fa';
import styles from './PV.module.css';

const PV = () => {
  const [likedPosts, setLikedPosts] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState([]);

  // Sample posts data
  const [posts] = useState([
    {
      id: 1,
      name: "Super Admin",
      role: "Admin",
      text: "Welcome to the new staff portal! We've completely redesigned the interface for better usability and performance. The new system includes enhanced features for communication, evaluation tracking, and resource management.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
      date: new Date(),
    },
    {
      id: 2,
      name: "System Admin",
      role: "Admin",
      text: "Monthly staff meeting scheduled for Friday at 2 PM. Please prepare your reports and updates for the team.",
      image: null,
      date: new Date(Date.now() - 86400000),
    },
    {
      id: 3,
      name: "Academic Head",
      role: "Staff",
      text: "The new curriculum guidelines have been uploaded. All faculty members are requested to review them before the next semester begins.",
      image: null,
      date: new Date(Date.now() - 172800000),
    }
  ]);

  const toggleLike = (postId) => {
    if (likedPosts.includes(postId)) {
      setLikedPosts(likedPosts.filter(id => id !== postId));
    } else {
      setLikedPosts([...likedPosts, postId]);
    }
  };

  const toggleExpand = (postId) => {
    if (expandedPosts.includes(postId)) {
      setExpandedPosts(expandedPosts.filter(id => id !== postId));
    } else {
      setExpandedPosts([...expandedPosts, postId]);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Animation variants
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    },
    hover: {
      scale: 1.01,
      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)"
    }
  };

  const textVariants = {
    collapsed: { 
      maxHeight: 60,
      transition: { duration: 0.3 }
    },
    expanded: { 
      maxHeight: 1000,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className={styles.postsFeed}>
      <AnimatePresence>
        {posts.map((post) => (
          <motion.div 
            key={post.id}
            className={styles.postCard}
            variants={itemVariants}
            whileHover="hover"
            initial="hidden"
            animate="visible"
          >
            <div className={styles.postHeader}>
              <FaUserCircle className={styles.postProfileImage} />
              <div className={styles.postUserInfo}>
                <div className={styles.postName}>
                  {post.name} <span className={styles.postRole}>{post.role}</span>
                </div>
                <div className={styles.postDate}>
                  {formatDate(post.date)} • {formatTime(post.date)}
                </div>
              </div>
            </div>
            
            <motion.div 
              className={styles.postContent}
              variants={textVariants}
              animate={expandedPosts.includes(post.id) ? "expanded" : "collapsed"}
            >
              <p>{post.text}</p>
              {post.text.length > 100 && (
                <button 
                  className={styles.readMore}
                  onClick={() => toggleExpand(post.id)}
                >
                  {expandedPosts.includes(post.id) ? 'Show Less' : 'Read More'}
                  <FaChevronDown className={`${styles.chevron} ${expandedPosts.includes(post.id) ? styles.rotated : ''}`} />
                </button>
              )}
            </motion.div>
            
            {post.image && (
              <div className={styles.postImage}>
                <img src={post.image} alt="Post content" />
              </div>
            )}
            
            <div className={styles.postActions}>
              <button 
                className={styles.actionButton}
                onClick={() => toggleLike(post.id)}
              >
                {likedPosts.includes(post.id) ? (
                  <FaHeart className={styles.liked} />
                ) : (
                  <FaRegHeart />
                )}
                <span>Like</span>
              </button>
              
              <button className={styles.actionButton}>
                <FaComment />
                <span>Comment</span>
              </button>
              
              <button className={styles.actionButton}>
                <FaShare />
                <span>Share</span>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default PV;