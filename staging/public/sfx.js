'use strict';

// Notification sounds, synthesized (no audio files): a message chime, a rising arpeggio for a friend request, a
// bright chord when a request is accepted, a soft two-note call when a friend comes online, a soft blip when a message
// goes out, and for your own choices a happy "accepted" and a falling "declined". Do not disturb silences what comes
// in, not what you do.
window.Sfx = (() => {
  let ctx = null;
  let out = null;
  let idle = 0;

  function audio() {
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
    idle = setTimeout(() => ctx.state === 'running' && ctx.suspend(), 2500);
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
      const yours = name === 'send' || name === 'accept' || name === 'decline';
      if (!SOUNDS[name] || (window.Social && window.Social.dnd() && !yours)) return;
      try {
        audio();
        SOUNDS[name]();
        setTimeout(warnIfSilent, 600);
      } catch {}
    },
  };
})();
