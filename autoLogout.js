// autoLogout.js
let logoutTimer;
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes (in ms)

// Reset timer on any user activity
function resetTimer() {
  clearTimeout(logoutTimer);
  logoutTimer = setTimeout(() => {
    localStorage.clear(); // clear session
    alert("You have been logged out due to inactivity.");
    window.location.href = "index.html";
  }, INACTIVITY_LIMIT);
}

// Monitor these events as "activity"
["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(event => {
  window.addEventListener(event, resetTimer);
});

// Initialize timer on page load
resetTimer();
