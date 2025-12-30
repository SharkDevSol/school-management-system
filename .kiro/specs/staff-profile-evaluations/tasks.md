# Implementation Plan

- [x] 1. Add evaluation form state and fetch logic to StaffProfile




  - [x] 1.1 Add new state variables for evaluation form view management


    - Add `evaluationView`, `selectedEvaluationId`, `evaluationFormData`, `formStudents`, `scores`, `formLoading`, `formSaving` state variables
    - _Requirements: 2.1_
  - [ ] 1.2 Implement `fetchEvaluationForm` function to load form data
    - Fetch from `/api/evaluations/{id}/form` endpoint
    - Initialize scores state from existing student scores




    - _Requirements: 2.1, 2.2, 2.3_
  - [x]* 1.3 Write property test for form data initialization

    - **Property 3: Form displays all students and criteria**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 2. Implement score management functions
  - [ ] 2.1 Implement `updateScore` function for score/notes updates
    - Update scores state for specific student and criterion
    - Validate score is within 0 to max_points range
    - _Requirements: 2.4, 2.5_
  - [x] 2.2 Implement `calculateStudentTotal` function




    - Sum all criterion scores for a given student
    - Return total relative to maximum possible points
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 2.3 Write property test for score validation
    - **Property 4: Score input validation**
    - **Validates: Requirements 2.4**
  - [ ]* 2.4 Write property test for score calculation
    - **Property 5: Score calculation correctness**
    - **Validates: Requirements 5.1, 5.2, 5.3**




- [ ] 3. Implement save and navigation functions
  - [x] 3.1 Implement `saveEvaluationScores` function

    - Build payload with all student scores mapped by criterion name
    - POST to `/api/evaluations/{id}/responses` endpoint
    - Show success/error toast notifications
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 3.2 Implement `handleBackToList` navigation function
    - Reset form state and return to list view
    - Refresh evaluation list to reflect status changes

    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 3.3 Write property test for save payload structure
    - **Property 6: Save payload structure**

    - **Validates: Requirements 3.1**

- [ ] 4. Create inline evaluation form UI
  - [ ] 4.1 Create form header with back button and evaluation info
    - Display evaluation name, subject, class, term, staff name
    - Include back button to return to list

    - _Requirements: 4.1, 2.1_

  - [ ] 4.2 Create student list with score inputs
    - Render all students with name, age, gender
    - For each criterion, render score dropdown (0 to max_points) and notes textarea
    - Display calculated total for each student
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 5.1, 5.3_
  - [x] 4.3 Create save button and loading states



    - Show save button with loading indicator when saving
    - Disable button during save operation

    - _Requirements: 3.1_

- [x] 5. Enhance evaluation list view

  - [ ] 5.1 Add "Fill Form" action button to evaluation cards
    - Button triggers `fetchEvaluationForm` and switches to form view


    - _Requirements: 2.1_
  - [ ] 5.2 Add status-based styling to evaluation cards
    - Apply different CSS classes based on evaluation status
    - Visually distinguish pending/in_progress from completed
    - _Requirements: 1.3_
  - [ ]* 5.3 Write property test for status styling
    - **Property 2: Status-based visual distinction**
    - **Validates: Requirements 1.3**

- [ ] 6. Update renderEvaluationsTab to handle both views
  - [ ] 6.1 Implement view switching logic in renderEvaluationsTab
    - Render list view when `evaluationView === 'list'`
    - Render inline form when `evaluationView === 'form'`
    - _Requirements: 2.1, 4.2_
  - [ ]* 6.2 Write property test for evaluation list rendering
    - **Property 1: Evaluation list displays all assigned evaluations with required fields**
    - **Validates: Requirements 1.1, 1.2**

- [ ] 7. Add CSS styles for inline evaluation form
  - [ ] 7.1 Add form container and header styles
    - Mobile-optimized layout matching existing profile styles
    - _Requirements: 2.1_
  - [ ] 7.2 Add student row and score input styles
    - Compact layout for mobile viewing
    - Clear visual hierarchy for criteria and scores
    - _Requirements: 2.2, 2.3, 2.4_
  - [ ] 7.3 Add status badge styles for evaluation cards
    - Different colors for pending, in_progress, completed statuses
    - _Requirements: 1.3_

- [ ] 8. Checkpoint - Make sure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

