// Browser verification for the Puzzler website. Run: npm run verify
// Serves the repo root on a local port, then for each page and viewport:
//   - collects console errors and failed same-origin requests
//   - checks for horizontal overflow
//   - runs axe-core (fails on serious/critical violations)
//   - captures full-page screenshots (tools/output/screens/)
// Plus targeted checks: reduced motion, keyboard focus, mobile nav, Method stepper.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const axeSource = await readFile(join(here, 'node_modules/axe-core/axe.min.js'), 'utf8');
const root = resolve(here, '..');
const outDir = join(here, 'output', 'screens');
await mkdir(outDir, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain' };
const REWRITES = { '/making-the-pieces-fit': '/making-the-pieces-fit.html', '/capability-brief': '/capability-brief.html' };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  p = REWRITES[p] || p;
  if (p === '/') p = '/index.html';
  const file = join(root, p);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 740 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1920, height: 1080 },
];
const PAGES = [
  { path: '/', name: 'index', viewports: VIEWPORTS },
  { path: '/privacy.html', name: 'privacy', viewports: [VIEWPORTS[0], VIEWPORTS[2]] },
  { path: '/terms.html', name: 'terms', viewports: [VIEWPORTS[0], VIEWPORTS[2]] },
  { path: '/making-the-pieces-fit', name: 'making-the-pieces-fit', viewports: [VIEWPORTS[0], VIEWPORTS[2]] },
  { path: '/capability-brief', name: 'capability-brief', viewports: [VIEWPORTS[0], VIEWPORTS[2]] },
  { path: '/puzzler_card.html', name: 'card', viewports: [VIEWPORTS[0], VIEWPORTS[2]] },
];
const THIRD_PARTY = /usefathom\.com|vercel-insights\.com|heygen\.com|calendly\.com|linkedin\.com|gstatic|googleapis/;

const report = [];
const failures = [];
const browser = await chromium.launch();

async function audit(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const wide = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 && r.width > 0) wide.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} right=${Math.round(r.right)}`);
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, wide: wide.slice(0, 8) };
  });
  if (overflow.scrollWidth > overflow.clientWidth) failures.push(`${label}: horizontal overflow scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth} ${overflow.wide.join('; ')}`);

  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'], rules: { 'region': { enabled: true } } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) }));
  });
  for (const v of axe) {
    const line = `${label}: axe ${v.impact} ${v.id} — ${v.help} [${v.nodes.join(' | ')}]`;
    if (v.impact === 'serious' || v.impact === 'critical') failures.push(line); else report.push('  note: ' + line);
  }
  return { overflow, axe };
}

for (const pg of PAGES) {
  for (const vp of pg.viewports) {
    const label = `${pg.name}@${vp.name}`;
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    const consoleWarnings = [];
    page.on('console', (m) => {
      const src = (m.location() && m.location().url) || '';
      if (THIRD_PARTY.test(src) || THIRD_PARTY.test(m.text())) return; // proxy-blocked analytics / embeds
      if (m.type() === 'error') consoleErrors.push(`error: ${m.text()} (${src})`);
      else if (m.type() === 'warning') consoleWarnings.push(`warning: ${m.text()}`);
    });
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
    page.on('requestfailed', (r) => {
      const err = r.failure()?.errorText || '';
      if (THIRD_PARTY.test(r.url())) return;
      if (/\.mp4$/.test(r.url()) && err === 'net::ERR_ABORTED') return; // metadata preload aborts remaining range reads
      failedRequests.push(`${r.url()} ${err}`);
    });
    page.on('response', (r) => { if (r.status() >= 400 && !THIRD_PARTY.test(r.url())) failedRequests.push(`${r.url()} HTTP ${r.status()}`); });
    await page.goto(base + pg.path, { waitUntil: 'load' });
    await page.waitForTimeout(3200); // let one-time traces settle
    const { overflow, axe } = await audit(page, label);
    await page.screenshot({ path: join(outDir, `${pg.name}-${vp.name}.png`), fullPage: true });
    const own = consoleErrors.filter((e) => !THIRD_PARTY.test(e));
    if (own.length) failures.push(`${label}: console ${own.join(' || ')}`);
    if (failedRequests.length) failures.push(`${label}: failed requests ${failedRequests.join(' || ')}`);
    if (consoleWarnings.length) report.push(`  note: ${label}: console warnings ${consoleWarnings.join(' || ')}`);
    report.push(`${label}: overflow ${overflow.scrollWidth}/${overflow.clientWidth}, axe violations ${axe.length}, console ${own.length}, failed requests ${failedRequests.length}`);
    await context.close();
  }
}

// ── Targeted homepage checks ────────────────────────────────────────
{
  // Reduced motion: hero connections settled immediately, Method uses static images, no inline master.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const rm = await page.evaluate(() => {
    const trace = document.querySelector('.connections .trace');
    const join = document.querySelector('.connections .join');
    return {
      dash: getComputedStyle(trace).strokeDashoffset,
      joinOpacity: getComputedStyle(join).opacity,
      inlineMaster: !!document.querySelector('#method-stage > svg'),
      staticVisible: !document.getElementById('method-static').hidden,
    };
  });
  if (parseFloat(rm.dash) !== 0) failures.push(`reduced-motion: hero trace not settled (dashoffset ${rm.dash})`);
  if (rm.joinOpacity !== '1') failures.push(`reduced-motion: hero nodes not visible (opacity ${rm.joinOpacity})`);
  if (rm.inlineMaster || !rm.staticVisible) failures.push('reduced-motion: Method did not use the static fallback');
  await page.click('.step-btn[data-step="5"]');
  const src5 = await page.getAttribute('#method-static', 'src');
  if (!/method-state-05-take-breaks\.svg$/.test(src5)) failures.push(`reduced-motion: static step swap failed (${src5})`);
  await page.screenshot({ path: join(outDir, 'index-laptop-reduced-motion.png'), fullPage: true });
  report.push(`reduced-motion: trace settled=${parseFloat(rm.dash) === 0}, static Method=${rm.staticVisible && !rm.inlineMaster}, step swap ok=${/05/.test(src5)}`);
  await ctx.close();
}
{
  // Default motion: inline master loads, stepper drives data-state, keyboard works, mobile nav works.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForSelector('#method-stage > svg', { timeout: 5000 }).catch(() => failures.push('method: inline master did not load'));
  await page.click('.step-btn[data-step="3"]');
  const st = await page.getAttribute('#method-stage', 'data-state');
  if (st !== '3') failures.push(`method: data-state expected 3, got ${st}`);
  const op = await page.evaluate(() => getComputedStyle(document.querySelector('#method-stage #g-groups')).opacity);
  await page.waitForTimeout(700);
  const op2 = await page.evaluate(() => getComputedStyle(document.querySelector('#method-stage #g-groups')).opacity);
  if (op2 !== '1') failures.push(`method: g-groups opacity expected 1 in state 3, got ${op2} (was ${op})`);
  await page.focus('.step-btn[data-step="3"]');
  await page.keyboard.press('ArrowDown');
  const st4 = await page.getAttribute('#method-stage', 'data-state');
  if (st4 !== '4') failures.push(`method: ArrowDown expected state 4, got ${st4}`);
  await page.waitForTimeout(1300);
  await page.screenshot({ path: join(outDir, 'index-laptop-method-step4.png'), fullPage: true, clip: { x: 0, y: (await page.evaluate(() => document.getElementById('method').getBoundingClientRect().top + window.scrollY)), width: 1280, height: 900 } });
  const hidden = await page.evaluate(() => [...document.querySelectorAll('.step-desc')].filter((d) => !d.hidden).map((d) => d.dataset.step));
  if (hidden.join() !== '4') failures.push(`method: visible descriptions expected [4], got [${hidden}]`);

  // Keyboard: tab from top reaches skip link, then brand, then nav; focus ring visible.
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement.className);
  if (first !== 'skip-link') failures.push(`keyboard: first tab stop expected skip-link, got ${first}`);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { el: document.activeElement.textContent.trim().slice(0, 24), outline: s.outlineStyle, width: s.outlineWidth }; });
  if (ring.outline === 'none' || parseFloat(ring.width) < 2) failures.push(`keyboard: focus indicator missing on ${ring.el}`);
  await page.screenshot({ path: join(outDir, 'index-laptop-focus.png') });
  report.push(`keyboard: first stop=${first}, focus ring on "${ring.el}" ${ring.outline} ${ring.width}`);
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  const connDisplay = await page.evaluate(() => getComputedStyle(document.querySelector('.hero-field .connections')).display);
  if (connDisplay !== 'none') failures.push(`mobile: decorative connection animation still shown (${connDisplay})`);
  const inlineOnMobile = await page.evaluate(() => !!document.querySelector('#method-stage > svg'));
  if (inlineOnMobile) failures.push('mobile: inline master loaded on small screen (static states expected)');
  await page.tap('.nav-toggle');
  const expanded = await page.getAttribute('.nav-toggle', 'aria-expanded');
  const navVisible = await page.isVisible('#primary-nav');
  if (expanded !== 'true' || !navVisible) failures.push('mobile: nav toggle failed');
  await page.screenshot({ path: join(outDir, 'index-mobile-nav-open.png') });
  await page.keyboard.press('Escape');
  const closed = await page.getAttribute('.nav-toggle', 'aria-expanded');
  if (closed !== 'false') failures.push('mobile: Escape did not close nav');
  // touch targets
  const small = await page.evaluate(() => [...document.querySelectorAll('a, button, summary')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44) && el.offsetParent !== null; }).map((el) => `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));
  if (small.length) failures.push(`mobile: touch targets under 44px: ${small.join('; ')}`);
  await page.tap('.step-btn[data-step="7"]');
  const src7 = await page.getAttribute('#method-static', 'src');
  if (!/07-risk-correction/.test(src7)) failures.push(`mobile: step tap failed (${src7})`);
  await page.screenshot({ path: join(outDir, 'index-mobile-method-step7.png'), fullPage: true, clip: { x: 0, y: (await page.evaluate(() => document.getElementById('method-stage').getBoundingClientRect().top + window.scrollY - 20)), width: 375, height: 740 } });
  report.push(`mobile: connections hidden=${connDisplay === 'none'}, nav ok=${expanded === 'true' && closed === 'false'}, small targets=${small.length}`);
  await ctx.close();
}
{
  // Layout shift: hero and method media reserve space (aspect boxes), measure CLS.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const cls = await page.evaluate(() => window.__cls);
  if (cls > 0.05) failures.push(`layout: CLS ${cls.toFixed(3)} exceeds 0.05`);
  report.push(`layout: CLS ${cls.toFixed(4)}`);
  await ctx.close();
}

await browser.close();
server.close();

const md = [`# verify report`, `base: ${base}`, '', ...report, '', failures.length ? `## FAILURES (${failures.length})` : '## PASS', ...failures.map((f) => '- ' + f)].join('\n');
await writeFile(join(here, 'output', 'report.md'), md);
console.log(md);
process.exit(failures.length ? 1 : 0);
