import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Authored in units of the existing collision radius. Decorative parts never
// participate in combat. Static detail is merged by material before rendering.
export function createBossModels(T,{geom,mat,mesh,plate,box,sphere,torus,crystal,M}){
  const shell=mat(0x718590,.38,.62),edge=mat(0xd9d8cb,.32,.55);
  const purple=mat(0x655e91,.35,.58),copper=mat(0xaa775a,.4,.65);
  const coreMint=mat(0xa1e7d0,.25,.35,{emissive:0x4ab697,emissiveIntensity:.7});
  const coreViolet=mat(0xc2a0ef,.24,.35,{emissive:0x8954bf,emissiveIntensity:.7});
  const coreGold=mat(0xf0ca83,.3,.45,{emissive:0xc78b3b,emissiveIntensity:.6});
  const disc=geom(new T.CylinderGeometry(1,1,1,24));disc.rotateX(Math.PI/2);
  const arc=(r,t,start,length)=>geom(new T.TorusGeometry(r,t,5,24,length).rotateZ(start));
  function group(parent,name,moving=false){const g=new T.Group();g.name=name;g.userData.moving=moving;parent?.add(g);return g;}
  function panel(parent,points,z,depth,material=M.ceramic){return mesh(plate(points,depth,.012),material,parent,0,0,z);}
  function block(parent,material,x,y,z,sx,sy,sz,angle=0){const m=mesh(box,material,parent,x,y,z,sx,sy,sz);m.rotation.z=angle;return m;}
  function circle(parent,material,r,z,thick=.03){return mesh(arc(r,thick,0,Math.PI*2),material,parent,0,0,z);}
  function bolt(parent,x,y,z){mesh(disc,M.dark,parent,x,y,z,.032,.032,.025);mesh(disc,edge,parent,x,y,z+.018,.014,.014,.015);}
  function bake(g){
    // Recurse first: animated child pivots stay intact; each static material
    // batch within a pivot becomes a single draw call.
    for(const c of [...g.children])if(c.isGroup){
      bake(c);
      if(!c.userData.moving){c.updateMatrix();for(const child of [...c.children]){child.applyMatrix4(c.matrix);g.add(child);}g.remove(c);}
    }
    const batches=new Map();
    for(const c of [...g.children])if(c.isMesh){c.updateMatrix();const data=(c.geometry.index?c.geometry.toNonIndexed():c.geometry.clone()).applyMatrix4(c.matrix);const list=batches.get(c.material)||[];list.push(data);batches.set(c.material,list);g.remove(c);}
    for(const [material,list]of batches){const merged=mergeGeometries(list,false);for(const data of list)data.dispose();if(merged){const m=mesh(geom(merged),material,g);m.name=g.name+'-surface';}}
  }
  const models={};
  // Starstorm: a compact impact-scarred fortress with three projectile drums,
  // radial reinforced armor and a recessed gold reactor.
  {
    const root=group(null,'boss-starstorm-fortress'),rotor=group(root,'projectile-drum',true);
    mesh(disc,M.dark,root,0,0,-.05,.76,.76,.28);
    mesh(disc,shell,root,0,0,.04,.63,.63,.26);
    circle(root,copper,.62,.2,.055);circle(root,M.dark,.4,.23,.075);
    mesh(sphere,M.glass,root,0,0,.18,.36,.36,.22);
    mesh(crystal,coreGold,root,0,0,.36,.2,.2,.17);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,g=group(root,'armor-sector-'+i);g.rotation.z=a;
      panel(g,[[.4,-.16],[.72,-.22],[.9,-.13],[.86,.13],[.59,.22],[.4,.16]],.12,.17,i%2?shell:M.ceramic);
      block(g,copper,.69,0,.25,.28,.035,.035);bolt(g,.79,-.09,.24);
      for(let j=0;j<3;j++)block(g,M.dark,.53+j*.06,.11,.23,.025,.09,.015,-.3);
    }
    for(let i=0;i<3;i++){
      const g=group(rotor,'launcher-'+i);g.rotation.z=i*Math.PI*2/3;
      mesh(disc,M.navy,g,.43,0,.31,.14,.14,.17);circle(g,M.gold,.11,.42,.025).position.x=.43;
      mesh(disc,M.dark,g,.43,0,.43,.077,.077,.025);mesh(disc,coreGold,g,.43,0,.45,.038,.038,.018);
    }
    bake(root);models.classic={root,update(t,c){rotor.rotation.z=t*.12+(c.warning?c.charge*.3:0);rotor.position.z=c.warning?.05*c.charge:0;}};
  }
  // Aurora eye: nested optical housing, iris shutters and split orbit collar.
  {
    const root=group(null,'boss-aurora-eye'),iris=group(root,'iris-shutters',true),collar=group(root,'split-orbit-collar',true);
    mesh(sphere,M.navy,root,0,0,0,.73,.56,.28);
    circle(root,M.gold,.54,.18,.065);circle(root,M.dark,.42,.25,.07);
    mesh(sphere,M.glass,root,0,0,.19,.37,.37,.23);
    mesh(sphere,coreMint,root,0,0,.32,.17,.24,.1);
    mesh(sphere,M.dark,root,0,0,.4,.055,.18,.03);
    for(const side of[-1,1]){
      panel(root,[[.36,-.38],[.73,-.25],[.99,0],[.74,.24],[.35,.38],[.57,.04]].map(([x,y])=>[x*side,y]),.1,.13);
      block(root,M.gold,side*.72,0,.23,.29,.035,.04);bolt(root,side*.7,-.13,.2);
    }
    for(let i=0;i<6;i++){
      const g=group(iris,'shutter-'+i);g.rotation.z=i*Math.PI/3;
      panel(g,[[.26,-.1],[.41,-.18],[.53,-.06],[.42,.12],[.3,.1]],.29,.055,shell);
      block(g,coreMint,.4,0,.33,.1,.022,.018);
    }
    for(const side of[0,Math.PI]){
      mesh(arc(.77,.027,side+.25,Math.PI-.5),coreMint,collar,0,0,.02);
      mesh(arc(.83,.045,side+.48,Math.PI-.96),M.gold,collar,0,0,-.02);
    }
    bake(root);models.aurora={root,update(t,c){iris.rotation.z=t*.08+(c.warning?c.charge*.65:0);iris.scale.setScalar(c.warning?1-.16*c.charge:1);collar.rotation.z=t*.16;collar.scale.setScalar(c.warning?1-.07*c.charge:1);}};
  }
  // Warp: a directional armored prow below, exposed drive at the upper/back
  // side where the existing collision rules accept the player's strike.
  {
    const root=group(null,'boss-warp-armored-drive'),drive=group(root,'rear-drive',true),clamps=[];
    panel(root,[[-.55,.4],[-.77,-.18],[-.56,-.7],[0,-.92],[.56,-.7],[.77,-.18],[.55,.4]],0,.28,M.navy);
    panel(root,[[-.44,-.12],[-.56,-.53],[0,-.82],[.56,-.53],[.44,-.12],[0,-.34]],.19,.16,M.ceramic);
    panel(root,[[-.3,-.29],[0,-.47],[.3,-.29],[0,-.7]],.3,.07,purple);
    for(const side of[-1,1]){
      const g=group(root,'side-armor-'+side,true);g.position.x=side*.5;clamps.push(g);
      panel(g,[[-.14,-.38],[.14,-.38],[.19,.34],[0,.54],[-.18,.27]],.16,.19,shell);
      block(g,M.gold,0,-.05,.29,.04,.5,.03);
      for(let i=0;i<3;i++)block(g,M.dark,side*.1,-.24+i*.14,.28,.12,.045,.025);
      bolt(g,0,.28,.29);
    }
    drive.position.set(0,.43,.2);
    circle(drive,M.gold,.3,.02,.055);circle(drive,purple,.22,.06,.04);
    mesh(crystal,coreViolet,drive,0,0,.08,.19,.26,.2);
    for(const side of[-1,1])block(drive,coreViolet,side*.28,.16,.06,.035,.22,.04,side*-.3);
    bake(root);models.warp={root,update(t,c){drive.rotation.z=Math.sin(t*.8)*.09;drive.scale.setScalar(1+(c.warning?c.charge*.12:0));clamps.forEach((g,i)=>g.position.x=(i?1:-1)*(.5+(c.warning?c.charge*.045:0)));}};
  }
  // Ion weaver: separated bright/dark poles, transformer spine and six bent
  // conducting limbs. Its paired silhouette survives monochrome viewing.
  {
    const root=group(null,'boss-ion-bipolar-weaver'),poles=[],legs=[];
    panel(root,[[-.22,.5],[.22,.5],[.34,.06],[.18,-.55],[-.18,-.55],[-.34,.06]],0,.22,M.navy);
    panel(root,[[-.11,.38],[.11,.38],[.16,-.22],[0,-.46],[-.16,-.22]],.16,.08,M.ceramic);
    for(const side of[-1,1]){
      const p=group(root,side<0?'bright-pole':'dark-pole',true);p.position.set(side*.38,.23,.13);poles.push(p);
      mesh(disc,side<0?shell:purple,p,0,0,0,.26,.3,.16);circle(p,M.gold,.23,.12,.035);
      mesh(crystal,side<0?coreMint:coreViolet,p,0,0,.16,.15,.2,.13);
      for(let j=0;j<3;j++){
        const leg=group(root,'conductor-'+side+'-'+j,true);leg.position.set(side*.16,.28-j*.26,0);legs.push({g:leg,side,j});
        const shape=[[0,-.065],[side*.37,-.05],[side*(.66-j*.06),.14-j*.09],[side*(.72-j*.06),.09-j*.09],[side*.39,-.15],[0,-.14]];
        panel(leg,shape,.08,.08,j%2?purple:shell);
        bolt(leg,side*.36,-.09,.14);
        mesh(crystal,side<0?coreMint:coreViolet,leg,side*(.69-j*.06),.12-j*.09,.13,.04,.075,.04);
      }
    }
    for(let i=0;i<4;i++)block(root,M.gold,0,.16-i*.13,.24,.17,.035,.025);
    bake(root);models.ion={root,update(t,c){poles.forEach((p,i)=>{p.rotation.z=(i?1:-1)*(t*.14+(c.warning?c.charge*.5:0));p.position.z=.13+(c.warning?.08*c.charge:0);});legs.forEach(({g,side,j})=>g.rotation.z=side*(Math.sin(t*1.3+j)*.035+(c.warning?c.charge*.12:0)));}};
  }
  for(const model of Object.values(models))model.root.visible=false;
  return models;
}
