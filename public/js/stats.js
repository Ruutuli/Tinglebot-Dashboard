/* ============================================================================ */
/* Stats Dashboard Script                                                       */
/* Handles initialization and rendering of character statistics charts,        */
/* activity logs, and navigation between dashboard and stats sections.         */
/* ============================================================================ */

// Chart.js is loaded globally via CDN in index.html
// Register ChartDataLabels plugin if available
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
} else {
}

// ============================================================================
// ------------------- State: Chart Instances -------------------
// Stores chart instances for reuse or cleanup
// ============================================================================
let villageChart = null;
let raceChart = null;
let jobChart = null;

// ============================================================================
// ------------------- Responsive Chart Management -------------------
// ============================================================================

// Function: Update charts on window resize
function updateChartsOnResize() {
    const isMobile = isMobileDevice();
    
    // Update chart containers height based on screen size
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        if (isMobile) {
            container.style.height = '250px';
        } else {
            container.style.height = '400px';
        }
    });
    
    // Recreate charts if they exist
    if (villageChart || raceChart || jobChart) {
        console.log('Updating charts for responsive layout...');
        initStatsPage();
    }
}

// Add window resize listener
window.addEventListener('resize', () => {
    // Debounce resize events
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(updateChartsOnResize, 250);
});

// ============================================================================
// ------------------- Chart Creation Functions -------------------
// ============================================================================

// Helper: Check if device is mobile
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Helper: Get responsive chart options
function getResponsiveChartOptions() {
    const isMobile = isMobileDevice();
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { 
                top: isMobile ? 5 : 10, 
                bottom: isMobile ? 5 : 10 
            }
        },
        plugins: {
            legend: { 
                display: !isMobile,
                position: 'bottom',
                labels: {
                    color: '#FFFFFF',
                    font: { size: isMobile ? 10 : 12 },
                    padding: isMobile ? 10 : 15,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            title: {
                display: false
            },
            tooltip: {
                backgroundColor: '#333',
                titleColor: '#fff',
                bodyColor: '#ddd',
                borderColor: '#555',
                borderWidth: 1,
                titleFont: { size: isMobile ? 11 : 13 },
                bodyFont: { size: isMobile ? 10 : 12 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#FFFFFF',
                    font: { size: isMobile ? 10 : 12 }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            x: {
                ticks: {
                    color: '#FFFFFF',
                    font: { size: isMobile ? 10 : 12 }
                },
                grid: {
                    display: false
                }
            }
        },
        animation: {
            duration: isMobile ? 600 : 800,
            easing: 'easeOutQuart'
        }
    };
}

// Helper: Get responsive pie chart options
function getResponsivePieChartOptions() {
    const isMobile = isMobileDevice();
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { 
                top: isMobile ? 5 : 10, 
                bottom: isMobile ? 5 : 10 
            }
        },
        plugins: {
            legend: {
                display: true,
                position: isMobile ? 'bottom' : 'bottom',
                labels: {
                    color: '#FFFFFF',
                    font: { size: isMobile ? 10 : 12 },
                    padding: isMobile ? 10 : 15,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            title: {
                display: false
            },
            tooltip: {
                backgroundColor: '#333',
                titleColor: '#fff',
                bodyColor: '#ddd',
                borderColor: '#555',
                borderWidth: 1,
                titleFont: { size: isMobile ? 11 : 13 },
                bodyFont: { size: isMobile ? 10 : 12 },
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        },
        animation: {
            duration: isMobile ? 600 : 800,
            easing: 'easeOutQuart'
        }
    };
}

// Helper: Format debuff end date as next midnight
function formatDebuffEndMidnight(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date.toLocaleString();
}

// ------------------- Function: createBarChart -------------------
// Creates a bar chart with modern styling and rounded bars
function createBarChart(ctx, data, options = {}) {
    const {
      labelTransform = v => v,
      colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
      yMax = null
    } = options;
  
    const labels = Object.keys(data).map(labelTransform);
    const values = Object.values(data);
    const isMobile = isMobileDevice();
  
    const chartConfig = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: isMobile ? 4 : 8, // Smaller rounded bars on mobile
          barPercentage: isMobile ? 0.8 : 0.75,     // Wider bars on mobile
          categoryPercentage: isMobile ? 0.9 : 0.85 // Less spacing on mobile
        }]
      },
      options: {
        ...getResponsiveChartOptions(),
        scales: {
          y: {
            beginAtZero: true,
            max: yMax,
            ticks: {
              color: '#FFFFFF',
              font: { size: isMobile ? 10 : 12 }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#FFFFFF',
              font: { size: isMobile ? 10 : 12 }
            },
            grid: {
              display: false
            }
          }
        }
      }
    };

    // Add datalabels plugin if available
    if (typeof ChartDataLabels !== 'undefined') {
      chartConfig.options.plugins.datalabels = {
        anchor: 'end',
        align: 'top',
        color: '#FFFFFF',
        font: {
          weight: 'bold',
          size: isMobile ? 10 : 12
        },
        formatter: value => value
      };
      chartConfig.plugins = [ChartDataLabels];
    }
  
    return new Chart(ctx, chartConfig);
  }

// ------------------- Function: createPieChart -------------------
// Creates a pie chart with modern styling and labels
function createPieChart(ctx, data, options = {}) {
    const {
      labelTransform = v => v,
      colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
    } = options;
  
    const labels = Object.keys(data).map(labelTransform);
    const values = Object.values(data);
    const isMobile = isMobileDevice();
  
    const chartConfig = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: isMobile ? 1 : 2,
          borderColor: '#1a1a1a'
        }]
      },
      options: getResponsivePieChartOptions()
    };

    // Add datalabels plugin if available
    if (typeof ChartDataLabels !== 'undefined') {
      chartConfig.options.plugins.datalabels = {
        color: '#000000',
        font: {
          weight: 'bold',
          size: isMobile ? 14 : 18
        },
        anchor: 'center',
        align: 'center',
        offset: 0,
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${value}\n(${percentage}%)`;
        }
      };
      chartConfig.plugins = [ChartDataLabels];
    } else {
      console.warn('ChartDataLabels not available for pie chart');
    }
  
    return new Chart(ctx, chartConfig);
  }

// ============================================================================
// ------------------- Initialization: Stats Page -------------------
// Loads and renders character stats data
// ============================================================================

// ------------------- Function: initStatsPage -------------------
// Fetches stats data and initializes all charts
async function initStatsPage() {
    try {
        const res = await fetch('/api/stats/characters');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        if (!data) throw new Error('No data received');

        const totalCard = document.getElementById('stats-total-characters');
        const totalCardHeader = totalCard.closest('.stats-card-wide')?.querySelector('h3');
        if (totalCardHeader) totalCardHeader.textContent = 'Character Stats';
        totalCard.textContent = '';

        const totalCardParent = totalCard.closest('.stats-card-wide');
        if (totalCardParent) {
            let extraStats = totalCardParent.querySelector('.extra-stats');
            if (extraStats) extraStats.remove();

            extraStats = document.createElement('div');
            extraStats.className = 'extra-stats';
            extraStats.style.marginTop = '1.5rem';
            extraStats.innerHTML = `
                <div class="stats-table-section">
                  <h4 class="stats-section-header"><i class="fas fa-users"></i> General</h4>
                  <div class="stats-table-container">
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th colspan="2">Character Statistics</th>
                            </tr>
                            <tr>
                                <th>Stat</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Total Characters</strong></td>
                                <td>${data.totalCharacters || 0}</td>
                            </tr>
                        </tbody>
                    </table>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th colspan="2">Upcoming Birthdays</th>
                            </tr>
                            <tr>
                                <th>Character</th>
                                <th>Birthday</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(data.upcomingBirthdays || []).length
                                ? data.upcomingBirthdays.map(b => `<tr><td>${b.name}</td><td>${b.birthday}</td></tr>`).join('')
                                : '<tr><td colspan="2">None in next 30 days</td></tr>'
                            }
                        </tbody>
                    </table>
                  </div>
                </div>
                <div class="stats-table-section">
                  <h4 class="stats-section-header"><i class="fas fa-exclamation-triangle"></i> Status Effects</h4>
                  <div class="stats-table-container">
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th colspan="2">KO'd Characters</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(data.kodCharacters && data.kodCharacters.length > 0)
                                ? data.kodCharacters.map(char => `
                                    <tr>
                                        <td colspan="2">${char.name}</td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="2">None</td></tr>'
                            }
                        </tbody>
                    </table>
                    
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th colspan="2">Blighted Characters</th>
                            </tr>
                            <tr>
                                <th>Character</th>
                                <th>Blighted At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(data.blightedCharacters && data.blightedCharacters.length > 0)
                                ? data.blightedCharacters.map(char => `
                                    <tr>
                                        <td>${char.name}</td>
                                        <td>${char.blightedAt ? new Date(char.blightedAt).toLocaleString() : '—'}</td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="2">None</td></tr>'
                            }
                        </tbody>
                    </table>
                    
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th colspan="2">Debuffed Characters</th>
                            </tr>
                            <tr>
                                <th>Character</th>
                                <th>Debuff Ends</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(data.debuffedCharacters && data.debuffedCharacters.length > 0)
                                ? data.debuffedCharacters.map(char => `
                                    <tr>
                                        <td>${char.name}</td>
                                        <td>${char.debuff && char.debuff.endDate ? formatDebuffEndMidnight(char.debuff.endDate) : '—'}</td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="2">None</td></tr>'
                            }
                        </tbody>
                    </table>
                  </div>
                </div>
                <div class="stats-table-section">
                  <h4 class="stats-section-header"><i class="fas fa-trophy"></i> Top Stats</h4>
                  <div class="stats-table-container">
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th colspan="2">Most Stamina</th>
                            </tr>
                            <tr>
                                <th>Character</th>
                                <th>Stamina</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(data.mostStaminaChar?.names || []).length > 0
                                ? data.mostStaminaChar.names.map((name, index) => `
                                    <tr>
                                        <td>${name}</td>
                                        <td>${data.mostStaminaChar.values ? data.mostStaminaChar.values[index] : data.mostStaminaChar.value || 0}</td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="2">No data</td></tr>'
                            }
                        </tbody>
                    </table>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th colspan="2">Most Hearts</th>
                            </tr>
                            <tr>
                                <th>Character</th>
                                <th>Hearts</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(data.mostHeartsChar?.names || []).length > 0
                                ? data.mostHeartsChar.names.map((name, index) => `
                                    <tr>
                                        <td>${name}</td>
                                        <td>${data.mostHeartsChar.values ? data.mostHeartsChar.values[index] : data.mostHeartsChar.value || 0}</td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="2">No data</td></tr>'
                            }
                        </tbody>
                    </table>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th colspan="2">Most Spirit Orbs</th>
                            </tr>
                            <tr>
                                <th>Character</th>
                                <th>Spirit Orbs</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(data.mostOrbsChar?.names || []).length > 0
                                ? data.mostOrbsChar.names.map((name, index) => `
                                    <tr>
                                        <td>${name}</td>
                                        <td>${data.mostOrbsChar.values ? data.mostOrbsChar.values[index] : data.mostOrbsChar.value || 0}</td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="2">No data</td></tr>'
                            }
                        </tbody>
                    </table>
                  </div>
                </div>
            `;
            totalCardParent.appendChild(extraStats);
        }

        // Remove any existing standalone debuffed characters section
        let debuffedSection = document.querySelector('.debuffed-characters-section');
        if (debuffedSection) debuffedSection.remove();

        // Add visiting characters section
        let visitingSection = document.querySelector('.visiting-characters-section');
        if (visitingSection) visitingSection.remove();
        
        visitingSection = document.createElement('div');
        visitingSection.className = 'stats-card-wide visiting-characters-section';
        visitingSection.innerHTML = `
            <h3>Visiting Characters</h3>
            <div class="visiting-villages-grid">
                ${Object.entries(data.visitingDetails || {}).map(([village, characters]) => `
                    <div class="visiting-village ${village.toLowerCase()}">
                        <h4>${village.charAt(0).toUpperCase() + village.slice(1)} (${characters.length})</h4>
                        ${characters.length > 0 ? `
                            <table class="stats-table">
                                <thead>
                                    <tr>
                                        <th>Character</th>
                                        <th>Home Village</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${characters.map(char => `
                                        <tr>
                                            <td>${char.name}</td>
                                            <td>${char.homeVillage.charAt(0).toUpperCase() + char.homeVillage.slice(1)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p style="color: #aaa; text-align: center; margin: 1rem 0;">No visitors</p>'}
                    </div>
                `).join('')}
            </div>
        `;
        
        // Insert after the first stats card
        const firstStatsCard = document.querySelector('#stats-section .stats-card-wide');
        if (firstStatsCard) {
            firstStatsCard.parentNode.insertBefore(visitingSection, firstStatsCard.nextSibling);
        }

        if (villageChart) villageChart.destroy();
        if (raceChart) raceChart.destroy();
        if (jobChart) jobChart.destroy();

        // Set responsive chart container heights
        const isMobile = isMobileDevice();
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            if (isMobile) {
                container.style.height = '250px';
            } else {
                container.style.height = '400px';
            }
        });

        // --- Chart: Village Distribution ---
        const villageCtx = document.getElementById('villageDistributionChart').getContext('2d');
        const villageData = data.charactersPerVillage || {};
        villageChart = createPieChart(villageCtx, villageData, {
            labelTransform: v => v.charAt(0).toUpperCase() + v.slice(1),
            colors: ['#EF9A9A', '#9FB7F2', '#98D8A7']
        });

        // --- Chart: Race Distribution ---
        const raceCtx = document.getElementById('raceDistributionChart').getContext('2d');
        const raceEntries = Object.entries(data.charactersPerRace || {}).sort((a, b) => a[0].localeCompare(b[0]));
        const raceData = Object.fromEntries(raceEntries);
        raceChart = createBarChart(raceCtx, raceData, {
            colors: [
                '#FF9999', '#FFD27A', '#FFF066', '#A6F29A', '#6EEEDD', '#8FCBFF',
                '#B89CFF', '#F78CD2', '#8CE6C0', '#FFDB66', '#BFBFBF'
              ],
            yMax: isMobile ? 20 : 25
        });

        // --- Chart: Job Distribution ---
        const jobCtx = document.getElementById('jobDistributionChart').getContext('2d');
        const jobEntries = Object.entries(data.charactersPerJob || {})
            .filter(([job, count]) => job && typeof count === 'number' && count > 0)
            .sort((a, b) => a[0].localeCompare(b[0]));
        const jobData = Object.fromEntries(jobEntries);

        if (Object.keys(jobData).length === 0) {
            document.querySelector('#jobDistributionChart').parentElement.innerHTML =
                '<div style="text-align: center; color: #FFFFFF; padding: 20px;">No job data available</div>';
        } else {
            jobChart = createBarChart(jobCtx, jobData, {
                colors: [
                    '#FF9999', '#FFD27A', '#FFF066', '#A6F29A', '#6EEEDD',
                    '#8FCBFF', '#B89CFF', '#F78CD2', '#8CE6C0', '#FFDB66',
                    '#BFBFBF', '#D6AEFA', '#7BEFC3', '#FFC3A0', '#AAB6FF', '#FFB3B3'
                  ],
                yMax: isMobile ? 12 : 15
            });
        }
    } catch (err) {
        document.getElementById('stats-total-characters').textContent = 'Error';
        console.error('Error loading stats:', err);
    }
}

// ============================================================================
// ------------------- Exports -------------------
// Shared functions for use in other modules
// ============================================================================
export {
    initStatsPage
};
