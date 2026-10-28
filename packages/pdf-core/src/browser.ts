import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PdfJob, OutputFile, Progress } from './index';
import { parseRange } from './index';
GlobalWorkerOptions.workerSrc = workerUrl;
const assets = new URL('pdf-assets/', new URL(import.meta.env.BASE_URL, location.href)).href;
export function openPdf(bytes:Uint8Array,password?:string,signal?:AbortSignal):Promise<PDFDocumentProxy>{
 signal?.throwIfAborted();
 const task=getDocument({data:bytes.slice(),password,cMapUrl:`${assets}cmaps/`,cMapPacked:true,standardFontDataUrl:`${assets}standard_fonts/`,wasmUrl:`${assets}wasm/`,enableXfa:false,useWasm:true});
 const abort=()=>{void task.destroy().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
 return task.promise.then(async doc=>{signal?.removeEventListener('abort',abort);if(signal?.aborted){await doc.destroy();signal.throwIfAborted();}return doc;},async error=>{signal?.removeEventListener('abort',abort);await task.destroy().catch(()=>{});throw error;});
}
export async function renderPage(doc: PDFDocumentProxy, index: number, canvas: HTMLCanvasElement, scale: number, rotation?: number) {
  const page=await doc.getPage(index+1), viewport=page.getViewport({scale,rotation:rotation ?? page.rotate});
  if (viewport.width*viewport.height>32_000_000) throw new Error('This page is too large to render at this resolution. Try a lower resolution.');
  canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
  const context=canvas.getContext('2d'); if (!context) throw new Error('Canvas is unavailable in this browser.');
  await page.render({canvas,canvasContext:context,viewport,background:'#ffffff'}).promise;
  page.cleanup();
}
export async function runBrowserJob(job: PdfJob, progress: Progress, signal: AbortSignal): Promise<OutputFile[]> {
  const doc=await openPdf(job.inputs[0].bytes,undefined,signal);
  const abort=()=>void doc.destroy(); signal.addEventListener('abort',abort,{once:true});
  try {
    if (signal.aborted) throw new Error('Cancelled.');
    const pages=parseRange(job.options.range,doc.numPages), files: OutputFile[]=[], text: string[]=[];
    for (let i=0;i<pages.length;i++) {
      signal.throwIfAborted();
      if (job.operation==='extract-text') {
        const page=await doc.getPage(pages[i]+1), content=await page.getTextContent();
        text.push(content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join('').trim()); page.cleanup();
      } else {
        const canvas=document.createElement('canvas');
        await renderPage(doc,pages[i],canvas,job.options.scale ?? 1.5);
        const type=job.options.imageFormat==='jpeg'?'image/jpeg':'image/png';
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image export failed.')),type,.9));
        files.push({name:`page-${pages[i]+1}.${type==='image/png'?'png':'jpg'}`,type,bytes:new Uint8Array(await blob.arrayBuffer())}); canvas.width=canvas.height=0;
      }
      progress((i+1)/pages.length); await new Promise(r=>setTimeout(r,0));
    }
    if (job.operation==='extract-text') {
      if (!text.some(t=>t.trim())) throw new Error('No selectable text found. This may be a scanned PDF; Use OCR PDF to recognize scanned text.');
      files.push({name:'extracted-text.txt',type:'text/plain;charset=utf-8',bytes:new TextEncoder().encode(text.join('\n\n'))});
    }
    return files;
  } finally { signal.removeEventListener('abort',abort); await doc.destroy(); }
}

export type { PDFDocumentProxy } from "pdfjs-dist";
