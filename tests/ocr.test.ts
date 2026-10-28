import {it,expect} from 'vitest';
import {PDFDocument,PDFName,degrees} from '../packages/pdf-core/src/testing';
import {OcrSession} from '../packages/pdf-core/src/ocr';
import {compatibilityFixture} from './fixtures/compatibility';
for(const rotation of [0,90,180,270])it(`OCR retains crop, rotation and source structures at ${rotation} degrees`,async()=>{
 const fixture=await compatibilityFixture(),source=await PDFDocument.load(fixture.bytes),page=source.getPage(0);page.setCropBox(10,20,200,250);page.setRotation(degrees(rotation));
 const bytes=await source.save(),snapshot=bytes.slice(),session=await OcrSession.create(bytes),layer=await PDFDocument.create();layer.addPage([250,200]).drawText('Recognized words');await session.add(0,await layer.save());
 const result=await PDFDocument.load(await session.finish());expect(bytes).toEqual(snapshot);expect(result.getPageCount()).toBe(1);expect(result.getPage(0).getCropBox()).toEqual(page.getCropBox());expect(result.getPage(0).getRotation()).toEqual(page.getRotation());for(const key of ['AcroForm','Outlines','Names'])expect(result.catalog.get(PDFName.of(key))?.toString()).toBe(source.catalog.get(PDFName.of(key))?.toString());expect(result.getForm().getTextField('customer').getText()).toBe(source.getForm().getTextField('customer').getText());
});
it('OCR rejects signed PDFs before adding layers',async()=>{const d=await PDFDocument.create();d.addPage();d.catalog.set(PDFName.of('Signature'),d.context.obj({Type:'Sig',ByteRange:[0,1,2,3]}));await expect(OcrSession.create(await d.save())).rejects.toThrow('digital signature');});
it('OCR rejects an invalid page index',async()=>{const d=await PDFDocument.create();d.addPage();const session=await OcrSession.create(await d.save());await expect(session.add(2,new Uint8Array())).rejects.toThrow('Invalid OCR page');});
