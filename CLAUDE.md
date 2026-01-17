# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension that adds WhatsApp-style voice notes to Twitter/X DMs. Records audio with real-time waveform visualization and sends as video files for cross-platform compatibility (including iOS).

## Architecture

### File Structure
```
src/
├── constants.js      # All configuration, magic numbers, selectors, icons
├── shared.js         # Reusable utilities (VoiceNoteUtils, ResourceManager)
├── contentScript.js  # Main DM injection and recording logic
├── background.js     # Service worker (minimal)
├── popup.js          # Popup UI logic
├── popup.html        # Popup markup
└── popup.css         # Popup styles
```

### Key Modules

**`constants.js`** - Central configuration
- `VN_CONFIG`: Recording limits, video settings, timing values, colors
- `VN_SELECTORS`: Twitter DOM selectors for DM composer elements
- `VN_ICONS`: Button icon characters

**`shared.js`** - Reusable utilities
- `VoiceNoteUtils`: Codec detection, blob conversion, duration formatting, error messages
- `ResourceManager`: Tracks and cleans up object URLs, intervals, audio contexts, media streams

**`contentScript.js`** - Core functionality
- Uses `MutationObserver` to detect when DM composer appears (not polling)
- Uses `requestAnimationFrame` for smooth waveform animation
- Encapsulated state in `VoiceNoteState` object
- Auto-stops recording at `VN_CONFIG.MAX_RECORDING_SECONDS` limit
- Proper cleanup on page unload via `ResourceManager`

### Recording Flow
1. `getUserMedia` captures microphone audio
2. `AnalyserNode` (FFT) provides frequency data for waveform
3. Canvas renders waveform at 25fps via `requestAnimationFrame`
4. `canvas.captureStream()` + audio destination combined into single `MediaStream`
5. `MediaRecorder` encodes with iOS-compatible codec (H.264 preferred)
6. File uploaded via Twitter's native file input using `DataTransfer` API

### Codec Selection Priority
```javascript
VN_CONFIG.CODEC_PRIORITY = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',  // iOS perfect
  'video/webm;codecs=h264,opus',             // iOS compatible
  'video/webm;codecs=vp8,opus',              // Fallback
]
```

## Development

### Loading the Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this folder
4. Reload extension after code changes

### Testing
- Navigate to https://twitter.com/messages or https://x.com/messages
- Open any DM conversation
- Click the microphone button to record

### No Build Step Required
Vanilla JavaScript with no bundler. Scripts load in order via manifest.json `content_scripts` array.

### Configuration
Edit `src/constants.js` to change:
- `MAX_RECORDING_SECONDS` - Recording time limit (default: 240s)
- `VIDEO_BITRATE` - Video quality (default: 500kbps)
- `WAVEFORM_GRADIENT` - Waveform colors
- All timing values and DOM selectors
