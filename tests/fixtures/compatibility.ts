import {PDFDocument,PDFDict,PDFName,PDFHexString,PDFString} from '../../packages/pdf-core/src/testing';
export async function compatibilityFixture(){
 const doc=await PDFDocument.create();doc.setTitle('Compatibility fixture');
 const page=doc.addPage([400,500]);page.drawText('Document with preserved structures',{x:30,y:450,size:14});
 const form=doc.getForm(),field=form.createTextField('customer');field.setText('Local customer');field.addToPage(page,{x:50,y:250,width:220,height:30});
 const checkbox=form.createCheckBox('approved');checkbox.addToPage(page,{x:50,y:200,width:18,height:18});checkbox.check();
 const link=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[50,150,240,175],Border:[0,0,0],A:{S:'URI',URI:PDFString.of('https://example.com/offline-test')}}));page.node.addAnnot(link);
 const root=doc.context.obj({Type:'Outlines',Count:1}),rootRef=doc.context.register(root);
 const childRef=doc.context.register(doc.context.obj({Title:PDFHexString.fromText('First page'),Parent:rootRef,Dest:[page.ref,'Fit']}));root.set(PDFName.of('First'),childRef);root.set(PDFName.of('Last'),childRef);doc.catalog.set(PDFName.of('Outlines'),rootRef);
 await doc.attach(new TextEncoder().encode('Private attachment stays local.'),'fixture.txt',{mimeType:'text/plain',description:'Synthetic attachment'});
 return {name:'compatibility.pdf',bytes:await doc.save(),type:'application/pdf'};
}
export function outlineTarget(doc:PDFDocument){const root=doc.catalog.lookup(PDFName.of('Outlines'),PDFDict),child=root.lookup(PDFName.of('First'),PDFDict);return child.get(PDFName.of('Dest'))!.toString();}
