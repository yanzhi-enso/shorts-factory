'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../page.module.css';
import TabNavigation, { TABS } from './tabs/TabNavigation';
import StartTab from './tabs/StartTab';
import ScenesTab from './tabs/ScenesTab';
import RemakeTab from './tabs/RemakeTab';
import VideoTab from './video/VideoTab';
import { useProjectManager } from '../hocs/ProjectManager';
import { getUnlockedTabsForStage } from 'utils/projectValidation';

const STAGE_PARAM = 'stage';
const PROJECT_ID_PARAM = 'pid';

export default function TabManager() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { initializeFromUrl } = useProjectManager();

    const [activeTab, setActiveTab] = useState(TABS.START);
    const [unlockedTabs, setUnlockedTabs] = useState([TABS.START]);
    
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const updateUrl = (tab, pid = null) => {
        const params = new URLSearchParams();
        params.set(STAGE_PARAM, tab);

        if ((tab === TABS.SCENES || tab === TABS.REMAKE || tab === TABS.VIDEO) && pid) {
            params.set(PROJECT_ID_PARAM, pid);
        }

        router.push(`/?${params.toString()}`, { shallow: true });
    };

    // Initialize from URL on mount
    useEffect(() => {
        const initializeFromUrlHandler = async () => {
            const stage = searchParams.get(STAGE_PARAM);
            const pid = searchParams.get(PROJECT_ID_PARAM);

            const isParsableStages = (
                stage === TABS.SCENES ||
                stage === TABS.REMAKE ||
                stage === TABS.VIDEO
            )

            if (isParsableStages && pid) {
                // Use ProjectManager to initialize project from URL
                const result = await initializeFromUrl(stage, pid);
                
                if (result.success) {
                    console.log("Initialized from URL:", stage, pid);
                    setActiveTab(stage);
                    setUnlockedTabs(getUnlockedTabsForStage(stage));
                    setError(null);
                } else {
                    console.error("Failed to initialize from URL");
                    setError(result.error);
                    updateUrl(TABS.START);
                }
            } else if ( isParsableStages && !pid) {
                console.warn("no project id provided, go back to start tab");
                // Invalid scenes/remake URL without project ID
                setError('Invalid project URL');
                updateUrl(TABS.START);
            } else {
                console.log("no valid stage provided, go back to start tab");
                // Default to start tab
                setActiveTab(TABS.START);
            }

            setIsInitialized(true);
        };

        initializeFromUrlHandler();
    }, [initializeFromUrl]);

    // DEPRECATED: This method is being replaced by ProjectManager.createProject
    // TODO: Remove when StartTab fully migrates to ProjectManager
    const handleProcessComplete = ({ projectId: newProjectId }) => {
        // Project creation is now handled by ProjectManager, this just handles navigation
        setActiveTab(TABS.SCENES);
        setUnlockedTabs([TABS.START, TABS.SCENES]);
        setError(null);
        updateUrl(TABS.SCENES, newProjectId);
    };

    const handleBackToStart = () => {
        setActiveTab(TABS.START);
        setError(null);
        // Use replace instead of push to remove history entry
        const params = new URLSearchParams();
        params.set(STAGE_PARAM, TABS.START);
        router.replace(`/?${params.toString()}`, { shallow: true });
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
    };

    const handleNextToRemake = () => {
        setActiveTab(TABS.REMAKE);
        setUnlockedTabs([TABS.START, TABS.SCENES, TABS.REMAKE]);
        updateUrl(TABS.REMAKE, projectId);
    };

    const handleBackToScenes = () => {
        setActiveTab(TABS.SCENES);
        updateUrl(TABS.SCENES, projectId);
    };

    const handleNextFromRemake = () => {
        setActiveTab(TABS.VIDEO);
        setUnlockedTabs([TABS.START, TABS.SCENES, TABS.REMAKE, TABS.VIDEO]);
        updateUrl(TABS.VIDEO, projectId);
    };

    const handleBackToRemake = () => {
        setActiveTab(TABS.REMAKE);
        updateUrl(TABS.REMAKE, projectId);
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

                {activeTab === TABS.SCENES && (
                    <ScenesTab
                        onBackToStart={handleBackToStart}
                        onNext={handleNextToRemake}
                        onError={handleError}
                    />
                )}

                {activeTab === TABS.REMAKE && (
                    <RemakeTab
                        onBackToScenes={handleBackToScenes}
                        onNext={handleNextFromRemake}
                        onError={handleError}
                    />
                )}

                {activeTab === TABS.VIDEO && (
                    <VideoTab
                        onBackToRemake={handleBackToRemake}
                        onError={handleError}
                    />
                )}
            </div>

            {error && <p className={styles.error}>{error}</p>}
        </>
    );
}
