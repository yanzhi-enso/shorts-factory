"use client";

import { useState, useEffect } from 'react';
import styles from './StartTab.module.css';
import LoadingSpinner from 'app/components/common/LoadingSpinner';
import { useProjectManager } from 'projectManager/useProjectManager';

const StartTab = ({ onProcessComplete, onError }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [projects, setProjects] = useState([]);
  const { projectState, createProject, loadProject, getAllProjects } = useProjectManager();

  // Load projects on component mount
  useEffect(() => {
    const loadProjects = async () => {
      const result = await getAllProjects();
      if (result.success) {
        setProjects(result.projects);
      }
    };
    
    loadProjects();
  }, [getAllProjects]);

  const handleProcessVideo = async () => {
    if (!videoUrl) {
      return;
    }

    const result = await createProject(videoUrl);
    
    if (result.success) {
      // Call parent callback for backward compatibility with TabManager
      // This maintains the existing interface while we transition
      onProcessComplete({
        projectId: result.projectId
      });
    } else {
      if (onError) {
        onError(result.error);
      }
    }
  };

  const handleLoadProject = async (projectId) => {
    const result = await loadProject(projectId);
    
    if (result.success) {
      onProcessComplete({
        projectId: projectId
      });
    } else {
      if (onError) {
        onError(result.error);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleDeleteProject = async (projectId) => {
    console.log(`Deleting project ${projectId}`);
    console.warn('not implemented yet');
  }

  // Use global loading state from ProjectManager
  if (projectState.loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.inputContainer}>
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Enter TikTok video URL"
          className={styles.input}
        />
        <button
          onClick={handleProcessVideo}
          className={styles.button}
        >
          Create Project
        </button>
      </div>
      {projectState.error && <p className={styles.error}>{projectState.error}</p>}
      
      {/* Project List Section */}
      {projects.length > 0 && (
        <div className={styles.projectList}>
          <h3 className={styles.projectListTitle}>Load Existing Project</h3>
          {/* TODO: Add pagination for large project lists */}
          {/* TODO: Add search/filter functionality */}
          {/* TODO: Add project status indicators (processing complete, scenes selected, etc.) */}
          <div className={styles.projectTable}>
            <div className={styles.projectTableHeader}>
              <div className={styles.projectTableHeaderCell}>Project Name</div>
              <div className={styles.projectTableHeaderCell}>Created</div>
              <div className={styles.projectTableHeaderCell}>Actions</div>
            </div>
            {projects.map((project) => (
              <div
                key={project.id}
                className={styles.projectRow}
                onClick={() => handleLoadProject(project.id)}
              >
                <div className={styles.projectCell}>
                  {project.name || "Unknown"}
                </div>
                <div className={styles.projectCell}>
                  {formatDate(project.created_at)}
                </div>
                <div className={styles.projectCell}>
                <button
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                >
                  Delete
                </button>
                </div>
              </div>
            ))}
          </div>
        </div>)}
    </div>
  );
};

export default StartTab;
