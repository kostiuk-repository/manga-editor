// ── MODALS MODULE ──
var Modals = (function() {
  const PREVIEW_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
  let modalContainer = null;

  function init() {
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-overlay';
      modalContainer.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;align-items:center;justify-content:center';
      document.body.appendChild(modalContainer);
    }
  }

  function show(content) {
    if (!modalContainer) init();
    modalContainer.innerHTML = '';
    modalContainer.appendChild(content);
    modalContainer.style.display = 'flex';
    // Click outside to close
    modalContainer.onclick = e => { if (e.target === modalContainer) hide(); };
  }

  function hide() {
    if (modalContainer) { modalContainer.style.display = 'none'; modalContainer.innerHTML = ''; }
  }

  function createJsonImportModal(onImport) {
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1a1a;border:2px solid #444;border-radius:10px;padding:20px;width:90%;max-width:600px;max-height:80vh;overflow-y:auto;color:#eee;font-family:"Comic Neue",cursive';
    modal.onclick = e => e.stopPropagation();
    const title = document.createElement('h2');
    title.textContent = 'Import Bubble Data';
    title.style.cssText = 'margin:0 0 15px 0;font-family:Bangers,cursive;letter-spacing:1px;color:#fff;font-size:22px';
    modal.appendChild(title);
    const instructions = document.createElement('div');
    instructions.style.cssText = 'background:#0a0a0a;border:1px solid #333;border-radius:5px;padding:12px;margin-bottom:15px;font-size:11px;color:#aaa';
    instructions.innerHTML = `<div style="color:#ff0;font-weight:bold;margin-bottom:6px">Expected JSON:</div><pre style="margin:0;color:#8f8;overflow-x:auto">{"panels":[{"id":1,"bubbles":[{"text":"Hello!","x":10,"y":10,"w":30,"h":15,"shape":"oval","tailDir":"bottom-left"}]}]}</pre>`;
    modal.appendChild(instructions);
    const textarea = document.createElement('textarea');
    textarea.style.cssText = 'width:100%;min-height:160px;background:#0a0a0a;border:1px solid #444;color:#8f8;padding:10px;border-radius:5px;font-size:11px;font-family:monospace;resize:vertical;margin-bottom:10px';
    textarea.placeholder = 'Paste your JSON here...';
    modal.appendChild(textarea);
    const validationMsg = document.createElement('div');
    validationMsg.style.cssText = 'min-height:20px;margin-bottom:10px;font-size:11px';
    modal.appendChild(validationMsg);
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
    const validateBtn = document.createElement('button');
    validateBtn.className = 'btn bb'; validateBtn.textContent = 'Validate';
    validateBtn.onclick = function() {
      const result = validateJson(textarea.value);
      if (result.valid) { validationMsg.innerHTML = '<span style="color:#0f0">✓ Valid JSON</span>'; importBtn.disabled = false; importBtn.style.opacity = '1'; }
      else { validationMsg.innerHTML = '<span style="color:#f88">✗ ' + result.error + '</span>'; importBtn.disabled = true; importBtn.style.opacity = '0.5'; }
    };
    btnRow.appendChild(validateBtn);
    const importBtn = document.createElement('button');
    importBtn.className = 'btn bg'; importBtn.textContent = 'Import'; importBtn.disabled = true; importBtn.style.opacity = '0.5';
    importBtn.onclick = function() {
      try { const data = JSON.parse(textarea.value); const result = onImport(data); hide(); if (result && result.skipped && result.skipped.length > 0) alert('Skipped panels: ' + result.skipped.join(', ')); } catch(e) { alert('Parse error: ' + e.message); }
    };
    btnRow.appendChild(importBtn);
    const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn bd'; cancelBtn.textContent = 'Cancel'; cancelBtn.onclick = hide;
    btnRow.appendChild(cancelBtn);
    modal.appendChild(btnRow);
    return modal;
  }

  function validateJson(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.panels || !Array.isArray(data.panels)) return {valid:false,error:'Missing "panels" array'};
      for (let i = 0; i < data.panels.length; i++) {
        const panel = data.panels[i];
        if (typeof panel.id !== 'number') return {valid:false,error:`Panel ${i}: missing id`};
        if (!panel.bubbles || !Array.isArray(panel.bubbles)) return {valid:false,error:`Panel ${panel.id}: missing bubbles`};
        for (let j = 0; j < panel.bubbles.length; j++) {
          const b = panel.bubbles[j];
          if (!b.text) return {valid:false,error:`Panel ${panel.id} bubble ${j}: missing text`};
          for (let f of ['x','y','w','h']) { if (typeof b[f] !== 'number') return {valid:false,error:`Panel ${panel.id} bubble ${j}: missing ${f}`}; }
        }
      }
      return {valid:true};
    } catch(e) { return {valid:false,error:'Invalid JSON: '+e.message}; }
  }

  function createGroupCreationModal(availablePanels, onConfirm) {
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1a1a;border:2px solid #444;border-radius:10px;padding:20px;width:90%;max-width:700px;max-height:80vh;overflow-y:auto;color:#eee;font-family:"Comic Neue",cursive';
    modal.onclick = e => e.stopPropagation();
    const title = document.createElement('h2');
    title.textContent = 'Create Group'; title.style.cssText = 'margin:0 0 15px 0;font-family:Bangers,cursive;color:#fff;font-size:22px';
    modal.appendChild(title);
    const selTitle = document.createElement('div'); selTitle.textContent = 'Select 2–4 panels:'; selTitle.style.cssText = 'font-size:13px;color:#ff0;margin-bottom:8px';
    modal.appendChild(selTitle);
    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:15px';
    const selectedPanels = new Set();
    availablePanels.forEach((panel, idx) => {
      const wrapper = document.createElement('label');
      wrapper.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px;background:#222;border:1px solid #333;border-radius:4px';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = panel.id;
      cb.onchange = () => {
        if (cb.checked) { selectedPanels.add(panel.id); wrapper.style.borderColor = '#0f0'; }
        else { selectedPanels.delete(panel.id); wrapper.style.borderColor = '#333'; }
        updateLayoutOptions();
      };
      const lbl = document.createElement('span'); lbl.textContent = `Panel ${idx+1}`; lbl.style.cssText = 'font-size:11px;color:#ccc';
      wrapper.appendChild(cb); wrapper.appendChild(lbl); checkboxContainer.appendChild(wrapper);
    });
    modal.appendChild(checkboxContainer);
    const layoutTitle = document.createElement('div'); layoutTitle.textContent = 'Layout:'; layoutTitle.style.cssText = 'font-size:13px;color:#ff0;margin-bottom:8px';
    modal.appendChild(layoutTitle);
    const layoutGrid = document.createElement('div'); layoutGrid.id = 'modal-layout-grid';
    layoutGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:15px';
    modal.appendChild(layoutGrid);
    let selectedLayout = null;
    function updateLayoutOptions() {
      const count = selectedPanels.size; layoutGrid.innerHTML = '';
      if (count < 2 || count > 4) { layoutGrid.innerHTML = '<div style="color:#666;font-size:11px">Select 2–4 panels</div>'; selectedLayout = null; return; }
      const layouts = Panels.getLayoutOptions(count);
      if (!selectedLayout || !layouts.find(l => l.key === selectedLayout)) selectedLayout = layouts[0] ? layouts[0].key : null;
      layouts.forEach((layout, idx) => {
        const card = document.createElement('div');
        card.style.cssText = 'background:#222;border:2px solid '+(selectedLayout===layout.key?'#0f0':'#333')+';border-radius:5px;padding:6px;cursor:pointer';
        card.onclick = () => { selectedLayout = layout.key; updateLayoutOptions(); };
        const lbl = document.createElement('div'); lbl.textContent = layout.label; lbl.style.cssText = 'font-size:9px;color:#aaa;margin-bottom:4px;text-align:center';
        const prev = document.createElement('div'); prev.style.cssText = 'width:100%;height:50px;display:grid;grid-template-columns:'+layout.cols+';grid-template-rows:'+layout.rows+';gap:1px;background:#000;border-radius:2px';
        layout.positions.forEach((pos, i) => {
          const cell = document.createElement('div'); cell.style.cssText = 'background:#555;display:flex;align-items:center;justify-content:center;font-size:9px;color:#ccc;grid-column:'+pos.col+';grid-row:'+pos.row;
          cell.textContent = i+1; prev.appendChild(cell);
        });
        card.appendChild(lbl); card.appendChild(prev); layoutGrid.appendChild(card);
      });
    }
    updateLayoutOptions();
    const btnRow = document.createElement('div'); btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
    const createBtn = document.createElement('button'); createBtn.className = 'btn bg'; createBtn.textContent = 'Create Group';
    createBtn.onclick = () => {
      if (selectedPanels.size < 2 || selectedPanels.size > 4) { alert('Select 2–4 panels'); return; }
      if (!selectedLayout) { alert('Select a layout'); return; }
      onConfirm(Array.from(selectedPanels), selectedLayout); hide();
    };
    btnRow.appendChild(createBtn);
    const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn bd'; cancelBtn.textContent = 'Cancel'; cancelBtn.onclick = hide;
    btnRow.appendChild(cancelBtn);
    modal.appendChild(btnRow);
    return modal;
  }

  function createGroupLayoutModal(panelCount, onSelect) {
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1a1a;border:2px solid #444;border-radius:10px;padding:20px;width:90%;max-width:600px;max-height:80vh;overflow-y:auto;color:#eee;font-family:"Comic Neue",cursive';
    modal.onclick = e => e.stopPropagation();
    const title = document.createElement('h2'); title.textContent = 'Choose Layout'; title.style.cssText = 'margin:0 0 15px 0;font-family:Bangers,cursive;color:#fff;font-size:22px';
    modal.appendChild(title);
    const layouts = Panels.getLayoutOptions(panelCount);
    const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:15px';
    layouts.forEach(layout => {
      const card = document.createElement('div'); card.style.cssText = 'background:#222;border:2px solid #333;border-radius:6px;padding:12px;cursor:pointer';
      card.onmouseenter = () => card.style.borderColor = '#ff0'; card.onmouseleave = () => card.style.borderColor = '#333';
      card.onclick = () => { onSelect(layout.key); hide(); };
      const lbl = document.createElement('div'); lbl.textContent = layout.label; lbl.style.cssText = 'font-weight:bold;margin-bottom:8px;text-align:center;color:#ff0;font-size:11px';
      const prev = document.createElement('div'); prev.style.cssText = 'width:100%;height:100px;display:grid;grid-template-columns:'+layout.cols+';grid-template-rows:'+layout.rows+';gap:2px;background:#000;border-radius:3px';
      layout.positions.forEach((pos, idx) => {
        const cell = document.createElement('div'); cell.style.cssText = 'background:#555;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#ccc;grid-column:'+pos.col+';grid-row:'+pos.row;
        cell.textContent = idx+1; prev.appendChild(cell);
      });
      card.appendChild(lbl); card.appendChild(prev); grid.appendChild(card);
    });
    modal.appendChild(grid);
    const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn bd'; cancelBtn.textContent = 'Cancel'; cancelBtn.onclick = hide;
    modal.appendChild(cancelBtn);
    return modal;
  }

  function confirm(message, onConfirm) {
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1a1a;border:2px solid #444;border-radius:10px;padding:20px;width:90%;max-width:400px;color:#eee;font-family:"Comic Neue",cursive';
    modal.onclick = e => e.stopPropagation();
    const msg = document.createElement('p'); msg.textContent = message; msg.style.cssText = 'margin:0 0 20px 0;font-size:14px;line-height:1.5';
    modal.appendChild(msg);
    const btnRow = document.createElement('div'); btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
    const confirmBtn = document.createElement('button'); confirmBtn.className = 'btn br'; confirmBtn.textContent = 'Confirm';
    confirmBtn.onclick = () => { onConfirm(); hide(); };
    btnRow.appendChild(confirmBtn);
    const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn bd'; cancelBtn.textContent = 'Cancel'; cancelBtn.onclick = hide;
    btnRow.appendChild(cancelBtn);
    modal.appendChild(btnRow);
    show(modal);
  }

  function openJsonImport(onImport) { show(createJsonImportModal(onImport)); }
  function openGroupLayout(panelCount, onSelect) { show(createGroupLayoutModal(panelCount, onSelect)); }
  function openCreateGroup(availablePanels, onConfirm) { show(createGroupCreationModal(availablePanels, onConfirm)); }

  return { init, show, hide, confirm, openJsonImport, openGroupLayout, openCreateGroup };
})();