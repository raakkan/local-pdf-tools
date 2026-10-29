import type {PdfJob,OutputFile,Progress} from './index';
import {runBrowserJob} from './browser';
import {runOcrJob} from './browser-ocr';
import {runPasswordJob} from './browser-password';
import {encodeCompressionImage,convertWebpToPng} from './browser-image';
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
 if(job.operation==='images-to-pdf'&&job.inputs.some(file=>file.type==='image/webp'))return (async()=>{const converted=[];for(let i=0;i<job.inputs.length;i++){signal.throwIfAborted();const input=job.inputs[i];converted.push(input.type==='image/webp'?await convertWebpToPng(input,signal):input);progress(.3*(i+1)/job.inputs.length);}return workerRequest({...job,inputs:converted},n=>progress(.3+n*.7),signal);})();
 if(job.operation==='ocr'){const rotation=job.options.ocrRotation??0;if(![0,90,180,270].includes(rotation))return Promise.reject(new Error('Choose a valid OCR rotation.'));if(rotation)return (async()=>{if(job.inputs.length!==1)throw new Error('Choose one PDF.');const [rotated]=await workerRequest({type:'ocr-rotate',bytes:job.inputs[0].bytes,range:job.options.range,rotation},n=>progress(n*.1),signal);signal.throwIfAborted();return runOcrJob({...job,inputs:[rotated]},n=>progress(.1+n*.9),signal);})();return runOcrJob(job,progress,signal);}
 if(job.operation==='protect-pdf'||job.operation==='unlock-pdf')return runPasswordJob(job,progress,signal);
 if(job.operation==='pdf-to-images'||job.operation==='extract-text')return runBrowserJob(job,progress,signal);
 return workerRequest(job,progress,signal);
}
export async function createBatchArchive(files:OutputFile[],signal:AbortSignal):Promise<OutputFile>{
 if(!files.length)throw new Error('No successful outputs to archive.');
 return (await workerRequest({type:'batch-zip',files},()=>{},signal))[0];
}

export async function createTextPdfJob(options:import('./text-pdf').TextPdfOptions,progress:Progress,signal:AbortSignal):Promise<OutputFile>{return (await workerRequest({type:'text-pdf',options},progress,signal))[0];}

export async function inspectFormJob(bytes:Uint8Array,signal:AbortSignal):Promise<import('./forms').FormField[]>{const files=await workerRequest({type:'form-inspect',bytes},()=>{},signal);return JSON.parse(new TextDecoder().decode(files[0].bytes));}
export async function fillFormJob(bytes:Uint8Array,fields:import('./forms').FormField[],flatten:boolean,signal:AbortSignal):Promise<OutputFile>{return (await workerRequest({type:'form-fill',bytes,fields,flatten},()=>{},signal))[0];}

export async function addNavigationJob(bytes:Uint8Array,bookmarks:import('./navigation').NewBookmark[],attachments:import('./index').InputFile[],signal:AbortSignal):Promise<OutputFile>{return (await workerRequest({type:'navigation-add',bytes,bookmarks,attachments},()=>{},signal))[0];}

export async function editNavigationJob(bytes:Uint8Array,renames:import('./navigation').BookmarkRename[],removeNames:string[],signal:AbortSignal):Promise<OutputFile>{return (await workerRequest({type:'navigation-edit',bytes,renames,removeNames},()=>{},signal))[0];}

export async function reorderBookmarksJob(bytes:Uint8Array,order:import('./navigation').BookmarkOrderEntry[],signal:AbortSignal):Promise<OutputFile>{return (await workerRequest({type:'bookmark-order',bytes,order},()=>{},signal))[0];}
