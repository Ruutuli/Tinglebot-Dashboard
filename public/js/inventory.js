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

  // Create filters container if it doesn't exist
  let filtersContainer = document.querySelector('.inventory-filters');
  if (!filtersContainer) {
    filtersContainer = document.createElement('div');
    filtersContainer.className = 'inventory-filters';
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
  }

  // Create inventory container if it doesn't exist
  let container = document.getElementById('inventory-grid');
  if (!container) {
    container = document.createElement('div');
    container.id = 'inventory-grid';
    container.className = 'inventory-grid';
    contentDiv.appendChild(container);
  }

  // Add results info section
  let resultsInfo = document.querySelector('.inventory-results-info');
  if (!resultsInfo) {
    resultsInfo = document.createElement('div');
    resultsInfo.className = 'inventory-results-info';
    resultsInfo.innerHTML = '<p>Loading inventory data...</p>';
    contentDiv.insertBefore(resultsInfo, container);
  }

  // Initialize filters and render data
  populateInventoryFilterOptions(data);
  setupInventoryFilters(data);
  await renderInventoryItems(data, page);

  // Update results info
  if (resultsInfo) {
    resultsInfo.innerHTML = `<p>Showing ${data.length} inventory entries</p>`;
  }

  console.log('✅ Inventory page initialized');
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
  
  currentInventoryData = inventories;
  characterGroups = groupInventoriesByCharacter(inventories);
  
  const container = document.getElementById('inventory-grid');
  if (!container) {
    console.error('❌ Inventory grid container not found');
    return;
  }
  
  // Show loading state briefly for better UX
  container.innerHTML = `
    <div class="inventory-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Organizing inventory data...</p>
    </div>
  `;
  
  // Use setTimeout to allow DOM update and show loading state
  setTimeout(() => {
    const characterCards = renderCharacterInventoryCards();
    container.innerHTML = characterCards;
    
    // Initialize character cards after rendering
    initializeCharacterCards();
    
    console.log('✅ Inventory rendering complete');
  }, 100);
}

/**
 * Groups inventory items by character
 * @param {Array} inventories - Raw inventory data
 * @returns {Map} Character groups with their items
 */
function groupInventoriesByCharacter(inventories) {
  const groups = new Map();
  
  inventories.forEach(item => {
    const charName = item.characterName || 'Unknown Character';
    
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
    totalItems: inventories.length
  });
  
  return groups;
}

/**
 * Renders character inventory cards
 * @returns {string} HTML for character cards
 */
function renderCharacterInventoryCards() {
  const sortedCharacters = sortCharacterGroups();
  
  if (sortedCharacters.length === 0) {
    return `
      <div class="inventory-empty-state">
        <i class="fas fa-box-open"></i>
        <h3>No inventory data found</h3>
        <p>Try adjusting your filters or check back later.</p>
      </div>
    `;
  }
  
  return sortedCharacters.map(character => {
    const isExpanded = expandedCharacters.has(character.characterName);
    const itemCount = character.items.length;
    const totalQuantity = character.totalItems;
    
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
  
  const searchInput = document.getElementById('inventory-search');
  const catSelect = document.getElementById('inventory-category-filter');
  const typeSelect = document.getElementById('inventory-type-filter');
  const sortSelect = document.getElementById('inventory-sort');
  const clearBtn = document.getElementById('inventory-clear-filters');
  
  function applyFilters() {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const categoryFilter = catSelect?.value || 'all';
    const typeFilter = typeSelect?.value || 'all';
    const sortBy = sortSelect?.value || 'character-asc';
    
    // Update current filters
    currentFilters = {
      search: searchTerm,
      category: categoryFilter,
      type: typeFilter,
      sortBy
    };
    
    console.log('🔍 Applying filters:', currentFilters);
    
    // Filter the data
    let filtered = inventories.filter(inv => {
      const matchesSearch = searchTerm === '' ||
        inv.itemName?.toLowerCase().includes(searchTerm) ||
        inv.characterName?.toLowerCase().includes(searchTerm);
      const matchesCategory = categoryFilter === 'all' || inv.category === categoryFilter;
      const matchesType = typeFilter === 'all' || inv.type === typeFilter;
      
      return matchesSearch && matchesCategory && matchesType;
    });
    
    // Re-render with filtered data
    renderInventoryItems(filtered, 1);
  }
  
  // Add event listeners
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (catSelect) catSelect.addEventListener('change', applyFilters);
  if (typeSelect) typeSelect.addEventListener('change', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
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
      
      renderInventoryItems(inventories, 1);
    });
  }
  
  console.log('✅ Inventory filters setup complete');
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
 * Updates inventory pagination (simplified for character-based view)
 * @param {Array} inventories - Raw inventory data
 * @param {number} currentPage - Current page number
 */
function updateInventoryPagination(inventories, currentPage) {
  // For character-based view, pagination is handled differently
  // We show all characters but can implement pagination if needed
  console.log('📄 Pagination updated:', { currentPage, totalItems: inventories.length });
}

// ------------------- Export Functions -------------------

export {
  initializeInventoryPage,
  renderInventoryItems,
  populateInventoryFilterOptions,
  setupInventoryFilters,
  updateInventoryPagination,
  toggleCharacterInventory
};

// Make toggleCharacterInventory globally available for HTML onclick
window.toggleCharacterInventory = toggleCharacterInventory; 