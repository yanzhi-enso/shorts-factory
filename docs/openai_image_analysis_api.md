# OpenAI Responses API Reference - Image Analysis

## Overview

The Responses API provides image analysis capabilities, allowing you to analyze images, extract information, and perform vision tasks using OpenAI's multimodal models.

---

## Image Analysis Request

**URL:** `https://api.openai.com/v1/responses`

**Method:** `POST`

**Payload:**
```json
{
  "model": "gpt-4o",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What do you see in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.jpg",
            "detail": "high"
          }
        }
      ]
    }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "image_analysis",
      "schema": {
        "type": "object",
        "properties": {
          "description": {"type": "string"},
          "objects": {
            "type": "array",
            "items": {"type": "string"}
          },
          "colors": {
            "type": "array", 
            "items": {"type": "string"}
          }
        }
      }
    }
  }
}
```

**Response Format:**
```json
{
  "id": "resp_67cb61fa3a448190bcf2c42d96f0d1a8",
  "status": "completed",
  "created": 1589478378,
  "model": "gpt-4o",
  "output": [
    {
      "type": "message",
      "role": "assistant",
      "content": "{\"description\": \"A sunny beach scene with palm trees\", \"objects\": [\"palm trees\", \"ocean\", \"sand\", \"people\"], \"colors\": [\"blue\", \"yellow\", \"green\", \"white\"]}"
    }
  ],
  "usage": {
    "prompt_tokens": 1150,
    "completion_tokens": 45,
    "total_tokens": 1195
  }
}
```

---

## Base64 Image Input

**Payload with Base64:**
```json
{
  "model": "gpt-4o",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Analyze this image and extract any text you see"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
            "detail": "high"
          }
        }
      ]
    }
  ]
}
```

---

## Key Parameters for Image Analysis

### Core Parameters:
- **model**: "gpt-4o" or "gpt-4o-mini" (vision-capable models)
- **input**: Array containing text and image content

### Image Parameters:
- **url**: Image URL or base64 data URI
- **detail**: Image resolution for analysis
  - `"low"` - 512x512 resolution, faster, cheaper
  - `"high"` - Higher resolution, more detailed analysis, more expensive
  - `"auto"` - Model chooses based on image size

### Response Format:
- **response_format**: Structure the image analysis output
  - `{"type": "text"}` - Free-form text description
  - `{"type": "json_schema"}` - Structured JSON output

---

## Scene Description Example

```json
{
  "input": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Describe the scene in detail"},
        {"type": "image_url", "image_url": {"url": "...", "detail": "high"}}
      ]
    }
  ]
}
```

---

## Supported Image Formats

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png) 
- **GIF** (.gif)
- **WebP** (.webp)

---

## Image Size Limits

- **Maximum file size**: 20MB
- **Maximum dimensions**: No specific limit, but larger images use more tokens
- **Recommended**: Use appropriate detail level based on your use case

---

## Authentication

Include in headers:
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

---

## Image Analysis Features

- **Object detection and identification**
- **Text extraction (OCR) from images**
- **Scene and context understanding**
- **Color and visual element analysis**
- **Spatial relationship understanding**
- **Image classification and categorization**
- **Detailed image descriptions**
- **Visual question answering**

---

## Token Usage for Images

Token consumption varies by image size and detail level:
- **Low detail**: ~85 tokens per image
- **High detail**: ~170 tokens + additional tokens based on image dimensions
- **Cost consideration**: Use "low" detail for simple analysis, "high" for detailed inspection