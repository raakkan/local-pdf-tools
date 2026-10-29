import type {InputFile,JobOptions,OutputFile,PdfJob,Progress} from './index';
export const workflowOperations=['merge','split','resize-pdf','crop-pdf','page-numbers','watermark','header-footer','metadata','n-up','booklet','compress'] as const;
export type WorkflowOperation=typeof workflowOperations[number];
export interface WorkflowStep {operation:WorkflowOperation;options:JobOptions}
export interface WorkflowPreset {name:string;steps:WorkflowStep[]}
const keys=['binding','range','pageSize','landscape','margin','position','start','text','opacity','rotation','cropTop','cropRight','cropBottom','cropLeft','headerText','footerText','alignment','fontSize','pagesPerSheet','gap','compressionMode','imageQuality','maxImageDimension','removeMetadata'] as const;
/** Retain explicit settings only, never bytes, passwords or signature images. */
export function cleanWorkflowSteps(value:unknown):WorkflowStep[]{
 if(!Array.isArray(value)||!value.length||value.length>8)throw new Error('Choose between 1 and 8 workflow steps.');
 return value.map((entry,i)=>{
  if(!entry||typeof entry!=='object')throw new Error('Invalid workflow step.');
  const {operation,options}=entry as WorkflowStep;
  if(!workflowOperations.includes(operation)||operation==='merge'&&i!==0)throw new Error('Merge is available only as the first step.');
  const result:JobOptions={};
  if(options&&typeof options==='object'){
   for(const key of keys){const v=options[key];
    const textKeys=['range','text','headerText','footerText'];
    const boolKeys=['landscape','removeMetadata'];
    const enums:Record<string,readonly unknown[]>={binding:['left','right'],pageSize:['a4','letter','fit'],position:['bottom-center','top-center','bottom-right'],alignment:['left','center','right'],compressionMode:['lossless','images'],pagesPerSheet:[2,4]};
    if(enums[key]?enums[key].includes(v):textKeys.includes(key)?typeof v==='string'&&v.length<=2000:boolKeys.includes(key)?typeof v==='boolean':typeof v==='number'&&Number.isFinite(v))Object.assign(result,{[key]:v});
   }
   if(options.metadata&&typeof options.metadata==='object'){result.metadata={};for(const key of ['title','author','subject','keywords'] as const){const v=options.metadata[key];if(typeof v==='string')result.metadata[key]=v.slice(0,2000);}}
  }
  return {operation,options:result};
 });
}
export function readWorkflowPresets(serialized:string|null):WorkflowPreset[]{
 if(!serialized)return [];
 try{const data=JSON.parse(serialized);if(data.version!==1||!Array.isArray(data.presets))return [];return data.presets.slice(0,20).flatMap((p:WorkflowPreset)=>{try{if(typeof p.name!=='string'||!p.name.trim())return [];return [{name:p.name.trim().slice(0,80),steps:cleanWorkflowSteps(p.steps)}];}catch{return [];}});}catch{return [];}
}
export function serializeWorkflowPresets(presets:WorkflowPreset[]):string{return JSON.stringify({version:1,presets:presets.slice(0,20).map(p=>({name:p.name.trim().slice(0,80),steps:cleanWorkflowSteps(p.steps)}))});}
export function exportWorkflowPreset(preset:WorkflowPreset):OutputFile{
 const name=preset.name.trim();if(!name||name.length>80)throw new Error('Enter a preset name of up to 80 characters.');
 const text=serializeWorkflowPresets([{name,steps:preset.steps}]);return {name:'local-pdf-workflow.json',type:'application/json',bytes:new TextEncoder().encode(text)};
}
export function importWorkflowPreset(bytes:Uint8Array):WorkflowPreset{
 if(!bytes.length||bytes.length>100_000)throw new Error('Choose a workflow JSON file smaller than 100 KB.');
 let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('The workflow file must be UTF-8 JSON.');}
 let raw:unknown;try{raw=JSON.parse(text);}catch{throw new Error('The workflow file is not valid JSON.');}
 if(!raw||typeof raw!=='object'||(raw as {version?:unknown}).version!==1||!Array.isArray((raw as {presets?:unknown}).presets)||(raw as {presets:unknown[]}).presets.length!==1)throw new Error('Choose a file containing one supported workflow preset.');
 const data=readWorkflowPresets(text);if(data.length!==1)throw new Error('The workflow preset is invalid or uses unsupported steps.');return data[0];
}
export async function runWorkflow(inputs:InputFile[],steps:WorkflowStep[],runner:(job:PdfJob,progress:Progress,signal:AbortSignal)=>Promise<OutputFile[]>,progress:(fraction:number,step:number)=>void,signal:AbortSignal):Promise<OutputFile[]>{
 const safe=cleanWorkflowSteps(steps);signal.throwIfAborted();
 if(!inputs.length)throw new Error('Choose a PDF to run this workflow.');
 if(safe[0].operation!=='merge'&&inputs.length!==1)throw new Error('Start with Merge PDF to combine multiple files.');
 let current=inputs;
 for(let i=0;i<safe.length;i++){
  signal.throwIfAborted();progress(i/safe.length,i);
  try{let highest=0;const output=await runner({operation:safe[i].operation,inputs:current,options:safe[i].options},value=>{if(signal.aborted)return;highest=Math.max(highest,Number.isFinite(value)?Math.max(0,Math.min(1,value)):0);progress((i+highest)/safe.length,i);},signal);signal.throwIfAborted();
   if(output.length!==1||output[0].type!=='application/pdf'||!output[0].bytes.length)throw new Error('This step must produce one PDF.');current=output;
  }catch(e){if(signal.aborted)throw e;throw new Error(`Step ${i+1} (${safe[i].operation}): ${e instanceof Error?e.message:'Processing failed.'}`);}
 }
 progress(1,safe.length-1);return [{...current[0],name:'workflow.pdf'}];
}
