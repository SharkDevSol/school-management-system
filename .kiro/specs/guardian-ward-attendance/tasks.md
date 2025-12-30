# Implementation Plan

- [x] 1. Create backend API for guardian attendance




  - [ ] 1.1 Create guardianAttendanceRoutes.js with endpoint to get attendance tables for a class
    - Implement GET `/api/guardian-attendance/tables/:className`
    - Query `class_{className}_attendance` schema for table names

    - Return array of attendance period names
    - _Requirements: 1.2, 1.3_
  - [ ] 1.2 Add endpoint to get student attendance by school_id
    - Implement GET `/api/guardian-attendance/student/:className/:tableName/:schoolId`


    - Query specific attendance table for student records




    - Return attendance data with all daily fields
    - _Requirements: 1.4, 2.1, 2.3_




  - [ ] 1.3 Register routes in server.js
    - Import and use guardianAttendanceRoutes
    - _Requirements: 1.2_



- [ ] 2. Add attendance tab to Guardian Profile navigation
  - [ ] 2.1 Update navItems array in GuardianProfile.jsx
    - Add attendance tab with calendar icon

    - Position between Marks and Messages tabs
    - _Requirements: 1.1_

- [x] 3. Implement attendance state management

  - [x] 3.1 Add state variables for attendance feature

    - Add attendanceTables, selectedTable, wardAttendance states
    - Add attendanceLoading, attendanceError states
    - Add selectedAttendanceWard state
    - _Requirements: 1.1, 3.2, 3.3_

- [x] 4. Implement attendance data fetching functions

  - [ ] 4.1 Create fetchAttendanceTables function
    - Fetch available attendance periods for ward's class
    - Handle loading and error states
    - _Requirements: 1.2, 1.3, 3.3_
  - [ ] 4.2 Create fetchWardAttendance function
    - Fetch attendance data for selected ward and period

    - Use ward's school_id to filter results

    - Handle loading and error states
    - _Requirements: 1.4, 3.2, 3.3_

- [ ] 5. Implement helper functions
  - [ ] 5.1 Create getAttendanceIndicator function
    - Map 'P' to 'P' (Present), 'A' to 'A' (Absent), 'L' to 'L' (Late)

    - Return '-' for null/undefined/empty values
    - _Requirements: 2.2_
  - [x]* 5.2 Write property test for getAttendanceIndicator

    - **Property 2: Attendance indicator mapping**
    - **Validates: Requirements 2.2**
  - [ ] 5.3 Create calculateAttendanceSummary function
    - Count present, absent, late days from attendance record
    - Return summary object with counts
    - _Requirements: 2.4_
  - [x]* 5.4 Write property test for calculateAttendanceSummary

    - **Property 3: Attendance summary calculation correctness**
    - **Validates: Requirements 2.4**

- [x] 6. Implement renderAttendanceTab function

  - [x] 6.1 Create ward selector UI (conditional for multiple wards)

    - Display ward selector buttons when wards.length > 1
    - Highlight selected ward
    - _Requirements: 1.1_
  - [ ]* 6.2 Write property test for ward selector rendering
    - **Property 1: Ward selector conditional rendering**

    - **Validates: Requirements 1.1**

  - [ ] 6.3 Create period selector dropdown
    - Display available attendance periods

    - Handle period selection
    - _Requirements: 1.3_


  - [ ] 6.4 Create attendance display cards
    - Show week start date


    - Display 7-day grid with status indicators
    - Show summary statistics
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 6.5 Write property test for all days displayed
    - **Property 4: All days displayed**
    - **Validates: Requirements 2.1**
  - [ ] 6.6 Implement empty state, loading, and error UI
    - Show skeleton loader during loading
    - Display empty state message when no records
    - Show error message with retry button on failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 7. Add CSS styles for attendance tab
  - [ ] 7.1 Add attendance-specific styles to GuardianProfile.module.css
    - Style ward selector, period dropdown
    - Style attendance cards with day grid
    - Style summary statistics display
    - Style status indicators (P/A/L/-)
    - _Requirements: 2.2_

- [ ] 8. Wire up useEffect hooks
  - [ ] 8.1 Add effect to fetch attendance tables when tab is active
    - Trigger fetch when activeTab === 'attendance' and ward selected
    - _Requirements: 1.2_
  - [ ] 8.2 Add effect to fetch attendance when period is selected
    - Trigger fetch when selectedTable changes
    - _Requirements: 1.4_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
