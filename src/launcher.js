'use strict';
// Starts RL Career Hub with --inspect, loads inproc.js into its main process, then closes the inspector.
// If RL Career+ is installed (%LOCALAPPDATA%\RLCareerPlus) it is attached too, so both add-ons run together.
// Inspector/WebSocket approach adapted from RL Career+ (MIT License).
// Run with the Hub's own Electron as Node:  set ELECTRON_RUN_AS_NODE=1 & "RL Career Hub.exe" launcher.js "<path to RL Career Hub.exe>"
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

const LOG = path.join(process.env.TEMP || '.', 'rlcareerextras.log');
const say = (m) => {
  console.log('[Career Extras]', m);
  try { fs.appendFileSync(LOG, new Date().toISOString() + ' launcher: ' + m + '\n'); } catch { }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CANDIDATE_EXES = [
  process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null,
  path.join(__dirname, '..', '..', 'RL Career Hub.exe'),
  'C:\\Program Files\\RL Career Hub\\RL Career Hub.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'RL Career Hub', 'RL Career Hub.exe'),
].filter(Boolean);

const CAREER_PLUS = path.join(process.env.LOCALAPPDATA || '', 'RLCareerPlus', 'inproc.js');
const WITH_CAREER_PLUS = !process.argv.includes('--no-careerplus') && fs.existsSync(CAREER_PLUS);

function findFreePort(preferred) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', () => resolve(findFreePort(0)));
    srv.listen(preferred, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function waitInspectorUrl(port) {
  for (let i = 0; i < 400; i++) {
    try {
      const list = await getJson(`http://127.0.0.1:${port}/json/list`);
      if (list[0] && list[0].webSocketDebuggerUrl) return list[0].webSocketDebuggerUrl;
    } catch { }
    await sleep(75);
  }
  throw new Error('Inspector port did not open on ' + port);
}

// Minimal WebSocket client (text frames only) so the launcher has no dependencies.
function openWs(wsUrl) {
  const u = new URL(wsUrl);
  return new Promise((resolve, reject) => {
    const sock = net.connect(Number(u.port), u.hostname);
    let buf = Buffer.alloc(0);
    let open = false;
    const api = {
      onmessage: null,
      send(text) {
        const payload = Buffer.from(text, 'utf8');
        const mask = crypto.randomBytes(4);
        let hdr;
        if (payload.length < 126) hdr = Buffer.from([0x81, 0x80 | payload.length]);
        else if (payload.length < 65536) { hdr = Buffer.alloc(4); hdr[0] = 0x81; hdr[1] = 0x80 | 126; hdr.writeUInt16BE(payload.length, 2); }
        else { hdr = Buffer.alloc(10); hdr[0] = 0x81; hdr[1] = 0x80 | 127; hdr.writeBigUInt64BE(BigInt(payload.length), 2); }
        const masked = Buffer.allocUnsafe(payload.length);
        for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i & 3];
        sock.write(Buffer.concat([hdr, mask, masked]));
      },
      close() { try { sock.end(); } catch { } },
    };
    sock.on('error', reject);
    sock.on('connect', () => {
      sock.write(`GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
    });
    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!open) {
        const idx = buf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        if (!/^HTTP\/1\.[01]\s+101\b/i.test(buf.slice(0, idx).toString('utf8'))) { sock.destroy(); return reject(new Error('WebSocket upgrade rejected')); }
        open = true;
        buf = buf.slice(idx + 4);
        resolve(api);
      }
      while (buf.length >= 2) {
        const b0 = buf[0];
        const b1 = buf[1];
        let len = b1 & 0x7f;
        let off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (b1 & 0x80) off += 4;
        if (buf.length < off + len) return;
        const frame = buf.slice(off, off + len);
        buf = buf.slice(off + len);
        const op = b0 & 0x0f;
        if (op === 0x08) { sock.end(); return; }
        if (op === 0x09) { sock.write(Buffer.from([0x8a, 0x80, 0, 0, 0, 0])); continue; }
        if ((op === 0x01 || op === 0x00) && api.onmessage) api.onmessage(frame.toString('utf8'));
      }
    });
  });
}

function attachExpr(file, opts) {
  return `(function () {
    const req = (typeof require === 'function' ? require : (process.mainModule && process.mainModule.require.bind(process.mainModule)));
    if (!req) return 'no-require';
    return req(${JSON.stringify(file.replace(/\\/g, '/'))}).attach(${JSON.stringify(opts)});
  })()`;
}

const done = (s) => s === 'wrapped' || s === 'already';
// 'no-require' only means the Hub's main module has not loaded yet: keep retrying (for up to a minute).
const fatal = (s) => String(s).startsWith('error');

(async () => {
  const exe = CANDIDATE_EXES.find((p) => fs.existsSync(p));
  if (!exe) { say('RL Career Hub.exe not found. Pass its path as the first argument.'); process.exit(1); }

  const port = Number(process.env.RLXT_PORT) || await findFreePort(9355);
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  say(`Launching ${exe} (--inspect=${port})` + (WITH_CAREER_PLUS ? ' + RL Career+' : ''));
  spawn(exe, [`--inspect=${port}`], { detached: true, stdio: 'ignore', cwd: path.dirname(exe), env }).unref();

  const ws = await openWs(await waitInspectorUrl(port));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (text) => {
    const msg = JSON.parse(text);
    if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const evaluate = (expression) => new Promise((res) => {
    const reqId = ++id;
    pending.set(reqId, (msg) => res(msg.result && msg.result.result ? msg.result.result.value : JSON.stringify(msg)));
    ws.send(JSON.stringify({ id: reqId, method: 'Runtime.evaluate', params: { expression, includeCommandLineAPI: true, returnByValue: true } }));
  });

  const targets = [{ name: 'Career Extras', expr: attachExpr(path.join(__dirname, 'inproc.js'), { log: LOG, force: process.argv.includes('--force') }), status: '' }];
  if (WITH_CAREER_PLUS) {
    targets.push({ name: 'RL Career+', expr: attachExpr(CAREER_PLUS, { log: path.join(process.env.TEMP || '.', 'rlcareerplus.log'), closeInspector: false }), status: '' });
  }

  const t0 = Date.now();
  while (Date.now() - t0 < 20 * 60 * 1000) {
    for (const t of targets) {
      if (done(t.status) || fatal(t.status)) continue;
      let s;
      try { s = await evaluate(t.expr); } catch (e) { s = 'error: ' + e.message; }
      if (s !== t.status) say(`${t.name}: ${s}`);
      t.status = s;
    }
    if (targets.every((t) => done(t.status) || fatal(t.status))) break;
    if (Date.now() - t0 > 60 * 1000 && targets.every((t) => done(t.status) || fatal(t.status) || t.status === 'no-require')) break;
    await sleep(Date.now() - t0 < 4000 ? 100 : 300);
  }

  // Close the debug port again (the reply may never arrive because the socket closes with it).
  const closeExpr = "(function(){ setTimeout(function(){ try { (typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule))('inspector').close(); } catch (e) {} }, 50); return 'closing'; })()";
  try { await Promise.race([evaluate(closeExpr), sleep(1500)]); } catch { }
  ws.close();
  const ok = done(targets[0].status);
  say(ok ? 'Career Extras active!' : 'Ended with: ' + targets[0].status);
  process.exit(ok ? 0 : 1);
})().catch((e) => { say('Failed: ' + e.message); process.exit(1); });
