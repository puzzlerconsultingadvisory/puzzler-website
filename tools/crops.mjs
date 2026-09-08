import { chromium } from 'playwright'; import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const root='/home/user/puzzler-website'; const MIME={'.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg'};
const srv=createServer(async(req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://x').pathname); if(p==='/')p='/index.html'; try{res.writeHead(200,{'content-type':MIME[extname(p)]||'application/octet-stream'});res.end(await readFile(join(root,p)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const base=`http://127.0.0.1:${srv.address().port}`;
const b=await chromium.launch();
for (const [name,w,h] of [['laptop',1280,800],['mobile',375,740]]) {
  const p=await b.newPage({viewport:{width:w,height:h}}); await p.goto(base+'/'); await p.waitForTimeout(3300);
  const ids=['top','operator-gap','method','outcomes','practices','ways-to-begin','who-we-serve','pieces-in-motion','note','fit-call'];
  for (const id of ids){ const el=await p.$('#'+id); if(!el) continue; await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); await p.screenshot({path:`output/screens/crop-${name}-${id}.png`}); }
  await p.close();
}
await b.close(); srv.close(); console.log('crops done');
