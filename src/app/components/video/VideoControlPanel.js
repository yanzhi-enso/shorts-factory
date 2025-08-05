'use client';

import styles from './VideoControlPanel.module.css';
import Image from 'next/image';

const VideoControlPanel = ({
    prompt = '',
    onPromptChange,
    onPromptAssistant,
    isPromptAssistantRunning = false,
    showPromptAssistant = false,
    referenceImages = [],
    onGenerate,
    isGenerating = false,
}) => {
    const handlePromptChange = (e) => {
        if (onPromptChange) {
            onPromptChange(e.target.value);
        }
    };

    const handlePromptAssistantClick = () => {
        if (onPromptAssistant && !isPromptAssistantRunning) {
            onPromptAssistant();
        }
    };

    const handleGenerateClick = () => {
        if (onGenerate && !isGenerating) {
            onGenerate();
        }
    };

    return (
        <div className={styles.controlPanel}>
            {/* Text Input Area */}
            <div className={styles.textInputArea}>
                <textarea
                    className={styles.promptInput}
                    placeholder='Describe the video motion and action for this scene'
                    value={prompt}
                    onChange={handlePromptChange}
                    disabled={isPromptAssistantRunning}
                    rows={6}
                />
            </div>

            {/* Widget Bar */}
            <div className={styles.widgetBar}>
                {/* GPT Polish Button - Only render when onPromptAssistant prop is provided */}
                {showPromptAssistant ? (
                    <button
                        className={`${styles.gptPolishButton} ${
                            isPromptAssistantRunning ? styles.polishing : ''
                        }`}
                        onClick={() => {
                            console.log('Prompt Assistant clicked');
                            handlePromptAssistantClick();
                        }}
                        // disabled={isPromptAssistantRunning}
                    >
                        {isPromptAssistantRunning ? 'Processing...' : 'Prompt Assistant'}
                    </button>
                ) : (
                    <div />
                )}

                {/* Reference Images */}
                {referenceImages && referenceImages.length > 0 && (
                    <div className={styles.referenceImages}>
                        {referenceImages.slice(0, 3).map((imageUrl, index) => (
                            <div key={index} className={styles.referenceImage}>
                                <Image
                                    src={imageUrl}
                                    alt={`Reference ${index + 1}`}
                                    width={40}
                                    height={60}
                                    className={styles.refImage}
                                />
                            </div>
                        ))}
                        {referenceImages.length > 3 && (
                            <div className={styles.moreImages}>+{referenceImages.length - 3}</div>
                        )}
                    </div>
                )}

                {/* Generate Button (no dropdown for video) */}
                <div className={styles.generateButtonContainer}>
                    <button
                        className={`${styles.generateButton} ${
                            isGenerating ? styles.generating : ''
                        }`}
                        onClick={handleGenerateClick}
                        disabled={isGenerating}
                    >
                        {isGenerating ? 'Generating...' : 'Generate Video'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoControlPanel;
