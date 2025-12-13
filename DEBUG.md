# Debugging Content Script Issues

## If You're Getting "Content Script Not Loaded" Error:

### Quick Fix:
1. Go to `chrome://extensions/`
2. Click **refresh** on the extension
3. Go back to Twitter/X DM page
4. **Refresh the Twitter page** (Ctrl+R or Cmd+R)
5. Try again

## Why This Happens:

The content script needs to be injected into the Twitter page. If you load the extension AFTER opening Twitter, the script won't be on the page yet. Refreshing Twitter ensures it gets loaded.

## Step-by-Step Debug:

### Step 1: Check Extension Loaded
```
1. chrome://extensions/
2. Find "Twitter Voice Note Extension"
3. Should say "Enabled" (not "Errors")
4. If errors, click "Details" and see what's wrong
```

### Step 2: Check Content Script is on Page
```
1. Open Twitter DM page: https://x.com/messages
2. Right-click on page → "Inspect"
3. Go to "Console" tab
4. Look for logs starting with "[Voice Note]"
5. Should see: "[Voice Note] Content script loaded on: https://x.com/messages"
6. If you don't see this, content script isn't loaded
```

### Step 3: Verify You're on DM Page
```
1. Check URL is: https://x.com/messages (or https://twitter.com/messages)
2. A DM conversation should be open (not just the list)
3. You should see a message input box at the bottom
```

### Step 4: Debug the Send Process
```
1. Click extension icon
2. Record a voice note
3. Click "✈️ Send"
4. Go back to Twitter page
5. Right-click → Inspect → Console
6. Look for "[Voice Note]" logs:
   - "Received message: SEND_VOICE_NOTE"
   - "Processing SEND_VOICE_NOTE request"
   - "Found visible message input with selector:"
   - "Found visible send button with selector:"
   - "Send button clicked"
7. Any errors? Note them down
```

## Common Issues & Fixes:

### Issue: Content script logs don't appear
**Solution:**
```
1. Go to chrome://extensions/
2. Reload (refresh icon) the extension
3. Go to Twitter DM page
4. REFRESH the page (Ctrl+R)
5. Check console again
```

### Issue: "Selector found 0 elements"
**Solution:**
- Twitter frequently updates their HTML
- We have multiple selectors as backup
- If none work, the page structure changed
- Check latest console logs for which selectors were tried

### Issue: Input found but send button not found
**Solution:**
```
1. Make sure you're in an actual DM conversation
2. Not just the DM list page
3. There should be an input box at the bottom
4. Try a different DM conversation
```

### Issue: Send button found but message doesn't appear
**Solution:**
- The script may not be injecting text correctly
- Try clicking in the message box manually first
- Then use the extension

## Enable Full Debug Logging:

To see more details about what's happening:

1. Go to popup.js and uncomment debug lines (coming in next update)
2. Right-click extension → Inspect popup
3. Go to Console tab
4. Perform actions and watch console output

## Still Not Working?

1. **Take a screenshot** of the console errors
2. **Note the Twitter URL** you're on
3. **Check if**: 
   - You're on x.com or twitter.com
   - You're viewing a DM conversation (not just DM list)
   - The message input box is visible
   - You have extension permissions

4. **Try the manual test**:
   ```
   1. In the DM input, type: "🎤 Voice Note Test"
   2. Click Send
   3. If this works, it's an extension issue
   4. If this doesn't work, it's a Twitter/page issue
   ```

5. **Reload everything**:
   ```
   1. chrome://extensions/ → Reload extension
   2. Refresh Twitter page (Ctrl+R)
   3. Try again
   ```
