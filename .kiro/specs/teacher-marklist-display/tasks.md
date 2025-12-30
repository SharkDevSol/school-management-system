# Implementation Plan

- [ ] 1. Set up testing infrastructure
  - [ ] 1.1 Install fast-check for property-based testing
    - Add fast-check to devDependencies in APP/package.json
    - Verify installation with npm install
    - _Requirements: Testing Strategy_

- [ ] 2. Create utility functions for assignment filtering and calculations
  - [ ] 2.1 Create helper functions for filtering and calculations
    - Create `APP/src/Staff/MRLIST/marklistUtils.js`
    - Implement `filterSubjectsForTeacher(assignments)` - extracts unique subjects
    - Implement `filterClassesForSubject(assignments, subject)` - filters classes for selected subject
    - Implement `filterTermsForClass(assignments, subject, className)` - filters available terms
    - Implement `calculateTotal(marks, components)` - calculates weighted total
    - Implement `determinePassStatus(total, threshold)` - returns Pass/Fail
    - Implement `calculateProgress(students, components)` - calculates completion percentage
    - _Requirements: 2.1, 2.2, 2.3, 4.2, 4.3, 5.1_

  - [ ]* 2.2 Write property test for assignment filtering
    - **Property 1: Assignment Filtering**
    - **Validates: Requirements 1.1, 2.1**

  - [ ]* 2.3 Write property test for cascading class filter
    - **Property 3: Cascading Class Filter**
    - **Validates: Requirements 2.2**

  - [ ]* 2.4 Write property test for cascading term filter
    - **Property 4: Cascading Term Filter**
    - **Validates: Requirements 2.3**

  - [ ]* 2.5 Write property test for total calculation
    - **Property 8: Total Calculation**
    - **Validates: Requirements 4.2**

  - [ ]* 2.6 Write property test for pass/fail status
    - **Property 9: Pass/Fail Status Determination**
    - **Validates: Requirements 4.3**

  - [ ]* 2.7 Write property test for progress calculation
    - **Property 10: Progress Calculation**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Refactor MRLIST component to fetch teacher assignments
  - [ ] 4.1 Update MRLIST to fetch assignments from API
    - Import useApp context to get logged-in teacher name
    - Add useEffect to fetch assignments on component mount
    - Call `/api/mark-list/teacher-mark-lists/:teacherName` endpoint
    - Store assignments in state
    - Handle loading and error states
    - _Requirements: 1.1, 1.2_

  - [ ] 4.2 Implement dynamic filter dropdowns
    - Replace static filter options with dynamic data from assignments
    - Subject dropdown: populated from unique subjects in assignments
    - Class dropdown: filtered based on selected subject
    - Term dropdown: filtered based on selected subject and class
    - Enable/disable load button based on filter selections
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 5. Implement mark list loading and display
  - [ ] 5.1 Load mark list data when filters are selected
    - Call `/api/mark-list/mark-list/:subject/:class/:term` endpoint
    - Parse and store mark list data and form configuration
    - Display students with their current marks
    - Show column headers with component names and percentages
    - _Requirements: 1.4, 3.1, 4.1_

  - [ ] 5.2 Implement mark entry and validation
    - Create input fields for each mark component
    - Validate input values against component percentage (0 to max)
    - Show validation errors for out-of-range values
    - Calculate and display running total as marks are entered
    - _Requirements: 3.2, 4.2_

  - [ ]* 5.3 Write property test for mark validation range
    - **Property 6: Mark Validation Range**
    - **Validates: Requirements 3.2**

- [ ] 6. Implement mark saving functionality
  - [ ] 6.1 Add save functionality for individual students
    - Call `/api/mark-list/update-marks` endpoint on save
    - Update local state with returned total and pass status
    - Display success/error messages
    - Handle save failures gracefully
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write property test for mark save round-trip
    - **Property 7: Mark Save Round-Trip**
    - **Validates: Requirements 3.3**

- [ ] 7. Implement progress tracking
  - [ ] 7.1 Add progress indicator to UI
    - Calculate completion percentage based on students with all marks entered
    - Display progress bar with percentage
    - Visually indicate completed student rows
    - Show 100% completion state when all students have marks
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8. Implement empty state and error handling
  - [ ] 8.1 Add empty state UI
    - Display informative message when teacher has no assignments
    - Show appropriate icon and guidance text
    - _Requirements: 1.2_

  - [ ] 8.2 Add error handling UI
    - Display error messages for API failures
    - Add retry functionality for failed requests
    - Retain entered data on save failures
    - _Requirements: 3.5, Error Handling_

- [ ] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
