chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COPY_TEXT' && message.target === 'offscreen') {
    navigator.clipboard.writeText(message.text)
      .then(() => {
        sendResponse({ success: true });
        // 完成后关闭offscreen document
        chrome.offscreen.closeDocument();
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});