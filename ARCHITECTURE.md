### Overview

Screenshot Note is an Electron-based desktop app that lets you organize screenshots with descriptions, search, and import/export capabilities. It wraps a local Express server for data/file management and renders a modern UI in the renderer process.

### Components

- **Electron Main (`main.js`)**
  - Creates the app window and loads `http://localhost:3019`
  - Handles file dialogs and filesystem IPC (read/write JSON, copy images)
  - Manages application lifecycle

- **Express Server (`server.js`)**
  - Port: 3019
  - Serves static assets and the UI (`index.html`)
  - REST API for data and file operations
  - Ensures `data/` and `assets/screenshots/` exist

- **Renderer (`renderer.js`)**
  - UI logic for upload, listing, search, edit, full-screen viewer, import/export
  - Calls REST API for data persistence
  - Uses IPC to access native dialogs and to copy files into assets

### Directory Structure

```
screenshot-note/
├── package.json
├── main.js                # Electron main process
├── server.js              # Express server and REST API
├── renderer.js            # Frontend logic
├── index.html             # UI template
├── styles.css             # UI styles
├── data/                  # JSON data files
│   ├── screenshots.json   # App data (created on save)
│   └── sample JSON files  # Imported/sample datasets
└── assets/
    └── screenshots/       # Copied/uploaded image files
```

### Data Model

The app stores a list of screenshots as a JSON array:

```json
[
  {
    "filename": "screenshot-2025-01-01.png",
    "description": "Notes about this screenshot",
    "date": "2025-01-01T12:00:00.000Z",
    "path": "assets/screenshots/screenshot-2025-01-01.png"
  }
]
```

- Required: `filename`, `date`, `path`
- Optional: `description`

### REST API Endpoints

- `GET /` → Serves `index.html`
- `GET /api/health` → Health check
- `GET /api/info` → App info
- `GET /api/screenshots` → Load current screenshots from `data/screenshots.json`
- `POST /api/screenshots` → Save screenshots array to `data/screenshots.json`
- `POST /api/upload` → Upload image files to `assets/screenshots/` (multer)
- `GET /api/data` → List available `.json` files
- `GET /api/data/:filename` → Load specified JSON file from `data/` or app root
- `POST /api/data/:filename` → Save JSON payload to `data/:filename`

### IPC Channels (Main ↔ Renderer)

- `select-image-files` → Open native file picker for images
- `select-json-file` → Open native file picker for JSON
- `save-json-file` → Open native save dialog
- `read-json-file` → Read a JSON file from disk
- `write-json-file` → Write JSON to disk
- `copy-image-to-assets` → Copy a file into `assets/screenshots/`
- `restart-app` → Relaunch the app

### Key Flows

- Upload (Drag & Drop)
  1. Renderer receives File objects
  2. For Electron-sourced paths, IPC `copy-image-to-assets` copies file to `assets/screenshots/`
  3. Renderer pushes new entry to `screenshots[]`, renders UI, and auto-saves

- Save/Load
  - Save: `POST /api/screenshots` with full `screenshots[]`
  - Load: `GET /api/screenshots` on app startup

- Import/Export
  - Import: Native open dialog → `read-json-file` → Validate → Merge → Save
  - Export: Native save dialog → `write-json-file` with current `screenshots[]`

### Security Considerations

- Directory traversal prevention for `/api/data/:filename`
- MIME/type whitelist on uploads (jpeg/png/gif/webp/bmp) with size limit
- Local-only server (localhost) with CORS enabled for the renderer

### Performance

- Debounced auto-save and search
- Lazy image rendering via `loading="lazy"`
- Minimal DOM updates by re-rendering current list

### Port & Configuration

- Default HTTP port: `3019` (defined in `server.js`)
- Data paths relative to app directory (portable)

### Future Extensions

- Cloud storage backends (S3, WebDAV)
- Tagging and advanced filters
- Batch operations and multi-select
- Packaging via `electron-builder`
