/* ============================================================================
   commands.js
   Purpose: Handles the commands page functionality
============================================================================ */

// Import UI functions
import { setupBackToTopButton } from './ui.js';
import { showError } from './error.js';

// Commands page functionality
let allCommands = [];
let filteredCommands = [];

// ============================================================================
// ------------------- Section Display -------------------
// Shows the commands section
// ============================================================================
function loadCommandsCSS() {
  if (!document.getElementById('commands-css')) {
    const link = document.createElement('link');
    link.id = 'commands-css';
    link.rel = 'stylesheet';
    link.href = 'css/commands.css';
    document.head.appendChild(link);
  }
}

export function showCommandsSection() {
  loadCommandsCSS();
  
  try {
    // Hide all sections
    const sections = document.querySelectorAll('main > section');
    sections.forEach(section => {
      section.style.display = 'none';
    });
    
    // Show commands section
    const commandsSection = document.getElementById('commands-section');
    if (commandsSection) {
      commandsSection.style.display = 'block';
    } else {
      console.error('❌ Commands section element not found');
    }
    
    // Update breadcrumb
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
      breadcrumb.textContent = 'Commands';
    }
    
    // Update active sidebar link
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(link => {
      link.parentElement.classList.remove('active');
      if (link.getAttribute('data-section') === 'commands-section') {
        link.parentElement.classList.add('active');
      }
    });
    
    // Setup back to top button for commands page
    setupBackToTopButton();
    
    // Initialize commands if not already done
    if (allCommands.length === 0) {
      initCommands();
    } else {
      displayCommands();
      updateStats();
    }
    
  } catch (err) {
    console.error('❌ Error in showCommandsSection:', err);
  }
}

// ============================================================================
// ------------------- Commands Loading -------------------
// Loads commands data locally (no longer fetches from server)
// ============================================================================
async function loadCommands() {
  try {
    // All command keys from getCommandUsageGuide
    const allCommandKeys = [
      'character', 'character create', 'character create inariko', 'character create rudania', 'character create vhintl', 'character create general',
      'character edit', 'character view', 'character viewlist', 'character delete', 'character changejob', 'character setbirthday',
      'economy', 'economy gift', 'economy shop-view', 'economy shop-buy', 'economy shop-sell', 'economy trade', 'economy transfer',
      'inventory', 'inventory view', 'inventory sync', 'inventory test',
      'gear', 'item', 'spiritorbs', 'spiritorbs check', 'spiritorbs exchange',
      'gather', 'loot', 'crafting', 'heal', 'heal request', 'heal fulfill',
      'lookup', 'tokens', 'tokens check', 'tokens setup', 'roll', 'cancelvoucher',
      'travel', 'quest', 'quest join', 'quest leave', 'quest create', 'quest edit', 'quest delete', 'quest voucher', 'quest list',
      'blight', 'blight roll', 'blight heal', 'blight submit', 'blight history', 'blight roster',
      'specialweather', 'explore', 'explore setup', 'explore join', 'explore start', 'explore roll', 'viewmap'
    ];
    // Provide metadata for each command
    const commandMeta = {
      'character': { description: 'Manage your characters including creation, editing, viewing, and deletion.', usage: '/character [subcommand] [parameters]', category: 'character' },
      'character create': { description: 'Create a new character.', usage: '/character create [village]', category: 'character' },
      'character create inariko': { description: 'Create a character with an Inariko exclusive job.', usage: '/character create inariko [parameters]', category: 'character' },
      'character create rudania': { description: 'Create a character with a Rudania exclusive job.', usage: '/character create rudania [parameters]', category: 'character' },
      'character create vhintl': { description: 'Create a character with a Vhintl exclusive job.', usage: '/character create vhintl [parameters]', category: 'character' },
      'character create general': { description: 'Create a character with a general job.', usage: '/character create general [parameters]', category: 'character' },
      'character edit': { description: 'Edit an existing character.', usage: '/character edit [parameters]', category: 'character' },
      'character view': { description: 'View character details.', usage: '/character view [parameters]', category: 'character' },
      'character viewlist': { description: 'View a list of characters.', usage: '/character viewlist [parameters]', category: 'character' },
      'character delete': { description: 'Delete a character.', usage: '/character delete [parameters]', category: 'character' },
      'character changejob': { description: 'Change character\'s job.', usage: '/character changejob [parameters]', category: 'character' },
      'character setbirthday': { description: 'Set character\'s birthday.', usage: '/character setbirthday [parameters]', category: 'character' },
      'economy': { description: 'Manage the economy system.', usage: '/economy [subcommand] [parameters]', category: 'economy' },
      'economy gift': { description: 'Gift items from your character to another character.', usage: '/economy gift [parameters]', category: 'economy' },
      'economy shop-view': { description: 'View items available in the shop.', usage: '/economy shop-view', category: 'economy' },
      'economy shop-buy': { description: 'Buy items from the shop.', usage: '/economy shop-buy [parameters]', category: 'economy' },
      'economy shop-sell': { description: 'Sell items to the shop.', usage: '/economy shop-sell [parameters]', category: 'economy' },
      'economy trade': { description: 'Trade items between two characters.', usage: '/economy trade [parameters]', category: 'economy' },
      'economy transfer': { description: 'Transfer items between your own characters.', usage: '/economy transfer [parameters]', category: 'economy' },
      'inventory': { description: 'Manage your character inventory.', usage: '/inventory [subcommand] [parameters]', category: 'inventory' },
      'inventory view': { description: 'View your character inventory.', usage: '/inventory view [parameters]', category: 'inventory' },
      'inventory sync': { description: 'Sync your inventory from Google Sheets.', usage: '/inventory sync [parameters]', category: 'inventory' },
      'inventory test': { description: 'Test your inventory setup.', usage: '/inventory test [parameters]', category: 'inventory' },
      'gear': { description: 'Manage your character equipment and gear.', usage: '/gear [parameters]', category: 'inventory' },
      'item': { description: 'Use items for various purposes.', usage: '/item [parameters]', category: 'inventory' },
      'spiritorbs': { description: 'Manage Spirit Orbs.', usage: '/spiritorbs [subcommand] [parameters]', category: 'character' },
      'spiritorbs check': { description: 'Check how many Spirit Orbs your character has.', usage: '/spiritorbs check [parameters]', category: 'character' },
      'spiritorbs exchange': { description: 'Exchange Spirit Orbs for upgrades.', usage: '/spiritorbs exchange [parameters]', category: 'character' },
      'gather': { description: 'Gather resources from the environment.', usage: '/gather [parameters]', category: 'exploration' },
      'loot': { description: 'Search for loot in various locations.', usage: '/loot [parameters]', category: 'exploration' },
      'crafting': { description: 'Craft items using materials from your inventory.', usage: '/crafting [parameters]', category: 'jobs' },
      'heal': { description: 'Manage healing requests and fulfill healing services.', usage: '/heal [subcommand] [parameters]', category: 'jobs' },
      'heal request': { description: 'Request healing from a healer.', usage: '/heal request [parameters]', category: 'jobs' },
      'heal fulfill': { description: 'Fulfill a healing request as a healer.', usage: '/heal fulfill [parameters]', category: 'jobs' },
      'lookup': { description: 'Look up information about items and ingredients.', usage: '/lookup [parameters]', category: 'utility' },
      'tokens': { description: 'Manage your token balance and tracker.', usage: '/tokens [subcommand] [parameters]', category: 'economy' },
      'tokens check': { description: 'Check your current token balance.', usage: '/tokens check', category: 'economy' },
      'tokens setup': { description: 'Set up your token tracker.', usage: '/tokens setup [parameters]', category: 'economy' },
      'roll': { description: 'Roll dice for various purposes.', usage: '/roll [parameters]', category: 'utility' },
      'cancelvoucher': { description: 'Cancel a job voucher.', usage: '/cancelvoucher [parameters]', category: 'jobs' },
      'travel': { description: 'Travel between villages in Hyrule.', usage: '/travel [parameters]', category: 'exploration' },
      'quest': { description: 'Manage quests.', usage: '/quest [subcommand] [parameters]', category: 'quests' },
      'quest join': { description: 'Join a quest with your character.', usage: '/quest join [parameters]', category: 'quests' },
      'quest leave': { description: 'Leave a quest you are participating in.', usage: '/quest leave [parameters]', category: 'quests' },
      'quest create': { description: 'Create a new quest (Admin only).', usage: '/quest create [parameters]', category: 'quests' },
      'quest edit': { description: 'Edit an existing quest (Admin only).', usage: '/quest edit [parameters]', category: 'quests' },
      'quest delete': { description: 'Delete a quest (Admin only).', usage: '/quest delete [parameters]', category: 'quests' },
      'quest voucher': { description: 'Use a quest voucher.', usage: '/quest voucher [parameters]', category: 'quests' },
      'quest list': { description: 'List available quests.', usage: '/quest list [parameters]', category: 'quests' },
      'blight': { description: 'Manage blight progression, healing, and submissions.', usage: '/blight [subcommand] [parameters]', category: 'character' },
      'blight roll': { description: 'Roll for blight progression.', usage: '/blight roll [parameters]', category: 'character' },
      'blight heal': { description: 'Request blight healing from a Mod Character.', usage: '/blight heal [parameters]', category: 'character' },
      'blight submit': { description: 'Submit a completed task for blight healing.', usage: '/blight submit [parameters]', category: 'character' },
      'blight history': { description: 'View the blight history for a character.', usage: '/blight history [parameters]', category: 'character' },
      'blight roster': { description: 'View all currently blighted characters.', usage: '/blight roster [parameters]', category: 'character' },
      'specialweather': { description: 'Gather special items during special weather conditions.', usage: '/specialweather [parameters]', category: 'weather' },
      'explore': { description: 'Manage exploration parties and expeditions.', usage: '/explore [subcommand] [parameters]', category: 'exploration' },
      'explore setup': { description: 'Create a new exploration party.', usage: '/explore setup [parameters]', category: 'exploration' },
      'explore join': { description: 'Join an existing expedition party.', usage: '/explore join [parameters]', category: 'exploration' },
      'explore start': { description: 'Start the expedition.', usage: '/explore start [parameters]', category: 'exploration' },
      'explore roll': { description: 'Roll for random encounters during exploration.', usage: '/explore roll [parameters]', category: 'exploration' },
      'viewmap': { description: 'View the exploration map.', usage: '/viewmap [parameters]', category: 'exploration' }
    };
    const commandsArray = allCommandKeys.map(key => ({
      name: key,
      description: commandMeta[key]?.description || key,
      usage: commandMeta[key]?.usage || `/${key} [parameters]`,
      category: commandMeta[key]?.category || 'general'
    }));
    allCommands = commandsArray;
    filteredCommands = [...allCommands];
    displayCommands();
    updateStats();
    initializeFilters();
  } catch (err) {
    console.error('❌ Error loading commands:', err);
    const commandsContainer = document.getElementById('commands-container');
    if (commandsContainer) {
      showError('Failed to load commands', commandsContainer);
    }
  }
}

// ============================================================================
// ------------------- Commands Display -------------------
// Renders commands in the UI
// ============================================================================
function displayCommands() {
  const commandsContainer = document.getElementById('commands-container');
  if (!commandsContainer) {
    console.error('❌ Commands container not found');
    return;
  }

  // Ensure filteredCommands is an array
  if (!Array.isArray(filteredCommands)) {
    console.error('❌ filteredCommands is not an array:', filteredCommands);
    filteredCommands = [];
  }

  if (filteredCommands.length === 0) {
    commandsContainer.innerHTML = `
      <div class="no-commands">
        <i class="fas fa-search"></i>
        <p>No commands found matching your filters</p>
        <button class="clear-filters-btn" onclick="clearAllFilters()">
          <i class="fas fa-times"></i>
          Clear Filters
        </button>
      </div>
    `;
    return;
  }

  // Group commands by category
  const commandsByCategory = {};
  filteredCommands.forEach(command => {
    if (!commandsByCategory[command.category]) {
      commandsByCategory[command.category] = [];
    }
    commandsByCategory[command.category].push(command);
  });

  // Create HTML for each category
  let html = '';
  Object.keys(commandsByCategory).forEach(category => {
    const categoryCommands = commandsByCategory[category];
    
    // Capitalize category name
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    
    html += `
      <div class="category-section">
        <h2 class="category-header">
          <i class="${getCategoryIcon(category)}"></i>
          ${categoryName} Commands
          <span class="category-count">(${categoryCommands.length})</span>
        </h2>
        <div class="category-description">All ${category} commands</div>
        <div class="commands-grid">
    `;
    
    categoryCommands.forEach(command => {
      html += `
        <div class="command-card" data-command-name="${command.name}" onclick="window.showCommandDetails('${command.name}')">
          <div class="command-header">
            <h3 class="command-name">/${command.name}</h3>
            <span class="command-category">${category}</span>
          </div>
          <p class="command-description">${command.description}</p>
          <div class="command-usage">
            <strong>Usage:</strong> ${command.usage}
          </div>
          <div class="command-details-toggle">
            <i class="fas fa-info-circle"></i>
            <span>Click for details</span>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });

  commandsContainer.innerHTML = html;
}

// ============================================================================
// ------------------- Command Card Creation -------------------
// Creates HTML for individual command cards
// ============================================================================
function createCommandCard(command) {
  try {
    const categoryIcon = getCategoryIcon(command.category);
    const usageCount = command.usageCount || 0;
    
    return `
      <div class="command-card" data-category="${command.category}">
        <div class="command-header">
          <div class="command-icon">
            <i class="${categoryIcon}"></i>
          </div>
          <div class="command-info">
            <h3 class="command-name">/${command.name}</h3>
            <span class="command-category">${capitalizeFirstLetter(command.category)}</span>
          </div>
          <div class="command-usage-count">
            <span class="usage-number">${usageCount.toLocaleString()}</span>
            <span class="usage-label">uses</span>
          </div>
        </div>
        <div class="command-body">
          <p class="command-description">${command.description}</p>
          <div class="command-usage">
            <span class="usage-label">Usage:</span>
            <code class="usage-code">${command.usage}</code>
          </div>
        </div>
        <div class="command-footer">
          <div class="command-stats">
            <span class="command-stat-item">
              <i class="fas fa-clock"></i>
              <span>${command.cooldown || 'No cooldown'}</span>
            </span>
            <span class="command-stat-item">
              <i class="fas fa-user-shield"></i>
              <span>${command.permissions || 'Everyone'}</span>
            </span>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('❌ Error creating command card:', err);
    return '';
  }
}

// ============================================================================
// ------------------- Statistics Update -------------------
// Updates the commands overview statistics
// ============================================================================
function updateCommandsStats(commands) {
  try {
    const totalCommands = commands.length;
    const categories = [...new Set(commands.map(cmd => cmd.category))].length;
    const mostUsed = commands.reduce((max, cmd) => 
      (cmd.usageCount || 0) > (max.usageCount || 0) ? cmd : max, 
      { name: 'None', usageCount: 0 }
    );
    
    // Update DOM elements
    const totalElement = document.getElementById('total-commands');
    const categoriesElement = document.getElementById('command-categories');
    const mostUsedElement = document.getElementById('most-used-command');
    
    if (totalElement) totalElement.textContent = totalCommands.toLocaleString();
    if (categoriesElement) categoriesElement.textContent = categories;
    if (mostUsedElement) mostUsedElement.textContent = mostUsed.name;
      
  } catch (err) {
    console.error('❌ Error updating commands stats:', err);
  }
}

// ============================================================================
// ------------------- Utility Functions -------------------
// Helper functions for the commands page
// ============================================================================

function getCategoryIcon(category) {
  // Convert category to lowercase for consistent matching
  const categoryLower = category ? category.toLowerCase() : '';
  
  const iconMap = {
    character: 'fas fa-user',
    economy: 'fas fa-coins',
    inventory: 'fas fa-shopping-bag',
    exploration: 'fas fa-map',
    companions: 'fas fa-paw',
    jobs: 'fas fa-briefcase',
    utility: 'fas fa-tools',
    moderation: 'fas fa-shield-alt',
    admin: 'fas fa-crown',
    world: 'fas fa-globe',
    general: 'fas fa-terminal',
    weather: 'fas fa-cloud-sun',
    items: 'fas fa-box',
    monsters: 'fas fa-dragon',
    calendar: 'fas fa-calendar-alt',
    statistics: 'fas fa-chart-bar',
    guild: 'fas fa-users'
  };
  
  return iconMap[categoryLower] || 'fas fa-terminal';
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Show detailed command information
function showCommandDetails(commandName) {
  const command = allCommands.find(cmd => cmd.name === commandName);
  if (!command) return;

  // Create modal for command details
  const modal = document.createElement('div');
  modal.className = 'command-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>/${command.name}</h2>
        <button class="close-btn" onclick="window.closeCommandModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="command-info">
          <div class="info-section">
            <h3>Description</h3>
            <p>${command.description}</p>
          </div>
          
          <div class="info-section">
            <h3>How to Use</h3>
            <div class="usage-example">
              <code>${command.usage}</code>
            </div>
            ${getCommandUsageGuide(command.name)}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeCommandModal();
    }
  });
}

// Close command modal
function closeCommandModal() {
  const modal = document.querySelector('.command-modal');
  if (modal) {
    modal.remove();
  }
}

// Get command-specific usage guide
function getCommandUsageGuide(command) {
  const guides = {
    'character': `
      <p>Manage your characters including creation, editing, viewing, and deletion.</p>
      <p><strong>Subcommands:</strong></p>
      <ul>
        <li><code>create</code> - Create a new character (with village-specific subcommands)</li>
        <li><code>edit</code> - Edit an existing character</li>
        <li><code>view</code> - View character details</li>
        <li><code>viewlist</code> - View a list of characters</li>
        <li><code>delete</code> - Delete a character</li>
        <li><code>changejob</code> - Change character's job</li>
        <li><code>setbirthday</code> - Set character's birthday</li>
      </ul>
    `,
    'character create': `
      <p>Create a new character. Choose the appropriate village subcommand based on your character's home village.</p>
      <p><strong>Village Subcommands:</strong></p>
      <ul>
        <li><code>inariko</code> - Create character with Inariko exclusive job</li>
        <li><code>rudania</code> - Create character with Rudania exclusive job</li>
        <li><code>vhintl</code> - Create character with Vhintl exclusive job</li>
        <li><code>general</code> - Create character with general job</li>
      </ul>
    `,
    'character create inariko': `
      <p>Create a character with an Inariko exclusive job. All Inariko characters start in Inariko village.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>name</code> - The name of the character</li>
        <li><code>age</code> - Age of the character (must be a positive number)</li>
        <li><code>height</code> - Height of the character in cm (must be a positive number)</li>
        <li><code>hearts</code> - Number of hearts (must be a positive number)</li>
        <li><code>stamina</code> - Number of stamina (must be a positive number)</li>
        <li><code>pronouns</code> - Pronouns of the character</li>
        <li><code>race</code> - Race of the character</li>
        <li><code>job</code> - The job of the character (Inariko exclusive jobs only)</li>
        <li><code>inventory</code> - Google Sheets link for the inventory</li>
        <li><code>applink</code> - Application link for the character</li>
        <li><code>icon</code> - Upload an icon image of the character</li>
      </ul>
      <p><strong>Example:</strong> <code>/character create inariko name:Zelda age:23 height:165 hearts:8 stamina:120 pronouns:she/her race:Hylian job:Ranger inventory:https://docs.google.com/spreadsheets/d/example applink:https://example.com/application icon:https://example.com/icon.png</code></p>
    `,
    'character create rudania': `
      <p>Create a character with a Rudania exclusive job. All Rudania characters start in Rudania village.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>name</code> - The name of the character</li>
        <li><code>age</code> - Age of the character (must be a positive number)</li>
        <li><code>height</code> - Height of the character in cm (must be a positive number)</li>
        <li><code>hearts</code> - Number of hearts (must be a positive number)</li>
        <li><code>stamina</code> - Number of stamina (must be a positive number)</li>
        <li><code>pronouns</code> - Pronouns of the character</li>
        <li><code>race</code> - Race of the character</li>
        <li><code>job</code> - The job of the character (Rudania exclusive jobs only)</li>
        <li><code>inventory</code> - Google Sheets link for the inventory</li>
        <li><code>applink</code> - Application link for the character</li>
        <li><code>icon</code> - Upload an icon image of the character</li>
      </ul>
      <p><strong>Example:</strong> <code>/character create rudania name:Link age:25 height:170 hearts:10 stamina:100 pronouns:he/him race:Hylian job:Blacksmith inventory:https://docs.google.com/spreadsheets/d/example applink:https://example.com/application icon:https://example.com/icon.png</code></p>
    `,
    'character create vhintl': `
      <p>Create a character with a Vhintl exclusive job. All Vhintl characters start in Vhintl village.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>name</code> - The name of the character</li>
        <li><code>age</code> - Age of the character (must be a positive number)</li>
        <li><code>height</code> - Height of the character in cm (must be a positive number)</li>
        <li><code>hearts</code> - Number of hearts (must be a positive number)</li>
        <li><code>stamina</code> - Number of stamina (must be a positive number)</li>
        <li><code>pronouns</code> - Pronouns of the character</li>
        <li><code>race</code> - Race of the character</li>
        <li><code>job</code> - The job of the character (Vhintl exclusive jobs only)</li>
        <li><code>inventory</code> - Google Sheets link for the inventory</li>
        <li><code>applink</code> - Application link for the character</li>
        <li><code>icon</code> - Upload an icon image of the character</li>
      </ul>
      <p><strong>Example:</strong> <code>/character create vhintl name:Ganondorf age:30 height:185 hearts:12 stamina:90 pronouns:he/him race:Gerudo job:Merchant inventory:https://docs.google.com/spreadsheets/d/example applink:https://example.com/application icon:https://example.com/icon.png</code></p>
    `,
    'character create general': `
      <p>Create a character with a general job. You can choose any village as the home village.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>name</code> - The name of the character</li>
        <li><code>age</code> - Age of the character (must be a positive number)</li>
        <li><code>height</code> - Height of the character in cm (must be a positive number)</li>
        <li><code>hearts</code> - Number of hearts (must be a positive number)</li>
        <li><code>stamina</code> - Number of stamina (must be a positive number)</li>
        <li><code>pronouns</code> - Pronouns of the character</li>
        <li><code>race</code> - Race of the character</li>
        <li><code>village</code> - The home village of the character (Inariko, Rudania, or Vhintl)</li>
        <li><code>job</code> - The job of the character (general jobs only)</li>
        <li><code>inventory</code> - Google Sheets link for the inventory</li>
        <li><code>applink</code> - Application link for the character</li>
        <li><code>icon</code> - Upload an icon image of the character</li>
      </ul>
      <p><strong>Example:</strong> <code>/character create general name:Impa age:28 height:160 hearts:9 stamina:110 pronouns:she/her race:Sheikah village:Inariko job:Farmer inventory:https://docs.google.com/spreadsheets/d/example applink:https://example.com/application icon:https://example.com/icon.png</code></p>
    `,
    'character edit': `
      <p>Edit an existing character's information. You can modify various aspects of your character.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of the character to edit</li>
      </ul>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>age</code> - New age for the character</li>
        <li><code>height</code> - New height for the character</li>
        <li><code>hearts</code> - New number of hearts</li>
        <li><code>stamina</code> - New stamina value</li>
        <li><code>pronouns</code> - New pronouns</li>
        <li><code>race</code> - New race</li>
        <li><code>job</code> - New job</li>
        <li><code>inventory</code> - New Google Sheets link</li>
        <li><code>applink</code> - New application link</li>
        <li><code>icon</code> - New icon image</li>
      </ul>
      <p><strong>Example:</strong> <code>/character edit charactername:Link age:26 hearts:12</code></p>
    `,
    'character view': `
      <p>View detailed information about a specific character.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of the character to view</li>
      </ul>
      <p><strong>Example:</strong> <code>/character view charactername:Link</code></p>
    `,
    'character viewlist': `
      <p>View a list of all characters. You can filter by various criteria.</p>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>village</code> - Filter by village (Inariko, Rudania, Vhintl)</li>
        <li><code>job</code> - Filter by job</li>
        <li><code>race</code> - Filter by race</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/character viewlist</code></li>
        <li><code>/character viewlist village:Inariko</code></li>
        <li><code>/character viewlist job:Ranger</code></li>
      </ul>
    `,
    'character delete': `
      <p>Delete a character permanently. This action cannot be undone.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of the character to delete</li>
      </ul>
      <p><strong>Example:</strong> <code>/character delete charactername:Link</code></p>
      <p><strong>Warning:</strong> This action is permanent and cannot be undone.</p>
    `,
    'character changejob': `
      <p>Change a character's job to a new one.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of the character</li>
        <li><code>newjob</code> - The new job for the character</li>
      </ul>
      <p><strong>Example:</strong> <code>/character changejob charactername:Link newjob:Blacksmith</code></p>
    `,
    'character setbirthday': `
      <p>Set a character's birthday.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of the character</li>
        <li><code>birthday</code> - The birthday in MM/DD format</li>
      </ul>
      <p><strong>Example:</strong> <code>/character setbirthday charactername:Link birthday:12/25</code></p>
    `,
    'economy': `
      <p>Manage the economy system including gifts, shops, trades, and transfers between characters.</p>
      <p><strong>Subcommands:</strong></p>
      <ul>
        <li><code>gift</code> - Gift items from your character to another character</li>
        <li><code>shop-view</code> - View items available in the shop</li>
        <li><code>shop-buy</code> - Buy items from the shop</li>
        <li><code>shop-sell</code> - Sell items to the shop</li>
        <li><code>trade</code> - Trade items between two characters</li>
        <li><code>transfer</code> - Transfer items between your own characters</li>
      </ul>
    `,
    'economy gift': `
      <p>Gift items from your character to another character. You can gift up to 3 different items at once.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>fromcharacter</code> - The character gifting the items</li>
        <li><code>tocharacter</code> - The character receiving the gifts</li>
        <li><code>itema</code> - First item to be gifted</li>
        <li><code>quantitya</code> - Quantity of the first item</li>
      </ul>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>itemb</code> - Second item to be gifted</li>
        <li><code>quantityb</code> - Quantity of the second item</li>
        <li><code>itemc</code> - Third item to be gifted</li>
        <li><code>quantityc</code> - Quantity of the third item</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/economy gift fromcharacter:Link tocharacter:Zelda itema:Sword quantitya:1</code></li>
        <li><code>/economy gift fromcharacter:Akene tocharacter:Anierah itema:Moblin Spear quantitya:1 itemb:Shield quantityb:1</code></li>
      </ul>
    `,
    'economy shop-view': `
      <p>View all items available in the shop with their prices. The shop inventory varies by village and may change over time.</p>
      <p><strong>No Parameters Required</strong></p>
      <p><strong>Example:</strong> <code>/economy shop-view</code></p>
    `,
    'economy shop-buy': `
      <p>Buy items from the shop using your character's tokens. Shop inventory varies by village and may change over time.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
        <li><code>itemname</code> - The name of the item to buy</li>
        <li><code>quantity</code> - The quantity to buy</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/economy shop-buy charactername:Link itemname:Sword quantity:1</code></li>
        <li><code>/economy shop-buy charactername:Link itemname:Potion quantity:10</code></li>
      </ul>
    `,
    'economy shop-sell': `
      <p>Sell items to the shop for tokens. Shop prices may vary and some items may not be accepted.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
        <li><code>itemname</code> - The name of the item to sell</li>
        <li><code>quantity</code> - The quantity to sell</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/economy shop-sell charactername:Link itemname:Old Sword quantity:1</code></li>
        <li><code>/economy shop-sell charactername:Link itemname:Wood quantity:50</code></li>
      </ul>
    `,
    'economy trade': `
      <p>Trade items between two characters. This creates a trade session that both parties must confirm.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>fromcharacter</code> - Your character offering items</li>
        <li><code>tocharacter</code> - Character receiving the trade offer</li>
        <li><code>items</code> - Items you're offering (up to 3 different items)</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/economy trade fromcharacter:Link tocharacter:Zelda items:Sword,Shield</code></li>
        <li><code>/economy trade fromcharacter:Link tocharacter:Zelda items:Potion</code></li>
      </ul>
    `,
    'economy transfer': `
      <p>Transfer items between your own characters. This is instant and doesn't require confirmation.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>fromcharacter</code> - Character giving items</li>
        <li><code>tocharacter</code> - Character receiving items</li>
        <li><code>items</code> - Items to transfer (up to 3 different items)</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/economy transfer fromcharacter:Link tocharacter:Zelda items:Sword</code></li>
        <li><code>/economy transfer fromcharacter:Link tocharacter:Zelda items:Sword,Shield,Potion</code></li>
      </ul>
    `,
    'inventory': `
      <p>Manage your character's inventory system. View, sync, and test your inventory connection with Google Sheets.</p>
      <p><strong>Subcommands:</strong></p>
      <ul>
        <li><code>view</code> - View your character's inventory</li>
        <li><code>sync</code> - Sync your inventory from Google Sheets</li>
        <li><code>test</code> - Test if your inventory setup is correct</li>
      </ul>
    `,
    'inventory view': `
      <p>View your character's inventory with detailed item information, quantities, and categories. Supports pagination and filtering by item type.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of the character</li>
      </ul>
      <p><strong>Example:</strong> <code>/inventory view charactername:Link</code></p>
    `,
    'inventory sync': `
      <p>Sync your character's inventory from Google Sheets. This updates your in-game inventory to match your Google Sheets inventory.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - Character name</li>
      </ul>
      <p><strong>Example:</strong> <code>/inventory sync charactername:Link</code></p>
    `,
    'inventory test': `
      <p>Test if your inventory setup is correct. This checks your Google Sheets connection and validates your inventory format.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - Character name</li>
      </ul>
      <p><strong>Example:</strong> <code>/inventory test charactername:Link</code></p>
    `,
    'gear': `
      <p>Manage your character's equipment and gear. Equip and unequip items from different gear slots.</p>
      <p><strong>Gear Types:</strong></p>
      <ul>
        <li><code>Head</code> - Helmets, hats, etc.</li>
        <li><code>Chest</code> - Armor, shirts, etc.</li>
        <li><code>Legs</code> - Pants, boots, etc.</li>
        <li><code>Weapon</code> - Swords, bows, etc.</li>
        <li><code>Shield</code> - Shields and defensive items</li>
      </ul>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of the character</li>
        <li><code>type</code> - The type of gear to manage</li>
        <li><code>itemname</code> - The name of the item to equip (optional)</li>
        <li><code>status</code> - Choose to equip or unequip (optional)</li>
      </ul>
      <p><strong>Example:</strong> <code>/gear charactername:Link type:Weapon itemname:Sword status:equip</code></p>
    `,
    'item': `
      <p>Use items for various purposes including healing, stamina recovery, and special effects like Job Vouchers.</p>
      <p><strong>Special Items:</strong></p>
      <ul>
        <li><code>Job Voucher</code> - Assign temporary jobs to characters</li>
        <li><code>Healing Items</code> - Restore hearts and stamina</li>
        <li><code>Consumables</code> - Various buffs and effects</li>
      </ul>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
        <li><code>itemname</code> - The item to use</li>
        <li><code>quantity</code> - The number of items to use (optional, defaults to 1)</li>
        <li><code>jobname</code> - The job to perform using the voucher (optional)</li>
      </ul>
      <p><strong>Example:</strong> <code>/item charactername:Link itemname:Potion quantity:1</code></p>
    `,
    'spiritorbs': `
      <p>Manage Spirit Orbs - sacred items that can be exchanged for permanent stat upgrades.</p>
      <p><strong>Subcommands:</strong></p>
      <ul>
        <li><code>check</code> - Check how many Spirit Orbs your character has</li>
        <li><code>exchange</code> - Exchange 4 Spirit Orbs for +1 heart or stamina</li>
      </ul>
    `,
    'spiritorbs check': `
      <p>Check how many Spirit Orbs your character currently has in their inventory.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>character</code> - Your character name</li>
      </ul>
      <p><strong>Example:</strong> <code>/spiritorbs check character:Link</code></p>
    `,
    'spiritorbs exchange': `
      <p>Exchange 4 Spirit Orbs for a permanent +1 heart or stamina upgrade. This is a permanent stat increase.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>character</code> - Your character name</li>
        <li><code>type</code> - Choose to upgrade hearts or stamina</li>
      </ul>
      <p><strong>Example:</strong> <code>/spiritorbs exchange character:Link type:hearts</code></p>
    `,
    'gather': `
      <p>Gather resources from the environment. Different jobs have access to different gathering locations and resources.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
      </ul>
      <p><strong>Example:</strong> <code>/gather charactername:Link</code></p>
    `,
    'loot': `
      <p>Search for loot in various locations. Different jobs have access to different loot tables and locations.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
      </ul>
      <p><strong>Example:</strong> <code>/loot charactername:Link</code></p>
    `,
    'crafting': `
      <p>Craft items using materials from your inventory. Requires appropriate job skills and sufficient stamina.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
        <li><code>itemname</code> - The name of the item to craft</li>
        <li><code>quantity</code> - The number of items to craft</li>
      </ul>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>flavortext</code> - Optional flavor text for the crafted item</li>
      </ul>
      <p><strong>Example:</strong> <code>/crafting charactername:Link itemname:Sword quantity:1</code></p>
    `,
    'heal': `
      <p>Manage healing requests and fulfill healing services. Healers can offer their services and characters can request healing.</p>
      <p><strong>Subcommands:</strong></p>
      <ul>
        <li><code>request</code> - Request healing from a healer</li>
        <li><code>fulfill</code> - Fulfill a healing request (healers only)</li>
      </ul>
    `,
    'heal request': `
      <p>Request healing from a healer. This creates a healing request that healers can fulfill.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
        <li><code>hearts</code> - Number of hearts to heal</li>
        <li><code>payment</code> - Payment offered for healing</li>
      </ul>
      <p><strong>Example:</strong> <code>/heal request charactername:Link hearts:5 payment:100</code></p>
    `,
    'heal fulfill': `
      <p>Fulfill a healing request as a healer. This completes the healing service and transfers payment.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>requestid</code> - The ID of the healing request to fulfill</li>
        <li><code>healername</code> - The name of the healer fulfilling the request</li>
      </ul>
      <p><strong>Example:</strong> <code>/heal fulfill requestid:ABC123 healername:Zelda</code></p>
    `,
    'lookup': `
      <p>Look up information about items and ingredients in the game database.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>item</code> - The name of the item to look up</li>
      </ul>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>ingredient</code> - Specific ingredient to search for within the item</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/lookup item:Sword</code></li>
        <li><code>/lookup item:Potion ingredient:RedChuchuJelly</code></li>
      </ul>
    `,
    'tokens': `
      <p>Manage your token balance and token tracker setup. Tokens are earned through various activities and can be tracked in a Google Sheets document.</p>
      <p><strong>Subcommands:</strong></p>
      <ul>
        <li><code>check</code> - Check your current token balance</li>
        <li><code>setup</code> - Set up your token tracker with a Google Sheets link</li>
      </ul>
    `,
    'tokens check': `
      <p>Check your current token balance and view your token tracker information.</p>
      <p><strong>No Parameters Required</strong></p>
      <p><strong>Example:</strong> <code>/tokens check</code></p>
    `,
    'tokens setup': `
      <p>Set up your token tracker by linking a Google Sheets document. This allows you to track your token earnings and spending.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>link</code> - Google Sheets link for your token tracker</li>
      </ul>
      <p><strong>Example:</strong> <code>/tokens setup link:https://docs.google.com/spreadsheets/d/example</code></p>
    `,
    'roll': `
      <p>Roll dice for various purposes including combat, skill checks, and random events.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>dice</code> - Number of dice to roll</li>
        <li><code>sides</code> - Number of sides on each die</li>
      </ul>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>flavor</code> - Optional flavor text for the roll</li>
        <li><code>advantage</code> - Roll with advantage (roll twice, take higher)</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/roll dice:1 sides:20</code></li>
        <li><code>/roll dice:2 sides:6 flavor:Strength check</code></li>
        <li><code>/roll dice:1 sides:20 advantage:true</code></li>
      </ul>
    `,
    'cancelvoucher': `
      <p>Cancel a job voucher that has been assigned to a character. This removes the temporary job and returns the character to their original job.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of the character whose voucher to cancel</li>
      </ul>
      <p><strong>Example:</strong> <code>/cancelvoucher charactername:Link</code></p>
    `,
    'travel': `
      <p>Travel between villages in Hyrule. Travel takes time and may involve encounters along the way.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
        <li><code>destination</code> - The village to travel to</li>
        <li><code>mode</code> - Mode of travel (on foot)</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/travel charactername:Link destination:Inariko mode:on foot</code></li>
        <li><code>/travel charactername:Zelda destination:Rudania mode:on foot</code></li>
      </ul>
    `,
    'quest': `
      <p>Manage quests - smaller, optional, fun timed tasks for rewards!</p>
      <p><strong>Subcommands:</strong></p>
      <ul>
        <li><code>join</code> - Join a quest with your character</li>
        <li><code>leave</code> - Leave a quest you are participating in</li>
        <li><code>create</code> - Create a new quest (Admin only)</li>
        <li><code>edit</code> - Edit an existing quest (Admin only)</li>
        <li><code>delete</code> - Delete a quest (Admin only)</li>
        <li><code>voucher</code> - Use a quest voucher</li>
        <li><code>list</code> - List available quests</li>
      </ul>
    `,
    'quest join': `
      <p>Join a quest with your character to participate and earn rewards.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
        <li><code>questid</code> - The ID of the quest to join</li>
      </ul>
      <p><strong>Example:</strong> <code>/quest join charactername:Link questid:ABC123</code></p>
    `,
    'quest leave': `
      <p>Leave a quest you are currently participating in.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>questid</code> - The ID of the quest to leave</li>
      </ul>
      <p><strong>Example:</strong> <code>/quest leave questid:ABC123</code></p>
    `,
    'quest create': `
      <p>Create a new quest (Admin only). This creates a new timed task for players to complete.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>title</code> - The title of the quest</li>
        <li><code>description</code> - Description of the quest</li>
        <li><code>duration</code> - Duration in hours</li>
        <li><code>reward</code> - Reward for completing the quest</li>
      </ul>
      <p><strong>Example:</strong> <code>/quest create title:Gather Herbs description:Collect 10 herbs from the forest duration:24 reward:50 tokens</code></p>
    `,
    'quest edit': `
      <p>Edit an existing quest (Admin only).</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>questid</code> - The ID of the quest to edit</li>
      </ul>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>title</code> - New title for the quest</li>
        <li><code>description</code> - New description</li>
        <li><code>duration</code> - New duration in hours</li>
        <li><code>reward</code> - New reward</li>
      </ul>
      <p><strong>Example:</strong> <code>/quest edit questid:ABC123 title:Updated Quest Title</code></p>
    `,
    'quest delete': `
      <p>Delete a quest (Admin only). This removes the quest permanently.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>questid</code> - The ID of the quest to delete</li>
      </ul>
      <p><strong>Example:</strong> <code>/quest delete questid:ABC123</code></p>
      <p><strong>Warning:</strong> This action is permanent and cannot be undone.</p>
    `,
    'quest voucher': `
      <p>Use a quest voucher to create a custom quest.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
        <li><code>title</code> - The title of the quest</li>
        <li><code>description</code> - Description of the quest</li>
        <li><code>duration</code> - Duration in hours</li>
        <li><code>reward</code> - Reward for completing the quest</li>
      </ul>
      <p><strong>Example:</strong> <code>/quest voucher charactername:Link title:Custom Quest description:My custom quest duration:12 reward:25 tokens</code></p>
    `,
    'quest list': `
      <p>List all available quests that you can join.</p>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>status</code> - Filter by status (active, completed, expired)</li>
        <li><code>village</code> - Filter by village</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/quest list</code></li>
        <li><code>/quest list status:active</code></li>
        <li><code>/quest list village:Inariko</code></li>
      </ul>
    `,
    'blight': `
      <p>Manage blight progression, healing, and submissions. Blight is a serious condition that affects characters.</p>
      <p><strong>Subcommands:</strong></p>
      <ul>
        <li><code>roll</code> - Roll for blight progression</li>
        <li><code>heal</code> - Request blight healing from a Mod Character</li>
        <li><code>submit</code> - Submit a completed task for blight healing</li>
        <li><code>history</code> - View blight history for a character</li>
        <li><code>roster</code> - View all currently blighted characters</li>
      </ul>
    `,
    'blight roll': `
      <p>Roll for blight progression for a specific character. This determines if the blight gets worse.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>character_name</code> - The name of the character to roll for</li>
      </ul>
      <p><strong>Example:</strong> <code>/blight roll character_name:Link</code></p>
    `,
    'blight heal': `
      <p>Request blight healing from a Mod Character. This creates a healing request.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>character_name</code> - The name of the character to heal</li>
        <li><code>healer_name</code> - The healer performing the healing</li>
      </ul>
      <p><strong>Example:</strong> <code>/blight heal character_name:Link healer_name:Aemu</code></p>
    `,
    'blight submit': `
      <p>Submit a completed task for healing a character from blight.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>submission_id</code> - The submission ID received when the task was assigned</li>
      </ul>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>item</code> - The item you are offering for healing</li>
        <li><code>link</code> - Link to your writing or art submission</li>
        <li><code>tokens</code> - Forfeit all tokens in exchange for healing</li>
      </ul>
      <p><strong>Example:</strong> <code>/blight submit submission_id:ABC123</code></p>
    `,
    'blight history': `
      <p>View the blight history for a character.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>character_name</code> - The name of the character to view history for</li>
      </ul>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>limit</code> - Number of history entries to show (default: 10)</li>
      </ul>
      <p><strong>Example:</strong> <code>/blight history character_name:Link limit:5</code></p>
    `,
    'blight roster': `
      <p>View a list of all currently blighted characters.</p>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>show_expired</code> - Include expired healing requests (default: false)</li>
      </ul>
      <p><strong>Example:</strong> <code>/blight roster show_expired:true</code></p>
    `,
    'specialweather': `
      <p>Gather special items during special weather conditions. This command can only be used when there is special weather in your current village.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>charactername</code> - The name of your character</li>
      </ul>
      <p><strong>Example:</strong> <code>/specialweather charactername:Link</code></p>
      <p><strong>Note:</strong> This command can only be used once per day per village during special weather events.</p>
    `,
    'explore': `
      <p>Manage exploration parties and expeditions in different regions of Hyrule. Form parties of up to 4 characters to explore dangerous areas.</p>
      <p><strong>Subcommands:</strong></p>
      <ul>
        <li><code>setup</code> - Create a new exploration party</li>
        <li><code>join</code> - Join an existing expedition party</li>
        <li><code>start</code> - Start the expedition (leader only)</li>
        <li><code>roll</code> - Roll for random encounters during exploration</li>
      </ul>
    `,
    'explore setup': `
      <p>Create a new exploration party for a specific region. You become the leader of the expedition.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>region</code> - The region to explore (Eldin, Lanayru, etc.)</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/explore setup region:Eldin</code></li>
        <li><code>/explore setup region:Lanayru</code></li>
      </ul>
    `,
    'explore join': `
      <p>Join an existing expedition party. You can bring items to help with exploration.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>partyid</code> - The party ID to join</li>
        <li><code>charactername</code> - Your character's name</li>
        <li><code>items</code> - Items to bring (optional, up to 3 items)</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/explore join partyid:ABC123 charactername:Link items:Potion,Shield,Wood</code></li>
        <li><code>/explore join partyid:XYZ789 charactername:Zelda items:StaminaPotion,Bread,Water</code></li>
      </ul>
    `,
    'explore start': `
      <p>Start an expedition that has been set up. Only the party leader can start the expedition.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>partyid</code> - The party ID to start</li>
      </ul>
      <p><strong>Example:</strong> <code>/explore start partyid:ABC123</code></p>
    `,
    'explore roll': `
      <p>Roll for random encounters during an active expedition. This generates events and encounters for the party.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>partyid</code> - The party ID to roll for</li>
        <li><code>charactername</code> - The character making the roll</li>
      </ul>
      <p><strong>Example:</strong> <code>/explore roll partyid:ABC123 charactername:Link</code></p>
    `,
    'viewmap': `
      <p>View the exploration map to see discovered areas and plan expeditions.</p>
      <p><strong>Required Parameters:</strong></p>
      <ul>
        <li><code>square</code> - The map square to view (e.g., A1, B2)</li>
      </ul>
      <p><strong>Optional Parameters:</strong></p>
      <ul>
        <li><code>quadrant</code> - Specific quadrant within the square (Q1, Q2, Q3, Q4)</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/viewmap square:A1</code></li>
        <li><code>/viewmap square:A1 quadrant:Q2</code></li>
      </ul>
    `
  };

  return guides[command] || '';
}

// ============================================================================
// ------------------- Filter Functions -------------------
// Handles command filtering and search functionality
// ============================================================================

// Initialize filter controls
function initializeFilters() {
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce(filterCommands, 300));
  } else {
    console.error('❌ Search input not found');
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterCommands);
  } else {
    console.error('❌ Category filter not found');
  }
  
  // Add clear filters button if it doesn't exist
  addClearFiltersButton();
}

// Debounce function to improve performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Add clear filters button
function addClearFiltersButton() {
  const filterControls = document.querySelector('.filter-controls');
  if (!filterControls) return;
  
  // Check if clear button already exists
  if (document.getElementById('clear-command-filters')) return;
  
  const clearButton = document.createElement('button');
  clearButton.id = 'clear-command-filters';
  clearButton.className = 'clear-filters-btn';
  clearButton.innerHTML = '<i class="fas fa-times"></i> Clear';
  clearButton.onclick = clearAllFilters;
  
  filterControls.appendChild(clearButton);
}

// Clear all filters
function clearAllFilters() {
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  
  if (searchInput) {
    searchInput.value = '';
  }
  
  if (categoryFilter) {
    categoryFilter.value = 'all';
  }
  
  filteredCommands = [...allCommands];
  displayCommands();
  updateStats();
  
}

// Filter commands by category
function filterByCategory(category) {
  
  if (category === 'all') {
    filteredCommands = [...allCommands];
  } else {
    filteredCommands = allCommands.filter(command => command.category === category);
  }
  
  displayCommands();
  updateStats();
}

// Filter commands by search term and category
function filterCommands() {
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  
  if (!searchInput || !categoryFilter) {
    console.error('❌ Filter elements not found');
    return;
  }
  
  // Ensure allCommands is an array
  if (!Array.isArray(allCommands)) {
    console.error('❌ allCommands is not an array:', allCommands);
    allCommands = [];
  }
  
  const searchTerm = searchInput.value.toLowerCase().trim();
  const categoryFilterValue = categoryFilter.value;
  
  
  filteredCommands = allCommands.filter(command => {
    const matchesSearch = searchTerm === '' || 
                         command.name.toLowerCase().includes(searchTerm) ||
                         command.description.toLowerCase().includes(searchTerm) ||
                         command.usage.toLowerCase().includes(searchTerm);
    
    const matchesCategory = categoryFilterValue === 'all' || 
                           (command.category && command.category.toLowerCase() === categoryFilterValue.toLowerCase());
    
    return matchesSearch && matchesCategory;
  });
  
  displayCommands();
  updateStats();
  
  // Show/hide clear filters button based on active filters
  updateClearFiltersButton();
}

// Update clear filters button visibility
function updateClearFiltersButton() {
  const clearButton = document.getElementById('clear-command-filters');
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  
  if (!clearButton) return;
  
  const hasActiveFilters = (searchInput && searchInput.value.trim() !== '') ||
                          (categoryFilter && categoryFilter.value !== 'all');
  
  clearButton.style.display = hasActiveFilters ? 'inline-flex' : 'none';
}

// Update statistics
function updateStats() {
  // Ensure filteredCommands is an array
  if (!Array.isArray(filteredCommands)) {
    console.error('❌ filteredCommands is not an array in updateStats:', filteredCommands);
    filteredCommands = [];
  }
  
  const totalCommands = document.getElementById('total-commands');
  const categoryCount = document.getElementById('category-count');
  
  if (totalCommands) {
    totalCommands.textContent = filteredCommands.length.toLocaleString();
  }
  
  if (categoryCount) {
    const categories = new Set(filteredCommands.map(cmd => cmd.category));
    categoryCount.textContent = categories.size;
  }
  
  // Update results info
  updateResultsInfo();
}

// Update results information
function updateResultsInfo() {
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  
  if (!searchInput || !categoryFilter) return;
  
  const searchTerm = searchInput.value.trim();
  const categoryFilterValue = categoryFilter.value;
  const hasFilters = searchTerm !== '' || categoryFilterValue !== 'all';
  
  // Add or update results info
  let resultsInfo = document.querySelector('.commands-results-info');
  if (!resultsInfo) {
    resultsInfo = document.createElement('div');
    resultsInfo.className = 'commands-results-info';
    const commandsContainer = document.getElementById('commands-container');
    if (commandsContainer) {
      commandsContainer.insertBefore(resultsInfo, commandsContainer.firstChild);
    }
  }
  
  if (hasFilters) {
    const filterText = [];
    if (searchTerm) filterText.push(`"${searchTerm}"`);
    if (categoryFilterValue !== 'all') filterText.push(categoryFilterValue);
    
    resultsInfo.innerHTML = `
      <p>
        <i class="fas fa-filter"></i>
        Showing ${filteredCommands.length} of ${allCommands.length} commands
        ${filterText.length > 0 ? `filtered by ${filterText.join(' and ')}` : ''}
      </p>
    `;
    resultsInfo.style.display = 'block';
  } else {
    resultsInfo.style.display = 'none';
  }
}

// Initialize commands page
function initCommands() {
  loadCommands();
}

// Make functions globally accessible
window.showCommandDetails = showCommandDetails;
window.closeCommandModal = closeCommandModal;
window.clearAllFilters = clearAllFilters;
window.filterCommands = filterCommands;

// Export for use in other modules
window.commandsModule = {
  initCommands,
  loadCommands,
  filterCommands,
  filterByCategory,
  showCommandDetails,
  closeCommandModal,
  clearAllFilters
};