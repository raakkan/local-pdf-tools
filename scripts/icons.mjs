import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),svg=new URL('apps/web/public/icon.svg',root);
for(const size of [192,512])await sharp(svg.pathname).resize(size,size).png().toFile(new URL(`apps/web/public/icon-${size}.png`,root).pathname);
await mkdir(new URL('apps/desktop/src-tauri/icons/',root),{recursive:true});
for(const [name,size]of [['32x32',32],['128x128',128],['128x128@2x',256]])await sharp(svg.pathname).resize(size,size).png().toFile(new URL(`apps/desktop/src-tauri/icons/${name}.png`,root).pathname);
