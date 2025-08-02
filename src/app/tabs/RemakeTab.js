"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FaBookOpen, FaDownload, FaCompress, FaExpand } from 'react-icons/fa';
import { FaMagic, FaImages } from 'react-icons/fa';
import React from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import styles from './RemakeTab.module.css';
import { useProjectManager } from 'projectManager/useProjectManager';
import SceneRow from 'app/components/remake/SceneRow/SceneRow';
import ElementImageList from 'app/components/remake/ElementList/ElementImageList';
import ElementGenModal from 'app/components/remake/ElementGenModal';
import AddSceneButton from 'app/components/remake/AddSceneButton/AddSceneButton';
import ReferenceImageSelectionModal from 'app/components/common/ReferenceImageSelectionModal';
import SceneGenHistoryModal from 'app/components/remake/SceneGenHistoryModal';
import SceneInpaintingModal from 'app/components/remake/SceneInpaintingModal';

// Memoized SceneRow to prevent unnecessary re-renders
const MemoizedSceneRow = React.memo(SceneRow);

const RemakeTab = ({
    onBackToScenes,
    onNext,
    onError,
    onSettingsClick,
    onExportStart,
    onExportEnd,
}) => {
    const { projectState } = useProjectManager();

    // Centralized collapse state management (optimized)
    const [sceneCollapseStates, setSceneCollapseStates] = useState({});
    const [isExporting, setIsExporting] = useState(false);
    const [bulkCollapseState, setBulkCollapseState] = useState('mixed'); // 'expanded', 'collapsed', 'mixed'
    const [referenceModalState, setReferenceModalState] = useState({
        isOpen: false,
        scene: null,
    });
    const [sceneHistoryModal, setSceneHistoryModal] = useState({
        isOpen: false,
        scene: null,
        onEditFromHistory: null,
    });

    // Inpainting modal state
    const [sceneInpaintingModal, setSceneInpaintingModal] = useState({
        isOpen: false,
        inpaintingData: null,
    });

    // Get selected scenes from ProjectManager
    const selectedScenes = useMemo(
        () => (projectState.scenes || []).filter((scene) => scene.isSelected),
        [projectState.scenes]
    );

    // Get story config from ProjectManager
    const storyConfig = projectState.currentProject?.settings || {};

    // Toggle individual scene collapse state (optimized with useCallback)
    const toggleSceneCollapse = useCallback((sceneId) => {
        setSceneCollapseStates((prev) => ({
            ...prev,
            [sceneId]: !prev[sceneId],
        }));
    }, []);

    // Calculate bulk state based on actual scene collapse states
    useEffect(() => {
        if (selectedScenes.length === 0) {
            setBulkCollapseState('mixed');
            return;
        }

        const collapsedCount = selectedScenes.filter(
            (scene) => sceneCollapseStates[scene.id] === true
        ).length;

        if (collapsedCount === 0) {
            setBulkCollapseState('expanded');
        } else if (collapsedCount === selectedScenes.length) {
            setBulkCollapseState('collapsed');
        } else {
            setBulkCollapseState('mixed');
        }
    }, [sceneCollapseStates, selectedScenes]);

    // Bulk collapse/expand handlers (optimized)
    const handleCollapseAll = useCallback(() => {
        const newStates = {};
        selectedScenes.forEach((scene) => {
            newStates[scene.id] = true;
        });
        setSceneCollapseStates(newStates);
    }, [selectedScenes]);

    const handleExpandAll = useCallback(() => {
        const newStates = {};
        selectedScenes.forEach((scene) => {
            newStates[scene.id] = false;
        });
        setSceneCollapseStates(newStates);
    }, [selectedScenes]);

    // Empty bulk operation handlers (to be implemented later)
    // const handlePromptGenAll = () => {
    //     console.log('Bulk prompt generation not implemented yet');
    // };

    // const handleImageGenAll = () => {
    //     console.log('Bulk image generation not implemented yet');
    // };

    const handleExport = async () => {
        if (isExporting) return;

        // Filter scenes that have a selected generated image using enriched fields
        const imagesToExport = selectedScenes.filter((scene) => scene.selectedGeneratedImage);

        if (imagesToExport.length === 0) {
            alert('No images to export. Please generate or upload some images first.');
            return;
        }

        setIsExporting(true);
        if (onExportStart) onExportStart('images');

        try {
            const zip = new JSZip();

            // Add each selected image to the zip
            for (let i = 0; i < imagesToExport.length; i++) {
                const scene = imagesToExport[i];
                const sceneDisplayName = `Scene-${i + 1}`;

                try {
                    const response = await fetch(scene.selectedGeneratedImage);
                    if (!response.ok) {
                        throw new Error(
                            `Failed to fetch image for ${sceneDisplayName}: ${response.statusText}`
                        );
                    }
                    const imageBlob = await response.blob();
                    zip.file(`scene-${i + 1}.png`, imageBlob);
                } catch (error) {
                    console.error(`Error processing image for ${sceneDisplayName}:`, error);
                    // Continue with other images even if one fails
                }
            }

            // Generate and download the zip file
            const content = await zip.generateAsync({ type: 'blob' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            saveAs(content, `remake_images_export_${timestamp}.zip`);
        } catch (error) {
            console.error('Error creating export:', error);
            if (onError) onError('Failed to export images. Please try again.');
        } finally {
            setIsExporting(false);
            if (onExportEnd) onExportEnd();
        }
    };

    // Modal handlers
    const handleReferenceImageClick = (scene) => {
        console.log('handleReferenceImageClick is triggered');
        setReferenceModalState({
            isOpen: true,
            scene: scene,
        });
    };

    const closeModal = () => {
        setReferenceModalState({
            isOpen: false,
            scene: null,
        });
    };

    const handleOpenHistoryModal = (scene, onEditFromHistory) => {
        setSceneHistoryModal({
            isOpen: true,
            scene: scene,
            onEditFromHistory: onEditFromHistory,
        });
    };

    const handleCloseHistoryModal = () => {
        setSceneHistoryModal({
            isOpen: false,
            scene: null,
        });
    };

    // Inpainting modal handlers
    const handleInpaintClick = (inpaintingData) => {
        console.log('trigger inpainting modal to open:');
        setSceneInpaintingModal({
            isOpen: true,
            inpaintingData: inpaintingData,
        });
    };

    const handleInpaintingModalClose = () => {
        setSceneInpaintingModal({
            isOpen: false,
            inpaintingData: null,
        });
    };

    const handleNext = () => {
        // Collect selected images for next step using enriched fields
        const selectedImages = selectedScenes
            .filter((scene) => scene.selectedGeneratedImage)
            .map((scene, index) => {
                const sceneDisplayName = `Scene-${index + 1}`; // Dynamic display name

                // Get prompt from the selected generated image data
                const selectedImageData = scene.generatedImages?.find(
                    (img) => img.id === scene.selectedGeneratedImageId
                );

                return {
                    sceneId: scene.id, // UUID for data consistency
                    sceneDisplayName, // For display purposes
                    revisedPrompt:
                        selectedImageData?.generationSources?.revisedPrompt ||
                        selectedImageData?.generationSources?.prompt ||
                        '',
                    image: scene.selectedGeneratedImage, // Use enriched field
                };
            });

        if (onNext) {
            onNext(selectedImages, storyConfig);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={onBackToScenes} className={styles.stepButton}>
                    ← Back to Scenes
                </button>
                <div className={styles.centerButtons}>
                    <button
                        onClick={onSettingsClick}
                        className={`${styles.actionButton} ${styles.settingsButton}`}
                        title='Story Configuration'
                    >
                        <FaBookOpen />
                        Story Setting
                    </button>
                    {/* <button
                        onClick={handlePromptGenAll}
                        className={`${styles.actionButton} ${styles.promptButton}`}
                        title='Generate Prompts for All Scenes'
                    >
                        <FaMagic /> PromptGen All
                    </button>
                    <button
                        onClick={handleImageGenAll}
                        className={`${styles.actionButton} ${styles.imageGenButton}`}
                        title='Generate Images for All Scenes'
                    >
                        <FaImages /> ImageGen All
                    </button> */}
                    {selectedScenes.length > 0 && (
                        <>
                            <button
                                onClick={handleCollapseAll}
                                className={`${styles.actionButton} ${styles.collapseButton}`}
                                title='Collapse All Scenes'
                                disabled={bulkCollapseState === 'collapsed'}
                            >
                                <FaCompress /> Collapse All
                            </button>
                            <button
                                onClick={handleExpandAll}
                                className={`${styles.actionButton} ${styles.expandButton}`}
                                title='Expand All Scenes'
                                disabled={bulkCollapseState === 'expanded'}
                            >
                                <FaExpand /> Expand All
                            </button>
                        </>
                    )}
                </div>
                <div className={styles.rightButtons}>
                    <button
                        onClick={handleExport}
                        className={`${styles.actionButton} ${styles.exportButton} ${
                            isExporting ? styles.disabled : ''
                        }`}
                        disabled={isExporting}
                        title='Export Generated Images'
                    >
                        <FaDownload /> {isExporting ? 'Exporting...' : 'Export'}
                    </button>
                    <button onClick={handleNext} className={styles.stepButton}>
                        Next Step →
                    </button>
                </div>
            </div>

            {/* Add Scene Button */}
            <div className={styles.elementListContainer}>
                <ElementImageList />
            </div>

            <div className={styles.rowsContainer}>
                <AddSceneButton insertAfterScene={null} insertBeforeScene={selectedScenes[0]} />
                {selectedScenes.length > 0 &&
                    selectedScenes.map((scene, index) => (
                        <div key={scene.id} className={styles.sceneRow}>
                            {/* Scene Row */}
                            <MemoizedSceneRow
                                scene={scene}
                                sceneIndex={index}
                                totalScenes={selectedScenes.length}
                                storyConfig={storyConfig}
                                isCollapsed={sceneCollapseStates[scene.id] || false}
                                onToggleCollapse={() => toggleSceneCollapse(scene.id)}
                                onReferenceImageClick={handleReferenceImageClick}
                                onOpenHistoryModal={handleOpenHistoryModal}
                            />

                            {/* Add Scene Button */}
                            <AddSceneButton
                                insertAfterScene={scene[index]}
                                insertBeforeScene={
                                    index + 1 < scene.length ? scene[index + 1] : null
                                }
                            />
                        </div>
                    ))}
            </div>

            <ElementGenModal />

            <ReferenceImageSelectionModal
                isOpen={referenceModalState.isOpen}
                onClose={closeModal}
                scene={referenceModalState.scene}
            />

            <SceneGenHistoryModal
                isOpen={sceneHistoryModal.isOpen}
                onClose={handleCloseHistoryModal}
                scene={sceneHistoryModal.scene}
                onEditFromHistory={sceneHistoryModal.onEditFromHistory}
                onInpaintClick={handleInpaintClick}
            />

            {/* Inpainting Modal */}
            <SceneInpaintingModal
                isOpen={sceneInpaintingModal.isOpen}
                inpaintingData={sceneInpaintingModal.inpaintingData}
                onClose={handleInpaintingModalClose}
            />
        </div>
    );
};

export default RemakeTab;
