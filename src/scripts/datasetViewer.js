// Dataset Viewer JavaScript functionality for ENACT QA Dataset
class DatasetViewer {
  constructor() {
    this.allData = [];
    this.filteredData = [];
    this.currentIndex = 0;
    
    // Filter states
    this.currentSetting = 'forward'; // 'forward', 'inverse', or ''
    this.currentTaskName = ''; // Empty string means all tasks
    this.currentStepLength = ''; // Empty string means all step lengths
    
    // Available filter options (will be populated from data)
    this.availableTaskNames = [];
    this.availableStepLengths = [];
    
    // Answer visibility
    this.showAnswer = false;
    
    this.init();
  }

  async init() {
    try {
      await this.loadData();
      this.populateFilterOptions();
      // Re-filter with default selections
      this.filterData();
      this.setupEventListeners();
      this.updateFilterUI(); // Update UI to reflect default selections
      this.updateUI();
    } catch (error) {
      console.error('Failed to initialize dataset viewer:', error);
      this.showError('Failed to load dataset');
    }
  }

  async loadData() {
    try {
      const response = await fetch('/data_viewer/QA/enact_ordering.jsonl');
      const text = await response.text();
      
      // Parse JSONL (each line is a JSON object)
      this.allData = text
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
      
      console.log(`Loaded ${this.allData.length} samples`);
      this.filterData();
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  // Extract unique task names and step lengths from data
  populateFilterOptions() {
    const taskNames = new Set();
    const stepLengths = new Set();
    
    this.allData.forEach(item => {
      if (item.task_name) {
        taskNames.add(item.task_name);
      }
      if (item.key_frame_ids) {
        stepLengths.add(item.key_frame_ids.length);
      }
    });
    
    this.availableTaskNames = Array.from(taskNames).sort();
    this.availableStepLengths = Array.from(stepLengths).sort((a, b) => a - b);
    
    this.updateFilterSelectors();
  }

  // Update filter dropdown options
  updateFilterSelectors() {
    // Update task name selector
    const taskSelect = document.getElementById('task-select');
    if (taskSelect) {
      taskSelect.innerHTML = '';
      this.availableTaskNames.forEach(taskName => {
        const option = document.createElement('option');
        option.value = taskName;
        option.textContent = this.formatTaskName(taskName);
        taskSelect.appendChild(option);
      });
      // Set first task as default
      if (this.availableTaskNames.length > 0 && !this.currentTaskName) {
        this.currentTaskName = this.availableTaskNames[0];
      }
    }
    
    // Update step length selector
    const stepSelect = document.getElementById('step-select');
    if (stepSelect) {
      stepSelect.innerHTML = '';
      this.availableStepLengths.forEach(stepLength => {
        const option = document.createElement('option');
        option.value = stepLength;
        option.textContent = `${stepLength} Steps`;
        stepSelect.appendChild(option);
      });
      // Set first step as default
      if (this.availableStepLengths.length > 0 && !this.currentStepLength) {
        this.currentStepLength = String(this.availableStepLengths[0]);
      }
    }
  }

  // Populate step lengths based on current filters
  populateStepLengthsForCurrentFilters() {
    // Get step lengths available for current setting and task
    const stepLengths = new Set();
    
    this.allData.forEach(item => {
      // Filter by setting
      if (this.currentSetting) {
        const itemSetting = this.getSettingFromType(item.type);
        if (itemSetting !== this.currentSetting) return;
      }
      
      // Filter by task name
      if (this.currentTaskName && item.task_name !== this.currentTaskName) {
        return;
      }
      
      // Collect step lengths
      if (item.key_frame_ids) {
        stepLengths.add(item.key_frame_ids.length);
      }
    });
    
    this.availableStepLengths = Array.from(stepLengths).sort((a, b) => a - b);
    
    // Update step selector
    const stepSelect = document.getElementById('step-select');
    if (stepSelect) {
      stepSelect.innerHTML = '';
      this.availableStepLengths.forEach(stepLength => {
        const option = document.createElement('option');
        option.value = stepLength;
        option.textContent = `${stepLength} Steps`;
        stepSelect.appendChild(option);
      });
      
      // Set first step as default if current is not available
      if (this.availableStepLengths.length > 0) {
        if (!this.currentStepLength || !this.availableStepLengths.includes(parseInt(this.currentStepLength))) {
          this.currentStepLength = String(this.availableStepLengths[0]);
        }
        stepSelect.value = this.currentStepLength;
      }
    }
  }

  // Format task name for display
  formatTaskName(taskName) {
    // Remove timestamp suffix and replace underscores with spaces
    const withoutTimestamp = taskName.replace(/_\d+$/, '');
    return withoutTimestamp.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  // Get setting from type field
  getSettingFromType(type) {
    if (type.includes('forward')) return 'forward';
    if (type.includes('inverse')) return 'inverse';
    return '';
  }

  filterData() {
    this.filteredData = this.allData.filter(item => {
      // Filter by setting
      if (this.currentSetting) {
        const itemSetting = this.getSettingFromType(item.type);
        if (itemSetting !== this.currentSetting) return false;
      }
      
      // Filter by task name
      if (this.currentTaskName && item.task_name !== this.currentTaskName) {
        return false;
      }
      
      // Filter by step length
      if (this.currentStepLength) {
        const stepLength = item.key_frame_ids ? item.key_frame_ids.length : 0;
        if (stepLength !== parseInt(this.currentStepLength)) return false;
      }
      
      return true;
    });
    
    // Reset current index when filtering
    this.currentIndex = 0;
    this.showAnswer = false; // Hide answer when changing data
    this.updateIdSelector();
  }

  updateIdSelector() {
    // ID selector removed from UI, keeping method for compatibility
  }

  setupEventListeners() {
    // Setting filter
    const settingSelect = document.getElementById('setting-select');
    if (settingSelect) {
      settingSelect.addEventListener('change', (e) => {
        this.currentSetting = e.target.value;
        // Reset step length when changing setting
        this.currentStepLength = '';
        // Update available step lengths for new setting
        this.populateStepLengthsForCurrentFilters();
        this.filterData();
        this.updateUI();
      });
    }

    // Task name filter
    const taskSelect = document.getElementById('task-select');
    if (taskSelect) {
      taskSelect.addEventListener('change', (e) => {
        this.currentTaskName = e.target.value;
        // Reset step length when changing task
        this.currentStepLength = '';
        // Update available step lengths for new task
        this.populateStepLengthsForCurrentFilters();
        this.filterData();
        this.updateUI();
      });
    }

    // Step length filter
    const stepSelect = document.getElementById('step-select');
    if (stepSelect) {
      stepSelect.addEventListener('change', (e) => {
        this.currentStepLength = e.target.value;
        this.filterData();
        this.updateUI();
      });
    }

    // Navigation buttons - with hierarchical navigation
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.navigatePrevious();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.navigateNext();
      });
    }

    // Answer toggle button
    const answerToggleBtn = document.getElementById('answer-toggle-btn');
    if (answerToggleBtn) {
      answerToggleBtn.addEventListener('click', () => {
        this.showAnswer = !this.showAnswer;
        this.updateUI();
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      
      if (e.key === 'ArrowLeft') {
        this.navigatePrevious();
      } else if (e.key === 'ArrowRight') {
        this.navigateNext();
      }
    });
  }

  // Hierarchical navigation: step → task → setting
  navigateNext() {
    if (this.currentIndex < this.filteredData.length - 1) {
      // Navigate within current filter
      this.currentIndex++;
      this.showAnswer = false;
      this.updateUI();
    } else {
      // Try to go to next category
      const moved = this.moveToNextCategory();
      if (!moved) {
        // Already at the end
        console.log('Already at the last item');
      }
    }
  }

  navigatePrevious() {
    if (this.currentIndex > 0) {
      // Navigate within current filter
      this.currentIndex--;
      this.showAnswer = false;
      this.updateUI();
    } else {
      // Try to go to previous category
      const moved = this.moveToPreviousCategory();
      if (!moved) {
        // Already at the beginning
        console.log('Already at the first item');
      }
    }
  }

  // Move to next category (priority: step → task → setting)
  moveToNextCategory() {
    // Priority 1: Try next step length
    if (this.currentStepLength) {
      const currentStepIndex = this.availableStepLengths.indexOf(parseInt(this.currentStepLength));
      if (currentStepIndex < this.availableStepLengths.length - 1) {
        this.currentStepLength = String(this.availableStepLengths[currentStepIndex + 1]);
        this.filterData();
        this.updateUI();
        this.updateFilterUI();
        return true;
      } else {
        // No more steps, try next task
        this.currentStepLength = '';
        return this.moveToNextTask();
      }
    }
    
    // Priority 2: Try next task
    return this.moveToNextTask();
  }

  moveToNextTask() {
    if (this.currentTaskName) {
      const currentTaskIndex = this.availableTaskNames.indexOf(this.currentTaskName);
      if (currentTaskIndex < this.availableTaskNames.length - 1) {
        this.currentTaskName = this.availableTaskNames[currentTaskIndex + 1];
        // Reset step length when changing task
        this.currentStepLength = '';
        this.filterData();
        // Update available step lengths for new task
        this.populateStepLengthsForCurrentFilters();
        this.updateUI();
        this.updateFilterUI();
        return true;
      } else {
        // No more tasks, try next setting
        this.currentTaskName = '';
        return this.moveToNextSetting();
      }
    }
    
    // Priority 3: Try next setting
    return this.moveToNextSetting();
  }

  moveToNextSetting() {
    const settings = ['', 'forward', 'inverse'];
    const currentSettingIndex = settings.indexOf(this.currentSetting);
    if (currentSettingIndex < settings.length - 1) {
      this.currentSetting = settings[currentSettingIndex + 1];
      this.filterData();
      this.updateUI();
      this.updateFilterUI();
      return true;
    }
    return false; // No more categories
  }

  // Move to previous category (priority: step → task → setting)
  moveToPreviousCategory() {
    // Priority 1: Try previous step length
    if (this.currentStepLength) {
      const currentStepIndex = this.availableStepLengths.indexOf(parseInt(this.currentStepLength));
      if (currentStepIndex > 0) {
        this.currentStepLength = String(this.availableStepLengths[currentStepIndex - 1]);
        this.filterData();
        // Go to last item in this category
        this.currentIndex = Math.max(0, this.filteredData.length - 1);
        this.updateUI();
        this.updateFilterUI();
        return true;
      } else {
        // No previous step, try previous task
        this.currentStepLength = '';
        return this.moveToPreviousTask();
      }
    }
    
    // Priority 2: Try previous task
    return this.moveToPreviousTask();
  }

  moveToPreviousTask() {
    if (this.currentTaskName) {
      const currentTaskIndex = this.availableTaskNames.indexOf(this.currentTaskName);
      if (currentTaskIndex > 0) {
        this.currentTaskName = this.availableTaskNames[currentTaskIndex - 1];
        // Reset step length when changing task
        this.currentStepLength = '';
        this.filterData();
        // Update available step lengths for new task
        this.populateStepLengthsForCurrentFilters();
        // Go to last item in this category
        this.currentIndex = Math.max(0, this.filteredData.length - 1);
        this.updateUI();
        this.updateFilterUI();
        return true;
      } else {
        // No previous task, try previous setting
        this.currentTaskName = '';
        return this.moveToPreviousSetting();
      }
    }
    
    // Priority 3: Try previous setting
    return this.moveToPreviousSetting();
  }

  moveToPreviousSetting() {
    const settings = ['', 'forward', 'inverse'];
    const currentSettingIndex = settings.indexOf(this.currentSetting);
    if (currentSettingIndex > 0) {
      this.currentSetting = settings[currentSettingIndex - 1];
      this.filterData();
      // Go to last item in this category
      this.currentIndex = Math.max(0, this.filteredData.length - 1);
      this.updateUI();
      this.updateFilterUI();
      return true;
    }
    return false; // No more categories
  }

  // Update filter UI to reflect current selections
  updateFilterUI() {
    const settingSelect = document.getElementById('setting-select');
    const taskSelect = document.getElementById('task-select');
    const stepSelect = document.getElementById('step-select');
    
    if (settingSelect) settingSelect.value = this.currentSetting;
    if (taskSelect) taskSelect.value = this.currentTaskName;
    if (stepSelect) {
      // Check if current step length is valid, if not reset to first available
      const hasCurrentStep = Array.from(stepSelect.options).some(opt => opt.value === this.currentStepLength);
      if (hasCurrentStep) {
        stepSelect.value = this.currentStepLength;
      } else if (stepSelect.options.length > 0) {
        // Reset to first available step
        this.currentStepLength = stepSelect.options[0].value;
        stepSelect.value = this.currentStepLength;
        this.filterData();
      }
    }
  }

  updateUI() {
    const dataDisplay = document.getElementById('data-display');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    // Update navigation buttons - never disable them for hierarchical navigation
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;

    // Update data display
    if (!dataDisplay) return;
    
    if (this.filteredData.length === 0) {
      dataDisplay.innerHTML = this.getNoDataHTML();
      dataDisplay.classList.add('loaded');
      return;
    }

    const currentData = this.filteredData[this.currentIndex];
    if (currentData) {
      dataDisplay.innerHTML = this.getSampleHTML(currentData);
      dataDisplay.classList.add('loaded');
      
      // Attach answer interaction listeners
      this.attachAnswerListeners(currentData);
    }
  }

  attachAnswerListeners(data) {
    // Scroll question text to bottom
    const questionText = document.getElementById(`question-text-${data.id}`);
    if (questionText) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        questionText.scrollTop = questionText.scrollHeight;
      }, 0);
    }

    // Reveal button listener
    const revealBtn = document.getElementById(`reveal-btn-${data.id}`);
    if (revealBtn) {
      revealBtn.addEventListener('click', () => {
        this.showAnswer = !this.showAnswer;
        this.updateUI();
      });
    }

    // Verify button listener
    const verifyBtn = document.getElementById(`verify-btn-${data.id}`);
    const userAnswerInput = document.getElementById(`user-answer-${data.id}`);
    const resultDiv = document.getElementById(`verification-result-${data.id}`);
    
    if (verifyBtn && userAnswerInput && resultDiv) {
      verifyBtn.addEventListener('click', () => {
        this.verifyAnswer(userAnswerInput, data.gt_answer, resultDiv);
      });
      
      // Allow Enter key to verify
      userAnswerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.verifyAnswer(userAnswerInput, data.gt_answer, resultDiv);
        }
      });
    }
  }

  verifyAnswer(inputElement, gtAnswer, resultDiv) {
    const userInput = inputElement.value.trim();
    
    // Parse user input
    let userAnswer;
    try {
      userAnswer = JSON.parse(userInput);
    } catch (e) {
      resultDiv.innerHTML = '<span class="result-error">❌ Invalid format. Please use [1, 2, 3] format.</span>';
      resultDiv.style.display = 'block';
      return;
    }

    // Validate input
    if (!Array.isArray(userAnswer)) {
      resultDiv.innerHTML = '<span class="result-error">❌ Answer must be an array.</span>';
      resultDiv.style.display = 'block';
      return;
    }

    // Check if all numbers are valid (1-10)
    if (!userAnswer.every(num => Number.isInteger(num) && num >= 1 && num <= 10)) {
      resultDiv.innerHTML = '<span class="result-error">❌ All numbers must be integers between 1 and 10.</span>';
      resultDiv.style.display = 'block';
      return;
    }

    // Compare with ground truth
    const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(gtAnswer);
    
    if (isCorrect) {
      resultDiv.innerHTML = '<span class="result-correct">✅ Correct! Well done!</span>';
    } else {
      resultDiv.innerHTML = '<span class="result-incorrect">⚠️ Maybe Incorrect! Evaluate with our online verifier or reveal the answer.</span>';
    }
    resultDiv.style.display = 'block';
  }

  getSampleHTML(data) {
    const images = data.images || [];
    const numImages = images.length;
    const stepLength = data.key_frame_ids?.length || 0;
    const settingType = this.getSettingFromType(data.type);
    const settingDisplay = settingType === 'forward' ? 'Forward World Modeling' : 'Inverse World Modeling';
    
    // Determine grid layout based on number of images (max 5 per row)
    let gridClass = 'images-grid-2col'; // default 2 columns
    if (numImages === 3) {
      gridClass = 'images-grid-3col';
    } else if (numImages === 4) {
      gridClass = 'images-grid-4col';
    } else if (numImages >= 5) {
      gridClass = 'images-grid-5col';
    }
    
    // Generate image labels
    const imageLabels = ['Current State', ...Array.from({length: numImages - 1}, (_, i) => `Next State ${i + 1}`)];
    
    return `
      <div class="sample-container">
        <!-- Sample Header -->
        <div class="sample-header">
          <div class="sample-id">${data.id || 'Unknown ID'}</div>
        </div>

        <!-- Main Content Area -->
        <div class="sample-content">
          <!-- Images Section -->
          <div class="content-card images-card">
            <div class="card-header">
              <svg class="card-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <h3 class="card-title">State Sequence (${numImages} images)</h3>
            </div>
            <div class="card-content">
              <div class="images-grid ${gridClass}">
                ${images.map((img, index) => `
                  <div class="image-item">
                    <img src="/data_viewer/${img}" 
                         alt="${imageLabels[index] || `Image ${index + 1}`}" 
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'image-error\\'>Image not found</div>'"
                         loading="lazy">
                    <div class="image-label">${imageLabels[index] || `Image ${index + 1}`}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Question Section -->
          <div class="content-card question-card">
            <div class="card-header">
              <svg class="card-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3 class="card-title">Task Question</h3>
            </div>
            <div class="card-content">
              <div class="question-text" id="question-text-${data.id}">${this.formatQuestion(data.question || 'No question available')}</div>
            </div>
          </div>

          <!-- Answer Section -->
          <div class="content-card answer-card">
            <div class="card-header">
              <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <h3 class="card-title">Answer Verification</h3>
            </div>
            <div class="card-content">
              <div class="answer-interactive">
                <div class="answer-input-row">
                  <label for="user-answer-${data.id}">Your Answer:</label>
                  <input 
                    type="text" 
                    id="user-answer-${data.id}" 
                    class="answer-input" 
                    placeholder="[1, 2, 3]"
                    pattern="\\[\\s*\\d+(\\s*,\\s*\\d+)*\\s*\\]"
                  >
                  <button id="verify-btn-${data.id}" class="verify-btn">Verify</button>
                  <button id="reveal-btn-${data.id}" class="reveal-btn">
                    ${this.showAnswer ? 'Hide' : 'Show'} GT
                  </button>
                </div>
                <div id="verification-result-${data.id}" class="verification-result"></div>
                ${this.showAnswer ? `
                  <div class="gt-answer-display">
                    <strong>Ground Truth:</strong> ${this.formatAnswer(data.gt_answer)}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Format question text for display with markdown rendering
  formatQuestion(questionText) {
    if (!questionText || typeof questionText !== 'string') {
      return 'No question available';
    }
    
    // Simple markdown rendering
    let html = questionText;
    
    // Headers (## Header)
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    
    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic (*text* or _text_)
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Code blocks with backticks
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Lists (numbered)
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in <ol>
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      return '<ol>' + match + '</ol>';
    });
    
    // Paragraphs (double newline)
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
  }

  // Format answer for display
  formatAnswer(answer) {
    if (Array.isArray(answer)) {
      return `[${answer.join(', ')}]`;
    } else if (answer !== null && answer !== undefined) {
      return String(answer);
    }
    return 'N/A';
  }

  getNoDataHTML() {
    return `
      <div style="text-align: center; padding: 3rem; color: #64748b;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21l-4.35-4.35"></path>
        </svg>
        <h3 style="margin-bottom: 0.5rem; color: #334155;">No data found</h3>
        <p>No samples match the current filter criteria.</p>
      </div>
    `;
  }

  showError(message) {
    const dataDisplay = document.getElementById('data-display');
    dataDisplay.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: #ef4444;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <h3 style="margin-bottom: 0.5rem;">Error Loading Dataset</h3>
        <p>${message}</p>
      </div>
    `;
  }
}

// Initialize dataset viewer
export function initDatasetViewer() {
  new DatasetViewer();
}

// Auto-initialize if this script is loaded directly
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initDatasetViewer);
} 