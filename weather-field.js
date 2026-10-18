import * as THREE from './vendor/three.module.js';

// Particles live in world space. Only drops leaving the padded view are recycled;
// turning the camera does not rotate gravity or move surviving drops with it.
export function createWeatherField({world,camera,reducedMotion=false,random=Math.random,shelters=[]}){
  const group=new THREE.Group();group.name='Seoul weather field';world.add(group);
  const columns=24,rows=16,rainCount=columns*rows*6,snowCount=columns*rows*3;
  function precipitation(count,isRain){
    const positions=new Float32Array(count*(isRain?6:3)),geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    const material=isRain?new THREE.LineBasicMaterial({color:0xc2d9e9,transparent:true,opacity:.46,depthWrite:false,depthTest:true}):new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,depthTest:true,uniforms:{pixelScale:{value:500}},
      vertexShader:'uniform float pixelScale;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(pixelScale*.13/max(1.,-p.z),1.25,7.);}',
      fragmentShader:'void main(){float r=length(gl_PointCoord-.5);float a=1.-smoothstep(.08,.5,r);gl_FragColor=vec4(.96,.98,1.,a*.9);}'
    });
    const object=isRain?new THREE.LineSegments(geometry,material):new THREE.Points(geometry,material);
    object.name=isRain?'Seoul world rain':'Seoul world snow';object.frustumCulled=false;object.visible=false;group.add(object);
    return {object,positions,count,stride:isRain?6:3,initialized:false};
  }
  const rainField=precipitation(rainCount,true),snowField=precipitation(snowCount,false),fields=[rainField,snowField],fractions=[0,.09,.34,1];
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(600,48,24),new THREE.ShaderMaterial({
    side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:true,fog:false,
    uniforms:{time:{value:0},cover:{value:0},daylight:{value:1},storm:{value:0},origin:{value:new THREE.Vector3()}},
    vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      varying vec3 direction;
      uniform float time,cover,daylight,storm;
      uniform vec3 origin;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p,float footprint){
        // Average unresolved octaves instead of letting the horizon shimmer.
        return .56*mix(.5,noise(p),1.-smoothstep(.4,1.,footprint))
          +.28*mix(.5,noise(p*2.03+7.),1.-smoothstep(.2,.5,footprint))
          +.16*mix(.5,noise(p*4.01+13.),1.-smoothstep(.1,.25,footprint));
      }
      void main(){
        vec3 ray=normalize(direction);
        if(ray.y<-.045)discard;
        // Intersect a high cloud layer in world coordinates: overhead and every
        // horizon share the same continuous field, with wind and real parallax.
        float height=max(35.,145.-origin.y);
        vec2 location=origin.xz+ray.xz*height/sqrt(ray.y*ray.y+.045*.045);
        vec3 p=vec3(location*.012+vec2(time*.013,time*.004),.35);
        float footprint=max(length(dFdx(p.xy)),length(dFdy(p.xy)));
        float body=fbm(p,footprint),detail=fbm(p*1.9+vec3(0.,0.,body*2.),footprint*1.9);
        float horizonFilter=smoothstep(.025,.13,ray.y);
        body=mix(.5,body,horizonFilter);detail=mix(.5,detail,horizonFilter);
        float density=smoothstep(.79-cover*.46,.98-cover*.35,body*.78+detail*.22);
        float blanket=smoothstep(.72,1.,cover)*.86;
        float alpha=max(density,blanket)*smoothstep(-.045,.045,ray.y)*.94;
        vec3 shade=mix(vec3(.08,.12,.18),vec3(.16,.21,.26),daylight);
        vec3 light=mix(vec3(.27,.33,.41),vec3(.88,.91,.93),daylight);
        // Coverage and lighting are independent: an unbroken overcast layer
        // still has broad dense bodies, darker undersides and softer edges.
        float mass=clamp(smoothstep(.26,.72,body)+(detail-.5)*.42+.12+.15*(1.-max(0.,ray.y)),0.,1.);
        vec3 color=mix(light,shade,mass)*(1.-storm*.2);
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  clouds.name='Seoul continuous cloud sky';clouds.visible=false;clouds.renderOrder=-1;clouds.frustumCulled=false;group.add(clouds);
  const viewProjection=new THREE.Matrix4(),clip=new THREE.Vector4(),point=new THREE.Vector3(),ray=new THREE.Vector3(),cameraPosition=new THREE.Vector3(),previousPosition=new THREE.Vector3(),previousQuaternion=new THREE.Quaternion();
  let lastTime=null,elapsed=0,wasActive=false,hasCamera=false;
  function setWeather({kind='clear',code=0,cover=0,day=true}={}){
    const wasRain=rainField.object.visible,wasSnow=snowField.object.visible;
    rainField.object.visible=kind==='rain'||kind==='storm';snowField.object.visible=kind==='snow';
    if(wasRain!==rainField.object.visible)rainField.initialized=false;
    if(wasSnow!==snowField.object.visible)snowField.initialized=false;
    const reported=Number.isFinite(cover)?THREE.MathUtils.clamp(cover/100,0,1):0;
    const amount=kind==='rain'||kind==='storm'||kind==='snow'?Math.max(.88,reported):code===3?Math.max(.92,reported):code===2?Math.max(.48,reported):code===1?Math.max(.22,Math.min(.55,reported)):kind==='fog'?Math.max(.65,reported):reported;
    clouds.visible=amount>.03;clouds.material.uniforms.cover.value=amount;clouds.material.uniforms.daylight.value=day?1:0;clouds.material.uniforms.storm.value=kind==='storm'?1:0;
    rainField.object.material.opacity=kind==='storm'?.6:.46;
  }
  function spawn(field,i){
    // Jittered view strata seed all visible regions, across three depth layers.
    // Sampling is only at birth; positions then fall independently of the camera.
    const cell=i%(columns*rows),layer=Math.floor(i/(columns*rows))%3;
    point.set(((cell%columns+random())/columns*2-1)*1.16,((Math.floor(cell/columns)+random())/rows*2-1)*1.16,.5).unproject(camera);
    ray.copy(point).sub(cameraPosition).normalize();
    let far=THREE.MathUtils.clamp(cameraPosition.y*2+90,90,320);
    if(ray.y<-.0001)far=Math.min(far,Math.max(.35,(cameraPosition.y-.12)/-ray.y));
    const near=Math.min(.65,far*.2);
    const distance=near+(far-near)*(fractions[layer]+random()*(fractions[layer+1]-fractions[layer]));
    const j=i*field.stride;field.positions[j]=cameraPosition.x+ray.x*distance;field.positions[j+1]=Math.max(.08,cameraPosition.y+ray.y*distance);field.positions[j+2]=cameraPosition.z+ray.z*distance;
  }
  function update(time){
    const active=world.visible&&!globalThis.document?.hidden;
    const dt=reducedMotion||lastTime===null||!active||!wasActive?0:THREE.MathUtils.clamp(time-lastTime,0,.05);
    lastTime=time;wasActive=active;if(!active)return;
    elapsed+=dt;camera.updateMatrixWorld();camera.getWorldPosition(cameraPosition);
    viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const cut=!hasCamera||cameraPosition.distanceToSquared(previousPosition)>100||Math.abs(camera.quaternion.dot(previousQuaternion))<.92;
    previousPosition.copy(cameraPosition);previousQuaternion.copy(camera.quaternion);hasCamera=true;
    clouds.position.copy(cameraPosition);clouds.material.uniforms.origin.value.copy(cameraPosition);clouds.material.uniforms.time.value=elapsed;
    for(const field of fields){
      if(!field.object.visible)continue;
      const isRain=field===rainField,positions=field.positions;
      for(let i=0;i<field.count;i++){
        const j=i*field.stride;
        positions[j]+=dt*(isRain?.9:.25+Math.sin(elapsed*.8+i)*.2);positions[j+1]-=dt*(isRain?14:.9);positions[j+2]+=dt*(isRain?.24:.12);
        clip.set(positions[j],positions[j+1],positions[j+2],1).applyMatrix4(viewProjection);
        if(cut||!field.initialized||positions[j+1]<.06||clip.w<.2||Math.abs(clip.x)>clip.w*1.22||Math.abs(clip.y)>clip.w*1.22||clip.z>clip.w)spawn(field,i);
        // A cutaway room still has a physical roof. Re-emit above it rather than
        // allowing newly seeded precipitation to appear inside the open model.
        for(const roof of shelters)if(positions[j]>=roof.min.x&&positions[j]<=roof.max.x&&positions[j+2]>=roof.min.z&&positions[j+2]<=roof.max.z&&positions[j+1]<=roof.max.y)positions[j+1]=roof.max.y+.65+random()*4;
        if(isRain){
          const distance=Math.hypot(positions[j]-cameraPosition.x,positions[j+1]-cameraPosition.y,positions[j+2]-cameraPosition.z);
          const length=Math.min(.4,Math.max(.001,distance*.005));
          positions[j+3]=positions[j]-length*.064;positions[j+4]=positions[j+1]+length;positions[j+5]=positions[j+2]-length*.016;
        }
      }
      field.initialized=true;field.object.geometry.attributes.position.needsUpdate=true;
    }
  }
  return {rain:rainField.object,snow:snowField.object,clouds,rainCount,snowCount,setWeather,update};
}
