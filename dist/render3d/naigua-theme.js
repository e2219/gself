/* Optional image-cutout theme. Actor art is 2.5D, with unchanged collision geometry. */
export function createNaiguaTheme(T,scene,camera){
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
 const paintings=['starry','sunflowers','court','creation'].map(n=>load(n+'.jpg'));
 const geometry=new T.PlaneGeometry(1,1),rockMaterial=new T.MeshBasicMaterial({map:meteor,transparent:true,alphaTest:.12,depthWrite:true,toneMapped:false,side:T.DoubleSide});materials.push(rockMaterial);
 const rocks=new T.InstancedMesh(geometry,rockMaterial,256);rocks.frustumCulled=false;rocks.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(rocks);const dummy=new T.Object3D();let overflow=0;
 function begin(s,place){sync();rocks.count=0;overflow=0;
  const index=s.activeWorld==='aurora'?1:s.activeWorld==='warp'?3:s.activeWorld==='station'?2:s.activeRun==='adventure'?2:0;
  const tex=paintings[index];background.material.map=tex;
  if(tex.image){const a=tex.image.width/tex.image.height,target=s.W/s.H;const margin=index===2?.055:index===3?.04:0;const inner=1-margin*2;const rw=inner*Math.min(1,target/a),rh=inner*Math.min(1,a/target);tex.repeat.set(rw,rh);tex.offset.set((1-rw)/2,(1-rh)/2)}
  place(background,s.W/2,s.H/2,-650);background.scale.set(s.W,s.H,1);
  const dark=s.moonPhase==='dark',boost=s.boostTime>0;hero.material.map=boost?laugh:heart;hero.material.color.set(dark?0xb5bcff:0xffffff);hero.material.rotation=Math.max(-.12,Math.min(.12,s.flight?.bank||0));
  const h=dark?31:44;hero.scale.set(h*(boost?556/692:466/654),h,1);place(hero,s.ship.x,s.ship.y,13);
 }
 function rock(o,place){if(rocks.count>=256){overflow++;return}place(dummy,o.x,o.y,8);dummy.quaternion.copy(camera.quaternion);dummy.scale.set(o.r*2,o.r*2,1);dummy.updateMatrix();rocks.setMatrixAt(rocks.count++,dummy.matrix)}
 function finish(){rocks.instanceMatrix.needsUpdate=true}
 return {begin,rock,finish,diagnostics:()=>({theme:'naigua',loaded,failed,meteorCount:rocks.count,overflow}),dispose(){scene.remove(hero,background,rocks);rocks.dispose();geometry.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose()}};
}
