// ============================================================================
// Gallery JavaScript
// Handles gallery display, filtering, and pagination for approved submissions
// ============================================================================

class Gallery {
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.currentCategory = 'all';
    this.currentUser = 'all';
    this.currentSort = 'newest';
    this.submissions = [];
    this.filteredSubmissions = [];
    this.users = [];
    this.currentUserId = null;
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSubmissions();
  }

  bindEvents() {
    // Filter controls
    document.getElementById('category-filter')?.addEventListener('change', (e) => {
      this.currentCategory = e.target.value;
      this.updateURL();
      this.filterAndDisplay();
    });

    document.getElementById('user-filter')?.addEventListener('change', (e) => {
      this.currentUser = e.target.value;
      this.updateURL();
      this.filterAndDisplay();
    });

    document.getElementById('sort-filter')?.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.updateURL();
      this.filterAndDisplay();
    });

    document.getElementById('refresh-gallery')?.addEventListener('click', () => {
      this.loadSubmissions();
    });

    // Pagination
    document.getElementById('prev-page')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.updateURL();
        this.displaySubmissions();
        this.scrollToTop();
      }
    });

    document.getElementById('next-page')?.addEventListener('click', () => {
      const totalPages = Math.ceil(this.filteredSubmissions.length / this.itemsPerPage);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.updateURL();
        this.displaySubmissions();
        this.scrollToTop();
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      this.parseURL();
      this.filterAndDisplay();
    });

    // Parse URL on load
    this.parseURL();
  }

  async loadSubmissions() {
    try {
      this.showLoading();
      
      // First, get current user info
      await this.getCurrentUser();
      
      const response = await fetch('/api/gallery/submissions');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.submissions = data.submissions || [];
      this.populateUsers();
      this.filterAndDisplay();
    } catch (error) {
      console.error('Error loading gallery submissions:', error);
      this.showError('Failed to load gallery submissions. Please try again.');
    }
  }

  filterAndDisplay() {
    // Filter by category and user
    this.filteredSubmissions = this.submissions.filter(submission => {
      const categoryMatch = this.currentCategory === 'all' || submission.category === this.currentCategory;
      const userMatch = this.currentUser === 'all' || submission.userId === this.currentUser;
      return categoryMatch && userMatch;
    });

    // Sort submissions
    this.filteredSubmissions.sort((a, b) => {
      switch (this.currentSort) {
        case 'newest':
          return new Date(b.approvedAt) - new Date(a.approvedAt);
        case 'oldest':
          return new Date(a.approvedAt) - new Date(b.approvedAt);
        case 'tokens':
          return b.finalTokenAmount - a.finalTokenAmount;
        default:
          return 0;
      }
    });

    this.currentPage = 1;
    this.displaySubmissions();
  }

  updateURL() {
    const params = new URLSearchParams();
    if (this.currentCategory !== 'all') params.set('category', this.currentCategory);
    if (this.currentUser !== 'all') params.set('user', this.currentUser);
    if (this.currentSort !== 'newest') params.set('sort', this.currentSort);
    if (this.currentPage > 1) params.set('page', this.currentPage);
    
    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newURL);
  }

  parseURL() {
    const params = new URLSearchParams(window.location.search);
    this.currentCategory = params.get('category') || 'all';
    this.currentUser = params.get('user') || 'all';
    this.currentSort = params.get('sort') || 'newest';
    this.currentPage = parseInt(params.get('page')) || 1;
    
    // Update UI
    document.getElementById('category-filter').value = this.currentCategory;
    document.getElementById('user-filter').value = this.currentUser;
    document.getElementById('sort-filter').value = this.currentSort;
  }

  displaySubmissions() {
    const sections = document.getElementById('gallery-sections');
    if (!sections) return;

    if (this.filteredSubmissions.length === 0) {
      this.showEmpty();
      return;
    }

    // Clear sections
    sections.innerHTML = '';

    // Calculate pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedSubmissions = this.filteredSubmissions.slice(startIndex, endIndex);

    // Separate art and writing submissions from paginated results
    const artSubmissions = paginatedSubmissions.filter(s => s && s.category === 'art');
    const writingSubmissions = paginatedSubmissions.filter(s => s && s.category === 'writing');

    // Create art section if there are art submissions
    if (artSubmissions.length > 0) {
      const artSection = this.createGallerySection('art', artSubmissions);
      sections.appendChild(artSection);
    }

    // Create writing section if there are writing submissions
    if (writingSubmissions.length > 0) {
      const writingSection = this.createGallerySection('writing', writingSubmissions);
      sections.appendChild(writingSection);
    }

    this.updatePagination();
  }

  populateUsers() {
    const userFilter = document.getElementById('user-filter');
    if (!userFilter) return;

    // Get unique users from submissions
    const uniqueUsers = [...new Set(this.submissions.map(s => s.userId))];
    this.users = uniqueUsers.map(userId => {
      const submission = this.submissions.find(s => s.userId === userId);
      return {
        id: userId,
        username: submission.username,
        avatar: submission.userAvatar
      };
    });

    // Sort users alphabetically
    this.users.sort((a, b) => a.username.localeCompare(b.username));

    // Clear existing options except "All Users"
    userFilter.innerHTML = '<option value="all">All Users</option>';

    // Add user options
    this.users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.username;
      userFilter.appendChild(option);
    });
  }

  createGallerySection(category, submissions) {
    const section = document.createElement('div');
    section.className = 'gallery-section';
    
    const icon = category === 'art' ? 'fas fa-palette' : 'fas fa-pen-fancy';
    const title = category === 'art' ? 'Art Submissions' : 'Writing Submissions';
    
    section.innerHTML = `
      <div class="gallery-section-header">
        <i class="gallery-section-icon ${icon}"></i>
        <h2 class="gallery-section-title">${title}</h2>
        <span class="gallery-section-count">${submissions.length}</span>
      </div>
      <div class="gallery-${category}-grid">
        ${submissions.map(submission => this.createGalleryItemHTML(submission)).join('')}
      </div>
    `;
    
    return section;
  }

  createGalleryItemHTML(submission) {
    // Ensure submission has required properties
    if (!submission) return '';
    
    const isArt = submission.category === 'art';
    const hasImage = isArt && submission.fileUrl;
    
    // Determine image aspect ratio class for adaptive sizing
    let imageClass = 'gallery-item-image';
    if (hasImage) {
      // We'll determine this dynamically when the image loads
      imageClass += ' adaptive-image';
    }
    
    if (isArt) {
      return `
        <div class="gallery-item ${submission.category}-item" onclick="window.gallery.showModal(${JSON.stringify(submission).replace(/"/g, '&quot;')})">
          <div class="gallery-item-image-container">
            ${hasImage 
              ? `<img src="${submission.fileUrl}" alt="${submission.title}" class="${imageClass}" loading="lazy" onload="window.gallery.adaptImageSize(this)">`
              : `<div class="gallery-item-image" style="display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); color: var(--text-muted);">
                   <i class="fas fa-image" style="font-size: 48px;"></i>
                 </div>`
            }
            ${this.canEditSubmission(submission) ? `
              <div class="gallery-item-actions">
                <button class="edit-btn" onclick="event.stopPropagation(); window.gallery.editSubmission('${submission.submissionId}')" title="Edit submission">
                  <i class="fas fa-edit"></i>
                </button>
              </div>
            ` : ''}
          </div>
          <div class="gallery-item-content">
            <div class="gallery-item-header">
              <h3 class="gallery-item-title">${this.escapeHtml(submission.title)}</h3>
              <span class="gallery-item-category ${submission.category}">${submission.category}</span>
            </div>
            <div class="gallery-item-meta">
              <div class="gallery-item-author">
                ${submission.userAvatar 
                  ? `<img src="${submission.userAvatar}" alt="${submission.username}" class="gallery-item-author-avatar">`
                  : `<div class="gallery-item-author-avatar" style="background: var(--accent-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${submission.username.charAt(0).toUpperCase()}</div>`
                }
                <span>${this.escapeHtml(submission.username)}</span>
              </div>
              <div class="gallery-item-tokens">
                <i class="fas fa-coins"></i>
                <span>${submission.finalTokenAmount} tokens</span>
              </div>
              <div class="gallery-item-date">
                ${this.formatDate(submission.approvedAt)}
              </div>
            </div>
            ${submission.description ? `
              <div class="gallery-item-description">
                ${this.escapeHtml(submission.description)}
              </div>
            ` : ''}
            ${submission.collab && Array.isArray(submission.collab) && submission.collab.length > 0 ? `
              <div class="gallery-item-collaborators">
                <div class="gallery-item-collaborators-title">Collaborators:</div>
                <div class="gallery-item-collaborators-list">
                  ${submission.collab.map(collaborator => `
                    <span class="gallery-item-collaborator">${this.escapeHtml(collaborator)}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      // Writing submission - clean, spacious layout
      return `
        <div class="gallery-item ${submission.category}-item" onclick="window.gallery.showModal(${JSON.stringify(submission).replace(/"/g, '&quot;')})">
          <div class="gallery-item-content">
            <div class="gallery-item-header">
              <h3 class="gallery-item-title">${this.escapeHtml(submission.title)}</h3>
              <span class="gallery-item-category">${submission.category.toUpperCase()}</span>
            </div>
            ${submission.description ? `
              <div class="gallery-item-description">
                ${this.escapeHtml(submission.description)}
              </div>
            ` : ''}
            <div class="gallery-item-meta">
              <div class="gallery-item-author">
                ${submission.userAvatar 
                  ? `<img src="${submission.userAvatar}" alt="${submission.username}" class="gallery-item-author-avatar">`
                  : `<div class="gallery-item-author-avatar" style="background: var(--accent-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${submission.username.charAt(0).toUpperCase()}</div>`
                }
                <span>${this.escapeHtml(submission.username)}</span>
              </div>
              <div class="gallery-item-tokens">
                <i class="fas fa-coins"></i>
                <span>${submission.finalTokenAmount} tokens</span>
              </div>
              <div class="gallery-item-date">
                ${this.formatDate(submission.approvedAt)}
              </div>
            </div>
            ${submission.collab && Array.isArray(submission.collab) && submission.collab.length > 0 ? `
              <div class="gallery-item-collaborators">
                <div class="gallery-item-collaborators-title">Collaborators:</div>
                <div class="gallery-item-collaborators-list">
                  ${submission.collab.map(collaborator => `
                    <span class="gallery-item-collaborator">${this.escapeHtml(collaborator)}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
  }

  createGalleryItem(submission) {
    // Ensure submission has required properties
    if (!submission) return document.createElement('div');
    
    const item = document.createElement('div');
    item.className = `gallery-item ${submission.category || 'unknown'}-item`;
    item.addEventListener('click', () => this.showModal(submission));

    const isArt = submission.category === 'art';
    const hasImage = isArt && submission.fileUrl;
    
    item.innerHTML = `
      <div class="gallery-item-image-container">
        ${hasImage 
          ? `<img src="${submission.fileUrl}" alt="${submission.title}" class="gallery-item-image adaptive-image" loading="lazy" onload="this.adaptImageSize && this.adaptImageSize()">`
          : `<div class="gallery-item-image" style="display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); color: var(--text-muted);">
               <i class="fas fa-${isArt ? 'image' : 'pen-fancy'}" style="font-size: 48px;"></i>
             </div>`
        }
      </div>
      <div class="gallery-item-content">
        <div class="gallery-item-header">
          <h3 class="gallery-item-title">${this.escapeHtml(submission.title)}</h3>
          <span class="gallery-item-category ${submission.category}">${submission.category}</span>
        </div>
        <div class="gallery-item-meta">
          <div class="gallery-item-author">
            ${submission.userAvatar 
              ? `<img src="${submission.userAvatar}" alt="${submission.username}" class="gallery-item-author-avatar">`
              : `<div class="gallery-item-author-avatar" style="background: var(--accent-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${submission.username.charAt(0).toUpperCase()}</div>`
            }
            <span>${this.escapeHtml(submission.username)}</span>
          </div>
          <div class="gallery-item-tokens">
            <i class="fas fa-coins"></i>
            <span>${submission.finalTokenAmount} tokens</span>
          </div>
          <div class="gallery-item-date">
            ${this.formatDate(submission.approvedAt)}
          </div>
        </div>
        ${submission.description ? `
          <div class="gallery-item-description">
            ${this.escapeHtml(submission.description)}
          </div>
        ` : ''}
        ${submission.collab && Array.isArray(submission.collab) && submission.collab.length > 0 ? `
          <div class="gallery-item-collaborators">
            <div class="gallery-item-collaborators-title">Collaborators:</div>
            <div class="gallery-item-collaborators-list">
              ${submission.collab.map(collaborator => `
                <span class="gallery-item-collaborator">${this.escapeHtml(collaborator)}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    return item;
  }

  showModal(submission) {
    // Remove existing modal
    const existingModal = document.querySelector('.gallery-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Debug: Log submission data to see what fields are available
    console.log('Submission data:', submission);
    console.log('Submission link field:', submission.link);
    console.log('Submission category:', submission.category);

    const modal = document.createElement('div');
    modal.className = 'gallery-modal';
    modal.innerHTML = `
      <div class="gallery-modal-content">
        <button class="gallery-modal-close" onclick="this.closest('.gallery-modal').remove()">
          <i class="fas fa-times"></i>
        </button>
        ${submission.fileUrl && submission.category === 'art' 
          ? `<img src="${submission.fileUrl}" alt="${submission.title}" class="gallery-modal-image">`
          : submission.category === 'writing' && (submission.link || submission.messageUrl)
            ? `<div class="gallery-modal-writing-preview">
                <div class="gallery-modal-writing-icon">
                  <i class="fas fa-pen-fancy"></i>
                </div>
                <div class="gallery-modal-writing-info">
                  <h3>Writing Submission</h3>
                  <p>Click the link below to read the full submission</p>
                </div>
              </div>`
            : ''
        }
        <div class="gallery-modal-info">
          <h2 class="gallery-modal-title">${this.escapeHtml(submission.title)}</h2>
          <div class="gallery-modal-meta">
            <div class="gallery-modal-meta-item">
              <div class="gallery-modal-meta-label">Category</div>
              <div class="gallery-modal-meta-value">${submission.category}</div>
            </div>
            <div class="gallery-modal-meta-item">
              <div class="gallery-modal-meta-label">Author</div>
              <div class="gallery-modal-meta-value">${this.escapeHtml(submission.username)}</div>
            </div>
            <div class="gallery-modal-meta-item">
              <div class="gallery-modal-meta-label">Tokens</div>
              <div class="gallery-modal-meta-value">${submission.finalTokenAmount}</div>
            </div>
            <div class="gallery-modal-meta-item">
              <div class="gallery-modal-meta-label">Approved</div>
              <div class="gallery-modal-meta-value">${this.formatDate(submission.approvedAt)}</div>
            </div>
            ${submission.wordCount ? `
              <div class="gallery-modal-meta-item">
                <div class="gallery-modal-meta-label">Word Count</div>
                <div class="gallery-modal-meta-value">${submission.wordCount}</div>
              </div>
            ` : ''}
            ${(submission.link || submission.messageUrl) ? `
              <div class="gallery-modal-meta-item">
                <div class="gallery-modal-meta-label">Link</div>
                <div class="gallery-modal-meta-value">
                  <a href="${submission.link || submission.messageUrl}" target="_blank" rel="noopener noreferrer" class="gallery-modal-link">
                    <i class="fas fa-external-link-alt"></i> View Original Submission
                  </a>
                </div>
              </div>
            ` : ''}
          </div>
          ${submission.description ? `
            <div class="gallery-modal-description">
              ${this.escapeHtml(submission.description)}
            </div>
          ` : ''}
          ${submission.collab && Array.isArray(submission.collab) && submission.collab.length > 0 ? `
            <div class="gallery-modal-collaborators">
              <div class="gallery-modal-collaborators-title">Collaborators</div>
              <div class="gallery-modal-collaborators-list">
                ${submission.collab.map(collaborator => `
                  <span class="gallery-modal-collaborator">${this.escapeHtml(collaborator)}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          ${submission.category === 'writing' ? `
            <div class="gallery-modal-debug" style="background: #f0f0f0; padding: 10px; margin-top: 20px; border-radius: 5px; font-size: 12px;">
              <strong>Debug Info:</strong><br>
              Link: ${submission.link || 'null'}<br>
              MessageUrl: ${submission.messageUrl || 'null'}<br>
              Available fields: ${Object.keys(submission).join(', ')}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close modal on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  updatePagination() {
    const pagination = document.getElementById('gallery-pagination');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    if (!pagination || !prevBtn || !nextBtn || !pageInfo) return;

    const totalPages = Math.ceil(this.filteredSubmissions.length / this.itemsPerPage);
    
    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';
    prevBtn.disabled = this.currentPage <= 1;
    nextBtn.disabled = this.currentPage >= totalPages;
    pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
  }

  showLoading() {
    const sections = document.getElementById('gallery-sections');
    if (!sections) return;

    sections.innerHTML = `
      <div class="gallery-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading gallery...</p>
      </div>
    `;
  }

  showEmpty() {
    const sections = document.getElementById('gallery-sections');
    if (!sections) return;

    sections.innerHTML = `
      <div class="gallery-empty">
        <i class="fas fa-images"></i>
        <h3>No submissions found</h3>
        <p>No approved submissions match your current filters. Try adjusting your search criteria.</p>
      </div>
    `;
  }

  showError(message) {
    const sections = document.getElementById('gallery-sections');
    if (!sections) return;

    sections.innerHTML = `
      <div class="gallery-empty">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  adaptImageSize(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const container = img.closest('.gallery-item');
    
    if (aspectRatio > 1.2) {
      // Landscape
      img.classList.add('landscape');
      container.style.gridColumn = 'span 2';
    } else if (aspectRatio < 0.8) {
      // Portrait
      img.classList.add('portrait');
      container.style.gridRow = 'span 2';
    } else {
      // Square
      img.classList.add('square');
    }
  }

  async editSubmission(submissionId) {
    try {
      // Get the submission data
      const submission = this.submissions.find(s => s.submissionId === submissionId);
      if (!submission) return;

      // Get characters for tagging
      const characters = await this.getCharacters();
      
      // Show edit modal
      this.showEditModal(submission, characters);
    } catch (error) {
      console.error('Error editing submission:', error);
      alert('Failed to load edit form. Please try again.');
    }
  }

  async getCharacters() {
    try {
      const response = await fetch('/api/characters');
      if (!response.ok) throw new Error('Failed to fetch characters');
      const data = await response.json();
      // The API returns { characters: [...] }, so extract the characters array
      return data.characters || [];
    } catch (error) {
      console.error('Error fetching characters:', error);
      return [];
    }
  }

  showEditModal(submission, characters) {
    // Remove existing modal
    const existingModal = document.querySelector('.gallery-edit-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Ensure characters is an array
    const characterList = Array.isArray(characters) ? characters : [];

    const modal = document.createElement('div');
    modal.className = 'gallery-edit-modal';
    modal.innerHTML = `
      <div class="gallery-edit-content">
        <div class="gallery-edit-header">
          <h2>Edit Submission: ${this.escapeHtml(submission.title)}</h2>
          <button class="gallery-edit-close" onclick="this.closest('.gallery-edit-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="gallery-edit-body">
          <div class="edit-form-group">
            <label for="edit-title">Title:</label>
            <input type="text" id="edit-title" value="${this.escapeHtml(submission.title)}" class="edit-input">
          </div>
          <div class="edit-form-group">
            <label>Tag Characters:</label>
            <div class="character-search-container">
              <input type="text" id="character-search" placeholder="Search characters..." class="character-search-input">
              <div class="character-tags" id="character-tags">
                ${characterList.map(char => `
                  <label class="character-tag" data-name="${this.escapeHtml(char.name.toLowerCase())}">
                    <input type="checkbox" value="${char._id}" ${submission.taggedCharacters && submission.taggedCharacters.includes(char._id) ? 'checked' : ''}>
                    <span class="character-checkmark">✓</span>
                    <span class="character-name">${this.escapeHtml(char.name)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="gallery-edit-footer">
          <button class="edit-cancel-btn" onclick="this.closest('.gallery-edit-modal').remove()">Cancel</button>
          <button class="edit-save-btn" onclick="window.gallery.saveSubmission('${submission.submissionId}')">Save Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add character search functionality
    const searchInput = modal.querySelector('#character-search');
    const characterTags = modal.querySelectorAll('.character-tag');
    
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      characterTags.forEach(tag => {
        const name = tag.getAttribute('data-name');
        if (name.includes(searchTerm)) {
          tag.style.display = 'flex';
        } else {
          tag.style.display = 'none';
        }
      });
    });

    // Close modal on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  async saveSubmission(submissionId) {
    try {
      const title = document.getElementById('edit-title').value;
      const taggedCharacters = Array.from(document.querySelectorAll('.character-tag input:checked')).map(cb => cb.value);

      const response = await fetch(`/api/gallery/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          taggedCharacters
        })
      });

      if (!response.ok) throw new Error('Failed to save changes');

      // Remove edit modal
      document.querySelector('.gallery-edit-modal')?.remove();
      
      // Refresh gallery
      this.loadSubmissions();
      
      alert('Submission updated successfully!');
    } catch (error) {
      console.error('Error saving submission:', error);
      alert('Failed to save changes. Please try again.');
    }
  }

  canEditSubmission(submission) {
    // Only allow editing if user is authenticated and owns the submission
    if (!this.currentUserId) {
      console.log('No current user ID, denying edit access');
      return false;
    }
    
    const canEdit = submission.userId === this.currentUserId;
    console.log(`Edit permission for submission ${submission.submissionId}:`, {
      submissionUserId: submission.userId,
      currentUserId: this.currentUserId,
      canEdit: canEdit
    });
    
    return canEdit;
  }

  scrollToTop() {
    // Smooth scroll to the top of the gallery section
    const gallerySection = document.getElementById('gallery-section');
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async getCurrentUser() {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const userData = await response.json();
        if (userData.isAuthenticated && userData.user) {
          this.currentUserId = userData.user.discordId;
          console.log('Current user ID set to:', this.currentUserId);
        } else {
          this.currentUserId = null;
          console.log('No authenticated user found');
        }
      } else {
        this.currentUserId = null;
        console.log('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      this.currentUserId = null;
    }
  }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on a page with gallery functionality
  if (document.getElementById('gallery-section')) {
    window.gallery = new Gallery();
  }
});

// Handle section switching
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-section="gallery-section"]')) {
    // Refresh gallery when switching to gallery section
    if (window.gallery) {
      window.gallery.loadSubmissions();
    }
  }
});
