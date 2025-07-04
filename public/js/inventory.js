// ============================================================================
// Inventory Management System - STRIPPED DOWN VERSION
// Basic structure and connection functionality for rebuilding
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
 * Creates a basic container for the inventory page
 * @param {HTMLElement} contentDiv - Content container element
 */
function createInventoryContainer(contentDiv) {
  // Create basic container
  let container = document.getElementById('inventory-grid');
  if (!container) {
    container = document.createElement('div');
    container.id = 'inventory-grid';
    container.className = 'inventory-grid';
    contentDiv.appendChild(container);
  }

  // Add basic loading state
  container.innerHTML = `
    <div class="inventory-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading inventory...</p>
    </div>
  `;
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
      <select id="inventory-village-filter">
        <option value="all">All Villages</option>
        <option value="Rudania">Rudania</option>
        <option value="Inariko">Inariko</option>
        <option value="Vhintl">Vhintl</option>
      </select>
    </div>
    <div class="search-filter-control">
      <select id="inventory-sort">
        <option value="character-asc">Character (A-Z)</option>
        <option value="character-desc">Character (Z-A)</option>
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
      default:
        valA = a[field] ?? '';
        valB = b[field] ?? '';
    }
    
    return isAsc
      ? (typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB)
      : (typeof valB === 'string' ? valB.localeCompare(valA) : valB - valA);
  });
}

// ------------------- Global State -------------------
let currentCharacterSummaries = [];
let expandedCharacters = new Set();
let loadedCharacterInventories = new Map(); // Cache for loaded inventory data
let currentFilters = {
  search: '',
  village: 'all',
  sortBy: 'character-asc'
};

// Global state for inventory filters
window.inventoryFiltersInitialized = false;
window.savedInventoryFilterState = {};

// Global state for pagination
let currentPage = 1;
let charactersPerPage = 12;

// ------------------- Page Initialization -------------------

/**
 * Basic initialization function for the inventory page
 * @param {Array} data - Initial inventory data (legacy support)
 * @param {number} page - Current page number
 * @param {HTMLElement} contentDiv - Content container element
 */
async function initializeInventoryPage(data, page = 1, contentDiv) {
  console.log('🎒 ===== BASIC INVENTORY PAGE INITIALIZATION =====');
  
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

  // Create basic container
  createInventoryContainer(contentDiv);

  // Add results info section after container is created
  let resultsInfo = document.querySelector('.inventory-results-info');
  if (!resultsInfo) {
    resultsInfo = document.createElement('div');
    resultsInfo.className = 'inventory-results-info';
    resultsInfo.innerHTML = '<p>Loading character summaries...</p>';
    // Insert before the container
    const container = document.getElementById('inventory-grid');
    if (container) {
      contentDiv.insertBefore(resultsInfo, container);
    }
  } else {
    // If resultsInfo exists but is not in the right place, move it
    const container = document.getElementById('inventory-grid');
    if (container && !contentDiv.contains(resultsInfo) || resultsInfo.nextSibling !== container) {
      if (contentDiv.contains(resultsInfo)) {
        resultsInfo.remove();
      }
      contentDiv.insertBefore(resultsInfo, container);
    }
  }

  // Initialize filters and load character summaries
  setupInventoryFilters();
  await loadCharacterSummaries();

  console.log('✅ Basic inventory page initialized');
  console.log('🎒 Ready for rebuild');
}

/**
 * Loads character summaries from the new efficient API
 */
async function loadCharacterSummaries() {
  try {
    console.log('📊 Loading character summaries...');
    
    // First, load basic character info (fast) and show immediately
    const characterResponse = await fetch('/api/characters/list');
    if (!characterResponse.ok) throw new Error(`HTTP error! status: ${characterResponse.status}`);
    const { data: characters } = await characterResponse.json();
    
    console.log('📊 Loaded character list:', characters.length);
    
    // Show characters immediately with placeholder data
    const initialSummaries = characters.map(char => ({
      ...char,
      totalItems: 0,
      uniqueItems: 0,
      categories: [],
      types: [],
      loading: true
    }));
    
    currentCharacterSummaries = initialSummaries;
    applyFiltersAndRender(currentPage);
    
    // Then, load inventory summary data in the background
    try {
      const summaryResponse = await fetch('/api/inventory/summary');
      if (!summaryResponse.ok) throw new Error(`HTTP error! status: ${summaryResponse.status}`);
      const { data: summaries } = await summaryResponse.json();
      
      console.log('📊 Loaded inventory summaries:', summaries.length);
      
      // Update with real inventory data
      const updatedSummaries = characters.map(char => {
        const summary = summaries.find(s => s.characterName === char.characterName);
        return {
          ...char,
          totalItems: summary?.totalItems || 0,
          uniqueItems: summary?.uniqueItems || 0,
          categories: summary?.categories || [],
          types: summary?.types || [],
          loading: false
        };
      });
      
      currentCharacterSummaries = updatedSummaries;
      applyFiltersAndRender(currentPage);
      
    } catch (summaryError) {
      console.warn('⚠️ Error loading inventory summaries, showing characters without inventory data:', summaryError);
      // Keep the initial character list even if inventory loading fails
    }
    
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
  const villageFilter = document.getElementById('inventory-village-filter')?.value || 'all';
  const sortBy = document.getElementById('inventory-sort')?.value || 'character-asc';
  const charactersPerPageSelect = document.getElementById('inventory-characters-per-page');
  const charactersPerPage = charactersPerPageSelect ? 
    (charactersPerPageSelect.value === 'all' ? currentCharacterSummaries.length : parseInt(charactersPerPageSelect.value)) : 
    12;

  console.log('🔍 Applying filters:', { searchTerm, villageFilter, sortBy, page, charactersPerPage });

  // Save current filter state
  window.savedInventoryFilterState = {
    searchTerm: document.getElementById('inventory-search')?.value || '',
    villageFilter,
    sortBy,
    charactersPerPage: charactersPerPageSelect?.value || '12'
  };

  // Filter character summaries
  let filteredSummaries = currentCharacterSummaries.filter(summary => {
    const matchesSearch = !searchTerm || 
      summary.characterName.toLowerCase().includes(searchTerm);
    
    const matchesVillage = villageFilter === 'all' || 
      summary.currentVillage === villageFilter;
    
    return matchesSearch && matchesVillage;
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
    const villageFilter = document.getElementById('inventory-village-filter');
    const searchTerm = searchInput?.value || '';
    const selectedVillage = villageFilter?.value || 'all';
    
    let emptyMessage = 'No characters found';
    let emptyDetails = 'Try adjusting your search or check back later.';
    
    if (searchTerm && selectedVillage !== 'all') {
      emptyMessage = `No characters found for "${searchTerm}" in ${selectedVillage}`;
      emptyDetails = `Try a different search term or select a different village.`;
    } else if (searchTerm) {
      emptyMessage = `No characters found for "${searchTerm}"`;
      emptyDetails = `Try a different search term or check your spelling.`;
    } else if (selectedVillage !== 'all') {
      emptyMessage = `No characters found in ${selectedVillage}`;
      emptyDetails = `Try selecting a different village or check back later.`;
    }
    
    container.innerHTML = `
      <div class="inventory-empty-state">
        <i class="fas fa-search"></i>
        <h3>${emptyMessage}</h3>
        <p>${emptyDetails}</p>
        ${searchTerm || selectedVillage !== 'all' ? `
          <div class="empty-state-filters">
            <p><strong>Current filters:</strong></p>
            <ul>
              ${searchTerm ? `<li>Search: "${searchTerm}"</li>` : ''}
              ${selectedVillage !== 'all' ? `<li>Village: ${selectedVillage}</li>` : ''}
            </ul>
            <button onclick="document.getElementById('inventory-clear-filters').click()" class="clear-filters-btn">
              <i class="fas fa-times"></i> Clear Filters
            </button>
          </div>
        ` : ''}
      </div>
    `;
    return;
  }

  const cardsHTML = summaries.map(summary => {
    const isExpanded = expandedCharacters.has(summary.characterName);
    console.log(`🎭 Character ${summary.characterName} icon:`, summary.icon);
    return `
      <div class="character-inventory-card" data-character="${summary.characterName}">
        <div class="character-inventory-scroll">
          <div class="character-inventory-header ${isExpanded ? 'expanded' : ''}" 
               onclick="toggleCharacterInventory('${summary.characterName}')">
            <div class="character-inventory-info">
              <div class="character-avatar">
                ${summary.icon && summary.icon.startsWith('http')
                  ? `<img src="${summary.icon}" alt="${summary.characterName} avatar" style="width:100%;height:100%;object-fit:cover;" />`
                  : `<i class="fas fa-user-circle"></i>`
                }
              </div>
              <div class="character-inventory-details">
                <h3 class="character-inventory-name">${summary.characterName}</h3>
                <div class="character-inventory-stats">
                  ${summary.loading ? `
                    <span class="inventory-stat-item loading">
                      <i class="fas fa-spinner fa-spin"></i>
                      Loading...
                    </span>
                  ` : `
                    <span class="inventory-stat-item">
                      <i class="fas fa-box"></i>
                      ${summary.uniqueItems} items
                    </span>
                    <span class="inventory-stat-item">
                      <i class="fas fa-layer-group"></i>
                      ${summary.totalItems} total
                    </span>
                  `}
                  ${summary.job ? `
                    <span class="inventory-stat-item">
                      <i class="fas fa-briefcase"></i>
                      ${summary.job}
                    </span>
                  ` : ''}
                  ${summary.currentVillage ? `
                    <span class="inventory-stat-item">
                      <i class="fas fa-map-marker-alt"></i>
                      ${summary.currentVillage}
                    </span>
                  ` : ''}
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
 * @param {string} characterName - Name of the character
 * @param {boolean} renderFilterBar - Whether to render the filter bar (default: true)
 * @returns {string} HTML for character items
 */
function renderCharacterItems(items, characterName, renderFilterBar = true) {
  if (!items || items.length === 0) {
    return `
      <div class="character-inventory-empty">
        <i class="fas fa-inbox"></i>
        <p>No items found for this character</p>
      </div>
    `;
  }

  // Filter out items with 0 quantity
  let filteredItems = items.filter(item => (item.quantity || 0) > 0);
  if (filteredItems.length === 0) {
    return `
      <div class="character-inventory-empty">
        <i class="fas fa-inbox"></i>
        <p>No items found for this character</p>
      </div>
    `;
  }

  // --- Per-character filter state ---
  if (!window.characterItemFilters) window.characterItemFilters = {};
  if (!window.characterItemFilters[characterName]) {
    window.characterItemFilters[characterName] = {
      search: '',
      category: 'all',
      type: 'all',
      sort: 'name-asc'
    };
  }
  const filterState = window.characterItemFilters[characterName];

  // Populate filter options from this character's items
  const allCategories = Array.from(new Set(
    filteredItems.flatMap(item => {
      if (Array.isArray(item.category)) return item.category;
      if (typeof item.category === 'string' && item.category.includes(',')) return item.category.split(',').map(s => s.trim());
      return [item.category];
    })
  )).filter(Boolean).sort();
  const allTypes = Array.from(new Set(
    filteredItems.flatMap(item => {
      if (Array.isArray(item.type)) return item.type;
      if (typeof item.type === 'string' && item.type.includes(',')) return item.type.split(',').map(s => s.trim());
      return [item.type];
    })
  )).filter(Boolean).sort();

  // Apply filters
  filteredItems = filteredItems.filter(item => {
    const matchesSearch = !filterState.search || item.itemName.toLowerCase().includes(filterState.search.toLowerCase());
    // Category filter: match if selected category is in item's category array or string
    const itemCategories = Array.isArray(item.category)
      ? item.category
      : (typeof item.category === 'string' && item.category.includes(','))
        ? item.category.split(',').map(s => s.trim())
        : [item.category];
    const matchesCategory = filterState.category === 'all' || itemCategories.includes(filterState.category);
    // Type filter: match if selected type is in item's type array or string
    const itemTypes = Array.isArray(item.type)
      ? item.type
      : (typeof item.type === 'string' && item.type.includes(','))
        ? item.type.split(',').map(s => s.trim())
        : [item.type];
    const matchesType = filterState.type === 'all' || itemTypes.includes(filterState.type);
    return matchesSearch && matchesCategory && matchesType;
  });

  // Apply sort
  filteredItems = [...filteredItems].sort((a, b) => {
    switch (filterState.sort) {
      case 'name-asc':
        return (a.itemName || '').localeCompare(b.itemName || '');
      case 'name-desc':
        return (b.itemName || '').localeCompare(a.itemName || '');
      case 'quantity-asc':
        return (a.quantity || 0) - (b.quantity || 0);
      case 'quantity-desc':
        return (b.quantity || 0) - (a.quantity || 0);
      default:
        return 0;
    }
  });

  // Only render filter bar if requested (first time or when options change)
  let filterBar = '';
  if (renderFilterBar) {
    filterBar = `
      <div class="character-item-filter-bar" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
        <input type="text" class="character-item-search" placeholder="Search items..." value="${filterState.search}" style="padding:0.3em 0.7em;border-radius:5px;border:1px solid #ccc;min-width:120px;" />
        <select class="character-item-category">
          <option value="all">All Categories</option>
          ${allCategories.map(cat => `<option value="${cat}" ${filterState.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
        </select>
        <select class="character-item-type">
          <option value="all">All Types</option>
          ${allTypes.map(type => `<option value="${type}" ${filterState.type === type ? 'selected' : ''}>${type}</option>`).join('')}
        </select>
        <select class="character-item-sort">
          <option value="name-asc" ${filterState.sort === 'name-asc' ? 'selected' : ''}>Name (A-Z)</option>
          <option value="name-desc" ${filterState.sort === 'name-desc' ? 'selected' : ''}>Name (Z-A)</option>
          <option value="quantity-asc" ${filterState.sort === 'quantity-asc' ? 'selected' : ''}>Quantity (Low-High)</option>
          <option value="quantity-desc" ${filterState.sort === 'quantity-desc' ? 'selected' : ''}>Quantity (High-Low)</option>
        </select>
        <button class="character-item-clear-filters" style="margin-left:0.5em;">Clear</button>
      </div>
    `;
  }

  // Items grid HTML
  const itemsGrid = `
    <div class="character-items-grid">
      ${filteredItems.map(item => `
        <div class="inventory-item-card" data-item="${item.itemName}">
          <div class="inventory-item-icon">
            ${item.image && item.image !== 'No Image'
              ? `<img src="${item.image}" alt="${item.itemName} icon" style="width:100%;height:100%;object-fit:cover;" />`
              : `<i class="fas fa-box"></i>`
            }
          </div>
          <div class="inventory-item-details">
            <h4 class="inventory-item-name">${item.itemName}</h4>
            <div class="inventory-item-meta">
              <span class="inventory-item-quantity">
                <i class="fas fa-layer-group"></i>
                ${item.quantity}
              </span>
              ${item.category ? `
                <span class="inventory-item-category">
                  <i class="fas fa-tag"></i>
                  ${item.category}
                </span>
              ` : ''}
              ${item.type ? `
                <span class="inventory-item-type">
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

  // Attach event listeners only if rendering filter bar
  if (renderFilterBar) {
    setTimeout(() => {
      const container = document.querySelector(`[data-character="${characterName}"] .character-inventory-content.expanded`);
      if (!container) return;
      
      const searchInput = container.querySelector('.character-item-search');
      const categorySelect = container.querySelector('.character-item-category');
      const typeSelect = container.querySelector('.character-item-type');
      const sortSelect = container.querySelector('.character-item-sort');
      const clearBtn = container.querySelector('.character-item-clear-filters');
      
      if (searchInput) {
        searchInput.oninput = e => { 
          filterState.search = e.target.value; 
          updateCharacterItemsGrid(items, characterName); 
        };
      }
      if (categorySelect) {
        categorySelect.onchange = e => { 
          filterState.category = e.target.value; 
          updateCharacterItemsGrid(items, characterName); 
        };
      }
      if (typeSelect) {
        typeSelect.onchange = e => { 
          filterState.type = e.target.value; 
          updateCharacterItemsGrid(items, characterName); 
        };
      }
      if (sortSelect) {
        sortSelect.onchange = e => { 
          filterState.sort = e.target.value; 
          updateCharacterItemsGrid(items, characterName); 
        };
      }
      if (clearBtn) {
        clearBtn.onclick = () => { 
          filterState.search = ''; 
          filterState.category = 'all'; 
          filterState.type = 'all'; 
          filterState.sort = 'name-asc'; 
          updateCharacterItemsGrid(items, characterName);
          // Update the input value without re-rendering
          if (searchInput) searchInput.value = '';
          if (categorySelect) categorySelect.value = 'all';
          if (typeSelect) typeSelect.value = 'all';
          if (sortSelect) sortSelect.value = 'name-asc';
        };
      }
    }, 0);
  }

  return filterBar + itemsGrid;
}

/**
 * Updates only the items grid without re-rendering the filter bar
 * @param {Array} items - Character's items
 * @param {string} characterName - Name of the character
 */
function updateCharacterItemsGrid(items, characterName) {
  const container = document.querySelector(`[data-character="${characterName}"] .character-inventory-content.expanded`);
  if (!container) return;
  
  // Find the existing items grid
  const existingGrid = container.querySelector('.character-items-grid');
  if (!existingGrid) return;
  
  // Render only the items grid (without filter bar)
  const itemsOnly = renderCharacterItems(items, characterName, false);
  
  // Extract just the items grid HTML (remove filter bar part)
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = itemsOnly;
  const newItemsGrid = tempDiv.querySelector('.character-items-grid');
  
  if (newItemsGrid) {
    existingGrid.innerHTML = newItemsGrid.innerHTML;
  }
}

// ------------------- Filter and Sort Functions -------------------

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
  const villageFilter = document.getElementById('inventory-village-filter');
  const sortSelect = document.getElementById('inventory-sort');
  const charactersPerPageSelect = document.getElementById('inventory-characters-per-page');
  const clearBtn = document.getElementById('inventory-clear-filters');
  
  // Restore filter state if it exists
  const savedFilterState = window.savedInventoryFilterState || {};
  if (savedFilterState.searchTerm && searchInput) searchInput.value = savedFilterState.searchTerm;
  if (savedFilterState.villageFilter && villageFilter) villageFilter.value = savedFilterState.villageFilter;
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
  
  if (villageFilter) villageFilter.addEventListener('change', () => applyFiltersAndRender(1));
  if (sortSelect) sortSelect.addEventListener('change', () => applyFiltersAndRender(1));
  if (charactersPerPageSelect) charactersPerPageSelect.addEventListener('change', () => applyFiltersAndRender(1));
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (villageFilter) villageFilter.value = 'all';
      if (sortSelect) sortSelect.value = 'character-asc';
      if (charactersPerPageSelect) charactersPerPageSelect.value = '12';
      
      currentFilters = {
        search: '',
        village: 'all',
        sortBy: 'character-asc'
      };
      
      // Clear saved filter state
      window.savedInventoryFilterState = {};
      
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
        content.innerHTML = renderCharacterItems(items, characterName);
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
      content.innerHTML = renderCharacterItems(items, characterName);
    }
  }
}

// ------------------- Export Functions -------------------

export {
  initializeInventoryPage,
  renderCharacterCards,
  setupInventoryFilters,
  toggleCharacterInventory,
  updateInventoryPagination
};

// Make toggleCharacterInventory globally available for HTML onclick
window.toggleCharacterInventory = toggleCharacterInventory;

console.log('🎒 Stripped Inventory.js loaded successfully'); 