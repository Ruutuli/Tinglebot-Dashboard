// Optimized Map System with Performance Enhancements
class SimpleMap {
    constructor() {
        this.map = null;
        this.squares = [];
        this.loadedSquares = new Set(); // Track which squares are loaded
        this.loadingQueue = new Map(); // Priority queue for loading
        this.imageCache = new Map(); // Cache loaded images
        this.viewportBounds = null; // Current viewport bounds
        this.performanceMetrics = {
            loadTimes: [],
            renderTimes: [],
            memoryUsage: [],
            imageLoadTimes: [],
            totalImageLoadTime: 0,
            imagesLoaded: 0,
            imagesFailed: 0,
            startTime: Date.now()
        };
    }

    // Helper function to convert Google Cloud Storage URLs to proxy URLs
    getProxyUrl(originalUrl) {
        if (originalUrl.includes('storage.googleapis.com/tinglebot/')) {
            const path = originalUrl.replace('https://storage.googleapis.com/tinglebot/', '');
            const proxyUrl = `/api/images/${path}`;
            console.log(`🔄 Converting URL: ${originalUrl} → ${proxyUrl}`);
            return proxyUrl;
        }
        return originalUrl;
    }

    init() {
        // Show loading screen initially
        this.showLoadingScreen();
        
        // Initialize map after a short delay to ensure loading screen is visible
        setTimeout(() => {
            this.initializeMap();
            this.createInitialGrid(); // Create only visible squares initially
            this.setupZoomHandlers();
            this.setupViewportHandlers();
            
            // Hide loading screen after map is initialized and sufficient squares are loaded
            this.waitForInitialLoading();
        }, 100);
    }

    waitForInitialLoading() {
        const minLoadingTime = 6000; // Minimum 6 seconds loading time
        const minSquaresLoaded = 8; // Minimum squares to load before hiding
        const minImagesLoaded = 20; // Minimum images to load before hiding
        const maxLoadingTime = 12000; // Maximum 12 seconds loading time
        
        const startTime = Date.now();
        
        const checkLoading = () => {
            const elapsed = Date.now() - startTime;
            const squaresLoaded = this.loadedSquares.size;
            const imagesLoaded = this.performanceMetrics.imagesLoaded;
            
            // Update loading progress
            this.updateLoadingProgress(squaresLoaded, elapsed);
            
            // Hide loading screen if:
            // 1. Minimum time has passed AND minimum squares are loaded AND minimum images are loaded, OR
            // 2. Maximum time has passed (regardless of loading status)
            if ((elapsed >= minLoadingTime && squaresLoaded >= minSquaresLoaded && imagesLoaded >= minImagesLoaded) || elapsed >= maxLoadingTime) {
                this.hideLoadingScreen();
            } else {
                // Continue checking every 200ms
                setTimeout(checkLoading, 200);
            }
        };
        
        // Start checking after a brief delay
        setTimeout(checkLoading, 500);
        
        // Test proxy connectivity
        this.testProxyConnection();
    }

    async testProxyConnection() {
        try {
            const testUrl = '/api/images/maps/squares/MAP_0002_Map-Base/MAP_0002_Map-Base_H5.png';
            console.log(`🧪 Testing proxy connection: ${testUrl}`);
            
            const response = await fetch(testUrl, { method: 'HEAD' });
            if (response.ok) {
                console.log(`✅ Proxy connection successful: ${response.status} ${response.statusText}`);
            } else {
                console.warn(`⚠️ Proxy connection issue: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error(`❌ Proxy connection failed:`, error);
        }
    }

    updateLoadingProgress(squaresLoaded, elapsed) {
        const loadingOverlay = document.getElementById('map-loading-overlay');
        if (!loadingOverlay) return;
        
        const progressText = loadingOverlay.querySelector('.map-loading-subtitle');
        const progressFill = loadingOverlay.querySelector('.loading-progress-fill');
        const progressPercent = loadingOverlay.querySelector('.loading-progress-text');
        
        // Calculate image loading statistics
        const totalImages = this.performanceMetrics.imagesLoaded + this.performanceMetrics.imagesFailed;
        const avgLoadTime = this.performanceMetrics.imageLoadTimes.length > 0 
            ? Math.round(this.performanceMetrics.imageLoadTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.imageLoadTimes.length)
            : 0;
        
        if (progressText) {
            if (squaresLoaded < 4) {
                progressText.textContent = 'Initializing map grid...';
            } else if (squaresLoaded < 8) {
                progressText.textContent = `Loading terrain tiles... (${squaresLoaded}/16) | Images: ${this.performanceMetrics.imagesLoaded}/${totalImages} | Avg: ${avgLoadTime}ms`;
            } else if (squaresLoaded < 12) {
                progressText.textContent = `Loading map layers... (${squaresLoaded}/16) | Images: ${this.performanceMetrics.imagesLoaded}/${totalImages} | Avg: ${avgLoadTime}ms`;
            } else if (this.performanceMetrics.imagesLoaded < 20) {
                progressText.textContent = `Loading high-res images... (${squaresLoaded}/16) | Images: ${this.performanceMetrics.imagesLoaded}/${totalImages} | Avg: ${avgLoadTime}ms`;
            } else {
                progressText.textContent = `Finalizing map... (${squaresLoaded}/16) | Images: ${this.performanceMetrics.imagesLoaded}/${totalImages} | Avg: ${avgLoadTime}ms`;
            }
        }
        
        // Update progress bar based on both squares and images
        const squareProgress = Math.round((squaresLoaded / 16) * 50); // 50% for squares
        const imageProgress = totalImages > 0 ? Math.round((this.performanceMetrics.imagesLoaded / totalImages) * 50) : 0; // 50% for images
        const totalProgress = Math.min(100, squareProgress + imageProgress);
        
        if (progressFill) {
            progressFill.style.width = `${totalProgress}%`;
        }
        if (progressPercent) {
            progressPercent.textContent = `${totalProgress}%`;
        }
    }

    initializeMap() {
        // Initialize Fantasy Map
        this.map = L.map('map', {
            center: [8, 8 * (2400 / 1666)], // Focus on H5 square
            zoom: 9, // Start at zoom level 9 for maximum detail
            zoomControl: true,
            zoomControlOptions: {
                position: 'topright',
                style: 'fantasy'
            },
            attributionControl: false,
            minZoom: 0, // Start from zoom 0 to see full map
            maxZoom: 15,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true,
            dragging: true,
            zoomAnimation: true,
            fadeAnimation: true,
            markerZoomAnimation: true,
            crs: L.CRS.Simple // Use simple coordinate system for custom tiles
        });

        // Store map images for each square
        this.mapImages = new Map();
        
        // Initialize layer system
        this.layers = {
            base: new Map(), // Base map layer
            hidden: new Map(), // Hidden areas layer
            markers: new Map(), // Markers layer
            villageBounds: new Map(), // Village bounds layer (cyan/pink circles)
            regionsNames: new Map(), // Regions names layer
            regionBorders: new Map(), // Region borders layer
            pathsRoads: new Map() // Paths/roads layer (PSL, LDW, Other-Paths)
        };
        this.activeLayer = 'base';
        
        // Set up the map bounds for your 10x12 grid with correct aspect ratio
        const aspectRatio = 2400 / 1666; // ≈ 1.44
        const mapBounds = L.latLngBounds(
            [0, 0], // Bottom-left corner
            [12, 10 * aspectRatio] // Top-right corner (12 rows, 10 columns with correct aspect ratio)
        );
        
        // Set the map bounds
        this.map.setMaxBounds(mapBounds);
        
        // Ensure the map is properly centered after initialization
        setTimeout(() => {
            this.map.setView([8, 7 * (2400 / 1666)], 9); // Focus on H5 at zoom level 9
        }, 100);
    }

    createInitialGrid() {
        // Creating initial grid (visible squares only)
        
        // Create only squares visible in the initial viewport
        this.loadSquaresInViewport();
        
        // Initial grid created
    }

    loadSquaresInViewport() {
        const startTime = performance.now();
        const bounds = this.map.getBounds();
        this.viewportBounds = bounds;
        
        const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const aspectRatio = 2400 / 1666; // ≈ 1.44
        
        // Pre-calculate viewport bounds for faster comparison
        const viewportNorth = bounds.getNorth();
        const viewportSouth = bounds.getSouth();
        const viewportEast = bounds.getEast();
        const viewportWest = bounds.getWest();
        
        // Buffer for preloading nearby squares
        const buffer = 0.5; // Load squares slightly outside viewport
        const bufferedNorth = viewportNorth + buffer;
        const bufferedSouth = viewportSouth - buffer;
        const bufferedEast = viewportEast + buffer;
        const bufferedWest = viewportWest - buffer;
        
        const squaresToLoad = [];
        const squaresToUnload = [];
        
        // Find squares that need to be loaded
        columns.forEach((col, colIndex) => {
            rows.forEach((row, rowIndex) => {
                const squareId = `${col}${row}`;
                
                // Calculate square bounds
                const lat = 12 - rowIndex;
                const lng = colIndex * aspectRatio;
                const squareNorth = lat;
                const squareSouth = lat - 1;
                const squareWest = lng;
                const squareEast = lng + aspectRatio;
                
                // Check if square intersects with buffered viewport
                const isInViewport = squareSouth <= bufferedNorth && squareNorth >= bufferedSouth &&
                    squareWest <= bufferedEast && squareEast >= bufferedWest;
                
                if (isInViewport && !this.loadedSquares.has(squareId)) {
                    squaresToLoad.push({ squareId, colIndex, rowIndex, priority: this.calculatePriority(squareId, bounds) });
                } else if (!isInViewport && this.loadedSquares.has(squareId)) {
                    squaresToUnload.push(squareId);
                }
            });
        });
        
        // Unload squares outside viewport
        this.unloadSquares(squaresToUnload);
        
        // Sort by priority and load squares
        squaresToLoad.sort((a, b) => b.priority - a.priority);
        this.loadSquaresWithPriority(squaresToLoad);
        
        // Track performance
        const loadTime = performance.now() - startTime;
        this.performanceMetrics.loadTimes.push(loadTime);
        if (this.performanceMetrics.loadTimes.length > 100) {
            this.performanceMetrics.loadTimes.shift();
        }
        
        // Update performance display
        this.updatePerformanceDisplay();
    }
    
    calculatePriority(squareId, bounds) {
        // Calculate distance from viewport center for priority
        const center = bounds.getCenter();
        const aspectRatio = 2400 / 1666;
        const col = squareId.charCodeAt(0) - 65; // A=0, B=1, etc.
        const row = parseInt(squareId.slice(1)) - 1; // 1=0, 2=1, etc.
        
        const squareLat = 12 - row;
        const squareLng = col * aspectRatio;
        const squareCenter = [squareLat - 0.5, squareLng + aspectRatio / 2];
        
        const distance = Math.sqrt(
            Math.pow(center.lat - squareCenter[0], 2) + 
            Math.pow(center.lng - squareCenter[1], 2)
        );
        
        // Higher priority for closer squares
        return 1000 - distance;
    }
    
    loadSquaresWithPriority(squaresToLoad) {
        // Load squares in batches to prevent blocking
        const batchSize = 3;
        let currentBatch = 0;
        
        const loadBatch = () => {
            const batch = squaresToLoad.slice(currentBatch * batchSize, (currentBatch + 1) * batchSize);
            
            batch.forEach(({ squareId, colIndex, rowIndex }) => {
                this.createSquare(squareId, colIndex, rowIndex, 1, 1, 1);
                    this.loadedSquares.add(squareId);
                    
                // Load layers with optimized timing
                this.scheduleLayerLoading(squareId);
            });
            
            currentBatch++;
            
            if (currentBatch * batchSize < squaresToLoad.length) {
                // Use requestAnimationFrame for smooth loading
                requestAnimationFrame(loadBatch);
            }
        };
        
        loadBatch();
    }
    
    scheduleLayerLoading(squareId) {
        // Optimized layer loading with better timing
        const layerSchedule = [
            { layer: 'hidden', delay: 0, priority: 1 },
            { layer: 'markers', delay: 100, priority: 2 },
            { layer: 'villageBounds', delay: 200, priority: 3 },
            { layer: 'regionsNames', delay: 300, priority: 4 },
            { layer: 'regionBorders', delay: 400, priority: 5 },
            { layer: 'pathsRoads', delay: 500, priority: 6 },
            { layer: 'base', delay: 1000, priority: 7 }
        ];
        
        layerSchedule.forEach(({ layer, delay, priority }) => {
                    setTimeout(() => {
                if (layer === 'markers') {
                    this.loadAllMarkerTypes(squareId);
                } else if (layer === 'villageBounds') {
                    this.loadAllVillageBounds(squareId);
                } else if (layer === 'pathsRoads') {
                        this.loadAllPathsRoads(squareId);
                } else {
                    this.loadLayerImage(squareId, layer);
                }
            }, delay);
        });
    }
    
    unloadSquares(squareIds) {
        squareIds.forEach(squareId => {
            // Remove from loaded set
            this.loadedSquares.delete(squareId);
            
            // Remove from map
            const square = this.squares.find(s => s.id === squareId);
            if (square) {
                this.map.removeLayer(square.rectangle);
                this.map.removeLayer(square.label);
                
                // Remove quadrants
                if (square.quadrants) {
                    square.quadrants.forEach(quadrant => {
                        this.map.removeLayer(quadrant.rectangle);
                        this.map.removeLayer(quadrant.label);
                    });
                }
                
                // Remove from squares array
                const index = this.squares.findIndex(s => s.id === squareId);
                if (index !== -1) {
                    this.squares.splice(index, 1);
                }
            }
            
            // Clear from layers
            Object.keys(this.layers).forEach(layerType => {
                const layerData = this.layers[layerType].get(squareId);
                if (layerData && layerData.overlay) {
                    this.map.removeLayer(layerData.overlay);
                }
                this.layers[layerType].delete(squareId);
            });
            
            // Clear from image cache
            this.imageCache.delete(squareId);
        });
    }

    loadMapImage(squareId) {
        const imageData = this.mapImages.get(squareId);
        if (!imageData || imageData.loaded) return;
        
        // Create the image overlay for the active layer
        const imageOverlay = L.imageOverlay(imageData.imageUrl, [
            [imageData.lat, imageData.lng],
            [imageData.lat - 1, imageData.lng + imageData.aspectRatio]
        ], {
            opacity: 0.9,
            className: 'map-image loading'
        });
        
        // Add to map
        imageOverlay.addTo(this.map);
        
        // Mark as loaded
        imageData.loaded = true;
        imageData.overlay = imageOverlay;
        
        // Clear blur effect after a short delay for smooth loading
        setTimeout(() => {
            imageOverlay.getElement().classList.remove('loading');
            imageOverlay.getElement().classList.add('loaded');
        }, 200);
    }
    
    loadLayerImage(squareId, layerType) {
        const layerData = this.layers[layerType].get(squareId);
        
        if (!layerData || layerData.loaded) return;
        
        // Check cache first
        const cacheKey = `${squareId}_${layerType}`;
        if (this.imageCache.has(cacheKey)) {
            const cachedData = this.imageCache.get(cacheKey);
            layerData.overlay = cachedData.overlay;
            layerData.loaded = true;
            cachedData.overlay.addTo(this.map);
            return;
        }
        
        // For markers layer, use simple loading (no canvas analysis due to CORS)
        if (layerType === 'markers') {
            this.loadMarkerImageSimple(squareId, layerData);
            return;
        }
        
        // Preload image for better performance
        this.preloadImage(layerData.imageUrl).then(() => {
        // Create the image overlay for the specific layer
        const imageOverlay = L.imageOverlay(layerData.imageUrl, [
            [layerData.lat, layerData.lng],
            [layerData.lat - 1, layerData.lng + layerData.aspectRatio]
        ], {
            opacity: 0.9,
            className: `map-image loading layer-${layerType}`
        });
        
        // Special handling for base layer - replace background rectangle
        if (layerType === 'base') {
            const mapData = this.mapImages.get(squareId);
            if (mapData && mapData.backgroundRectangle) {
                // Remove the background rectangle
                this.map.removeLayer(mapData.backgroundRectangle);
            }
        }
        
        // Add to map
        imageOverlay.addTo(this.map);
        
        // Mark as loaded
        layerData.loaded = true;
        layerData.overlay = imageOverlay;
            
            // Cache the overlay
            this.imageCache.set(cacheKey, { overlay: imageOverlay, timestamp: Date.now() });
        
        // Clear blur effect after a short delay for smooth loading
        setTimeout(() => {
            imageOverlay.getElement().classList.remove('loading');
            imageOverlay.getElement().classList.add('loaded');
        }, 200);
        }).catch(error => {
            console.warn(`Failed to load ${layerType} layer for ${squareId}:`, error);
            layerData.loaded = true; // Mark as loaded to prevent retries
        });
    }
    
    preloadImage(url) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const loadTime = Date.now() - startTime;
                this.performanceMetrics.imageLoadTimes.push(loadTime);
                this.performanceMetrics.totalImageLoadTime += loadTime;
                this.performanceMetrics.imagesLoaded++;
                
                console.log(`✅ Image loaded: ${url.split('/').pop()} (${loadTime}ms) - Size: ${img.width}x${img.height}`);
                this.updatePerformanceDisplay();
                resolve(img);
            };
            
            img.onerror = () => {
                const loadTime = Date.now() - startTime;
                this.performanceMetrics.imagesFailed++;
                console.error(`❌ Failed to load image: ${url} (${loadTime}ms)`);
                this.updatePerformanceDisplay();
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            img.src = url;
        });
    }
    
    // Clean up old cache entries to prevent memory leaks
    cleanupImageCache() {
        const maxCacheSize = 50;
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        if (this.imageCache.size > maxCacheSize) {
            const entries = Array.from(this.imageCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            // Remove oldest entries
            const toRemove = entries.slice(0, entries.length - maxCacheSize);
            toRemove.forEach(([key, data]) => {
                if (data.overlay) {
                    this.map.removeLayer(data.overlay);
                }
                this.imageCache.delete(key);
            });
        }
        
        // Remove expired entries
        const now = Date.now();
        for (const [key, data] of this.imageCache.entries()) {
            if (now - data.timestamp > maxAge) {
                if (data.overlay) {
                    this.map.removeLayer(data.overlay);
                }
                this.imageCache.delete(key);
            }
        }
    }
    
    async loadMarkerImageSimple(squareId, layerData, markerType) {
        try {
            // Create the image overlay directly through Leaflet
            const imageOverlay = L.imageOverlay(layerData.imageUrl, [
                [layerData.lat, layerData.lng],
                [layerData.lat - 1, layerData.lng + layerData.aspectRatio]
            ], {
                opacity: 0.9,
                className: `map-image layer-markers`
            });
            
            // Add to map
            imageOverlay.addTo(this.map);
            
            // Mark as loaded
            layerData.loaded = true;
            layerData.overlay = imageOverlay;
            
            // Add event listeners for loading states
            const imgElement = imageOverlay.getElement();
            if (imgElement) {
                imgElement.onload = () => {
                    imgElement.classList.add('loaded');
                };
                
                imgElement.onerror = () => {
                    // Remove the overlay if image failed to load
                    this.map.removeLayer(imageOverlay);
                    layerData.isEmpty = true;
                };
            }
            
        } catch (error) {
            layerData.loaded = true;
            layerData.isEmpty = true;
        }
    }
    
    async loadAllMarkerTypes(squareId) {
        const markerData = this.layers.markers.get(squareId);
        if (!markerData) return;
        
        // Only load markers that we know have content
        const validMarkers = {
            'H5': ['rudania'],
            'H8': ['inariko'],
            'F10': ['vhintl']
        };
        
        const markerTypesToLoad = validMarkers[squareId] || [];
        
        for (const markerType of markerTypesToLoad) {
            const layerData = markerData[markerType];
            if (layerData && !layerData.loaded) {
                await this.loadMarkerImageSimple(squareId, layerData, markerType);
            }
        }
    }

    async loadAllVillageBounds(squareId) {
        const villageBoundsData = this.layers.villageBounds.get(squareId);
        if (!villageBoundsData) return;
        
        // Only load village bounds for squares that actually have content
        const validVillageBounds = {
            'H5': {
                rudania: ['cyan', 'pink']
            },
            'I5': {
                rudania: ['cyan', 'pink']
            },
            'G8': {
                inariko: ['cyan', 'pink']
            },
            'H8': {
                inariko: ['cyan', 'pink']
            },
            'I8': {
                inariko: ['cyan']
            },
            'F9': {
                vhintl: ['cyan']
            },
            'F10': {
                vhintl: ['cyan', 'pink']
            },
            'G10': {
                vhintl: ['cyan']
            }
        };
        
        const boundsToLoad = validVillageBounds[squareId];
        if (!boundsToLoad) return;
        
        // Load only the village bounds that exist for this square
        for (const [village, colors] of Object.entries(boundsToLoad)) {
            for (const color of colors) {
                const layerData = villageBoundsData[village]?.[color];
                if (layerData && !layerData.loaded) {
                    await this.loadVillageBoundsImage(squareId, layerData, village, color);
                }
            }
        }
    }

    async loadVillageBoundsImage(squareId, layerData, village, color) {
        try {
            // Check if image exists and has content via server endpoint
            const response = await fetch(`/api/check-village-bounds/${village}/${color}/${squareId}`);
            const result = await response.json();
            
            if (result.exists && !result.isEmpty) {
                // Create image overlay for village bounds
                const bounds = [
                    [layerData.lat, layerData.lng],
                    [layerData.lat - 1, layerData.lng + layerData.aspectRatio]
                ];
                
                const imageOverlay = L.imageOverlay(layerData.imageUrl, bounds, {
                    className: `layer-village-bounds village-${village} color-${color}`,
                    opacity: 0.8
                });
                
                imageOverlay.addTo(this.map);
                layerData.overlay = imageOverlay;
                layerData.loaded = true;
            }
        } catch (error) {
            console.error(`Error loading village bounds ${village}-${color} for ${squareId}:`, error);
        }
    }

    async loadRegionsNames(squareId) {
        const regionsData = this.layers.regionsNames.get(squareId);
        if (!regionsData || regionsData.loaded) return;
        
        // Only load regions names for squares that actually have content
        const validRegionsNames = ['B10', 'C3', 'E6', 'G4', 'G7', 'G8', 'G10', 'H4', 'H7', 'H8'];
        
        if (!validRegionsNames.includes(squareId)) {
            return; // Skip loading for squares without regions names
        }
        
        try {
            // Since we know these squares have regions names content, load them directly
            // Create image overlay for regions names
            const bounds = [
                [regionsData.lat, regionsData.lng],
                [regionsData.lat - 1, regionsData.lng + regionsData.aspectRatio]
            ];
            
            const imageOverlay = L.imageOverlay(regionsData.imageUrl, bounds, {
                className: 'layer-regions-names',
                opacity: 0.9
            });
            
            imageOverlay.addTo(this.map);
            regionsData.overlay = imageOverlay;
            regionsData.loaded = true;
        } catch (error) {
            console.error(`Error loading regions names for ${squareId}:`, error);
        }
    }

    async loadRegionBorders(squareId) {
        const bordersData = this.layers.regionBorders.get(squareId);
        if (!bordersData || bordersData.loaded) return;
        
        // Only load region borders for squares that actually have content
        const validRegionBorders = [
            'A6', 'A7', 'A8', 'B6', 'B7', 'C5', 'C6', 'C7', 'C8', 'D4', 'D5', 'D8', 'D9',
            'E2', 'E3', 'E9', 'E10', 'E11', 'E12', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
            'F7', 'F8', 'F9', 'F10', 'G6', 'G9', 'H5', 'H6', 'H9', 'H10', 'I5', 'I6',
            'I10', 'J6', 'J10'
        ];
        
        if (!validRegionBorders.includes(squareId)) {
            return; // Skip loading for squares without region borders
        }
        
        try {
            // Check if image exists and has content via server endpoint
            const response = await fetch(`/api/check-region-borders/${squareId}`);
            const result = await response.json();
            
            if (result.exists && !result.isEmpty) {
                // Create image overlay for region borders
                const bounds = [
                    [bordersData.lat, bordersData.lng],
                    [bordersData.lat - 1, bordersData.lng + bordersData.aspectRatio]
                ];
                
                const imageOverlay = L.imageOverlay(bordersData.imageUrl, bounds, {
                    className: 'layer-region-borders',
                    opacity: 0.8
                });
                
                imageOverlay.addTo(this.map);
                bordersData.overlay = imageOverlay;
                bordersData.loaded = true;
            }
        } catch (error) {
            console.error(`Error loading region borders for ${squareId}:`, error);
        }
    }

    async loadAllPathsRoads(squareId) {
        const pathsRoadsData = this.layers.pathsRoads.get(squareId);
        if (!pathsRoadsData) return;
        
        // Only load paths/roads for squares that actually have content
        const validPathsRoads = {
            'G6': ['psl'],
            'H5': ['psl', 'otherPaths'],
            'H6': ['psl'],
            'H7': ['psl'],
            'H8': ['psl', 'ldw', 'otherPaths'],
            'F10': ['ldw'],
            'G8': ['ldw'],
            'G9': ['ldw'],
            'G10': ['ldw'],
            'G11': ['ldw'],
            'H9': ['ldw'],
            'H10': ['ldw'],
            'H4': ['otherPaths'],
            'I8': ['otherPaths']
        };
        
        const pathsToLoad = validPathsRoads[squareId];
        if (!pathsToLoad) {
            return; // Skip loading for squares without paths/roads
        }
        
        // Load only the path types that exist for this square
        for (const pathType of pathsToLoad) {
            const layerData = pathsRoadsData[pathType];
            if (layerData && !layerData.loaded) {
                await this.loadPathRoadImage(squareId, layerData, pathType);
            }
        }
    }

    async loadPathRoadImage(squareId, layerData, pathType) {
        try {
            // Check if image exists and has content via server endpoint
            const response = await fetch(`/api/check-paths-roads/${pathType}/${squareId}`);
            const result = await response.json();
            
            if (result.exists && !result.isEmpty) {
                // Create image overlay for paths/roads
                const bounds = [
                    [layerData.lat, layerData.lng],
                    [layerData.lat - 1, layerData.lng + layerData.aspectRatio]
                ];
                
                const imageOverlay = L.imageOverlay(layerData.imageUrl, bounds, {
                    className: `layer-paths-roads path-${pathType}`,
                    opacity: 0.9
                });
                
                imageOverlay.addTo(this.map);
                layerData.overlay = imageOverlay;
                layerData.loaded = true;
            }
        } catch (error) {
            console.error(`Error loading paths/roads ${pathType} for ${squareId}:`, error);
        }
    }

    // Loading screen management
    showLoadingScreen() {
        const loadingOverlay = document.getElementById('map-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }
    }
    
    hideLoadingScreen() {
        const loadingOverlay = document.getElementById('map-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            // Remove from DOM after transition completes
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 500); // Match CSS transition duration
        }
    }

    // Hidden areas layer is permanent and cannot be toggled
    
    bringGridToFront(squareId) {
        // CSS z-index handles layering automatically - no complex JavaScript needed
    }
    
    bringAllGridsToFront() {
        // CSS z-index handles layering automatically - no complex JavaScript needed
    }

    // Removed isSquareInViewport method - now using inline optimized checks

    setupViewportHandlers() {
        // Advanced debouncing with different strategies for move vs zoom
        let moveTimeout = null;
        let zoomTimeout = null;
        let isMoving = false;
        let isZooming = false;
        
        // Optimized move handler
        const debouncedMove = () => {
            if (moveTimeout) {
                clearTimeout(moveTimeout);
            }
            
            isMoving = true;
            moveTimeout = setTimeout(() => {
                this.loadSquaresInViewport();
                isMoving = false;
            }, 150); // Slightly longer debounce for moves
        };
        
        // Optimized zoom handler
        const debouncedZoom = () => {
            if (zoomTimeout) {
                clearTimeout(zoomTimeout);
            }
            
            isZooming = true;
            zoomTimeout = setTimeout(() => {
                this.loadSquaresInViewport();
                this.updateTextSizes(); // Update text sizes after zoom
                isZooming = false;
            }, 100); // Faster debounce for zoom
        };
        
        // Add move start/end events for better UX
        this.map.on('movestart', () => {
            isMoving = true;
        });
        
        this.map.on('moveend', debouncedMove);
        
        this.map.on('zoomstart', () => {
            isZooming = true;
        });
        
        this.map.on('zoomend', debouncedZoom);
        
        // Add resize handler for window changes
        window.addEventListener('resize', debouncedMove);
        
        // Add visibility change handler to pause loading when tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause loading when tab is hidden
                if (moveTimeout) clearTimeout(moveTimeout);
                if (zoomTimeout) clearTimeout(zoomTimeout);
            } else {
                // Resume loading when tab becomes visible
                this.loadSquaresInViewport();
            }
        });
        
        // Set up periodic performance monitoring
        setInterval(() => {
            this.updatePerformanceDisplay();
        }, 2000); // Update every 2 seconds
    }

    createSquare(squareId, colIndex, rowIndex, squareWidth, squareHeight, pixelToDegrees) {
        // Calculate exact positioning for seamless grid using simple coordinates
        // Map coordinates: [0,0] to [12,10*aspectRatio] for 12 rows x 10 columns with correct aspect ratio
        
        const aspectRatio = 2400 / 1666; // ≈ 1.44
        
        // Calculate square position (no gaps)
        const lat = 12 - rowIndex; // Top row is 12, bottom row is 1
        const lng = colIndex * aspectRatio; // Left column is 0, right column is 9*aspectRatio
        
        // Create a colored background rectangle instead of loading base map immediately
        const backgroundRectangle = L.rectangle([
            [lat, lng],
            [lat - 1, lng + aspectRatio] // Correct aspect ratio
        ], {
            color: 'transparent',
            fillColor: '#2D2D2D', // Dark background color
            fillOpacity: 1,
            className: 'map-background',
            weight: 0
        });
        
        // Create Zelda realm square border with BOTW styling
        const rectangle = L.rectangle([
            [lat, lng],
            [lat - 1, lng + aspectRatio] // Match the image overlay
        ], {
            color: '#00A3DA', // BOTW blue border
            fillColor: 'transparent', // Transparent fill to show map image
            fillOpacity: 0,
            weight: 2, // Slightly thicker for Zelda aesthetic
            className: 'zelda-square loading', // CSS handles z-index automatically, start with loading state
            opacity: 0.9
        });

        // Add label in center
        const centerLat = lat - 0.5; // Center of the square
        const centerLng = lng + (aspectRatio / 2); // Center of the square with correct aspect ratio
        
        const label = L.marker([centerLat, centerLng], {
            icon: L.divIcon({
                html: `<div style="color: #00A3DA; font-weight: bold; text-align: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,163,218,0.5); white-space: nowrap; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-family: 'Cinzel', serif; font-size: 14px;">${squareId}</div>`,
                className: 'zelda-label',
                iconSize: [100, 50], // Smaller, more precise icon container
                iconAnchor: [50, 25] // Perfect center (half of iconSize)
            })
        });

        // Create quadrants within the square
        const quadrants = this.createQuadrants(lat, lng, squareWidth, squareHeight, pixelToDegrees, squareId);
        
        // Add to map (background, rectangle and label)
        backgroundRectangle.addTo(this.map);
        rectangle.addTo(this.map);
        label.addTo(this.map);
        
        // Store the actual map image URL for later loading
        const imageUrl = this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0002_Map-Base/MAP_0002_Map-Base_${squareId}.png`);
        
        // Store reference for later image loading
        this.mapImages.set(squareId, {
            imageUrl: imageUrl,
            lat: lat,
            lng: lng,
            aspectRatio: aspectRatio,
            loaded: false,
            backgroundRectangle: backgroundRectangle
        });
        
        // Store layer data for both base and hidden layers
        this.layers.base.set(squareId, {
            imageUrl: imageUrl,
            lat: lat,
            lng: lng,
            aspectRatio: aspectRatio,
            loaded: false
        });
        
        this.layers.hidden.set(squareId, {
            imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0001_hidden-areas/MAP_0001_hidden-areas_${squareId}.png`),
            lat: lat,
            lng: lng,
            aspectRatio: aspectRatio,
            loaded: false
        });
        
        // Only store marker data for squares that actually have markers
        const validMarkers = {
            'H5': {
                rudania: {
                    imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0001s_0000_Rudania-Marker/MAP_0001s_0000_Rudania-Marker_${squareId}.png`),
                    lat: lat,
                    lng: lng,
                    aspectRatio: aspectRatio,
                    loaded: false
                }
            },
            'H8': {
                inariko: {
                    imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0001s_0001_Inariko-Marker/MAP_0001s_0001_Inariko-Marker_${squareId}.png`),
                    lat: lat,
                    lng: lng,
                    aspectRatio: aspectRatio,
                    loaded: false
                }
            },
            'F10': {
                vhintl: {
                    imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0001s_0002_Vhintl-Marker/MAP_0001s_0002_Vhintl-Marker_${squareId}.png`),
                    lat: lat,
                    lng: lng,
                    aspectRatio: aspectRatio,
                    loaded: false
                }
            }
        };
        
        if (validMarkers[squareId]) {
            this.layers.markers.set(squareId, validMarkers[squareId]);
        }
        
        // Store village bounds data for all squares (will be filtered during loading)
        const villageBoundsData = {
            inariko: {
                cyan: {
                    imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0002s_0000s_0000_CIRCLE-INARIKO-CYAN/MAP_0002s_0000s_0000_CIRCLE-INARIKO-CYAN_${squareId}.png`),
                    lat: lat,
                    lng: lng,
                    aspectRatio: aspectRatio,
                    loaded: false,
                    type: 'dangerous'
                },
                pink: {
                    imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0002s_0000s_0001_CIRCLE-INARIKO-PINK/MAP_0002s_0000s_0001_CIRCLE-INARIKO-PINK_${squareId}.png`),
                    lat: lat,
                    lng: lng,
                    aspectRatio: aspectRatio,
                    loaded: false,
                    type: 'safe'
                }
            },
            vhintl: {
                cyan: {
                    imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0002s_0001s_0000_CIRCLE-VHINTL-CYAN/MAP_0002s_0001s_0000_CIRCLE-VHINTL-CYAN_${squareId}.png`),
                    lat: lat,
                    lng: lng,
                    aspectRatio: aspectRatio,
                    loaded: false,
                    type: 'dangerous'
                },
                pink: {
                    imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0002s_0001s_0001_CIRCLE-VHINTL-PINK/MAP_0002s_0001s_0001_CIRCLE-VHINTL-PINK_${squareId}.png`),
                    lat: lat,
                    lng: lng,
                    aspectRatio: aspectRatio,
                    loaded: false,
                    type: 'safe'
                }
            },
            rudania: {
                cyan: {
                    imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0002s_0002s_0000_CIRCLE-RUDANIA-CYAN/MAP_0002s_0002s_0000_CIRCLE-RUDANIA-CYAN_${squareId}.png`),
                    lat: lat,
                    lng: lng,
                    aspectRatio: aspectRatio,
                    loaded: false,
                    type: 'dangerous'
                },
                pink: {
                    imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0002s_0002s_0001_CIRCLE-RUDANIA-PINK/MAP_0002s_0002s_0001_CIRCLE-RUDANIA-PINK_${squareId}.png`),
                    lat: lat,
                    lng: lng,
                    aspectRatio: aspectRatio,
                    loaded: false,
                    type: 'safe'
                }
            }
        };
        
        this.layers.villageBounds.set(squareId, villageBoundsData);
        
        // Store regions names data for all squares (will be filtered during loading)
        this.layers.regionsNames.set(squareId, {
            imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0001s_0004_REGIONS-NAMES/MAP_0001s_0004_REGIONS-NAMES_${squareId}.png`),
            lat: lat,
            lng: lng,
            aspectRatio: aspectRatio,
            loaded: false
        });
        
        // Store region borders data for all squares (will be filtered during loading)
        this.layers.regionBorders.set(squareId, {
            imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0001s_0003_Region-Borders/MAP_0001s_0003_Region-Borders_${squareId}.png`),
            lat: lat,
            lng: lng,
            aspectRatio: aspectRatio,
            loaded: false
        });
        
        // Store paths/roads data for all squares (will be filtered during loading)
        const pathsRoadsData = {
            psl: {
                imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0003s_0000_PSL/MAP_0003s_0000_PSL_${squareId}.png`),
                lat: lat,
                lng: lng,
                aspectRatio: aspectRatio,
                loaded: false,
                type: 'PSL'
            },
            ldw: {
                imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0003s_0001_LDW/MAP_0003s_0001_LDW_${squareId}.png`),
                lat: lat,
                lng: lng,
                aspectRatio: aspectRatio,
                loaded: false,
                type: 'LDW'
            },
            otherPaths: {
                imageUrl: this.getProxyUrl(`https://storage.googleapis.com/tinglebot/maps/squares/MAP_0003s_0002_Other-Paths/MAP_0003s_0002_Other-Paths_${squareId}.png`),
                lat: lat,
                lng: lng,
                aspectRatio: aspectRatio,
                loaded: false,
                type: 'Other-Paths'
            }
        };
        
        this.layers.pathsRoads.set(squareId, pathsRoadsData);
        
        // Clear blur effect after a short delay for smooth loading
        setTimeout(() => {
            rectangle.getElement().classList.remove('loading');
            rectangle.getElement().classList.add('loaded');
            label.getElement().classList.add('loaded');
        }, 200); // 200ms delay for smooth blur-to-clear transition
        
        // Add quadrants to map with a small delay to ensure they're above square borders
        setTimeout(() => {
            quadrants.forEach(quadrant => {
                quadrant.rectangle.addTo(this.map);
                quadrant.label.addTo(this.map);
                
                // Bring quadrant rectangles to front to ensure they're above map images
                quadrant.rectangle.bringToFront();
            });
        }, 50);
        
        // Store reference
        this.squares.push({
            id: squareId,
            rectangle: rectangle,
            label: label,
            quadrants: quadrants,
            lat: lat,
            lng: lng,
            width: squareWidth,
            height: squareHeight
        });
        
        // Square creation complete
    }

    createQuadrants(lat, lng, squareWidth, squareHeight, pixelToDegrees, squareId) {
        const quadrants = [];
        const aspectRatio = 2400 / 1666; // ≈ 1.44
        
        // Calculate quadrant dimensions (half the square size with correct aspect ratio)
        const quadrantWidth = aspectRatio / 2; // Half the aspect ratio
        const quadrantHeight = 0.5; // Half the height
        
        // Q1: Top Left
        const q1Lat = lat;
        const q1Lng = lng;
        const q1 = this.createQuadrant('Q1', q1Lat, q1Lng, quadrantWidth, quadrantHeight, pixelToDegrees, squareId);
        quadrants.push(q1);
        
        // Q2: Top Right
        const q2Lat = lat;
        const q2Lng = lng + quadrantWidth;
        const q2 = this.createQuadrant('Q2', q2Lat, q2Lng, quadrantWidth, quadrantHeight, pixelToDegrees, squareId);
        quadrants.push(q2);
        
        // Q3: Bottom Left
        const q3Lat = lat - quadrantHeight;
        const q3Lng = lng;
        const q3 = this.createQuadrant('Q3', q3Lat, q3Lng, quadrantWidth, quadrantHeight, pixelToDegrees, squareId);
        quadrants.push(q3);
        
        // Q4: Bottom Right
        const q4Lat = lat - quadrantHeight;
        const q4Lng = lng + quadrantWidth;
        const q4 = this.createQuadrant('Q4', q4Lat, q4Lng, quadrantWidth, quadrantHeight, pixelToDegrees, squareId);
        quadrants.push(q4);
        
        return quadrants;
    }

    createQuadrant(quadrantId, lat, lng, width, height, pixelToDegrees, squareId) {
        // Create quadrant rectangle with correct aspect ratio
        const rectangle = L.rectangle([
            [lat, lng],
            [lat - height, lng + width] // Use simple coordinates with correct aspect ratio
        ], {
            color: '#D4AF37', // Light gold color for Zelda theme
            fillColor: 'transparent',
            fillOpacity: 0,
            weight: 1.5, // Slightly thicker for better visibility
            className: 'quadrant-border' // CSS handles z-index automatically
        });

        // Calculate precise corner positions for each quadrant with correct aspect ratio
        const quadrantWidth = width; // Already in correct aspect ratio
        const quadrantHeight = height; // Already in correct aspect ratio
        
        let labelLat, labelLng, textAlign, iconSize, iconAnchor;
        
        if (quadrantId === 'Q1') {
            // Top-left corner - position exactly at corner
            labelLat = lat - (quadrantHeight * 0.05); // 5% from top edge
            labelLng = lng + (quadrantWidth * 0.05); // 5% from left edge
            textAlign = 'left';
            iconSize = [30, 15];
            iconAnchor = [0, 0]; // Top-left anchor
        } else if (quadrantId === 'Q2') {
            // Top-right corner - position exactly at corner
            labelLat = lat - (quadrantHeight * 0.05); // 5% from top edge
            labelLng = lng + (quadrantWidth * 0.95); // 95% from left edge (right side)
            textAlign = 'right';
            iconSize = [30, 15];
            iconAnchor = [30, 0]; // Top-right anchor
        } else if (quadrantId === 'Q3') {
            // Bottom-left corner - position exactly at corner
            labelLat = lat - (quadrantHeight * 0.95); // 95% from top edge (bottom side)
            labelLng = lng + (quadrantWidth * 0.05); // 5% from left edge
            textAlign = 'left';
            iconSize = [30, 15];
            iconAnchor = [0, 15]; // Bottom-left anchor
        } else if (quadrantId === 'Q4') {
            // Bottom-right corner - position exactly at corner
            labelLat = lat - (quadrantHeight * 0.95); // 95% from top edge (bottom side)
            labelLng = lng + (quadrantWidth * 0.95); // 95% from left edge (right side)
            textAlign = 'right';
            iconSize = [30, 15];
            iconAnchor = [30, 15]; // Bottom-right anchor
        }
        
        const label = L.marker([labelLat, labelLng], {
            icon: L.divIcon({
                html: `<div style="color: white; font-weight: bold; text-align: ${textAlign}; font-size: 10px; text-shadow: 1px 1px 2px rgba(0,0,0,0.9); pointer-events: none; line-height: 1; white-space: nowrap;">${quadrantId}</div>`,
                className: 'quadrant-label',
                iconSize: iconSize,
                iconAnchor: iconAnchor
            })
        });

        return {
            id: quadrantId,
            rectangle: rectangle,
            label: label,
            lat: lat,
            lng: lng
        };
    }

    setupZoomHandlers() {
        // Update text size when zoom changes
        this.map.on('zoomend', () => {
            this.updateTextSizes();
        });
        
        // Initial text size update
        setTimeout(() => {
            this.updateTextSizes();
        }, 100);
    }

    updateTextSizes() {
        const startTime = performance.now();
        const zoom = this.map.getZoom();
        
        // Calculate appropriate font size based on zoom level
        let fontSize = this.calculateFontSize(zoom);
        let quadrantFontSize = this.calculateQuadrantFontSize(zoom);
        
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            // Batch DOM updates for better performance
            const updates = [];
            
        this.squares.forEach(square => {
                // Square label updates
                const squareUpdate = {
                    label: square.label,
                    fontSize: fontSize,
                    show: fontSize > 0
                };
                updates.push(squareUpdate);
                
                // Quadrant label updates
                if (square.quadrants) {
                    square.quadrants.forEach(quadrant => {
                        const quadrantUpdate = {
                            label: quadrant.label,
                            fontSize: quadrantFontSize,
                            show: quadrantFontSize > 0
                        };
                        updates.push(quadrantUpdate);
                    });
                }
            });
            
            // Apply all updates in a single batch
            this.applyTextUpdates(updates);
            
            // Update zoom level indicator
            this.updateZoomIndicator(zoom, fontSize, quadrantFontSize);
            
            // Track performance
            const renderTime = performance.now() - startTime;
            this.performanceMetrics.renderTimes.push(renderTime);
            if (this.performanceMetrics.renderTimes.length > 100) {
                this.performanceMetrics.renderTimes.shift();
            }
            
            // Update performance display
            this.updatePerformanceDisplay();
            
            // Clean up cache periodically
            if (Math.random() < 0.1) { // 10% chance
                this.cleanupImageCache();
            }
        });
    }
    
    applyTextUpdates(updates) {
        // Apply updates with minimal DOM manipulation
        updates.forEach(update => {
            const { label, fontSize, show } = update;
            const element = label.getElement();
            
            if (!element) return;
            
            if (show) {
                element.style.display = 'block';
                label.setOpacity(1);
                
                const textDiv = element.querySelector('div');
                    if (textDiv) {
                        textDiv.style.fontSize = fontSize + 'px';
                    textDiv.style.visibility = 'visible';
                    textDiv.style.opacity = '1';
                }
            } else {
                element.style.display = 'none';
                label.setOpacity(0);
            }
        });
    }
    
    // Performance monitoring methods
    getPerformanceMetrics() {
        const avgLoadTime = this.performanceMetrics.loadTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.loadTimes.length;
        const avgRenderTime = this.performanceMetrics.renderTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.renderTimes.length;
        const avgImageLoadTime = this.performanceMetrics.imageLoadTimes.length > 0 
            ? this.performanceMetrics.imageLoadTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.imageLoadTimes.length 
            : 0;
        
        return {
            avgLoadTime: avgLoadTime || 0,
            avgRenderTime: avgRenderTime || 0,
            loadedSquares: this.loadedSquares.size,
            cacheSize: this.imageCache.size,
            memoryUsage: this.getMemoryUsage(),
            imagesLoaded: this.performanceMetrics.imagesLoaded,
            imagesFailed: this.performanceMetrics.imagesFailed,
            avgImageLoadTime: avgImageLoadTime,
            totalImageLoadTime: this.performanceMetrics.totalImageLoadTime
        };
    }
    
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }
    
    // Update performance metrics display
    updatePerformanceDisplay() {
        const metrics = this.getPerformanceMetrics();
        
        // Update individual metric elements
        const loadTimeElement = document.getElementById('load-time');
        const renderTimeElement = document.getElementById('render-time');
        const loadedSquaresElement = document.getElementById('loaded-squares');
        const cacheSizeElement = document.getElementById('cache-size');
        const imagesLoadedElement = document.getElementById('images-loaded');
        const imageLoadTimeElement = document.getElementById('image-load-time');
        const memoryElement = document.getElementById('memory-value');
        const memoryUsageDiv = document.getElementById('memory-usage');
        
        if (loadTimeElement) {
            loadTimeElement.textContent = `${metrics.avgLoadTime.toFixed(1)}ms`;
            loadTimeElement.className = `metric-value ${this.getPerformanceClass(metrics.avgLoadTime, [0, 50, 100])}`;
        }
        
        if (renderTimeElement) {
            renderTimeElement.textContent = `${metrics.avgRenderTime.toFixed(1)}ms`;
            renderTimeElement.className = `metric-value ${this.getPerformanceClass(metrics.avgRenderTime, [0, 10, 25])}`;
        }
        
        if (loadedSquaresElement) {
            loadedSquaresElement.textContent = metrics.loadedSquares;
            loadedSquaresElement.className = `metric-value ${this.getPerformanceClass(metrics.loadedSquares, [0, 20, 50])}`;
        }
        
        if (cacheSizeElement) {
            cacheSizeElement.textContent = metrics.cacheSize;
            cacheSizeElement.className = `metric-value ${this.getPerformanceClass(metrics.cacheSize, [0, 20, 50])}`;
        }
        
        if (imagesLoadedElement) {
            const totalImages = metrics.imagesLoaded + metrics.imagesFailed;
            imagesLoadedElement.textContent = `${metrics.imagesLoaded}${metrics.imagesFailed > 0 ? `/${totalImages}` : ''}`;
            imagesLoadedElement.className = `metric-value ${this.getPerformanceClass(metrics.imagesLoaded, [0, 10, 20])}`;
        }
        
        if (imageLoadTimeElement) {
            imageLoadTimeElement.textContent = `${metrics.avgImageLoadTime.toFixed(1)}ms`;
            imageLoadTimeElement.className = `metric-value ${this.getPerformanceClass(metrics.avgImageLoadTime, [0, 100, 500])}`;
        }
        
        if (metrics.memoryUsage && memoryElement && memoryUsageDiv) {
            memoryElement.textContent = `${metrics.memoryUsage.used}MB / ${metrics.memoryUsage.total}MB`;
            memoryElement.className = `metric-value ${this.getPerformanceClass(metrics.memoryUsage.used, [0, 50, 100])}`;
            memoryUsageDiv.style.display = 'block';
        }
    }
    
    getPerformanceClass(value, thresholds) {
        if (value <= thresholds[0]) return 'good';
        if (value <= thresholds[1]) return 'warning';
        return 'critical';
    }
    
    // Debug method to log performance metrics
    logPerformanceMetrics() {
        const metrics = this.getPerformanceMetrics();
        console.log('Map Performance Metrics:', metrics);
        this.updatePerformanceDisplay();
    }

    calculateFontSize(zoom) {
        // Hide square labels until zoom level 6
        
        if (zoom < 6) {
            return 0; // Hide square labels until zoom level 6
        } else if (zoom < 7) {
            return 14; // Show square labels at zoom level 6
        } else if (zoom < 8) {
            return 16; // Larger text
        } else {
            return 18; // Large text
        }
    }

    calculateQuadrantFontSize(zoom) {
        // Hide quadrant labels until zoom level 8
        
        if (zoom < 8) {
            return 0; // Hide quadrant labels until zoom level 8
        } else if (zoom < 9) {
            return 14; // Show quadrant labels at zoom level 8
        } else if (zoom < 10) {
            return 16; // Larger text at zoom level 9
        } else {
            return 18; // Large text at zoom level 10+
        }
    }

    updateZoomIndicator(zoom, fontSize, quadrantFontSize) {
        // Update zoom level display
        const zoomLevelElement = document.getElementById('zoom-level');
        const viewStatusElement = document.getElementById('view-status');
        const zoomDescriptionElement = document.getElementById('zoom-description');
        
        if (zoomLevelElement) {
            zoomLevelElement.textContent = zoom.toFixed(1);
        }
        
        if (viewStatusElement && zoomDescriptionElement) {
            let status, description;
            
            if (zoom < 3) {
                status = 'Very Zoomed Out';
                description = 'Clean grid view - no labels visible';
            } else if (zoom < 4) {
                status = 'Zoomed Out';
                description = 'Clean grid view - no labels visible';
            } else if (zoom < 5) {
                status = 'Default View';
                description = 'Clean grid view - no labels visible';
            } else if (zoom < 6) {
                status = 'Zoomed In';
                description = 'Clean grid view - no labels visible';
            } else if (zoom < 7) {
                status = 'Well Zoomed In';
                description = 'Square labels visible (A1-J12)';
            } else if (zoom < 8) {
                status = 'Close View';
                description = 'Square labels visible (A1-J12)';
            } else {
                status = 'Detailed View';
                description = 'All labels visible (A1-J12, Q1-Q4)';
            }
            
            viewStatusElement.textContent = status;
            zoomDescriptionElement.textContent = description;
        }
    }
}
function updateTextSizes(zoom) {
    let fontSize = this.calculateFontSize(zoom);
    let quadrantFontSize = this.calculateQuadrantFontSize(zoom);

    // Update all square labels
    this.squares.forEach(square => {
        if (fontSize <= 0) {
            // Completely hide square labels when zoomed out
            if (square.label.getElement()) {
                square.label.getElement().style.display = 'none';
            }
            square.label.setOpacity(0);
        } else {
            // Show square labels when zoomed in enough
            if (square.label.getElement()) {
                square.label.getElement().style.display = 'block';
            }
            square.label.setOpacity(1);

            const labelDiv = square.label.getElement();
            if (labelDiv) {
                const textDiv = labelDiv.querySelector('div');
                if (textDiv) {
                    textDiv.style.fontSize = fontSize + 'px';
                }
            }
        }

        // Update quadrant labels - hide them when zoomed out
        if (square.quadrants) {
            square.quadrants.forEach(quadrant => {
                if (quadrantFontSize <= 0) {
                    // Completely hide quadrant labels when zoomed out
                    if (quadrant.label.getElement()) {
                        quadrant.label.getElement().style.display = 'none';
                    }
                    quadrant.label.setOpacity(0);
                } else {
                    // Show quadrant labels when zoomed in enough
                    if (quadrant.label.getElement()) {
                        quadrant.label.getElement().style.display = 'block';
                    }
                    quadrant.label.setOpacity(1);

                    const quadrantLabelDiv = quadrant.label.getElement();
                    if (quadrantLabelDiv) {
                        const quadrantTextDiv = quadrantLabelDiv.querySelector('div');
                        if (quadrantTextDiv) {
                            quadrantTextDiv.style.display = 'block';
                            quadrantTextDiv.style.visibility = 'visible';
                            quadrantTextDiv.style.opacity = '1';
                            quadrantTextDiv.style.fontSize = quadrantFontSize + 'px';
                        }
                    }
                }
            });
        }
    });

    // Text sizes updated for zoom level
    // Update zoom level indicator
    this.updateZoomIndicator(zoom, fontSize, quadrantFontSize);
}

function calculateFontSize(zoom) {
    // Hide square labels until zoom level 6
    if (zoom < 6) {
        return 0; // Hide square labels until zoom level 6
    } else if (zoom < 7) {
        return 14; // Show square labels at zoom level 6
    } else if (zoom < 8) {
        return 16; // Larger text
    } else {
        return 18; // Large text
    }
}

function calculateQuadrantFontSize(zoom) {
    // Hide quadrant labels until zoom level 8
    if (zoom < 8) {
        return 0; // Hide quadrant labels until zoom level 8
    } else if (zoom < 9) {
        return 14; // Show quadrant labels at zoom level 8
    } else if (zoom < 10) {
        return 16; // Larger text at zoom level 9
    } else {
        return 18; // Large text at zoom level 10+
    }
}

function updateZoomIndicator(zoom, fontSize, quadrantFontSize) {
    // Update zoom level display
    const zoomLevelElement = document.getElementById('zoom-level');
    const viewStatusElement = document.getElementById('view-status');
    const zoomDescriptionElement = document.getElementById('zoom-description');

    if (zoomLevelElement) {
        zoomLevelElement.textContent = zoom.toFixed(1);
    }

    if (viewStatusElement && zoomDescriptionElement) {
        let status, description;

        if (zoom < 3) {
            status = 'Very Zoomed Out';
            description = 'Clean grid view - no labels visible';
        } else if (zoom < 4) {
            status = 'Zoomed Out';
            description = 'Clean grid view - no labels visible';
        } else if (zoom < 5) {
            status = 'Default View';
            description = 'Clean grid view - no labels visible';
        } else if (zoom < 6) {
            status = 'Zoomed In';
            description = 'Clean grid view - no labels visible';
        } else if (zoom < 7) {
            status = 'Well Zoomed In';
            description = 'Square labels visible (A1-J12)';
        } else if (zoom < 8) {
            status = 'Close View';
            description = 'Square labels visible (A1-J12)';
        } else {
            status = 'Detailed View';
            description = 'All labels visible (A1-J12, Q1-Q4)';
        }

        viewStatusElement.textContent = status;
        zoomDescriptionElement.textContent = description;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Leaflet to be available
    const initMap = () => {
        if (typeof L !== 'undefined') {
            window.mapInstance = new SimpleMap();
            window.mapInstance.init();
        } else {
            // Retry after a short delay if Leaflet isn't ready yet
            setTimeout(initMap, 100);
        }
    };
    initMap();
});

