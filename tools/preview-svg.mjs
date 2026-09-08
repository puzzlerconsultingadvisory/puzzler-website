import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const root = '/home/user/puzzler-website/website-assets/blueprint/';
const files = ['method/method-state-01-edge.svg','method/method-state-02-frame.svg','method/method-state-03-sort.svg','method/method-state-04-visual-cues.svg','method/method-state-05-take-breaks.svg','method/method-state-06-whole-picture.svg','method/method-state-07-risk-correction.svg','method/method-complete-static.svg'];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1160 } });
const cells = files.map(f => `<figure><img src="data:image/svg+xml;base64,${Buffer.from(readFileSync(root+f)).toString('base64')}"><figcaption>${f.split('/')[1]}</figcaption></figure>`).join('');
await p.setContent(`<style>body{margin:0;background:#1A1A2E;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px;font:12px sans-serif;color:#fff}figure{margin:0}img{width:100%;display:block;border:1px solid #333}</style>${cells}`);
await p.screenshot({ path: '/home/user/puzzler-website/tools/output/preview-method.png' });
// hero layers
const hero = readFileSync(root+'hero/blueprint-hero.svg').toString('base64'); const conn = readFileSync(root+'hero/blueprint-connections.svg').toString('base64'); const grid = readFileSync(root+'hero/blueprint-grid.svg').toString('base64');
await p.setViewportSize({ width: 1200, height: 800 });
await p.setContent(`<style>body{margin:0;background:#1A1A2E url(data:image/svg+xml;base64,${grid});} .w{position:relative;width:1200px;height:800px} img{position:absolute;inset:0;width:100%;height:100%}</style><div class="w"><img src="data:image/svg+xml;base64,${hero}"><img src="data:image/svg+xml;base64,${conn}"></div>`);
await p.screenshot({ path: '/home/user/puzzler-website/tools/output/preview-hero-t0.png' });
await p.waitForTimeout(3200);
await p.screenshot({ path: '/home/user/puzzler-website/tools/output/preview-hero-settled.png' });
// reduced motion inside <img>
const p2 = await b.newPage({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });
await p2.setContent(`<style>body{margin:0;background:#1A1A2E} .w{position:relative;width:1200px;height:800px} img{position:absolute;inset:0;width:100%;height:100%}</style><div class="w"><img src="data:image/svg+xml;base64,${hero}"><img src="data:image/svg+xml;base64,${conn}"></div>`);
await p2.screenshot({ path: '/home/user/puzzler-website/tools/output/preview-hero-reduced-t0.png' });
await b.close();
