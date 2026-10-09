(() => {
  "use strict";
  console.log("[YTM-RPC] Extensão carregada.");
  let lastData = null;
  let lastPlayingData = null;
  function getTrackData() {
    const track = document.querySelector('ytmusic-track-info[aria-label="Now playing"]');
    const video = document.querySelector("video");
    const title = track?.querySelector(".ytmusicTrackInfoTitle")?.textContent?.trim() || null;
    const artist = track?.querySelector(".ytmusicTrackInfoByline a")?.textContent?.trim() || null;
    const artwork = track?.querySelector(".ytmusicTrackInfoThumbnail")?.src || null;
    const timeText = document.querySelector(".ytMusicMiniPlayerTimeInfo")?.textContent?.trim() || null;
    let currentTime = Number.isFinite(video?.currentTime) ? video.currentTime : null;
    let duration = Number.isFinite(video?.duration) ? video.duration : null;
    let state = "stopped";
    if (video) {
      if (!video.paused && !video.ended) state = "playing";
      else if (video.paused && video.currentTime > 0) state = "paused";
    }
    return {title, artist, artwork, timeText, currentTime, duration, state};
  }
  function sendData(data) {
    const serialized = JSON.stringify(data);
    if (serialized === lastData) return;
    lastData = serialized;
    console.log("[YTM-RPC] Dados enviados:", data);
    chrome.runtime.sendMessage({type:"YTM_DATA", data});
  }
  function checkTrack() {
    const data = getTrackData();
    if (data.state === "playing") lastPlayingData = {...data};
    sendData(data);
  }
  function setupVideoListeners() {
    const video = document.querySelector("video");
    if (!video || video.dataset.ytmRpcListeners) return;
    video.dataset.ytmRpcListeners = "true";
    video.addEventListener("pause", () => {
      const data = getTrackData();
      const pausedData = lastPlayingData ? {...lastPlayingData, currentTime:data.currentTime, duration:data.duration, state:"paused"} : data;
      sendData(pausedData);
    });
    video.addEventListener("play", checkTrack);
    video.addEventListener("loadedmetadata", checkTrack);
  }
  setupVideoListeners();
  checkTrack();
  setInterval(() => { setupVideoListeners(); checkTrack(); }, 1000);
})();
