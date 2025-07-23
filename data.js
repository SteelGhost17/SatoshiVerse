export async function fetchLatestBlocks() {
  const res = await fetch('https://mempool.space/api/blocks');
  const data = await res.json();
  console.log('Latest blocks:', data);
  return data;
}
