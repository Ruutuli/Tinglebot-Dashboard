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
import * as error from './error.js';
import * as auth from './auth.js';
import * as guilds from './guilds.js';
import * as commands from './commands.js';
import * as villageShops from './villageShops.js';
import { createPagination, setupBackToTopButton, scrollToTop } from './ui.js';

// Import specific functions from characters module
const { renderCharacterCards } = characters;

// Test commands module import
// console.log('🔍 Testing commands module import...');
// console.log('📦 Commands module:', commands);
// console.log('🔧 showCommandsSection available:', typeof commands?.showCommandsSection);

export {
  inventory,
  items,
  characters,
  stats,
  error,
  auth,
  guilds,
  commands,
  villageShops,
};

// ============================================================================
// ------------------- Initialization -------------------
// Sets up UI listeners and initializes dashboard on load
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 DOM Content Loaded - Starting initialization...');
    
    // Initialize authentication first
    console.log('🔐 Initializing authentication...');
    await auth.checkUserAuthStatus();
    
    // Check if back-to-top button exists
    const backToTopButton = document.getElementById('backToTop');
    console.log('🔍 Back-to-top button check:', {
      exists: !!backToTopButton,
      element: backToTopButton,
      id: backToTopButton?.id,
      className: backToTopButton?.className
    });
    
    setupSidebarNavigation();
    console.log('🔝 Calling setupBackToTopButton from index.js...');
    setupBackToTopButton();
    setupModelCards();
    console.log('✅ Initialization complete');
  } catch (err) {
    error.logError(err, 'Initialization');
  }
});

// ------------------- Function: setupModelCards -------------------
// Attaches click handlers to each model card and loads model data
function setupModelCards() {
  const modelCards = document.querySelectorAll('.model-card');
  console.log('🔍 Setting up model cards:', modelCards.length);

  modelCards.forEach(card => {
    const modelName = card.getAttribute('data-model');
    console.log('🎯 Setting up card:', modelName);
    
    card.addEventListener('click', async (event) => {
      event.preventDefault(); // Prevent default button behavior
      console.log('🖱️ Model card clicked:', modelName);

      // Reset filters when switching between models
      if (window.itemFiltersInitialized) {
        console.log('🧹 Resetting item filters for model switch');
        window.itemFiltersInitialized = false;
        window.allItems = null;
        window.savedFilterState = {};
      }
      if (window.characterFiltersInitialized) {
        console.log('🧹 Resetting character filters for model switch');
        window.characterFiltersInitialized = false;
        window.allCharacters = null;
      }

      // Add visual feedback for click
      card.classList.add('clicked');
      setTimeout(() => card.classList.remove('clicked'), 200);

      showLoadingState();
      console.log('⏳ Loading state shown');

      // Declare variables outside try block so they're available in catch
      let dashboardSection, modelDetailsPage, title, contentDiv, backButton;

      try {
        // Hide dashboard, show details view
        dashboardSection = document.getElementById('dashboard-section');
        modelDetailsPage = document.getElementById('model-details-page');
        title = document.getElementById('model-details-title');
        contentDiv = document.getElementById('model-details-data');
        backButton = document.querySelector('.back-button');

        console.log('🔍 Checking required elements:', {
          dashboardSection: !!dashboardSection,
          modelDetailsPage: !!modelDetailsPage,
          title: !!title,
          contentDiv: !!contentDiv,
          backButton: !!backButton
        });

        if (!dashboardSection || !modelDetailsPage || !title || !contentDiv || !backButton) {
          throw new Error('Required DOM elements not found');
        }

        dashboardSection.style.display = 'none';
        modelDetailsPage.style.display = 'block';
        title.textContent = modelName.charAt(0).toUpperCase() + modelName.slice(1);
        contentDiv.innerHTML = '';
        console.log('📱 UI elements updated');

        // Setup back button handler
        backButton.onclick = () => {
          console.log('🔙 Back button clicked');
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

        console.log('🌐 Fetching model data:', modelName);
        const response = await fetch(`/api/models/${modelName}`);
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const { data, pagination } = await response.json();
        console.log('📦 Received data:', { 
          dataLength: data?.length, 
          pagination,
          firstItem: data?.[0] 
        });

        const characterFiltersBar = document.querySelector('.character-filters');
        if (modelName === 'character' && characterFiltersBar) {
          console.log('🎛️ Setting up character filters');
          if (contentDiv.firstChild !== characterFiltersBar) {
            contentDiv.insertBefore(characterFiltersBar, contentDiv.firstChild);
          }
          characterFiltersBar.style.display = 'flex';
        } else if (characterFiltersBar) {
          characterFiltersBar.style.display = 'none';
        }

        const villageShopFiltersBar = document.querySelector('.village-shop-filters');
        if (modelName === 'villageShops' && villageShopFiltersBar) {
          console.log('🏪 Setting up village shop filters');
          console.log('🏪 Filter container found:', villageShopFiltersBar);
          console.log('🏪 Filter container children:', villageShopFiltersBar.children.length);
          if (contentDiv.firstChild !== villageShopFiltersBar) {
            contentDiv.insertBefore(villageShopFiltersBar, contentDiv.firstChild);
            console.log('🏪 Moved filter container to content div');
          }
          villageShopFiltersBar.style.display = 'flex';
          console.log('🏪 Made filter container visible');
        } else if (villageShopFiltersBar) {
          villageShopFiltersBar.style.display = 'none';
        } else if (modelName === 'villageShops') {
          console.error('❌ Village shop filters container not found in index.js');
        }

        console.log('🚀 Initializing model:', modelName);
        switch (modelName) {
          case 'character':
            console.log('👥 Initializing character page');
            await characters.initializeCharacterPage(data, pagination.page, contentDiv);
            break;
          case 'item':
            console.log('📦 Initializing item page');
            // Check if item filters are active
            if (window.itemFiltersInitialized && window.savedFilterState) {
              const hasActiveFilters = window.savedFilterState.searchTerm || 
                window.savedFilterState.categoryFilter !== 'all' || 
                window.savedFilterState.typeFilter !== 'all' || 
                window.savedFilterState.subtypeFilter !== 'all' || 
                window.savedFilterState.jobsFilter !== 'all' || 
                window.savedFilterState.locationsFilter !== 'all';
              
              if (hasActiveFilters) {
                console.log('🔍 Filters active - skipping normal pagination for items');
                // Don't apply normal pagination when filters are active
                // Let the filtered pagination handle it
                return; // Skip pagination update
              }
            }
            await items.initializeItemPage(data, pagination.page, contentDiv);
            break;
          case 'inventory':
            console.log('🎒 Initializing inventory page');
            // Inventory uses its own efficient pagination system
            // Skip the main pagination logic entirely
            await inventory.initializeInventoryPage(data, pagination.page, contentDiv);
            break;
          case 'villageShops':
            console.log('🏰 Initializing village shops page');
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
              console.log('🔍 Filters active - skipping initial pagination setup for items');
              // Don't create normal pagination when filters are active
              // Let the filtered pagination handle it
              return;
            }
          }

          // Skip pagination for inventory as it uses its own efficient system
          if (modelName === 'inventory') {
            console.log('🎒 Skipping main pagination for inventory - uses efficient pagination system');
            return;
          }

          // Skip pagination for village shops as it uses its own efficient system
          if (modelName === 'villageShops') {
            console.log('🏰 Skipping main pagination for village shops - uses efficient pagination system');
            return;
          }

          console.log('📄 Setting up pagination');
          const handlePageChange = async (pageNum) => {
            console.log(`🔄 Page change requested to page ${pageNum}`);
            showLoadingState();
            try {
              console.log(`📄 Loading page ${pageNum}`);
              const { data, pagination } = await loadModelData(modelName, pageNum);
              console.log(`📦 Received page ${pageNum} data:`, { 
                dataLength: data?.length, 
                pagination,
                firstItem: data?.[0] 
              });

              switch (modelName) {
                case 'character':
                  console.log('🎯 About to render characters:', {
                    dataLength: data?.length,
                    page: pagination.page,
                    firstCharacter: data?.[0]?.name
                  });
                  try {
                    // For characters, we need to handle pagination differently
                    // since they have their own filtering system
                    if (!window.characterFiltersInitialized) {
                      // If filters aren't initialized, use the main pagination
                      await characters.renderCharacterCards(data, pagination.page, false);
                      console.log('✅ Characters rendered successfully');
                    } else {
                      // If filters are initialized, let the character module handle pagination
                      console.log('🔍 Character filters active - letting character module handle pagination');
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
                      console.log('🔍 Filters active - skipping pagination for items');
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
                  console.log('🎒 Skipping main pagination handling for inventory');
                  return;
                case 'villageShops':
                  // Village shops uses its own efficient pagination system
                  // Skip the main pagination handling
                  console.log('🏰 Skipping main pagination handling for village shops');
                  return;
                default:
                  console.error(`Unknown model type: ${modelName}`);
              }
              
              // Recreate pagination with updated page number
              console.log('📄 Recreating pagination with updated page:', pagination.page);
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
            console.log('🎒 Skipping main pagination container creation for inventory');
          } else if (modelName === 'villageShops') {
            // Village shops uses its own efficient pagination system
            // Skip creating main pagination container
            console.log('🏰 Skipping main pagination container creation for village shops');
          } else {
            // Fix the createPagination call to use correct parameter format
            const paginationDiv = createPagination({ page: pagination.page, pages: pagination.pages }, handlePageChange);
            contentDiv.appendChild(paginationDiv);
          }
        }

        // Load character of the week
        if (typeof loadCharacterOfWeek === 'function') {
          console.log('🌟 Loading character of the week...');
          try {
            loadCharacterOfWeek();
          } catch (error) {
            console.error('❌ Error loading character of the week:', error);
          }
        } else {
          console.log('⚠️ Character of week function not available');
          console.log('🔍 Available loadCharacterOfWeek:', typeof loadCharacterOfWeek);
        }

      } catch (err) {
        console.error('❌ Error loading model data:', err);
        error.logError(err, 'Loading Model Data');
        if (contentDiv) {
          handleModelDataError(modelName, contentDiv);
        }
      } finally {
        hideLoadingState();
        console.log('✅ Loading complete');
      }
    });
  });
}

// ------------------- Function: loadModelData -------------------
// Fetches paginated model data by type
async function loadModelData(modelName, page = 1) {
  const response = await fetch(`/api/models/${modelName}?page=${page}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
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
    console.log('📊 Stats data loading skipped - using character stats instead');
  } catch (err) {
    error.logError(err, 'Loading Stats');
  }
}

// ============================================================================
// ------------------- Section Navigation -------------------
// Switches between sections using nav links
// ============================================================================
function showSection(sectionId) {
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    section.style.display = section.id === sectionId ? 'block' : 'none';
  });
}

// ============================================================================
// ------------------- Navigation Setup -------------------
// Handles all sidebar navigation including dashboard and stats
// ============================================================================
function setupSidebarNavigation() {
  console.log('📊 Setting up sidebar navigation...');
  
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  console.log('🔍 Found sidebar links:', sidebarLinks.length);
  
  sidebarLinks.forEach(link => {
    const sectionId = link.getAttribute('data-section');
    console.log('🔗 Setting up link:', sectionId);
    
    link.addEventListener('click', e => {
      e.preventDefault();
      console.log('🖱️ Sidebar link clicked:', sectionId);
      
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
      } else {
        // For other sections, use the existing showSection function
        showSection(sectionId);
      }
    });
  });
  
  // Handle browser back/forward buttons
  window.addEventListener('popstate', (event) => {
    const section = event.state?.section || 'dashboard-section';
    console.log('🔄 Browser navigation to:', section);
    
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
    } else {
      showSection(section);
    }
  });
  
  // Handle initial URL on page load
  const hash = window.location.hash;
  if (hash) {
    const sectionId = hash.substring(1);
    console.log('📍 Initial URL hash:', sectionId);
    
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
  console.log('📱 Setting up mobile sidebar functionality...');
  
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
    console.log('📱 Sidebar toggle clicked');
    
    if (isMobileView()) {
      toggleMobileSidebar();
    } else {
      toggleDesktopSidebar();
    }
  });
  
  // Overlay click handler to close sidebar
  overlay.addEventListener('click', () => {
    console.log('📱 Overlay clicked - closing sidebar');
    closeMobileSidebar();
  });
  
  // Close sidebar on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMobileView()) {
      console.log('📱 Escape key pressed - closing sidebar');
      closeMobileSidebar();
    }
  });
  
  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      console.log('📱 Window resized - checking mobile state');
      handleWindowResize();
    }, 250);
  });
  
  // Initial setup
  handleWindowResize();
}

function isMobileView() {
  return window.innerWidth <= 768;
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (!sidebar) return;
  
  const isOpen = sidebar.classList.contains('mobile-open');
  
  if (isOpen) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}

function openMobileSidebar() {
  console.log('📱 Opening mobile sidebar');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (sidebar) {
    sidebar.classList.add('mobile-open');
    sidebar.classList.remove('mobile-closing');
  }
  
  if (overlay) {
    overlay.classList.add('active');
  }
  
  // Prevent body scroll when sidebar is open
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  console.log('📱 Closing mobile sidebar');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (sidebar) {
    sidebar.classList.add('mobile-closing');
    sidebar.classList.remove('mobile-open');
    
    // Remove closing class after animation
    setTimeout(() => {
      sidebar.classList.remove('mobile-closing');
    }, 300);
  }
  
  if (overlay) {
    overlay.classList.remove('active');
  }
  
  // Restore body scroll
  document.body.style.overflow = '';
}

function toggleDesktopSidebar() {
  console.log('🖥️ Toggling desktop sidebar');
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
  const isMobile = isMobileView();
  const sidebar = document.querySelector('.sidebar');
  const mainWrapper = document.querySelector('.main-wrapper');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (isMobile) {
    // Mobile view: ensure sidebar is hidden by default
    if (sidebar) {
      sidebar.classList.remove('collapsed');
      sidebar.classList.remove('mobile-open');
      sidebar.classList.remove('mobile-closing');
    }
    if (mainWrapper) {
      mainWrapper.classList.remove('sidebar-collapsed');
    }
    if (overlay) {
      overlay.classList.remove('active');
    }
    document.body.style.overflow = '';
  } else {
    // Desktop view: ensure mobile classes are removed
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
      sidebar.classList.remove('mobile-closing');
    }
    if (overlay) {
      overlay.classList.remove('active');
    }
    document.body.style.overflow = '';
  }
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
  console.log('📊 Showing stats section...');
  
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
    console.log('✅ Stats section displayed');
    
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
  console.log('🏠 Showing dashboard section...');
  
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
    console.log('✅ Dashboard section displayed');
    
    // Debug: Check if dashboard content is visible
    const welcomeBox = dashboardSection.querySelector('.dashboard-welcome-box');
    const modelGrid = dashboardSection.querySelector('.model-grid');
    const linksSection = dashboardSection.querySelector('.dashboard-links-section');
    const countdownSection = dashboardSection.querySelector('#countdown-section');
    
    console.log('🔍 Dashboard content check:', {
      welcomeBox: !!welcomeBox,
      welcomeBoxDisplay: welcomeBox?.style.display,
      modelGrid: !!modelGrid,
      modelGridDisplay: modelGrid?.style.display,
      linksSection: !!linksSection,
      linksSectionDisplay: linksSection?.style.display,
      countdownSection: !!countdownSection,
      countdownSectionDisplay: countdownSection?.style.display,
      dashboardSectionDisplay: dashboardSection.style.display
    });
    
    // Fix: Explicitly make dashboard content visible
    if (welcomeBox) welcomeBox.style.display = 'block';
    if (modelGrid) modelGrid.style.display = 'grid';
    if (linksSection) linksSection.style.display = 'flex';
    if (countdownSection) countdownSection.style.display = 'block';
    
    // Ensure character of the week section is visible
    const characterOfWeekSection = document.getElementById('character-of-week-section');
    if (characterOfWeekSection) {
      characterOfWeekSection.style.display = 'block';
      console.log('🔧 Made character of week section visible');
    }
    
    console.log('🔧 Fixed dashboard content visibility');
    
    // Check for any loading states that might be hiding content
    const loader = document.getElementById('loader');
    const loadingStates = document.querySelectorAll('.loading-state');
    console.log('🔍 Loading states check:', {
      loader: !!loader,
      loaderDisplay: loader?.style.display,
      loadingStatesCount: loadingStates.length,
      loadingStatesDisplay: Array.from(loadingStates).map(el => el.style.display)
    });
    
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
      console.log('🌤️ Rendering weather section...');
      window.renderWeatherSection();
    }
    
    // Load character of the week
    if (typeof loadCharacterOfWeek === 'function') {
      console.log('🌟 Loading character of the week...');
      try {
        loadCharacterOfWeek();
      } catch (error) {
        console.error('❌ Error loading character of the week:', error);
      }
    } else {
      console.log('⚠️ Character of week function not available');
      console.log('🔍 Available loadCharacterOfWeek:', typeof loadCharacterOfWeek);
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
  console.log('👤 Showing profile section...');
  
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
    console.log('✅ Profile section displayed');
    
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
  console.log('🏰 Showing guild section...');
  
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
    console.log('✅ Guild section displayed');
    
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
  console.log('📅 Showing calendar section...');
  
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
    console.log('✅ Calendar section displayed');
    
    // Initialize calendar page if module is available
    if (window.calendarModule) {
      window.calendarModule.loadCalendarData();
    } else {
      console.log('⚠️ Calendar module not available yet');
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
  showCalendarSection
};
