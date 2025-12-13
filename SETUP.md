# Setup & Troubleshooting Guide

## Microphone Permission Setup for Chrome Extension

### Quick Fix (Most Common Solution):

1. **Reload the Extension:**
   - Go to `chrome://extensions/`
   - Find "Twitter Voice Note Extension"
   - Click the refresh icon

2. **Grant Microphone Permission:**
   - Click the extension icon in the toolbar
   - When prompted, click "Allow"
   - If no prompt appears, continue to next step

3. **Manual Permission Grant:**
   - Click the lock icon next to the URL in the extension popup
   - Find "Microphone" setting
   - Change from "Block" to "Allow"

### Detailed Steps:

#### Step 1: Verify Extension is Loaded
```
1. Go to chrome://extensions/
2. Toggle "Developer mode" ON (top right)
3. You should see "Twitter Voice Note Extension"
4. It should say "Errors" or show as enabled
```

#### Step 2: Check for Errors
```
1. Go to chrome://extensions/
2. Click on your extension card
3. Check "Errors" section - should be empty
4. If there are errors, fix manifest.json
```

#### Step 3: Grant Microphone Access
```
1. Click the extension icon in the toolbar
2. A popup appears - when asked for microphone, click "Allow"
   OR
1. Click extension icon
2. Click the lock/shield icon in the popup's address bar
3. Set "Microphone" to "Allow"
```

#### Step 4: Test
```
1. Reload the extension (refresh icon in chrome://extensions/)
2. Click extension icon
3. Click "🎤 Record"
4. Speak and then click to stop
5. Audio should play back
```

### Common Error Solutions:

**Error: "DOMException: Permission denied"**
- [ ] Click lock icon next to popup URL
- [ ] Change "Microphone" from "Block" to "Allow"
- [ ] Reload extension
- [ ] Try again

**Error: "NotAllowedError"**
- [ ] You clicked "Block" for microphone
- [ ] Fix: Go to popup → Lock icon → Set Microphone to "Allow"

**Error: "NotFoundError" or "DevicesNotFoundError"**
- [ ] No microphone detected
- [ ] Check: Is microphone connected?
- [ ] Try: System Settings → Microphone (check if enabled)

**Warning: "permission microphone is unknown"**
- [ ] This is normal for Manifest V3
- [ ] Don't add "microphone" to manifest.json permissions
- [ ] Chrome handles it automatically
- [ ] The warning can be ignored

**Microphone works in other apps but not extension**
- [ ] Close other apps using microphone
- [ ] OR: Reload extension and try again
- [ ] Check system microphone isn't muted

### Advanced Troubleshooting:

**1. Check Browser Console:**
```
1. Click extension icon
2. Right-click anywhere in popup
3. Click "Inspect"
4. Go to "Console" tab
5. Look for error messages
6. Share error messages for debugging
```

**2. Clear Extension Data:**
```
1. Go to chrome://extensions/
2. Click on your extension
3. Click "Clear data" button
4. Reload extension
```

**3. Verify System Microphone:**
```
Mac:
1. System Preferences → Security & Privacy
2. Microphone tab
3. Check Chrome is in the list
4. Toggle Chrome on/off to reset

Windows:
1. Settings → Privacy & security → Microphone
2. Make sure microphone is enabled
3. Check Chrome is in the allowed apps list

Linux:
1. Check PulseAudio/ALSA settings
2. Run: pactl list sources
3. Verify microphone is active
```

**4. Test with Demo Site:**
```
1. Visit: https://webrtc.github.io/samples/web/content/getusermedia/
2. Click "Get Audio"
3. Grant microphone permission
4. If this works, your system microphone is fine
```

### Checklist Before Testing:

- [ ] Extension loads without errors in chrome://extensions/
- [ ] No "Manifest" or "Runtime" errors shown
- [ ] Microphone permission set to "Allow"
- [ ] Extension reloaded (refresh icon clicked)
- [ ] Microphone works on your system (test with demo site)
- [ ] No other apps using microphone
- [ ] Chrome is not muted in system volume

### Still Having Issues?

1. Check the console error message (see above)
2. Try the system microphone test (demo site)
3. Verify manifest.json has NO "microphone" in permissions
4. Make sure popup.js loads without syntax errors
5. Restart Chrome completely

