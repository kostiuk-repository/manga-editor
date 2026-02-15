// ── MANGA EDITOR V5 — Main App ──
const SCHEMA_VERSION = 'v5';
const STANDARD_WIDTH = 800;
const DEFAULT_HEIGHT = 450;

// ── GLOBAL STATE ──
var selPID = null;
var selBID = null;
var selLayerID = null;
var selGroupIdx = null;
var selectionType = null;
var BC = 0;
var autoSaveTimer = null;
var autoSaveTs = null;
var autoSaveTick = null;
var autoSaveNextIn = 60; // seconds countdown
var leftSidebarOpen = true;
var rightSidebarOpen = true;

// ── INITIALIZATION ──
window.addEventListener('DOMContentLoaded', function() {
  Modals.init();
  Assets.init();
  HistoryLog.init(document.body);
  restoreState();
  renderAll();
  startAutoSave();
  setupAssetDropTargets();
});

// ── FILE UPLOAD ──
function handleFiles(e) {
  Array.from(e.target.files).forEach(f => {
    const r = new FileReader();
    r.onload = ev => {
      const tempImg = new Image();
      tempImg.onload = function() {
        const aspectRatio = tempImg.height / tempImg.width;
        const p = Panels.addPanel(ev.target.result);
        p.aspectRatio = aspectRatio;
        p.height = Math.round(STANDARD_WIDTH * aspectRatio);
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
    sidebar.classList.toggle('collapsed', !leftSidebarOpen);
    toggle.classList.toggle('collapsed', !leftSidebarOpen);
    toggle.textContent = leftSidebarOpen ? '◀' : '▶';
  } else {
    rightSidebarOpen = !rightSidebarOpen;
    const sidebar = document.getElementById('sidebar-right');
    const toggle = document.getElementById('toggle-right');
    sidebar.classList.toggle('collapsed', !rightSidebarOpen);
    toggle.classList.toggle('collapsed', !rightSidebarOpen);
    toggle.textContent = rightSidebarOpen ? '▶' : '◀';
  }
}

// ── SELECTION ──
function selPanel(id) {
  selPID = id; selBID = null; selLayerID = null; selGroupIdx = null;
  selectionType = 'panel';
  renderAll();
  renderInspector();
}

function selGroup(rowIdx) {
  selPID = null; selBID = null; selLayerID = null; selGroupIdx = rowIdx;
  selectionType = 'group';
  renderAll();
  renderInspector();
}

function selBubble(panelId, bubbleId) {
  selPID = panelId; selBID = bubbleId; selGroupIdx = null;
  const panel = Panels.getPanel(panelId);
  if (panel && panel.layers) {
    const bl = panel.layers.find(l => l.kind === 'bubble' && l.id === bubbleId);
    selLayerID = bl ? bl.id : bubbleId;
  } else {
    selLayerID = bubbleId;
  }
  selectionType = 'bubble';
  renderAll();
  renderInspector();
}

function selOverlay(panelId, overlayId) {
  selPID = panelId; selBID = null; selLayerID = overlayId; selGroupIdx = null;
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

// ── SIDEBAR ──
function renderSidebar() {
  const list = document.getElementById('panels-list');
  list.innerHTML = '';
  const rows = Panels.getRows();
  let panelIndex = 1;
  rows.forEach((row, rowIdx) => {
    if (row.type === 'single') {
      list.appendChild(createPanelTreeItem(row.panels[0], panelIndex, row, rowIdx, false));
      panelIndex++;
    } else {
      list.appendChild(createGroupTreeItem(row, rowIdx, panelIndex));
      panelIndex += row.panels.length;
    }
  });
}

function createGroupTreeItem(row, rowIdx, startPanelIndex) {
  const groupContainer = document.createElement('div');
  groupContainer.className = 'group-item';

  const header = document.createElement('div');
  header.className = 'tree-item' + (selGroupIdx === rowIdx ? ' sel' : '');
  header.style.fontWeight = 'bold';
  header.style.color = '#ff0';
  header.setAttribute('draggable', 'true');
  header.dataset.rowIdx = rowIdx;

  const layoutLabel = row.layout ? (Panels.GROUP_LAYOUTS[row.layout] ? Panels.GROUP_LAYOUTS[row.layout].label : 'Custom') : 'Row';

  const labelSpan = document.createElement('span');
  labelSpan.className = 'label';
  labelSpan.textContent = `▼ Group (${row.panels.length}-panel ${layoutLabel})`;
  labelSpan.style.flex = '1';

  const actions = document.createElement('div');
  actions.className = 'actions';

  const layoutBtn = document.createElement('button');
  layoutBtn.className = 'mb'; layoutBtn.textContent = '⇄'; layoutBtn.title = 'Change Layout';
  layoutBtn.onclick = e => { e.stopPropagation(); changeGroupLayoutUI(rowIdx); };
  actions.appendChild(layoutBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'db'; delBtn.textContent = '🗑';
  delBtn.onclick = e => { e.stopPropagation(); ungroupRow(rowIdx, e); };
  actions.appendChild(delBtn);

  header.appendChild(labelSpan);
  header.appendChild(actions);

  let collapsed = false;
  header.onclick = e => {
    if (e.target.tagName === 'BUTTON') return;
    selGroup(rowIdx);
  };
  labelSpan.ondblclick = e => {
    e.stopPropagation();
    collapsed = !collapsed;
    panelsContainer.style.display = collapsed ? 'none' : 'block';
    labelSpan.textContent = (collapsed ? '▶' : '▼') + labelSpan.textContent.substring(1);
  };

  setupRowDragDrop(header, rowIdx);
  groupContainer.appendChild(header);

  const panelsContainer = document.createElement('div');
  row.panels.forEach((p, idx) => {
    panelsContainer.appendChild(createPanelTreeItem(p, startPanelIndex + idx, row, rowIdx, true));
  });
  groupContainer.appendChild(panelsContainer);
  return groupContainer;
}

function createPanelTreeItem(panel, panelIndex, row, rowIdx, inGroup) {
  const container = document.createElement('div');

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
    upBtn.className = 'mb'; upBtn.textContent = '↑';
    upBtn.onclick = e => { e.stopPropagation(); moveRow(rowIdx, -1, e); };
    actions.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.className = 'mb'; downBtn.textContent = '↓';
    downBtn.onclick = e => { e.stopPropagation(); moveRow(rowIdx, 1, e); };
    actions.appendChild(downBtn);
  }

  const delBtn = document.createElement('button');
  delBtn.className = 'db'; delBtn.textContent = '🗑';
  delBtn.onclick = e => { e.stopPropagation(); delPanel(panel.id, e); };
  actions.appendChild(delBtn);

  panelHeader.appendChild(labelSpan);
  panelHeader.appendChild(actions);

  panelHeader.onclick = e => {
    if (e.target.tagName === 'BUTTON') return;
    selPanel(panel.id);
  };

  let collapsed = false;
  labelSpan.ondblclick = e => {
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

  const layersContainer = document.createElement('div');
  if (!panel.layers || panel.layers.length === 0) Layers.initializeLayers(panel);

  if (panel.layers) {
    panel.layers.forEach(layer => {
      const isSelLayer = selLayerID === layer.id &&
        (selectionType === layer.kind || (layer.kind === 'bubble' && selectionType === 'bubble'));

      const layerItem = document.createElement('div');
      layerItem.className = 'tree-item' + (isSelLayer ? ' sel' : '');
      layerItem.classList.add(inGroup ? 'indent-2' : 'indent-1');

      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = layer.kind === 'image' ? '🖼' : layer.kind === 'bubble' ? '💬' : '🎨';
      layerItem.appendChild(icon);

      const layerLabel = document.createElement('span');
      layerLabel.className = 'label';
      if (layer.kind === 'image') {
        layerLabel.textContent = 'Image';
      } else if (layer.kind === 'bubble') {
        const t = (layer.bubbleData && layer.bubbleData.text) || '(empty)';
        layerLabel.textContent = `"${t.substring(0, 20)}${t.length > 20 ? '...' : ''}"`;
      } else if (layer.kind === 'overlay') {
        layerLabel.textContent = (layer.file || '').split('/').pop().replace(/\.(png|svg|jpg)$/, '');
      }
      layerItem.appendChild(layerLabel);

      if (layer.kind !== 'image') {
        const layerActions = document.createElement('div');
        layerActions.className = 'actions';

        const upBtn = document.createElement('button');
        upBtn.className = 'mb'; upBtn.textContent = '↑';
        upBtn.onclick = e => { e.stopPropagation(); moveLayerUp(panel.id, layer.id); };
        layerActions.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.className = 'mb'; downBtn.textContent = '↓';
        downBtn.onclick = e => { e.stopPropagation(); moveLayerDown(panel.id, layer.id); };
        layerActions.appendChild(downBtn);

        const dBtn = document.createElement('button');
        dBtn.className = 'db'; dBtn.textContent = '🗑';
        dBtn.onclick = e => {
          e.stopPropagation();
          if (layer.kind === 'bubble') delBubble(panel.id, layer.id);
          else if (layer.kind === 'overlay') removeOverlay(panel.id, layer.id);
        };
        layerActions.appendChild(dBtn);
        layerItem.appendChild(layerActions);
      }

      layerItem.onclick = e => {
        if (e.target.tagName === 'BUTTON') return;
        if (layer.kind === 'bubble') selBubble(panel.id, layer.id);
        else if (layer.kind === 'overlay') selOverlay(panel.id, layer.id);
        else selPanel(panel.id);
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
    e.dataTransfer.setData('text/row-sort', String(rowIdx));
  });

  element.addEventListener('dragend', () => {
    element.classList.remove('dragging');
    dragRowIdx = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  });

  element.addEventListener('dragover', e => {
    // Don't handle asset drags here
    if (e.dataTransfer.types.includes('text/asset-file')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    element.classList.add('drag-over');
  });

  element.addEventListener('dragleave', () => {
    element.classList.remove('drag-over');
  });

  element.addEventListener('drop', e => {
    e.preventDefault();
    element.classList.remove('drag-over');
    // Only handle row sorting
    if (!e.dataTransfer.types.includes('text/row-sort')) return;
    const fromIdx = parseInt(e.dataTransfer.getData('text/row-sort'));
    if (isNaN(fromIdx) || fromIdx === rowIdx) return;

    const rows = Panels.getRows();
    const [moved] = rows.splice(fromIdx, 1);
    rows.splice(rowIdx, 0, moved);
    Panels.setRows(rows);

    HistoryLog.add('PANEL_MOVE', `Row moved from ${fromIdx + 1} to ${rowIdx + 1}`);
    renderAll();
  });
}

// ── INSPECTOR ──
function renderInspector() {
  const panel = document.getElementById('inspector-panel');
  if (!panel) return;
  panel.innerHTML = '';

  if (!selectionType) {
    panel.innerHTML = '<div style="text-align:center;color:#666;padding:20px;font-size:11px">Select a group, panel, or layer to view options</div>';
    return;
  }

  if (selectionType === 'group' && selGroupIdx !== null) renderGroupInspector(panel);
  else if (selectionType === 'panel' && selPID) renderPanelInspector(panel);
  else if (selectionType === 'bubble' && selPID && selBID) renderBubbleInspector(panel);
  else if (selectionType === 'overlay' && selPID && selLayerID) renderOverlayInspector(panel);
}

function renderGroupInspector(container) {
  const rows = Panels.getRows();
  const row = rows[selGroupIdx];
  if (!row) return;

  const title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 10px 0;font-size:13px;color:#ff0';
  title.textContent = 'Group Settings';
  container.appendChild(title);

  // Layout picker
  const layoutSection = document.createElement('details');
  layoutSection.className = 'inspector-section';
  layoutSection.open = true;
  const ls = document.createElement('summary'); ls.textContent = 'Layout';
  layoutSection.appendChild(ls);

  const lc = document.createElement('div'); lc.className = 'inspector-controls';
  const picker = document.createElement('div'); picker.className = 'layout-picker';
  Panels.getLayoutOptions(row.panels.length).forEach(layout => {
    const card = document.createElement('div');
    card.className = 'layout-card' + (row.layout === layout.key ? ' selected' : '');
    card.title = layout.label;
    card.onclick = () => changeGroupLayout(selGroupIdx, layout.key);
    const preview = document.createElement('div');
    preview.className = 'layout-preview';
    preview.style.gridTemplateColumns = layout.cols;
    preview.style.gridTemplateRows = layout.rows;
    layout.positions.forEach((pos, idx) => {
      const cell = document.createElement('div');
      cell.className = 'layout-preview-cell';
      cell.style.gridColumn = pos.col; cell.style.gridRow = pos.row;
      cell.textContent = idx + 1;
      preview.appendChild(cell);
    });
    card.appendChild(preview);
    picker.appendChild(card);
  });
  lc.appendChild(picker);
  layoutSection.appendChild(lc);
  container.appendChild(layoutSection);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn br';
  deleteBtn.textContent = '🗑 Ungroup';
  deleteBtn.style.cssText = 'margin-top:10px;width:100%';
  deleteBtn.onclick = () => {
    const rows = Panels.getRows();
    Panels.ungroupRow(selGroupIdx);
    selGroupIdx = null; selectionType = null;
    HistoryLog.add('GROUP_SPLIT', 'Group ungrouped');
    renderAll(); renderInspector();
  };
  container.appendChild(deleteBtn);
}

function renderPanelInspector(container) {
  const panel = Panels.getPanel(selPID);
  if (!panel) return;

  const rowInfo = Panels.findRow(selPID);
  const inGroup = rowInfo && rowInfo.row && rowInfo.row.type !== 'single';

  const title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 10px 0;font-size:13px;color:#ff0';
  title.textContent = `Panel ${Panels.getPanelIndex(selPID)} Settings`;
  container.appendChild(title);

  // Transform section
  const transformSection = document.createElement('details');
  transformSection.className = 'inspector-section';
  transformSection.open = true;
  const ts = document.createElement('summary'); ts.textContent = 'Transform';
  transformSection.appendChild(ts);

  const tc = document.createElement('div'); tc.className = 'inspector-controls';
  tc.innerHTML = `
    <label>Height: <strong id="ph-val">${panel.height}px</strong></label>
    <input type="range" id="ph" min="80" max="1400" value="${panel.height}" oninput="upH()">
    <label>Offset Y: <strong id="oy-val">${panel.oy}</strong></label>
    <input type="range" id="oy" min="-800" max="400" value="${panel.oy}" oninput="upOY()">
    <label>Offset X: <strong id="ox-val">${panel.ox}</strong></label>
    <input type="range" id="ox" min="-600" max="600" value="${panel.ox}" oninput="upOX()">
    <label>Scale: <strong id="sc-val">${panel.scale}%</strong></label>
    <input type="range" id="sc" min="40" max="300" value="${panel.scale}" oninput="upSC()">
  `;
  transformSection.appendChild(tc);
  container.appendChild(transformSection);

  // Aspect ratio info
  if (panel.aspectRatio) {
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:6px;font-size:10px;color:#666;margin-bottom:4px';
    const w = STANDARD_WIDTH;
    const h = panel.height;
    infoDiv.innerHTML = `<span style="color:#555">Size:</span> <span style="color:#888">${w}×${h}px</span> &nbsp;
      <span style="color:#555">Ratio:</span> <span style="color:#888">${(panel.aspectRatio).toFixed(2)}</span>`;
    container.appendChild(infoDiv);
  }

  // Width section (if in group)
  if (inGroup && rowInfo.row) {
    const widthSection = document.createElement('details');
    widthSection.className = 'inspector-section';
    widthSection.open = true;
    const ws = document.createElement('summary'); ws.textContent = 'Panel Width';
    widthSection.appendChild(ws);

    const wc = document.createElement('div'); wc.className = 'inspector-controls';

    const widthRow = document.createElement('div');
    widthRow.style.cssText = 'display:flex;gap:6px;align-items:center';
    widthRow.innerHTML = `
      <label style="margin:0;white-space:nowrap">Width: <strong>${Math.round(panel.width)}%</strong></label>
      <input type="range" id="panel-width-slider" min="10" max="90" value="${Math.round(panel.width)}" style="flex:1" oninput="updatePanelWidthSlider(${selPID})">
      <button class="mb" onclick="togglePanelLock(${selPID}, event)" title="${panel.locked ? 'Unlock' : 'Lock'}">${panel.locked ? '🔒' : '🔓'}</button>
    `;
    wc.appendChild(widthRow);

    // Width bar
    const widthBar = document.createElement('div');
    widthBar.style.cssText = 'margin-top:6px;height:18px;border-radius:4px;overflow:hidden;display:flex';
    rowInfo.row.panels.forEach(p => {
      const seg = document.createElement('div');
      seg.style.cssText = `width:${p.width}%;background:${p.id === selPID ? '#ff0' : '#555'};display:flex;align-items:center;justify-content:center;font-size:9px;color:${p.id === selPID ? '#000' : '#ccc'}`;
      seg.textContent = Math.round(p.width) + '%';
      widthBar.appendChild(seg);
    });
    wc.appendChild(widthBar);
    widthSection.appendChild(wc);
    container.appendChild(widthSection);
  }

  // Reset transform button
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn bd';
  resetBtn.style.cssText = 'width:100%;margin-bottom:6px';
  resetBtn.textContent = '↺ Reset Transform';
  resetBtn.onclick = () => {
    panel.ox = 0; panel.oy = 0; panel.scale = 100;
    renderAll(); renderInspector();
  };
  container.appendChild(resetBtn);

  // Add elements section
  const addSection = document.createElement('details');
  addSection.className = 'inspector-section';
  addSection.open = true;
  const as = document.createElement('summary'); as.textContent = 'Add Elements';
  addSection.appendChild(as);

  const ac = document.createElement('div'); ac.className = 'inspector-controls';
  ac.innerHTML = `
    <div style="display:flex;gap:4px;flex-wrap:wrap">
      <button class="btn by" style="flex:1" onclick="addBubble('speech')">💬 Speech</button>
      <button class="btn bd" style="flex:1" onclick="addBubble('thought')">💭 Thought</button>
      <button class="btn bb" style="flex:1" onclick="addBubble('sfx')">💥 SFX</button>
    </div>
  `;
  addSection.appendChild(ac);
  container.appendChild(addSection);
}

function renderBubbleInspector(container) {
  const panel = Panels.getPanel(selPID);
  if (!panel) return;
  const bubble = panel.bubbles.find(b => b.id === selBID);
  if (!bubble) return;

  const title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 10px 0;font-size:13px;color:#ff0';
  title.textContent = 'Bubble Settings';
  container.appendChild(title);

  // Type badge
  const typeBadge = document.createElement('div');
  typeBadge.style.cssText = 'display:flex;gap:4px;margin-bottom:8px';
  ['speech','thought','sfx'].forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (bubble.type === t ? 'by' : 'bd');
    btn.style.cssText = 'flex:1;font-size:10px;padding:3px';
    btn.textContent = t === 'speech' ? '💬' : t === 'thought' ? '💭' : '💥';
    btn.title = t;
    btn.onclick = () => { bubble.type = t; renderAll(); renderInspector(); };
    typeBadge.appendChild(btn);
  });
  container.appendChild(typeBadge);

  // Text section
  const textSection = document.createElement('details');
  textSection.className = 'inspector-section'; textSection.open = true;
  const tsum = document.createElement('summary'); tsum.textContent = 'Text';
  textSection.appendChild(tsum);
  const tc = document.createElement('div'); tc.className = 'inspector-controls';
  tc.innerHTML = `
    <textarea id="bt" oninput="upBT()" style="min-height:60px">${bubble.text || ''}</textarea>
    <label>Font size: <strong id="fsv">${bubble.fontSize || 13}px</strong></label>
    <input type="range" id="bfs" min="8" max="48" value="${bubble.fontSize || 13}" oninput="upBFS()">
  `;
  textSection.appendChild(tc); container.appendChild(textSection);

  // Appearance
  const appSection = document.createElement('details');
  appSection.className = 'inspector-section'; appSection.open = true;
  const asum = document.createElement('summary'); asum.textContent = 'Appearance';
  appSection.appendChild(asum);
  const ac = document.createElement('div'); ac.className = 'inspector-controls';
  ac.innerHTML = `
    <label>Shape</label>
    <select id="bshape" onchange="upBShape()">
      <option value="oval" ${bubble.shape==='oval'?'selected':''}>Oval / Circle</option>
      <option value="rectangle" ${bubble.shape==='rectangle'?'selected':''}>Rectangle</option>
      <option value="parallelogram" ${bubble.shape==='parallelogram'?'selected':''}>Parallelogram</option>
      <option value="cloud" ${bubble.shape==='cloud'?'selected':''}>Cloud</option>
      <option value="spike" ${bubble.shape==='spike'?'selected':''}>Spike / Shout</option>
    </select>
    <label>Border Style</label>
    <select id="bborderstyle" onchange="upBBorderStyle()">
      <option value="solid" ${bubble.borderStyle==='solid'?'selected':''}>Solid</option>
      <option value="dashed" ${bubble.borderStyle==='dashed'?'selected':''}>Dashed</option>
      <option value="dotted" ${bubble.borderStyle==='dotted'?'selected':''}>Dotted</option>
      <option value="double" ${bubble.borderStyle==='double'?'selected':''}>Double</option>
      <option value="none" ${bubble.borderStyle==='none'?'selected':''}>None</option>
    </select>
    <label>Tail Direction</label>
    <select id="btail" onchange="upBTail()">
      <option value="bottom-left" ${(bubble.tail||bubble.tailDir)==='bottom-left'?'selected':''}>↙ Bottom Left</option>
      <option value="bottom-center" ${(bubble.tail||bubble.tailDir)==='bottom-center'?'selected':''}>↓ Bottom Center</option>
      <option value="bottom-right" ${(bubble.tail||bubble.tailDir)==='bottom-right'?'selected':''}>↘ Bottom Right</option>
      <option value="top-left" ${(bubble.tail||bubble.tailDir)==='top-left'?'selected':''}>↖ Top Left</option>
      <option value="top-center" ${(bubble.tail||bubble.tailDir)==='top-center'?'selected':''}>↑ Top Center</option>
      <option value="top-right" ${(bubble.tail||bubble.tailDir)==='top-right'?'selected':''}>↗ Top Right</option>
      <option value="left" ${(bubble.tail||bubble.tailDir)==='left'?'selected':''}>← Left</option>
      <option value="right" ${(bubble.tail||bubble.tailDir)==='right'?'selected':''}>→ Right</option>
      <option value="none" ${(bubble.tail||bubble.tailDir)==='none'?'selected':''}>No tail</option>
    </select>
  `;
  appSection.appendChild(ac); container.appendChild(appSection);

  // Colors
  const colorSection = document.createElement('details');
  colorSection.className = 'inspector-section'; colorSection.open = true;
  const csum = document.createElement('summary'); csum.textContent = 'Colors';
  colorSection.appendChild(csum);
  const cc = document.createElement('div'); cc.className = 'inspector-controls';
  cc.innerHTML = `
    <div class="cprow">
      <label>Fill</label>
      <input type="color" id="bfill" value="${bubble.fillColor||'#ffffff'}" oninput="upBColors()">
      <label>Text</label>
      <input type="color" id="btcol" value="${bubble.textColor||'#000000'}" oninput="upBColors()">
      <label>Border</label>
      <input type="color" id="bstroke" value="${bubble.strokeColor||'#000000'}" oninput="upBColors()">
    </div>
  `;
  colorSection.appendChild(cc); container.appendChild(colorSection);

  // Position & Size
  const posSection = document.createElement('details');
  posSection.className = 'inspector-section';
  const psum = document.createElement('summary'); psum.textContent = 'Position & Size';
  posSection.appendChild(psum);
  const pc2 = document.createElement('div'); pc2.className = 'inspector-controls';
  pc2.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div><label>X%</label><input type="number" value="${bubble.xPct.toFixed(1)}" min="0" max="100" step="0.5" onchange="bubble_setPct(${selBID},'xPct',this.value)"></div>
      <div><label>Y%</label><input type="number" value="${bubble.yPct.toFixed(1)}" min="0" max="100" step="0.5" onchange="bubble_setPct(${selBID},'yPct',this.value)"></div>
      <div><label>W%</label><input type="number" value="${bubble.wPct.toFixed(1)}" min="5" max="100" step="0.5" onchange="bubble_setPct(${selBID},'wPct',this.value)"></div>
      <div><label>H%</label><input type="number" value="${bubble.hPct.toFixed(1)}" min="5" max="100" step="0.5" onchange="bubble_setPct(${selBID},'hPct',this.value)"></div>
    </div>
  `;
  posSection.appendChild(pc2); container.appendChild(posSection);

  // Actions
  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display:flex;gap:4px;margin-top:10px;flex-wrap:wrap';
  actionsDiv.innerHTML = `
    <button class="btn bd" style="flex:1" onclick="moveLayerUp(${selPID},${selBID})">▲ Up</button>
    <button class="btn bd" style="flex:1" onclick="moveLayerDown(${selPID},${selBID})">▼ Down</button>
    <button class="btn br" style="width:100%;margin-top:4px" onclick="delBubble(${selPID},${selBID})">🗑 Delete Bubble</button>
  `;
  container.appendChild(actionsDiv);
}

function renderOverlayInspector(container) {
  const panel = Panels.getPanel(selPID);
  if (!panel) return;
  const layer = panel.layers ? panel.layers.find(l => l.id === selLayerID && l.kind === 'overlay') : null;
  if (!layer) return;

  const fileName = (layer.file || '').split('/').pop().replace(/\.(png|svg|jpg)$/, '');

  const title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 10px 0;font-size:13px;color:#ff0';
  title.textContent = 'Overlay Settings';
  container.appendChild(title);

  const nameDiv = document.createElement('div');
  nameDiv.style.cssText = 'background:#222;border:1px solid #333;border-radius:4px;padding:8px;margin-bottom:10px';
  nameDiv.innerHTML = `<div style="font-size:10px;color:#666">Asset:</div><div style="font-size:12px;color:#fff">${fileName}</div>`;
  container.appendChild(nameDiv);

  const opacitySection = document.createElement('details');
  opacitySection.className = 'inspector-section'; opacitySection.open = true;
  const osum = document.createElement('summary'); osum.textContent = 'Opacity';
  opacitySection.appendChild(osum);
  const oc = document.createElement('div'); oc.className = 'inspector-controls';
  oc.innerHTML = `
    <label>Opacity: <strong id="overlay-opacity-val">${Math.round((layer.opacity||0.5)*100)}%</strong></label>
    <input type="range" id="overlay-opacity" min="0" max="100" value="${Math.round((layer.opacity||0.5)*100)}" oninput="updateOverlayOpacity(${selPID},${selLayerID})">
  `;
  opacitySection.appendChild(oc); container.appendChild(opacitySection);

  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display:flex;gap:4px;margin-top:10px;flex-wrap:wrap';
  actionsDiv.innerHTML = `
    <button class="btn bd" style="flex:1" onclick="moveLayerUp(${selPID},${selLayerID})">▲ Up</button>
    <button class="btn bd" style="flex:1" onclick="moveLayerDown(${selPID},${selLayerID})">▼ Down</button>
    <button class="btn br" style="width:100%;margin-top:4px" onclick="removeOverlay(${selPID},${selLayerID})">🗑 Delete</button>
  `;
  container.appendChild(actionsDiv);
}

// ── INSPECTOR HELPERS ──
function updatePanelWidthSlider(panelId) {
  const slider = document.getElementById('panel-width-slider');
  if (!slider) return;
  const newWidth = parseInt(slider.value);
  if (isNaN(newWidth)) return;
  const result = Panels.setWidth(panelId, newWidth);
  if (result === false) {
    alert('Cannot resize: no unlocked panels to balance');
    return;
  }
  // Re-render inspector to update values
  renderInspector();
  renderPage();
}

function updatePanelWidth(panelId) {
  updatePanelWidthSlider(panelId);
}

function updateOverlayOpacity(panelId, overlayId) {
  const slider = document.getElementById('overlay-opacity');
  const valSpan = document.getElementById('overlay-opacity-val');
  if (!slider) return;
  const opacity = parseInt(slider.value) / 100;
  if (valSpan) valSpan.textContent = slider.value + '%';
  const panel = Panels.getPanel(panelId);
  if (panel) { Layers.setOpacity(panel, overlayId, opacity); renderPage(); }
}

function moveLayerUp(panelId, layerId) {
  const panel = Panels.getPanel(panelId);
  if (panel) { Layers.moveLayerUp(panel, layerId); renderAll(); renderInspector(); }
}

function moveLayerDown(panelId, layerId) {
  const panel = Panels.getPanel(panelId);
  if (panel) { Layers.moveLayerDown(panel, layerId); renderAll(); renderInspector(); }
}

function changeGroupLayout(rowIdx, layoutKey) {
  const rows = Panels.getRows();
  if (rows[rowIdx]) {
    rows[rowIdx].layout = layoutKey;
    rows[rowIdx].type = 'group';
    Panels.setRows(rows);
    HistoryLog.add('GROUP_LAYOUT', `Layout changed to ${layoutKey}`);
    renderAll(); renderInspector();
  }
}

function bubble_setPct(bubbleId, prop, val) {
  const p = Panels.getPanel(selPID);
  if (!p) return;
  const b = p.bubbles.find(b => b.id === bubbleId);
  if (!b) return;
  b[prop] = parseFloat(val);
  renderAll();
  // Don't re-render inspector to preserve focus
}

function delBubble(panelId, bubbleId) {
  const panel = Panels.getPanel(panelId);
  if (!panel) return;
  panel.bubbles = panel.bubbles.filter(b => b.id !== bubbleId);
  if (panel.layers) {
    panel.layers = panel.layers.filter(l => !(l.kind === 'bubble' && l.id === bubbleId));
  }
  if (selBID === bubbleId) {
    selBID = null; selLayerID = null; selectionType = 'panel';
  }
  HistoryLog.add('BUBBLE_DELETE', 'Bubble deleted');
  renderAll(); renderInspector();
}

function removeOverlay(panelId, overlayId) {
  const panel = Panels.getPanel(panelId);
  if (panel) {
    Layers.removeOverlay(panel, overlayId);
    if (selLayerID === overlayId) { selLayerID = null; selectionType = 'panel'; }
    HistoryLog.add('ASSET_REMOVE', 'Overlay removed');
    renderAll(); renderInspector();
  }
}

// ── PAGE RENDERING ──
function renderPage() {
  const canvas = document.getElementById('page-canvas');
  canvas.innerHTML = '';
  const rows = Panels.getRows();
  rows.forEach((row, rowIdx) => {
    if (row.type === 'single') renderSinglePanel(canvas, row.panels[0]);
    else renderGroup(canvas, row);
    if (rowIdx < rows.length - 1) {
      const gap = document.createElement('div');
      gap.className = 'pgap';
      canvas.appendChild(gap);
    }
  });
}

function renderSinglePanel(container, panel) {
  const el = mkPanelEl(panel, STANDARD_WIDTH, panel.height);
  container.appendChild(el);
}

function renderGroup(container, row) {
  const layout = Panels.GROUP_LAYOUTS[row.layout];
  if (!layout) {
    // Fallback: render as simple row
    const rowEl = document.createElement('div');
    rowEl.style.cssText = 'display:flex;gap:4px;width:800px;background:#000';
    row.panels.forEach(p => {
      const w = Math.round(STANDARD_WIDTH * (p.width / 100)) - 2;
      const el = mkPanelEl(p, w, p.height);
      el.style.flex = 'none'; el.style.width = w + 'px';
      rowEl.appendChild(el);
    });
    container.appendChild(rowEl);
    return;
  }

  const groupEl = document.createElement('div');
  groupEl.className = 'panel-group';
  groupEl.style.display = 'grid';
  groupEl.style.gridTemplateColumns = layout.cols;
  groupEl.style.gridTemplateRows = layout.rows;
  groupEl.style.gap = '4px';
  groupEl.style.width = '800px';

  // Calculate min height from first panel
  const minH = Math.max(...row.panels.map(p => p.height || DEFAULT_HEIGHT));
  groupEl.style.minHeight = minH + 'px';

  // Get positions (auto-generate if needed)
  let positions = layout.positions;
  if (!positions) {
    positions = [];
    const colCount = layout.cols.split(' ').length;
    for (let i = 0; i < row.panels.length; i++) {
      positions.push({ col: String((i % colCount) + 1), row: String(Math.floor(i / colCount) + 1) });
    }
  }

  row.panels.forEach((p, idx) => {
    const el = mkPanelEl(p, 0, p.height);
    el.style.width = 'auto';
    el.style.height = p.height + 'px';
    if (positions[idx]) {
      el.style.gridColumn = positions[idx].col;
      el.style.gridRow = positions[idx].row;
    }
    groupEl.appendChild(el);
  });

  container.appendChild(groupEl);
}

function mkPanelEl(p, width, height) {
  const el = document.createElement('div');
  el.className = 'pp' + (p.id === selPID ? ' psel' : '');
  el.style.height = (height || DEFAULT_HEIGHT) + 'px';
  if (width > 0) el.style.width = width + 'px';
  el.onclick = e => {
    if (e.target.closest('.bubble') || e.target.closest('.overlay-del')) return;
    selPanel(p.id);
  };

  Layers.initializeLayers(p);

  const imgWrap = document.createElement('div');
  imgWrap.className = 'pimgw';
  const img = document.createElement('img');
  img.src = p.src;
  const oxPct = ((p.ox || 0) / STANDARD_WIDTH) * 100;
  const oyPct = ((p.oy || 0) / (p.height || DEFAULT_HEIGHT)) * 100;
  img.style.objectPosition = `${50 + oxPct}% ${50 + oyPct}%`;
  const scale = (p.scale || 100) / 100;
  if (scale !== 1) { img.style.transform = `scale(${scale})`; img.style.transformOrigin = 'center'; }
  imgWrap.appendChild(img);
  el.appendChild(imgWrap);

  // Overlays
  Layers.renderOverlays(el, p, (pid, ovId) => {
    Layers.removeOverlay(p, ovId);
    HistoryLog.add('ASSET_REMOVE', `Overlay removed`);
    renderAll();
  });

  // Bubbles (sorted by zIndex from layers)
  const actualWidth = width > 0 ? width : STANDARD_WIDTH;
  const sortedBubbles = p.layers
    .filter(l => l.kind === 'bubble' && l.bubbleData)
    .map(l => l.bubbleData);

  (sortedBubbles.length ? sortedBubbles : p.bubbles).forEach(b => {
    const bel = mkBubbleEl(b, p, actualWidth, height || DEFAULT_HEIGHT);
    el.appendChild(bel);
  });

  const hov = document.createElement('div');
  hov.className = 'pov';
  el.appendChild(hov);

  return el;
}

function mkBubbleEl(b, p, panelW, panelH) {
  const x = (b.xPct / 100) * panelW;
  const y = (b.yPct / 100) * panelH;
  const w = (b.wPct / 100) * panelW;
  const h = (b.hPct / 100) * panelH;

  b._px = x; b._py = y; b._pw = w; b._ph = h;

  const el = document.createElement('div');
  el.className = 'bubble' + (selBID === b.id ? ' bsel' : '');
  el.id = 'bubble-' + b.id;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.width = w + 'px'; el.style.height = h + 'px';

  const inner = document.createElement('div');
  inner.className = 'binner';
  const svg = BubbleShapes.createSVG(b);
  inner.appendChild(svg);

  const text = document.createElement('div');
  text.className = 'btext' + (b.type === 'sfx' ? ' sfxt' : '');
  text.textContent = b.text || '';
  text.style.fontSize = (b.fontSize || 13) + 'px';
  text.style.color = b.textColor || '#000';
  inner.appendChild(text);
  el.appendChild(inner);

  const rsz = document.createElement('div');
  rsz.className = 'brsz';
  rsz.onmousedown = e => { e.stopPropagation(); startResize(e, b, p); };
  el.appendChild(rsz);

  const del = document.createElement('div');
  del.className = 'bdelbtn';
  del.textContent = '✕';
  del.onclick = e => { e.stopPropagation(); delBubble(p.id, b.id); };
  el.appendChild(del);

  el.onmousedown = e => {
    if (e.target === rsz || e.target === del) return;
    selBubble(p.id, b.id);
    startDrag(e, b, p);
  };

  return el;
}

// ── DRAG & RESIZE ──
function startDrag(e, b, p) {
  e.preventDefault();
  e.stopPropagation();

  // Find the actual panel element
  const panelEl = document.querySelector('.pp.psel') || document.querySelector(`[style*="height: ${p.height}px"]`);
  if (!panelEl) return;

  const panelRect = panelEl.getBoundingClientRect();
  const startX = e.clientX, startY = e.clientY;
  const startPx = b._px, startPy = b._py;

  function onMove(e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    b._px = Math.max(0, Math.min(startPx + dx, panelRect.width - b._pw));
    b._py = Math.max(0, Math.min(startPy + dy, panelRect.height - b._ph));
    b.xPct = (b._px / panelRect.width) * 100;
    b.yPct = (b._py / panelRect.height) * 100;
    const el = document.getElementById('bubble-' + b.id);
    if (el) { el.style.left = b._px + 'px'; el.style.top = b._py + 'px'; }
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    saveState(); // Save after drag
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startResize(e, b, p) {
  e.preventDefault();
  e.stopPropagation();

  const panelEl = document.querySelector('.pp.psel');
  if (!panelEl) return;

  const panelRect = panelEl.getBoundingClientRect();
  const startX = e.clientX, startY = e.clientY;
  const startW = b._pw, startH = b._ph;

  function onMove(e) {
    const dx = e.clientX - startX, dy = e.clientY - startY;
    b._pw = Math.max(60, Math.min(startW + dx, panelRect.width - b._px));
    b._ph = Math.max(32, Math.min(startH + dy, panelRect.height - b._py));
    b.wPct = (b._pw / panelRect.width) * 100;
    b.hPct = (b._ph / panelRect.height) * 100;
    const el = document.getElementById('bubble-' + b.id);
    if (el) { el.style.width = b._pw + 'px'; el.style.height = b._ph + 'px'; }
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    saveState(); // Save after resize
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ── PROPERTY UPDATES (keep inspector open, only update changed elements) ──
function upH() {
  const p = Panels.getPanel(selPID); if (!p) return;
  p.height = parseInt(document.getElementById('ph').value);
  const v = document.getElementById('ph-val'); if (v) v.textContent = p.height + 'px';
  renderPage();
}

function upOY() {
  const p = Panels.getPanel(selPID); if (!p) return;
  p.oy = parseInt(document.getElementById('oy').value);
  const v = document.getElementById('oy-val'); if (v) v.textContent = p.oy;
  renderPage();
}

function upOX() {
  const p = Panels.getPanel(selPID); if (!p) return;
  p.ox = parseInt(document.getElementById('ox').value);
  const v = document.getElementById('ox-val'); if (v) v.textContent = p.ox;
  renderPage();
}

function upSC() {
  const p = Panels.getPanel(selPID); if (!p) return;
  p.scale = parseInt(document.getElementById('sc').value);
  const v = document.getElementById('sc-val'); if (v) v.textContent = p.scale + '%';
  renderPage();
}

function upBT() {
  const b = getSelBubble(); if (!b) return;
  b.text = document.getElementById('bt').value;
  const el = document.getElementById('bubble-' + b.id);
  if (el) el.querySelector('.btext').textContent = b.text;
  renderSidebar(); // Only update sidebar label
}

function upBFS() {
  const b = getSelBubble(); if (!b) return;
  b.fontSize = parseInt(document.getElementById('bfs').value);
  const v = document.getElementById('fsv'); if (v) v.textContent = b.fontSize + 'px';
  const el = document.getElementById('bubble-' + b.id);
  if (el) el.querySelector('.btext').style.fontSize = b.fontSize + 'px';
}

function upBTail() {
  const b = getSelBubble(); if (!b) return;
  b.tail = document.getElementById('btail').value;
  b.tailDir = b.tail;
  renderPage();
}

function upBShape() {
  const b = getSelBubble(); if (!b) return;
  b.shape = document.getElementById('bshape').value;
  renderPage();
}

function upBBorderStyle() {
  const b = getSelBubble(); if (!b) return;
  b.borderStyle = document.getElementById('bborderstyle').value;
  renderPage();
}

function upBColors() {
  const b = getSelBubble(); if (!b) return;
  b.fillColor = document.getElementById('bfill').value;
  b.textColor = document.getElementById('btcol').value;
  b.strokeColor = document.getElementById('bstroke').value;
  renderPage();
}

// ── PANEL CONTROLS ──
function togglePanelLock(pid, e) {
  if (e) e.stopPropagation();
  const result = Panels.toggleLock(pid);
  if (result === 'warning') alert('Warning: All panels locked and total ≠ 100%');
  renderInspector();
  renderPage();
}

// ── BUBBLES ──
function addBubble(type) {
  const p = Panels.getPanel(selPID);
  if (!p) return;
  const b = {
    id: ++BC, type: type,
    text: type === 'sfx' ? 'POW!' : (type === 'thought' ? '...' : 'Text'),
    xPct: 10, yPct: 10, wPct: 30, hPct: 20,
    fontSize: type === 'sfx' ? 24 : 13,
    tail: type === 'sfx' ? 'none' : 'bottom-left',
    tailDir: type === 'sfx' ? 'none' : 'bottom-left',
    fillColor: type === 'sfx' ? '#ffee00' : '#ffffff',
    textColor: '#000000',
    strokeColor: type === 'thought' ? '#444444' : '#000000',
    shape: type === 'thought' ? 'cloud' : 'oval',
    borderStyle: type === 'thought' ? 'dashed' : 'solid'
  };
  p.bubbles.push(b);
  Layers.initializeLayers(p);
  const maxZ = Math.max(...p.layers.map(l => l.zIndex), 0);
  p.layers.push({id: b.id, kind: 'bubble', bubbleData: b, zIndex: maxZ + 1});
  HistoryLog.add('BUBBLE_ADD', `Panel ${Panels.getPanelIndex(p.id)}: "${b.text}"`);
  renderAll();
  selBubble(p.id, b.id);
}

// ── PANELS ──
function delPanel(id, e) {
  if (e) e.stopPropagation();
  Panels.deletePanel(id);
  if (selPID === id) { selPID = null; selBID = null; selLayerID = null; selectionType = null; }
  HistoryLog.add('PANEL_DELETE', 'Panel deleted');
  renderAll(); renderInspector();
}

function moveRow(rowIdx, delta, e) {
  if (e) e.stopPropagation();
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
  if (e) e.stopPropagation();
  Panels.ungroupRow(rowIdx);
  if (selGroupIdx === rowIdx) { selGroupIdx = null; selectionType = null; }
  HistoryLog.add('GROUP_SPLIT', 'Group ungrouped');
  renderAll(); renderInspector();
}

// ── GROUP CREATION ──
function createGroup() {
  const rows = Panels.getRows();
  const availablePanels = [];
  rows.forEach((row, rowIdx) => {
    if (row.type === 'single') {
      availablePanels.push({id: row.panels[0].id, rowIdx: rowIdx, panel: row.panels[0]});
    }
  });
  if (availablePanels.length < 2) { alert('Need at least 2 single panels'); return; }
  Modals.openCreateGroup(availablePanels, (panelIds, layoutKey) => {
    Panels.createGroupFromPanels(panelIds, layoutKey);
    HistoryLog.add('GROUP_CREATE', `Group: ${panelIds.length} panels, layout: ${layoutKey}`);
    renderAll(); renderInspector();
  });
}

function changeGroupLayoutUI(rowIdx) {
  const rows = Panels.getRows();
  const row = rows[rowIdx !== undefined ? rowIdx : selGroupIdx];
  if (!row || row.type === 'single') { alert('Select a group to change layout'); return; }
  Modals.openGroupLayout(row.panels.length, layoutKey => {
    changeGroupLayout(rowIdx !== undefined ? rowIdx : selGroupIdx, layoutKey);
  });
}

// ── JSON IMPORT ──
function openJsonImport() {
  Modals.openJsonImport(data => {
    const result = importBubblesFromJson(data);
    if (result.imported > 0) { HistoryLog.add('JSON_IMPORT', `${result.imported} bubbles imported`); renderAll(); }
    return result;
  });
}

function importBubblesFromJson(data) {
  const skipped = []; let imported = 0;
  data.panels.forEach(panelData => {
    const panel = Panels.getPanelByIndex(panelData.id);
    if (!panel) { skipped.push(panelData.id); return; }
    panelData.bubbles.forEach(bData => {
      const bubble = {
        id: ++BC, type: 'speech', text: bData.text,
        xPct: bData.x, yPct: bData.y, wPct: bData.w, hPct: bData.h,
        fontSize: bData.fontSize || 13,
        tail: bData.tailDir || 'bottom-left', tailDir: bData.tailDir || 'bottom-left',
        fillColor: bData.fillColor || '#ffffff',
        textColor: bData.textColor || '#000000',
        strokeColor: bData.strokeColor || '#000000',
        shape: bData.shape || 'oval', borderStyle: bData.borderStyle || 'solid'
      };
      panel.bubbles.push(bubble);
      Layers.initializeLayers(panel);
      const maxZ = Math.max(...panel.layers.map(l => l.zIndex), 0);
      panel.layers.push({id: bubble.id, kind: 'bubble', bubbleData: bubble, zIndex: maxZ + 1});
      imported++;
    });
  });
  return {imported, skipped};
}

// ── ASSET DROP TARGETS ──
function setupAssetDropTargets() {
  document.addEventListener('dragover', e => {
    if (!e.dataTransfer.types.includes('text/asset-file')) return;
    const panel = e.target.closest('.pp');
    if (panel) { e.preventDefault(); panel.classList.add('panel-drop-target'); }
  });

  document.addEventListener('dragleave', e => {
    const panel = e.target.closest('.pp');
    if (panel && !panel.contains(e.relatedTarget)) panel.classList.remove('panel-drop-target');
  });

  document.addEventListener('drop', e => {
    // Clear all drop targets
    document.querySelectorAll('.panel-drop-target').forEach(el => el.classList.remove('panel-drop-target'));
    const panelEl = e.target.closest('.pp');
    if (!panelEl) return;
    const assetFile = e.dataTransfer.getData('text/asset-file');
    if (!assetFile) return;
    e.preventDefault();

    // Find the panel object from selPID or by position
    let panelObj = Panels.getPanel(selPID);
    if (!panelObj) {
      // Try to find from all panels
      const allPanels = Panels.getRows().flatMap(r => r.panels);
      panelObj = allPanels[0];
    }

    // Better: find panel whose element was dropped on
    const allPanels = Panels.getRows().flatMap(r => r.panels);
    // Walk up to find which panel element was dropped on
    for (const p of allPanels) {
      const pEl = document.getElementById('bubble-holder-' + p.id) || panelEl;
      if (pEl === panelEl || panelEl.contains(pEl)) {
        panelObj = p; break;
      }
    }

    if (panelObj) {
      // Use panel that's currently selected if the drop was on selected panel
      if (selPID && panelEl.classList.contains('psel')) {
        panelObj = Panels.getPanel(selPID) || panelObj;
      }

      Assets.addOverlayToPanel(panelObj, assetFile);
      Layers.initializeLayers(panelObj);
      // Add to layers too
      const existingLayer = panelObj.layers.find(l => l.kind === 'overlay' && l.file === assetFile);
      if (!existingLayer && panelObj.overlays.length > 0) {
        const lastOverlay = panelObj.overlays[panelObj.overlays.length - 1];
        const maxZ = Math.max(...panelObj.layers.map(l => l.zIndex), 0);
        panelObj.layers.push({
          id: lastOverlay.id,
          kind: 'overlay',
          file: assetFile,
          opacity: 0.5,
          blendMode: 'normal',
          zIndex: maxZ + 1
        });
      }
      HistoryLog.add('ASSET_ADD', `Asset added to Panel ${Panels.getPanelIndex(panelObj.id)}`);
      renderAll();
      selOverlay(panelObj.id, panelObj.overlays[panelObj.overlays.length - 1].id);
    }
  });
}

// ── AUTO-SAVE ──
function manualSave() {
  saveState();
  autoSaveNextIn = 60;
  HistoryLog.add('MANUAL_SAVE', 'Manual save');
}

function autoSave() {
  saveState();
  autoSaveNextIn = 60;
  HistoryLog.add('AUTO_SAVE', 'Auto-saved');
}

function saveState() {
  try {
    const rows = Panels.getRows();
    const state = {
      version: SCHEMA_VERSION,
      rows: rows.map(r => {
        const rObj = {
          id: r.id, type: r.type,
          panels: r.panels.map(p => ({
            id: p.id, src: p.src, height: p.height, aspectRatio: p.aspectRatio,
            ox: p.ox, oy: p.oy, scale: p.scale,
            width: p.width || 100, locked: p.locked || false,
            layers: (p.layers || []).map(l => {
              const lo = {id: l.id, kind: l.kind, zIndex: l.zIndex};
              if (l.kind === 'overlay') { lo.file = l.file; lo.opacity = l.opacity; lo.blendMode = l.blendMode; }
              if (l.kind === 'bubble') lo.bubbleData = l.bubbleData;
              return lo;
            }),
            bubbles: p.bubbles.map(b => ({
              id: b.id, type: b.type, text: b.text,
              xPct: b.xPct, yPct: b.yPct, wPct: b.wPct, hPct: b.hPct,
              fontSize: b.fontSize, tail: b.tail, tailDir: b.tailDir,
              fillColor: b.fillColor, textColor: b.textColor, strokeColor: b.strokeColor,
              shape: b.shape || 'oval', borderStyle: b.borderStyle || 'solid'
            })),
            overlays: (p.overlays || []).map(o => ({
              id: o.id, file: o.file, opacity: o.opacity, blendMode: o.blendMode || 'normal'
            }))
          }))
        };
        if (r.type === 'group') rObj.layout = r.layout;
        return rObj;
      }),
      selPID, selBID, PC: Panels.getPC(), RC: Panels.getRC(), BC
    };
    localStorage.setItem('mangaEditorState', JSON.stringify(state));
    autoSaveTs = Date.now();
    updateAutoSaveDisplay();
  } catch(e) {
    const el = document.getElementById('autosave-status');
    if (el) el.textContent = '⚠ Save failed';
  }
}

function updateAutoSaveDisplay() {
  const el = document.getElementById('autosave-status');
  if (!el) return;
  if (autoSaveNextIn > 0) {
    el.textContent = `Next auto-save: ${autoSaveNextIn}s`;
    el.className = autoSaveNextIn <= 10 ? 'soon' : '';
  }
}

function restoreState() {
  try {
    const raw = localStorage.getItem('mangaEditorState');
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state.version !== SCHEMA_VERSION) { localStorage.removeItem('mangaEditorState'); return; }
    BC = state.BC || 0;
    Panels.setPC(state.PC || 0);
    Panels.setRC(state.RC || 0);
    Panels.setRows(state.rows || []);
    selPID = state.selPID || null;
    selBID = state.selBID || null;
    if (selBID) selectionType = 'bubble';
    else if (selPID) selectionType = 'panel';

    // Ensure defaults
    Panels.getRows().forEach(r => {
      r.panels.forEach(p => {
        if (!p.overlays) p.overlays = [];
        if (p.width === undefined) p.width = 100;
        if (p.locked === undefined) p.locked = false;
        if (!p.layers) p.layers = [];
        if (!p.aspectRatio && p.height) p.aspectRatio = p.height / STANDARD_WIDTH;
        p.bubbles.forEach(b => {
          if (!b.shape) b.shape = 'oval';
          if (!b.borderStyle) b.borderStyle = 'solid';
          if (!b.tail && b.tailDir) b.tail = b.tailDir;
          if (!b.tailDir && b.tail) b.tailDir = b.tail;
          if (!b.tail) b.tail = 'bottom-left';
        });
        // Re-link layer bubbleData references
        if (p.layers) {
          p.layers.forEach(l => {
            if (l.kind === 'bubble') {
              const bubble = p.bubbles.find(b => b.id === l.id);
              if (bubble) l.bubbleData = bubble;
            }
          });
        }
      });
    });
    HistoryLog.add('SESSION_RESTORE', 'Session restored');
  } catch(e) { /* start fresh */ }
}

function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(autoSave, 60000);

  if (autoSaveTick) clearInterval(autoSaveTick);
  autoSaveNextIn = 60;
  autoSaveTick = setInterval(() => {
    autoSaveNextIn = Math.max(0, autoSaveNextIn - 1);
    updateAutoSaveDisplay();
  }, 1000);
}

// ── CLEAR ALL ──
function clearAll() {
  Modals.confirm('Clear all panels and reset the editor?', () => {
    Panels.setRows([]);
    selPID = null; selBID = null; selLayerID = null; selGroupIdx = null; selectionType = null;
    Panels.setPC(0); Panels.setRC(0); BC = 0;
    localStorage.removeItem('mangaEditorState');
    autoSaveNextIn = 60;
    const el = document.getElementById('autosave-status');
    if (el) el.textContent = 'Cleared';
    renderAll();
    renderInspector();
    HistoryLog.add('PAGE_CLEAR', 'All cleared');
  });
}

// ── EXPORT ──
async function exportPage() {
  const GAP = 4;
  const PAGE_W = 800;
  const rows = Panels.getRows();
  if (!rows.length) { alert('No panels to export'); return; }

  // Calculate total height
  let totalH = 0;
  rows.forEach((row, idx) => {
    const maxH = Math.max(...row.panels.map(p => p.height || DEFAULT_HEIGHT));
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
    const maxH = Math.max(...row.panels.map(p => p.height || DEFAULT_HEIGHT));

    // Get layout for group positioning
    const layout = row.type === 'group' ? Panels.GROUP_LAYOUTS[row.layout] : null;
    let positions = null;
    if (layout) {
      positions = layout.positions;
      if (!positions) {
        positions = [];
        const colCount = layout.cols.split(' ').length;
        for (let i = 0; i < row.panels.length; i++) {
          positions.push({ col: String((i % colCount) + 1), row: String(Math.floor(i / colCount) + 1) });
        }
      }
    }

    // For group panels, calculate pixel positions from CSS grid
    if (row.type === 'group' && layout) {
      const panelPositions = calculateGridPositions(layout, row.panels, PAGE_W, maxH);

      for (let i = 0; i < row.panels.length; i++) {
        const p = row.panels[i];
        const pos = panelPositions[i];
        if (!pos) continue;
        await drawPanelToCanvas(ctx, p, pos.x, offsetY + pos.y, pos.w, pos.h);
      }
    } else {
      // Single or fallback
      let offsetX = 0;
      for (let p of row.panels) {
        const pw = row.type === 'single' ? PAGE_W : Math.round(PAGE_W * (p.width / 100));
        await drawPanelToCanvas(ctx, p, offsetX, offsetY, pw, p.height || DEFAULT_HEIGHT);
        offsetX += pw + (row.type === 'single' ? 0 : GAP);
      }
    }

    offsetY += maxH + GAP;
  }

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

function calculateGridPositions(layout, panels, totalW, totalH) {
  const GAP = 4;
  const cols = layout.cols.split(' ');
  const rowsDef = layout.rows.split(' ');
  const colCount = cols.length;
  const rowCount = rowsDef.length;

  // Calculate column widths (1fr = equal fraction)
  const totalFrCols = cols.reduce((sum, c) => sum + parseInt(c), 0);
  const colWidths = cols.map(c => (parseInt(c) / totalFrCols) * (totalW - GAP * (colCount - 1)));

  const totalFrRows = rowsDef.reduce((sum, r) => sum + parseInt(r), 0);
  const rowHeights = rowsDef.map(r => (parseInt(r) / totalFrRows) * (totalH - GAP * (rowCount - 1)));

  // Calculate cumulative positions
  const colStarts = [];
  let cx = 0;
  colWidths.forEach((w, i) => { colStarts.push(cx); cx += w + GAP; });

  const rowStarts = [];
  let ry = 0;
  rowHeights.forEach((h, i) => { rowStarts.push(ry); ry += h + GAP; });

  // Get positions array
  let positions = layout.positions;
  if (!positions) {
    positions = [];
    for (let i = 0; i < panels.length; i++) {
      positions.push({ col: String((i % colCount) + 1), row: String(Math.floor(i / colCount) + 1) });
    }
  }

  return panels.map((p, i) => {
    const pos = positions[i];
    if (!pos) return null;

    // Parse col/row (may be "1 / 3" for span)
    const parseSpan = str => {
      const parts = str.split('/').map(s => parseInt(s.trim()));
      const start = parts[0] - 1;
      const end = parts.length > 1 ? parts[1] - 1 : parts[0];
      return {start, end};
    };

    const colSpan = parseSpan(pos.col);
    const rowSpan = parseSpan(pos.row);

    const x = colStarts[colSpan.start] || 0;
    const y = rowStarts[rowSpan.start] || 0;
    const w = colStarts[colSpan.end - 1] + colWidths[colSpan.end - 1] - x || colWidths[colSpan.start];
    const h = rowStarts[rowSpan.end - 1] + rowHeights[rowSpan.end - 1] - y || rowHeights[rowSpan.start];

    return {x, y, w: Math.round(w), h: Math.round(h)};
  });
}

async function drawPanelToCanvas(ctx, p, x, y, pw, ph) {
  // Clip to panel bounds
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, pw, ph);
  ctx.clip();

  // Draw background
  ctx.fillStyle = '#111';
  ctx.fillRect(x, y, pw, ph);

  // Draw image
  const img = new Image();
  img.src = p.src;
  await new Promise(resolve => {
    if (img.complete) { drawImg(); resolve(); return; }
    img.onload = () => { drawImg(); resolve(); };
    img.onerror = resolve;
  });

  function drawImg() {
    const scale = (p.scale || 100) / 100;
    const imgW = img.naturalWidth * scale;
    const imgH = img.naturalHeight * scale;

    // Calculate position maintaining aspect ratio (object-fit: contain)
    const panelAR = pw / ph;
    const imgAR = img.naturalWidth / img.naturalHeight;

    let drawW, drawH, drawX, drawY;
    if (imgAR > panelAR) {
      drawW = pw * scale;
      drawH = (pw / img.naturalWidth * img.naturalHeight) * scale;
    } else {
      drawH = ph * scale;
      drawW = (ph / img.naturalHeight * img.naturalWidth) * scale;
    }

    drawX = x + (pw - drawW) / 2 + (p.ox || 0);
    drawY = y + (ph - drawH) / 2 + (p.oy || 0);

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  // Draw overlays
  for (let layer of (p.layers || []).filter(l => l.kind === 'overlay')) {
    const ovImg = new Image();
    ovImg.src = layer.file;
    await new Promise(resolve => {
      if (ovImg.complete) { doOv(); resolve(); return; }
      ovImg.onload = () => { doOv(); resolve(); };
      ovImg.onerror = resolve;
    });
    function doOv() {
      ctx.save();
      ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 0.5;
      if (layer.blendMode && layer.blendMode !== 'normal') ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(ovImg, x, y, pw, ph);
      ctx.restore();
    }
  }

  ctx.restore();

  // Draw bubbles (outside clip for tails that extend)
  p.bubbles.forEach(b => {
    const bx = x + (b.xPct / 100) * pw;
    const by = y + (b.yPct / 100) * ph;
    const bw = (b.wPct / 100) * pw;
    const bh = (b.hPct / 100) * ph;
    const tempB = Object.assign({}, b, {_px: bx - x, _py: by - y, _pw: bw, _ph: bh});
    BubbleShapes.drawOnCanvas(ctx, tempB, x, y);
  });
}