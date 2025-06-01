import * as THREE from "three";
import MeshTransmissionMaterial from "./MeshTransmissionMaterial";
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

		// Audio properties
		this.audioContext = null;
		this.audioAnalyser = null;
		this.audioData = null;
		this.audioElement = null;
		this.audioInitialized = false;

		// Bind methods
		this.animate = this.animate.bind(this);
		this.handleResize = this.handleResize.bind(this);
		this.initAudio = this.initAudio.bind(this);

		// Initialize
		this.init();
	}

	init() {
		// Create scene
		this.initScene();

		// Create camera
		this.createCamera();

		// Create renderer
		this.createRenderer();

		// Add controls
		this.initControls();

		// Create orb
		this.createOrb();

		// Load environment map
		this.loadEnvironmentMap();

		// Initialize audio
		this.initAudio();

		// Add event listeners
		window.addEventListener("resize", this.handleResize);

		// Start animation loop
		this.animate();
	}

	initScene() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x08141f);
	}

	createCamera() {
		this.aspect = this.container.clientWidth / this.container.clientHeight;
		this.camera = new THREE.PerspectiveCamera(75, this.aspect, 0.1, 1000);
		this.camera.position.z = 5;
	}

	createRenderer() {
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(
			this.container.clientWidth,
			this.container.clientHeight
		);
		this.renderer.setPixelRatio(1);

		this.renderer.outputEncoding = THREE.sRGBEncoding;
		this.renderer.toneMapping = THREE.CineonToneMapping;
		this.renderer.toneMappingExposure = 1.45;

		this.container.appendChild(this.renderer.domElement);
	}

	initControls() {
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.enableZoom = false;
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

		textureLoader.load(
			new URL("./bg-2.jpg", import.meta.url).href,
			(texture) => {
				texture.mapping = THREE.EquirectangularReflectionMapping;
				this.scene.environment = texture;
			}
		);
	}

	initAudio() {
		try {
			// Create audio context
			this.audioContext = new (window.AudioContext ||
				window.webkitAudioContext)();

			// Create analyzer
			this.audioAnalyser = this.audioContext.createAnalyser();
			this.audioAnalyser.fftSize = 256;
			const bufferLength = this.audioAnalyser.frequencyBinCount;
			this.audioData = new Uint8Array(bufferLength);

			// Create audio element
			this.audioElement = document.createElement("audio");
			this.audioElement.src = new URL("./sound.mp3", import.meta.url).href;
			this.audioElement.loop = true;

			// Add play button
			const playButton = document.createElement("button");
			playButton.textContent = "Play Music";
			playButton.style.position = "fixed";
			playButton.style.bottom = "20px";
			playButton.style.left = "20px";
			playButton.style.zIndex = "1000";
			playButton.style.padding = "10px 15px";
			playButton.style.backgroundColor = "#333";
			playButton.style.color = "white";
			playButton.style.border = "none";
			playButton.style.borderRadius = "4px";
			playButton.style.cursor = "pointer";

			playButton.addEventListener("click", () => {
				// This needs user interaction due to browser autoplay policies
				if (this.audioContext.state === "suspended") {
					this.audioContext.resume();
				}

				if (!this.audioInitialized) {
					const source = this.audioContext.createMediaElementSource(
						this.audioElement
					);
					source.connect(this.audioAnalyser);
					this.audioAnalyser.connect(this.audioContext.destination);
					this.audioInitialized = true;
				}

				if (this.audioElement.paused) {
					this.audioElement.play();
					playButton.textContent = "Pause Music";
				} else {
					this.audioElement.pause();
					playButton.textContent = "Play Music";
				}
			});

			document.body.appendChild(playButton);
			console.log("Audio initialized successfully");
		} catch (err) {
			console.error("Audio context not supported:", err);
		}
	}

	animate() {
		this.animationId = requestAnimationFrame(this.animate);

		// Update controls
		this.controls.update();

		// Get audio data if available
		let bassValue = 0;
		let midValue = 0;
		let trebleValue = 0;

		// For bass punch effect and smoothing
		if (!this.bassPunchHistory) {
			this.bassPunchHistory = [];
			this.lastBassImpulse = 0;
			this.bassImpulseDecay = 0;
			this.colorShift = 0;
			this.midHistory = [];
			this.trebleHistory = [];
			this.lastSnareHit = 0;
			this.snareDecay = 0;
			// Add visual memory for persistent effects
			this.visualBassMemory = 0;
			this.visualSnareMemory = 0;
			this.lastBassTime = 0;
			this.lastSnareTime = 0;
		}

		if (this.audioInitialized && this.audioAnalyser) {
			this.audioAnalyser.getByteFrequencyData(this.audioData);

			// Calculate average values for different frequency ranges
			// Bass (low frequencies - kick drums in hip-hop typically 40-60Hz)
			let bassSum = 0;
			for (let i = 0; i < 10; i++) {
				// Focus on lower frequencies for kick drums
				bassSum += this.audioData[i];
			}
			const currentBass = bassSum / 10 / 255; // Normalize to 0-1

			// Store bass history for detecting impulses and smoothing
			this.bassPunchHistory.push(currentBass);
			if (this.bassPunchHistory.length > 8) {
				// Shorter history for faster response
				this.bassPunchHistory.shift();
			}

			// Calculate bass average from recent history
			const bassAvg =
				this.bassPunchHistory.reduce((sum, val) => sum + val, 0) /
				this.bassPunchHistory.length;

			// Detect bass impulses (sudden increases) - more sensitive for kick drums
			const bassThreshold = 0.025; // Slightly lower threshold for more sensitivity
			const currentTime = performance.now();
			if (
				currentBass > bassAvg + bassThreshold &&
				currentBass >
					this.bassPunchHistory[this.bassPunchHistory.length - 2] +
						bassThreshold &&
				// Add time-based check to prevent too frequent triggers
				currentTime - this.lastBassTime > 100 // Minimum 100ms between bass hits
			) {
				// Bass impulse detected! (kick drum)
				this.lastBassImpulse = currentBass * 2.5; // Amplify the impulse for more impact
				this.bassImpulseDecay = 30; // Longer decay (1 second at 30fps)
				this.lastBassTime = currentTime;

				// Create a visual memory of this hit that persists
				this.visualBassMemory = 1.0; // Full strength
			}

			// Apply decay to bass impulse with smoother curve
			if (this.bassImpulseDecay > 0) {
				this.bassImpulseDecay--;
				// Exponential decay for more natural punch with smoother falloff
				// Use a slower decay curve (0.85 power instead of 0.7)
				bassValue =
					this.lastBassImpulse * Math.pow(this.bassImpulseDecay / 30, 0.85);
			} else {
				bassValue = currentBass * 0.2; // Lower baseline influence for more contrast
			}

			// Decay the visual memory more slowly than the actual effect
			if (this.visualBassMemory > 0) {
				this.visualBassMemory *= 0.95; // Slow decay
			}

			// Mid frequencies (vocals, humming baseline in hip-hop)
			let midSum = 0;
			for (let i = 5; i < 40; i++) {
				// Adjusted range for hip-hop baseline
				midSum += this.audioData[i];
			}
			const rawMidValue = midSum / 35 / 255; // Normalize to 0-1

			// Smooth mid frequencies
			this.midHistory.push(rawMidValue);
			if (this.midHistory.length > 5) {
				this.midHistory.shift();
			}
			midValue =
				this.midHistory.reduce((sum, val) => sum + val, 0) /
				this.midHistory.length;

			// Treble (high frequencies - snares, claps in hip-hop 2-8kHz)
			let trebleSum = 0;
			let snareSum = 0;

			// Separate snare detection (typically 2-5kHz)
			for (let i = 50; i < 100; i++) {
				// Focused range for snare/clap detection
				snareSum += this.audioData[i];
			}
			const currentSnare = snareSum / 50 / 255;

			// Detect snare hits
			const snareThreshold = 0.03;
			if (
				currentSnare > snareThreshold &&
				currentSnare > this.lastSnareHit + 0.03 &&
				// Add time-based check to prevent too frequent triggers
				currentTime - this.lastSnareTime > 150 // Minimum 150ms between snare hits
			) {
				this.lastSnareHit = currentSnare * 2.0;
				this.snareDecay = 24; // Longer decay (0.8 seconds at 30fps)
				this.lastSnareTime = currentTime;

				// Create a visual memory of this hit that persists
				this.visualSnareMemory = 1.0; // Full strength
			}

			// General treble for other high frequencies
			for (let i = 70; i < this.audioData.length; i++) {
				trebleSum += this.audioData[i];
			}
			const rawTrebleValue = trebleSum / (this.audioData.length - 70) / 255;

			// Smooth treble frequencies
			this.trebleHistory.push(rawTrebleValue);
			if (this.trebleHistory.length > 3) {
				// Less smoothing for treble to keep it reactive
				this.trebleHistory.shift();
			}
			trebleValue =
				this.trebleHistory.reduce((sum, val) => sum + val, 0) /
				this.trebleHistory.length;

			// Add snare impact to treble
			if (this.snareDecay > 0) {
				this.snareDecay--;
				trebleValue +=
					this.lastSnareHit * Math.pow(this.snareDecay / 24, 0.6) * 0.7; // Slower decay, stronger effect
			}

			// Decay the visual memory more slowly than the actual effect
			if (this.visualSnareMemory > 0) {
				this.visualSnareMemory *= 0.93; // Slow decay
			}
		}

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

				// Apply audio reactivity to warp
				// Base warp with time - slower for smoother base movement
				let warp = 0.05 * Math.cos(time * 1.5 + (ox + oy + oz) * 1.5);

				// Add audio influence
				if (this.audioInitialized) {
					// Bass affects overall size with punch effect - stronger for kick drums
					warp += bassValue * 0.03; // Increased impact

					// Add persistent bass memory effect
					warp +=
						this.visualBassMemory *
						0.02 *
						Math.sin(time * 2 + (ox + oy + oz) * 2);

					// High frequencies create sharper ripples - for snares and claps
					const treblePhase = time * 8 + (ox + oy + oz) * 4;
					warp += trebleValue * 0.5 * Math.sin(treblePhase); // Increased impact

					// Add persistent snare memory effect
					warp +=
						this.visualSnareMemory *
						0.04 *
						Math.sin(time * 6 + (ox + oy + oz) * 3);

					// Add directional distortion based on mid frequencies - creates flowing movement
					const flowDirection = Math.sin(time * 0.4) * 0.5 + 0.5;
					warp +=
						midValue * 0.12 * Math.sin(flowDirection * 8 * ox + time * 1.5);

					// Add subtle vertical pulse for bass
					if (this.bassImpulseDecay > 15) {
						// Longer effect duration
						// Create vertical pulse on strong kicks
						const verticalPulse = Math.abs(oy) * bassValue * 0.025; // Increased impact
						warp += verticalPulse;
					}
				}

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

			// Warp small orb vertices with more dynamic response
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

					// Apply audio reactivity to small orb - make it react to snares/claps
					let warp = 0.025 * Math.sin(time * 2 + (ox + oy + oz) * 2);


					const nr = r + warp;

					smallPositions[i] = (ox / r) * nr;
					smallPositions[i + 1] = (oy / r) * nr;
					smallPositions[i + 2] = (oz / r) * nr;
				}

				this.smallOrb.geometry.attributes.position.needsUpdate = true;
			}

			// Apply rotation to orbs - make rotation speed react to music
			let rotationSpeed = 0.003; // Slower base rotation for smoother movement

			if (this.audioInitialized) {


				// Add snare hit rotation effect
				if (this.snareDecay > 15) {
					// Longer effect duration
					rotationSpeed += this.lastSnareHit * 0.04; // Increased impact
				}

			}

			this.orb.rotation.y += rotationSpeed;

			// For the small orb, reset position before applying rotation
			// to prevent drift
			this.smallOrb.position.set(0, 0, 0);
			this.smallOrb.rotation.y -= 0.001 + midValue * 0.005; // Increased impact
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

		// Clean up audio
		if (this.audioElement) {
			this.audioElement.pause();
			this.audioElement.src = "";
		}
		if (this.audioContext) {
			this.audioContext.close();
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
		this.audioContext = null;
		this.audioAnalyser = null;
		this.audioData = null;
		this.audioElement = null;
	}
}
