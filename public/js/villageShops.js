/* ====================================================================== */
/* Village Shops Rendering and Filtering Module                          */
/* Handles village shop item card rendering, filtering, pagination       */
/* ====================================================================== */

import { scrollToTop } from './ui.js';

// ============================================================================
// ------------------- Rendering: Village Shop Item Cards -------------------
// Displays village shop items with pagination and category-based styling
// ============================================================================

// ------------------- Function: renderVillageShopCards -------------------
// Renders all village shop item cards with pagination and detail sections
function renderVillageShopCards(items, page = 1, totalItems = null) {
    // ------------------- Sort Items Alphabetically by Default -------------------
    const sortedItems = [...items].sort((a, b) => {
      const nameA = (a.itemName || '').toLowerCase();
      const nameB = (b.itemName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    console.log('🏪 Starting village shop rendering:', { 
      itemsLength: sortedItems?.length,
      page,
      totalItems,
      firstItem: sortedItems?.[0]?.itemName
    });

    // Scroll to top of the page
    scrollToTop();

    const grid = document.getElementById('village-shops-container');
    if (!grid) {
      console.error('❌ Grid container not found');
      return;
    }
    console.log('✅ Found grid container');
  
    // ------------------- No Items Found -------------------
    if (!sortedItems || sortedItems.length === 0) {
      console.log('⚠️ No village shop items to render');
      grid.innerHTML = '<div class="village-shop-loading">No village shop items found</div>';
      const pagination = document.getElementById('village-shop-pagination');
      if (pagination) pagination.innerHTML = '';
      return;
    }
  
    console.log('✅ Village shop items sorted alphabetically');
    
    // Get items per page setting
    const itemsPerPageSelect = document.getElementById('items-per-page');
    const itemsPerPage = itemsPerPageSelect ? 
      (itemsPerPageSelect.value === 'all' ? sortedItems.length : parseInt(itemsPerPageSelect.value)) : 
      12;
    
    // Calculate pagination info - use totalItems if provided, otherwise use current items length
    const itemsForPagination = totalItems !== null ? totalItems : sortedItems.length;
    const totalPages = Math.ceil(itemsForPagination / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, itemsForPagination);
  
    // ------------------- Render Village Shop Item Cards -------------------
    console.log('🎨 Rendering village shop item cards');
    grid.innerHTML = sortedItems.map(item => {
      console.log('🏪 Processing village shop item:', item.itemName);
      
      // Helper for tags
      const renderTags = arr => (Array.isArray(arr) ? arr.filter(Boolean).map(tag => `<span class="item-tag">${tag.trim()}</span>`).join('') : '');
      
      // Emoji: show as image if it looks like a URL, else as text, but hide Discord codes
      let emoji = '';
      if (item.emoji && item.emoji.startsWith('http')) {
        emoji = `<img src="${item.emoji}" alt="emoji" class="item-emoji-img">`;
      } else if (item.emoji && !item.emoji.startsWith('<:')) {
        emoji = `<span class="item-emoji">${item.emoji}</span>`;
      }
      
      // Section helpers
      const obtainTags = item.obtainTags?.length ? item.obtainTags : item.obtain;
      const locationsTags = item.locationsTags?.length ? item.locationsTags : item.locations;
      const jobsTags = item.allJobsTags?.length ? item.allJobsTags : item.allJobs;
      
      // Crafting materials
      const craftingMaterials = Array.isArray(item.craftingMaterial) && item.craftingMaterial.length
        ? item.craftingMaterial.map(mat => {
            // Handle both string format and object format for backward compatibility
            if (typeof mat === 'string') {
              return `<div class="item-crafting-row"><span class="item-tag">${mat}</span></div>`;
            } else if (mat && typeof mat === 'object' && mat.quantity && mat.itemName) {
              return `<div class="item-crafting-row"><span class="item-crafting-qty">${mat.quantity} ×</span> <span class="item-tag">${mat.itemName}</span></div>`;
            } else {
              return `<div class="item-crafting-row"><span class="item-tag">${mat}</span></div>`;
            }
          }).join('')
        : '';
      
      // Special weather
      let weatherTags = '';
      if (item.specialWeather) {
        // Handle both boolean and object formats for backward compatibility
        if (typeof item.specialWeather === 'boolean' && item.specialWeather) {
          weatherTags = '<span class="item-tag">Special Weather</span>';
        } else if (typeof item.specialWeather === 'object') {
          const weatherMap = {
            muggy: 'Muggy',
            flowerbloom: 'Flowerbloom',
            fairycircle: 'Fairycircle',
            jubilee: 'Jubilee',
            meteorShower: 'Meteor Shower',
            rockslide: 'Rockslide',
            avalanche: 'Avalanche'
          };
          weatherTags = Object.entries(weatherMap)
            .filter(([key]) => item.specialWeather[key])
            .map(([, label]) => `<span class="item-tag">${label}</span>`)
            .join('');
        }
      }
      
      // Subtype
      const subtype = Array.isArray(item.subtype) ? item.subtype.filter(Boolean).join(', ') : (item.subtype || '');
      
      // Slot (Head/Chest/Legs/Weapon/Shield etc.)
      const slot = (item.type && item.type.length > 0) ? item.type[0] : '';
      
      // Type bar color/icon
      const mainType = (item.category && (Array.isArray(item.category) ? item.category[0] : item.category)) || 'Misc';
      
      // Type bar color (fallback to blue)
      const typeColorMap = {
        'Armor': '#1F5D50',
        'Weapon': '#B99F65',
        'Shield': '#6A8ED6',
        'Material': '#0169A0',
        'Recipe': '#AF966D',
        'Misc': '#888888',
      };
      const typeBarColor = typeColorMap[mainType] || '#1F5D50';
      
      // Stats logic variables
      const isCraftable = Array.isArray(item.craftingMaterial) && item.craftingMaterial.length > 0;
      const isArmor = (item.category && (Array.isArray(item.category) ? item.category.includes('Armor') : item.category === 'Armor'));
      const isWeapon = (item.category && (Array.isArray(item.category) ? item.category.includes('Weapon') : item.category === 'Weapon'));
      const isRecipe = (item.category && (Array.isArray(item.category) ? item.category.includes('Recipe') : item.category === 'Recipe'));

      return `
        <div class="model-details-item village-shop-card modern-item-card" data-item-name="${item.itemName}">
          <div class="item-header-row modern-item-header">
            <div class="item-image-card">
              <img 
                src="${formatItemImageUrl(item.image)}" 
                alt="${item.itemName}" 
                class="item-image modern-item-image"
                onerror="console.error('❌ Failed to load:', this.src); this.src='/images/ankleicon.png';"
                crossorigin="anonymous"
              >
              ${emoji}
            </div>
            <div class="item-header-info modern-item-header-info">
              <div class="item-name-row">
                <span class="item-name-big">${item.itemName}</span>
                <div class="stock-badge" title="Current stock in village shops">
                  <i class="fas fa-boxes"></i>
                  <span class="stock-count">${item.stock || 0}</span>
                </div>
              </div>
              <div class="item-type-bar" style="background:${typeBarColor};">
                ${renderItemTypeIcon(item.imageType)}
                <span class="item-type-bar-label">${mainType}</span>
              </div>
              <div class="item-slot-row">
                ${slot ? `<span class="item-slot-label">${slot}</span>` : ''}
                ${subtype ? `<span class="item-subtype-label">${subtype}</span>` : ''}
              </div>
            </div>
          </div>
          
          <div class="item-section modern-item-details">
            <div class="item-section-label modern-item-section-label"><i class="fas fa-info-circle"></i> Details</div>
            <div class="item-detail-list modern-item-detail-list">
              <div class="item-detail-row modern-item-detail-row">
                <strong>Buy:</strong> <span>${item.buyPrice ?? 0}</span> 
                <strong style="margin-left:1.2em;">Sell:</strong> <span>${item.sellPrice ?? 0}</span>
              </div>
              <div class="item-detail-row modern-item-detail-row">
                <strong>Stock:</strong> <span>${item.stock || 0}</span>
              </div>
              <div class="item-detail-row modern-item-detail-row">
                <strong>Stackable:</strong> <span>${item.stackable ? `Yes (Max: ${item.maxStackSize || 10})` : 'No'}</span>
              </div>
            </div>
          </div>
          
          <div class="item-section modern-item-section">
            <div class="item-section-label modern-item-section-label"><i class="fas fa-route"></i> Sources</div>
            <div class="item-tag-list modern-item-tag-list">
              ${obtainTags && obtainTags.filter(Boolean).length ? renderTags(obtainTags) : '<span class="item-tag">None</span>'}
            </div>
          </div>
          
          <div class="item-section modern-item-section">
            <div class="item-section-label modern-item-section-label"><i class="fas fa-map-marker-alt"></i> Locations</div>
            <div class="item-tag-list modern-item-tag-list">
              ${locationsTags && locationsTags.filter(Boolean).length ? renderLocationTags(locationsTags) : '<span class="item-tag">None</span>'}
            </div>
          </div>
          
          <div class="item-section modern-item-section">
            <div class="item-section-label modern-item-section-label"><i class="fas fa-user"></i> Jobs</div>
            <div class="item-tag-list modern-item-tag-list">
              ${jobsTags && jobsTags.filter(Boolean).length ? renderTags(jobsTags) : '<span class="item-tag">None</span>'}
            </div>
          </div>
          
          <div class="item-section modern-item-section">
            <div class="item-section-label modern-item-section-label"><i class="fas fa-tools"></i> Crafting Materials</div>
            <div class="item-crafting-list modern-item-crafting-list">
              ${craftingMaterials ? craftingMaterials : '<div class="item-crafting-row"><span class="item-tag">Not Craftable</span></div>'}
            </div>
          </div>
          
          <div class="item-section modern-item-section">
            <div class="item-section-label modern-item-section-label"><i class="fas fa-cloud-sun"></i> Special Weather</div>
            <div class="item-tag-list modern-item-tag-list">
              ${weatherTags ? weatherTags : '<span class="item-tag">None</span>'}
            </div>
          </div>
          
          ${isCraftable ? `
          <div class="item-section modern-item-section">
            <div class="item-section-label modern-item-section-label"><i class="fas fa-chart-bar"></i> Stats</div>
            <div class="item-stats-row modern-item-stats-row">
              ${isRecipe ? `
                <span class="item-stat-pill modern-item-stat-pill">
                  <i class="fas fa-heart"></i>
                  <span class="stat-label">Hearts Recovered:</span>
                  <span class="stat-value">${item.modifierHearts ?? 0}</span>
                </span>
                <span class="item-stat-pill modern-item-stat-pill">
                  <i class="fas fa-bolt"></i>
                  <span class="stat-label">Stamina Recovered:</span>
                  <span class="stat-value">${item.staminaRecovered ?? 0}</span>
                </span>
                ${item.staminaToCraft !== null && item.staminaToCraft !== undefined ? `
                  <span class="item-stat-pill modern-item-stat-pill">
                    <i class="fas fa-fire"></i>
                    <span class="stat-label">Stamina to Craft:</span>
                    <span class="stat-value">${item.staminaToCraft}</span>
                  </span>
                ` : ''}
              ` : (isArmor || isWeapon) ? `
                <span class="item-stat-pill modern-item-stat-pill">
                  <i class="fas fa-heart"></i>
                  <span class="stat-label">Modifier:</span>
                  <span class="stat-value">${item.modifierHearts ?? 0}</span>
                </span>
                ${item.staminaToCraft !== null && item.staminaToCraft !== undefined ? `
                  <span class="item-stat-pill modern-item-stat-pill">
                    <i class="fas fa-fire"></i>
                    <span class="stat-label">Stamina to Craft:</span>
                    <span class="stat-value">${item.staminaToCraft}</span>
                  </span>
                ` : ''}
              ` : `
                <span class="item-stat-pill modern-item-stat-pill">
                  <i class="fas fa-heart"></i>
                  <span class="stat-label">Hearts Recovered:</span>
                  <span class="stat-value">${item.modifierHearts ?? 0}</span>
                </span>
                <span class="item-stat-pill modern-item-stat-pill">
                  <i class="fas fa-bolt"></i>
                  <span class="stat-label">Stamina Recovered:</span>
                  <span class="stat-value">${item.staminaRecovered ?? 0}</span>
                </span>
                ${item.staminaToCraft !== null && item.staminaToCraft !== undefined ? `
                  <span class="item-stat-pill modern-item-stat-pill">
                    <i class="fas fa-fire"></i>
                    <span class="stat-label">Stamina to Craft:</span>
                    <span class="stat-value">${item.staminaToCraft}</span>
                  </span>
                ` : ''}
              `}
            </div>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');
    console.log('✅ Village shop item cards rendered');

    // Update results info
    const resultsInfo = document.querySelector('.village-shop-results-info p');
    if (resultsInfo) {
      const totalPages = Math.ceil(itemsForPagination / itemsPerPage);
      resultsInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${itemsForPagination} village shop items (Page ${page} of ${totalPages})`;
    }
  }
  
  // ============================================================================
// ------------------- Rendering: Helpers -------------------
// Returns detail items, formatted values, and modal content
// ============================================================================

// ------------------- Function: renderDetail -------------------
// Returns HTML for a basic item detail row
function renderDetail(label, value) {
  return `
    <div class="item-detail">
      <div class="item-detail-label">${label}</div>
      <div class="item-detail-value">${value}</div>
    </div>
  `;
}

// ------------------- Function: capitalize -------------------
// Capitalizes the first letter of a string safely
function capitalize(str) {
  return typeof str === 'string' ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ------------------- Function: formatItemImageUrl -------------------
// Formats and returns item image URL
function formatItemImageUrl(image) {
  if (!image || image === 'No Image') return '/images/ankleicon.png';
  if (image.startsWith('http')) return image;
  return `/api/images/${image}`;
}

// ------------------- Function: renderLocationTags -------------------
// Renders location tags with color classes
function renderLocationTags(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.filter(Boolean).map(tag => {
    const key = tag.trim().toLowerCase();
    const colorClass = LOCATION_COLORS[key] || '';
    return `<span class="item-tag ${colorClass}">${tag.trim()}</span>`;
  }).join('');
}

// ------------------- Function: renderItemTypeIcon -------------------
// Renders the item type icon for a given image type
function renderItemTypeIcon(imageType) {
  if (imageType && imageType !== 'No Image Type') {
    // Use imageType as a direct image URL
    return `<img src="${imageType}" alt="Type Icon" class="item-type-icon" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<i class=\'fas fa-star\'></i>')">`;
  } else {
    // Fallback icon (FontAwesome star)
    return `<i class="fas fa-star"></i>`;
  }
}

// ============================================================================
// ------------------- Filtering: Dropdown and Search -------------------
// Applies filters to village shop item list based on UI selection
// ============================================================================

// Helper function to split comma-separated values and handle arrays
const splitValues = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    // Flatten and split any comma-separated strings inside the array
    return value.flatMap(v => splitValues(v));
  }
  if (typeof value === 'string') {
    // Split comma-separated, trim, and filter out empty
    return value.split(',').map(v => v.trim()).filter(v => v);
  }
  return [];
};

// Fetch all village shop items for filter dropdowns and cache them
async function fetchAllVillageShopItemsForFilters() {
  if (window.allVillageShopItemsForFilters) return window.allVillageShopItemsForFilters;
  try {
    const response = await fetch('/api/models/villageShops?all=true');
    if (!response.ok) throw new Error('Failed to fetch all village shop items for filters');
    const { data } = await response.json();
    window.allVillageShopItemsForFilters = data;
    return data;
  } catch (err) {
    console.error('[Filter Debug] Failed to fetch all village shop items for filters, using current page only:', err);
    // Fallback: use current page items if available
    return window.allVillageShopItems || [];
  }
}

// ------------------- Function: populateFilterOptions -------------------
// Populates dropdowns for category, type, subtype, jobs, and locations based on unique values
async function populateFilterOptions(items) {
  // Always load from JSON file first
  await loadFilterOptionsFromJSON();
  
  // If we have items, we could also populate from live data, but for now we'll just use the JSON
  if (items?.length) {
    console.log(`[Filter Debug] Village shop items available (${items.length}), but using JSON file for filter options`);
  }
}

// ------------------- Function: loadFilterOptionsFromJSON -------------------
// Loads filter options from the JSON file as a fallback
async function loadFilterOptionsFromJSON() {
  try {
    console.log('📄 Loading filter options from JSON file...');
    const response = await fetch('/js/itemFilterOptions.json');
    if (!response.ok) {
      console.warn('⚠️ Could not load filter options from JSON file');
      return;
    }
    
    const filterOptions = await response.json();
    console.log('✅ Loaded filter options from JSON:', filterOptions);
    
    populateSelect('filter-category', filterOptions.categories || []);
    populateSelect('filter-type', filterOptions.types || []);
    populateSelect('filter-subtype', filterOptions.subtypes || []);
    populateSelect('filter-jobs', filterOptions.jobs || []);
    populateSelect('filter-locations', filterOptions.locations || []);
    populateSelect('filter-sources', filterOptions.sources || []);
    
    console.log('✅ Filter options populated from JSON file');
  } catch (error) {
    console.error('❌ Error loading filter options from JSON:', error);
  }
}

// ------------------- Function: populateSelect -------------------
// Helper to populate a <select> element with new options
function populateSelect(id, values) {
  const select = document.getElementById(id);
  if (!select) return;

  select.querySelectorAll('option:not([value="all"])').forEach(opt => opt.remove());

  const formatted = values
    .map(v => capitalize(v.toString().toLowerCase()))
    .sort();

  formatted.forEach(val => {
    const option = document.createElement('option');
    option.value = val.toLowerCase();
    option.textContent = val;
    select.appendChild(option);
  });
}

// ------------------- Function: setupVillageShopFilters -------------------
// Adds listeners to filter UI and re-renders items on change
async function setupVillageShopFilters(items) {
  console.log('Setting up village shop filters...');

  window.allVillageShopItems = items;

  if (window.villageShopFiltersInitialized) {
    console.log('Filters already initialized, skipping setup');
    window.filterVillageShopItems();
    return;
  }

  // Show the filters container
  const filtersContainer = document.querySelector('.village-shop-filters');
  if (filtersContainer) {
    filtersContainer.style.display = 'flex';
  }

  const searchInput = document.getElementById('village-shop-search-input');
  const categorySelect = document.getElementById('filter-category');
  const typeSelect = document.getElementById('filter-type');
  const subtypeSelect = document.getElementById('filter-subtype');
  const jobsSelect = document.getElementById('filter-jobs');
  const locationsSelect = document.getElementById('filter-locations');
  const sourcesSelect = document.getElementById('filter-sources');
  const sortSelect = document.getElementById('sort-by');
  const itemsPerPageSelect = document.getElementById('items-per-page');
  const clearFiltersBtn = document.getElementById('clear-filters');

  const missing = [searchInput, categorySelect, typeSelect, subtypeSelect, jobsSelect, locationsSelect, sourcesSelect, sortSelect, itemsPerPageSelect, clearFiltersBtn].some(el => !el);
  if (missing) {
    if (!window.filterSetupRetried) {
      console.warn('Retrying filter setup once...');
      window.filterSetupRetried = true;
      requestAnimationFrame(() => setupVillageShopFilters(items));
    } else {
      console.error('❌ Failed to initialize village shop filters. Please refresh.');
    }
    return;
  }

  window.filterSetupRetried = false;

  // Populate filter options with available values
  await populateFilterOptions(items);

  // Restore filter state if it exists
  const savedFilterState = window.savedFilterState || {};
  if (savedFilterState.searchTerm) searchInput.value = savedFilterState.searchTerm;
  if (savedFilterState.categoryFilter) categorySelect.value = savedFilterState.categoryFilter;
  if (savedFilterState.typeFilter) typeSelect.value = savedFilterState.typeFilter;
  if (savedFilterState.subtypeFilter) subtypeSelect.value = savedFilterState.subtypeFilter;
  if (savedFilterState.jobsFilter) jobsSelect.value = savedFilterState.jobsFilter;
  if (savedFilterState.locationsFilter) locationsSelect.value = savedFilterState.locationsFilter;
  if (savedFilterState.sourcesFilter) sourcesSelect.value = savedFilterState.sourcesFilter;
  if (savedFilterState.sortBy) sortSelect.value = savedFilterState.sortBy;

  // ------------------- Function: filterVillageShopItems -------------------
  // Main filtering function that handles both server-side and client-side filtering
  window.filterVillageShopItems = async function (page = 1) {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilter = categorySelect.value.toLowerCase();
    const typeFilter = typeSelect.value.toLowerCase();
    const subtypeFilter = subtypeSelect.value.toLowerCase();
    const jobsFilter = jobsSelect.value.toLowerCase();
    const locationsFilter = locationsSelect.value.toLowerCase();
    const sourcesFilter = sourcesSelect.value.toLowerCase();
    const sortBy = sortSelect.value;
    const itemsPerPage = itemsPerPageSelect.value;

    console.log('🔍 filterVillageShopItems called:', {
      page,
      searchTerm,
      categoryFilter,
      typeFilter,
      subtypeFilter,
      jobsFilter,
      locationsFilter,
      sourcesFilter,
      sortBy,
      itemsPerPage
    });

    // Save current filter state
    window.savedFilterState = {
      searchTerm: searchInput.value,
      categoryFilter,
      typeFilter,
      subtypeFilter,
      jobsFilter,
      locationsFilter,
      sourcesFilter,
      sortBy,
      itemsPerPage
    };

    // Check if any filters are active
    const hasActiveFilters = searchTerm || 
      categoryFilter !== 'all' || 
      typeFilter !== 'all' || 
      subtypeFilter !== 'all' || 
      jobsFilter !== 'all' || 
      locationsFilter !== 'all' || 
      sourcesFilter !== 'all';

    console.log('🔍 Filter analysis:', {
      hasActiveFilters,
      itemsPerPage,
      willUseServerSide: hasActiveFilters || itemsPerPage !== 'all'
    });

    // Always use server-side filtering when filters are active OR when items per page is not 'all'
    // This ensures we have all the data needed for proper pagination
    if (hasActiveFilters || itemsPerPage !== 'all') {
      // When filters are active or pagination is needed, always fetch all items and filter client-side
      console.log('🔍 Using server-side filtering (filterVillageShopItemsWithAllData)');
      await filterVillageShopItemsWithAllData(page);
    } else {
      console.log('🔍 Using client-side filtering (filterVillageShopItemsClientSide)');
      filterVillageShopItemsClientSide(page);
    }
  };

  // ------------------- Function: filterVillageShopItemsWithAllData -------------------
  // Fetches all village shop items from database and applies client-side filtering
  async function filterVillageShopItemsWithAllData(page = 1) {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilter = categorySelect.value.toLowerCase();
    const typeFilter = typeSelect.value.toLowerCase();
    const subtypeFilter = subtypeSelect.value.toLowerCase();
    const jobsFilter = jobsSelect.value.toLowerCase();
    const locationsFilter = locationsSelect.value.toLowerCase();
    const sourcesFilter = sourcesSelect.value.toLowerCase();
    const sortBy = sortSelect.value;
    const itemsPerPage = itemsPerPageSelect.value === 'all' ? 999999 : parseInt(itemsPerPageSelect.value);

    console.log('🔍 filterVillageShopItemsWithAllData called:', {
      page,
      itemsPerPage,
      itemsPerPageSelectValue: itemsPerPageSelect.value
    });

    // Show loading state
    const resultsInfo = document.querySelector('.village-shop-results-info p');
    if (resultsInfo) {
      resultsInfo.textContent = 'Loading filtered village shop items...';
    }

    try {
      // Always fetch ALL village shop items from the database
      const response = await fetch('/api/models/villageShops?all=true');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const { data: allItems } = await response.json();

      console.log('🔍 Fetched village shop items from database:', allItems.length);

      // Apply filtering and sorting to ALL items
      const filteredAndSorted = applyFiltersAndSort(allItems);

      console.log('🔍 After filtering and sorting:', filteredAndSorted.length);

      // Apply pagination
      const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedItems = filteredAndSorted.slice(startIndex, endIndex);

      console.log('🔍 Pagination details:', {
        totalPages,
        startIndex,
        endIndex,
        paginatedItemsLength: paginatedItems.length,
        itemsPerPage
      });

      // Update global items for this filtered view
      window.allVillageShopItems = filteredAndSorted;

      // Update results info
      if (resultsInfo) {
        if (itemsPerPageSelect.value === 'all') {
          resultsInfo.textContent = `Showing all ${filteredAndSorted.length} filtered village shop items`;
        } else {
          resultsInfo.textContent = `Showing ${paginatedItems.length} of ${filteredAndSorted.length} filtered village shop items (Page ${page} of ${totalPages})`;
        }
      }

      // Render the paginated filtered items
      renderVillageShopCards(paginatedItems, page, filteredAndSorted.length);

      // Update pagination for filtered results
      if (itemsPerPageSelect.value !== 'all' && filteredAndSorted.length > itemsPerPage) {
        updateFilteredPagination(page, totalPages, filteredAndSorted.length);
      } else {
        const contentDiv = document.getElementById('model-details-data');
        if (contentDiv) {
          const existingPagination = contentDiv.querySelector('.pagination');
          if (existingPagination) {
            existingPagination.remove();
          }
        }
      }

      // Ensure pagination is created after a short delay to avoid conflicts
      setTimeout(() => {
        const contentDiv = document.getElementById('model-details-data');
        if (contentDiv && !contentDiv.querySelector('.pagination')) {
          console.log('🔄 Recreating filtered pagination due to timing conflict');
          if (itemsPerPageSelect.value !== 'all' && filteredAndSorted.length > itemsPerPage) {
            updateFilteredPagination(page, totalPages, filteredAndSorted.length);
          }
        }
      }, 100);

    } catch (error) {
      console.error('❌ Error fetching all village shop items for filtering:', error);
      // Fallback to client-side filtering on current items
      console.log('🔄 Falling back to client-side filtering on current page...');
      filterVillageShopItemsClientSide(page);
    }
  }

  // ------------------- Function: filterVillageShopItemsClientSide -------------------
  // Client-side filtering for when no server-side filtering is needed
  function filterVillageShopItemsClientSide(page = 1) {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilter = categorySelect.value.toLowerCase();
    const typeFilter = typeSelect.value.toLowerCase();
    const subtypeFilter = subtypeSelect.value.toLowerCase();
    const jobsFilter = jobsSelect.value.toLowerCase();
    const locationsFilter = locationsSelect.value.toLowerCase();
    const sourcesFilter = sourcesSelect.value.toLowerCase();
    const sortBy = sortSelect.value;
    const itemsPerPage = itemsPerPageSelect.value === 'all' ? window.allVillageShopItems.length : parseInt(itemsPerPageSelect.value);

    console.log('🔍 filterVillageShopItemsClientSide called:', {
      page,
      itemsPerPage,
      itemsPerPageSelectValue: itemsPerPageSelect.value
    });

    const filtered = window.allVillageShopItems.filter(item => {
      const matchesSearch = !searchTerm ||
        item.itemName?.toLowerCase().includes(searchTerm) ||
        splitValues(item.category).some(cat => cat.toLowerCase().includes(searchTerm)) ||
        splitValues(item.type).some(type => type.toLowerCase().includes(searchTerm)) ||
        splitValues(item.subtype).some(subtype => subtype.toLowerCase().includes(searchTerm)) ||
        splitValues(item.obtainTags || item.obtain).some(source => source.toLowerCase().includes(searchTerm)) ||
        splitValues(item.allJobsTags || item.allJobs).some(job => job.toLowerCase().includes(searchTerm)) ||
        splitValues(item.locationsTags || item.locations).some(location => location.toLowerCase().includes(searchTerm));

      const itemCategories = splitValues(item.category);
      const matchesCategory = categoryFilter === 'all' || 
        itemCategories.some(cat => cat.toLowerCase() === categoryFilter);
      
      const itemTypes = splitValues(item.type);
      const matchesType = typeFilter === 'all' || 
        itemTypes.some(type => type.toLowerCase() === typeFilter);
      
      const itemSubtypes = splitValues(item.subtype);
      const matchesSubtype = subtypeFilter === 'all' || 
        itemSubtypes.some(subtype => subtype.toLowerCase() === subtypeFilter);
      
      const jobsTags = item.allJobsTags?.length ? item.allJobsTags : item.allJobs;
      const itemJobs = splitValues(jobsTags);
      const matchesJobs = jobsFilter === 'all' || 
        itemJobs.some(job => job.toLowerCase() === jobsFilter);
      
      const locationsTags = item.locationsTags?.length ? item.locationsTags : item.locations;
      const itemLocations = splitValues(locationsTags);
      const matchesLocations = locationsFilter === 'all' || 
        itemLocations.some(location => location.toLowerCase() === locationsFilter);

      const sourcesTags = item.obtainTags?.length ? item.obtainTags : item.obtain;
      const itemSources = splitValues(sourcesTags);
      const matchesSources = sourcesFilter === 'all' || 
        itemSources.some(source => source.toLowerCase() === sourcesFilter);

      return matchesSearch && matchesCategory && matchesType && matchesSubtype && matchesJobs && matchesLocations && matchesSources;
    });

    const [field, direction] = sortBy.split('-');
    const isAsc = direction === 'asc';

    const sorted = [...filtered].sort((a, b) => {
      let valA, valB;
      
      switch (field) {
        case 'name':
          valA = a.itemName ?? '';
          valB = b.itemName ?? '';
          break;
        case 'price':
          valA = a.buyPrice ?? 0;
          valB = b.buyPrice ?? 0;
          break;
        case 'stock':
          valA = a.stock ?? 0;
          valB = b.stock ?? 0;
          break;
        default:
          valA = a[field] ?? '';
          valB = b[field] ?? '';
      }
      
      return isAsc
        ? (typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB)
        : (typeof valB === 'string' ? valB.localeCompare(valA) : valB - valA);
    });

    console.log('🔍 After filtering and sorting:', sorted.length);

    // Apply pagination
    const totalPages = Math.ceil(sorted.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = sorted.slice(startIndex, endIndex);

    console.log('🔍 Pagination details:', {
      totalPages,
      startIndex,
      endIndex,
      paginatedItemsLength: paginatedItems.length,
      itemsPerPage
    });

    // Update results info
    const resultsInfo = document.querySelector('.village-shop-results-info p');
    if (resultsInfo) {
      if (itemsPerPageSelect.value === 'all') {
        resultsInfo.textContent = `Showing all ${sorted.length} of ${window.allVillageShopItems.length} village shop items`;
      } else {
        resultsInfo.textContent = `Showing ${paginatedItems.length} of ${sorted.length} village shop items (Page ${page} of ${totalPages})`;
      }
    }

    // Render the paginated items
    renderVillageShopCards(paginatedItems, page, sorted.length);

    // Update pagination
    if (itemsPerPageSelect.value !== 'all' && sorted.length > itemsPerPage) {
      updateFilteredPagination(page, totalPages, sorted.length);
    } else {
      const contentDiv = document.getElementById('model-details-data');
      if (contentDiv) {
        const existingPagination = contentDiv.querySelector('.pagination');
        if (existingPagination) {
          existingPagination.remove();
        }
      }
    }
  }

  // ------------------- Function: applyFiltersAndSort -------------------
  // Unified function to apply filters and sorting to items
  function applyFiltersAndSort(items) {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilter = categorySelect.value.toLowerCase();
    const typeFilter = typeSelect.value.toLowerCase();
    const subtypeFilter = subtypeSelect.value.toLowerCase();
    const jobsFilter = jobsSelect.value.toLowerCase();
    const locationsFilter = locationsSelect.value.toLowerCase();
    const sourcesFilter = sourcesSelect.value.toLowerCase();
    const sortBy = sortSelect.value;

    // Apply filters
    const filtered = items.filter(item => {
      const matchesSearch = !searchTerm ||
        item.itemName?.toLowerCase().includes(searchTerm) ||
        splitValues(item.category).some(cat => cat.toLowerCase().includes(searchTerm)) ||
        splitValues(item.type).some(type => type.toLowerCase().includes(searchTerm)) ||
        splitValues(item.subtype).some(subtype => subtype.toLowerCase().includes(searchTerm)) ||
        splitValues(item.obtainTags || item.obtain).some(source => source.toLowerCase().includes(searchTerm)) ||
        splitValues(item.allJobsTags || item.allJobs).some(job => job.toLowerCase().includes(searchTerm)) ||
        splitValues(item.locationsTags || item.locations).some(location => location.toLowerCase().includes(searchTerm));

      const itemCategories = splitValues(item.category);
      const matchesCategory = categoryFilter === 'all' || 
        itemCategories.some(cat => cat.toLowerCase() === categoryFilter);
      
      const itemTypes = splitValues(item.type);
      const matchesType = typeFilter === 'all' || 
        itemTypes.some(type => type.toLowerCase() === typeFilter);
      
      const itemSubtypes = splitValues(item.subtype);
      const matchesSubtype = subtypeFilter === 'all' || 
        itemSubtypes.some(subtype => subtype.toLowerCase() === subtypeFilter);
      
      const jobsTags = item.allJobsTags?.length ? item.allJobsTags : item.allJobs;
      const itemJobs = splitValues(jobsTags);
      const matchesJobs = jobsFilter === 'all' || 
        itemJobs.some(job => job.toLowerCase() === jobsFilter);
      
      const locationsTags = item.locationsTags?.length ? item.locationsTags : item.locations;
      const itemLocations = splitValues(locationsTags);
      const matchesLocations = locationsFilter === 'all' || 
        itemLocations.some(location => location.toLowerCase() === locationsFilter);

      const sourcesTags = item.obtainTags?.length ? item.obtainTags : item.obtain;
      const itemSources = splitValues(sourcesTags);
      const matchesSources = sourcesFilter === 'all' || 
        itemSources.some(source => source.toLowerCase() === sourcesFilter);

      return matchesSearch && matchesCategory && matchesType && matchesSubtype && matchesJobs && matchesLocations && matchesSources;
    });

    // Apply sorting
    const [field, direction] = sortBy.split('-');
    const isAsc = direction === 'asc';

    return [...filtered].sort((a, b) => {
      let valA, valB;
      
      switch (field) {
        case 'name':
          valA = a.itemName ?? '';
          valB = b.itemName ?? '';
          break;
        case 'price':
          valA = a.buyPrice ?? 0;
          valB = b.buyPrice ?? 0;
          break;
        case 'stock':
          valA = a.stock ?? 0;
          valB = b.stock ?? 0;
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

  // ------------------- Function: updateFilteredPagination -------------------
  // Creates pagination for filtered results
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
      console.log('📄 Setting up pagination for filtered results:', { currentPage, totalPages, totalItems });
      
      const handlePageChange = async (pageNum) => {
        console.log(`🔄 Filtered page change requested to page ${pageNum}`);
        // Call filterVillageShopItems with the new page number
        window.filterVillageShopItems(pageNum);
      };

      // Create pagination manually since we can't import dynamically
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
      console.log('✅ Filtered pagination created successfully');
    }
  }

  // Add event listeners to all filter elements
  const filterElements = [
    searchInput, categorySelect, typeSelect, subtypeSelect, 
    jobsSelect, locationsSelect, sourcesSelect, sortSelect, itemsPerPageSelect
  ];

  filterElements.forEach(element => {
    if (element) {
      element.addEventListener('change', () => window.filterVillageShopItems(1));
      if (element === searchInput) {
        element.addEventListener('input', () => window.filterVillageShopItems(1));
      }
    }
  });

  // Clear filters button
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      categorySelect.value = 'all';
      typeSelect.value = 'all';
      subtypeSelect.value = 'all';
      jobsSelect.value = 'all';
      locationsSelect.value = 'all';
      sourcesSelect.value = 'all';
      sortSelect.value = 'name-asc';
      itemsPerPageSelect.value = '12';
      
      // Clear saved state
      window.savedFilterState = {};
      
      // Re-filter with cleared values
      window.filterVillageShopItems(1);
    });
  }

  window.villageShopFiltersInitialized = true;
  console.log('✅ Village shop filters initialized');
}

// ============================================================================
// ------------------- Location Colors Mapping -------------------
// Maps location names to CSS color classes for tag styling
// ============================================================================

const LOCATION_COLORS = {
  'inariko': 'location-inariko',
  'rudania': 'location-rudania', 
  'vhintl': 'location-vhintl',
};

// ============================================================================
// ------------------- Export Functions -------------------
// Exports functions for use in other modules
// ============================================================================

// ------------------- Function: initializeVillageShopsPage -------------------
// Initializes the village shops page with data and sets up filters
async function initializeVillageShopsPage(data, page, contentDiv) {
  console.log('🏪 Initializing village shops page:', {
    dataLength: data?.length,
    page,
    contentDiv: !!contentDiv
  });

  try {
    // Set up filters first
    await setupVillageShopFilters(data);
    
    // Render the village shop cards
    renderVillageShopCards(data, page);
    
    console.log('✅ Village shops page initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing village shops page:', error);
    if (contentDiv) {
      contentDiv.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>Failed to initialize village shops page</p>
          <button class="retry-button" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }
}

export {
  renderVillageShopCards,
  setupVillageShopFilters,
  populateFilterOptions,
  fetchAllVillageShopItemsForFilters,
  initializeVillageShopsPage
};