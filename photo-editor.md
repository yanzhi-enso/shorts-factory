# Photo Editor Modal Implementation Plan

## Overview

This document outlines the implementation plan for the Image Generation Modal in the ToolBoxBlock component. The modal provides users with three different ways to generate or add images to their project using OpenAI's image generation APIs.

## Background Context

The modal is triggered when users click on an empty ToolBoxBlock (no src provided) in the RemakeTab. It integrates with existing OpenAI image generation APIs to provide three distinct image creation workflows:

1. **Text-to-Image & Image Extension** - Generate images from text prompts or extend existing images
2. **Image Inpainting** - Edit specific parts of images using masks and prompts  
3. **Local Upload** - Upload images directly from user's device

## API Integration

The modal utilizes three existing API endpoints:

### 1. Text-to-Image Generation
- **Endpoint**: `/api/workflows/txt2img/gen_img`
- **Method**: POST
- **Parameters**: 
  - `prompt` (required): Text description for image generation
  - `n` (optional): Number of images to generate (1-10, default: 1)
  - `project_id` (required): Current project identifier
- **Response**: Generated image URLs and metadata

### 2. Image Extension
- **Endpoint**: `/api/workflows/img2img/extend`  
- **Method**: POST
- **Parameters**:
  - `images` (required): Array of base64 encoded images (max 10)
  - `prompt` (required): Text description for extension
  - `n` (optional): Number of images to generate (1-10, default: 1)
- **Response**: Extended image URLs and metadata

### 3. Image Inpainting
- **Endpoint**: `/api/workflows/img2img/inpainting`
- **Method**: POST  
- **Parameters**:
  - `image` (required): Base64 encoded source image
  - `mask` (required): Base64 encoded mask image
  - `prompt` (required): Text description for inpainting
  - `n` (optional): Number of images to generate (1-10, default: 1)
- **Response**: Inpainted image URLs and metadata

## Implementation Architecture

### File Structure
```
src/app/components/common/
├── ImageGenerationModal.js          # Main modal component
├── ImageGenerationModal.module.css  # Modal styling

src/app/components/tabs/
├── RemakeTab.js                     # Modified to include modal state

src/app/components/remake/
├── ToolBoxBlock.js                  # Modified to accept onClick handler

photo-editor.md                      # This documentation file
```

### Component Architecture

#### ImageGenerationModal Component
- **State Management**: Local useState for modal state, tab selection, form data
- **Props**:
  - `isOpen`: Boolean to control modal visibility
  - `onClose`: Function to close modal
  - `onImageGenerated`: Callback when image is successfully generated
- **Features**:
  - Tab-based navigation system
  - Form validation and error handling
  - Loading states during API calls
  - Integration with ProjectManager for image persistence

#### Tab Structure

**Tab 1: "Prompt" (Text-to-Image & Extension)**
- Toggle between "Text only" and "Text + Images" modes
- Text input for prompt description
- Optional image upload area (for extension mode)
- Number of images selector
- Generate button with loading state

**Tab 2: "Inpainting"**
- Base image upload area
- Mask image upload area (future: drawing tool integration)
- Text prompt input for inpainting description
- Number of images selector
- Generate button with loading state

**Tab 3: "Upload"**
- Drag & drop file upload interface
- File type validation (PNG, JPG, JPEG, WebP)
- File size validation (< 25MB)
- WebP to PNG conversion (leveraging existing ProjectManager logic)
- Upload progress indicator

### Integration Points

#### ToolBoxBlock Integration
- Modified to accept `onClick` prop
- Triggers modal when clicked and no `src` is provided
- Visual feedback on hover for empty state

#### RemakeTab Integration  
- Manages modal open/close state
- Passes necessary props to ImageGenerationModal
- Handles image generation callbacks
- Updates project state through ProjectManager

#### ProjectManager Integration
- Uses existing `addGeneratedImage` method for persistence
- Leverages `handleImageUpload` for local file uploads
- Integrates with project_id from current project context
- Maintains consistency with existing image management patterns

## Implementation Phases

### Phase 1: Modal Foundation ✅
- [x] Create modal component with tab structure
- [x] Implement basic styling following existing patterns
- [x] Add modal state management to RemakeTab
- [x] Integrate with ToolBoxBlock click handler
- [x] Create placeholder content for all tabs

### Phase 2: Prompt Tab Implementation
- [ ] Implement text-to-image form
- [ ] Add image upload for extension mode
- [ ] Integrate with `/api/workflows/txt2img/gen_img` endpoint
- [ ] Integrate with `/api/workflows/img2img/extend` endpoint
- [ ] Add form validation and error handling

### Phase 3: Inpainting Tab Implementation
- [ ] Implement image and mask upload interfaces
- [ ] Add prompt input for inpainting
- [ ] Integrate with `/api/workflows/img2img/inpainting` endpoint
- [ ] Consider future mask drawing tool integration

### Phase 4: Upload Tab Implementation
- [ ] Implement drag & drop upload interface
- [ ] Add file validation and conversion logic
- [ ] Integrate with existing ProjectManager upload methods
- [ ] Add upload progress indicators

### Phase 5: Enhancement & Polish
- [ ] Add advanced options (image size, quality settings)
- [ ] Implement batch generation capabilities
- [ ] Add image preview and selection interface
- [ ] Optimize performance and user experience

## Technical Considerations

### State Management
- Modal state managed locally in RemakeTab
- Form data managed within ImageGenerationModal
- Generated images persisted through ProjectManager
- Error states handled at component level with user feedback

### File Handling
- Base64 encoding for API compatibility
- WebP to PNG conversion for unsupported formats
- File size validation (25MB limit)
- Memory management for large image files

### Error Handling
- API error responses with user-friendly messages
- File validation errors with specific guidance
- Network connectivity issues
- Content moderation blocks (CONTENT_MODERATION_BLOCKED)

### Performance Optimization
- Lazy loading of modal content
- Image compression before API calls
- Debounced form inputs
- Efficient re-rendering patterns

## User Experience Flow

1. **Trigger**: User clicks empty ToolBoxBlock
2. **Modal Opens**: ImageGenerationModal appears with "Prompt" tab selected
3. **Tab Selection**: User can switch between Prompt, Inpainting, Upload tabs
4. **Form Interaction**: User fills out relevant form fields for selected generation type
5. **Generation**: User clicks generate/upload button
6. **Loading State**: Modal shows loading indicator during processing
7. **Success**: Generated image is added to project and modal closes
8. **Error Handling**: Any errors are displayed with actionable feedback

## Future Enhancements

### Advanced Features
- Real-time image preview during generation
- Batch processing for multiple scenes
- Custom model selection
- Advanced prompt engineering tools
- Image editing capabilities within modal

### Integration Improvements
- Direct integration with scene context
- Automatic prompt generation from scene data
- Style consistency across generated images
- Version control for generated images

### Performance Optimizations
- Image caching strategies
- Progressive image loading
- Background generation queuing
- Offline capability considerations

## Security Considerations

- Input sanitization for all text prompts
- File type validation and sanitization
- API rate limiting awareness
- Content moderation compliance
- Secure file upload handling

## Testing Strategy

### Unit Tests
- Modal component rendering and state management
- Form validation logic
- API integration error handling
- File upload and conversion utilities

### Integration Tests
- End-to-end image generation workflows
- ProjectManager integration
- Error scenario handling
- Cross-browser compatibility

### User Acceptance Testing
- Usability testing for each generation mode
- Performance testing with large images
- Accessibility compliance verification
- Mobile responsiveness validation

---

*This document will be updated as implementation progresses and new requirements are identified.*
