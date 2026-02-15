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
  let libraryContainer = null;
  
  function init() {
    createLibraryPanel();
  }
  
  function createLibraryPanel() {
    libraryContainer = document.getElementById('asset-library');
    if (!libraryContainer) {
      console.warn('Asset library container not found in sidebar');
      return;
    }
    
    libraryContainer.innerHTML = '';
    libraryContainer.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-height:400px';
    
    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search assets...';
    searchInput.style.cssText = 'width:100%;background:#2a2a2a;border:1px solid#444;color:#eee;padding:5px 8px;border-radius:4px;font-size:10px;font-family:"Comic Neue",cursive';
    searchInput.oninput = function() {
      searchQuery = searchInput.value.toLowerCase();
      renderAssets();
    };
    libraryContainer.appendChild(searchInput);
    
    // Category tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.style.cssText = 'display:flex;gap:3px;flex-wrap:wrap';
    
    const categories = [
      {key: 'overlays', label: 'Overlays'},
      {key: 'effects', label: 'Effects'},
      {key: 'tones', label: 'Tones'},
      {key: 'atmosphere', label: 'Atmosphere'}
    ];
    
    categories.forEach(cat => {
      const tab = document.createElement('button');
      tab.textContent = cat.label;
      tab.className = 'btn';
      tab.style.cssText = 'flex:1;padding:3px 4px;font-size:9px;min-width:0';
      tab.onclick = function() {
        currentCategory = cat.key;
        // Update all tabs
        Array.from(tabsContainer.children).forEach(t => {
          t.classList.remove('bb');
        });
        tab.classList.add('bb');
        renderAssets();
      };
      if (cat.key === currentCategory) {
        tab.classList.add('bb');
      }
      tabsContainer.appendChild(tab);
    });
    
    libraryContainer.appendChild(tabsContainer);
    
    // Asset grid container
    const gridContainer = document.createElement('div');
    gridContainer.id = 'asset-grid';
    gridContainer.style.cssText = 'flex:1;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:6px;align-content:start;max-height:300px';
    libraryContainer.appendChild(gridContainer);
    
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
      gridContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:10px;padding:15px">No assets found</div>';
      return;
    }
    
    filtered.forEach(asset => {
      const card = document.createElement('div');
      card.style.cssText = 'background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:4px;cursor:grab;transition:all 0.2s;display:flex;flex-direction:column;gap:3px;align-items:center';
      card.draggable = true;
      
      card.onmouseenter = () => { card.style.borderColor = '#0ff'; };
      card.onmouseleave = () => { card.style.borderColor = '#333'; };
      card.onmousedown = () => { card.style.cursor = 'grabbing'; };
      card.onmouseup = () => { card.style.cursor = 'grab'; };
      
      // Thumbnail
      const thumb = document.createElement('div');
      thumb.style.cssText = 'width:100%;height:50px;background:#000;border-radius:3px;background-size:cover;background-position:center;background-image:url(' + asset.file + ')';
      card.appendChild(thumb);
      
      // Name
      const name = document.createElement('div');
      name.textContent = asset.name;
      name.style.cssText = 'font-size:9px;color:#aaa;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%';
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
