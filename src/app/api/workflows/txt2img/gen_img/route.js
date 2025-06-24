import { NextResponse } from 'next/server';
import { workflow } from 'workflow/text2image.js';
import { uploadBase64ToGCS } from 'utils/gcsUpload.js';
import { GCS_CONFIG } from 'constants/gcs.js';

export async function POST(request) {
    try {
        const body = await request.json();

        // Extract camelCase parameters from HTTP payload
        const { prompt, n = 1, project_id } = body;

        // Validate required parameters
        if (!prompt) {
            return NextResponse.json(
                { error: 'prompt is required' },
                { status: 400 }
            );
        }

        if (!project_id) {
            return NextResponse.json(
                { error: 'project_id is required' },
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

        // Upload images to GCS and replace base64 with URLs
        const processedImages = [];
        let singleImageUrl = null;

        if (result?.images && Array.isArray(result.images)) {
            // Handle multiple images
            for (const imgData of result.images) {
                const uploadResult = await uploadBase64ToGCS(
                    imgData.imageBase64,
                    project_id,
                    GCS_CONFIG.CONTENT_TYPES.IMAGE,
                    GCS_CONFIG.FILE_EXTENSIONS.IMAGE
                );

                if (!uploadResult.success) {
                    console.error('Failed to upload image to GCS:', uploadResult.error);
                    return NextResponse.json(
                        { error: `GCS upload failed: ${uploadResult.error}` },
                        { status: 500 }
                    );
                }

                processedImages.push({
                    imageUrl: uploadResult.gcsUrl,
                    revisedPrompt: imgData.revisedPrompt
                });

                // Set single image URL for backward compatibility
                if (!singleImageUrl) {
                    singleImageUrl = uploadResult.gcsUrl;
                }
            }
        } else if (result?.imageBase64) {
            // Handle single image (backward compatibility)
            const uploadResult = await uploadBase64ToGCS(
                result.imageBase64,
                project_id,
                GCS_CONFIG.CONTENT_TYPES.IMAGE,
                GCS_CONFIG.FILE_EXTENSIONS.IMAGE
            );

            if (!uploadResult.success) {
                console.error('Failed to upload image to GCS:', uploadResult.error);
                return NextResponse.json(
                    { error: `GCS upload failed: ${uploadResult.error}` },
                    { status: 500 }
                );
            }

            singleImageUrl = uploadResult.gcsUrl;
            processedImages.push({
                imageUrl: uploadResult.gcsUrl,
                revisedPrompt: result.revisedPrompt
            });
        }

        // Return response with GCS URLs instead of base64
        const responseResult = {
            images: processedImages,
            imageUrl: singleImageUrl, // For backward compatibility
            revisedPrompt: result.revisedPrompt,
            format: 'png',
            created: result.created
        };

        return NextResponse.json({ success: true, result: responseResult });
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
