// RL Career Extras — shared renderer helpers + tab registry. Injected before the feature UIs.
(function () {
  if (window.__xtCommon) return;
  if (typeof topbarHtml !== 'function' || typeof tabInnerHtml !== 'function' || typeof render !== 'function') return;
  window.__xtCommon = true;

  const tabs = [];
  const views = {};
  const lang = () => (typeof S !== 'undefined' && S && String(S.lang || '').startsWith('es') ? 'es' : 'en');
  const esc0 = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const e = (v) => (typeof esc === 'function' ? esc(v) : esc0(v));

  function money(n) {
    const v = Math.round(Number(n) || 0);
    const a = Math.abs(v);
    const s = a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M' : a >= 1e3 ? (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(a);
    return (v < 0 ? '-$' : '$') + s;
  }

  function tr(dict, key, params) {
    const d = dict[lang()] || dict.en;
    let s = d[key] != null ? d[key] : dict.en[key] != null ? dict.en[key] : key;
    if (params) s = String(s).replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : ''));
    return s;
  }

  // ---------- window preferences: theme and pop-ups (local to this PC) ----------
  const pref = (k) => { try { return window.localStorage.getItem('xt.' + k) || ''; } catch { return ''; } };
  const setPref = (k, v) => { try { window.localStorage.setItem('xt.' + k, v); } catch { /* ignore */ } };
  // RL Career Hub paints everything from the colour tokens in :root, so a theme only re-tunes those.
  const THEMES = {
    night: { label: { en: 'Night shift', es: 'Turno noche' }, swatch: '#19b5fe', ground: '#0d1117', panel: '#161b22', panel2: '#1f2630', raise: '#2a3341', raiseLine: '#3b4757', line: '#30363d', dim: '#9aa7b8', accent: '#19b5fe', accentDeep: '#0e8fd1', blue: '#1f3a5f', plate: '#dfe6ee', plateInk: '#0d1117', plateDim: '#3b4757' },
    carbon: { label: { en: 'Carbon', es: 'Carbono' }, swatch: '#ff7a1a', ground: '#0b0b0c', panel: '#18181b', panel2: '#222226', raise: '#2c2c31', raiseLine: '#44444b', line: '#34343a', dim: '#b4b4bb', accent: '#ff7a1a', accentDeep: '#e0610a', blue: '#3a2a1f', plate: '#ece7e1', plateInk: '#18181b', plateDim: '#44444b' },
    pitch: { label: { en: 'Pitch green', es: 'Verde cancha' }, swatch: '#2fd18a', ground: '#0b1612', panel: '#12241d', panel2: '#183026', raise: '#1f3d31', raiseLine: '#2f5a48', line: '#24463a', dim: '#a9c7b9', accent: '#2fd18a', accentDeep: '#1fae6f', blue: '#1b3a2e', plate: '#e1efe8', plateInk: '#0b1612', plateDim: '#2f5a48' },
    crimson: { label: { en: 'Crimson', es: 'Carmesí' }, swatch: '#ff3b5c', ground: '#160b0e', panel: '#241216', panel2: '#2f171d', raise: '#3d1e26', raiseLine: '#5a2b37', line: '#46222c', dim: '#d2aeb6', accent: '#ff3b5c', accentDeep: '#d81f40', blue: '#3a1a24', plate: '#f1e2e6', plateInk: '#160b0e', plateDim: '#5a2b37' },
    trophy: { label: { en: 'Trophy gold', es: 'Oro de trofeo' }, swatch: '#f5c542', ground: '#12100a', panel: '#1e1a10', panel2: '#282214', raise: '#342c1a', raiseLine: '#514526', line: '#3c3320', dim: '#d6c79c', accent: '#f5c542', accentDeep: '#d9a91c', blue: '#33291a', plate: '#f3ead2', plateInk: '#12100a', plateDim: '#514526' },
  };
  function themeCss(T) {
    return `:root{--ground:${T.ground}!important;--navy-0:${T.ground}!important;--navy-1:${T.panel}!important;--navy-2:${T.panel2}!important;--navy-3:${T.raise}!important;`
      + `--panel:${T.panel}!important;--panel-2:${T.panel2}!important;--card:${T.panel}!important;--raise:${T.raise}!important;--raise-line:${T.raiseLine}!important;--line:${T.line}!important;`
      + `--text-dim:${T.dim}!important;--accent:${T.accent}!important;--accent-deep:${T.accentDeep}!important;--tab-line:${T.accentDeep}!important;--blue:${T.blue}!important;`
      + `--plate:${T.plate}!important;--plate-ink:${T.plateInk}!important;--plate-dim:${T.plateDim}!important}`;
  }
  function applyPrefs() {
    const id = 'xt-theme';
    let st = document.getElementById(id);
    const T = THEMES[pref('theme')];
    const css = (T ? themeCss(T) : '') + (pref('hubToasts') === 'off' ? '#toast-root{display:none!important}' : '') + (pref('matchCalm') === 'on' ? '*{animation-play-state:paused!important;transition:none!important}' : '');
    if (!css) { if (st) st.remove(); return; }
    if (!st) { st = document.createElement('style'); st.id = id; document.head.appendChild(st); }
    st.textContent = css;
  }
  // performance mode: the Hub process asks the window to stop animating while you play
  window.__xtMatchCalm = (on) => { setPref('matchCalm', on ? 'on' : ''); applyPrefs(); return on; };
  try { applyPrefs(); } catch { /* document not ready */ }

  function toast(icon, title, sub, bad) {
    if (pref('toasts') === 'off' && !bad) return;
    const el = document.createElement('div');
    el.className = 'xt-toast' + (bad ? ' bad' : '');
    el.innerHTML = `<div class="i">${icon}</div><div><div class="k">${e(title)}</div>${sub ? `<div class="n">${e(sub)}</div>` : ''}</div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 3600);
  }

  let busy = false;
  let freshView = false; // a sub-view switch starts at the top
  // RLC Hub Addon Manager: commands go through its action channel to the rlce-lib addon
  const viaAddonManager = () => typeof window.hubPlus === 'object' && window.hubPlus && typeof window.hubPlus.call === 'function';
  async function callLib(action, payload) {
    const r = await window.hubPlus.call('rlce-lib', action, payload);
    if (r && r.snapshot) S = r.snapshot;
    if (!r || !r.ok) return { ok: false, error: (r && r.error) || 'RLC Hub Addon Manager refused the action.' };
    const out = Object.assign({}, r.result || {});
    delete out.save;
    if (r.snapshot) out.career = r.snapshot.career;
    return out;
  }
  async function cmd(m, op, args) {
    if (busy) return null;
    if (!viaAddonManager() && (!window.hub || typeof window.hub.placeBet !== 'function')) return null;
    busy = true;
    try {
      const payload = Object.assign({ m, op, lang: lang() }, args || {});
      if (viaAddonManager()) {
        const res = await callLib('cmd', payload);
        if (res && res.ok === false) toast('⚠️', lang() === 'es' ? 'No se pudo' : 'Could not do that', res.error || '', true);
        render();
        return res;
      }
      const res = await window.hub.placeBet({ kind: 'xt:' + JSON.stringify(payload), ref: 0, teamId: 0, stake: 0 });
      if (res && res.ok === false) toast('⚠️', lang() === 'es' ? 'No se pudo' : 'Could not do that', res.error || '', true);
      if (res && res.career !== undefined) { S = res; render(); }
      return res;
    } catch (err) {
      toast('⚠️', 'Career Extras', String(err && err.message || err), true);
      return null;
    } finally {
      busy = false;
    }
  }

  const X = window.__xt = {
    lang, e, money, tr, toast, cmd, tabs, pref, setPref, applyPrefs, THEMES, viaAddonManager, callLib,
    snap: () => (typeof S !== 'undefined' && S && S.xtra) || null,
    // mod manager: is this module switched on in the current career?
    on(id) { const s = X.snap(); const m = s && Array.isArray(s.mods) ? s.mods.find((x) => x.id === id) : null; return !m || m.on !== false; },
    anyOn(ids) { return ids.some((id) => X.on(id)); },
    view: (tabId, def) => views[tabId] || def,
    setView: (tabId, v) => { views[tabId] = v; freshView = true; render(); },
    addTab(def) { if (!tabs.find((t) => t.id === def.id)) tabs.push(def); },
    bar(pct, cls) { return `<div class="xt-bar ${cls || ''}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`; },
    fmtDate(d) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? (lang() === 'es' ? `${m[3]}/${m[2]}/${m[1]}` : `${m[1]}-${m[2]}-${m[3]}`) : '—'; },
  };

  const CSS = `
  .content > .xt,.content > .hof{height:100%;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:8px}
  /* our tab buttons are a bit narrower so the Hub's own tabs still fit */
  .xt-tb{padding-left:9px!important;padding-right:9px!important;letter-spacing:.03em!important}
  @media (max-width:1500px){.xt-tb{padding-left:7px!important;padding-right:7px!important;font-size:.92em!important}}
  .xt{--a1:#5eead4;--a2:#0d9488;--card:rgba(14,20,32,.88);--line:rgba(94,234,212,.18);color:#e8eef7;padding:6px 2px 30px}
  .xt.acad{--a1:#86efac;--a2:#16a34a;--line:rgba(134,239,172,.2)}
  .xt-head{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:14px;background:linear-gradient(120deg,color-mix(in srgb,var(--a2) 30%,transparent),rgba(14,20,32,.92) 55%);border:1px solid var(--line);margin-bottom:14px;flex-wrap:wrap}
  .xt-head .grow{flex:1;min-width:220px}
  .xt-h1{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--a1);font-weight:800}
  .xt-h2{font-size:24px;font-weight:900;line-height:1.15}
  .xt-sub{font-size:12px;opacity:.7;margin-top:3px}
  .xt-nav{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}
  .xt-nav button,.xt-btn{background:var(--card);border:1px solid var(--line);color:#d9e2ee;padding:7px 14px;border-radius:999px;cursor:pointer;font:inherit;font-size:13px;font-weight:700}
  .xt-nav button.on,.xt-btn.on{background:linear-gradient(180deg,var(--a1),var(--a2));color:#06201c;border-color:transparent}
  .xt-btn{border-radius:8px;padding:5px 11px;font-size:12px;color:var(--a1);border-color:color-mix(in srgb,var(--a2) 70%,transparent);background:transparent}
  .xt-btn:hover{background:color-mix(in srgb,var(--a1) 14%,transparent)}
  .xt-btn.on,.xt-btn.on:hover{background:linear-gradient(180deg,var(--a1),var(--a2));color:#06201c;border-color:transparent}
  .xt-btn.on:hover{filter:brightness(1.1)}
  .xt-btn.warn{color:#fca5a5;border-color:rgba(252,165,165,.45)}
  .xt-btn[disabled]{opacity:.4;cursor:not-allowed}
  .xt-grid{display:grid;gap:12px}
  .xt-two{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}
  .xt-three{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
  .xt-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
  .xt-card h3{margin:0 0 10px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--a1);display:flex;justify-content:space-between;gap:8px;align-items:center}
  .xt-card.alert{border-color:color-mix(in srgb,var(--a1) 70%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--a1) 25%,transparent),0 10px 30px rgba(0,0,0,.35)}
  .xt-muted{opacity:.62;font-size:13px}
  .xt-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:9px;border:1px solid rgba(255,255,255,.2);margin-right:4px}
  .xt-pill.good{border-color:#4ade80;color:#4ade80}.xt-pill.bad{border-color:#f87171;color:#f87171}.xt-pill.acc{border-color:var(--a1);color:var(--a1)}
  .xt-table{width:100%;border-collapse:collapse;font-size:13px}
  .xt-table th{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;opacity:.6;padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
  .xt-table td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:middle}
  .xt-table td.num,.xt-table th.num{text-align:right}
  .xt-table tr.me td{color:var(--a1);font-weight:800}
  .xt-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
  .xt-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden;min-width:60px}
  .xt-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--a2),var(--a1))}
  .xt-bar.red i{background:linear-gradient(90deg,#b91c1c,#f87171)}
  .xt-stat{display:flex;flex-direction:column;gap:2px}
  .xt-stat .v{font-size:22px;font-weight:900}
  .xt-stat .k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.6}
  .xt-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,.04)}
  .xt-row:last-child{border-bottom:0}
  .xt-q{margin:10px 0 14px}
  .xt-q .qt{font-weight:800;margin-bottom:7px}
  .xt-opt{display:block;width:100%;text-align:left;margin:5px 0;padding:8px 11px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:#e8eef7;cursor:pointer;font:inherit;font-size:13px}
  .xt-opt:hover{border-color:var(--a2)}
  .xt-opt.on{border-color:var(--a1);background:color-mix(in srgb,var(--a1) 14%,transparent)}
  .xt-opt .tone{font-size:10px;letter-spacing:.12em;text-transform:uppercase;opacity:.6;display:block;margin-bottom:2px}
  .xt-chip{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:5px;font-size:11px;font-weight:900;margin-right:3px}
  .xt-chip.w{background:rgba(74,222,128,.2);color:#4ade80}.xt-chip.l{background:rgba(248,113,113,.2);color:#f87171}
  .xt-tabbadge{display:inline-block;min-width:16px;padding:0 4px;margin-left:5px;border-radius:8px;background:#e5484d;color:#fff;font-size:10px;line-height:16px}
  .xt-toast{position:fixed;right:22px;bottom:92px;z-index:99999;display:flex;gap:12px;align-items:center;padding:12px 16px;border-radius:12px;background:linear-gradient(120deg,#08201d,#0e1420);border:1px solid #5eead4;color:#fff;box-shadow:0 12px 30px rgba(0,0,0,.55);transform:translateY(20px);opacity:0;transition:all .3s;max-width:420px}
  .xt-toast.bad{border-color:#f87171;background:linear-gradient(120deg,#2a0b0b,#0e1420)}
  .xt-toast.in{transform:none;opacity:1}
  .xt-toast .i{font-size:24px}.xt-toast .k{font-weight:900}.xt-toast .n{font-size:12px;opacity:.8}
  `;
  if (!document.getElementById('xt-style')) {
    const st = document.createElement('style');
    st.id = 'xt-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ---------- hooks ----------
  const origTop = topbarHtml;
  topbarHtml = function () {
    const html = origTop.apply(this, arguments);
    if (!X.snap() || !tabs.length) return html;
    const btns = tabs.filter((t) => !t.visible || t.visible()).map((t) => {
      const n = t.badge ? t.badge() : 0;
      return `<button class="xt-tb ${tab === t.id ? 'active' : ''}" title="${e(t.label())}" data-action="tab" data-tab="${t.id}" style="color:${t.color || '#5eead4'}">${t.icon} ${e(t.label())}${n ? `<span class="xt-tabbadge">${n}</span>` : ''}</button>`;
    }).join('');
    const setup = /<button[^>]*data-tab="setup"[^>]*>[\s\S]*?<\/button>/;
    if (setup.test(html)) return html.replace(setup, (m) => btns + m);
    const all = html.match(/<button[^>]*data-tab="[^"]+"[^>]*>[\s\S]*?<\/button>/g);
    if (all && all.length) {
      const last = all[all.length - 1];
      const idx = html.lastIndexOf(last) + last.length;
      return html.slice(0, idx) + btns + html.slice(idx);
    }
    return html;
  };

  // The Hub's .content clips (overflow:hidden); our pages scroll inside themselves. Every render
  // rebuilds the DOM, so keep the scroll position while staying on the same tab.
  const SCROLLER = '.content > .xt, .content > .hof';
  // (the Hub changes `tab` before calling render, so remember which tab the DOM belongs to)
  const origRender = render;
  let shownTab = null;
  render = function () {
    const el = document.querySelector(SCROLLER);
    const top = el && shownTab === tab && !freshView ? el.scrollTop : 0;
    freshView = false;
    const out = origRender.apply(this, arguments);
    shownTab = tab;
    if (top) {
      const n = document.querySelector(SCROLLER);
      if (n) n.scrollTop = top;
    }
    return out;
  };

  const origInner = tabInnerHtml;
  tabInnerHtml = function () {
    const def = tabs.find((t) => t.id === tab);
    if (!def) return origInner.apply(this, arguments);
    try { return def.render(); } catch (err) { console.error('[Career Extras]', err); return '<div class="xt"><div class="xt-card">Career Extras error: ' + e(err.message) + '</div></div>'; }
  };

  // data-xt-view="tabId:view"  |  data-xt-cmd="module:op" data-xt-args='{"id":..}'  [data-xt-confirm="text"]
  document.addEventListener('click', (ev) => {
    const el = ev.target && ev.target.closest && ev.target.closest('[data-xt-view],[data-xt-cmd],[data-xt-local]');
    if (!el) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (el.hasAttribute('disabled')) return;
    if (el.dataset.xtView) {
      const [tid, v] = el.dataset.xtView.split(':');
      X.setView(tid, v);
      return;
    }
    if (el.dataset.xtLocal) {
      const def = tabs.find((t) => t.id === tab);
      if (def && def.local) def.local(el.dataset.xtLocal, el);
      return;
    }
    if (el.dataset.xtConfirm && !window.confirm(el.dataset.xtConfirm)) return;
    const [m, op] = el.dataset.xtCmd.split(':');
    let args = {};
    try { args = el.dataset.xtArgs ? JSON.parse(el.dataset.xtArgs) : {}; } catch { args = {}; }
    const def = tabs.find((t) => t.id === tab);
    if (def && def.beforeCmd) args = def.beforeCmd(m, op, args) || args;
    cmd(m, op, args).then((res) => { if (res && res.ok !== false && def && def.afterCmd) def.afterCmd(m, op, args, res); });
  }, true);

  if (typeof S !== 'undefined' && S && S.career && !S.xtra && window.hub && typeof window.hub.getState === 'function') {
    window.hub.getState().then((ns) => { if (ns && ns.career !== undefined) { S = ns; render(); } }).catch(() => {});
  }
})();
