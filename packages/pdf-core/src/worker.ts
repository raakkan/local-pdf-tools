import {zipSync} from 'fflate';
import { runPdfJob, type PdfJob } from './index';
import { CompressionSession, type EncodedCompressionImage } from './compression';
import {validatePasswordDocument} from './password';
import {OcrSession} from './ocr';
let ocr:OcrSession|null=null;
let session:CompressionSession|null=null;
const progress=(value:number)=>self.postMessage({type:'progress',value});
async function advance(){const next=session!.nextImage();if(next){self.postMessage({type:'compression-image',image:next},{transfer:[next.bytes.buffer as ArrayBuffer]});}else{const files=[await session!.finish()];session=null;self.postMessage({type:'done',files},{transfer:files.map(f=>f.bytes.buffer as ArrayBuffer)});}}
self.onmessage=async(event:MessageEvent<any>)=>{
 try{
  if(event.data.type==='batch-zip'){const files=event.data.files as import('./index').OutputFile[];const names=new Set<string>();for(const f of files){if(!f.name||/[\\/\x00-\x1f]/.test(f.name)||names.has(f.name))throw new Error('Invalid or duplicate archive filename.');names.add(f.name);}const bytes=zipSync(Object.fromEntries(files.map(f=>[f.name,f.bytes])),{level:0});self.postMessage({type:'done',files:[{name:'local-pdf-tools-batch.zip',type:'application/zip',bytes}]},{transfer:[bytes.buffer as ArrayBuffer]});return;}
  if(event.data.type==='password-validate'){await validatePasswordDocument(event.data.bytes,event.data.operation);self.postMessage({type:'validated'});return;}
  if(event.data.type==='ocr-init'){ocr=await OcrSession.create(event.data.bytes);self.postMessage({type:'ocr-ready'});return;}
  if(event.data.type==='ocr-layer'){if(!ocr)throw new Error('No OCR session.');await ocr.add(event.data.page,event.data.bytes);self.postMessage({type:'ocr-ready'});return;}
  if(event.data.type==='ocr-finish'){if(!ocr)throw new Error('No OCR session.');const bytes=await ocr.finish();ocr=null;self.postMessage({type:'ocr-output',bytes},{transfer:[bytes.buffer as ArrayBuffer]});return;}
  if('type'in event.data){if(!session)throw new Error('No active image compression job.');session.acceptImage(event.data);await advance();return;}
  if(event.data.operation==='compress'&&event.data.options.compressionMode==='images'){if(event.data.inputs.length!==1)throw new Error('Choose one PDF for compression.');session=await CompressionSession.create(event.data.inputs[0],event.data.options,progress);await advance();return;}
  const files=await runPdfJob(event.data,progress);self.postMessage({type:'done',files},{transfer:files.map(f=>f.bytes.buffer as ArrayBuffer)});
 }catch(error){session=null;ocr=null;self.postMessage({type:'error',message:error instanceof Error?error.message:'Unable to process this document.'});}
};
