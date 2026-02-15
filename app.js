// ── MANGA EDITOR V5 — Main App ──
// Uses modular architecture: panels.js, modals.js, assets.js, bubbles.js, history.js

// ── CONSTANTS ──
const SCHEMA_VERSION = 'v5';
const STANDARD_WIDTH = 800;
const DEFAULT_HEIGHT = 450;

// ── GLOBAL STATE ──
var selPID = null;  // Selected panel ID
var selBID = null;  // Selected bubble ID
var selLayerID = null;  // Selected layer ID
var selGroupIdx = null;  // Selected group row index
var selectionType = null;  // 'panel', 'bubble', 'overlay', 'group'
var BC = 0;         // Bubble counter
var autoSaveTimer = null;
var autoSaveTs = null;
var autoSaveTick = null;
var leftSidebarOpen = true;
var rightSidebarOpen = true;

// ── INITIALIZATION ──
window.addEventListener('DOMContentLoaded', function() {
  // Initialize modules
  Modals.init();
  Assets.init();
  HistoryLog.init(document.body);
  
  // Always restore saved state unconditionally
  restoreState();
  
  // Initial render
  renderAll();
  
  // Start auto-save (60 seconds)
  startAutoSave();
  
  // Setup panel drop targets for asset library
  setupAssetDropTargets();
});

// ── FILE UPLOAD ──
function handleFiles(e) {
  Array.from(e.target.files).forEach(f => {
    const r = new FileReader();
    r.onload = ev => {
      // Create image to get dimensions
      const tempImg = new Image();
      tempImg.onload = function() {
        const aspectRatio = tempImg.height / tempImg.width;
        const p = Panels.addPanel(ev.target.result);
        p.aspectRatio = aspectRatio;
        p.height = Math.round(STANDARD_WIDTH * aspectRatio);  // Auto-calculate from standard width
        HistoryLog.add('PANEL_ADD', 'Panel ' + Panels.getPanelIndex(p.id) + ' added');
        renderAll();
        selPanel(p.id);
      };
      tempImg.src = ev.target.result;
    };
    r.readAsDataURL(f);
  });
  e.target.value = '';
}

// ── SIDEBAR TOGGLE ──
function toggleSidebar(side) {
  if (side === 'left') {
    leftSidebarOpen = !leftSidebarOpen;
    const sidebar = document.getElementById('sidebar-left');
    const toggle = document.getElementById('toggle-left');
    if (leftSidebarOpen) {
      sidebar.classList.remove('collapsed');
      toggle.classList.remove('collapsed');
      toggle.textContent = '◀';
    } else {
      sidebar.classList.add('collapsed');
      toggle.classList.add('collapsed');
      toggle.textContent = '▶';
    }
  } else if (side === 'right') {
    rightSidebarOpen = !rightSidebarOpen;
    const sidebar = document.getElementById('sidebar-right');
    const toggle = document.getElementById('toggle-right');
    if (rightSidebarOpen) {
      sidebar.classList.remove('collapsed');
      toggle.classList.remove('collapsed');
      toggle.textContent = '▶';
    } else {
      sidebar.classList.add('collapsed');
      toggle.classList.add('collapsed');
      toggle.textContent = '◀';
    }
  }
}

// ── SELECTION ──
function selPanel(id) {
  selPID = id;
  selBID = null;
  selLayerID = null;
  selGroupIdx = null;
  selectionType = 'panel';
  renderAll();
  renderInspector();
}

function selGroup(rowIdx) {
  selPID = null;
  selBID = null;
  selLayerID = null;
  selGroupIdx = rowIdx;
  selectionType = 'group';
  renderAll();
  renderInspector();
}

function selBubble(panelId, bubbleId) {
  selPID = panelId;
  selBID = bubbleId;
  selLayerID = bubbleId;
  selGroupIdx = null;
  selectionType = 'bubble';
  renderAll();
  renderInspector();
}

function selOverlay(panelId, overlayId) {
  selPID = panelId;
  selBID = null;
  selLayerID = overlayId;
  selGroupIdx = null;
  selectionType = 'overlay';
  renderAll();
  renderInspector();
}

function getSelBubble() {
  const p = Panels.getPanel(selPID);
  if (!p || !selBID) return null;
  return p.bubbles.find(b => b.id === selBID);
}

// ── RENDER ──
function renderAll() {
  renderSidebar();
  renderPage();
  updateToolbarInfo();
}

function updateToolbarInfo() {
  const rows = Panels.getRows();
  const totalPanels = rows.reduce((sum, r) => sum + r.panels.length, 0);
  document.getElementById('tinfo').textContent = 
    totalPanels ? `${totalPanels} panel(s) · click to select` : 'Upload images to start';
}

// ── SIDEBAR RENDERING (HIERARCHICAL TREE) ──
function renderSidebar() {
  const list = document.getElementById('panels-list');
  list.innerHTML = '';
  
  const rows = Panels.getRows();
  let panelIndex = 1;
  
  rows.forEach((row, rowIdx) => {
    if (row.type === 'single') {
      // Single panel with expandable layers
      const p = row.panels[0];
      list.appendChild(createPanelTreeItem(p, panelIndex, row, rowIdx, false));
      panelIndex++;
    } else {
      // Group with expandable panels (each with layers)
      const groupEl = createGroupTreeItem(row, rowIdx, panelIndex);
      list.appendChild(groupEl);
      panelIndex += row.panels.length;
    }
  });
}

function createGroupTreeItem(row, rowIdx, startPanelIndex) {
  const groupContainer = document.createElement('div');
  groupContainer.className = 'group-item';
  
  // Group header
  const header = document.createElement('div');
  header.className = 'tree-item' + (selGroupIdx === rowIdx ? ' sel' : '');
  header.style.fontWeight = 'bold';
  header.style.color = '#ff0';
  header.setAttribute('draggable', 'true');
  header.dataset.rowIdx = rowIdx;
  
  const layoutLabel = row.layout ? Panels.GROUP_LAYOUTS[row.layout]?.label || 'Custom' : 'Row';
  const panelCount = row.panels.length;
  
  const labelSpan = document.createElement('span');
  labelSpan.className = 'label';
  labelSpan.textContent = `▼ Group (${panelCount}-panel ${layoutLabel})`;
  labelSpan.style.flex = '1';
  
  const actions = document.createElement('div');
  actions.className = 'actions';
  
  const layoutBtn = document.createElement('button');
  layoutBtn.className = 'mb';
  layoutBtn.textContent = '⇄';
  layoutBtn.title = 'Change Layout';
  layoutBtn.onclick = (e) => { e.stopPropagation(); changeGroupLayoutUI(rowIdx); };
  actions.appendChild(layoutBtn);
  
  const delBtn = document.createElement('button');
  delBtn.className = 'db';
  delBtn.textContent = '🗑';
  delBtn.onclick = (e) => { e.stopPropagation(); ungroupRow(rowIdx, e); };
  actions.appendChild(delBtn);
  
  header.appendChild(labelSpan);
  header.appendChild(actions);
  
  // Toggle collapse and select group
  let collapsed = false;
  header.onclick = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (e.target === labelSpan || e.target === header) {
      // Select group
      selGroup(rowIdx);
    }
  };
  
  // Double-click to toggle collapse
  labelSpan.ondblclick = (e) => {
    e.stopPropagation();
    collapsed = !collapsed;
    panelsContainer.style.display = collapsed ? 'none' : 'block';
    labelSpan.textContent = (collapsed ? '▶' : '▼') + labelSpan.textContent.substring(1);
  };
  
  setupRowDragDrop(header, rowIdx);
  
  groupContainer.appendChild(header);
  
  // Panels in group with their layers
  const panelsContainer = document.createElement('div');
  panelsContainer.style.paddingLeft = '0';
  
  row.panels.forEach((p, idx) => {
    const panelTree = createPanelTreeItem(p, startPanelIndex + idx, row, rowIdx, true);
    panelsContainer.appendChild(panelTree);
  });
  
  groupContainer.appendChild(panelsContainer);
  
  return groupContainer;
}

function createPanelTreeItem(panel, panelIndex, row, rowIdx, inGroup) {
  const container = document.createElement('div');
  
  // Panel header
  const panelHeader = document.createElement('div');
  panelHeader.className = 'tree-item' + (selPID === panel.id && selectionType === 'panel' ? ' sel' : '');
  if (inGroup) panelHeader.classList.add('indent-1');
  
  const labelSpan = document.createElement('span');
  labelSpan.className = 'label';
  labelSpan.textContent = `▼ Panel ${panelIndex}`;
  labelSpan.style.flex = '1';
  labelSpan.style.fontWeight = 'bold';
  
  const actions = document.createElement('div');
  actions.className = 'actions';
  
  if (!inGroup) {
    const upBtn = document.createElement('button');
    upBtn.className = 'mb';
    upBtn.textContent = '↑';
    upBtn.onclick = (e) => { e.stopPropagation(); moveRow(rowIdx, -1, e); };
    actions.appendChild(upBtn);
    
    const downBtn = document.createElement('button');
    downBtn.className = 'mb';
    downBtn.textContent = '↓';
    downBtn.onclick = (e) => { e.stopPropagation(); moveRow(rowIdx, 1, e); };
    actions.appendChild(downBtn);
  }
  
  const delBtn = document.createElement('button');
  delBtn.className = 'db';
  delBtn.textContent = '🗑';
  delBtn.onclick = (e) => { e.stopPropagation(); delPanel(panel.id, e); };
  actions.appendChild(delBtn);
  
  panelHeader.appendChild(labelSpan);
  panelHeader.appendChild(actions);
  
  // Select panel on click
  panelHeader.onclick = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    selPanel(panel.id);
  };
  
  // Toggle collapse
  let collapsed = false;
  labelSpan.ondblclick = (e) => {
    e.stopPropagation();
    collapsed = !collapsed;
    layersContainer.style.display = collapsed ? 'none' : 'block';
    labelSpan.textContent = (collapsed ? '▶' : '▼') + labelSpan.textContent.substring(1);
  };
  
  if (!inGroup) {
    panelHeader.setAttribute('draggable', 'true');
    panelHeader.dataset.rowIdx = rowIdx;
    setupRowDragDrop(panelHeader, rowIdx);
  }
  
  container.appendChild(panelHeader);
  
  // Layers under panel
  const layersContainer = document.createElement('div');
  
  // Initialize layers if needed
  if (!panel.layers || panel.layers.length === 0) {
    Layers.initializeLayers(panel);
  }
  
  // Render each layer
  if (panel.layers) {
    panel.layers.forEach(layer => {
      const layerItem = document.createElement('div');
      layerItem.className = 'tree-item' + (selLayerID === layer.id && (selectionType === layer.kind || (layer.kind === 'bubble' && selectionType === 'bubble')) ? ' sel' : '');
      layerItem.classList.add(inGroup ? 'indent-2' : 'indent-1');
      
      const icon = document.createElement('span');
      icon.className = 'icon';
      if (layer.kind === 'image') {
        icon.textContent = '🖼';
      } else if (layer.kind === 'bubble') {
        icon.textContent = '💬';
      } else if (layer.kind === 'overlay') {
        icon.textContent = '🎨';
      }
      layerItem.appendChild(icon);
      
      const layerLabel = document.createElement('span');
      layerLabel.className = 'label';
      if (layer.kind === 'image') {
        layerLabel.textContent = 'Image';
      } else if (layer.kind === 'bubble') {
        const bubbleText = layer.bubbleData.text || '(empty)';
        layerLabel.textContent = `"${bubbleText.substring(0, 20)}${bubbleText.length > 20 ? '...' : ''}"`;
      } else if (layer.kind === 'overlay') {
        const fileName = layer.file.split('/').pop().replace(/\.(png|svg|jpg)$/, '');
        layerLabel.textContent = fileName;
      }
      layerItem.appendChild(layerLabel);
      
      // Actions for layers (except image)
      if (layer.kind !== 'image') {
        const layerActions = document.createElement('div');
        layerActions.className = 'actions';
        
        const upBtn = document.createElement('button');
        upBtn.className = 'mb';
        upBtn.textContent = '↑';
        upBtn.onclick = (e) => { e.stopPropagation(); moveLayerUp(panel.id, layer.id); };
        layerActions.appendChild(upBtn);
        
        const downBtn = document.createElement('button');
        downBtn.className = 'mb';
        downBtn.textContent = '↓';
        downBtn.onclick = (e) => { e.stopPropagation(); moveLayerDown(panel.id, layer.id); };
        layerActions.appendChild(downBtn);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'db';
        delBtn.textContent = '🗑';
        delBtn.onclick = (e) => { 
          e.stopPropagation(); 
          if (layer.kind === 'bubble') {
            delBubble(panel.id, layer.id);
          } else if (layer.kind === 'overlay') {
            removeOverlay(panel.id, layer.id);
          }
        };
        layerActions.appendChild(delBtn);
        
        layerItem.appendChild(layerActions);
      }
      
      // Select layer on click
      layerItem.onclick = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        if (layer.kind === 'bubble') {
          selBubble(panel.id, layer.id);
        } else if (layer.kind === 'overlay') {
          selOverlay(panel.id, layer.id);
        } else if (layer.kind === 'image') {
          selPanel(panel.id);
        }
      };
      
      layersContainer.appendChild(layerItem);
    });
  }
  
  container.appendChild(layersContainer);
  
  return container;
}

function setupRowDragDrop(element, rowIdx) {
  let dragRowIdx = null;
  
  element.addEventListener('dragstart', e => {
    dragRowIdx = rowIdx;
    element.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'row-sort');
  });
  
  element.addEventListener('dragend', () => {
    element.classList.remove('dragging');
    dragRowIdx = null;
    document.querySelectorAll('.pi, .group-header').forEach(el => el.classList.remove('drag-over'));
  });
  
  element.addEventListener('dragover', e => {
    e.preventDefault();
    if (dragRowIdx !== null && dragRowIdx !== rowIdx) {
      e.dataTransfer.dropEffect = 'move';
      element.classList.add('drag-over');
    }
  });
  
  element.addEventListener('dragleave', () => {
    element.classList.remove('drag-over');
  });
  
  element.addEventListener('drop', e => {
    e.preventDefault();
    element.classList.remove('drag-over');
    if (dragRowIdx === null || dragRowIdx === rowIdx) return;
    
    const rows = Panels.getRows();
    const [moved] = rows.splice(dragRowIdx, 1);
    rows.splice(rowIdx, 0, moved);
    Panels.setRows(rows);
    
    HistoryLog.add('PANEL_MOVE', `Row moved from position ${dragRowIdx + 1} to ${rowIdx + 1}`);
    renderAll();
  });
}

// ── INSPECTOR PANEL RENDERING (RIGHT SIDEBAR) ──
function renderInspector() {
  const panel = document.getElementById('inspector-panel');
  if (!panel) return;
  
  panel.innerHTML = '';
  
  if (!selectionType) {
    panel.innerHTML = '<div style="text-align:center;color:#666;padding:20px;font-size:11px">Select a group, panel, or layer to view options</div>';
    return;
  }
  
  if (selectionType === 'group' && selGroupIdx !== null) {
    renderGroupInspector(panel);
  } else if (selectionType === 'panel' && selPID) {
    renderPanelInspector(panel);
  } else if (selectionType === 'bubble' && selPID && selBID) {
    renderBubbleInspector(panel);
  } else if (selectionType === 'overlay' && selPID && selLayerID) {
    renderOverlayInspector(panel);
  }
}

function renderGroupInspector(container) {
  const rows = Panels.getRows();
  const row = rows[selGroupIdx];
  if (!row) return;
  
  container.innerHTML = '<h3 style="margin:0 0 10px 0;font-size:13px;color:#ff0">Group Settings</h3>';
  
  // Layout picker
  const layoutSection = document.createElement('details');
  layoutSection.className = 'inspector-section';
  layoutSection.open = true;
  
  const layoutSummary = document.createElement('summary');
  layoutSummary.textContent = 'Layout';
  layoutSection.appendChild(layoutSummary);
  
  const layoutControls = document.createElement('div');
  layoutControls.className = 'inspector-controls';
  
  const layoutPicker = document.createElement('div');
  layoutPicker.className = 'layout-picker';
  
  const layouts = Panels.getLayoutOptions(row.panels.length);
  layouts.forEach(layout => {
    const card = document.createElement('div');
    card.className = 'layout-card' + (row.layout === layout.key ? ' selected' : '');
    card.title = layout.label;
    card.onclick = () => {
      changeGroupLayout(selGroupIdx, layout.key);
    };
    
    const preview = document.createElement('div');
    preview.className = 'layout-preview';
    preview.style.gridTemplateColumns = layout.cols;
    preview.style.gridTemplateRows = layout.rows;
    
    layout.positions.forEach((pos, idx) => {
      const cell = document.createElement('div');
      cell.className = 'layout-preview-cell';
      cell.style.gridColumn = pos.col;
      cell.style.gridRow = pos.row;
      cell.textContent = idx + 1;
      preview.appendChild(cell);
    });
    
    card.appendChild(preview);
    layoutPicker.appendChild(card);
  });
  
  layoutControls.appendChild(layoutPicker);
  layoutSection.appendChild(layoutControls);
  container.appendChild(layoutSection);
  
  // Gap size (future feature - placeholder)
  const gapSection = document.createElement('details');
  gapSection.className = 'inspector-section';
  const gapSummary = document.createElement('summary');
  gapSummary.textContent = 'Gap Size';
  gapSection.appendChild(gapSummary);
  const gapControls = document.createElement('div');
  gapControls.className = 'inspector-controls';
  gapControls.innerHTML = '<label>Gap (px):</label><input type="range" min="0" max="20" value="4" disabled title="Coming soon">';
  gapSection.appendChild(gapControls);
  container.appendChild(gapSection);
  
  // Delete group button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn br';
  deleteBtn.textContent = '🗑 Delete Group';
  deleteBtn.style.marginTop = '10px';
  deleteBtn.style.width = '100%';
  deleteBtn.onclick = () => ungroupRow(selGroupIdx);
  container.appendChild(deleteBtn);
}

function renderPanelInspector(container) {
  const panel = Panels.getPanel(selPID);
  if (!panel) return;
  
  const row = Panels.findRow(selPID);
  const inGroup = row && row.row.type !== 'single';
  
  container.innerHTML = '<h3 style="margin:0 0 10px 0;font-size:13px;color:#ff0">Panel Settings</h3>';
  
  // Panel controls
  const controlsSection = document.createElement('details');
  controlsSection.className = 'inspector-section';
  controlsSection.open = true;
  const controlsSummary = document.createElement('summary');
  controlsSummary.textContent = 'Transform';
  controlsSection.appendChild(controlsSummary);
  
  const controls = document.createElement('div');
  controls.className = 'inspector-controls';
  controls.innerHTML = `
    <label>Height (px)</label>
    <input type="number" id="ph" value="${panel.height}" min="80" max="1400" onchange="upH()">
    <label>Offset Y</label>
    <input type="range" id="oy" min="-800" max="400" value="${panel.oy}" oninput="upOY()">
    <label>Offset X</label>
    <input type="range" id="ox" min="-600" max="600" value="${panel.ox}" oninput="upOX()">
    <label>Scale (%)</label>
    <input type="range" id="sc" min="40" max="300" value="${panel.scale}" oninput="upSC()">
  `;
  controlsSection.appendChild(controls);
  container.appendChild(controlsSection);
  
  // Width controls (if in group)
  if (inGroup) {
    const widthSection = document.createElement('details');
    widthSection.className = 'inspector-section';
    widthSection.open = true;
    const widthSummary = document.createElement('summary');
    widthSummary.textContent = 'Panel Width';
    widthSection.appendChild(widthSummary);
    
    const widthControls = document.createElement('div');
    widthControls.className = 'inspector-controls';
    
    const widthInput = document.createElement('div');
    widthInput.style.display = 'flex';
    widthInput.style.gap = '6px';
    widthInput.style.alignItems = 'center';
    widthInput.innerHTML = `
      <label style="margin:0">Width:</label>
      <input type="number" id="panel-width-input" value="${Math.round(panel.width)}" min="10" max="90" style="flex:1" onchange="updatePanelWidth(${selPID})">
      <button class="mb" onclick="togglePanelLock(${selPID})" title="${panel.locked ? 'Unlock' : 'Lock'}">${panel.locked ? '🔒' : '🔓'}</button>
    `;
    widthControls.appendChild(widthInput);
    
    // Visual width bar
    const widthBar = document.createElement('div');
    widthBar.style.cssText = 'margin-top:8px;height:20px;border-radius:4px;overflow:hidden;display:flex';
    row.row.panels.forEach((p, idx) => {
      const segment = document.createElement('div');
      segment.style.width = p.width + '%';
      segment.style.background = p.id === selPID ? '#ff0' : '#555';
      segment.style.display = 'flex';
      segment.style.alignItems = 'center';
      segment.style.justifyContent = 'center';
      segment.style.fontSize = '9px';
      segment.style.color = p.id === selPID ? '#000' : '#ccc';
      segment.textContent = Math.round(p.width) + '%';
      widthBar.appendChild(segment);
    });
    widthControls.appendChild(widthBar);
    
    widthSection.appendChild(widthControls);
    container.appendChild(widthSection);
  }
  
  // Add bubble buttons
  const bubblesSection = document.createElement('details');
  bubblesSection.className = 'inspector-section';
  bubblesSection.open = true;
  const bubblesSummary = document.createElement('summary');
  bubblesSummary.textContent = 'Add Elements';
  bubblesSection.appendChild(bubblesSummary);
  
  const bubblesControls = document.createElement('div');
  bubblesControls.className = 'inspector-controls';
  bubblesControls.innerHTML = `
    <div style="display:flex;gap:4px;flex-wrap:wrap">
      <button class="btn by" style="flex:1" onclick="addBubble('speech')">💬 Speech</button>
      <button class="btn bd" style="flex:1" onclick="addBubble('thought')">💭 Thought</button>
      <button class="btn bb" style="flex:1" onclick="addBubble('sfx')">💥 SFX</button>
    </div>
  `;
  bubblesSection.appendChild(bubblesControls);
  container.appendChild(bubblesSection);
}

function renderBubbleInspector(container) {
  const panel = Panels.getPanel(selPID);
  if (!panel) return;
  
  const bubble = panel.bubbles.find(b => b.id === selBID);
  if (!bubble) return;
  
  container.innerHTML = '<h3 style="margin:0 0 10px 0;font-size:13px;color:#ff0">Bubble Settings</h3>';
  
  // Text
  const textSection = document.createElement('details');
  textSection.className = 'inspector-section';
  textSection.open = true;
  const textSummary = document.createElement('summary');
  textSummary.textContent = 'Text';
  textSection.appendChild(textSummary);
  
  const textControls = document.createElement('div');
  textControls.className = 'inspector-controls';
  textControls.innerHTML = `
    <textarea id="bt" oninput="upBT()" style="min-height:60px">${bubble.text || ''}</textarea>
    <label>Font size: <span id="fsv">${bubble.fontSize || 13}</span>px</label>
    <input type="range" id="bfs" min="8" max="48" value="${bubble.fontSize || 13}" oninput="upBFS()">
  `;
  textSection.appendChild(textControls);
  container.appendChild(textSection);
  
  // Appearance
  const appearanceSection = document.createElement('details');
  appearanceSection.className = 'inspector-section';
  appearanceSection.open = true;
  const appearanceSummary = document.createElement('summary');
  appearanceSummary.textContent = 'Appearance';
  appearanceSection.appendChild(appearanceSummary);
  
  const appearanceControls = document.createElement('div');
  appearanceControls.className = 'inspector-controls';
  appearanceControls.innerHTML = `
    <label>Shape</label>
    <select id="bshape" onchange="upBShape()">
      <option value="oval" ${bubble.shape === 'oval' ? 'selected' : ''}>Oval / Circle</option>
      <option value="rectangle" ${bubble.shape === 'rectangle' ? 'selected' : ''}>Rectangle</option>
      <option value="parallelogram" ${bubble.shape === 'parallelogram' ? 'selected' : ''}>Parallelogram</option>
      <option value="cloud" ${bubble.shape === 'cloud' ? 'selected' : ''}>Cloud</option>
      <option value="spike" ${bubble.shape === 'spike' ? 'selected' : ''}>Spike / Shout</option>
    </select>
    <label>Border Style</label>
    <select id="bborderstyle" onchange="upBBorderStyle()">
      <option value="solid" ${bubble.borderStyle === 'solid' ? 'selected' : ''}>Solid</option>
      <option value="dashed" ${bubble.borderStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
      <option value="dotted" ${bubble.borderStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
      <option value="double" ${bubble.borderStyle === 'double' ? 'selected' : ''}>Double</option>
      <option value="none" ${bubble.borderStyle === 'none' ? 'selected' : ''}>None (borderless)</option>
    </select>
    <label>Tail</label>
    <select id="btail" onchange="upBTail()">
      <option value="bottom-left" ${bubble.tailDir === 'bottom-left' ? 'selected' : ''}>↙ Bottom Left</option>
      <option value="bottom-center" ${bubble.tailDir === 'bottom-center' ? 'selected' : ''}>↓ Bottom Center</option>
      <option value="bottom-right" ${bubble.tailDir === 'bottom-right' ? 'selected' : ''}>↘ Bottom Right</option>
      <option value="top-left" ${bubble.tailDir === 'top-left' ? 'selected' : ''}>↖ Top Left</option>
      <option value="top-center" ${bubble.tailDir === 'top-center' ? 'selected' : ''}>↑ Top Center</option>
      <option value="top-right" ${bubble.tailDir === 'top-right' ? 'selected' : ''}>↗ Top Right</option>
      <option value="left" ${bubble.tailDir === 'left' ? 'selected' : ''}>← Left</option>
      <option value="right" ${bubble.tailDir === 'right' ? 'selected' : ''}>→ Right</option>
      <option value="none" ${bubble.tailDir === 'none' ? 'selected' : ''}>No tail</option>
    </select>
  `;
  appearanceSection.appendChild(appearanceControls);
  container.appendChild(appearanceSection);
  
  // Colors
  const colorsSection = document.createElement('details');
  colorsSection.className = 'inspector-section';
  const colorsSummary = document.createElement('summary');
  colorsSummary.textContent = 'Colors';
  colorsSection.appendChild(colorsSummary);
  
  const colorsControls = document.createElement('div');
  colorsControls.className = 'inspector-controls';
  colorsControls.innerHTML = `
    <div class="cprow">
      <label>Fill</label>
      <input type="color" id="bfill" value="${bubble.fillColor || '#ffffff'}" oninput="upBColors()">
      <label>Text</label>
      <input type="color" id="btcol" value="${bubble.textColor || '#000000'}" oninput="upBColors()">
      <label>Border</label>
      <input type="color" id="bstroke" value="${bubble.strokeColor || '#000000'}" oninput="upBColors()">
    </div>
  `;
  colorsSection.appendChild(colorsControls);
  container.appendChild(colorsSection);
  
  // Z-order and delete
  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display:flex;gap:4px;margin-top:10px;flex-wrap:wrap';
  actionsDiv.innerHTML = `
    <button class="btn bd" style="flex:1" onclick="moveLayerUp(${selPID}, ${selBID})">▲ Move Up</button>
    <button class="btn bd" style="flex:1" onclick="moveLayerDown(${selPID}, ${selBID})">▼ Move Down</button>
    <button class="btn br" style="width:100%;margin-top:4px" onclick="delBubble(${selPID}, ${selBID})">🗑 Delete</button>
  `;
  container.appendChild(actionsDiv);
}

function renderOverlayInspector(container) {
  const panel = Panels.getPanel(selPID);
  if (!panel) return;
  
  const layer = panel.layers ? panel.layers.find(l => l.id === selLayerID && l.kind === 'overlay') : null;
  if (!layer) return;
  
  const fileName = layer.file.split('/').pop().replace(/\.(png|svg|jpg)$/, '');
  
  container.innerHTML = '<h3 style="margin:0 0 10px 0;font-size:13px;color:#ff0">Overlay Settings</h3>';
  
  // Asset name
  const nameDiv = document.createElement('div');
  nameDiv.style.cssText = 'background:#222;border:1px solid #333;border-radius:4px;padding:8px;margin-bottom:10px';
  nameDiv.innerHTML = `<div style="font-size:10px;color:#666">Asset:</div><div style="font-size:12px;color:#fff">${fileName}</div>`;
  container.appendChild(nameDiv);
  
  // Opacity
  const opacitySection = document.createElement('details');
  opacitySection.className = 'inspector-section';
  opacitySection.open = true;
  const opacitySummary = document.createElement('summary');
  opacitySummary.textContent = 'Opacity';
  opacitySection.appendChild(opacitySummary);
  
  const opacityControls = document.createElement('div');
  opacityControls.className = 'inspector-controls';
  opacityControls.innerHTML = `
    <label>Opacity: <span id="overlay-opacity-val">${Math.round((layer.opacity || 0.5) * 100)}%</span></label>
    <input type="range" id="overlay-opacity" min="0" max="100" value="${Math.round((layer.opacity || 0.5) * 100)}" oninput="updateOverlayOpacity(${selPID}, ${selLayerID})">
  `;
  opacitySection.appendChild(opacityControls);
  container.appendChild(opacitySection);
  
  // Z-order and delete
  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display:flex;gap:4px;margin-top:10px;flex-wrap:wrap';
  actionsDiv.innerHTML = `
    <button class="btn bd" style="flex:1" onclick="moveLayerUp(${selPID}, ${selLayerID})">▲ Move Up</button>
    <button class="btn bd" style="flex:1" onclick="moveLayerDown(${selPID}, ${selLayerID})">▼ Move Down</button>
    <button class="btn br" style="width:100%;margin-top:4px" onclick="removeOverlay(${selPID}, ${selLayerID})">🗑 Delete</button>
  `;
  container.appendChild(actionsDiv);
}

// Helper functions for inspector
function updatePanelWidth(panelId) {
  const input = document.getElementById('panel-width-input');
  if (!input) return;
  
  const newWidth = parseInt(input.value);
  if (isNaN(newWidth) || newWidth < 10 || newWidth > 90) return;
  
  const result = Panels.setWidth(panelId, newWidth);
  if (result === 'warning') {
    alert('Warning: All panels are locked and total width ≠ 100%');
  }
  
  renderAll();
  renderInspector();
}

function updateOverlayOpacity(panelId, overlayId) {
  const slider = document.getElementById('overlay-opacity');
  const valSpan = document.getElementById('overlay-opacity-val');
  if (!slider) return;
  
  const opacity = parseInt(slider.value) / 100;
  if (valSpan) valSpan.textContent = slider.value + '%';
  
  const panel = Panels.getPanel(panelId);
  if (panel) {
    Layers.setOpacity(panel, overlayId, opacity);
    renderPage();
  }
}

function moveLayerUp(panelId, layerId) {
  const panel = Panels.getPanel(panelId);
  if (panel) {
    Layers.moveLayerUp(panel, layerId);
    renderAll();
    renderInspector();
  }
}

function moveLayerDown(panelId, layerId) {
  const panel = Panels.getPanel(panelId);
  if (panel) {
    Layers.moveLayerDown(panel, layerId);
    renderAll();
    renderInspector();
  }
}

function changeGroupLayout(rowIdx, layoutKey) {
  const rows = Panels.getRows();
  if (rows[rowIdx]) {
    rows[rowIdx].layout = layoutKey;
    Panels.setRows(rows);
    HistoryLog.add('GROUP_LAYOUT', `Group layout changed to ${layoutKey}`);
    renderAll();
    renderInspector();
  }
}

function delBubble(panelId, bubbleId) {
  const panel = Panels.getPanel(panelId);
  if (!panel) return;
  
  panel.bubbles = panel.bubbles.filter(b => b.id !== bubbleId);
  if (panel.layers) {
    panel.layers = panel.layers.filter(l => !(l.kind === 'bubble' && l.id === bubbleId));
  }
  
  selBID = null;
  selLayerID = null;
  selectionType = 'panel';
  
  HistoryLog.add('BUBBLE_DELETE', `Bubble deleted from panel`);
  renderAll();
  renderInspector();
}

function removeOverlay(panelId, overlayId) {
  const panel = Panels.getPanel(panelId);
  if (panel) {
    Layers.removeOverlay(panel, overlayId);
    selLayerID = null;
    selectionType = 'panel';
    HistoryLog.add('ASSET_REMOVE', `Overlay removed from panel`);
    renderAll();
    renderInspector();
  }
}

// ── PAGE RENDERING ──
function renderPage() {
  const canvas = document.getElementById('page-canvas');
  canvas.innerHTML = '';
  
  const rows = Panels.getRows();
  
  rows.forEach((row, rowIdx) => {
    if (row.type === 'single') {
      renderSinglePanel(canvas, row.panels[0]);
    } else if (row.type === 'group') {
      renderGroup(canvas, row);
    } else {
      // Regular row (2-4 panels side by side)
      renderRow(canvas, row);
    }
    
    // Add gap
    if (rowIdx < rows.length - 1) {
      const gap = document.createElement('div');
      gap.className = 'pgap';
      canvas.appendChild(gap);
    }
  });
}

function renderSinglePanel(container, panel) {
  const el = mkPanelEl(panel, 800, panel.height);
  container.appendChild(el);
}

function renderRow(container, row) {
  const rowEl = document.createElement('div');
  rowEl.className = 'panel-row';
  rowEl.style.display = 'flex';
  rowEl.style.gap = '4px';
  rowEl.style.width = '100%';
  
  row.panels.forEach(p => {
    const width = Math.round(800 * p.width / 100) - 2; // Account for gap
    const el = mkPanelEl(p, width, p.height);
    el.style.flex = 'none';
    el.style.width = width + 'px';
    rowEl.appendChild(el);
  });
  
  container.appendChild(rowEl);
}

function renderGroup(container, row) {
  const groupEl = document.createElement('div');
  groupEl.className = 'panel-group';
  
  const layout = Panels.GROUP_LAYOUTS[row.layout];
  if (!layout) {
    // Fallback to regular row
    renderRow(container, row);
    return;
  }
  
  groupEl.style.display = 'grid';
  groupEl.style.gridTemplateColumns = layout.cols;
  groupEl.style.gridTemplateRows = layout.rows;
  groupEl.style.gap = '4px';
  groupEl.style.width = '800px';
  groupEl.style.minHeight = row.panels[0].height + 'px';
  
  row.panels.forEach((p, idx) => {
    const pos = layout.positions[idx];
    const el = mkPanelEl(p, 0, p.height);
    el.style.gridColumn = pos.col;
    el.style.gridRow = pos.row;
    el.style.width = 'auto';
    groupEl.appendChild(el);
  });
  
  container.appendChild(groupEl);
}

function mkPanelEl(p, width, height) {
  const el = document.createElement('div');
  el.className = 'pp' + (p.id === selPID ? ' psel' : '');
  el.style.height = height + 'px';
  if (width > 0) el.style.width = width + 'px';
  el.onclick = () => selPanel(p.id);
  
  // Initialize layers if needed
  Layers.initializeLayers(p);
  
  // Image
  const imgWrap = document.createElement('div');
  imgWrap.className = 'pimgw';
  const img = document.createElement('img');
  img.src = p.src;
  
  // Use object-position for offset control (ox, oy)
  const oxPct = ((p.ox || 0) / STANDARD_WIDTH) * 100; // Convert px to % of standard width
  const oyPct = ((p.oy || 0) / (p.height || DEFAULT_HEIGHT)) * 100; // Convert px to % of height
  img.style.objectPosition = `${50 + oxPct}% ${50 + oyPct}%`;
  
  // Apply scale if not 100%
  const scale = (p.scale || 100) / 100;
  if (scale !== 1) {
    img.style.transform = `scale(${scale})`;
    img.style.transformOrigin = 'center';
  }
  
  imgWrap.appendChild(img);
  el.appendChild(imgWrap);
  
  // Overlays
  Layers.renderOverlays(el, p, (pid, ovId) => {
    Layers.removeOverlay(p, ovId);
    HistoryLog.add('ASSET_REMOVE', `Overlay removed from Panel ${Panels.getPanelIndex(pid)}`);
    renderAll();
  });
  
  // Bubbles
  p.bubbles.forEach(b => {
    const actualWidth = width > 0 ? width : el.offsetWidth || 800;
    const bel = mkBubbleEl(b, p, actualWidth, height);
    el.appendChild(bel);
  });
  
  // Hover overlay
  const hov = document.createElement('div');
  hov.className = 'pov';
  el.appendChild(hov);
  
  return el;
}

function mkBubbleEl(b, p, panelW, panelH) {
  // Convert percentage to pixels
  const x = (b.xPct / 100) * panelW;
  const y = (b.yPct / 100) * panelH;
  const w = (b.wPct / 100) * panelW;
  const h = (b.hPct / 100) * panelH;
  
  // Store pixel values for this render
  b._px = x;
  b._py = y;
  b._pw = w;
  b._ph = h;
  
  const el = document.createElement('div');
  el.className = 'bubble';
  el.id = 'bubble-' + b.id;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.width = w + 'px';
  el.style.height = h + 'px';
  
  const inner = document.createElement('div');
  inner.className = 'binner';
  
  // SVG shape
  const svg = BubbleShapes.createSVG(b);
  inner.appendChild(svg);
  
  // Text
  const text = document.createElement('div');
  text.className = 'btext' + (b.type === 'sfx' ? ' sfxt' : '');
  text.textContent = b.text || '';
  text.style.fontSize = (b.fontSize || 13) + 'px';
  text.style.color = b.textColor || '#000';
  inner.appendChild(text);
  
  el.appendChild(inner);
  
  // Resize handle
  const rsz = document.createElement('div');
  rsz.className = 'brsz';
  rsz.onmousedown = (e) => {
    e.stopPropagation();
    startResize(e, b, p);
  };
  el.appendChild(rsz);
  
  // Delete button
  const del = document.createElement('div');
  del.className = 'bdelbtn';
  del.textContent = '✕';
  del.onclick = (e) => {
    e.stopPropagation();
    delBubble(b.id, p.id);
  };
  el.appendChild(del);
  
  // Drag to move
  el.onmousedown = (e) => {
    if (e.target === rsz || e.target === del) return;
    selBubble(b.id);
    startDrag(e, b, p);
  };
  
  return el;
}

// ── BUBBLE DRAG & RESIZE ──
function startDrag(e, b, p) {
  e.stopPropagation();
  
  const panelEl = document.querySelector('.pp.psel');
  if (!panelEl) return;
  
  const panelRect = panelEl.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const startPx = b._px;
  const startPy = b._py;
  
  function onMove(e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    b._px = Math.max(0, Math.min(startPx + dx, panelRect.width - b._pw));
    b._py = Math.max(0, Math.min(startPy + dy, panelRect.height - b._ph));
    
    // Update percentage
    b.xPct = (b._px / panelRect.width) * 100;
    b.yPct = (b._py / panelRect.height) * 100;
    
    const el = document.getElementById('bubble-' + b.id);
    if (el) {
      el.style.left = b._px + 'px';
      el.style.top = b._py + 'px';
    }
  }
  
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    renderAll();
  }
  
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startResize(e, b, p) {
  e.stopPropagation();
  
  const panelEl = document.querySelector('.pp.psel');
  if (!panelEl) return;
  
  const panelRect = panelEl.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const startW = b._pw;
  const startH = b._ph;
  
  function onMove(e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    b._pw = Math.max(60, Math.min(startW + dx, panelRect.width - b._px));
    b._ph = Math.max(32, Math.min(startH + dy, panelRect.height - b._py));
    
    // Update percentage
    b.wPct = (b._pw / panelRect.width) * 100;
    b.hPct = (b._ph / panelRect.height) * 100;
    
    const el = document.getElementById('bubble-' + b.id);
    if (el) {
      el.style.width = b._pw + 'px';
      el.style.height = b._ph + 'px';
    }
  }
  
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    renderAll();
  }
  
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ── PANEL CONTROLS ──
function renderInspector() {
  const p = Panels.getPanel(selPID);
  if (!p) {
    document.getElementById('pc').style.display = 'none';
    return;
  }
  
  const pc = document.getElementById('pc');
  pc.style.display = 'block';
  
  document.getElementById('ph').value = p.height;
  document.getElementById('oy').value = p.oy;
  document.getElementById('ox').value = p.ox;
  document.getElementById('sc').value = p.scale;
  
  renderBList(p);
  renderOverlayList(p);
}

function renderBList(p) {
  const list = document.getElementById('blist');
  if (!p || !list) return;
  
  list.innerHTML = '';
  if (p.bubbles.length === 0) {
    list.innerHTML = '<div style="font-size:10px;color:#555">No bubbles yet.</div>';
    return;
  }
  
  p.bubbles.forEach(b => {
    const d = document.createElement('div');
    d.className = 'bi' + (b.id === selBID ? ' sel' : '');
    d.onclick = () => selBubble(b.id);
    
    const dot = document.createElement('div');
    dot.className = 'bdot';
    dot.style.background = b.fillColor || (b.type === 'sfx' ? '#ffee00' : '#ffffff');
    
    const label = document.createElement('span');
    label.style.flex = '1';
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';
    label.style.whiteSpace = 'nowrap';
    label.textContent = b.text || '(empty)';
    
    d.appendChild(dot);
    d.appendChild(label);
    list.appendChild(d);
  });
}

function renderOverlayList(p) {
  const container = document.getElementById('overlay-list');
  Layers.renderOverlayList(container, p,
    (pid, ovId) => {
      Layers.removeOverlay(p, ovId);
      HistoryLog.add('ASSET_REMOVE', `Overlay removed from Panel ${Panels.getPanelIndex(pid)}`);
      renderAll();
    },
    (pid, fromIdx, toIdx) => {
      Layers.reorderOverlay(p, fromIdx, toIdx);
      renderAll();
    },
    (pid, ovId, opacity) => {
      Layers.setOpacity(p, ovId, opacity);
      renderAll();
    }
  );
}

function showBE() {
  const b = getSelBubble();
  if (!b) {
    document.getElementById('be').style.display = 'none';
    return;
  }
  
  const be = document.getElementById('be');
  be.style.display = 'block';
  
  document.getElementById('bt').value = b.text || '';
  document.getElementById('bfs').value = b.fontSize || 13;
  document.getElementById('fsv').textContent = b.fontSize || 13;
  document.getElementById('bshape').value = b.shape || 'oval';
  document.getElementById('bborderstyle').value = b.borderStyle || 'solid';
  document.getElementById('btail').value = b.tail || 'bottom-left';
  document.getElementById('bfill').value = b.fillColor || (b.type === 'sfx' ? '#ffee00' : '#ffffff');
  document.getElementById('btcol').value = b.textColor || '#000000';
  document.getElementById('bstroke').value = b.strokeColor || '#000000';
}

// ── PROPERTY UPDATES ──
function upH() {
  const p = Panels.getPanel(selPID);
  if (p) {
    p.height = parseInt(document.getElementById('ph').value);
    renderAll();
  }
}

function upOY() {
  const p = Panels.getPanel(selPID);
  if (p) {
    p.oy = parseInt(document.getElementById('oy').value);
    renderAll();
  }
}

function upOX() {
  const p = Panels.getPanel(selPID);
  if (p) {
    p.ox = parseInt(document.getElementById('ox').value);
    renderAll();
  }
}

function upSC() {
  const p = Panels.getPanel(selPID);
  if (p) {
    p.scale = parseInt(document.getElementById('sc').value);
    renderAll();
  }
}

function upBT() {
  const b = getSelBubble();
  if (!b) return;
  b.text = document.getElementById('bt').value;
  const el = document.getElementById('bubble-' + b.id);
  if (el) el.querySelector('.btext').textContent = b.text;
  renderBList(Panels.getPanel(selPID));
}

function upBFS() {
  const b = getSelBubble();
  if (!b) return;
  b.fontSize = parseInt(document.getElementById('bfs').value);
  document.getElementById('fsv').textContent = b.fontSize;
  const el = document.getElementById('bubble-' + b.id);
  if (el) el.querySelector('.btext').style.fontSize = b.fontSize + 'px';
}

function upBTail() {
  const b = getSelBubble();
  if (!b) return;
  b.tail = document.getElementById('btail').value;
  renderAll();
  renderInspector();
}

function upBShape() {
  const b = getSelBubble();
  if (!b) return;
  b.shape = document.getElementById('bshape').value;
  renderAll();
  renderInspector();
}

function upBBorderStyle() {
  const b = getSelBubble();
  if (!b) return;
  b.borderStyle = document.getElementById('bborderstyle').value;
  renderAll();
  renderInspector();
}

function upBColors() {
  const b = getSelBubble();
  if (!b) return;
  b.fillColor = document.getElementById('bfill').value;
  b.textColor = document.getElementById('btcol').value;
  b.strokeColor = document.getElementById('bstroke').value;
  renderAll();
  renderInspector();
}

// ── PANEL WIDTH CONTROLS ──
function togglePanelLock(pid, e) {
  e.stopPropagation();
  const result = Panels.toggleLock(pid);
  if (result === 'warning') {
    alert('Warning: All panels are locked and total width does not equal 100%');
  }
  renderAll();
}

function setPanelWidth(pid, newWidth) {
  const success = Panels.setWidth(pid, newWidth);
  if (!success) {
    alert('Cannot resize: no unlocked panels available to balance');
    return;
  }
  renderAll();
}

// ── BUBBLES ──
function addBubble(type) {
  const p = Panels.getPanel(selPID);
  if (!p) return;
  
  const b = {
    id: ++BC,
    type: type,
    text: type === 'sfx' ? 'POW!' : (type === 'thought' ? '...' : 'Text'),
    xPct: 20,
    yPct: 20,
    wPct: 20,
    hPct: 10,
    fontSize: type === 'sfx' ? 24 : 13,
    tail: type === 'thought' ? 'bottom-left' : (type === 'sfx' ? 'none' : 'bottom-left'),
    fillColor: type === 'sfx' ? '#ffee00' : '#ffffff',
    textColor: '#000000',
    strokeColor: type === 'thought' ? '#444444' : '#000000',
    shape: type === 'thought' ? 'cloud' : 'oval',
    borderStyle: type === 'thought' ? 'dashed' : 'solid'
  };
  
  p.bubbles.push(b);
  
  // Add to layers system
  Layers.initializeLayers(p);
  const maxZ = Math.max(...p.layers.map(l => l.zIndex), 0);
  p.layers.push({
    id: b.id,
    kind: 'bubble',
    bubbleData: b,
    zIndex: maxZ + 1
  });
  
  HistoryLog.add('BUBBLE_ADD', `Panel ${Panels.getPanelIndex(p.id)}: "${b.text}"`);
  renderAll();
  selBubble(p.id, b.id);
}

function delBubbleOld(bid, pid) {
  // This is now replaced by delBubble(panelId, bubbleId) above
  delBubble(pid, bid);
}

function delSelBubble() {
  if (selBID && selPID) delBubble(selPID, selBID);
}

// ── PANELS ──
function delPanel(id, e) {
  e.stopPropagation();
  const success = Panels.deletePanel(id);
  if (success) {
    if (selPID === id) {
      selPID = null;
      selBID = null;
      selLayerID = null;
      selectionType = null;
    }
    HistoryLog.add('PANEL_DELETE', 'Panel deleted');
    renderAll();
    renderInspector();
  }
}

function editPanelInGroup(pid, e) {
  e.stopPropagation();
  selPanel(pid);
}

function moveRow(rowIdx, delta, e) {
  e.stopPropagation();
  const rows = Panels.getRows();
  const newIdx = rowIdx + delta;
  if (newIdx < 0 || newIdx >= rows.length) return;
  
  const [moved] = rows.splice(rowIdx, 1);
  rows.splice(newIdx, 0, moved);
  Panels.setRows(rows);
  
  HistoryLog.add('PANEL_MOVE', `Row moved ${delta > 0 ? 'down' : 'up'}`);
  renderAll();
}

function ungroupRow(rowIdx, e) {
  e.stopPropagation();
  const success = Panels.ungroupRow(rowIdx);
  if (success) {
    HistoryLog.add('GROUP_SPLIT', 'Group ungrouped');
    renderAll();
  }
}

// ── GROUP CREATION ──
function createGroup() {
  // Simple group creation by merging with next row
  const {row, rowIdx} = Panels.findRow(selPID);
  if (!row || rowIdx >= Panels.getRows().length - 1) return;
  
  const rows = Panels.getRows();
  const nextRow = rows[rowIdx + 1];
  
  // Merge into row
  const combined = [...row.panels, ...nextRow.panels];
  if (combined.length > 4) {
    alert('Cannot merge: maximum 4 panels per group');
    return;
  }
  
  // Set equal widths
  combined.forEach(p => {
    p.width = 100 / combined.length;
    p.locked = false;
  });
  
  row.panels = combined;
  row.type = 'group';
  
  // Select appropriate default layout
  const layoutKey = combined.length === 2 ? 'col-2' : 
                    combined.length === 3 ? 'col-3' : 
                    combined.length === 4 ? 'col-4' : 'col-2';
  row.layout = layoutKey;
  
  rows.splice(rowIdx + 1, 1);
  Panels.setRows(rows);
  
  HistoryLog.add('GROUP_CREATE', `${combined.length} panels merged into group`);
  renderAll();
}

function changeGroupLayoutUI(rowIdx) {
  // Get the group row
  const rows = Panels.getRows();
  const row = rows[rowIdx !== undefined ? rowIdx : selGroupIdx];
  if (!row || row.type === 'single') {
    alert('Select a group to change layout');
    return;
  }
  
  Modals.openGroupLayout(row.panels.length, (layoutKey) => {
    changeGroupLayout(rowIdx !== undefined ? rowIdx : selGroupIdx, layoutKey);
  });
}

// ── JSON IMPORT ──
function openJsonImport() {
  Modals.openJsonImport((data) => {
    const result = importBubblesFromJson(data);
    if (result.imported > 0) {
      HistoryLog.add('JSON_IMPORT', `${result.imported} bubbles imported`);
      renderAll();
    }
    return result;
  });
}

function importBubblesFromJson(data) {
  const skipped = [];
  let imported = 0;
  
  data.panels.forEach(panelData => {
    const panel = Panels.getPanelByIndex(panelData.id);
    if (!panel) {
      skipped.push(panelData.id);
      return;
    }
    
    panelData.bubbles.forEach(bData => {
      const bubble = {
        id: ++BC,
        type: 'speech',
        text: bData.text,
        xPct: bData.x,
        yPct: bData.y,
        wPct: bData.w,
        hPct: bData.h,
        fontSize: bData.fontSize || 13,
        tail: bData.tailDir || 'bottom-left',
        fillColor: bData.fillColor || '#ffffff',
        textColor: bData.textColor || '#000000',
        strokeColor: bData.strokeColor || '#000000',
        shape: bData.shape || 'oval',
        borderStyle: bData.borderStyle || 'solid'
      };
      
      panel.bubbles.push(bubble);
      imported++;
    });
  });
  
  return {imported, skipped};
}

// ── ASSET DROP TARGETS ──
function setupAssetDropTargets() {
  document.addEventListener('dragover', (e) => {
    const panel = e.target.closest('.pp');
    if (panel && e.dataTransfer.types.includes('text/asset-file')) {
      e.preventDefault();
      panel.classList.add('panel-drop-target');
    }
  });
  
  document.addEventListener('dragleave', (e) => {
    const panel = e.target.closest('.pp');
    if (panel) {
      panel.classList.remove('panel-drop-target');
    }
  });
  
  document.addEventListener('drop', (e) => {
    const panel = e.target.closest('.pp');
    if (!panel) return;
    
    panel.classList.remove('panel-drop-target');
    
    const assetFile = e.dataTransfer.getData('text/asset-file');
    if (!assetFile) return;
    
    e.preventDefault();
    
    // Find panel ID from class
    const allPanels = Panels.getRows().flatMap(r => r.panels);
    const panelEl = panel;
    const panelObj = allPanels.find(p => panelEl.classList.contains('psel') && p.id === selPID) || allPanels[0];
    
    if (panelObj) {
      Assets.addOverlayToPanel(panelObj, assetFile);
      HistoryLog.add('ASSET_ADD', `Asset added to Panel ${Panels.getPanelIndex(panelObj.id)}`);
      renderAll();
    }
  });
}

// ── AUTO-SAVE ──
function manualSave() {
  saveState();
  HistoryLog.add('MANUAL_SAVE', 'Manual save triggered');
}

function autoSave() {
  saveState();
  HistoryLog.add('AUTO_SAVE', 'State saved');
}

function saveState() {
  try {
    const rows = Panels.getRows();
    const state = {
      version: SCHEMA_VERSION,
      rows: rows.map(r => {
        const rObj = {
          id: r.id,
          type: r.type,
          panels: r.panels.map(p => ({
            id: p.id,
            src: p.src,
            height: p.height,
            aspectRatio: p.aspectRatio,
            ox: p.ox,
            oy: p.oy,
            scale: p.scale,
            width: p.width || 100,
            locked: p.locked || false,
            layers: p.layers || [],
            bubbles: p.bubbles.map(b => ({
              id: b.id,
              type: b.type,
              text: b.text,
              xPct: b.xPct,
              yPct: b.yPct,
              wPct: b.wPct,
              hPct: b.hPct,
              fontSize: b.fontSize,
              tail: b.tail,
              fillColor: b.fillColor,
              textColor: b.textColor,
              strokeColor: b.strokeColor,
              shape: b.shape || 'oval',
              borderStyle: b.borderStyle || 'solid'
            })),
            overlays: (p.overlays || []).map(o => ({
              id: o.id,
              file: o.file,
              opacity: o.opacity !== undefined ? o.opacity : 0.5,
              blendMode: o.blendMode || 'normal'
            }))
          }))
        };
        if (r.type === 'group') rObj.layout = r.layout;
        return rObj;
      }),
      selPID,
      selBID,
      PC: Panels.getPC(),
      RC: Panels.getRC(),
      BC
    };
    
    localStorage.setItem('mangaEditorState', JSON.stringify(state));
    autoSaveTs = Date.now();
    updateAutoSaveDisplay();
  } catch (e) {
    const el = document.getElementById('autosave-status');
    if (el) {
      el.textContent = 'Auto-save failed';
      el.className = '';
    }
  }
}

function updateAutoSaveDisplay() {
  const el = document.getElementById('autosave-status');
  if (!el) return;
  
  if (!autoSaveTs) {
    el.textContent = 'Auto-save active';
    el.className = '';
    return;
  }
  
  const secs = Math.round((Date.now() - autoSaveTs) / 1000);
  if (secs < 60) {
    el.textContent = 'Auto-saved ' + secs + 's ago';
  } else {
    el.textContent = 'Auto-saved ' + Math.round(secs / 60) + 'm ago';
  }
  el.className = 'saved';
}

function restoreState() {
  try {
    const raw = localStorage.getItem('mangaEditorState');
    if (!raw) return;
    
    const state = JSON.parse(raw);
    
    // Check version - if not current, clear and start fresh
    if (state.version !== SCHEMA_VERSION) {
      localStorage.removeItem('mangaEditorState');
      return;
    }
    
    // Restore counters first
    BC = state.BC || 0;
    Panels.setPC(state.PC || 0);
    Panels.setRC(state.RC || 0);
    
    // Restore rows
    Panels.setRows(state.rows || []);
    selPID = state.selPID || null;
    selBID = state.selBID || null;
    
    // Ensure defaults on all panels
    Panels.getRows().forEach(r => {
      r.panels.forEach(p => {
        if (!p.overlays) p.overlays = [];
        if (p.width === undefined) p.width = 100;
        if (p.locked === undefined) p.locked = false;
        if (!p.layers) p.layers = [];
        if (!p.aspectRatio && p.height) p.aspectRatio = p.height / 800;
        p.bubbles.forEach(b => {
          if (!b.shape) b.shape = 'oval';
          if (!b.borderStyle) b.borderStyle = 'solid';
        });
      });
    });
    
    HistoryLog.add('SESSION_RESTORE', 'Previous session restored');
    autoSaveTs = null;
  } catch (e) {
    // Silent fail - just start fresh
  }
}

function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(autoSave, 60000); // 60 seconds
  
  if (autoSaveTick) clearInterval(autoSaveTick);
  autoSaveTick = setInterval(updateAutoSaveDisplay, 1000);
}

function clearAll() {
  Modals.confirm('Clear all panels and reset the editor?', () => {
    Panels.setRows([]);
    selPID = null;
    selBID = null;
    Panels.setPC(0);
    Panels.setRC(0);
    BC = 0;
    localStorage.removeItem('mangaEditorState');
    document.getElementById('pc').style.display = 'none';
    renderAll();
    autoSaveTs = null;
    
    const el = document.getElementById('autosave-status');
    if (el) {
      el.textContent = 'Cleared';
      el.className = '';
    }
    
    HistoryLog.add('PAGE_CLEAR', 'All panels cleared');
  });
}

// ── EXPORT ──
async function exportPage() {
  const GAP = 6;
  const PAGE_W = 800;
  
  let totalH = 0;
  const rows = Panels.getRows();
  
  rows.forEach((row, idx) => {
    const maxH = Math.max(...row.panels.map(p => p.height));
    totalH += maxH;
    if (idx < rows.length - 1) totalH += GAP;
  });
  
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, PAGE_W, totalH);
  
  let offsetY = 0;
  
  for (let row of rows) {
    const maxH = Math.max(...row.panels.map(p => p.height));
    let offsetX = 0;
    
    for (let p of row.panels) {
      const pw = row.type === 'single' ? PAGE_W : Math.round(PAGE_W * p.width / 100);
      
      // Draw panel background
      ctx.fillStyle = '#111';
      ctx.fillRect(offsetX, offsetY, pw, p.height);
      
      // Draw image
      const img = new Image();
      img.src = p.src;
      await new Promise(resolve => {
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(offsetX, offsetY, pw, p.height);
          ctx.clip();
          ctx.translate(offsetX + p.ox, offsetY + p.oy);
          ctx.scale(p.scale / 100, p.scale / 100);
          ctx.drawImage(img, 0, 0);
          ctx.restore();
          resolve();
        };
      });
      
      // Draw overlays
      if (p.overlays) {
        for (let ov of p.overlays) {
          const ovImg = new Image();
          ovImg.src = ov.file;
          await new Promise(resolve => {
            ovImg.onload = () => {
              ctx.save();
              ctx.globalAlpha = ov.opacity || 0.5;
              ctx.drawImage(ovImg, offsetX, offsetY, pw, p.height);
              ctx.restore();
              resolve();
            };
          });
        }
      }
      
      // Draw bubbles
      p.bubbles.forEach(b => {
        BubbleShapes.drawOnCanvas(ctx, b, offsetX, offsetY);
      });
      
      offsetX += pw + (row.type === 'single' ? 0 : GAP);
    }
    
    offsetY += maxH + GAP;
  }
  
  // Download
  canvas.toBlob(blob => {
    const a = document.createElement('a');
    a.download = 'manga-page-' + Date.now() + '.png';
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });
  
  HistoryLog.add('EXPORT', 'Page exported as PNG');
}
