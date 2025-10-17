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
        // Step 1: Initializing system
        updateLoadingProgress(10, 'Initializing map system...', 1);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Create map engine with config
        updateLoadingProgress(25, 'Creating map engine...', 2);
        mapEngine = new MapEngine(MAP_CONFIG);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Step 3: Initialize the engine
        updateLoadingProgress(50, 'Loading map data...', 2);
        await mapEngine.initialize('map');
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Step 4: Setup global event listeners
        updateLoadingProgress(75, 'Preparing layers...', 3);
        setupGlobalEventListeners();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Step 5: Final setup
        updateLoadingProgress(90, 'Finalizing setup...', 3);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Step 6: Complete
        updateLoadingProgress(100, 'Ready to explore!', 4);
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
            // Toggle sidebar
            toggleSidebar();
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
            // Hide sidebar
            hideSidebar();
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
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.side-ui');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

/**
 * Show sidebar
 */
function showSidebar() {
    const sidebar = document.querySelector('.side-ui');
    if (sidebar) {
        sidebar.classList.remove('collapsed');
    }
}

/**
 * Hide sidebar
 */
function hideSidebar() {
    const sidebar = document.querySelector('.side-ui');
    if (sidebar) {
        sidebar.classList.add('collapsed');
    }
}

/**
 * Zoom in
 */
function zoomIn() {
    if (mapEngine) {
        const currentZoom = mapEngine.getZoom();
        mapEngine.setZoom(currentZoom + 1);
    }
}

/**
 * Zoom out
 */
function zoomOut() {
    if (mapEngine) {
        const currentZoom = mapEngine.getZoom();
        mapEngine.setZoom(currentZoom - 1);
    }
}

/**
 * Reset zoom to default
 */
function resetZoom() {
    if (mapEngine) {
        mapEngine.setZoom(-2); // Default zoom level (medium detail)
    }
}

/**
 * Set specific zoom level
 * @param {number} zoom - Zoom level to set
 */
function setZoom(zoom) {
    if (mapEngine) {
        mapEngine.setZoom(zoom);
    }
}

/**
 * Jump to a specific village
 * @param {string} square - Square coordinates (e.g., 'H5')
 * @param {string} villageName - Name of the village
 */
function jumpToVillage(square, villageName) {
    if (mapEngine) {
        console.log(`[DEBUG] Jumping to ${villageName} at ${square}`);
        
        // Check if square is valid
        if (!mapEngine.geometry.isValidSquareId(square)) {
            console.error(`[DEBUG] Invalid square ID: ${square}`);
            return;
        }
        
        // Get bounds for debugging
        const bounds = mapEngine.geometry.getSquareBounds(square);
        console.log(`[DEBUG] Square bounds for ${square}:`, bounds);
        
        // Jump to the specific square
        jumpToSquare(square);
        
        // Set a good zoom level for village viewing
        mapEngine.setZoom(-1);
        
        console.log(`[DEBUG] Jumped to ${villageName} at ${square}`);
    }
}

/**
 * Toggle section collapse/expand
 * @param {string} sectionId - ID of the section to toggle
 */
function toggleSection(sectionId) {
    const section = document.querySelector(`.${sectionId}`);
    if (!section) return;
    
    const header = section.querySelector('.section-header');
    const content = section.querySelector('.section-content');
    const arrow = section.querySelector('.section-arrow');
    
    if (content.classList.contains('expanded')) {
        // Collapse section
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        header.classList.add('collapsed');
        arrow.style.transform = 'rotate(-90deg)';
    } else {
        // Expand section
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        header.classList.remove('collapsed');
        arrow.style.transform = 'rotate(0deg)';
    }
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
 * Update zoom level display
 */
function updateZoomDisplay() {
    if (!mapEngine || !mapEngine.isInitialized) return;
    
    const currentZoom = mapEngine.getZoom();
    
    // Update main zoom level display
    const zoomElement = document.getElementById('zoom-level');
    const viewStatusElement = document.getElementById('view-status');
    const zoomDescriptionElement = document.getElementById('zoom-description');
    
    if (zoomElement) {
        zoomElement.textContent = currentZoom;
    }
    
    
    if (viewStatusElement && zoomDescriptionElement) {
        if (currentZoom >= -1) {
            viewStatusElement.textContent = 'Maximum Detail';
            zoomDescriptionElement.textContent = 'All labels visible (A1-J12, Q1-Q4)';
        } else if (currentZoom >= -2) {
            viewStatusElement.textContent = 'High Detail';
            zoomDescriptionElement.textContent = 'Square labels visible (A1-J12)';
        } else if (currentZoom >= -3) {
            viewStatusElement.textContent = 'Medium Detail';
            zoomDescriptionElement.textContent = 'Grid visible, no labels';
        } else {
            viewStatusElement.textContent = 'Overview';
            zoomDescriptionElement.textContent = 'Full realm view';
        }
    }
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
        // Show initial loading progress
        updateLoadingProgress(0, 'Starting ROTW Map...', 1);
        
        // Initialize map with enhanced progress tracking
        await initializeMap();
        
        // Only proceed if initialization was successful
        if (mapEngine && mapEngine.isInitialized) {
            // Setup zoom display monitoring
            setInterval(updateZoomDisplay, 1000);
            
            // Add map click handler
            mapEngine.addEventListener('click', handleMapClick);
            
            // Map system ready
        } else {
            // Initialization failed, error already shown
            updateLoadingProgress(0, 'Initialization failed', 1);
        }
        
    } catch (error) {
        console.error('[map] Initialization error:', error);
        showError('Failed to initialize map: ' + error.message);
    }
});

/**
 * Update loading progress with enhanced tracking
 * @param {number} percent - Progress percentage
 * @param {string} message - Progress message
 * @param {number} step - Current loading step (1-4)
 */
function updateLoadingProgress(percent, message, step = 1) {
    const progressFill = document.getElementById('loading-progress-fill');
    const progressText = document.getElementById('loading-progress-text');
    const subtitle = document.getElementById('loading-subtitle');
    
    if (progressFill) {
        progressFill.style.width = percent + '%';
    }
    
    if (progressText) {
        progressText.textContent = percent + '%';
    }
    
    if (subtitle) {
        subtitle.textContent = message;
    }
    
    // Update loading steps
    updateLoadingSteps(step);
}

/**
 * Update loading steps visualization
 * @param {number} currentStep - Current step (1-4)
 */
function updateLoadingSteps(currentStep) {
    // Reset all steps
    for (let i = 1; i <= 4; i++) {
        const stepElement = document.getElementById(`step-${i}`);
        if (stepElement) {
            stepElement.classList.remove('active', 'completed');
        }
    }
    
    // Mark completed steps
    for (let i = 1; i < currentStep; i++) {
        const stepElement = document.getElementById(`step-${i}`);
        if (stepElement) {
            stepElement.classList.add('completed');
        }
    }
    
    // Mark current step as active
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
}

// Export global API
window.MapAPI = {
    jumpToSquare,
    fitToCanvas,
    jumpToCoordinates,
    getMapState,
    setMapToggleState,
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
        setMapToggleState
    };
}

// ============================================================================
// Pin Management Functions
// ============================================================================

// Pin management state
let pinManager = {
    pins: [],
    addPinMode: false,
    selectedPin: null
};

// Toggle add pin mode
function toggleAddPinMode() {
    pinManager.addPinMode = !pinManager.addPinMode;
    const addBtn = document.querySelector('.add-pin-btn');
    
    if (pinManager.addPinMode) {
        addBtn.style.background = 'rgba(34, 197, 94, 0.2)';
        addBtn.style.borderColor = '#22C55E';
        addBtn.style.color = '#22C55E';
        addBtn.innerHTML = '<i class="fas fa-times"></i><span>Cancel</span>';
        
        // Add click listener to map for pin placement
        if (window.map) {
            window.map.on('click', handleMapClickForPin);
        }
        
        console.log('Add pin mode enabled - click on the map to place a pin');
    } else {
        addBtn.style.background = '';
        addBtn.style.borderColor = '';
        addBtn.style.color = '';
        addBtn.innerHTML = '<i class="fas fa-plus"></i><span>Add Pin</span>';
        
        // Remove click listener
        if (window.map) {
            window.map.off('click', handleMapClickForPin);
        }
    }
}

// Handle map click for pin placement
function handleMapClickForPin(e) {
    if (!pinManager.addPinMode) return;
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Create new pin
    const newPin = {
        id: 'pin_' + Date.now(),
        name: 'New Pin',
        location: getGridCoordinates(lat, lng),
        lat: lat,
        lng: lng,
        category: 'custom',
        icon: 'fas fa-map-marker-alt',
        color: '#00A3DA',
        description: ''
    };
    
    // Add pin to map
    addPinToMap(newPin);
    
    // Add to manager
    pinManager.pins.push(newPin);
    
    // Update UI
    updatePinsList();
    
    // Exit add mode
    toggleAddPinMode();
    
    console.log('Pin added at:', newPin.location);
}

// Get grid coordinates from lat/lng
function getGridCoordinates(lat, lng) {
    // This is a simplified version - you'd need to implement proper coordinate conversion
    // based on your map's coordinate system
    const col = String.fromCharCode(65 + Math.floor((lng + 180) / 36)); // A-J
    const row = Math.floor((lat + 90) / 15) + 1; // 1-12
    return col + row;
}

// Add pin to map
function addPinToMap(pin) {
    if (!window.map) return;
    
    const marker = L.marker([pin.lat, pin.lng], {
        icon: L.divIcon({
            className: 'custom-pin',
            html: `<div style="color: ${pin.color}; font-size: 20px;"><i class="${pin.icon}"></i></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 20]
        })
    });
    
    marker.bindPopup(`
        <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #00A3DA;">${pin.name}</h4>
            <p style="margin: 0 0 8px 0; color: #666;">Location: ${pin.location}</p>
            ${pin.description ? `<p style="margin: 0; color: #888;">${pin.description}</p>` : ''}
            <div style="margin-top: 10px;">
                <button onclick="editPin('${pin.id}')" style="margin-right: 5px; padding: 4px 8px; background: #00A3DA; color: white; border: none; border-radius: 4px; cursor: pointer;">Edit</button>
                <button onclick="deletePin('${pin.id}')" style="padding: 4px 8px; background: #EF4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
            </div>
        </div>
    `);
    
    marker.addTo(window.map);
    marker.pinId = pin.id;
}

// Update pins list in UI
function updatePinsList() {
    const pinsList = document.getElementById('pins-list');
    if (!pinsList) return;
    
    pinsList.innerHTML = '';
    
    pinManager.pins.forEach(pin => {
        const pinItem = document.createElement('div');
        pinItem.className = 'pin-item';
        pinItem.innerHTML = `
            <div class="pin-icon">
                <i class="${pin.icon}" style="color: ${pin.color};"></i>
            </div>
            <div class="pin-info">
                <span class="pin-name">${pin.name}</span>
                <span class="pin-location">${pin.location}</span>
            </div>
            <div class="pin-actions">
                <button class="pin-action-btn" onclick="viewPin('${pin.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="pin-action-btn" onclick="editPin('${pin.id}')" title="Edit Pin">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="pin-action-btn delete" onclick="deletePin('${pin.id}')" title="Delete Pin">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        pinsList.appendChild(pinItem);
    });
}

// View pin details
function viewPin(pinId) {
    const pin = pinManager.pins.find(p => p.id === pinId);
    if (!pin) return;
    
    // Center map on pin
    if (window.map) {
        window.map.setView([pin.lat, pin.lng], Math.max(window.map.getZoom(), 10));
    }
    
    console.log('Viewing pin:', pin);
}

// Edit pin
function editPin(pinId) {
    const pin = pinManager.pins.find(p => p.id === pinId);
    if (!pin) return;
    
    // Simple prompt for now - you could create a modal for better UX
    const newName = prompt('Enter pin name:', pin.name);
    if (newName && newName.trim()) {
        pin.name = newName.trim();
        updatePinsList();
        console.log('Pin updated:', pin);
    }
}

// Delete pin
function deletePin(pinId) {
    if (!confirm('Are you sure you want to delete this pin?')) return;
    
    const pinIndex = pinManager.pins.findIndex(p => p.id === pinId);
    if (pinIndex === -1) return;
    
    // Remove from map
    if (window.map) {
        window.map.eachLayer(layer => {
            if (layer.pinId === pinId) {
                window.map.removeLayer(layer);
            }
        });
    }
    
    // Remove from manager
    pinManager.pins.splice(pinIndex, 1);
    
    // Update UI
    updatePinsList();
    
    console.log('Pin deleted:', pinId);
}

// Toggle pin manager
function togglePinManager() {
    console.log('Pin manager toggled');
    // This could open a modal or expand the pins section
}

// Initialize pins on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add some sample pins
    pinManager.pins = [
        {
            id: 'pin1',
            name: 'Treasure Chest',
            location: 'C7',
            lat: 0,
            lng: 0,
            category: 'treasure',
            icon: 'fas fa-map-marker-alt',
            color: '#FF6B6B',
            description: 'A hidden treasure chest'
        },
        {
            id: 'pin2',
            name: 'Camp Site',
            location: 'E5',
            lat: 0,
            lng: 0,
            category: 'landmarks',
            icon: 'fas fa-campfire',
            color: '#FF8C00',
            description: 'Safe camping spot'
        },
        {
            id: 'pin3',
            name: 'Rare Ore',
            location: 'G9',
            lat: 0,
            lng: 0,
            category: 'resources',
            icon: 'fas fa-gem',
            color: '#9370DB',
            description: 'Valuable mining location'
        }
    ];
    
    // Update pins list
    updatePinsList();
});