import {PDFDocument,PDFName,drawObject,pushGraphicsState,popGraphicsState,concatTransformationMatrix} from '../../packages/pdf-core/src/testing';
export async function compressionFixture(width=512,height=384){
 const doc=await PDFDocument.create(),page=doc.addPage([400,500]);page.drawText('Selectable text stays selectable',{x:28,y:460,size:14});
 const pixels=new Uint8Array(width*height*3);let state=8675309;
 for(let i=0;i<pixels.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;pixels[i]=(state>>>24);}
 const ref=doc.context.register(doc.context.stream(pixels,{Type:'XObject',Subtype:'Image',Width:width,Height:height,ColorSpace:'DeviceRGB',BitsPerComponent:8}));page.node.setXObject(PDFName.of('Photo'),ref);page.pushOperators(pushGraphicsState(),concatTransformationMatrix(340,0,0,300,30,100),drawObject('Photo'),popGraphicsState());
 return {name:'image-heavy.pdf',type:'application/pdf',bytes:await doc.save({useObjectStreams:false}),width,height,pixels,ref};
}
