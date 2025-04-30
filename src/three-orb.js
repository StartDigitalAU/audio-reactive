import * as THREE from "three";
import MeshTransmissionMaterial from "/src/MeshTransmissionMaterial";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default class ThreeOrb {
  constructor(container) {
    this.container = container;

    // Properties
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.orb = null;
    this.controls = null;
    this.lights = [];
    this.animationId = null;

    // Bind methods
    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);

    // Initialize
    this.init();
  }

  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08141f);

    // Create camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.z = 5;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.renderer.setPixelRatio(1.5);

    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.CineonToneMapping;
    this.renderer.toneMappingExposure = 1.45;

    this.container.appendChild(this.renderer.domElement);

    // Add controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = false;

    // Create orb
    this.createOrb();

    // Load environment map
    this.loadEnvironmentMap();

    // Add event listeners
    window.addEventListener("resize", this.handleResize);

    // Start animation loop
    this.animate();
  }

  createOrb() {
    const geometry = new THREE.IcosahedronGeometry(2.5, 32);
    const smallGeo = new THREE.IcosahedronGeometry(1.75, 9);

    // Store original positions for warping
    this.originalPositions = geometry.attributes.position.array.slice();
    this.smallOriginalPositions = smallGeo.attributes.position.array.slice(); // Add this line

    this.orb = new THREE.Mesh(geometry);

    // Create a custom shader material for spherical points
    const pointsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 0.075 * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
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
      `,
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });

    this.smallOrb = new THREE.Points(smallGeo, pointsMaterial);

    this.assignMaterialToMesh(this.orb);
    this.scene.add(this.orb);

    this.scene.add(this.smallOrb);
  }

  assignMaterialToMesh(mesh) {
    const materialConfig = {
      samples: 1,
      properties: {
        clearcoat: 0.05,
        clearcoatRoughness: 0.05,
        _transmission: 1,
        chromaticAberration: 0.01,
        anistropy: 1,
        roughness: 0.075,
        thickness: 1,
        ior: 1.4,
        distortion: 1,
        distortionScale: 0.15,
        temporalDistortion: 0.5,
        reflectivity: 0.05,
        color: new THREE.Color(0xaaddff),
      },
    };

    mesh.material = Object.assign(
      new MeshTransmissionMaterial(),
      materialConfig.properties
    );
  }

  loadEnvironmentMap() {
    const textureLoader = new THREE.TextureLoader();
    
    // Import the textures using relative paths or URL imports
    import.meta.url; // This ensures Vite processes this file
    
    textureLoader.load(new URL('./bg-2.jpg', import.meta.url).href, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = texture;
    });
  }

  animate() {
    this.animationId = requestAnimationFrame(this.animate);

    // Update controls
    this.controls.update();

    // Warp vertices
    if (this.orb) {
      const positions = this.orb.geometry.attributes.position.array;
      const orig = this.originalPositions;
      const len = positions.length;
      const time = performance.now() * 0.001;

      for (let i = 0; i < len; i += 3) {
        // Get original vertex
        const ox = orig[i];
        const oy = orig[i + 1];
        const oz = orig[i + 2];

        // Calculate spherical radius
        const r = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const warp = 0.075 * Math.cos(time * 2 + (ox + oy + oz) * 1.75);
        const nr = r + warp;

        // Normalize and apply new radius
        const nx = (ox / r) * nr;
        const ny = (oy / r) * nr;
        const nz = (oz / r) * nr;

        positions[i] = nx;
        positions[i + 1] = ny;
        positions[i + 2] = nz;
      }

      this.orb.geometry.attributes.position.needsUpdate = true;

      // Warp small orb vertices
      if (this.smallOrb) {
        const smallPositions = this.smallOrb.geometry.attributes.position.array;
        const smallOrig = this.smallOriginalPositions; // Use the original positions
        const smallLen = smallPositions.length;

        for (let i = 0; i < smallLen; i += 3) {
          // Get original vertex
          const ox = smallOrig[i];
          const oy = smallOrig[i + 1];
          const oz = smallOrig[i + 2];

          const r = Math.sqrt(ox * ox + oy * oy + oz * oz);
          const warp = 0.035 * Math.cos(time * 2 + (ox + oy + oz) * 2.25);
          const nr = r + warp;

          smallPositions[i] = (ox / r) * nr;
          smallPositions[i + 1] = (oy / r) * nr;
          smallPositions[i + 2] = (oz / r) * nr;
        }

        this.smallOrb.geometry.attributes.position.needsUpdate = true;
      }

      // Apply rotation to orbs
      this.orb.rotation.y += 0.01;

      // For the small orb, reset position before applying rotation
      // to prevent drift
      this.smallOrb.position.set(0, 0, 0);
      this.smallOrb.rotation.y -= 0.0005;
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Update camera
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(width, height);
  }

  // Public methods
  setOrbColor(color) {
    if (this.orb && this.orb.material) {
      this.orb.material.color.set(color);
    }
  }

  setOrbSize(size) {
    if (this.orb) {
      this.orb.scale.set(size, size, size);
    }
  }

  dispose() {
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Remove event listeners
    window.removeEventListener("resize", this.handleResize);

    // Dispose geometry and materials
    if (this.orb) {
      this.orb.geometry.dispose();
      this.orb.material.dispose();
      this.scene.remove(this.orb);
    }

    // Remove renderer from DOM
    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }

    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.orb = null;
    this.controls = null;
    this.lights = [];
  }
}
