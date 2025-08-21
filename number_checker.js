// Number naming mismatch checker
// Checks for any numbers that don't match their UK scientific notation comments
// Keep this script for future verification

function rawFormatter(val){return Math.round(val*1000)/1000;}

var formatLong=[' thousand',' million',' billion',' trillion',' quadrillion',' quintillion',' sextillion',' septillion',' octillion',' nonillion'];
var prefixes=['','un','duo','tre','quattuor','quin','sex','septen','octo','novem'];
var suffixes=['decillion','vigintillion','trigintillion','quadragintillion','quinquagintillion','sexagintillion','septuagintillion','octogintillion','nonagintillion'];
for (var i in suffixes)
{
	for (var ii in prefixes)
	{
		formatLong.push(' '+prefixes[ii]+suffixes[i]);
	}
}

// Function to convert number to UK scientific notation words
function numberToWords(num) {
    if (num < 1000) return num.toString();
    
    let exp = Math.floor(Math.log10(num));
    let group = Math.floor((exp - 3) / 3);
    
    if (group < formatLong.length) {
        let base = num / Math.pow(10, (group + 1) * 3);
        return rawFormatter(base) + formatLong[group];
    }
    
    return num.toExponential(2);
}

// Function to scan file for mismatches
function scanFile(filePath) {
    const fs = require('fs');
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        console.log(`\n=== SCANNING ${filePath} ===`);
        
        let mismatches = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Look for lines with price: and scientific notation
            const priceMatch = line.match(/price:\s*(\d+(?:\.\d+)?)e?(\+?)(\d+)?/i);
            if (priceMatch) {
                let price;
                if (priceMatch[3]) {
                    price = parseFloat(priceMatch[1]) * Math.pow(10, parseInt(priceMatch[3]));
                } else {
                    price = parseFloat(priceMatch[1]);
                }
                
                if (!isNaN(price) && isFinite(price)) {
                    const correctWords = numberToWords(price);
                    
                    // Look for comment on the same line
                    const commentMatch = line.match(/\/\/\s*([^\/\n]+)/);
                    if (commentMatch) {
                        const comment = commentMatch[1].trim();
                        const wordMatch = comment.match(/(\d+(?:\.\d+)?)\s+([a-z]+)/i);
                        
                        if (wordMatch) {
                            const commentWords = wordMatch[2];
                            if (!correctWords.includes(commentWords)) {
                                mismatches.push({
                                    line: i + 1,
                                    price: price,
                                    original: priceMatch[0],
                                    comment: comment,
                                    expected: correctWords,
                                    fullLine: line.trim()
                                });
                            }
                        }
                    }
                }
            }
        }
        
        if (mismatches.length > 0) {
            console.log(`\n🚨 MISMATCHES FOUND (${mismatches.length}):`);
            mismatches.forEach((mismatch, index) => {
                console.log(`\n${index + 1}. Line ${mismatch.line}:`);
                console.log(`   Price: ${mismatch.price} (${mismatch.original})`);
                console.log(`   Comment: "${mismatch.comment}"`);
                console.log(`   Expected: "${mismatch.expected}"`);
                console.log(`   Full line: ${mismatch.fullLine}`);
            });
        } else {
            console.log(`✅ No mismatches found in ${filePath}`);
        }
        
        return mismatches;
        
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return [];
    }
}

// Main execution
console.log('=== NUMBER NAMING MISMATCH CHECKER ===');

const files = ['Cookie.js', 'upgrades.js'];
let totalMismatches = 0;

files.forEach(file => {
    const mismatches = scanFile(file);
    totalMismatches += mismatches.length;
});

console.log(`\n=== SUMMARY ===`);
console.log(`Total mismatches found: ${totalMismatches}`);
if (totalMismatches === 0) {
    console.log('🎉 All number names are accurate!');
} else {
    console.log('⚠️  Please fix the mismatches above.');
} 