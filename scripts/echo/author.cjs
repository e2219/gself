// Fixed authored layouts are the source of truth. Regenerate shipped levels and proof certificates.
const fs=require('fs'),assert=require('node:assert/strict'),E=require('../../dist/echo/engine.js'),levels=require('./layouts.json');
const proofs=[];assert.equal(levels.length,30);
for(const [i,l] of levels.entries()){
 assert.equal(l.id,i+1);assert(!l.mines);const c=E.compile(l);assert.equal(c.starts.length,2);assert.equal(c.goals.length,2);assert.equal(c.boxes.length,c.docks.length);
 assert(l.map.every(r=>r.length===c.w&&/^[.#]+$/.test(r)));assert(!c.docks.some(n=>c.trails.includes(n)));
 for(const n of [...c.starts,...c.goals,...c.boxes,...c.docks,...c.trails,...c.plates.map(p=>p.pos),...c.gates.map(g=>g.pos)])assert.equal(c.floor[n],'.',`Level ${l.id}: feature on wall`);
 for(const g of c.gates)assert(c.plates.some(p=>p.id===g.id));
 const proof=E.solve(l,500000);assert(proof,`Level ${l.id} has no verified solution within search bound`);proofs.push({id:l.id,...proof});console.log(l.id,l.title,proof.minimum,proof.visited);
}
fs.writeFileSync('dist/echo/levels.js','(function(root){const levels='+JSON.stringify(levels,null,2)+';root.EchoLevels=levels;if(typeof module!=="undefined"&&module.exports)module.exports=levels;})(globalThis);\n');
fs.writeFileSync('tests/fixtures/echo-solutions.json',JSON.stringify(proofs,null,2)+'\n');
