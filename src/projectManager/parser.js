/**
 * Project Manager Parser Utilities
 * Handles data transformation between database and JavaScript formats
 * 
 * Data Structure Patterns:
 * - sceneImages: Single `gcs_url` per record (one image per scene image record)
 * - generatedImages & elementImages: `gcs_urls` array (multiple images from AI generation)
 * - All internal JS properties use camelCase, DB persistence uses snake_case
 */

import { getRecreatedSceneImages } from '../storage/scene.js';
import { getSceneClips } from '../storage/clip.js';

/**
 * Transform scene image from snake_case DB format to camelCase JS format
 * SceneImages have single gcs_url (not array)
 */
export const transformSceneImageToJS = (dbImage) => ({
    id: dbImage.id,
    sceneId: dbImage.scene_id,
    gcsUrl: dbImage.gcs_url,
    imageOrder: dbImage.image_order,
    createdAt: dbImage.created_at
});

/**
 * Transform generated image from snake_case DB format to camelCase JS format
 * GeneratedImages have gcs_urls array (multiple images from AI generation)
 */
export const transformGeneratedImageToJS = (dbImage) => ({
    id: dbImage.id,
    sceneId: dbImage.scene_id,
    gcsUrls: dbImage.gcs_urls,
    selectedImageIdx: dbImage.selected_image_idx || 0,
    generationSources: dbImage.generation_sources,
    createdAt: dbImage.created_at
});

/**
 * Transform element image from snake_case DB format to camelCase JS format
 * ElementImages have gcs_urls array (multiple images from AI generation)
 */
export const transformElementImageToJS = (dbImage) => ({
    id: dbImage.id,
    projectId: dbImage.project_id,
    gcsUrls: dbImage.gcs_urls,
    selectedImageIdx: dbImage.selected_image_idx || 0,
    generationSources: dbImage.generation_sources,
    name: dbImage.name,
    description: dbImage.description,
    tags: dbImage.tags,
    createdAt: dbImage.created_at
});

/**
 * Transform project settings from snake_case DB format to camelCase JS format
 * ProjectSettings contain project-level configuration and preferences
 * 
 * Fields extracted:
 * - storyDescription: User-provided story context and narrative description
 * - image_size: Image aspect ratio preference (portrait/landscape/square)
 * - isAdvMode: Advanced mode toggle for enhanced functionality and features
 */
export const transformProjectSettingsToJS = (dbSettings) => ({
    storyDescription: dbSettings.story_description || '',
    imageSize: dbSettings.image_size || 'portrait',
    isAdvMode: dbSettings.is_adv_mode || false
});

/**
 * Transform scene clip from snake_case DB format to camelCase JS format
 */
export const transformSceneClipToJS = (dbClip) => ({
    id: dbClip.id,
    sceneId: dbClip.scene_id,
    gcsUrl: dbClip.gcs_url,
    generationSources: dbClip.generation_sources,
    createdAt: dbClip.created_at
});

/**
 * Transform scene from snake_case DB format to camelCase JS format
 */
export const transformSceneToJS = (dbScene) => ({
    id: dbScene.id,
    projectId: dbScene.project_id,
    sceneOrder: dbScene.scene_order,
    isSelected: dbScene.is_selected,
    selectedImageId: dbScene.selected_image_id,
    selectedGeneratedImageId: dbScene.selected_generated_image_id,
    selectedSceneClipId: dbScene.selected_clip_id,
    settings: dbScene.settings,
    createdAt: dbScene.created_at
});

/**
 * Organize scene images by scene ID for efficient lookup
 */
export const organizeSceneImagesBySceneId = (scenes, sceneImages) => {
    const sceneImagesMap = {};
    scenes.forEach(scene => {
        sceneImagesMap[scene.id] = sceneImages.filter(
            img => img.scene_id === scene.id
        );
    });
    return sceneImagesMap;
};

/**
 * Private helper to enrich raw scenes with embedded scene images, generated images, scene clips, and resolved selected URLs
 * Transforms snake_case DB properties to camelCase for internal JavaScript use
 * 
 * PROJECT SETTINGS STRUCTURE DOCUMENTATION
 * 
 * ProjectSettings contain project-level configuration that affects the entire project and all its scenes:
 * {
 *   storyDescription: string,      // User-provided story context and narrative description
 *   imageSize: string,             // Image aspect ratio preference (portrait/landscape/square)
 *   isAdvMode: boolean             // Advanced mode toggle for enhanced functionality and features
 * }
 * 
 * The ProjectSettings are stored in the project record's settings field and transformed via transformProjectSettingsToJS().
 * These settings influence generation behavior, UI features, and processing options across all project components.
 * 
 * ENRICHED SCENE STRUCTURE DOCUMENTATION
 * 
 * The ProjectManager transforms raw database scenes into enriched scenes for easier consumption by UI components.
 * This hides database schema complexity and provides a more product-logic focused data structure.
 * 
 * Raw DB Structure (from projectStorage):
 * - scenes: Array of scene objects with selected_image_id and selected_generated_image_id (foreign key references)
 * - sceneImages: Separate array of all scene images across all scenes
 * - recreatedSceneImages: Separate array of all generated images across all scenes
 * - elementImages: Separate array of all element images for the project (project-level resources)
 * - project.settings: Project-level ProjectSettings (storyDescription, imageSize, isAdvMode)
 * 
 * Enriched Structure (provided by ProjectManager):
 * {
 *   id: number,                    // Scene ID
 *   projectId: string,             // Parent project ID
 *   sceneOrder: number,            // Ordering for display (gap-based: 100, 200, 300...)
 *   isSelected: boolean,           // Whether user selected this scene for processing
 *   selectedImage: string|null,    // URL of selected original image (transformed from selected_image_id)
 *   selectedImageId: number|null,  // Selected original image ID (DB storage reference)
 *   sceneImages: Array[{           // All original images belonging to this scene
 *     id: number,                  // Image ID
 *     sceneId: number,             // Parent scene ID
 *     gcsUrl: string,              // Image URL
 *     imageOrder: number,          // Order within scene
 *     createdAt: string            // Creation timestamp
 *   }],
 *   generatedImages: Array[{       // All generated images for this scene
 *     id: number,                  // Generated image ID
 *     sceneId: number,             // Parent scene ID
 *     gcsUrls: Array[string],      // Array of generated image URLs
 *     selectedImageIdx: number,    // Index of selected image within gcsUrls array
 *     generationSources: object|null, // Sources used for generation
 *     createdAt: string            // Creation timestamp
 *   }],
 *   selectedGeneratedImageId: number|null,  // Selected generated image ID (DB storage reference)
 *   selectedGeneratedImage: string|null,    // URL of selected generated image (derived from selectedGeneratedImageId)
 *   sceneClips: Array[{            // All generated clips for this scene
 *     id: number,                  // Generated clip ID
 *     sceneId: number,             // Parent scene ID
 *     gcsUrl: string,              // Generated clip URL
 *     generationSources: object|null, // Sources used for generation
 *     createdAt: string            // Creation timestamp
 *   }],
 *   selectedSceneClip: string|null,         // URL of selected generated clip
 *   selectedSceneClipId: number|null,       // Selected generated clip ID (DB storage reference)
 *   settings: object,              // Scene-specific configuration
 *   createdAt: string              // Scene creation timestamp
 * }
 * 
 * Key Transformations:
 * 1. selected_image_id → selectedImage (ID reference → actual URL string)
 * 2. selected_generated_image_id → selectedGeneratedImage (ID reference → actual URL string)
 * 3. Separate sceneImages array → embedded sceneImages per scene
 * 4. Separate recreatedSceneImages array → embedded generatedImages per scene
 * 5. Separate elementImages array → project-level elementImages (not scene-specific)
 * 6. All internal JS properties use camelCase, DB persistence still uses snake_case
 */
export const enrichScenes = async (rawScenes, sceneImagesMap) => {
    const enrichedScenes = [];
    
    for (const scene of rawScenes) {
        const rawSceneImages = sceneImagesMap[scene.id] || [];
        const selectedImageId = scene.selected_image_id || null;
        const selectedImage = selectedImageId 
            ? rawSceneImages.find(img => img.id === selectedImageId)?.gcs_url || null
            : null;
        
        // Transform scene images to camelCase
        const sceneImages = rawSceneImages.map(transformSceneImageToJS);
        
        // Load generated images for this scene
        const rawGeneratedImages = await getRecreatedSceneImages(scene.id);
        
        // Transform generated images to camelCase and handle multi-image structure
        const generatedImages = rawGeneratedImages.map(transformGeneratedImageToJS);
        
        // Determine selected generated image (fallback to most recent if selectedGeneratedImageId is null)
        const selectedGeneratedImageId = scene.selected_generated_image_id || 
                                       (generatedImages.length > 0 ? generatedImages[0].id : null);
        
        // Derive the selected generated image URL for easier consumption by UI components
        const selectedGeneratedImage = selectedGeneratedImageId 
            ? (() => {
                const selectedImageData = generatedImages.find(img => img.id === selectedGeneratedImageId);
                if (selectedImageData && selectedImageData.gcsUrls && selectedImageData.gcsUrls.length > 0) {
                    return selectedImageData.gcsUrls[selectedImageData.selectedImageIdx] || selectedImageData.gcsUrls[0];
                }
                return null;
            })()
            : null;
        
        // Load generated clips for this scene
        const rawSceneClips = await getSceneClips(scene.id);
        
        // Transform scene clips to camelCase
        const sceneClips = rawSceneClips.map(transformSceneClipToJS);
        
        // Determine selected scene clip (fallback to most recent if selectedSceneClipId is null)
        const selectedSceneClipId = scene.selected_clip_id || 
                                  (sceneClips.length > 0 ? sceneClips[0].id : null);
        const selectedSceneClip = selectedSceneClipId 
            ? sceneClips.find(clip => clip.id === selectedSceneClipId)?.gcsUrl || null
            : null;
        
        // Transform scene properties to camelCase and add all fields
        enrichedScenes.push({
            id: scene.id,
            projectId: scene.project_id,
            sceneOrder: scene.scene_order,
            isSelected: scene.is_selected,
            title: scene.title || null, // Assuming title is added in DB schema
            selectedImage: selectedImage,
            selectedImageId: selectedImageId,
            sceneImages: sceneImages,
            generatedImages: generatedImages,
            selectedGeneratedImageId: selectedGeneratedImageId,
            selectedGeneratedImage: selectedGeneratedImage,
            sceneClips: sceneClips,
            selectedSceneClip: selectedSceneClip,
            selectedSceneClipId: selectedSceneClipId,
            settings: scene.settings,
            createdAt: scene.created_at,
        });
    }
    
    return enrichedScenes;
};
