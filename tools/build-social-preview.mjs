// Renders the brand cards that ship as raster files (Chromium at 1×):
//   /social-preview.png              1200×630  WEB-03   ← website-assets/social-preview/social-preview.html
//   /making-the-pieces-fit-poster.jpg 1920×1080          ← website-assets/posters/making-the-pieces-fit-poster.html
//   /capability-brief-poster.jpg      1920×1080          ← website-assets/posters/capability-brief-poster.html
// Run from tools/: node build-social-preview.mjs [name ...]   (no args = all)
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CARDS = [
  { name: 'social-preview', src: 'website-assets/social-preview/social-preview.html', out: 'social-preview.png', width: 1200, height: 630, type: 'png' },
  { name: 'making-the-pieces-fit-poster', src: 'website-assets/posters/making-the-pieces-fit-poster.html', out: 'making-the-pieces-fit-poster.jpg', width: 1920, height: 1080, type: 'jpeg', quality: 90 },
  { name: 'capability-brief-poster', src: 'website-assets/posters/capability-brief-poster.html', out: 'capability-brief-poster.jpg', width: 1920, height: 1080, type: 'jpeg', quality: 90 },
];
const only = process.argv.slice(2);
const cards = only.length ? CARDS.filter((c) => only.includes(c.name)) : CARDS;
if (!cards.length) { console.error(`unknown card(s): ${only.join(' ')}`); process.exit(1); }

const browser = await chromium.launch();
let failed = false;
for (const card of cards) {
  const page = await browser.newPage({ viewport: { width: card.width, height: card.height }, deviceScaleFactor: 1 });
  const bad = [];
  page.on('requestfailed', (r) => bad.push(r.url()));
  await page.goto(pathToFileURL(resolve(root, card.src)).href, { waitUntil: 'load' });
  // Force every declared face to load (browsers skip unused faces), so a bad font path fails the build.
  await page.evaluate(async () => { await Promise.all([...document.fonts].map((f) => f.load())); await document.fonts.ready; });
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.weight}${f.style === 'italic' ? 'i' : ''}`));
  const imgsOk = await page.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  const bgOk = await page.evaluate(async () => {
    const urls = [...document.querySelectorAll('*')].flatMap((el) => [...getComputedStyle(el).backgroundImage.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => m[1]));
    const load = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i.naturalWidth > 0); i.onerror = () => ok(false); i.src = u; });
    for (const u of new Set(urls)) if (!(await load(u))) return false;
    return true;
  });
  const declared = await page.evaluate(() => document.fonts.size);
  if (bad.length || fonts.length < declared || !imgsOk || !bgOk) {
    console.error(`build FAILED for ${card.name}`, { bad, fonts, declared, imgsOk, bgOk });
    failed = true;
  } else {
    const opts = { path: resolve(root, card.out), type: card.type };
    if (card.type === 'jpeg') opts.quality = card.quality;
    await page.screenshot(opts);
    console.log(`wrote ${card.out} ${card.width}×${card.height} (fonts: ${fonts.join(' ')})`);
  }
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
