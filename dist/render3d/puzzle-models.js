import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Lunar reliquary kit. Model dimensions are in cells, independent of puzzle rules.
export function createPuzzleModels(T,{geo,mat,mesh,box,sphere,capsule,torus,cyl,diamond,bevel,M}){
 const silver=mat('#9babbe',{metalness:.65,roughness:.43});
 const basalt=mat('#172637',{roughness:.86,metalness:.16});
 const ceramic=mat('#afbeca',{roughness:.58,metalness:.2});
 const night=mat('#35405d',{roughness:.62,metalness:.4});
 const edge=mat('#5d7891',{roughness:.52,metalness:.55});
 const full=mat('#e7d3a3',{emissive:'#af8644',emissiveIntensity:.45});
 const crescent=mat('#c7c4ed',{emissive:'#756ba7',emissiveIntensity:.5});
 const crescentShape=new T.Shape();
 crescentShape.moveTo(.096,.282);
 crescentShape.bezierCurveTo(-.336,.261,-.336,-.261,.096,-.282);
 crescentShape.bezierCurveTo(-.156,-.156,-.156,.156,.096,.282);
 const crescentGeo=geo(new T.ExtrudeGeometry(crescentShape,{depth:.065,bevelEnabled:true,bevelSegments:1,bevelSize:.015,bevelThickness:.015,steps:1,curveSegments:20}));
 const mantleGeo=bevel(.45,.29,.38,.095),shoeGeo=bevel(.15,.25,.09,.025);
 const moonDisk=geo(new T.CylinderGeometry(.24,.24,.075,24));moonDisk.rotateX(Math.PI/2);
 function bake(group){
  for(const child of [...group.children])if(child.isGroup)bake(child);
  const lists=new Map();for(const child of [...group.children])if(child.isMesh){child.updateMatrix();const g=(child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone()).applyMatrix4(child.matrix);const list=lists.get(child.material)||[];list.push(g);lists.set(child.material,list);group.remove(child);}
  for(const [material,list]of lists){const merged=mergeGeometries(list,false);list.forEach(g=>g.dispose());if(merged)mesh(geo(merged),material,group);}
  return group;
 }
 function actor(dark){
  const root=new T.Group(),body=new T.Group();root.add(body);body.rotation.y=Math.PI;
  const suit=dark?night:ceramic,signal=dark?crescent:full;
  // A broad crescent mantle versus a compact split tunic, not recolored helmets.
  const torso=mesh(mantleGeo,suit,body,0,.29,0,dark?.72:1.12,1,1);
  torso.rotation.z=dark?-.08:0;
  mesh(box,basalt,body,0,.49,-.16,.25,.27,.035);
  mesh(box,silver,body,0,.34,-.18,dark?.18:.36,.045,.055);
  if(dark){
   const crown=mesh(crescentGeo,signal,body,0,.84,-.035);crown.rotation.z=.23;
   mesh(sphere,basalt,body,-.025,.78,0,.14,.18,.13);
   mesh(box,signal,body,-.025,.80,-.135,.12,.025,.02);
   for(const side of [-1,1]){const fold=mesh(bevel(.12,.19,.43,.025),night,body,side*.16,.27,.09);fold.rotation.z=side*-.15;}
  }else{
   mesh(moonDisk,signal,body,0,.83,0);
   mesh(moonDisk,silver,body,0,.83,.045,1.13,1.13,.55);
   mesh(sphere,basalt,body,0,.78,-.07,.16,.11,.1);
   mesh(box,signal,body,0,.81,-.17,.16,.024,.02);
   const crest=mesh(diamond,silver,body,0,1.10,0,.2,.5,.2);crest.rotation.z=Math.PI/4;
  }
  // Circular clasp / split crescent clasp repeat the readable phase vocabulary.
  const clasp=mesh(dark?crescentGeo:moonDisk,signal,body,0,.49,-.19,.33,.33,.33);clasp.rotation.z=dark?.5:0;
  const limbs=[];for(const side of [-1,1]){
   const arm=new T.Group();arm.position.set(side*(dark?.19:.25),.55,0);body.add(arm);
   mesh(capsule,suit,arm,0,-.10,0,.64,.62,.65);mesh(sphere,silver,arm,0,-.22,-.02,.066,.07,.075);
   const shoulder=mesh(box,silver,arm,0,.02,0,.17,.065,.21);shoulder.rotation.z=side*.14;
   const leg=new T.Group();leg.position.set(side*.10,.22,0);body.add(leg);
   mesh(capsule,basalt,leg,0,-.04,0,.62,.53,.7);mesh(shoeGeo,silver,leg,0,-.16,-.045);
   limbs.push({arm,leg,side});
  }
  // Static pieces are merged while limb pivots remain independently animated.
  bake(body);
  const ring=mesh(torus,signal,root,0,.02,0,1.1,1.1,1.1);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
  root.userData={model:body,limbs,ring,form:dark?'crescent-mantle':'full-moon-warden'};
  return root;
 }
 function crate(){
  const root=new T.Group();root.name='lunar-reliquary';
  mesh(bevel(.53,.53,.39,.08),basalt,root,0,.03,0);
  mesh(bevel(.46,.46,.07,.06),silver,root,0,.43,0);
  for(const side of [-1,1])for(const axis of [0,1]){
   const x=axis?side*.24:0,z=axis?0:side*.24;
   mesh(box,ceramic,root,x,.25,z,axis?.07:.44,.22,axis?.44:.07);
   mesh(box,M.gold,root,x,.27,z,axis?.08:.045,.32,axis?.045:.08);
  }
  const lid=mesh(crescentGeo,M.jade,root,0,.515,0,.48,.48,.48);lid.rotation.x=-Math.PI/2;
  for(const x of [-.21,.21])for(const z of [-.21,.21])mesh(sphere,edge,root,x,.48,z,.035,.018,.035);
  return bake(root);
 }
 function gatePanel(){
  const root=new T.Group();root.name='moon-seal';
  mesh(bevel(.58,.10,.5,.05),basalt,root,0,-.25,0);
  for(const side of [-1,1]){const blade=mesh(box,M.red,root,side*.15,0,0,.045,.47,.13);blade.rotation.z=side*-.17;}
  mesh(box,M.red,root,0,0,0,.44,.045,.135);
  const sigil=mesh(crescentGeo,M.red,root,0,0,.07,.35,.35,.35);
  bake(root);root.userData.signal=M.red;return root;
 }
 function energyCore(){
  const root=new T.Group();root.name='moon-seed';
  mesh(diamond,M.jade,root,0,.23,0,.7,1.25,.7);
  for(const side of [-1,1]){const rib=mesh(crescentGeo,silver,root,0,.23,side*.05,.64,.64,.64);rib.rotation.y=side*Math.PI/2;}
  const cap=mesh(cyl,M.gold,root,0,.08,0,.12,.035,.12);
  return bake(root);
 }
 return {actor,crate,gatePanel,energyCore,bake,silver,basalt,edge,full,crescent,crescentGeo};
}
