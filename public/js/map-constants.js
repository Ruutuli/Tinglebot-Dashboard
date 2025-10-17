/**
 * Map Constants - Configuration for the Leaflet image-space map system
 * Single source of truth for all configurable values
 */


const MAP_CONFIG = {
    // Canvas and Grid Dimensions
    SQUARE_W: 2400,
    SQUARE_H: 1666,
    CANVAS_W: 24000,
    CANVAS_H: 20000,
    
    // Grid Configuration
    GRID_COLS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    GRID_ROWS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    
    // Loading Configuration
    DEBOUNCE_MS: 150,
    BATCH_SIZE: 10,
    BUFFER_SQUARES: 0.5,
    
    // Zoom Limits and Thresholds
    MIN_ZOOM: -3,            // Maximum zoom out level
    MAX_ZOOM: 0,             // Maximum zoom in level
    LABEL_ZOOM_SQUARES: -3,  // Show A1 labels at zoom -3
    LABEL_ZOOM_QUADS: -2,    // Show quadrant labels at zoom -2
    
    // Cache Configuration
    CACHE_SQUARES_SOFTCAP: 200,
    
    // Animation Configuration
    FADE_MS: 160,
    
    // Layer Names (in z-index order, top to bottom)
    LAYER_ORDER: [
        'quadrant-labels',
        'square-labels', 
        'grid-lines',
        'region-names',
        'village-markers',  // Above village borders
        'village-borders-inner',  // Inner village borders (pink)
        'village-borders-outer',  // Outer village borders (cyan)
        'region-borders',
        'paths',
        'mask',        // Fog/hidden areas - above blight
        'blight',      // Blight areas - above base
        'base',
        'background'
    ],
    
    // Layer Visibility Defaults
    LAYER_DEFAULTS: {
        'grid-lines': true,
        'square-labels': true,
        'quadrant-cross': true,
        'quadrant-labels': true,
        'paths': true,
        'region-borders': true,
        'village-borders-inner': true,
        'village-borders-outer': true,
        'village-markers': true,
        'region-names': true,
        'blight': true,
        'MAP_0003s_0000_PSL': true,
        'MAP_0003s_0001_LDW': true,
        'MAP_0003s_0002_Other-Paths': true
    },
    
    // Google Cloud Storage Configuration
    GCS_BUCKET_NAME: 'tinglebot',  // Your GCS bucket name
    GCS_BASE_URL: 'https://storage.googleapis.com',  // GCS base URL
    GCS_IMAGES_PATH: 'maps/squares/',  // Path to images in GCS
    
    // Fallback URLs (for development or if GCS is unavailable)
    FALLBACK_MANIFEST_URL: '/manifest/squares.json',
    
    
    // Performance Configuration
    PREVIEW_ZOOM_THRESHOLD: -1,  // Use preview images below this zoom (zoom out levels)
    CROSSFADE_THRESHOLD: -2,     // Start crossfading at this zoom
    
    // Font Sizes by Zoom Level
    // -3 = Maximum zoom out, 0 = Maximum zoom in
    FONT_SIZES: {
        squareLabels: {
            '-3': 24,  // Medium for maximum zoom out
            '-2': 32,  // Large for zoom out
            '-1': 40,  // Very large for medium zoom
            0: 48      // Maximum size for zoom in
        },
        quadrantLabels: {
            '-3': 12,  // Small for maximum zoom out
            '-2': 16,  // Medium for zoom out
            '-1': 20,  // Large for medium zoom
            0: 24      // Maximum size for zoom in
        }
    }
};

// Derived Constants
MAP_CONFIG.TOTAL_SQUARES = MAP_CONFIG.GRID_COLS.length * MAP_CONFIG.GRID_ROWS.length;
MAP_CONFIG.QUADRANT_W = MAP_CONFIG.SQUARE_W / 2;
MAP_CONFIG.QUADRANT_H = MAP_CONFIG.SQUARE_H / 2;

// Canvas Bounds for Leaflet
MAP_CONFIG.CANVAS_BOUNDS = [
    [0, 0],                    // Southwest corner
    [MAP_CONFIG.CANVAS_H, MAP_CONFIG.CANVAS_W]  // Northeast corner
];

// GCS URL Helper Functions

MAP_CONFIG.getGCSImageURL = function(squareId, layerName, isPreview = false) {
    const suffix = isPreview ? '_preview' : '';
    
    // Generate URL based on your actual structure: MAP_0002_Map-Base/MAP_0002_Map-Base_A1.png
    // Layer name format: MAP_0002_Map-Base -> MAP_0002_Map-Base_A1.png
    const layerPrefix = layerName; // e.g., "MAP_0002_Map-Base"
    const filename = `${layerPrefix}_${squareId}${suffix}.png`;
    return `${this.GCS_BASE_URL}/${this.GCS_BUCKET_NAME}/${this.GCS_IMAGES_PATH}${layerPrefix}/${filename}`;
};

MAP_CONFIG.getFallbackManifestURL = function() {
    return this.FALLBACK_MANIFEST_URL;
};


// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MAP_CONFIG;
}

