// Tiny WebAudio chord synth. The AudioContext is created lazily and must first
// be touched inside a user gesture (iOS), hence unlock().

export function createAudio() {
  let ctx = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play(midiNotes) {
    const c = ensure();
    if (!c || !midiNotes.length) return;
    const t0 = c.currentTime + 0.03;
    const master = c.createGain();
    master.gain.value = 0.5 / Math.sqrt(midiNotes.length);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    master.connect(lp);
    lp.connect(c.destination);

    let lastOsc = null;
    midiNotes.forEach((m, i) => {
      const t = t0 + i * 0.012; // slight spread so the block doesn't sound mechanical
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.015);
      g.gain.setTargetAtTime(0.0001, t + 0.7, 0.45);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 2.6);
      lastOsc = osc;
    });
    lastOsc.onended = () => { master.disconnect(); lp.disconnect(); };
  }

  return { unlock: ensure, play };
}
