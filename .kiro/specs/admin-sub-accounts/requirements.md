# Requirements Document

## Introduction

This document specifies the requirements for an Admin Sub-Accounts system that enables the primary administrator to create delegated accounts for employees. These sub-accounts can be granted selective access to specific admin page methods/features, allowing fine-grained permission control. The system supports creating multiple sub-accounts, each with customizable permission sets.

## Glossary

- **Admin Sub-Account**: A user account created by the primary administrator with delegated permissions to access specific admin features
- **Primary Administrator**: The main admin user who has full access to all system features and can create/manage sub-accounts
- **Permission**: A specific admin feature or method that can be granted to or revoked from a sub-account
- **Permission Set**: A collection of permissions assigned to a sub-account
- **Admin Method**: A specific functionality or page within the admin panel (e.g., "Register Student", "View Staff List", "Create Attendance")

## Requirements

### Requirement 1

**User Story:** As a primary administrator, I want to create sub-accounts for employees, so that I can delegate specific admin responsibilities without giving full admin access.

#### Acceptance Criteria

1. WHEN the administrator navigates to the sub-accounts page THEN the System SHALL display a form to create a new sub-account with fields for employee name, email, username, and password
2. WHEN the administrator submits valid sub-account details THEN the System SHALL create the sub-account and store it in the database
3. WHEN the administrator attempts to create a sub-account with an existing username or email THEN the System SHALL reject the creation and display a duplicate error message
4. WHEN a sub-account is created THEN the System SHALL generate a unique identifier for the account

### Requirement 2

**User Story:** As a primary administrator, I want to assign specific permissions to each sub-account, so that employees can only access the features they need for their role.

#### Acceptance Criteria

1. WHEN creating or editing a sub-account THEN the System SHALL display a list of all available admin methods as selectable checkboxes
2. WHEN the administrator selects permissions and saves THEN the System SHALL store the permission set for that sub-account
3. WHEN the administrator modifies permissions for an existing sub-account THEN the System SHALL update the stored permission set
4. WHEN displaying available permissions THEN the System SHALL group permissions by category (Registration, Lists, Academic, Administration)

### Requirement 3

**User Story:** As a primary administrator, I want to view and manage all sub-accounts, so that I can monitor and control delegated access.

#### Acceptance Criteria

1. WHEN the administrator opens the sub-accounts page THEN the System SHALL display a list of all existing sub-accounts with their names, emails, and status
2. WHEN the administrator clicks edit on a sub-account THEN the System SHALL display the account details and current permissions for modification
3. WHEN the administrator clicks delete on a sub-account THEN the System SHALL prompt for confirmation before removing the account
4. WHEN the administrator toggles a sub-account status THEN the System SHALL enable or disable the account access

### Requirement 4

**User Story:** As a sub-account user, I want to log in and access only my permitted features, so that I can perform my delegated tasks.

#### Acceptance Criteria

1. WHEN a sub-account user logs in with valid credentials THEN the System SHALL authenticate the user and create a session
2. WHEN a sub-account user accesses the admin panel THEN the System SHALL display only the navigation items for permitted features
3. WHEN a sub-account user attempts to access a non-permitted route directly THEN the System SHALL redirect to an unauthorized page
4. WHEN a sub-account is disabled THEN the System SHALL reject login attempts with an account disabled message

### Requirement 5

**User Story:** As a primary administrator, I want to create multiple sub-accounts with different permission sets, so that I can delegate various responsibilities to different employees.

#### Acceptance Criteria

1. WHEN the administrator creates multiple sub-accounts THEN the System SHALL store each account independently with its own permission set
2. WHEN viewing the sub-accounts list THEN the System SHALL display the count of assigned permissions for each account
3. WHEN the administrator searches or filters sub-accounts THEN the System SHALL return matching accounts based on name, email, or permission category

### Requirement 6

**User Story:** As a system administrator, I want sub-account data to be persisted reliably, so that permission configurations are maintained across sessions.

#### Acceptance Criteria

1. WHEN a sub-account is created or modified THEN the System SHALL persist the data to the database immediately
2. WHEN the system restarts THEN the System SHALL restore all sub-account data and permissions from the database
3. WHEN serializing sub-account data for storage THEN the System SHALL encode it using JSON format
4. WHEN retrieving sub-account data THEN the System SHALL parse the stored JSON and reconstruct the permission objects
