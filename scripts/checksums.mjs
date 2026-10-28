import {readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]??'apps/web/dist'),lines=[];
async function walk(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name),relative=prefix+entry.name;if(entry.isDirectory())await walk(path,relative+'/');else if(entry.name!=='SHA256SUMS.txt')lines.push(`${createHash('sha256').update(await readFile(path)).digest('hex')}  ${relative}`);}}
await walk(root);await writeFile(join(root,'SHA256SUMS.txt'),lines.sort().join('\n')+'\n');console.log(`Checksums for ${lines.length} files.`);
