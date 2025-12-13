# Quick Fix for Microphone Permission Error

## You're Getting This Error:
```
Microphone Error: You denied microphone access. Please:
1. Click the lock icon next to the URL
2. Allow microphone access
3. Reload the page
```

## Solution: Reset Extension Permissions

### Step 1: Remove the Permission Block
1. Go to **chrome://settings/content/microphone**
2. Under "Not allowed", find "Twitter Voice Note Extension"
3. Click the **X** to remove it from blocked list

### Step 2: Reload the Extension
1. Go to **chrome://extensions/**
2. Find "Twitter Voice Note Extension"
3. Click the **refresh** icon

### Step 3: Grant Permission
1. Click the extension icon in toolbar
2. A popup appears
3. Click the lock icon in the popup's address bar
4. Change Microphone to **"Allow"**
5. Close and re-open the popup

### Step 4: Test
1. Click extension icon
2. Click "🎤 Record"
3. Speak into microphone
4. Click to stop
5. Audio should play back

## If Still Not Working:

**Option A: Hard Reset**
```
1. Go to chrome://extensions/
2. Remove the extension (trash icon)
3. Reload the page
4. Go to your project folder
5. Click "Load unpacked" again
6. Select your project
7. Test again
```

**Option B: Check System Microphone**
1. Visit: https://webrtc.github.io/samples/web/content/getusermedia/
2. Click "Get Audio Stream"
3. Grant permission when asked
4. If this works, your microphone is fine
5. Then try the extension again

**Option C: Clear All Extension Data**
```
1. chrome://extensions/ → Find your extension
2. Click "Clear data"
3. Reload extension (refresh icon)
4. Test again
```

## For Mac Users:
- System Preferences → Security & Privacy → Microphone
- Make sure Chrome is in the allowed apps list
- If not listed, add it

## For Windows Users:
- Settings → Privacy & security → Microphone
- Toggle microphone ON
- Check "App permissions"
- Make sure Chrome is allowed

## For Linux Users:
- Run: `pactl list sources` to verify microphone
- Check PulseAudio/ALSA settings
- Restart audio daemon if needed
