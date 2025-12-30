import React, { useState, useRef } from 'react';
import { FiSend, FiPaperclip, FiX, FiFile, FiImage } from 'react-icons/fi';
import styles from './MessageForm.module.css';

const MessageForm = ({ onSubmit, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + attachments.length > 5) {
      setError('Maximum 5 files allowed');
      return;
    }
    setAttachments(prev => [...prev, ...files]);
    setError('');
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() && attachments.length === 0) {
      setError('Please enter a message or attach a file');
      return;
    }

    setSending(true);
    setError('');

    try {
      await onSubmit(message.trim(), attachments);
      setMessage('');
      setAttachments([]);
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const isImageFile = (file) => file.type.startsWith('image/');

  return (
    <form className={styles.messageForm} onSubmit={handleSubmit}>
      {error && <div className={styles.error}>{error}</div>}

      {attachments.length > 0 && (
        <div className={styles.attachmentPreview}>
          {attachments.map((file, index) => (
            <div key={index} className={styles.attachmentItem}>
              {isImageFile(file) ? (
                <FiImage className={styles.attachmentIcon} />
              ) : (
                <FiFile className={styles.attachmentIcon} />
              )}
              <span className={styles.attachmentName}>{file.name}</span>
              <button 
                type="button"
                className={styles.removeBtn}
                onClick={() => removeAttachment(index)}
              >
                <FiX />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className={styles.inputRow}>
        <button
          type="button"
          className={styles.attachBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
        >
          <FiPaperclip />
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          style={{ display: 'none' }}
        />
        
        <input
          type="text"
          className={styles.textInput}
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled || sending}
        />
        
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={disabled || sending || (!message.trim() && attachments.length === 0)}
        >
          <FiSend />
        </button>
      </div>
    </form>
  );
};

export default MessageForm;
