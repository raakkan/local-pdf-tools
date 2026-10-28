import { PDFArray, PDFDict, PDFName, PDFNull, PDFStream, type PDFDocument, type PDFObject } from 'pdf-lib';
import type { Operation } from './index';
export const inPlaceOperations: readonly Operation[] = ['protect-pdf','unlock-pdf','ocr','compress','metadata','crop-pdf','header-footer','page-numbers','watermark','signature'];
export const rebuildingOperations: readonly Operation[] = ['merge','split','organize','alternate-merge','resize-pdf','n-up'];
export interface DocumentCompatibility { features:string[]; supportedEdits:Operation[]; restrictedEdits:Operation[]; blockingReason:string|null }
function hasSignature(doc:PDFDocument):boolean {
  const stack:PDFObject[]=[doc.catalog,...doc.context.enumerateIndirectObjects().map(([,value])=>value)],seen=new Set<PDFObject>();
  while(stack.length){
    const value=stack.pop()!;if(seen.has(value))continue;seen.add(value);
    if(value instanceof PDFDict){
      const type=doc.context.lookup(value.get(PDFName.of('Type'))),fieldType=doc.context.lookup(value.get(PDFName.of('FT'))),fieldValue=doc.context.lookup(value.get(PDFName.of('V')));
      if(value.has(PDFName.of('ByteRange'))||type===PDFName.of('Sig')||(fieldType===PDFName.of('Sig')&&fieldValue!==undefined&&fieldValue!==PDFNull))return true;
      for(const [,child]of value.entries())stack.push(child);
    } else if(value instanceof PDFArray){for(const child of value.asArray())stack.push(child);}
    else if(value instanceof PDFStream)stack.push(value.dict);
  }
  return false;
}
export function documentCompatibility(doc:PDFDocument):DocumentCompatibility {
  const features:string[]=[],has=(key:string)=>doc.catalog.has(PDFName.of(key));
  let blockingReason:string|null=null;
  if(hasSignature(doc)){features.push('digital signatures');blockingReason='This PDF contains a digital signature. Rewriting would invalidate it. Use an unsigned copy.';}
  if(has('Perms')){features.push('certification or usage-rights permissions');blockingReason??='This PDF has certification or usage-rights permissions. Rewriting is protected; use an unrestricted unsigned copy.';}
  const form=doc.catalog.lookupMaybe(PDFName.of('AcroForm'),PDFDict);
  if(form?.has(PDFName.of('XFA'))){features.push('XFA forms');blockingReason??='XFA forms are not supported for rewriting. Use a standard PDF copy exported by the original application.';}
  if(form?.lookupMaybe(PDFName.of('Fields'),PDFArray)?.size())features.push('interactive forms');
  for(const [key,label]of [['Names','name trees or attachments'],['Outlines','bookmarks'],['StructTreeRoot','accessibility tags'],['OCProperties','layers'],['Collection','document collections']] as const)if(has(key))features.push(label);
  if(doc.getPages().some(p=>p.node.Annots()?.size()))features.push('annotations or links');
  return {features,supportedEdits:blockingReason?[]:features.length?[...inPlaceOperations]:[...inPlaceOperations,...rebuildingOperations],restrictedEdits:blockingReason?[...inPlaceOperations,...rebuildingOperations]:features.length?[...rebuildingOperations]:[],blockingReason};
}
export function assertOperationCompatible(doc:PDFDocument,operation:Operation='merge') {
  const compatibility=documentCompatibility(doc);
  if(compatibility.blockingReason)throw new Error(compatibility.blockingReason);
  if(compatibility.features.length&&!inPlaceOperations.includes(operation))throw new Error(`This tool rebuilds pages and cannot yet preserve these advanced document features: ${compatibility.features.join(', ')}. Use lossless compression, metadata, crop, headers/footers, page numbers, watermark, or visual signature to edit this PDF without rebuilding it.`);
}

// Metadata can be shared with another object. Unlinking it at the document level
// must not leave dangling references elsewhere in the document.
export function deleteIfUnreferenced(doc:PDFDocument,reference:import('pdf-lib').PDFRef){
 const stack:PDFObject[]=[...doc.context.enumerateIndirectObjects().map(([,v])=>v),...Object.values(doc.context.trailerInfo).filter((v):v is PDFObject=>v!==undefined)],seen=new Set<PDFObject>();
 while(stack.length){const value=stack.pop()!;if(value===reference)return;if(seen.has(value))continue;seen.add(value);if(value instanceof PDFDict){for(const [,child]of value.entries())stack.push(child);}else if(value instanceof PDFArray){for(const child of value.asArray())stack.push(child);}else if(value instanceof PDFStream)stack.push(value.dict);}
 doc.context.delete(reference);
}
