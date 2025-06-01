import{M as w,C as x,S as D,P,W as E,a as I,O as z,I as b,b as A,c as T,d as R,T as O,E as B}from"./three-VJT_cP70.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const p of a.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&o(p)}).observe(document,{childList:!0,subtree:!0});function e(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(s){if(s.ep)return;s.ep=!0;const a=e(s);fetch(s.href,a)}})();class L extends w{constructor(t=6,e=!0){super(),this.uniforms={chromaticAberration:{value:.05},transmission:{value:1},_transmission:{value:1},transmissionMap:{value:null},roughness:{value:0},thickness:{value:0},thicknessMap:{value:null},attenuationDistance:{value:1/0},attenuationColor:{value:new x("white")},anisotropy:{value:.1},time:{value:0},distortion:{value:0},distortionScale:{value:.5},temporalDistortion:{value:0},buffer:{value:null}},this.onBeforeCompile=o=>{o.uniforms={...o.uniforms,...this.uniforms},e?o.defines.USE_SAMPLER="":o.defines.USE_TRANSMISSION="",o.fragmentShader=`
        uniform float chromaticAberration;         
        uniform float anisotropy;      
        uniform float time;
        uniform float distortion;
        uniform float distortionScale;
        uniform float temporalDistortion;
        uniform sampler2D buffer;
        vec3 random3(vec3 c) {
          float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
          vec3 r;
          r.z = fract(512.0*j);
          j *= .125;
          r.x = fract(512.0*j);
          j *= .125;
          r.y = fract(512.0*j);
          return r-0.5;
        }
        float seed = 0.0;
        uint hash( uint x ) {
          x += ( x << 10u );
          x ^= ( x >>  6u );
          x += ( x <<  3u );
          x ^= ( x >> 11u );
          x += ( x << 15u );
          return x;
        }
        // Compound versions of the hashing algorithm I whipped together.
        uint hash( uvec2 v ) { return hash( v.x ^ hash(v.y)                         ); }
        uint hash( uvec3 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z)             ); }
        uint hash( uvec4 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) ); }
        // Construct a float with half-open range [0:1] using low 23 bits.
        // All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
        float floatConstruct( uint m ) {
          const uint ieeeMantissa = 0x007FFFFFu; // binary32 mantissa bitmask
          const uint ieeeOne      = 0x3F800000u; // 1.0 in IEEE binary32
          m &= ieeeMantissa;                     // Keep only mantissa bits (fractional part)
          m |= ieeeOne;                          // Add fractional part to 1.0
          float  f = uintBitsToFloat( m );       // Range [1:2]
          return f - 1.0;                        // Range [0:1]
        }
        // Pseudo-random value in half-open range [0:1].
        float random( float x ) { return floatConstruct(hash(floatBitsToUint(x))); }
        float random( vec2  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
        float random( vec3  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
        float random( vec4  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
        float rand() {
          float result = random(vec3(gl_FragCoord.xy, seed));
          seed += 1.0;
          return result;
        }
        const float F3 =  0.3333333;
        const float G3 =  0.1666667;
        float snoise(vec3 p) {
          vec3 s = floor(p + dot(p, vec3(F3)));
          vec3 x = p - s + dot(s, vec3(G3));
          vec3 e = step(vec3(0.0), x - x.yzx);
          vec3 i1 = e*(1.0 - e.zxy);
          vec3 i2 = 1.0 - e.zxy*(1.0 - e);
          vec3 x1 = x - i1 + G3;
          vec3 x2 = x - i2 + 2.0*G3;
          vec3 x3 = x - 1.0 + 3.0*G3;
          vec4 w, d;
          w.x = dot(x, x);
          w.y = dot(x1, x1);
          w.z = dot(x2, x2);
          w.w = dot(x3, x3);
          w = max(0.6 - w, 0.0);
          d.x = dot(random3(s), x);
          d.y = dot(random3(s + i1), x1);
          d.z = dot(random3(s + i2), x2);
          d.w = dot(random3(s + 1.0), x3);
          w *= w;
          w *= w;
          d *= w;
          return dot(d, vec4(52.0));
        }
        float snoiseFractal(vec3 m) {
          return 0.5333333* snoise(m)
                +0.2666667* snoise(2.0*m)
                +0.1333333* snoise(4.0*m)
                +0.0666667* snoise(8.0*m);
        }
`+o.fragmentShader,o.fragmentShader=o.fragmentShader.replace("#include <transmission_pars_fragment>",`
          #ifdef USE_TRANSMISSION
            // Transmission code is based on glTF-Sampler-Viewer
            // https://github.com/KhronosGroup/glTF-Sample-Viewer
            uniform float _transmission;
            uniform float thickness;
            uniform float attenuationDistance;
            uniform vec3 attenuationColor;
            #ifdef USE_TRANSMISSIONMAP
              uniform sampler2D transmissionMap;
            #endif
            #ifdef USE_THICKNESSMAP
              uniform sampler2D thicknessMap;
            #endif
            uniform vec2 transmissionSamplerSize;
            uniform sampler2D transmissionSamplerMap;
            uniform mat4 modelMatrix;
            uniform mat4 projectionMatrix;
            varying vec3 vWorldPosition;
            vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
              // Direction of refracted light.
              vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
              // Compute rotation-independant scaling of the model matrix.
              vec3 modelScale;
              modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
              modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
              modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
              // The thickness is specified in local space.
              return normalize( refractionVector ) * thickness * modelScale;
            }
            float applyIorToRoughness( const in float roughness, const in float ior ) {
              // Scale roughness with IOR so that an IOR of 1.0 results in no microfacet refraction and
              // an IOR of 1.5 results in the default amount of microfacet refraction.
              return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
            }
            vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
              float framebufferLod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );            
              #ifdef USE_SAMPLER
                #ifdef texture2DLodEXT
                  return texture2DLodEXT(transmissionSamplerMap, fragCoord.xy, framebufferLod);
                #else
                  return texture2D(transmissionSamplerMap, fragCoord.xy, framebufferLod);
                #endif
              #else
                return texture2D(buffer, fragCoord.xy);
              #endif
            }
            vec3 applyVolumeAttenuation( const in vec3 radiance, const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
              if ( isinf( attenuationDistance ) ) {
                // Attenuation distance is +∞, i.e. the transmitted color is not attenuated at all.
                return radiance;
              } else {
                // Compute light attenuation using Beer's law.
                vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
                vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance ); // Beer's law
                return transmittance * radiance;
              }
            }
            vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
              const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
              const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
              const in vec3 attenuationColor, const in float attenuationDistance ) {
              vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
              vec3 refractedRayExit = position + transmissionRay;
              // Project refracted vector on the framebuffer, while mapping to normalized device coordinates.
              vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
              vec2 refractionCoords = ndcPos.xy / ndcPos.w;
              refractionCoords += 1.0;
              refractionCoords /= 2.0;
              // Sample framebuffer to get pixel the refracted ray hits.
              vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
              vec3 attenuatedColor = applyVolumeAttenuation( transmittedLight.rgb, length( transmissionRay ), attenuationColor, attenuationDistance );
              // Get the specular component.
              vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
              return vec4( ( 1.0 - F ) * attenuatedColor * diffuseColor, transmittedLight.a );
            }
          #endif
`),o.fragmentShader=o.fragmentShader.replace("#include <transmission_fragment>",`  
          // Improve the refraction to use the world pos
          material.transmission = _transmission;
          material.transmissionAlpha = 1.0;
          material.thickness = thickness;
          material.attenuationDistance = attenuationDistance;
          material.attenuationColor = attenuationColor;
          #ifdef USE_TRANSMISSIONMAP
            material.transmission *= texture2D( transmissionMap, vUv ).r;
          #endif
          #ifdef USE_THICKNESSMAP
            material.thickness *= texture2D( thicknessMap, vUv ).g;
          #endif
          
          vec3 pos = vWorldPosition;
          vec3 v = normalize( cameraPosition - pos );
          vec3 n = inverseTransformDirection( normal, viewMatrix );
          vec3 transmission = vec3(0.0);
          float transmissionR, transmissionB, transmissionG;
          float randomCoords = rand();
          float thickness_smear = thickness * max(pow(roughness, 0.33), anisotropy);
          vec3 distortionNormal = vec3(0.0);
          vec3 temporalOffset = vec3(time, -time, -time) * temporalDistortion;
          if (distortion > 0.0) {
            distortionNormal = distortion * vec3(snoiseFractal(vec3((pos * distortionScale + temporalOffset))), snoiseFractal(vec3(pos.zxy * distortionScale - temporalOffset)), snoiseFractal(vec3(pos.yxz * distortionScale + temporalOffset)));
          }
          for (float i = 0.0; i < ${t}.0; i ++) {
            vec3 sampleNorm = normalize(n + roughness * roughness * 2.0 * normalize(vec3(rand() - 0.5, rand() - 0.5, rand() - 0.5)) * pow(rand(), 0.33) + distortionNormal);
            transmissionR = getIBLVolumeRefraction(
              sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
              pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness  + thickness_smear * (i + randomCoords) / float(${t}),
              material.attenuationColor, material.attenuationDistance
            ).r;
            transmissionG = getIBLVolumeRefraction(
              sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
              pos, modelMatrix, viewMatrix, projectionMatrix, material.ior  * (1.0 + chromaticAberration * (i + randomCoords) / float(${t})) , material.thickness + thickness_smear * (i + randomCoords) / float(${t}),
              material.attenuationColor, material.attenuationDistance
            ).g;
            transmissionB = getIBLVolumeRefraction(
              sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
              pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * (1.0 + 2.0 * chromaticAberration * (i + randomCoords) / float(${t})), material.thickness + thickness_smear * (i + randomCoords) / float(${t}),
              material.attenuationColor, material.attenuationDistance
            ).b;
            transmission.r += transmissionR;
            transmission.g += transmissionG;
            transmission.b += transmissionB;
          }
          transmission /= ${t}.0;
          totalDiffuse = mix( totalDiffuse, transmission.rgb, material.transmission );
`)},Object.keys(this.uniforms).forEach(o=>Object.defineProperty(this,o,{get:()=>this.uniforms[o].value,set:s=>this.uniforms[o].value=s}))}}class H{constructor(t){this.container=t,this.scene=null,this.camera=null,this.renderer=null,this.orb=null,this.controls=null,this.lights=[],this.animationId=null,this.audioContext=null,this.audioAnalyser=null,this.audioData=null,this.audioElement=null,this.audioInitialized=!1,this.animate=this.animate.bind(this),this.handleResize=this.handleResize.bind(this),this.initAudio=this.initAudio.bind(this),this.init()}init(){this.initScene(),this.createCamera(),this.createRenderer(),this.initControls(),this.createOrb(),this.loadEnvironmentMap(),this.initAudio(),window.addEventListener("resize",this.handleResize),this.animate()}initScene(){this.scene=new D,this.scene.background=new x(529439)}createCamera(){this.aspect=this.container.clientWidth/this.container.clientHeight,this.camera=new P(75,this.aspect,.1,1e3),this.camera.position.z=5}createRenderer(){this.renderer=new E({antialias:!0}),this.renderer.setSize(this.container.clientWidth,this.container.clientHeight),this.renderer.setPixelRatio(1),this.renderer.outputEncoding=void 0,this.renderer.toneMapping=I,this.renderer.toneMappingExposure=1.45,this.container.appendChild(this.renderer.domElement)}initControls(){this.controls=new z(this.camera,this.renderer.domElement),this.controls.enableDamping=!0,this.controls.dampingFactor=.05,this.controls.enableZoom=!1}createOrb(){const t=new b(2.5,32),e=new b(1.75,9);this.originalPositions=t.attributes.position.array.slice(),this.smallOriginalPositions=e.attributes.position.array.slice(),this.orb=new A(t);const o=new T({uniforms:{color:{value:new x(16777215)}},vertexShader:`
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 0.075 * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,fragmentShader:`
        uniform vec3 color;
        
        void main() {
          // Calculate the distance from the center of the point
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // Create a perfect circle with soft edges
          float circle = smoothstep(0.5, 0.4, dist);
          
          // Add a 3D sphere effect with lighting
          float light = 0.5 + 0.5 * (1.7 - dist * 2.5);
          
          // Combine for final color with alpha for perfect circles
          if (dist > 0.5) discard; // Perfect circle cutoff
          gl_FragColor = vec4(color * light, circle);
        }
      `,transparent:!1,depthWrite:!0,depthTest:!0});this.smallOrb=new R(e,o),this.assignMaterialToMesh(this.orb),this.scene.add(this.orb),this.scene.add(this.smallOrb)}assignMaterialToMesh(t){const e={properties:{clearcoat:.05,clearcoatRoughness:.05,_transmission:1,chromaticAberration:.01,anistropy:1,roughness:.075,thickness:1,ior:1.4,distortion:1,distortionScale:.15,temporalDistortion:.5,reflectivity:.05,color:new x(11197951)}};t.material=Object.assign(new L,e.properties)}loadEnvironmentMap(){new O().load(new URL("/audio-reactive/assets/bg-2-1NQZ7KrA.jpg",import.meta.url).href,e=>{e.mapping=B,this.scene.environment=e})}initAudio(){try{this.audioContext=new(window.AudioContext||window.webkitAudioContext),this.audioAnalyser=this.audioContext.createAnalyser(),this.audioAnalyser.fftSize=256;const t=this.audioAnalyser.frequencyBinCount;this.audioData=new Uint8Array(t),this.audioElement=document.createElement("audio"),this.audioElement.src=new URL("/audio-reactive/assets/sound-BwmI-fOP.mp3",import.meta.url).href,this.audioElement.loop=!0;const e=document.createElement("button");e.textContent="Play Music",e.style.position="fixed",e.style.bottom="20px",e.style.left="20px",e.style.zIndex="1000",e.style.padding="10px 15px",e.style.backgroundColor="#333",e.style.color="white",e.style.border="none",e.style.borderRadius="4px",e.style.cursor="pointer",e.addEventListener("click",()=>{this.audioContext.state==="suspended"&&this.audioContext.resume(),this.audioInitialized||(this.audioContext.createMediaElementSource(this.audioElement).connect(this.audioAnalyser),this.audioAnalyser.connect(this.audioContext.destination),this.audioInitialized=!0),this.audioElement.paused?(this.audioElement.play(),e.textContent="Pause Music"):(this.audioElement.pause(),e.textContent="Play Music")}),document.body.appendChild(e),console.log("Audio initialized successfully")}catch(t){console.error("Audio context not supported:",t)}}animate(){this.animationId=requestAnimationFrame(this.animate),this.controls.update();let t=0,e=0,o=0;if(this.bassPunchHistory||(this.bassPunchHistory=[],this.lastBassImpulse=0,this.bassImpulseDecay=0,this.colorShift=0,this.midHistory=[],this.trebleHistory=[],this.lastSnareHit=0,this.snareDecay=0,this.visualBassMemory=0,this.visualSnareMemory=0,this.lastBassTime=0,this.lastSnareTime=0),this.audioInitialized&&this.audioAnalyser){this.audioAnalyser.getByteFrequencyData(this.audioData);let s=0;for(let i=0;i<10;i++)s+=this.audioData[i];const a=s/10/255;this.bassPunchHistory.push(a),this.bassPunchHistory.length>8&&this.bassPunchHistory.shift();const p=this.bassPunchHistory.reduce((i,f)=>i+f,0)/this.bassPunchHistory.length,m=.025,v=performance.now();a>p+m&&a>this.bassPunchHistory[this.bassPunchHistory.length-2]+m&&v-this.lastBassTime>100&&(this.lastBassImpulse=a*2.5,this.bassImpulseDecay=30,this.lastBassTime=v,this.visualBassMemory=1),this.bassImpulseDecay>0?(this.bassImpulseDecay--,t=this.lastBassImpulse*Math.pow(this.bassImpulseDecay/30,.85)):t=a*.2,this.visualBassMemory>0&&(this.visualBassMemory*=.95);let r=0;for(let i=5;i<40;i++)r+=this.audioData[i];const l=r/35/255;this.midHistory.push(l),this.midHistory.length>5&&this.midHistory.shift(),e=this.midHistory.reduce((i,f)=>i+f,0)/this.midHistory.length;let c=0,n=0;for(let i=50;i<100;i++)n+=this.audioData[i];const h=n/50/255;h>.03&&h>this.lastSnareHit+.03&&v-this.lastSnareTime>150&&(this.lastSnareHit=h*2,this.snareDecay=24,this.lastSnareTime=v,this.visualSnareMemory=1);for(let i=70;i<this.audioData.length;i++)c+=this.audioData[i];const d=c/(this.audioData.length-70)/255;this.trebleHistory.push(d),this.trebleHistory.length>3&&this.trebleHistory.shift(),o=this.trebleHistory.reduce((i,f)=>i+f,0)/this.trebleHistory.length,this.snareDecay>0&&(this.snareDecay--,o+=this.lastSnareHit*Math.pow(this.snareDecay/24,.6)*.7),this.visualSnareMemory>0&&(this.visualSnareMemory*=.93)}if(this.orb){const s=this.orb.geometry.attributes.position.array,a=this.originalPositions,p=s.length,m=performance.now()*.001;for(let r=0;r<p;r+=3){const l=a[r],c=a[r+1],n=a[r+2],h=Math.sqrt(l*l+c*c+n*n);let u=.05*Math.cos(m*1.5+(l+c+n)*1.5);if(this.audioInitialized){u+=t*.03,u+=this.visualBassMemory*.02*Math.sin(m*2+(l+c+n)*2);const M=m*8+(l+c+n)*4;u+=o*.5*Math.sin(M),u+=this.visualSnareMemory*.04*Math.sin(m*6+(l+c+n)*3);const S=Math.sin(m*.4)*.5+.5;if(u+=e*.12*Math.sin(S*8*l+m*1.5),this.bassImpulseDecay>15){const C=Math.abs(c)*t*.025;u+=C}}const d=h+u,i=l/h*d,f=c/h*d,y=n/h*d;s[r]=i,s[r+1]=f,s[r+2]=y}if(this.orb.geometry.attributes.position.needsUpdate=!0,this.smallOrb){const r=this.smallOrb.geometry.attributes.position.array,l=this.smallOriginalPositions,c=r.length;for(let n=0;n<c;n+=3){const h=l[n],u=l[n+1],d=l[n+2],i=Math.sqrt(h*h+u*u+d*d);let f=.025*Math.sin(m*2+(h+u+d)*2);const y=i+f;r[n]=h/i*y,r[n+1]=u/i*y,r[n+2]=d/i*y}this.smallOrb.geometry.attributes.position.needsUpdate=!0}let v=.003;this.audioInitialized&&this.snareDecay>15&&(v+=this.lastSnareHit*.04),this.orb.rotation.y+=v,this.smallOrb.position.set(0,0,0),this.smallOrb.rotation.y-=.001+e*.005}this.renderer.render(this.scene,this.camera)}handleResize(){const t=this.container.clientWidth,e=this.container.clientHeight;this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.renderer.setSize(t,e)}setOrbColor(t){this.orb&&this.orb.material&&this.orb.material.color.set(t)}setOrbSize(t){this.orb&&this.orb.scale.set(t,t,t)}dispose(){this.animationId&&cancelAnimationFrame(this.animationId),window.removeEventListener("resize",this.handleResize),this.orb&&(this.orb.geometry.dispose(),this.orb.material.dispose(),this.scene.remove(this.orb)),this.audioElement&&(this.audioElement.pause(),this.audioElement.src=""),this.audioContext&&this.audioContext.close(),this.renderer&&this.renderer.domElement&&(this.container.removeChild(this.renderer.domElement),this.renderer.dispose()),this.scene=null,this.camera=null,this.renderer=null,this.orb=null,this.controls=null,this.lights=[],this.audioContext=null,this.audioAnalyser=null,this.audioData=null,this.audioElement=null}}document.addEventListener("DOMContentLoaded",()=>{const g=document.querySelector("#app");new H(g)});
