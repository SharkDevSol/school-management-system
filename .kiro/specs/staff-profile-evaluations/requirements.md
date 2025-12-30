# Requirements Document

## Introduction

This feature enhances the Staff Profile page by allowing staff members to view and complete their assigned evaluations directly within the profile interface. Currently, staff must navigate to a separate Evaluation page to fill out evaluation forms. This feature embeds the evaluation form functionality into the Staff Profile's "Evaluations" tab, providing a seamless, mobile-friendly experience for teachers and staff to manage their evaluation tasks without leaving their profile.

## Glossary

- **Staff Profile**: The mobile-optimized profile page for staff members that displays personal information, schedule, attendance, posts, and communications
- **Evaluation**: A structured assessment form assigned to a staff member for evaluating students in a specific class and subject
- **Evaluation Form**: The interactive interface where staff enter scores and notes for each student against defined criteria
- **Evaluation Criteria**: The specific assessment points within an evaluation, each with a maximum score value
- **Evaluation Area**: A grouping of related evaluation criteria
- **Inline Evaluation**: The embedded evaluation form displayed within the Staff Profile page

## Requirements

### Requirement 1

**User Story:** As a staff member, I want to see my assigned evaluations with their status in my profile, so that I can quickly identify which evaluations need my attention.

#### Acceptance Criteria

1. WHEN a staff member views the Evaluations tab THEN the Staff Profile SHALL display a list of all evaluations assigned to that staff member
2. WHEN displaying evaluations THEN the Staff Profile SHALL show evaluation name, subject, class, term, and status for each evaluation
3. WHEN an evaluation has status "pending" or "in_progress" THEN the Staff Profile SHALL visually distinguish it from completed evaluations

### Requirement 2

**User Story:** As a staff member, I want to open and fill out an evaluation form directly in my profile, so that I can complete my evaluation tasks without navigating away.

#### Acceptance Criteria

1. WHEN a staff member selects an evaluation from the list THEN the Staff Profile SHALL display the evaluation form inline within the Evaluations tab
2. WHEN displaying the inline evaluation form THEN the Staff Profile SHALL show all students in the assigned class with their information
3. WHEN displaying the inline evaluation form THEN the Staff Profile SHALL show all evaluation criteria grouped by evaluation area
4. WHEN a staff member enters a score for a criterion THEN the Staff Profile SHALL accept values from 0 to the criterion's maximum points
5. WHEN a staff member enters notes for a criterion THEN the Staff Profile SHALL accept text input for additional comments

### Requirement 3

**User Story:** As a staff member, I want to save my evaluation progress, so that my work is preserved and submitted correctly.

#### Acceptance Criteria

1. WHEN a staff member clicks the save button THEN the Staff Profile SHALL submit all entered scores and notes to the backend API
2. WHEN the save operation succeeds THEN the Staff Profile SHALL display a success notification to the user
3. IF the save operation fails THEN the Staff Profile SHALL display an error message describing the failure
4. WHEN scores are saved successfully THEN the Staff Profile SHALL update the evaluation status in the list view

### Requirement 4

**User Story:** As a staff member, I want to navigate back from the evaluation form to the evaluation list, so that I can select a different evaluation or review my completed work.

#### Acceptance Criteria

1. WHEN viewing an inline evaluation form THEN the Staff Profile SHALL display a back button to return to the evaluation list
2. WHEN a staff member clicks the back button THEN the Staff Profile SHALL return to the evaluation list view
3. WHEN returning to the list view THEN the Staff Profile SHALL refresh the evaluation list to reflect any status changes

### Requirement 5

**User Story:** As a staff member, I want to see a summary of scores while filling out an evaluation, so that I can track progress and totals.

#### Acceptance Criteria

1. WHEN displaying the inline evaluation form THEN the Staff Profile SHALL calculate and display the total score for each student
2. WHEN a staff member updates any score THEN the Staff Profile SHALL immediately recalculate the student's total score
3. WHEN displaying student scores THEN the Staff Profile SHALL show the score relative to the maximum possible points

