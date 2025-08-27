/* ============================================================================ */
/* Stats Dashboard Script                                                       */
/* Handles initialization and rendering of character statistics charts,        */
/* activity logs, and navigation between dashboard and stats sections.         */
/* ============================================================================ */

// Chart.js is loaded globally via CDN in index.html
// Register ChartDataLabels plugin if available
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

// ============================================================================
// ------------------- State Management -------------------
// ============================================================================

// Chart instances for reuse or cleanup
let villageChart = null;
let raceChart = null;
let jobChart = null;

// ============================================================================
// ------------------- Utility Functions -------------------
// ============================================================================

// Helper: Check if device is mobile
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Helper: Format debuff end date as next midnight
function formatDebuffEndMidnight(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date.toLocaleString();
}

// Helper: Validate and clean data object
function cleanDataObject(data, type = 'unknown') {
    const cleaned = {};
    Object.entries(data || {}).forEach(([key, value]) => {
        const isValid = key && 
            key !== 'undefined' && 
            key !== 'null' && 
            key !== 'Unknown' && 
            key !== 'unknown' &&
            key !== undefined &&
            key !== null &&
            typeof key === 'string' &&
            key.trim() !== '' &&
            !key.toLowerCase().includes('undefined') &&
            !key.toLowerCase().includes('null') &&
            typeof value === 'number' && 
            value > 0;
        
        if (isValid) {
            cleaned[key] = value;
        }
    });
    return cleaned;
}

// ============================================================================
// ------------------- Chart Configuration -------------------
// ============================================================================

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
                display: false,
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
                bodyFont: { size: isMobile ? 10 : 12 },
                callbacks: {
                    title: function(context) {
                        return context[0].label || 'Unknown';
                    },
                    label: function(context) {
                        return context.parsed.y || 0;
                    }
                }
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

// ============================================================================
// ------------------- Chart Creation Functions -------------------
// ============================================================================

// Function: Create bar chart with modern styling and rounded bars
function createBarChart(ctx, data, options = {}) {
    const {
        labelTransform = v => v,
        colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
        yMax = null
    } = options;

    const cleanedData = cleanDataObject(data, 'chart');
    const labels = Object.keys(cleanedData).map(label => {
        try {
            const transformed = labelTransform(label);
            return transformed || 'Unknown';
        } catch (error) {
            return 'Unknown';
        }
    });
    const values = Object.values(cleanedData);
    const isMobile = isMobileDevice();

    const chartConfig = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderRadius: isMobile ? 4 : 8,
                barPercentage: isMobile ? 0.8 : 0.75,
                categoryPercentage: isMobile ? 0.9 : 0.85
            }]
        },
        options: getResponsiveChartOptions()
    };

    // Override y-axis max if specified
    if (yMax !== null) {
        chartConfig.options.scales.y.max = yMax;
    }

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
            formatter: (value) => {
                if (value === undefined || value === null || value === 'undefined' || value === 'null') {
                    return '';
                }
                return value;
            },
            display: (context) => {
                const value = context.dataset.data[context.dataIndex];
                return value !== undefined && value !== null && value !== 'undefined' && value !== 'null';
            }
        };
        chartConfig.plugins = [ChartDataLabels];
    }

    return new Chart(ctx, chartConfig);
}

// Function: Create pie chart with modern styling and labels
function createPieChart(ctx, data, options = {}) {
    const {
        labelTransform = v => v,
        colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
    } = options;

    const cleanedData = cleanDataObject(data, 'pie');
    const labels = Object.keys(cleanedData).map(labelTransform);
    const values = Object.values(cleanedData);
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

    // Add datalabels plugin with bigger, bolder text
    if (typeof ChartDataLabels !== 'undefined') {
        chartConfig.options.plugins.datalabels = {
            color: '#000000',
            font: {
                weight: 'bold',
                size: isMobile ? 8 : 12  // Increased from 14/18 to 16/22
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
    }

    return new Chart(ctx, chartConfig);
}

// ============================================================================
// ------------------- Responsive Chart Management -------------------
// ============================================================================

// Function: Update charts on window resize
function updateChartsOnResize() {
    const isMobile = isMobileDevice();
    
    // Update chart containers height based on screen size
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        container.style.height = isMobile ? '250px' : '400px';
    });
    
    // Update pie chart layout for responsive design
    const villageChartContainer = document.querySelector('#villageDistributionChart')?.parentElement?.parentElement;
    if (villageChartContainer && villageChartContainer.style.display === 'flex') {
        // Adjust flex layout for mobile
        if (isMobile) {
            villageChartContainer.style.flexDirection = 'column';
            villageChartContainer.style.gap = '1rem';
        } else {
            villageChartContainer.style.flexDirection = 'row';
            villageChartContainer.style.gap = '2rem';
        }
    }
    
    // Recreate charts if they exist
    if (villageChart || raceChart || jobChart) {
        initStatsPage();
    }
}

// Add window resize listener with debouncing
window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(updateChartsOnResize, 250);
});

// ============================================================================
// ------------------- HTML Generation Functions -------------------
// ============================================================================

// Helper: Generate stats table HTML
function generateStatsTable(title, headers, data) {
    if (!data || data.length === 0) {
        return `<tr><td colspan="${headers.length}">None</td></tr>`;
    }
    
    return data.map(row => {
        const cells = Array.isArray(row) ? row : Object.values(row);
        return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
    }).join('');
}

// Helper: Generate character stats section
function generateCharacterStatsSection(data) {
    return `
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
                        ${data.modCharacterStats ? `<tr>
                            <td><strong>Mod Characters</strong></td>
                            <td>${data.modCharacterStats.totalModCharacters || 0}</td>
                        </tr>` : ''}
                        <tr>
                            <td><strong>Jailed Characters</strong></td>
                            <td>${data.jailedCount || 0}</td>
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
    `;
}

// Helper: Generate status effects section
function generateStatusEffectsSection(data) {
    return `
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
                            ? data.kodCharacters.map(char => `<tr><td colspan="2">${char.name}</td></tr>`).join('')
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
                
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th colspan="2">Jailed Characters</th>
                        </tr>
                        <tr>
                            <th>Character</th>
                            <th>Release Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(data.jailedCharacters && data.jailedCharacters.length > 0)
                            ? data.jailedCharacters.map(char => `
                                <tr>
                                    <td>${char.name}</td>
                                    <td>${char.jailReleaseTime ? new Date(char.jailReleaseTime).toLocaleString() : '—'}</td>
                                </tr>
                            `).join('')
                            : '<tr><td colspan="2">None</td></tr>'
                        }
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Helper: Generate top stats section
function generateTopStatsSection(data) {
    const createTopStatTable = (title, statData) => {
        if (!statData?.names || statData.names.length === 0) {
            return `<tr><td colspan="2">No data</td></tr>`;
        }
        
        return statData.names.map((name, index) => `
            <tr>
                <td>${name}</td>
                <td>${statData.values ? statData.values[index] : statData.value || 0}</td>
            </tr>
        `).join('');
    };

    return `
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
                        ${createTopStatTable('Most Stamina', data.mostStaminaChar)}
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
                        ${createTopStatTable('Most Hearts', data.mostHeartsChar)}
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
                        ${createTopStatTable('Most Spirit Orbs', data.mostOrbsChar)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Helper: Generate mod character statistics section
function generateModCharacterStatsSection(data) {
    if (!data.modCharacterStats) return '';
    
    const modStats = data.modCharacterStats;
    const modTypes = modStats.modCharactersPerType || {};
    const modVillages = modStats.modCharactersPerVillage || {};
    
    return `
        <div class="stats-card-wide mod-characters-section">
            <h3><i class="fas fa-crown"></i> Mod Character Statistics</h3>
            <div class="mod-stats-grid">
                <div class="mod-stats-item">
                    <h4>Mod Types</h4>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(modTypes).length > 0 
                                ? Object.entries(modTypes).map(([type, count]) => `
                                    <tr>
                                        <td>${type.charAt(0).toUpperCase() + type.slice(1)}</td>
                                        <td>${count}</td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="2">No mod types available</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
                <div class="mod-stats-item">
                    <h4>Mod Characters by Village</h4>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>Village</th>
                                <th>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(modVillages).length > 0 
                                ? Object.entries(modVillages).map(([village, count]) => `
                                    <tr>
                                        <td>${village.charAt(0).toUpperCase() + village.slice(1)}</td>
                                        <td>${count}</td>
                                    </tr>
                                `).join('')
                                : '<tr><td colspan="2">No village data</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Helper: Generate visiting characters section
function generateVisitingCharactersSection(data) {
    const visitingDetails = data.visitingDetails || {};
    
    return `
        <div class="stats-card-wide visiting-characters-section">
            <h3>Visiting Characters</h3>
            <div class="visiting-villages-grid">
                ${Object.entries(visitingDetails).map(([village, characters]) => `
                    <div class="visiting-village ${village.toLowerCase()}">
                        <h4>${village.charAt(0).toUpperCase() + village.slice(1)} (${characters.length})</h4>
                        ${characters.length > 0 ? `
                            <table class="stats-table">
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
        </div>
    `;
}

// Helper: Generate jail status section
function generateJailStatusSection(data) {
    const jailedCharacters = data.jailedCharacters || [];
    
    if (jailedCharacters.length === 0) {
        return `
            <div class="stats-card-wide jail-status-section">
                <h3><i class="fas fa-lock"></i> Jail Status</h3>
                <p style="color: #aaa; text-align: center; margin: 1rem 0;">No characters are currently in jail</p>
            </div>
        `;
    }
    
    // Group jailed characters by current village
    const jailedByVillage = {};
    jailedCharacters.forEach(char => {
        const village = char.currentVillage || char.homeVillage || 'Unknown';
        if (!jailedByVillage[village]) {
            jailedByVillage[village] = [];
        }
        jailedByVillage[village].push(char);
    });
    
    return `
        <div class="stats-card-wide jail-status-section">
            <h3><i class="fas fa-lock"></i> Jail Status (${jailedCharacters.length})</h3>
            <div class="jail-villages-grid">
                ${Object.entries(jailedByVillage).map(([village, characters]) => `
                    <div class="jail-village ${village.toLowerCase()}">
                        <h4>${village.charAt(0).toUpperCase() + village.slice(1)} Jail (${characters.length})</h4>
                        <table class="stats-table">
                            <thead>
                                <tr>
                                    <th>Character</th>
                                    <th>Home Village</th>
                                    <th>Release Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${characters.map(char => `
                                    <tr>
                                        <td>${char.name}</td>
                                        <td>${char.homeVillage ? char.homeVillage.charAt(0).toUpperCase() + char.homeVillage.slice(1) : '—'}</td>
                                        <td>${char.jailReleaseTime ? new Date(char.jailReleaseTime).toLocaleString() : '—'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ============================================================================
// ------------------- Chart Initialization Functions -------------------
// ============================================================================

// Helper: Generate pie chart breakdown HTML
function generatePieChartBreakdown(data, title, colors) {
    const cleanedData = cleanDataObject(data);
    const total = Object.values(cleanedData).reduce((sum, value) => sum + value, 0);
    const isMobile = isMobileDevice();
    
    if (Object.keys(cleanedData).length === 0) {
        return '<div class="breakdown-empty">No data available</div>';
    }
    
    // Create a mapping of village names to their colors in the same order as the pie chart
    const villageColorMapping = {};
    Object.keys(cleanedData).forEach((village, index) => {
        villageColorMapping[village] = colors[index];
    });
    
    const breakdownItems = Object.entries(cleanedData)
        .sort(([,a], [,b]) => b - a) // Sort by value descending
        .map(([label, value]) => {
            const percentage = ((value / total) * 100).toFixed(1);
            // Use the exact same color as the pie chart for this village
            const color = villageColorMapping[label] || '#999999';
            return `
                <div class="breakdown-item">
                    <div class="breakdown-color" style="background-color: ${color}"></div>
                    <div class="breakdown-info">
                        <div class="breakdown-label">${label.charAt(0).toUpperCase() + label.slice(1)}</div>
                        <div class="breakdown-stats">
                            <span class="breakdown-value">${value}</span>
                            <span class="breakdown-percentage">(${percentage}%)</span>
                        </div>
                    </div>
                </div>
            `;
        })
        .join('');
    
    return `
        <div class="pie-breakdown">
            <div class="breakdown-header">
                <h4>${title}</h4>
                <div class="breakdown-total">Total: ${total}</div>
            </div>
            <div class="breakdown-list">
                ${breakdownItems}
            </div>
        </div>
    `;
}

// Function: Initialize village distribution chart
function initializeVillageChart(data) {
    const villageData = data.charactersPerVillage || {};
    const colors = ['#EF9A9A', '#9FB7F2', '#98D8A7']; // Red for Rudania, Blue for Inariko, Green for Vhintl
    const isMobile = isMobileDevice();
    
    // Update chart container to include breakdown
    const chartContainer = document.querySelector('#villageDistributionChart').parentElement;
    
    // Clear any existing breakdown sections to prevent duplicates
    const existingBreakdowns = chartContainer.querySelectorAll('.pie-breakdown');
    existingBreakdowns.forEach(breakdown => breakdown.remove());
    
    chartContainer.style.display = 'flex';
    chartContainer.style.gap = isMobile ? '1rem' : '2rem';
    chartContainer.style.alignItems = 'flex-start';
    chartContainer.style.flexDirection = isMobile ? 'column' : 'row';
    
    // Create chart wrapper
    const chartWrapper = document.createElement('div');
    chartWrapper.style.flex = '1';
    chartWrapper.style.minHeight = isMobile ? '250px' : '300px';
    
    // Move canvas to wrapper
    const canvas = document.getElementById('villageDistributionChart');
    chartWrapper.appendChild(canvas);
    
    // Create breakdown section with village-specific colors
    const breakdownWrapper = document.createElement('div');
    breakdownWrapper.style.flex = '1';
    breakdownWrapper.innerHTML = generatePieChartBreakdown(villageData, 'Village Distribution', colors);
    
    // Clear container and add new structure
    chartContainer.innerHTML = '';
    chartContainer.appendChild(chartWrapper);
    chartContainer.appendChild(breakdownWrapper);
    
    // Create chart with consistent color mapping
    const villageCtx = canvas.getContext('2d');
    villageChart = createPieChart(villageCtx, villageData, {
        labelTransform: v => v.charAt(0).toUpperCase() + v.slice(1),
        colors: colors
    });
}

// Function: Initialize race distribution chart
function initializeRaceChart(data) {
    const raceCtx = document.getElementById('raceDistributionChart').getContext('2d');
    const raceData = cleanDataObject(data.charactersPerRace, 'race');
    
    if (Object.keys(raceData).length === 0) {
        document.querySelector('#raceDistributionChart').parentElement.innerHTML =
            '<div style="text-align: center; color: #FFFFFF; padding: 20px;">No valid race data available</div>';
        return;
    }
    
    // Sort race data by count (largest to smallest)
    const sortedRaceData = Object.fromEntries(
        Object.entries(raceData).sort(([,a], [,b]) => b - a)
    );
    
    const isMobile = isMobileDevice();
    raceChart = createBarChart(raceCtx, sortedRaceData, {
        labelTransform: v => v || 'Unknown',
        colors: [
            '#FF9999', '#FFD27A', '#FFF066', '#A6F29A', '#6EEEDD', '#8FCBFF',
            '#B89CFF', '#F78CD2', '#8CE6C0', '#FFDB66', '#BFBFBF'
        ],
        yMax: isMobile ? 20 : 25
    });
}

// Function: Initialize job distribution chart
function initializeJobChart(data) {
    const jobCtx = document.getElementById('jobDistributionChart').getContext('2d');
    const jobData = cleanDataObject(data.charactersPerJob, 'job');
    
    if (Object.keys(jobData).length === 0) {
        document.querySelector('#jobDistributionChart').parentElement.innerHTML =
            '<div style="text-align: center; color: #FFFFFF; padding: 20px;">No valid job data available</div>';
        return;
    }
    
    // Sort job data by count (largest to smallest)
    const sortedJobData = Object.fromEntries(
        Object.entries(jobData).sort(([,a], [,b]) => b - a)
    );
    
    const isMobile = isMobileDevice();
    jobChart = createBarChart(jobCtx, sortedJobData, {
        labelTransform: v => v || 'Unknown',
        colors: [
            '#FF9999', '#FFD27A', '#FFF066', '#A6F29A', '#6EEEDD',
            '#8FCBFF', '#B89CFF', '#F78CD2', '#8CE6C0', '#FFDB66',
            '#BFBFBF', '#D6AEFA', '#7BEFC3', '#FFC3A0', '#AAB6FF', '#FFB3B3'
        ],
        yMax: isMobile ? 12 : 15
    });
}

// ============================================================================
// ------------------- Main Initialization Function -------------------
// ============================================================================

// Function: Initialize stats page - fetches data and renders all charts
async function initStatsPage() {
    try {
        // Fetch stats data with cache-busting
        const timestamp = Date.now();
        const res = await fetch(`/api/stats/characters?t=${timestamp}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        if (!data) throw new Error('No data received');

        // Update total characters card
        const totalCard = document.getElementById('stats-total-characters');
        const totalCardHeader = totalCard.closest('.stats-card-wide')?.querySelector('h3');
        if (totalCardHeader) totalCardHeader.textContent = 'Character Stats';
        totalCard.textContent = '';

        // Generate and append stats sections
        const totalCardParent = totalCard.closest('.stats-card-wide');
        if (totalCardParent) {
            // Remove existing extra stats
            let extraStats = totalCardParent.querySelector('.extra-stats');
            if (extraStats) extraStats.remove();

            // Create new extra stats section
            extraStats = document.createElement('div');
            extraStats.className = 'extra-stats';
            extraStats.style.marginTop = '1.5rem';
            extraStats.innerHTML = 
                generateCharacterStatsSection(data) +
                generateStatusEffectsSection(data) +
                generateTopStatsSection(data);
            
            totalCardParent.appendChild(extraStats);
        }

        // Remove existing sections
        let debuffedSection = document.querySelector('.debuffed-characters-section');
        if (debuffedSection) debuffedSection.remove();

        let visitingSection = document.querySelector('.visiting-characters-section');
        if (visitingSection) visitingSection.remove();
        
        // Add visiting characters section
        visitingSection = document.createElement('div');
        visitingSection.innerHTML = generateVisitingCharactersSection(data);
        
        // Insert after the first stats card
        const firstStatsCard = document.querySelector('#stats-section .stats-card-wide');
        if (firstStatsCard) {
            firstStatsCard.parentNode.insertBefore(visitingSection.firstElementChild, firstStatsCard.nextSibling);
        }
        
        // Add jail status section
        const jailStatusSection = document.createElement('div');
        jailStatusSection.innerHTML = generateJailStatusSection(data);
        
        // Insert after the visiting characters section
        if (visitingSection.firstElementChild) {
            visitingSection.firstElementChild.parentNode.insertBefore(jailStatusSection.firstElementChild, visitingSection.firstElementChild.nextSibling);
        }
        
        // Add mod character statistics section
        const modStatsSection = document.createElement('div');
        modStatsSection.innerHTML = generateModCharacterStatsSection(data);
        
        // Insert after the jail status section
        if (jailStatusSection.firstElementChild) {
            jailStatusSection.firstElementChild.parentNode.insertBefore(modStatsSection.firstElementChild, jailStatusSection.firstElementChild.nextSibling);
        }

        // Clean up existing charts
        if (villageChart) villageChart.destroy();
        if (raceChart) raceChart.destroy();
        if (jobChart) jobChart.destroy();

        // Set responsive chart container heights
        const isMobile = isMobileDevice();
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            container.style.height = isMobile ? '250px' : '400px';
        });

        // Initialize all charts
        initializeVillageChart(data);
        initializeRaceChart(data);
        initializeJobChart(data);

    } catch (err) {
        document.getElementById('stats-total-characters').textContent = 'Error';
        console.error('Error loading stats:', err);
    }
}

// ============================================================================
// ------------------- Exports -------------------
// ============================================================================

export {
    initStatsPage
};
