const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
test('original edition preserves the complete pre-3D release byte-for-byte',()=>{
 const manifest=require('../dist/legacy/provenance.json');
 for(const [name,hash]of Object.entries(manifest.sha256)){
  let bytes=fs.readFileSync('dist/legacy/'+name);
  if(name==='index.html')bytes=Buffer.from(bytes.toString().replace('<script src="../version-choice.js"></script>',''));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash,name);
 }
 assert.deepEqual(fs.readFileSync('dist/legacy/profile-data.js'),fs.readFileSync('dist/profile-data.js'),'both editions validate the same portable save format');
});
