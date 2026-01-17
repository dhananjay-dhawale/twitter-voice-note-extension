// Twitter Voice Note Extension - Shared Utilities
// Reusable functions for both content script and popup

const VoiceNoteUtils = {
  /**
   * Get the best video codec for iOS compatibility
   * @returns {string} The best supported codec
   */
  getBestVideoCodec() {
    for (const codec of VN_CONFIG.CODEC_PRIORITY) {
      if (MediaRecorder.isTypeSupported(codec)) {
        console.log(`[Voice Note] Using iOS-compatible codec: ${codec}`);
        return codec;
      }
    }
    console.log('[Voice Note] Using fallback codec');
    return VN_CONFIG.FALLBACK_CODEC;
  },

  /**
   * Convert a Blob to base64 data URL
   * @param {Blob} blob - The blob to convert
   * @returns {Promise<string>} Base64 data URL
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  /**
   * Convert a base64 data URL to Blob
   * Handles codec parameters in data URLs (e.g., video/mp4;codecs=avc1.42E01E)
   * @param {string} base64 - The base64 string or data URL
   * @param {string} mimeType - The target mime type
   * @returns {Blob} The converted blob
   */
  base64ToBlob(base64, mimeType) {
    try {
      let base64String = base64;

      if (base64.startsWith('data:')) {
        // Find the ";base64," part to handle codec parameters
        const base64Index = base64.indexOf(';base64,');
        if (base64Index !== -1) {
          base64String = base64.substring(base64Index + 8);
        } else {
          // Fallback: split by last comma
          const parts = base64.split(',');
          base64String = parts[parts.length - 1];
        }
      }

      // Clean up whitespace
      const cleanBase64 = base64String.replace(/\s/g, '');
      const bstr = atob(cleanBase64);
      const n = bstr.length;
      const u8arr = new Uint8Array(n);

      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }

      return new Blob([u8arr], { type: mimeType });
    } catch (error) {
      console.error('[Voice Note] Error converting base64:', error);
      throw error;
    }
  },

  /**
   * Format seconds as MM:SS
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted time string
   */
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Extract mime type from a data URL
   * @param {string} dataUrl - The data URL
   * @returns {string|null} The mime type or null
   */
  extractMimeType(dataUrl) {
    if (!dataUrl.startsWith('data:')) return null;
    const match = dataUrl.match(/data:([^;,]+)/);
    return match ? match[1] : null;
  },

  /**
   * Determine if a mime type is MP4-based
   * @param {string} mimeType - The mime type to check
   * @returns {boolean} True if MP4-based
   */
  isMP4Type(mimeType) {
    return mimeType.includes('mp4') || mimeType.includes('avc');
  },

  /**
   * Get simplified mime type and extension
   * @param {string} codec - The full codec string
   * @returns {{mimeType: string, extension: string}}
   */
  getSimplifiedFormat(codec) {
    const isMP4 = this.isMP4Type(codec);
    return {
      mimeType: isMP4 ? 'video/mp4' : 'video/webm',
      extension: isMP4 ? 'mp4' : 'webm',
    };
  },

  /**
   * Handle microphone errors with user-friendly messages
   * @param {Error} error - The error object
   * @returns {string} User-friendly error message
   */
  getMicrophoneErrorMessage(error) {
    const errorMessages = {
      NotAllowedError: 'Microphone access denied.\n\nGo to: chrome://settings/content/microphone\nFind this extension and set to Allow',
      NotFoundError: 'No microphone found. Check your system settings.',
      DevicesNotFoundError: 'No microphone found. Check your system settings.',
      NotReadableError: 'Microphone is in use. Close other apps and try again.',
      SecurityError: 'Security error - extension may be blocked.',
      AbortError: 'Microphone request aborted. Try again.',
    };

    return errorMessages[error.name] || `Error: ${error.name}\n\n${error.message}`;
  },
};

/**
 * Resource cleanup manager to prevent memory leaks
 */
class ResourceManager {
  constructor() {
    this.objectUrls = new Set();
    this.intervals = new Set();
    this.animationFrameId = null;
    this.audioContext = null;
    this.mediaStream = null;
  }

  /**
   * Create and track an object URL
   * @param {Blob} blob - The blob to create URL for
   * @returns {string} The object URL
   */
  createObjectURL(blob) {
    const url = URL.createObjectURL(blob);
    this.objectUrls.add(url);
    return url;
  }

  /**
   * Revoke a tracked object URL
   * @param {string} url - The URL to revoke
   */
  revokeObjectURL(url) {
    if (this.objectUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(url);
    }
  }

  /**
   * Create and track an interval
   * @param {Function} callback - The callback function
   * @param {number} ms - Interval in milliseconds
   * @returns {number} The interval ID
   */
  setInterval(callback, ms) {
    const id = setInterval(callback, ms);
    this.intervals.add(id);
    return id;
  }

  /**
   * Clear a tracked interval
   * @param {number} id - The interval ID
   */
  clearInterval(id) {
    if (this.intervals.has(id)) {
      clearInterval(id);
      this.intervals.delete(id);
    }
  }

  /**
   * Set the audio context for cleanup
   * @param {AudioContext} ctx - The audio context
   */
  setAudioContext(ctx) {
    this.audioContext = ctx;
  }

  /**
   * Set the media stream for cleanup
   * @param {MediaStream} stream - The media stream
   */
  setMediaStream(stream) {
    this.mediaStream = stream;
  }

  /**
   * Set animation frame ID for cleanup
   * @param {number} id - The animation frame ID
   */
  setAnimationFrame(id) {
    this.animationFrameId = id;
  }

  /**
   * Cancel animation frame
   */
  cancelAnimationFrame() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Clean up all tracked resources
   */
  cleanup() {
    // Revoke all object URLs
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();

    // Clear all intervals
    for (const id of this.intervals) {
      clearInterval(id);
    }
    this.intervals.clear();

    // Cancel animation frame
    this.cancelAnimationFrame();

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }
}
