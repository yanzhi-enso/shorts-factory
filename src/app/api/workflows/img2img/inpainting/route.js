import { NextResponse } from 'next/server';
import { workflow } from '../../../../../../workflow/image2image.js';

export async function POST(request) {
    try {
        const body = await request.json();

        // Extract camelCase parameters from HTTP payload
        const { image, mask, prompt, n = 1 } = body;

        // Validate required parameter - image
        if (!image) {
            return NextResponse.json(
                { error: 'image is required' },
                { status: 400 }
            );
        }

        // Validate required parameter - mask
        if (!mask) {
            return NextResponse.json(
                { error: 'mask is required' },
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

        // Validate n parameter
        if (n && (typeof n !== 'number' || n < 1 || n > 10)) {
            return NextResponse.json(
                { error: 'n must be a number between 1 and 10' },
                { status: 400 }
            );
        }

        // Call the inpainting function
        const result = await workflow.inpaintingImage(image, mask, prompt, n);

        return NextResponse.json({ success: true, result });
    } catch (error) {
        if (error.message === 'CONTENT_MODERATION_BLOCKED') {
            return NextResponse.json(
                { error: 'CONTENT_MODERATION_BLOCKED' },
                { status: 403 }
            );
        } else {
            console.error('Error inpainting image:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }
    }
}

export const dynamic = 'force-dynamic';
