import { NextResponse } from 'next/server';
import { workflow } from '../../../../../../workflow/image2image.js';

export async function POST(request) {
    try {
        const body = await request.json();

        // Extract camelCase parameters from HTTP payload
        const { images, prompt, n = 1 } = body;

        // Validate required parameter - images array
        if (!images || !Array.isArray(images) || images.length === 0) {
            return NextResponse.json(
                { error: 'images array is required and cannot be empty' },
                { status: 400 }
            );
        }

        // Validate images array length (OpenAI limit)
        if (images.length > 10) {
            return NextResponse.json(
                { error: 'images array cannot contain more than 10 images' },
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

        // Call the extend function
        const result = await workflow.extendImage(images, prompt, n);

        return NextResponse.json({ success: true, result });
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
