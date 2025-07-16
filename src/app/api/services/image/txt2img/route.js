import { NextResponse } from 'next/server';
import { generateImage } from 'workflow/image_gen.js';
import { GCS_CONFIG } from 'constants/gcs.js';

export async function POST(request) {
    try {
        const body = await request.json();

        // Extract camelCase parameters from HTTP payload
        const { prompt, size, n = 1, project_id, asset_type } = body;

        // Validate required parameters
        if (!prompt) {
            return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
        }

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

        // Call the generation function
        const images = await generateImage(prompt, size, n, project_id, asset_type);

        // Return response with GCS URLs instead of base64 (clean format)
        return NextResponse.json({
            success: true,
            data: {
                images,
                format: 'png',
                created: new Date().toISOString(),
            },
        });
    } catch (error) {
        if (error.message === 'CONTENT_MODERATION_BLOCKED') {
            return NextResponse.json({ error: 'CONTENT_MODERATION_BLOCKED' }, { status: 403 });
        } else {
            console.error('Error generating image:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }
}

export const dynamic = 'force-dynamic';
