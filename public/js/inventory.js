// ============================================================================
// Inventory Management System
// Character-based inventory display with expandable/collapsible sections
// ============================================================================

// ------------------- Global State -------------------
let currentInventoryData = [];
let characterGroups = new Map();
let expandedCharacters = new Set();
let currentFilters = {
  search: '',
  category: 'all',
  type: 'all',
  sortBy: 'character-asc'
};

// Global state for inventory filters (similar to characters.js)
window.inventoryFiltersInitialized = false;
window.savedInventoryFilterState = {};

// ------------------- Cache System -------------------

/**
 * Enhanced Inventory Cache System
 * Provides fast access to inventory data with localStorage persistence
 */
function initializeInventoryCache() {
  if (window.inventoryPageCache) return window.inventoryPageCache;

  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  const MAX_CACHE_SIZE = 50; // Maximum number of cached pages
  const CACHE_KEY = 'tinglebot_inventory_page_cache';

  // Load existing cache from localStorage
  let data = new Map();
  let timestamp = Date.now();

  try {
    const savedData = localStorage.getItem(CACHE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      data = new Map(parsed.data || []);
      timestamp = parsed.timestamp || Date.now();

      // Check if cache is still valid
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log(`[Inventory Cache] Loaded ${data.size} cached pages from localStorage`);
      } else {
        console.log('[Inventory Cache] Cache expired, starting fresh');
        data = new Map();
        timestamp = Date.now();
      }
    }
  } catch (error) {
    console.warn('[Inventory Cache] Failed to load cache from localStorage:', error);
    data = new Map();
    timestamp = Date.now();
  }

  window.inventoryPageCache = {
    data,
    timestamp,
    CACHE_DURATION,
    MAX_CACHE_SIZE,

    // Add data to cache with automatic cleanup
    set(key, value) {
      // Remove oldest entries if cache is full
      if (this.data.size >= this.MAX_CACHE_SIZE) {
        const oldestKey = this.data.keys().next().value;
        this.data.delete(oldestKey);
        console.log(`[Inventory Cache] Evicted oldest entry: ${oldestKey}`);
      }

      this.data.set(key, {
        value,
        timestamp: Date.now()
      });

      this.persist();
    },

    // Get data from cache
    get(key) {
      const entry = this.data.get(key);
      if (!entry) return null;

      if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
        this.data.delete(key);
        return null;
      }

      return entry.value;
    },

    // Check if key exists and is valid
    has(key) {
      const entry = this.data.get(key);
      if (!entry) return false;

      if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
        this.data.delete(key);
        return false;
      }

      return true;
    },

    // Clear all cache
    clear() {
      this.data.clear();
      this.timestamp = Date.now();
      localStorage.removeItem(CACHE_KEY);
      console.log('[Inventory Cache] Cache cleared');
    },

    // Clear cache for specific filters
    clearForFilters() {
      const keysToDelete = [];
      for (const [key] of this.data.entries()) {
        if (key.includes('inventory_page_')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.data.delete(key));
      this.persist();
      console.log(`[Inventory Cache] Cleared ${keysToDelete.length} filter-related cache entries`);
    },

    // Get cache statistics
    getStats() {
      return {
        size: this.data.size,
        maxSize: this.MAX_CACHE_SIZE,
        duration: this.CACHE_DURATION / (60 * 1000), // minutes
        timestamp: this.timestamp
      };
    },

    // Persist cache to localStorage
    persist() {
      try {
        const dataObj = {
          data: Array.from(this.data.entries()),
          timestamp: this.timestamp
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(dataObj));
      } catch (error) {
        console.warn('[Inventory Cache] Failed to persist cache to localStorage:', error);
      }
    }
  };

  console.log(`[Inventory Cache] Enhanced inventory cache initialized with ${data.size} pages`);
  return window.inventoryPageCache;
}

// ------------------- Page Initialization -------------------

/**
 * Initializes the inventory page with filters, pagination, and card rendering
 * @param {Array} data - Inventory data
 * @param {number} page - Current page number
 * @param {HTMLElement} contentDiv - Content container element
 */
async function initializeInventoryPage(data, page = 1, contentDiv) {
  console.log('🎒 Initializing inventory page:', { 
    dataLength: data?.length, 
    page 
  });

  const startTime = Date.now();
  const cache = initializeInventoryCache();
  const cacheKey = `inventory_page_${page}_${JSON.stringify(currentFilters)}`;

  // Store inventories globally for filtering
  window.allInventories = data;

  // Add cache status indicator
  let cacheStatus = document.querySelector('.cache-status');
  if (!cacheStatus) {
    cacheStatus = document.createElement('div');
    cacheStatus.className = 'cache-status';
    cacheStatus.style.cssText = `
      display: inline-block;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 5px;
      font-size: 12px;
      margin-left: 10px;
      cursor: pointer;
      transition: opacity 0.3s;
    `;
    cacheStatus.innerHTML = '<i class="fas fa-database"></i> Cache: Loading...';
    cacheStatus.title = 'Click to see cache statistics';
    
    // Find the header and add cache status
    const header = document.querySelector('.model-details-header');
    if (header) {
      header.appendChild(cacheStatus);
    } else {
      // Fallback to body if header not found
      cacheStatus.style.position = 'fixed';
      cacheStatus.style.bottom = '20px';
      cacheStatus.style.right = '20px';
      cacheStatus.style.zIndex = '1000';
      document.body.appendChild(cacheStatus);
    }
    
    // Add click handler to show cache stats
    cacheStatus.addEventListener('click', () => {
      const stats = cache.getStats();
      if (stats) {
        alert(`Inventory Cache Statistics:\n\nSize: ${stats.size}/${stats.maxSize} pages\nDuration: ${stats.duration} minutes\nTimestamp: ${new Date(stats.timestamp).toLocaleString()}`);
      }
    });
    
    // Update cache status periodically
    setInterval(() => {
      const stats = cache.getStats();
      if (stats) {
        cacheStatus.innerHTML = `📦 Cache: ${stats.size}/${stats.maxSize} pages`;
      }
    }, 5000);
  }

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`[Inventory Cache] 🎯 Using cached data for page ${page}`);
    console.log(`[Inventory Cache] ⏱️ Cache response time: ${Date.now() - startTime}ms`);
    
    // Update cache status
    if (cacheStatus) {
      cacheStatus.innerHTML = '<i class="fas fa-bolt"></i> Cache: Hit!';
      setTimeout(() => {
        const stats = cache.getStats();
        if (stats) {
          cacheStatus.innerHTML = `📦 Cache: ${stats.size}/${stats.maxSize} pages`;
        }
      }, 2000);
    }
    
    // Restore expanded state from cache
    if (cachedData.expandedCharacters) {
      expandedCharacters = new Set(cachedData.expandedCharacters);
    }
  } else {
    console.log(`[Inventory Cache] 🔍 Cache miss for page ${page}, rendering fresh...`);
    
    // Update cache status
    if (cacheStatus) {
      cacheStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cache: Miss, rendering...';
    }
  }

  // Create filters container if it doesn't exist
  let filtersContainer = document.querySelector('.inventory-filters');
  if (!filtersContainer) {
    console.log('🔧 Creating inventory filters container');
    filtersContainer = document.createElement('div');
    filtersContainer.className = 'inventory-filters';
    filtersContainer.style.display = 'block'; // Ensure it's visible
    filtersContainer.style.visibility = 'visible';
    filtersContainer.innerHTML = `
      <div class="search-filter-bar">
        <div class="search-filter-control search-input">
          <input type="text" id="inventory-search" placeholder="Search inventories...">
        </div>
        <div class="search-filter-control">
          <select id="inventory-category-filter">
            <option value="all">All Categories</option>
          </select>
        </div>
        <div class="search-filter-control">
          <select id="inventory-type-filter">
            <option value="all">All Types</option>
          </select>
        </div>
        <div class="search-filter-control">
          <select id="inventory-sort">
            <option value="character-asc">Character (A-Z)</option>
            <option value="character-desc">Character (Z-A)</option>
            <option value="items-asc">Items (Low-High)</option>
            <option value="items-desc">Items (High-Low)</option>
            <option value="quantity-asc">Quantity (Low-High)</option>
            <option value="quantity-desc">Quantity (High-Low)</option>
          </select>
        </div>
        <button id="inventory-clear-filters" class="clear-filters-btn">Clear Filters</button>
      </div>
    `;
    contentDiv.insertBefore(filtersContainer, contentDiv.firstChild);
    console.log('✅ Inventory filters container created and inserted');
    
    // Debug: Check if elements are created
    setTimeout(() => {
      const searchInput = document.getElementById('inventory-search');
      const catSelect = document.getElementById('inventory-category-filter');
      const typeSelect = document.getElementById('inventory-type-filter');
      const sortSelect = document.getElementById('inventory-sort');
      const clearBtn = document.getElementById('inventory-clear-filters');
      
      console.log('🔍 Filter elements check:', {
        searchInput: !!searchInput,
        catSelect: !!catSelect,
        typeSelect: !!typeSelect,
        sortSelect: !!sortSelect,
        clearBtn: !!clearBtn,
        filtersContainerVisible: filtersContainer.offsetParent !== null
      });
    }, 100);
  } else {
    console.log('🔧 Inventory filters container already exists');
  }

  // Create inventory container if it doesn't exist
  let container = document.getElementById('inventory-grid');
  if (!container) {
    container = document.createElement('div');
    container.id = 'inventory-grid';
    container.className = 'inventory-grid';
    contentDiv.appendChild(container);
  } else {
    // If container exists but is not a child of contentDiv, move it
    if (!contentDiv.contains(container)) {
      contentDiv.appendChild(container);
    }
  }

  // Add results info section after container is created
  let resultsInfo = document.querySelector('.inventory-results-info');
  if (!resultsInfo) {
    resultsInfo = document.createElement('div');
    resultsInfo.className = 'inventory-results-info';
    resultsInfo.innerHTML = '<p>Loading inventory data...</p>';
    // Insert before the container (which is now guaranteed to be a child of contentDiv)
    contentDiv.insertBefore(resultsInfo, container);
  } else {
    // If resultsInfo exists but is not in the right place, move it
    if (!contentDiv.contains(resultsInfo) || resultsInfo.nextSibling !== container) {
      if (contentDiv.contains(resultsInfo)) {
        resultsInfo.remove();
      }
      contentDiv.insertBefore(resultsInfo, container);
    }
  }

  // Always initialize filters and render data
  populateInventoryFilterOptions(data);
  setupInventoryFilters(data);
  await renderInventoryItems(data, page);

  // Update results info
  if (resultsInfo) {
    resultsInfo.innerHTML = `<p>Showing ${data.length} inventory entries</p>`;
  }

  // Cache the rendered HTML after content is fully rendered
  setTimeout(() => {
    const htmlToCache = contentDiv.innerHTML;
    // Only cache if the content is not the loading state
    if (!htmlToCache.includes('Organizing inventory data')) {
      cache.set(cacheKey, {
        html: htmlToCache,
        expandedCharacters: Array.from(expandedCharacters),
        timestamp: Date.now()
      });
      console.log(`[Inventory Cache] 💾 Cached inventory page data for page ${page}`);
    } else {
      console.log(`[Inventory Cache] ⚠️ Skipped caching due to loading state`);
    }
  }, 100);

  // Update cache status
  if (cacheStatus) {
    cacheStatus.innerHTML = '<i class="fas fa-save"></i> Cache: Saved!';
    setTimeout(() => {
      const stats = cache.getStats();
      if (stats) {
        cacheStatus.innerHTML = `📦 Cache: ${stats.size}/${stats.maxSize} pages`;
      }
    }, 2000);
  }

  console.log(`✅ Inventory page initialized in ${Date.now() - startTime}ms`);
}

// ------------------- Main Rendering Functions -------------------

/**
 * Renders inventory items grouped by character with expandable sections
 * @param {Array} inventories - Raw inventory data
 * @param {number} page - Current page number
 */
async function renderInventoryItems(inventories, page = 1) {
  console.log('🎒 Rendering inventory items:', { 
    totalItems: inventories.length, 
    page 
  });
  
  // Update global inventory data for this page
  currentInventoryData = inventories;
  characterGroups = groupInventoriesByCharacter(inventories);
  
  console.log('📊 After grouping - characterGroups size:', characterGroups.size);
  
  const container = document.getElementById('inventory-grid');
  if (!container) {
    console.error('❌ Inventory grid container not found');
    return;
  }
  
  console.log('✅ Found inventory grid container');
  
  // Show loading state briefly for better UX
  container.innerHTML = `
    <div class="inventory-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Organizing inventory data...</p>
    </div>
  `;
  
  console.log('⏳ Set loading state, starting render in 50ms...');
  
  // Use a shorter timeout and ensure rendering completes
  setTimeout(() => {
    try {
      console.log('🎨 Starting character cards rendering...');
      const characterCards = renderCharacterInventoryCards();
      console.log('✅ Character cards HTML generated, length:', characterCards.length);
      
      container.innerHTML = characterCards;
      console.log('✅ HTML set to container');
      
      // Initialize character cards after rendering
      initializeCharacterCards();
      
      console.log('✅ Inventory rendering complete');
    } catch (error) {
      console.error('❌ Error rendering inventory:', error);
      container.innerHTML = `
        <div class="inventory-empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error loading inventory</h3>
          <p>There was an error rendering the inventory data. Please try refreshing the page.</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }, 50); // Reduced timeout for faster loading
}

/**
 * Groups inventory items by character
 * @param {Array} inventories - Raw inventory data
 * @returns {Map} Character groups with their items
 */
function groupInventoriesByCharacter(inventories) {
  console.log('📊 groupInventoriesByCharacter called with', inventories.length, 'items');
  console.log('📊 First few items:', inventories.slice(0, 3));
  
  const groups = new Map();
  
  inventories.forEach((item, index) => {
    const charName = item.characterName || 'Unknown Character';
    
    if (index < 3) {
      console.log('📦 Processing item', index, ':', item.itemName, 'for character:', charName);
    }
    
    if (!groups.has(charName)) {
      groups.set(charName, {
        characterName: charName,
        totalItems: 0,
        uniqueItems: 0,
        items: [],
        categories: new Set(),
        types: new Set()
      });
    }
    
    const group = groups.get(charName);
    group.items.push(item);
    group.totalItems += item.quantity || 0;
    group.categories.add(item.category || 'Unknown');
    group.types.add(item.type || 'Unknown');
  });
  
  // Calculate unique items count
  groups.forEach(group => {
    group.uniqueItems = new Set(group.items.map(item => item.itemName)).size;
    group.categories = Array.from(group.categories);
    group.types = Array.from(group.types);
  });
  
  console.log('📊 Grouped inventory data:', {
    totalCharacters: groups.size,
    totalItems: inventories.length,
    characterNames: Array.from(groups.keys())
  });
  
  return groups;
}

/**
 * Renders character inventory cards
 * @returns {string} HTML for character cards
 */
function renderCharacterInventoryCards() {
  console.log('🎨 renderCharacterInventoryCards called');
  console.log('📊 characterGroups size:', characterGroups.size);
  console.log('📊 characterGroups keys:', Array.from(characterGroups.keys()));
  
  const sortedCharacters = sortCharacterGroups();
  console.log('📊 sortedCharacters length:', sortedCharacters.length);
  console.log('📊 sortedCharacters:', sortedCharacters.map(c => c.characterName));
  
  if (sortedCharacters.length === 0) {
    console.log('⚠️ No characters to render, showing empty state');
    return `
      <div class="inventory-empty-state">
        <i class="fas fa-box-open"></i>
        <h3>No inventory data found</h3>
        <p>Try adjusting your filters or check back later.</p>
      </div>
    `;
  }
  
  console.log('🎨 Rendering', sortedCharacters.length, 'character cards');
  
  return sortedCharacters.map(character => {
    const isExpanded = expandedCharacters.has(character.characterName);
    const itemCount = character.items.length;
    const totalQuantity = character.totalItems;
    
    console.log('🎭 Rendering character:', character.characterName, 'with', itemCount, 'items');
    
    return `
      <div class="character-inventory-card" data-character="${character.characterName}">
        <div class="character-inventory-header ${isExpanded ? 'expanded' : ''}" 
             onclick="toggleCharacterInventory('${character.characterName}')">
          <div class="character-inventory-info">
            <div class="character-avatar">
              <i class="fas fa-user-circle"></i>
            </div>
            <div class="character-details">
              <h3 class="character-name">${character.characterName}</h3>
              <div class="character-stats">
                <span class="stat-item">
                  <i class="fas fa-box"></i>
                  ${itemCount} items
                </span>
                <span class="stat-item">
                  <i class="fas fa-layer-group"></i>
                  ${totalQuantity} total
                </span>
              </div>
            </div>
          </div>
          <div class="character-inventory-controls">
            <button class="expand-button" aria-label="Toggle inventory">
              <i class="fas fa-chevron-${isExpanded ? 'up' : 'down'}"></i>
            </button>
          </div>
        </div>
        
        <div class="character-inventory-content ${isExpanded ? 'expanded' : ''}">
          ${isExpanded ? renderCharacterItems(character) : ''}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Renders items for a specific character
 * @param {Object} character - Character group data
 * @returns {string} HTML for character items
 */
function renderCharacterItems(character) {
  const sortedItems = sortCharacterItems(character.items);
  
  if (sortedItems.length === 0) {
    return `
      <div class="character-inventory-empty">
        <i class="fas fa-inbox"></i>
        <p>No items found for this character</p>
      </div>
    `;
  }
  
  return `
    <div class="character-items-grid">
      ${sortedItems.map(item => `
        <div class="character-item-card" data-item="${item.itemName}">
          <div class="item-icon">
            <i class="fas fa-box"></i>
          </div>
          <div class="item-details">
            <h4 class="item-name">${item.itemName}</h4>
            <div class="item-meta">
              <span class="item-quantity">
                <i class="fas fa-layer-group"></i>
                ${item.quantity}
              </span>
              ${item.category ? `
                <span class="item-category">
                  <i class="fas fa-tag"></i>
                  ${item.category}
                </span>
              ` : ''}
              ${item.type ? `
                <span class="item-type">
                  <i class="fas fa-cube"></i>
                  ${item.type}
                </span>
              ` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ------------------- Filter and Sort Functions -------------------

/**
 * Populates inventory filter options based on available data
 * @param {Array} inventories - Raw inventory data
 */
function populateInventoryFilterOptions(inventories) {
  console.log('🔧 Populating filter options');
  
  // Extract unique values
  const categories = [...new Set(inventories.map(inv => inv.category).filter(Boolean))].sort();
  const types = [...new Set(inventories.map(inv => inv.type).filter(Boolean))].sort();
  
  // Populate category filter
  const catSelect = document.getElementById('inventory-category-filter');
  if (catSelect) {
    catSelect.innerHTML = '<option value="all">All Categories</option>' +
      categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  
  // Populate type filter
  const typeSelect = document.getElementById('inventory-type-filter');
  if (typeSelect) {
    typeSelect.innerHTML = '<option value="all">All Types</option>' +
      types.map(t => `<option value="${t}">${t}</option>`).join('');
  }
  
  console.log('✅ Filter options populated:', { categories: categories.length, types: types.length });
}

/**
 * Sets up inventory filters with event listeners
 * @param {Array} inventories - Raw inventory data
 */
function setupInventoryFilters(inventories) {
  console.log('🔧 Setting up inventory filters');
  
  // Check if filters are already initialized
  if (window.inventoryFiltersInitialized) {
    console.log('🔧 Inventory filters already initialized, skipping setup');
    window.filterInventories(1);
    return;
  }
  
  const searchInput = document.getElementById('inventory-search');
  const catSelect = document.getElementById('inventory-category-filter');
  const typeSelect = document.getElementById('inventory-type-filter');
  const sortSelect = document.getElementById('inventory-sort');
  const clearBtn = document.getElementById('inventory-clear-filters');
  
  // Restore filter state if it exists
  const savedFilterState = window.savedInventoryFilterState || {};
  if (savedFilterState.searchTerm && searchInput) searchInput.value = savedFilterState.searchTerm;
  if (savedFilterState.categoryFilter && catSelect) catSelect.value = savedFilterState.categoryFilter;
  if (savedFilterState.typeFilter && typeSelect) typeSelect.value = savedFilterState.typeFilter;
  if (savedFilterState.sortBy && sortSelect) sortSelect.value = savedFilterState.sortBy;
  
  // ------------------- Function: filterInventories -------------------
  // Main filtering function that handles both server-side and client-side filtering
  window.filterInventories = async function (page = 1) {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const categoryFilter = catSelect?.value || 'all';
    const typeFilter = typeSelect?.value || 'all';
    const sortBy = sortSelect?.value || 'character-asc';

    console.log('🔍 filterInventories called:', {
      page,
      searchTerm,
      categoryFilter,
      typeFilter,
      sortBy
    });

    // Save current filter state
    window.savedInventoryFilterState = {
      searchTerm: searchInput?.value || '',
      categoryFilter,
      typeFilter,
      sortBy
    };

    // Check if any filters are active
    const hasActiveFilters = searchTerm || 
      categoryFilter !== 'all' || 
      typeFilter !== 'all';

    console.log('🔍 Filter analysis:', {
      hasActiveFilters,
      willUseServerSide: hasActiveFilters
    });

    // Always use server-side filtering when filters are active
    if (hasActiveFilters) {
      console.log('🔍 Using server-side filtering (filterInventoriesWithAllData)');
      await filterInventoriesWithAllData(page);
    } else {
      console.log('🔍 Using client-side filtering (filterInventoriesClientSide)');
      filterInventoriesClientSide(page);
    }
  };

  // ------------------- Function: filterInventoriesWithAllData -------------------
  // Fetches all inventories from database and applies client-side filtering
  async function filterInventoriesWithAllData(page = 1) {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const categoryFilter = catSelect?.value || 'all';
    const typeFilter = typeSelect?.value || 'all';
    const sortBy = sortSelect?.value || 'character-asc';

    console.log('🔍 filterInventoriesWithAllData called:', { page });

    // Show loading state
    const resultsInfo = document.querySelector('.inventory-results-info p');
    if (resultsInfo) {
      resultsInfo.textContent = 'Loading filtered inventories...';
    }

    try {
      // Always fetch ALL inventories from the database
      const response = await fetch('/api/models/inventory?all=true');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const { data: allInventories } = await response.json();

      console.log('🔍 Fetched inventories from database:', allInventories.length);

      // Apply filtering and sorting to ALL inventories
      const filteredAndSorted = applyFiltersAndSort(allInventories);

      console.log('🔍 After filtering and sorting:', filteredAndSorted.length);

      // Update global inventories for this filtered view
      window.allInventories = filteredAndSorted;

      // Update results info
      if (resultsInfo) {
        resultsInfo.textContent = `Showing ${filteredAndSorted.length} filtered inventory entries`;
      }

      // Render the filtered inventories
      renderInventoryItems(filteredAndSorted, page);

      // Remove any existing pagination since we're showing all filtered results
      const contentDiv = document.getElementById('model-details-data');
      if (contentDiv) {
        const existingPagination = contentDiv.querySelector('.pagination');
        if (existingPagination) {
          existingPagination.remove();
        }
      }

    } catch (error) {
      console.error('❌ Error fetching all inventories for filtering:', error);
      // Fallback to client-side filtering on current inventories
      console.log('🔄 Falling back to client-side filtering on current page...');
      filterInventoriesClientSide(page);
    }
  }

  // ------------------- Function: filterInventoriesClientSide -------------------
  // Client-side filtering for when no server-side filtering is needed
  function filterInventoriesClientSide(page = 1) {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const categoryFilter = catSelect?.value || 'all';
    const typeFilter = typeSelect?.value || 'all';
    const sortBy = sortSelect?.value || 'character-asc';

    const filtered = window.allInventories.filter(inv => {
      const matchesSearch = !searchTerm ||
        inv.itemName?.toLowerCase().includes(searchTerm) ||
        inv.characterName?.toLowerCase().includes(searchTerm);
      const matchesCategory = categoryFilter === 'all' || inv.category === categoryFilter;
      const matchesType = typeFilter === 'all' || inv.type === typeFilter;
      
      return matchesSearch && matchesCategory && matchesType;
    });

    // Apply sorting
    const [field, direction] = sortBy.split('-');
    const isAsc = direction === 'asc';

    const sorted = [...filtered].sort((a, b) => {
      let valA, valB;
      
      switch (field) {
        case 'character':
          valA = a.characterName ?? '';
          valB = b.characterName ?? '';
          break;
        case 'items':
          valA = 1; // For inventory items, we count as 1 per entry
          valB = 1;
          break;
        case 'quantity':
          valA = a.quantity ?? 0;
          valB = b.quantity ?? 0;
          break;
        default:
          valA = a[field] ?? '';
          valB = b[field] ?? '';
      }
      
      return isAsc
        ? (typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB)
        : (typeof valB === 'string' ? valB.localeCompare(valA) : valB - valA);
    });

    const resultsInfo = document.querySelector('.inventory-results-info p');
    if (resultsInfo) {
      resultsInfo.textContent = `Showing ${sorted.length} of ${window.allInventories.length} inventory entries`;
    }

    renderInventoryItems(sorted, page);

    // Remove any existing pagination since we're showing all filtered results
    const contentDiv = document.getElementById('model-details-data');
    if (contentDiv) {
      const existingPagination = contentDiv.querySelector('.pagination');
      if (existingPagination) {
        existingPagination.remove();
      }
    }
  }

  // ------------------- Function: applyFiltersAndSort -------------------
  // Applies all filters and sorting to an inventory array
  function applyFiltersAndSort(inventories) {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const categoryFilter = catSelect?.value || 'all';
    const typeFilter = typeSelect?.value || 'all';
    const sortBy = sortSelect?.value || 'character-asc';

    // Apply filters
    const filtered = inventories.filter(inv => {
      const matchesSearch = !searchTerm ||
        inv.itemName?.toLowerCase().includes(searchTerm) ||
        inv.characterName?.toLowerCase().includes(searchTerm);
      const matchesCategory = categoryFilter === 'all' || inv.category === categoryFilter;
      const matchesType = typeFilter === 'all' || inv.type === typeFilter;
      
      return matchesSearch && matchesCategory && matchesType;
    });

    // Apply sorting
    const [field, direction] = sortBy.split('-');
    const isAsc = direction === 'asc';

    return [...filtered].sort((a, b) => {
      let valA, valB;
      
      switch (field) {
        case 'character':
          valA = a.characterName ?? '';
          valB = b.characterName ?? '';
          break;
        case 'items':
          valA = 1; // For inventory items, we count as 1 per entry
          valB = 1;
          break;
        case 'quantity':
          valA = a.quantity ?? 0;
          valB = b.quantity ?? 0;
          break;
        default:
          valA = a[field] ?? '';
          valB = b[field] ?? '';
      }
      
      return isAsc
        ? (typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB)
        : (typeof valB === 'string' ? valB.localeCompare(valA) : valB - valA);
    });
  }
  
  // Add event listeners
  if (searchInput) searchInput.addEventListener('input', () => window.filterInventories(1));
  if (catSelect) catSelect.addEventListener('change', () => window.filterInventories(1));
  if (typeSelect) typeSelect.addEventListener('change', () => window.filterInventories(1));
  if (sortSelect) sortSelect.addEventListener('change', () => window.filterInventories(1));
  
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (searchInput) searchInput.value = '';
      if (catSelect) catSelect.value = 'all';
      if (typeSelect) typeSelect.value = 'all';
      if (sortSelect) sortSelect.value = 'character-asc';
      
      currentFilters = {
        search: '',
        category: 'all',
        type: 'all',
        sortBy: 'character-asc'
      };
      
      // Clear saved filter state
      window.savedInventoryFilterState = {};
      
      // Clear cache when filters are reset
      const cache = initializeInventoryCache();
      cache.clearForFilters();
      console.log('[Inventory Cache] 🗑️ Cache cleared due to filter reset');
      
      // Reset the global inventory list to the original data
      try {
        console.log('🔄 Fetching all inventories after clearing filters...');
        const response = await fetch('/api/models/inventory?all=true');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const { data: allInventories } = await response.json();
        
        // Update the global inventory list with all inventories
        window.allInventories = allInventories;
        console.log('✅ Reset global inventory list to', allInventories.length, 'entries');
        
        // Render all inventories
        renderInventoryItems(allInventories, 1);
        
        // Update results info
        const resultsInfo = document.querySelector('.inventory-results-info p');
        if (resultsInfo) {
          resultsInfo.textContent = `Showing ${allInventories.length} inventory entries`;
        }
        
        // Remove any existing pagination
        const contentDiv = document.getElementById('model-details-data');
        if (contentDiv) {
          const existingPagination = contentDiv.querySelector('.pagination');
          if (existingPagination) {
            existingPagination.remove();
          }
        }
        
      } catch (error) {
        console.error('❌ Error resetting inventory list:', error);
        // Fallback to just calling filterInventories
        window.filterInventories(1);
      }
    });
  }
  
  window.inventoryFiltersInitialized = true;
  console.log('✅ Inventory filters setup complete');
  window.filterInventories(1);
}

// ------------------- Sorting Functions -------------------

/**
 * Sorts character groups based on current sort criteria
 * @returns {Array} Sorted character groups
 */
function sortCharacterGroups() {
  const characters = Array.from(characterGroups.values());
  
  switch (currentFilters.sortBy) {
    case 'character-asc':
      return characters.sort((a, b) => a.characterName.localeCompare(b.characterName));
    case 'character-desc':
      return characters.sort((a, b) => b.characterName.localeCompare(a.characterName));
    case 'items-asc':
      return characters.sort((a, b) => a.uniqueItems - b.uniqueItems);
    case 'items-desc':
      return characters.sort((a, b) => b.uniqueItems - a.uniqueItems);
    case 'quantity-asc':
      return characters.sort((a, b) => a.totalItems - b.totalItems);
    case 'quantity-desc':
      return characters.sort((a, b) => b.totalItems - a.totalItems);
    default:
      return characters.sort((a, b) => a.characterName.localeCompare(b.characterName));
  }
}

/**
 * Sorts items within a character's inventory
 * @param {Array} items - Character's items
 * @returns {Array} Sorted items
 */
function sortCharacterItems(items) {
  return items.sort((a, b) => {
    // First sort by quantity (descending)
    const quantityDiff = (b.quantity || 0) - (a.quantity || 0);
    if (quantityDiff !== 0) return quantityDiff;
    
    // Then sort by name (ascending)
    return (a.itemName || '').localeCompare(b.itemName || '');
  });
}

// ------------------- Interaction Functions -------------------

/**
 * Toggles the expansion state of a character's inventory
 * @param {string} characterName - Name of the character
 */
function toggleCharacterInventory(characterName) {
  console.log('🔄 Toggling inventory for:', characterName);
  
  const card = document.querySelector(`[data-character="${characterName}"]`);
  if (!card) return;
  
  const header = card.querySelector('.character-inventory-header');
  const content = card.querySelector('.character-inventory-content');
  const expandButton = card.querySelector('.expand-button i');
  
  if (expandedCharacters.has(characterName)) {
    // Collapse
    expandedCharacters.delete(characterName);
    header.classList.remove('expanded');
    content.classList.remove('expanded');
    expandButton.className = 'fas fa-chevron-down';
  } else {
    // Expand
    expandedCharacters.add(characterName);
    header.classList.add('expanded');
    content.classList.add('expanded');
    expandButton.className = 'fas fa-chevron-up';
    
    // Load content if not already loaded
    if (!content.innerHTML.trim()) {
      const character = characterGroups.get(characterName);
      if (character) {
        content.innerHTML = renderCharacterItems(character);
      }
    }
  }
}

/**
 * Initializes character cards after rendering
 */
function initializeCharacterCards() {
  // Add any additional initialization logic here
  console.log('🎯 Character cards initialized');
}

// ------------------- Pagination Functions -------------------

/**
 * Updates inventory pagination for filtered results
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of items
 */
function updateFilteredPagination(currentPage, totalPages, totalItems) {
  const contentDiv = document.getElementById('model-details-data');
  if (!contentDiv) {
    console.error('❌ Content div not found');
    return;
  }

  // Remove ALL existing pagination (both main and filtered)
  const existingPagination = contentDiv.querySelector('.pagination');
  if (existingPagination) {
    existingPagination.remove();
  }

  // Only show pagination if there are multiple pages
  if (totalPages > 1) {
    console.log('📄 Setting up pagination for filtered inventory results:', { currentPage, totalPages, totalItems });
    
    const handlePageChange = async (pageNum) => {
      console.log(`🔄 Filtered inventory page change requested to page ${pageNum}`);
      // Call filterInventories with the new page number
      window.filterInventories(pageNum);
    };

    // Create pagination manually
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    
    // Add previous button
    if (currentPage > 1) {
      const prevButton = document.createElement('button');
      prevButton.className = 'pagination-button';
      prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
      prevButton.title = 'Previous Page';
      prevButton.addEventListener('click', () => handlePageChange(currentPage - 1));
      paginationDiv.appendChild(prevButton);
    }

    // Add page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      const firstButton = document.createElement('button');
      firstButton.className = 'pagination-button';
      firstButton.textContent = '1';
      firstButton.addEventListener('click', () => handlePageChange(1));
      paginationDiv.appendChild(firstButton);

      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationDiv.appendChild(ellipsis);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.className = `pagination-button ${i === currentPage ? 'active' : ''}`;
      pageButton.textContent = i.toString();
      pageButton.addEventListener('click', () => handlePageChange(i));
      paginationDiv.appendChild(pageButton);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationDiv.appendChild(ellipsis);
      }

      const lastButton = document.createElement('button');
      lastButton.className = 'pagination-button';
      lastButton.textContent = totalPages.toString();
      lastButton.addEventListener('click', () => handlePageChange(totalPages));
      paginationDiv.appendChild(lastButton);
    }

    // Add next button
    if (currentPage < totalPages) {
      const nextButton = document.createElement('button');
      nextButton.className = 'pagination-button';
      nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
      nextButton.title = 'Next Page';
      nextButton.addEventListener('click', () => handlePageChange(currentPage + 1));
      paginationDiv.appendChild(nextButton);
    }

    contentDiv.appendChild(paginationDiv);
    console.log('✅ Filtered inventory pagination created successfully');
  }
}

/**
 * Creates normal pagination for unfiltered inventory results
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {Function} handlePageChange - Function to handle page changes
 */
function createNormalPagination(currentPage, totalPages, handlePageChange) {
  const contentDiv = document.getElementById('model-details-data');
  if (!contentDiv) return;

  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'pagination';
  
  // Add previous button
  if (currentPage > 1) {
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.title = 'Previous Page';
    prevButton.addEventListener('click', () => handlePageChange(currentPage - 1));
    paginationDiv.appendChild(prevButton);
  }

  // Add page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    const firstButton = document.createElement('button');
    firstButton.className = 'pagination-button';
    firstButton.textContent = '1';
    firstButton.addEventListener('click', () => handlePageChange(1));
    paginationDiv.appendChild(firstButton);

    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      paginationDiv.appendChild(ellipsis);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('button');
    pageButton.className = `pagination-button ${i === currentPage ? 'active' : ''}`;
    pageButton.textContent = i.toString();
    pageButton.addEventListener('click', () => handlePageChange(i));
    paginationDiv.appendChild(pageButton);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      paginationDiv.appendChild(ellipsis);
    }

    const lastButton = document.createElement('button');
    lastButton.className = 'pagination-button';
    lastButton.textContent = totalPages.toString();
    lastButton.addEventListener('click', () => handlePageChange(totalPages));
    paginationDiv.appendChild(lastButton);
  }

  // Add next button
  if (currentPage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.title = 'Next Page';
    nextButton.addEventListener('click', () => handlePageChange(currentPage + 1));
    paginationDiv.appendChild(nextButton);
  }

  contentDiv.appendChild(paginationDiv);
  console.log('✅ Normal inventory pagination created successfully');
}

/**
 * Updates inventory pagination (legacy function for compatibility)
 * @param {Array} inventories - Raw inventory data
 * @param {number} currentPage - Current page number
 */
function updateInventoryPagination(inventories, currentPage) {
  // This function is kept for compatibility but the actual pagination
  // is now handled by updateFilteredPagination and createNormalPagination
  console.log('📄 Legacy pagination updated:', { currentPage, totalItems: inventories.length });
}

// ============================================================================
// ------------------- Global Cache Management -------------------
// Utilities accessible from browser console for cache debugging and management
// ============================================================================

// Make cache management available globally for debugging
window.InventoryPageCache = {
  // Get cache statistics
  getStats() {
    const cache = window.inventoryPageCache;
    if (!cache) return { error: 'Cache not initialized' };
    return cache.getStats();
  },
  
  // Clear the entire cache
  clear() {
    const cache = window.inventoryPageCache;
    if (!cache) return { error: 'Cache not initialized' };
    cache.clear();
    return { success: 'Inventory cache cleared' };
  },
  
  // Get cache size
  getSize() {
    const cache = window.inventoryPageCache;
    if (!cache) return { error: 'Cache not initialized' };
    return { size: cache.data.size, maxSize: cache.MAX_CACHE_SIZE };
  },
  
  // List all cached pages
  listPages() {
    const cache = window.inventoryPageCache;
    if (!cache) return { error: 'Cache not initialized' };
    return Array.from(cache.data.keys());
  },
  
  // Check if specific page is cached
  hasPage(pageKey) {
    const cache = window.inventoryPageCache;
    if (!cache) return { error: 'Cache not initialized' };
    return cache.has(pageKey);
  },
  
  // Remove specific page from cache
  removePage(pageKey) {
    const cache = window.inventoryPageCache;
    if (!cache) return { error: 'Cache not initialized' };
    cache.data.delete(pageKey);
    cache.persist();
    return { success: `Removed page ${pageKey} from cache` };
  },
  
  // Clear filter-related cache
  clearFilters() {
    const cache = window.inventoryPageCache;
    if (!cache) return { error: 'Cache not initialized' };
    cache.clearForFilters();
    return { success: 'Filter-related cache cleared' };
  }
};

// ------------------- Export Functions -------------------

export {
  initializeInventoryPage,
  renderInventoryItems,
  populateInventoryFilterOptions,
  setupInventoryFilters,
  updateInventoryPagination,
  updateFilteredPagination,
  createNormalPagination,
  toggleCharacterInventory,
  initializeInventoryCache
};

// Make toggleCharacterInventory globally available for HTML onclick
window.toggleCharacterInventory = toggleCharacterInventory; 