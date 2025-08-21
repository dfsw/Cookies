// Script to fix building upgrade icons based on correct thresholds
const fs = require('fs');

// Read the current Cookie.js file
let content = fs.readFileSync('Cookie.js', 'utf8');

// Define the correct icon mapping for each building
// Format: [buildingName, iconRow, threshold1, threshold2, threshold3, threshold4, threshold5]
const buildingIconMapping = [
    ['Grandma', 0, 800, 900, 1000, 1100, 1200],
    ['Farm', 2, 800, 900, 1000, 1100, 1200],
    ['Mine', 3, 800, 900, 1000, 1100, 1200],
    ['Factory', 4, 800, 900, 1000, 1100, 1200],
    ['Bank', 5, 800, 900, 1000, 1100, 1200],
    ['Temple', 6, 800, 900, 1000, 1100, 1200],
    ['Wizard tower', 7, 800, 900, 1000, 1100, 1200],
    ['Shipment', 8, 800, 900, 1000, 1100, 1200],
    ['Alchemy lab', 9, 800, 900, 1000, 1100, 1200],
    ['Portal', 10, 800, 900, 1000, 1100, 1200],
    ['Time machine', 11, 800, 900, 1000, 1100, 1200],
    ['Antimatter condenser', 12, 800, 900, 1000, 1100, 1200],
    ['Prism', 13, 800, 900, 1000, 1100, 1200],
    ['Chancemaker', 14, 800, 900, 1000, 1100, 1200],
    ['Fractal engine', 15, 800, 900, 1000, 1100, 1200],
    ['Javascript console', 16, 800, 900, 1000, 1100, 1200],
    ['Idleverse', 17, 800, 900, 1000, 1100, 1200],
    ['Cortex baker', 18, 800, 900, 1000, 1100, 1200],
    ['You', 19, 800, 900, 1000, 1100, 1200]
];

// Define the correct icon columns for each threshold
const iconColumns = [21, 26, 29, 30, 31]; // These correspond to the achievement icons for different thresholds

console.log('Checking and fixing building upgrade icons...');

// Process each building
buildingIconMapping.forEach(([buildingName, iconRow, ...thresholds]) => {
    console.log(`\nProcessing ${buildingName} (row ${iconRow}):`);
    
    // Find all upgrades for this building
    const buildingUpgrades = content.match(new RegExp(`name: '[^']*',\\s*desc: '${buildingName}[^']*',\\s*ddesc: '[^']*',\\s*price: [^,]*,\\s*icon: \\[([^\\]]+)\\],\\s*pool: '[^']*',\\s*building: '${buildingName}'`, 'g'));
    
    if (buildingUpgrades) {
        console.log(`Found ${buildingUpgrades.length} upgrades for ${buildingName}`);
        
        // Update each upgrade with correct icon
        thresholds.forEach((threshold, index) => {
            const correctIcon = `[${iconRow}, ${iconColumns[index]}]`;
            const thresholdMatch = threshold.toString();
            
            // Find the specific upgrade for this threshold
            const upgradePattern = new RegExp(`(name: '[^']*',\\s*desc: '${buildingName}[^']*',\\s*ddesc: '[^']*',\\s*price: [^,]*,\\s*)icon: \\[[^\\]]+\\],(\\s*pool: '[^']*',\\s*building: '${buildingName}',\\s*unlockCondition: function\\(\\) {\\s*return Game\\.Objects\\['${buildingName}'\\] && Game\\.Objects\\['${buildingName}'\\.amount >= ${thresholdMatch};)`, 'g');
            
            content = content.replace(upgradePattern, `$1icon: ${correctIcon},$2`);
            
            console.log(`  Threshold ${threshold}: Updated to ${correctIcon}`);
        });
    } else {
        console.log(`No upgrades found for ${buildingName}`);
    }
});

// Write the updated content back to the file
fs.writeFileSync('Cookie.js', content);

console.log('\nAll building upgrade icons have been fixed!'); 