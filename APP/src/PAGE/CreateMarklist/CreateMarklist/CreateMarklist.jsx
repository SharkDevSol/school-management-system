// PAGE/CreateMarklist/CreateMarklist/CreateMarklist.jsx
import React from 'react';
import MarkListManagement from '../MarkListManagement';
import './MarkListFrontend.css';

const MarkListSystem = ({ userType = 'admin', teacherName = null }) => {
  if (userType === 'admin') {
    return <MarkListManagement />;
  }

  return (
    <div className="mark-list-system">
      <div className="system-header">
        <h1>Mark List Management System</h1>
        <p>Mark list access for {teacherName}</p>
      </div>
      <div className="system-content">
        <TeacherMarkList teacherName={teacherName} />
      </div>
    </div>
  );
};

const TeacherMarkList = ({ teacherName }) => {
  return (
    <div>
      <h2>Teacher Mark List View for {teacherName}</h2>
      <p>This is where teachers can view and manage their assigned mark lists.</p>
    </div>
  );
};

export default MarkListSystem;