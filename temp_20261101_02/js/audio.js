/* ============================================================
 * audio.js —— 用 Web Audio API 生成卡通音效（无需资源文件）
 * ============================================================ */
const Audio = (() => {
  let ctx = null;
  let sfxVol = 0.6, bgmVol = 0.4;
  let bgmTimer = null, bgmGain = null;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur = 0.1, type = 'sine', vol = 1) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(sfxVol * vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }

  return {
    init() { ensure(); },
    setSfx(v) { sfxVol = v / 100; },
    setBgm(v) { bgmVol = v / 100; if (bgmGain) bgmGain.gain.value = bgmVol * 0.3; },

    shoot() { tone(880, 0.08, 'square', 0.6); },
    hit() { tone(180, 0.15, 'sawtooth', 0.7); setTimeout(() => tone(120, 0.1, 'sawtooth', 0.5), 60); },
    boom() { tone(80, 0.3, 'sawtooth', 0.8); setTimeout(() => tone(50, 0.3, 'sawtooth', 0.6), 80); },
    coin() { tone(1200, 0.08, 'sine', 0.5); setTimeout(() => tone(1600, 0.12, 'sine', 0.5), 80); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.6), i * 120)); },
    lose() { [400, 350, 300, 200].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.6), i * 130)); },
    click() { tone(600, 0.05, 'square', 0.4); },
    eat() { tone(1000, 0.06, 'sine', 0.5); setTimeout(() => tone(1400, 0.08, 'sine', 0.5), 50); },
    bounce() { tone(500, 0.05, 'sine', 0.4); },

    startBgm() {
      const c = ensure(); if (!c || bgmTimer) return;
      bgmGain = c.createGain();
      bgmGain.gain.value = bgmVol * 0.3;
      bgmGain.connect(c.destination);
      const notes = [262, 330, 392, 523, 392, 330, 262, 196];
      let i = 0;
      bgmTimer = setInterval(() => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle'; o.frequency.value = notes[i % notes.length];
        g.gain.setValueAtTime(bgmVol * 0.3, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
        o.connect(g); g.connect(bgmGain);
        o.start(); o.stop(c.currentTime + 0.3);
        i++;
      }, 320);
    },
    stopBgm() {
      if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
      if (bgmGain) { try { bgmGain.disconnect(); } catch (e) {} bgmGain = null; }
    },
  };
})();
