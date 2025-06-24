import { NextResponse } from 'next/server';
import { klingClient } from 'services/kling';
import { downloadAndUploadToGCS, replaceUrlsInResponse } from 'utils/gcsUpload.js';
import { GCS_CONFIG } from 'constants/gcs.js';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const taskId = resolvedParams.taskId;
    
    // Get project_id from query parameters
    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');
    
    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id query parameter is required' },
        { status: 400 }
      );
    }
    
    // Use the server-side utility function to get task information
    const data = await klingClient.getTaskByIdFromKlingAPI(taskId);
    
    // Check if the task is completed and has video URLs
    if (data?.data?.task_status === 'succeed' && data?.data?.works) {
      const urlMapping = new Map();
      
      // Process each work item that has a video resource
      for (const work of data.data.works) {
        if (work?.resource?.resource && typeof work.resource.resource === 'string') {
          const originalUrl = work.resource.resource;
          
          // Skip if already processed (GCS URL)
          if (originalUrl.includes(GCS_CONFIG.BUCKET_NAME)) {
            continue;
          }
          
          console.log(`Processing video URL for GCS upload: ${originalUrl}`);
          
          // Download and upload to GCS
          const uploadResult = await downloadAndUploadToGCS(
            originalUrl,
            project_id,
            GCS_CONFIG.CONTENT_TYPES.VIDEO,
            GCS_CONFIG.FILE_EXTENSIONS.VIDEO
          );
          
          if (!uploadResult.success) {
            console.error('Failed to upload video to GCS:', uploadResult.error);
            return NextResponse.json(
              { error: `GCS upload failed: ${uploadResult.error}` },
              { status: 500 }
            );
          }
          
          // Map original URL to GCS URL
          urlMapping.set(originalUrl, uploadResult.gcsUrl);
          console.log(`Mapped ${originalUrl} -> ${uploadResult.gcsUrl}`);
        }
      }
      
      // Replace URLs in the response if any were processed
      if (urlMapping.size > 0) {
        const updatedData = replaceUrlsInResponse(data, urlMapping);
        return NextResponse.json(updatedData);
      }
    }
    
    // Return original data if no processing needed
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting task:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
