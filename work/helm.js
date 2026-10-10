/* A captured, angle-based helm; input, wheel graphics and the rudder share one command. */
window.createHelm = function createHelm({wheels,readouts,getRudder,setRudder}) {
  const limit=35*Math.PI/180, wheelTravel=210, ratio=wheelTravel/35;
  let target=getRudder(),visual=target,active=null;
  const clamp=v=>Math.max(-limit,Math.min(limit,v));
  const describe=v=>Math.abs(v)<.5?'正舵 · 0°':(v<0?'左舵':'右舵')+' · '+Math.abs(Math.round(v))+'°';
  function setTarget(value){if(Number.isFinite(value))target=clamp(value);}
  function nudge(delta){setTarget(target+delta);}
  function center(){setTarget(0);}
  function release() {
    if(!active)return;
    const {wheel,id}=active;active=null;wheel.classList.remove('is-gripping');
    if(wheel.hasPointerCapture(id))wheel.releasePointerCapture(id);
  }
  function point(event,wheel) {
    const r=wheel.getBoundingClientRect(),x=event.clientX-r.left-r.width/2,y=event.clientY-r.top-r.height/2;
    return Math.hypot(x,y)<r.width*.17?null:Math.atan2(y,x);
  }
  for(const [index,wheel] of wheels.entries()) {
    const prefix='helm-'+index;
    const spokes=Array.from({length:8},(_,i)=>`<g transform="rotate(${i*45} 120 120)">
      <path d="M114 117L114 55Q114 50 117 49L117 35L123 35L123 49Q126 50 126 55L126 117Z" fill="url(#${prefix}-wood)" stroke="#452717" stroke-width="1.5"/>
      <path d="M116 49L117 98" stroke="#d7ae71" stroke-width="1" opacity=".7"/>
      <rect x="113" y="32" width="14" height="9" rx="2" fill="url(#${prefix}-brass)" stroke="#72502a"/>
      <path d="M117 9Q111 10 111 16L114 28Q115 33 120 33Q125 33 126 28L129 16Q129 10 123 9Z" fill="url(#${prefix}-wood)" stroke="#402519" stroke-width="2"/>
      <path d="M116 13Q114 19 118 27" fill="none" stroke="#efcd89" stroke-width="1.5" opacity=".75"/>
    </g>`).join('');
    wheel.innerHTML=`<svg class="helm-art" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${prefix}-wood"><stop stop-color="#58321e"/><stop offset=".3" stop-color="#aa7845"/><stop offset=".5" stop-color="#d3a15e"/><stop offset=".72" stop-color="#906038"/><stop offset="1" stop-color="#4d2b1a"/></linearGradient>
        <linearGradient id="${prefix}-brass" x2=".8" y2="1"><stop stop-color="#f6df9d"/><stop offset=".45" stop-color="#bb9254"/><stop offset="1" stop-color="#715032"/></linearGradient>
        <radialGradient id="${prefix}-hub" cx="35%" cy="30%"><stop stop-color="#edcd88"/><stop offset=".65" stop-color="#b18b4d"/><stop offset="1" stop-color="#6a492a"/></radialGradient>
      </defs>
      <g class="helm-rotor">
        ${spokes}
        <circle cx="120" cy="120" r="76" fill="none" stroke="#3f261a" stroke-width="20"/>
        <circle cx="120" cy="120" r="76" fill="none" stroke="url(#${prefix}-wood)" stroke-width="15"/>
        <circle cx="120" cy="120" r="83" fill="none" stroke="#e3bc77" stroke-width="1.5" opacity=".72"/>
        <circle cx="120" cy="120" r="69" fill="none" stroke="#3b2318" stroke-width="2"/>
        <circle cx="120" cy="120" r="77" fill="none" stroke="#5a341e" stroke-width="1" stroke-dasharray="24 4 3 4" opacity=".7"/>
        <path d="M114 39L126 39M113 43L127 43M114 47L126 47" stroke="#efe1bc" stroke-width="2.5"/>
        <circle cx="120" cy="120" r="23" fill="url(#${prefix}-brass)" stroke="#3b281a" stroke-width="2"/>
        <circle cx="120" cy="120" r="16" fill="url(#${prefix}-hub)" stroke="#e1bc75" stroke-width="1.5"/>
        <circle cx="120" cy="120" r="5" fill="#5e4028" stroke="#f0d08d" stroke-width="1.5"/>
        <g fill="#63482f"><circle cx="120" cy="101" r="2"/><circle cx="139" cy="120" r="2"/><circle cx="120" cy="139" r="2"/><circle cx="101" cy="120" r="2"/></g>
      </g>
    </svg>`;
    wheel.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.isPrimary===false)return;
      e.preventDefault();e.stopPropagation();release();wheel.focus({preventScroll:true});
      active={wheel,id:e.pointerId,angle:point(e,wheel)};wheel.setPointerCapture(e.pointerId);wheel.classList.add('is-gripping');
    });
    wheel.addEventListener('pointermove',e=>{
      if(!active||active.wheel!==wheel||active.id!==e.pointerId)return;
      e.preventDefault();e.stopPropagation();const angle=point(e,wheel);
      if(angle!==null&&active.angle!==null){
        let delta=angle-active.angle;delta=Math.atan2(Math.sin(delta),Math.cos(delta));
        nudge(delta/ratio*(e.shiftKey?.25:1));
      }
      active.angle=angle;
    });
    for(const name of ['pointerup','pointercancel','lostpointercapture'])wheel.addEventListener(name,e=>{
      if(active?.wheel===wheel&&active.id===e.pointerId)release();
    });
    wheel.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','c','C'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      if(['Home','c','C'].includes(e.key)){center();return;}
      nudge((['ArrowLeft','ArrowDown'].includes(e.key)?-1:1)*(e.shiftKey?.25:1)*Math.PI/180);
    });
  }
  addEventListener('blur',release);
  function update(dt) {
    // The wheel responds immediately; the rudder takes a fraction of a second to follow.
    visual+=(target-visual)*(1-Math.exp(-24*dt));
    let actual=getRudder()+(target-getRudder())*(1-Math.exp(-10*dt));
    if(Math.abs(actual-target)<.0001)actual=target;setRudder(actual);
    const degrees=target*180/Math.PI,label=describe(degrees);
    for(const wheel of wheels){
      wheel.style.setProperty('--helm-turn',(visual*180/Math.PI*ratio)+'deg');
      wheel.setAttribute('aria-valuenow',String(Math.round(degrees*10)/10));
      wheel.setAttribute('aria-valuetext',label);
      wheel.classList.toggle('at-limit',Math.abs(target)>limit-.001);
    }
    for(const readout of readouts)readout.textContent=label;
  }
  return {setTarget,nudge,center,update,release,wheelRatio:ratio};
};
