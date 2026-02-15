# Manga Panel Editor v4 — Architecture Documentation

## Overview

Version 4 is a complete refactor of the Manga Panel Editor with a modular architecture, enhanced panel width controls, modal-based UI, and a floating asset library.

## File Structure

```
manga-editor/
├── index.html           # Main application entry point
├── styles.css           # All CSS variables, layout, animations
├── app.js              # Main app logic, state management, rendering (1171 lines)
├── panels.js           # Panel CRUD, width balancing, group logic (251 lines)
├── modals.js           # JSON import modal, group preview modal (293 lines)
├── assets.js           # Asset library, layer management (231 lines)
├── bubbles.js          # Bubble shapes & SVG generation (399 lines)
├── layers.js           # Overlay layer management (111 lines)
├── history.js          # Event log, localStorage persistence (76 lines)
└── assets/             # Image assets (16 total)
    ├── speed-lines.png
    ├── dark-gradient.png
    ├── gloom-overlay.png
    ├── vignette.png
    ├── impact-burst.png
    ├── crack-overlay.png
    ├── rain-overlay.png
    ├── halftone.png
    ├── screen-tone-light.png
    ├── screen-tone-dark.png
    ├── crosshatch.png
    ├── dust-particles.png
    ├── smoke-wisps.png
    ├── light-leak.png
    └── bokeh-blur.png
```

## Key Features

### 1. Panel Width Control & Balancing

Each panel in a row has:
- **Width %**: Percentage of row width (default: equal distribution)
- **Lock icon** (🔒/🔓): Toggle to lock/unlock width
- **Minimum width**: 10% of page width enforced

**Balancing Algorithm:**
```javascript
When panel A resizes:
  1. Collect all UNLOCKED siblings
  2. Calculate delta (old width - new width)
  3. Distribute delta equally among unlocked siblings
  4. Locked panels stay fixed
  5. If no unlocked siblings → prevent resize
  6. Normalize to ensure total = 100%
```

**Warning System:**
- If all panels locked and total ≠ 100% → show warning

### 2. JSON Bubble Import — Modal System

**Trigger:** Click "Import JSON" button

**Modal Features:**
- Title: "Import Bubble Data"
- Instructions with expected JSON structure
- Large `<textarea>` for pasting
- "Validate" button → inline validation
- "Import" button → only active after validation passes
- Specific error messages:
  - "Panel ID 5 not found — skipped"
  - "Bubble missing required field `text` at index 2"

**Expected JSON Structure:**
```json
{
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
}
```

**Panel IDs:** Always 1-based (Panel 1, Panel 2, ...). Non-existent IDs silently skipped.

### 3. Asset Library — Compact Floating Panel

**Specifications:**
- **Size:** 280×360px floating panel
- **Position:** Fixed, top-right (20px from edges)
- **Search:** Real-time filtering by asset name
- **Categories:** 4 tabs (Overlays, Effects, Tones, Atmosphere)
- **Grid:** 2 columns, 80×60px thumbnails
- **Interaction:** Drag onto panel canvas

**Asset Categories:**

| Category | Assets |
|----------|--------|
| Overlays | speed-lines, dark-gradient, gloom-overlay, vignette |
| Effects | impact-burst, crack-overlay, rain-overlay, halftone |
| Tones | screen-tone-light, screen-tone-dark, crosshatch |
| Atmosphere | dust-particles, smoke-wisps, light-leak, bokeh-blur |

**Layer Management:**
- Opacity slider per layer
- Delete button
- Drag-to-reorder (future)
- Blend mode select (future)

### 4. Speech Bubble Types

**Shapes:** oval, circle, rectangle, parallelogram, cloud, spike/shout

**Border Styles:** solid, dashed, dotted, double, none

**Tail:** 8 directions (bottom-left, bottom-center, bottom-right, top-left, top-center, top-right, left, right) + none

**Typography:** font family, size, bold/italic, color, text align per bubble

### 5. Panel Groups & Row System

**Terminology:**
- **Row:** 2–4 panels side by side, same height, total width = 100%
- **Group:** Row with named preset layout

**Group Layouts:**

**2 panels:**
- Equal (1fr 1fr)
- Left-wide (7fr 3fr = 70/30)
- Right-wide (3fr 7fr = 30/70)

**3 panels:**
- Equal thirds (1fr 1fr 1fr)
- Large-left + 2 stacked right (3fr 2fr with grid)
- 2 stacked left + Large-right (2fr 3fr with grid)

**4 panels:**
- Equal row of 4 (1fr 1fr 1fr 1fr)
- 2×2 grid
- 1 tall-left + 3 stacked right
- 3 stacked left + 1 tall-right

**Group Creation Flow:**
1. Select panels (multi-select planned)
2. Click "Group" → modal opens with:
   - Layout picker (visual previews, clickable)
   - Live preview of selected images in chosen layout
   - Confirm / Cancel
3. On confirm → panels rearranged into group with chosen layout

**Group Rules:**
- Cannot add panels into existing group → must ungroup first
- Drag-and-drop moves **entire group** as one unit
- "Ungroup" button splits back to individual panels

### 6. Sidebar — Group/Row Display

**Individual Panels:**
```
┌─────────────────────────────────┐
│ [img] Panel 1        [↑][↓] [✕] │
└─────────────────────────────────┘
```

**Groups/Rows:**
```
┌─────────────────────────────────────────────┐
│ ▼ Group: 2-panel Left-wide  [🔓] [↑][↓]    │
├─────────────────────────────────────────────┤
│   [img] Panel 1 W:70% 🔓  [✎] [✕]         │
│   [img] Panel 2 W:30% 🔓  [✎] [✕]         │
└─────────────────────────────────────────────┘
```

- **Collapsible:** Click header to expand/collapse
- **Width %:** Displayed inline per panel
- **Lock icon:** Per panel (🔒/🔓)
- **Group header:** Shows layout type
- **Drag handle:** Only on group header (moves whole group)
- **Individual panels:** NOT draggable inside group

### 7. Event History

**Panel:** Collapsible, max 100 events (FIFO)

**Event Types:**
- `AUTO_SAVE` — Auto-save triggered (every 60s)
- `MANUAL_SAVE` — User clicked "Save Now"
- `JSON_IMPORT` — Bubbles imported from JSON
- `PANEL_ADD` — Panel uploaded
- `PANEL_DELETE` — Panel removed
- `PANEL_MOVE` — Row reordered
- `GROUP_CREATE` — Panels grouped
- `GROUP_SPLIT` — Group ungrouped
- `BUBBLE_ADD` — Bubble added
- `BUBBLE_EDIT` — Bubble modified
- `BUBBLE_DELETE` — Bubble removed
- `ASSET_ADD` — Overlay added to panel
- `ASSET_REMOVE` — Overlay removed
- `PAGE_CLEAR` — All panels cleared
- `SESSION_RESTORE` — Previous session restored

**Format:** `[14:32:05] BUBBLE_ADD — Panel 3: "Hello world"`

**Actions:**
- Export as `.txt` button
- Clear history button

### 8. Auto-Save & Storage

**Auto-Save:**
- Interval: 60 seconds
- Indicator: "Auto-saved Xm ago" in footer
- Shows time since last save (e.g., "30s ago" or "2m ago")
- Manual save button always visible in toolbar

**Storage:**
- Key: `mangaEditorState` in localStorage
- Contains: rows[], panel data, bubble positions (%), overlay data
- On load: Detect saved state → restore silently → log `SESSION_RESTORE`

**"Clear All" Button:**
- Opens confirmation modal (not browser alert)
- Wipes localStorage
- Resets editor to empty state

## Coordinate System

**Rule:** ALL bubble/asset positions stored as **percentages** (%).

**Conversion:** Convert to `px` only on render inside `requestAnimationFrame`.

**Bubble Properties:**
```javascript
{
  id: 123,
  type: 'speech',
  text: 'Hello',
  xPct: 20,     // % of panel width
  yPct: 15,     // % of panel height
  wPct: 25,     // % of panel width
  hPct: 10,     // % of panel height
  fontSize: 13,
  tail: 'bottom-left',
  fillColor: '#ffffff',
  textColor: '#000000',
  strokeColor: '#000000',
  shape: 'oval',
  borderStyle: 'solid'
}
```

**Why Percentages?**
- Panels can resize (width changes in rows)
- Bubbles maintain relative position
- Export always renders correctly

## Module API Reference

### panels.js

```javascript
// Panel creation
Panels.mkPanel(src) → {id, src, width, locked, height, ox, oy, scale, bubbles, overlays}
Panels.addPanel(src) → panel  // Adds to rows and returns panel

// Panel access
Panels.getRows() → Array<row>
Panels.getPanel(pid) → panel
Panels.getPanelIndex(pid) → 1-based index
Panels.getPanelByIndex(index) → panel
Panels.findRow(pid) → {row, rowIdx, idx}

// Panel operations
Panels.deletePanel(pid) → boolean
Panels.toggleLock(pid) → boolean | 'warning'
Panels.setWidth(pid, newWidth) → boolean
Panels.balanceWidths(row, changedIdx, newWidth) → boolean

// Groups
Panels.getLayoutOptions(panelCount) → Array<layout>
Panels.ungroupRow(rowIdx) → boolean
Panels.createGroup(panelIds, layout) → boolean

// Counters
Panels.getPC() → panel counter
Panels.getRC() → row counter
Panels.setPC(val)
Panels.setRC(val)
```

### modals.js

```javascript
// Initialization
Modals.init()

// Show/hide
Modals.show(contentElement)
Modals.hide()

// Specific modals
Modals.openJsonImport(onImportCallback)
Modals.openGroupLayout(panelCount, onSelectCallback)
Modals.confirm(message, onConfirmCallback)
```

### assets.js

```javascript
// Initialization
Assets.init()  // Creates floating panel

// Asset data
Assets.getAllAssets() → Array<asset>

// Panel operations
Assets.addOverlayToPanel(panel, assetFile)
Assets.removeOverlayFromPanel(panel, overlayId)
Assets.setOverlayOpacity(panel, overlayId, opacity)
Assets.setOverlayBlendMode(panel, overlayId, blendMode)
Assets.reorderOverlays(panel, fromIdx, toIdx)
```

### BubbleShapes (bubbles.js)

```javascript
// SVG generation
BubbleShapes.createSVG(bubble) → SVGElement

// Canvas export
BubbleShapes.drawOnCanvas(ctx, bubble, offsetX, offsetY)
```

### Layers (layers.js)

```javascript
// Overlay management
Layers.addOverlay(panel, file)
Layers.removeOverlay(panel, overlayId)
Layers.setOpacity(panel, overlayId, opacity)
Layers.reorderOverlay(panel, fromIdx, toIdx)

// Rendering
Layers.renderOverlays(panelEl, panel, onRemoveCallback)
Layers.renderOverlayList(container, panel, onRemove, onReorder, onOpacity)
```

### HistoryLog (history.js)

```javascript
// Initialization
HistoryLog.init(panelElement)

// Logging
HistoryLog.add(type, details)

// Management
HistoryLog.clear()
HistoryLog.exportTxt()
HistoryLog.render()
```

## State Management

**Global State (app.js):**
```javascript
selPID = null   // Selected panel ID
selBID = null   // Selected bubble ID
BC = 0          // Bubble counter
autoSaveTimer   // setInterval handle
autoSaveTs      // Timestamp of last save
```

**Panel State (managed by panels.js):**
```javascript
rows = []       // Array of row objects
PC = 0          // Panel counter
RC = 0          // Row counter

// Row structure
{
  id: 1,
  type: 'single' | 'row' | 'group',
  panels: [...],
  layout: 'left-wide' (if type === 'group')
}

// Panel structure
{
  id: 1,
  src: 'data:image/png;base64,...',
  width: 100,           // % of row width
  locked: false,        // Width lock state
  height: 450,          // px
  ox: 0, oy: 0,        // Image offset
  scale: 100,          // Image scale %
  bubbles: [...],
  overlays: [...]
}
```

## GitHub Pages Compatibility

**Stack:** Vanilla JS + CSS only. No build process required.

**Entry Point:** `index.html`

**Deployment:** 
```bash
# Just push to gh-pages branch
git checkout gh-pages
git merge main
git push
```

**URL:** `https://<user>.github.io/<repo>/`

## Testing

**Test Suite:** `test-modules.html`

**Run Tests:**
1. Open `test-modules.html` in browser
2. Green = pass, Red = fail
3. Tests cover:
   - Module loading
   - Panel creation and indexing
   - Lock/unlock functionality
   - Group layouts
   - Asset library
   - Bubble SVG generation

**Manual Testing Checklist:**
- [ ] Upload multiple images
- [ ] Create row with 2 panels
- [ ] Adjust panel width with lock/unlock
- [ ] Add bubbles to panels
- [ ] Drag bubbles to reposition
- [ ] Open JSON import modal
- [ ] Import valid/invalid JSON
- [ ] Search asset library
- [ ] Drag asset onto panel
- [ ] Adjust overlay opacity
- [ ] Create group with layout modal
- [ ] Ungroup group
- [ ] Verify auto-save
- [ ] Refresh page (test session restore)
- [ ] Export PNG

## Future Enhancements

- [ ] Inline width % input editor
- [ ] Blend mode selector for overlays
- [ ] Multi-select panels for grouping
- [ ] Undo/redo system
- [ ] Keyboard shortcuts
- [ ] Touch/mobile support
- [ ] Template presets
- [ ] Cloud save/sync

## License

MIT

## Credits

Built with ❤️ for manga creators worldwide.
