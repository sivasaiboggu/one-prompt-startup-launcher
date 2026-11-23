// Headless-Chrome screenshots (CDP, file://) — desktop 1280px + mobile 390px.
// Run: node scripts/shots.mjs — writes screenshots/*.png
// Chrome on this VM needs a WebGL domain policy file + SHA-256 just to start
// (same pattern as grok-replica/scripts/shots.mjs).
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const CHROME = '/opt/meta-chromium/chrome';
const DEBUG_PORT = 9241; // unique to this project — sibling builds run Chrome too

function chromeArgs(debugPort, firstUrl) {
  const policy = 'hatch-webgl-allowed-domains-v1\nexample.com\n';
  const file = path.join(os.tmpdir(), 'opl-webgl-policy.txt');
  fs.writeFileSync(file, policy);
  const sha = createHash('sha256').update(policy).digest('hex');
  return [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
    `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'opl-chrome-'))}`,
    `--hatch-webgl-allowed-domains-file=${file}`,
    `--hatch-webgl-allowed-domains-sha256=${sha}`,
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1280,900',
    firstUrl,
  ];
}

const pageUrl = (u) => `file://${ROOT}/${u}`;

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);
      } else if (msg.method) this.events.push(msg);
    };
  }
  async call(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const done = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return done;
  }
  async waitForEvent(method, timeoutMs = 30000) {
    const start = Date.now();
    for (;;) {
      const i = this.events.findIndex((e) => e.method === method);
      if (i >= 0) return this.events.splice(i, 1)[0];
      if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${method}`);
      await delay(100);
    }
  }
  async evaluate(expression) {
    const res = await this.call('Runtime.evaluate', { expression, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result?.value;
  }
  close() { try { this.ws.close(); } catch (e) { /* already closed */ } }
}

const SHOTS = [
  { name: 'desktop-launcher.png', width: 1280, height: 1000, url: 'index.html', waitMs: 1500 },
  { name: 'desktop-result.png', width: 1280, height: 1400, url: 'index.html?demo=a%20meal-planning%20app%20for%20hostel%20students', waitMs: 2500 },
  { name: 'desktop-published-mealwise.png', width: 1280, height: 1400, url: 'index.html#/p/mealwise', waitMs: 1500 },
  { name: 'desktop-library.png', width: 1280, height: 1000, url: 'index.html#/library', waitMs: 1500 },
  { name: 'mobile-launcher.png', width: 390, height: 844, url: 'index.html', waitMs: 1500 },
  { name: 'mobile-published-mealwise.png', width: 390, height: 844, url: 'index.html#/p/mealwise', waitMs: 1500 },
];

async function main() {
  fs.mkdirSync(path.join(ROOT, 'screenshots'), { recursive: true });
  const chrome = spawn(CHROME, chromeArgs(DEBUG_PORT, pageUrl(SHOTS[0].url)));
  try {
    let wsUrl = null;
    for (let i = 0; i < 50; i++) {
      try {
        const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
        // Only our own page — other hackathon builds may run Chrome on this VM.
        const page = targets.find((t) => t.type === 'page' && t.url.includes('one-prompt-startup-launcher'));
        if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
      } catch (e) { /* not up yet */ }
      await delay(200);
    }
    if (!wsUrl) throw new Error('Chrome DevTools did not come up');
    const cdp = new Cdp(wsUrl);
    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');
    for (const shot of SHOTS) {
      await cdp.call('Emulation.setDeviceMetricsOverride', {
        width: shot.width, height: shot.height, deviceScaleFactor: 1, mobile: shot.width < 600,
      });
      await cdp.call('Page.navigate', { url: pageUrl(shot.url) });
      // Hash-only navigations (#/library) fire no load event — tolerate that.
      await Promise.race([
        cdp.waitForEvent('Page.loadEventFired').then(() => true),
        delay(3000).then(() => false),
      ]);
      await delay(shot.waitMs);
      const overflow = await cdp.evaluate(
        `JSON.stringify({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth, title: document.title })`,
      );
      const { data } = await cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      fs.writeFileSync(path.join(ROOT, 'screenshots', shot.name), Buffer.from(data, 'base64'));
      console.log('wrote', shot.name, overflow);
      if (JSON.parse(overflow).overflowX) console.log('  WARNING: horizontal overflow in', shot.name);
    }
    cdp.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
