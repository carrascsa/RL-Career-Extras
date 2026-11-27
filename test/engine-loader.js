'use strict';
// Extracts engine/** and data/** from the Hub's app.asar (read-only) into a temp folder and loads engine/league.js.
const fs = require('fs');
const os = require('os');
const path = require('path');

function findAsar() {
  const cands = [
    process.env.RLXT_ASAR,
    path.join(__dirname, '..', '..', 'resources', 'app.asar'),
    'C:\\Program Files\\RL Career Hub\\resources\\app.asar',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'RL Career Hub', 'resources', 'app.asar'),
  ].filter(Boolean);
  return cands.find((p) => fs.existsSync(p)) || null;
}

function loadEngine() {
  const asar = findAsar();
  if (!asar) throw new Error('app.asar not found (set RLXT_ASAR)');
  const stat = fs.statSync(asar);
  const out = path.join(os.tmpdir(), 'rlxt-engine2-' + stat.size + '-' + Math.round(stat.mtimeMs));
  if (!fs.existsSync(path.join(out, 'engine', 'league.js'))) {
    const fd = fs.openSync(asar, 'r');
    try {
      const h = Buffer.alloc(16);
      fs.readSync(fd, h, 0, 16, 0);
      const headerSize = h.readUInt32LE(4);
      const jsonSize = h.readUInt32LE(12);
      const jb = Buffer.alloc(jsonSize);
      fs.readSync(fd, jb, 0, jsonSize, 16);
      const header = JSON.parse(jb.toString('utf8'));
      const base = 8 + headerSize;
      (function walk(node, pre) {
        for (const [name, n] of Object.entries(node.files || {})) {
          const p = pre ? pre + '/' + name : name;
          if (n.files) { walk(n, p); continue; }
          if (/^node_modules\//.test(p) || n.unpacked || !/\.(js|json)$/.test(p)) continue;
          const buf = Buffer.alloc(n.size);
          fs.readSync(fd, buf, 0, n.size, base + Number(n.offset));
          const dst = path.join(out, p);
          fs.mkdirSync(path.dirname(dst), { recursive: true });
          fs.writeFileSync(dst, buf);
        }
      })(header, '');
    } finally {
      fs.closeSync(fd);
    }
  }
  return require(path.join(out, 'engine', 'league.js'));
}

module.exports = { loadEngine, findAsar };
