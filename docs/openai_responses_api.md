# OpenAI Responses API Reference - Image Analysis (JavaScript SDK)

## Overview

The Responses API provides image analysis capabilities using the OpenAI JavaScript SDK, allowing you to analyze images, extract information, and perform vision tasks using OpenAI's multimodal models.

---

## Setup

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

---

## Image Analysis Request

**Basic Image Analysis:**
```javascript
const response = await client.responses.create({
  model: "o4-mini",
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: "What do you see in this image?"
        },
        {
          type: "input_image",
          image_url: "https://example.com/image.jpg"
        }
      ]
    }
  ]
});

console.log(response.output_text);
```

**Response Object:**
```javascript
{
  id: "resp_67cb61fa3a448190bcf2c42d96f0d1a8",
  status: "completed",
  created: 1589478378,
  model: "gpt-4o",
  output: [
    {
      type: "message",
      role: "assistant",
      content: "I can see a sunny beach scene with palm trees, ocean waves, and people enjoying the beach. The image shows a tropical setting with clear blue skies."
    }
  ],
  output_text: "I can see a sunny beach scene with palm trees...",
  usage: {
    prompt_tokens: 1150,
    completion_tokens: 45,
    total_tokens: 1195
  }
}
```

---

## Base64 Image Input

```javascript
const response = await client.responses.create({
  model: "o4-mini",
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Analyze this image and extract any text you see"
        },
        {
          type: "input_image",
          image_url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
        }
      ]
    }
  ]
});
```

---

## Structured Output for Image Analysis

```javascript
const response = await client.responses.create({
  model: "o4-mini",
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Describe this image"
        },
        {
          type: "input_image",
          image_url: "https://example.com/image.jpg"
        }
      ]
    }
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "image_analysis",
      schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          objects: {
            type: "array",
            items: { type: "string" }
          },
          colors: {
            type: "array", 
            items: { type: "string" }
          },
          setting: { type: "string" }
        },
        required: ["description", "objects", "colors"],
        additionalProperties: false
      },
      strict: true
    }
  }
});

const analysis = JSON.parse(response.output_text);
console.log(analysis.description);
console.log(analysis.objects);
```

---

## Scene Description Example

```javascript
const response = await client.responses.create({
  model: "o4-mini",
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Describe the scene in detail"
        },
        {
          type: "input_image",
          image_url: "https://example.com/image.jpg"
        }
      ]
    }
  ]
});

console.log(response.output_text);
```

---

## Streaming Response

```javascript
const stream = await client.responses.create({
  model: "o4-mini",
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Describe this image in detail"
        },
        {
          type: "input_image",
          image_url: "https://example.com/image.jpg"
        }
      ]
    }
  ],
  stream: true
});

for await (const event of stream) {
  if (event.output && event.output.length > 0) {
    console.log(event.output[0].content);
  }
}
```

---

## Key Parameters for Image Analysis

### Model Options:
- **"o4-mini"** - Fast, cost-efficient reasoning model with strong image analysis (recommended)
- **"o3"** - Most powerful reasoning model for complex visual tasks
- **"gpt-4o"** - Traditional multimodal model (alternative option)
- **"gpt-4o-mini"** - Traditional multimodal model, cost-effective

### Image Parameters:
- **image_url**: Direct image URL or base64 data URI (no nested object required)
- **type**: Use `"input_text"` for text and `"input_image"` for images

### Response Format Options:
- **Default**: Free-form text description
- **Structured**: JSON schema for consistent output format

---

## Error Handling

```javascript
try {
  const response = await client.responses.create({
    model: "o4-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Analyze this image"
          },
          {
            type: "input_image",
            image_url: "https://example.com/image.jpg"
          }
        ]
      }
    ]
  });

  console.log(response.output_text);
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

## Supported Image Formats

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png) 
- **GIF** (.gif)
- **WebP** (.webp)

## Image Size Limits

- **Maximum file size**: 20MB
- **Maximum dimensions**: No specific limit, but larger images use more tokens
- **Recommended**: Use appropriate detail level based on your use case

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