/**
 * Map Toggles - UI state and visibility management
 * Handles layer toggles, grid visibility, and label controls
 */

class MapToggles {
    constructor(config, layers) {
        this.config = config;
        this.layers = layers;
        
        // Toggle state (defaults from config)
        this.state = { ...this.config.LAYER_DEFAULTS };
        
        // UI elements
        this.toggleContainer = null;
        this.toggleElements = new Map();
        
        // Event listeners
        this.listeners = new Map();
        
        this.initialize();
    }
    
    /**
     * Initialize toggles and create UI
     */
    initialize() {
        this._createToggleUI();
        this._applyInitialState();
        
        // Toggles initialized
    }
    
    /**
     * Create toggle UI elements
     */
    _createToggleUI() {
        // Create container
        this.toggleContainer = document.createElement('div');
        this.toggleContainer.id = 'map-toggles';
        this.toggleContainer.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            z-index: 1000;
            min-width: 200px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 14px;
        `;
        
        // Add title
        const title = document.createElement('div');
        title.textContent = 'Map Layers';
        title.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            color: #00A3DA;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 5px;
        `;
        this.toggleContainer.appendChild(title);
        
        // Create toggles for each layer
        this._createLayerToggles();
        
        // Add to document
        document.body.appendChild(this.toggleContainer);
    }
    
    /**
     * Create toggle elements for each layer
     */
    _createLayerToggles() {
        const layerGroups = [
            {
                title: 'Grid & Labels',
                layers: [
                    { key: 'grid-lines', label: 'Grid Lines', icon: '⊞' },
                    { key: 'square-labels', label: 'Square Labels', icon: 'A' },
                    { key: 'quadrant-cross', label: 'Quadrant Cross', icon: '+' },
                    { key: 'quadrant-labels', label: 'Quadrant Labels', icon: 'Q' }
                ]
            },
            {
                title: 'Map Layers',
                layers: [
                    { key: 'base', label: 'Base Terrain', icon: '🗺️' },
                    { key: 'paths', label: 'Paths', icon: '🛤️' },
                    { key: 'region-borders', label: 'Region Borders', icon: '🏞️' },
                    { key: 'village-borders', label: 'Village Borders', icon: '🏘️' },
                    { key: 'village-markers', label: 'Village Markers', icon: '🏛️' },
                    { key: 'region-names', label: 'Region Names', icon: '🏷️' },
                    { key: 'mask', label: 'Hidden Areas', icon: '👁️‍🗨️' }
                ]
            }
        ];
        
        layerGroups.forEach(group => {
            // Group title
            const groupTitle = document.createElement('div');
            groupTitle.textContent = group.title;
            groupTitle.style.cssText = `
                font-weight: bold;
                margin: 15px 0 8px 0;
                color: #D4AF37;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            `;
            this.toggleContainer.appendChild(groupTitle);
            
            // Group layers
            group.layers.forEach(layer => {
                this._createToggleElement(layer.key, layer.label, layer.icon);
            });
        });
    }
    
    /**
     * Create individual toggle element
     * @param {string} key - Toggle key
     * @param {string} label - Display label
     * @param {string} icon - Display icon
     */
    _createToggleElement(key, label, icon) {
        const toggleDiv = document.createElement('div');
        toggleDiv.style.cssText = `
            display: flex;
            align-items: center;
            margin: 5px 0;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
            transition: background-color 0.2s;
        `;
        
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `toggle-${key}`;
        checkbox.checked = this.state[key] || false;
        checkbox.style.marginRight = '8px';
        
        // Label
        const labelElement = document.createElement('label');
        labelElement.htmlFor = `toggle-${key}`;
        labelElement.style.cssText = `
            display: flex;
            align-items: center;
            cursor: pointer;
            flex: 1;
            font-size: 13px;
        `;
        
        // Icon
        const iconSpan = document.createElement('span');
        iconSpan.textContent = icon;
        iconSpan.style.cssText = `
            margin-right: 6px;
            font-size: 14px;
            width: 16px;
            text-align: center;
        `;
        
        // Text
        const textSpan = document.createElement('span');
        textSpan.textContent = label;
        
        labelElement.appendChild(iconSpan);
        labelElement.appendChild(textSpan);
        
        toggleDiv.appendChild(checkbox);
        toggleDiv.appendChild(labelElement);
        
        // Event listeners
        const handleToggle = (event) => {
            event.preventDefault();
            this.toggle(key);
        };
        
        checkbox.addEventListener('change', handleToggle);
        toggleDiv.addEventListener('click', handleToggle);
        
        // Hover effects
        toggleDiv.addEventListener('mouseenter', () => {
            toggleDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        
        toggleDiv.addEventListener('mouseleave', () => {
            toggleDiv.style.backgroundColor = 'transparent';
        });
        
        // Store reference
        this.toggleElements.set(key, {
            container: toggleDiv,
            checkbox: checkbox,
            label: labelElement
        });
        
        this.toggleContainer.appendChild(toggleDiv);
    }
    
    /**
     * Apply initial state to layers
     */
    _applyInitialState() {
        for (const [key, visible] of Object.entries(this.state)) {
            this._applyToggleState(key, visible);
        }
    }
    
    /**
     * Toggle a layer on/off
     * @param {string} key - Toggle key
     * @param {boolean} force - Force specific state (optional)
     */
    toggle(key, force = null) {
        const newState = force !== null ? force : !this.state[key];
        this.setState(key, newState);
    }
    
    /**
     * Set toggle state
     * @param {string} key - Toggle key
     * @param {boolean} visible - Visibility state
     */
    setState(key, visible) {
        if (this.state[key] === visible) return;
        
        this.state[key] = visible;
        this._applyToggleState(key, visible);
        this._updateToggleUI(key, visible);
        this._notifyListeners(key, visible);
        
        // Toggle changed
    }
    
    /**
     * Apply toggle state to layers
     * @param {string} key - Toggle key
     * @param {boolean} visible - Visibility state
     */
    _applyToggleState(key, visible) {
        switch (key) {
            case 'grid-lines':
                this.layers.setGridVisibility(visible);
                break;
                
            case 'square-labels':
            case 'quadrant-labels':
                // These are handled by zoom level in the loader
                break;
                
            case 'quadrant-cross':
                this.layers.setQuadrantCrossVisibility(visible);
                break;
                
            case 'base':
            case 'paths':
            case 'region-borders':
            case 'village-borders':
            case 'village-markers':
            case 'region-names':
            case 'mask':
                this.layers.setLayerVisibility(key, visible);
                break;
                
            default:
                console.warn('[toggles] Unknown toggle key:', key);
        }
    }
    
    /**
     * Update toggle UI element
     * @param {string} key - Toggle key
     * @param {boolean} visible - Visibility state
     */
    _updateToggleUI(key, visible) {
        const element = this.toggleElements.get(key);
        if (element) {
            element.checkbox.checked = visible;
            
            // Visual feedback
            element.container.style.opacity = visible ? '1' : '0.6';
        }
    }
    
    /**
     * Add toggle change listener
     * @param {string} key - Toggle key (or 'all' for all toggles)
     * @param {Function} callback - Callback function
     */
    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }
    
    /**
     * Remove toggle change listener
     * @param {string} key - Toggle key
     * @param {Function} callback - Callback function
     */
    removeListener(key, callback) {
        const listeners = this.listeners.get(key);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Notify listeners of toggle change
     * @param {string} key - Toggle key
     * @param {boolean} visible - Visibility state
     */
    _notifyListeners(key, visible) {
        // Notify specific listeners
        const listeners = this.listeners.get(key);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(key, visible, this.state);
                } catch (error) {
                    console.error('[toggles] Listener error:', error);
                }
            });
        }
        
        // Notify 'all' listeners
        const allListeners = this.listeners.get('all');
        if (allListeners) {
            allListeners.forEach(callback => {
                try {
                    callback(key, visible, this.state);
                } catch (error) {
                    console.error('[toggles] Listener error:', error);
                }
            });
        }
    }
    
    /**
     * Get current toggle state
     * @param {string} key - Toggle key (optional)
     * @returns {Object|boolean} State object or specific toggle state
     */
    getState(key = null) {
        if (key) {
            return this.state[key] || false;
        }
        return { ...this.state };
    }
    
    /**
     * Set multiple toggle states at once
     * @param {Object} states - Object of key-value pairs
     */
    setStates(states) {
        for (const [key, visible] of Object.entries(states)) {
            this.setState(key, visible);
        }
    }
    
    /**
     * Reset all toggles to default state
     */
    resetToDefaults() {
        this.setState(this.config.LAYER_DEFAULTS);
    }
    
    /**
     * Show/hide toggle UI
     * @param {boolean} visible - Visibility state
     */
    setVisible(visible) {
        if (this.toggleContainer) {
            this.toggleContainer.style.display = visible ? 'block' : 'none';
        }
    }
    
    /**
     * Toggle UI visibility
     */
    toggleVisible() {
        const isVisible = this.toggleContainer && 
                         this.toggleContainer.style.display !== 'none';
        this.setVisible(!isVisible);
    }
    
    /**
     * Save toggle state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem('mapToggles', JSON.stringify(this.state));
            // State saved to localStorage
        } catch (error) {
            console.warn('[toggles] Failed to save state:', error);
        }
    }
    
    /**
     * Load toggle state from localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem('mapToggles');
            if (saved) {
                const savedState = JSON.parse(saved);
                this.setStates(savedState);
                // State loaded from localStorage
            }
        } catch (error) {
            console.warn('[toggles] Failed to load state:', error);
        }
    }
    
    /**
     * Auto-save state on changes
     */
    enableAutoSave() {
        this.addListener('all', () => {
            this.saveState();
        });
    }
    
    /**
     * Create keyboard shortcuts for toggles
     */
    createKeyboardShortcuts() {
        const shortcuts = {
            'g': 'grid-lines',
            'l': 'square-labels',
            'q': 'quadrant-labels',
            'b': 'base',
            'p': 'paths',
            'r': 'region-borders',
            'v': 'village-borders',
            'n': 'region-names',
            'm': 'mask'
        };
        
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts when not in input fields
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            const key = event.key.toLowerCase();
            const toggleKey = shortcuts[key];
            
            if (toggleKey) {
                event.preventDefault();
                this.toggle(toggleKey);
            }
        });
        
        // Keyboard shortcuts enabled
    }
    
    /**
     * Cleanup toggles (remove UI, listeners)
     */
    cleanup() {
        // Remove UI
        if (this.toggleContainer) {
            this.toggleContainer.remove();
            this.toggleContainer = null;
        }
        
        // Clear references
        this.toggleElements.clear();
        this.listeners.clear();
        
        // Cleaned up
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapToggles;
}
