const fs = require('node:fs');
const assert = require('node:assert/strict');
let html = fs.readFileSync('dist/index.html', 'utf8');
const css = fs.readFileSync('dist/style.css', 'utf8');
const js = fs.readFileSync('dist/game.js', 'utf8');
const cssTag = /<link rel="stylesheet" href="style\.css(?:\?[^"]*)?">/;
const jsTag = /<script src="game\.js(?:\?[^"]*)?"><\/script>/;
assert(cssTag.test(html) && jsTag.test(html), 'Expected game assets not found');
html = html.replace(cssTag, () => `<style>${css}</style>`);
html = html.replace(jsTag, () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
for(const name of ['profile-data','profile-ui','game-suite']){
 const source=fs.readFileSync('dist/'+name+'.js','utf8');
 html=html.replace(new RegExp('<script src="'+name+'\\.js[^"]*"></script>'),()=>'<script>'+source.replace(/<\/script/gi,'<\\/script')+'</script>');
}
assert(!html.includes('src="game.js') && !html.includes('href="style.css'));
// Keep branch-based Pages and Actions deployments on the same entry point.
fs.writeFileSync('index.html', html);
fs.writeFileSync('.nojekyll', '');
fs.mkdirSync('_site', { recursive: true });
fs.writeFileSync('_site/index.html', html);
fs.writeFileSync('_site/.nojekyll', '');
console.log('Built standalone GitHub Pages game');

fs.cpSync('dist/audio','_site/audio',{recursive:true});
fs.cpSync('dist/audio','audio',{recursive:true});

fs.cpSync('dist/echo','_site/echo',{recursive:true});
fs.cpSync('dist/echo','echo',{recursive:true});
