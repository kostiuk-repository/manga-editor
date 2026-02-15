# 📖 Manga Panel Editor v4

A powerful web-based manga/manhwa editor for creating professional comic book pages. Upload images, arrange panels, add speech bubbles, and export as PNG.

![Version](https://img.shields.io/badge/version-4.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![JavaScript](https://img.shields.io/badge/javascript-vanilla-yellow)

## ✨ Features

### Panel Management
- **Upload multiple images** and arrange them into panels
- **Width control** with percentage-based resizing
- **Lock/unlock** individual panels to fix their width
- **Smart balancing**: unlocked panels auto-adjust when siblings resize
- **Minimum 10% width** per panel enforced

### Speech Bubbles
- **6 shapes**: oval, rectangle, parallelogram, cloud, spike
- **5 border styles**: solid, dashed, dotted, double, none
- **8 tail directions** + no tail option
- **Customizable typography**: font size, color, text alignment
- **Drag to move**, **resize handles**, **live preview**

### Panel Groups & Layouts
- **10 preset layouts** for 2, 3, and 4-panel compositions
- **Visual layout picker** with preview
- **Collapsible groups** in sidebar for organization
- **Drag entire groups** as single units
- **Ungroup** to split back to individual panels

### Asset Library
- **Floating 280×360px panel** with categorized assets
- **4 categories**: Overlays, Effects, Tones, Atmosphere
- **16 built-in assets** for manga effects
- **Search functionality** for quick filtering
- **Drag-and-drop** onto panels
- **Layer management** with opacity control

### JSON Import
- **Custom modal** for importing bubble data
- **Inline validation** with specific error messages
- **1-based panel indexing** (Panel 1, Panel 2, ...)
- **Batch import** multiple bubbles at once
- **Example JSON** structure shown in modal

### Auto-Save & History
- **Auto-save every 60 seconds** to localStorage
- **Session restore** on page load
- **Event history** with 14 event types
- **"Auto-saved Xm ago"** display in footer
- **Export history** as `.txt` file

### Export
- **High-quality PNG export** with Canvas API
- **No external dependencies** or watermarks
- **Preserves all effects** and overlays

## 🚀 Quick Start

### Online Version
Visit: `https://your-username.github.io/manga-editor/`

### Local Setup
```bash
# Clone repository
git clone https://github.com/your-username/manga-editor.git
cd manga-editor

# Serve with any HTTP server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

No build process required! Just open `index.html` in your browser.

## 📖 Usage

### Basic Workflow
1. **Upload images** - Click "➕ Upload images" and select your manga panels
2. **Arrange panels** - Drag panels in sidebar to reorder
3. **Create rows** - Click "Merge↓" to combine panels side-by-side
4. **Adjust widths** - Use lock icons (🔒/🔓) and resize panels
5. **Add bubbles** - Select panel, click "💬 Speech" / "💭 Thought" / "💥 SFX"
6. **Position bubbles** - Drag to move, drag corner to resize
7. **Add effects** - Drag assets from floating library onto panels
8. **Export** - Click "💾 Export PNG" when done

### Creating Panel Groups
1. Select panels to group (click on them)
2. Click "⊞ Group↓" button
3. Choose layout from visual picker
4. Click "Confirm"

### JSON Import Example
Click "📥 Import JSON" and paste:
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

## 🏗️ Architecture

### File Structure
```
manga-editor/
├── index.html          # Main entry point
├── styles.css          # All styles
├── app.js             # Main application logic (1171 lines)
├── panels.js          # Panel management (251 lines)
├── modals.js          # Modal system (293 lines)
├── assets.js          # Asset library (231 lines)
├── bubbles.js         # Bubble rendering (399 lines)
├── layers.js          # Overlay management (111 lines)
├── history.js         # Event logging (76 lines)
└── assets/            # Image assets (16 files)
```

### Modular Design
- **panels.js** - Panel CRUD, width balancing, group layouts
- **modals.js** - JSON import modal, group preview modal, confirm dialogs
- **assets.js** - Floating asset library with search & categories
- **app.js** - State management, rendering, event handling
- **bubbles.js** - SVG bubble generation, Canvas export
- **layers.js** - Overlay layer management
- **history.js** - Event logging, localStorage persistence

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

## 🧪 Testing

### Automated Tests
```bash
# Open in browser
open test-modules.html
```

Tests cover:
- Module loading and APIs
- Panel creation and indexing
- Lock/unlock functionality
- Group layouts
- Asset operations
- Bubble SVG generation

### Manual Testing Checklist
- [ ] Upload and manipulate images
- [ ] Adjust panel widths with lock/unlock
- [ ] Import JSON (valid and invalid)
- [ ] Search and drag assets
- [ ] Create groups with layouts
- [ ] Auto-save and session restore
- [ ] Export PNG

## �� Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical documentation and API reference
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Project status and statistics

## 🛠️ Tech Stack

- **JavaScript** - Vanilla ES6+, no frameworks
- **CSS** - Custom styling with CSS variables
- **Canvas API** - For PNG export
- **SVG** - For bubble rendering
- **localStorage** - For auto-save

## 🎯 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 📝 License

MIT License - feel free to use this project for commercial work!

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🐛 Known Issues

- Asset library images are placeholders (need better designs)
- Group modal needs live preview (currently static)
- Blend mode selector not yet implemented

## 🗺️ Roadmap

- [ ] Multi-select panels for grouping
- [ ] Undo/redo system
- [ ] Keyboard shortcuts
- [ ] Touch/mobile support
- [ ] Template presets
- [ ] Cloud save/sync
- [ ] Collaboration features

## 💬 Support

Need help? Open an issue on GitHub!

## 🌟 Credits

Built with ❤️ for manga creators worldwide.

---

**v4.0** - Complete refactor with modular architecture (2024)
