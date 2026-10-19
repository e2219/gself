const assert=require('node:assert/strict');require('../dist/profile-data.js');
const p=globalThis.MooncatchProfileData;
const values=new Map([['mooncatch-best-v6','900'],['unrelated','private'],['mooncatch-world','classic']]);
const store={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
let snapshot=p.snapshot(store);assert.equal(snapshot.data.unrelated,undefined);assert.equal(Object.keys(snapshot.data).length,2);
p.merge(store,p.parse(JSON.stringify({app:'mooncatch',format:1,data:{'mooncatch-best-v6':'200','mooncatch-world':'warp','mooncatch-sound':'true'}})));
assert.equal(store.getItem('mooncatch-best-v6'),'900');assert.equal(store.getItem('mooncatch-world'),'warp');assert.equal(store.getItem('unrelated'),'private');
for(const data of [{'mooncatch-world':'<script>'},{'mooncatch-best-v6':'NaN'},{'mooncatch-best-v6':'-1'},{'mooncatch-best-v6':'1e9'},{'unknown':'1'},{'mooncatch-controls':'mouse'},{'mooncatch-floating-layout':'{}'}])assert.throws(()=>p.merge(store,{app:'mooncatch',format:1,data}));
const before=JSON.stringify([...values]);assert.throws(()=>p.merge(store,{app:'mooncatch',format:1,data:{'mooncatch-world':'aurora','unknown':'bad'}}));assert.equal(JSON.stringify([...values]),before);
assert.throws(()=>p.parse('x'.repeat(65537)));assert.throws(()=>p.parse('{'));assert.throws(()=>p.parse('{"app":"mooncatch","format":2,"data":{}}'));
const floating=JSON.stringify({portrait:{size:'largest',position:'raised'},landscape:{size:'normal',position:'edge'}});assert(p.valid('mooncatch-floating-layout',floating));
for(const k of p.scoreKeys)assert(p.valid(k,'123456'));
let fail=true;const flaky={...store,setItem:(k,v)=>{if(k==='mooncatch-sound'&&fail){fail=false;throw Error('quota')}store.setItem(k,v)}};
assert.throws(()=>p.merge(flaky,{app:'mooncatch',format:1,data:{'mooncatch-world':'station','mooncatch-sound':'false'}}));assert.equal(JSON.stringify([...values]),before);
console.log('Profile PASS: allowlist, bounded format validation, higher-record merge, preference migration, no unrelated data and atomic rollback');

p.merge(store,{app:'mooncatch',format:1,data:{'mooncatch-world':'ion','mooncatch-music':'true','mooncatch-best-ion-v13':'1200','mooncatch-endless-ion-v16':'5500'}});assert.equal(store.getItem('mooncatch-world'),'ion');assert.equal(store.getItem('mooncatch-music'),'true');assert.equal(p.snapshot(store).data['mooncatch-best-ion-v13'],'1200');assert.throws(()=>p.parse(JSON.stringify({app:'mooncatch',format:1,data:{'mooncatch-music':'autoplay'}})));
console.log('V22 profile PASS: ion records and optional music round-trip, strict music preference validation');

assert(p.valid('mooncatch-music-track','floating-cities'));assert(p.valid('mooncatch-music-track','dream-culture'));assert(!p.valid('mooncatch-music-track','https://example.com/a.mp3'));
p.merge(store,{app:'mooncatch',format:1,data:{'mooncatch-music-track':'dream-culture'}});assert.equal(p.snapshot(store).data['mooncatch-music-track'],'dream-culture');
