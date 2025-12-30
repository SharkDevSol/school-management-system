# Design Document: UI Enhancements

## Overview

This design document outlines the implementation of modern UI enhancements across multiple pages including registration, evaluation, marklist, task pages, password display in lists, and website name customization in branding settings.

## Architecture

The enhancements follow the existing React component architecture with CSS modules for styling:

```
APP/src/PAGE/
├── CreateRegister/
│   ├── CreateRegisterStudent/  (Enhanced)
│   └── CreateRegisterStaff/    (Enhanced)
├── Evaluation/                  (Enhanced)
├── CreateMarklist/             (Enhanced)
├── Task/                       (New/Enhanced)
├── List/
│   ├── ListStaff/              (Password display)
│   └── ListStudent/            (Password display)
└── Setting/                    (Website name)
```

## Components and Interfaces

### 1. Password Display Component

```typescript
interface PasswordFieldProps {
  label: string;
  value: string;
  onCopy?: () => void;
}

// State for password visibility
const [showPassword, setShowPassword] = useState(false);
```

### 2. Website Name Configuration

```typescript
interface BrandingConfig {
  websiteName: string;
  webIcon: string | null;
}

// Storage key
const BRANDING_STORAGE_KEY = 'brandingConfig';
```

### 3. Modern Card Component Pattern

```typescript
interface ModernCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  gradient?: string;
  children: ReactNode;
  actions?: ReactNode;
}
```

## Data Models

### Branding Configuration

```javascript
const defaultBranding = {
  websiteName: 'School Management System',
  webIcon: null
};

// Stored in localStorage
localStorage.setItem('brandingConfig', JSON.stringify(brandingConfig));
```

### Password Display State

```javascript
const passwordState = {
  studentPassword: { value: '', visible: false },
  guardianPassword: { value: '', visible: false },
  staffPassword: { value: '', visible: false }
};
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Password toggle visibility
*For any* password field with a show/hide toggle, clicking the toggle SHALL change the input type between 'password' and 'text', and the displayed value SHALL remain the same.
**Validates: Requirements 5.1, 5.2**

### Property 2: Password masking when hidden
*For any* password field in hidden state (type='password'), the browser SHALL display masked characters instead of the actual password text.
**Validates: Requirements 5.3**

### Property 3: Website name persistence
*For any* website name entered and saved in branding settings, the value SHALL be retrievable from localStorage with the correct key.
**Validates: Requirements 6.2**

### Property 4: Website name display on load
*For any* saved website name in localStorage, loading the application SHALL display that name in the header/title area.
**Validates: Requirements 6.3**

## Error Handling

### Form Validation
- Display inline error messages below invalid fields
- Highlight invalid fields with red border
- Show summary of errors at form top if submission fails

### File Upload Errors
- Display error message if file type is not supported
- Show error if file size exceeds limit
- Provide retry option for failed uploads

### Storage Errors
- Gracefully handle localStorage quota exceeded
- Fall back to default values if storage read fails

## Testing Strategy

### Unit Testing
- Test password toggle state changes
- Test localStorage read/write for branding
- Test form validation logic

### Property-Based Testing
Using **fast-check** library:
- Property 1: Password toggle visibility
- Property 2: Password masking when hidden
- Property 3: Website name persistence
- Property 4: Website name display on load

## UI Design Specifications

### Color Scheme (Consistent across pages)
- Primary gradient: #667eea → #764ba2 (Purple)
- Success: #22c55e (Green)
- Warning: #f59e0b (Amber)
- Error: #ef4444 (Red)
- Background: #f8fafc → #e2e8f0

### Card Design
- Border radius: 16-20px
- Box shadow: 0 4px 20px rgba(0,0,0,0.08)
- Hover: translateY(-4px) with enhanced shadow

### Form Elements
- Input border radius: 10-12px
- Focus state: Primary color border with subtle glow
- Error state: Red border with error message below

### Typography
- Headers: 1.5-2rem, font-weight 600-700
- Body: 0.9-1rem, font-weight 400-500
- Labels: 0.85rem, font-weight 500, uppercase

