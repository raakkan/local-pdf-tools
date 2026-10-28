import {spawnSync} from 'node:child_process';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
const root=new URL('../',import.meta.url);
const host=process.argv[2] || spawnSync('rustc',['-vV'],{encoding:'utf8'}).stdout?.match(/^host: (.+)$/m)?.[1];
if(!host)throw new Error('Rust is required to inventory native dependencies.');
const result=spawnSync('cargo',['metadata','--locked','--format-version','1','--filter-platform',host],{cwd:new URL('apps/desktop/src-tauri/',root),encoding:'utf8',maxBuffer:20*1024*1024});
if(result.status!==0)throw new Error(result.stderr||'Cargo metadata failed.');
const packages=JSON.parse(result.stdout).packages,notices=[];
for(const pkg of packages){const dir=dirname(pkg.manifest_path),texts=[];for(const name of await readdir(dir)){if(/^(licen[cs]e|copying|notice)(\.|$|-)/i.test(name)){try{texts.push(`${name}\n${await readFile(resolve(dir,name),'utf8')}`);}catch{}}}
notices.push(`${pkg.name}@${pkg.version}\nDeclared license: ${pkg.license??'UNSPECIFIED'}\n${texts.join('\n\n')||'No top-level license text found; review upstream before public release.'}`);}
const body=`LOCAL PDF TOOLS — NATIVE DEPENDENCY NOTICES\nHost inventory: ${host}. Regenerate for each distributed target.\n\n${notices.sort().join('\n\n'+'='.repeat(72)+'\n\n')}\n`;
await writeFile(new URL('NATIVE_THIRD_PARTY_NOTICES.txt',root),body);console.log(`Native notices: ${notices.length} packages for ${host}.`);
