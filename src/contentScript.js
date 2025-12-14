// Twitter Voice Note Extension - Content Script v2.1
console.log('[Voice Note] ✅ Content script initialized on:', window.location.href);

// Track recording state
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let currentStream = null;
let recordingStartTime = 0;
let recordedVideoBlob = null; // Store recorded video for preview

// Register message listener for audio data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Voice Note] 📨 Received message:', request.type);
  
  if (request.type === 'SEND_VOICE_NOTE') {
    console.log('[Voice Note] 🎙️ Processing SEND_VOICE_NOTE');
    handleSendVoiceNote(request, sendResponse);
    return true;
  }
});

// Inject voice note button into the chat
function injectVoiceNoteButton() {
  // Wait for the chat composer to be ready
  const checkInterval = setInterval(() => {
    // Check if button already injected
    if (document.querySelector('[data-voice-note-injected]')) {
      clearInterval(checkInterval);
      return;
    }
    
    // Look for the DM composer container
    const composerContainer = document.querySelector('[data-testid="dm-composer-container"]');
    const textarea = document.querySelector('[data-testid="dm-composer-textarea"]');
    
    if (composerContainer && textarea) {
      console.log('[Voice Note] 🎯 Found composer, injecting voice note button');
      
      // Create a wrapper for our buttons
      const buttonWrapper = document.createElement('div');
      buttonWrapper.setAttribute('data-voice-note-wrapper', 'true');
      buttonWrapper.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-top: 1px solid rgb(47, 51, 54);
      `;
      
      // Create voice note button
      const voiceButton = document.createElement('button');
      voiceButton.setAttribute('data-voice-note-injected', 'true');
      voiceButton.setAttribute('type', 'button');
      voiceButton.setAttribute('aria-label', 'Record voice note');
      voiceButton.style.cssText = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: #1da1f2;
        color: white;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      `;
      voiceButton.innerHTML = '🎤';
      
      // Create preview button (hidden initially)
      const previewButton = document.createElement('button');
      previewButton.setAttribute('data-voice-preview-button', 'true');
      previewButton.setAttribute('type', 'button');
      previewButton.setAttribute('aria-label', 'Preview voice note');
      previewButton.style.cssText = `
        display: none;
        padding: 8px 16px;
        border-radius: 20px;
        border: 1px solid #1da1f2;
        background: transparent;
        color: #1da1f2;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
      `;
      previewButton.innerHTML = '▶️ Preview';
      
      // Create send button (hidden initially)
      const sendVoiceButton = document.createElement('button');
      sendVoiceButton.setAttribute('data-voice-send-button', 'true');
      sendVoiceButton.setAttribute('type', 'button');
      sendVoiceButton.setAttribute('aria-label', 'Send voice note');
      sendVoiceButton.style.cssText = `
        display: none;
        padding: 8px 16px;
        border-radius: 20px;
        border: none;
        background: #1da1f2;
        color: white;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
      `;
      sendVoiceButton.innerHTML = '📤 Send';
      
      // Create cancel button (hidden initially)
      const cancelButton = document.createElement('button');
      cancelButton.setAttribute('data-voice-cancel-button', 'true');
      cancelButton.setAttribute('type', 'button');
      cancelButton.setAttribute('aria-label', 'Cancel voice note');
      cancelButton.style.cssText = `
        display: none;
        padding: 8px 16px;
        border-radius: 20px;
        border: none;
        background: #e74c3c;
        color: white;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
      `;
      cancelButton.innerHTML = '❌ Cancel';
      
      // Add hover effects
      voiceButton.addEventListener('mouseenter', () => {
        if (!isRecording) {
          voiceButton.style.background = '#1a8cd8';
          voiceButton.style.transform = 'scale(1.1)';
        }
      });
      voiceButton.addEventListener('mouseleave', () => {
        if (!isRecording) {
          voiceButton.style.background = '#1da1f2';
          voiceButton.style.transform = 'scale(1)';
        }
      });
      
      previewButton.addEventListener('mouseenter', () => {
        previewButton.style.background = 'rgba(29, 161, 242, 0.1)';
      });
      previewButton.addEventListener('mouseleave', () => {
        previewButton.style.background = 'transparent';
      });
      
      sendVoiceButton.addEventListener('mouseenter', () => {
        sendVoiceButton.style.background = '#1a8cd8';
      });
      sendVoiceButton.addEventListener('mouseleave', () => {
        sendVoiceButton.style.background = '#1da1f2';
      });
      
      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.background = '#c0392b';
      });
      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.background = '#e74c3c';
      });
      
      // Add click handlers
      voiceButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleVoiceNoteClick(voiceButton, previewButton, sendVoiceButton, cancelButton);
      });
      
      previewButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handlePreviewClick(previewButton);
      });
      
      sendVoiceButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSendClick(sendVoiceButton, voiceButton, previewButton, cancelButton);
      });
      
      cancelButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCancelClick(voiceButton, previewButton, sendVoiceButton, cancelButton);
      });
      
      // Add buttons to wrapper
      buttonWrapper.appendChild(voiceButton);
      buttonWrapper.appendChild(previewButton);
      buttonWrapper.appendChild(sendVoiceButton);
      buttonWrapper.appendChild(cancelButton);
      
      // Insert wrapper at the bottom of the composer container
      composerContainer.appendChild(buttonWrapper);
      
      console.log('[Voice Note] ✅ Voice note controls injected');
      clearInterval(checkInterval);
    }
  }, 300);
  
  // Stop checking after 30 seconds
  setTimeout(() => clearInterval(checkInterval), 30000);
}

// Handle voice note button click (record/stop)
async function handleVoiceNoteClick(voiceButton, previewButton, sendVoiceButton, cancelButton) {
  if (!isRecording) {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      currentStream = stream;
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      recordedVideoBlob = null;
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });
      
      mediaRecorder.addEventListener('stop', async () => {
        // Convert audio to video format for mobile compatibility
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        try {
          voiceButton.innerHTML = '🔄';
          voiceButton.title = 'Converting...';
          voiceButton.style.background = '#f39c12';
          
          // Convert audio to MP4 video
          recordedVideoBlob = await convertAudioToVideo(audioBlob);
          
          // Stop the stream
          if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
          }
          
          // Show preview and send buttons
          voiceButton.innerHTML = '✅';
          voiceButton.style.background = '#17bf63';
          voiceButton.title = 'Recording ready!';
          
          previewButton.style.display = 'block';
          sendVoiceButton.style.display = 'block';
          cancelButton.style.display = 'block';
          
          console.log('[Voice Note] ✅ Recording ready for preview/send');
          
        } catch (error) {
          console.error('[Voice Note] ❌ Conversion error:', error);
          voiceButton.innerHTML = '❌';
          voiceButton.style.background = '#e74c3c';
          
          setTimeout(() => {
            voiceButton.innerHTML = '🎤';
            voiceButton.style.background = '#1da1f2';
          }, 2000);
        }
      });
      
      mediaRecorder.start();
      isRecording = true;
      recordingStartTime = Date.now();
      
      // Update button to show recording state
      voiceButton.innerHTML = '⏹️';
      voiceButton.style.background = '#e74c3c';
      voiceButton.title = 'Stop recording';
      
      // Show recording timer
      const timerInterval = setInterval(() => {
        if (!isRecording) {
          clearInterval(timerInterval);
          return;
        }
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        voiceButton.title = `Recording: ${timeString} - Click to stop`;
      }, 100);
      
      // Store interval for cleanup
      voiceButton.timerInterval = timerInterval;
      
    } catch (error) {
      console.error('[Voice Note] ❌ Microphone error:', error);
      alert('Unable to access microphone. Please check your browser permissions.');
      voiceButton.innerHTML = '❌';
      voiceButton.style.background = '#e74c3c';
      
      setTimeout(() => {
        voiceButton.innerHTML = '🎤';
        voiceButton.style.background = '#1da1f2';
      }, 2000);
    }
  } else {
    // Stop recording
    if (mediaRecorder && mediaRecorder.state !== 'stopped') {
      mediaRecorder.stop();
    }
    
    isRecording = false;
    
    // Clear timer
    if (voiceButton.timerInterval) {
      clearInterval(voiceButton.timerInterval);
    }
    
    voiceButton.innerHTML = '📤';
    voiceButton.title = 'Processing...';
  }
}

// Handle preview button click
function handlePreviewClick(previewButton) {
  if (!recordedVideoBlob) {
    console.error('[Voice Note] ❌ No recording to preview');
    return;
  }
  
  // Create audio element for preview
  const audioURL = URL.createObjectURL(recordedVideoBlob);
  const audio = new Audio(audioURL);
  
  // Update button state
  const originalText = previewButton.innerHTML;
  previewButton.innerHTML = '⏸️ Playing...';
  previewButton.disabled = true;
  
  audio.play();
  
  audio.addEventListener('ended', () => {
    previewButton.innerHTML = originalText;
    previewButton.disabled = false;
    URL.revokeObjectURL(audioURL);
  });
  
  audio.addEventListener('error', () => {
    previewButton.innerHTML = originalText;
    previewButton.disabled = false;
    URL.revokeObjectURL(audioURL);
    alert('Error playing preview. Try recording again.');
  });
}

// Handle send button click
async function handleSendClick(sendVoiceButton, voiceButton, previewButton, cancelButton) {
  if (!recordedVideoBlob) {
    console.error('[Voice Note] ❌ No recording to send');
    return;
  }
  
  sendVoiceButton.innerHTML = '📤 Sending...';
  sendVoiceButton.disabled = true;
  
  const base64Data = await blobToBase64(recordedVideoBlob);
  
  handleSendVoiceNote({ audioData: base64Data, isVideo: true }, (response) => {
    if (response && response.success) {
      console.log('[Voice Note] ✅ Voice note sent!');
      
      // Reset everything
      recordedVideoBlob = null;
      voiceButton.innerHTML = '🎤';
      voiceButton.style.background = '#1da1f2';
      voiceButton.title = 'Record voice note';
      
      previewButton.style.display = 'none';
      sendVoiceButton.style.display = 'none';
      cancelButton.style.display = 'none';
      
      sendVoiceButton.innerHTML = '📤 Send';
      sendVoiceButton.disabled = false;
      
      // Show success feedback
      voiceButton.innerHTML = '✅';
      voiceButton.style.background = '#17bf63';
      setTimeout(() => {
        voiceButton.innerHTML = '🎤';
        voiceButton.style.background = '#1da1f2';
      }, 2000);
      
    } else {
      console.error('[Voice Note] ❌ Send error:', response?.message);
      sendVoiceButton.innerHTML = '❌ Failed';
      sendVoiceButton.style.background = '#e74c3c';
      
      setTimeout(() => {
        sendVoiceButton.innerHTML = '📤 Send';
        sendVoiceButton.style.background = '#1da1f2';
        sendVoiceButton.disabled = false;
      }, 2000);
    }
  });
}

// Handle cancel button click
function handleCancelClick(voiceButton, previewButton, sendVoiceButton, cancelButton) {
  // Discard recording
  recordedVideoBlob = null;
  
  // Reset UI
  voiceButton.innerHTML = '🎤';
  voiceButton.style.background = '#1da1f2';
  voiceButton.title = 'Record voice note';
  
  previewButton.style.display = 'none';
  sendVoiceButton.style.display = 'none';
  cancelButton.style.display = 'none';
  
  console.log('[Voice Note] ❌ Recording cancelled');
}

// Convert audio blob to video blob with black screen
async function convertAudioToVideo(audioBlob) {
  return new Promise((resolve, reject) => {
    const audioURL = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioURL);
    
    audio.addEventListener('loadedmetadata', async () => {
      const duration = audio.duration;
      
      // Create canvas for video frames (black screen)
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      // Fill with black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add text overlay
      ctx.fillStyle = '#ffffff';
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🎤 Voice Note', canvas.width / 2, canvas.height / 2);
      
      // Create video stream from canvas
      const videoStream = canvas.captureStream(25); // 25 fps
      
      // Load audio for mixing
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaElementSource(audio);
      const destination = audioContext.createMediaStreamDestination();
      audioSource.connect(destination);
      
      // Combine video and audio streams
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);
      
      // Record combined stream
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 250000
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: 'video/mp4' });
        URL.revokeObjectURL(audioURL);
        audioContext.close();
        resolve(videoBlob);
      };
      
      recorder.onerror = (error) => {
        console.error('[Voice Note] ❌ Recording error:', error);
        URL.revokeObjectURL(audioURL);
        audioContext.close();
        reject(error);
      };
      
      // Start recording
      recorder.start();
      audio.play();
      
      // Stop after duration
      setTimeout(() => {
        recorder.stop();
        audio.pause();
      }, duration * 1000 + 500); // Add 500ms buffer
    });
    
    audio.addEventListener('error', (error) => {
      URL.revokeObjectURL(audioURL);
      reject(error);
    });
  });
}

function handleSendVoiceNote(request, sendResponse) {
  const audioData = request.audioData;
  const isVideo = request.isVideo || false;
  
  try {
    const textarea = document.querySelector('[data-testid="dm-composer-textarea"]');
    
    if (!textarea) {
      console.error('[Voice Note] ❌ Could not find textarea');
      sendResponse({ success: false, message: 'Could not find message input' });
      return;
    }
    
    console.log('[Voice Note] ✅ Found textarea, preparing file...');
    
    // Create video file for mobile compatibility
    const mimeType = isVideo ? 'video/mp4' : 'video/webm';
    const extension = isVideo ? 'mp4' : 'webm';
    const blob = base64ToBlob(audioData, mimeType);
    const file = new File([blob], `voice-note-${Date.now()}.${extension}`, { type: mimeType });
    
    let fileInput = document.querySelector('input[type="file"]');
    
    if (!fileInput) {
      const mediaButton = document.querySelector('button[aria-label*="Media"], button[aria-label*="attach"]');
      if (mediaButton) {
        console.log('[Voice Note] 🔘 Found media button');
        mediaButton.click();
        
        setTimeout(() => {
          fileInput = document.querySelector('input[type="file"]');
          if (fileInput) {
            uploadFile(fileInput, file, textarea, sendResponse);
          } else {
            sendResponse({ success: false, message: 'Could not access file input' });
          }
        }, 300);
        return;
      }
    }
    
    if (fileInput) {
      uploadFile(fileInput, file, textarea, sendResponse);
    } else {
      sendResponse({ success: false, message: 'Could not find media upload' });
    }
    
  } catch (error) {
    console.error('[Voice Note] ❌ Error:', error);
    sendResponse({ success: false, message: 'Error: ' + error.message });
  }
}

function uploadFile(fileInput, file, textarea, sendResponse) {
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('[Voice Note] ✅ File uploaded');
    
    let attempts = 0;
    const waitForButton = setInterval(() => {
      attempts++;
      const sendButton = document.querySelector('[data-testid="dm-composer-send-button"]');
      
      if (sendButton && !sendButton.disabled) {
        clearInterval(waitForButton);
        
        setTimeout(() => {
          console.log('[Voice Note] 🚀 Sending');
          sendButton.click();
          
          setTimeout(() => {
            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }, 50);
          
          console.log('[Voice Note] ✅ SUCCESS!');
          sendResponse({ success: true, message: 'Voice note sent!' });
        }, 100);
      } else if (attempts >= 30) {
        clearInterval(waitForButton);
        sendResponse({ success: false, message: 'Send button timeout' });
      }
    }, 100);
    
  } catch (error) {
    console.error('[Voice Note] ❌ Upload error:', error);
    sendResponse({ success: false, message: 'Upload error: ' + error.message });
  }
}

async function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, mimeType) {
  try {
    const base64String = base64.includes(',') ? base64.split(',')[1] : base64;
    const bstr = atob(base64String);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    
    return new Blob([u8arr], { type: mimeType });
  } catch (error) {
    console.error('[Voice Note] ❌ Error converting base64:', error);
    throw error;
  }
}

// Inject button when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectVoiceNoteButton);
} else {
  injectVoiceNoteButton();
}

// Also reinject periodically (for dynamic chat switching)
setInterval(injectVoiceNoteButton, 5000);