Game.Win('Third-party');

// Define the mod object
var JustNaturalExpansion = {};
JustNaturalExpansion.name = 'Just Natural Expansion';
JustNaturalExpansion.version = '1.00';
JustNaturalExpansion.GameVersion = '2.052';

// Main initialization function
JustNaturalExpansion.init = function() {
    console.log('Just Natural Expansion: Starting initialization...');
    
    // Check if CCSE is available
    if (typeof CCSE === 'undefined') {
        Game.Popup('Just Natural Expansion: CCSE not found! Please load CCSE first.');
        console.error('Just Natural Expansion: CCSE not found!');
        return;
    }
    
    if (!CCSE.isLoaded) {
        Game.Popup('Just Natural Expansion: CCSE not fully loaded yet!');
        console.error('Just Natural Expansion: CCSE not fully loaded!');
        return;
    }
    
    console.log('Just Natural Expansion: CCSE is loaded, proceeding...');
    
    // Helper function to add a Springerle upgrade
    function addSpringerleUpgrade(name, desc, order) {
        var upg = new Game.Upgrade(
            name, // Name
            desc, // Description
            111111111 * order, // Price (adjust as desired)
            [25, 7], // Icon (Springerle)
            function() { return true; } // Buy function
        );
        upg.pool = 'cookie';
        upg.order = Game.UpgradesN;
        Game.UpgradesById[Game.UpgradesN] = upg;
        Game.UpgradesN++;
        Game.Upgrades.push(upg);
        Game.UpgradesByName[name] = upg;
        console.log('Just Natural Expansion: Added upgrade ' + name);
        return upg;
    }

    // Add 25 new cookie upgrades after Springerle
    var baseIndex = 4; // Since Springerle I-III are 1-3
    for (var i = 0; i < 25; i++) {
        var num = baseIndex + i;
        var name = 'Springerle ' + num;
        var desc = 'An even more elaborate springerle cookie. <q>Level ' + num + ' of deliciousness!</q>';
        addSpringerleUpgrade(name, desc, num);
    }

    // All achievement and upgrade logic from previous code goes here
    JustNaturalExpansion.addBuildingAchievements();
    JustNaturalExpansion.addCpsAchievements();
    JustNaturalExpansion.addClickAchievements();
    JustNaturalExpansion.addBuildingProductionAchievements();
    JustNaturalExpansion.addGoldenCookieAchievements();
    JustNaturalExpansion.addKittenAchievements();
    JustNaturalExpansion.addGrandmatriarchAchievements && JustNaturalExpansion.addGrandmatriarchAchievements();
    JustNaturalExpansion.addWrinklerAchievements && JustNaturalExpansion.addWrinklerAchievements();
    JustNaturalExpansion.addReindeerAchievements && JustNaturalExpansion.addReindeerAchievements();
    JustNaturalExpansion.addAscendCookieAchievements();
    JustNaturalExpansion.addSpellAchievements && JustNaturalExpansion.addSpellAchievements();
    JustNaturalExpansion.addGardenAchievements && JustNaturalExpansion.addGardenAchievements();
    JustNaturalExpansion.addSeptcentennialExpansions && JustNaturalExpansion.addSeptcentennialExpansions();
    JustNaturalExpansion.addAscensionBakeAchievements && JustNaturalExpansion.addAscensionBakeAchievements();
    
    Game.Popup('Just Natural Expansion loaded successfully!');
    console.log('Just Natural Expansion: Initialization complete!');
};

// Register the mod with CCSE's system
if (typeof CCSE !== 'undefined' && CCSE.isLoaded) {
    // CCSE is already loaded, run immediately
    JustNaturalExpansion.init();
} else {
    // CCSE is not loaded yet, wait for it
    if (typeof CCSE === 'undefined') {
        // CCSE doesn't exist, create the postLoadHooks array
        if (typeof CCSE === 'undefined') var CCSE = {};
        if (!CCSE.postLoadHooks) CCSE.postLoadHooks = [];
        CCSE.postLoadHooks.push(JustNaturalExpansion.init);
    } else {
        // CCSE exists but isn't loaded yet
        if (!CCSE.postLoadHooks) CCSE.postLoadHooks = [];
        CCSE.postLoadHooks.push(JustNaturalExpansion.init);
    }
}