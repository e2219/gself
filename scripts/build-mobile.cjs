const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
(async()=>{
 const out='mobile/www';fs.mkdirSync(out,{recursive:true});
 for(const name of ['game.js','profile-data.js','profile-ui.js'])fs.copyFileSync('dist/'+name,out+'/'+name);
 let css=fs.readFileSync('dist/style.css','utf8').replace(/env\(safe-area-inset-(top|right|bottom|left)\)/g,'var(--native-safe-$1,0px)');
 fs.writeFileSync(out+'/style.css',css+'\n'+fs.readFileSync('mobile/native.css','utf8'));
 fs.writeFileSync(out+'/native-runtime.js',fs.readFileSync('mobile/native-runtime.js','utf8').replaceAll('__APP_VERSION__',require('../package.json').version));
 let html=fs.readFileSync('dist/index.html','utf8');
 html=html.replace(/<script src="game\.js[^\"]*"><\/script><script src="profile-ui\.js[^\"]*"><\/script>/,'<script src="bootstrap.js"></script>');
 html=html.replace('<body>','<body class="native-app"><div id="nativeBoot" style="position:fixed;inset:0;z-index:3000;background:#0a1524;display:grid;place-content:center;color:#a6d9c9;font:24px sans-serif">☾ 月面拾光</div>');
 fs.writeFileSync(out+'/index.html',html);
 await esbuild.build({entryPoints:['mobile/bootstrap.js'],bundle:true,format:'iife',platform:'browser',target:'chrome89',outfile:out+'/bootstrap.js',minify:true});
 for(const file of fs.readdirSync(out))if(!['index.html','style.css','game.js','profile-data.js','profile-ui.js','bootstrap.js','native-runtime.js'].includes(file))throw Error('Unexpected bundled asset: '+file);
 console.log('Built offline mobile assets (no remote URL)');
})().catch(e=>{console.error(e);process.exit(1)});
