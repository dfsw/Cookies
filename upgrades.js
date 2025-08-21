// TestUpgradesMod2 - Simple test bed for upgrade functionality
// This is a test bed for testing out functionality before moving it into the main mod

(function() {
    'use strict';
    
    // Register the mod
    Game.registerMod('TestUpgradesMod2', {
        name: 'Test Upgrades Mod 2',
        version: '1.0.0',
        
        // Initialize the mod
        init: function() {
            // Apply 8% discount to Grandmas immediately
            this.applyGrandmaDiscount();
        },
        
        // Apply 8% discount to Grandmas
        applyGrandmaDiscount: function() {
            if (Game.Objects['Grandma']) {
                const grandma = Game.Objects['Grandma'];
                
                // Store the original modifyBuildingPrice function
                const originalModifyBuildingPrice = Game.modifyBuildingPrice;
                
                // Override Game.modifyBuildingPrice to apply our discount
                Game.modifyBuildingPrice = function(building, price) {
                    // Call the original function first
                    price = originalModifyBuildingPrice.call(this, building, price);
                    
                    // Apply our 8% discount specifically for Grandma
                    if (building.name === 'Grandma') {
                        price *= 0.92;
                    }
                    
                    return price;
                };
                
                // Force the store to refresh to show updated prices
                if (Game.RefreshStore) {
                    Game.RefreshStore();
                }
                if (Game.storeToRefresh !== undefined) {
                    Game.storeToRefresh = 1;
                }
            }
        }
    });
})();