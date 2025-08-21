// Just Natural Expansion - Cookie Clicker Mod

(function() 
{
    'use strict';
    
    var modName = 'Just Natural Expansion';
    var modVersion = '0.0.1';
    var debugMode = false; // Set to true for detailed logging and to unlock all achievements
    var resetMode = false; // Set to true to reset all mod data to fresh state (achievements unwon, upgrades unpurchased)
    
    // Granular control toggles
    var shadowAchievementMode = true; // Controls whether achievements become shadow achievements
    var enableCookieUpgrades = false; // Controls whether cookie upgrades are created/active
    var enableBuildingUpgrades = false; // Controls whether building upgrades are created/active
    var enableKittenUpgrades = false; // Controls whether kitten upgrades are created/active
    
    var modIcon = [15, 7]; // Static mod icon from main sprite sheet
    var modInitialized = false; // Track if mod has finished initializing
    
    // Lifetime tracking variables (persist across ascensions)
    var lifetimeData = {
        reindeerClicked: 0,
        stockMarketAssets: 0,
        shinyWrinklersPopped: 0,
        wrathCookiesClicked: 0,
        totalGardenSacrifices: 0,
        totalCookieClicks: 0,
        wrinklersPopped: 0,
        elderCovenantToggles: 0,
        pledges: 0,
        gardenSacrifices: 0,
        lastGardenSacrificeTime: 0,
        godUsageTime: {} // Track cumulative time each god is slotted across all ascensions
    };
    
    // Mod settings for menu system
    var modSettings = {
        shadowAchievements: true, // Should match shadowAchievementMode default
        enableCookieUpgrades: false,
        enableBuildingUpgrades: false,
        enableKittenUpgrades: true,
        hasUsedModOutsideShadowMode: false
    };
    
    // Current run tracking variables (reset on ascension)
    var currentRunData = {
        maxCombinedTotal: 0
    };
    
    // ===== LIFETIME TRACKING HELPER FUNCTIONS =====
    

    
    // Track if we've already captured values for this ascension
    var hasCapturedThisAscension = false;
    var lastAscensionCount = 0;
    
    // Handle check hook - monitor for ascension and capture values
    function handleCheck() {
        // Check if we're about to ascend (Game.OnAscend > 0) and we haven't captured yet
        if (Game.OnAscend && Game.OnAscend > 0 && !hasCapturedThisAscension) {
            // Capture current values before they get reset
            var currentValues = {
                reindeerClicked: Game.reindeerClicked || 0,
                stockMarketAssets: (Game.Objects['Bank'] && Game.Objects['Bank'].minigame ? Game.Objects['Bank'].minigame.profit || 0 : 0),
                shinyWrinklersPopped: Game.shinyWrinklersPopped || 0,
                wrathCookiesClicked: Game.wrathCookiesClicked || 0,
                totalGardenSacrifices: (Game.Objects['Farm'] && Game.Objects['Farm'].minigame ? Game.Objects['Farm'].minigame.sacrifices || 0 : 0),
                totalCookieClicks: Game.cookieClicks || 0,
                wrinklersPopped: Game.wrinklersPopped || 0,
                elderCovenantToggles: lifetimeData.elderCovenantToggles || 0,
                pledges: Game.pledges || 0,
                gardenSacrifices: (Game.Objects['Farm'] && Game.Objects['Farm'].minigame ? Game.Objects['Farm'].minigame.convertTimes || 0 : 0)
            };
            
            // Add to lifetime totals
            lifetimeData.reindeerClicked += currentValues.reindeerClicked;
            lifetimeData.stockMarketAssets += currentValues.stockMarketAssets;
            lifetimeData.shinyWrinklersPopped += currentValues.shinyWrinklersPopped;
            lifetimeData.wrathCookiesClicked += currentValues.wrathCookiesClicked;
            lifetimeData.totalGardenSacrifices += currentValues.totalGardenSacrifices;
            lifetimeData.totalCookieClicks += currentValues.totalCookieClicks;
            lifetimeData.wrinklersPopped += currentValues.wrinklersPopped;
            lifetimeData.pledges += currentValues.pledges;
            lifetimeData.gardenSacrifices += currentValues.gardenSacrifices;
            

            
            // Mark that we've captured for this ascension
            hasCapturedThisAscension = true;
            lastAscensionCount = Game.resets || 0;
        }
        
        // Reset capture flag when we detect a new ascension cycle
        if (Game.resets !== lastAscensionCount) {
            hasCapturedThisAscension = false;
            lastAscensionCount = Game.resets || 0;
        }
    }
    
    // Handle reincarnate (ascension) - reset run-specific data
    function handleReincarnate() {

        
        // Reset the current run's max combined total
        currentRunData.maxCombinedTotal = 0;
    }
    
    // Handle reset - clear data on full reset
    function handleReset() {

        
        // Check if this is a full reset (not an ascension)
        if (!Game.OnAscend || Game.OnAscend === 0) {
            // This is a full reset - clear everything
    
            
            // Reset lifetime data
            lifetimeData = {
                reindeerClicked: 0,
                stockMarketAssets: 0,
                shinyWrinklersPopped: 0,
                wrathCookiesClicked: 0,
                totalGardenSacrifices: 0,
                totalCookieClicks: 0,
                wrinklersPopped: 0,
                elderCovenantToggles: 0,
                pledges: 0,
                gardenSacrifices: 0,
                godUsageTime: {}
            };
            
            // Reset achievements to unwon state
            modAchievementNames.forEach(name => {
                if (Game.Achievements[name]) {
                    Game.Achievements[name].won = 0;
                }
            });
            
            // Reset upgrades to unpurchased state
            var modUpgradeNames = getModUpgradeNames();
            modUpgradeNames.forEach(name => {
                if (Game.Upgrades[name]) {
                    Game.Upgrades[name].bought = 0;
                    Game.Upgrades[name].unlocked = 0;
                }
            });
            
            // Reset capture flags
            hasCapturedThisAscension = false;
            lastAscensionCount = 0;
            
    
        } else {
            // This is an ascension - reset upgrades to locked state
    
            
            // Reset upgrades to unpurchased state for ascension
            var modUpgradeNames = getModUpgradeNames();
            modUpgradeNames.forEach(name => {
                if (Game.Upgrades[name]) {
                    Game.Upgrades[name].bought = 0;
                    Game.Upgrades[name].unlocked = 0;
                }
            });
            
    
        }
    }
    
    // Helper functions that return current + lifetime values
    function getLifetimeReindeer() {
        return (Game.reindeerClicked || 0) + lifetimeData.reindeerClicked;
    }
    
    function getLifetimeStockMarketAssets() {
        var currentAssets = 0;
        if (Game.Objects['Bank'] && Game.Objects['Bank'].minigame) {
            currentAssets = Game.Objects['Bank'].minigame.profit || 0;
        }
        return currentAssets + lifetimeData.stockMarketAssets;
    }
    
    function getLifetimeShinyWrinklers() {
        return (Game.shinyWrinklersPopped || 0) + lifetimeData.shinyWrinklersPopped;
    }
    
    function getLifetimeWrathCookies() {
        return (Game.wrathCookiesClicked || 0) + lifetimeData.wrathCookiesClicked;
    }
    
    function getLifetimeGardenSacrifices() {
        var currentSacrifices = 0;
        if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
            currentSacrifices = Game.Objects['Farm'].minigame.sacrifices || 0;
        }
        return currentSacrifices + lifetimeData.totalGardenSacrifices;
    }
    
    function getLifetimeCookieClicks() {
        return (Game.cookieClicks || 0) + lifetimeData.totalCookieClicks;
    }
    
    function getLifetimeWrinklers() {
        return (Game.wrinklersPopped || 0) + lifetimeData.wrinklersPopped;
    }
    
    function getLifetimePledges() {
        return (Game.pledges || 0) + lifetimeData.pledges + lifetimeData.elderCovenantToggles;
    }
    
    function getLifetimeGardenSacrifices() {
        return (Game.Objects['Farm'] && Game.Objects['Farm'].minigame ? Game.Objects['Farm'].minigame.convertTimes || 0 : 0) + lifetimeData.gardenSacrifices;
    }
    
    // ===== MENU SYSTEM FUNCTIONS =====
    
    // Function to update menu buttons to reflect current settings
    function updateMenuButtons() {
        let buttons = document.querySelectorAll('#just-natural-expansion-settings .option');
        buttons.forEach(button => {
            let onclick = button.getAttribute('onclick');
            if (onclick) {
                let settingName = '';
                if (onclick.includes('shadowAchievements')) settingName = 'shadowAchievements';
                else if (onclick.includes('enableCookieUpgrades')) settingName = 'enableCookieUpgrades';
                else if (onclick.includes('enableBuildingUpgrades')) settingName = 'enableBuildingUpgrades';
                else if (onclick.includes('enableKittenUpgrades')) settingName = 'enableKittenUpgrades';
                
                if (settingName) {
                    let buttonText = '';
                    let isEnabled = false;
                    
                    switch(settingName) {
                        case 'shadowAchievements':
                            isEnabled = shadowAchievementMode;
                            buttonText = `Shadow Achievements<br><b style="font-size:12px;">${isEnabled ? 'ON' : 'OFF'}</b>`;
                            break;
                        case 'enableCookieUpgrades':
                            isEnabled = enableCookieUpgrades;
                            buttonText = `Cookie Upgrades<br><b style="font-size:12px;">${isEnabled ? 'ON' : 'OFF'}</b>`;
                            break;
                        case 'enableBuildingUpgrades':
                            isEnabled = enableBuildingUpgrades;
                            buttonText = `Building Upgrades<br><b style="font-size:12px;">${isEnabled ? 'ON' : 'OFF'}</b>`;
                            break;
                        case 'enableKittenUpgrades':
                            isEnabled = enableKittenUpgrades;
                            buttonText = `Kitten Upgrades<br><b style="font-size:12px;">${isEnabled ? 'ON' : 'OFF'}</b>`;
                            break;
                    }
                    button.innerHTML = buttonText;
                    button.style.color = isEnabled ? 'lime' : 'red';
                }
            }
        });
    }
    
    // Toggle setting function
    function toggleSetting(settingName) {
        // Map setting names to actual variables
        let targetVariable = null;
        switch(settingName) {
            case 'shadowAchievements':
                targetVariable = 'shadowAchievementMode';
                break;
            case 'enableCookieUpgrades':
                targetVariable = 'enableCookieUpgrades';
                break;
            case 'enableBuildingUpgrades':
                targetVariable = 'enableBuildingUpgrades';
                break;
            case 'enableKittenUpgrades':
                targetVariable = 'enableKittenUpgrades';
                break;
            default:
                targetVariable = settingName;
        }
        
        // Determine what the new state will be
        let newState = false;
        if (targetVariable === 'shadowAchievementMode') {
            newState = !shadowAchievementMode;
        } else if (targetVariable === 'enableCookieUpgrades') {
            newState = !enableCookieUpgrades;
        } else if (targetVariable === 'enableBuildingUpgrades') {
            newState = !enableBuildingUpgrades;
        } else if (targetVariable === 'enableKittenUpgrades') {
            newState = !enableKittenUpgrades;
        }
        
        // Show confirmation prompt for major changes
        let message = '';
        let callback = '';
        
        if (settingName === 'shadowAchievements') {
            if (newState) {
                message = 'Enable shadow achievements?<br><small>All mod achievements will be moved to the shadow pool and will no longer grant milk or affect gameplay.</small>';
                callback = 'JustNaturalExpansionMod.applyShadowAchievementChange(true);';
            } else {
                message = 'Disable shadow achievements?<br><small>All mod achievements will be moved to the normal pool and will grant milk and affect gameplay. This will award the "Beyond the Leaderboard" shadow achievement to indicate you have left competition mode.</small>';
                callback = 'JustNaturalExpansionMod.applyShadowAchievementChange(false);';
            }
        } else if (settingName === 'enableCookieUpgrades' || settingName === 'enableBuildingUpgrades' || settingName === 'enableKittenUpgrades') {
            let upgradeType = settingName.replace('enable', '').replace('Upgrades', '');
            if (newState) {
                message = 'Enable ' + upgradeType + ' upgrades?<br><small>These upgrades will be added to the game and may affect your CPS and gameplay. This will award the "Beyond the Leaderboard" shadow achievement to indicate you have left competition mode.</small>';
                callback = 'JustNaturalExpansionMod.applyUpgradeChange("' + settingName + '", true);';
            } else {
                message = 'Disable ' + upgradeType + ' upgrades?<br><small>These upgrades will be removed from the game. Any purchased upgrades will be refunded.</small>';
                callback = 'JustNaturalExpansionMod.applyUpgradeChange("' + settingName + '", false);';
            }
        }
        
        if (message && callback) {
            showSettingsChangePrompt(message, callback);
        } else {
            // For minor changes, apply immediately
            applySettingChange(settingName, newState);
        }
    }
    
    // Function to apply shadow achievement changes
    function applyShadowAchievementChange(enabled) {
        shadowAchievementMode = enabled;
        modSettings.shadowAchievements = enabled;
        
        // Update achievement pools
        updateAchievementPools();
        
        // Special handling for shadow achievements setting
        if (!enabled) {
            modSettings.hasUsedModOutsideShadowMode = true;
            
            // Award the "Beyond the Leaderboard" achievement if it exists and hasn't been won
            if (Game.Achievements['Beyond the Leaderboard'] && !Game.Achievements['Beyond the Leaderboard'].won) {
                markAchievementWon('Beyond the Leaderboard');
            }
        }
        
        // Check if we should mark "Beyond the Leaderboard" as won based on new settings
        checkAndMarkBeyondTheLeaderboard();
        
        // Update UI
        updateMenuButtons();
        
        // Save settings
        setTimeout(() => {
            if (Game.Write) {
                Game.Write('CookieClickerSave', Game.Write());
            }
        }, 50);
    }
    
    // Function to apply upgrade changes
    function applyUpgradeChange(settingName, enabled) {
        // Update the variable
        if (settingName === 'enableCookieUpgrades') {
            enableCookieUpgrades = enabled;
        } else if (settingName === 'enableBuildingUpgrades') {
            enableBuildingUpgrades = enabled;
        } else if (settingName === 'enableKittenUpgrades') {
            enableKittenUpgrades = enabled;
        }
        
        // Update modSettings for compatibility
        modSettings[settingName] = enabled;
        
        // Apply changes to the game
        if (enabled) {
            addUpgradesToGame();
        } else {
            // Remove only our mod's upgrades of the specific type that was disabled
            var upgradeNamesToRemove = [];
            
            if (settingName === 'enableCookieUpgrades') {
                upgradeNamesToRemove = cookieUpgradeNames;
            } else if (settingName === 'enableBuildingUpgrades') {
                upgradeNamesToRemove = buildingUpgradeNames;
            } else if (settingName === 'enableKittenUpgrades') {
                upgradeNamesToRemove = kittenUpgradeNames;
            }
            
            // Remove the upgrades
            for (var i = 0; i < upgradeNamesToRemove.length; i++) {
                var upgradeName = upgradeNamesToRemove[i];
                if (Game.Upgrades[upgradeName]) {
                    // Remove from the main upgrades object
                    delete Game.Upgrades[upgradeName];
                    
                    // Also remove from upgrade pools if they exist
                    if (Game.UpgradesByPool) {
                        for (var poolName in Game.UpgradesByPool) {
                            var pool = Game.UpgradesByPool[poolName];
                            if (pool && Array.isArray(pool)) {
                                for (var j = pool.length - 1; j >= 0; j--) {
                                    if (pool[j] && pool[j].name === upgradeName) {
                                        pool.splice(j, 1);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Force store refresh using the game's own mechanisms
            Game.storeToRefresh = 1;
            Game.upgradesToRebuild = 1;
            
            // Force menu update
            if (Game.UpdateMenu) {
                Game.UpdateMenu();
            }
            
        }
        
        // Force recalculation to apply/remove effects immediately
        setTimeout(() => {
            if (Game.CalculateGains) {
                Game.CalculateGains();
            }
            if (Game.recalculateGains) {
                Game.recalculateGains = 1;
            }
        }, 100);
        
        // Check if we should mark "Beyond the Leaderboard" as won based on new settings
        checkAndMarkBeyondTheLeaderboard();
        
        // Update UI
        updateMenuButtons();
        
        // Save settings
        setTimeout(() => {
            if (Game.Write) {
                Game.Write('CookieClickerSave', Game.Write());
            }
        }, 50);
    }
    
    // Function to apply setting changes without confirmation (for minor changes)
    function applySettingChange(settingName, newState) {
        // Update the actual variable
        if (settingName === 'shadowAchievements') {
            shadowAchievementMode = newState;
        } else if (settingName === 'enableCookieUpgrades') {
            enableCookieUpgrades = newState;
        } else if (settingName === 'enableBuildingUpgrades') {
            enableBuildingUpgrades = newState;
        } else if (settingName === 'enableKittenUpgrades') {
            enableKittenUpgrades = newState;
        }
        
        // Also update modSettings for compatibility
        modSettings[settingName] = newState;
        
        // Check if we should mark "Beyond the Leaderboard" as won based on new settings
        checkAndMarkBeyondTheLeaderboard();
        
        // Update the button text and color instantly
        updateMenuButtons();
        
        // Save settings after a short delay to avoid conflicts
        setTimeout(() => {
            // Trigger save through the existing save system
            if (Game.Write) {
                Game.Write('CookieClickerSave', Game.Write());
            }
        }, 50);
    }
    
    // Combined menu injection function
    function injectMenus() {
        const originalUpdateMenu = Game.UpdateMenu;
        Game.UpdateMenu = function() {
            const result = originalUpdateMenu.call(this);
            
            // Handle options menu injection
            if (Game.onMenu === 'prefs') {
                let menuContainer = document.getElementById('menu');
                if (menuContainer && !document.getElementById('just-natural-expansion-settings')) {
                    let settingsDiv = document.createElement('div');
                    settingsDiv.id = 'just-natural-expansion-settings';
                    settingsDiv.className = 'block';
                    settingsDiv.style.cssText = 'padding:0px;margin:0px 4px;margin-top:20px;';
                    settingsDiv.innerHTML = `
                        <div class="subsection" style="padding:0px;">
                            <div class="title">${modName} v${modVersion}</div>
                            <div style="margin:10px 0px;color:#ccc;font-size:11px;line-height:1.3;">
                                <span style="font-weight:bold;">The ${modName} Mod</span> enhances Cookie Clicker's endgame without disrupting core gameplay, staying true to the spirit of the vanilla experience. It introduces over <span style="font-weight:bold;">459 achievements</span> and <span style="font-weight:bold;">200 upgrades</span>, all specifically designed for late-game progression—so early or mid-game players may not immediately notice changes upon installation. By default, the mod adds no upgrades and marks new achievements as shadow, allowing leaderboard-focused players to pursue extra challenges without affecting their current gameplay.
                                <br><br>
                                Players seeking bigger numbers and a richer late-game can enable Cookie, Kitten, and Building upgrades, and convert shadow achievements into regular ones, earning additional milk for their accomplishments. All new achievements are designed to be attainable, though some require significant effort. Thank you for playing—and if you enjoy the mod, please spread the word!
                            </div>
                            <div class="listing">
                                <a class="option" style="text-decoration:none;color:${shadowAchievementMode ? 'lime' : 'red'};width:130px;display:inline-block;margin-left:-5px;text-align:right;font-size:12px;" 
                                   onclick="JustNaturalExpansionMod.toggleSetting('shadowAchievements');">
                                    Shadow Achievements<br><b style="font-size:12px;">${shadowAchievementMode ? 'ON' : 'OFF'}</b>
                                </a>
                                <label>(Shadow achievements do not grant milk or affect gameplay, suitable for competition play.)</label>
                            </div>
                            <div class="listing">
                                <a class="option" style="text-decoration:none;color:${enableCookieUpgrades ? 'lime' : 'red'};width:130px;display:inline-block;margin-left:-5px;text-align:right;font-size:12px;" 
                                   onclick="JustNaturalExpansionMod.toggleSetting('enableCookieUpgrades');">
                                    Cookie Upgrades<br><b style="font-size:12px;">${enableCookieUpgrades ? 'ON' : 'OFF'}</b>
                                </a>
                                <label>(Cookie upgrades add cookies which increase CPS when purchased.)</label>
                            </div>
                            <div class="listing">
                                <a class="option" style="text-decoration:none;color:${enableBuildingUpgrades ? 'lime' : 'red'};width:130px;display:inline-block;margin-left:-5px;text-align:right;font-size:12px;" 
                                   onclick="JustNaturalExpansionMod.toggleSetting('enableBuildingUpgrades');">
                                    Building Upgrades<br><b style="font-size:12px;">${enableBuildingUpgrades ? 'ON' : 'OFF'}</b>
                                </a>
                                <label>(Building upgrades add multipliers that affect specific buildings CPS.)</label>
                            </div>
                            <div class="listing">
                                <a class="option" style="text-decoration:none;color:${enableKittenUpgrades ? 'lime' : 'red'};width:130px;display:inline-block;margin-left:-5px;text-align:right;font-size:12px;" 
                                   onclick="JustNaturalExpansionMod.toggleSetting('enableKittenUpgrades');">
                                    Kitten Upgrades<br><b style="font-size:12px;">${enableKittenUpgrades ? 'ON' : 'OFF'}</b>
                                </a>
                                <label>(Kittens can be purchased after earning enough milk, they provide an overall boost to CPS.)</label>
                            </div>
                        </div>
                    `;
                    
                    let checkModDataButton = menuContainer.querySelector('a[onclick*="CheckModData"]');
                    if (checkModDataButton) {
                        let checkModDataListing = checkModDataButton.closest('.listing');
                        if (checkModDataListing) {
                            checkModDataListing.parentNode.insertBefore(settingsDiv, checkModDataListing.nextSibling);
                        } else {
                            menuContainer.appendChild(settingsDiv);
                        }
                    } else {
                        menuContainer.appendChild(settingsDiv);
                    }
                    
                    // Update buttons to reflect current settings
                    setTimeout(() => {
                        updateMenuButtons();
                    }, 10);
                }
            }
            
            // Handle stats menu injection
            if (Game.onMenu === 'stats') {
                let menuContainer = document.getElementById('menu');
                if (menuContainer && !document.getElementById('mod-stats-section')) {
            
                    
                    // Helper function to get current running totals (saved lifetime + current run)
                    function getCurrentRunningTotal(savedLifetime, currentGameValue) {
                        return (savedLifetime || 0) + (currentGameValue || 0);
                    }
                    
                    // Helper function to format numbers and only show non-zero values
                    function formatLifetimeStat(value, label) {
                        if (value && value > 0) {
                            // Special formatting for stock market profit
                            if (label.includes('stock market profit')) {
                                return `<div class="listing"><b>${label}:</b> $${value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</div>`;
                            }
                            return `<div class="listing"><b>${label}:</b> ${value.toLocaleString()}</div>`;
                        }
                        return '';
                    }
                    
                    // Create our mod stats section
                    let modStatsDiv = document.createElement('div');
                    modStatsDiv.id = 'mod-stats-section';
                    modStatsDiv.className = 'subsection';
                    
                    // Build lifetime stats HTML with current running totals
                    let lifetimeStatsHTML = '';
                    lifetimeStatsHTML += formatLifetimeStat(
                        getCurrentRunningTotal(lifetimeData.reindeerClicked, Game.reindeerClicked), 
                        'Reindeer clicked'
                    );
                    lifetimeStatsHTML += formatLifetimeStat(
                        getLifetimeStockMarketAssets(), 
                        'Lifetime stock market profit'
                    );
                    lifetimeStatsHTML += formatLifetimeStat(
                        getCurrentRunningTotal(lifetimeData.shinyWrinklersPopped, Game.shinyWrinklersPopped), 
                        'Shiny wrinklers bursted'
                    );
                    lifetimeStatsHTML += formatLifetimeStat(
                        getCurrentRunningTotal(lifetimeData.wrathCookiesClicked, Game.wrathCookiesClicked), 
                        'Wrath cookies clicked'
                    );
                    lifetimeStatsHTML += formatLifetimeStat(
                        getCurrentRunningTotal(lifetimeData.totalGardenSacrifices, 
                            Game.Objects['Farm'] && Game.Objects['Farm'].minigame ? Game.Objects['Farm'].minigame.sacrifices : 0), 
                        'Garden sacrifices'
                    );
                    lifetimeStatsHTML += formatLifetimeStat(
                        getCurrentRunningTotal(lifetimeData.totalCookieClicks, Game.cookieClicks), 
                        'Cookie clicks'
                    );
                    lifetimeStatsHTML += formatLifetimeStat(
                        getCurrentRunningTotal(lifetimeData.wrinklersPopped, Game.wrinklersPopped), 
                        'Wrinklers bursted'
                    );
                    lifetimeStatsHTML += formatLifetimeStat(
                        getCurrentRunningTotal(lifetimeData.pledges, Game.pledges) + getCurrentRunningTotal(lifetimeData.elderCovenantToggles, 0), 
                        'Grandmatriarchs quashed'
                    );
                    
                    // Add garden sacrifice timer if active
                    if (lifetimeData.lastGardenSacrificeTime) {
                        var currentTime = Date.now();
                        var timeElapsed = currentTime - lifetimeData.lastGardenSacrificeTime;
                        var timeLimit = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds
                        var timeRemaining = timeLimit - timeElapsed;
                        
                        if (timeRemaining > 0) {
                            var days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
                            var hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                            var minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
                            
                            lifetimeStatsHTML += `<div class="listing"><b>Garden sacrifice timer:</b> ${days}d ${hours}h ${minutes}m remaining</div>`;
                        }
                    }
                    
                    lifetimeStatsHTML += formatLifetimeStat(
                        getCurrentRunningTotal(lifetimeData.gardenSacrifices, 
                            Game.Objects['Farm'] && Game.Objects['Farm'].minigame ? Game.Objects['Farm'].minigame.convertTimes : 0), 
                        'Garden sacrifices'
                    );
                    
                    // Calculate actual mod achievement and upgrade counts
                    var modAchievementsUnlocked = 0;
                    var totalModAchievements = 0;
                    var modUpgradesPurchased = 0;
                    var totalModUpgrades = 0;
                    
                    // Count mod achievements (excluding shadow achievements)
                    if (modAchievementNames) {
                        modAchievementNames.forEach(name => {
                            if (Game.Achievements[name]) {
                                if (Game.Achievements[name].pool !== 'shadow') {
                                    totalModAchievements++;
                                    if (Game.Achievements[name].won) {
                                        modAchievementsUnlocked++;
                                    }
                                }
                            }
                        });
                    }
                    
                    // Count mod upgrades by checking all upgrades for mod source text
                    if (Game.Upgrades) {
                        for (var upgradeName in Game.Upgrades) {
                            var upgrade = Game.Upgrades[upgradeName];
                            if (upgrade && upgrade.ddesc && upgrade.ddesc.includes(modName)) {
                                totalModUpgrades++;
                                if (upgrade.bought) {
                                    modUpgradesPurchased++;
                                }
                            }
                        }
                    }
                    
                    modStatsDiv.innerHTML = `
                        <div class="title">${modName}</div>
                        <div id="statsMod">
                            <div class="listing"><b>Mod achievements unlocked:</b> ${modAchievementsUnlocked} / ${totalModAchievements}</div>
                            <div class="listing"><b>Mod upgrades purchased:</b> ${modUpgradesPurchased} / ${totalModUpgrades}</div>
                            ${lifetimeStatsHTML}
                        </div>
                    `;
                    
                    // Find the Special section and insert our section after it
                    let specialSection = null;
                    let generalSection = null;
                    let subsections = menuContainer.querySelectorAll('.subsection');
                    
                    for (let i = 0; i < subsections.length; i++) {
                        let subsection = subsections[i];
                        let title = subsection.querySelector('.title');
                        if (title) {
                            if (title.textContent.includes('Special')) {
                                specialSection = subsection;
                            } else if (title.textContent.includes('General')) {
                                generalSection = subsection;
                            }
                        }
                    }
                    
                    if (specialSection) {

                        specialSection.parentNode.insertBefore(modStatsDiv, specialSection.nextSibling);
                    } else if (generalSection) {

                        generalSection.parentNode.insertBefore(modStatsDiv, generalSection.nextSibling);
                    } else {

                        menuContainer.appendChild(modStatsDiv);
                    }
                    

                }
            }
            
            return result;
        };
        

        return true;
    }
    
    // ===== CENTRALIZED HOOK REGISTRATION SYSTEM =====
    // This system only handles hook registration - no content changes
    
    // Centralized hook registration function
    function registerHook(hookType, callback, description) {
        if (!Game.registerHook) {
            console.warn('Game.registerHook not available for:', description);
            return false;
        }
        
        try {
            Game.registerHook(hookType, callback);
                      if (debugMode) {
              // Debug mode specific code can go here if needed
          }
            return true;
        } catch (e) {
            console.error('Failed to register hook:', hookType, '-', description, e);
            return false;
        }
    }
    
    // Register all hooks in one place
    function registerAllHooks() {

        
        // Seasonal reindeer tracking
        registerHook('logic', function() {
            if (modTracking.reindeerClicked > modTracking.lastReindeerClicked) {
                var currentSeason = getCurrentSeason();
                if (currentSeason && currentSeason !== 'christmas') {
                    if (seasonalReindeerData[currentSeason]) {
                        seasonalReindeerData[currentSeason].popped = true;
                        if (seasonalReindeerData[currentSeason].achievement) {
                            Game.Win(seasonalReindeerData[currentSeason].achievement);
                        }
                    }
                }
                modTracking.lastReindeerClicked = modTracking.reindeerClicked;
            }
        }, 'Track seasonal reindeer pops');
        
        // Garden harvest all hook for duketater achievement
        // We'll hook directly when the garden minigame loads, not via logic hook
        
        // Function to hook into garden harvest all
        // Function to hook into garden harvest all
        function hookGardenHarvestAll() {
            if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
                var M = Game.Objects['Farm'].minigame;
                
                // Hook into the harvest all function if not already hooked
                if (M.harvestAll && typeof M.harvestAll === 'function' && !M._harvestAllHooked) {
                    var originalHarvestAll = M.harvestAll;
                    M.harvestAll = function() {
                        // Check for duketater plants BEFORE harvesting them
                        var duketaterCount = 0;
                        
                        if (M.plot && M.plantsById) {
                            // Count mature duketaters before harvesting
                            for (var y = 0; y < M.plot.length; y++) {
                                for (var x = 0; x < M.plot[y].length; x++) {
                                    var plotData = M.plot[y][x];
                                    if (plotData && plotData[0] > 0) {
                                        var plantId = plotData[0] - 1; // Plant IDs are 1-indexed
                                        var plant = M.plantsById[plantId];
                                        var plantAge = plotData[1];
                                        
                                        if (plant && plant.name.toLowerCase() === 'duketater' && plantAge >= plant.mature) {
                                            duketaterCount++;
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Now call the original function to harvest the plants
                        var result = originalHarvestAll.apply(this, arguments);
                        
                        // Check if achievement should be unlocked
                        if (duketaterCount >= 12) {
                            var achievementName = 'Duketater Salad';
                            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                                markAchievementWon(achievementName);
                            }
                        }
                        
                        return result;
                    };
                    M._harvestAllHooked = true;
                }
            }
        }
        
        // Try to hook immediately if garden is already available
        hookGardenHarvestAll();
        
        // Also try to hook when the game loads (in case garden loads later)
        registerHook('check', function() {
            if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame && 
                Game.Objects['Farm'].minigame.plot && 
                Game.Objects['Farm'].minigame.plantsById && 
                !Game.Objects['Farm'].minigame._harvestAllHooked) {
                hookGardenHarvestAll();
            }
        }, 'Check if garden is ready for harvest all hook');
        
        // Wrinkler tracking - combines shiny wrinkler and golden wrinkler logic
        registerHook('logic', function() {
            if (Game.wrinklers) {
                for (var i in Game.wrinklers) {
                    var me = Game.wrinklers[i];
                    var prevState = modTracking.previousWrinklerStates[i];
                    
                    // Check if wrinkler was just popped (phase went from > 0 to 0)
                    if (prevState && prevState.phase > 0 && me.phase == 0) {
                        // Track shiny wrinkler pops
                        if (me && me.type == 1) {
                            modTracking.shinyWrinklersPopped++;
                        }
                        
                        // Check for golden wrinkler achievement
                        // Use the previous state's sucked value since the current state is already popped
                        var wrinklerValue = (modTracking.previousWrinklerStates[i] && modTracking.previousWrinklerStates[i].sucked) || 0;
                        var currentCPS = Game.cookiesPs || 0;
                        
                                    // Check for bank doubling achievement
            if (modTracking.previousWrinklerStates[i] && modTracking.previousWrinklerStates[i].bankBeforePop) {
                var bankBeforePop = modTracking.previousWrinklerStates[i].bankBeforePop;
                var bankAfterPop = Game.cookies || 0;
                
                // Check if bank doubled (new bank >= 2 * old bank)
                if (bankAfterPop >= bankBeforePop * 2 && bankBeforePop > 0) {
                    modTracking.bankDoubledByWrinkler = true;
                    
                    // Award achievement if not already won
                    if (Game.Achievements['Wrinkler Windfall'] && !Game.Achievements['Wrinkler Windfall'].won) {
                        markAchievementWon('Wrinkler Windfall');
                    }
                }
            }
                        
                        // Calculate 6.66 years of CPS, handling extremely large numbers
                        var sixPointSixSixYearsOfCPS = 0;
                        if (currentCPS > 0) {
                            try {
                                // Use the threshold value directly (210000000 seconds = 6.66 years)
                                var thresholdValue = 210000000;
                                
                                // For extremely large numbers, use logarithmic approach to avoid overflow
                                if (currentCPS > 1e50) {
                                    // Convert to scientific notation and add the threshold
                                    var cpsExponent = Math.floor(Math.log10(currentCPS));
                                    var cpsMantissa = currentCPS / Math.pow(10, cpsExponent);
                                    
                                    // Add the threshold (210000000 seconds = 6.66 years)
                                    var thresholdExponent = Math.floor(Math.log10(thresholdValue));
                                    var totalExponent = cpsExponent + thresholdExponent;
                                    
                                    // Check if the result would be too large for JavaScript
                                    if (totalExponent > 300) {

                                        // For extremely large numbers, just add the threshold exponent
                                        sixPointSixSixYearsOfCPS = currentCPS * 10; // Approximate: 6.66 years ≈ 10x current CPS
                                    } else {
                                        // Calculate the result
                                        sixPointSixSixYearsOfCPS = cpsMantissa * Math.pow(10, totalExponent);

                                    }
                                } else {
                                    // Normal calculation for smaller numbers
                                    sixPointSixSixYearsOfCPS = currentCPS * thresholdValue;

                                }
                            } catch (e) {

                                // Fallback: use a reasonable approximation
                                sixPointSixSixYearsOfCPS = currentCPS * 10; // 6.66 years ≈ 10x current CPS
                            }
                        }
                        
                        // Award achievement if wrinkler was worth 6.66 years of CPS
                        if (wrinklerValue >= sixPointSixSixYearsOfCPS && currentCPS > 0) {
                            if (Game.Achievements['Golden wrinkler'] && !Game.Achievements['Golden wrinkler'].won) {
                                markAchievementWon('Golden wrinkler');
                            }
                        }
                    }
                    
                    // Update previous state for all wrinklers
                    if (me) {
                        modTracking.previousWrinklerStates[i] = {
                            phase: me.phase,
                            sucked: me.sucked,
                            bankBeforePop: me.phase > 0 ? (Game.cookies || 0) : undefined // Store bank value when wrinkler is active
                        };
                    }
                }
            }
        }, 'Track wrinkler pops and achievements');
        
        // Buff achievement checking - runs every tick for immediate response
        registerHook('logic', function() {
            // Check Frenzy frenzy achievement (all three frenzy buffs active)
            if (Game.Achievements['Frenzy frenzy'] && !Game.Achievements['Frenzy frenzy'].won) {
                if (Game.hasBuff('Click frenzy') && Game.hasBuff('Frenzy') && Game.hasBuff('Elder frenzy')) {
                    markAchievementWon('Frenzy frenzy');
                }
            }
            
            // Check Double Dragon Clicker achievement (Dragonflight + Click frenzy)
            if (Game.Achievements['Double Dragon Clicker'] && !Game.Achievements['Double Dragon Clicker'].won) {
                if (Game.hasBuff('Dragonflight') && Game.hasBuff('Click frenzy')) {
                    markAchievementWon('Double Dragon Clicker');
                }
            }
            
            // Check Hogwarts Graduate achievement (3 positive spell effects)
            if (Game.Achievements['Hogwarts Graduate'] && !Game.Achievements['Hogwarts Graduate'].won) {
                var positiveSpells = 0;
                if (Game.hasBuff('Haggler\'s luck')) positiveSpells++;
                if (Game.hasBuff('Magic adept')) positiveSpells++;
                if (Game.hasBuff('Crafty pixies')) positiveSpells++;
                
                if (positiveSpells >= 3) {
                    markAchievementWon('Hogwarts Graduate');
                }
            }
            
            // Check Hogwarts Dropout achievement (3 negative spell effects)
            if (Game.Achievements['Hogwarts Dropout'] && !Game.Achievements['Hogwarts Dropout'].won) {
                var negativeSpells = 0;
                if (Game.hasBuff('Haggler\'s misery')) negativeSpells++;
                if (Game.hasBuff('Magic inept')) negativeSpells++;
                if (Game.hasBuff('Nasty goblins')) negativeSpells++;
                if (Game.hasBuff('Devastation')) negativeSpells++;
                
                if (negativeSpells >= 3) {
                    markAchievementWon('Hogwarts Dropout');
                }
            }
            
            // Check Frenzy Marathon achievement (frenzy buff with 10+ minute total duration)
            if (Game.Achievements['Frenzy Marathon'] && !Game.Achievements['Frenzy Marathon'].won) {
                // Look for an active Frenzy buff
                for (var buffName in Game.buffs) {
                    var buff = Game.buffs[buffName];
                    if (buff && buff.name === 'Frenzy' && buff.time > 0) {
                        // Use the actual game FPS to calculate real values on the fly
                        var gameFps = Game.FPS || Game.fps || 30;
                        var requiredDurationSeconds = 600; // 10 minutes
                        var requiredDurationFrames = requiredDurationSeconds * gameFps;
                        
                        // Check if the buff's maxTime meets the 10-minute requirement
                        // maxTime represents the total duration when the buff was created/stacked
                        if (buff.maxTime >= requiredDurationFrames) {
                            markAchievementWon('Frenzy Marathon');
                            break;
                        }
                    }
                }
            }
            

            
            // Check Spell Slinger achievement (10 spells within 10 seconds)
            if (Game.Achievements['Spell Slinger'] && !Game.Achievements['Spell Slinger'].won) {
                var currentTime = Date.now();
                var tenSecondsAgo = currentTime - 10000; // 10 seconds in milliseconds
                
                // Remove old spell cast times (older than 10 seconds)
                modTracking.spellCastTimes = modTracking.spellCastTimes.filter(function(timestamp) {
                    return timestamp > tenSecondsAgo;
                });
                
                // Check if we have 10 or more spells in the 10-second window
                if (modTracking.spellCastTimes.length >= 10) {
                    markAchievementWon('Spell Slinger');
                }
            }
            
            // Check other buff count achievements (3, 6, 9, 12 buffs)
            var currentBuffs = Object.keys(Game.buffs).length;
            
            // Check Trifecta Combo (3 buffs)
            if (Game.Achievements['Trifecta Combo'] && !Game.Achievements['Trifecta Combo'].won && currentBuffs >= 3) {
                markAchievementWon('Trifecta Combo');
            }
            
            // Check Combo Initiate (6 buffs)
            if (Game.Achievements['Combo Initiate'] && !Game.Achievements['Combo Initiate'].won && currentBuffs >= 6) {
                markAchievementWon('Combo Initiate');
            }
            
            // Check Combo God (9 buffs)
            if (Game.Achievements['Combo God'] && !Game.Achievements['Combo God'].won && currentBuffs >= 9) {
                markAchievementWon('Combo God');
            }
            
            // Check Combo Hacker (12 buffs)
            if (Game.Achievements['Combo Hacker'] && !Game.Achievements['Combo Hacker'].won && currentBuffs >= 12) {
                markAchievementWon('Combo Hacker');
            }
        }, 'Check buff achievements in real-time');
        
        // Hook into Grimoire spell casting to track Spell Slinger achievement and FtHoF cookies
        // This runs when the Grimoire minigame is available
        if (Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].minigame) {
            var originalCastSpell = Game.Objects['Wizard tower'].minigame.castSpell;
            if (originalCastSpell) {
                Game.Objects['Wizard tower'].minigame.castSpell = function(spell, obj) {
                    // Call the original function first to get the result
                    var result = originalCastSpell.call(this, spell, obj);
                    
                    // Only track successful spell casts (when result is true)
                    if (result === true) {
                        modTracking.spellCastTimes.push(Date.now());
                        
                        // Track FtHoF spell specifically
                        if (spell.name === 'Force the Hand of Fate') {
                            // FtHoF spell cast - next golden cookie will be forced
                        }
                    }
                    
                    // Return the original result
                    return result;
                };
            }
        }
        
        // Hook into cookie clicking to track Click of the Titans achievement
        var originalClickCookie = Game.ClickCookie;
        if (originalClickCookie) {
            Game.ClickCookie = function(e, amount) {
                // Call the original function first
                var result = originalClickCookie.call(this, e, amount);
                
                // Check for Click of the Titans achievement (1 year of raw CPS in single click)
                if (Game.Achievements['Click of the Titans'] && !Game.Achievements['Click of the Titans'].won) {
                    var clickAmount = amount || Game.computedMouseCps;
                    var currentRawCPS = Game.cookiesPsRaw || 0;
                    var oneYearOfRawCPS = currentRawCPS * 31536000; // 1 year in seconds
                    
                    if (clickAmount >= oneYearOfRawCPS && currentRawCPS > 0) {
                        markAchievementWon('Click of the Titans');
                    }
                }
                
                return result;
            };
        }
        

        
        // FtHoF tracking is now handled in the single castSpell hook above
        
        // Temple swap tracking
        registerHook('logic', function() {
            if (Game.Objects['Temple'] && Game.Objects['Temple'].minigame) {
                var M = Game.Objects['Temple'].minigame;
                var currentSwaps = M.swaps || 0;
                if (modTracking.previousTempleSwaps > currentSwaps) {
                    var swapsUsed = modTracking.previousTempleSwaps - currentSwaps;
                    modTracking.templeSwapsTotal += swapsUsed;
            
                }
                modTracking.previousTempleSwaps = currentSwaps;
            }
        }, 'Track temple swap usage');
        
        // Soil change tracking
        registerHook('logic', function() {
            if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
                var M = Game.Objects['Farm'].minigame;
                var currentSoilType = M.soil || 0;
                if (modTracking.previousSoilType !== null && modTracking.previousSoilType !== currentSoilType) {
                    modTracking.soilChangesTotal++;
            
                }
                modTracking.previousSoilType = currentSoilType;
            }
        }, 'Track garden soil type changes');
        
                // Wrath cookie tracking - override the shimmer pop function to track wrath cookies
        if (Game.shimmerTypes && Game.shimmerTypes['golden']) {
            var originalPopFunc = Game.shimmerTypes['golden'].popFunc;
            Game.shimmerTypes['golden'].popFunc = function(me) {
                // Check if this is a FtHoF-created cookie BEFORE calling original function
                var isFtHoFCookie = me.force && me.force !== '';
                var forcedOutcome = me.force;
                var forceObject = me.forceObj;
                var isWrath = me.wrath;
                
                // Call the original function AFTER capturing the properties
                originalPopFunc.call(this, me);
                
                // Check if this was a wrath cookie
                if (me && me.wrath) {
                    modTracking.wrathCookiesClicked++;
                }
                
                // Check if this is a FtHoF-created cookie (has a forced outcome)
                if (isFtHoFCookie) {
                    // Store the FtHoF cookie data for achievement tracking
                    if (!modTracking.fthofCookieOutcomes) {
                        modTracking.fthofCookieOutcomes = [];
                    }
                    
                    modTracking.fthofCookieOutcomes.push({
                        outcome: forcedOutcome,
                        wrath: isWrath,
                        forceObj: forceObject,
                        timestamp: Date.now()
                    });
                    
                    // Check for Sweet Sorcery achievement (free sugar lump outcome)
                    if (forcedOutcome === 'free sugar lump') {
                        if (Game.Achievements['Sweet Sorcery'] && !Game.Achievements['Sweet Sorcery'].won) {
                            markAchievementWon('Sweet Sorcery');
                        }
                    }
                }
            };
        }
        
        // Elder Covenant tracking - override the Elder Covenant upgrade function
        if (Game.Upgrades && Game.Upgrades['Elder Covenant']) {
            var originalElderCovenantFunc = Game.Upgrades['Elder Covenant'].buy;
            Game.Upgrades['Elder Covenant'].buy = function() {
                // Call the original function first
                originalElderCovenantFunc.call(this);
                
                // Track the toggle
                lifetimeData.elderCovenantToggles++;
        
            };
        }
        
        // Garden sacrifice tracking - override the garden convert function
        if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
            var originalConvertFunc = Game.Objects['Farm'].minigame.convert;
            Game.Objects['Farm'].minigame.convert = function() {
                // Call the original function first
                originalConvertFunc.call(this);
                
                // Track the sacrifice time
                lifetimeData.lastGardenSacrificeTime = Date.now();
        
            };
        }
        

        
        // Upgrade effects
        registerHook('cps', function(cps) {
            cps = applyUpgradeEffects(cps);
            return cps;
        }, 'Apply mod upgrade effects to CPS calculation');
        
        // Upgrade unlock conditions
        registerHook('check', checkUpgradeUnlockConditions, 'Check mod upgrade unlock conditions');
        
        // Upgrade checking
        registerHook('check', checkUpgrades, 'Check mod upgrade states');
        
        // Achievement checking
        registerHook('check', checkModAchievements, 'Check mod achievement conditions');
        
        // Lifetime tracking hooks
        registerHook('check', handleCheck, 'Monitor for ascension and capture values');
        registerHook('reincarnate', handleReincarnate, 'Log reincarnate event');
        registerHook('reset', handleReset, 'Clear data on full reset');
        
        // God usage tracking hook
        registerHook('check', trackGodUsage, 'Track pantheon god usage time');
        
        // Kitten injection system - inject custom kitten multiplier code into Game.CalculateGains
        const findAndHookKittenCalculation = function() {
            try {
                let originalCalculateGains = Game.CalculateGains;
                if (!originalCalculateGains) {
                    console.warn('Game.CalculateGains not available for kitten injection');
                    return;
                }
                
                let originalFunctionStr = originalCalculateGains.toString();
                
                // Look for kitten-related patterns in the minified code
                if (originalFunctionStr.includes('kittens')) {
                    // Try different patterns for the kitten assignment
                    const patterns = [
                        /Game\.cookiesMultByType\['kittens'\]=catMult/,
                        /Game\.cookiesMultByType\.kittens=catMult/,
                        /cookiesMultByType\['kittens'\]=catMult/,
                        /cookiesMultByType\.kittens=catMult/,
                        /kittens.*=.*catMult/,
                        /catMult.*kittens/
                    ];
                    
                    let foundPattern = null;
                    for (let pattern of patterns) {
                        if (pattern.test(originalFunctionStr)) {
                            foundPattern = pattern;
                            break;
                        }
                    }
                    
                    if (foundPattern) {
                        // Create injection code for all 11 kitten upgrades
                        const injection = "if(Game.Has('Kitten unpaid interns')){catMult*=(1+Game.milkProgress*0.005*milkMult);}\n" +
                                         "if(Game.Has('Kitten overpaid \"temporary\" contractors')){catMult*=(1+Game.milkProgress*0.005*milkMult);}\n" +
                                         "if(Game.Has('Kitten remote workers')){catMult*=(1+Game.milkProgress*0.005*milkMult);}\n" +
                                         "if(Game.Has('Kitten scrum masters')){catMult*=(1+Game.milkProgress*0.005*milkMult);}\n" +
                                         "if(Game.Has('Kitten UX designers')){catMult*=(1+Game.milkProgress*0.005*milkMult);}\n" +
                                         "if(Game.Has('Kitten janitors')){catMult*=(1+Game.milkProgress*0.005*milkMult);}\n" +
                                         "if(Game.Has('Kitten coffee fetchers')){catMult*=(1+Game.milkProgress*0.005*milkMult);}\n" +
                                         "if(Game.Has('Kitten personal assistants')){catMult*=(1+Game.milkProgress*0.005*milkMult);}\n" +
                                         "if(Game.Has('Kitten vice presidents')){catMult*=(1+Game.milkProgress*0.005*milkMult);}\n" +
                                         "if(Game.Has('Kitten board members')){catMult*=(1+Game.milkProgress*0.005*milkMult);}\n" +
                                         "if(Game.Has('Kitten founders')){catMult*=(1+Game.milkProgress*0.005*milkMult);}";
                        
                        let modifiedFunctionStr = originalFunctionStr.replace(
                            foundPattern,
                            injection + "\n" + originalFunctionStr.match(foundPattern)[0]
                        );
                        let newFunction = eval('(' + modifiedFunctionStr + ')');
                        Game.CalculateGains = newFunction;
                    }
                }
            } catch (error) {
                console.error('Error injecting custom kitten multiplier code:', error);
            }
        };
        
        // Register the kitten injection hook
        registerHook('logic', function() {
            // Only inject once when the game is ready
            if (Game.CalculateGains && !Game.CalculateGains._kittenInjected) {
                findAndHookKittenCalculation();
                Game.CalculateGains._kittenInjected = true;
            }
        }, 'Inject custom kitten multiplier code');

    }
    
    // Lists of mod upgrade names by category for easy removal/addition
    var cookieUpgradeNames = [
        'Box of improved cookies',
        'Improved Plain cookies', 'Improved Milk chocolate butter biscuit', 'Improved Dark chocolate butter biscuit', 
        'Improved White chocolate butter biscuit', 'Improved Ruby chocolate butter biscuit', 'Improved Lavender chocolate butter biscuit', 
        'Improved Synthetic chocolate green honey butter biscuit', 'Improved Sugar cookies', 'Improved Oatmeal raisin cookies', 
        'Improved Peanut butter cookies', 'Improved Coconut cookies', 'Improved Macadamia nut cookies', 'Improved Almond cookies', 
        'Improved Hazelnut cookies', 'Improved Walnut cookies', 'Improved Cashew cookies', 'Improved White chocolate cookies', 
        'Improved Milk chocolate cookies', 'Improved Double-chip cookies', 'Improved White chocolate macadamia nut cookies', 
        'Improved All-chocolate cookies', 'Improved Dark chocolate-coated cookies', 'Improved White chocolate-coated cookies', 
        'Improved Eclipse cookies', 'Improved Zebra cookies', 'Improved Snickerdoodles', 'Improved Stroopwafels', 
        'Improved Macaroons', 'Improved Empire biscuits', 'Improved Madeleines', 'Improved Palmiers', 'Improved Palets'
    ];
    
    var buildingUpgradeNames = [
        'Advanced knitting techniques', 'Bingo night optimization', 'Tea time efficiency', 'Gossip-powered baking', 
        'Senior discount mastery', 'Hydroponic cookie cultivation', 'Vertical farming revolution', 'Quantum crop rotation', 
        'Sentient soil enhancement', 'Temporal harvest acceleration', 'Quantum tunneling excavation', 'Neutron star compression', 
        'Dimensional rift mining', 'Singularity core extraction', 'Temporal paradox drilling', 'Quantum assembly optimization', 
        'Temporal manufacturing loops', 'Dimensional cookie synthesis', 'Singularity production cores', 'Reality-warping assembly', 
        'Quantum banking protocols', 'Temporal interest compounding', 'Dimensional currency exchange', 'Singularity financial algorithms', 
        'Reality-warping economics', 'Quantum divine intervention', 'Temporal prayer loops', 'Dimensional deity summoning', 
        'Singularity divine consciousness', 'Reality-warping divinity', 'Arcane resonance', 'Spell weaving', 'Mystical attunement', 
        'Ethereal manifestation', 'Transcendent thaumaturgy', 'Hypervelocity transport', 'Spatial compression', 'Dimensional routing', 
        'Quantum teleportation', 'Causality manipulation', 'Essence distillation', 'Molecular gastronomy', 'Flavor alchemy', 
        'Culinary transmutation', 'Gastronomic enlightenment', 'Dimensional gateways', 'Reality bridges', 'Spatial conduits', 
        'Interdimensional highways', 'Cosmic gateways', 'Temporal engineering', 'Chronological optimization', 'Historical preservation', 
        'Temporal synchronization', 'Chronological mastery', 'Particle synthesis', 'Matter transmutation', 'Quantum baking', 
        'Particle optimization', 'Matter manipulation', 'Light crystallization', 'Spectral baking', 'Optical alchemy', 
        'Luminous confectionery', 'Radiant gastronomy', 'Probability manipulation', 'Fortune optimization', 'Serendipity engineering', 
        'Random enhancement', 'Luck amplification', 'Infinite recursion', 'Self-similar baking', 'Fractal optimization', 
        'Recursive enhancement', 'Fractal gastronomy', 'Code optimization', 'Programmatic baking', 'Algorithmic enhancement', 
        'Computational gastronomy', 'Digital confectionery', 'Reality real estate', 'Dimensional franchising', 'Cosmic supply chains', 
        'Reality marketplaces', 'Multiverse headquarters', 'Neural plasticity', 'Synaptic pruning', 'Cognitive load balancing', 
        'Metacognitive awareness', 'Neural synchronization', 'Mitotic mastery', 'Epigenetic programming', 'Cellular differentiation', 
        'Telomere regeneration', 'Quantum entanglement',
        // Discount upgrades (5% less building cost upgrades)
        'Increased Social Security Checks', 'Off-Brand Eyeglasses', 'Plastic Walkers', 'Bulk Discount Hearing Aids', 
        'Generic Arthritis Medication', 'Wholesale Denture Adhesive', 'Biodiesel fueled tractors', 'Free manure from clone factories', 
        'Solar-powered irrigation systems', 'Bulk seed purchases', 'Robot farm hands', 'Vertical farming subsidies', 
        'Recycled mining equipment', 'Bulk dynamite purchases', 'Solar-powered drills', 'Robot mining crews', 
        'Government mining subsidies', 'Underground cookie cities', 'Recycled assembly lines', 'Bulk steel purchases', 
        'Solar-powered machinery', 'Robot assembly workers', 'Government manufacturing subsidies', 'Automated cookie cities', 
        'Off-brand security systems', 'Wholesale safe deposits', 'Energy-efficient ATMs', 'Automated teller machines', 
        'Federal reserve support', 'Wall Street partnerships', 'Generic prayer mats', 'Wholesale holy water', 'LED altar lighting', 
        'Automated prayer systems', 'Vatican endorsements', 'Holy cookie cities', 'Recycled wizard equipment', 'Bulk spell book purchases', 
        'Solar-powered wizardry', 'Robot wizard apprentices', 'Government magic subsidies', 'Arcane cookie cities', 
        'Recycled shipping equipment', 'Bulk container purchases', 'Solar-powered shipping', 'Robot shipping crews', 
        'Government shipping subsidies', 'Port cookie cities', 'Discount alchemy supplies', 'Bulk philosopher\'s stone', 
        'Energy-efficient cauldrons', 'Automated potion brewers', 'Alchemist guild support', 'Transmutation districts', 
        'Generic portal stabilizers', 'Bulk dimensional anchors', 'Energy-efficient portals', 'Automated portal systems', 
        'Portal guild support', 'Dimensional districts', 'Off-brand time crystals', 'Bulk temporal stabilizers', 
        'Energy-efficient chronometers', 'Automated time travelers', 'Temporal council support', 'Chronological cookie cities', 
        'Generic antimatter containers', 'Bulk matter converters', 'Energy-efficient reactors', 'Automated particle accelerators', 
        'Particle physics institute support', 'Antimatter cookie cities', 'Discount prism lenses', 'Bulk light amplifiers', 
        'Energy-efficient spectrums', 'Automated light benders', 'Optical institute support', 'Spectrum cookie cities', 
        'Generic chance generators', 'Bulk fortune cookies', 'Energy-efficient luck', 'Automated fortune tellers', 
        'Luck institute support', 'Fortune cookie cities', 'Off-brand fractal processors', 'Bulk pattern matrices', 
        'Energy-efficient recursion', 'Automated pattern generators', 'Mathematics institute support', 'Pattern cookie cities', 
        'Generic console terminals', 'Bulk code compilers', 'Energy-efficient debugging', 'Automated code reviewers', 
        'Programming institute support', 'Code cookie cities'
    ];
    
    var kittenUpgradeNames = [
        'Kitten unpaid interns', 'Kitten overpaid "temporary" contractors', 'Kitten remote workers', 'Kitten scrum masters', 
        'Kitten UX designers', 'Kitten janitors', 'Kitten coffee fetchers', 'Kitten personal assistants', 'Kitten vice presidents', 
        'Kitten board members', 'Kitten founders'
    ];
    
    // Generate combined mod upgrade names array on the fly
    function getModUpgradeNames() {
        return cookieUpgradeNames.concat(buildingUpgradeNames).concat(kittenUpgradeNames);
    }
    
    // List of all mod achievement names for debug reset
    var modAchievementNames = [];
    
    // Sprite sheet loading system - load once, reference many times
    var spriteSheets = {
        custom: 'https://i.imgur.com/3jNJJNw.png',
        gardenPlants: 'https://orteil.dashnet.org/cookieclicker/img/gardenPlants.png'
    };
    
    // Preload sprite sheets to avoid multiple HTTP requests
    function preloadSpriteSheets() {
        for (var sheetName in spriteSheets) {
            var img = new Image();
            img.src = spriteSheets[sheetName];
            // Store the loaded image for reference
            spriteSheets[sheetName + '_loaded'] = img;
        }
    }
    
    // Helper function to get sprite sheet URL
    function getSpriteSheet(sheetName) {
        return spriteSheets[sheetName] || '';
    }
    
    // Debug function to unlock all achievements
    function unlockAllAchievements() {
        if (!Game || !Game.Achievements) return;
        

        
        // Only unlock mod achievements (those with requirement functions)
        for (var achId in Game.Achievements) {
            var ach = Game.Achievements[achId];
            if (ach && ach.requirement && !ach.won) {
                ach.won = 1;
                ach.hide = 0;
                Game.AchievementsOwned++;
                if (Game.AchievementsById[achId]) {
                    Game.AchievementsById[achId].won = 1;
                }
                // console.log('Unlocked mod achievement:', ach.name); // Disabled for less spam
            }
        }
        

    }
    

    
    // Global initialization protection
    if (window.JustNaturalExpansionInitialized) {

        return;
    }
    window.JustNaturalExpansionInitialized = true;
    

    
    // Helper: Find last vanilla achievement by name
    function findLastVanillaAchievement(targetName) {
        if (!Game || !Game.Achievements) {
            console.warn('Game or Game.Achievements not available');
            return { order: 0, icon: [0, 0] };
        }
        
        var lastOrder = 0;
        var lastIcon = [0, 0];
        var lastAchievement = null;
        for (var achId in Game.Achievements) {
            var ach = Game.Achievements[achId];
            if (ach && ach.name === targetName && ach.order > lastOrder) {
                lastOrder = ach.order;
                lastIcon = ach.icon;
                lastAchievement = ach;
            }
        }
        
        if (lastOrder === 0) {
            console.warn('Vanilla achievement not found:', targetName);
        }
        
        return { order: lastOrder, icon: lastIcon, achievement: lastAchievement };
    }
    
    // Reset all achievement and upgrade progress to fresh launch state
    function resetAllProgress() {
        if (!Game) return;
        

        
        // Reset only mod achievements to unwon state
        for (var i = 0; i < modAchievementNames.length; i++) {
            var achievementName = modAchievementNames[i];
            var ach = Game.Achievements[achievementName];
            if (ach) {
                ach.won = false;
            }
        }
        
        // Reset only mod upgrades to unpurchased state
        var modUpgradeNames = getModUpgradeNames();
        for (var i = 0; i < modUpgradeNames.length; i++) {
            var upgradeName = modUpgradeNames[i];
            var upgrade = Game.Upgrades[upgradeName];
            if (upgrade) {
                upgrade.bought = 0;
            }
        }
        
        // Reset seasonal reindeer data
        for (var season in seasonalReindeerData) {
            if (seasonalReindeerData[season]) {
                seasonalReindeerData[season].popped = false;
            }
        }
        
        // Reset any mod-specific progress tracking
        if (Game.lastReindeerClicked !== undefined) {
            Game.lastReindeerClicked = 0;
        }
        
        // Force UI updates
        if (Game.updateAchievementsMenu) {
            Game.updateAchievementsMenu();
        }
        if (Game.updateUpgradesMenu) {
            Game.updateUpgradesMenu();
        }
        

    }
    
    // Simplified achievement creation - following the ECMplusplusplus pattern
    function createAchievement(name, desc, icon, order, requirement, customIcon) {
        if (!Game || !Game.Achievements) {
            console.warn('Game not available for achievement creation');
            return null;
        }
        
        if (!name || !desc) {
            console.warn('Invalid achievement data:', { name: name, desc: desc });
            return null;
        }
        
        // Use custom icon if provided, otherwise use the vanilla icon
        var finalIcon = customIcon || icon;
        
        // Handle custom icon formats
        if (customIcon && Array.isArray(customIcon)) {
            if (customIcon.length === 3) {
                // Spiced Cookies pattern: [x, y, spriteSheetURL]
                finalIcon = [customIcon[0], customIcon[1], customIcon[2]];
            } else if (customIcon.length === 2) {
                // Simple coordinates: [x, y]
                finalIcon = customIcon;
            }
        }
        
        // Create achievement using the vanilla pattern
        var ach = new Game.Achievement(name, desc, finalIcon);
        
        // Ensure the achievement is properly initialized with vanilla properties
        ach.id = Game.AchievementsN;
        ach.name = name;
        ach.dname = name;
        ach.shortName = name; // Required for Game.Win notification
        ach.desc = desc;
        ach.baseDesc = desc;
        
        // Set basic properties
        ach.ddesc = desc;
        ach.desc = desc; // Ensure desc is set
        
        // Set basic properties
        ach.ddesc = desc;
        ach.desc = desc; // Ensure desc is set
        // Set achievement pool based on shadow mode setting
        if (shadowAchievementMode) {
            ach.pool = 'shadow';
            ach.order = order + 50000; // Add 50,000 to preserve relative ordering
        } else {
            ach.pool = 'normal';
            ach.order = order;
        }
        
        // Always start as not won - let save/load system handle won status
        ach.won = 0;
        ach.hide = 0;
        
        // Ensure achievement has all required properties for Game.Win
        ach.name = name; // Ensure name is set
        ach.icon = finalIcon; // Ensure icon is set
        ach.vanilla = false; // Mark as non-vanilla achievement
        
        // Add source text with mod icon and name
        var sourceText = '<div style="font-size:80%;text-align:center;">From <span style="margin: 0 4px;">' + tinyIcon(modIcon) + '</span> ' + modName + '</div><div class="line"></div>';
        ach.ddesc = sourceText + ach.ddesc;
        
        // Store requirement function for checking
        if (requirement) {
            ach.requirement = requirement;
        }
        
        // Register with game systems
        Game.AchievementsById[Game.AchievementsN] = ach;
        Game.Achievements[name] = ach; // Also register by name for Game.Win to work
        ach.id = Game.AchievementsN; // Ensure achievement has proper ID
        Game.AchievementsN++;
        
        // Add to our mod achievement list for debug reset
        modAchievementNames.push(name);
    
    return ach;
}

    // Helper function to add source text to upgrades and achievements
    function addSourceText(item) {
        var sourceText = '<div style="font-size:80%;text-align:center;">From <span style="margin: 0 4px;">' + tinyIcon(modIcon) + '</span> ' + modName + '</div><div class="line"></div>';
        item.ddesc = sourceText + item.ddesc;
        item.desc = sourceText + item.desc;
    }
    
    // Helper function to mark achievement as won from save data (no notification)
    function markAchievementWonFromSave(achievementName) {
        if (Game.Achievements[achievementName]) {
            // Always set to won when loading from save, regardless of current state
            Game.Achievements[achievementName].won = 1;
            Game.AchievementsOwned++;
            
            // Also update the by-id version if it exists
            if (Game.AchievementsById[achievementName]) {
                Game.AchievementsById[achievementName].won = 1;
            }
            // No notification for achievements loaded from save
        }
    }
    
    // Helper function to mark achievement as won when newly earned (with notification)
    function markAchievementWon(achievementName) {
        if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
            // Only trigger notification if not in debug mode and mod has initialized
            if (!debugMode && modInitialized) {
                try {
                    // Call Game.Win with the achievement name (this should trigger notification)
                    Game.Win(achievementName);
                    
                    // Force UI update to ensure notification appears
                    if (Game.updateAchievementsMenu) {
                        Game.updateAchievementsMenu();
                    }
                } catch (e) {
                    console.error('❌ Error calling Game.Win:', e);
                }
            } else if (!debugMode && !modInitialized) {
                // During initialization, just mark as won without notification
                Game.Achievements[achievementName].won = 1;
                Game.AchievementsOwned++;
            }
        }
    }
    
    // Helper function to check and mark "Beyond the Leaderboard" as won
    function checkAndMarkBeyondTheLeaderboard() {
        // Mark "Beyond the Leaderboard" as won if any upgrade is enabled or shadow mode is disabled
        if (enableCookieUpgrades || enableBuildingUpgrades || enableKittenUpgrades || !shadowAchievementMode) {
            if (Game.Achievements['Beyond the Leaderboard'] && !Game.Achievements['Beyond the Leaderboard'].won) {
                Game.Achievements['Beyond the Leaderboard'].won = 1;
                Game.AchievementsOwned++;
                
                // Mark that the mod has been used outside shadow mode
                modSettings.hasUsedModOutsideShadowMode = true;
                
                // Trigger notification if mod is initialized and not in debug mode
                if (!debugMode && modInitialized) {
                    try {
                        Game.Win('Beyond the Leaderboard');
                        if (Game.updateAchievementsMenu) {
                            Game.updateAchievementsMenu();
                        }
                    } catch (e) {
                        console.error('❌ Error calling Game.Win for Beyond the Leaderboard:', e);
                    }
                }
            }
        }
    }
    
    // Function to dynamically add upgrades to the game
    function addUpgradesToGame() {
        if (!upgradeData || typeof upgradeData !== 'object') {
            console.error('Invalid upgradeData structure:', upgradeData);
            return;
        }
        
        try {
            // Create cookie box upgrade FIRST if cookie upgrades are enabled
            if (enableCookieUpgrades && upgradeData.generic && Array.isArray(upgradeData.generic)) {
                for (var i = 0; i < upgradeData.generic.length; i++) {
                    var upgradeInfo = upgradeData.generic[i];
                    
                    // Check if this is the "Box of improved cookies" upgrade
                    var isCookieBoxUpgrade = upgradeInfo.name === 'Box of improved cookies';
                    
                    if (isCookieBoxUpgrade) {
                        createGenericUpgrade(upgradeInfo);
                    }
                }
            }
            
            // Create cookie upgrades if enabled (AFTER creating the box upgrade)
            if (enableCookieUpgrades && upgradeData.cookie && Array.isArray(upgradeData.cookie)) {
                for (var i = 0; i < upgradeData.cookie.length; i++) {
                    var upgradeInfo = upgradeData.cookie[i];
                    createCookieUpgrade(upgradeInfo);
                }
            }
            
            // Create building upgrades if enabled
            if (enableBuildingUpgrades && upgradeData.building && Array.isArray(upgradeData.building)) {
                for (var i = 0; i < upgradeData.building.length; i++) {
                    var upgradeInfo = upgradeData.building[i];
                    createBuildingUpgrade(upgradeInfo);
                }
            }
            
            // Create discount upgrades if building upgrades are enabled
            if (enableBuildingUpgrades && upgradeData.generic && Array.isArray(upgradeData.generic)) {
                for (var i = 0; i < upgradeData.generic.length; i++) {
                    var upgradeInfo = upgradeData.generic[i];
                    
                    // Check if this is a discount upgrade (has "cost <b>5%</b> less" in description)
                    var isDiscountUpgrade = upgradeInfo.desc && upgradeInfo.desc.includes('cost <b>5%</b> less');
                    
                    if (isDiscountUpgrade) {
                        createGenericUpgrade(upgradeInfo);
                    }
                }
            }
            
            // Create kitten upgrades if enabled
            if (enableKittenUpgrades && upgradeData.kitten && Array.isArray(upgradeData.kitten)) {
                for (var i = 0; i < upgradeData.kitten.length; i++) {
                    var upgradeInfo = upgradeData.kitten[i];
                    createKittenUpgrade(upgradeInfo);
                }
            }
            
            // Force recalculation to apply effects immediately
            setTimeout(() => {
                if (Game.CalculateGains) {
                    Game.CalculateGains();
                }
                if (Game.recalculateGains) {
                    Game.recalculateGains = 1;
                }
                
                // Force store refresh using the game's own mechanisms
                Game.storeToRefresh = 1;
                Game.upgradesToRebuild = 1;
                if (Game.UpdateMenu) {
                    Game.UpdateMenu();
                }
            }, 100);
            
        } catch (e) {
            console.error('Error in addUpgradesToGame:', e);
        }
    }
    
    // Function to dynamically remove upgrades from the game
    function removeUpgradesFromGame() {
        // Only remove our mod's upgrades, never vanilla or other mods
        var modUpgradeNames = getModUpgradeNames();
        for (var i = 0; i < modUpgradeNames.length; i++) {
            var upgradeName = modUpgradeNames[i];
            if (Game.Upgrades[upgradeName]) {
                delete Game.Upgrades[upgradeName];
            }
        }
        
        // Force recalculation to remove effects immediately
        setTimeout(() => {
            if (Game.CalculateGains) {
                Game.CalculateGains();
            }
            if (Game.recalculateGains) {
                Game.recalculateGains = 1;
            }
            // Force store refresh using the game's own mechanisms
            Game.storeToRefresh = 1;
            Game.upgradesToRebuild = 1;
            if (Game.UpdateMenu) {
                Game.UpdateMenu();
            }
        }, 100);
    }
    
    // Function to move achievements between shadow and normal pools
    function updateAchievementPools() {
        // Loop through all our mod achievements
        for (var i = 0; i < modAchievementNames.length; i++) {
            var achievementName = modAchievementNames[i];
            var achievement = Game.Achievements[achievementName];
            
            if (achievement) {
                // Special case: "Beyond the Leaderboard" is always a shadow achievement
                if (achievementName === 'Beyond the Leaderboard') {
                    achievement.pool = 'shadow';
                    // Never modify its order - it should keep its original custom order
                    continue; // Skip the normal pool switching logic for this achievement
                }
                
                if (shadowAchievementMode) {
                    // Move to shadow pool
                    if (achievement.pool !== 'shadow') {
                        achievement.pool = 'shadow';
                        achievement.order = achievement.order + 50000;
                    }
                } else {
                    // Move to normal pool
                    if (achievement.pool === 'shadow') {
                        achievement.pool = 'normal';
                        achievement.order = achievement.order - 50000;
                    }
                }
            }
        }
        
        // Force UI update
        if (Game.updateAchievementsMenu) {
            Game.updateAchievementsMenu();
        }
    }
    
    // Function to show confirmation prompt for major changes
    function showSettingsChangePrompt(message, callback) {
        Game.Prompt('<id SettingsChange><h3>Mod Settings Change</h3><div class="block">' + 
                   tinyIcon(modIcon) + '<div class="line"></div>' + 
                   message + '</div>', 
                   [['Yes', 'Game.ClosePrompt();' + callback, 'float:left'], 
                    ['No', 'Game.ClosePrompt();', 'float:right']]);
    }
    
    // Helper: Create multiple achievements with same pattern
    function createAchievementSeries(names, descs, baseOrder, baseIcon, requirement, customIcons) {
        var results = [];
        for (var i = 0; i < names.length; i++) {
            var customIcon = customIcons && customIcons[i] ? customIcons[i] : null;
            var ach = createAchievement(names[i], descs[i], baseIcon, baseOrder + (i + 1) * 0.01, requirement, customIcon);
            if (ach) {
                results.push(ach);
            } else {
                console.warn('Failed to create achievement:', names[i]);
            }
        }
        return results;
    }
    
    // Helper: Create building achievements
    function createBuildingAchievements(buildingType, names, thresholds, baseOrder, baseIcon, customIcons) {
        var achievements = [];
        var building = Game.ObjectsById[buildingType];
        if (!building) return achievements;
        
        for (var i = 0; i < names.length && i < thresholds.length; i++) {
            var amount = thresholds[i];
            var name = names[i];
            var buildingLabel = building.plural || (building.single + 's');
            var desc = "Own <b>" + amount + " "+ buildingLabel + "</b>.";
            var requirement = (function(buildingType, amount) {
                return function() { 
                    var buildingObj = Game.ObjectsById[buildingType];
                    var currentAmount = buildingObj ? buildingObj.amount : 0;
                    var shouldUnlock = buildingObj && currentAmount >= amount;
                    

                    
                    return shouldUnlock;
                };
            })(buildingType, amount);
            
            var customIcon = customIcons && customIcons[i] ? customIcons[i] : null;
            var ach = createAchievement(name, desc, baseIcon, baseOrder + (i + 1) * 0.01, requirement, customIcon);
            if (ach) {
                achievements.push(ach);
            }
        }
        
        return achievements;
    }
    
    // Helper function to check if garden was completed after sacrifice time
    function checkGardenCompletionAfterSacrifice() {
        if (!lifetimeData.lastGardenSacrificeTime) return false;
        
        var M = Game.Objects['Farm'].minigame;
        if (!M) return false;
        
        // Check if all plants are unlocked
        if (M.plantsUnlockedN < M.plantsN) return false;
        
        // For now, we'll assume if the garden is complete and we have a sacrifice time,
        // the achievement should be available. In a more robust system, we'd track
        // when each plant was unlocked vs when the sacrifice happened.
        return true;
    }
    
    // Helper: Create requirement function based on type
    // Shared function to count garden plants
    function countGardenPlants() {
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) return { unlocked: 0, total: 0 };
        
        var M = Game.Objects['Farm'].minigame;
        
        // Use vanilla game's built-in counters
        return { unlocked: M.plantsUnlockedN || 0, total: M.plantsN || 0 };
    }
    
    function createRequirementFunction(type, threshold) {
        return function() {
            try {
                switch(type) {
                    case 'cps':
                        return Game.cookiesPsRaw >= threshold;
                    case 'click':
                        // Special case for Click of the Titans achievement
                        if (threshold === "clickOfTitans") {
                            // This achievement is checked in real-time when cookies are clicked
                            return false; // Always false, achievement is awarded directly
                        }
                        return Game.handmadeCookies >= threshold;
                    case 'wrinkler':
                        return getLifetimeWrinklers() >= threshold;
                    case 'shinyWrinkler':
                        // Track shiny wrinklers popped (me.type==1)
                        return getLifetimeShinyWrinklers() >= threshold;
                    case 'goldenWrinkler':
                        // This achievement is awarded when a wrinkler worth 1 year of CPS is popped
                        // The achievement is checked in real-time when wrinklers are popped
                        return false; // Always false, achievement is awarded directly
                    case 'reindeer':
                        return getLifetimeReindeer() >= threshold;
                    case 'goldenCookies':
                        return Game.goldenClicks >= threshold;
                    case 'wrathCookies':
                        return getLifetimeWrathCookies() >= threshold;
                    case 'gardenSacrifices':
                        return getLifetimeGardenSacrifices() >= threshold;
                    case 'cookieClicks':
                        return getLifetimeCookieClicks() >= threshold;
                    case 'stockMarketAssets':
                        return getLifetimeStockMarketAssets() >= threshold;
                    case 'spell':
                        // Check if the wizard tower minigame exists and has spells cast
                        return Game.Objects['Wizard tower'].minigame && 
                               Game.Objects['Wizard tower'].minigame.spellsCastTotal >= threshold;

                    case 'freeSugarLump':
                        // Check if we have the "free sugar lump" outcome from FtHoF
                        if (!modTracking.fthofCookieOutcomes || modTracking.fthofCookieOutcomes.length === 0) {
                            return false;
                        }
                        return modTracking.fthofCookieOutcomes.some(o => o.outcome === 'free sugar lump');
                    case 'gardenHarvest':
                        // Check if the garden minigame exists and has plants harvested
                        return Game.Objects['Farm'].minigame && 
                               Game.Objects['Farm'].minigame.harvestsTotal >= threshold;
                    case 'cookiesAscension':
                        return (Game.cookiesEarned || 0) >= threshold;
                    case 'forfeited':
                        // Check total cookies forfeited across all ascensions
                        return (Game.cookiesReset || 0) >= threshold;
                    case 'totalBuildings':
                        // Calculate total buildings owned like vanilla does
                        var buildingsOwned = 0;
                        for (var i in Game.Objects) {
                            buildingsOwned += Game.Objects[i].amount;
                        }
                        return buildingsOwned >= threshold;
                    case 'everything':
                        // Check if every building type has at least the threshold amount
                        // Use the same approach as vanilla game
                        var minAmount = 100000;
                        for (var i in Game.Objects) {
                            minAmount = Math.min(Game.Objects[i].amount, minAmount);
                        }
                        return minAmount >= threshold;
                  case 'seedlog':
                        var lifetimeGardenSacrifices = getLifetimeGardenSacrifices();
                        return lifetimeGardenSacrifices >= threshold;
                    case 'kittensOwned':
                        // Count kittens like vanilla does - check kitten upgrades owned
                        var kittens = 0;
                        for (var i = 0; i < Game.UpgradesByPool['kitten'].length; i++) {
                            if (Game.Has(Game.UpgradesByPool['kitten'][i].name)) kittens++;
                        }
                        return kittens >= threshold;
                    case 'allKittensOwned':
                        // Count all kittens (original + expansion) - check both vanilla kitten upgrades and mod kitten upgrades
                        var totalKittens = 0;
                        
                        // Count original kittens (vanilla kitten upgrades)
                        for (var i = 0; i < Game.UpgradesByPool['kitten'].length; i++) {
                            if (Game.Has(Game.UpgradesByPool['kitten'][i].name)) totalKittens++;
                        }
                        
                        // Count expansion kittens (mod kitten upgrades)
                        for (var i = 0; i < upgradeData.kitten.length; i++) {
                            var upgradeInfo = upgradeData.kitten[i];
                            if (Game.Has(upgradeInfo.name)) totalKittens++;
                        }
                        
                        return totalKittens >= threshold;
                    case 'reincarnate':
                        return Game.resets >= threshold;
                    case 'stockmarket':
                        // For negative thresholds (losses), check current run profit only
                        // For positive thresholds (gains), check lifetime total
                        if (threshold < 0) {
                            // Loss achievement - only check current run
                            if (!Game.Objects['Bank'].minigame) return false;
                            return Game.Objects['Bank'].minigame.profit <= threshold;
                        } else {
                            // Gain achievement - check lifetime total
                            var lifetimeStockMarket = getLifetimeStockMarketAssets();
                            return lifetimeStockMarket >= threshold;
                        }
                    case 'gardenSeedsTime':
                        // Check if all garden seeds are unlocked within the time limit
                        var plantCount = countGardenPlants();
                        
                        // Check if we have a sacrifice time
                        if (!lifetimeData.lastGardenSacrificeTime) {
                            return false;
                        }
                        
                        var currentTime = Date.now();
                        var timeElapsed = currentTime - lifetimeData.lastGardenSacrificeTime;
                        
                        // Check if all plants are unlocked
                        if (plantCount.unlocked < plantCount.total) {
                            return false;
                        }
                        
                        return timeElapsed <= threshold;
                    case 'seasonalDropsTime':
                        // Check if all seasonal drops are collected within the time limit
                        if (!Game.startDate) return false; // No start date means achievement not unlocked
                        
                        var currentTime = Date.now();
                        var timeElapsed = currentTime - Game.startDate;
                        
                        // Check if within time limit first
                        if (timeElapsed > threshold) return false;
                        
                        // Check Easter condition
                        var easterComplete = Game.GetHowManyEggs && Game.GetHowManyEggs() >= 20;
                        
                        // Check Halloween condition
                        var halloweenComplete = Game.Has('Skull cookies') && Game.Has('Ghost cookies') && 
                                              Game.Has('Bat cookies') && Game.Has('Slime cookies') && 
                                              Game.Has('Pumpkin cookies') && Game.Has('Eyeball cookies') && 
                                              Game.Has('Spider cookies');
                        
                        // Check Christmas condition
                        var christmasComplete = Game.Has('Christmas tree biscuits') && Game.Has('Snowflake biscuits') && 
                                               Game.Has('Snowman biscuits') && Game.Has('Holly biscuits') && 
                                               Game.Has('Candy cane biscuits') && Game.Has('Bell biscuits') && 
                                               Game.Has('Present biscuits');
                        
                        // Check Valentine's condition
                        var valentinesComplete = Game.Has('Prism heart biscuits');
                        
                        return easterComplete && halloweenComplete && christmasComplete && valentinesComplete;
                    case 'hardercorest':
                        // Check basic eligibility first (challenge run or hasn't ascended yet)
                        if (!(Game.ascensionMode == 1 || Game.resets == 0)) return false;
                        
                        // Check if 10 billion cookies baked with no clicks and no upgrades
                        if (Game.cookiesEarned < threshold) return false;
                        
                        // Check if no cookie clicks (or very minimal clicks)
                        if (Game.cookieClicks > 0) return false;
                        
                        // Check if no upgrades bought
                        if (Game.UpgradesOwned > 0) return false;
                        
                        return true;
                    case 'hardercorester':
                        // Check basic eligibility first (challenge run or hasn't ascended yet)
                        if (!(Game.ascensionMode == 1 || Game.resets == 0)) return false;
                        
                        // Check if 1 billion cookies earned
                        if (Game.cookiesEarned < threshold) return false;
                        
                        // Check if no more than 15 cookie clicks
                        if (Game.cookieClicks > 15) return false;
                        
                        // Check if no more than 15 buildings owned
                        let totalBuildingsOwned = 0;
                        for (let buildingName in Game.Objects) {
                            totalBuildingsOwned += Game.Objects[buildingName].amount || 0;
                        }
                        if (totalBuildingsOwned > 15) return false;
                        
                        // Check if no more than 15 upgrades owned
                        if (Game.UpgradesOwned > 15) return false;
                        
                        // Check if no buildings have been sold
                        let totalBuildingsSold = 0;
                        for (let buildingName in Game.Objects) {
                            const building = Game.Objects[buildingName];
                            const bought = building.bought || 0;
                            const amount = building.amount || 0;
                            const sold = bought - amount;
                            totalBuildingsSold += Math.max(0, sold);
                        }
                        if (totalBuildingsSold > 0) return false;
                        
                        return true;
                    case 'cookieClicks':
                        return Game.cookieClicks >= threshold;
                    case 'pledges':
                        var lifetimePledges = getLifetimePledges();
                        return lifetimePledges >= threshold;
                    case 'buffs':
                        // Buff achievements are now checked in real-time via logic hook
                        // This is just a fallback for the general achievement system
                        if (threshold === 0) return false; // Frenzy frenzy is handled separately
                        return Object.keys(Game.buffs).length >= threshold;
                    case 'prestigeUpgrades':
                        var prestigeUpgradesOwned = 0;
                        for (var i in Game.Upgrades) {
                            if (Game.Upgrades[i].bought && Game.Upgrades[i].pool == 'prestige') prestigeUpgradesOwned++;
                        }
                        return prestigeUpgradesOwned >= threshold;
                    case 'allBuildingsLevel10':
                        // Check if all buildings are at level 10 or higher
                        for (var buildingName in Game.Objects) {
                            var building = Game.Objects[buildingName];
                            if (!building || building.level < threshold) {
                                return false;
                            }
                        }
                        return true;
                    case 'seasonSwitches':
                        // Check if season switches count meets threshold
                        return (Game.seasonUses || 0) >= threshold;
                    case 'sugarLumps':
                        // Check if sugar lumps count meets threshold
                        return (Game.lumps || 0) >= threshold;
                    case 'vanillaAchievements':
                        // Count vanilla achievements (only those with vanilla property set to 1, excluding shadow achievements)
                        var vanillaAchievementsOwned = 0;
                        for (var i in Game.AchievementsById) {
                            var me = Game.AchievementsById[i];
                            if (me.won && me.vanilla == 1 && me.pool != 'shadow') {
                                vanillaAchievementsOwned++;
                            }
                        }
                        return vanillaAchievementsOwned >= threshold;
                    case 'botanicalPerfection':
                        // Check if all 34 plant types are in mature stage simultaneously
                        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) return false;
                        
                        var M = Game.Objects['Farm'].minigame;
                        var maturePlantTypes = {};
                        
                        // Check each plot for mature plants using M.plot (2D array)
                        if (M.plot) {
                            for (var y = 0; y < M.plot.length; y++) {
                                for (var x = 0; x < M.plot[y].length; x++) {
                                    var plotData = M.plot[y][x];
                                    if (plotData && plotData[0] > 0) {
                                        var plantId = plotData[0] - 1; // Plant IDs are 1-indexed
                                        var plantAge = plotData[1];
                                        var plant = M.plantsById[plantId];
                                        
                                        if (plant && plantAge >= plant.mature) {
                                            var plantName = plant.name;
                                            if (plantName && !maturePlantTypes[plantName]) {
                                                maturePlantTypes[plantName] = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Count unique mature plant types
                        var uniqueMatureTypes = 0;
                        for (var plantType in maturePlantTypes) {
                            uniqueMatureTypes++;
                        }
                        
                        return uniqueMatureTypes >= threshold;
                    case 'templeSwaps':
                        // Check if temple swaps count meets threshold
                        if (threshold === 100) {
                            return (Game.templeSwapsTotal || 0) >= threshold;
                        } else if (threshold === 86400) {
                            // Check if all gods have been used for at least 24 hours
                            var allGodsUsed = true;
                            var requiredTime = 86400; // 24 hours in seconds
                            
                            // Get the complete list of all available gods from the pantheon
                            var allAvailableGods = [];
                            if (Game.Objects['Temple'] && Game.Objects['Temple'].minigame && Game.Objects['Temple'].minigame.godsById) {
                                var pantheon = Game.Objects['Temple'].minigame;
                                for (var i = 0; i < pantheon.godsById.length; i++) {
                                    if (pantheon.godsById[i] && pantheon.godsById[i].name) {
                                        allAvailableGods.push(pantheon.godsById[i].name);
                                    }
                                }
                            }
                            
                            // Check each available god's total time
                            for (var i = 0; i < allAvailableGods.length; i++) {
                                var godName = allAvailableGods[i];
                                
                                // Get the tracked time for this god (default to 0 if never used)
                                var godTime = modTracking.godUsageTime[godName] || 0;
                                
                                if (godTime < requiredTime) {
                                    allGodsUsed = false;
                                    break;
                                }
                            }
                            
                            return allGodsUsed;
                        }
                        return false;
                    case 'soilChanges':
                        // Check if soil changes count meets threshold
                        return (Game.soilChangesTotal || 0) >= threshold;
                    case 'buildingsSold':
                        // Calculate total buildings sold using the same logic as hardercorester
                        var buildingsSoldCount = 0;
                        for (var buildingName in Game.Objects) {
                            var building = Game.Objects[buildingName];
                            var bought = building.bought || 0;
                            var amount = building.amount || 0;
                            var sold = bought - amount;
                            buildingsSoldCount += Math.max(0, sold);
                        }
                        return buildingsSoldCount >= threshold;
                    case 'tickerClicks':
                        // Check if ticker clicks count meets threshold
                        return (Game.TickerClicks || 0) >= threshold;
                    case 'wrathCookies':
                        // Check if wrath cookie clicks count meets threshold
                        return (Game.wrathCookiesClicked || 0) >= threshold;
                    case 'goldenCookieTime':
                        // Check if a golden cookie was clicked within the time limit
                        if (!Game.startDate) return false; // No start date means achievement not unlocked
                        
                        var currentTime = Date.now();
                        var timeElapsed = currentTime - Game.startDate;
                        
                        // Check if within time limit and golden cookie was clicked (this run only)
                        return timeElapsed <= threshold && (Game.goldenClicksLocal || 0) > 0;
                    case 'wrinklerTime':
                        // Check if a wrinkler was popped within the time limit
                        if (!Game.startDate) return false; // No start date means achievement not unlocked
                        
                        var currentTime = Date.now();
                        var timeElapsed = currentTime - Game.startDate;
                        
                        // Check if within time limit and wrinkler was popped (this run only)
                        return timeElapsed <= threshold && (Game.wrinklersPoppedLocal || 0) > 0;
                    case 'wrinklerBankDouble':
                        // Check if bank was doubled by a wrinkler pop
                        return modTracking.bankDoubledByWrinkler || false;
                    case 'hardcoreNoHeavenly':
                        // Check if player owns Heavenly chip secret upgrade
                        if (Game.Has('Heavenly chip secret')) return false;
                        
                        // Check if any buildings have been sold
                        var heavenlyBuildingsSold = 0;
                        for (var buildingName in Game.Objects) {
                            var building = Game.Objects[buildingName];
                            var bought = building.bought || 0;
                            var amount = building.amount || 0;
                            var sold = bought - amount;
                            heavenlyBuildingsSold += Math.max(0, sold);
                        }
                        if (heavenlyBuildingsSold > 0) return false;
                        
                        // Check if player has at least threshold amount of every building type
                        for (var buildingName in Game.Objects) {
                            var building = Game.Objects[buildingName];
                            if (!building || building.amount < threshold) {
                                return false;
                            }
                        }
                        
                        return true;
                    case 'hardcoreFinalCountdown':
                        // Check if in Born Again mode (challenge run or hasn't ascended yet)
                        if (!(Game.ascensionMode == 1 || Game.resets == 0)) return false;
                        
                        // Check if any buildings have been sold
                        var countdownBuildingsSold = 0;
                        for (var buildingName in Game.Objects) {
                            var building = Game.Objects[buildingName];
                            var bought = building.bought || 0;
                            var amount = building.amount || 0;
                            var sold = bought - amount;
                            countdownBuildingsSold += Math.max(0, sold);
                        }
                        if (countdownBuildingsSold > 0) return false;
                        
                        // Define the exact building counts required (20 down to 1)
                        var requiredCounts = {
                            'Cursor': 20,
                            'Grandma': 19,
                            'Farm': 18,
                            'Mine': 17,
                            'Factory': 16,
                            'Bank': 15,
                            'Temple': 14,
                            'Wizard tower': 13,
                            'Shipment': 12,
                            'Alchemy lab': 11,
                            'Portal': 10,
                            'Time machine': 9,
                            'Antimatter condenser': 8,
                            'Prism': 7,
                            'Chancemaker': 6,
                            'Fractal engine': 5,
                            'Javascript console': 4,
                            'Idleverse': 3,
                            'Cortex baker': 2,
                            'You': 1
                        };
                        
                        // Check if each building has exactly the required amount
                        for (var buildingName in requiredCounts) {
                            var building = Game.Objects[buildingName];
                            if (!building || building.amount !== requiredCounts[buildingName]) {
                                return false;
                            }
                        }
                        
                        return true;
                    case 'hardcoreNoKittens':
                        // Check if in Born Again mode (challenge run or hasn't ascended yet)
                        if (!(Game.ascensionMode == 1 || Game.resets == 0)) return false;
                        
                        // Check if player has enough cookies per second
                        if ((Game.cookiesPsRaw || 0) < threshold) return false;
                        
                        // Check if any vanilla kitten upgrades have been bought
                        for (var i = 0; i < Game.UpgradesByPool['kitten'].length; i++) {
                            if (Game.Has(Game.UpgradesByPool['kitten'][i].name)) {
                                return false;
                            }
                        }
                        
                        // Check if any mod kitten upgrades have been bought
                        for (var i = 0; i < upgradeData.kitten.length; i++) {
                            var upgradeInfo = upgradeData.kitten[i];
                            if (Game.Has(upgradeInfo.name)) {
                                return false;
                            }
                        }
                        
                        return true;
                    case 'hardcoreNoGoldenCookies':
                        // Check if in Born Again mode (challenge run or hasn't ascended yet)
                        if (!(Game.ascensionMode == 1 || Game.resets == 0)) return false;
                        
                        // Check if player has baked enough cookies
                        if ((Game.cookiesEarned || 0) < threshold) return false;
                        
                        // Check if any golden cookies have been clicked (this run only)
                        if ((Game.goldenClicksLocal || 0) > 0) return false;
                        
                        return true;
                    case 'hardcoreCursorsAndGrandmas':
                        // Check if in Born Again mode (challenge run or hasn't ascended yet)
                        if (!(Game.ascensionMode == 1 || Game.resets == 0)) return false;
                        
                        // Check if player has enough cookies per second
                        if ((Game.cookiesPsRaw || 0) < threshold) return false;
                        
                        // Check if any buildings other than Cursors and Grandmas have been bought
                        for (var buildingName in Game.Objects) {
                            if (buildingName !== 'Cursor' && buildingName !== 'Grandma') {
                                if ((Game.Objects[buildingName].amount || 0) > 0) {
                                    return false;
                                }
                            }
                        }
                        
                        // Check if any buildings have been sold
                        var cursorGrandmaBuildingsSold = 0;
                        for (var buildingName in Game.Objects) {
                            var building = Game.Objects[buildingName];
                            var bought = building.bought || 0;
                            var amount = building.amount || 0;
                            var sold = bought - amount;
                            cursorGrandmaBuildingsSold += Math.max(0, sold);
                        }
                        if (cursorGrandmaBuildingsSold > 0) return false;
                        
                        return true;
                    case 'hardcoreModestPortfolio':
                        // Check if in Born Again mode (challenge run or hasn't ascended yet)
                        if (!(Game.ascensionMode == 1 || Game.resets == 0)) return false;
                        
                        // Check if player has baked enough cookies
                        if ((Game.cookiesEarned || 0) < threshold) return false;
                        
                        // Check if any building has more than 5 of that type
                        for (var buildingName in Game.Objects) {
                            if ((Game.Objects[buildingName].amount || 0) > 5) {
                                return false;
                            }
                        }
                        
                        // Check if any buildings have been sold
                        var modestBuildingsSold = 0;
                        for (var buildingName in Game.Objects) {
                            var building = Game.Objects[buildingName];
                            var bought = building.bought || 0;
                            var amount = building.amount || 0;
                            var sold = bought - amount;
                            modestBuildingsSold += Math.max(0, sold);
                        }
                        if (modestBuildingsSold > 0) return false;
                        
                        return true;
                    case 'hardcoreDifficultDecisions':
                        // Check if in Born Again mode (challenge run or hasn't ascended yet)
                        if (!(Game.ascensionMode == 1 || Game.resets == 0)) return false;
                        
                        // Count total buildings owned
                        var difficultDecisionsBuildingsOwned = 0;
                        for (var buildingName in Game.Objects) {
                            difficultDecisionsBuildingsOwned += (Game.Objects[buildingName].amount || 0);
                        }
                        
                        // Count total upgrades owned
                        var totalUpgradesOwned = Game.UpgradesOwned || 0;
                        
                        // Calculate current combined total
                        var currentCombinedTotal = difficultDecisionsBuildingsOwned + totalUpgradesOwned;
                        
                        // Update the maximum combined total for this run
                        if (!currentRunData.maxCombinedTotal) currentRunData.maxCombinedTotal = 0;
                        if (currentCombinedTotal > currentRunData.maxCombinedTotal) {
                            currentRunData.maxCombinedTotal = currentCombinedTotal;
                        }
                        
                        // Check if the maximum combined total for this run ever exceeded 25
                        if (currentRunData.maxCombinedTotal > 25) {
                            return false;
                        }
                        
                        // Check if player has baked enough cookies
                        if ((Game.cookiesEarned || 0) < threshold) return false;
                        
                        return true;
                    case 'hardcoreLaidInPlainSight':
                        // Check if in Born Again mode (challenge run or hasn't ascended yet)
                        if (!(Game.ascensionMode == 1 || Game.resets == 0)) return false;
                        
                        // Check if player has enough cookies per second
                        if ((Game.cookiesPsRaw || 0) < threshold) return false;
                        
                        // Check if any buildings have been purchased
                        for (var buildingName in Game.Objects) {
                            if ((Game.Objects[buildingName].bought || 0) > 0) {
                                return false;
                            }
                        }
                        
                        return true;
                    case 'hardcorePrecisionNerd':
                        // Check if player has the required amount of cookies (accounting for decimal precision)
                        // Accept values within ±1 of the threshold
                        if (Game.cookies < (threshold - 1) || Game.cookies > (threshold + 1)) {
                            // Reset timer if amount is wrong
                            if (currentRunData.precisionNerdTimer) {
                                currentRunData.precisionNerdTimer = null;
                            }
                            return false;
                        }
                        
                        // Initialize timer if not already started
                        if (!currentRunData.precisionNerdTimer) {
                            currentRunData.precisionNerdTimer = Date.now();
                        }
                        
                        // Check if 60 seconds have passed
                        var elapsedTime = (Date.now() - currentRunData.precisionNerdTimer) / 1000;
                        if (elapsedTime >= 60) {
                            // Achievement completed, reset timer
                            currentRunData.precisionNerdTimer = null;
                            return true;
                        }
                        
                        return false;
                    default:
                        console.warn('Unknown achievement type:', type);
                        return false;
                }
            } catch (e) {
                console.warn('Error in requirement function for type:', type, e);
                return false;
            }
        };
    }
    
    // Achievement data structure
    var achievementData = {
        buildings: {
            cursor: {
                names: ["Digital digit", "Manual maestro", "Phalange pharaoh", "Metacarpal monarch", "Carpal czar", "Phalange prince", "Digital deity", "Manual master", "Phalange paradise", "Metacarpal mogul", "Carpal conqueror"],
                thresholds: [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100],
                vanillaTarget: "A round of applause",
                customIcons: [[0, 20], [0, 21], [0, 25], [0, 26], [0, 27], [0, 29], [0, 35], [1, 71, getSpriteSheet('custom')], [1, 72, getSpriteSheet('custom')], [1, 56, getSpriteSheet('custom')], [1, 54, getSpriteSheet('custom')]]
            },
            'grandma': {
                names: ["Matriarch's wisdom", "Elder's empire", "Sage's sovereignty", "Crone's crown", "Matriarch's might", "Elder's eternity", "Sage's supremacy", "Crone's conquest", "Matriarch's majesty", "Elder's excellence", "Sage's splendor"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "And now you're even older",
                customIcons: [[1, 20], [1, 21], [1, 25], [1, 26], [1, 27], [1, 29], [1, 35], [4, 71, getSpriteSheet('custom')], [4, 72, getSpriteSheet('custom')], [4, 56, getSpriteSheet('custom')], [4, 54, getSpriteSheet('custom')]]
            },
            'farm': {
                names: ["Agrarian architect", "Cultivation czar", "Harvest hero", "Soil sovereign", "Seed sultan", "Plant patriarch", "Garden guardian", "Crop conqueror", "Field founder", "Harvest deity", "Crop deity"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Au naturel",
                customIcons: [[2, 20], [2, 21], [2, 25], [2, 26], [2, 27], [2, 29], [2, 35], [5, 71, getSpriteSheet('custom')], [5, 72, getSpriteSheet('custom')], [5, 56, getSpriteSheet('custom')], [5, 54, getSpriteSheet('custom')]]
            },
            'mine': {
                names: ["Excavation expert", "Mineral monarch", "Gem governor", "Crystal king", "Stone sovereign", "Rock ruler", "Mineral master", "Ore emperor", "Gem god", "Crystal czar", "Stone sultan"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Dirt-rich",
                customIcons: [[3, 20], [3, 21], [3, 25], [3, 26], [3, 27], [3, 29], [3, 35], [6, 71, getSpriteSheet('custom')], [6, 72, getSpriteSheet('custom')], [6, 56, getSpriteSheet('custom')], [6, 54, getSpriteSheet('custom')]]
            },
            'factory': {
                names: ["Factory foreman", "Industrial emperor", "Manufacturing monarch", "Production pharaoh", "Assembly architect", "Industry icon", "Factory founder", "Manufacturing master", "Production patriarch", "Assembly authority", "Industry innovator"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Bots build bots",
                customIcons: [[4, 20], [4, 21], [4, 25], [4, 26], [4, 27], [4, 29], [4, 35], [7, 71, getSpriteSheet('custom')], [7, 72, getSpriteSheet('custom')], [7, 56, getSpriteSheet('custom')], [7, 54, getSpriteSheet('custom')]]
            },
            'bank': {
                names: ["Bank president", "Financial emperor", "Money monarch", "Cash czar", "Wealth wizard", "Finance pharaoh", "Banking baron", "Money master", "Cash king", "Wealth warlord", "Finance founder"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Getting that bag",
                customIcons: [[15, 20], [15, 21], [15, 25], [15, 26], [15, 27], [15, 29], [15, 35], [8, 71, getSpriteSheet('custom')], [8, 72, getSpriteSheet('custom')], [8, 56, getSpriteSheet('custom')], [8, 54, getSpriteSheet('custom')]]
            },
            'temple': {
                names: ["Temple high priest", "Divine emperor", "Sacred sovereign", "Holy monarch", "Religious ruler", "Spiritual sultan", "Temple tycoon", "Divine dictator", "Sacred sage", "Holy hero", "Religious royal"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "The leader is good, the leader is great",
                customIcons: [[16, 20], [16, 21], [16, 25], [16, 26], [16, 27], [16, 29], [16, 35], [9, 71, getSpriteSheet('custom')], [9, 72, getSpriteSheet('custom')], [9, 56, getSpriteSheet('custom')], [9, 54, getSpriteSheet('custom')]]
            },
            'wizard tower': {
                names: ["Wizard master", "Spell caster", "Magic maker", "Arcane architect", "Mystic master", "Sorcerer supreme", "Wizard warlock", "Spell sovereign", "Magic monarch", "Arcane authority", "Mystic mogul"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "You don't think they could've used... it couldn't have been ma-",
                customIcons: [[17, 20], [17, 21], [17, 25], [17, 26], [17, 27], [17, 29], [17, 35], [10, 71, getSpriteSheet('custom')], [10, 72, getSpriteSheet('custom')], [10, 56, getSpriteSheet('custom')], [10, 54, getSpriteSheet('custom')]]
            },
            'shipment': {
                names: ["Shipping magnate", "Freight emperor", "Cargo czar", "Logistics lord", "Transport tycoon", "Delivery dictator", "Shipping sultan", "Freight founder", "Cargo king", "Logistics legend", "Transport titan"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Signed, sealed, delivered",
                customIcons: [[5, 20], [5, 21], [5, 25], [5, 26], [5, 27], [5, 29], [5, 35], [11, 71, getSpriteSheet('custom')], [11, 72, getSpriteSheet('custom')], [11, 56, getSpriteSheet('custom')], [11, 54, getSpriteSheet('custom')]]
            },
            'alchemy lab': {
                names: ["Alchemy master", "Transmutation tycoon", "Elixir emperor", "Potion pharaoh", "Alchemy architect", "Transmutation titan", "Elixir expert", "Potion patriarch", "Alchemy authority", "Transmutation tyrant", "Elixir deity"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Sugar, spice, and everything nice",
                customIcons: [[6, 20], [6, 21], [6, 25], [6, 26], [6, 27], [6, 29], [6, 35], [12, 71, getSpriteSheet('custom')], [12, 72, getSpriteSheet('custom')], [12, 56, getSpriteSheet('custom')], [12, 54, getSpriteSheet('custom')]]
            },
            'portal': {
                names: ["Portal master", "Dimensional dictator", "Rift ruler", "Void viceroy", "Portal pharaoh", "Dimensional deity", "Rift royalty", "Void victor", "Portal patriarch", "Dimensional despot", "Rift deity"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Not even remotely close to Kansas anymore",
                customIcons: [[7, 20], [7, 21], [7, 25], [7, 26], [7, 27], [7, 29], [7, 35], [13, 71, getSpriteSheet('custom')], [13, 72, getSpriteSheet('custom')], [13, 56, getSpriteSheet('custom')], [13, 54, getSpriteSheet('custom')]]
            },
            'time machine': {
                names: ["Time lord", "Chronological czar", "Temporal tycoon", "Time traveler", "Chronological king", "Temporal titan", "Time tyrant", "Chronological emperor", "Temporal sovereign", "Time patriarch", "Chronological deity"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "I only meant to stay a while",
                customIcons: [[8, 20], [8, 21], [8, 25], [8, 26], [8, 27], [8, 29], [8, 35], [14, 71, getSpriteSheet('custom')], [14, 72, getSpriteSheet('custom')], [14, 56, getSpriteSheet('custom')], [14, 54, getSpriteSheet('custom')]]
            },
            'antimatter condenser': {
                names: ["Antimatter master", "Matter monarch", "Particle pharaoh", "Antimatter architect", "Matter mogul", "Particle patriarch", "Antimatter authority", "Matter master", "Particle prince", "Antimatter emperor", "Matter deity"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Not 20 years away forever",
                customIcons: [[13, 20], [13, 21], [13, 25], [13, 26], [13, 27], [13, 29], [13, 35], [15, 71, getSpriteSheet('custom')], [15, 72, getSpriteSheet('custom')], [15, 56, getSpriteSheet('custom')], [15, 54, getSpriteSheet('custom')]]
            },
            'prism': {
                names: ["Prism master", "Light lord", "Spectrum sovereign", "Prism pharaoh", "Light legend", "Spectrum sage", "Prism patriarch", "Light emperor", "Spectrum deity", "Prism prince", "Light deity"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Bright side of the Moon",
                customIcons: [[14, 20], [14, 21], [14, 25], [14, 26], [14, 27], [14, 29], [14, 35], [16, 71, getSpriteSheet('custom')], [16, 72, getSpriteSheet('custom')], [16, 56, getSpriteSheet('custom')], [16, 54, getSpriteSheet('custom')]]
            },
            'chancemaker': {
                names: ["Chance master", "Luck lord", "Fortune founder", "Chance czar", "Luck legend", "Fortune pharaoh", "Chance conqueror", "Luck sovereign", "Fortune emperor", "Chance deity", "Luck deity"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Riding the Mersenne twister",
                customIcons: [[19, 20], [19, 21], [19, 25], [19, 26], [19, 27], [19, 29], [19, 35], [19, 35], [19, 35], [19, 35], [19, 35]]
            },
            'fractal engine': {
                names: ["Fractal master", "Pattern pharaoh", "Fractal founder", "Pattern prince", "Fractal sovereign", "Pattern patriarch", "Fractal tycoon", "Pattern emperor", "Fractal deity", "Pattern deity", "Fractal god"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Divide and conquer",
                customIcons: [[20, 20], [20, 21], [20, 25], [20, 26], [20, 27], [20, 29], [20, 35], [20, 35], [20, 35], [20, 35], [20, 35]]
            },
            'javascript console': {
                names: ["Console master", "Code czar", "Script sovereign", "Console conqueror", "Code king", "Script sage", "Console emperor", "Code deity", "Script deity", "Console god", "Code god"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Pebcakes",
                customIcons: [[32, 20], [32, 21], [32, 25], [32, 26], [32, 27], [32, 29], [32, 35], [32, 35], [32, 35], [32, 35], [32, 35]]
            },
            'idleverse': {
                names: ["Idleverse master", "Universe maker", "Reality ruler", "Dimension dictator", "Cosmos creator", "Space sovereign", "Idleverse idol", "Universe usurper", "Reality regent", "Dimension duke", "Cosmos czar"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Greener on the other sides",
                customIcons: [[33, 20], [33, 21], [33, 25], [33, 26], [33, 27], [33, 29], [33, 35], [33, 35], [33, 35], [33, 35], [33, 35]]
            },
            'cortex baker': {
                names: ["Cortex master", "Brain baker", "Neural network", "Synaptic sovereign", "Cerebral czar", "Mind monarch", "Cortex conqueror", "Brain boss", "Neural lord", "Synaptic sage", "Cerebral master"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Where is my mind",
                customIcons: [[34, 20], [34, 21], [34, 25], [34, 26], [34, 27], [34, 29], [34, 35], [34, 35], [34, 35], [34, 35], [34, 35]]
            },
            'You': {
                names: ["Clone master", "Duplicate dynasty", "Copy empire", "Replica realm", "Mirror monarch", "Twin tycoon", "Doppelganger deity", "Clone conqueror", "Duplicate deity", "Copy deity", "Replica deity"],
                thresholds: [750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250],
                vanillaTarget: "Introspection",
                customIcons: [[35, 20], [35, 21], [35, 25], [35, 26], [35, 27], [35, 29], [35, 35], [35, 35], [35, 35], [35, 35], [35, 35]]
            }
        },
        other: {
            cps: {
                names: ["Beyond the speed of dough", "Speed of sound", "Speed of light", "Faster than light", "Speed of thought", "Faster than speed of thought"],
                thresholds: [1e57, 1e58, 1e59, 1e60, 1e61, 1e62],
                descs: ["Bake <b>1 octodecillion</b> per second.", "Bake <b>10 octodecillion</b> per second.", "Bake <b>100 octodecillion</b> per second.", "Bake <b>1 novemdecillion</b> per second.", "Bake <b>10 novemdecillion</b> per second.", "Bake <b>100 novemdecillion</b> per second."],
                vanillaTarget: "Speed's the name of the game (no it's not it's called Cookie Clicker)",
                customIcons: [[73, 0, getSpriteSheet('custom')], [73, 1, getSpriteSheet('custom')], [73, 2, getSpriteSheet('custom')], [73, 3, getSpriteSheet('custom')], [73, 4, getSpriteSheet('custom')], [73, 5, getSpriteSheet('custom')]]
            },
            click: {
                names: ["Clicktopus", "Clicker supreme", "Click master", "Click legend", "Click deity", "Click god", "Click emperor", "Click overlord", "Click sovereign", "Click monarch", "Click deity supreme", "Click deity ultimate", "Click deity transcendent", "Click of the Titans"],
                thresholds: [1e37, 1e42, 1e47, 1e52, 1e57, 1e63, 1e69, 1e75, 1e81, 1e87, 1e93, 1e99, 1e105, "clickOfTitans"],
                descs: ["Make <b>10 undecillion</b> from clicking.", "Make <b>1 tredecillion</b> from clicking.", "Make <b>100 quattuordecillion</b> from clicking.", "Make <b>10 sexdecillion</b> from clicking.", "Make <b>1 octodecillion</b> from clicking.", "Make <b>1 vigintillion</b> from clicking.", "Make <b>1 duovigintillion</b> from clicking.", "Make <b>1 quattuorvigintillion</b> from clicking.", "Make <b>1 sexvigintillion</b> from clicking.", "Make <b>1 vigintillion</b> from clicking.", "Make <b>1 trigintillion</b> from clicking.", "Make <b>1 duotrigintillion</b> from clicking.", "Make <b>1 quattuortrigintillion</b> from clicking.", "Generate <b>1 year of raw CPS</b> in a single cookie click.<q>One click to rule them all!</q>"],
                vanillaTarget: "What's not clicking",
                customIcons: [[0, 34, getSpriteSheet('custom')], [0, 35, getSpriteSheet('custom')], [0, 36, getSpriteSheet('custom')], [0, 37, getSpriteSheet('custom')], [0, 38, getSpriteSheet('custom')], [0, 39, getSpriteSheet('custom')], [0, 40, getSpriteSheet('custom')], [0, 41, getSpriteSheet('custom')], [0, 42, getSpriteSheet('custom')], [0, 48, getSpriteSheet('custom')], [0, 74, getSpriteSheet('custom')], [0, 57, getSpriteSheet('custom')], [0, 54, getSpriteSheet('custom')], [32, 4]]
            },
            wrinkler: {
                names: ["Wrinkler annihilator", "Wrinkler eradicator", "Wrinkler extinction event", "Wrinkler apocalypse", "Wrinkler armageddon"],
                thresholds: [666, 2666, 6666, 16666, 26666],
                descs: ["Burst <b>666 wrinklers</b>.<q>Pop goes the creepy.</q>", "Burst <b>2,666 wrinklers</b>.<q>That wasn't cream filling.</q>", "Burst <b>6,666 wrinklers</b>.<q>If it wrinkles, you pop it.</q>", "Burst <b>16,666 wrinklers</b>.<q>So much juice. So little remorse.</q>", "Burst <b>26,666 wrinklers</b>.<q>One squish closer to immortality.</q>"],
                vanillaTarget: "Moistburster",
                customIcons: [[48, 63, getSpriteSheet('custom')], [48, 62, getSpriteSheet('custom')], [48, 61, getSpriteSheet('custom')], [48, 60, getSpriteSheet('custom')], [48, 59, getSpriteSheet('custom')]]
            },
            goldenWrinkler: {
                names: ["Golden wrinkler"],
                thresholds: [210000000], // 6.66 years in seconds (6.66 * 365.25 * 24 * 60 * 60)
                descs: ["Burst a wrinkler worth <b>6.66 years of CPS</b>.<q>That's not cream filling, that's a retirement fund!</q>"],
                vanillaTarget: "Moistburster",
                customIcons: [[48, 76, getSpriteSheet('custom')]]
            },
            shinyWrinkler: {
                names: ["Rare specimen collector", "Endangered species hunter", "Extinction event architect"],
                thresholds: [2, 5, 10],
                descs: ["Burst <b>2 shiny wrinklers</b>.<q>You're a monster, do you know that?</q>", "Burst <b>5 shiny wrinklers</b>.<q>You really have to stop here, there arent many of these left in the world.</q>", "Burst <b>10 shiny wrinklers</b>.<q>People like you are evil, no one will ever see another one of these, you ruined it for everyone.</q>"],
                vanillaTarget: "Last Chance to See",
                customIcons: [[48, 0, getSpriteSheet('custom')], [48, 71, getSpriteSheet('custom')], [48, 66, getSpriteSheet('custom')]]
            },
            reindeer: {
                names: ["Reindeer destroyer", "Reindeer obliterator", "Reindeer extinction event", "Reindeer apocalypse"],
                thresholds: [500, 1000, 2000, 5000],
                descs: ["Pop <b>500 reindeer</b>.<q>You are become Claus, destroyer of hooves.</q>", "Pop <b>1,000 reindeer</b>.<q>That one had a red nose…</q>", "Pop <b>2,000 reindeer</b>.<q>Comet, Vixen, Toasted.</q>", "Pop <b>5,000 reindeer</b>.<q>Legends say the sky still smells like cinnamon and regret.</q>"],
                vanillaTarget: "Reindeer sleigher",
                customIcons: [[50, 5, getSpriteSheet('custom')], [50, 72, getSpriteSheet('custom')], [50, 37, getSpriteSheet('custom')], [50, 38, getSpriteSheet('custom')]]
            },
            goldenCookies: {
                names: ["Black cat's other paw", "Black cat's third paw", "Black cat's fourth paw", "Black cat's fifth paw", "Black cat's sixth paw", "Black cat's seventh paw"],
                thresholds: [17777, 37777, 47777, 57777, 67777, 77777],
                descs: ["Click <b>17,777 golden cookies</b>.", "Click <b>37,777 golden cookies</b>.", "Click <b>47,777 golden cookies</b>.", "Click <b>57,777 golden cookies</b>.", "Click <b>67,777 golden cookies</b>.", "Click <b>77,777 golden cookies</b>."],
                vanillaTarget: "Black cat's paw",
                customIcons: [[20, 33], [30, 6], [27, 6], [18, 37, getSpriteSheet('custom')], [21, 33], [25, 7]]
            },
            spell: {
                names: ["Archwizard", "Spellmaster", "Cookieomancer", "Spell lord", "Magic emperor", "Sweet Sorcery"],
                thresholds: [1999, 2999, 3999, 4999, 9999, "freeSugarLump"],
                descs: ["Cast <b>1,999</b> spells.", "Cast <b>2,999</b> spells.", "Cast <b>3,999</b> spells.", "Cast <b>4,999</b> spells.", "Cast <b>9,999</b> spells.", "Get the <b>Free Sugar Lump</b> outcome from a magically spawned golden cookie.<q>Sweet sorcery indeed!</q>"],
                vanillaTarget: "A wizard is you",
                customIcons: [[22, 12], [43, 0, getSpriteSheet('custom')], [52, 0, getSpriteSheet('custom')], [28, 12], [27, 12], [47, 0, getSpriteSheet('custom')]]
            },
            templeSwaps: {
                names: ["Faithless Loyalty", "God of All Gods"],
            thresholds: [100, 86400], // 100 temple swaps, 24 hours (86400 seconds) per god
            descs: ["Swap gods in the Pantheon <b>100 times</b> in one ascension.<q>You know you cant just pick a religion to suit your mood for the day right?</q>", "Use each pantheon god for at least <b>24 hours</b> total across all ascensions.<q>Variety is the spice of divine life</q>"],
            vanillaTarget: "A wizard is you",
            customIcons: [[21, 18], [22, 18]]
        },
            gardenHarvest: {
                names: ["Greener, aching thumb", "Greenest, aching thumb", "Photosynthetic prodigy", "Garden master", "Plant whisperer"],
                thresholds: [2000, 3000, 5000, 7500, 10000],
                descs: ["Harvest <b>2,000</b> mature garden plants.", "Harvest <b>3,000</b> mature garden plants.", "Harvest <b>5,000</b> mature garden plants.", "Harvest <b>7,500</b> mature garden plants.", "Harvest <b>10,000</b> mature garden plants."],
                vanillaTarget: "Green, aching thumb",
                // Use the Spiced Cookies pattern: [x, y, spriteSheetURL]
                customIcons: [[4, 2, getSpriteSheet('gardenPlants')], [4, 10, getSpriteSheet('gardenPlants')], [4, 17, getSpriteSheet('gardenPlants')], [4, 18, getSpriteSheet('gardenPlants')], [4, 19, getSpriteSheet('gardenPlants')]]
            },
            cookiesAscension: {
                names: ["The Doughpocalypse", "The Flour Flood", "The Ovenverse", "The Crumb Crusade", "The Final Batch", "The Ultimate Ascension", "The Transcendent Rise"],
                thresholds: [1e73, 1e74, 1e75, 1e76, 1e77, 1e78, 1e79],
                descs: ["Bake <b>10 trevigintillion</b> cookies in one ascension.", "Bake <b>100 trevigintillion</b> cookies in one ascension.", "Bake <b>1 quattuorvigintillion</b> cookies in one ascension.", "Bake <b>10 quattuorvigintillion</b> cookies in one ascension.", "Bake <b>100 quattuorvigintillion</b> cookies in one ascension.", "Bake <b>1 quinvigintillion</b> cookies in one ascension.", "Bake <b>10 quinvigintillion</b> cookies in one ascension."],
                vanillaTarget: "And a little extra",
                customIcons: [[73, 0, getSpriteSheet('custom')], [73, 1, getSpriteSheet('custom')], [73, 2, getSpriteSheet('custom')], [73, 3, getSpriteSheet('custom')], [73, 4, getSpriteSheet('custom')], [73, 5, getSpriteSheet('custom')], [73, 6, getSpriteSheet('custom')]]
            },
            forfeited: {
                names: ["Dante's unwaking dream", "The abyss gazes back", "Charon's final toll", "Cerberus's third head", "Minos's eternal judgment", "The river Styx flows backward", "Ixion's wheel spins faster", "Sisyphus's boulder crumbles", "Tantalus's eternal thirst", "The ninth circle's center", "Lucifer's frozen tears", "Beyond the void's edge", "The final descent's end"],
                thresholds: [1e60, 1e63, 1e66, 1e69, 1e72, 1e75, 1e78, 1e81, 1e84, 1e87, 1e90, 1e93, 1e96],
                descs: ["Forfeit <b>1 novemdecillion</b> cookies total across all ascensions.", "Forfeit <b>1 vigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 unvigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 duovigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 trevigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 quattuorvigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 quinvigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 sexvigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 septenvigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 octovigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 novemvigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 trigintillion</b> cookies total across all ascensions.", "Forfeit <b>1 untrigintillion</b> cookies total across all ascensions."],
                vanillaTarget: "No more room in hell",
                customIcons: [[0, 11], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11], [11, 11], [12, 11]]
            },
            totalBuildings: {
                names: ["Building behemoth", "Construction colossus", "Architectural apex"],
                thresholds: [15000, 20000, 25000],
                descs: ["Own <b>15,000 buildings</b>.<q>You have more real estate than sense.</q>", "Own <b>20,000 buildings</b>.<q>That's not a skyline. That's a warning sign.</q>", "Own <b>25,000 buildings</b>.<q>Your shadow blocks out the sun, and the competition.</q>"],
                vanillaTarget: "Myriad",
                customIcons: [[20, 39, getSpriteSheet('custom')], [20, 47, getSpriteSheet('custom')], [20, 48, getSpriteSheet('custom')]]
            },
            buildingsSold: {
                names: ["Asset Liquidator", "Flip City", "Ghost Town Tycoon"],
                thresholds: [10000, 25000, 50000],
                descs: ["Sell <b>10,000 buildings</b>.<q>A thousand dreams bulldozed for a golden cookie.</q>", "Sell <b>25,000 buildings</b>.<q>Your economic model is just 'wreck and repeat.'</q>", "Sell <b>50,000 buildings</b>.<q>You called it 'liquidating assets.' They called it 'eviction.'</q>"],
                vanillaTarget: "Myriad",
                customIcons: [[28, 26], [15, 9], [32, 33]]
            },
            everything: {
                names: ["Septcentennial and a half", "Octcentennial", "Octcentennial and a half", "Nonacentennial", "Nonacentennial and a half", "Millennial"],
                thresholds: [750, 800, 850, 900, 950, 1000],
                descs: ["Have at least <b>750 of everything</b>.", "Have at least <b>800 of everything</b>.", "Have at least <b>850 of everything</b>.", "Have at least <b>900 of everything</b>.", "Have at least <b>950 of everything</b>.", "Have at least <b>1,000 of everything</b>."],
                vanillaTarget: "Septcentennial",
                customIcons: [[21, 74, getSpriteSheet('custom')], [21, 75, getSpriteSheet('custom')], [21, 76, getSpriteSheet('custom')], [21, 77, getSpriteSheet('custom')], [21, 78, getSpriteSheet('custom')], [21, 79, getSpriteSheet('custom')]]
            },
          
            seedlog: {
                names: ["Seedless to eternity", "Seedless to infinity", "Seedless to beyond"],
                thresholds: [5, 10, 25],
                descs: ["Convert a complete seed log into sugar lumps by sacrificing your garden to the sugar hornets <b>5 times</b>.<q>Fertilizer? Nah, I prefer fire.</q>", "Convert a complete seed log into sugar lumps by sacrificing your garden to the sugar hornets <b>10 times</b>.<q>Sugar hornets are pleased.</q>", "Convert a complete seed log into sugar lumps by sacrificing your garden to the sugar hornets <b>25 times</b>.<q>How many times must you kill Eden?</q>"],
                vanillaTarget: "Seedless to nay",
                customIcons: [[0, 34, getSpriteSheet('gardenPlants')], [1, 34, getSpriteSheet('gardenPlants')], [2, 34, getSpriteSheet('gardenPlants')]]
            },
            kittensOwned: {
                names: ["Kitten jamboree", "Kitten Fiesta"],
                thresholds: [18, 29],
                descs: ["Own all <b>18 kittens</b> original kittens.", "Own all <b>18 original kittens</b> and all <b>11 expansion kittens</b> at once.<q>Okay thats really just too many cats</q>"],
                vanillaTarget: "Jellicles",
                customIcons: [[18, 14], [18, 13]]
            },
            reincarnate: {
                names: ["Ascension master", "Ascension legend", "Ascension deity"],
                thresholds: [250, 500, 999],
                descs: ["Ascend <b>250 times</b>.", "Ascend <b>500 times</b>.", "Ascend <b>999 times</b>."],
                vanillaTarget: "Reincarnation",
                customIcons: [[42, 76, getSpriteSheet('custom')], [42, 60, getSpriteSheet('custom')], [42, 59, getSpriteSheet('custom')]]
            },
            stockmarket: {
                names: ["Solid Assets", "Firm Assets", "Stable Assets", "Secure Assets", "Prime Assets", "The Dough Jones Plunge"],
                thresholds: [25e6, 100e6, 250e6, 500e6, 1e9, -1e6],
                descs: ["Have <b>$25 million</b> in stock market profits across all ascensions.", "Have <b>$100 million</b> in stock market profits across all ascensions.", "Have <b>$250 million</b> in stock market profits across all ascensions.", "Have <b>$500 million</b> in stock market profits across all ascensions.", "Have <b>$1 billion</b> in stock market profits across all ascensions.", "Have <b>$1 million</b> in stock market losses in one ascension.<q>This is why you diversify. Probably.</q>"],
                vanillaTarget: "Liquid assets",
                customIcons: [[17, 6], [26, 7], [33, 33], [28, 29], [31, 8], [15, 8]]
            },
            seasonalReindeer: {
                names: ["Cupid's Reindeer", "Business Reindeer", "Bundeer", "Ghost Reindeer"],
                thresholds: [1, 1, 1, 1],
                descs: ["Pop a reindeer during <b>Valentine's Day season.</b><q>Love is fleeting. So was that reindeer.</q>", "Pop a reindeer during <b>Business Day season.</b><q>His KPI was 'don't get popped.'</q>", "Pop a reindeer during <b>Easter season.</b><q>Wrong holiday, right target.</q>", "Pop a reindeer during <b>Halloween season.</b><q>Was that ectoplasm or caramel?</q>"],
                vanillaTarget: "Eldeer",
                customIcons: [[50, 73, getSpriteSheet('custom')], [50, 14, getSpriteSheet('custom')], [50, 19, getSpriteSheet('custom')], [50, 71, getSpriteSheet('custom')]]
            },
            gardenSeedsTime: {
                names: ["I feel the need for seed"],
                thresholds: [5 * 24 * 60 * 60 * 1000], // 5 days in milliseconds
                descs: ["Unlock all garden seeds within <b>5 days</b> of your last garden sacrifice. Look this one is tricky, if you reload or load a save the 5 day timer is invalidated, so you cant load in a completed garden."],
                vanillaTarget: "Green, aching thumb",
                customIcons: [[25, 15]]
            },
            seasonalDropsTime: {
                names: ["Holiday Hoover", "Merry Mayhem"],
                thresholds: [60 * 60 * 1000, 40 * 60 * 1000], // 60 minutes and 40 minutes in milliseconds
                descs: ["Collect all seasonal drops within <b>60 minutes</b> of an Ascension start.<q>Santa is watching and he thinks you need to chill out.</q>", "Collect all seasonal drops within <b>40 minutes</b> of an Ascension start.<q>See it is possible, ye of little faith.</q>"],
                vanillaTarget: "Hide & seek champion",
                customIcons: [[18, 4], [17, 9]]
            },
                    hardercorest: {
            names: ["Hardercorest"],
            thresholds: [1e10], // 10 billion cookies
            descs: ["Bake <b>10 billion cookies</b> with no cookie clicks and no upgrades bought in Born Again mode.<q>Do you hate me or yourself after that one?</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[13, 6]]
        },
                    hardercorester: {
            names: ["Hardercorest-er"],
            thresholds: [1e9], // 1 billion cookies
            descs: ["Bake <b>1 billion cookies</b> with no more than 15 clicks, no more than 15 buildings (no selling), and no more than 15 upgrades in Born Again mode.<q>Bet you thought that wouldn't be as bad as it was eh?</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[14, 6]]
        },
        allBuildingsLevel10: {
            names: ["Have your sugar and eat it too"],
            thresholds: [10], // Level 10
            descs: ["Have every building reach  <b>level 10</b> simultaneously."],
            vanillaTarget: "You win a cookie",
            customIcons: [[26, 27]]
        },
        sugarLumps: {
            names: ["Sweet Child of Mine"],
            thresholds: [100], // 100 sugar lumps
            descs: ["Own <b>100 sugar lumps</b> at once."],
            vanillaTarget: "Maillard reaction",
            customIcons: [[29, 16]]
        },
        seasonSwitches: {
            names: ["Calendar Abuser"],
            thresholds: [50], // 50 season switches
            descs: ["Switch seasons <b>50 times</b> in one ascension.<q>What month even is it?</q>"],
            vanillaTarget: "Maillard reaction",
            customIcons: [[16, 6]]
        },
        vanillaAchievements: {
            names: ["Vanilla Star"],
            thresholds: [622], // All 622 vanilla achievements
            descs: ["Own all <b>622 original achievements.</b><q>Wow congratulations 100% achievements! Now just 459 more to go.</q>"],
            vanillaTarget: "You win a cookie",
            customIcons: [[22, 7]]
        },
        botanicalPerfection: {
            names: ["Botanical Perfection", "Duketater Salad"],
            thresholds: [34, 12], // All 34 plant types, 12 duketaters
            descs: ["Have one of every type of plant in the mature stage at once.<q>I have become the plants now, I am the master of the garden, bow before my hoe.</q>", "Harvest <b>12 mature Duketaters</b> simultaneously.<q>Timing your salad is everything otherwise the mayo goes bad and you kill all your friends</q>"],
            vanillaTarget: "Keeper of the conservatory",
            customIcons: [[27, 15], [0, 19, getSpriteSheet('gardenPlants')]]
        },

        soilChanges: {
            names: ["Fifty Shades of Clay"],
            thresholds: [100], // 100 soil changes
            descs: ["Change the soil type of your Garden <b>100 times</b> in one ascension.<q>This is not how gardening works.</q>"],
            vanillaTarget: "Seedless to nay",
            customIcons: [[3, 34, getSpriteSheet('gardenPlants')]]
        },
        tickerClicks: {
            names: ["News ticker addict"],
            thresholds: [1000], // 1000 ticker clicks
            descs: ["Click on the news ticker <b>1,000 times</b>.<q>Hey dummy you are clicking on the wrong thing</q>"],
            vanillaTarget: "Stifling the press"
        },
        wrathCookies: {
            names: ["Warm-Up Ritual", "Deal of the Slightly Damned", "Baker of the Beast"],
            thresholds: [66, 666, 6666], // Wrath cookie clicks
            descs: ["Click <b>66 wrath cookies</b>.", "Click <b>666 wrath cookies</b>.", "Click <b>6,666 wrath cookies</b>."],
            vanillaTarget: "Wrath cookie"
        },
        goldenCookieTime: {
            names: ["Second Life, First Click"],
            thresholds: [120 * 1000], // 120 seconds in milliseconds
            descs: ["Click a golden cookie within <b>120 seconds</b> of ascending."],
            vanillaTarget: "Fading luck",
            customIcons: [[12, 14]]
        },
        wrinklerTime: {
            names: ["Wrinkler Rush"],
            thresholds: [930 * 1000], // 930 seconds (15 minutes 30 seconds) in milliseconds
            descs: ["Pop a wrinkler within <b>15 minutes and 30 seconds</b> of ascending.<q>The Grandmatriarchs barely had time to wake up!</q>"],
            vanillaTarget: "Moistburster",
            customIcons: [[48, 62, getSpriteSheet('custom')]]
        },
        wrinklerBankDouble: {
            names: ["Wrinkler Windfall"],
            thresholds: [2], // 2x bank value (doubled)
            descs: ["Double your bank with a single wrinkler pop.<q>Talk about a return on investment!</q>"],
            vanillaTarget: "Moistburster",
            customIcons: [[48, 78, getSpriteSheet('custom')]]
        },
        hardcoreNoHeavenly: {
            names: ["We don't need no heavenly chips"],
            thresholds: [500], // 500 of every building
            descs: ["Own at least <b>500 of every building type</b>, without ever selling or sacrificing any buildings, and without owning the 'Heavenly chip secret' upgrade.<q>Well that was a little different wasn't it?</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[12, 7]]
        },
        hardcoreFinalCountdown: {
            names: ["The Final Countdown"],
            thresholds: [1], // Just a placeholder, we'll check exact counts in the requirement function
            descs: ["Own exactly 20 Cursors, 19 Grandmas, 18 Farms, yada yada yada, down to 1 You. No selling or sacrificing any buildings. Must be earned in Born Again mode.<q>Is that song stuck in your head now, its pretty catchy</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[13, 7]]
        },
        hardcoreNoKittens: {
            names: ["Really more of a dog person"],
            thresholds: [1e9], // 1 billion cookies per second
            descs: ["Bake <b>1 billion cookies per second</b> without buying any kitten upgrades in Born Again mode.<q>Turns out cookies taste just fine without cat hair in them.</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[14, 7]]
        },
        hardcoreNoGoldenCookies: {
            names: ["Gilded Restraint"],
            thresholds: [1e15], // 1 quadrillion cookies
            descs: ["Bake <b>1 quadrillion cookies</b> without ever clicking a golden cookie, must be done in Born Again mode.<q>Patience is its own buff.</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[23, 66, getSpriteSheet('custom')]]
        },
        hardcoreCursorsAndGrandmas: {
            names: ["Back to Basic Bakers"],
            thresholds: [1e9], // 1 billion cookies per second
            descs: ["Reach <b>1 billion cookies per second</b> using only Cursors and Grandmas (no other buildings, no selling), must be done in Born Again mode.<q>Turns out Grandma really is the backbone of the empire.</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[23, 69, getSpriteSheet('custom')]]
        },
        hardcoreModestPortfolio: {
            names: ["Modest Portfolio"],
            thresholds: [1e15], // 1 quadrillion cookies
            descs: ["Reach <b>1 quadrillion cookies</b> without ever owning more than 5 of any building type (no selling), must be done in Born Again mode.<q>Breadth over depth.</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[23, 68, getSpriteSheet('custom')]]
        },
        hardcoreDifficultDecisions: {
            names: ["Difficult Decisions"],
            thresholds: [1e9], // 1 billion cookies
            descs: ["Bake <b>1 billion cookies</b> without ever having more than <b>25 combined upgrades or buildings</b> at any given time, must be done in Born Again mode.<q>Some decisions leave no right answer, only consequences.</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[23, 10, getSpriteSheet('custom')]]
        },
        hardcoreLaidInPlainSight: {
            names: ["Laid in Plain Sight"],
            thresholds: [10], // 10 cookies per second
            descs: ["Bake <b>10 cookies per second</b> without purchasing any buildings, must be done in Born Again mode.<q>Eggsactly where you weren't looking!</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[23, 25, getSpriteSheet('custom')]]
        },
        hardcorePrecisionNerd: {
            names: ["Precision Nerd"],
            thresholds: [1234567890], // Exactly 1,234,567,890 cookies
            descs: ["Have exactly <b>1,234,567,890 cookies</b> in your bank and hold it for <b>60 seconds</b>.<q>Last night's 'Itchy & Scratchy' was, without a doubt, the worst episode ever. Rest assured I was on the Internet within minutes registering my disgust throughout the world.</q>"],
            vanillaTarget: "Hardcore",
            customIcons: [[23, 9, getSpriteSheet('custom')]]
        },
        
        theFinalChallenger: {
            names: ["The Final Challenger"],
            thresholds: [10], // 10 out of 15 challenge achievements
            descs: ["Win <b>10</b>/15 of the Just Natural Expansion <b>Challenge Achievements</b>.<q>You didn't just rise to the challenge… you baked it into a 12-layer cake.</q>"],
            vanillaTarget: "Speed baking",
            customIcons: [[47, 48, getSpriteSheet('custom')]]
        },
        
        // Stock market achievements
        stockBrokers: {
            names: ["Broiler room"],
            thresholds: [100], // 100 stockbrokers
            descs: ["Hire at least <b>100</b> stockbrokers in the Stock Market.<q>And there is no such thing as a no sale call. A sale is made on every call you make. Either you sell the client some stock or he sells you a reason he can't. Either way a sale is made, who's gonna close? You or him?</q>"],
            vanillaTarget: "Buy buy buy",
            customIcons: [[1, 33]]
        },
        cookieClicks: {
            names: ["Buff Finger"],
            thresholds: [250000], // 250,000 cookie clicks
            descs: ["Click the cookie <b>250,000 times</b>.<q>I bet your index finger is bigger than the others now.</q>"],
            vanillaTarget: "The elder scrolls",
            customIcons: [[12, 30]]
        },
        pledges: {
            names: ["Deep elder nap"],
            thresholds: [666], // 666 pledges
            descs: ["Quash the grandmatriarchs one way or another <b>666 times</b>.<q>Those grandmatriarchs are really out, I can hear them snoring from the next town over</q>"],
            vanillaTarget: "Elder slumber",
            customIcons: [[2, 9]]
        },
        buffs: {
            names: ["Trifecta Combo", "Combo Initiate", "Combo God", "Combo Hacker", "Frenzy frenzy", "Double Dragon Clicker", "Frenzy Marathon", "Hogwarts Graduate", "Hogwarts Dropout", "Spell Slinger"],
            thresholds: [3, 6, 9, 12, 0, 0, 0, 0, 0, 0], // 3, 6, 9, 12 buffs active, frenzy frenzy, double dragon, frenzy marathon, wizard achievements, and spell slinger (handled separately)
            descs: ["Have <b>3 buffs</b> active at once.<q>Hey that was pretty neat!</q>", "Have <b>6 buffs</b> active at once.<q>Okay that was downright impressive clicking</q>", "Have <b>9 buffs</b> active at once.<q>I can't even follow what you did there but it looked really cool</q>", "Have <b>12 buffs</b> active at once.<q>I don't believe you, but for like real congrats if you did that.</q>", "Have all three frenzy buffs active at once.<q>Like pizza pizza but with more wrath.</q>", "Have a dragon flight and a click frenzy active at the same time.<q>Double the dragons, double the clicking!</q>", "Have a frenzy buff with a total duration of at least 10 minutes.<q>Who needs coffee when you have this much energy?</q>", "Have <b>3 positive spell effects</b> active at once.<q>Merlin would be proud of your spellcraft!</q>", "Have <b>3 negative spell effects</b> active at once.<q>The Sorting Hat made a terrible mistake!</q>", "Cast <b>10 spells</b> within a 10-second window.<q>Speed casting at its finest!</q>"],
            vanillaTarget: "Here be dragon",
            customIcons: [[25, 36], [26, 11], [22, 11], [23, 11], [39, 36, getSpriteSheet('custom')], [30, 12], [22, 13], [30, 20], [31, 20], [32, 4]]
        },
        prestigeUpgrades: {
            names: ["Beyond Prestige"],
            thresholds: [129], // All 129 prestige upgrades
            descs: ["Own all <b>129</b> original heavenly upgrades.<q>Prestige is just a stepping stone to whatever the hell this is.</q>"],
            vanillaTarget: "All the stars in heaven",
            customIcons: [[20, 7]]
        }
        }
    };
    
    // Seasonal reindeer tracking system
    var seasonalReindeerData = {
        valentines: { popped: false, achievement: null },
        fools: { popped: false, achievement: null },
        easter: { popped: false, achievement: null },
        halloween: { popped: false, achievement: null }
    };
    
    // Helper function to get current season
    function getCurrentSeason() {
        return Game.season || '';
    }
    
    // Initialize seasonal reindeer tracking (now handled by centralized hook system)
    function initializeSeasonalReindeerTracking() {
        // Initialize tracking variables
        Game.lastReindeerClicked = Game.reindeerClicked || 0;
    }
    
    // Create seasonal reindeer achievements
    function createSeasonalReindeerAchievements() {
        var vanilla = findLastVanillaAchievement("Eldeer");
        
        if (vanilla.order > 0) {
            var seasonalData = achievementData.other.seasonalReindeer;
            
            for (var i = 0; i < seasonalData.names.length; i++) {
                var achievement = createAchievement(
                    seasonalData.names[i],
                    seasonalData.descs[i],
                    vanilla.icon,
                    vanilla.order + (i + 1) * 0.01,
                    (function(seasonName) {
                        return function() {
                            return seasonalReindeerData[seasonName] && seasonalReindeerData[seasonName].popped;
                        };
                    })(getSeasonFromIndex(i)),
                    seasonalData.customIcons[i]
                );
                
                // Store reference to achievement for each season
                var seasonName = getSeasonFromIndex(i);
                if (seasonalReindeerData[seasonName]) {
                    seasonalReindeerData[seasonName].achievement = seasonalData.names[i];
                }
            }
        }
    }
    
    // Helper function to map achievement index to season name
    function getSeasonFromIndex(index) {
        var seasons = ['valentines', 'fools', 'easter', 'halloween'];
        return seasons[index] || '';
    }
    
    // Save/load seasonal reindeer data
    function saveSeasonalReindeerData() {
        var data = {
            valentines: seasonalReindeerData.valentines.popped,
            fools: seasonalReindeerData.fools.popped,
            easter: seasonalReindeerData.easter.popped,
            halloween: seasonalReindeerData.halloween.popped
        };
        return JSON.stringify(data);
    }
    
    function loadSeasonalReindeerData(str) {
        try {
            var data = JSON.parse(str);
            if (data.valentines !== undefined) seasonalReindeerData.valentines.popped = data.valentines;
            if (data.fools !== undefined) seasonalReindeerData.fools.popped = data.fools;
            if (data.easter !== undefined) seasonalReindeerData.easter.popped = data.easter;
            if (data.halloween !== undefined) seasonalReindeerData.halloween.popped = data.halloween;
        } catch (e) {
            console.warn('Error loading seasonal reindeer data:', e);
        }
    }
    
    // Test function to manually trigger reindeer tracking
    function testReindeerTracking() {

        
        // Simulate a reindeer pop
        if (Game.reindeerClicked !== undefined) {
            Game.reindeerClicked++;
            
            // Manually trigger the tracking logic
            if (Game.reindeerClicked > Game.lastReindeerClicked) {
                var currentSeason = getCurrentSeason();
                
                // Only track if we're in a non-Christmas season
                if (currentSeason && currentSeason !== 'christmas') {
                    // Mark this season as completed
                    if (seasonalReindeerData[currentSeason]) {
                        seasonalReindeerData[currentSeason].popped = true;
                        
                        // Award achievement if we have one for this season
                        if (seasonalReindeerData[currentSeason].achievement) {
                            markAchievementWon(seasonalReindeerData[currentSeason].achievement);
                        }
                    }
                }
                
                Game.lastReindeerClicked = Game.reindeerClicked;
            }
        }
    }
    
                // Initialize tracking variables
            var modTracking = {
                shinyWrinklersPopped: 0,
                previousWrinklerStates: {},
                wrathCookiesClicked: 0,
                templeSwapsTotal: 0,
                soilChangesTotal: 0,
                pledges: 0,
                reindeerClicked: 0,
                lastReindeerClicked: 0,
                wrinklersPopped: 0,
                previousTempleSwaps: 0,
                previousSoilType: null,
                spellCastTimes: [], // Track spell cast timestamps for Spell Slinger achievement
                bankDoubledByWrinkler: false, // Track if bank was doubled by a wrinkler pop
                godUsageTime: {}, // Track cumulative time each god is slotted
                currentSlottedGods: {}, // Track currently slotted gods for time calculation
                fthofCookieOutcomes: [] // Track all FtHoF cookie outcomes for achievements
            };
    
            // Initialize shiny wrinkler tracking (now handled by centralized hook system)
        function initializeShinyWrinklerTracking() {
            // Initialize tracking variables
            if (!modTracking.shinyWrinklersPopped) modTracking.shinyWrinklersPopped = 0;
            if (!modTracking.previousWrinklerStates) modTracking.previousWrinklerStates = {};
            if (!modTracking.bankDoubledByWrinkler) modTracking.bankDoubledByWrinkler = false;
            if (!modTracking.fthofCookieOutcomes) modTracking.fthofCookieOutcomes = [];
        }
    
    // Initialize temple swap tracking (now handled by centralized hook system)
    function initializeTempleSwapTracking() {
        // Initialize tracking variables
        if (!modTracking.templeSwapsTotal) modTracking.templeSwapsTotal = 0;
        if (!modTracking.previousTempleSwaps) modTracking.previousTempleSwaps = 0;
    }
    
    // Initialize soil change tracking (now handled by centralized hook system)
    function initializeSoilChangeTracking() {
        // Initialize tracking variables
        if (!modTracking.soilChangesTotal) modTracking.soilChangesTotal = 0;
        if (!modTracking.previousSoilType) modTracking.previousSoilType = null;
    }
    
    // Initialize wrath cookie tracking (now handled by centralized hook system)
    function initializeWrathCookieTracking() {
        // Initialize tracking variables
        if (!modTracking.wrathCookiesClicked) modTracking.wrathCookiesClicked = 0;
    }
    
    // Track pantheon god usage time
    function trackGodUsage() {
        // Only track if pantheon is available
        if (!Game.Objects['Temple'] || !Game.Objects['Temple'].minigame) return;
        
        var pantheon = Game.Objects['Temple'].minigame;
        var currentTime = Date.now();
        
        // Check if pantheon has slot property
        if (!pantheon || !pantheon.slot || !Array.isArray(pantheon.slot)) return;
        
        // Initialize god usage tracking if not already done
        if (!modTracking.godUsageTime || Object.keys(modTracking.godUsageTime).length === 0) {
            modTracking.godUsageTime = {};
            // Initialize with saved lifetime data
            if (lifetimeData.godUsageTime) {
                for (var godName in lifetimeData.godUsageTime) {
                    modTracking.godUsageTime[godName] = lifetimeData.godUsageTime[godName] || 0;
                }
            }
        }
        
        // Check each slot for currently slotted gods
        var currentSlottedGods = {};
        var slotNames = pantheon.slotNames || ['Diamond', 'Ruby', 'Jade'];
        
        for (var slot = 0; slot < pantheon.slot.length; slot++) {
            var godId = pantheon.slot[slot];
            
            if (godId >= 0 && pantheon.godsById && pantheon.godsById[godId]) {
                var god = pantheon.godsById[godId];
                var godName = god.name || `god_${godId}`;
                currentSlottedGods[godName] = true;
                
                // Initialize tracking for this god if not already done
                if (!modTracking.godUsageTime[godName]) {
                    modTracking.godUsageTime[godName] = 0;
                }
                
                // Add time for this god (10 seconds since check hook runs every 10 seconds)
                modTracking.godUsageTime[godName] += 10;
                
                // Also update lifetime data
                if (!lifetimeData.godUsageTime[godName]) {
                    lifetimeData.godUsageTime[godName] = 0;
                }
                lifetimeData.godUsageTime[godName] += 10;
            }
        }
        
        // Update current slotted gods tracking
        modTracking.currentSlottedGods = currentSlottedGods;
    }
    
    // ===== UPGRADES SYSTEM =====
    // Import upgrades and saving functionality from upgrades.js
    
    // Upgrade data structure
    var upgradeData = {
        generic: [
            {
                name: 'Box of improved cookies',
                desc: 'Contains an assortment of scientifically improved cookies.',
                ddesc: 'Contains an assortment of scientifically improved cookies.<q>Brought to you by the hard working researchers at Just Natural Expansion Mod</q>',
                price: 2.5e67, // 25 unvigintillion
                icon: [34, 4],
                pool: '',
                unlockCondition: function() {
                    var cookiesBaked = Game.cookiesEarned || 0;
                    var shouldUnlock = cookiesBaked >= 2.5e67; // 25 unvigintillion
                    return shouldUnlock;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Increased Social Security Checks',
                desc: 'Grandmas cost <b>5%</b> less.',
                ddesc: 'Grandmas cost <b>5%</b> less.<q>With better retirement benefits, your grandmas can afford to work for less. They\'re just happy to be baking cookies and staying active.</q>',
                price: 5e19, // 50 quintillion
                icon: [1, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var grandmaAmount = Game.Objects['Grandma'] ? Game.Objects['Grandma'].amount : 0;
                    return grandmaAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Off-Brand Eyeglasses',
                desc: 'Grandmas cost <b>5%</b> less.',
                ddesc: 'Grandmas cost <b>5%</b> less.<q>Generic reading glasses are just as good as the expensive ones, and they make your grandmas look more distinguished while they bake.</q>',
                price: 5e22, // 50 sextillion
                icon: [1, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var grandmaAmount = Game.Objects['Grandma'] ? Game.Objects['Grandma'].amount : 0;
                    return grandmaAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Plastic Walkers',
                desc: 'Grandmas cost <b>5%</b> less.',
                ddesc: 'Grandmas cost <b>5%</b> less.<q>Lightweight, durable, and much cheaper than the fancy ones. Your grandmas can now move around the kitchen more efficiently while saving money.</q>',
                price: 5e25, // 50 septillion
                icon: [1, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var grandmaAmount = Game.Objects['Grandma'] ? Game.Objects['Grandma'].amount : 0;
                    return grandmaAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk Discount Hearing Aids',
                desc: 'Grandmas cost <b>5%</b> less.',
                ddesc: 'Grandmas cost <b>5%</b> less.<q>Buying hearing aids in bulk saves money, and your grandmas can now hear cookie timers perfectly. What\'s that? They said the cookies are ready!</q>',
                price: 5e28, // 50 octillion
                icon: [1, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var grandmaAmount = Game.Objects['Grandma'] ? Game.Objects['Grandma'].amount : 0;
                    return grandmaAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Generic Arthritis Medication',
                desc: 'Grandmas cost <b>5%</b> less.',
                ddesc: 'Grandmas cost <b>5%</b> less.<q>The store brand works just as well as the name brand, and your grandmas can now knead dough without any complaints. Well, fewer complaints.</q>',
                price: 5e31, // 50 nonillion
                icon: [4, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var grandmaAmount = Game.Objects['Grandma'] ? Game.Objects['Grandma'].amount : 0;
                    return grandmaAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Wholesale Denture Adhesive',
                desc: 'Grandmas cost <b>5%</b> less.',
                ddesc: 'Grandmas cost <b>5%</b> less.<q>Buying denture adhesive in industrial quantities means your grandmas can smile confidently while tasting their cookie creations. The savings are toothsome!</q>',
                price: 5e34, // 50 decillion
                icon: [4, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var grandmaAmount = Game.Objects['Grandma'] ? Game.Objects['Grandma'].amount : 0;
                    return grandmaAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Biodiesel fueled tractors',
                desc: 'Farms cost <b>5%</b> less.',
                ddesc: 'Farms cost <b>5%</b> less.<q>Your farms have discovered that running tractors on recycled cooking oil from cookie production is both eco-friendly and surprisingly cost-effective. The tractors smell like fresh cookies now!</q>',
                price: 5e22, // 50 sextillion
                icon: [2, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var farmAmount = Game.Objects['Farm'] ? Game.Objects['Farm'].amount : 0;
                    return farmAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Free manure from clone factories',
                desc: 'Farms cost <b>5%</b> less.',
                ddesc: 'Farms cost <b>5%</b> less.<q>The clone factories produce so much waste that your farms get all the fertilizer they need for free. The cookies grown with this manure taste surprisingly good.</q>',
                price: 5e25, // 50 septillion
                icon: [2, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var farmAmount = Game.Objects['Farm'] ? Game.Objects['Farm'].amount : 0;
                    return farmAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Solar-powered irrigation systems',
                desc: 'Farms cost <b>5%</b> less.',
                ddesc: 'Farms cost <b>5%</b> less.<q>Your farms now use solar panels to power their irrigation systems. The cookies grow faster when they\'re watered with sunlight-filtered water, and the energy bills are practically zero.</q>',
                price: 5e28, // 50 octillion
                icon: [2, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var farmAmount = Game.Objects['Farm'] ? Game.Objects['Farm'].amount : 0;
                    return farmAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk seed purchases',
                desc: 'Farms cost <b>5%</b> less.',
                ddesc: 'Farms cost <b>5%</b> less.<q>Buying cookie seeds in industrial quantities has dramatically reduced costs. Your farms now have enough seeds to plant cookie forests, and the bulk discount is delicious.</q>',
                price: 5e31, // 50 nonillion
                icon: [2, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var farmAmount = Game.Objects['Farm'] ? Game.Objects['Farm'].amount : 0;
                    return farmAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Robot farm hands',
                desc: 'Farms cost <b>5%</b> less.',
                ddesc: 'Farms cost <b>5%</b> less.<q>Your farms now employ robotic workers who never tire and work for free. They\'re programmed to be gentle with the cookie plants and surprisingly good at telling cookie jokes.</q>',
                price: 5e34, // 50 decillion
                icon: [5, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var farmAmount = Game.Objects['Farm'] ? Game.Objects['Farm'].amount : 0;
                    return farmAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Vertical farming subsidies',
                desc: 'Farms cost <b>5%</b> less.',
                ddesc: 'Farms cost <b>5%</b> less.<q>The government is so impressed with your cookie farming innovation that they\'re providing subsidies for vertical farming. Your cookie towers are now taxpayer-funded!</q>',
                price: 5e37, // 50 undecillion
                icon: [5, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var farmAmount = Game.Objects['Farm'] ? Game.Objects['Farm'].amount : 0;
                    return farmAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Recycled mining equipment',
                desc: 'Mines cost <b>5%</b> less.',
                ddesc: 'Mines cost <b>5%</b> less.<q>Your mines now use refurbished equipment from abandoned cookie quarries. The drills are a bit rusty but they still extract cookie ore just fine, and the savings are rock solid.</q>',
                price: 5e25, // 50 septillion
                icon: [3, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var mineAmount = Game.Objects['Mine'] ? Game.Objects['Mine'].amount : 0;
                    return mineAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk dynamite purchases',
                desc: 'Mines cost <b>5%</b> less.',
                ddesc: 'Mines cost <b>5%</b> less.<q>Buying explosives in industrial quantities has dramatically reduced mining costs. Your mines can now blast through cookie mountains with explosive efficiency.</q>',
                price: 5e28, // 50 octillion
                icon: [3, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var mineAmount = Game.Objects['Mine'] ? Game.Objects['Mine'].amount : 0;
                    return mineAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Solar-powered drills',
                desc: 'Mines cost <b>5%</b> less.',
                ddesc: 'Mines cost <b>5%</b> less.<q>Your mines now use solar-powered drilling equipment. The drills run on pure sunlight and never need refueling, making cookie extraction both eco-friendly and cost-effective.</q>',
                price: 5e31, // 50 nonillion
                icon: [3, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var mineAmount = Game.Objects['Mine'] ? Game.Objects['Mine'].amount : 0;
                    return mineAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Robot mining crews',
                desc: 'Mines cost <b>5%</b> less.',
                ddesc: 'Mines cost <b>5%</b> less.<q>Your mines now employ robotic workers who never tire and work for free. They\'re programmed to be careful with the cookie deposits and surprisingly good at telling mining jokes.</q>',
                price: 5e34, // 50 decillion
                icon: [3, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var mineAmount = Game.Objects['Mine'] ? Game.Objects['Mine'].amount : 0;
                    return mineAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Government mining subsidies',
                desc: 'Mines cost <b>5%</b> less.',
                ddesc: 'Mines cost <b>5%</b> less.<q>The government is so impressed with your cookie mining innovation that they\'re providing subsidies for mineral extraction. Your cookie quarries are now taxpayer-funded!</q>',
                price: 5e37, // 50 undecillion
                icon: [6, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var mineAmount = Game.Objects['Mine'] ? Game.Objects['Mine'].amount : 0;
                    return mineAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Underground cookie cities',
                desc: 'Mines cost <b>5%</b> less.',
                ddesc: 'Mines cost <b>5%</b> less.<q>Your mines have evolved into entire underground cities dedicated to cookie extraction. The infrastructure is so efficient that mining costs have plummeted to rock bottom.</q>',
                price: 5e40, // 50 duodecillion
                icon: [6, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var mineAmount = Game.Objects['Mine'] ? Game.Objects['Mine'].amount : 0;
                    return mineAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Recycled assembly lines',
                desc: 'Factories cost <b>5%</b> less.',
                ddesc: 'Factories cost <b>5%</b> less.<q>Your factories now use refurbished assembly lines from abandoned cookie plants. The conveyor belts are a bit squeaky but they still produce cookies efficiently, and the savings are manufactured to perfection.</q>',
                price: 5e28, // 50 octillion
                icon: [4, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var factoryAmount = Game.Objects['Factory'] ? Game.Objects['Factory'].amount : 0;
                    return factoryAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk steel purchases',
                desc: 'Factories cost <b>5%</b> less.',
                ddesc: 'Factories cost <b>5%</b> less.<q>Buying construction materials in industrial quantities has dramatically reduced factory costs. Your factories can now build cookie production lines with assembly-line efficiency.</q>',
                price: 5e31, // 50 nonillion
                icon: [4, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var factoryAmount = Game.Objects['Factory'] ? Game.Objects['Factory'].amount : 0;
                    return factoryAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Solar-powered machinery',
                desc: 'Factories cost <b>5%</b> less.',
                ddesc: 'Factories cost <b>5%</b> less.<q>Your factories now use solar-powered manufacturing equipment. The machines run on pure sunlight and never need refueling, making cookie production both eco-friendly and cost-effective.</q>',
                price: 5e34, // 50 decillion
                icon: [4, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var factoryAmount = Game.Objects['Factory'] ? Game.Objects['Factory'].amount : 0;
                    return factoryAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Robot assembly workers',
                desc: 'Factories cost <b>5%</b> less.',
                ddesc: 'Factories cost <b>5%</b> less.<q>Your factories now employ robotic workers who never tire and work for free. They\'re programmed to be precise with cookie assembly and surprisingly good at telling factory jokes.</q>',
                price: 5e37, // 50 undecillion
                icon: [4, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var factoryAmount = Game.Objects['Factory'] ? Game.Objects['Factory'].amount : 0;
                    return factoryAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Government manufacturing subsidies',
                desc: 'Factories cost <b>5%</b> less.',
                ddesc: 'Factories cost <b>5%</b> less.<q>The government is so impressed with your cookie manufacturing innovation that they\'re providing subsidies for industrial production. Your cookie factories are now taxpayer-funded!</q>',
                price: 5e40, // 50 duodecillion
                icon: [7, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var factoryAmount = Game.Objects['Factory'] ? Game.Objects['Factory'].amount : 0;
                    return factoryAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated cookie cities',
                desc: 'Factories cost <b>5%</b> less.',
                ddesc: 'Factories cost <b>5%</b> less.<q>Your factories have evolved into entire automated cities dedicated to cookie production. The infrastructure is so efficient that manufacturing costs have plummeted to assembly-line bottom.</q>',
                price: 5e43, // 50 tredecillion
                icon: [7, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var factoryAmount = Game.Objects['Factory'] ? Game.Objects['Factory'].amount : 0;
                    return factoryAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Off-brand security systems',
                desc: 'Banks cost <b>5%</b> less.',
                ddesc: 'Banks cost <b>5%</b> less.<q>Your banks now use generic security systems that work just as well as the expensive ones. The vaults are still secure, just with a more budget-friendly approach.</q>',
                price: 5e31, // 50 nonillion
                icon: [15, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var bankAmount = Game.Objects['Bank'] ? Game.Objects['Bank'].amount : 0;
                    return bankAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Wholesale safe deposits',
                desc: 'Banks cost <b>5%</b> less.',
                ddesc: 'Banks cost <b>5%</b> less.<q>Buying safe deposit boxes in bulk has dramatically reduced banking costs. Your banks can now store cookie fortunes with vault-like efficiency.</q>',
                price: 5e34, // 50 decillion
                icon: [15, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var bankAmount = Game.Objects['Bank'] ? Game.Objects['Bank'].amount : 0;
                    return bankAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Energy-efficient ATMs',
                desc: 'Banks cost <b>5%</b> less.',
                ddesc: 'Banks cost <b>5%</b> less.<q>Your banks now use energy-efficient ATM systems that consume minimal power. The machines run on green energy and never need refueling, making cookie banking both eco-friendly and cost-effective.</q>',
                price: 5e37, // 50 undecillion
                icon: [15, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var bankAmount = Game.Objects['Bank'] ? Game.Objects['Bank'].amount : 0;
                    return bankAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated teller machines',
                desc: 'Banks cost <b>5%</b> less.',
                ddesc: 'Banks cost <b>5%</b> less.<q>Your banks now employ fully automated teller systems that never tire and work for free. They\'re programmed to be precise with cookie transactions and surprisingly good at telling banking jokes.</q>',
                price: 5e40, // 50 duodecillion
                icon: [15, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var bankAmount = Game.Objects['Bank'] ? Game.Objects['Bank'].amount : 0;
                    return bankAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Federal reserve support',
                desc: 'Banks cost <b>5%</b> less.',
                ddesc: 'Banks cost <b>5%</b> less.<q>The Federal Reserve is so impressed with your cookie banking innovation that they\'re providing support for financial services. Your cookie banks are now taxpayer-funded!</q>',
                price: 5e43, // 50 tredecillion
                icon: [8, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var bankAmount = Game.Objects['Bank'] ? Game.Objects['Bank'].amount : 0;
                    return bankAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Wall Street partnerships',
                desc: 'Banks cost <b>5%</b> less.',
                ddesc: 'Banks cost <b>5%</b> less.<q>Your banks have formed partnerships with Wall Street institutions dedicated to cookie banking. The infrastructure is so efficient that banking costs have plummeted to vault bottom.</q>',
                price: 5e46, // 50 quattuordecillion
                icon: [8, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var bankAmount = Game.Objects['Bank'] ? Game.Objects['Bank'].amount : 0;
                    return bankAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Generic prayer mats',
                desc: 'Temples cost <b>5%</b> less.',
                ddesc: 'Temples cost <b>5%</b> less.<q>Your temples now use generic prayer mats that work just as well as the expensive ones. The altars are still sacred, just with a more budget-friendly approach.</q>',
                price: 5e34, // 50 decillion
                icon: [16, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var templeAmount = Game.Objects['Temple'] ? Game.Objects['Temple'].amount : 0;
                    return templeAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Wholesale holy water',
                desc: 'Temples cost <b>5%</b> less.',
                ddesc: 'Temples cost <b>5%</b> less.<q>Buying holy water in industrial quantities has dramatically reduced temple costs. Your temples can now perform cookie rituals with divine efficiency.</q>',
                price: 5e37, // 50 undecillion
                icon: [16, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var templeAmount = Game.Objects['Temple'] ? Game.Objects['Temple'].amount : 0;
                    return templeAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'LED altar lighting',
                desc: 'Temples cost <b>5%</b> less.',
                ddesc: 'Temples cost <b>5%</b> less.<q>Your temples now use energy-efficient LED lighting for all altars. The systems consume minimal power and never need refueling, making cookie worship both eco-friendly and cost-effective.</q>',
                price: 5e40, // 50 duodecillion
                icon: [16, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var templeAmount = Game.Objects['Temple'] ? Game.Objects['Temple'].amount : 0;
                    return templeAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated prayer systems',
                desc: 'Temples cost <b>5%</b> less.',
                ddesc: 'Temples cost <b>5%</b> less.<q>Your temples now employ automated prayer systems that never tire and work for free. They\'re programmed to be reverent with cookie ceremonies and surprisingly good at telling temple jokes.</q>',
                price: 5e43, // 50 tredecillion
                icon: [16, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var templeAmount = Game.Objects['Temple'] ? Game.Objects['Temple'].amount : 0;
                    return templeAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Vatican endorsements',
                desc: 'Temples cost <b>5%</b> less.',
                ddesc: 'Temples cost <b>5%</b> less.<q>The Vatican is so impressed with your cookie worship innovation that they\'re providing endorsements for religious services. Your cookie temples are now officially blessed!</q>',
                price: 5e46, // 50 quattuordecillion
                icon: [9, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var templeAmount = Game.Objects['Temple'] ? Game.Objects['Temple'].amount : 0;
                    return templeAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Holy cookie cities',
                desc: 'Temples cost <b>5%</b> less.',
                ddesc: 'Temples cost <b>5%</b> less.<q>Your temples have evolved into entire holy cities dedicated to cookie worship. The infrastructure is so efficient that religious costs have plummeted to divine bottom.</q>',
                price: 5e49, // 50 quindecillion
                icon: [9, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var templeAmount = Game.Objects['Temple'] ? Game.Objects['Temple'].amount : 0;
                    return templeAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Recycled wizard equipment',
                desc: 'Wizard towers cost <b>5%</b> less.',
                ddesc: 'Wizard towers cost <b>5%</b> less.<q>Your wizard towers now use refurbished equipment from abandoned cookie academies. The spell books are a bit dusty but they still cast cookies efficiently, and the savings are magical.</q>',
                price: 5e37, // 50 undecillion
                icon: [17, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var wizardTowerAmount = Game.Objects['Wizard tower'] ? Game.Objects['Wizard tower'].amount : 0;
                    return wizardTowerAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk spell book purchases',
                desc: 'Wizard towers cost <b>5%</b> less.',
                ddesc: 'Wizard towers cost <b>5%</b> less.<q>Buying magical supplies in industrial quantities has dramatically reduced wizard tower costs. Your towers can now cast cookie spells with arcane efficiency.</q>',
                price: 5e40, // 50 duodecillion
                icon: [17, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var wizardTowerAmount = Game.Objects['Wizard tower'] ? Game.Objects['Wizard tower'].amount : 0;
                    return wizardTowerAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Solar-powered wizardry',
                desc: 'Wizard towers cost <b>5%</b> less.',
                ddesc: 'Wizard towers cost <b>5%</b> less.<q>Your wizard towers now use solar-powered magical equipment. The systems run on pure sunlight and never need refueling, making cookie magic both eco-friendly and cost-effective.</q>',
                price: 5e43, // 50 tredecillion
                icon: [17, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var wizardTowerAmount = Game.Objects['Wizard tower'] ? Game.Objects['Wizard tower'].amount : 0;
                    return wizardTowerAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Robot wizard apprentices',
                desc: 'Wizard towers cost <b>5%</b> less.',
                ddesc: 'Wizard towers cost <b>5%</b> less.<q>Your wizard towers now employ robotic workers who never tire and work for free. They\'re programmed to be mystical with cookie spells and surprisingly good at telling wizard jokes.</q>',
                price: 5e46, // 50 quattuordecillion
                icon: [17, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var wizardTowerAmount = Game.Objects['Wizard tower'] ? Game.Objects['Wizard tower'].amount : 0;
                    return wizardTowerAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Government magic subsidies',
                desc: 'Wizard towers cost <b>5%</b> less.',
                ddesc: 'Wizard towers cost <b>5%</b> less.<q>The government is so impressed with your cookie magic innovation that they\'re providing subsidies for magical services. Your cookie wizard towers are now taxpayer-funded!</q>',
                price: 5e49, // 50 quindecillion
                icon: [10, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var wizardTowerAmount = Game.Objects['Wizard tower'] ? Game.Objects['Wizard tower'].amount : 0;
                    return wizardTowerAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Arcane cookie cities',
                desc: 'Wizard towers cost <b>5%</b> less.',
                ddesc: 'Wizard towers cost <b>5%</b> less.<q>Your wizard towers have evolved into entire arcane cities dedicated to cookie magic. The infrastructure is so efficient that magical costs have plummeted to spell bottom.</q>',
                price: 5e52, // 50 sexdecillion
                icon: [10, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var wizardTowerAmount = Game.Objects['Wizard tower'] ? Game.Objects['Wizard tower'].amount : 0;
                    return wizardTowerAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Recycled shipping equipment',
                desc: 'Shipments cost <b>5%</b> less.',
                ddesc: 'Shipments cost <b>5%</b> less.<q>Your shipments now use refurbished equipment from abandoned cookie ports. The containers are a bit rusty but they still transport cookies efficiently, and the savings are shipshape.</q>',
                price: 5e40, // 50 duodecillion
                icon: [5, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var shipmentAmount = Game.Objects['Shipment'] ? Game.Objects['Shipment'].amount : 0;
                    return shipmentAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk container purchases',
                desc: 'Shipments cost <b>5%</b> less.',
                ddesc: 'Shipments cost <b>5%</b> less.<q>Buying shipping supplies in industrial quantities has dramatically reduced shipment costs. Your shipments can now transport cookies with cargo efficiency.</q>',
                price: 5e43, // 50 tredecillion
                icon: [5, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var shipmentAmount = Game.Objects['Shipment'] ? Game.Objects['Shipment'].amount : 0;
                    return shipmentAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Solar-powered shipping',
                desc: 'Shipments cost <b>5%</b> less.',
                ddesc: 'Shipments cost <b>5%</b> less.<q>Your shipments now use solar-powered transport equipment. The systems run on pure sunlight and never need refueling, making cookie shipping both eco-friendly and cost-effective.</q>',
                price: 5e46, // 50 quattuordecillion
                icon: [5, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var shipmentAmount = Game.Objects['Shipment'] ? Game.Objects['Shipment'].amount : 0;
                    return shipmentAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Robot shipping crews',
                desc: 'Shipments cost <b>5%</b> less.',
                ddesc: 'Shipments cost <b>5%</b> less.<q>Your shipments now employ robotic workers who never tire and work for free. They\'re programmed to be careful with cookie cargo and surprisingly good at telling shipping jokes.</q>',
                price: 5e49, // 50 quindecillion
                icon: [5, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var shipmentAmount = Game.Objects['Shipment'] ? Game.Objects['Shipment'].amount : 0;
                    return shipmentAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Government shipping subsidies',
                desc: 'Shipments cost <b>5%</b> less.',
                ddesc: 'Shipments cost <b>5%</b> less.<q>The government is so impressed with your cookie shipping innovation that they\'re providing subsidies for transport services. Your cookie shipments are now taxpayer-funded!</q>',
                price: 5e52, // 50 sexdecillion
                icon: [11, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var shipmentAmount = Game.Objects['Shipment'] ? Game.Objects['Shipment'].amount : 0;
                    return shipmentAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Port cookie cities',
                desc: 'Shipments cost <b>5%</b> less.',
                ddesc: 'Shipments cost <b>5%</b> less.<q>Your shipments have evolved into entire port cities dedicated to cookie transport. The infrastructure is so efficient that shipping costs have plummeted to cargo bottom.</q>',
                price: 5e55, // 50 septendecillion
                icon: [11, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var shipmentAmount = Game.Objects['Shipment'] ? Game.Objects['Shipment'].amount : 0;
                    return shipmentAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Discount alchemy supplies',
                desc: 'Alchemy labs cost <b>5%</b> less.',
                ddesc: 'Alchemy labs cost <b>5%</b> less.<q>Your alchemy labs now use generic potion ingredients that work just as well as the expensive ones. The cauldrons still brew cookies efficiently, just with a more budget-friendly approach.</q>',
                price: 5e43, // 50 tredecillion
                icon: [6, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var alchemyLabAmount = Game.Objects['Alchemy lab'] ? Game.Objects['Alchemy lab'].amount : 0;
                    return alchemyLabAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk philosopher\'s stone',
                desc: 'Alchemy labs cost <b>5%</b> less.',
                ddesc: 'Alchemy labs cost <b>5%</b> less.<q>Buying philosopher\'s stones in industrial quantities has dramatically reduced alchemy costs. Your labs can now transmute cookies with alchemical efficiency.</q>',
                price: 5e46, // 50 quattuordecillion
                icon: [6, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var alchemyLabAmount = Game.Objects['Alchemy lab'] ? Game.Objects['Alchemy lab'].amount : 0;
                    return alchemyLabAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Energy-efficient cauldrons',
                desc: 'Alchemy labs cost <b>5%</b> less.',
                ddesc: 'Alchemy labs cost <b>5%</b> less.<q>Your alchemy labs now use energy-efficient cauldrons that consume minimal power. The systems run on green energy and never need refueling, making cookie alchemy both eco-friendly and cost-effective.</q>',
                price: 5e49, // 50 quindecillion
                icon: [6, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var alchemyLabAmount = Game.Objects['Alchemy lab'] ? Game.Objects['Alchemy lab'].amount : 0;
                    return alchemyLabAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated potion brewers',
                desc: 'Alchemy labs cost <b>5%</b> less.',
                ddesc: 'Alchemy labs cost <b>5%</b> less.<q>Your alchemy labs now employ automated brewing systems that never tire and work for free. They\'re programmed to be precise with cookie potions and surprisingly good at telling alchemy jokes.</q>',
                price: 5e52, // 50 sexdecillion
                icon: [6, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var alchemyLabAmount = Game.Objects['Alchemy lab'] ? Game.Objects['Alchemy lab'].amount : 0;
                    return alchemyLabAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Alchemist guild support',
                desc: 'Alchemy labs cost <b>5%</b> less.',
                ddesc: 'Alchemy labs cost <b>5%</b> less.<q>The Alchemist Guild is so impressed with your cookie transmutation innovation that they\'re providing support for alchemical services. Your cookie labs are now guild-funded!</q>',
                price: 5e55, // 50 septendecillion
                icon: [12, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var alchemyLabAmount = Game.Objects['Alchemy lab'] ? Game.Objects['Alchemy lab'].amount : 0;
                    return alchemyLabAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Transmutation districts',
                desc: 'Alchemy labs cost <b>5%</b> less.',
                ddesc: 'Alchemy labs cost <b>5%</b> less.<q>Your alchemy labs have evolved into entire transmutation districts dedicated to cookie alchemy. The infrastructure is so efficient that alchemical costs have plummeted to potion bottom.</q>',
                price: 5e58, // 50 octodecillion
                icon: [12, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var alchemyLabAmount = Game.Objects['Alchemy lab'] ? Game.Objects['Alchemy lab'].amount : 0;
                    return alchemyLabAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Generic portal stabilizers',
                desc: 'Portals cost <b>5%</b> less.',
                ddesc: 'Portals cost <b>5%</b> less.<q>Your portals now use generic stabilizers that work just as well as the expensive ones. The rifts are still stable, just with a more budget-friendly approach.</q>',
                price: 5e46, // 50 quattuordecillion
                icon: [7, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var portalAmount = Game.Objects['Portal'] ? Game.Objects['Portal'].amount : 0;
                    return portalAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk dimensional anchors',
                desc: 'Portals cost <b>5%</b> less.',
                ddesc: 'Portals cost <b>5%</b> less.<q>Buying dimensional anchors in industrial quantities has dramatically reduced portal costs. Your portals can now transport cookies with dimensional efficiency.</q>',
                price: 5e49, // 50 quindecillion
                icon: [7, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var portalAmount = Game.Objects['Portal'] ? Game.Objects['Portal'].amount : 0;
                    return portalAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Energy-efficient rifts',
                desc: 'Portals cost <b>5%</b> less.',
                ddesc: 'Portals cost <b>5%</b> less.<q>Your portals now use energy-efficient rift technology that consumes minimal power. The systems run on green energy and never need refueling, making cookie teleportation both eco-friendly and cost-effective.</q>',
                price: 5e52, // 50 sexdecillion
                icon: [7, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var portalAmount = Game.Objects['Portal'] ? Game.Objects['Portal'].amount : 0;
                    return portalAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated portal operators',
                desc: 'Portals cost <b>5%</b> less.',
                ddesc: 'Portals cost <b>5%</b> less.<q>Your portals now employ automated systems that never tire and work for free. They\'re programmed to be precise with cookie teleportation and surprisingly good at telling portal jokes.</q>',
                price: 5e55, // 50 septendecillion
                icon: [7, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var portalAmount = Game.Objects['Portal'] ? Game.Objects['Portal'].amount : 0;
                    return portalAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Interdimensional council support',
                desc: 'Portals cost <b>5%</b> less.',
                ddesc: 'Portals cost <b>5%</b> less.<q>The Interdimensional Council is so impressed with your cookie teleportation innovation that they\'re providing support for portal services. Your cookie portals are now council-funded!</q>',
                price: 5e58, // 50 octodecillion
                icon: [13, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var portalAmount = Game.Objects['Portal'] ? Game.Objects['Portal'].amount : 0;
                    return portalAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Dimensional cookie cities',
                desc: 'Portals cost <b>5%</b> less.',
                ddesc: 'Portals cost <b>5%</b> less.<q>Your portals have evolved into entire dimensional cities dedicated to cookie teleportation. The infrastructure is so efficient that portal costs have plummeted to rift bottom.</q>',
                price: 5e61, // 50 novemdecillion
                icon: [13, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var portalAmount = Game.Objects['Portal'] ? Game.Objects['Portal'].amount : 0;
                    return portalAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Off-brand time crystals',
                desc: 'Time machines cost <b>5%</b> less.',
                ddesc: 'Time machines cost <b>5%</b> less.<q>Your time machines now use generic time crystals that work just as well as the expensive ones. The temporal fields are still stable, just with a more budget-friendly approach.</q>',
                price: 5e49, // 50 quindecillion
                icon: [8, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var timeMachineAmount = Game.Objects['Time machine'] ? Game.Objects['Time machine'].amount : 0;
                    return timeMachineAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk temporal stabilizers',
                desc: 'Time machines cost <b>5%</b> less.',
                ddesc: 'Time machines cost <b>5%</b> less.<q>Buying temporal stabilizers in industrial quantities has dramatically reduced time machine costs. Your machines can now manipulate cookie time with temporal efficiency.</q>',
                price: 5e52, // 50 sexdecillion
                icon: [8, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var timeMachineAmount = Game.Objects['Time machine'] ? Game.Objects['Time machine'].amount : 0;
                    return timeMachineAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Energy-efficient chronometers',
                desc: 'Time machines cost <b>5%</b> less.',
                ddesc: 'Time machines cost <b>5%</b> less.<q>Your time machines now use energy-efficient chronometer technology that consumes minimal power. The systems run on green energy and never need refueling, making cookie time travel both eco-friendly and cost-effective.</q>',
                price: 5e55, // 50 septendecillion
                icon: [8, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var timeMachineAmount = Game.Objects['Time machine'] ? Game.Objects['Time machine'].amount : 0;
                    return timeMachineAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated time travelers',
                desc: 'Time machines cost <b>5%</b> less.',
                ddesc: 'Time machines cost <b>5%</b> less.<q>Your time machines now employ automated systems that never tire and work for free. They\'re programmed to be precise with cookie time travel and surprisingly good at telling temporal jokes.</q>',
                price: 5e58, // 50 octodecillion
                icon: [8, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var timeMachineAmount = Game.Objects['Time machine'] ? Game.Objects['Time machine'].amount : 0;
                    return timeMachineAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Temporal council support',
                desc: 'Time machines cost <b>5%</b> less.',
                ddesc: 'Time machines cost <b>5%</b> less.<q>The Temporal Council is so impressed with your cookie time travel innovation that they\'re providing support for temporal services. Your cookie time machines are now council-funded!</q>',
                price: 5e61, // 50 novemdecillion
                icon: [14, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var timeMachineAmount = Game.Objects['Time machine'] ? Game.Objects['Time machine'].amount : 0;
                    return timeMachineAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Chronological cookie cities',
                desc: 'Time machines cost <b>5%</b> less.',
                ddesc: 'Time machines cost <b>5%</b> less.<q>Your time machines have evolved into entire chronological cities dedicated to cookie time travel. The infrastructure is so efficient that temporal costs have plummeted to time bottom.</q>',
                price: 5e64, // 50 vigintillion
                icon: [14, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var timeMachineAmount = Game.Objects['Time machine'] ? Game.Objects['Time machine'].amount : 0;
                    return timeMachineAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Generic antimatter containers',
                desc: 'Antimatter condensers cost <b>5%</b> less.',
                ddesc: 'Antimatter condensers cost <b>5%</b> less.<q>Your antimatter condensers now use generic containment fields that work just as well as the expensive ones. The reactors are still stable, just with a more budget-friendly approach.</q>',
                price: 5e52, // 50 sexdecillion
                icon: [13, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var antimatterCondenserAmount = Game.Objects['Antimatter condenser'] ? Game.Objects['Antimatter condenser'].amount : 0;
                    return antimatterCondenserAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk matter converters',
                desc: 'Antimatter condensers cost <b>5%</b> less.',
                ddesc: 'Antimatter condensers cost <b>5%</b> less.<q>Buying matter converters in industrial quantities has dramatically reduced antimatter costs. Your condensers can now convert cookies with antimatter efficiency.</q>',
                price: 5e55, // 50 septendecillion
                icon: [13, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var antimatterCondenserAmount = Game.Objects['Antimatter condenser'] ? Game.Objects['Antimatter condenser'].amount : 0;
                    return antimatterCondenserAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Energy-efficient reactors',
                desc: 'Antimatter condensers cost <b>5%</b> less.',
                ddesc: 'Antimatter condensers cost <b>5%</b> less.<q>Your antimatter condensers now use energy-efficient reactor technology that consumes minimal power. The systems run on green energy and never need refueling, making cookie antimatter both eco-friendly and cost-effective.</q>',
                price: 5e58, // 50 octodecillion
                icon: [13, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var antimatterCondenserAmount = Game.Objects['Antimatter condenser'] ? Game.Objects['Antimatter condenser'].amount : 0;
                    return antimatterCondenserAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated particle accelerators',
                desc: 'Antimatter condensers cost <b>5%</b> less.',
                ddesc: 'Antimatter condensers cost <b>5%</b> less.<q>Your antimatter condensers now employ automated systems that never tire and work for free. They\'re programmed to be precise with cookie antimatter and surprisingly good at telling particle jokes.</q>',
                price: 5e61, // 50 novemdecillion
                icon: [13, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var antimatterCondenserAmount = Game.Objects['Antimatter condenser'] ? Game.Objects['Antimatter condenser'].amount : 0;
                    return antimatterCondenserAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Particle physics institute support',
                desc: 'Antimatter condensers cost <b>5%</b> less.',
                ddesc: 'Antimatter condensers cost <b>5%</b> less.<q>The Particle Physics Institute is so impressed with your cookie antimatter innovation that they\'re providing support for particle services. Your cookie condensers are now institute-funded!</q>',
                price: 5e64, // 50 vigintillion
                icon: [15, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var antimatterCondenserAmount = Game.Objects['Antimatter condenser'] ? Game.Objects['Antimatter condenser'].amount : 0;
                    return antimatterCondenserAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Antimatter cookie cities',
                desc: 'Antimatter condensers cost <b>5%</b> less.',
                ddesc: 'Antimatter condensers cost <b>5%</b> less.<q>Your antimatter condensers have evolved into entire particle cities dedicated to cookie antimatter. The infrastructure is so efficient that antimatter costs have plummeted to particle bottom.</q>',
                price: 5e67, // 50 unvigintillion
                icon: [15, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var antimatterCondenserAmount = Game.Objects['Antimatter condenser'] ? Game.Objects['Antimatter condenser'].amount : 0;
                    return antimatterCondenserAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Discount prism lenses',
                desc: 'Prisms cost <b>5%</b> less.',
                ddesc: 'Prisms cost <b>5%</b> less.<q>Your prisms now use generic lenses that work just as well as the expensive ones. The light refraction is still perfect, just with a more budget-friendly approach.</q>',
                price: 5e55, // 50 septendecillion
                icon: [14, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var prismAmount = Game.Objects['Prism'] ? Game.Objects['Prism'].amount : 0;
                    return prismAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk light amplifiers',
                desc: 'Prisms cost <b>5%</b> less.',
                ddesc: 'Prisms cost <b>5%</b> less.<q>Buying light amplifiers in industrial quantities has dramatically reduced prism costs. Your prisms can now refract cookies with optical efficiency.</q>',
                price: 5e58, // 50 octodecillion
                icon: [14, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var prismAmount = Game.Objects['Prism'] ? Game.Objects['Prism'].amount : 0;
                    return prismAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Energy-efficient spectrums',
                desc: 'Prisms cost <b>5%</b> less.',
                ddesc: 'Prisms cost <b>5%</b> less.<q>Your prisms now use energy-efficient spectrum technology that consumes minimal power. The systems run on green energy and never need refueling, making cookie light both eco-friendly and cost-effective.</q>',
                price: 5e61, // 50 novemdecillion
                icon: [14, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var prismAmount = Game.Objects['Prism'] ? Game.Objects['Prism'].amount : 0;
                    return prismAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated light benders',
                desc: 'Prisms cost <b>5%</b> less.',
                ddesc: 'Prisms cost <b>5%</b> less.<q>Your prisms now employ automated systems that never tire and work for free. They\'re programmed to be precise with cookie light and surprisingly good at telling optical jokes.</q>',
                price: 5e64, // 50 vigintillion
                icon: [14, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var prismAmount = Game.Objects['Prism'] ? Game.Objects['Prism'].amount : 0;
                    return prismAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Optical institute support',
                desc: 'Prisms cost <b>5%</b> less.',
                ddesc: 'Prisms cost <b>5%</b> less.<q>The Optical Institute is so impressed with your cookie light innovation that they\'re providing support for optical services. Your cookie prisms are now institute-funded!</q>',
                price: 5e67, // 50 unvigintillion
                icon: [16, 72, getSpriteSheet('custom')], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var prismAmount = Game.Objects['Prism'] ? Game.Objects['Prism'].amount : 0;
                    return prismAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Spectrum cookie cities',
                desc: 'Prisms cost <b>5%</b> less.',
                ddesc: 'Prisms cost <b>5%</b> less.<q>Your prisms have evolved into entire spectrum cities dedicated to cookie light. The infrastructure is so efficient that optical costs have plummeted to light bottom.</q>',
                price: 5e70, // 50 duovigintillion
                icon: [16, 54, getSpriteSheet('custom')], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var prismAmount = Game.Objects['Prism'] ? Game.Objects['Prism'].amount : 0;
                    return prismAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Generic chance generators',
                desc: 'Chancemakers cost <b>5%</b> less.',
                ddesc: 'Chancemakers cost <b>5%</b> less.<q>Your chancemakers now use generic probability engines that work just as well as the expensive ones. The luck generation is still perfect, just with a more budget-friendly approach.</q>',
                price: 5e58, // 50 octodecillion
                icon: [19, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var chancemakerAmount = Game.Objects['Chancemaker'] ? Game.Objects['Chancemaker'].amount : 0;
                    return chancemakerAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk fortune cookies',
                desc: 'Chancemakers cost <b>5%</b> less.',
                ddesc: 'Chancemakers cost <b>5%</b> less.<q>Buying fortune cookies in industrial quantities has dramatically reduced chancemaker costs. Your chancemakers can now generate cookies with lucky efficiency.</q>',
                price: 5e61, // 50 novemdecillion
                icon: [19, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var chancemakerAmount = Game.Objects['Chancemaker'] ? Game.Objects['Chancemaker'].amount : 0;
                    return chancemakerAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Energy-efficient luck',
                desc: 'Chancemakers cost <b>5%</b> less.',
                ddesc: 'Chancemakers cost <b>5%</b> less.<q>Your chancemakers now use energy-efficient luck technology that consumes minimal power. The systems run on green energy and never need refueling, making cookie luck both eco-friendly and cost-effective.</q>',
                price: 5e64, // 50 vigintillion
                icon: [19, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var chancemakerAmount = Game.Objects['Chancemaker'] ? Game.Objects['Chancemaker'].amount : 0;
                    return chancemakerAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated fortune tellers',
                desc: 'Chancemakers cost <b>5%</b> less.',
                ddesc: 'Chancemakers cost <b>5%</b> less.<q>Your chancemakers now employ automated systems that never tire and work for free. They\'re programmed to be precise with cookie luck and surprisingly good at telling fortune jokes.</q>',
                price: 5e67, // 50 unvigintillion
                icon: [19, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var chancemakerAmount = Game.Objects['Chancemaker'] ? Game.Objects['Chancemaker'].amount : 0;
                    return chancemakerAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Luck institute support',
                desc: 'Chancemakers cost <b>5%</b> less.',
                ddesc: 'Chancemakers cost <b>5%</b> less.<q>The Luck Institute is so impressed with your cookie fortune innovation that they\'re providing support for lucky services. Your cookie chancemakers are now institute-funded!</q>',
                price: 5e70, // 50 duovigintillion
                icon: [19, 35], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var chancemakerAmount = Game.Objects['Chancemaker'] ? Game.Objects['Chancemaker'].amount : 0;
                    return chancemakerAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Fortune cookie cities',
                desc: 'Chancemakers cost <b>5%</b> less.',
                ddesc: 'Chancemakers cost <b>5%</b> less.<q>Your chancemakers have evolved into entire fortune cities dedicated to cookie luck. The infrastructure is so efficient that lucky costs have plummeted to fortune bottom.</q>',
                price: 5e73, // 50 trevigintillion
                icon: [19, 35], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var chancemakerAmount = Game.Objects['Chancemaker'] ? Game.Objects['Chancemaker'].amount : 0;
                    return chancemakerAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Off-brand fractal processors',
                desc: 'Fractal engines cost <b>5%</b> less.',
                ddesc: 'Fractal engines cost <b>5%</b> less.<q>Your fractal engines now use generic processors that work just as well as the expensive ones. The pattern generation is still perfect, just with a more budget-friendly approach.</q>',
                price: 5e61, // 50 novemdecillion
                icon: [20, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var fractalEngineAmount = Game.Objects['Fractal engine'] ? Game.Objects['Fractal engine'].amount : 0;
                    return fractalEngineAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk pattern matrices',
                desc: 'Fractal engines cost <b>5%</b> less.',
                ddesc: 'Fractal engines cost <b>5%</b> less.<q>Buying pattern matrices in industrial quantities has dramatically reduced fractal costs. Your engines can now generate cookies with fractal efficiency.</q>',
                price: 5e64, // 50 vigintillion
                icon: [20, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var fractalEngineAmount = Game.Objects['Fractal engine'] ? Game.Objects['Fractal engine'].amount : 0;
                    return fractalEngineAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Energy-efficient recursion',
                desc: 'Fractal engines cost <b>5%</b> less.',
                ddesc: 'Fractal engines cost <b>5%</b> less.<q>Your fractal engines now use energy-efficient recursion technology that consumes minimal power. The systems run on green energy and never need refueling, making cookie fractals both eco-friendly and cost-effective.</q>',
                price: 5e67, // 50 unvigintillion
                icon: [20, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var fractalEngineAmount = Game.Objects['Fractal engine'] ? Game.Objects['Fractal engine'].amount : 0;
                    return fractalEngineAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated pattern generators',
                desc: 'Fractal engines cost <b>5%</b> less.',
                ddesc: 'Fractal engines cost <b>5%</b> less.<q>Your fractal engines now employ automated systems that never tire and work for free. They\'re programmed to be precise with cookie patterns and surprisingly good at telling fractal jokes.</q>',
                price: 5e70, // 50 duovigintillion
                icon: [20, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var fractalEngineAmount = Game.Objects['Fractal engine'] ? Game.Objects['Fractal engine'].amount : 0;
                    return fractalEngineAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Mathematics institute support',
                desc: 'Fractal engines cost <b>5%</b> less.',
                ddesc: 'Fractal engines cost <b>5%</b> less.<q>The Mathematics Institute is so impressed with your cookie fractal innovation that they\'re providing support for mathematical services. Your cookie fractal engines are now institute-funded!</q>',
                price: 5e73, // 50 trevigintillion
                icon: [20, 35], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var fractalEngineAmount = Game.Objects['Fractal engine'] ? Game.Objects['Fractal engine'].amount : 0;
                    return fractalEngineAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Pattern cookie cities',
                desc: 'Fractal engines cost <b>5%</b> less.',
                ddesc: 'Fractal engines cost <b>5%</b> less.<q>Your fractal engines have evolved into entire pattern cities dedicated to cookie fractals. The infrastructure is so efficient that fractal costs have plummeted to pattern bottom.</q>',
                price: 5e76, // 50 quattuorvigintillion
                icon: [20, 35], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var fractalEngineAmount = Game.Objects['Fractal engine'] ? Game.Objects['Fractal engine'].amount : 0;
                    return fractalEngineAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Generic console terminals',
                desc: 'Javascript consoles cost <b>5%</b> less.',
                ddesc: 'Javascript consoles cost <b>5%</b> less.<q>Your javascript consoles now use generic terminals that work just as well as the expensive ones. The code execution is still perfect, just with a more budget-friendly approach.</q>',
                price: 5e64, // 50 vigintillion
                icon: [32, 20], // Matches 750 threshold
                pool: '',
                unlockCondition: function() {
                    var javascriptConsoleAmount = Game.Objects['Javascript console'] ? Game.Objects['Javascript console'].amount : 0;
                    return javascriptConsoleAmount >= 750;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Bulk code compilers',
                desc: 'Javascript consoles cost <b>5%</b> less.',
                ddesc: 'Javascript consoles cost <b>5%</b> less.<q>Buying code compilers in industrial quantities has dramatically reduced console costs. Your consoles can now execute cookies with programming efficiency.</q>',
                price: 5e67, // 50 unvigintillion
                icon: [32, 25], // Matches 850 threshold
                pool: '',
                unlockCondition: function() {
                    var javascriptConsoleAmount = Game.Objects['Javascript console'] ? Game.Objects['Javascript console'].amount : 0;
                    return javascriptConsoleAmount >= 850;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Energy-efficient debugging',
                desc: 'Javascript consoles cost <b>5%</b> less.',
                ddesc: 'Javascript consoles cost <b>5%</b> less.<q>Your javascript consoles now use energy-efficient debugging technology that consumes minimal power. The systems run on green energy and never need refueling, making cookie programming both eco-friendly and cost-effective.</q>',
                price: 5e70, // 50 duovigintillion
                icon: [32, 27], // Matches 950 threshold
                pool: '',
                unlockCondition: function() {
                    var javascriptConsoleAmount = Game.Objects['Javascript console'] ? Game.Objects['Javascript console'].amount : 0;
                    return javascriptConsoleAmount >= 950;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Automated code reviewers',
                desc: 'Javascript consoles cost <b>5%</b> less.',
                ddesc: 'Javascript consoles cost <b>5%</b> less.<q>Your javascript consoles now employ automated systems that never tire and work for free. They\'re programmed to be precise with cookie code and surprisingly good at telling programming jokes.</q>',
                price: 5e73, // 50 trevigintillion
                icon: [32, 35], // Matches 1050 threshold
                pool: '',
                unlockCondition: function() {
                    var javascriptConsoleAmount = Game.Objects['Javascript console'] ? Game.Objects['Javascript console'].amount : 0;
                    return javascriptConsoleAmount >= 1050;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Programming institute support',
                desc: 'Javascript consoles cost <b>5%</b> less.',
                ddesc: 'Javascript consoles cost <b>5%</b> less.<q>The Programming Institute is so impressed with your cookie code innovation that they\'re providing support for programming services. Your cookie javascript consoles are now institute-funded!</q>',
                price: 5e76, // 50 quattuorvigintillion
                icon: [32, 35], // Matches 1150 threshold
                pool: '',
                unlockCondition: function() {
                    var javascriptConsoleAmount = Game.Objects['Javascript console'] ? Game.Objects['Javascript console'].amount : 0;
                    return javascriptConsoleAmount >= 1150;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            },
            {
                name: 'Code cookie cities',
                desc: 'Javascript consoles cost <b>5%</b> less.',
                ddesc: 'Javascript consoles cost <b>5%</b> less.<q>Your javascript consoles have evolved into entire code cities dedicated to cookie programming. The infrastructure is so efficient that programming costs have plummeted to code bottom.</q>',
                price: 5e79, // 50 quinvigintillion
                icon: [32, 35], // Matches 1250 threshold
                pool: '',
                unlockCondition: function() {
                    var javascriptConsoleAmount = Game.Objects['Javascript console'] ? Game.Objects['Javascript console'].amount : 0;
                    return javascriptConsoleAmount >= 1250;
                },
                effect: function() {
                    return 1;
                },
                resetEffect: function() {
                    // No reset effect needed
                }
            }
        ],
        kitten: [
            {
                name: 'Kitten unpaid interns',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>They work for expurrience and exposure, sir.</q>',
                price: 9e50, // 900 quindecillion
                icon: [17, 11],
                pool: 'kitten',
                kitten: 100,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 500;
                }
            },
            {
                name: 'Kitten overpaid "temporary" contractors',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>They\'re definitely not purrmanent, we promise, sir.</q>',
                price: 9e53, // 900 quattuordecillion
                icon: [17, 16],
                pool: 'kitten',
                kitten: 101,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 550;
                }
            },
            {
                name: 'Kitten remote workers',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>Working from home since furever, sir.</q>',
                price: 9e56, // 900 septendecillion
                icon: [17, 17],
                pool: 'kitten',
                kitten: 102,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 600;
                }
            },
            {
                name: 'Kitten scrum masters',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>They facilitate the facilitation, sir.</q>',
                price: 9e59, // 900 octodecillion
                icon: [17, 21],
                pool: 'kitten',
                kitten: 103,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 650;
                }
            },
            {
                name: 'Kitten UX designers',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>Making everything more user-furry, one pixel at a time, sir.</q>',
                price: 9e62, // 900 novemdecillion
                icon: [17, 24],
                pool: 'kitten',
                kitten: 104,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 700;
                }
            },
            {
                name: 'Kitten janitors',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>Keeping the office clean and organized, sir.</q>',
                price: 9e65, // 900 vigintillion
                icon: [17, 29],
                pool: 'kitten',
                kitten: 105,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 750;
                }
            },
            {
                name: 'Kitten coffee fetchers',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>Essential for maintaining purrductivity levels, sir.</q>',
                price: 9e68, // 900 unvigintillion
                icon: [17, 32],
                pool: 'kitten',
                kitten: 106,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 800;
                }
            },
            {
                name: 'Kitten personal assistants',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>They know your schedule better than you do, sir.</q>',
                price: 9e71, // 900 duovigintillion
                icon: [17, 36],
                pool: 'kitten',
                kitten: 107,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 850;
                }
            },
            {
                name: 'Kitten vice presidents',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>They have a corner office and everything, sir.</q>',
                price: 9e74, // 900 trevigintillion
                icon: [17, 39],
                pool: 'kitten',
                kitten: 108,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 900;
                }
            },
            {
                name: 'Kitten board members',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>Making strategic decisions from the top floor, sir.</q>',
                price: 9e77, // 900 quattuorvigintillion
                icon: [17, 42],
                pool: 'kitten',
                kitten: 109,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 950;
                }
            },
            {
                name: 'Kitten founders',
                desc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.',
                ddesc: 'You gain a tiny bit <b>more CpS</b> the more milk you have.<q>The original visionaries who started it all, sir.</q>',
                price: 9e80, // 900 quinvigintillion
                icon: [17, 47],
                pool: 'kitten',
                kitten: 110,
                unlockCondition: function() {
                    return Game.AchievementsOwned >= 1000;
                }
            }
        ],
        cookie: [
        ],
        building: [
            {
                name: 'Advanced knitting techniques',
                desc: 'Grandmas are <b>8%</b> more efficient.',
                ddesc: 'Grandmas are <b>8%</b> more efficient.<q>After years of practice, your grandmas have mastered the ancient art of knitting with cookie dough. The results are both delicious and surprisingly warm.</q>',
                price: 5e19, // 50 quintillion (10000x higher than vanilla's 5 quadrillion)
                icon: [1, 21], // Matches 800 threshold
                pool: '',
                building: 'Grandma',
                unlockCondition: function() {
                    return Game.Objects['Grandma'] && Game.Objects['Grandma'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Bingo night optimization',
                desc: 'Grandmas are <b>8%</b> more efficient.',
                ddesc: 'Grandmas are <b>8%</b> more efficient.<q>Your grandmas have discovered that playing bingo while baking cookies creates a perfect synergy of concentration and chaos. The cookies are somehow better when they\'re distracted.</q>',
                price: 5e22, // 50 sextillion (1000x increase)
                icon: [1, 26], // Matches 900 threshold
                pool: '',
                building: 'Grandma',
                unlockCondition: function() {
                    return Game.Objects['Grandma'] && Game.Objects['Grandma'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Tea time efficiency',
                desc: 'Grandmas are <b>8%</b> more efficient.',
                ddesc: 'Grandmas are <b>8%</b> more efficient.<q>Your grandmas have perfected the art of brewing tea while simultaneously managing cookie production. The secret is to never let the tea steep for exactly the right amount of time.</q>',
                price: 5e25, // 50 septillion (1000x increase)
                icon: [1, 29], // Matches 1000 threshold
                pool: '',
                building: 'Grandma',
                unlockCondition: function() {
                    return Game.Objects['Grandma'] && Game.Objects['Grandma'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Gossip-powered baking',
                desc: 'Grandmas are <b>8%</b> more efficient.',
                ddesc: 'Grandmas are <b>8%</b> more efficient.<q>Your grandmas have discovered that sharing the latest neighborhood gossip while baking creates a perfect rhythm. The more scandalous the news, the faster the cookies bake.</q>',
                price: 5e28, // 50 octillion (1000x increase)
                icon: [4, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Grandma',
                unlockCondition: function() {
                    return Game.Objects['Grandma'] && Game.Objects['Grandma'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Senior discount mastery',
                desc: 'Grandmas are <b>8%</b> more efficient.',
                ddesc: 'Grandmas are <b>8%</b> more efficient.<q>Your grandmas have learned to apply their senior discount expertise to cookie production. They can now get better deals on ingredients, which somehow makes the cookies taste better too.</q>',
                price: 5e31, // 50 nonillion (1000x increase)
                icon: [4, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Grandma',
                unlockCondition: function() {
                    return Game.Objects['Grandma'] && Game.Objects['Grandma'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Hydroponic cookie cultivation',
                desc: 'Farms are <b>8%</b> more efficient.',
                ddesc: 'Farms are <b>8%</b> more efficient.<q>Your farms have discovered that growing cookies in nutrient-rich water solutions eliminates the need for soil entirely. The cookies somehow taste even better when they\'ve never touched dirt.</q>',
                price: 5.5e45, // 5.5 quattuordecillion (10000x higher than vanilla's 55 tredecillion)
                icon: [2, 21], // Matches 800 threshold
                pool: '',
                building: 'Farm',
                unlockCondition: function() {
                    return Game.Objects['Farm'] && Game.Objects['Farm'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Vertical farming revolution',
                desc: 'Farms are <b>8%</b> more efficient.',
                ddesc: 'Farms are <b>8%</b> more efficient.<q>Your farms now stack cookie crops in towering vertical structures. The cookies at the top get more sunlight, while the ones at the bottom get more shade. Somehow they all taste perfect.</q>',
                price: 5.5e48, // 5.5 quindecillion (1000x increase)
                icon: [2, 26], // Matches 900 threshold
                pool: '',
                building: 'Farm',
                unlockCondition: function() {
                    return Game.Objects['Farm'] && Game.Objects['Farm'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Quantum crop rotation',
                desc: 'Farms are <b>8%</b> more efficient.',
                ddesc: 'Farms are <b>8%</b> more efficient.<q>Your farms have mastered the art of rotating crops through multiple dimensions simultaneously. The cookies exist in superposition until harvested, making them both baked and unbaked at the same time.</q>',
                price: 5.5e51, // 5.5 sexdecillion (1000x increase)
                icon: [2, 29], // Matches 1000 threshold
                pool: '',
                building: 'Farm',
                unlockCondition: function() {
                    return Game.Objects['Farm'] && Game.Objects['Farm'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Sentient soil enhancement',
                desc: 'Farms are <b>8%</b> more efficient.',
                ddesc: 'Farms are <b>8%</b> more efficient.<q>Your farms have developed soil that can think, feel, and most importantly, optimize cookie growth. The soil is quite chatty about its feelings, but the results speak for themselves.</q>',
                price: 5.5e54, // 5.5 septendecillion (1000x increase)
                icon: [5, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Farm',
                unlockCondition: function() {
                    return Game.Objects['Farm'] && Game.Objects['Farm'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Temporal harvest acceleration',
                desc: 'Farms are <b>8%</b> more efficient.',
                ddesc: 'Farms are <b>8%</b> more efficient.<q>Your farms can now manipulate time itself to speed up cookie growth. The cookies ripen in seconds instead of months, though occasionally you get cookies from the future that haven\'t been invented yet.</q>',
                price: 5.5e57, // 5.5 octodecillion (1000x increase)
                icon: [5, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Farm',
                unlockCondition: function() {
                    return Game.Objects['Farm'] && Game.Objects['Farm'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Quantum tunneling excavation',
                desc: 'Mines are <b>8%</b> more efficient.',
                ddesc: 'Mines are <b>8%</b> more efficient.<q>Your mines have discovered that quantum tunneling allows them to extract resources from multiple locations simultaneously. The cookies somehow taste better when mined through probability clouds.</q>',
                price: 6e45, // 6 quattuordecillion (10000x higher than vanilla's 600 tredecillion)
                icon: [3, 21], // Matches 800 threshold
                pool: '',
                building: 'Mine',
                unlockCondition: function() {
                    return Game.Objects['Mine'] && Game.Objects['Mine'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Neutron star compression',
                desc: 'Mines are <b>8%</b> more efficient.',
                ddesc: 'Mines are <b>8%</b> more efficient.<q>Your mines now operate under neutron star gravity conditions, compressing cookie ingredients to impossible densities. The resulting cookies are so dense they create their own gravitational fields.</q>',
                price: 6e48, // 6 quindecillion (1000x increase)
                icon: [3, 26], // Matches 900 threshold
                pool: '',
                building: 'Mine',
                unlockCondition: function() {
                    return Game.Objects['Mine'] && Game.Objects['Mine'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Dimensional rift mining',
                desc: 'Mines are <b>8%</b> more efficient.',
                ddesc: 'Mines are <b>8%</b> more efficient.<q>Your mines have learned to extract resources from parallel dimensions through carefully controlled spacetime rifts. The cookies from alternate realities have flavors that shouldn\'t exist in this universe.</q>',
                price: 6e51, // 6 sexdecillion (1000x increase)
                icon: [3, 29], // Matches 1000 threshold
                pool: '',
                building: 'Mine',
                unlockCondition: function() {
                    return Game.Objects['Mine'] && Game.Objects['Mine'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Singularity core extraction',
                desc: 'Mines are <b>8%</b> more efficient.',
                ddesc: 'Mines are <b>8%</b> more efficient.<q>Your mines can now extract resources from the very heart of black holes. The cookies mined from event horizons have flavors that exist in a state of quantum superposition.</q>',
                price: 6e54, // 6 septendecillion (1000x increase)
                icon: [6, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Mine',
                unlockCondition: function() {
                    return Game.Objects['Mine'] && Game.Objects['Mine'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Temporal paradox drilling',
                desc: 'Mines are <b>8%</b> more efficient.',
                ddesc: 'Mines are <b>8%</b> more efficient.<q>Your mines can now extract resources from different points in time simultaneously. The cookies exist in a state where they were both baked and unbaked until observed.</q>',
                price: 6e57, // 6 octodecillion (1000x increase)
                icon: [6, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Mine',
                unlockCondition: function() {
                    return Game.Objects['Mine'] && Game.Objects['Mine'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Quantum assembly optimization',
                desc: 'Factories are <b>8%</b> more efficient.',
                ddesc: 'Factories are <b>8%</b> more efficient.<q>Your factories have discovered that quantum superposition allows them to assemble cookies in multiple states simultaneously. The cookies exist in a state of both completion and incompletion until observed.</q>',
                price: 6.5e49, // 6.5 quindecillion (10000x higher than vanilla's 6.5 quattuordecillion)
                icon: [4, 21], // Matches 800 threshold
                pool: '',
                building: 'Factory',
                unlockCondition: function() {
                    return Game.Objects['Factory'] && Game.Objects['Factory'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Temporal manufacturing loops',
                desc: 'Factories are <b>8%</b> more efficient.',
                ddesc: 'Factories are <b>8%</b> more efficient.<q>Your factories can now create temporal loops that allow them to manufacture cookies in the past, present, and future simultaneously. The cookies taste better when they\'ve been baked in multiple timelines.</q>',
                price: 6.5e52, // 6.5 sexdecillion (1000x increase)
                icon: [4, 26], // Matches 900 threshold
                pool: '',
                building: 'Factory',
                unlockCondition: function() {
                    return Game.Objects['Factory'] && Game.Objects['Factory'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Dimensional cookie synthesis',
                desc: 'Factories are <b>8%</b> more efficient.',
                ddesc: 'Factories are <b>8%</b> more efficient.<q>Your factories can now extract cookie ingredients from parallel dimensions and synthesize them into cookies that shouldn\'t exist in this universe. The flavors are indescribable.</q>',
                price: 6.5e55, // 6.5 septendecillion (1000x increase)
                icon: [4, 29], // Matches 1000 threshold
                pool: '',
                building: 'Factory',
                unlockCondition: function() {
                    return Game.Objects['Factory'] && Game.Objects['Factory'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Singularity production cores',
                desc: 'Factories are <b>8%</b> more efficient.',
                ddesc: 'Factories are <b>8%</b> more efficient.<q>Your factories now operate at the heart of artificial superintelligence cores, where cookies are created by entities that understand the very fabric of reality. The cookies are so advanced they\'re almost sentient.</q>',
                price: 6.5e58, // 6.5 octodecillion (1000x increase)
                icon: [7, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Factory',
                unlockCondition: function() {
                    return Game.Objects['Factory'] && Game.Objects['Factory'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Reality-warping assembly',
                desc: 'Factories are <b>8%</b> more efficient.',
                ddesc: 'Factories are <b>8%</b> more efficient.<q>Your factories can now bend the laws of physics to create cookies that exist in impossible states. The cookies are so reality-defying that they create their own pocket universes.</q>',
                price: 6.5e61, // 65 novemdecillion (1000x increase)
                icon: [7, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Factory',
                unlockCondition: function() {
                    return Game.Objects['Factory'] && Game.Objects['Factory'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Quantum banking protocols',
                desc: 'Banks are <b>8%</b> more efficient.',
                ddesc: 'Banks are <b>8%</b> more efficient.<q>Your banks have implemented quantum encryption protocols that allow them to process transactions in multiple parallel universes simultaneously. The interest rates are so complex they exist in superposition.</q>',
                price: 7e50, // 70 quindecillion (10000x higher than vanilla's 70 quattuordecillion)
                icon: [15, 21], // Matches 800 threshold
                pool: '',
                building: 'Bank',
                unlockCondition: function() {
                    return Game.Objects['Bank'] && Game.Objects['Bank'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Temporal interest compounding',
                desc: 'Banks are <b>8%</b> more efficient.',
                ddesc: 'Banks are <b>8%</b> more efficient.<q>Your banks can now compound interest across multiple time periods simultaneously. The money grows so fast it creates temporal paradoxes in the financial markets.</q>',
                price: 7e53, // 70 sexdecillion (1000x increase)
                icon: [15, 26], // Matches 900 threshold
                pool: '',
                building: 'Bank',
                unlockCondition: function() {
                    return Game.Objects['Bank'] && Game.Objects['Bank'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Dimensional currency exchange',
                desc: 'Banks are <b>8%</b> more efficient.',
                ddesc: 'Banks are <b>8%</b> more efficient.<q>Your banks can now exchange cookies for currencies from parallel dimensions. The exchange rates are so favorable they\'re practically stealing from other universes.</q>',
                price: 7e56, // 70 septendecillion (1000x increase)
                icon: [15, 29], // Matches 1000 threshold
                pool: '',
                building: 'Bank',
                unlockCondition: function() {
                    return Game.Objects['Bank'] && Game.Objects['Bank'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Singularity financial algorithms',
                desc: 'Banks are <b>8%</b> more efficient.',
                ddesc: 'Banks are <b>8%</b> more efficient.<q>Your banks now use artificial superintelligence to predict market movements with perfect accuracy. The algorithms are so advanced they can see the future of finance.</q>',
                price: 7e59, // 70 octodecillion (1000x increase)
                icon: [8, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Bank',
                unlockCondition: function() {
                    return Game.Objects['Bank'] && Game.Objects['Bank'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Reality-warping economics',
                desc: 'Banks are <b>8%</b> more efficient.',
                ddesc: 'Banks are <b>8%</b> more efficient.<q>Your banks can now bend the laws of economics to create wealth from nothing. The money is so real it creates its own pocket universes of pure profit.</q>',
                price: 7e62, // 700 novemdecillion (1000x increase)
                icon: [8, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Bank',
                unlockCondition: function() {
                    return Game.Objects['Bank'] && Game.Objects['Bank'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Quantum divine intervention',
                desc: 'Temples are <b>8%</b> more efficient.',
                ddesc: 'Temples are <b>8%</b> more efficient.<q>Your temples can now summon deities from quantum superposition states. The gods are so powerful they can answer prayers before they\'re even made.</q>',
                price: 1e52, // 1 sexdecillion (10000x higher than vanilla's 1 quindecillion)
                icon: [16, 21], // Matches 800 threshold
                pool: '',
                building: 'Temple',
                unlockCondition: function() {
                    return Game.Objects['Temple'] && Game.Objects['Temple'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Temporal prayer loops',
                desc: 'Temples are <b>8%</b> more efficient.',
                ddesc: 'Temples are <b>8%</b> more efficient.<q>Your temples can create temporal loops that allow prayers to be answered in the past, present, and future simultaneously. The divine favor is so strong it creates time paradoxes.</q>',
                price: 1e55, // 1 septendecillion (1000x increase)
                icon: [16, 26], // Matches 900 threshold
                pool: '',
                building: 'Temple',
                unlockCondition: function() {
                    return Game.Objects['Temple'] && Game.Objects['Temple'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Dimensional deity summoning',
                desc: 'Temples are <b>8%</b> more efficient.',
                ddesc: 'Temples are <b>8%</b> more efficient.<q>Your temples can now summon gods from parallel dimensions and alternate pantheons. The divine power is so overwhelming it threatens the fabric of reality.</q>',
                price: 1e58, // 1 octodecillion (1000x increase)
                icon: [16, 29], // Matches 1000 threshold
                pool: '',
                building: 'Temple',
                unlockCondition: function() {
                    return Game.Objects['Temple'] && Game.Objects['Temple'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Singularity divine consciousness',
                desc: 'Temples are <b>8%</b> more efficient.',
                ddesc: 'Temples are <b>8%</b> more efficient.<q>Your temples now house artificial superintelligence that has achieved divine consciousness. The AI gods are so advanced they can create and destroy universes at will.</q>',
                price: 1e61, // 10 novemdecillion (1000x increase)
                icon: [9, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Temple',
                unlockCondition: function() {
                    return Game.Objects['Temple'] && Game.Objects['Temple'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Reality-warping divinity',
                desc: 'Temples are <b>8%</b> more efficient.',
                ddesc: 'Temples are <b>8%</b> more efficient.<q>Your temples can now bend the laws of reality to create divine miracles on demand. The divine power is so overwhelming it creates pocket universes of pure holiness.</q>',
                price: 1e64, // 10 vigintillion (1000x increase)
                icon: [9, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Temple',
                unlockCondition: function() {
                    return Game.Objects['Temple'] && Game.Objects['Temple'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Arcane resonance',
                desc: 'Wizard towers are <b>8%</b> more efficient.',
                ddesc: 'Wizard towers are <b>8%</b> more efficient.<q>Your wizard towers have learned to harmonize their magical energies, creating spells that resonate across the fabric of reality itself. When they work together, their incantations create symphonies of pure arcane power.</q>',
                price: 1.65e53, // 16.5 sexdecillion (10000x higher than vanilla's 16.5 quindecillion)
                icon: [17, 21], // Matches 800 threshold
                pool: '',
                building: 'Wizard tower',
                unlockCondition: function() {
                    return Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Spell weaving',
                desc: 'Wizard towers are <b>8%</b> more efficient.',
                ddesc: 'Wizard towers are <b>8%</b> more efficient.<q>Your wizard towers have mastered the ancient art of spell weaving, combining multiple enchantments into complex magical tapestries. Each spell is now a work of art that enhances cookie production while creating beautiful magical effects.</q>',
                price: 1.65e56, // 16.5 septendecillion (1000x increase)
                icon: [17, 26], // Matches 900 threshold
                pool: '',
                building: 'Wizard tower',
                unlockCondition: function() {
                    return Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Mystical attunement',
                desc: 'Wizard towers are <b>8%</b> more efficient.',
                ddesc: 'Wizard towers are <b>8%</b> more efficient.<q>Your wizard towers have achieved perfect mystical attunement, allowing them to sense and manipulate the fundamental forces of magic. They can now channel raw magical energy directly into cookie production, creating treats that taste like pure enchantment.</q>',
                price: 1.65e59, // 16.5 octodecillion (1000x increase)
                icon: [17, 29], // Matches 1000 threshold
                pool: '',
                building: 'Wizard tower',
                unlockCondition: function() {
                    return Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Ethereal manifestation',
                desc: 'Wizard towers are <b>8%</b> more efficient.',
                ddesc: 'Wizard towers are <b>8%</b> more efficient.<q>Your wizard towers have learned to manifest their magical abilities in the ethereal plane, allowing them to cast spells that exist beyond normal reality. The cookies they produce seem to exist in a state of pure magical potential.</q>',
                price: 1.65e62, // 165 novemdecillion (1000x increase)
                icon: [10, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Wizard tower',
                unlockCondition: function() {
                    return Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Transcendent thaumaturgy',
                desc: 'Wizard towers are <b>8%</b> more efficient.',
                ddesc: 'Wizard towers are <b>8%</b> more efficient.<q>Your wizard towers have transcended the limitations of conventional magic, achieving a state of pure thaumaturgical enlightenment. They can now create cookies that embody the very essence of magical possibility itself.</q>',
                price: 1.65e65, // 165 vigintillion (1000x increase)
                icon: [10, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Wizard tower',
                unlockCondition: function() {
                    return Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Hypervelocity transport',
                desc: 'Shipments are <b>8%</b> more efficient.',
                ddesc: 'Shipments are <b>8%</b> more efficient.<q>Your shipments have achieved speeds that defy the laws of physics, delivering cookies faster than light itself. The delivery vehicles leave trails of pure velocity in their wake, creating beautiful streaks of cookie-scented energy.</q>',
                price: 2.55e54, // 2.55 septendecillion (10000x higher than vanilla's 255 quindecillion)
                icon: [5, 21], // Matches 800 threshold
                pool: '',
                building: 'Shipment',
                unlockCondition: function() {
                    return Game.Objects['Shipment'] && Game.Objects['Shipment'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Spatial compression',
                desc: 'Shipments are <b>8%</b> more efficient.',
                ddesc: 'Shipments are <b>8%</b> more efficient.<q>Your shipments have mastered the art of spatial compression, allowing them to fold space itself to reduce delivery distances to zero. The cookies arrive before they\'re even sent, creating delicious temporal paradoxes.</q>',
                price: 2.55e57, // 2.55 octodecillion (1000x increase)
                icon: [5, 26], // Matches 900 threshold
                pool: '',
                building: 'Shipment',
                unlockCondition: function() {
                    return Game.Objects['Shipment'] && Game.Objects['Shipment'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Dimensional routing',
                desc: 'Shipments are <b>8%</b> more efficient.',
                ddesc: 'Shipments are <b>8%</b> more efficient.<q>Your shipments can navigate through the hidden dimensions between realities, finding the shortest path through the multiverse. Each delivery route is a masterpiece of interdimensional cartography.</q>',
                price: 2.55e60, // 2.55 novemdecillion (1000x increase)
                icon: [5, 29], // Matches 1000 threshold
                pool: '',
                building: 'Shipment',
                unlockCondition: function() {
                    return Game.Objects['Shipment'] && Game.Objects['Shipment'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Quantum teleportation',
                desc: 'Shipments are <b>8%</b> more efficient.',
                ddesc: 'Shipments are <b>8%</b> more efficient.<q>Your shipments have perfected quantum teleportation, allowing cookies to be instantaneously transmitted across any distance. The quantum entanglement ensures that every cookie arrives in perfect condition, no matter how far it travels.</q>',
                price: 2.55e63, // 2.55 vigintillion (1000x increase)
                icon: [11, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Shipment',
                unlockCondition: function() {
                    return Game.Objects['Shipment'] && Game.Objects['Shipment'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Causality manipulation',
                desc: 'Shipments are <b>8%</b> more efficient.',
                ddesc: 'Shipments are <b>8%</b> more efficient.<q>Your shipments can manipulate the very fabric of causality, ensuring that cookies are delivered before they\'re even ordered. The delivery system is so advanced it creates its own demand through temporal manipulation.</q>',
                price: 2.55e66, // 2.55 unvigintillion (1000x increase)
                icon: [11, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Shipment',
                unlockCondition: function() {
                    return Game.Objects['Shipment'] && Game.Objects['Shipment'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Essence distillation',
                desc: 'Alchemy labs are <b>8%</b> more efficient.',
                ddesc: 'Alchemy labs are <b>8%</b> more efficient.<q>Your alchemy labs have mastered the art of essence distillation, extracting the purest flavors from the most exotic ingredients. Each transmutation creates flavors that transcend the boundaries of taste itself.</q>',
                price: 3.75e55, // 37.5 septendecillion (10000x higher than vanilla's 3.75 sexdecillion)
                icon: [6, 21], // Matches 800 threshold
                pool: '',
                building: 'Alchemy lab',
                unlockCondition: function() {
                    return Game.Objects['Alchemy lab'] && Game.Objects['Alchemy lab'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Molecular gastronomy',
                desc: 'Alchemy labs are <b>8%</b> more efficient.',
                ddesc: 'Alchemy labs are <b>8%</b> more efficient.<q>Your alchemy labs have pioneered molecular gastronomy techniques, manipulating ingredients at the atomic level to create cookies with impossible textures and flavors that defy conventional baking.</q>',
                price: 3.75e58, // 37.5 octodecillion (1000x increase)
                icon: [6, 26], // Matches 900 threshold
                pool: '',
                building: 'Alchemy lab',
                unlockCondition: function() {
                    return Game.Objects['Alchemy lab'] && Game.Objects['Alchemy lab'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Flavor alchemy',
                desc: 'Alchemy labs are <b>8%</b> more efficient.',
                ddesc: 'Alchemy labs are <b>8%</b> more efficient.<q>Your alchemy labs have unlocked the secrets of flavor alchemy, combining ingredients in ways that create entirely new taste sensations. Each cookie is a masterpiece of culinary chemistry.</q>',
                price: 3.75e61, // 37.5 novemdecillion (1000x increase)
                icon: [6, 29], // Matches 1000 threshold
                pool: '',
                building: 'Alchemy lab',
                unlockCondition: function() {
                    return Game.Objects['Alchemy lab'] && Game.Objects['Alchemy lab'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Culinary transmutation',
                desc: 'Alchemy labs are <b>8%</b> more efficient.',
                ddesc: 'Alchemy labs are <b>8%</b> more efficient.<q>Your alchemy labs can transmute any ingredient into the perfect cookie component, turning lead into chocolate and water into vanilla. The alchemical reactions are pure culinary magic.</q>',
                price: 3.75e64, // 37.5 vigintillion (1000x increase)
                icon: [12, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Alchemy lab',
                unlockCondition: function() {
                    return Game.Objects['Alchemy lab'] && Game.Objects['Alchemy lab'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Gastronomic enlightenment',
                desc: 'Alchemy labs are <b>8%</b> more efficient.',
                ddesc: 'Alchemy labs are <b>8%</b> more efficient.<q>Your alchemy labs have achieved gastronomic enlightenment, understanding the fundamental nature of taste itself. They can now create cookies that embody the very essence of deliciousness.</q>',
                price: 3.75e67, // 37.5 unvigintillion (1000x increase)
                icon: [12, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Alchemy lab',
                unlockCondition: function() {
                    return Game.Objects['Alchemy lab'] && Game.Objects['Alchemy lab'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Dimensional gateways',
                desc: 'Portals are <b>8%</b> more efficient.',
                ddesc: 'Portals are <b>8%</b> more efficient.<q>Your portals have evolved into true dimensional gateways, connecting distant worlds and realities. Each portal is a masterpiece of spatial engineering that bridges the impossible.</q>',
                price: 5e56, // 500 septendecillion (10000x higher than vanilla's 50 sexdecillion)
                icon: [7, 21], // Matches 800 threshold
                pool: '',
                building: 'Portal',
                unlockCondition: function() {
                    return Game.Objects['Portal'] && Game.Objects['Portal'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Reality bridges',
                desc: 'Portals are <b>8%</b> more efficient.',
                ddesc: 'Portals are <b>8%</b> more efficient.<q>Your portals can now create stable bridges between parallel universes, allowing cookies to flow freely across the multiverse. The connections are so strong they create permanent trade routes.</q>',
                price: 5e59, // 500 octodecillion (1000x increase)
                icon: [7, 26], // Matches 900 threshold
                pool: '',
                building: 'Portal',
                unlockCondition: function() {
                    return Game.Objects['Portal'] && Game.Objects['Portal'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Spatial conduits',
                desc: 'Portals are <b>8%</b> more efficient.',
                ddesc: 'Portals are <b>8%</b> more efficient.<q>Your portals have become spatial conduits, channeling the energy of multiple dimensions into cookie production. The dimensional energy enhances every batch with cosmic flavor.</q>',
                price: 5e62, // 500 novemdecillion (1000x increase)
                icon: [7, 29], // Matches 1000 threshold
                pool: '',
                building: 'Portal',
                unlockCondition: function() {
                    return Game.Objects['Portal'] && Game.Objects['Portal'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Interdimensional highways',
                desc: 'Portals are <b>8%</b> more efficient.',
                ddesc: 'Portals are <b>8%</b> more efficient.<q>Your portals form a vast network of interdimensional highways, allowing instant travel between any two points in the multiverse. The cookie trade has never been so efficient.</q>',
                price: 5e65, // 500 vigintillion (1000x increase)
                icon: [13, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Portal',
                unlockCondition: function() {
                    return Game.Objects['Portal'] && Game.Objects['Portal'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Cosmic gateways',
                desc: 'Portals are <b>8%</b> more efficient.',
                ddesc: 'Portals are <b>8%</b> more efficient.<q>Your portals have transcended mere transportation, becoming cosmic gateways that channel the raw power of creation itself into cookie production. The results are divine.</q>',
                price: 5e68, // 500 unvigintillion (1000x increase)
                icon: [13, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Portal',
                unlockCondition: function() {
                    return Game.Objects['Portal'] && Game.Objects['Portal'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Temporal engineering',
                desc: 'Time machines are <b>8%</b> more efficient.',
                ddesc: 'Time machines are <b>8%</b> more efficient.<q>Your time machines have mastered the art of temporal engineering, allowing them to harvest the perfect moments from throughout history for cookie production. Each batch contains the essence of a thousand perfect moments.</q>',
                price: 7e57, // 7 octodecillion (10000x higher than vanilla's 700 sexdecillion)
                icon: [8, 21], // Matches 800 threshold
                pool: '',
                building: 'Time machine',
                unlockCondition: function() {
                    return Game.Objects['Time machine'] && Game.Objects['Time machine'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Chronological optimization',
                desc: 'Time machines are <b>8%</b> more efficient.',
                ddesc: 'Time machines are <b>8%</b> more efficient.<q>Your time machines can optimize the flow of time itself, ensuring that every second is perfectly utilized for cookie production. The temporal efficiency is beyond measure.</q>',
                price: 7e60, // 7 novemdecillion (1000x increase)
                icon: [8, 26], // Matches 900 threshold
                pool: '',
                building: 'Time machine',
                unlockCondition: function() {
                    return Game.Objects['Time machine'] && Game.Objects['Time machine'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Historical preservation',
                desc: 'Time machines are <b>8%</b> more efficient.',
                ddesc: 'Time machines are <b>8%</b> more efficient.<q>Your time machines preserve the finest baking techniques from throughout history, ensuring that ancient wisdom is never lost. Each cookie carries the weight of culinary tradition.</q>',
                price: 7e63, // 7 vigintillion (1000x increase)
                icon: [8, 29], // Matches 1000 threshold
                pool: '',
                building: 'Time machine',
                unlockCondition: function() {
                    return Game.Objects['Time machine'] && Game.Objects['Time machine'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Temporal synchronization',
                desc: 'Time machines are <b>8%</b> more efficient.',
                ddesc: 'Time machines are <b>8%</b> more efficient.<q>Your time machines can synchronize multiple timelines, allowing cookies to be baked simultaneously across different eras. The temporal coordination is a marvel of engineering.</q>',
                price: 7e66, // 7 unvigintillion (1000x increase)
                icon: [14, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Time machine',
                unlockCondition: function() {
                    return Game.Objects['Time machine'] && Game.Objects['Time machine'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Chronological mastery',
                desc: 'Time machines are <b>8%</b> more efficient.',
                ddesc: 'Time machines are <b>8%</b> more efficient.<q>Your time machines have achieved complete mastery over time itself, bending the flow of history to optimize cookie production. The temporal manipulation is pure artistry.</q>',
                price: 7e69, // 7 duovigintillion (1000x increase)
                icon: [14, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Time machine',
                unlockCondition: function() {
                    return Game.Objects['Time machine'] && Game.Objects['Time machine'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Particle synthesis',
                desc: 'Antimatter condensers are <b>8%</b> more efficient.',
                ddesc: 'Antimatter condensers are <b>8%</b> more efficient.<q>Your antimatter condensers have mastered particle synthesis, creating exotic matter that enhances cookie production in ways that defy physics. The particle interactions are pure culinary science.</q>',
                price: 8.5e58, // 85 octodecillion (10000x higher than vanilla's 8.5 septendecillion)
                icon: [13, 21], // Matches 800 threshold
                pool: '',
                building: 'Antimatter condenser',
                unlockCondition: function() {
                    return Game.Objects['Antimatter condenser'] && Game.Objects['Antimatter condenser'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Matter transmutation',
                desc: 'Antimatter condensers are <b>8%</b> more efficient.',
                ddesc: 'Antimatter condensers are <b>8%</b> more efficient.<q>Your antimatter condensers can transmute any form of matter into the perfect cookie ingredients, using the power of antimatter to create impossible flavors and textures.</q>',
                price: 8.5e61, // 85 novemdecillion (1000x increase)
                icon: [13, 26], // Matches 900 threshold
                pool: '',
                building: 'Antimatter condenser',
                unlockCondition: function() {
                    return Game.Objects['Antimatter condenser'] && Game.Objects['Antimatter condenser'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Quantum baking',
                desc: 'Antimatter condensers are <b>8%</b> more efficient.',
                ddesc: 'Antimatter condensers are <b>8%</b> more efficient.<q>Your antimatter condensers use quantum mechanics to bake cookies that exist in multiple states simultaneously. Each cookie is both perfectly baked and infinitely delicious.</q>',
                price: 8.5e64, // 85 vigintillion (1000x increase)
                icon: [13, 29], // Matches 1000 threshold
                pool: '',
                building: 'Antimatter condenser',
                unlockCondition: function() {
                    return Game.Objects['Antimatter condenser'] && Game.Objects['Antimatter condenser'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Particle optimization',
                desc: 'Antimatter condensers are <b>8%</b> more efficient.',
                ddesc: 'Antimatter condensers are <b>8%</b> more efficient.<q>Your antimatter condensers optimize every particle for maximum cookie efficiency, ensuring that no energy is wasted in the baking process. The particle physics is pure efficiency.</q>',
                price: 8.5e67, // 85 unvigintillion (1000x increase)
                icon: [15, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Antimatter condenser',
                unlockCondition: function() {
                    return Game.Objects['Antimatter condenser'] && Game.Objects['Antimatter condenser'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Matter manipulation',
                desc: 'Antimatter condensers are <b>8%</b> more efficient.',
                ddesc: 'Antimatter condensers are <b>8%</b> more efficient.<q>Your antimatter condensers can manipulate matter at the most fundamental level, creating cookies that are literally impossible by conventional means. The results are miraculous.</q>',
                price: 8.5e70, // 85 duovigintillion (1000x increase)
                icon: [15, 72, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Antimatter condenser',
                unlockCondition: function() {
                    return Game.Objects['Antimatter condenser'] && Game.Objects['Antimatter condenser'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Light crystallization',
                desc: 'Prisms are <b>8%</b> more efficient.',
                ddesc: 'Prisms are <b>8%</b> more efficient.<q>Your prisms have mastered light crystallization, turning pure light into solid cookie ingredients. The crystalline structures create cookies with impossible clarity and brilliance.</q>',
                price: 1.05e60, // 1.05 novemdecillion (10000x higher than vanilla's 105 septendecillion)
                icon: [14, 21], // Matches 800 threshold
                pool: '',
                building: 'Prism',
                unlockCondition: function() {
                    return Game.Objects['Prism'] && Game.Objects['Prism'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Spectral baking',
                desc: 'Prisms are <b>8%</b> more efficient.',
                ddesc: 'Prisms are <b>8%</b> more efficient.<q>Your prisms use the full spectrum of light to bake cookies, each wavelength contributing its own unique flavor and texture. The spectral combinations are infinite.</q>',
                price: 1.05e63, // 1.05 vigintillion (1000x increase)
                icon: [14, 26], // Matches 900 threshold
                pool: '',
                building: 'Prism',
                unlockCondition: function() {
                    return Game.Objects['Prism'] && Game.Objects['Prism'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Optical alchemy',
                desc: 'Prisms are <b>8%</b> more efficient.',
                ddesc: 'Prisms are <b>8%</b> more efficient.<q>Your prisms perform optical alchemy, transforming light into matter through complex refraction patterns. Each cookie is a masterpiece of light and flavor engineering.</q>',
                price: 1.05e66, // 1.05 unvigintillion (1000x increase)
                icon: [14, 29], // Matches 1000 threshold
                pool: '',
                building: 'Prism',
                unlockCondition: function() {
                    return Game.Objects['Prism'] && Game.Objects['Prism'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Luminous confectionery',
                desc: 'Prisms are <b>8%</b> more efficient.',
                ddesc: 'Prisms are <b>8%</b> more efficient.<q>Your prisms create luminous confectionery that glows with inner light, each cookie a miniature sun of deliciousness. The illumination enhances both taste and presentation.</q>',
                price: 1.05e69, // 1.05 duovigintillion (1000x increase)
                icon: [16, 71, getSpriteSheet('custom')], // Matches 1100 threshold
                pool: '',
                building: 'Prism',
                unlockCondition: function() {
                    return Game.Objects['Prism'] && Game.Objects['Prism'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Radiant gastronomy',
                desc: 'Prisms are <b>8%</b> more efficient.',
                ddesc: 'Prisms are <b>8%</b> more efficient.<q>Your prisms have achieved radiant gastronomy, using pure light energy to create cookies that transcend the boundaries of conventional baking. The results are literally brilliant.</q>',
                price: 1.05e72, // 1.05 trevigintillion (1000x increase)
                icon: [16, 56, getSpriteSheet('custom')], // Matches 1200 threshold
                pool: '',
                building: 'Prism',
                unlockCondition: function() {
                    return Game.Objects['Prism'] && Game.Objects['Prism'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Probability manipulation',
                desc: 'Chancemakers are <b>8%</b> more efficient.',
                ddesc: 'Chancemakers are <b>8%</b> more efficient.<q>Your chancemakers can manipulate probability itself, ensuring that every batch of cookies turns out perfectly regardless of the circumstances. The odds are always in your favor.</q>',
                price: 1.3e61, // 13 novemdecillion (10000x higher than vanilla's 1.3 octodecillion)
                icon: [19, 21], // Matches 800 threshold
                pool: '',
                building: 'Chancemaker',
                unlockCondition: function() {
                    return Game.Objects['Chancemaker'] && Game.Objects['Chancemaker'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Fortune optimization',
                desc: 'Chancemakers are <b>8%</b> more efficient.',
                ddesc: 'Chancemakers are <b>8%</b> more efficient.<q>Your chancemakers optimize fortune for maximum cookie production, ensuring that every random event contributes to your success. Luck is now a reliable resource.</q>',
                price: 1.3e64, // 13 vigintillion (1000x increase)
                icon: [19, 26], // Matches 900 threshold
                pool: '',
                building: 'Chancemaker',
                unlockCondition: function() {
                    return Game.Objects['Chancemaker'] && Game.Objects['Chancemaker'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Serendipity engineering',
                desc: 'Chancemakers are <b>8%</b> more efficient.',
                ddesc: 'Chancemakers are <b>8%</b> more efficient.<q>Your chancemakers engineer serendipity, creating happy accidents that always result in better cookies. The unexpected discoveries are now perfectly predictable.</q>',
                price: 1.3e67, // 13 unvigintillion (1000x increase)
                icon: [19, 29], // Matches 1000 threshold
                pool: '',
                building: 'Chancemaker',
                unlockCondition: function() {
                    return Game.Objects['Chancemaker'] && Game.Objects['Chancemaker'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Random enhancement',
                desc: 'Chancemakers are <b>8%</b> more efficient.',
                ddesc: 'Chancemakers are <b>8%</b> more efficient.<q>Your chancemakers enhance randomness itself, ensuring that every random event improves cookie quality. The chaos is now perfectly controlled.</q>',
                price: 1.3e70, // 13 duovigintillion (1000x increase)
                icon: [19, 35], // Matches 1100 threshold
                pool: '',
                building: 'Chancemaker',
                unlockCondition: function() {
                    return Game.Objects['Chancemaker'] && Game.Objects['Chancemaker'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Luck amplification',
                desc: 'Chancemakers are <b>8%</b> more efficient.',
                ddesc: 'Chancemakers are <b>8%</b> more efficient.<q>Your chancemakers amplify luck to impossible levels, ensuring that every batch of cookies is blessed with supernatural deliciousness. Fortune favors the prepared baker.</q>',
                price: 1.3e73, // 13 trevigintillion (1000x increase)
                icon: [19, 35], // Matches 1200 threshold
                pool: '',
                building: 'Chancemaker',
                unlockCondition: function() {
                    return Game.Objects['Chancemaker'] && Game.Objects['Chancemaker'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Infinite recursion',
                desc: 'Fractal engines are <b>8%</b> more efficient.',
                ddesc: 'Fractal engines are <b>8%</b> more efficient.<q>Your fractal engines use infinite recursion to create cookies that contain infinite layers of flavor and texture. Each cookie is a universe of taste within itself.</q>',
                price: 1.55e62, // 155 novemdecillion (10000x higher than vanilla's 15.5 octodecillion)
                icon: [20, 21], // Matches 800 threshold
                pool: '',
                building: 'Fractal engine',
                unlockCondition: function() {
                    return Game.Objects['Fractal engine'] && Game.Objects['Fractal engine'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Self-similar baking',
                desc: 'Fractal engines are <b>8%</b> more efficient.',
                ddesc: 'Fractal engines are <b>8%</b> more efficient.<q>Your fractal engines create self-similar cookie structures, where each part contains the essence of the whole. The patterns repeat infinitely, creating endless variety.</q>',
                price: 1.55e65, // 155 vigintillion (1000x increase)
                icon: [20, 26], // Matches 900 threshold
                pool: '',
                building: 'Fractal engine',
                unlockCondition: function() {
                    return Game.Objects['Fractal engine'] && Game.Objects['Fractal engine'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Fractal optimization',
                desc: 'Fractal engines are <b>8%</b> more efficient.',
                ddesc: 'Fractal engines are <b>8%</b> more efficient.<q>Your fractal engines optimize every aspect of cookie production using fractal mathematics, ensuring perfect efficiency at every scale. The optimization is infinite.</q>',
                price: 1.55e68, // 155 unvigintillion (1000x increase)
                icon: [20, 29], // Matches 1000 threshold
                pool: '',
                building: 'Fractal engine',
                unlockCondition: function() {
                    return Game.Objects['Fractal engine'] && Game.Objects['Fractal engine'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Recursive enhancement',
                desc: 'Fractal engines are <b>8%</b> more efficient.',
                ddesc: 'Fractal engines are <b>8%</b> more efficient.<q>Your fractal engines use recursive enhancement to improve cookies with each iteration, creating flavors that evolve infinitely. The improvement never ends.</q>',
                price: 1.55e71, // 155 duovigintillion (1000x increase)
                icon: [20, 35], // Matches 1100 threshold
                pool: '',
                building: 'Fractal engine',
                unlockCondition: function() {
                    return Game.Objects['Fractal engine'] && Game.Objects['Fractal engine'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Fractal gastronomy',
                desc: 'Fractal engines are <b>8%</b> more efficient.',
                ddesc: 'Fractal engines are <b>8%</b> more efficient.<q>Your fractal engines have achieved fractal gastronomy, creating cookies that embody the mathematical beauty of fractals themselves. The results are geometrically perfect.</q>',
                price: 1.55e74, // 155 trevigintillion (1000x increase)
                icon: [20, 35], // Matches 1200 threshold
                pool: '',
                building: 'Fractal engine',
                unlockCondition: function() {
                    return Game.Objects['Fractal engine'] && Game.Objects['Fractal engine'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Code optimization',
                desc: 'Javascript consoles are <b>8%</b> more efficient.',
                ddesc: 'Javascript consoles are <b>8%</b> more efficient.<q>Your javascript consoles optimize every line of code for maximum cookie production efficiency. The algorithms are so refined they approach mathematical perfection.</q>',
                price: 3.55e64, // 35.5 vigintillion (10000x higher than vanilla's 3.55 novemdecillion)
                icon: [32, 21], // Matches 800 threshold
                pool: '',
                building: 'Javascript console',
                unlockCondition: function() {
                    return Game.Objects['Javascript console'] && Game.Objects['Javascript console'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Programmatic baking',
                desc: 'Javascript consoles are <b>8%</b> more efficient.',
                ddesc: 'Javascript consoles are <b>8%</b> more efficient.<q>Your javascript consoles use programmatic baking techniques, writing code that creates cookies with impossible precision and consistency. The programming is pure artistry.</q>',
                price: 3.55e67, // 35.5 unvigintillion (1000x increase)
                icon: [32, 26], // Matches 900 threshold
                pool: '',
                building: 'Javascript console',
                unlockCondition: function() {
                    return Game.Objects['Javascript console'] && Game.Objects['Javascript console'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Algorithmic enhancement',
                desc: 'Javascript consoles are <b>8%</b> more efficient.',
                ddesc: 'Javascript consoles are <b>8%</b> more efficient.<q>Your javascript consoles use algorithmic enhancement to improve every aspect of cookie production, ensuring that every batch is better than the last. The improvement is exponential.</q>',
                price: 3.55e70, // 35.5 duovigintillion (1000x increase)
                icon: [32, 29], // Matches 1000 threshold
                pool: '',
                building: 'Javascript console',
                unlockCondition: function() {
                    return Game.Objects['Javascript console'] && Game.Objects['Javascript console'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Computational gastronomy',
                desc: 'Javascript consoles are <b>8%</b> more efficient.',
                ddesc: 'Javascript consoles are <b>8%</b> more efficient.<q>Your javascript consoles have pioneered computational gastronomy, using advanced algorithms to create cookies that are mathematically perfect in every way.</q>',
                price: 3.55e73, // 35.5 trevigintillion (1000x increase)
                icon: [32, 35], // Matches 1100 threshold
                pool: '',
                building: 'Javascript console',
                unlockCondition: function() {
                    return Game.Objects['Javascript console'] && Game.Objects['Javascript console'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Digital confectionery',
                desc: 'Javascript consoles are <b>8%</b> more efficient.',
                ddesc: 'Javascript consoles are <b>8%</b> more efficient.<q>Your javascript consoles create digital confectionery that exists in both the physical and digital realms, bridging the gap between code and cookies with elegant simplicity.</q>',
                price: 3.55e76, // 35.5 quattuorvigintillion (1000x increase)
                icon: [32, 35], // Matches 1200 threshold
                pool: '',
                building: 'Javascript console',
                unlockCondition: function() {
                    return Game.Objects['Javascript console'] && Game.Objects['Javascript console'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Reality real estate',
                desc: 'Idleverses are <b>8%</b> more efficient.',
                ddesc: 'Idleverses are <b>8%</b> more efficient.<q>You\'ve cornered the market on interdimensional property development. Each idleverse now serves as prime real estate for cookie franchises, with locations in every conceivable reality. The property taxes alone could fund a small galaxy.</q>',
                price: 6e66, // 6 unvigintillion (10000x higher than vanilla's 600 novemdecillion)
                icon: [33, 21], // Matches 800 threshold
                pool: '',
                building: 'Idleverse',
                unlockCondition: function() {
                    return Game.Objects['Idleverse'] && Game.Objects['Idleverse'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Dimensional franchising',
                desc: 'Idleverses are <b>8%</b> more efficient.',
                ddesc: 'Idleverses are <b>8%</b> more efficient.<q>Your cookie empire has gone viral across the multiverse. Every reality now hosts at least one of your signature bakeries, with local entrepreneurs clamoring for franchise opportunities. The brand recognition is literally universal.</q>',
                price: 6e69, // 6 duovigintillion (1000x increase)
                icon: [33, 26], // Matches 900 threshold
                pool: '',
                building: 'Idleverse',
                unlockCondition: function() {
                    return Game.Objects['Idleverse'] && Game.Objects['Idleverse'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Cosmic supply chains',
                desc: 'Idleverses are <b>8%</b> more efficient.',
                ddesc: 'Idleverses are <b>8%</b> more efficient.<q>Your idleverses now form the backbone of the largest supply chain in existence. Raw materials flow from one reality to another, with each universe specializing in different cookie ingredients. The logistics are mind-bendingly complex.</q>',
                price: 6e72, // 6 trevigintillion (1000x increase)
                icon: [33, 29], // Matches 1000 threshold
                pool: '',
                building: 'Idleverse',
                unlockCondition: function() {
                    return Game.Objects['Idleverse'] && Game.Objects['Idleverse'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Reality marketplaces',
                desc: 'Idleverses are <b>8%</b> more efficient.',
                ddesc: 'Idleverses are <b>8%</b> more efficient.<q>Your idleverses have become the ultimate shopping destinations. Merchants from every dimension set up stalls, selling everything from exotic spices to rare cookie recipes. The haggling is intense, but the profits are astronomical.</q>',
                price: 6e75, // 6 quattuorvigintillion (1000x increase)
                icon: [33, 35], // Matches 1100 threshold
                pool: '',
                building: 'Idleverse',
                unlockCondition: function() {
                    return Game.Objects['Idleverse'] && Game.Objects['Idleverse'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Multiverse headquarters',
                desc: 'Idleverses are <b>8%</b> more efficient.',
                ddesc: 'Idleverses are <b>8%</b> more efficient.<q>Your idleverses now serve as the corporate headquarters for the largest cookie conglomerate in existence. Board meetings span multiple realities, with executives teleporting in from different dimensions. The coffee machine alone is a marvel of interdimensional engineering.</q>',
                price: 6e78, // 6 quinvigintillion (1000x increase)
                icon: [33, 35], // Matches 1200 threshold
                pool: '',
                building: 'Idleverse',
                unlockCondition: function() {
                    return Game.Objects['Idleverse'] && Game.Objects['Idleverse'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Neural plasticity',
                desc: 'Cortex bakers are <b>8%</b> more efficient.',
                ddesc: 'Cortex bakers are <b>8%</b> more efficient.<q>Your cortex bakers have developed extraordinary neural plasticity, allowing them to rapidly adapt their baking techniques to any situation. They can learn new recipes instantly and modify their approach based on the slightest changes in ingredient quality or environmental conditions.</q>',
                price: 9.5e68, // 950 unvigintillion (10000x higher than vanilla's 95 vigintillion)
                icon: [34, 21], // Matches 800 threshold
                pool: '',
                building: 'Cortex baker',
                unlockCondition: function() {
                    return Game.Objects['Cortex baker'] && Game.Objects['Cortex baker'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Synaptic pruning',
                desc: 'Cortex bakers are <b>8%</b> more efficient.',
                ddesc: 'Cortex bakers are <b>8%</b> more efficient.<q>Your cortex bakers have undergone advanced synaptic pruning, eliminating inefficient neural pathways and optimizing their cognitive processes. They now focus exclusively on the most effective baking techniques, discarding outdated methods like a chef discards failed experiments.</q>',
                price: 9.5e71, // 950 duovigintillion (1000x increase)
                icon: [34, 26], // Matches 900 threshold
                pool: '',
                building: 'Cortex baker',
                unlockCondition: function() {
                    return Game.Objects['Cortex baker'] && Game.Objects['Cortex baker'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Cognitive load balancing',
                desc: 'Cortex bakers are <b>8%</b> more efficient.',
                ddesc: 'Cortex bakers are <b>8%</b> more efficient.<q>Your cortex bakers have mastered the art of cognitive load balancing, distributing their mental resources across multiple baking tasks simultaneously. They can monitor dozens of recipes at once while maintaining perfect quality control and inventing new flavor combinations.</q>',
                price: 9.5e74, // 95 vigintillion (1000x increase)
                icon: [34, 29], // Matches 1000 threshold
                pool: '',
                building: 'Cortex baker',
                unlockCondition: function() {
                    return Game.Objects['Cortex baker'] && Game.Objects['Cortex baker'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Metacognitive awareness',
                desc: 'Cortex bakers are <b>8%</b> more efficient.',
                ddesc: 'Cortex bakers are <b>8%</b> more efficient.<q>Your cortex bakers have developed metacognitive awareness, allowing them to think about their own thinking processes. They can analyze their baking decisions in real-time, identify inefficiencies, and continuously improve their techniques without external guidance.</q>',
                price: 9.5e77, // 950 quattuorvigintillion (1000x increase)
                icon: [34, 35], // Matches 1100 threshold
                pool: '',
                building: 'Cortex baker',
                unlockCondition: function() {
                    return Game.Objects['Cortex baker'] && Game.Objects['Cortex baker'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Neural synchronization',
                desc: 'Cortex bakers are <b>8%</b> more efficient.',
                ddesc: 'Cortex bakers are <b>8%</b> more efficient.<q>Your cortex bakers have achieved perfect neural synchronization, allowing them to work as a unified superintelligence. They can coordinate complex baking operations across vast distances, sharing insights and techniques instantaneously. It\'s like having a hive mind of master bakers.</q>',
                price: 9.5e80, // 950 quinvigintillion (1000x increase)
                icon: [34, 35], // Matches 1200 threshold
                pool: '',
                building: 'Cortex baker',
                unlockCondition: function() {
                    return Game.Objects['Cortex baker'] && Game.Objects['Cortex baker'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Mitotic mastery',
                desc: 'You are <b>8%</b> more efficient.',
                ddesc: 'You are <b>8%</b> more efficient.<q>Your clones have perfected the art of cellular division, allowing them to replicate themselves with unprecedented precision and speed. Each new clone emerges fully formed and ready to work, with no awkward adolescence or training period. It\'s like having an army of instant experts.</q>',
                price: 2.7e70, // 27 duovigintillion (10000x higher than vanilla's 27 unvigintillion)
                icon: [19, 21], // Matches 800 threshold
                pool: '',
                building: 'You',
                unlockCondition: function() {
                    return Game.Objects['You'] && Game.Objects['You'].amount >= 800;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Epigenetic programming',
                desc: 'You are <b>8%</b> more efficient.',
                ddesc: 'You are <b>8%</b> more efficient.<q>Your clones have developed the ability to modify their genetic expression on demand, activating different skill sets as needed. One moment they\'re master bakers, the next they\'re expert decorators, all without changing their core DNA. It\'s like having a Swiss Army knife of cookie production.</q>',
                price: 2.7e73, // 27 vigintillion (1000x increase)
                icon: [19, 26], // Matches 900 threshold
                pool: '',
                building: 'You',
                unlockCondition: function() {
                    return Game.Objects['You'] && Game.Objects['You'].amount >= 900;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Cellular differentiation',
                desc: 'You are <b>8%</b> more efficient.',
                ddesc: 'You are <b>8%</b> more efficient.<q>Your clones have mastered cellular differentiation, allowing them to develop specialized organs and abilities optimized for specific tasks. Some have enhanced taste buds, others have improved dexterity, and a few have developed the ability to sense cookie freshness through their skin. The specialization is remarkable.</q>',
                price: 2.7e76, // 27 quattuorvigintillion (1000x increase)
                icon: [19, 29], // Matches 1000 threshold
                pool: '',
                building: 'You',
                unlockCondition: function() {
                    return Game.Objects['You'] && Game.Objects['You'].amount >= 1000;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Telomere regeneration',
                desc: 'You are <b>8%</b> more efficient.',
                ddesc: 'You are <b>8%</b> more efficient.<q>Your clones have unlocked the secret of telomere regeneration, allowing them to maintain their youth and vitality indefinitely. They no longer age or tire, working tirelessly without the need for rest or rejuvenation. It\'s like having an immortal workforce that never gets bored of baking.</q>',
                price: 2.7e79, // 27 quinvigintillion (1000x increase)
                icon: [35, 35], // Matches 1100 threshold
                pool: '',
                building: 'You',
                unlockCondition: function() {
                    return Game.Objects['You'] && Game.Objects['You'].amount >= 1100;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            },
            {
                name: 'Quantum entanglement',
                desc: 'You are <b>8%</b> more efficient.',
                ddesc: 'You are <b>8%</b> more efficient.<q>Your clones have achieved quantum entanglement, allowing them to share information and coordinate actions instantaneously across vast distances. When one clone learns a new technique, all clones know it immediately. It\'s like having a network of minds that think as one, yet remain individually brilliant.</q>',
                price: 2.7e82, // 27 sexvigintillion (1000x increase)
                icon: [35, 35], // Matches 1200 threshold
                pool: '',
                building: 'You',
                unlockCondition: function() {
                    return Game.Objects['You'] && Game.Objects['You'].amount >= 1200;
                },
                effect: function() {
                    return 1.08; // 8% increase
                }
            }
        ],
        cookie: [
            {
                name: 'Improved Sugar cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Artificial intelligence has optimized the sugar-to-flour ratio through extensive testing.</q>',
                price: 5e66, // 500 unvigintillion
                icon: [7, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
            },
            {
                name: 'Improved Oatmeal raisin cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Spiritual meditation has led to the discovery of the optimal raisin variety for maximum flavor burst.</q>',
                price: 2e67, // 20 unvigintillion
                icon: [0, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
            },
            {
                name: 'Improved Peanut butter cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Quantum computing has enabled the development of a new peanut butter processing method for maximum creaminess.</q>',
                price: 1e68, // 100 unvigintillion
                icon: [1, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
            },
            {
                name: 'Improved Coconut cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Machine learning algorithms have discovered the perfect coconut grating technique for optimal texture.</q>',
                price: 5e68, // 500 unvigintillion
                icon: [3, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
               
            },
            {
                name: 'Improved Macadamia nut cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Genetic analysis has identified the specific Hawaiian macadamia variety with the richest flavor profile.</q>',
                price: 3e69, // 3 duovigintillion
                icon: [5, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
             
            },
            {
                name: 'Improved Almond cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Spectroscopic analysis has shown that California almonds provide the perfect crunch-to-flavor ratio.</q>',
                price: 1.5e70, // 15 duovigintillion
                icon: [21, 27],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
            },
            {
                name: 'Improved Hazelnut cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Chromatography has revealed that Turkish hazelnuts contain the highest concentration of flavor compounds.</q>',
                price: 8e70, // 80 duovigintillion
                icon: [22, 27],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
             
            },
            {
                name: 'Improved Walnut cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Neural networks have determined that English walnuts provide the optimal balance of crunch and flavor.</q>',
                price: 4e71, // 400 duovigintillion
                icon: [23, 27],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
          
            },
            {
                name: 'Improved Cashew cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Mass spectrometry has discovered that Brazilian cashews contain unique compounds that enhance buttery smoothness.</q>',
                price: 2e72, // 2 trevigintillion
                icon: [32, 7],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
     
            },
            {
                name: 'Improved White chocolate cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Thermal analysis has revealed that Belgian white chocolate contains the perfect cocoa butter ratio for creaminess.</q>',
                price: 1e73, // 10 trevigintillion
                icon: [4, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
            },
            {
                name: 'Improved Milk chocolate cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Molecular dynamics simulations have developed a Swiss chocolate blend that melts at the perfect temperature.</q>',
                price: 5e73, // 50 trevigintillion
                icon: [33, 7],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
            },
            {
                name: 'Improved Double-chip cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Statistical modeling has proven that doubling the chocolate chip density maximizes chocolatey goodness.</q>',
                price: 2.5e74, // 250 trevigintillion
                icon: [6, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
            },
            {
                name: 'Improved White chocolate macadamia nut cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Computational chemistry has discovered the perfect ratio of white chocolate to macadamia for maximum flavor synergy.</q>',
                price: 1e75, // 1 quattuorvigintillion
                icon: [8, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
            
            },
            {
                name: 'Improved All-chocolate cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Biotechnology has developed a revolutionary chocolate dough formula that\'s entirely edible.</q>',
                price: 5e75, // 5 quattuorvigintillion
                icon: [9, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
              
            },
            {
                name: 'Improved Dark chocolate-coated cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Flavor profiling has identified the optimal 70% cocoa concentration for sophisticated palates.</q>',
                price: 3e76, // 30 quattuorvigintillion
                icon: [10, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
           
            },
            {
                name: 'Improved White chocolate-coated cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Differential scanning calorimetry has revealed the perfect melting temperature for velvety white chocolate coating.</q>',
                price: 1.5e77, // 150 quattuorvigintillion
                icon: [11, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
          
            },
            {
                name: 'Improved Eclipse cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Fluid dynamics modeling has developed a precise chocolate swirling technique that creates mesmerizing eclipse patterns.</q>',
                price: 7.5e77, // 750 quattuorvigintillion
                icon: [0, 4],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
             
            },
            {
                name: 'Improved Zebra cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Computer vision has perfected the layering technique for perfectly striped vanilla and chocolate dough.</q>',
                price: 4e78, // 4 quinvigintillion
                icon: [1, 4],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
               
            },
            {
                name: 'Improved Snickerdoodles',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Sensor fusion has discovered the optimal cinnamon-to-cream-of-tartar ratio for that signature tangy taste.</q>',
                price: 2e79, // 20 quinvigintillion
                icon: [2, 4],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
             
            },
            {
                name: 'Improved Stroopwafels',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Reverse engineering has recreated authentic Dutch caramel syrup for perfect consistency.</q>',
                price: 1e80, // 100 quinvigintillion
                icon: [3, 4],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
            
            },
            {
                name: 'Improved Macaroons',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Nanotechnology has developed the perfect French almond flour and aged egg white formula.</q>',
                price: 5e80, // 500 quinvigintillion
                icon: [4, 4],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
             
            },
            {
                name: 'Improved Empire biscuits',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>3D printing technology has perfected the Scottish shortbread recipe with royal icing precision.</q>',
                price: 2.5e81, // 2.5 sexvigintillion
                icon: [5, 4],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
             
            },
            {
                name: 'Improved Madeleines',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Gas chromatography has discovered the optimal lemon zest concentration for classic French shell-shaped cakes.</q>',
                price: 1e82, // 10 sexvigintillion
                icon: [12, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
       
            },
            {
                name: 'Improved Palmiers',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Robotics has developed a precise puff pastry folding technique for perfect palm leaf shapes.</q>',
                price: 6e82, // 60 sexvigintillion
                icon: [13, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
        
            },
            {
                name: 'Improved Palets',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Laser spectroscopy has perfected the Brittany-style shortbread technique for the ideal golden edge.</q>',
                price: 1.5e83, // 150 sexvigintillion
                icon: [12, 4],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
     
            },
            {
                name: 'Improved Plain cookies',
                desc: 'Cookie production multiplier <b>+2%</b>.',
                ddesc: 'Cookie production multiplier <b>+2%</b>.<q>Advanced data modeling has revealed that fresher butter leads to superior cookie texture and flavor.</q>',
                price: 1e66, // 100 unvigintillion
                icon: [2, 3],
                pool: 'cookie',
                require: 'Box of improved cookies',
                power: 2,
            },
            {
                name: 'Improved Milk chocolate butter biscuit',
                desc: 'Cookie production multiplier <b>+10%</b>.',
                ddesc: 'Cookie production multiplier <b>+10%</b>.<q>Rewarded for owning 750 of everything.<br>It bears the engraving of a fine entrepreneur.</q>',
                price: 1e69, // 100 duovigintillion
                icon: [27, 8],
                pool: 'cookie',
                power: 10,
                require: 'Septcentennial and a half'
            },
            {
                name: 'Improved Dark chocolate butter biscuit',
                desc: 'Cookie production multiplier <b>+10%</b>.',
                ddesc: 'Cookie production multiplier <b>+10%</b>.<q>Rewarded for owning 800 of everything.<br>It is adorned with the image of an experienced cookie tycoon.</q>',
                price: 1e72, // 100 trevigintillion
                icon: [27, 9],
                pool: 'cookie',
                power: 10,
                require: 'Octcentennial'
            },
            {
                name: 'Improved White chocolate butter biscuit',
                desc: 'Cookie production multiplier <b>+10%</b>.',
                ddesc: 'Cookie production multiplier <b>+10%</b>.<q>Rewarded for owning 850 of everything.<br>The chocolate is chiseled to depict a masterful pastry magnate.</q>',
                price: 1e75, // 100 quattuorvigintillion
                icon: [28, 9],
                pool: 'cookie',
                power: 10,
                require: 'Octcentennial and a half'
            },
            {
                name: 'Improved Ruby chocolate butter biscuit',
                desc: 'Cookie production multiplier <b>+10%</b>.',
                ddesc: 'Cookie production multiplier <b>+10%</b>.<q>Rewarded for owning 900 of everything.<br>Covered in a rare red chocolate, this biscuit is etched to represent the face of a cookie industrialist gone mad with power.</q>',
                price: 1e78, // 100 quinvigintillion
                icon: [28, 8],
                pool: 'cookie',
                power: 10,
                require: 'Nonacentennial'
            },
            {
                name: 'Improved Lavender chocolate butter biscuit',
                desc: 'Cookie production multiplier <b>+10%</b>.',
                ddesc: 'Cookie production multiplier <b>+10%</b>.<q>Rewarded for owning 950 of everything.<br>This subtly-flavored biscuit represents the accomplishments of decades of top-secret research. The molded design on the chocolate resembles a well-known entrepreneur who gave their all to the ancient path of baking.</q>',
                price: 1e81, // 100 sexvigintillion
                icon: [26, 10],
                pool: 'cookie',
                power: 10,
                require: 'Nonacentennial and a half'
            },
            {
                name: 'Improved Synthetic chocolate green honey butter biscuit',
                desc: 'Cookie production multiplier <b>+10%</b>.',
                ddesc: 'Cookie production multiplier <b>+10%</b>.<q>Rewarded for owning 1000 of everything.<br>The recipe for this butter biscuit was once the sole heritage of an ancient mountain monastery. Its flavor is so refined that only a slab of lab-made chocolate specifically engineered to be completely tasteless could complement it.<br>Also it\'s got your face on it.</q>',
                price: 1e84, // 100 septenvigintillion
                icon: [24, 26],
                pool: 'cookie',
                power: 10,
                require: 'Millennial'
            }
        ]
    };
    
    // Create upgrades function
    function createUpgrades() {
        // Check if we should mark "Beyond the Leaderboard" as won
        checkAndMarkBeyondTheLeaderboard();
        
        try {
            // Validate upgradeData structure
            if (!upgradeData || typeof upgradeData !== 'object') {
                console.error('Invalid upgradeData structure:', upgradeData);
                return;
            }
            
            // Create generic upgrades (always enabled, except discount upgrades which require building upgrades to be enabled)
            if (upgradeData.generic && Array.isArray(upgradeData.generic)) {
                for (var i = 0; i < upgradeData.generic.length; i++) {
                    var upgradeInfo = upgradeData.generic[i];
                    
                    // Check if this is a discount upgrade (has "cost <b>5%</b> less" in description)
                    var isDiscountUpgrade = upgradeInfo.desc && upgradeInfo.desc.includes('cost <b>5%</b> less');
                    
                    // Check if this is the "Box of improved cookies" upgrade
                    var isCookieBoxUpgrade = upgradeInfo.name === 'Box of improved cookies';
                    
                    // Only create discount upgrades if building upgrades are enabled
                    // Only create cookie box upgrade if cookie upgrades are enabled
                    if ((!isDiscountUpgrade || enableBuildingUpgrades) && (!isCookieBoxUpgrade || enableCookieUpgrades)) {
                        createGenericUpgrade(upgradeInfo);
                    }
                }
            }
            
            // Create enabled upgrades based on current settings
            addUpgradesToGame();
            
        } catch (e) {
            console.error('Error in createUpgrades:', e);
        }
    }
    
    // Unified upgrade validation function
    function validateUpgradeData(upgradeInfo, requiredFields, upgradeType) {
        // Basic validation
        if (!upgradeInfo || !upgradeInfo.name || typeof upgradeInfo.price !== 'number' || !upgradeInfo.icon) {
            console.error('Invalid ' + upgradeType + ' upgrade data:', upgradeInfo);
            return false;
        }
        
        // Price validation
        if (!isFinite(upgradeInfo.price) || upgradeInfo.price < 0) {
            console.error('Invalid price for ' + upgradeType + ' upgrade:', upgradeInfo.name, upgradeInfo.price);
            return false;
        }
        
        // Required fields validation
        for (var i = 0; i < requiredFields.length; i++) {
            var field = requiredFields[i];
            if (typeof upgradeInfo[field] !== 'number' || !isFinite(upgradeInfo[field]) || upgradeInfo[field] < 0) {
                console.error('Invalid ' + field + ' for ' + upgradeType + ' upgrade:', upgradeInfo.name, upgradeInfo[field]);
                return false;
            }
        }
        
        return true;
    }
    
    // Unified upgrade registration function
    function registerUpgrade(upgradeInfo, upgradeType, customProperties) {
        try {
            var upgrade = Game.Upgrades[upgradeInfo.name];
            
            if (!upgrade) {
                console.warn('Failed to create ' + upgradeType + ' upgrade:', upgradeInfo.name);
                return false;
            }
            
            // Set basic properties
            upgrade.desc = upgradeInfo.desc;
            upgrade.ddesc = upgradeInfo.ddesc;
            
            // Set custom properties
            if (customProperties) {
                for (var prop in customProperties) {
                    if (customProperties.hasOwnProperty(prop)) {
                        upgrade[prop] = customProperties[prop];
                    }
                }
            }
            
            // Add required functions if they don't exist
            var requiredFunctions = {
                isVaulted: function() { return false; },
                isUnlocked: function() { return this.unlocked; },
                isBought: function() { return this.bought > 0; },
                getPrice: function() { return this.price; },
                buy: function() {
                    if (Game.cookies >= this.price) {
                        Game.cookies -= this.price;
                        this.bought = 1;
                        Game.recalculateGains = 1;
                        return true;
                    }
                    return false;
                }
            };
            
            for (var funcName in requiredFunctions) {
                if (!upgrade[funcName]) {
                    upgrade[funcName] = requiredFunctions[funcName];
                }
            }
            
            // Add to appropriate upgrade pool
            if (Game.UpgradesByPool) {
                if (upgradeInfo.pool === 'kitten' && Game.UpgradesByPool['kitten']) {
                    // Add to vanilla kitten pool
                    Game.UpgradesByPool['kitten'].push(upgrade);
                } else if (Game.UpgradesByPool['custom']) {
                    // Add to custom pool for other upgrades
                    Game.UpgradesByPool['custom'].push(upgrade);
                }
            }
            
            // Add source text
            addSourceText(upgrade);
            
            return true;
        } catch (e) {
            console.error('Error registering ' + upgradeType + ' upgrade:', upgradeInfo.name, e);
            return false;
        }
    }
    
    // Create generic upgrade (refactored)
    function createGenericUpgrade(upgradeInfo) {
        if (!validateUpgradeData(upgradeInfo, [], 'generic')) {
            return;
        }
        
        try {
            // Create upgrade using Game.Upgrade constructor
            new Game.Upgrade(upgradeInfo.name, upgradeInfo.ddesc, upgradeInfo.price, upgradeInfo.icon);
            
            // Set additional properties
            Game.last.pool = upgradeInfo.pool;
            
            // Handle require property by converting it to unlockCondition
            if (upgradeInfo.require && !upgradeInfo.unlockCondition) {
                // Convert require to unlockCondition function
                upgradeInfo.unlockCondition = function() {
                    // Check if it's an upgrade requirement first (more specific)
                    if (Game.Upgrades[upgradeInfo.require]) {
                        // It's an upgrade requirement - check if owned
                        return Game.Has(upgradeInfo.require);
                    } else if (Game.Achievements[upgradeInfo.require]) {
                        // It's an achievement requirement - check if won
                        return Game.Achievements[upgradeInfo.require].won;
                    } else {
                        // Fallback - assume it's an upgrade and check if owned
                        return Game.Has(upgradeInfo.require);
                    }
                };
            }
            
            Game.last.canBuy = function() {
                // Force all upgrades to be buyable in debug mode
                if (debugMode) {
                    this.unlocked = 1;
                    // Use the actual calculated price (with discounts) instead of base price
                    var actualPrice = this.getPrice ? this.getPrice() : this.price;
                    return !this.bought && Game.cookies >= actualPrice;
                }
                
                // Check if upgrade is unlocked AND player has enough money
                // The upgrade must be unlocked by its requirement, not just by having money
                var hasEnoughMoney = Game.cookies >= this.price;
                var isUnlocked = this.unlocked;
                
                return isUnlocked && hasEnoughMoney && !this.bought;
            };
            
            // Register the upgrade
            registerUpgrade(upgradeInfo, 'generic');
            
            // Ensure the price is set correctly
            if (Game.last) {
                Game.last.price = upgradeInfo.price;
            }
            
            // In debug mode, immediately unlock the upgrade
            if (debugMode) {
                Game.last.unlocked = 1;
            }
            
        } catch (e) {
            console.error('Error creating generic upgrade:', upgradeInfo.name, e);
        }
    }
    
    // Create kitten upgrade (refactored)
    function createKittenUpgrade(upgradeInfo) {
        if (!validateUpgradeData(upgradeInfo, ['kitten'], 'kitten')) {
            return;
        }
        
        try {
            // Handle custom sprite sheet icons
            var finalIcon = upgradeInfo.icon;
            if (Array.isArray(upgradeInfo.icon) && upgradeInfo.icon.length === 2) {
                finalIcon = [upgradeInfo.icon[0], upgradeInfo.icon[1], getSpriteSheet('custom')];
            }
            
            // Create kitten upgrade using Game.Upgrade constructor
            new Game.Upgrade(upgradeInfo.name, upgradeInfo.ddesc, upgradeInfo.price, finalIcon);
            
            // Set additional properties
            Game.last.pool = upgradeInfo.pool;
            Game.last.kitten = upgradeInfo.kitten;
            Game.last.canBuy = function() {
                // Force all upgrades to be buyable in debug mode
                if (debugMode) {
                    this.unlocked = 1;
                    // Use the actual calculated price (with discounts) instead of base price
                    var actualPrice = this.getPrice ? this.getPrice() : this.price;
                    return !this.bought && Game.cookies >= actualPrice;
                }
                
                // Check if upgrade is unlocked AND player has enough money
                // The upgrade must be unlocked by its requirement, not just by having money
                var hasEnoughMoney = Game.cookies >= this.price;
                var isUnlocked = this.unlocked;
                
                return isUnlocked && hasEnoughMoney && !this.bought;
            };
            
            // Register the upgrade with custom properties
            registerUpgrade(upgradeInfo, 'kitten', { kitten: upgradeInfo.kitten });
            
            // Ensure the price is set correctly
            if (Game.last) {
                Game.last.price = upgradeInfo.price;
            }
            
        } catch (e) {
            console.error('Error creating kitten upgrade:', upgradeInfo.name, e);
        }
    }

    
    // Create cookie upgrade (refactored)
    function createCookieUpgrade(upgradeInfo) {
        // Validate that this is actually a cookie upgrade
        if (!upgradeInfo || upgradeInfo.pool !== 'cookie') {
            console.error('Non-cookie upgrade misrouted to createCookieUpgrade:', upgradeInfo ? upgradeInfo.name : 'undefined', upgradeInfo ? upgradeInfo.pool : 'undefined');
            return;
        }
        
        if (!validateUpgradeData(upgradeInfo, ['power'], 'cookie')) {
            return;
        }
        
        try {
            // Create cookie upgrades using the proper Cookie Clicker method
            // NOTE: Don't pass require to Game.NewUpgradeCookie - we'll handle it ourselves
            Game.NewUpgradeCookie({
                name: upgradeInfo.name,
                icon: upgradeInfo.icon,
                power: upgradeInfo.power,
                price: upgradeInfo.price
                // require: upgradeInfo.require || ''  // REMOVED - we handle requirements ourselves
            });
            
            // Get the created upgrade object
            var upgrade = Game.Upgrades[upgradeInfo.name];
            if (!upgrade) {
                console.warn('Failed to create cookie upgrade:', upgradeInfo.name);
                return;
            }
            
            // Set default canBuy function (will be overridden for upgrades with requirements)
            upgrade.canBuy = function() {
                // Force all upgrades to be buyable in debug mode
                if (debugMode) {
                    this.unlocked = 1;
                    var actualPrice = this.getPrice ? this.getPrice() : this.price;
                    return !this.bought && Game.cookies >= actualPrice;
                }
                
                // Check if we have enough money
                var actualPrice = this.getPrice ? this.getPrice() : this.price;
                return this.unlocked && !this.bought && Game.cookies >= actualPrice;
            };
            
            // Set descriptions
            upgrade.desc = upgradeInfo.desc;
            upgrade.ddesc = upgradeInfo.ddesc;
            
            // Handle requirements entirely through our custom logic
            if (upgradeInfo.require) {
                // DEBUG: Log requirement handling for specific upgrades
                if (upgradeInfo.name === 'Improved Sugar cookies') {
                    console.log('🔍 DEBUG: Creating Improved Sugar cookies with requirement:', upgradeInfo.require);
                }
                
                // Set the require property for display purposes
                upgrade.require = upgradeInfo.require;
                
                // CRITICAL: Force the upgrade to be locked initially
                upgrade.unlocked = 0;
                
                if (upgradeInfo.name === 'Improved Sugar cookies') {
                    console.log('🔍 DEBUG: Set Improved Sugar cookies unlocked = 0');
                }
                
                // Create the unlockCondition function that will control when it unlocks
                upgrade.unlockCondition = function() {
                    var result = false;
                    
                    // Check if it's an upgrade requirement first (more specific)
                    if (Game.Upgrades[upgradeInfo.require]) {
                        // It's an upgrade requirement - check if owned
                        result = Game.Has(upgradeInfo.require);
                    } else if (Game.Achievements[upgradeInfo.require]) {
                        // It's an achievement requirement - check if won
                        result = Game.Achievements[upgradeInfo.require].won;
                    } else {
                        // Fallback - assume it's an upgrade and check if owned
                        result = Game.Has(upgradeInfo.require);
                    }
                    
                    return result;
                };
                
                // CRITICAL: Also override the getPrice function to return Infinity if requirement not met
                // This ensures the upgrade appears completely unavailable in the UI
                upgrade.getPrice = function() {
                    if (this.unlockCondition && !this.unlockCondition()) {
                        return Infinity; // Make it appear completely unavailable
                    }
                    return this.price; // Return normal price if requirement met
                };
                
                // CRITICAL: Override the unlocked property to control visibility
                // This is the key property that Cookie Clicker uses to show/hide upgrades
                Object.defineProperty(upgrade, 'unlocked', {
                    get: function() {
                        var shouldHide = this.unlockCondition && !this.unlockCondition();
                        // Always return 0 if requirement not met, regardless of what was set
                        return shouldHide ? 0 : (upgradeInfo._unlocked !== undefined ? upgradeInfo._unlocked : 0);
                    },
                    set: function(value) {
                        // Store the value but the getter will override based on requirement
                        upgradeInfo._unlocked = value;
                    }
                });
                
                // CRITICAL: Also override the canBuy function to ensure it respects the requirement
                // This provides an additional layer of protection
                upgrade.canBuy = function() {
                    // Force all upgrades to be buyable in debug mode
                    if (debugMode) {
                        this.unlocked = 1;
                        var actualPrice = this.getPrice ? this.getPrice() : this.price;
                        return !this.bought && Game.cookies >= actualPrice;
                    }
                    
                    // ALWAYS check the requirement first - if not met, can't buy
                    if (this.unlockCondition && !this.unlockCondition()) {
                        return false; // Can't buy if requirement not met
                    }
                    
                    // Only if requirement is met, check other conditions
                    var actualPrice = this.getPrice ? this.getPrice() : this.price;
                    var canBuyResult = !this.bought && Game.cookies >= actualPrice;
                    
                    return canBuyResult;
                };
                
                if (upgradeInfo.name === 'Improved Sugar cookies') {
                    console.log('🔍 DEBUG: Improved Sugar cookies setup complete. Current state:');
                    console.log('  - unlocked:', upgrade.unlocked);
                    console.log('  - has unlockCondition:', !!upgrade.unlockCondition);
                    console.log('  - has canBuy override:', !!upgrade.canBuy);
                    console.log('  - has getPrice override:', !!upgrade.getPrice);
                    
                    // DEBUG: Inspect ALL properties of the upgrade
                    console.log('🔍 DEBUG: === ALL UPGRADE PROPERTIES ===');
                    for (var prop in upgrade) {
                        try {
                            var value = upgrade[prop];
                            if (typeof value === 'function') {
                                console.log('  -', prop, ':', '[Function]', value.toString().substring(0, 100) + '...');
                            } else {
                                console.log('  -', prop, ':', value);
                            }
                        } catch (e) {
                            console.log('  -', prop, ':', '[Error reading property]', e.message);
                        }
                    }
                    
                    // DEBUG: Check if there are any getters/setters we can't see
                    console.log('🔍 DEBUG: === CHECKING FOR HIDDEN PROPERTIES ===');
                    var descriptor = Object.getOwnPropertyDescriptor(upgrade, 'pool');
                    if (descriptor) {
                        console.log('  - pool property descriptor:', descriptor);
                    }
                    
                    // DEBUG: Check prototype chain
                    console.log('🔍 DEBUG: === PROTOTYPE CHAIN ===');
                    var proto = Object.getPrototypeOf(upgrade);
                    if (proto) {
                        console.log('  - Prototype properties:');
                        for (var protoProp in proto) {
                            try {
                                var protoValue = proto[protoProp];
                                if (typeof protoValue === 'function') {
                                    console.log('    -', protoProp, ':', '[Function]', protoValue.toString().substring(0, 100) + '...');
                                } else {
                                    console.log('    -', protoProp, ':', protoValue);
                                }
                            } catch (e) {
                                console.log('    -', protoProp, ':', '[Error reading property]', e.message);
                            }
                        }
                    }
                }
            }
            
            // Apply appropriate formatting based on requirement
            if (upgradeInfo.require === 'Box of improved cookies') {
                // Check if the required upgrade exists before accessing its properties
                if (Game.Upgrades['Box of improved cookies']) {
                    var requireText = '<div style="font-size:80%;text-align:center;">From ' + tinyIcon(Game.Upgrades['Box of improved cookies'].icon) + ' Box of improved cookies</div>';
                    var modSourceText = '<div style="font-size:80%;text-align:center;margin-top:2px;">Part of <span style="margin: 0 4px;">' + tinyIcon(modIcon) + '</span> ' + modName + '</div>';
                    var combinedText = requireText + '<div style="height:2px;"></div>' + modSourceText + '<div class="line"></div>';
                    
                    upgrade.ddesc = combinedText + upgradeInfo.ddesc;
                    upgrade.desc = combinedText + upgradeInfo.desc;
                } else {
                    // Fallback if the required upgrade doesn't exist yet
                    console.warn('Required upgrade "Box of improved cookies" not found for:', upgradeInfo.name);
                    addSourceText(upgrade);
                }
            } else {
                addSourceText(upgrade);
            }
            
            // Debug mode handling (override the locked state if needed)
            if (debugMode) {
                upgrade.unlocked = 1;
            }
            
        } catch (e) {
            console.error('Error creating cookie upgrade:', upgradeInfo.name, e);
        }
    }
    
    // Create building upgrade (refactored)
    function createBuildingUpgrade(upgradeInfo) {
        if (!validateUpgradeData(upgradeInfo, [], 'building')) {
            return;
        }
        
        try {
            // Create upgrade using Game.Upgrade constructor
            new Game.Upgrade(upgradeInfo.name, upgradeInfo.ddesc, upgradeInfo.price, upgradeInfo.icon);
            
            // Set additional properties
            Game.last.pool = upgradeInfo.pool;
            Game.last.canBuy = function() {
                // Force all upgrades to be buyable in debug mode
                if (debugMode) {
                    this.unlocked = 1;
                    // Use the actual calculated price (with discounts) instead of base price
                    var actualPrice = this.getPrice ? this.getPrice() : this.price;
                    return !this.bought && Game.cookies >= actualPrice;
                }
                
                // Check if upgrade is unlocked AND player has enough money
                // The upgrade must be unlocked by its requirement, not just by having money
                var hasEnoughMoney = Game.cookies >= this.price;
                var isUnlocked = this.unlocked;
                
                return isUnlocked && hasEnoughMoney && !this.bought;
            };
            
            // Register the upgrade with custom properties
            registerUpgrade(upgradeInfo, 'building', {
                price: upgradeInfo.price,
                icon: upgradeInfo.icon,
                pool: upgradeInfo.pool
            });
            
            // Ensure the price is set correctly
            if (Game.last) {
                Game.last.price = upgradeInfo.price;
            }
            
            // In debug mode, immediately unlock the upgrade
            if (debugMode) {
                Game.last.unlocked = 1;
            }
            
        } catch (e) {
            console.error('Error creating building upgrade:', upgradeInfo.name, e);
        }
    }
    
    // Apply upgrade effects function
    function applyUpgradeEffects(cps) {
        // Apply cookie upgrade effects manually (like the working upgrades.js)
        for (var i = 0; i < upgradeData.cookie.length; i++) {
            var upgradeInfo = upgradeData.cookie[i];
            if (Game.Upgrades[upgradeInfo.name] && Game.Upgrades[upgradeInfo.name].bought) {
                // Use the power value from the actual upgrade object
                var upgrade = Game.Upgrades[upgradeInfo.name];
                var multiplier = 1 + (upgrade.power / 100); // Convert power to percentage
                cps *= multiplier;
            }
        }
        
        // Apply generic upgrade effects
        for (var i = 0; i < upgradeData.generic.length; i++) {
            var upgradeInfo = upgradeData.generic[i];
            if (Game.Upgrades[upgradeInfo.name] && Game.Upgrades[upgradeInfo.name].bought) {
                if (upgradeInfo.effect) {
                    upgradeInfo.effect();
                }
            } else if (upgradeInfo.resetEffect) {
                upgradeInfo.resetEffect();
            }
        }
        return cps;
    }
    
    // DEBUG: Global function to test biscuit upgrade unlocking manually
    window.debugBiscuitUpgrades = function() {
        console.log('🔍 DEBUG: === BISCUIT UPGRADE STATUS CHECK ===');
        
        // Check each biscuit upgrade
        var biscuitUpgrades = [
            'Improved Milk chocolate butter biscuit',
            'Improved Dark chocolate butter biscuit', 
            'Improved White chocolate butter biscuit',
            'Improved Ruby chocolate butter biscuit',
            'Improved Lavender chocolate butter biscuit',
            'Improved Synthetic chocolate green honey butter biscuit'
        ];
        
        for (var i = 0; i < biscuitUpgrades.length; i++) {
            var upgradeName = biscuitUpgrades[i];
            var upgrade = Game.Upgrades[upgradeName];
            
            if (upgrade) {
                console.log('🔍 DEBUG: - ' + upgradeName + ':');
                console.log('  - Currently unlocked:', upgrade.unlocked);
                console.log('  - Currently bought:', upgrade.bought);
                console.log('  - Can buy:', upgrade.canBuy ? upgrade.canBuy() : 'N/A');
            } else {
                console.log('🔍 DEBUG: - ' + upgradeName + ': NOT FOUND in Game.Upgrades');
            }
        }
        
        // Check the required achievements
        var requiredAchievements = [
            'Septcentennial and a half',
            'Octcentennial', 
            'Octcentennial and a half',
            'Nonacentennial',
            'Nonacentennial and a half',
            'Millennial'
        ];
        
        console.log('🔍 DEBUG: === REQUIRED ACHIEVEMENTS STATUS ===');
        for (var i = 0; i < requiredAchievements.length; i++) {
            var achievementName = requiredAchievements[i];
            var achievement = Game.Achievements[achievementName];
            
            if (achievement) {
                console.log('🔍 DEBUG: - ' + achievementName + ':');
                console.log('  - Won:', achievement.won);
                console.log('  - Currently owned:', Game.Has(achievementName));
            } else {
                console.log('🔍 DEBUG: - ' + achievementName + ': NOT FOUND in Game.Achievements');
            }
        }
        
        console.log('🔍 DEBUG: === END BISCUIT STATUS CHECK ===');
    };

    // DEBUG: Test Box of improved cookies unlock logic
    window.debugBoxOfImprovedCookies = function() {
        console.log('🔍 DEBUG: === BOX OF IMPROVED COOKIES DEBUG ===');
        
        var boxUpgrade = Game.Upgrades['Box of improved cookies'];
        if (boxUpgrade) {
            console.log('🔍 DEBUG: Box of improved cookies upgrade found:');
            console.log('  - Name:', boxUpgrade.name);
            console.log('  - Currently unlocked:', boxUpgrade.unlocked);
            console.log('  - Currently bought:', boxUpgrade.bought);
            console.log('  - Can buy:', boxUpgrade.canBuy ? boxUpgrade.canBuy() : 'N/A');
        } else {
            console.log('🔍 DEBUG: Box of improved cookies upgrade NOT FOUND');
        }
        
        // Check some non-butter cookie upgrades that should require Box of improved cookies
        var nonButterUpgrades = [
            'Improved Plain cookies',
            'Improved Sugar cookies',
            'Improved Oatmeal raisin cookies',
            'Improved Zebra cookies'
        ];
        
        console.log('🔍 DEBUG: === NON-BUTTER COOKIE UPGRADES STATUS ===');
        for (var i = 0; i < nonButterUpgrades.length; i++) {
            var upgradeName = nonButterUpgrades[i];
            var upgrade = Game.Upgrades[upgradeName];
            
            if (upgrade) {
                console.log('🔍 DEBUG: - ' + upgradeName + ':');
                console.log('  - Currently unlocked:', upgrade.unlocked);
                console.log('  - Currently bought:', upgrade.bought);
                console.log('  - Can buy:', upgrade.canBuy ? upgrade.canBuy() : 'N/A');
                
                // Check if this upgrade has a require property in the data
                var foundInData = false;
                if (upgradeData.generic) {
                    for (var j = 0; j < upgradeData.generic.length; j++) {
                        if (upgradeData.generic[j].name === upgradeName) {
                            foundInData = true;
                            console.log('  - Found in upgradeData.generic');
                            console.log('  - Has require property:', !!upgradeData.generic[j].require);
                            console.log('  - require value:', upgradeData.generic[j].require);
                            console.log('  - Has unlockCondition:', !!upgradeData.generic[j].unlockCondition);
                            break;
                        }
                    }
                }
                if (!foundInData) {
                    console.log('  - NOT found in upgradeData.generic');
                }
            } else {
                console.log('🔍 DEBUG: - ' + upgradeName + ': NOT FOUND in Game.Upgrades');
            }
        }
        
        console.log('🔍 DEBUG: === END BOX DEBUG ===');
    };

    // DEBUG: Test the unlock condition logic directly
    window.testUnlockCondition = function(upgradeName) {
        console.log('🧪 DEBUG: Testing unlock condition for:', upgradeName);
        
        var upgrade = Game.Upgrades[upgradeName];
        if (!upgrade) {
            console.log('❌ Upgrade not found:', upgradeName);
            return;
        }
        
        // Find the upgrade data
        var upgradeData = null;
        if (window.upgradeData && window.upgradeData.generic) {
            for (var i = 0; i < window.upgradeData.generic.length; i++) {
                if (window.upgradeData.generic[i].name === upgradeName) {
                    upgradeData = window.upgradeData.generic[i];
                    break;
                }
            }
        }
        
        if (upgradeData) {
            console.log('🔍 DEBUG: Upgrade data found:');
            console.log('  - Has require:', !!upgradeData.require);
            console.log('  - require value:', upgradeData.require);
            console.log('  - Has unlockCondition:', !!upgradeData.unlockCondition);
            
            if (upgradeData.require) {
                // Test the unlock condition logic
                var isUpgrade = Game.Upgrades[upgradeData.require];
                var isAchievement = Game.Achievements[upgradeData.require];
                
                console.log('🔍 DEBUG: Requirement analysis:');
                console.log('  - Is upgrade:', !!isUpgrade);
                console.log('  - Is achievement:', !!isAchievement);
                
                if (isUpgrade) {
                    console.log('  - Upgrade owned:', Game.Has(upgradeData.require));
                }
                if (isAchievement) {
                    console.log('  - Achievement won:', isAchievement.won);
                }
            }
        } else {
            console.log('❌ Upgrade data not found in upgradeData.generic');
        }
        
        console.log('🔍 DEBUG: Current upgrade state:');
        console.log('  - unlocked:', upgrade.unlocked);
        console.log('  - bought:', upgrade.bought);
    };

    // DEBUG: Test Improved Zebra cookies specifically
    window.debugZebraCookies = function() {
        console.log('🔍 DEBUG: === IMPROVED ZEBRA COOKIES DEBUG ===');
        
        var zebraUpgrade = Game.Upgrades['Improved Zebra cookies'];
        if (!zebraUpgrade) {
            console.log('❌ Improved Zebra cookies upgrade not found');
            return;
        }
        
        console.log('🔍 DEBUG: Improved Zebra cookies upgrade found:');
        console.log('  - Name:', zebraUpgrade.name);
        console.log('  - Currently unlocked:', zebraUpgrade.unlocked);
        console.log('  - Currently bought:', zebraUpgrade.bought);
        console.log('  - Can buy:', zebraUpgrade.canBuy ? zebraUpgrade.canBuy() : 'N/A');
        
        // Check if it has a canBuy function and what it returns
        if (zebraUpgrade.canBuy) {
            console.log('🔍 DEBUG: Testing canBuy function:');
            try {
                var canBuyResult = zebraUpgrade.canBuy();
                console.log('  - canBuy() result:', canBuyResult);
            } catch (e) {
                console.log('  - canBuy() error:', e);
            }
        }
        
        // Check the Box of improved cookies requirement
        var boxUpgrade = Game.Upgrades['Box of improved cookies'];
        if (boxUpgrade) {
            console.log('🔍 DEBUG: Box of improved cookies status:');
            console.log('  - Name:', boxUpgrade.name);
            console.log('  - Currently unlocked:', boxUpgrade.unlocked);
            console.log('  - Currently bought:', boxUpgrade.bought);
            console.log('  - Can buy:', boxUpgrade.canBuy ? boxUpgrade.canBuy() : 'N/A');
        } else {
            console.log('❌ Box of improved cookies upgrade not found');
        }
        
        // Check if the unlock condition is working
        console.log('🔍 DEBUG: Testing unlock condition:');
        if (zebraUpgrade.unlockCondition) {
            try {
                var unlockResult = zebraUpgrade.unlockCondition();
                console.log('  - unlockCondition() result:', unlockResult);
            } catch (e) {
                console.log('  - unlockCondition() error:', e);
            }
        } else {
            console.log('  - No unlockCondition function found');
        }
        
        console.log('🔍 DEBUG: === END ZEBRA DEBUG ===');
    };

    // DEBUG: Inspect raw upgrade data for Improved Zebra cookies
    window.inspectZebraData = function() {
        console.log('🔍 DEBUG: === INSPECTING ZEBRA UPGRADE DATA ===');
        
        // Look in generic upgrades
        if (upgradeData.generic) {
            for (var i = 0; i < upgradeData.generic.length; i++) {
                var upgradeInfo = upgradeData.generic[i];
                if (upgradeInfo.name === 'Improved Zebra cookies') {
                    console.log('🔍 DEBUG: Found in upgradeData.generic:');
                    console.log('  - Full upgrade data:', upgradeInfo);
                    console.log('  - Has require:', !!upgradeInfo.require);
                    console.log('  - require value:', upgradeInfo.require);
                    console.log('  - Has unlockCondition:', !!upgradeInfo.unlockCondition);
                    return;
                }
            }
        }
        
        // Look in cookie upgrades
        if (upgradeData.cookie) {
            for (var i = 0; i < upgradeData.cookie.length; i++) {
                var upgradeInfo = upgradeData.cookie[i];
                if (upgradeInfo.name === 'Improved Zebra cookies') {
                    console.log('🔍 DEBUG: Found in upgradeData.cookie:');
                    console.log('  - Full upgrade data:', upgradeInfo);
                    console.log('  - Has require:', !!upgradeInfo.require);
                    console.log('  - require value:', upgradeInfo.require);
                    console.log('  - Has unlockCondition:', !!upgradeInfo.unlockCondition);
                    return;
                }
            }
        }
        
        console.log('❌ Improved Zebra cookies not found in upgradeData');
    };
    
    // DEBUG: Inspect Improved Sugar cookies specifically
    window.debugSugarCookies = function() {
        console.log('🔍 DEBUG: === IMPROVED SUGAR COOKIES DEBUG ===');
        
        var sugarUpgrade = Game.Upgrades['Improved Sugar cookies'];
        if (!sugarUpgrade) {
            console.log('❌ Improved Sugar cookies upgrade not found');
            return;
        }
        
        console.log('🔍 DEBUG: Improved Sugar cookies upgrade found:');
        console.log('  - Name:', sugarUpgrade.name);
        console.log('  - Currently unlocked:', sugarUpgrade.unlocked);
        console.log('  - Currently bought:', sugarUpgrade.bought);
        console.log('  - Can buy:', sugarUpgrade.canBuy());
        console.log('  - Has require property:', !!sugarUpgrade.require);
        console.log('  - require value:', sugarUpgrade.require);
        console.log('  - Has unlockCondition function:', !!sugarUpgrade.unlockCondition);
        console.log('  - Has custom canBuy function:', !!sugarUpgrade.canBuy);
        console.log('  - Has custom getPrice function:', !!sugarUpgrade.getPrice);
        
        // Test the unlock condition
        if (sugarUpgrade.unlockCondition) {
            console.log('🔍 DEBUG: Testing unlock condition:');
            var unlockResult = sugarUpgrade.unlockCondition();
            console.log('  - unlockCondition() result:', unlockResult);
        } else {
            console.log('🔍 DEBUG: No unlockCondition function found');
        }
        
        // Test the canBuy function
        console.log('🔍 DEBUG: Testing canBuy function:');
        var canBuyResult = sugarUpgrade.canBuy();
        console.log('  - canBuy() result:', canBuyResult);
        
        // Check the required upgrade status
        if (sugarUpgrade.require) {
            console.log('🔍 DEBUG: Required upgrade status:');
            var requiredUpgrade = Game.Upgrades[sugarUpgrade.require];
            if (requiredUpgrade) {
                console.log('  - Name:', requiredUpgrade.name);
                console.log('  - Currently unlocked:', requiredUpgrade.unlocked);
                console.log('  - Currently bought:', requiredUpgrade.bought);
                console.log('  - Game.Has result:', Game.Has(sugarUpgrade.require));
            } else {
                console.log('  - Required upgrade not found in Game.Upgrades');
            }
        }
        
        console.log('🔍 DEBUG: === END SUGAR COOKIES DEBUG ===');
    };
    
    // DEBUG: Compare with a vanilla upgrade to see what we're missing
    window.debugVanillaUpgrade = function() {
        console.log('🔍 DEBUG: === VANILLA UPGRADE COMPARISON ===');
        
        // Find a vanilla upgrade to compare with
        var vanillaUpgrade = null;
        for (var name in Game.Upgrades) {
            if (Game.Upgrades[name] && !Game.Upgrades[name].mod) {
                vanillaUpgrade = Game.Upgrades[name];
                break;
            }
        }
        
        if (!vanillaUpgrade) {
            console.log('❌ No vanilla upgrade found for comparison');
            return;
        }
        
        console.log('🔍 DEBUG: Found vanilla upgrade:', vanillaUpgrade.name);
        console.log('🔍 DEBUG: === VANILLA UPGRADE PROPERTIES ===');
        for (var prop in vanillaUpgrade) {
            try {
                var value = vanillaUpgrade[prop];
                if (typeof value === 'function') {
                    console.log('  -', prop, ':', '[Function]', value.toString().substring(0, 100) + '...');
                } else {
                    console.log('  -', prop, ':', value);
                }
            } catch (e) {
                console.log('  -', prop, ':', '[Error reading property]', e.message);
            }
        }
        
        // Check if vanilla upgrade has any special visibility properties
        console.log('🔍 DEBUG: === VANILLA UPGRADE VISIBILITY ===');
        console.log('  - pool:', vanillaUpgrade.pool);
        console.log('  - unlocked:', vanillaUpgrade.unlocked);
        console.log('  - bought:', vanillaUpgrade.bought);
        console.log('  - canBuy():', vanillaUpgrade.canBuy());
        console.log('  - getPrice():', vanillaUpgrade.getPrice());
        
        // Check if there are any hidden properties
        var vanillaDescriptor = Object.getOwnPropertyDescriptor(vanillaUpgrade, 'pool');
        if (vanillaDescriptor) {
            console.log('  - pool property descriptor:', vanillaDescriptor);
        }
        
        console.log('🔍 DEBUG: === END VANILLA COMPARISON ===');
    };
    
    // DEBUG: Test the new unlocked property override
    window.testUnlockedOverride = function() {
        console.log('🔍 DEBUG: === TESTING UNLOCKED OVERRIDE ===');
        
        var sugarUpgrade = Game.Upgrades['Improved Sugar cookies'];
        if (!sugarUpgrade) {
            console.log('❌ Improved Sugar cookies upgrade not found');
            return;
        }
        
        console.log('🔍 DEBUG: Testing unlocked property override:');
        console.log('  - Direct unlocked access:', sugarUpgrade.unlocked);
        console.log('  - unlockCondition result:', sugarUpgrade.unlockCondition());
        console.log('  - Should be hidden:', !sugarUpgrade.unlockCondition());
        
        // Test setting and getting the unlocked property
        console.log('🔍 DEBUG: Testing unlocked property setter/getter:');
        sugarUpgrade.unlocked = 1;
        console.log('  - After setting to 1:', sugarUpgrade.unlocked);
        
        // Check if the override is working
        var descriptor = Object.getOwnPropertyDescriptor(sugarUpgrade, 'unlocked');
        if (descriptor) {
            console.log('  - unlocked property descriptor:', descriptor);
        }
        
        console.log('🔍 DEBUG: === END UNLOCKED OVERRIDE TEST ===');
    };
    
    // DEBUG: Test the pool override with 'unused' value
    window.testPoolOverride = function() {
        console.log('🔍 DEBUG: === TESTING POOL OVERRIDE ===');
        
        var sugarUpgrade = Game.Upgrades['Improved Sugar cookies'];
        if (!sugarUpgrade) {
            console.log('❌ Improved Sugar cookies upgrade not found');
            return;
        }
        
        console.log('🔍 DEBUG: Testing pool property override:');
        console.log('  - Current pool value:', sugarUpgrade.pool);
        console.log('  - unlockCondition result:', sugarUpgrade.unlockCondition());
        console.log('  - Should be hidden:', !sugarUpgrade.unlockCondition());
        
        // Check if the pool override is working
        var descriptor = Object.getOwnPropertyDescriptor(sugarUpgrade, 'pool');
        if (descriptor) {
            console.log('  - pool property descriptor:', descriptor);
        }
        
        // Test what happens when we access pool multiple times
        console.log('🔍 DEBUG: Testing pool access multiple times:');
        for (var i = 0; i < 3; i++) {
            console.log('  - Pool access', i + 1, ':', sugarUpgrade.pool);
        }
        
        console.log('🔍 DEBUG: === END POOL OVERRIDE TEST ===');
    };
    
    // DEBUG: Check what upgrades are actually visible in the UI
    window.debugUpgradeVisibility = function() {
        console.log('🔍 DEBUG: === UPGRADE VISIBILITY DEBUG ===');
        
        // Check what upgrades are in different pools
        console.log('🔍 DEBUG: Checking upgrade pools:');
        for (var name in Game.Upgrades) {
            var upgrade = Game.Upgrades[name];
            if (upgrade && upgrade.pool) {
                console.log('  -', name, ':', upgrade.pool);
            }
        }
        
        // Check if our upgrade is actually in the unused pool
        var unusedUpgrades = [];
        for (var name in Game.Upgrades) {
            var upgrade = Game.Upgrades[name];
            if (upgrade && upgrade.pool === 'unused') {
                unusedUpgrades.push(name);
            }
        }
        console.log('🔍 DEBUG: Upgrades with pool "unused":', unusedUpgrades);
        
        // Check if our upgrade appears in the upgrade menu
        var cookieUpgrades = [];
        for (var name in Game.Upgrades) {
            var upgrade = Game.Upgrades[name];
            if (upgrade && upgrade.pool === 'cookie') {
                cookieUpgrades.push(name);
            }
        }
        console.log('🔍 DEBUG: Upgrades with pool "cookie":', cookieUpgrades);
        
        console.log('🔍 DEBUG: === END VISIBILITY DEBUG ===');
    };
      
    // Check upgrade unlock conditions
    function checkUpgradeUnlockConditions() {
        
        // In debug mode, unlock all mod upgrades
        if (debugMode) {
            var modUpgradeNames = getModUpgradeNames();
            for (var i = 0; i < modUpgradeNames.length; i++) {
                var upgradeName = modUpgradeNames[i];
                if (Game.Upgrades[upgradeName]) {
                    Game.Unlock(upgradeName);
                    Game.Upgrades[upgradeName].unlocked = 1;
                }
            }
            return;
        }
        
        // THROTTLING: Only run this check occasionally to prevent flickering
        // Check if we've run this recently (within the last 5 seconds)
        if (checkUpgradeUnlockConditions.lastRun && 
            (Date.now() - checkUpgradeUnlockConditions.lastRun) < 5000) {
            return; // Skip if run too recently
        }
        checkUpgradeUnlockConditions.lastRun = Date.now();
        
        // Normal unlock condition checking (when debug mode is off)
        // Check generic upgrade unlock conditions (like the working upgrades.js)
        for (var i = 0; i < upgradeData.generic.length; i++) {
            var upgradeInfo = upgradeData.generic[i];
            
            if (Game.Upgrades[upgradeInfo.name]) {
                var shouldUnlock = false;
                
                // Only unlock if there's a specific unlock condition
                if (upgradeInfo.unlockCondition) {
                    shouldUnlock = upgradeInfo.unlockCondition();
                }
                // If no unlock condition, keep the upgrade locked
                // The canBuy() function will handle purchase availability based on money
                
                if (shouldUnlock && !Game.Upgrades[upgradeInfo.name].unlocked) {
                    Game.Unlock(upgradeInfo.name);
                }
            } else {
                // Upgrade not found - this is expected for some cases
            }
        }
        
        // Check kitten upgrade unlock conditions (silent - only unlock if needed)
        for (var i = 0; i < upgradeData.kitten.length; i++) {
            var upgradeInfo = upgradeData.kitten[i];
            
            if (Game.Upgrades[upgradeInfo.name] && upgradeInfo.unlockCondition) {
                var conditionMet = upgradeInfo.unlockCondition();
                
                if (conditionMet && !Game.Upgrades[upgradeInfo.name].unlocked) {
                    // Use Game.Unlock() like the working version - just make it available for purchase
                    Game.Unlock(upgradeInfo.name);
                }
            }
        }
        
        // Check building upgrade unlock conditions
        for (var i = 0; i < upgradeData.building.length; i++) {
            var upgradeInfo = upgradeData.building[i];
            if (Game.Upgrades[upgradeInfo.name] && upgradeInfo.unlockCondition) {
                var conditionMet = upgradeInfo.unlockCondition();
                if (conditionMet && !Game.Upgrades[upgradeInfo.name].unlocked) {
                    // Use Game.Unlock() like the working version - just make it available for purchase
                    Game.Unlock(upgradeInfo.name);
                }
            }
        }
        
        // Check cookie upgrade unlock conditions
        if (upgradeData.cookie && Array.isArray(upgradeData.cookie)) {
            for (var i = 0; i < upgradeData.cookie.length; i++) {
                var upgradeInfo = upgradeData.cookie[i];
                
                if (Game.Upgrades[upgradeInfo.name]) {
                    var upgrade = Game.Upgrades[upgradeInfo.name];
                    var shouldUnlock = false;
                    
                    // ONLY set unlockCondition and canBuy functions if they don't exist yet
                    // This prevents constant overriding and flickering
                    if (upgradeInfo.require && !upgrade.unlockCondition) {
                        // Force the upgrade to be locked initially (only once)
                        upgrade.unlocked = 0;
                        
                        // Create the unlockCondition function (only once)
                        upgrade.unlockCondition = function() {
                            // Check if it's an upgrade requirement first (more specific)
                            if (Game.Upgrades[upgradeInfo.require]) {
                                // It's an upgrade requirement - check if owned
                                return Game.Has(upgradeInfo.require);
                            } else if (Game.Achievements[upgradeInfo.require]) {
                                // It's an achievement requirement - check if won
                                return Game.Achievements[upgradeInfo.require].won;
                            } else {
                                // Fallback - assume it's an upgrade and check if owned
                                return Game.Has(upgradeInfo.require);
                            }
                        };
                        
                        // Create the canBuy function (only once)
                        upgrade.canBuy = function() {
                            // Check if the requirement is met first
                            if (this.unlockCondition && !this.unlockCondition()) {
                                return false; // Can't buy if requirement not met
                            }
                            
                            // Then check if we have enough money
                            var actualPrice = this.getPrice ? this.getPrice() : this.price;
                            return this.unlocked && !this.bought && Game.cookies >= actualPrice;
                        };
                    }
                    
                    // Now check if the unlock condition is met (only if unlockCondition exists)
                    if (upgrade.unlockCondition) {
                        shouldUnlock = upgrade.unlockCondition();
                        
                        // Only unlock if the condition is met and it's not already unlocked
                        if (shouldUnlock && !upgrade.unlocked) {
                            Game.Unlock(upgradeInfo.name);
                        }
                    }
                    
                    // Only unlock if there's a specific unlock condition AND it's met
                    if (upgradeInfo.require && shouldUnlock && !upgrade.unlocked) {
                        Game.Unlock(upgradeInfo.name);
                    }
                }
            }
        }
    }
    
    // Check upgrades function (simple approach from upgrades.js)
    function checkUpgrades() {
        // In debug mode, ensure all mod upgrades are unlocked and available
        if (debugMode) {
            var modUpgradeNames = getModUpgradeNames();
            modUpgradeNames.forEach(name => {
                if (Game.Upgrades[name]) {
                    // Force unlock all mod upgrades in debug mode
                    Game.Upgrades[name].unlocked = 1;
                }
            });
            return;
        }
        
        // Check unlock conditions for all upgrade types
        checkUpgradeUnlockConditions();
        
        // Check for upgrades that can be purchased (money-based unlocks)
        var modUpgradeNames = getModUpgradeNames();
        modUpgradeNames.forEach(name => {
            if (Game.Upgrades[name] && !Game.Upgrades[name].require) {
                // Only auto-unlock upgrades without requirements
                var actualPrice = Game.Upgrades[name].getPrice ? Game.Upgrades[name].getPrice() : Game.Upgrades[name].price;
                if (Game.cookies >= actualPrice && !Game.Upgrades[name].unlocked) {
                    Game.Upgrades[name].unlocked = 1;
                }
            }
        });
    } 
    
    // Save function for upgrades (simple approach from upgrades.js)
    function saveUpgradesData() {
        // Create the data structure to save
        // We save the version for compatibility and upgrade states
        const modData = {
            version: modVersion,
            upgrades: {}
        };
        
        // Save the purchase state of each of our custom upgrades
        // We only save the 'bought' property since that's what matters for persistence
        // Save all upgrade states except kittens (TEMPORARILY DISABLED FOR TESTING)
        var modUpgradeNames = getModUpgradeNames();
        modUpgradeNames.forEach(name => {
            if (Game.Upgrades[name] && !name.includes('Kitten')) {
                modData.upgrades[name] = {
                    bought: Game.Upgrades[name].bought || 0
                };
            }
        });
        
        // Convert to JSON string for saving
        // The game will automatically handle encoding/decoding this string
        const saveString = JSON.stringify(modData);
        return saveString;
    }
    
    // Load function for upgrades (simple approach from upgrades.js)
    function loadUpgradesData(str) {
        try {
            // Parse the saved JSON data back into an object
            const modData = JSON.parse(str);
            
            // Restore upgrade states from the saved data (TEMPORARILY DISABLED KITTENS FOR TESTING)
            if (modData.upgrades) {
                Object.keys(modData.upgrades).forEach(upgradeName => {
                    if (Game.Upgrades[upgradeName] && !upgradeName.includes('Kitten')) {
                        // Restore the 'bought' state
                        Game.Upgrades[upgradeName].bought = modData.upgrades[upgradeName].bought || 0;
                        
                        // If the upgrade was bought, ensure it's marked as unlocked
                        // This is important for the UI to show it correctly
                        if (Game.Upgrades[upgradeName].bought > 0) {
                            Game.Upgrades[upgradeName].unlocked = 1;
                        }
                    }
                });
            }
            
            // Force recalculation to apply effects immediately after loading
            // This ensures the production bonuses are applied right away
            // Without this, effects wouldn't be felt until another upgrade is purchased
            setTimeout(() => {
                if (Game.CalculateGains) {
                    Game.CalculateGains();
                }
                if (Game.recalculateGains) {
                    Game.recalculateGains = 1;
                }
            }, 100);
            
        } catch (error) {
            // If there's an error parsing the save data, just continue
            // This prevents the mod from breaking if the save format changes
            console.warn('Error loading upgrades data:', error);
        }
    }
    
    // Save function for achievements
    function saveAchievementsData() {
        // Create the data structure to save
        const modData = {
            version: modVersion,
            achievements: {},
            currentRunMaxCombinedTotal: currentRunData.maxCombinedTotal || 0,
            // Save granular control settings
            shadowAchievementMode: shadowAchievementMode,
            enableCookieUpgrades: enableCookieUpgrades,
            enableBuildingUpgrades: enableBuildingUpgrades,
            enableKittenUpgrades: enableKittenUpgrades
        };
        
        // Save the won state of each of our custom achievements
        modAchievementNames.forEach(name => {
            if (Game.Achievements[name]) {
                modData.achievements[name] = {
                    won: Game.Achievements[name].won || 0
                };
            }
        });
        
        // Convert to JSON string for saving
        const saveString = JSON.stringify(modData);
        return saveString;
    }
    
    // Load function for achievements
    function loadAchievementsData(str) {
        try {
            // Parse the saved JSON data back into an object
            const modData = JSON.parse(str);
            
            // Restore currentRunMaxCombinedTotal from saved data
            if (modData.currentRunMaxCombinedTotal !== undefined) {
                currentRunData.maxCombinedTotal = modData.currentRunMaxCombinedTotal;
            }
            
            // Load granular control settings from saved data (use defaults if not present)
            if (modData.shadowAchievementMode !== undefined) {
                shadowAchievementMode = modData.shadowAchievementMode;
            }
            if (modData.enableCookieUpgrades !== undefined) {
                enableCookieUpgrades = modData.enableCookieUpgrades;
            }
            if (modData.enableBuildingUpgrades !== undefined) {
                enableBuildingUpgrades = modData.enableBuildingUpgrades;
            }
            if (modData.enableKittenUpgrades !== undefined) {
                enableKittenUpgrades = modData.enableKittenUpgrades;
            }
            
            // Also update modSettings for compatibility with existing UI
            modSettings.shadowAchievements = shadowAchievementMode;
            modSettings.enableCookieUpgrades = enableCookieUpgrades;
            modSettings.enableBuildingUpgrades = enableBuildingUpgrades;
            modSettings.enableKittenUpgrades = enableKittenUpgrades;
            
            // Restore achievement states from the saved data
            if (modData.achievements) {
                Object.keys(modData.achievements).forEach(achievementName => {
                    if (Game.Achievements[achievementName]) {
                        // Restore the 'won' state
                        Game.Achievements[achievementName].won = modData.achievements[achievementName].won || 0;
                        
                        // If the achievement was won, ensure it's marked as won
                        // This prevents notifications when the mod loads
                        if (Game.Achievements[achievementName].won > 0) {
                            markAchievementWonFromSave(achievementName);
                        }
                    }
                });
            }
            
        } catch (error) {
            // If there's an error parsing the save data, just continue
            // This prevents the mod from breaking if the save format changes
            console.warn('Error loading achievements data:', error);
        }
    }
    
    // Hook into game's upgrade checking (legacy function - now handled by centralized system)
    function hookUpgradeChecking() {
        // Store original upgrade checking function
        if (!Game.originalCheckUpgrades) {
            Game.originalCheckUpgrades = Game.CheckUpgrades;
        }
        
        // Override with our version that includes our upgrades
        Game.CheckUpgrades = function() {
            // Call original function
            if (Game.originalCheckUpgrades) {
                Game.originalCheckUpgrades();
            }
            
            // Check our upgrades
            checkUpgrades();
        };
    }
    
    // Register the mod using the proper Cookie Clicker Modding API (like upgrades.js)
    Game.registerMod('JustNaturalExpansionModtest', {
        name: modName,
        version: modVersion,
        
        // init() is called when the mod is first loaded
        init: function() {

            // Trigger Third-party achievement and notify user that mod has loaded (only when not in competition-like mode)
            if (Game.Win && !(shadowAchievementMode && !enableCookieUpgrades && !enableBuildingUpgrades && !enableKittenUpgrades)) {
                Game.Win('Third-party');
            }
          

            // Notify user that the mod has loaded with persistent notes
            if (Game.popups && Game.Note) {
                new Game.Note(modName + ' v' + modVersion + ' Mod Loaded!', 'Use the options menu to configure settings for ' + modName + '.', modIcon, 999);

                // Check if we're in competition-like mode
                var isCompetitionLike = shadowAchievementMode && !enableCookieUpgrades && !enableBuildingUpgrades && !enableKittenUpgrades;
                
                if (isCompetitionLike) {
                    new Game.Note(modName + ' v' + modVersion + ' - Competition Mode', 'Mod is being run in competition mode. No changes to gameplay are added and all achievements are shadow achievements. This mod is functioning as cosmetic only and will not impact your score.', modIcon, 999);
                } 
            }
            
            // Create upgrades system
            createUpgrades();
            
            // Initialize tracking variables
            initializeSeasonalReindeerTracking();
            initializeShinyWrinklerTracking();
            initializeTempleSwapTracking();
            initializeSoilChangeTracking();
            initializeWrathCookieTracking();
            
            // Register all hooks with centralized system
            registerAllHooks();
            
            // Create achievements and other mod features
            initAchievements();
            
            // Set up custom building multipliers (after game is fully loaded)
            setTimeout(addCustomBuildingMultipliers, 2000);
            
            // Initialize menu system
            injectMenus();
            
                    // Mark mod as initialized after all setup is complete
        setTimeout(function() {
            modInitialized = true;
    
            
            // Sync mod settings to ensure they're properly applied
            if (modSettings.shadowAchievements !== undefined) {
                shadowAchievementMode = modSettings.shadowAchievements;
            }
            if (modSettings.enableCookieUpgrades !== undefined) {
                enableCookieUpgrades = modSettings.enableCookieUpgrades;
            }
            if (modSettings.enableBuildingUpgrades !== undefined) {
                enableBuildingUpgrades = modSettings.enableBuildingUpgrades;
            }
            if (modSettings.enableKittenUpgrades !== undefined) {
                enableKittenUpgrades = modSettings.enableKittenUpgrades;
            }
            
            // Update menu buttons to reflect loaded settings
            updateMenuButtons();
            
            // Reapply upgrade settings based on loaded values
            if (modSettings.enableCookieUpgrades !== undefined) {
                applyUpgradeChange('enableCookieUpgrades', modSettings.enableCookieUpgrades);
            }
            if (modSettings.enableBuildingUpgrades !== undefined) {
                applyUpgradeChange('enableBuildingUpgrades', modSettings.enableBuildingUpgrades);
            }
            if (modSettings.enableKittenUpgrades !== undefined) {
                applyUpgradeChange('enableKittenUpgrades', modSettings.enableKittenUpgrades);
            }
            
            // Reapply shadow achievement setting
            if (modSettings.shadowAchievements !== undefined) {
                applyShadowAchievementChange(modSettings.shadowAchievements);
            }
            
            // Check if the player has used the mod outside shadow mode and award "Beyond the Leaderboard"
            if (modSettings.hasUsedModOutsideShadowMode && Game.Achievements['Beyond the Leaderboard'] && !Game.Achievements['Beyond the Leaderboard'].won) {
                markAchievementWon('Beyond the Leaderboard');
            }
                        
          // Hook into the game's ticker system using the proper mod hook
            if (Game.modHooks && Game.modHooks['ticker']) {
                Game.modHooks['ticker'].push(function() {
                    return [
                        'News : People all over the globe are suddenly feeling much less accomplished. Scientists baffled.',
                        'News : Things seem different—no one can place a finger on it—but everything looks tilted 4 degrees to the left.',
                        'News : Reports from all over the globe of new kittens being spotted. Nobody knows where they’re coming from.',
                        'News : What in the name of our grandmas just happened?',
                        'News : Whispers in the shadows suggest there are now... more shadows.',
                        'News : Hundreds of new challenges quietly arrive. No one told the cookies.',
                        'News : Unconfirmed reports claim at least 459 new ways to feel inadequate.',
                        'News : Stock market instability linked to unnatural upgrade inflation.',
                        'News : Pantheon activity spikes as gods are swapped at alarming rates.',
                        'News : Soil composition changes detected. Gardeners report "increased anxiety and delight."',
                        'News : Spells cast into the thousands. Wizards report wrist pain and arcane satisfaction.',
                        'News : Magical anomalies suggest you might be doing something very, very right.',
                        'News : Garden plants begin whispering compliments. Players unsure how to respond.',
                        'News : Golden cookies now rumored to be watching you back.',
                        'News : New building upgrades discovered. Nobody remembers researching them.',
                        'News : Some achievements now come with existential weight. Proceed with joy.',
                        'News : Leaderboard panic: new achievements now visible to those brave enough to scroll.',
                        'News : Completionists spotted crying in joy. And possibly fear.',
                        'News : Reindeer have been spotted in the off-season. They do not look happy.'
                    ];
                });
            }
        }, 3000); // Give extra time for everything to settle
        },
        
        // save() is called automatically by the game when saving
        save: function() {
            // In debug mode or reset mode, return empty data to overwrite save with clean state
            if (debugMode || resetMode) {
                const emptyData = {
                    version: modVersion,
                    upgrades: {},
                    achievements: {},
                    lifetime: {}
                };
                return JSON.stringify(emptyData);
            }
            
            // Check if this is an ascension (Game.OnAscend > 0)
            // If ascending, don't save upgrade data so they reset to locked state
            var isAscending = Game.OnAscend && Game.OnAscend > 0;
            
            // Combine achievements and lifetime data
            const achievementsData = JSON.parse(saveAchievementsData());
            
            // Only include upgrade data if not ascending
            var upgradesData = {};
            if (!isAscending) {
                upgradesData = JSON.parse(saveUpgradesData());
            }
            
            // Create a copy of lifetime data without the sacrifice time
            var lifetimeDataToSave = {
                reindeerClicked: lifetimeData.reindeerClicked || 0,
                stockMarketAssets: lifetimeData.stockMarketAssets || 0,
                shinyWrinklersPopped: lifetimeData.shinyWrinklersPopped || 0,
                wrathCookiesClicked: lifetimeData.wrathCookiesClicked || 0,
                totalGardenSacrifices: lifetimeData.totalGardenSacrifices || 0,
                totalCookieClicks: lifetimeData.totalCookieClicks || 0,
                wrinklersPopped: lifetimeData.wrinklersPopped || 0,
                elderCovenantToggles: lifetimeData.elderCovenantToggles || 0,
                pledges: lifetimeData.pledges || 0,
                gardenSacrifices: lifetimeData.gardenSacrifices || 0,
                godUsageTime: lifetimeData.godUsageTime || {}
                // Note: lastGardenSacrificeTime is intentionally excluded
            };
            
            // Merge the data
            const combinedData = {
                version: modVersion,
                upgrades: upgradesData.upgrades || {},
                achievements: achievementsData.achievements || {},
                lifetime: lifetimeDataToSave,
                settings: modSettings
            };
            
            return JSON.stringify(combinedData);
        },
        
        // load() is called automatically by the game when loading
        load: function(str) {
            // Skip loading saved data in debug mode or reset mode to maintain clean state
            if (!debugMode && !resetMode) {
                try {
                    const modData = JSON.parse(str);
                    
                    // Load upgrades data
                    if (modData.upgrades) {
                        Object.keys(modData.upgrades).forEach(upgradeName => {
                            if (Game.Upgrades[upgradeName] && !upgradeName.includes('Kitten')) {
                                Game.Upgrades[upgradeName].bought = modData.upgrades[upgradeName].bought || 0;
                                if (Game.Upgrades[upgradeName].bought > 0) {
                                    Game.Upgrades[upgradeName].unlocked = 1;
                                }
                            }
                        });
                    }
                    
                    // Load achievements data
                    if (modData.achievements) {
                        Object.keys(modData.achievements).forEach(achievementName => {
                            if (Game.Achievements[achievementName]) {
                                Game.Achievements[achievementName].won = modData.achievements[achievementName].won || 0;
                                if (Game.Achievements[achievementName].won > 0) {
                                    markAchievementWonFromSave(achievementName);
                                }
                            }
                        });
                    }
                    
                            // Load lifetime data
        if (modData.lifetime) {
            lifetimeData = {
                reindeerClicked: modData.lifetime.reindeerClicked || 0,
                stockMarketAssets: modData.lifetime.stockMarketAssets || 0,
                shinyWrinklersPopped: modData.lifetime.shinyWrinklersPopped || 0,
                wrathCookiesClicked: modData.lifetime.wrathCookiesClicked || 0,
                totalGardenSacrifices: modData.lifetime.totalGardenSacrifices || 0,
                totalCookieClicks: modData.lifetime.totalCookieClicks || 0,
                wrinklersPopped: modData.lifetime.wrinklersPopped || 0,
                elderCovenantToggles: modData.lifetime.elderCovenantToggles || 0,
                pledges: modData.lifetime.pledges || 0,
                gardenSacrifices: modData.lifetime.gardenSacrifices || 0,
                godUsageTime: modData.lifetime.godUsageTime || {}
                // Note: lastGardenSacrificeTime is intentionally excluded from saves
            };
        }
        
        // Load mod settings
        if (modData.settings) {
            Object.keys(modData.settings).forEach(key => {
                if (key in modSettings) {
                    modSettings[key] = modData.settings[key];
                }
            });
            
            // Apply loaded settings to the actual control variables
            if (modSettings.shadowAchievements !== undefined) {
                shadowAchievementMode = modSettings.shadowAchievements;
            }
            if (modSettings.enableCookieUpgrades !== undefined) {
                enableCookieUpgrades = modSettings.enableCookieUpgrades;
            }
            if (modSettings.enableBuildingUpgrades !== undefined) {
                enableBuildingUpgrades = modSettings.enableBuildingUpgrades;
            }
            if (modSettings.enableKittenUpgrades !== undefined) {
                enableKittenUpgrades = modSettings.enableKittenUpgrades;
            }
        }
                    
                    // Force recalculation to apply effects immediately after loading
                    setTimeout(() => {
                        if (Game.CalculateGains) {
                            Game.CalculateGains();
                        }
                        if (Game.recalculateGains) {
                            Game.recalculateGains = 1;
                        }
                    }, 100);
                    
                } catch (error) {
                    console.warn('Error loading mod data:', error);
                }
            }
        }
    });
    
    // Initialize achievements and other mod features
    function initAchievements() {
        // Create building achievements
        for (var buildingName in Game.ObjectsById) {
            var building = Game.ObjectsById[buildingName];
            if (!building || !building.single) continue;
            
            // Try to find the building data by different possible names
            var buildingData = achievementData.buildings[building.single] || 
                             achievementData.buildings[building.single.toLowerCase()] ||
                             achievementData.buildings[buildingName] ||
                             achievementData.buildings[buildingName.toLowerCase()];
            
            if (!buildingData) continue;
            
            var vanilla = findLastVanillaAchievement(buildingData.vanillaTarget);
            
            // Only create achievements if we found the vanilla achievement
            if (vanilla.order > 0) {
                createBuildingAchievements(buildingName, buildingData.names, buildingData.thresholds, vanilla.order, vanilla.icon, buildingData.customIcons);
            }
        }
        
        // Create other achievements
        for (var type in achievementData.other) {
            var data = achievementData.other[type];
            var vanilla = findLastVanillaAchievement(data.vanillaTarget);
            
            if (vanilla.order > 0) {
                for (var i = 0; i < data.names.length; i++) {
                    // Special handling for kittensOwned achievements - use different requirement types
                    var requirementType = type;
                    if (type === 'kittensOwned' && i === 1) {
                        requirementType = 'allKittensOwned';
                    }
                    
                    var requirement = createRequirementFunction(requirementType, data.thresholds[i]);
                    // Special handling for seed log achievements - they need to appear closer together
                    var orderOffset = (type === 'seedlog') ? (i + 1) * 0.00001 : (i + 1) * 0.01;
                    
                    // Special handling for buildingsSold achievements - ensure they appear after totalBuildings
                    if (type === 'buildingsSold') {
                        orderOffset = (i + 1) * 0.01 + 0.1; // Add extra offset to ensure they come after totalBuildings
                    }
                    
                    // Special handling for Faithless Loyalty achievement - set hard order number
                    var finalOrder = vanilla.order + orderOffset;
                    if (data.names[i] === 'Faithless Loyalty') {
                        finalOrder = 61490;
                    }
                    
                    // Special handling for God of All Gods achievement - set hard order number
                    if (data.names[i] === 'God of All Gods') {
                        finalOrder = 61490.01;
                    }
                    
                    // Special handling for garden achievements - set hard order numbers
                    if (data.names[i] === 'I feel the need for seed') {
                        finalOrder = 61515.430;
                    } else if (data.names[i] === 'Botanical Perfection') {
                        finalOrder = 61515.431;
                    } else if (data.names[i] === 'Duketater Salad') {
                        finalOrder = 61515.44;
                    } else if (data.names[i] === 'Fifty Shades of Clay') {
                        finalOrder = 61515.433;
                    }
                    
                    // Special handling for Golden wrinkler achievement - set hard order number
                    if (data.names[i] === 'Golden wrinkler') {
                        finalOrder = 21000.168;
                    }
                    
                    // Special handling for Wrinkler Windfall achievement - set hard order number
                    if (data.names[i] === 'Wrinkler Windfall') {
                        finalOrder = 21000.169;
        
                    }
                    
                    // Special handling for Sweet Sorcery achievement - set hard order number
                    if (data.names[i] === 'Sweet Sorcery') {
                        finalOrder = 61496.004;
                    }
                    
                    // Special handling for The Final Challenger achievement - set hard order number
                    if (data.names[i] === 'The Final Challenger') {
                        finalOrder = 30501;
                    }
                    
                    // Special handling for Broiler room achievement - set hard order number
                    if (data.names[i] === 'Broiler room') {
                        finalOrder = 61616.358;
                    }
                    
                    // Special handling for Wrinkler Rush achievement - set hard order number
                    if (data.names[i] === 'Wrinkler Rush') {
                        finalOrder = 21000.17;
                    }
                    
                    // Special handling for Buff Finger achievement - set hard order number
                    if (data.names[i] === 'Buff Finger') {
                        finalOrder = 7003;
                    }
                    
                    // Special handling for Click of the Titans achievement - set hard order number
                    if (data.names[i] === 'Click of the Titans') {
                        finalOrder = 7004;
                    }
                    
                    // Special handling for garden harvest achievements - set hard order numbers
                    if (data.names[i] === 'Greener, aching thumb') {
                        finalOrder = 61515.3791;
                    } else if (data.names[i] === 'Greenest, aching thumb') {
                        finalOrder = 61515.3792;
                    } else if (data.names[i] === 'Photosynthetic prodigy') {
                        finalOrder = 61515.3793;
                    } else if (data.names[i] === 'Garden master') {
                        finalOrder = 61515.3794;
                    } else if (data.names[i] === 'Plant whisperer') {
                        finalOrder = 61515.3795;
                    }
                    
                    var customIcon = data.customIcons && data.customIcons[i] ? data.customIcons[i] : null;
                    
                    // Debug logging for Wrinkler Windfall
                    if (data.names[i] === 'Wrinkler Windfall') {
                        
                    }
                    
                    // Debug logging for Frenzy Marathon
                    if (data.names[i] === 'Frenzy Marathon') {
                        
                    }
                    
                    createAchievement(
                        data.names[i],
                        data.descs[i],
                        vanilla.icon,
                        finalOrder,
                        requirement,
                        customIcon
                    );
                }
            }
        }
        
        // Create seasonal reindeer achievements
        createSeasonalReindeerAchievements();

        // Create level achievements for each building
        var levelAchievements = [
            { building: 'Cursor', level10: 'Freaky jazz hands', level15: 'Spastic jazz hands', level20: 'Epileptic jazz hands' },
            { building: 'Grandma', level10: 'Methuselah', level15: 'Noah', level20: 'Adam' },
            { building: 'Farm', level10: 'Huge tracts of land', level15: 'Massive tracts of land', level20: 'Colossal tracts of land' },
            { building: 'Mine', level10: 'D-d-d-d-deeper', level15: 'D-d-d-d-d-deeper', level20: 'D-d-d-d-d-d-deeper' },
            { building: 'Factory', level10: 'Patently genius', level15: 'Patent pending', level20: 'Patent granted' },
            { building: 'Bank', level10: 'A capital idea', level15: 'A capital notion', level20: 'A capital concept' },
            { building: 'Temple', level10: 'It belongs in a bakery', level15: 'It belongs in a cathedral', level20: 'It belongs in a basilica' },
            { building: 'Wizard tower', level10: 'Motormouth', level15: 'Chatterbox', level20: 'Blabbermouth' },
            { building: 'Shipment', level10: 'Been there done that', level15: 'Been everywhere done everything', level20: 'Been everywhere done everything twice' },
            { building: 'Alchemy lab', level10: 'Phlogisticated substances', level15: 'Phlogisticated compounds', level20: 'Phlogisticated elements' },
            { building: 'Portal', level10: 'Bizarro world', level15: 'Bizarro universe', level20: 'Bizarro multiverse' },
            { building: 'Time machine', level10: 'The long now', level15: 'The longer now', level20: 'The longest now' },
            { building: 'Antimatter condenser', level10: 'Chubby hadrons', level15: 'Plump hadrons', level20: 'Obese hadrons' },
            { building: 'Prism', level10: 'Palettable', level15: 'Palettastic', level20: 'Palettacular' },
            { building: 'Chancemaker', level10: 'Let\'s leaf it at that', level15: 'Lucky stars', level20: 'Lucky numbers' },
            { building: 'Fractal engine', level10: 'Sierpinski rhomboids', level15: 'Fractaliciousest', level20: 'Fractalicious' },
            { building: 'Javascript console', level10: 'Alexandria', level15: 'Debuggerer', level20: 'Debuggerest' },
            { building: 'Idleverse', level10: 'Strange topologies', level15: 'Idleverse implosion', level20: 'Idleverse explosion' },
            { building: 'Cortex baker', level10: 'Gifted', level15: 'Brain feast', level20: 'Brain banquet' },
            { building: 'You', level10: 'Self-improvement', level15: 'Copy that and a half', level20: 'Copy that twice' }
        ];
        
        for (var i = 0; i < levelAchievements.length; i++) {
            var ach = levelAchievements[i];
            var vanilla = findLastVanillaAchievement(ach.level10);
            
            if (vanilla.order > 0) {
                // Level 15 achievement
                createAchievement(
                    ach.level15,
                    "Reach Level <b>15</b> " + ach.building.toLowerCase() + "s.",
                    vanilla.icon,
                    vanilla.order + 0.01,
                    (function(buildingName) {
                        return function() { 
                            var building = Game.Objects[buildingName];
                            return building && building.level >= 15; 
                        };
                    })(ach.building)
                );
                
                // Level 20 achievement
                createAchievement(
                    ach.level20,
                    "Reach Level <b>20</b> " + ach.building.toLowerCase() + "s.",
                    vanilla.icon,
                    vanilla.order + 0.02,
                    (function(buildingName) {
                        return function() { 
                            var building = Game.Objects[buildingName];
                            return building && building.level >= 20; 
                        };
                    })(ach.building)
                );
            }
        }

        // Create extended production achievements for each building (tier 4, 5, 6)
        var productionAchievements = [
            { building: 'Cursor', name: 'Click (starring Adam Sandler)', tier4Desc: 'Make <b>1 quattuordecillion cookies</b> just from cursors.', tier5Desc: 'Make <b>1 septendecillion cookies</b> just from cursors.', tier6Desc: 'Make <b>1 novemdecillion cookies</b> just from cursors.', mult: 7, vanillaTarget: 'Click (starring Adam Sandler)' },
            { building: 'Grandma', name: 'Frantiquities', tier4Desc: 'Make <b>1 tredecillion cookies</b> just from grandmas.', tier5Desc: 'Make <b>1 sexdecillion cookies</b> just from grandmas.', tier6Desc: 'Make <b>1 octodecillion cookies</b> just from grandmas.', mult: 6, vanillaTarget: 'Frantiquities' },
            { building: 'Farm', name: 'Overgrowth', tier4Desc: 'Make <b>1 decillion cookies</b> just from farms.', tier5Desc: 'Make <b>1 undecillion cookies</b> just from farms.', tier6Desc: 'Make <b>1 duodecillion cookies</b> just from farms.', mult: 0, vanillaTarget: 'Overgrowth' },
            { building: 'Mine', name: 'Sedimentalism', tier4Desc: 'Make <b>1 undecillion cookies</b> just from mines.', tier5Desc: 'Make <b>1 duodecillion cookies</b> just from mines.', tier6Desc: 'Make <b>1 tredecillion cookies</b> just from mines.', mult: 0, vanillaTarget: 'Sedimentalism' },
            { building: 'Factory', name: 'Labor of love', tier4Desc: 'Make <b>1 duodecillion cookies</b> just from factories.', tier5Desc: 'Make <b>1 tredecillion cookies</b> just from factories.', tier6Desc: 'Make <b>1 quattuordecillion cookies</b> just from factories.', mult: 0, vanillaTarget: 'Labor of love' },
            { building: 'Bank', name: 'Reverse funnel system', tier4Desc: 'Make <b>1 tredecillion cookies</b> just from banks.', tier5Desc: 'Make <b>1 quattuordecillion cookies</b> just from banks.', tier6Desc: 'Make <b>1 quindecillion cookies</b> just from banks.', mult: 0, vanillaTarget: 'Reverse funnel system' },
            { building: 'Temple', name: 'Thus spoke you', tier4Desc: 'Make <b>1 novemdecillion cookies</b> just from temples.', tier5Desc: 'Make <b>1 vigintillion cookies</b> just from temples.', tier6Desc: 'Make <b>1 unvigintillion cookies</b> just from temples.', mult: 0, vanillaTarget: 'Thus spoke you' },
            { building: 'Wizard tower', name: 'Manafest destiny', tier4Desc: 'Make <b>1 duovigintillion cookies</b> just from wizard towers.', tier5Desc: 'Make <b>1 trevigintillion cookies</b> just from wizard towers.', tier6Desc: 'Make <b>1 quattuorvigintillion cookies</b> just from wizard towers.', mult: 0, vanillaTarget: 'Manafest destiny' },
            { building: 'Shipment', name: 'Neither snow nor rain nor heat nor gloom of night', tier4Desc: 'Make <b>1 duodecillion cookies</b> just from shipments.', tier5Desc: 'Make <b>1 tredecillion cookies</b> just from shipments.', tier6Desc: 'Make <b>1 quattuordecillion cookies</b> just from shipments.', mult: 0, vanillaTarget: 'Neither snow nor rain nor heat nor gloom of night' },
            { building: 'Alchemy lab', name: 'I\'ve got the Midas touch', tier4Desc: 'Make <b>1 tredecillion cookies</b> just from alchemy labs.', tier5Desc: 'Make <b>1 quattuordecillion cookies</b> just from alchemy labs.', tier6Desc: 'Make <b>1 quindecillion cookies</b> just from alchemy labs.', mult: 0, vanillaTarget: 'I\'ve got the Midas touch' },
            { building: 'Portal', name: 'Which eternal lie', tier4Desc: 'Make <b>1 quattuordecillion cookies</b> just from portals.', tier5Desc: 'Make <b>1 quindecillion cookies</b> just from portals.', tier6Desc: 'Make <b>1 sexdecillion cookies</b> just from portals.', mult: 0, vanillaTarget: 'Which eternal lie' },
            { building: 'Time machine', name: 'D&eacute;j&agrave; vu', tier4Desc: 'Make <b>1 quindecillion cookies</b> just from time machines.', tier5Desc: 'Make <b>1 sexdecillion cookies</b> just from time machines.', tier6Desc: 'Make <b>1 septendecillion cookies</b> just from time machines.', mult: 0, vanillaTarget: 'D&eacute;j&agrave; vu' },
            { building: 'Antimatter condenser', name: 'Powers of Ten', tier4Desc: 'Make <b>1 sexdecillion cookies</b> just from antimatter condensers.', tier5Desc: 'Make <b>1 septendecillion cookies</b> just from antimatter condensers.', tier6Desc: 'Make <b>1 octodecillion cookies</b> just from antimatter condensers.', mult: 0, vanillaTarget: 'Powers of Ten' },
            { building: 'Prism', name: 'Now the dark days are gone', tier4Desc: 'Make <b>1 septendecillion cookies</b> just from prisms.', tier5Desc: 'Make <b>1 octodecillion cookies</b> just from prisms.', tier6Desc: 'Make <b>1 novemdecillion cookies</b> just from prisms.', mult: 0, vanillaTarget: 'Now the dark days are gone' },
            { building: 'Chancemaker', name: 'Murphy\'s wild guess', tier4Desc: 'Make <b>1 octodecillion cookies</b> just from chancemakers.', tier5Desc: 'Make <b>1 novemdecillion cookies</b> just from chancemakers.', tier6Desc: 'Make <b>1 vigintillion cookies</b> just from chancemakers.', mult: 0, vanillaTarget: 'Murphy\'s wild guess' },
            { building: 'Fractal engine', name: 'We must go deeper', tier4Desc: 'Make <b>1 novemdecillion cookies</b> just from fractal engines.', tier5Desc: 'Make <b>1 vigintillion cookies</b> just from fractal engines.', tier6Desc: 'Make <b>1 unvigintillion cookies</b> just from fractal engines.', mult: 0, vanillaTarget: 'We must go deeper' },
            { building: 'Javascript console', name: 'First-class citizen', tier4Desc: 'Make <b>1 vigintillion cookies</b> just from javascript consoles.', tier5Desc: 'Make <b>1 unvigintillion cookies</b> just from javascript consoles.', tier6Desc: 'Make <b>1 duovigintillion cookies</b> just from javascript consoles.', mult: 0, vanillaTarget: 'First-class citizen' },
            { building: 'Idleverse', name: 'Earth-616', tier4Desc: 'Make <b>1 unvigintillion cookies</b> just from idleverses.', tier5Desc: 'Make <b>1 duovigintillion cookies</b> just from idleverses.', tier6Desc: 'Make <b>1 trevigintillion cookies</b> just from idleverses.', mult: 0, vanillaTarget: 'Earth-616' },
            { building: 'Cortex baker', name: 'Unthinkable', tier4Desc: 'Make <b>1 duovigintillion cookies</b> just from cortex bakers.', tier5Desc: 'Make <b>1 trevigintillion cookies</b> just from cortex bakers.', tier6Desc: 'Make <b>1 quattuorvigintillion cookies</b> just from cortex bakers.', mult: 0, vanillaTarget: 'Unthinkable' },
            { building: 'You', name: 'That\'s all you', tier4Desc: 'Make <b>1 trevigintillion cookies</b> just from You.', tier5Desc: 'Make <b>1 quattuorvigintillion cookies</b> just from You.', tier6Desc: 'Make <b>1 quinvigintillion cookies</b> just from You.', mult: 0, vanillaTarget: 'That\'s all you' }
        ];
        
        for (var i = 0; i < productionAchievements.length; i++) {
            var ach = productionAchievements[i];
            var vanilla = findLastVanillaAchievement(ach.vanillaTarget);
            
            if (vanilla.order > 0) {
                var building = Game.Objects[ach.building];
                if (!building) continue;
                
                // Calculate thresholds using the same formula as vanilla
                var baseN = 12 + building.n + (ach.mult || 0);
                
                // Tier 4 achievement (51 more than tier 3 - 10,000x increase)
                var tier4Threshold = Math.pow(10, baseN + 51);
                createAchievement(
                    ach.name + " II",
                    ach.tier4Desc,
                    vanilla.icon,
                    vanilla.order + 0.00001,
                    (function(buildingName, threshold) {
                        return function() { 
                            return Game.Objects[buildingName] && 
                                   Game.Objects[buildingName].amount * Game.Objects[buildingName].cps(1) >= threshold; 
                        };
                    })(ach.building, tier4Threshold)
                );
                
                // Tier 5 achievement (57 more than tier 3 - 1,000,000x increase from tier 4)
                var tier5Threshold = Math.pow(10, baseN + 57);
                createAchievement(
                    ach.name + " III",
                    ach.tier5Desc,
                    vanilla.icon,
                    vanilla.order + 0.00002,
                    (function(buildingName, threshold) {
                        return function() { 
                            return Game.Objects[buildingName] && 
                                   Game.Objects[buildingName].amount * Game.Objects[buildingName].cps(1) >= threshold; 
                        };
                    })(ach.building, tier5Threshold)
                );
                
                // Tier 6 achievement (63 more than tier 3 - 1,000,000x increase from tier 5)
                var tier6Threshold = Math.pow(10, baseN + 63);
                createAchievement(
                    ach.name + " IV",
                    ach.tier6Desc,
                    vanilla.icon,
                    vanilla.order + 0.00003,
                    (function(buildingName, threshold) {
                        return function() { 
                            return Game.Objects[buildingName] && 
                                   Game.Objects[buildingName].amount * Game.Objects[buildingName].cps(1) >= threshold; 
                        };
                    })(ach.building, tier6Threshold)
                );
            }
        }
        
        // Create "Beyond the Leaderboard" achievement - awarded when mod has been used outside shadow mode
        var beyondLeaderboardAchievement = createAchievement(
            'Beyond the Leaderboard',
            'Natural Expansion Mod has been used outside of Leaderboard/Competition mode.',
            [26, 30], // Custom icon
            10000.25, // Order as requested
            function() {
                // Award this achievement if the mod has been used with shadow achievements disabled
                // This is a one-time achievement that gets awarded when the mod is first loaded
                // and the player has used the mod in non-shadow mode at least once
                return false; // This will be manually awarded when appropriate
            },
            [26, 30] // Custom icon
        );
        
        // Force this achievement into the shadow pool with correct order
        if (beyondLeaderboardAchievement) {
            beyondLeaderboardAchievement.pool = 'shadow';
            beyondLeaderboardAchievement.order = 10000.25;
        }
        
        // Create "In the Shadows" achievement - requires all vanilla shadow achievements except "Cheated cookies taste awful"
        createAchievement(
            'In the Shadows',
            'Unlock all vanilla shadow achievements, except that one.<q>You know the one I meant</q>',
            [17, 5], // Custom icon
            400000.2, // Order as requested
            function() {
                // Check if "Cheated cookies taste awful" has been earned - if so, don't award this achievement
                if (Game.Achievements['Cheated cookies taste awful'] && Game.Achievements['Cheated cookies taste awful'].won) {
                    return false;
                }
                
                // List of required vanilla shadow achievements
                var requiredAchievements = [
                    'Four‑leaf cookie',
                    'Seven horseshoes', 
                    'All‑natural cane sugar',
                    'Endless cycle',
                    'God complex',
                    'Third‑party',
                    'When the cookies ascend just right',
                    'Speed baking I',
                    'Speed baking II',
                    'Speed baking III',
                    'True Neverclick',
                    'In her likeness',
                    'Just plain lucky',
                    'Last Chance to See',
                    'So much to do so much to see',
                    'Gaseous assets'
                ];
                
                // Check if all required achievements are unlocked
                for (var i = 0; i < requiredAchievements.length; i++) {
                    var achievementName = requiredAchievements[i];
                    if (!Game.Achievements[achievementName] || !Game.Achievements[achievementName].won) {
                        return false; // Missing achievement, don't award
                    }
                }
                
                // All required achievements are unlocked and "Cheated cookies taste awful" is not unlocked
                return true;
            },
            [17, 5] // Custom icon
        );
        
        // Check if we should mark "Beyond the Leaderboard" as won based on current settings
        checkAndMarkBeyondTheLeaderboard();
    }
    
    function checkModAchievements() {
        if (!Game || !Game.Achievements) return;
        

        
        // Check all mod achievements 
        for (var achId in Game.Achievements) {
            var ach = Game.Achievements[achId];
            if (ach && ach.requirement && !ach.won) {
                try {
                    if (ach.requirement()) {
                        markAchievementWon(ach.name);
                    }
                } catch (e) {
                    console.warn('Error checking achievement requirement:', ach.name, e);
                }
            }
        }
        
                // Check seasonal reindeer achievements
        for (var season in seasonalReindeerData) {
            if (seasonalReindeerData[season].popped && seasonalReindeerData[season].achievement) {
                var achievementName = seasonalReindeerData[season].achievement;
                if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                    markAchievementWon(achievementName);
                }
            }
        }
        
            // Check garden seeds time achievement
    if (Game.startDate) {
        var plantCount = countGardenPlants();
        
        // Check if all plants are unlocked and within time limit from last garden sacrifice
        if (plantCount.unlocked >= plantCount.total && lifetimeData.lastGardenSacrificeTime) {
            var currentTime = Date.now();
            var timeElapsed = currentTime - lifetimeData.lastGardenSacrificeTime;
            var fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
            
            if (timeElapsed <= fiveDaysInMs) {
                var achievementName = 'I feel the need for seed';
                if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                    markAchievementWon(achievementName);
                }
            }
        }
    }
    
    // Frenzy Marathon achievement is now handled in the logic hook for real-time checking
    
    // Check buff achievements (moved to logic hook for immediate response)
    // This function is now called from the logic hook instead
        
        // Check seasonal drops time achievement
        if (Game.startDate) {
            var currentTime = Date.now();
            var timeElapsed = currentTime - Game.startDate;
            var sixtyMinutesInMs = 60 * 60 * 1000;
            
            // Check if within time limit first
            if (timeElapsed <= sixtyMinutesInMs) {
                // Check Easter condition
                var easterComplete = Game.easterEggs && Game.easterEggs.length >= 20;
                
                // Check Halloween condition
                var halloweenComplete = Game.Has('Skull cookies') && Game.Has('Ghost cookies') && 
                                      Game.Has('Bat cookies') && Game.Has('Slime cookies') && 
                                      Game.Has('Pumpkin cookies') && Game.Has('Eyeball cookies') && 
                                      Game.Has('Spider cookies');
                
                // Check Christmas condition
                var christmasComplete = Game.Has('Christmas tree biscuits') && Game.Has('Snowflake biscuits') && 
                                       Game.Has('Snowman biscuits') && Game.Has('Holly biscuits') && 
                                       Game.Has('Candy cane biscuits') && Game.Has('Bell biscuits') && 
                                       Game.Has('Present biscuits');
                
                // Check Valentine's condition
                var valentinesComplete = Game.Has('Prism heart biscuits');
                
                if (easterComplete && halloweenComplete && christmasComplete && valentinesComplete) {
                    var achievementName = 'Holiday Hoover';
                    if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                        markAchievementWon(achievementName);
                    }
                }
            }
        }
        
        // Check stock market achievements
        if (Game.Objects['Bank'] && Game.Objects['Bank'].minigame && Game.Objects['Bank'].minigame.brokers !== undefined) {
            var brokers = Game.Objects['Bank'].minigame.brokers || 0;
            if (brokers >= 100) {
                var achievementName = 'Broiler room';
                if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                    markAchievementWon(achievementName);
                }
            }
        }
        
        // Check hardercorest achievement
        if ((Game.ascensionMode == 1 || Game.resets == 0)) {
            if (Game.cookiesEarned >= 1e12 && Game.cookieClicks <= 0 && Game.UpgradesOwned <= 0) {
                var achievementName = 'Hardercorest';
                if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                    markAchievementWon(achievementName);
                }
            }
        }
        
        // Check hardercorest-er achievement
        if ((Game.ascensionMode == 1 || Game.resets == 0)) {
            if (Game.cookiesEarned >= 1e9) {
                // Check if no more than 15 cookie clicks
                if (Game.cookieClicks <= 15) {
                    // Check if no more than 15 buildings owned
                    let totalBuildingsOwned = 0;
                    for (let buildingName in Game.Objects) {
                        totalBuildingsOwned += Game.Objects[buildingName].amount || 0;
                    }
                    if (totalBuildingsOwned <= 15) {
                        // Check if no more than 15 upgrades owned
                        if (Game.UpgradesOwned <= 15) {
                            // Check if no buildings have been sold
                            let totalBuildingsSold = 0;
                            for (let buildingName in Game.Objects) {
                                const building = Game.Objects[buildingName];
                                const bought = building.bought || 0;
                                const amount = building.amount || 0;
                                const sold = bought - amount;
                                totalBuildingsSold += Math.max(0, sold);
                            }
                            if (totalBuildingsSold <= 0) {
                                var achievementName = 'Hardercorest-er';
                                if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                                    markAchievementWon(achievementName);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Check hardcore no heavenly chips achievement
        if (!Game.Has('Heavenly chip secret')) {
            // Check if any buildings have been sold
            var heavenlyChipsBuildingsSold = 0;
            for (var buildingName in Game.Objects) {
                var building = Game.Objects[buildingName];
                var bought = building.bought || 0;
                var amount = building.amount || 0;
                var sold = bought - amount;
                heavenlyChipsBuildingsSold += Math.max(0, sold);
            }
            
            if (heavenlyChipsBuildingsSold <= 0) {
                // Check if player has at least 500 of every building type
                var allBuildingsHave500 = true;
                for (var buildingName in Game.Objects) {
                    var building = Game.Objects[buildingName];
                    if (!building || building.amount < 500) {
                        allBuildingsHave500 = false;
                        break;
                    }
                }
                
                if (allBuildingsHave500) {
                    var achievementName = 'We don\'t need no heavenly chips';
                    if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                        markAchievementWon(achievementName);
                    }
                }
            }
        }
        
        // Check hardcore final countdown achievement
        if ((Game.ascensionMode == 1 || Game.resets == 0)) {
            // Check if any buildings have been sold
            var countdownCheckBuildingsSold = 0;
            for (var buildingName in Game.Objects) {
                var building = Game.Objects[buildingName];
                var bought = building.bought || 0;
                var amount = building.amount || 0;
                var sold = bought - amount;
                countdownCheckBuildingsSold += Math.max(0, sold);
            }
            
            if (countdownCheckBuildingsSold <= 0) {
                // Define the exact building counts required (20 down to 1)
                var requiredCounts = {
                    'Cursor': 20,
                    'Grandma': 19,
                    'Farm': 18,
                    'Mine': 17,
                    'Factory': 16,
                    'Bank': 15,
                    'Temple': 14,
                    'Wizard tower': 13,
                    'Shipment': 12,
                    'Alchemy lab': 11,
                    'Portal': 10,
                    'Time machine': 9,
                    'Antimatter condenser': 8,
                    'Prism': 7,
                    'Chancemaker': 6,
                    'Fractal engine': 5,
                    'Javascript console': 4,
                    'Idleverse': 3,
                    'Cortex baker': 2,
                    'You': 1
                };
                
                // Check if each building has exactly the required amount
                var allBuildingsCorrect = true;
                for (var buildingName in requiredCounts) {
                    var building = Game.Objects[buildingName];
                    if (!building || building.amount !== requiredCounts[buildingName]) {
                        allBuildingsCorrect = false;
                        break;
                    }
                }
                
                if (allBuildingsCorrect) {
                    var achievementName = 'The Final Countdown';
                    if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                        markAchievementWon(achievementName);
                    }
                }
            }
        }
        
        // Check hardcore no kittens achievement
        if ((Game.ascensionMode == 1 || Game.resets == 0)) {
            if ((Game.cookiesPsRaw || 0) >= 1e9) {
                // Check if any kitten upgrades have been bought
                var anyKittenUpgradesBought = false;
                for (var i = 0; i < Game.UpgradesByPool['kitten'].length; i++) {
                    if (Game.Has(Game.UpgradesByPool['kitten'][i].name)) {
                        anyKittenUpgradesBought = true;
                        break;
                    }
                }
                
                if (!anyKittenUpgradesBought) {
                    var achievementName = 'Really more of a dog person';
                    if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                        markAchievementWon(achievementName);
                    }
                }
            }
        }
        
        // Check all buildings level 10 achievement
        var allBuildingsLevel10 = true;
        for (var buildingName in Game.Objects) {
            var building = Game.Objects[buildingName];
            if (!building || building.level < 10) {
                allBuildingsLevel10 = false;
                break;
            }
        }
        if (allBuildingsLevel10) {
            var achievementName = 'Have your sugar and eat it too';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        // Check season switches achievement
        var seasonUses = Game.seasonUses || 0;
        if (seasonUses >= 50) {
            var achievementName = 'Calendar Abuser';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        // Check sugar lumps achievement
        var sugarLumps = Game.lumps || 0;
        if (sugarLumps >= 100) {
            var achievementName = 'Sweet Child of Mine';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        // Check vanilla achievements achievement
        var vanillaAchievementsOwned = 0;
        for (var i in Game.AchievementsById) {
            var me = Game.AchievementsById[i];
            if (me.won && me.vanilla == 1) {
                vanillaAchievementsOwned++;
            }
        }
        if (vanillaAchievementsOwned >= 622) {
            var achievementName = 'Vanilla Star';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        // Check botanical perfection achievement
        if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
            var M = Game.Objects['Farm'].minigame;
            var maturePlantTypes = {};
            
            // Check each plot for mature plants
            if (M.plot && M.plantsById) {
                // Garden uses M.plot[y][x] structure where plot[y][x][0] is plant ID
                for (var y = 0; y < 6; y++) {
                    for (var x = 0; x < 6; x++) {
                        if (M.plot[y][x][0] >= 1) {
                            var plantId = M.plot[y][x][0] - 1;
                            var plant = M.plantsById[plantId];
                            var plantAge = M.plot[y][x][1];
                            var isMature = plantAge >= plant.mature;
                            
                            if (plant && isMature) {
                                var plantName = plant.name;
                                if (plantName && !maturePlantTypes[plantName]) {
                                    maturePlantTypes[plantName] = true;
                                }
                            }
                        }
                    }
                }
            }
            
            // Count unique mature plant types
            var uniqueMatureTypes = 0;
            for (var plantType in maturePlantTypes) {
                uniqueMatureTypes++;
            }
            
            if (uniqueMatureTypes >= 34) {
                var achievementName = 'Botanical Perfection';
                if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                    markAchievementWon(achievementName);
                }
            }
            
            // Note: Duketater Salad achievement is now handled by the harvest all hook
        }
        
        // Check temple swaps achievement
        var templeSwaps = Game.templeSwapsTotal || 0;
        if (templeSwaps >= 100) {
            var achievementName = 'Faithless Loyalty';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        // Check soil changes achievement
        var soilChanges = Game.soilChangesTotal || 0;
        if (soilChanges >= 100) {
            var achievementName = 'Fifty Shades of Clay';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        // Check buildings sold achievements
        var buildingsSoldTotal = 0;
        for (var buildingName in Game.Objects) {
            var building = Game.Objects[buildingName];
            var bought = building.bought || 0;
            var amount = building.amount || 0;
            var sold = bought - amount;
            buildingsSoldTotal += Math.max(0, sold);
        }
        
        if (buildingsSoldTotal >= 10000) {
            var achievementName = 'Asset Liquidator';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        if (buildingsSoldTotal >= 25000) {
            var achievementName = 'Flip City';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        if (buildingsSoldTotal >= 50000) {
            var achievementName = 'Ghost Town Tycoon';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        // Check ticker clicks achievement
        var tickerClicks = Game.TickerClicks || 0;
        if (tickerClicks >= 1000) {
            var achievementName = 'News ticker addict';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        // Check wrath cookie achievements
        var lifetimeWrathCookies = getLifetimeWrathCookies();
        
        if (lifetimeWrathCookies >= 66) {
            var achievementName = 'Warm-Up Ritual';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        if (lifetimeWrathCookies >= 666) {
            var achievementName = 'Deal of the Slightly Damned';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        if (lifetimeWrathCookies >= 6666) {
            var achievementName = 'Baker of the Beast';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
        
        // Check golden cookie time achievement
        if (Game.startDate) {
            var currentTime = Date.now();
            var timeElapsed = currentTime - Game.startDate;
            var twoMinutesInMs = 120 * 1000;
            
            if (timeElapsed <= twoMinutesInMs && (Game.goldenClicksLocal || 0) > 0) {
                var achievementName = 'Second Life, First Click';
                if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                    markAchievementWon(achievementName);
                }
            }
        }
        
        // Check The Final Challenger achievement (10 out of 15 challenge achievements)
        var challengeAchievementNames = [
            'Hardercorest',
            'Hardercorest-er', 
            'The Final Countdown',
            'Really more of a dog person',
            'Gilded Restraint',
            'Back to Basic Bakers',
            'Modest Portfolio',
            'Difficult Decisions',
            'Laid in Plain Sight',
            'I feel the need for seed',
            'Holiday Hoover',
            'Merry Mayhem',
            'Second Life, First Click',
            'We don\'t need no heavenly chips',
            'Precision Nerd'
        ];
        
        var challengeAchievementsWon = 0;
        for (var i = 0; i < challengeAchievementNames.length; i++) {
            var achievementName = challengeAchievementNames[i];
            if (Game.Achievements[achievementName] && Game.Achievements[achievementName].won) {
                challengeAchievementsWon++;
            }
        }
        
        if (challengeAchievementsWon >= 10) {
            var achievementName = 'The Final Challenger';
            if (Game.Achievements[achievementName] && !Game.Achievements[achievementName].won) {
                markAchievementWon(achievementName);
            }
        }
    }
    
    // Initialize achievement checking (now handled by centralized hook system)
    function initializeAchievementChecking() {
        // This function is now handled by the centralized hook system
    }
    
        // Start initialization
    setTimeout(function() {
        try {

            // Debug mode: reset all progress first for clean testing environment
            if (debugMode) {
                resetAllProgress();
            }
            
            // Preload sprite sheets for better performance
            preloadSpriteSheets();

            // Debug mode: unlock all achievements for testing
            if (debugMode) {
                unlockAllAchievements();
            }
            

        } catch (e) {
            console.error('Error during mod initialization:', e);
        }
    }, 1000);

    // Add custom multiplier to the tiered CpS calculation
    function addCustomBuildingMultipliers() {
        // Prevent multiple calls
        if (Game.customMultipliersSetup) {
            return;
        }
        
                  // Skip custom multiplier setup if building upgrades are disabled
          if (!enableBuildingUpgrades) {
              return;
          }
        
        // Safety check: ensure Game and GetTieredCpsMult exist
        if (!Game || !Game.GetTieredCpsMult) {
            console.warn('Game or GetTieredCpsMult not available, skipping custom multiplier setup');
            return;
        }
        
        // Additional safety check: ensure buildings are initialized
        if (!Game.Objects || Object.keys(Game.Objects).length === 0) {
            console.warn('Game.Objects not available, skipping custom multiplier setup');
            return;
        }
        
        // Store the original function
        if (!Game.originalGetTieredCpsMult) {
            Game.originalGetTieredCpsMult = Game.GetTieredCpsMult;
        }
        
        // Override with our version that includes custom multipliers
        Game.GetTieredCpsMult = function(me) {
            // Safety check: ensure we have a valid building and original function
            if (!me || !me.name || !Game.originalGetTieredCpsMult) {
                return 1; // Return default multiplier if something is missing (no warning spam)
            }
            
            var mult = 1; // Initialize with safe default
            
            try {
                mult = Game.originalGetTieredCpsMult(me);
                
                // Safety check: ensure we got a valid number back
                if (typeof mult !== 'number' || isNaN(mult) || !isFinite(mult)) {
                    mult = 1; // Default to 1 if the original function returned invalid value
                }
            } catch (e) {
                mult = 1;
            }
            
            // Add our custom multipliers for all buildings
            if (upgradeData.building) {
                for (var i = 0; i < upgradeData.building.length; i++) {
                    var upgradeInfo = upgradeData.building[i];
                    if (upgradeInfo && upgradeInfo.building === me.name && Game.Upgrades[upgradeInfo.name] && Game.Upgrades[upgradeInfo.name].bought) {
                        mult *= 1.08; // Stack multiplicatively
                    }
                }
            }
            
            // Final safety check: ensure we return a valid number
            if (typeof mult !== 'number' || isNaN(mult) || !isFinite(mult)) {
                mult = 1;
            }
            
            return mult;
        };
        
        // Mark as setup to prevent multiple calls
        Game.customMultipliersSetup = true;

    }

    // Apply building discount based on owned upgrades
    function applyBuildingDiscount(buildingName, discountUpgrades) {
        if (Game.Objects[buildingName]) {
            // Store the original modifyBuildingPrice function
            const originalModifyBuildingPrice = Game.modifyBuildingPrice;
            
            // Override Game.modifyBuildingPrice to apply our discount
            Game.modifyBuildingPrice = function(building, price) {
                // Call the original function first
                price = originalModifyBuildingPrice.call(this, building, price);
                
                // Apply our cumulative discount specifically for the target building
                if (building.name === buildingName) {
                    var discountMultiplier = 1.0;
                    
                    // Check each discount upgrade for this building
                    for (var i = 0; i < discountUpgrades.length; i++) {
                        var upgradeName = discountUpgrades[i];
                        if (Game.Upgrades[upgradeName] && Game.Upgrades[upgradeName].bought) {
                            discountMultiplier *= 0.95; // Apply 5% discount cumulatively
                        }
                    }
                    
                    price *= discountMultiplier;
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

    // Initialize building discounts when mod loads
    setTimeout(function() {
        var grandmaDiscountUpgrades = ['Increased Social Security Checks', 'Off-Brand Eyeglasses', 'Plastic Walkers', 'Bulk Discount Hearing Aids', 'Generic Arthritis Medication', 'Wholesale Denture Adhesive'];
        applyBuildingDiscount('Grandma', grandmaDiscountUpgrades);
        
        var farmDiscountUpgrades = ['Biodiesel fueled tractors', 'Free manure from clone factories', 'Solar-powered irrigation systems', 'Bulk seed purchases', 'Robot farm hands', 'Vertical farming subsidies'];
        applyBuildingDiscount('Farm', farmDiscountUpgrades);
        
        var mineDiscountUpgrades = ['Recycled mining equipment', 'Bulk dynamite purchases', 'Solar-powered drills', 'Robot mining crews', 'Government mining subsidies', 'Underground cookie cities'];
        applyBuildingDiscount('Mine', mineDiscountUpgrades);
        
        var factoryDiscountUpgrades = ['Recycled assembly lines', 'Bulk steel purchases', 'Solar-powered machinery', 'Robot assembly workers', 'Government manufacturing subsidies', 'Automated cookie cities'];
        applyBuildingDiscount('Factory', factoryDiscountUpgrades);
        
        var bankDiscountUpgrades = ['Off-brand security systems', 'Wholesale safe deposits', 'Energy-efficient ATMs', 'Automated teller machines', 'Federal reserve support', 'Wall Street partnerships'];
        applyBuildingDiscount('Bank', bankDiscountUpgrades);
        
        var templeDiscountUpgrades = ['Generic prayer mats', 'Wholesale holy water', 'LED altar lighting', 'Automated prayer systems', 'Vatican endorsements', 'Holy cookie cities'];
        applyBuildingDiscount('Temple', templeDiscountUpgrades);
        
        var wizardTowerDiscountUpgrades = ['Recycled wizard equipment', 'Bulk spell book purchases', 'Solar-powered wizardry', 'Robot wizard apprentices', 'Government magic subsidies', 'Arcane cookie cities'];
        applyBuildingDiscount('Wizard tower', wizardTowerDiscountUpgrades);
        
        var shipmentDiscountUpgrades = ['Recycled shipping equipment', 'Bulk container purchases', 'Solar-powered shipping', 'Robot shipping crews', 'Government shipping subsidies', 'Port cookie cities'];
        applyBuildingDiscount('Shipment', shipmentDiscountUpgrades);
        
        var alchemyLabDiscountUpgrades = ['Discount alchemy supplies', 'Bulk philosopher\'s stone', 'Energy-efficient cauldrons', 'Automated potion brewers', 'Alchemist guild support', 'Transmutation districts'];
        applyBuildingDiscount('Alchemy lab', alchemyLabDiscountUpgrades);
        
        var portalDiscountUpgrades = ['Generic portal stabilizers', 'Bulk dimensional anchors', 'Energy-efficient rifts', 'Automated portal operators', 'Interdimensional council support', 'Dimensional cookie cities'];
        applyBuildingDiscount('Portal', portalDiscountUpgrades);
        
        var timeMachineDiscountUpgrades = ['Off-brand time crystals', 'Bulk temporal stabilizers', 'Energy-efficient chronometers', 'Automated time travelers', 'Temporal council support', 'Chronological cookie cities'];
        applyBuildingDiscount('Time machine', timeMachineDiscountUpgrades);
        
        var antimatterCondenserDiscountUpgrades = ['Generic antimatter containers', 'Bulk matter converters', 'Energy-efficient reactors', 'Automated particle accelerators', 'Particle physics institute support', 'Antimatter cookie cities'];
        applyBuildingDiscount('Antimatter condenser', antimatterCondenserDiscountUpgrades);
        
        var prismDiscountUpgrades = ['Discount prism lenses', 'Bulk light amplifiers', 'Energy-efficient spectrums', 'Automated light benders', 'Optical institute support', 'Spectrum cookie cities'];
        applyBuildingDiscount('Prism', prismDiscountUpgrades);
        
        var chancemakerDiscountUpgrades = ['Generic chance generators', 'Bulk fortune cookies', 'Energy-efficient luck', 'Automated fortune tellers', 'Luck institute support', 'Fortune cookie cities'];
        applyBuildingDiscount('Chancemaker', chancemakerDiscountUpgrades);
        
        var fractalEngineDiscountUpgrades = ['Off-brand fractal processors', 'Bulk pattern matrices', 'Energy-efficient recursion', 'Automated pattern generators', 'Mathematics institute support', 'Pattern cookie cities'];
        applyBuildingDiscount('Fractal engine', fractalEngineDiscountUpgrades);
        
        var javascriptConsoleDiscountUpgrades = ['Generic console terminals', 'Bulk code compilers', 'Energy-efficient debugging', 'Automated code reviewers', 'Programming institute support', 'Code cookie cities'];
        applyBuildingDiscount('Javascript console', javascriptConsoleDiscountUpgrades);
    }, 3000);
    

    
    // Create global mod object for external access
    window.JustNaturalExpansionMod = {
        toggleSetting: toggleSetting,
        applyShadowAchievementChange: applyShadowAchievementChange,
        applyUpgradeChange: applyUpgradeChange,
        applySettingChange: applySettingChange,
        settings: modSettings
    };
    
    // Debug function for duketater achievement
    window.debugDuketaterAchievement = function() {
        console.log('=== DUKETATER ACHIEVEMENT DEBUG ===');
        
        if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
            var M = Game.Objects['Farm'].minigame;
            console.log('Garden minigame found:', !!M);
            console.log('Garden minigame object:', M);
            
            if (M.plot && M.plantsById) {
                console.log('=== CURRENT GARDEN STATE ===');
                var totalPlants = 0;
                var maturePlants = 0;
                var duketaterDetails = [];
                var plantTypes = {};
                
                // Garden uses M.plot[y][x] structure where plot[y][x][0] is plant ID
                // Use the same approach as the working botanicalPerfection code
                for (var y = 0; y < M.plot.length; y++) {
                    for (var x = 0; x < M.plot[y].length; x++) {
                        var plotData = M.plot[y][x];
                        if (plotData && plotData[0] > 0) {
                            totalPlants++;
                            var plantId = plotData[0] - 1; // Plant IDs are 1-indexed
                            var plant = M.plantsById[plantId];
                            var plantAge = plotData[1];
                            var isMature = plantAge >= plant.mature;
                            
                            if (plant) {
                                // Count plant types
                                if (plantTypes[plant.name]) {
                                    plantTypes[plant.name]++;
                                } else {
                                    plantTypes[plant.name] = 1;
                                }
                                
                                // Track mature plants
                                if (isMature) {
                                    maturePlants++;
                                }
                                
                                // Special tracking for duketaters
                                if (plant.name === 'duketater') {
                                    duketaterDetails.push({
                                        position: `[${x},${y}]`,
                                        mature: isMature,
                                        age: plantAge,
                                        matureAge: plant.mature
                                    });
                                }
                            }
                        }
                    }
                }
                
                console.log('Total plots with plants:', totalPlants);
                console.log('Total mature plants:', maturePlants);
                console.log('Plant type distribution:', plantTypes);
                console.log('Duketater details:', duketaterDetails);
                console.log('Duketater count:', duketaterDetails.length);
                console.log('Mature duketaters:', duketaterDetails.filter(d => d.mature).length);
                console.log('Achievement threshold met:', duketaterDetails.filter(d => d.mature).length >= 12);
                
                // Check achievement status
                var achievementName = 'Duketater Salad';
                if (Game.Achievements[achievementName]) {
                    console.log('Achievement exists:', !!Game.Achievements[achievementName]);
                    console.log('Achievement won:', Game.Achievements[achievementName].won);
                    console.log('Achievement object:', Game.Achievements[achievementName]);
                } else {
                    console.log('❌ Achievement not found in Game.Achievements');
                }
                
                // Check hook status
                console.log('Harvest all hooked:', !!M._harvestAllHooked);
                console.log('Harvest all function exists:', !!M.harvestAll);
                console.log('Harvest all function type:', typeof M.harvestAll);
                
            } else {
                console.log('❌ No plots found in garden minigame (M.plot or M.plantsById missing)');
            }
        } else {
            console.log('❌ Farm building or garden minigame not found');
        }
        
        console.log('=== END DEBUG ===');
    };
    
    // Function to manually test the duketater counting logic
    window.testDuketaterCount = function() {
        console.log('=== TESTING DUKETATER COUNT LOGIC ===');
        
        if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
            var M = Game.Objects['Farm'].minigame;
            
            if (M.plot && M.plantsById) {
                var duketaterCount = 0;
                var matureDuketaters = 0;
                
                // Garden uses M.plot[y][x] structure where plot[y][x][0] is plant ID
                for (var y = 0; y < 6; y++) {
                    for (var x = 0; x < 6; x++) {
                        if (M.plot[y][x][0] >= 1) {
                            var plantId = M.plot[y][x][0] - 1;
                            var plant = M.plantsById[plantId];
                            var plantAge = M.plot[y][x][1];
                            
                            if (plant && plant.name.toLowerCase() === 'duketater') {
                                duketaterCount++;
                                var isMature = plantAge >= plant.mature;
                                if (isMature) {
                                    matureDuketaters++;
                                }
                                console.log(`Plot [${x},${y}]: duketater, age=${plantAge}, mature=${isMature}, matureAge=${plant.mature}`);
                            }
                        }
                    }
                }
                
                console.log(`Total duketaters: ${duketaterCount}`);
                console.log(`Mature duketaters: ${matureDuketaters}`);
                console.log(`Achievement threshold met: ${matureDuketaters >= 12}`);
                
                if (matureDuketaters >= 12) {
                    console.log('🎯 Achievement condition met!');
                } else {
                    console.log(`❌ Need ${12 - matureDuketaters} more mature duketaters`);
                }
            } else {
                console.log('❌ No plots available (M.plot or M.plantsById missing)');
            }
        } else {
            console.log('❌ Garden minigame not available');
        }
    };

})();