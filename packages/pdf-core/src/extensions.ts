import { PDFDocument, PDFName, PDFRef, PDFNumber, StandardFonts, degrees, rgb, pushGraphicsState, popGraphicsState, concatTransformationMatrix, type PDFPage } from 'pdf-lib';
import { deleteIfUnreferenced } from './compatibility';
import type { DocumentCompatibility } from './compatibility';
import type { JobOptions, Operation, OutputFile, Progress } from './index';
export const extensionOperations = ['metadata','alternate-merge','resize-pdf','crop-pdf','header-footer','n-up','booklet'] as const;
export interface InspectionReport {
  pageCount: number;
  metadata: { title:string; author:string; subject:string; keywords:string; creator:string; producer:string; created:string; modified:string; hasXmp:boolean };
  pages: {page:number; widthPt:number; heightPt:number; widthMm:number; heightMm:number; rotation:number; orientation:string; cropBox:Box; mediaBox:Box}[];
  rewriteWarning: string | null;
  compatibility:DocumentCompatibility;
}
interface Box { x:number; y:number; width:number; height:number }
const finite=(v:number|undefined,fallback:number,min:number,max:number)=>{const n=v??fallback;if(!Number.isFinite(n)||n<min||n>max)throw new Error(`Enter a number from ${min} to ${max}.`);return n;};
export function visibleGeometry(page:PDFPage) {
  const media=page.getMediaBox(),crop=page.getCropBox();
  const x=Math.max(media.x,crop.x),y=Math.max(media.y,crop.y),right=Math.min(media.x+media.width,crop.x+crop.width),top=Math.min(media.y+media.height,crop.y+crop.height);
  const box={x,y,width:right-x,height:top-y};
  if(!Object.values(box).every(Number.isFinite)||box.width<=0||box.height<=0)throw new Error('This page has an invalid visible area.');
  const rotation=((page.getRotation().angle%360)+360)%360;
  if(rotation%90)throw new Error('Only page rotations in multiples of 90 degrees are supported.');
  return {box,rotation,width:rotation%180?box.height:box.width,height:rotation%180?box.width:box.height};
}
export function inspectDocument(doc:PDFDocument,rewriteWarning:string|null,compatibility:DocumentCompatibility):InspectionReport {
  const read=(fn:()=>string|undefined)=>{try{return fn()??'';}catch{return '[unreadable]';}};
  return {compatibility,pageCount:doc.getPageCount(),metadata:{title:read(()=>doc.getTitle()),author:read(()=>doc.getAuthor()),subject:read(()=>doc.getSubject()),keywords:read(()=>doc.getKeywords()),creator:read(()=>doc.getCreator()),producer:read(()=>doc.getProducer()),created:read(()=>doc.getCreationDate()?.toISOString()),modified:read(()=>doc.getModificationDate()?.toISOString()),hasXmp:doc.catalog.has(PDFName.of('Metadata'))},pages:doc.getPages().map((page,i)=>{
    const g=visibleGeometry(page);const unit=page.node.lookupMaybe(PDFName.of('UserUnit'),PDFNumber)?.asNumber()??1;
    if(!Number.isFinite(unit)||unit<=0)throw new Error('This page has an invalid unit size.');
    const w=g.width*unit,h=g.height*unit;
    return {page:i+1,widthPt:w,heightPt:h,widthMm:w*25.4/72,heightMm:h*25.4/72,rotation:g.rotation,orientation:w===h?'square':w>h?'landscape':'portrait',cropBox:page.getCropBox(),mediaBox:page.getMediaBox()};
  }),rewriteWarning};
}
function paper(options:JobOptions):[number,number] {let dimensions:[number,number]=options.pageSize==='letter'?[612,792]:[595.28,841.89];if(options.landscape)dimensions=[dimensions[1],dimensions[0]];return dimensions;}
async function placePage(target:PDFPage,source:PDFPage,x:number,y:number,width:number,height:number) {
  const g=visibleGeometry(source);
  if(!source.node.Contents())return; // A genuinely blank page needs no form XObject.
  const embedded=await target.doc.embedPage(source,{left:g.box.x,bottom:g.box.y,right:g.box.x+g.box.width,top:g.box.y+g.box.height});
  const scale=Math.min(width/g.width,height/g.height),w=g.box.width*scale,h=g.box.height*scale;
  const left=x+(width-g.width*scale)/2,bottom=y+(height-g.height*scale)/2;
  target.drawPage(embedded,{x:left+(g.rotation===180?w:g.rotation===270?h:0),y:bottom+(g.rotation===90?w:g.rotation===180?h:0),width:w,height:h,rotate:degrees(-g.rotation)});
}
export async function runExtendedPdfJob(operation:Operation,docs:PDFDocument[],options:JobOptions,out:PDFDocument,selected:number[],progress:Progress):Promise<OutputFile[]> {
  const doc=docs[0];
  if(operation==='metadata') {
    const xmp=doc.catalog.get(PDFName.of('Metadata'));
    doc.catalog.delete(PDFName.of('Metadata'));if(xmp instanceof PDFRef)deleteIfUnreferenced(doc,xmp); // Avoid stale XMP disagreeing with edited standard properties.
    if(options.removeMetadata){const info=doc.context.trailerInfo.Info;doc.context.trailerInfo.Info=undefined;if(info instanceof PDFRef)deleteIfUnreferenced(doc,info);}
    else {
      const m=options.metadata;if(!m)throw new Error('Enter the metadata fields to save.');
      for(const value of Object.values(m))if(typeof value!=='string'||value.length>2000)throw new Error('Metadata values must be text, up to 2,000 characters.');
      if(m.title!==undefined)doc.setTitle(m.title);if(m.author!==undefined)doc.setAuthor(m.author);if(m.subject!==undefined)doc.setSubject(m.subject);if(m.keywords!==undefined)doc.setKeywords(m.keywords.split(',').map(s=>s.trim()).filter(Boolean));
    }
    progress(1);return [{name:'metadata.pdf',bytes:await doc.save({updateFieldAppearances:false}),type:'application/pdf'}];
  }
  if(operation==='alternate-merge') {
    if(docs.length!==2)throw new Error('Choose exactly two PDFs: fronts first, backs second.');
    const front=docs[0].getPageIndices(),back=docs[1].getPageIndices();if(options.reverseBack)back.reverse();
    const total=front.length+back.length;let done=0;
    for(let i=0;i<Math.max(front.length,back.length);i++)for(const [which,index]of [[0,front[i]],[1,back[i]]] as const){if(index===undefined)continue;const [p]=await out.copyPages(docs[which],[index]);out.addPage(p);progress(++done/total);}
  } else if(operation==='crop-pdf') {
    const top=finite(options.cropTop,5,0,95)/100,right=finite(options.cropRight,5,0,95)/100,bottom=finite(options.cropBottom,5,0,95)/100,left=finite(options.cropLeft,5,0,95)/100;
    if(top+bottom>=1||left+right>=1)throw new Error('Keep a visible area: opposing crop percentages must add up to less than 100%.');
    for(let i=0;i<selected.length;i++){
      const page=doc.getPage(selected[i]),{box,rotation}=visibleGeometry(page);
      const [l,r,b,t]=rotation===90?[top,bottom,left,right]:rotation===180?[right,left,top,bottom]:rotation===270?[bottom,top,right,left]:[left,right,bottom,top];
      page.setCropBox(box.x+box.width*l,box.y+box.height*b,box.width*(1-l-r),box.height*(1-b-t));progress((i+1)/selected.length);
    }
    return [{name:'cropped.pdf',bytes:await doc.save({updateFieldAppearances:false}),type:'application/pdf'}];
  } else if(operation==='booklet') {
    if(options.binding!==undefined&&options.binding!=='left'&&options.binding!=='right')throw new Error('Choose left or right binding.');
    const size=paper({...options,landscape:true}),margin=finite(options.margin,24,0,100),gap=finite(options.gap,12,0,72),w=(size[0]-2*margin-gap)/2,h=size[1]-2*margin;
    if(w<=0||h<=0)throw new Error('Choose smaller margins or spacing.');
    const padded=Math.ceil(selected.length/4)*4,slots=Array.from({length:padded},(_,i)=>i<selected.length?selected[i]:null);
    for(let sheet=0;sheet<padded/4;sheet++){
      const front=[slots[padded-1-2*sheet],slots[2*sheet]],back=[slots[2*sheet+1],slots[padded-2-2*sheet]];
      for(const pair of [front,back]){if(options.binding==='right')pair.reverse();const target=out.addPage(size);for(let col=0;col<2;col++)if(pair[col]!==null)await placePage(target,doc.getPage(pair[col]!),margin+col*(w+gap),margin,w,h);}
      progress((sheet+1)/(padded/4));
    }
  } else if(operation==='resize-pdf'||operation==='n-up') {
    const size=paper(options),margin=finite(options.margin,24,0,100),gap=finite(options.gap,12,0,72);
    if(operation==='resize-pdf'){
      const chosen=new Set(selected);
      for(let i=0;i<doc.getPageCount();i++){
        if(chosen.has(i)){const p=out.addPage(size);await placePage(p,doc.getPage(i),margin,margin,size[0]-2*margin,size[1]-2*margin);}
        else{const [p]=await out.copyPages(doc,[i]);out.addPage(p);}
        progress((i+1)/doc.getPageCount());
      }
    }else{
      const count=options.pagesPerSheet??2;if(count!==2&&count!==4)throw new Error('Choose 2 or 4 pages per sheet.');
      const cols=count===4?2:options.landscape?2:1,rows=count/cols;
      const w=(size[0]-2*margin-gap*(cols-1))/cols,h=(size[1]-2*margin-gap*(rows-1))/rows;
      if(w<=0||h<=0)throw new Error('Choose smaller margins or spacing.');
      let sheet:PDFPage|undefined;
      for(let i=0;i<selected.length;i++){
        if(i%count===0)sheet=out.addPage(size);
        const pos=i%count,col=pos%cols,row=Math.floor(pos/cols);
        await placePage(sheet!,doc.getPage(selected[i]),margin+col*(w+gap),size[1]-margin-(row+1)*h-row*gap,w,h);progress((i+1)/selected.length);
      }
    }
  } else if(operation==='header-footer') {
    if(!options.headerText?.trim()&&!options.footerText?.trim())throw new Error('Enter a header or footer.');
    const font=await doc.embedFont(StandardFonts.Helvetica),size=finite(options.fontSize,11,6,36),margin=finite(options.margin,24,8,100),start=finite(options.start,1,0,1_000_000);
    if(!Number.isInteger(start))throw new Error('Start numbering with a whole number.');
    for(let i=0;i<selected.length;i++){
      const page=doc.getPage(selected[i]),g=visibleGeometry(page),b=g.box;
      const matrices:Record<number,[number,number,number,number,number,number]>={0:[1,0,0,1,b.x,b.y],90:[0,1,-1,0,b.x+b.width,b.y],180:[-1,0,0,-1,b.x+b.width,b.y+b.height],270:[0,-1,1,0,b.x,b.y+b.height]};
      if(g.width<=2*margin||g.height<=2*margin+size)throw new Error('This page is too small for the chosen margins and font size.');
      page.pushOperators(pushGraphicsState(),concatTransformationMatrix(...matrices[g.rotation]));
      for(const [raw,y]of [[options.headerText,g.height-margin-size],[options.footerText,margin]] as const){
        if(!raw?.trim())continue;
        if(raw.length>500||/[\r\n]/.test(raw))throw new Error('Headers and footers must be a single line of up to 500 characters.');
        const text=raw.replaceAll('{page}',String(start+i)).replaceAll('{pages}',String(doc.getPageCount()));
        let w:number;try{w=font.widthOfTextAtSize(text,size);}catch{throw new Error('Header and footer text currently supports Latin characters.');}
        if(w>g.width-2*margin)throw new Error('Header or footer is too wide. Shorten the text or reduce the font size.');
        const x=options.alignment==='left'?margin:options.alignment==='right'?g.width-margin-w:(g.width-w)/2;
        page.drawText(text,{x,y,size,font,color:rgb(.2,.25,.2)});
      }
      page.pushOperators(popGraphicsState());progress((i+1)/selected.length);
    }
    return [{name:'header-footer.pdf',bytes:await doc.save({updateFieldAppearances:false}),type:'application/pdf'}];
  }else throw new Error('Unknown PDF operation.');
  return [{name:`${operation}.pdf`,bytes:await out.save(),type:'application/pdf'}];
}
