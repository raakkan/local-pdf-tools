export const ocrLanguages={eng:'English',spa:'Spanish',fra:'French',deu:'German',hin:'Hindi',tam:'Tamil'};
interface Asset {path:string;bytes:number;sha256:string}
interface Manifest {version:string;assets:Asset[];languages:Record<string,Asset>}
export const ocrBase=()=>new URL('ocr/',new URL(import.meta.env.BASE_URL,location.href)).href;
async function manifest():Promise<Manifest>{const r=await fetch(`${ocrBase()}assets.json`);if(!r.ok)throw new Error('OCR assets are unavailable. Reconnect and try again.');return r.json();}
export async function prepareOcr(language:string,signal:AbortSignal,progress:(n:number)=>void){
 if(!(language in ocrLanguages))throw new Error('Choose a supported OCR language.');
 if(!('caches'in globalThis)||!navigator.serviceWorker?.controller)throw new Error('Offline storage is not ready. Reload after the app is ready offline.');
 const m=await manifest(),cache=await caches.open(`localpdf-ocr-${m.version}`),assets=[...m.assets,m.languages[language]];
 for(let i=0;i<assets.length;i++){signal.throwIfAborted();const a=assets[i],url=new URL(a.path,new URL(import.meta.env.BASE_URL,location.href)).href;
  if(!await cache.match(url)){const r=await fetch(url,{signal,cache:'no-store'});if(!r.ok)throw new Error('Could not download OCR assets. Reconnect and try again.');const bytes=await r.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==a.sha256)throw new Error('OCR download verification failed. Try again.');await cache.put(url,new Response(bytes,{headers:{'Content-Type':a.path.endsWith('.js')?'text/javascript':'application/octet-stream'}}));}progress((i+1)/assets.length);
 }
}
export async function isOcrReady(language:string){try{const m=await manifest(),cache=await caches.open(`localpdf-ocr-${m.version}`);return (await Promise.all([...m.assets,m.languages[language]].map(a=>cache.match(new URL(a.path,new URL(import.meta.env.BASE_URL,location.href)).href)))).every(Boolean);}catch{return false;}}
