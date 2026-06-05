//////////////////////////////////////////////////////////////////////////////////////
// Mysteries of the Cookie Age v1.0.3 - Just Natural Expansion                       //
//                                                                                  //
// Look I cant stop you from digging into the source code but be aware              //
// that the entire thing is full of spoilers there is no way to hide how puzzles    //
// are solved or how the story unfolds in code. There is only fun killing ahead.    //
// Proceed at your own risk of loss of fun and content                              //
//////////////////////////////////////////////////////////////////////////////////////

(function() {
    'use strict';
    
    var expansionVersion = '1.0.3';
    var debugMode = false; // Set to true for testing
  
    var customSpriteSheetUrl = 'https://raw.githubusercontent.com/dfsw/Just-Natural-Expansion/refs/heads/main/updatedSpriteSheet.png';   
    var gardenSpriteSheetUrl = 'https://orteil.dashnet.org/cookieclicker/img/gardenPlants.png';
    var mainIconsSpriteSheetUrl = 'https://orteil.dashnet.org/cookieclicker/img/icons.png';

    var debugStartInvestigate = null; // Set to investigate puzzle ID, 'complete' to mark all as done, or null to start from beginning
    var debugStartInfiltrate = null;  // Set to infiltrate puzzle ID, 'complete' to mark all as done, or null to start from beginning
    var debugStartChoose = null;  // Set to choose puzzle ID, 'complete' to mark all as done, or null to start from beginning
    var debugExposePathPicked = null;  // Set to true for "Expose the Order", false for "Stand with the Order", or null to not set
   
    // ===== DETERMINISTIC TRACK ORDER SYSTEM =====
    // Define explicit puzzle order arrays to ensure consistent track ordering
    // These arrays serve as both the source of truth for puzzle IDs and their order
    var INVESTIGATE_PUZZLE_ORDER = [
        'proving_patience',        // trackOrder: 0
        'making_friendship',       // trackOrder: 1
        'small_token',             // trackOrder: 2
        'garden_sigil',            // trackOrder: 3
        'blessing_creator',        // trackOrder: 4
        'they_are_watching',       // trackOrder: 5
        'brother_onto_you',        // trackOrder: 6
        'send_word',               // trackOrder: 7
        'spy_purge',               // trackOrder: 8
        'close_call',              // trackOrder: 9
        'false_beacons',           // trackOrder: 10
        'infiltration_progress',   // trackOrder: 11
        'built_trust',             // trackOrder: 12
        'watch_keeper_rounds',     // trackOrder: 13
        'rosetta_stone',           // trackOrder: 14
        'mask_wears_thin',         // trackOrder: 15
        'still_with_us'            // trackOrder: 16
    ];

    var INFILTRATE_PUZZLE_ORDER = [
        'silent_choir',            // trackOrder: 0
        'spiral_seasons',          // trackOrder: 1
        'rite_shifting_measures',  // trackOrder: 2
        'initiation_riddle',       // trackOrder: 3
        'spirits_thrones',         // trackOrder: 4
        'brothers_masquerade',     // trackOrder: 5
        'pattern_altars',          // trackOrder: 6
        'litany_crumbs',           // trackOrder: 7
        'spiral_fortune',          // trackOrder: 8
        'wrinkler_clock',          // trackOrder: 9
        'feast_four',              // trackOrder: 10
        'trial_scales_patience',   // trackOrder: 11
        'garden_hearts',           // trackOrder: 12
        'veiled_ledger',           // trackOrder: 13
        'ringing_halls',           // trackOrder: 14
        'lawkeeper_walk',          // trackOrder: 15
        'compass_sentinel',        // trackOrder: 16
        'litany_broken_vows',      // trackOrder: 17
        'rite_fivefold_casting',   // trackOrder: 18
        'grandmatriarchs_flight',  // trackOrder: 19
        'ledger_bonds',            // trackOrder: 20
        'garden_pattern',          // trackOrder: 21
        'storm_devotion',          // trackOrder: 22
        'false_dawn',              // trackOrder: 23
        'rite_nine_flames',        // trackOrder: 24
        'six_jars_ledger',         // trackOrder: 25
        'nurses_fields',           // trackOrder: 26
        'rule_lights',             // trackOrder: 27
        'vaulted_relics',          // trackOrder: 28
        'sigils',                  // trackOrder: 29
        'garden_maze'              // trackOrder: 30
    ];

    var CHOOSE_PUZZLE_ORDER = [
        'schism_choice',           // trackOrder: 0
        'embrace_path',            // trackOrder: 1
        'loyalty_test',            // trackOrder: 2
        'rise_up',                 // trackOrder: 3
        'defeat_evil'              // trackOrder: 4
    ];

    // ===== PUZZLE ORDER UTILITIES =====
    // Get puzzle index based on registry definition order
    function getPuzzleIndex(puzzleId) {
        var index = 0;
        for (var id in cookieAgeData.puzzles.registry) {
            if (id === puzzleId) {
                return index;
            }
            index++;
        }
        return -1;
    }
    
    function getPuzzleIdByIndex(index) {
        ensurePuzzleSystemInitialized();
        if (!cookieAgeData || !cookieAgeData.puzzles || !cookieAgeData.puzzles.registry) {
            return null;
        }

        var count = 0;
        for (var id in cookieAgeData.puzzles.registry) {
            if (count === index) {
                return id;
            }
            count++;
        }

        return null;
    }
    
    // ===== COMPATIBILITY CHECK =====
    function checkBaseModCompatibility() {
        // Simple check: if Game.JNE exists, we know Game is loaded and base mod is loaded
        if (!Game.JNE) {
            console.error('[Cookie Age] Base Just Natural Expansion mod not found. Please load the base mod first.');
            return false;
        }
        
        debugLog('Base mod detected');
        return true;
    }
    
    // ===== DEBUGGING UTILITIES =====
    function debugLog() {
        if (!debugMode) return;
        try {
            var msg = Array.prototype.slice.call(arguments).join(' ');
            console.log('[Cookie Age Debug]', msg);
        } catch (e) {}
    }
    
    function errorLog() {
        try {
            var msg = Array.prototype.slice.call(arguments).join(' ');
            console.error('[Cookie Age Error]', msg);
        } catch (e) {}
    }
    
    // Apply debug start puzzles - sets each track independently
    function resetPuzzleDebugState(puzzleId) {
        if (!puzzleId || !cookieAgeData || !cookieAgeData.puzzles) {
            return;
        }

        if (cookieAgeData.puzzles.completed) {
            var completedIndex = cookieAgeData.puzzles.completed.indexOf(puzzleId);
            if (completedIndex !== -1) {
                cookieAgeData.puzzles.completed.splice(completedIndex, 1);
            }
        }

        if (cookieAgeData.puzzles.completing && cookieAgeData.puzzles.completing[puzzleId]) {
            delete cookieAgeData.puzzles.completing[puzzleId];
        }

        if (cookieAgeData.puzzles.notificationsShown && cookieAgeData.puzzles.notificationsShown[puzzleId]) {
            delete cookieAgeData.puzzles.notificationsShown[puzzleId];
        }

        var registryEntry = cookieAgeData.puzzles.registry[puzzleId];
        if (registryEntry && registryEntry.instance && registryEntry.instance.trackingKey) {
            var trackingKey = registryEntry.instance.trackingKey;
            if (trackingKey && cookieAgeData.puzzles[trackingKey] !== undefined) {
                delete cookieAgeData.puzzles[trackingKey];
            }
        }
    }

    function applyDebugStartPuzzles() {
        // Initialize completed array if needed
        if (!cookieAgeData.puzzles.completed) {
            cookieAgeData.puzzles.completed = [];
        }
        
        if (!cookieAgeData.puzzles.tracks) {
            cookieAgeData.puzzles.tracks = {
                investigate: { active: null, progress: 0 },
                infiltrate: { active: null, progress: 0 }
            };
        }
        
        // Handle investigate track
        if (debugStartInvestigate !== null && debugStartInvestigate !== undefined) {
            // Check if user wants to complete all puzzles in investigate track
            if (debugStartInvestigate === 'complete') {
                for (var i = 0; i < INVESTIGATE_PUZZLE_ORDER.length; i++) {
                    var puzzleId = INVESTIGATE_PUZZLE_ORDER[i];
                    if (cookieAgeData.puzzles.completed.indexOf(puzzleId) === -1) {
                        cookieAgeData.puzzles.completed.push(puzzleId);
                    }
                }
                cookieAgeData.puzzles.tracks.investigate.progress = INVESTIGATE_PUZZLE_ORDER.length;
                cookieAgeData.puzzles.tracks.investigate.active = null;
            } else {
                var investigatePuzzle = cookieAgeData.puzzles.registry[debugStartInvestigate];
                if (!investigatePuzzle) {
                    errorLog('Debug start investigate puzzle not found:', debugStartInvestigate);
                } else if (investigatePuzzle.type !== 'investigate') {
                    errorLog('Puzzle', debugStartInvestigate, 'is not an investigate puzzle!');
                } else {
                    var investigateOrder = investigatePuzzle.trackOrder;
                    resetPuzzleDebugState(debugStartInvestigate);
                    
                    // Mark all previous investigate puzzles as completed
                    for (var i = 0; i < investigateOrder; i++) {
                        var puzzleId = INVESTIGATE_PUZZLE_ORDER[i];
                        if (cookieAgeData.puzzles.completed.indexOf(puzzleId) === -1) {
                            cookieAgeData.puzzles.completed.push(puzzleId);
                        }
                    }
                    
                    // Set track progress and activate puzzle
                    cookieAgeData.puzzles.tracks.investigate.progress = investigateOrder;
                    cookieAgeData.puzzles.tracks.investigate.active = debugStartInvestigate;
                    
                    // Mark puzzle as active
                    var activePuzzle = cookieAgeData.puzzles.registry[debugStartInvestigate];
                    if (activePuzzle) {
                        activePuzzle.isActive = true;
                    }
                    
                    // Setup the puzzle
                    setupPuzzle(debugStartInvestigate);
                }
            }
        }
        
        // Handle infiltrate track
        if (debugStartInfiltrate !== null && debugStartInfiltrate !== undefined) {
            // Check if user wants to complete all puzzles in infiltrate track
            if (debugStartInfiltrate === 'complete') {
                for (var j = 0; j < INFILTRATE_PUZZLE_ORDER.length; j++) {
                    var puzzleId2 = INFILTRATE_PUZZLE_ORDER[j];
                    if (cookieAgeData.puzzles.completed.indexOf(puzzleId2) === -1) {
                        cookieAgeData.puzzles.completed.push(puzzleId2);
                    }
                }
                cookieAgeData.puzzles.tracks.infiltrate.progress = INFILTRATE_PUZZLE_ORDER.length;
                cookieAgeData.puzzles.tracks.infiltrate.active = null;
            } else {
                var infiltratePuzzle = cookieAgeData.puzzles.registry[debugStartInfiltrate];
                if (!infiltratePuzzle) {
                    errorLog('Debug start infiltrate puzzle not found:', debugStartInfiltrate);
                } else if (infiltratePuzzle.type !== 'infiltrate') {
                    errorLog('Puzzle', debugStartInfiltrate, 'is not an infiltrate puzzle!');
                } else {
                    var infiltrateOrder = infiltratePuzzle.trackOrder;
                    resetPuzzleDebugState(debugStartInfiltrate);
                    
                    // Mark all previous infiltrate puzzles as completed
                    for (var j = 0; j < infiltrateOrder; j++) {
                        var puzzleId2 = INFILTRATE_PUZZLE_ORDER[j];
                        if (cookieAgeData.puzzles.completed.indexOf(puzzleId2) === -1) {
                            cookieAgeData.puzzles.completed.push(puzzleId2);
                        }
                    }
                    
                    // Set track progress and activate puzzle
                    cookieAgeData.puzzles.tracks.infiltrate.progress = infiltrateOrder;
                    cookieAgeData.puzzles.tracks.infiltrate.active = debugStartInfiltrate;
                    
                    // Mark puzzle as active
                    var activePuzzle = cookieAgeData.puzzles.registry[debugStartInfiltrate];
                    if (activePuzzle) {
                        activePuzzle.isActive = true;
                    }
                    
                    // Setup the puzzle
                    setupPuzzle(debugStartInfiltrate);
                }
            }
        }
        
        // Handle choose track
        if (debugStartChoose !== null && debugStartChoose !== undefined) {
            // Check if user wants to complete all puzzles in choose track
            if (debugStartChoose === 'complete') {
                for (var k = 0; k < CHOOSE_PUZZLE_ORDER.length; k++) {
                    var puzzleId3 = CHOOSE_PUZZLE_ORDER[k];
                    if (cookieAgeData.puzzles.completed.indexOf(puzzleId3) === -1) {
                        cookieAgeData.puzzles.completed.push(puzzleId3);
                    }
                }
                cookieAgeData.puzzles.tracks.choose.progress = CHOOSE_PUZZLE_ORDER.length;
                cookieAgeData.puzzles.tracks.choose.active = null;
            } else {
                var choosePuzzle = cookieAgeData.puzzles.registry[debugStartChoose];
                if (!choosePuzzle) {
                    errorLog('Debug start choose puzzle not found:', debugStartChoose);
                } else if (choosePuzzle.type !== 'choose') {
                    errorLog('Puzzle', debugStartChoose, 'is not a choose puzzle!');
                } else {
                    var chooseOrder = choosePuzzle.trackOrder;
                    resetPuzzleDebugState(debugStartChoose);
                    
                    // Mark all previous choose puzzles as completed
                    for (var k = 0; k < chooseOrder; k++) {
                        var puzzleId3 = CHOOSE_PUZZLE_ORDER[k];
                        if (cookieAgeData.puzzles.completed.indexOf(puzzleId3) === -1) {
                            cookieAgeData.puzzles.completed.push(puzzleId3);
                        }
                    }
                    
                    // Set track progress and activate puzzle
                    cookieAgeData.puzzles.tracks.choose.progress = chooseOrder;
                    cookieAgeData.puzzles.tracks.choose.active = debugStartChoose;
                    
                    // Mark puzzle as active
                    var activePuzzle = cookieAgeData.puzzles.registry[debugStartChoose];
                    if (activePuzzle) {
                        activePuzzle.isActive = true;
                    }
                    
                    // Setup the puzzle
                    setupPuzzle(debugStartChoose);
                }
            }
        }
        
        // Apply debug path choice if specified
        if (debugExposePathPicked !== null && debugExposePathPicked !== undefined) {
            cookieAgeData.puzzles.exposePathPicked = debugExposePathPicked;
        }
    }
    
    // ===== AUDIO SYSTEM =====
    function initializeAudioSystem() {
        // Initialize audio settings
        cookieAgeData.audio.enabled = true;
        return true;
    }
    
    function playAudioSound(name, options) {
        if (!cookieAgeData.audio.enabled) {
            return false;
        }
        
        // Check if audio system is initialized
        if (!cookieAgeData.audio.sounds) {
            return false;
        }
        
        // Check if we have a URL for this sound
        var soundUrl = cookieAgeData.audio.sounds[name];
        if (!soundUrl) {
            return false;
        }
        
        // Extract volume from options (defaults to 1 if not provided)
        var volume = 1;
        if (options && typeof options.volume === 'number') {
            volume = options.volume;
        }
        
        try {
            // Use vanilla PlaySound - it's a global function, not Game.PlaySound
            // Pass volume parameter to let vanilla function handle it with Game.volume
            if (typeof PlaySound !== 'undefined' && typeof soundUrl === 'string') {
                PlaySound(soundUrl, volume);
                return true;
            }
            return false;
            
        } catch (error) {
            errorLog('Failed to play audio sound:', name, error);
            return false;
        }
    }
    
    // Simplified sound loading - just store URLs
    function loadAudioSound(name, url) {
        try {
            // Store the URL for PlaySound or custom fallback
            cookieAgeData.audio.sounds[name] = url;
            return true;
        } catch (error) {
            errorLog('Failed to load audio sound:', name, error);
            return false;
        }
    }
    
    function toggleAudio() {
        cookieAgeData.audio.enabled = !cookieAgeData.audio.enabled;
        debugLog('Audio', cookieAgeData.audio.enabled ? 'enabled' : 'disabled');
        return cookieAgeData.audio.enabled;
    }
    
    function loadWelcomeAudio() {
        var welcomeAudioUrl = 'https://cdn.jsdelivr.net/gh/dfsw/Cookies@bf87f7a/orderofthecookie.mp3';
        loadAudioSound('welcome', welcomeAudioUrl);
    }
    
    function loadPuzzleCompletionAudio() {
        var puzzleCompletionAudioUrl = 'https://cdn.jsdelivr.net/gh/dfsw/Cookies@bf87f7a/orderofthecookie.mp3';
        loadAudioSound('puzzleCompletion', puzzleCompletionAudioUrl);
    }
     
    // ===== EXPANSION DATA STRUCTURES =====
    var cookieAgeData = {
        achievements: {
            // New achievement categories will go here
            advanced: {
                names: [],
                thresholds: [],
                descs: [],
                vanillaTarget: null,
                customIcons: []
            }
        },
        tracking: {
            // New tracking data will go here
            advancedStats: {}
        },
        audio: {
            // Audio system data
            sounds: {}, // URLs for PlaySound
            enabled: true
        }
    };
    
    // Mystery achievement names and their corresponding puzzle milestones
    var mysteryAchievementNames = [
        'Order of the golden crumb',      // small_token
        'Order of the impossible batch',    // brother_onto_you
        'Order of the shining spoon',      // ledger_bonds
        'Order of the cookie eclipse',     // rosetta_stone
        'Order of the enchanted whisk',     // garden_maze
        'Order of the eternal cookie',      // defeat_evil
    ];
    
    var mysteryMilestonePuzzles = [
        'small_token',
        'brother_onto_you',
        'ledger_bonds',
        'rosetta_stone',
        'garden_maze',
        'defeat_evil'
    ];
    
    var expansionState = {
        initialized: false,
        achievementsCreated: false,
        trackingActive: false
    };
    
    // ===== HOOK COMPATIBILITY =====
    // Remove any previously-registered Cookie Age hooks left from hot reloads
    function sanitizeCookieAgeHooks() {
        try {
            if (!Game.customHooks) return;
            for (var type in Game.customHooks) {
                if (!Array.isArray(Game.customHooks[type])) continue;
                // Filter out any prior Cookie Age callbacks
                Game.customHooks[type] = Game.customHooks[type].filter(function(fn) {
                    return !(fn && fn.__cookieAge === true);
                });
            }
        } catch (e) {
            // Keep console clean during normal gameplay; only log real failures
            try { errorLog('Failed to sanitize Cookie Age hooks:', e); } catch (_) {}
        }
    }

    function safeRegisterHook(hookType, callback, description, key) {
        // Use Game.registerHook directly since the base mod's registerHook is not globally accessible
        if (Game.registerHook) {
            try {
                // Mark callback and assign a deterministic key for idempotency
                var stableKey = 'cookieAge:' + hookType + ':' + (key || (description || 'anon'));
                try {
                    callback.__cookieAge = true;
                    callback.__cookieAgeKey = stableKey;
                } catch (_) {}

                // If a function with the same key already exists for this hook type, skip
                if (Game.customHooks && Array.isArray(Game.customHooks[hookType])) {
                    for (var i = 0; i < Game.customHooks[hookType].length; i++) {
                        var existing = Game.customHooks[hookType][i];
                        if (existing && existing.__cookieAgeKey === stableKey) {
                            return true;
                        }
                    }
                }

                Game.registerHook(hookType, callback);
                debugLog('Hook registered successfully:', description);
                return true;
            } catch (e) {
                errorLog('Failed to register hook:', hookType, '-', description, e);
                return false;
            }
        } else {
            errorLog('Game.registerHook not available for:', description);
            return false;
        }
    }
    
    // ===== EXPANSION INITIALIZATION =====
    function initializeExpansion() {
        if (expansionState.initialized) {
            debugLog('Expansion already initialized');
            return;
        }
        
        // Check if Cookie Age is enabled in the main mod
        if (typeof Game.JNE.enableCookieAge !== 'undefined') {
            if (!Game.JNE.enableCookieAge) {
                debugLog('Cookie Age extension is disabled in main mod settings');
                // Clean up achievements if they were previously created
                if (expansionState.achievementsCreated) {
                    removeMysteryAchievements();
                }
                return;
            }
        } else {
            debugLog('Cookie Age extension setting not found in main mod, proceeding with initialization');
        }
        
        debugLog('Initializing Cookie Age expansion...');
        
        attachBaseModPuzzleHelpers();

        try {
            // Ensure we start from a clean state after hot reloads
            sanitizeCookieAgeHooks();

            // Initialize audio system
            initializeAudioSystem();
            
            // Load and setup welcome sound on mod load
            loadWelcomeAudio();
            loadPuzzleCompletionAudio();
            
            // Set up advanced checking systems (puzzle system first)
            setupAdvancedChecking();
            
            // Create new achievements after puzzle system is initialized so we can check progress
            createMysteryAchievements();
            
            // Set up news ticker system
            setupNewsTicker();
            
            // Mark as initialized
            expansionState.initialized = true;
                        
            // If base mod stashed save data, apply it now (toggle-aware restore)
            try {
                if (typeof window !== 'undefined' && window.CookieAge && window.CookieAge.applySaveData && window.Game && Game.JNE && Game.JNE.cookieAgeSavedData) {
                    window.CookieAge.applySaveData(Game.JNE.cookieAgeSavedData);
                    Game.JNE.cookieAgeSavedData = null;
                }
            } catch (_) {}
            
            // Emit completion event
            if (Game.emit) {
                Game.emit('cookieAgeInitialized', {
                    version: expansionVersion,
                    achievements: expansionState.achievementsCreated,
                    tracking: expansionState.trackingActive
                });
            }
            
        } catch (error) {
            errorLog('Failed to initialize expansion:', error);
        }
    }
    
    // ===== CONDITIONAL INITIALIZATION =====
    function conditionalInitialize() {
        // Check if we should initialize based on the main mod's setting
        // Since base mod is guaranteed loaded, Game.JNE.enableCookieAge will always be available
        if (typeof Game.JNE.enableCookieAge !== 'undefined') {
            if (Game.JNE.enableCookieAge) {
                debugLog('Cookie Age is enabled, initializing...');
                
                // Always initialize without audio - audio is only played from button toggle
                initializeExpansion();
            } else {
                debugLog('Cookie Age is disabled, skipping initialization');
                // Clean up achievements if they were previously created
                if (expansionState.achievementsCreated) {
                    removeMysteryAchievements();
                }
            }
        } else {
            debugLog('Cookie Age setting not found in base mod, proceeding with initialization');
            initializeExpansion();
        }
    }
    
    // ===== GAME OBJECT CLEANUP SYSTEM =====
    function cleanupGameObjectModifications() {
        debugLog('Cleaning up Game object modifications...');
        
        // Restore ClickSpecialPic if we modified it
        if (Game._originalClickSpecialPic) {
            Game.ClickSpecialPic = Game._originalClickSpecialPic;
            delete Game._originalClickSpecialPic;
        }
        if (Game._originalClickSpecialPicStillWithUs) {
            Game.ClickSpecialPic = Game._originalClickSpecialPicStillWithUs;
            delete Game._originalClickSpecialPicStillWithUs;
        }
        
        // Restore DrawWrinklers if we modified it
        if (cookieAgeData.puzzles && cookieAgeData.puzzles.defeatEvilTracking && 
            cookieAgeData.puzzles.defeatEvilTracking._originalDrawWrinklers) {
            Game.DrawWrinklers = cookieAgeData.puzzles.defeatEvilTracking._originalDrawWrinklers;
            delete cookieAgeData.puzzles.defeatEvilTracking._originalDrawWrinklers;
        }
        
        // Restore playWrinklerSquishSound if we modified it
        if (cookieAgeData.puzzles && cookieAgeData.puzzles.riseUpTracking && 
            cookieAgeData.puzzles.riseUpTracking.originalPlayWrinklerSquishSound) {
            Game.playWrinklerSquishSound = cookieAgeData.puzzles.riseUpTracking.originalPlayWrinklerSquishSound;
            delete cookieAgeData.puzzles.riseUpTracking.originalPlayWrinklerSquishSound;
        }
        
        // Restore promptGiftRedeem if we modified it
        if (cookieAgeData.puzzles && cookieAgeData.puzzles.riseUpTracking && 
            cookieAgeData.puzzles.riseUpTracking.originalPromptGiftRedeem) {
            Game.promptGiftRedeem = cookieAgeData.puzzles.riseUpTracking.originalPromptGiftRedeem;
            delete cookieAgeData.puzzles.riseUpTracking.originalPromptGiftRedeem;
        }
        
        // Restore DrawWrinklers from riseUpTracking
        if (cookieAgeData.puzzles && cookieAgeData.puzzles.riseUpTracking && 
            cookieAgeData.puzzles.riseUpTracking.originalDrawWrinklers) {
            Game.DrawWrinklers = cookieAgeData.puzzles.riseUpTracking.originalDrawWrinklers;
            delete cookieAgeData.puzzles.riseUpTracking.originalDrawWrinklers;
        }
        
        // Restore Ascend function if we modified it
        if (cookieAgeData.puzzles && cookieAgeData.puzzles.hooks && 
            cookieAgeData.puzzles.hooks.puzzle24_ascendFunction) {
            // Note: Cannot fully restore without original reference
            // This is a fallback hook that can't be fully cleaned
            delete cookieAgeData.puzzles.hooks.puzzle24_ascendFunction;
        }
        
        // Clean up dragon aura modifications if any exist
        if (Game._originalSelectDragonAura) {
            Game.SelectDragonAura = Game._originalSelectDragonAura;
            delete Game._originalSelectDragonAura;
        }
        if (Game._originalSetDragonAura) {
            Game.SetDragonAura = Game._originalSetDragonAura;
            delete Game._originalSetDragonAura;
        }
        if (Game._originalUpgradeDragon) {
            Game.UpgradeDragon = Game._originalUpgradeDragon;
            delete Game._originalUpgradeDragon;
        }
        
        // Remove Game.JNE properties we added (only our properties, not the object itself)
        if (Game.JNE && typeof Game.JNE === 'object') {
            // Only remove properties we added, not the entire JNE object
            // as other mods may use it
            delete Game.JNE.enableCookieAge;
        }
        
        // Remove our public API functions
        if (typeof Game.setPuzzleProgress === 'function') {
            delete Game.setPuzzleProgress;
        }
        if (typeof Game.getPuzzleInfo === 'function') {
            delete Game.getPuzzleInfo;
        }
        if (typeof Game.markPuzzleCompleted === 'function') {
            delete Game.markPuzzleCompleted;
        }
        if (typeof Game.unlockPuzzleForTesting === 'function') {
            delete Game.unlockPuzzleForTesting;
        }
        if (typeof Game.resetAndSetPuzzle === 'function') {
            delete Game.resetAndSetPuzzle;
        }
        if (typeof Game.completeActivePuzzles === 'function') {
            delete Game.completeActivePuzzles;
        }
        
        debugLog('Game object modifications cleaned up');
    }
    
    // ===== MYSTERY ACHIEVEMENT SYSTEM =====
    function createMysteryAchievements() {
        
        if (!Game.JNE || !Game.JNE.createAchievement) {
            errorLog('createAchievement helper not available from base mod');
            return;
        }
        
        // Only block achievement creation if explicitly disabled
        // If the setting is undefined, it means it hasn't loaded yet and we should proceed
        if (Game.JNE.enableCookieAge === false) {
            debugLog('Cookie Age is explicitly disabled, not creating mystery achievements');
            return;
        }
        
        // Check if achievements need to be created or just restored from disabled state
        var needsCreation = false;
        for (var i = 0; i < mysteryAchievementNames.length; i++) {
            var originalName = mysteryAchievementNames[i];
            var hiddenName = originalName + ' [DISABLED]';
            
            // Check if achievement exists in either active or disabled state
            if (!Game.Achievements[originalName] && !Game.Achievements[hiddenName]) {
                needsCreation = true;
                break;
            }
        }
        
        if (!needsCreation) {
            // Achievements already exist, restore them from disabled state
            var restoredCount = 0;
            for (var i = 0; i < mysteryAchievementNames.length; i++) {
                var originalName = mysteryAchievementNames[i];
                var hiddenName = originalName + ' [DISABLED]';
                
                // Check if achievement is in disabled state (renamed)
                if (Game.Achievements[hiddenName]) {
                    var ach = Game.Achievements[hiddenName];
                    debugLog('Restoring achievement from disabled state:', originalName);
                    
                    // Restore to normal pool
                    ach.pool = 'normal';
                    
                    // Restore won status if it was previously won
                    if (ach._savedWonStatus) {
                        ach.won = 1;
                        debugLog('Restored won status for:', originalName);
                    }
                    
                    // Restore original name
                    Game.Achievements[originalName] = ach;
                    delete Game.Achievements[hiddenName];
                    delete ach._originalName;
                    
                    // Update AchievementsById if it has an id
                    if (ach.id !== undefined && Game.AchievementsById[ach.id]) {
                        Game.AchievementsById[ach.id] = ach;
                    }
                    
                    restoredCount++;
                } else if (Game.Achievements[originalName]) {
                    // Achievement already has correct name, just ensure it's in normal pool
                    var ach = Game.Achievements[originalName];
                    ach.pool = 'normal';
                    restoredCount++;
                }
            }
            
            expansionState.achievementsCreated = true;
            return;
        }
        
        var baseOrder = 500001; 
        var mysteryAchievements = [
            {
              name: 'Order of the golden crumb',
              desc: 'Awarded for progressing through the <b>Mysteries of the Cookie Age</b> puzzles.<q>Before ink touched parchment and iron met flame—before our ancestors raised their first cities—there was the Cookie Age. Six great Orders of mystics, bakers, scribes, and oracles worshipped the golden cookie and the ancient cookie deities.</q>',
              icon: [0, 15, customSpriteSheetUrl],
              order: baseOrder + 1
            },
            {
              name: 'Order of the impossible batch',
              desc: 'Awarded for progressing through the <b>Mysteries of the Cookie Age</b> puzzles.<q>The Brotherhoods passed down hidden knowledge and quiet power from one generation to the next, fevered in their devotion. Across the ages, the Orders shaped the world through influence unseen, molding humanity toward the cookie gods they served.</q>',
              icon: [1, 15, customSpriteSheetUrl],
              order: baseOrder + 2
            },
            {
              name: 'Order of the shining spoon',
              desc: 'Awarded for progressing through the <b>Mysteries of the Cookie Age</b> puzzles.<q>The Brotherhoods moved in silence, blending into daily life. The most powerful politicians, merchants, and luminaries were rumored to belong. Proof is scarce; many dismiss it as conspiracy theory. Yet old rites and oaths bound the Brothers into pacts that endured beyond memory—small signs and gestures marked friend from foe.</q>',
              icon: [2, 15, customSpriteSheetUrl],
              order: baseOrder + 3
            },
            {
              name: 'Order of the cookie eclipse',
              desc: 'Awarded for progressing through the <b>Mysteries of the Cookie Age</b> puzzles.<q>In quiet austerity they kept their old laws—never ceasing, never wavering. The world bent to their desires without knowing, drawn by a sweet addiction. Cookies flowed like water, and humanity experienced a golden age of sugar and chocolate. But behind the curtains the ripples spread; the Order’s grasp began to slip.</q>',
              icon: [3, 15, customSpriteSheetUrl],
              order: baseOrder + 4
            },
            {
              name: 'Order of the enchanted whisk',
              desc: 'Awarded for progressing through the <b>Mysteries of the Cookie Age</b> puzzles.<q>For the first time in recorded history, the power of the Great Orders falters. You—once a lowly baker—now hold a chance to leave a mark on history. By virtue of your skill, and by a rare alignment of stars, a door long sealed stands ajar.</q>',
              icon: [4, 15, customSpriteSheetUrl],
              order: baseOrder + 5
            },
            {
              name: 'Order of the eternal cookie',
              desc: 'Awarded for completing all of the <b>Mysteries of the Cookie Age</b> puzzles.<q>The future of the Great Orders is bound to your story; their names cannot be spoken without yours echoing in the same halls. The world of cookies will not be the same because of your tireless acts.</q>',
              icon: [5, 15, customSpriteSheetUrl],
              order: baseOrder + 6
            }
          ];
        // Check which puzzles are completed to determine which achievements should be created as won
        var completedPuzzles = cookieAgeData.puzzles.completed || [];
        
        // Create each achievement using the base mod's helper
        for (var index = 0; index < mysteryAchievements.length; index++) {
            var achData = mysteryAchievements[index];
            
            // Check if the milestone puzzle is already completed
            var milestonePuzzle = mysteryMilestonePuzzles[index];
            var shouldBeWon = completedPuzzles.indexOf(milestonePuzzle) !== -1;
            
            // Create the achievement without a requirement function (we check manually on puzzle completion)
            var achievement = Game.JNE.createAchievement(
                achData.name,
                achData.desc,
                null,  // vanilla icon (not used)
                achData.order,
                null,  // no requirement function - achievements awarded manually on puzzle completion
                achData.icon  // custom icon
            );
            
            // Ensure achievement has correct pool
            if (achievement) {
                achievement.pool = 'normal';
                
                // If the milestone is already achieved, mark the achievement as won silently
                if (shouldBeWon) {
                    achievement.won = 1;
                    achievement._restoredFromSave = true; // Mark as restored to prevent notification
                    
                    // Update achievement count
                    if (!Game.AchievementsOwned) Game.AchievementsOwned = 0;
                    Game.AchievementsOwned++;
                    if (Game.stats && Game.stats['Achievements unlocked']) {
                        Game.stats['Achievements unlocked']++;
                    }
                    
                }
            }
        }
        
        expansionState.achievementsCreated = true;
    }
    
    function removeMysteryAchievements() {
        mysteryAchievementNames.forEach(function(achievementName) {
            if (Game.Achievements[achievementName]) {
                var achievement = Game.Achievements[achievementName];
                
                // Store the won status before hiding
                if (achievement.won) {
                    achievement._savedWonStatus = true;
                }
                
                // Move to shadow pool and clear won status because there is no other way to really get rid of an achievement that I can figure out
                achievement.pool = 'shadow';
                achievement.won = 0;
                
                // Rename the achievement so it can't be awarded while disabled
                var hiddenName = achievementName + ' [DISABLED]';
                achievement._originalName = achievementName;
                
                // Move to new name in the achievements object
                Game.Achievements[hiddenName] = achievement;
                delete Game.Achievements[achievementName];
                
                // Update AchievementsById if it has an id
                if (achievement.id !== undefined && Game.AchievementsById[achievement.id]) {
                    Game.AchievementsById[achievement.id] = achievement;
                }
            }
        });
        
        expansionState.achievementsCreated = false;
    }
    
    // ===== ADVANCED CHECKING SYSTEM =====
    function setupAdvancedChecking() {
        // Set up puzzle system
        setupPuzzleSystem();
        
        // Set up info menu injection
        setupInfoMenuInjection();
    }
    
    // ===== INFO MENU INJECTION SYSTEM =====
    function setupInfoMenuInjection() {
        // Store original UpdateMenu function
        const originalUpdateMenu = Game.UpdateMenu;
        
        // Override UpdateMenu to inject info menu content
        Game.UpdateMenu = function() {
            const result = originalUpdateMenu.call(this);
            
            // Handle info menu injection for puzzle 10
            if (Game.onMenu === 'log') {
                setTimeout(function() {
                    injectBlessingPuzzleInfo();
                }, 100);
            }
            
            return result;
        };
    }
    
    function injectBlessingPuzzleInfo() {
        // Check if this is the current puzzle and it's not completed
        if (!isPuzzleProgressValid('blessing_creator')) {
            return;
        }
        
        if (cookieAgeData.puzzles.completed && cookieAgeData.puzzles.completed.indexOf('blessing_creator') !== -1) {
            return;
        }
        
        // Check if info note is already injected
        if (document.getElementById('blessing-puzzle-info')) {
            return;
        }
        
        // Find the info menu container
        let menuContainer = document.getElementById('menu');
        if (!menuContainer) {
            return;
        }
        
        // Look for the specific subsection with title "08/08/2013 - game launch"
        let gameLaunchSubsection = null;
        let subsections = menuContainer.querySelectorAll('.subsection.update');
        
        for (let i = 0; i < subsections.length; i++) {
            let title = subsections[i].querySelector('.title');
            if (title && title.textContent.includes('08/08/2013 - game launch')) {
                gameLaunchSubsection = subsections[i];
                break;
            }
        }
        
        if (!gameLaunchSubsection) {
            return;
        }
        
        // Create the info note insertion
        let infoNote = document.createElement('div');
        infoNote.id = 'blessing-puzzle-info';
        infoNote.className = 'listing';
        infoNote.innerHTML = '&bull; This might not make sense right now, but if you ever find yourself tangling with The Order of the Cookie. Send a gift of Leprechaun luck, and I shall bless your steps and ward you from what stirs beyond.';
        
        // Insert after the last listing in the subsection
        gameLaunchSubsection.appendChild(infoNote);
    }
    
    function removeBlessingPuzzleInfo() {
        let infoNote = document.getElementById('blessing-puzzle-info');
        if (infoNote) {
            infoNote.remove();
        }
    }
    function setupPuzzleSystem() {
        try {
            // Initialize audio system and load sounds if not already done
            if (!cookieAgeData.audio || !cookieAgeData.audio.sounds || Object.keys(cookieAgeData.audio.sounds).length === 0) {
                initializeAudioSystem();
                loadWelcomeAudio();
                loadPuzzleCompletionAudio();
            }
            
            // Initialize puzzle tracking with new architecture (only if not already initialized)
            if (!cookieAgeData.puzzles) {
                cookieAgeData.puzzles = {
                    registry: {}, // Central registry for all puzzles
                    hooks: {}, // Active hooks for current puzzle
                    hookIds: [], // Track hook IDs for cleanup
                    exposePathPicked: null, // Global path choice: true=expose, false=order, null=no choice
                    instances: {}, // Class instances for puzzles
                    tracks: {
                        investigate: {
                            active: null,
                            progress: 0
                        },
                        infiltrate: {
                            active: null,
                            progress: 0
                        },
                        choose: {
                            active: null,
                            progress: 0
                        },
                        _initialized: false
                    },
                    hints: {
                        hintsUsed: 0, // Total number of hints purchased (for cost calculation)
                        lastHintTime: null, // Timestamp of last hint purchase (for 24h cooldown)
                        puzzleActivationTimes: {
                            investigate: null, // Timestamp when current investigate puzzle was activated
                            infiltrate: null, // Timestamp when current infiltrate puzzle was activated
                            choose: null // Timestamp when current choose puzzle was activated
                        },
                        purchasedHints: {} // Track which puzzles have hints purchased: { puzzleId: true }
                    },
                    completed: [] // Array of completed puzzle IDs
                };
            }
            
            // Ensure completed array exists even if puzzles was already initialized
            if (!cookieAgeData.puzzles.completed) {
                cookieAgeData.puzzles.completed = [];
            }
            
            // Ensure hint data structure exists even if puzzles was already initialized
            if (!cookieAgeData.puzzles.hints) {
                cookieAgeData.puzzles.hints = {
                    hintsUsed: 0,
                    lastHintTime: null,
                    puzzleActivationTimes: {
                        investigate: null,
                        infiltrate: null,
                        choose: null
                    },
                    purchasedHints: {}
                };
            }
            
            // Ensure nested structures exist
            if (!cookieAgeData.puzzles.hints.puzzleActivationTimes) {
                cookieAgeData.puzzles.hints.puzzleActivationTimes = {
                    investigate: null,
                    infiltrate: null,
                    choose: null
                };
            }
            if (!cookieAgeData.puzzles.hints.purchasedHints) {
                cookieAgeData.puzzles.hints.purchasedHints = {};
            }
            
            // Initialize puzzle registry (only if not already initialized)
            if (!cookieAgeData.puzzles.registry || Object.keys(cookieAgeData.puzzles.registry).length === 0) {
                initializePuzzleRegistry();
            }
            
            // Initialize tracks if not already done
            if (!cookieAgeData.puzzles.tracks._initialized) {
                initializePuzzleTracks();
            }
        } catch (e) {
            errorLog('Error in setupPuzzleSystem:', e);
            console.error('Full error:', e);
        }
    }
    
    // ===== PUZZLE REGISTRY SYSTEM =====
    function initializePuzzleRegistry() {
        
        // Define all puzzles in a centralized registry
        cookieAgeData.puzzles.registry = {
            'proving_patience': {
                name: 'Proving your patience',
                description: 'The Shimmerlily\'s final breath carried your silence into hidden places. Whoever waits in shadow has taken notice.<q>You kept still. You listened. And in the hush, eyes turned toward you.</q>',
                clue: 'Pay close attention to the world, something new is afoot, but it requires patience and a watchful eye.',
                hint: '• Keep an eye on the news ticker(clicking it can speed up your journey).<br>• There is only one type of Lily in Cookie Clicker.<br>• Make sure there is nothing else besides a lily.<br>• You must have even more patience than the lily itself.',
                puzzleClass: ProvingPatiencePuzzle,
                mainIcon: [10, 12, customSpriteSheetUrl],
                completionMessage: 'The Shimmerlily\'s final breath carried your silence into hidden places. Whoever waits in shadow has taken notice.<q>The mystery has begun. Return to the stats menu to track progress and review your clues.</q>',
                completionIcon: [10, 13, customSpriteSheetUrl],
                dependencies: [],
                isActive: false,
                type: 'investigate'
                },
    
                'making_friendship': {
                name: 'Mark of intent',
                clue: 'You have proven your patience, await word from your new "friend".',
                hint: '• What does your friend call you that you could use as a name to be seen by them?',
                description: 'The sign now bears the mark they demanded. Stranger, friend, or foe, you have declared yourself all the same. Many eyes now turn toward you.<q>The path ahead is peril. Wit, not strength, will be your most important asset.</q>',
                puzzleClass: MakingFriendshipPuzzle,
                mainIcon: [5, 17, customSpriteSheetUrl],
                completionMessage: 'The sign now bears the mark they demanded. Eyes, welcome or hostile, are upon you.<q>The mark is set. In silence, watchers weigh what it means.</q>',
                completionIcon: [9, 13, customSpriteSheetUrl],
                dependencies: ['proving_patience'],
                isActive: false,
                type: 'investigate'
                },
    
                'small_token': {
                name: 'A small token',
                description: 'The parcel vanished into unseen hands. Upon your return, a letter awaited, its seal unbroken until now.<q>My bravest friend,<br><br>You must infiltrate the Brotherhood and expose The Order of the Cookie. We know not what dangers wait, only that discovery means ruin. Still, we have risked all to uncover the first rites of passage and initiation. Take them, and tread carefully, trust no one.</q>',
                clue: 'You have shown your willingness but your tasks are not yet complete.',
                hint: '• Cookie Clicker has a mail system, you may have forgotten about this particular heavenly upgrade though.',
                puzzleClass: SmallTokenPuzzle,
                mainIcon: [34, 8, mainIconsSpriteSheetUrl],
                completionMessage: 'The parcel is gone. In its place, a letter binds you to a greater cause.<q>Your mission begins in earnest. The first rites are revealed.</q>',
                completionIcon: [2, 17, customSpriteSheetUrl],
                dependencies: ['making_friendship'],
                isActive: false,
                type: 'investigate'
                },
                
                'garden_sigil': {
                name: 'The garden sigil',
                puzzleClass: GardenSigilPuzzle,
                clue: 'We have intercepted a message from a courier of The Order:<br><br>A field of fortune, wide and green,<br>four-leaf charms are thickly seen.<br>Mark an X with their gilded kin,<br>the hidden path to walk within.<br>Yet wait, no hand may turn the ground,<br> till the field holds three dozen crowns.<br>When green and gold together stand,<br>strike the heart at fortune\'s hand.',
                hint: '• What\'s the only plant that has a golden relative?<br>• Once everything is mature then you need to dig.',
                description: 'You marked the sign where fortune crossed and unearthed what lay beneath. This was no rite of the Brotherhood, but a secret uncovered in silence.<q>Your ally\'s hand steered you here. The Order would not grant such knowledge willingly. Wrapped in oilcloth beneath the soil lay a thin folio, water-stained and singed. Six headings survive;<br>The Order of the Golden Crumb<br>The Order of the Impossible Batch<br>The O..er of t.e Shining Spoon<br>Th. O.. th. .o…k.. .c…ip…e<br>Th. O..r of th. .n…hant…d .h…sk<br>Th. O..r of th. Et…rn…l ..…k..<br>Keep this close—what\'s missing will matter.</q>',
                mainIcon: [23, 2, customSpriteSheetUrl],
                completionMessage: 'Digging where X marked the spot has revealed a tattered folio.',
                completionIcon: [1, 16, customSpriteSheetUrl],
                dependencies: ['rite_shifting_measures'],
                isActive: false,
                type: 'investigate'
                },
                
                'blessing_creator': {
                name: 'Blessing from the creator',
                description: 'Orteil himself turned his gaze toward you, a fleeting sign of favor amid growing suspicion. The Brotherhood whispers more loudly now, and even your friend cannot shield you for long.<q>You\'ll need every ounce of luck from here on. Their eyes are sharper, and our reach cannot save you forever.</q>',
                clue: 'Return to the first spark, the place of beginnings. There the Creator inscribed a rite to beg favor against the Brotherhood. Do it swiftly, for you will need every ounce of fortune on the path ahead.<q>You\'ll need all the luck you can get after all. Things will continue to become more difficult the longer you remain on this path.</q>',
                hint: '• Where has Orteil (the Game Creator) provided dated information to the user? <br>• Is there a beginning to that information? Maybe you should read it.<br>• Where else have you seen the word leprechaun in Cookie Clicker?',
                puzzleClass: BlessingCreatorPuzzle,
                mainIcon: [4, 17, customSpriteSheetUrl],
                completionMessage: 'You curried favor with the Creator. The blessing lingers, but so does the risk.',
                completionIcon: [0, 17, customSpriteSheetUrl],
                dependencies: ['brothers_masquerade'], 
                isActive: false,
                type: 'investigate'
                },
               
                'they_are_watching': {
                name: 'They are watching you',
                puzzleClass: TheyAreWatchingPuzzle,
                description: 'Classifieds burned. Courier missing. You cut the line and moved to coded relays, pushing a false lead for them to chase.<q>We bought you room, not safety. From now on, speak masked or not at all.</q>',
                clue: 'The Order found our newspaper drops and our courier never returned. We fear they\'re onto you as well. From here on, every message must be encoded.<q>The Romans had their tricks. XIII should jog your memory.</q><div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message1.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• There are many ciphers used throughout history, but the Caesars of the Roman Empire favored one. The number 13 is the key you will need.',          
                mainIcon: [3, 35, gardenSpriteSheetUrl],
                completionMessage: 'They followed the decoy; your trail cooled.',
                completionIcon: [2, 16, customSpriteSheetUrl],
                dependencies: ['blessing_creator'],
                isActive: false,
                type: 'investigate'
                },
                
                'brother_onto_you': {
                name: 'A brother is onto you',
                puzzleClass: BrotherOntoYouPuzzle,
                clue: 'The Order is getting better at breaking our ciphers. We have an urgent message, decode it now; time is short.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message4.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• A blind friend would be very helpful in this situation.',
                mainIcon: [1, 14, customSpriteSheetUrl],
                description: 'A name surfaced: Brother Corvin. By dusk he was due before the elders; he never arrived. The shaft took him, and with it the words that would have ended you.<q>This is the line we hoped you wouldn\'t need to cross. Stay calm; stay unseen.</q>',
                completionMessage: 'The report died in the dark; the elders never spoke your name.',
                completionIcon: [1, 17, customSpriteSheetUrl],
                dependencies: ['they_are_watching', 'feast_four'],
                isActive: false,
                type: 'investigate'
                },
                
                'send_word': {
                name: 'Send word',
                clue: 'It has been too long, my friend, you\'ve gone deep into your task.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message3.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• Dots and dashes as they are called, before text messaging people had other ways to send messages to each other.<br>• There is only one type of Grass in Cookie Clicker, especially one that can be placed on top of wood.',
                description: 'Silence stretched too long. You slipped a small sign through and it reached us.<q>Stay on mission. They\'re already weighing your loyalties.</q>',
                puzzleClass: SendWordPuzzle,
                completionMessage: 'Your sign arrived. The line holds... for now.',
                mainIcon: [7, 16, customSpriteSheetUrl],
                completionIcon: [9, 13, customSpriteSheetUrl],
                dependencies: ['veiled_ledger', 'brother_onto_you'],
                isActive: false,
                type: 'investigate'
                },
     
                'spy_purge': {
                name: 'Shadows in the ranks',
                puzzleClass: SpyPurgePuzzle,
                description: 'You carried out the purge, twenty-seven grandmas cut in a single sweep. Rumors stalled and the watchers shifted their gaze.<q>You can\'t know if all were spies—only that you\'re still alive.</q>',
                clue: 'Our messages continue to be intercepted; we have to raise the difficulty again. Act urgently and cleanly, or your fate is already sealed.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message2.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• Placing letters into two tic-tac-toe boards may help understand this cipher.<br>• Remember the characters from The Peanuts cartoon series, one of their names may aid you in searching.',  
                mainIcon: [11, 15, customSpriteSheetUrl],
                completionMessage: 'Twenty-seven cut. The whispers stopped... for now.',
                completionIcon: [0, 16, customSpriteSheetUrl],
                dependencies: ['veiled_ledger', 'send_word'],
                isActive: false,
                type: 'investigate'
                },
                
                'close_call': {
                name: 'Close call',
                description: 'The Lawkeeper\'s circuit ended and the hall exhaled. You put space between the last drop and our line without leaving a mark.<q>Judgment tilted your way by a hair, don\'t test it.</q>',           
                clue: 'That was too close for comfort. We hope this finds you in good spirits, we need to maintain distance to keep the ruse intact.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message5.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• A little more complex than the Caesar Cipher but letters are still being shifted here.<br>• That stand alone "Z" is a dead giveaway for this type of cipher.',             
                puzzleClass: CloseCallPuzzle,
                mainIcon: [13, 14, customSpriteSheetUrl],
                completionMessage: 'The bundle moved unnoticed; the watchers saw nothing.',
                completionIcon: [0, 17, customSpriteSheetUrl],
                dependencies: ['lawkeeper_walk', 'spy_purge'],
                isActive: false,
                type: 'investigate'
                },
                
                'false_beacons': {
                name: 'False beacons',
                description: 'They seeded decoys. You moved only on our mark and returned a quiet countersign. Their bait went unused.<q>Mark first, message second. Beware of being led astray.</q>',            
                clue: 'The Order has proved more clever than we could have ever imagined.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message9.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• Before radios sailors still needed to communicate at a distance, though slightly outdated these still play an important role in the maritime world.',
                puzzleClass: FalseBeaconsPuzzle,
                mainIcon: [12, 13, customSpriteSheetUrl],
                completionMessage: 'You ignored the decoys; our mark came back clean.',
                completionIcon: [2, 16, customSpriteSheetUrl],
                dependencies: ['rite_fivefold_casting', 'close_call'],
                isActive: false,
                type: 'investigate'
                },
                
                'infiltration_progress': {
                name: 'Infiltration progress',
                description: 'You\'re deep inside their routine now, and doubts grow on all sides. Your quiet confirmation landed and eased them... for now.<q>Hold course; proximity isn\'t belonging.</q>',
                clue: 'A letter finds its way to you.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message8.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• In the early days of texting before phones had full keyboards this was the only way to get the job done.<br>• 0s and 1s are special.',
                puzzleClass: InfiltrationProgressPuzzle,
                mainIcon: [12, 17, customSpriteSheetUrl],
                completionMessage: 'Confirmation received. The line holds.',
                completionIcon: [1, 17, customSpriteSheetUrl],
                dependencies: ['ledger_bonds', 'false_beacons'],
                isActive: false,
                type: 'investigate'
                },
    
                'built_trust': {
                name: 'Built trust',
                description: 'You offered a quiet sign in the garden and let it stand. Word moved through the halls: steady hands, steady heart.<q>Use their trust.</q>',
                clue: 'You have built trust with The Order and they are on the path to accepting you as their own, stay true to your mission.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message6.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• Computers have a lot of ways to encode text to be more readable for machines, this is an older method but not the oldest.<br> • Figuring out what range of letters appear with the numbers will help narrow your search.',
                puzzleClass: BuiltTrustPuzzle,
                mainIcon: [11, 13, customSpriteSheetUrl],
                completionIcon: [0, 17, customSpriteSheetUrl],
                completionMessage: 'The sign was seen and noted. Your standing rose.',           
                dependencies: ['storm_devotion', 'infiltration_progress'],
                isActive: false,
                type: 'investigate'
                },	
                
                'watch_keeper_rounds': {
                name: 'Watchkeeper rounds',
                description: 'You crossed under patrol using the cadence they trust. The watch counted, nodded, and let you pass.<q>In that yard, cadence beats courage.</q>',
                clue: 'Unable to sleep, you lie awake in the dead silence of midnight, listening to the watchman\'s footsteps echo through the streets. In the stillness, the old church catches your eye.<div style="text-align:center;margin:8px 0;width:100%;"><video src="https://raw.githubusercontent.com/dfsw/Cookies/main/chruch.mp4" style="width:300px;height:300px;border:2px solid #666;border-radius:4px;" autoplay loop muted playsinline></video></div>',
                hint: '• Dots and dashes are a good way to send a message over distance without making any noise.<br>• An envoy brings a message, what is another type of person that shares a message? Where can you find them in Cookie Clicker?<br>• Just because a lamp is out doesn\'t mean it no longer exists.',            
                puzzleClass: WatchKeeperRoundsPuzzle,
                mainIcon: [9, 16, customSpriteSheetUrl],
                completionMessage: 'You cleared the yard without a second look.',
                completionIcon: [2, 17, customSpriteSheetUrl],
                dependencies: ['six_jars_ledger', 'built_trust'],
                isActive: false,
                type: 'investigate'
                },
                
                'rosetta_stone': {
                name: 'Rosetta stone',
                description: 'The Order presses closer at every turn. You stay only a half-step ahead.<q>Exhausted by the chase, you aren\'t sure how much longer you can keep this up... or whether you still want to.</q>',
                clue: 'This stone tablet bears familiar marks, half-remembered. You\'ve seen these symbols before, perhaps it was just a dream spoken in another tongue...<br><br>Search out the stone that can provide the twin keys you need.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message10.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• Where would you go to see foreign languages in Cookie Clicker, look carefully.',
                puzzleClass: RosettaStonePuzzle,
                mainIcon: [9, 14, customSpriteSheetUrl],
                completionMessage: 'The stone held the key. You cracked the script.',
                completionIcon: [1, 17, customSpriteSheetUrl],
                dependencies: ['watch_keeper_rounds'],
                isActive: false,
                type: 'investigate'
                },
                
                'mask_wears_thin': {
                name: 'Mask wears thin',
                description: 'A description began to circulate; height, eye-color, hair, stance. You altered your appearance before dawn and the whispers passed you by.<q>They hunt a sketch; be the smudge instead.</q>',
                clue: 'Danger is following you. Among the Brotherhood, some have learned a spy\'s description; outfox them to keep your cover.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message7.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• There appears to be extra spacing between some of the columns, it separates them out into equal groups. The robot stamp is already a clue!<br>• Lights are warm when on and cool when off right? Colors can be warm and cool too.',         
                puzzleClass: MaskWearsThinPuzzle,
                mainIcon: [15, 17, customSpriteSheetUrl],
                completionIcon: [1, 16, customSpriteSheetUrl],
                completionMessage: 'Face changed. Eyes moved on.',
                dependencies: ['vaulted_relics', 'rosetta_stone'],
                isActive: false,
                type: 'investigate'
                },
                
                'still_with_us': {
                name: 'Still with us',
                description: 'Silence bred doubt. You answered with a signal, stripped of ornament, and it reached us unnoticed.<q>We believe you remain on mission, but their pull is strong, you are close do not weaken.</q>',
                clue: 'Remember what we truly are to you and you will have the key you need to decode this communication.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message11.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• Some ciphers cannot be broken without the proper key, do you remember what your ally called themselves when they sent you classified ads?',
                puzzleClass: StillWithUsPuzzle,
                mainIcon: [3, 16, customSpriteSheetUrl],
                completionMessage: 'Sign received. You are still with us.',     
                completionIcon: [9, 13, customSpriteSheetUrl],
                dependencies: ['sigils', 'mask_wears_thin'],
                isActive: false,
                type: 'investigate'
                },   

                'silent_choir': {
                name: 'The silent choir',
                description: 'You stilled every voice until only the digits sang. In that hush, The Order answered, and marked you as a willing initiate.<q>This was the first secret your ally risked everything to deliver. You now stand at the threshold of the Brotherhood.</q>',
                clue: 'Each hall has its clamor, but only one may sing.<br>Still every voice, save the beckoning digits.<br>Only then in silence, will The Order speak.<q>The order often speaks through riddles and clues guarding their initiation process from outsiders.</q>',
                hint: '• There are twenty halls in Cookie Clicker. Only one of them has digits though. Quiet the others.',
                puzzleClass: SilentChoirPuzzle,
                mainIcon: [17, 17, customSpriteSheetUrl],
                completionMessage: 'Silence falls, digits echo, The Order accepts your presence.<q>They believe you seek to join.</q>',
                completionIcon: [0, 14, customSpriteSheetUrl],
                dependencies: ['small_token'], 
                isActive: false,
                type: 'infiltrate'
                },		 
                
                'spiral_seasons': {
                name: 'The wheel of seasons',
                description: 'You turned the crooked wheel, letting each season rise and fall in The Order\'s rhythm. Their cycle is not nature\'s, yet you followed without hesitation.<q>The Brotherhood notes your obedience. To walk their year is to step further inside.</q>',
                clue: 'The wheel does not turn straight.<br>First, crimson vows are sworn.<br>Then comes the herald in scarlet cloak.<br>The jester of ledgers laughs.<br>The hare hides its shell.<br>Shadows feast in the dark.<br>The bells toll in frost, and at the end, the hungry dead return.',
                hint: '• The wheel of time doesn\'t always turn straight, each season has themes; turn them in the correct order.',
                puzzleClass: SpiralSeasonsPuzzle,
                mainIcon: [16, 6, mainIconsSpriteSheetUrl],
                completionMessage: 'The wheel has turned, its crooked path obeyed. The Order\'s rhythm flows through your steps.<q>You have shown you can keep their time, no matter how twisted.</q>',
                completionIcon: [5, 14, customSpriteSheetUrl],
                dependencies: ['silent_choir'],
                isActive: false,
                type: 'infiltrate'
                },		
                        
                'rite_shifting_measures': {
                name: 'The rite of shifting measures',
                puzzleClass: RiteShiftingMeasuresPuzzle,
                description: 'You cast off ships, raised gates, kindled suns, ruined houses, and lifted spires, each crooked measure bound in its turn. The seal held, and The Order watched.<q>Such rites are spoken to test faith as much as skill. You obeyed, and for now, they are satisfied.</q>',
                clue: 'The Brothers bind their steps in crooked sums,<br>five measures across sea, gate, sun, coin, and sky.<br><br>First, cast off a handful of Ships in Harbor, then raise half a dozen Crimson Gates.<br>Next, kindle thrice three Scattered Suns, then ruin the Houses of Coin by a dozen pieces.<br>Last, let the Spires of the Firmament climb elevenfold, and the ritual seal shall hold.',
                hint: '• These sound like buildings, don\'t they? What could ships, red gates, scattered light, houses of money, and tall towers be? How many fingers on a hand sounds like its pretty full no? Despite some common misconceptions a chancemaker is not a casino.',
                mainIcon: [13, 12, customSpriteSheetUrl],
                completionMessage: 'The crooked sums are complete, the seal holds firm.<q>The Order marks your obedience in silence.</q>',
                completionIcon: [4, 14, customSpriteSheetUrl],
                dependencies: ['spiral_seasons'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'initiation_riddle': {
                name: 'Initiation games',
                puzzleClass: InitiationRiddlePuzzle,
                description: 'You echoed their chant, childish on its surface yet meaningful to them. The Brothers laughed, voices rising with yours, and for a moment suspicion eased.<q>Every fraternity has its games. Play along, and they may forget to question you.</q>',
                clue: 'To walk among Brothers, mimic their childish rite.<br>They shout a single charm three times in rising chorus,<br>a game to children, but to The Order a sign of kinship.<br>Do as they do, swiftly and without straying,<br>and the brothers may welcome you with open arms.',
                hint: '• Magic words could be called charms. Is there somewhere in the game that uses magic?',
                mainIcon: [16, 15, customSpriteSheetUrl],
                completionMessage: 'Once, twice, thrice, the chant complete. Laughter covers suspicion, and for now you blend in.<q>You are counted among them, though only in play.</q>',
                completionIcon: [7, 13, customSpriteSheetUrl],
                dependencies: ['garden_sigil'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'spirits_thrones': {
                name: 'Spirits upon their thrones',
                puzzleClass: SpiritsThronesPuzzle,
                description: 'You seated each spirit in turn, gold, ash, and ink, never together, always alone. The veil quivered, then parted, and the Brothers nodded in approval.<q>This was no game. You carried out their rite with care, and in their eyes, you are changed.</q>',
                clue: 'The veil is held by three spirits.<br><br>The first, draped in gilt, who mocks all labor and hungers for spoils,<br>he claims the throne of blood.<br><br>The second, born of quake and ash, scattering every work,<br>he sits upon the crown of brilliance.<br><br>The last, the hidden scribe, whose tendrils wrote all that was and will be,<br>the verdant seat belongs to his creation.<br><br>Each has but a single throne.<br>Seat them in their destined order,<br>never with another at their side.<br>When each has risen and fallen alone,<br>the veil will part.',
                hint: '• Where do spirits reside? Each spirit has different attributes as does each slot/seat where they can be placed.<br>• When seating them make sure they are alone.',
                mainIcon: [8, 15, customSpriteSheetUrl],
                completionMessage: 'The spirits rose and fell upon their thrones, each alone, each in order. The veil parts.<q>The Brotherhood sees you not as a guest, but as one who obeys their rites.</q>',
                completionIcon: [2, 14, customSpriteSheetUrl],
                dependencies: ['initiation_riddle'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'brothers_masquerade': {
                name: 'The brothers\' masquerade',
                puzzleClass: BrothersMasqueradePuzzle,
                description: 'They taught you to wear Brother Sebastian\'s face: bare brow, raven beard, ivory flesh, prism-shattered eyes. You carried his name and walked unchallenged. For a moment, you weren\'t just imitating, you were him.<q>Even you felt the mask blur. Was it disguise, or revelation?</q>',
                clue: 'The Brotherhood give freely to their kin, but guards their treasure from strangers.<br>Wear the face and bear the name of Brother Sebastian, brow bare, beard raven and bountiful, ivory flesh, and eyes distorted by prisms.<br>Then shall they grant you their token.',
                hint: '• Where can you change your appearance in Cookie Clicker? There is even a vanilla achievement for it.<br>• Changing your appearance isn\'t enough to fool anyone if you walk around with your own name still.',
                mainIcon: [13, 15, customSpriteSheetUrl],
                completionMessage: 'The mask held. The Brothers saw Sebastian, not you.',
                completionIcon: [3, 14, customSpriteSheetUrl],
                dependencies: ['spirits_thrones'], 
                isActive: false,
                type: 'infiltrate'
                },
                
                'pattern_altars': {
                name: 'The pattern of the altars',
                description: 'You counted what cannot be broken and took the first five in their sacred order. One raised, the next cast down, ever climbing, never the same twice. The hall felt the older mathematics stir, and the Brothers watched without blinking.<q>The further you go, the thinner the margin. Precision is no longer a courtesy; it is cover.</q>',
                clue: 'Count the home of the altars where the spirits rest.<br>Seek the numbers that cannot be broken,<br>save by themselves and the One.<br>Take the first five in their divine order.<br>Raise one, then cast the next down,<br>ever climbing, never the same twice.<br>Each count a vow, each altar a hymn.',
                hint: '• Where do the spirits reside? Is there a building associated with them?<br>• What is the name of numbers cannot be divided by anything but themselves and one?',
                puzzleClass: PatternAltarsPuzzle,
                mainIcon: [13, 16, customSpriteSheetUrl],
                completionMessage: 'Altars align and the prime vow answers.<q>Eyes linger longer now. One misstep is all it takes.</q>',
                completionIcon: [4, 14, customSpriteSheetUrl],
                dependencies: ['brothers_masquerade'], 
                isActive: false,
                type: 'infiltrate'
                },
                
                'litany_crumbs': {
                name: 'Magical rites of passage',
                description: 'You measured to the mark and spoke the breaths in order, quieting chaos, striking the bargain, stretching time, waking what slept. The vessel settled precisely, and a hush moved through the room.<q>Someone notes your steadiness. A new hand begins to open doors rather than close them.</q>',
                clue: 'Bring the vessel to one part in five of six hundred,<br>and take back five for fortune\'s favor.<br>No drop more, no drop less.<br>Speak the rite in these breaths:<br>Hush the chaos,<br>strike the bargain,<br>stretch the moment,<br>wake what slumbers.',
                hint: '• Spells need mana, and that vessel must be precisely filled before you can begin.<br>• Each spell has a particular meaning.',
                puzzleClass: LitanyCrumbsPuzzle,
                mainIcon: [5, 16, customSpriteSheetUrl],
                completionMessage: 'The rite holds; the mixture obeys.<q>A Brother lingers at the threshold, as if waiting to see what else you can be trusted with.</q>',
                completionIcon: [6, 14, customSpriteSheetUrl],
                dependencies: ['pattern_altars'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'spiral_fortune': {
                name: 'The spiral of fortune',
                description: 'From nothing came one, then another, each step recalling the last two. A spiral took shape, petals and shells hidden in numbers, and the Brothers watched as you counted without falter.<q>This was no child\'s game. You were shown a pattern that only the initiated know, and you walked it as if born to it.</q>',
                clue: 'Where greed resides, a fortune starts from nothing.<br>Not a single grain, then one soon follows<br>The climb has just begun.<br>Each step recalls the two before,<br>A spiral born of memory and more.<br>Like petals drawn or shells aligned,<br>In nature\'s code the path defined.<br>Yet halt the climb at fourteen told,<br>And count the sums in sequence old.',
                hint: '• Where does greed reside? Can\'t have greed without money right?<br>• Spirals in nature follow a very specific pattern.',
                puzzleClass: SpiralFortunePuzzle,
                mainIcon: [16, 14, customSpriteSheetUrl],
                completionMessage: 'The spiral grows beneath your hand, each sum in place.<q>They exchange glances now, the kind reserved for those no longer seen as outsiders.</q>',
                completionIcon: [2, 14, customSpriteSheetUrl],
                dependencies: ['litany_crumbs'], 
                isActive: false,
                type: 'infiltrate'
                },
                
                'wrinkler_clock': {
                name: 'The demonic clock',
                puzzleClass: WrinklerClockPuzzle,
                description: 'The wheel held, and time itself bowed to the Brothers\' command.<q>This was no private rite. Eyes fixed upon your hands, measuring every motion. A single mistake would have betrayed you.</q>',
                clue: 'Teeth keep the time.<br>Mark the quarters,<br>the first and third feed,<br>the second and fourth fall silent.<br><br>Then heed the neighbors of the quarters,<br>those who follow any quarter shall wake,<br>those who stand before any quarter shall sleep.<br><br>When the wheel holds, The Order will convene.',
                hint: '• Little leeches can be seen as hands on a clock, make sure you have all 12 hands or it\'s not really a clock.',
                mainIcon: [14, 14, customSpriteSheetUrl],
                completionMessage: 'The quarters align and the wheel obeys. No fault is found.',
                completionIcon: [7, 13, customSpriteSheetUrl],
                dependencies: ['spiral_fortune'], 
                isActive: false,
                type: 'infiltrate'
                },
                
                'feast_four': {
                name: 'The unfinished feast',
                puzzleClass: FeastFourPuzzle,
                description: 'You learned their restraint. At each table you left one dish untouched, love unbitten, spring uncracked, shadow unburied, winter unopened. Nearly bare, never empty. The Brothers nodded at a custom older than hunger.<q>Their taboos are the passwords now. Break one, and you break your cover.</q>',
                clue: 'As the Cookie Eclipse hides its face, so too the Brothers do not glut themselves on every feast<br>From each table they take near all, but never the last dish.<br>One sweet of love left untasted,<br>one shell of spring left uncracked,<br>one bone of shadow left buried,<br>one gift of winter left unopened.<br>When the plates are nearly bare,<br>yet not a single table cleared,<br>their fast is complete.',
                hint: '• Each season has its treats, you may need to ascend to accomplish this task.',
                mainIcon: [10, 15, customSpriteSheetUrl],
                completionMessage: 'The feast ends unfinished. The Brotherhood is satisfied.',
                completionIcon: [5, 14, customSpriteSheetUrl],
                dependencies: ['wrinkler_clock', 'blessing_creator'],
                isActive: false,
                type: 'infiltrate'
                },           

                'trial_scales_patience': {
                name: 'The trial of scales',
                description: 'They placed the dragon before you, its hide a canvas of crowns and scales, and named what you must shun. Milk and light were scorned; stone and the miser\'s hand embraced. Seven touches, no more, no less. You obeyed while your heart raced.<q>This was no rite to learn but a trap to spring. The Order is watching for cracks.</q>',
                clue: 'The Brothers scorn the crowns of milk and light.<br>Choose instead the halo where thought burns brightest,<br>and the grip of greed that guards its trove.<br>Place them both upon a fiery pet,<br>then lay your hand upon its hide,<br>seven times in patience.',
                hint: '• Do you happen to have a fiery pet? Does that pet usually have things to do with milk and light? Maybe even radiant light?',
                puzzleClass: TrialScalesPatiencePuzzle,
                mainIcon: [6, 17, customSpriteSheetUrl],
                completionMessage: 'Scales and hands laid true. The dragon sleeps; The Order\'s gaze lingers.',
                completionIcon: [7, 14, customSpriteSheetUrl],
                dependencies: ['feast_four'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'garden_hearts': {
                name: 'The hidden garden',
                puzzleClass: GardenHeartsPuzzle,
                description: 'They set you to work in the open earth, where four red hearts ripened inside a crown of bone-white stalks. You waited, exposed, until everything stood exactly as decreed, no leaf astray, no timing off, and then tore the harvest in a single motion.<q>This was a test in daylight. One hesitance, one extra cut, and your purpose would have shown.</q>',
                clue: 'Four hearts swell in the hollow,<br>red and full of sweet promise.<br>Around them lies a barren hush,<br>no root, no leaf, only waiting earth.<br>Beyond that silence, a crown of bone-white stalks,<br>roots that do not wither, teeth that do not fall.<br>When the hearts are ripe and the dead still stand,<br>tear down what is mortal all in one motion,<br>and the vow is sealed.',
                hint: '• Did you know each plant in the garden has specific and descriptive flavor text?<br>• There is a specific key combo to harvest only mature mortal plants, that\'s an important combo to know.',
                mainIcon: [11, 16, customSpriteSheetUrl],
                completionMessage: 'One motion, cleanly done. The hearts fall the sentries remain.',
                completionIcon: [4, 14, customSpriteSheetUrl],
                dependencies: ['trial_scales_patience', 'brother_onto_you'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'veiled_ledger': {
                name: 'The veiled ledger',
                puzzleClass: VeiledLedgerPuzzle,
                description: 'They placed the ledger before you, its pages heavy with hidden sums. Grain, shell, nectar, each tallied to the Brotherhood\'s design, each page turned and left bare in its rhythm. You wrote the numbers they demanded, and the seal closed without flaw.<q>This was no mere trial. They trusted you with their reckoning, and you balanced it as if born to their order.</q>',
                clue: 'The Order keeps its secrets not in words but in accounts.<br>Three tallies must be set upon the ledger:<br>The white grain that sweetens all, a dozen thrice over.<br>The pale confection, seven tens, less three.<br>The golden nectar of the hives, three fifties, and a score besides.<br>Leave every other page bare,<br>and the ledger shall be sealed.',
                hint: '• Sounds like Sugar, Honey, and White Chocolate, where have you seen those before?',
                mainIcon: [15, 16, customSpriteSheetUrl],
                completionMessage: 'The ledger closes, tallies exact. You are trusted with their numbers.',
                completionIcon: [7, 14, customSpriteSheetUrl],
                dependencies: ['garden_hearts'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'ringing_halls': {
                name: 'The ringing of the halls',
                puzzleClass: RingingHallsPuzzle,
                description: 'Twenty halls clamored at once, and you silenced all but seven. Each spared voice matched their law: vows, mirrors, suns, and stolen tomorrows. When the tally ended, the chambers rang true.<q>The Brothers watched in silence, weighing not just your obedience but the ease with which you carried it out. Too perfect, and questions may follow.</q>',
                clue: 'From first help to the final mirror, twenty chambers ring.<br>Stillness claims all but seven, and the first, which the void may never take.<br><br>The hall of vows must murmur still.<br>One chamber that is the square of three cannot be stilled.<br>The mirror at the end must answer.<br>Spare the hall where tomorrow is stolen.<br>Let the second hearth keep its ember.<br>Where suns are scattered, the light must fall through.<br>And keep the count of the twice-born nine.',
                hint: '• Still is quiet, and quiet is still.<br>• These sound like things you have seen, there are 20 of them, the first one is special don\'t let it throw your counts off.',            
                mainIcon: [16, 17, customSpriteSheetUrl],
                completionMessage: 'The halls fall quiet, seven voices spared. The Brotherhood nods, though some eyes linger.',
                completionIcon: [0, 14, customSpriteSheetUrl],
                dependencies: ['veiled_ledger'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'lawkeeper_walk': {
                name: 'The lawkeeper\'s walk',
                description: 'They sent you alone under The Order\'s gaze, green stone first, then the jewel of sixfold light, and last the crimson square. You kept to the path, no companion, no misstep. The hall weighed you in silence and let the verdict hang.<q>Judgment isn\'t always spoken. Today, it tilts your way, by a hair. Not every Brother is convinced.</q>',
                puzzleClass: LawkeeperWalkPuzzle,
                clue: 'The Lawkeeper walks a path of solitude for he is here to judge you.<br>First, upon the stone of green his step must fall.<br>Then, to the jewel of sixfold light he must ascend.<br>Last, he shall rest on the crimson square before his journey concludes.<br>None may stride beside him, for the Law is kept by none but him.',
                hint: '• The lawkeeper keeps order. Where might have you seen someone in charge of order keeping before?',
                mainIcon: [22, 19, mainIconsSpriteSheetUrl],
                completionMessage: 'The path is walked alone; judgment holds, for now.',
                completionIcon: [1, 14, customSpriteSheetUrl],
                dependencies: ['ringing_halls', 'spy_purge'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'compass_sentinel': {
                name: 'The compass rose',
                description: 'They gave you the star, the seas, the dawn, the dusk, each edge of the wheel to bind and silence. You set the sentinel and lit the watchfires exactly as they demanded, but the circle closed around you tighter than before.<q>Some Brothers whisper now. Your precision impresses, but your intent is a question unsatisfied. One misstep and the mask shatters.</q>',
                clue: 'Crown the pole of steadfastness with fire, for it alone endures.<br>In the deeps beneath, no flame may live.<br>Where the first light stirs, strike it silent, yet let its two heralds burn bright.<br>At the place of dying sun, let the blaze roar, but bind both its shoulders fast.<br>Of the four slanting winds, only those that lean toward dawn may shine.<br>Now return to the crown, and remember: what is lit first must be quenched last.<br>When these decrees are fulfilled, the wheel is broken, and the sign is made.',
                hint: '• 12 points on a compass, what else has 12 points that can all be associated with direction?<br>• Work out each point at a time. The last item must be done last in the chain.',
                puzzleClass: CompassSentinelPuzzle,
                mainIcon: [12, 14, customSpriteSheetUrl],
                completionMessage: 'The wheel is broken; the whispers grow louder.',          
                completionIcon: [3, 14, customSpriteSheetUrl],
                dependencies: ['lawkeeper_walk', 'close_call'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'litany_broken_vows': {
                name: 'The litany of broken vows',
                description: 'You swore, broke, swore again, each vow chaining you tighter to their creed. The Matriarchs slept and woke in turn, the sky shrouded in silver, the seasons marched their circle. The Brothers marked every word.<q>Vows are no jest in this hall. To break them is to prove devotion twisted to their will. But some eyes searched deeper, wondering what you truly serve.</q>',
                clue: 'The Brothers speak of vows that bind in chains,<br>a complicated rite not meant to be spoken lightly.<br><br>Swear it, break it, swear again,<br>and only thrice may the Matriarchs sleep<br>before waking in truth.<br><br>When their whispers are stilled,<br>the gilded switch shall light the world,<br>the silver veil shall be drawn across the sky,<br>and the year shall be walked in turn,<br>each season passing in its rightful order.<br><br>Thus is the circle sealed.',
                hint: '• Where can you make and break vows to the grandmatriarchs? What other things can you do in that same area?',
                puzzleClass: LitanyBrokenVowsPuzzle,
                mainIcon: [8, 13, customSpriteSheetUrl],
                completionMessage: 'The vows bind, break, and bind again. The circle is sealed, yet suspicion stirs.',
                completionIcon: [1, 14, customSpriteSheetUrl],
                dependencies: ['compass_sentinel'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'rite_fivefold_casting': {
                name: 'The rite of five incantations',
                description: 'You spoke the fivefold words, shadow hushed, fury bound, bargain sealed, sand stretched, sprites unleashed. Each syllable echoed in the chamber until the circle thrummed with power. The Brothers listened in silence, weighing every breath.<q>This was no outer rite. You have been made to stand within the circle of the Enchanted Whisk, and each word spoken binds you tighter to their gaze.</q>',
                clue: 'The Brothers whisper of a circle wrought not with stone,<br>but with incantations, five in measure.<br>Begin with the shadow that stirs yet cannot rise.<br>Next bind the failure, lest it spoils the ritual.<br>Set forth a bargain, sealed in coin.<br>Grasp the sand as it slips the glass,<br>stretching each grain beyond its course.<br>Finally, unleash the nimble sprites,<br>their deft hands completing the weave.',
                hint: '• Shadows stir but they don\'t rise, sounds like a failure to me. Certain conditions cause a failure to always happen here.<br>• What else could sprites mean, folklore can never seem to settle on proper names for these little things?',
                puzzleClass: RiteFivefoldCastingPuzzle,
                mainIcon: [6, 16, customSpriteSheetUrl],
                completionMessage: 'The five incantations resound. The Brothers\' circle holds you within.',
                completionIcon: [4, 14, customSpriteSheetUrl],
                dependencies: ['litany_broken_vows'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'grandmatriarchs_flight': {
                name: 'The grandmatriarchs\' flight',
                puzzleClass: GrandmatriarchsFlightPuzzle,
                description: 'The crimson hymn rose, ovens quaked, and fortune poured across the earth. While others reached for riches, you turned aside and stepped into the Great Beyond. The Matriarchs shrieked above, and still you held fast.<q>This was a public act, bold and dangerous. In the chaos, you risked everything to prove you would not betray their creed of restraint.</q>',
                clue: 'When the Grandmatriarchs shriek their crimson hymn,<br>the ovens quake and fortune floods the earth.<br>Yet the faithful must turn from abundance,<br>stepping into the Great Beyond while the chorus still roars.',
                hint: '• You won\'t want to run from so many cookies but sometimes you have to forgo riches. What is the only way you can truly end this type of frenzy early?',
                mainIcon: [13, 13, customSpriteSheetUrl],
                completionMessage: 'The hymn fades, the storm of fortune passes. You stood apart, and they saw.',
                completionIcon: [5, 14, customSpriteSheetUrl],
                dependencies: ['rite_fivefold_casting'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'ledger_bonds': {
                name: 'The ledger of bonds',
                puzzleClass: LedgerBondsPuzzle,
                description: 'They set the hidden sums before you, each number bound to the next in chains of balance. You traced their knots and laid the bonds true, the ledger closing with a weight that was more than ink.<q>To be trusted with their reckoning is to be seen as one of them. But every figure is a snare, and you walked among them without falter.</q>',
                clue: 'The Order reckons in hidden sums.<br>Let the sky-borne couriers be your measure.<br>The fields of grain lag the couriers by three-score.<br>The veins of the earth are half again the fields<br>and yet the veins and the couriers must be as one.<br>The houses of coin hold the veins plus the couriers.<br>The sanctums of prayer keep a third of those coffers.<br>The broken clocks are the sanctums plus ninety.<br>The recursive engines are half those clocks.<br>when every bond holds, the knot will loosen.',
                hint: '• Figuring out the names is the first part of the battle, from there you will need to associate the relationships. It\'s a good thing you ascended recently, otherwise you might need to sell too many to be worthwhile; now you can just buy. Only totals matter here.',
                mainIcon: [8, 17, customSpriteSheetUrl],
                completionMessage: 'The bonds hold fast; the ledger closes. Trust deepens.',
                completionIcon: [6, 14, customSpriteSheetUrl],
                dependencies: ['grandmatriarchs_flight'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'garden_pattern': {
                name: 'The undying',
                puzzleClass: GardenPatternPuzzle,
                description: 'They led you into the hollow where bone-white stalks guard the earth. Between them, blooms waited for order, their pattern incomplete. With careful hands you set the rows, white and mixed, silence and color, until the garden itself bowed to their design.<q>In tending this place, you left a trace of yourself among them. The pattern is theirs, but now it bears your hand.</q>',
                clue: 'The Six Orders mark their halls with a sign that never dies.<br><br>At its heart, four crowns of the elusive bloom,<br>a petal of foreverness, guardian against the rot, yet whose sweetness hides a trace of poison.<br><br>Not in a single stem, but in limbs of doubled breadth shall these crowns be set, reaching ever out in perfect form.<br><br>The others filled with the forgotten stalks, deathless blooms whose scent clouds the air and whose roots whisper of wrath.<br><br>Raise this deathless sigil, and in its geometry your false devotion shall be believed.',
                hint: '• Only two are truly immortal. Pay careful attention to the arms/legs/limbs, they are stretched straight out.',
                mainIcon: [12, 12, customSpriteSheetUrl],
                completionMessage: 'The stalks stand tall, the blooms aligned. The pattern holds, and so do you.',
                completionIcon: [2, 14, customSpriteSheetUrl],
                dependencies: ['ledger_bonds'], 
                isActive: false, 
                type: 'infiltrate'
                },
                
                'storm_devotion': {
                name: 'Devotion through the storm',
                description: 'The heavens split and gold fell like rain. Brothers clawed for riches, but you held back, hands bound in restraint. At the cookie\'s heart, you struck down the parasite, not the treasure.<q>This was no game of riddles but a trial of faith under fire. To take nothing when everything was within reach, that is what they demanded, and you gave it.</q>',
                clue: 'The storm will tempt you with riches,<br>but the Brothers spurn such glitter.<br>When the sky rains gold,<br>touch none of them.<br>Instead, strike down a quartet of leeches at the cookie\'s heart,<br>and prove your devotion is not swayed by material temptations.',
                hint: '• When cookies rain from the sky, especially when they are golden, or more specifically red, then you can begin.',
                puzzleClass: StormDevotionPuzzle,
                mainIcon: [7, 15, customSpriteSheetUrl],
                completionMessage: 'The storm passed, and you stood unshaken. They saw your devotion.',
                completionIcon: [7, 14, customSpriteSheetUrl],
                dependencies: ['garden_pattern'], 
                isActive: false, 
                type: 'infiltrate'
                },
                
                'false_dawn': {
                name: 'False dawn',
                description: 'You moved inside their "counterfeit hour," quietly widening the mess, striking a recipe from the books, seating a voice, and making the offering, exactly as written. No alarms, only ledger stamps and small nods from stewards.<q>They call it false dawn: rules bend for those who know the language. Your name just rose on lists you were never meant to see.</q>',
                clue: 'Not all dawns rise with the same face.<br>Some hours dress the world in counterfeit words,<br>and in those hours alone the ritual can be tallied.<br><br>Expand the mess, for employees do not bake on empty stomachs.<br>Strike a recipe from the ledger, for profit brooks no secrecy.<br>Seat a voice in the chamber, that flour may be decreed holy.<br>Increase holdings in the market, for faith untraded is wasted.<br><br>When these balances are kept,<br>the mask holds fast,<br>and the Brothers count you among the faithful.',
                hint: '• Sometimes buildings have different names and faces.',
                puzzleClass: FalseDawnPuzzle,
                mainIcon: [17, 6, mainIconsSpriteSheetUrl],
                completionMessage: 'The balances held. Stewards nodded; the mask didn\'t slip.',
                completionIcon: [5, 14, customSpriteSheetUrl],
                dependencies: ['storm_devotion'],
                isActive: false,
                type: 'infiltrate'
                },
                
                'rite_nine_flames': {
                name: 'The rite of nine flames',
                description: 'They entrusted you with the dragon\'s heart: nine flames, alone or in harmony, never the same. You performed the rite flawlessly, the chamber echoing with your voice as though it had always belonged there.<q>For the first time, you wondered: what if your mission ended here, among them? The thought didn\'t frighten you. It comforted you.</q>',
                clue: 'Nine steps bind the shadowed wheel,<br>miss one, and the circle shatters, and you must begin again.<br><br>First, call the sickle and the miser, bind hunger and hoarding in false union.<br>Next, break stone beside the changeling\'s blood.<br>Then crown the crooked fruit with the whisper of arcane fire.<br>Let the mirror reflect the distorted image of superior thought.<br>Bind good fortune to the belly of the beast; greed feeds hunger.<br>At the sixth toll, let the glass falsely reflect the clock-thief, illusion clutching time.<br>The black tithe stands in solitude, unshared, unabashed.<br>Place steel alongside chance, forge and dice in solidarity.<br>And to seal the rite let silence fall across the world.',
                hint: '• Your dragon can wear many hats, it\'s important to remember that. These sound like they could be some of those hats.<br>• Silence at the end is key, don\'t forget to leave the dragon quiet.<br>• Focus on the items themselves not the buildings they belong to.',            
                puzzleClass: RiteNineFlamesPuzzle,
                mainIcon: [14, 16, customSpriteSheetUrl],
                completionMessage: 'Nine flames tended. The dragon bowed. And part of you bowed with it.',
                completionIcon: [7, 14, customSpriteSheetUrl],
                dependencies: ['storm_devotion'], 
                isActive: false, 
                type: 'infiltrate'
                },
                
                'six_jars_ledger': {
                name: 'The six jars ledger',
                puzzleClass: SixJarsLedgerPuzzle,
                description: 'They opened the shelves, balances only the faithful may touch. You set the jars to their hidden sums, and the page closed as though your hand had always belonged there.<q>You did not hesitate. Only after, you asked yourself why. The Order of the Eternal Cookie is proud of the mathematical wit you demonstrated.</q>',
                clue: 'Set six jars upon the shelf.<br>The bitter dark jar holds twice the churned jar. <br>The pale flower keeps a dozen fewer than the darkness. <br>A third-pinch fills the salt from the pale flower.<br>The churn is nine shy of the wheat.<br>The fragile shells hold the wheat and the briny stones together.<br>And the tally of all six must be three gross less nine.<br>Leave every other jar bare, and only then will the page balance.',
                hint: '• Bitter dark sounds like something you put in a cookie, so do the rest of these in fact. Where have you seen a list of ingredients before?<br>• Pale flowers might make dark seed pods. <br>• Cream isn\'t churned but something else is.',
                mainIcon: [11, 12, customSpriteSheetUrl],
                completionMessage: 'The jars balanced. And so did your steps, more easily than they should have.',
                completionIcon: [4, 14, customSpriteSheetUrl],
                dependencies: ['rite_nine_flames'],
                isActive: false,
                type: 'infiltrate'
                },
    
                'nurses_fields': {
                name: 'Nurses in fields of Flanders',
                description: 'You walked the ward as though it were yours, filling beds, clearing corridors, leaving the patterns that were asked. The Caretaker nodded once and passed on.<q>Somewhere between the jars and the ward, you stopped pretending. When did that happen?</q>',
                clue: 'Staff every bed in the square ward with caretakers of red.<br>Wait until every post stands tall in its fullness.<br>Only then, clear the two great corridors corner to corner, no foot sets upon those crossing halls.<br>Along each outer wall, keep four in a row;<br>one pace inward, keep but two.<br>When the halls lie empty and the fours-and-twos endure,<br>the Caretaker will notice.',
                hint: '• Nurses are caretakers, sometimes they wear red. Where have you seen red nurses before?',
                puzzleClass: NursesFieldsPuzzle,
                mainIcon: [4, 16, customSpriteSheetUrl],
                completionMessage: 'The halls emptied, the pattern endured. And you endured with it.',
                completionIcon: [3, 14, customSpriteSheetUrl],
                dependencies: ['six_jars_ledger', 'watch_keeper_rounds'], 
                isActive: false, 
                type: 'infiltrate'
                },
                
                'rule_lights': {
                name: 'Celestial navigation',
                description: 'They led you into the dark, you arranged the lamps until the night bent to their order. In that stillness, the path was clear.<q>You once sought to expose their secrets. Now you carry their lanterns. The line between watching and belonging fades with every step.</q>',
                clue: 'The bright star guides the way.<br>A westerly wind sets upon her canvas.<br>Shine green from the lee beam through the lee quarter.<br>Keep the taffrail lantern bright.<br>Glow the bowsprit flame.<br>Light the weather quarters before dousing the astern one.<br>Let no other lights shine tonight',
                hint: '• A ship sailing towards the north star has many lights. 12 points can be used to represent these lights.',
                puzzleClass: RuleLightsPuzzle,
                mainIcon: [12, 16, customSpriteSheetUrl],
                completionMessage: 'The lamps fall silent, save those they commanded. The Order\'s path shines before you.',
                completionIcon: [2, 14, customSpriteSheetUrl],
                dependencies: ['nurses_fields'], 
                isActive: false, 
                type: 'infiltrate'
                },
                
                'vaulted_relics': {
                name: 'Behind iron doors',
                puzzleClass: VaultedRelicsPuzzle,
                description: 'The reliquary loomed, iron doors waiting in silence. You laid down treasures not to hold, but to surrender. The vault stirred as if it remembered your offering.<q>What you gave cannot be reclaimed. Nor can the part of yourself you sealed away with it.</q>',
                clue: 'The Great Orders are not fed by what you hold,<br>but by what you lay aside.<br>Their relics must rest in shadow, honored though never touched.<br>The Orders care not for specifics, only that your honor is sincere <br>Place a treasure for each,<br>the reliquary shall stir, when your task is sealed in iron',
                hint: '• Where can you place 6 objects in a safe place, maybe even one made out of iron, so they cannot be touched?',
                mainIcon: [8, 16, customSpriteSheetUrl],
                completionMessage: 'The reliquary closed. The cost is yours to bear.',
                completionIcon: [7, 14, customSpriteSheetUrl],
                dependencies: ['rule_lights'],
                isActive: false, 
                type: 'infiltrate'
                },
                
                'sigils': {
                name: 'Hidden vows',
                puzzleClass: SigilsPuzzle,
                description: 'Six fragments, six vows, crown, spark, gleam, heart, shadow, song. You gathered them, bound them, and the ovens roared as the sigil burned bright. You were no longer copying their rites, you were shaping their mark.<q>Your friend would call this betrayal. The Brothers call it proof. And part of you agrees with them.</q>',
                clue: 'In the beginning six ancient vows were sworn, each leaving a single fragment of the mark.<br>Look not to what they share<br>Seek instead uniqueness, where true meaning dwells.<br><br>From those who worship the shining tool that stirs the dough, take the crown upon its head.<br>From those who make the batch no hand could ever bake, seize the spark that begins its fire.<br>From those who kneel before the crumb that glitters brighter than coin, lift the mark that gleams first.<br>From those that dwell in the shadow that blots the sky, take its hidden heart.<br>From those who took the vow that outlasts time, carve the final shade it casts.<br>From those who used the whisk that dances with magic, draw the penultimate hiss of its song.<br><br>Bind these fragments together.<br>Let the ovens burn beneath this name, and the path will open.',
                hint: '• You have been given all the names over time, you just need to put them together. Each name lends a single letter.',
                mainIcon: [8, 14, customSpriteSheetUrl],
                completionMessage: 'The fragments bound, the sigil shone. Whose mark did you make, theirs, or yours?',
                completionIcon: [4, 14, customSpriteSheetUrl],
                dependencies: ['vaulted_relics', 'mask_wears_thin'], 
                isActive: false, 
                type: 'infiltrate'
                },
                
                'garden_maze': {
                name: 'Walking the maze of the order',
                puzzleClass: GardenMazePuzzle,
                description: 'Clay paths, bone sentries, spirals, thorns, crowns. Step by step, you walked their soil, blades at your back, petals at your side, until the northern gate of eternal flowers opened before you. You did not merely walk their maze, you crossed into their world.<q>The Brotherhood will never see you as anything but theirs. The question is no longer whether you can escape, but whether you want to.</q>',
                clue: 'To meet The Order, you must walk a sacred path.<br>Walk not upon foliage, but on bare clay;<br>All untold and untrodden fall to the baker\'s friend<br><br>Begin a pace distanced from the southern wall, with a single step to the rising sun,<br>stand between twin sentries whose bones do not decay but hasten others.<br><br>With the map now orientated stride forward twice,<br>meeting the spiral that turns towards the hours.<br>Face the dawn, and pass between the twin thorn-cries set in twain, do not linger.<br><br>To your right, the ordered blade keeps its vigil,<br>and before you waits the cats delight.<br><br>Now let the blades fall small upon your back<br>Upon the east horizon twin humble patches of green,<br>and before you in the distance gleams bright their golden kin.<br><br>Abandon the light for the dusk, and past the thorn-cries where they were ordered<br>and halt before the pallid spiral that unwinds against the hours.<br><br>Spirals to south and spirals to west if no missteps.<br>The northern gate flanked by eternal petals marks your exit.',
                hint: '• You need to start off the map, one pace below and one pace to the right.<br>• You will end up with a single path if everything is right.<br>• There will be areas that aren\'t specified; the riddle provides what these need to be filled with.<br>• The soil matters here but maturity does not.',
                mainIcon: [13, 17, customSpriteSheetUrl],
                completionMessage: 'The petals fall behind you. The path is chosen. Whose path it is, that remains to be decided.',
                completionIcon: [3, 14, customSpriteSheetUrl],
                dependencies: ['sigils', 'still_with_us'], 
                isActive: false, 
                type: 'infiltrate'
                },

                'schism_choice': {
                name: 'A fork in the road',
                description: 'You have chosen {{expose:to expose The Order and their secrets||order:to stand with The Order}}. Now you must walk the path you have embraced.<q>There is no going back. Your allegiance has been declared.</q>',
                clue: '<style>#tooltipCrate .description .schismClue, #tooltipCrate .description .schismClue q { color:#faeacd !important; }</style>Twelve sit the circle, with festive hats affixed, stewards of the ceaseless march.<br>Their measures are uneven: seven hold the longer reign, five the shorter.<br>Among the lesser, one forever limps, sometimes gaining a step but never the stature of its kin.<span class="schismClue"><br><br><b class="standWithOrder" style="color:#FFE0BD !important;">To stand with The Order let those of longer reign endure; cast the others into shadow.</b><br><br><b class="exposeOrder" style="color:#CFE1FF !important;">To expose The Order and their secrets to the world let those of longer reign fall; cast the others into the light.</b></span>',
                hint: '• Don\'t forget the festive hats.<br>• When you realize what the ceaseless march is you will have the answer.',                
                puzzleClass: SchismChoicePuzzle,
                mainIcon: [10, 14, customSpriteSheetUrl],
                completionMessage: 'The choice is made. {{expose:You have chosen to expose The Order and their secrets to the world||order:You have chosen to stand with The Order}}. There is no turning back now.',
                completionIcon: [10, 14, customSpriteSheetUrl],
                dependencies: ['still_with_us', 'garden_maze'],
                isActive: false,
                type: 'choose'
                },
                
            'embrace_path': {
                name: 'Embrace the path',
                puzzleClass: EmbracePathPuzzle,
                clue: 'You have chosen {{expose:to expose The Order and their secrets to the world and bring to an end their shadow reign||order:to stand with The Order and serve them in whatever way they need}}. The path ahead is dangerous and difficult, your opponents will spare no effort to thwart you, you must prevail in your mission.<q>There is no going back. Your allegiance has been declared.</q><br><div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message12.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• How\'s your Latin? Rome was founded on April 21st, right? Everything is added, not stand alone there.<br>• It\'s counterintuitive but Year 0 doesn\'t actually exist.<br>• A cipher favored by prisoners who have Bibles.',
                description: '{{expose:You turned their own chronicle into a key, drew the hidden line, and made the hall sing it back in your order. When the last note fell, you burned the bridge behind you.<q>No more hedging—only the work of dragging them into the light.</q>||order:You read the Chronicle as a Brother, pulled the buried instruction, and set the hall to their sequence. When the final tone held, you closed the other channel and stepped fully inside.<q>No more divides—your hand is theirs.</q>}}',
                mainIcon: [11, 17, customSpriteSheetUrl],
                completionMessage: '{{expose:Conviction proved. The Brotherhood line is cut; your signal runs outward alone.||order:Conviction proved. The rebel line is erased; only the Brothers hear you now.}}',
                completionIcon: [11, 17, customSpriteSheetUrl],
                dependencies: ['schism_choice'],
                isActive: false,
                type: 'choose'
            },
    
            'loyalty_test': {
                name: 'Test of loyalty',
                puzzleClass: LoyaltyTestPuzzle,
                description: '{{expose:The Order would kill for this, technology enough to bend perceptions and the will of humanity. You kept it out of their hands and loosened a hidden seam in their plans.<q>Hide it deep. When the moment breaks, this is the weight that tips the scale.</q>||order:Whoever holds this holds the keys to power. You placed the artifact in the Brotherhood\'s vault, and with it, your trust.<q>With this secured, you are theirs in truth; when the call comes, you move with them.</q>}}',
                clue: '{{expose:Stand firm in your convictions to expose the truth. Let no one sway you from the path of revelation.||order:Stand firm in your convictions to serve The Order. Let no one sway you from the path of loyalty.}}<br><br>The TV catches your eye, is there something there?<q>Sometimes it\'s more about what isn\'t there then what is there.</q><div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/tv.gif" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• Channel 3 is important, a screenshot might help you figure out what to do here.<br>• Etaoin is an important word here, but it\'s not a real word.',
                mainIcon: [14, 17, customSpriteSheetUrl],
                completionMessage: '{{expose:The artifact is sealed away from their hands; their reach shortens.||order:The artifact rests in their vaults; the inner circle of The Order marks your name.}}',                    
                completionIcon: [14, 17, customSpriteSheetUrl],
                dependencies: ['embrace_path'],
                isActive: false,
                type: 'choose'
                },
                
            'rise_up': {
                name: 'Rise up',
                puzzleClass: RiseUpPuzzle,
                description: '{{expose:You have blown the doors wide. Ledgers, rites, faces, laid bare and exposed to the public. Their grip loosens, and the world whispers the truth, no longer bound by fear. One task remains before they can regroup, strike while they stagger and end their reign once and for all.<q>By wit, patience, and nerve, you brought them to the brink. One more push.</q>||order:You handed over everything, drops, codes, routes, safe houses, names, and faces, all that was once entrusted to you. The Brotherhood moves like a blade, quiet, coordinated, vicious, final. With your cache in their capable hands, the purge begins.<q>By wit, patience, and nerve, you steadied the world\'s order. One more strike, and there will be no enemies left to fight.</q>}}',
                clue: 'Every note is a musician every musician is a note only when the full ensemble is gathered will you be able to hear the music. Strike each note as it\'s named, stumble too often or move too slowly and the path stays hidden.<div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/message13.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>',
                hint: '• 14 notes are needed to play this song. Where can you get 14 notes from?<br>• After the music has been played, where can you redeem something in Cookie Clicker?',
                mainIcon: [10, 17, customSpriteSheetUrl],
                completionMessage: '{{expose:The exchange is complete; the endgame begins.||order:The exchange is complete; the purge begins.}}',
                    completionIcon: [10, 17, customSpriteSheetUrl],
                dependencies: ['loyalty_test'],
                isActive: false,
                type: 'choose'
                },
                
            'defeat_evil': {
                name: 'The final battle',
                puzzleClass: DefeatEvilPuzzle,
                description: '{{expose:The Order stands exposed; their sigils are scraped from doors and their ledgers pass hand to hand. Cells scatter, safehouses go cold, and the sects turn on one another in the harsh and unforgiving daylight you dragged them into. Not destroyed, but driven back into the shadows, your lost friends are avenged, your allies sleep easier, and the world whispers your work in half-remembered headlines. By wits, patience, and nerve, you unraveled scores of ciphers, ledgers, and rites few would dare.<q>Hold your head high; you kept your promise, outplayed their watchers and spies, and pulled the underworld elite into the light.</q>||order:They tried to unmask the Brotherhood; instead you steadied its hand. Decoys were laid, leaks sealed, and the rites kept without a misstep; the world now run truer for it. The old sigils shine again behind iron doors. The mask you wore has become a name, and a chair is kept for you when the circle meets. By wits, patience, and nerve, you turned trial after trial into mastery.<q>Hold your head high; you weighed the cold hard facts, outmaneuvered their foes, and chose the greater good in the end.</q>}}',
                clue: '{{expose:Steel yourself for the final battle to expose The Order. Victory or defeat, everything hangs in the balance.||order:Steel yourself for the final battle to defend The Order. Victory or defeat, everything hangs in the balance.}}<br><br>When a full set of sailors sit above the rose sea the path will reveal itself.<q>They say good fences make good neighbors.</q>',
                hint: '• How do sailors send complex messages to each other? <br> • A code into a code is annoying, but a fence will help, one of those 3 rail picket ones maybe? <br> • Something seems wrong with this chessboard once you figure out what it is then you are almost there. <br>• Chess clocks have many uses, but these ones are especially key once you read the time.',
                mainIcon: [9, 17, customSpriteSheetUrl],
                completionMessage: '{{expose:The Order\'s darkness has been exposed. Truth prevails.||order:The darkness has been vanquished. The Order prevails.}}',
                completionIcon: [9, 17, customSpriteSheetUrl],
                dependencies: ['rise_up'],
                isActive: false,
                type: 'choose'
                }
        };

        // Assign trackOrder to each puzzle based on their type and current order
        assignTrackOrders();
        
        // Create instances for puzzles that have class definitions
        for (var puzzleId in cookieAgeData.puzzles.registry) {
            var puzzleData = cookieAgeData.puzzles.registry[puzzleId];
            if (puzzleData && puzzleData.puzzleClass) {
                try {
                    puzzleData.instance = new puzzleData.puzzleClass(puzzleId, puzzleData, cookieAgeData.puzzles.registry);
                } catch (e) {
                    errorLog('Failed to create class instance for puzzle', puzzleId, ':', e);
                }
            }
        }
    }
    
    // ===== TRACK ORDER ASSIGNMENT =====
    function assignTrackOrders() {
        // Assign trackOrder using explicit ordering arrays for deterministic results
        for (var i = 0; i < INVESTIGATE_PUZZLE_ORDER.length; i++) {
            var puzzleId = INVESTIGATE_PUZZLE_ORDER[i];
            var puzzle = cookieAgeData.puzzles.registry[puzzleId];
            if (puzzle) {
                puzzle.trackOrder = i;
            }
        }
        
        for (var j = 0; j < INFILTRATE_PUZZLE_ORDER.length; j++) {
            var puzzleId = INFILTRATE_PUZZLE_ORDER[j];
            var puzzle = cookieAgeData.puzzles.registry[puzzleId];
            if (puzzle) {
                puzzle.trackOrder = j;
            }
        }
        
        for (var k = 0; k < CHOOSE_PUZZLE_ORDER.length; k++) {
            var puzzleId = CHOOSE_PUZZLE_ORDER[k];
            var puzzle = cookieAgeData.puzzles.registry[puzzleId];
            if (puzzle) {
                puzzle.trackOrder = k;
            }
        }
    }
    
    // ===== TRACK MANAGEMENT FUNCTIONS =====
    function getPuzzleByTrackOrder(trackType, order) {
        // Use explicit ordering arrays for deterministic results
        if (trackType === 'investigate' && order < INVESTIGATE_PUZZLE_ORDER.length) {
            return INVESTIGATE_PUZZLE_ORDER[order];
        } else if (trackType === 'infiltrate' && order < INFILTRATE_PUZZLE_ORDER.length) {
            return INFILTRATE_PUZZLE_ORDER[order];
        } else if (trackType === 'choose' && order < CHOOSE_PUZZLE_ORDER.length) {
            return CHOOSE_PUZZLE_ORDER[order];
        }
        return null;
    }
    
    function ensureTracksInitialized() {
        if (!cookieAgeData.puzzles || !cookieAgeData.puzzles.tracks || !cookieAgeData.puzzles.tracks._initialized) {
            setupPuzzleSystem();
        }
    }
    
    function getActivePuzzleForTrack(trackType) {
        ensureTracksInitialized();
        return cookieAgeData.puzzles.tracks[trackType].active;
    }
    
    function getNextPuzzleForTrack(trackType) {
        ensureTracksInitialized();
        var track = cookieAgeData.puzzles.tracks[trackType];
        var nextOrder = track.progress; // Next puzzle is at current progress index
        
        var nextPuzzleId = getPuzzleByTrackOrder(trackType, nextOrder);
        
        // Check if next puzzle is unlocked (dependencies satisfied)
        if (nextPuzzleId && isPuzzleUnlocked(nextPuzzleId)) {
            return nextPuzzleId;
        }
        
        return null;
    }
    
    function checkCrossTrackUnlocks(trackType) {
        // Check all puzzles in this track to see if any have dependencies satisfied
        ensureTracksInitialized();
        var puzzleOrder;
        if (trackType === 'investigate') {
            puzzleOrder = INVESTIGATE_PUZZLE_ORDER;
        } else if (trackType === 'infiltrate') {
            puzzleOrder = INFILTRATE_PUZZLE_ORDER;
        } else if (trackType === 'choose') {
            puzzleOrder = CHOOSE_PUZZLE_ORDER;
        } else {
            return false;
        }
        
        for (var i = 0; i < puzzleOrder.length; i++) {
            var puzzleId = puzzleOrder[i];
            var puzzle = cookieAgeData.puzzles.registry[puzzleId];
            
            if (!puzzle) continue;
            
            // Skip if this puzzle is already active in any track
            var investigateActive = cookieAgeData.puzzles.tracks.investigate.active;
            var infiltrateActive = cookieAgeData.puzzles.tracks.infiltrate.active;
            var chooseActive = cookieAgeData.puzzles.tracks.choose.active;
            var isActive = investigateActive === puzzleId || infiltrateActive === puzzleId || chooseActive === puzzleId;
            if (isActive) {
                continue;
            }
            
            // Skip puzzles that are already completed
            if (cookieAgeData.puzzles.completed && cookieAgeData.puzzles.completed.indexOf(puzzleId) !== -1) {
                continue;
            }
            
            // Check if this puzzle has dependencies from other tracks that are now satisfied
            if (puzzle.dependencies && puzzle.dependencies.length > 0) {
                var allDependenciesSatisfied = true;
                var hasCrossTrackDep = false;
                
                for (var j = 0; j < puzzle.dependencies.length; j++) {
                    var depId = puzzle.dependencies[j];
                    var depPuzzle = cookieAgeData.puzzles.registry[depId];
                    if (!depPuzzle) continue;
                    
                    // Check if this is a cross-track dependency
                    if (depPuzzle.type !== trackType) {
                        hasCrossTrackDep = true;
                    }
                    
                    // Check if dependency is satisfied
                    var isCompleted = cookieAgeData.puzzles.completed && cookieAgeData.puzzles.completed.indexOf(depId) !== -1;
                    
                    if (!isCompleted) {
                        allDependenciesSatisfied = false;
                        break;
                    }
                }
                
                // If this puzzle has cross-track dependencies that are all satisfied, activate it
                // BUT only if it's the next puzzle in sequence (to avoid skipping puzzles)
                var currentProgress = cookieAgeData.puzzles.tracks[trackType].progress;
                
                if (hasCrossTrackDep && allDependenciesSatisfied && isPuzzleUnlocked(puzzleId) && puzzle.trackOrder === currentProgress) {
                    cookieAgeData.puzzles.tracks[trackType].active = puzzleId;
                    setupPuzzle(puzzleId);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    function activateNextPuzzleForTrack(trackType) {
        ensureTracksInitialized();
        var currentActive = cookieAgeData.puzzles.tracks[trackType].active;
        
        // Clean up current active puzzle if one exists
        if (currentActive) {
            var currentPuzzle = cookieAgeData.puzzles.registry[currentActive];
            if (currentPuzzle && currentPuzzle.cleanup) {
                currentPuzzle.cleanup();
            }
        }
        
        var nextPuzzle = getNextPuzzleForTrack(trackType);
        if (nextPuzzle) {
            cookieAgeData.puzzles.tracks[trackType].active = nextPuzzle;
            var puzzle = cookieAgeData.puzzles.registry[nextPuzzle];
            if (puzzle) {
                puzzle.isActive = true;
            }
            
            // Record activation timestamp for hint system - ensure hints system is initialized
            if (!cookieAgeData.puzzles.hints) {
                cookieAgeData.puzzles.hints = {
                    hintsUsed: 0,
                    lastHintTime: null,
                    puzzleActivationTimes: {},
                    purchasedHints: {}
                };
            }
            if (!cookieAgeData.puzzles.hints.puzzleActivationTimes) {
                cookieAgeData.puzzles.hints.puzzleActivationTimes = {
                    investigate: null,
                    infiltrate: null,
                    choose: null
                };
            }
            // Set activation time when a new puzzle is activated - but preserve existing time if already set (from save)
            // This ensures saved cooldown timers are not reset when loading a save
            if (!cookieAgeData.puzzles.hints.puzzleActivationTimes[trackType]) {
                cookieAgeData.puzzles.hints.puzzleActivationTimes[trackType] = Date.now();
            }
            
            setupPuzzle(nextPuzzle);
        } else {
            // No next puzzle available, clear active and activation time
            cookieAgeData.puzzles.tracks[trackType].active = null;
            if (cookieAgeData.puzzles.hints && cookieAgeData.puzzles.hints.puzzleActivationTimes) {
                cookieAgeData.puzzles.hints.puzzleActivationTimes[trackType] = null;
            }
        }
    }
    
    function initializePuzzleTracks() {
        // Ensure tracks structure exists
        if (!cookieAgeData.puzzles.tracks) {
            cookieAgeData.puzzles.tracks = {
                investigate: { active: null, progress: 0 },
                infiltrate: { active: null, progress: 0 },
                choose: { active: null, progress: 0 },
                _initialized: false
            };
        }
        
        // Mark as initialized BEFORE activating puzzles to prevent infinite loop
        cookieAgeData.puzzles.tracks._initialized = true;
        
        // Check if any debug start puzzles are set (only when debugMode is true)
        if (debugMode && (debugStartInvestigate !== null || debugStartInfiltrate !== null || debugStartChoose !== null)) {
            applyDebugStartPuzzles();
            
            // For any track not set by debug (null), activate first puzzle normally
            if (debugStartInvestigate === null && !cookieAgeData.puzzles.tracks.investigate.active) {
                activateNextPuzzleForTrack('investigate');
            }
            if (debugStartInfiltrate === null && !cookieAgeData.puzzles.tracks.infiltrate.active) {
                activateNextPuzzleForTrack('infiltrate');
            }
            if (debugStartChoose === null && !cookieAgeData.puzzles.tracks.choose.active) {
                activateNextPuzzleForTrack('choose');
            }
            return;
        }
        
        // Normal initialization - activate first puzzle in each track
        activateNextPuzzleForTrack('investigate');
        activateNextPuzzleForTrack('infiltrate');
        activateNextPuzzleForTrack('choose');
    }
    
    // ===== PUZZLE LIFECYCLE MANAGEMENT =====
    function isPuzzleUnlocked(puzzleId) {
        // Ensure puzzle system is initialized
        ensurePuzzleSystemInitialized();
        ensureTracksInitialized();
        
        var puzzle = cookieAgeData.puzzles.registry[puzzleId];
        if (!puzzle) return false;
        
        // Check if this puzzle is set as active via debug flags - if so, bypass all dependency checks
        if (debugMode) {
            if (puzzle.type === 'investigate' && debugStartInvestigate !== null && debugStartInvestigate !== undefined) {
                if (debugStartInvestigate === 'complete') {
                    return true; // All investigate puzzles are unlocked when set to 'complete'
                }
                var debugPuzzle = cookieAgeData.puzzles.registry[debugStartInvestigate];
                if (debugPuzzle && puzzle.trackOrder <= debugPuzzle.trackOrder) {
                    return true;
                }
                // If this is the exact puzzle set via debug, bypass dependency checks
                if (puzzleId === debugStartInvestigate) {
                    return true;
                }
            }
            if (puzzle.type === 'infiltrate' && debugStartInfiltrate !== null && debugStartInfiltrate !== undefined) {
                if (debugStartInfiltrate === 'complete') {
                    return true; // All infiltrate puzzles are unlocked when set to 'complete'
                }
                var debugPuzzle2 = cookieAgeData.puzzles.registry[debugStartInfiltrate];
                if (debugPuzzle2 && puzzle.trackOrder <= debugPuzzle2.trackOrder) {
                    return true;
                }
                // If this is the exact puzzle set via debug, bypass dependency checks
                if (puzzleId === debugStartInfiltrate) {
                    return true;
                }
            }
            if (puzzle.type === 'choose' && debugStartChoose !== null && debugStartChoose !== undefined) {
                if (debugStartChoose === 'complete') {
                    return true; // All choose puzzles are unlocked when set to 'complete'
                }
                var debugPuzzle3 = cookieAgeData.puzzles.registry[debugStartChoose];
                if (debugPuzzle3 && puzzle.trackOrder <= debugPuzzle3.trackOrder) {
                    return true;
                }
                // If this is the exact puzzle set via debug, bypass dependency checks
                if (puzzleId === debugStartChoose) {
                    return true;
                }
            }
        }
        
        // Check cross-track dependencies
        for (var i = 0; i < puzzle.dependencies.length; i++) {
            var depId = puzzle.dependencies[i];
            var depPuzzle = cookieAgeData.puzzles.registry[depId];
            if (!depPuzzle) continue;
            
            var depTrack = depPuzzle.type;
            var depTrackOrder = depPuzzle.trackOrder;
            
            // Check if dependency is completed by comparing trackOrder with progress
            if (depTrackOrder >= cookieAgeData.puzzles.tracks[depTrack].progress) {
                return false;
            }
        }
        return true;
    }
    
    function deactivateCurrentPuzzle(puzzleId) {
        // Clean up the specific puzzle that was completed
        if (!puzzleId) {
            return;
        }
        
        var puzzle = cookieAgeData.puzzles.registry[puzzleId];
        if (puzzle && puzzle.isActive) {
            // Use generic cleanup handler with the specific puzzle ID
            cleanupPuzzle(puzzleId);
            puzzle.isActive = false;
        }
    }
    
    // Universal helper to check if puzzle can be completed (prevents duplicate attempts)
    function canCompletePuzzle(puzzleId) {
        // Check if puzzle is already completed
        if (cookieAgeData.puzzles.completed && cookieAgeData.puzzles.completed.indexOf(puzzleId) !== -1) {
            return false;
        }
        
        // Check if puzzle is currently being completed
        if (cookieAgeData.puzzles.completing && cookieAgeData.puzzles.completing[puzzleId]) {
            return false;
        }
        
        // Check if notification was already shown
        if (cookieAgeData.puzzles.notificationsShown && cookieAgeData.puzzles.notificationsShown[puzzleId]) {
            return false;
        }
        
        return true;
    }
    
    // Safe wrapper for completing puzzles - prevents double completion
    function tryCompletePuzzle(puzzleId) {
        // CRITICAL: Check if already completed IMMEDIATELY to prevent race conditions
        // This must happen before any initialization or other operations
        if (cookieAgeData && cookieAgeData.puzzles && cookieAgeData.puzzles.completed && 
            cookieAgeData.puzzles.completed.indexOf(puzzleId) !== -1) {
            return false;
        }
        
        // Use universal helper to check if puzzle can be completed
        if (!canCompletePuzzle(puzzleId)) {
            return false;
        }
        
        // Initialize arrays if they don't exist
        if (!cookieAgeData.puzzles.completed) {
            cookieAgeData.puzzles.completed = [];
        }
        if (!cookieAgeData.puzzles.completing) {
            cookieAgeData.puzzles.completing = {};
        }
        if (!cookieAgeData.puzzles.notificationsShown) {
            cookieAgeData.puzzles.notificationsShown = {};
        }
        
        // Mark as completing immediately to block other calls
        cookieAgeData.puzzles.completing[puzzleId] = true;
        
        // CRITICAL: Mark puzzle as completed IMMEDIATELY here to prevent race conditions
        // This must happen BEFORE calling completePuzzle() so subsequent calls see it's already done
        if (cookieAgeData.puzzles.completed.indexOf(puzzleId) === -1) {
            cookieAgeData.puzzles.completed.push(puzzleId);
            debugLog('[RACE GUARD] Marked', puzzleId, 'as completed immediately in tryCompletePuzzle');
        }
        
        // Call the actual completion function
        completePuzzle(puzzleId);
        return true;
    }
    
    function completePuzzle(puzzleId) {
        // Ensure puzzle system is initialized first
        ensurePuzzleSystemInitialized();
        ensureTracksInitialized();
        
        // Note: We already checked and added to completed array in tryCompletePuzzle()
        // So we don't need to check again here - that would prevent the first legitimate completion!
        
        var puzzle = cookieAgeData.puzzles.registry[puzzleId];
        if (!puzzle) {
            errorLog('Cannot complete puzzle', puzzleId, '- not found in registry');
            return false;
        }
        
        debugLog('Completing puzzle', puzzleId, ':', puzzle.name);
        
        // Get track info before any modifications
        var trackType = puzzle.type;
        var track = cookieAgeData.puzzles.tracks[trackType];

        // FIRST: Mark puzzle as completed and advance progress
        // This ensures completion is recorded even if next puzzle activation fails
        // Note: already added to completed array in tryCompletePuzzle, but double-check to avoid duplicates
        if (cookieAgeData.puzzles.completed.indexOf(puzzleId) === -1) {
        cookieAgeData.puzzles.completed.push(puzzleId);
            debugLog('Marked', puzzleId, 'as completed in completePuzzle (backup)');
        }
        track.progress++;

        // THEN: Clean up the completed puzzle and clear active status
        deactivateCurrentPuzzle(puzzleId);
        track.active = null;
        
        // Remove hint from purchased hints when puzzle is completed
        if (cookieAgeData.puzzles.hints && cookieAgeData.puzzles.hints.purchasedHints && cookieAgeData.puzzles.hints.purchasedHints[puzzleId]) {
            delete cookieAgeData.puzzles.hints.purchasedHints[puzzleId];
        }

        // Reset hint system activation time for this track when puzzle completes
        // This ensures the next puzzle can immediately accept hints (after its activation time is set)
        if (cookieAgeData.puzzles.hints && cookieAgeData.puzzles.hints.puzzleActivationTimes) {
            cookieAgeData.puzzles.hints.puzzleActivationTimes[trackType] = null;
        }

        // FINALLY: Try to activate next puzzle in this track
        // This will set the activation time for the new puzzle
        activateNextPuzzleForTrack(trackType);
        
        // Check all tracks for newly available puzzles due to cross-track dependencies
        var allTrackTypes = ['investigate', 'infiltrate', 'choose'];
        for (var i = 0; i < allTrackTypes.length; i++) {
            var otherTrackType = allTrackTypes[i];

            // Skip the track that just completed (it already activated its next puzzle)
            if (otherTrackType === trackType) {
                continue;
            }
            
            // Check if this track has an active puzzle
            var hasActivePuzzle = cookieAgeData.puzzles.tracks[otherTrackType].active;
            
            if (!hasActivePuzzle) {
                activateNextPuzzleForTrack(otherTrackType);
            } else {
                // Even if there's an active puzzle, check if any puzzle in this track now has dependencies satisfied
                checkCrossTrackUnlocks(otherTrackType);
            }
        }
        
        // Play completion audio
        playAudioSound('puzzleCompletion');
        
        // Show completion message from registry (only if not already shown)
        if (!cookieAgeData.puzzles.notificationsShown || !cookieAgeData.puzzles.notificationsShown[puzzleId]) {
            var message = processConditionalText(puzzle.completionMessage);
            var icon = puzzle.completionIcon;
            new Game.Note('Puzzle solved!', message, icon, 64800); // 18 hours
            
            // Mark notification as shown
            if (!cookieAgeData.puzzles.notificationsShown) {
                cookieAgeData.puzzles.notificationsShown = {};
            }
            cookieAgeData.puzzles.notificationsShown[puzzleId] = true;
        }

        // Force UI refresh to show updated puzzle completion status
        if (Game.UpdateMenu) {
            setTimeout(function() {
                Game.UpdateMenu();
            }, 100);
        }

        // Clear the in-progress flag now that completion is done
        if (cookieAgeData.puzzles.completing) {
            delete cookieAgeData.puzzles.completing[puzzleId];
        }
        
        // Check and award all achievements whose conditions might now be met
        checkAndAwardAllAchievements(puzzleId);

        return true;
    }
    
    // Check if a completed puzzle corresponds to a mystery achievement milestone and award it
    function checkAndAwardMysteryAchievement(puzzleId) {
        var completedPuzzles = cookieAgeData.puzzles.completed || [];
        
        // Check ALL mystery achievements to see if any should now be awarded
        for (var i = 0; i < mysteryMilestonePuzzles.length; i++) {
            var milestonePuzzle = mysteryMilestonePuzzles[i];
            var achievementName = mysteryAchievementNames[i];
            
            // Check if this milestone is completed
            if (completedPuzzles.indexOf(milestonePuzzle) !== -1) {
                // Check if achievement exists and is not already won
                if (Game.Achievements[achievementName]) {
                    if (!Game.Achievements[achievementName].won) {
                        // Clear the _restoredFromSave flag if achievement is not won (so it can be awarded properly)
                        if (Game.Achievements[achievementName]._restoredFromSave) {
                            Game.Achievements[achievementName]._restoredFromSave = false;
                        }
                        // Award the achievement using the base mod's helper
                        try {
                            if (Game.JNE && Game.JNE.markAchievementWon) {
                                Game.JNE.markAchievementWon(achievementName);
                            } else if (Game.Win) {
                                // Fallback to vanilla Game.Win
                                Game.Win(achievementName);
                            } else {
                                errorLog('[Cookie Age] No achievement awarding method available');
                            }
                        } catch (e) {
                            errorLog('[Cookie Age] Error awarding achievement:', e);
                        }
                    }
                } else {
                    errorLog('[Cookie Age] Achievement not found:', achievementName);
                }
            }
        }
    }
    
    // Check all achievements to see if any conditions are now met after puzzle completion
    function checkAndAwardAllAchievements(puzzleId) {
        checkAndAwardMysteryAchievement(puzzleId);
    }
    
    // ===== HINT SYSTEM FUNCTIONS =====
     function getHintCost() {
        if (!cookieAgeData.puzzles || !cookieAgeData.puzzles.hints) {
            return 1;
        }
        return (cookieAgeData.puzzles.hints.hintsUsed || 0) + 1;
    }
    
    // Format milliseconds as "Xh Ym" or "Ym" or "Xs"
    function formatCountdown(ms) {
        if (ms <= 0) return '0s';
        var seconds = Math.floor(ms / 1000);
        var minutes = Math.floor(seconds / 60);
        var hours = Math.floor(minutes / 60);
        seconds = seconds % 60;
        minutes = minutes % 60;
        
        var parts = [];
        if (hours > 0) {
            parts.push(hours + 'h');
        }
        if (minutes > 0) {
            parts.push(minutes + 'm');
        }
        if (seconds > 0 && hours === 0) {
            parts.push(seconds + 's');
        }
        
        return parts.length > 0 ? parts.join(' ') : '0s';
    }
    
    // Get time remaining until puzzle hint becomes available (2 hours after activation)
    function getTimeUntilPuzzleHintAvailable(trackType) {
        if (!cookieAgeData.puzzles || !cookieAgeData.puzzles.hints) {
            return null;
        }
        // Ensure puzzleActivationTimes is initialized
        if (!cookieAgeData.puzzles.hints.puzzleActivationTimes) {
            cookieAgeData.puzzles.hints.puzzleActivationTimes = {
                investigate: null,
                infiltrate: null,
                choose: null
            };
        }
        var activationTime = cookieAgeData.puzzles.hints.puzzleActivationTimes[trackType];
        var twoHours = 2 * 60 * 60 * 1000; // 2 hours

        if (!activationTime) {
            // If there's an active puzzle but no activation time, set it now and enforce cooldown
            var track = cookieAgeData.puzzles.tracks && cookieAgeData.puzzles.tracks[trackType];
            if (track && track.active) {
                // Puzzle is active but no activation time set - set it now and return full cooldown
                cookieAgeData.puzzles.hints.puzzleActivationTimes[trackType] = Date.now();
                
                // Return full cooldown time since we just set the activation time
                return twoHours;
            }
            return null;
        }

        var elapsed = Date.now() - activationTime;
        var remaining = twoHours - elapsed;
        return remaining > 0 ? remaining : 0;
    }
    
    // Get time remaining until hint cooldown expires (24 hours since last hint)
    function getTimeUntilHintCooldownExpires() {
        if (!cookieAgeData.puzzles || !cookieAgeData.puzzles.hints || !cookieAgeData.puzzles.hints.lastHintTime) {
            return 0; // No cooldown if never used
        }
        var hintCooldownMs = 24 * 60 * 60 * 1000; // 24 hours
        var elapsed = Date.now() - cookieAgeData.puzzles.hints.lastHintTime;
        var remaining = hintCooldownMs - elapsed;
        return remaining > 0 ? remaining : 0;
    }
    
    // Get all puzzles that are eligible for hints
    function getAvailablePuzzlesForHint() {
        ensurePuzzleSystemInitialized();
        if (!cookieAgeData.puzzles || !cookieAgeData.puzzles.tracks || !cookieAgeData.puzzles.hints || !cookieAgeData.puzzles.completed) {
            return [];
        }
        
        var eligiblePuzzles = [];
        var trackTypes = ['investigate', 'infiltrate', 'choose'];
        var hintCooldownRemaining = getTimeUntilHintCooldownExpires();
        
        for (var i = 0; i < trackTypes.length; i++) {
            var trackType = trackTypes[i];
            var track = cookieAgeData.puzzles.tracks[trackType];
            
            // Check if track has an active puzzle
            if (!track.active) {
                continue;
            }
            
            var puzzleId = track.active;
            var puzzle = cookieAgeData.puzzles.registry[puzzleId];
            
            // Check if puzzle is already completed
            if (!puzzle || !cookieAgeData.puzzles.completed || cookieAgeData.puzzles.completed.indexOf(puzzleId) !== -1) {
                continue;
            }
            
            // Check if hint already exists for this track
            if (cookieAgeData.puzzles.hints.purchasedHints && cookieAgeData.puzzles.hints.purchasedHints[puzzleId]) {
                continue;
            }
            
            // Both cooldowns must be satisfied
            if (hintCooldownRemaining > 0) {
                continue;
            }
            
            // Check puzzle cooldown
            var puzzleCooldownRemaining = getTimeUntilPuzzleHintAvailable(trackType);
            if (puzzleCooldownRemaining === null || puzzleCooldownRemaining > 0) {
                continue;
            }
            
            // Check if player has enough sugar lumps
            var cost = getHintCost();
            if (!Game.lumps || Game.lumps < cost) {
                continue; // Not enough sugar lumps, skip this puzzle
            }
            
            // Puzzle is eligible
            eligiblePuzzles.push({
                trackType: trackType,
                puzzleId: puzzleId,
                puzzle: puzzle
            });
        }
        
        return eligiblePuzzles;
    }
    
    // Get active hints that have been purchased 
    function getActiveHints() {
        if (!cookieAgeData.puzzles || !cookieAgeData.puzzles.hints || !cookieAgeData.puzzles.hints.purchasedHints) {
            return [];
        }
        
        var activeHints = [];
        var trackTypes = ['investigate', 'infiltrate', 'choose'];
        
        for (var i = 0; i < trackTypes.length; i++) {
            var trackType = trackTypes[i];
            var track = cookieAgeData.puzzles.tracks[trackType];
            
            // Check if track has an active puzzle
            if (!track.active) {
                continue;
            }
            
            var puzzleId = track.active;
            
            // Check if puzzle is completed - no hints for completed puzzles
            if (cookieAgeData.puzzles.completed.indexOf(puzzleId) !== -1) {
                continue;
            }
            
            // Check if hint was purchased for this puzzle
            if (!cookieAgeData.puzzles.hints.purchasedHints[puzzleId]) {
                continue;
            }
            
            var puzzle = cookieAgeData.puzzles.registry[puzzleId];
            if (puzzle) {
                // Use hint property
                var hintText = puzzle.hint || '';
                if (hintText) {
                    activeHints.push({
                        trackType: trackType,
                        puzzleId: puzzleId,
                        puzzleName: puzzle.name,
                        hintText: hintText
                    });
                }
            }
        }
        
        return activeHints;
    }
    
    // Get track display name for selection prompts
    function getTrackDisplayName(trackType) {
        if (trackType === 'investigate') {
            return 'Investigate the Order of the Cookie';
        } else if (trackType === 'infiltrate') {
            return 'Infiltrate the Brotherhood';
        } else if (trackType === 'choose') {
            return 'Choose Your Allegiance';
        }
        return trackType;
    }
    
    // Purchase a hint for a specific track
    function purchaseHint(trackType) {
        ensurePuzzleSystemInitialized();
        if (!cookieAgeData.puzzles || !cookieAgeData.puzzles.hints || !cookieAgeData.puzzles.tracks) {
            return false;
        }
        
        var track = cookieAgeData.puzzles.tracks[trackType];
        if (!track || !track.active) {
            return false;
        }
        
        var puzzleId = track.active;
        var puzzle = cookieAgeData.puzzles.registry[puzzleId];
        
        // Validate puzzle exists and is not completed
        if (!puzzle || cookieAgeData.puzzles.completed.indexOf(puzzleId) !== -1) {
            return false;
        }
        
        // Check if hint already exists for this track
        if (cookieAgeData.puzzles.hints.purchasedHints && cookieAgeData.puzzles.hints.purchasedHints[puzzleId]) {
            return false;
        }
        
        // Both cooldowns must be satisfied - check hint cooldown
        var hintCooldownRemaining = getTimeUntilHintCooldownExpires();
        if (hintCooldownRemaining > 0) {
            return false;
        }
        
        // Check puzzle cooldown 
        var puzzleCooldownRemaining = getTimeUntilPuzzleHintAvailable(trackType);
        if (puzzleCooldownRemaining === null || puzzleCooldownRemaining > 0) {
            return false;
        }
        
        // Check sugar lumps
        var cost = getHintCost();
        if (!Game.lumps || Game.lumps < cost) {
            return false;
        }
        
        // Deduct sugar lumps
        Game.lumps -= cost;
        
        // Update hint tracking
        cookieAgeData.puzzles.hints.hintsUsed = (cookieAgeData.puzzles.hints.hintsUsed || 0) + 1;
        cookieAgeData.puzzles.hints.lastHintTime = Date.now();
        
        // Mark hint as purchased for this puzzle
        if (!cookieAgeData.puzzles.hints.purchasedHints) {
            cookieAgeData.puzzles.hints.purchasedHints = {};
        }
        cookieAgeData.puzzles.hints.purchasedHints[puzzleId] = true;
        
        // Refresh tooltip if it's open
        if (Game.tooltip && Game.tooltip.lock === 'hintPurchase') {
            Game.tooltip.dynamic = 1;
            setTimeout(function() {
                if (Game.tooltip && Game.tooltip.lock === 'hintPurchase') {
                    Game.tooltip.draw();
                }
            }, 10);
        }
        
        // Refresh stats menu
        if (Game.UpdateMenu) {
            setTimeout(function() {
                Game.UpdateMenu();
            }, 50);
        }
        
        return true;
    }
    
    // Get tooltip content for hint purchase controller
    function getHintTooltipContent() {
        // Ensure puzzle system is initialized before accessing hint system
        ensurePuzzleSystemInitialized();
        
        if (!cookieAgeData.puzzles || !cookieAgeData.puzzles.hints || !cookieAgeData.puzzles.completed) {
            // Return full tooltip HTML with wrapper and icon
            var iconX = 3;
            var iconY = 35;
            var iconUrl = gardenSpriteSheetUrl;
            return '<div style="padding:8px 4px;min-width:350px;position:relative;" id="tooltipCrate"><div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;background-position: -' + (iconX * 48) + 'px -' + (iconY * 48) + 'px; background-image: url(\'' + iconUrl + '\');"></div><div class="name">Purchase Hint</div><div class="description">Not available</div></div>';
        }
        
        var html = '';
        var cost = getHintCost();
        var hintsUsed = cookieAgeData.puzzles.hints.hintsUsed || 0;
        var availablePuzzles = getAvailablePuzzlesForHint();
        var activeHints = getActiveHints();
        var hintCooldownRemaining = getTimeUntilHintCooldownExpires();
        
        var sugarLumpIcon = '<div style="width:48px;height:48px;display:inline-block;vertical-align:top;background:url(img/icons.png);background-position:-1392px -672px;background-size:auto;background-repeat:no-repeat;transform:scale(0.5);transform-origin:top left;margin-right:4px;overflow:hidden;position:relative;left:30px;top:-4px;"></div>';
        // Use the raw cost number - LBeautify returns an object, not a string
        var costNumber = String(cost);
        // Check if player can afford the hint
        var canAfford = Game.lumps && Game.lumps >= cost;
        var costColor = canAfford ? 'rgb(140, 255, 102)' : 'rgb(253, 56, 56)';
        var costShadow = canAfford ? '0px 1px 0px #4d8c2e,0px 0px 6px #4d8c2e' : '0px 1px 0px #8b2323,0px 0px 6px #8b2323';
        var costDisplay = '<b style="color:' + costColor + ';text-shadow:' + costShadow + ';white-space:nowrap;">' + sugarLumpIcon + ' ' + costNumber + '</b>';
        html += '<div class="name">Purchase Hint<span style="float:right;line-height:1.2;">' + costDisplay + '</span></div>';
        html += '<div class="line"></div>';
        
        // Show description text when no hints are active
        if (activeHints.length === 0) {
            html += '<div class="description" style="margin-top:4px;">Provides a small hint for active puzzles to help you along the way. Each puzzle has a <b>single</b> hint. You can use one hint every <b>24 hours</b>, and you must wait at least <b>two hours</b> after unlocking a puzzle before using a hint on it.<br><br>Each hint is more expensive than the last.<br></div>';        }
        
        // Check cooldowns - check ALL active puzzles for cooldowns, not just eligible ones
        // Show any cooldown that is blocking a purchase
        var hasCooldown = false;
        var cooldownMessages = [];
        
        // First, check if there are any puzzles that could potentially buy hints (don't have hints yet)
        var hasPotentialPurchases = false;
        var trackTypes = ['investigate', 'infiltrate', 'choose'];
        for (var i = 0; i < trackTypes.length; i++) {
            var trackType = trackTypes[i];
            var track = cookieAgeData.puzzles.tracks[trackType];
            if (track && track.active) {
                var puzzleId = track.active;
                var puzzle = cookieAgeData.puzzles.registry[puzzleId];
                if (puzzle && cookieAgeData.puzzles.completed.indexOf(puzzleId) === -1) {
                    if (!cookieAgeData.puzzles.hints.purchasedHints || !cookieAgeData.puzzles.hints.purchasedHints[puzzleId]) {
                        hasPotentialPurchases = true;
                        break;
                    }
                }
            }
        }
        
        // Check hint cooldown (24h) - show if cooldown is active AND there are potential purchases
        // This ensures we show the cooldown even when it's blocking all purchases (availablePuzzles.length === 0)
        if (hintCooldownRemaining > 0 && hasPotentialPurchases) {
            hasCooldown = true;
            cooldownMessages.push('<div class="description">Hint cooldown remaining <b style="color:#ff0000;">' + formatCountdown(hintCooldownRemaining) + '</b></div>');
        }
        
        // Check puzzle cooldowns for all active puzzles (not just eligible ones)
        // Show puzzle cooldown if it's blocking the purchase of a hint for that puzzle
        // Process ALL tracks to ensure all cooldowns are shown
        for (var j = 0; j < trackTypes.length; j++) {
            var trackType = trackTypes[j];
            var track = cookieAgeData.puzzles.tracks[trackType];
            if (track && track.active) {
                var puzzleId = track.active;
                var puzzle = cookieAgeData.puzzles.registry[puzzleId];
                // Only check cooldown for puzzles that aren't completed and don't already have hints
                // If puzzle doesn't have a hint, then a cooldown would block purchasing it
                if (puzzle && cookieAgeData.puzzles.completed.indexOf(puzzleId) === -1) {
                    if (!cookieAgeData.puzzles.hints.purchasedHints || !cookieAgeData.puzzles.hints.purchasedHints[puzzleId]) {
                        var puzzleCooldown = getTimeUntilPuzzleHintAvailable(trackType);
                        // Show cooldown if it exists and would block a purchase (cooldown > 0)
                        // Always show puzzle cooldown when it's blocking a purchase
                        if (puzzleCooldown !== null && puzzleCooldown > 0) {
                            hasCooldown = true;
                            var trackName = getTrackDisplayName(trackType);
                            cooldownMessages.push('<div class="description">' + trackName + ' hint available in <b style="color:#ff0000;">' + formatCountdown(puzzleCooldown) + '</b></div>');
                        }
                    }
                }
            }
        }
        
        if (hasCooldown) {
            html += cooldownMessages.join('');
            html += '<div class="line"></div>';
        }
        
        // Show active hints - only show track name, never puzzle name
        if (activeHints.length > 0) {
            html += '<div class="description"><b>Active Hints:</b></div>';
            for (var j = 0; j < activeHints.length; j++) {
                var hint = activeHints[j];
                html += '<div class="description" style="margin-top:8px;"><b>' + getTrackDisplayName(hint.trackType) + ':</b></div>';
                html += '<div class="description" style="margin-left:12px;font-size:11px;color:#aaa;">' + processConditionalText(hint.hintText) + '</div>';
            }
            html += '<div class="line"></div>';
        }
        
        // Show availability status
        if (!hasCooldown) {
            var hasActivePuzzle = false;
            if (cookieAgeData.puzzles && cookieAgeData.puzzles.tracks) {
                var trackTypes = ['investigate', 'infiltrate', 'choose'];
                for (var k = 0; k < trackTypes.length; k++) {
                    var checkTrack = cookieAgeData.puzzles.tracks[trackTypes[k]];
                    if (checkTrack && checkTrack.active) {
                        var checkPuzzleId = checkTrack.active;
                        var checkPuzzle = cookieAgeData.puzzles.registry[checkPuzzleId];
                        // Check if puzzle is not completed
                        if (checkPuzzle && cookieAgeData.puzzles.completed.indexOf(checkPuzzleId) === -1) {
                            hasActivePuzzle = true;
                            break;
                        }
                    }
                }
            }
            
            if (!hasActivePuzzle) {
                html += '<div class="description" style="color:#888;">No puzzles available for hints</div>';
            }
        }
        
        // Show hints used at bottom 
        if (hintsUsed >= 1) {
            var hintText = hintsUsed === 1 ? 'hint' : 'hints';
            html += '<div class="description" style="text-align:center;font-size:10px;color:#aaa;">' + hintsUsed + ' ' + hintText + ' used</div>';
        }
        
        //icon
        var iconX = 3;
        var iconY = 35;
        var iconUrl = gardenSpriteSheetUrl;
        var wrappedHtml = '<div style="padding:8px 4px;min-width:350px;position:relative;" id="tooltipCrate"><div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;background-position: -' + (iconX * 48) + 'px -' + (iconY * 48) + 'px; background-image: url(\'' + iconUrl + '\');"></div>' + html + '</div>';
        
        return wrappedHtml;
    }
    
    // Show track selection prompt for hint purchase
    function showHintTrackSelection() {
        var availablePuzzles = getAvailablePuzzlesForHint();
        if (availablePuzzles.length === 0) {
            return;
        }
        
        var cost = getHintCost();
        
        // Check if player has enough sugar lumps before proceeding
        if (!Game.lumps || Game.lumps < cost) {
            // Use same icon format as tooltip - 24px display with transform scale
            var sugarLumpIcon = '<div style="width:48px;height:48px;display:inline-block;vertical-align:middle;background:url(img/icons.png);background-position:-1392px -672px;background-size:auto;background-repeat:no-repeat;transform:scale(0.5);transform-origin:top left;margin-right:4px;overflow:hidden;"></div>';
            var sugarLumpText = '';
            if (typeof loc !== 'undefined' && typeof LBeautify !== 'undefined') {
                sugarLumpText = loc("%1 sugar lump", LBeautify(cost));
            } else {
                sugarLumpText = cost + ' sugar lump' + (cost !== 1 ? 's' : '');
            }
            var formattedCost = '<b style="color:#8cff66;text-shadow:0px 1px 0px #4d8c2e,0px 0px 6px #4d8c2e;">' + sugarLumpIcon + ' ' + sugarLumpText + '</b>';
            Game.Prompt('<h3>Purchase Hint</h3><div class="block" style="font-size:11px;">You need ' + formattedCost + ' to purchase a hint.<br>You currently have <b>' + (Game.lumps || 0) + ' sugar lump' + ((Game.lumps || 0) !== 1 ? 's' : '') + '</b>.</div>', 
                [['OK', 'Game.ClosePrompt();', 'float:right']]);
            return;
        }
        
        var doPurchase = function(trackType) {
            // Check sugar lumps again before showing confirmation (might have changed)
            var currentCost = getHintCost();
            if (!Game.lumps || Game.lumps < currentCost) {
                // Use same icon format as tooltip - 24px display with transform scale
                var sugarLumpIcon = '<div style="width:48px;height:48px;display:inline-block;vertical-align:middle;background:url(img/icons.png);background-position:-1392px -672px;background-size:auto;background-repeat:no-repeat;transform:scale(0.5);transform-origin:top left;margin-right:4px;overflow:hidden;"></div>';
                var sugarLumpText = '';
                if (typeof loc !== 'undefined' && typeof LBeautify !== 'undefined') {
                    sugarLumpText = loc("%1 sugar lump", LBeautify(currentCost));
                } else {
                    sugarLumpText = currentCost + ' sugar lump' + (currentCost !== 1 ? 's' : '');
                }
                var formattedCost = '<b style="color:#8cff66;text-shadow:0px 1px 0px #4d8c2e,0px 0px 6px #4d8c2e;">' + sugarLumpIcon + ' ' + sugarLumpText + '</b>';
                Game.Prompt('<h3>Purchase Hint</h3><div class="block" style="font-size:11px;">You need ' + formattedCost + ' to purchase a hint.<br>You currently have <b>' + (Game.lumps || 0) + ' sugar lump' + ((Game.lumps || 0) !== 1 ? 's' : '') + '</b>.</div>', 
                    [['OK', 'Game.ClosePrompt();', 'float:right']]);
                return;
            }
            
            // Show confirmation dialog before spending sugar lump
            var sugarLumpIcon = '<span style="display:inline-block;width:24px;height:24px;overflow:hidden;vertical-align:middle;line-height:0;font-size:0;margin:0;padding:0;"><div style="width:48px;height:48px;background:url(img/icons.png);background-position:-1392px -672px;background-size:auto;background-repeat:no-repeat;transform:scale(0.5);transform-origin:top left;"></div></span>';
            var sugarLumpText = '';
            if (typeof loc !== 'undefined' && typeof LBeautify !== 'undefined') {
                sugarLumpText = loc("%1 sugar lump", LBeautify(currentCost));
            } else {
                sugarLumpText = currentCost + ' sugar lump' + (currentCost !== 1 ? 's' : '');
            }
            var formattedCost = '<b style="color:#8cff66;text-shadow:0px 1px 0px #4d8c2e,0px 0px 6px #4d8c2e;display:inline-block;vertical-align:middle;line-height:1.2;">' + sugarLumpIcon + sugarLumpText + '</b>';
            
            var trackName = getTrackDisplayName(trackType);
            var confirmMessage = 'Purchase a hint for <b>' + trackName + '</b> for ' + formattedCost + '?';
            
            // Use callback ID system to properly handle the purchase
            if (!window.CookieAge) window.CookieAge = {};
            if (!window.CookieAge.hintPurchaseCallbacks) window.CookieAge.hintPurchaseCallbacks = {};
            var callbackId = 'hintPurchase_' + Date.now() + '_' + Math.random();
            window.CookieAge.hintPurchaseCallbacks[callbackId] = function() {
                var success = purchaseHint(trackType);
                if (!success) {
                    // Check if it failed due to insufficient sugar lumps
                    var finalCost = getHintCost();
                    if (!Game.lumps || Game.lumps < finalCost) {

                        var errorSugarLumpIcon = '<div style="width:48px;height:48px;display:inline-block;vertical-align:middle;background:url(img/icons.png);background-position:-1392px -672px;background-size:auto;background-repeat:no-repeat;transform:scale(0.5);transform-origin:top left;margin-right:4px;overflow:hidden;"></div>';
                        var errorSugarLumpText = '';
                        if (typeof loc !== 'undefined' && typeof LBeautify !== 'undefined') {
                            errorSugarLumpText = loc("%1 sugar lump", LBeautify(finalCost));
                        } else {
                            errorSugarLumpText = finalCost + ' sugar lump' + (finalCost !== 1 ? 's' : '');
                        }
                        var errorFormattedCost = '<b style="color:#8cff66;text-shadow:0px 1px 0px #4d8c2e,0px 0px 6px #4d8c2e;">' + errorSugarLumpIcon + ' ' + errorSugarLumpText + '</b>';
                        Game.Prompt('<h3>Purchase Hint</h3><div class="block" style="font-size:11px;">You need ' + errorFormattedCost + ' to purchase a hint.<br>You currently have <b>' + (Game.lumps || 0) + ' sugar lump' + ((Game.lumps || 0) !== 1 ? 's' : '') + '</b>.</div>', 
                            [['OK', 'Game.ClosePrompt();', 'float:right']]);
                    }
                }
            };
            
            Game.Prompt('<h3>Purchase Hint</h3><div class="block" style="font-size:11px;">' + confirmMessage + '</div>', 
                [['Yes', 'Game.ClosePrompt(); if(window.CookieAge && window.CookieAge.hintPurchaseCallbacks && window.CookieAge.hintPurchaseCallbacks["' + callbackId + '"]) { window.CookieAge.hintPurchaseCallbacks["' + callbackId + '"](); delete window.CookieAge.hintPurchaseCallbacks["' + callbackId + '"]; }', 'float:left'], 
                ['No', 'Game.ClosePrompt(); if(window.CookieAge && window.CookieAge.hintPurchaseCallbacks && window.CookieAge.hintPurchaseCallbacks["' + callbackId + '"]) { delete window.CookieAge.hintPurchaseCallbacks["' + callbackId + '"]; }', 'float:right']]);
        };
        
        if (availablePuzzles.length === 1) {
            // Only one option, show confirmation and purchase
            doPurchase(availablePuzzles[0].trackType);
            return;
        }
        
        // Build selection options - only show track name, never puzzle name
        // Use callback ID system to properly handle the selection
        if (!window.CookieAge) window.CookieAge = {};
        if (!window.CookieAge.hintTrackSelectionCallbacks) window.CookieAge.hintTrackSelectionCallbacks = {};
        
        var buttons = [];
        for (var i = 0; i < availablePuzzles.length; i++) {
            var puzzle = availablePuzzles[i];
            var trackType = puzzle.trackType;
            var label = getTrackDisplayName(trackType);
            var callbackId = 'hintTrackSelection_' + Date.now() + '_' + i + '_' + Math.random();
            
            window.CookieAge.hintTrackSelectionCallbacks[callbackId] = function(trackType) {
                return function() {
                    Game.ClosePrompt();
                    doPurchase(trackType);
                };
            }(trackType);
            
            buttons.push([label, 'Game.ClosePrompt(); if(window.CookieAge && window.CookieAge.hintTrackSelectionCallbacks && window.CookieAge.hintTrackSelectionCallbacks["' + callbackId + '"]) { window.CookieAge.hintTrackSelectionCallbacks["' + callbackId + '"](); delete window.CookieAge.hintTrackSelectionCallbacks["' + callbackId + '"]; }']);
        }
        
        Game.Prompt('<h3>Select Track for Hint</h3><div class="block" style="font-size:11px;"><div>Which track would you like a hint for?</div></div>', buttons);
    }
    
    // ===== TRACK-BASED PROGRESS VALIDATION =====
    function isPuzzleProgressValid(puzzleId) {
        // Check if puzzle is unlocked based on track progress
        ensureTracksInitialized();
        var puzzle = cookieAgeData.puzzles.registry[puzzleId];
        if (!puzzle) return false;
        
        // Apply debug override - check the appropriate track's debug variable
        if (debugMode && puzzle.type === 'investigate' && debugStartInvestigate !== null && debugStartInvestigate !== undefined) {
            if (debugStartInvestigate === 'complete') {
                return true; // All investigate puzzles are valid when set to 'complete'
            }
            var debugPuzzle = cookieAgeData.puzzles.registry[debugStartInvestigate];
            if (debugPuzzle && puzzle.trackOrder <= debugPuzzle.trackOrder) {
                return true;
            }
        }
        if (debugMode && puzzle.type === 'infiltrate' && debugStartInfiltrate !== null && debugStartInfiltrate !== undefined) {
            if (debugStartInfiltrate === 'complete') {
                return true; // All infiltrate puzzles are valid when set to 'complete'
            }
            var debugPuzzle2 = cookieAgeData.puzzles.registry[debugStartInfiltrate];
            if (debugPuzzle2 && puzzle.trackOrder <= debugPuzzle2.trackOrder) {
                return true;
            }
        }
        
        // Check cross-track dependencies
        for (var i = 0; i < puzzle.dependencies.length; i++) {
            var depId = puzzle.dependencies[i];
            var depPuzzle = cookieAgeData.puzzles.registry[depId];
            if (!depPuzzle) continue;
            
            var depTrack = depPuzzle.type;
            var depTrackOrder = depPuzzle.trackOrder;
            
            // Check if dependency is completed by comparing trackOrder with progress
            if (depTrackOrder >= cookieAgeData.puzzles.tracks[depTrack].progress) {
                return false;
            }
        }
        
        return true;
    }
    
    function validatePuzzleActive(puzzleId) {
        // Check if the puzzle is currently active in any track
        ensureTracksInitialized();
        
        var investigateActive = cookieAgeData.puzzles.tracks.investigate.active;
        var infiltrateActive = cookieAgeData.puzzles.tracks.infiltrate.active;
        var chooseActive = cookieAgeData.puzzles.tracks.choose.active;
        
        return puzzleId === investigateActive || puzzleId === infiltrateActive || puzzleId === chooseActive;
    }
    
    // ===== CENTRALIZED HOOK MANAGEMENT =====
    function registerPuzzleHook(puzzleId, hookType, description) {
        // Handle both numeric and string puzzle IDs for backward compatibility
        var actualPuzzleId = typeof puzzleId === 'number' ? getPuzzleIdByIndex(puzzleId) : puzzleId;
        var numericId = typeof puzzleId === 'number' ? puzzleId : getPuzzleIndex(puzzleId);
        
        var hookFunction = function() {
            checkPuzzle(actualPuzzleId);
        };
        
        var hookKey = 'puzzle' + numericId;
        cookieAgeData.puzzles.hooks[hookKey] = hookFunction;
        
        return safeRegisterHook(hookType, hookFunction, description, hookKey);
    }
    
    function registerPuzzleHookWithCallback(puzzleId, hookType, callback, description) {
        // Handle both numeric and string puzzle IDs for backward compatibility
        var numericId = typeof puzzleId === 'number' ? puzzleId : getPuzzleIndex(puzzleId);
        var hookKey = 'puzzle' + numericId;
        cookieAgeData.puzzles.hooks[hookKey] = callback;
        
        return safeRegisterHook(hookType, callback, description, hookKey);
    }
    
    function setupPuzzle(puzzleId) {
        var puzzle = cookieAgeData.puzzles.registry[puzzleId];
        if (!puzzle) {
            errorLog('Cannot setup puzzle', puzzleId, '- not found in registry');
            return false;
        }
        
        debugLog('Setting up puzzle', puzzleId, ':', puzzle.name);
        
        // Check if this is a class-based puzzle
        if (puzzle.instance) {
            try {
                return puzzle.instance.setup();
            } catch (e) {
                errorLog('Error setting up puzzle instance', puzzleId, ':', e);
                return false;
            }
        }
        
        // Fallback to function-based puzzle for backwards compatibility
        if (puzzle.setup && typeof puzzle.setup === 'function') {
            try {
                puzzle.setup();
                return true;
            } catch (e) {
                errorLog('Error setting up puzzle', puzzleId, ':', e);
                return false;
            }
        } else {
            errorLog('No setup function defined for puzzle', puzzleId);
            return false;
        }
    }
    
    function checkPuzzle(puzzleId, ...args) {
        // Handle both numeric and string puzzle IDs for backward compatibility
        var actualPuzzleId = typeof puzzleId === 'number' ? getPuzzleIdByIndex(puzzleId) : puzzleId;
        var puzzle = cookieAgeData.puzzles.registry[actualPuzzleId];
        if (!puzzle) {
            return false;
        }
        
        // Check if this is a class-based puzzle
        if (puzzle.instance) {
            try {
                return puzzle.instance.check.apply(puzzle.instance, args);
            } catch (e) {
                errorLog('Error checking puzzle instance', puzzleId, ':', e);
                return false;
            }
        }
        
        // Fallback to function-based puzzle for backwards compatibility
        if (puzzle.check && typeof puzzle.check === 'function') {
            try {
                return puzzle.check.apply(null, args);
            } catch (e) {
                errorLog('Error checking puzzle', puzzleId, ':', e);
                return false;
            }
        }
        
        return false;
    }
    
    function cleanupPuzzle(puzzleId) {
        var puzzle = cookieAgeData.puzzles.registry[puzzleId];
        if (!puzzle) {
            errorLog('Cannot cleanup puzzle', puzzleId, '- not found in registry');
            return false;
        }
        
        debugLog('Cleaning up puzzle', puzzleId, ':', puzzle.name);
        
        // Check if this is a class-based puzzle
        if (puzzle.instance) {
            try {
                return puzzle.instance.cleanup();
            } catch (e) {
                errorLog('Error cleaning up puzzle instance', puzzleId, ':', e);
                return false;
            }
        }
        
        // Fallback to function-based puzzle for backwards compatibility
        if (puzzle.cleanup && typeof puzzle.cleanup === 'function') {
            try {
                puzzle.cleanup();
                return true;
            } catch (e) {
                errorLog('Error cleaning up puzzle', puzzleId, ':', e);
                return false;
            }
        } else {
            errorLog('No cleanup function defined for puzzle', puzzleId);
            return false;
        }
    }
    
    // ===== PUZZLE HOOK CLEANUP =====
    function cleanupPuzzleHooks(puzzleId) {
        // Handle both numeric and string puzzle IDs for backward compatibility
        var actualPuzzleId = typeof puzzleId === 'number' ? getPuzzleIdByIndex(puzzleId) : puzzleId;
        var numericId = typeof puzzleId === 'number' ? puzzleId : getPuzzleIndex(puzzleId);
        
        // Clean up specific puzzle hooks
        var hookKey = 'puzzle' + numericId;
        var storedCb = cookieAgeData.puzzles.hooks[hookKey];
        if (storedCb && Game.removeHook) {
            try { Game.removeHook('check', storedCb); } catch (_) {}
            try { Game.removeHook('logic', storedCb); } catch (_) {}
        }
        if (cookieAgeData.puzzles && cookieAgeData.puzzles.hooks) {
            delete cookieAgeData.puzzles.hooks[hookKey];
        }

        // Additionally, scan all hook types and remove any Cookie Age callbacks for this puzzle
        try {
            if (Game.customHooks) {
                var suffix = ':puzzle' + numericId;
                for (var type in Game.customHooks) {
                    if (!Array.isArray(Game.customHooks[type])) continue;
                    Game.customHooks[type] = Game.customHooks[type].filter(function(fn) {
                        if (!fn || fn.__cookieAgeKey === undefined) return true;
                        return !(typeof fn.__cookieAgeKey === 'string' && fn.__cookieAgeKey.endsWith(suffix));
                    });
                }
            }
        } catch (e) {
            try { debugLog('Failed extended cleanup for puzzle', numericId, e); } catch (_) {}
        }
    }
    
    // =================================================================
    // PUZZLE-SPECIFIC HELPER FUNCTIONS
    // =================================================================
    function showChessBoardPuzzle() {
        if (document.getElementById('cookieAgeSkyPrompt')) {
            return;
        }
        
        var promptDiv = document.createElement('div');
        promptDiv.id = 'cookieAgeSkyPrompt';
        promptDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        var contentDiv = document.createElement('div');
        contentDiv.className = 'framed';
        contentDiv.style.cssText = `
            max-width: 600px;
            width: 90%;
            min-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        contentDiv.innerHTML = `
            <div style="position: relative;">
                <div id="cookieAgePromptCloseX" style="position: absolute; top: 5px; right: 5px; cursor: pointer; font-size: 18px; font-weight: bold; color: #ccc; z-index: 10001;" onclick="document.getElementById('cookieAgeSkyPrompt').parentNode.removeChild(document.getElementById('cookieAgeSkyPrompt'));">×</div>
                <div style="text-align: center; background: transparent;">
                    <img src="https://raw.githubusercontent.com/dfsw/Cookies/main/chess.png" style="max-width: 500px; width: 100%; height: auto; border: none; outline: none; background: transparent;" alt="">
                </div>
                <div class="optionBox">
                    <a class="option" id="cookieAgePromptClose" onclick="document.getElementById('cookieAgeSkyPrompt').parentNode.removeChild(document.getElementById('cookieAgeSkyPrompt'));">Close</a>
                </div>
            </div>
        `;
        
        promptDiv.appendChild(contentDiv);
        document.body.appendChild(promptDiv);
        
        promptDiv.addEventListener('click', function(e) {
            if (e.target === promptDiv) {
                document.getElementById('cookieAgeSkyPrompt').parentNode.removeChild(document.getElementById('cookieAgeSkyPrompt'));
            }
        });
        
        var escapeHandler = function(e) {
            if (e.key === 'Escape') {
                var promptElement = document.getElementById('cookieAgeSkyPrompt');
                if (promptElement && promptElement.parentNode) {
                    promptElement.parentNode.removeChild(promptElement);
                }
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Wrinkler audio system
    var WRINKLER_TONE_DURATION = 500;
    var INSTRUMENTAL_CONFIG = {
        harmonics: {
            octave: 0.25,
            fifth: 0.35,
            doubleOctave: 0.05
        },
        vibrato: {
            frequency: 3,
            depth: 0.01
        },
        envelope: {
            attack: 0.08,
            decay: 0.2,
            sustain: 0.85,
            release: 0.4
        },
        amplitude: 0.18
    };
    
    var WRINKLER_TONE_FREQUENCIES = [
        261.625565, // 0: C4
        293.664768, // 1: D4
        329.627557, // 2: E4
        349.228231, // 3: F4
        391.995436, // 4: G4
        440.000000, // 5: A4
        493.883301, // 6: B4
        523.251131, // 7: C5
        587.329536, // 8: D5
        659.255114, // 9: E5
        739.988845, // 10: F#5
        783.990872, // 11: G5
        880.000000, // 12: A5
        987.766603, // 13: B5
        311.127000  // 14: wrong note (E♭4) 
    ];
    
    var notesSpriteSheetUrl = 'https://raw.githubusercontent.com/dfsw/Cookies/main/notes.png';
    var notesSpriteSheetImage = null;
    var notesSpriteSheetLoaded = false;
    
    function loadNotesSpriteSheet() {
        if (notesSpriteSheetLoaded) return;
        
        var img = new Image();
        img.onload = function() {
            notesSpriteSheetImage = img;
            notesSpriteSheetLoaded = true;
        };
        img.onerror = function() {};
        img.src = notesSpriteSheetUrl;
    }
    
    var WRINKLER_NOTE_SPRITES = [
        [0, 0], // C4 - middle C (quarter note, G clef)
        [1, 0], // D4 - eighth note
        [2, 0], // E4 - beamed eighths
        [3, 0], // F4 - beamed sixteenths
        [4, 0], // G4 - flat (stylized marker)
        [5, 0], // A4 - natural
        [6, 0], // B4 - sharp
        [7, 0], // C5 - quarter note, lower bass clef tone visually distinct
        [8, 0], // D5 - eighth note
        [9, 0], // E5 - beamed eighths
        [10, 0], // F5 - beamed sixteenths
        [11, 0], // G5 - flat
        [12, 0], // A5 - natural
        [13, 0]  // B5 - sharp
    ];
    
    var wrinklerAudioElements = [];
    var audioInitialized = false;
    
    var musicalNoteParticles = [];
    
    var hiddenMessage = "Now redeem Secret";
    var revealedLetters = 0;
    var currentSequenceIndex = 0;
    var lastNoteTime = 0;
    
    // Sequence for rise_up puzzle
    var NOTE_SEQUENCE = [9,11,10,9,13,11,8,5,9,11,10,9,6,8,7,4,2,0,3,1,12,7,4,5];
    
    function initWrinklerAudioSystem() {
        if (audioInitialized) return true;
        
        try {
            // Create audio elements for each wrinkler tone (15 total: 14 notes + 1 wrong note)
            for (var i = 0; i < 15; i++) {
                var audio = new Audio();
                audio.preload = 'auto';
                audio.volume = 0.3; // Lower volume to match original
                
                // Generate data URL for sine wave tone
                var frequency = WRINKLER_TONE_FREQUENCIES[i];
                var duration = WRINKLER_TONE_DURATION;
                var sampleRate = 44100;
                var samples = Math.floor(sampleRate * duration / 1000);
                var buffer = new ArrayBuffer(44 + samples * 2);
                var view = new DataView(buffer);
                
                var writeString = function(offset, string) {
                    for (var i = 0; i < string.length; i++) {
                        view.setUint8(offset + i, string.charCodeAt(i));
                    }
                };
                
                writeString(0, 'RIFF');
                view.setUint32(4, 36 + samples * 2, true);
                writeString(8, 'WAVE');
                writeString(12, 'fmt ');
                view.setUint32(16, 16, true);
                view.setUint16(20, 1, true);
                view.setUint16(22, 1, true);
                view.setUint32(24, sampleRate, true);
                view.setUint32(28, sampleRate * 2, true);
                view.setUint16(32, 2, true);
                view.setUint16(34, 16, true);
                writeString(36, 'data');
                view.setUint32(40, samples * 2, true);
                
                if (i === 14) {
                    for (var j = 0; j < samples; j++) {
                        var time = j / sampleRate;
                        var sample = 0;
                        
                        sample += Math.sin(2 * Math.PI * frequency * time) * 0.35;
                        sample += Math.sin(2 * Math.PI * frequency * 1.2 * time) * 0.3;
                        sample += Math.sin(2 * Math.PI * frequency * 1.4 * time) * 0.25;
                        sample += Math.sin(2 * Math.PI * frequency * 1.6 * time) * 0.2;
                        sample += Math.sin(2 * Math.PI * frequency * 1.8 * time) * 0.15;
                        sample += Math.sin(2 * Math.PI * frequency * 2.3 * time) * 0.1;
                        sample += Math.sin(2 * Math.PI * frequency * 2.7 * time) * 0.08;
                        
                        var jarringMod = Math.sin(2 * Math.PI * 4 * time) * 0.03;
                        sample += Math.sin(2 * Math.PI * frequency * (1 + jarringMod) * time) * 0.2;
                        
                        var envelope = 1;
                        var attackTime = samples * 0.005;
                        var sustainTime = samples * 0.6;
                        var decayTime = samples * 0.35;
                        
                        if (j < attackTime) {
                            envelope = j / attackTime;
                        } else if (j < attackTime + sustainTime) {
                            var tremolo = 1 + Math.sin(2 * Math.PI * 5 * time) * 0.08;
                            envelope = tremolo;
                        } else if (j < attackTime + sustainTime + decayTime) {
                            envelope = 1 - ((j - attackTime - sustainTime) / decayTime) * 0.95;
                        } else {
                            envelope = 0.05;
                        }
                        
                        sample *= envelope * 0.28;
                        sample = Math.tanh(sample * 4.0);
                        
                        view.setInt16(44 + j * 2, sample * 32767, true);
                    }
                } else {
                    // Generate normal instrumental-sounding tone with harmonics
                    for (var j = 0; j < samples; j++) {
                        var time = j / sampleRate;
                        var sample = 0;
                        
                        // Fundamental frequency (main note)
                        sample += Math.sin(2 * Math.PI * frequency * time) * 0.6;
                        
                        // Add harmonics for richer sound using config
                        sample += Math.sin(2 * Math.PI * frequency * 2 * time) * INSTRUMENTAL_CONFIG.harmonics.octave;
                        sample += Math.sin(2 * Math.PI * frequency * 3 * time) * INSTRUMENTAL_CONFIG.harmonics.fifth;
                        sample += Math.sin(2 * Math.PI * frequency * 4 * time) * INSTRUMENTAL_CONFIG.harmonics.doubleOctave;
                        
                        // Smooth detune drift (slow phase movement, no static)
                        var drift = 1 + 0.002 * Math.sin(2 * Math.PI * 0.2 * time) + 0.0015 * Math.sin(2 * Math.PI * 0.05 * time);
                        sample += Math.sin(2 * Math.PI * frequency * drift * time) * 0.6;
                        
                        // Add slight vibrato for more organic sound using config
                        var vibrato = Math.sin(2 * Math.PI * INSTRUMENTAL_CONFIG.vibrato.frequency * time) * INSTRUMENTAL_CONFIG.vibrato.depth;
                        sample += Math.sin(2 * Math.PI * frequency * (1 + vibrato) * time) * 0.1;
                        
                        // Apply ADSR envelope for more natural attack/decay using config
                        var envelope = 1;
                        var attackTime = samples * INSTRUMENTAL_CONFIG.envelope.attack;
                        var decayTime = samples * INSTRUMENTAL_CONFIG.envelope.decay;
                        var sustainLevel = INSTRUMENTAL_CONFIG.envelope.sustain;
                        var releaseTime = samples * INSTRUMENTAL_CONFIG.envelope.release;
                        
                        if (j < attackTime) {
                            // Attack phase - quick rise
                            envelope = j / attackTime;
                        } else if (j < attackTime + decayTime) {
                            // Decay phase - fall to sustain level
                            envelope = 1 - ((j - attackTime) / decayTime) * (1 - sustainLevel);
                        } else if (j < samples - releaseTime) {
                            // Sustain phase - hold level
                            envelope = sustainLevel;
                        } else {
                            // Release phase - fade out
                            envelope = sustainLevel * ((samples - j) / releaseTime);
                        }
                        
                        // Apply envelope and dynamic brightness (highs fade faster)
                        var brightness = Math.pow(envelope, 1.5);
                        sample = sample * envelope * brightness * INSTRUMENTAL_CONFIG.amplitude;
                        
                        //clipping
                        sample = Math.tanh(sample * 2.0);
                        
                        view.setInt16(44 + j * 2, sample * 32767, true);
                    }
                }
                
                // Create blob and set as source
                var blob = new Blob([buffer], { type: 'audio/wav' });
                audio.src = URL.createObjectURL(blob);
                
                wrinklerAudioElements.push(audio);
            }
            
            audioInitialized = true;
            debugLog('Robust wrinkler audio system initialized with', wrinklerAudioElements.length, 'pre-generated tones');
            return true;
        } catch (e) {
            errorLog('Failed to initialize wrinkler audio system:', e);
            return false;
        }
    }
    
    // Play a tone using pre-generated HTML5 Audio elements
    function playWrinklerTone(frequency, duration) {
        // Initialize audio system if not already done
        if (!audioInitialized) {
            if (!initWrinklerAudioSystem()) {
                playFallbackAudio();
                return;
            }
        }
        
        try {
            // Find the audio element for this frequency
            var frequencyIndex = WRINKLER_TONE_FREQUENCIES.indexOf(frequency);
            if (frequencyIndex >= 0 && frequencyIndex < wrinklerAudioElements.length) {
                var audio = wrinklerAudioElements[frequencyIndex];
                
                // Reset audio to beginning and play
                audio.currentTime = 0;
                audio.play().catch(function(e) {
                    // If play fails, try fallback
                    playFallbackAudio();
                });
            } else {
                // Frequency not found, use fallback
                playFallbackAudio();
            }
        } catch (e) {
            // Any error, use fallback
            playFallbackAudio();
        }
    }
    
    // Fallback audio using game's existing system
    function playFallbackAudio() {
        try {
            // Try multiple fallback methods
            if (typeof PlaySound !== 'undefined') {
                PlaySound('snd/tick.mp3');
            } else if (Game.Audio && Game.Audio.playSound) {
                Game.Audio.playSound('snd/tick.mp3');
            } else if (Game.PlaySound) {
                Game.PlaySound('snd/tick.mp3');
            }
        } catch (fallbackError) {
            // Silent fail - audio is optional for the puzzle
        }
    }
    
    // Create a drifting musical note particle
    function createMusicalNoteParticle(x, y, noteSprite) {
        var particle = {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2, // Small horizontal drift
            vy: -2 - Math.random() * 2,   // Upward drift
            life: 1.0,
            decay: 0.02,
            sprite: noteSprite,
            color: '#fff',
            shadowColor: 'rgba(0,0,0,0.8)'
        };
        
        musicalNoteParticles.push(particle);
    }
    
    // Update and draw custom musical note particles
    function updateMusicalNoteParticles() {
        if (musicalNoteParticles.length === 0) return;
        
        // Use our own canvas context variable - don't reuse game variables
        var customParticleCanvas = Game.LeftBackground;
        if (!customParticleCanvas) return;
        
        // Check if sprite sheet is loaded
        if (!notesSpriteSheetLoaded || !notesSpriteSheetImage) {
            return; // Skip drawing if sprite sheet isn't loaded yet
        }
        
        // Define sprite size for notes (scaled down from 80x80)
        var customNoteSize = 40; // Half the original size for better visibility
        
        // Update and draw particles
        for (var i = musicalNoteParticles.length - 1; i >= 0; i--) {
            var customParticle = musicalNoteParticles[i];
            
            // Update position
            customParticle.x += customParticle.vx;
            customParticle.y += customParticle.vy;
            
            // Update life
            customParticle.life -= customParticle.decay;
            
            // Draw if still alive
            if (customParticle.life > 0) {
                customParticleCanvas.save();
                customParticleCanvas.globalAlpha = customParticle.life;
                
                // Draw sprite shadow
                customParticleCanvas.globalCompositeOperation = 'source-over';
                customParticleCanvas.globalAlpha = customParticle.life * 0.3;
                customParticleCanvas.drawImage(
                    notesSpriteSheetImage, // loaded sprite sheet image
                    customParticle.sprite[0] * 80, // source x (80px per sprite)
                    customParticle.sprite[1] * 80, // source y
                    80, // source width
                    80, // source height
                    customParticle.x + 2, // dest x (shadow offset)
                    customParticle.y + 2, // dest y (shadow offset)
                    customNoteSize, // dest width
                    customNoteSize  // dest height
                );
                
                // Draw main sprite
                customParticleCanvas.globalAlpha = customParticle.life;
                customParticleCanvas.drawImage(
                    notesSpriteSheetImage, // loaded sprite sheet image
                    customParticle.sprite[0] * 80, // source x (80px per sprite)
                    customParticle.sprite[1] * 80, // source y
                    80, // source width
                    80, // source height
                    customParticle.x, // dest x
                    customParticle.y, // dest y
                    customNoteSize, // dest width
                    customNoteSize  // dest height
                );
                
                customParticleCanvas.restore();
            } else {
                // Remove dead particle
                musicalNoteParticles.splice(i, 1);
            }
        }
    }
    
    function checkNoteSequence(playedIndex) {
        lastNoteTime = Date.now();
        
        var expectedNote = NOTE_SEQUENCE[currentSequenceIndex];
        
        if (playedIndex === expectedNote) {
            revealedLetters++;
            currentSequenceIndex = (currentSequenceIndex + 1) % NOTE_SEQUENCE.length;
            
            if (revealedLetters >= hiddenMessage.length) {
                revealedLetters = hiddenMessage.length;
            }
        } else {
            // Reset on wrong note
            revealedLetters = 0;
            currentSequenceIndex = 0;
        }
    }
    
    // Update message decay timer
    function updateMessageDecay() {
        if (revealedLetters > 0) {
            var currentTime = Date.now();
            
            // Initialize timer if this is the first time
            if (lastNoteTime === 0) {
                lastNoteTime = currentTime;
                return;
            }
            
            var timeSinceLastDecay = currentTime - lastNoteTime;
            
            // Every 2.5 seconds remove a letter
            if (timeSinceLastDecay >= 2500) {
                revealedLetters = Math.max(0, revealedLetters - 1);
                lastNoteTime = currentTime; // Reset timer for next decay
                
                
                if (revealedLetters === 0) {
                    currentSequenceIndex = 0;
                }
            }
        }
    }
    
    // Draw the hidden message
    function drawHiddenMessage() {
        if (revealedLetters === 0) return;
        
        // Use our own canvas context variable - don't reuse game variables
        var customCanvas = Game.LeftBackground;
        if (!customCanvas) return;
        
        // Define our own styling variables - completely independent
        var customRevealedText = hiddenMessage.substring(0, revealedLetters);
        var customFontSize = 16;
        var customFontFamily = 'Arial';
        var customFontWeight = 'bold';
        var customFont = customFontWeight + ' ' + customFontSize + 'px ' + customFontFamily;
        
        // Our own positioning variables
        var customCenterX = Game.cookieOriginX;
        var customCenterY = Game.cookieOriginY + 50; // Move up closer to cookie
        
        var customBackgroundColor = '#1a1a1a';
        var customBorderColor = '#333333';
        var customTextColor = '#ffffff';
        var customBorderWidth = 1;
        var customCornerRadius = 20;
        var customPadding = 12;
        var customBackgroundAlpha = 0.8;
        
        customCanvas.save();
        customCanvas.font = customFont;
        customCanvas.textAlign = 'center';
        customCanvas.textBaseline = 'middle';
        var customTextWidth = customCanvas.measureText(customRevealedText).width;
        var customTextHeight = customFontSize;
        customCanvas.restore();
        
        var customBoxWidth = customTextWidth + (customPadding * 2);
        var customBoxHeight = customTextHeight + (customPadding * 2);
        var customBoxX = customCenterX - (customBoxWidth / 2);
        var customBoxY = customCenterY - (customBoxHeight / 2);
        
        customCanvas.save();
        customCanvas.globalAlpha = customBackgroundAlpha; // Apply transparency
        customCanvas.fillStyle = customBackgroundColor;
        customCanvas.strokeStyle = customBorderColor;
        customCanvas.lineWidth = customBorderWidth;
        
        // Draw rounded rectangle using our own path
        customCanvas.beginPath();
        customCanvas.moveTo(customBoxX + customCornerRadius, customBoxY);
        customCanvas.lineTo(customBoxX + customBoxWidth - customCornerRadius, customBoxY);
        customCanvas.quadraticCurveTo(customBoxX + customBoxWidth, customBoxY, customBoxX + customBoxWidth, customBoxY + customCornerRadius);
        customCanvas.lineTo(customBoxX + customBoxWidth, customBoxY + customBoxHeight - customCornerRadius);
        customCanvas.quadraticCurveTo(customBoxX + customBoxWidth, customBoxY + customBoxHeight, customBoxX + customBoxWidth - customCornerRadius, customBoxY + customBoxHeight);
        customCanvas.lineTo(customBoxX + customCornerRadius, customBoxY + customBoxHeight);
        customCanvas.quadraticCurveTo(customBoxX, customBoxY + customBoxHeight, customBoxX, customBoxY + customBoxHeight - customCornerRadius);
        customCanvas.lineTo(customBoxX, customBoxY + customCornerRadius);
        customCanvas.quadraticCurveTo(customBoxX, customBoxY, customBoxX + customCornerRadius, customBoxY);
        customCanvas.closePath();
        customCanvas.fill();
        customCanvas.stroke();
        customCanvas.restore();
        
        // Draw text 
        customCanvas.save();
        customCanvas.fillStyle = customTextColor;
        customCanvas.font = customFont;
        customCanvas.textAlign = 'center';
        customCanvas.textBaseline = 'middle';
        customCanvas.fillText(customRevealedText, customCenterX, customCenterY);
        customCanvas.restore();
    }
    
    // =================================================================
    // PUZZLE FRAMEWORK - BASE CLASSES AND UTILITIES
    // =================================================================
    function BasePuzzle(puzzleId, puzzleData, registry) {
        this.puzzleId = puzzleId;
        this.puzzleData = puzzleData;
        this.registry = registry;
        this.numericId = getPuzzleIndex(puzzleId);
        this.hookKey = 'puzzle' + this.numericId;
        this.hooks = [];
        this._setupComplete = false;
    }
    
    BasePuzzle.prototype.setup = function() {
        if (this._setupComplete) {
            return true;
        }
        
        try {
            this.onSetup();
            this._setupComplete = true;
            return true;
        } catch (e) {
            errorLog('Error setting up puzzle', this.puzzleId, ':', e);
            return false;
        }
    };
    
    BasePuzzle.prototype.check = function(...args) {
        if (!this.isValid()) {
            return false;
        }
        
        try {
            return this.onCheck.apply(this, args);
        } catch (e) {
            errorLog('Error checking puzzle', this.puzzleId, ':', e);
            return false;
        }
    };
    
    BasePuzzle.prototype.cleanup = function() {
        try {
            this.onCleanup();
            this.removeHooks();
            this._setupComplete = false;
            return true;
        } catch (e) {
            errorLog('Error cleaning up puzzle', this.puzzleId, ':', e);
            return false;
        }
    };
    
    BasePuzzle.prototype.isValid = function() {
        var puzzleIndex = this.numericId;
        var progressValid = isPuzzleProgressValid(this.puzzleId);
        var puzzleActive = validatePuzzleActive(this.puzzleId);
        return progressValid && puzzleActive;
    };
    
    BasePuzzle.prototype.complete = function() {
        return tryCompletePuzzle(this.puzzleId);
    };
    
    BasePuzzle.prototype.registerHook = function(hookType, callback, description) {
        var hookKey = this.hookKey;
        cookieAgeData.puzzles.hooks[hookKey] = callback;
        this.hooks.push({ key: hookKey, callback: callback });
        return safeRegisterHook(hookType, callback, description, hookKey);
    };
    
    BasePuzzle.prototype.removeHooks = function() {
        var self = this;
        this.hooks.forEach(function(hook) {
            if (Game.removeHook) {
                try {
                    Game.removeHook('check', hook.callback);
                    Game.removeHook('logic', hook.callback);
                } catch (e) {}
            }
            delete cookieAgeData.puzzles.hooks[hook.key];
        });
        this.hooks = [];
    };
    
    // Abstract methods to be overridden
    BasePuzzle.prototype.onSetup = function() {
        // Override in subclasses
    };
    
    BasePuzzle.prototype.onCheck = function(...args) {
        // Override in subclasses
        return false;
    };
    
    BasePuzzle.prototype.onCleanup = function() {
        // Override in subclasses
    };
    
    /**
     * Simple hook puzzle - automatically registers 'check' hook
     */
    function SimpleHookPuzzle(puzzleId, puzzleData, registry) {
        BasePuzzle.call(this, puzzleId, puzzleData, registry);
    }
    
    SimpleHookPuzzle.prototype = Object.create(BasePuzzle.prototype);
    SimpleHookPuzzle.prototype.constructor = SimpleHookPuzzle;
    
    SimpleHookPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check ' + this.puzzleData.name + ' puzzle');
    };
    
    /**
     * State tracking puzzle - manages tracking data automatically
     */
    function StateTrackingPuzzle(puzzleId, puzzleData, registry, trackingKey) {
        BasePuzzle.call(this, puzzleId, puzzleData, registry);
        this.trackingKey = trackingKey || puzzleId + '_tracking';
    }
    
    StateTrackingPuzzle.prototype = Object.create(BasePuzzle.prototype);
    StateTrackingPuzzle.prototype.constructor = StateTrackingPuzzle;
    
    StateTrackingPuzzle.prototype.getTracking = function() {
        if (!cookieAgeData.puzzles[this.trackingKey]) {
            cookieAgeData.puzzles[this.trackingKey] = this.initializeTracking();
        }
        return cookieAgeData.puzzles[this.trackingKey];
    };
    
    StateTrackingPuzzle.prototype.initializeTracking = function() {
        return {};
    };
    
    StateTrackingPuzzle.prototype.onCleanup = function() {
        if (cookieAgeData.puzzles[this.trackingKey] !== undefined) {
            delete cookieAgeData.puzzles[this.trackingKey];
        }
    };
    
    /**
     * Minigame hook puzzle - handles function wrapping and cleanup
     */
    function MinigameHookPuzzle(puzzleId, puzzleData, registry) {
        BasePuzzle.call(this, puzzleId, puzzleData, registry);
        this.minigameHooks = [];
    }
    
    MinigameHookPuzzle.prototype = Object.create(BasePuzzle.prototype);
    MinigameHookPuzzle.prototype.constructor = MinigameHookPuzzle;
    
    MinigameHookPuzzle.prototype.hookMinigameFunction = function(buildingName, funcName, wrapper) {
        var buildingObj = Game.Objects[buildingName];
        if (!buildingObj || !buildingObj.minigame) {
            return false;
        }
        
        var M = buildingObj.minigame;
        if (!M[funcName] || typeof M[funcName] !== 'function') {
            return false;
        }
        
        var original = M[funcName];
        var hookKey = '_original' + funcName.charAt(0).toUpperCase() + funcName.slice(1) + '_' + this.puzzleId;
        var hookFlag = '_' + this.puzzleId + 'Hooked';
        
        // Store original and wrap if not already hooked
        if (!M[hookKey]) {
            M[hookKey] = original;
            M[funcName] = function(...args) {
                if (wrapper) {
                    return wrapper.call(this, original, ...args);
                }
                return original.apply(this, args);
            };
            M[hookFlag] = true;
            
            this.minigameHooks.push({
                buildingObj: buildingObj,
                buildingName: buildingName,
                funcName: funcName,
                hookKey: hookKey,
                hookFlag: hookFlag,
                original: original
            });
            
            return true;
        }
        
        return false;
    };
    
    MinigameHookPuzzle.prototype.onCleanup = function() {
        for (var i = 0; i < this.minigameHooks.length; i++) {
            var hook = this.minigameHooks[i];
            var M = hook.buildingObj.minigame;
            
            if (M && M[hook.hookKey]) {
                M[hook.funcName] = M[hook.hookKey];
                delete M[hook.hookKey];
                delete M[hook.hookFlag];
            }
        }
        this.minigameHooks = [];
    };
    
    /**
     * Sequence puzzle - handles sequence tracking and validation
     */
    function SequencePuzzle(puzzleId, puzzleData, registry, trackingKey) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, trackingKey);
    }
    
    SequencePuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    SequencePuzzle.prototype.constructor = SequencePuzzle;
    
    SequencePuzzle.prototype.validateSequence = function(currentState, requiredSequence) {
        if (!requiredSequence || requiredSequence.length === 0) {
            return true;
        }
        
        if (!Array.isArray(currentState.sequence)) {
            return false;
        }
        
        if (currentState.sequence.length !== requiredSequence.length) {
            return false;
        }
        
        for (var i = 0; i < requiredSequence.length; i++) {
            if (currentState.sequence[i] !== requiredSequence[i]) {
                return false;
            }
        }
        
        return true;
    };
    
    SequencePuzzle.prototype.resetSequence = function() {
        var tracking = this.getTracking();
        if (tracking.reset) {
            tracking.reset.call(this);
        } else {
            tracking.sequence = [];
            tracking.sequenceIndex = 0;
            if (tracking.hasOwnProperty('lastSwitchTs')) {
                tracking.lastSwitchTs = Date.now();
            }
        }
    };

    // =================================================================
    // PUZZLE CLASS DEFINITIONS
    // =================================================================
    function TrialScalesPatiencePuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'dragonAuraTracking');
        this.dragonHooked = false;
    }
    TrialScalesPatiencePuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    TrialScalesPatiencePuzzle.prototype.constructor = TrialScalesPatiencePuzzle;
    
    TrialScalesPatiencePuzzle.prototype.initializeTracking = function() {
        return {
            requiredAuras: [5, 7],
            petCount: 0,
            requiredPets: 7,
            hooked: false
        };
    };
    
    TrialScalesPatiencePuzzle.prototype.onSetup = function() {
        var self = this;
        if (Game.specialTab === 'dragon' && Game.dragonLevel >= 4 && Game.Has('Pet the dragon')) {
            this.hookDragonPetting();
        } else {
            this.registerHook('check', function() {
                if (Game.specialTab === 'dragon' && Game.dragonLevel >= 4 && Game.Has('Pet the dragon') && !self.getTracking().hooked) {
                    self.hookDragonPetting();
                }
            }, 'Check for dragon availability');
        }
    };
    
    TrialScalesPatiencePuzzle.prototype.hookDragonPetting = function() {
        if (!Game._originalClickSpecialPic) {
            Game._originalClickSpecialPic = Game.ClickSpecialPic;
        }
        
        var self = this;
        Game.ClickSpecialPic = function() {
            Game._originalClickSpecialPic();
            
            if (self.isValid() && Game.specialTab === 'dragon' && Game.dragonLevel >= 4 && Game.Has('Pet the dragon')) {
                self.checkDragonPet();
            }
        };
        
        this.getTracking().hooked = true;
        this.dragonHooked = true;
    };
    
    TrialScalesPatiencePuzzle.prototype.checkDragonPet = function() {
        var tracking = this.getTracking();
        
        var currentAura1 = Game.dragonAura || 0;
        var currentAura2 = Game.dragonAura2 || 0;
        
        // Check if aura 20 (Radiant Appetite) exists in either slot
        var hasAura20 = (currentAura1 === 20 || currentAura2 === 20);
        // Check if aura 7 (Dragon's Fortune) exists in either slot
        var hasAura7 = (currentAura1 === 7 || currentAura2 === 7);
        
        if (hasAura20 && hasAura7) {
            tracking.petCount++;
            
            if (tracking.petCount >= tracking.requiredPets) {
                this.complete();
            }
        } else {
            tracking.petCount = 0;
        }
    };
    
    TrialScalesPatiencePuzzle.prototype.onCleanup = function() {
        if (Game._originalClickSpecialPic) {
            Game.ClickSpecialPic = Game._originalClickSpecialPic;
            delete Game._originalClickSpecialPic;
        }
    };
    
    TrialScalesPatiencePuzzle.prototype.onCheck = function() {
        // Check happens in dragon petting hook
        return;
    };
    
    function CompassSentinelPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'compassTracking');
    }
    CompassSentinelPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    CompassSentinelPuzzle.prototype.constructor = CompassSentinelPuzzle;
    
    CompassSentinelPuzzle.prototype.initializeTracking = function() {
        return {
            expectedPattern: {
                filled: [1, 2, 4, 5, 9],
                empty: [0, 3, 6, 7, 8, 10, 11]
            },
            patternSeenComplete: false,
            completed: false
        };
    };
    
    CompassSentinelPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check compass sentinel pattern');
    };
    
    CompassSentinelPuzzle.prototype.onCheck = function() {
        if (!Game.wrinklers || Game.wrinklers.length < 12) {
            return;
        }
        
        var tracking = this.getTracking();
        var expectedPattern = tracking.expectedPattern;
        var patternComplete = true;
        
        // Check ALL filled positions (including position 6) - these should be alive (close === 1)
        for (var i = 0; i < expectedPattern.filled.length; i++) {
            var pos = expectedPattern.filled[i];
            if (pos < Game.wrinklers.length && Game.wrinklers[pos].close !== 1) {
                patternComplete = false;
                break;
            }
        }
        
        // Check all empty positions - these should be popped (close !== 1)
        if (patternComplete) {
            for (var i = 0; i < expectedPattern.empty.length; i++) {
                var pos = expectedPattern.empty[i];
                if (pos < Game.wrinklers.length && Game.wrinklers[pos].close === 1) {
                    patternComplete = false;
                    break;
                }
            }
        }
        
        // Mark if pattern was ever seen complete
        if (patternComplete) {
            tracking.patternSeenComplete = true;
        }
        
        if (tracking.patternSeenComplete && Game.wrinklers[6] && Game.wrinklers[6].close !== 1) {
            // Guard against double completion
            if (!tracking.completed) {
                tracking.completed = true;
            this.complete();
            }
        }
    };
    
    function PatternAltarsPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'templeSequence');
        this.targetBuilding = 'Temple';
    }
    PatternAltarsPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    PatternAltarsPuzzle.prototype.constructor = PatternAltarsPuzzle;
    
    PatternAltarsPuzzle.prototype.initializeTracking = function() {
        var initialCounts = {};
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            initialCounts[building.name] = building.amount;
        }
        
        var templeObj = Game.Objects[this.targetBuilding];
        return {
            currentStep: 0,
            stepTargets: [
                { action: 'buy', amount: 2 },
                { action: 'sell', amount: 3 },
                { action: 'buy', amount: 5 },
                { action: 'sell', amount: 7 },
                { action: 'buy', amount: 11 }
            ],
            stepStartCounts: [],
            initialTempleCount: templeObj ? templeObj.amount : 0,
            initialBuildingCounts: initialCounts,
            sequenceComplete: false,
            buildingName: this.targetBuilding
        };
    };
    
    PatternAltarsPuzzle.prototype.onSetup = function() {
        var tracking = this.getTracking();
        var currentStep = tracking.currentStep;
        if (currentStep < tracking.stepTargets.length) {
            var buildingObj = Game.Objects[this.targetBuilding];
            if (buildingObj) {
                tracking.stepStartCounts[currentStep] = buildingObj.amount;
            }
        }
        
        // Hook into Temple buy/sell functions
        this.hookTempleBuySell();
        
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check pattern altars sequence');
    };
    
    PatternAltarsPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        if (tracking.sequenceComplete) {
            return;
        }
        
        var currentStep = tracking.currentStep;
        if (currentStep >= tracking.stepTargets.length) {
            tracking.sequenceComplete = true;
            this.complete();
            return;
        }
        
        var buildingObj = Game.Objects[this.targetBuilding];
        if (!buildingObj) {
            return;
        }
        
        var currentCount = buildingObj.amount;
        var startCount = tracking.stepStartCounts[currentStep] || 0;
        var stepTarget = tracking.stepTargets[currentStep];
        var amountToChange = stepTarget.amount;
        
        var targetCount;
        if (stepTarget.action === 'sell') {
            targetCount = startCount - amountToChange;
        } else if (stepTarget.action === 'buy') {
            targetCount = startCount + amountToChange;
        }
        
        // Check if they did the wrong action
        var wrongAction = false;
        if (stepTarget.action === 'buy' && currentCount < startCount) {
            wrongAction = true;
        } else if (stepTarget.action === 'sell' && currentCount > startCount) {
            wrongAction = true;
        }
        
        if (wrongAction) {
            this.resetSequence();
            return;
        }
        
        // Check if they changed any other building
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            if (building.name !== this.targetBuilding) {
                if (tracking.initialBuildingCounts[building.name] === undefined) {
                    tracking.initialBuildingCounts[building.name] = building.amount;
                }
                
                if (building.amount !== tracking.initialBuildingCounts[building.name]) {
                    this.resetSequence();
                    return;
                }
            }
        }
        
        // Check if they exceeded the correct count
        if (stepTarget.action === 'sell' && currentCount < targetCount) {
            this.resetSequence();
            return;
        } else if (stepTarget.action === 'buy' && currentCount > targetCount) {
            this.resetSequence();
            return;
        }
        
        // Check if step completed
        if (currentCount === targetCount) {
            tracking.currentStep++;
            
            if (tracking.currentStep < tracking.stepTargets.length) {
                var buildingObj = Game.Objects[this.targetBuilding];
                if (buildingObj) {
                    tracking.stepStartCounts[tracking.currentStep] = buildingObj.amount;
                }
            }
        }
    };
    
    PatternAltarsPuzzle.prototype.resetSequence = function() {
        var tracking = this.getTracking();
        tracking.currentStep = 0;
        tracking.stepStartCounts = [];
        tracking.sequenceComplete = false;
        
        var buildingObj = Game.Objects[this.targetBuilding];
        if (buildingObj) {
            tracking.initialTempleCount = buildingObj.amount;
            tracking.stepStartCounts[0] = buildingObj.amount;
        }
        
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            tracking.initialBuildingCounts[building.name] = building.amount;
        }
    };
    
    PatternAltarsPuzzle.prototype.hookTempleBuySell = function() {
        var templeObj = Game.Objects[this.targetBuilding];
        if (!templeObj) {
            return;
        }
        
        var self = this;
        var hookKey = '_originalBuy' + this.puzzleId;
        var sellHookKey = '_originalSell' + this.puzzleId;
        
        if (!templeObj[hookKey]) {
            templeObj[hookKey] = templeObj.buy;
            templeObj[sellHookKey] = templeObj.sell;
            
            var originalBuy = templeObj[hookKey];
            var originalSell = templeObj[sellHookKey];
            
            templeObj.buy = function(amount) {
                var result = originalBuy.call(this, amount);
                setTimeout(function() {
                    self.onCheck();
                }, 0);
                return result;
            };
            
            templeObj.sell = function(amount, bypass) {
                var result = originalSell.call(this, amount, bypass);
                setTimeout(function() {
                    self.onCheck();
                }, 0);
                return result;
            };
        }
    };
    
    function InfiltrationProgressPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'infiltrationTracking');
    }
    InfiltrationProgressPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    InfiltrationProgressPuzzle.prototype.constructor = InfiltrationProgressPuzzle;
    
    InfiltrationProgressPuzzle.prototype.initializeTracking = function() {
        return {
            toggleSequence: [],
            startTime: null,
            lastState: 'OFF',
            requiredSequence: ['ON', 'OFF', 'ON', 'OFF', 'ON', 'OFF'],
            completed: false
        };
    };
    
    InfiltrationProgressPuzzle.prototype.onSetup = function() {
        var self = this;
        var tracking = this.getTracking();
        var originalGoldenSwitchOff = Game.Upgrades['Golden switch [off]'];
        if (originalGoldenSwitchOff && originalGoldenSwitchOff.buy) {
            tracking.originalGoldenOffBuy = originalGoldenSwitchOff.buy;
            originalGoldenSwitchOff.buy = function() {
                var result = tracking.originalGoldenOffBuy.call(this);
                if (result) {
                    setTimeout(function() { self.checkToggle('ON'); }, 0);
                }
                return result;
            };
        }
        
        var originalGoldenSwitchOn = Game.Upgrades['Golden switch [on]'];
        if (originalGoldenSwitchOn && originalGoldenSwitchOn.buy) {
            tracking.originalGoldenOnBuy = originalGoldenSwitchOn.buy;
            originalGoldenSwitchOn.buy = function() {
                var result = tracking.originalGoldenOnBuy.call(this);
                if (result) {
                    setTimeout(function() { self.checkToggle('OFF'); }, 0);
                }
                return result;
            };
        }
    };
    
    InfiltrationProgressPuzzle.prototype.checkToggle = function(toggledTo) {
        if (!this.isValid()) return;
        
        var tracking = this.getTracking();
        
        // Guard against double completion from queued setTimeout calls
        if (tracking.completed) {
            return;
        }
        
        if (tracking.lastState === toggledTo) return;
        
        var now = Date.now();
        if (tracking.startTime !== null && (now - tracking.startTime) > 60000) {
            this.resetSequence();
            return;
        }
        
        tracking.toggleSequence.push(toggledTo);
        tracking.lastState = toggledTo;
        
        if (toggledTo === 'ON' && tracking.startTime === null) {
            tracking.startTime = now;
        }
        
        if (tracking.toggleSequence.length === tracking.requiredSequence.length) {
            var matches = true;
            for (var i = 0; i < tracking.requiredSequence.length; i++) {
                if (tracking.toggleSequence[i] !== tracking.requiredSequence[i]) {
                    matches = false;
                    break;
                }
            }
            
            if (matches && tracking.lastState === 'OFF') {
                tracking.completed = true;
                this.complete();
            } else {
                this.resetSequence();
            }
        } else if (tracking.toggleSequence.length > tracking.requiredSequence.length) {
            this.resetSequence();
        } else {
            for (var i = 0; i < tracking.toggleSequence.length; i++) {
                if (tracking.toggleSequence[i] !== tracking.requiredSequence[i]) {
                    this.resetSequence();
                    break;
                }
            }
        }
    };
    
    InfiltrationProgressPuzzle.prototype.onCheck = function() {
        // Check happens in toggle hooks
    };
    
    InfiltrationProgressPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (tracking && tracking.originalGoldenOffBuy) {
            var goldenSwitchOff = Game.Upgrades['Golden switch [off]'];
            if (goldenSwitchOff) goldenSwitchOff.buy = tracking.originalGoldenOffBuy;
        }
        if (tracking && tracking.originalGoldenOnBuy) {
            var goldenSwitchOn = Game.Upgrades['Golden switch [on]'];
            if (goldenSwitchOn) goldenSwitchOn.buy = tracking.originalGoldenOnBuy;
        }
    };
    
    function RiteNineFlamesPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'nineFlamesTracking');
    }
    RiteNineFlamesPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    RiteNineFlamesPuzzle.prototype.constructor = RiteNineFlamesPuzzle;
    
    RiteNineFlamesPuzzle.prototype.initializeTracking = function() {
        return {
            currentStep: 0,
            sequence: [
                { auras: [4, 7], type: 'pair' },
                { auras: [5, 11], type: 'pair' },
                { auras: [17, 9], type: 'pair' },
                { auras: [18, 20], type: 'pair' },
                { auras: [16, 21], type: 'pair' },
                { auras: [18, 13], type: 'pair' },
                { auras: [12], type: 'solo' },
                { auras: [6, 16], type: 'pair' },
                { auras: [0, 0], type: 'remove_all' }
            ],
            lastStepAuras: [],
            stepCompleted: false,
            hooked: false,
            _originalDragonAura: 0,
            _originalDragonAura2: 0
        };
    };
    
    RiteNineFlamesPuzzle.prototype.onSetup = function() {
        this.hookDragonAuras();
    };
    
    RiteNineFlamesPuzzle.prototype.hookDragonAuras = function() {
        var tracking = this.getTracking();
        if (tracking.hooked) return;
        var self = this;
        
        // Restore original functions first if they exist (in case of cleanup/rehook)
        if (Game._originalSelectDragonAura) {
            Game.SelectDragonAura = Game._originalSelectDragonAura;
            delete Game._originalSelectDragonAura;
        }
        if (Game._originalSetDragonAura) {
            Game.SetDragonAura = Game._originalSetDragonAura;
            delete Game._originalSetDragonAura;
        }
        if (Game._originalUpgradeDragon) {
            Game.UpgradeDragon = Game._originalUpgradeDragon;
            delete Game._originalUpgradeDragon;
        }
        
        // Capture current auras when hooking (not at initialization)
        var originalDragonAura = Game.dragonAura || 0;
        var originalDragonAura2 = Game.dragonAura2 || 0;
        tracking._originalDragonAura = originalDragonAura;
        tracking._originalDragonAura2 = originalDragonAura2;
        
        // Use property overrides to detect ALL changes to dragon auras
        // Store references to current aura values so cleanup can access them
        tracking._currentDragonAura = originalDragonAura;
        tracking._currentDragonAura2 = originalDragonAura2;
        
        Object.defineProperty(Game, 'dragonAura', {
            get: function() { return originalDragonAura; },
            set: function(value) {
                originalDragonAura = value;
                tracking._currentDragonAura = value;
                if (self.isValid()) {
                    self.checkAuraChange(0, value);
                }
            },
            configurable: true
        });
        
        Object.defineProperty(Game, 'dragonAura2', {
            get: function() { return originalDragonAura2; },
            set: function(value) {
                originalDragonAura2 = value;
                tracking._currentDragonAura2 = value;
                if (self.isValid()) {
                    self.checkAuraChange(1, value);
                }
            },
            configurable: true
        });
        
        tracking.hooked = true;
    };
    
    RiteNineFlamesPuzzle.prototype.checkAuraChange = function(changedSlot, changedAura) {
        var tracking = this.getTracking();
        if (!tracking) return;
        var currentAura1 = Game.dragonAura || 0;
        var currentAura2 = Game.dragonAura2 || 0;
        var currentAuras = [currentAura1, currentAura2];
        if (tracking.currentStep < tracking.sequence.length) {
            var currentStep = tracking.sequence[tracking.currentStep];
            var stepCompleted = false;
            if (currentStep.type === 'solo') {
                var hasRequiredAura = currentStep.auras.some(function(aura) { return currentAuras.includes(aura); });
                var hasOnlyOneAura = currentAuras.filter(function(aura) { return aura !== 0; }).length === 1;
                stepCompleted = hasRequiredAura && hasOnlyOneAura;
            } else if (currentStep.type === 'pair') {
                var hasBothRequiredAuras = currentStep.auras.every(function(aura) { return currentAuras.includes(aura); });
                var hasOnlyRequiredAuras = currentAuras.filter(function(aura) { return aura !== 0; }).length === currentStep.auras.length;
                stepCompleted = hasBothRequiredAuras && hasOnlyRequiredAuras;
            } else if (currentStep.type === 'remove_all') {
                stepCompleted = currentAuras.every(function(aura) { return aura === 0; });
            }
            if (stepCompleted && !tracking.stepCompleted) {
                tracking.stepCompleted = true;
                tracking.lastStepAuras = currentStep.auras.slice();
                if (tracking.currentStep === tracking.sequence.length - 1) {
                    this.complete();
                } else {
                    tracking.currentStep++;
                    tracking.stepCompleted = false;
                    tracking.lastStepAuras = [];
                }
                return;
            }
            if (!tracking.stepCompleted && changedSlot !== undefined && changedAura !== undefined) {
                var isChangedAuraRequired = currentStep.auras.includes(changedAura);
                var isChangedAuraEmpty = changedAura === 0;
                if (!isChangedAuraRequired && !isChangedAuraEmpty) {
                    this.resetSequence();
                }
            }
        }
    };
    
    RiteNineFlamesPuzzle.prototype.resetSequence = function() {
        var tracking = this.getTracking();
        tracking.currentStep = 0;
        tracking.stepCompleted = false;
        tracking.lastStepAuras = [];
    };
    
    RiteNineFlamesPuzzle.prototype.onCheck = function() {
        // Check happens when aura-setting functions are called
    };
    
    RiteNineFlamesPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        // Get current values before removing property overrides
        var currentAura1 = tracking && tracking._currentDragonAura !== undefined ? tracking._currentDragonAura : (tracking && tracking._originalDragonAura !== undefined ? tracking._originalDragonAura : 0);
        var currentAura2 = tracking && tracking._currentDragonAura2 !== undefined ? tracking._currentDragonAura2 : (tracking && tracking._originalDragonAura2 !== undefined ? tracking._originalDragonAura2 : 0);
        
        // Remove our property overrides
        if (Game.dragonAura !== undefined && Object.getOwnPropertyDescriptor(Game, 'dragonAura')) {
            delete Game.dragonAura;
            // Restore as normal writable property with current value
            Game.dragonAura = currentAura1;
        }
        if (Game.dragonAura2 !== undefined && Object.getOwnPropertyDescriptor(Game, 'dragonAura2')) {
            delete Game.dragonAura2;
            // Restore as normal writable property with current value
            Game.dragonAura2 = currentAura2;
        }
    };
    
    function StormDevotionPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'stormTracking');
    }
    StormDevotionPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    StormDevotionPuzzle.prototype.constructor = StormDevotionPuzzle;
    
    StormDevotionPuzzle.prototype.initializeTracking = function() {
        return {
            stormActive: false,
            wrinklersPoppedDuringStorm: 0,
            stormCookiesClicked: 0,
            stormStartTime: 0,
            previousWrinklerStates: {},
            originalPopFunc: null,
            completed: false
        };
    };
    
    StormDevotionPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('logic', function() { self.check(); }, 'Check storm devotion');
        this.hookStormCookieTracking();
    };
    
    StormDevotionPuzzle.prototype.hookStormCookieTracking = function() {
        var self = this;
        var tracking = this.getTracking();
        if (Game.shimmerTypes && Game.shimmerTypes['golden'] && !Game.shimmerTypes['golden']._stormTrackingHooked) {
            tracking.originalPopFunc = Game.shimmerTypes['golden'].popFunc;
            Game.shimmerTypes['golden'].popFunc = function(me) {
                if (self.isValid() && self.getTracking() && self.getTracking().stormActive) {
                    if (me.force === 'cookie storm drop' || (Game.hasBuff('Cookie storm') && me.forceObj && me.forceObj.type === 'cookie storm drop')) {
                        self.getTracking().stormCookiesClicked++;
                    }
                }
                return tracking.originalPopFunc.call(this, me);
            };
            Game.shimmerTypes['golden']._stormTrackingHooked = true;
        }
    };
    
    StormDevotionPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        if (!tracking) return;
        var stormActive = Game.hasBuff('Cookie storm');
        if (stormActive && !tracking.stormActive) {
            tracking.stormActive = true;
            tracking.stormStartTime = Date.now();
            tracking.wrinklersPoppedDuringStorm = 0;
            tracking.stormCookiesClicked = 0;
            tracking.previousWrinklerStates = {};
        }
        if (!stormActive && tracking.stormActive) {
            tracking.stormActive = false;
            if (tracking.wrinklersPoppedDuringStorm >= 4 && tracking.stormCookiesClicked === 0 && !tracking.completed) {
                tracking.completed = true;
                this.complete();
            }
            tracking.wrinklersPoppedDuringStorm = 0;
            tracking.stormCookiesClicked = 0;
            tracking.previousWrinklerStates = {};
        }
        if (!stormActive && !tracking.stormActive) {
            if (tracking.wrinklersPoppedDuringStorm > 0 || tracking.stormCookiesClicked > 0) {
                tracking.wrinklersPoppedDuringStorm = 0;
                tracking.stormCookiesClicked = 0;
                tracking.previousWrinklerStates = {};
            }
        }
        if (stormActive && Game.wrinklers) {
            for (var i in Game.wrinklers) {
                var me = Game.wrinklers[i];
                var prevState = tracking.previousWrinklerStates[i];
                if (prevState && prevState.phase > 0 && me.phase == 0) {
                    tracking.wrinklersPoppedDuringStorm++;
                }
                if (me) {
                    tracking.previousWrinklerStates[i] = { phase: me.phase, sucked: me.sucked };
                }
            }
        }
    };
    
    StormDevotionPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (tracking) {
            tracking.stormActive = false;
            tracking.wrinklersPoppedDuringStorm = 0;
            tracking.stormCookiesClicked = 0;
            tracking.stormStartTime = 0;
            tracking.previousWrinklerStates = {};
            // Restore original shimmer popFunc
            if (tracking.originalPopFunc && Game.shimmerTypes && Game.shimmerTypes['golden']) {
                Game.shimmerTypes['golden'].popFunc = tracking.originalPopFunc;
            }
        }
        if (Game.shimmerTypes && Game.shimmerTypes['golden'] && Game.shimmerTypes['golden']._stormTrackingHooked) {
            delete Game.shimmerTypes['golden']._stormTrackingHooked;
        }
    };
    
    function LitanyBrokenVowsPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'litanyTracking');
    }
    LitanyBrokenVowsPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    LitanyBrokenVowsPuzzle.prototype.constructor = LitanyBrokenVowsPuzzle;
    
    LitanyBrokenVowsPuzzle.prototype.initializeTracking = function() {
        return {
            elderCovenantToggles: 0, goldenSwitchOn: false, shimmeringVeilOn: false,
            seasonSequence: [], lastSeason: Game.season || '',
            lastElderCovenantState: Game.Has('Elder Covenant'),
            lastRevokeElderCovenantState: Game.Has('Revoke Elder Covenant'),
            lastGoldenSwitchState: Game.Has('Golden switch [off]'),
            lastShimmeringVeilState: Game.Has('Shimmering veil [off]'),
            currentStep: 1, stepCompleted: [false, false, false, false],
            originalElderCovenantBuy: null,
            originalRevokeBuy: null,
            originalGoldenOffBuy: null,
            originalGoldenOnBuy: null,
            originalShimmeringOffBuy: null,
            originalShimmeringOnBuy: null,
            completed: false
        };
    };
    
    LitanyBrokenVowsPuzzle.prototype.resetSequence = function() {
        var tracking = this.getTracking();
        tracking.elderCovenantToggles = 0;
        tracking.goldenSwitchOn = false;
        tracking.shimmeringVeilOn = false;
        tracking.seasonSequence = [];
        tracking.lastSeason = Game.season || '';
        tracking.currentStep = 1;
        tracking.stepCompleted = [false, false, false, false];
        tracking.lastElderCovenantState = Game.Has('Elder Covenant');
        tracking.lastRevokeElderCovenantState = Game.Has('Revoke Elder Covenant');
        tracking.lastGoldenSwitchState = Game.Has('Golden switch [off]');
        tracking.lastShimmeringVeilState = Game.Has('Shimmering veil [off]');
    };
    
    LitanyBrokenVowsPuzzle.prototype.onSetup = function() {
        var self = this;
        var tracking = this.getTracking();
        var originalElderCovenant = Game.Upgrades['Elder Covenant'];
        if (originalElderCovenant && originalElderCovenant.buy && !originalElderCovenant.__cookieAgeLitanyWrapped) {
            originalElderCovenant.__cookieAgeLitanyWrapped = true;
            if (!originalElderCovenant.__cookieAgeLitanyOriginalBuy) {
                originalElderCovenant.__cookieAgeLitanyOriginalBuy = originalElderCovenant.buy;
            }
            tracking.originalElderCovenantBuy = originalElderCovenant.buy;
            originalElderCovenant.buy = function() {
                var result = (originalElderCovenant.__cookieAgeLitanyOriginalBuy || tracking.originalElderCovenantBuy).call(this);
                if (result) setTimeout(function() { self.check(); }, 0);
                return result;
            };
        }
        var originalRevokeElderCovenant = Game.Upgrades['Revoke Elder Covenant'];
        if (originalRevokeElderCovenant && originalRevokeElderCovenant.buy && !originalRevokeElderCovenant.__cookieAgeLitanyWrapped) {
            originalRevokeElderCovenant.__cookieAgeLitanyWrapped = true;
            if (!originalRevokeElderCovenant.__cookieAgeLitanyOriginalBuy) {
                originalRevokeElderCovenant.__cookieAgeLitanyOriginalBuy = originalRevokeElderCovenant.buy;
            }
            tracking.originalRevokeBuy = originalRevokeElderCovenant.buy;
            originalRevokeElderCovenant.buy = function() {
                var result = (originalRevokeElderCovenant.__cookieAgeLitanyOriginalBuy || tracking.originalRevokeBuy).call(this);
                if (result) {
                    if (self.getTracking()) self.getTracking().elderCovenantToggles++;
                    setTimeout(function() { self.check(); }, 0);
                }
                return result;
            };
        }
        var originalGoldenSwitchOff = Game.Upgrades['Golden switch [off]'];
        if (originalGoldenSwitchOff && originalGoldenSwitchOff.buy && !originalGoldenSwitchOff.__cookieAgeLitanyWrapped) {
            originalGoldenSwitchOff.__cookieAgeLitanyWrapped = true;
            if (!originalGoldenSwitchOff.__cookieAgeLitanyOriginalBuy) {
                originalGoldenSwitchOff.__cookieAgeLitanyOriginalBuy = originalGoldenSwitchOff.buy;
            }
            tracking.originalGoldenOffBuy = originalGoldenSwitchOff.buy;
            originalGoldenSwitchOff.buy = function() {
                var result = (originalGoldenSwitchOff.__cookieAgeLitanyOriginalBuy || tracking.originalGoldenOffBuy).call(this);
                if (result) setTimeout(function() { self.check(); }, 0);
                return result;
            };
        }
        var originalGoldenSwitchOn = Game.Upgrades['Golden switch [on]'];
        if (originalGoldenSwitchOn && originalGoldenSwitchOn.buy && !originalGoldenSwitchOn.__cookieAgeLitanyWrapped) {
            originalGoldenSwitchOn.__cookieAgeLitanyWrapped = true;
            if (!originalGoldenSwitchOn.__cookieAgeLitanyOriginalBuy) {
                originalGoldenSwitchOn.__cookieAgeLitanyOriginalBuy = originalGoldenSwitchOn.buy;
            }
            tracking.originalGoldenOnBuy = originalGoldenSwitchOn.buy;
            originalGoldenSwitchOn.buy = function() {
                var result = (originalGoldenSwitchOn.__cookieAgeLitanyOriginalBuy || tracking.originalGoldenOnBuy).call(this);
                if (result) setTimeout(function() { self.check(); }, 0);
                return result;
            };
        }
        var originalShimmeringVeilOff = Game.Upgrades['Shimmering veil [off]'];
        if (originalShimmeringVeilOff && originalShimmeringVeilOff.buy) {
            tracking.originalShimmeringOffBuy = originalShimmeringVeilOff.buy;
            originalShimmeringVeilOff.buy = function() {
                var result = tracking.originalShimmeringOffBuy.call(this);
                if (result) setTimeout(function() { self.check(); }, 0);
                return result;
            };
        }
        var originalShimmeringVeilOn = Game.Upgrades['Shimmering veil [on]'];
        if (originalShimmeringVeilOn && originalShimmeringVeilOn.buy) {
            tracking.originalShimmeringOnBuy = originalShimmeringVeilOn.buy;
            originalShimmeringVeilOn.buy = function() {
                var result = tracking.originalShimmeringOnBuy.call(this);
                if (result) setTimeout(function() { self.check(); }, 0);
                return result;
            };
        }
        var seasonObj = Game.season;
        Object.defineProperty(Game, 'season', {
            get: function() { return seasonObj; },
            set: function(value) {
                seasonObj = value;
                setTimeout(function() { self.check(); }, 0);
            },
            configurable: true
        });
    };
    
    LitanyBrokenVowsPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        if (!tracking) return;
        var currentElderCovenantState = Game.Has('Elder Covenant');
        var currentRevokeElderCovenantState = Game.Has('Revoke Elder Covenant');
        var elderCovenantActive = currentElderCovenantState;
        var currentActiveState = elderCovenantActive ? 'Elder Covenant' : 'Revoke Elder Covenant';
        var lastActiveState = tracking.lastElderCovenantState ? 'Elder Covenant' : 'Revoke Elder Covenant';
        if (currentActiveState !== lastActiveState) {
            tracking.elderCovenantToggles++;
            tracking.lastElderCovenantState = elderCovenantActive;
        }
        tracking.goldenSwitchOn = Game.Has('Golden switch [off]');
        tracking.shimmeringVeilOn = Game.Has('Shimmering veil [off]');
        var currentSeason = Game.season || '';
        if (currentSeason !== tracking.lastSeason && currentSeason !== '') {
            tracking.seasonSequence.push(currentSeason);
            tracking.lastSeason = currentSeason;
        }
        var elderCovenantComplete = tracking.elderCovenantToggles >= 3 && currentRevokeElderCovenantState;
        var goldenSwitchComplete = tracking.goldenSwitchOn;
        var shimmeringVeilComplete = tracking.shimmeringVeilOn;
        var requiredSeasonSequence = ['valentines', 'fools', 'easter', 'halloween', 'christmas'];
        var seasonSequenceComplete = false;
        if (tracking.seasonSequence.length >= requiredSeasonSequence.length) {
            var matches = true;
            for (var i = 0; i < requiredSeasonSequence.length; i++) {
                if (tracking.seasonSequence[i] !== requiredSeasonSequence[i]) {
                    matches = false;
                    break;
                }
            }
            seasonSequenceComplete = matches;
        }
        var stepConditions = [elderCovenantComplete, goldenSwitchComplete, shimmeringVeilComplete, seasonSequenceComplete];
        if (!tracking.stepCompleted[0]) {
            if (goldenSwitchComplete || shimmeringVeilComplete) {
                this.resetSequence();
                return;
            }
        }
        if (!tracking.stepCompleted[0] || !tracking.stepCompleted[1] || !tracking.stepCompleted[2]) {
            if (tracking.seasonSequence.length > 0) {
                this.resetSequence();
                return;
            }
        }
        for (var i = 0; i < stepConditions.length; i++) {
            if (stepConditions[i] && !tracking.stepCompleted[i]) {
                var previousStepsComplete = true;
                for (var j = 0; j < i; j++) {
                    if (!tracking.stepCompleted[j]) {
                        previousStepsComplete = false;
                        break;
                    }
                }
                if (previousStepsComplete) {
                    tracking.stepCompleted[i] = true;
                    tracking.currentStep = Math.max(tracking.currentStep, i + 2);
                }
            }
        }
        if (elderCovenantComplete && goldenSwitchComplete && shimmeringVeilComplete && seasonSequenceComplete) {
            if (!tracking.completed) {
                tracking.completed = true;
                this.complete();
            }
        }
    };
    
    LitanyBrokenVowsPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (!tracking) return;
        if (tracking.originalElderCovenantBuy) {
            var elderCovenant = Game.Upgrades['Elder Covenant'];
            if (elderCovenant) elderCovenant.buy = tracking.originalElderCovenantBuy;
        }
        if (tracking.originalRevokeBuy) {
            var revokeElderCovenant = Game.Upgrades['Revoke Elder Covenant'];
            if (revokeElderCovenant) revokeElderCovenant.buy = tracking.originalRevokeBuy;
        }
        if (tracking.originalGoldenOffBuy) {
            var goldenSwitchOff = Game.Upgrades['Golden switch [off]'];
            if (goldenSwitchOff) goldenSwitchOff.buy = tracking.originalGoldenOffBuy;
        }
        if (tracking.originalGoldenOnBuy) {
            var goldenSwitchOn = Game.Upgrades['Golden switch [on]'];
            if (goldenSwitchOn) goldenSwitchOn.buy = tracking.originalGoldenOnBuy;
        }
        if (tracking.originalShimmeringOffBuy) {
            var shimmeringVeilOff = Game.Upgrades['Shimmering veil [off]'];
            if (shimmeringVeilOff) shimmeringVeilOff.buy = tracking.originalShimmeringOffBuy;
        }
        if (tracking.originalShimmeringOnBuy) {
            var shimmeringVeilOn = Game.Upgrades['Shimmering veil [on]'];
            if (shimmeringVeilOn) shimmeringVeilOn.buy = tracking.originalShimmeringOnBuy;
        }
        // Restore season property to its default writable state
        Object.defineProperty(Game, 'season', {
            value: Game.season,
            writable: true,
            configurable: true
        });
    };
    
    function WatchKeeperRoundsPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'watchKeeperRoundsTracking');
    }
    WatchKeeperRoundsPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    WatchKeeperRoundsPuzzle.prototype.constructor = WatchKeeperRoundsPuzzle;
    
    WatchKeeperRoundsPuzzle.prototype.initializeTracking = function() {
        return { 
            // Clock positions: filled=1,2,7,11 → indexes 5,4,11,7
            // Clock positions: empty=3,4,5,6,8,9,10,12 → indexes 3,2,1,0,10,9,8,6
            expectedPattern: { filled: [4, 5, 7, 11], empty: [0, 1, 2, 3, 6, 8, 9, 10] },
            completed: false
        };
    };
    
    WatchKeeperRoundsPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() { self.check(); }, 'Check watch keeper rounds');
        Game.attachTooltip(l('heralds'),function(){
            var str='';
            if (!App && !Game.externalDataLoaded) str+=loc("Heralds couldn't be loaded. There may be an issue with our servers, or you are playing the game locally.");
            else {
                if (!App && Game.heralds==0) str+=loc("There are no heralds at the moment. Please consider <b style=\"color:#bc3aff;\">donating to our Patreon</b>!");
                else {
                    str+='<b style="color:#bc3aff;text-shadow:0px 1px 0px #6d0096;">'+loc("%1 herald",Game.heralds)+'</b> '+loc("selflessly inspiring a boost in production for everyone, resulting in %1.",'<br><b style="color:#cdaa89;text-shadow:0px 1px 0px #7c4532,0px 0px 6px #7c4532;"><div style="width:16px;height:16px;display:inline-block;vertical-align:middle;background:url(img/money.png);"></div>'+loc("+%1% cookies per second",Game.heralds)+'</b>');
                    str+='<div class="line"></div>';
                    if (Game.ascensionMode==1) str+=loc("You are in a <b>Born again</b> run, and are not currently benefiting from heralds.");
                    else if (Game.Has('Heralds')) str+=loc("You own the <b>Heralds</b> upgrade, and therefore benefit from the production boost.");
                    else str+=loc("To benefit from the herald bonus, you need a special upgrade you do not yet own. You will permanently unlock it later in the game.");
                }
            }
            str+='<div class="line"></div><span style="font-size:90%;opacity:0.6;"><b style="color: #ffaa00;">The Herald\'s hold an urgent message for you</b><br><q>Twelve lamp posts circle the yard, each bearing its flame.<br>When the first bell tolls, begin at the first and snuff every sixth lamp you encounter.<br>When the second bell sounds, start your rounds again, take every fifth one.<br>At the third bell walk your route and snuff the life from every fourth lamp.<br>When the final bell tolls, extinguish every third lamp you pass.<br>When the bells fall silent, keep the lamps that still burn, those are the beacons the Watchmaster trusts.<br>Walk the dark arcs between them. He will count, nod, and pass you by.</q></span><div class="line"></div>'+tinyIcon([21,29]);
            str+='<div style="width:31px;height:39px;background:url(img/heraldFlag.png);position:absolute;top:0px;left:8px;"></div><div style="width:31px;height:39px;background:url(img/heraldFlag.png);position:absolute;top:0px;right:8px;"></div>';
            return '<div style="padding:8px;width:300px;text-align:center;" class="prompt" id="tooltipHeralds"><h3>'+loc("Heralds")+'</h3><div class="block">'+str+'</div></div>';
        },'this');
    };
    
    WatchKeeperRoundsPuzzle.prototype.onCheck = function() {
        if (!Game.wrinklers || Game.wrinklers.length < 12) return;
        var tracking = this.getTracking();
        var patternMatches = true;
        for (var i = 0; i < tracking.expectedPattern.filled.length; i++) {
            if (Game.wrinklers[tracking.expectedPattern.filled[i]].close !== 1) {
                patternMatches = false;
                break;
            }
        }
        if (patternMatches) {
            for (var i = 0; i < tracking.expectedPattern.empty.length; i++) {
                if (Game.wrinklers[tracking.expectedPattern.empty[i]].close === 1) {
                    patternMatches = false;
                    break;
                }
            }
        }
        if (patternMatches) {
            var tracking = this.getTracking();
            if (!tracking.completed) {
                tracking.completed = true;
                this.complete();
            }
        }
    };
    
    WatchKeeperRoundsPuzzle.prototype.onCleanup = function() {
        Game.attachTooltip(l('heralds'),function(){
            var str='';
            if (!App && !Game.externalDataLoaded) str+=loc("Heralds couldn't be loaded. There may be an issue with our servers, or you are playing the game locally.");
            else {
                if (!App && Game.heralds==0) str+=loc("There are no heralds at the moment. Please consider <b style=\"color:#bc3aff;\">donating to our Patreon</b>!");
                else {
                    str+='<b style="color:#bc3aff;text-shadow:0px 1px 0px #6d0096;">'+loc("%1 herald",Game.heralds)+'</b> '+loc("selflessly inspiring a boost in production for everyone, resulting in %1.",'<br><b style="color:#cdaa89;text-shadow:0px 1px 0px #7c4532,0px 0px 6px #7c4532;"><div style="width:16px;height:16px;display:inline-block;vertical-align:middle;background:url(img/money.png);"></div>'+loc("+%1% cookies per second",Game.heralds)+'</b>');
                    str+='<div class="line"></div>';
                    if (Game.ascensionMode==1) str+=loc("You are in a <b>Born again</b> run, and are not currently benefiting from heralds.");
                    else if (Game.Has('Heralds')) str+=loc("You own the <b>Heralds</b> upgrade, and therefore benefit from the production boost.");
                    else str+=loc("To benefit from the herald bonus, you need a special upgrade you do not yet own. You will permanently unlock it later in the game.");
                }
            }
            str+='<div class="line"></div><span style="font-size:90%;opacity:0.6;">'+(!App?loc("<b>Heralds</b> are people who have donated to our highest Patreon tier, and are limited to 100.<br>Each herald gives everyone +1% CpS.<br>Heralds benefit everyone playing the game, regardless of whether you donated."):loc("Every %1 current players on Steam generates <b>1 herald</b>, up to %2 heralds.<br>Each herald gives everyone +1% CpS.",[100,100]))+'</span><div class="line"></div>'+tinyIcon([21,29]);
            str+='<div style="width:31px;height:39px;background:url(img/heraldFlag.png);position:absolute;top:0px;left:8px;"></div><div style="width:31px;height:39px;background:url(img/heraldFlag.png);position:absolute;top:0px;right:8px;"></div>';
            return '<div style="padding:8px;width:300px;text-align:center;" class="prompt" id="tooltipHeralds"><h3>'+loc("Heralds")+'</h3><div class="block">'+str+'</div></div>';
        },'this');
    };
    
    function LoyaltyTestPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'loyaltyTestTracking');
    }
    LoyaltyTestPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    LoyaltyTestPuzzle.prototype.constructor = LoyaltyTestPuzzle;
    
    LoyaltyTestPuzzle.prototype.initializeTracking = function() {
        return { 
            originalDesc: null, 
            originalDdesc: null,
            completed: false
        };
    };
    
    LoyaltyTestPuzzle.prototype.onSetup = function() {
        var self = this;
        var fledglingBakery = Game.Achievements['Fledgling bakery'];
        if (fledglingBakery) {
            var tracking = this.getTracking();
            tracking.originalDesc = fledglingBakery.desc;
            tracking.originalDdesc = fledglingBakery.ddesc;
            var newDesc = 'Bake <b>1 million cookies</b> in one ascension.<q>Surely you would have noticed this before right?</q><br><br><div style="text-align:center;margin:8px 0;width:100%;"><img src="https://raw.githubusercontent.com/dfsw/Cookies/main/cube.png" style="max-width:340px;width:100%;height:auto;" alt=""></div>';
            fledglingBakery.desc = newDesc;
            fledglingBakery.ddesc = newDesc;
        }
        this.registerHook('check', function() { self.check(); }, 'Check loyalty test');
    };
    
    LoyaltyTestPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        if (tracking.completed) {
            return;
        }
        
        var name = Game.bakeryName.toLowerCase();
        if (name.includes('quinzy')) {
            tracking.completed = true;
            this.complete();
        }
    };
    
    LoyaltyTestPuzzle.prototype.onCleanup = function() {
        var fledglingBakery = Game.Achievements['Fledgling bakery'];
        var tracking = this.getTracking();
        if (fledglingBakery && tracking && tracking.originalDesc && tracking.originalDdesc) {
            fledglingBakery.desc = tracking.originalDesc;
            fledglingBakery.ddesc = tracking.originalDdesc;
        }
    };
    
    function RiseUpPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'riseUpTracking');
    }
    RiseUpPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    RiseUpPuzzle.prototype.constructor = RiseUpPuzzle;
    
    RiseUpPuzzle.prototype.initializeTracking = function() {
        return {
            originalPlayWrinklerSquishSound: null,
            originalPromptGiftRedeem: null,
            originalDrawWrinklers: null,
            giftRedemptionHookAdded: false,
            drawingHookAdded: false
        };
    };
    
    RiseUpPuzzle.prototype.onSetup = function() {
        var self = this;
        var tracking = this.getTracking();
        if (Game.playWrinklerSquishSound && !tracking.originalPlayWrinklerSquishSound) {
            tracking.originalPlayWrinklerSquishSound = Game.playWrinklerSquishSound;
        }
        if (typeof Game.promptGiftRedeem === 'function' && !tracking.giftRedemptionHookAdded) {
            tracking.originalPromptGiftRedeem = Game.promptGiftRedeem;
            Game.promptGiftRedeem = function() {
                if (!(Game.Has('Wrapping paper') || Game.hasBuff('Gifted out') || Game.ascensionMode != 0) || Game.cookies < 1000000000) return false;
                Game.Prompt('<id GiftRedeem><h3>'+loc("Redeem a gift")+'</h3><div class="block" style="font-size:11px;">'+tinyIcon([34,6])+'<div class="line"></div><input id="giftCode" type="text" style="width:100%;text-align:center;padding:4px 8px;box-sizing:border-box;margin:8px 3px;" value="" placeholder="'+loc("paste code...")+'"/><div class="optionBox" style="margin:4px;"><a class="option smallFancyButton disabled" style="width:auto;text-align:center;" id="promptOption0">'+loc("Redeem")+'</a></div><div id="giftError" class="warning" style="height:24px;"></div><div style="opacity:0.7;">'+loc("Once you redeem a gift, you will have to wait an hour before you can redeem another. Your game will save after redeeming.")+'</div></div>',[[loc("Cancel"),0,'float:right']]);
                l('giftCode').focus();
                l('giftCode').select();
                var checkCode = function(str) {
                    if (str && str.toLowerCase().trim() === 'secret') {
                        return { cookies: 0, message: 'Secret code detected!', icon: Game.giftBoxDesigns[0], isSecret: true };
                    }
                    var out = { cookies: 1, message: false, icon: Game.giftBoxDesigns[0] };
                    str = b64_to_utf8(str);
                    if (!str) return false;
                    str = str.split('|');
                    if (str[0] !== 'MAIL') return false;
                    var val = parseInt(str[1] || 0);
                    if (Math.abs(Date.now() - val) > 1000 * 60 * 60 * 24 * 2) return -1;
                    val = parseInt(str[2] || 0);
                    if (val < 1) val = 1;
                    if (val > 1000) val = 1000;
                    val = val || 1;
                    out.cookies = val;
                    val = str[3] || 0;
                    if (val == '-') val = 0;
                    if (val) val = val.split(' ');
                    if (val.length != 2 || isNaN(val[0]) || isNaN(val[1])) val = 0;
                    if (val) val = [parseInt(val[0]), parseInt(val[1])];
                    if (val) out.icon = val;
                    val = (str[4] || '').split('\n').slice(0, 4);
                    for (var i = 0; i < val.length; i++) { val[i] = val[i].substring(0, 25); }
                    val = val.join('\n');
                    val = val.replace(/\/\$\//g, '|');
                    val = val.substring(0, 100);
                    if (val) out.message = val;
                    return out;
                };
                var inputCode = function() {
                    var val = l('giftCode').value;
                    if (val && val.length > 0) {
                        var out = checkCode(val);
                        if (out && out.isSecret) {
                            l('giftError').innerHTML = '';
                            l('promptOption0').classList.remove('disabled');
                            return;
                        } else if (out == -1) {
                            l('giftError').innerHTML = loc("Code expired.");
                            l('promptOption0').classList.add('disabled');
                        } else if (!out) {
                            l('giftError').innerHTML = loc("Invalid code.");
                            l('promptOption0').classList.add('disabled');
                        } else {
                            l('giftError').innerHTML = '';
                            l('promptOption0').classList.remove('disabled');
                        }
                    } else {
                        l('giftError').innerHTML = '';
                        l('promptOption0').classList.add('disabled');
                    }
                };
                l('giftCode').addEventListener('input', inputCode);
                l('giftCode').addEventListener('change', inputCode);
                l('giftCode').addEventListener('keyup', inputCode);
                l('giftCode').addEventListener('keyup', function(e) { if (e.keyCode != 13) { e.preventDefault(); e.stopPropagation(); } }, true);
                l('promptOption0').addEventListener('click', function(e) {
                    var val = l('giftCode').value;
                    var out = checkCode(val);
                    if (out && out.isSecret) {
                        self.complete();
                        Game.ClosePrompt();
                        return false;
                    }
                    if (out == -1) return false;
                    else if (!out) return false;
                    Game.toSave = true;
                    Game.gainBuff('gifted out', 60 * 60, 1);
                    Game.Win('No time like the present');
                    var icon = out.icon;
                    Game.Notify(loc("How nice!"), loc("Found <b>%1</b>!", loc("%1 cookie", LBeautify(out.cookies))), icon);
                    Game.Earn(out.cookies);
                    Game.cookiesReceived += out.cookies;
                    out.message = out.message ? (out.message.replace(/^\n|\n$/g, '')) : 0;
                    if (out.message.length == 0 || out.message == '\n' || out.message == ' ') out.message = 0;
                    PlaySound('snd/tick.mp3');
                    PlaySound('snd/giftGet.mp3');
                    Game.ClosePrompt();
                    Game.Prompt('<id GiftRedeemed><h3>'+loc("Redeem a gift")+'</h3><div class="block" style="font-size:11px;"><div id="giftWrapped" class="crate noFrame upgrade enabled pucker" style="background-position:'+(-icon[0]*48)+'px '+(-icon[1]*48)+'px;float:none;"></div><div class="line"></div><div style="font-weight:bold;">'+loc("Gift redeemed!<br>Inside, you find:")+'</div><div class="line"></div><div class="hasTinyCookie" style="display:inline-block;font-weight:bold;">'+loc("%1 cookie",LBeautify(out.cookies))+'</div>'+(out.message?('<div class="line"></div><div>'+loc("There\'s a note too!")+'</div><textarea id="giftMessage" spellcheck="false" style="color:#000;width:100%;height:64px;font-size:11px;font-weight:bold;padding:8px 16px;box-sizing:border-box;margin:0px 3px;text-align:center;background:url('+Game.resPath+'img/messageBG.png);background-position:center -50px;box-shadow:0px 0px 16px rgba(98,92,72,1) inset;text-shadow:0px 0px 2px rgba(98,92,72,1);overflow:hidden;" readonly></textarea>'):'')+'<div class="line"></div><div>'+loc("How nice!")+'</div></div>',[[loc("Done")]]);
                    Game.SparkleOn(l('giftWrapped'));
                    if (out.message) l('giftMessage').value = out.message;
                });
                return true;
            };
            tracking.giftRedemptionHookAdded = true;
        }
        
        // Load the notes sprite sheet
        loadNotesSpriteSheet();
        
        // Initialize robust audio system for musical tones
        initWrinklerAudioSystem();
        
        // Replace the wrinkler squish sound function with our musical version
        if (Game.playWrinklerSquishSound && tracking.originalPlayWrinklerSquishSound) {
            var self = this;
            Game.playWrinklerSquishSound = function() {
                // Check if rise_up puzzle is active
                var tracking = self.getTracking();
                if (self.isValid()) {
                    // Check if all 14 wrinklers are present and have close value of 1
                    var maxWrinklers = Game.getWrinklersMax();
                    var activeWrinklers = 0;
                    var allClose = true;
                    
                    for (var i in Game.wrinklers) {
                        if (Game.wrinklers[i].phase > 0) {
                            activeWrinklers++;
                            if (Game.wrinklers[i].close !== 1) {
                                allClose = false;
                            }
                        }
                    }
                    
                    // Only activate musical tones if all conditions are met
                    if (activeWrinklers >= 14 && allClose) {
                        // Find which wrinkler was clicked
                        var clickedWrinkler = null;
                        var clickedWrinklerId = -1;
                        
                        for (var i in Game.wrinklers) {
                            if (Game.wrinklers[i].selected && Game.wrinklers[i].phase > 0) {
                                clickedWrinkler = Game.wrinklers[i];
                                clickedWrinklerId = parseInt(i);
                                break;
                            }
                        }
                        
                        if (!clickedWrinkler) {
                            for (var i in Game.wrinklers) {
                                if (Game.wrinklers[i].phase > 0 && Game.wrinklers[i].hp > 0.5) {
                                    clickedWrinkler = Game.wrinklers[i];
                                    clickedWrinklerId = parseInt(i);
                                    break;
                                }
                            }
                        }
                        
                        if (clickedWrinkler && clickedWrinklerId >= 0 && clickedWrinkler.hp > 0.5) {
                            var wrinklerPosition = clickedWrinklerId;
                            
                            if (wrinklerPosition >= 0 && wrinklerPosition < 14) {
                                var frequency = WRINKLER_TONE_FREQUENCIES[wrinklerPosition];
                                var noteSprite = WRINKLER_NOTE_SPRITES[wrinklerPosition];
                                
                                var expectedNote = NOTE_SEQUENCE[currentSequenceIndex];
                                var shouldPlayWrongTone = (wrinklerPosition !== expectedNote && revealedLetters > 0);
                                
                                if (shouldPlayWrongTone) {
                                    playWrinklerTone(WRINKLER_TONE_FREQUENCIES[14], WRINKLER_TONE_DURATION);
                                } else {
                                    playWrinklerTone(frequency, WRINKLER_TONE_DURATION);
                                }
                                
                                createMusicalNoteParticle(clickedWrinkler.x, clickedWrinkler.y, noteSprite);
                                checkNoteSequence(wrinklerPosition);
                            }
                            return;
                        }
                    }
                }
                
                // Call original function for vanilla behavior
                if (tracking.originalPlayWrinklerSquishSound) {
                    tracking.originalPlayWrinklerSquishSound();
                }
            };
        }
        
        // Hook into the game's drawing system to update our custom particles
        if (!tracking.drawingHookAdded) {
            var originalDrawWrinklers = Game.DrawWrinklers;
            if (originalDrawWrinklers) {
                // Store original function for cleanup
                tracking.originalDrawWrinklers = originalDrawWrinklers;
                
                Game.DrawWrinklers = function() {
                    // Call original function first
                    originalDrawWrinklers.call(this);
                    
                    // Update message decay timer
                    updateMessageDecay();
                    
                    // Draw our custom musical note particles
                    updateMusicalNoteParticles();
                    
                    // Draw hidden message
                    drawHiddenMessage();
                };
                
                tracking.drawingHookAdded = true;
            }
        }
    };
    
    RiseUpPuzzle.prototype.onCheck = function() {
        // Check happens in gift redemption hook
    };
    
    RiseUpPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (tracking && tracking.originalPlayWrinklerSquishSound) {
            Game.playWrinklerSquishSound = tracking.originalPlayWrinklerSquishSound;
        }
        if (tracking && tracking.originalPromptGiftRedeem) {
            Game.promptGiftRedeem = tracking.originalPromptGiftRedeem;
        }
        if (tracking && tracking.originalDrawWrinklers) {
            Game.DrawWrinklers = tracking.originalDrawWrinklers;
        }
        // Clear any remaining musical note particles
        if (typeof musicalNoteParticles !== 'undefined') {
            musicalNoteParticles.length = 0;
        }
    };
    
    function DefeatEvilPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'defeatEvilTracking');
    }
    DefeatEvilPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    DefeatEvilPuzzle.prototype.constructor = DefeatEvilPuzzle;
    
    DefeatEvilPuzzle.prototype.initializeTracking = function() {
        return {
            sequence: [[5,3],[9,2],[9,6],[9,2],[0,5],[11,4],[0,9],[11,2],[8,4],[3,11],[5,3],[0,9],[0,5],[11,9],[11,2],[11,2],[5,3],[0,11],[6,8],[6,8],[9,3],[6,2],[0,11],[9,2],[3,7],[0,5],[11,8],[0,6],[9,7],[6,8],[0,5],[9,7],[0,5],[11,8],[11,4],[0,5],[11,4],[0,11],[0,5],[9,7],[9,3],[9,7],[0,5],[6,11],[11,9],[3,7],[11,9],[6,2],[11,4],[0,8],[9,3]],
            sequenceIndex: 0,
            lastSwitchTs: Date.now(),
            _originalDrawWrinklers: null,
            _originalBackgroundHook: false,
            _previousBgType: Game.bgType,
            _originalBgType: Game.bgType
        };
    };
    
    DefeatEvilPuzzle.prototype.onSetup = function() {
        var self = this;
        var tracking = this.getTracking();
        if (!tracking._originalDrawWrinklers && typeof Game.DrawWrinklers === 'function') {
            tracking._originalDrawWrinklers = Game.DrawWrinklers;
            Game.DrawWrinklers = function() {
                self.customDrawWrinklers.call(self);
            };
        }
        if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
            var M = Game.Objects['Farm'].minigame;
            if (M.harvest && typeof M.harvest === 'function' && !M._defeatEvilHarvestHooked) {
                M._originalHarvest = M.harvest;
                M.harvest = function(x, y) {
                        // Check BEFORE harvest to ensure puzzle is still valid
                    var shouldComplete = false;
                    if (self.isValid() && self.checkGardenPattern()) {
                        shouldComplete = true;
                    }
                    var result = M._originalHarvest.call(this, x, y);
                    if (shouldComplete) {
                        self.complete();
                    }
                    return result;
                };
                M._defeatEvilHarvestHooked = true;
            }
            this.registerHook('check', function() { if (self.checkGardenPattern()) self.complete(); }, 'Check defeat evil');
        }
        if (!tracking._originalBackgroundHook) {
            tracking._originalBackgroundHook = true;
            var originalBgType = Game.bgType;
            Object.defineProperty(Game, 'bgType', {
                get: function() { return originalBgType; },
                set: function(value) {
                    var previousBgType = tracking._previousBgType;
                    originalBgType = value;
                    tracking._previousBgType = value;
                    if (previousBgType === 21 && value === 22 && self.isValid()) {
                        var winklerOverrideActive = !!tracking._originalDrawWrinklers;
                        if (winklerOverrideActive) {
                            Game.DrawWrinklers = tracking._originalDrawWrinklers;
                            delete tracking._originalDrawWrinklers;
                        }
                        if (winklerOverrideActive) {
                            playAudioSound('puzzleCompletion');
                        }
                        showChessBoardPuzzle();
                    }
                },
                configurable: true
            });
        }
    };
    
    DefeatEvilPuzzle.prototype.customDrawWrinklers = function() {
        var tracking = this.getTracking();
        if (!tracking) return tracking._originalDrawWrinklers ? tracking._originalDrawWrinklers() : undefined;
        var ctx = Game.LeftBackground;
        var selected = 0;
        var now = Date.now();
        if (!tracking.lastSwitchTs) tracking.lastSwitchTs = now;
        var shouldShowCustomArt = (Game.milkType == 29);
        var winklerCount = 0;
        var hasCorrectWinklers = true;
        for (var i = 0; i < 12; i++) {
            if (Game.wrinklers[i] && Game.wrinklers[i].close == 1) {
                winklerCount++;
            } else {
                hasCorrectWinklers = false;
                break;
            }
        }
        // Ensure there are exactly 12 winklers total (no more, no less)
        var totalWinklerCount = 0;
        if (Game.wrinklers) {
            for (var j in Game.wrinklers) {
                if (Game.wrinklers[j] && Game.wrinklers[j].phase > 0) {
                    totalWinklerCount++;
                }
            }
        }
        shouldShowCustomArt = shouldShowCustomArt && hasCorrectWinklers && winklerCount === 12 && totalWinklerCount === 12;
        if (shouldShowCustomArt && tracking._lastMilkType !== 29) {
            tracking.sequenceIndex = 0;
            tracking.lastSwitchTs = now;
            tracking._loopPauseActive = false;
            tracking._repeatPauseActive = false;
        }
        tracking._lastMilkType = Game.milkType;
        var currentStep = tracking.sequence[tracking.sequenceIndex] || [];
        var isIdleStep = (currentStep.length === 2 && currentStep[0] === -1 && currentStep[1] === -1);
        var switchInterval = 2000;
        var inLoopPause = tracking._loopPauseActive;
        if (inLoopPause && (now - tracking._loopPauseStart) >= 5000) {
            tracking._loopPauseActive = false;
            tracking.sequenceIndex = 0;
            tracking.lastSwitchTs = now;
            inLoopPause = false;
            currentStep = tracking.sequence[0] || [];
            isIdleStep = (currentStep.length === 2 && currentStep[0] === -1 && currentStep[1] === -1);
        }
        if (!inLoopPause && now - tracking.lastSwitchTs >= switchInterval) {
            var prevIndex = tracking.sequenceIndex;
            var prevStep = tracking.sequence[prevIndex] || [];
            if (prevIndex === tracking.sequence.length - 1) {
                tracking._loopPauseActive = true;
                tracking._loopPauseStart = now;
                tracking.lastSwitchTs = now;
            } else {
                tracking.sequenceIndex = (tracking.sequenceIndex + 1) % tracking.sequence.length;
                var newStep = tracking.sequence[tracking.sequenceIndex] || [];
                var isRepeatStep = prevStep.length === newStep.length && prevStep.every(function(val, idx) { return val === newStep[idx]; });
                if (isRepeatStep) {
                    tracking._repeatPauseActive = true;
                    tracking._repeatPauseStart = now;
                }
                tracking.lastSwitchTs = now;
            }
        }
        if (tracking._repeatPauseActive && (now - tracking._repeatPauseStart) >= 150) {
            tracking._repeatPauseActive = false;
        }
        currentStep = tracking.sequence[tracking.sequenceIndex] || [];
        isIdleStep = (currentStep.length === 2 && currentStep[0] === -1 && currentStep[1] === -1);
        var forcedSet = isIdleStep ? [] : currentStep;
        for (var i in Game.wrinklers) {
            var me = Game.wrinklers[i];
            if (me.phase > 0) {
                ctx.globalAlpha = me.close;
                ctx.save();
                ctx.translate(me.x, me.y);
                var sw = 100 + 2 * Math.sin(Game.T * 0.2 + i * 3);
                var sh = 200 + 5 * Math.sin(Game.T * 0.2 - 2 + i * 3);
                if (Game.prefs.fancy) {
                    ctx.translate(0, 30);
                    ctx.rotate(-(me.r) * Math.PI / 180);
                    ctx.drawImage(Pic('wrinklerShadow.png'), -sw / 2, -10, sw, sh);
                    ctx.rotate((me.r) * Math.PI / 180);
                    ctx.translate(0, -30);
                }
                ctx.rotate(-(me.r) * Math.PI / 180);
                var pic = Game.WINKLERS ? 'winkler.png' : 'wrinkler.png';
                if (me.type == 1) {
                    pic = Game.WINKLERS ? 'shinyWinkler.png' : 'shinyWrinkler.png';
                } else if (Game.season == 'christmas') {
                    pic = Game.WINKLERS ? 'winterWinkler.png' : 'winterWrinkler.png';
                }
                if (!isIdleStep && !tracking._repeatPauseActive && !inLoopPause && forcedSet.indexOf(Number(i)) !== -1 && shouldShowCustomArt) {
                    pic = Game.WINKLERS ? 'wrinkler.png' : 'winkler.png';
                }
                ctx.drawImage(Pic(pic), -sw / 2, -10, sw, sh);
                if (!Game.WINKLERS && Game.prefs.notScary) {
                    ctx.drawImage(Pic(Math.sin(Game.T * 0.003 + i * 11 + 137 + Math.sin(Game.T * 0.017 + i * 13)) > 0.9997 ? 'wrinklerBlink.png' : 'wrinklerGooglies.png'), -sw / 2, -10 + 1 * Math.sin(Game.T * 0.2 + i * 3 + 1.2), sw, sh);
                }
                if (me.type == 1 && Math.random() < 0.3 && Game.prefs.particles) {
                    ctx.globalAlpha = Math.random() * 0.65 + 0.1;
                    var s = Math.random() * 30 + 5;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(Pic('glint.png'), -s / 2 + Math.random() * 50 - 25, -s / 2 + Math.random() * 200, s, s);
                }
                ctx.restore();
                if (Game.prefs.particles && me.phase == 2 && Math.random() < 0.03) {
                    Game.particleAdd(me.x, me.y, Math.random() * 4 - 2, Math.random() * -2 - 2, Math.random() * 0.5 + 0.5, 1, 2);
                }
                if (me.selected) selected = me;
            }
        }
        if (selected && Game.Has('Eye of the wrinkler')) {
            var x = Game.cookieOriginX;
            var y = Game.cookieOriginY;
            ctx.font = '14px Merriweather';
            ctx.textAlign = 'center';
            var text = loc('Swallowed:');
            var width = Math.ceil(Math.max(ctx.measureText(text).width, ctx.measureText(Beautify(selected.sucked)).width));
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.65;
            var xO = x - width / 2 - 16;
            var yO = y - 4;
            var dist = Math.floor(Math.sqrt((selected.x - xO) * (selected.x - xO) + (selected.y - yO) * (selected.y - yO)));
            var angle = -Math.atan2(yO - selected.y, xO - selected.x) + Math.PI / 2;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            for (var j = 0; j < Math.floor(dist / 12); j++) {
                var xC = selected.x + Math.sin(angle) * j * 12;
                var yC = selected.y + Math.cos(angle) * j * 12;
                ctx.beginPath();
                ctx.arc(xC, yC, 4 + (Game.prefs.fancy ? 2 * Math.pow(Math.sin(-Game.T * 0.2 + j * 0.3), 4) : 0), 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.stroke();
            }
            ctx.fillRect(x - width / 2 - 8 - 10, y - 23, width + 16 + 20, 38);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - width / 2 - 8 - 10 + 1.5, y - 23 + 1.5, width + 16 + 20 - 3, 38 - 3);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.fillText(text, x + 14, y - 8);
            ctx.fillText(Beautify(selected.sucked), x + 10, y + 8);
            var s2 = 54 + 2 * Math.sin(Game.T * 0.4);
            ctx.drawImage(Pic('icons.png'), 27 * 48, 26 * 48, 48, 48, x - width / 2 - 16 - s2 / 2, y - 4 - s2 / 2, s2, s2);
        }
    };
    
    DefeatEvilPuzzle.prototype.checkGardenPattern = function() {
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) return false;
        var M = Game.Objects['Farm'].minigame;
        if (!M.plot || !M.plantsById) return false;
        var expectedPattern = [
            ['Ordinary clover','EMPTY','Duketater','EMPTY','EMPTY','Ordinary clover'],
            ['EMPTY','Thumbcorn','Thumbcorn','Golden clover','Keenmoss','EMPTY'],
            ['Thumbcorn','Bakeberry','Keenmoss','Thumbcorn','EMPTY','Thumbcorn'],
            ['Bakeberry','EMPTY','Thumbcorn','Bakeberry','Keenmoss','EMPTY'],
            ['EMPTY','Thumbcorn','Golden clover','EMPTY','Thumbcorn','Thumbcorn'],
            ['Ordinary clover','EMPTY','EMPTY','Duketater','EMPTY','Ordinary clover']
        ];
        for (var y = 0; y < M.plot.length && y < expectedPattern.length; y++) {
            for (var x = 0; x < M.plot[y].length && x < expectedPattern[y].length; x++) {
                var plotData = M.plot[y][x];
                var expectedPlant = expectedPattern[y][x];
                if (expectedPlant === 'EMPTY') {
                    if (plotData && plotData[0] > 0) return false;
                } else {
                    if (!plotData || plotData[0] <= 0) return false;
                    var plantId = plotData[0] - 1;
                    var plant = M.plantsById[plantId];
                    if (!plant || plant.name !== expectedPlant) return false;
                }
            }
        }
        return true;
    };
    
    DefeatEvilPuzzle.prototype.onCheck = function() {
        // Check happens in harvest hook and periodic check
    };
    
    DefeatEvilPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (tracking && tracking._originalDrawWrinklers && typeof Game.DrawWrinklers === 'function') {
            Game.DrawWrinklers = tracking._originalDrawWrinklers;
            delete tracking._originalDrawWrinklers;
        }
    };
    
    function EmbracePathPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'embracePathTracking');
    }
    EmbracePathPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    EmbracePathPuzzle.prototype.constructor = EmbracePathPuzzle;
    
    EmbracePathPuzzle.prototype.initializeTracking = function() {
        return {
            soundSequence: [],
            targetSequence: ['tick', 'tickOff', 'tick', 'tickOff', 'tick', 'tickOff', 'choir'],
            originalSetSound: null,
            buffWasActive: false
        };
    };
    
    EmbracePathPuzzle.prototype.onSetup = function() {
        var self = this;
        var tracking = this.getTracking();
        if (Game.jukebox && Game.jukebox.setSound && !tracking.originalSetSound) {
            tracking.originalSetSound = Game.jukebox.setSound;
            Game.jukebox.setSound = function(id) {
                tracking.originalSetSound.call(Game.jukebox, id);
                self.check();
            };
        }
    };
    
    EmbracePathPuzzle.prototype.onCheck = function() {
        if (!Game.jukebox || !Game.jukebox.sounds) return;
        var tracking = this.getTracking();
        if (!tracking) return;
        var hasNastyGoblins = Game.hasBuff('Nasty goblins');
        if (tracking.buffWasActive && !hasNastyGoblins) {
            tracking.soundSequence = [];
            tracking.buffWasActive = false;
            return;
        }
        if (!hasNastyGoblins) return;
        tracking.buffWasActive = true;
        var currentSoundIndex = Game.jukebox.onSound;
        var currentSound = Game.jukebox.sounds[currentSoundIndex];
        tracking.soundSequence.push(currentSound);
        var sequenceMatches = true;
        for (var i = 0; i < tracking.soundSequence.length; i++) {
            if (i >= tracking.targetSequence.length || tracking.soundSequence[i] !== tracking.targetSequence[i]) {
                sequenceMatches = false;
                break;
            }
        }
        if (!sequenceMatches) {
            tracking.soundSequence = [currentSound];
            if (currentSound !== tracking.targetSequence[0]) {
                tracking.soundSequence = [];
            }
        } else if (tracking.soundSequence.length === tracking.targetSequence.length) {
            this.complete();
        }
    };
    
    EmbracePathPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (tracking && tracking.originalSetSound && Game.jukebox) {
            Game.jukebox.setSound = tracking.originalSetSound;
        }
    };
    
    function SchismChoicePuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'schismChoiceTracking');
    }
    SchismChoicePuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    SchismChoicePuzzle.prototype.constructor = SchismChoicePuzzle;
    
    SchismChoicePuzzle.prototype.initializeTracking = function() {
        return {
            longMonthsPattern: { filled: [1, 3, 5, 6, 8, 10, 11], empty: [0, 2, 4, 7, 9] },
            shortMonthsPattern: { filled: [0, 2, 4, 7, 9], empty: [1, 3, 5, 6, 8, 10, 11] }
        };
    };
    
    SchismChoicePuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() { 
            self.check(); 
        }, 'Check schism choice');
    };
    SchismChoicePuzzle.prototype.onCheck = function() {
        if (Game.season !== 'christmas' || !Game.wrinklers || Game.wrinklers.length < 12) return;
        var tracking = this.getTracking();
        if (!tracking) return;
        
        var longMonthsComplete = true;
        for (var i = 0; i < tracking.longMonthsPattern.filled.length; i++) {
            var pos = tracking.longMonthsPattern.filled[i];
            if (pos < Game.wrinklers.length && Game.wrinklers[pos].close !== 1) {
                longMonthsComplete = false;
                break;
            }
        }
        if (longMonthsComplete) {
            for (var i = 0; i < tracking.longMonthsPattern.empty.length; i++) {
                var pos = tracking.longMonthsPattern.empty[i];
                if (pos < Game.wrinklers.length && Game.wrinklers[pos].close === 1) {
                    longMonthsComplete = false;
                    break;
                }
            }
        }
        var shortMonthsComplete = true;
        for (var i = 0; i < tracking.shortMonthsPattern.filled.length; i++) {
            var pos = tracking.shortMonthsPattern.filled[i];
            if (pos < Game.wrinklers.length && Game.wrinklers[pos].close !== 1) {
                shortMonthsComplete = false;
                break;
            }
        }
        if (shortMonthsComplete) {
            for (var i = 0; i < tracking.shortMonthsPattern.empty.length; i++) {
                var pos = tracking.shortMonthsPattern.empty[i];
                if (pos < Game.wrinklers.length && Game.wrinklers[pos].close === 1) {
                    shortMonthsComplete = false;
                    break;
                }
            }
        }
        if (longMonthsComplete) {
            cookieAgeData.puzzles.exposePathPicked = false;
            this.complete();
        } else if (shortMonthsComplete) {
            cookieAgeData.puzzles.exposePathPicked = true;
            this.complete();
        }
    };
    
    function RosettaStonePuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'rosettaStoneTracking');
    }
    RosettaStonePuzzle.prototype = Object.create(SequencePuzzle.prototype);
    RosettaStonePuzzle.prototype.constructor = RosettaStonePuzzle;
    
    RosettaStonePuzzle.prototype.initializeTracking = function() {
        return { 
            sequence: [], 
            lastSeason: Game.season || '', 
            hooked: false,
            completed: false
        };
    };
    
    RosettaStonePuzzle.prototype.onSetup = function() {
        var self = this;
        var tracking = this.getTracking();
        if (tracking.hooked) return;
        var originalSeason = Game.season;
        tracking.lastSeason = originalSeason;
        Object.defineProperty(Game, 'season', {
            get: function() { return originalSeason; },
            set: function(newSeason) {
                var oldSeason = originalSeason;
                originalSeason = newSeason;
                if (oldSeason !== newSeason && newSeason !== '') {
                    setTimeout(function() { self.check(); }, 0);
                }
            },
            configurable: true
        });
        tracking.hooked = true;
        Game.showLangSelection = function(firstLaunch) {
            var str='';
            for (var i in Langs) {
                var lang=Langs[i];
                str+='<div class="langSelectButton title'+((!firstLaunch && locId==lang.file)?' selected':'')+'" style="padding:4px;" id="langSelect-'+i+'">'+lang.name+'</div>';
            }
            str+='<div class="langSelectButton title" style="padding:4px;" id="langSelect-ancientHieroglyphics">Ancient hieroglyphics</div>';
            Game.Prompt('<id ChangeLanguage>'+(firstLaunch?'<noClose>':'')+'<h3 id="languageSelectHeader">'+loc("Change language")+'</h3><div class="line"></div>'+(firstLaunch?'':'<div style="font-size:11px;opacity:0.5;margin-bottom:12px;">('+loc("note: this will save and reload your game")+')</div>')+str,(firstLaunch?0:[loc("Cancel")]));
            for (var i in Langs) {
                var lang=Langs[i];
                AddEvent(l('langSelect-'+i),'click',function(lang){return function(){if (true){PlaySound('snd/tick.mp3');localStorageSet('CookieClickerLang',lang);Game.toSave=true;Game.toReload=true;}};}(i));
                AddEvent(l('langSelect-'+i),'mouseover',function(lang){return function(){PlaySound('snd/smallTick.mp3',0.75);l('languageSelectHeader').innerHTML=Langs[lang].changeLanguage;};}(i));
            }
            AddEvent(l('langSelect-ancientHieroglyphics'),'click',function(){PlaySound('snd/tick.mp3');window.open('https://imgbox.com/OxJN3kdl','_blank');});
            AddEvent(l('langSelect-ancientHieroglyphics'),'mouseover',function(){PlaySound('snd/smallTick.mp3',0.75);l('languageSelectHeader').innerHTML='Ancient hieroglyphics';});
        };
    };
    
    RosettaStonePuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        if (!tracking) return;
        
        if (tracking.completed) {
            return;
        }
        
        var currentSeason = Game.season || '';
        // Only add season if it's different from the last one
        if (currentSeason !== tracking.lastSeason && currentSeason !== '') {
            tracking.sequence.push(currentSeason);
            tracking.lastSeason = currentSeason;
        }
        
        var requiredSequence = ['christmas', 'halloween', 'easter', 'fools', 'valentines'];
        var currentSequence = tracking.sequence;
        
        // Validate incrementally - check if current sequence matches the prefix of required sequence
        if (currentSequence.length > requiredSequence.length) {
            // Too long, reset
            this.resetSequence();
        } else {
            // Check if each element matches so far
            var matches = true;
            for (var i = 0; i < currentSequence.length; i++) {
                if (currentSequence[i] !== requiredSequence[i]) {
                    matches = false;
                    break;
                }
            }
            
            if (!matches) {
                // Sequence doesn't match, reset
                this.resetSequence();
            } else if (currentSequence.length >= requiredSequence.length) {
                // Complete sequence matches!
                tracking.completed = true;
                this.complete();
            }
        }
    };
    
    RosettaStonePuzzle.prototype.resetSequence = function() {
        var tracking = this.getTracking();
        tracking.sequence = [];
        tracking.lastSeason = Game.season || '';
    };
    
    RosettaStonePuzzle.prototype.onCleanup = function() {
        // Restore Game.season property to default (remove the custom getter/setter)
        var currentSeason = Game.season;
        delete Game.season;
        Game.season = currentSeason;
        
        // Restore vanilla language selection
        Game.showLangSelection = function(firstLaunch) {
            var str='';
            for (var i in Langs) {
                var lang=Langs[i];
                str+='<div class="langSelectButton title'+((!firstLaunch && locId==lang.file)?' selected':'')+'" style="padding:4px;" id="langSelect-'+i+'">'+lang.name+'</div>';
            }
            Game.Prompt('<id ChangeLanguage>'+(firstLaunch?'<noClose>':'')+'<h3 id="languageSelectHeader">'+loc("Change language")+'</h3><div class="line"></div>'+(firstLaunch?'':'<div style="font-size:11px;opacity:0.5;margin-bottom:12px;">('+loc("note: this will save and reload your game")+')</div>')+str,(firstLaunch?0:[loc("Cancel")]));
            for (var i in Langs) {
                var lang=Langs[i];
                AddEvent(l('langSelect-'+i),'click',function(lang){return function(){if (true){PlaySound('snd/tick.mp3');localStorageSet('CookieClickerLang',lang);Game.toSave=true;Game.toReload=true;}};}(i));
                AddEvent(l('langSelect-'+i),'mouseover',function(lang){return function(){PlaySound('snd/smallTick.mp3',0.75);l('languageSelectHeader').innerHTML=Langs[lang].changeLanguage;};}(i));
            }
        };
    };
    
    function StillWithUsPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'stillWithUsTracking');
    }
    StillWithUsPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    StillWithUsPuzzle.prototype.constructor = StillWithUsPuzzle;
    
    StillWithUsPuzzle.prototype.initializeTracking = function() {
        return { 
            petCount: 0, 
            requiredPets: 10, 
            hooked: false,
            completed: false
        };
    };
    
    StillWithUsPuzzle.prototype.onSetup = function() {
        if (Game.specialTab === 'dragon' && Game.dragonLevel >= 4 && Game.Has('Pet the dragon')) {
            this.hookDragonPetting();
        } else {
            var self = this;
            this.registerHook('check', function() {
                if (Game.specialTab === 'dragon' && Game.dragonLevel >= 4 && Game.Has('Pet the dragon') && !self.getTracking().hooked) {
                    self.hookDragonPetting();
                }
            }, 'Check for dragon availability');
        }
    };
    
    StillWithUsPuzzle.prototype.hookDragonPetting = function() {
        if (!Game._originalClickSpecialPicStillWithUs) {
            Game._originalClickSpecialPicStillWithUs = Game.ClickSpecialPic;
        }
        var self = this;
        Game.ClickSpecialPic = function() {
            Game._originalClickSpecialPicStillWithUs();
            if (Game.specialTab === 'dragon' && Game.dragonLevel >= 4 && Game.Has('Pet the dragon')) {
                self.checkDragonPet();
            }
        };
        this.getTracking().hooked = true;
    };
    
    StillWithUsPuzzle.prototype.checkDragonPet = function() {
        if (!this.isValid()) return;
        var tracking = this.getTracking();
        if (tracking.completed) {
            return;
        }
        
        var bothSlotsEmpty = (Game.dragonAura === 0 && Game.dragonAura2 === 0);
        if (bothSlotsEmpty) {
            tracking.petCount++;
            if (tracking.petCount >= tracking.requiredPets) {
                tracking.completed = true;
                this.complete();
            }
        } else {
            tracking.petCount = 0;
        }
    };
    
    StillWithUsPuzzle.prototype.onCleanup = function() {
        if (Game._originalClickSpecialPicStillWithUs) {
            Game.ClickSpecialPic = Game._originalClickSpecialPicStillWithUs;
            delete Game._originalClickSpecialPicStillWithUs;
        }
    };
    
    StillWithUsPuzzle.prototype.onCheck = function() {
        // Check happens in dragon petting hook
    };
    
    function MaskWearsThinPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'maskTracking');
    }
    MaskWearsThinPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    MaskWearsThinPuzzle.prototype.constructor = MaskWearsThinPuzzle;
    
    MaskWearsThinPuzzle.prototype.initializeTracking = function() {
        return { completed: false, hooksDisabled: false };
    };
    
    MaskWearsThinPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() { self.check(); }, 'Check clone appearance');
    };
    
    MaskWearsThinPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        if (tracking.hooksDisabled || tracking.completed) return;
        if (!Game.YouCustomizer || !Game.YouCustomizer.currentGenes) return;
        
        var genes = Game.YouCustomizer.currentGenes;
        var hairValid = (genes[0] === 10);
        var hairColorValid = (genes[1] === 3);
        var skinColorValid = (genes[2] === 1);
        var headShapeValid = (genes[3] === 3);
        var faceValid = (genes[4] === 2);
        var extraA = genes[5];
        var extraB = genes[6];
        var extrasValid = (extraA === 7 && extraB === 32) || (extraA === 32 && extraB === 7);
        
        if (hairValid && hairColorValid && skinColorValid && headShapeValid && faceValid && extrasValid) {
            tracking.completed = true;
            this.complete();
        }
    };
    
    function FalseBeaconsPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'falseBeaconsTracking');
    }
    FalseBeaconsPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    FalseBeaconsPuzzle.prototype.constructor = FalseBeaconsPuzzle;
    
    FalseBeaconsPuzzle.prototype.initializeTracking = function() {
        return {
            consecutiveSpiritPlays: 0,
            originalSetSound: null,
            hooked: false,
            completed: false
        };
    };
    
    FalseBeaconsPuzzle.prototype.onSetup = function() {
        this.hookJukebox();
    };
    
    FalseBeaconsPuzzle.prototype.hookJukebox = function() {
        var tracking = this.getTracking();
        if (tracking.hooked || !Game.jukebox || !Game.jukebox.setSound) {
            return;
        }
        
        tracking.originalSetSound = Game.jukebox.setSound;
        var self = this;
        
        Game.jukebox.setSound = function(id) {
            tracking.originalSetSound.call(Game.jukebox, id);
            self.checkSound();
        };
        
        tracking.hooked = true;
    };
    
    FalseBeaconsPuzzle.prototype.checkSound = function() {
        if (!this.isValid() || !Game.jukebox || !Game.jukebox.sounds) {
            return;
        }
        
        var tracking = this.getTracking();
        
        // Guard against double completion
        if (tracking.completed) {
            return;
        }
        
        var currentSoundIndex = Game.jukebox.onSound;
        var currentSound = Game.jukebox.sounds[currentSoundIndex];
        
        if (currentSound === 'spirit') {
            tracking.consecutiveSpiritPlays++;
            
            if (tracking.consecutiveSpiritPlays >= 3) {
                tracking.completed = true;
                this.complete();
            }
        } else {
            tracking.consecutiveSpiritPlays = 0;
        }
    };
    
    FalseBeaconsPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (tracking && tracking.originalSetSound && Game.jukebox) {
            Game.jukebox.setSound = tracking.originalSetSound;
        }
    };
    
    FalseBeaconsPuzzle.prototype.onCheck = function() {
        // Check happens in jukebox hook
        return;
    };
    
    function FalseDawnPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'falseDawnTracking');
    }
    FalseDawnPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    FalseDawnPuzzle.prototype.constructor = FalseDawnPuzzle;
    
    FalseDawnPuzzle.prototype.initializeTracking = function() {
        var initialCounts = {};
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            initialCounts[building.name] = building.amount;
        }
        
        var tracking = {
            currentStep: 0,
            stepTargets: [
                { building: 'Farm', action: 'buy', amount: 1 },
                { building: 'Mine', action: 'sell', amount: 1 },
                { building: 'Fractal engine', action: 'buy', amount: 1 },
                { building: 'Alchemy lab', action: 'buy', amount: 1 }
            ],
            stepStartCounts: [],
            initialBuildingCounts: initialCounts,
            sequenceComplete: false,
            initialSeason: Game.season || '',
            seasonValid: (Game.season === 'fools'),
            initialCountsSet: false
        };
        return tracking;
    };
    
    FalseDawnPuzzle.prototype.onSetup = function() {
        var tracking = this.getTracking();
        
        if (Game.season === 'fools') {
            tracking.seasonValid = true;
            tracking.initialSeason = 'fools';
            
            for (var i = 0; i < tracking.stepTargets.length; i++) {
                var targetBuilding = tracking.stepTargets[i].building;
                var buildingObj = Game.Objects[targetBuilding];
                if (buildingObj) {
                    tracking.stepStartCounts[i] = buildingObj.amount;
                }
            }
            for (var i = 0; i < Game.ObjectsById.length; i++) {
                var building = Game.ObjectsById[i];
                tracking.initialBuildingCounts[building.name] = building.amount;
            }
            
            tracking.initialCountsSet = true;
        } else {
            tracking.seasonValid = false;
        }
        
        this.hookBuildingBuySell();
        
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check false dawn sequence');
    };
    
    FalseDawnPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        if (!tracking || tracking.sequenceComplete) {
            if (tracking && tracking.sequenceComplete) {
                return;
            }
            return;
        }
        
        if (Game.season !== 'fools') {
            if (tracking.seasonValid) {
                this.resetSequence();
                tracking.seasonValid = false;
            }
            return;
        }
        
        if (!tracking.seasonValid && Game.season === 'fools') {
            tracking.seasonValid = true;
            tracking.initialSeason = 'fools';
            
            for (var i = 0; i < tracking.stepTargets.length; i++) {
                var targetBuilding = tracking.stepTargets[i].building;
                var buildingObj = Game.Objects[targetBuilding];
                if (buildingObj) {
                    tracking.stepStartCounts[i] = buildingObj.amount;
                }
            }
            for (var i = 0; i < Game.ObjectsById.length; i++) {
                var building = Game.ObjectsById[i];
                tracking.initialBuildingCounts[building.name] = building.amount;
            }
            
            tracking.initialCountsSet = true;
            tracking.currentStep = 0;
            tracking.sequenceComplete = false;
        }
        
        var currentStep = tracking.currentStep;
        if (currentStep >= tracking.stepTargets.length) {
            return;
        }
        
        var stepTarget = tracking.stepTargets[currentStep];
        var buildingObj = Game.Objects[stepTarget.building];
        if (!buildingObj) {
            return;
        }
        
        var currentCount = buildingObj.amount;
        if (tracking.stepStartCounts[currentStep] === undefined) {
            return;
        }
        var startCount = tracking.stepStartCounts[currentStep];
        var amountToChange = stepTarget.amount;
        var stepComplete = false;
        
        if (currentStep === 0 && stepTarget.building === 'Farm') {
            stepComplete = (currentCount > startCount);
        } else {
            if (stepTarget.action === 'sell') {
                var targetCount = startCount - amountToChange;
                stepComplete = (currentCount === targetCount);
            } else if (stepTarget.action === 'buy') {
                if (stepTarget.building === 'Mine' || stepTarget.building === 'Fractal engine') {
                    var targetCount = startCount + amountToChange;
                    stepComplete = (currentCount === targetCount);
                } else {
                    stepComplete = (currentCount > startCount);
                }
            }
        }
        
        if (stepComplete) {
            
            tracking.currentStep++;
            
            if (currentStep === 0) {
                for (var i = 1; i < tracking.stepTargets.length; i++) {
                    var targetBuilding = tracking.stepTargets[i].building;
                    var buildingObj2 = Game.Objects[targetBuilding];
                    if (buildingObj2) {
                        tracking.stepStartCounts[i] = buildingObj2.amount;
                    }
                }
                
                for (var i = 0; i < Game.ObjectsById.length; i++) {
                    var building = Game.ObjectsById[i];
                    tracking.initialBuildingCounts[building.name] = building.amount;
                }
            }
            
            if (tracking.currentStep >= tracking.stepTargets.length) {
                tracking.sequenceComplete = true;
                this.complete();
            }
        } else {
            var sequenceBuildings = [];
            for (var j = 0; j < tracking.stepTargets.length; j++) {
                sequenceBuildings.push(tracking.stepTargets[j].building);
            }
            
            for (var i = 0; i < Game.ObjectsById.length; i++) {
                var building = Game.ObjectsById[i];
                var initialCount = tracking.initialBuildingCounts[building.name] || 0;
                
                if (sequenceBuildings.indexOf(building.name) === -1 && building.amount !== initialCount) {
                    this.resetSequence();
                    return;
                }
            }
        }
    };
    
    FalseDawnPuzzle.prototype.resetSequence = function() {
        var tracking = this.getTracking();
        if (!tracking) return;
        
        tracking.currentStep = 0;
        tracking.stepStartCounts = [];
        tracking.sequenceComplete = false;
        tracking.initialCountsSet = false;
        
        // Update initial counts to current state for all buildings
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            tracking.initialBuildingCounts[building.name] = building.amount;
        }
        
        // Recapture ALL step start counts based on CURRENT building amounts
        for (var i = 0; i < tracking.stepTargets.length; i++) {
            var targetBuilding = tracking.stepTargets[i].building;
            var buildingObj = Game.Objects[targetBuilding];
            if (buildingObj) {
                tracking.stepStartCounts[i] = buildingObj.amount;
            }
        }
        
        tracking.initialCountsSet = true;
    };
    
    FalseDawnPuzzle.prototype.hookBuildingBuySell = function() {
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            
            if (!building._originalBuyFalseDawn) {
                building._originalBuyFalseDawn = building.buy;
                building._originalSellFalseDawn = building.sell;
            }
            
            var self = this;
            var originalBuy = building._originalBuyFalseDawn;
            var originalSell = building._originalSellFalseDawn;
            building.buy = function(amount) {
                var result = originalBuy.call(this, amount);
                setTimeout(function() {
                    self.onCheck();
                }, 0);
                return result;
            };
            
            building.sell = function(amount, bypass) {
                var result = originalSell.call(this, amount, bypass);
                setTimeout(function() {
                    self.onCheck();
                }, 0);
                return result;
            };
        }
    };
    
    function LitanyCrumbsPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'litanySpellTracking');
    }
    LitanyCrumbsPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    LitanyCrumbsPuzzle.prototype.constructor = LitanyCrumbsPuzzle;
    
    LitanyCrumbsPuzzle.prototype.initializeTracking = function() {
        return {
            expectedSequence: [
                'Diminish Ineptitude',
                'Haggler\'s Charm',
                'Stretch Time',
                'Resurrect Abomination'
            ],
            currentSequence: [],
            maxMagicRequired: 115,
            originalCastSpell: null,
            hooked: false
        };
    };
    
    LitanyCrumbsPuzzle.prototype.onSetup = function() {
        if (Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].minigame) {
            this.hookGrimoire();
        } else {
            var self = this;
            this.registerHook('check', function() {
                if (Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].minigame && !self.getTracking().hooked) {
                    self.hookGrimoire();
                }
            }, 'Check for grimoire availability');
        }
    };
    
    LitanyCrumbsPuzzle.prototype.hookGrimoire = function() {
        var M = Game.Objects['Wizard tower'].minigame;
        var tracking = this.getTracking();
        
        if (M && M.castSpell && typeof M.castSpell === 'function' && !tracking.hooked) {
            tracking.originalCastSpell = M.castSpell;
            var self = this;
            
            M.castSpell = function(spell, obj) {
                var result = tracking.originalCastSpell.call(this, spell, obj);
                setTimeout(function() {
                    self.checkSpellCast(spell);
                }, 0);
                return result;
            };
            
            tracking.hooked = true;
        }
    };
    
    LitanyCrumbsPuzzle.prototype.checkSpellCast = function(spell) {
        if (!this.isValid()) {
            return;
        }
        
        var tracking = this.getTracking();
        
        var M = Game.Objects['Wizard tower'].minigame;
        if (!M || M.magicM !== 115) {
            return;
        }
        
        var spellName = spell.name || spell.id || 'unknown';
        tracking.currentSequence.push(spellName);
        
        var expectedSequence = tracking.expectedSequence;
        var currentSequence = tracking.currentSequence;
        
        if (currentSequence.length > expectedSequence.length) {
            tracking.currentSequence = [spellName];
            currentSequence = tracking.currentSequence;
        }
        
        var matches = true;
        for (var i = 0; i < currentSequence.length; i++) {
            if (currentSequence[i] !== expectedSequence[i]) {
                matches = false;
                break;
            }
        }
        
        if (!matches) {
            tracking.currentSequence = [spellName];
        } else if (currentSequence.length === expectedSequence.length) {
            this.complete();
        }
    };
    
    LitanyCrumbsPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (tracking && tracking.originalCastSpell && Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].minigame) {
            Game.Objects['Wizard tower'].minigame.castSpell = tracking.originalCastSpell;
        }
    };
    
    LitanyCrumbsPuzzle.prototype.onCheck = function() {
        // Check happens in castSpell hook
        return;
    };
    
    function RiteFivefoldCastingPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'fivefoldSpellTracking');
    }
    RiteFivefoldCastingPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    RiteFivefoldCastingPuzzle.prototype.constructor = RiteFivefoldCastingPuzzle;
    
    RiteFivefoldCastingPuzzle.prototype.initializeTracking = function() {
        return {
            expectedSequence: [
                'Resurrect Abomination',
                'Diminish Ineptitude',
                'Haggler\'s Charm',
                'Stretch Time',
                'Summon Crafty Pixies'
            ],
            expectedResults: [false, true, true, true, true],
            currentSequence: [],
            currentResults: [],
            originalCastSpell: null,
            hooked: false
        };
    };
    
    RiteFivefoldCastingPuzzle.prototype.onSetup = function() {
        if (Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].minigame) {
            this.hookGrimoire();
        } else {
            var self = this;
            this.registerHook('check', function() {
                if (Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].minigame && !self.getTracking().hooked) {
                    self.hookGrimoire();
                }
            }, 'Check for grimoire availability');
        }
    };
    
    RiteFivefoldCastingPuzzle.prototype.hookGrimoire = function() {
        var M = Game.Objects['Wizard tower'].minigame;
        var tracking = this.getTracking();
        
        if (M && M.castSpell && typeof M.castSpell === 'function' && !tracking.hooked) {
            tracking.originalCastSpell = M.castSpell;
            var self = this;
            
            M.castSpell = function(spell, obj) {
                var result = tracking.originalCastSpell.call(this, spell, obj);
                setTimeout(function() {
                    self.checkSpellCast(spell, result);
                }, 0);
                return result;
            };
            
            tracking.hooked = true;
        }
    };
    
    RiteFivefoldCastingPuzzle.prototype.checkSpellCast = function(spell, result) {
        if (!this.isValid()) {
            return;
        }
        
        var tracking = this.getTracking();
        var spellName = spell.name || spell.id || 'unknown';
        var spellResult = result === true;
        
        var expectedIndex = tracking.currentSequence.length;
        if (expectedIndex >= tracking.expectedSequence.length) {
            return;
        }
        
        var expectedSpell = tracking.expectedSequence[expectedIndex];
        var expectedResult = tracking.expectedResults[expectedIndex];
        
        if (spellName === expectedSpell && spellResult === expectedResult) {
            tracking.currentSequence.push(spellName);
            tracking.currentResults.push(spellResult);
            
            if (tracking.currentSequence.length >= tracking.expectedSequence.length) {
                this.complete();
            }
        } else {
            tracking.currentSequence = [];
            tracking.currentResults = [];
        }
    };
    
    RiteFivefoldCastingPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (tracking && tracking.originalCastSpell && Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].minigame) {
            Game.Objects['Wizard tower'].minigame.castSpell = tracking.originalCastSpell;
        }
    };
    
    RiteFivefoldCastingPuzzle.prototype.onCheck = function() {
        // Check happens in castSpell hook
        return;
    };
    
    function LawkeeperWalkPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'lawkeeperWalkTracking');
    }
    LawkeeperWalkPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    LawkeeperWalkPuzzle.prototype.constructor = LawkeeperWalkPuzzle;
    
    LawkeeperWalkPuzzle.prototype.initializeTracking = function() {
        return {
            expectedSequence: [2, 0, 1],
            currentStep: 0,
            spiritName: 'Rigidel, Spirit of Order',
            hooked: false,
            stepPhase: 'waiting',
            stepStartTime: null,
            originalSlot: null,
            slotProxy: null,
            completed: false
        };
    };
    
    LawkeeperWalkPuzzle.prototype.onSetup = function() {
        if (Game.Objects['Temple'] && Game.Objects['Temple'].minigame) {
            this.hookPantheon();
        } else {
            var self = this;
            this.registerHook('check', function() {
                if (Game.Objects['Temple'] && Game.Objects['Temple'].minigame && !self.getTracking().hooked) {
                    self.hookPantheon();
                }
            }, 'Check for temple minigame availability');
        }
    };
    
    LawkeeperWalkPuzzle.prototype.hookPantheon = function() {
        var pantheon = Game.Objects['Temple'].minigame;
        var tracking = this.getTracking();
        
        if (pantheon && pantheon.slot && Array.isArray(pantheon.slot) && !tracking.hooked) {
            var originalSlot = pantheon.slot;
            var self = this;
            
            var slotProxy = new Proxy(originalSlot, {
                set: function(target, property, value) {
                    target[property] = value;
                    // Call directly - no setTimeout needed since we're already in the mutation handler
                        self.checkSequence();
                    return true;
                }
            });
            
            pantheon.slot = slotProxy;
            tracking.originalSlot = originalSlot;
            tracking.slotProxy = slotProxy;
            tracking.hooked = true;
        }
    };
    
    LawkeeperWalkPuzzle.prototype.checkSequence = function() {
        if (!this.isValid()) {
            return;
        }
        
        var tracking = this.getTracking();
        
        // Guard against double/triple completion from queued setTimeout calls
        if (tracking.completed) {
            return;
        }
        
        if (!Game.Objects['Temple'] || !Game.Objects['Temple'].minigame) {
            return;
        }
        
        var pantheon = Game.Objects['Temple'].minigame;
        if (!pantheon.slot || pantheon.slot.length < 3) {
            return;
        }
        
        var currentStep = tracking.currentStep;
        var expectedSlot = tracking.expectedSequence[currentStep];
        var spiritName = tracking.spiritName;
        var currentPhase = tracking.stepPhase;
        
        // Get currently slotted gods
        var godsCurrentlySlotted = [];
        for (var throneIndex = 0; throneIndex < pantheon.slot.length; throneIndex++) {
            var slotValue = pantheon.slot[throneIndex];
            if (slotValue !== -1 && slotValue !== null && slotValue !== undefined) {
                var godInThrone = null;
                if (pantheon.godsById && pantheon.godsById[slotValue]) {
                    godInThrone = pantheon.godsById[slotValue].name;
                }
                if (godInThrone) {
                    godsCurrentlySlotted.push({
                        name: godInThrone,
                        throne: throneIndex
                    });
                }
            }
        }
        
        var hasAnySpirits = godsCurrentlySlotted.length > 0;
        var rigidelInCorrectSlot = false;
        var rigidelInWrongSlot = false;
        var hasOtherSpirits = false;
        
        for (var i = 0; i < godsCurrentlySlotted.length; i++) {
            var slottedGod = godsCurrentlySlotted[i];
            if (slottedGod.name === spiritName) {
                if (slottedGod.throne === expectedSlot) {
                    rigidelInCorrectSlot = true;
                } else {
                    rigidelInWrongSlot = true;
                }
            } else {
                hasOtherSpirits = true;
            }
        }
        
        // State machine: waiting -> placed -> completed
        if (currentPhase === 'waiting') {
            if (rigidelInCorrectSlot && !hasOtherSpirits) {
                tracking.stepPhase = 'placed';
                tracking.stepStartTime = Date.now();
            } else if (rigidelInWrongSlot || hasOtherSpirits) {
                tracking.currentStep = 0;
                tracking.stepPhase = 'waiting';
                tracking.stepStartTime = null;
            }
        } else if (currentPhase === 'placed') {
            if (!hasAnySpirits) {
                tracking.stepPhase = 'completed';
                tracking.currentStep++;
                
                if (tracking.currentStep >= tracking.expectedSequence.length) {
                    // Set completed BEFORE calling complete() to prevent double completion
                    tracking.completed = true;
                    this.complete();
                } else {
                    tracking.stepPhase = 'waiting';
                    tracking.stepStartTime = null;
                }
            } else if (rigidelInCorrectSlot && !hasOtherSpirits) {
                // Still correctly placed
            } else if (rigidelInWrongSlot && !hasOtherSpirits) {
                // Check if moved to next slot
                var nextStep = currentStep + 1;
                if (nextStep < tracking.expectedSequence.length) {
                    var nextExpectedSlot = tracking.expectedSequence[nextStep];
                    var rigidelInNextSlot = false;
                    for (var i = 0; i < godsCurrentlySlotted.length; i++) {
                        if (godsCurrentlySlotted[i].name === spiritName && godsCurrentlySlotted[i].throne === nextExpectedSlot) {
                            rigidelInNextSlot = true;
                            break;
                        }
                    }
                    if (rigidelInNextSlot) {
                        tracking.currentStep = nextStep;
                        tracking.stepPhase = 'placed';
                        tracking.stepStartTime = Date.now();
                    } else {
                        tracking.currentStep = 0;
                        tracking.stepPhase = 'waiting';
                        tracking.stepStartTime = null;
                    }
                } else {
                    tracking.currentStep = 0;
                    tracking.stepPhase = 'waiting';
                    tracking.stepStartTime = null;
                }
            } else if (hasOtherSpirits) {
                tracking.currentStep = 0;
                tracking.stepPhase = 'waiting';
                tracking.stepStartTime = null;
            }
        }
    };
    
    LawkeeperWalkPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (tracking && tracking.hooked && tracking.originalSlot) {
            if (Game.Objects['Temple'] && Game.Objects['Temple'].minigame) {
                Game.Objects['Temple'].minigame.slot = tracking.originalSlot;
            }
        }
    };
    
    LawkeeperWalkPuzzle.prototype.onCheck = function() {
        // Check happens in Proxy hook
        return;
    };
    
    function GrandmatriarchsFlightPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'grandmatriarchsFlightTracking');
        this.ascendButtonHook = null;
    }
    GrandmatriarchsFlightPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    GrandmatriarchsFlightPuzzle.prototype.constructor = GrandmatriarchsFlightPuzzle;
    
    GrandmatriarchsFlightPuzzle.prototype.initializeTracking = function() {
        return {
            elderFrenzyActiveOnAscend: false
        };
    };
    
    GrandmatriarchsFlightPuzzle.prototype.onSetup = function() {
        var self = this;
        
        // Hook ascend button
        setTimeout(function() {
            var ascendButton = document.getElementById('ascendButton');
            if (ascendButton) {
                self.ascendButtonHook = function() {
                    self.captureElderFrenzy();
                };
                ascendButton.addEventListener('click', self.ascendButtonHook);
            } else if (Game.Ascend && typeof Game.Ascend === 'function') {
                var originalAscend = Game.Ascend;
                Game.Ascend = function(bypass) {
                    self.captureElderFrenzy();
                    return originalAscend.call(this, bypass);
                };
            }
        }, 1000);
        
        // Hook reset (ascend) event - backup check that preserves state if already captured
        this.registerHook('reset', function() {
            self.checkElderFrenzyOnAscend();
        }, 'Check Elder Frenzy on ascend for Grandmatriarchs Flight');
        
        // Hook reincarnate event
        this.registerHook('reincarnate', function() {
            self.checkCompletion();
        }, 'Check completion on reincarnate');
    };
    
    GrandmatriarchsFlightPuzzle.prototype.captureElderFrenzy = function() {
        if (!this.isValid()) {
            return;
        }
        
        var tracking = this.getTracking();
        if (Game.buffs && Game.buffs['Elder frenzy'] && Game.buffs['Elder frenzy'].multCpS > 0) {
            tracking.elderFrenzyActiveOnAscend = true;
        } else {
            tracking.elderFrenzyActiveOnAscend = false;
        }
    };
    
    GrandmatriarchsFlightPuzzle.prototype.checkElderFrenzyOnAscend = function() {
        if (!this.isValid()) {
            return;
        }
        
        var tracking = this.getTracking();
        
        // Preserve state if already captured (don't overwrite a successful capture)
        if (tracking.elderFrenzyActiveOnAscend) {
            return;
        }
        
        // Backup check if state wasn't captured yet
        if (Game.buffs && Game.buffs['Elder frenzy'] && Game.buffs['Elder frenzy'].multCpS > 0) {
            tracking.elderFrenzyActiveOnAscend = true;
        } else {
            tracking.elderFrenzyActiveOnAscend = false;
        }
    };
    
    GrandmatriarchsFlightPuzzle.prototype.checkCompletion = function() {
        if (!this.isValid()) {
            return;
        }
        
        var tracking = this.getTracking();
        if (tracking.elderFrenzyActiveOnAscend) {
            this.complete();
        }
        
        // Reset tracking
        tracking.elderFrenzyActiveOnAscend = false;
    };
    
    GrandmatriarchsFlightPuzzle.prototype.onCleanup = function() {
        if (this.ascendButtonHook) {
            var ascendButton = document.getElementById('ascendButton');
            if (ascendButton) {
                ascendButton.removeEventListener('click', this.ascendButtonHook);
            }
        }
    };
    
    GrandmatriarchsFlightPuzzle.prototype.onCheck = function() {
        // Check happens in reincarnate hook
        return;
    };
    
    function RuleLightsPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'ruleOfLightsTracking');
    }
    RuleLightsPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    RuleLightsPuzzle.prototype.constructor = RuleLightsPuzzle;
    
    RuleLightsPuzzle.prototype.initializeTracking = function() {
        return {
            expectedPattern: {
                // Clock positions: filled=12,3,4,5,6,8 → indexes 6,3,2,1,0,10
                filled: [0, 1, 2, 3, 6, 10],
                // Clock positions: empty=1,2,7,9,10,11 → indexes 5,4,11,9,8,7
                empty: [4, 5, 7, 8, 9, 11]
            }
        };
    };
    
    RuleLightsPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check rule of lights pattern');
    };
    
    RuleLightsPuzzle.prototype.onCheck = function() {
        if (!Game.wrinklers || Game.wrinklers.length < 12) {
            return;
        }
        
        var tracking = this.getTracking();
        var expectedPattern = tracking.expectedPattern;
        var patternMatches = true;
        
        for (var i = 0; i < expectedPattern.filled.length; i++) {
            var pos = expectedPattern.filled[i];
            if (pos < Game.wrinklers.length && Game.wrinklers[pos].close !== 1) {
                patternMatches = false;
                break;
            }
        }
        
        if (patternMatches) {
            for (var i = 0; i < expectedPattern.empty.length; i++) {
                var pos = expectedPattern.empty[i];
                if (pos < Game.wrinklers.length && Game.wrinklers[pos].close === 1) {
                    patternMatches = false;
                    break;
                }
            }
        }
        
        if (patternMatches) {
            this.complete();
        }
    };
    
    function NursesFieldsPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'nursesInFieldsTracking');
    }
    NursesFieldsPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    NursesFieldsPuzzle.prototype.constructor = NursesFieldsPuzzle;
    
    NursesFieldsPuzzle.prototype.initializeTracking = function() {
        return {
            currentStep: 1,
            step1Completed: false,
            step2Completed: false,
            hooked: false
        };
    };
    
    NursesFieldsPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check nurses in fields puzzle');
    };
    
    NursesFieldsPuzzle.prototype.onCheck = function() {
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (!M.plot || !M.plantsById) {
            return;
        }
        
        var tracking = this.getTracking();
        
        var step1Pattern = [
            ['Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip'],
            ['Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip'],
            ['Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip'],
            ['Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip'],
            ['Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip'],
            ['Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip']
        ];
        
        var step2Pattern = [
            ['EMPTY', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'EMPTY'],
            ['Nursetulip', 'EMPTY', 'Nursetulip', 'Nursetulip', 'EMPTY', 'Nursetulip'],
            ['Nursetulip', 'Nursetulip', 'EMPTY', 'EMPTY', 'Nursetulip', 'Nursetulip'],
            ['Nursetulip', 'Nursetulip', 'EMPTY', 'EMPTY', 'Nursetulip', 'Nursetulip'],
            ['Nursetulip', 'EMPTY', 'Nursetulip', 'Nursetulip', 'EMPTY', 'Nursetulip'],
            ['EMPTY', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'Nursetulip', 'EMPTY']
        ];
        
        // Check if current pattern matches either step or neither (which resets progress)
        var matchesStep1 = this.validateGardenPattern(M, step1Pattern, true);
        var matchesStep2 = this.validateGardenPattern(M, step2Pattern, false);
        
        var hasOnlyValidPlants = true;
        for (var y = 0; y < M.plot.length; y++) {
            for (var x = 0; x < M.plot[y].length; x++) {
                var plotData = M.plot[y][x];
                var step1Expected = step1Pattern[y][x];
                var step2Expected = step2Pattern[y][x];
                
                var currentPlant = 'EMPTY';
                if (plotData && plotData[0] > 0) {
                    var plantId = plotData[0] - 1;
                    var plant = M.plantsById[plantId];
                    currentPlant = plant ? plant.name : 'unknown';
                }
                
                var matchesStep1Pos = (currentPlant === step1Expected);
                var matchesStep2Pos = (currentPlant === step2Expected);
                
                if (!matchesStep1Pos && !matchesStep2Pos) {
                    hasOnlyValidPlants = false;
                    break;
                }
            }
            if (!hasOnlyValidPlants) break;
        }
        
        if (!hasOnlyValidPlants) {
            tracking.currentStep = 1;
            tracking.step1Completed = false;
            tracking.step2Completed = false;
            return;
        }
        
        if (matchesStep2 && tracking.step1Completed) {
            tracking.step2Completed = true;
            this.complete();
            return;
        }
        
        if (tracking.currentStep === 1 && !tracking.step1Completed && matchesStep1) {
            tracking.step1Completed = true;
            tracking.currentStep = 2;
        }
    };
    
    NursesFieldsPuzzle.prototype.validateGardenPattern = function(M, pattern, requireMature) {
        var allPlantsMature = true;
        var patternMatches = true;
        
        for (var y = 0; y < M.plot.length && y < pattern.length; y++) {
            for (var x = 0; x < M.plot[y].length && x < pattern[y].length; x++) {
                var plotData = M.plot[y][x];
                var expectedPlant = pattern[y][x];
                
                if (expectedPlant === 'EMPTY') {
                    if (plotData && plotData[0] > 0) {
                        patternMatches = false;
                        break;
                    }
                } else {
                    if (!plotData || plotData[0] <= 0) {
                        patternMatches = false;
                        break;
                    }
                    
                    var plantId = plotData[0] - 1;
                    var plant = M.plantsById[plantId];
                    
                    if (!plant || plant.name !== expectedPlant) {
                        patternMatches = false;
                        break;
                    }
                    
                    if (requireMature) {
                        var age = plotData[1] || 0;
                        var matureAge = plant.mature;
                        if (age < matureAge) {
                            allPlantsMature = false;
                        }
                    }
                }
            }
            if (!patternMatches) break;
        }
        
        return patternMatches && (!requireMature || allPlantsMature);
    };
    
    // Simple puzzle: Check bakery name
    function MakingFriendshipPuzzle(puzzleId, puzzleData, registry) {
        SimpleHookPuzzle.call(this, puzzleId, puzzleData, registry);
    }
    MakingFriendshipPuzzle.prototype = Object.create(SimpleHookPuzzle.prototype);
    MakingFriendshipPuzzle.prototype.constructor = MakingFriendshipPuzzle;
    MakingFriendshipPuzzle.prototype.onCheck = function() {
        var name = Game.bakeryName.toLowerCase();
        if (name.includes('friend')) {
            this.complete();
        }
    };
    
    // State tracking puzzle: Track cookies sent
    function SmallTokenPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'lastCookiesSent');
    }
    SmallTokenPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    SmallTokenPuzzle.prototype.constructor = SmallTokenPuzzle;
    SmallTokenPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check gift send puzzle');
    };
    SmallTokenPuzzle.prototype.initializeTracking = function() {
        return { lastCookiesSent: Game.cookiesSent || 0 };
    };
    SmallTokenPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        var current = Game.cookiesSent || 0;
        var delta = current - tracking.lastCookiesSent;
        if (delta === 1) {
            this.complete();
        }
        tracking.lastCookiesSent = current;
    };
    
    function SilentChoirPuzzle(puzzleId, puzzleData, registry) {
        SimpleHookPuzzle.call(this, puzzleId, puzzleData, registry);
    }
    SilentChoirPuzzle.prototype = Object.create(SimpleHookPuzzle.prototype);
    SilentChoirPuzzle.prototype.constructor = SilentChoirPuzzle;
    SilentChoirPuzzle.prototype.onCheck = function() {
        var allMutedCorrectly = true;
        
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            
            if (building.name !== 'Cursor') {
                if (building.muted !== 1) {
                    allMutedCorrectly = false;
                    break;
                }
            } else {
                // Cursors should NOT be muted (muted === 0)
                if (building.muted !== 0) {
                    allMutedCorrectly = false;
                    break;
                }
            }
        }
        
        if (allMutedCorrectly) {
            this.complete();
        }
    };
    
    function SendWordPuzzle(puzzleId, puzzleData, registry) {
        SimpleHookPuzzle.call(this, puzzleId, puzzleData, registry);
    }
    SendWordPuzzle.prototype = Object.create(SimpleHookPuzzle.prototype);
    SendWordPuzzle.prototype.constructor = SendWordPuzzle;
    SendWordPuzzle.prototype.onCheck = function() {
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (!M.plot || !M.plantsById) {
            return;
        }
        
        if (M.soil !== 4) {
            return;
        }
        
        // Check if any Tidygrass is growing in the garden
        var hasTidygrass = false;
        
        for (var y = 0; y < M.plot.length; y++) {
            for (var x = 0; x < M.plot[y].length; x++) {
                var plotData = M.plot[y][x];
                
                if (plotData && plotData[0] > 0) {
                    var plantId = plotData[0] - 1;
                    var plant = M.plantsById[plantId];
                    
                    if (plant && plant.name === 'Tidygrass') {
                        hasTidygrass = true;
                        break;
                    }
                }
            }
            if (hasTidygrass) break;
        }
        
        if (hasTidygrass) {
            this.complete();
        }
    };
    
    function CloseCallPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'lastCookiesSentCloseCall');
    }
    CloseCallPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    CloseCallPuzzle.prototype.constructor = CloseCallPuzzle;
    CloseCallPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check close_call puzzle');
    };
    CloseCallPuzzle.prototype.initializeTracking = function() {
        return { lastCookiesSentCloseCall: Game.cookiesSent || 0 };
    };
    CloseCallPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        var current = Game.cookiesSent || 0;
        var delta = current - tracking.lastCookiesSentCloseCall;
        
        if (delta === 55) {
            this.complete();
        }
        
        tracking.lastCookiesSentCloseCall = current;
    };
    
    function BlessingCreatorPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'lastCookiesSent');
    }
    BlessingCreatorPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    BlessingCreatorPuzzle.prototype.constructor = BlessingCreatorPuzzle;
    BlessingCreatorPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check blessing puzzle');
    };
    BlessingCreatorPuzzle.prototype.initializeTracking = function() {
        return { lastCookiesSent: Game.cookiesSent || 0 };
    };
    BlessingCreatorPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        var current = Game.cookiesSent || 0;
        var delta = current - tracking.lastCookiesSent;
        
        if (delta === 777) {
            this.complete();
        }
        
        tracking.lastCookiesSent = current;
    };
    BlessingCreatorPuzzle.prototype.onCleanup = function() {
        // Remove the blessing puzzle info note
        removeBlessingPuzzleInfo();
    };
    
    function BuiltTrustPuzzle(puzzleId, puzzleData, registry) {
        SimpleHookPuzzle.call(this, puzzleId, puzzleData, registry);
    }
    BuiltTrustPuzzle.prototype = Object.create(SimpleHookPuzzle.prototype);
    BuiltTrustPuzzle.prototype.constructor = BuiltTrustPuzzle;
    BuiltTrustPuzzle.prototype.onCheck = function() {
        // Explicitly check if puzzle is still valid
        if (!this.isValid()) {
            return false;
        }
        
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return false;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (!M.plot || !M.plantsById) {
            return false;
        }
        
        // Check if entire garden is filled with mature Golden Clovers
        var isComplete = true;
        
        for (var y = 0; y < M.plot.length; y++) {
            for (var x = 0; x < M.plot[y].length; x++) {
                var plotData = M.plot[y][x];
                
                if (!plotData || plotData[0] <= 0) {
                    isComplete = false;
                    break;
                }
                
                var plantId = plotData[0] - 1;
                var plant = M.plantsById[plantId];
                var plantAge = plotData[1];
                
                if (!plant || plant.name !== 'Golden clover') {
                    isComplete = false;
                    break;
                }
                
                if (plantAge < plant.mature) {
                    isComplete = false;
                    break;
                }
            }
            if (!isComplete) break;
        }
        
        if (isComplete) {
            return this.complete();
        }
        
        return false;
    };
    
    function SpiralFortunePuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'stockMarketTracking');
    }
    SpiralFortunePuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    SpiralFortunePuzzle.prototype.constructor = SpiralFortunePuzzle;
    SpiralFortunePuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check spiral puzzle');
    };
    SpiralFortunePuzzle.prototype.initializeTracking = function() {
        return { 
            fibonacciSequence: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233],
            completed: false
        };
    };
    SpiralFortunePuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        
        // Guard against double/triple completion
        if (tracking.completed) {
            return;
        }
        
        if (!Game.Objects['Bank'] || !Game.Objects['Bank'].minigame) {
            return;
        }
        
        var M = Game.Objects['Bank'].minigame;
        if (!M.goodsById || M.goodsById.length < 14) {
            return;
        }
        
        var allMatch = true;
        for (var i = 0; i < 14; i++) {
            var good = M.goodsById[i];
            var expectedStock = tracking.fibonacciSequence[i];
            var actualStock = good ? good.stock : 0;
            
            if (actualStock !== expectedStock) {
                allMatch = false;
                break;
            }
        }
        
        if (allMatch) {
            tracking.completed = true;
            this.complete();
        }
    };
    
    function WrinklerClockPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'wrinklerTracking');
    }
    WrinklerClockPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    WrinklerClockPuzzle.prototype.constructor = WrinklerClockPuzzle;
    WrinklerClockPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check wrinkler clock puzzle');
    };
    WrinklerClockPuzzle.prototype.initializeTracking = function() {
        return {
            expectedPattern: {
                filled: [2, 3, 5, 8, 9, 11],
                empty: [0, 1, 4, 6, 7, 10]
            }
        };
    };
    WrinklerClockPuzzle.prototype.onCheck = function() {
        if (!Game.wrinklers || Game.wrinklers.length < 12) {
            return;
        }
        
        var tracking = this.getTracking();
        var expectedPattern = tracking.expectedPattern;
        var patternMatches = true;
        
        for (var i = 0; i < expectedPattern.filled.length; i++) {
            var pos = expectedPattern.filled[i];
            if (pos < Game.wrinklers.length && Game.wrinklers[pos].close !== 1) {
                patternMatches = false;
                break;
            }
        }
        
        if (patternMatches) {
            for (var i = 0; i < expectedPattern.empty.length; i++) {
                var pos = expectedPattern.empty[i];
                if (pos < Game.wrinklers.length && Game.wrinklers[pos].close === 1) {
                    patternMatches = false;
                    break;
                }
            }
        }
        
        if (patternMatches) {
            this.complete();
        }
    };
    
    function FeastFourPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'feastOfFourTracking');
    }
    FeastFourPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    FeastFourPuzzle.prototype.constructor = FeastFourPuzzle;
    FeastFourPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check feast of four puzzle');
    };
    FeastFourPuzzle.prototype.initializeTracking = function() {
        return {
            heartDrops: ['Pure heart biscuits','Ardent heart biscuits','Sour heart biscuits','Weeping heart biscuits','Golden heart biscuits','Eternal heart biscuits','Prism heart biscuits'],
            halloweenCookies: ['Skull cookies','Ghost cookies','Bat cookies','Slime cookies','Pumpkin cookies','Eyeball cookies','Spider cookies'],
            christmasCookies: ['Christmas tree biscuits','Snowflake biscuits','Snowman biscuits','Holly biscuits','Candy cane biscuits','Bell biscuits','Present biscuits']
        };
    };
    FeastFourPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        
        var easterComplete = Game.GetHowManyEggs && Game.GetHowManyEggs() === 19;
        
        var halloweenOwned = 0;
        for (var i = 0; i < tracking.halloweenCookies.length; i++) {
            if (Game.Has(tracking.halloweenCookies[i])) {
                halloweenOwned++;
            }
        }
        var halloweenComplete = halloweenOwned === 6;
        
        var christmasOwned = 0;
        for (var i = 0; i < tracking.christmasCookies.length; i++) {
            if (Game.Has(tracking.christmasCookies[i])) {
                christmasOwned++;
            }
        }
        var christmasComplete = christmasOwned === 6;
        
        var valentinesOwned = 0;
        for (var i = 0; i < tracking.heartDrops.length; i++) {
            if (Game.Has(tracking.heartDrops[i])) {
                valentinesOwned++;
            }
        }
        var valentinesComplete = valentinesOwned === 6;
        
        if (easterComplete && halloweenComplete && christmasComplete && valentinesComplete) {
            this.complete();
        }
    };
    
    function VeiledLedgerPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'veiledLedgerTracking');
    }
    VeiledLedgerPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    VeiledLedgerPuzzle.prototype.constructor = VeiledLedgerPuzzle;
    VeiledLedgerPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check veiled ledger puzzle');
    };
    VeiledLedgerPuzzle.prototype.initializeTracking = function() {
        return {
            expectedStocks: {
                3: 36,
                11: 67,
                12: 170
            }
        };
    };
    VeiledLedgerPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        
        if (!Game.Objects['Bank'] || !Game.Objects['Bank'].minigame) {
            return;
        }
        
        var M = Game.Objects['Bank'].minigame;
        if (!M.goodsById || M.goodsById.length < 14) {
            return;
        }
        
        var allMatch = true;
        
        // Only check the specific expected stocks (indices 3, 11, 12)
        for (var i in tracking.expectedStocks) {
            var good = M.goodsById[i];
            var actualStock = good ? good.stock : 0;
            var expectedStock = tracking.expectedStocks[i];
            
            if (actualStock !== expectedStock) {
                allMatch = false;
                break;
            }
        }
        
        if (allMatch) {
            this.complete();
        }
    };
    
    function RingingHallsPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'cursorsCantBeMutedTracking');
    }
    RingingHallsPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    RingingHallsPuzzle.prototype.constructor = RingingHallsPuzzle;
    RingingHallsPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check cursors cant be muted puzzle');
    };
    RingingHallsPuzzle.prototype.initializeTracking = function() {
        return {
            unmutedBuildings: [0, 1, 6, 8, 11, 13, 17, 19],
            completed: false
        };
    };
    RingingHallsPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        var allMutedCorrectly = true;
        
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            var shouldBeUnmuted = tracking.unmutedBuildings.indexOf(i) !== -1;
            
            if (shouldBeUnmuted) {
                if (building.muted !== 0) {
                    allMutedCorrectly = false;
                    break;
                }
            } else {
                if (building.muted !== 1) {
                    allMutedCorrectly = false;
                    break;
                }
            }
        }
        
        if (allMutedCorrectly) {
            this.complete();
        }
    };
    
    function LedgerBondsPuzzle(puzzleId, puzzleData, registry) {
        SimpleHookPuzzle.call(this, puzzleId, puzzleData, registry);
    }
    LedgerBondsPuzzle.prototype = Object.create(SimpleHookPuzzle.prototype);
    LedgerBondsPuzzle.prototype.constructor = LedgerBondsPuzzle;
    LedgerBondsPuzzle.prototype.onCheck = function() {
        var targetCounts = {
            'Shipment': 180,
            'Farm': 120,
            'Mine': 180,
            'Bank': 360,
            'Temple': 120,
            'Time machine': 210,
            'Fractal engine': 105
        };
        
        var allTargetsMet = true;
        
        for (var buildingName in targetCounts) {
            var buildingObj = Game.Objects[buildingName];
            if (!buildingObj) {
                allTargetsMet = false;
                break;
            }
            
            var currentCount = buildingObj.amount;
            var targetCount = targetCounts[buildingName];
            
            if (currentCount !== targetCount) {
                allTargetsMet = false;
                break;
            }
        }
        
        if (allTargetsMet) {
            this.complete();
        }
    };
    
    function SigilsPuzzle(puzzleId, puzzleData, registry) {
        SimpleHookPuzzle.call(this, puzzleId, puzzleData, registry);
    }
    SigilsPuzzle.prototype = Object.create(SimpleHookPuzzle.prototype);
    SigilsPuzzle.prototype.constructor = SigilsPuzzle;
    SigilsPuzzle.prototype.onCheck = function() {
        var name = Game.bakeryName.toLowerCase();
        if (name === 'sigils') {
            this.complete();
        }
    };
    
    function VaultedRelicsPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'vaultedRelicsTracking');
    }
    VaultedRelicsPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    VaultedRelicsPuzzle.prototype.constructor = VaultedRelicsPuzzle;
    VaultedRelicsPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check vaulted relics puzzle');
    };
    VaultedRelicsPuzzle.prototype.initializeTracking = function() {
        return {
            completed: false
        };
    };
    VaultedRelicsPuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        
        if (tracking.completed) {
            return;
        }
        
        var vaultedCount = 0;
        
        for (var upgradeId in Game.Upgrades) {
            var upgrade = Game.Upgrades[upgradeId];
            if (upgrade && 
                upgrade.unlocked === 1 && 
                upgrade.bought === 0 && 
                upgrade.isVaulted && 
                upgrade.isVaulted()) {
                vaultedCount++;
            }
        }
        
        if (vaultedCount >= 6) {
            tracking.completed = true;
            this.complete();
        }
    };
    
    function GardenPatternPuzzle(puzzleId, puzzleData, registry) {
        SimpleHookPuzzle.call(this, puzzleId, puzzleData, registry);
    }
    GardenPatternPuzzle.prototype = Object.create(SimpleHookPuzzle.prototype);
    GardenPatternPuzzle.prototype.constructor = GardenPatternPuzzle;
    GardenPatternPuzzle.prototype.onCheck = function() {
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (!M.plot || !M.plantsById) {
            return;
        }
        
        var expectedPattern = [
            ['Elderwort', 'Elderwort', 'Everdaisy', 'Everdaisy', 'Elderwort', 'Elderwort'],
            ['Elderwort', 'Elderwort', 'Everdaisy', 'Everdaisy', 'Elderwort', 'Elderwort'],
            ['Everdaisy', 'Everdaisy', 'Everdaisy', 'Everdaisy', 'Everdaisy', 'Everdaisy'],
            ['Everdaisy', 'Everdaisy', 'Everdaisy', 'Everdaisy', 'Everdaisy', 'Everdaisy'],
            ['Elderwort', 'Elderwort', 'Everdaisy', 'Everdaisy', 'Elderwort', 'Elderwort'],
            ['Elderwort', 'Elderwort', 'Everdaisy', 'Everdaisy', 'Elderwort', 'Elderwort']
        ];
        
        var allPlantsMature = true;
        
        for (var y = 0; y < M.plot.length && y < expectedPattern.length; y++) {
            for (var x = 0; x < M.plot[y].length && x < expectedPattern[y].length; x++) {
                var plotData = M.plot[y][x];
                var expectedPlant = expectedPattern[y][x];
                
                if (!plotData || plotData[0] <= 0) {
                    return;
                }
                
                var plantId = plotData[0] - 1;
                var plant = M.plantsById[plantId];
                
                if (!plant || plant.name !== expectedPlant) {
                    return;
                }
                
                var age = plotData[1] || 0;
                var matureAge = plant.mature;
                if (age < matureAge) {
                    allPlantsMature = false;
                }
            }
        }
        
        if (allPlantsMature) {
            this.complete();
        }
    };
    
    function SixJarsLedgerPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'sixJarsLedgerTracking');
    }
    SixJarsLedgerPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    SixJarsLedgerPuzzle.prototype.constructor = SixJarsLedgerPuzzle;
    SixJarsLedgerPuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check six jars ledger puzzle');
    };
    SixJarsLedgerPuzzle.prototype.initializeTracking = function() {
        return { 
            hooked: false,
            completed: false
        };
    };
    SixJarsLedgerPuzzle.prototype.onCheck = function() {
        if (!Game.Objects['Bank'] || !Game.Objects['Bank'].minigame) {
            return;
        }
        var M = Game.Objects['Bank'].minigame;
        if (!M.goodsById || M.goodsById.length < 18) {
            return;
        }
        
        var expectedStocks = { 0: 60, 1: 102, 2: 51, 3: 0, 4: 0, 5: 30, 6: 90, 7: 90, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0 };
        
        var tracking = this.getTracking();
        
        // Guard against double completion
        if (tracking.completed) {
            return;
        }
        
        for (var i = 0; i < 18; i++) {
            var actualStock = M.goodsById[i] ? M.goodsById[i].stock : 0;
            if (actualStock !== expectedStocks[i]) {
                return;
            }
        }
        
        tracking.completed = true;
        this.complete();
    };
    
    function GardenMazePuzzle(puzzleId, puzzleData, registry) {
        SimpleHookPuzzle.call(this, puzzleId, puzzleData, registry);
    }
    GardenMazePuzzle.prototype = Object.create(SimpleHookPuzzle.prototype);
    GardenMazePuzzle.prototype.constructor = GardenMazePuzzle;
    GardenMazePuzzle.prototype.onCheck = function() {
        // Explicitly check if puzzle is still valid (BasePuzzle.check already does this, but being explicit)
        if (!this.isValid()) {
            return false;
        }
        
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return false;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (!M.plot || !M.plantsById) {
            return false;
        }
        
        if (M.soil !== 2) {
            return false;
        }
        
        var expectedPattern = [
            ['Everdaisy', 'EMPTY', 'Everdaisy', 'Baker\'s wheat', 'Golden clover', 'Baker\'s wheat'],
            ['White chocoroot', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'Ordinary clover'],
            ['Baker\'s wheat', 'Chocoroot', 'Shriekbulb', 'Shriekbulb', 'EMPTY', 'Ordinary clover'],
            ['Baker\'s wheat', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'Whiskerbloom'],
            ['Baker\'s wheat', 'EMPTY', 'Shriekbulb', 'Shriekbulb', 'Tidygrass', 'Baker\'s wheat'],
            ['Elderwort', 'EMPTY', 'Elderwort', 'Baker\'s wheat', 'Baker\'s wheat', 'Baker\'s wheat']
        ];
        
        for (var y = 0; y < M.plot.length && y < expectedPattern.length; y++) {
            for (var x = 0; x < M.plot[y].length && x < expectedPattern[y].length; x++) {
                var plotData = M.plot[y][x];
                var expectedPlant = expectedPattern[y][x];
                
                if (expectedPlant === 'EMPTY') {
                    if (plotData && plotData[0] > 0) {
                        return false;
                    }
                } else {
                    if (!plotData || plotData[0] <= 0) {
                        return false;
                    }
                    
                    var plantId = plotData[0] - 1;
                    var plant = M.plantsById[plantId];
                    
                    if (!plant || plant.name !== expectedPlant) {
                        return false;
                    }
                }
            }
        }
        
        // Pattern matches - complete the puzzle
        return this.complete();
    };
    
    function GardenSigilPuzzle(puzzleId, puzzleData, registry) {
        SimpleHookPuzzle.call(this, puzzleId, puzzleData, registry);
        this.harvestHooked = false;
    }
    GardenSigilPuzzle.prototype = Object.create(SimpleHookPuzzle.prototype);
    GardenSigilPuzzle.prototype.constructor = GardenSigilPuzzle;
    GardenSigilPuzzle.prototype.onSetup = function() {
        // Call parent's onSetup to register the main check hook
        SimpleHookPuzzle.prototype.onSetup.call(this);
        
        this.setupHarvestHook();
        // Also register a check hook to setup harvest hook if minigame loads later
        var self = this;
        this.registerHook('check', function() {
            if (!self.harvestHooked && Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
                self.setupHarvestHook();
            }
        }, 'Garden setup check');
    };
    GardenSigilPuzzle.prototype.setupHarvestHook = function() {
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return;
        }
        
        var M = Game.Objects['Farm'].minigame;
        var hookKey = '_originalHarvest_gardenSigil';
        var hookFlag = '_gardenSigilHarvestHooked';
        
        if (M.harvest && typeof M.harvest === 'function' && !M[hookFlag]) {
            var self = this;
            // Store the current function (which might be vanilla or another puzzle's wrapper)
            M[hookKey] = M.harvest;
            M.harvest = function(x, y) {
                
                // Check BEFORE harvest to see what we're harvesting and if puzzle is still active
                var plantNameBefore = null;
                var shouldComplete = false;
                
                // Only validate if this puzzle is still the current active puzzle
                if (self.isValid()) {
                    var plotDataBefore = M.plot[y] ? M.plot[y][x] : null;
                    
                    if (plotDataBefore && plotDataBefore[0] > 0) {
                        var plantIdBefore = plotDataBefore[0] - 1;
                        var plantBefore = M.plantsById[plantIdBefore];
                        if (plantBefore) {
                            plantNameBefore = plantBefore.name;
                        }
                    }
                    
                    
                    // First, validate the full garden pattern
                    var expectedPattern = [
                        ['Golden clover', 'Ordinary clover', 'Ordinary clover', 'Ordinary clover', 'Ordinary clover', 'Golden clover'],
                        ['Ordinary clover', 'Golden clover', 'Ordinary clover', 'Ordinary clover', 'Golden clover', 'Ordinary clover'],
                        ['Ordinary clover', 'Ordinary clover', 'Golden clover', 'Golden clover', 'Ordinary clover', 'Ordinary clover'],
                        ['Ordinary clover', 'Ordinary clover', 'Golden clover', 'Golden clover', 'Ordinary clover', 'Ordinary clover'],
                        ['Ordinary clover', 'Golden clover', 'Ordinary clover', 'Ordinary clover', 'Golden clover', 'Ordinary clover'],
                        ['Golden clover', 'Ordinary clover', 'Ordinary clover', 'Ordinary clover', 'Ordinary clover', 'Golden clover']
                    ];
                    
                    var patternValid = true;
                    for (var py = 0; py < M.plot.length && py < expectedPattern.length; py++) {
                        for (var px = 0; px < M.plot[py].length && px < expectedPattern[py].length; px++) {
                            var pData = M.plot[py][px];
                            var expectedPlant = expectedPattern[py][px];
                            
                            if (!pData || pData[0] <= 0) {
                                patternValid = false;
                                break;
                            }
                            
                            var pPlantId = pData[0] - 1;
                            var pPlant = M.plantsById[pPlantId];
                            var pPlantAge = pData[1];
                            
                            if (!pPlant || pPlant.name !== expectedPlant || pPlantAge < pPlant.mature) {
                                patternValid = false;
                                break;
                            }
                        }
                        if (!patternValid) break;
                    }
                    
                    if (!patternValid) {
                    } else {
                        if (plantNameBefore && plantNameBefore.toLowerCase() === 'golden clover' && (y === 2 || y === 3)) {
                            shouldComplete = true;
                        } else {
                        }
                    }
                } else {
                }
                
                // Call original harvest function (which might be vanilla or another puzzle's wrapper)
                var result = M[hookKey].apply(this, arguments);
                
                // Complete puzzle AFTER harvest if conditions were met BEFORE harvest
                if (shouldComplete) {
                    self.complete();
                }
                
                return result;
            };
            M[hookFlag] = true;
            this.harvestHooked = true;
        } else {
        }
    };
    GardenSigilPuzzle.prototype.onCleanup = function() {
        if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
            var M = Game.Objects['Farm'].minigame;
            var hookKey = '_originalHarvest_gardenSigil';
            var hookFlag = '_gardenSigilHarvestHooked';
            
            // Only restore if we actually hooked it and the current function is our wrapper
            if (M[hookFlag] && M[hookKey]) {
                // Check if the current harvest function is our wrapper by checking if it exists and references our hookKey
                if (M.harvest && typeof M.harvest === 'function') {
                    M.harvest = M[hookKey];
                }
                delete M[hookKey];
                delete M[hookFlag];
                M._gardenSigilPuzzleCompleted = true;
            }
        }
    };
    GardenSigilPuzzle.prototype.onCheck = function() {
        
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (!M.plot || !M.plantsById) {
            return;
        }
        
        var expectedPattern = [
            ['Golden clover', 'Ordinary clover', 'Ordinary clover', 'Ordinary clover', 'Ordinary clover', 'Golden clover'],
            ['Ordinary clover', 'Golden clover', 'Ordinary clover', 'Ordinary clover', 'Golden clover', 'Ordinary clover'],
            ['Ordinary clover', 'Ordinary clover', 'Golden clover', 'Golden clover', 'Ordinary clover', 'Ordinary clover'],
            ['Ordinary clover', 'Ordinary clover', 'Golden clover', 'Golden clover', 'Ordinary clover', 'Ordinary clover'],
            ['Ordinary clover', 'Golden clover', 'Ordinary clover', 'Ordinary clover', 'Golden clover', 'Ordinary clover'],
            ['Golden clover', 'Ordinary clover', 'Ordinary clover', 'Ordinary clover', 'Ordinary clover', 'Golden clover']
        ];
        
        var mismatchCount = 0;
        var mismatchDetails = [];
        
        for (var y = 0; y < M.plot.length && y < expectedPattern.length; y++) {
            for (var x = 0; x < M.plot[y].length && x < expectedPattern[y].length; x++) {
                var plotData = M.plot[y][x];
                var expectedPlant = expectedPattern[y][x];
                
                if (!plotData || plotData[0] <= 0) {
                    mismatchCount++;
                    mismatchDetails.push(`[${x},${y}] empty or no plant`);
                    continue;
                }
                
                var plantId = plotData[0] - 1;
                var plant = M.plantsById[plantId];
                var plantAge = plotData[1];
                
                if (!plant) {
                    mismatchCount++;
                    mismatchDetails.push(`[${x},${y}] plant not found for id ${plantId}`);
                    continue;
                }
                
                if (plant.name !== expectedPlant) {
                    mismatchCount++;
                    mismatchDetails.push(`[${x},${y}] expected "${expectedPlant}" but found "${plant.name}"`);
                    continue;
                }
                
                if (plantAge < plant.mature) {
                    mismatchCount++;
                    mismatchDetails.push(`[${x},${y}] plant not mature (age ${plantAge} < mature ${plant.mature})`);
                    continue;
                }
            }
        }
        
        if (mismatchCount === 0) {
        }
    };
    
    // Grimoire spell hook: Initiation Riddle - Track consecutive spell casts
    function InitiationRiddlePuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'spellTracking');
        this.spellHooked = false;
    }
    InitiationRiddlePuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    InitiationRiddlePuzzle.prototype.constructor = InitiationRiddlePuzzle;
    InitiationRiddlePuzzle.prototype.initializeTracking = function() {
        return {
            lastSpellId: null,
            consecutiveCastCount: 0,
            firstCastTime: null,
            originalCastSpell: null,
            hooked: false,
            completed: false
        };
    };
    InitiationRiddlePuzzle.prototype.onSetup = function() {
        this.setupSpellHook();
        // Also register a check hook to setup spell hook if minigame loads later
        var self = this;
        this.registerHook('check', function() {
            if (!self.spellHooked && Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].minigame) {
                self.setupSpellHook();
            }
        }, 'Check for grimoire minigame availability');
    };
    InitiationRiddlePuzzle.prototype.setupSpellHook = function() {
        if (!Game.Objects['Wizard tower'] || !Game.Objects['Wizard tower'].minigame) {
            return;
        }
        
        var M = Game.Objects['Wizard tower'].minigame;
        var tracking = this.getTracking();
        
        if (M.castSpell && typeof M.castSpell === 'function' && !tracking.hooked) {
            var self = this;
            tracking.originalCastSpell = M.castSpell;
            
            M.castSpell = function(spell, obj) {
                var result = tracking.originalCastSpell.call(this, spell, obj);
                
                setTimeout(function() {
                    self.checkSpellCast(spell);
                }, 0);
                
                return result;
            };
            
            tracking.hooked = true;
            this.spellHooked = true;
        }
    };
    InitiationRiddlePuzzle.prototype.checkSpellCast = function(spell) {
        if (!this.isValid()) {
            return;
        }
        
        var tracking = this.getTracking();
        
        // Guard against double completion
        if (tracking.completed) {
            return;
        }
        
        var currentTime = Date.now();
        var spellId = spell.id || spell.name || 'unknown';
        
        if (spellId === tracking.lastSpellId) {
            if (tracking.consecutiveCastCount === 0) {
                tracking.firstCastTime = currentTime;
            }
            tracking.consecutiveCastCount++;
            
            //all spells cast within 60 seconds (updated from 30 seconds in earlier versions)
            if (tracking.consecutiveCastCount === 3 && (currentTime - tracking.firstCastTime) <= 60000) {
                tracking.completed = true;
                this.complete();
            } else if (tracking.consecutiveCastCount > 3) {
                tracking.consecutiveCastCount = 0;
                tracking.firstCastTime = null;
            }
        } else {
            tracking.lastSpellId = spellId;
            tracking.consecutiveCastCount = 1;
            tracking.firstCastTime = currentTime;
        }
    };
    InitiationRiddlePuzzle.prototype.onCleanup = function() {
        if (Game.Objects['Wizard tower'] && Game.Objects['Wizard tower'].minigame) {
            var M = Game.Objects['Wizard tower'].minigame;
            var tracking = this.getTracking();
            
            if (tracking && tracking.hooked && tracking.originalCastSpell) {
                M.castSpell = tracking.originalCastSpell;
            }
        }
    };
    InitiationRiddlePuzzle.prototype.onCheck = function() {
        // Check happens in spell cast hook
        return;
    };
    
    // Pantheon sequence hook: Spirits Thrones - Place/remove gods in specific sequence
    function SpiritsThronesPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'throneSequence');
        this.pantheonHooked = false;
    }
    SpiritsThronesPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    SpiritsThronesPuzzle.prototype.constructor = SpiritsThronesPuzzle;
    SpiritsThronesPuzzle.prototype.initializeTracking = function() {
        return {
            currentStep: 0,
            expectedSequence: [
                { god: 'Vomitrax, Spirit of Decadence', throne: 1, description: 'blood' },
                { god: 'Godzamok, Spirit of Ruin', throne: 0, description: 'brilliance' },
                { god: 'Dotjeiess, Spirit of Creation', throne: 2, description: 'verdant' }
            ],
            stepStartTime: null,
            stepPhase: 'waiting',
            previousSlotState: null,
            hooked: false,
            originalSlot: null,
            slotProxy: null,
            completed: false
        };
    };
    SpiritsThronesPuzzle.prototype.onSetup = function() {
        this.setupPantheonHook();
        var self = this;
        this.registerHook('check', function() {
            if (!self.pantheonHooked && Game.Objects['Temple'] && Game.Objects['Temple'].minigame) {
                self.setupPantheonHook();
            }
        }, 'Check for temple minigame availability');
    };
    SpiritsThronesPuzzle.prototype.setupPantheonHook = function() {
        if (!Game.Objects['Temple'] || !Game.Objects['Temple'].minigame) {
            return;
        }
        
        var pantheon = Game.Objects['Temple'].minigame;
        var tracking = this.getTracking();
        
        if (pantheon && pantheon.slot && Array.isArray(pantheon.slot) && !tracking.hooked) {
            var self = this;
            var originalSlot = pantheon.slot;
            
            var slotProxy = new Proxy(originalSlot, {
                set: function(target, property, value) {
                    target[property] = value;
                    // Call directly - no setTimeout needed since we're already in the mutation handler
                        self.checkSequenceStep();
                    return true;
                }
            });
            
            pantheon.slot = slotProxy;
            tracking.originalSlot = originalSlot;
            tracking.slotProxy = slotProxy;
            tracking.previousSlotState = originalSlot.slice();
            tracking.hooked = true;
            this.pantheonHooked = true;
        }
    };
    SpiritsThronesPuzzle.prototype.checkSequenceStep = function() {
        if (!this.isValid()) {
            return;
        }
        
        var sequence = this.getTracking();
        
        // Guard against double/triple completion from queued setTimeout calls
        if (sequence.completed) {
            return;
        }
        
        if (!Game.Objects['Temple'] || !Game.Objects['Temple'].minigame) {
            return;
        }
        
        var pantheon = Game.Objects['Temple'].minigame;
        if (!pantheon || !pantheon.slot || !Array.isArray(pantheon.slot)) {
            return;
        }
        
        var currentStep = sequence.currentStep;
        if (currentStep >= sequence.expectedSequence.length) {
            return;
        }
        
        var expectedStep = sequence.expectedSequence[currentStep];
        var expectedGod = expectedStep.god;
        var expectedThrone = expectedStep.throne;
        var currentPhase = sequence.stepPhase;
        
        var currentSlot = pantheon.slot;
        var godsCurrentlySlotted = [];
        
        for (var throneIndex = 0; throneIndex < currentSlot.length; throneIndex++) {
            var slotValue = currentSlot[throneIndex];
            
            if (slotValue !== -1 && slotValue !== null && slotValue !== undefined) {
                var godInThrone = null;
                if (pantheon.godsById && pantheon.godsById[slotValue]) {
                    godInThrone = pantheon.godsById[slotValue].name;
                }
                
                if (godInThrone) {
                    godsCurrentlySlotted.push({
                        name: godInThrone,
                        throne: throneIndex
                    });
                }
            }
        }
        
        var hasAnyGods = godsCurrentlySlotted.length > 0;
        var expectedGodInCorrectThrone = false;
        var expectedGodInWrongThrone = false;
        var hasOtherGods = false;
        
        for (var i = 0; i < godsCurrentlySlotted.length; i++) {
            var slottedGod = godsCurrentlySlotted[i];
            if (slottedGod.name === expectedGod) {
                if (slottedGod.throne === expectedThrone) {
                    expectedGodInCorrectThrone = true;
                } else {
                    expectedGodInWrongThrone = true;
                }
            } else {
                hasOtherGods = true;
            }
        }
        
        if (currentPhase === 'waiting') {
            if (expectedGodInCorrectThrone && !hasOtherGods) {
                sequence.stepPhase = 'placed';
                sequence.stepStartTime = Date.now();
            } else if (expectedGodInWrongThrone || hasOtherGods) {
                this.resetSequence();
            }
        } else if (currentPhase === 'placed') {
            if (!hasAnyGods) {
                sequence.stepPhase = 'completed';
                sequence.currentStep++;
                
                if (sequence.currentStep >= sequence.expectedSequence.length) {
                    sequence.completed = true;
                    this.complete();
                } else {
                    sequence.stepPhase = 'waiting';
                    sequence.stepStartTime = null;
                }
            } else if (expectedGodInCorrectThrone && !hasOtherGods) {
                // Still correctly placed
            } else if (expectedGodInWrongThrone && !hasOtherGods) {
                var nextStep = currentStep + 1;
                if (nextStep < sequence.expectedSequence.length) {
                    var nextExpectedThrone = sequence.expectedSequence[nextStep].throne;
                    var expectedGodInNextThrone = false;
                    for (var i = 0; i < godsCurrentlySlotted.length; i++) {
                        var slottedGod = godsCurrentlySlotted[i];
                        if (slottedGod.name === expectedGod && slottedGod.throne === nextExpectedThrone) {
                            expectedGodInNextThrone = true;
                            break;
                        }
                    }
                    
                    if (expectedGodInNextThrone) {
                        sequence.currentStep = nextStep;
                        sequence.stepPhase = 'placed';
                        sequence.stepStartTime = Date.now();
                    } else {
                        this.resetSequence();
                    }
                } else {
                    this.resetSequence();
                }
            } else if (hasOtherGods) {
                this.resetSequence();
            }
        }
    };
    SpiritsThronesPuzzle.prototype.resetSequence = function() {
        var sequence = this.getTracking();
        sequence.currentStep = 0;
        sequence.stepPhase = 'waiting';
        sequence.stepStartTime = null;
    };
    SpiritsThronesPuzzle.prototype.onCleanup = function() {
        if (Game.Objects['Temple'] && Game.Objects['Temple'].minigame) {
            var pantheon = Game.Objects['Temple'].minigame;
            var sequence = this.getTracking();
            
            if (sequence && sequence.hooked && sequence.originalSlot) {
                pantheon.slot = sequence.originalSlot;
            }
        }
    };
    SpiritsThronesPuzzle.prototype.onCheck = function() {
        // Check happens in Proxy hook
        return;
    };
    
    function BrothersMasqueradePuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'cloneTracking');
    }
    BrothersMasqueradePuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    BrothersMasqueradePuzzle.prototype.constructor = BrothersMasqueradePuzzle;
    BrothersMasqueradePuzzle.prototype.initializeTracking = function() {
        return {
            completed: false,
            hooksDisabled: false
        };
    };
    BrothersMasqueradePuzzle.prototype.onSetup = function() {
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check YouCustomizer and bakery name');
    };
    BrothersMasqueradePuzzle.prototype.onCheck = function() {
        var tracking = this.getTracking();
        if (tracking.hooksDisabled || tracking.completed) {
            return;
        }
        
        if (!Game.YouCustomizer || !Game.YouCustomizer.currentGenes) {
            return;
        }
        
        var genes = Game.YouCustomizer.currentGenes;
        var bakeryName = Game.bakeryName;
        
        var bakeryNameValid = bakeryName.toLowerCase().includes('sebastian');
        if (!bakeryNameValid) {
            return;
        }
        
        var hairValid = (genes[0] === 13 || genes[0] === 0);
        var hairColorValid = (genes[1] === 0);
        var skinColorValid = (genes[2] === 14 || genes[2] === 3 || genes[2] === 6);
        
        var extraA = genes[5];
        var extraB = genes[6];
        
        var extraAIsSevenOrNine = (extraA === 6 || extraA === 8);
        var extraBIsSevenOrNine = (extraB === 6 || extraB === 8);
        var extraAIsTwoToFive = (extraA === 1 || extraA === 2 || extraA === 3 || extraA === 4);
        var extraBIsTwoToFive = (extraB === 1 || extraB === 2 || extraB === 3 || extraB === 4);
        
        var extrasValid = (extraAIsSevenOrNine && extraBIsTwoToFive) || (extraBIsSevenOrNine && extraAIsTwoToFive);
        
        var allConditionsMet = hairValid && hairColorValid && skinColorValid && extrasValid && bakeryNameValid;
        
        if (allConditionsMet) {
            // Set completed flag IMMEDIATELY before calling complete() to block other check() calls
            tracking.completed = true;
            tracking.hooksDisabled = true;
            // Now call complete() - the flag is already set to prevent race conditions
            this.complete();
        }
    };
    
    // Dragon aura sequence hook: They Are Watching - Track aura changes in sequence
    function TheyAreWatchingPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'theyAreWatchingTracking');
        this.auraHooked = false;
    }
    TheyAreWatchingPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    TheyAreWatchingPuzzle.prototype.constructor = TheyAreWatchingPuzzle;
    TheyAreWatchingPuzzle.prototype.initializeTracking = function() {
        return {
            currentStep: 0,
            stepCompleted: false,
            hooked: false,
            _originalDragonAura: 0,
            _originalDragonAura2: 0
        };
    };
    TheyAreWatchingPuzzle.prototype.onSetup = function() {
        this.setupAuraHook();
    };
    TheyAreWatchingPuzzle.prototype.setupAuraHook = function() {
        var tracking = this.getTracking();
        if (tracking.hooked) {
            return;
        }
        
        var self = this;
        
        // Capture current auras when hooking (not at initialization)
        var originalDragonAura = Game.dragonAura || 0;
        var originalDragonAura2 = Game.dragonAura2 || 0;
        tracking._originalDragonAura = originalDragonAura;
        tracking._originalDragonAura2 = originalDragonAura2;
        
        // Use property overrides to detect ALL changes to dragon auras
        // Store references to current aura values so cleanup can access them
        tracking._currentDragonAura = originalDragonAura;
        tracking._currentDragonAura2 = originalDragonAura2;
        
        Object.defineProperty(Game, 'dragonAura', {
            get: function() { return originalDragonAura; },
            set: function(value) {
                originalDragonAura = value;
                tracking._currentDragonAura = value;
                if (self.isValid()) {
                    self.checkAuraSequence();
                }
            },
            configurable: true
        });
        
        Object.defineProperty(Game, 'dragonAura2', {
            get: function() { return originalDragonAura2; },
            set: function(value) {
                originalDragonAura2 = value;
                tracking._currentDragonAura2 = value;
                if (self.isValid()) {
                    self.checkAuraSequence();
                }
            },
            configurable: true
        });
        
        tracking.hooked = true;
        this.auraHooked = true;
    };
    TheyAreWatchingPuzzle.prototype.checkAuraSequence = function() {
        var tracking = this.getTracking();
        var currentAura1 = Game.dragonAura || 0;
        var currentAura2 = Game.dragonAura2 || 0;
        var currentAuras = [currentAura1, currentAura2];
        
        if (tracking.currentStep === 0) {
            var hasRadiantAppetite = currentAuras.includes(14);
            var hasRealityBending = currentAuras.includes(18);
            var hasOnlyTheseTwoAuras = currentAuras.filter(function(aura) { return aura !== 0; }).length === 2;
            
            if (hasRadiantAppetite && hasRealityBending && hasOnlyTheseTwoAuras) {
                tracking.currentStep = 1;
                tracking.stepCompleted = false;
            }
        }
        else if (tracking.currentStep === 1) {
            var hasOnlyRealityBending = currentAuras.includes(14);
            var hasOnlyOneAura = currentAuras.filter(function(aura) { return aura !== 0; }).length === 1;
            
            if (hasOnlyRealityBending && hasOnlyOneAura && !tracking.stepCompleted) {
                tracking.stepCompleted = true;
                this.complete();
            }
        }
    };
    TheyAreWatchingPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        // Get current values before removing property overrides
        var currentAura1 = tracking && tracking._currentDragonAura !== undefined ? tracking._currentDragonAura : (tracking && tracking._originalDragonAura !== undefined ? tracking._originalDragonAura : 0);
        var currentAura2 = tracking && tracking._currentDragonAura2 !== undefined ? tracking._currentDragonAura2 : (tracking && tracking._originalDragonAura2 !== undefined ? tracking._originalDragonAura2 : 0);
        
        // Remove our property overrides
        if (Game.dragonAura !== undefined && Object.getOwnPropertyDescriptor(Game, 'dragonAura')) {
            delete Game.dragonAura;
            // Restore as normal writable property with current value
            Game.dragonAura = currentAura1;
        }
        if (Game.dragonAura2 !== undefined && Object.getOwnPropertyDescriptor(Game, 'dragonAura2')) {
            delete Game.dragonAura2;
            // Restore as normal writable property with current value
            Game.dragonAura2 = currentAura2;
        }
    };
    TheyAreWatchingPuzzle.prototype.onCheck = function() {
        // Check happens when aura properties are set
        return;
    };
    
    function ProvingPatiencePuzzle(puzzleId, puzzleData, registry) {
        BasePuzzle.call(this, puzzleId, puzzleData, registry);
        this.lilyHooked = false;
    }
    ProvingPatiencePuzzle.prototype = Object.create(BasePuzzle.prototype);
    ProvingPatiencePuzzle.prototype.constructor = ProvingPatiencePuzzle;
    ProvingPatiencePuzzle.prototype.onSetup = function() {
        this.setupLilyHook();
        var self = this;
        this.registerHook('check', function() {
            if (!self.lilyHooked && Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
                self.setupLilyHook();
            }
        }, 'Check for farm minigame availability');
    };
    ProvingPatiencePuzzle.prototype.setupLilyHook = function() {
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (M.plants && M.plants['shimmerlily'] && !M.plants['shimmerlily']._lilyPuzzleHooked) {
            var self = this;
            var originalOnDie = M.plants['shimmerlily'].onDie;
            
            M.plants['shimmerlily'].onDie = function(x, y) {
                if (originalOnDie) {
                    originalOnDie.call(this, x, y);
                }
                self.checkLilyDeath(x, y);
            };
            
            M.plants['shimmerlily']._lilyPuzzleHooked = true;
            M._lilyPuzzleHooked = true;
            this.lilyHooked = true;
        }
    };
    ProvingPatiencePuzzle.prototype.checkLilyDeath = function(x, y) {
        if (!this.isValid()) {
            return;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (!M || !M.plot) {
            return;
        }
        
        var otherPlantsCount = 0;
        for (var plotY = 0; plotY < M.plot.length; plotY++) {
            for (var plotX = 0; plotX < M.plot[plotY].length; plotX++) {
                var tile = M.plot[plotY][plotX];
                if (tile[0] > 0) {
                    otherPlantsCount++;
                }
            }
        }
        
        if (otherPlantsCount === 0) {
            this.complete();
        }
    };
    ProvingPatiencePuzzle.prototype.onCleanup = function() {
        if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
            var M = Game.Objects['Farm'].minigame;
            if (M.plants && M.plants['shimmerlily'] && M.plants['shimmerlily']._lilyPuzzleHooked) {
                M.plants['shimmerlily']._lilyPuzzleHooked = false;
                M._lilyPuzzleHooked = false;
            }
        }
    };
    ProvingPatiencePuzzle.prototype.onCheck = function() {
        // Check happens in onDie hook
        return;
    };
    
    // Season sequence hook: Spiral Seasons - Track season changes
    function SpiralSeasonsPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'seasonSequence');
        this.seasonHooked = false;
    }
    SpiralSeasonsPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    SpiralSeasonsPuzzle.prototype.constructor = SpiralSeasonsPuzzle;
    SpiralSeasonsPuzzle.prototype.initializeTracking = function() {
        return {
            seasonSequence: [],
            lastSeason: Game.season || '',
            originalSeason: Game.season,
            completed: false
        };
    };
    SpiralSeasonsPuzzle.prototype.onSetup = function() {
        this.setupSeasonHook();
    };
    SpiralSeasonsPuzzle.prototype.setupSeasonHook = function() {
        var tracking = this.getTracking();
        if (this.seasonHooked) {
            return;
        }
        
        var self = this;
        var originalSeason = Game.season;
        tracking.originalSeason = originalSeason;
        
        Object.defineProperty(Game, 'season', {
            get: function() {
                return originalSeason;
            },
            set: function(newSeason) {
                var oldSeason = originalSeason;
                originalSeason = newSeason;
                
                if (oldSeason !== newSeason && newSeason !== '') {
                    setTimeout(function() {
                        self.checkSeasonSequence(newSeason);
                    }, 0);
                }
            },
            configurable: true
        });
        
        this.seasonHooked = true;
    };
    SpiralSeasonsPuzzle.prototype.checkSeasonSequence = function(currentSeason) {
        if (!this.isValid()) {
            return;
        }
        
        var tracking = this.getTracking();
        tracking.seasonSequence.push(currentSeason);
        tracking.lastSeason = currentSeason;
        
        var requiredSequence = ['valentines', 'christmas', 'fools', 'easter', 'halloween', 'christmas', 'halloween'];
        var currentSequence = tracking.seasonSequence;
        var matches = true;
        
        for (var i = 0; i < currentSequence.length && i < requiredSequence.length; i++) {
            if (currentSequence[i] !== requiredSequence[i]) {
                matches = false;
                break;
            }
        }
        
        if (!matches) {
            tracking.seasonSequence = [];
            tracking.lastSeason = currentSeason;
        } else if (currentSequence.length >= requiredSequence.length) {
            if (!tracking.completed) {
                tracking.completed = true;
            this.complete();
            }
        }
    };
    SpiralSeasonsPuzzle.prototype.onCleanup = function() {
        var tracking = this.getTracking();
        if (this.seasonHooked) {
            Object.defineProperty(Game, 'season', {
                value: tracking.originalSeason || '',
                writable: true,
                configurable: true
            });
        }
    };
    SpiralSeasonsPuzzle.prototype.onCheck = function() {
        // Check happens in season setter hook
        return;
    };
    
    // Building buy/sell sequence: Rite Shifting Measures - Track building actions
    function RiteShiftingMeasuresPuzzle(puzzleId, puzzleData, registry) {
        SequencePuzzle.call(this, puzzleId, puzzleData, registry, 'buildingSequence');
    }
    RiteShiftingMeasuresPuzzle.prototype = Object.create(SequencePuzzle.prototype);
    RiteShiftingMeasuresPuzzle.prototype.constructor = RiteShiftingMeasuresPuzzle;
    RiteShiftingMeasuresPuzzle.prototype.initializeTracking = function() {
        var initialCounts = {};
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            initialCounts[building.name] = building.amount;
        }
        
        return {
            currentStep: 0,
            stepTargets: [
                { building: 'Shipment', action: 'sell', amount: 5 },
                { building: 'Portal', action: 'buy', amount: 6 },
                { building: 'Prism', action: 'buy', amount: 9 },
                { building: 'Bank', action: 'sell', amount: 12 },
                { building: 'Wizard tower', action: 'buy', amount: 11 }
            ],
            stepStartCounts: [],
            initialBuildingCounts: initialCounts,
            sequenceComplete: false
        };
    };
    RiteShiftingMeasuresPuzzle.prototype.onSetup = function() {
        var tracking = this.getTracking();
        var currentStep = tracking.currentStep;
        if (currentStep < tracking.stepTargets.length) {
            var targetBuilding = tracking.stepTargets[currentStep].building;
            var buildingObj = Game.Objects[targetBuilding];
            if (buildingObj) {
                tracking.stepStartCounts[currentStep] = buildingObj.amount;
            }
        }
        
        // Hook into all building buy/sell functions
        this.hookBuildingBuySell();
        
        var self = this;
        this.registerHook('check', function() {
            self.check();
        }, 'Check building sequence');
    };
    
    RiteShiftingMeasuresPuzzle.prototype.hookBuildingBuySell = function() {
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            
            if (!building._originalBuyRiteMeasures) {
                building._originalBuyRiteMeasures = building.buy;
                building._originalSellRiteMeasures = building.sell;
            }
            
            var self = this;
            var originalBuy = building._originalBuyRiteMeasures;
            var originalSell = building._originalSellRiteMeasures;
            
            building.buy = function(amount) {
                var result = originalBuy.call(this, amount);
                setTimeout(function() {
                    self.onCheck();
                }, 0);
                return result;
            };
            
            building.sell = function(amount, bypass) {
                var result = originalSell.call(this, amount, bypass);
                setTimeout(function() {
                    self.onCheck();
                }, 0);
                return result;
            };
        }
    };
    RiteShiftingMeasuresPuzzle.prototype.onCheck = function() {
        if (!this.isValid()) {
            return;
        }
        
        var tracking = this.getTracking();
        if (tracking.sequenceComplete) {
            return;
        }
        
        var currentStep = tracking.currentStep;
        
        // Safety check: if we've completed all steps, just return
        // The actual completion is handled after step completion to avoid double-triggering
        if (currentStep >= tracking.stepTargets.length) {
            return;
        }
        
        var stepTarget = tracking.stepTargets[currentStep];
        var buildingObj = Game.Objects[stepTarget.building];
        if (!buildingObj) {
            return;
        }
        
        var currentCount = buildingObj.amount;
        var stepStartCount = tracking.stepStartCounts[currentStep];
        if (stepStartCount === undefined) {
            return;
        }
        
        // Check if they're working on the wrong building type
        var wrongBuildingChanged = false;
        var sequenceBuildings = [];
        for (var j = 0; j < tracking.stepTargets.length; j++) {
            sequenceBuildings.push(tracking.stepTargets[j].building);
        }
        
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            var initialCount = tracking.initialBuildingCounts[building.name] || 0;
            
            if (sequenceBuildings.indexOf(building.name) === -1 && building.amount !== initialCount) {
                wrongBuildingChanged = true;
                break;
            }
        }
        
        if (wrongBuildingChanged) {
            // Reset the sequence
            tracking.currentStep = 0;
            tracking.stepStartCounts = [];
            tracking.sequenceComplete = false;
            
            // Update initial counts to current state
            for (var k = 0; k < Game.ObjectsById.length; k++) {
                var b = Game.ObjectsById[k];
                tracking.initialBuildingCounts[b.name] = b.amount;
            }
            
            // Reinitialize the first step
            var firstStepTarget = tracking.stepTargets[0];
            var firstBuildingObj = Game.Objects[firstStepTarget.building];
            if (firstBuildingObj) {
                tracking.stepStartCounts[0] = firstBuildingObj.amount;
            }
            return;
        }
        
        // Check if the current step is complete
        var targetCount;
        if (stepTarget.action === 'sell') {
            targetCount = stepStartCount - stepTarget.amount;
        } else if (stepTarget.action === 'buy') {
            targetCount = stepStartCount + stepTarget.amount;
        }
        
        var stepComplete = (currentCount === targetCount);
        
        if (stepComplete) {
            tracking.currentStep++;
            
            if (tracking.currentStep >= tracking.stepTargets.length) {
                // Set sequenceComplete BEFORE calling complete() to prevent double completion
                tracking.sequenceComplete = true;
                this.complete();
            } else {
                // Initialize the next step
                var nextStepTarget = tracking.stepTargets[tracking.currentStep];
                var nextBuildingObj = Game.Objects[nextStepTarget.building];
                if (nextBuildingObj) {
                    tracking.stepStartCounts[tracking.currentStep] = nextBuildingObj.amount;
                }
            }
        }
    };
    
    RiteShiftingMeasuresPuzzle.prototype.onCleanup = function() {
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            if (building._originalBuyRiteMeasures) {
                building.buy = building._originalBuyRiteMeasures;
                building.sell = building._originalSellRiteMeasures;
                delete building._originalBuyRiteMeasures;
                delete building._originalSellRiteMeasures;
            }
        }
    };
    
    // Building sell tracking: Track specific building sales, reset on wrong building
    function BuildingSellTrackingPuzzle(puzzleId, puzzleData, registry, buildingName, requiredAmount) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'buildingSellTracking');
        this.targetBuilding = buildingName;
        this.requiredAmount = requiredAmount;
        this.sellHooked = false;
    }
    BuildingSellTrackingPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    BuildingSellTrackingPuzzle.prototype.constructor = BuildingSellTrackingPuzzle;
    BuildingSellTrackingPuzzle.prototype.initializeTracking = function() {
        var initialCounts = {};
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            initialCounts[building.name] = building.amount;
        }
        return {
            buildingsSold: 0,
            initialBuildingCounts: initialCounts,
            completed: false
        };
    };
    BuildingSellTrackingPuzzle.prototype.onSetup = function() {
        this.hookBuildingSells();
    };
    BuildingSellTrackingPuzzle.prototype.hookBuildingSells = function() {
        if (this.sellHooked) {
            return;
        }
        
        var self = this;
        var hookKey = '_originalSell' + this.puzzleId;
        
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            
            if (!building[hookKey]) {
                building[hookKey] = building.sell;
                
                (function(bldg, origSell) {
                    bldg.sell = function(amount, bypass) {
                        var buildingName = bldg.name;
                        var countBefore = bldg.amount;
                        var result = origSell.call(bldg, amount, bypass);
                        var countAfter = bldg.amount;
                        var actualSold = countBefore - countAfter;
                        
                        setTimeout(function() {
                            self.checkBuildingSell(buildingName, actualSold);
                        }, 0);
                        
                        return result;
                    };
                })(building, building[hookKey]);
            }
        }
        
        this.sellHooked = true;
    };
    BuildingSellTrackingPuzzle.prototype.checkBuildingSell = function(soldBuildingName, amountSold) {
        if (!this.isValid()) {
            return;
        }
        
        var tracking = this.getTracking();
        if (tracking.completed) {
            return;
        }
        
        if (soldBuildingName === this.targetBuilding && amountSold > 0) {
            tracking.buildingsSold += amountSold;
            
            if (tracking.buildingsSold >= this.requiredAmount) {
                tracking.completed = true;
                this.complete();
            }
        } else if (soldBuildingName !== this.targetBuilding && amountSold > 0) {
            tracking.buildingsSold = 0;
            tracking.completed = false;
            
            for (var i = 0; i < Game.ObjectsById.length; i++) {
                var building = Game.ObjectsById[i];
                tracking.initialBuildingCounts[building.name] = building.amount;
            }
        }
    };
    BuildingSellTrackingPuzzle.prototype.onCleanup = function() {
        var hookKey = '_originalSell' + this.puzzleId;
        for (var i = 0; i < Game.ObjectsById.length; i++) {
            var building = Game.ObjectsById[i];
            if (building[hookKey]) {
                building.sell = building[hookKey];
                delete building[hookKey];
            }
        }
    };
    BuildingSellTrackingPuzzle.prototype.onCheck = function() {
        // Check happens in sell hook
        return;
    };
    
    // Spy Purge: Sell exactly 27 grandmas from peak, check every 60 seconds
    function SpyPurgePuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'spyPurgeTracking');
        this.sellHooked = false;
        this.buyHooked = false;
        this.deferredCheck = null;
    }
    SpyPurgePuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    SpyPurgePuzzle.prototype.constructor = SpyPurgePuzzle;
    
    SpyPurgePuzzle.prototype.initializeTracking = function() {
        var grandma = Game.Objects['Grandma'];
        return { peakGrandmaCount: grandma ? grandma.amount : 0, lastCount: grandma ? grandma.amount : 0, completed: false };
    };
    
    SpyPurgePuzzle.prototype.onSetup = function() {
        this.getTracking();
        this.hookGrandmaActions();
        var self = this;
        this.deferredCheck = setTimeout(function() { self.resetPeakIfNoAction(); }, 60000);
    };
    
    SpyPurgePuzzle.prototype.hookGrandmaActions = function() {
        if (this.sellHooked && this.buyHooked) return;
        var self = this;
        var grandma = Game.Objects['Grandma'];
        if (!grandma) return;
        
        if (!this.sellHooked) {
            grandma._originalSpyPurgeSell = grandma.sell;
            grandma.sell = function(amount, bypass) {
                var countBefore = grandma.amount;
                var result = grandma._originalSpyPurgeSell.call(grandma, amount, bypass);
                var countAfter = grandma.amount;
                var isBuy = countAfter > countBefore;
                setTimeout(function() { self.onGrandmaAction(countAfter, isBuy); }, 0);
                return result;
            };
            this.sellHooked = true;
        }
        
        if (!this.buyHooked) {
            grandma._originalSpyPurgeBuy = grandma.buy;
            grandma.buy = function(amount) {
                var countBefore = grandma.amount;
                var result = grandma._originalSpyPurgeBuy.call(grandma, amount);
                var countAfter = grandma.amount;
                var isBuy = countAfter > countBefore;
                setTimeout(function() { self.onGrandmaAction(countAfter, isBuy); }, 0);
                return result;
            };
            this.buyHooked = true;
        }
    };
    
    SpyPurgePuzzle.prototype.onGrandmaAction = function(currentCount, isBuy) {
        if (!this.isValid()) return;
        var tracking = this.getTracking();
        if (tracking.completed) return;
        
        if (isBuy) {
            // Buy: reset peak immediately
            tracking.peakGrandmaCount = currentCount;
        }
        tracking.lastCount = currentCount;
        
        this.checkAchievement();
        
        clearTimeout(this.deferredCheck);
        var self = this;
        // Only reset timer on sells (isBuy === false), not on buys
        if (!isBuy) {
            this.deferredCheck = setTimeout(function() { self.resetPeakIfNoAction(); }, 60000);
        }
    };
    
    SpyPurgePuzzle.prototype.checkAchievement = function() {
        if (!this.isValid()) return;
        var tracking = this.getTracking();
        if (tracking.completed) return;
        var grandma = Game.Objects['Grandma'];
        if (!grandma) return;
        
        var soldFromPeak = tracking.peakGrandmaCount - grandma.amount;
        
        if (soldFromPeak === 27) {
            tracking.completed = true;
            this.complete();
        }
    };
    
    SpyPurgePuzzle.prototype.resetPeakIfNoAction = function() {
        if (!this.isValid() || this.getTracking().completed) return;
        var tracking = this.getTracking();
        var grandma = Game.Objects['Grandma'];
        if (grandma) tracking.peakGrandmaCount = tracking.lastCount = grandma.amount;
    };
    
    SpyPurgePuzzle.prototype.onCleanup = function() {
        if (this.deferredCheck) clearTimeout(this.deferredCheck);
        var grandma = Game.Objects['Grandma'];
        if (grandma) {
            if (grandma._originalSpyPurgeSell) { grandma.sell = grandma._originalSpyPurgeSell; delete grandma._originalSpyPurgeSell; }
            if (grandma._originalSpyPurgeBuy) { grandma.buy = grandma._originalSpyPurgeBuy; delete grandma._originalSpyPurgeBuy; }
        }
        StateTrackingPuzzle.prototype.onCleanup.call(this);
    };
    
    SpyPurgePuzzle.prototype.onCheck = function() { return; };
    
    // Brother Onto You: Sell exactly 18 mines from peak, check every 60 seconds
    function BrotherOntoYouPuzzle(puzzleId, puzzleData, registry) {
        StateTrackingPuzzle.call(this, puzzleId, puzzleData, registry, 'brotherOntoYouTracking');
        this.sellHooked = false;
        this.buyHooked = false;
        this.deferredCheck = null;
    }
    BrotherOntoYouPuzzle.prototype = Object.create(StateTrackingPuzzle.prototype);
    BrotherOntoYouPuzzle.prototype.constructor = BrotherOntoYouPuzzle;
    
    BrotherOntoYouPuzzle.prototype.initializeTracking = function() {
        var mine = Game.Objects['Mine'];
        return { peakMineCount: mine ? mine.amount : 0, lastCount: mine ? mine.amount : 0, completed: false };
    };
    
    BrotherOntoYouPuzzle.prototype.onSetup = function() {
        this.getTracking();
        this.hookMineActions();
        var self = this;
        this.deferredCheck = setTimeout(function() { self.resetPeakIfNoAction(); }, 60000);
    };
    
    BrotherOntoYouPuzzle.prototype.hookMineActions = function() {
        if (this.sellHooked && this.buyHooked) return;
        var self = this;
        var mine = Game.Objects['Mine'];
        if (!mine) return;
        
        if (!this.sellHooked) {
            mine._originalBrotherOntoSell = mine.sell;
            mine.sell = function(amount, bypass) {
                var countBefore = mine.amount;
                var result = mine._originalBrotherOntoSell.call(mine, amount, bypass);
                var countAfter = mine.amount;
                var isBuy = countAfter > countBefore;
                setTimeout(function() { self.onMineAction(countAfter, isBuy); }, 0);
                return result;
            };
            this.sellHooked = true;
        }
        
        if (!this.buyHooked) {
            mine._originalBrotherOntoBuy = mine.buy;
            mine.buy = function(amount) {
                var countBefore = mine.amount;
                var result = mine._originalBrotherOntoBuy.call(mine, amount);
                var countAfter = mine.amount;
                var isBuy = countAfter > countBefore;
                setTimeout(function() { self.onMineAction(countAfter, isBuy); }, 0);
                return result;
            };
            this.buyHooked = true;
        }
    };
    
    BrotherOntoYouPuzzle.prototype.onMineAction = function(currentCount, isBuy) {
        if (!this.isValid()) return;
        var tracking = this.getTracking();
        if (tracking.completed) return;
        
        if (isBuy) {
            // Buy: reset peak immediately
            tracking.peakMineCount = currentCount;
        }
        tracking.lastCount = currentCount;
        
        this.checkAchievement();
        
        clearTimeout(this.deferredCheck);
        var self = this;
        // Only reset timer on sells (isBuy === false), not on buys
        if (!isBuy) {
            this.deferredCheck = setTimeout(function() { self.resetPeakIfNoAction(); }, 60000);
        }
    };
    
    BrotherOntoYouPuzzle.prototype.checkAchievement = function() {
        if (!this.isValid()) return;
        var tracking = this.getTracking();
        if (tracking.completed) return;
        var mine = Game.Objects['Mine'];
        if (!mine) return;
        
        if (tracking.peakMineCount - mine.amount === 18) {
            tracking.completed = true;
            this.complete();
        }
    };
    
    BrotherOntoYouPuzzle.prototype.resetPeakIfNoAction = function() {
        if (!this.isValid() || this.getTracking().completed) return;
        var tracking = this.getTracking();
        var mine = Game.Objects['Mine'];
        if (mine) tracking.peakMineCount = tracking.lastCount = mine.amount;
    };
    
    BrotherOntoYouPuzzle.prototype.onCleanup = function() {
        if (this.deferredCheck) clearTimeout(this.deferredCheck);
        var mine = Game.Objects['Mine'];
        if (mine) {
            if (mine._originalBrotherOntoSell) { mine.sell = mine._originalBrotherOntoSell; delete mine._originalBrotherOntoSell; }
            if (mine._originalBrotherOntoBuy) { mine.buy = mine._originalBrotherOntoBuy; delete mine._originalBrotherOntoBuy; }
        }
        StateTrackingPuzzle.prototype.onCleanup.call(this);
    };
    
    BrotherOntoYouPuzzle.prototype.onCheck = function() { return; };
    
    // Garden harvestAll hook: Garden Hearts - Check pattern before harvest all
    function GardenHeartsPuzzle(puzzleId, puzzleData, registry) {
        BasePuzzle.call(this, puzzleId, puzzleData, registry);
        this.harvestHooked = false;
    }
    GardenHeartsPuzzle.prototype = Object.create(BasePuzzle.prototype);
    GardenHeartsPuzzle.prototype.constructor = GardenHeartsPuzzle;
    GardenHeartsPuzzle.prototype.onSetup = function() {
        this.setupHarvestAllHook();
    };
    GardenHeartsPuzzle.prototype.setupHarvestAllHook = function() {
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (!M._originalHarvestAll) {
            M._originalHarvestAll = M.harvestAll;
        }
        
        var self = this;
        M.harvestAll = function(type, mature, mortal) {
            // Capture state before harvest
            var before = [];
            for (var by = 0; by < M.plot.length; by++) {
                before[by] = [];
                for (var bx = 0; bx < M.plot[by].length; bx++) {
                    var plot = M.plot[by][bx];
                    if (plot && plot[0] > 0) {
                        var plantId = plot[0] - 1;
                        var plant = M.plantsById[plantId];
                        before[by][bx] = plant ? plant.name : null;
                    }
                }
            }
            
            M._originalHarvestAll(type, mature, mortal);
            
            // Check only bakeberries were harvested
            var bakeberryPos = [[2,2],[2,3],[3,2],[3,3]];
            var elderwortPos = [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,0],[1,5],[4,0],[4,5],[5,0],[5,1],[5,2],[5,3],[5,4],[5,5]];
            
            for (var i = 0; i < bakeberryPos.length; i++) {
                var bPos = bakeberryPos[i];
                var beforeRow = before[bPos[0]];
                var beforeName = beforeRow ? beforeRow[bPos[1]] : null;
                if (beforeName !== 'Bakeberry' && beforeName !== 'Duketater') {
                    return;
                }
                var afterPlot = M.plot[bPos[0]][bPos[1]];
                if (afterPlot && afterPlot[0] > 0) {
                    var afterPlantName = (function() {
                        if (!afterPlot || afterPlot[0] <= 0) { return null; }
                        var afterPlant = M.plantsById[afterPlot[0] - 1];
                        return afterPlant ? afterPlant.name : null;
                    })();
                    return;
                }
            }
            
            for (var j = 0; j < elderwortPos.length; j++) {
                var ePos = elderwortPos[j];
                var elderBeforeRow = before[ePos[0]];
                var elderBeforeName = elderBeforeRow ? elderBeforeRow[ePos[1]] : null;
                if (elderBeforeName !== 'Elderwort') {
                    return;
                }
                var after = M.plot[ePos[0]][ePos[1]];
                if (!after || after[0] <= 0) {
                    return;
                }
                var plantId = after[0] - 1;
                var plant = M.plantsById[plantId];
                if (!plant || plant.name !== 'Elderwort') {
                    return;
                }
            }
            
            self.complete();
        };
        
        this.harvestHooked = true;
    };
    GardenHeartsPuzzle.prototype.captureGardenState = function() {
        if (!this.isValid()) {
            return null;
        }
        
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return null;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (!M.plot || !M.plantsById) {
            return null;
        }
        
        var state = [];
        for (var y = 0; y < M.plot.length; y++) {
            state[y] = [];
            for (var x = 0; x < M.plot[y].length; x++) {
                var plotData = M.plot[y][x];
                if (plotData && plotData[0] > 0) {
                    var plantId = plotData[0] - 1;
                    var plant = M.plantsById[plantId];
                    state[y][x] = plant ? plant.name : null;
                } else {
                    state[y][x] = null;
                }
            }
        }
        
        return state;
    };
    GardenHeartsPuzzle.prototype.validateHarvestResult = function(beforeHarvest) {
        if (!this.isValid()) {
            return false;
        }
        
        if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigame) {
            return false;
        }
        
        var M = Game.Objects['Farm'].minigame;
        if (!M.plot || !M.plantsById) {
            return false;
        }
        
        // Bakeberry positions that should be harvested
        var bakeberryPositions = [
            [2, 2], [2, 3], [3, 2], [3, 3]
        ];
        
        // Elderwort positions that should NOT be harvested
        var elderwortPositions = [
            // Row 0 (top)
            [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
            // Row 1 (sides)
            [1, 0], [1, 5],
            // Row 4 (sides)
            [4, 0], [4, 5],
            // Row 5 (bottom)
            [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]
        ];
        
        // Check that bakeberries were harvested
        for (var i = 0; i < bakeberryPositions.length; i++) {
            var pos = bakeberryPositions[i];
            var y = pos[0];
            var x = pos[1];
            
            // Before harvest should have Bakeberry
            if (beforeHarvest[y] && beforeHarvest[y][x] !== 'Bakeberry') {
                return false;
            }
            
            // After harvest should be empty
            var plotData = M.plot[y][x];
                    if (plotData && plotData[0] > 0) {
                        return false;
                    }
        }
        
        // Check that elderwort remain
        for (var j = 0; j < elderwortPositions.length; j++) {
            var elderPos = elderwortPositions[j];
            var elderY = elderPos[0];
            var elderX = elderPos[1];
            
            // Before harvest should have Elderwort
            if (!beforeHarvest[elderY] || beforeHarvest[elderY][elderX] !== 'Elderwort') {
                        return false;
                    }
            
            // After harvest should still have Elderwort
            var elderPlotData = M.plot[elderY][elderX];
            if (!elderPlotData || elderPlotData[0] <= 0) {
                        return false;
                    }
            
            var elderPlantId = elderPlotData[0] - 1;
            var elderPlant = M.plantsById[elderPlantId];
            if (!elderPlant || elderPlant.name !== 'Elderwort') {
                return false;
            }
        }
        
        return true;
    };
    GardenHeartsPuzzle.prototype.onCleanup = function() {
        if (Game.Objects['Farm'] && Game.Objects['Farm'].minigame) {
            var M = Game.Objects['Farm'].minigame;
            if (M._originalHarvestAll) {
                M.harvestAll = M._originalHarvestAll;
            }
        }
    };
    GardenHeartsPuzzle.prototype.onCheck = function() {
        // Check happens in harvestAll hook
        return;
    };
    
    function getMissingPuzzleCompletionRequirements() {
        var missingRequirements = [];

        if (!Game || !Game.Objects) {
            missingRequirements.push({ type: 'system', label: 'Game state unavailable' });
            return missingRequirements;
        }

        var buildingRequirements = [
            { key: 'Farm', label: 'Level 9 farms', level: 9 },
            { key: 'Wizard tower', label: 'Level 1 wizard towers', level: 1 },
            { key: 'Temple', label: 'Level 1 temples', level: 1 },
            { key: 'Bank', label: 'Level 1 banks', level: 1 }
        ];

        for (var i = 0; i < buildingRequirements.length; i++) {
            var requirement = buildingRequirements[i];
            var building = Game.Objects[requirement.key];

            if (!building || typeof building.level !== 'number' || building.level < requirement.level) {
                missingRequirements.push({ type: 'building', label: requirement.label });
            }
        }

        var requiredAllTimeCookies = 8e55;
        var totalCookiesBaked = Game.cookiesEarned + Game.cookiesReset;

        if (!Number.isFinite(totalCookiesBaked) || totalCookiesBaked < requiredAllTimeCookies) {
            missingRequirements.push({ type: 'progress', label: '80 septendecillion cookies baked all time' });
        }

        var requiredHeavenlyUpgrades = [
            'Inspired checklist',
            'Golden switch',
            'Shimmering veil',
            'Season switcher',
            'Elder spice',
            'How to bake your dragon',
            'Classic dairy selection',
            'Basic wallpaper assortment',
            'Heralds',
            'Wrapping paper', 
            'Fanciful dairy selection',
            'Distinguished wallpaper assortment',
            'Sound test',
            'Pet the dragon'
        ];

        for (var j = 0; j < requiredHeavenlyUpgrades.length; j++) {
            var upgradeName = requiredHeavenlyUpgrades[j];

            if (!Game.Has(upgradeName)) {
                missingRequirements.push({ type: 'upgrade', label: upgradeName });
            }
        }

        return missingRequirements;
    }

    // Helper method for testing - set current puzzle number
    function setPuzzleProgress(puzzleNumber) {
        ensurePuzzleSystemInitialized();

        var maxIndex = -1;
        if (cookieAgeData.puzzles && cookieAgeData.puzzles.registry) {
            var registryKeys = Object.keys(cookieAgeData.puzzles.registry);
            maxIndex = registryKeys.length - 1;
        }

        if (typeof puzzleNumber !== 'number' || puzzleNumber < 0 || puzzleNumber > maxIndex) {
            return;
        }
        
        if (!Game.JNE) {
            Game.JNE = {};
        }
        
        var oldProgress = Game.JNE.cookieAgeProgress || 0;
        Game.JNE.cookieAgeProgress = puzzleNumber;

        // For testing: unlock all puzzles up to the target puzzle (bypass dependencies)
        var targetPuzzleId = getPuzzleIdByIndex(puzzleNumber);
        if (targetPuzzleId) {
            
            // Ensure completed puzzles array exists
            if (!cookieAgeData.puzzles.completed) {
                cookieAgeData.puzzles.completed = [];
            }
            
            // Mark all puzzles from 0 to target as completed
            for (var i = 0; i <= puzzleNumber; i++) {
                var puzzleId = getPuzzleIdByIndex(i);
                if (puzzleId && puzzleId !== targetPuzzleId) {
                    markPuzzleCompleted(puzzleId);
                }
            }
        }
        
        return puzzleNumber;
    }
    
    // Helper method for testing - get current puzzle info
    function getPuzzleInfo() {
        // Use track-based system instead of old progress-based system
        ensureTracksInitialized();
        
        var investigateActive = cookieAgeData.puzzles.tracks.investigate.active;
        var infiltrateActive = cookieAgeData.puzzles.tracks.infiltrate.active;
        var chooseActive = cookieAgeData.puzzles.tracks.choose.active;
        
        var activePuzzleId = investigateActive || infiltrateActive || chooseActive;
        var puzzleData = null;
        
        if (activePuzzleId) {
            puzzleData = cookieAgeData.puzzles.registry[activePuzzleId];
        }
        
        return {
            puzzleId: activePuzzleId,
            puzzleData: puzzleData,
            investigate: cookieAgeData.puzzles.tracks.investigate,
            infiltrate: cookieAgeData.puzzles.tracks.infiltrate,
            choose: cookieAgeData.puzzles.tracks.choose
        };
    }
    
    // Helper method for testing - mark puzzle as completed (bypass dependencies)
    function markPuzzleCompleted(puzzleId) {
        if (!cookieAgeData.puzzles.completed) {
            cookieAgeData.puzzles.completed = [];
        }
        
        if (cookieAgeData.puzzles.completed.indexOf(puzzleId) === -1) {
            cookieAgeData.puzzles.completed.push(puzzleId);
        }
        
        return cookieAgeData.puzzles.completed;
    }
    
    // Helper method for testing - mark all dependencies as completed for a puzzle
    function unlockPuzzleForTesting(puzzleId) {
        var puzzle = cookieAgeData.puzzles.registry[puzzleId];
        if (!puzzle) {
            return false;
        }
        
        // Mark all dependencies as completed
        for (var i = 0; i < puzzle.dependencies.length; i++) {
            markPuzzleCompleted(puzzle.dependencies[i]);
        }
        
        return true;
    }
    
    // Helper method for testing - reset puzzle system and set target puzzle
    function resetAndSetPuzzle(puzzleNumber) {
        
        // Deactivate current puzzle first
        if (typeof deactivateCurrentPuzzle === 'function') {
            deactivateCurrentPuzzle();
        }
        
        // Clear completed puzzles
        cookieAgeData.puzzles.completed = [];
        
        // Now set the puzzle progress (which will mark dependencies as completed)
        setPuzzleProgress(puzzleNumber);
    }
    
    // Helper method to complete currently active puzzle(s) and move to next
    function completeActivePuzzles() {
        ensurePuzzleSystemInitialized();
        ensureTracksInitialized();
        var investigateActive = cookieAgeData.puzzles.tracks.investigate.active;
        var infiltrateActive = cookieAgeData.puzzles.tracks.infiltrate.active;
        var chooseActive = cookieAgeData.puzzles.tracks.choose.active;
        
        var completed = [];
        
        if (investigateActive) {
            var puzzle = cookieAgeData.puzzles.registry[investigateActive];
            if (puzzle) {
                tryCompletePuzzle(investigateActive);
                completed.push(investigateActive + ' (' + puzzle.name + ')');
            }
        }
        
        if (infiltrateActive) {
            var puzzle = cookieAgeData.puzzles.registry[infiltrateActive];
            if (puzzle) {
                tryCompletePuzzle(infiltrateActive);
                completed.push(infiltrateActive + ' (' + puzzle.name + ')');
            }
        }
        
        if (chooseActive) {
            var puzzle = cookieAgeData.puzzles.registry[chooseActive];
            if (puzzle) {
                tryCompletePuzzle(chooseActive);
                completed.push(chooseActive + ' (' + puzzle.name + ')');
            }
        }
        
        if (completed.length > 0) {
            console.log('[Cookie Age] Completed active puzzles:', completed.join(', '));
            return completed;
        } else {
            console.log('[Cookie Age] No active puzzles to complete');
            return [];
        }
    }
    
    // Make helper methods available globally for console testing
    // Gate mutation-oriented console helpers behind debugMode to prevent cheating via console
    function __requireDebugForConsole() {
        if (!debugMode) {
            try { console.warn('[Cookie Age] Console command disabled unless debugMode is true.'); } catch (_) {}
            return false;
        }
        return true;
    }

    Game.setPuzzleProgress = function(puzzleNumber) {
        if (!__requireDebugForConsole()) return;
        setPuzzleProgress(puzzleNumber);
    };
    Game.getPuzzleInfo = getPuzzleInfo;
    Game.markPuzzleCompleted = function(puzzleId) {
        if (!__requireDebugForConsole()) return;
        markPuzzleCompleted(puzzleId);
    };
    Game.unlockPuzzleForTesting = function(puzzleId) {
        if (!__requireDebugForConsole()) return;
        unlockPuzzleForTesting(puzzleId);
    };
    Game.resetAndSetPuzzle = function(puzzleNumber) {
        if (!__requireDebugForConsole()) return;
        resetAndSetPuzzle(puzzleNumber);
    };
    Game.completeActivePuzzles = function() {
        if (!__requireDebugForConsole()) return [];
        return completeActivePuzzles();
    };
    
    function ensurePuzzleSystemInitialized() {
        // Ensure puzzle system is initialized if it doesn't exist
        if (!cookieAgeData.puzzles || !cookieAgeData.puzzles.tracks || !cookieAgeData.puzzles.tracks._initialized) {
            setupPuzzleSystem();
        } else {
            // Ensure hints system is initialized even if puzzles structure exists
            if (!cookieAgeData.puzzles.hints) {
                cookieAgeData.puzzles.hints = {
                    hintsUsed: 0,
                    lastHintTime: null,
                    puzzleActivationTimes: {
                        investigate: null,
                        infiltrate: null,
                        choose: null
                    },
                    purchasedHints: {}
                };
            }
            // Ensure completed array exists
            if (!cookieAgeData.puzzles.completed) {
                cookieAgeData.puzzles.completed = [];
            }
        }
    }
    
    function getActivePuzzleEntries(trackFilter) {
        ensureTracksInitialized();
        if (!cookieAgeData.puzzles || !cookieAgeData.puzzles.tracks) {
            return [];
        }

        var trackOrder = ['investigate', 'infiltrate', 'choose'];
        var results = [];

        for (var i = 0; i < trackOrder.length; i++) {
            var trackType = trackOrder[i];
            if (trackFilter && trackType !== trackFilter) {
                continue;
            }

            var trackState = cookieAgeData.puzzles.tracks[trackType];
            if (!trackState || !trackState.active) {
                continue;
            }

            var puzzleId = trackState.active;
            var puzzle = cookieAgeData.puzzles.registry[puzzleId];
            if (puzzle) {
                results.push({
                    id: puzzleId,
                    track: trackType,
                    puzzle: puzzle
                });
            }
        }

        return results;
    }

    function formatActivePuzzle(entry) {
        if (!entry) {
            return null;
        }

        var puzzle = entry.puzzle || (cookieAgeData.puzzles.registry ? cookieAgeData.puzzles.registry[entry.id] : null);
        if (!puzzle) {
            return {
                id: entry.id,
                track: entry.track,
                name: null,
                description: null,
                clue: null,
                completionMessage: null
            };
        }

        return {
            id: entry.id,
            track: entry.track,
            name: puzzle.name,
            description: processConditionalText(puzzle.description),
            clue: processConditionalText(puzzle.clue),
            completionMessage: processConditionalText(puzzle.completionMessage)
        };
    }

    function reinitializeActivePuzzles() {
        ensurePuzzleSystemInitialized();
        ensureTracksInitialized();

        if (cookieAgeData.puzzles && cookieAgeData.puzzles.registry) {
            for (var puzzleId in cookieAgeData.puzzles.registry) {
                if (!cookieAgeData.puzzles.registry.hasOwnProperty(puzzleId)) {
                    continue;
                }
                cleanupPuzzleHooks(puzzleId);
            }
        }

        var trackOrder = ['investigate', 'infiltrate', 'choose'];
        for (var i = 0; i < trackOrder.length; i++) {
            var trackType = trackOrder[i];
            var trackState = cookieAgeData.puzzles.tracks[trackType];
            if (!trackState) {
                continue;
            }

            if (trackState.active) {
                cleanupPuzzle(trackState.active);
                trackState.active = null;
            }

            activateNextPuzzleForTrack(trackType);
        }

        checkCrossTrackUnlocks('investigate');
        checkCrossTrackUnlocks('infiltrate');
        checkCrossTrackUnlocks('choose');

        return getActivePuzzleEntries();
    }
    
    // ===== CONDITIONAL TEXT PROCESSING =====
    function processConditionalText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }
        
        // Check if exposePathPicked is set
        var pathChoice = cookieAgeData.puzzles ? cookieAgeData.puzzles.exposePathPicked : null;
        
        // If no path choice made yet, return text as-is (for schism_choice before completion)
        if (pathChoice === null) {
            return text;
        }
        
        // Process conditional segments: {{expose:text for expose path||order:text for order path}}
        var processedText = text.replace(/\{\{expose:([^|]+)\|\|order:([^}]+)\}\}/g, function(match, exposeText, orderText) {
            return pathChoice ? exposeText : orderText;
        });
        
        return processedText;
    }
    
    function getPuzzleStatus() {
        // Ensure puzzle system is initialized
        ensurePuzzleSystemInitialized();
        
        var investigateActive = getActivePuzzleForTrack('investigate');
        var infiltrateActive = getActivePuzzleForTrack('infiltrate');
        
        // Get current puzzle for backward compatibility (first active puzzle)
        var currentPuzzle = null;
        var currentProgress = 0;
        
        if (investigateActive) {
            currentPuzzle = cookieAgeData.puzzles.registry[investigateActive];
            currentProgress = cookieAgeData.puzzles.tracks.investigate.progress;
        } else if (infiltrateActive) {
            currentPuzzle = cookieAgeData.puzzles.registry[infiltrateActive];
            currentProgress = cookieAgeData.puzzles.tracks.infiltrate.progress;
        }
        
        // Calculate total completed puzzles across both tracks
        var totalCompleted = (cookieAgeData.puzzles.tracks.investigate.progress || 0) + 
                            (cookieAgeData.puzzles.tracks.infiltrate.progress || 0);
        
        return {
            currentProgress: currentProgress,
            currentPuzzle: currentPuzzle ? {
                id: currentPuzzle.trackOrder,
                name: currentPuzzle.name,
                description: processConditionalText(currentPuzzle.description),
                isActive: true,
                isUnlocked: true,
                type: currentPuzzle.type
            } : null,
            totalPuzzles: Object.keys(cookieAgeData.puzzles.registry).length,
            totalCompleted: totalCompleted,
            tracks: {
                investigate: {
                    progress: cookieAgeData.puzzles.tracks.investigate.progress,
                    active: investigateActive
                },
                infiltrate: {
                    progress: cookieAgeData.puzzles.tracks.infiltrate.progress,
                    active: infiltrateActive
                }
            }
        };
    }
    
    // ===== NEWS TICKER SYSTEM =====
    var newsTickerFunction = null;
   
    function setupNewsTicker() {
        debugLog('Setting up news ticker for Mysteries of the Cookie...');
        
        // Don't set up if already active
        if (newsTickerFunction) {
            debugLog('News ticker already active, skipping setup');
            return;
        }
        
		// Hook into the game's ticker system using the proper mod hook
		if (Game.modHooks && Game.modHooks['ticker']) {
			newsTickerFunction = function() {
                var newsItems = [];
                
                // Add base news items (always show if Cookie Age is enabled)
                if (Game.JNE && Game.JNE.cookieAgeProgress >= 0) {
                    newsItems.push('News : Rumors that the ancient Secret Society of the Cookie are resurfacing, spreading like wildfire around the world.');
                    newsItems.push('News : Whispers in the shadows suggest there are now... more shadows.');
                }
                
                ensureTracksInitialized();
                var investigateProgress = cookieAgeData.puzzles.tracks.investigate.progress || 0;
                var infiltrateProgress = cookieAgeData.puzzles.tracks.infiltrate.progress || 0;
                var totalProgress = investigateProgress + infiltrateProgress;

				// Classified ads keyed to active puzzles
				if (validatePuzzleActive('proving_patience')) {
					//push double news item so its easier to spot
					newsItems.push('<span style="color: #faeacd; font-style: italic;">Classified Ad : </span> <span style="color: #faeacd;">Those who wait patiently with a single lily prove they are listening.<br><div style="text-align: right; font-size: 0.8em; font-style: italic; margin-right: 2px;">~ a friend</div></span>');
					newsItems.push('<span style="color: #faeacd; font-style: italic;">Classified Ad : </span> <span style="color: #faeacd;">Those who wait patiently with a single lily prove they are listening.<br><div style="text-align: right; font-size: 0.8em; font-style: italic; margin-right: 2px;">~ a friend</div></span>');
				}
				else if (validatePuzzleActive('making_friendship')) {
					newsItems.push('<span style="color: #faeacd; font-style: italic;">Classified Ad : </span> <span style="color: #faeacd;">Change the name upon your door my <span style="color: #EDCB93; font-style: italic;">Friend</span>, so that we can find you.<br><div style="text-align: right; font-size: 0.8em; font-style: italic; margin-right: 2px;">~ a friend</div></span>');
				}
				else if (validatePuzzleActive('small_token')) {
					newsItems.push('<span style="color: #faeacd; font-style: italic;">Classified Ad : </span> <span style="color: #faeacd;">Prove your hand is steady, send a parcel bound in ribbon, with but a single morsel within.<br><div style="text-align: right; font-size: 0.8em; font-style: italic; margin-right: 2px;">~ a friend</div></span>');
				}

                if (infiltrateProgress >= 1 && infiltrateProgress < 10) {
                    newsItems.push('News : Mystery figures wearing cloaks and performing strange cookie rituals reported to have been spotted across major cities.');
                }
                else if (infiltrateProgress >= 10 && infiltrateProgress < 20) {
                    newsItems.push('News : Reports of secret societies conducting elaborate ceremonies in hidden locations. Authorities baffled by the complexity of their rituals.');
                }
                else if (infiltrateProgress >= 20) {
                    newsItems.push('News : Ancient cookie cults resurface with unprecedented activity. Seemingly no longer concerned with staying hidden.');
                }


				var completedPuzzles = (cookieAgeData && cookieAgeData.puzzles && cookieAgeData.puzzles.completed) ? cookieAgeData.puzzles.completed : [];
				if (completedPuzzles.indexOf('brother_onto_you') !== -1 && completedPuzzles.indexOf('send_word') === -1) {
					newsItems.push('Breaking News : Sudden mine collapses spread across region, dozens missing or trapped. Rescue operations are underway.');
				}

				if (validatePuzzleActive('they_are_watching') && completedPuzzles.indexOf('they_are_watching') === -1) {
					newsItems.push('News : Strange classified ads appearing in newspapers have been noticed by many; the classifieds editor has been reported missing by friends and family.');
				}

				if (completedPuzzles.indexOf('spy_purge') !== -1 && completedPuzzles.indexOf('close_call') === -1) {
					newsItems.push('News : Mass layoffs of Grandmas reported, social safety nets under strain.');
				}

				if (validatePuzzleActive('close_call') && completedPuzzles.indexOf('close_call') === -1) {
					newsItems.push('News : Citizens report secret underground courts, police show no interest in investigating the matter.');
				}

				if (validatePuzzleActive('rosetta_stone') && completedPuzzles.indexOf('rosetta_stone') === -1) {
					newsItems.push('News : Museum displays ancient tablet from before recorded history; no known translation exists, but scholars continue to study the bizarre hieroglyphics.');
				}

				if (validatePuzzleActive('watch_keeper_rounds') && completedPuzzles.indexOf('watch_keeper_rounds') === -1) {
					newsItems.push('News : City enters strict curfew after numerous unexplained events; watch keeper patrols increase.');
				}

				if (validatePuzzleActive('loyalty_test') && completedPuzzles.indexOf('loyalty_test') === -1) {
					newsItems.push('News : Reports of UFOs across multiple cities; many citizens think we have been visited by aliens for our delicious cookies.');
					// Branch-specific items for loyalty_test (prev: embrace_path)
					var loyaltyPathChoice = (cookieAgeData && cookieAgeData.puzzles) ? cookieAgeData.puzzles.exposePathPicked : null;
					if (loyaltyPathChoice === true) {
						// Expose branch
						newsItems.push('News : Archive mirrors publish synchronized audio bursts and tone charts tied to historic bakery logs; stations deny broadcasting them.');
					} else if (loyaltyPathChoice === false) {
						// Order branch
						newsItems.push('News : Independent baking forums go read-only without notice; moderators cite "compliance updates."');
					}
				}

				if (validatePuzzleActive('defeat_evil') && completedPuzzles.indexOf('defeat_evil') === -1) {
					var pathChoice = (cookieAgeData && cookieAgeData.puzzles) ? cookieAgeData.puzzles.exposePathPicked : null;
					if (pathChoice === true) {
						// Expose branch
						newsItems.push('News : Massive document dump maps shell suppliers, courier routes, and ledgers; impromptu vigils outside former safe houses.');
					} else if (pathChoice === false) {
						// Order branch
						newsItems.push('News : Coordinated arrests dismantle "rogue baker cells"; markets open green as ministries hail a return to stability.');
					}
				}

				if (validatePuzzleActive('embrace_path') && completedPuzzles.indexOf('embrace_path') === -1) {
					var embracePathChoice = (cookieAgeData && cookieAgeData.puzzles) ? cookieAgeData.puzzles.exposePathPicked : null;
					if (embracePathChoice === true) {
						// Expose branch
						newsItems.push('News : Leaked docket alleges a coordinated network behind cookie distribution; redacted names trend overnight.');
					} else if (embracePathChoice === false) {
						// Order branch
						newsItems.push('News : Trade groups announce a unified "Baker\'s Charter"; critics warn of unprecedented centralization.');
					}
				}

				if (validatePuzzleActive('rise_up') && completedPuzzles.indexOf('rise_up') === -1) {
					var riseUpPathChoice = (cookieAgeData && cookieAgeData.puzzles) ? cookieAgeData.puzzles.exposePathPicked : null;
					if (riseUpPathChoice === true) {
						// Expose branch
						newsItems.push('News : Short clip of a "static box" circulates before being removed on copyright claims; repost threads multiply.');
					} else if (riseUpPathChoice === false) {
						// Order branch
						newsItems.push('News : A national museum lists an "unlabeled analog device" as newly accessioned; access restricted to researchers.');
					}
				}

				if (validatePuzzleActive('schism_choice') && completedPuzzles.indexOf('schism_choice') === -1) {
					newsItems.push('News : Parks departments rope off newly formed labyrinth paths in community gardens, citing "soil restoration trials."');
				}

				if (validatePuzzleActive('mask_wears_thin') && completedPuzzles.indexOf('mask_wears_thin') === -1) {
					newsItems.push('News : Museums and private collections quietly move baking-era artifacts to off-site vaults; labels updated to "unavailable for viewing."');
				}

				if (validatePuzzleActive('vaulted_relics') && completedPuzzles.indexOf('vaulted_relics') === -1) {
					newsItems.push('News : Harbor authority issues advisory on vessel light protocols after spot checks reveal unusual starboard-only displays; "refresher training" scheduled.');
				}

				if (completedPuzzles.indexOf('initiation_riddle') !== -1 && validatePuzzleActive('spirits_thrones') && completedPuzzles.indexOf('spirits_thrones') === -1) {
					newsItems.push('News : Museums report theft of small gilded figurines labeled "Order relics." Curators refuse to release security footage.');
				}

				if (completedPuzzles.indexOf('rite_shifting_measures') !== -1 && validatePuzzleActive('garden_sigil') && completedPuzzles.indexOf('garden_sigil') === -1) {
					newsItems.push('News : Farmers wake to gold-leaf markings burned into cropland forming five-pointed trade symbols. No chemical residue found.');
				}

				if (completedPuzzles.indexOf('spiral_seasons') !== -1 && validatePuzzleActive('rite_shifting_measures') && completedPuzzles.indexOf('rite_shifting_measures') === -1) {
					newsItems.push('News : Weather agencies record conflicting seasons across regions; one satellite photo shows snow and harvest fields side by side.');
				}

				return newsItems;
            };
            
            Game.modHooks['ticker'].push(newsTickerFunction);
        } else {
            debugLog('News ticker system not available, skipping ticker setup');
        }
    }
    
    function removeNewsTicker() {
        debugLog('Removing news ticker for Mysteries of the Cookie...');
        
        if (Game.modHooks && Game.modHooks['ticker'] && newsTickerFunction) {
            var index = Game.modHooks['ticker'].indexOf(newsTickerFunction);
            if (index > -1) {
                Game.modHooks['ticker'].splice(index, 1);
                debugLog('News ticker removed successfully');
            } else {
                debugLog('News ticker function not found in ticker array');
            }
            newsTickerFunction = null;
        } else {
            debugLog('Cannot remove news ticker - system not available or function not set');
        }
    }
    
    // ===== PUBLIC API FOR TESTING =====
    // These functions will be available in the console for testing
    window.CookieAge = {
        VERSION: expansionVersion,
        getMissingPuzzleCompletionRequirements: getMissingPuzzleCompletionRequirements,
        getSaveData: function() {
            try {
                // Ensure structures exist without over-initializing UI/audio
                if (!cookieAgeData) return null;
                if (!cookieAgeData.puzzles) return { version: expansionVersion, tracks: { lastCompleted: { investigate: null, infiltrate: null, choose: null } }, exposePathPicked: null };

                // Helper to get last completed ID for a track from progress or completed list
                function getLastCompletedId(trackType) {
                    if (!cookieAgeData.puzzles.tracks) return null;
                    var progress = (cookieAgeData.puzzles.tracks[trackType] && cookieAgeData.puzzles.tracks[trackType].progress) || 0;
                    var orderArr = trackType === 'investigate' ? INVESTIGATE_PUZZLE_ORDER : (trackType === 'infiltrate' ? INFILTRATE_PUZZLE_ORDER : CHOOSE_PUZZLE_ORDER);
                    if (progress > 0 && progress - 1 < orderArr.length) return orderArr[progress - 1] || null;
                    // Fallback: derive from completed list if progress looks unset
                    if (cookieAgeData.puzzles.completed && cookieAgeData.puzzles.completed.length) {
                        var lastIdx = -1;
                        for (var i = 0; i < orderArr.length; i++) {
                            if (cookieAgeData.puzzles.completed.indexOf(orderArr[i]) !== -1) lastIdx = i;
                        }
                        return lastIdx >= 0 ? orderArr[lastIdx] : null;
                    }
                    return null;
                }

                return {
                    version: expansionVersion,
                    tracks: {
                        lastCompleted: {
                            investigate: getLastCompletedId('investigate'),
                            infiltrate: getLastCompletedId('infiltrate'),
                            choose: getLastCompletedId('choose')
                        },
                        progress: {
                            investigate: (cookieAgeData.puzzles.tracks && cookieAgeData.puzzles.tracks.investigate) ? cookieAgeData.puzzles.tracks.investigate.progress : 0,
                            infiltrate: (cookieAgeData.puzzles.tracks && cookieAgeData.puzzles.tracks.infiltrate) ? cookieAgeData.puzzles.tracks.infiltrate.progress : 0,
                            choose: (cookieAgeData.puzzles.tracks && cookieAgeData.puzzles.tracks.choose) ? cookieAgeData.puzzles.tracks.choose.progress : 0
                        }
                    },
                    // Tri-state: true | false | null
                    exposePathPicked: (cookieAgeData.puzzles && 'exposePathPicked' in cookieAgeData.puzzles) ? cookieAgeData.puzzles.exposePathPicked : null,
                    // Hint system data
                    hints: (cookieAgeData.puzzles && cookieAgeData.puzzles.hints) ? {
                        hintsUsed: cookieAgeData.puzzles.hints.hintsUsed || 0,
                        lastHintTime: (cookieAgeData.puzzles.hints.lastHintTime !== null && cookieAgeData.puzzles.hints.lastHintTime !== undefined) ? cookieAgeData.puzzles.hints.lastHintTime : null,
                        puzzleActivationTimes: (cookieAgeData.puzzles.hints.puzzleActivationTimes) ? {
                            investigate: (cookieAgeData.puzzles.hints.puzzleActivationTimes.investigate !== null && cookieAgeData.puzzles.hints.puzzleActivationTimes.investigate !== undefined) ? cookieAgeData.puzzles.hints.puzzleActivationTimes.investigate : null,
                            infiltrate: (cookieAgeData.puzzles.hints.puzzleActivationTimes.infiltrate !== null && cookieAgeData.puzzles.hints.puzzleActivationTimes.infiltrate !== undefined) ? cookieAgeData.puzzles.hints.puzzleActivationTimes.infiltrate : null,
                            choose: (cookieAgeData.puzzles.hints.puzzleActivationTimes.choose !== null && cookieAgeData.puzzles.hints.puzzleActivationTimes.choose !== undefined) ? cookieAgeData.puzzles.hints.puzzleActivationTimes.choose : null
                        } : null,
                        purchasedHints: cookieAgeData.puzzles.hints.purchasedHints || {}
                    } : null
                };
            } catch (e) {
                try { console.error('[Cookie Age] getSaveData failed:', e); } catch (_) {}
                return null;
            }
        },
        applySaveData: function(save) {
            try {
                if (!save) return;
                // Initialize lightweight structures
                if (!cookieAgeData.puzzles) setupPuzzleSystem();
                if (!cookieAgeData.puzzles.completed) cookieAgeData.puzzles.completed = [];
                if (!cookieAgeData.puzzles.tracks) cookieAgeData.puzzles.tracks = { investigate: { active: null, progress: 0 }, infiltrate: { active: null, progress: 0 }, choose: { active: null, progress: 0 }, _initialized: false };
                
                // Initialize hint system data structure if not exists
                if (!cookieAgeData.puzzles.hints) {
                    cookieAgeData.puzzles.hints = {
                        hintsUsed: 0,
                        lastHintTime: null,
                        puzzleActivationTimes: {
                            investigate: null,
                            infiltrate: null,
                            choose: null
                        },
                        purchasedHints: {}
                    };
                }

                // CRITICAL: Clean up any currently active puzzles BEFORE clearing state
                // This prevents hooks/listeners from old puzzles interfering with new save data
                var currentActivePuzzles = [];
                if (cookieAgeData.puzzles.tracks) {
                    if (cookieAgeData.puzzles.tracks.investigate && cookieAgeData.puzzles.tracks.investigate.active) {
                        currentActivePuzzles.push(cookieAgeData.puzzles.tracks.investigate.active);
                    }
                    if (cookieAgeData.puzzles.tracks.infiltrate && cookieAgeData.puzzles.tracks.infiltrate.active) {
                        currentActivePuzzles.push(cookieAgeData.puzzles.tracks.infiltrate.active);
                    }
                    if (cookieAgeData.puzzles.tracks.choose && cookieAgeData.puzzles.tracks.choose.active) {
                        currentActivePuzzles.push(cookieAgeData.puzzles.tracks.choose.active);
                    }
                }
                
                // Clean up each active puzzle
                for (var i = 0; i < currentActivePuzzles.length; i++) {
                    var puzzleId = currentActivePuzzles[i];
                    try {
                        cleanupPuzzle(puzzleId);
                        // Also mark puzzle as inactive
                        var puzzle = cookieAgeData.puzzles.registry[puzzleId];
                        if (puzzle) {
                            puzzle.isActive = false;
                        }
                    } catch (e) {
                        try { errorLog('Error cleaning up puzzle during save load:', puzzleId, e); } catch (_) {}
                    }
                }

                // Clear current derived state
                cookieAgeData.puzzles.completed = [];
                cookieAgeData.puzzles.tracks.investigate.active = null;
                cookieAgeData.puzzles.tracks.investigate.progress = 0;
                cookieAgeData.puzzles.tracks.infiltrate.active = null;
                cookieAgeData.puzzles.tracks.infiltrate.progress = 0;
                cookieAgeData.puzzles.tracks.choose.active = null;
                cookieAgeData.puzzles.tracks.choose.progress = 0;

                function clampAndApplyTrack(trackType, lastId) {
                    var orderArr = trackType === 'investigate' ? INVESTIGATE_PUZZLE_ORDER : (trackType === 'infiltrate' ? INFILTRATE_PUZZLE_ORDER : CHOOSE_PUZZLE_ORDER);
                    var idx = (typeof lastId === 'string') ? orderArr.indexOf(lastId) : -1;
                    if (idx < 0) {
                        // Unknown or null → nothing completed for this track
                        cookieAgeData.puzzles.tracks[trackType].progress = 0;
                        cookieAgeData.puzzles.tracks[trackType].active = null;
                        return;
                    }
                    // Mark all up to and including idx as completed
                    for (var i = 0; i <= idx && i < orderArr.length; i++) {
                        var pid = orderArr[i];
                        if (cookieAgeData.puzzles.completed.indexOf(pid) === -1) cookieAgeData.puzzles.completed.push(pid);
                    }
                    cookieAgeData.puzzles.tracks[trackType].progress = Math.min(idx + 1, orderArr.length);
                    cookieAgeData.puzzles.tracks[trackType].active = null;
                }

                var tracksPayload = save.tracks || {};
                var targets = {
                    investigate: tracksPayload.investigate || tracksPayload.lastCompleted && tracksPayload.lastCompleted.investigate,
                    infiltrate: tracksPayload.infiltrate || tracksPayload.lastCompleted && tracksPayload.lastCompleted.infiltrate,
                    choose: tracksPayload.choose || tracksPayload.lastCompleted && tracksPayload.lastCompleted.choose
                };
                if (tracksPayload.lastCompleted) {
                    targets.investigate = targets.investigate || tracksPayload.lastCompleted.investigate;
                    targets.infiltrate = targets.infiltrate || tracksPayload.lastCompleted.infiltrate;
                    targets.choose = targets.choose || tracksPayload.lastCompleted.choose;
                }
                clampAndApplyTrack('investigate', targets.investigate || null);
                clampAndApplyTrack('infiltrate', targets.infiltrate || null);
                clampAndApplyTrack('choose', targets.choose || null);

                if (tracksPayload.progress) {
                    var progressMap = tracksPayload.progress;
                    var trackOrders = {
                        investigate: INVESTIGATE_PUZZLE_ORDER,
                        infiltrate: INFILTRATE_PUZZLE_ORDER,
                        choose: CHOOSE_PUZZLE_ORDER
                    };
                    ['investigate', 'infiltrate', 'choose'].forEach(function(trackType) {
                        var desired = progressMap[trackType];
                        if (typeof desired !== 'number') {
                            return;
                        }
                        var maxLen = trackOrders[trackType].length;
                        var clampedProgress = Math.max(0, Math.min(desired, maxLen));
                        var currentProgress = cookieAgeData.puzzles.tracks[trackType].progress || 0;
                        if (clampedProgress > currentProgress) {
                            cookieAgeData.puzzles.tracks[trackType].progress = clampedProgress;
                            for (var idx = 0; idx < clampedProgress && idx < maxLen; idx++) {
                                var pid = trackOrders[trackType][idx];
                                if (cookieAgeData.puzzles.completed.indexOf(pid) === -1) {
                                    cookieAgeData.puzzles.completed.push(pid);
                                }
                            }
                        }
                    });
                }

                // Apply expose path tri-state
                if (save.hasOwnProperty('exposePathPicked')) {
                    cookieAgeData.puzzles.exposePathPicked = (save.exposePathPicked === true || save.exposePathPicked === false) ? save.exposePathPicked : null;
                }
                
                // Restore hint system data
                if (save.hints) {
                    if (typeof save.hints.hintsUsed === 'number') {
                        cookieAgeData.puzzles.hints.hintsUsed = save.hints.hintsUsed;
                    }
                    if (typeof save.hints.lastHintTime === 'number' || save.hints.lastHintTime === null) {
                        cookieAgeData.puzzles.hints.lastHintTime = save.hints.lastHintTime;
                    }
                    // Handle puzzleActivationTimes - restore if object exists, clear if explicitly null
                    if (save.hints.puzzleActivationTimes !== null && save.hints.puzzleActivationTimes !== undefined) {
                        if (typeof save.hints.puzzleActivationTimes === 'object') {
                            cookieAgeData.puzzles.hints.puzzleActivationTimes.investigate = (typeof save.hints.puzzleActivationTimes.investigate === 'number') ? save.hints.puzzleActivationTimes.investigate : null;
                            cookieAgeData.puzzles.hints.puzzleActivationTimes.infiltrate = (typeof save.hints.puzzleActivationTimes.infiltrate === 'number') ? save.hints.puzzleActivationTimes.infiltrate : null;
                            cookieAgeData.puzzles.hints.puzzleActivationTimes.choose = (typeof save.hints.puzzleActivationTimes.choose === 'number') ? save.hints.puzzleActivationTimes.choose : null;
                        }
                    } else if (save.hints.puzzleActivationTimes === null) {
                        // Explicitly clear puzzle activation times if save has null
                        cookieAgeData.puzzles.hints.puzzleActivationTimes.investigate = null;
                        cookieAgeData.puzzles.hints.puzzleActivationTimes.infiltrate = null;
                        cookieAgeData.puzzles.hints.puzzleActivationTimes.choose = null;
                    }
                    if (save.hints.purchasedHints && typeof save.hints.purchasedHints === 'object') {
                        cookieAgeData.puzzles.hints.purchasedHints = save.hints.purchasedHints;
                    }
                }

                // Activate next puzzles per track according to current dependencies
                try { activateNextPuzzleForTrack('investigate'); } catch (_) {}
                try { activateNextPuzzleForTrack('infiltrate'); } catch (_) {}
                try { activateNextPuzzleForTrack('choose'); } catch (_) {}

                // Silently award achievements based on restored puzzle progress (no notifications)
                // Following cookie.js pattern: set won flag and _restoredFromSave, update AchievementsById
                try {
                    var restoredCompleted = cookieAgeData.puzzles.completed || [];
                    for (var achIdx = 0; achIdx < mysteryMilestonePuzzles.length; achIdx++) {
                        var milestonePuzzle = mysteryMilestonePuzzles[achIdx];
                        var achievementName = mysteryAchievementNames[achIdx];
                        
                        // If milestone puzzle is completed, silently mark achievement as won
                        if (restoredCompleted.indexOf(milestonePuzzle) !== -1 && Game.Achievements && Game.Achievements[achievementName]) {
                            var ach = Game.Achievements[achievementName];
                            if (!ach.won) {
                                // Silent award: match cookie.js markAchievementWonFromSave pattern
                                ach.won = 1;
                                ach._restoredFromSave = true;
                                
                                // Also update the by-id version if it exists (per cookie.js pattern)
                                if (ach.id !== undefined && Game.AchievementsById && Game.AchievementsById[ach.id]) {
                                    Game.AchievementsById[ach.id].won = 1;
                                    Game.AchievementsById[ach.id]._restoredFromSave = true;
                                }
                            }
                        }
                    }
                } catch (_) {}

                // Optional debug overrides – only when debugMode and any debug flag is set
                if (typeof debugMode !== 'undefined' && debugMode) {
                    var hasAnyDebug = (typeof debugStartInvestigate !== 'undefined' && debugStartInvestigate !== null && debugStartInvestigate !== undefined) ||
                        (typeof debugStartInfiltrate !== 'undefined' && debugStartInfiltrate !== null && debugStartInfiltrate !== undefined) ||
                        (typeof debugStartChoose !== 'undefined' && debugStartChoose !== null && debugStartChoose !== undefined) ||
                        (typeof debugExposePathPicked !== 'undefined' && debugExposePathPicked !== null && debugExposePathPicked !== undefined);
                    if (hasAnyDebug && typeof applyDebugStartPuzzles === 'function') {
                        applyDebugStartPuzzles();
                    }
                }
            } catch (e) {
                try { console.error('[Cookie Age] applySaveData failed:', e); } catch (_) {}
            }
        },
        debug: function() {
            debugMode = !debugMode;
            console.log('[Cookie Age] Debug mode:', debugMode ? 'ON' : 'OFF');
        },
        status: function() {
            console.log('[Cookie Age] Status:', {
                initialized: expansionState.initialized,
                achievementsCreated: expansionState.achievementsCreated,
                trackingActive: expansionState.trackingActive,
                baseModDetected: !!Game.mods['JustNaturalExpansionMod'],
                newsTickerActive: newsTickerFunction !== null
            });
        },
        reinitialize: function() {
            debugLog('Reinitializing Cookie Age expansion...');
            expansionState.initialized = false;
            expansionState.achievementsCreated = false;
            
            // Check if Cookie Age is enabled and initialize directly
            if (Game.JNE && Game.JNE.enableCookieAge) {
                debugLog('Cookie Age is enabled, initializing directly...');
                initializeExpansion();
            } else {
                debugLog('Cookie Age is disabled, skipping initialization');
            }
        },
        enable: function() {
            debugLog('Enabling Cookie Age expansion...');
            
            if (!expansionState.initialized) {
                initializeExpansion();
            } else {
                // Already initialized, but ensure achievements are created
                if (!expansionState.achievementsCreated) {
                    createMysteryAchievements();
                }
                // Ensure news ticker is active
                if (!newsTickerFunction) {
                    setupNewsTicker();
                }
            }
        },
        disable: function() {
            debugLog('Disabling Cookie Age expansion...');
            this.cleanup();
            console.log('[Cookie Age] Disabled');
        },
        playWelcomeAudio: function() {
            // Simple function to play welcome audio - called only from button toggle
            if (cookieAgeData.audio.sounds.welcome) {
                playAudioSound('welcome');
            }
        },
        setupNewsTicker: function() {
            setupNewsTicker();
        },
        removeNewsTicker: function() {
            removeNewsTicker();
        },
        cleanup: function() {
            debugLog('Cleaning up Cookie Age expansion...');
            removeNewsTicker();
            
            // Clean up all Game object modifications
            cleanupGameObjectModifications();
            
            // Remove mystery achievements
            if (expansionState.achievementsCreated) {
                removeMysteryAchievements();
            }
            
            // Clean up all puzzle hooks
            if (cookieAgeData.puzzles && cookieAgeData.puzzles.registry) {
                for (var puzzleId in cookieAgeData.puzzles.registry) {
                    if (!cookieAgeData.puzzles.registry.hasOwnProperty(puzzleId)) {
                        continue;
                    }
                    cleanupPuzzleHooks(puzzleId);
                }
            }

            if (cookieAgeData.puzzles && cookieAgeData.puzzles.hooks) {
                for (var hookKey in cookieAgeData.puzzles.hooks) {
                    if (!cookieAgeData.puzzles.hooks.hasOwnProperty(hookKey)) {
                        continue;
                    }
                    var match = hookKey.match(/^puzzle(\d+)$/);
                    if (match) {
                        cleanupPuzzleHooks(parseInt(match[1], 10));
                    }
                }
            }
            
            // Reset initialization flags to ensure proper re-initialization on re-enable
            // CRITICAL: This ensures that when Cookie Age is re-enabled, setupPuzzleSystem
            // will properly reinitialize tracks and restore saved data
            if (cookieAgeData.puzzles && cookieAgeData.puzzles.tracks) {
                cookieAgeData.puzzles.tracks._initialized = false;
            }
            
            expansionState.initialized = false;
            expansionState.achievementsCreated = false;
            expansionState.trackingActive = false;
            console.log('[Cookie Age] Cleanup completed');
        },
        forceEnable: function() {
            debugLog('Force enabling Cookie Age expansion...');
            expansionState.initialized = false;
            initializeExpansion();
        },
        // Audio controls
        loadSound: function(name, url) {
            return loadAudioSound(name, url);
        },
        loadPuzzleCompletionAudio: function() {
            return loadPuzzleCompletionAudio();
        },
        playSound: function(name, options) {
            return playAudioSound(name, options);
        },
        toggleAudio: function() {
            return toggleAudio();
        },
        isPuzzleUnlocked: function(puzzleId) {
            return isPuzzleUnlocked(puzzleId);
        },
        getPuzzleRegistry: function() {
            if (!cookieAgeData || !cookieAgeData.puzzles || !cookieAgeData.puzzles.registry) {
                return null;
            }
            ensurePuzzleSystemInitialized();
            return cookieAgeData.puzzles.registry;
        },
        getPuzzleIdByIndex: function(index) {
            return getPuzzleIdByIndex(index);
        },
        getActivePuzzles: function(trackType) {
            var entries = getActivePuzzleEntries(trackType);
            return entries.map(formatActivePuzzle);
        },
        getCurrentPuzzle: function(options) {
            options = options || {};
            var trackType = options.track;
            var entries = getActivePuzzleEntries(trackType);

            if (!entries.length) {
                return options.all ? [] : null;
            }

            if (options.all) {
                return entries.map(formatActivePuzzle);
            }

            return formatActivePuzzle(entries[0]);
        },
        reinitializePuzzles: function() {
            var entries = reinitializeActivePuzzles();
            return entries.map(formatActivePuzzle);
        },
        completeCurrentPuzzle: function(trackType) {
            if (!debugMode) {
                try { console.warn('[Cookie Age] Console command disabled unless debugMode is true.'); } catch (_) {}
                return false;
            }

            var entries = getActivePuzzleEntries(trackType);
            if (!entries.length) {
                try { console.warn('[Cookie Age] No active puzzles to complete.'); } catch (_) {}
                return false;
            }

            var completedAny = false;
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                if (tryCompletePuzzle(entry.id)) {
                    completedAny = true;
                    var registryPuzzle = cookieAgeData.puzzles.registry ? cookieAgeData.puzzles.registry[entry.id] : null;
                    var puzzleName = registryPuzzle ? registryPuzzle.name : entry.id;
                    try { console.log('[Cookie Age] Completed puzzle:', puzzleName); } catch (_) {}
                }
            }

            if (!completedAny) {
                try { console.warn('[Cookie Age] Active puzzle completion failed.'); } catch (_) {}
            }

            return completedAny;
        },
        startFirstPuzzle: function() {
            ensurePuzzleSystemInitialized();
            ensureTracksInitialized();

            if (Game && Game.JNE && typeof Game.JNE.setCookieAgeProgress === 'function' && (!Game.JNE.cookieAgeProgress || Game.JNE.cookieAgeProgress < 1)) {
                Game.JNE.setCookieAgeProgress(1);
            }

            var entries = getActivePuzzleEntries();
            if (!entries.length) {
                entries = reinitializeActivePuzzles();
            }

            if (!entries || !entries.length) {
                try { console.warn('[Cookie Age] Unable to activate first puzzle.'); } catch (_) {}
                return false;
            }

            return true;
        },
        checkCurrentPuzzle: function(trackType) {
            var entries = getActivePuzzleEntries(trackType);
            if (!entries.length) {
                try { console.warn('[Cookie Age] No active puzzles to check.'); } catch (_) {}
                return false;
            }

            var checkedAny = false;
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var result = checkPuzzle(entry.id);
                if (result) {
                    checkedAny = true;
                }
            }

            if (!checkedAny) {
                try { console.warn('[Cookie Age] Active puzzle check did not return true.'); } catch (_) {}
            }

            return checkedAny;
        },
        getPuzzleStatus: function() {
            if (!cookieAgeData || !cookieAgeData.puzzles || !cookieAgeData.puzzles.tracks) {
                return null;
            }
            ensureTracksInitialized();
            
            var investigateActive = cookieAgeData.puzzles.tracks.investigate.active;
            var infiltrateActive = cookieAgeData.puzzles.tracks.infiltrate.active;
            var chooseActive = cookieAgeData.puzzles.tracks.choose.active;
            
            return {
                investigate: {
                    progress: cookieAgeData.puzzles.tracks.investigate.progress,
                    active: investigateActive
                },
                infiltrate: {
                    progress: cookieAgeData.puzzles.tracks.infiltrate.progress,
                    active: infiltrateActive
                },
                choose: {
                    progress: cookieAgeData.puzzles.tracks.choose.progress,
                    active: chooseActive
                }
            };
        },
        // Hint system functions
        purchaseHint: function(trackType) {
            return purchaseHint(trackType);
        },
        showHintTrackSelection: function() {
            return showHintTrackSelection();
        },
        getHintCost: function() {
            return getHintCost();
        },
        getAvailablePuzzlesForHint: function() {
            return getAvailablePuzzlesForHint();
        },
        getActiveHints: function() {
            return getActiveHints();
        },
        getHintTooltipContent: function() {
            return getHintTooltipContent();
        },
        getTrackStatus: function() {
            if (!cookieAgeData.puzzles.tracks) return null;
            
            return {
                investigate: {
                    progress: cookieAgeData.puzzles.tracks.investigate.progress,
                    active: cookieAgeData.puzzles.tracks.investigate.active
                },
                infiltrate: {
                    progress: cookieAgeData.puzzles.tracks.infiltrate.progress,
                    active: cookieAgeData.puzzles.tracks.infiltrate.active
                },
                choose: {
                    progress: cookieAgeData.puzzles.tracks.choose.progress,
                    active: cookieAgeData.puzzles.tracks.choose.active
                }
            };
        },
        completePuzzle: function(puzzleId) {
            if (!debugMode) {
                try { console.warn('[Cookie Age] Console command disabled unless debugMode is true.'); } catch (_) {}
                return false;
            }
            return completePuzzle(puzzleId);
        },
        processConditionalText: function(text) {
            return processConditionalText(text);
        }
    };
    
    function attachBaseModPuzzleHelpers() {
        if (!Game || !Game.JNE) {
            return;
        }

        Game.JNE.completeCurrentPuzzle = function(trackType) {
            return window.CookieAge.completeCurrentPuzzle(trackType);
        };

        Game.JNE.startFirstPuzzle = function() {
            return window.CookieAge.startFirstPuzzle();
        };

        Game.JNE.checkCurrentPuzzle = function(trackType) {
            return window.CookieAge.checkCurrentPuzzle(trackType);
        };
    }

    attachBaseModPuzzleHelpers();
    
    // ===== MAIN INITIALIZATION =====
    function main() {
        
        if (!checkBaseModCompatibility()) {
            return;
        }
        
        // Initialize immediately - base mod is guaranteed to be loaded
        conditionalInitialize();
    }
    
    // ===== CONSOLE COMPATIBILITY =====
    // For console testing, we need to handle the case where this code is pasted directly
    if (typeof window !== 'undefined' && window.Game) {
        // Running in browser console
        debugLog('Running in console mode');
        main();
    } else {
        // Running as a mod file
        debugLog('Running as mod file');
        main();
    }
})();