import {expect,it} from 'vitest';
import {PDFDocument} from '../packages/pdf-core/src/testing';
import {createTextPdf} from '../packages/pdf-core/src/text-pdf';
const options={text:'Café déjà vu\nSecond line',pageSize:'a4' as const,fontSize:12,margin:48};
it('creates a PDF with the requested page size and Latin text',async()=>{const output=await createTextPdf(options);const doc=await PDFDocument.load(output.bytes);expect(doc.getPageCount()).toBe(1);expect(doc.getPage(0).getWidth()).toBeCloseTo(595.28);});
it('wraps long words and paginates lines',async()=>{const output=await createTextPdf({...options,text:'word '.repeat(5000),pageSize:'letter'});const doc=await PDFDocument.load(output.bytes);expect(doc.getPageCount()).toBeGreaterThan(1);expect(doc.getPage(0).getWidth()).toBe(612);});
it('rejects unsupported glyphs instead of silently dropping them',async()=>{for(const text of ['தமிழ்','😀','\u0001'])await expect(createTextPdf({...options,text})).rejects.toThrow('cannot represent');});
it('rejects empty input, excessive text and invalid geometry',async()=>{for(const input of [{...options,text:'  '},{...options,text:'a'.repeat(1000001)},{...options,margin:200},{...options,fontSize:NaN}])await expect(createTextPdf(input)).rejects.toThrow();});
it('reports progress through completion',async()=>{const seen:number[]=[];await createTextPdf({...options,text:Array(250).fill('line').join('\n')},n=>seen.push(n));expect(seen.at(-1)).toBe(1);expect(seen).toEqual([...seen].sort((a,b)=>a-b));});
