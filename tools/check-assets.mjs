// Guards against excluded assets and code-drawn logos reaching the public site.
// Run: npm run check:assets   (exit code 1 on any failure)
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const EXCLUDED_NAMES = [
  'IMG_5127.png',
  'Luminescent Puzzle Path to the Portal.png',
  'Puzzle Monoliths at Dawn.png',
  'Puzzle Path to a Clearer You.png',
  'PUZZLER_IGNITE_YouTube_10min_16x9_FLOATING.mp4',
  'Quiet Mind: Three Visual Directions.png',
  'Puzzler Consulting Blueprint Hero.png',
];
const EXCLUDED_EXT = ['.zip', '.part', '.7z', '.rar', '.tar', '.gz'];
const PUBLIC_HTML = ['index.html', 'privacy.html', 'terms.html', 'making-the-pieces-fit.html', 'capability-brief.html', 'puzzler_card.html', '404.html'];

// The code-drawn four-piece mark that must never return (asset map §10).
const LOGO_POLYGON = /<polygon[^>]*points="45,45 140,45/;
const MULTI_HOUR_VIDEO = /(10min|9x16|_Master_Loop|YouTube)/i;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules' || name === 'tools') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (EXCLUDED_NAMES.includes(name)) failures.push(`excluded file present: ${p}`);
    if (EXCLUDED_EXT.includes(extname(name).toLowerCase())) failures.push(`archive / transfer file present: ${p}`);
    if (extname(name).toLowerCase() === '.mp4' && MULTI_HOUR_VIDEO.test(name)) failures.push(`video master present in web root: ${p}`);
  }
}
walk(root);

for (const f of PUBLIC_HTML) {
  const html = readFileSync(join(root, f), 'utf8');
  if (LOGO_POLYGON.test(html)) failures.push(`${f}: code-drawn four-piece mark still present`);
  if (/fonts\.googleapis\.com/.test(html)) failures.push(`${f}: Google Fonts dependency (Poppins must be self-hosted)`);
  if (/#4FC0B3|#287F76|#2E3450|#2A2A45/i.test(html)) failures.push(`${f}: unapproved color token`);
  if (/<video[^>]*autoplay/i.test(html) && !/<video[^>]*muted/i.test(html)) failures.push(`${f}: autoplaying video with audio`);
  if (/<audio[^>]*autoplay/i.test(html)) failures.push(`${f}: autoplay audio`);
}

// The hero overlay is inlined in index.html for motion control; its geometry must match BP-04.
{
  const index = readFileSync(join(root, 'index.html'), 'utf8');
  const file = readFileSync(join(root, 'website-assets/blueprint/hero/blueprint-connections.svg'), 'utf8');
  const shapes = (s) => (s.match(/<(?:path|circle)[^>]*>/g) || []).filter((t) => /class="(trace|join)/.test(t)).map((t) => t.replace(/\s+/g, ' ').trim()).sort();
  const a = shapes(index), b = shapes(file);
  if (!a.length || a.join('\n') !== b.join('\n')) failures.push('index.html inline connection overlay drifted from blueprint-connections.svg');
}

// favicon.svg must carry the BR-01 polygons verbatim (WEB-01); the icon rasters must exist.
{
  const poly = (t) => (t.match(/<polygon[^>]*\/>/g) || []);
  const mark = poly(readFileSync(join(root, 'assets/brand/puzzler_logo_4piece.svg'), 'utf8'));
  const fav = existsSync(join(root, 'favicon.svg')) ? poly(readFileSync(join(root, 'favicon.svg'), 'utf8')) : [];
  if (mark.length !== 4 || fav.join('\n') !== mark.join('\n')) failures.push('favicon.svg polygons differ from BR-01 (regenerate with tools/build-favicons.mjs)');
  for (const f of ['favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
    if (!existsSync(join(root, f))) failures.push(`icon file missing: ${f}`);
  }
}

// A root public/ directory would become the Vercel output directory (build-less project) and 404 the site.
if (existsSync(join(root, 'public'))) failures.push('root public/ directory present: Vercel would serve it as the site root. Keep bundle assets under assets/.');

// Bundle hygiene: source-only / review-required folders are excluded from deployment, and the
// logo slots must be switched on as soon as the approved mark is on disk.
{
  const ignore = readFileSync(join(root, '.vercelignore'), 'utf8');
  for (const d of ['docs/', 'references/', 'review-required/', 'source-masters-do-not-publish/', 'tools/']) {
    if (!ignore.split('\n').includes(d)) failures.push(`.vercelignore must exclude ${d}`);
  }
  const logo = join(root, 'assets/brand/puzzler_logo_4piece.svg');
  if (existsSync(logo)) {
    for (const f of PUBLIC_HTML) {
      const html = readFileSync(join(root, f), 'utf8');
      if (/<!--(?:(?!-->)[\s\S])*<img[^>]*puzzler_logo_4piece\.svg/.test(html)) failures.push(`${f}: BR-01 is on disk but the mark slot is still commented out`);
    }
  }
}

if (failures.length) {
  console.error('check:assets FAILED');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('check:assets passed');
