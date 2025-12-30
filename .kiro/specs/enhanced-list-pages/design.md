# Design Document: Enhanced List Pages

## Overview

This design document outlines the implementation of enhanced Staff and Student list pages with modern UI design and comprehensive file/document display capabilities. The solution will provide a visually appealing, responsive interface that allows administrators to view, preview, and download uploaded files from custom fields directly within the list pages.

## Architecture

The feature follows a component-based React architecture with the following structure:

```
┌─────────────────────────────────────────────────────────────┐
│                    List Page Container                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Header Component                   │   │
│  │  (Gradient, Stats, Title)                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Controls Component                   │   │
│  │  (Search, Filters, View Toggle, Refresh)             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Grid/Table View Component                │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐               │   │
│  │  │  Card   │ │  Card   │ │  Card   │  ...          │   │
│  │  │ + Files │ │ + Files │ │ + Files │               │   │
│  │  └─────────┘ └─────────┘ └─────────┘               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Pagination Component                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Modal Components                          │
├─────────────────────────────────────────────────────────────┤
│  • Detail Modal (Profile + Info + Documents Grid)           │
│  • File Preview Modal (Image/PDF/Fallback)                  │
│  • Edit Modal (Form with file upload)                       │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. ListStaff / ListStudent Component

Main container component managing state and data fetching.

```typescript
interface ListPageState {
  data: Record[];
  filteredData: Record[];
  loading: boolean;
  searchTerm: string;
  filters: FilterState;
  viewMode: 'grid' | 'list';
  selectedRecord: Record | null;
  showModal: boolean;
  showFilePreview: FilePreviewState | null;
  currentPage: number;
}

interface FilterState {
  role?: string;      // For staff
  type?: string;      // For staff
  gender?: string;    // For students
  class?: string;     // For students
}
```

### 2. RecordCard Component

Displays individual staff/student in grid view.

```typescript
interface RecordCardProps {
  record: Record;
  onView: (record: Record) => void;
  onEdit: (record: Record) => void;
  onDelete: (record: Record) => void;
  onFileClick: (filename: string, fieldName: string) => void;
}
```

### 3. FileChip Component

Compact file indicator with icon and label.

```typescript
interface FileChipProps {
  filename: string;
  fieldName: string;
  onClick: () => void;
}
```

### 4. FilePreviewModal Component

Modal for previewing files.

```typescript
interface FilePreviewModalProps {
  file: {
    filename: string;
    fieldName: string;
    fileType: 'image' | 'pdf' | 'word' | 'excel' | 'file';
    url: string;
  };
  onClose: () => void;
}
```

### 5. DocumentCard Component

Document display in detail modal.

```typescript
interface DocumentCardProps {
  fieldName: string;
  filename: string;
  url: string;
  fileType: string;
  onPreview: () => void;
}
```

## Data Models

### File Type Detection

```typescript
const FILE_TYPE_MAP = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
  pdf: ['pdf'],
  word: ['doc', 'docx'],
  excel: ['xls', 'xlsx', 'csv'],
  powerpoint: ['ppt', 'pptx'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz'],
  video: ['mp4', 'avi', 'mov', 'wmv', 'mkv'],
  audio: ['mp3', 'wav', 'ogg', 'flac']
};

interface FileInfo {
  filename: string;
  extension: string;
  type: FileType;
  url: string;
  canPreview: boolean;
}
```

### Custom Field File Detection

```typescript
const FILE_FIELD_PATTERNS = [
  '_file', '_upload', '_image', '_photo', '_document',
  '_certificate', '_proof', '_attachment', '_cv', '_resume',
  'image_staff', 'image_student', 'profile_image'
];

function isFileField(fieldName: string): boolean {
  return FILE_FIELD_PATTERNS.some(pattern => 
    fieldName.toLowerCase().includes(pattern)
  );
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following properties have been identified. After reflection, redundant properties have been consolidated.

### Property 1: View mode toggle preserves filter state
*For any* search term and filter combination, switching between grid and list view modes SHALL preserve the exact same search term and filter values.
**Validates: Requirements 1.4**

### Property 2: File type icon mapping consistency
*For any* file extension, the `getFileType` function SHALL return a consistent file type category, and `getFileIcon` SHALL return the corresponding icon for that type.
**Validates: Requirements 2.2**

### Property 3: File chip display threshold
*For any* record with N files where N > 3, the card SHALL display exactly 3 file chips plus a badge showing "+{N-3}" additional files. For N ≤ 3, all file chips SHALL be displayed without a badge.
**Validates: Requirements 2.3**

### Property 4: Empty files section hiding
*For any* record with zero file fields containing values, the files section SHALL not be rendered in the card component.
**Validates: Requirements 2.4**

### Property 5: Preview modal content type matching
*For any* file being previewed, the modal content SHALL match the file type: images display in `<img>` tags, PDFs display in `<iframe>` tags, and unsupported types display a fallback component.
**Validates: Requirements 3.2, 3.3, 3.4**

### Property 6: Detail modal displays all non-file fields
*For any* record, the detail modal SHALL display all fields except file fields, internal IDs, and password fields in the information grid.
**Validates: Requirements 5.2**

### Property 7: Search filtering correctness
*For any* search term, the filtered results SHALL only contain records where the name, email, phone, or guardian information contains the search term (case-insensitive).
**Validates: Requirements 6.1**

### Property 8: Filter application correctness
*For any* filter selection, the filtered results SHALL only contain records matching all selected filter criteria.
**Validates: Requirements 6.2**

### Property 9: Statistics count accuracy
*For any* filter state, the displayed count in header statistics SHALL equal the length of the filtered records array.
**Validates: Requirements 6.3**

## Error Handling

### Network Errors
- Display user-friendly error message when API calls fail
- Provide retry button for failed data fetches
- Show cached data if available during network issues

### File Loading Errors
- Display placeholder image when profile images fail to load
- Show error state in file preview modal if file cannot be loaded
- Provide download option as fallback for preview failures

### Invalid Data
- Handle missing or null field values gracefully
- Display "-" or "N/A" for empty fields
- Skip rendering of malformed file paths

## Testing Strategy

### Unit Testing
Unit tests will verify specific examples and edge cases:
- Component rendering with various data states
- Click handlers and event propagation
- Modal open/close behavior
- Loading and error states

### Property-Based Testing
Property-based tests will use **fast-check** library to verify universal properties:
- Each property test will run a minimum of 100 iterations
- Tests will be tagged with the format: `**Feature: enhanced-list-pages, Property {number}: {property_text}**`

Properties to implement:
1. View mode toggle preserves filter state
2. File type icon mapping consistency
3. File chip display threshold
4. Empty files section hiding
5. Preview modal content type matching
6. Detail modal displays all non-file fields
7. Search filtering correctness
8. Filter application correctness
9. Statistics count accuracy

### Test File Structure
```
APP/src/PAGE/List/
├── ListStaff/
│   ├── ListStaff.jsx
│   ├── ListStaff.module.css
│   └── ListStaff.test.jsx
├── ListStudent/
│   ├── ListStudent.jsx
│   ├── ListStudent.module.css
│   └── ListStudent.test.jsx
└── utils/
    ├── fileUtils.js
    └── fileUtils.test.js
```

## UI Design Specifications

### Color Schemes
- Staff pages: Purple gradient (#6366f1 → #8b5cf6)
- Student pages: Green gradient (#22c55e → #16a34a)

### Card Design
- Border radius: 20px
- Hover effect: 2px border color change + shadow
- Image: Circular, 100px diameter with white border

### File Icons
- Image: Green (#10b981)
- PDF: Red (#ef4444)
- Word: Blue (#3b82f6)
- Excel: Green (#22c55e)
- Default: Gray (#64748b)

### Responsive Breakpoints
- Mobile: < 768px (single column)
- Tablet: 768px - 1024px (2 columns)
- Desktop: > 1024px (auto-fill, min 340px)

