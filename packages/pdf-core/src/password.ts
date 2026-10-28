import {loadSafe,assertRewritable,type Operation} from './index';
export function validatePassword(operation:Operation,password:string|undefined){
 const value=password??'',length=new TextEncoder().encode(value).length;
 if(/[\x00-\x1f\x7f]/.test(value))throw new Error('Passwords cannot contain line breaks or control characters.');
 if(operation==='protect-pdf'){
  if(value.length<8)throw new Error('Use a password with at least 8 characters.');
  if(length>127)throw new Error('Use a password with at most 127 UTF-8 bytes. Unicode characters may use several bytes.');
 }else if(length>1024)throw new Error('This password is too long. Use at most 1024 UTF-8 bytes.');
 return value;
}
export async function validatePasswordDocument(bytes:Uint8Array,operation:Operation){const doc=await loadSafe(bytes);assertRewritable(doc,operation);}
