# Implementation Plan

- [ ] 1. Add notification state to AppContext
  - [ ] 1.1 Add notification state variables to AppContext
    - Add `notificationCount`, `hasNewNotification`, and `lastUpdated` state
    - Add `fetchNotificationCount` function to fetch pending requests from API
    - Add `clearNewNotificationFlag` function to reset animation flag
    - _Requirements: 1.1, 3.1_
  - [ ] 1.2 Add Socket.IO connection for real-time updates in AppContext
    - Connect to socket server on mount
    - Listen for 'new_request' and 'new_response' events
    - Update notification count when events are received
    - Set `hasNewNotification` flag to trigger animation
    - _Requirements: 1.2, 1.4_
  - [ ]* 1.3 Write property test for notification count accuracy
    - **Property 1: Notification Count Accuracy**
    - **Validates: Requirements 1.1, 3.1**

- [ ] 2. Update Home.jsx header notification button
  - [ ] 2.1 Connect notification button to AppContext
    - Import notification state from useApp hook
    - Display dynamic `notificationCount` in badge
    - Hide badge when count is 0
    - _Requirements: 1.1, 1.3_
  - [ ] 2.2 Add navigation to Communication page on click
    - Add onClick handler to navigate to '/communication'
    - Close mobile menu if open before navigating
    - _Requirements: 2.1, 2.2_
  - [ ] 2.3 Add animation class for new notifications
    - Apply pulse animation class when `hasNewNotification` is true
    - Clear flag after animation completes (use setTimeout or onAnimationEnd)
    - _Requirements: 4.1, 4.2_
  - [ ]* 2.4 Write property test for navigation on click
    - **Property 3: Navigation on Click**
    - **Validates: Requirements 2.1, 2.2**

- [ ] 3. Add CSS styles for notification badge animation
  - [ ] 3.1 Add pulse animation to Home.module.css
    - Create @keyframes pulse animation
    - Add .pulse class that applies the animation
    - Style badge to be visible and properly positioned
    - _Requirements: 4.1, 4.2_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Add translation keys for notifications
  - [ ] 5.1 Add notification-related translation keys to AppContext
    - Add keys: notifications, newRequests, pendingRequests, noNotifications
    - Add translations for all supported languages (en, om, am, so, ar, fr)
    - _Requirements: 1.1_

- [ ] 6. Handle edge cases and error states
  - [ ] 6.1 Handle API fetch errors gracefully
    - Show last known count if API fails
    - Retry fetch on next navigation
    - _Requirements: 3.1, 3.2_
  - [ ] 6.2 Handle socket reconnection
    - Refresh notification count on socket reconnect
    - _Requirements: 3.2_
  - [ ]* 6.3 Write property test for real-time count updates
    - **Property 2: Real-time Count Updates**
    - **Validates: Requirements 1.2, 1.4**

- [ ] 7. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
