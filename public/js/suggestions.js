// Suggestion Box Module
const suggestionsModule = (function() {
  'use strict';

  // DOM elements
  let suggestionForm;
  let charCount;
  let suggestionSuccess;
  let suggestionError;
  let modal;

  // Initialize the module
  function init() {
    console.log('Suggestions module initializing...');
    bindElements();
    bindEvents();
    updateCharCount();
    createModal();
    console.log('Suggestions module initialized successfully');
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
  }

  // Create modal element
  function createModal() {
    // Remove existing modal if it exists
    const existingModal = document.getElementById('suggestion-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal HTML
    modal = document.createElement('div');
    modal.id = 'suggestion-modal';
    modal.className = 'suggestion-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Submission Successful!</h3>
          <button class="modal-close" aria-label="Close modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="modal-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <p>Submission sent to Discord!</p>
        </div>
        <div class="modal-footer">
          <button class="modal-ok-btn">OK</button>
        </div>
      </div>
    `;

    // Add modal to body
    document.body.appendChild(modal);

    // Bind modal events
    const closeBtn = modal.querySelector('.modal-close');
    const okBtn = modal.querySelector('.modal-ok-btn');
    const overlay = modal.querySelector('.modal-overlay');

    closeBtn.addEventListener('click', hideModal);
    okBtn.addEventListener('click', hideModal);
    overlay.addEventListener('click', hideModal);

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        hideModal();
      }
    });
  }

  // Show modal
  function showModal() {
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
      
      // Focus the OK button for accessibility
      setTimeout(() => {
        const okBtn = modal.querySelector('.modal-ok-btn');
        if (okBtn) okBtn.focus();
      }, 100);
    }
  }

  // Hide modal
  function hideModal() {
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  // Handle form submission
  async function handleSubmit(event) {
    event.preventDefault();
    console.log('Form submission started...');
    
    const formData = new FormData(suggestionForm);
    const suggestionData = {
      category: formData.get('category'),
      title: formData.get('title'),
      description: formData.get('description'),
      timestamp: new Date().toISOString(),
      userId: getCurrentUserId() // Will be null for anonymous submissions
    };

    console.log('Form data collected:', suggestionData);

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
      
      // Show modal instead of success message
      showModal();
      
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
      
      // Show success message
      suggestionSuccess.style.display = 'block';
      suggestionSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Auto-hide after 8 seconds
      setTimeout(() => {
        console.log('Auto-hiding success message');
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
      suggestionSuccess.style.display = 'none';
    }
    if (suggestionError) suggestionError.style.display = 'none';
  }

  // Public API
  return {
    init: init,
    handleSubmit: handleSubmit,
    handleReset: handleReset,
    updateCharCount: updateCharCount,
    showModal: showModal,
    hideModal: hideModal
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
