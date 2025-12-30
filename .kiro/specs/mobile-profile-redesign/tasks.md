# Implementation Plan

- [x] 1. Set up shared mobile UI components

  - [x] 1.1 Create MobileProfileLayout component with app header and pull-to-refresh


    - Create `APP/src/COMPONENTS/mobile/MobileProfileLayout.jsx` and CSS module
    - Implement sticky app header with title and logout button
    - Add pull-to-refresh gesture handling


    - _Requirements: 1.1, 5.4, 6.1_
  - [ ] 1.2 Create BottomNavigation component
    - Create `APP/src/COMPONENTS/mobile/BottomNavigation.jsx` and CSS module
    - Implement fixed bottom navigation bar with icon support
    - Add active state highlighting
    - _Requirements: 2.1, 2.3, 2.4_


  - [ ]* 1.3 Write property test for navigation state consistency
    - **Property 4: Navigation state consistency**
    - **Validates: Requirements 2.2, 2.3**
  - [ ] 1.4 Create ProfileHeader component
    - Create `APP/src/COMPONENTS/mobile/ProfileHeader.jsx` and CSS module
    - Implement avatar with fallback initial


    - Add gradient background styling
    - _Requirements: 1.3, 3.1, 4.1_
  - [x]* 1.5 Write property test for header displays user identity


    - **Property 3: Header displays user identity**
    - **Validates: Requirements 1.3, 3.1, 4.1**
  - [ ] 1.6 Create CollapsibleCard component
    - Create `APP/src/COMPONENTS/mobile/CollapsibleCard.jsx` and CSS module
    - Implement expand/collapse with smooth CSS transitions
    - Add chevron icon rotation animation


    - _Requirements: 1.4, 1.5_
  - [ ] 1.7 Create SkeletonLoader component
    - Create `APP/src/COMPONENTS/mobile/SkeletonLoader.jsx` and CSS module
    - Implement avatar, text, card, and list skeleton variants
    - Add shimmer animation
    - _Requirements: 1.2_


  - [ ]* 1.8 Write property test for loading state displays skeleton
    - **Property 2: Loading state displays skeleton**
    - **Validates: Requirements 1.2**
  - [ ] 1.9 Create Toast notification component
    - Create `APP/src/COMPONENTS/mobile/Toast.jsx` and CSS module
    - Implement success, error, and info variants
    - Add auto-dismiss with configurable duration
    - _Requirements: 5.5_
  - [ ]* 1.10 Write property test for toast notification on action result
    - **Property 7: Toast notification on action result**
    - **Validates: Requirements 5.5**
  - [x] 1.11 Create PostCard component for mobile

    - Create `APP/src/COMPONENTS/mobile/PostCard.jsx` and CSS module


    - Implement card layout with title, body, media gallery
    - Add like button with count and animation
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 1.12 Write property test for post media rendering
    - **Property 9: Post media rendering**
    - **Validates: Requirements 7.2, 7.4**
  - [x]* 1.13 Write property test for like count updates

    - **Property 10: Like count updates on interaction**
    - **Validates: Requirements 7.3**


- [ ] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Redesign StudentProfile with mobile-first layout
  - [ ] 3.1 Refactor StudentProfile to use MobileProfileLayout
    - Replace current container with MobileProfileLayout

    - Implement bottom navigation with Profile, Posts, Attendance, Grades tabs
    - Add tab content switching logic


    - _Requirements: 1.1, 2.1, 2.2_
  - [x] 3.2 Implement Profile tab with collapsible sections

    - Add Core Information collapsible card
    - Add Guardian Information collapsible card
    - Add Additional Information collapsible card (dynamic fields)
    - _Requirements: 1.3, 1.4, 1.5_
  - [ ] 3.3 Implement Posts tab with PostCard components
    - Replace current posts rendering with PostCard components
    - Implement like functionality with toast feedback

    - _Requirements: 7.1, 7.2, 7.3_
  - [ ] 3.4 Add skeleton loading states to StudentProfile
    - Show skeleton during initial data fetch

    - Show skeleton during refresh
    - _Requirements: 1.2_
  - [ ]* 3.5 Write property test for full-screen mobile layout
    - **Property 1: Full-screen mobile layout**

    - **Validates: Requirements 1.1, 6.1**

- [x] 4. Redesign GuardianProfile with mobile-first layout


  - [ ] 4.1 Refactor GuardianProfile to use MobileProfileLayout
    - Replace current container with MobileProfileLayout

    - Implement bottom navigation with Profile, Wards, Posts, Communications tabs
    - _Requirements: 3.1, 2.1_
  - [x] 4.2 Create WardCarousel component for horizontal ward display

    - Create `APP/src/COMPONENTS/mobile/WardCarousel.jsx` and CSS module
    - Implement horizontal scrolling with snap points
    - Add ward card with avatar, name, class info
    - _Requirements: 3.2_
  - [ ]* 4.3 Write property test for ward carousel renders all wards
    - **Property 5: Ward carousel renders all wards**



    - **Validates: Requirements 3.2**
  - [ ] 4.4 Implement ward detail expansion
    - Add tap-to-expand functionality on ward cards
    - Show attendance summary, grades, posts for selected ward


    - _Requirements: 3.3, 3.4_
  - [ ] 4.5 Integrate Communications tab with existing GuardianCommunications
    - Wire up existing GuardianCommunications component to tab
    - _Requirements: 3.1_


- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Redesign StaffProfile with mobile-first layout
  - [ ] 6.1 Refactor StaffProfile to use MobileProfileLayout
    - Replace current container with MobileProfileLayout
    - Implement bottom navigation with Profile, Evaluations, Posts, Communications tabs
    - _Requirements: 4.1, 2.1_
  - [ ] 6.2 Implement Profile tab with collapsible sections
    - Add Profile Information collapsible card
    - Add Account Information collapsible card
    - _Requirements: 4.1_
  - [ ] 6.3 Redesign Evaluations tab with mobile-optimized cards
    - Create evaluation cards with status badges
    - Add quick action buttons (Form, View)
    - _Requirements: 4.2, 4.3_
  - [ ]* 6.4 Write property test for evaluation cards display required elements
    - **Property 6: Evaluation cards display required elements**
    - **Validates: Requirements 4.2**
  - [ ] 6.5 Integrate Communications tab with existing TeacherCommunications
    - Wire up existing TeacherCommunications component to tab
    - _Requirements: 4.4_

- [ ] 7. Implement responsive behavior and polish
  - [ ] 7.1 Add responsive breakpoint handling
    - Implement media queries for 768px breakpoint
    - Enhance desktop layout to use available space
    - _Requirements: 6.1, 6.2_
  - [ ]* 7.2 Write property test for responsive layout adaptation
    - **Property 8: Responsive layout adaptation**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  - [ ] 7.3 Add consistent color scheme and styling
    - Apply primary color (#e67e22) consistently
    - Ensure proper contrast ratios
    - Add button/card interaction animations
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
