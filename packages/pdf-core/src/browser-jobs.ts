import type {PdfJob,OutputFile,Progress} from './index';
import {runBrowserJob} from './browser';
import {runOcrJob} from './browser-ocr';
import {runPasswordJob} from './browser-password';
import {encodeCompressionImage} from './browser-image';
async function workerRequest(message:unknown,progress:Progress,signal:AbortSignal):Promise<OutputFile[]>{
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});let settled=false;
  const finish=(error:Error|null,files?:OutputFile[])=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(files!);};
  const abort=()=>finish(new Error('Cancelled.'));signal.addEventListener('abort',abort,{once:true});
  worker.onmessage=async event=>{
   if(settled)return;const data=event.data;
   if(data.type==='progress'){progress(data.value);return;}
   if(data.type==='compression-image'){
    let image;try{image=await encodeCompressionImage(data.image,signal);}catch{image={id:data.image.id};}
    if(!settled&&!signal.aborted)try{worker.postMessage({type:'compression-image-result',...image},image.bytes?[image.bytes.buffer as ArrayBuffer]:[]);}catch{finish(new Error('The image worker could not receive this page. Try a smaller document.'));}return;
   }
   if(data.type==='done')finish(null,data.files);else finish(new Error(data.message||'The PDF worker returned an invalid response.'));
  };
  worker.onerror=()=>finish(new Error('The PDF worker stopped. Try a smaller document or close other tabs.'));
  if(signal.aborted)abort();else try{worker.postMessage(message);}catch{finish(new Error('The PDF worker could not receive this job. Try a smaller document.'));}
 });
}
export function runLocalJob(job:PdfJob,progress:Progress,signal:AbortSignal):Promise<OutputFile[]>{
 if(job.operation==='ocr')return runOcrJob(job,progress,signal);
 if(job.operation==='protect-pdf'||job.operation==='unlock-pdf')return runPasswordJob(job,progress,signal);
 if(job.operation==='pdf-to-images'||job.operation==='extract-text')return runBrowserJob(job,progress,signal);
 return workerRequest(job,progress,signal);
}
export async function createBatchArchive(files:OutputFile[],signal:AbortSignal):Promise<OutputFile>{
 if(!files.length)throw new Error('No successful outputs to archive.');
 return (await workerRequest({type:'batch-zip',files},()=>{},signal))[0];
}
