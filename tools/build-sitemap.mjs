// Regenerates ../sitemap.xml. lastmod is the last commit date of each page's
// source file, or today when the file has uncommitted changes.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://puzzlerconsultingadvisory.com';
// [public URL path, source file, changefreq, priority]
const PAGES = [
  ['/', 'index.html', 'monthly', '1.0'],
  ['/capability-brief', 'capability-brief.html', 'yearly', '0.6'],
  ['/making-the-pieces-fit', 'making-the-pieces-fit.html', 'yearly', '0.6'],
  ['/privacy.html', 'privacy.html', 'yearly', '0.3'],
  ['/terms.html', 'terms.html', 'yearly', '0.3'],
];
const today = new Date().toISOString().slice(0, 10);
const git = (args) => execSync(`git ${args}`, { cwd: root, encoding: 'utf8' }).trim();
const lastmod = (file) => (git(`status --porcelain -- ${file}`) ? today : git(`log -1 --format=%cs -- ${file}`) || today);

const body = PAGES.map(([path, file, freq, pri]) =>
  `  <url>\n    <loc>${ORIGIN}${path}</loc>\n    <lastmod>${lastmod(file)}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
writeFileSync(resolve(root, 'sitemap.xml'), xml);
console.log(`sitemap.xml written with ${PAGES.length} URLs`);
