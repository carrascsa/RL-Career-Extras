'use strict';
// Performance mode while a real match is on: Rocket League gets an above-normal CPU priority and the Hub window
// stops animating in the background. Everything goes back to normal when the match is left. Main process only.
const os = require('os');
const { execFile } = require('child_process');

function rlPids() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/FI', 'IMAGENAME eq RocketLeague.exe', '/FO', 'CSV', '/NH'], { windowsHide: true }, (err, out) => {
      if (err || !out) return resolve([]);
      resolve(String(out).split(/\r?\n/).map((l) => /^"RocketLeague\.exe","(\d+)"/i.exec(l)).filter(Boolean).map((m) => Number(m[1])));
    });
  });
}

function createPerf(opts = {}) {
  const log = opts.log || (() => {});
  const enabled = opts.enabled || (() => true);
  const calm = opts.calm || (() => {});
  let active = false;
  let boosted = [];

  async function set(on) {
    if (on === active) return;
    if (on && !enabled()) return;
    active = on;
    try { calm(on); } catch { /* the window may be gone */ }
    if (on) {
      const pids = await rlPids();
      boosted = [];
      for (const pid of pids) {
        try { os.setPriority(pid, os.constants.priority.PRIORITY_ABOVE_NORMAL); boosted.push(pid); } catch (e) { log('perf: priority for ' + pid + ' refused: ' + e.message); }
      }
      log('perf: match mode on' + (boosted.length ? ' (Rocket League priority above normal)' : ''));
    } else {
      for (const pid of boosted) { try { os.setPriority(pid, os.constants.priority.PRIORITY_NORMAL); } catch { /* already closed */ } }
      boosted = [];
      log('perf: match mode off');
    }
  }
  return { set, isActive: () => active };
}

module.exports = { createPerf };
