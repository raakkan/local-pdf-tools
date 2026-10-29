import { PDFDocument, degrees, pushGraphicsState, popGraphicsState, concatTransformationMatrix } from 'pdf-lib';
import {loadSafe,assertRewritable,parseRange,type OutputFile,type Progress} from './index';
import {visibleGeometry} from './extensions';
export class OcrSession {
 private constructor(private doc:PDFDocument){}
 static async create(bytes:Uint8Array){const doc=await loadSafe(bytes);assertRewritable(doc,'ocr');return new OcrSession(doc);}
 async add(index:number,bytes:Uint8Array){
  if(!Number.isInteger(index)||index<0||index>=this.doc.getPageCount())throw new Error('Invalid OCR page.');
  const layer=await PDFDocument.load(bytes),page=this.doc.getPage(index),g=visibleGeometry(page),b=g.box;
  if(layer.getPageCount()!==1)throw new Error('Invalid OCR text layer.');
  const [embedded]=await this.doc.embedPdf(layer,[0]);
  const matrices:Record<number,[number,number,number,number,number,number]>={0:[1,0,0,1,b.x,b.y],90:[0,1,-1,0,b.x+b.width,b.y],180:[-1,0,0,-1,b.x+b.width,b.y+b.height],270:[0,-1,1,0,b.x,b.y+b.height]};
  page.pushOperators(pushGraphicsState(),concatTransformationMatrix(...matrices[g.rotation]));
  page.drawPage(embedded,{x:0,y:0,width:g.width,height:g.height,opacity:0});page.pushOperators(popGraphicsState());
 }
 async finish(){return this.doc.save({updateFieldAppearances:false});}
}

/** Rotate selected pages on a temporary copy prior to OCR. */
export async function rotateForOcr(bytes:Uint8Array,range:string|undefined,rotation:number,progress:Progress=()=>{}):Promise<OutputFile>{
 if(![90,180,270].includes(rotation))throw new Error('Choose a valid OCR rotation.');const doc=await loadSafe(bytes);assertRewritable(doc,'ocr');const pages=parseRange(range,doc.getPageCount());
 for(let i=0;i<pages.length;i++){const page=doc.getPage(pages[i]),angle=page.getRotation().angle;if(!Number.isFinite(angle)||angle%90)throw new Error('This PDF contains unsupported page rotation.');page.setRotation(degrees(((angle+rotation)%360+360)%360));progress((i+1)/pages.length);}
 return {name:'ocr-rotated.pdf',type:'application/pdf',bytes:await doc.save({updateFieldAppearances:false})};
}
export interface OcrPageReport {page:number;status:'recognized'|'no-text'|'skipped-existing-text';confidence:number|null}
export function createOcrReport(language:string,dpi:number,rotation:number,pages:OcrPageReport[]):OutputFile{
 const report={version:1,language,dpi,rotationClockwise:rotation,pages,note:'OCR confidence is an estimate. Review recognized words and numbers.'};return {name:'ocr-report.json',type:'application/json',bytes:new TextEncoder().encode(JSON.stringify(report,null,2))};
}
