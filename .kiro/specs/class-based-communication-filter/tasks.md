# Implementation Plan

- [x] 1. Add filtered contacts endpoint for teachers




  - [ ] 1.1 Create GET /api/chats/contacts/teacher/:staffId endpoint in chatRoutes.js
    - Query class_teachers table to get classes assigned to the teacher
    - Query classes_schema tables to get guardians from those classes
    - Deduplicate guardians and return with ward class info
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ]* 1.2 Write property test for teacher guardian filtering
    - **Property 1: Teacher sees only relevant guardians**



    - **Property 2: No duplicate guardians for teachers**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 2. Add filtered contacts endpoint for guardians
  - [ ] 2.1 Create GET /api/chats/contacts/guardian/:username endpoint in chatRoutes.js
    - Query classes_schema tables to find wards by guardian username
    - Get teachers assigned to those wards' classes
    - Always include directors in the result
    - Deduplicate teachers and return
    - _Requirements: 2.1, 2.2, 2.3, 2.4_




  - [ ]* 2.2 Write property test for guardian teacher filtering
    - **Property 3: Guardian sees only relevant teachers**
    - **Property 4: Directors always visible to guardians**
    - **Property 5: No duplicate teachers for guardians**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**





- [ ] 3. Add admin contacts endpoint
  - [x] 3.1 Create GET /api/chats/contacts/admin endpoint in chatRoutes.js




    - Return all guardians from all classes_schema tables
    - Deduplicate and return
    - _Requirements: 3.1, 3.2_



  - [ ]* 3.2 Write property test for admin guardian access
    - **Property 6: Administrator sees all guardians**
    - **Validates: Requirements 3.1**

- [ ] 4. Update TeacherCommunications component
  - [ ] 4.1 Modify TeacherCommunications.jsx to use filtered endpoint
    - Update fetchData to call /api/chats/contacts/teacher/${staffId}
    - Pass user.global_staff_id from props
    - Handle empty contact list gracefully
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 5. Update GuardianCommunications component
  - [ ] 5.1 Modify GuardianCommunications.jsx to use filtered endpoint
    - Update fetchData to call /api/chats/contacts/guardian/${username}
    - Extract guardian username from props
    - Handle empty contact list gracefully
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
