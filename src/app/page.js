"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from "./page.module.css";
import TabNavigation, { TABS } from './components/tabs/TabNavigation';
import StartTab from './components/tabs/StartTab';
import ScenesTab from './components/tabs/ScenesTab';
import RemakeTab from './components/tabs/RemakeTab';

const STAGE_PARAM = 'stage';
const PROJECT_ID_PARAM = 'pid';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(TABS.START);
  const [unlockedTabs, setUnlockedTabs] = useState([TABS.START]);
  const [projectId, setProjectId] = useState(null);
  const [images, setImages] = useState([]);
  const [remakeImages, setRemakeImages] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState({});
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from URL on mount
  useEffect(() => {
    const initializeFromUrl = async () => {
      const stage = searchParams.get(STAGE_PARAM);
      const pid = searchParams.get(PROJECT_ID_PARAM);

      if ((stage === TABS.SCENES || stage === TABS.REMAKE) && pid) {
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
      } else if ((stage === TABS.SCENES || stage === TABS.REMAKE) && !pid) {
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
  }, [searchParams]);

  const updateUrl = (tab, pid = null) => {
    const params = new URLSearchParams();
    params.set(STAGE_PARAM, tab);
    
    if ((tab === TABS.SCENES || tab === TABS.REMAKE) && pid) {
      params.set(PROJECT_ID_PARAM, pid);
    }
    
    router.push(`/?${params.toString()}`, { shallow: true });
  };

  const handleTabChange = (tab) => {
    if ((tab === TABS.SCENES || tab === TABS.REMAKE) && !projectId) {
      return; // Can't switch to scenes/remake without project
    }
    
    setActiveTab(tab);
    updateUrl(tab, (tab === TABS.SCENES || tab === TABS.REMAKE) ? projectId : null);
  };

  const handleProcessComplete = ({ projectId: newProjectId, images: newImages }) => {
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

  const handleNextFromRemake = () => {
    // Placeholder for future functionality
    console.log('Next from Remake - not implemented yet');
  };

  // Don't render until initialized to avoid hydration issues
  if (!isInitialized) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <h1 className={styles.title}>TikTok Video Processor</h1>
          <div className={styles.loading}>Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>TikTok Video Processor</h1>
        
        <TabNavigation 
          activeTab={activeTab}
          unlockedTabs={unlockedTabs}
        />
        
        <div className={styles.tabContent}>
          {activeTab === TABS.START && (
            <StartTab 
              onProcessComplete={handleProcessComplete}
              onError={handleError}
            />
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
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
      </main>
    </div>
  );
}
