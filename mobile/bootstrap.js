import { registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
const files=registerPlugin('MooncatchFiles');
window.MooncatchNative={files,App};
let pendingWrite=Promise.resolve();
window.MooncatchSaveChanged=()=>{
 const value=JSON.stringify(MooncatchProfileData.snapshot(localStorage));
 pendingWrite=pendingWrite.catch(()=>{}).then(()=>Preferences.set({key:'mooncatch-profile-v1',value}));
 pendingWrite.catch(()=>{const label=document.getElementById('saveStatus');if(label)label.textContent='存档写入失败，请导出备份后检查存储空间';});
 return pendingWrite;
};
async function loadScript(src){await new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=reject;document.body.appendChild(el)});}
async function boot(){
 try{const {value}=await Preferences.get({key:'mooncatch-profile-v1'});if(value)MooncatchProfileData.merge(localStorage,MooncatchProfileData.parse(value));}
 catch(e){console.warn('Profile restore failed; retaining local records',e);}
 await loadScript('game.js');await loadScript('profile-ui.js');await loadScript('native-runtime.js');
 await window.MooncatchSaveChanged().catch(()=>{});
 await App.addListener('appStateChange',({isActive})=>window.MooncatchLifecycle?.(isActive));
 await App.addListener('pause',()=>window.MooncatchLifecycle?.(false));
 await App.addListener('resume',()=>window.MooncatchLifecycle?.(true));
 await App.addListener('backButton',()=>window.MooncatchBack?.());
 window.MooncatchLifecycle((await App.getState()).isActive);
}
boot().catch(()=>{document.body.textContent='启动失败，请关闭应用后重试。存档不会被清除。';});
