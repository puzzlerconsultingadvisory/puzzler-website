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
  const hidden = await page.evaluate(() => [...document.querySelectorAll('.method-slides .slide')].filter((d) => !d.hidden).map((d) => d.dataset.step));
  if (hidden.join() !== '4') failures.push(`method: visible slides expected [4], got [${hidden}]`);

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
  await page.evaluate(() => document.querySelector('.step-btn[data-step="7"]').click());   /* strip is hidden on phones; arrows remain */
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
  const NEEDS = ['idea', 'funding', 'growing', 'change', 'systems', 'story', 'contracts', 'compliance'];
  const AUDS = ['individual', 'emerging', 'nonprofit', 'agency', 'foundation', 'business', 'contractor'];
  // Live region + semantics present before any interaction.
  const sem = await page.evaluate(() => ({
    live: document.getElementById('fysp-result').getAttribute('aria-live'),
    atomic: document.getElementById('fysp-result').getAttribute('aria-atomic'),
    buttons: [...document.querySelectorAll('#find-your-starting-point .opt')].every((b) => b.tagName === 'BUTTON' && b.getAttribute('type') === 'button' && b.getAttribute('aria-pressed') === 'false'),
    count: document.querySelectorAll('#find-your-starting-point .opt').length,
    emailInputs: document.querySelectorAll('#find-your-starting-point input').length,
    audienceSummaries: document.querySelectorAll('.audience-grid .audience').length,
    fitStatement: /We are not the right firm for federal contract advocacy on behalf of clients, financial-distress turnarounds, or executive search\. Puzzler advises and prepares\. Puzzler does not represent clients before federal agencies or lobby on their behalf\./.test(document.querySelector('.fit-statement').textContent),
    shapes: document.querySelectorAll('.shape-list li').length,
    fractionalRoles: /chief operating officer, grants and contracts director, compliance officer, or transformation and modernization lead/.test(document.querySelector('.shapes').textContent),
    ways: document.querySelectorAll('.ways-grid .way').length,
    waysFractional: [...document.querySelectorAll('.ways-grid .way')].some((w) => /Retain fractional leadership/.test(w.textContent) && w.getAttribute('href') === 'mailto:info@puzzlerconsultingadvisory.com?subject=Fractional%20support'),
    waysSpeaking: [...document.querySelectorAll('.ways-grid .way')].some((w) => /Invite Mark to Speak/.test(w.textContent) && w.getAttribute('href') === '#speaking-inquiry') && !!document.querySelector('#speaking-inquiry.reach #reach-speak'),
    priceOrHours: /\$\d|\b\d+\s*(?:hours|hrs|-hour)\b/.test(document.getElementById('practices').textContent),
    revenueExclusion: /\$2\s?M|2 million/i.test(document.body.textContent),
    whoWeServeSection: !!document.getElementById('who-we-serve'),
  }));
  if (sem.live !== 'polite' || sem.atomic !== 'true') failures.push(`fysp: result region aria-live=${sem.live} aria-atomic=${sem.atomic}`);
  if (!sem.buttons || sem.count !== 15) failures.push(`fysp: expected 15 semantic toggle buttons, got ${sem.count} (semantic=${sem.buttons})`);
  if (sem.emailInputs) failures.push('fysp: an input field is present before any result (no email gate allowed)');
  if (sem.audienceSummaries !== 7) failures.push(`fysp: expected 7 static audience summaries, got ${sem.audienceSummaries}`);
  if (!sem.fitStatement) failures.push('fysp: approved fit statement (with boundary sentence) missing');
  if (sem.shapes !== 4 || !sem.fractionalRoles) failures.push(`fractional: engagement strip wrong (shapes=${sem.shapes}, roles=${sem.fractionalRoles})`);
  if (!sem.waysSpeaking) failures.push('ways: the speaking card should open the speaking inquiry form');
  if (sem.ways !== 5 || !sem.waysFractional) failures.push(`fractional: Ways to Begin card wrong (ways=${sem.ways}, card=${sem.waysFractional})`);
  if (sem.priceOrHours) failures.push('build: a price or hour claim appeared in Build It to Hold');
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
        if (links.some((l) => !/^(https:\/\/calendly\.com|mailto:info@puzzlerconsultingadvisory\.com|#roadmap-inquiry$)/.test(l.href))) problems.push('CTA to unapproved destination');
        if (n === 'idea') {
          const rd = card.querySelector('details.reach#roadmap-inquiry'); const ta = rd && rd.querySelector('textarea[name="Starting point"]');
          const clean = (el) => { const c = el.cloneNode(true); c.querySelectorAll('.flag, .visually-hidden').forEach((x) => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
          const needLabel = clean(document.querySelector('.opt[data-need="idea"]')); const audLabel = clean(document.querySelector(`.opt[data-audience="${a}"]`));
          if (!rd || !ta) problems.push('roadmap inquiry form missing');
          else {
            const v = ta.value;
            if (rf.getAttribute('data-endpoint') !== 'https://formspree.io/f/maeyvvew' || rf.dataset.subject !== 'Strategic Roadmap inquiry') problems.push(`roadmap form endpoint/subject ${rf.getAttribute('data-endpoint')} ${rf.dataset.subject}`);
            if (!/^Recommended starting point: Strategic Roadmap\n/.test(v) || !v.includes('Step 1, what I am working through: ' + needLabel) || !v.includes('Step 2, who I am: ' + audLabel) || !v.includes(q('.core').textContent.trim()) || !v.includes(q('.angle').textContent.trim())) problems.push('roadmap summary incomplete');
            if (!links[1] || links[1].label.indexOf('Contact us about a roadmap') === -1 || links[1].href !== '#roadmap-inquiry') problems.push('roadmap link wrong');
          }
        } else if (card.querySelector('textarea[name="Starting point"]')) problems.push('starting-point summary on a non-roadmap result');
        if (n === 'contracts' && !/does not represent clients before federal agencies or lobby/.test(text)) problems.push('contracting boundary missing');
        if (['growing', 'change', 'systems', 'contracts'].includes(n) !== !!card.querySelector('.fractional')) problems.push('fractional line wrong');
        if (n === 'compliance') {
          if (!/does not provide legal advice or legal representation/.test(text)) problems.push('compliance boundary missing');
          if (links[0].href !== 'mailto:info@puzzlerconsultingadvisory.com?subject=Compliance%20Triage%20Request') problems.push('compliance primary CTA wrong');
          if (!links[1] || links[1].label.indexOf('Book a Fit Call') === -1) problems.push('compliance secondary CTA missing');
        }
        if (/guarantee|24-hour|same-day|legal advice(?! or)/i.test(text.replace(/does not provide legal advice or legal representation/, ''))) problems.push('unapproved promise language');
        if (relevant !== 3) problems.push(`foundation highlights=${relevant}`);
        if (n === 'story' && !chips.includes('Digital Storytelling')) problems.push('storytelling practice not chipped');
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
  const step2Before = await page.evaluate(() => ({ awaiting: document.getElementById('find-your-starting-point').classList.contains('awaiting'), optsHidden: getComputedStyle(document.querySelector('.fysp-options[data-group="audience"]')).display === 'none', hint: getComputedStyle(document.querySelector('.step2-hint')).display !== 'none', twoCol: getComputedStyle(document.querySelector('.fysp-options[data-group="need"]')).gridTemplateColumns.split(' ').length === 2 }));
  await page.tap('.opt[data-need="compliance"]');
  await page.waitForTimeout(300);
  const step2After = await page.evaluate(() => ({ awaiting: document.getElementById('find-your-starting-point').classList.contains('awaiting'), optsShown: getComputedStyle(document.querySelector('.fysp-options[data-group="audience"]')).display !== 'none' }));
  if (!step2Before.awaiting || !step2Before.optsHidden || !step2Before.hint || !step2Before.twoCol || step2After.awaiting || !step2After.optsShown) failures.push(`fysp mobile: Step 2 disclosure ${JSON.stringify(step2Before)} ${JSON.stringify(step2After)}`);
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
  report.push(`fysp mobile: stacked=${stacked.stacked}, field hidden=${stacked.field === 'none'}, two columns=${step2Before.twoCol}, step 2 waits=${step2Before.optsHidden && step2After.optsShown}, result ok=${m.card}, overflow=${m.scroll > m.client}, small targets=${m.small}`);
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
  if (!nj.staticShown || nj.points !== 8 || !nj.boundary) failures.push(`no-js: static starting points shown=${nj.staticShown} count=${nj.points} boundary=${nj.boundary}`);
  if (nj.audiences !== 7 || nj.practices !== 6) failures.push(`no-js: audiences=${nj.audiences} practices=${nj.practices}`);
  const njSlider = await page.evaluate(() => ({ ctlHidden: document.querySelector('.aud-ctl').hidden && getComputedStyle(document.querySelector('.aud-ctl')).display === 'none', grid: getComputedStyle(document.querySelector('.audience-grid')).display, slider: document.querySelector('.audiences').classList.contains('is-slider') }));
  if (!njSlider.ctlHidden || njSlider.grid !== 'grid' || njSlider.slider) failures.push(`no-js: audience slider should not be active: ${JSON.stringify(njSlider)}`);
  report.push(`no-js: static starting points=${nj.points}, audiences=${nj.audiences}, practices=${nj.practices}`);
  await ctx.close();
}

{
  // Contact details forms without a service (endpoint blanked): required-field guard, then a mailto: to the
  // approved address with the fields in the body. The live page carries the Formspree endpoint (checked below).
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.route(base + '/', async (route) => { const html = await readFile(join(root, 'index.html'), 'utf8'); await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html.replace(/data-form-endpoint="[^"]*"/, 'data-form-endpoint=""') }); });
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
  // Form service path on the live page: data-form-endpoint is the owner's Formspree form; the details are POSTed
  // there as JSON and a confirmation replaces the form. The endpoint is intercepted here, never called.
  const ENDPOINT = 'https://formspree.io/f/mqpknwoe';
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  let posted = null;
  await page.route(ENDPOINT, async (route) => { posted = JSON.parse(route.request().postData() || '{}'); await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await page.goto(base + '/', { waitUntil: 'load' });
  const live = await page.evaluate(() => document.documentElement.getAttribute('data-form-endpoint'));
  if (live !== ENDPOINT) failures.push(`form-service: live endpoint is "${live}"`);
  const privacy = await readFile(join(root, 'privacy.html'), 'utf8');
  if (!/Formspree/.test(privacy)) failures.push('form-service: the Privacy Notice does not name Formspree');
  const cfg = await page.evaluate(() => { const f = document.getElementById('reach-fit'); return { action: f.getAttribute('action'), help: f.querySelector('.reach-help').textContent, honeypot: !!f.querySelector('[name="_gotcha"]') }; });
  if (cfg.action !== ENDPOINT || /email app/.test(cfg.help) || !cfg.honeypot) failures.push(`form-service: form not configured (${JSON.stringify(cfg)})`);
  await page.fill('#reach-fit-name', 'Test Person'); await page.fill('#reach-fit-email', 'test@example.com'); await page.fill('#reach-fit-org', 'Example Org');
  await page.click('#reach-fit button[type="submit"]');
  await page.waitForSelector('.fit .reach-done', { timeout: 3000 }).catch(() => failures.push('form-service: confirmation did not appear'));
  const done = await page.evaluate(() => ({ text: (document.querySelector('.fit .reach-done') || {}).textContent, focus: document.activeElement.className, formGone: !document.getElementById('reach-fit') }));
  if (!posted || posted.Name !== 'Test Person' || posted.Email !== 'test@example.com' || posted.Organization !== 'Example Org' || posted._subject !== 'Fit Call request') failures.push(`form-service: posted payload wrong (${JSON.stringify(posted)})`);
  if (!done.formGone || done.focus !== 'reach-done' || !/Thanks, Test Person/.test(done.text || '')) failures.push(`form-service: confirmation state wrong (${JSON.stringify(done)})`);
  // Service failure falls back to mailto (a result-card form on the general endpoint).
  await page.unroute(ENDPOINT);
  await page.route(ENDPOINT, (route) => route.fulfill({ status: 500, body: 'nope' }));
  await page.click('.opt[data-need="funding"]'); await page.click('.opt[data-audience="emerging"]');
  await page.waitForSelector('#fysp-result .reach-form', { state: 'attached', timeout: 3000 });
  await page.evaluate(() => { document.querySelector('#fysp-result details.reach').open = true; });
  await page.fill('#fysp-result [name="Name"]', 'Fallback Person'); await page.fill('#fysp-result [name="Email"]', 'fb@example.com');
  await page.click('#fysp-result .reach-form button[type="submit"]');
  await page.waitForFunction(() => { const f = document.querySelector('#fysp-result .reach-form'); return f && !f.querySelector('.reach-error').hidden; }, null, { timeout: 3000 }).catch(() => failures.push('form-service: failure fallback message did not appear'));
  const fb = await page.evaluate(() => { const f = document.querySelector('#fysp-result .reach-form'); return { mailto: f.getAttribute('data-mailto'), msg: f.querySelector('.reach-error').textContent }; });
  if (!/^mailto:info@puzzlerconsultingadvisory\.com\?subject=Fit%20Call%20follow-up%3A%20Funding%20Landscape%20and%20Readiness/.test(fb.mailto || '') || !/email app/.test(fb.msg)) failures.push(`form-service: fallback wrong (${JSON.stringify(fb)})`);
  // Roadmap inquiry: the Strategic Roadmap result's link opens a pre-filled form on its own endpoint.
  const ROADMAP = 'https://formspree.io/f/maeyvvew';
  let road = null;
  await page.route(ROADMAP, async (route) => { road = JSON.parse(route.request().postData() || '{}'); await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await page.click('.opt[data-need="funding"]');   // clear
  await page.click('.opt[data-need="idea"]'); await page.click('.opt[data-audience="nonprofit"]');
  await page.waitForSelector('#fysp-result #roadmap-inquiry', { state: 'attached', timeout: 3000 });
  const before = await page.evaluate(() => ({ open: document.getElementById('roadmap-inquiry').open, link: (document.querySelector('#fysp-result .actions a[href="#roadmap-inquiry"]') || {}).textContent }));
  await page.click('#fysp-result .actions a[href="#roadmap-inquiry"]');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ open: document.getElementById('roadmap-inquiry').open, focus: document.activeElement.name, summary: document.querySelector('#roadmap-inquiry textarea[name="Starting point"]').value, action: document.querySelector('#roadmap-inquiry form').getAttribute('action') }));
  if (before.open || !/Contact us about a roadmap/.test(before.link || '') || !after.open || after.focus !== 'Name' || after.action !== ROADMAP || !/Step 1, what I am working through: I’m starting with an idea/.test(after.summary) || !/Step 2, who I am: Nonprofit/.test(after.summary)) failures.push(`roadmap form: open ${JSON.stringify(before)} ${JSON.stringify({ ...after, summary: after.summary.slice(0, 80) })}`);
  await page.fill('#roadmap-inquiry [name="Name"]', 'Idea Person'); await page.fill('#roadmap-inquiry [name="Email"]', 'idea@example.com');
  await page.click('#roadmap-inquiry button[type="submit"]');
  await page.waitForSelector('#fysp-result .reach-done', { timeout: 3000 }).catch(() => failures.push('roadmap form: confirmation did not appear'));
  if (!road || road._subject !== 'Strategic Roadmap inquiry' || road.Name !== 'Idea Person' || !/Recommended starting point: Strategic Roadmap/.test(road['Starting point'] || '') || !/Step 2, who I am: Nonprofit/.test(road['Starting point'] || '') || !/Strategic Roadmap \/ Nonprofit/.test(road.Context || '')) failures.push(`roadmap form: posted payload wrong (${JSON.stringify(road)})`);
  if (posted && posted._subject === 'Strategic Roadmap inquiry') failures.push('roadmap form: posted to the general endpoint');
  // Roadmap failure falls back to a mailto with its own subject and the summary in the body.
  const rpage2 = await ctx.newPage();
  await rpage2.route(ROADMAP, (route) => route.fulfill({ status: 500, body: 'nope' }));
  await rpage2.goto(base + '/', { waitUntil: 'load' });
  await rpage2.click('.opt[data-need="idea"]'); await rpage2.click('.opt[data-audience="agency"]');
  await rpage2.waitForSelector('#fysp-result #roadmap-inquiry', { state: 'attached', timeout: 3000 });
  await rpage2.evaluate(() => { document.getElementById('roadmap-inquiry').open = true; });
  await rpage2.fill('#roadmap-inquiry [name="Name"]', 'Road Fallback'); await rpage2.fill('#roadmap-inquiry [name="Email"]', 'rf@example.com');
  await rpage2.click('#roadmap-inquiry button[type="submit"]');
  await rpage2.waitForFunction(() => !document.querySelector('#roadmap-inquiry .reach-error').hidden, null, { timeout: 3000 }).catch(() => failures.push('roadmap form: failure fallback message did not appear'));
  const rfb = await rpage2.evaluate(() => decodeURIComponent(document.querySelector('#roadmap-inquiry form').getAttribute('data-mailto') || ''));
  if (!/^mailto:info@puzzlerconsultingadvisory\.com\?subject=Strategic Roadmap inquiry&body=/.test(rfb) || !/Starting point: Recommended starting point: Strategic Roadmap/.test(rfb) || !/Step 2, who I am: State or local agency/.test(rfb)) failures.push(`roadmap form: fallback wrong (${rfb.slice(0, 200)})`);
  await rpage2.close();
  report.push(`roadmap form: link opens=${after.open && after.focus === 'Name'}, summary ok=${/Step 2, who I am: Nonprofit/.test(after.summary)}, posted ok=${!!road && road._subject === 'Strategic Roadmap inquiry'}, failure→mailto=${/Strategic Roadmap inquiry/.test(rfb)}`);
  // Speaking inquiry: its own Formspree form; the Ways to Begin card opens it and focuses the first field.
  const SPEAK = 'https://formspree.io/f/mqpknnke';
  let spoken = null;
  await page.route(SPEAK, async (route) => { spoken = JSON.parse(route.request().postData() || '{}'); await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  const speakCfg = await page.evaluate(() => { const f = document.getElementById('reach-speak'); return { action: f.getAttribute('action'), open: document.getElementById('speaking-inquiry').open, fields: [...f.querySelectorAll('input, textarea')].map((i) => i.name).filter((n) => n !== '_gotcha').join() }; });
  await page.click('.ways-grid .way[href="#speaking-inquiry"]');
  const scrolled = await page.waitForFunction(() => { const r = document.getElementById('speaking-inquiry').getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight; }, null, { timeout: 4000 }).then(() => true).catch(() => false);
  const opened = await page.evaluate(() => ({ open: document.getElementById('speaking-inquiry').open, focus: document.activeElement.id, inView: (() => { const r = document.getElementById('speaking-inquiry').getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight; })() }));
  opened.inView = opened.inView && scrolled;
  if (speakCfg.action !== SPEAK || speakCfg.open || speakCfg.fields !== 'Name,Organization,Email,Phone,Event' || !opened.open || opened.focus !== 'reach-speak-name' || !opened.inView) failures.push(`speaking form: setup ${JSON.stringify(speakCfg)} opened ${JSON.stringify(opened)}`);
  await page.fill('#reach-speak-name', 'Host Person'); await page.fill('#reach-speak-email', 'host@example.com'); await page.fill('#reach-speak-org', 'Example Conference'); await page.fill('#reach-speak-event', 'Keynote, 300 people, October, on capacity building');
  await page.click('#reach-speak button[type="submit"]');
  await page.waitForSelector('#speaking-inquiry .reach-done', { timeout: 3000 }).catch(() => failures.push('speaking form: confirmation did not appear'));
  const spokeDone = await page.evaluate(() => ({ text: (document.querySelector('#speaking-inquiry .reach-done') || {}).textContent, gone: !document.getElementById('reach-speak'), color: getComputedStyle(document.querySelector('#speaking-inquiry .reach-done') || document.body).color }));
  if (!spoken || spoken.Name !== 'Host Person' || spoken.Email !== 'host@example.com' || spoken._subject !== 'Speaking inquiry' || !/Keynote/.test(spoken.Event || '') || spoken.Organization !== 'Example Conference') failures.push(`speaking form: posted payload wrong (${JSON.stringify(spoken)})`);
  if (!spokeDone.gone || !/Thanks, Host Person/.test(spokeDone.text || '')) failures.push(`speaking form: confirmation state wrong (${JSON.stringify(spokeDone)})`);
  if (posted && posted._subject === 'Speaking inquiry') failures.push('speaking form: posted to the general endpoint instead of its own');
  // Speaking form failure falls back to a mailto with its own subject (fresh page).
  const spage = await ctx.newPage();
  await spage.route(SPEAK, (route) => route.fulfill({ status: 500, body: 'nope' }));
  await spage.goto(base + '/#speaking-inquiry', { waitUntil: 'load' });
  await spage.waitForTimeout(200);
  const autoOpen = await spage.evaluate(() => document.getElementById('speaking-inquiry').open);
  await spage.fill('#reach-speak-name', 'Fallback Host'); await spage.fill('#reach-speak-email', 'fh@example.com');
  await spage.click('#reach-speak button[type="submit"]');
  await spage.waitForFunction(() => !document.querySelector('#reach-speak .reach-error').hidden, null, { timeout: 3000 }).catch(() => failures.push('speaking form: failure fallback message did not appear'));
  const sfb = await spage.evaluate(() => ({ mailto: document.getElementById('reach-speak').getAttribute('data-mailto') || '', msg: document.querySelector('#reach-speak .reach-error').textContent }));
  if (!autoOpen || !/^mailto:info@puzzlerconsultingadvisory\.com\?subject=Speaking%20inquiry&body=/.test(sfb.mailto) || !/Fallback%20Host/.test(sfb.mailto) || !/email app/.test(sfb.msg)) failures.push(`speaking form: fallback wrong autoOpen=${autoOpen} ${JSON.stringify(sfb)}`);
  await spage.close();
  report.push(`speaking form: own endpoint=${speakCfg.action === SPEAK}, opens from card=${opened.open && opened.focus === 'reach-speak-name'}, posted ok=${!!spoken && spoken._subject === 'Speaking inquiry'}, confirmation=${spokeDone.gone}, failure→mailto=${/Speaking%20inquiry/.test(sfb.mailto)}`);
  report.push(`form-service: live endpoint=${live === ENDPOINT}, privacy names Formspree=${/Formspree/.test(privacy)}, configured=${cfg.action === ENDPOINT}, posted ok=${!!posted && posted.Name === 'Test Person'}, confirmation=${done.formGone}, failure→mailto=${/Funding%20Landscape/.test(fb.mailto || '')}`);
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
  const mob = await mpage.evaluate(() => { const a = document.querySelector('.hero-dim'); const r = a.getBoundingClientRect(); return { h: r.height, visible: a.offsetParent !== null && r.width > 0, inside: r.left >= 0 && r.right <= document.documentElement.clientWidth, img: getComputedStyle(document.querySelector('.hero-field > img')).display, lines: getComputedStyle(document.getElementById('hero-dim-lines')).display, position: getComputedStyle(a).position, scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }; });
  if (mob.h < 44 || !mob.visible || !mob.inside || mob.img !== 'none' || mob.lines !== 'none' || mob.position !== 'static' || mob.scroll > mob.client) failures.push(`hero-dim mobile: ${JSON.stringify(mob)}`);
  report.push(`hero-dim: link ok=${geo.href === '#find-your-starting-point'}, line below text=${geo.lineBelowText}, settled=${geo.settled >= 3}, hover flicker=${hov.dim === 'bp-flicker'}, reduced-motion static=${rm.anim === 'none'}, phone: drawing hidden=${mob.img === 'none'}, callout kept=${mob.visible}`);
  await mctx.close();
}

{
  // Who we work with: puzzle-piece slider. All seven cards stay in the document; pieces interlock; fills and text
  // come from the approved palette and clear 4.5:1; controls page through; reduced motion scrolls instantly.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const PALETTE = ['#30A396', '#F5CF48', '#7ABF5F', '#1A1A2E', '#E94F4A', '#FFFFFF'];
  const geo = await page.evaluate(() => {
    const lum = (hex) => { const c = hex.slice(1).match(/../g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const wrap = document.querySelector('.audiences'); const track = document.getElementById('audience-track');
    const cards = [...track.children];
    const pw = parseFloat(track.style.getPropertyValue('--pw'));
    return {
      slider: wrap.classList.contains('is-slider'),
      ctlShown: getComputedStyle(wrap.querySelector('.aud-ctl')).display !== 'none',
      count: document.getElementById('aud-count').textContent.trim(),
      prevDisabled: document.getElementById('aud-prev').disabled, nextDisabled: document.getElementById('aud-next').disabled,
      dots: document.querySelectorAll('#aud-dots button').length,
      pw, trackWidth: track.clientWidth,
      cards: cards.map((c, i) => {
        const svg = c.querySelector(':scope > svg'); const piece = svg && svg.querySelector('.piece'); const seam = svg && svg.querySelector('.seam');
        const r = c.getBoundingClientRect(); const sr = svg.getBoundingClientRect(); const h4 = c.querySelector('h4').getBoundingClientRect();
        const fill = piece.getAttribute('fill').toUpperCase(); const text = c.style.getPropertyValue('--pc').trim().toUpperCase();
        const d = piece.getAttribute('d');
        return { fill, text, ratio: Math.round(ratio(fill, text) * 100) / 100, hasTab: /A20 20 0 1 1 \d+ \d+ H\d+ V/.test(d) && i < cards.length - 1, hasSocket: d.includes('H10 A20'), seam: !!seam.getAttribute('d'), width: r.width, svgW: sr.width, svgH: sr.height, cardH: r.height, textInset: h4.left - r.left, rendered: c.offsetParent !== null, h4Color: getComputedStyle(c.querySelector('h4')).color, pColor: getComputedStyle(c.querySelector('p')).color };
      }),
    };
  });
  if (!geo.slider || !geo.ctlShown) failures.push(`audience slider: not active (slider=${geo.slider} controls=${geo.ctlShown})`);
  if (geo.count !== '1–3 of 7' && geo.count !== 'Showing 1–3 of 7') failures.push(`audience slider: initial count "${geo.count}"`);
  if (!geo.prevDisabled || geo.nextDisabled || geo.dots !== 3) failures.push(`audience slider: initial controls prev=${geo.prevDisabled} next=${geo.nextDisabled} dots=${geo.dots}`);
  if (geo.cards.length !== 7 || geo.trackWidth !== geo.pw * 3) failures.push(`audience slider: cards=${geo.cards.length} track=${geo.trackWidth} pw=${geo.pw}`);
  geo.cards.forEach((c, i) => {
    const problems = [];
    if (!PALETTE.includes(c.fill) || !PALETTE.includes(c.text)) problems.push(`colours off-palette ${c.fill}/${c.text}`);
    if (c.ratio < 4.5) problems.push(`contrast ${c.ratio}`);
    if (i > 0 && !c.hasSocket) problems.push('missing socket');
    if (i === 0 && c.hasSocket) problems.push('first piece has a socket');
    if (i < 6 && (!c.hasTab || !c.seam)) problems.push('missing tab or seam');
    if (i === 6 && (c.hasTab || c.seam)) problems.push('last piece has a tab');
    if (Math.abs(c.svgW - (geo.pw + 48)) > 1 || Math.abs(c.svgH - c.cardH) > 1 || Math.abs(c.width - geo.pw) > 1) problems.push(`piece not drawn at card size svg=${c.svgW}x${c.svgH} card=${c.width}x${c.cardH}`);
    if (i > 0 && c.textInset < 50) problems.push(`text overlaps the socket (inset ${c.textInset})`);
    if (!c.rendered) problems.push('card not rendered');
    if (problems.length) failures.push(`audience slider card ${i + 1}: ${problems.join('; ')}`);
  });
  // Paging: next twice reaches the clamped last page (5–7), then the first dot returns to the start.
  const countIs = async (txt) => page.waitForFunction((t) => document.getElementById('aud-count').textContent.replace('Showing ', '').trim() === t, txt, { timeout: 3000 }).then(() => true).catch(() => false);
  await page.click('#aud-next');
  const p2 = await countIs('4–6 of 7');
  await page.click('#aud-next');
  const p3 = await countIs('5–7 of 7');
  const end = await page.evaluate(() => ({ next: document.getElementById('aud-next').disabled, prev: document.getElementById('aud-prev').disabled, current: [...document.querySelectorAll('#aud-dots button')].findIndex((b) => b.getAttribute('aria-current') === 'true'), scroll: document.getElementById('audience-track').scrollLeft, max: document.getElementById('audience-track').scrollWidth - document.getElementById('audience-track').clientWidth }));
  if (!p2 || !p3 || !end.next || end.prev || end.current !== 2 || Math.abs(end.scroll - end.max) > 1) failures.push(`audience slider paging: p2=${p2} p3=${p3} ${JSON.stringify(end)}`);
  await page.click('#aud-dots button[data-page="0"]');
  const back = await countIs('1–3 of 7');
  if (!back) failures.push('audience slider: first dot did not return to the start');
  const keyb = await page.evaluate(() => { const n = document.getElementById('aud-next'); n.focus(); return document.activeElement === n; });
  if (!keyb) failures.push('audience slider: next button not focusable');
  await page.keyboard.press('Enter');
  const viaKey = await countIs('4–6 of 7');
  if (!viaKey) failures.push('audience slider: Enter on the next button did not page');
  // The scroll region itself is a tab stop and pages with the arrow keys.
  const trackFocus = await page.evaluate(() => { const t = document.getElementById('audience-track'); t.focus(); return document.activeElement === t; });
  await page.keyboard.press('ArrowLeft');
  const arrowBack = await countIs('1–3 of 7');
  await page.keyboard.press('End');
  const endKey = await countIs('5–7 of 7');
  if (!trackFocus || !arrowBack || !endKey) failures.push(`audience slider keyboard: track focus=${trackFocus} ArrowLeft=${arrowBack} End=${endKey}`);
  await ctx.close();

  // Reduced motion: the move is instant.
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rpage = await rctx.newPage();
  await rpage.goto(base + '/', { waitUntil: 'load' });
  await rpage.waitForTimeout(300);
  const rm = await rpage.evaluate(() => { document.getElementById('aud-next').click(); const t = document.getElementById('audience-track'); return { scroll: t.scrollLeft, expected: parseFloat(t.style.getPropertyValue('--pw')) * 3 }; });
  if (Math.abs(rm.scroll - rm.expected) > 1) failures.push(`audience slider reduced motion: scrollLeft=${rm.scroll} expected ${rm.expected}`);
  await rctx.close();

  // Tablet: two per view, four pages.
  const tctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tpage = await tctx.newPage();
  await tpage.goto(base + '/', { waitUntil: 'load' });
  await tpage.waitForTimeout(300);
  const tab = await tpage.evaluate(() => ({ count: document.getElementById('aud-count').textContent.replace('Showing ', '').trim(), dots: document.querySelectorAll('#aud-dots button').length }));
  if (tab.count !== '1–2 of 7' || tab.dots !== 4) failures.push(`audience slider tablet: ${JSON.stringify(tab)}`);
  await tctx.close();

  // Phone: one per view, the track follows the visible piece's own height, targets ≥ 44px, no page overflow.
  const mctx = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  const mpage = await mctx.newPage();
  await mpage.goto(base + '/', { waitUntil: 'load' });
  await mpage.waitForTimeout(300);
  const foldedBefore = await mpage.evaluate(() => !document.getElementById('fold-audiences').classList.contains('is-open') && getComputedStyle(document.getElementById('fold-audiences-body')).display === 'none');
  await mpage.evaluate(() => { document.getElementById('fold-audiences-btn').scrollIntoView({ block: 'center' }); });
  await mpage.tap('#fold-audiences-btn');
  await mpage.waitForTimeout(400);
  if (!foldedBefore) failures.push('audience slider phone: the fold should start closed');
  const m1 = await mpage.evaluate(() => { const t = document.getElementById('audience-track'); const c = t.children; return { count: document.getElementById('aud-count').textContent.replace('Showing ', '').trim(), trackH: t.getBoundingClientRect().height, firstH: c[0].getBoundingClientRect().height, lastH: c[6].getBoundingClientRect().height, dots: document.querySelectorAll('#aud-dots button').length, targets: [...document.querySelectorAll('.aud-btn, #aud-dots button')].every((b) => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().width >= 44), scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }; });
  if (m1.count !== '1 of 7' || Math.abs(m1.trackH - m1.firstH) > 2 || m1.lastH <= m1.firstH || m1.dots !== 7 || !m1.targets || m1.scroll > m1.client) failures.push(`audience slider phone: ${JSON.stringify(m1)}`);
  await mpage.tap('#aud-dots button[data-page="6"]');
  const m2ok = await mpage.waitForFunction(() => document.getElementById('aud-count').textContent.replace('Showing ', '').trim() === '7 of 7', null, { timeout: 3000 }).then(() => true).catch(() => false);
  await mpage.waitForTimeout(350);
  const m2 = await mpage.evaluate(() => { const t = document.getElementById('audience-track'); return { trackH: t.getBoundingClientRect().height, lastH: t.children[6].getBoundingClientRect().height, next: document.getElementById('aud-next').disabled }; });
  if (!m2ok || Math.abs(m2.trackH - m2.lastH) > 2 || !m2.next) failures.push(`audience slider phone last page: ok=${m2ok} ${JSON.stringify(m2)}`);
  await mctx.close();
  report.push(`audience slider: 7 pieces, fills ${[...new Set(geo.cards.map((c) => c.fill))].join(' ')}, min contrast ${Math.min(...geo.cards.map((c) => c.ratio))}:1, paging ok=${p2 && p3 && back}, reduced-motion instant=${Math.abs(rm.scroll - rm.expected) <= 1}, tablet ${tab.count}, phone own-height=${Math.abs(m1.trackH - m1.firstH) <= 2}`);
}

{
  // The Puzzler Method as a timed show: starts when the section comes into view, 8 s per step with the current
  // segment filling; holds on hover and focus; Pause/Play works; any manual choice ends it; never under reduced
  // motion; without script all seven slides read in order.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  const segP = (i) => page.evaluate((i) => parseFloat(document.querySelectorAll('#auto-bar span')[i].style.getPropertyValue('--p')) || 0, i);
  const notStarted = await page.evaluate(() => !document.getElementById('method').classList.contains('auto-on'));
  await page.evaluate(() => document.getElementById('method').scrollIntoView({ block: 'start' }));
  const armed = await page.waitForFunction(() => document.getElementById('method').classList.contains('auto-on'), null, { timeout: 3000 }).then(() => true).catch(() => false);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(1200);
  const p1 = await segP(0);
  const ctl = await page.evaluate(() => { const b = document.getElementById('auto-toggle'); return { shown: !b.hidden && getComputedStyle(b).display !== 'none', pressed: b.getAttribute('aria-pressed'), label: b.textContent.trim(), note: getComputedStyle(document.getElementById('auto-note')).display !== 'none', slidesVisible: [...document.querySelectorAll('.method-slides .slide')].filter((d) => !d.hidden).length, stacked: getComputedStyle(document.querySelector('.method-slides .slides')).display === 'grid' }; });
  if (!notStarted || !armed || !(p1 > 0 && p1 < 100) || !ctl.shown || ctl.pressed !== 'false' || ctl.label !== 'Pause' || !ctl.note || ctl.slidesVisible !== 1 || !ctl.stacked) failures.push(`method auto: start notStarted=${notStarted} armed=${armed} p1=${p1} ${JSON.stringify(ctl)}`);
  // Hover holds; leaving resumes.
  await page.hover('#method-slides');
  await page.waitForTimeout(200);
  const h1 = await segP(0); await page.waitForTimeout(700); const h2 = await segP(0);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(700);
  const h3 = await segP(0);
  if (Math.abs(h2 - h1) > 0.5 || !(h3 > h2)) failures.push(`method auto: hover hold h1=${h1} h2=${h2} resumed=${h3}`);
  // Advances to step 2 by itself, segment 1 full.
  const adv = await page.waitForFunction(() => document.getElementById('method-stage').dataset.state === '2', null, { timeout: 12000 }).then(() => true).catch(() => false);
  const s1 = await segP(0);
  const slide2 = await page.evaluate(() => ({ visible: [...document.querySelectorAll('.method-slides .slide')].filter((d) => !d.hidden).map((d) => d.dataset.step).join(), done: document.querySelector('.step-btn[data-step="1"]').classList.contains('done'), cur: document.querySelector('.step-btn[data-step="2"]').getAttribute('aria-current'), caption: document.getElementById('stage-caption').textContent.trim() }));
  if (!adv || s1 !== 100 || slide2.visible !== '2' || !slide2.done || slide2.cur !== 'step' || !/02\s*Build The Frame/.test(slide2.caption)) failures.push(`method auto: advance adv=${adv} seg1=${s1} ${JSON.stringify(slide2)}`);
  // Pause freezes; Play resumes.
  await page.click('#auto-toggle');
  await page.mouse.move(5, 5);
  const pz = await page.evaluate(() => { const b = document.getElementById('auto-toggle'); return { pressed: b.getAttribute('aria-pressed'), label: b.textContent.trim(), on: document.getElementById('method').classList.contains('auto-on') }; });
  const q1 = await segP(1); await page.waitForTimeout(600); const q2 = await segP(1);
  await page.click('#auto-toggle');
  await page.mouse.move(5, 5);
  await page.waitForTimeout(600);
  const q3 = await segP(1);
  const pl = await page.evaluate(() => document.getElementById('auto-toggle').getAttribute('aria-pressed'));
  if (pz.pressed !== 'true' || pz.label !== 'Play' || pz.on || Math.abs(q2 - q1) > 0.5 || !(q3 > q2) || pl !== 'false') failures.push(`method auto: pause/play ${JSON.stringify(pz)} q=${q1},${q2},${q3} after=${pl}`);
  // A manual choice ends the show and announces the step.
  await page.click('.step-btn[data-step="5"]');
  await page.waitForTimeout(300);
  const man = await page.evaluate(() => ({ state: document.getElementById('method-stage').dataset.state, on: document.getElementById('method').classList.contains('auto-on'), label: document.getElementById('auto-toggle').textContent.trim(), status: document.getElementById('method-status').textContent, segs: [...document.querySelectorAll('#auto-bar span')].map((x) => parseFloat(x.style.getPropertyValue('--p')) || 0), phase: document.querySelector('.method-slides .slide:not([hidden]) .phase-line').textContent.trim() }));
  if (man.state !== '5' || man.on || man.label !== 'Play' || !/Step 5 of 7: Take Breaks/.test(man.status) || man.segs.slice(0, 4).some((v) => v !== 100) || man.segs[4] !== 0 || !/Phase 2/.test(man.phase)) failures.push(`method auto: manual stop ${JSON.stringify(man)}`);
  // Finishing: reaching step 7 and completing it stops with "Replay".
  await page.click('.step-btn[data-step="7"]');
  await page.click('#auto-toggle');
  await page.mouse.move(5, 5);
  const fin = await page.waitForFunction(() => document.getElementById('auto-toggle').textContent.trim() === 'Replay', null, { timeout: 12000 }).then(() => true).catch(() => false);
  const finState = await page.evaluate(() => ({ state: document.getElementById('method-stage').dataset.state, seg7: parseFloat(document.querySelectorAll('#auto-bar span')[6].style.getPropertyValue('--p')) }));
  if (!fin || finState.state !== '7' || finState.seg7 !== 100) failures.push(`method auto: finish fin=${fin} ${JSON.stringify(finState)}`);
  await ctx.close();

  const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rpage = await rctx.newPage();
  await rpage.goto(base + '/', { waitUntil: 'load' });
  await rpage.evaluate(() => document.getElementById('method').scrollIntoView({ block: 'start' }));
  await rpage.waitForTimeout(1500);
  const rm = await rpage.evaluate(() => ({ state: document.getElementById('method-stage').dataset.state, on: document.getElementById('method').classList.contains('auto-on'), btn: getComputedStyle(document.getElementById('auto-toggle')).display, note: getComputedStyle(document.getElementById('auto-note')).display, slides: [...document.querySelectorAll('.method-slides .slide')].filter((d) => !d.hidden).length }));
  if (rm.state !== '1' || rm.on || rm.btn !== 'none' || rm.note !== 'none' || rm.slides !== 1) failures.push(`method auto reduced motion: ${JSON.stringify(rm)}`);
  await rctx.close();

  const nctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
  const npage = await nctx.newPage();
  await npage.goto(base + '/', { waitUntil: 'load' });
  const nj = await npage.evaluate(() => ({ slides: [...document.querySelectorAll('.method-slides .slide')].filter((d) => getComputedStyle(d).display !== 'none' && getComputedStyle(d).visibility !== 'hidden').length, strip: getComputedStyle(document.querySelector('.step-strip')).display, bar: getComputedStyle(document.getElementById('auto-bar')).display, btn: getComputedStyle(document.getElementById('auto-toggle')).display }));
  if (nj.slides !== 7 || nj.strip !== 'none' || nj.bar !== 'none' || nj.btn !== 'none') failures.push(`method auto no-js: ${JSON.stringify(nj)}`);
  await nctx.close();

  const mctx = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  const mpage = await mctx.newPage();
  await mpage.goto(base + '/', { waitUntil: 'load' });
  const mob = await mpage.evaluate(() => ({ note: getComputedStyle(document.getElementById('auto-note')).display, strip: getComputedStyle(document.querySelector('.step-strip')).display, targets: [...document.querySelectorAll('.step-btn, #auto-toggle, #step-prev, #step-next')].filter((b) => b.offsetParent !== null).every((b) => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }), scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  if (mob.strip !== 'none') failures.push('method auto phone: the step strip should be hidden');
  if (mob.note !== 'none' || !mob.targets || mob.scroll > mob.client) failures.push(`method auto phone: ${JSON.stringify(mob)}`);
  await mctx.close();
  report.push(`method auto: armed on view=${armed}, fills=${p1 > 0}, hover hold=${Math.abs(h2 - h1) <= 0.5}, advanced=${adv}, pause/play ok=${pz.pressed === 'true' && q3 > q2}, manual stop=${!man.on}, finish=${fin}, reduced-motion off=${!rm.on}, no-js slides=${nj.slides}`);
}

{
  // Phone layout: folds closed by default and one tap away, list rows, swipe row, sticky wayfinding; desktop and no-JS untouched.
  const ctx = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const st = await page.evaluate(() => {
    const vis = (el) => !!el && el.offsetParent !== null;
    return {
      height: document.documentElement.scrollHeight,
      folds: document.querySelectorAll('.fold').length,
      btnsVisible: [...document.querySelectorAll('.fold-btn')].filter(vis).length,
      bodiesHidden: [...document.querySelectorAll('.fold-body')].filter((b) => getComputedStyle(b).display === 'none').length,
      btnsTall: [...document.querySelectorAll('.fold-btn')].every((b) => b.getBoundingClientRect().height >= 44),
      expanded: [...document.querySelectorAll('.fold-btn')].every((b) => b.getAttribute('aria-expanded') === 'false'),
      waysRows: [...document.querySelectorAll('.ways-grid .way')].every((w) => { const r = w.getBoundingClientRect(); return r.height >= 44 && r.height < 90 && getComputedStyle(w.querySelector('p')).display === 'none'; }),
      pimSwipe: getComputedStyle(document.querySelector('.pim-grid')).overflowX === 'auto' && document.querySelectorAll('#pim-dots button').length === 3,
      closeHidden: getComputedStyle(document.querySelector('.close')).display === 'none',
      barHidden: document.getElementById('m-bar').hidden,
      noteFolded: getComputedStyle(document.getElementById('fold-note-body')).display === 'none',
      firstNoteVisible: vis(document.querySelector('.note > p:not(.eyebrow)')),
      practicesFolded: getComputedStyle(document.getElementById('fold-practices-body')).display === 'none',
      fitCtasVisible: vis(document.querySelector('.fit-statement .build-actions a')),
      boundaryInDom: /does not represent clients before federal agencies/.test(document.getElementById('fold-fit-body').textContent),
    };
  });
  if (st.height > 9500) failures.push(`phone layout: page is ${st.height}px tall (expected under 9500)`);
  if (st.folds !== 16 || st.btnsVisible !== 16 || st.bodiesHidden !== 16 || !st.btnsTall || !st.expanded) failures.push(`phone layout: folds ${JSON.stringify({ folds: st.folds, btnsVisible: st.btnsVisible, bodiesHidden: st.bodiesHidden, btnsTall: st.btnsTall, expanded: st.expanded })}`);
  if (!st.waysRows || !st.pimSwipe || !st.closeHidden || !st.barHidden || !st.noteFolded || !st.firstNoteVisible || !st.practicesFolded || !st.fitCtasVisible || !st.boundaryInDom) failures.push(`phone layout: ${JSON.stringify(st)}`);
  // Open the practices fold: six practices appear; aria-expanded flips.
  await page.evaluate(() => document.getElementById('fold-practices-btn').scrollIntoView({ block: 'center' }));
  await page.tap('#fold-practices-btn');
  await page.waitForTimeout(200);
  const pf = await page.evaluate(() => ({ open: document.getElementById('fold-practices').classList.contains('is-open'), expanded: document.getElementById('fold-practices-btn').getAttribute('aria-expanded'), practices: [...document.querySelectorAll('.practice')].filter((d) => d.offsetParent !== null).length }));
  if (!pf.open || pf.expanded !== 'true' || pf.practices !== 6) failures.push(`phone layout: practices fold ${JSON.stringify(pf)}`);
  // Sticky bar appears after the hero, hides on a scroll down, returns on scroll up; sheet lists eight sections with "you are here".
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
  const atTop = await page.evaluate(() => document.getElementById('m-bar').hidden);
  await page.evaluate(() => document.getElementById('method').scrollIntoView()); await page.waitForTimeout(150);
  const during = await page.evaluate(() => ({ hidden: document.getElementById('m-bar').hidden, away: document.getElementById('m-bar').classList.contains('away') }));
  await page.waitForTimeout(900);
  const rest = await page.evaluate(() => document.getElementById('m-bar').classList.contains('away'));
  await page.evaluate(() => window.scrollBy(0, -200)); await page.waitForTimeout(150);
  const up = await page.evaluate(() => document.getElementById('m-bar').classList.contains('away'));
  if (!atTop || during.hidden || !during.away || rest || up) failures.push(`phone layout: bar atTop=${atTop} during=${JSON.stringify(during)} rest=${rest} up=${up}`);
  await page.tap('#m-sections'); await page.waitForTimeout(200);
  const sheet = await page.evaluate(() => ({ open: !document.getElementById('m-sheet').hidden, expanded: document.getElementById('m-sections').getAttribute('aria-expanded'), links: document.querySelectorAll('#m-sheet a').length, here: (document.querySelector('#m-sheet a[aria-current="location"]') || {}).dataset ? document.querySelector('#m-sheet a[aria-current="location"]').dataset.section : null, focusIn: document.getElementById('m-sheet').contains(document.activeElement), tall: [...document.querySelectorAll('#m-sheet a, #m-bar a, #m-bar button')].every((a) => a.getBoundingClientRect().height >= 44) }));
  if (!sheet.open || sheet.expanded !== 'true' || sheet.links !== 8 || sheet.here !== 'method' || !sheet.focusIn || !sheet.tall) failures.push(`phone layout: sheet ${JSON.stringify(sheet)}`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  const esc = await page.evaluate(() => ({ closed: document.getElementById('m-sheet').hidden, focus: document.activeElement.id }));
  await page.tap('#m-top'); await page.waitForTimeout(400);
  const top = await page.evaluate(() => ({ y: window.scrollY, focus: document.activeElement.id, hidden: document.getElementById('m-bar').hidden }));
  if (!esc.closed || esc.focus !== 'm-sections' || top.y !== 0 || top.focus !== 'hero-title' || !top.hidden) failures.push(`phone layout: escape/top ${JSON.stringify(esc)} ${JSON.stringify(top)}`);
  // Arriving at the speaking form opens its fold.
  await page.evaluate(() => { window.location.hash = '#speaking-inquiry'; }); await page.waitForTimeout(300);
  const spk = await page.evaluate(() => ({ foldOpen: document.getElementById('fold-speaking').classList.contains('is-open'), detailsOpen: document.getElementById('speaking-inquiry').open, visible: document.getElementById('reach-speak').offsetParent !== null }));
  if (!spk.foldOpen || !spk.detailsOpen || !spk.visible) failures.push(`phone layout: speaking link did not open its fold ${JSON.stringify(spk)}`);
  if (errors.length) failures.push(`phone layout: page errors ${errors.join(' | ')}`);
  await ctx.close();
  // Desktop untouched: no fold buttons, all bodies visible, no bar, drawing shown.
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const dpage = await dctx.newPage();
  await dpage.goto(base + '/', { waitUntil: 'load' });
  const dk = await dpage.evaluate(() => ({ btns: [...document.querySelectorAll('.fold-btn')].filter((b) => b.offsetParent !== null).length, bodies: [...document.querySelectorAll('.fold-body')].filter((b) => getComputedStyle(b).display === 'none').length, bar: getComputedStyle(document.getElementById('m-bar')).display, sheet: getComputedStyle(document.getElementById('m-sheet')).display, hint: getComputedStyle(document.querySelector('.step2-hint')).display, img: getComputedStyle(document.querySelector('.hero-field > img')).display, close: getComputedStyle(document.querySelector('.close')).display, dots: getComputedStyle(document.getElementById('pim-dots')).display, ways: getComputedStyle(document.querySelector('.way p')).display }));
  if (dk.btns !== 0 || dk.bodies !== 0 || dk.bar !== 'none' || dk.sheet !== 'none' || dk.hint !== 'none' || dk.img === 'none' || dk.close === 'none' || dk.dots !== 'none' || dk.ways === 'none') failures.push(`phone layout: desktop changed ${JSON.stringify(dk)}`);
  await dctx.close();
  // No script on a phone: everything visible, no fold buttons, no bar.
  const nctx = await browser.newContext({ viewport: { width: 375, height: 740 }, javaScriptEnabled: false });
  const npage = await nctx.newPage();
  await npage.goto(base + '/', { waitUntil: 'load' });
  const nj = await npage.evaluate(() => ({ btns: [...document.querySelectorAll('.fold-btn')].filter((b) => getComputedStyle(b).display !== 'none').length, bodies: [...document.querySelectorAll('.fold-body')].filter((b) => getComputedStyle(b).display === 'none').length, bar: getComputedStyle(document.getElementById('m-bar')).display, step2: getComputedStyle(document.querySelector('.fysp-options[data-group="audience"]')).display }));
  if (nj.btns !== 0 || nj.bodies !== 0 || nj.bar !== 'none' || nj.step2 === 'none') failures.push(`phone layout no-js: ${JSON.stringify(nj)}`);
  await nctx.close();
  report.push(`phone layout: height=${st.height}px, folds closed=${st.bodiesHidden}/16, ways rows=${st.waysRows}, swipe row=${st.pimSwipe}, bar ok=${!during.hidden && during.away && !rest && !up}, sheet ok=${sheet.links === 8 && sheet.here === 'method'}, desktop untouched=${dk.btns === 0 && dk.bodies === 0}, no-js ok=${nj.btns === 0 && nj.bodies === 0}`);
}

{
  // Digital card: storytelling row, four social icons (44 px, labelled, new tab), the bar pulse every 5 s and off under reduced motion.
  const ctx = await browser.newContext({ viewport: { width: 375, height: 860 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(base + '/puzzler_card.html', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const card = await page.evaluate(() => {
    const story = document.querySelector('.contact a[aria-label^="Digital storytelling"]');
    const social = [...document.querySelectorAll('.card-foot .social a')];
    const seg = document.querySelector('.sig-bar > .s1'); const cs = getComputedStyle(seg);
    return {
      story: story ? { href: story.href, text: story.textContent.trim(), h: story.getBoundingClientRect().height } : null,
      linkedinRowGone: !document.querySelector('.contact a[aria-label="LinkedIn"]'),
      social: social.map((a) => ({ label: a.getAttribute('aria-label'), host: new URL(a.href).host, blank: a.target === '_blank' && /noopener/.test(a.rel), w: a.getBoundingClientRect().width, h: a.getBoundingClientRect().height })),
      anim: cs.animationName, dur: cs.animationDuration, count: cs.animationIterationCount,
      vcardHasLinkedIn: /linkedin\.com\/company\/puzzlerconsultingadvisory/.test(document.documentElement.outerHTML),
    };
  });
  if (!card.story || !/#pieces-in-motion$/.test(card.story.href) || card.story.text !== 'Digital storytelling: Pieces in Motion' || card.story.h < 44 || !card.linkedinRowGone) failures.push(`card: storytelling row ${JSON.stringify(card.story)} linkedinRowGone=${card.linkedinRowGone}`);
  const hosts = card.social.map((s) => s.host).join();
  if (card.social.length !== 4 || hosts !== 'www.linkedin.com,www.threads.net,www.tiktok.com,www.youtube.com' || card.social.some((s) => !s.blank || s.w < 44 || s.h < 44 || !s.label)) failures.push(`card: social icons ${JSON.stringify(card.social)}`);
  if (card.anim !== 'sig-pulse' || card.dur !== '5s' || card.count !== 'infinite') failures.push(`card: pulse ${card.anim} ${card.dur} ${card.count}`);
  await ctx.close();
  const rctx = await browser.newContext({ viewport: { width: 375, height: 860 }, reducedMotion: 'reduce' });
  const rpage = await rctx.newPage();
  await rpage.goto(base + '/puzzler_card.html', { waitUntil: 'load' });
  const rm = await rpage.evaluate(() => getComputedStyle(document.querySelector('.sig-bar > .s1')).animationName);
  if (rm !== 'none') failures.push(`card: pulse should be off under reduced motion (${rm})`);
  await rctx.close();
  report.push(`card: storytelling row=${!!card.story}, social icons=${card.social.length}, pulse=${card.anim} ${card.dur}, reduced-motion off=${rm === 'none'}`);
}

await browser.close();
server.close();

const md = [`# verify report`, `base: ${base}`, '', ...report, '', failures.length ? `## FAILURES (${failures.length})` : '## PASS', ...failures.map((f) => '- ' + f)].join('\n');
await writeFile(join(here, 'output', 'report.md'), md);
console.log(md);
process.exit(failures.length ? 1 : 0);
