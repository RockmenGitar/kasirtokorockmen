/**
 * beep.ts
 * Bunyi singkat untuk umpan balik scan (Web Audio, tanpa file audio).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** Nada pendek. freq Hz, durasi ms. */
export function beep(freq = 880, duration = 90, gain = 0.05): void {
  const audio = getCtx();
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const vol = audio.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    vol.gain.value = gain;
    osc.connect(vol);
    vol.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration / 1000);
  } catch {
    /* no-op */
  }
}

/** Umpan balik scan sukses (nada tinggi). */
export function beepSuccess(): void {
  beep(1200, 80);
}

/** Umpan balik gagal (nada rendah). */
export function beepError(): void {
  beep(300, 160);
}
