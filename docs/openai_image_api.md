# OpenAI GPT-Image-1 API Reference (JavaScript SDK)

## Setup

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

---

## 1. Create Image (GPT-Image-1)

```javascript
const image = await openai.images.generate({
  model: "gpt-image-1",
  prompt: "A cute baby sea otter floating on its back in calm blue water",
  n: 1,
  size: "1024x1536",
  quality: "high",
  output_format: "png",
  moderation: "low"
});

console.log(image.data[0].b64_json);
```

**Response Object:**
```javascript
{
  created: 1589478378,
  data: [
    {
      b64_json: "iVBORw0KGgoAAAANSUhEUgAAA...",
      revised_prompt: "A cute baby sea otter floating on its back in calm blue water, with whiskers and dark eyes visible..."
    }
  ]
}
```

---

## 2. Create Image Edit (GPT-Image-1)

```javascript
import fs from "fs";

const imageEdit = await openai.images.edit({
  model: "gpt-image-1",
  image: fs.createReadStream("original.png"),
  mask: fs.createReadStream("mask.png"),
  prompt: "Add a sunlit indoor lounge area with a pool",
  n: 1,
  size: "1024x1536",
  quality: "high",
  output_format: "png",
  moderation: "low"
});

console.log(imageEdit.data[0].b64_json);
```

**Response Object:**
```javascript
{
  created: 1589478378,
  data: [
    {
      b64_json: "iVBORw0KGgoAAAANSUhEUgAAA...",
      revised_prompt: "Add a sunlit indoor lounge area with a pool to the existing image..."
    }
  ]
}
```

---

## 3. Create Image Variation (GPT-Image-1)

```javascript
import fs from "fs";

const imageVariation = await openai.images.createVariation({
  model: "gpt-image-1", 
  image: fs.createReadStream("original.png"),
  prompt: "Create variations of this image",
  n: 1,
  size: "1024x1536",
  quality: "high",
  output_format: "png",
  moderation: "low"
});

console.log(imageVariation.data[0].b64_json);
```

**Response Object:**
```javascript
{
  created: 1589478378,
  data: [
    {
      b64_json: "iVBORw0KGgoAAAANSUhEUgAAA...",
      revised_prompt: "Variations of the provided image maintaining similar composition and style..."
    }
  ]
}
```

---

## Error Handling

```javascript
try {
  const image = await openai.images.generate({
    model: "gpt-image-1",
    prompt: "A serene mountain landscape",
    size: "1024x1536",
    quality: "high",
    moderation: "low"
  });
  
  console.log(image.data[0].b64_json);
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error('API Error:', error.status, error.message);
    console.error('Request ID:', error.request_id);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Saving Generated Images

```javascript
import fs from "fs";

const image = await openai.images.generate({
  model: "gpt-image-1",
  prompt: "A cute baby sea otter",
  size: "1024x1536",
  quality: "high",
  moderation: "low"
});

// Save base64 image to file
const base64Data = image.data[0].b64_json;
const buffer = Buffer.from(base64Data, 'base64');
fs.writeFileSync('generated_image.png', buffer);
```

## GPT-Image-1 Parameters

### Core Parameters:
- **prompt** (required): Text description of desired image (max 4000 characters)
- **model**: "gpt-image-1" (required)
- **size**: Image dimensions
  - "1024x1024" (Square, default)
  - "1024x1536" (Portrait)
  - "1536x1024" (Landscape)
  - "auto" (Model chooses based on prompt)

### Quality & Format:
- **quality**: Image quality level
  - "auto" (default, recommended)
  - "low" (faster, fewer tokens)
  - "medium" (balanced)
  - "high" (highest quality, most tokens)
- **output_format**: File format for returned image
  - "png" (default)
  - "jpeg"
  - "webp"

### Advanced Parameters:
- **n**: Number of images to generate (1-10, default: 1)
- **moderation**: Content filtering strictness
  - "auto" (default, standard filtering)
  - Custom moderation levels available
- **user**: Unique identifier for end-user (for monitoring/abuse detection)

### File Upload Parameters (Edit & Variation):
- **image**: File stream or buffer (required for edit/variation)
- **mask**: File stream or buffer (optional for edit, indicates areas to regenerate)

---

## Key Features of GPT-Image-1

- **High-fidelity image generation** with detailed, accurate visuals
- **Diverse visual styles** from photorealistic to abstract art
- **Precise image editing** with targeted modifications
- **Rich world knowledge** for complex prompt understanding
- **Consistent text rendering** within images
- **Built-in safety features** with content policy compliance

---

## Important Notes

- **Organization verification required**: Must verify your organization with OpenAI to access gpt-image-1
- **Token-based pricing**: Cost depends on image size and quality (more tokens = higher cost)
- **Base64 responses**: Images are returned as base64-encoded strings, not URLs
- **Single image generation**: Unlike DALL-E, gpt-image-1 generates one image per request by default
- **No style parameters**: Unlike DALL-E 3, style is controlled entirely through the prompt
- **Content filtering**: All prompts and images are filtered against OpenAI's content policy