/* ============================================================================
   main.js
   Purpose: Entry point for dashboard UI. Initializes modules, loads data,
   and handles model card click events, layout switching, and loaders.
============================================================================ */

// ============================================================================
// ------------------- Module Imports & Exports -------------------
// Imports core modules and re-exports for shared access
// ============================================================================
import * as inventory from './inventory.js';
import * as items from './items.js';
import * as characters from './characters.js';
import * as stats from './stats.js';
import * as weatherStats from './weatherStats.js';
import * as error from './error.js';
import * as auth from './auth.js';
import * as guilds from './guilds.js';
import * as commands from './commands.js';
import * as villageShops from './villageShops.js';
import * as monsters from './monsters.js';
import * as pets from './pets.js';
import * as starterGear from './starterGear.js';
import { createPagination, setupBackToTopButton, scrollToTop } from './ui.js';

// Import specific functions from characters module
const { renderCharacterCards } = characters;

// Make weatherStats available globally
window.weatherStats = weatherStats;


export {
  inventory,
  items,
  characters,
  stats,
  weatherStats,
  error,
  auth,
  guilds,
  commands,
  villageShops,
  monsters,
  pets,
  starterGear,
};

// ============================================================================
// ------------------- Initialization -------------------
// Sets up UI listeners and initializes dashboard on load
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await auth.checkUserAuthStatus();
    
    const backToTopButton = document.getElementById('backToTop');
    
    setupSidebarNavigation();
    setupBackToTopButton();
    setupModelCards();
  } catch (err) {
    error.logError(err, 'Initialization');
  }
});

// Force sidebar to closed state on page load
// (prevents stuck mobile-open or mobile-closing classes)
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  console.log('🔄 Page load - resetting sidebar state');
  console.log('🔍 Sidebar before reset:', sidebar?.className);
  
  if (sidebar) {
    sidebar.classList.remove('mobile-open', 'mobile-closing');
    console.log('✅ Removed mobile classes from sidebar');
    console.log('🔍 Sidebar after reset:', sidebar.className);
  }
  if (overlay) {
    overlay.classList.remove('active');
    console.log('✅ Removed active class from overlay');
  }
  document.body.style.overflow = '';
  console.log('✅ Reset body overflow');
});

// ------------------- Function: setupModelCards -------------------
// Attaches click handlers to each model card and loads model data
function setupModelCards() {
  const modelCards = document.querySelectorAll('.model-card');

  modelCards.forEach(card => {
    const modelName = card.getAttribute('data-model');
    
    card.addEventListener('click', async (event) => {
      event.preventDefault(); // Prevent default button behavior

      // Reset filters when switching between models
      if (window.itemFiltersInitialized) {
        window.itemFiltersInitialized = false;
        window.allItems = null;
        window.savedFilterState = {};
      }
      if (window.characterFiltersInitialized) {
        window.characterFiltersInitialized = false;
        window.allCharacters = null;
      }

      // Add visual feedback for click
      card.classList.add('clicked');
      setTimeout(() => card.classList.remove('clicked'), 200);

      showLoadingState();

      // Declare variables outside try block so they're available in catch
      let dashboardSection, modelDetailsPage, title, contentDiv, backButton;

      try {
        // Hide dashboard, show details view
        dashboardSection = document.getElementById('dashboard-section');
        modelDetailsPage = document.getElementById('model-details-page');
        title = document.getElementById('model-details-title');
        contentDiv = document.getElementById('model-details-data');
        backButton = document.querySelector('.back-button');

        if (!dashboardSection || !modelDetailsPage || !title || !contentDiv || !backButton) {
          throw new Error('Required DOM elements not found');
        }

        dashboardSection.style.display = 'none';
        modelDetailsPage.style.display = 'block';
        title.textContent = modelName.charAt(0).toUpperCase() + modelName.slice(1);
        contentDiv.innerHTML = '';

        // Setup back button handler
        backButton.onclick = () => {
          modelDetailsPage.style.display = 'none';
          dashboardSection.style.display = 'block';
          // Reset any global state
          if (modelName === 'character') {
            window.characterFiltersInitialized = false;
            window.allCharacters = null;
          } else if (modelName === 'item') {
            window.itemFiltersInitialized = false;
            window.allItems = null;
            window.savedFilterState = {};
          }
        };

        // Ensure back to top button is set up for model pages
        setupBackToTopButton();

        let fetchUrl = `/api/models/${modelName}`;
        if (modelName === 'starterGear') {
          fetchUrl = '/api/models/item?all=true';
        }
   
        const response = await fetch(fetchUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const { data, pagination } = await response.json();

        const characterFiltersBar = document.querySelector('.character-filters');
        if (modelName === 'character' && characterFiltersBar) {
          if (contentDiv.firstChild !== characterFiltersBar) {
            contentDiv.insertBefore(characterFiltersBar, contentDiv.firstChild);
          }
          characterFiltersBar.style.display = 'flex';
        } else if (characterFiltersBar) {
          characterFiltersBar.style.display = 'none';
        }

        const villageShopResultsInfo = document.querySelector('.village-shop-results-info');
        const villageShopSearchFilters = document.querySelector('.village-shop-search-filters');
        
        if (modelName === 'villageShops') {
          if (villageShopResultsInfo) {
            if (contentDiv.firstChild !== villageShopResultsInfo) {
              contentDiv.insertBefore(villageShopResultsInfo, contentDiv.firstChild);
            }
            villageShopResultsInfo.style.display = 'block';
          }
          if (villageShopSearchFilters) {
            if (contentDiv.firstChild !== villageShopSearchFilters) {
              contentDiv.insertBefore(villageShopSearchFilters, contentDiv.firstChild);
            }
            villageShopSearchFilters.style.display = 'block';
          }
        } else {
          if (villageShopResultsInfo) {
            villageShopResultsInfo.style.display = 'none';
          }
          if (villageShopSearchFilters) {
            villageShopSearchFilters.style.display = 'none';
          }
        }
        
        if (modelName === 'villageShops' && !villageShopResultsInfo) {
          console.error('❌ Village shop results info container not found in index.js');
        }

        switch (modelName) {
          case 'character':
            await characters.initializeCharacterPage(data, pagination.page, contentDiv);
            break;
          case 'weather':
            await weatherStats.initializeWeatherStatsPage();
            break;
          case 'item':
            // Check if item filters are active
            if (window.itemFiltersInitialized && window.savedFilterState) {
              const hasActiveFilters = window.savedFilterState.searchTerm || 
                window.savedFilterState.categoryFilter !== 'all' || 
                window.savedFilterState.typeFilter !== 'all' || 
                window.savedFilterState.subtypeFilter !== 'all' || 
                window.savedFilterState.jobsFilter !== 'all' || 
                window.savedFilterState.locationsFilter !== 'all';
              
              if (hasActiveFilters) {
                // Don't apply normal pagination when filters are active
                // Let the filtered pagination handle it
                return; // Skip pagination update
              }
            }
            await items.initializeItemPage(data, pagination.page, contentDiv);
            break;
          case 'starterGear':
            title.textContent = 'Starter Gear';
            await starterGear.initializeStarterGearPage(data, pagination.page, contentDiv);
            break;
          case 'monster':
            await monsters.initializeMonsterPage(data, pagination.page, contentDiv);
            break;
          case 'pet':
            await pets.initializePetPage(data, pagination.page, contentDiv);
            break;
          case 'inventory':
            // Inventory uses its own efficient pagination system
            // Skip the main pagination logic entirely
            await inventory.initializeInventoryPage(data, pagination.page, contentDiv);
            break;
          case 'villageShops':
            await villageShops.initializeVillageShopsPage(data, pagination.page, contentDiv);
            break;
          default:
            console.error(`Unknown model type: ${modelName}`);
            contentDiv.innerHTML = `
              <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Unknown model type: ${modelName}</p>
              </div>
            `;
        }

        if (pagination?.pages > 1) {
          // For items, check if filters are active and skip pagination if so
          if (modelName === 'item' && window.itemFiltersInitialized && window.savedFilterState) {
            const hasActiveFilters = window.savedFilterState.searchTerm || 
              window.savedFilterState.categoryFilter !== 'all' || 
              window.savedFilterState.typeFilter !== 'all' || 
              window.savedFilterState.subtypeFilter !== 'all' || 
              window.savedFilterState.jobsFilter !== 'all' || 
              window.savedFilterState.locationsFilter !== 'all';
            
            if (hasActiveFilters) {
              // Don't create normal pagination when filters are active
              // Let the filtered pagination handle it
              return;
            }
          }

          // Skip pagination for inventory as it uses its own efficient system
          if (modelName === 'inventory') {
            return;
          }

          // Skip pagination for village shops as it uses its own efficient system
          if (modelName === 'villageShops') {
            return;
          }

          const handlePageChange = async (pageNum) => {
            showLoadingState();
            try {
              const { data, pagination } = await loadModelData(modelName, pageNum);

              switch (modelName) {
                case 'character':
                  try {
                    // For characters, we need to handle pagination differently
                    // since they have their own filtering system
                    if (!window.characterFiltersInitialized) {
                      // If filters aren't initialized, use the main pagination
                      await characters.renderCharacterCards(data, pagination.page, false);
                    } else {
                      // If filters are initialized, let the character module handle pagination
                      return;
                    }
                  } catch (err) {
                    console.error('❌ Error rendering characters:', err);
                    error.logError(err, 'Rendering Characters');
                  }
                  break;
                case 'item':
                  // Check if item filters are active
                  if (window.itemFiltersInitialized && window.savedFilterState) {
                    const hasActiveFilters = window.savedFilterState.searchTerm || 
                      window.savedFilterState.categoryFilter !== 'all' || 
                      window.savedFilterState.typeFilter !== 'all' || 
                      window.savedFilterState.subtypeFilter !== 'all' || 
                      window.savedFilterState.jobsFilter !== 'all' || 
                      window.savedFilterState.locationsFilter !== 'all';
                    
                    if (hasActiveFilters) {   
                      // Don't apply normal pagination when filters are active
                      // Let the filtered pagination handle it
                      return;
                    }
                  }
                  await items.renderItemCards(data, pagination.page, pagination.total);
                  break;
                case 'inventory':
                  // Inventory uses its own efficient pagination system
                  // Skip the main pagination handling
                  return;
                case 'monster':
                  // For monsters, we need to update the global data and re-render
                  window.allMonsters = data;
                  await monsters.renderMonsterCards(data, pagination.page, pagination.total);
                  break;
                case 'pet':
                  // For pets, we need to update the global data and re-render
                  window.allPets = data;
                  await pets.renderPetCards(data, pagination.page, pagination.total);
                  break;
                case 'villageShops':
                  // Village shops uses its own efficient pagination system
                  // Skip the main pagination handling
                  return;
                default:
                  console.error(`Unknown model type: ${modelName}`);
              }
              
              // Recreate pagination with updated page number
              const updatedPaginationDiv = createPagination({ page: pagination.page, pages: pagination.pages }, handlePageChange);
              
              // Update pagination in the DOM
              const contentDiv = document.getElementById('model-details-data');
              if (contentDiv) {
                const existingPagination = contentDiv.querySelector('.pagination');
                if (existingPagination) {
                  existingPagination.remove();
                }
                contentDiv.appendChild(updatedPaginationDiv);
              }
              
            } catch (err) {
              console.error('❌ Error loading page data:', err);
              error.logError(err, 'Loading Page Data');
            } finally {
              hideLoadingState();
            }
          };

          // For characters, we need to create a pagination container if it doesn't exist
          if (modelName === 'character') {
            // Fix the createPagination call to use correct parameter format
            const paginationDiv = createPagination({ page: pagination.page, pages: pagination.pages }, handlePageChange);
            let paginationContainer = document.getElementById('character-pagination');
            if (!paginationContainer) {
              paginationContainer = document.createElement('div');
              paginationContainer.id = 'character-pagination';
              contentDiv.appendChild(paginationContainer);
            }
            paginationContainer.innerHTML = '';
            paginationContainer.appendChild(paginationDiv);
          } else if (modelName === 'inventory') {
            // Inventory uses its own efficient pagination system
            // Skip creating main pagination container
          } else if (modelName === 'villageShops') {
            // Village shops uses its own efficient pagination system
            // Skip creating main pagination container
          } else {
            // Fix the createPagination call to use correct parameter format
            const paginationDiv = createPagination({ page: pagination.page, pages: pagination.pages }, handlePageChange);
            contentDiv.appendChild(paginationDiv);
          }
        }

        // Load character of the week
        if (typeof loadCharacterOfWeek === 'function') {
          try {
            loadCharacterOfWeek();
          } catch (error) {
            console.error('❌ Error loading character of the week:', error);
          }
        } else {
        }

      } catch (err) {
        console.error('❌ Error loading model data:', err);
        error.logError(err, 'Loading Model Data');
        if (contentDiv) {
          handleModelDataError(modelName, contentDiv);
        }
      } finally {
        hideLoadingState();
      }
    });
  });
}

// ------------------- Function: loadModelData -------------------
// Fetches paginated model data by type
async function loadModelData(modelName, page = 1) {
  // For characters, always load all characters to enable proper filtering and search
  const url = modelName === 'character' 
    ? `/api/models/${modelName}?all=true`
    : `/api/models/${modelName}?page=${page}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const result = await response.json();
  
  console.log('🔍 DEBUG - loadModelData:', {
    modelName,
    url,
    dataLength: result.data?.length,
    pagination: result.pagination
  });
  
  return result;
}

// ------------------- Function: handleModelDataError -------------------
// Handles model data loading errors with retry functionality
function handleModelDataError(modelName, contentDiv) {
  contentDiv.innerHTML = `
    <div class="error-state">
      <i class="fas fa-exclamation-circle"></i>
      <p>Failed to load ${modelName} data</p>
      <button class="retry-button">Retry</button>
    </div>
  `;

  // Add event listener to retry button
  const retryButton = contentDiv.querySelector('.retry-button');
  if (retryButton) {
    retryButton.addEventListener('click', async () => {
      showLoadingState();
      try {
        const { data, pagination } = await loadModelData(modelName);
        switch (modelName) {
          case 'character':
            await characters.initializeCharacterPage(data, pagination.page, contentDiv);
            break;
          case 'item':
            items.initializeItemPage(data, pagination.page, contentDiv);
            break;
          case 'inventory':
            await inventory.initializeInventoryPage(data, pagination.page, contentDiv);
            break;
          case 'monster':
            await monsters.initializeMonsterPage(data, pagination.page, contentDiv);
            break;
          case 'villageShops':
            await villageShops.initializeVillageShopsPage(data, pagination.page, contentDiv);
            break;
          default:
            console.error(`Unknown model type: ${modelName}`);
            contentDiv.innerHTML = `
              <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Unknown model type: ${modelName}</p>
              </div>
            `;
        }
      } catch (err) {
        error.logError(err, 'Loading Model Data');
        handleModelDataError(modelName, contentDiv);
      } finally {
        hideLoadingState();
      }
    });
  }
}

// ------------------- Function: loadDashboardData -------------------
// Loads all dashboard data (inventory, items, stats) concurrently
async function loadDashboardData() {
  showLoadingState();
  try {
    await Promise.all([
      loadInventoryData(),
      loadItemsData(),
      loadStatsData()
    ]);
  } catch (err) {
    error.logError(err, 'Loading Dashboard Data');
  } finally {
    hideLoadingState();
  }
}

// ------------------- Function: loadInventoryData -------------------
// Loads and renders inventory data
async function loadInventoryData() {
  try {
    const response = await fetch('/api/inventory');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    inventory.setupInventoryFilters(data);
    inventory.renderCharacterCards(data);
  } catch (err) {
    error.logError(err, 'Loading Inventory');
  }
}

// ------------------- Function: loadItemsData -------------------
// Loads and renders item data
async function loadItemsData() {
  try {
    const response = await fetch('/api/items');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    items.setupItemFilters(data);
    items.renderItemCards(data);
  } catch (err) {
    error.logError(err, 'Loading Items');
  }
}

// ------------------- Function: loadStatsData -------------------
// Loads and renders statistics data
async function loadStatsData() {
  try {
    // Note: Activity list functionality removed as it's not implemented in the UI
    // The stats section focuses on character statistics charts instead
  } catch (err) {
    error.logError(err, 'Loading Stats');
  }
}

// ============================================================================
// ------------------- Section Navigation -------------------
// Switches between sections using nav links
// ============================================================================
function showSection(sectionId) {
  console.log('🔍 showSection called with:', sectionId);
  
  // Hide all main content sections including dashboard
  const mainContent = document.querySelector('.main-content');
  const allSections = mainContent.querySelectorAll('section, #model-details-page');
  
  allSections.forEach(section => {
    if (section.id === sectionId) {
      section.style.display = 'block';
      console.log('🔍 Showing section:', section.id);
    } else {
      section.style.display = 'none';
      console.log('🔍 Hiding section:', section.id);
    }
  });
}

// ============================================================================
// ------------------- Navigation Setup -------------------
// Handles all sidebar navigation including dashboard and stats
// ============================================================================
function setupSidebarNavigation() {
  
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  
  sidebarLinks.forEach(link => {
    const sectionId = link.getAttribute('data-section');
    
    link.addEventListener('click', e => {
      e.preventDefault();
      
      // Close mobile sidebar if open
      closeMobileSidebar();
      
      // Update URL
      const newUrl = sectionId === 'dashboard-section' ? '/' : `#${sectionId}`;
      window.history.pushState({ section: sectionId }, '', newUrl);
      
      // Handle different sections
      if (sectionId === 'stats-section') {
        showStatsSection();
      } else if (sectionId === 'dashboard-section') {
        showDashboardSection();
      } else if (sectionId === 'profile-section') {
        showProfileSection();
      } else if (sectionId === 'guilds-section') {
        showGuildSection();
      } else if (sectionId === 'commands-section') {
        commands.showCommandsSection();
      } else if (sectionId === 'calendar-section') {
        showCalendarSection();
      } else if (sectionId === 'users-section') {
        showUsersSection();
      } else if (sectionId === 'relationships-section') {
        relationshipsModule.showRelationshipsSection();
      } else if (sectionId === 'admin-area-section') {
        showAdminAreaSection();
      } else {
        // For other sections, use the existing showSection function
        console.log('🔍 Using generic showSection for:', sectionId);
        showSection(sectionId);
      }
    });
  });
  
  // Handle browser back/forward buttons
  window.addEventListener('popstate', (event) => {
    const section = event.state?.section || 'dashboard-section';
    
    if (section === 'stats-section') {
      showStatsSection();
    } else if (section === 'dashboard-section') {
      showDashboardSection();
    } else if (section === 'profile-section') {
      showProfileSection();
    } else if (section === 'guilds-section') {
      showGuildSection();
    } else if (section === 'commands-section') {
      commands.showCommandsSection();
    } else if (section === 'calendar-section') {
      showCalendarSection();
    } else if (section === 'users-section') {
      showUsersSection();
    } else if (section === 'relationships-section') {
      relationshipsModule.showRelationshipsSection();
    } else if (section === 'admin-area-section') {
      showAdminAreaSection();
    } else {
      showSection(section);
    }
  });
  
  // Handle initial URL on page load
  const hash = window.location.hash;
  if (hash) {
    const sectionId = hash.substring(1);
    
    if (sectionId === 'stats-section') {
      showStatsSection();
    } else if (sectionId === 'dashboard-section') {
      showDashboardSection();
    } else if (sectionId === 'profile-section') {
      showProfileSection();
    } else if (sectionId === 'guilds-section') {
      showGuildSection();
    } else if (sectionId === 'commands-section') {
      commands.showCommandsSection();
    } else if (sectionId === 'calendar-section') {
      showCalendarSection();
    } else if (sectionId === 'users-section') {
      showUsersSection();
    } else if (sectionId === 'relationships-section') {
      relationshipsModule.showRelationshipsSection();
    } else if (sectionId === 'admin-area-section') {
      showAdminAreaSection();
    } else {
      showSection(sectionId);
    }
  }
  
  // ============================================================================
  // ------------------- Mobile Sidebar Functionality -------------------
  // Handles mobile sidebar toggle and overlay
  // ============================================================================
  setupMobileSidebar();
}

// ============================================================================
// ------------------- Mobile Sidebar Functions -------------------
// Handles mobile sidebar toggle, overlay, and responsive behavior
// ============================================================================

function setupMobileSidebar() {
  
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const mainWrapper = document.querySelector('.main-wrapper');
  
  if (!sidebarToggle || !sidebar) {
    console.warn('⚠️ Sidebar toggle or sidebar not found');
    return;
  }
  
  // Create overlay element for mobile
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);
  
  // Sidebar toggle click handler
  sidebarToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🖱️ Sidebar toggle clicked, mobile view:', isMobileView());
    
    if (isMobileView()) {
      toggleMobileSidebar();
    } else {
      toggleDesktopSidebar();
    }
  });
  
  // Overlay click handler to close sidebar
  overlay.addEventListener('click', () => {
    closeMobileSidebar();
  });
  
  // Close sidebar on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMobileView()) {
      closeMobileSidebar();
    }
  });
  
  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      handleWindowResize();
    }, 250);
  });
  
  // Initial setup
  handleWindowResize();
}

function isMobileView() {
  const isMobile = window.innerWidth <= 768;
  console.log('📱 Mobile view check:', isMobile, 'window width:', window.innerWidth);
  return isMobile;
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (!sidebar) {
    console.warn('⚠️ Sidebar not found');
    return;
  }
  
  // Force clean state first - remove any mobile classes
  sidebar.classList.remove('mobile-open', 'mobile-closing');
  
  // Debug: Log the actual sidebar element and its classes after cleanup
  console.log('🔍 Sidebar element:', sidebar);
  console.log('🔍 Sidebar classes after cleanup:', sidebar.className);
  console.log('🔍 Has mobile-open:', sidebar.classList.contains('mobile-open'));
  console.log('🔍 Has mobile-closing:', sidebar.classList.contains('mobile-closing'));
  
  // Now check if sidebar should be considered "open" based on transform
  const computedStyle = window.getComputedStyle(sidebar);
  const transform = computedStyle.transform;
  
  // Parse the transform matrix to check if sidebar is visible
  // matrix(a, b, c, d, tx, ty) where tx is the X translation
  // If tx is 0, sidebar is visible (at position 0)
  // If tx is negative (like -280), sidebar is hidden (translated left)
  let isCurrentlyVisible = false;
  
  if (transform === 'none') {
    isCurrentlyVisible = true; // No transform means visible
  } else if (transform.startsWith('matrix(')) {
    const matrixValues = transform.match(/matrix\(([^)]+)\)/);
    if (matrixValues) {
      const values = matrixValues[1].split(',').map(v => parseFloat(v.trim()));
      const tx = values[4]; // X translation (5th value)
      isCurrentlyVisible = tx >= 0; // If translation is 0 or positive, sidebar is visible
    }
  }
  
  console.log('🔍 Computed transform:', transform);
  console.log('🔍 Is currently visible:', isCurrentlyVisible);
  
  if (isCurrentlyVisible) {
    console.log('🔄 Sidebar appears to be visible, closing it');
    closeMobileSidebar();
  } else {
    console.log('🔄 Sidebar appears to be hidden, opening it');
    openMobileSidebar();
  }
}

function openMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  console.log('📱 Opening mobile sidebar');
  
  if (sidebar) {
    // Ensure clean state first
    sidebar.classList.remove('mobile-closing');
    sidebar.classList.add('mobile-open');
    console.log('✅ Sidebar classes updated - added mobile-open');
    console.log('🔍 Final sidebar classes:', sidebar.className);
  }
  
  if (overlay) {
    overlay.classList.add('active');
    console.log('✅ Overlay activated');
  }
  
  // Prevent body scroll when sidebar is open
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  console.log('📱 Closing mobile sidebar');
  
  if (sidebar) {
    // Ensure clean state first
    sidebar.classList.remove('mobile-open');
    sidebar.classList.add('mobile-closing');
    console.log('✅ Sidebar classes updated - added mobile-closing');
    console.log('🔍 Final sidebar classes:', sidebar.className);
    
    // Remove closing class after animation
    setTimeout(() => {
      sidebar.classList.remove('mobile-closing');
      console.log('✅ Sidebar closing animation complete');
    }, 300);
  }
  
  if (overlay) {
    overlay.classList.remove('active');
    console.log('✅ Overlay deactivated');
  }
  
  // Restore body scroll
  document.body.style.overflow = '';
}

function toggleDesktopSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const mainWrapper = document.querySelector('.main-wrapper');
  
  if (sidebar && mainWrapper) {
    const isCollapsed = sidebar.classList.contains('collapsed');
    
    if (isCollapsed) {
      sidebar.classList.remove('collapsed');
      mainWrapper.classList.remove('sidebar-collapsed');
    } else {
      sidebar.classList.add('collapsed');
      mainWrapper.classList.add('sidebar-collapsed');
    }
  }
}

function handleWindowResize() {
  const sidebar = document.querySelector('.sidebar');
  const mainWrapper = document.querySelector('.main-wrapper');
  const overlay = document.querySelector('.sidebar-overlay');

  console.log('🔄 Window resize - resetting sidebar state');
  console.log('🔍 Sidebar before reset:', sidebar?.className);

  // Always reset sidebar and overlay state
  if (sidebar) {
    sidebar.classList.remove('collapsed');
    sidebar.classList.remove('mobile-open');
    sidebar.classList.remove('mobile-closing');
    console.log('✅ Removed all mobile classes from sidebar');
    console.log('🔍 Sidebar after reset:', sidebar.className);
  }
  if (mainWrapper) {
    mainWrapper.classList.remove('sidebar-collapsed');
  }
  if (overlay) {
    overlay.classList.remove('active');
    console.log('✅ Removed active class from overlay');
  }
  document.body.style.overflow = '';
  console.log('✅ Reset body overflow');
}

// ============================================================================
// ------------------- Loading Indicator -------------------
// Controls global loader visibility
// ============================================================================
function showLoadingState() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'block';
}

function hideLoadingState() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
}

// ============================================================================
// ------------------- UI Utilities -------------------
// Miscellaneous formatters and asset helpers
// ============================================================================
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function formatPrettyDate(date) {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
}

function formatCharacterIconUrl(iconUrl) {
  if (!iconUrl) return '';
  return iconUrl.startsWith('http') ? iconUrl : `/images/characters/${iconUrl}`;
}

function renderMarkdownLinks(text) {
  if (!text) return '';
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}

function renderItemTypeIcon(imageType) {
  const typeIcons = {
    'weapon': 'fa-sword',
    'shield': 'fa-shield',
    'armor': 'fa-helmet',
    'item': 'fa-box'
  };
  return typeIcons[imageType] || 'fa-box';
}

// ============================================================================
// ------------------- Modal Controls -------------------
// Shows or hides modals and panels
// ============================================================================
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'block';
}

function hideModelDetails() {
  const modelDetails = document.querySelector('.model-details');
  const mainContent = document.querySelector('.main-content');
  if (modelDetails && mainContent) {
    modelDetails.style.display = 'none';
    mainContent.style.display = '';
  }
}

// ============================================================================
// ------------------- Stats Navigation -------------------
// Handles stats page navigation specifically
// ============================================================================
function showStatsSection() {
  
  // Hide all main content sections
  const mainContent = document.querySelector('.main-content');
  const sections = mainContent.querySelectorAll('section, #model-details-page');
  
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the stats section
  const statsSection = document.getElementById('stats-section');
  if (statsSection) {
    statsSection.style.display = 'block';
    
    // Initialize stats page
    import('./stats.js').then(statsModule => {
      statsModule.initStatsPage();
    }).catch(err => {
      console.error('❌ Error loading stats module:', err);
    });
  } else {
    console.error('❌ Stats section not found');
  }
  
  // Update active state in sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  sidebarLinks.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    const listItem = link.closest('li');
    if (listItem) {
      if (linkSection === 'stats-section') {
        listItem.classList.add('active');
      } else {
        listItem.classList.remove('active');
      }
    }
  });
  
  // Update breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = 'Stats';
  }
}

function showDashboardSection() { 
  
  // Hide all main content sections
  const mainContent = document.querySelector('.main-content');
  const sections = mainContent.querySelectorAll('section, #model-details-page');
  
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the dashboard section
  const dashboardSection = document.getElementById('dashboard-section');
  if (dashboardSection) {
    dashboardSection.style.display = 'block';
    
    // Debug: Check if dashboard content is visible
    const welcomeBox = dashboardSection.querySelector('.dashboard-welcome-box');
    const modelGrid = dashboardSection.querySelector('.model-grid');
    const linksSection = dashboardSection.querySelector('.dashboard-links-section');
    const countdownSection = dashboardSection.querySelector('#countdown-section');
    

    
    // Fix: Explicitly make dashboard content visible
    if (welcomeBox) welcomeBox.style.display = 'block';
    if (modelGrid) modelGrid.style.display = 'grid';
    if (linksSection) linksSection.style.display = 'flex';
    if (countdownSection) countdownSection.style.display = 'block';
    
    // Ensure character of the week section is visible
    const characterOfWeekSection = document.getElementById('character-of-week-section');
    if (characterOfWeekSection) {
      characterOfWeekSection.style.display = 'block';
    }
    
    // Check for any loading states that might be hiding content
    const loader = document.getElementById('loader');
    const loadingStates = document.querySelectorAll('.loading-state');
    
    
    // Always destroy and re-create the countdown manager (after content is visible)
    setTimeout(() => {
      if (window.countdownManager && typeof window.countdownManager.destroy === 'function') {
        window.countdownManager.destroy();
      }
      window.countdownManager = new window.CountdownManager();
    }, 0);
    
    // Always clear and reload the weather section
    const weatherSection = document.getElementById('weather-section');
    if (weatherSection) {
      weatherSection.innerHTML = '';
      weatherSection.style.display = 'block';
    }
    // Render weather section
    if (window.renderWeatherSection) {
      window.renderWeatherSection();
    }
    
    // Load character of the week
    if (typeof loadCharacterOfWeek === 'function') {
      try {
        loadCharacterOfWeek();
      } catch (error) {
        console.error('❌ Error loading character of the week:', error);
      }
    } else {
    }
    
    // The dashboard content (welcome message, links, model cards) is already in the HTML
    // No need to load data dynamically for the main dashboard view
  } else {
    console.error('❌ Dashboard section not found');
  }
  
  // Update active state in sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  sidebarLinks.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    const listItem = link.closest('li');
    if (listItem) {
      if (linkSection === 'dashboard-section') {
        listItem.classList.add('active');
      } else {
        listItem.classList.remove('active');
      }
    }
  });
  
  // Update breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = 'Dashboard';
  }
}



// ============================================================================
// ------------------- Profile Navigation -------------------
// Handles profile page navigation specifically
// ============================================================================
function showProfileSection() {
  
  // Hide all main content sections
  const mainContent = document.querySelector('.main-content');
  const sections = mainContent.querySelectorAll('section, #model-details-page');
  
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the profile section
  const profileSection = document.getElementById('profile-section');
  if (profileSection) {
    profileSection.style.display = 'block';
    
    // Initialize profile page
    import('./profile.js').then(profileModule => {
      profileModule.initProfilePage();
    }).catch(err => {
      console.error('❌ Error loading profile module:', err);
    });
  } else {
    console.error('❌ Profile section not found');
  }
  
  // Update active state in sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  sidebarLinks.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    const listItem = link.closest('li');
    if (listItem) {
      if (linkSection === 'profile-section') {
        listItem.classList.add('active');
      } else {
        listItem.classList.remove('active');
      }
    }
  });
  
  // Update breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = 'Profile';
  }
}

// ============================================================================
// ------------------- Guild Navigation -------------------
// Handles guild page navigation specifically
// ============================================================================
function showGuildSection() {
  
  // Hide all main content sections
  const mainContent = document.querySelector('.main-content');
  const sections = mainContent.querySelectorAll('section, #model-details-page');
  
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the guild section
  const guildSection = document.getElementById('guilds-section');
  if (guildSection) {
    guildSection.style.display = 'block';
    
    // Initialize guild page
    guilds.showGuildSection();
  } else {
    console.error('❌ Guild section not found');
  }
  
  // Update active state in sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  sidebarLinks.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    const listItem = link.closest('li');
    if (listItem) {
      if (linkSection === 'guilds-section') {
        listItem.classList.add('active');
      } else {
        listItem.classList.remove('active');
      }
    }
  });
  
  // Update breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = 'Guilds';
  }
}

// ============================================================================
// ------------------- Calendar Navigation -------------------
// Handles calendar page navigation specifically
// ============================================================================
function showCalendarSection() {
  
  // Hide all main content sections
  const mainContent = document.querySelector('.main-content');
  const sections = mainContent.querySelectorAll('section, #model-details-page');
  
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the calendar section
  const calendarSection = document.getElementById('calendar-section');
  if (calendarSection) {
    calendarSection.style.display = 'block';
    
    // Initialize calendar page if module is available
    if (window.calendarModule) {
      window.calendarModule.loadCalendarData();
    } else {
    }
  } else {
    console.error('❌ Calendar section not found');
  }
  
  // Update active state in sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  sidebarLinks.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    const listItem = link.closest('li');
    if (listItem) {
      if (linkSection === 'calendar-section') {
        listItem.classList.add('active');
      } else {
        listItem.classList.remove('active');
      }
    }
  });
  
  // Update breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = 'Calendar';
  }
}

// ============================================================================
// ------------------- Users Navigation -------------------
// Handles users page navigation specifically
// ============================================================================
function showUsersSection() {
  
  // Hide all main content sections
  const mainContent = document.querySelector('.main-content');
  const sections = mainContent.querySelectorAll('section, #model-details-page');
  
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the users section
  const usersSection = document.getElementById('users-section');
  if (usersSection) {
    usersSection.style.display = 'block';
    
    // Initialize users page
    import('./users.js').then(usersModule => {
      // The UserLookup class is already initialized in the module
      // We just need to ensure it's ready
      if (window.userLookup) {
        window.userLookup.initializeSection();
      }
    }).catch(err => {
      console.error('❌ Error loading users module:', err);
    });
  } else {
    console.error('❌ Users section not found');
  }
  
  // Update active state in sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  sidebarLinks.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    const listItem = link.closest('li');
    if (listItem) {
      if (linkSection === 'users-section') {
        listItem.classList.add('active');
      } else {
        listItem.classList.remove('active');
      }
    }
  });
  
  // Update breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = 'Users';
  }
}

// ============================================================================
// ------------------- Admin Area Navigation -------------------
// Handles admin area page navigation specifically
// ============================================================================
function showAdminAreaSection() {
  
  // Hide all main content sections
  const mainContent = document.querySelector('.main-content');
  const sections = mainContent.querySelectorAll('section, #model-details-page');
  
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the admin area section
  const adminAreaSection = document.getElementById('admin-area-section');
  if (adminAreaSection) {
    adminAreaSection.style.display = 'block';
    
    // Initialize admin area functionality
    initializeAdminArea();
  } else {
    console.error('❌ Admin area section not found');
  }
  
  // Update active state in sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  sidebarLinks.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    const listItem = link.closest('li');
    if (listItem) {
      if (linkSection === 'admin-area-section') {
        listItem.classList.add('active');
      } else {
        listItem.classList.remove('active');
      }
    }
  });
  
  // Update breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = 'Admin Area';
  }
}

// ============================================================================
// ------------------- Admin Area Initialization -------------------
// Sets up admin area functionality and event handlers
// ============================================================================
function initializeAdminArea() {
  console.log('[index.js]: 🔧 Initializing admin area...');
  
  // Set up character of the week management
  const setCharacterWeekBtn = document.getElementById('set-character-week-btn');
  const randomCharacterWeekBtn = document.getElementById('random-character-week-btn');
  
  if (setCharacterWeekBtn) {
    setCharacterWeekBtn.addEventListener('click', () => {
      // TODO: Implement character selection modal
      console.log('[index.js]: 🎭 Set character of the week clicked');
    });
  }
  
  if (randomCharacterWeekBtn) {
    randomCharacterWeekBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/character-of-week/random', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          alert(`✅ ${result.message}`);
          // Refresh the character of the week display
          location.reload();
        } else {
          const error = await response.json();
          alert(`❌ Error: ${error.error}`);
        }
      } catch (error) {
        console.error('[index.js]: ❌ Error setting random character:', error);
        alert('❌ An error occurred while setting random character');
      }
    });
  }
  
  // Set up user management
  const userManagementBtn = document.getElementById('user-management-btn');
  const refreshUsersBtn = document.getElementById('refresh-users-btn');
  const backToAdminBtn = document.getElementById('back-to-admin-btn');
  
  if (userManagementBtn) {
    userManagementBtn.addEventListener('click', () => {
      showUserManagementSection();
    });
  }
  
  if (refreshUsersBtn) {
    refreshUsersBtn.addEventListener('click', () => {
      loadUserActivityData();
    });
  }
  
  if (backToAdminBtn) {
    backToAdminBtn.addEventListener('click', () => {
      hideUserManagementSection();
    });
  }
  
  // Set up other admin buttons
  const systemSettingsBtn = document.getElementById('system-settings-btn');
  const systemStatusBtn = document.getElementById('system-status-btn');
  const dataBackupBtn = document.getElementById('data-backup-btn');
  const dataRestoreBtn = document.getElementById('data-restore-btn');
  
  // Add placeholder functionality for other buttons
  [systemSettingsBtn, systemStatusBtn, dataBackupBtn, dataRestoreBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        alert('🚧 This feature is coming soon!');
      });
    }
  });
}

// ============================================================================
// ------------------- User Management Functions -------------------
// Handles user activity monitoring and management
// ============================================================================

// Show user management section
function showUserManagementSection() {
  console.log('[index.js]: 👥 Showing user management section...');
  
  // Hide admin tools grid
  const adminToolsGrid = document.querySelector('.admin-tools-grid');
  if (adminToolsGrid) {
    adminToolsGrid.style.display = 'none';
  }
  
  // Show user management section
  const userManagementSection = document.getElementById('user-management-section');
  if (userManagementSection) {
    userManagementSection.style.display = 'block';
  }
  
  // Load user data
  loadUserActivityData();
}

// Hide user management section and show admin tools
function hideUserManagementSection() {
  console.log('[index.js]: 🔙 Hiding user management section...');
  
  // Show admin tools grid
  const adminToolsGrid = document.querySelector('.admin-tools-grid');
  if (adminToolsGrid) {
    adminToolsGrid.style.display = 'grid';
  }
  
  // Hide user management section
  const userManagementSection = document.getElementById('user-management-section');
  if (userManagementSection) {
    userManagementSection.style.display = 'none';
  }
}

// Load user activity data from the server
async function loadUserActivityData() {
  console.log('[index.js]: 📊 Loading user activity data...');
  
  const loadingEl = document.getElementById('user-loading');
  const errorEl = document.getElementById('user-error');
  const tbody = document.getElementById('user-activity-tbody');
  
  try {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'flex';
    if (errorEl) errorEl.style.display = 'none';
    if (tbody) tbody.innerHTML = '';
    
    const response = await fetch('/api/admin/users/activity', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[index.js]: ✅ User activity data loaded:', data);
    
    // Update summary cards
    updateActivitySummary(data.summary);
    
    // Render user table
    renderUserActivityTable(data.users);
    
    // Set up search and filter functionality
    setupUserSearchAndFilter(data.users);
    
  } catch (error) {
    console.error('[index.js]: ❌ Error loading user activity data:', error);
    
    if (errorEl) {
      errorEl.style.display = 'flex';
      errorEl.querySelector('p').textContent = `Failed to load user data: ${error.message}`;
    }
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

// Update activity summary cards
function updateActivitySummary(summary) {
  const totalCount = document.getElementById('total-users-count');
  const activeCount = document.getElementById('active-users-count');
  const inactiveCount = document.getElementById('inactive-users-count');
  const activePercentage = document.getElementById('active-users-percentage');
  const inactivePercentage = document.getElementById('inactive-users-percentage');
  
  if (totalCount) totalCount.textContent = summary.total;
  if (activeCount) activeCount.textContent = summary.active;
  if (inactiveCount) inactiveCount.textContent = summary.inactive;
  if (activePercentage) activePercentage.textContent = `${summary.activePercentage}%`;
  if (inactivePercentage) inactivePercentage.textContent = `${100 - summary.activePercentage}%`;
}

// Render user activity table
function renderUserActivityTable(users) {
  const tbody = document.getElementById('user-activity-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  users.forEach(user => {
    const row = createUserTableRow(user);
    tbody.appendChild(row);
  });
}

// Create a user table row
function createUserTableRow(user) {
  const row = document.createElement('tr');
  
  // Format last message timestamp
  const lastMessageTime = user.lastMessageTimestamp 
    ? new Date(user.lastMessageTimestamp).toLocaleString()
    : 'Never';
  
  // Format days since last message
  const daysSince = user.daysSinceLastMessage !== null 
    ? `${user.daysSinceLastMessage} days`
    : 'Unknown';
  
  // Create avatar URL
  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
    : '/images/ankleicon.png';
  
  row.innerHTML = `
    <td>
      <div class="user-info">
        <img src="${avatarUrl}" alt="${user.username}" class="user-avatar" />
        <div class="user-details">
          <span class="user-name">${user.username}</span>
          <span class="user-discriminator">#${user.discriminator}</span>
        </div>
      </div>
    </td>
    <td>
      <span class="status-badge ${user.activityStatus}">
        <i class="fas fa-${user.activityStatus === 'active' ? 'check' : 'clock'}"></i>
        ${user.activityStatus}
      </span>
    </td>
    <td>
      <div class="last-message">
        <div class="last-message-content">${user.lastMessageContent || 'No messages'}</div>
        <div class="last-message-time">${lastMessageTime}</div>
      </div>
    </td>
    <td class="days-since ${user.activityStatus}">${daysSince}</td>
    <td>${user.characterCount || 0}</td>
    <td>${user.tokens || 0}</td>
    <td>
      <div class="user-actions">
        <button class="action-btn primary" onclick="updateUserStatus('${user.discordId}', '${user.activityStatus === 'active' ? 'inactive' : 'active'}')">
          <i class="fas fa-${user.activityStatus === 'active' ? 'pause' : 'play'}"></i>
          ${user.activityStatus === 'active' ? 'Deactivate' : 'Activate'}
        </button>
        <button class="action-btn secondary" onclick="viewUserDetails('${user.discordId}')">
          <i class="fas fa-eye"></i>
          View
        </button>
      </div>
    </td>
  `;
  
  return row;
}

// Set up search and filter functionality
function setupUserSearchAndFilter(users) {
  const searchInput = document.getElementById('user-search');
  const statusFilter = document.getElementById('status-filter');
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterUsers(users, e.target.value, statusFilter?.value || 'all');
    });
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      filterUsers(users, searchInput?.value || '', e.target.value);
    });
  }
}

// Filter users based on search and status
function filterUsers(allUsers, searchTerm, statusFilter) {
  const tbody = document.getElementById('user-activity-tbody');
  if (!tbody) return;
  
  let filteredUsers = allUsers;
  
  // Apply status filter
  if (statusFilter !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.activityStatus === statusFilter);
  }
  
  // Apply search filter
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    filteredUsers = filteredUsers.filter(user => 
      user.username.toLowerCase().includes(searchLower) ||
      user.discriminator.includes(searchTerm) ||
      user.lastMessageContent.toLowerCase().includes(searchLower)
    );
  }
  
  // Re-render table with filtered results
  renderUserActivityTable(filteredUsers);
}

// Update user status
async function updateUserStatus(discordId, newStatus) {
  try {
    console.log(`[index.js]: 🔄 Updating user ${discordId} status to ${newStatus}...`);
    
    const response = await fetch('/api/admin/users/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        discordId,
        status: newStatus
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('[index.js]: ✅ User status updated:', result);
      
      // Reload user data to reflect changes
      await loadUserActivityData();
      
      // Show success message
      alert(`✅ User status updated to ${newStatus}`);
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user status');
    }
  } catch (error) {
    console.error('[index.js]: ❌ Error updating user status:', error);
    alert(`❌ Error updating user status: ${error.message}`);
  }
}

// View user details (placeholder for future implementation)
function viewUserDetails(discordId) {
  console.log(`[index.js]: 👁️ Viewing details for user ${discordId}`);
  alert('👁️ User details view coming soon!');
}

// Make functions globally available for onclick handlers
window.updateUserStatus = updateUserStatus;
window.viewUserDetails = viewUserDetails;

// ============================================================================
// ------------------- Exports -------------------
// Shared helpers and UI controls
// ============================================================================
export {
  showModal,
  hideModelDetails,
  showSection,
  setupSidebarNavigation,
  showLoadingState,
  hideLoadingState,
  formatTime,
  formatPrettyDate,
  formatCharacterIconUrl,
  renderMarkdownLinks,
  renderItemTypeIcon,
  loadModelData,
  showProfileSection,
  showGuildSection,
  showCalendarSection,
  showUsersSection,
  showAdminAreaSection
};
