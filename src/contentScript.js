// Twitter Voice Note Extension - Content Script v2.5
console.log('[Voice Note] ✅ Content script initialized on:', window.location.href);

// Track recording state
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let currentStream = null;
let recordingStartTime = 0;
let recordedVideoBlob = null;
let recordingDuration = 0; // Store duration for display

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
  const checkInterval = setInterval(() => {
    if (document.querySelector('[data-voice-note-injected]')) {
      clearInterval(checkInterval);
      return;
    }
    
    const buttonContainer = document.querySelector('[data-testid="dm-composer-container"] .flex.items-end.gap-2');
    
    if (buttonContainer) {
      console.log('[Voice Note] 🎯 Found button container, injecting voice note button');
      
      // Create voice note button - circular like Twitter buttons
      const voiceButton = document.createElement('button');
      voiceButton.setAttribute('data-voice-note-injected', 'true');
      voiceButton.setAttribute('type', 'button');
      voiceButton.setAttribute('aria-label', 'Record voice note');
      voiceButton.className = 'gap-1 inline-flex items-center border border-solid has-[svg:only-child]:px-0 transition disabled:pointer-events-none focus-visible:outline disabled:opacity-50 justify-center bg-background rounded-full text-text h-8 min-w-8 px-0 [&>svg]:size-[1.125rem] text-subtext1 active:brightness-75 focus-visible:brightness-90 hover:brightness-90 outline-primary mb-px bg-gray-50 border-none hover:bg-gray-100';
      voiceButton.innerHTML = '🎤';
      voiceButton.style.cssText = 'font-size: 16px; width: 32px; height: 32px;';
      voiceButton.title = 'Record voice note';
      
      voiceButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleVoiceNoteClick(voiceButton);
      });
      
      const gifButton = buttonContainer.querySelector('[data-testid="dm-composer-gif-button"]');
      if (gifButton) {
        gifButton.parentNode.insertBefore(voiceButton, gifButton.nextSibling);
      } else {
        buttonContainer.appendChild(voiceButton);
      }
      
      // Create duration display label (shown while recording)
      const durationLabel = document.createElement('span');
      durationLabel.setAttribute('data-voice-duration-label', 'true');
      durationLabel.style.cssText = `
        display: none;
        font-size: 12px;
        color: #e74c3c;
        font-weight: 600;
        margin-left: 4px;
        margin-bottom: 1px;
      `;
      durationLabel.textContent = '0:00';
      voiceButton.parentNode.insertBefore(durationLabel, voiceButton.nextSibling);
      
      // Create actions container
      const actionsContainer = document.createElement('div');
      actionsContainer.setAttribute('data-voice-actions-container', 'true');
      actionsContainer.style.cssText = `
        display: none;
        gap: 4px;
        align-items: center;
      `;
      
      // Preview button - circular
      const previewButton = document.createElement('button');
      previewButton.setAttribute('data-voice-preview-button', 'true');
      previewButton.setAttribute('type', 'button');
      previewButton.setAttribute('aria-label', 'Preview voice note');
      previewButton.className = 'gap-1 inline-flex items-center border border-solid has-[svg:only-child]:px-0 transition disabled:pointer-events-none focus-visible:outline disabled:opacity-50 justify-center bg-background rounded-full text-text h-8 min-w-8 px-0 [&>svg]:size-[1.125rem] text-subtext1 active:brightness-75 focus-visible:brightness-90 hover:brightness-90 outline-primary mb-px bg-gray-50 border-none hover:bg-gray-100';
      previewButton.innerHTML = '▶️';
      previewButton.style.cssText = 'font-size: 14px; width: 32px; height: 32px;';
      previewButton.title = 'Preview';
      
      // Send button - circular
      const sendVoiceButton = document.createElement('button');
      sendVoiceButton.setAttribute('data-voice-send-button', 'true');
      sendVoiceButton.setAttribute('type', 'button');
      sendVoiceButton.setAttribute('aria-label', 'Send voice note');
      sendVoiceButton.className = 'gap-1 inline-flex items-center border border-solid has-[svg:only-child]:px-0 transition disabled:pointer-events-none focus-visible:outline disabled:opacity-50 justify-center bg-background rounded-full text-text h-8 min-w-8 px-0 [&>svg]:size-[1.125rem] text-subtext1 active:brightness-75 focus-visible:brightness-90 hover:brightness-90 outline-primary mb-px bg-gray-50 border-none hover:bg-gray-100';
      sendVoiceButton.innerHTML = '📤';
      sendVoiceButton.style.cssText = 'font-size: 14px; width: 32px; height: 32px;';
      sendVoiceButton.title = 'Send';
      
      // Cancel button - circular
      const cancelButton = document.createElement('button');
      cancelButton.setAttribute('data-voice-cancel-button', 'true');
      cancelButton.setAttribute('type', 'button');
      cancelButton.setAttribute('aria-label', 'Cancel voice note');
      cancelButton.className = 'gap-1 inline-flex items-center border border-solid has-[svg:only-child]:px-0 transition disabled:pointer-events-none focus-visible:outline disabled:opacity-50 justify-center bg-background rounded-full text-text h-8 min-w-8 px-0 [&>svg]:size-[1.125rem] text-subtext1 active:brightness-75 focus-visible:brightness-90 hover:brightness-90 outline-primary mb-px bg-gray-50 border-none hover:bg-gray-100';
      cancelButton.innerHTML = '❌';
      cancelButton.style.cssText = 'font-size: 14px; width: 32px; height: 32px;';
      cancelButton.title = 'Cancel';
      
      previewButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handlePreviewClick(previewButton);
      });
      
      sendVoiceButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSendClick(sendVoiceButton, voiceButton, actionsContainer, durationLabel);
      });
      
      cancelButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCancelClick(voiceButton, actionsContainer, durationLabel);
      });
      
      actionsContainer.appendChild(previewButton);
      actionsContainer.appendChild(sendVoiceButton);
      actionsContainer.appendChild(cancelButton);
      
      durationLabel.parentNode.insertBefore(actionsContainer, durationLabel.nextSibling);
      
      console.log('[Voice Note] ✅ Voice note controls injected');
      clearInterval(checkInterval);
    }
  }, 300);
  
  setTimeout(() => clearInterval(checkInterval), 30000);
}

async function handleVoiceNoteClick(voiceButton) {
  const durationLabel = document.querySelector('[data-voice-duration-label]');
  
  if (!isRecording) {
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
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        try {
          // Show converting feedback
          voiceButton.innerHTML = '🔄';
          voiceButton.title = 'Converting audio to video...';
          if (durationLabel) {
            durationLabel.textContent = 'Converting...';
            durationLabel.style.color = '#f39c12';
          }
          
          recordedVideoBlob = await convertAudioToVideo(audioBlob, recordingDuration);
          
          if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
          }
          
          const actionsContainer = document.querySelector('[data-voice-actions-container]');
          if (actionsContainer) {
            actionsContainer.style.display = 'flex';
          }
          
          voiceButton.innerHTML = '✅';
          voiceButton.title = 'Recording ready!';
          
          if (durationLabel) {
            const mins = Math.floor(recordingDuration / 60);
            const secs = Math.floor(recordingDuration % 60);
            durationLabel.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            durationLabel.style.color = '#17bf63';
          }
          
          console.log('[Voice Note] ✅ Recording ready');
          
        } catch (error) {
          console.error('[Voice Note] ❌ Conversion error:', error);
          voiceButton.innerHTML = '❌';
          if (durationLabel) {
            durationLabel.textContent = 'Error';
            durationLabel.style.color = '#e74c3c';
          }
          
          setTimeout(() => {
            voiceButton.innerHTML = '🎤';
            if (durationLabel) durationLabel.style.display = 'none';
          }, 2000);
        }
      });
      
      mediaRecorder.start();
      isRecording = true;
      recordingStartTime = Date.now();
      
      voiceButton.innerHTML = '⏹️';
      voiceButton.title = 'Stop recording';
      
      if (durationLabel) {
        durationLabel.style.display = 'inline-block';
        durationLabel.style.color = '#e74c3c';
      }
      
      // Update duration display
      const timerInterval = setInterval(() => {
        if (!isRecording) {
          clearInterval(timerInterval);
          return;
        }
        const elapsed = (Date.now() - recordingStartTime) / 1000;
        recordingDuration = elapsed;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (durationLabel) {
          durationLabel.textContent = timeString;
        }
        voiceButton.title = `Recording: ${timeString}`;
      }, 100);
      
      voiceButton.timerInterval = timerInterval;
      
    } catch (error) {
      console.error('[Voice Note] ❌ Microphone error:', error);
      alert('Unable to access microphone. Please check your browser permissions.');
      voiceButton.innerHTML = '❌';
      
      setTimeout(() => {
        voiceButton.innerHTML = '🎤';
      }, 2000);
    }
  } else {
    if (mediaRecorder && mediaRecorder.state !== 'stopped') {
      mediaRecorder.stop();
    }
    
    isRecording = false;
    
    if (voiceButton.timerInterval) {
      clearInterval(voiceButton.timerInterval);
    }
    
    voiceButton.innerHTML = '📤';
    voiceButton.title = 'Processing...';
  }
}

function handlePreviewClick(previewButton) {
  if (!recordedVideoBlob) return;
  
  const audioURL = URL.createObjectURL(recordedVideoBlob);
  const audio = new Audio(audioURL);
  
  previewButton.innerHTML = '⏸️';
  previewButton.title = 'Playing...';
  previewButton.disabled = true;
  
  audio.play();
  
  audio.addEventListener('ended', () => {
    previewButton.innerHTML = '▶️';
    previewButton.title = 'Preview';
    previewButton.disabled = false;
    URL.revokeObjectURL(audioURL);
  });
  
  audio.addEventListener('error', () => {
    previewButton.innerHTML = '▶️';
    previewButton.title = 'Preview';
    previewButton.disabled = false;
    URL.revokeObjectURL(audioURL);
  });
}

async function handleSendClick(sendVoiceButton, voiceButton, actionsContainer, durationLabel) {
  if (!recordedVideoBlob) return;
  
  sendVoiceButton.innerHTML = '⏳';
  sendVoiceButton.title = 'Sending...';
  sendVoiceButton.disabled = true;
  
  const base64Data = await blobToBase64(recordedVideoBlob);
  
  handleSendVoiceNote({ audioData: base64Data, isVideo: true }, (response) => {
    if (response && response.success) {
      recordedVideoBlob = null;
      voiceButton.innerHTML = '🎤';
      voiceButton.title = 'Record voice note';
      
      actionsContainer.style.display = 'none';
      if (durationLabel) durationLabel.style.display = 'none';
      
      sendVoiceButton.innerHTML = '📤';
      sendVoiceButton.disabled = false;
      
      voiceButton.innerHTML = '✅';
      setTimeout(() => {
        voiceButton.innerHTML = '🎤';
      }, 2000);
      
    } else {
      sendVoiceButton.innerHTML = '❌';
      
      setTimeout(() => {
        sendVoiceButton.innerHTML = '📤';
        sendVoiceButton.disabled = false;
      }, 2000);
    }
  });
}

function handleCancelClick(voiceButton, actionsContainer, durationLabel) {
  recordedVideoBlob = null;
  voiceButton.innerHTML = '🎤';
  voiceButton.title = 'Record voice note';
  actionsContainer.style.display = 'none';
  if (durationLabel) durationLabel.style.display = 'none';
}

// Convert audio to video with animated waveform
async function convertAudioToVideo(audioBlob, duration) {
  return new Promise((resolve, reject) => {
    const audioURL = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioURL);
    
    audio.addEventListener('loadedmetadata', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      // Set up audio analysis for waveform
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaElementSource(audio);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const destination = audioContext.createMediaStreamDestination();
      audioSource.connect(analyser);
      analyser.connect(destination);
      
      // Animation function for waveform - symmetric bell curve distribution
      function drawWaveform() {
        // Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Get audio data
        analyser.getByteFrequencyData(dataArray);
        
        // Number of bars to display (symmetric, so we'll mirror)
        const halfBarCount = 64; // Show 64 bars, mirrored = 128 total
        const barWidth = (canvas.width / (halfBarCount * 2)) - 2;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Smooth the data with interpolation
        const smoothData = [];
        for (let i = 0; i < halfBarCount; i++) {
          const index = Math.floor((i / halfBarCount) * bufferLength);
          const nextIndex = Math.min(index + 1, bufferLength - 1);
          const fraction = ((i / halfBarCount) * bufferLength) - index;
          
          // Linear interpolation for smoother bars
          const smoothValue = dataArray[index] * (1 - fraction) + dataArray[nextIndex] * fraction;
          smoothData.push(smoothValue);
        }
        
        // Apply bell curve weighting (more emphasis in middle)
        const weightedData = smoothData.map((value, i) => {
          const position = i / (halfBarCount - 1); // 0 to 1
          // Bell curve: higher weight in middle, lower at edges
          const bellWeight = Math.exp(-Math.pow((position - 0.5) * 3, 2));
          return value * (0.5 + bellWeight * 1.5); // Boost middle frequencies
        });
        
        // Draw bars symmetrically from center outward
        for (let i = 0; i < halfBarCount; i++) {
          const barHeight = (weightedData[i] / 255) * (canvas.height * 0.75);
          
          // Create gradient for bars (blue to purple to pink)
          const gradient = ctx.createLinearGradient(
            0, centerY - barHeight / 2,
            0, centerY + barHeight / 2
          );
          gradient.addColorStop(0, '#1da1f2');
          gradient.addColorStop(0.5, '#7c3aed');
          gradient.addColorStop(1, '#ec4899');
          
          ctx.fillStyle = gradient;
          
          // Calculate positions - mirror on both sides
          const offsetFromCenter = i * (barWidth + 2);
          
          // Right side bars (from center going right)
          const rightX = centerX + offsetFromCenter;
          ctx.fillRect(
            rightX,
            centerY - barHeight / 2,
            barWidth,
            barHeight
          );
          
          // Left side bars (mirror from center going left)
          const leftX = centerX - offsetFromCenter - barWidth;
          ctx.fillRect(
            leftX,
            centerY - barHeight / 2,
            barWidth,
            barHeight
          );
        }
      }
      
      // Start animation loop
      const animationInterval = setInterval(drawWaveform, 50);
      
      const videoStream = canvas.captureStream(25);
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);
      
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 500000
      });
      
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        clearInterval(animationInterval);
        const videoBlob = new Blob(chunks, { type: 'video/mp4' });
        URL.revokeObjectURL(audioURL);
        audioContext.close();
        resolve(videoBlob);
      };
      
      recorder.onerror = (error) => {
        clearInterval(animationInterval);
        URL.revokeObjectURL(audioURL);
        audioContext.close();
        reject(error);
      };
      
      recorder.start();
      audio.play();
      
      setTimeout(() => {
        recorder.stop();
        audio.pause();
      }, duration * 1000 + 500);
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
      sendResponse({ success: false, message: 'Could not find message input' });
      return;
    }
    
    const mimeType = isVideo ? 'video/mp4' : 'video/webm';
    const extension = isVideo ? 'mp4' : 'webm';
    const blob = base64ToBlob(audioData, mimeType);
    const file = new File([blob], `voice-note-${Date.now()}.${extension}`, { type: mimeType });
    
    let fileInput = document.querySelector('input[type="file"]');
    
    if (!fileInput) {
      const mediaButton = document.querySelector('button[data-testid="dm-composer-attachment-button"]');
      if (mediaButton) {
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
    
    let attempts = 0;
    const waitForButton = setInterval(() => {
      attempts++;
      const sendButton = document.querySelector('[data-testid="dm-composer-send-button"]');
      
      if (sendButton && !sendButton.disabled) {
        clearInterval(waitForButton);
        
        setTimeout(() => {
          sendButton.click();
          setTimeout(() => {
            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }, 50);
          sendResponse({ success: true, message: 'Voice note sent!' });
        }, 100);
      } else if (attempts >= 30) {
        clearInterval(waitForButton);
        sendResponse({ success: false, message: 'Send button timeout' });
      }
    }, 100);
    
  } catch (error) {
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectVoiceNoteButton);
} else {
  injectVoiceNoteButton();
}

setInterval(injectVoiceNoteButton, 5000);