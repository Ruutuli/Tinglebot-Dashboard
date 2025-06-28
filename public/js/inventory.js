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
              <div class="character-inventory-details">
                <h3 class="character-inventory-name">${summary.characterName}</h3>
                <div class="character-inventory-stats">
                  <span class="inventory-stat-item">
                    <i class="fas fa-box"></i>
                    ${summary.uniqueItems} items
                  </span>
                  <span class="inventory-stat-item">
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
        <div class="inventory-item-card" data-item="${item.itemName}">
          <div class="inventory-item-icon">
            <i class="fas fa-box"></i>
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
  updateInventoryPagination
};

// Make toggleCharacterInventory globally available for HTML onclick
window.toggleCharacterInventory = toggleCharacterInventory;

console.log('🎒 Stripped Inventory.js loaded successfully'); 