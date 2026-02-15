// ── ASSET LIBRARY MODULE ──
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

  function init() {
    // Create library in the sidebar container
    const container = document.getElementById('asset-library');
    if (!container) return;

    // Override any display:none from CSS
    container.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    container.innerHTML = '';

    // Search
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '🔍 Search assets...';
    searchInput.style.cssText = 'width:100%;background:#2a2a2a;border:1px solid #444;color:#eee;padding:5px 8px;border-radius:4px;font-size:10px;font-family:"Comic Neue",cursive';
    searchInput.oninput = function() {
      searchQuery = searchInput.value.toLowerCase();
      renderAssets();
    };
    container.appendChild(searchInput);

    // Category tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.style.cssText = 'display:flex;gap:2px;flex-wrap:wrap';

    const categories = [
      {key: 'overlays', label: 'Overlays'},
      {key: 'effects', label: 'Effects'},
      {key: 'tones', label: 'Tones'},
      {key: 'atmosphere', label: 'Atmo'}
    ];

    categories.forEach(cat => {
      const tab = document.createElement('button');
      tab.textContent = cat.label;
      tab.className = 'btn' + (cat.key === currentCategory ? ' bb' : ' bd');
      tab.style.cssText = 'flex:1;padding:3px 4px;font-size:9px;min-width:0';
      tab.onclick = function() {
        currentCategory = cat.key;
        Array.from(tabsContainer.children).forEach(t => {
          t.className = 'btn bd';
          t.style.cssText = 'flex:1;padding:3px 4px;font-size:9px;min-width:0';
        });
        tab.className = 'btn bb';
        renderAssets();
      };
      tabsContainer.appendChild(tab);
    });
    container.appendChild(tabsContainer);

    // Grid
    const gridContainer = document.createElement('div');
    gridContainer.id = 'asset-grid';
    gridContainer.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:5px;max-height:240px;overflow-y:auto';
    container.appendChild(gridContainer);

    // Instruction
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:9px;color:#555;text-align:center;padding:2px 0';
    hint.textContent = 'Drag asset onto a panel to apply';
    container.appendChild(hint);

    renderAssets();
  }

  function renderAssets() {
    const gridContainer = document.getElementById('asset-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    const assets = ASSETS[currentCategory] || [];
    const filtered = assets.filter(a => !searchQuery || a.name.toLowerCase().includes(searchQuery));

    if (filtered.length === 0) {
      gridContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:10px;padding:10px">No assets found</div>';
      return;
    }

    filtered.forEach(asset => {
      const card = document.createElement('div');
      card.style.cssText = 'background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:4px;cursor:grab;display:flex;flex-direction:column;gap:2px;align-items:center;transition:border-color 0.15s';
      card.draggable = true;
      card.title = 'Drag onto a panel to apply: ' + asset.name;

      card.addEventListener('mouseenter', () => card.style.borderColor = '#0ff');
      card.addEventListener('mouseleave', () => card.style.borderColor = '#333');

      // Thumbnail (colored placeholder since assets may not exist)
      const thumb = document.createElement('div');
      thumb.style.cssText = 'width:100%;height:44px;background:#222;border-radius:3px;overflow:hidden;position:relative';
      const thumbImg = document.createElement('img');
      thumbImg.src = asset.file;
      thumbImg.style.cssText = 'width:100%;height:100%;object-fit:cover;opacity:0.8';
      thumbImg.onerror = function() {
        // Fallback colored tile if image doesn't exist
        const colors = {overlays:'#1a3a4a',effects:'#4a1a1a',tones:'#2a2a2a',atmosphere:'#1a2a3a'};
        thumb.style.background = colors[currentCategory] || '#222';
        const icon = document.createElement('div');
        icon.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px';
        icon.textContent = {overlays:'🌫',effects:'💥',tones:'⬜',atmosphere:'🌫'}[currentCategory] || '🎨';
        thumb.appendChild(icon);
      };
      thumb.appendChild(thumbImg);
      card.appendChild(thumb);

      const name = document.createElement('div');
      name.textContent = asset.name;
      name.style.cssText = 'font-size:9px;color:#aaa;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%';
      card.appendChild(name);

      card.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/asset-file', asset.file);
        e.dataTransfer.effectAllowed = 'copy';
        card.style.opacity = '0.6';
      });
      card.addEventListener('dragend', function() {
        card.style.opacity = '1';
      });

      gridContainer.appendChild(card);
    });
  }

  function getAllAssets() {
    const all = [];
    for (let cat in ASSETS) all.push(...ASSETS[cat]);
    return all;
  }

  // Add overlay to panel's overlays array (Assets module handles overlays array)
  function addOverlayToPanel(panel, assetFile) {
    if (!panel.overlays) panel.overlays = [];
    const id = Date.now() + Math.floor(Math.random() * 1000);
    panel.overlays.push({id: id, file: assetFile, opacity: 0.5, blendMode: 'normal'});
    return id;
  }

  return {
    init, getAllAssets, addOverlayToPanel, renderAssets
  };
})();