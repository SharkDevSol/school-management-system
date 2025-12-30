# Implementation Plan

- [x] 1. Create shared file utility functions

  - [x] 1.1 Create fileUtils.js with file type detection and icon mapping functions
    - Implement `getFileType(filename)` to detect file type from extension
    - Implement `getFileIcon(type)` to return appropriate React icon component
    - Implement `isFileField(fieldName)` to detect custom field file uploads
    - Implement `getFileUrl(filename)` to construct full URL for file access
    - _Requirements: 2.1, 2.2_

  - [ ]* 1.2 Write property test for file type detection
    - **Property 2: File type icon mapping consistency**
    - **Validates: Requirements 2.2**

- [x] 2. Implement enhanced ListStaff component

  - [x] 2.1 Fix and complete the ListStaff.jsx component structure
    - Complete the truncated getFileType function
    - Add all missing render logic for grid and table views
    - Implement proper file field detection and display
    - _Requirements: 1.1, 2.1, 2.2_

  - [x] 2.2 Implement file chips display in staff cards
    - Show file chips for custom field uploads
    - Display appropriate icons based on file type
    - Show "+N" badge when more than 3 files exist
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.3 Write property test for file chip display threshold
    - **Property 3: File chip display threshold**
    - **Validates: Requirements 2.3**

  - [x] 2.4 Implement staff detail modal with documents section
    - Display all non-file fields in info grid
    - Show documents grid with preview thumbnails
    - Add download buttons for each document
    - _Requirements: 5.1, 5.2, 5.3, 4.3_

  - [x] 2.5 Implement file preview modal for staff
    - Support image preview with scaling
    - Support PDF preview with iframe embedding
    - Show fallback for unsupported file types
    - Add close and download buttons
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1_

  - [ ]* 2.6 Write property test for preview modal content type
    - **Property 5: Preview modal content type matching**
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 3. Implement enhanced ListStudent component

  - [x] 3.1 Update ListStudent.jsx with improved file display
    - Ensure file chips show for all custom field uploads
    - Verify icon mapping works correctly
    - Implement "+N" badge for excess files
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Enhance student detail modal documents section
    - Display document cards with preview thumbnails
    - Support image and PDF previews
    - Add individual download buttons
    - _Requirements: 5.2, 5.3, 4.3_

  - [x] 3.3 Verify file preview modal functionality
    - Test image preview rendering
    - Test PDF iframe embedding
    - Test fallback for other file types
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 4. Implement search and filter functionality

  - [x] 4.1 Implement search filtering logic
    - Filter by name, email, phone for staff
    - Filter by name, guardian name, guardian phone for students
    - Ensure case-insensitive matching
    - _Requirements: 6.1_

  - [ ]* 4.2 Write property test for search filtering
    - **Property 7: Search filtering correctness**
    - **Validates: Requirements 6.1**

  - [x] 4.3 Implement filter dropdown functionality
    - Staff: filter by role and staff type
    - Students: filter by gender and class
    - Update results on filter change
    - _Requirements: 6.2_

  - [ ]* 4.4 Write property test for filter application
    - **Property 8: Filter application correctness**
    - **Validates: Requirements 6.2**

  - [x] 4.5 Implement statistics count updates
    - Update header stats when filters change
    - Show filtered count vs total count
    - _Requirements: 6.3_

  - [ ]* 4.6 Write property test for statistics accuracy
    - **Property 9: Statistics count accuracy**
    - **Validates: Requirements 6.3**

- [x] 5. Implement view mode toggle with state preservation

  - [x] 5.1 Add view mode toggle functionality
    - Implement grid/list view switching
    - Preserve search term when switching
    - Preserve filter selections when switching
    - _Requirements: 1.3, 1.4_

  - [ ]* 5.2 Write property test for view mode state preservation
    - **Property 1: View mode toggle preserves filter state**
    - **Validates: Requirements 1.4**

- [x] 6. Update CSS styles for modern design

  - [x] 6.1 Update ListStaff.module.css
    - Ensure gradient header styling
    - Style file chips with appropriate colors
    - Style document cards and preview modal
    - Add responsive breakpoints
    - _Requirements: 1.1, 7.1, 7.2, 7.3_

  - [x] 6.2 Update ListStudent.module.css
    - Ensure consistent styling with staff page
    - Style class tabs and filters
    - Style document preview components
    - Add responsive breakpoints
    - _Requirements: 1.2, 7.1, 7.2, 7.3_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Final integration and testing

  - [x] 8.1 Test file upload display from custom fields
    - Verify PDF files display correctly
    - Verify image files display correctly
    - Verify other document types show fallback
    - _Requirements: 2.1, 3.2, 3.3, 3.4_

  - [x] 8.2 Test download functionality
    - Verify download buttons work
    - Verify correct filenames are used
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 8.3 Write property tests for empty files section
    - **Property 4: Empty files section hiding**
    - **Validates: Requirements 2.4**

  - [ ]* 8.4 Write property test for detail modal field display
    - **Property 6: Detail modal displays all non-file fields**
    - **Validates: Requirements 5.2**

- [x] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

