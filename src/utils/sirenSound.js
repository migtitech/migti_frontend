/**
 * Resolves the first audio file inside `src/assets/audio/` (if any) at build time.
 * Drop a file like `siren.mp3` there and it will be picked up automatically.
 */
const sirenAssets = import.meta.glob(
  "../assets/audio/*.{mp3,wav,ogg,m4a,aac}",
  { eager: true, query: "?url", import: "default" },
);
const sirenAssetUrl = Object.values(sirenAssets)[0] || null;

let sharedAudioContext = null;
let audioUnlockInstalled = false;
let audioUnlocked = false;

const getAudioContextCtor = () =>
  typeof window !== "undefined"
    ? window.AudioContext || window.webkitAudioContext
    : null;

export const ensureAudioReady = async () => {
  const AudioContext = getAudioContextCtor();
  if (!AudioContext) return null;
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext();
  }
  if (sharedAudioContext.state === "suspended") {
    try {
      await sharedAudioContext.resume();
    } catch {
      // ignore
    }
  }
  return sharedAudioContext;
};

/** Call once after login — unlocks audio on first click/key/touch in the app. */
export const installNotificationAudioUnlock = () => {
  if (audioUnlockInstalled || typeof window === "undefined") return;
  audioUnlockInstalled = true;

  const unlock = () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    void (async () => {
      await ensureAudioReady();
      if (sirenAssetUrl) {
        try {
          const probe = new Audio(sirenAssetUrl);
          probe.volume = 0;
          await probe.play();
          probe.pause();
          probe.currentTime = 0;
        } catch {
          // HTML audio blocked — Web Audio may still work after ensureAudioReady
        }
      }
    })();
  };

  window.addEventListener("pointerdown", unlock, {
    capture: true,
    passive: true,
  });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });
};

/**
 * Play the bundled notification siren audio file (if present).
 * Falls back to synthesized `playSirenSound` when blocked or missing.
 */
export const playNotificationSiren = () => {
  void (async () => {
    await ensureAudioReady();

    if (sirenAssetUrl) {
      try {
        const playback = new Audio(sirenAssetUrl);
        playback.volume = 0.7;
        playback.preload = "auto";
        await playback.play();
        return;
      } catch {
        // fall through to synthesized siren
      }
    }

    await playSirenSound();
  })();
};

/**
 * Play a siren-like sound using Web Audio API (no external file).
 */
export const playSirenSound = async () => {
  try {
    const ctx = await ensureAudioReady();
    if (!ctx || ctx.state !== "running") return;

    const duration = 2;
    const fade = 0.1;
    const lowFreq = 400;
    const highFreq = 800;
    const cycles = 4;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + fade);
    gain.gain.setValueAtTime(0.25, ctx.currentTime + duration - fade);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    const cycleLen = duration / cycles;
    for (let i = 0; i < cycles; i++) {
      const t = ctx.currentTime + i * cycleLen;
      osc.frequency.setValueAtTime(lowFreq, t);
      osc.frequency.linearRampToValueAtTime(highFreq, t + cycleLen / 2);
      osc.frequency.linearRampToValueAtTime(lowFreq, t + cycleLen);
    }
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // ignore autoplay / AudioContext errors
  }
};

/**
 * Play a shorter, higher-pitch beep for rate update.
 */
export const playRateUpdateSound = () => {
  void (async () => {
    try {
      const ctx = await ensureAudioReady();
      if (!ctx || ctx.state !== "running") return;

      const duration = 0.8;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + duration);
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + duration / 2);
      osc.frequency.exponentialRampToValueAtTime(700, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // ignore
    }
  })();
};
