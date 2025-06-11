# OpenAI Image Edit API Reference (JavaScript SDK)

## Overview

Creates an edited or extended image given one or more source images and a prompt using the gpt-image-1 model.

---

## Setup

```javascript
import fs from "fs";
import { OpenAI, toFile } from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

---

## Basic Image Edit with GCS URLs

Edit images from GCS URLs:

```javascript
const imageUrls = [
  "https://storage.googleapis.com/bucket/path-bomb.png",
  "https://storage.googleapis.com/bucket/body-lotion.png", 
  "https://storage.googleapis.com/bucket/incense-kit.png",
  "https://storage.googleapis.com/bucket/soap.png"
];

const images = await Promise.all(
  imageUrls.map(async (url, index) => {
    const response = await fetch(url);
    return await toFile(response.body, `image_${index}.png`, {
      type: "image/png"
    });
  })
);

const rsp = await client.images.edit({
  model: "gpt-image-1",
  image: images,
  prompt: "Create a lovely gift basket with these four items",
  quality: "high",
  size: "1024x1536"
});

// Save the image to a file
const image_base64 = rsp.data[0].b64_json;
const image_bytes = Buffer.from(image_base64, "base64");
fs.writeFileSync("basket.png", image_bytes);
```

---

## Image Edit with Base64 Input

Edit an image from base64 format (e.g., from previous OpenAI response):

```javascript
// Convert base64 to file object
const base64String = "iVBORw0KGgoAAAANSUhEUgAAA..."; // from previous OpenAI response
const buffer = Buffer.from(base64String, 'base64');
const image = await toFile(buffer, "image.png", {
  type: "image/png"
});

const rsp = await client.images.edit({
  model: "gpt-image-1",
  image: image,
  prompt: "Add a magical glow effect to this image",
  quality: "high",
  size: "1024x1536"
});

console.log(rsp.data[0].b64_json);
```

---

## Image Edit with Mask from GCS

Edit specific regions using a mask from GCS:

```javascript
const imageResponse = await fetch("https://storage.googleapis.com/bucket/original.png");
const image = await toFile(imageResponse.body, "original.png", {
  type: "image/png"
});

const maskResponse = await fetch("https://storage.googleapis.com/bucket/mask.png");
const mask = await toFile(maskResponse.body, "mask.png", {
  type: "image/png"  
});

const rsp = await client.images.edit({
  model: "gpt-image-1",
  image: image,
  mask: mask,
  prompt: "Replace the masked area with a beautiful garden",
  quality: "high",
  size: "1024x1536"
});

console.log(rsp.data[0].b64_json);
```

---

## Multiple Image Generation from GCS

Generate multiple variations from a GCS image:

```javascript
const response = await fetch("https://storage.googleapis.com/bucket/original.png");
const image = await toFile(response.body, "original.png", {
  type: "image/png"
});

const rsp = await client.images.edit({
  model: "gpt-image-1",
  image: image,
  prompt: "Add magical sparkles and fairy dust throughout the scene",
  n: 3,
  quality: "high",
  size: "1024x1536"
});

// Process all generated variations
rsp.data.forEach((edit, index) => {
  const buffer = Buffer.from(edit.b64_json, 'base64');
  fs.writeFileSync(`edited_image_${index + 1}.png`, buffer);
});
```

---

## Parameters

### Required Parameters:

#### **image** (Required)
- **Type**: string or array
- **Description**: The image(s) to edit. Can provide up to 10 images
- **Supported formats**: PNG, WebP, or JPEG
- **Size limit**: Each image should be less than 50MB

#### **prompt** (Required)  
- **Type**: string
- **Description**: A text description of the desired image(s)
- **Max length**: 32000 characters

### Fixed Parameters:
- **model**: "gpt-image-1"
- **quality**: "high" 
- **size**: "1024x1536"

### Optional Parameters:

#### **mask** (Optional)
- **Type**: file
- **Description**: An additional image whose fully transparent areas indicate where image should be edited
- **Requirements**: Must be a PNG file with same dimensions as the source image

#### **n** (Optional)
- **Type**: integer
- **Default**: 1
- **Description**: The number of images to generate. Must be between 1 and 10

---

## Response Format

```javascript
{
  "created": 1713833620,
  "data": [
    {
      "b64_json": "..."
    }
  ],
  "usage": {
    "total_tokens": 100,
    "input_tokens": 50,
    "output_tokens": 50
  }
}
```

---

## Error Handling

```javascript
try {
  const response = await fetch("https://storage.googleapis.com/bucket/original.png");
  const image = await toFile(response.body, "original.png", {
    type: "image/png"
  });
  
  const rsp = await client.images.edit({
    model: "gpt-image-1",
    image: image,
    prompt: "Transform this into a beautiful artwork",
    quality: "high",
    size: "1024x1536"
  });
  
  console.log(rsp.data[0].b64_json);
} catch (error) {
  console.error('Error:', error.message);
}
```