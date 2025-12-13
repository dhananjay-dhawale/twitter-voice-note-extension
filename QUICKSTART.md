# Quick Start - Voice Note Extension

## Installation ✅

1. **Load Extension:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select your project folder

2. **Grant Permissions:**
   - Extension loads - no manual permission needed!
   - On first click, microphone popup appears automatically

3. **Verify Installation:**
   - Extension icon appears in toolbar
   - No errors in chrome://extensions/

## Usage 🎤

### Step 1: Open Twitter DM
- Go to: `https://x.com/i/chat/[conversation-id]`
- Or: Go to Messages → Click a DM conversation
- You should see the message input box at bottom

### Step 2: Record Voice Note
1. **Click extension icon** in toolbar
2. **Click "🎤 Record"**
3. **Grant microphone permission** when popup appears
4. **Speak into microphone**
5. **Click "⏹️ Stop Recording"**
6. Audio plays back - verify it sounds good

### Step 3: Send Voice Note
1. **Click "✈️ Send"**
2. Watch for status message
3. ✅ **Check Twitter DM** - voice note message appears!

## Common Issues 🔧

### Issue: "Content script not loaded"
**Solution:**
```
1. Go to chrome://extensions/
2. Click REFRESH on the extension
3. Go back to Twitter DM page
4. REFRESH the page (Ctrl+R or Cmd+R)
5. Try again
```

### Issue: No microphone permission popup
**Solution:**
```
1. Go to chrome://settings/content/microphone
2. Look for "Twitter Voice Note Extension"
3. If it's in "Not allowed", click X to remove
4. Reload extension (chrome://extensions/ → refresh)
5. Try recording again
```

### Issue: Voice note doesn't appear in DM
**Check:**
- Are you in an actual DM conversation? (not just DM list)
- Is the message input box visible?
- Check browser console for errors:
  - Right-click page → Inspect (F12)
  - Go to Console tab
  - Look for `[Voice Note]` messages

### Issue: Can't click "Send" button
**Check:**
- Did you record something? (audio should play back)
- Is audio visible in the player?
- Button should become enabled after recording

## Need Help? 🆘

### Check Console Logs:
1. **On Twitter page:**
   - Right-click → Inspect (F12)
   - Console tab
   - Look for `[Voice Note]` logs
   - Should see: ✅ ✅ ✅ (green checkmarks)

2. **On Extension popup:**
   - Click extension icon
   - Right-click → Inspect
   - Console tab
   - Should show: "Sending to tab: https://x.com..."

### Files to Check:
- `DEBUG.md` - Detailed troubleshooting
- `TESTING_DM.md` - Testing guide
- `SETUP.md` - Permission issues

## What Gets Sent? 📤

Currently sends:
- **Text marker:** `🎤 Voice Note (HH:MM:SS)`
- **Audio data:** Stored in browser session
- **Location:** Your Twitter DM

Future: Could add file upload to send actual audio files!

## Keyboard Shortcuts 🎹

Coming soon! For now:
- Record: Click "🎤 Record" button
- Send: Click "✈️ Send" button
- Stop: Click "⏹️ Stop Recording" button

## Support 💬

Issues? Check:
1. Console logs (`[Voice Note]` prefix)
2. `DEBUG.md` file
3. Make sure you're on x.com or twitter.com
4. Make sure you're in an actual DM conversation (not DM list)
