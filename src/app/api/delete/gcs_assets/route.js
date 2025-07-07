import { Storage } from "@google-cloud/storage";
import { GCS_CONFIG } from "constants/gcs.js";

// Initialize Google Cloud Storage client
const storage = new Storage();
const bucket = storage.bucket(GCS_CONFIG.BUCKET_NAME);

/**
 * Extract GCS file path from public URL
 * @param {string} publicUrl - Public GCS URL
 * @returns {string|null} GCS file path or null if invalid URL
 */
function extractGCSPath(publicUrl) {
    try {
        const baseUrl = `${GCS_CONFIG.BASE_URL}/${GCS_CONFIG.BUCKET_NAME}/`;
        if (!publicUrl.startsWith(baseUrl)) {
            return null;
        }
        return publicUrl.substring(baseUrl.length);
    } catch (error) {
        console.error('Error extracting GCS path:', error);
        return null;
    }
}

/**
 * Delete GCS assets in batch
 * POST /api/delete/gcs_assets
 */
export async function POST(request) {
    try {
        const { urls } = await request.json();

        // Validate input
        if (!Array.isArray(urls) || urls.length === 0) {
            return Response.json(
                { error: 'urls must be a non-empty array' },
                { status: 400 }
            );
        }

        console.log(`Starting batch deletion of ${urls.length} GCS assets`);

        const deletionResults = [];
        const errors = [];

        // Process each URL
        for (const gcsUrl of urls) {
            const filePath = extractGCSPath(gcsUrl);
            
            if (!filePath) {
                console.warn(`Invalid GCS URL format: ${gcsUrl}`);
                // Skip invalid URLs but don't fail the operation
                continue;
            }

            try {
                const file = bucket.file(filePath);
                await file.delete();
                
                console.log(`Successfully deleted GCS asset: ${gcsUrl}`);
                deletionResults.push({ url: gcsUrl, success: true });
                
            } catch (error) {
                // Check if file doesn't exist (404 error) - this is acceptable
                if (error.code === 404 || error.message.includes('No such object')) {
                    console.log(`GCS asset already deleted or doesn't exist: ${gcsUrl}`);
                    deletionResults.push({ url: gcsUrl, success: true, note: 'already_deleted' });
                } else {
                    // Real error - this should fail the operation
                    const errorMsg = `Failed to delete ${gcsUrl}: ${error.message}`;
                    console.error(errorMsg);
                    errors.push(errorMsg);
                    deletionResults.push({ url: gcsUrl, success: false, error: error.message });
                }
            }
        }

        // If any real errors occurred, halt the process
        if (errors.length > 0) {
            console.error(`GCS batch deletion failed with ${errors.length} errors:`, errors);
            return Response.json(
                { 
                    error: 'Failed to delete some GCS assets',
                    details: errors,
                    results: deletionResults
                },
                { status: 500 }
            );
        }

        // Success - log the operation
        console.log(`Successfully deleted all GCS assets in batch:`, urls);

        return Response.json({
            success: true,
            message: `Successfully deleted ${urls.length} GCS assets`,
            results: deletionResults
        });

    } catch (error) {
        console.error('Error in GCS batch deletion endpoint:', error);
        return Response.json(
            { error: `Internal server error: ${error.message}` },
            { status: 500 }
        );
    }
}
