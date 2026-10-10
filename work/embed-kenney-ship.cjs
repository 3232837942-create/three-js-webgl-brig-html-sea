const fs=require('node:fs');
const glb=fs.readFileSync('work/kenney-pirate/Models/GLB format/ship-pirate-medium.glb').toString('base64');
const texture=fs.readFileSync('work/kenney-pirate/Models/GLB format/Textures/colormap.png').toString('base64');
const source=`/* CC0 Kenney Pirate Kit 2.1: embedded GLB ship, parsed without network requests. */
window.createKenneyShip=function(THREE){
 const glb='${glb}', texture='${texture}';
 const raw=Uint8Array.from(atob(glb),c=>c.charCodeAt(0)).buffer,view=new DataView(raw),jsonLength=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(raw,20,jsonLength))),binOffset=20+jsonLength+8;
 const components={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 const read=(id)=>{const a=json.accessors[id],v=json.bufferViews[a.bufferView],C=components[a.componentType],offset=binOffset+(v.byteOffset||0)+(a.byteOffset||0),bytes=a.count*sizes[a.type]*C.BYTES_PER_ELEMENT;return new THREE.BufferAttribute(new C(raw.slice(offset,offset+bytes)),sizes[a.type]);};
 const map=new THREE.TextureLoader().load('data:image/png;base64,'+texture);map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;map.anisotropy=4;
 const material=new THREE.MeshStandardMaterial({map,roughness:.82,metalness:0,side:THREE.DoubleSide});
 const meshes=json.meshes.map(m=>{const g=new THREE.Group();g.name=m.name||'kenney-part';m.primitives.forEach(p=>{const geo=new THREE.BufferGeometry();Object.entries(p.attributes).forEach(([k,v])=>geo.setAttribute(k==='POSITION'?'position':k==='NORMAL'?'normal':k==='TEXCOORD_0'?'uv':k.toLowerCase(),read(v)));if(p.indices!==undefined)geo.setIndex(read(p.indices));geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.raycast=()=>{};g.add(mesh)});return g});
 const nodes=json.nodes.map(n=>{const g=new THREE.Group();g.name=n.name||'kenney-node';if(n.translation)g.position.fromArray(n.translation);if(n.rotation)g.quaternion.fromArray(n.rotation);if(n.scale)g.scale.fromArray(n.scale);if(n.mesh!==undefined)g.add(meshes[n.mesh]);return g});
 json.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>nodes[i].add(nodes[c])));const root=new THREE.Group();root.name='kenney-cc0-ship-overlay';(json.scenes[0].nodes||[]).forEach(n=>root.add(nodes[n]));return root;
};`;
fs.writeFileSync('work/kenney-ship.js',source);
console.log('Embedded Kenney ship:',source.length,'bytes');
