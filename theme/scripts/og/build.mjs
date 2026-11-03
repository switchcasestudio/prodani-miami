import {spawn} from 'child_process';import fs from 'fs';import path from 'path';
const B=path.dirname(new URL(import.meta.url).pathname);const OUT=path.join(B,'..','..','prodani','assets');fs.mkdirSync(OUT,{recursive:true});
const ch=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu','--allow-file-access-from-files','--hide-scrollbars','--remote-debugging-port=9334','--user-data-dir='+B+'/.hc','about:blank'],{stdio:'ignore'});
const sl=ms=>new Promise(r=>setTimeout(r,ms));
let t;for(let k=0;k<40&&!t;k++){await sl(500);try{t=(await (await fetch('http://127.0.0.1:9334/json')).json()).find(x=>x.type==='page')}catch{}}
if(!t){console.error('chrome did not start');ch.kill();process.exit(1)}
const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const P={};
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&P[m.id])P[m.id](m.result||m.error)};
const c=(method,params={})=>new Promise(r=>{const i=++id;P[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
await c('Page.enable');
await c('Emulation.setDeviceMetricsOverride',{width:1200,height:630,deviceScaleFactor:1,mobile:false});
const ev=async x=>(await c('Runtime.evaluate',{expression:x,awaitPromise:true,returnByValue:true})).result?.value;
const ids=process.argv.slice(2).length?process.argv.slice(2):['home','0','1','2','3','4','5','6'];
for(const i of ids){
  await c('Page.navigate',{url:'file://'+B+'/card.html?i='+i});await sl(600);
  await ev('(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(im=>im.complete?1:new Promise(r=>{im.onload=r;im.onerror=r})));return 1})()');
  await sl(300);
  const name=await ev('document.title');
  const r=await c('Page.captureScreenshot',{format:'jpeg',quality:84});
  const f=path.join(OUT,'og-'+name+'.jpg');fs.writeFileSync(f,Buffer.from(r.data,'base64'));
  const tw=await ev('(()=>{const t=document.querySelector(".title");const r=t.getBoundingClientRect();return Math.round(r.right)+"/"+Math.round(r.bottom)})()');
  console.log('og-'+name+'.jpg',Math.round(fs.statSync(f).size/1024)+'KB','title right/bottom',tw);
}
ws.close();ch.kill();process.exit(0);
