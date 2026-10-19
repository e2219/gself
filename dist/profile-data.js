'use strict';
// Portable records/settings only; never import executable code or an in-progress run.
(function(root){
 const choices={
  'mooncatch-ship':['collector','falcon','warden'], 'mooncatch-world':['classic','aurora','warp','station','ion'],
  'mooncatch-run':['timed','endless'], 'mooncatch-music-track':['floating-cities','dream-culture'], 'mooncatch-controls':['drag','stick','dpad'],
  'mooncatch-canvas-controls':['drag','stick','dpad'], 'mooncatch-render':['auto','smooth','clear'],
  'mooncatch-left-hand':['true','false'], 'mooncatch-sound':['true','false'], 'mooncatch-music':['true','false']
 };
 const scoreKeys=['mooncatch-best-v6',...['aurora','warp','station','ion'].map(w=>'mooncatch-best-'+w+'-v13'),...['classic','aurora','warp','station','ion'].map(w=>'mooncatch-endless-'+w+'-v16')];
 const keys=[...Object.keys(choices),'mooncatch-floating-layout',...scoreKeys];
 function valid(key,value){
  if(typeof value!=='string'||value.length>1000)return false;
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
  try{for(const [k,v] of Object.entries(checked.data)){const old=storage.getItem(k);storage.setItem(k,scoreKeys.includes(k)?String(Math.max(valid(k,old)?Number(old):0,Number(v))):v)}}
  catch(error){for(const [k,v] of before){try{v===null?storage.removeItem(k):storage.setItem(k,v)}catch{}}throw Error('存储空间不可用，导入未完成')}
  return snapshot(storage);
 }
 root.MooncatchProfileData={keys,scoreKeys,valid,snapshot,parse,merge};
})(globalThis);
