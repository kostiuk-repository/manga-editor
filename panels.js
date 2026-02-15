// ── PANELS MODULE — Panel CRUD, width balancing, group logic ──
var Panels = (function() {
  
  let PC = 0; // Panel counter
  let RC = 0; // Row counter
  let rows = [];
  
  const GROUP_LAYOUTS = {
    'equal-2': {cols: '1fr 1fr', rows: '1fr', positions: [{col: '1', row: '1'}, {col: '2', row: '1'}], label: 'Equal', count: 2},
    'left-wide': {cols: '7fr 3fr', rows: '1fr', positions: [{col: '1', row: '1'}, {col: '2', row: '1'}], label: 'Left-wide (70/30)', count: 2},
    'right-wide': {cols: '3fr 7fr', rows: '1fr', positions: [{col: '1', row: '1'}, {col: '2', row: '1'}], label: 'Right-wide (30/70)', count: 2},
    
    'equal-3': {cols: '1fr 1fr 1fr', rows: '1fr', positions: [{col: '1', row: '1'}, {col: '2', row: '1'}, {col: '3', row: '1'}], label: 'Equal thirds', count: 3},
    'large-left-2right': {cols: '3fr 2fr', rows: '1fr 1fr', positions: [{col: '1', row: '1 / -1'}, {col: '2', row: '1'}, {col: '2', row: '2'}], label: 'Large-left + 2 stacked right', count: 3},
    '2left-large-right': {cols: '2fr 3fr', rows: '1fr 1fr', positions: [{col: '1', row: '1'}, {col: '1', row: '2'}, {col: '2', row: '1 / -1'}], label: '2 stacked left + Large-right', count: 3},
    
    'equal-4': {cols: '1fr 1fr 1fr 1fr', rows: '1fr', positions: [{col: '1', row: '1'}, {col: '2', row: '1'}, {col: '3', row: '1'}, {col: '4', row: '1'}], label: 'Equal row of 4', count: 4},
    '2x2': {cols: '1fr 1fr', rows: '1fr 1fr', positions: [{col: '1', row: '1'}, {col: '2', row: '1'}, {col: '1', row: '2'}, {col: '2', row: '2'}], label: '2×2 grid', count: 4},
    '1left-3right': {cols: '1fr 1fr', rows: '1fr 1fr 1fr', positions: [{col: '1', row: '1 / -1'}, {col: '2', row: '1'}, {col: '2', row: '2'}, {col: '2', row: '3'}], label: '1 tall-left + 3 stacked right', count: 4},
    '3left-1right': {cols: '1fr 1fr', rows: '1fr 1fr 1fr', positions: [{col: '1', row: '1'}, {col: '1', row: '2'}, {col: '1', row: '3'}, {col: '2', row: '1 / -1'}], label: '3 stacked left + 1 tall-right', count: 4}
  };
  
  function mkPanel(src) {
    return {
      id: ++PC,
      src: src,
      height: 450,
      ox: 0,
      oy: 0,
      scale: 100,
      width: 100, // Width percentage (default 100% for single panels)
      locked: false, // Lock state for width
      bubbles: [],
      overlays: []
    };
  }
  
  function addPanel(src) {
    const p = mkPanel(src);
    rows.push({id: ++RC, type: 'single', panels: [p]});
    return p;
  }
  
  function getRows() {
    return rows;
  }
  
  function setRows(newRows) {
    rows = newRows;
  }
  
  function getPanel(pid) {
    for (let row of rows) {
      for (let p of row.panels) {
        if (p.id === pid) return p;
      }
    }
    return null;
  }
  
  function getPanelIndex(pid) {
    let idx = 1;
    for (let row of rows) {
      for (let p of row.panels) {
        if (p.id === pid) return idx;
        idx++;
      }
    }
    return -1;
  }
  
  function getPanelByIndex(index) {
    let idx = 1;
    for (let row of rows) {
      for (let p of row.panels) {
        if (idx === index) return p;
        idx++;
      }
    }
    return null;
  }
  
  function findRow(pid) {
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      for (let pi = 0; pi < row.panels.length; pi++) {
        if (row.panels[pi].id === pid) {
          return {row: row, rowIdx: ri, idx: pi};
        }
      }
    }
    return {row: null, rowIdx: -1, idx: -1};
  }
  
  function deletePanel(pid) {
    const {row, rowIdx, idx} = findRow(pid);
    if (!row) return false;
    
    row.panels.splice(idx, 1);
    
    if (row.panels.length === 0) {
      rows.splice(rowIdx, 1);
    } else if (row.panels.length === 1 && row.type !== 'single') {
      row.type = 'single';
      row.panels[0].width = 100;
      row.panels[0].locked = false;
    }
    
    return true;
  }
  
  // Width balancing algorithm
  function balanceWidths(row, changedPanelIdx, newWidth) {
    if (row.type === 'single') return;
    
    const panels = row.panels;
    const changedPanel = panels[changedPanelIdx];
    
    // Enforce minimum width
    if (newWidth < 10) newWidth = 10;
    
    const oldWidth = changedPanel.width;
    const delta = oldWidth - newWidth;
    
    // Collect unlocked siblings
    const unlocked = [];
    for (let i = 0; i < panels.length; i++) {
      if (i !== changedPanelIdx && !panels[i].locked) {
        unlocked.push(i);
      }
    }
    
    // If no unlocked siblings, prevent resize
    if (unlocked.length === 0) {
      return false;
    }
    
    // Set new width for changed panel
    changedPanel.width = newWidth;
    
    // Distribute delta equally among unlocked siblings
    const perPanel = delta / unlocked.length;
    for (let idx of unlocked) {
      panels[idx].width = Math.max(10, panels[idx].width + perPanel);
    }
    
    // Normalize to ensure total is exactly 100%
    normalizeWidths(row);
    
    return true;
  }
  
  function normalizeWidths(row) {
    if (row.type === 'single') return;
    
    const panels = row.panels;
    const total = panels.reduce((sum, p) => sum + p.width, 0);
    
    if (Math.abs(total - 100) > 0.01) {
      const scale = 100 / total;
      for (let p of panels) {
        p.width = p.width * scale;
      }
    }
  }
  
  function toggleLock(pid) {
    const p = getPanel(pid);
    if (!p) return false;
    
    p.locked = !p.locked;
    
    // Check if all panels in row are locked
    const {row} = findRow(pid);
    if (row && row.type !== 'single') {
      const allLocked = row.panels.every(panel => panel.locked);
      if (allLocked) {
        const total = row.panels.reduce((sum, p) => sum + p.width, 0);
        if (Math.abs(total - 100) > 1) {
          return 'warning'; // Indicate warning should be shown
        }
      }
    }
    
    return true;
  }
  
  function setWidth(pid, newWidth) {
    const {row, idx} = findRow(pid);
    if (!row || row.type === 'single') return false;
    
    return balanceWidths(row, idx, newWidth);
  }
  
  function createGroup(panelIds, layout) {
    // Implementation for group creation
    // This will be called from the modal
    // For now, keep existing merge/split functionality
    return true;
  }
  
  function ungroupRow(rowIdx) {
    if (rowIdx < 0 || rowIdx >= rows.length) return false;
    
    const row = rows[rowIdx];
    if (row.type === 'single') return false;
    
    // Split into individual rows
    const newRows = row.panels.map(p => {
      p.width = 100;
      p.locked = false;
      return {id: ++RC, type: 'single', panels: [p]};
    });
    
    rows.splice(rowIdx, 1, ...newRows);
    return true;
  }
  
  function getLayoutOptions(panelCount) {
    const options = [];
    for (let key in GROUP_LAYOUTS) {
      if (GROUP_LAYOUTS[key].count === panelCount) {
        options.push({key: key, ...GROUP_LAYOUTS[key]});
      }
    }
    return options;
  }
  
  return {
    mkPanel: mkPanel,
    addPanel: addPanel,
    getRows: getRows,
    setRows: setRows,
    getPanel: getPanel,
    getPanelIndex: getPanelIndex,
    getPanelByIndex: getPanelByIndex,
    findRow: findRow,
    deletePanel: deletePanel,
    balanceWidths: balanceWidths,
    toggleLock: toggleLock,
    setWidth: setWidth,
    createGroup: createGroup,
    ungroupRow: ungroupRow,
    getLayoutOptions: getLayoutOptions,
    GROUP_LAYOUTS: GROUP_LAYOUTS,
    getPC: () => PC,
    getRC: () => RC,
    setPC: (val) => { PC = val; },
    setRC: (val) => { RC = val; }
  };
})();
