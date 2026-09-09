// Interaction screenshots for Find Your Starting Point. Run from tools/: node shots-fysp.mjs [need] [audience]
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const here = dirname(fileURLToPath(import.meta.url)); const root = resolve(here, '..');
const [need = 'compliance', audience = 'nonprofit'] = process.argv.slice(2);
const outDir = join(here, 'output', 'sections'); await mkdir(outDir, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html'; const f = join(root, p); if (!f.startsWith(root) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(await readFile(f)); });
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
for (const width of [1440, 375]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 }); const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' }); await page.addStyleTag({ content: '.site-header{position:static!important}' });
  await page.click(`.opt[data-need="${need}"]`); await page.waitForTimeout(1200);
  await page.click(`.opt[data-audience="${audience}"]`); await page.waitForTimeout(2600);
  const box = await page.evaluate(() => { const r = document.getElementById('find-your-starting-point').getBoundingClientRect(); return { x: 0, y: r.top + window.scrollY, width: document.documentElement.clientWidth, height: r.height }; });
  const name = `fysp-${need}-${audience}-${width}.png`;
  await page.screenshot({ path: join(outDir, name), fullPage: true, clip: box, animations: 'disabled' });
  console.log(`wrote output/sections/${name} (${Math.round(box.height)}px tall)`);
  await ctx.close();
}
await browser.close(); server.close();
