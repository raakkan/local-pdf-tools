import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import type {OutputFile,Progress} from './index';
export interface TextPdfOptions {text:string;pageSize:'a4'|'letter';fontSize:number;margin:number}
export async function createTextPdf(options:TextPdfOptions,progress:Progress=()=>{}):Promise<OutputFile>{
 const {text,pageSize,fontSize,margin}=options;
 if(!text.trim())throw new Error('Enter some text or choose a text file.');
 if(text.length>1_000_000)throw new Error('Text is too large. Use a file under one million characters.');
 if(!['a4','letter'].includes(pageSize)||!Number.isFinite(fontSize)||fontSize<8||fontSize>24||!Number.isFinite(margin)||margin<24||margin>100)throw new Error('Choose a font size from 8–24 and margins from 24–100 points.');
 const doc=await PDFDocument.create();doc.setCreator('Local PDF Tools');const font=await doc.embedFont(StandardFonts.Helvetica);
 const normalized=text.replace(/\r\n?/g,'\n').replace(/\t/g,'    ');
 try{font.encodeText(normalized.replace(/\n/g,''));}catch{throw new Error('This font cannot represent one or more characters. This release supports Latin and Western European text; other scripts and emoji are not supported yet.');}
 const [width,height]=pageSize==='letter'?[612,792]:[595.28,841.89],maxWidth=width-2*margin,lineHeight=fontSize*1.35;
 let page=doc.addPage([width,height]),y=height-margin-fontSize;
 const write=(line:string)=>{if(y<margin){page=doc.addPage([width,height]);y=height-margin-fontSize;}if(line)page.drawText(line,{x:margin,y,size:fontSize,font,color:rgb(0,0,0)});y-=lineHeight;};
 const lines=normalized.split('\n');
 for(let i=0;i<lines.length;i++){let line='';for(const token of lines[i].match(/\s+|\S+/gu)??[]){if(font.widthOfTextAtSize(line+token,fontSize)<=maxWidth){line+=token;continue;}if(line){write(line.trimEnd());line='';}for(const char of token){if(font.widthOfTextAtSize(line+char,fontSize)>maxWidth){write(line);line='';}line+=char;}}write(line.trimEnd());if(i%100===0)progress((i+1)/lines.length*.9);}
 const bytes=await doc.save();progress(1);return {name:'text.pdf',type:'application/pdf',bytes};
}
