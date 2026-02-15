// ── LAYER MANAGEMENT ──
var Layers = (function() {

  function initializeLayers(panel) {
    // Only initialize if layers is empty or missing
    if (panel.layers && panel.layers.length > 0) {
      // Re-link bubble data references (important after restore)
      panel.layers.forEach(l => {
        if (l.kind === 'bubble' && !l.bubbleData) {
          l.bubbleData = panel.bubbles.find(b => b.id === l.id);
        }
      });
      panel.layers.sort((a, b) => a.zIndex - b.zIndex);
      return;
    }

    panel.layers = [];

    // Image layer always at z=0
    panel.layers.push({id: 'img-' + panel.id, kind: 'image', zIndex: 0});

    // Overlays
    let z = 1;
    (panel.overlays || []).forEach(ov => {
      panel.layers.push({
        id: ov.id, kind: 'overlay',
        file: ov.file, opacity: ov.opacity, blendMode: ov.blendMode || 'normal',
        zIndex: z++
      });
    });

    // Bubbles
    (panel.bubbles || []).forEach(b => {
      panel.layers.push({id: b.id, kind: 'bubble', bubbleData: b, zIndex: z++});
    });

    panel.layers.sort((a, b) => a.zIndex - b.zIndex);
  }

  // Sync overlays array from layers (for export etc.)
  function syncViews(panel) {
    if (!panel.layers) return;
    panel.overlays = panel.layers
      .filter(l => l.kind === 'overlay')
      .map(l => ({id: l.id, file: l.file, opacity: l.opacity, blendMode: l.blendMode}));
    panel.bubbles = panel.layers
      .filter(l => l.kind === 'bubble' && l.bubbleData)
      .map(l => l.bubbleData);
  }

  function addOverlay(panel, file) {
    initializeLayers(panel);
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const maxZ = Math.max(...panel.layers.map(l => l.zIndex), 0);
    const newLayer = {id, kind: 'overlay', file, opacity: 0.5, blendMode: 'normal', zIndex: maxZ + 1};
    panel.layers.push(newLayer);
    syncViews(panel);
    return id;
  }

  function removeOverlay(panel, ovId) {
    if (!panel || !panel.layers) return;
    panel.layers = panel.layers.filter(l => !(l.kind === 'overlay' && l.id === ovId));
    syncViews(panel);
  }

  function setOpacity(panel, ovId, opacity) {
    if (!panel || !panel.layers) return;
    const layer = panel.layers.find(l => l.kind === 'overlay' && l.id === ovId);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
      syncViews(panel);
    }
  }

  function setLayerZ(panel, layerId, newZ) {
    if (!panel || !panel.layers) return;
    const layer = panel.layers.find(l => l.id === layerId);
    if (!layer || layer.kind === 'image') return;
    layer.zIndex = newZ;
    panel.layers.sort((a, b) => a.zIndex - b.zIndex);
    syncViews(panel);
  }

  function moveLayerUp(panel, layerId) {
    if (!panel || !panel.layers) return;
    const idx = panel.layers.findIndex(l => l.id === layerId);
    if (idx < 0 || idx >= panel.layers.length - 1) return;
    const a = panel.layers[idx], b = panel.layers[idx + 1];
    [a.zIndex, b.zIndex] = [b.zIndex, a.zIndex];
    panel.layers.sort((a, b) => a.zIndex - b.zIndex);
    syncViews(panel);
  }

  function moveLayerDown(panel, layerId) {
    if (!panel || !panel.layers) return;
    const idx = panel.layers.findIndex(l => l.id === layerId);
    if (idx <= 0) return;
    // Don't go below image layer (always idx 0)
    const prevLayer = panel.layers[idx - 1];
    if (prevLayer.kind === 'image') return;
    const a = panel.layers[idx], b = prevLayer;
    [a.zIndex, b.zIndex] = [b.zIndex, a.zIndex];
    panel.layers.sort((a, b) => a.zIndex - b.zIndex);
    syncViews(panel);
  }

  function renderOverlays(panelEl, panel, onRemove) {
    if (!panel.layers) initializeLayers(panel);
    panel.layers
      .filter(l => l.kind === 'overlay')
      .forEach(layer => {
        const layerEl = document.createElement('div');
        layerEl.className = 'overlay-layer';
        layerEl.style.zIndex = layer.zIndex;
        const ovImg = document.createElement('img');
        ovImg.src = layer.file;
        ovImg.style.opacity = layer.opacity !== undefined ? layer.opacity : 0.5;
        layerEl.appendChild(ovImg);
        const del = document.createElement('div');
        del.className = 'overlay-del';
        del.textContent = '✕';
        del.onclick = e => { e.stopPropagation(); onRemove(panel.id, layer.id); };
        layerEl.appendChild(del);
        panelEl.appendChild(layerEl);
      });
  }

  return {
    initializeLayers, syncViews, addOverlay, removeOverlay,
    setOpacity, setLayerZ, moveLayerUp, moveLayerDown, renderOverlays
  };
})();