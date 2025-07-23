import { initScene, animate, flyToBlock, setColorMode, setFilters, showAddressConstellation, addBlockStar, setShowTxOrbits, setPixelRatio, getState, spawnComets, setShowComets } from './render.js';
import { fetchLatestBlocks, fetchAddressInfo, fetchRecentBlocks, fetchBlockTxs, fetchBlockByHeight, fetchRecentMempoolTxs } from './data.js';
import { runDiagnostics } from './diagnostics.js';

let loadedBlocks = [];
let realtimeTimer = null;
const POLL_MS = 30000;

let mempoolTimer = null;
const MEMPOOL_MS = 5000;

window.onload = async () => {
  loadedBlocks = await fetchLatestBlocks();
  initScene(loadedBlocks);
  animate();

  const miners = Array.from(new Set(loadedBlocks.map(b => b.extras?.pool?.name || 'Unknown')));
  const minerSelect = document.getElementById('filterMiner');
  miners.sort().forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    minerSelect.appendChild(opt);
  });

  document.getElementById('filterHighFee').addEventListener('change', e => {
    setFilters({ highFee: e.target.checked });
  });
  minerSelect.addEventListener('change', e => {
    setFilters({ miner: e.target.value });
  });

  document.getElementById('filterRBF').addEventListener('change', e => {
    setFilters({ rbf: e.target.checked });
  });

  document.getElementById('toggleTxOrbits').addEventListener('change', e=>{
    setShowTxOrbits(e.target.checked);
  });

  const maxTxSlider = document.getElementById('maxTxPerBlock');
  const maxTxVal = document.getElementById('maxTxVal');
  maxTxSlider.addEventListener('input', e=>{
    maxTxVal.textContent = e.target.value;
  });

  const prSlider = document.getElementById('pixelRatioScale');
  const prVal = document.getElementById('pixelRatioVal');
  prSlider.addEventListener('input', e=>{
    prVal.textContent = e.target.value;
    setPixelRatio(parseFloat(e.target.value));
  });

  const toggleBtn = document.getElementById('toggleUIBtn');
  toggleBtn.addEventListener('click', ()=>document.body.classList.toggle('hidden-ui'));
  window.addEventListener('keydown', (ev)=>{
    if(ev.key==='h' || ev.key==='H'){ document.body.classList.toggle('hidden-ui'); }
    if(ev.key==='f' || ev.key==='F'){ flyToBlock(0); }
  });

  let stats = null;
  const fpsChk = document.getElementById('toggleFPS');
  fpsChk.addEventListener('change', e=>{
    if(e.target.checked){
      stats = new Stats(); stats.showPanel(0);
      stats.dom.id='fpsPanel';
      document.body.appendChild(stats.dom);
      const loop = ()=>{
        stats.begin();
        requestAnimationFrame(loop);
        stats.end();
      };
      requestAnimationFrame(loop);
    }else{
      if(stats){ document.body.removeChild(stats.dom); stats=null; }
    }
  });

  // Comets controls
  document.getElementById('toggleComets').addEventListener('change', e=>{
    setShowComets(e.target.checked);
  });
  const maxCometsSlider = document.getElementById('maxComets');
  const maxCometsVal = document.getElementById('maxCometsVal');
  maxCometsSlider.addEventListener('input', e=>{
    maxCometsVal.textContent = e.target.value;
  });

  document.getElementById('runTestsBtn').addEventListener('click', async ()=>{
    const panel = document.getElementById('diagPanel');
    panel.style.display = 'block';
    panel.innerHTML = "Running tests...";
    const res = await runDiagnostics({
      getState,
      flyToBlock,
      setFilters,
      setColorMode,
      showAddressConstellation,
      startRealtime
    });
    panel.innerHTML = res.map(r => `${r.ok ? "✅" : "❌"} ${r.msg}`).join('<br>');
  });

  startRealtime();
  startMempoolStream();
};

window.flyTo = async function () {
  const val = document.getElementById('addressInput').value.trim();
  if (!val) return;

  const height = parseInt(val, 10);
  if (!isNaN(height)) {
    if (!flyToBlock(height)) {
      try{
        const block = await fetchBlockByHeight(height);
        loadedBlocks.push(block);
        addBlockStar(block);
        setColorMode(document.getElementById('colorMode').value);
        const hf = document.getElementById('filterHighFee').checked;
        const miner = document.getElementById('filterMiner').value;
        const rbf = document.getElementById('filterRBF').checked;
        setFilters({highFee:hf, miner, rbf});
        const minerSelect = document.getElementById('filterMiner');
        if (![...minerSelect.options].some(o=>o.value=== (block.extras?.pool?.name||'Unknown'))) {
          const opt = document.createElement('option');
          opt.value = block.extras?.pool?.name || 'Unknown';
          opt.textContent = opt.value;
          minerSelect.appendChild(opt);
        }
        flyToBlock(height);
      }catch(e){
        alert('Could not fetch that block height.');
      }
    }
    return;
  }

  try {
    const info = await fetchAddressInfo(val);
    showAddressConstellation(val, info);
  } catch (e) {
    alert('Invalid address or fetch failed.');
  }
};

async function pollNewBlocks(){
  try{
    const recent = await fetchRecentBlocks();
    const maxLoaded = Math.max(...loadedBlocks.map(b=>b.height));
    const newOnes = recent.filter(b => b.height > maxLoaded);
    if(newOnes.length){
      for (const b of newOnes){
        try{
          const txs = await fetchBlockTxs(b.id);
          b.txList = txs.slice(0,10);
          b.isRBF = b.txList.some(tx => tx.vin && tx.vin.some(input => input.sequence < 0xfffffffe));
        }catch(e){}
        loadedBlocks.push(b);
        addBlockStar(b);
      }
      setColorMode(document.getElementById('colorMode').value);
      const hf = document.getElementById('filterHighFee').checked;
      const miner = document.getElementById('filterMiner').value;
      const rbf = document.getElementById('filterRBF').checked;
      setFilters({highFee:hf, miner, rbf});
      const miners = Array.from(new Set(loadedBlocks.map(b => b.extras?.pool?.name || 'Unknown')));
      const minerSelect = document.getElementById('filterMiner');
      const existing = new Set(Array.from(minerSelect.options).map(o=>o.value));
      miners.forEach(m=>{
        if(!existing.has(m)){
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          minerSelect.appendChild(opt);
        }
      });
    }
  }catch(e){
    console.warn('Realtime poll error:', e);
  }
}

function startRealtime(){
  if(realtimeTimer) return;
  realtimeTimer = setInterval(pollNewBlocks, POLL_MS);
}

async function pollMempool(){
  try{
    const limit = parseInt(document.getElementById('maxComets').value, 10);
    const txs = await fetchRecentMempoolTxs(limit);
    const latestHeight = Math.max(...loadedBlocks.map(b=>b.height));
    spawnComets(txs, latestHeight);
  }catch(e){
    console.warn('Mempool poll error:', e);
  }
}

function startMempoolStream(){
  if(mempoolTimer) return;
  mempoolTimer = setInterval(pollMempool, MEMPOOL_MS);
}
