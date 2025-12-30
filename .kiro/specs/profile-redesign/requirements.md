# Requirements Document

## Introduction

This feature provides a modern, polished redesign for all three profile pages (Student, Staff, Guardian) in the mobile app. The goal is to create a consistent, visually appealing design with smooth animations, better typography, and improved user experience across all profile types.

## Glossary

- **Profile Page**: Mobile-optimized page displaying user information accessible at `/app/student/:username`, `/app/staff`, and `/app/guardian/:username`
- **Profile Header**: Top section showing user avatar, name, and role/class information
- **Navigation Tab**: Bottom navigation items for switching between profile sections
- **Card Component**: Collapsible container for grouping related information

## Requirements

### Requirement 1

**User Story:** As a user, I want a visually appealing profile header with gradient backgrounds and smooth animations, so that the app feels modern and professional.

#### Acceptance Criteria

1. WHEN a profile page loads THEN the system SHALL display a gradient header with the user's avatar, name, and subtitle
2. WHEN displaying the avatar THEN the system SHALL show a circular image with a subtle shadow and border
3. WHEN no profile image exists THEN the system SHALL display a gradient placeholder with the user's initial

### Requirement 2

**User Story:** As a user, I want consistent card styling across all profile sections, so that information is easy to read and navigate.

#### Acceptance Criteria

1. WHEN displaying profile information THEN the system SHALL use rounded cards with subtle shadows
2. WHEN a card is expanded THEN the system SHALL show a smooth animation transition
3. WHEN displaying field labels and values THEN the system SHALL use clear typography hierarchy

### Requirement 3

**User Story:** As a user, I want a modern bottom navigation with clear active states, so that I can easily switch between sections.

#### Acceptance Criteria

1. WHEN displaying the bottom navigation THEN the system SHALL show icons with labels
2. WHEN a tab is active THEN the system SHALL highlight it with a gradient background and scale effect
3. WHEN switching tabs THEN the system SHALL provide smooth transition animations

### Requirement 4

**User Story:** As a user, I want consistent color schemes across all profile types, so that the app has a cohesive look.

#### Acceptance Criteria

1. WHEN displaying Student profile THEN the system SHALL use a blue-purple gradient theme
2. WHEN displaying Staff profile THEN the system SHALL use an orange-amber gradient theme
3. WHEN displaying Guardian profile THEN the system SHALL use a teal-green gradient theme
