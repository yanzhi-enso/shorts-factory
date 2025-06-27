import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';

// Initialize Google Cloud Storage client
// Uses service account credentials automatically from environment
const storage = new Storage();
const bucket = storage.bucket('shorts-scenes');

export async function POST(request) {
  try {
    const { 
      project_id: projectId,
      bucket_type: bucketType
    } = await request.json();
    
    if (!projectId || !bucketType) {
      return NextResponse.json(
        { error: 'Missing project_id parameter' },
        { status: 400 }
      );
    }

    // Generate unique image ID
    const image_id = randomUUID();
    
    // Create GCS file path following the pattern: {project_id}/generated_img/{image_id}.png
    const fileName = `${project_id}/generated_img/${image_id}.png`;
    
    // Generate signed URL for PUT operation (15 minutes expiration)
    const [signedUrl] = await bucket.file(fileName).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: 'image/png',
    });
    
    // Generate public URL (bucket is public)
    const publicUrl = `https://storage.googleapis.com/shorts-scenes/${fileName}`;
    
    return NextResponse.json({
      signed_url: signedUrl,
      public_url: publicUrl,
      image_id: image_id
    });
    
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
}
