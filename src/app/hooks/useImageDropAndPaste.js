"use client";

import { useState, useRef, useCallback } from 'react';
import { createDragHandlers, processClipboardPaste, convertImageToPng } from 'utils/common/image';

/**
 * Custom hook for handling image drag & drop and clipboard paste functionality
 * @param {Object} options - Configuration options
 * @param {Function} options.onFileProcessed - Callback function to handle each file
 * @param {boolean} options.disabled - Whether the functionality is disabled
 * @param {boolean} options.enablePaste - Whether to enable paste functionality
 * @param {boolean} options.enableDrop - Whether to enable drag and drop functionality
 * @param {boolean} options.multiple - Whether to allow multiple files (for drop)
 * @param {boolean} options.convertToPng - Whether to automatically convert non-PNG images to PNG
 * @returns {Object} - State and event handlers
 */
export const useImageDropAndPaste = ({
  onFileProcessed,
  disabled = false,
  enablePaste = true,
  enableDrop = true,
  multiple = false,
  convertToPng = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const elementRef = useRef(null);

  // Process file with optional PNG conversion
  const processFileWithConversion = useCallback(async (file) => {
    try {
      let processedFile = file;
      
      // Convert to PNG if enabled and file is not already PNG
      if (convertToPng && file.type !== 'image/png') {
        console.log(`Converting ${file.type} to PNG:`, file.name);
        const pngBlob = await convertImageToPng(file, 1.0); // Maximum quality for no loss
        
        // Create new File with PNG extension
        const newFileName = file.name.replace(/\.[^/.]+$/, '.png');
        processedFile = new File([pngBlob], newFileName, { 
          type: 'image/png',
          lastModified: file.lastModified 
        });
        console.log('Conversion successful:', newFileName);
      }
      
      onFileProcessed(processedFile);
    } catch (error) {
      console.error('Image conversion failed:', error);
      throw new Error('Unable to process image - conversion failed');
    }
  }, [onFileProcessed, convertToPng]);

  // Handle files dropped
  const handleFilesDropped = useCallback((files) => {
    if (multiple) {
      // Process all files
      files.forEach(file => processFileWithConversion(file));
    } else {
      // Process only the first file
      if (files.length > 0) {
        processFileWithConversion(files[0]);
      }
    }
  }, [processFileWithConversion, multiple]);

  // Create drag handlers
  const dragHandlers = enableDrop ? createDragHandlers(handleFilesDropped, disabled) : {};

  // Drag event handlers with state management
  const handleDragEnter = useCallback((e) => {
    if (dragHandlers.handleDragEnter && dragHandlers.handleDragEnter(e)) {
      setIsDragOver(true);
    }
  }, [dragHandlers]);

  const handleDragLeave = useCallback((e) => {
    if (dragHandlers.handleDragLeave && dragHandlers.handleDragLeave(e)) {
      setIsDragOver(false);
    }
  }, [dragHandlers]);

  const handleDragOver = useCallback((e) => {
    if (dragHandlers.handleDragOver && dragHandlers.handleDragOver(e)) {
      setIsDragOver(true);
    }
  }, [dragHandlers]);

  const handleDrop = useCallback((e) => {
    if (dragHandlers.handleDrop && dragHandlers.handleDrop(e)) {
      setIsDragOver(false);
    }
  }, [dragHandlers]);

  // Paste event handler
  const handlePaste = useCallback((e) => {
    if (!enablePaste || disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    processClipboardPaste(e, processFileWithConversion);
  }, [enablePaste, disabled, processFileWithConversion]);

  // Focus handlers
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay blur to allow paste events to complete
    setTimeout(() => {
      if (!isHovered) {
        setIsFocused(false);
      }
    }, 100);
  }, [isHovered]);

  // Mouse handlers
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Auto-focus when hovering to enable paste events
    if (elementRef.current && !isFocused && enablePaste) {
      elementRef.current.focus();
    }
  }, [isFocused, enablePaste]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Return state and handlers
  return {
    // State
    isDragOver,
    isFocused,
    isHovered,
    elementRef,
    
    // Event handlers for drag and drop
    dragHandlers: enableDrop ? {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop
    } : {},
    
    // Event handlers for paste
    pasteHandlers: enablePaste ? {
      onPaste: handlePaste
    } : {},
    
    // Event handlers for focus management
    focusHandlers: {
      onFocus: handleFocus,
      onBlur: handleBlur,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    }
  };
};
