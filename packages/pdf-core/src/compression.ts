import { PDFDocument, PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef } from 'pdf-lib';
import { Unzlib, zlibSync } from 'fflate';
import { assertOperationCompatible } from './compatibility';
import type { InputFile, JobOptions, OutputFile, Progress } from './index';
const MAX_STREAM=32*1024*1024,MAX_PIXELS=16_000_000;
export interface CompressionSummary { mode:'lossless'|'images'; inputBytes:number; outputBytes:number; savedBytes:number; savedPercent:number; usedOriginal:boolean; streamsRecompressed:number; imagesReencoded:number; imagesSkipped:number; warnings:string[] }
export interface CompressionImage { id:number; kind:'jpeg'|'rgb'|'gray'; width:number; height:number; bytes:Uint8Array; quality:number; maxDimension:number }
export interface EncodedCompressionImage { id:number; bytes?:Uint8Array; width?:number; height?:number }
function filterOf(stream:PDFRawStream):string|undefined {const f=stream.dict.lookup(PDFName.of('Filter'));if(f===undefined)return undefined;if(f instanceof PDFName)return f.toString();if(f instanceof PDFArray&&f.size()===1){const name=f.lookup(0);if(name instanceof PDFName)return name.toString();}return 'unsupported';}
function inflateBounded(bytes:Uint8Array):Uint8Array {
 const chunks:Uint8Array[]=[];let length=0;const decoder=new Unzlib(chunk=>{length+=chunk.length;if(length>MAX_STREAM)throw new Error('Stream limit');chunks.push(chunk);});
 for(let i=0;i<bytes.length;i+=4096)decoder.push(bytes.subarray(i,i+4096),i+4096>=bytes.length);
 const result=new Uint8Array(length);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;
}
export function repackStreams(doc:PDFDocument):number {
 let changed=0;
 for(const [ref,object]of doc.context.enumerateIndirectObjects()){
  if(!(object instanceof PDFRawStream)||object.dict.get(PDFName.of('Subtype'))===PDFName.of('Form'))continue;
  const filter=filterOf(object),old=object.getContents();if((filter===undefined&&object.dict.has(PDFName.of('DecodeParms')))||old.length>MAX_STREAM||(filter!==undefined&&filter!=='/FlateDecode'&&filter!=='/Fl'))continue;
  try{const raw=filter===undefined?old:inflateBounded(old);const compressed=zlibSync(raw,{level:9});if(compressed.length>=old.length)continue;const dict=object.dict.clone(doc.context);if(filter===undefined)dict.set(PDFName.of('Filter'),PDFName.of('FlateDecode'));dict.set(PDFName.of('Length'),PDFNumber.of(compressed.length));doc.context.assign(ref,PDFRawStream.of(dict,compressed));changed++;}catch{/* Leave unsupported or oversized streams untouched. */}
 }
 return changed;
}
function jpegRequiresPreservation(bytes:Uint8Array,width:number,height:number){
 if(bytes[0]!==255||bytes[1]!==216)return true;let matched=false;
 for(let i=2;i+4<bytes.length;){
  if(bytes[i++]!==255)return true;while(bytes[i]===255)i++;const marker=bytes[i++];if(marker===218||marker===217)return !matched;if(marker===1||(marker>=208&&marker<=215))continue;
  const length=(bytes[i]<<8)|bytes[i+1];if(length<2||i+length>bytes.length)return true;
  if(marker===225&&String.fromCharCode(...bytes.subarray(i+2,i+6))==='Exif')return true;
  if(marker===226&&String.fromCharCode(...bytes.subarray(i+2,i+13))==='ICC_PROFILE')return true;
  if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){if(length<8||bytes[i+2]!==8||((bytes[i+3]<<8)|bytes[i+4])!==height||((bytes[i+5]<<8)|bytes[i+6])!==width||bytes[i+7]!==3)return true;matched=true;}
  i+=length;
 }
 return !matched;
}
export function selectCompressionOutput(input:InputFile,candidate:Uint8Array,summary:Omit<CompressionSummary,'inputBytes'|'outputBytes'|'savedBytes'|'savedPercent'|'usedOriginal'>):OutputFile {
 const usedOriginal=candidate.length>=input.bytes.length,bytes=usedOriginal?input.bytes.slice():candidate,saved=input.bytes.length-bytes.length;
 return {name:usedOriginal?'original-copy.pdf':'compressed.pdf',bytes,type:'application/pdf',compression:{...summary,imagesSkipped:usedOriginal?summary.imagesSkipped+summary.imagesReencoded:summary.imagesSkipped,imagesReencoded:usedOriginal?0:summary.imagesReencoded,streamsRecompressed:usedOriginal?0:summary.streamsRecompressed,inputBytes:input.bytes.length,outputBytes:bytes.length,savedBytes:saved,savedPercent:input.bytes.length?saved/input.bytes.length*100:0,usedOriginal}};
}
export class CompressionSession {
 private cursor=0;private active:PDFRef|null=null;private activeImage:CompressionImage|null=null;
 private maskImages=new Set<PDFRawStream>();
 private candidates:{ref:PDFRef;stream:PDFRawStream}[];
 private summary:Omit<CompressionSummary,'inputBytes'|'outputBytes'|'savedBytes'|'savedPercent'|'usedOriginal'>;
 private constructor(private doc:PDFDocument,private input:InputFile,private options:JobOptions,private progress:Progress){
  this.summary={mode:options.compressionMode??'lossless',streamsRecompressed:repackStreams(doc),imagesReencoded:0,imagesSkipped:0,warnings:[]};
  for(const [,object]of doc.context.enumerateIndirectObjects())if(object instanceof PDFRawStream)for(const key of ['SMask','Mask']){const mask=doc.context.lookup(object.dict.get(PDFName.of(key)));if(mask instanceof PDFRawStream)this.maskImages.add(mask);}
  this.candidates=doc.context.enumerateIndirectObjects().filter(([,v])=>v instanceof PDFRawStream&&v.dict.get(PDFName.of('Subtype'))===PDFName.of('Image')).map(([ref,stream])=>({ref,stream:stream as PDFRawStream}));
 }
 static async create(input:InputFile,options:JobOptions,progress:Progress=()=>{}){
  if(!input?.bytes.length)throw new Error('Choose a non-empty PDF.');
  if(options.compressionMode!==undefined&&!['lossless','images'].includes(options.compressionMode))throw new Error('Choose lossless optimization or image compression.');
  const quality=options.imageQuality??.75,max=options.maxImageDimension??1600;
  if(!Number.isFinite(quality)||quality<.4||quality>.95||!Number.isInteger(max)||max<256||max>4096)throw new Error('Image quality must be 40–95% and the longest edge 256–4096 pixels.');
  let doc:PDFDocument;try{doc=await PDFDocument.load(input.bytes,{updateMetadata:false,throwOnInvalidObject:true});}catch{throw new Error('Unable to read this PDF. Damaged or encrypted PDFs are not supported.');}
  if(!doc.getPageCount())throw new Error('This PDF has no pages.');assertOperationCompatible(doc,'compress');
  return new CompressionSession(doc,input,options,progress);
 }
 nextImage():CompressionImage|null {
  if(this.options.compressionMode!=='images')return null;
  while(this.cursor<this.candidates.length){
   const index=this.cursor++,{ref,stream}=this.candidates[index],d=stream.dict;
   this.progress(.1+.75*this.cursor/Math.max(this.candidates.length,1));
   try{
    if(this.maskImages.has(stream))throw new Error('Transparency mask image');
    const width=d.lookupMaybe(PDFName.of('Width'),PDFNumber)?.asNumber()??0,height=d.lookupMaybe(PDFName.of('Height'),PDFNumber)?.asNumber()??0,bits=d.lookupMaybe(PDFName.of('BitsPerComponent'),PDFNumber)?.asNumber();
    const color=d.lookup(PDFName.of('ColorSpace')),rgb=color===PDFName.of('DeviceRGB'),gray=color===PDFName.of('DeviceGray'),filter=filterOf(stream);
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>MAX_PIXELS||bits!==8||(!rgb&&!gray)||['SMask','Mask','ImageMask','Decode','DecodeParms','SMaskInData','Alternates'].some(key=>d.has(PDFName.of(key))))throw new Error('Unsupported image');
    let bytes:Uint8Array=stream.getContents().slice(),kind:CompressionImage['kind'];
    if(filter==='/DCTDecode'||filter==='/DCT'){if(!rgb||jpegRequiresPreservation(bytes,width,height))throw new Error('JPEG color or orientation metadata requires preservation');kind='jpeg';}
    else if(filter===undefined||filter==='/FlateDecode'||filter==='/Fl'){if(filter!==undefined)bytes=inflateBounded(bytes);if(bytes.length!==width*height*(rgb?3:1)||bytes.length>MAX_STREAM)throw new Error('Image length mismatch');kind=rgb?'rgb':'gray';}
    else throw new Error('Unsupported image filter');
    this.active=ref;this.activeImage={id:index,kind,width,height,bytes,quality:this.options.imageQuality??.75,maxDimension:this.options.maxImageDimension??1600};return this.activeImage;
   }catch{this.summary.imagesSkipped++;}
  }
  return null;
 }
 acceptImage(result:EncodedCompressionImage){
  const image=this.activeImage;if(!image||!this.active||result.id!==image.id)throw new Error('Unexpected image compression response.');
  const existing=this.doc.context.lookup(this.active) as PDFRawStream;
  if(result.bytes&&result.bytes[0]===255&&result.bytes[1]===216&&result.width&&result.height&&result.bytes.length<existing.getContents().length&&Number.isInteger(result.width)&&Number.isInteger(result.height)&&result.width>0&&result.height>0&&result.width<=image.width&&result.height<=image.height){
   const dict=existing.dict.clone(this.doc.context);dict.set(PDFName.of('Filter'),PDFName.of('DCTDecode'));dict.set(PDFName.of('ColorSpace'),PDFName.of('DeviceRGB'));dict.set(PDFName.of('BitsPerComponent'),PDFNumber.of(8));dict.set(PDFName.of('Width'),PDFNumber.of(result.width));dict.set(PDFName.of('Height'),PDFNumber.of(result.height));dict.set(PDFName.of('Length'),PDFNumber.of(result.bytes.length));this.doc.context.assign(this.active,PDFRawStream.of(dict,result.bytes));this.summary.imagesReencoded++;
  }else this.summary.imagesSkipped++;
  this.active=null;this.activeImage=null;
 }
 async finish():Promise<OutputFile>{
  if(this.active)throw new Error('An image is still being processed.');
  if(this.options.compressionMode==='images'&&this.summary.imagesSkipped)this.summary.warnings.push('Some images were unchanged: unsupported format, masks/transparency, color/orientation metadata, memory limits, or no smaller encoding.');
  this.progress(.95);const candidate=await this.doc.save({useObjectStreams:true,updateFieldAppearances:false});const output=selectCompressionOutput(this.input,candidate,this.summary);this.progress(1);return output;
 }
}
