import { NextResponse } from 'next/server';
import { workflow } from 'workflow/image_gen.js';

export async function POST(request) {
    try {
        const body = await request.json();

        // Extract camelCase parameters from HTTP payload
        const {
            imageUrl, storyContext, globalChangeRequest, sceneDescription
        } = body;

        // Validate required parameter
        if (!imageUrl) {
            return NextResponse.json(
                { error: 'imageUrl is required' },
                { status: 400 }
            );
        }

        // Call the analysis function
        const result = await workflow.analysisImage(
            imageUrl, storyContext, globalChangeRequest, sceneDescription
        );

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error('Error analyzing image:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
