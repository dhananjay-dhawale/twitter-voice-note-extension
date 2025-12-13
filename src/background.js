// Service Worker for handling background tasks

chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitter Voice Note Extension installed!');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'VOICE_NOTE_SENT') {
    console.log('Voice note sent from:', sender.url);
    sendResponse({ status: 'received' });
  }
});