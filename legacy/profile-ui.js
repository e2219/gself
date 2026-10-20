'use strict';
(function(){
 const section=document.createElement('section');section.className='save-settings';
 section.innerHTML='<h3>存档备份</h3><div class="panel-actions"><button id="saveExport">导出存档</button><button id="saveImport">导入存档</button><button id="saveApply" hidden>确认导入并返回首页</button><button id="saveCancel" hidden>取消</button></div><input id="saveFile" type="file" accept="application/json,.json" hidden><p id="saveStatus" class="panel-intro" role="status">备份纪录与设置；不包含进行中的航行。</p>';
 $('controlSettings').appendChild(section);
 const data=MooncatchProfileData;let pending=null,busy=false;
 const status=text=>$('saveStatus').textContent=text;
 const cancel=()=>{pending=null;$('saveApply').hidden=$('saveCancel').hidden=true};
 const lock=value=>{busy=value;for(const id of ['saveExport','saveImport','saveApply','saveCancel'])$(id).disabled=value};
 function preview(text){pending=data.parse(text);$('saveApply').hidden=$('saveCancel').hidden=false;status(`将导入 ${Object.keys(pending.data).length} 项数据；保留较高纪录，替换对应设置，并结束当前航行。`)}
 $('saveCancel').onclick=()=>{cancel();status('已取消导入')};
 $('saveExport').onclick=async()=>{
  if(busy)return;lock(true);
  try{
   const text=JSON.stringify({...data.snapshot(localStorage),exportedAt:new Date().toISOString()},null,2);
   if(window.MooncatchNative)await window.MooncatchNative.files.exportBackup({text});
   else{const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='mooncatch-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
   status('存档已导出');
  }catch(e){status(e.message||'导出未完成')}finally{lock(false)}
 };
 $('saveImport').onclick=async()=>{
  if(busy)return;cancel();
  if(window.MooncatchNative){lock(true);try{preview((await window.MooncatchNative.files.importBackup()).text)}catch(e){status(e.message||'导入未完成')}finally{lock(false)}}
  else{$('saveFile').value='';$('saveFile').click()}
 };
 $('saveFile').onchange=async()=>{const file=$('saveFile').files[0];if(!file)return;try{if(file.size>65536)throw Error('备份文件过大');preview(await file.text())}catch(e){cancel();status(e.message)}};
 $('saveApply').onclick=async()=>{
  if(busy||!pending)return;lock(true);
  try{data.merge(localStorage,pending);await window.MooncatchSaveChanged?.();cancel();location.reload()}
  catch(e){status(e.message||'导入未完成');lock(false)}
 };
})();
