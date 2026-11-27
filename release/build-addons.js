'use strict';
// Builds RL Career Extras as addons for RLC Hub Addon Manager:
//   node release/build-addons.js [version]
// -> dist/addons/<id>/...            one folder per addon, ready to copy to Documents\RL Career Hub+\addons
// -> dist/RLCE-Addons-<v>-all.zip    every addon (the folders sit in an "addons" folder)
// The hidden library "rlce-lib" carries the code; each feature addon only says "I need rlce-lib" and turns its part
// on for the saves that pick it. The Live caster addon also carries the voices and crowd sounds.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const VERSION = process.argv[2] || '0.2.0';
const GAME = '0.2.0-beta.33';
const AUTHOR = 'carrascsa';
const URL = 'https://github.com/carrascsa/RL-Career-Extras';
const { LIB, FEATURES } = require(path.join(SRC, 'hubplus', 'features'));
const UI = ['ui-common.js', 'hof-ui.js', 'academy-ui.js', 'clublife-ui.js', 'circuit-ui.js', 'world-ui.js', 'caster-ui.js'];
// standalone-only files and the voices (they go in the Live caster addon)
const SKIP = new Set(['launcher.js', 'inproc.js', 'voice']);

const OUT = path.join(ROOT, 'dist', 'addons');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function copyDir(from, to, skip) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip && skip.has(e.name)) continue;
    if (e.name === '__pycache__' || e.name.endsWith('.pyc')) continue;
    const a = path.join(from, e.name); const b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}
const write = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const license = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
const readme = (title, body) => `${title}\r\n${'='.repeat(title.length)}\r\n\r\n${body.replace(/\n/g, '\r\n')}\r\n`;
const install = 'INSTALL\n1. Install RLC Hub Addon Manager (by Milan) and start it once.\n2. Copy this folder into Documents\\RL Career Hub+\\addons (with the rlce-lib folder: every RL Career Extras addon needs it).\n3. Restart RL Career Hub+ and pick the addons above the Start button of a new career (or in the Setup tab).\n\nProblems: addons\\_hubplus.log. Bugs: ' + URL + '/issues';

// ---------- the library ----------
const lib = path.join(OUT, LIB);
copyDir(SRC, path.join(lib, 'src'), SKIP);
for (const f of UI) fs.copyFileSync(path.join(SRC, f), path.join(lib, f));
write(path.join(lib, 'main.js'), "'use strict';\n// RL Career Extras library: see src/hubplus/lib-main.js\nmodule.exports = require('./src/hubplus/lib-main');\n");
write(path.join(lib, 'addon.json'), JSON.stringify({
  id: LIB, name: 'RL Career Extras (library)', author: AUTHOR, version: VERSION,
  description: 'Shared code of the RL Career Extras addons. Turned on by them.', game: GAME,
  main: 'main.js', ui: UI, hidden: true, order: 100, license: 'MIT', url: URL,
}, null, 2) + '\n');
write(path.join(lib, 'LICENSE.txt'), license);
fs.copyFileSync(path.join(ROOT, 'THIRD_PARTY_NOTICES.md'), path.join(lib, 'THIRD_PARTY_NOTICES.md'));
write(path.join(lib, 'README.txt'), readme('RL Career Extras - library (rlce-lib)', 'The code shared by every RL Career Extras addon. It is not shown in the picker: it turns on with the addons that need it.\n\n' + install));

// ---------- one addon per feature ----------
for (const f of FEATURES) {
  const dir = path.join(OUT, f.id);
  const manifest = {
    id: f.id, name: f.name, author: AUTHOR, version: VERSION, description: f.desc, game: GAME,
    default: true, requires: [LIB, ...(f.requires || [])], order: 110,
    // saves made with the standalone RL Career Extras keep their features when imported
    legacyKeys: ['xtra'], license: 'MIT', url: URL,
    lang: { es: { [f.name]: f.es.name, [f.desc]: f.es.desc } },
  };
  write(path.join(dir, 'addon.json'), JSON.stringify(manifest, null, 2) + '\n');
  write(path.join(dir, 'LICENSE.txt'), license);
  write(path.join(dir, 'README.txt'), readme(`RL Career Extras - ${f.name}`, f.desc + '\n\n' + install));
  if (f.gate === 'live') copyDir(path.join(SRC, 'voice'), path.join(dir, 'voice'));
}

// ---------- zip: dist/RLCE-Addons-<v>-all.zip with an "addons" folder inside ----------
const zip = path.join(ROOT, 'dist', `RLCE-Addons-v${VERSION}-all.zip`);
fs.rmSync(zip, { force: true });
const stage = path.join(ROOT, 'dist', '_zip');
fs.rmSync(stage, { recursive: true, force: true });
copyDir(OUT, path.join(stage, 'addons'));
write(path.join(stage, 'README.txt'), readme(`RL Career Extras ${VERSION} - addons for RLC Hub Addon Manager`,
  'Every RL Career Extras feature as its own addon, plus the library they share (rlce-lib).\n\n' + FEATURES.map((f) => `- ${f.name}: ${f.desc}`).join('\n') + '\n\n'
  + 'INSTALL\n1. Install RLC Hub Addon Manager (by Milan) and start it once.\n2. Double-click INSTALL.cmd (or copy every folder INSIDE this zip\'s "addons" folder into Documents\\RL Career Hub+\\addons - not the "addons" folder itself).\n3. Restart RL Career Hub+ and pick the addons above the Start button of a new career (or in the Setup tab).\n\nAll RL Career Extras addons are by carrascsa, MIT license. ' + URL));
// one double-click install: copies every addon folder where RLC Hub Addon Manager looks for them
write(path.join(stage, 'INSTALL.cmd'), [
  '@echo off',
  'rem RL Career Extras addons - copies the addon folders into RLC Hub Addon Manager.',
  'setlocal',
  'set "DEST=%USERPROFILE%\\Documents\\RL Career Hub+\\addons"',
  'if not exist "%DEST%" (',
  '  echo RLC Hub Addon Manager was not found ^(no "%DEST%"^).',
  '  echo Install it first, start it once, then run this again.',
  '  pause',
  '  exit /b 1',
  ')',
  'robocopy "%~dp0addons" "%DEST%" /E /NFL /NDL /NJH /NJS /NP >nul',
  'if errorlevel 8 (echo Copy failed. & pause & exit /b 1)',
  'echo Done! Restart RL Career Hub+ and pick the RL Career Extras addons when you create a career.',
  'pause',
  '',
].join('\r\n'));
execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${path.join(stage, '*')}' -DestinationPath '${zip}' -CompressionLevel Optimal`], { stdio: 'inherit' });
fs.rmSync(stage, { recursive: true, force: true });
const mb = (fs.statSync(zip).size / 1048576).toFixed(1);
console.log(`Built ${FEATURES.length} feature addons + ${LIB} in dist/addons, and ${path.basename(zip)} (${mb} MB)`);
