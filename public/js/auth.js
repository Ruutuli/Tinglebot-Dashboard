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
let userDropdown = null; // Global reference to user dropdown element

// ============================================================================
// ------------------- Section: Initialization -------------------
// Sets up authentication checking and user menu functionality
// ============================================================================

document.addEventListener('DOMContentLoaded', initUserAuth);

// ------------------- Function: initUserAuth -------------------
// Initializes user authentication and menu functionality
async function initUserAuth() {
  console.log('[auth.js]: 🔄 Initializing user authentication...');
  try {
    
    // Check if user just logged in (check URL parameters)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'success') {
      console.log('[auth.js]: ✅ Login success detected from URL parameter');
      // Remove the parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Wait a moment for server to process login
      setTimeout(async () => {
        await checkUserAuthStatus();
      }, 500);
    } else {
      console.log('[auth.js]: 🔍 Checking authentication status...');
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
  console.log('[auth.js]: 🔍 Checking user authentication status...');
  try {
    const response = await fetch('/api/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    console.log('[auth.js]: 📡 Auth status response:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
    }
    
    const userData = await response.json();
    console.log('[auth.js]: 📊 User data received:', userData);
    
    if (userData.isAuthenticated) {
      console.log('[auth.js]: ✅ User is authenticated');
      currentUser = userData.user;
      isAuthenticated = true;
      updateUserMenu(userData.user);
    } else {
      console.log('[auth.js]: 👤 User is not authenticated, showing guest user');
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
  console.log('[auth.js]: 🔧 Setting up user menu interactions...');
  
  const userMenu = document.getElementById('user-menu');
  userDropdown = document.getElementById('user-dropdown'); // Assign to global variable
  
  if (!userMenu || !userDropdown) {
    console.error('[auth.js]: ❌ User menu elements not found');
    console.log('[auth.js]: 🔍 Looking for elements:', {
      userMenu: !!userMenu,
      userDropdown: !!userDropdown
    });
    return;
  }
  
  console.log('[auth.js]: ✅ User menu elements found');

  // User menu click handler
  userMenu.addEventListener('click', function(event) {
    console.log('[auth.js]: 🖱️ User menu clicked');
    event.preventDefault();
    event.stopPropagation();
    
    // Toggle dropdown
    if (userDropdown.classList.contains('show')) {
        console.log('[auth.js]: 🔽 Closing dropdown');
        closeUserDropdown('userMenu click');
    } else {
        console.log('[auth.js]: 🔼 Opening dropdown');
        openUserDropdown('userMenu click');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    if (!userMenu.contains(event.target) && !userDropdown.contains(event.target)) {
        closeUserDropdown('outside click');
    }
  });

  // Close dropdown when window loses focus
  window.addEventListener('blur', function() {
    closeUserDropdown('window blur');
  });

  // Close dropdown when pressing Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && userDropdown.classList.contains('show')) {
        closeUserDropdown('escape key');
    }
  });

  // Handle logout button click
  const logoutButton = userDropdown.querySelector('.logout-button');
  if (logoutButton) {
    console.log('[auth.js]: ✅ Logout button found');
    logoutButton.addEventListener('click', async (event) => {
      console.log('[auth.js]: 🚪 Logout button clicked');
      event.preventDefault();
      event.stopPropagation();
      closeUserDropdown('logout button');
      await logout();
    });
  } else {
    console.log('[auth.js]: ⚠️ Logout button not found');
  }

  // Handle profile button click
  const profileButton = userDropdown.querySelector('.profile-button');
  if (profileButton) {
    console.log('[auth.js]: ✅ Profile button found');
    profileButton.addEventListener('click', (event) => {
      console.log('[auth.js]: 👤 Profile button clicked');
      event.preventDefault();
      event.stopPropagation();
      closeUserDropdown('profile button');
      // Navigate to profile section
      const profileLink = document.querySelector('a[data-section="profile-section"]');
      if (profileLink) {
        profileLink.click();
      }
    });
  } else {
    console.log('[auth.js]: ⚠️ Profile button not found');
  }

  // Handle login button click in guest info
  const loginButton = userDropdown.querySelector('.login-button');
  if (loginButton) {
    console.log('[auth.js]: ✅ Login button found in dropdown');
    loginButton.addEventListener('click', (event) => {
      console.log('[auth.js]: 🔐 Login button clicked in dropdown');
      event.preventDefault();
      event.stopPropagation();
      closeUserDropdown('login button');
      
      // Navigate to login page
      console.log('[auth.js]: 🔗 Redirecting to login page...');
      window.location.href = '/login';
    });
  } else {
    console.log('[auth.js]: ⚠️ Login button not found in dropdown');
  }

}

// ------------------- Function: openUserDropdown -------------------
// Opens the user dropdown menu
function openUserDropdown(source = 'unknown') {
  console.log(`[auth.js]: 🔼 Opening user dropdown (source: ${source})`);
  
  // Get userDropdown element if not already initialized
  const dropdown = userDropdown || document.getElementById('user-dropdown');
  if (!dropdown) {
    console.error('[auth.js]: ❌ User dropdown element not found');
    return;
  }
  
  dropdown.classList.add('show');
  dropdown.setAttribute('aria-expanded', 'true');
  console.log('[auth.js]: ✅ Dropdown opened successfully');
}

// ------------------- Function: closeUserDropdown -------------------
// Closes the user dropdown menu
function closeUserDropdown(source = 'unknown') {
  console.log(`[auth.js]: 🔽 Closing user dropdown (source: ${source})`);
  
  // Get userDropdown element if not already initialized
  const dropdown = userDropdown || document.getElementById('user-dropdown');
  if (!dropdown || !dropdown.classList.contains('show')) {
    console.log('[auth.js]: ℹ️ Dropdown already closed or not found');
    return;
  }
  
  dropdown.classList.remove('show');
  dropdown.setAttribute('aria-expanded', 'false');
  console.log('[auth.js]: ✅ Dropdown closed successfully');
}

// ------------------- Function: updateUserMenu -------------------
// Updates user menu with authenticated user data
function updateUserMenu(userData) {
  console.log('[auth.js]: 🔄 Updating user menu with authenticated user data:', userData);
  
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
    console.log('[auth.js]: 🔍 Available elements:', {
      usernameElement: !!usernameElement,
      userAvatar: !!userAvatar,
      userDropdownAvatar: !!userDropdownAvatar,
      userName: !!userName,
      userDiscriminator: !!userDiscriminator,
      userTokens: !!userTokens,
      userSlots: !!userSlots,
      userInfo: !!userInfo,
      guestInfo: !!guestInfo
    });
    return;
  }
  
  console.log('[auth.js]: ✅ All user menu elements found');
  
  // Update main username display
  usernameElement.textContent = userData.username || 'User';
  
  // Update avatars
  const avatarUrl = userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.discordId}/${userData.avatar}.png` : '/images/ankleicon.png';
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
  
  console.log('[auth.js]: ✅ User menu updated successfully');
}

// ------------------- Function: showGuestUser -------------------
// Shows guest user interface when not authenticated
function showGuestUser() {
  console.log('[auth.js]: 👤 Showing guest user interface');
  
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
  
  console.log('[auth.js]: ✅ Guest user interface shown');
}

// ============================================================================
// ------------------- Section: Data Refresh -------------------
// Handles periodic data refresh for authenticated users
// ============================================================================

// ------------------- Function: refreshUserData -------------------
// Refreshes user data periodically
async function refreshUserData() {
  try {
    const response = await fetch('/api/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      if (userData.isAuthenticated && userData.user) {
        currentUser = userData.user;
        updateUserMenu(userData.user);
      }
    }
  } catch (error) {
    console.error('[auth.js]: ❌ Error refreshing user data:', error);
  }
}

// ============================================================================
// ------------------- Section: Logout -------------------
// Handles user logout functionality
// ============================================================================

// ------------------- Function: logout -------------------
// Handles user logout
async function logout() {
  console.log('[auth.js]: 🚪 Logging out user...');
  try {
    const response = await fetch('/auth/logout', {
      method: 'GET',
      credentials: 'include'
    });
    
    console.log('[auth.js]: 📡 Logout response:', response.status, response.statusText);
    
    if (response.ok) {  
      console.log('[auth.js]: ✅ Logout successful');
      currentUser = null;
      isAuthenticated = false;
      showGuestUser();
      
      // Close dropdown using global variable
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
  logout,
  openUserDropdown,
  closeUserDropdown
}; 