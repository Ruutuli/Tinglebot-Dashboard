/**
 * Map Loader - Viewport-based loading with batching and prioritization
 * Handles fast-first (preview→full) loading from Google Cloud Storage
 */

class MapLoader {
    constructor(config, geometry, manifest, layers, metrics) {
        this.config = config;
        this.geometry = geometry;
        this.manifest = manifest;
        this.layers = layers;
        this.metrics = metrics;
        
        // Loading state
        this.loadingQueue = [];
        this.loadingSet = new Set();
        this.loadedSquares = new Set();
        this.cache = new Map(); // LRU cache for loaded squares
        this.previewCache = new Map(); // Cache for preview images
        this.debounceTimer = null;
        
        // Performance tracking
        this.loadStartTime = 0;
        this.batchStartTime = 0;
        
        // Current viewport state
        this.currentViewport = null;
        this.currentZoom = 1;
        this.currentVisibleSquares = new Set();
    }
    
    /**
     * Initialize the loader
     */
    initialize() {
        // Initialized
    }
    
    /**
     * Update viewport and trigger loading (debounced)
     * @param {Object} bounds - Viewport bounds {x0, y0, x1, y1}
     * @param {number} zoom - Current zoom level
     */
    updateViewport(bounds, zoom) {
        this.currentViewport = bounds;
        this.currentZoom = zoom;
        
        // Debounce rapid viewport changes
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this._processViewportChange();
        }, this.config.DEBOUNCE_MS);
    }
    
    /**
     * Process viewport change and update loading
     */
    _processViewportChange() {
        if (!this.currentViewport || !this.manifest.isLoaded()) {
            return;
        }
        
        const targetSquares = this._calculateTargetSquares();
        const squaresToLoad = this._prioritizeSquares(targetSquares);
        
        // Viewport update processed
        
        this._updateLoadingQueue(squaresToLoad);
        this._processLoadingQueue();
        
        // Update labels for all visible squares (regardless of loading status)
        this._updateAllVisibleLabels();
    }
    
    /**
     * Calculate target squares based on viewport + buffer
     * @returns {Array<string>} Array of square IDs to load
     */
    _calculateTargetSquares() {
        const buffer = this.config.BUFFER_SQUARES * this.config.SQUARE_W;
        const bufferedBounds = {
            x0: Math.max(0, this.currentViewport.x0 - buffer),
            y0: Math.max(0, this.currentViewport.y0 - buffer),
            x1: this.currentViewport.x1 + buffer,
            y1: this.currentViewport.y1 + buffer
        };
        
        const squares = this.geometry.getSquaresInBounds(bufferedBounds);
        
        // Debug logging removed for performance
        
        return squares;
    }
    
    /**
     * Prioritize squares by distance to viewport center
     * @param {Array<string>} squareIds - Square IDs to prioritize
     * @returns {Array<string>} Prioritized square IDs
     */
    _prioritizeSquares(squareIds) {
        const viewportCenter = {
            x: (this.currentViewport.x0 + this.currentViewport.x1) / 2,
            y: (this.currentViewport.y0 + this.currentViewport.y1) / 2
        };
        
        return squareIds
            .map(squareId => ({
                id: squareId,
                distance: this.geometry.getDistanceToViewport(squareId, viewportCenter)
            }))
            .sort((a, b) => a.distance - b.distance)
            .map(item => item.id);
    }
    
    /**
     * Update loading queue based on target squares
     * @param {Array<string>} targetSquares - Squares that should be loaded
     */
    _updateLoadingQueue(targetSquares) {
        const targetSet = new Set(targetSquares);
        
        // Remove squares that are no longer needed
        this._unloadUnneededSquares(targetSet);
        
        // Add new squares to queue
        for (const squareId of targetSquares) {
            if (!this.loadedSquares.has(squareId) && !this.loadingSet.has(squareId)) {
                this.loadingQueue.push(squareId);
                this.loadingSet.add(squareId);
            }
        }
        
        // Update cache if needed
        this._manageCache();
    }
    
    /**
     * Unload squares that are no longer needed
     * @param {Set<string>} targetSet - Set of squares that should remain loaded
     */
    _unloadUnneededSquares(targetSet) {
        const toUnload = [];
        
        for (const squareId of this.loadedSquares) {
            if (!targetSet.has(squareId)) {
                toUnload.push(squareId);
            }
        }
        
        for (const squareId of toUnload) {
            this._unloadSquare(squareId);
        }
    }
    
    /**
     * Manage cache size (LRU eviction)
     */
    _manageCache() {
        if (this.loadedSquares.size <= this.config.CACHE_SQUARES_SOFTCAP) {
            return;
        }
        
        const toEvict = this.loadedSquares.size - this.config.CACHE_SQUARES_SOFTCAP;
        const evicted = [];
        
        // Simple LRU: remove oldest loaded squares
        for (const squareId of this.loadedSquares) {
            if (evicted.length >= toEvict) break;
            
            // Don't evict squares currently in viewport
            if (!this._isSquareInCurrentViewport(squareId)) {
                evicted.push(squareId);
            }
        }
        
        for (const squareId of evicted) {
            this._unloadSquare(squareId);
        }
        
        // Cache evicted
    }
    
    /**
     * Check if square is in current viewport
     * @param {string} squareId - Square ID
     * @returns {boolean} True if in viewport
     */
    _isSquareInCurrentViewport(squareId) {
        if (!this.currentViewport) return false;
        
        const bounds = this.geometry.getSquareBounds(squareId);
        
        return !(bounds.x1 < this.currentViewport.x0 ||
                bounds.x0 > this.currentViewport.x1 ||
                bounds.y1 < this.currentViewport.y0 ||
                bounds.y0 > this.currentViewport.y1);
    }
    
    /**
     * Process loading queue in batches
     */
    async _processLoadingQueue() {
        if (this.loadingQueue.length === 0) {
            return;
        }
        
        const batch = this.loadingQueue.splice(0, this.config.BATCH_SIZE);
        this.batchStartTime = performance.now();
        
        // Processing batch
        
        // Process batch in parallel
        const promises = batch.map(squareId => this._loadSquare(squareId));
        
        try {
            await Promise.allSettled(promises);
            const batchTime = performance.now() - this.batchStartTime;
            this.metrics.recordBatchTime(batchTime);
            
            // Process next batch if queue has more items
            if (this.loadingQueue.length > 0) {
                // Use requestIdleCallback if available, otherwise setTimeout
                if (window.requestIdleCallback) {
                    requestIdleCallback(() => this._processLoadingQueue());
                } else {
                    setTimeout(() => this._processLoadingQueue(), 16);
                }
            }
        } catch (error) {
            console.error('[loader] Batch processing error:', error);
        }
    }
    
    /**
     * Load a single square
     * @param {string} squareId - Square ID to load
     */
    async _loadSquare(squareId) {
        const loadStartTime = performance.now();
        
        try {
            const square = this.manifest.getSquare(squareId);
            if (!square) {
                throw new Error(`Square ${squareId} not found in manifest`);
            }
            
            const layers = this.manifest.listLayersForSquare(squareId);
            // Simplify preview logic for base map focus
            const hasPreview = this.manifest.hasPreview(squareId);
            const usePreview = false; // Disable preview for now - focus on full resolution base maps
            
            
            // Load layers in priority order (fog first, then blight, then base, then region borders, then village markers)
            let layersToLoad = [];
            
            // Add hidden areas layer first (fog layer - highest priority)
            if (layers.includes('MAP_0001_hidden-areas')) {
                layersToLoad.push('MAP_0001_hidden-areas');
            }
            
            // Add blight layer (above base layer)
            if (layers.includes('MAP_0000_BLIGHT')) {
                layersToLoad.push('MAP_0000_BLIGHT');
            }
            
            // Then add base layer
            if (layers.includes('MAP_0002_Map-Base')) {
                layersToLoad.push('MAP_0002_Map-Base');
            }
            // Otherwise, convert old "base" layer to new format
            else if (layers.includes('base')) {
                layersToLoad.push('MAP_0002_Map-Base');
            }
            
            // Add region borders layer (above base, below village markers)
            if (layers.includes('MAP_0001s_0003_Region-Borders')) {
                layersToLoad.push('MAP_0001s_0003_Region-Borders');
            }
            
            // Add village circle layers (above base, below village markers)
            // These get added to the 'village-borders' layer group
            const villageCircleLayers = layers.filter(layer => 
                layer.startsWith('MAP_0002s_') && layer.includes('CIRCLE-')
            );
            layersToLoad.push(...villageCircleLayers);
            
            // Add village marker layers (appear above village borders)
            const villageMarkerLayers = layers.filter(layer => 
                layer.startsWith('MAP_0001s_') && layer.includes('-Marker')
            );
            layersToLoad.push(...villageMarkerLayers);
            
            
            // Load layers with proper ordering to ensure fog loads before base
            await this._loadLayersInOrder(squareId, layersToLoad, usePreview);
            
            // Add labels if zoom level is appropriate
            this._updateLabelsForSquare(squareId);
            
            // Mark as loaded
            this.loadedSquares.add(squareId);
            this.cache.set(squareId, {
                layers: layers,
                hasPreview,
                loadedAt: Date.now()
            });
            
            const loadTime = performance.now() - loadStartTime;
            this.metrics.recordSquareLoadTime(squareId, loadTime);
            
            // Square loaded
            
        } catch (error) {
            console.error('[loader] Failed to load square:', squareId, error);
            this.metrics.recordLoadError(squareId, error);
        } finally {
            this.loadingSet.delete(squareId);
        }
    }
    
    /**
     * Load layers in proper order to ensure fog loads before blight, blight before base, base before region borders
     * @param {string} squareId - Square ID
     * @param {Array<string>} layersToLoad - Array of layer names to load
     * @param {boolean} usePreview - Whether to use preview images
     */
    async _loadLayersInOrder(squareId, layersToLoad, usePreview) {
        // Separate priority layers from other layers
        const fogLayer = layersToLoad.find(layer => layer === 'MAP_0001_hidden-areas');
        const blightLayer = layersToLoad.find(layer => layer === 'MAP_0000_BLIGHT');
        const regionBordersLayer = layersToLoad.find(layer => layer === 'MAP_0001s_0003_Region-Borders');
        const otherLayers = layersToLoad.filter(layer => 
            layer !== 'MAP_0001_hidden-areas' && 
            layer !== 'MAP_0000_BLIGHT' && 
            layer !== 'MAP_0001s_0003_Region-Borders'
        );
        
        // Load fog layer first and wait for it to be fully rendered
        if (fogLayer) {
            // Loading fog layer first
            await this._loadSquareLayer(squareId, fogLayer, usePreview);
            
            // Wait a bit to ensure fog layer is rendered before other layers
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Load blight layer second
        if (blightLayer) {
            // Loading blight layer
            await this._loadSquareLayer(squareId, blightLayer, usePreview);
            
            // Wait a bit to ensure blight layer is rendered before base layer
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        
        // Load other layers (base, village markers, etc.)
        for (const layerName of otherLayers) {
            // Loading layer
            await this._loadSquareLayer(squareId, layerName, usePreview);
        }
        
        // Load region borders layer last (above base but below village markers)
        if (regionBordersLayer) {
            // Loading region borders layer
            await this._loadSquareLayer(squareId, regionBordersLayer, usePreview);
        }
    }

    /**
     * Load a single layer for a square
     * @param {string} squareId - Square ID
     * @param {string} layerName - Layer name
     * @param {boolean} usePreview - Whether to use preview image
     */
    async _loadSquareLayer(squareId, layerName, usePreview) {
        const imageUrl = this._getImageUrl(squareId, layerName, usePreview);
        
        try {
            // Check if already loaded
            if (this._isLayerLoaded(squareId, layerName, usePreview)) {
                return;
            }
            
            // Loading image
            
            // Load image directly from GCS (no fallback)
            await this._preloadImage(imageUrl);
            
            // Add to map
            this.layers.addRasterOverlay(squareId, layerName, imageUrl, usePreview);
            
            // For fog layer, ensure it's fully rendered before continuing
            if (layerName === 'MAP_0001_hidden-areas') {
                // Force a brief delay to ensure the fog layer is rendered
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Successfully loaded and added to map
            
            // Comment out crossfade for now - focus on base map loading
            // if (usePreview && this.currentZoom >= this.config.CROSSFADE_THRESHOLD) {
            //     const fullImageUrl = this._getImageUrl(squareId, layerName, false);
            //     this.layers.crossfadeToFull(squareId, layerName, fullImageUrl);
            // }
            
        } catch (error) {
            console.warn('[loader] Failed to load image:', { squareId, layerName, imageUrl, error: error.message });
        }
    }
    
    /**
     * Get image URL for a square and layer from Google Cloud Storage
     * @param {string} squareId - Square ID
     * @param {string} layerName - Layer name
     * @param {boolean} isPreview - Whether to get preview URL
     * @returns {string} GCS Image URL
     */
    _getImageUrl(squareId, layerName, isPreview) {
        return this.config.getGCSImageURL(squareId, layerName, isPreview);
    }
    
    /**
     * Preload an image from GCS
     * @param {string} url - Image URL (GCS)
     * @returns {Promise<HTMLImageElement>} Loaded image
     */
    _preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => resolve(img);
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            img.src = url;
        });
    }
    
    /**
     * Check if layer is already loaded
     * @param {string} squareId - Square ID
     * @param {string} layerName - Layer name
     * @param {boolean} isPreview - Whether checking for preview
     * @returns {boolean} True if loaded
     */
    _isLayerLoaded(squareId, layerName, isPreview) {
        const layerGroup = this.layers.layerGroups.get(layerName);
        if (!layerGroup) return false;
        
        const key = `${squareId}-${layerName}`;
        let found = false;
        
        layerGroup.eachLayer(overlay => {
            if (overlay._mapKey === key && overlay._isPreview === isPreview) {
                found = true;
                return; // Exit early since we found the overlay
            }
        });
        
        return found;
    }
    
    /**
     * Update labels for a square based on current zoom
     * @param {string} squareId - Square ID
     */
    _updateLabelsForSquare(squareId) {
        // Remove existing labels
        this.layers.removeLabels(squareId);
        
        // Add square label if zoom level is appropriate
        if (this.currentZoom >= this.config.LABEL_ZOOM_SQUARES) {
            this.layers.addSquareLabel(squareId);
        }
        
        // Add quadrant labels if zoom level is appropriate
        if (this.currentZoom >= this.config.LABEL_ZOOM_QUADS) {
            this.layers.addQuadrantLabels(squareId);
        }
    }
    
    /**
     * Update labels for all squares in viewport (regardless of loading status)
     */
    _updateAllVisibleLabels() {
        const targetSquares = this._calculateTargetSquares();
        const targetSet = new Set(targetSquares);
        
        
        // Get currently visible squares (from previous update)
        const currentVisibleSquares = this.currentVisibleSquares || new Set();
        
        // Remove labels for squares that are no longer visible
        for (const squareId of currentVisibleSquares) {
            if (!targetSet.has(squareId)) {
                // Debug logging removed for performance
                this.layers.removeLabels(squareId);
            }
        }
        
        // Add labels for new visible squares if zoom level is appropriate
        for (const squareId of targetSquares) {
            if (!currentVisibleSquares.has(squareId)) {
                if (this.currentZoom >= this.config.LABEL_ZOOM_SQUARES) {
                    this.layers.addSquareLabel(squareId);
                }
                
                if (this.currentZoom >= this.config.LABEL_ZOOM_QUADS) {
                    this.layers.addQuadrantLabels(squareId);
                }
            }
        }
        
        // Update current visible squares
        this.currentVisibleSquares = targetSet;
    }
    
    /**
     * Unload a square
     * @param {string} squareId - Square ID to unload
     */
    _unloadSquare(squareId) {
        const cached = this.cache.get(squareId);
        if (!cached) return;
        
        // Remove all layers for this square
        for (const layerName of cached.layers) {
            this.layers.removeRasterOverlay(squareId, layerName, true);  // Remove preview
            this.layers.removeRasterOverlay(squareId, layerName, false); // Remove full
        }
        
        // Remove labels
        this.layers.removeLabels(squareId);
        
        // Update state
        this.loadedSquares.delete(squareId);
        this.cache.delete(squareId);
        
        // Square unloaded
    }
    
    /**
     * Handle zoom level changes
     * @param {number} newZoom - New zoom level
     */
    onZoomChange(newZoom) {
        const oldZoom = this.currentZoom;
        this.currentZoom = newZoom;
        
        // Update label sizes
        this.layers.updateLabelSizes(newZoom);
        
        // Crossfade preview to full if needed
        if (oldZoom < this.config.CROSSFADE_THRESHOLD && newZoom >= this.config.CROSSFADE_THRESHOLD) {
            this._crossfadeAllPreviews();
        }
        
        // Update labels for all loaded squares
        for (const squareId of this.loadedSquares) {
            this._updateLabelsForSquare(squareId);
        }
    }
    
    /**
     * Crossfade all preview images to full resolution
     */
    _crossfadeAllPreviews() {
        for (const squareId of this.loadedSquares) {
            const cached = this.cache.get(squareId);
            if (!cached || !cached.hasPreview) continue;
            
            for (const layerName of cached.layers) {
                const fullImageUrl = this._getImageUrl(squareId, layerName, false);
                this.layers.crossfadeToFull(squareId, layerName, fullImageUrl);
            }
        }
    }
    
    /**
     * Get loading statistics
     * @returns {Object} Loading statistics
     */
    getStats() {
        return {
            loadedSquares: this.loadedSquares.size,
            loadingQueue: this.loadingQueue.length,
            loadingInProgress: this.loadingSet.size,
            cacheSize: this.cache.size,
            viewportSquares: this.currentViewport ? this._calculateTargetSquares().length : 0
        };
    }
    
    /**
     * Clear all loaded content (cleanup)
     */
    clear() {
        // Clear loading state
        this.loadingQueue = [];
        this.loadingSet.clear();
        this.loadedSquares.clear();
        this.cache.clear();
        this.previewCache.clear();
        
        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        // All content cleared
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapLoader;
}
