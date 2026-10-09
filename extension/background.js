"use strict";
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "YTM_DATA") return;
  fetch("http://127.0.0.1:38473/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message.data)
  })
    .then(async response => {
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      return result;
    })
    .then(result => sendResponse(result))
    .catch(error=>sendResponse({success:false,error:String(error)}));
  return true;
});
