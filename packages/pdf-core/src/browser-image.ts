import type { CompressionImage, EncodedCompressionImage } from './compression';
export async function encodeCompressionImage(image:CompressionImage,signal:AbortSignal):Promise<EncodedCompressionImage>{
 signal.throwIfAborted();let source:ImageBitmap|HTMLImageElement|undefined;const canvas=document.createElement('canvas');
 const scale=Math.min(1,image.maxDimension/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
 const context=canvas.getContext('2d');if(!context)throw new Error('Canvas is unavailable.');
 try{
  if(image.kind==='jpeg'){
   const blob=new Blob([image.bytes.slice().buffer as ArrayBuffer],{type:'image/jpeg'});
   if(typeof createImageBitmap==='function')source=await createImageBitmap(blob,{imageOrientation:'none'});
   else{const url=URL.createObjectURL(blob);try{source=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();const abort=()=>{img.src='';reject(new DOMException('Cancelled','AbortError'));};signal.addEventListener('abort',abort,{once:true});img.onload=()=>{signal.removeEventListener('abort',abort);resolve(img);};img.onerror=()=>{signal.removeEventListener('abort',abort);reject(new Error('Image decoder could not read this JPEG.'));};img.src=url;});}finally{URL.revokeObjectURL(url);}}
   signal.throwIfAborted();const width=source instanceof HTMLImageElement?source.naturalWidth:source.width,height=source instanceof HTMLImageElement?source.naturalHeight:source.height;
   if(width!==image.width||height!==image.height)throw new Error('JPEG dimensions disagree with the PDF image.');
   context.imageSmoothingQuality='high';context.drawImage(source,0,0,canvas.width,canvas.height);
  }else{
   const raw=document.createElement('canvas');raw.width=image.width;raw.height=image.height;const rawContext=raw.getContext('2d')!;
   try{const pixels=rawContext.createImageData(image.width,image.height);const channels=image.kind==='rgb'?3:1;
    for(let start=0;start<image.width*image.height;start+=262144){signal.throwIfAborted();const end=Math.min(image.width*image.height,start+262144);for(let p=start;p<end;p++){pixels.data[p*4]=image.bytes[p*channels];pixels.data[p*4+1]=image.bytes[p*channels+(channels===3?1:0)];pixels.data[p*4+2]=image.bytes[p*channels+(channels===3?2:0)];pixels.data[p*4+3]=255;}if(end<image.width*image.height)await new Promise(r=>setTimeout(r,0));}
    rawContext.putImageData(pixels,0,0);context.imageSmoothingQuality='high';context.drawImage(raw,0,0,canvas.width,canvas.height);
   }finally{raw.width=raw.height=0;}
  }
  signal.throwIfAborted();const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('JPEG encoding failed.')),'image/jpeg',image.quality));signal.throwIfAborted();
  return {id:image.id,bytes:new Uint8Array(await blob.arrayBuffer()),width:canvas.width,height:canvas.height};
 }finally{if(source&&'close'in source)source.close();canvas.width=canvas.height=0;}
}
/** Convert WebP to a PNG for the PDF engine, keeping transparency and staying local. */
export async function convertWebpToPng(file:import('./index').InputFile,signal:AbortSignal):Promise<import('./index').InputFile>{
 signal.throwIfAborted();const canvas=document.createElement('canvas');let bitmap:ImageBitmap|undefined,url:string|undefined,img:HTMLImageElement|undefined;
 try{const blob=new Blob([file.bytes.slice().buffer as ArrayBuffer],{type:'image/webp'});let source:ImageBitmap|HTMLImageElement;
  if(typeof createImageBitmap==='function'){try{bitmap=await createImageBitmap(blob);source=bitmap;}catch{signal.throwIfAborted();throw new Error('This browser could not decode the WebP image.');}}
  else{url=URL.createObjectURL(blob);img=new Image();const target=img;source=await new Promise<HTMLImageElement>((resolve,reject)=>{const cleanup=()=>{target.onload=null;target.onerror=null;signal.removeEventListener('abort',abort);};const abort=()=>{cleanup();target.src='';reject(new DOMException('Cancelled','AbortError'));};target.onload=()=>{cleanup();resolve(target);};target.onerror=()=>{cleanup();reject(new Error('This browser could not decode the WebP image.'));};signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();else target.src=url!;});}
  signal.throwIfAborted();const width=source instanceof HTMLImageElement?source.naturalWidth:source.width,height=source instanceof HTMLImageElement?source.naturalHeight:source.height;if(!width||!height||width*height>16_000_000)throw new Error('WebP images must have no more than 16 million pixels.');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(!context)throw new Error('Canvas is unavailable.');context.drawImage(source,0,0);const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value&&value.type==='image/png'?resolve(value):reject(new Error('Could not convert the WebP image.')),'image/png'));signal.throwIfAborted();const bytes=new Uint8Array(await png.arrayBuffer());signal.throwIfAborted();return {name:file.name.replace(/\.webp$/i,'.png'),type:'image/png',bytes};
 }finally{bitmap?.close();if(url)URL.revokeObjectURL(url);canvas.width=canvas.height=0;}
}
