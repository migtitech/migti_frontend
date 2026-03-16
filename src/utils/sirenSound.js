/**
 * Play a siren-like sound using Web Audio API (no external file).
 * Two-tone alternating pattern for ~2 seconds.
 */
export const playSirenSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const duration = 2
    const fade = 0.1
    const lowFreq = 400
    const highFreq = 800
    const cycles = 4
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + fade)
    gain.gain.setValueAtTime(0.25, ctx.currentTime + duration - fade)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
    const cycleLen = duration / cycles
    for (let i = 0; i < cycles; i++) {
      const t = ctx.currentTime + i * cycleLen
      osc.frequency.setValueAtTime(lowFreq, t)
      osc.frequency.linearRampToValueAtTime(highFreq, t + cycleLen / 2)
      osc.frequency.linearRampToValueAtTime(lowFreq, t + cycleLen)
    }
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Ignore if autoplay or AudioContext fails
  }
}

/**
 * Play a shorter, higher-pitch beep for rate update.
 */
export const playRateUpdateSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const duration = 0.8
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05)
    gain.gain.linearRampToValueAtTime(0, now + duration)
    osc.frequency.setValueAtTime(900, now)
    osc.frequency.exponentialRampToValueAtTime(1500, now + duration / 2)
    osc.frequency.exponentialRampToValueAtTime(700, now + duration)
    osc.start(now)
    osc.stop(now + duration)
  } catch {
    // Ignore audio errors
  }
}
