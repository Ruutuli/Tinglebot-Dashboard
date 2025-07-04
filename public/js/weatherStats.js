/* ====================================================================== */
/* Weather Statistics Module                                              */
/* Handles weather data analysis, trends, and historical statistics       */
/* ====================================================================== */

import { scrollToTop } from './ui.js';

// ============================================================================
// ------------------- Weather Data Management -------------------
// Fetches and processes weather data for statistics
// ============================================================================

// Weather data cache
let weatherStatsCache = {
  data: null,
  timestamp: 0,
  CACHE_DURATION: 10 * 60 * 1000 // 10 minutes
};

// Weather emoji mappings
const weatherEmojis = {
  temperature: {
    "0°F / -18°C - Frigid": "🥶",
    "8°F / -14°C - Freezing": "🐧",
    "24°F / -4°C - Cold": "☃️",
    "36°F / 2°C - Chilly": "🧊",
    "44°F / 6°C - Brisk": "🔷",
    "52°F / 11°C - Cool": "🆒",
    "61°F / 16°C - Mild": "😐",
    "72°F / 22°C - Perfect": "👌",
    "82°F / 28°C - Warm": "🌡️",
    "89°F / 32°C - Hot": "🌶️",
    "97°F / 36°C - Scorching": "🥵",
    "100°F / 38°C - Heat Wave": "💯"
  },
  wind: {
    "< 2(km/h) // Calm": "😌",
    "2 - 12(km/h) // Breeze": "🎐",
    "13 - 30(km/h) // Moderate": "🍃",
    "31 - 40(km/h) // Fresh": "🌬️",
    "41 - 62(km/h) // Strong": "💫",
    "63 - 87(km/h) // Gale": "💨",
    "88 - 117(km/h) // Storm": "🌀",
    ">= 118(km/h) // Hurricane": "🌪️"
  },
  precipitation: {
    "Blizzard": "❄️",
    "Cinder Storm": "🔥",
    "Cloudy": "☁️",
    "Fog": "🌫️",
    "Hail": "☁️🧊",
    "Heat Lightning": "🌡️⚡",
    "Heavy Rain": "🌧️",
    "Heavy Snow": "🌨️",
    "Light Rain": "☔",
    "Light Snow": "🌨️",
    "Partly cloudy": "⛅",
    "Rain": "🌧️",
    "Rainbow": "🌈",
    "Sleet": "☁️🧊",
    "Snow": "🌨️",
    "Sun Shower": "🌦️",
    "Sunny": "☀️",
    "Thundersnow": "🌨️⚡",
    "Thunderstorm": "⛈️"
  },
  special: {
    "Avalanche": "🏔️",
    "Blight Rain": "🌧️🧿",
    "Drought": "🌵",
    "Fairy Circle": "🍄",
    "Flood": "🌊",
    "Flower Bloom": "🌼",
    "Jubilee": "🐟",
    "Meteor Shower": "☄️",
    "Muggy": "🐛",
    "Rock Slide": "⛏️"
  }
};

// Village colors for styling
const villageColors = {
  'Rudania': {
    primary: '#FF6B6B',
    secondary: '#FF8E8E',
    background: 'rgba(255, 107, 107, 0.1)'
  },
  'Inariko': {
    primary: '#4ECDC4',
    secondary: '#6EDDD6',
    background: 'rgba(78, 205, 196, 0.1)'
  },
  'Vhintl': {
    primary: '#45B7D1',
    secondary: '#67C7DD',
    background: 'rgba(69, 183, 209, 0.1)'
  }
};

// Season images
const seasonImages = {
  'spring': '/images/seasons/spring.png',
  'summer': '/images/seasons/summer.png',
  'fall': '/images/seasons/fall.png',
  'winter': '/images/seasons/winter.png'
};

// Village crest images
const villageCrests = {
  'Rudania': '/images/icons/[RotW] village crest_rudania_.png',
  'Inariko': '/images/icons/[RotW] village crest_inariko_.png',
  'Vhintl': '/images/icons/[RotW] village crest_vhintl_.png'
};

// ============================================================================
// ------------------- Data Fetching Functions -------------------
// Retrieves weather data from the API
// ============================================================================

/**
 * Fetches weather history for all villages
 */
async function fetchWeatherHistory(days = 30) {
  try {
    console.log(`[weatherStats.js]: 🌤️ Fetching ${days} days of weather history...`);
    
    // Use the new stats endpoint for better performance
    const response = await fetch(`/api/weather/stats?days=${days}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[weatherStats.js]: ✅ Weather history fetched for ${Object.keys(data.villages).length} villages`);
    return data.villages;
  } catch (error) {
    console.error('[weatherStats.js]: ❌ Error fetching weather history:', error);
    throw error;
  }
}

/**
 * Gets cached weather data or fetches new data if cache is expired
 */
async function getWeatherStatsData(days = 30) {
  const now = Date.now();
  
  // Check if cache is valid
  if (weatherStatsCache.data && (now - weatherStatsCache.timestamp) < weatherStatsCache.CACHE_DURATION) {
    console.log('[weatherStats.js]: 📦 Using cached weather stats data');
    return weatherStatsCache.data;
  }
  
  // Fetch fresh data
  const data = await fetchWeatherHistory(days);
  
  // Update cache
  weatherStatsCache.data = data;
  weatherStatsCache.timestamp = now;
  
  return data;
}

// ============================================================================
// ------------------- Data Analysis Functions -------------------
// Processes weather data to generate statistics
// ============================================================================

/**
 * Analyzes weather patterns for a village
 */
function analyzeWeatherPatterns(weatherData, village) {
  if (!weatherData || !weatherData[village]) return null;
  
  const data = weatherData[village];
  const analysis = {
    village,
    totalDays: data.length,
    seasons: {},
    temperatures: {},
    winds: {},
    precipitations: {},
    specials: {},
    trends: {}
  };
  
  // Count occurrences
  data.forEach(day => {
    // Seasons
    if (day.season) {
      analysis.seasons[day.season] = (analysis.seasons[day.season] || 0) + 1;
    }
    
    // Temperatures
    if (day.temperature?.label) {
      analysis.temperatures[day.temperature.label] = (analysis.temperatures[day.temperature.label] || 0) + 1;
    }
    
    // Winds
    if (day.wind?.label) {
      analysis.winds[day.wind.label] = (analysis.winds[day.wind.label] || 0) + 1;
    }
    
    // Precipitations
    if (day.precipitation?.label) {
      analysis.precipitations[day.precipitation.label] = (analysis.precipitations[day.precipitation.label] || 0) + 1;
    }
    
    // Special weather
    if (day.special?.label && day.special.label !== 'None') {
      analysis.specials[day.special.label] = (analysis.specials[day.special.label] || 0) + 1;
    }
  });
  
  // Calculate percentages
  Object.keys(analysis.seasons).forEach(season => {
    analysis.seasons[season] = {
      count: analysis.seasons[season],
      percentage: ((analysis.seasons[season] / analysis.totalDays) * 100).toFixed(1)
    };
  });
  
  Object.keys(analysis.temperatures).forEach(temp => {
    analysis.temperatures[temp] = {
      count: analysis.temperatures[temp],
      percentage: ((analysis.temperatures[temp] / analysis.totalDays) * 100).toFixed(1)
    };
  });
  
  Object.keys(analysis.winds).forEach(wind => {
    analysis.winds[wind] = {
      count: analysis.winds[wind],
      percentage: ((analysis.winds[wind] / analysis.totalDays) * 100).toFixed(1)
    };
  });
  
  Object.keys(analysis.precipitations).forEach(precip => {
    analysis.precipitations[precip] = {
      count: analysis.precipitations[precip],
      percentage: ((analysis.precipitations[precip] / analysis.totalDays) * 100).toFixed(1)
    };
  });
  
  Object.keys(analysis.specials).forEach(special => {
    analysis.specials[special] = {
      count: analysis.specials[special],
      percentage: ((analysis.specials[special] / analysis.totalDays) * 100).toFixed(1)
    };
  });
  
  return analysis;
}

/**
 * Analyzes weather trends over time
 */
function analyzeWeatherTrends(weatherData, village) {
  if (!weatherData || !weatherData[village]) return null;
  
  const data = weatherData[village];
  const trends = {
    village,
    recentWeather: data.slice(0, 7), // Last 7 days
    weeklyPatterns: {},
    monthlyPatterns: {}
  };
  
  // Group by week
  const weeklyData = {};
  data.forEach(day => {
    const weekStart = new Date(day.date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = [];
    }
    weeklyData[weekKey].push(day);
  });
  
  trends.weeklyPatterns = weeklyData;
  
  return trends;
}

// ============================================================================
// ------------------- Chart Creation Functions -------------------
// Creates charts for weather statistics
// ============================================================================

/**
 * Creates a pie chart for weather distribution
 */
function createWeatherPieChart(ctx, data, title, colors) {
  const labels = Object.keys(data);
  const values = Object.values(data).map(item => item.count || item);
  const percentages = Object.values(data).map(item => item.percentage || 0);
  
  if (typeof Chart === 'undefined') {
    console.error('[weatherStats.js]: ❌ Chart.js not available');
    return null;
  }
  
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels.map((label, i) => `${label} (${percentages[i]}%)`),
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#22223B', // dark border for contrast
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          color: '#FFFFFF',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            color: '#FFFFFF',
            font: { size: 12, weight: 'bold' },
            padding: 20,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#22223B',
          titleColor: '#FFF',
          bodyColor: '#FFF',
          borderColor: '#4ECDC4',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        },
        datalabels: {
          color: '#FFF',
          font: {
            size: 12,
            weight: 'bold'
          },
          textAlign: 'center',
          textShadowColor: '#22223B',
          textShadowBlur: 6,
          formatter: function(value, context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100);
            // Only show label if segment is at least 10%
            if (percentage < 10) return '';
            return `${percentage.toFixed(0)}%`;
          }
        }
      }
    }
  });
}

/**
 * Creates a bar chart for weather frequency
 */
function createWeatherBarChart(ctx, data, title, colors) {
  const labels = Object.keys(data);
  const values = Object.values(data).map(item => item.count || item);
  const percentages = Object.values(data).map(item => item.percentage || 0);
  
  if (typeof Chart === 'undefined') {
    console.error('[weatherStats.js]: ❌ Chart.js not available');
    return null;
  }
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Frequency',
        data: values,
        backgroundColor: colors,
        borderColor: '#22223B',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          color: '#FFFFFF',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#22223B',
          titleColor: '#FFF',
          bodyColor: '#FFF',
          borderColor: '#4ECDC4',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${value} days (${percentage}%)`;
            }
          }
        },
        datalabels: {
          color: '#FFF',
          font: {
            size: 12,
            weight: 'bold'
          },
          textAlign: 'center',
          textShadowColor: '#22223B',
          textShadowBlur: 6,
          anchor: 'end',
          offset: 4,
          formatter: function(value, context) {
            // Only show label if value is at least 3
            if (value < 3) return '';
            return value;
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#FFFFFF',
            font: { size: 12, weight: 'bold' }
          },
          grid: {
            color: 'rgba(255,255,255,0.08)'
          }
        },
        x: {
          ticks: {
            color: '#FFFFFF',
            font: { size: 12, weight: 'bold' }
          },
          grid: {
            color: 'rgba(255,255,255,0.08)'
          }
        }
      }
    }
  });
}

// ============================================================================
// ------------------- Rendering Functions -------------------
// Renders weather statistics and charts
// ============================================================================

/**
 * Renders weather statistics cards
 */
function renderWeatherStatsCards(analysis) {
  if (!analysis) return '';
  
  const { village, totalDays, seasons, temperatures, winds, precipitations, specials } = analysis;
  
  return `
    <div class="weather-stats-cards">
      <div class="weather-stats-card">
        <div class="weather-stats-card-header">
          <img src="${villageCrests[village]}" alt="${village} Crest" class="weather-stats-village-crest" />
          <h3>${village} Weather Overview</h3>
        </div>
        <div class="weather-stats-card-content">
          <div class="weather-stats-summary">
            <div class="weather-stats-item">
              <span class="weather-stats-label">Total Days Analyzed:</span>
              <span class="weather-stats-value">${totalDays}</span>
            </div>
            <div class="weather-stats-item">
              <span class="weather-stats-label">Most Common Season:</span>
              <span class="weather-stats-value">
                ${Object.keys(seasons).length > 0 ? 
                  Object.entries(seasons).sort((a, b) => b[1].count - a[1].count)[0][0] : 'N/A'}
              </span>
            </div>
            <div class="weather-stats-item">
              <span class="weather-stats-label">Most Common Temperature:</span>
              <span class="weather-stats-value">
                ${Object.keys(temperatures).length > 0 ? 
                  Object.entries(temperatures).sort((a, b) => b[1].count - a[1].count)[0][0] : 'N/A'}
              </span>
            </div>
            <div class="weather-stats-item">
              <span class="weather-stats-label">Special Weather Events:</span>
              <span class="weather-stats-value">${Object.keys(specials).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders weather distribution charts
 */
function renderWeatherCharts(analysis) {
  if (!analysis) return '';
  
  const { village, seasons, temperatures, winds, precipitations, specials } = analysis;
  
  // Generate colors for charts
  const seasonColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFE66D'];
  const tempColors = [
    '#FF6B6B', '#FF8E8E', '#FFD6D6', '#FFF3B0', '#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6', '#03A9F4', '#039BE5', '#0288D1', '#22223B'
  ];
  const windColors = [
    '#4CAF50', '#388E3C', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E8', '#FFF3E0', '#FFE0B2'
  ];
  const precipColors = [
    '#2196F3', '#1565C0', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#E3F2FD', '#FFCC02', '#FF9800', '#FF5722', '#F44336', '#22223B'
  ];
  const specialColors = [
    '#9C27B0', '#E91E63', '#F44336', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#3F51B5', '#795548', '#607D8B'
  ];
  
  return `
    <div class="weather-charts-grid">
      <div class="weather-chart-card">
        <canvas id="seasons-chart-${village.toLowerCase()}"></canvas>
      </div>
      <div class="weather-chart-card">
        <canvas id="temperatures-chart-${village.toLowerCase()}"></canvas>
      </div>
      <div class="weather-chart-card">
        <canvas id="winds-chart-${village.toLowerCase()}"></canvas>
      </div>
      <div class="weather-chart-card">
        <canvas id="precipitations-chart-${village.toLowerCase()}"></canvas>
      </div>
      ${Object.keys(specials).length > 0 ? `
        <div class="weather-chart-card">
          <canvas id="specials-chart-${village.toLowerCase()}"></canvas>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Renders recent weather history
 */
function renderRecentWeather(weatherData, village) {
  if (!weatherData || !weatherData[village]) return '';
  
  const recentData = weatherData[village].slice(0, 7); // Last 7 days
  
  return `
    <div class="weather-history-section">
      <h3>Recent Weather History - ${village}</h3>
      <div class="weather-history-grid">
        ${recentData.map(day => {
          const date = new Date(day.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          
          return `
            <div class="weather-history-card">
              <div class="weather-history-date">${date}</div>
              <div class="weather-history-season">
                <img src="${seasonImages[day.season]}" alt="${day.season}" class="weather-history-season-img" />
                <span>${day.season}</span>
              </div>
              <div class="weather-history-details">
                <div class="weather-history-item">
                  <span class="weather-history-emoji">${weatherEmojis.temperature[day.temperature?.label] || '🌡️'}</span>
                  <span class="weather-history-text">${day.temperature?.label || 'Unknown'}</span>
                </div>
                <div class="weather-history-item">
                  <span class="weather-history-emoji">${weatherEmojis.wind[day.wind?.label] || '💨'}</span>
                  <span class="weather-history-text">${day.wind?.label || 'Unknown'}</span>
                </div>
                <div class="weather-history-item">
                  <span class="weather-history-emoji">${weatherEmojis.precipitation[day.precipitation?.label] || '☀️'}</span>
                  <span class="weather-history-text">${day.precipitation?.label || 'None'}</span>
                </div>
                ${day.special?.label && day.special.label !== 'None' ? `
                  <div class="weather-history-item weather-history-special">
                    <span class="weather-history-emoji">${weatherEmojis.special[day.special.label] || '✨'}</span>
                    <span class="weather-history-text">${day.special.label}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Renders the complete weather statistics page
 */
async function renderWeatherStatsPage() {
  try {
    console.log('[weatherStats.js]: 🌤️ Rendering weather statistics page...');
    
    const contentDiv = document.getElementById('model-details-data');
    if (!contentDiv) {
      console.error('[weatherStats.js]: ❌ Content div not found');
      return;
    }
    
    // Show loading state
    contentDiv.innerHTML = `
      <div class="weather-stats-loading">
        <div class="loading-spinner"></div>
        <p>Loading weather statistics...</p>
      </div>
    `;
    
    // Fetch weather data
    const weatherData = await getWeatherStatsData(30); // Last 30 days
    
    // Analyze data for each village
    const villages = ['Rudania', 'Inariko', 'Vhintl'];
    const analyses = {};
    
    villages.forEach(village => {
      analyses[village] = analyzeWeatherPatterns(weatherData, village);
    });
    
    // Render the page
    let pageHTML = `
      <div class="weather-stats-page">
        <div class="weather-stats-header">
          <h2>Weather Statistics & Analysis</h2>
          <p>Comprehensive weather data analysis for all villages over the past 30 days</p>
        </div>
    `;
    
    // Render statistics for each village
    villages.forEach(village => {
      const analysis = analyses[village];
      if (analysis) {
        pageHTML += `
          <div class="weather-village-section" style="--village-color: ${villageColors[village]?.primary || '#666'}">
            ${renderWeatherStatsCards(analysis)}
            ${renderWeatherCharts(analysis)}
            ${renderRecentWeather(weatherData, village)}
          </div>
        `;
      }
    });
    
    pageHTML += '</div>';
    
    contentDiv.innerHTML = pageHTML;
    
    // Create charts after DOM is updated
    setTimeout(() => {
      villages.forEach(village => {
        const analysis = analyses[village];
        if (analysis) {
          createWeatherChartsForVillage(analysis, village);
        }
      });
    }, 100);
    
    console.log('[weatherStats.js]: ✅ Weather statistics page rendered successfully');
  } catch (error) {
    console.error('[weatherStats.js]: ❌ Error rendering weather statistics page:', error);
    
    const contentDiv = document.getElementById('model-details-data');
    if (contentDiv) {
      contentDiv.innerHTML = `
        <div class="weather-stats-error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Failed to load weather statistics</p>
          <button class="retry-button" onclick="renderWeatherStatsPage()">Retry</button>
        </div>
      `;
    }
  }
}

/**
 * Creates all charts for a specific village
 */
function createWeatherChartsForVillage(analysis, village) {
  const { seasons, temperatures, winds, precipitations, specials } = analysis;
  
  // Generate colors
  const seasonColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFE66D'];
  const tempColors = [
    '#FF6B6B', '#FF8E8E', '#FFD6D6', '#FFF3B0', '#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6', '#03A9F4', '#039BE5', '#0288D1', '#22223B'
  ];
  const windColors = [
    '#4CAF50', '#388E3C', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E8', '#FFF3E0', '#FFE0B2'
  ];
  const precipColors = [
    '#2196F3', '#1565C0', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#E3F2FD', '#FFCC02', '#FF9800', '#FF5722', '#F44336', '#22223B'
  ];
  const specialColors = [
    '#9C27B0', '#E91E63', '#F44336', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#3F51B5', '#795548', '#607D8B'
  ];
  
  // Create charts
  if (Object.keys(seasons).length > 0) {
    const seasonsCtx = document.getElementById(`seasons-chart-${village.toLowerCase()}`);
    if (seasonsCtx) {
      createWeatherPieChart(seasonsCtx, seasons, `${village} - Season Distribution`, seasonColors);
    }
  }
  
  if (Object.keys(temperatures).length > 0) {
    const tempsCtx = document.getElementById(`temperatures-chart-${village.toLowerCase()}`);
    if (tempsCtx) {
      createWeatherBarChart(tempsCtx, temperatures, `${village} - Temperature Patterns`, tempColors);
    }
  }
  
  if (Object.keys(winds).length > 0) {
    const windsCtx = document.getElementById(`winds-chart-${village.toLowerCase()}`);
    if (windsCtx) {
      createWeatherBarChart(windsCtx, winds, `${village} - Wind Patterns`, windColors);
    }
  }
  
  if (Object.keys(precipitations).length > 0) {
    const precipCtx = document.getElementById(`precipitations-chart-${village.toLowerCase()}`);
    if (precipCtx) {
      createWeatherBarChart(precipCtx, precipitations, `${village} - Precipitation Patterns`, precipColors);
    }
  }
  
  if (Object.keys(specials).length > 0) {
    const specialsCtx = document.getElementById(`specials-chart-${village.toLowerCase()}`);
    if (specialsCtx) {
      createWeatherPieChart(specialsCtx, specials, `${village} - Special Weather Events`, specialColors);
    }
  }
}

// ============================================================================
// ------------------- Page Initialization -------------------
// Sets up the weather statistics page
// ============================================================================

/**
 * Initializes the weather statistics page
 */
async function initializeWeatherStatsPage() {
  console.log('[weatherStats.js]: 🌤️ Initializing weather statistics page...');
  
  // Scroll to top
  scrollToTop();
  
  // Render the page
  await renderWeatherStatsPage();
}

// ============================================================================
// ------------------- Exports -------------------
// Public API for weather statistics module
// ============================================================================

export {
  initializeWeatherStatsPage,
  renderWeatherStatsPage,
  fetchWeatherHistory,
  analyzeWeatherPatterns,
  analyzeWeatherTrends
}; 