# Implementation Plan

- [x] 1. Set up database schema and backend foundation





  - [ ] 1.1 Create database migration for evaluation book tables
    - Create evaluation_book_templates table with id, template_name, description, is_active, created_by, timestamps
    - Create evaluation_book_template_fields table with field configuration columns
    - Create evaluation_book_teacher_assignments table with teacher-class mapping
    - Create evaluation_book_daily_entries table with JSONB field_values
    - Create evaluation_book_guardian_feedback table
    - Add all indexes for performance

    - _Requirements: 1.3, 2.2, 5.3, 9.4, 11.1_

  - [ ] 1.2 Create evaluationBookRoutes.js with route structure
    - Set up Express router with all endpoint stubs
    - Add authentication middleware integration






    - Add role-based authorization middleware
    - _Requirements: 4.2, 10.4_

  - [ ] 1.3 Write property test for serialization round-trip
    - **Property 18: Evaluation Data Serialization Round-Trip**
    - **Validates: Requirements 11.1, 11.2, 11.3**



- [x] 2. Implement Template Management (Admin)

  - [ ] 2.1 Implement template CRUD service functions
    - createTemplate function with field insertion
    - getTemplate function with field retrieval


    - updateTemplate function with field updates
    - listTemplates function
    - deleteTemplate function
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Write property test for template round-trip


    - **Property 1: Template Round-Trip Consistency**
    - **Validates: Requirements 1.3, 1.4**



  - [x] 2.3 Write property test for field type support




    - **Property 2: Field Type Support**
    - **Validates: Requirements 1.2**

  - [ ] 2.4 Create EvaluationBookFormBuilder.jsx component
    - Form builder UI with drag-and-drop field ordering
    - Field type selector (text, rating, textarea)
    - Guardian field toggle for feedback fields


    - Max rating configuration for rating fields
    - Save and cancel actions

    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 2.5 Write unit tests for template service


    - Test createTemplate with various field configurations
    - Test updateTemplate preserves existing data
    - Test deleteTemplate cascades to fields
    - _Requirements: 1.2, 1.3, 1.4_


- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.





- [ ] 4. Implement Teacher Assignment Management (Admin)
  - [ ] 4.1 Implement assignment service functions
    - assignTeacher function with duplicate check
    - removeAssignment function


    - getAssignmentsForTeacher function
    - getAllAssignments function

    - getTeacherForClass function
    - _Requirements: 2.2, 2.3, 2.4_



  - [ ] 4.2 Write property test for assignment creation and display
    - **Property 3: Teacher Assignment Creation and Display**
    - **Validates: Requirements 2.2, 2.4**






  - [ ] 4.3 Write property test for assignment removal
    - **Property 4: Assignment Removal Revokes Access**
    - **Validates: Requirements 2.3**

  - [ ] 4.4 Create TeacherAssignmentManager.jsx component
    - Display list of all teachers from existing staff data


    - Display list of all classes from existing class data
    - Assignment creation form with teacher and class dropdowns

    - Current assignments table with remove action
    - _Requirements: 2.1, 2.2, 2.3, 2.4_


  - [ ] 4.5 Write unit tests for assignment service
    - Test assignTeacher creates mapping
    - Test duplicate assignment handling
    - Test removeAssignment deletes correctly
    - _Requirements: 2.2, 2.3_


- [ ] 5. Implement Teacher Access Control and Class View
  - [x] 5.1 Implement teacher access control middleware


    - verifyTeacherClassAccess middleware function
    - Query assignments to validate teacher-class relationship
    - Return 403 for unauthorized access
    - _Requirements: 4.1, 4.2_

  - [x] 5.2 Write property test for teacher class access control


    - **Property 7: Teacher Class Access Control**
    - **Validates: Requirements 4.1, 7.1**



  - [x] 5.3 Write property test for teacher unauthorized access




    - **Property 8: Teacher Unauthorized Access Denied**
    - **Validates: Requirements 4.2**

  - [x] 5.4 Create TeacherClassList.jsx component


    - Fetch and display only assigned classes
    - Show class name and student count

    - Navigation to daily evaluation form
    - _Requirements: 4.1, 4.3_


- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Daily Evaluation Submission (Teacher)
  - [x] 7.1 Implement daily evaluation service functions

    - createDailyEvaluation function with field_values JSONB
    - getEvaluationsForClass function with date filter
    - getStudentsForClass helper using existing class data

    - validateFieldValues function against template constraints
    - _Requirements: 5.1, 5.2_



  - [ ] 7.2 Write property test for evaluation form student completeness
    - **Property 9: Evaluation Form Student Completeness**
    - **Validates: Requirements 5.1**




  - [ ] 7.3 Write property test for input validation
    - **Property 10: Input Validation Against Constraints**
    - **Validates: Requirements 5.2**

  - [x] 7.4 Implement send to guardians functionality

    - sendToGuardians function to update status and sent_at
    - Link evaluations to guardian_id from student records
    - Batch update for all students in class

    - _Requirements: 5.3, 5.4_

  - [ ] 7.5 Write property test for evaluation send workflow
    - **Property 11: Evaluation Send Workflow**
    - **Validates: Requirements 5.3, 5.4**


  - [ ] 7.6 Create DailyEvaluationForm.jsx component
    - Load active template with all fields
    - Display all students in selected class
    - Input fields based on template field types


    - Validation feedback for constraint violations



    - Save draft and send to guardians actions
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 7.7 Write unit tests for daily evaluation service
    - Test createDailyEvaluation stores field_values correctly
    - Test validation rejects invalid ratings
    - Test sendToGuardians updates status
    - _Requirements: 5.2, 5.3, 5.4_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement Guardian Evaluation Inbox and Feedback
  - [ ] 9.1 Implement guardian access control middleware
    - verifyGuardianWardAccess middleware function
    - Query guardian-student relationship from existing data
    - Return 403 for unauthorized access
    - _Requirements: 10.1, 10.4_

  - [ ] 9.2 Write property test for guardian ward-only access
    - **Property 15: Guardian Ward-Only Access**
    - **Validates: Requirements 10.1**

  - [ ] 9.3 Write property test for guardian unauthorized access
    - **Property 17: Guardian Unauthorized Access Denied**
    - **Validates: Requirements 10.4**

  - [ ] 9.4 Implement guardian evaluation service functions
    - getEvaluationsForGuardian function filtering by ward
    - getEvaluationById with guardian access check
    - Support for multiple wards per guardian
    - _Requirements: 8.1, 8.2, 10.1, 10.2_

  - [ ] 9.5 Write property test for guardian inbox completeness
    - **Property 13: Guardian Inbox Completeness**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [ ] 9.6 Write property test for multi-ward filtering
    - **Property 16: Guardian Multi-Ward Filtering**
    - **Validates: Requirements 10.2**

  - [ ] 9.7 Create GuardianEvaluationInbox.jsx component
    - Display pending evaluations for all wards
    - Ward filter dropdown for multi-ward guardians
    - Show evaluation date, class, and teacher info
    - Navigation to feedback form
    - _Requirements: 8.1, 8.2, 10.2_

- [ ] 10. Implement Guardian Feedback Submission
  - [ ] 10.1 Implement guardian feedback service functions
    - submitFeedback function with timestamp
    - Update evaluation status to 'responded' or 'completed'
    - getFeedbackForEvaluation function
    - _Requirements: 9.2, 9.3, 9.4_

  - [ ] 10.2 Write property test for guardian feedback submission
    - **Property 14: Guardian Feedback Submission**
    - **Validates: Requirements 9.2, 9.3, 9.4**

  - [ ] 10.3 Create GuardianFeedbackForm.jsx component
    - Display teacher-entered evaluation data (read-only)
    - Editable text area for guardian feedback
    - Submit button with confirmation
    - Success/error feedback
    - _Requirements: 8.3, 9.1, 9.2, 9.3_

  - [ ] 10.4 Write unit tests for feedback service
    - Test submitFeedback creates record
    - Test status update on feedback submission
    - Test duplicate feedback handling
    - _Requirements: 9.3, 9.4_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement Teacher Feedback View
  - [ ] 12.1 Implement teacher feedback retrieval
    - getEvaluationsWithFeedback function for teacher's classes
    - Include feedback status indicator
    - _Requirements: 6.2, 6.3_

  - [ ] 12.2 Write property test for feedback display with status
    - **Property 12: Feedback Display with Status**
    - **Validates: Requirements 6.2, 6.3**

  - [ ] 12.3 Create GuardianFeedbackView.jsx component (for teachers)
    - List evaluations with feedback status indicators
    - Expandable view to show guardian feedback text
    - Filter by class and date
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 13. Implement Reporting System
  - [ ] 13.1 Implement admin report service
    - getAdminReport function with all evaluations
    - Calculate completion rates and response rates
    - Support all filter parameters
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 13.2 Write property test for admin unrestricted access
    - **Property 5: Admin Unrestricted Report Access**
    - **Validates: Requirements 3.1, 3.3**

  - [ ] 13.3 Write property test for report filtering
    - **Property 6: Report Filtering Accuracy**
    - **Validates: Requirements 3.2**

  - [ ] 13.4 Implement teacher report service
    - getTeacherReport function with class restriction
    - Reuse filter logic from admin reports
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 13.5 Implement guardian report service
    - getGuardianReport function with ward restriction
    - Include evaluation history with all details
    - _Requirements: 10.1, 10.3_

  - [ ] 13.6 Create AdminEvaluationDashboard.jsx component
    - School-wide statistics cards
    - Filter controls for date, class, teacher, student
    - Evaluation list with status indicators
    - Export button
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 13.7 Create TeacherReportView.jsx component
    - Class-specific statistics
    - Guardian response rate display
    - Evaluation history table
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 13.8 Create WardEvaluationHistory.jsx component
    - Ward-specific evaluation timeline
    - Show evaluation date, teacher comments, guardian responses
    - _Requirements: 10.1, 10.3_

  - [ ] 13.9 Write unit tests for report services
    - Test admin report includes all data
    - Test teacher report respects class restrictions
    - Test guardian report respects ward restrictions
    - _Requirements: 3.1, 7.1, 10.1_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Integrate with existing application
  - [ ] 15.1 Add evaluation book routes to server.js
    - Import and mount evaluationBookRoutes
    - Add to existing route configuration
    - _Requirements: All_

  - [ ] 15.2 Add navigation and routing in App.jsx
    - Add routes for all new pages
    - Add navigation links based on user role
    - _Requirements: All_

  - [ ] 15.3 Integrate with existing authentication
    - Use existing auth middleware for route protection
    - Extract user role and ID from auth context
    - _Requirements: 4.1, 4.2, 10.1, 10.4_

  - [ ] 15.4 Write integration tests for complete workflows
    - Test admin creates template and assigns teacher
    - Test teacher submits evaluation and sends to guardian
    - Test guardian receives and submits feedback
    - Test reports show correct data for each role
    - _Requirements: All_

- [ ] 16. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
