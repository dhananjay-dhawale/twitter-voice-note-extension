# Twitter Voice Note Extension

This Chrome extension allows users to send voice notes in Twitter direct messages (DMs). It enhances the Twitter messaging experience by enabling voice communication, making conversations more personal and expressive.

## Features

- Record voice notes directly from the extension.
- Send recorded voice notes in Twitter DMs.
- Simple and user-friendly interface.
- Playback controls for recorded audio.
- Responsive and modern UI design.

## Installation

1. Download or clone the repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click on "Load unpacked" and select the `twitter-voice-note-extension` directory.
5. The extension should now be installed and ready to use.

## Testing in Local Environment

### Prerequisites
- Google Chrome or Chromium browser
- Microphone access enabled on your system

### Steps to Test Locally

1. **Load the extension in Chrome:**
   - Navigate to `chrome://extensions/`
   - Toggle "Developer mode" ON
   - Click "Load unpacked"
   - Select your project directory

2. **Verify Installation:**
   - You should see the extension in your extensions list
   - Icon appears in the Chrome toolbar

3. **Test Recording:**
   - Click the extension icon in the toolbar
   - Click "🎤 Record" button
   - Speak into your microphone
   - Click "🎤 Record" again to stop recording
   - Audio will appear in the playback section

4. **Test Sending:**
   - Open Twitter/X and navigate to a DM conversation
   - Click the extension icon
   - Record a voice note (as described above)
   - Click "✈️ Send" button
   - Check the DM conversation for the sent voice note

5. **Check Console for Debugging:**
   - Right-click the extension icon → Click "Inspect popup"
   - Open "Console" tab to see any error messages

### Troubleshooting

- **"Unable to access microphone" error:** Check Chrome permissions for microphone
- **Extension not loading:** Ensure all files are in correct paths as per manifest.json
- **Message not sending:** Verify you have correct Twitter DM input field selectors
- **No audio playback:** Check browser audio settings and file format support

## Usage

1. Open Twitter/X and navigate to your DMs.
2. Click on the extension icon in the Chrome toolbar.
3. Record your voice note and send it directly in the chat.

## File Structure

```
twitter-voice-note-extension/
├── src/
│   ├── popup.html       # Extension popup UI
│   ├── popup.js         # Popup logic and recording
│   ├── popup.css        # Popup styling
│   ├── contentScript.js # Content script for DM injection
│   ├── background.js    # Service worker
│   └── types/
│       └── index.ts     # TypeScript type definitions
├── icons/
│   └── icon128.png      # Extension icon
├── manifest.json        # Extension configuration
└── README.md           # This file
```

## Contributing

Contributions are welcome! If you have suggestions or improvements, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.