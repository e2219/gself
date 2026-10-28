import {createNaiguaWorld} from './naigua-world.js';
/* Optional image-cutout theme. Actor art is 2.5D, with unchanged collision geometry. */
export function createNaiguaTheme(T,scene,camera){
 const world=createNaiguaWorld(T,scene,camera);
 const loader=new T.TextureLoader(),textures=[],materials=[];let loaded=0,failed=0;
 const load=name=>{const t=loader.load('audio/naigua/'+name,()=>loaded++,undefined,()=>failed++);t.colorSpace=T.SRGBColorSpace;textures.push(t);return t};
 const atlas=load('characters.png');
 function frame(bounds){const t=atlas.clone();t.source=atlas.source;const [x,y,w,h]=bounds;t.repeat.set(w/2172,h/724);t.offset.set(x/2172,1-(y+h)/724);textures.push(t);return t}
 const meteor=frame([177,265,392,392]),heart=frame([851,38,466,654]),laugh=frame([1535,16,556,692]);
 // Clones share the loaded source; mark them once decoding finishes.
 const sync=()=>{if(atlas.image)for(const t of [meteor,heart,laugh])if(!t.userData.ready){t.needsUpdate=true;t.userData.ready=true}};
 const material=(map,color=0xffffff)=>{const m=new T.SpriteMaterial({map,color,depthWrite:false,depthTest:true,toneMapped:false});materials.push(m);return m};
 const hero=new T.Sprite(material(heart));scene.add(hero);
 const background=new T.Sprite(material(null,0x5b647b));scene.add(background);
 // Rectangles are in source pixels; cover-fit happens inside them, excluding screenshot chrome.
 const art=[{name:'starry'},{name:'flower-vase',rect:[0,210,1080,1300]},{name:'court',margin:.055},{name:'creation',margin:.04},{name:'coronation',rect:[75,395,960,935]}];
 const paintings=art.map(a=>load(a.name+'.jpg'));let backgroundName='starry';
 const geometry=new T.PlaneGeometry(1,1),rockMaterial=new T.MeshBasicMaterial({map:meteor,transparent:true,alphaTest:.12,depthWrite:true,toneMapped:false,side:T.DoubleSide});materials.push(rockMaterial);
 const rocks=new T.InstancedMesh(geometry,rockMaterial,256);rocks.frustumCulled=false;rocks.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(rocks);const dummy=new T.Object3D();let overflow=0;
 function begin(s,place){world.reset();sync();rocks.count=0;overflow=0;
  const index=s.activeWorld==='aurora'?1:s.activeWorld==='warp'?3:s.activeWorld==='station'?2:s.activeWorld==='ion'?4:0;
  const tex=paintings[index],spec=art[index];background.material.map=tex;backgroundName=spec.name;
  if(tex.image){const iw=tex.image.width,ih=tex.image.height,m=spec.margin||0;const [x,y,w,h]=spec.rect||[iw*m,ih*m,iw*(1-2*m),ih*(1-2*m)];const target=s.W/s.H,a=w/h;const cw=w*Math.min(1,target/a),ch=h*Math.min(1,a/target);tex.repeat.set(cw/iw,ch/ih);tex.offset.set((x+(w-cw)/2)/iw,1-(y+(h+ch)/2)/ih)}
  place(background,s.W/2,s.H/2,-650);background.scale.set(s.W,s.H,1);
  const dark=s.moonPhase==='dark',boost=s.boostTime>0;hero.material.map=boost?laugh:heart;hero.material.color.set(dark?0xb5bcff:0xffffff);hero.material.rotation=Math.max(-.12,Math.min(.12,s.flight?.bank||0));
  const h=dark?31:44;hero.scale.set(h*(boost?556/692:466/654),h,1);place(hero,s.ship.x,s.ship.y,13);
 }
 function rock(o,place){if(rocks.count>=256){overflow++;return}place(dummy,o.x,o.y,8);dummy.quaternion.copy(camera.quaternion);dummy.scale.set(o.r*2,o.r*2,1);dummy.updateMatrix();rocks.setMatrixAt(rocks.count++,dummy.matrix)}
 function finish(){rocks.instanceMatrix.needsUpdate=true;world.finish()}
 return {begin,rock,finish,drawWorld:(s,place,line,ring,t)=>world.render(s,place,line,ring,t,rock),drawArt:world.draw,diagnostics:()=>({theme:'naigua',loaded,failed,background:backgroundName,meteorCount:rocks.count,overflow,world:world.diagnostics()}),dispose(){world.dispose();scene.remove(hero,background,rocks);rocks.dispose();geometry.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose()}};
}
