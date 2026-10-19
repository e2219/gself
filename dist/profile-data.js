'use strict';
// Portable records/settings only; never import executable code or an in-progress run.
(function(root){
 const choices={
  'mooncatch-ship':['collector','falcon','warden'], 'mooncatch-world':['classic','aurora','warp','station','ion'],
  'mooncatch-run':['timed','endless','relax','adventure'], 'mooncatch-music-track':['floating-cities','dream-culture'], 'mooncatch-controls':['drag','stick','dpad'],
  'mooncatch-canvas-controls':['drag','stick','dpad'], 'mooncatch-render':['auto','smooth','clear'],
  'mooncatch-left-hand':['true','false'], 'mooncatch-sound':['true','false'], 'mooncatch-music':['true','false']
 };
 const scoreKeys=['mooncatch-relax-v25','mooncatch-adventure-v25','mooncatch-best-v6',...['aurora','warp','station','ion'].map(w=>'mooncatch-best-'+w+'-v13'),...['classic','aurora','warp','station','ion'].map(w=>'mooncatch-endless-'+w+'-v16')];
 const echoKey='mooncatch-echo-sync-v1',sharedKey='mooncatch-echo-shared-v2',varietyKey='mooncatch-echo-variety-v3';
 const keys=[...Object.keys(choices),'mooncatch-floating-layout',echoKey,sharedKey,varietyKey,...scoreKeys];
 function valid(key,value){
  if(typeof value!=='string'||value.length>1000)return false;
  if(key===echoKey||key===sharedKey||key===varietyKey)try{const max=key===echoKey?20:30,p=JSON.parse(value);return p&&Object.keys(p).sort().join(',')==='best,completed'&&Array.isArray(p.completed)&&p.completed.length<=max&&p.completed.every(n=>Number.isInteger(n)&&n>=1&&n<=max)&&new Set(p.completed).size===p.completed.length&&p.best&&typeof p.best==='object'&&!Array.isArray(p.best)&&Object.entries(p.best).every(([k,n])=>/^(?:[1-9]|[12][0-9]|30)$/.test(k)&&Number(k)<=max&&p.completed.includes(Number(k))&&Number.isInteger(n)&&n>=0&&n<=1000000)&&p.completed.every(n=>Object.prototype.hasOwnProperty.call(p.best,String(n)))}catch{return false}
  if(choices[key])return choices[key].includes(value);
  if(scoreKeys.includes(key))return /^(0|[1-9][0-9]{0,11})$/.test(value);
  if(key==='mooncatch-floating-layout')try{
   const p=JSON.parse(value);
   return p&&['portrait','landscape'].every(k=>p[k]&&['normal','large','largest'].includes(p[k].size)&&['edge','raised','inset'].includes(p[k].position));
  }catch{return false}
  return false;
 }
 function snapshot(storage){const data={};for(const key of keys){const v=storage.getItem(key);if(valid(key,v))data[key]=v}return {app:'mooncatch',format:1,data}}
 function parse(text){
  if(typeof text!=='string'||text.length>65536)throw Error('备份文件过大');
  let value;try{value=JSON.parse(text)}catch{throw Error('不是有效的备份文件')}
  if(value?.app!=='mooncatch'||value.format!==1||!value.data||Array.isArray(value.data)||typeof value.data!=='object')throw Error('不支持的备份版本');
  const data={};for(const [key,v] of Object.entries(value.data)){if(!keys.includes(key)||!valid(key,v))throw Error('备份包含无效数据');data[key]=v}
  return {app:'mooncatch',format:1,data};
 }
 function merge(storage,backup){
  // Validate the entire file before touching storage; restore the original on a failed write.
  const checked=parse(JSON.stringify(backup)),before=keys.map(k=>[k,storage.getItem(k)]);
  try{for(const [k,v] of Object.entries(checked.data)){const old=storage.getItem(k);if((k===echoKey||k===sharedKey||k===varietyKey)&&valid(k,old)){const a=JSON.parse(old),b=JSON.parse(v);for(const id of b.completed){if(!a.completed.includes(id))a.completed.push(id);a.best[id]=Math.min(a.best[id]??Infinity,b.best[id])}a.completed.sort((x,y)=>x-y);storage.setItem(k,JSON.stringify(a));continue}storage.setItem(k,scoreKeys.includes(k)?String(Math.max(valid(k,old)?Number(old):0,Number(v))):v)}}
  catch(error){for(const [k,v] of before){try{v===null?storage.removeItem(k):storage.setItem(k,v)}catch{}}throw Error('存储空间不可用，导入未完成')}
  return snapshot(storage);
 }
 root.MooncatchProfileData={keys,scoreKeys,valid,snapshot,parse,merge};
})(globalThis);
