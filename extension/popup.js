chrome.runtime.sendMessage({ type: 'status' }).then(status => {
  document.querySelector('#state').textContent = status.active ? 'Keeping the display awake' : 'Waiting for focused autoscroll';
  document.querySelector('#helper').textContent = status.helperConnected
    ? 'Mac screensaver helper connected.'
    : 'On Mac, install the included helper for screensaver protection (see README). It connects when autoscroll starts.';
});
