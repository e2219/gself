/* Lunar navigation miniature. All positions originate in the unchanged simulation.
 * Authored meshes are lit solids, never canvas screenshots / billboard game sprites. */
export function createFlightRenderer(T, canvas) {
  const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene();scene.background=new T.Color(0x091321);
  const camera=new T.OrthographicCamera(-480,480,255,-255,1,4000);
  const tilt=.32, co=Math.cos(tilt), si=Math.sin(tilt);
  camera.position.set(0,-si*1600,co*1600);camera.up.set(0,1,0);camera.lookAt(0,0,0);
  scene.add(new T.HemisphereLight(0xcce8ff,0x28303e,2.05));
  const key=new T.DirectionalLight(0xffe7bd,3.1);key.position.set(-220,260,500);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-550,right:550,top:500,bottom:-500,near:1,far:1200});key.shadow.bias=-.0008;scene.add(key);
  const rim=new T.DirectionalLight(0x75b5df,1.8);rim.position.set(260,-150,180);scene.add(rim);
  const materials=[];const geometries=new Set();
  const mat=(color,roughness=.55,metalness=.25,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness,metalness,...extra});materials.push(m);return m;};
  const M={ceramic:mat(0xebe9df,.3,.15),navy:mat(0x263e52,.48,.5),gold:mat(0xd5aa62,.34,.72),glass:mat(0x184b64,.14,.65),rock:mat(0x86766f,.94,.05,{flatShading:true}),dark:mat(0x101923,.9,.1),danger:mat(0x9b384c,.5,.35),mint:mat(0x9ce4c4,.25,.25,{emissive:0x44745c,emissiveIntensity:.6}),signal:mat(0xf2cf87,.3,.45,{emissive:0x947047,emissiveIntensity:.4}),violet:mat(0x9186bb,.4,.45)};
  // A compact studio reflection environment supplies actual ceramic/metal reflections.
  const studio=new T.Scene();studio.background=new T.Color(0x61788a);
  const lightCard=new T.Mesh(new T.PlaneGeometry(12,8),new T.MeshBasicMaterial({color:0xfff0d4}));lightCard.position.set(-5,6,8);lightCard.lookAt(0,0,0);studio.add(lightCard);
  const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromScene(studio,.025);scene.environment=env.texture;scene.environmentIntensity=.45;pmrem.dispose();lightCard.geometry.dispose();lightCard.material.dispose();
  function geom(g){geometries.add(g);return g;}
  const box=geom(new T.BoxGeometry(1,1,1)), sphere=geom(new T.SphereGeometry(1,16,10)), crystal=geom(new T.OctahedronGeometry(1)), torus=geom(new T.TorusGeometry(1,.065,5,32));
  function plate(points,depth=3,bevel=.6){const sh=new T.Shape();points.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();const g=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:bevel,bevelThickness:bevel});g.translate(0,0,-depth/2);return geom(g);}
  function mesh(g,m,parent,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;}
  // Rock vertices share a deterministic deformation so faceting follows surface fractures.
  const rock=geom(new T.IcosahedronGeometry(1,1));const rp=rock.attributes.position;
  for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),n=1+.13*Math.sin(x*8+y*5+z*9)+.06*Math.cos(y*13-x*7);rp.setXYZ(i,x*n,y*n,z*n*.65);}rock.computeVertexNormals();
  const hulls={collector:[[22,0],[10,10],[1,12],[-12,11],[-21,5],[-21,-5],[-12,-11],[1,-12],[10,-10]],falcon:[[27,0],[-20,16],[-12,4],[-17,0],[-12,-4],[-20,-16]],warden:[[21,0],[12,14],[-11,17],[-22,8],[-22,-8],[-11,-17],[12,-14]]};
  const ships={};
  for(const [id,outline] of Object.entries(hulls)){
    const root=new T.Group();root.name='lunar-'+id;
    mesh(plate(outline,5,1.1),M.ceramic,root).castShadow=true;
    mesh(plate([[14,0],[3,5],[-11,5],[-16,0],[-11,-5],[3,-5]],2,.7),M.navy,root,0,0,4);
    mesh(sphere,M.glass,root,3,0,6,9,4.6,3.8).castShadow=true;
    for(const side of [-1,1]){
      const y=side*(id==='warden'?13:id==='falcon'?10:8);
      mesh(box,M.gold,root,-6,y,3,14,1.4,1.4);
      mesh(plate([[-10,-3],[3,-3],[7,0],[3,3],[-10,3]],4,.5),M.ceramic,root,-12,y,1);
      mesh(plate([[6,0],[-2,2.3],[-7,1.7],[-8,-1.7],[-2,-2.3]],1,.3),M.navy,root,0,y,4.5);
      mesh(box,M.signal,root,3,y,5.5,4,.7,.8);
      mesh(box,M.dark,root,-21,y,0,3,5,5);
      mesh(box,M.mint,root,-23,y,0,1,3,3);
      for(let k=0;k<3;k++)mesh(box,M.gold,root,-12+k*3,y,3,1,4,1);
    }
    mesh(box,M.gold,root,16,0,3,5,1,1);mesh(box,M.signal,root,20,0,2,2,2,2);
    root.visible=false;scene.add(root);ships[id]=root;
  }
  const bossRoot=new T.Group();scene.add(bossRoot);
  mesh(rock,M.navy,bossRoot,0,0,0,1,1,.65).castShadow=true;
  const bossArms=[];for(let i=0;i<8;i++){const arm=new T.Group();arm.rotation.z=i*Math.PI/4;mesh(plate([[.38,-.09],[.85,-.16],[1,0],[.85,.16],[.38,.09]],.1,.015),M.ceramic,arm);mesh(box,M.gold,arm,.72,0,.08,.3,.045,.04);bossRoot.add(arm);bossArms.push(arm);}
  mesh(torus,M.gold,bossRoot,0,0,.18,.49,.49,.49);mesh(crystal,M.signal,bossRoot,0,0,.22,.25,.25,.22);
  const shield=mesh(sphere,new T.MeshBasicMaterial({color:0x9de8d4,transparent:true,opacity:.12,wireframe:true}),scene);materials.push(shield.material);
  // Dynamic batches keep repeated collectible and obstacle parts to one call each.
  const pools={};const dummy=new T.Object3D(),color=new T.Color();let droppedInstances=0;
  function pool(name,g,m,capacity=256){const p=new T.InstancedMesh(g,m,capacity);p.instanceMatrix.setUsage(T.DynamicDrawUsage);p.frustumCulled=false;p.count=0;scene.add(p);p.userData.capacity=capacity;pools[name]=p;return p;}
  pool('rocks',rock,M.rock);pool('crystals',crystal,M.signal);pool('shards',crystal,M.mint);pool('brackets',torus,M.gold);pool('boxes',box,M.navy);pool('trim',box,M.gold);pool('capsules',sphere,M.ceramic);pool('glass',sphere,M.glass);pool('danger',crystal,M.danger);pool('chips',box,M.ceramic);pool('signals',sphere,M.mint);pool('violet',crystal,M.violet);pool('lines',box,mat(0xffffff,1,0,{emissive:0xffffff,emissiveIntensity:.25}),4096);pool('particles',crystal,M.mint,512);
  const flame=geom(new T.ConeGeometry(1,1,8));flame.rotateZ(Math.PI/2);pool('flames',flame,M.mint,12);
  const hazardShapes={trident:plate([[1,0],[-.8,.8],[-.4,.2],[-.9,0],[-.4,-.2],[-.8,-.8]],.3,.04),boomerang:plate([[1,0],[-.65,.75],[-.25,0],[-.65,-.75]],.25,.035),probe:plate([[1,0],[0,1],[-1,0],[0,-1]],.3,.06)};
  for(const [id,g]of Object.entries(hazardShapes))pool(id,g,M.danger);
  for(const name of ['rocks','trident','boomerang','probe','boxes','capsules'])pools[name].castShadow=true;
  // Lasers are independent from ordinary navigation lines. Every layer is
  // clipped in screen space to the original segment endpoints, including halo
  // and emitter geometry, so a safe opening is never filled by a rounded cap.
  const beamViewport={value:new T.Vector2(1,1)},beamBufferSize=new T.Vector2();
  const beamCylinder=geom(new T.CylinderGeometry(1,1,1,10,1));beamCylinder.rotateZ(Math.PI/2);
  function beamPool(name,base,options,capacity){
    const g=geom(base.clone());g.setAttribute('beamBounds',new T.InstancedBufferAttribute(new Float32Array(capacity*4),4));g.setAttribute('beamFade',new T.InstancedBufferAttribute(new Float32Array(capacity),1));
    const lit=name==='beamEmitters'||name==='beamSockets',Material=lit?T.MeshStandardMaterial:T.MeshBasicMaterial;
    const m=new Material({color:0xffffff,transparent:true,depthWrite:false,...(lit?{roughness:.48,metalness:.55}:{}),...options});materials.push(m);
    m.onBeforeCompile=shader=>{
      shader.uniforms.beamViewport=beamViewport;
      shader.vertexShader='attribute vec4 beamBounds; attribute float beamFade; varying vec4 vBeamBounds; varying float vBeamFade;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBeamBounds=beamBounds;vBeamFade=beamFade;');
      shader.fragmentShader='uniform vec2 beamViewport; varying vec4 vBeamBounds; varying float vBeamFade;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
        vec2 beamP=gl_FragCoord.xy/beamViewport;
        vec2 beamAxis=(vBeamBounds.zw-vBeamBounds.xy)*beamViewport;
        float beamAlong=dot((beamP-vBeamBounds.xy)*beamViewport,beamAxis);
        if(beamAlong<0.0 || beamAlong>dot(beamAxis,beamAxis))discard;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=vBeamFade;\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey=()=> 'moon-laser-clipped-v1';
    return pool(name,g,m,capacity);
  }
  beamPool('beamHalo',beamCylinder,{opacity:.10,blending:T.AdditiveBlending},128);
  beamPool('beamSleeve',beamCylinder,{opacity:.48,blending:T.AdditiveBlending},128);
  beamPool('beamCore',beamCylinder,{opacity:.95},128);
  beamPool('beamCharge',beamCylinder,{opacity:.7,blending:T.AdditiveBlending},1024);
  beamPool('beamPulse',beamCylinder,{opacity:.36,blending:T.AdditiveBlending},256);
  beamPool('beamEmitters',box,{opacity:1},256);
  beamPool('beamSockets',beamCylinder,{opacity:1},256);

  let W=960,H=510,frames=0,lastTime=0;
  function place(obj,x,y,z=0){obj.position.set(x-W/2,(H/2-y-si*z)/co,z);}
  function put(name,x,y,z,sx,sy=sx,sz=sx,angle=0,tint=null,rx=0){const p=pools[name];if(!p||p.count>=p.userData.capacity){droppedInstances++;return;}place(dummy,x,y,z);dummy.rotation.set(rx,0,-angle);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();p.setMatrixAt(p.count,dummy.matrix);if(tint)p.setColorAt(p.count,color.set(typeof tint==='string'&&/^#[0-9a-f]{8}$/i.test(tint)?tint.slice(0,7):tint));else if(p.instanceColor)p.setColorAt(p.count,color.set(0xffffff));p.count++;}
  function line(x1,y1,x2,y2,c=0xe4be77,width=1.5,dashed=false,z=2){const len=Math.hypot(x2-x1,y2-y1);if(!Number.isFinite(len)||len<.01)return;const count=dashed?Math.ceil(len/14):1;for(let i=0;i<count;i++){const a=i/count,b=dashed?Math.min(1,(i+.55)/count):1;const ax=x1+(x2-x1)*a,ay=y1+(y2-y1)*a,bx=x1+(x2-x1)*b,by=y1+(y2-y1)*b;const vy=-(by-ay)/co,vx=bx-ax;put('lines',(ax+bx)/2,(ay+by)/2,z,Math.hypot(vx,vy),width,1.2,-Math.atan2(vy,vx),c);}}
  function ring(x,y,r,c=0xb9d7c6,width=1.5,start=0,end=Math.PI*2,dashed=false,z=2){const steps=Math.max(12,Math.ceil(Math.abs(end-start)*r/9));for(let i=0;i<steps;i++){if(dashed&&i%2)continue;const a=start+(end-start)*i/steps,b=start+(end-start)*(i+1)/steps;line(x+Math.cos(a)*r,y+Math.sin(a)*r,x+Math.cos(b)*r,y+Math.sin(b)*r,c,width,false,z);}}
  function drawLaser(v,time,reduced){
    const {x1,y1,x2,y2}=v,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);
    if(![x1,y1,x2,y2,len].every(Number.isFinite)||len<.5)return;
    const ux=dx/len,uy=dy/len,worldLen=Math.hypot(dx,dy/co),angle=Math.atan2(dy/co,dx);
    const active=v.phase==='active',progress=Math.max(0,Math.min(1,Number(v.progress)||0));
    const remaining=Number.isFinite(v.remaining)?v.remaining:1;
    const fade=active?Math.max(0,Math.min(1,remaining/.15)):1;
    const tint=v.color|| (active?'#ff997e':'#efc887');
    const bounds=[x1/W,1-y1/H,x2/W,1-y2/H];
    function part(name,from,to,radius,z=5,c=tint,alpha=fade){
      const batch=pools[name],index=batch.count;if(index>=batch.userData.capacity){droppedInstances++;return;}
      const mid=(from+to)/2;put(name,x1+ux*mid,y1+uy*mid,z,Math.max(.05,(to-from)*worldLen/len),radius,radius,angle,c);
      batch.geometry.attributes.beamBounds.setXYZW(index,...bounds);batch.geometry.attributes.beamFade.setX(index,alpha);
    }
    // Inset technical heads cannot protrude longitudinally into a gap. Their
    // collar/lens layers give depth without changing the collision centerline.
    if(len>18)for(const end of[0,1]){
      const a=end?len-13:3,b=end?len-3:13;
      part('beamEmitters',a,b,10,2,'#243e4d',Math.max(.28,fade));
      part('beamSockets',a+2,b-2,3.5,5,'#8b7960',Math.max(.28,fade));
      part('beamPulse',end?a:a+5,end?b-5:b,2.5,6,tint,active?fade:.3+progress*.65);
    }
    if(!active){
      const spacing=18,count=Math.ceil(len/spacing),charge=.25+progress*.65;
      for(let i=0;i<count;i++){
        const a=i*spacing,b=Math.min(len,a+5+progress*3);
        part('beamCharge',a,b,.65+progress*.35,4,tint,charge);
      }
      // Short packets converge on the center as the locked line charges.
      if(!reduced)for(let i=0;i<2;i++){
        const phase=(time*.8+i*.5)%1;
        for(const side of[0,1]){const u=side?1-phase*.5:phase*.5,a=Math.max(0,u*len-3);part('beamPulse',a,Math.min(len,a+6),1.2+progress,5,tint,.3+progress*.45);}
      }
      return;
    }
    const ignition=1+.35*Math.exp(-progress*28),pulse=reduced?1:1+.04*Math.sin(time*19);
    part('beamHalo',0,len,8*ignition,4,tint,fade);
    part('beamSleeve',0,len,3.6*pulse,4,tint,fade);
    part('beamCore',0,len,.85*pulse,4,'#fff3d5',fade);
    if(!reduced){
      // Two contained packets leave the ends and travel along the same segment.
      for(let i=0;i<2;i++){
        const u=(time*1.4+i*.5)%1,a=Math.max(0,u*len-9),b=Math.min(len,a+18);
        part('beamPulse',a,b,4.2,4,tint,fade*.3);
      }
    }
  }
  function crate(x,y,t,scale=1){put('boxes',x,y,5,22*scale,20*scale,12*scale,t*.05);put('trim',x,y,12,17*scale,2*scale,2*scale,t*.05);put('trim',x,y,12,2*scale,18*scale,2*scale,t*.05);put('signals',x-5*scale,y-4*scale,13,2*scale);}
  function pod(x,y,t,scale=1){put('capsules',x,y,7,10*scale,17*scale,8*scale,Math.sin(t)*.05);put('glass',x,y-2*scale,13,7*scale,9*scale,3*scale);put('trim',x,y+10*scale,10,14*scale,2*scale,2*scale);}
  function beacon(x,y,t,active=true,shade=0xb9e4cc){ring(x,y,25,active?shade:0x586575,active?2.2:1);for(const side of[-1,1]){put('boxes',x+side*26,y,6,5,20,8);put('signals',x+side*26,y,12,2,12,2,0,shade);}if(active)put('crystals',x,y-33+Math.sin(t*3)*2,5,3,5,2);}
  function port(x,y,t){ring(x,y,28,0xdab77a,2);for(let i=0;i<6;i++){const a=i*Math.PI/3;put('boxes',x+Math.cos(a)*32,y+Math.sin(a)*32,4,11,8,7,a);put('trim',x+Math.cos(a)*32,y+Math.sin(a)*32,9,7,2,2,a);}put('glass',x,y,-1,23,23,2);ring(x,y,17,0xa9d9c9,1);}
  // Orbital ruins form a distant spatial layer, never collidable foreground clutter.
  const world=new T.Group();scene.add(world);
  const skyMaterial=new T.ShaderMaterial({depthWrite:false,vertexShader:'varying vec2 vUV; void main(){vUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUV; void main(){float haze=exp(-distance(vUV,vec2(.7,.57))*5.0);vec3 c=mix(vec3(.025,.045,.073),vec3(.115,.165,.205),haze);gl_FragColor=vec4(c,1.0);}'});materials.push(skyMaterial);
  mesh(geom(new T.PlaneGeometry(3000,2200)),skyMaterial,world,0,0,-900);
  const aurora=new T.Group();world.add(aurora);const auroraStrips=[];
  for(let k=0;k<3;k++){const g=geom(new T.PlaneGeometry(1500,32,48,1));const m=mat([0x4fa58c,0x587f9f,0x81769d][k],1,0,{emissive:[0x245340,0x233f58,0x3f3456][k],emissiveIntensity:.6,transparent:true,opacity:.24,side:T.DoubleSide,depthWrite:false});const ribbon=mesh(g,m,aurora,0,k*130-100,-240-k*40);auroraStrips.push(ribbon);}
  const warpArch=mesh(geom(new T.TorusGeometry(210,8,5,52,Math.PI*1.7)),M.navy,world,0,0,-210);warpArch.rotation.set(.6,.25,-.5);
  
  // Craters deform one continuous indexed sphere: their rims have thickness,
  // bowls receive real light, and no decorative rings float above the surface.
  const moonGeo=geom(new T.SphereGeometry(1,80,56));
  const craterSeeds=Array.from({length:19},(_,i)=>{
    const a=i*2.399963,r=.16+.65*Math.sqrt((i+.4)/19);
    const x=Math.cos(a)*r,y=Math.sin(a)*r;
    return {n:new T.Vector3(x,y,Math.sqrt(Math.max(.1,1-x*x-y*y))).normalize(),r:.055+(i%5)*.025,depth:.012+(i%4)*.005};
  });
  const mp=moonGeo.attributes.position,mc=new Float32Array(mp.count*3),normal=new T.Vector3();
  for(let i=0;i<mp.count;i++){
    normal.fromBufferAttribute(mp,i).normalize();const {x,y,z}=normal;
    const mare=Math.sin(x*7+y*3+z*4)*Math.cos(y*9-z*5),grain=Math.sin(x*61+y*37)*Math.cos(z*47-x*23);
    let h=1+.003*grain+.006*mare,shade=.72+.09*mare+.025*grain;
    for(const c of craterSeeds){const u=Math.acos(Math.min(1,normal.dot(c.n)))/c.r;if(u<1.7){
      const bowl=Math.exp(-u*u*3.2),rim=Math.exp(-Math.pow(u-.92,2)*55);
      h+=c.depth*(rim*.55-bowl);shade+=rim*.065-bowl*.08;
    }}
    mp.setXYZ(i,x*h,y*h,z*h);mc.set([shade*.93,shade*.98,shade],i*3);
  }
  moonGeo.setAttribute('color',new T.BufferAttribute(mc,3));moonGeo.computeVertexNormals();
  const moon=mesh(moonGeo,mat(0x7f8e96,.98,0,{vertexColors:true}),world);moon.scale.setScalar(70);
  // Three broken observatory fragments occupy the edges, leaving the playable
  // center empty. Layered load-bearing plates replace the dominant empty hoop.
  const ruinMat=mat(0x223340,.85,.25),ruinPanelMat=mat(0x394a52,.72,.4),ruinTrimMat=mat(0x76654b,.6,.5);
  const panelGeo=plate([[-17,-13],[11,-13],[18,-6],[18,8],[11,13],[-17,13],[-21,7],[-21,-6]],4,.9);
  const edgePanels=new T.InstancedMesh(panelGeo,ruinPanelMat,24),edgeFrame=new T.InstancedMesh(box,ruinMat,72),edgeTrim=new T.InstancedMesh(box,ruinTrimMat,48);
  for(const object of[edgePanels,edgeFrame,edgeTrim]){object.frustumCulled=false;world.add(object);}
  let frameW=0,frameH=0;
  function layoutRuins(){
    if(frameW===W&&frameH===H)return;frameW=W;frameH=H;
    const anchors=[{x:-W*.48,y:H*.21,a:-.48,z:-170,n:7},{x:W*.49,y:-H*.31,a:.7,z:-220,n:6},{x:-W*.35,y:-H*.49,a:.15,z:-130,n:5}];
    let pi=0,fi=0,ti=0;
    const set=(batch,index,x,y,z,sx,sy,sz,a)=>{dummy.position.set(x,y,z);dummy.rotation.set(.1,.13,a);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);};
    for(const q of anchors){
      const local=(x,y)=>({x:q.x+Math.cos(q.a)*x-Math.sin(q.a)*y,y:q.y+Math.sin(q.a)*x+Math.cos(q.a)*y});
      for(let i=0;i<q.n;i++){
        const along=(i-(q.n-1)/2)*32,p=local(0,along),a=q.a+(i===q.n-1?.16:0);
        set(edgePanels,pi++,p.x,p.y,q.z,1,.83,1,a);
        const slot=local(-3,along);set(edgeFrame,fi++,slot.x,slot.y,q.z+4,25,14,2,a);
        for(const side of[-1,1]){const rail=local(side*24,along);set(edgeFrame,fi++,rail.x,rail.y,q.z-3,4,36,8,q.a);}
        const trim=local(0,along-9);set(edgeTrim,ti++,trim.x,trim.y,q.z+6,24,1.2,1,q.a);
        const tab=local(13,along+7);set(edgeTrim,ti++,tab.x,tab.y,q.z+5,3,4,1,q.a);
      }
    }
    edgePanels.count=pi;edgeFrame.count=fi;edgeTrim.count=ti;
    for(const batch of[edgePanels,edgeFrame,edgeTrim])batch.instanceMatrix.needsUpdate=true;
  }
  const distant=new T.InstancedMesh(rock,ruinMat,20);distant.frustumCulled=false;world.add(distant);
  const starGeo=geom(new T.BufferGeometry());const positions=new Float32Array(210*3);for(let i=0;i<210;i++){positions[i*3]=(Math.sin(i*127.1)*.5+.5)*1900-950;positions[i*3+1]=(Math.sin(i*311.7)*.5+.5)*1600-800;positions[i*3+2]=-300-Math.abs(Math.sin(i*59.3))*300;}starGeo.setAttribute('position',new T.BufferAttribute(positions,3));const starMat=new T.PointsMaterial({color:0xb4c5d0,size:1.5,sizeAttenuation:false});materials.push(starMat);world.add(new T.Points(starGeo,starMat));
  const ground=mesh(geom(new T.PlaneGeometry(2500,2000)),new T.ShadowMaterial({opacity:.16}),scene,0,0,-7);ground.receiveShadow=true;materials.push(ground.material);
  function render(s,t=0){W=s.W||W;H=s.H||H;const time=Number.isFinite(t)?t:0;lastTime=time;frames++;droppedInstances=0;
    camera.left=-W/2;camera.right=W/2;camera.top=H/2;camera.bottom=-H/2;camera.updateProjectionMatrix();
    for(const p of Object.values(pools))p.count=0;
    const reduced=s.reducedMotion||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const tm=reduced?0:time;
    moon.position.set(W*.38,H*.39,-245);moon.rotation.y=tm*.004;moon.scale.setScalar(Math.min(76,Math.min(W,H)*.15));world.rotation.z=Math.sin(tm*.018)*.006;layoutRuins();
    aurora.visible=s.activeWorld==='aurora';warpArch.visible=s.activeWorld==='warp';warpArch.rotation.z=-.5+tm*.015;
    if(aurora.visible)auroraStrips.forEach((r,k)=>{const pos=r.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),edge=i<49?1:-1;pos.setY(i,edge*16+Math.sin(x*.006+tm*.13+k)*28+Math.cos(x*.012-tm*.1)*9);}pos.needsUpdate=true;r.geometry.computeVertexNormals();});
    for(let i=0;i<20;i++){const side=i%2?1:-1;dummy.position.set(side*(W*.43+Math.sin(i*43.17)*W*.12),((i*83+tm*2)%(H+260))-H/2-130,-170-i%4*30);dummy.rotation.set(i+.04*tm,i*.6,tm*.01);dummy.scale.setScalar(3+(i%5)*1.2);dummy.updateMatrix();distant.setMatrixAt(i,dummy.matrix);}distant.instanceMatrix.needsUpdate=true;
    for(const root of Object.values(ships))root.visible=false;
    const sh=s.ship||{x:W/2,y:H*.7},f=s.flight||{};const hero=ships[s.activeShip]||ships.collector;hero.visible=true;place(hero,sh.x,sh.y,7);hero.rotation.set(f.bank||0,0,-(f.angle??-Math.PI/2));hero.scale.setScalar(1);
    if((f.throttle||0)>.03||s.boostTime>0){const a=f.angle??-Math.PI/2,thrust=s.boostTime>0?26:6+(f.throttle||0)*12;for(const side of[-1,1]){const dx=-24-thrust/2,dy=side*(s.activeShip==='warden'?13:s.activeShip==='falcon'?10:8);put('flames',sh.x+Math.cos(a)*dx-Math.sin(a)*dy,sh.y+Math.sin(a)*dx+Math.cos(a)*dy,4,thrust*(1+Math.sin(tm*24)*.07),2.4,2.4,a);}}
    shield.visible=(s.boostTime>0||s.resumeShield>0||s.invincible>0||s.whaleSafe);if(shield.visible){place(shield,sh.x,sh.y,6);shield.scale.set(27,27/co,18);shield.rotation.z=tm*.3;}
    for(const o of s.items||[]){if(o.dead)continue;if(o.rock){const type=o.trident?'trident':o.boomerang?'boomerang':o.probe?'probe':o.core?'violet':'rocks';put(type,o.x,o.y,3,o.r,o.r,o.r,o.trident?Math.atan2(o.dy||0,o.dx||1):o.a||0);if(o.splitter){line(o.x-o.r*.2,o.y-o.r*.7,o.x+o.r*.2,o.y+o.r*.7,0xffcc80,2,false,11);}if(o.core||o.probe)put('signals',o.x,o.y,11,o.r*.2);}else{put('crystals',o.x,o.y,7,o.r*.76,o.r*.9,o.r*.55,o.a||tm);put('brackets',o.x,o.y,3,o.r*.9,o.r*.9,o.r*.9);}}
    for(const p of s.shards||[])put('shards',p.x,p.y,9,5,7,4,tm*1.5);
    for(const p of s.particles||[])if(p.life>0)put('particles',p.x,p.y,10,Math.max(.5,Math.min(3,p.life*5)),undefined,undefined,tm,p.color);
    for(const p of f.trail||[])line(p.x,p.y,p.x2,p.y2,p.boost?0xa5e9cf:0x638695,p.boost?3:1.5,false,3);
    for(const p of s.skillWake||[])line(p.x,p.y,p.x2,p.y2,0x817ca9,4,false,-1);
    for(const p of s.reflections||[]){put('shards',p.x,p.y,8,p.r||5);line(p.x-p.dx*24,p.y-p.dy*24,p.x,p.y,0xb8f2d7,2);}
    for(const p of s.satellites||[]){put('capsules',p.x,p.y,6,6,5,4);put('signals',p.x,p.y,10,3);}
    for(const p of s.echoes||[]){put('violet',p.x,p.y,5,17,9,5,p.angle||0);ring(p.x,p.y,20,0x777ca2,1);}
    for(const p of s.rings||[])ring(p.x,p.y,p.radius*(1-p.life/.4),0x97cbb6,1.5);
    const b=s.boss;bossRoot.visible=!!b&&b.hp>0;if(bossRoot.visible){place(bossRoot,b.x,b.y,5);bossRoot.scale.setScalar(b.r);bossRoot.rotation.z=tm*.1;bossArms.forEach((a,i)=>{a.visible=s.activeWorld!=='classic'||i%2===0;a.rotation.z=i*Math.PI/4+Math.sin(tm*1.8)*.05;});for(let i=0;i<(b.maxHp||3);i++)ring(b.x,b.y,b.r+6,i<b.hp?0xe4bd77:0x4e5660,2,-Math.PI/2+i*2*Math.PI/(b.maxHp||3)+.1,-Math.PI/2+(i+1)*2*Math.PI/(b.maxHp||3)-.1);}
    const o=s.objective;
    if(o?.kind==='rings')o.points.forEach((p,i)=>{if(i>=o.index)beacon(p.x*W,p.y*H,tm,i===o.index);});
    if(o?.kind==='cargo'){port(o.station.x*W,o.station.y*H,tm);for(const p of o.crates||[])if(!p.taken)crate(p.x*W,p.y*H,tm);for(let i=0;i<o.load;i++)crate(sh.x+(i-(o.load-1)/2)*12,sh.y+26,tm,.33);}
    if(o?.kind==='escort'){pod(o.x,o.y,tm,.65);port(o.home.x*W,o.home.y*H,tm);if(o.following)line(o.x,o.y,sh.x,sh.y,0x9dcecd,1,true);}
    if(o?.kind==='sling'){const x=o.cx*W,y=o.cy*H,r=Math.min(W,H)*.32,c=Math.max(14,Math.min(23,Math.min(W,H)*.055));put('glass',x,y,1,c,c,c,0,0x050509);ring(x,y,r,0x535370,1,0,Math.PI*2,true);for(let i=0;i<4;i++)ring(x,y,c+8+i*5,i%2?0xc39c68:0x9e8ab9,2,tm*.3+i,tm*.3+i+Math.PI*1.5);}
    if(o?.kind==='whale'){const x=o.x*W,y=o.y*H,dir=o.mirror?-1:1;put('capsules',x,y,8,33,15,12,0,0x8cc5d7);put('glass',x+dir*18,y-3,17,2);put('trident',x-dir*34,y,7,16,18,5,dir===1?Math.PI:0,0x8fb4c3);for(let i=1;i<(o.trail||[]).length;i++)line(o.trail[i-1].x*W,o.trail[i-1].y*H,o.trail[i].x*W,o.trail[i].y*H,0x315765,8,false,-10);}
    if(o?.kind==='mining'){for(const p of o.ores||[])if(!p.dead){put('rocks',p.x,p.y,4,16);put('crystals',p.x,p.y,15,7);}for(const p of o.mines||[])if(!p.dead){put('danger',p.x,p.y,5,9);}}
    const envState=s.environment||{};for(const p of [...(envState.wrecks||[]),...(envState.shots||[]),...(envState.tow?[envState.tow]:[])]){put('boxes',p.x*W,p.y*H,5,23,19,10,tm*.25);put('trim',p.x*W,p.y*H,11,22,3,2,tm*.25+.8);}for(const p of envState.loot||[])if(!p.taken)put('crystals',p.x*W,p.y*H,8,8,11,7,tm);
    if(envState.tow)line(sh.x,sh.y,envState.tow.x*W,envState.tow.y*H,0x94c8bd,1.5);
    if(envState.gate){const g=envState.gate;for(const p of g.points){put('boxes',p.x*W,p.y*H,8,28,24,16);put('danger',p.x*W,p.y*H,19,5,8,4,0,g.open?0x88c8ab:0xdc7c77);}if(!g.claimed)crate(g.cache.x*W,g.cache.y*H,tm,1.2);}
    if(s.station){const q=s.station;port(W*.5,H*.52,tm);put('capsules',W*.5,H*.52,8,22,22,13);for(const side of[-1,1]){put('boxes',W*.5+side*48,H*.52,5,32,23,5);for(let i=-1;i<2;i++)put('trim',W*.5+side*48+i*9,H*.52,9,1,20,1);}for(const p of q.cells||[])if(!p.taken)put('shards',p.x*W,p.y*H,7,8,10,6,tm);if(q.rescue)pod(q.rescue.x*W,q.rescue.y*H,tm);for(let i=0;i<q.hp;i++)ring(W*.5,H*.52,37,0xa4d6bb,2,i*Math.PI/2+.1,(i+1)*Math.PI/2-.1);}
    if(s.meadow){for(const p of s.meadow.buds||[])if(!p.taken){put('shards',p.x*W,p.y*H,8,7,11,6,tm*.4);ring(p.x*W,p.y*H,17,0x78a695,1);}port(W*.5,H*.7,tm);for(let i=0;i<(s.meadow.garden||[]).length;i++){const x=W*(.1+i*.11),y=H*.2;for(let k=0;k<5;k++){const a=k*2.51,b=(k+1)*2.51;line(x+Math.cos(a)*15,y+Math.sin(a)*15,x+Math.cos(b)*15,y+Math.sin(b)*15,0xb4c6a7,1.5);}}}
    const j=s.researchTrip;if(j){if(j.choice===null&&j.chapter<2)for(const x of[.28,.72])beacon(W*x,H*.44,tm,true,x<.5?0x97cdb5:0xb5a1d4);for(const p of j.pods||[])if(!p.taken)pod(p.x*W,p.y*H,tm);if(j.carry)pod(sh.x,sh.y+30,tm,.4);if(j.chapter===2||j.choice===0&&j.chapter===0||j.choice===1&&j.chapter===1)port(W*.82,H*.43,tm);}
    if(s.activeWorld==='ion'&&s.worldEvent){const e=s.worldEvent;for(let i=e.index;i<e.points.length;i++){const p=e.points[i];beacon(p.x*W,p.y*H,tm,i===e.index,p.polarity==='dark'?0xb4a0d3:0x9adfc2);put(p.polarity==='dark'?'violet':'shards',p.x*W,p.y*H,5,9,9,5,tm*.2);}}
    for(const p of s.warpGates||[])beacon(p.x*W,p.y*H,tm,true,p.id==='risk'?0xe2a37e:0xa5d6bf);
    for(const [i,p] of(s.warpBeacons||[]).entries())if(i>=(s.worldEvent?.index||0))beacon(p.x*W,p.y*H,tm,i===(s.worldEvent?.index||0),0xbca9d4);
    for(const p of s.warpRocks||[])put('rocks',p.x*W,p.y*H,4,p.r);
    for(const p of s.supplyPoints||[])beacon(p.x,p.y,tm,p.active!==false,0xe0bd76);
    if(s.fork)for(const x of[.25,.75])beacon(W*x,H*.48,tm,true,x<.5?0xa7d5be:0xc1accf);
    const bounty=s.bounty;if(bounty&&['beacon','hunt'].includes(bounty.stage)&&(s.elapsed||0)<bounty.until){if(bounty.stage==='hunt'){put('trident',bounty.x,bounty.y,7,23,23,10,-Math.PI/2,0xe6bc75);put('glass',bounty.x,bounty.y,13,6);}else beacon(bounty.x,bounty.y,tm,true,0xe5bd74);}
    renderer.getDrawingBufferSize(beamBufferSize);beamViewport.value.copy(beamBufferSize);
    for(const v of s.visualBeams||[])drawLaser(v,time,reduced);
    for(const v of s.visualLines||[])line(v.x1,v.y1,v.x2,v.y2,v.color,v.width,v.dashed,v.z??2);
    for(const v of s.visualRings||[])ring(v.x,v.y,v.r,v.color,v.width,v.start??0,v.end??Math.PI*2,v.dashed,v.z??2);
    for(const v of s.warningVectors||[]){line(v.x,v.y,v.x+v.dx*Math.hypot(W,H),v.y+v.dy*Math.hypot(W,H),0xd1a572,1.2,true);put('danger',Math.max(6,Math.min(W-6,v.x)),Math.max(6,Math.min(H-6,v.y)),4,5);}
    for(const p of Object.values(pools)){p.instanceMatrix.needsUpdate=true;if(p.instanceColor)p.instanceColor.needsUpdate=true;if(p.geometry.attributes.beamBounds){p.geometry.attributes.beamBounds.needsUpdate=true;p.geometry.attributes.beamFade.needsUpdate=true;}}
    renderer.render(scene,camera);
  }
  function resize(w,h){renderer.setSize(Math.max(1,w),Math.max(1,h),false);}
  function setQuality({dpr,shadows}){if(renderer.getPixelRatio()!==dpr)renderer.setPixelRatio(dpr);renderer.shadowMap.enabled=!!shadows;}
  function diagnostics(){return {renderer:'threejs-flight',revision:T.REVISION,calls:renderer.info.render.calls,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,materials:materials.length,shadowLights:renderer.shadowMap.enabled?1:0,shadowMap:renderer.shadowMap.enabled?1024:0,dpr:renderer.getPixelRatio(),postPasses:0,frames,time:lastTime,droppedInstances,logicalWidth:W,logicalHeight:H};}
  function dispose(){scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});key.shadow.map?.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();env.dispose();renderer.dispose();}
  return {render,resize,setQuality,dispose,diagnostics};
}
