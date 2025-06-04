"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from "./page.module.css";
import TabNavigation, { TABS } from './components/tabs/TabNavigation';
import StartTab from './components/tabs/StartTab';
import ScenesTab from './components/tabs/ScenesTab';

const STAGE_PARAM = 'stage';
const PROJECT_ID_PARAM = 'pid';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(TABS.START);
  const [projectId, setProjectId] = useState(null);
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from URL on mount
  useEffect(() => {
    const initializeFromUrl = async () => {
      const stage = searchParams.get(STAGE_PARAM);
      const pid = searchParams.get(PROJECT_ID_PARAM);

      if (stage === TABS.SCENES && pid) {
        // Validate project exists by checking file list
        try {
          const response = await fetch(`/api/files/${pid}`);
          if (response.ok) {
            const data = await response.json();
            setProjectId(pid);
            setImages(data.files);
            setActiveTab(TABS.SCENES);
          } else {
            // Project doesn't exist, redirect to start with error
            setError('Project not found or has expired');
            updateUrl(TABS.START);
          }
        } catch (err) {
          setError('Failed to validate project');
          updateUrl(TABS.START);
        }
      } else if (stage === TABS.SCENES && !pid) {
        // Invalid scenes URL without project ID
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
    
    if (tab === TABS.SCENES && pid) {
      params.set(PROJECT_ID_PARAM, pid);
    }
    
    router.push(`/?${params.toString()}`, { shallow: true });
  };

  const handleTabChange = (tab) => {
    if (tab === TABS.SCENES && !projectId) {
      return; // Can't switch to scenes without project
    }
    
    setActiveTab(tab);
    updateUrl(tab, tab === TABS.SCENES ? projectId : null);
  };

  const handleProcessComplete = ({ projectId: newProjectId, images: newImages }) => {
    setProjectId(newProjectId);
    setImages(newImages);
    setActiveTab(TABS.SCENES);
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
          onTabChange={handleTabChange}
          projectId={projectId}
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
              onBackToStart={handleBackToStart}
              onError={handleError}
            />
          )}
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
      </main>
    </div>
  );
}
