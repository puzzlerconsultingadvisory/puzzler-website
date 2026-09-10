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
const THIRD_PARTY = /usefathom\.com|vercel-insights\.com|heygen\.com|calendly\.com|linkedin\.com|gstatic|googleapis|youtube|ytimg/;

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

  // Pieces in Motion: play facade swaps in a youtube-nocookie player only on activation.
  const framesBefore = await page.evaluate(() => document.querySelectorAll('.pim-card iframe').length);
  if (framesBefore !== 0) failures.push(`pim: ${framesBefore} player iframe(s) loaded before any click`);
  await page.click('.pim-card .poster.has-media .play');
  const frameSrc = await page.evaluate(() => { const f = document.querySelector('.pim-card iframe'); return f ? f.src : ''; });
  if (!/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]+\?autoplay=1/.test(frameSrc)) failures.push(`pim: player did not load on click (${frameSrc})`);
  report.push(`pim: no player before click, player src on click ok=${/youtube-nocookie/.test(frameSrc)}`);

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

// ── Find Your Starting Point ────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(base + '/', { waitUntil: 'load' });
  const NEEDS = ['idea', 'funding', 'growing', 'change', 'systems', 'story', 'compliance'];
  const AUDS = ['individual', 'emerging', 'nonprofit', 'agency', 'foundation', 'business'];
  // Live region + semantics present before any interaction.
  const sem = await page.evaluate(() => ({
    live: document.getElementById('fysp-result').getAttribute('aria-live'),
    atomic: document.getElementById('fysp-result').getAttribute('aria-atomic'),
    buttons: [...document.querySelectorAll('#find-your-starting-point .opt')].every((b) => b.tagName === 'BUTTON' && b.getAttribute('type') === 'button' && b.getAttribute('aria-pressed') === 'false'),
    count: document.querySelectorAll('#find-your-starting-point .opt').length,
    emailInputs: document.querySelectorAll('#find-your-starting-point input').length,
    audienceSummaries: document.querySelectorAll('.audience-grid .audience').length,
    fitStatement: /We are not the right firm for federal contract advocacy on behalf of clients, financial-distress turnarounds, or executive search\./.test(document.querySelector('.fit-statement').textContent),
    revenueExclusion: /\$2\s?M|2 million/i.test(document.body.textContent),
    whoWeServeSection: !!document.getElementById('who-we-serve'),
  }));
  if (sem.live !== 'polite' || sem.atomic !== 'true') failures.push(`fysp: result region aria-live=${sem.live} aria-atomic=${sem.atomic}`);
  if (!sem.buttons || sem.count !== 13) failures.push(`fysp: expected 13 semantic toggle buttons, got ${sem.count} (semantic=${sem.buttons})`);
  if (sem.emailInputs) failures.push('fysp: an input field is present before any result (no email gate allowed)');
  if (sem.audienceSummaries !== 6) failures.push(`fysp: expected 6 static audience summaries, got ${sem.audienceSummaries}`);
  if (!sem.fitStatement) failures.push('fysp: approved fit statement missing');
  if (sem.revenueExclusion) failures.push('fysp: revenue-based exclusion text still present');
  if (sem.whoWeServeSection) failures.push('fysp: separate Who We Serve section still present');

  // Every need × audience renders a complete, coherent result (reduced motion → immediate).
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rpage = await rctx.newPage();
  rpage.on('pageerror', (e) => errs.push(e.message));
  await rpage.goto(base + '/', { waitUntil: 'load' });
  let combos = 0; const bad = [];
  for (const n of NEEDS) {
    await rpage.click(`.opt[data-need="${n}"]`); // pressing an already-pressed option toggles it off, so click each need once
    for (const a of AUDS) {
      await rpage.click(`.opt[data-audience="${a}"]`);
      await rpage.waitForFunction(({ n, a }) => { const c = document.querySelector('#fysp-result .card'); return c && c.dataset.need === n && c.dataset.audience === a; }, { n, a }, { timeout: 2000 }).catch(() => {});
      const r = await rpage.evaluate(({ n, a }) => {
        const card = document.querySelector('#fysp-result .card');
        if (!card) return { ok: false, why: 'no card' };
        const q = (s) => card.querySelector(s);
        const text = card.textContent;
        const links = [...card.querySelectorAll('a.btn')].map((l) => ({ label: l.textContent.trim(), href: l.getAttribute('href') }));
        const chips = [...card.querySelectorAll('.chip')].map((c) => c.textContent.trim());
        const relevant = [...document.querySelectorAll('.practice.is-relevant .relevant')].filter((b) => !b.hidden).length;
        const pressed = [...document.querySelectorAll('.opt[aria-pressed="true"]')].map((b) => b.dataset.need || b.dataset.audience);
        const problems = [];
        if (!q('h5') || !q('.headline') || !q('.core') || !q('.angle')) problems.push('missing heading/headline/core/angle');
        if (card.querySelectorAll('.help li').length < 5) problems.push('fewer than 5 help bullets');
        const rf = card.querySelector('details.reach form.reach-form');
        if (!rf || !rf.querySelector('[name="Name"][required]') || !rf.querySelector('[name="Email"][required][type="email"]') || !rf.querySelector('[name="Organization"]') || !rf.querySelector('[name="Phone"]')) problems.push('contact details form incomplete');
        if (chips.length !== 3) problems.push(`practice chips=${chips.length}`);
        if (!q('.outputs')) problems.push('no outputs');
        if (!links.length || !/^(https:\/\/calendly\.com\/mark-puzzlerconsultingandadvisory\/30min|mailto:info@puzzlerconsultingadvisory\.com(\?subject=[\w%]+)?)$/.test(links[0].href)) problems.push(`primary CTA href ${links[0] && links[0].href}`);
        if (links.some((l) => !/^(https:\/\/calendly\.com|mailto:info@puzzlerconsultingadvisory\.com)/.test(l.href))) problems.push('CTA to unapproved destination');
        if (n === 'compliance') {
          if (!/does not provide legal advice or legal representation/.test(text)) problems.push('compliance boundary missing');
          if (links[0].href !== 'mailto:info@puzzlerconsultingadvisory.com?subject=Compliance%20Triage%20Request') problems.push('compliance primary CTA wrong');
          if (!links[1] || links[1].label.indexOf('Book a Fit Call') === -1) problems.push('compliance secondary CTA missing');
        }
        if (/guarantee|24-hour|same-day|legal advice(?! or)/i.test(text.replace(/does not provide legal advice or legal representation/, ''))) problems.push('unapproved promise language');
        if (relevant !== 3) problems.push(`foundation highlights=${relevant}`);
        if (pressed.sort().join() !== [n, a].sort().join()) problems.push(`pressed=${pressed}`);
        const rs = getComputedStyle(card);
        if (rs.opacity !== '1') problems.push(`card opacity ${rs.opacity} under reduced motion`);
        return { ok: !problems.length, why: problems.join('; '), head: q('h5') && q('h5').textContent };
      }, { n, a });
      combos++;
      if (!r.ok) bad.push(`${n}×${a}: ${r.why}`);
    }
  }
  if (bad.length) failures.push(`fysp: ${bad.length} combination(s) incoherent — ${bad.slice(0, 6).join(' || ')}`);
  const svgRM = await rpage.evaluate(() => { const t = document.querySelector('#fysp-svg .fy-trace'); return t ? getComputedStyle(t).strokeDashoffset : 'none'; });
  if (parseFloat(svgRM) !== 0) failures.push(`fysp: reduced-motion trace not settled (${svgRM})`);
  await rctx.close();

  // Default motion: trace draws once and settles; result appears; focus moves to the result heading.
  await page.click('.opt[data-need="funding"]');
  await page.waitForTimeout(200);
  const mid = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#fysp-svg .fy-trace')).strokeDashoffset));
  await page.click('.opt[data-audience="foundation"]');
  await page.waitForTimeout(2600);
  const after = await page.evaluate(() => ({
    traces: [...document.querySelectorAll('#fysp-svg .fy-trace')].map((t) => parseFloat(getComputedStyle(t).strokeDashoffset)),
    settled: document.querySelectorAll('#fysp-svg .fy-trace.settled').length,
    joins: document.querySelectorAll('#fysp-svg .fy-join').length,
    focus: document.activeElement && document.activeElement.id,
    card: !!document.querySelector('#fysp-result .card.is-in'),
  }));
  if (!(mid > 0 && mid < 1)) report.push(`  note: fysp first trace sampled at dashoffset ${mid} (expected mid-draw)`);
  if (after.traces.some((v) => v !== 0) || after.settled !== after.traces.length) failures.push(`fysp: traces did not settle (${after.traces.join(',')}; settled ${after.settled}/${after.traces.length})`);
  if (after.joins !== 2) failures.push(`fysp: expected 2 join nodes, got ${after.joins}`);
  if (after.focus !== 'fysp-result-title') failures.push(`fysp: focus expected on result heading, got ${after.focus}`);
  if (!after.card) failures.push('fysp: result card not revealed');

  // Keyboard: Space toggles, arrows move within a group, Tab leaves the group. (funding is currently pressed.)
  await page.focus('.opt[data-need="idea"]');
  await page.keyboard.press('ArrowDown');
  const k1 = await page.evaluate(() => document.activeElement.dataset.need);
  await page.keyboard.press('Space'); // toggles funding off
  const k2a = await page.evaluate(() => document.querySelector('.opt[data-need="funding"]').getAttribute('aria-pressed'));
  await page.keyboard.press('Space'); // and back on
  const k2b = await page.evaluate(() => document.querySelector('.opt[data-need="funding"]').getAttribute('aria-pressed'));
  const k2 = k2a === 'false' && k2b === 'true' ? 'true' : `off=${k2a} on=${k2b}`;
  await page.focus('.opt[data-need="compliance"]');
  await page.keyboard.press('Tab');
  const k3 = await page.evaluate(() => document.activeElement.dataset.audience || document.activeElement.className);
  if (k1 !== 'funding') failures.push(`fysp: ArrowDown expected to move to funding, got ${k1}`);
  if (k2 !== 'true') failures.push('fysp: Space did not toggle the option');
  if (k3 !== 'individual') failures.push(`fysp: Tab from the last need should reach the first audience, got ${k3}`);
  // Deselecting a choice clears the result back to guidance.
  await page.click('.opt[data-audience="foundation"]');
  await page.waitForTimeout(100);
  await page.waitForFunction(() => !document.querySelector('#fysp-result .card'), null, { timeout: 2000 }).catch(() => {});
  const cleared = await page.evaluate(() => !document.querySelector('#fysp-result .card') && /choose who you are/i.test(document.getElementById('fysp-result').textContent) && document.querySelectorAll('.practice.is-relevant').length === 0);
  if (!cleared) failures.push('fysp: deselecting the audience did not clear the result');
  if (errs.length) failures.push(`fysp: page errors ${errs.join(' || ')}`);
  report.push(`fysp: ${combos} combinations coherent=${combos - bad.length}, traces settle=${after.settled === after.traces.length}, focus→result=${after.focus === 'fysp-result-title'}, keyboard ok=${k1 === 'funding' && k2 === 'true' && k3 === 'individual'}`);
  await ctx.close();
}
{
  // Mobile: stacked selectors, decorative field hidden, tap works, no overflow after reveal, all targets ≥44px.
  const ctx = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  const stacked = await page.evaluate(() => {
    const g = document.querySelectorAll('.fysp-group');
    const a = g[0].getBoundingClientRect(), b = g[1].getBoundingClientRect();
    return { stacked: b.top >= a.bottom - 1, field: getComputedStyle(document.querySelector('.fysp-field')).display };
  });
  if (!stacked.stacked) failures.push('fysp mobile: need and audience groups are not stacked');
  if (stacked.field !== 'none') failures.push(`fysp mobile: decorative field visible (${stacked.field})`);
  await page.tap('.opt[data-need="compliance"]');
  await page.tap('.opt[data-audience="agency"]');
  await page.waitForTimeout(1600);
  const m = await page.evaluate(() => ({
    card: !!document.querySelector('#fysp-result .card'),
    scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
    small: [...document.querySelectorAll('#find-your-starting-point .opt, #fysp-result a')].filter((el) => el.getBoundingClientRect().height < 44).length,
    below: (() => { const r = document.querySelector('.fysp-result-wrap').getBoundingClientRect(); const g = document.querySelectorAll('.fysp-group')[1].getBoundingClientRect(); return r.top >= g.bottom - 1; })(),
  }));
  if (!m.card) failures.push('fysp mobile: result did not render after taps');
  if (m.scroll > m.client) failures.push(`fysp mobile: horizontal overflow after reveal ${m.scroll}/${m.client}`);
  if (m.small) failures.push(`fysp mobile: ${m.small} touch target(s) under 44px`);
  if (!m.below) failures.push('fysp mobile: result is not below the audience selector');
  await page.screenshot({ path: join(outDir, 'index-mobile-fysp-compliance-agency.png'), fullPage: true, animations: 'disabled', clip: { x: 0, y: (await page.evaluate(() => document.getElementById('find-your-starting-point').getBoundingClientRect().top + window.scrollY)), width: 375, height: 1400 } });
  report.push(`fysp mobile: stacked=${stacked.stacked}, field hidden=${stacked.field === 'none'}, result ok=${m.card}, overflow=${m.scroll > m.client}, small targets=${m.small}`);
  await ctx.close();
}
{
  // No-JS fallback: selector hidden, six static starting points and the audience summaries are visible.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  const nj = await page.evaluate(() => ({
    staticShown: getComputedStyle(document.querySelector('.fysp-static')).display !== 'none',
    points: document.querySelectorAll('.fysp-static .sp').length,
    boundary: /does not provide legal advice or legal representation/.test(document.querySelector('.fysp-static').textContent),
    audiences: document.querySelectorAll('.audience-grid .audience').length,
    practices: document.querySelectorAll('.practice').length,
  }));
  if (!nj.staticShown || nj.points !== 7 || !nj.boundary) failures.push(`no-js: static starting points shown=${nj.staticShown} count=${nj.points} boundary=${nj.boundary}`);
  if (nj.audiences !== 6 || nj.practices !== 5) failures.push(`no-js: audiences=${nj.audiences} practices=${nj.practices}`);
  report.push(`no-js: static starting points=${nj.points}, audiences=${nj.audiences}, practices=${nj.practices}`);
  await ctx.close();
}

{
  // Contact details forms: required-field guard, then a mailto: to the approved address with the fields in the body.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  const fitForm = await page.evaluate(() => { const f = document.getElementById('reach-fit'); return f ? { action: f.getAttribute('action'), fields: [...f.querySelectorAll('input, textarea')].map((i) => i.name) } : null; });
  if (!fitForm || fitForm.action !== 'mailto:info@puzzlerconsultingadvisory.com' || fitForm.fields.join() !== 'Name,Organization,Email,Phone,Note') failures.push(`reach: Fit Call form wrong (${JSON.stringify(fitForm)})`);
  await page.click('#reach-fit button[type="submit"]');
  const guarded = await page.evaluate(() => ({ err: !document.querySelector('#reach-fit .reach-error').hidden, focus: document.activeElement.id, mailto: document.getElementById('reach-fit').getAttribute('data-mailto') }));
  if (!guarded.err || guarded.focus !== 'reach-fit-name' || guarded.mailto) failures.push(`reach: empty submit not guarded (${JSON.stringify(guarded)})`);
  await page.fill('#reach-fit-name', 'Test Person'); await page.fill('#reach-fit-org', 'Example Org'); await page.fill('#reach-fit-email', 'test@example.com'); await page.fill('#reach-fit-phone', '555-0100'); await page.fill('#reach-fit-note', 'Following up');
  await page.click('#reach-fit button[type="submit"]');
  await page.waitForTimeout(300);
  const built = await page.evaluate(() => document.getElementById('reach-fit').getAttribute('data-mailto') || '');
  const dec = decodeURIComponent(built);
  if (!/^mailto:info@puzzlerconsultingadvisory\.com\?subject=Fit%20Call%20request&body=/.test(built) || !/Name: Test Person\nOrganization: Example Org\nEmail: test@example.com\nPhone: 555-0100\nNote: Following up/.test(dec)) failures.push(`reach: mailto not built correctly (${dec.slice(0, 160)})`);
  // Result-card form carries the starting point and audience.
  await page.click('.opt[data-need="story"]'); await page.click('.opt[data-audience="foundation"]');
  await page.waitForSelector('#fysp-result .card details.reach', { timeout: 3000 }).catch(() => failures.push('reach: result form missing'));
  const rform = await page.evaluate(() => { const f = document.querySelector('#fysp-result .reach-form'); return f ? { subject: f.dataset.subject, context: f.dataset.context } : null; });
  if (!rform || rform.subject !== 'Fit Call follow-up: Digital Storytelling' || !/Foundation or philanthropy/.test(rform.context)) failures.push(`reach: result form context wrong (${JSON.stringify(rform)})`);
  report.push(`reach: fit form ok=${!!fitForm}, guard ok=${guarded.err && !guarded.mailto}, mailto ok=${/Fit%20Call%20request/.test(built)}, result form ok=${!!rform}`);
  await ctx.close();
}

{
  // Form service path: with data-form-endpoint set, the details are POSTed as JSON and a confirmation replaces the form.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  let posted = null;
  await page.route('https://forms.example.test/f/abc', async (route) => { posted = JSON.parse(route.request().postData() || '{}'); await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  // Serve the homepage with the endpoint filled in, exactly as the owner would configure it.
  await page.route(base + '/', async (route) => { const html = await readFile(join(root, 'index.html'), 'utf8'); await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html.replace('data-form-endpoint=""', 'data-form-endpoint="https://forms.example.test/f/abc"') }); });
  await page.goto(base + '/', { waitUntil: 'load' });
  const cfg = await page.evaluate(() => { const f = document.getElementById('reach-fit'); return { action: f.getAttribute('action'), help: f.querySelector('.reach-help').textContent, honeypot: !!f.querySelector('[name="_gotcha"]') }; });
  if (cfg.action !== 'https://forms.example.test/f/abc' || /email app/.test(cfg.help) || !cfg.honeypot) failures.push(`form-service: form not configured (${JSON.stringify(cfg)})`);
  await page.fill('#reach-fit-name', 'Test Person'); await page.fill('#reach-fit-email', 'test@example.com'); await page.fill('#reach-fit-org', 'Example Org');
  await page.click('#reach-fit button[type="submit"]');
  await page.waitForSelector('.fit .reach-done', { timeout: 3000 }).catch(() => failures.push('form-service: confirmation did not appear'));
  const done = await page.evaluate(() => ({ text: (document.querySelector('.fit .reach-done') || {}).textContent, focus: document.activeElement.className, formGone: !document.getElementById('reach-fit') }));
  if (!posted || posted.Name !== 'Test Person' || posted.Email !== 'test@example.com' || posted.Organization !== 'Example Org' || posted._subject !== 'Fit Call request') failures.push(`form-service: posted payload wrong (${JSON.stringify(posted)})`);
  if (!done.formGone || done.focus !== 'reach-done' || !/Thanks, Test Person/.test(done.text || '')) failures.push(`form-service: confirmation state wrong (${JSON.stringify(done)})`);
  // Service failure falls back to mailto.
  await page.unroute('https://forms.example.test/f/abc');
  await page.route('https://forms.example.test/f/abc', (route) => route.fulfill({ status: 500, body: 'nope' }));
  await page.click('.opt[data-need="idea"]'); await page.click('.opt[data-audience="emerging"]');
  await page.waitForSelector('#fysp-result .reach-form', { state: 'attached', timeout: 3000 });
  await page.evaluate(() => { document.querySelector('#fysp-result details.reach').open = true; });
  await page.fill('#fysp-result [name="Name"]', 'Fallback Person'); await page.fill('#fysp-result [name="Email"]', 'fb@example.com');
  await page.click('#fysp-result .reach-form button[type="submit"]');
  await page.waitForFunction(() => { const f = document.querySelector('#fysp-result .reach-form'); return f && !f.querySelector('.reach-error').hidden; }, null, { timeout: 3000 }).catch(() => failures.push('form-service: failure fallback message did not appear'));
  const fb = await page.evaluate(() => { const f = document.querySelector('#fysp-result .reach-form'); return { mailto: f.getAttribute('data-mailto'), msg: f.querySelector('.reach-error').textContent }; });
  if (!/^mailto:info@puzzlerconsultingadvisory\.com\?subject=Fit%20Call%20follow-up%3A%20Strategic%20Roadmap/.test(fb.mailto || '') || !/email app/.test(fb.msg)) failures.push(`form-service: fallback wrong (${JSON.stringify(fb)})`);
  report.push(`form-service: configured=${cfg.action === 'https://forms.example.test/f/abc'}, posted ok=${!!posted && posted.Name === 'Test Person'}, confirmation=${done.formGone}, failure→mailto=${/Strategic%20Roadmap/.test(fb.mailto || '')}`);
  await ctx.close();
}

{
  // Hero dimension callout: real link, line placed under the text, one-shot hover flicker, static under reduced motion.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3600);
  const geo = await page.evaluate(() => {
    const f = document.querySelector('.hero-field'), a = document.querySelector('.hero-dim'), l = document.getElementById('hero-dim-lines');
    const fr = f.getBoundingClientRect(), ar = a.getBoundingClientRect(), scale = fr.width / 1200;
    const y = parseFloat(l.querySelector('.dim-line').getAttribute('d').split(' ')[1]);
    const linePx = fr.top + y * scale;
    return { href: a.getAttribute('href'), text: a.textContent.replace(/\s+/g, ' ').trim(), height: ar.height, lineBelowText: linePx > ar.bottom + 4, dash: getComputedStyle(l.querySelector('.dim-line')).strokeDashoffset, ticks: getComputedStyle(l.querySelector('.dim-tick')).opacity, settled: l.querySelectorAll('.settled').length, fieldHidden: f.getAttribute('aria-hidden') };
  });
  if (geo.href !== '#find-your-starting-point') failures.push(`hero-dim: href ${geo.href}`);
  if (!/Want to know where to start\? Click here to find your starting point/.test(geo.text)) failures.push(`hero-dim: label text "${geo.text}"`);
  if (!geo.lineBelowText) failures.push('hero-dim: dimension line overlaps the label');
  if (parseFloat(geo.dash) !== 0 || geo.ticks !== '1' || geo.settled < 3) failures.push(`hero-dim: line did not draw and settle (dash ${geo.dash}, ticks ${geo.ticks}, settled ${geo.settled})`);
  if (geo.fieldHidden === 'true') failures.push('hero-dim: field is aria-hidden, link unreachable by assistive tech');
  if (geo.height < 44) failures.push(`hero-dim: link height ${geo.height}px`);
  await page.hover('.hero-dim');
  const hov = await page.evaluate(() => ({ dim: getComputedStyle(document.querySelector('#hero-dim-lines .dim')).animationName, ext: getComputedStyle(document.querySelector('#hero-dim-lines .ext')).animationName, iter: getComputedStyle(document.querySelector('#hero-dim-lines .dim')).animationIterationCount }));
  if (hov.dim !== 'bp-flicker' || hov.ext !== 'bp-flicker' || hov.iter !== '1') failures.push(`hero-dim: hover flicker not applied once (${JSON.stringify(hov)})`);
  // Keyboard: the callout is a tab stop right after the hero buttons, and focus also flickers the lines.
  await page.focus('.hero-actions .btn-outline'); await page.keyboard.press('Tab');
  const foc = await page.evaluate(() => ({ el: document.activeElement.className, anim: getComputedStyle(document.querySelector('#hero-dim-lines .dim')).animationName }));
  if (foc.el !== 'hero-dim' || foc.anim !== 'bp-flicker') failures.push(`hero-dim: keyboard focus (${JSON.stringify(foc)})`);
  await ctx.close();
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rpage = await rctx.newPage();
  await rpage.goto(base + '/', { waitUntil: 'load' });
  await rpage.hover('.hero-dim');
  const rm = await rpage.evaluate(() => ({ dash: getComputedStyle(document.querySelector('#hero-dim-lines .dim-line')).strokeDashoffset, ext: getComputedStyle(document.querySelector('#hero-dim-lines .ext')).opacity, anim: getComputedStyle(document.querySelector('#hero-dim-lines .dim')).animationName }));
  if (parseFloat(rm.dash) !== 0 || rm.ext !== '1' || rm.anim !== 'none') failures.push(`hero-dim reduced-motion: ${JSON.stringify(rm)}`);
  await rctx.close();
  const mctx = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  const mpage = await mctx.newPage();
  await mpage.goto(base + '/', { waitUntil: 'load' });
  const mob = await mpage.evaluate(() => { const a = document.querySelector('.hero-dim'); const r = a.getBoundingClientRect(); const f = document.querySelector('.hero-field').getBoundingClientRect(); const l = document.getElementById('hero-dim-lines'); const y = parseFloat(l.querySelector('.dim-line').getAttribute('d').split(' ')[1]); return { h: r.height, inside: r.left >= 0 && r.right <= document.documentElement.clientWidth, below: r.top >= f.bottom, lineBelow: f.top + y * (f.width / 1200) > r.bottom, scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }; });
  if (mob.h < 44 || !mob.inside || !mob.below || !mob.lineBelow || mob.scroll > mob.client) failures.push(`hero-dim mobile: ${JSON.stringify(mob)}`);
  report.push(`hero-dim: link ok=${geo.href === '#find-your-starting-point'}, line below text=${geo.lineBelowText}, settled=${geo.settled >= 3}, hover flicker=${hov.dim === 'bp-flicker'}, reduced-motion static=${rm.anim === 'none'}, mobile ok=${mob.below && mob.lineBelow}`);
  await mctx.close();
}

await browser.close();
server.close();

const md = [`# verify report`, `base: ${base}`, '', ...report, '', failures.length ? `## FAILURES (${failures.length})` : '## PASS', ...failures.map((f) => '- ' + f)].join('\n');
await writeFile(join(here, 'output', 'report.md'), md);
console.log(md);
process.exit(failures.length ? 1 : 0);
