Game.Win('Third-party');
if(typeof JustNaturalExpansion === 'undefined') var JustNaturalExpansion = {};
if(typeof CCSE == 'undefined') Game.LoadMod('https://klattmose.github.io/CookieClicker/CCSE.js');
JustNaturalExpansion.name = 'Just Natural Expansion';
JustNaturalExpansion.version = '1.00';
JustNaturalExpansion.GameVersion = '2.052';

Game.registerMod('JustNaturalExpansion', {
    init: function() {
        // Check for CCSE
        if (typeof CCSE === 'undefined' || !CCSE.isLoaded) {
            Game.Popup('Just Natural Expansion: CCSE not loaded! Mod will not function.');
            console.error('Just Natural Expansion: CCSE not loaded!');
            return;
        }
        Game.Popup('Just Natural Expansion loaded!');
        console.log('Just Natural Expansion loaded!');

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
    },
    save: function() {},
    load: function() {}
});