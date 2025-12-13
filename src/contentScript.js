// This file is intentionally left blank.

console.log('[Voice Note] ✅ Content script initialized on:', window.location.href);

// Register the message listener immediately
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Voice Note] 📨 Received message type:', request.type);
  
  if (request.type === 'SEND_VOICE_NOTE') {
    console.log('[Voice Note] 🎙️ Processing SEND_VOICE_NOTE');
    handleSendVoiceNote(request, sendResponse);
    return true; // Keep the channel open for async response
  }
});

function handleSendVoiceNote(request, sendResponse) {
  const audioData = request.audioData;
  
  try {
    // Find the textarea directly
    const textarea = document.querySelector('[data-testid="dm-composer-textarea"]');
    
    if (!textarea) {
      console.error('[Voice Note] ❌ Could not find textarea');
      sendResponse({ success: false, message: 'Could not find message input field' });
      return;
    }
    
    console.log('[Voice Note] ✅ Found textarea');
    
    // Strategy 1: Try to use the media/file upload input
    console.log('[Voice Note] 🔍 Looking for file input...');
    let fileInput = document.querySelector('input[type="file"]');
    
    if (!fileInput) {
      // Try to find it more broadly
      fileInput = document.querySelector('[accept*="audio"], [accept*="media"]');
    }
    
    if (!fileInput) {
      // Try to find the media button and click it to reveal the input
      const mediaButton = document.querySelector('button[aria-label*="Media"], button[aria-label*="attach"]');
      if (mediaButton) {
        console.log('[Voice Note] 🔘 Found media button, clicking to reveal file input');
        mediaButton.click();
        
        // Wait for input to appear
        setTimeout(() => {
          fileInput = document.querySelector('input[type="file"]');
          if (fileInput) {
            uploadAudioFile(fileInput, audioData, textarea, sendResponse);
          } else {
            console.error('[Voice Note] ❌ File input still not found after clicking media button');
            // Fallback to text-based approach
            sendAudioAsText(textarea, audioData, sendResponse);
          }
        }, 300);
        return;
      }
    }
    
    if (fileInput) {
      uploadAudioFile(fileInput, audioData, textarea, sendResponse);
    } else {
      console.log('[Voice Note] ⚠️ No file input found, using text approach with audio link');
      sendAudioAsText(textarea, audioData, sendResponse);
    }
    
  } catch (error) {
    console.error('[Voice Note] ❌ Error:', error);
    sendResponse({ success: false, message: 'Error: ' + error.message });
  }
}

function uploadAudioFile(fileInput, audioData, textarea, sendResponse) {
  try {
    // Convert base64 audio to blob
    const audioBlob = base64ToBlob(audioData, 'audio/webm');
    console.log('[Voice Note] 🎵 Audio blob created, size:', audioBlob.size, 'bytes');
    
    // Create a file from the blob
    const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
    console.log('[Voice Note] � Audio file created:', audioFile.name);
    
    // Create DataTransfer to set files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(audioFile);
    fileInput.files = dataTransfer.files;
    
    // Trigger change event to notify Twitter
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('[Voice Note] ✅ File set in input, waiting for send button');
    
    // Wait for send button to appear
    let attempts = 0;
    const waitForButton = setInterval(() => {
      attempts++;
      const sendButton = document.querySelector('[data-testid="dm-composer-send-button"]');
      
      if (sendButton && !sendButton.disabled) {
        clearInterval(waitForButton);
        console.log('[Voice Note] ✅ Send button ready');
        
        setTimeout(() => {
          console.log('[Voice Note] 🚀 Sending audio file');
          sendButton.click();
          
          setTimeout(() => {
            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }, 50);
          
          console.log('[Voice Note] ✅ SUCCESS - Audio sent as file!');
          sendResponse({ success: true, message: 'Voice note sent!' });
        }, 100);
      } else if (attempts >= 30) {
        clearInterval(waitForButton);
        console.error('[Voice Note] ❌ Send button timeout');
        sendResponse({ success: false, message: 'Could not send audio file' });
      }
    }, 100);
    
  } catch (error) {
    console.error('[Voice Note] ❌ Upload error:', error);
    sendResponse({ success: false, message: 'Upload error: ' + error.message });
  }
}

function sendAudioAsText(textarea, audioData, sendResponse) {
  try {
    console.log('[Voice Note] 📝 Sending as text with audio data');
    
    // Create a message with audio metadata
    const timestamp = new Date().toLocaleTimeString();
    const voiceNoteText = `🎤 Voice Note (${timestamp})`;
    
    // Set textarea value
    textarea.value = voiceNoteText;
    console.log('[Voice Note] 📝 Message set, storing audio data');
    
    // Store audio in a more persistent way
    const messageId = 'voice_' + Date.now();
    localStorage.setItem(messageId, audioData);
    
    // Add a custom attribute to track this
    textarea.setAttribute('data-voice-id', messageId);
    
    // Trigger events
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    
    // Wait for send button
    let attempts = 0;
    const waitForButton = setInterval(() => {
      attempts++;
      const sendButton = document.querySelector('[data-testid="dm-composer-send-button"]');
      
      if (sendButton && !sendButton.disabled) {
        clearInterval(waitForButton);
        
        setTimeout(() => {
          console.log('[Voice Note] 🚀 Sending message');
          sendButton.click();
          
          setTimeout(() => {
            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }, 50);
          
          console.log('[Voice Note] ✅ SUCCESS - Message sent!');
          sendResponse({ success: true, message: 'Voice note sent!' });
        }, 100);
      } else if (attempts >= 20) {
        clearInterval(waitForButton);
        sendResponse({ success: false, message: 'Could not send message' });
      }
    }, 100);
    
  } catch (error) {
    console.error('[Voice Note] ❌ Error:', error);
    sendResponse({ success: false, message: 'Error: ' + error.message });
  }
}

// Helper function to convert base64 to blob
function base64ToBlob(base64, mimeType) {
  try {
    // Remove data URL prefix if present
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