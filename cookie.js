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
        CCSE.NewUpgrade(
            name, // Name
            desc, // Description
            111111111 * order, // Price (adjust as desired)
            [25, 7], // Icon (Springerle)
            null // No custom buy function
        );
    }

    // Add 25 new cookie upgrades after Springerle
    var baseIndex = 4; // Since Springerle I-III are 1-3
    for (var i = 0; i < 25; i++) {
        var num = baseIndex + i;
        var name = 'Springerle ' + num;
        var desc = 'An even more elaborate springerle cookie. <q>Level ' + num + ' of deliciousness!</q>';
        addSpringerleUpgrade(name, desc, num);
    }

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

// Try to initialize immediately, or wait for CCSE
JustNaturalExpansion.tryInit = function() {
    console.log('Just Natural Expansion: Checking if ready to initialize...');
    console.log('CCSE exists:', typeof CCSE !== 'undefined');
    if (typeof CCSE !== 'undefined') {
        console.log('CCSE.isLoaded:', CCSE.isLoaded);
    }
    
    if (typeof CCSE !== 'undefined' && CCSE.isLoaded) {
        console.log('Just Natural Expansion: CCSE is ready, initializing...');
        JustNaturalExpansion.init();
    } else {
        console.log('Just Natural Expansion: CCSE not ready, waiting...');
        // Try again in 100ms
        setTimeout(JustNaturalExpansion.tryInit, 100);
    }
};

// Start the initialization process immediately
console.log('Just Natural Expansion: Mod script loaded, starting initialization process...');
JustNaturalExpansion.tryInit();

JustNaturalExpansion.addBuildingAchievements = function() {
    // List of thresholds for new achievements
    var thresholds = [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1300, 1400, 1500];

    // Loop through all buildings
    for (var i in Game.ObjectsById) {
        var building = Game.ObjectsById[i];
        for (var t = 0; t < thresholds.length; t++) {
            var amount = thresholds[t];
            var name = building.single + ' ownership (' + amount + ')';
            var desc = 'Own ' + amount + ' ' + building.plural + '.';
            // Use the same icon as the last vanilla achievement for this building
            var icon = [building.icon[0], building.icon[1]];

            // Create the achievement using CCSE
            CCSE.NewAchievement(name, desc, icon);

            // Make the achievement unlock when the player owns the required amount
            var ach = Game.AchievementsByName[name];
            if (ach) {
                ach.pool = 'normal';
                ach.buildingTie = building;
                ach.buildingTie1 = amount;
            }
        }
    }
};

JustNaturalExpansion.addCpsAchievements = function() {
    // Starting from 1 octodecillion (1e57)
    var thresholds = [
        {amount: 1e57, name: "Beyond the speed of dough", desc: "Bake 1 octodecillion cookies per second."},
        {amount: 1e58, name: "Transcendent velocity", desc: "Bake 10 octodecillion cookies per second."},
        {amount: 1e59, name: "Cookie singularity", desc: "Bake 100 octodecillion cookies per second."},
        {amount: 1e60, name: "Bakery event horizon", desc: "Bake 1 novemdecillion cookies per second."},
        {amount: 1e61, name: "Chrono-cookie", desc: "Bake 10 novemdecillion cookies per second."},
        {amount: 1e62, name: "Infinite oven", desc: "Bake 100 novemdecillion cookies per second."},
        {amount: 1e63, name: "Vigintillionaire baker", desc: "Bake 1 vigintillion cookies per second."},
        {amount: 1e64, name: "The dough dimension", desc: "Bake 10 vigintillion cookies per second."},
        {amount: 1e65, name: "Cookieverse", desc: "Bake 100 vigintillion cookies per second."},
        {amount: 1e66, name: "The final batch", desc: "Bake 1 unvigintillion cookies per second."}
    ];
    // Use the last vanilla CpS achievement icon, or pick your own
    var icon = [25, 25]; // Replace with the actual icon used for the last CpS achievement if you want

    for (var i = 0; i < thresholds.length; i++) {
        var t = thresholds[i];
        CCSE.NewAchievement(t.name, t.desc, icon);
        // Custom unlock logic: check raw CpS
        var ach = Game.AchievementsByName[t.name];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = function(amount) {
                return function() { return Game.cookiesPs >= amount; };
            }(t.amount);
        }
    }
};

JustNaturalExpansion.addClickAchievements = function() {
    var thresholds = [
        {amount: 1e32, name: "Clicktopus", desc: "Make 100 nonillion cookies from clicking."},
        {amount: 1e33, name: "Clickpocalypse", desc: "Make 1 decillion cookies from clicking."},
        {amount: 1e34, name: "Clickfinity", desc: "Make 10 decillion cookies from clicking."},
        {amount: 1e35, name: "Clickstorm", desc: "Make 100 decillion cookies from clicking."},
        {amount: 1e36, name: "Clickageddon II", desc: "Make 1 undecillion cookies from clicking."},
        {amount: 1e37, name: "Clickonomicon", desc: "Make 10 undecillion cookies from clicking."},
        {amount: 1e38, name: "Clickzilla", desc: "Make 100 undecillion cookies from clicking."},
        {amount: 1e39, name: "Clickmageddon", desc: "Make 1 duodecillion cookies from clicking."},
        {amount: 1e40, name: "Clickpocalypse II", desc: "Make 10 duodecillion cookies from clicking."},
        {amount: 1e41, name: "Clickverse", desc: "Make 100 duodecillion cookies from clicking."}
    ];
    // Use the last vanilla click achievement icon, or pick your own
    var icon = [0, 7]; // Replace with the actual icon used for the last click achievement if you want

    for (var i = 0; i < thresholds.length; i++) {
        var t = thresholds[i];
        CCSE.NewAchievement(t.name, t.desc, icon);
        // Custom unlock logic: check cookies from clicking
        var ach = Game.AchievementsByName[t.name];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = function(amount) {
                return function() { return Game.cookieClicksThisAscension >= amount; };
            }(t.amount);
        }
    }
};

JustNaturalExpansion.addBuildingProductionAchievements = function() {
    // Thresholds and suffixes for the new achievements
    var thresholds = [
        {amount: 1e63, suffix: "vigintillion"},
        {amount: 1e66, suffix: "unvigintillion"},
        {amount: 1e69, suffix: "duovigintillion"}
    ];

    for (var i in Game.ObjectsById) {
        var building = Game.ObjectsById[i];
        for (var t = 0; t < thresholds.length; t++) {
            var th = thresholds[t];
            var name = "Make " + th.amount.toLocaleString('en-US', {maximumFractionDigits: 0}) + " cookies just from " + building.plural.toLowerCase();
            var desc = "Make " + th.amount.toLocaleString('en-US', {maximumFractionDigits: 0}) + " cookies just from " + building.plural + ".";
            var icon = [building.icon[0], building.icon[1]];

            CCSE.NewAchievement(name, desc, icon);

            // Custom unlock logic: check cookies produced by this building
            var ach = Game.AchievementsByName[name];
            if (ach) {
                ach.pool = 'normal';
                ach.customRequirement = (function(building, amount) {
                    return function() { return building.amountEarned >= amount; };
                })(building, th.amount);
            }
        }
    }
};

JustNaturalExpansion.addGoldenCookieAchievements = function() {
    var thresholds = [17777, 37777, 47777, 57777, 67777, 77777];
    var names = [
        "Black cat's other paw",
        "Black cat's third paw",
        "Black cat's fourth paw",
        "Black cat's fifth paw",
        "Black cat's sixth paw",
        "Black cat's seventh paw"
    ];
    var descs = [
        "Click 17,777 golden cookies.",
        "Click 37,777 golden cookies.",
        "Click 47,777 golden cookies.",
        "Click 57,777 golden cookies.",
        "Click 67,777 golden cookies.",
        "Click 77,777 golden cookies."
    ];
    var icon = [10, 7]; // Use the same icon as Black cat's paw
    for (var i = 0; i < thresholds.length; i++) {
        CCSE.NewAchievement(names[i], descs[i], icon);
        var ach = Game.AchievementsByName[names[i]];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = (function(amount) {
                return function() { return Game.goldenClicks >= amount; };
            })(thresholds[i]);
        }
    }
};

JustNaturalExpansion.addKittenAchievements = function() {
    // Thresholds for new kitten achievements
    var thresholds = [
       
        {amount: 15, name: "Jellicles II", desc: "Own 15 kitten upgrades."}
        // Add more as needed
    ];
    // Use the same icon as the original Jellicles achievement
    var icon = [29, 16];

    // Helper to count owned kitten upgrades
    function countKittenUpgrades() {
        var count = 0;
        for (var i in Game.UpgradesById) {
            var upg = Game.UpgradesById[i];
            if (upg.kitten && upg.bought) count++;
        }
        return count;
    }

    for (var i = 0; i < thresholds.length; i++) {
        var t = thresholds[i];
        CCSE.NewAchievement(t.name, t.desc, icon);
        var ach = Game.AchievementsByName[t.name];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = (function(amount) {
                return function() { return countKittenUpgrades() >= amount; };
            })(t.amount);
        }
    }
};

JustNaturalExpansion.addGrandmatriarchAchievements = function() {
    var thresholds = [50, 100, 500, 666];
    var names = [
        "Elder doze",
        "Elder snooze",
        "Elder hibernation",
        "Elder eternal rest"
    ];
    var descs = [
        "Appease the grandmatriarchs at least 50 times.",
        "Appease the grandmatriarchs at least 100 times.",
        "Appease the grandmatriarchs at least 500 times.",
        "Appease the grandmatriarchs at least 666 times."
    ];
    var icon = [17, 7]; // Use the same icon as Elder slumber
    for (var i = 0; i < thresholds.length; i++) {
        CCSE.NewAchievement(names[i], descs[i], icon);
        var ach = Game.AchievementsByName[names[i]];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = (function(amount) {
                return function() { return (Game.elderWrathGrandmaAppeased || 0) >= amount; };
            })(thresholds[i]);
        }
    }
};

JustNaturalExpansion.addWrinklerAchievements = function() {
    var thresholds = [500, 1000, 2000, 5000];
    var names = [
        "Wrinkler annihilator",
        "Wrinkler eradicator",
        "Wrinkler extinction event",
        "Wrinkler apocalypse"
    ];
    var descs = [
        "Pop 500 wrinklers.",
        "Pop 1,000 wrinklers.",
        "Pop 2,000 wrinklers.",
        "Pop 5,000 wrinklers."
    ];
    var icon = [18, 7]; // Use the same icon as Moistburster
    for (var i = 0; i < thresholds.length; i++) {
        CCSE.NewAchievement(names[i], descs[i], icon);
        var ach = Game.AchievementsByName[names[i]];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = (function(amount) {
                return function() { return (Game.wrinklersPopped || 0) >= amount; };
            })(thresholds[i]);
        }
    }
};

JustNaturalExpansion.addReindeerAchievements = function() {
    var thresholds = [500, 1000, 2000, 5000];
    var names = [
        "Reindeer destroyer",
        "Reindeer obliterator",
        "Reindeer extinction event",
        "Reindeer apocalypse"
    ];
    var descs = [
        "Pop 500 reindeer.",
        "Pop 1,000 reindeer.",
        "Pop 2,000 reindeer.",
        "Pop 5,000 reindeer."
    ];
    var icon = [19, 7]; // Use the same icon as Reindeer sleigher
    for (var i = 0; i < thresholds.length; i++) {
        CCSE.NewAchievement(names[i], descs[i], icon);
        var ach = Game.AchievementsByName[names[i]];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = (function(amount) {
                return function() { return (Game.reindeerPopped || 0) >= amount; };
            })(thresholds[i]);
        }
    }
};

JustNaturalExpansion.addAscendCookieAchievements = function() {
    // Start at 1 octodecillion (1e57), increase by x1000 for each level
    var start = 1e57;
    var thresholds = [];
    var names = [
        "No more room in hell II",
        "No more room in hell III",
        "No more room in hell IV",
        "No more room in hell V",
        "No more room in hell VI",
        "No more room in hell VII",
        "No more room in hell VIII",
        "No more room in hell IX",
        "No more room in hell X",
        "No more room in hell XI"
    ];
    var descs = [];
    var icon = [21, 7];
    for (var i = 0; i < 10; i++) {
        var amount = start * Math.pow(1000, i+1);
        thresholds.push(amount);
        // Format the number for the description
        var units = ["octodecillion","nonillion","decillion","undecillion","duodecillion","tredecillion","quattuordecillion","quindecillion","sexdecillion","septendecillion","octodecillion","novemdecillion","vigintillion","unvigintillion","duovigintillion","trevigintillion","quattuorvigintillion","quinvigintillion","sexvigintillion","septenvigintillion","octovigintillion","novemvigintillion","trigintillion"];
        var unitIdx = 18 + i + 1; // octodecillion is 18th
        var desc = "Ascend with 1 " + (units[unitIdx] || ("e" + (57 + 3*(i+1))) ) + " cookies baked.";
        descs.push(desc);
    }
    for (var i = 0; i < thresholds.length; i++) {
        CCSE.NewAchievement(names[i], descs[i], icon);
        var ach = Game.AchievementsByName[names[i]];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = (function(amount) {
                return function() { return (Game.cookiesReset || 0) >= amount; };
            })(thresholds[i]);
        }
    }
};

JustNaturalExpansion.addSpellAchievements = function() {
    var thresholds = [1999, 9999];
    var names = [
        "Archwizard",
        "Cookieomancer"
    ];
    var descs = [
        "Cast 1,999 spells.",
        "Cast 9,999 spells."
    ];
    var icon = [20, 7]; // Use the same icon as 'A wizard is you'
    for (var i = 0; i < thresholds.length; i++) {
        CCSE.NewAchievement(names[i], descs[i], icon);
        var ach = Game.AchievementsByName[names[i]];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = (function(amount) {
                return function() { return (Game.spellsCast || 0) >= amount; };
            })(thresholds[i]);
        }
    }
};

JustNaturalExpansion.addGardenAchievements = function() {
    var thresholds = [2000, 5000, 10000];
    var names = [
        "Greener, aching thumb",
        "Greenest, aching thumb",
        "Photosynthetic prodigy"
    ];
    var descs = [
        "Harvest 2,000 mature garden plants.",
        "Harvest 5,000 mature garden plants.",
        "Harvest 10,000 mature garden plants."
    ];
    var icon = [22, 7]; // Use the same icon as 'Green, aching thumb'
    for (var i = 0; i < thresholds.length; i++) {
        CCSE.NewAchievement(names[i], descs[i], icon);
        var ach = Game.AchievementsByName[names[i]];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = (function(amount) {
                return function() { return (Game.gardenPlantsHarvestedMature || 0) >= amount; };
            })(thresholds[i]);
        }
    }
};

JustNaturalExpansion.addSeptcentennialExpansions = function() {
    var thresholds = [750, 800, 850, 900, 1000];
    var names = [
        "Octocentennial",
        "Octocentennial and a half",
        "Nonacentennial",
        "Nonacentennial and a half",
        "Millennial"
    ];
    var descs = [
        "Have at least 750 of everything.",
        "Have at least 800 of everything.",
        "Have at least 850 of everything.",
        "Have at least 900 of everything.",
        "Have at least 1,000 of everything."
    ];
    var cookieNames = [
        "Octocentennial cookie",
        "Octocentennial and a half cookie",
        "Nonacentennial cookie",
        "Nonacentennial and a half cookie",
        "Millennial cookie"
    ];
    var cookieDescs = [
        "+10% CpS",
        "+10% CpS",
        "+10% CpS",
        "+10% CpS",
        "+10% CpS"
    ];
    var icon = [26, 7]; // Use a cookie icon, or customize as desired
    for (var i = 0; i < thresholds.length; i++) {
        // Achievement
        CCSE.NewAchievement(names[i], descs[i], icon);
        var ach = Game.AchievementsByName[names[i]];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = (function(amount) {
                return function() {
                    for (var j in Game.ObjectsById) {
                        if (Game.ObjectsById[j].amount < amount) return false;
                    }
                    return true;
                };
            })(thresholds[i]);
        }
        // Upgrade (cookie)
        CCSE.NewUpgrade(
            cookieNames[i],
            cookieDescs[i],
            77777777777 * (i+1), // Arbitrary price, can be adjusted
            icon,
            null
        );
        var upg = Game.UpgradesByName[cookieNames[i]];
        if (upg) {
            upg.pool = 'cookie';
            upg.descFunc = function() { return '+10% CpS'; };
            upg.power = 0.1;
            upg.cpsMult = 1.1;
            upg.hide = 3;
            upg.unlocked = 0;
            upg.unlockAt = names[i];
            // Custom unlock: unlock when achievement is earned
            upg.customRequirement = (function(achName) {
                return function() { return Game.AchievementsByName[achName] && Game.AchievementsByName[achName].won; };
            })(names[i]);
        }
    }
};

JustNaturalExpansion.addAscensionBakeAchievements = function() {
    // Start at 1 trevigintillion (1e72), increase by x100 for each level
    var start = 1e72;
    var thresholds = [];
    var names = [
        "The Doughpocalypse",
        "The Flour Flood",
        "The Ovenverse",
        "The Crumb Crusade",
        "The Final Batch"
    ];
    var descs = [];
    var icon = [23, 7]; // Use the same icon as 'And a little extra'
    var units = [
        "quattuorvigintillion",
        "quinvigintillion",
        "sexvigintillion",
        "septenvigintillion",
        "octovigintillion"
    ];
    for (var i = 0; i < 5; i++) {
        var amount = start * Math.pow(100, i+1);
        thresholds.push(amount);
        var desc = "Bake 1 " + units[i] + " cookies in one ascension.";
        descs.push(desc);
    }
    for (var i = 0; i < thresholds.length; i++) {
        CCSE.NewAchievement(names[i], descs[i], icon);
        var ach = Game.AchievementsByName[names[i]];
        if (ach) {
            ach.pool = 'normal';
            ach.customRequirement = (function(amount) {
                return function() { return (Game.cookiesEarnedThisAscension || 0) >= amount; };
            })(thresholds[i]);
        }
    }
};