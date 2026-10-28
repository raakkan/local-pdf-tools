import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
// @ts-expect-error Build-only asset copier uses Node.js.
import {prepareOcrAssets} from '../../scripts/ocr-assets.mjs';
// @ts-expect-error Build-only asset copier uses Node.js.
import {preparePasswordAssets} from '../../scripts/password-assets.mjs';
const require=createRequire(import.meta.url);
export default defineConfig({plugins:[react(),{name:'local-pdf-assets',buildStart(){
  prepareOcrAssets(resolve('../..'));preparePasswordAssets(resolve('../..'));
  const source=dirname(require.resolve('pdfjs-dist/package.json',{paths:[resolve('../../packages/pdf-core')]}));
  mkdirSync('public/pdf-assets',{recursive:true});
  for (const dir of ['cmaps','standard_fonts','wasm']) cpSync(resolve(source,dir),`public/pdf-assets/${dir}`,{recursive:true});
}}],worker:{format:'es'},build:{assetsInlineLimit:process.env.LOCALPDF_VERIFY?0:4096,target:'es2022',rollupOptions:process.env.LOCALPDF_VERIFY?{input:{main:resolve('index.html'),verify:resolve('verify.html')}}:undefined},server:{strictPort:true,port:5173},preview:{port:4173,strictPort:true,headers:{'Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'"}}});
