/* Standalone Three.js r160 ocean and island environment. */
window.createOcean = function createOcean(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'ocean-environment';
  scene.add(root);

  // Long swells establish the ship motion; shorter crossing waves break up the surface.
  // heightAt below mirrors this exact profile for buoyancy and particle placement.
  const waves = [
    { x: 0.82, z: 0.57, amplitude: 0.52, wavelength: 72, speed: 0.92, phase: 0.18 },
    { x: -0.54, z: 0.84, amplitude: 0.29, wavelength: 38, speed: 1.27, phase: 1.43 },
    { x: 0.97, z: -0.25, amplitude: 0.19, wavelength: 19, speed: 1.80, phase: 2.62 },
    { x: 0.71, z: 0.70, amplitude: 0.105, wavelength: 10, speed: 2.48, phase: 4.06 },
    { x: 0.39, z: 0.92, amplitude: 0.055, wavelength: 5.4, speed: 3.38, phase: 5.11 },
    { x: -0.91, z: 0.41, amplitude: 0.025, wavelength: 2.8, speed: 4.69, phase: 0.77 }
  ];
  const islands = [
    new THREE.Vector4(-160, -180, 76, 43),
    new THREE.Vector4(215, -65, 58, 37),
    new THREE.Vector4(-335, 235, 108, 52)
  ];
  const seaWaves = waves.map(w => new THREE.Vector4(w.x, w.z, w.amplitude, 2 * Math.PI / w.wavelength));
  const waveTimes = waves.map(w => new THREE.Vector2(w.speed, w.phase));
  let stormAmount = 0;
  let lastTime = 0;
  let lastLightning = -100;
  let nextLightning = 8;
  const sunDirection = new THREE.Vector3(-0.45, 0.64, -0.62).normalize();
  const uniforms = {
    uTime: { value: 0 },
    uStorm: { value: 0 },
    uWaveScale: { value: 1 },
    uNight: { value: 0 },
    uWaves: { value: seaWaves },
    uWaveTimes: { value: waveTimes },
    uIslands: { value: islands },
    uSun: { value: sunDirection },
    uSunset: { value: 0 },
    uFlash: { value: 0 },
    uShip: { value: new THREE.Vector4() },
    uMoon: { value: new THREE.Vector3(.5,.6,.7).normalize() }
  };

  const waveGLSL = `
    uniform float uTime;
    uniform float uStorm;
    uniform float uWaveScale;
    uniform vec4 uWaves[6];
    uniform vec2 uWaveTimes[6];
    float waveGain(float frequency) {
      // Wind raises long swells more than short ripples, avoiding needle-like storm waves.
      return (1.0+uStorm*mix(2.0,.65,smoothstep(.12,.8,frequency)))*uWaveScale;
    }
    vec3 wavePhase(vec2 p,vec4 w,vec2 timing) {
      vec2 across=vec2(-w.y,w.x);
      float bend=dot(across,p)*w.w*.45+uTime*timing.x*.19+timing.y;
      float phase=dot(w.xy,p)*w.w+uTime*timing.x+timing.y+.75*sin(bend)+.25*sin(bend*1.71);
      vec2 derivative=w.xy*w.w+across*w.w*.45*(.75*cos(bend)+.4275*cos(bend*1.71));
      return vec3(phase,derivative);
    }
    float seaHeight(vec2 p) {
      float h = 0.0;
      for (int i=0; i<6; i++) {
        vec4 w = uWaves[i];
        float phase = wavePhase(p,w,uWaveTimes[i]).x;
        h += (sin(phase)+sin(phase*2.0)*0.18)*w.z*waveGain(w.w);
      }
      return h;
    }
    vec3 seaNormal(vec2 p) {
      vec2 gradient = vec2(0.0);
      for (int i=0; i<6; i++) {
        vec4 w = uWaves[i];
        vec3 profile=wavePhase(p,w,uWaveTimes[i]);
        float phase=profile.x;
        gradient += (cos(phase)+cos(phase*2.0)*0.36)*w.z*profile.yz*waveGain(w.w);
      }
      return normalize(vec3(-gradient.x,1.0,-gradient.y));
    }
  `;

  // Shared analytic sky: water reflects the same cloud field and horizon as the sky dome.
  const atmosphereGLSL = `
    uniform float uNight, uSunset, uFlash;
    uniform vec3 uSun, uMoon;
    float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p) {
      vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }
    float cloudNoise(vec2 p) {
      return noise(p)*.57+noise(p*2.03+8.1)*.28+noise(p*4.07-4.2)*.15;
    }
    vec3 atmosphere(vec3 direction) {
      float h=pow(max(direction.y,0.0),.55);
      vec3 color=mix(vec3(.48,.62,.72),vec3(.09,.25,.46),h);
      color=mix(color,mix(vec3(.94,.36,.14),vec3(.11,.09,.24),h),uSunset);
      color=mix(color,mix(vec3(.052,.080,.13),vec3(.006,.016,.046),h),uNight);
      color=mix(color,mix(vec3(.24,.30,.35),vec3(.055,.079,.105),h)*(1.0-uNight*.66),uStorm*.9);
      vec2 cloudUV=direction.xz/(max(direction.y,0.0)+.23)*2.5+vec2(uTime*.007,0);
      float clouds=smoothstep(.48-uStorm*.17,.76-uStorm*.12,cloudNoise(cloudUV));
      clouds*=smoothstep(-.01,.12,direction.y);
      vec3 cloudColor=mix(vec3(.80,.84,.86),vec3(.62,.27,.16),uSunset);
      cloudColor=mix(cloudColor,vec3(.035,.052,.085),uNight);
      cloudColor=mix(cloudColor,vec3(.10,.135,.16)*(1.0-uNight*.5),uStorm);
      color=mix(color,cloudColor,clouds*.83);
      float solar=max(dot(direction,uSun),0.0);
      color+=mix(vec3(1.0,.84,.56),vec3(1.0,.28,.07),uSunset)*pow(solar,32.0)*.18*(1.0-uStorm)*(1.0-uNight);
      return color+uFlash*vec3(.55,.62,.70);
    }
  `;

  const waterMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: waveGLSL + `
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec4 world = modelMatrix * vec4(position,1.0);
        world.y = seaHeight(world.xz);
        vWorld = world.xyz;
        vNormal = seaNormal(world.xz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: waveGLSL + atmosphereGLSL + `
      uniform vec4 uIslands[3];
      uniform vec4 uShip;
      varying vec3 vWorld;
      varying vec3 vNormal;
      float floorHeight(vec2 p) {
        float h = -26.0;
        for(int i=0;i<3;i++) {
          vec4 island=uIslands[i];
          vec2 d=(p-island.xy)/island.z;
          h+=island.w*exp(-dot(d,d));
        }
        return h;
      }
      float ggx(vec3 n, vec3 eye, vec3 light, float roughness) {
        vec3 halfDir=normalize(light+eye);
        float nl=max(dot(n,light),0.0), nv=max(dot(n,eye),.02), nh=max(dot(n,halfDir),0.0);
        float a2=pow(roughness,4.0), d=nh*nh*(a2-1.0)+1.0;
        float distribution=a2/(3.14159*d*d+.00001);
        float k=pow(roughness+1.0,2.0)/8.0;
        float geometry=nl/(nl*(1.0-k)+k)*nv/(nv*(1.0-k)+k);
        float f=.02+.98*pow(1.0-max(dot(eye,halfDir),0.0),5.0);
        return min(9.0,distribution*geometry*f/(4.0*nv+.001));
      }
      void main() {
        vec3 eye=normalize(cameraPosition-vWorld);
        vec2 p=vWorld.xz;
        float distanceToEye=length(cameraPosition-vWorld);
        // Analytic per-pixel slopes retain detail independently of mesh tessellation.
        vec3 baseNormal=seaNormal(p);
        vec2 micro=vec2(0.0);
        float pixelFootprint=max(length(dFdx(p)),length(dFdy(p)));
        for(int i=0;i<5;i++) {
          float fi=float(i), frequency=2.7*pow(1.83,fi);
          vec2 dir=vec2(cos(fi*2.399+.4),sin(fi*2.399+.4));
          float phase=dot(p,dir)*frequency+uTime*sqrt(9.81*frequency);
          float filterWeight=1.0-smoothstep(.7,2.8,frequency*pixelFootprint);
          micro+=dir*cos(phase+sin(dot(p,dir.yx)*.53+uTime*.3)*.8)*(.036+uStorm*.025)*filterWeight;
        }
        vec3 normal=normalize(vec3(baseNormal.x/baseNormal.y-micro.x,1.0,baseNormal.z/baseNormal.y-micro.y));
        float depth=max(0.0,vWorld.y-floorHeight(p));
        float deep=smoothstep(0.4,23.0,depth);
        vec3 shallow=vec3(.025,.27,.27);
        vec3 deepColor=vec3(.009,.055,.083);
        vec3 water=mix(shallow,deepColor,deep);
        water*=mix(1.0,.30,uNight)*(1.0-uStorm*.23);
        vec3 reflection=reflect(-eye,normal); reflection.y=max(.005,reflection.y);
        float fresnel=.025+.975*pow(1.0-max(dot(normal,eye),0.0),5.0);
        water=mix(water,atmosphere(reflection),fresnel);
        float backlight=pow(max(dot(eye,-uSun),0.0),3.0);
        water+=vec3(.015,.085,.08)*max(0.0,vWorld.y+.2)*backlight*(1.0-uNight)*(1.0-uStorm*.65);
        float roughness=.19+uStorm*.14+min(.14,pixelFootprint*.035);
        vec3 glintColor=mix(vec3(1.0,.90,.73),vec3(1.0,.36,.10),uSunset);
        water+=glintColor*ggx(normal,eye,uSun,roughness)*5.0*(1.0-uStorm*.94)*(1.0-uNight);
        water+=vec3(.43,.63,.93)*ggx(normal,eye,uMoon,.26)*2.5*uNight*(1.0-uStorm*.87);
        vec2 foamUV=p*.92+vec2(uTime*.16,-uTime*.09);
        float cellular=noise(foamUV)*.64+noise(foamUV*3.1)*.36;
        float lace=smoothstep(.40,.68,cellular);
        float shore=(1.0-smoothstep(.12,1.65,depth))*(.35+.65*lace);
        // Curvature selects rounded crests, including their flat tops, rather than just steep slopes.
        float crest=0.0;
        for(int i=2;i<6;i++) {
          vec4 w=uWaves[i];
          float phase=wavePhase(p,w,uWaveTimes[i]).x;
          crest+=smoothstep(.80,.99,sin(phase))*(.10+float(i)*.022);
        }
        crest*=smoothstep(.40,.79,cellular+vWorld.y*.035)*(.18+uStorm*.72)*sqrt(uWaveScale);
        // Bow shoulders follow heading only, so spray and foam stay on the water through roll/pitch.
        vec2 delta=p-uShip.xy;
        float co=cos(uShip.z), si=sin(uShip.z);
        vec2 local=vec2(co*delta.x+si*delta.y,-si*delta.x+co*delta.y);
        float aft=local.y+9.1;
        float edge=.30+max(aft,0.0)*.36;
        float shoulder=exp(-pow((abs(local.x)-edge)/(.24+max(aft,0.0)*.043),2.0));
        float bow=shoulder*smoothstep(0.0,1.2,aft)*(1.0-smoothstep(6.0,24.0,aft));
        float hullBand=exp(-pow((abs(local.x)-2.62)/.48,2.0))*smoothstep(-7.0,-2.0,local.y)*(1.0-smoothstep(5.5,9.0,local.y));
        float speedFoam=smoothstep(.12,2.6,uShip.w);
        float foam=clamp(shore+crest+(bow+hullBand*.36)*speedFoam*(.3+lace),0.0,.95);
        vec3 foamColor=mix(vec3(.69,.79,.81),vec3(.16,.23,.31),uNight);
        foamColor=mix(foamColor,foamColor*.66,uStorm)+uFlash*.5;
        water=mix(water,foamColor,foam);
        vec3 skyColor=atmosphere(normalize(vec3(-eye.x,.018,-eye.z)));
        float distanceFog=1.0-exp(-distanceToEye*mix(.00065,.0055,uStorm));
        water=mix(water,skyColor,distanceFog);
        water+=uFlash*vec3(.23,.29,.34);
        gl_FragColor=vec4(water,mix(.62,1.0,smoothstep(0.0,7.0,depth)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    extensions: { derivatives: true }
  });

  // The grid moves in whole cells; world-space phase keeps the waves continuous.
  const waterGeometry = new THREE.PlaneGeometry(2, 2, 512, 512);
  waterGeometry.rotateX(-Math.PI / 2);
  const grid=waterGeometry.attributes.position;
  for(let i=0;i<grid.count;i++) {
    const x=grid.getX(i),z=grid.getZ(i);
    grid.setXYZ(i,x*(120+2080*Math.pow(Math.abs(x),3)),0,z*(120+2080*Math.pow(Math.abs(z),3)));
  }
  waterGeometry.computeBoundingSphere();
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.name = 'multiscale-ocean';
  water.renderOrder = -10;
  water.frustumCulled = false;
  root.add(water);

  // Directional surface currents: subtle foam streaks that drift independently of waves.
  const currentMaterial=new THREE.LineBasicMaterial({color:0xb5eee5,transparent:true,opacity:.18,depthWrite:false});
  const currentGroup=new THREE.Group();currentGroup.name='surface-current-streaks';
  for(let band=0;band<48;band++){
    const angle=band*2.399,dist=38+(band%8)*17,len=7+(band%5)*3;
    const points=[];for(let i=0;i<6;i++){const advance=i*len/5;points.push(new THREE.Vector3(Math.cos(angle)*dist+advance,0.045,Math.sin(angle)*dist+Math.sin(i*.9+band)*.7));}
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),currentMaterial);line.userData={band,baseX:Math.cos(angle)*dist,baseZ:Math.sin(angle)*dist};currentGroup.add(line);
  }
  root.add(currentGroup);
  currentGroup.visible=false; // Continuous shader foam replaces floating line segments.

  const skyUniforms = uniforms;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 24, 16), new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: waveGLSL + atmosphereGLSL + `
      varying vec3 vDirection;
      void main(){
        vec3 direction=normalize(vDirection);
        vec3 color=atmosphere(direction);
        vec2 starUV=direction.xz/(direction.y+1.15)*780.0;
        vec2 starCell=floor(starUV);
        float starHash=fract(sin(dot(starCell,vec2(127.1,311.7)))*43758.5453);
        float star=step(0.9978,starHash)+step(0.99935,starHash)*1.8;
        star*=1.0-smoothstep(.05,.38,length(fract(starUV)-.5));
        color+=vec3(0.54,0.72,1.0)*star*uNight*(1.0-uStorm)*smoothstep(0.04,0.34,direction.y);
        float horizonGlow=pow(max(0.0,1.0-abs(direction.y)*7.0),2.0)*uSunset*(1.0-uStorm*.65);
        color+=vec3(1.0,0.16,0.045)*horizonGlow*.38;
        color+=vec3(uFlash*0.72);
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  }));
  sky.name = 'caribbean-sky';
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  root.add(sky);

  const sun = new THREE.Mesh(new THREE.SphereGeometry(19, 16, 12), new THREE.MeshBasicMaterial({color:0xffefb0,fog:false}));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(11, 12, 10), new THREE.MeshBasicMaterial({color:0xd8e7eb,fog:false}));
  sun.name='sun'; moon.name='moon'; root.add(sun,moon);

  function floorHeight(x,z) {
    let h=-26;
    for(const island of islands){
      const dx=(x-island.x)/island.z, dz=(z-island.y)/island.z;
      h+=island.w*Math.exp(-dx*dx-dz*dz);
    }
    return h;
  }

  const islandMaterial = new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
  const palmTrunk = new THREE.MeshStandardMaterial({color:0x866647,roughness:1,flatShading:true});
  const palmLeaf = new THREE.MeshStandardMaterial({color:0x258e62,roughness:0.95,side:THREE.DoubleSide,flatShading:true});
  const bushMaterial=new THREE.MeshStandardMaterial({color:0x347348,roughness:1,flatShading:true});
  const sand = new THREE.Color(0xf0db99), grass = new THREE.Color(0x72a551), stone = new THREE.Color(0x849078);

  function palm(x,z,seed) {
    const base=floorHeight(x,z);
    if(base<1.0) return;
    const palmRoot=new THREE.Group(); palmRoot.position.set(x,base,z);
    const height=5.4+(seed%3)*0.8;
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.3,height,6),palmTrunk);
    trunk.position.set(0.4,height/2,0); trunk.rotation.z=-0.15; palmRoot.add(trunk);
    for(let leafIndex=0;leafIndex<6;leafIndex++){
      const angle=leafIndex*Math.PI/3+seed;
      const vertices=new Float32Array([
        0,0,0, 1.2,0.15,0.45, 1.2,0.15,-0.45,
        1.2,0.15,0.45, 2.9,-0.5,0, 1.2,0.15,-0.45,
        1.2,0.15,0.45, 2.4,-0.26,0.25, 2.9,-0.5,0,
        1.2,0.15,-0.45, 2.9,-0.5,0, 2.4,-0.26,-0.25
      ]);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));geometry.computeVertexNormals();
      const leaf=new THREE.Mesh(geometry,palmLeaf); leaf.position.set(0.8,height-0.1,0);leaf.rotation.y=angle;palmRoot.add(leaf);
    }
    root.add(palmRoot);
  }

  function shrub(x,z,seed){
    const base=floorHeight(x,z);if(base<1.5)return;
    const shrubRoot=new THREE.Group();shrubRoot.position.set(x,base,z);
    const pieces=2+(seed%3);for(let i=0;i<pieces;i++){
      const leaf=new THREE.Mesh(new THREE.DodecahedronGeometry(.65+(i%2)*.18,0),bushMaterial);
      leaf.position.set(Math.sin(seed*7+i)*.45,.42+i*.16,Math.cos(seed*11+i)*.38);leaf.scale.set(1,.75,1);shrubRoot.add(leaf);
    }root.add(shrubRoot);
  }

  islands.forEach((island,index)=>{
    const geometry=new THREE.PlaneGeometry(island.z*2.1,island.z*2.1,30,30); geometry.rotateX(-Math.PI/2);
    const positions=geometry.attributes.position; const colors=[];
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i)+island.x,z=positions.getZ(i)+island.y,h=floorHeight(x,z);
      positions.setX(i,x); positions.setZ(i,z);
      positions.setY(i,h);
      const color=h<2.9?sand.clone():h<10?grass.clone():stone.clone();
      color.multiplyScalar(0.91+0.1*Math.sin(x*0.91+z*1.27)); colors.push(color.r,color.g,color.b);
    }
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); geometry.computeVertexNormals();
    // Vertices already carry their world-space island offset.
    const mesh=new THREE.Mesh(geometry,islandMaterial);mesh.receiveShadow=true;root.add(mesh);
    for(let i=0;i<16;i++){
      const angle=i*2.399+index,r=island.z*(0.27+0.03*(i%3));
      palm(island.x+Math.cos(angle)*r,island.y+Math.sin(angle)*r,index*7+i);
    }
    for(let i=0;i<34;i++){
      const angle=i*2.399+index*.7,r=island.z*(.16+.012*(i%13));
      shrub(island.x+Math.cos(angle)*r,island.y+Math.sin(angle)*r,index*41+i);
    }
  });

  const cloudGeometry=new THREE.IcosahedronGeometry(1,1);
  const cloudMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.81,depthWrite:false});
  const cloudGroup=new THREE.Group();
  for(let i=0;i<16;i++){
    const angle=i*2.399, distance=330+(i%4)*140;
    const cloud=new THREE.Mesh(cloudGeometry,cloudMaterial);
    cloud.position.set(Math.cos(angle)*distance,95+(i%5)*20,Math.sin(angle)*distance);
    cloud.scale.set(48+(i%3)*13,10+(i%4)*3,23+(i%3)*10);
    cloudGroup.add(cloud);
  }
  root.add(cloudGroup);
  cloudGroup.visible=false; // The shared sky shader provides soft cloud layers and their reflections.

  const rainPositions=new Float32Array(900*6);
  const rainSeeds=[];
  for(let i=0;i<900;i++) rainSeeds.push({x:Math.random()*130-65,z:Math.random()*130-65,y:Math.random()*65});
  const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rainMaterial=new THREE.LineBasicMaterial({color:0xc7e3e8,transparent:true,opacity:0.32,depthWrite:false});
  const rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.frustumCulled=false;rain.visible=false;root.add(rain);

  function setStorm(value) {
    stormAmount=THREE.MathUtils.clamp(Number(value)||0,0,1);
    uniforms.uStorm.value=stormAmount;
  }

  function setWaveScale(value) {
    uniforms.uWaveScale.value=THREE.MathUtils.clamp(Number(value)||1,0.5,2.0);
  }

  function heightAt(x,z,time) {
    let height=0;
    for(const w of waves){
      const k=2*Math.PI/w.wavelength,bend=(-w.z*x+w.x*z)*k*.45+time*w.speed*.19+w.phase;
      const phase=(w.x*x+w.z*z)*k+time*w.speed+w.phase+.75*Math.sin(bend)+.25*Math.sin(bend*1.71);
      const blend=THREE.MathUtils.smoothstep(k,.12,.8),windGain=2.0+(.65-2.0)*blend;
      height+=(Math.sin(phase)+Math.sin(phase*2)*.18)*w.amplitude*(1+stormAmount*windGain)*uniforms.uWaveScale.value;
    }
    return height;
  }

  function update(time,storm,night,shipPosition,dayPhase=0) {
    setStorm(storm);
    night=THREE.MathUtils.clamp(Number(night)||0,0,1);
    uniforms.uTime.value=time;
    uniforms.uNight.value=night;
    const sunset=Math.pow(Math.sin(dayPhase),2)*(1-stormAmount*.62);
    uniforms.uSunset.value=sunset;
    sunDirection.set(-430,Math.cos(dayPhase)*470+38,-620).normalize();
    uniforms.uMoon.value.set(350,-Math.cos(dayPhase)*420+90,560).normalize();
    const shipX=shipPosition?shipPosition.x:0,shipZ=shipPosition?shipPosition.z:0;
    const gridStep=240/512;
    water.position.set(Math.round(shipX/gridStep)*gridStep,0,Math.round(shipZ/gridStep)*gridStep);
    sky.position.set(shipX,0,shipZ);
    cloudGroup.position.set(shipX+Math.sin(time*0.008)*12,0,shipZ);
    currentGroup.position.set(shipX,0,shipZ);
    currentGroup.rotation.y=.34;
    currentMaterial.opacity=.12+stormAmount*.08;
    currentGroup.children.forEach(line=>{const d=line.userData;line.position.x=((time*.72+d.band*3)%19)-9;line.position.z=Math.sin(time*.26+d.band)*1.3;line.position.y=heightAt(shipX+d.baseX+line.position.x,shipZ+d.baseZ+line.position.z,time)+.06;});
    cloudMaterial.color.setRGB(1-stormAmount*0.67-night*0.17+sunset*.08,1-stormAmount*0.62-night*0.12-sunset*.09,1-stormAmount*0.57-night*0.04-sunset*.11);
    cloudMaterial.opacity=0.62+stormAmount*0.24;
    const solarHeight=Math.cos(dayPhase);
    sun.position.set(shipX-430,solarHeight*470+38,shipZ-620);
    sun.visible=solarHeight>-.12;
    moon.position.set(shipX+350,-solarHeight*420+90,shipZ+560);
    moon.visible=night>0.42;
    rain.visible=stormAmount>0.45;
    if(rain.visible){
      rain.position.set(shipX,0,shipZ);
      for(let i=0;i<rainSeeds.length;i++){
        const s=rainSeeds[i],y=((s.y-time*27)%65+65)%65;
        const o=i*6,x=s.x+(y-30)*0.16;
        rainPositions[o]=x;rainPositions[o+1]=y;rainPositions[o+2]=s.z;
        rainPositions[o+3]=x-0.3;rainPositions[o+4]=y-2;rainPositions[o+5]=s.z+0.08;
      }
      rainGeometry.attributes.position.needsUpdate=true;
    }
    if(time<lastTime) nextLightning=time+6;
    if(stormAmount>0.7 && time>nextLightning){lastLightning=time;nextLightning=time+6+Math.random()*9;}
    const lightningAge=time-lastLightning;
    const flash=stormAmount>0.7 && lightningAge<0.45 ? Math.max(0,Math.sin(lightningAge*50))*Math.exp(-lightningAge*8) : 0;
    uniforms.uFlash.value=flash;
    lastTime=time;
    return {flash,storm:stormAmount};
  }

  function dispose(){
    const geometries=new Set(),materials=new Set();
    root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});
    geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());scene.remove(root);
  }

  update(0,0,0,new THREE.Vector3());
  function setVessel(position,heading,speed) {
    uniforms.uShip.value.set(position.x,position.z,heading,Math.max(0,speed));
  }
  return {update,heightAt,setStorm,setWaveScale,setVessel,root,water,sky,sun,moon,uniforms,dispose};
};
