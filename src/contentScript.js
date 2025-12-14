// Twitter Voice Note Extension - Content Script
console.log('[Voice Note] ✅ Content script initialized on:', window.location.href);

// Track recording state
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let currentStream = null;
let recordingStartTime = 0;

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
    
    const sendButton = document.querySelector('[data-testid="dm-composer-send-button"]');
    
    if (sendButton) {
      console.log('[Voice Note] 🎯 Found send button, injecting voice note button');
      
      // Create voice note button matching send button's exact classes
      const voiceButton = document.createElement('button');
      voiceButton.setAttribute('data-voice-note-injected', 'true');
      voiceButton.setAttribute('type', 'button');
      voiceButton.setAttribute('aria-label', 'Send voice note');
      voiceButton.setAttribute('class', sendButton.getAttribute('class'));
      voiceButton.innerHTML = '🎤';
      voiceButton.style.marginRight = '8px';
      
      // Add click handler
      voiceButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleVoiceNoteClick(voiceButton);
      });
      
      // Find the wrapper that contains the send button (the div with mb-1 self-end)
      const sendButtonWrapper = sendButton.parentElement;
      
      // Insert the voice button INSIDE the same wrapper, before the send button
      // This keeps them in the same alignment container
      sendButtonWrapper.insertBefore(voiceButton, sendButton);
      console.log('[Voice Note] ✅ Voice note button injected next to send button');
      
      clearInterval(checkInterval);
    }
  }, 300);
  
  // Stop checking after 30 seconds
  setTimeout(() => clearInterval(checkInterval), 30000);
}

// Handle voice note button click
async function handleVoiceNoteClick(button) {
  if (!isRecording) {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      currentStream = stream;
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });
      
      mediaRecorder.addEventListener('stop', async () => {
        // Convert audio to video format for mobile compatibility
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        try {
          button.innerHTML = '🔄';
          button.title = 'Converting...';
          
          // Convert audio to MP4 video
          const videoBlob = await convertAudioToVideo(audioBlob);
          const base64Data = await blobToBase64(videoBlob);
          
          // Stop the stream
          if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
          }
          
          // Send to content script
          handleSendVoiceNote({ audioData: base64Data, isVideo: true }, (response) => {
            if (response && response.success) {
              console.log('[Voice Note] ✅ Voice note sent as video!');
              button.innerHTML = '✅';
              button.style.background = '#17bf63';
              
              setTimeout(() => {
                button.innerHTML = '🎤';
                button.style.background = '#1da1f2';
              }, 2000);
            } else {
              console.error('[Voice Note] ❌ Error:', response?.message);
              button.innerHTML = '❌';
              button.style.background = '#e74c3c';
              
              setTimeout(() => {
                button.innerHTML = '🎤';
                button.style.background = '#1da1f2';
              }, 2000);
            }
          });
        } catch (error) {
          console.error('[Voice Note] ❌ Conversion error:', error);
          button.innerHTML = '❌';
          button.style.background = '#e74c3c';
          
          setTimeout(() => {
            button.innerHTML = '🎤';
            button.style.background = '#1da1f2';
          }, 2000);
        }
      });
      
      mediaRecorder.start();
      isRecording = true;
      recordingStartTime = Date.now();
      
      // Update button to show recording state
      button.innerHTML = '⏹️';
      button.style.background = '#e74c3c';
      
      // Show recording timer
      const timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        button.title = `Recording: ${timeString}`;
      }, 100);
      
      // Store interval for cleanup
      button.timerInterval = timerInterval;
      
    } catch (error) {
      console.error('[Voice Note] ❌ Error:', error);
      button.innerHTML = '❌';
      button.style.background = '#e74c3c';
      
      setTimeout(() => {
        button.innerHTML = '🎤';
        button.style.background = '#1da1f2';
      }, 2000);
    }
  } else {
    // Stop recording
    if (mediaRecorder && mediaRecorder.state !== 'stopped') {
      mediaRecorder.stop();
    }
    
    isRecording = false;
    
    // Clear timer
    if (button.timerInterval) {
      clearInterval(button.timerInterval);
    }
    
    button.innerHTML = '📤';
    button.title = 'Processing...';
  }
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