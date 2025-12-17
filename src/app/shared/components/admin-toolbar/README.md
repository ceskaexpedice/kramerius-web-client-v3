# Admin Layer Documentation

## Overview

The admin layer provides bulk operations and selection functionality for the digital library search interface. It allows users to select multiple items and perform actions like export, deletion, and adding to favorites.

## Components

### AdminSelectionService
Core service managing selection state with Angular signals.

**Key Features:**
- Page-based selection (only visible items)
- Cross-page selection memory
- Reactive state with computed signals
- Selection persistence during navigation

### AdminToolbarComponent
Floating toolbar that appears when items are selected.

**Actions:**
- Select/Deselect all visible items
- Clear selection
- Export selected items (JSON, CSV, TXT)
- Bulk add to favorites
- Bulk delete

### Enhanced Card Components
The `RecordItemComponent` supports:
- Selection checkbox overlay in admin mode
- Visual selection states
- Click handling for selection

## Usage

1. **Enable Admin Mode**: Click the edit icon in the search toolbar
2. **Select Items**: Click on cards or use checkboxes
3. **Bulk Actions**: Use the floating toolbar for operations
4. **Export**: Selected items can be exported in multiple formats

## Architecture

### State Management
```typescript
interface AdminSelectionState {
  selectedIds: Set<string>;
  isAdminMode: boolean;
  currentPageItems: SearchDocument[];
}
```

### Selection Logic
- **Page-Based**: Only visible items (60-120 per page) can be selected at once
- **Cross-Page Memory**: Selections persist when navigating pages
- **Visual Feedback**: Clear indication of selected state

## Styling

### CSS Classes
- `.admin-mode`: Applied to cards when admin mode is active
- `.selected`: Applied to selected cards
- `.admin-toolbar`: Floating toolbar styles

### Animations
- Selection checkbox fade-in animation
- Toolbar slide-up animation
- Hover effects for cards

## Export Formats

### JSON
Full metadata export with structured data.

### CSV
Spreadsheet-friendly format with key fields.

### TXT
Human-readable plain text format.

## Extension Points

The admin layer can be extended to support:
- Additional export formats
- Custom bulk actions
- Different selection strategies
- Integration with other list views

## Performance Considerations

- Uses Angular signals for efficient reactivity
- Minimal re-renders with computed properties
- Efficient Set operations for selection tracking
- Lazy loading of detailed item data for export