import {createWorker,type Worker as TessWorker} from 'tesseract.js';
import {openPdf,renderPage} from './browser';
import {parseRange,type PdfJob,type OutputFile,type Progress} from './index';
import {createOcrReport,type OcrPageReport} from './ocr';
import {ocrBase,ocrLanguages} from './ocr-assets';
export async function runOcrJob(job:PdfJob,progress:Progress,signal:AbortSignal):Promise<OutputFile[]>{
 const language=job.options.ocrLanguage??'eng',dpi=job.options.ocrDpi??200,output=job.options.ocrOutput??'both';
 if(!(language in ocrLanguages)||![150,200,300].includes(dpi)||!['pdf','text','both'].includes(output)||job.options.ocrReport!==undefined&&typeof job.options.ocrReport!=='boolean')throw new Error('Choose valid OCR settings.');
 if(job.inputs.length!==1)throw new Error('Choose one PDF.');
 signal.throwIfAborted();
 const doc=await openPdf(job.inputs[0].bytes,undefined,signal);let tess:TessWorker|undefined,writer:Worker|undefined,canvas:HTMLCanvasElement|undefined;
 let closed=false;
 let fail:(e:unknown)=>void=()=>{};
 const failure=new Promise<never>((_,reject)=>{fail=reject;});
 const abort=()=>{fail(new Error('Cancelled.'));void tess?.terminate();writer?.terminate();void doc.destroy();};signal.addEventListener('abort',abort,{once:true});
 const guard=<T>(p:Promise<T>)=>Promise.race([p,failure]);
 const ask=(message:unknown)=>guard(new Promise<any>((resolve,reject)=>{writer!.onmessage=e=>e.data.type==='error'?reject(new Error(e.data.message)):resolve(e.data);writer!.onerror=()=>reject(new Error('The OCR PDF worker stopped. Try a smaller document.'));writer!.postMessage(message);}));
 try{
  signal.throwIfAborted();
  if(output!=='text'){writer=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});await ask({type:'ocr-init',bytes:job.inputs[0].bytes});}
  const pages=parseRange(job.options.range,doc.numPages),texts:string[]=[],lowConfidence:number[]=[],reportPages:OcrPageReport[]=[];let recognized=0,skipped=0,hasText=false;
  for(let i=0;i<pages.length;i++){
   signal.throwIfAborted();const page=await guard(doc.getPage(pages[i]+1)),content=await guard(page.getTextContent()),existing=content.items.map(t=>'str'in t?t.str:'').join(' ').trim();
   if(existing&&!job.options.ocrExisting){skipped++;hasText=true;reportPages.push({page:pages[i]+1,status:'skipped-existing-text',confidence:null});texts.push(`Page ${pages[i]+1}\n${existing}`);page.cleanup();progress((i+1)/pages.length);continue;}
   const view=page.getViewport({scale:dpi/72});if(view.width*view.height>16_000_000)throw new Error(`Page ${pages[i]+1} is too large for OCR at ${dpi} DPI. Choose a lower resolution.`);
   if(!tess){
    const init=createWorker(language,1,{workerPath:`${ocrBase()}worker.min.js`,corePath:`${ocrBase()}core/`,langPath:`${ocrBase()}lang/`,workerBlobURL:false,cacheMethod:'none',gzip:false,errorHandler:e=>fail(new Error(String(e))),logger:m=>{if(m.status==='recognizing text')progress((i+m.progress*.9)/pages.length);}});
    void init.then(w=>{if(signal.aborted||closed)void w.terminate();}).catch(()=>{});
    const timer=setTimeout(()=>fail(new Error('OCR initialization timed out. Reconnect to prepare the language pack again.')),90000);
    try{tess=await guard(init);}finally{clearTimeout(timer);}
   }
   canvas=document.createElement('canvas');await guard(renderPage(doc,pages[i],canvas,dpi/72));
   const result=await guard(tess.recognize(canvas,{pdfTextOnly:true},{text:true,pdf:output!=='text'}));
   const text=result.data.text.trim();const confidence=Number.isFinite(result.data.confidence)?Math.max(0,Math.min(100,result.data.confidence)):null;reportPages.push({page:pages[i]+1,status:text?'recognized':'no-text',confidence});texts.push(`Page ${pages[i]+1}\n${text||'[No readable text found]'}`);
   if(text){hasText=true;recognized++;if(result.data.confidence<70)lowConfidence.push(pages[i]+1);if(writer){if(!result.data.pdf?.length)throw new Error('OCR did not return a text layer.');await ask({type:'ocr-layer',page:pages[i],bytes:Uint8Array.from(result.data.pdf)});}}
   canvas.width=canvas.height=0;canvas=undefined;page.cleanup();progress((i+1)/pages.length);
  }
  if(!hasText)throw new Error('No readable text found. Try a clearer scan, another language, or a higher resolution.');
  const files:OutputFile[]=[],ocr={recognized,skipped,lowConfidence};
  if(writer){const result=recognized?await ask({type:'ocr-finish'}):{bytes:job.inputs[0].bytes.slice()};files.push({name:'searchable.pdf',bytes:result.bytes,type:'application/pdf',ocr});}
  if(output!=='pdf')files.push({name:'recognized-text.txt',bytes:new TextEncoder().encode(texts.join('\n\n')),type:'text/plain;charset=utf-8',ocr});
  if(job.options.ocrReport)files.push(createOcrReport(language,dpi,job.options.ocrRotation??0,reportPages));
  return files;
 }finally{closed=true;signal.removeEventListener('abort',abort);if(canvas)canvas.width=canvas.height=0;await tess?.terminate();writer?.terminate();await doc.destroy();}
}
