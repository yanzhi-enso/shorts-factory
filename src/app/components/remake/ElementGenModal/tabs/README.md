# ElementGenModal Tabs Documentation

## Overview

The ElementGenModal provides three different workflows for generating and adding element images to projects:

1. **PromptTab** - Text-to-image generation and image extension using OpenAI APIs
2. **InpaintingTab** - Image inpainting with masks (coming soon)
3. **UploadTab** - Direct file upload from user's device

This document focuses on the **PromptTab** implementation completed in this task.

## PromptTab Implementation

### 🎯 **Purpose**
The PromptTab allows users to generate element images using OpenAI's image generation capabilities through two modes:
- **Text-to-Image**: Generate images from text prompts only
- **Image Extension**: Extend/modify existing element images using text prompts + reference images

### 🏗️ **Architecture**

#### Component Structure
```
PromptTab.js
├── Reference Image Selection
├── Text Prompt Input
├── Generation Options (Dropdown)
├── Generate Button
├── Generated Images Preview
└── Save/Regenerate Actions
```

#### State Management
```javascript
const [selectedImages, setSelectedImages] = useState([]);      // Reference images (max 10)
const [prompt, setPrompt] = useState('');                      // User text prompt
const [numberOfImages, setNumberOfImages] = useState(1);       // 1-10 images to generate
const [isGenerating, setIsGenerating] = useState(false);       // Loading state
const [generatedImages, setGeneratedImages] = useState([]);    // Draft generated images
const [selectedGeneratedImage, setSelectedGeneratedImage] = useState(null); // User's choice
const [generationError, setGenerationError] = useState(null); // Error handling
```

### 🎨 **UI/UX Design**

#### Reference Image Selection
- **Horizontal Scrollable Row**: Instagram-story-like interface
- **Border Selection**: Blue border indicates selected images (no checkmarks)
- **Selection Counter**: "Selected: 3/10" with "Clear All" button
- **Responsive**: Smaller thumbnails on mobile (80px → 60px)

#### Text Prompt
- **Large Textarea**: 4 rows, expandable
- **Required Field**: Validation prevents empty prompts
- **Placeholder**: "Describe the element you want to generate..."

#### Generation Options
- **Dropdown Component**: Reuses existing `common/Dropdown.js`
- **Options**: "1 image", "2 images", ... "10 images"
- **Default**: 1 image selected

#### Generated Images Preview
- **Portrait Layout**: 120x160px thumbnails (3:4 aspect ratio)
- **Radio Selection**: Clear visual selection with radio buttons
- **Horizontal Scroll**: Handle overflow gracefully
- **Mobile Responsive**: 100x133px on mobile

### 🔌 **API Integration**


#### Backend Image Processing
```javascript
// Frontend now sends image URLs instead of base64 data
if (isTextOnly) {
    // Text-to-image generation (unchanged)
    payload = {
        prompt: prompt.trim(),
        n: numberOfImages,
        project_id: curProjId,
        asset_type: 'ELEMENT_IMAGES'
    };
} else {
    // Image extension with URLs (backend handles conversion)
    payload = {
        image_urls: selectedImages.map(img => img.gcsUrl),
        prompt: prompt.trim(),
        n: numberOfImages,
        project_id: curProjId,
        asset_type: 'ELEMENT_IMAGES'
    };
}
```

#### Error Handling
- **Content Moderation**: Specific handling for `CONTENT_MODERATION_BLOCKED`
- **Network Errors**: Generic fallback with retry suggestion
- **Validation**: Prevents API calls with invalid inputs

### 🔄 **Draft + Save Workflow**

#### Phase 1: Draft Generation
1. User configures prompt + reference images + count
2. Click "Generate" → API call → Store results in `generatedImages` state
3. Images displayed in preview grid (not yet saved to project)
4. Auto-select first generated image

#### Phase 2: Selection & Save
1. User reviews generated images in portrait preview
2. Radio buttons allow selection of preferred image
3. "Save Selected" button commits choice to ProjectManager
4. "Generate New" button clears draft and returns to setup

#### Benefits of Draft Mode
- **Prevents Clutter**: Avoids saving unwanted images to element library
- **User Control**: Full review before commitment
- **Experimentation**: Easy to try different prompts/settings

### 💾 **ProjectManager Integration**

#### Data Flow
```javascript
// Access existing element images for reference selection
const { projectState, addElementImage } = useProjectManager();
const elementImages = projectState.elementImages;

// Save selected generated image with metadata
const result = await addElementImage(
    selectedGeneratedImage.imageUrl,           // GCS URL from API
    selectedGeneratedImage.generationSources, // Tracking metadata
    name.trim() || null,                       // User-provided name
    description.trim() || null                 // User-provided description
);
```

#### Generation Sources Tracking
```javascript
const generationSources = {
    type: isTextOnly ? 'text-to-image' : 'image-extension',
    prompt: prompt.trim(),
    referenceImages: isTextOnly ? null : selectedImages.map(img => img.gcsUrl),
    revisedPrompt: imageData.revisedPrompt // OpenAI's revised version
};
```

### 🎭 **CSS Architecture**

#### Key Style Classes
```css
.referenceImagesSection     /* Reference image selection area */
.imageScrollContainer       /* Horizontal scroll wrapper */
.elementImageItem          /* Individual element image */
.elementImageItem.selected /* Selected state with border */
.promptSection            /* Text prompt input area */
.promptTextarea          /* Large prompt input */
.generateSection         /* Generate button container */
.previewSection          /* Generated images preview */
.generatedImagesGrid     /* Portrait thumbnail grid */
.generatedImageThumbnail /* Individual generated image */
.saveSection            /* Save/Regenerate buttons */
```

#### Mobile Responsiveness
- **Breakpoint**: `@media (max-width: 768px)`
- **Adjustments**: Smaller thumbnails, stacked buttons, reduced padding
- **Scrolling**: Maintains horizontal scroll on all devices

### 🔧 **Technical Considerations**

#### Performance Optimizations
- **Base64 Conversion**: Efficient blob → base64 conversion
- **Memory Management**: Proper cleanup of object URLs
- **API Batching**: Single API call for multiple image generation

#### Error Recovery
- **Retry Logic**: Users can easily regenerate after errors
- **Graceful Degradation**: Works without reference images
- **Validation**: Prevents invalid API calls

#### Accessibility
- **Keyboard Navigation**: All interactive elements accessible
- **Screen Readers**: Proper labels and alt text
- **Focus Management**: Clear focus indicators

### 📋 **Usage Examples**

#### Text-Only Generation
```
1. User enters: "A red apple on white background"
2. Leaves reference images empty
3. Selects "3 images" from dropdown
4. Clicks "Generate"
5. Reviews 3 generated apple images
6. Selects preferred one and clicks "Save Selected"
```

#### Image Extension
```
1. User selects 2 existing fruit element images as references
2. Enters: "Make these fruits look more vibrant and colorful"
3. Selects "2 images" from dropdown
4. Clicks "Generate"
5. Reviews enhanced versions of reference images
6. Saves the best result
```

### 🚀 **Future Enhancements**

#### Planned Features
- **Prompt History**: Remember previous successful prompts
- **Style Presets**: Common style modifiers (cartoon, realistic, etc.)
- **Batch Operations**: Generate elements for multiple scenes at once
- **Advanced Settings**: Image dimensions, quality settings

#### Integration Opportunities
- **Scene Context**: Auto-suggest prompts based on current scene
- **Element Categories**: Tag-based organization of element images
- **Collaborative Features**: Share generated elements across projects

### 🐛 **Known Limitations**

#### Current Constraints
- **Reference Image Limit**: 10 images max (OpenAI API limitation)
- **File Size**: Large reference images may slow base64 conversion
- **Content Moderation**: Some prompts may be blocked by OpenAI
- **Network Dependency**: Requires stable internet for API calls

#### Workarounds
- **Prompt Optimization**: Guide users toward moderation-friendly language
- **Error Messaging**: Clear feedback when issues occur
- **Fallback Options**: Upload tab available if generation fails

## Implementation History

### Task Context
This implementation was completed as part of the Element Generation Modal project, focusing on providing users with AI-powered element image creation capabilities. The modal was designed to integrate seamlessly with the existing RemakeTab workflow.

### Key Decisions
1. **Draft Mode**: Chosen over immediate save to prevent element library clutter
2. **Border Selection**: Preferred over checkmarks for cleaner visual design  
3. **Portrait Preview**: Optimized for typical element image aspect ratios
4. **Automatic Mode Detection**: Simplified UX by removing explicit mode toggles

### Integration Points
- **ProjectManager**: Element image persistence and retrieval
- **Common Components**: Reused Dropdown for consistency
- **API Endpoints**: Leveraged existing OpenAI workflow routes
- **Styling**: Extended ElementGenModal.module.css patterns

---

*This documentation serves as both implementation reference and future development guide for the ElementGenModal tabs system.*
