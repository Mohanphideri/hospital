// A short two-tone alert beep generated with the Web Audio API - no audio
// asset to bundle, and it works the moment the page has had any user
// interaction (required by browser autoplay policies).
export function playAlertBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const beep = (freq, startTime) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.28, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    };

    const now = ctx.currentTime;
    beep(880, now);
    beep(1046, now + 0.32);
  } catch {
    // Audio isn't critical - a failure here should never break the alert flow.
  }
}
