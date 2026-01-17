// Twitter Voice Note Extension - Content Script v3.0
// Refactored with MutationObserver, proper cleanup, and optimizations
console.log('[Voice Note] Content script v3.0 loaded');

// State management (encapsulated)
const VoiceNoteState = {
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  recordingStartTime: 0,
  recordedVideoBlob: null,
  recordingDuration: 0,
  resources: new ResourceManager(),
  observer: null,
  analyser: null,
  dataArray: null,
  canvas: null,
  ctx: null,
};

/**
 * Initialize MutationObserver for efficient DOM watching
 */
function initObserver() {
  if (VoiceNoteState.observer) return;

  VoiceNoteState.observer = new MutationObserver((mutations) => {
    // Only check if we don't already have a button injected
    if (!document.querySelector(VN_SELECTORS.VOICE_BUTTON)) {
      const buttonContainer = document.querySelector(VN_SELECTORS.BUTTON_CONTAINER);
      if (buttonContainer) {
        injectVoiceNoteButton();
      }
    }
  });

  VoiceNoteState.observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial injection attempt
  injectVoiceNoteButton();
}

/**
 * Inject voice note button into Twitter DM composer
 */
function injectVoiceNoteButton() {
  if (document.querySelector(VN_SELECTORS.VOICE_BUTTON)) return;

  const buttonContainer = document.querySelector(VN_SELECTORS.BUTTON_CONTAINER);
  if (!buttonContainer) return;

  console.log('[Voice Note] Injecting voice note button');

  // Create main voice button
  const voiceButton = createButton(VN_ICONS.MICROPHONE, 'Record voice note');
  voiceButton.setAttribute('data-voice-note-injected', 'true');

  voiceButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleVoiceNoteClick(voiceButton);
  });

  // Insert after GIF button or append
  const gifButton = buttonContainer.querySelector(VN_SELECTORS.DM_GIF_BUTTON);
  if (gifButton) {
    gifButton.parentNode.insertBefore(voiceButton, gifButton.nextSibling);
  } else {
    buttonContainer.appendChild(voiceButton);
  }

  // Create duration label
  const durationLabel = document.createElement('span');
  durationLabel.setAttribute('data-voice-duration-label', 'true');
  durationLabel.style.cssText = `
    display: none;
    font-size: 12px;
    color: ${VN_CONFIG.BUTTON_COLOR};
    font-weight: 600;
    margin-left: 4px;
    margin-bottom: 1px;
  `;
  durationLabel.textContent = '0:00';
  voiceButton.parentNode.insertBefore(durationLabel, voiceButton.nextSibling);

  // Create actions container
  const actionsContainer = document.createElement('div');
  actionsContainer.setAttribute('data-voice-actions-container', 'true');
  actionsContainer.style.cssText = 'display: none; gap: 4px; align-items: center;';

  // Preview button
  const previewButton = createButton(VN_ICONS.PLAY, 'Preview');
  previewButton.setAttribute('data-voice-preview-button', 'true');
  previewButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handlePreviewClick(previewButton);
  });

  // Send button
  const sendVoiceButton = createButton(VN_ICONS.SEND, 'Send');
  sendVoiceButton.setAttribute('data-voice-send-button', 'true');
  sendVoiceButton.style.fontWeight = 'bold';
  sendVoiceButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSendClick(sendVoiceButton, voiceButton, actionsContainer, durationLabel);
  });

  // Cancel button
  const cancelButton = createButton(VN_ICONS.CANCEL, 'Cancel');
  cancelButton.setAttribute('data-voice-cancel-button', 'true');
  cancelButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleCancelClick(voiceButton, actionsContainer, durationLabel);
  });

  actionsContainer.appendChild(previewButton);
  actionsContainer.appendChild(sendVoiceButton);
  actionsContainer.appendChild(cancelButton);
  durationLabel.parentNode.insertBefore(actionsContainer, durationLabel.nextSibling);

  console.log('[Voice Note] Controls injected');
}

/**
 * Create a styled button element (48x48px to match Twitter's native buttons)
 * @param {string} icon - Button icon/text
 * @param {string} title - Button tooltip
 */
function createButton(icon, title) {
  const button = document.createElement('button');
  button.setAttribute('type', 'button');
  // Use Twitter's native button classes (same as attachment button)
  button.className = 'gap-1 inline-flex items-center border border-solid has-[svg:only-child]:px-0 transition disabled:pointer-events-none focus-visible:outline disabled:opacity-50 justify-center h-10 min-w-10 px-6 text-body bg-gray-50 text-text border-transparent hover:bg-gray-100 rounded-full';
  button.innerHTML = icon;
  button.style.cssText = `font-size: 20px; width: ${VN_CONFIG.BUTTON_SIZE}px; height: ${VN_CONFIG.BUTTON_SIZE}px; color: ${VN_CONFIG.BUTTON_COLOR};`;
  button.title = title;
  return button;
}

/**
 * Handle voice note button click - start/stop recording
 */
async function handleVoiceNoteClick(voiceButton) {
  const durationLabel = document.querySelector(VN_SELECTORS.DURATION_LABEL);

  if (!VoiceNoteState.isRecording) {
    await startRecording(voiceButton, durationLabel);
  } else {
    stopRecording(voiceButton);
  }
}

/**
 * Start recording audio with waveform visualization
 */
async function startRecording(voiceButton, durationLabel) {
  try {
    // Clean up any previous resources
    VoiceNoteState.resources.cleanup();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    VoiceNoteState.resources.setMediaStream(stream);

    // Set up canvas for waveform
    const canvas = document.createElement('canvas');
    canvas.width = VN_CONFIG.CANVAS_WIDTH;
    canvas.height = VN_CONFIG.CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    VoiceNoteState.canvas = canvas;
    VoiceNoteState.ctx = ctx;

    // Set up audio analysis
    const audioContext = new AudioContext();
    VoiceNoteState.resources.setAudioContext(audioContext);

    const audioSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = VN_CONFIG.FFT_SIZE;
    VoiceNoteState.analyser = analyser;
    VoiceNoteState.dataArray = new Uint8Array(analyser.frequencyBinCount);

    const destination = audioContext.createMediaStreamDestination();
    audioSource.connect(analyser);
    audioSource.connect(destination);

    // Start waveform animation using requestAnimationFrame
    function animate() {
      if (VoiceNoteState.isRecording) {
        drawWaveform();
        VoiceNoteState.resources.setAnimationFrame(requestAnimationFrame(animate));
      }
    }

    // Set up combined video + audio stream
    const videoStream = canvas.captureStream(VN_CONFIG.ANIMATION_FPS);
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);

    // Create MediaRecorder with best codec
    const bestCodec = VoiceNoteUtils.getBestVideoCodec();
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: bestCodec,
      videoBitsPerSecond: VN_CONFIG.VIDEO_BITRATE,
    });

    VoiceNoteState.audioChunks = [];
    VoiceNoteState.recordedVideoBlob = null;
    VoiceNoteState.mediaRecorder = mediaRecorder;

    mediaRecorder.addEventListener('dataavailable', (event) => {
      VoiceNoteState.audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', () => {
      VoiceNoteState.resources.cancelAnimationFrame();

      const { mimeType } = VoiceNoteUtils.getSimplifiedFormat(bestCodec);
      VoiceNoteState.recordedVideoBlob = new Blob(VoiceNoteState.audioChunks, { type: mimeType });

      // Clean up stream and audio context
      VoiceNoteState.resources.cleanup();

      // Show action buttons
      const actionsContainer = document.querySelector(VN_SELECTORS.ACTIONS_CONTAINER);
      if (actionsContainer) {
        actionsContainer.style.display = 'flex';
      }

      updateButton(voiceButton, VN_ICONS.CHECKMARK, 'Recording ready!');

      if (durationLabel) {
        durationLabel.textContent = VoiceNoteUtils.formatDuration(VoiceNoteState.recordingDuration);
      }

      console.log('[Voice Note] Recording ready!');
    });

    mediaRecorder.start();
    VoiceNoteState.isRecording = true;
    VoiceNoteState.recordingStartTime = Date.now();

    // Start animation
    animate();

    updateButton(voiceButton, VN_ICONS.STOP, 'Stop recording');

    if (durationLabel) {
      durationLabel.style.display = 'inline-block';
    }

    // Timer with max recording limit
    const timerId = VoiceNoteState.resources.setInterval(() => {
      if (!VoiceNoteState.isRecording) {
        VoiceNoteState.resources.clearInterval(timerId);
        return;
      }

      const elapsed = (Date.now() - VoiceNoteState.recordingStartTime) / 1000;
      VoiceNoteState.recordingDuration = elapsed;

      // Check max recording limit
      if (elapsed >= VN_CONFIG.MAX_RECORDING_SECONDS) {
        console.log(`[Voice Note] Max recording limit (${VN_CONFIG.MAX_RECORDING_SECONDS}s) reached`);
        stopRecording(voiceButton);
        return;
      }

      const timeString = VoiceNoteUtils.formatDuration(elapsed);
      const remaining = VN_CONFIG.MAX_RECORDING_SECONDS - Math.floor(elapsed);

      if (durationLabel) {
        durationLabel.textContent = timeString;
        // Visual warning when approaching limit
        if (remaining <= 10) {
          durationLabel.style.color = VN_CONFIG.STATUS_COLOR_ERROR;
        }
      }
      voiceButton.title = `Recording: ${timeString} (${remaining}s remaining)`;
    }, VN_CONFIG.TIMER_UPDATE_MS);

  } catch (error) {
    console.error('[Voice Note] Microphone error:', error);
    alert(VoiceNoteUtils.getMicrophoneErrorMessage(error));
    updateButton(voiceButton, VN_ICONS.MICROPHONE, 'Record voice note');
  }
}

/**
 * Stop the current recording
 */
function stopRecording(voiceButton) {
  if (VoiceNoteState.mediaRecorder && VoiceNoteState.mediaRecorder.state !== 'inactive') {
    VoiceNoteState.mediaRecorder.stop();
  }

  VoiceNoteState.isRecording = false;
  updateButton(voiceButton, VN_ICONS.LOADING, 'Finalizing...');
}

/**
 * Draw waveform visualization on canvas
 */
function drawWaveform() {
  const { ctx, canvas, analyser, dataArray } = VoiceNoteState;
  if (!ctx || !analyser || !dataArray) return;

  ctx.fillStyle = VN_CONFIG.WAVEFORM_BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  analyser.getByteFrequencyData(dataArray);

  const halfBarCount = VN_CONFIG.WAVEFORM_BAR_COUNT;
  const barWidth = (canvas.width / (halfBarCount * 2)) - 2;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const bufferLength = analyser.frequencyBinCount;

  // Smooth and weight the frequency data
  const smoothData = [];
  for (let i = 0; i < halfBarCount; i++) {
    const index = Math.floor((i / halfBarCount) * bufferLength);
    const nextIndex = Math.min(index + 1, bufferLength - 1);
    const fraction = ((i / halfBarCount) * bufferLength) - index;
    const smoothValue = dataArray[index] * (1 - fraction) + dataArray[nextIndex] * fraction;
    smoothData.push(smoothValue);
  }

  const weightedData = smoothData.map((value, i) => {
    const position = i / (halfBarCount - 1);
    const bellWeight = Math.exp(-Math.pow((position - 0.5) * 3, 2));
    return value * (0.5 + bellWeight * 1.5);
  });

  // Draw mirrored bars
  for (let i = 0; i < halfBarCount; i++) {
    const barHeight = (weightedData[i] / 255) * (canvas.height * VN_CONFIG.WAVEFORM_HEIGHT_RATIO);

    const gradient = ctx.createLinearGradient(
      0, centerY - barHeight / 2,
      0, centerY + barHeight / 2
    );
    gradient.addColorStop(0, VN_CONFIG.WAVEFORM_GRADIENT.TOP);
    gradient.addColorStop(0.5, VN_CONFIG.WAVEFORM_GRADIENT.MIDDLE);
    gradient.addColorStop(1, VN_CONFIG.WAVEFORM_GRADIENT.BOTTOM);

    ctx.fillStyle = gradient;

    const offsetFromCenter = i * (barWidth + 2);

    // Right side
    ctx.fillRect(centerX + offsetFromCenter, centerY - barHeight / 2, barWidth, barHeight);
    // Left side (mirrored)
    ctx.fillRect(centerX - offsetFromCenter - barWidth, centerY - barHeight / 2, barWidth, barHeight);
  }
}

/**
 * Handle preview button click
 */
function handlePreviewClick(previewButton) {
  if (!VoiceNoteState.recordedVideoBlob) return;

  const audioURL = VoiceNoteState.resources.createObjectURL(VoiceNoteState.recordedVideoBlob);
  const audio = new Audio(audioURL);

  updateButton(previewButton, VN_ICONS.PAUSE, 'Playing...');
  previewButton.disabled = true;

  audio.play();

  const cleanup = () => {
    updateButton(previewButton, VN_ICONS.PLAY, 'Preview');
    previewButton.disabled = false;
    VoiceNoteState.resources.revokeObjectURL(audioURL);
  };

  audio.addEventListener('ended', cleanup);
  audio.addEventListener('error', cleanup);
}

/**
 * Handle send button click
 */
async function handleSendClick(sendVoiceButton, voiceButton, actionsContainer, durationLabel) {
  if (!VoiceNoteState.recordedVideoBlob) return;

  updateButton(sendVoiceButton, VN_ICONS.LOADING, 'Sending...');
  sendVoiceButton.disabled = true;

  try {
    const base64Data = await VoiceNoteUtils.blobToBase64(VoiceNoteState.recordedVideoBlob);

    handleSendVoiceNote({
      audioData: base64Data,
      isVideo: true,
      blobType: VoiceNoteState.recordedVideoBlob.type,
    }, (response) => {
      if (response && response.success) {
        resetUI(voiceButton, actionsContainer, durationLabel, sendVoiceButton);

        // Success feedback
        updateButton(voiceButton, VN_ICONS.CHECKMARK, 'Sent!');
        setTimeout(() => {
          updateButton(voiceButton, VN_ICONS.MICROPHONE, 'Record voice note');
        }, VN_CONFIG.SUCCESS_FEEDBACK_DURATION_MS);

      } else {
        // Error feedback
        updateButton(sendVoiceButton, VN_ICONS.CANCEL, 'Failed');
        setTimeout(() => {
          updateButton(sendVoiceButton, VN_ICONS.SEND, 'Send');
          sendVoiceButton.disabled = false;
        }, VN_CONFIG.SUCCESS_FEEDBACK_DURATION_MS);
      }
    });
  } catch (error) {
    console.error('[Voice Note] Send error:', error);
    updateButton(sendVoiceButton, VN_ICONS.SEND, 'Send');
    sendVoiceButton.disabled = false;
  }
}

/**
 * Handle cancel button click
 */
function handleCancelClick(voiceButton, actionsContainer, durationLabel) {
  VoiceNoteState.recordedVideoBlob = null;
  resetUI(voiceButton, actionsContainer, durationLabel);
}

/**
 * Reset UI to initial state
 */
function resetUI(voiceButton, actionsContainer, durationLabel, sendVoiceButton = null) {
  VoiceNoteState.recordedVideoBlob = null;
  updateButton(voiceButton, VN_ICONS.MICROPHONE, 'Record voice note');
  actionsContainer.style.display = 'none';

  if (durationLabel) {
    durationLabel.style.display = 'none';
    durationLabel.style.color = VN_CONFIG.BUTTON_COLOR;
  }

  if (sendVoiceButton) {
    updateButton(sendVoiceButton, VN_ICONS.SEND, 'Send');
    sendVoiceButton.disabled = false;
  }
}

/**
 * Update button icon and title
 */
function updateButton(button, icon, title) {
  button.innerHTML = icon;
  button.title = title;
  button.style.color = VN_CONFIG.BUTTON_COLOR;
}

/**
 * Send voice note to Twitter
 */
function handleSendVoiceNote(request, sendResponse) {
  const { audioData, blobType } = request;

  try {
    const textarea = document.querySelector(VN_SELECTORS.DM_COMPOSER_TEXTAREA);
    if (!textarea) {
      sendResponse({ success: false, message: 'Could not find message input' });
      return;
    }

    // Determine mime type
    let actualMimeType = blobType || 'video/webm';
    const extractedType = VoiceNoteUtils.extractMimeType(audioData);
    if (extractedType) {
      actualMimeType = extractedType;
      console.log('[Voice Note] Detected mime type:', actualMimeType);
    }

    const { mimeType, extension } = VoiceNoteUtils.getSimplifiedFormat(actualMimeType);
    const blob = VoiceNoteUtils.base64ToBlob(audioData, mimeType);
    const file = new File([blob], `voice-note-${Date.now()}.${extension}`, {
      type: mimeType,
      lastModified: Date.now(),
    });

    console.log(`[Voice Note] Sending as: ${extension} (${mimeType})`);

    let fileInput = document.querySelector(VN_SELECTORS.FILE_INPUT);

    if (!fileInput) {
      const mediaButton = document.querySelector(VN_SELECTORS.DM_ATTACHMENT_BUTTON);
      if (mediaButton) {
        mediaButton.click();

        setTimeout(() => {
          fileInput = document.querySelector(VN_SELECTORS.FILE_INPUT);
          if (fileInput) {
            uploadFile(fileInput, file, sendResponse);
          } else {
            sendResponse({ success: false, message: 'Could not access file input' });
          }
        }, VN_CONFIG.MEDIA_BUTTON_DELAY_MS);
        return;
      }
    }

    if (fileInput) {
      uploadFile(fileInput, file, sendResponse);
    } else {
      sendResponse({ success: false, message: 'Could not find media upload' });
    }

  } catch (error) {
    console.error('[Voice Note] Send error:', error);
    sendResponse({ success: false, message: 'Error: ' + error.message });
  }
}

/**
 * Upload file to Twitter via file input
 */
function uploadFile(fileInput, file, sendResponse) {
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));

    let attempts = 0;
    const waitForButton = setInterval(() => {
      attempts++;
      const sendButton = document.querySelector(VN_SELECTORS.DM_SEND_BUTTON);

      if (sendButton && !sendButton.disabled) {
        clearInterval(waitForButton);

        setTimeout(() => {
          sendButton.click();
          setTimeout(() => {
            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }, VN_CONFIG.SEND_CLICK_DELAY_MS);
          sendResponse({ success: true, message: 'Voice note sent!' });
        }, VN_CONFIG.SEND_BUTTON_DELAY_MS);

      } else if (attempts >= VN_CONFIG.UPLOAD_MAX_ATTEMPTS) {
        clearInterval(waitForButton);
        sendResponse({ success: false, message: 'Send button timeout' });
      }
    }, VN_CONFIG.UPLOAD_CHECK_INTERVAL_MS);

  } catch (error) {
    sendResponse({ success: false, message: 'Upload error: ' + error.message });
  }
}

/**
 * Cleanup on page unload
 */
function cleanup() {
  VoiceNoteState.resources.cleanup();
  if (VoiceNoteState.observer) {
    VoiceNoteState.observer.disconnect();
    VoiceNoteState.observer = null;
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initObserver);
} else {
  initObserver();
}

// Cleanup on unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);
