/* ============================================================================
 * File: auth.js
 * Purpose: Handles user authentication state and user menu functionality.
 * ============================================================================ */

// ============================================================================
// ------------------- Section: Authentication State -------------------
// Manages current user authentication status and data
// ============================================================================

let currentUser = null;
let isAuthenticated = false;

// ============================================================================
// ------------------- Section: Initialization -------------------
// Sets up authentication checking and user menu functionality
// ============================================================================

document.addEventListener('DOMContentLoaded', initUserAuth);

// ------------------- Function: initUserAuth -------------------
// Initializes user authentication and menu functionality
async function initUserAuth() {
  try {
    console.log('[auth.js]: 🔐 Initializing user authentication...');
    
    // Check if user just logged in (check URL parameters)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'success') {
      console.log('[auth.js]: 🎉 Login success detected, refreshing user data...');
      // Remove the parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Wait a moment for server to process login
      setTimeout(async () => {
        await checkUserAuthStatus();
      }, 500);
    } else {
      // Check authentication status
      await checkUserAuthStatus();
    }
    
    // Set up user menu interactions
    setupUserMenu();
    
    // Set up periodic refresh (every 30 seconds)
    setInterval(async () => {
      if (isAuthenticated) {
        await refreshUserData();
      }
    }, 30000);
    
    console.log('[auth.js]: ✅ User authentication initialized');
  } catch (error) {
    console.error('[auth.js]: ❌ Error initializing user auth:', error);
    showGuestUser();
  }
}

// ============================================================================
// ------------------- Section: Authentication Status -------------------
// Handles checking and updating authentication state
// ============================================================================

// ------------------- Function: checkUserAuthStatus -------------------
// Checks current user authentication status from server
async function checkUserAuthStatus() {
  try {
    const response = await fetch('/api/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    
    const userData = await response.json();
    
    if (userData.authenticated) {
      console.log('[auth.js]: ✅ User authenticated:', userData.username);
      currentUser = userData;
      isAuthenticated = true;
      updateUserMenu(userData);
    } else {
      console.log('[auth.js]: 👤 User not authenticated, showing guest mode');
      currentUser = null;
      isAuthenticated = false;
      showGuestUser();
    }
  } catch (error) {
    console.error('[auth.js]: ❌ Error checking auth status:', error);
    showGuestUser();
  }
}

// ============================================================================
// ------------------- Section: User Menu Management -------------------
// Handles user menu display and interactions
// ============================================================================

// ------------------- Function: setupUserMenu -------------------
// Sets up user menu click handlers and interactions
function setupUserMenu() {
  const userMenu = document.getElementById('user-menu');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (!userMenu || !userDropdown) {
    console.error('[auth.js]: ❌ User menu elements not found');
    return;
  }
  
  // Toggle dropdown on click
  userMenu.addEventListener('click', (event) => {
    event.stopPropagation();
    userDropdown.classList.toggle('show');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (event) => {
    if (!userMenu.contains(event.target)) {
      userDropdown.classList.remove('show');
    }
  });
  
  // Close dropdown on escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      userDropdown.classList.remove('show');
    }
  });
}

// ------------------- Function: updateUserMenu -------------------
// Updates user menu with authenticated user data
function updateUserMenu(userData) {
  const usernameElement = document.getElementById('username');
  const userAvatar = document.getElementById('user-avatar');
  const userDropdownAvatar = document.getElementById('user-dropdown-avatar');
  const userName = document.getElementById('user-name');
  const userDiscriminator = document.getElementById('user-discriminator');
  const userTokens = document.getElementById('user-tokens');
  const userSlots = document.getElementById('user-slots');
  const userInfo = document.getElementById('user-info');
  const guestInfo = document.getElementById('guest-info');
  
  if (!usernameElement || !userAvatar || !userDropdownAvatar || !userName || 
      !userDiscriminator || !userTokens || !userSlots || !userInfo || !guestInfo) {
    console.error('[auth.js]: ❌ User menu elements not found');
    return;
  }
  
  // Update main username display
  usernameElement.textContent = userData.username || 'User';
  
  // Update avatars
  const avatarUrl = userData.avatarUrl || '/images/ankleicon.png';
  userAvatar.src = avatarUrl;
  userDropdownAvatar.src = avatarUrl;
  
  // Update dropdown user info
  userName.textContent = userData.username || 'User';
  userDiscriminator.textContent = userData.discriminator ? `#${userData.discriminator}` : '';
  userTokens.textContent = userData.tokens || 0;
  userSlots.textContent = userData.characterSlot || 2;
  
  // Show user info, hide guest info
  userInfo.style.display = 'flex';
  guestInfo.style.display = 'none';
  
  console.log('[auth.js]: ✅ User menu updated for authenticated user');
}

// ------------------- Function: showGuestUser -------------------
// Shows guest user interface when not authenticated
function showGuestUser() {
  const usernameElement = document.getElementById('username');
  const userAvatar = document.getElementById('user-avatar');
  const userInfo = document.getElementById('user-info');
  const guestInfo = document.getElementById('guest-info');
  
  if (!usernameElement || !userAvatar || !userInfo || !guestInfo) {
    console.error('[auth.js]: ❌ User menu elements not found');
    return;
  }
  
  // Update main display
  usernameElement.textContent = 'Login';
  userAvatar.src = '/images/ankleicon.png';
  
  // Show guest info, hide user info
  userInfo.style.display = 'none';
  guestInfo.style.display = 'flex';
  
  console.log('[auth.js]: ✅ User menu updated for guest user');
}

// ============================================================================
// ------------------- Section: Authentication Utilities -------------------
// Helper functions for authentication management
// ============================================================================

// ------------------- Function: refreshUserData -------------------
// Refreshes user data from server
async function refreshUserData() {
  try {
    console.log('[auth.js]: 🔄 Refreshing user data...');
    await checkUserAuthStatus();
  } catch (error) {
    console.error('[auth.js]: ❌ Error refreshing user data:', error);
  }
}

// ------------------- Function: forceRefreshUserMenu -------------------
// Forces a refresh of the user menu (useful after login/logout)
async function forceRefreshUserMenu() {
  try {
    console.log('[auth.js]: 🔄 Force refreshing user menu...');
    await checkUserAuthStatus();
  } catch (error) {
    console.error('[auth.js]: ❌ Error force refreshing user menu:', error);
  }
}

// ------------------- Function: logout -------------------
// Handles user logout
async function logout() {
  try {
    const response = await fetch('/auth/logout', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('[auth.js]: ✅ User logged out successfully');
      currentUser = null;
      isAuthenticated = false;
      showGuestUser();
      
      // Close dropdown
      const userDropdown = document.getElementById('user-dropdown');
      if (userDropdown) {
        userDropdown.classList.remove('show');
      }
    } else {
      console.error('[auth.js]: ❌ Logout failed');
    }
  } catch (error) {
    console.error('[auth.js]: ❌ Error during logout:', error);
  }
}

// ============================================================================
// ------------------- Section: Public API -------------------
// Exports functions for use in other modules
// ============================================================================

export {
  currentUser,
  isAuthenticated,
  checkUserAuthStatus,
  updateUserMenu,
  showGuestUser,
  refreshUserData,
  forceRefreshUserMenu,
  logout
}; 