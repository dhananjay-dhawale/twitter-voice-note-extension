let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let currentStream = null;
let recordingStartTime = 0;
let recordingTimer = null;

const recordButton = document.getElementById('recordButton');
const sendButton = document.getElementById('sendButton');
const audioPlayback = document.getElementById('audioPlayback');

recordButton.addEventListener('click', async () => {
  if (!isRecording) {
    try {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      currentStream = stream;
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayback.src = audioUrl;
        audioPlayback.playbackRate = 1;
        sendButton.disabled = false;
        
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop());
          currentStream = null;
        }
        
        if (recordingTimer) {
          clearInterval(recordingTimer);
          recordingTimer = null;
        }
      });

      mediaRecorder.start();
      isRecording = true;
      recordingStartTime = Date.now();
      recordButton.textContent = '⏹️ Stop Recording';
      recordButton.style.backgroundColor = '#e74c3c';
      
      const status = document.getElementById('status');
      if (status) {
        status.textContent = 'Recording...';
        status.style.color = '#1da1f2';
      }
      
      // Update timer display in audio player (0:00/0:23 format)
      recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        // Set duration and trigger update
        audioPlayback.duration = elapsed;
        audioPlayback.dispatchEvent(new Event('durationchange', { bubbles: true }));
      }, 100);
      
    } catch (error) {
      console.error('Detailed error:', error);
      handleMicrophoneError(error);
    }
  } else {
    if (mediaRecorder && mediaRecorder.state !== 'stopped') {
      mediaRecorder.stop();
    }
    isRecording = false;
    recordButton.textContent = '🎤 Record';
    recordButton.style.backgroundColor = '#1da1f2';
    
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
    
    const status = document.getElementById('status');
    if (status) {
      status.textContent = 'Recording stopped. Ready to send.';
      status.style.color = '#666';
    }
  }
});

sendButton.addEventListener('click', async () => {
  if (audioChunks.length > 0 && audioPlayback.src) {
    const status = document.getElementById('status');
    
    try {
      status.textContent = 'Sending voice note...';
      status.style.color = '#1da1f2';
      
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const base64Data = await blobToBase64(audioBlob);
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
          status.textContent = 'Error: No active tab';
          status.style.color = 'red';
          console.error('No active tab found');
          return;
        }
        
        console.log('Sending to tab:', tabs[0].url);
        
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SEND_VOICE_NOTE',
          audioData: base64Data
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
            status.textContent = 'Error: Content script not loaded. Make sure you\'re on x.com or twitter.com and refresh the page.';
            status.style.color = 'red';
            return;
          }
          
          console.log('Response received:', response);
          
          if (response && response.success) {
            status.textContent = '✅ Voice note sent!';
            status.style.color = '#17bf63';
            
            setTimeout(() => {
              audioChunks = [];
              audioPlayback.src = '';
              sendButton.disabled = true;
              status.textContent = 'Ready to record new note';
              status.style.color = '#666';
            }, 2000);
          } else {
            const errorMsg = response?.message || 'Unknown error sending voice note';
            status.textContent = 'Error: ' + errorMsg;
            status.style.color = 'red';
            console.error('Send failed:', response);
          }
        });
      });
    } catch (error) {
      console.error('Error sending:', error);
      const status = document.getElementById('status');
      if (status) {
        status.textContent = 'Error: ' + error.message;
        status.style.color = 'red';
      }
    }
  } else {
    alert('Please record a voice note first!');
  }
});

async function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function handleMicrophoneError(error) {
  let errorMessage = '';
  const status = document.getElementById('status');
  
  console.error('Error type:', error.name);
  console.error('Error message:', error.message);
  
  if (error.name === 'NotAllowedError') {
    errorMessage = 'Microphone access denied.\n\nGo to: chrome://settings/content/microphone\nFind this extension and set to Allow';
  } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    errorMessage = 'No microphone found. Check your system settings.';
  } else if (error.name === 'NotReadableError') {
    errorMessage = 'Microphone is in use. Close other apps and try again.';
  } else if (error.name === 'SecurityError') {
    errorMessage = 'Security error - extension may be blocked.';
  } else if (error.name === 'AbortError') {
    errorMessage = 'Microphone request aborted. Try again.';
  } else {
    errorMessage = `Error: ${error.name}\n\n${error.message}`;
  }
  
  alert(errorMessage);
  
  if (status) {
    status.textContent = 'Microphone error';
    status.style.color = 'red';
  }
}