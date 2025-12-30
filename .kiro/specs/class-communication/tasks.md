# Implementation Plan

- [x] 1. Set up database schema and backend routes





  - [ ] 1.1 Create database migration for class_messages and class_message_attachments tables
    - Create class_messages table with id, teacher_id, teacher_name, class_name, message, created_at, updated_at
    - Create class_message_attachments table with id, message_id, filename, original_name, file_type, file_size


    - Add indexes for efficient querying
    - _Requirements: 7.1_
  - [x] 1.2 Create classCommunicationRoutes.js with basic route structure


    - Set up Express router with multer for file uploads
    - Create uploads/class-messages directory for attachments
    - Register routes in server.js
    - _Requirements: 7.1_
  - [x] 1.3 Implement GET /api/class-communication/teacher-classes/:teacherName endpoint


    - Query schedule_schema.schedule_slots to get unique classes for teacher
    - Return array of class names
    - _Requirements: 1.3_
  - [ ]* 1.4 Write property test for teacher class list
    - **Property 2: Teacher Class List Matches Schedule Assignments**
    - **Validates: Requirements 1.3**


  - [ ] 1.5 Implement GET /api/class-communication/messages/:className endpoint
    - Query class_messages with attachments for given class
    - Order by created_at ascending
    - Include teacher information
    - _Requirements: 2.1, 2.2, 7.2, 7.3_
  - [ ]* 1.6 Write property test for message ordering
    - **Property 3: Messages Are Sorted Chronologically**
    - **Validates: Requirements 2.2, 7.2**
  - [ ] 1.7 Implement POST /api/class-communication/messages endpoint
    - Accept multipart form data with message and attachments


    - Validate message is not empty when no attachments
    - Store message and attachments in database
    - Return created message with attachments
    - _Requirements: 3.1, 3.2, 4.2, 7.1_
  - [ ]* 1.8 Write property test for message creation
    - **Property 6: Message Creation Persists All Required Data**

    - **Validates: Requirements 3.1, 7.1**
  - [ ]* 1.9 Write property test for empty message validation
    - **Property 5: Empty Message Validation**
    - **Validates: Requirements 3.2**
  - [ ] 1.10 Implement GET /api/class-communication/student-messages/:className endpoint
    - Query all messages for the class from all teachers




    - Order by created_at ascending
    - Include teacher information and attachments
    - _Requirements: 5.2, 7.4_
  - [ ]* 1.11 Write property test for student view messages
    - **Property 8: Student View Shows All Class Teachers' Messages**
    - **Validates: Requirements 5.2, 7.4**


  - [ ] 1.12 Implement GET /api/class-communication/attachments/:attachmentId endpoint
    - Retrieve attachment file from storage
    - Set appropriate content-type headers

    - Stream file to response

    - _Requirements: 6.1_

- [ ] 2. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create frontend components for class communication


  - [ ] 3.1 Create MessageCard component
    - Display teacher name, message content, timestamp
    - Render attachments with appropriate preview (image thumbnail or file icon)
    - Handle click on attachments for download
    - _Requirements: 2.3, 4.3, 6.2, 6.3_
  - [ ]* 3.2 Write property test for attachment rendering
    - **Property 10: Attachment Rendering Matches File Type**




    - **Validates: Requirements 6.2, 6.3**
  - [x] 3.3 Create MessageList component

    - Display list of MessageCard components
    - Show loading skeleton while fetching
    - Show empty state when no messages
    - _Requirements: 2.2, 2.4_
  - [ ] 3.4 Create MessageForm component
    - Text input for message content

    - File attachment button with preview
    - Submit button with loading state
    - Validation for empty message without attachments




    - _Requirements: 3.1, 3.2, 3.3, 4.1_
  - [x]* 3.5 Write property test for message display fields

    - **Property 4: Message Display Contains Required Fields**
    - **Validates: Requirements 2.3**
  - [ ] 3.6 Create ClassCommunicationTab component
    - Accept userType prop to determine teacher/student view


    - For teachers: show class selector and message form

    - For students: show combined message feed (read-only)
    - Fetch and display messages
    - _Requirements: 1.3, 2.1, 5.2_
  - [x]* 3.7 Write property test for student message display

    - **Property 9: Student Message Display Contains Required Fields**
    - **Validates: Requirements 5.3**

- [x] 4. Integrate class communication into StaffProfile

  - [ ] 4.1 Add teaching classes state and fetch logic to StaffProfile
    - Fetch teacher's classes from schedule API
    - Store in component state
    - _Requirements: 1.1, 1.3_
  - [ ] 4.2 Add "Class" tab to navigation when teacher has teaching assignments
    - Conditionally add tab based on teaching classes
    - Use FiUsers or similar icon
    - _Requirements: 1.1, 1.2_
  - [ ]* 4.3 Write property test for class tab visibility
    - **Property 1: Class Tab Visibility Matches Teaching Assignment Status**
    - **Validates: Requirements 1.1, 1.2**
  - [ ] 4.4 Render ClassCommunicationTab when Class tab is active
    - Pass teacher info and teaching classes as props
    - Handle message sending
    - _Requirements: 2.1, 3.1, 3.3_

- [ ] 5. Integrate class communication into StudentProfile
  - [ ] 5.1 Add "Class" tab to StudentProfile navigation
    - Always show for students
    - Use appropriate icon
    - _Requirements: 5.1_
  - [ ] 5.2 Render ClassCommunicationTab in read-only mode for students
    - Pass student's class name
    - Hide message form
    - Show all teachers' messages
    - _Requirements: 5.2, 5.3, 5.4_

- [ ] 6. Add CSS styles for class communication components
  - [ ] 6.1 Create ClassCommunicationTab.module.css
    - Style class selector for teachers
    - Style message thread container
    - Responsive design for mobile
    - _Requirements: 2.1, 5.2_
  - [ ] 6.2 Create MessageCard.module.css
    - Style message bubble with teacher info
    - Style attachment previews and icons
    - Timestamp formatting
    - _Requirements: 2.3, 4.3, 6.2, 6.3_
  - [ ] 6.3 Create MessageForm.module.css
    - Style input area and attachment button
    - Style file preview indicators
    - Submit button states
    - _Requirements: 3.1, 4.1_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 8. Write property test for attachment storage consistency
  - **Property 7: Attachment Storage and Display Consistency**
  - **Validates: Requirements 4.2, 4.3**

- [ ] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
