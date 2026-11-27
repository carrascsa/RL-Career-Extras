// RL Career Extras — "Caster" tab: replay any series your club played (or a big final) with two
// casters, a live scoreboard and the system voices (Web Speech API, works offline with Windows voices).
(function () {
  const X = window.__xt;
  if (!X || window.__xtCasterUi) return;
  window.__xtCasterUi = true;
  const TAB = 'xtcaster';
  const e = X.e;

  const D = {
    en: {
      tab: 'Caster', title: 'Broadcast', sub: 'Watch your series again with live commentary',
      series: 'Series to watch', none: 'No series yet. Play a match and the broadcast will be here.', watch: 'Watch', again: 'Watch again', yours: 'Your club', final: 'Final', newTag: 'NEW',
      play: 'Play', pause: 'Pause', next: 'Skip line', stop: 'Stop', finish: 'Skip to the end',
      settings: 'Settings', lang: 'Commentary language', auto: 'Same as the Hub', voice: 'Voice', voiceOn: 'Voice on', voiceOff: 'Text only', speed: 'Speed',
      voices: 'Voices', pbpVoice: 'Play-by-play voice', colorVoice: 'Analyst voice', noVoices: 'No system voices found for this language: text only. Windows: Settings → Time & language → Speech → Add voices.', defaultVoice: 'Automatic',
      game: 'Game', bo: 'Best of {n}', live: 'LIVE', ended: 'FINAL', transcript: 'Commentary', pick: 'Pick a series on the left.',
      liveTitle: 'LIVE from Rocket League', liveIdle: 'When you play a real match from the Hub, the casters call it live here and out loud.', liveSetting: 'Live commentary in your matches', broadcastSetting: 'Broadcast screens after each game (series + stats)', broadcastInfo: 'Shown over Rocket League: it must run in borderless or windowed mode.', preview: 'Preview', liveOn: 'On', liveOff: 'Off', volume: 'Volume', proVoice: 'Live caster voices', ambience: 'Arena crowd (chants, roars)', proOn: 'Pro (recorded)', proOff: 'Windows', proInfo: 'Pro voices are recorded clips in English, with the names of the players of your league.',
      info: 'Goals, scorers, saves, demos and overtime come from the real game data. The Hub does not store the minute of each goal, so the order and the clock are reconstructed to match the final score.',
    },
    es: {
      tab: 'Caster', title: 'Transmisión', sub: 'Mirá de nuevo tus series con relato en vivo',
      series: 'Series para ver', none: 'Todavía no hay series. Jugá un partido y la transmisión va a estar acá.', watch: 'Ver', again: 'Ver de nuevo', yours: 'Tu club', final: 'Final', newTag: 'NUEVO',
      play: 'Reproducir', pause: 'Pausa', next: 'Saltar frase', stop: 'Detener', finish: 'Ir al final',
      settings: 'Ajustes', lang: 'Idioma del relato', auto: 'Igual que el Hub', voice: 'Voz', voiceOn: 'Con voz', voiceOff: 'Solo texto', speed: 'Velocidad',
      voices: 'Voces', pbpVoice: 'Voz del relator', colorVoice: 'Voz del comentarista', noVoices: 'No hay voces del sistema para este idioma: solo texto. En Windows: Configuración → Hora e idioma → Voz → Agregar voces.', defaultVoice: 'Automática',
      game: 'Game', bo: 'Al mejor de {n}', live: 'EN VIVO', ended: 'FINAL', transcript: 'Relato', pick: 'Elegí una serie a la izquierda.',
      liveTitle: 'EN VIVO desde Rocket League', liveIdle: 'Cuando juegues un partido real desde el Hub, los casters lo relatan en vivo acá y en voz alta.', liveSetting: 'Relato en vivo en tus partidos', broadcastSetting: 'Pantallas de transmisión al terminar cada game (serie + estadísticas)', broadcastInfo: 'Se muestran sobre Rocket League: tiene que estar en pantalla completa sin bordes o en ventana.', preview: 'Vista previa', liveOn: 'Prendido', liveOff: 'Apagado', volume: 'Volumen', proVoice: 'Voces del caster en vivo', ambience: 'Público del estadio (cánticos, festejos)', proOn: 'Pro (grabadas)', proOff: 'Windows', proInfo: 'Las voces pro son clips grabados en inglés, con los nombres de los jugadores de tu liga.',
      info: 'Los goles, goleadores, atajadas, demoliciones y alargues salen de los datos reales del partido. El Hub no guarda el minuto de cada gol, así que el orden y el reloj se reconstruyen para que coincidan con el resultado.',
    },
  };
  const t = (k, p) => X.tr(D, k, p);
  const args = (o) => e(JSON.stringify(o));
  const synth = typeof window.speechSynthesis !== 'undefined' ? window.speechSynthesis : null;

  // ---------- player ----------
  const P = { script: null, i: -1, playing: false, timer: null, utter: null };
  const storage = () => { try { return window.localStorage || null; } catch { return null; } };
  const getPref = (k) => { const st = storage(); return st ? st.getItem('xtCaster.' + k) || '' : ''; };
  const setPref = (k, v) => { const st = storage(); if (st) st.setItem('xtCaster.' + k, v); };

  const volume = () => { const v = Number(getPref('volume')); return v > 0 && v <= 1 ? v : 1; };
  function settings() { const s = X.snap(); return (s && s.caster) || { voice: true, rate: 1.1, effLang: X.lang() }; }
  function voicesFor(lang) {
    if (!synth) return [];
    return synth.getVoices().filter((v) => String(v.lang || '').toLowerCase().startsWith(lang));
  }
  function voiceFor(who, lang) {
    const list = voicesFor(lang);
    if (!list.length) return null;
    const want = getPref(who + '.' + lang);
    const v = list.find((x) => x.name === want);
    if (v) return v;
    // both casters are men: Max takes the first male system voice, Leo another one when Windows has it
    const MALE = /pablo|raul|david|mark|george|guy|james|richard|sean|ryan|jorge|alvaro|dario|gonzalo|tomas|jean|paul|stefan/i;
    const FEMALE = /helena|laura|sabina|zira|hazel|susan|elvira|dalia|elena|paloma|linda|catherine|heera|aria|jenny|julie|hortense|katja/i;
    const males = list.filter((x) => MALE.test(x.name) && !FEMALE.test(x.name));
    if (males.length) return who === 'pbp' ? males[0] : males[1] || males[0];
    return who === 'color' && list.length > 1 ? list[1] : list[0];
  }

  function clearTimers() {
    if (P.timer) { clearTimeout(P.timer); P.timer = null; }
    if (synth) { try { synth.cancel(); } catch { /* ignore */ } }
    P.utter = null;
  }
  function redraw() {
    if (typeof tab === 'undefined' || tab !== TAB) return;
    // don't rebuild the page under an open voice picker
    const a = document.activeElement;
    if (a && a.matches && a.matches('select[data-xt-voice]')) return;
    render();
  }

  function step() {
    if (!P.playing || !P.script) return;
    P.i++;
    if (P.i >= P.script.lines.length) { P.playing = false; P.i = P.script.lines.length - 1; redraw(); return; }
    redraw();
    const line = P.script.lines[P.i];
    const S = settings();
    const rate = Number(S.rate) || 1.1;
    const lang = P.script.lang;
    const v = S.voice && synth ? voiceFor(line.who, lang) : null;
    if (v) {
      const u = new SpeechSynthesisUtterance(line.text.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, ''));
      u.voice = v;
      u.lang = v.lang;
      u.rate = rate * (line.goal ? 1.12 : 1);
      u.pitch = line.who === 'pbp' ? (line.goal ? 1.25 : 1.05) : 0.95;
      u.volume = volume();
      const go = () => { if (P.utter === u) { P.utter = null; P.timer = setTimeout(step, line.goal ? 500 : 250); } };
      u.onend = go;
      u.onerror = go;
      P.utter = u;
      synth.speak(u);
    } else {
      P.timer = setTimeout(step, (1100 + line.text.length * 42) / rate + (line.goal ? 600 : 0));
    }
  }
  function play() { if (!P.script) return; if (P.i >= P.script.lines.length - 1) P.i = -1; P.playing = true; clearTimers(); step(); }
  function pause() { P.playing = false; clearTimers(); redraw(); }
  function stop() { P.playing = false; clearTimers(); P.script = null; P.i = -1; redraw(); }
  function skip() { if (!P.script) return; clearTimers(); if (!P.playing) { P.i = Math.min(P.script.lines.length - 1, P.i + 1); redraw(); } else { P.i = Math.min(P.script.lines.length - 2, P.i); step(); } }
  function finish() { if (!P.script) return; P.playing = false; clearTimers(); P.i = P.script.lines.length - 1; redraw(); }

  // ---------- view ----------
  function board(sc) {
    let cur = { score: [0, 0], series: [0, 0], game: 0, clock: '' };
    for (let k = 0; k <= P.i && k < sc.lines.length; k++) {
      const l = sc.lines[k];
      if (l.score) cur.score = l.score;
      if (l.series) cur.series = l.series;
      if (l.game != null) cur.game = l.game;
      if (l.clock != null) cur.clock = l.clock;
    }
    const need = Math.ceil(sc.bestOf / 2);
    const dots = (n, c) => Array.from({ length: need }, (_, k) => `<i style="display:inline-block;width:18px;height:5px;border-radius:2px;margin:0 2px;background:${k < n ? c : 'rgba(255,255,255,.15)'}"></i>`).join('');
    const ended = P.i >= sc.lines.length - 1 && sc.lines[sc.lines.length - 1] && !P.playing;
    const last = sc.lines[P.i] || null;
    const flash = last && last.goal ? (last.goal === 'home' ? sc.colors[0] : sc.colors[1]) : null;
    return `<div class="xt-card" style="padding:0;overflow:hidden;${flash ? `box-shadow:0 0 0 2px ${flash},0 0 30px ${flash}55` : ''}">
      <div style="text-align:center;font-size:11px;letter-spacing:.2em;text-transform:uppercase;padding:6px;background:rgba(0,0,0,.35)">${e(sc.event)} · ${e(t('bo', { n: sc.bestOf }))} ${P.playing ? `<span class="xt-pill bad" style="margin-left:6px">● ${e(t('live'))}</span>` : ended ? `<span class="xt-pill" style="margin-left:6px">${e(t('ended'))}</span>` : ''}</div>
      <div style="display:grid;grid-template-columns:1fr auto auto auto 1fr;align-items:center">
        <div style="background:linear-gradient(90deg,transparent,${sc.colors[0]}88);padding:14px 16px;text-align:right;font-weight:900;font-size:20px">${e(sc.home)}<div>${dots(cur.series[0], sc.colors[0])}</div></div>
        <div style="background:${sc.colors[0]};color:#fff;font-size:34px;font-weight:900;padding:8px 18px;text-shadow:0 1px 3px #000">${cur.score[0]}</div>
        <div style="background:#0b0f18;padding:6px 16px;text-align:center"><div style="font-size:22px;font-weight:900;font-variant-numeric:tabular-nums">${e(cur.clock || '5:00')}</div><div style="font-size:10px;opacity:.7;letter-spacing:.15em">${cur.game ? e(t('game')) + ' ' + cur.game : '—'}</div></div>
        <div style="background:${sc.colors[1]};color:#fff;font-size:34px;font-weight:900;padding:8px 18px;text-shadow:0 1px 3px #000">${cur.score[1]}</div>
        <div style="background:linear-gradient(270deg,transparent,${sc.colors[1]}88);padding:14px 16px;font-weight:900;font-size:20px">${e(sc.away)}<div>${dots(cur.series[1], sc.colors[1])}</div></div>
      </div></div>`;
  }

  function casterLine(sc, C) {
    const l = sc.lines[P.i];
    if (!l) return `<div class="xt-card xt-muted" style="margin-top:12px">▶ ${e(t('play'))}</div>`;
    const c = C[l.who] || C.pbp;
    const lg = sc.lang;
    return `<div class="xt-card" style="margin-top:12px;display:flex;gap:14px;align-items:center">
      <div style="font-size:34px">${l.who === 'pbp' ? '🎙️' : '🎧'}</div>
      <div><div class="xt-muted" style="font-size:11px;letter-spacing:.12em;text-transform:uppercase">${e(c.name)} · ${e(c.role[lg] || c.role.en)}</div>
      <div style="font-size:${l.goal ? 22 : 18}px;font-weight:${l.goal ? 900 : 700};margin-top:3px">${e(l.text)}</div></div></div>`;
  }

  function transcript(sc, C) {
    const rows = sc.lines.slice(0, P.i + 1).map((l) => ({ l })).reverse().slice(0, 40).map(({ l }) => `<div class="xt-row" style="align-items:flex-start"><span style="min-width:44px" class="xt-muted">${e(l.clock || '')}</span><span style="flex:1">${l.who === 'pbp' ? '🎙️' : '🎧'} ${l.goal ? `<b>${e(l.text)}</b>` : e(l.text)}</span></div>`).join('');
    return `<div class="xt-card" style="margin-top:12px"><h3>📝 ${e(t('transcript'))}</h3>${rows || '<div class="xt-muted">—</div>'}</div>`;
  }

  function controls() {
    const b = (id, label, on, dis) => `<button class="xt-btn ${on ? 'on' : ''}" data-xt-local="${id}"${dis ? ' disabled' : ''}>${e(label)}</button>`;
    return `<div class="xt-actions" style="justify-content:flex-start;margin-top:12px">${P.playing ? b('pause', '⏸ ' + t('pause'), true) : b('play', '▶ ' + t('play'), false, !P.script)}${b('skip', '⏭ ' + t('next'), false, !P.script)}${b('finish', '⏩ ' + t('finish'), false, !P.script)}${b('stop', '⏹ ' + t('stop'), false, !P.script)}</div>`;
  }

  function settingsCard(C) {
    const S = settings();
    const lg = S.effLang;
    const langBtn = (v, label) => `<button class="xt-btn ${(S.lang || '') === v ? 'on' : ''}" data-xt-cmd="caster:settings" data-xt-args="${args({ lang: v || null })}">${e(label)}</button>`;
    const vs = voicesFor(lg);
    const sel = (who) => `<select data-xt-voice="${who}" style="background:rgba(0,0,0,.35);border:1px solid var(--line);color:#e8eef7;border-radius:8px;padding:5px 8px;font:inherit;font-size:12px;max-width:230px"><option value="">${e(t('defaultVoice'))}</option>${vs.map((v) => `<option value="${e(v.name)}"${getPref(who + '.' + lg) === v.name ? ' selected' : ''}>${e(v.name)}</option>`).join('')}</select>`;
    const b2 = (id, label, on) => `<button class="xt-btn ${on ? 'on' : ''}" data-xt-local="${id}">${e(label)}</button>`;
    const rates = [0.9, 1.1, 1.3].map((r) => `<button class="xt-btn ${Math.abs(S.rate - r) < 0.05 ? 'on' : ''}" data-xt-cmd="caster:settings" data-xt-args="${args({ rate: r })}">${r}×</button>`).join('');
    return `<div class="xt-card" style="margin-top:12px"><h3>⚙️ ${e(t('settings'))}</h3>
      <div class="xt-row"><span>${e(t('lang'))}</span><span class="xt-actions">${langBtn('', t('auto'))}${langBtn('en', 'English')}${langBtn('es', 'Español')}</span></div>
      <div class="xt-row"><span>${e(t('voice'))}</span><span class="xt-actions"><button class="xt-btn ${S.voice ? 'on' : ''}" data-xt-cmd="caster:settings" data-xt-args="${args({ voice: true })}">${e(t('voiceOn'))}</button><button class="xt-btn ${!S.voice ? 'on' : ''}" data-xt-cmd="caster:settings" data-xt-args="${args({ voice: false })}">${e(t('voiceOff'))}</button></span></div>
      <div class="xt-row"><span>${e(t('speed'))}</span><span class="xt-actions">${rates}</span></div>
      <div class="xt-row"><span>${e(t('volume'))}</span><span class="xt-actions">${[0.4, 0.7, 1].map((v) => `<button class="xt-btn ${Math.abs(volume() - v) < 0.05 ? 'on' : ''}" data-xt-local="vol:${v}">${Math.round(v * 100)}%</button>`).join('')}</span></div>
      <div class="xt-row"><span>🎤 ${e(t('proVoice'))}<br><span class="xt-muted" style="font-size:11px">${e(t('proInfo'))}</span></span><span class="xt-actions">${b2('pro:on', t('proOn'), proOn())}${b2('pro:off', t('proOff'), !proOn())}</span></div>
      <div class="xt-row"><span>🏟️ ${e(t('ambience'))}</span><span class="xt-actions">${b2('amb:on', t('liveOn'), ambOn())}${b2('amb:off', t('liveOff'), !ambOn())}</span></div>
      <div class="xt-row"><span>📺 ${e(t('broadcastSetting'))}<br><span class="xt-muted" style="font-size:11px">${e(t('broadcastInfo'))}</span></span><span class="xt-actions"><button class="xt-btn ${S.broadcast !== false ? 'on' : ''}" data-xt-cmd="caster:settings" data-xt-args="${args({ broadcast: true })}">${e(t('liveOn'))}</button><button class="xt-btn ${S.broadcast === false ? 'on' : ''}" data-xt-cmd="caster:settings" data-xt-args="${args({ broadcast: false })}">${e(t('liveOff'))}</button><button class="xt-btn" data-xt-cmd="caster:broadcastPreview" data-xt-args="${args({})}">👁 ${e(t('preview'))}</button></span></div>
      <div class="xt-row"><span>🔴 ${e(t('liveSetting'))}</span><span class="xt-actions"><button class="xt-btn ${S.live !== false ? 'on' : ''}" data-xt-cmd="caster:settings" data-xt-args="${args({ live: true })}">${e(t('liveOn'))}</button><button class="xt-btn ${S.live === false ? 'on' : ''}" data-xt-cmd="caster:settings" data-xt-args="${args({ live: false })}">${e(t('liveOff'))}</button></span></div>
      ${S.voice ? (vs.length ? `<div class="xt-row"><span>🎙️ ${e(t('pbpVoice'))}<br><span class="xt-muted">${e(C.pbp.name)}</span></span>${sel('pbp')}</div><div class="xt-row"><span>🎧 ${e(t('colorVoice'))}<br><span class="xt-muted">${e(C.color.name)}</span></span>${sel('color')}</div>` : `<div class="xt-muted" style="margin-top:6px">${e(t('noVoices'))}</div>`) : ''}
    </div>`;
  }

  function listCard(Cs) {
    if (!Cs.list.length) return `<div class="xt-card"><h3>📺 ${e(t('series'))}</h3><div class="xt-muted">${e(t('none'))}</div></div>`;
    const rows = Cs.list.map((f) => `<div class="xt-row"${P.script && P.script.id === f.id ? ' style="background:color-mix(in srgb,var(--a1) 10%,transparent);border-radius:8px;padding:5px 6px"' : ''}><span><b>${e(f.home)}</b> ${f.hw}-${f.aw} <b>${e(f.away)}</b>${!f.watched && f.mine ? ` <span class="xt-pill good">${e(t('newTag'))}</span>` : ''}<br><span class="xt-muted">${X.fmtDate(f.date)} · ${e(f.event)}${f.stage === 'final' ? ' · ' + e(t('final')) : ''}${f.mine ? '' : ''}</span></span>
      <button class="xt-btn" data-xt-cmd="caster:script" data-xt-args="${args({ id: f.id })}">${e(f.watched ? t('again') : t('watch'))}</button></div>`).join('');
    return `<div class="xt-card"><h3>📺 ${e(t('series'))}</h3>${rows}</div>`;
  }

  function page() {
    const s = X.snap();
    const Cs = s && s.caster;
    if (!Cs) return '<div class="xt cast"><div class="xt-card xt-muted">…</div></div>';
    const C = Cs.casters;
    const main = liveCard() + (P.script ? `${board(P.script)}${casterLine(P.script, C)}${controls()}${transcript(P.script, C)}` : `<div class="xt-card xt-muted">${e(t('pick'))}</div>`);
    return `<div class="xt cast"><div class="xt-head"><div style="font-size:40px">📺</div><div class="grow"><div class="xt-h1">${e(t('title'))}</div><div class="xt-h2">${e(t('sub'))}</div><div class="xt-sub">🎙️ ${e(C.pbp.name)} · 🎧 ${e(C.color.name)}</div></div></div>
      <div class="xt-grid" style="grid-template-columns:minmax(280px,1fr) 2.2fr;align-items:start"><div>${listCard(Cs)}${settingsCard(C)}<div class="xt-muted" style="margin-top:10px;font-size:12px">${e(t('info'))}</div></div><div>${main}</div></div></div>`;
  }

  if (!document.getElementById('xt-style-cast')) {
    const st = document.createElement('style');
    st.id = 'xt-style-cast';
    st.textContent = '.xt.cast{--a1:#f472b6;--a2:#db2777;--line:rgba(244,114,182,.2)}';
    document.head.appendChild(st);
  }
  // voice pickers (a <select> change is not a click)
  document.addEventListener('change', (ev) => {
    const el = ev.target && ev.target.closest && ev.target.closest('[data-xt-voice]');
    if (!el) return;
    setPref(el.dataset.xtVoice + '.' + settings().effLang, el.value);
  }, true);
  if (synth && typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', () => redraw());

  // ---------- live (level 3): lines pushed by the main process while a real match is played ----------
  const LIVE = { on: false, lines: [], queue: [], speaking: null, score: null, blue: '', orange: '', last: 0 };
  function liveCard() {
    const recent = LIVE.last && Date.now() - LIVE.last < 15 * 60 * 1000;
    if (!recent) return `<div class="xt-card" style="margin-bottom:12px"><h3>🔴 ${e(t('liveTitle'))}</h3><div class="xt-muted">${e(t('liveIdle'))}</div></div>`;
    const rows = LIVE.lines.slice(0, 12).map((l) => `<div class="xt-row" style="align-items:flex-start"><span style="flex:1">${l.who === 'pbp' ? '🎙️' : '🎧'} ${l.pri >= 3 ? `<b>${e(l.text)}</b>` : e(l.text)}</span></div>`).join('');
    const sc = LIVE.score ? `${e(LIVE.blue)} <b style="font-size:20px">${LIVE.score[0]} - ${LIVE.score[1]}</b> ${e(LIVE.orange)}` : `${e(LIVE.blue)} vs ${e(LIVE.orange)}`;
    return `<div class="xt-card alert" style="margin-bottom:12px"><h3><span>🔴 ${e(t('liveTitle'))}</span><span>${sc}</span></h3>${rows}</div>`;
  }
  // ---------- pro voices: clips recorded for Max and Leo (src/voice, handed over by the main process) ----------
  // Files arrive one by one as base64 (window.__xtVoiceFile); they are decoded only when needed, at a low
  // sample rate, and name files are kept in a small cache: 20+ minutes of audio would not fit in memory.
  const PRO = { manifest: null, raw: {}, buffers: {}, lru: [], ctx: null, gain: null, crowd: null, srcs: null, used: {}, lastAt: {} };
  const proOn = () => getPref('pro') !== 'off';
  const ambOn = () => getPref('amb') !== 'off';
  window.__xtVoice = function (data) {
    if (!data || !data.manifest || !data.manifest.clips) return 'no data';
    PRO.manifest = data.manifest;
    PRO.raw = Object.assign(PRO.raw, data.files || {});
    PRO.buffers = {};
    PRO.lru = [];
    return Object.keys(PRO.manifest.clips).length + ' clip kinds';
  };
  window.__xtVoiceFile = function (name, b64) { PRO.raw[name] = b64; return name; };
  function proCtx() {
    if (!PRO.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      let ctx;
      try { ctx = new AC({ sampleRate: 24000 }); } catch { ctx = new AC(); }
      PRO.ctx = ctx;
      PRO.gain = ctx.createGain();
      PRO.crowd = ctx.createGain();
      PRO.crowd.gain.value = 0;
      // broadcast chain for the voices: a headset-mic band (no rumble, a bit of presence), a compressor that
      // keeps the shouts and the calm lines at one level, and a short arena room underneath
      try {
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140;
        const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3200; pres.Q.value = 0.9; pres.gain.value = 3;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9500;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -22; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18; comp.knee.value = 8;
        const dry = ctx.createGain(); dry.gain.value = 0.9;
        const wet = ctx.createGain(); wet.gain.value = 0.16;
        const room = ctx.createConvolver();
        const len = Math.round(ctx.sampleRate * 1.1);
        const ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < ctx.sampleRate * 0.012 ? 0.2 : 1); }
        room.buffer = ir;
        PRO.gain.connect(hp); hp.connect(pres); pres.connect(lp); lp.connect(comp);
        comp.connect(dry); dry.connect(ctx.destination);
        comp.connect(room); room.connect(wet); wet.connect(ctx.destination);
      } catch {
        PRO.gain.connect(ctx.destination);
      }
      PRO.crowd.connect(ctx.destination);
    }
    return PRO.ctx;
  }
  const isNameFile = (f) => /^n_|^max_names/.test(f);
  function proBuffer(f) {
    if (PRO.buffers[f]) { if (isNameFile(f)) PRO.lru = PRO.lru.filter((x) => x !== f).concat(f); return PRO.buffers[f]; }
    const b64 = PRO.raw[f];
    const ctx = proCtx();
    if (!b64 || !ctx) return Promise.resolve(null);
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    PRO.buffers[f] = ctx.decodeAudioData(u8.buffer).catch(() => null);
    // name files come and go; phrases and crowd stay decoded
    if (isNameFile(f)) {
      PRO.lru.push(f);
      if (PRO.lru.length > 6) { const drop = PRO.lru.shift(); delete PRO.buffers[drop]; }
    }
    return PRO.buffers[f];
  }
  // "a|b": the first kind that was recorded; "name:x?" is optional (skipped when that player was not
  // recorded); a take is not reused until most of the others have played
  function proResolve(key) {
    for (const k0 of String(key).split('|')) {
      const k = k0.replace(/\?$/, '');
      const list = PRO.manifest.clips[k];
      if (!list || !list.length) continue;
      const hist = PRO.used[k] || (PRO.used[k] = []);
      const keep = Math.max(0, list.length - 1);
      const free = list.map((_, i) => i).filter((i) => !hist.slice(-keep).includes(i));
      const i = free.length ? free[Math.floor(Math.random() * free.length)] : Math.floor(Math.random() * list.length);
      hist.push(i);
      if (hist.length > 12) hist.shift();
      return list[i];
    }
    return null;
  }
  // minor plays (saves, demos, touches, kickoffs, small talk) are not called again too soon: a real caster
  // does not shout "Great save!" every ten seconds
  const QUIET = { save: 20, demo: 25, AerialHit: 30, BicycleHit: 30, JuggleHit: 30, BulletHit: 30, shot: 25, kickoff: 45, assist: 30, leadColor: 40, equalColor: 40, startColor: 120, brace: 60, clockClose: 60, clockTied: 60, goalTalk: 50, saveTalk: 45, demoTalk: 60 };
  function proQuiet(l) {
    if (l.pri >= 3 || !Array.isArray(l.clip) || !l.clip.length) return false;
    const k = String(l.clip[0]).split('|').pop().replace(/\?$/, '');
    const gap = QUIET[k];
    if (!gap) return false;
    const now = Date.now();
    if (PRO.lastAt[k] && now - PRO.lastAt[k] < gap * 1000) return true;
    // kickoffs after every goal get old fast: only some of them are called
    if (k === 'kickoff' && Math.random() < 0.5) return true;
    PRO.lastAt[k] = now;
    return false;
  }
  const proActive = (lang) => proOn() && PRO.manifest && lang === PRO.manifest.lang && !!proCtx();
  function proStop() {
    const s = PRO.srcs;
    PRO.srcs = null;
    if (s) for (const x of s) { try { x.onended = null; x.stop(); } catch { /* ignore */ } }
    duck(false);
  }
  async function proPlay(l, done) {
    try {
      const ctx = proCtx();
      const parts = (Array.isArray(l.clip) ? l.clip : []).map(proResolve).filter(Boolean);
      if (!parts.length) return done();
      const bufs = await Promise.all(parts.map((p) => proBuffer(p[0])));
      if (LIVE.speaking !== l) return; // cut by a goal while decoding
      if (ctx.state === 'suspended') { try { await ctx.resume(); } catch { /* ignore */ } }
      PRO.gain.gain.value = volume();
      let at = ctx.currentTime + 0.03;
      const srcs = [];
      parts.forEach((p, i) => {
        if (!bufs[i]) return;
        const s = ctx.createBufferSource();
        s.buffer = bufs[i];
        s.connect(PRO.gain);
        const len = Math.max(0.1, p[2] - p[1]);
        s.start(at, p[1], len);
        // a name right after the shout comes in tight, like a real call
        at += len + (i === 0 && parts.length > 1 ? 0.02 : 0.08);
        srcs.push(s);
      });
      if (!srcs.length) return done();
      PRO.srcs = srcs;
      duck(true);
      srcs[srcs.length - 1].onended = () => { if (PRO.srcs === srcs) { PRO.srcs = null; duck(false); } done(); };
    } catch {
      done();
    }
  }

  // ---------- crowd: a bed that is always there, chants that come and go, and reactions that build ----------
  const AMB = { on: false, bed: null, chant: null, bedG: null, chantG: null, fx: [], timer: null, last: 0, ducked: false };
  const ambVol = () => volume() * 0.85;
  function ramp(param, to, secs) {
    const t = PRO.ctx.currentTime;
    try { param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(to, t + Math.max(0.05, secs)); } catch { param.value = to; }
  }
  function duck(on) {
    if (!AMB.on || !PRO.crowd || AMB.ducked === on) return;
    AMB.ducked = on;
    // the crowd steps back a little while someone is talking, then comes back
    ramp(PRO.crowd.gain, ambVol() * (on ? 0.6 : 1), on ? 0.25 : 1.2);
  }
  function ambFile(k) { const a = PRO.manifest && PRO.manifest.amb && PRO.manifest.amb[k]; return Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a; }
  async function loopSrc(k, gainNode) {
    const f = ambFile(k);
    const buf = f && await proBuffer(f);
    if (!buf || !AMB.on) return null;
    const s = PRO.ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    s.connect(gainNode);
    s.start(PRO.ctx.currentTime + 0.05, Math.random() * Math.max(0, buf.duration - 1));
    return s;
  }
  async function ambStart() {
    if (AMB.on || !ambOn() || !PRO.manifest || !PRO.manifest.amb || !proCtx()) return;
    const ctx = PRO.ctx;
    AMB.on = true;
    AMB.bedG = ctx.createGain(); AMB.bedG.gain.value = 0; AMB.bedG.connect(PRO.crowd);
    AMB.chantG = ctx.createGain(); AMB.chantG.gain.value = 0; AMB.chantG.connect(PRO.crowd);
    ramp(PRO.crowd.gain, ambVol(), 0.5);
    AMB.bed = await loopSrc('bed', AMB.bedG);
    AMB.chant = await loopSrc('chant', AMB.chantG);
    if (!AMB.on) return;
    ramp(AMB.bedG.gain, 0.32, 5); // fade the arena in
    // every so often the fans start a chant, it swells, and it dies down again
    const swell = () => {
      if (!AMB.on) return;
      if (AMB.chantG) { ramp(AMB.chantG.gain, 0.28 + Math.random() * 0.12, 4); setTimeout(() => { if (AMB.on && AMB.chantG) ramp(AMB.chantG.gain, 0, 6); }, 9000 + Math.random() * 6000); }
      AMB.timer = setTimeout(swell, 35000 + Math.random() * 40000);
    };
    AMB.timer = setTimeout(swell, 12000 + Math.random() * 15000);
  }
  function ambStop(secs) {
    if (!AMB.on) return;
    AMB.on = false;
    if (AMB.timer) clearTimeout(AMB.timer);
    const nodes = [AMB.bed, AMB.chant, ...AMB.fx];
    try { ramp(PRO.crowd.gain, 0, secs || 6); } catch { /* ignore */ }
    setTimeout(() => { for (const n of nodes) { try { if (n) n.stop(); } catch { /* ignore */ } } }, (secs || 6) * 1000 + 300);
    AMB.bed = null; AMB.chant = null; AMB.fx = [];
  }
  // a reaction (goal roar, save "ooh", end celebration, tension) that rises from nothing to its peak and
  // fades out on its own: never a sound that jumps in and stops dead
  async function ambFx(k, peak, rise, hold, fall) {
    if (!AMB.on) return;
    const f = ambFile(k);
    const buf = f && await proBuffer(f);
    if (!buf || !AMB.on) return;
    const ctx = PRO.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(PRO.crowd);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.connect(g);
    const t = ctx.currentTime + 0.02;
    const len = Math.min(buf.duration, rise + hold + fall);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak * 0.35, t + rise * 0.5);
    g.gain.linearRampToValueAtTime(peak, t + rise);
    g.gain.setValueAtTime(peak, t + Math.max(rise, len - fall));
    g.gain.linearRampToValueAtTime(0.0001, t + len);
    s.start(t, 0, len + 0.05);
    AMB.fx.push(s);
    s.onended = () => { AMB.fx = AMB.fx.filter((x) => x !== s); try { g.disconnect(); } catch { /* ignore */ } };
    // the whole arena lifts with it, then settles back
    if (AMB.bedG) { ramp(AMB.bedG.gain, 0.5, rise); setTimeout(() => { if (AMB.on && AMB.bedG) ramp(AMB.bedG.gain, 0.32, fall + 2); }, (rise + hold) * 1000); }
  }
  function chantAfterGoal() {
    if (!AMB.on || !AMB.chantG) return;
    ramp(AMB.chantG.gain, 0.35, 3);
    setTimeout(() => { if (AMB.on && AMB.chantG) ramp(AMB.chantG.gain, 0, 6); }, 9000);
  }
  function ambEvent(p) {
    if (!ambOn() || !PRO.manifest || !PRO.manifest.amb || !proCtx()) return;
    AMB.last = Date.now();
    if (!AMB.on) ambStart();
    switch (p.event) {
      case 'goal':
        ambFx('roar', 0.95, 1.4, 4.5, 4.5);
        setTimeout(chantAfterGoal, 6000);
        break;
      case 'save':
        if (p.epic) ambFx('ooh', 0.75, 0.5, 1.6, 3);
        else if (Math.random() < 0.4) ambFx('ooh', 0.4, 0.6, 1, 2.5);
        break;
      case 'clock':
        if (p.left === 10) ambFx('tension', 0.6, 2, 5, 3);
        break;
      case 'overtime':
        ambFx('tension', 0.7, 2.5, 6, 3.5);
        break;
      case 'end':
        ambFx('endcheer', 0.85, 1.5, 6, 4.5);
        setTimeout(() => ambStop(8), 9000);
        break;
      default:
        break;
    }
  }
  // the match window closed or the Hub went back to menus: let the arena fade out
  setInterval(() => { if (AMB.on && Date.now() - AMB.last > 180000) ambStop(6); }, 15000);

  function liveNext() {
    if (LIVE.speaking) return;
    const now = Date.now();
    // flavour that is too late is dropped; goals and results never are
    while (LIVE.queue.length) {
      const l = LIVE.queue[0];
      const age = now - l.at;
      if ((l.pri <= 1 && age > 4000) || (l.pri === 2 && age > 9000)) { LIVE.queue.shift(); continue; }
      break;
    }
    const l = LIVE.queue.shift();
    if (!l) return;
    const S = settings();
    if (S.voice && proActive(l.lang)) {
      // pro voices: the recorded clip, or nothing (a Windows voice in between would sound out of place)
      LIVE.speaking = l;
      const fin = () => { if (LIVE.speaking === l) { LIVE.speaking = null; liveNext(); } };
      if (l.clip && l.clip.length && !proQuiet(l)) proPlay(l, fin); else setTimeout(fin, 50);
      return;
    }
    const v = S.voice && synth ? voiceFor(l.who, l.lang) : null;
    if (!v) { LIVE.speaking = l; setTimeout(() => { LIVE.speaking = null; liveNext(); }, 300); return; }
    const u = new SpeechSynthesisUtterance(l.text.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, ''));
    u.voice = v; u.lang = v.lang;
    u.rate = (Number(S.rate) || 1.1) * (l.pri >= 3 ? 1.15 : 1.08);
    u.pitch = l.who === 'pbp' ? (l.pri >= 3 ? 1.3 : 1.08) : 0.95;
    u.volume = volume();
    const done = () => { if (LIVE.speaking === l) { LIVE.speaking = null; liveNext(); } };
    u.onend = done; u.onerror = done;
    LIVE.speaking = l;
    synth.speak(u);
  }
  window.__xtLive = function (payload) {
    if (!payload || !Array.isArray(payload.lines)) return;
    // Rocket League closed or the match was left: everything goes quiet
    if (payload.event === 'idle') { LIVE.queue = []; LIVE.speaking = null; proStop(); if (synth) { try { synth.cancel(); } catch { /* ignore */ } } ambStop(3); return; }
    try { if (PRO.manifest && payload.lang === PRO.manifest.lang && proOn()) ambEvent(payload); } catch { /* the crowd is optional */ }
    // a live match takes over from a replay
    if (P.playing) { P.playing = false; clearTimers(); }
    const now = Date.now();
    LIVE.last = now;
    if (payload.blue) LIVE.blue = payload.blue;
    if (payload.orange) LIVE.orange = payload.orange;
    if (payload.score) LIVE.score = payload.score;
    if (payload.event === 'start') LIVE.score = [0, 0];
    for (const ln of payload.lines) {
      const l = Object.assign({ at: now, lang: payload.lang }, ln);
      LIVE.lines.unshift(l);
      if (l.pri >= 3) {
        // must-say: cut the current flavour line and anything minor still waiting
        LIVE.queue = LIVE.queue.filter((q) => q.pri >= 3);
        if (LIVE.speaking && LIVE.speaking.pri < 3) { LIVE.speaking = null; proStop(); if (synth) { try { synth.cancel(); } catch { /* ignore */ } } }
        LIVE.queue.push(l);
      } else if (l.pri === 2 || LIVE.queue.length < 2) LIVE.queue.push(l);
    }
    if (LIVE.lines.length > 60) LIVE.lines.length = 60;
    liveNext();
    redraw();
  };

  X.addTab({
    id: TAB,
    icon: '📺',
    color: '#f472b6',
    label: () => t('tab'),
    visible: () => X.on('caster'),
    badge: () => { const s = X.snap(); return (s && s.caster && s.caster.unseen) || 0; },
    render: page,
    local(v) {
      if (v.startsWith('vol:')) { setPref('volume', v.slice(4)); redraw(); return; }
      if (v.startsWith('amb:')) { setPref('amb', v.slice(4)); if (v === 'amb:off') ambStop(2); redraw(); return; }
      if (v.startsWith('pro:')) { setPref('pro', v.slice(4)); if (v === 'pro:off') proStop(); redraw(); return; }
      if (v === 'play') play(); else if (v === 'pause') pause(); else if (v === 'stop') stop(); else if (v === 'skip') skip(); else if (v === 'finish') finish();
    },
    beforeCmd(m, op, a) { if (m === 'caster' && op === 'script') { P.playing = false; clearTimers(); } return a; },
    afterCmd(m, op, a, res) {
      if (m === 'caster' && op === 'script' && res && res.script) { P.script = res.script; P.i = -1; play(); }
    },
  });
  try { render(); } catch { }
})();
