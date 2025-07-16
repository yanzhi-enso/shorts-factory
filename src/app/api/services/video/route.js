import { NextResponse } from 'next/server';
import { klingClient } from 'services/kling';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Use the server-side utility function to create a video
    const data = await klingClient.createVideoOnKlingAPI(body);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating video:', error);
    
    // Check if this is a throttling error
    const errorMessage = error.message || '';
    if (errorMessage.includes('parallel task over resource pack limit')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
