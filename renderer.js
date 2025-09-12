// Renderer process for Screenshot Note app
const { ipcRenderer } = require('electron');

// Global variables
let screenshots = [];
let filteredScreenshots = [];
let currentScale = 1;
let isDragging = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeScreenshotNote();
});

function initializeScreenshotNote() {
    updateDate();
    loadScreenshots();
    setupEventListeners();
}

function updateDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);
}

function setupEventListeners() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('dragleave', handleDragLeave);

    // File input
    fileInput.addEventListener('change', handleFileSelect);

    // Auto-save on changes
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('image-description')) {
            autoSave();
        }
    });

    // Modal event listeners
    setupModalEventListeners();

    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(filterImages, 300));
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
    // Clear the input so the same file can be selected again
    e.target.value = '';
}

async function processFiles(files) {
    const imageFiles = files.filter(file => 
        file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    );
    
    if (imageFiles.length === 0) {
        showStatus('Please select valid image files (max 10MB)', 'error');
        return;
    }

    showLoadingState();
    
    try {
        // For Electron, we need to copy files to assets folder
        for (const file of imageFiles) {
            await addScreenshotFromFile(file);
        }
        
        showStatus(`Added ${imageFiles.length} screenshot(s)`, 'success');
    } catch (error) {
        console.error('Error processing files:', error);
        showStatus('Error processing files: ' + error.message, 'error');
    } finally {
        hideLoadingState();
    }
}

async function addScreenshotFromFile(file) {
    try {
        // Create a unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = file.name.split('.').pop();
        const filename = `screenshot-${timestamp}.${extension}`;
        
        // Copy file to assets directory using IPC
        const result = await ipcRenderer.invoke('copy-image-to-assets', file.path, filename);
        
        if (result.success) {
            const screenshot = {
                id: Date.now() + Math.random(),
                filename: filename,
                description: '',
                date: new Date().toISOString(),
                path: result.path
            };

            screenshots.unshift(screenshot);
            renderGallery();
            updateScreenshotCount();
        }
    } catch (error) {
        console.error('Error adding screenshot:', error);
        throw error;
    }
}

async function loadScreenshots() {
    showLoadingState();
    
    try {
        const response = await fetch('/api/screenshots');
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                screenshots = result.data || [];
                filteredScreenshots = [];
                renderGallery();
                updateScreenshotCount();
            }
        }
    } catch (error) {
        console.warn('Failed to load screenshots:', error);
        screenshots = [];
    } finally {
        hideLoadingState();
    }
}

function renderGallery() {
    const gallery = document.getElementById('gallery');
    const imagesToShow = filteredScreenshots.length > 0 ? filteredScreenshots : screenshots;

    if (imagesToShow.length === 0) {
        gallery.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <h3>No screenshots yet</h3>
                <p>Start by dropping some screenshots above</p>
            </div>
        `;
        return;
    }

    gallery.innerHTML = imagesToShow.map(screenshot => `
        <div class="image-card" data-id="${screenshot.id}">
            <div class="image-wrapper">
                <img class="screenshot-image" 
                     src="${screenshot.path}" 
                     alt="${screenshot.filename}" 
                     onclick="openModal('${screenshot.path}', '${screenshot.filename}')"
                     loading="lazy">
                <div class="image-overlay">
                    <button class="overlay-btn" onclick="removeScreenshot(${screenshot.id})" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="overlay-btn" onclick="downloadScreenshot(${screenshot.id})" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
            <div class="image-info">
                <div class="image-date">${formatDate(screenshot.date)}</div>
                <textarea class="image-description" 
                         placeholder="Add description..." 
                         oninput="updateDescription(${screenshot.id}, this.value)">${screenshot.description}</textarea>
            </div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateDescription(id, description) {
    const screenshot = screenshots.find(s => s.id === id);
    if (screenshot) {
        screenshot.description = description;
        autoSave();
    }
}

function updateScreenshotCount() {
    const countElement = document.getElementById('screenshot-count');
    if (countElement) {
        countElement.textContent = screenshots.length;
    }
}

async function removeScreenshot(id) {
    if (confirm('Are you sure you want to remove this screenshot?')) {
        screenshots = screenshots.filter(s => s.id !== id);
        renderGallery();
        updateScreenshotCount();
        await saveScreenshots();
        showStatus('Screenshot removed', 'success');
    }
}

function downloadScreenshot(id) {
    const screenshot = screenshots.find(s => s.id === id);
    if (screenshot) {
        const a = document.createElement('a');
        a.href = screenshot.path;
        a.download = screenshot.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

function filterImages() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredScreenshots = [];
    } else {
        filteredScreenshots = screenshots.filter(screenshot =>
            screenshot.description.toLowerCase().includes(searchTerm) ||
            screenshot.filename.toLowerCase().includes(searchTerm)
        );
    }
    
    renderGallery();
}

async function saveAll() {
    await saveScreenshots();
    showStatus('All screenshots saved', 'success');
}

async function saveScreenshots() {
    try {
        const response = await fetch('/api/screenshots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(screenshots),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error saving screenshots:', error);
        showStatus('Failed to save screenshots', 'error');
    }
}

function autoSave() {
    // Debounced auto-save
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(saveScreenshots, 1000);
}

function clearAll() {
    if (confirm('Are you sure you want to clear all screenshots? This cannot be undone.')) {
        screenshots = [];
        filteredScreenshots = [];
        renderGallery();
        updateScreenshotCount();
        saveScreenshots();
        showStatus('All screenshots cleared', 'success');
    }
}

async function exportAll() {
    if (screenshots.length === 0) {
        showStatus('No screenshots to export', 'error');
        return;
    }

    try {
        const result = await ipcRenderer.invoke('save-json-file');
        if (!result.canceled && result.filePath) {
            const exportData = screenshots.map(screenshot => ({
                filename: screenshot.filename,
                description: screenshot.description,
                date: screenshot.date,
                path: screenshot.path
            }));

            await ipcRenderer.invoke('write-json-file', result.filePath, exportData);
            showStatus(`Exported ${screenshots.length} screenshots to ${result.filePath}`, 'success');
        }
    } catch (error) {
        console.error('Error exporting:', error);
        showStatus('Failed to export screenshots: ' + error.message, 'error');
    }
}

async function importAll() {
    try {
        const result = await ipcRenderer.invoke('select-json-file');
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const data = await ipcRenderer.invoke('read-json-file', filePath);
            
            if (Array.isArray(data)) {
                const validScreenshots = data.filter(item => 
                    item.filename && item.path
                );
                
                if (validScreenshots.length === 0) {
                    showStatus('No valid screenshot entries found', 'error');
                    return;
                }
                
                // Add new screenshots, avoiding duplicates
                let addedCount = 0;
                validScreenshots.forEach(item => {
                    const exists = screenshots.some(s => s.filename === item.filename);
                    if (!exists) {
                        const newScreenshot = {
                            id: Date.now() + Math.random() + addedCount,
                            filename: item.filename,
                            description: item.description || '',
                            date: item.date || new Date().toISOString(),
                            path: item.path
                        };
                        screenshots.unshift(newScreenshot);
                        addedCount++;
                    }
                });
                
                if (addedCount > 0) {
                    renderGallery();
                    updateScreenshotCount();
                    await saveScreenshots();
                    showStatus(`Successfully imported ${addedCount} screenshot${addedCount > 1 ? 's' : ''}`, 'success');
                } else {
                    showStatus('All screenshots already exist', 'info');
                }
            } else {
                showStatus('Invalid JSON format. Expected an array of screenshots.', 'error');
            }
        }
    } catch (error) {
        console.error('Error importing:', error);
        showStatus('Failed to import screenshots: ' + error.message, 'error');
    }
}

// Modal functionality
function openModal(imageSrc, title) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    modalImage.src = imageSrc;
    modalImage.alt = title;
    
    resetZoom();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('image-modal').style.display = 'none';
    document.body.style.overflow = '';
}

function zoomIn() {
    currentScale = Math.min(currentScale * 1.2, 5);
    updateTransform();
    showZoomIndicator();
}

function zoomOut() {
    currentScale = Math.max(currentScale / 1.2, 0.1);
    updateTransform();
    showZoomIndicator();
}

function resetZoom() {
    currentScale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
    showZoomIndicator();
}

function updateTransform() {
    const image = document.getElementById('modal-image');
    image.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
}

function showZoomIndicator() {
    const indicator = document.getElementById('zoom-indicator');
    indicator.textContent = `${Math.round(currentScale * 100)}%`;
    indicator.classList.add('show');
    
    clearTimeout(window.zoomTimeout);
    window.zoomTimeout = setTimeout(() => {
        indicator.classList.remove('show');
    }, 1500);
}

function setupModalEventListeners() {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');

    // Mouse wheel zoom
    modal.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        currentScale = Math.max(0.1, Math.min(currentScale * delta, 5));
        updateTransform();
        showZoomIndicator();
    });

    // Mouse drag functionality
    modalImage.addEventListener('mousedown', (e) => {
        if (currentScale > 1) {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            modal.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        modal.style.cursor = 'grab';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (modal.style.display === 'flex') {
            switch(e.key) {
                case 'Escape':
                    closeModal();
                    break;
                case '+':
                case '=':
                    zoomIn();
                    break;
                case '-':
                case '_':
                    zoomOut();
                    break;
                case '0':
                    resetZoom();
                    break;
            }
        }
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Settings and management functions
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    updateScreenshotCount();
}

async function browseForJsonFile() {
    await importAll();
}

async function loadSampleData() {
    try {
        // Load one of the sample JSON files
        const response = await fetch('/api/data/screenshot-notes-2025-08-22.json');
        if (response.ok) {
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                screenshots = result.data.map((item, index) => ({
                    id: Date.now() + index,
                    filename: item.filename,
                    description: item.description || '',
                    date: item.date || new Date().toISOString(),
                    path: item.path
                }));
                
                filteredScreenshots = [];
                renderGallery();
                updateScreenshotCount();
                await saveScreenshots();
                showStatus(`Loaded ${screenshots.length} sample screenshots`, 'success');
            }
        }
    } catch (error) {
        console.error('Error loading sample data:', error);
        showStatus('Failed to load sample data: ' + error.message, 'error');
    }
}

async function exportToFile() {
    await exportAll();
}

function clearAllData() {
    clearAll();
}

function refreshGallery() {
    loadScreenshots();
}

async function selectAndUploadImages() {
    try {
        const result = await ipcRenderer.invoke('select-image-files');
        if (!result.canceled && result.filePaths.length > 0) {
            showLoadingState();
            
            for (const filePath of result.filePaths) {
                const file = { 
                    path: filePath, 
                    name: filePath.split(/[/\\]/).pop() 
                };
                await addScreenshotFromFile(file);
            }
            
            showStatus(`Added ${result.filePaths.length} screenshot(s)`, 'success');
        }
    } catch (error) {
        console.error('Error selecting images:', error);
        showStatus('Failed to add images: ' + error.message, 'error');
    } finally {
        hideLoadingState();
    }
}

async function diagnoseData() {
    console.log('=== Screenshot Note Diagnostic ===');
    console.log('Screenshots count:', screenshots.length);
    console.log('Filtered screenshots count:', filteredScreenshots.length);
    console.log('Screenshots data:', screenshots);
    
    try {
        const response = await fetch('/api/info');
        if (response.ok) {
            const info = await response.json();
            console.log('Server info:', info);
            showStatus(`Diagnostic complete. ${screenshots.length} screenshots loaded.`, 'success');
        }
    } catch (error) {
        console.error('Diagnostic error:', error);
        showStatus('Diagnostic failed: ' + error.message, 'error');
    }
}

// Utility functions
function showLoadingState() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoadingState() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message status-${type}`;
    statusEl.style.display = 'flex';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 4000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
