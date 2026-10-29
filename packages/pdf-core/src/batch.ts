import type {Operation,PdfJob,OutputFile,Progress,JobOptions} from './index';
export const batchOperations:readonly Operation[]=['compress','split','pdf-to-images','extract-text','page-numbers','watermark','signature','inspect-pdf','resize-pdf','crop-pdf','header-footer','n-up','booklet','ocr','protect-pdf','unlock-pdf'];
export const supportsBatch=(operation:Operation|undefined)=>!!operation&&batchOperations.includes(operation);
export type BatchStatus='pending'|'running'|'succeeded'|'failed'|'cancelled'|'skipped';
export interface BatchItem {index:number;name:string;status:BatchStatus;progress:number;files:OutputFile[];error?:string}
export type JobExecutor=(job:PdfJob,progress:Progress,signal:AbortSignal)=>Promise<OutputFile[]>;
function safeName(value:string,maxBytes:number){
 const clean=value.normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'-').replace(/^\.+|[. ]+$/g,'').trim();let result='',size=0;
 for(const character of clean){const bytes=new TextEncoder().encode(character).length;if(size+bytes>maxBytes)break;result+=character;size+=bytes;}
 return result||'document';
}
export function batchOutputName(index:number,inputName:string,outputName:string){
 return `${String(index+1).padStart(3,'0')}-${safeName(inputName.replace(/\.pdf$/i,''),80)}--${safeName(outputName,100)}`;
}
export function summarizeBatch(items:readonly BatchItem[]){
 const count=(status:BatchStatus)=>items.filter(item=>item.status===status).length;
 return {total:items.length,succeeded:count('succeeded'),failed:count('failed'),cancelled:count('cancelled'),skipped:count('skipped'),pending:count('pending'),running:count('running')};
}
export async function runBatch(job:PdfJob,execute:JobExecutor,onUpdate:(items:BatchItem[],progress:number)=>void,signal:AbortSignal,perFileOptions?:readonly Partial<JobOptions>[]):Promise<BatchItem[]>{
 if(perFileOptions&&perFileOptions.length!==job.inputs.length)throw new Error('Per-file settings do not match the selected files.');
 if(!supportsBatch(job.operation))throw new Error('This tool uses an individual arrangement or combined-file workflow. Choose a supported batch tool.');
 if(!job.inputs.length)throw new Error('Choose at least one PDF.');
 let items:BatchItem[]=job.inputs.map((input,index)=>({index,name:input.name,status:'pending',progress:0,files:[]}));
 const emit=()=>onUpdate(items.slice(),items.reduce((sum,item)=>sum+(item.status==='succeeded'||item.status==='failed'?1:item.status==='running'?item.progress:0),0)/items.length);
 const stop=(index:number,active:boolean)=>{items=items.map((item,i)=>i<index?item:{...item,status:i===index&&active?'cancelled':'skipped',error:i===index&&active?'Processing cancelled.':'Not processed because the batch stopped.',files:[]});emit();};
 emit();
 for(let i=0;i<items.length;i++){
  if(signal.aborted){stop(i,false);break;}
  items[i]={...items[i],status:'running'};emit();
  try{
   if(!job.inputs[i].bytes.length)throw new Error('This file is empty. Choose a valid PDF.');
   const files=await execute({operation:job.operation,inputs:[job.inputs[i]],options:{...job.options,...perFileOptions?.[i]}},value=>{
    if(signal.aborted||items[i].status!=='running')return;
    const fraction=Number.isFinite(value)?Math.min(1,Math.max(items[i].progress,value)):items[i].progress;
    items[i]={...items[i],progress:fraction};emit();
   },signal);
   if(signal.aborted){stop(i,true);break;}
   if(!files.length)throw new Error('This tool did not produce an output file.');
   const names=new Set<string>();
   const named=files.map((file,n)=>{let name=batchOutputName(i,job.inputs[i].name,file.name);let suffix=n+1;while(names.has(name.toLowerCase()))name=batchOutputName(i,job.inputs[i].name,`${suffix++}-${file.name}`);names.add(name.toLowerCase());return {...file,name};});
   items[i]={...items[i],status:'succeeded',progress:1,files:named};
  }catch(error){
   if(signal.aborted){stop(i,true);break;}
   items[i]={...items[i],status:'failed',progress:1,error:error instanceof Error?error.message:'Unable to process this PDF.',files:[]};
  }
  emit();
 }
 return items;
}
/** Retry only failed, cancelled or unprocessed inputs, keeping successful outputs. */
export async function retryBatch(job:PdfJob,previous:BatchItem[],execute:JobExecutor,onUpdate:(items:BatchItem[],progress:number)=>void,signal:AbortSignal,perFileOptions?:readonly Partial<JobOptions>[],selectedIndices?:readonly number[]):Promise<BatchItem[]>{
 if(perFileOptions&&perFileOptions.length!==job.inputs.length)throw new Error('Per-file settings do not match the selected files.');
 if(previous.length!==job.inputs.length||previous.some((item,i)=>item.index!==i||item.name!==job.inputs[i].name))throw new Error('The selected files changed. Run a new batch.');
 if(selectedIndices&&(new Set(selectedIndices).size!==selectedIndices.length||selectedIndices.some(i=>!Number.isInteger(i)||i<0||i>=previous.length||!['failed','cancelled','skipped'].includes(previous[i].status))))throw new Error('Choose failed or unfinished files to retry.');
 const indexes=previous.filter(item=>['failed','cancelled','skipped'].includes(item.status)&&(!selectedIndices||selectedIndices.includes(item.index))).map(item=>item.index);
 if(!indexes.length)throw new Error('There are no failed or unfinished files to retry.');
 let merged=previous.slice();
 await runBatch({...job,inputs:indexes.map(i=>job.inputs[i])},execute,(items,progress)=>{
  merged=previous.slice();for(const item of items){const index=indexes[item.index];const prefix=String(index+1).padStart(3,'0');merged[index]={...item,index,name:job.inputs[index].name,files:item.files.map(f=>({...f,name:f.name.replace(/^\d+-/,`${prefix}-`)}))};}
  onUpdate(merged.slice(),progress);
 },signal,perFileOptions&&indexes.map(i=>perFileOptions[i]));
 return merged;
}
/** Explicit, local export of batch status. Does not include PDF bytes, options or passwords. */
export function createBatchReport(items:readonly BatchItem[]):OutputFile{
 if(!items.length)throw new Error('No batch results to report.');
 const report={version:1,summary:summarizeBatch(items),items:items.map(item=>({name:item.name,status:item.status,...(item.error?{error:item.error}:{}),outputs:item.files.map(file=>({name:file.name,bytes:file.bytes.length,type:file.type}))}))};
 return {name:'batch-report.json',type:'application/json',bytes:new TextEncoder().encode(JSON.stringify(report,null,2))};
}
