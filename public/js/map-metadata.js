/**
 * Map Metadata - Square status and region information
 * Handles square metadata including status and region data
 */

class MapMetadata {
    constructor() {
        this.squareData = new Map();
        this.initializeSquareData();
    }
    
    /**
     * Initialize square data from CSV data
     */
    initializeSquareData() {
        // CSV data from "Expliring new 2025 - Sheet1.csv"
        const csvData = [
            { square: 'J1', letter: 'J', number: 1, region: 'Eldin', status: 'Inaccessible' },
            { square: 'J2', letter: 'J', number: 2, region: 'Eldin', status: 'Inaccessible' },
            { square: 'J3', letter: 'J', number: 3, region: 'Eldin', status: 'Inaccessible' },
            { square: 'J4', letter: 'J', number: 4, region: 'Eldin', status: 'Inaccessible' },
            { square: 'J5', letter: 'J', number: 5, region: 'Eldin', status: 'Inaccessible' },
            { square: 'J6', letter: 'J', number: 6, region: 'Central Hyrule', status: 'Inaccessible' },
            { square: 'J7', letter: 'J', number: 7, region: 'Hebra', status: 'Inaccessible' },
            { square: 'J8', letter: 'J', number: 8, region: 'Hebra', status: 'Inaccessible' },
            { square: 'J9', letter: 'J', number: 9, region: 'Hebra', status: 'Inaccessible' },
            { square: 'J10', letter: 'J', number: 10, region: 'Hebra', status: 'Inaccessible' },
            { square: 'J11', letter: 'J', number: 11, region: 'Hebra', status: 'Inaccessible' },
            { square: 'J12', letter: 'J', number: 12, region: 'Hebra', status: 'Inaccessible' },
            { square: 'I1', letter: 'I', number: 1, region: 'Eldin', status: 'Inaccessible' },
            { square: 'I2', letter: 'I', number: 2, region: 'Eldin', status: 'Explorable' },
            { square: 'I3', letter: 'I', number: 3, region: 'Eldin', status: 'Explorable' },
            { square: 'I4', letter: 'I', number: 4, region: 'Eldin', status: 'Explorable' },
            { square: 'I5', letter: 'I', number: 5, region: 'Eldin', status: 'Explorable' },
            { square: 'I6', letter: 'I', number: 6, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'I7', letter: 'I', number: 7, region: 'Hebra', status: 'Explorable' },
            { square: 'I8', letter: 'I', number: 8, region: 'Hebra', status: 'Explorable' },
            { square: 'I9', letter: 'I', number: 9, region: 'Hebra', status: 'Explorable' },
            { square: 'I10', letter: 'I', number: 10, region: 'Hebra', status: 'Explorable' },
            { square: 'I11', letter: 'I', number: 11, region: 'Hebra', status: 'Explorable' },
            { square: 'I12', letter: 'I', number: 12, region: 'Hebra', status: 'Inaccessible' },
            { square: 'H1', letter: 'H', number: 1, region: 'Eldin', status: 'Inaccessible' },
            { square: 'H2', letter: 'H', number: 2, region: 'Eldin', status: 'Explorable' },
            { square: 'H3', letter: 'H', number: 3, region: 'Eldin', status: 'Explorable' },
            { square: 'H4', letter: 'H', number: 4, region: 'Eldin', status: 'Explorable' },
            { square: 'H5', letter: 'H', number: 5, region: 'Eldin', status: 'Explorable' },
            { square: 'H6', letter: 'H', number: 6, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'H7', letter: 'H', number: 7, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'H8', letter: 'H', number: 8, region: 'Hebra', status: 'Explorable' },
            { square: 'H9', letter: 'H', number: 9, region: 'Hebra', status: 'Explorable' },
            { square: 'H10', letter: 'H', number: 10, region: 'Hebra', status: 'Explorable' },
            { square: 'H11', letter: 'H', number: 11, region: 'Hebra', status: 'Explorable' },
            { square: 'H12', letter: 'H', number: 12, region: 'Hebra', status: 'Inaccessible' },
            { square: 'G1', letter: 'G', number: 1, region: 'Eldin', status: 'Inaccessible' },
            { square: 'G2', letter: 'G', number: 2, region: 'Eldin', status: 'Explorable' },
            { square: 'G3', letter: 'G', number: 3, region: 'Eldin', status: 'Explorable' },
            { square: 'G4', letter: 'G', number: 4, region: 'Eldin', status: 'Explorable' },
            { square: 'G5', letter: 'G', number: 5, region: 'Eldin', status: 'Explorable' },
            { square: 'G6', letter: 'G', number: 6, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'G7', letter: 'G', number: 7, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'G8', letter: 'G', number: 8, region: 'Hebra', status: 'Explorable' },
            { square: 'G9', letter: 'G', number: 9, region: 'Hebra', status: 'Explorable' },
            { square: 'G10', letter: 'G', number: 10, region: 'Hebra', status: 'Explorable' },
            { square: 'G11', letter: 'G', number: 11, region: 'Hebra', status: 'Inaccessible' },
            { square: 'G12', letter: 'G', number: 12, region: 'Hebra', status: 'Inaccessible' },
            { square: 'F1', letter: 'F', number: 1, region: 'Lanayru', status: 'Inaccessible' },
            { square: 'F2', letter: 'F', number: 2, region: 'Lanayru', status: 'Explorable' },
            { square: 'F3', letter: 'F', number: 3, region: 'Lanayru', status: 'Explorable' },
            { square: 'F4', letter: 'F', number: 4, region: 'Eldin', status: 'Explorable' },
            { square: 'F5', letter: 'F', number: 5, region: 'Lanayru', status: 'Explorable' },
            { square: 'F6', letter: 'F', number: 6, region: 'Lanayru', status: 'Explorable' },
            { square: 'F7', letter: 'F', number: 7, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'F8', letter: 'F', number: 8, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'F9', letter: 'F', number: 9, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'F10', letter: 'F', number: 10, region: 'Hebra', status: 'Explorable' },
            { square: 'F11', letter: 'F', number: 11, region: 'Hebra', status: 'Inaccessible' },
            { square: 'F12', letter: 'F', number: 12, region: 'Hebra', status: 'Inaccessible' },
            { square: 'E1', letter: 'E', number: 1, region: 'Lanayru', status: 'Inaccessible' },
            { square: 'E2', letter: 'E', number: 2, region: 'Lanayru', status: 'Explorable' },
            { square: 'E3', letter: 'E', number: 3, region: 'Lanayru', status: 'Explorable' },
            { square: 'E4', letter: 'E', number: 4, region: 'Lanayru', status: 'Explorable' },
            { square: 'E5', letter: 'E', number: 5, region: 'Lanayru', status: 'Explorable' },
            { square: 'E6', letter: 'E', number: 6, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'E7', letter: 'E', number: 7, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'E8', letter: 'E', number: 8, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'E9', letter: 'E', number: 9, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'E10', letter: 'E', number: 10, region: 'Hebra', status: 'Explorable' },
            { square: 'E11', letter: 'E', number: 11, region: 'Hebra', status: 'Explorable' },
            { square: 'E12', letter: 'E', number: 12, region: 'Hebra', status: 'Inaccessible' },
            { square: 'D1', letter: 'D', number: 1, region: 'Lanayru', status: 'Inaccessible' },
            { square: 'D2', letter: 'D', number: 2, region: 'Lanayru', status: 'Explorable' },
            { square: 'D3', letter: 'D', number: 3, region: 'Lanayru', status: 'Explorable' },
            { square: 'D4', letter: 'D', number: 4, region: 'Lanayru', status: 'Explorable' },
            { square: 'D5', letter: 'D', number: 5, region: 'Lanayru', status: 'Explorable' },
            { square: 'D6', letter: 'D', number: 6, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'D7', letter: 'D', number: 7, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'D8', letter: 'D', number: 8, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'D9', letter: 'D', number: 9, region: 'Gerudo', status: 'Explorable' },
            { square: 'D10', letter: 'D', number: 10, region: 'Gerudo', status: 'Explorable' },
            { square: 'D11', letter: 'D', number: 11, region: 'Gerudo', status: 'Explorable' },
            { square: 'D12', letter: 'D', number: 12, region: 'Gerudo', status: 'Explorable' },
            { square: 'C1', letter: 'C', number: 1, region: 'Lanayru', status: 'Inaccessible' },
            { square: 'C2', letter: 'C', number: 2, region: 'Lanayru', status: 'Explorable' },
            { square: 'C3', letter: 'C', number: 3, region: 'Lanayru', status: 'Explorable' },
            { square: 'C4', letter: 'C', number: 4, region: 'Faron', status: 'Explorable' },
            { square: 'C5', letter: 'C', number: 5, region: 'Faron', status: 'Explorable' },
            { square: 'C6', letter: 'C', number: 6, region: 'Faron', status: 'Explorable' },
            { square: 'C7', letter: 'C', number: 7, region: 'Central Hyrule', status: 'Explorable' },
            { square: 'C8', letter: 'C', number: 8, region: 'Gerudo', status: 'Explorable' },
            { square: 'C9', letter: 'C', number: 9, region: 'Gerudo', status: 'Explorable' },
            { square: 'C10', letter: 'C', number: 10, region: 'Gerudo', status: 'Explorable' },
            { square: 'C11', letter: 'C', number: 11, region: 'Gerudo', status: 'Explorable' },
            { square: 'C12', letter: 'C', number: 12, region: 'Gerudo', status: 'Explorable' },
            { square: 'B1', letter: 'B', number: 1, region: 'Faron', status: 'Inaccessible' },
            { square: 'B2', letter: 'B', number: 2, region: 'Faron', status: 'Explorable' },
            { square: 'B3', letter: 'B', number: 3, region: 'Faron', status: 'Explorable' },
            { square: 'B4', letter: 'B', number: 4, region: 'Faron', status: 'Explorable' },
            { square: 'B5', letter: 'B', number: 5, region: 'Faron', status: 'Explorable' },
            { square: 'B6', letter: 'B', number: 6, region: 'Faron', status: 'Explorable' },
            { square: 'B7', letter: 'B', number: 7, region: 'Faron', status: 'Explorable' },
            { square: 'B8', letter: 'B', number: 8, region: 'Gerudo', status: 'Explorable' },
            { square: 'B9', letter: 'B', number: 9, region: 'Gerudo', status: 'Explorable' },
            { square: 'B10', letter: 'B', number: 10, region: 'Gerudo', status: 'Explorable' },
            { square: 'B11', letter: 'B', number: 11, region: 'Gerudo', status: 'Explorable' },
            { square: 'B12', letter: 'B', number: 12, region: 'Gerudo', status: 'Explorable' },
            { square: 'A1', letter: 'A', number: 1, region: 'Faron', status: 'Inaccessible' },
            { square: 'A2', letter: 'A', number: 2, region: 'Faron', status: 'Inaccessible' },
            { square: 'A3', letter: 'A', number: 3, region: 'Faron', status: 'Inaccessible' },
            { square: 'A4', letter: 'A', number: 4, region: 'Faron', status: 'Inaccessible' },
            { square: 'A5', letter: 'A', number: 5, region: 'Faron', status: 'Inaccessible' },
            { square: 'A6', letter: 'A', number: 6, region: 'Faron', status: 'Inaccessible' },
            { square: 'A7', letter: 'A', number: 7, region: 'Faron', status: 'Inaccessible' },
            { square: 'A8', letter: 'A', number: 8, region: 'Gerudo', status: 'Explorable' },
            { square: 'A9', letter: 'A', number: 9, region: 'Gerudo', status: 'Explorable' },
            { square: 'A10', letter: 'A', number: 10, region: 'Gerudo', status: 'Explorable' },
            { square: 'A11', letter: 'A', number: 11, region: 'Gerudo', status: 'Explorable' },
            { square: 'A12', letter: 'A', number: 12, region: 'Gerudo', status: 'Explorable' }
        ];
        
        // Populate the square data map
        csvData.forEach(data => {
            this.squareData.set(data.square, {
                square: data.square,
                letter: data.letter,
                number: data.number,
                region: data.region,
                status: data.status
            });
        });
    }
    
    /**
     * Get metadata for a specific square
     * @param {string} squareId - Square ID like "E4"
     * @returns {Object|null} Square metadata or null if not found
     */
    getSquareMetadata(squareId) {
        return this.squareData.get(squareId) || null;
    }
    
    /**
     * Get all squares in a specific region
     * @param {string} region - Region name
     * @returns {Array} Array of square IDs in the region
     */
    getSquaresByRegion(region) {
        const squares = [];
        for (const [squareId, data] of this.squareData) {
            if (data.region === region) {
                squares.push(squareId);
            }
        }
        return squares;
    }
    
    /**
     * Get all squares with a specific status
     * @param {string} status - Status like "Explorable" or "Inaccessible"
     * @returns {Array} Array of square IDs with the status
     */
    getSquaresByStatus(status) {
        const squares = [];
        for (const [squareId, data] of this.squareData) {
            if (data.status === status) {
                squares.push(squareId);
            }
        }
        return squares;
    }
    
    /**
     * Get all available regions
     * @returns {Array} Array of unique region names
     */
    getRegions() {
        const regions = new Set();
        for (const data of this.squareData.values()) {
            regions.add(data.region);
        }
        return Array.from(regions);
    }
    
    /**
     * Get all available statuses
     * @returns {Array} Array of unique status values
     */
    getStatuses() {
        const statuses = new Set();
        for (const data of this.squareData.values()) {
            statuses.add(data.status);
        }
        return Array.from(statuses);
    }
    
    /**
     * Check if a square is explorable
     * @param {string} squareId - Square ID like "E4"
     * @returns {boolean} True if square is explorable
     */
    isExplorable(squareId) {
        const metadata = this.getSquareMetadata(squareId);
        return metadata ? metadata.status === 'Explorable' : false;
    }
    
    /**
     * Check if a square is inaccessible
     * @param {string} squareId - Square ID like "E4"
     * @returns {boolean} True if square is inaccessible
     */
    isInaccessible(squareId) {
        const metadata = this.getSquareMetadata(squareId);
        return metadata ? metadata.status === 'Inaccessible' : false;
    }
    
    /**
     * Get region for a square
     * @param {string} squareId - Square ID like "E4"
     * @returns {string|null} Region name or null if not found
     */
    getRegion(squareId) {
        const metadata = this.getSquareMetadata(squareId);
        return metadata ? metadata.region : null;
    }
    
    /**
     * Get status for a square
     * @param {string} squareId - Square ID like "E4"
     * @returns {string|null} Status or null if not found
     */
    getStatus(squareId) {
        const metadata = this.getSquareMetadata(squareId);
        return metadata ? metadata.status : null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapMetadata;
}
