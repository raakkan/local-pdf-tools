import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../apps/web/dist/',import.meta.url);
async function walk(dir,prefix=''){let list=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.isDirectory())list.push(...await walk(new URL(`${e.name}/`,dir),`${prefix}${e.name}/`));else if(!['sw.js','_headers','_redirects'].includes(e.name))list.push(`/${prefix}${e.name}`);}return list;}
const files=(await walk(root)).filter(f=>!f.startsWith('/ocr/core/')&&!f.startsWith('/ocr/lang/')&&f!=='/ocr/worker.min.js'),hash=createHash('sha256');for(const f of files)hash.update(await readFile(new URL(f.slice(1),root)));
const version=hash.digest('hex').slice(0,16);
const code=`const CACHE='localpdf-${version}';const ASSETS=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(ASSETS);await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('localpdf-')&&!key.startsWith('localpdf-ocr-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(url.origin!==self.location.origin||e.request.method!=='GET')return;e.respondWith((async()=>{const cache=await caches.open(CACHE);const response=await cache.match(e.request.mode==='navigate'?(ASSETS.includes(url.pathname)?url.pathname:'/index.html'):url.pathname);if(response)return response;if(url.pathname.startsWith('/ocr/')){const optional=await caches.match(e.request);if(optional)return optional;}return fetch(e.request);})());});
self.addEventListener('message',e=>{if(e.data?.type==='CHECK_OFFLINE')e.waitUntil((async()=>{const cache=await caches.open(CACHE);const matches=await Promise.all(ASSETS.map(a=>cache.match(a)));if(matches.every(Boolean))e.source?.postMessage({type:'OFFLINE_READY'});})());});`;
await writeFile(new URL('sw.js',root),code);console.log(`Offline manifest: ${files.length} assets, version ${version}`);
