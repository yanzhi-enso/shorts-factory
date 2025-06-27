import { NextResponse } from 'next/server';
import { createSignedURL } from '../../../../utils/gcsUpload.js';

export async function POST(request) {
  try {
    const { 
      project_id: projectId,
      image_type: imageType
    } = await request.json();
    
    // Create signed URL using the centralized GCS utility
    const result = await createSignedURL(projectId, imageType);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      signed_url: result.signed_url,
      public_url: result.public_url,
      image_id: result.image_id
    });
    
  } catch (error) {
    console.error('Error in signed URL route:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
}
