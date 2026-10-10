function createCombat(THREE, scene, { heightAt, onMessage = () => {}, onSound = () => {} } = {}) {
  const cannons = [], projectiles = [];
  const stats = { shots: 0, splashes: 0, activeProjectiles: 0 };
  const phases = [
    { name: '清膛', duration: 1.15 },
    { name: '装药', duration: 1.05 },
    { name: '填弹', duration: 1.1 },
    { name: '捣实', duration: 1.2 }
  ];
  const reloadDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);
  const sphereGeometry = new THREE.SphereGeometry(.11, 8, 6);
  const ballMaterial = new THREE.MeshStandardMaterial({ color: 0x22282a, metalness: .8, roughness: .26 });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x9a693e, roughness: .82 });
  const clothMaterial = new THREE.MeshStandardMaterial({ color: 0xdbd2b5, roughness: 1 });
  const powderMaterial = new THREE.MeshStandardMaterial({ color: 0x686955, roughness: 1 });
  const tempPosition = new THREE.Vector3(), tempDirection = new THREE.Vector3(), tempQuaternion = new THREE.Quaternion();
  const muzzleLight = new THREE.PointLight(0xffb456, 0, 12, 2);
  scene.add(muzzleLight);
  let flashRemaining = 0, currentTime = 0;

  function particles(capacity, additive) {
    const positions = new Float32Array(capacity * 3), colors = new Float32Array(capacity * 3);
    const sizes = new Float32Array(capacity), alpha = new Float32Array(capacity);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    const material = new THREE.ShaderMaterial({
      vertexColors: true, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute float aSize; attribute float aAlpha; varying vec3 vColor; varying float vAlpha;
        void main(){ vColor=color; vAlpha=aAlpha; vec4 view=modelViewMatrix*vec4(position,1.0);
        gl_Position=projectionMatrix*view; gl_PointSize=clamp(aSize*330.0/max(0.2,-view.z),1.0,100.0); }`,
      fragmentShader: `varying vec3 vColor; varying float vAlpha;
        void main(){ float radius=length(gl_PointCoord-0.5)*2.0; if(radius>1.0)discard;
        float soft=pow(max(0.0,1.0-radius),1.45); gl_FragColor=vec4(vColor,vAlpha*soft); }`
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    const data = Array.from({ length: capacity }, () => ({ life: 0, maxLife: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, gravity: 0, grow: 0, size: 0, opacity: 0 }));
    let cursor = 0;
    return {
      emit(position, velocity, color, life, size, gravity = 0, grow = 0, opacity = 1) {
        const i = cursor; cursor = (cursor + 1) % capacity;
        Object.assign(data[i], { life, maxLife: life, x: position.x, y: position.y, z: position.z, vx: velocity.x, vy: velocity.y, vz: velocity.z, gravity, grow, size, opacity });
        colors[i * 3] = color[0]; colors[i * 3 + 1] = color[1]; colors[i * 3 + 2] = color[2];
      },
      update(dt) {
        for (let i = 0; i < capacity; i++) {
          const p = data[i];
          if (p.life <= 0) { alpha[i] = 0; continue; }
          p.life -= dt;
          p.vy -= p.gravity * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          p.size += p.grow * dt;
          positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
          sizes[i] = p.size;
          alpha[i] = Math.max(0, p.life / p.maxLife) * p.opacity;
        }
        for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true;
      }
    };
  }
  const flames = particles(100, true), smoke = particles(220, false), splash = particles(220, false);

  function addCannon(group, barrel, muzzle, port = null) {
    const c = {
      group, barrel, muzzle: (muzzle.isVector3 ? muzzle : muzzle.position).clone(), port, restPosition: barrel.position.clone(),
      reload: 0, lastPhase: -1, shotAge: 10, shots: 0, loader: new THREE.Group()
    };
    c.loader.position.copy(c.muzzle);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, 1.8, 6), woodMaterial);
    rod.rotation.x = -Math.PI / 2; rod.position.z = -.8;
    const swab = new THREE.Mesh(new THREE.SphereGeometry(.095, 7, 5), clothMaterial);
    swab.scale.set(1, 1, 1.8); swab.position.z = .1;
    c.ramrod = new THREE.Group(); c.ramrod.add(rod, swab); c.loader.add(c.ramrod);
    c.powder = new THREE.Mesh(new THREE.SphereGeometry(.13, 7, 5), powderMaterial);
    c.powder.scale.set(.85, .85, 1.4); c.loader.add(c.powder);
    c.loadingBall = new THREE.Mesh(sphereGeometry, ballMaterial); c.loader.add(c.loadingBall);
    c.loader.visible = false; barrel.add(c.loader);
    group.userData.cannon = c;
    cannons.push(c);
    return c;
  }

  function getPhase(c) {
    let elapsed = reloadDuration - c.reload;
    for (let i = 0; i < phases.length; i++) {
      if (elapsed < phases[i].duration) return { index: i, name: phases[i].name, progress: elapsed / phases[i].duration };
      elapsed -= phases[i].duration;
    }
    return { index: 3, name: phases[3].name, progress: 1 };
  }

  function getStatus(c) {
    if (!c || !cannons.includes(c)) return { ready: false, phase: '未选择火炮', progress: 0, remaining: 0, blocked: false, shots: 0 };
    const blocked = !!c.port && !c.port.open;
    return {
      ready: c.reload <= 0 && !blocked,
      phase: c.reload > 0 ? getPhase(c).name : blocked ? '炮门关闭' : '已装填',
      progress: c.reload > 0 ? 1 - c.reload / reloadDuration : 1,
      remaining: Math.max(0, c.reload), blocked, shots: c.shots
    };
  }

  function muzzleBurst(position, direction) {
    for (let i = 0; i < 22; i++) {
      const velocity = direction.clone().multiplyScalar(3 + Math.random() * 7);
      velocity.x += (Math.random() - .5) * 4; velocity.y += (Math.random() - .5) * 4; velocity.z += (Math.random() - .5) * 4;
      flames.emit(position, velocity, [1, .38 + Math.random() * .4, .06], .13 + Math.random() * .22, .45 + Math.random() * .6, 0, .8);
    }
    for (let i = 0; i < 20; i++) {
      const velocity = direction.clone().multiplyScalar(1 + Math.random() * 4);
      velocity.x += (Math.random() - .5) * 1.5; velocity.y += .3 + Math.random() * 1.7; velocity.z += (Math.random() - .5) * 1.5;
      const shade = .53 + Math.random() * .22;
      smoke.emit(position, velocity, [shade, shade * .98, shade * .91], 2 + Math.random() * 2, .7 + Math.random() * .6, -.04, .65, .7);
    }
    muzzleLight.position.copy(position); flashRemaining = .11;
  }

  function fire(c) {
    if (!c || !cannons.includes(c)) return false;
    if (c.port && !c.port.open) { onMessage('先打开这门炮的炮门'); return false; }
    if (c.reload > 0) { onMessage(getPhase(c).name + '中'); return false; }
    c.barrel.updateWorldMatrix(true, false);
    tempPosition.copy(c.muzzle); c.barrel.localToWorld(tempPosition);
    c.barrel.getWorldQuaternion(tempQuaternion);
    tempDirection.set(0, 0, -1).applyQuaternion(tempQuaternion).normalize();
    const ball = new THREE.Mesh(sphereGeometry, ballMaterial);
    ball.name = 'combat-projectile';
    ball.position.copy(tempPosition); ball.castShadow = true; scene.add(ball);
    projectiles.push({ mesh: ball, velocity: tempDirection.clone().multiplyScalar(27), age: 0, previous: ball.position.clone() });
    stats.shots++; stats.activeProjectiles = projectiles.length;
    c.reload = reloadDuration; c.shotAge = 0; c.lastPhase = 0; c.shots++;
    muzzleBurst(tempPosition, tempDirection);
    onSound('cannon', tempPosition.clone()); onMessage('开火 · 清膛');
    return true;
  }

  function skip(c) {
    if (!c || !cannons.includes(c) || c.reload <= 0) return false;
    c.reload = 0; c.loader.visible = false; c.barrel.position.copy(c.restPosition);
    onMessage('简化装填完成'); onSound('reload'); return true;
  }

  function hitWater(position) {
    stats.splashes++;
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2, radius = 1 + Math.random() * 3;
      const velocity = new THREE.Vector3(Math.cos(angle) * radius, 2 + Math.random() * 5, Math.sin(angle) * radius);
      splash.emit(position, velocity, [.78, .97, 1], .5 + Math.random() * .9, .15 + Math.random() * .28, 8, .08, .95);
    }
    for (let i = 0; i < 18; i++) {
      const angle = i / 18 * Math.PI * 2;
      splash.emit(position, new THREE.Vector3(Math.cos(angle) * 2.7, .07, Math.sin(angle) * 2.7), [.9, 1, 1], 1.3, .4, 0, .35, .6);
    }
    onSound('splash', position.clone());
  }

  function update(dt, time) {
    currentTime = Number.isFinite(time) ? time : currentTime + dt;
    for (const c of cannons) {
      c.shotAge += dt;
      const recoil = c.shotAge < .12 ? .37 * Math.sin(c.shotAge / .12 * Math.PI / 2) : .37 * Math.exp(-(c.shotAge - .12) * 5);
      tempDirection.set(0, 0, 1).applyQuaternion(c.barrel.quaternion);
      c.barrel.position.copy(c.restPosition).addScaledVector(tempDirection, recoil);
      if (c.reload <= 0) continue;
      c.reload = Math.max(0, c.reload - dt);
      if (!c.reload) { c.loader.visible = false; onSound('reload'); continue; }
      const phase = getPhase(c);
      c.loader.visible = true;
      c.ramrod.visible = phase.index === 0 || phase.index === 3;
      c.powder.visible = phase.index === 1;
      c.loadingBall.visible = phase.index === 2;
      c.ramrod.position.z = -.35 + Math.sin(phase.progress * Math.PI * 3) * .65;
      c.powder.position.set(0, 0, -.75 + phase.progress * .95);
      c.loadingBall.position.set(0, 0, -.85 + phase.progress * 1.03);
      if (phase.index !== c.lastPhase) { c.lastPhase = phase.index; onSound('ram'); }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]; p.age += dt; p.previous.copy(p.mesh.position);
      p.velocity.y -= 9.81 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      const sea = typeof heightAt === 'function' ? heightAt(p.mesh.position.x, p.mesh.position.z, currentTime) : 0;
      if (p.mesh.position.y <= sea || p.age > 15) {
        if (p.age <= 15) {
          const prevSea = typeof heightAt === 'function' ? heightAt(p.previous.x, p.previous.z, currentTime) : 0;
          const above = p.previous.y - prevSea, below = sea - p.mesh.position.y;
          const fraction = THREE.MathUtils.clamp(above / Math.max(.0001, above + below), 0, 1);
          tempPosition.copy(p.previous).lerp(p.mesh.position, fraction);
          tempPosition.y = typeof heightAt === 'function' ? heightAt(tempPosition.x, tempPosition.z, currentTime) : 0;
          hitWater(tempPosition);
        }
        scene.remove(p.mesh); projectiles.splice(i, 1); stats.activeProjectiles = projectiles.length;
      }
    }
    flashRemaining = Math.max(0, flashRemaining - dt);
    muzzleLight.intensity = flashRemaining / .11 * 20;
    flames.update(dt); smoke.update(dt); splash.update(dt);
  }
  return { addCannon, fire, skip, update, getStatus, stats };
}
