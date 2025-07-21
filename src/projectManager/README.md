# Project Manager - Scene Management API

This document outlines the scene management functionality that enables users to dynamically add, insert, and remove scenes in their projects.

## Product Requirements

### Overview
The scene management system supports:
- Creating projects with no initial scenes (empty projects)
- Adding scenes at any position (first scene, append, or insert between existing scenes)
- Scene deletion with automatic cleanup of related data
- Gap-based ordering system that maintains proper scene sequencing
- Optional reference image upload for new scenes

### Key Features
1. **Dynamic Scene Creation**: Users can add scenes after project creation
2. **Flexible Positioning**: Scenes can be appended to the end or inserted between existing scenes
3. **Reference Images**: New scenes can optionally include a reference image URL
4. **Data Integrity**: Scene deletion removes all related images, clips, and metadata
5. **Order Preservation**: Gap-based ordering system prevents conflicts and allows easy insertion

## API Reference

### Storage Layer (`src/storage/`)

#### Utility Functions (`src/storage/utils.js`)

##### `getNextSceneOrder(beforeScene, afterScene)`
Calculates the scene order for a new scene based on its position relative to existing scenes.

**Parameters:**
- `beforeScene` (Object|null): Scene to insert after (null for first scene)
- `afterScene` (Object|null): Scene to insert before (null for append)

**Returns:** `number` - The calculated scene_order value

**Valid Scenarios:**
1. **First Scene**: `beforeScene=null, afterScene=null` → Returns `100`
2. **Append**: `beforeScene=scene, afterScene=null` → Returns `beforeScene.sceneOrder + 100`
3. **Insert**: `beforeScene=scene, afterScene=scene` → Returns midpoint between orders

**Invalid Scenario:**
- **Prepend**: `beforeScene=null, afterScene=scene` → Throws Error (prepending not supported)

**Example Usage:**
```javascript
// First scene in empty project
const order1 = getNextSceneOrder(null, null); // Returns 100

// Append after existing scene
const order2 = getNextSceneOrder(existingScene, null); // Returns existingScene.sceneOrder + 100

// Insert between two scenes
const order3 = getNextSceneOrder(scene1, scene2); // Returns midpoint between scene1 and scene2 orders
```

##### `deleteScene(sceneId)`
Deletes a scene and all its related data (scene images, generated images, clips).

**Parameters:**
- `sceneId` (string): The scene ID to delete

**Returns:** `Promise<boolean>` - Success status

**Side Effects:**
- Removes scene record from database
- Deletes all scene images associated with the scene
- Deletes all generated images for the scene
- Deletes all generated clips for the scene
- Performs GCS asset cleanup for all related files

#### Scene Functions (`src/storage/scene.js`)

##### `createScene(projectId, beforeScene, afterScene, metadata, referenceImageUrl)`
Creates a single scene with auto-calculated ordering.

**Parameters:**
- `projectId` (string): Parent project ID
- `beforeScene` (Object|null): Scene to insert after
- `afterScene` (Object|null): Scene to insert before
- `metadata` (Object): Scene metadata and settings
- `referenceImageUrl` (string|null): Optional reference image URL

**Returns:** `Promise<Object>` - Created scene object

**Example Usage:**
```javascript
// Create first scene
const scene1 = await createScene(projectId, null, null, { name: "Opening" }, null);

// Append scene
const scene2 = await createScene(projectId, scene1, null, { name: "Middle" }, "https://example.com/ref.jpg");

// Insert between scenes
const scene3 = await createScene(projectId, scene1, scene2, { name: "Transition" }, null);
```

### Project Manager Layer (`src/projectManager/`)

#### Actions (`src/projectManager/actions.js`)

##### `addScene(beforeScene, afterScene, metadata, referenceImageUrl)`
Project manager action to add a new scene to the current project.

**Parameters:**
- `beforeScene` (Object|null): Scene to insert after
- `afterScene` (Object|null): Scene to insert before  
- `metadata` (Object): Scene metadata and settings
- `referenceImageUrl` (string|null): Optional reference image URL

**Returns:** `Promise<Object>` - Result object with success status and created scene

**State Changes:**
- Updates persistent storage first
- Updates local state second
- Enriches scene with embedded data structure

**Example Usage:**
```javascript
const { addScene } = useProjectManager();

// Add first scene
const result = await addScene(null, null, { name: "Scene 1" }, null);

// Append scene with reference image
const result2 = await addScene(lastScene, null, { name: "Scene 2" }, imageUrl);
```

##### `removeScene(sceneId)`
Project manager action to remove a scene from the current project.

**Parameters:**
- `sceneId` (string): The scene ID to remove

**Returns:** `Promise<Object>` - Result object with success status

**State Changes:**
- Removes from persistent storage first (including GCS cleanup)
- Updates local state second
- Handles related data deletion automatically

**Example Usage:**
```javascript
const { removeScene } = useProjectManager();

const result = await removeScene(sceneId);
if (result.success) {
    console.log('Scene removed successfully');
}
```

### State Management

#### New Action Constants (`src/projectManager/constants.js`)
```javascript
ADD_SCENE_SUCCESS: 'ADD_SCENE_SUCCESS'
REMOVE_SCENE_SUCCESS: 'REMOVE_SCENE_SUCCESS'
```

#### Reducer Handlers (`src/projectManager/reducer.js`)
- `ADD_SCENE_SUCCESS`: Adds new scene to scenes array in correct position
- `REMOVE_SCENE_SUCCESS`: Removes scene from scenes array by ID

## Scene Ordering Algorithm

### Gap-Based System
The system uses gap-based ordering with default gaps of 100:
- First scene: `100`
- Second scene: `200`
- Third scene: `300`
- etc.

### Insertion Logic
When inserting between scenes with orders `A` and `B`:
- New order = `(A + B) / 2`
- If gap becomes too small, the system maintains precision using decimal values

### Benefits
- **Conflict Prevention**: Large gaps prevent ordering conflicts
- **Easy Insertion**: Can insert anywhere without renumbering existing scenes
- **Performance**: No need to update multiple records when inserting
- **Scalability**: Supports thousands of scenes with proper ordering

## Error Handling

### Common Error Cases
1. **Invalid Position**: Attempting to prepend (beforeScene=null, afterScene=scene)
2. **Scene Not Found**: Referencing non-existent scenes for positioning
3. **Project Not Found**: Operating on invalid project ID
4. **GCS Cleanup Failure**: Network or permission issues during asset deletion

### Error Responses
All functions return consistent error objects:
```javascript
{
    success: false,
    error: "Human-readable error message"
}
```

## Integration Points

### Existing Components
- **ScenesTab**: Will display "No scenes found" message when scenes array is empty
- **ImageGrid**: Already handles empty scenes arrays gracefully
- **SceneRow components**: Ready to work with dynamically added scenes

### Future UI Integration
When UI components are added, they should:
- Use `addScene()` action for scene creation
- Use `removeScene()` action for scene deletion
- Handle loading states during async operations
- Provide confirmation dialogs for destructive operations

## Data Structure

### Enriched Scene Format
Created scenes follow the existing enriched scene structure:
```javascript
{
    id: string,
    projectId: string,
    sceneOrder: number,
    isSelected: boolean,
    selectedImage: string|null,
    selectedImageId: number|null,
    sceneImages: Array,
    generatedImages: Array,
    selectedGeneratedImageId: number|null,
    selectedGeneratedImage: string|null,
    sceneClips: Array,
    selectedSceneClip: string|null,
    selectedSceneClipId: number|null,
    settings: object,
    createdAt: string
}
```

### Reference Image Handling
When a reference image URL is provided:
- The image is stored as a scene image with `image_order: 0`
- The scene's `selectedImageId` is set to reference this image
- The scene's `selectedImage` URL is populated for UI consumption

## Usage Examples

### Scenario 1: Empty Project Workflow
```javascript
// User creates empty project
const project = await createProject(null, { name: "My Story" });

// User adds first scene
const scene1 = await addScene(null, null, { name: "Opening" }, null);

// User adds second scene
const scene2 = await addScene(scene1, null, { name: "Middle" }, referenceImageUrl);

// User inserts scene between existing ones
const sceneTransition = await addScene(scene1, scene2, { name: "Transition" }, null);
```

### Scenario 2: Scene Management
```javascript
// User removes a scene
await removeScene(sceneId);

// User adds replacement scene
const newScene = await addScene(beforeScene, afterScene, metadata, imageUrl);
```

## Testing Considerations

### Unit Tests Should Cover
- Scene order calculation with all valid scenarios
- Error handling for invalid positioning
- Scene creation with and without reference images
- Scene deletion and cleanup verification
- State management accuracy

### Integration Tests Should Cover
- End-to-end scene addition workflow
- Project state consistency after operations
- GCS asset management during deletion
- Error recovery scenarios

## Performance Notes

- Scene ordering calculations are O(1) operations
- Scene deletion may involve multiple database transactions
- GCS cleanup is performed asynchronously but blocks operation completion
- State updates follow existing patterns (storage first, state second)
