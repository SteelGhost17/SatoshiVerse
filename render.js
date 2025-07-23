import * as THREE from 'https://cdn.skypack.dev/three';

let scene, camera, renderer;
let starGroup;
const txOrbitRadius = 2;
let raycaster, mouse, tooltipEl;
let novaEffects = [];
let showTxOrbits = true;
let lastHoverCheck = 0;
const HOVER_MS = 100;

// Fly mode vars
let flyTargetPos = null;
let flyTargetLook = null;
let flySpeed = 0.08;

const starsByHeight = new Map();
let colorMode = 'fees';
let filters = { highFee: false, miner: '', rbf: false };
let blocksCache = [];
let addressGroup = null;

export function initScene(blocks = []) {
  blocksCache = blocks;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('universe') });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio*0.85);

  window.addEventListener('resize', onResize, false);

  // Tooltip element
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'tooltip';
  tooltipEl.style.position = 'absolute';
  tooltipEl.style.backgroundColor = 'rgba(0,0,0,0.8)';
  tooltipEl.style.color = '#fff';
  tooltipEl.style.padding = '5px';
  tooltipEl.style.display = 'none';
  tooltipEl.style.pointerEvents = 'none';
  tooltipEl.style.borderRadius = '4px';
  tooltipEl.style.fontSize = '12px';
  document.body.appendChild(tooltipEl);

  // Genesis star
  const genesisGeo = new THREE.SphereGeometry(2, 32, 32);
  const genesisMat = new THREE.MeshBasicMaterial({ color: 0xffffff, emissive: 0xffffee });
  const genesisStar = new THREE.Mesh(genesisGeo, genesisMat);
  genesisStar.userData = {
    isGenesis: true,
    height: 0,
    tx_count: 1,
    miner: 'Satoshi',
    totalFees: 0,
    timestamp: 1231006505,
    txs: [],
    isRBF: false
  };
  scene.add(genesisStar);
  starsByHeight.set(0, genesisStar);

  // Block stars
  starGroup = new THREE.Group();
  blocks.forEach((block) => {
    const star = createStarForBlock(block);
    starGroup.add(star);
    starsByHeight.set(block.height, star);

    if (block.txList) {
      addTxOrbitsToStar(star, block.txList);
    }

    // halving
    if (block.height > 0 && block.height % 210000 === 0) {
      setTimeout(() => spawnNova(star.position, block.height), 100);
    }
  });

  scene.add(starGroup);
  camera.position.set(0, 0, 120);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  window.addEventListener('mousemove', onMouseMove, false);
}

function createStarForBlock(block) {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const geometry = new THREE.SphereGeometry(0.3, 16, 16);

  const star = new THREE.Mesh(geometry, material);

  const radius = block.height * 0.1 + 5;
  const angle = block.height * 0.1;
  star.position.x = Math.cos(angle) * radius;
  star.position.z = Math.sin(angle) * radius;
  star.position.y = (block.tx_count % 50) * 0.2;

  star.userData = {
    height: block.height,
    tx_count: block.tx_count,
    miner: block.extras?.pool?.name || 'Unknown',
    totalFees: block.totalFees,
    timestamp: block.timestamp,
    txs: [],
    isRBF: block.isRBF
  };

  applyColorToStar(star);
  return star;
}

function addTxOrbitsToStar(star, txList) {
  txList.forEach((tx, j) => {
    const txGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const txMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const txMesh = new THREE.Mesh(txGeo, txMat);

    const orbitAngle = (j / txList.length) * Math.PI * 2;
    txMesh.userData = {
      angle: orbitAngle,
      parent: star,
      radius: txOrbitRadius + Math.random() * 1.5,
      speed: 0.01 + Math.random() * 0.01,
    };
    scene.add(txMesh);
    star.userData.txs.push(txMesh);
  });

  if(!showTxOrbits){
    star.userData.txs.forEach(tx=>tx.visible=false);
  }
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function flyToBlock(height) {
  const star = starsByHeight.get(height);
  if (!star) return false;

  const offset = new THREE.Vector3(0, 0, 6);
  flyTargetPos = star.position.clone().add(offset);
  flyTargetLook = star.position.clone();
  return true;
}

export function addBlockStar(block){
  if(starsByHeight.has(block.height)) return;

  const star = createStarForBlock(block);
  starGroup.add(star);
  starsByHeight.set(block.height, star);

  if (block.txList) {
    addTxOrbitsToStar(star, block.txList);
  }

  if (block.height > 0 && block.height % 210000 === 0) {
    setTimeout(() => spawnNova(star.position, block.height), 100);
  }
}

export function setColorMode(mode) {
  colorMode = mode;
  starGroup.children.forEach(star => applyColorToStar(star));
}

export function setFilters(newFilters) {
  filters = { ...filters, ...newFilters };
  applyFilters();
}

export function setShowTxOrbits(v){showTxOrbits=v; if(!v){hideAllTx();} else {showAllTx();}}

export function setPixelRatio(scale){ if(renderer) renderer.setPixelRatio(window.devicePixelRatio*scale); }

function hideAllTx(){
  starGroup.children.forEach(star=>{
    if(star.userData?.txs) star.userData.txs.forEach(tx=>tx.visible=false);
  });
  if(addressGroup){
    addressGroup.children.forEach(c=>{ if(!c.userData?.isAddressCenter) c.visible=false;});
  }
}
function showAllTx(){
  starGroup.children.forEach(star=>{
    if(star.userData?.txs) star.userData.txs.forEach(tx=>tx.visible=star.visible);
  });
  if(addressGroup){
    addressGroup.children.forEach(c=>{ if(!c.userData?.isAddressCenter) c.visible=true;});
  }
}

function applyFilters() {
  starGroup.children.forEach(star => {
    const d = star.userData;
    let visible = true;
    if (filters.highFee && d.totalFees <= 0.2) visible = false;
    if (filters.miner && d.miner !== filters.miner) visible = false;
    if (filters.rbf && !d.isRBF) visible = false;

    star.visible = visible;
    if (d.txs) d.txs.forEach(tx => tx.visible = visible && showTxOrbits);
  });
}

function applyColorToStar(star) {
  const d = star.userData;
  if (!d) return;
  let color;
  switch (colorMode) {
    case 'fees': {
      const brightness = Math.min(1.0, d.totalFees * 4);
      color = new THREE.Color().setHSL(0.12, 1, brightness);
      break;
    }
    case 'age': {
      const now = Date.now() / 1000;
      const maxAge = 60 * 60 * 24 * 365 * 2; // 2y
      const age = Math.min(1, (now - d.timestamp) / maxAge);
      color = new THREE.Color().setHSL(0.66 - 0.66 * age, 1, 0.5);
      break;
    }
    case 'miner': {
      color = minerToColor(d.miner);
      break;
    }
    default:
      color = new THREE.Color(0xffffff);
  }
  star.material.color = color;
}

function minerToColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = (hash % 360) / 360;
  return new THREE.Color().setHSL(h, 0.7, 0.5);
}

function spawnNova(position, height) {
  const geo = new THREE.RingGeometry(0.1, 0.12, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geo, mat);
  ring.position.copy(position);
  ring.lookAt(camera.position);
  novaEffects.push({
    mesh: ring,
    start: performance.now(),
    duration: 4000,
    height
  });
  scene.add(ring);
}

export function showAddressConstellation(address, stats) {
  if (addressGroup) {
    scene.remove(addressGroup);
    addressGroup.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    addressGroup = null;
  }

  let seed = 0;
  for (let i = 0; i < address.length; i++) {
    seed = (seed * 31 + address.charCodeAt(i)) >>> 0;
  }
  function rand() {
    seed = (seed ^ (seed << 13)) >>> 0;
    seed = (seed ^ (seed >> 17)) >>> 0;
    seed = (seed ^ (seed << 5)) >>> 0;
    return (seed >>> 0) / 0xffffffff;
  }

  addressGroup = new THREE.Group();
  scene.add(addressGroup);

  const centerGeo = new THREE.SphereGeometry(0.6, 24, 24);
  const centerMat = new THREE.MeshBasicMaterial({ color: 0xff55ff });
  const center = new THREE.Mesh(centerGeo, centerMat);
  center.userData = {
    isAddressCenter: true,
    address,
    stats
  };
  addressGroup.add(center);

  const points = Math.min(32, address.length);
  for (let i = 0; i < points; i++) {
    const geo = new THREE.SphereGeometry(0.12, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x55aaff });
    const dot = new THREE.Mesh(geo, mat);

    const radius = 3 + i * 0.25;
    const angle = rand() * Math.PI * 2;
    const y = (rand() - 0.5) * 2.5;

    dot.position.set(
      center.position.x + Math.cos(angle) * radius,
      center.position.y + y,
      center.position.z + Math.sin(angle) * radius
    );
    addressGroup.add(dot);
  }

  const offset = new THREE.Vector3(0, 0, 8);
  flyTargetPos = center.position.clone().add(offset);
  flyTargetLook = center.position.clone();
}

export function animate() {
  requestAnimationFrame(animate);

  // Camera fly tween
  if (flyTargetPos && flyTargetLook) {
    camera.position.lerp(flyTargetPos, flySpeed);
    camera.lookAt(flyTargetLook);
    if (camera.position.distanceTo(flyTargetPos) < 0.1) {
      flyTargetPos = null;
      flyTargetLook = null;
    }
  }

  // Update tx positions
  if(showTxOrbits){
    starGroup.children.forEach(star => {
      if (star.userData?.txs) {
        star.userData.txs.forEach(tx => {
          tx.userData.angle += tx.userData.speed;
          const p = tx.userData.parent.position;
          const r = tx.userData.radius;
          const a = tx.userData.angle;
          tx.position.x = p.x + Math.cos(a) * r;
          tx.position.z = p.z + Math.sin(a) * r;
          tx.position.y = p.y;
        });
      }
    });
  }

  // Update nova effects
  if (novaEffects.length) {
    const now = performance.now();
    novaEffects = novaEffects.filter(n => {
      const t = (now - n.start) / n.duration;
      if (t >= 1) {
        scene.remove(n.mesh);
        n.mesh.geometry.dispose();
        n.mesh.material.dispose();
        return false;
      }
      const scale = 1 + t * 25;
      n.mesh.scale.set(scale, scale, scale);
      n.mesh.material.opacity = 0.9 * (1 - t);
      n.mesh.lookAt(camera.position);
      return true;
    });
  }

  // Hover detection (throttled)
  const nowHover = performance.now();
  if (nowHover - lastHoverCheck > HOVER_MS){
    lastHoverCheck = nowHover;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([...starGroup.children, ...(addressGroup?addressGroup.children:[])]);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      const d = obj.userData || {};
      tooltipEl.style.display = 'block';
      if (d.isAddressCenter) {
        tooltipEl.innerHTML = `
          <strong>Address</strong><br>
          ${d.address}<br>
          Funded: ${(d.stats?.chain_stats?.funded_txo_sum/1e8||0).toFixed(8)} BTC<br>
          Spent: ${(d.stats?.chain_stats?.spent_txo_sum/1e8||0).toFixed(8)} BTC<br>
          Tx count: ${d.stats?.chain_stats?.tx_count||0}
        `;
      } else if (d.height !== undefined) {
        tooltipEl.innerHTML = `
          <strong>Block #${d.height}</strong><br>
          Miner: ${d.miner}<br>
          Tx Count: ${d.tx_count}<br>
          Fees: ${d.totalFees.toFixed(6)} BTC
        `;
      } else {
        tooltipEl.innerHTML = `Tx`;
      }
      tooltipEl.style.left = `${(mouse.x + 1) * 0.5 * window.innerWidth + 10}px`;
      tooltipEl.style.top = `${(-mouse.y + 1) * 0.5 * window.innerHeight + 10}px`;
    } else {
      tooltipEl.style.display = 'none';
    }
  }

  renderer.render(scene, camera);
}
