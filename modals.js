// ── MODALS MODULE — JSON import modal, group preview modal, confirm dialogs ──
var Modals = (function() {
  
  // Constants
  const PREVIEW_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
  
  let modalContainer = null;
  
  function init() {
    // Create modal container
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-overlay';
      modalContainer.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:1000;align-items:center;justify-content:center';
      document.body.appendChild(modalContainer);
    }
  }
  
  function show(content) {
    if (!modalContainer) init();
    modalContainer.innerHTML = '';
    modalContainer.appendChild(content);
    modalContainer.style.display = 'flex';
  }
  
  function hide() {
    if (modalContainer) {
      modalContainer.style.display = 'none';
      modalContainer.innerHTML = '';
    }
  }
  
  function createJsonImportModal(onImport) {
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1a1a;border:2px solid #444;border-radius:10px;padding:20px;width:90%;max-width:600px;max-height:80vh;overflow-y:auto;color:#eee;font-family:"Comic Neue",cursive';
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Import Bubble Data';
    title.style.cssText = 'margin:0 0 15px 0;font-family:Bangers,cursive;letter-spacing:1px;color:#fff;font-size:24px';
    modal.appendChild(title);
    
    // Instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = 'background:#0a0a0a;border:1px solid #333;border-radius:5px;padding:12px;margin-bottom:15px;font-size:11px;line-height:1.6;color:#aaa';
    instructions.innerHTML = `
      <div style="color:#ff0;font-weight:bold;margin-bottom:8px">Expected JSON Structure:</div>
      <pre style="margin:0;color:#8f8;overflow-x:auto">{
  "panels": [
    {
      "id": 1,
      "bubbles": [
        {
          "text": "Hello!",
          "x": 10, "y": 10,
          "w": 30, "h": 15,
          "shape": "oval",
          "borderStyle": "solid",
          "tailDir": "bottom-left"
        }
      ]
    }
  ]
}</pre>
      <div style="margin-top:8px;color:#666">
        • Panel IDs start from 1 (first panel on page)<br>
        • Non-existent panel IDs will be skipped<br>
        • All coordinates (x, y, w, h) are in percentages<br>
        • Valid shapes: oval, rectangle, parallelogram, cloud, spike<br>
        • Valid borderStyle: solid, dashed, dotted, double, none<br>
        • Valid tailDir: bottom-left, bottom-center, bottom-right, top-left, top-center, top-right, left, right, none
      </div>
    `;
    modal.appendChild(instructions);
    
    // Textarea
    const textarea = document.createElement('textarea');
    textarea.style.cssText = 'width:100%;min-height:200px;background:#0a0a0a;border:1px solid #444;color:#8f8;padding:10px;border-radius:5px;font-size:11px;font-family:monospace;resize:vertical;margin-bottom:10px';
    textarea.placeholder = 'Paste your JSON here...';
    modal.appendChild(textarea);
    
    // Validation message area
    const validationMsg = document.createElement('div');
    validationMsg.style.cssText = 'min-height:20px;margin-bottom:10px;font-size:11px';
    modal.appendChild(validationMsg);
    
    // Button row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
    
    // Validate button
    const validateBtn = document.createElement('button');
    validateBtn.className = 'btn bb';
    validateBtn.textContent = 'Validate';
    validateBtn.onclick = function() {
      const result = validateJson(textarea.value);
      if (result.valid) {
        validationMsg.innerHTML = '<span style="color:#0f0">✓ Valid JSON structure</span>';
        importBtn.disabled = false;
        importBtn.style.opacity = '1';
      } else {
        validationMsg.innerHTML = '<span style="color:#f88">✗ ' + result.error + '</span>';
        importBtn.disabled = true;
        importBtn.style.opacity = '0.5';
      }
    };
    btnRow.appendChild(validateBtn);
    
    // Import button
    const importBtn = document.createElement('button');
    importBtn.className = 'btn bg';
    importBtn.textContent = 'Import';
    importBtn.disabled = true;
    importBtn.style.opacity = '0.5';
    importBtn.onclick = function() {
      const data = JSON.parse(textarea.value);
      const result = onImport(data);
      hide();
      if (result && result.skipped && result.skipped.length > 0) {
        alert('Import complete. Skipped panels: ' + result.skipped.join(', '));
      }
    };
    btnRow.appendChild(importBtn);
    
    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn bd';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = hide;
    btnRow.appendChild(cancelBtn);
    
    modal.appendChild(btnRow);
    
    return modal;
  }
  
  function validateJson(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      
      if (!data.panels || !Array.isArray(data.panels)) {
        return {valid: false, error: 'Missing or invalid "panels" array'};
      }
      
      for (let i = 0; i < data.panels.length; i++) {
        const panel = data.panels[i];
        
        if (typeof panel.id !== 'number') {
          return {valid: false, error: `Panel at index ${i} missing valid "id" field`};
        }
        
        if (!panel.bubbles || !Array.isArray(panel.bubbles)) {
          return {valid: false, error: `Panel ${panel.id} missing or invalid "bubbles" array`};
        }
        
        for (let j = 0; j < panel.bubbles.length; j++) {
          const bubble = panel.bubbles[j];
          
          if (!bubble.text) {
            return {valid: false, error: `Bubble missing required field "text" at panel ${panel.id}, bubble index ${j}`};
          }
          
          const requiredFields = ['x', 'y', 'w', 'h'];
          for (let field of requiredFields) {
            if (typeof bubble[field] !== 'number') {
              return {valid: false, error: `Bubble missing or invalid field "${field}" at panel ${panel.id}, bubble index ${j}`};
            }
          }
        }
      }
      
      return {valid: true};
    } catch (e) {
      return {valid: false, error: 'Invalid JSON syntax: ' + e.message};
    }
  }
  
  function createGroupCreationModal(availablePanels, onConfirm) {
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1a1a;border:2px solid #444;border-radius:10px;padding:20px;width:90%;max-width:700px;max-height:80vh;overflow-y:auto;color:#eee;font-family:"Comic Neue",cursive';
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Create Group from Selected Panels';
    title.style.cssText = 'margin:0 0 15px 0;font-family:Bangers,cursive;letter-spacing:1px;color:#fff;font-size:24px';
    modal.appendChild(title);
    
    // Panel selection
    const selectionSection = document.createElement('div');
    selectionSection.style.cssText = 'margin-bottom:20px';
    
    const selectionTitle = document.createElement('div');
    selectionTitle.textContent = 'Select panels to include:';
    selectionTitle.style.cssText = 'font-size:14px;color:#ff0;margin-bottom:10px';
    selectionSection.appendChild(selectionTitle);
    
    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px';
    
    const selectedPanels = new Set();
    const checkboxes = [];
    
    availablePanels.forEach((panel, idx) => {
      const checkboxWrapper = document.createElement('label');
      checkboxWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;background:#222;border:1px solid #333;border-radius:4px;transition:all 0.2s';
      checkboxWrapper.onmouseenter = () => { checkboxWrapper.style.borderColor = '#ff0'; };
      checkboxWrapper.onmouseleave = () => { 
        checkboxWrapper.style.borderColor = selectedPanels.has(panel.id) ? '#0f0' : '#333'; 
      };
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = panel.id;
      checkbox.style.cssText = 'width:16px;height:16px;cursor:pointer';
      checkbox.onchange = () => {
        if (checkbox.checked) {
          selectedPanels.add(panel.id);
          checkboxWrapper.style.borderColor = '#0f0';
        } else {
          selectedPanels.delete(panel.id);
          checkboxWrapper.style.borderColor = '#333';
        }
        updateLayoutOptions();
        updatePreview();
      };
      checkboxes.push({ checkbox, panelId: panel.id });
      
      const label = document.createElement('span');
      label.textContent = `Panel ${idx + 1}`;
      label.style.cssText = 'font-size:12px;color:#ccc';
      
      checkboxWrapper.appendChild(checkbox);
      checkboxWrapper.appendChild(label);
      checkboxContainer.appendChild(checkboxWrapper);
    });
    
    selectionSection.appendChild(checkboxContainer);
    modal.appendChild(selectionSection);
    
    // Layout options
    const layoutSection = document.createElement('div');
    layoutSection.style.cssText = 'margin-bottom:20px';
    
    const layoutTitle = document.createElement('div');
    layoutTitle.textContent = 'Choose Layout:';
    layoutTitle.style.cssText = 'font-size:14px;color:#ff0;margin-bottom:10px';
    layoutSection.appendChild(layoutTitle);
    
    const layoutGrid = document.createElement('div');
    layoutGrid.id = 'layout-option-grid';
    layoutGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:15px';
    layoutSection.appendChild(layoutGrid);
    
    modal.appendChild(layoutSection);
    
    // Preview section
    const previewSection = document.createElement('div');
    previewSection.style.cssText = 'margin-bottom:20px';
    
    const previewTitle = document.createElement('div');
    previewTitle.textContent = 'Preview:';
    previewTitle.style.cssText = 'font-size:14px;color:#ff0;margin-bottom:10px';
    previewSection.appendChild(previewTitle);
    
    const previewContainer = document.createElement('div');
    previewContainer.id = 'layout-preview-container';
    previewContainer.style.cssText = 'width:100%;height:200px;border:2px solid #444;border-radius:8px;background:#000;display:flex;align-items:center;justify-content:center;color:#666;font-size:12px';
    previewContainer.textContent = 'Select 2-4 panels to see preview';
    previewSection.appendChild(previewContainer);
    
    modal.appendChild(previewSection);
    
    // Selected layout tracker
    let selectedLayout = null;
    
    // Update layout options based on selected panel count
    function updateLayoutOptions() {
      const count = selectedPanels.size;
      layoutGrid.innerHTML = '';
      
      if (count < 2 || count > 4) {
        layoutGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#666;padding:10px">Select 2-4 panels</div>';
        selectedLayout = null;
        return;
      }
      
      const layouts = Panels.getLayoutOptions(count);
      
      if (layouts.length === 0) {
        layoutGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#666;padding:10px">No layouts available</div>';
        selectedLayout = null;
        return;
      }
      
      // Auto-select first layout
      selectedLayout = layouts[0].key;
      
      layouts.forEach((layout, idx) => {
        const card = document.createElement('div');
        card.className = 'layout-card-mini';
        card.style.cssText = 'background:#222;border:2px solid ' + (idx === 0 ? '#0f0' : '#333') + ';border-radius:6px;padding:8px;cursor:pointer;transition:all 0.2s';
        card.onclick = () => {
          selectedLayout = layout.key;
          // Update all card borders
          Array.from(layoutGrid.children).forEach(c => {
            c.style.borderColor = '#333';
          });
          card.style.borderColor = '#0f0';
          updatePreview();
        };
        card.onmouseenter = () => { 
          if (selectedLayout !== layout.key) card.style.borderColor = '#ff0'; 
        };
        card.onmouseleave = () => { 
          card.style.borderColor = selectedLayout === layout.key ? '#0f0' : '#333'; 
        };
        
        const layoutLabel = document.createElement('div');
        layoutLabel.textContent = layout.label;
        layoutLabel.style.cssText = 'font-size:9px;color:#aaa;margin-bottom:5px;text-align:center;line-height:1.2';
        card.appendChild(layoutLabel);
        
        // Mini preview
        const preview = document.createElement('div');
        preview.style.cssText = 'width:100%;height:60px;border:1px solid #444;border-radius:3px;display:grid;grid-template-columns:' + layout.cols + ';grid-template-rows:' + layout.rows + ';gap:1px;background:#000';
        
        layout.positions.forEach((pos, pidx) => {
          const cell = document.createElement('div');
          cell.style.cssText = 'background:#555;border-radius:1px;grid-column:' + pos.col + ';grid-row:' + pos.row + ';display:flex;align-items:center;justify-content:center;color:#aaa;font-size:8px';
          cell.textContent = (pidx + 1);
          preview.appendChild(cell);
        });
        
        card.appendChild(preview);
        layoutGrid.appendChild(card);
      });
    }
    
    // Update preview with colored rectangles
    function updatePreview() {
      const count = selectedPanels.size;
      
      if (count < 2 || count > 4 || !selectedLayout) {
        previewContainer.style.display = 'flex';
        previewContainer.innerHTML = 'Select 2-4 panels and a layout';
        return;
      }
      
      const layouts = Panels.getLayoutOptions(count);
      const layout = layouts.find(l => l.key === selectedLayout);
      
      if (!layout) return;
      
      previewContainer.style.display = 'grid';
      previewContainer.style.gridTemplateColumns = layout.cols;
      previewContainer.style.gridTemplateRows = layout.rows;
      previewContainer.style.gap = '4px';
      previewContainer.style.padding = '10px';
      previewContainer.innerHTML = '';
      
      layout.positions.forEach((pos, idx) => {
        const cell = document.createElement('div');
        cell.style.cssText = 'background:' + PREVIEW_COLORS[idx % PREVIEW_COLORS.length] + ';border-radius:4px;grid-column:' + pos.col + ';grid-row:' + pos.row + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:bold';
        cell.textContent = (idx + 1);
        previewContainer.appendChild(cell);
      });
    }
    
    // Button row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
    
    const createBtn = document.createElement('button');
    createBtn.className = 'btn bg';
    createBtn.textContent = 'Create Group';
    createBtn.onclick = () => {
      const count = selectedPanels.size;
      if (count < 2 || count > 4) {
        alert('Please select 2-4 panels');
        return;
      }
      if (!selectedLayout) {
        alert('Please select a layout');
        return;
      }
      
      const panelIds = Array.from(selectedPanels);
      onConfirm(panelIds, selectedLayout);
      hide();
    };
    btnRow.appendChild(createBtn);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn bd';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = hide;
    btnRow.appendChild(cancelBtn);
    
    modal.appendChild(btnRow);
    
    // Initial update
    updateLayoutOptions();
    
    return modal;
  }
  
  function createGroupLayoutModal(panelCount, onSelect) {
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1a1a;border:2px solid #444;border-radius:10px;padding:20px;width:90%;max-width:700px;max-height:80vh;overflow-y:auto;color:#eee;font-family:"Comic Neue",cursive';
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Choose Group Layout';
    title.style.cssText = 'margin:0 0 15px 0;font-family:Bangers,cursive;letter-spacing:1px;color:#fff;font-size:24px';
    modal.appendChild(title);
    
    // Layout options
    const layouts = Panels.getLayoutOptions(panelCount);
    
    if (layouts.length === 0) {
      modal.innerHTML = '<p>No layouts available for ' + panelCount + ' panels.</p>';
      return modal;
    }
    
    const layoutGrid = document.createElement('div');
    layoutGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:20px';
    
    layouts.forEach(layout => {
      const card = document.createElement('div');
      card.style.cssText = 'background:#222;border:2px solid #333;border-radius:8px;padding:15px;cursor:pointer;transition:all 0.2s';
      card.onmouseenter = () => { card.style.borderColor = '#ff0'; };
      card.onmouseleave = () => { card.style.borderColor = '#333'; };
      card.onclick = () => {
        onSelect(layout.key);
        hide();
      };
      
      const layoutTitle = document.createElement('div');
      layoutTitle.textContent = layout.label;
      layoutTitle.style.cssText = 'font-weight:bold;margin-bottom:10px;text-align:center;color:#ff0;font-size:12px';
      card.appendChild(layoutTitle);
      
      // Visual preview (simplified)
      const preview = document.createElement('div');
      preview.style.cssText = 'width:100%;height:120px;border:1px solid #444;border-radius:4px;display:grid;grid-template-columns:' + layout.cols + ';grid-template-rows:' + layout.rows + ';gap:2px;background:#000';
      
      layout.positions.forEach((pos, idx) => {
        const cell = document.createElement('div');
        cell.style.cssText = 'background:#555;border-radius:2px;grid-column:' + pos.col + ';grid-row:' + pos.row + ';display:flex;align-items:center;justify-content:center;color:#ccc;font-size:10px';
        cell.textContent = (idx + 1);
        preview.appendChild(cell);
      });
      
      card.appendChild(preview);
      layoutGrid.appendChild(card);
    });
    
    modal.appendChild(layoutGrid);
    
    // Cancel button
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn bd';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = hide;
    btnRow.appendChild(cancelBtn);
    
    modal.appendChild(btnRow);
    
    return modal;
  }
  
  function confirm(message, onConfirm) {
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1a1a;border:2px solid #444;border-radius:10px;padding:20px;width:90%;max-width:400px;color:#eee;font-family:"Comic Neue",cursive';
    
    const msg = document.createElement('p');
    msg.textContent = message;
    msg.style.cssText = 'margin:0 0 20px 0;font-size:14px;line-height:1.5';
    modal.appendChild(msg);
    
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn br';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.onclick = () => {
      onConfirm();
      hide();
    };
    btnRow.appendChild(confirmBtn);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn bd';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = hide;
    btnRow.appendChild(cancelBtn);
    
    modal.appendChild(btnRow);
    
    show(modal);
  }
  
  function openJsonImport(onImport) {
    const modal = createJsonImportModal(onImport);
    show(modal);
  }
  
  function openGroupLayout(panelCount, onSelect) {
    const modal = createGroupLayoutModal(panelCount, onSelect);
    show(modal);
  }
  
  function openCreateGroup(availablePanels, onConfirm) {
    const modal = createGroupCreationModal(availablePanels, onConfirm);
    show(modal);
  }
  
  return {
    init: init,
    show: show,
    hide: hide,
    confirm: confirm,
    openJsonImport: openJsonImport,
    openGroupLayout: openGroupLayout,
    openCreateGroup: openCreateGroup
  };
})();
