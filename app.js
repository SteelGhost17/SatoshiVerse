import { initScene, animate } from './render.js';
import { fetchLatestBlocks } from './data.js';

window.onload = async () => {
  await fetchLatestBlocks();
  initScene();
  animate();
};
