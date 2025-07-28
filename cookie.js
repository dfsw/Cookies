// Simple test to see if script executes
console.log('Just Natural Expansion: Script is being executed!');
alert('Just Natural Expansion: Script is being executed!');

// Basic mod structure
Game.Win('Third-party');

var JustNaturalExpansion = {};
JustNaturalExpansion.name = 'Just Natural Expansion';
JustNaturalExpansion.version = '1.00';
JustNaturalExpansion.GameVersion = '2.052';

console.log('Just Natural Expansion: Basic setup complete');

// Simple test function
JustNaturalExpansion.test = function() {
    console.log('Just Natural Expansion: Test function called');
    Game.Popup('Just Natural Expansion: Test function called!');
};

// Try to run test after a short delay
setTimeout(function() {
    console.log('Just Natural Expansion: Timeout executed');
    JustNaturalExpansion.test();
}, 1000);