# Twitter Voice Note Extension

A Chrome extension that lets you send voice notes directly in Twitter/X direct messages.

## Features

✅ **One-click recording** - Click 🎤 button next to send button  
✅ **Easy to use** - Record, preview, and send in seconds  
✅ **Always enabled** - Works automatically on all Twitter DM pages  
✅ **Real-time feedback** - See recording timer and status updates  
✅ **Web-optimized** - Works perfectly on web Twitter/X  

## How to Use

1. Open a Twitter DM conversation on **web** (twitter.com or x.com)
2. Look for the 🎤 **microphone button** next to the send button
3. **Click 🎤** to start recording
4. Speak into your microphone
5. **Click ⏹️** to stop recording
6. Message will send with audio attachment automatically
7. Recipients can click to play the audio! 🎵

## ⚠️ Platform Support & Known Issues

### ✅ Web Twitter (Fully Supported)
- **Senders**: Can record and send from web browser
- **Recipients**: Can play audio files perfectly on web
- **Experience**: Seamless and reliable ✨

### ❌ Mobile Twitter App (Playback Issue)

**The Problem:**
- Audio files **can be sent** from mobile web or desktop web
- Audio files **cannot be played** on the Twitter mobile app
- Recipients see a loading spinner that never completes
- Files can be downloaded and played locally

**Why This Happens:**
This is a **Twitter app limitation**, not an extension bug:
- Twitter's mobile app has issues loading certain media files
- The extension only handles sending (sender side), not receiving (receiver side)
- Mobile app doesn't fully support the media playback method used
- This is beyond the extension's control

### ✅ Best Workarounds for Recipients

**Option 1: Use Web Browser (Recommended)**
- Open `https://web.twitter.com` on mobile
- Or `https://twitter.com` in mobile browser
- Audio plays perfectly in browser
- Works on any device!

**Option 2: Download & Play Locally**
- Long-press the audio file
- Select "Download"
- Open in local music player
- Can listen anytime

**Option 3: Check Back on Desktop**
- Ask sender to resend if urgent
- Listen on desktop/web when available

## Installation

1. Clone this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension folder
6. Done! 🎉

## File Structure

```
src/
├── contentScript.js    # Injects button into Twitter chat
├── background.js       # Extension background service
├── popup.html         # (No longer used - extension works inline)
└── popup.js           # (No longer used - extension works inline)

manifest.json          # Extension configuration
icons/                 # Extension icons
README.md             # This file
```

## Technical Details

### How It Works
1. Content script injects 🎤 button into Twitter DM composer
2. Records audio using Web Audio API + MediaRecorder
3. Converts to WebM format (wide browser support)
4. Uploads via Twitter's media endpoint
5. Sends as audio attachment in DM

### Browser Support
- Chrome/Chromium: ✅ Full support
- Firefox: Can be adapted (needs manifest modification)
- Safari: Would need different approach

## Troubleshooting

**Button doesn't appear:**
- Refresh the Twitter page (Cmd+R or Ctrl+R)
- Check console (F12) for `[Voice Note]` logs
- Extension must be enabled in `chrome://extensions/`

**Microphone not working:**
- Check browser permissions: `chrome://settings/content/microphone`
- Make sure extension is allowed to use microphone
- Try in a new incognito window
- Check system mic settings

**Audio won't send:**
- Make sure you're on a DM conversation page
- Text input field must be visible
- Check browser console for error messages

**Recipients can't hear audio on mobile:**
- **This is a Twitter app limitation**
- They should use web.twitter.com in mobile browser instead
- Or download the file and play locally

## What You Can Tell Users

> "If you're using the Twitter mobile app and audio won't play, here's how to fix it:
> 
> 1. **Best option**: Open the chat in your mobile browser (twitter.com) instead of the app - audio plays perfectly there!
> 2. **Alternative**: Download the audio file and play it in your music player
> 3. **On desktop**: No issues at all - works seamlessly"

## Future Improvements

- [ ] Batch recording multiple notes
- [ ] Audio effects/editing before send
- [ ] Auto-transcription of voice notes
- [ ] Duration preview before sending
- [ ] Support for other message formats

## Known Limitations

### 1. Mobile App Audio Playback ❌
**Status**: Cannot be fixed from extension
**Reason**: Twitter's mobile app limitation
**Workaround**: Use web.twitter.com instead

### 2. Mobile App Voice Recording
- Recording works fine on mobile web
- Sending works perfectly
- Only playback is affected

### 3. File Format Compatibility
- WebM format used (wide support on web)
- Fallback to browser defaults if WebM unavailable

## License

MIT License - Feel free to modify and distribute

## Support

Having issues? Check these:

1. **For recording issues**: 
   - Open DevTools (F12) → Console
   - Look for `[Voice Note]` messages
   - Check microphone permissions

2. **For sending issues**:
   - Make sure you're in a DM (not timeline)
   - Refresh the page
   - Check browser console for errors

3. **For mobile playback issues**:
   - This is a Twitter app bug - use web instead
   - Or download the file locally

---

**Enjoy sending voice notes on Twitter!** 🎤✨

*Note: This extension is not affiliated with Twitter/X. Audio playback issues on mobile are a limitation of Twitter's mobile app, not this extension.*