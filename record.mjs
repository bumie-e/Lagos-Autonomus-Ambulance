// node record.mjs [main|counter]            -> videos/ambulance_<demo>.mp4
// node record.mjs main --stills 2,12,30     -> frames/*.jpg at those video seconds
import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process';
import puppeteer from 'puppeteer-core';
const root = path.dirname(new URL(import.meta.url).pathname.replace(/%20/g, ' '));
const demo = process.argv[2] || 'main', si = process.argv.indexOf('--stills');
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => { const f = path.join(root, path.normalize(decodeURIComponent(req.url.split('?')[0])));
  fs.readFile(f, (e, d) => { if (e || !f.startsWith(root)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 600000, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] });
const page = await browser.newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/render/index.html?demo=${demo}`);
try { await page.waitForFunction('window.READY', { timeout: 180000 }); } catch (e) { console.error(errors); process.exit(1); }
const { total, fps } = await page.evaluate(() => ({ total: window.TOTAL, fps: window.FPS }));
const grab = async i => Buffer.from((await page.evaluate(i => window.frame(i), i)).split(',')[1], 'base64');
console.log(`${demo}: ${total} frames (${(total / fps).toFixed(0)} s)`);
if (si > 0) {
  fs.mkdirSync(path.join(root, 'frames'), { recursive: true });
  for (const t of process.argv[si + 1].split(',').map(Number)) { const t0 = Date.now(); fs.writeFileSync(path.join(root, 'frames', `${demo}_${t}.jpg`), await grab(Math.min(total - 1, Math.round(t * fps)))); console.log('still', t, Date.now() - t0, 'ms'); }
} else {
  fs.mkdirSync(path.join(root, 'videos'), { recursive: true });
  const file = path.join(root, 'videos', `ambulance_${demo}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < total; i++) { if (!ff.stdin.write(await grab(i))) await new Promise(r => ff.stdin.once('drain', r)); if (i % 300 === 0) console.log(i, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
  ff.stdin.end(); await new Promise((r, j) => ff.on('close', c => c ? j(new Error('ffmpeg ' + c)) : r()));
  console.log('wrote', file);
}
if (errors.length) console.log('page errors:', errors.slice(0, 5));
await browser.close(); server.close();
