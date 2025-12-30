# Implementation Plan

- [x] 1. Add attendance mark calculation utilities to AttendanceView




  - [ ] 1.1 Create calculateAttendanceMark function with weighted formula (P=100, L=50, E=75, A=0)
    - Add function to calculate percentage from student attendance record
    - Return null for students with no recorded attendance
    - _Requirements: 1.2, 3.3_
  - [x]* 1.2 Write property test for mark calculation

    - **Property 1: Attendance Mark Calculation Accuracy**
    - **Validates: Requirements 1.2**
  - [ ] 1.3 Create getMarkColorClass function for color indicators
    - Return 'markGreen' for >= 90%, 'markYellow' for 75-89%, 'markRed' for < 75%
    - Return 'markNA' for null values
    - _Requirements: 1.3, 1.4, 1.5, 1.6_



  - [ ]* 1.4 Write property test for color indicator thresholds
    - **Property 2: Color Indicator Threshold Correctness**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**


- [ ] 2. Enhance AttendanceView UI to display marks
  - [x] 2.1 Add mark column to attendance details table

    - Display calculated percentage for each student
    - Show "N/A" for students without records
    - _Requirements: 1.1, 3.3_
  - [ ] 2.2 Add color-coded visual indicators for marks
    - Apply CSS classes based on getMarkColorClass result
    - Add styles for markGreen, markYellow, markRed, markNA




    - _Requirements: 1.3, 1.4, 1.5, 1.6_


  - [x] 2.3 Add sorting functionality for student list by mark


    - Add sort toggle button/dropdown


    - Implement ascending and descending sort
    - _Requirements: 3.1, 3.2_
  - [ ]* 2.4 Write property test for sorting functionality
    - **Property 3: Sorting Preserves All Students**
    - **Validates: Requirements 3.1, 3.2**

- [ ] 3. Remove StudentAttendance page
  - [ ] 3.1 Remove StudentAttendance route from App.jsx
    - Delete the route definition for student-attendance
    - _Requirements: 2.1, 2.3_
  - [ ] 3.2 Remove StudentAttendance navigation link from Home.jsx
    - Remove the nav item for StudentAttendance from navItems array
    - _Requirements: 2.2_
  - [ ] 3.3 Delete StudentAttendance folder and files
    - Remove APP/src/PAGE/StudentAttendance directory
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
