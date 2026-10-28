import vm from 'node:vm';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {webcrypto} from 'node:crypto';
const req=createRequire(resolve('packages/pdf-core/package.json'));
const root=dirname(req.resolve('@ai-ecoverse/wasm-qpdf/package.json'));
export async function passwordRuntime(operation:'protect-pdf'|'unlock-pdf',bytes:Uint8Array,password:string):Promise<{bytes?:Uint8Array;message?:string;logs:string[]}>{
 const [glue,wasm,script]=await Promise.all([readFile(`${root}/bin/qpdf`,'utf8'),readFile(`${root}/bin/qpdf.wasm`),readFile('packages/pdf-core/runtime/password-worker.js','utf8')]);
 const logs:string[]=[];let ctx:vm.Context;
 return new Promise((resolveResult,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Password runtime test timed out')),15000);
  const scope:any={crypto:webcrypto,console:{log:(...a:unknown[])=>logs.push(a.join(' ')),error:(...a:unknown[])=>logs.push(a.join(' '))},Uint8Array,TextDecoder,TextEncoder,performance,setTimeout,clearTimeout,URL,WorkerGlobalScope:class {},location:{href:'https://fixture.invalid/password-assets/password-worker.js'},fetch:async()=>new Response(wasm,{headers:{'Content-Type':'application/wasm'}}),close:()=>{},postMessage:(m:any)=>{if(m.type==='progress')return;clearTimeout(timer);resolveResult({bytes:m.bytes,message:m.message,logs});},importScripts:()=>vm.runInContext(glue,ctx)};
  scope.self=scope;ctx=vm.createContext(scope);vm.runInContext(script,ctx);scope.onmessage({data:{operation,bytes:bytes.slice(),password}}).catch(reject);
 });
}
