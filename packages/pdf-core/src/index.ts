import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { CompressionSession } from './compression';
export type { CompressionSummary } from './compression';
import { assertOperationCompatible, documentCompatibility } from './compatibility';
export { documentCompatibility } from './compatibility';
export type { DocumentCompatibility } from './compatibility';
import { extensionOperations, inspectDocument, visibleGeometry, runExtendedPdfJob } from './extensions';
export type { InspectionReport } from './extensions';
import { zipSync } from 'fflate';
export type Operation = 'protect-pdf' | 'unlock-pdf' | 'ocr' | 'merge' | 'split' | 'organize' | 'images-to-pdf' | 'pdf-to-images' | 'extract-text' | 'page-numbers' | 'watermark' | 'signature' | 'inspect-pdf' | 'metadata' | 'alternate-merge' | 'resize-pdf' | 'crop-pdf' | 'header-footer' | 'n-up' | 'compress';
export interface InputFile { name: string; bytes: Uint8Array; type: string }
export interface PageRef { file: number; page: number; rotation: number; blank?: boolean }
export interface JobOptions { password?:string; ocrLanguage?:string; ocrDpi?:number; ocrOutput?:'both'|'pdf'|'text'; ocrExisting?:boolean; compressionMode?:'lossless'|'images'; imageQuality?:number; maxImageDimension?:number; metadata?: {title?:string;author?:string;subject?:string;keywords?:string}; removeMetadata?:boolean; reverseBack?:boolean; cropTop?:number; cropRight?:number; cropBottom?:number; cropLeft?:number; headerText?:string; footerText?:string; alignment?:'left'|'center'|'right'; fontSize?:number; pagesPerSheet?:2|4; gap?:number; range?: string; separate?: boolean; pages?: PageRef[]; pageSize?: 'a4' | 'letter' | 'fit'; landscape?: boolean; margin?: number; text?: string; position?: 'bottom-center' | 'top-center' | 'bottom-right'; start?: number; opacity?: number; rotation?: number; imageFormat?: 'png' | 'jpeg'; scale?: number; signature?: Uint8Array; signatureX?: number; signatureY?: number; signatureWidth?: number }
export interface PdfJob { operation: Operation; inputs: InputFile[]; options: JobOptions }
export interface OutputFile { ocr?:{recognized:number;skipped:number;lowConfidence:number[]}; compression?: import('./compression').CompressionSummary; name: string; bytes: Uint8Array; type: string }
export type Progress = (fraction: number) => void;
export const tools: {id: Operation; name: string; description: string; category: string}[] = [
  {id:'protect-pdf',name:'Protect PDF',description:'Keep private documents under lock.',category:'Security'},
  {id:'unlock-pdf',name:'Unlock PDF',description:'Save an unlocked copy with your password.',category:'Security'},
  {id:'ocr',name:'OCR PDF',description:'Make scanned words searchable.',category:'Convert'},
  {id:'compress',name:'Compress PDF',description:'A lighter file. Still your document.',category:'Optimize'},
  {id:'merge',name:'Merge PDF',description:'Bring your documents together.',category:'Organize'},
  {id:'split',name:'Split PDF',description:'Keep just the pages you need.',category:'Organize'},
  {id:'organize',name:'Organize pages',description:'Reorder, rotate, and make it yours.',category:'Organize'},
  {id:'images-to-pdf',name:'Images to PDF',description:'Turn snapshots into a document.',category:'Convert'},
  {id:'pdf-to-images',name:'PDF to images',description:'Save each page as a crisp image.',category:'Convert'},
  {id:'extract-text',name:'Extract text',description:'A fresh start for your words.',category:'Convert'},
  {id:'page-numbers',name:'Page numbers',description:'Put every page in its place.',category:'Personalize'},
  {id:'watermark',name:'Watermark',description:'Add a personal stamp.',category:'Personalize'},
  {id:'inspect-pdf',name:'Inspect PDF',description:'Get to know your document.',category:'Inspect'},
  {id:'metadata',name:'Edit metadata',description:'Give your document the right details.',category:'Personalize'},
  {id:'alternate-merge',name:'Alternate merge',description:'Reunite the fronts and backs.',category:'Organize'},
  {id:'resize-pdf',name:'Resize pages',description:'A consistent fit for every page.',category:'Organize'},
  {id:'crop-pdf',name:'Crop pages',description:'Bring the important parts into view.',category:'Organize'},
  {id:'header-footer',name:'Headers & footers',description:'Add context from top to bottom.',category:'Personalize'},
  {id:'n-up',name:'Pages per sheet',description:'A little less paper. Just as useful.',category:'Organize'},
  {id:'signature',name:'Visual signature',description:'Place your handwritten signature.',category:'Personalize'},
];
export function parseRange(value: string | undefined, count: number): number[] {
  if (!Number.isInteger(count) || count < 1) throw new Error('This PDF has no pages.');
  if (!value?.trim()) return Array.from({length:count},(_,i)=>i);
  const result = new Set<number>();
  for (const part of value.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Use page ranges such as 1-3, 5, 8-10.');
    const a = Number(match[1]), b = Number(match[2] || match[1]);
    if (a < 1 || b < a || b > count) throw new Error(`Choose pages between 1 and ${count}, in ascending ranges.`);
    for (let i=a;i<=b;i++) result.add(i-1);
  }
  return [...result];
}
export function makeZip(files: OutputFile[]): OutputFile {
  return {name:'local-pdf-tools.zip',type:'application/zip',bytes:zipSync(Object.fromEntries(files.map((f,i)=>[`${i+1}-${f.name}`,f.bytes])),{level:0})};
}
export async function loadSafe(bytes: Uint8Array): Promise<PDFDocument> {
  let doc: PDFDocument;
  try { doc = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true }); }
  catch { throw new Error('Unable to read this PDF. It may be damaged or password-protected. Use Unlock PDF first for encrypted documents.'); }
  return doc;
}
export function assertRewritable(doc:PDFDocument,operation:Operation='merge'){assertOperationCompatible(doc,operation);}

function number(value: number | undefined, fallback: number, min: number, max: number) {
  const n = value ?? fallback;
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Enter a number from ${min} to ${max}.`);
  return n;
}
export async function runPdfJob(job: PdfJob, progress: Progress = ()=>{}): Promise<OutputFile[]> {
  const {operation, inputs, options:o} = job;
  if (!inputs.length) throw new Error('Choose at least one file.');
  if (!['merge','images-to-pdf','alternate-merge'].includes(operation) && inputs.length!==1) throw new Error('Choose one PDF for this tool.');
  if(operation==='inspect-pdf'){const doc=await loadSafe(inputs[0].bytes);let warning:string|null=null;try{assertRewritable(doc);}catch(e){warning=e instanceof Error?e.message:'Rewriting is not supported.';}progress(1);return [{name:'document-report.json',bytes:new TextEncoder().encode(JSON.stringify(inspectDocument(doc,warning,documentCompatibility(doc)),null,2)),type:'application/json'}];}
  if(operation==='compress'){if(o.compressionMode==='images')throw new Error('Image compression uses the browser image adapter.');const session=await CompressionSession.create(inputs[0],o,progress);return [await session.finish()];}
  if (['pdf-to-images','extract-text','ocr','protect-pdf','unlock-pdf'].includes(operation)) throw new Error('This operation uses the PDF.js rendering adapter.');
  const out = await PDFDocument.create();
  out.setProducer('Local PDF Tools'); out.setCreator('Local PDF Tools');
  const output = async (doc: PDFDocument, name: string): Promise<OutputFile> => ({name, bytes:await doc.save({updateFieldAppearances:false}), type:'application/pdf'});
  if (operation === 'images-to-pdf') {
    const margin = number(o.margin,24,0,100);
    for (let i=0;i<inputs.length;i++) {
      const input=inputs[i];
      const img = input.type==='image/png' ? await out.embedPng(input.bytes) : input.type==='image/jpeg' ? await out.embedJpg(input.bytes) : null;
      if (!img) throw new Error('Choose JPEG or PNG images.');
      let size: [number,number] = o.pageSize==='fit' ? [img.width+margin*2,img.height+margin*2] : o.pageSize==='letter' ? [612,792] : [595.28,841.89];
      if (o.landscape && size[0]<size[1]) size=[size[1],size[0]];
      const page=out.addPage(size), scale=Math.min((size[0]-margin*2)/img.width,(size[1]-margin*2)/img.height);
      page.drawImage(img,{x:(size[0]-img.width*scale)/2,y:(size[1]-img.height*scale)/2,width:img.width*scale,height:img.height*scale});
      progress((i+1)/inputs.length);
    }
    return [await output(out,'images.pdf')];
  }
  const docs: PDFDocument[]=[];
  for (const input of inputs) { const d=await loadSafe(input.bytes); assertRewritable(d,operation); docs.push(d); }
  if ((extensionOperations as readonly string[]).includes(operation)) return runExtendedPdfJob(operation,docs,o,out,parseRange(o.range,docs[0].getPageCount()),progress);
  if (operation==='merge' || operation==='organize' || operation==='split') {
    let refs: PageRef[];
    if (operation==='organize') refs=o.pages ?? [];
    else if (operation==='merge') refs=docs.flatMap((d,file)=>d.getPages().map((_,page)=>({file,page,rotation:0})));
    else refs=parseRange(o.range,docs[0].getPageCount()).map(page=>({file:0,page,rotation:0}));
    if (!refs.length) throw new Error('Keep at least one page.');
    const separate: OutputFile[]=[];
    for (let i=0;i<refs.length;i++) {
      const r=refs[i];
      if (!docs[r.file] || !Number.isInteger(r.page) || r.page<0 || r.page>=docs[r.file].getPageCount() || !Number.isFinite(r.rotation) || r.rotation%90) throw new Error('Invalid page selection. Choose the files again.');
      const target=operation==='split' && o.separate ? await PDFDocument.create() : out;
      const blankSize=visibleGeometry(docs[r.file].getPage(r.page)).box;
      const page=r.blank?target.addPage([blankSize.width,blankSize.height]):(await target.copyPages(docs[r.file],[r.page]))[0];
      if(r.blank)page.setRotation(docs[r.file].getPage(r.page).getRotation());
      page.setRotation(degrees((page.getRotation().angle+r.rotation)%360)); if(!r.blank)target.addPage(page);
      if (target!==out) separate.push(await output(target,`page-${r.page+1}.pdf`));
      progress((i+1)/refs.length);
    }
    return separate.length ? separate : [await output(out,`${operation}.pdf`)];
  }
  const doc=docs[0], pages=parseRange(o.range,doc.getPageCount());
  const font=await doc.embedFont(StandardFonts.Helvetica);
  let signature;
  if (operation==='signature') {
    if (!o.signature?.length) throw new Error('Draw or import a signature first.');
    const png=o.signature[0]===137;
    signature=png ? await doc.embedPng(o.signature) : await doc.embedJpg(o.signature);
  }
  for (let i=0;i<pages.length;i++) {
    const page=doc.getPage(pages[i]), {width,height}=page.getSize();
    if (operation==='page-numbers') {
      const text=String(number(o.start,1,0,1000000)+i), w=font.widthOfTextAtSize(text,11);
      page.drawText(text,{font,size:11,x:o.position==='bottom-right'?width-w-28:(width-w)/2,y:o.position==='top-center'?height-32:24,color:rgb(.25,.3,.3)});
    } else if (operation==='watermark') {
      const text=o.text?.trim(); if (!text) throw new Error('Enter your watermark text.');
      const size=Math.min(52,width*.75/Math.max(font.widthOfTextAtSize(text,1),1));
      try { page.drawText(text,{font,size,x:(width-font.widthOfTextAtSize(text,size))/2,y:height/2,opacity:number(o.opacity,.18,.01,1),rotate:degrees(number(o.rotation,0,-180,180)),color:rgb(.12,.3,.25)}); }
      catch { throw new Error('Watermark text currently supports Latin characters. Choose supported characters and try again.'); }
    } else if (operation==='signature' && signature) {
      const w=width*number(o.signatureWidth,.25,.05,.8), h=w*signature.height/signature.width;
      const x=(width-w)*number(o.signatureX,.65,0,1), y=(height-Math.min(h,height))*number(o.signatureY,.12,0,1);
      page.drawImage(signature,{x,y,width:w,height:Math.min(h,height)});
    } else throw new Error('Unknown PDF operation.');
    progress((i+1)/pages.length);
  }
  return [await output(doc,`${operation}.pdf`)];
}
