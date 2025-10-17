/**
 * Map Engine - Main orchestration module for Leaflet image-space map
 * Coordinates all other modules and handles Leaflet setup
 */

class MapEngine {
    constructor(config) {
        this.config = config;
        this.map = null;
        this.isInitialized = false;
        this.isDestroyed = false;
        
        // Module instances
        this.geometry = null;
        this.manifest = null;
        this.layers = null;
        this.loader = null;
        this.toggles = null;
        this.metrics = null;
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Loading state
        this.initialLoadPromise = null;
    }
    
    /**
     * Initialize the map engine
     * @param {string} containerId - HTML element ID for map container
     * @returns {Promise<void>} Initialization promise
     */
    async initialize(containerId = 'map') {
        if (this.isInitialized) {
            console.warn('[map-engine] Already initialized');
            return;
        }
        
        if (this.isDestroyed) {
            throw new Error('Cannot initialize destroyed map engine');
        }
        
        // Initializing...
        
        try {
            // Create module instances
            this._createModules();
            
        // Initialize Leaflet map
        this._initializeLeaflet(containerId);
        
        // Wait for map to be fully ready
        await this._waitForMapReady();
        
        // Initialize modules with map reference
        this._initializeModules();
            
            // Load manifest
            await this._loadManifest();
            
            // Setup event handlers
            this._setupEventHandlers();
            
            // Initialize toggles with auto-save
            this.toggles.enableAutoSave();
            this.toggles.createKeyboardShortcuts();
            
            // Load initial viewport
            this._loadInitialViewport();
            
            this.isInitialized = true;
            // Initialization complete
            
        } catch (error) {
            console.error('[map-engine] Initialization failed:', error);
            this.isInitialized = false;
            this.cleanup();
            throw error;
        }
    }
    
    /**
     * Create module instances
     */
    _createModules() {
        this.geometry = new MapGeometry(this.config);
        this.manifest = new MapManifest(this.config, this.geometry);
        this.metrics = new MapMetrics(this.config);
        
        // Modules created
    }
    
    /**
     * Initialize Leaflet map
     * @param {string} containerId - Container element ID
     */
    _initializeLeaflet(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Map container not found: ${containerId}`);
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Create Leaflet map with CRS.Simple
        this.map = L.map(container, {
            crs: L.CRS.Simple,
            minZoom: this.config.MIN_ZOOM,
            maxZoom: this.config.MAX_ZOOM,
            zoomControl: true,
            attributionControl: false,
            preferCanvas: false,
            renderer: L.svg({ pane: 'overlayPane' })
        });
        
        // Set initial view to focus on H5 area (Rudania village marker)
        // H5 bounds: x0=16800, y0=6664, x1=19200, y1=8330
        const h5Center = [
            (6664 + 8330) / 2,  // Y center: 7497
            (16800 + 19200) / 2 // X center: 18000
        ];
        
        // Start at zoom level -1 (closer view to see H5 area clearly)
        this.map.setView(h5Center, -1);
        
        // Initial view set to H5 area
        
        // Set max bounds to prevent panning outside canvas
        const bounds = L.latLngBounds(
            [0, 0],
            [this.config.CANVAS_H, this.config.CANVAS_W]
        );
        this.map.setMaxBounds(bounds);
        
        // Leaflet map initialized
        
        // Add a method to fit the entire canvas
        this.map.fitToCanvas = () => {
            const bounds = L.latLngBounds(
                [0, 0],
                [this.config.CANVAS_H, this.config.CANVAS_W]
            );
            this.map.fitBounds(bounds);
        };
    }
    
    /**
     * Wait for map to be fully ready
     */
    async _waitForMapReady() {
        return new Promise((resolve) => {
            if (this.map && this.map.getContainer()) {
                // Map is ready, resolve immediately
                resolve();
            } else {
                // Wait for map to be ready
                setTimeout(() => {
                    this._waitForMapReady().then(resolve);
                }, 50);
            }
        });
    }
    
    /**
     * Initialize all modules
     */
    _initializeModules() {
        // Create layers first (need map reference)
        this.layers = new MapLayers(this.config, this.geometry);
        this.layers.initialize(this.map);
        
        // Create toggles after layers are initialized
        this.toggles = new MapToggles(this.config, this.layers);
        
        // Create loader (needs all other modules)
        this.loader = new MapLoader(this.config, this.geometry, this.manifest, this.layers, this.metrics);
        this.loader.initialize();
        
        // All modules initialized
    }
    
    /**
     * Load manifest
     */
    async _loadManifest() {
        // Loading manifest...
        await this.manifest.load();
        // Manifest loaded
    }
    
    /**
     * Setup event handlers
     */
    _setupEventHandlers() {
        // Map viewport change events
        const handleViewportChange = () => {
            const bounds = this.map.getBounds();
            const zoom = this.map.getZoom();
            
            // Convert Leaflet bounds to our coordinate system
            // Note: Leaflet uses [lat, lng] which maps to [y, x] in our system
            // We need to flip Y coordinates to match our coordinate system
            const viewportBounds = {
                x0: bounds.getWest(),
                y0: this.config.CANVAS_H - bounds.getNorth(),  // Flip Y coordinate
                x1: bounds.getEast(),
                y1: this.config.CANVAS_H - bounds.getSouth()   // Flip Y coordinate
            };
            
            // Debug logging removed for performance
            
            this.loader.updateViewport(viewportBounds, zoom);
        };
        
        // Debounced viewport change handler
        let viewportChangeTimer = null;
        const debouncedViewportChange = () => {
            if (viewportChangeTimer) {
                clearTimeout(viewportChangeTimer);
            }
            viewportChangeTimer = setTimeout(handleViewportChange, 50);
        };
        
        // Map events
        this.map.on('moveend', debouncedViewportChange);
        this.map.on('zoomend', () => {
            const zoom = this.map.getZoom();
            this.loader.onZoomChange(zoom);
            this.metrics.updateZoomLevel(zoom);
            debouncedViewportChange();
        });
        
        // Store handlers for cleanup
        this.eventHandlers.set('moveend', debouncedViewportChange);
        this.eventHandlers.set('zoomend', () => {
            const zoom = this.map.getZoom();
            this.loader.onZoomChange(zoom);
            this.metrics.updateZoomLevel(zoom);
            debouncedViewportChange();
        });
        
        // Event handlers setup
    }
    
    /**
     * Load initial viewport
     */
    _loadInitialViewport() {
        // Trigger initial viewport load
        const bounds = this.map.getBounds();
        const zoom = this.map.getZoom();
        
        const viewportBounds = {
            x0: bounds.getWest(),
            y0: this.config.CANVAS_H - bounds.getNorth(),  // Flip Y coordinate
            x1: bounds.getEast(),
            y1: this.config.CANVAS_H - bounds.getSouth()   // Flip Y coordinate
        };
        
        this.loader.updateViewport(viewportBounds, zoom);
        
        // Initial viewport loaded
    }
    
    /**
     * Get map instance
     * @returns {L.Map} Leaflet map instance
     */
    getMap() {
        return this.map;
    }
    
    /**
     * Get module instances
     * @returns {Object} Object containing all modules
     */
    getModules() {
        return {
            geometry: this.geometry,
            manifest: this.manifest,
            layers: this.layers,
            loader: this.loader,
            toggles: this.toggles,
            metrics: this.metrics
        };
    }
    
    /**
     * Get loading progress
     * @returns {Object} Loading progress information
     */
    getLoadingProgress() {
        return {
            manifest: this.manifest.getLoadingProgress(),
            loader: this.loader.getStats()
        };
    }
    
    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        if (!this.metrics) {
            console.warn('[map-engine] Metrics not initialized');
            return null;
        }
        return this.metrics.getReport();
    }
    
    /**
     * Get toggle state
     * @returns {Object} Current toggle states
     */
    getToggleState() {
        return this.toggles.getState();
    }
    
    /**
     * Set toggle state
     * @param {Object} state - Toggle states to set
     */
    setToggleState(state) {
        this.toggles.setStates(state);
    }
    
    /**
     * Jump to specific square
     * @param {string} squareId - Square ID to jump to
     * @param {number} zoom - Zoom level (optional)
     */
    jumpToSquare(squareId, zoom = 3) {
        if (!this.geometry.isValidSquareId(squareId)) {
            console.error('[map-engine] Invalid square ID:', squareId);
            return;
        }
        
        const bounds = this.geometry.getSquareBounds(squareId);
        const center = [
            bounds.y0 + this.config.SQUARE_H / 2,
            bounds.x0 + this.config.SQUARE_W / 2
        ];
        
        this.map.setView(center, zoom);
        
        // Jumped to square
    }
    
    /**
     * Fit map to show entire canvas
     */
    fitToCanvas() {
        if (this.map && this.map.fitToCanvas) {
            this.map.fitToCanvas();
            // Fitted to canvas
        }
    }
    
    /**
     * Jump to specific coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} zoom - Zoom level (optional)
     */
    jumpToCoordinates(x, y, zoom = 3) {
        const center = [y, x];
        this.map.setView(center, zoom);
        
        // Jumped to coordinates
    }
    
    /**
     * Fit map to show entire canvas
     */
    fitToCanvas() {
        const center = [
            this.config.CANVAS_H / 2,
            this.config.CANVAS_W / 2
        ];
        
        this.map.setView(center, 0);
        
            // Fitted to canvas
    }
    
    /**
     * Show/hide toggle UI
     * @param {boolean} visible - Visibility state
     */
    setToggleUIVisible(visible) {
        this.toggles.setVisible(visible);
    }
    
    /**
     * Toggle toggle UI visibility
     */
    toggleToggleUI() {
        this.toggles.toggleVisible();
    }
    
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    addEventListener(event, handler) {
        if (this.map) {
            this.map.on(event, handler);
        }
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    removeEventListener(event, handler) {
        if (this.map) {
            this.map.off(event, handler);
        }
    }
    
    /**
     * Get current viewport bounds
     * @returns {Object} Viewport bounds in our coordinate system
     */
    getViewportBounds() {
        const bounds = this.map.getBounds();
        return {
            x0: bounds.getWest(),
            y0: bounds.getNorth(),
            x1: bounds.getEast(),
            y1: bounds.getSouth()
        };
    }
    
    /**
     * Get current zoom level
     * @returns {number} Current zoom level
     */
    getZoom() {
        return this.map.getZoom();
    }
    
    /**
     * Set zoom level
     * @param {number} zoom - Zoom level
     */
    setZoom(zoom) {
        this.map.setZoom(zoom);
    }
    
    /**
     * Get current center point
     * @returns {Object} Center coordinates {x, y}
     */
    getCenter() {
        const center = this.map.getCenter();
        return {
            x: center.lng,
            y: center.lat
        };
    }
    
    /**
     * Set center point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setCenter(x, y) {
        this.map.setView([y, x], this.map.getZoom());
    }
    
    /**
     * Get hit-test result for point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} Hit-test result
     */
    hitTest(x, y) {
        const square = this.geometry.hitTestSquare(x, y);
        const quadrant = this.geometry.hitTestQuadrant(x, y);
        
        return {
            square,
            quadrant,
            coordinates: { x, y }
        };
    }
    
    /**
     * Get all loaded squares
     * @returns {Array<string>} Array of loaded square IDs
     */
    getLoadedSquares() {
        return Array.from(this.loader.loadedSquares);
    }
    
    /**
     * Force reload of current viewport
     */
    reloadViewport() {
        const bounds = this.getViewportBounds();
        const zoom = this.getZoom();
        
        this.loader.updateViewport(bounds, zoom);
        
        // Viewport reloaded
    }
    
    /**
     * Clear all loaded content and reload
     */
    clearAndReload() {
        this.loader.clear();
        this.reloadViewport();
        
        // Cleared and reloaded
    }
    
    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            initialized: this.isInitialized,
            destroyed: this.isDestroyed,
            config: this.config,
            viewport: this.getViewportBounds(),
            zoom: this.getZoom(),
            center: this.getCenter(),
            loadedSquares: this.getLoadedSquares(),
            toggleState: this.getToggleState(),
            metrics: this.getMetrics()
        };
    }
    
    /**
     * Log debug information to console
     */
    logDebugInfo() {
        console.group('[map-engine] Debug Information');
        const info = this.getDebugInfo();
        
        for (const [key, value] of Object.entries(info)) {
            if (typeof value === 'object') {
                console.log(key + ':', value);
            } else {
                console.log(key + ':', value);
            }
        }
        
        console.groupEnd();
    }
    
    /**
     * Cleanup and destroy the map engine
     */
    cleanup() {
        if (this.isDestroyed) {
            return;
        }
        
        // Cleaning up...
        
        // Clear event handlers
        if (this.map) {
            this.eventHandlers.forEach((handler, event) => {
                this.map.off(event, handler);
            });
            this.eventHandlers.clear();
        }
        
        // Cleanup modules
        if (this.loader) {
            this.loader.clear();
        }
        
        if (this.layers) {
            this.layers.clear();
        }
        
        if (this.toggles) {
            this.toggles.cleanup();
        }
        
        if (this.metrics) {
            this.metrics.cleanup();
        }
        
        // Remove map
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        // Clear module references
        this.geometry = null;
        this.manifest = null;
        this.layers = null;
        this.loader = null;
        this.toggles = null;
        this.metrics = null;
        
        this.isInitialized = false;
        this.isDestroyed = true;
        
        // Cleanup complete
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapEngine;
}
