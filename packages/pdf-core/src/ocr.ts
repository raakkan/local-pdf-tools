import { PDFDocument, pushGraphicsState, popGraphicsState, concatTransformationMatrix } from 'pdf-lib';
import {loadSafe,assertRewritable} from './index';
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
