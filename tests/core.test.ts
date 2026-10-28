import { describe, it, expect } from 'vitest';
import {PDFDocument,PDFName,PDFDict,PDFArray,PDFNumber,StandardFonts} from '../packages/pdf-core/src/testing';
import {runPdfJob,parseRange,assertRewritable,loadSafe,makeZip,type InputFile} from '../packages/pdf-core/src/index';
async function fixture(count=3):Promise<InputFile>{const doc=await PDFDocument.create();for(let i=0;i<count;i++){const p=doc.addPage([300+i*10,400]);p.drawText(`Page ${i+1}`);}return {name:'sample.pdf',type:'application/pdf',bytes:await doc.save()};}
describe('ranges',()=>{
 it('parses all, selected ranges, and deduplicates',()=>{expect(parseRange('',3)).toEqual([0,1,2]);expect(parseRange('1-2,2,4',4)).toEqual([0,1,3]);});
 it.each(['0','4','2-1','1-x','1,','1.5'])('rejects invalid range %s',r=>expect(()=>parseRange(r,3)).toThrow());
});
describe('PDF outputs',()=>{
 it('merges documents without changing source bytes',async()=>{const a=await fixture(2),b=await fixture(1),copy=a.bytes.slice();const [result]=await runPdfJob({operation:'merge',inputs:[a,b],options:{}});const d=await PDFDocument.load(result.bytes);expect(d.getPageCount()).toBe(3);expect(d.getPage(1).getWidth()).toBe(310);expect(d.getPage(2).getWidth()).toBe(300);expect(a.bytes).toEqual(copy);});
 it('reorders, drops, and rotates the selected pages',async()=>{const f=await fixture();const [out]=await runPdfJob({operation:'organize',inputs:[f],options:{pages:[{file:0,page:2,rotation:90},{file:0,page:0,rotation:0}]}});const d=await PDFDocument.load(out.bytes);expect(d.getPageCount()).toBe(2);expect(d.getPage(0).getWidth()).toBe(320);expect(d.getPage(0).getRotation().angle).toBe(90);});
 it('splits selected pages into independent documents',async()=>{const outputs=await runPdfJob({operation:'split',inputs:[await fixture()],options:{range:'1,3',separate:true}});expect(outputs).toHaveLength(2);for(const f of outputs)expect((await PDFDocument.load(f.bytes)).getPageCount()).toBe(1);expect(makeZip(outputs).bytes.slice(0,2)).toEqual(new Uint8Array([80,75]));});
 it('creates an image PDF with margins and landscape',async()=>{const bytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZ8AAAAASUVORK5CYII=','base64'));const [out]=await runPdfJob({operation:'images-to-pdf',inputs:[{name:'pixel.png',type:'image/png',bytes}],options:{pageSize:'letter',landscape:true,margin:20}});const d=await PDFDocument.load(out.bytes);expect(d.getPage(0).getSize()).toEqual({width:792,height:612});});
 it.each(['page-numbers','watermark'] as const)('writes %s and reports progress',async operation=>{const p:number[]=[];const [out]=await runPdfJob({operation,inputs:[await fixture()],options:{text:'PRIVATE',range:'1-2',start:7}},v=>p.push(v));expect(out.bytes.length).toBeGreaterThan(100);expect(p).toEqual([.5,1]);expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(3);});
 it('embeds a visual signature',async()=>{const signature=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZ8AAAAASUVORK5CYII=','base64'));const [out]=await runPdfJob({operation:'signature',inputs:[await fixture(1)],options:{signature}});expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(1);});
 it('rejects missing signatures and malformed PDFs',async()=>{await expect(runPdfJob({operation:'signature',inputs:[await fixture()],options:{}})).rejects.toThrow('signature');await expect(loadSafe(new Uint8Array([1,2,3]))).rejects.toThrow('Unable to read');});
 it('handles a 500-page text document',async()=>{const [out]=await runPdfJob({operation:'split',inputs:[await fixture(500)],options:{range:'1,250,500'}});expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(3);},20000);
});
describe('rewrite protection',()=>{
 it('rejects signature fields',async()=>{const d=await PDFDocument.create();d.addPage();const sig=d.context.obj({Type:'Sig',ByteRange:[0,1,2,3]});d.context.register(sig);expect(()=>assertRewritable(d)).toThrow('digital signature');});
 it('rejects interactive forms',async()=>{const d=await PDFDocument.create();const p=d.addPage();d.getForm().createTextField('name').addToPage(p);expect(()=>assertRewritable(d)).toThrow('forms');});
 it.each(['Outlines','Names','StructTreeRoot','OCProperties'])('rejects advanced %s features',async key=>{const d=await PDFDocument.create();d.addPage();d.catalog.set(PDFName.of(key),d.context.obj({}));expect(()=>assertRewritable(d)).toThrow('advanced');});
 it('rejects annotations rather than losing them',async()=>{const d=await PDFDocument.create();const p=d.addPage();p.node.set(PDFName.of('Annots'),d.context.obj([{Type:'Annot',Subtype:'Link'}]));expect(()=>assertRewritable(d)).toThrow('annotations');});
});
