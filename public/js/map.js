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
        
        // Check if MapEngine is available
        if (typeof MapEngine === 'undefined') {
            console.error('[map] MapEngine class not found. Available classes:', {
                MapGeometry: typeof MapGeometry,
                MapManifest: typeof MapManifest,
                MapLayers: typeof MapLayers,
                MapLoader: typeof MapLoader,
                MapToggles: typeof MapToggles,
                MapEngine: typeof MapEngine
            });
            throw new Error('MapEngine class is not defined. Please check that map-engine.js is loaded.');
        }
        
        // Check if MAP_CONFIG is available
        if (typeof MAP_CONFIG === 'undefined') {
            throw new Error('MAP_CONFIG is not defined. Please check that map-constants.js is loaded.');
        }
        
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
    
    // Add observer to track sidebar class changes
    const sidebar = document.querySelector('.side-ui');
    if (sidebar) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    console.log('Sidebar class changed:', sidebar.className);
                    console.log('Collapsed state:', sidebar.classList.contains('collapsed'));
                }
            });
        });
        observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }
    
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
        const isCollapsed = sidebar.classList.contains('collapsed');
        console.log('toggleSidebar: Current collapsed state:', isCollapsed);
        sidebar.classList.toggle('collapsed');
        console.log('toggleSidebar: New collapsed state:', sidebar.classList.contains('collapsed'));
    }
}

/**
 * Show sidebar
 */
function showSidebar() {
    const sidebar = document.querySelector('.side-ui');
    if (sidebar) {
        console.log('showSidebar: Removing collapsed class');
        sidebar.classList.remove('collapsed');
        console.log('showSidebar: Sidebar collapsed state after:', sidebar.classList.contains('collapsed'));
    }
}

/**
 * Hide sidebar
 */
function hideSidebar() {
    console.log('hideSidebar called from:', new Error().stack);
    const sidebar = document.querySelector('.side-ui');
    if (sidebar) {
        console.log('hideSidebar: Adding collapsed class');
        sidebar.classList.add('collapsed');
        console.log('hideSidebar: Sidebar collapsed state after:', sidebar.classList.contains('collapsed'));
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
        
        // Wait a bit to ensure all scripts are loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize map with enhanced progress tracking
        await initializeMap();
        
        // Only proceed if initialization was successful
        if (mapEngine && mapEngine.isInitialized) {
            // Setup zoom display monitoring
            setInterval(updateZoomDisplay, 1000);
            
            // Add map click handler
            mapEngine.addEventListener('click', handleMapClick);
            
            // Initialize pins system
            initializePinsWhenReady();
            
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
    selectedPin: null,
    currentUser: null,
    isAuthenticated: false
};

// Initialize pin manager with authentication
async function initializePinManager() {
    try {
        // Check authentication status
        const response = await fetch('/api/user', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (response.ok) {
            const userData = await response.json();
            pinManager.isAuthenticated = userData.isAuthenticated;
            pinManager.currentUser = userData.user;
            
            if (pinManager.isAuthenticated) {
                await loadPins();
                updatePinUI();
            } else {
                showPinAuthRequired();
            }
        } else {
            showPinAuthRequired();
        }
    } catch (error) {
        console.error('[map.js]: Error initializing pin manager:', error);
        showPinAuthRequired();
    }
}

// Load pins from server
async function loadPins() {
    try {
        const response = await fetch('/api/pins', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            pinManager.pins = data.pins || [];
            updatePinsList();
            addPinsToMap();
        } else {
            console.error('[map.js]: Failed to load pins:', response.statusText);
        }
    } catch (error) {
        console.error('[map.js]: Error loading pins:', error);
    }
}

// Toggle add pin mode (with authentication check)
function toggleAddPinMode() {
    if (!pinManager.isAuthenticated) {
        showPinAuthRequired();
        return;
    }
    
    pinManager.addPinMode = !pinManager.addPinMode;
    const addBtn = document.querySelector('.add-pin-btn');
    
    if (pinManager.addPinMode) {
        addBtn.style.background = 'rgba(34, 197, 94, 0.2)';
        addBtn.style.borderColor = '#22C55E';
        addBtn.style.color = '#22C55E';
        addBtn.innerHTML = '<i class="fas fa-times"></i><span>Cancel</span>';
        
        // Add click listener to map for pin placement
        if (mapEngine && mapEngine.getMap()) {
            mapEngine.getMap().on('click', handleMapClickForPin);
        }
        
        console.log('Add pin mode enabled - click on the map to place a pin');
    } else {
        addBtn.style.background = '';
        addBtn.style.borderColor = '';
        addBtn.style.color = '';
        addBtn.innerHTML = '<i class="fas fa-plus"></i><span>Add Pin</span>';
        
        // Remove click listener
        if (mapEngine && mapEngine.getMap()) {
            mapEngine.getMap().off('click', handleMapClickForPin);
        }
    }
}

// Handle map click for pin placement
async function handleMapClickForPin(e) {
    if (!pinManager.addPinMode || !pinManager.isAuthenticated) return;
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Show pin creation modal
    showPinCreationModal(lat, lng);
    
    // Exit add mode
    toggleAddPinMode();
}

// Show pin creation modal
function showPinCreationModal(lat, lng) {
    const modal = document.createElement('div');
    modal.className = 'pin-creation-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create New Pin</h3>
                    <button class="modal-close" onclick="closePinModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="pin-creation-form">
                        <div class="form-group">
                            <label for="pin-name">Pin Name *</label>
                            <input type="text" id="pin-name" name="name" required maxlength="100" placeholder="Enter pin name">
                        </div>
                        <div class="form-group">
                            <label for="pin-description">Description</label>
                            <textarea id="pin-description" name="description" maxlength="500" placeholder="Enter description (optional)"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="pin-category">Category</label>
                            <select id="pin-category" name="category">
                                <option value="home">🏠 Home</option>
                                <option value="work">💼 Work</option>
                                <option value="farm">🚜 Farm</option>
                                <option value="landmark">🏛️ Landmark</option>
                                <option value="treasure">💰 Treasure</option>
                                <option value="resource">⛏️ Resource</option>
                                <option value="custom">📍 Custom</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="pin-icon">Icon</label>
                            <select id="pin-icon" name="icon">
                                <option value="fas fa-map-marker-alt">📍 Map Marker</option>
                                <option value="fas fa-home">🏠 Home</option>
                                <option value="fas fa-briefcase">💼 Work</option>
                                <option value="fas fa-seedling">🌱 Farm</option>
                                <option value="fas fa-gem">💎 Treasure</option>
                                <option value="fas fa-mountain">⛰️ Landmark</option>
                                <option value="fas fa-tools">🔧 Resource</option>
                                <option value="fas fa-star">⭐ Custom</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="pin-color">Color</label>
                            <input type="color" id="pin-color" name="color" value="#00A3DA">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="pin-public" name="isPublic" checked>
                                Make pin visible to other users
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="button" onclick="closePinModal()" class="btn-cancel">Cancel</button>
                            <button type="submit" class="btn-create">Create Pin</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('pin-creation-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createPinFromForm(lat, lng);
    });
}

// Create pin from form data
async function createPinFromForm(lat, lng) {
    try {
        const formData = new FormData(document.getElementById('pin-creation-form'));
        const pinData = {
            name: formData.get('name'),
            description: formData.get('description'),
            coordinates: { lat, lng },
            category: formData.get('category'),
            icon: formData.get('icon'),
            color: formData.get('color'),
            isPublic: formData.get('isPublic') === 'on'
        };
        
        const response = await fetch('/api/pins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(pinData)
        });
        
        if (response.ok) {
            const data = await response.json();
            pinManager.pins.push(data.pin);
            addPinToMap(data.pin);
            updatePinsList();
            closePinModal();
            console.log('Pin created successfully:', data.pin);
        } else {
            const error = await response.json();
            alert('Failed to create pin: ' + error.error);
        }
    } catch (error) {
        console.error('[map.js]: Error creating pin:', error);
        alert('Failed to create pin. Please try again.');
    }
}

// Close pin modal
function closePinModal() {
    const modal = document.querySelector('.pin-creation-modal');
    if (modal) {
        modal.remove();
    }
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
    if (!mapEngine || !mapEngine.getMap()) return;
    
    const map = mapEngine.getMap();
    const marker = L.marker([pin.coordinates.lat, pin.coordinates.lng], {
        icon: L.divIcon({
            className: 'custom-pin',
            html: `<div style="color: ${pin.color}; font-size: 20px;"><i class="${pin.icon}"></i></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 20]
        })
    });
    
    // Create popup content with proper permissions
    const canEdit = pinManager.isAuthenticated && pin.discordId === pinManager.currentUser?.discordId;
    const popupContent = `
        <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #00A3DA;">${pin.name}</h4>
            <p style="margin: 0 0 8px 0; color: #666;">Location: ${pin.gridLocation}</p>
            ${pin.description ? `<p style="margin: 0; color: #888;">${pin.description}</p>` : ''}
            <p style="margin: 4px 0; color: #999; font-size: 12px;">Created by: ${pin.creator?.username || 'Unknown'}</p>
            ${canEdit ? `
            <div style="margin-top: 10px;">
                    <button onclick="editPin('${pin._id}')" style="margin-right: 5px; padding: 4px 8px; background: #00A3DA; color: white; border: none; border-radius: 4px; cursor: pointer;">Edit</button>
                    <button onclick="deletePin('${pin._id}')" style="padding: 4px 8px; background: #EF4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
            </div>
            ` : ''}
        </div>
    `;
    
    marker.bindPopup(popupContent);
    marker.addTo(map);
    marker.pinId = pin._id;
}

// Add all pins to map
function addPinsToMap() {
    if (!mapEngine || !mapEngine.getMap()) return;
    
    // Clear existing pins
    const map = mapEngine.getMap();
    map.eachLayer(layer => {
        if (layer.pinId) {
            map.removeLayer(layer);
        }
    });
    
    // Add all pins
    pinManager.pins.forEach(pin => {
        addPinToMap(pin);
    });
}

// Update pins list in UI
function updatePinsList() {
    const pinsList = document.getElementById('pins-list');
    if (!pinsList) return;
    
    pinsList.innerHTML = '';
    
    if (pinManager.pins.length === 0) {
        pinsList.innerHTML = `
            <div class="no-pins-message">
                <i class="fas fa-map-marker-alt"></i>
                <p>No pins found</p>
                <small>Click "Add Pin" to create your first pin</small>
            </div>
        `;
        return;
    }
    
    pinManager.pins.forEach(pin => {
        const canEdit = pinManager.isAuthenticated && pin.discordId === pinManager.currentUser?.discordId;
        const pinItem = document.createElement('div');
        pinItem.className = 'pin-item';
        pinItem.innerHTML = `
            <div class="pin-icon">
                <i class="${pin.icon}" style="color: ${pin.color};"></i>
            </div>
            <div class="pin-info">
                <span class="pin-name">${pin.name}</span>
                <span class="pin-location">${pin.gridLocation}</span>
                <span class="pin-creator">by ${pin.creator?.username || 'Unknown'}</span>
            </div>
            <div class="pin-actions">
                <button class="pin-action-btn" onclick="viewPin('${pin._id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${canEdit ? `
                    <button class="pin-action-btn" onclick="editPin('${pin._id}')" title="Edit Pin">
                    <i class="fas fa-edit"></i>
                </button>
                    <button class="pin-action-btn delete" onclick="deletePin('${pin._id}')" title="Delete Pin">
                    <i class="fas fa-trash"></i>
                </button>
                ` : ''}
            </div>
        `;
        pinsList.appendChild(pinItem);
    });
}

// View pin details
function viewPin(pinId) {
    const pin = pinManager.pins.find(p => p._id === pinId);
    if (!pin) return;
    
    // Center map on pin
    if (mapEngine && mapEngine.getMap()) {
        mapEngine.getMap().setView([pin.coordinates.lat, pin.coordinates.lng], Math.max(mapEngine.getMap().getZoom(), 10));
    }
    
    console.log('Viewing pin:', pin);
}

// Edit pin
async function editPin(pinId) {
    if (!pinManager.isAuthenticated) {
        showPinAuthRequired();
        return;
    }
    
    const pin = pinManager.pins.find(p => p._id === pinId);
    if (!pin) return;
    
    // Check if user can edit this pin
    if (pin.discordId !== pinManager.currentUser?.discordId) {
        alert('You can only edit your own pins.');
        return;
    }
    
    // Show edit modal (reuse creation modal with pre-filled data)
    showPinEditModal(pin);
}

// Show pin edit modal
function showPinEditModal(pin) {
    const modal = document.createElement('div');
    modal.className = 'pin-creation-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Pin</h3>
                    <button class="modal-close" onclick="closePinModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="pin-edit-form">
                        <div class="form-group">
                            <label for="pin-name">Pin Name *</label>
                            <input type="text" id="pin-name" name="name" required maxlength="100" value="${pin.name}">
                        </div>
                        <div class="form-group">
                            <label for="pin-description">Description</label>
                            <textarea id="pin-description" name="description" maxlength="500">${pin.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="pin-category">Category</label>
                            <select id="pin-category" name="category">
                                <option value="home" ${pin.category === 'home' ? 'selected' : ''}>🏠 Home</option>
                                <option value="work" ${pin.category === 'work' ? 'selected' : ''}>💼 Work</option>
                                <option value="farm" ${pin.category === 'farm' ? 'selected' : ''}>🚜 Farm</option>
                                <option value="landmark" ${pin.category === 'landmark' ? 'selected' : ''}>🏛️ Landmark</option>
                                <option value="treasure" ${pin.category === 'treasure' ? 'selected' : ''}>💰 Treasure</option>
                                <option value="resource" ${pin.category === 'resource' ? 'selected' : ''}>⛏️ Resource</option>
                                <option value="custom" ${pin.category === 'custom' ? 'selected' : ''}>📍 Custom</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="pin-icon">Icon</label>
                            <select id="pin-icon" name="icon">
                                <option value="fas fa-map-marker-alt" ${pin.icon === 'fas fa-map-marker-alt' ? 'selected' : ''}>📍 Map Marker</option>
                                <option value="fas fa-home" ${pin.icon === 'fas fa-home' ? 'selected' : ''}>🏠 Home</option>
                                <option value="fas fa-briefcase" ${pin.icon === 'fas fa-briefcase' ? 'selected' : ''}>💼 Work</option>
                                <option value="fas fa-seedling" ${pin.icon === 'fas fa-seedling' ? 'selected' : ''}>🌱 Farm</option>
                                <option value="fas fa-gem" ${pin.icon === 'fas fa-gem' ? 'selected' : ''}>💎 Treasure</option>
                                <option value="fas fa-mountain" ${pin.icon === 'fas fa-mountain' ? 'selected' : ''}>⛰️ Landmark</option>
                                <option value="fas fa-tools" ${pin.icon === 'fas fa-tools' ? 'selected' : ''}>🔧 Resource</option>
                                <option value="fas fa-star" ${pin.icon === 'fas fa-star' ? 'selected' : ''}>⭐ Custom</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="pin-color">Color</label>
                            <input type="color" id="pin-color" name="color" value="${pin.color}">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="pin-public" name="isPublic" ${pin.isPublic ? 'checked' : ''}>
                                Make pin visible to other users
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="button" onclick="closePinModal()" class="btn-cancel">Cancel</button>
                            <button type="submit" class="btn-create">Update Pin</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('pin-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updatePinFromForm(pin._id);
    });
}

// Update pin from form data
async function updatePinFromForm(pinId) {
    try {
        const formData = new FormData(document.getElementById('pin-edit-form'));
        const pinData = {
            name: formData.get('name'),
            description: formData.get('description'),
            category: formData.get('category'),
            icon: formData.get('icon'),
            color: formData.get('color'),
            isPublic: formData.get('isPublic') === 'on'
        };
        
        const response = await fetch(`/api/pins/${pinId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(pinData)
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update pin in local array
            const pinIndex = pinManager.pins.findIndex(p => p._id === pinId);
            if (pinIndex !== -1) {
                pinManager.pins[pinIndex] = data.pin;
            }
            addPinsToMap();
        updatePinsList();
            closePinModal();
            console.log('Pin updated successfully:', data.pin);
        } else {
            const error = await response.json();
            alert('Failed to update pin: ' + error.error);
        }
    } catch (error) {
        console.error('[map.js]: Error updating pin:', error);
        alert('Failed to update pin. Please try again.');
    }
}

// Delete pin
async function deletePin(pinId) {
    if (!pinManager.isAuthenticated) {
        showPinAuthRequired();
        return;
    }
    
    const pin = pinManager.pins.find(p => p._id === pinId);
    if (!pin) return;
    
    // Check if user can delete this pin
    if (pin.discordId !== pinManager.currentUser?.discordId) {
        alert('You can only delete your own pins.');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this pin?')) return;
    
    try {
        const response = await fetch(`/api/pins/${pinId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (response.ok) {
            // Remove from local array
            const pinIndex = pinManager.pins.findIndex(p => p._id === pinId);
            if (pinIndex !== -1) {
                pinManager.pins.splice(pinIndex, 1);
            }
    
    // Remove from map
            if (mapEngine && mapEngine.getMap()) {
                const map = mapEngine.getMap();
                map.eachLayer(layer => {
            if (layer.pinId === pinId) {
                        map.removeLayer(layer);
            }
        });
    }
    
    // Update UI
    updatePinsList();
            console.log('Pin deleted successfully:', pinId);
        } else {
            const error = await response.json();
            alert('Failed to delete pin: ' + error.error);
        }
    } catch (error) {
        console.error('[map.js]: Error deleting pin:', error);
        alert('Failed to delete pin. Please try again.');
    }
}

// Toggle pin manager
function togglePinManager() {
    console.log('Pin manager toggled');
    // This could open a modal or expand the pins section
}

// Show authentication required message
function showPinAuthRequired() {
    const pinsList = document.getElementById('pins-list');
    if (pinsList) {
        pinsList.innerHTML = `
            <div class="auth-required-message">
                <i class="fas fa-lock"></i>
                <h4>Authentication Required</h4>
                <p>You must be logged in with Discord and be a verified member of our server to use pins.</p>
                <button onclick="redirectToMapLogin()" class="btn-login">
                    <i class="fab fa-discord"></i>
                    Login with Discord
                </button>
            </div>
        `;
    }
    
    // Disable pin buttons
    const addBtn = document.querySelector('.add-pin-btn');
    const manageBtn = document.querySelector('.manage-pins-btn');
    
    if (addBtn) {
        addBtn.style.opacity = '0.5';
        addBtn.style.cursor = 'not-allowed';
    }
    if (manageBtn) {
        manageBtn.style.opacity = '0.5';
        manageBtn.style.cursor = 'not-allowed';
    }
}

// Redirect to Discord auth with map return URL
function redirectToMapLogin() {
    const currentPath = window.location.pathname + window.location.hash;
    window.location.href = `/auth/discord?returnTo=${encodeURIComponent(currentPath)}`;
}

// Update pin UI based on authentication state
function updatePinUI() {
    if (!pinManager.isAuthenticated) {
        showPinAuthRequired();
        return;
    }
    
    // Enable pin buttons
    const addBtn = document.querySelector('.add-pin-btn');
    const manageBtn = document.querySelector('.manage-pins-btn');
    
    if (addBtn) {
        addBtn.style.opacity = '1';
        addBtn.style.cursor = 'pointer';
    }
    if (manageBtn) {
        manageBtn.style.opacity = '1';
        manageBtn.style.cursor = 'pointer';
    }
}

// Initialize pins when map is ready
async function initializePinsWhenReady() {
    // Wait for map engine to be ready
    if (mapEngine && mapEngine.isInitialized) {
        await initializePinManager();
    } else {
        // Wait a bit and try again
        setTimeout(initializePinsWhenReady, 1000);
    }
}