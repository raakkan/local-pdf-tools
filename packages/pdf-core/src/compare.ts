/** Pixel comparison highlights visual differences, not semantic edits. */
export function differencePixels(a:Uint8ClampedArray,b:Uint8ClampedArray,threshold=20):{pixels:Uint8ClampedArray;changed:number}{
 if(a.length!==b.length||a.length%4)throw new Error('Pixel buffers must have equal dimensions.');if(!Number.isFinite(threshold)||threshold<0||threshold>255)throw new Error('Invalid difference threshold.');
 const pixels=new Uint8ClampedArray(a.length);let changed=0;
 for(let i=0;i<a.length;i+=4){const delta=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]),Math.abs(a[i+3]-b[i+3]));const hit=delta>threshold;if(hit)changed++;const gray=Math.round((a[i]+a[i+1]+a[i+2])/3);pixels[i]=hit?230:gray;pixels[i+1]=hit?54:gray;pixels[i+2]=hit?54:gray;pixels[i+3]=255;}
 return {pixels,changed};
}
export interface TextDifference {kind:'unchanged'|'added'|'removed';text:string}
/** Compare whitespace-separated words. Extraction order may differ from reading order. */
export function compareTextWords(left:string,right:string):TextDifference[]{
 if(left.length>150_000||right.length>150_000)throw new Error('Page text is too large to compare.');
 const a=left.trim()?left.trim().split(/\s+/u):[],b=right.trim()?right.trim().split(/\s+/u):[];
 if(a.length>1200||b.length>1200)throw new Error('Page text exceeds 1,200 words per document.');
 const cols=b.length+1,table=new Uint16Array((a.length+1)*cols);
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i*cols+j]=a[i]===b[j]?table[(i+1)*cols+j+1]+1:Math.max(table[(i+1)*cols+j],table[i*cols+j+1]);
 let i=0,j=0;const result:TextDifference[]=[];const push=(kind:TextDifference['kind'],text:string)=>{const last=result.at(-1);if(last?.kind===kind)last.text+=' '+text;else result.push({kind,text});};
 while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){push('unchanged',a[i]);i++;j++;}else if(j<b.length&&(i===a.length||table[i*cols+j+1]>table[(i+1)*cols+j]))push('added',b[j++]);else push('removed',a[i++]);}
 return result;
}
export function textDifferenceReport(changes:TextDifference[],page:number):string{
 if(!Number.isInteger(page)||page<1)throw new Error('Choose a valid page.');
 return [`Text comparison — page ${page}`,'Compared extracted words; formatting and text extraction order can affect results.','',...changes.map(c=>`${c.kind==='added'?'+':c.kind==='removed'?'-':' '} ${c.text}`)].join('\n')+'\n';
}
