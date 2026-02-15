// ── PANELS MODULE — Panel CRUD, width balancing, group logic ──
var Panels = (function() {
  
  let PC = 0;
  let RC = 0;
  let rows = [];

  const GROUP_LAYOUTS = {
    'col-2':         { cols: '1fr 1fr',         rows: '1fr',         label: '2 columns',                   count: 2 },
    'col-2-left':    { cols: '2fr 1fr',         rows: '1fr',         label: 'Wide left + narrow right',    count: 2 },
    'col-2-right':   { cols: '1fr 2fr',         rows: '1fr',         label: 'Narrow left + wide right',    count: 2 },
    'col-3':         { cols: '1fr 1fr 1fr',     rows: '1fr',         label: '3 equal columns',             count: 3 },
    'col-2-stack-r': { cols: '2fr 1fr',         rows: '1fr 1fr',     label: 'Wide left + 2 stacked right', count: 3,
                       positions: [{col:'1',row:'1 / 3'},{col:'2',row:'1'},{col:'2',row:'2'}] },
    'col-2-stack-l': { cols: '1fr 2fr',         rows: '1fr 1fr',     label: '2 stacked left + wide right', count: 3,
                       positions: [{col:'1',row:'1'},{col:'1',row:'2'},{col:'2',row:'1 / 3'}] },
    'col-4':         { cols: '1fr 1fr 1fr 1fr', rows: '1fr',         label: '4 equal columns',             count: 4 },
    '2x2':           { cols: '1fr 1fr',         rows: '1fr 1fr',     label: '2×2 grid',                   count: 4 },
    'col-2-stack-r3':{ cols: '2fr 1fr',         rows: '1fr 1fr 1fr', label: 'Wide left + 3 stacked right', count: 4,
                       positions: [{col:'1',row:'1 / 4'},{col:'2',row:'1'},{col:'2',row:'2'},{col:'2',row:'3'}] },
    'col-2-stack-l3':{ cols: '1fr 2fr',         rows: '1fr 1fr 1fr', label: '3 stacked left + wide right', count: 4,
                       positions: [{col:'1',row:'1'},{col:'1',row:'2'},{col:'1',row:'3'},{col:'2',row:'1 / 4'}] }
  };

  function mkPanel(src) {
    return {
      id: ++PC,
      src: src,
      height: 450,
      aspectRatio: null,
      ox: 0,
      oy: 0,
      scale: 100,
      width: 100,
      locked: false,
      bubbles: [],
      overlays: [],
      layers: []
    };
  }

  function addPanel(src) {
    const p = mkPanel(src);
    rows.push({id: ++RC, type: 'single', panels: [p]});
    return p;
  }

  function getRows() { return rows; }
  function setRows(newRows) { rows = newRows; }

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
    } else if (row.panels.length === 1) {
      row.type = 'single';
      row.panels[0].width = 100;
      row.panels[0].locked = false;
      delete row.layout;
    }
    return true;
  }

  function balanceWidths(row, changedPanelIdx, newWidth) {
    if (row.type === 'single') return false;
    const panels = row.panels;
    if (newWidth < 10) newWidth = 10;
    const oldWidth = panels[changedPanelIdx].width;
    const delta = oldWidth - newWidth;
    const unlocked = [];
    for (let i = 0; i < panels.length; i++) {
      if (i !== changedPanelIdx && !panels[i].locked) unlocked.push(i);
    }
    if (unlocked.length === 0) return false;
    panels[changedPanelIdx].width = newWidth;
    const perPanel = delta / unlocked.length;
    for (let idx of unlocked) {
      panels[idx].width = Math.max(10, panels[idx].width + perPanel);
    }
    normalizeWidths(row);
    return true;
  }

  function normalizeWidths(row) {
    if (row.type === 'single') return;
    const panels = row.panels;
    const total = panels.reduce((sum, p) => sum + p.width, 0);
    if (Math.abs(total - 100) > 0.01) {
      const scale = 100 / total;
      for (let p of panels) p.width = p.width * scale;
    }
  }

  function toggleLock(pid) {
    const p = getPanel(pid);
    if (!p) return false;
    p.locked = !p.locked;
    const {row} = findRow(pid);
    if (row && row.type !== 'single') {
      const allLocked = row.panels.every(panel => panel.locked);
      if (allLocked) {
        const total = row.panels.reduce((sum, p) => sum + p.width, 0);
        if (Math.abs(total - 100) > 1) return 'warning';
      }
    }
    return true;
  }

  function setWidth(pid, newWidth) {
    const {row, idx} = findRow(pid);
    if (!row || row.type === 'single') return false;
    return balanceWidths(row, idx, newWidth);
  }

  function ungroupRow(rowIdx) {
    if (rowIdx < 0 || rowIdx >= rows.length) return false;
    const row = rows[rowIdx];
    if (row.type === 'single') return false;
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
        const layout = Object.assign({}, GROUP_LAYOUTS[key]);
        if (!layout.positions) {
          layout.positions = [];
          const colsCount = layout.cols.split(' ').length;
          for (let i = 0; i < panelCount; i++) {
            const col = (i % colsCount) + 1;
            const row = Math.floor(i / colsCount) + 1;
            layout.positions.push({col: String(col), row: String(row)});
          }
        }
        options.push(Object.assign({key: key}, layout));
      }
    }
    return options;
  }

  function changeGroupLayout(rowIdx, newLayoutKey) {
    if (rowIdx < 0 || rowIdx >= rows.length) return false;
    const row = rows[rowIdx];
    const layout = GROUP_LAYOUTS[newLayoutKey];
    if (!layout || layout.count !== row.panels.length) return false;
    row.layout = newLayoutKey;
    row.type = 'group';
    return true;
  }

  function createGroupFromPanels(panelIds, layoutKey) {
    // Collect panel info
    const panelInfos = [];
    panelIds.forEach(pid => {
      const result = findRow(pid);
      if (result && result.row && result.row.type === 'single') {
        panelInfos.push({ panel: result.row.panels[0], rowIdx: result.rowIdx });
      }
    });

    if (panelInfos.length < 2 || panelInfos.length > 4) return false;

    // Find earliest row index for insertion
    const insertIdx = Math.min(...panelInfos.map(pi => pi.rowIdx));

    // Sort descending to safely remove rows
    panelInfos.sort((a, b) => b.rowIdx - a.rowIdx);
    const panels = panelInfos.map(pi => pi.panel).reverse();

    // Remove rows (descending order avoids index shifting)
    panelInfos.forEach(pi => rows.splice(pi.rowIdx, 1));

    // Set equal widths
    panels.forEach(p => {
      p.width = 100 / panels.length;
      p.locked = false;
    });

    // Insert group at correct position
    const actualInsert = Math.min(insertIdx, rows.length);
    rows.splice(actualInsert, 0, {
      id: ++RC,
      type: 'group',
      layout: layoutKey,
      panels: panels
    });

    return true;
  }

  return {
    mkPanel, addPanel, getRows, setRows, getPanel, getPanelIndex, getPanelByIndex,
    findRow, deletePanel, balanceWidths, toggleLock, setWidth,
    createGroupFromPanels, ungroupRow, changeGroupLayout, getLayoutOptions,
    GROUP_LAYOUTS,
    getPC: () => PC, getRC: () => RC,
    setPC: (val) => { PC = val; }, setRC: (val) => { RC = val; }
  };
})();