// Generate once. Keep .private/ and signing.properties off Git and back them up securely.
const fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process'),path=require('node:path');
const dir=path.resolve('.private'),keystore=path.join(dir,'mooncatch-release.jks');
if(fs.existsSync(keystore)||fs.existsSync('android/signing.properties'))throw Error('Signing material already exists; reuse it for updates.');
fs.mkdirSync(dir,{recursive:true,mode:0o700});
const password=crypto.randomBytes(24).toString('hex');
const keytool=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin','keytool'):'keytool';
fs.writeFileSync('android/signing.properties',`storeFile=../.private/mooncatch-release.jks\nstorePassword=${password}\nkeyAlias=mooncatch\nkeyPassword=${password}\n`,{mode:0o600});
cp.execFileSync(keytool,['-genkeypair','-keystore',keystore,'-storetype','PKCS12','-alias','mooncatch','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Mooncatch, OU=Independent Games, O=Mooncatch, C=CN','-storepass:env','MOONCATCH_KEY_PASSWORD','-keypass:env','MOONCATCH_KEY_PASSWORD'],{env:{...process.env,MOONCATCH_KEY_PASSWORD:password},stdio:'pipe'});
fs.chmodSync(keystore,0o600);
console.log('Created private release signing key. Do not commit it or regenerate it for updates.');
