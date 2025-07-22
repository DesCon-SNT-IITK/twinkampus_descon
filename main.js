import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


// Scene, Camera, Renderer
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8; // reduce brightness
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// HDR Environment (reflection only, not background)
const rgbeLoader = new RGBELoader();
rgbeLoader.load(
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/qwantani_afternoon_puresky_1k.hdr",
  function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture; // light gray bg for contrast

    // Load the model after environment is ready
    loadModel();
  }
);

// Load GLTF
function loadModel() {
  const loader = new GLTFLoader();

  loader.load(
    "hall3.glb", // Replace with your actual file name
    (gltf) => {
      const object = gltf.scene;
      object.scale.set(1, 1, 1); // Adjust if needed

      // Material tweaks to avoid over-reflective/glowing look
      object.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.material.metalness !== undefined)
            child.material.metalness = 0.1;
          if (child.material.roughness !== undefined)
            child.material.roughness = 0.9;
          if (child.material.color) {
            child.material.color.multiplyScalar(0.98);
          }
          child.material.envMapIntensity = 1.0;
          child.material.needsUpdate = true;
        }
      });

      scene.add(object);

      // Compute bounding box
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      object.position.sub(center); // center the model

      // Adjust camera based on model size
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraZ = maxDim / 2 / Math.tan(fov / 2);
      camera.position.set(0, 0, cameraZ * 1.5); // zoomed out
      camera.near = maxDim / 100;
      camera.far = maxDim * 10;
      camera.updateProjectionMatrix();

      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();

      console.log("GLTF model loaded and centered");
    },
    undefined,
    (error) => {
      console.error("Error loading GLTF:", error);
    }
  );
}

// Balanced lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// Responsive resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function render() {
  requestAnimationFrame(render);
  controls.update();
  renderer.render(scene, camera);
}
render();