import { NextResponse } from 'next/server';
import { workflow } from 'workflow/text2image.js';

export async function POST(request) {
    try {
        const body = await request.json();

        // Extract camelCase parameters from HTTP payload
        const { prompt, n = 1 } = body;

        // Validate required parameter
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

        // Call the generation function
        const result = await workflow.generateImage(prompt, n);

        return NextResponse.json({ success: true, result });
    } catch (error) {
        if (error.message === 'CONTENT_MODERATION_BLOCKED') {
            return NextResponse.json(
                { error: 'CONTENT_MODERATION_BLOCKED' },
                { status: 403 }
            );
        } else {
            console.error('Error generating image:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }
    }
}

export const dynamic = 'force-dynamic';
