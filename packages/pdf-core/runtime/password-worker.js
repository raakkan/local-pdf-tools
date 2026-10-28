// Dedicated, single-job worker. Runtime output is never forwarded to logs or UI.
(()=>{
 let active=false;
 self.onmessage=async event=>{
  if(active)return;active=true;
  const {operation,bytes}=event.data;let password=event.data.password,instance;
  let wrongPassword=false;
  try{
   if(!['protect-pdf','unlock-pdf'].includes(operation)||!(bytes instanceof Uint8Array)||!bytes.length||typeof password!=='string')throw new Error('invalid');
   const size=new TextEncoder().encode(password).length;
   if(/[\x00-\x1f\x7f]/.test(password)||size>1024||(operation==='protect-pdf'&&(password.length<8||size>127)))throw new Error('invalid');
   const initialized=new Promise((resolve,reject)=>{
    self.Module={noInitialRun:true,noExitRuntime:true,locateFile:name=>new URL(name,self.location.href).href,print:()=>{},printErr:line=>{if(String(line).toLowerCase().includes('invalid password'))wrongPassword=true;},onAbort:()=>reject(new Error('runtime')),onRuntimeInitialized:()=>resolve(self.Module)};
   });
   importScripts('./qpdf.js');instance=await initialized;
   instance.FS.writeFile('/input.pdf',bytes);self.postMessage({type:'progress',value:.4});
   let args;
   if(operation==='protect-pdf'){
    const owner=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
    args=['/input.pdf','--encrypt',`--user-password=${password}`,`--owner-password=${owner}`,'--bits=256','--','/output.pdf'];
   }else args=['/input.pdf',`--password=${password}`,'--decrypt','/output.pdf'];
   const code=instance.callMain(args);args.fill('');password='';event.data.password='';
   if(code!==0){self.postMessage({type:'error',message:wrongPassword?'Incorrect password. Try again.':code===3?'This PDF needs repairs. No output was saved. Export a fresh copy from its original application.':'Unable to process this PDF. It may be damaged or use unsupported encryption.'});return;}
   const result=instance.FS.readFile('/output.pdf').slice();self.postMessage({type:'done',bytes:result},[result.buffer]);
  }catch{
   self.postMessage({type:'error',message:wrongPassword?'Incorrect password. Try again.':'The password engine could not finish. Try a smaller PDF or a newer browser.'});
  }finally{
   password='';event.data.password='';
   if(instance)for(const path of ['/input.pdf','/output.pdf'])try{const data=instance.FS.readFile(path);data.fill(0);instance.FS.writeFile(path,data);instance.FS.unlink(path);}catch{/* File may not exist after failure. */}
   self.close();
  }
 };
})();
