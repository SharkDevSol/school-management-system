# Implementation Plan

- [x] 1. Set up database schema and backend foundation




  - [ ] 1.1 Create admin_sub_accounts table migration
    - Add SQL migration to create the table with all required columns

    - Include indexes on username and email for uniqueness
    - _Requirements: 1.2, 1.4, 6.1_
  - [x] 1.2 Create sub-account routes file and register with server



    - Create `backend/routes/subAccountRoutes.js`
    - Register routes in `server.js`
    - _Requirements: 1.1_

- [ ] 2. Implement sub-account CRUD API endpoints
  - [x] 2.1 Implement GET /api/admin/sub-accounts endpoint

    - Return all sub-accounts with id, name, email, username, isActive, permissions, createdAt
    - Include permission count in response
    - _Requirements: 3.1, 5.2_
  - [ ]* 2.2 Write property test for account list completeness
    - **Property 5: Account List Completeness**
    - **Validates: Requirements 3.1**
  - [ ] 2.3 Implement POST /api/admin/sub-accounts endpoint
    - Validate required fields (name, email, username, password)
    - Hash password with bcrypt
    - Check for duplicate username/email
    - Store permissions as JSON
    - _Requirements: 1.2, 1.3, 1.4, 6.1, 6.3_
  - [ ]* 2.4 Write property test for account creation persistence
    - **Property 1: Account Creation Persistence**

    - **Validates: Requirements 1.2, 6.1**
  - [ ]* 2.5 Write property test for username/email uniqueness
    - **Property 2: Username and Email Uniqueness**
    - **Validates: Requirements 1.3**
  - [ ]* 2.6 Write property test for unique ID generation
    - **Property 3: Unique ID Generation**

    - **Validates: Requirements 1.4, 5.1**
  - [x] 2.7 Implement PUT /api/admin/sub-accounts/:id endpoint

    - Update account details and permissions
    - Optional password update (only if provided)
    - _Requirements: 2.2, 2.3_
  - [ ]* 2.8 Write property test for permission update consistency
    - **Property 4: Permission Update Consistency**
    - **Validates: Requirements 2.2, 2.3**
  - [ ] 2.9 Implement DELETE /api/admin/sub-accounts/:id endpoint
    - Remove sub-account from database




    - _Requirements: 3.3_
  - [ ] 2.10 Implement PATCH /api/admin/sub-accounts/:id/status endpoint
    - Toggle isActive status
    - _Requirements: 3.4_
  - [ ]* 2.11 Write property test for status toggle correctness
    - **Property 6: Status Toggle Correctness**
    - **Validates: Requirements 3.4**

- [x] 3. Checkpoint - Ensure all backend tests pass



  - Ensure all tests pass, ask the user if questions arise.


- [ ] 4. Extend admin authentication for sub-accounts
  - [ ] 4.1 Modify admin login to check sub-accounts table
    - Check admin_users first, then admin_sub_accounts
    - Return user type (admin/sub-account) and permissions in response




    - Block login for disabled sub-accounts
    - _Requirements: 4.1, 4.4_
  - [ ]* 4.2 Write property test for sub-account authentication
    - **Property 7: Sub-Account Authentication**
    - **Validates: Requirements 4.1**
  - [ ]* 4.3 Write property test for disabled account rejection
    - **Property 8: Disabled Account Rejection**
    - **Validates: Requirements 4.4**

- [x] 5. Create permissions configuration module




  - [ ] 5.1 Create shared permissions config file
    - Create `APP/src/config/adminPermissions.js`
    - Define all permissions grouped by category
    - Export permission keys, labels, and paths

    - _Requirements: 2.1, 2.4_
  - [x]* 5.2 Write property test for JSON serialization round-trip



    - **Property 13: JSON Serialization Round-Trip**

    - **Validates: Requirements 6.3, 6.4**


- [ ] 6. Implement permission filtering utilities
  - [ ] 6.1 Create permission filter utility functions
    - Create `APP/src/utils/permissionUtils.js`
    - Implement `filterNavByPermissions(navItems, permissions)`

    - Implement `hasPermission(permissions, requiredPermission)`
    - Implement `getPermissionCount(permissions)`

    - _Requirements: 4.2, 5.2_
  - [ ]* 6.2 Write property test for navigation permission filtering
    - **Property 9: Navigation Permission Filtering**
    - **Validates: Requirements 4.2**
  - [x]* 6.3 Write property test for permission count accuracy

    - **Property 11: Permission Count Accuracy**
    - **Validates: Requirements 5.2**







- [ ] 7. Create PermissionSelector component
  - [x] 7.1 Implement PermissionSelector.jsx component

    - Create `APP/src/COMPONENTS/PermissionSelector.jsx`
    - Display permissions grouped by category

    - Implement select all/none per category
    - Show selected count
    - _Requirements: 2.1, 2.4_
  - [ ] 7.2 Create PermissionSelector.module.css styles
    - Style category headers, checkboxes, and counts

    - _Requirements: 2.1_

- [ ] 8. Create AdminSubAccounts page
  - [ ] 8.1 Implement AdminSubAccounts.jsx main component
    - Create `APP/src/PAGE/AdminSubAccounts/AdminSubAccounts.jsx`
    - Implement accounts list view with table
    - Show name, email, status, permission count, actions
    - _Requirements: 3.1, 5.2_
  - [ ] 8.2 Implement sub-account form modal
    - Create/edit form with name, email, username, password fields
    - Integrate PermissionSelector component
    - Handle form validation
    - _Requirements: 1.1, 2.1_
  - [ ] 8.3 Implement delete confirmation modal
    - Show confirmation before deleting
    - _Requirements: 3.3_
  - [ ] 8.4 Implement search and filter functionality
    - Filter by name, email
    - _Requirements: 5.3_
  - [ ]* 8.5 Write property test for search filter correctness
    - **Property 12: Search Filter Correctness**
    - **Validates: Requirements 5.3**
  - [ ] 8.6 Create AdminSubAccounts.module.css styles
    - Style table, forms, modals, and buttons
    - _Requirements: 3.1_

- [ ] 9. Integrate sub-accounts into navigation and routing
  - [ ] 9.1 Add sub-accounts route to App.jsx
    - Add route for `/admin-sub-accounts`
    - _Requirements: 1.1_
  - [ ] 9.2 Add sub-accounts link to Home.jsx navigation
    - Add to Administration section
    - _Requirements: 1.1_
  - [ ] 9.3 Update Login component to store user type and permissions
    - Store in localStorage: userType, permissions
    - _Requirements: 4.1_
  - [ ] 9.4 Update Home.jsx to filter navigation based on permissions
    - Check userType and filter navItems for sub-accounts
    - _Requirements: 4.2_
  - [ ]* 9.5 Write property test for route access control
    - **Property 10: Route Access Control**
    - **Validates: Requirements 4.3**
  - [ ] 9.6 Update ProtectedRoute to check permissions
    - Block access to non-permitted routes for sub-accounts
    - Redirect to unauthorized page
    - _Requirements: 4.3_

- [ ] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
