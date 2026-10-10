/* World-space foam history preserves curved trails and fades naturally after stopping. */
window.createWake = function createWake(THREE, scene, ocean) {
  const rows=120, columns=9, history=[];
  const positions=new Float32Array(rows*columns*3), uv=new Float32Array(rows*columns*2);
  const opacity=new Float32Array(rows*columns), indices=[];
  for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    const i=row*columns+col; uv[i*2]=col/(columns-1); uv[i*2+1]=row/(rows-1);
    if(row<rows-1&&col<columns-1) indices.push(i,i+columns,i+1,i+1,i+columns,i+columns+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  geometry.setAttribute('aAlpha',new THREE.BufferAttribute(opacity,1)); geometry.setIndex(indices);
  const uniforms={uTime:ocean.uniforms.uTime,uNight:ocean.uniforms.uNight,uStorm:ocean.uniforms.uStorm,uFlash:ocean.uniforms.uFlash};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute float aAlpha; varying float vAlpha; varying vec2 vUV; varying vec2 vWorld;
      void main(){vAlpha=aAlpha;vUV=uv;vWorld=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform float uTime,uNight,uStorm,uFlash; varying float vAlpha; varying vec2 vUV; varying vec2 vWorld;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 p=vWorld*1.2+vec2(uTime*.08,-uTime*.12);
        float n=noise(p)*.65+noise(p*3.7)*.35;
        float crossTrail=abs(vUV.x*2.0-1.0);
        float edge=1.0-smoothstep(.70,1.0,crossTrail);
        float shoulders=exp(-pow((crossTrail-.62)/.19,2.0));
        float foam=smoothstep(.37,.64,n)*(edge*.48+shoulders*.60);
        vec3 color=mix(vec3(.72,.83,.85),vec3(.16,.23,.31),uNight)*(1.0-uStorm*.34)+uFlash*.5;
        gl_FragColor=vec4(color,foam*vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const trail=new THREE.Mesh(geometry,material);trail.frustumCulled=false;trail.visible=false;scene.add(trail);

  const count=700, pointPositions=new Float32Array(count*3), alphas=new Float32Array(count), sizes=new Float32Array(count);
  const particles=Array.from({length:count},()=>({age:99,life:1,vx:0,vy:0,vz:0,alpha:0}));
  const pointGeometry=new THREE.BufferGeometry();
  pointGeometry.setAttribute('position',new THREE.BufferAttribute(pointPositions,3));
  pointGeometry.setAttribute('aAlpha',new THREE.BufferAttribute(alphas,1));
  pointGeometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
  const pointMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
    vertexShader:`attribute float aAlpha,aSize;varying float alpha;void main(){alpha=aAlpha;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aSize/max(.1,-p.z),1.0,42.0);}`,
    fragmentShader:`uniform float uNight,uStorm,uFlash;varying float alpha;void main(){
      vec2 p=gl_PointCoord-.5;float d=length(p)*2.0;if(d>1.0)discard;
      float mist=pow(1.0-d,1.7);
      vec3 color=mix(vec3(.78,.87,.89),vec3(.19,.27,.36),uNight)*(1.0-uStorm*.30)+uFlash*.5;
      gl_FragColor=vec4(color,mist*alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
  const spray=new THREE.Points(pointGeometry,pointMaterial);spray.frustumCulled=false;scene.add(spray);
  let cursor=0,emission=0,lastStamp=-1;
  function update(dt,time,ship,heading,speed) {
    ocean.setVessel(ship.position,heading,speed);
    const co=Math.cos(heading),si=Math.sin(heading);
    const world=(x,z)=>({x:ship.position.x+co*x-si*z,z:ship.position.z+si*x+co*z});
    if(speed>.12&&time-lastStamp>=.10) {
      const p=world(0,8.1);history.unshift({...p,time,speed,heading});history.length=Math.min(history.length,rows);lastStamp=time;
    }
    while(history.length&&time-history[history.length-1].time>12)history.pop();
    trail.visible=history.length>1;
    if(trail.visible) {
      for(let row=0;row<rows;row++) {
        const p=history[Math.min(row,history.length-1)],prev=history[Math.max(0,row-1)]||p,next=history[Math.min(row+1,history.length-1)];
        const dx=next.x-prev.x,dz=next.z-prev.z,length=Math.hypot(dx,dz);
        const nx=length>.001?-dz/length:Math.cos(p.heading),nz=length>.001?dx/length:Math.sin(p.heading);
        const age=time-p.time,spread=1.35+age*.42,fade=Math.pow(Math.max(0,1-age/12),1.5)*Math.min(.9,p.speed*.36);
        for(let col=0;col<columns;col++) {
          const offset=(col/(columns-1)*2-1)*spread,x=p.x+nx*offset,z=p.z+nz*offset,i=row*columns+col;
          positions[i*3]=x;positions[i*3+1]=ocean.heightAt(x,z,time)+.065;positions[i*3+2]=z;
          opacity[i]=row>=history.length?0:fade;
        }
      }
      geometry.attributes.position.needsUpdate=true;geometry.attributes.aAlpha.needsUpdate=true;
    }
    emission+=dt*speed*47;
    while(emission>=1) {
      emission--;const i=cursor++%count,particle=particles[i],bow=Math.random()<.67,side=Math.random()<.5?-1:1;
      const p=world(bow?side*(.6+Math.random()*.6):(Math.random()-.5)*2.6,bow?-8.6+Math.random()*1.1:8.1+Math.random());
      pointPositions[i*3]=p.x;pointPositions[i*3+1]=ocean.heightAt(p.x,p.z,time)+.12;pointPositions[i*3+2]=p.z;
      const vx=bow?side*(.65+speed*.26+Math.random()*.6):(Math.random()-.5)*.7;
      const vz=bow?.3+Math.random()*.5:.4+Math.random()*.6;
      Object.assign(particle,{age:0,life:bow?1.45:4.3,vx:co*vx-si*vz,vz:si*vx+co*vz,vy:bow?.65+Math.random()*.9:.2+Math.random()*.3,alpha:Math.min(.95,.4+speed*.15)});
      sizes[i]=bow?45+Math.random()*65:95+Math.random()*125;
    }
    for(let i=0;i<count;i++) {
      const p=particles[i];p.age+=dt;if(p.age>=p.life){alphas[i]=0;continue;}
      p.vy-=dt*2.2;pointPositions[i*3]+=p.vx*dt;pointPositions[i*3+2]+=p.vz*dt;
      pointPositions[i*3+1]=Math.max(ocean.heightAt(pointPositions[i*3],pointPositions[i*3+2],time)+.07,pointPositions[i*3+1]+p.vy*dt);
      alphas[i]=p.alpha*Math.pow(1-p.age/p.life,1.3);
    }
    for(const name of ['position','aAlpha','aSize'])pointGeometry.attributes[name].needsUpdate=true;
  }
  return {update};
};
