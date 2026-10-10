/* Ship-local coordinates: bow -Z, starboard +X. Floors: 3, 0.6, 5.3. */
function createShip(THREE) {
  const root = new THREE.Group();
  root.name = 'The Black Tern';
  const interactables = [], colliders = [], sails = [], cannons = [], lanterns = [];
  const TAU = Math.PI * 2;
  function woodTexture(base, grain) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const q = c.getContext('2d'); q.fillStyle = base; q.fillRect(0, 0, 256, 512);
    let seed = 73;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 340; i++) {
      const x = random() * 256, y = random() * 512;
      q.strokeStyle = grain; q.globalAlpha = .05 + random() * .19; q.lineWidth = .5 + random() * 1.5;
      q.beginPath(); q.moveTo(x, y);
      q.bezierCurveTo(x + random() * 8 - 4, y + 25, x + random() * 6 - 3, y + 60, x + random() * 5 - 2, y + 90 + random() * 110); q.stroke();
    }
    q.globalAlpha = .35; q.strokeStyle = '#24170f'; q.lineWidth = 2;
    for (let x = 0; x <= 256; x += 64) { q.beginPath(); q.moveTo(x, 0); q.lineTo(x, 512); q.stroke(); }
    for (let col = 0; col < 4; col++) {
      const y = col % 2 ? 170 : 330; q.beginPath(); q.moveTo(col * 64, y); q.lineTo((col + 1) * 64, y); q.stroke();
      q.fillStyle = '#292017'; [9, 55].forEach(dx => { q.beginPath(); q.arc(col * 64 + dx, y + 6, 1.6, 0, TAU); q.fill(); });
    }
    q.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); t.anisotropy = 4;
    return t;
  }
  const timber = woodTexture('#ad7136', '#3d2110'), pale = woodTexture('#be9250', '#54361a'), dark = woodTexture('#543321', '#1e160f');
  const mat = {
    wood: new THREE.MeshStandardMaterial({map: timber, roughness:.83}),
    deck: new THREE.MeshStandardMaterial({map:pale, roughness:.9, side:THREE.DoubleSide}),
    dark: new THREE.MeshStandardMaterial({map:dark, roughness:.91}),
    teal: new THREE.MeshStandardMaterial({color:0x17483c, roughness:.72}),
    tealLight:new THREE.MeshStandardMaterial({color:0x2b6854, roughness:.75}),
    trim:new THREE.MeshStandardMaterial({color:0xb38442, metalness:.5, roughness:.48}),
    iron:new THREE.MeshStandardMaterial({color:0x232d31, metalness:.88, roughness:.27}),
    bronze:new THREE.MeshStandardMaterial({color:0xa87637, metalness:.75, roughness:.32}),
    rope:new THREE.MeshStandardMaterial({color:0xa48759, roughness:1}),
    black:new THREE.MeshStandardMaterial({color:0x101b20, roughness:.9, side:THREE.DoubleSide}),
    sail:new THREE.MeshStandardMaterial({color:0x182324, roughness:.95, side:THREE.DoubleSide}),
    glass:new THREE.MeshStandardMaterial({color:0xffbd63, emissive:0xff902b, emissiveIntensity:.75, transparent:true, opacity:.85, roughness:.3}),
    paper:new THREE.MeshStandardMaterial({color:0xe7d49d, roughness:.9}),
    red:new THREE.MeshStandardMaterial({color:0x8e3930, roughness:.8})
  };
  function mesh(geo, material, parent=root, x=0,y=0,z=0) {
    const m = new THREE.Mesh(geo,material); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(w,h,d,material,parent=root,x=0,y=0,z=0) { return mesh(new THREE.BoxGeometry(w,h,d),material,parent,x,y,z); }
  function cyl(r1,r2,h,material,parent=root,x=0,y=0,z=0,n=10) { return mesh(new THREE.CylinderGeometry(r1,r2,h,n),material,parent,x,y,z); }
  function ball(r,material,parent=root,x=0,y=0,z=0) { return mesh(new THREE.SphereGeometry(r,10,8),material,parent,x,y,z); }
  function rope(a,b,r=.018,material=mat.rope,parent=root) {
    const av=new THREE.Vector3(...a), bv=new THREE.Vector3(...b), dir=bv.clone().sub(av);
    const m=cyl(r,r,dir.length(),material,parent); m.position.copy(av.add(bv).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()); return m;
  }
  function collider(minX,maxX,minZ,maxZ,minY,maxY) { colliders.push({minX,maxX,minZ,maxZ,minY,maxY}); }
  function interaction(object,kind,label,extra={}) {
    const item={object,kind,label,...extra}; object.userData.interaction=item; object.userData.kind=kind; object.userData.label=label; interactables.push(item); return item;
  }
  const outline=[[-10,0],[-9.1,1.3],[-7.5,2.35],[-5.5,2.85],[-2,3.02],[2,3.03],[5.8,2.85],[8.3,2.4]];
  function widthAt(z) {
    for(let i=1;i<outline.length;i++) if(z<=outline[i][0]) { const a=outline[i-1],b=outline[i]; return THREE.MathUtils.lerp(a[1],b[1],(z-a[0])/(b[0]-a[0])); }
    return 2.4;
  }
  function strip(side,za,zb,ya,yb,fa,fb,material) {
    const p=[side*widthAt(za)*fa,ya,za, side*widthAt(zb)*fa,ya,zb, side*widthAt(zb)*fb,yb,zb, side*widthAt(za)*fb,yb,za];
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,(zb-za)*.8,0,(zb-za)*.8,(yb-ya)*.7,0,(yb-ya)*.7],2));
    g.setIndex(side>0?[0,2,1,0,3,2]:[0,1,2,0,2,3]); g.computeVertexNormals();
    const m=mesh(g,material); m.material.side=THREE.DoubleSide; return m;
  }
  const bands=[[-1.25,-.55,.04,.54],[-.55,.15,.54,.78],[.15,1.05,.78,.96],[1.05,2.15,.96,1],[2.15,2.95,1,1]];
  for(const side of [-1,1]) {
    for(let iz=0;iz<40;iz++) {
      const za=-10+18.3*iz/40,zb=-10+18.3*(iz+1)/40;
      for(let ib=0;ib<bands.length;ib++) {
        const [ya,yb,fa,fb]=bands[ib],mid=(za+zb)/2;
        if(ib===3 && (Math.abs(mid+4)<.93||Math.abs(mid-1)<.93)) continue;
        strip(side,za,zb,ya,yb,fa,fb,ib===0?mat.dark:ib===4?mat.teal:mat.wood);
      }
    }
    for(let i=1;i<outline.length;i++) {
      const [za,wa]=outline[i-1],[zb,wb]=outline[i];
      for(const [y,f,r,material] of [[2.93,1,.1,mat.trim],[2.13,1,.075,mat.dark],[.1,.79,.095,mat.teal],[-.65,.5,.08,mat.dark]]) {
        rope([side*wa*f,y,za],[side*wb*f,y,zb],r,material);
      }
    }
    for(const z of [-7,-5.8,-2.7,-1.4,2.8,4.2,5.7,7.4]) {
      const w=widthAt(z);
      rope([side*w*.55,-.5,z],[side*w*.96,1.05,z],.09,mat.dark);
      rope([side*w*.96,1.05,z],[side*w,2.88,z],.09,mat.dark);
    }
  }
  box(4.75,3.5,.2,mat.teal,root,0,1.17,8.28);
  box(4.93,.19,.35,mat.trim,root,0,2.85,8.34);
  box(.26,.3,17.1,mat.dark,root,0,-1.25,-.25);
  function floor(y,start=-9.55,end=8.16,hole=false) {
    const zs=[start,...outline.map(p=>p[0]).filter(z=>z>start&&z<end),end];
    const shape=new THREE.Shape(); shape.moveTo(-widthAt(start)*.965,-start);
    zs.slice(1).forEach(z=>shape.lineTo(-widthAt(z)*.965,-z));
    zs.slice().reverse().forEach(z=>shape.lineTo(widthAt(z)*.965,-z)); shape.closePath();
    if(hole) { const p=new THREE.Path(); p.moveTo(-1.1,0);p.lineTo(1.1,0);p.lineTo(1.1,-2.4);p.lineTo(-1.1,-2.4);p.closePath(); shape.holes.push(p); }
    const g=new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI/2);
    const uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*.3,uv.getY(i)*.15);
    return mesh(g,mat.deck,root,0,y,0);
  }
  floor(3,-9.4,8.1,true); floor(.6,-8.5,8.1,false); floor(5.3,5.3,8.1,false);
  for(const z of [-7.5,-5,-2.5,0,2.5,5,7.5]) box(widthAt(z)*1.86,.18,.2,mat.dark,root,0,2.82,z);
  for(const side of [-1,1]) {
    for(let z=-8.5;z<=7.6;z+=.87) {
      if(z>3.1&&z<5.2&&side===1) continue;
      const y=z>=5.3?5.3:3, w=widthAt(z)*.98;
      box(.13,.79,.13,mat.teal,root,side*w,y+.35,z);
      box(.19,.09,.19,mat.trim,root,side*w,y+.77,z);
    }
    for(let i=1;i<outline.length;i++) {
      const [za,wa]=outline[i-1],[zb,wb]=outline[i];
      if(za<5.3&&zb>5.3) {
        rope([side*wa,3.8,za],[side*widthAt(5.15),3.8,5.15],.095,mat.dark);
        rope([side*widthAt(5.3),6.1,5.3],[side*wb,6.1,zb],.095,mat.dark);
      } else { const y=za>=5.3?6.1:3.8; rope([side*wa,y,za],[side*wb,y,zb],.095,mat.dark); }
    }
  }
  box(4.9,.16,.2,mat.dark,root,0,6.13,8.25);
  for(const x of [-1.8,-.9,0,.9,1.8]) box(.13,.8,.13,mat.teal,root,x,5.7,8.22);
  for(let i=0;i<10;i++) {
    const z=2.9+i*.27,y=3+(i+1)*.23;
    box(.79,.15,.31,mat.deck,root,2.25,y-.075,z);
  }
  rope([2.64,3.82,2.85],[2.64,6.1,5.4],.055,mat.dark);
  rope([1.85,3.82,2.85],[1.85,6.1,5.4],.055,mat.dark);
  for(const z of [2.9,4.1,5.3]) { const y=3+(z-2.65)/2.7*2.3; rope([2.64,y,z],[2.64,y+.77,z],.045,mat.trim); }
  const stairs={minX:1.82,maxX:2.67,minZ:2.65,maxZ:5.5,low:3,high:5.3};
  // The main deck opening is actual geometry; its cover pivots from the port edge.
  box(.12,.12,2.55,mat.dark,root,-1.16,3.02,1.2); box(.12,.12,2.55,mat.dark,root,1.16,3.02,1.2);
  box(2.4,.12,.12,mat.dark,root,0,3.02,-.06); box(2.4,.12,.12,mat.dark,root,0,3.02,2.46);
  const hatchPivot=new THREE.Group(); hatchPivot.position.set(-1.1,3.05,0); root.add(hatchPivot);
  const hatchMesh=box(2.2,.12,2.4,mat.dark,hatchPivot,1.1,0,1.2);
  for(let i=0;i<8;i++) box(.135,.08,2.17,mat.wood,hatchPivot,.18+i*.264,.1,1.2);
  for(const z of [.2,2.2]) box(2.15,.065,.11,mat.iron,hatchPivot,1.1,.12,z);
  const hatch=interaction(hatchPivot,'hatch','甲板舱口',{pivot:hatchPivot,mesh:hatchMesh,open:false,angle:0,axis:'z',openAngle:1.42});
  const ladder=new THREE.Group(); ladder.position.set(0,.6,1.82); root.add(ladder);
  for(const x of [-.45,.45]) rope([x,0,.2],[x,2.5,-.35],.057,mat.dark,ladder);
  for(let i=0;i<8;i++) rope([-.48,i*.31,.2-i*.068],[.48,i*.31,.2-i*.068],.046,mat.wood,ladder);
  interaction(ladder,'ladder','下层梯道',{from:3,to:.6});
  // Captain's cabin leaves a starboard passage for the raised-helm stairs.
  for(const x of [-1.47,1.27]) box(x<0?1.54:1.14,2.15,.16,mat.teal,root,x,4.12,5.03);
  box(1.45,.27,.18,mat.dark,root,0,5.15,5.03);
  for(const x of [-2.18,1.83]) { box(.16,2.22,3.12,mat.teal,root,x,4.12,6.59); collider(x-.12,x+.12,5.03,8.12,3,5.3); }
  collider(-2.2,-.73,4.94,5.15,3,5.3);collider(.73,1.87,4.94,5.15,3,5.3);
  box(4.12,2.17,.16,mat.teal,root,-.17,4.12,8.08);
  for(const x of [-1.35,-.17,1.01]) {
    box(.85,.87,.045,mat.dark,root,x,4.3,8.18);
    box(.69,.68,.04,new THREE.MeshStandardMaterial({color:0x63b0a3,metalness:.28,roughness:.3}),root,x,4.3,8.215);
    for(const dx of [-.38,.38]) box(.07,.9,.08,mat.trim,root,x+dx,4.3,8.24);
    box(.86,.07,.08,mat.trim,root,x,4.75,8.24);box(.86,.07,.08,mat.trim,root,x,3.85,8.24);
    box(.035,.75,.08,mat.trim,root,x,4.3,8.255);box(.74,.035,.08,mat.trim,root,x,4.3,8.255);
  }
  const doorPivot=new THREE.Group(); doorPivot.position.set(-.72,3,4.92); root.add(doorPivot);
  const doorMesh=box(1.4,2.03,.12,mat.dark,doorPivot,.7,1.025,0);
  for(const y of [.18,1.8]) box(1.27,.13,.17,mat.iron,doorPivot,.7,y,0);
  ball(.065,mat.bronze,doorPivot,1.24,1.03,-.12);
  const door=interaction(doorPivot,'door','船长室门',{pivot:doorPivot,mesh:doorMesh,open:false,angle:0,axis:'y',openAngle:1.62});
  const table=new THREE.Group(); table.position.set(-.4,3,6.75);root.add(table);
  box(1.9,.15,1.35,mat.wood,table,0,.93,0);
  for(const x of [-.76,.76]) for(const z of [-.48,.48]) box(.13,.9,.13,mat.dark,table,x,.45,z);
  collider(-1.4,.6,6.02,7.48,3,4.05);
  const mapCanvas=document.createElement('canvas');mapCanvas.width=512;mapCanvas.height=384;
  const mq=mapCanvas.getContext('2d');mq.fillStyle='#ddce9b';mq.fillRect(0,0,512,384);mq.strokeStyle='#b3a976';mq.lineWidth=1;
  for(let x=0;x<512;x+=48) {mq.beginPath();mq.moveTo(x,0);mq.lineTo(x,384);mq.stroke();}
  for(let y=0;y<384;y+=48) {mq.beginPath();mq.moveTo(0,y);mq.lineTo(512,y);mq.stroke();}
  const islands=[[110,95,46],[344,236,56],[375,70,30],[130,287,27]];
  islands.forEach(([x,y,r])=>{mq.fillStyle='#75906a';mq.strokeStyle='#5c6b48';mq.lineWidth=3;mq.beginPath();for(let i=0;i<11;i++){const a=i/10*TAU,rr=r*(.8+.2*Math.sin(i*7));const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.7;i?mq.lineTo(px,py):mq.moveTo(px,py);}mq.closePath();mq.fill();mq.stroke();});
  mq.strokeStyle='#965d4e';mq.setLineDash([6,7]);mq.beginPath();mq.moveTo(140,260);mq.bezierCurveTo(255,320,305,70,350,245);mq.stroke();mq.setLineDash([]);
  mq.strokeStyle='#5d6452';for(let i=0;i<8;i++){const a=i*TAU/8;mq.beginPath();mq.moveTo(440,325);mq.lineTo(440+Math.sin(a)*(i%2?16:27),325+Math.cos(a)*(i%2?16:27));mq.stroke();}
  const mapTexture=new THREE.CanvasTexture(mapCanvas);mapTexture.colorSpace=THREE.SRGBColorSpace;
  const chartObject=mesh(new THREE.PlaneGeometry(1.58,1.03),new THREE.MeshStandardMaterial({map:mapTexture,roughness:1,side:THREE.DoubleSide}),table,0,1.013,0);chartObject.rotation.x=-Math.PI/2;
  const chart=interaction(chartObject,'chart','航海图');
  cyl(.075,.08,.16,mat.bronze,table,.68,1.08,.4);ball(.045,mat.iron,table,-.72,1.055,-.35);
  const chair=new THREE.Group();chair.position.set(-.4,3,7.69);root.add(chair);
  box(.58,.1,.53,mat.dark,chair,0,.5,0);box(.58,.63,.1,mat.dark,chair,0,.83,.22);
  for(const x of [-.23,.23])for(const z of [-.2,.2])box(.07,.52,.07,mat.wood,chair,x,.25,z);
  const chestRoot=new THREE.Group();chestRoot.position.set(1.13,3,7.47);root.add(chestRoot);
  box(.94,.57,.64,mat.dark,chestRoot,0,.285,0);
  const chestPivot=new THREE.Group();chestPivot.position.set(0,.57,.32);chestRoot.add(chestPivot);
  box(.98,.15,.69,mat.wood,chestPivot,0,.06,-.32);
  for(const x of [-.32,.32]) {box(.09,.59,.67,mat.iron,chestRoot,x,.3,0);box(.09,.18,.7,mat.iron,chestPivot,x,.07,-.32);}
  box(.15,.22,.07,mat.bronze,chestRoot,0,.55,-.36);
  for(let i=0;i<9;i++) cyl(.065,.065,.02,mat.bronze,chestRoot,(i%3-1)*.18,.58,Math.floor(i/3)*.12-.1,8);
  const chest=interaction(chestRoot,'chest','补给储物箱',{pivot:chestPivot,open:false,angle:0,axis:'x',openAngle:-1.35});
  collider(.6,1.7,7.05,7.88,3,3.7);
  function lantern(x,y,z,parent=root) {
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
    cyl(.14,.2,.12,mat.iron,g,0,-.24,0,6);cyl(.21,.11,.13,mat.iron,g,0,.22,0,6);
    cyl(.115,.14,.35,mat.glass.clone(),g,0,0,0,6);
    for(let i=0;i<4;i++){const a=i*TAU/4;rope([Math.sin(a)*.13,-.18,Math.cos(a)*.13],[Math.sin(a)*.13,.2,Math.cos(a)*.13],.017,mat.iron,g);}
    const ring=mesh(new THREE.TorusGeometry(.065,.015,5,10),mat.iron,g,0,.34,0);
    const light=new THREE.PointLight(0xffbd6b,2,7,2);light.position.y=.05;g.add(light);
    const desc={object:g,root:g,light,on:true,glass:g.children[2]};lanterns.push(desc);interaction(g,'lantern','船灯',{lantern:desc});return desc;
  }
  lantern(-.28,4.84,6.47);rope([-.28,5.2,6.47],[-.28,5.1,6.47],.025,mat.iron);
  lantern(-1.6,2.35,3.55);lantern(1.5,2.35,-6.45);
  for(const x of [-2.5,2.5]) {lantern(x,6.39,7.77);rope([x,5.3,7.77],[x,6.78,7.77],.045,mat.iron);}
  for(const x of [-2.45,2.45]) lantern(x,4.2,-6.5);
  function cannon(side,z,deck,index) {
    const y=deck==='main'?3:.6,x=side*(deck==='main'?2.11:2.26);
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=-side*Math.PI/2;root.add(g);
    box(.78,.22,.88,mat.dark,g,0,.23,.06);
    for(const sx of [-.36,.36]) {box(.1,.42,.88,mat.wood,g,sx,.37,.04);for(const sz of [-.27,.36]){const wh=cyl(.18,.18,.13,mat.dark,g,sx*1.21,.18,sz,10);wh.rotation.z=Math.PI/2;const hub=cyl(.06,.06,.15,mat.iron,g,sx*1.21,.18,sz,8);hub.rotation.z=Math.PI/2;}}
    const pivot=new THREE.Group();pivot.position.set(0,.65,0);pivot.rotation.x=.08;g.add(pivot);
    const barrel=new THREE.Group();pivot.add(barrel);
    const tube=cyl(.19,.27,1.47,mat.iron,barrel,0,0,-.44,12);tube.rotation.x=Math.PI/2;
    const rear=ball(.266,mat.iron,barrel,0,0,.28);rear.scale.z=.6;ball(.095,mat.bronze,barrel,0,0,.51);
    for(const zz of [-1.12,-.78,-.27,.15]) {const rim=mesh(new THREE.TorusGeometry(zz<-1?.192:zz<-.5?.219:.263,.026,5,14),mat.bronze,barrel,0,0,zz);}
    const bore=cyl(.146,.146,.021,new THREE.MeshStandardMaterial({color:0x030606,roughness:1}),barrel,0,0,-1.19,12);bore.rotation.x=Math.PI/2;
    const trunnion=cyl(.09,.09,.9,mat.iron,pivot,0,0,0,10);trunnion.rotation.z=Math.PI/2;
    const muzzle=new THREE.Object3D();muzzle.position.set(0,0,-1.23);barrel.add(muzzle);
    const ramrod=rope([.52,.16,.47],[.52,.16,-.94],.026,mat.rope,g);ramrod.visible=false;
    const brush=cyl(.082,.082,.21,mat.dark,ramrod);brush.position.y=.6;
    rope([-.42,.4,.25],[-.59,.22,.65],.038,mat.rope,g);rope([.42,.4,.25],[.59,.22,.65],.038,mat.rope,g);
    const desc={root:g,mesh:g,pivot,barrel,muzzle,ramrod,side,deck,recoil:0,load:0,azimuth:0,elevation:.08,label:(side<0?'左舷':'右舷')+(deck==='main'?'甲板':'下层')+'炮 '+index};
    cannons.push(desc);interaction(g,'cannon',desc.label,{cannon:desc});
    if(deck!=='main') {
      const portPivot=new THREE.Group();portPivot.position.set(side*widthAt(z),2.16,z);root.add(portPivot);
      const cover=box(.12,1.1,1.63,mat.teal,portPivot,side*.065,-.55,0);
      for(const zz of [-.52,.52]) box(.16,1.08,.09,mat.iron,portPivot,side*.07,-.55,zz);
      const port=interaction(portPivot,'gunport',(side<0?'左舷':'右舷')+'炮门 '+index,{pivot:portPivot,mesh:cover,open:false,angle:0,axis:'z',openAngle:side*1.58,side,cannon:desc});
      desc.port=port;
      for(const zz of [z-.86,z+.86]) box(.2,1.19,.12,mat.dark,root,side*widthAt(z),1.62,zz);
      box(.21,.12,1.79,mat.trim,root,side*widthAt(z),1.04,z);
    }
    return desc;
  }
  // Gun layout follows the reference silhouette: two upper-deck guns and
  // three lower-deck guns on each side, with independent lower gunports.
  for(const side of [-1,1]) {
    [-4.35,2.75].forEach((z,i)=>cannon(side,z,'main',i+1));
    [-5.15,-1.55,2.15].forEach((z,i)=>cannon(side,z,'gun',i+1));
  }
  // Each sail has a fixed yard pivot and original vertex positions for reefing.
  for(const [mastIndex,z,height] of [[0,-4,15.8],[1,2,17.6]]) {
    cyl(.125,.25,height-2.7,mat.dark,root,0,3+(height-3)/2,z,12);
    for(const y of [3.1,3.4,6,9,12,height-.7]) cyl(.26-y*.005,.26-y*.005,.1,mat.trim,root,0,y,z,12);
    cyl(.5,.56,.2,mat.dark,root,0,3.07,z,12);collider(-.37,.37,z-.37,z+.37,.6,height);
    const nest=cyl(.67,.52,.28,mat.dark,root,0,height-4.05,z,10);
    for(let i=0;i<10;i++){const a=i*TAU/10;rope([Math.sin(a)*.63,height-3.9,z+Math.cos(a)*.63],[Math.sin(a)*.63,height-3.4,z+Math.cos(a)*.63],.024,mat.iron);}
    const nr=mesh(new THREE.TorusGeometry(.64,.035,5,14),mat.dark,root,0,height-3.4,z);nr.rotation.x=Math.PI/2;
    const levels=[{y:height-1.1,w:4.7,h:2.8},{y:height-4.4,w:6.2,h:3.35},{y:height-8.2+(mastIndex===0?.6:0),w:7.2,h:3.35}];
    for(let si=0;si<levels.length;si++) {
      const {y,w,h}=levels[si];const pivot=new THREE.Group();pivot.position.set(0,y,z);root.add(pivot);
      rope([-w*.57,0,0],[w*.57,0,0],.075-si*.005,mat.dark,pivot);
      const geometry=new THREE.PlaneGeometry(w,h,16,12);const positions=geometry.attributes.position.array.slice();
      for(let j=0;j<geometry.attributes.position.count;j++) {
        const px=geometry.attributes.position.getX(j),py=geometry.attributes.position.getY(j);const v=(py+h/2)/h;
        geometry.attributes.position.setXYZ(j,px*(.86+.14*v),py-h/2,.58*Math.sin(v*Math.PI)*Math.cos(px/w*Math.PI)+.035);
      }
      geometry.computeVertexNormals();const sail=mesh(geometry,si===0?mat.black:mat.sail,pivot);
      const s={pivot,mesh:sail,width:w,height:h,positions:geometry.attributes.position.array.slice(),basePositions:positions,amount:1,target:1,mast:mastIndex,index:si,baseY:y};sails.push(s);
      for(let j=-3;j<=3;j++) {
        const xx=j*w/7;rope([xx,0,.07],[xx*.86,-h,.07],.008,mat.black,pivot);
      }
      rope([-w*.5,0,0],[-w*.43,-h,.04],.02,mat.rope,pivot);rope([w*.5,0,0],[w*.43,-h,.04],.02,mat.rope,pivot);
      rope([-w*.43,-h,.04],[w*.43,-h,.04],.019,mat.rope,pivot);
      for(const side of [-1,1]) rope([side*w*.53,y,z],[side*2.53,3.35,z+1.2],.016,mat.rope);
    }
    for(const side of [-1,1]) {
      for(let k=0;k<4;k++) rope([0,height-4,z],[side*2.72,3.1,z+(.45+k*.46)],.025,mat.dark);
      for(let j=1;j<=15;j++) {const t=j/17;const yy=3.1+(height-7.1)*t,xx=side*2.72*(1-t);rope([xx,yy,z+.45*(1-t)],[xx,yy,z+1.83*(1-t)],.018,mat.rope);}
      const pinrail=box(.17,.15,1.9,mat.dark,root,side*2.73,3.55,z+.9);
      for(let k=0;k<5;k++) cyl(.029,.037,.28,mat.trim,root,side*2.73,3.6,z+.2+k*.32,6);
    }
    const cleat=new THREE.Group();cleat.position.set(.55,3.6,z+.52);root.add(cleat);
    box(.48,.12,.12,mat.dark,cleat);for(const x of [-.14,.14])cyl(.032,.042,.31,mat.trim,cleat,x,-.05,0,6);
    for(let j=0;j<4;j++){const coil=mesh(new THREE.TorusGeometry(.18+j*.023,.018,5,16),mat.rope,cleat,0,-.33,0);coil.rotation.x=Math.PI/2;}
    interaction(cleat,'sail',mastIndex===0?'前桅帆索':'主桅帆索',{mast:mastIndex,sails:sails.filter(s=>s.mast===mastIndex)});
    const flagGeometry=new THREE.PlaneGeometry(1.6,.7,5,2);
    mesh(flagGeometry,mat.teal,root,.76,height+.05,z);
    cyl(.045,.06,1.3,mat.dark,root,0,height+.25,z,8);
  }
  rope([0,15.2,-4],[0,5,-12.9],.028,mat.dark);rope([0,17.2,2],[0,15.1,-4],.035,mat.dark);
  rope([0,17.1,2],[0,6.03,8],.028,mat.dark);
  rope([0,3.33,-7.7],[0,4.95,-13.15],.14,mat.dark);
  for(const side of [-1,1]) {rope([0,4.86,-12.7],[side*2.18,3,-7.8],.033,mat.rope);rope([0,4.9,-12.7],[side*.65,1.05,-8.8],.03,mat.dark);}
  // Jib: the low forward corner is on the bowsprit; the tall rear corner reaches the foremast.
  const jibShape=new THREE.Shape();jibShape.moveTo(0,0);jibShape.lineTo(8.6,0);jibShape.lineTo(8.15,9.7);jibShape.closePath();
  const jibGeometry=new THREE.ShapeGeometry(jibShape);const jib=mesh(jibGeometry,mat.black,root,0,4.35,-13.05);jib.rotation.y=-Math.PI/2;
  // Helm ring is a separate, freely rotating group.
  box(.54,1.1,.49,mat.dark,root,0,5.85,7.08);box(.78,.12,.57,mat.trim,root,0,6.25,7.08);
  const wheel=new THREE.Group();wheel.position.set(0,6.38,6.76);root.add(wheel);
  mesh(new THREE.TorusGeometry(.62,.052,7,24),mat.dark,wheel);mesh(new THREE.TorusGeometry(.55,.022,5,24),mat.trim,wheel);
  for(let i=0;i<8;i++){const a=i*TAU/8;rope([0,0,0],[Math.sin(a)*.79,Math.cos(a)*.79,0],.032,mat.wood,wheel);ball(.052,mat.trim,wheel,Math.sin(a)*.79,Math.cos(a)*.79,0);}
  const hub=cyl(.14,.14,.18,mat.bronze,wheel,0,0,0,12);hub.rotation.x=Math.PI/2;
  interaction(wheel,'wheel','舵轮',{wheel});
  const compass=new THREE.Group();compass.position.set(-.95,5.95,6.5);root.add(compass);cyl(.19,.24,.35,mat.dark,compass);cyl(.19,.19,.05,mat.bronze,compass,0,.2,0,16);
  const compassFace=mesh(new THREE.CircleGeometry(.17,20),mat.paper,compass,0,.231,0);compassFace.rotation.x=-Math.PI/2;
  const compassNeedle=box(.025,.015,.28,mat.red,compass,0,.249,0);
  // A physical wind vane sits clear of the helm and points along local -Z.
  const vaneStand=new THREE.Group();vaneStand.position.set(1.07,5.3,7.68);root.add(vaneStand);
  cyl(.055,.075,2.12,mat.bronze,vaneStand,0,1.06,0,8);
  ball(.12,mat.bronze,vaneStand,0,2.13,0);
  const windVane=new THREE.Group();windVane.position.set(0,2.31,0);vaneStand.add(windVane);
  rope([0,0,-.68],[0,0,.65],.028,mat.bronze,windVane);
  const vaneArrow=mesh(new THREE.ConeGeometry(.14,.34,3),mat.trim,windVane,0,0,-.67);vaneArrow.rotation.x=-Math.PI/2;
  box(.045,.34,.39,mat.tealLight,windVane,0,.06,.49);
  box(.055,.035,.41,mat.trim,windVane,0,.245,.49);
  const vaneRing=mesh(new THREE.TorusGeometry(.3,.016,5,20),mat.bronze,vaneStand,0,1.9,0);vaneRing.rotation.x=Math.PI/2;
  for(const a of [0,Math.PI/2]) rope([Math.sin(a)*-.42,1.9,Math.cos(a)*-.42],[Math.sin(a)*.42,1.9,Math.cos(a)*.42],.016,mat.bronze,vaneStand);
  const capstan=new THREE.Group();capstan.position.set(0,3,-7.25);root.add(capstan);
  cyl(.45,.62,.27,mat.dark,capstan,0,.15,0,10);cyl(.27,.4,.67,mat.wood,capstan,0,.61,0,10);cyl(.46,.36,.17,mat.trim,capstan,0,1,0,10);
  for(let i=0;i<4;i++){const a=i*Math.PI/4;rope([-Math.sin(a)*1.03,.87,-Math.cos(a)*1.03],[Math.sin(a)*1.03,.87,Math.cos(a)*1.03],.046,mat.dark,capstan);}
  // The anchor hangs clear of the port bow; keeping it outside the hull prevents clipping.
  const anchorRoot=new THREE.Group();anchorRoot.position.set(-2.08,3.05,-9.05);root.add(anchorRoot);
  const anchorMesh=new THREE.Group();anchorRoot.add(anchorMesh);
  rope([0,0,0],[0,-1.8,0],.069,mat.iron,anchorMesh);rope([-.47,-.25,0],[.47,-.25,0],.067,mat.dark,anchorMesh);
  rope([0,-1.73,0],[-.6,-1.28,0],.08,mat.iron,anchorMesh);rope([0,-1.73,0],[.6,-1.28,0],.08,mat.iron,anchorMesh);
  for(const side of [-1,1]) {const fluke=mesh(new THREE.ConeGeometry(.17,.4,4),mat.iron,anchorMesh,side*.59,-1.2,0);fluke.rotation.z=-side*.45;}
  const chain=new THREE.Group();anchorRoot.add(chain);
  for(let i=0;i<18;i++){const link=mesh(new THREE.TorusGeometry(.055,.017,4,8),mat.iron,chain,0,.05-i*.073,0);link.scale.y=1.32;link.rotation.y=i%2*Math.PI/2;}
  const anchor={object:capstan,root:anchorRoot,mesh:anchorMesh,chain,capstan,down:false,amount:0,target:0};interaction(capstan,'anchor','起锚机',{anchor});
  collider(-.48,.48,-7.74,-6.74,3,4.1);
  const bellRoot=new THREE.Group();bellRoot.position.set(1.45,3.92,-6.58);root.add(bellRoot);
  for(const x of [-.24,.24])box(.06,.76,.06,mat.dark,bellRoot,x,-.08,0);box(.58,.08,.09,mat.dark,bellRoot,0,.29,0);
  const bellMesh=cyl(.08,.19,.26,mat.bronze,bellRoot,0,.07,0,12);cyl(.2,.2,.035,mat.bronze,bellRoot,0,-.06,0,12);
  rope([0,-.12,0],[0,-.45,0],.018,mat.rope,bellRoot);ball(.047,mat.dark,bellRoot,0,-.45,0);
  const bell=interaction(bellRoot,'bell','船钟',{mesh:bellMesh});
  function barrel(x,y,z,scale=1) {
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);root.add(g);
    cyl(.32,.32,.9,mat.wood,g,0,.45,0,12);cyl(.37,.34,.45,mat.wood,g,0,.45,0,12);
    for(const yy of [.1,.27,.65,.82]) {const ring=mesh(new THREE.TorusGeometry(yy===.27||yy===.65?.367:.33,.032,5,12),mat.iron,g,0,yy,0);ring.rotation.x=Math.PI/2;}
    cyl(.31,.31,.025,mat.dark,g,0,.915,0,12);ball(.04,mat.wood,g,.08,.93,0);return g;
  }
  barrel(-1.58,.6,6.65);barrel(-.9,.6,7.35);barrel(-1.63,.6,7.37);barrel(1.55,.6,-7.15,.9);
  barrel(-1.76,3,4.1,.82);barrel(-1.35,3,-7.75,.75);
  for(const [x,z] of [[-1.58,6.65],[-.9,7.35],[-1.63,7.37]]) collider(x-.38,x+.38,z-.38,z+.38,.6,1.55);
  const ammo=new THREE.Group();ammo.position.set(1.17,.6,6.62);root.add(ammo);box(.83,.13,.74,mat.dark,ammo,0,.08,0);
  for(let i=0;i<6;i++)ball(.135,mat.iron,ammo,(i%3-1)*.27,.24,(Math.floor(i/3)-.5)*.27);for(let i=0;i<3;i++)ball(.135,mat.iron,ammo,(i-1)*.25,.46,0);
  interaction(ammo,'ammo','炮弹储备');
  const pump=new THREE.Group();pump.position.set(-1.37,.6,3.12);root.add(pump);
  cyl(.11,.17,1,mat.bronze,pump,0,.5,0,8);const pumpHandle=rope([-.25,1.11,0],[.49,1.11,0],.038,mat.iron,pump);
  rope([0,.8,0],[.27,.8,0],.055,mat.bronze,pump);interaction(pump,'pump','舱底水泵',{handle:pumpHandle});
  const water=mesh(new THREE.PlaneGeometry(4.83,14.7),new THREE.MeshStandardMaterial({color:0x1abfca,transparent:true,opacity:.47,roughness:.2,metalness:.2,side:THREE.DoubleSide}),root,0,.615,.05);water.rotation.x=-Math.PI/2;water.visible=false;
  // Batch fixed hull, ribs, rails, and rigging by material without touching moving objects.
  const batches=new Map();
  for(const o of root.children.slice()) {
    if(!o.isMesh||o===water||o.userData.interaction||Array.isArray(o.material)) continue;
    o.updateMatrix();const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());g.applyMatrix4(o.matrix);
    if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push({object:o,geometry:g});
  }
  for(const [material,items] of batches) {
    if(items.length<2) {items.forEach(i=>i.geometry.dispose());continue;}
    const geometry=new THREE.BufferGeometry();
    for(const [key,size] of [['position',3],['normal',3],['uv',2]]) {
      const total=items.reduce((n,i)=>n+i.geometry.attributes.position.count,0),data=new Float32Array(total*size);let offset=0;
      for(const item of items) {const attr=item.geometry.attributes[key];if(attr)data.set(attr.array,offset);offset+=item.geometry.attributes.position.count*size;}
      geometry.setAttribute(key,new THREE.BufferAttribute(data,size));
    }
    for(const item of items){root.remove(item.object);item.object.geometry.dispose();item.geometry.dispose();}
    const combined=mesh(geometry,material);combined.name='Fixed ship structure';
  }
  return {root,interactables,colliders,sails,cannons,lanterns,wheel,anchor,hatch,door,chart,chest,bell,ladder,water,stairs,compassNeedle,windVane,widthAt,materials:mat,deckY:3,gunDeckY:.6,aftDeckY:5.3,bowAxis:'-Z'};
}
