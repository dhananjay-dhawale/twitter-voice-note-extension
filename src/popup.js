// Twitter Voice Note Extension - Popup Script
// Uses shared utilities and constants for consistency

// State management
const PopupState = {
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  recordingStartTime: 0,
  resources: new ResourceManager(),
};

// DOM elements
const recordButton = document.getElementById('recordButton');
const sendButton = document.getElementById('sendButton');
const audioPlayback = document.getElementById('audioPlayback');
const status = document.getElementById('status');

/**
 * Update status message
 */
function updateStatus(message, color = VN_CONFIG.STATUS_COLOR_DEFAULT) {
  if (status) {
    status.textContent = message;
    status.style.color = color;
  }
}

/**
 * Start recording
 */
async function startRecording() {
  try {
    // Clean up any previous resources
    PopupState.resources.cleanup();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    PopupState.resources.setMediaStream(stream);

    PopupState.mediaRecorder = new MediaRecorder(stream);
    PopupState.audioChunks = [];

    PopupState.mediaRecorder.addEventListener('dataavailable', (event) => {
      PopupState.audioChunks.push(event.data);
    });

    PopupState.mediaRecorder.addEventListener('stop', () => {
      const audioBlob = new Blob(PopupState.audioChunks, { type: 'audio/webm' });
      const audioUrl = PopupState.resources.createObjectURL(audioBlob);
      audioPlayback.src = audioUrl;
      audioPlayback.playbackRate = 1;
      sendButton.disabled = false;

      // Clean up stream
      PopupState.resources.cleanup();

      updateStatus('Recording stopped. Ready to send.');
    });

    PopupState.mediaRecorder.start();
    PopupState.isRecording = true;
    PopupState.recordingStartTime = Date.now();

    recordButton.textContent = '⏹️ Stop Recording';
    recordButton.style.backgroundColor = '#e74c3c';

    updateStatus('Recording...', VN_CONFIG.STATUS_COLOR_RECORDING);

    // Update timer display
    const timerId = PopupState.resources.setInterval(() => {
      if (!PopupState.isRecording) {
        PopupState.resources.clearInterval(timerId);
        return;
      }

      const elapsed = Math.floor((Date.now() - PopupState.recordingStartTime) / 1000);

      // Check max recording limit
      if (elapsed >= VN_CONFIG.MAX_RECORDING_SECONDS) {
        stopRecording();
        updateStatus(`Max recording limit (${VN_CONFIG.MAX_RECORDING_SECONDS}s) reached`);
        return;
      }

      const timeString = VoiceNoteUtils.formatDuration(elapsed);
      const remaining = VN_CONFIG.MAX_RECORDING_SECONDS - elapsed;

      updateStatus(`Recording: ${timeString} (${remaining}s remaining)`, VN_CONFIG.STATUS_COLOR_RECORDING);
    }, VN_CONFIG.TIMER_UPDATE_MS);

  } catch (error) {
    console.error('Recording error:', error);
    const errorMessage = VoiceNoteUtils.getMicrophoneErrorMessage(error);
    alert(errorMessage);
    updateStatus('Microphone error', VN_CONFIG.STATUS_COLOR_ERROR);
  }
}

/**
 * Stop recording
 */
function stopRecording() {
  if (PopupState.mediaRecorder && PopupState.mediaRecorder.state !== 'inactive') {
    PopupState.mediaRecorder.stop();
  }
  PopupState.isRecording = false;
  recordButton.textContent = '🎤 Record';
  recordButton.style.backgroundColor = VN_CONFIG.STATUS_COLOR_RECORDING;
}

/**
 * Send voice note to active tab
 */
async function sendVoiceNote() {
  if (PopupState.audioChunks.length === 0 || !audioPlayback.src) {
    alert('Please record a voice note first!');
    return;
  }

  try {
    updateStatus('Sending voice note...', VN_CONFIG.STATUS_COLOR_RECORDING);

    const audioBlob = new Blob(PopupState.audioChunks, { type: 'audio/webm' });
    const base64Data = await VoiceNoteUtils.blobToBase64(audioBlob);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        updateStatus('Error: No active tab', VN_CONFIG.STATUS_COLOR_ERROR);
        console.error('No active tab found');
        return;
      }

      console.log('Sending to tab:', tabs[0].url);

      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'SEND_VOICE_NOTE',
        audioData: base64Data,
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          updateStatus(
            'Error: Content script not loaded. Make sure you\'re on x.com or twitter.com and refresh the page.',
            VN_CONFIG.STATUS_COLOR_ERROR
          );
          return;
        }

        console.log('Response received:', response);

        if (response && response.success) {
          updateStatus('✅ Voice note sent!', VN_CONFIG.STATUS_COLOR_SUCCESS);

          setTimeout(() => {
            // Clean up
            PopupState.audioChunks = [];
            if (audioPlayback.src) {
              PopupState.resources.revokeObjectURL(audioPlayback.src);
              audioPlayback.src = '';
            }
            sendButton.disabled = true;
            updateStatus('Ready to record new note');
          }, VN_CONFIG.SUCCESS_FEEDBACK_DURATION_MS);

        } else {
          const errorMsg = response?.message || 'Unknown error sending voice note';
          updateStatus('Error: ' + errorMsg, VN_CONFIG.STATUS_COLOR_ERROR);
          console.error('Send failed:', response);
        }
      });
    });
  } catch (error) {
    console.error('Error sending:', error);
    updateStatus('Error: ' + error.message, VN_CONFIG.STATUS_COLOR_ERROR);
  }
}

// Event listeners
recordButton.addEventListener('click', () => {
  if (!PopupState.isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

sendButton.addEventListener('click', sendVoiceNote);

// Cleanup on popup close
window.addEventListener('unload', () => {
  PopupState.resources.cleanup();
});
