"use client";

import { useState, useEffect } from 'react';
import styles from './StartTab.module.css';
import LoadingSpinner from 'app/components/common/LoadingSpinner';
import ProjectCreationModal from 'app/components/common/ProjectCreationModal';
import { useProjectManager } from 'projectManager/useProjectManager';

const StartTab = ({ onProcessComplete, onError }) => {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleCreateProject = async ({ projectName, tiktokUrl, storyContext, imageMode }) => {
    try {
      // Call backend API with video URL (empty string if no URL provided)
      const response = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: tiktokUrl || '' })
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const data = await response.json();
      
      // Create project locally with all metadata using the updated createProject action
      const result = await createProject(tiktokUrl || null, {
        name: projectName,
        storyDescription: storyContext,
        settings: { image_size: imageMode }
      });
      
      if (result.success) {
        // Refresh projects list
        const updatedProjects = await getAllProjects();
        if (updatedProjects.success) {
          setProjects(updatedProjects.projects);
        }
        
        // Call parent callback
        onProcessComplete({
          projectId: data.project_id
        });
      } else {
        if (onError) {
          onError(result.error);
        }
      }
    } catch (error) {
      console.error('Error creating project:', error);
      if (onError) {
        onError(error.message);
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
      <div className={styles.createSection}>
        <button
          onClick={() => setIsModalOpen(true)}
          className={styles.createButton}
        >
          Create Project
        </button>
      </div>
      
      {projectState.error && <p className={styles.error}>{projectState.error}</p>}
      
      {/* Project Creation Modal */}
      <ProjectCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
      
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
