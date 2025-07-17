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
    
    let button = document.getElementById('backToTop');
    if (!button) {
        // Create the button as a fallback
      button = document.createElement('button');
      button.id = 'backToTop';
      button.className = 'back-to-top';
      button.setAttribute('aria-label', 'Back to top');
      button.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
      document.body.appendChild(button);
    }
    
    
    // Ensure button is always visible
    button.style.display = 'flex';
    button.style.opacity = '1';
    button.style.pointerEvents = 'auto';
    button.style.visibility = 'visible';
  
    // Smooth scroll to top on click
    button.addEventListener('click', () => {
      scrollToTop();
    });
    
}

/**
 * ------------------- Function: scrollToTop -------------------
 * Smoothly scrolls the window to the top of the page with a single, smooth animation.
 */
function scrollToTop() {
  
  // Check for scrollable containers that might need scrolling
  const mainContent = document.querySelector('.main-content');
  const modelDetailsData = document.getElementById('model-details-data');
  
  if (mainContent) {
  }
  
  if (modelDetailsData) {
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
    scrollableElements.forEach(element => {
      element.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // Always scroll the window as well
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  } else {
    // Fallback for older browsers with custom easing
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
  if (pages <= 1) {
    return document.createDocumentFragment();
  }

  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'pagination';

  // Helper to create a button
  const makeButton = ({ className, content, title, disabled, onClick }) => {
    const btn = document.createElement('button');
    btn.className = className;
    if (title) btn.title = title;
    if (disabled) btn.disabled = true;
    btn.innerHTML = content;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    return btn;
  };

  // Previous
  if (page > 1) {
    paginationDiv.appendChild(makeButton({
      className: 'pagination-button',
      content: '<i class="fas fa-chevron-left"></i>',
      title: 'Previous Page',
      onClick: () => {
        onPageChange(page - 1);
      },
    }));
  }

  // First page shortcut
  if (page > 2) {
    paginationDiv.appendChild(makeButton({
      className: 'pagination-button',
      content: '1',
      onClick: () => {
        onPageChange(1);
      },
    }));
  }

  // Leading ellipsis
  if (page > 3) {
    const ell = document.createElement('span');
    ell.className = 'pagination-ellipsis';
    ell.textContent = '…';
    paginationDiv.appendChild(ell);
  }

  // Surrounding pages
  for (let i = Math.max(1, page - 1); i <= Math.min(pages, page + 1); i++) {
    paginationDiv.appendChild(makeButton({
      className: `pagination-button${i === page ? ' active' : ''}`,
      content: `${i}`,
      onClick: () => {  
        onPageChange(i);
      },
    }));
  }

  // Trailing ellipsis
  if (page < pages - 2) {
    const ell = document.createElement('span');
    ell.className = 'pagination-ellipsis';
    ell.textContent = '…';
    paginationDiv.appendChild(ell);
  }

  // Last page shortcut
  if (page < pages - 1) {
    paginationDiv.appendChild(makeButton({
      className: 'pagination-button',
      content: `${pages}`,
      onClick: () => {
        onPageChange(pages);
      },
    }));
  }

  // Next
  if (page < pages) {
    paginationDiv.appendChild(makeButton({
      className: 'pagination-button',
      content: '<i class="fas fa-chevron-right"></i>',
      title: 'Next Page',
      onClick: () => {
        onPageChange(page + 1);
      },
    }));
  }

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
  