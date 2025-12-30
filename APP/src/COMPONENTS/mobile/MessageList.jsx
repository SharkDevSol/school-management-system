import React, { useRef, useEffect } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import MessageCard from './MessageCard';
import SkeletonLoader from './SkeletonLoader';
import styles from './MessageList.module.css';

const MessageList = ({ 
  messages = [], 
  loading = false, 
  emptyMessage = 'No messages yet',
  showTeacherInfo = true 
}) => {
  const listRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading) {
    return (
      <div className={styles.messageList}>
        <SkeletonLoader type="card" count={3} />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FiMessageSquare className={styles.emptyIcon} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.messageList} ref={listRef}>
      {messages.map((message) => (
        <MessageCard 
          key={message.id} 
          message={message} 
          showTeacherInfo={showTeacherInfo}
        />
      ))}
    </div>
  );
};

export default MessageList;
