// ── MANGA EDITOR V4 — Main App ──
// Uses modular architecture: panels.js, modals.js, assets.js, bubbles.js, history.js

// ── GLOBAL STATE ──
var selPID = null;  // Selected panel ID
var selBID = null;  // Selected bubble ID
var BC = 0;         // Bubble counter
var autoSaveTimer = null;
var autoSaveTs = null;
var autoSaveTick = null;

// ── INITIALIZATION ──
window.addEventListener('DOMContentLoaded', function() {
  // Initialize modules
  Modals.init();
  Assets.init();
  HistoryLog.init(document.body);
  
  // Restore saved state
  const restored = restoreState();
  if (restored) {
    HistoryLog.add('SESSION_RESTORE', 'Previous session restored');
  }
  
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
      const p = Panels.addPanel(ev.target.result);
      HistoryLog.add('PANEL_ADD', 'Panel ' + Panels.getPanelIndex(p.id) + ' added');
      renderAll();
      selPanel(p.id);
    };
    r.readAsDataURL(f);
  });
  e.target.value = '';
}

// ── SELECTION ──
function selPanel(id) {
  selPID = id;
  selBID = null;
  renderAll();
  showPC();
}

function selBubble(id) {
  selBID = id;
  showBE();
  renderBList(Panels.getPanel(selPID));
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

// ── SIDEBAR RENDERING ──
function renderSidebar() {
  const list = document.getElementById('panels-list');
  list.innerHTML = '';
  
  const rows = Panels.getRows();
  let panelIndex = 1;
  
  rows.forEach((row, rowIdx) => {
    if (row.type === 'single') {
      // Single panel - flat item
      const p = row.panels[0];
      list.appendChild(createPanelItem(p, panelIndex, row, rowIdx, null));
      panelIndex++;
    } else {
      // Group/Row - collapsible accordion
      const groupEl = createGroupItem(row, rowIdx, panelIndex);
      list.appendChild(groupEl);
      panelIndex += row.panels.length;
    }
  });
}

function createPanelItem(p, panelIndex, row, rowIdx, groupContext) {
  const d = document.createElement('div');
  d.className = 'pi' + (p.id === selPID ? ' sel' : '');
  
  if (!groupContext) {
    d.setAttribute('draggable', 'true');
    d.dataset.rowIdx = rowIdx;
  }
  
  const widthDisplay = row.type !== 'single' ? ` W:${Math.round(p.width)}%` : '';
  const lockIcon = row.type !== 'single' ? (p.locked ? '🔒' : '🔓') : '';
  
  d.innerHTML = `
    <img src="${p.src}">
    <span class="lbl">Panel ${panelIndex}${widthDisplay}</span>
    ${row.type !== 'single' ? `<button class="mb" onclick="togglePanelLock(${p.id},event)" title="${p.locked ? 'Unlock' : 'Lock'}">${lockIcon}</button>` : ''}
    <div class="mbs">
      ${!groupContext ? `<button class="mb" onclick="moveRow(${rowIdx},-1,event)">↑</button>` : ''}
      ${!groupContext ? `<button class="mb" onclick="moveRow(${rowIdx},1,event)">↓</button>` : ''}
      ${groupContext ? `<button class="mb" onclick="editPanelInGroup(${p.id},event)">✎</button>` : ''}
    </div>
    <button class="db" onclick="delPanel(${p.id},event)">✕</button>
  `;
  
  d.onclick = () => selPanel(p.id);
  
  if (!groupContext) {
    setupRowDragDrop(d, rowIdx);
  }
  
  return d;
}

function createGroupItem(row, rowIdx, startPanelIndex) {
  const groupContainer = document.createElement('div');
  groupContainer.className = 'group-item';
  groupContainer.style.cssText = 'background:#222;border:1px solid #444;border-radius:6px;margin-bottom:6px;overflow:hidden';
  
  // Group header
  const header = document.createElement('div');
  header.className = 'group-header';
  header.style.cssText = 'background:#2a2a2a;padding:8px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:11px;border-bottom:1px solid #333';
  header.setAttribute('draggable', 'true');
  header.dataset.rowIdx = rowIdx;
  
  const layoutLabel = row.layout ? Panels.GROUP_LAYOUTS[row.layout]?.label || 'Custom' : 'Row';
  const panelCount = row.panels.length;
  
  header.innerHTML = `
    <span style="flex:1;color:#ff0;font-weight:bold">▼ Group: ${panelCount}-panel ${layoutLabel}</span>
    <button class="mb" onclick="ungroupRow(${rowIdx},event)">🔓 Ungroup</button>
    <button class="mb" onclick="moveRow(${rowIdx},-1,event)">↑</button>
    <button class="mb" onclick="moveRow(${rowIdx},1,event)">↓</button>
  `;
  
  // Toggle collapse
  let collapsed = false;
  const arrow = header.querySelector('span');
  header.onclick = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    collapsed = !collapsed;
    panelsContainer.style.display = collapsed ? 'none' : 'flex';
    arrow.textContent = (collapsed ? '▶' : '▼') + arrow.textContent.substring(1);
  };
  
  setupRowDragDrop(header, rowIdx);
  
  groupContainer.appendChild(header);
  
  // Panels in group
  const panelsContainer = document.createElement('div');
  panelsContainer.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:6px';
  
  row.panels.forEach((p, idx) => {
    const panelItem = createPanelItem(p, startPanelIndex + idx, row, rowIdx, {isGroup: true});
    panelItem.style.marginLeft = '12px';
    panelsContainer.appendChild(panelItem);
  });
  
  groupContainer.appendChild(panelsContainer);
  
  return groupContainer;
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
  
  // Image
  const imgWrap = document.createElement('div');
  imgWrap.className = 'pimgw';
  const img = document.createElement('img');
  img.src = p.src;
  img.style.transform = `translate(${p.ox}px,${p.oy}px) scale(${p.scale / 100})`;
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
function showPC() {
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
  showPC();
}

function upBShape() {
  const b = getSelBubble();
  if (!b) return;
  b.shape = document.getElementById('bshape').value;
  renderAll();
  showPC();
}

function upBBorderStyle() {
  const b = getSelBubble();
  if (!b) return;
  b.borderStyle = document.getElementById('bborderstyle').value;
  renderAll();
  showPC();
}

function upBColors() {
  const b = getSelBubble();
  if (!b) return;
  b.fillColor = document.getElementById('bfill').value;
  b.textColor = document.getElementById('btcol').value;
  b.strokeColor = document.getElementById('bstroke').value;
  renderAll();
  showPC();
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
  HistoryLog.add('BUBBLE_ADD', `Panel ${Panels.getPanelIndex(p.id)}: "${b.text}"`);
  renderAll();
  selBubble(b.id);
}

function delBubble(bid, pid) {
  const p = Panels.getPanel(pid);
  if (!p) return;
  
  const idx = p.bubbles.findIndex(b => b.id === bid);
  if (idx >= 0) {
    const text = p.bubbles[idx].text;
    p.bubbles.splice(idx, 1);
    HistoryLog.add('BUBBLE_DELETE', `Panel ${Panels.getPanelIndex(pid)}: "${text}"`);
  }
  
  if (selBID === bid) selBID = null;
  renderAll();
  showPC();
}

function delSelBubble() {
  if (selBID && selPID) delBubble(selBID, selPID);
}

// ── PANELS ──
function delPanel(id, e) {
  e.stopPropagation();
  const success = Panels.deletePanel(id);
  if (success) {
    if (selPID === id) {
      selPID = null;
      selBID = null;
    }
    HistoryLog.add('PANEL_DELETE', 'Panel deleted');
    renderAll();
  }
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
  // For now, use simple merge - full modal implementation coming next
  mergeRow();
}

function mergeRow() {
  const {row, rowIdx} = Panels.findRow(selPID);
  if (!row || rowIdx >= Panels.getRows().length - 1) return;
  
  const rows = Panels.getRows();
  const nextRow = rows[rowIdx + 1];
  
  // Merge into row
  const combined = [...row.panels, ...nextRow.panels];
  if (combined.length > 4) {
    alert('Cannot merge: maximum 4 panels per row');
    return;
  }
  
  // Set equal widths
  combined.forEach(p => {
    p.width = 100 / combined.length;
    p.locked = false;
  });
  
  row.panels = combined;
  row.type = 'row';
  rows.splice(rowIdx + 1, 1);
  Panels.setRows(rows);
  
  HistoryLog.add('GROUP_CREATE', `${combined.length} panels merged into row`);
  renderAll();
}

function splitRow() {
  const {row, rowIdx} = Panels.findRow(selPID);
  if (!row || row.type === 'single') return;
  
  Panels.ungroupRow(rowIdx);
}

function swapRow() {
  const {row} = Panels.findRow(selPID);
  if (!row || row.panels.length < 2) return;
  
  const temp = row.panels[0];
  row.panels[0] = row.panels[1];
  row.panels[1] = temp;
  
  renderAll();
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
  autoSave();
  HistoryLog.add('MANUAL_SAVE', 'Manual save triggered');
}

function autoSave() {
  try {
    const rows = Panels.getRows();
    const state = {
      rows: rows.map(r => {
        const rObj = {
          id: r.id,
          type: r.type,
          panels: r.panels.map(p => ({
            id: p.id,
            src: p.src,
            height: p.height,
            ox: p.ox,
            oy: p.oy,
            scale: p.scale,
            width: p.width || 100,
            locked: p.locked || false,
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
    HistoryLog.add('AUTO_SAVE', 'State saved');
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
    if (!raw) return false;
    
    const state = JSON.parse(raw);
    Panels.setRows(state.rows || []);
    selPID = state.selPID || null;
    selBID = state.selBID || null;
    Panels.setPC(state.PC || 0);
    Panels.setRC(state.RC || 0);
    BC = state.BC || 0;
    
    // Ensure defaults on all panels
    Panels.getRows().forEach(r => {
      r.panels.forEach(p => {
        if (!p.overlays) p.overlays = [];
        if (p.width === undefined) p.width = 100;
        if (p.locked === undefined) p.locked = false;
        p.bubbles.forEach(b => {
          if (!b.shape) b.shape = 'oval';
          if (!b.borderStyle) b.borderStyle = 'solid';
        });
      });
    });
    
    autoSaveTs = null;
    return true;
  } catch (e) {
    return false;
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
