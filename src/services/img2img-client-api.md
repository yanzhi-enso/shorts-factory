# Image-to-Image Client API Guide

## Overview

This guide covers the client-side functions for image-to-image processing using OpenAI's gpt-image-1 model. Two main functions are available:

- **`extendImage()`** - For image extension/outpainting (expanding image boundaries)
- **`inpaintingImage()`** - For targeted image editing using masks (modifying specific areas)

Both functions provide seamless integration with OpenAI's image editing capabilities through our backend API.

---

## Setup & Import

```javascript
import { extendImage, inpaintingImage } from '../services/backend.js';
```

---

## Image Extension (`extendImage`)

### Function Signature

```javascript
async function extendImage(images, prompt, n = 1)
```

### Description

Extends or outpaints multiple images by expanding their boundaries. This function is ideal for creating larger compositions from existing images without requiring masks.

### Parameters

#### **images** (Required)
- **Type**: Array of strings (image URLs)
- **Description**: Array of image URLs to extend
- **Limits**: 
  - Minimum: 1 image
  - Maximum: 10 images
- **Supported formats**: PNG, WebP, JPEG

#### **prompt** (Required)
- **Type**: string
- **Description**: Text description of how to extend the images
- **Example**: "Create a lovely gift basket with these four items"

#### **n** (Optional)
- **Type**: number
- **Default**: 1
- **Range**: 1-10
- **Description**: Number of image variations to generate

### Usage Examples

#### Basic Image Extension

```javascript
try {
  const imageUrls = [
    'https://example.com/image1.png',
    'https://example.com/image2.png'
  ];
  
  const result = await extendImage(
    imageUrls,
    'Combine these images into a beautiful landscape scene'
  );
  
  // Access the generated image(s)
  const generatedImages = result.data;
  generatedImages.forEach((image, index) => {
    console.log(`Generated image ${index + 1}:`, image.b64_json);
  });
  
} catch (error) {
  console.error('Extension failed:', error.message);
}
```

#### Multiple Variations

```javascript
try {
  const result = await extendImage(
    ['https://example.com/product.png'],
    'Create a professional product showcase with elegant background',
    3 // Generate 3 variations
  );
  
  // Process all variations
  result.data.forEach((image, index) => {
    // Convert base64 to blob for display
    const imageBlob = base64ToBlob(image.b64_json);
    displayImage(imageBlob, `variation-${index + 1}`);
  });
  
} catch (error) {
  handleImageError(error);
}
```

---

## Image Inpainting (`inpaintingImage`)

### Function Signature

```javascript
async function inpaintingImage(image, mask, prompt, n = 1)
```

### Description

Edits specific areas of an image using a mask. The mask defines which areas should be modified, allowing for precise, targeted editing.

### Parameters

#### **image** (Required)
- **Type**: string
- **Description**: URL of the source image to edit
- **Supported formats**: PNG, WebP, JPEG

#### **mask** (Required)
- **Type**: string
- **Description**: Base64-encoded PNG mask image
- **Requirements**: 
  - Must be PNG format
  - Same dimensions as source image
  - Transparent areas indicate regions to edit
  - Opaque areas remain unchanged

#### **prompt** (Required)
- **Type**: string
- **Description**: Text description of desired changes in masked areas
- **Example**: "Replace with a beautiful garden scene"

#### **n** (Optional)
- **Type**: number
- **Default**: 1
- **Range**: 1-10
- **Description**: Number of image variations to generate

### Usage Examples

#### Basic Inpainting

```javascript
try {
  const sourceImage = 'https://example.com/room.png';
  const maskBase64 = 'iVBORw0KGgoAAAANSUhEUgAAA...'; // Base64 mask
  
  const result = await inpaintingImage(
    sourceImage,
    maskBase64,
    'Replace the masked area with a modern fireplace'
  );
  
  // Display the edited image
  const editedImage = result.data[0];
  displayBase64Image(editedImage.b64_json);
  
} catch (error) {
  console.error('Inpainting failed:', error.message);
}
```

#### Multiple Inpainting Variations

```javascript
try {
  const result = await inpaintingImage(
    'https://example.com/portrait.png',
    maskBase64,
    'Change the background to a sunset beach scene',
    4 // Generate 4 different background variations
  );
  
  // Create a gallery of variations
  const gallery = result.data.map((image, index) => ({
    id: `variation-${index + 1}`,
    base64: image.b64_json,
    title: `Background Variation ${index + 1}`
  }));
  
  renderImageGallery(gallery);
  
} catch (error) {
  handleImageError(error);
}
```

---

## Error Handling

### Error Types and Status Codes

#### **400 - Validation Errors**

**Image Extension Validation:**
```javascript
// Missing or empty images array
{ error: 'images array is required and cannot be empty' }

// Too many images
{ error: 'images array cannot contain more than 10 images' }

// Missing prompt
{ error: 'prompt is required' }

// Invalid n parameter
{ error: 'n must be a number between 1 and 10' }
```

**Image Inpainting Validation:**
```javascript
// Missing image
{ error: 'image is required' }

// Missing mask
{ error: 'mask is required' }

// Missing prompt
{ error: 'prompt is required' }

// Invalid n parameter
{ error: 'n must be a number between 1 and 10' }
```

#### **403 - Content Moderation**

```javascript
{ error: 'CONTENT_MODERATION_BLOCKED' }
```

This occurs when the prompt or images violate OpenAI's content policy.

#### **500 - Server Errors**

```javascript
{ error: 'Internal server error message' }
```

General processing errors, network issues, or OpenAI API failures.

### Comprehensive Error Handling

```javascript
async function handleImageProcessing() {
  try {
    const result = await extendImage(images, prompt, n);
    return result;
    
  } catch (error) {
    // Check error message for specific handling
    if (error.message === 'CONTENT_MODERATION_BLOCKED') {
      showUserMessage('Content violates policy. Please modify your prompt.');
      return null;
    }
    
    // Handle validation errors
    if (error.message.includes('images array cannot contain more than 10')) {
      showUserMessage('Please select 10 or fewer images.');
      return null;
    }
    
    if (error.message.includes('prompt is required')) {
      showUserMessage('Please provide a description for the image generation.');
      return null;
    }
    
    if (error.message.includes('n must be a number between 1 and 10')) {
      showUserMessage('Number of images must be between 1 and 10.');
      return null;
    }
    
    // Handle general errors
    console.error('Image processing error:', error);
    showUserMessage('An error occurred while processing your image. Please try again.');
    return null;
  }
}
```

---

## Response Format

### Success Response Structure

```javascript
{
  "created": 1713833620,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAAA..." // Base64 encoded image
    }
    // Additional images if n > 1
  ],
  "usage": {
    "total_tokens": 100,
    "input_tokens": 50,
    "output_tokens": 50
  }
}
```

### Accessing Generated Images

```javascript
// Single image
const imageBase64 = result.data[0].b64_json;

// Multiple images
result.data.forEach((image, index) => {
  const base64Data = image.b64_json;
  // Process each image...
});
```

### Converting Base64 to Usable Formats

```javascript
// Convert to Blob for display
function base64ToBlob(base64Data, contentType = 'image/png') {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

// Convert to Object URL for img src
function base64ToObjectURL(base64Data) {
  const blob = base64ToBlob(base64Data);
  return URL.createObjectURL(blob);
}

// Usage example
const imageUrl = base64ToObjectURL(result.data[0].b64_json);
document.getElementById('result-image').src = imageUrl;
```

---

## Best Practices & Tips

### Image Requirements

- **File Size**: Keep images under 50MB each
- **Formats**: PNG, WebP, and JPEG are supported
- **Quality**: Higher resolution images generally produce better results

### Prompt Writing

- **Be Specific**: Detailed prompts yield better results
- **Style Guidance**: Include artistic style, mood, or technical specifications
- **Context**: Provide context about the desired outcome

```javascript
// Good prompts
"Transform this living room into a modern minimalist space with white furniture and natural lighting"
"Extend this forest scene to show a misty mountain landscape in the background"

// Less effective prompts  
"Make it better"
"Change the background"
```

### Mask Creation for Inpainting

- **Precision**: Create precise masks for better results
- **Format**: Always use PNG format for masks
- **Transparency**: Fully transparent areas will be edited, opaque areas preserved
- **Dimensions**: Mask must match source image dimensions exactly

### Performance Considerations

- **Batch Processing**: Use `n` parameter for multiple variations instead of multiple API calls
- **Error Recovery**: Implement retry logic for transient failures
- **User Feedback**: Provide loading states and progress indicators
- **Rate Limiting**: Be mindful of API rate limits in production

### Example Implementation with Loading States

```javascript
async function processImageWithFeedback(images, prompt, n = 1) {
  // Show loading state
  setLoading(true);
  setStatus('Processing images...');
  
  try {
    const result = await extendImage(images, prompt, n);
    
    setStatus('Images generated successfully!');
    return result;
    
  } catch (error) {
    setStatus('Failed to process images');
    throw error;
    
  } finally {
    setLoading(false);
  }
}
```

---

## Common Use Cases

### Image Extension Use Cases

- **Product Photography**: Extend product shots to create lifestyle scenes
- **Landscape Expansion**: Expand scenic photos to show more of the environment
- **Composition Building**: Combine multiple elements into cohesive scenes
- **Background Creation**: Generate backgrounds around existing subjects

### Image Inpainting Use Cases

- **Object Replacement**: Replace specific objects in photos
- **Background Changes**: Modify backgrounds while preserving subjects
- **Restoration**: Remove unwanted elements from images
- **Style Transfer**: Apply different styles to specific image regions

---

## Troubleshooting

### Common Issues

1. **"images array cannot contain more than 10 images"**
   - Solution: Reduce the number of images in your array

2. **"CONTENT_MODERATION_BLOCKED"**
   - Solution: Modify your prompt to comply with content policies

3. **"mask is required"**
   - Solution: Ensure you're providing a valid base64-encoded PNG mask

4. **Network timeouts**
   - Solution: Implement retry logic and check network connectivity

### Debug Tips

```javascript
// Log request parameters for debugging
console.log('Request params:', { images, prompt, n });

// Validate parameters before API call
if (!Array.isArray(images) || images.length === 0) {
  throw new Error('Invalid images parameter');
}

if (typeof prompt !== 'string' || prompt.trim() === '') {
  throw new Error('Invalid prompt parameter');
}
