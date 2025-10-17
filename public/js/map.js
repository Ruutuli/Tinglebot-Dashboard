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
                initializeSearch();
            } else {
                showPinAuthRequired();
                initializeSearch();
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
    const mapContainer = document.getElementById('map');
    
    if (pinManager.addPinMode) {
        // Update button appearance
        addBtn.style.background = 'rgba(34, 197, 94, 0.2)';
        addBtn.style.borderColor = '#22C55E';
        addBtn.style.color = '#22C55E';
        addBtn.innerHTML = '<i class="fas fa-times"></i><span>Cancel</span>';
        
        // Change cursor to indicate pin placement mode
        mapContainer.classList.add('pin-placement-mode');
        
        // Add click listener to map for pin placement
        if (mapEngine && mapEngine.getMap()) {
            mapEngine.getMap().on('click', handleMapClickForPin);
        }
        
        // Show instruction tooltip
        showPinPlacementTooltip();
        
        console.log('Add pin mode enabled - click on the map to place a pin');
    } else {
        // Reset button appearance
        addBtn.style.background = '';
        addBtn.style.borderColor = '';
        addBtn.style.color = '';
        addBtn.innerHTML = '<i class="fas fa-plus"></i><span>Add Pin</span>';
        
        // Reset cursor
        mapContainer.classList.remove('pin-placement-mode');
        
        // Remove click listener
        if (mapEngine && mapEngine.getMap()) {
            mapEngine.getMap().off('click', handleMapClickForPin);
        }
        
        // Hide instruction tooltip
        hidePinPlacementTooltip();
    }
}

// Handle map click for pin placement
async function handleMapClickForPin(e) {
    if (!pinManager.addPinMode || !pinManager.isAuthenticated) return;
    
    // Get proper coordinates using hitTest
    const hitTest = mapEngine.hitTest(e.latlng.lng, e.latlng.lat);
    const lat = hitTest.coordinates.y;  // Y coordinate in map system
    const lng = hitTest.coordinates.x;  // X coordinate in map system
    
    // Hide instruction tooltip
    hidePinPlacementTooltip();
    
    // Show pin creation modal
    showPinCreationModal(lat, lng);
    
    // Exit add mode
    toggleAddPinMode();
}

// Show pin placement instruction tooltip
function showPinPlacementTooltip() {
    // Remove any existing tooltip
    hidePinPlacementTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.id = 'pin-placement-tooltip';
    tooltip.className = 'pin-placement-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-content">
            <div class="tooltip-icon">
                <i class="fas fa-map-pin"></i>
            </div>
            <div class="tooltip-text">
                <strong>Pin Placement Mode</strong>
                <span>Click anywhere on the map to place a pin</span>
            </div>
            <button class="tooltip-close" onclick="toggleAddPinMode()" title="Cancel">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(tooltip);
    
    // Show tooltip with animation
    setTimeout(() => {
        tooltip.classList.add('show');
    }, 100);
}

// Hide pin placement instruction tooltip
function hidePinPlacementTooltip() {
    const tooltip = document.getElementById('pin-placement-tooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
        setTimeout(() => {
            tooltip.remove();
        }, 300);
    }
}

// Show pin creation modal
function showPinCreationModal(lat, lng) {
    const modal = document.createElement('div');
    modal.className = 'pin-creation-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closePinModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="header-left">
                        <div class="pin-icon-preview">
                            <i class="fas fa-map-marker-alt" id="preview-icon"></i>
                        </div>
                        <div class="header-text">
                            <h3>Create New Pin</h3>
                            <div class="coordinate-info">
                                <i class="fas fa-crosshairs"></i>
                                <span>Location: ${lat.toFixed(2)}, ${lng.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    <button class="modal-close" onclick="closePinModal()" title="Close (Esc)" aria-label="Close modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="pin-creation-form" novalidate>
                        <div class="form-section">
                            <h4 class="section-title">
                                <i class="fas fa-info-circle"></i>
                                Basic Information
                            </h4>
                            <div class="form-group">
                                <label for="pin-name">
                                    Pin Name <span class="required">*</span>
                                    <span class="char-count" id="name-count">0/100</span>
                                </label>
                                <input type="text" id="pin-name" name="name" required maxlength="100" 
                                       placeholder="Enter a descriptive name for this location" autocomplete="off">
                                <div class="field-error" id="name-error"></div>
                            </div>
                            <div class="form-group">
                                <label for="pin-description">
                                    Description
                                    <span class="char-count" id="desc-count">0/500</span>
                                </label>
                                <textarea id="pin-description" name="description" maxlength="500" 
                                          placeholder="Add details about this location (optional)" rows="3"></textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h4 class="section-title">
                                <i class="fas fa-tags"></i>
                                Appearance
                            </h4>
                            <div class="appearance-grid">
                                <div class="form-group category-group">
                                    <label for="pin-category">Category</label>
                                    <div class="category-selector">
                                        <div class="category-option selected" data-category="homes" data-icon="fas fa-home">
                                            <input type="radio" name="category" value="homes" checked style="display: none;">
                                            <i class="fas fa-home"></i>
                                            <span>Homes</span>
                                        </div>
                                        <div class="category-option" data-category="farms" data-icon="fas fa-seedling">
                                            <input type="radio" name="category" value="farms" style="display: none;">
                                            <i class="fas fa-seedling"></i>
                                            <span>Farms</span>
                                        </div>
                                        <div class="category-option" data-category="shops" data-icon="fas fa-store">
                                            <input type="radio" name="category" value="shops" style="display: none;">
                                            <i class="fas fa-store"></i>
                                            <span>Shops</span>
                                        </div>
                                        <div class="category-option" data-category="points-of-interest" data-icon="fas fa-star">
                                            <input type="radio" name="category" value="points-of-interest" style="display: none;">
                                            <i class="fas fa-star"></i>
                                            <span>Points of Interest</span>
                                        </div>
                                    </div>
                                </div>
                                
                            </div>
                        </div>


                        <div class="form-actions">
                            <button type="button" onclick="closePinModal()" class="btn-cancel">
                                <i class="fas fa-times"></i>
                                Cancel
                            </button>
                            <button type="submit" class="btn-create" id="create-btn">
                                <i class="fas fa-plus"></i>
                                Create Pin
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup form interactions
    setupPinFormInteractions();
    
    // Handle form submission
    document.getElementById('pin-creation-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createPinFromForm(lat, lng);
    });
    
    // Focus on name input
    setTimeout(() => {
        document.getElementById('pin-name').focus();
    }, 100);
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', handlePinModalKeyboard);
}

// Get default color for pin category
function getDefaultColorForCategory(category) {
    const colorMap = {
        'homes': '#FFD700',      // Gold
        'farms': '#22C55E',      // Green
        'shops': '#FF8C00',      // Orange
        'points-of-interest': '#FF69B4'  // Pink
    };
    return colorMap[category] || '#00A3DA'; // Default blue if category not found
}

// Create pin from form data
async function createPinFromForm(lat, lng) {
    try {
        const form = document.getElementById('pin-creation-form');
        const formData = new FormData(form);
        const previewIcon = document.getElementById('preview-icon');
        
        // Get the selected category and its corresponding icon
        const selectedCategory = formData.get('category');
        const categoryOption = document.querySelector(`.pin-creation-modal [data-category="${selectedCategory}"]`);
        const iconClass = categoryOption ? categoryOption.dataset.icon : 'fas fa-home';
        
        console.log('Selected category:', selectedCategory);
        console.log('Category option found:', categoryOption);
        console.log('Icon class:', iconClass);
        
        // Get default color based on category
        const defaultColor = getDefaultColorForCategory(selectedCategory);
        
        const pinData = {
            name: formData.get('name').trim(),
            description: formData.get('description').trim(),
            coordinates: { lat, lng },
            category: selectedCategory,
            icon: iconClass,
            color: defaultColor,
            isPublic: true
        };
        
        // Show loading state
        const createBtn = document.getElementById('create-btn');
        const originalText = createBtn.innerHTML;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        createBtn.disabled = true;
        
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
            
            // Show success message
            showPinSuccessMessage(data.pin.name);
            
            closePinModal();
            console.log('Pin created successfully:', data.pin);
        } else {
            const error = await response.json();
            showPinErrorMessage('Failed to create pin: ' + error.error);
            
            // Restore button state
            createBtn.innerHTML = originalText;
            createBtn.disabled = false;
        }
    } catch (error) {
        console.error('[map.js]: Error creating pin:', error);
        showPinErrorMessage('Failed to create pin. Please try again.');
        
        // Restore button state
        const createBtn = document.getElementById('create-btn');
        createBtn.innerHTML = '<i class="fas fa-plus"></i> Create Pin';
        createBtn.disabled = false;
    }
}

// Show success message for pin creation
function showPinSuccessMessage(pinName) {
    const notification = document.createElement('div');
    notification.className = 'pin-notification success';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-check-circle"></i>
            <span>Pin "${pinName}" created successfully!</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Show error message for pin creation
function showPinErrorMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'pin-notification error';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Setup form interactions for enhanced modal
function setupPinFormInteractions() {
    const nameInput = document.getElementById('pin-name');
    const descInput = document.getElementById('pin-description');
    const previewIcon = document.getElementById('preview-icon');
    const createBtn = document.getElementById('create-btn');
    
    // Character counters
    nameInput.addEventListener('input', () => {
        const count = nameInput.value.length;
        document.getElementById('name-count').textContent = `${count}/100`;
        validateName();
    });
    
    descInput.addEventListener('input', () => {
        const count = descInput.value.length;
        document.getElementById('desc-count').textContent = `${count}/500`;
    });
    
    
    // Category selection
    document.querySelectorAll('.category-option').forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            document.querySelectorAll('.category-option').forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            option.classList.add('selected');
            
            // Update preview icon
            const icon = option.dataset.icon;
            previewIcon.className = icon;
            
            // Update the hidden radio button value
            const radioInput = option.querySelector('input[type="radio"]');
            if (radioInput) {
                radioInput.checked = true;
                
                // Update color based on category
                const category = radioInput.value;
                const defaultColor = getDefaultColorForCategory(category);
                previewIcon.style.color = defaultColor;
            }
        });
    });
    
    // Form validation
    function validateName() {
        const name = nameInput.value.trim();
        const errorDiv = document.getElementById('name-error');
        
        if (name.length === 0) {
            errorDiv.textContent = 'Pin name is required';
            nameInput.classList.add('error');
            createBtn.disabled = true;
        } else if (name.length < 2) {
            errorDiv.textContent = 'Pin name must be at least 2 characters';
            nameInput.classList.add('error');
            createBtn.disabled = true;
        } else {
            errorDiv.textContent = '';
            nameInput.classList.remove('error');
            createBtn.disabled = false;
        }
    }
    
    // Initial validation
    validateName();
}

// Handle keyboard shortcuts for pin modal
function handlePinModalKeyboard(e) {
    if (!document.querySelector('.pin-creation-modal')) return;
    
    switch (e.key) {
        case 'Escape':
            e.preventDefault();
            closePinModal();
            break;
        case 'Enter':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const form = document.getElementById('pin-creation-form');
                if (form && !document.getElementById('create-btn').disabled) {
                    form.dispatchEvent(new Event('submit'));
                }
            }
            break;
    }
}

// Close pin modal
function closePinModal() {
    const modal = document.querySelector('.pin-creation-modal');
    if (modal) {
        // Remove keyboard event listener
        document.removeEventListener('keydown', handlePinModalKeyboard);
        
        // Add closing animation
        modal.classList.add('closing');
        setTimeout(() => {
            modal.remove();
        }, 200);
    }
}

// Show delete confirmation modal
function showDeleteConfirmationModal(pinName) {
    console.log('showDeleteConfirmationModal called with pinName:', pinName);
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'delete-confirmation-modal';
        console.log('Creating delete modal with class:', modal.className);
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeDeleteModal(false)">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <div class="header-left">
                            <div class="pin-icon-preview">
                                <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
                            </div>
                            <div class="header-text">
                                <h3>Delete Pin</h3>
                                <div class="coordinate-info">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>Confirm deletion</span>
                                </div>
                            </div>
                        </div>
                        <button class="modal-close" onclick="closeDeleteModal(false)" title="Close (Esc)" aria-label="Close modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="delete-warning">
                            <p>Are you sure you want to delete the pin <strong>"${pinName}"</strong>?</p>
                            <p class="warning-text">This action cannot be undone.</p>
                        </div>
                        <div class="form-actions">
                            <button type="button" onclick="closeDeleteModal(false)" class="btn-cancel">Cancel</button>
                            <button type="button" onclick="closeDeleteModal(true)" class="btn-delete">Delete Pin</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        console.log('Modal added to DOM, checking if visible...');
        
        // Add keyboard event listener
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeDeleteModal(false);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // Store the resolve function and event listener for cleanup
        modal._resolve = resolve;
        modal._handleKeydown = handleKeydown;
        
        // Focus on the delete button
        setTimeout(() => {
            const deleteBtn = modal.querySelector('.btn-delete');
            if (deleteBtn) deleteBtn.focus();
        }, 100);
    });
}

// Close delete modal
function closeDeleteModal(confirmed) {
    const modal = document.querySelector('.delete-confirmation-modal');
    console.log('closeDeleteModal called with:', confirmed, 'Modal found:', !!modal);
    
    if (modal && modal._resolve) {
        // Remove keyboard event listener
        if (modal._handleKeydown) {
            document.removeEventListener('keydown', modal._handleKeydown);
        }
        
        // Resolve the promise
        modal._resolve(confirmed);
        
        // Add closing animation
        modal.style.opacity = '0';
        modal.style.transform = 'translateY(-50%) scale(0.95)';
        setTimeout(() => {
            modal.remove();
        }, 200);
    } else {
        console.error('Delete modal not found or no resolve function');
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
            html: `<div style="color: ${pin.color}; font-size: 20px; text-shadow: -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white, 0 0 3px white; z-index: 50000; position: relative;"><i class="${pin.icon}"></i></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 20]
        })
    });
    
    // Create popup content with proper permissions
    const canEdit = pinManager.isAuthenticated && pin.discordId === pinManager.currentUser?.discordId;
    // Get category display info
    const categoryInfo = {
        'homes': { name: 'Homes', icon: '🏠', color: '#FFD700' },
        'farms': { name: 'Farms', icon: '🌱', color: '#22C55E' },
        'shops': { name: 'Shops', icon: '🏪', color: '#FF8C00' },
        'points-of-interest': { name: 'Points of Interest', icon: '⭐', color: '#FF69B4' }
    };
    const category = categoryInfo[pin.category] || { name: 'Unknown', icon: '📍', color: '#00A3DA' };

    const popupContent = `
        <div class="pin-popup">
            <div class="pin-popup-header">
                <div class="pin-popup-icon" style="color: ${pin.color};">
                    <i class="${pin.icon}"></i>
                </div>
                <div class="pin-popup-title">
                    <h4>${pin.name}</h4>
                    <div class="pin-popup-category" style="color: ${category.color};">
                        <i class="fas fa-tag"></i>
                        <span>${category.name}</span>
                    </div>
                </div>
            </div>
            <div class="pin-popup-body">
                <div class="pin-popup-info">
                    <div class="pin-popup-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${pin.gridLocation}</span>
                    </div>
                    ${pin.description ? `
                    <div class="pin-popup-description">
                        <i class="fas fa-info-circle"></i>
                        <span>${pin.description}</span>
                    </div>
                    ` : ''}
                    <div class="pin-popup-creator">
                        <i class="fas fa-user"></i>
                        <span>Created by: ${pin.creator?.username || 'Unknown'}</span>
                    </div>
                </div>
                ${canEdit ? `
                <div class="pin-popup-actions">
                    <button onclick="editPin('${pin._id}')" class="pin-popup-btn edit-btn">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button onclick="deletePin('${pin._id}')" class="pin-popup-btn delete-btn">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
                ` : ''}
            </div>
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
    // Use the new search functionality
    filterPins();
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
                                <option value="homes" ${pin.category === 'homes' ? 'selected' : ''}>🏠 Homes</option>
                                <option value="farms" ${pin.category === 'farms' ? 'selected' : ''}>🌱 Farms</option>
                                <option value="shops" ${pin.category === 'shops' ? 'selected' : ''}>🏪 Shops</option>
                                <option value="points-of-interest" ${pin.category === 'points-of-interest' ? 'selected' : ''}>📍 Points of Interest</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="pin-icon">Icon</label>
                            <select id="pin-icon" name="icon">
                                <option value="fas fa-home" ${pin.icon === 'fas fa-home' ? 'selected' : ''}>🏠 Home</option>
                                <option value="fas fa-seedling" ${pin.icon === 'fas fa-seedling' ? 'selected' : ''}>🌱 Farm</option>
                                <option value="fas fa-store" ${pin.icon === 'fas fa-store' ? 'selected' : ''}>🏪 Store</option>
                                <option value="fas fa-star" ${pin.icon === 'fas fa-star' ? 'selected' : ''}>⭐ Point of Interest</option>
                            </select>
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
        const category = formData.get('category');
        const defaultColor = getDefaultColorForCategory(category);
        
        const pinData = {
            name: formData.get('name'),
            description: formData.get('description'),
            category: category,
            icon: formData.get('icon'),
            color: defaultColor,
            isPublic: true
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
    console.log('deletePin called with pinId:', pinId);
    console.log('pinManager.isAuthenticated:', pinManager.isAuthenticated);
    console.log('pinManager.currentUser:', pinManager.currentUser);
    
    if (!pinManager.isAuthenticated) {
        console.log('User not authenticated, showing auth required');
        showPinAuthRequired();
        return;
    }
    
    const pin = pinManager.pins.find(p => p._id === pinId);
    console.log('Pin found:', pin);
    if (!pin) {
        console.log('Pin not found in pinManager.pins');
        return;
    }
    
    // Check if user can delete this pin
    console.log('Pin discordId:', pin.discordId, 'Current user discordId:', pinManager.currentUser?.discordId);
    if (pin.discordId !== pinManager.currentUser?.discordId) {
        console.log('User cannot delete this pin - permission denied');
        alert('You can only delete your own pins.');
        return;
    }
    
    console.log('All checks passed, showing delete confirmation modal');
    // Show delete confirmation modal
    const confirmed = await showDeleteConfirmationModal(pin.name);
    console.log('Delete confirmation result:', confirmed);
    if (!confirmed) return;
    
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
    const sidebar = document.querySelector('.side-ui');
    const pinsSection = document.querySelector('.pins-section');
    
    if (sidebar && pinsSection) {
        // Toggle the sidebar if it's collapsed
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
        }
        
        // Expand the pins section if it's collapsed
        if (pinsSection.classList.contains('collapsed')) {
            pinsSection.classList.remove('collapsed');
        }
        
        // Scroll to the pins section
        pinsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Focus on the search input
        const searchInput = document.getElementById('pin-search-input');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 300);
        }
    }
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

// Search functionality
let currentSearchTerm = '';
let currentFilterCategory = 'all';

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('pin-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSearch);
    }
    
    // Add category filter event listeners
    const categoryFilters = document.querySelectorAll('.category-filter');
    categoryFilters.forEach(filter => {
        filter.addEventListener('click', handleCategoryFilter);
    });
}

// Handle category filter clicks
function handleCategoryFilter(e) {
    const category = e.target.dataset.category;
    currentFilterCategory = category;
    
    // Update active state
    document.querySelectorAll('.category-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Filter pins
    filterPins();
}

// Handle search input
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    currentSearchTerm = searchTerm;
    
    // Show/hide clear button
    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) {
        if (searchTerm) {
            clearBtn.classList.add('visible');
        } else {
            clearBtn.classList.remove('visible');
        }
    }
    
    // Filter pins
    filterPins();
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('pin-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    
    if (clearBtn) {
        clearBtn.classList.remove('visible');
    }
    
    currentSearchTerm = '';
    filterPins();
}

// Filter pins based on search term and category
function filterPins() {
    const pinsList = document.getElementById('pins-list');
    if (!pinsList || !pinManager.pins) return;
    
    const filteredPins = pinManager.pins.filter(pin => {
        // Check category filter
        const categoryMatch = currentFilterCategory === 'all' || pin.category === currentFilterCategory;
        
        // Check search term
        const searchMatch = !currentSearchTerm || 
            pin.name.toLowerCase().includes(currentSearchTerm) ||
            (pin.description && pin.description.toLowerCase().includes(currentSearchTerm)) ||
            pin.gridLocation.toLowerCase().includes(currentSearchTerm);
        
        return categoryMatch && searchMatch;
    });
    
    // Update the display
    updatePinsListDisplay(filteredPins);
}

// Update pins list display with filtered pins
function updatePinsListDisplay(pins) {
    const pinsList = document.getElementById('pins-list');
    if (!pinsList) return;
    
    if (pins.length === 0) {
        pinsList.innerHTML = `
            <div class="no-pins-message">
                <i class="fas fa-search"></i>
                <p>No pins found</p>
                ${currentSearchTerm ? `<small>Try a different search term</small>` : ''}
            </div>
        `;
        return;
    }
    
    pinsList.innerHTML = pins.map(pin => {
        const canEdit = pinManager.isAuthenticated && pin.discordId === pinManager.currentUser?.discordId;
        return `
            <div class="pin-item">
                <div class="pin-icon">
                    <i class="${pin.icon}" style="color: ${pin.color}; text-shadow: -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white, 0 0 3px white;"></i>
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
            </div>
        `;
    }).join('');
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