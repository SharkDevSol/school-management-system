# Implementation Plan

## Guardians List Feature

- [x] 1. Create Guardian List Backend API




  - [ ] 1.1 Create guardianListRoutes.js with GET /guardians endpoint
    - Query all classes_schema tables to extract unique guardians
    - Aggregate guardian data (name, phone, email, credentials)

    - Return deduplicated guardian list with associated student references
    - _Requirements: 1.1, 3.2_
  - [ ] 1.2 Add GET /guardian/:id/students endpoint
    - Return all students associated with a specific guardian
    - Match by guardian_name or guardian_phone
    - _Requirements: 3.2_




  - [ ]* 1.3 Write property test for guardian data aggregation
    - **Property 4: Guardian-student association completeness**
    - **Validates: Requirements 3.2**



- [x] 2. Create ListGuardian Component Structure

  - [x] 2.1 Create ListGuardian.jsx with basic component structure

    - Set up state management (guardians, loading, search, viewMode, pagination)
    - Implement useEffect for data fetching
    - Add AppContext integration for translations
    - _Requirements: 1.1, 1.2_

  - [ ] 2.2 Create ListGuardian.module.css with styling
    - Copy and adapt styles from ListStaff.module.css
    - Ensure consistent design language

    - _Requirements: 1.1_

- [ ] 3. Implement Guardian List Display
  - [ ] 3.1 Implement grid view for guardians
    - Display guardian cards with photo, name, phone, email
    - Show student count badge on each card

    - Add hover animations with Framer Motion
    - _Requirements: 1.1, 1.2_

  - [ ] 3.2 Implement list/table view for guardians
    - Display guardians in table format with sortable columns
    - Include photo thumbnail, name, contact info, student count
    - _Requirements: 1.2_
  - [ ] 3.3 Implement header with statistics
    - Show total guardian count
    - Display view mode toggle buttons

    - _Requirements: 1.3_
  - [ ]* 3.4 Write property test for statistics accuracy
    - **Property 1: Guardian statistics accuracy**
    - **Validates: Requirements 1.3**

- [x] 4. Implement Guardian Search and Filter

  - [ ] 4.1 Implement search functionality
    - Add search input with FiSearch icon
    - Filter guardians by name, phone, or email

    - Real-time filtering as user types
    - _Requirements: 2.1_
  - [ ]* 4.2 Write property test for search filter
    - **Property 2: Search filter correctness**

    - **Validates: Requirements 2.1**

  - [ ] 4.3 Implement pagination
    - Add pagination controls (previous, next, page numbers)
    - Set items per page (12 for grid, configurable)
    - Update current page on filter changes
    - _Requirements: 2.3_




  - [ ]* 4.4 Write property test for pagination
    - **Property 3: Pagination consistency**

    - **Validates: Requirements 2.3**

- [ ] 5. Implement Guardian Detail Modal
  - [ ] 5.1 Create guardian detail modal component
    - Display full guardian information
    - Show profile photo with fallback avatar
    - List all associated students with class info

    - _Requirements: 3.1, 3.2_
  - [ ] 5.2 Implement credentials display with show/hide
    - Add password visibility toggle
    - Implement copy-to-clipboard for username and password
    - _Requirements: 3.3, 3.4_

- [ ] 6. Checkpoint - Guardian List Feature
  - Ensure all tests pass, ask the user if questions arise.

## Student Attendance Feature





- [ ] 7. Create Student Attendance Backend API
  - [x] 7.1 Create studentAttendanceRoutes.js with core endpoints

    - GET /classes - Return list of class names
    - GET /students/:className - Return students for attendance marking
    - _Requirements: 4.1_
  - [x] 7.2 Implement attendance marking endpoint

    - POST /mark - Save attendance records

    - Handle upsert logic for existing records
    - Validate status values (present, absent, late)
    - _Requirements: 4.2, 4.3_
  - [ ]* 7.3 Write property test for attendance uniqueness
    - **Property 7: Attendance uniqueness invariant**
    - **Validates: Requirements 4.3**
  - [x] 7.4 Implement attendance history endpoint

    - GET /history - Return attendance records with filters
    - Support date range, class, student, and status filters
    - Return sorted by date descending
    - _Requirements: 5.1, 5.2, 6.2_

  - [ ]* 7.5 Write property test for date range filter
    - **Property 8: Date range filter correctness**
    - **Validates: Requirements 5.1**
  - [ ]* 7.6 Write property test for sorting order
    - **Property 13: Attendance sorting order**
    - **Validates: Requirements 6.2**


- [x] 8. Create StudentAttendance Component Structure

  - [ ] 8.1 Create StudentAttendance.jsx with basic structure
    - Set up state for classes, selectedClass, selectedDate, students, records
    - Implement tab navigation (Mark Attendance, View History)
    - Add AppContext integration
    - _Requirements: 4.1, 5.1_
  - [ ] 8.2 Create StudentAttendance.module.css
    - Style attendance marking interface
    - Style history view with filters

    - Ensure responsive design
    - _Requirements: 4.1_

- [x] 9. Implement Attendance Marking Interface

  - [ ] 9.1 Implement class and date selection
    - Add class dropdown populated from API
    - Add date picker defaulting to today
    - Load students when class/date changes
    - _Requirements: 4.1_
  - [ ]* 9.2 Write property test for class student list
    - **Property 5: Class student list completeness**

    - **Validates: Requirements 4.1**

  - [ ] 9.3 Implement student attendance grid
    - Display student list with name and photo
    - Add status buttons (Present, Absent, Late) for each student
    - Show current status with visual indicator
    - _Requirements: 4.1, 4.2_

  - [ ] 9.4 Implement attendance save functionality
    - Save attendance on status button click
    - Show loading state during save
    - Display success/error feedback

    - _Requirements: 4.2, 4.4_
  - [ ]* 9.5 Write property test for attendance round-trip
    - **Property 6: Attendance marking round-trip**
    - **Validates: Requirements 4.2**

- [x] 10. Implement Attendance History View



  - [ ] 10.1 Implement history filters
    - Add date range picker (from/to)
    - Add class filter dropdown

    - Add status filter dropdown
    - Add student search input
    - _Requirements: 5.1, 5.2_
  - [ ]* 10.2 Write property test for multi-filter
    - **Property 9: Multi-filter conjunction**
    - **Validates: Requirements 5.2**





  - [ ] 10.3 Implement attendance history table
    - Display records with student name, class, date, status
    - Support sorting by columns
    - Add pagination for large datasets
    - _Requirements: 5.1, 5.2_
  - [ ] 10.4 Implement summary statistics
    - Calculate and display present/absent/late counts
    - Show percentages for each status
    - Update statistics when filters change
    - _Requirements: 5.3_
  - [ ]* 10.5 Write property test for statistics calculation
    - **Property 10: Statistics calculation accuracy**
    - **Validates: Requirements 5.3**

- [ ] 11. Implement Export Functionality
  - [ ] 11.1 Add CSV export endpoint to backend
    - GET /export with query parameters
    - Generate CSV with all attendance fields
    - Return as downloadable file
    - _Requirements: 5.4_
  - [ ] 11.2 Implement export button in frontend
    - Add export button to history view
    - Trigger download with current filters applied
    - _Requirements: 5.4_
  - [ ]* 11.3 Write property test for CSV export
    - **Property 11: CSV export completeness**
    - **Validates: Requirements 5.4**

- [ ] 12. Checkpoint - Attendance Feature
  - Ensure all tests pass, ask the user if questions arise.

## Integration and Navigation

- [ ] 13. Add Navigation and Routes
  - [ ] 13.1 Add routes to App.jsx
    - Add /list/guardians route for ListGuardian
    - Add /student-attendance route for StudentAttendance
    - _Requirements: 1.1, 4.1_
  - [ ] 13.2 Update navigation menu
    - Add Guardians List menu item under Lists section
    - Add Student Attendance menu item
    - _Requirements: 1.1, 4.1_

- [ ] 14. Register Backend Routes
  - [ ] 14.1 Update server.js with new routes
    - Import and register guardianListRoutes
    - Import and register studentAttendanceRoutes
    - _Requirements: 1.1, 4.1_

- [ ] 15. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
