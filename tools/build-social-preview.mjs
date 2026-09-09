// Renders /social-preview.png (WEB-03, 1200×630) from website-assets/social-preview/social-preview.html.
// Run from tools/: node build-social-preview.mjs
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'website-assets/social-preview/social-preview.html');
const out = resolve(root, 'social-preview.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const failed = [];
page.on('requestfailed', (r) => failed.push(r.url()));
await page.goto(pathToFileURL(src).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.weight}${f.style === 'italic' ? 'i' : ''}`));
const markOk = await page.evaluate(() => { const i = document.querySelector('.mark'); return i.complete && i.naturalWidth > 0; });
if (failed.length || fonts.length < 4 || !markOk) {
  console.error('build:social-preview FAILED', { failed, fonts, markOk });
  await browser.close();
  process.exit(1);
}
await page.screenshot({ path: out, type: 'png', omitBackground: false });
await browser.close();
console.log(`wrote ${out} (fonts: ${fonts.join(' ')})`);
