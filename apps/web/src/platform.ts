import type { InputFile, OutputFile } from '@localpdf/core';
export const desktop = '__TAURI_INTERNALS__' in window;
export const platform = {
  desktop,
  async open(accept: string, multiple: boolean): Promise<InputFile[]> {
    if (desktop) {
      const {open}=await import('@tauri-apps/plugin-dialog'), {readFile}=await import('@tauri-apps/plugin-fs');
      const chosen=await open({multiple,filters:[accept.includes('image')?{name:'Images',extensions:['png','jpg','jpeg']}:{name:'PDF',extensions:['pdf']}]});
      if (!chosen) return [];
      return Promise.all((Array.isArray(chosen)?chosen:[chosen]).map(async path=>({name:path.split(/[\\/]/).pop()!,bytes:await readFile(path),type:/\.png$/i.test(path)?'image/png':/\.jpe?g$/i.test(path)?'image/jpeg':'application/pdf'})));
    }
    return new Promise(resolve=>{
      const input=document.createElement('input'); input.type='file'; input.accept=accept; input.multiple=multiple;
      input.onchange=async()=>{try{resolve(await Promise.all(Array.from(input.files??[]).map(async f=>({name:f.name,bytes:new Uint8Array(await f.arrayBuffer()),type:f.type || (/\.pdf$/i.test(f.name)?'application/pdf':'')}))));}finally{input.remove();}};
      input.oncancel=()=>{input.remove();resolve([]);}; input.style.display='none';document.body.append(input);input.click();
    });
  },
  async save(file: OutputFile): Promise<boolean> {
    if (desktop) {
      const {save}=await import('@tauri-apps/plugin-dialog'), {writeFile}=await import('@tauri-apps/plugin-fs');
      const path=await save({defaultPath:file.name}); if (!path) return false;
      await writeFile(path,file.bytes); return true;
    }
    const url=URL.createObjectURL(new Blob([file.bytes.slice().buffer as ArrayBuffer],{type:file.type}));
    const a=document.createElement('a'); a.href=url; a.download=file.name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),30000); return true;
  },
};
