# SatoshiVerse 🌌

**SatoshiVerse** is a real-time, interactive WebGL universe generated from the Bitcoin blockchain.

- 🌟 Blocks are stars, brightness by fees, distance by height
- 🌀 Transactions orbit their parent block
- 🌞 Genesis block is a glowing white dwarf at the center
- 💥 Halving blocks trigger a nova ring explosion
- 🔍 Hover tooltips, filters, color modes, fly mode
- 🧭 Type any block height or address to explore
- 🔄 Real-time: new blocks appear automatically
- 🎛️ Perf controls: hide UI, toggle TX orbits, lower resolution, FPS counter

## 🚀 Run Locally

```bash
git clone https://github.com/YOUR_USERNAME/satoshiverse.git
cd satoshiverse
npx http-server   # or use any static server (VSCode Live Server, python -m http.server, etc.)
```

Open the shown URL (e.g. http://localhost:8080).

## 🛠 Tech

- [Three.js](https://threejs.org/)
- [mempool.space API](https://mempool.space/docs/api/)
- Vanilla JS modules, HTML, CSS

## ✨ Roadmap Ideas

- GPU particle field for mempool txs
- Music / sound synthesis from blocks and fees
- Multiplayer / shared explorers (Nostr/IPFS)
- Save/share camera positions (“galactic bookmarks”)
- Mobile/AR mode

MIT License. Built by Bitcoin nerds for Bitcoin nerds. 🧡
