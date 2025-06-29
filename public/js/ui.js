/* ======================================================================
 * File: ui.js
 * Description: Manages scroll-to-top functionality and both client-side and server-side pagination UI.
 * ====================================================================== */

// ============================================================================
// ------------------- Section: Scroll Utility -------------------
// Handles "back to top" button visibility and behavior
// ============================================================================
/**
 * ------------------- Function: setupBackToTopButton -------------------
 * Configures the scroll-to-top button visibility and click behavior.
 */
function setupBackToTopButton() {
    console.log('🔝 Setting up back to top button...');
    console.log('🔝 Document ready state:', document.readyState);
    console.log('🔝 Window scroll position:', window.pageYOffset);
    
    let button = document.getElementById('backToTop');
    if (!button) {
      console.error('❌ Back to top button not found in DOM');
      console.error('❌ Available elements with "back" in ID:', 
        Array.from(document.querySelectorAll('[id*="back"]')).map(el => el.id));
      console.error('❌ Available elements with "top" in ID:', 
        Array.from(document.querySelectorAll('[id*="top"]')).map(el => el.id));
      
      // Create the button as a fallback
      console.log('🔝 Creating back-to-top button as fallback...');
      button = document.createElement('button');
      button.id = 'backToTop';
      button.className = 'back-to-top';
      button.setAttribute('aria-label', 'Back to top');
      button.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
      document.body.appendChild(button);
      console.log('✅ Created back-to-top button:', button);
    }
    
    console.log('✅ Back to top button found:', button);
    console.log('✅ Button current styles:', {
      display: button.style.display,
      opacity: button.style.opacity,
      visibility: button.style.visibility,
      position: button.style.position,
      zIndex: button.style.zIndex
    });
    
    // Ensure button is always visible
    console.log('🔝 Making button always visible...');
    button.style.display = 'flex';
    button.style.opacity = '1';
    button.style.pointerEvents = 'auto';
    button.style.visibility = 'visible';
  
    // Smooth scroll to top on click
    button.addEventListener('click', () => {
      console.log('🔝 Back to top button clicked');
      scrollToTop();
    });
    
    console.log('✅ Back to top button setup complete - always visible');
}

/**
 * ------------------- Function: scrollToTop -------------------
 * Smoothly scrolls the window to the top of the page with a single, smooth animation.
 */
function scrollToTop() {
  console.log('📜 scrollToTop function called');
  console.log('📜 Current window scroll position:', window.pageYOffset);
  console.log('📜 Current document scroll position:', document.documentElement.scrollTop);
  console.log('📜 Current body scroll position:', document.body.scrollTop);
  
  // Check for scrollable containers that might need scrolling
  const mainContent = document.querySelector('.main-content');
  const modelDetailsData = document.getElementById('model-details-data');
  
  if (mainContent) {
    console.log('📜 Main content scroll position:', mainContent.scrollTop);
    console.log('📜 Main content scroll height:', mainContent.scrollHeight);
    console.log('📜 Main content client height:', mainContent.clientHeight);
  }
  
  if (modelDetailsData) {
    console.log('📜 Model details scroll position:', modelDetailsData.scrollTop);
    console.log('📜 Model details scroll height:', modelDetailsData.scrollHeight);
    console.log('📜 Model details client height:', modelDetailsData.clientHeight);
  }
  
  // Check if any scrollable containers need scrolling
  const scrollableElements = [];
  
  if (mainContent && mainContent.scrollTop > 0) {
    scrollableElements.push(mainContent);
  }
  
  if (modelDetailsData && modelDetailsData.scrollTop > 0) {
    scrollableElements.push(modelDetailsData);
  }
  
  // If we have scrollable elements, scroll them first
  if (scrollableElements.length > 0) {
    console.log('📜 Found scrollable elements:', scrollableElements.length);
    scrollableElements.forEach(element => {
      console.log('📜 Scrolling element:', element.className || element.id);
      element.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // Always scroll the window as well
  if ('scrollBehavior' in document.documentElement.style) {
    console.log('📜 Using native smooth scroll behavior for window');
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  } else {
    // Fallback for older browsers with custom easing
    console.log('📜 Using fallback smooth scroll method for window');
    const start = window.pageYOffset;
    const startTime = performance.now();
    const duration = 600; // Slightly faster for better UX
    
    const easeOutCubic = (t) => {
      return 1 - Math.pow(1 - t, 3);
    };
    
    const animateWindowScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      
      window.scrollTo(0, start - (start * easedProgress));
      
      if (progress < 1) {
        requestAnimationFrame(animateWindowScroll);
      }
    };
    
    requestAnimationFrame(animateWindowScroll);
  }
  
  console.log('📜 Smooth scroll to top initiated');
}
  
// ============================================================================
// ------------------- Section: Client-Side Pagination Controls -------------------
// Handles rendering and event bindings for pagination UI (client-side)
// ============================================================================
/**
 * ------------------- Function: createPagination -------------------
 * Builds and returns a DOM node with pagination controls.
 */
function createPagination({ page = 1, pages = 1 }, onPageChange) {
  console.log('🎯 Creating pagination:', { page, pages });
  if (pages <= 1) {
    console.log('📄 No pagination needed (pages <= 1)');
    return document.createDocumentFragment();
  }

  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'pagination';
  console.log('📄 Created pagination container');

  // Helper to create a button
  const makeButton = ({ className, content, title, disabled, onClick }) => {
    console.log('🔘 Creating button:', { className, content, title, disabled });
    const btn = document.createElement('button');
    btn.className = className;
    if (title) btn.title = title;
    if (disabled) btn.disabled = true;
    btn.innerHTML = content;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🖱️ Pagination button clicked:', { className, content });
      onClick();
    });
    return btn;
  };

  // Previous
  if (page > 1) {
    console.log('⬅️ Adding previous button');
    paginationDiv.appendChild(makeButton({
      className: 'pagination-button',
      content: '<i class="fas fa-chevron-left"></i>',
      title: 'Previous Page',
      onClick: () => {
        console.log('⬅️ Previous page clicked, current page:', page);
        onPageChange(page - 1);
      },
    }));
  }

  // First page shortcut
  if (page > 2) {
    console.log('1️⃣ Adding first page button');
    paginationDiv.appendChild(makeButton({
      className: 'pagination-button',
      content: '1',
      onClick: () => {
        console.log('1️⃣ First page clicked');
        onPageChange(1);
      },
    }));
  }

  // Leading ellipsis
  if (page > 3) {
    console.log('... Adding leading ellipsis');
    const ell = document.createElement('span');
    ell.className = 'pagination-ellipsis';
    ell.textContent = '…';
    paginationDiv.appendChild(ell);
  }

  // Surrounding pages
  console.log('📄 Adding surrounding pages');
  for (let i = Math.max(1, page - 1); i <= Math.min(pages, page + 1); i++) {
    console.log(`📄 Adding page button ${i}`);
    paginationDiv.appendChild(makeButton({
      className: `pagination-button${i === page ? ' active' : ''}`,
      content: `${i}`,
      onClick: () => {
        console.log(`📄 Page ${i} clicked`);
        onPageChange(i);
      },
    }));
  }

  // Trailing ellipsis
  if (page < pages - 2) {
    console.log('... Adding trailing ellipsis');
    const ell = document.createElement('span');
    ell.className = 'pagination-ellipsis';
    ell.textContent = '…';
    paginationDiv.appendChild(ell);
  }

  // Last page shortcut
  if (page < pages - 1) {
    console.log('🔚 Adding last page button');
    paginationDiv.appendChild(makeButton({
      className: 'pagination-button',
      content: `${pages}`,
      onClick: () => {
        console.log(`🔚 Last page clicked: ${pages}`);
        onPageChange(pages);
      },
    }));
  }

  // Next
  if (page < pages) {
    console.log('➡️ Adding next button');
    paginationDiv.appendChild(makeButton({
      className: 'pagination-button',
      content: '<i class="fas fa-chevron-right"></i>',
      title: 'Next Page',
      onClick: () => {
        console.log('➡️ Next page clicked, current page:', page);
        onPageChange(page + 1);
      },
    }));
  }

  console.log('✅ Pagination creation complete');
  return paginationDiv;
}

// ============================================================================
// ------------------- Section: Server-Side Pagination Controls -------------------
// Handles building pagination markup and attaching to the container (server-side)
// ============================================================================
/**
 * ------------------- Function: setupServerPagination -------------------
 * Renders server-driven pagination into the target container by model name.
 */
async function setupServerPagination(modelName, { currentPage = 1, totalPages = 1 }) {
  const container = document.getElementById(`${modelName}-pagination`);
  if (!container) return;  // Exit if no container found

  try {
    let html = '';

    // Previous button
    html += `
      <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}
              onclick="load${capitalizeFirstLetter(modelName)}Page(${currentPage - 1})">
        Previous
      </button>`;

    // Page number buttons
    for (let i = 1; i <= totalPages; i++) {
      html += `
        <button class="pagination-btn${i === currentPage ? ' active' : ''}"
                onclick="load${capitalizeFirstLetter(modelName)}Page(${i})">
          ${i}
        </button>`;
    }

    // Next button
    html += `
      <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}
              onclick="load${capitalizeFirstLetter(modelName)}Page(${currentPage + 1})">
        Next
      </button>`;

    container.innerHTML = html;
  } catch (error) {
    console.error(`Error setting up ${modelName} pagination:`, error);
    // Optional: container.innerHTML = '<p class="error">Failed to load pagination.</p>';
  }
}

// ============================================================================
// ------------------- Section: Helpers -------------------
// Utility functions shared across modules
// ============================================================================
/**
 * ------------------- Function: capitalizeFirstLetter -------------------
 * Capitalizes the first character of a string.
 */
function capitalizeFirstLetter(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// ------------------- Exports -------------------
// Expose public functions for external use
// ============================================================================
export {
  setupBackToTopButton,
  createPagination,
  setupServerPagination,
  capitalizeFirstLetter,
  scrollToTop
};
  