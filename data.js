export async function fetchLatestBlocks() {
  const res = await fetch('https://mempool.space/api/blocks');
  const blocks = await res.json();

  const enriched = await Promise.all(
    blocks.map(async block => {
      const detailRes = await fetch(`https://mempool.space/api/block/${block.id}/txs`);
      const txs = await detailRes.json();
      block.txList = txs.slice(0, 10);
      block.isRBF = block.txList.some(tx => tx.vin && tx.vin.some(input => input.sequence < 0xfffffffe));
      return block;
    })
  );

  return enriched;
}

export async function fetchRecentBlocks() {
  const res = await fetch('https://mempool.space/api/blocks');
  if (!res.ok) throw new Error('Failed to fetch recent blocks');
  return res.json();
}

export async function fetchBlockTxs(blockId){
  const res = await fetch(`https://mempool.space/api/block/${blockId}/txs`);
  if(!res.ok) throw new Error('TX fetch failed');
  return res.json();
}

export async function fetchAddressInfo(address) {
  const res = await fetch(`https://mempool.space/api/address/${address}`);
  if (!res.ok) throw new Error('Address fetch failed');
  return res.json();
}

export async function fetchBlockByHeight(height){
  const hRes = await fetch(`https://mempool.space/api/block-height/${height}`);
  if(!hRes.ok) throw new Error('Height lookup failed');
  const hash = await hRes.text();

  const bRes = await fetch(`https://mempool.space/api/block/${hash}`);
  if(!bRes.ok) throw new Error('Block fetch failed');
  const block = await bRes.json();

  try{
    const txRes = await fetch(`https://mempool.space/api/block/${hash}/txs`);
    if(txRes.ok){
      const txs = await txRes.json();
      block.txList = txs.slice(0,10);
      block.isRBF = block.txList.some(tx => tx.vin && tx.vin.some(input => input.sequence < 0xfffffffe));
    } else {
      block.txList = [];
      block.isRBF = false;
    }
  }catch(e){
    block.txList = [];
    block.isRBF = false;
  }
  return block;
}

export async function fetchRecentMempoolTxs(limit = 50) {
  const res = await fetch('https://mempool.space/api/mempool/recent');
  if (!res.ok) throw new Error('Mempool recent failed');
  const txs = await res.json();
  return txs.slice(0, limit);
}
