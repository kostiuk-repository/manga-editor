# Manga Editor v5 - Refactoring Summary

## Overview
This refactoring addresses critical bugs and implements a new architectural layer system for the manga panel editor. The codebase has been upgraded from v4 to v5 with breaking changes that improve maintainability and functionality.

---

## 1. Critical Bug Fixes

### 1.1 Auto-Save & Restore System
**Problem:** 
- `autoSave()` and `manualSave()` had conflicting logic
- `restoreState()` was conditional and wouldn't always run
- Auto-save timestamp interfered with manual saves

**Solution:**
- Created unified `saveState()` function called by both `autoSave()` and `manualSave()`
- Made `restoreState()` unconditional - always runs on DOMContentLoaded
- Properly initializes `BC`, `PC`, `RC` counters before rendering
- DataURL images preserved exactly as-is in localStorage JSON

**Files Changed:**
- `app.js`: Lines 927-1015 (save/restore functions)

### 1.2 Image Import Cropping
**Problem:**
- Images used `transform: translate(x,y) scale(z)` which could crop content
- No control over non-crop display

**Solution:**
- Changed to `object-fit: contain` for full image display
- Used `object-position` for ox/oy offset control
- Panel controls (ox/oy/scale) still exist but default to no-crop
- Added `aspectRatio` property to panels

**Files Changed:**
- `styles.css`: Lines 52-53 (image wrapper & img styles)
- `app.js`: Lines 330-345 (mkPanelEl function)
- `app.js`: Lines 39-56 (handleFiles with aspect ratio calculation)
- `panels.js`: Line 27 (mkPanel with aspectRatio)

**Key Constants Added:**
```javascript
const SCHEMA_VERSION = 'v5';
const STANDARD_WIDTH = 800;
const DEFAULT_HEIGHT = 450;
```

---

## 2. Feature Removals

### 2.1 Row Functions Removed
Removed legacy functions that are replaced by the group system:
- `mergeRow()` - replaced by `createGroup()`
- `splitRow()` - replaced by `ungroupRow()`
- `swapRow()` - no longer needed with grid-based layouts

**Files Changed:**
- `index.html`: Removed 3 buttons from Row Layout section
- `app.js`: Removed functions, kept only `createGroup()` and `changeGroupLayoutUI()`

### 2.2 Preset Area Removed
The bubble preset system has been removed entirely:
- `#preset-area` HTML section removed
- All preset-related JavaScript removed

**Files Changed:**
- `index.html`: Lines 108-112 deleted

### 2.3 Asset Library Relocated
**Before:** Floating panel (`#asset-library-floating`)
**After:** Embedded in sidebar (`#asset-library`)

**Files Changed:**
- `index.html`: Added `#asset-library` div in sidebar
- `assets.js`: Completely refactored to render in sidebar
  - Changed from `createFloatingPanel()` to `createLibraryPanel()`
  - Updated styling to fit sidebar layout
  - Maintained drag-and-drop functionality

---

## 3. New Group Architecture

### 3.1 Updated GROUP_LAYOUTS
Replaced old naming scheme with clearer conventions:

#### 2-Panel Layouts:
- `col-2`: Equal columns (1fr 1fr)
- `col-2-left`: Wide left + narrow right (2fr 1fr)
- `col-2-right`: Narrow left + wide right (1fr 2fr)

#### 3-Panel Layouts:
- `col-3`: 3 equal columns (1fr 1fr 1fr)
- `col-2-stack-r`: Wide left + 2 stacked right (2fr 1fr grid)
- `col-2-stack-l`: 2 stacked left + wide right (1fr 2fr grid)

#### 4-Panel Layouts:
- `col-4`: 4 equal columns (1fr 1fr 1fr 1fr)
- `2x2`: 2×2 grid
- `col-2-stack-r3`: Wide left + 3 stacked right
- `col-2-stack-l3`: 3 stacked left + wide right

**Files Changed:**
- `panels.js`: Lines 8-46 (GROUP_LAYOUTS definition)

### 3.2 Position Auto-Generation
Layouts without explicit `positions` now auto-generate left-to-right positions:
```javascript
if (!layout.positions) {
  layout.positions = [];
  const colsCount = layout.cols.split(' ').length;
  for (let i = 0; i < panelCount; i++) {
    const col = (i % colsCount) + 1;
    const row = Math.floor(i / colsCount) + 1;
    layout.positions.push({ col: String(col), row: String(row) });
  }
}
```

**Files Changed:**
- `panels.js`: Lines 229-249 (getLayoutOptions function)

### 3.3 New Functions
- `changeGroupLayout(rowIdx, newLayoutKey)`: Changes layout of existing group
- `changeGroupLayoutUI()`: User interface for layout selection

**Files Changed:**
- `panels.js`: Lines 251-261 (changeGroupLayout)
- `panels.js`: Line 282 (exported in return)
- `app.js`: Lines 859-882 (changeGroupLayoutUI)

---

## 4. Z-Order/Layer System (v5)

### 4.1 Layer Structure
Each panel now has a `layers` array instead of flat `bubbles[]` and `overlays[]`:

```javascript
panel.layers = [
  { id, kind: 'image',   zIndex: 0 },   // base image (always exists)
  { id, kind: 'overlay', file, opacity, zIndex: 1 },
  { id, kind: 'bubble',  bubbleData, zIndex: 2 },
  ...
]
```

**Rules:**
- `zIndex` determines render order (lower = behind)
- Bubbles and overlays freely interleaved
- `panel.bubbles` and `panel.overlays` maintained as computed views for backward compatibility

### 4.2 New Layer Functions
```javascript
// Layer system
Layers.initializeLayers(panel)  // Initialize from existing bubbles/overlays
Layers.syncViews(panel)         // Rebuild bubbles/overlays arrays from layers

// Layer manipulation
Layers.setLayerZ(panel, layerId, newZ)      // Set specific zIndex
Layers.moveLayerUp(panel, layerId)          // Swap with layer above
Layers.moveLayerDown(panel, layerId)        // Swap with layer below
```

**Files Changed:**
- `layers.js`: Complete rewrite (285 lines)
  - Added `initializeLayers()` to create layers from legacy data
  - Added `syncViews()` to maintain backward compatibility
  - Added z-order manipulation functions
  - Updated `renderOverlays()` to sort by zIndex

### 4.3 Integration Points
- `mkPanelEl()`: Calls `Layers.initializeLayers(p)` before rendering
- `addBubble()`: Adds bubble to both `p.bubbles` and `p.layers`
- `delBubble()`: Removes from both arrays
- `restoreState()`: Initializes layers after loading from localStorage

**Files Changed:**
- `app.js`: Lines 319, 731-747 (layer initialization in rendering and bubble management)
- `panels.js`: Line 31 (added `layers: []` to mkPanel)

---

## 5. Save/Restore Updates

### 5.1 Schema Version Bump
- **Old:** No version (implicit v4)
- **New:** `version: 'v5'` in saved state

Migration strategy:
```javascript
if (state.version !== SCHEMA_VERSION) {
  localStorage.removeItem('mangaEditorState');
  return; // Start fresh
}
```

**Files Changed:**
- `app.js`: Added `SCHEMA_VERSION` constant
- `app.js`: Lines 970, 1031-1034 (version check)

### 5.2 Layer Persistence
State now includes:
```javascript
{
  version: 'v5',
  layers: [...],      // Saved
  bubbles: [...],     // Still saved for compatibility
  overlays: [...],    // Still saved for compatibility
  aspectRatio: 0.75,  // New field
  ...
}
```

On restore:
1. Load layers array
2. Call `initializeLayers()` if layers empty
3. Call `syncViews()` to rebuild bubbles/overlays arrays

**Files Changed:**
- `app.js`: Lines 958-1008 (saveState function)
- `app.js`: Lines 1016-1052 (restoreState function)

---

## 6. Testing & Validation

### 6.1 Module Tests
Created comprehensive test suites:
- `test-basic.js`: Tests panel creation, layouts, layer system
- `test-layout-positions.js`: Validates position auto-generation
- `test-visual.html`: Browser-based visual validation

**All tests passing:**
- ✅ Panel creation with layers
- ✅ AspectRatio property
- ✅ Layout options (2/3/4 panels)
- ✅ Position auto-generation
- ✅ Layer functions (setLayerZ, moveLayerUp, moveLayerDown)

### 6.2 Code Quality
- ✅ JavaScript syntax validated (all files)
- ✅ Code review completed (5 comments addressed)
- ✅ Security scan passed (0 vulnerabilities - CodeQL)
- ✅ Constants added for magic numbers

---

## 7. Breaking Changes

### 7.1 Storage Format
**Impact:** Users with v4 data will lose their work on first load of v5

**Mitigation:** Version check clears localStorage and starts fresh

### 7.2 API Changes
**Removed:**
- `mergeRow()`, `splitRow()`, `swapRow()`

**Added:**
- `changeGroupLayout(rowIdx, newLayoutKey)`
- `Layers.initializeLayers(panel)`
- `Layers.syncViews(panel)`
- `Layers.setLayerZ(panel, layerId, newZ)`
- `Layers.moveLayerUp(panel, layerId)`
- `Layers.moveLayerDown(panel, layerId)`

**Changed:**
- `GROUP_LAYOUTS` keys renamed (e.g., `'equal-2'` → `'col-2'`)
- Asset library now renders in sidebar, not floating

---

## 8. Future Enhancements

### Ready for Implementation:
1. **UI for Layer Reordering**: Add drag handles in overlay list
2. **Blend Modes**: Already in data structure, needs UI
3. **Layer Visibility Toggle**: Add eye icon per layer
4. **Multi-panel Group Creation**: Modal for selecting multiple panels

### Architecture Supports:
- **Undo/Redo**: State snapshots already serializable
- **Cloud Sync**: JSON state ready for backend
- **Collaborative Edit**: Layer system supports conflict resolution

---

## 9. Files Modified

| File | Lines Changed | Purpose |
|------|--------------|---------|
| `app.js` | ~150 lines | Save/restore, image handling, group UI, constants |
| `panels.js` | ~60 lines | GROUP_LAYOUTS, changeGroupLayout, position generation |
| `layers.js` | ~180 lines | Complete rewrite for z-order system |
| `assets.js` | ~80 lines | Move from floating to sidebar |
| `styles.css` | 2 lines | Image object-fit changes |
| `index.html` | ~15 lines | Remove presets, add asset library, remove row buttons |

**Total:** ~487 lines changed across 6 files

---

## 10. Deployment Checklist

- [x] All JavaScript syntax validated
- [x] Module loading tested
- [x] Layout generation tested
- [x] Code review completed
- [x] Security scan passed (CodeQL)
- [x] Breaking changes documented
- [x] Migration strategy defined
- [x] Constants defined for maintainability

**Status:** ✅ Ready for production deployment

---

## Conclusion

This refactoring successfully addresses all critical bugs, removes deprecated features, and implements a robust layer system that sets the foundation for advanced features like z-order manipulation, blend modes, and layer visibility. The codebase is now cleaner, more maintainable, and ready for future enhancements.

**Version:** 5.0.0
**Completion Date:** 2026-02-15
**Files Changed:** 6 core files + 3 test files
**Breaking Changes:** Yes (requires localStorage migration)
