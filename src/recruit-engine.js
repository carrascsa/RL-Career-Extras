'use strict';
// Regional recruitment: top players from the big regions (EU, NA) ask for a lot more to move to a smaller region,
// and the very best may refuse outright. Players from the smaller regions are keener to move up to EU/NA.
// It acts on the Hub's own contract talks: the player's wage demand stored in state.negotiations, which the
// Hub's contract screen shows and its acceptance check uses.
const U = require('./util');

const ID = 'recruit';
const MAJOR = new Set(['eu', 'na']);
const REGION = { eu: 'EU', na: 'NA', sam: 'SAM', mena: 'MENA', oce: 'OCE', apac: 'APAC', ssa: 'SSA' };

// how a player feels about moving from his home region to the club's
function stance(state, p, toRegion, homeOf) {
  const home = String((homeOf && homeOf(state, p)) || p.home || '').toLowerCase();
  const to = String(toRegion || '').toLowerCase();
  if (!home || !to || home === to) return { mult: 1, refuse: false, home, to };
  const rating = U.num(p.rating);
  if (MAJOR.has(home) && !MAJOR.has(to)) {
    // stepping down: the better the player, the higher the price and the likelier a flat no
    const r = U.dayRng(state, ID, 'season' + (state.season || 1), 'p' + p.id);
    let mult = 1; let refuseChance = 0;
    if (rating >= 92) { mult = 2.0; refuseChance = 0.45; } else if (rating >= 88) { mult = 1.7; refuseChance = 0.25; } else if (rating >= 84) { mult = 1.45; refuseChance = 0.10; } else if (rating >= 78) { mult = 1.2; }
    return { mult, refuse: r() < refuseChance, home, to };
  }
  if (!MAJOR.has(home) && MAJOR.has(to)) return { mult: 0.9, refuse: false, home, to }; // moving up: keen
  return { mult: 1, refuse: false, home, to };
}

function on(state) { const off = state && state.xtra && state.xtra.mods && state.xtra.mods.off; return !(off && off[ID]); }
function regionOfUser(state) { const t = U.teamOf(state, state.userTeamId); return t && t.region; }

function wrapEngine(engine, api) {
  if (api && typeof api.lang === 'function') LANG = api.lang;
  const homeOf = typeof engine.homeOf === 'function' ? engine.homeOf.bind(engine) : null;

  const origInfo = engine.contractInfo;
  if (typeof origInfo === 'function' && !origInfo.__xtRecruit) {
    const w = function xtContractInfo(state, kind, pid, ...rest) {
      const out = origInfo.call(this, state, kind, pid, ...rest);
      try {
        if (!on(state) || (kind !== 'sign' && kind !== 'buy') || !out || !out.neg || out.error) return out;
        const p = U.playerOf(state, Number(pid));
        if (!p) return out;
        const st = stance(state, p, regionOfUser(state), homeOf);
        const neg = out.neg;
        if (!neg.xtRegion) {
          neg.xtRegion = { mult: st.mult, refuse: st.refuse, home: st.home, to: st.to };
          if (st.mult !== 1) neg.demand = Math.round(U.num(neg.demand) * st.mult);
          if (st.refuse) neg.dead = true;
          // the Hub's contract screen shows the new demand but not why: say it in the inbox once
          if (st.refuse || st.mult > 1) {
            const es = LANG() === 'es';
            U.pushInbox(state, st.refuse ? (es ? `${p.name} no se muda` : `${p.name} won't move`) : (es ? `${p.name} pide más` : `${p.name} wants more`),
              (st.refuse ? refuseText(p, neg.xtRegion) : premiumText(p, neg.xtRegion)) + ' ' + (es ? 'Los jugadores top de EU y NA cobran más (o directamente no aceptan) para jugar en regiones más chicas.' : 'Top EU and NA players ask for more (or simply say no) to play in smaller regions.'), null);
          }
        }
        out.demand = neg.demand;
        out.dead = !!neg.dead;
        if (neg.xtRegion.refuse) out.regionNote = refuseText(p, neg.xtRegion);
        else if (neg.xtRegion.mult > 1) out.regionNote = premiumText(p, neg.xtRegion);
      } catch (e) { api.log('recruit: ' + e.message); }
      return out;
    };
    w.__xtRecruit = true;
    engine.contractInfo = w;
  }

  const origTry = engine.attemptContract;
  if (typeof origTry === 'function' && !origTry.__xtRecruit) {
    const w = function xtAttemptContract(state, kind, pid, ...rest) {
      try {
        if (on(state) && (kind === 'sign' || kind === 'buy')) {
          // a player who said no to the region does not sign, whatever the offer
          const no = Object.entries(state.negotiations || {}).find(([k, n]) => k.startsWith(kind + ':' + pid + ':') && n && n.xtRegion && n.xtRegion.refuse);
          if (no) return { ok: false, error: refuseText(U.playerOf(state, Number(pid)), no[1].xtRegion) };
        }
      } catch (e) { api.log('recruit: ' + e.message); }
      return origTry.call(this, state, kind, pid, ...rest);
    };
    w.__xtRecruit = true;
    engine.attemptContract = w;
  }
}

let LANG = () => 'en';
function refuseText(p, x) {
  const name = p ? p.name : '';
  const to = REGION[x.to] || String(x.to).toUpperCase();
  return LANG() === 'es' ? `${name} no quiere irse a jugar a ${to}.` : `${name} is not interested in moving to ${to}.`;
}
function premiumText(p, x) {
  const name = p ? p.name : '';
  const to = REGION[x.to] || String(x.to).toUpperCase();
  const pct = Math.round((x.mult - 1) * 100);
  return LANG() === 'es' ? `${name} pide un ${pct}% más para mudarse a ${to}.` : `${name} wants ${pct}% more to move to ${to}.`;
}

module.exports = { id: ID, wrapEngine, _test: { stance } };
