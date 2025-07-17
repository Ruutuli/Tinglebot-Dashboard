// Debug logging for file loading and paths

// Function to check if a file exists
async function checkFileExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.status === 200;
    } catch (error) {
        console.error(`Error checking file ${url}:`, error);
        return false;
    }
}

// Check CSS file
checkFileExists('css/styles.css');

// Monitor network requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    return originalFetch.apply(this, args);
};

// Log any errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.message, 'at', event.filename, ':', event.lineno);
}); 