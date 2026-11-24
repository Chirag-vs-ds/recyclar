import * as THREE from 'three';
import { ITEMS, newGame, sortItem } from './game.js';
import { makeBin, makeWaste, disposeGroup } from './models.js';

const $=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene(); // Null background: the XR compositor supplies the real camera image.
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.01,30);
scene.add(new THREE.HemisphereLight(0xffffff,0x6e856c,2));
const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(1,3,2);scene.add(light);
const station=new THREE.Group();station.visible=false;scene.add(station);
const reticle=new THREE.Mesh(new THREE.RingGeometry(.07,.085,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xb6f398}));
reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
const raycaster=new THREE.Raycaster(),matrix=new THREE.Matrix4(),normal=new THREE.Vector3();
let session=null,hitSource=null,placed=false,selected=null,state=newGame(),animation=null,flashUntil=0;
let waste=[],bins=[],tracking=false;
function status(text,tone='neutral') { $('status').textContent=text;document.querySelector('.bottom').dataset.tone=tone; }
function sync() {
  $('score').textContent=state.score;$('count').textContent=`${state.sorted.length} / ${ITEMS.length}`;
  $('wet').disabled=$('dry').disabled=!selected||!!animation||!tracking;
  $('selection').textContent=selected?`Selected: ${ITEMS.find(i=>i.id===selected.userData.id).name}`:placed?'Tap a 3D waste object, then a bin. You can also use the bin buttons.':'Find a textured, well-lit horizontal surface.';
}
function resetRound() {
  animation=null;selected=null;flashUntil=0;state=newGame();disposeGroup(station);
  bins=[makeBin('wet',-.18),makeBin('dry',.18)];waste=ITEMS.map(makeWaste);station.add(...bins,...waste);sync();
  status(placed?'New round! Tap any waste object.':'Move your phone slowly over a floor or tabletop.');
}
function scan() {
  placed=false;station.visible=false;reticle.visible=false;$('place').hidden=false;$('place').disabled=true;$('choices').hidden=true;resetRound();
}
function place() {
  if(!session||!tracking||!reticle.visible||placed)return;
  station.position.setFromMatrixPosition(reticle.matrix);
  // Keep bins upright and face their front toward the user, independent of hit-pose yaw.
  const eye=new THREE.Vector3().setFromMatrixPosition(renderer.xr.getCamera().matrixWorld);
  station.rotation.set(0,Math.atan2(eye.x-station.position.x,eye.z-station.position.z),0);
  placed=true;station.visible=true;reticle.visible=false;$('place').hidden=true;$('choices').hidden=false;
  status('Station placed. Tap an object to select it.');sync();
}
function choose(object) {
  selected?.getObjectByName('halo')?.visible && (selected.getObjectByName('halo').visible=false);
  selected=object;selected.getObjectByName('halo').visible=true;status('Now tap the correct bin.');sync();
}
function sort(type) {
  if(!selected||animation||!tracking)return;
  const item=ITEMS.find(i=>i.id===selected.userData.id),result=sortItem(state,item.id,type);
  if(result.ignored)return;
  state=result.state;
  if(!result.correct){status(`Try again! ${item.tip}`,'error');selected.getObjectByName('halo').material.color.set(0xff6565);flashUntil=performance.now()+900;sync();return;}
  status(`+10 · ${item.name} sorted!`,'success');
  const bin=bins.find(b=>b.userData.type===type);
  animation={object:selected,from:selected.position.clone(),to:bin.position.clone().add(new THREE.Vector3(0,.12,0)),start:performance.now()};sync();
}
function onSelect(event) {
  if(!placed||animation||!tracking)return;
  // Use the transient touchscreen input pose from THIS event, not a stale controller pose.
  const pose=event.frame.getPose(event.inputSource.targetRaySpace,renderer.xr.getReferenceSpace());if(!pose)return;
  matrix.fromArray(pose.transform.matrix);raycaster.ray.origin.setFromMatrixPosition(matrix);
  raycaster.ray.direction.set(0,0,-1).transformDirection(matrix);scene.updateMatrixWorld(true);
  const hits=raycaster.intersectObjects([...bins,...waste.filter(w=>w.visible)],true);
  for(const hit of hits){let object=hit.object;while(object&& !object.userData.kind)object=object.parent;if(!object)continue;if(object.userData.kind==='waste')choose(object);else if(selected)sort(object.userData.type);else status('Tap a waste object first.');break;}
}
// Stop taps on HTML controls also selecting objects behind those controls.
document.querySelectorAll('.panel').forEach(panel=>panel.addEventListener('beforexrselect',event=>event.preventDefault()));
$('place').onclick=place;$('restart').onclick=resetRound;$('rescan').onclick=scan;
$('wet').onclick=()=>sort('wet');$('dry').onclick=()=>sort('dry');$('exit').onclick=()=>session?.end();
function cleanup() {
  hitSource?.cancel();hitSource=null;session=null;tracking=false;placed=false;animation=null;selected=null;
  station.visible=false;reticle.visible=false;disposeGroup(station);waste=[];bins=[];
  document.body.classList.remove('ar');$('hud').hidden=true;$('welcome').hidden=false;$('start').disabled=false;$('start').textContent='Start AR game';
}
$('start').onclick=async()=>{
  $('start').disabled=true;let started=null;
  try {
    started=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],domOverlay:{root:$('overlay')}});
    session=started;started.addEventListener('end',cleanup,{once:true});started.addEventListener('select',onSelect);
    document.body.classList.add('ar');$('welcome').hidden=true;$('hud').hidden=false;
    await renderer.xr.setSession(started);
    const viewer=await started.requestReferenceSpace('viewer');
    const source=await started.requestHitTestSource({space:viewer});
    if(session!==started){source.cancel();return;}hitSource=source;scan();
  }catch(error){if(started){try{await started.end();}catch{} }cleanup();$('support').textContent=`AR could not start (${error.name}). Allow camera/AR access, use Android Chrome, update Google Play Services for AR, and open this page directly over HTTPS. This game requires hit-test and DOM overlay support.`;}
};
renderer.setAnimationLoop((time,frame)=>{
  if(frame&&session){
    const space=renderer.xr.getReferenceSpace();const wasTracking=tracking;
    tracking=!!frame.getViewerPose(space)&&session.visibilityState==='visible';
    station.visible=placed&&tracking;
    if(!tracking){reticle.visible=false;$('place').disabled=true;status('Tracking paused. Point back at your surface.');}
    else if(!wasTracking){status(placed?'Tracking restored. Continue sorting.':'Move slowly until the green ring appears.');}
    if(!placed&&tracking&&hitSource){
      reticle.visible=false;
      for(const hit of frame.getHitTestResults(hitSource)){
        const pose=hit.getPose(space);if(!pose)continue;matrix.fromArray(pose.transform.matrix);
        normal.set(0,1,0).transformDirection(matrix);
        // Accept upward horizontal surfaces only (within about 20 degrees).
        if(normal.y<.94)continue;reticle.matrix.copy(matrix);reticle.visible=true;break;
      }
      $('place').disabled=!reticle.visible;$('place').textContent=reticle.visible?'Place station here':'Looking for a surface…';
    }
    if(wasTracking!==tracking)sync();
  }
  if(animation){const t=Math.min((performance.now()-animation.start)/650,1),a=animation;
    a.object.position.lerpVectors(a.from,a.to,t);a.object.position.y+=Math.sin(t*Math.PI)*.18;a.object.scale.setScalar(1-.65*t);
    if(t===1){a.object.visible=false;selected=null;animation=null;sync();if(state.sorted.length===ITEMS.length)status(`All sorted! ${state.score}/60 points · ${state.mistakes} incorrect attempts. Play again?`,'success');}}
  if(flashUntil&&performance.now()>flashUntil){selected?.getObjectByName('halo')?.material.color.set(0xb6f398);flashUntil=0;}
  renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
async function checkSupport(){
  let message;
  if(!window.isSecureContext)message='HTTPS is required on your phone. Deploy this folder or use USB localhost forwarding.';
  else if(!navigator.xr)message='WebXR is unavailable. Open this page in Chrome on an ARCore-supported Android phone.';
  else {try{if(await navigator.xr.isSessionSupported('immersive-ar')){$('start').disabled=false;$('start').textContent='Start AR game';$('support').textContent='AR is available. Allow camera access when prompted.';return;}message='Immersive AR is not supported here. Try an ARCore-supported Android phone with Google Play Services for AR.';}catch{message='AR support check failed. Open this page directly in Android Chrome and reload.';}}
  $('support').textContent=message;$('start').textContent='AR unavailable on this device';
}
checkSupport();
