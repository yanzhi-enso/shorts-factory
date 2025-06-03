import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { project_id } = await params;
  
  try {
    // Fetch the file_list.txt from public GCS URL
    const response = await fetch(
      `https://storage.googleapis.com/shorts-scenes/${project_id}/file_list.txt`
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'File list not found for this project' },
        { status: 404 }
      );
    }
    
    // Get the raw text content and split into lines
    const textContent = await response.text();
    const lines = textContent.split('\n').filter(line => line.trim() !== '');
    
    // Return complete file list - let client decide what to render
    return NextResponse.json({ files: lines });
    
  } catch (error) {
    console.error('Error fetching file list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
