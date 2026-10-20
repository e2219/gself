const esbuild=require('esbuild');
esbuild.buildSync({entryPoints:['dist/render3d/index.js'],bundle:true,format:'iife',platform:'browser',target:'chrome100',outfile:'dist/scene3d.js',minify:true,legalComments:'eof'});
require('node:fs').copyFileSync('node_modules/three/LICENSE','dist/THIRD_PARTY_LICENSES.txt');
console.log('Built local Three.js renderer bundle');
