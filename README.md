# Screenshot Note - My Personal Wiki

An Electron-based desktop application for managing screenshots with descriptions and notes. Transform your screenshots into a searchable personal wiki with drag-and-drop functionality, rich text descriptions, and powerful search capabilities.

![Screenshot Note App](assets/app-preview.png)

## Features

- 📷 **Drag & Drop Upload**: Simply drag screenshots into the app or click to select files
- 📝 **Rich Descriptions**: Add detailed notes and descriptions to each screenshot
- 🔍 **Powerful Search**: Find screenshots by filename or description content
- 📁 **Import/Export**: Load data from JSON files or export your collection
- 🖼️ **Full Screen Viewer**: View images in full screen with zoom and pan controls
- 💾 **Auto Save**: Your data is automatically saved as you make changes
- 📊 **Sample Data**: Includes sample JSON files to get you started

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Setup

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd screenshot-note
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the application:
   ```bash
   npm start
   ```

For development mode with debugging:
```bash
npm run dev
```

## Usage

### Adding Screenshots

1. **Drag & Drop**: Simply drag image files from your file explorer into the upload area
2. **Click to Select**: Click on the upload area to open a file dialog
3. **Keyboard Shortcut**: Use the "Add Images" button in the management section

Supported formats: JPG, PNG, GIF, WebP, BMP (max 10MB per file)

### Managing Screenshots

- **Add Descriptions**: Click in the description area below each image to add notes
- **Search**: Use the search box to filter screenshots by description or filename
- **Full Screen**: Click on any image to view it in full screen mode
- **Remove**: Hover over an image and click the trash icon to delete it
- **Download**: Use the download icon to save an image to your computer

### Import/Export Data

#### Import from JSON
1. Click "Settings" in the management section
2. Click "Browse JSON Files" to import data from existing JSON files
3. Select a JSON file with the correct format (see sample files in `/data/`)

#### Export to JSON
1. Click the "Export" button in the controls
2. Choose a location to save your screenshot data
3. The exported file can be imported into other instances of the app

### Sample Data

The app includes three sample JSON files in the `/data/` directory:
- `screenshot-notes-2025-08-22.json` - General screenshots
- `screenshot-notes-kimicc-01.json` - Development-related screenshots  
- `screenshot-notes-zed-01.json` - Editor-related screenshots

Load sample data by clicking "Settings" → "Load Sample Data"

## JSON Data Format

The app uses a simple JSON array format for storing screenshot data:

```json
[
  {
    "filename": "screenshot-2025-01-01.png",
    "description": "Description of the screenshot",
    "date": "2025-01-01T12:00:00.000Z",
    "path": "assets/screenshots/screenshot-2025-01-01.png"
  }
]
```

### Required Fields
- `filename`: Original or generated filename
- `date`: ISO date string when the screenshot was added
- `path`: Relative path to the image file

### Optional Fields  
- `description`: Text description or notes about the screenshot

## File Structure

```
screenshot-note/
├── package.json          # Dependencies and scripts
├── main.js               # Electron main process
├── server.js             # Express server for API
├── renderer.js           # Frontend application logic
├── index.html            # Main UI template
├── styles.css            # Application styling
├── README.md             # This file
├── data/                 # JSON data files
│   ├── screenshots.json  # Main data file (auto-created)
│   └── *.json           # Sample and imported files
└── assets/              # Application assets
    └── screenshots/     # Uploaded screenshot files
```

## Development

### Architecture

The app uses a three-tier architecture:

1. **Main Process** (`main.js`): Handles window management, file dialogs, and system integration
2. **Express Server** (`server.js`): Provides REST API for data management and file operations
3. **Renderer Process** (`renderer.js`): Manages the user interface and client-side functionality

### API Endpoints

- `GET /api/screenshots` - Load all screenshots data
- `POST /api/screenshots` - Save screenshots data
- `POST /api/upload` - Upload image files
- `GET /api/data/:filename` - Load specific JSON file
- `POST /api/data/:filename` - Save JSON data to file
- `GET /api/data` - List available JSON files
- `GET /api/info` - Get application information

### Build for Distribution

To create distributable packages:

```bash
npm install electron-builder --save-dev
npm run build
```

This will create platform-specific packages in the `dist/` directory.

## Keyboard Shortcuts

### Full Screen Viewer
- `Escape` - Close full screen viewer
- `+` or `=` - Zoom in
- `-` or `_` - Zoom out  
- `0` - Reset zoom to 100%
- Mouse wheel - Zoom in/out
- Click and drag - Pan when zoomed in

### General
- Drag and drop images anywhere in the app to add them

## Troubleshooting

### Common Issues

**Port Already in Use**
If you get a port conflict error, the Express server (port 3019) might already be running. Close any other instances of the app or change the port in `server.js`.

**Images Not Loading**
Check that image files exist in the `assets/screenshots/` directory and that paths in the JSON data are correct.

**Import Issues**  
Ensure JSON files follow the correct format. Use the diagnostic function (Settings → Diagnose Data) to check for issues.

**Performance with Many Images**
For better performance with large collections:
- Keep individual image files under 5MB
- Consider organizing data into multiple JSON files
- Use the search function to filter large collections

### Debug Mode

Run in development mode to access Chrome DevTools:
```bash
npm run dev
```

Press F12 or Ctrl+Shift+I to open developer tools.

## License

MIT License - feel free to modify and distribute as needed.

## Contributing

This is a personal tool, but suggestions and improvements are welcome! Key areas for enhancement:

- Additional export formats (HTML, PDF)
- Better image organization (folders, tags)
- Integration with cloud storage
- Improved search with filters
- Batch operations for multiple images

---

**Version**: 1.0.0  
**Last Updated**: September 2025
