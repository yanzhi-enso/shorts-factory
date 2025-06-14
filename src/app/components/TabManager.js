'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../page.module.css';
import TabNavigation, { TABS } from './tabs/TabNavigation';
import StartTab from './tabs/StartTab';
import ScenesTab from './tabs/ScenesTab';
import RemakeTab from './tabs/RemakeTab';
import VideoTab from './video/VideoTab';
import projectStorage from '../../services/projectStorage';

const STAGE_PARAM = 'stage';
const PROJECT_ID_PARAM = 'pid';

export default function TabManager() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState(TABS.START);
    const [unlockedTabs, setUnlockedTabs] = useState([TABS.START]);
    const [projectId, setProjectId] = useState(null);
    const [images, setImages] = useState([]);
    const [remakeImages, setRemakeImages] = useState([]);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [storyDescription, setStoryDescription] = useState('');
    const [generatedVideos, setGeneratedVideos] = useState([]);
    const [selectedIndices, setSelectedIndices] = useState({});
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const updateUrl = useCallback((tab, pid = null) => {
        const params = new URLSearchParams();
        params.set(STAGE_PARAM, tab);

        if ((tab === TABS.SCENES || tab === TABS.REMAKE || tab === TABS.VIDEO) && pid) {
            params.set(PROJECT_ID_PARAM, pid);
        }

        router.push(`/?${params.toString()}`, { shallow: true });
    }, [router]);

    // Initialize from URL on mount
    useEffect(() => {
        const initializeFromUrl = async () => {
            const stage = searchParams.get(STAGE_PARAM);
            const pid = searchParams.get(PROJECT_ID_PARAM);

            if ((stage === TABS.SCENES || stage === TABS.REMAKE || stage === TABS.VIDEO) && pid) {
                // Validate project exists by checking file list
                try {
                    const response = await fetch(`/api/files/${pid}`);
                    if (response.ok) {
                        const data = await response.json();
                        setProjectId(pid);
                        setImages(data.files);
                        setActiveTab(stage);

                        // Set appropriate unlocked tabs based on current stage
                        if (stage === TABS.SCENES) {
                            setUnlockedTabs([TABS.START, TABS.SCENES]);
                        } else if (stage === TABS.REMAKE) {
                            setUnlockedTabs([TABS.START, TABS.SCENES, TABS.REMAKE]);
                        } else if (stage === TABS.VIDEO) {
                            setUnlockedTabs([TABS.START, TABS.SCENES, TABS.REMAKE, TABS.VIDEO]);
                        }
                    } else {
                        // Project doesn't exist, redirect to start with error
                        setError('Project not found or has expired');
                        updateUrl(TABS.START);
                    }
                } catch (err) {
                    setError('Failed to validate project');
                    updateUrl(TABS.START);
                }
            } else if (
                (stage === TABS.SCENES || stage === TABS.REMAKE || stage === TABS.VIDEO) &&
                !pid
            ) {
                // Invalid scenes/remake URL without project ID
                setError('Invalid project URL');
                updateUrl(TABS.START);
            } else {
                // Default to start tab
                setActiveTab(TABS.START);
            }

            setIsInitialized(true);
        };

        initializeFromUrl();
    }, [updateUrl, searchParams]);

    const handleTabChange = (tab) => {
        if ((tab === TABS.SCENES || tab === TABS.REMAKE || tab === TABS.VIDEO) && !projectId) {
            return; // Can't switch to scenes/remake/video without project
        }

        setActiveTab(tab);
        updateUrl(
            tab,
            tab === TABS.SCENES || tab === TABS.REMAKE || tab === TABS.VIDEO ? projectId : null
        );
    };

    const handleProcessComplete = async ({ projectId: newProjectId, images: newImages, tiktokUrl }) => {
        try {
            // Store project data in IndexedDB
            await projectStorage.createProjectFromGCS(newProjectId, tiktokUrl, newImages);
            console.log('Project stored successfully in IndexedDB:', newProjectId);
        } catch (storageError) {
            console.error('Failed to store project in IndexedDB:', storageError);
            // Continue with the flow even if storage fails - don't break the user experience
        }

        setProjectId(newProjectId);
        setImages(newImages);
        setActiveTab(TABS.SCENES);
        setUnlockedTabs([TABS.START, TABS.SCENES]);
        setError(null);
        updateUrl(TABS.SCENES, newProjectId);
    };

    const handleBackToStart = () => {
        setActiveTab(TABS.START);
        setProjectId(null);
        setError(null);
        // Use replace instead of push to remove history entry
        const params = new URLSearchParams();
        params.set(STAGE_PARAM, TABS.START);
        router.replace(`/?${params.toString()}`, { shallow: true });
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
    };

    const handleNextToRemake = (filteredImages) => {
        setRemakeImages(filteredImages);
        setActiveTab(TABS.REMAKE);
        setUnlockedTabs([TABS.START, TABS.SCENES, TABS.REMAKE]);
        updateUrl(TABS.REMAKE, projectId);
    };

    const handleBackToScenes = () => {
        setActiveTab(TABS.SCENES);
        updateUrl(TABS.SCENES, projectId);
    };

    const handleNextFromRemake = (generatedImagesData, storyConfig) => {
        setGeneratedImages(generatedImagesData);
        setStoryDescription(storyConfig.storyDescription);
        setActiveTab(TABS.VIDEO);
        setUnlockedTabs([TABS.START, TABS.SCENES, TABS.REMAKE, TABS.VIDEO]);
        updateUrl(TABS.VIDEO, projectId);
    };

    const handleBackToRemake = () => {
        setActiveTab(TABS.REMAKE);
        updateUrl(TABS.REMAKE, projectId);
    };

    const handleNextFromVideo = (generatedVideosData) => {
        setGeneratedVideos(generatedVideosData);
        // Future: implement next tab functionality
        console.log('Next from Video - future functionality', generatedVideosData);
    };

    // Don't render until initialized to avoid hydration issues
    if (!isInitialized) {
        return (
            <div className={styles.loading}>Loading...</div>
        );
    }

    return (
        <>
            <TabNavigation activeTab={activeTab} unlockedTabs={unlockedTabs} />

            <div className={styles.tabContent}>
                {activeTab === TABS.START && (
                    <StartTab onProcessComplete={handleProcessComplete} onError={handleError} />
                )}

                {activeTab === TABS.SCENES && projectId && (
                    <ScenesTab
                        projectId={projectId}
                        images={images}
                        selectedIndices={selectedIndices}
                        setSelectedIndices={setSelectedIndices}
                        onBackToStart={handleBackToStart}
                        onNext={handleNextToRemake}
                        onError={handleError}
                    />
                )}

                {activeTab === TABS.REMAKE && projectId && (
                    <RemakeTab
                        projectId={projectId}
                        images={remakeImages}
                        selectedIndices={selectedIndices}
                        onBackToScenes={handleBackToScenes}
                        onNext={handleNextFromRemake}
                        onError={handleError}
                    />
                )}

                {activeTab === TABS.VIDEO && projectId && (
                    <VideoTab
                        projectId={projectId}
                        generatedImages={generatedImages}
                        storyDescription={storyDescription}
                        onBackToRemake={handleBackToRemake}
                        onNext={handleNextFromVideo}
                        onError={handleError}
                    />
                )}
            </div>

            {error && <p className={styles.error}>{error}</p>}
        </>
    );
}
