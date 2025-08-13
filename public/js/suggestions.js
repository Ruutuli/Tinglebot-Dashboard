// Suggestion Box Module
const suggestionsModule = (function() {
  'use strict';

  // DOM elements
  let suggestionForm;
  let charCount;
  let suggestionSuccess;
  let suggestionError;

  // Initialize the module
  function init() {
    bindElements();
    bindEvents();
    updateCharCount();
  }

  // Bind DOM elements
  function bindElements() {
    suggestionForm = document.getElementById('suggestion-form');
    charCount = document.getElementById('char-count');
    suggestionSuccess = document.getElementById('suggestion-success');
    suggestionError = document.getElementById('suggestion-error');
  }

  // Bind event listeners
  function bindEvents() {
    if (suggestionForm) {
      suggestionForm.addEventListener('submit', handleSubmit);
      suggestionForm.addEventListener('reset', handleReset);
      
      // Character count for description
      const descriptionField = document.getElementById('suggestion-description');
      if (descriptionField) {
        descriptionField.addEventListener('input', updateCharCount);
      }
    }
  }

  // Handle form submission
  async function handleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(suggestionForm);
    const suggestionData = {
      category: formData.get('category'),
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      timestamp: new Date().toISOString(),
      userId: getCurrentUserId() // Will be null for anonymous submissions
    };

    // Show loading state
    const submitBtn = suggestionForm.querySelector('.submit-suggestion-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    try {
      // Submit suggestion (this would connect to your backend)
      await submitSuggestion(suggestionData);
      
      // Show success message
      showSuccess();
      
      // Reset form
      suggestionForm.reset();
      updateCharCount();
      
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      showError();
    } finally {
      // Restore button state
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  // Handle form reset
  function handleReset() {
    updateCharCount();
    hideMessages();
  }

  // Update character count
  function updateCharCount() {
    if (charCount) {
      const descriptionField = document.getElementById('suggestion-description');
      if (descriptionField) {
        const currentLength = descriptionField.value.length;
        charCount.textContent = currentLength;
        
        // Add visual feedback for character limit
        if (currentLength > 900) {
          charCount.style.color = '#e74c3c';
        } else if (currentLength > 800) {
          charCount.style.color = '#f39c12';
        } else {
          charCount.style.color = '#7f8c8d';
        }
      }
    }
  }

  // Submit suggestion to backend
  async function submitSuggestion(suggestionData) {
    try {
      // Make actual API call to server
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(suggestionData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      throw error;
    }
  }

  // Get current user ID (if logged in)
  function getCurrentUserId() {
    // This would get the current user's ID from your auth system
    // For anonymous submissions, return null
    try {
      // Check if user is logged in (you'll need to implement this based on your auth system)
      const user = JSON.parse(localStorage.getItem('user'));
      return user ? user.id : null;
    } catch (error) {
      return null;
    }
  }

  // Show success message
  function showSuccess() {
    hideMessages();
    if (suggestionSuccess) {
      suggestionSuccess.style.display = 'block';
      suggestionSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        hideMessages();
      }, 5000);
    }
  }

  // Show error message
  function showError() {
    hideMessages();
    if (suggestionError) {
      suggestionError.style.display = 'block';
      suggestionError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        hideMessages();
      }, 5000);
    }
  }

  // Hide all messages
  function hideMessages() {
    if (suggestionSuccess) suggestionSuccess.style.display = 'none';
    if (suggestionError) suggestionError.style.display = 'none';
  }

  // Public API
  return {
    init: init,
    handleSubmit: handleSubmit,
    handleReset: handleReset,
    updateCharCount: updateCharCount
  };
})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  suggestionsModule.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = suggestionsModule;
}
