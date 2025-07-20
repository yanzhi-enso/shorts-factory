import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { createEmptyProjectFolder } from '../../../services/gcs.js';

export async function POST(request) {
  const { video_url } = await request.json();
  
  // If no video URL provided, create empty project
  if (!video_url || video_url.trim() === '') {
    try {
      const projectId = uuidv4();
      
      // Create empty project folder using utility function
      const result = await createEmptyProjectFolder(projectId);
      
      if (!result.success) {
        console.error('Error creating empty project:', result.error);
        return NextResponse.json(
          { error: result.error || 'Failed to create empty project' },
          { status: 500 }
        );
      }
      
      console.log(`Empty project created with ID: ${projectId}`);
      return NextResponse.json({ project_id: projectId });
      
    } catch (error) {
      console.error('Error creating empty project:', error);
      return NextResponse.json(
        { error: 'Failed to create empty project' },
        { status: 500 }
      );
    }
  }

  try {
    // Run the Python script to process the video
    const pythonProcess = spawn('python', ['python/download_video.py', video_url]);
    
    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Wait for the Python process to complete
    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', resolve);
    });

    if (exitCode !== 0) {
      console.error(`Python script exited with code ${exitCode}: ${errorOutput}`);
      return NextResponse.json(
        { error: 'Video processing failed' },
        { status: 500 }
      );
    }

    // Extract project ID from output
    const projectIdMatch = output.match(/Project ID: (\S+)/);
    if (!projectIdMatch) {
      throw new Error('Project ID not found in script output');
    }
    
    const projectId = projectIdMatch[1];
    return NextResponse.json({ project_id: projectId });
    
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
