import React from 'react';
import styles from './PostStudents.module.css';
import { motion } from 'framer-motion';
import { FaUserCircle, FaEllipsisH, FaRegBookmark, FaRegHeart, FaRegComment } from 'react-icons/fa';
import { FiShare2 } from 'react-icons/fi';

const PostStudents = () => {
  // Sample post data
  const posts = [
    {
      id: 1,
      name: "Super Admin",
      date: "14 Aug, 10:30",
      text: "Announcement: School closes early tomorrow due to parent-teacher meetings. Please make arrangements to pick up your children by 1:30 PM.",
      image: "https://via.placeholder.com/600x400?text=School+Closure",
      hasImage: true
    },
    {
      id: 2,
      name: "Super Admin",
      date: "13 Aug, 08:15",
      text: "Final exam schedule is now available! Check the school portal for details.",
      hasImage: false
    }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <motion.div 
      className={styles.container}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {posts.map((post) => (
        <motion.div 
          key={post.id}
          className={styles.postCard}
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
        >
          <div className={styles.postHeader}>
            <div className={styles.userInfo}>
              <FaUserCircle className={styles.profilePic} />
              <div>
                <h4 className={styles.userName}>{post.name}</h4>
                <p className={styles.postDate}>{post.date}</p>
              </div>
            </div>
            <button className={styles.menuButton}>
              <FaEllipsisH />
            </button>
          </div>

          <div className={styles.postContent}>
            <p className={styles.postText}>
              {post.text.length > 150 ? `${post.text.substring(0, 150)}...` : post.text}
              {post.text.length > 150 && (
                <button className={styles.readMore}>Read more</button>
              )}
            </p>
            
            {post.hasImage && (
              <motion.div 
                className={styles.postImageContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <img 
                  src={post.image} 
                  alt="Post content" 
                  className={styles.postImage}
                />
              </motion.div>
            )}
          </div>

          <div className={styles.postFooter}>
            <button className={styles.actionButton}>
              <FaRegHeart />
              <span>Like</span>
            </button>
            <button className={styles.actionButton}>
              <FaRegComment />
              <span>Comment</span>
            </button>
            <button className={styles.actionButton}>
              <FiShare2 />
              <span>Share</span>
            </button>
            <button className={styles.bookmarkButton}>
              <FaRegBookmark />
            </button>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default PostStudents;