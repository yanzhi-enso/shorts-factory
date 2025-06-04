# OpenAI GPT-Image-1 API Reference

## 1. Create Image (GPT-Image-1)

**URL:** `https://api.openai.com/v1/images/generations`

**Method:** `POST`

**Payload:**
```json
{
  "prompt": "A cute baby sea otter floating on its back in calm blue water",
  "model": "gpt-image-1",
  "size": "1024x1024",
  "quality": "auto",
  "output_format": "png",
  "moderation": "auto",
  "user": "user-1234"
}
```

**Response Format:**
```json
{
  "created": 1589478378,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAAA...",
      "revised_prompt": "A cute baby sea otter floating on its back in calm blue water, with whiskers and dark eyes visible..."
    }
  ]
}
```

---

## 2. Create Image Edit (GPT-Image-1)

**URL:** `https://api.openai.com/v1/images/edits`

**Method:** `POST`

**Payload:** (multipart/form-data)
```
image: [file] (required) - Base64 encoded image or file upload
mask: [file] (optional) - Base64 encoded mask indicating areas to edit
prompt: "Add a sunlit indoor lounge area with a pool" (required)
model: "gpt-image-1"
size: "1024x1024"
quality: "auto"
output_format: "png"
moderation: "auto"
user: "user-1234"
```

**Response Format:**
```json
{
  "created": 1589478378,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAAA...",
      "revised_prompt": "Add a sunlit indoor lounge area with a pool to the existing image..."
    }
  ]
}
```

---

## 3. Create Image Variation (GPT-Image-1)

**URL:** `https://api.openai.com/v1/images/variations`

**Method:** `POST`

**Payload:** (multipart/form-data)
```
image: [file] (required) - Base64 encoded image or file upload
prompt: "Create variations of this image" (optional but recommended)
model: "gpt-image-1"
size: "1024x1024"
quality: "auto"
output_format: "png"
moderation: "auto"
user: "user-1234"
```

**Response Format:**
```json
{
  "created": 1589478378,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAAA...",
      "revised_prompt": "Variations of the provided image maintaining similar composition and style..."
    }
  ]
}
```

---

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

### Safety & Moderation:
- **moderation**: Content filtering strictness
  - "auto" (default, standard filtering)
  - Custom moderation levels available

### Optional:
- **user**: Unique identifier for end-user (for monitoring/abuse detection)

## Key Features of GPT-Image-1

- **High-fidelity image generation** with detailed, accurate visuals
- **Diverse visual styles** from photorealistic to abstract art
- **Precise image editing** with targeted modifications
- **Rich world knowledge** for complex prompt understanding
- **Consistent text rendering** within images
- **Built-in safety features** with content policy compliance

## Authentication

Include in headers:
```
Authorization: Bearer YOUR_API_KEY
```

## Important Notes

- **Organization verification required**: Must verify your organization with OpenAI to access gpt-image-1
- **Token-based pricing**: Cost depends on image size and quality (more tokens = higher cost)
- **Base64 responses**: Images are returned as base64-encoded strings, not URLs
- **Single image generation**: Unlike DALL-E, gpt-image-1 generates one image per request
- **No style parameters**: Unlike DALL-E 3, style is controlled entirely through the prompt
- **Content filtering**: All prompts and images are filtered against OpenAI's content policy