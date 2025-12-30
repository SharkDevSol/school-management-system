import React, { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Select,
  DatePicker,
  Button,
  Modal,
  Card,
  Statistic,
  Upload,
  message,
  Tabs,
  Badge,
  Progress,
} from 'antd';
import {
  SearchOutlined,
  FileAddOutlined,
  DeleteOutlined,
  EyeOutlined,
  WarningOutlined,
  FilePdfOutlined,
  MailOutlined,
  BarChartOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Bar } from '@ant-design/charts';
import axios from 'axios';
import dayjs from 'dayjs';
import styles from './StudentFaultsS.module.css';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const StudentFaultsS = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedFault, setSelectedFault] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [faults, setFaults] = useState([]);
  const [reports, setReports] = useState({
    uniqueStudents: 0,
    classFaultCounts: [],
    studentFaultCounts: [],
  });
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    level: null,
    type: null,
    dateRange: null,
  });
  const [formData, setFormData] = useState({
    student_name: '',
    fault_type: '',
    fault_level: '',
    date: null,
    description: '',
    reported_by: '',
    attachment: null,
  });
  const [editFormData, setEditFormData] = useState({
    fault_type: '',
    fault_level: '',
    date: null,
    description: '',
    reported_by: '',
    action_taken: '',
    attachment: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const faultTypes = ['Late', 'Fight', 'Disrespect', 'Absence', 'Skipped Class', 'Uniform Violation'];
  const faultLevels = [
    { value: 'Minor', color: 'green' },
    { value: 'Moderate', color: 'orange' },
    { value: 'Critical', color: 'red' },
  ];

  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching classes from /api/faults/classes');
        const response = await axios.get('https://school-management-system-daul.onrender.com/api/faults/classes');
        console.log('Classes fetched:', response.data);
        setClasses(response.data);
      } catch (error) {
        console.error('Error fetching classes:', error);
        message.error('Failed to fetch classes');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchReports = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching reports from /api/faults/reports');
        const response = await axios.get('https://school-management-system-daul.onrender.com/api/faults/reports');
        console.log('Reports fetched:', response.data);
        setReports(response.data);
      } catch (error) {
        console.error('Error fetching reports:', error);
        message.error('Failed to fetch reports');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
    fetchReports();
  }, []);

  const handleClassSelect = async (className) => {
    setSelectedClass(className);
    setFaults([]);
    setStudents([]);
    setFormData({ ...formData, student_name: '', reported_by: '' });
    setIsLoading(true);
    try {
      console.log(`Fetching students for class: ${className}`);
      const studentsResponse = await axios.get(`https://school-management-system-daul.onrender.com/api/faults/students/${className}`);
      console.log(`Students fetched for ${className}:`, studentsResponse.data);
      setStudents(studentsResponse.data);

      console.log(`Fetching faults for class: ${className}`);
      const faultsResponse = await axios.get(`https://school-management-system-daul.onrender.com/api/faults/faults/${className}`);
      console.log(`Faults fetched for ${className}:`, faultsResponse.data);
      setFaults(faultsResponse.data);
    } catch (error) {
      console.error(`Error fetching data for ${className}:`, error);
      message.error(`Failed to fetch data for ${className}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFault = () => {
    setActiveTab('add');
    setSelectedClass('');
    setFormData({
      student_name: '',
      fault_type: '',
      fault_level: '',
      date: null,
      description: '',
      reported_by: '',
      attachment: null,
    });
  };

  const handleSearch = (e) => {
    setSearchText(e.target.value);
  };

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
  };

  const viewFaultDetails = (fault) => {
    setSelectedFault(fault);
    setIsModalVisible(true);
  };

  const handleFormChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleEditFormChange = (name, value) => {
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleAddSubmit = async () => {
    if (!formData.student_name || !formData.fault_type || !formData.fault_level || !formData.date || !formData.description || !formData.reported_by) {
      message.error('All fields except attachment are required');
      return;
    }
    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('className', selectedClass);
      formDataToSend.append('student_name', formData.student_name);
      formDataToSend.append('fault_type', formData.fault_type);
      formDataToSend.append('fault_level', formData.fault_level);
      formDataToSend.append('date', formData.date.format('YYYY-MM-DD'));
      formDataToSend.append('description', formData.description);
      formDataToSend.append('reported_by', formData.reported_by);
      if (formData.attachment) {
        formDataToSend.append('attachment', formData.attachment);
      }

      console.log(`Submitting fault for ${formData.student_name} in class ${selectedClass}`);
      const response = await axios.post('https://school-management-system-daul.onrender.com/api/faults/add-fault', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Fault added:', response.data);
      message.success('Fault added successfully');
      setActiveTab('list');
      handleClassSelect(selectedClass); // Refresh faults
      setFormData({
        student_name: '',
        fault_type: '',
        fault_level: '',
        date: null,
        description: '',
        reported_by: '',
        attachment: null,
      });
      // Refresh reports
      const reportsResponse = await axios.get('https://school-management-system-daul.onrender.com/api/faults/reports');
      setReports(reportsResponse.data);
    } catch (error) {
      console.error('Error adding fault:', error);
      message.error(`Failed to add fault: ${error.response?.data?.details || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFault = (fault) => {
    setSelectedFault(fault);
    setEditFormData({
      fault_type: fault.type,
      fault_level: fault.level,
      date: dayjs(fault.date),
      description: fault.description,
      reported_by: fault.reported_by,
      action_taken: fault.action_taken || '',
      attachment: null,
    });
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    if (!editFormData.fault_type || !editFormData.fault_level || !editFormData.date || !editFormData.description || !editFormData.reported_by) {
      message.error('All fields except attachment and action_taken are required');
      return;
    }
    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('fault_type', editFormData.fault_type);
      formDataToSend.append('fault_level', editFormData.fault_level);
      formDataToSend.append('date', editFormData.date.format('YYYY-MM-DD'));
      formDataToSend.append('description', editFormData.description);
      formDataToSend.append('reported_by', editFormData.reported_by);
      formDataToSend.append('action_taken', editFormData.action_taken);
      if (editFormData.attachment) {
        formDataToSend.append('attachment', editFormData.attachment);
      }

      console.log(`Updating fault ID ${selectedFault.id} in class ${selectedClass}`);
      const response = await axios.put(
        `https://school-management-system-daul.onrender.com/api/faults/edit-fault/${selectedClass}/${selectedFault.id}`,
        formDataToSend,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      console.log('Fault updated:', response.data);
      message.success('Fault updated successfully');
      setIsEditModalVisible(false);
      handleClassSelect(selectedClass); // Refresh faults
      // Refresh reports
      const reportsResponse = await axios.get('https://school-management-system-daul.onrender.com/api/faults/reports');
      setReports(reportsResponse.data);
    } catch (error) {
      console.error('Error updating fault:', error);
      message.error(`Failed to update fault: ${error.response?.data?.details || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFault = async (faultId) => {
    setIsLoading(true);
    try {
      console.log(`Deleting fault ID ${faultId} in class ${selectedClass}`);
      const response = await axios.delete(`https://school-management-system-daul.onrender.com/api/faults/delete-fault/${selectedClass}/${faultId}`);
      console.log('Fault deleted:', response.data);
      message.success('Fault deleted successfully');
      handleClassSelect(selectedClass); // Refresh faults
      // Refresh reports
      const reportsResponse = await axios.get('https://school-management-system-daul.onrender.com/api/faults/reports');
      setReports(reportsResponse.data);
    } catch (error) {
      console.error('Error deleting fault:', error);
      message.error(`Failed to delete fault: ${error.response?.data?.details || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewFaultForStudent = () => {
    setIsModalVisible(false);
    setIsAddModalVisible(true);
    setFormData({
      student_name: selectedFault.student_name,
      fault_type: '',
      fault_level: '',
      date: null,
      description: '',
      reported_by: '',
      attachment: null,
    });
  };

  const filteredData = faults.filter(fault => {
    const matchesSearch =
      fault.student_name.toLowerCase().includes(searchText.toLowerCase()) ||
      fault.id.toLowerCase().includes(searchText.toLowerCase());
    const matchesLevel = !filters.level || fault.level === filters.level;
    const matchesType = !filters.type || fault.type === filters.type;
    const matchesDate =
      !filters.dateRange ||
      (dayjs(fault.date).isAfter(filters.dateRange[0].startOf('day')) &&
        dayjs(fault.date).isBefore(filters.dateRange[1].endOf('day')));
    return matchesSearch && matchesLevel && matchesType && matchesDate;
  });

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Name',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 250,
      render: (text, record) => (
        <div className={styles.studentCell}>
          <div className={styles.studentName}>{text}</div>
          <div className={styles.studentId}>ID: {record.school_id}</div>
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: date => dayjs(date).format('DD/MM/YYYY'),
      width: 120,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 200,
      render: type => <Badge status="processing" text={type} className={styles.largeBadge} />,
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 200,
      render: level => {
        const levelInfo = faultLevels.find(l => l.value === level);
        return <Badge color={levelInfo.color} text={level} className={styles.largeBadge} />;
      },
    },
    {
      title: 'Reported By',
      dataIndex: 'reported_by',
      key: 'reported_by',
      width: 200, // Increased width
      render: text => <span className={styles.largeText}>{text}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className={styles.actionButtons}>
          <Button
            icon={<EyeOutlined />}
            onClick={() => viewFaultDetails(record)}
            className={styles.viewBtn}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedFault(record);
              handleAddNewFaultForStudent();
            }}
            className={styles.addBtn}
          />
          <Button
            icon={<WarningOutlined />}
            onClick={() => handleEditFault(record)}
            className={styles.warnBtn}
          />
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDeleteFault(record.id)}
            className={styles.deleteBtn}
          />
        </div>
      ),
      width: 150,
    },
  ];

  const studentRankColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Student Name',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 250,
      render: text => <span className={styles.largeText}>{text}</span>,
    },
    {
      title: 'Class',
      dataIndex: 'className',
      key: 'className',
      width: 150,
    },
    {
      title: 'Fault Count',
      dataIndex: 'fault_count',
      key: 'fault_count',
      width: 150,
    },
  ];

  const barConfig = {
    data: reports.classFaultCounts,
    xField: 'faultCount',
    yField: 'className',
    sort: {
      reverse: true,
    },
    label: {
      position: 'right',
      style: {
        fontSize: 14,
      },
    },
    xAxis: {
      title: {
        text: 'Number of Faults',
        style: { fontSize: 16 },
      },
    },
    yAxis: {
      title: {
        text: 'Class',
        style: { fontSize: 16 },
      },
    },
    height: 400,
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Student Faults System (Dogoggora Barattootaa)</h2>
        <div className={styles.controls}>
          <Button type="primary" icon={<FileAddOutlined />} onClick={handleAddFault}>
            Add New Fault
          </Button>
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Add Fault" key="add">
          <Card title="Record New Fault" className={styles.addFaultCard}>
            {!selectedClass && (
              <div className={styles.classSelection}>
                <h3>Select a Class</h3>
                <div className={styles.classButtons}>
                  {classes.map(cls => (
                    <Button
                      key={cls}
                      onClick={() => handleClassSelect(cls)}
                      disabled={isLoading}
                      className={styles.classButton}
                    >
                      {cls}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {selectedClass && (
              <>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Student Name</label>
                    <Select
                      showSearch
                      placeholder="Search student..."
                      value={formData.student_name}
                      onChange={value => handleFormChange('student_name', value)}
                      className={styles.largeInput}
                    >
                      {students.map(student => (
                        <Option key={`${student.school_id}-${student.class_id}`} value={student.student_name}>
                          {student.student_name}
                        </Option>
                      ))}
                    </Select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Date</label>
                    <DatePicker
                      value={formData.date}
                      onChange={date => handleFormChange('date', date)}
                      className={styles.fullWidth}
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Fault Type</label>
                    <Select
                      placeholder="Select fault type"
                      value={formData.fault_type}
                      onChange={value => handleFormChange('fault_type', value)}
                      className={styles.largeInput}
                    >
                      {faultTypes.map(type => (
                        <Option key={type} value={type}>
                          {type}
                        </Option>
                      ))}
                    </Select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Fault Level</label>
                    <Select
                      placeholder="Select severity level"
                      value={formData.fault_level}
                      onChange={value => handleFormChange('fault_level', value)}
                      className={styles.largeInput}
                    >
                      {faultLevels.map(level => (
                        <Option key={level.value} value={level.value}>
                          <Badge color={level.color} text={level.value} />
                        </Option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Reported By</label>
                    <Input
                      value={formData.reported_by}
                      onChange={e => handleFormChange('reported_by', e.target.value)}
                      placeholder="Enter reporter's name"
                      className={styles.largeInput}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <TextArea
                    rows={4}
                    value={formData.description}
                    onChange={e => handleFormChange('description', e.target.value)}
                    placeholder="Enter fault details..."
                    className={styles.largeInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Attachment (Optional)</label>
                  <Upload
                    accept="image/*,.pdf,video/*"
                    beforeUpload={file => {
                      setFormData({ ...formData, attachment: file });
                      return false;
                    }}
                    fileList={formData.attachment ? [{ uid: '-1', name: formData.attachment.name, status: 'done' }] : []}
                    onRemove={() => setFormData({ ...formData, attachment: null })}
                  >
                    <Button icon={<FileAddOutlined />}>Upload File</Button>
                  </Upload>
                </div>
                <div className={styles.formActions}>
                  <Button type="primary" onClick={handleAddSubmit} disabled={isLoading}>
                    Submit Fault
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedClass('');
                      setActiveTab('list');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </Card>
        </TabPane>
        <TabPane tab="Faults List" key="list">
          <div className={styles.filterSection}>
            <Input
              placeholder="Search by name or ID..."
              prefix={<SearchOutlined />}
              onChange={handleSearch}
              className={styles.searchInput}
            />
            <div className={styles.filterGroup}>
              <Select
                placeholder="Filter by level"
                allowClear
                onChange={value => handleFilterChange('level', value)}
                className={styles.filterSelect}
              >
                {faultLevels.map(level => (
                  <Option key={level.value} value={level.value}>
                    <Badge color={level.color} text={level.value} />
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Filter by type"
                allowClear
                onChange={value => handleFilterChange('type', value)}
                className={styles.filterSelect}
              >
                {faultTypes.map(type => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
              <DatePicker.RangePicker
                onChange={dates => handleFilterChange('dateRange', dates)}
                className={styles.datePicker}
              />
            </div>
          </div>
          {!selectedClass && (
            <div className={styles.classSelection}>
              <h3>Select a Class</h3>
              <div className={styles.classButtons}>
                {classes.map(cls => (
                  <Button key={cls} onClick={() => handleClassSelect(cls)} disabled={isLoading} className={styles.classButton}>
                    {cls}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {selectedClass && (
            <>
              <Button
                onClick={() => setSelectedClass('')}
                style={{ marginBottom: '1rem' }}
              >
                Back to Classes
              </Button>
              <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                className={styles.faultsTable}
                loading={isLoading}
              />
            </>
          )}
        </TabPane>
        <TabPane tab="Reports" key="reports">
          <div className={styles.reportSection}>
            <Card title="Behavior Statistics" className={styles.statsCard}>
              <div className={styles.statGrid}>
                <Statistic title="Total Students with Faults" value={reports.uniqueStudents} />
                <Statistic
                  title="This Week"
                  value={faults.filter(f => dayjs(f.date).isAfter(dayjs().startOf('week'))).length}
                />
                <Statistic
                  title="Critical Faults"
                  value={faults.filter(f => f.level === 'Critical').length}
                />
                <Statistic title="Parent Notifications" value={faults.filter(f => f.action_taken).length} />
              </div>
              <div className={styles.chartContainer}>
                <h3>Class Fault Rankings</h3>
                {reports.classFaultCounts.length > 0 ? (
                  <Bar {...barConfig} />
                ) : (
                  <p>No fault data available</p>
                )}
              </div>
              <div className={styles.studentRankContainer}>
                <h3>Top Students with Faults</h3>
                <Table
                  columns={studentRankColumns}
                  dataSource={reports.studentFaultCounts}
                  rowKey={record => `${record.student_name}:${record.className}`}
                  pagination={false}
                  className={styles.studentRankTable}
                />
              </div>
            </Card>
            <div className={styles.reportActions}>
              <Button icon={<FilePdfOutlined />}>Export PDF Report</Button>
              <Button icon={<MailOutlined />}>Send to Parents</Button>
            </div>
          </div>
        </TabPane>
      </Tabs>

      {/* Fault Details Modal */}
      <Modal
        title="Fault Details"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="add" icon={<PlusOutlined />} onClick={handleAddNewFaultForStudent}>
            Add New Fault
          </Button>,
          <Button key="print" icon={<FilePdfOutlined />}>Print</Button>,
          <Button key="notify" type="primary" icon={<MailOutlined />}>
            Notify Parent
          </Button>,
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedFault && (
          <div className={styles.faultDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Name:</span>
              <span className={styles.largeText}>{selectedFault.student_name}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Student ID:</span>
              <span>{selectedFault.school_id}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Date:</span>
              <span>{dayjs(selectedFault.date).format('MMMM D, YYYY')}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fault Type:</span>
              <span className={styles.largeText}>
                <Badge status="processing" text={selectedFault.type} className={styles.largeBadge} />
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Level:</span>
              <span className={styles.largeText}>
                <Badge
                  color={faultLevels.find(l => l.value === selectedFault.level).color}
                  text={selectedFault.level}
                  className={styles.largeBadge}
                />
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Reported By:</span>
              <span className={styles.largeText}>{selectedFault.reported_by}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Description:</span>
              <span>{selectedFault.description}</span>
            </div>
            {selectedFault.action_taken && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Action Taken:</span>
                <span>{selectedFault.action_taken}</span>
              </div>
            )}
            {selectedFault.attachment && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Attachment:</span>
                <a href={`/Uploads/${selectedFault.attachment}`} target="_blank" rel="noopener noreferrer">
                  {selectedFault.attachment}
                </a>
              </div>
            )}
            <div className={styles.studentHistory}>
              <h4>Student's Fault History (Last 30 Days)</h4>
              <Progress
                percent={Math.min((faults.filter(f => f.student_name === selectedFault.student_name).length / 5) * 100, 100)}
                status="active"
                format={() => {
                  const count = faults.filter(f => f.student_name === selectedFault.student_name).length;
                  const critical = faults.filter(f => f.student_name === selectedFault.student_name && f.level === 'Critical').length;
                  const minor = faults.filter(f => f.student_name === selectedFault.student_name && f.level === 'Minor').length;
                  return `${count} faults (${minor} Minor, ${critical} Critical)`;
                }}
              />
              {faults.filter(f => f.student_name === selectedFault.student_name).length > 2 && (
                <p className={styles.warningText}>
                  <WarningOutlined /> This student has exceeded the monthly warning threshold (2 faults)
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add New Fault Modal */}
      <Modal
        title={`Add New Fault for ${formData.student_name}`}
        visible={isAddModalVisible}
        onOk={handleAddSubmit}
        onCancel={() => setIsAddModalVisible(false)}
        okText="Submit"
        cancelText="Cancel"
        confirmLoading={isLoading}
      >
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Date</label>
            <DatePicker
              value={formData.date}
              onChange={date => handleFormChange('date', date)}
              className={styles.fullWidth}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Fault Type</label>
            <Select
              placeholder="Select fault type"
              value={formData.fault_type}
              onChange={value => handleFormChange('fault_type', value)}
              className={styles.largeInput}
            >
              {faultTypes.map(type => (
                <Option key={type} value={type}>
                  {type}
                </Option>
              ))}
            </Select>
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Fault Level</label>
            <Select
              placeholder="Select severity level"
              value={formData.fault_level}
              onChange={value => handleFormChange('fault_level', value)}
              className={styles.largeInput}
            >
              {faultLevels.map(level => (
                <Option key={level.value} value={level.value}>
                  <Badge color={level.color} text={level.value} />
                </Option>
              ))}
            </Select>
          </div>
          <div className={styles.formGroup}>
            <label>Reported By</label>
            <Input
              value={formData.reported_by}
              onChange={e => handleFormChange('reported_by', e.target.value)}
              placeholder="Enter reporter's name"
              className={styles.largeInput}
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Description</label>
          <TextArea
            rows={4}
            value={formData.description}
            onChange={e => handleFormChange('description', e.target.value)}
            placeholder="Enter fault details..."
            className={styles.largeInput}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Attachment (Optional)</label>
          <Upload
            accept="image/*,.pdf,video/*"
            beforeUpload={file => {
              setFormData({ ...formData, attachment: file });
              return false;
            }}
            fileList={formData.attachment ? [{ uid: '-1', name: formData.attachment.name, status: 'done' }] : []}
            onRemove={() => setFormData({ ...formData, attachment: null })}
          >
            <Button icon={<FileAddOutlined />}>Upload File</Button>
          </Upload>
        </div>
      </Modal>

      {/* Edit Fault Modal */}
      <Modal
        title={`Edit Fault for ${selectedFault?.student_name}`}
        visible={isEditModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setIsEditModalVisible(false)}
        okText="Update"
        cancelText="Cancel"
        confirmLoading={isLoading}
      >
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Date</label>
            <DatePicker
              value={editFormData.date}
              onChange={date => handleEditFormChange('date', date)}
              className={styles.fullWidth}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Fault Type</label>
            <Select
              placeholder="Select fault type"
              value={editFormData.fault_type}
              onChange={value => handleEditFormChange('fault_type', value)}
              className={styles.largeInput}
            >
              {faultTypes.map(type => (
                <Option key={type} value={type}>
                  {type}
                </Option>
              ))}
            </Select>
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Fault Level</label>
            <Select
              placeholder="Select severity level"
              value={editFormData.fault_level}
              onChange={value => handleEditFormChange('fault_level', value)}
              className={styles.largeInput}
            >
              {faultLevels.map(level => (
                <Option key={level.value} value={level.value}>
                  <Badge color={level.color} text={level.value} />
                </Option>
              ))}
            </Select>
          </div>
          <div className={styles.formGroup}>
            <label>Reported By</label>
            <Input
              value={editFormData.reported_by}
              onChange={e => handleEditFormChange('reported_by', e.target.value)}
              placeholder="Enter reporter's name"
              className={styles.largeInput}
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Description</label>
          <TextArea
            rows={4}
            value={editFormData.description}
            onChange={e => handleEditFormChange('description', e.target.value)}
            placeholder="Enter fault details..."
            className={styles.largeInput}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Action Taken (Optional)</label>
          <Input
            value={editFormData.action_taken}
            onChange={e => handleEditFormChange('action_taken', e.target.value)}
            placeholder="e.g., Guardian Informed"
            className={styles.largeInput}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Attachment (Optional)</label>
          <Upload
            accept="image/*,.pdf,video/*"
            beforeUpload={file => {
              setEditFormData({ ...editFormData, attachment: file });
              return false;
            }}
            fileList={editFormData.attachment ? [{ uid: '-1', name: editFormData.attachment.name, status: 'done' }] : []}
            onRemove={() => setEditFormData({ ...editFormData, attachment: null })}
          >
            <Button icon={<FileAddOutlined />}>Upload File</Button>
          </Upload>
        </div>
      </Modal>
    </div>
  );
};

export default StudentFaultsS;