/** Convert RGBA pixels to luminance while preserving alpha. */
export function grayscalePixels(data:Uint8ClampedArray,start=0,end=data.length/4):void{
 if(data.length%4||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>data.length/4)throw new Error('Invalid image pixel range.');
 for(let p=start;p<end;p++){const i=p*4,y=Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);data[i]=data[i+1]=data[i+2]=y;}
}
export function validateImageExport(options:{imageFormat?:string;imageExportQuality?:number;scale?:number;imageGrayscale?:boolean}):void{
 if(options.imageFormat!==undefined&&!['png','jpeg','webp'].includes(options.imageFormat))throw new Error('Choose PNG, JPEG or WebP.');
 if(options.imageExportQuality!==undefined&&(!Number.isFinite(options.imageExportQuality)||options.imageExportQuality<.4||options.imageExportQuality>1))throw new Error('Choose an image quality between 40% and 100%.');
 if(options.scale!==undefined&&(!Number.isFinite(options.scale)||options.scale<1||options.scale>3))throw new Error('Choose an image resolution between 72 and 216 DPI.');
 if(options.imageGrayscale!==undefined&&typeof options.imageGrayscale!=='boolean')throw new Error('Choose a valid color mode.');
}
