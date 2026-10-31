// Procedural Web Audio synthesizer for Cheongsong White Porcelain craft simulation

let audioCtx: AudioContext | null = null;
let wheelOsc: OscillatorNode | null = null;
let wheelGain: GainNode | null = null;
let kilnNoiseNode: AudioNode | null = null;
let kilnGain: GainNode | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setAudioMuted(muted: boolean) {
  isMuted = muted;
  if (audioCtx) {
    if (muted) {
      if (wheelGain) wheelGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
      if (kilnGain) kilnGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    }
  }
}

export function getAudioMuted(): boolean {
  return isMuted;
}

/**
 * Procedural wheel spinning hum
 */
export function startWheelSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx || wheelOsc) return;

  try {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(58, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, ctx.currentTime);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    wheelOsc = osc;
    wheelGain = gain;
  } catch (e) {
    console.warn('Audio start error', e);
  }
}

export function setWheelSpeedPitch(speedFactor: number) {
  if (!wheelOsc || !audioCtx || isMuted) return;
  try {
    const freq = 45 + speedFactor * 35;
    wheelOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.1);
  } catch {
    // ignore
  }
}

export function stopWheelSound() {
  if (wheelOsc && audioCtx) {
    try {
      if (wheelGain) {
        wheelGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
      }
      setTimeout(() => {
        try {
          wheelOsc?.stop();
          wheelOsc?.disconnect();
          wheelOsc = null;
          wheelGain = null;
        } catch {
          // ignore
        }
      }, 120);
    } catch {
      wheelOsc = null;
    }
  }
}

/**
 * Tactile wet clay friction sound when shaping
 */
export function playClayFrictionSound(intensity = 0.5) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400 + Math.random() * 300, ctx.currentTime);
    filter.Q.setValueAtTime(2.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.12, intensity * 0.09), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  } catch {
    // ignore
  }
}

/**
 * Trimming / Carving tool crisp sound
 */
export function playCarveSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // ignore
  }
}

/**
 * Pine firewood stoking sound
 */
export function playWoodStokeSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Thump + crackle
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);

    // Crackle burst
    for (let c = 0; c < 4; c++) {
      setTimeout(() => {
        if (!ctx || isMuted) return;
        const cOsc = ctx.createOscillator();
        const cGain = ctx.createGain();
        cOsc.type = 'square';
        cOsc.frequency.setValueAtTime(1200 + Math.random() * 800, ctx.currentTime);
        cGain.gain.setValueAtTime(0.03, ctx.currentTime);
        cGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        cOsc.connect(cGain);
        cGain.connect(ctx.destination);
        cOsc.start();
        cOsc.stop(ctx.currentTime + 0.04);
      }, 30 + c * 35);
    }
  } catch {
    // ignore
  }
}

/**
 * Traditional Korean Bell / Gong Resonance Chime
 */
export function playMasterpieceGong() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const freqs = [184, 276, 440, 554, 880];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const amp = 0.15 / (idx + 1);
      gain.gain.setValueAtTime(amp, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5 + idx * 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 3.2);
    });
  } catch {
    // ignore
  }
}

/**
 * Click / Toggle button sound
 */
export function playButtonSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  } catch {
    // ignore
  }
}
