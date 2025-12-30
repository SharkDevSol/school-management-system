# Implementation Plan

- [x] 1. Enhance CSS Variable System in index.css




  - [ ] 1.1 Add gradient and computed CSS variables to :root
    - Add `--primary-gradient` for consistent gradient usage
    - Add `--primary-light` for light backgrounds with theme color


    - Add `--primary-shadow` for box shadows with theme color
    - _Requirements: 2.3, 2.4_




  - [ ] 1.2 Verify dark mode CSS variables are complete
    - Ensure all light mode variables have dark mode counterparts

    - Add any missing dark mode variable overrides
    - _Requirements: 4.2, 4.3, 4.4_

- [ ] 2. Enhance AppContext Theme Application
  - [ ] 2.1 Add hexToRgb utility function
    - Create function to convert hex colors to RGB values




    - Handle both 3-digit and 6-digit hex formats
    - _Requirements: 2.1_
  - [ ] 2.2 Update applyTheme function to set computed variables
    - Set `--primary-light` and `--primary-shadow` based on primary color
    - Ensure gradient variables work with dynamic colors
    - _Requirements: 2.1, 1.4_


  - [x]* 2.3 Write property test for theme color propagation




    - **Property 1: Theme Color Propagation**
    - **Validates: Requirements 2.1, 1.4**





- [ ] 3. Fix Registration Page Buttons and Styling
  - [x] 3.1 Update CreateRegisterStaff.module.css to use CSS variables



    - Replace all hardcoded #667eea with var(--primary-color)
    - Replace all hardcoded #764ba2 with var(--secondary-color)




    - Replace hardcoded gradients with var(--primary-gradient)
    - Update background colors to use var(--bg-color), var(--bg-secondary)




    - Update text colors to use var(--text-color), var(--text-secondary)

    - Update card backgrounds to use var(--card-bg)

    - _Requirements: 1.1, 1.4, 2.3, 4.2, 4.3, 4.4_
  - [ ] 3.2 Update CreateRegisterStudent.module.css to use CSS variables
    - Apply same CSS variable replacements as staff registration
    - _Requirements: 1.1, 1.4, 2.3, 4.2, 4.3, 4.4_



- [ ] 4. Update Task Page Styling
  - [ ] 4.1 Update TaskPage.module.css to use CSS variables
    - Replace hardcoded theme colors with CSS variables
    - Update backgrounds, text colors, and shadows for dark mode support
    - _Requirements: 2.3, 4.2, 4.3, 4.4_

- [ ] 5. Update Evaluation Page Styling
  - [ ] 5.1 Update Evaluation.module.css to use CSS variables
    - Replace hardcoded theme colors with CSS variables
    - Ensure dark mode compatibility
    - _Requirements: 2.3, 4.2, 4.3, 4.4_

- [ ] 6. Update Mark List Page Styling
  - [ ] 6.1 Update MarkListFrontend.css to use CSS variables
    - Replace hardcoded theme colors with CSS variables
    - Ensure dark mode compatibility
    - _Requirements: 2.3, 4.2, 4.3, 4.4_

- [ ] 7. Update Settings Page for Dark Mode
  - [ ] 7.1 Update Setting.module.css to use CSS variables
    - Ensure settings page itself respects dark mode
    - _Requirements: 4.2, 4.3, 4.4_

- [ ] 8. Add Missing Translations to Components
  - [ ] 8.1 Add translation keys for registration pages
    - Add translation keys for staff registration labels and buttons
    - Add translation keys for student registration labels and buttons
    - Update components to use t() function for all text
    - _Requirements: 3.1, 3.2, 3.4_
  - [ ] 8.2 Add translation keys for task page
    - Add translation keys for task dashboard text
    - Update TaskPage.jsx to use t() function
    - _Requirements: 3.1, 3.2, 3.4_
  - [ ]* 8.3 Write property test for translation fallback
    - **Property 3: Translation Function Consistency**
    - **Validates: Requirements 3.2, 3.5**

- [ ] 9. Checkpoint - Make sure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 10. Write property tests for dark mode
  - [ ]* 10.1 Write property test for dark mode class application
    - **Property 4: Dark Mode Class Application**
    - **Validates: Requirements 4.1**
  - [ ]* 10.2 Write property test for CSS variable values in dark mode
    - **Property 5: Dark Mode CSS Variable Values**
    - **Validates: Requirements 4.2, 4.3, 4.4**

- [ ] 11. Final Checkpoint - Make sure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

