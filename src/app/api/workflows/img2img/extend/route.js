import { NextResponse } from 'next/server';
import { workflow } from 'workflow/image2image.js';
import { uploadBase64ToGCS } from 'utils/gcsUpload.js';
import { GCS_CONFIG } from 'constants/gcs.js';

export async function POST(request) {
    try {
        const body = await request.json();

        // Extract camelCase parameters from HTTP payload
        const { image_urls, prompt, n = 1, project_id, asset_type } = body;

        // Validate required parameter - image_urls array
        if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
            return NextResponse.json(
                { error: 'image_urls array is required and cannot be empty' },
                { status: 400 }
            );
        }

        // Validate image_urls array length (OpenAI limit)
        if (image_urls.length > 10) {
            return NextResponse.json(
                { error: 'image_urls array cannot contain more than 10 images' },
                { status: 400 }
            );
        }

        // Validate required parameter - prompt
        if (!prompt) {
            return NextResponse.json(
                { error: 'prompt is required' },
                { status: 400 }
            );
        }

        // Validate required parameters
        if (!project_id) {
            return NextResponse.json(
                { error: 'project_id is required' },
                { status: 400 }
            );
        }

        if (!asset_type) {
            return NextResponse.json(
                { error: 'asset_type is required' },
                { status: 400 }
            );
        }

        // Validate asset_type
        if (!GCS_CONFIG.FOLDERS[asset_type]) {
            return NextResponse.json(
                { error: `Invalid asset_type: ${asset_type}. Valid types: ${Object.keys(GCS_CONFIG.FOLDERS).join(', ')}` },
                { status: 400 }
            );
        }

        // Validate n parameter
        if (n && (typeof n !== 'number' || n < 1 || n > 10)) {
            return NextResponse.json(
                { error: 'n must be a number between 1 and 10' },
                { status: 400 }
            );
        }

        // Call the extend function (send request to openAI)
        const result = await workflow.extendImage(image_urls, prompt, n);

        // Return response with GCS URLs instead of base64 (clean format)
        const responseResult = {
            images: result,
            format: 'png',
            // created in ts format, eg 1713833628
            created: new Date.now(),
        };

        return NextResponse.json({ success: true, result: responseResult });
    } catch (error) {
        if (error.message === 'CONTENT_MODERATION_BLOCKED') {
            return NextResponse.json(
                { error: 'CONTENT_MODERATION_BLOCKED' },
                { status: 403 }
            );
        } else {
            console.error('Error extending image:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }
    }
}

export const dynamic = 'force-dynamic';
