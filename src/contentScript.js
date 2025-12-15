// Twitter Voice Note Extension - Content Script v2.8 (iOS COMPATIBLE!)
console.log('[Voice Note] ✅ Content script v2.8 - iOS H.264 support enabled');

let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let currentStream = null;
let recordingStartTime = 0;
let recordedVideoBlob = null;
let recordingDuration = 0;

// NEW: Smart codec selection for iOS compatibility
function getBestVideoCodec() {
  const codecs = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',  // iOS perfect - MP4 container
    'video/webm;codecs=h264,opus',             // iOS compatible - WebM container
    'video/webm;codecs=h264',                  // iOS partial support
    'video/mp4;codecs=avc1',                   // iOS compatible
    'video/mp4',                               // Generic MP4
    'video/webm;codecs=vp8,opus',              // Fallback (current)
  ];
  
  for (const codec of codecs) {
    if (MediaRecorder.isTypeSupported(codec)) {
      console.log(`[Voice Note] ✅ Using iOS-compatible codec: ${codec}`);
      return codec;
    }
  }
  
  console.log('[Voice Note] ⚠️ Using fallback codec');
  return 'video/webm';
}

// Inject voice note button
function injectVoiceNoteButton() {
  const checkInterval = setInterval(() => {
    if (document.querySelector('[data-voice-note-injected]')) {
      clearInterval(checkInterval);
      return;
    }
    
    const buttonContainer = document.querySelector('[data-testid="dm-composer-container"] .flex.items-end.gap-2');
    
    if (buttonContainer) {
      console.log('[Voice Note] 🎯 Injecting voice note button');
      
      const voiceButton = document.createElement('button');
      voiceButton.setAttribute('data-voice-note-injected', 'true');
      voiceButton.setAttribute('type', 'button');
      voiceButton.className = 'gap-1 inline-flex items-center border border-solid has-[svg:only-child]:px-0 transition disabled:pointer-events-none focus-visible:outline disabled:opacity-50 justify-center bg-background rounded-full text-text h-8 min-w-8 px-0 [&>svg]:size-[1.125rem] text-subtext1 active:brightness-75 focus-visible:brightness-90 hover:brightness-90 outline-primary mb-px bg-gray-50 border-none hover:bg-gray-100';
      voiceButton.innerHTML = '🎤';
      voiceButton.style.cssText = 'font-size: 16px; width: 32px; height: 32px; color: rgb(113, 118, 123);';
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
      
      const durationLabel = document.createElement('span');
      durationLabel.setAttribute('data-voice-duration-label', 'true');
      durationLabel.style.cssText = 'display: none; font-size: 12px; color: rgb(113, 118, 123); font-weight: 600; margin-left: 4px; margin-bottom: 1px;';
      durationLabel.textContent = '0:00';
      voiceButton.parentNode.insertBefore(durationLabel, voiceButton.nextSibling);
      
      const actionsContainer = document.createElement('div');
      actionsContainer.setAttribute('data-voice-actions-container', 'true');
      actionsContainer.style.cssText = 'display: none; gap: 4px; align-items: center;';
      
      const previewButton = document.createElement('button');
      previewButton.setAttribute('data-voice-preview-button', 'true');
      previewButton.setAttribute('type', 'button');
      previewButton.className = 'gap-1 inline-flex items-center border border-solid has-[svg:only-child]:px-0 transition disabled:pointer-events-none focus-visible:outline disabled:opacity-50 justify-center bg-background rounded-full text-text h-8 min-w-8 px-0 [&>svg]:size-[1.125rem] text-subtext1 active:brightness-75 focus-visible:brightness-90 hover:brightness-90 outline-primary mb-px bg-gray-50 border-none hover:bg-gray-100';
      previewButton.innerHTML = '▶';
      previewButton.style.cssText = 'font-size: 14px; width: 32px; height: 32px; color: rgb(113, 118, 123);';
      previewButton.title = 'Preview';
      
      const sendVoiceButton = document.createElement('button');
      sendVoiceButton.setAttribute('data-voice-send-button', 'true');
      sendVoiceButton.setAttribute('type', 'button');
      sendVoiceButton.className = 'gap-1 inline-flex items-center border border-solid has-[svg:only-child]:px-0 transition disabled:pointer-events-none focus-visible:outline disabled:opacity-50 justify-center bg-background rounded-full text-text h-8 min-w-8 px-0 [&>svg]:size-[1.125rem] text-subtext1 active:brightness-75 focus-visible:brightness-90 hover:brightness-90 outline-primary mb-px bg-gray-50 border-none hover:bg-gray-100';
      sendVoiceButton.innerHTML = '↑';
      sendVoiceButton.style.cssText = 'font-size: 16px; width: 32px; height: 32px; color: rgb(113, 118, 123); font-weight: bold;';
      sendVoiceButton.title = 'Send';
      
      const cancelButton = document.createElement('button');
      cancelButton.setAttribute('data-voice-cancel-button', 'true');
      cancelButton.setAttribute('type', 'button');
      cancelButton.className = 'gap-1 inline-flex items-center border border-solid has-[svg:only-child]:px-0 transition disabled:pointer-events-none focus-visible:outline disabled:opacity-50 justify-center bg-background rounded-full text-text h-8 min-w-8 px-0 [&>svg]:size-[1.125rem] text-subtext1 active:brightness-75 focus-visible:brightness-90 hover:brightness-90 outline-primary mb-px bg-gray-50 border-none hover:bg-gray-100';
      cancelButton.innerHTML = '×';
      cancelButton.style.cssText = 'font-size: 20px; width: 32px; height: 32px; color: rgb(113, 118, 123);';
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
      
      console.log('[Voice Note] ✅ Controls injected');
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
      
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const destination = audioContext.createMediaStreamDestination();
      audioSource.connect(analyser);
      audioSource.connect(destination);
      
      function drawWaveform() {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        analyser.getByteFrequencyData(dataArray);
        
        const halfBarCount = 64;
        const barWidth = (canvas.width / (halfBarCount * 2)) - 2;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
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
        
        for (let i = 0; i < halfBarCount; i++) {
          const barHeight = (weightedData[i] / 255) * (canvas.height * 0.75);
          
          const gradient = ctx.createLinearGradient(
            0, centerY - barHeight / 2,
            0, centerY + barHeight / 2
          );
          gradient.addColorStop(0, '#1da1f2');
          gradient.addColorStop(0.5, '#7c3aed');
          gradient.addColorStop(1, '#ec4899');
          
          ctx.fillStyle = gradient;
          
          const offsetFromCenter = i * (barWidth + 2);
          
          const rightX = centerX + offsetFromCenter;
          ctx.fillRect(rightX, centerY - barHeight / 2, barWidth, barHeight);
          
          const leftX = centerX - offsetFromCenter - barWidth;
          ctx.fillRect(leftX, centerY - barHeight / 2, barWidth, barHeight);
        }
      }
      
      const animationInterval = setInterval(drawWaveform, 40);
      
      const videoStream = canvas.captureStream(25);
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);
      
      // CHANGED: Use best codec for iOS compatibility
      const bestCodec = getBestVideoCodec();
      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: bestCodec,  // ← iOS-compatible codec!
        videoBitsPerSecond: 500000
      });
      
      audioChunks = [];
      recordedVideoBlob = null;
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });
      
      mediaRecorder.addEventListener('stop', async () => {
        clearInterval(animationInterval);
        
        // CHANGED: Use simplified type (MP4 or WebM) without codec parameters
        // This avoids issues with commas in data URLs
        const simplifiedType = bestCodec.includes('mp4') ? 'video/mp4' : 'video/webm';
        recordedVideoBlob = new Blob(audioChunks, { type: simplifiedType });
        
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop());
          currentStream = null;
        }
        audioContext.close();
        
        const actionsContainer = document.querySelector('[data-voice-actions-container]');
        if (actionsContainer) {
          actionsContainer.style.display = 'flex';
        }
        
        voiceButton.innerHTML = '✓';
        voiceButton.style.color = 'rgb(113, 118, 123)';
        voiceButton.title = 'Recording ready!';
        
        if (durationLabel) {
          const mins = Math.floor(recordingDuration / 60);
          const secs = Math.floor(recordingDuration % 60);
          durationLabel.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        
        console.log('[Voice Note] ✅ iOS-compatible recording ready!');
      });
      
      mediaRecorder.start();
      isRecording = true;
      recordingStartTime = Date.now();
      
      voiceButton.innerHTML = '■';
      voiceButton.style.color = 'rgb(113, 118, 123)';
      voiceButton.title = 'Stop recording';
      
      if (durationLabel) {
        durationLabel.style.display = 'inline-block';
      }
      
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
      voiceButton.animationInterval = animationInterval;
      
    } catch (error) {
      console.error('[Voice Note] ❌ Microphone error:', error);
      alert('Unable to access microphone');
      voiceButton.innerHTML = '🎤';
      voiceButton.style.color = 'rgb(113, 118, 123)';
    }
  } else {
    if (mediaRecorder && mediaRecorder.state !== 'stopped') {
      mediaRecorder.stop();
    }
    
    isRecording = false;
    
    if (voiceButton.timerInterval) {
      clearInterval(voiceButton.timerInterval);
    }
    if (voiceButton.animationInterval) {
      clearInterval(voiceButton.animationInterval);
    }
    
    voiceButton.innerHTML = '···';
    voiceButton.style.color = 'rgb(113, 118, 123)';
    voiceButton.title = 'Finalizing...';
  }
}

function handlePreviewClick(previewButton) {
  if (!recordedVideoBlob) return;
  
  const audioURL = URL.createObjectURL(recordedVideoBlob);
  const audio = new Audio(audioURL);
  
  previewButton.innerHTML = '‖';
  previewButton.style.color = 'rgb(113, 118, 123)';
  previewButton.title = 'Playing...';
  previewButton.disabled = true;
  
  audio.play();
  
  audio.addEventListener('ended', () => {
    previewButton.innerHTML = '▶';
    previewButton.style.color = 'rgb(113, 118, 123)';
    previewButton.title = 'Preview';
    previewButton.disabled = false;
    URL.revokeObjectURL(audioURL);
  });
  
  audio.addEventListener('error', () => {
    previewButton.innerHTML = '▶';
    previewButton.style.color = 'rgb(113, 118, 123)';
    previewButton.title = 'Preview';
    previewButton.disabled = false;
    URL.revokeObjectURL(audioURL);
  });
}

async function handleSendClick(sendVoiceButton, voiceButton, actionsContainer, durationLabel) {
  if (!recordedVideoBlob) return;
  
  sendVoiceButton.innerHTML = '···';
  sendVoiceButton.style.color = 'rgb(113, 118, 123)';
  sendVoiceButton.title = 'Sending...';
  sendVoiceButton.disabled = true;
  
  const base64Data = await blobToBase64(recordedVideoBlob);
  
  // Pass blob type to handleSendVoiceNote
  handleSendVoiceNote({ 
    audioData: base64Data, 
    isVideo: true,
    blobType: recordedVideoBlob.type  // ← Pass the blob type
  }, (response) => {
    if (response && response.success) {
      recordedVideoBlob = null;
      voiceButton.innerHTML = '🎤';
      voiceButton.style.color = 'rgb(113, 118, 123)';
      voiceButton.title = 'Record voice note';
      
      actionsContainer.style.display = 'none';
      if (durationLabel) durationLabel.style.display = 'none';
      
      sendVoiceButton.innerHTML = '↑';
      sendVoiceButton.style.color = 'rgb(113, 118, 123)';
      sendVoiceButton.disabled = false;
      
      voiceButton.innerHTML = '✓';
      voiceButton.style.color = 'rgb(113, 118, 123)';
      setTimeout(() => {
        voiceButton.innerHTML = '🎤';
        voiceButton.style.color = 'rgb(113, 118, 123)';
      }, 2000);
      
    } else {
      sendVoiceButton.innerHTML = '×';
      sendVoiceButton.style.color = 'rgb(113, 118, 123)';
      
      setTimeout(() => {
        sendVoiceButton.innerHTML = '↑';
        sendVoiceButton.style.color = 'rgb(113, 118, 123)';
        sendVoiceButton.disabled = false;
      }, 2000);
    }
  });
}

function handleCancelClick(voiceButton, actionsContainer, durationLabel) {
  recordedVideoBlob = null;
  voiceButton.innerHTML = '🎤';
  voiceButton.style.color = 'rgb(113, 118, 123)';
  voiceButton.title = 'Record voice note';
  actionsContainer.style.display = 'none';
  if (durationLabel) durationLabel.style.display = 'none';
}

function handleSendVoiceNote(request, sendResponse) {
  const audioData = request.audioData;
  const blobType = request.blobType || 'video/webm';
  
  try {
    const textarea = document.querySelector('[data-testid="dm-composer-textarea"]');
    
    if (!textarea) {
      sendResponse({ success: false, message: 'Could not find message input' });
      return;
    }
    
    // Extract mime type from data URL if present
    let actualMimeType = blobType;
    if (audioData.startsWith('data:')) {
      const match = audioData.match(/data:([^;]+)/);
      if (match) {
        actualMimeType = match[1];
        console.log('[Voice Note] 📦 Detected mime type from data URL:', actualMimeType);
      }
    }
    
    // Determine format
    const isMP4 = actualMimeType.includes('mp4') || actualMimeType.includes('avc');
    const mimeType = isMP4 ? 'video/mp4' : 'video/webm';
    const extension = isMP4 ? 'mp4' : 'webm';
    
    const blob = base64ToBlob(audioData, mimeType);
    const file = new File([blob], `voice-note-${Date.now()}.${extension}`, { 
      type: mimeType, 
      lastModified: Date.now() 
    });
    
    console.log(`[Voice Note] 📤 Sending as: ${extension} (${mimeType})`);
    
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
    console.error('[Voice Note] ❌ Send error:', error);
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
    // Handle data URL with codecs parameter
    // e.g., "data:video/mp4;codecs=avc1.42e01e,mp4a.40.2;base64,AAAA..."
    let base64String = base64;
    
    if (base64.startsWith('data:')) {
      // Find the ";base64," part
      const base64Index = base64.indexOf(';base64,');
      if (base64Index !== -1) {
        base64String = base64.substring(base64Index + 8); // Skip ";base64,"
      } else {
        // Fallback: just split by last comma
        const parts = base64.split(',');
        base64String = parts[parts.length - 1];
      }
    }
    
    // Clean up any whitespace or newlines
    const cleanBase64 = base64String.replace(/\s/g, '');
    
    const bstr = atob(cleanBase64);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    
    return new Blob([u8arr], { type: mimeType });
  } catch (error) {
    console.error('[Voice Note] ❌ Error converting base64:', error);
    console.error('[Voice Note] Base64 preview:', base64.substring(0, 100));
    throw error;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectVoiceNoteButton);
} else {
  injectVoiceNoteButton();
}

setInterval(injectVoiceNoteButton, 5000);