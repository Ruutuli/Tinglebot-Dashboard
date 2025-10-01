/* ============================================================================ */
/* Settings Management Module */
/* ============================================================================ */

class SettingsManager {
  constructor() {
    this.settings = this.getDefaultSettings();
    this.init();
  }

  // Default settings configuration
  getDefaultSettings() {
    return {
      // Theme & Appearance
      theme: 'dark',
      fontSize: 'medium',
      highContrast: false,
      
      // Performance & Animation
      imageQuality: 'medium',
      animationSpeed: 'normal',
      
      // Data Display
      dateFormat: 'MM/DD/YYYY',
      timezone: 'auto',
      currencyFormat: 'USD',
      numberFormat: 'comma',
      
      // List Preferences
      itemsPerPage: 24,
      defaultSort: 'date-desc',
      
      // Notifications
      bloodMoonAlerts: false,
      dailyResetReminders: false,
      weatherNotifications: false,
      characterWeekUpdates: false,
      
      // Privacy & Security
      activityLogging: true,
      dataRetention: 90,
      profileVisibility: 'friends'
    };
  }

  // Initialize settings manager
  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.applySettings();
    
    // Ensure dark mode is applied on first load
    if (!localStorage.getItem('tinglebot-settings')) {
      this.applyTheme('dark');
    }
  }

  // Load settings from server (or fallback to localStorage)
  async loadSettings() {
    try {
      // Try to load settings from server if user is authenticated
      const loadedFromServer = await this.loadSettingsFromServer();
      
      // If not loaded from server, fall back to localStorage
      if (!loadedFromServer) {
      const savedSettings = localStorage.getItem('tinglebot-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        this.settings = { ...this.settings, ...parsedSettings };
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Load all settings from server
  async loadSettingsFromServer() {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          // Update all settings with server values
          this.settings = { ...this.settings, ...data.settings };
          
          console.log('[settings.js]: ✅ Loaded all settings from server');
          return true;
        }
      } else if (response.status === 401) {
        console.log('[settings.js]: User not authenticated, using default settings');
        return false;
      } else {
        console.warn('[settings.js]: Failed to load settings from server');
        return false;
      }
    } catch (error) {
      console.error('[settings.js]: Error loading settings from server:', error);
      return false;
    }
  }

  // Save settings to server (and localStorage as backup)
  async saveSettings(isNotificationToggle = false) {
    try {
      // Save all settings to server
      const savedToServer = await this.saveSettingsToServer();
      
      if (savedToServer) {
        if (isNotificationToggle) {
          this.showNotification('Notification settings saved! Check your Discord DMs for confirmation.', 'success');
        } else {
          this.showNotification('Settings saved successfully!', 'success');
        }
      } else {
        // Fallback to localStorage if not authenticated
      localStorage.setItem('tinglebot-settings', JSON.stringify(this.settings));
        if (isNotificationToggle) {
          this.showNotification('Please log in to enable Discord notifications.', 'warning');
        } else {
          this.showNotification('Settings saved locally. Log in to sync across devices.', 'info');
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Error saving settings', 'error');
    }
  }

  // Save all settings to server
  async saveSettingsToServer() {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ settings: this.settings })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[settings.js]: ✅ Saved all settings to server');
        
        // Also save to localStorage as backup
        localStorage.setItem('tinglebot-settings', JSON.stringify(this.settings));
        return true;
      } else if (response.status === 401) {
        console.warn('[settings.js]: User not authenticated, settings not saved to server');
        return false;
      } else {
        throw new Error('Failed to save settings to server');
      }
    } catch (error) {
      console.error('[settings.js]: Error saving settings to server:', error);
      return false;
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Save settings button
    const saveBtn = document.getElementById('save-settings');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    // Reset settings button
    const resetBtn = document.getElementById('reset-settings');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSettings());
    }

    // Export settings button
    const exportBtn = document.getElementById('export-settings');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportSettings());
    }

    // Import settings button
    const importBtn = document.getElementById('import-settings');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importSettings());
    }

    // Data export buttons
    this.setupDataExportButtons();

    // Settings change listeners
    this.setupSettingsChangeListeners();

    // Theme preview cards
    this.setupThemePreviewCards();
  }

  // Setup data export buttons
  setupDataExportButtons() {
    const exportButtons = {
      'export-characters': () => this.exportCharacterData(),
      'export-inventory': () => this.exportInventoryData(),
      'export-relationships': () => this.exportRelationshipData(),
      'export-all-data': () => this.exportAllData()
    };

    Object.entries(exportButtons).forEach(([id, handler]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', handler);
      }
    });
  }

  // Setup settings change listeners
  setupSettingsChangeListeners() {
    const settingsInputs = [
      'theme-select', 'font-size', 'high-contrast',
      'image-quality', 'animation-speed',
      'date-format', 'timezone', 'currency-format', 'number-format',
      'items-per-page', 'default-sort',
      'blood-moon-alerts', 'daily-reset-reminders', 'weather-notifications', 'character-week-updates',
      'activity-logging', 'data-retention', 'profile-visibility'
    ];

    settingsInputs.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', (e) => this.handleSettingChange(e));
      }
    });
  }

  // Setup theme preview cards
  setupThemePreviewCards() {
    const previewCards = document.querySelectorAll('.theme-preview-card');
    previewCards.forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.getAttribute('data-theme');
        this.previewTheme(theme);
      });
    });
  }

  // Preview theme (temporary application)
  previewTheme(theme) {
    // Update the theme select dropdown
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = theme;
    }

    // Apply the theme temporarily
    this.applyTheme(theme);

    // Update active preview card
    this.updateActivePreviewCard(theme);

    // Show preview notification
    this.showNotification(`Previewing ${theme} theme`, 'info');
  }

  // Update active preview card
  updateActivePreviewCard(activeTheme) {
    const previewCards = document.querySelectorAll('.theme-preview-card');
    previewCards.forEach(card => {
      const cardTheme = card.getAttribute('data-theme');
      if (cardTheme === activeTheme) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  // Handle individual setting changes
  handleSettingChange(event) {
    const { id, type, checked, value } = event.target;
    
    let settingValue = type === 'checkbox' ? checked : value;
    
    // Convert string numbers to actual numbers
    if (['items-per-page', 'data-retention'].includes(id)) {
      settingValue = parseInt(settingValue) || settingValue;
    }

    // Update setting
    const settingKey = this.getElementSettingKey(id);
    if (settingKey) {
      this.settings[settingKey] = settingValue;
      this.applySetting(settingKey, settingValue);
      
      // Auto-save notification settings immediately to trigger DM
      const notificationSettings = ['bloodMoonAlerts', 'dailyResetReminders', 'weatherNotifications', 'characterWeekUpdates'];
      if (notificationSettings.includes(settingKey)) {
        console.log(`[settings.js]: Auto-saving notification setting: ${settingKey} = ${settingValue}`);
        // Only show DM confirmation message if turning ON
        this.saveSettings(settingValue === true);
      }
    }
  }

  // Map element IDs to setting keys
  getElementSettingKey(elementId) {
    const mapping = {
      'theme-select': 'theme',
      'font-size': 'fontSize',
      'high-contrast': 'highContrast',
      'image-quality': 'imageQuality',
      'animation-speed': 'animationSpeed',
      'date-format': 'dateFormat',
      'timezone': 'timezone',
      'currency-format': 'currencyFormat',
      'number-format': 'numberFormat',
      'items-per-page': 'itemsPerPage',
      'default-sort': 'defaultSort',
      'blood-moon-alerts': 'bloodMoonAlerts',
      'daily-reset-reminders': 'dailyResetReminders',
      'weather-notifications': 'weatherNotifications',
      'character-week-updates': 'characterWeekUpdates',
      'activity-logging': 'activityLogging',
      'data-retention': 'dataRetention',
      'profile-visibility': 'profileVisibility'
    };
    return mapping[elementId];
  }

  // Apply all settings
  applySettings() {
    Object.entries(this.settings).forEach(([key, value]) => {
      this.applySetting(key, value);
    });
    this.updateUI();
  }

  // Apply individual setting
  applySetting(key, value) {
    switch (key) {
      case 'theme':
        this.applyTheme(value);
        break;
      case 'fontSize':
        this.applyFontSize(value);
        break;
      case 'highContrast':
        this.applyHighContrast(value);
        break;
      case 'animationSpeed':
        this.applyAnimationSpeed(value);
        break;
      case 'imageQuality':
        this.applyImageQuality(value);
        break;
      // Add more cases as needed
    }
  }

  // Apply theme setting
  applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }

  // Apply font size setting
  applyFontSize(size) {
    document.documentElement.setAttribute('data-font-size', size);
  }

  // Apply high contrast setting
  applyHighContrast(enabled) {
    document.documentElement.setAttribute('data-contrast', enabled ? 'high' : 'normal');
  }

  // Apply animation speed setting
  applyAnimationSpeed(speed) {
    document.documentElement.setAttribute('data-animation-speed', speed);
  }

  // Apply image quality setting
  applyImageQuality(quality) {
    // This would affect how images are loaded/displayed
    // Implementation depends on your image loading system
    console.log('Image quality set to:', quality);
  }

  // Update UI with current settings
  updateUI() {
    Object.entries(this.settings).forEach(([key, value]) => {
      const elementId = this.getSettingElementId(key);
      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = value;
          } else {
            element.value = value;
          }
        }
      }
    });

    // Update active preview card
    this.updateActivePreviewCard(this.settings.theme);
  }

  // Map setting keys to element IDs
  getSettingElementId(settingKey) {
    const mapping = {
      'theme': 'theme-select',
      'fontSize': 'font-size',
      'highContrast': 'high-contrast',
      'imageQuality': 'image-quality',
      'animationSpeed': 'animation-speed',
      'dateFormat': 'date-format',
      'timezone': 'timezone',
      'currencyFormat': 'currency-format',
      'numberFormat': 'number-format',
      'itemsPerPage': 'items-per-page',
      'defaultSort': 'default-sort',
      'bloodMoonAlerts': 'blood-moon-alerts',
      'dailyResetReminders': 'daily-reset-reminders',
      'weatherNotifications': 'weather-notifications',
      'characterWeekUpdates': 'character-week-updates',
      'activityLogging': 'activity-logging',
      'dataRetention': 'data-retention',
      'profileVisibility': 'profile-visibility'
    };
    return mapping[settingKey];
  }

  // Reset settings to defaults
  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to their default values?')) {
      this.settings = this.getDefaultSettings();
      this.applySettings();
      this.updateUI();
      this.showNotification('Settings reset to defaults', 'success');
    }
  }

  // Export settings to file
  exportSettings() {
    try {
      const settingsData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: this.settings
      };

      const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tinglebot-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Settings exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting settings:', error);
      this.showNotification('Error exporting settings', 'error');
    }
  }

  // Import settings from file
  importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (data.settings) {
              this.settings = { ...this.settings, ...data.settings };
              this.applySettings();
              this.updateUI();
              this.showNotification('Settings imported successfully!', 'success');
            } else {
              throw new Error('Invalid settings file format');
            }
          } catch (error) {
            console.error('Error importing settings:', error);
            this.showNotification('Error importing settings: Invalid file format', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  // Export character data
  async exportCharacterData() {
    try {
      this.setButtonLoading('export-characters', true);
      const response = await fetch('/api/characters/export');
      if (response.ok) {
        const data = await response.json();
        this.downloadData(data, 'characters', 'json');
        this.showNotification('Character data exported successfully!', 'success');
      } else {
        throw new Error('Failed to export character data');
      }
    } catch (error) {
      console.error('Error exporting character data:', error);
      this.showNotification('Error exporting character data', 'error');
    } finally {
      this.setButtonLoading('export-characters', false);
    }
  }

  // Export inventory data
  async exportInventoryData() {
    try {
      this.setButtonLoading('export-inventory', true);
      const response = await fetch('/api/inventory/export');
      if (response.ok) {
        const data = await response.json();
        this.downloadData(data, 'inventory', 'json');
        this.showNotification('Inventory data exported successfully!', 'success');
      } else {
        throw new Error('Failed to export inventory data');
      }
    } catch (error) {
      console.error('Error exporting inventory data:', error);
      this.showNotification('Error exporting inventory data', 'error');
    } finally {
      this.setButtonLoading('export-inventory', false);
    }
  }

  // Export relationship data
  async exportRelationshipData() {
    try {
      this.setButtonLoading('export-relationships', true);
      const response = await fetch('/api/relationships/export');
      if (response.ok) {
        const data = await response.json();
        this.downloadData(data, 'relationships', 'json');
        this.showNotification('Relationship data exported successfully!', 'success');
      } else {
        throw new Error('Failed to export relationship data');
      }
    } catch (error) {
      console.error('Error exporting relationship data:', error);
      this.showNotification('Error exporting relationship data', 'error');
    } finally {
      this.setButtonLoading('export-relationships', false);
    }
  }

  // Export all data
  async exportAllData() {
    try {
      this.setButtonLoading('export-all-data', true);
      const [characters, inventory, relationships] = await Promise.all([
        fetch('/api/characters/export').then(r => r.ok ? r.json() : null),
        fetch('/api/inventory/export').then(r => r.ok ? r.json() : null),
        fetch('/api/relationships/export').then(r => r.ok ? r.json() : null)
      ]);

      const allData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        characters,
        inventory,
        relationships,
        settings: this.settings
      };

      this.downloadData(allData, 'tinglebot-complete-data', 'json');
      this.showNotification('All data exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting all data:', error);
      this.showNotification('Error exporting all data', 'error');
    } finally {
      this.setButtonLoading('export-all-data', false);
    }
  }

  // Download data as file
  downloadData(data, filename, format) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: format === 'json' ? 'application/json' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Set button loading state
  setButtonLoading(buttonId, loading) {
    const button = document.getElementById(buttonId);
    if (button) {
      if (loading) {
        button.classList.add('loading');
        button.disabled = true;
      } else {
        button.classList.remove('loading');
        button.disabled = false;
      }
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `settings-notification ${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      animation: slideIn 0.3s ease;
    `;

    // Add animation keyframes
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Get current settings
  getSettings() {
    return { ...this.settings };
  }

  // Update a specific setting
  updateSetting(key, value) {
    this.settings[key] = value;
    this.applySetting(key, value);
  }
}

// Initialize settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  window.settingsManager = new SettingsManager();
  await window.settingsManager.init();
});

// Export for use in other modules
export default SettingsManager;
