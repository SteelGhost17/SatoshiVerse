export async function runDiagnostics(api) {
  const results = [];
  const pass = (ok, msg) => results.push({ ok, msg });

  try{
    const { scene, starGroup, starsByHeight } = api.getState();
    pass(!!scene, "Scene exists");
    pass(starGroup?.children?.length > 0, "Stars rendered (>0)");
    pass(starsByHeight.has(0), "Genesis star present");

    pass(document.getElementById('tooltip') !== null, "Tooltip element present");

    const anyHeight = [...starsByHeight.keys()].find(h => h > 0);
    pass(!!anyHeight, "At least one block >0 loaded");
    const beforePos = api.getState().camera.position.clone();
    api.flyToBlock(anyHeight);
    await new Promise(r => setTimeout(r, 500));
    const afterPos = api.getState().camera.position.clone();
    pass(!beforePos.equals(afterPos), "Camera moved on flyToBlock()");

    api.setFilters({ highFee: true });
    const visibleAfterFilter = starGroup.children.some(s => s.visible);
    pass(typeof visibleAfterFilter === "boolean", "Filter applied without crash");
    api.setFilters({ highFee: false });

    api.setColorMode("miner");
    pass(true, "Color mode switch ok");
    api.setColorMode("fees");

    try{
      await api.showAddressConstellation("bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq", { chain_stats:{ funded_txo_sum:0, spent_txo_sum:0, tx_count:0 }});
      pass(true, "Address constellation created");
    }catch(e){
      pass(false, "Address constellation failed");
    }

    pass(typeof api.startRealtime === "function", "Realtime function exists");

  }catch(e){
    pass(false, "Diagnostics crashed: "+e.message);
  }

  return results;
}
