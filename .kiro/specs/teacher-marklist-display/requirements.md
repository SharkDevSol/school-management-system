# Requirements Document

## Introduction

This feature enables teachers to view and manage mark list forms only for the subject-class combinations they have been assigned to by administrators. After an administrator creates a mark list and assigns teachers to specific subject-class combinations through the Teacher-Subject Assignment system, those teachers should see only their assigned mark lists in their Staff portal. This ensures proper access control and allows teachers to efficiently enter and manage student marks for their assigned classes.

## Glossary

- **Mark List Form**: A structured form containing student names and mark entry fields for a specific subject, class, and term combination
- **Teacher-Subject Assignment**: The administrative process of assigning teachers to specific subject-class combinations
- **Subject-Class Combination**: A pairing of a subject (e.g., Mathematics) with a class (e.g., Grade 9A)
- **Term**: An academic period (e.g., Term 1, Term 2) for which marks are recorded
- **Mark Components**: The breakdown of marks (e.g., Test 1: 20%, Quiz: 10%, Final: 70%)
- **Staff Portal**: The teacher-facing interface accessed after staff login
- **MRLIST Component**: The mark list management component in the Staff portal

## Requirements

### Requirement 1

**User Story:** As a teacher, I want to see only the mark list forms for subjects and classes I am assigned to, so that I can focus on my teaching responsibilities without confusion.

#### Acceptance Criteria

1. WHEN a teacher accesses the mark list section THEN the System SHALL fetch and display only the subject-class combinations assigned to that teacher
2. WHEN no assignments exist for a teacher THEN the System SHALL display a clear message indicating no mark lists are assigned
3. WHEN assignments exist THEN the System SHALL display each assignment with subject name, class name, and available terms
4. WHEN the teacher selects an assignment THEN the System SHALL load the corresponding mark list form with student data

### Requirement 2

**User Story:** As a teacher, I want to select from my assigned mark lists using intuitive filters, so that I can quickly navigate to the correct class and term.

#### Acceptance Criteria

1. WHEN displaying filter options THEN the System SHALL populate the subject dropdown with only subjects assigned to the teacher
2. WHEN a teacher selects a subject THEN the System SHALL populate the class dropdown with only classes assigned for that subject
3. WHEN a teacher selects a class THEN the System SHALL populate the term dropdown with available terms that have mark list forms
4. WHEN all filters are selected THEN the System SHALL enable the load button to fetch the mark list

### Requirement 3

**User Story:** As a teacher, I want to enter and save marks for my students, so that I can record their academic performance.

#### Acceptance Criteria

1. WHEN a mark list is loaded THEN the System SHALL display all students in the class with their current marks
2. WHEN a teacher enters a mark value THEN the System SHALL validate that the value is within the allowed range for that component
3. WHEN a teacher saves marks for a student THEN the System SHALL persist the marks to the database and update the total
4. WHEN marks are saved successfully THEN the System SHALL display a confirmation message to the teacher
5. IF a save operation fails THEN the System SHALL display an error message and retain the entered data

### Requirement 4

**User Story:** As a teacher, I want to see the mark components and their percentages, so that I understand how the final grade is calculated.

#### Acceptance Criteria

1. WHEN a mark list form is displayed THEN the System SHALL show column headers with component names and their percentage weights
2. WHEN marks are entered THEN the System SHALL calculate and display the total based on component weights
3. WHEN the total is calculated THEN the System SHALL display the pass/fail status based on the configured threshold

### Requirement 5

**User Story:** As a teacher, I want to track my progress in entering marks, so that I know how many students still need marks entered.

#### Acceptance Criteria

1. WHEN a mark list is displayed THEN the System SHALL show a progress indicator of completed entries
2. WHEN a student has all marks entered THEN the System SHALL visually indicate that student's entry is complete
3. WHEN all students have marks entered THEN the System SHALL indicate 100% completion

