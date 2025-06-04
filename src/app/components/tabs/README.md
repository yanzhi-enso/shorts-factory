# Tab System Documentation

## Overview

The tab system implements a **progressive workflow** for the TikTok Video Processor application. It consists of three main tabs that guide users through a sequential process: video processing, scene selection, and remake generation.

## Architecture

### Components Structure
```
src/app/components/tabs/
├── TabNavigation.js          # Tab header with navigation controls
├── TabNavigation.module.css  # Styling for tab navigation
├── StartTab.js              # Initial video processing tab
├── StartTab.module.css      # Styling for start tab
├── ScenesTab.js             # Scene selection and management tab
├── ScenesTab.module.css     # Styling for scenes tab
├── RemakeTab.js             # Final remake processing tab
├── RemakeTab.module.css     # Styling for remake tab
└── README.md                # This documentation
```

### Tab Flow Diagram
```
┌─────────────┐    Process Video    ┌─────────────┐    Select Scenes    ┌─────────────┐
│  StartTab   │ ──────────────────► │  ScenesTab  │ ──────────────────► │  RemakeTab  │
│             │                     │             │                     │             │
│ • Video URL │                     │ • Image     │                     │ • Selected  │
│ • Process   │                     │   Grid      │                     │   Images    │
│   Button    │                     │ • Selection │                     │ • Remake    │
└─────────────┘                     │ • Delete    │                     │   Process   │
                                    └─────────────┘                     └─────────────┘
```

## State Management

### Shared State (Managed in page.js)

| State Variable | Type | Purpose |
|----------------|------|---------|
| `activeTab` | string | Currently displayed tab (`'start'`, `'scenes'`, `'remake'`) |
| `unlockedTabs` | array | Tabs accessible to user (progressive unlocking) |
| `projectId` | string | Unique identifier for current project |
| `images` | array | All extracted scene images from video |
| `remakeImages` | array | Filtered images passed to RemakeTab |
| `selectedIndices` | object | User's image selections per scene |
| `error` | string | Global error message |

### URL State Synchronization
The system maintains state in URL query parameters for deep linking and browser navigation:
- `stage`: Current active tab
- `pid`: Project ID (for scenes/remake tabs)

Example URLs:
```
/?stage=start                    # Start tab
/?stage=scenes&pid=abc123        # Scenes tab with project
/?stage=remake&pid=abc123        # Remake tab with project
```

## Tab Transitions

### 1. StartTab → ScenesTab
**Trigger**: Successful video processing
**Data Flow**:
```javascript
// StartTab calls onProcessComplete with:
{
  projectId: "generated-id",
  images: ["scene1-img1.jpg", "scene1-img2.jpg", ...]
}

// Parent updates state and navigates:
setProjectId(newProjectId);
setImages(newImages);
setActiveTab(TABS.SCENES);
setUnlockedTabs([TABS.START, TABS.SCENES]);
```

### 2. ScenesTab → RemakeTab
**Trigger**: User clicks "Next Step" button
**Data Flow**:
```javascript
// ScenesTab calls onNext with filtered images:
onNext(currentImages); // Images after scene deletions

// Parent updates state and navigates:
setRemakeImages(filteredImages);
setActiveTab(TABS.REMAKE);
setUnlockedTabs([TABS.START, TABS.SCENES, TABS.REMAKE]);
```

### 3. Backward Navigation
Each tab provides backward navigation through callback props:
- `onBackToStart`: Returns to StartTab, clears project state
- `onBackToScenes`: Returns to ScenesTab from RemakeTab

## Tab Components Deep Dive

### TabNavigation Component
**Purpose**: Visual tab header with locked/unlocked states
**Key Features**:
- Shows all tabs with visual indicators
- Locked tabs appear disabled until unlocked
- Active tab highlighted with blue border
- Responsive design for mobile

**Props**:
```javascript
{
  activeTab: string,      // Current active tab
  unlockedTabs: array     // Array of accessible tab names
}
```

### StartTab Component
**Purpose**: Video URL input and processing initiation
**Key Features**:
- URL validation
- API call to `/api/start` endpoint
- Loading state management
- Error handling

**Props**:
```javascript
{
  onProcessComplete: function,  // Called with {projectId, images}
  onError: function            // Called with error message
}
```

### ScenesTab Component
**Purpose**: Scene image management and selection
**Key Features**:
- Displays ImageGrid component
- Manages scene deletions
- Tracks selected indices per scene
- Navigation controls

**Props**:
```javascript
{
  projectId: string,
  images: array,
  selectedIndices: object,
  setSelectedIndices: function,
  onBackToStart: function,
  onNext: function,           // Called with filtered images
  onError: function
}
```

### RemakeTab Component
**Purpose**: Final remake processing and display
**Key Features**:
- Groups images by scene
- Extracts selected images based on indices
- Modal image viewing
- Navigation controls

**Props**:
```javascript
{
  projectId: string,
  images: array,
  selectedIndices: object,
  onBackToScenes: function,
  onNext: function,
  onError: function
}
```

## Adding New Tabs

### Step 1: Create Tab Component
```javascript
// NewTab.js
"use client";
import styles from './NewTab.module.css';

const NewTab = ({ projectId, onBack, onNext, onError }) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.stepButton}>
          ← Back
        </button>
        <p className={styles.projectId}>Project ID: {projectId}</p>
        <button onClick={onNext} className={styles.stepButton}>
          Next Step →
        </button>
      </div>
      
      <div className={styles.content}>
        {/* Your tab content here */}
      </div>
    </div>
  );
};

export default NewTab;
```

### Step 2: Update TABS Constant
```javascript
// TabNavigation.js
const TABS = {
  START: 'start',
  SCENES: 'scenes',
  REMAKE: 'remake',
  NEW_TAB: 'newtab'  // Add your new tab
};
```

### Step 3: Update TabNavigation Component
```javascript
// Add new tab to JSX in TabNavigation.js
<div
  className={`${styles.tab} ${activeTab === TABS.NEW_TAB ? styles.active : ''} ${unlockedTabs.includes(TABS.NEW_TAB) ? styles.unlocked : styles.locked}`}
>
  New Tab
</div>
```

### Step 4: Update Parent Component (page.js)
```javascript
// Import new component
import NewTab from './components/tabs/NewTab';

// Add state if needed
const [newTabData, setNewTabData] = useState(null);

// Add navigation handlers
const handleNextToNewTab = (data) => {
  setNewTabData(data);
  setActiveTab(TABS.NEW_TAB);
  setUnlockedTabs([...unlockedTabs, TABS.NEW_TAB]);
  updateUrl(TABS.NEW_TAB, projectId);
};

// Add to render logic
{activeTab === TABS.NEW_TAB && projectId && (
  <NewTab 
    projectId={projectId}
    data={newTabData}
    onBack={handleBackToPreviousTab}
    onNext={handleNextFromNewTab}
    onError={handleError}
  />
)}
```

## Common Modification Patterns

### Adding New State
1. **Add to parent component** (page.js) state
2. **Pass as props** to relevant tab components
3. **Update URL params** if state should persist across page reloads

### Modifying Tab Behavior
1. **Update component logic** in individual tab files
2. **Modify callback functions** in parent component
3. **Update state transitions** as needed

### Styling Changes
1. **Component-specific styles**: Modify respective `.module.css` files
2. **Global tab styles**: Update `TabNavigation.module.css`
3. **Responsive behavior**: Check mobile media queries

## Error Handling

### Error Flow
1. **Tab components** call `onError(message)` when errors occur
2. **Parent component** updates global error state
3. **Error message** displayed at bottom of page
4. **Error cleared** on successful operations

### Best Practices
- Always provide user-friendly error messages
- Clear errors when starting new operations
- Handle both API and validation errors
- Provide recovery options when possible

## URL Management

### Deep Linking Support
The system supports direct navigation to any tab with proper state:
- `/?stage=scenes&pid=abc123` - Direct to scenes tab
- Invalid URLs redirect to start tab with error message
- Browser back/forward buttons work correctly

### URL Update Pattern
```javascript
const updateUrl = (tab, pid = null) => {
  const params = new URLSearchParams();
  params.set(STAGE_PARAM, tab);
  
  if ((tab === TABS.SCENES || tab === TABS.REMAKE) && pid) {
    params.set(PROJECT_ID_PARAM, pid);
  }
  
  router.push(`/?${params.toString()}`, { shallow: true });
};
```

## Troubleshooting

### Common Issues

**Tab not unlocking**
- Check if `unlockedTabs` array includes the tab name
- Verify tab transition logic in parent component

**State not persisting**
- Ensure URL parameters are properly set
- Check initialization logic in `useEffect`

**Navigation not working**
- Verify callback props are passed correctly
- Check if required state (like `projectId`) is available

**Styling issues**
- Check CSS module imports
- Verify class name usage matches CSS file
- Test responsive behavior on different screen sizes

### Debug Tips
1. **Console log state** in parent component to track changes
2. **Check Network tab** for API call failures
3. **Inspect URL parameters** for proper state synchronization
4. **Test browser navigation** (back/forward buttons)

## Performance Considerations

- **Lazy loading**: Consider code splitting for large tab components
- **State optimization**: Only pass necessary props to each tab
- **Image optimization**: Implement proper image loading strategies
- **Memory management**: Clean up state when navigating away from tabs

## Future Enhancements

- **Tab persistence**: Save tab state to localStorage
- **Progress indicators**: Show completion status for each tab
- **Keyboard navigation**: Add keyboard shortcuts for tab switching
- **Animation**: Add smooth transitions between tabs
- **Validation**: Add form validation before tab transitions
