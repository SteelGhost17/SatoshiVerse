let scene, camera, renderer;

export function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('universe') });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const genesisStar = new THREE.Mesh(geometry, material);
  scene.add(genesisStar);
  camera.position.z = 5;
}

export function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
