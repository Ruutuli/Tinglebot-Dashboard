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
    
    console.log('DOM elements bound:');
    console.log('- suggestionForm:', suggestionForm);
    console.log('- charCount:', charCount);
    console.log('- suggestionSuccess:', suggestionSuccess);
    console.log('- suggestionError:', suggestionError);
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
    
    // Bind modal close button
    if (suggestionSuccess) {
      const closeBtn = suggestionSuccess.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', hideMessages);
      }
    }
    
    // Close modal when clicking outside
    if (suggestionSuccess) {
      suggestionSuccess.addEventListener('click', function(event) {
        if (event.target === suggestionSuccess) {
          hideMessages();
        }
      });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && suggestionSuccess && suggestionSuccess.style.display === 'block') {
        hideMessages();
      }
    });
  }

  // Handle form submission
  async function handleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(suggestionForm);
    const suggestionData = {
      category: formData.get('category'),
      title: formData.get('title'),
      description: formData.get('description'),
      timestamp: new Date().toISOString(),
      userId: getCurrentUserId() // Will be null for anonymous submissions
    };

    // Show loading state
    const submitBtn = suggestionForm.querySelector('.submit-suggestion-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

        try {
      console.log('Submitting suggestion:', suggestionData);
      
      // Submit suggestion (this would connect to your backend)
      const result = await submitSuggestion(suggestionData);
      console.log('Suggestion submitted successfully:', result);
      
      // Show success message
      showSuccess('Submitted and posted to Discord!');
      console.log('Success message should be displayed');
      
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
  function showSuccess(message = 'Thank You!') {
    console.log('showSuccess called with message:', message);
    console.log('suggestionSuccess element:', suggestionSuccess);
    
    hideMessages();
    if (suggestionSuccess) {
      console.log('Success element found, updating content...');
      
      // Update the success message text
      const successTitle = suggestionSuccess.querySelector('h3');
      const successText = suggestionSuccess.querySelector('p');
      
      console.log('Title element:', successTitle);
      console.log('Text element:', successText);
      
      if (successTitle) {
        successTitle.textContent = message;
        console.log('Title updated to:', message);
      }
      if (successText) {
        successText.textContent = 'Your suggestion has been submitted successfully and posted to Discord! We\'ll review it and respond in the server.';
        console.log('Text updated');
      }
      
      // Show modal using CSS class
      suggestionSuccess.classList.add('show');
      
      // Force modal to be visible with inline styles as backup
      suggestionSuccess.style.position = 'fixed';
      suggestionSuccess.style.top = '0';
      suggestionSuccess.style.left = '0';
      suggestionSuccess.style.width = '100vw';
      suggestionSuccess.style.height = '100vh';
      suggestionSuccess.style.zIndex = '99999';
      suggestionSuccess.style.background = 'rgba(255, 0, 0, 0.9)';
      suggestionSuccess.style.display = 'flex';
      suggestionSuccess.style.alignItems = 'center';
      suggestionSuccess.style.justifyContent = 'center';
      
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      
      // Temporary alert to confirm modal is triggered
      alert('MODAL SHOULD BE VISIBLE NOW! Look for a bright red overlay covering the entire screen.');
      
      console.log('Modal displayed with show class and inline styles');
      console.log('Modal classes:', suggestionSuccess.className);
      console.log('Modal inline styles:', {
        position: suggestionSuccess.style.position,
        top: suggestionSuccess.style.top,
        left: suggestionSuccess.style.left,
        width: suggestionSuccess.style.width,
        height: suggestionSuccess.style.height,
        zIndex: suggestionSuccess.style.zIndex,
        background: suggestionSuccess.style.background,
        display: suggestionSuccess.style.display
      });
      console.log('Modal computed styles:', {
        display: window.getComputedStyle(suggestionSuccess).display,
        visibility: window.getComputedStyle(suggestionSuccess).visibility,
        opacity: window.getComputedStyle(suggestionSuccess).opacity,
        position: window.getComputedStyle(suggestionSuccess).position,
        zIndex: window.getComputedStyle(suggestionSuccess).zIndex
      });
      
      // Auto-hide after 8 seconds (longer for modal)
      setTimeout(() => {
        console.log('Auto-hiding modal');
        hideMessages();
      }, 8000);
    } else {
      console.error('suggestionSuccess element not found!');
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
    if (suggestionSuccess) {
      suggestionSuccess.classList.remove('show');
      suggestionSuccess.style.display = 'none';
    }
    if (suggestionError) suggestionError.style.display = 'none';
    
    // Restore background scrolling
    document.body.style.overflow = '';
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
