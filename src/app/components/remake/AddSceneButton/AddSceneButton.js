"use client";

import React from "react";
import styles from "./AddSceneButton.module.css";
import { FaPlus } from "react-icons/fa";
import { useProjectManager } from "projectManager/useProjectManager";

const AddSceneButton = ({
    insertAfterScene = null,
    insertBeforeScene = null,
}) => {
    const { addScene } = useProjectManager();

    const handleAddScene = async () => {
        try {
            // Create a new scene using the ProjectManager action
            // insertAfterScene and insertBeforeScene determine the positioning
            await addScene(
                insertAfterScene, // After this scene (null for beginning)
                insertBeforeScene, // Before this scene (null for end)
                { 
                    name: `Scene ${Date.now()}`,
                    isSelected: true, // make sure the scene is displayed in remake tab
                }, // Scene metadata with unique name
                null // No initial reference image
            );
        } catch (error) {
            console.error("Failed to add scene:", error);
            alert("Failed to add scene. Please try again.");
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.line}></div>
            <button
                onClick={handleAddScene}
                className={styles.addButton}
                title="Add new scene"
            >
                <div className={styles.content}>
                    <FaPlus className={styles.icon} />
                    <span className={styles.text}>Add Scene</span>
                </div>
            </button>
            <div className={styles.line}></div>
        </div>
    );
};

export default AddSceneButton;
