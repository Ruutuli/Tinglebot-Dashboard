#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const css = require('css');

/**
 * CSS Duplicate Style Checker
 * 
 * This script analyzes CSS files to find:
 * - Duplicate selectors
 * - Duplicate property-value pairs
 * - Similar rules that could be consolidated
 * - Unused or redundant styles
 */

class CSSDuplicateChecker {
    constructor() {
        this.duplicates = {
            selectors: new Map(),
            properties: new Map(),
            similarRules: []
        };
        this.cssFiles = [];
        this.allRules = [];
    }

    /**
     * Find all CSS files in the given directory
     */
    findCSSFiles(dir) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            
            if (file.isDirectory()) {
                this.findCSSFiles(fullPath);
            } else if (file.name.endsWith('.css')) {
                this.cssFiles.push(fullPath);
            }
        }
    }

    /**
     * Parse CSS file and extract rules
     */
    parseCSSFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const ast = css.parse(content);
            
            if (ast.stylesheet && ast.stylesheet.rules) {
                ast.stylesheet.rules.forEach(rule => {
                    if (rule.type === 'rule') {
                        this.allRules.push({
                            file: filePath,
                            selectors: rule.selectors,
                            declarations: rule.declarations,
                            line: rule.position ? rule.position.start.line : 0
                        });
                    }
                });
            }
        } catch (error) {
            console.error(`Error parsing ${filePath}:`, error.message);
        }
    }

    /**
     * Check for duplicate selectors
     */
    checkDuplicateSelectors() {
        const selectorMap = new Map();
        
        this.allRules.forEach(rule => {
            rule.selectors.forEach(selector => {
                const normalizedSelector = this.normalizeSelector(selector);
                
                if (!selectorMap.has(normalizedSelector)) {
                    selectorMap.set(normalizedSelector, []);
                }
                
                selectorMap.get(normalizedSelector).push({
                    file: rule.file,
                    line: rule.line,
                    fullRule: rule
                });
            });
        });

        // Find duplicates
        for (const [selector, occurrences] of selectorMap) {
            if (occurrences.length > 1) {
                this.duplicates.selectors.set(selector, occurrences);
            }
        }
    }

    /**
     * Check for duplicate property-value pairs
     */
    checkDuplicateProperties() {
        const propertyMap = new Map();
        
        this.allRules.forEach(rule => {
            rule.declarations.forEach(declaration => {
                if (declaration.type === 'declaration') {
                    const key = `${declaration.property}:${declaration.value}`;
                    
                    if (!propertyMap.has(key)) {
                        propertyMap.set(key, []);
                    }
                    
                    propertyMap.get(key).push({
                        file: rule.file,
                        line: rule.line,
                        selector: rule.selectors.join(', '),
                        property: declaration.property,
                        value: declaration.value
                    });
                }
            });
        });

        // Find duplicates
        for (const [propertyValue, occurrences] of propertyMap) {
            if (occurrences.length > 1) {
                this.duplicates.properties.set(propertyValue, occurrences);
            }
        }
    }

    /**
     * Check for similar rules that could be consolidated
     */
    checkSimilarRules() {
        const ruleGroups = new Map();
        
        this.allRules.forEach(rule => {
            const properties = rule.declarations
                .filter(d => d.type === 'declaration')
                .map(d => `${d.property}:${d.value}`)
                .sort()
                .join(';');
            
            if (!ruleGroups.has(properties)) {
                ruleGroups.set(properties, []);
            }
            
            ruleGroups.get(properties).push({
                file: rule.file,
                line: rule.line,
                selectors: rule.selectors,
                properties: properties
            });
        });

        // Find similar rules
        for (const [properties, rules] of ruleGroups) {
            if (rules.length > 1) {
                this.duplicates.similarRules.push({
                    properties: properties,
                    rules: rules
                });
            }
        }
    }

    /**
     * Normalize selector for comparison
     */
    normalizeSelector(selector) {
        return selector
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ',')
            .trim();
    }

    /**
     * Generate report
     */
    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('CSS DUPLICATE STYLES REPORT');
        console.log('='.repeat(80));
        
        console.log(`\nAnalyzed ${this.cssFiles.length} CSS files:`);
        this.cssFiles.forEach(file => {
            console.log(`  - ${file}`);
        });

        // Duplicate Selectors
        if (this.duplicates.selectors.size > 0) {
            console.log('\n' + '-'.repeat(40));
            console.log('DUPLICATE SELECTORS');
            console.log('-'.repeat(40));
            
            for (const [selector, occurrences] of this.duplicates.selectors) {
                console.log(`\nSelector: ${selector}`);
                console.log(`Found ${occurrences.length} times:`);
                occurrences.forEach(occurrence => {
                    console.log(`  - ${occurrence.file}:${occurrence.line}`);
                });
            }
        }

        // Duplicate Properties
        if (this.duplicates.properties.size > 0) {
            console.log('\n' + '-'.repeat(40));
            console.log('DUPLICATE PROPERTY-VALUE PAIRS');
            console.log('-'.repeat(40));
            
            for (const [propertyValue, occurrences] of this.duplicates.properties) {
                const [property, value] = propertyValue.split(':');
                console.log(`\nProperty: ${property} = ${value}`);
                console.log(`Found ${occurrences.length} times:`);
                occurrences.forEach(occurrence => {
                    console.log(`  - ${occurrence.file}:${occurrence.line} (${occurrence.selector})`);
                });
            }
        }

        // Similar Rules
        if (this.duplicates.similarRules.length > 0) {
            console.log('\n' + '-'.repeat(40));
            console.log('SIMILAR RULES (Potential Consolidation)');
            console.log('-'.repeat(40));
            
            this.duplicates.similarRules.forEach((group, index) => {
                console.log(`\nGroup ${index + 1}:`);
                console.log(`Properties: ${group.properties}`);
                console.log(`Found ${group.rules.length} similar rules:`);
                group.rules.forEach(rule => {
                    console.log(`  - ${rule.file}:${rule.line} (${rule.selectors.join(', ')})`);
                });
            });
        }

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total CSS files analyzed: ${this.cssFiles.length}`);
        console.log(`Total CSS rules found: ${this.allRules.length}`);
        console.log(`Duplicate selectors: ${this.duplicates.selectors.size}`);
        console.log(`Duplicate properties: ${this.duplicates.properties.size}`);
        console.log(`Similar rule groups: ${this.duplicates.similarRules.length}`);
        
        if (this.duplicates.selectors.size === 0 && 
            this.duplicates.properties.size === 0 && 
            this.duplicates.similarRules.length === 0) {
            console.log('\n✅ No duplicates found! Your CSS is clean.');
        } else {
            console.log('\n⚠️  Found potential issues. Consider consolidating duplicate styles.');
        }
    }

    /**
     * Export results to JSON file
     */
    exportResults(outputFile = 'css-duplicates-report.json') {
        const report = {
            timestamp: new Date().toISOString(),
            filesAnalyzed: this.cssFiles,
            totalRules: this.allRules.length,
            duplicates: {
                selectors: Object.fromEntries(this.duplicates.selectors),
                properties: Object.fromEntries(this.duplicates.properties),
                similarRules: this.duplicates.similarRules
            }
        };

        fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
        console.log(`\n📄 Report exported to: ${outputFile}`);
    }

    /**
     * Generate a clean, easy-to-read text report
     */
    generateCleanReport(outputFile = 'css-duplicates-clean-report.txt') {
        let report = '';
        report += '==============================\n';
        report += 'CSS DUPLICATE CLEAN REPORT\n';
        report += '==============================\n\n';
        report += `Analyzed ${this.cssFiles.length} CSS files.\n`;
        report += `Total CSS rules: ${this.allRules.length}\n\n`;

        // Duplicate Selectors
        report += '--- DUPLICATE SELECTORS ---\n';
        if (this.duplicates.selectors.size > 0) {
            for (const [selector, occurrences] of this.duplicates.selectors) {
                report += `Selector: ${selector}\n`;
                occurrences.forEach(occ => {
                    report += `  - ${occ.file}:${occ.line}\n`;
                });
                report += '\n';
            }
        } else {
            report += 'No duplicate selectors found.\n\n';
        }

        // Duplicate Properties
        report += '--- DUPLICATE PROPERTY-VALUE PAIRS ---\n';
        if (this.duplicates.properties.size > 0) {
            for (const [propertyValue, occurrences] of this.duplicates.properties) {
                const [property, value] = propertyValue.split(':');
                report += `Property: ${property} = ${value}\n`;
                occurrences.forEach(occ => {
                    report += `  - ${occ.file}:${occ.line} (${occ.selector})\n`;
                });
                report += '\n';
            }
        } else {
            report += 'No duplicate property-value pairs found.\n\n';
        }

        // Similar Rules
        report += '--- SIMILAR RULE GROUPS (Potential Consolidation) ---\n';
        if (this.duplicates.similarRules.length > 0) {
            this.duplicates.similarRules.forEach((group, idx) => {
                report += `Group ${idx + 1}:\n`;
                report += `  Properties: ${group.properties}\n`;
                group.rules.forEach(rule => {
                    report += `    - ${rule.file}:${rule.line} (${rule.selectors.join(', ')})\n`;
                });
                report += '\n';
            });
        } else {
            report += 'No similar rule groups found.\n\n';
        }

        report += '==============================\n';
        report += 'End of Report\n';
        report += '==============================\n';

        fs.writeFileSync(outputFile, report);
        console.log(`\n📝 Clean report exported to: ${outputFile}`);
    }

    /**
     * Main analysis method
     */
    analyze(directory = '.') {
        console.log('🔍 Scanning for CSS files...');
        this.findCSSFiles(directory);
        
        if (this.cssFiles.length === 0) {
            console.log('❌ No CSS files found in the specified directory.');
            return;
        }

        console.log(`📁 Found ${this.cssFiles.length} CSS files. Analyzing...`);
        
        this.cssFiles.forEach(file => {
            this.parseCSSFile(file);
        });

        console.log('🔍 Checking for duplicates...');
        this.checkDuplicateSelectors();
        this.checkDuplicateProperties();
        this.checkSimilarRules();

        this.generateReport();
        this.exportResults();
        this.generateCleanReport();
    }
}

// CLI Usage
if (require.main === module) {
    const checker = new CSSDuplicateChecker();
    const directory = process.argv[2] || '.';
    
    console.log('CSS Duplicate Style Checker');
    console.log('==========================');
    console.log(`Analyzing directory: ${directory}`);
    
    checker.analyze(directory);
}

module.exports = CSSDuplicateChecker; 