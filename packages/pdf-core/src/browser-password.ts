import {type PdfJob,type OutputFile,type Progress} from './index';
import {validatePassword} from './password';
export async function runPasswordJob(job:PdfJob,progress:Progress,signal:AbortSignal):Promise<OutputFile[]>{
 if(!['protect-pdf','unlock-pdf'].includes(job.operation)||job.inputs.length!==1)throw new Error('Choose one PDF.');
 let password=validatePassword(job.operation,job.options.password);signal.throwIfAborted();
 let worker:Worker|undefined;
 const request=(message:unknown)=>new Promise<any>((resolve,reject)=>{
  let timer:ReturnType<typeof setTimeout>,settled=false;
  const finish=(error:Error|null,data?:unknown)=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);clearTimeout(timer);worker?.terminate();worker=undefined;error?reject(error):resolve(data);};
  const abort=()=>finish(new Error('Cancelled.'));
  signal.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>finish(new Error('The password engine timed out. Try a smaller document.')),120_000);
  worker!.onmessage=e=>{if(e.data.type==='progress'){progress(e.data.value);return;}if(e.data.type==='error')finish(new Error(e.data.message));else finish(null,e.data);};
  worker!.onerror=()=>finish(new Error('The password engine stopped. Try a smaller PDF or a newer browser.'));
  if(signal.aborted)abort();else worker!.postMessage(message);
 });
 const validate=async(bytes:Uint8Array)=>{worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});await request({type:'password-validate',bytes,operation:job.operation});};
 try{
  progress(.05);
  if(job.operation==='protect-pdf')await validate(job.inputs[0].bytes);
  signal.throwIfAborted();
  worker=new Worker(new URL('password-assets/password-worker.js',new URL(import.meta.env.BASE_URL,location.href)));
  const result=await request({operation:job.operation,bytes:job.inputs[0].bytes,password});password='';progress(.85);
  if(job.operation==='unlock-pdf')await validate(result.bytes);
  signal.throwIfAborted();progress(1);
  return [{name:job.operation==='protect-pdf'?'protected.pdf':'unlocked.pdf',type:'application/pdf',bytes:result.bytes}];
 }finally{password='';worker?.terminate();}
}
