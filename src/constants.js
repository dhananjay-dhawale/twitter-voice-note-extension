// Twitter Voice Note Extension - Constants
// All magic numbers and configuration in one place

const VN_CONFIG = {
  // Recording limits
  MAX_RECORDING_SECONDS: 240,

  // Video/Animation settings
  ANIMATION_FPS: 25,
  VIDEO_BITRATE: 500000,
  CANVAS_WIDTH: 640,
  CANVAS_HEIGHT: 480,

  // Waveform visualization
  FFT_SIZE: 256,
  WAVEFORM_BAR_COUNT: 64,
  WAVEFORM_HEIGHT_RATIO: 0.75,

  // Timing (milliseconds)
  TIMER_UPDATE_MS: 100,
  UPLOAD_CHECK_INTERVAL_MS: 100,
  UPLOAD_MAX_ATTEMPTS: 30,
  MEDIA_BUTTON_DELAY_MS: 300,
  SEND_BUTTON_DELAY_MS: 100,
  SEND_CLICK_DELAY_MS: 50,
  SUCCESS_FEEDBACK_DURATION_MS: 2000,

  // Waveform colors
  WAVEFORM_GRADIENT: {
    TOP: '#1da1f2',
    MIDDLE: '#7c3aed',
    BOTTOM: '#ec4899',
  },
  WAVEFORM_BACKGROUND: '#000000',

  // UI colors
  BUTTON_COLOR: 'rgb(113, 118, 123)',
  STATUS_COLOR_RECORDING: '#1da1f2',
  STATUS_COLOR_SUCCESS: '#17bf63',
  STATUS_COLOR_ERROR: 'red',
  STATUS_COLOR_DEFAULT: '#666',

  // Codec priority list (iOS compatibility)
  CODEC_PRIORITY: [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',  // iOS perfect - MP4 container
    'video/webm;codecs=h264,opus',             // iOS compatible - WebM container
    'video/webm;codecs=h264',                  // iOS partial support
    'video/mp4;codecs=avc1',                   // iOS compatible
    'video/mp4',                               // Generic MP4
    'video/webm;codecs=vp8,opus',              // Fallback
  ],
  FALLBACK_CODEC: 'video/webm',
};

// DOM selectors for Twitter
const VN_SELECTORS = {
  DM_COMPOSER_CONTAINER: '[data-testid="dm-composer-container"]',
  DM_COMPOSER_TEXTAREA: '[data-testid="dm-composer-textarea"]',
  DM_SEND_BUTTON: '[data-testid="dm-composer-send-button"]',
  DM_ATTACHMENT_BUTTON: 'button[data-testid="dm-composer-attachment-button"]',
  DM_GIF_BUTTON: '[data-testid="dm-composer-gif-button"]',
  BUTTON_CONTAINER: '[data-testid="dm-composer-container"] .flex.items-end.gap-2',
  FILE_INPUT: 'input[type="file"]',

  // Our custom elements
  VOICE_BUTTON: '[data-voice-note-injected]',
  DURATION_LABEL: '[data-voice-duration-label]',
  ACTIONS_CONTAINER: '[data-voice-actions-container]',
  PREVIEW_BUTTON: '[data-voice-preview-button]',
  SEND_VOICE_BUTTON: '[data-voice-send-button]',
  CANCEL_BUTTON: '[data-voice-cancel-button]',
};

// Button icons/states
const VN_ICONS = {
  MICROPHONE: '🎤',
  STOP: '■',
  PLAY: '▶',
  PAUSE: '‖',
  SEND: '↑',
  CANCEL: '×',
  CHECKMARK: '✓',
  LOADING: '···',
};
