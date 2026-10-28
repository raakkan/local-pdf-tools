import {readdir,readFile,writeFile,realpath} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=new URL('../',import.meta.url), store=new URL('node_modules/.pnpm/',root);
const lock=await readFile(new URL('pnpm-lock.yaml',root),'utf8');
const entries=await readdir(store), seen=new Set(), notices=[];
for(const entry of entries){
 if(entry==='node_modules')continue;
 const modules=new URL(`${entry}/node_modules/`,store);
 let names;try{names=await readdir(modules);}catch{continue;}
 for(const name of names){
 const candidates=name.startsWith('@')?(await readdir(new URL(`${name}/`,modules))).map(n=>`${name}/${n}`):[name];
 for(const pkg of candidates){const dir=new URL(`${pkg}/`,modules);let actual;try{actual=await realpath(dir);}catch{continue;}
 if(seen.has(actual))continue;seen.add(actual);
 try{const meta=JSON.parse(await readFile(resolve(actual,'package.json'),'utf8'));if(!lock.includes(`${meta.name}@${meta.version}`))continue;const files=await readdir(actual);const licenses=files.filter(f=>/^(licen[cs]e|copying|notice)(\.|$|-)/i.test(f));const texts=[];for(const file of licenses){try{texts.push(`${file}\n${await readFile(resolve(actual,file),'utf8')}`);}catch{}}
 notices.push(`${meta.name}@${meta.version}\nDeclared license: ${JSON.stringify(meta.license??'UNSPECIFIED')}\n${texts.length?texts.join('\n\n'):'No top-level license text found. Verify upstream before release.'}`);
 }catch{}}
 }
}
const ocrNotices=(await Promise.all(['TESSDATA_LICENSE.txt','LEPTONICA_LICENSE.txt'].map(f=>readFile(new URL(`third-party/ocr/${f}`,root),'utf8')))).join('\n\n');
const qpdf=await readFile(new URL('node_modules/@ai-ecoverse/wasm-qpdf/THIRD-PARTY-NOTICES.md',new URL('packages/pdf-core/',root)),'utf8');
const body=`LOCAL PDF TOOLS — THIRD-PARTY NOTICES\n\nGenerated from the installed, locked dependency graph, including build and optional packages. Individual components retain their licenses. This inventory is not a legal compliance certification. Review bundled font and binary component notices before distributing releases.\n\n${ocrNotices}\n\n${qpdf}\n\n${notices.sort().join('\n\n'+'='.repeat(72)+'\n\n')}\n`;
await writeFile(new URL('apps/web/public/third-party-notices.txt',root),body);await writeFile(new URL('THIRD_PARTY_NOTICES.txt',root),body);console.log(`Generated notices for ${notices.length} dependency packages.`);
