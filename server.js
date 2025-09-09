const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");

const app = express();
const PORT = 3019;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure data and assets directories exist
const DATA_DIR = path.join(__dirname, "data");
const ASSETS_DIR = path.join(__dirname, "assets");
const SCREENSHOTS_DIR = path.join(ASSETS_DIR, "screenshots");

[DATA_DIR, ASSETS_DIR, SCREENSHOTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SCREENSHOTS_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    const extension = path.extname(file.originalname);
    cb(null, `screenshot-${timestamp}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// Serve static files
app.use(express.static(__dirname));
app.use("/data", express.static(DATA_DIR));
app.use("/assets", express.static(ASSETS_DIR));

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Routes

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Get screenshot notes data
app.get("/api/screenshots", async (req, res) => {
  try {
    const screenshotsFile = path.join(DATA_DIR, "screenshots.json");
    
    if (fs.existsSync(screenshotsFile)) {
      const data = fs.readFileSync(screenshotsFile, 'utf8');
      const screenshots = JSON.parse(data);
      res.json({
        success: true,
        data: screenshots,
        count: screenshots.length
      });
    } else {
      res.json({
        success: true,
        data: [],
        count: 0
      });
    }
  } catch (error) {
    console.error("Error loading screenshots:", error);
    res.status(500).json({
      error: "Failed to load screenshots",
      details: error.message,
    });
  }
});

// Save screenshot notes data
app.post("/api/screenshots", (req, res) => {
  try {
    const screenshots = req.body;
    
    if (!Array.isArray(screenshots)) {
      return res.status(400).json({ error: "Screenshots data must be an array" });
    }

    const screenshotsFile = path.join(DATA_DIR, "screenshots.json");
    const jsonString = JSON.stringify(screenshots, null, 2);
    
    fs.writeFileSync(screenshotsFile, jsonString, 'utf8');

    res.json({
      success: true,
      message: `Saved ${screenshots.length} screenshots`,
      count: screenshots.length
    });

  } catch (error) {
    console.error("Error saving screenshots:", error);
    res.status(500).json({
      error: "Failed to save screenshots",
      details: error.message,
    });
  }
});

// Upload screenshot files
app.post("/api/upload", upload.array('screenshots', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = req.files.map(file => ({
      id: Date.now() + Math.random(),
      filename: file.filename,
      originalName: file.originalname,
      path: `assets/screenshots/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
      date: new Date().toISOString(),
      description: ""
    }));

    res.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length
    });

  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({
      error: "Failed to upload files",
      details: error.message,
    });
  }
});

// Load JSON data from file
app.get("/api/data/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security: Prevent directory traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    let filePath;
    
    // Try different locations for the JSON file
    const possiblePaths = [
      path.join(DATA_DIR, filename),
      path.join(__dirname, filename),
      path.resolve(filename) // For absolute paths
    ];

    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        filePath = tryPath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ 
        error: `JSON file not found: ${filename}`,
        searchedPaths: possiblePaths
      });
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(data);

    res.json({
      success: true,
      data: jsonData,
      filename: filename,
      path: filePath,
      size: formatFileSize(fs.statSync(filePath).size)
    });

  } catch (error) {
    console.error("Error loading JSON data:", error);
    res.status(500).json({
      error: "Failed to load JSON data",
      details: error.message,
    });
  }
});

// Save JSON data to file
app.post("/api/data/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const data = req.body;

    // Security: Prevent directory traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const filePath = path.join(DATA_DIR, filename);
    const jsonString = JSON.stringify(data, null, 2);
    
    fs.writeFileSync(filePath, jsonString, 'utf8');

    res.json({
      success: true,
      message: `Data saved to ${filename}`,
      path: filePath,
      size: formatFileSize(jsonString.length)
    });

  } catch (error) {
    console.error("Error saving JSON data:", error);
    res.status(500).json({
      error: "Failed to save JSON data",
      details: error.message,
    });
  }
});

// List available JSON files
app.get("/api/data", (req, res) => {
  try {
    const files = [];
    
    // Check data directory
    if (fs.existsSync(DATA_DIR)) {
      const dataFiles = fs.readdirSync(DATA_DIR)
        .filter(file => file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(DATA_DIR, file),
          location: 'data'
        }));
      files.push(...dataFiles);
    }

    // Check root directory for sample files
    const rootFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(__dirname, file),
        location: 'root'
      }));
    files.push(...rootFiles);

    // Add file stats
    const filesWithStats = files.map(file => {
      const stats = fs.statSync(file.path);
      return {
        ...file,
        size: formatFileSize(stats.size),
        modified: stats.mtime.toISOString()
      };
    });

    res.json({
      success: true,
      files: filesWithStats,
      total: filesWithStats.length
    });

  } catch (error) {
    console.error("Error listing JSON files:", error);
    res.status(500).json({
      error: "Failed to list JSON files",
      details: error.message,
    });
  }
});

// Get app info
app.get("/api/info", (req, res) => {
  res.json({
    name: "Screenshot Note",
    version: "1.0.0",
    description: "Personal Screenshot Wiki with Note Management",
    features: [
      "screenshot-upload",
      "description-editing", 
      "search-filtering",
      "json-import-export",
      "fullscreen-viewer",
      "drag-drop-support"
    ],
    dataDir: DATA_DIR,
    assetsDir: SCREENSHOTS_DIR,
    supportedFormats: ["jpg", "jpeg", "png", "gif", "webp", "bmp"]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Screenshot Note server running on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Screenshots directory: ${SCREENSHOTS_DIR}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully");
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully");
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
