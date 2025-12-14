// This file is intentionally left blank.

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

// ...existing code...

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
        // Send the audio - will convert to video
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const base64Data = await blobToBase64(audioBlob);
        
        // Stop the stream
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop());
          currentStream = null;
        }
        
        // Send to content script
        handleSendVoiceNote({ audioData: base64Data }, (response) => {
          if (response && response.success) {
            console.log('[Voice Note] ✅ Audio sent as video!');
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
    button.title = 'Sending...';
  }
}

function handleSendVoiceNote(request, sendResponse) {
  const audioData = request.audioData;
  
  try {
    const textarea = document.querySelector('[data-testid="dm-composer-textarea"]');
    
    if (!textarea) {
      console.error('[Voice Note] ❌ Could not find textarea');
      sendResponse({ success: false, message: 'Could not find message input' });
      return;
    }
    
    console.log('[Voice Note] ✅ Found textarea, preparing audio file...');
    
    // Create audio file directly (no conversion)
    const audioBlob = base64ToBlob(audioData, 'audio/webm');
    const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
    
    let fileInput = document.querySelector('input[type="file"]');
    
    if (!fileInput) {
      const mediaButton = document.querySelector('button[aria-label*="Media"], button[aria-label*="attach"]');
      if (mediaButton) {
        console.log('[Voice Note] 🔘 Found media button');
        mediaButton.click();
        
        setTimeout(() => {
          fileInput = document.querySelector('input[type="file"]');
          if (fileInput) {
            uploadAudioFile(fileInput, audioFile, textarea, sendResponse);
          } else {
            sendResponse({ success: false, message: 'Could not access file input' });
          }
        }, 300);
        return;
      }
    }
    
    if (fileInput) {
      uploadAudioFile(fileInput, audioFile, textarea, sendResponse);
    } else {
      sendResponse({ success: false, message: 'Could not find media upload' });
    }
    
  } catch (error) {
    console.error('[Voice Note] ❌ Error:', error);
    sendResponse({ success: false, message: 'Error: ' + error.message });
  }
}

function uploadAudioFile(fileInput, audioFile, textarea, sendResponse) {
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(audioFile);
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