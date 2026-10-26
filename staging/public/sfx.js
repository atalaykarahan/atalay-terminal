'use strict';

// Notification sounds, synthesized (no audio files): a message chime, a rising arpeggio for a friend request, a
// bright chord when a request is accepted, a soft two-note call when a friend comes online, a soft blip when a message
// goes out, and for your own choices a happy "accepted" and a falling "declined". Your progress has its own: a coin
// for the daily bonus, and for the level-up takeover a burst of static, then a ringing "ding" for a new level or a
// brass fanfare for a new rank. Do not disturb silences what comes in, not what you do (the level-up waits for it to
// end and then plays).
window.Sfx = (() => {
  let ctx = null;
  let out = null;
  let idle = 0;

  function audio(ms = 2500) {
    if (!ctx) {
      ctx = new AudioContext();
      // A short echo gives the tones a little space without sounding like an alarm.
      const delay = ctx.createDelay(1);
      const feedback = ctx.createGain();
      const wet = ctx.createGain();
      out = ctx.createGain();
      delay.delayTime.value = 0.13;
      feedback.gain.value = 0.28;
      wet.gain.value = 0.3;
      out.gain.value = 0.9;
      out.connect(ctx.destination);
      out.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(wet).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    // A running context keeps a real-time audio thread busy; rest it between sounds.
    clearTimeout(idle);
    idle = setTimeout(() => ctx.state === 'running' && ctx.suspend(), ms);
    return ctx;
  }

  // One soft bell-like note: a sine with a quieter octave above, quick attack, gentle fade.
  function note(freq, at, { dur = 0.45, vol = 0.11, type = 'sine', bright = 0.35 } = {}) {
    const c = ctx;
    const t = c.currentTime + at;
    for (const [mult, level] of [[1, 1], [2, bright]]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * level, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (mult === 1 ? 1 : 0.6));
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  // A brass-like note: two slightly detuned saws through a filter that opens fast and closes slowly.
  function horn(freq, at, dur, vol) {
    const t = ctx.currentTime + at;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    f.type = 'lowpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(freq * 1.5, t);
    f.frequency.exponentialRampToValueAtTime(freq * 7, t + 0.05);
    f.frequency.exponentialRampToValueAtTime(freq * 2.6, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(vol * 0.72, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
    f.connect(g).connect(out);
    for (const cents of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = cents;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.35);
    }
  }

  // A soft rising whoosh under a fanfare.
  function swell(from, to, at, dur, vol) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // A burst of digital noise through a band-pass, chopped on and off: a screen being hijacked.
  function noise(at, dur, vol) {
    const t = ctx.currentTime + at;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (Math.floor(i / 380) % 3 ? 1 : 0.15);
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buf;
    f.type = 'bandpass';
    f.frequency.value = 1900;
    f.Q.value = 0.7;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t);
    src.stop(t + dur);
  }

  // How long the longer sounds ring, so the audio doesn't rest before they end.
  const LENGTH = { levelup: 3000, rankup: 4200, glitch: 1200 };

  const SOUNDS = {
    // Incoming message: two quick rising notes, like a HUD ping.
    message() {
      note(880, 0, { dur: 0.32 });
      note(1318.5, 0.085, { dur: 0.5 });
    },
    // Friend request: a rising arpeggio.
    request() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.07, { dur: 0.38, type: 'triangle', vol: 0.09, bright: 0.2 }));
    },
    // Request accepted: a bright chord with a sparkle on top.
    friend() {
      [523.25, 659.25, 783.99].forEach((f) => note(f, 0, { dur: 0.7, type: 'triangle', vol: 0.07, bright: 0.15 }));
      note(2093, 0.12, { dur: 0.35, vol: 0.05, bright: 0 });
    },
    // A friend came online: two soft rising notes, lower and quieter than a message.
    online() {
      note(587.33, 0, { dur: 0.3, type: 'triangle', vol: 0.075, bright: 0.2 });
      note(880, 0.1, { dur: 0.5, type: 'triangle', vol: 0.075, bright: 0.2 });
    },
    // You accepted a request: a quick rising run that lands on a chord.
    accept() {
      [659.25, 783.99, 987.77].forEach((f, i) => note(f, i * 0.055, { dur: 0.3, type: 'triangle', vol: 0.08, bright: 0.2 }));
      [783.99, 987.77, 1318.5].forEach((f) => note(f, 0.18, { dur: 0.6, vol: 0.06, bright: 0.25 }));
    },
    // You declined or removed: two falling notes, a soft "nope".
    decline() {
      note(392, 0, { dur: 0.22, type: 'triangle', vol: 0.1, bright: 0.1 });
      note(293.66, 0.13, { dur: 0.42, type: 'triangle', vol: 0.1, bright: 0.1 });
    },
    // The level-up takeover starts: stuttering static and a falling "error" blip.
    glitch() {
      noise(0, 0.1, 0.1);
      noise(0.14, 0.06, 0.08);
      noise(0.24, 0.14, 0.09);
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.28);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.32);
    },
    // Daily bonus: two quick bright notes, like a coin.
    xp() {
      note(1567.98, 0, { dur: 0.12, type: 'triangle', vol: 0.07, bright: 0.3 });
      note(2093, 0.075, { dur: 0.5, type: 'triangle', vol: 0.07, bright: 0.3 });
    },
    // A new level: a quick rising run landing on a ringing major chord, an MMO's "ding".
    levelup() {
      swell(130.81, 261.63, 0, 0.7, 0.05);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.06, { dur: 0.3, type: 'triangle', vol: 0.08, bright: 0.25 }));
      [1046.5, 1318.5, 1567.98].forEach((f) => note(f, 0.26, { dur: 1.9, vol: 0.055, bright: 0.45 }));
      [2093, 2637].forEach((f, i) => note(f, 0.34 + i * 0.1, { dur: 1.2, vol: 0.03, bright: 0 }));
    },
    // A new rank: a brass fanfare climbing in fourths, a long bright chord, bells on top.
    rankup() {
      swell(98, 196, 0.3, 1.4, 0.06);
      [[392, 0], [523.25, 0.13], [698.46, 0.26], [783.99, 0.39]].forEach(([f, t]) => horn(f, t, 0.16, 0.05));
      [523.25, 659.25, 783.99, 1174.66].forEach((f) => horn(f, 0.6, 1.7, 0.035));
      [2093, 2637, 3135.96, 4186].forEach((f, i) => note(f, 0.68 + i * 0.09, { dur: 0.9, vol: 0.028, bright: 0 }));
      note(1046.5, 0.6, { dur: 2.4, vol: 0.04, bright: 0.5 });
    },
    // Message sent: a short, low-key blip.
    send() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1250, t);
      o.frequency.exponentialRampToValueAtTime(760, t + 0.07);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.1);
    },
  };

  let warned = false;
  function warnIfSilent() {
    if (warned || !ctx || ctx.state === 'running') return;
    warned = true;
    const msg = `notification sounds blocked: audio context is ${ctx.state}`;
    const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.messages;
    if (h) h.postMessage({ type: 'log', msg });
    else console.warn(msg);
  }

  return {
    play(name) {
      const yours = ['send', 'accept', 'decline', 'levelup', 'rankup', 'glitch'].includes(name);
      if (!SOUNDS[name] || (window.Social && window.Social.dnd() && !yours)) return;
      try {
        audio(LENGTH[name] || 2500);
        SOUNDS[name]();
        setTimeout(warnIfSilent, 600);
      } catch {}
    },
  };
})();
