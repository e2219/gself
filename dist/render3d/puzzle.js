import {fixtureActive,symbol,gateLabel} from './puzzle-state.mjs';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
export function createPuzzleRenderer(T,canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 const scene=new T.Scene();scene.background=new T.Color('#101f30');
 const camera=new T.OrthographicCamera(-6,6,6,-6,.1,90);camera.position.set(0,18,13);camera.lookAt(0,0,0);
 const envScene=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(envScene,.025);scene.environment=env.texture;scene.environmentIntensity=.65;pmrem.dispose();envScene.dispose();
 scene.add(new T.HemisphereLight('#d5ebff','#344457',1.4));const key=new T.DirectionalLight('#fff0d3',3.1);key.position.set(-6,13,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-11;key.shadow.camera.right=11;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;key.shadow.camera.far=40;key.shadow.bias=-.0007;key.shadow.normalBias=.025;scene.add(key);const fill=new T.DirectionalLight('#a4c7ff',1.2);fill.position.set(7,4,-8);scene.add(fill);
 const materials=new Set(),geometries=new Set(),textures=new Set();
 const mat=(color,opts={})=>{const m=new T.MeshStandardMaterial({color,roughness:.65,metalness:.1,...opts});materials.add(m);return m};
 const M={floor:mat('#a9b2ac',{roughness:.82}),stone:mat('#263e53',{roughness:.85}),ceramic:mat('#d8e2df',{roughness:.3,metalness:.25}),steel:mat('#244151',{metalness:.75,roughness:.4}),gold:mat('#cead66',{metalness:.72,roughness:.28}),shadow:mat('#58657e',{metalness:.45,roughness:.4}),glass:mat('#172e40',{metalness:.8,roughness:.16}),sun:mat('#f3cf7d',{emissive:'#f6b844',emissiveIntensity:.55}),moon:mat('#baa9ff',{emissive:'#8d7df5',emissiveIntensity:.55}),jade:mat('#a8e2cb',{emissive:'#4bbf9d',emissiveIntensity:.3}),trail:mat('#286a62',{roughness:.5,metalness:.3}),spent:mat('#69757b'),red:mat('#c87681',{emissive:'#b54058',emissiveIntensity:.25})};
 const geo=g=>{geometries.add(g);return g};
 const box=geo(new T.BoxGeometry(1,1,1)),sphere=geo(new T.SphereGeometry(1,16,12)),capsule=geo(new T.CapsuleGeometry(.13,.25,3,8)),torus=geo(new T.TorusGeometry(.32,.035,6,32)),cyl=geo(new T.CylinderGeometry(1,1,1,24)),diamond=geo(new T.OctahedronGeometry(.22));
 function bevel(w,d,h,r=.055){const s=new T.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1,curveSegments:3});g.rotateX(-Math.PI/2);return geo(g)}
 const squareRing=geo(new T.TorusGeometry(.35,.035,4,4)),hex=geo(new T.CylinderGeometry(1,1,1,6));
 const tileGeo=bevel(.94,.94,.13),wallGeo=bevel(.9,.9,.46),crateGeo=bevel(.49,.49,.43);
 const sharedGeometries=new Set(geometries),sharedMaterials=new Set(materials);
 const mesh=(g,m,parent,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
 const slab=new T.Group();scene.add(slab);let level=null,root=null,fixture=[],tileMap=[],gates=[],players=[],boxes=[],trailMeshes=[],core=null,carry=null,trace=null,guardPins=[],worldW=9,worldH=9,lastSize="",lampArray=[];
 const tmp=new T.Object3D(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),hit=new T.Vector3();
 const pos=n=>[n%worldW-(worldW-1)/2,Math.floor(n/worldW)-(worldH-1)/2];
 function label(text,parent,x,y,z,color='#cde8e2',size=.3){const cv=document.createElement('canvas');cv.width=cv.height=64;const ctx=cv.getContext('2d');ctx.clearRect(0,0,64,64);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${text.length>3?17:text.length>1?26:43}px sans-serif`;ctx.fillText(text,32,34);const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;textures.add(tex);const m=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});materials.add(m);const o=mesh(geo(new T.PlaneGeometry(size,size)),m,parent,x,y,z);o.rotation.x=-Math.PI/2;o.castShadow=false;return o}
 function astronaut(shadow){const p=new T.Group(),model=new T.Group();p.add(model);model.rotation.y=Math.PI;const suit=shadow?M.shadow:M.ceramic,signal=shadow?M.moon:M.sun;
 const torso=mesh(capsule,suit,model,0,.47,0,1.35,1.2,1.1);mesh(box,M.steel,model,0,.48,.15,.27,.33,.16);mesh(box,signal,model,0,.48,.24,.06,.19,.025);
 mesh(sphere,suit,model,0,.78,0,.25,.235,.24);const visor=mesh(sphere,M.glass,model,0,.79,-.09,.213,.154,.19);mesh(torus,signal,model,0,.78,-.18,.56,.56,.56);
 const limbs=[];for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.23,.54,0);model.add(arm);mesh(capsule,suit,arm,0,-.08,0,.65,.8,.65);mesh(sphere,M.steel,arm,0,-.25,-.01,.083,.085,.095);const leg=new T.Group();leg.position.set(side*.105,.24,0);model.add(leg);mesh(capsule,suit,leg,0,-.035,0,.65,.66,.72);mesh(box,M.steel,leg,0,-.16,-.045,.16,.08,.25);limbs.push({arm,leg,side});mesh(sphere,signal,model,side*.242,.79,0,.035,.05,.045)}
 mesh(box,M.gold,model,-.055,.49,-.143,.1,.11,.03);mesh(box,M.glass,model,.065,.49,-.143,.07,.08,.03);
 const ring=mesh(torus,signal,p,0,.02,0,1.2,1.2,1.2);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
 if(shadow){const flag=mesh(torus,M.moon,model,0,.99,.05,.35,.35,.35);flag.rotation.z=.3;mesh(box,M.steel,model,0,.88,.17,.025,.27,.025)}
 p.userData={model,limbs,ring};return p;
 }
 function lamp(n,role,id,kind='plate'){const p=new T.Group(),[x,z]=pos(n);p.position.set(x,.025,z);root.add(p);const square=kind==='plate'||kind==='dock',signal=role===1?M.moon:role===0?M.sun:M.jade;
 mesh(square?box:kind==='socket'||kind==='target'?hex:cyl,M.steel,p,0,.025,0,square?.72:.38,.09,square?.72:.38);
 const light=mesh(square?squareRing:torus,signal,p,0,.09,0);light.rotation.set(-Math.PI/2,0,square?Math.PI/4:0);
 mesh(square?box:cyl,M.glass,p,0,.071,0,square?.49:.24,.025,square?.49:.24);
 label(symbol(id),p,0,.10,0,role===1?'#dfd2ff':role===0?'#ffe3a6':'#e2f9ed',.6);
 if(kind==='target'){for(const side of [-1,1])mesh(diamond,M.gold,p,side*.33,.22,0,.5,.5,.5)}
 fixture.push({p,light,n,role,kind,id});return p}

 function clearLevel(){if(root){scene.remove(root);for(const g of [...geometries])if(!sharedGeometries.has(g)){g.dispose();geometries.delete(g)}for(const m of [...materials])if(!sharedMaterials.has(m)){m.dispose();materials.delete(m)}for(const t of textures)t.dispose();textures.clear()}root=new T.Group();scene.add(root);fixture=[];tileMap=[];gates=[];players=[];boxes=[];trailMeshes=[];guardPins=[];core=carry=null;trace=null;lampArray=[];slab.clear()}
 function build(game){level=game.level;worldW=level.w;worldH=level.h;clearLevel();
 mesh(box,M.steel,slab,0,-.46,0,worldW+.35,.67,worldH+.35);mesh(box,M.gold,slab,0,-.15,0,worldW+.43,.055,worldH+.43);mesh(box,M.stone,slab,0,-.09,0,worldW+.5,.10,worldH+.5);
 const floor=new T.InstancedMesh(tileGeo,M.floor,worldW*worldH),walls=new T.InstancedMesh(wallGeo,M.stone,worldW*worldH),caps=new T.InstancedMesh(box,M.steel,worldW*worldH);let fc=0,wc=0;
 const cc=new T.Color();for(let n=0;n<level.floor.length;n++){const [x,z]=pos(n);tmp.position.set(x,-.12,z);tmp.scale.set(1,1,1);tmp.updateMatrix();floor.setMatrixAt(fc,tmp.matrix);floor.setColorAt(fc++,cc.setHSL(.12,.045,.60+((n*13)%7)*.017));if(level.floor[n]==='#'){tmp.position.set(x,.012,z);tmp.updateMatrix();walls.setMatrixAt(wc,tmp.matrix);tmp.position.y=.48;tmp.scale.set(.75,.025,.75);tmp.updateMatrix();caps.setMatrixAt(wc++,tmp.matrix)}}
 floor.count=fc;walls.count=caps.count=wc;floor.receiveShadow=walls.receiveShadow=true;walls.castShadow=true;root.add(floor,walls,caps);
 // Inlaid repair seams and corner fasteners belong to the floor, never to the rules.
 const inlay=new T.InstancedMesh(box,M.steel,worldW*worldH*3);let ic=0;
 for(let n=0;n<level.floor.length;n++){if(level.floor[n]==='#')continue;const[x,z]=pos(n);
  for(const side of [-1,1]){tmp.position.set(x+side*.36,.018,z-.36);tmp.scale.set(.045,.012,.045);tmp.updateMatrix();inlay.setMatrixAt(ic++,tmp.matrix)}
  if(n%5===2){tmp.position.set(x-.12,.018,z+.32);tmp.scale.set(.32,.008,.012);tmp.updateMatrix();inlay.setMatrixAt(ic++,tmp.matrix)}
 }inlay.count=ic;root.add(inlay);
 // Recessed ribs articulate the plinth's thickness without covering traversable cells.
 const ribs=new T.InstancedMesh(box,M.stone,worldW*2+worldH*2);let ri=0;
 for(const side of [-1,1]){for(let x=0;x<worldW;x++){tmp.position.set(x-(worldW-1)/2,-.48,side*(worldH/2+.18));tmp.scale.set(.55,.29,.09);tmp.updateMatrix();ribs.setMatrixAt(ri++,tmp.matrix)}for(let z=0;z<worldH;z++){tmp.position.set(side*(worldW/2+.18),-.48,z-(worldH-1)/2);tmp.scale.set(.09,.29,.55);tmp.updateMatrix();ribs.setMatrixAt(ri++,tmp.matrix)}}ribs.count=ri;root.add(ribs);
 for(const [i,n]of level.goals.entries())if(n>=0){lamp(n,i,i?'☾':'☀','goal');const[x,z]=pos(n);const arch=mesh(torus,i?M.moon:M.sun,root,x,.3,z,1.2,1.2,1.2);arch.rotation.x=-Math.PI/2;}
 for(const p of level.plates)lamp(p.pos,p.role,p.id);
 for(const p of level.access||[]){const n=p.at[1]*worldW+p.at[0];lamp(n,p.actor,p.actor?'☾':'☀','access')}
 for(const n of level.docks)lamp(n,undefined,'▣','dock');
 for(const g of level.gates){const p=new T.Group(),[x,z]=pos(g.pos);p.position.set(x,0,z);root.add(p);for(const side of [-1,1]){mesh(box,M.ceramic,p,side*.38,.35,0,.12,.7,.21);mesh(box,M.gold,p,side*.38,.66,0,.17,.045,.26)}const panel=mesh(box,M.red,p,0,.34,0,.62,.55,.12);mesh(box,M.steel,p,0,.65,0,.8,.06,.23);const sign=label(gateLabel(game,g),p,0,.78,0,'#fff0df',.84);sign.rotation.x=-Math.atan2(18,13);gates.push({g,p,panel,index:gates.length})}
 for(const n of level.trails){const[x,z]=pos(n);const ring=mesh(torus,M.trail,root,x,.019,z,1,1,1);ring.rotation.x=-Math.PI/2;trailMeshes.push({n,ring});}
 for(let i=0;i<2;i++){const p=astronaut(i===1);root.add(p);players.push(p)}
 for(const n of game.state.boxes){const p=new T.Group();root.add(p);mesh(crateGeo,M.ceramic,p,0,.02,0);for(const side of [-1,1]){mesh(box,M.gold,p,side*.16,.25,0,.045,.45,.53);mesh(box,M.steel,p,0,.25,side*.265,.5,.045,.03)}mesh(diamond,M.jade,p,0,.5,0,.6,.6,.6);boxes.push(p)}
 if(game.puzzle){const p=game.puzzle;if(p.level.lampTarget){const mount=new T.Group();mount.position.set(0,.49,worldH/2-.5);root.add(mount);mesh(box,M.steel,mount,0,.03,0,3.7,.12,.65);p.level.lampTarget.forEach((target,i)=>{const x=(i-1.5)*.8;const bulb=mesh(sphere,M.spent,mount,x,.19,0,.17,.14,.17);lampArray.push(bulb);label(target?'●':'○',mount,x,.11,.25,'#c7f2df',.23)})}for(const socket of p.level.sockets||[])lamp(socket.y*worldW+socket.x,undefined,socket.id.toUpperCase(),'socket');if(p.level.target)lamp(p.level.target.y*worldW+p.level.target.x,undefined,'◇','target');core=new T.Group();mesh(diamond,M.jade,core,0,.22,0);for(let i=0;i<3;i++){const ring=mesh(torus,M.gold,core,0,.22,0,.7,.7,.7);ring.rotation.set(i*Math.PI/3,i*Math.PI/3,0)}root.add(core);carry=mesh(diamond,M.jade,players[0],.28,.48,-.06,.65,.65,.65);
 const lineGeo=geo(new T.BufferGeometry());lineGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(750*3),3));lineGeo.setDrawRange(0,0);const lm=new T.LineBasicMaterial({color:'#bcaff7',transparent:true,opacity:.62});materials.add(lm);trace=new T.Line(lineGeo,lm);root.add(trace);
 }
 // Perimeter hardware and engraved direction ticks ground the floating ruin.
 for(const side of [-1,1])for(let j=-1;j<=1;j++){mesh(box,M.ceramic,root,side*(worldW/2+.13),-.36,j*(worldH*.32),.12,.25,.45);mesh(box,M.sun,root,side*(worldW/2+.2),-.31,j*(worldH*.32),.025,.08,.19)}
 resize();
 }
 function resize(){const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));const sizeKey=`${w}/${h}/${worldW}/${worldH}`;if(sizeKey===lastSize)return;lastSize=sizeKey;renderer.setSize(w,h,false);const aspect=w/h,depth=worldH*.815+1.9,span=Math.max(depth,(worldW+1.4)/aspect);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix()}
 function render(game,s,from,f,t=0){if(level!==game.level)build(game);const moving=from&&f<1;for(let i=0;i<2;i++){const o=players[i],n=s.p[i];o.visible=n>=0;if(n<0)continue;const[a,b]=pos(n),prev=from?.p[i]>=0?pos(from.p[i]):[a,b],u=moving?f:1;o.position.set(prev[0]+(a-prev[0])*u,.025,prev[1]+(b-prev[1])*u);const moved=moving&&(prev[0]!==a||prev[1]!==b);o.userData.model.position.y=moved?Math.sin(u*Math.PI)*.085:0;if(moved)o.userData.model.rotation.y=Math.atan2(-(a-prev[0]),-(b-prev[1]));for(const l of o.userData.limbs){l.leg.rotation.x=moved?Math.sin(u*Math.PI*2)*.55*l.side:0;l.arm.rotation.x=moved?-Math.sin(u*Math.PI*2)*.35*l.side:0}o.userData.ring.visible=game.level.mode==='relay'?s.active===i:true;o.userData.ring.scale.setScalar(s.active===i&&game.level.mode==='relay'?1.3:1.08)}
 const oldBoxes=from?.boxes||s.boxes,removed=oldBoxes.filter(n=>!s.boxes.includes(n)),added=s.boxes.filter(n=>!oldBoxes.includes(n));
 for(let i=0;i<boxes.length;i++){const n=s.boxes[i],[x,z]=pos(n),previous=oldBoxes.includes(n)?n:removed[added.indexOf(n)],a=previous===undefined?[x,z]:pos(previous),u=moving?f:1;boxes[i].position.set(a[0]+(x-a[0])*u,0,a[1]+(z-a[1])*u)}
 for(const {g,panel,index}of gates){const open=game.puzzle?game.openGate(g):globalThis.EchoSync.openGate(level,s,g);const wasOpen=from?(game.puzzle?(from.gateOpen?.[index]??open):globalThis.EchoSync.openGate(level,from,g)):open,u=moving?f:1,v=(wasOpen?1:0)+((open?1:0)-(wasOpen?1:0))*u;panel.scale.y=1-.88*v;panel.position.y=.34+.24*v;panel.material=open?M.jade:M.red}
 for(const {n,ring}of trailMeshes)ring.material=s.ink&(1<<level.trailIndex.get(n))?M.spent:M.trail;
 for(const {n,light,role,kind,id}of fixture){const active=fixtureActive(game,s,{n,role,kind,id});light.scale.setScalar(active?1.1:1);light.material=active?M.jade:role===1?M.moon:role===0?M.sun:M.gold}
 if(game.puzzle){const p=game.puzzle;lampArray.forEach((lamp,i)=>lamp.material=p.lamps[i]?M.jade:M.glass);core.visible=!!p.core;carry.visible=p.carry;if(p.core){const[x,z]=pos(p.core.y*worldW+p.core.x);core.position.set(x,.07,z);core.rotation.y=t*.3}const a=trace.geometry.attributes.position;let count=0;for(const q of p.trace){if(count>=750)break;const[x,z]=pos(q.y*worldW+q.x);a.setXYZ(count++,x,.035,z)}a.needsUpdate=true;trace.geometry.setDrawRange(0,count);trace.frustumCulled=false;while(guardPins.length<p.guardMarks.size){const pin=mesh(geo(new T.ConeGeometry(.07,.24,6)),M.moon,root);guardPins.push(pin)}let j=0;for(const mark of p.guardMarks){const q=p.trace[mark],[x,z]=pos(q.y*worldW+q.x);guardPins[j].visible=true;guardPins[j++].position.set(x+.3,.18,z+.3)}for(;j<guardPins.length;j++)guardPins[j].visible=false;}
 renderer.render(scene,camera);
 }
 function pick(clientX,clientY){const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),camera);if(!ray.ray.intersectPlane(plane,hit))return null;const x=Math.round(hit.x+(worldW-1)/2),y=Math.round(hit.z+(worldH-1)/2);return x>=0&&y>=0&&x<worldW&&y<worldH?{x,y}:null}
 function diagnostics(){return {renderer:renderer.info,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,materials:materials.size,pixelRatio:renderer.getPixelRatio(),shadowMapSize:1024,shadowCastingLights:1,postPasses:0}}
 function projectCell(x,y){const p=new T.Vector3(x-(worldW-1)/2,0,y-(worldH-1)/2).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}}
 return {render,resize,pick,projectCell,diagnostics,dispose(){renderer.dispose();env.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose()}};
}
