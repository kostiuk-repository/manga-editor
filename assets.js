// ── ASSET LIBRARY MODULE — Asset library, layer management, categories ──
var Assets = (function() {
  
  const ASSETS = {
    'overlays': [
      {id: 'speed-lines', name: 'Speed Lines', file: 'assets/speed-lines.png'},
      {id: 'dark-gradient', name: 'Dark Gradient', file: 'assets/dark-gradient.png'},
      {id: 'gloom-overlay', name: 'Gloom Overlay', file: 'assets/gloom-overlay.png'},
      {id: 'vignette', name: 'Vignette', file: 'assets/vignette.png'}
    ],
    'effects': [
      {id: 'impact-burst', name: 'Impact Burst', file: 'assets/impact-burst.png'},
      {id: 'crack-overlay', name: 'Crack Overlay', file: 'assets/crack-overlay.png'},
      {id: 'rain-overlay', name: 'Rain Overlay', file: 'assets/rain-overlay.png'},
      {id: 'halftone', name: 'Halftone', file: 'assets/halftone.png'}
    ],
    'tones': [
      {id: 'screen-tone-light', name: 'Screen Tone Light', file: 'assets/screen-tone-light.png'},
      {id: 'screen-tone-dark', name: 'Screen Tone Dark', file: 'assets/screen-tone-dark.png'},
      {id: 'crosshatch', name: 'Crosshatch', file: 'assets/crosshatch.png'}
    ],
    'atmosphere': [
      {id: 'dust-particles', name: 'Dust Particles', file: 'assets/dust-particles.png'},
      {id: 'smoke-wisps', name: 'Smoke Wisps', file: 'assets/smoke-wisps.png'},
      {id: 'light-leak', name: 'Light Leak', file: 'assets/light-leak.png'},
      {id: 'bokeh-blur', name: 'Bokeh Blur', file: 'assets/bokeh-blur.png'}
    ]
  };
  
  let currentCategory = 'overlays';
  let searchQuery = '';
  let floatingPanel = null;
  
  function init() {
    createFloatingPanel();
  }
  
  function createFloatingPanel() {
    if (floatingPanel) return;
    
    floatingPanel = document.createElement('div');
    floatingPanel.id = 'asset-library-floating';
    floatingPanel.style.cssText = `
      position: fixed;
      right: 20px;
      top: 20px;
      width: 280px;
      height: 360px;
      background: #111;
      border: 2px solid #444;
      border-radius: 10px;
      padding: 12px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;
    
    // Title
    const title = document.createElement('div');
    title.textContent = '🎨 Asset Library';
    title.style.cssText = 'font-family:Bangers,cursive;font-size:16px;letter-spacing:1px;color:#fff;text-align:center;border-bottom:1px solid #333;padding-bottom:8px';
    floatingPanel.appendChild(title);
    
    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search assets...';
    searchInput.style.cssText = 'width:100%;background:#2a2a2a;border:1px solid#444;color:#eee;padding:6px 8px;border-radius:4px;font-size:11px;font-family:"Comic Neue",cursive';
    searchInput.oninput = function() {
      searchQuery = searchInput.value.toLowerCase();
      renderAssets();
    };
    floatingPanel.appendChild(searchInput);
    
    // Category tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap';
    
    const categories = [
      {key: 'overlays', label: 'Overlays'},
      {key: 'effects', label: 'Effects'},
      {key: 'tones', label: 'Tones'},
      {key: 'atmosphere', label: 'Atmosphere'}
    ];
    
    categories.forEach(cat => {
      const tab = document.createElement('button');
      tab.textContent = cat.label;
      tab.style.cssText = 'flex:1;padding:4px 6px;border:none;border-radius:4px;cursor:pointer;font-size:10px;font-family:Bangers,cursive;background:#333;color:#ccc';
      tab.onclick = function() {
        currentCategory = cat.key;
        // Update all tabs
        Array.from(tabsContainer.children).forEach(t => {
          t.style.background = '#333';
          t.style.color = '#ccc';
        });
        tab.style.background = '#07a';
        tab.style.color = '#fff';
        renderAssets();
      };
      if (cat.key === currentCategory) {
        tab.style.background = '#07a';
        tab.style.color = '#fff';
      }
      tabsContainer.appendChild(tab);
    });
    
    floatingPanel.appendChild(tabsContainer);
    
    // Asset grid container
    const gridContainer = document.createElement('div');
    gridContainer.id = 'asset-grid';
    gridContainer.style.cssText = 'flex:1;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start';
    floatingPanel.appendChild(gridContainer);
    
    document.body.appendChild(floatingPanel);
    
    renderAssets();
  }
  
  function renderAssets() {
    const gridContainer = document.getElementById('asset-grid');
    if (!gridContainer) return;
    
    gridContainer.innerHTML = '';
    
    const assets = ASSETS[currentCategory] || [];
    const filtered = assets.filter(asset => 
      searchQuery === '' || asset.name.toLowerCase().includes(searchQuery)
    );
    
    if (filtered.length === 0) {
      gridContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#666;font-size:11px;padding:20px">No assets found</div>';
      return;
    }
    
    filtered.forEach(asset => {
      const card = document.createElement('div');
      card.style.cssText = 'background:#222;border:1px solid #333;border-radius:6px;padding:6px;cursor:grab;transition:all 0.2s';
      card.draggable = true;
      
      card.onmouseenter = () => { card.style.borderColor = '#0ff'; };
      card.onmouseleave = () => { card.style.borderColor = '#333'; };
      card.onmousedown = () => { card.style.cursor = 'grabbing'; };
      card.onmouseup = () => { card.style.cursor = 'grab'; };
      
      // Thumbnail
      const thumb = document.createElement('div');
      thumb.style.cssText = 'width:100%;height:60px;background:#000;border-radius:4px;margin-bottom:6px;overflow:hidden;display:flex;align-items:center;justify-content:center';
      const img = document.createElement('img');
      img.src = asset.file;
      img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain';
      thumb.appendChild(img);
      card.appendChild(thumb);
      
      // Name
      const name = document.createElement('div');
      name.textContent = asset.name;
      name.style.cssText = 'font-size:9px;color:#ccc;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      card.appendChild(name);
      
      // Drag & drop handlers
      card.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/asset-file', asset.file);
        e.dataTransfer.effectAllowed = 'copy';
      });
      
      gridContainer.appendChild(card);
    });
  }
  
  function getAllAssets() {
    const all = [];
    for (let cat in ASSETS) {
      all.push(...ASSETS[cat]);
    }
    return all;
  }
  
  function addOverlayToPanel(panel, assetFile) {
    if (!panel.overlays) panel.overlays = [];
    panel.overlays.push({
      id: Date.now(),
      file: assetFile,
      opacity: 0.5,
      blendMode: 'normal'
    });
  }
  
  function removeOverlayFromPanel(panel, overlayId) {
    if (!panel || !panel.overlays) return;
    panel.overlays = panel.overlays.filter(o => o.id !== overlayId);
  }
  
  function setOverlayOpacity(panel, overlayId, opacity) {
    if (!panel || !panel.overlays) return;
    const overlay = panel.overlays.find(o => o.id === overlayId);
    if (overlay) {
      overlay.opacity = Math.max(0, Math.min(1, opacity));
    }
  }
  
  function setOverlayBlendMode(panel, overlayId, blendMode) {
    if (!panel || !panel.overlays) return;
    const overlay = panel.overlays.find(o => o.id === overlayId);
    if (overlay) {
      overlay.blendMode = blendMode;
    }
  }
  
  function reorderOverlays(panel, fromIdx, toIdx) {
    if (!panel || !panel.overlays) return;
    if (fromIdx < 0 || fromIdx >= panel.overlays.length) return;
    if (toIdx < 0 || toIdx >= panel.overlays.length) return;
    const moved = panel.overlays.splice(fromIdx, 1)[0];
    panel.overlays.splice(toIdx, 0, moved);
  }
  
  return {
    init: init,
    getAllAssets: getAllAssets,
    addOverlayToPanel: addOverlayToPanel,
    removeOverlayFromPanel: removeOverlayFromPanel,
    setOverlayOpacity: setOverlayOpacity,
    setOverlayBlendMode: setOverlayBlendMode,
    reorderOverlays: reorderOverlays,
    renderAssets: renderAssets
  };
})();
