import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Each silhouette is authored in the simulation's existing footprint. Materials
// are shared and static parts merge by material, keeping detail off draw budgets.
export function createLunarModelKit(T,{geom,mesh,plate,box,sphere,torus,M}){
  function bake(root){
    root.updateMatrixWorld(true);const batches=new Map();
    root.traverse(o=>{if(!o.isMesh)return;const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);const a=batches.get(o.material)||[];a.push(g);batches.set(o.material,a);});
    root.clear();for(const [m,parts]of batches){const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(g){const o=mesh(geom(g),m,root);o.castShadow=true;}}
    return root;
  }
  const disc=geom(new T.CylinderGeometry(1,1,1,32).rotateX(Math.PI/2));
  const crescentShape=new T.Shape();
  crescentShape.moveTo(.32,.94);crescentShape.bezierCurveTo(-1.12,.87,-1.12,-.87,.32,-.94);crescentShape.bezierCurveTo(-.52,-.52,-.52,.52,.32,.94);
  const crescent=geom(new T.ExtrudeGeometry(crescentShape,{depth:.23,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1}));crescent.translate(0,0,-.115);
  const lens=plate([[1,0],[.52,.64],[-.3,.8],[-.82,.38],[-.91,-.26],[-.26,-.73],[.52,-.53]],.35,.06);
  const starPoints=Array.from({length:10},(_,i)=>{const a=Math.PI/2+i*Math.PI/5,r=i%2?.43:1;return[Math.cos(a)*r,Math.sin(a)*r]});
  const star=plate(starPoints,.3,.035);
  const chest=plate([[-.5,-.34],[-.34,-.5],[.34,-.5],[.5,-.34],[.5,.34],[.34,.5],[-.34,.5],[-.5,.34]],.6,.07);
  const capsule=geom(new T.LatheGeometry([new T.Vector2(0,-1),new T.Vector2(.38,-.92),new T.Vector2(.67,-.55),new T.Vector2(.72,.4),new T.Vector2(.48,.83),new T.Vector2(0,1)],12));
  const shard=plate([[0,1],[.44,.28],[.3,-.62],[0,-1],[-.3,-.62],[-.44,.28]],.45,.04);
  const wing=plate([[1,0],[.1,.42],[-1,.64],[-.7,.04],[-1,-.64],[.1,-.42]],.28,.025);
  const whale=plate([[1,0],[.8,.46],[.25,.58],[-.5,.31],[-.86,.12],[-1,.43],[-.93,0],[-1,-.43],[-.86,-.12],[-.5,-.31],[.25,-.58],[.8,-.46]],.6,.09);
  const mine=plate([[0,1],[.22,.4],[.83,.7],[.46,.15],[1,-.3],[.3,-.28],[0,-1],[-.3,-.28],[-1,-.3],[-.46,.15],[-.83,.7],[-.22,.4]],.55,.04);
  const ships={};
  for(const id of ['collector','falcon','warden'])for(const phase of ['bright','dark']){
    const root=new T.Group();root.name=`lunar-${id}-${phase}`;
    // Full-moon vessel has a filled shield-like disc. Crescent vessel has a
    // physically empty inner bay: the phase remains readable in silhouette.
    mesh(phase==='dark'?crescent:disc,phase==='dark'?M.navy:M.ceramic,root,-1,0,0,phase==='dark'?18:14.5,16,phase==='dark'?19:5);
    if(phase==='bright'){
      mesh(torus,M.gold,root,-1,0,3,12.5,12.5,9);
      mesh(disc,M.navy,root,-1,0,3.6,9.6,9.6,1.2);
      // Raised lunar mare plates and asymmetric engraving bars.
      for(let i=0;i<5;i++){const a=i*1.22;mesh(box,M.gold,root,-1+Math.cos(a)*11.5,Math.sin(a)*11.5,4,2.8,.8,.6).rotation.z=a;}
    }else{
      // A broad lavender-silver lip survives the compact mobile scale; the
      // open crescent bay remains actual empty geometry, not a dark decal.
      mesh(crescent,M.violet,root,-1,0,3.2,16.2,14.7,3);
      mesh(crescent,M.navy,root,-1.6,0,3.9,11.6,10.6,2);
    }
    const nose=id==='falcon'?26:id==='warden'?18:20;
    mesh(plate([[nose,0],[7,3.4],[1,2.3],[1,-2.3],[7,-3.4]],3,.5),M.ceramic,root,0,0,1.5);
    mesh(lens,M.glass,root,phase==='dark'?-7:0,0,5,7,4,5);
    for(const side of [-1,1]){
      const y=side*(id==='warden'?14:id==='falcon'?12:10);
      const points=id==='falcon'?[[17,0],[-19,6],[-12,0],[-19,-4]]:id==='warden'?[[8,-4],[8,4],[-18,5],[-22,0],[-18,-5]]:[[5,-3],[7,0],[5,3],[-16,3],[-20,0],[-16,-3]];
      mesh(plate(points,3,.45),M.navy,root,-1,y,0);
      mesh(box,M.gold,root,-7,y,3,15,1,1);
      mesh(chest,M.dark,root,-19,y,0,5,5,6);
      mesh(disc,M.mint,root,-21,y,1,1.5,2,1);
      for(let k=0;k<3;k++)mesh(box,M.ceramic,root,-11+k*3,y,3.5,1,3,.65);
      if(id==='warden')mesh(plate([[-14,-2],[6,-2],[9,0],[6,2],[-14,2]],3,.4),M.ceramic,root,0,side*17,0);
      if(id==='collector')mesh(torus,M.gold,root,9,side*8,3,3,3,3);
    }
    mesh(star,M.signal,root,nose-4,0,4,2.2,2.2,2);
    root.userData.modelId=root.name;root.userData.moonPhase=phase;ships[id+'-'+phase]=bake(root);
  }
  return {ships,disc,crescent,lens,star,chest,capsule,shard,wing,whale,mine};
}
