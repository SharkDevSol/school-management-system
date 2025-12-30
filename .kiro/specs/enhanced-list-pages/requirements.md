# Requirements Document

## Introduction

This feature enhances the Staff and Student list pages with an improved, modern design and robust file/document display capabilities. The system will provide a visually appealing interface for viewing staff and student records, with special emphasis on displaying uploaded files from custom fields including PDFs, images, and other document types. Users will be able to preview, download, and interact with these documents directly from the list views.

## Glossary

- **List Page**: A page displaying a collection of staff or student records in either grid or table view
- **Custom Field**: A user-defined field in the registration form that can include various types including file uploads
- **File Preview**: An in-app modal that displays the content of uploaded files (images, PDFs)
- **Document Card**: A visual component showing file information with preview thumbnail and actions
- **File Chip**: A compact clickable element representing an uploaded file in card/table views

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to view staff and student lists in an attractive, modern interface, so that I can efficiently browse and manage records.

#### Acceptance Criteria

1. WHEN a user navigates to the staff list page THEN the System SHALL display a header with gradient styling, statistics, and navigation controls
2. WHEN a user navigates to the student list page THEN the System SHALL display class tabs, search functionality, and filter options
3. WHEN viewing records THEN the System SHALL provide both grid view (cards) and list view (table) display modes
4. WHEN switching between view modes THEN the System SHALL preserve the current search and filter state
5. WHEN the page loads THEN the System SHALL show a loading indicator until data is fetched

### Requirement 2

**User Story:** As an administrator, I want to see uploaded files from custom fields displayed in the list, so that I can quickly identify which records have associated documents.

#### Acceptance Criteria

1. WHEN a record has uploaded files from custom fields THEN the System SHALL display file indicators (chips) showing the document type
2. WHEN displaying file chips THEN the System SHALL show appropriate icons based on file type (PDF, image, Word, etc.)
3. WHEN a record has more than 3 files THEN the System SHALL show a count badge indicating additional files
4. WHEN no files are uploaded THEN the System SHALL not display the files section in the card

### Requirement 3

**User Story:** As an administrator, I want to preview uploaded documents directly in the application, so that I can view file contents without downloading.

#### Acceptance Criteria

1. WHEN a user clicks on a file chip or document card THEN the System SHALL open a preview modal
2. WHEN previewing an image file THEN the System SHALL display the image scaled to fit the modal
3. WHEN previewing a PDF file THEN the System SHALL embed the PDF in an iframe for viewing
4. WHEN previewing an unsupported file type THEN the System SHALL display a fallback message with download option
5. WHEN the preview modal is open THEN the System SHALL provide a close button and download button

### Requirement 4

**User Story:** As an administrator, I want to download uploaded documents, so that I can save files locally for offline access.

#### Acceptance Criteria

1. WHEN viewing a file preview THEN the System SHALL provide a download button
2. WHEN a user clicks download THEN the System SHALL initiate a file download with the original filename
3. WHEN viewing document cards in the detail modal THEN the System SHALL provide individual download buttons for each file

### Requirement 5

**User Story:** As an administrator, I want to view detailed information about a staff member or student including all their documents, so that I can see complete record information.

#### Acceptance Criteria

1. WHEN a user clicks on a record card or row THEN the System SHALL open a detail modal
2. WHEN the detail modal opens THEN the System SHALL display the profile image, basic information, and all custom field data
3. WHEN the record has uploaded files THEN the System SHALL display a documents section with preview thumbnails
4. WHEN clicking a document thumbnail THEN the System SHALL open the file preview modal

### Requirement 6

**User Story:** As an administrator, I want to search and filter records, so that I can quickly find specific staff members or students.

#### Acceptance Criteria

1. WHEN a user types in the search box THEN the System SHALL filter records by name, email, phone, or guardian information
2. WHEN a user selects a filter option THEN the System SHALL update the displayed records accordingly
3. WHEN filters are applied THEN the System SHALL update the record count in the header statistics
4. WHEN clearing search or filters THEN the System SHALL restore the full record list

### Requirement 7

**User Story:** As an administrator, I want the list pages to be responsive, so that I can use them on different screen sizes.

#### Acceptance Criteria

1. WHEN viewing on mobile devices THEN the System SHALL stack layout elements vertically
2. WHEN viewing on tablet devices THEN the System SHALL adjust grid columns appropriately
3. WHEN viewing on desktop THEN the System SHALL display the full multi-column layout

