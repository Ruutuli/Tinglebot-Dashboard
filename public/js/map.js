/**
 * Main Map Integration - Entry point for the Leaflet image-space map system
 * Integrates all modules and provides global API
 */

// Global map engine instance
let mapEngine = null;

/**
 * Initialize the map system
 */
async function initializeMap() {
    try {
        // Initializing map system...
        
        // Create map engine with config
        mapEngine = new MapEngine(MAP_CONFIG);
        
        // Initialize the engine
        await mapEngine.initialize('map');
        
        // Setup global event listeners
        setupGlobalEventListeners();
        
        // Hide loading overlay
        hideLoadingOverlay();
        
        // Map system initialized successfully
        
    } catch (error) {
        console.error('[map] Failed to initialize map system:', error);
        showError('Failed to initialize map system: ' + error.message);
    }
}

/**
 * Setup global event listeners
 */
function setupGlobalEventListeners() {
    // Window resize handler
    window.addEventListener('resize', debounce(() => {
        if (mapEngine) {
            mapEngine.getMap().invalidateSize();
        }
    }, 250));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeydown);
    
    // Prevent context menu on map
    document.addEventListener('contextmenu', (event) => {
        if (event.target.closest('#map')) {
            event.preventDefault();
        }
    });
    
    // Global event listeners setup
}

/**
 * Handle global keyboard shortcuts
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleGlobalKeydown(event) {
    // Only handle shortcuts when not in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    const key = event.key.toLowerCase();
    
    switch (key) {
        case 'f':
            // Fit to canvas
            if (mapEngine) {
                mapEngine.fitToCanvas();
            }
            event.preventDefault();
            break;
            
        case 'r':
            // Reload viewport
            if (mapEngine) {
                mapEngine.reloadViewport();
            }
            event.preventDefault();
            break;
            
        case 't':
            // Toggle toggle UI
            if (mapEngine) {
                mapEngine.toggleToggleUI();
            }
            event.preventDefault();
            break;
            
        case 'd':
            // Debug info
            if (mapEngine && event.ctrlKey) {
                mapEngine.logDebugInfo();
                event.preventDefault();
            }
            break;
            
        case 'escape':
            // Hide toggle UI
            if (mapEngine) {
                mapEngine.setToggleUIVisible(false);
            }
            break;
    }
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('map-loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    console.error('[map] Error:', message);
    
    // Create error display
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 8px;
        border: 2px solid #ff0000;
        z-index: 10000;
        font-family: 'Segoe UI', sans-serif;
        text-align: center;
        max-width: 400px;
    `;
    
    errorDiv.innerHTML = `
        <h3>Map Loading Error</h3>
        <p>${message}</p>
        <button onclick="location.reload()" style="
            background: white;
            color: red;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        ">Reload Page</button>
    `;
    
    document.body.appendChild(errorDiv);
}

/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
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

/**
 * Jump to specific square (global API)
 * @param {string} squareId - Square ID (e.g., 'E4')
 */
function jumpToSquare(squareId) {
    if (mapEngine) {
        mapEngine.jumpToSquare(squareId);
    } else {
        console.warn('[map] Map engine not initialized');
    }
}

/**
 * Fit map to show entire canvas (global API)
 */
function fitToCanvas() {
    if (mapEngine) {
        mapEngine.fitToCanvas();
    } else {
        console.warn('[map] Map engine not initialized');
    }
}

/**
 * Jump to specific coordinates (global API)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} zoom - Zoom level (optional)
 */
function jumpToCoordinates(x, y, zoom = 3) {
    if (mapEngine) {
        mapEngine.jumpToCoordinates(x, y, zoom);
    } else {
        console.warn('[map] Map engine not initialized');
    }
}

/**
 * Get current map state (global API)
 * @returns {Object} Current map state
 */
function getMapState() {
    if (mapEngine) {
        return {
            viewport: mapEngine.getViewportBounds(),
            zoom: mapEngine.getZoom(),
            center: mapEngine.getCenter(),
            loadedSquares: mapEngine.getLoadedSquares(),
            toggleState: mapEngine.getToggleState()
        };
    }
    return null;
}

/**
 * Set toggle state (global API)
 * @param {Object} state - Toggle states to set
 */
function setMapToggleState(state) {
    if (mapEngine) {
        mapEngine.setToggleState(state);
    } else {
        console.warn('[map] Map engine not initialized');
    }
}

/**
 * Get performance metrics (global API)
 * @returns {Object} Performance metrics
 */
function getMapMetrics() {
    if (mapEngine) {
        return mapEngine.getMetrics();
    }
    return null;
}

/**
 * Update performance display
 */
function updatePerformanceDisplay() {
    if (!mapEngine || !mapEngine.isInitialized) return;
    
    const metrics = mapEngine.getMetrics();
    if (!metrics) return;
    
    const modules = mapEngine.getModules();
    if (!modules || !modules.loader) return;
    
    const loaderStats = modules.loader.getStats();
    
    // Update performance metrics display
    const elements = {
        'load-time': metrics.uptimeFormatted,
        'render-time': metrics.performance.averageLoadTime + 'ms',
        'loaded-squares': loaderStats.loadedSquares,
        'cache-size': loaderStats.cacheSize,
        'images-loaded': metrics.counts.imagesLoaded,
        'image-load-time': metrics.performance.averageLoadTime + 'ms'
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    // Update zoom level display
    const zoomElement = document.getElementById('zoom-level');
    const viewStatusElement = document.getElementById('view-status');
    const zoomDescriptionElement = document.getElementById('zoom-description');
    
    if (zoomElement) {
        zoomElement.textContent = mapEngine.getZoom();
    }
    
    if (viewStatusElement && zoomDescriptionElement) {
        const zoom = mapEngine.getZoom();
        if (zoom >= 5) {
            viewStatusElement.textContent = 'Maximum Detail';
            zoomDescriptionElement.textContent = 'All labels visible (A1-J12, Q1-Q4)';
        } else if (zoom >= 3) {
            viewStatusElement.textContent = 'High Detail';
            zoomDescriptionElement.textContent = 'Square labels visible (A1-J12)';
        } else if (zoom >= 1) {
            viewStatusElement.textContent = 'Medium Detail';
            zoomDescriptionElement.textContent = 'Grid visible, no labels';
        } else {
            viewStatusElement.textContent = 'Overview';
            zoomDescriptionElement.textContent = 'Full realm view';
        }
    }
}

/**
 * Start performance monitoring
 */
function startPerformanceMonitoring() {
    // Update performance display every 2 seconds
    setInterval(updatePerformanceDisplay, 2000);
    
    // Initial update
    updatePerformanceDisplay();
}

/**
 * Handle map click events
 * @param {Event} event - Click event
 */
function handleMapClick(event) {
    if (!mapEngine) return;
    
    const latlng = event.latlng;
    const hitTest = mapEngine.hitTest(latlng.lng, latlng.lat);
    
    if (hitTest.square) {
        // Clicked square
        
        if (hitTest.quadrant) {
            // Clicked quadrant
        }
        
        // You can add custom click handling here
        // For example, show square information or jump to it
    }
}

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Show loading progress
        updateLoadingProgress(0, 'Initializing map system...');
        
        // Initialize map
        await initializeMap();
        
        // Only proceed if initialization was successful
        if (mapEngine && mapEngine.isInitialized) {
            // Setup performance monitoring
            startPerformanceMonitoring();
            
            // Add map click handler
            mapEngine.addEventListener('click', handleMapClick);
            
            // Update loading progress
            updateLoadingProgress(100, 'Map system ready!');
            
            // Map system ready
        } else {
            // Initialization failed, error already shown
            updateLoadingProgress(0, 'Initialization failed');
        }
        
    } catch (error) {
        console.error('[map] Initialization error:', error);
        showError('Failed to initialize map: ' + error.message);
    }
});

/**
 * Update loading progress
 * @param {number} percent - Progress percentage
 * @param {string} message - Progress message
 */
function updateLoadingProgress(percent, message) {
    const progressFill = document.querySelector('.loading-progress-fill');
    const progressText = document.querySelector('.loading-progress-text');
    const subtitle = document.querySelector('.map-loading-subtitle');
    
    if (progressFill) {
        progressFill.style.width = percent + '%';
    }
    
    if (progressText) {
        progressText.textContent = percent + '%';
    }
    
    if (subtitle) {
        subtitle.textContent = message;
    }
}

// Export global API
window.MapAPI = {
    jumpToSquare,
    fitToCanvas,
    jumpToCoordinates,
    getMapState,
    setMapToggleState,
    getMapMetrics,
    getMapEngine: () => mapEngine
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeMap,
        jumpToSquare,
    fitToCanvas,
        jumpToCoordinates,
        getMapState,
        setMapToggleState,
        getMapMetrics
    };
}
