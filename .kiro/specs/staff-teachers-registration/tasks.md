# Implementation Plan

- [x] 1. Add teacher-specific validation to StaffForm





  - [ ] 1.1 Add validation logic for teacher role fields
    - Add validation check that requires `name` field when role is "Teacher"
    - Add validation check that requires `staff_work_time` field when role is "Teacher"
    - Add validation check that requires schedule data when role is "Teacher" and work time is "Part Time"
    - Prevent form submission if validation fails
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 1.2 Write property test for teacher field validation
    - **Property 5: Teacher Field Validation**
    - **Validates: Requirements 3.1, 3.2, 3.4**




  - [ ]* 1.3 Write property test for part-time schedule validation
    - **Property 6: Part-Time Schedule Validation**
    - **Validates: Requirements 3.3**


- [ ] 2. Update StaffForm response handling for teacher data
  - [ ] 2.1 Add teacher status display in success response
    - Parse `teacherData` from API response
    - Display teacher name, work time, and global staff ID when present
    - Add visual indicator for successful teacher table addition
    - _Requirements: 1.2, 2.2, 4.1_
  - [ ] 2.2 Add schoolSchemaError display
    - Parse `schoolSchemaError` from API response
    - Display error message without blocking main success message




    - Show separate status for staff registration vs teacher table addition
    - _Requirements: 1.3, 2.3, 4.2_
  - [ ]* 2.3 Write property test for teacher success feedback
    - **Property 3: Teacher Success Feedback**
    - **Validates: Requirements 1.2, 2.2, 4.1**
  - [ ]* 2.4 Write property test for teacher error isolation
    - **Property 4: Teacher Error Isolation**
    - **Validates: Requirements 1.3, 2.3, 4.2**

- [ ] 3. Enhance registration status summary display
  - [ ] 3.1 Create status summary component
    - Display separate indicators for staff registration and teacher table status
    - Show success/error state for each operation
    - Include credential display section when userCredentials present
    - _Requirements: 2.4, 4.3, 4.4_
  - [ ]* 3.2 Write property test for registration status summary
    - **Property 7: Registration Status Summary**
    - **Validates: Requirements 2.4, 4.4**
  - [ ]* 3.3 Write property test for credential display
    - **Property 8: Credential Display**
    - **Validates: Requirements 4.3**

- [ ] 4. Verify backend teacher table insertion
  - [ ] 4.1 Review and verify addTeacherToSchoolSchemaPoints function
    - Ensure all required fields are inserted (global_staff_id, teacher_name, staff_work_time, role, staff_enrollment_type)




    - Verify ON CONFLICT handling works correctly
    - Add logging for debugging
    - _Requirements: 1.1, 1.4_


  - [ ]* 4.2 Write property test for teacher registration dual insert
    - **Property 1: Teacher Registration Dual Insert**
    - **Validates: Requirements 1.1, 1.4**
  - [ ]* 4.3 Write property test for teacher data completeness
    - **Property 2: Teacher Data Completeness**
    - **Validates: Requirements 1.4**

- [ ] 5. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Update CreateRegisterStaff parent component
  - [ ] 6.1 Update handleFormSuccess callback
    - Handle teacher-specific success feedback
    - Display appropriate message based on teacherData presence
    - _Requirements: 1.2, 2.2_

- [ ] 7. Add loading state improvements
  - [ ] 7.1 Enhance loading indicator during submission
    - Show loading state during form submission
    - Disable submit button while loading
    - Clear loading state after all operations complete
    - _Requirements: 2.1_

- [ ] 8. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
