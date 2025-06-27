// ============================================================================
// Inventory Management System - EFFICIENT VERSION
// Character-based inventory display with on-demand loading
// 
// NEW EFFICIENT APPROACH:
// 1. Load character summaries first (fast)
// 2. Show character cards immediately 
// 3. Load inventory items only when character is expanded
// 4. Cache inventory data per character
// ============================================================================

// Add a simple test to verify this file is loaded
console.log('🎒 Inventory.js loaded successfully');

// ------------------- Utility Functions -------------------

/**
 * Gets the content div element consistently
 * @returns {HTMLElement|null} The content div element
 */
function getContentDiv() {
  return document.getElementById('model-details-data');
}

/**
 * Creates pagination HTML with consistent styling and behavior
 * @param {Object} options - Pagination options
 * @param {number} options.currentPage - Current page number
 * @param {number} options.totalPages - Total number of pages
 * @param {Function} options.handlePageChange - Function to handle page changes
 * @param {string} options.type - Type of pagination ('filtered' or 'normal')
 * @returns {HTMLElement} Pagination container element
 */
function createPaginationElement({ currentPage, totalPages, handlePageChange, type = 'normal' }) {
  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'pagination';
  
  // Helper to create pagination buttons
  const createButton = (label, pageNum, isActive = false, icon = null) => {
    const button = document.createElement('button');
    button.className = `pagination-button ${isActive ? 'active' : ''}`;
    button.title = icon ? `${label} Page` : `Page ${pageNum}`;
    
    if (icon) {
      button.innerHTML = `<i class="fas fa-chevron-${icon}"></i>`;
    } else {
      button.textContent = label;
    }
    
    button.addEventListener('click', () => handlePageChange(pageNum));
    return button;
  };

  // Previous button
  if (currentPage > 1) {
    paginationDiv.appendChild(createButton('Previous', currentPage - 1, false, 'left'));
  }

  // Page numbers with ellipsis
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    paginationDiv.appendChild(createButton('1', 1));
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      paginationDiv.appendChild(ellipsis);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationDiv.appendChild(createButton(i.toString(), i, i === currentPage));
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      paginationDiv.appendChild(ellipsis);
    }
    paginationDiv.appendChild(createButton(totalPages.toString(), totalPages));
  }

  // Next button
  if (currentPage < totalPages) {
    paginationDiv.appendChild(createButton('Next', currentPage + 1, false, 'right'));
  }

  return paginationDiv;
}

/**
 * Removes existing pagination from the content div
 */
function removeExistingPagination() {
  const contentDiv = getContentDiv();
  if (contentDiv) {
    const existingPagination = contentDiv.querySelector('.pagination');
    if (existingPagination) {
      existingPagination.remove();
    }
  }
}

/**
 * Updates results info with consistent formatting
 * @param {number} currentCount - Current items being shown
 * @param {number} totalCount - Total items available
 * @param {string} type - Type of results ('inventory', 'filtered', etc.)
 * @param {Object} pagination - Optional pagination info
 */
function updateResultsInfo(currentCount, totalCount, type = 'inventory', pagination = null) {
  const resultsInfo = document.querySelector('.inventory-results-info p');
  if (!resultsInfo) return;

  let message = '';
  if (pagination && pagination.pages > 1) {
    message = `Showing ${currentCount} of ${totalCount} ${type} entries (Page ${pagination.page} of ${pagination.pages})`;
  } else if (currentCount === totalCount) {
    message = `Showing ${currentCount} ${type} entries`;
  } else {
    message = `Showing ${currentCount} of ${totalCount} ${type} entries`;
  }
  
  resultsInfo.textContent = message;
}

/**
 * Creates filter HTML with consistent structure
 * @returns {string} Filter HTML
 */
function createFilterHTML() {
  return `
    <div class="search-filter-control search-input">
      <input type="text" id="inventory-search" placeholder="Search characters...">
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
    <div class="search-filter-control">
      <select id="inventory-characters-per-page">
        <option value="12">12 per page</option>
        <option value="24">24 per page</option>
        <option value="36">36 per page</option>
        <option value="48">48 per page</option>
        <option value="all">All characters</option>
      </select>
    </div>
    <button id="inventory-clear-filters" class="clear-filters-btn">Clear Filters</button>
  `;
}

/**
 * Applies sorting to an array with consistent logic
 * @param {Array} items - Items to sort
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted items
 */
function applySorting(items, sortBy) {
  const [field, direction] = sortBy.split('-');
  const isAsc = direction === 'asc';

  return [...items].sort((a, b) => {
    let valA, valB;
    
    switch (field) {
      case 'character':
        valA = a.characterName ?? '';
        valB = b.characterName ?? '';
        break;
      case 'items':
        valA = a.uniqueItems ?? 0;
        valB = b.uniqueItems ?? 0;
        break;
      case 'quantity':
        valA = a.totalItems ?? 0;
        valB = b.totalItems ?? 0;
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

/**
 * Updates cache status with consistent messaging
 * @param {string} status - Status message
 * @param {number} duration - Duration to show status (ms)
 */
function updateCacheStatus(status, duration = 2000) {
  const cacheStatus = document.querySelector('.cache-status');
  if (!cacheStatus) return;

  cacheStatus.innerHTML = status;
  
  if (duration > 0) {
    setTimeout(() => {
      const cache = window.inventoryPageCache;
      if (cache) {
        const stats = cache.getStats();
        if (stats) {
          cacheStatus.innerHTML = `📦 Cache: ${stats.size}/${stats.maxSize} pages`;
        }
      }
    }, duration);
  }
}

// ------------------- Global State -------------------
let currentCharacterSummaries = [];
let expandedCharacters = new Set();
let loadedCharacterInventories = new Map(); // Cache for loaded inventory data
let currentFilters = {
  search: '',
  category: 'all',
  type: 'all',
  sortBy: 'character-asc'
};

// Global state for inventory filters
window.inventoryFiltersInitialized = false;
window.savedInventoryFilterState = {};

// Global state for pagination
let currentPage = 1;
let charactersPerPage = 12;

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
 * Initializes the inventory page with the new efficient approach
 * @param {Array} data - Initial inventory data (legacy support)
 * @param {number} page - Current page number
 * @param {HTMLElement} contentDiv - Content container element
 */
async function initializeInventoryPage(data, page = 1, contentDiv) {
  console.log('🎒 ===== EFFICIENT INVENTORY PAGE INITIALIZATION START =====');
  console.log('🎒 Using new efficient approach - loading character summaries first');

  const startTime = Date.now();
  const cache = initializeInventoryCache();

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

  // Create filters container if it doesn't exist
  let filtersContainer = document.querySelector('.search-filter-bar');
  if (!filtersContainer) {
    console.log('🔧 Creating filters container...');
    filtersContainer = document.createElement('div');
    filtersContainer.className = 'search-filter-bar';
    filtersContainer.innerHTML = createFilterHTML();
    
    // Try to insert into the model details data div
    const contentDiv = getContentDiv();
    if (contentDiv) {
      contentDiv.insertBefore(filtersContainer, contentDiv.firstChild);
      console.log('✅ Created and inserted filters into model-details-data');
    } else {
      // Fallback to body
      document.body.appendChild(filtersContainer);
      console.log('⚠️ Created filters and appended to body as fallback');
    }
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
    resultsInfo.innerHTML = '<p>Loading character summaries...</p>';
    // Insert before the container
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

  // Initialize filters and load character summaries
  setupInventoryFilters();
  await loadCharacterSummaries();

  console.log(`✅ Efficient inventory page initialized in ${Date.now() - startTime}ms`);
  console.log('🎒 ===== EFFICIENT INVENTORY PAGE INITIALIZATION END =====');
}

/**
 * Loads character summaries from the new efficient API
 */
async function loadCharacterSummaries() {
  try {
    console.log('📊 Loading character summaries...');
    
    const response = await fetch('/api/inventory/summary');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const { data: summaries } = await response.json();
    
    console.log('📊 Loaded character summaries:', summaries.length);
    
    // Store summaries globally
    currentCharacterSummaries = summaries;
    
    // Apply current filters and render
    applyFiltersAndRender(currentPage);
    
  } catch (error) {
    console.error('❌ Error loading character summaries:', error);
    
    // Show error state
    const container = document.getElementById('inventory-grid');
    if (container) {
      container.innerHTML = `
        <div class="inventory-empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error loading inventory data</h3>
          <p>There was an error loading the character summaries. Please try refreshing the page.</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }
}

/**
 * Loads inventory items for a specific character
 * @param {string} characterName - Name of the character
 * @returns {Promise<Array>} Inventory items for the character
 */
async function loadCharacterInventory(characterName) {
  // Check if already loaded
  if (loadedCharacterInventories.has(characterName)) {
    console.log(`📦 Using cached inventory for ${characterName}`);
    return loadedCharacterInventories.get(characterName);
  }
  
  try {
    console.log(`📦 Loading inventory for character: ${characterName}`);
    
    const response = await fetch(`/api/inventory/characters?characters=${encodeURIComponent(characterName)}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const { data: items } = await response.json();
    
    console.log(`📦 Loaded ${items.length} items for ${characterName}`);
    
    // Cache the inventory data
    loadedCharacterInventories.set(characterName, items);
    
    return items;
  } catch (error) {
    console.error(`❌ Error loading inventory for ${characterName}:`, error);
    return [];
  }
}

// ------------------- Main Rendering Functions -------------------

/**
 * Applies current filters and renders character cards
 * @param {number} page - Current page number (default: 1)
 */
function applyFiltersAndRender(page = 1) {
  const searchTerm = document.getElementById('inventory-search')?.value.toLowerCase() || '';
  const categoryFilter = document.getElementById('inventory-category-filter')?.value || 'all';
  const typeFilter = document.getElementById('inventory-type-filter')?.value || 'all';
  const sortBy = document.getElementById('inventory-sort')?.value || 'character-asc';
  const charactersPerPageSelect = document.getElementById('inventory-characters-per-page');
  const charactersPerPage = charactersPerPageSelect ? 
    (charactersPerPageSelect.value === 'all' ? currentCharacterSummaries.length : parseInt(charactersPerPageSelect.value)) : 
    12;

  console.log('🔍 Applying filters:', { searchTerm, categoryFilter, typeFilter, sortBy, page, charactersPerPage });

  // Save current filter state
  window.savedInventoryFilterState = {
    searchTerm: document.getElementById('inventory-search')?.value || '',
    categoryFilter,
    typeFilter,
    sortBy,
    charactersPerPage: charactersPerPageSelect?.value || '12'
  };

  // Filter character summaries
  let filteredSummaries = currentCharacterSummaries.filter(summary => {
    const matchesSearch = !searchTerm || 
      summary.characterName.toLowerCase().includes(searchTerm);
    
    const matchesCategory = categoryFilter === 'all' || 
      summary.categories.includes(categoryFilter);
    
    const matchesType = typeFilter === 'all' || 
      summary.types.includes(typeFilter);
    
    return matchesSearch && matchesCategory && matchesType;
  });

  // Apply sorting
  filteredSummaries = applySorting(filteredSummaries, sortBy);

  console.log('🔍 Filtered summaries:', filteredSummaries.length);

  // Apply pagination
  const totalPages = Math.ceil(filteredSummaries.length / charactersPerPage);
  const startIndex = (page - 1) * charactersPerPage;
  const endIndex = startIndex + charactersPerPage;
  const paginatedSummaries = filteredSummaries.slice(startIndex, endIndex);

  console.log('🔍 Pagination details:', {
    totalPages,
    startIndex,
    endIndex,
    paginatedSummariesLength: paginatedSummaries.length,
    charactersPerPage
  });

  // Update results info
  if (charactersPerPageSelect && charactersPerPageSelect.value === 'all') {
    updateResultsInfo(filteredSummaries.length, currentCharacterSummaries.length, 'character');
  } else {
    updateResultsInfo(paginatedSummaries.length, filteredSummaries.length, 'character', { page, pages: totalPages });
  }

  // Render character cards
  renderCharacterCards(paginatedSummaries);

  // Update pagination
  if (charactersPerPageSelect && charactersPerPageSelect.value !== 'all' && filteredSummaries.length > charactersPerPage) {
    updateInventoryPagination(page, totalPages, filteredSummaries.length);
  } else {
    removeExistingPagination();
  }
}

/**
 * Renders character cards with summaries
 * @param {Array} summaries - Character summaries to render
 */
function renderCharacterCards(summaries) {
  console.log('🎨 Rendering character cards:', summaries.length);
  
  const container = document.getElementById('inventory-grid');
  if (!container) {
    console.error('❌ Inventory grid container not found');
    return;
  }

  if (summaries.length === 0) {
    // Get current search term for better user feedback
    const searchInput = document.getElementById('inventory-search');
    const searchTerm = searchInput?.value || '';
    const categoryFilter = document.getElementById('inventory-category-filter')?.value || 'all';
    const typeFilter = document.getElementById('inventory-type-filter')?.value || 'all';
    
    let emptyMessage = 'No characters found';
    let emptyDetails = 'Try adjusting your filters or check back later.';
    
    if (searchTerm) {
      emptyMessage = `No characters found for "${searchTerm}"`;
      emptyDetails = `Try a different search term or check your spelling.`;
    } else if (categoryFilter !== 'all' || typeFilter !== 'all') {
      emptyMessage = 'No characters found with current filters';
      emptyDetails = `Try clearing your filters or selecting different options.`;
    }
    
    container.innerHTML = `
      <div class="inventory-empty-state">
        <i class="fas fa-search"></i>
        <h3>${emptyMessage}</h3>
        <p>${emptyDetails}</p>
        ${searchTerm || categoryFilter !== 'all' || typeFilter !== 'all' ? `
          <div class="empty-state-filters">
            <p><strong>Current filters:</strong></p>
            <ul>
              ${searchTerm ? `<li>Search: "${searchTerm}"</li>` : ''}
              ${categoryFilter !== 'all' ? `<li>Category: ${categoryFilter}</li>` : ''}
              ${typeFilter !== 'all' ? `<li>Type: ${typeFilter}</li>` : ''}
            </ul>
            <button onclick="document.getElementById('inventory-clear-filters').click()" class="clear-filters-btn">
              <i class="fas fa-times"></i> Clear All Filters
            </button>
          </div>
        ` : ''}
      </div>
    `;
    return;
  }

  const cardsHTML = summaries.map(summary => {
    const isExpanded = expandedCharacters.has(summary.characterName);
    return `
      <div class="character-inventory-card" data-character="${summary.characterName}">
        <div class="character-inventory-scroll">
          <div class="character-inventory-header ${isExpanded ? 'expanded' : ''}" 
               onclick="toggleCharacterInventory('${summary.characterName}')">
            <div class="character-inventory-info">
              <div class="character-avatar">
                <i class="fas fa-user-circle"></i>
              </div>
              <div class="character-details">
                <h3 class="character-name">${summary.characterName}</h3>
                <div class="character-stats">
                  <span class="stat-item">
                    <i class="fas fa-box"></i>
                    ${summary.uniqueItems} items
                  </span>
                  <span class="stat-item">
                    <i class="fas fa-layer-group"></i>
                    ${summary.totalItems} total
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
            ${isExpanded ? '<div class="loading-inventory"><i class="fas fa-spinner fa-spin"></i> Loading inventory...</div>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHTML;
  console.log('✅ Character cards rendered');
}

/**
 * Updates pagination for inventory results
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of items
 */
function updateInventoryPagination(currentPage, totalPages, totalItems) {
  const contentDiv = getContentDiv();
  if (!contentDiv) {
    console.error('❌ Content div not found');
    return;
  }

  // Remove existing pagination
  removeExistingPagination();

  // Only show pagination if there are multiple pages
  if (totalPages > 1) {
    console.log('📄 Setting up pagination for inventory results:', { currentPage, totalPages, totalItems });
    
    const handlePageChange = (pageNum) => {
      console.log(`🔄 Inventory page change requested to page ${pageNum}`);
      applyFiltersAndRender(pageNum);
    };

    const paginationDiv = createPaginationElement({
      currentPage,
      totalPages,
      handlePageChange,
      type: 'filtered'
    });

    contentDiv.appendChild(paginationDiv);
    console.log('✅ Inventory pagination created successfully');
  }
}

/**
 * Renders items for a specific character
 * @param {Array} items - Character's items
 * @returns {string} HTML for character items
 */
function renderCharacterItems(items) {
  if (!items || items.length === 0) {
    return `
      <div class="character-inventory-empty">
        <i class="fas fa-inbox"></i>
        <p>No items found for this character</p>
      </div>
    `;
  }
  
  // Sort items by quantity (descending) then by name
  const sortedItems = items.sort((a, b) => {
    const quantityDiff = (b.quantity || 0) - (a.quantity || 0);
    if (quantityDiff !== 0) return quantityDiff;
    return (a.itemName || '').localeCompare(b.itemName || '');
  });
  
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
 */
function populateInventoryFilterOptions() {
  console.log('🔧 Populating filter options from character summaries');
  
  // Extract unique values from all character summaries
  const allCategories = new Set();
  const allTypes = new Set();
  
  currentCharacterSummaries.forEach(summary => {
    summary.categories.forEach(cat => allCategories.add(cat));
    summary.types.forEach(type => allTypes.add(type));
  });
  
  const categories = Array.from(allCategories).sort();
  const types = Array.from(allTypes).sort();
  
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
 */
function setupInventoryFilters() {
  console.log('🔧 Setting up inventory filters');
  
  // Check if filters are already initialized
  if (window.inventoryFiltersInitialized) {
    console.log('🔧 Inventory filters already initialized, skipping setup');
    return;
  }
  
  // Show the filters container
  const filtersContainer = document.querySelector('.search-filter-bar');
  if (filtersContainer) {
    filtersContainer.style.display = 'flex';
  }
  
  const searchInput = document.getElementById('inventory-search');
  const catSelect = document.getElementById('inventory-category-filter');
  const typeSelect = document.getElementById('inventory-type-filter');
  const sortSelect = document.getElementById('inventory-sort');
  const charactersPerPageSelect = document.getElementById('inventory-characters-per-page');
  const clearBtn = document.getElementById('inventory-clear-filters');
  
  // Restore filter state if it exists
  const savedFilterState = window.savedInventoryFilterState || {};
  if (savedFilterState.searchTerm && searchInput) searchInput.value = savedFilterState.searchTerm;
  if (savedFilterState.categoryFilter && catSelect) catSelect.value = savedFilterState.categoryFilter;
  if (savedFilterState.typeFilter && typeSelect) typeSelect.value = savedFilterState.typeFilter;
  if (savedFilterState.sortBy && sortSelect) sortSelect.value = savedFilterState.sortBy;
  if (savedFilterState.charactersPerPage && charactersPerPageSelect) charactersPerPageSelect.value = savedFilterState.charactersPerPage;
  
  // Add event listeners with debouncing
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      // Clear existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      // Set new timeout for 300ms debouncing
      searchTimeout = setTimeout(() => {
        console.log('🔍 Search input debounced, applying filters...');
        applyFiltersAndRender(1);
      }, 300);
    });
  }
  
  if (catSelect) catSelect.addEventListener('change', () => applyFiltersAndRender(1));
  if (typeSelect) typeSelect.addEventListener('change', () => applyFiltersAndRender(1));
  if (sortSelect) sortSelect.addEventListener('change', () => applyFiltersAndRender(1));
  if (charactersPerPageSelect) charactersPerPageSelect.addEventListener('change', () => applyFiltersAndRender(1));
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (catSelect) catSelect.value = 'all';
      if (typeSelect) typeSelect.value = 'all';
      if (sortSelect) sortSelect.value = 'character-asc';
      if (charactersPerPageSelect) charactersPerPageSelect.value = '12';
      
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
      
      // Reset pagination and reload character summaries
      currentPage = 1;
      loadCharacterSummaries();
    });
  }
  
  window.inventoryFiltersInitialized = true;
  console.log('✅ Inventory filters setup complete');
}

// ------------------- Interaction Functions -------------------

/**
 * Toggles the expansion state of a character's inventory
 * @param {string} characterName - Name of the character
 */
async function toggleCharacterInventory(characterName) {
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
    
    // Load inventory items if not already loaded
    if (!loadedCharacterInventories.has(characterName)) {
      content.innerHTML = '<div class="loading-inventory"><i class="fas fa-spinner fa-spin"></i> Loading inventory...</div>';
      
      try {
        const items = await loadCharacterInventory(characterName);
        content.innerHTML = renderCharacterItems(items);
      } catch (error) {
        console.error(`❌ Error loading inventory for ${characterName}:`, error);
        content.innerHTML = `
          <div class="character-inventory-empty">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading inventory</p>
            <small>${error.message}</small>
          </div>
        `;
      }
    } else {
      // Use cached inventory data
      const items = loadedCharacterInventories.get(characterName);
      content.innerHTML = renderCharacterItems(items);
    }
  }
}

// ------------------- Export Functions -------------------

export {
  initializeInventoryPage,
  renderCharacterCards,
  populateInventoryFilterOptions,
  setupInventoryFilters,
  toggleCharacterInventory,
  initializeInventoryCache,
  updateInventoryPagination
};

// Make toggleCharacterInventory globally available for HTML onclick
window.toggleCharacterInventory = toggleCharacterInventory;

console.log('🎒 Efficient Inventory.js loaded successfully'); 