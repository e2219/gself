// Deliver public source separately from the private signing backup.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const version=require('../package.json').version,out='releases';fs.mkdirSync(out,{recursive:true});
const apk=path.join(out,`mooncatch-${version}.apk`);fs.copyFileSync('android/app/build/outputs/apk/release/app-release.apk',apk);
fs.writeFileSync(apk+'.sha256',crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex')+'  '+path.basename(apk)+'\n');
const files=cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(f=>f&&fs.existsSync(f)&&!f.startsWith('releases/'));
// Fail closed if signing material could leak into the public source archive.
if(files.some(f=>/\.private|signing\.properties|\.(jks|keystore)$/.test(f)))throw Error('Private signing material in source list');
fs.writeFileSync(out+'/source-files.json',JSON.stringify(files));
console.log('Prepared APK and source list; zip with scripts/package-mobile.py.');
