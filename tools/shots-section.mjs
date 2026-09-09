// Captures one or more homepage sections at 375 / 768 / 1024 / 1440 px.
// Run from tools/: node shots-section.mjs <outPrefix> <selector> [selector...]
//   e.g. node shots-section.mjs baseline '#practices' '#who-we-serve'
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const [prefix = 'section', ...selectors] = process.argv.slice(2);
if (!selectors.length) { console.error('usage: node shots-section.mjs <outPrefix> <selector> [selector...]'); process.exit(1); }
const outDir = join(here, 'output', 'sections');
await mkdir(outDir, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  const file = join(root, p);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
for (const width of [375, 768, 1024, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' }); await page.addStyleTag({ content: '.site-header{position:static!important}' });
  await page.waitForTimeout(3200);
  for (const sel of selectors) {
    const box = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: 0, y: r.top + window.scrollY, width: document.documentElement.clientWidth, height: r.height }; }, sel);
    if (!box) { console.error(`missing ${sel}`); continue; }
    const name = `${prefix}-${sel.replace(/[^a-z0-9]+/gi, '')}-${width}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: true, clip: box, animations: 'disabled' });
    console.log(`wrote output/sections/${name} (${Math.round(box.height)}px tall)`);
  }
  await ctx.close();
}
await browser.close(); server.close();
