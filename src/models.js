import * as THREE from 'three';
export function mesh(geometry, color, x=0, y=0, z=0) {
  const object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .65 }));
  object.position.set(x,y,z); return object;
}
function label(text, width=.22) {
  const canvas=document.createElement('canvas'); canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#122b24';ctx.fillRect(0,0,512,128);ctx.fillStyle='white';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));sprite.scale.set(width,width/4,1);return sprite;
}
export function makeBin(type,x) {
  const bin=new THREE.Group();bin.position.set(x,0,-.14);bin.userData={kind:'bin',type};
  const color=type==='wet'?0x23a966:0x2785df;
  bin.add(mesh(new THREE.CylinderGeometry(.095,.075,.23,20,1,true),color,0,.135));
  bin.add(mesh(new THREE.CylinderGeometry(.075,.075,.015,20),color,0,.022));
  const rim=mesh(new THREE.TorusGeometry(.095,.009,8,24),color,0,.25);rim.rotation.x=Math.PI/2;bin.add(rim);
  const sign=label(type==='wet'?'GREEN / WET':'BLUE / DRY');sign.position.y=.32;bin.add(sign);
  // Transparent solid hit volume makes the open bin easy to tap.
  const target=mesh(new THREE.CylinderGeometry(.11,.09,.28,12),color,0,.14);target.material.visible=false;bin.add(target);
  return bin;
}
export function makeWaste(item,index) {
  const group=new THREE.Group();group.userData={kind:'waste',id:item.id};
  group.position.set((index%3-1)*.17,.065,.12+Math.floor(index/3)*.16);
  if(item.id==='apple') {
    group.add(mesh(new THREE.SphereGeometry(.04,16,12),0xe34e41));
    group.add(mesh(new THREE.CylinderGeometry(.006,.007,.035,8),0x775236,0,.045));
  } else if(item.id==='leaf') {
    const leaf=mesh(new THREE.SphereGeometry(.045,12,8),0x69b645);leaf.scale.set(.6,.12,1.3);leaf.rotation.z=.2;group.add(leaf);
    group.add(mesh(new THREE.CylinderGeometry(.002,.002,.08,6),0x49662a,0,.004));group.children[1].rotation.x=Math.PI/2;
  } else if(item.id==='peel') {
    const peel=mesh(new THREE.TorusGeometry(.035,.012,8,18,Math.PI*1.5),0xffa12b);peel.rotation.x=Math.PI/2;group.add(peel);
  } else if(item.id==='bottle') {
    group.add(mesh(new THREE.CylinderGeometry(.024,.024,.075,12),0x8edce7));
    group.add(mesh(new THREE.CylinderGeometry(.012,.024,.02,12),0x8edce7,0,.047));
    group.add(mesh(new THREE.CylinderGeometry(.013,.013,.018,12),0x2376ca,0,.066));
  } else if(item.id==='paper') {
    const paper=mesh(new THREE.BoxGeometry(.085,.006,.065),0xfff5d8);paper.rotation.y=.2;group.add(paper);
    for(let i=0;i<3;i++)group.add(mesh(new THREE.BoxGeometry(.05,.001,.002),0x79948f,0,.004,(i-1)*.012));
  } else {
    group.add(mesh(new THREE.CylinderGeometry(.028,.028,.075,16),0xc5ced2));
    group.add(mesh(new THREE.CylinderGeometry(.029,.029,.006,16),0x778e9d,0,.04));
  }
  const halo=new THREE.Mesh(new THREE.RingGeometry(.05,.057,24).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xb6f398,side:THREE.DoubleSide}));halo.position.y=-.052;halo.visible=false;halo.name='halo';group.add(halo);
  const target=mesh(new THREE.SphereGeometry(.06,8,6),0xffffff);target.material.visible=false;group.add(target);
  return group;
}
export function disposeGroup(group) {
  group.traverse(object=>{object.geometry?.dispose();if(object.material){object.material.map?.dispose();object.material.dispose();}});
  group.clear();
}
