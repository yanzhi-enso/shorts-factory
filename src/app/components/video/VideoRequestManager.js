"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { generateVideo, getVideoTaskStatus, KlingThrottleError } from 'services/backend';

const VideoRequestManager = ({ children, onError, ...props }) => {
  const [requestQueue, setRequestQueue] = useState([]);
  const [activePolling, setActivePolling] = useState(new Map()); // taskId -> { sceneId, startTime }
  const [isQueueHalted, setIsQueueHalted] = useState(false);
  
  // Use refs to avoid stale closures in intervals
  const requestQueueRef = useRef([]);
  const activePollingRef = useRef(new Map());
  const isQueueHaltedRef = useRef(false);
  const processingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    requestQueueRef.current = requestQueue;
  }, [requestQueue]);

  useEffect(() => {
    activePollingRef.current = activePolling;
  }, [activePolling]);

  useEffect(() => {
    isQueueHaltedRef.current = isQueueHalted;
  }, [isQueueHalted]);

  // Create request object
  const createRequest = (sceneId, imageBase64, prompt) => ({
    sceneId,
    imageBase64,
    prompt,
    timestamp: Date.now(),
    attempts: 0
  });


  // Handle expired tasks (>30 minutes)
  const handleExpiredTasks = useCallback((expiredScenes) => {
    if (expiredScenes.length === 0) return;
    
    if (expiredScenes.length === 1) {
      if (onError) onError(`Video generation for ${expiredScenes[0]} exceeded time limit`);
    } else {
      if (onError) onError(`Video generation exceeded time limit for ${expiredScenes.length} scenes`);
    }
  }, [onError]);

  // Clean up expired requests from queue
  const cleanupExpiredRequests = useCallback(() => {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    const expiredScenes = [];
    const validRequests = requestQueueRef.current.filter(request => {
      if (now - request.timestamp > thirtyMinutes) {
        expiredScenes.push(request.sceneId);
        return false;
      }
      return true;
    });

    if (expiredScenes.length > 0) {
      setRequestQueue(validRequests);
      handleExpiredTasks(expiredScenes);
      
      // Reset loading states for expired scenes
      expiredScenes.forEach(sceneId => {
        if (props.onSceneStateChange) {
          props.onSceneStateChange(sceneId, { isGenerating: false });
        }
      });
    }
  }, [handleExpiredTasks, props]);

  // Start resume timer after throttle
  const startResumeTimer = useCallback(() => {
    console.log('⏰ Starting 30-second resume timer for throttled queue');
    setTimeout(() => {
      if (isQueueHaltedRef.current) {
        console.log('⏰ Resume timer expired, resuming queue processing');
        setIsQueueHalted(false);
        // useEffect will handle triggering processNextRequest
      } else {
        console.log('⏰ Resume timer expired but queue was already resumed');
      }
    }, 30000); // 30 seconds
  }, []);

  // Single useEffect controller for queue processing - eliminates race conditions
  useEffect(() => {
    if (!processingRef.current && !isQueueHaltedRef.current && requestQueueRef.current.length > 0) {
      console.log('🎯 useEffect triggering queue processing');
      processNextRequest();
    }
  }, [isQueueHalted, requestQueue.length]);

  // Process next request in queue
  const processNextRequest = useCallback(async () => {
    if (processingRef.current || isQueueHaltedRef.current || requestQueueRef.current.length === 0) {
      if (processingRef.current) {
        console.log('Skipping processNextRequest: already processing');
      } else if (isQueueHaltedRef.current) {
        console.log('Skipping processNextRequest: queue is halted');
      } else {
        console.log('Skipping processNextRequest: queue is empty');
      }
      return;
    }

    console.log(`Starting to process next request. Queue length: ${requestQueueRef.current.length}`);
    processingRef.current = true;
    const nextRequest = requestQueueRef.current[0];
    console.log(`Processing request for scene: ${nextRequest.sceneId}`);

    try {
      // Extract base64 data from data URL if needed
      let imageBase64 = nextRequest.imageBase64;
      if (imageBase64.startsWith('data:image/')) {
        imageBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      }

      const result = await generateVideo(imageBase64, nextRequest.prompt);
      
      if (result.data?.task_id) {
        // Success: Start polling and remove from queue
        console.log(`Video generation started successfully for ${nextRequest.sceneId}, task ID: ${result.data.task_id}`);
        startPolling(result.data.task_id, nextRequest.sceneId);
        
        setRequestQueue(prev => {
          const newQueue = prev.slice(1);
          console.log(`Removed completed request from queue. New queue length: ${newQueue.length}`);
          return newQueue;
        });
        
        // useEffect will handle processing next request
        processingRef.current = false;
      } else {
        throw new Error('No task ID returned from video generation');
      }
    } catch (error) {
      console.error('Error processing video request:', error);
      
      if (error instanceof KlingThrottleError) {
        // Throttle error: halt queue but keep request for retry
        console.log('🚦 THROTTLE DETECTED: Halting queue, request remains for retry when queue resumes');
        console.log(`Throttled request for scene ${nextRequest.sceneId} remains at front of queue`);
        setIsQueueHalted(true);
        startResumeTimer();
        // NOTE: Request stays in queue automatically - no complex updates needed
        // NOTE: Do NOT call onError for throttle - this is expected behavior
      } else {
        // Real error: mark failed, continue queue, and notify user
        console.error(`❌ REAL ERROR - Video generation failed for ${nextRequest.sceneId}:`, error);
        
        // Remove failed request from queue
        setRequestQueue(prev => {
          const newQueue = prev.slice(1);
          console.log(`Removed failed request from queue. New queue length: ${newQueue.length}`);
          return newQueue;
        });
        
        // Reset loading state for failed scene and propagate error to user
        if (props.onSceneStateChange) {
          props.onSceneStateChange(nextRequest.sceneId, { 
            isGenerating: false,
            error: error.message 
          });
        }
        
        // Propagate real errors to user via onError callback
        if (onError) {
          onError(`Video generation failed for ${nextRequest.sceneId}: ${error.message}`);
        }
        
        // useEffect will handle processing next request
      }
      
      processingRef.current = false;
    }
  }, [startResumeTimer, props, onError]);

  // Start polling for video completion
  const startPolling = useCallback((taskId, sceneId) => {
    console.log(`🔄 Starting polling for task ${taskId} (scene: ${sceneId})`);
    setActivePolling(prev => new Map(prev).set(taskId, { 
      sceneId, 
      startTime: Date.now() 
    }));

    pollVideoStatus(taskId, sceneId);
  }, []);

  // Poll video status
  const pollVideoStatus = useCallback(async (taskId, sceneId) => {
    const maxAttempts = 20; // 5 minutes with 15-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        console.log(`🔄 Polling attempt ${attempts}/${maxAttempts} for task ${taskId} (scene: ${sceneId})`);
        const result = await getVideoTaskStatus(taskId);
        
        if (result.data?.task_status === 'succeed' && result.data?.task_result?.videos?.[0]) {
          // Video generation completed successfully
          const videoUrl = result.data.task_result.videos[0].url || result.data.task_result.videos[0].resource;
          console.log(`✅ Video generation completed successfully for scene ${sceneId}, URL: ${videoUrl}`);
          
          // Update scene with generated video
          if (props.onSceneStateChange) {
            props.onSceneStateChange(sceneId, {
              generatedVideo: videoUrl,
              isGenerating: false
            });
          }

          // Add to generated videos for export
          if (props.onVideoGenerated) {
            props.onVideoGenerated(sceneId, videoUrl);
          }

          // Remove from active polling and resume queue if halted
          onTaskComplete(taskId, sceneId, true);
          return;
          
        } else if (result.data?.task_status === 'failed') {
          console.error(`❌ Video generation failed for scene ${sceneId}, task ${taskId}`);
          throw new Error('Video generation failed');
        } else if (attempts >= maxAttempts) {
          console.error(`⏰ Video generation timed out for scene ${sceneId}, task ${taskId} after ${maxAttempts} attempts`);
          throw new Error('Video generation timed out');
        }

        // Continue polling
        console.log(`⏳ Video still processing for scene ${sceneId}, status: ${result.data?.task_status || 'unknown'}, continuing to poll...`);
        setTimeout(poll, 15000);
      } catch (error) {
        console.error(`❌ Error polling video status for scene ${sceneId}, task ${taskId}:`, error);
        
        // Update scene state
        if (props.onSceneStateChange) {
          props.onSceneStateChange(sceneId, {
            isGenerating: false,
            error: error.message
          });
        }

        // Remove from active polling and resume queue if halted
        onTaskComplete(taskId, sceneId, false);
      }
    };

    poll();
  }, [props]);

  // Handle task completion
  const onTaskComplete = useCallback((taskId, sceneId, success) => {
    console.log(`Task ${taskId} completed for scene ${sceneId}, success: ${success}`);
    
    setActivePolling(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      console.log(`Active polling count after completion: ${newMap.size}`);
      return newMap;
    });

    // If queue was halted due to throttling, resume processing
    if (isQueueHaltedRef.current) {
      console.log('Queue was halted, resuming queue processing after task completion');
      setIsQueueHalted(false);
      // useEffect will handle triggering processNextRequest
    }
    
    // useEffect will automatically handle processing next requests
    console.log('Task completion handled, useEffect will process next request if needed');
  }, []);

  // Queue a video request
  const queueRequest = useCallback((sceneId, imageBase64, prompt) => {
    console.log(`📥 Queueing single request for scene: ${sceneId}`);
    const request = createRequest(sceneId, imageBase64, prompt);
    
    setRequestQueue(prev => {
      const newQueue = [...prev, request];
      console.log(`Queue updated. New length: ${newQueue.length}`);
      return newQueue;
    });
    
    // Set loading state for scene
    if (props.onSceneStateChange) {
      props.onSceneStateChange(sceneId, { isGenerating: true });
    }

    // useEffect will handle triggering queue processing
    console.log('Request queued, useEffect will handle processing');
  }, [props]);

  // Queue multiple requests
  const queueMultipleRequests = useCallback((requests) => {
    console.log(`📥 Queueing ${requests.length} requests for batch processing`);
    const newRequests = requests.map(({ sceneId, imageBase64, prompt }) => 
      createRequest(sceneId, imageBase64, prompt)
    );
    
    setRequestQueue(prev => {
      const newQueue = [...prev, ...newRequests];
      console.log(`Batch queue updated. New length: ${newQueue.length}`);
      return newQueue;
    });
    
    // Set loading states for all scenes
    if (props.onSceneStateChange) {
      requests.forEach(({ sceneId }) => {
        console.log(`Setting loading state for scene: ${sceneId}`);
        props.onSceneStateChange(sceneId, { isGenerating: true });
      });
    }

    // useEffect will handle triggering queue processing
    console.log('Batch requests queued, useEffect will handle processing');
  }, [props]);

  // Cleanup expired requests every 30 seconds
  useEffect(() => {
    const interval = setInterval(cleanupExpiredRequests, 30000);
    return () => clearInterval(interval);
  }, [cleanupExpiredRequests]);

  // Enhanced props for child component
  const enhancedProps = {
    ...props,
    videoManager: {
      queueRequest,
      queueMultipleRequests,
      isQueueHalted,
      queueLength: requestQueue.length,
      activePollingCount: activePolling.size
    },
    onSceneStateChange: props.onSceneStateChange,
    onVideoGenerated: props.onVideoGenerated
  };

  return children(enhancedProps);
};

export default VideoRequestManager;
