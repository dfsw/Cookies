    // Just Natural Expansion - Heavenly Upgrades
    (function() {
        'use strict';

        const SIMPLE_MOD_NAME = 'Just Natural Expansion';
        const MOD_HU_VERSION = '1.1.0';
        var isInitialized = false;
        const MOD_ICON = [15, 7];
        const GARDEN_SPRITE_SHEET_URL = (Game.resPath || 'https://orteil.dashnet.org/cookieclicker/') + 'img/gardenPlants.png';
        const MOD_PLANT_KEYS = ['sparklingSugarCane', 'krazyKudzu', 'magicMushroom'];
        const TOGGLE_NAMES = ['Toy mode [on]', 'Toy mode [off]', 'Pink stuff [on]', 'Pink stuff [off]'];
        function minigameOf(name) { var b = Game.Objects[name]; return b && b.minigame; }
        function loadedMinigame(name) { var b = Game.Objects[name]; return (b && b.minigameLoaded && b.minigame) || null; }
        // Wrappers chain, one per tag
        function swapCustomPlantIcon(result, me, iconMap, customSheet) {
            if (!(me && isModPlant(me.key) && me.icon >= 34 && me.icon <= 36 && iconMap[me.icon] && result)) return result;
            var map = iconMap[me.icon];
            var iconY = -me.icon * 48;
            result = result.replace(/background:url\(([^)]+gardenPlants\.png[^)]*)\)/g, function(match) {
                var nextPos = result.indexOf('background-position:', result.indexOf(match));
                if (nextPos !== -1) {
                    var posMatch = result.substring(nextPos).match(/background-position:\s*(-?\d+)\s*px\s+(-?\d+)\s*px/);
                    if (posMatch && parseInt(posMatch[2]) === iconY) return 'background:url(\'' + customSheet + '\')';
                }
                return match;
            });
            return result.replace(/background-position:\s*(-?\d+)\s*px\s+(-?\d+)\s*px/g, function(match, x, y) {
                if (parseInt(y) !== iconY) return match;
                return 'background-position:' + (map.baseX - ((parseInt(x) / -48) * 48)) + 'px ' + map.baseY + 'px';
            });
        }
        var STAGE_MULT = [0, 0.1, 0.25, 0.5, 1];
        function plantStage(age, mature) {
            if (age >= mature) return 4;
            if (age >= mature * 0.666) return 3;
            if (age >= mature * 0.333) return 2;
            return 1;
        }
        // growth-scaled effect strength of one plot tile (soil x stage x plot boost)
        function plantMult(M, x, y, plant, tile) {
            return M.soilsById[M.soil].effMult * STAGE_MULT[plantStage(tile[1], plant.mature)] * M.plotBoost[y][x][1];
        }
        function sugarCaneTotalMult(M) {
            var total = 0;
            for (var y = 0; y < 6; y++) {
                for (var x = 0; x < 6; x++) {
                    var tile = M.plot[y][x];
                    if (!(tile && tile[0] > 0)) continue;
                    var plant = M.plantsById[tile[0] - 1];
                    if (plant && plant.key === 'sparklingSugarCane') total += plantMult(M, x, y, plant, tile);
                }
            }
            return total;
        }
        function plantBaseCSS(customSheet, vanillaSheet) {
            var css = '';
            for (var i = 0; i < 34; i++) css += '#gardenSeedIcon-' + i + ' { background-image: url(\'' + vanillaSheet + '\') !important; }\n';
            ['custom', 'vanilla'].forEach(function(kind) {
                var sheet = kind === 'custom' ? customSheet : vanillaSheet;
                ['.gardenSeedIcon', '.gardenTileIcon', '#gardenCursor'].forEach(function(sel) {
                    css += sel + '[data-' + kind + '-plant="true"] { background-image: url(\'' + sheet + '\') !important; }\n';
                });
            });
            return css;
        }
        function onBuy(upgrade, tag, fn) {
            if (hookedWith(upgrade, 'buyFunction', tag)) return;
            var orig = upgrade.buyFunction;
            var w = function() {
                if (orig) orig.call(this);
                fn.call(this);
            };
            w._jneOrig = orig;
            w[tag] = true;
            upgrade.buyFunction = w;
        }
        function hookedWith(obj, key, tag) {
            for (var f = obj[key]; f; f = f._jneOrig) if (f[tag]) return true;
            return false;
        }
        function hookOnce(obj, key, tag, make) {
            if (hookedWith(obj, key, tag)) return;
            var orig = obj[key];
            if (!orig) return;
            var w = make(orig);
            w._jneOrig = orig;
            w[tag] = true;
            obj[key] = w;
        }
        function gpocHas(name) { return Game.elderWrath > 0 && Game.Has(name); }
        const SEASON_EXTRA_HOURS = ['Seasonal hours', 'Seasonal overtime', 'Seasonal time off', 'Seasonal retirement'];
        const SUGAR_BAKING_CAPS = [['Sugar baking VI', 150], ['Sugar baking V', 140], ['Sugar baking IV', 130], ['Sugar baking III', 120], ['Sugar baking II', 110]];
        const SEASON_BISCUITS = ['Festive biscuit', 'Ghostly biscuit', 'Lovesick biscuit', 'Fool\'s biscuit', 'Bunny biscuit', 'Lunar biscuit', 'Cornucopia biscuit'];
        function seasonExtraHours() { return SEASON_EXTRA_HOURS.reduce(function(t, n) { return t + (Game.Has(n) ? 6 : 0); }, 0); }
        function sugarBakingCap() { for (var i = 0; i < SUGAR_BAKING_CAPS.length; i++) if (Game.Has(SUGAR_BAKING_CAPS[i][0])) return SUGAR_BAKING_CAPS[i][1]; return 0; }
        const WEAKEST_LINK_UPGRADES = [
            { name: 'Weakest link', rank: 1, mult: 16 },
            { name: 'The next weakest link', rank: 2, mult: 12 },
            { name: 'No more weak links', rank: 3, mult: 8 }
        ];
        Game._jneWeakestLinkUpgrades = WEAKEST_LINK_UPGRADES;

        function isModPlant(plantKey) {
            if (!plantKey) return false;
            return MOD_PLANT_KEYS.indexOf(plantKey) !== -1;
        }

        function getSpriteSheet(sheetName) {
            if (sheetName === 'garden') return GARDEN_SPRITE_SHEET_URL;
            return window.getSpriteSheet(sheetName);
        }

        function jneEvery(prop, ms) {
            var now = Date.now();
            if (!Game[prop] || (now - Game[prop]) >= ms) {
                Game[prop] = now;
                return now;
            }
            return 0;
        }

        function jneHasAny(list) {
            for (var i = 0; i < list.length; i++) {
                if (Game.Has(list[i])) return true;
            }
            return false;
        }

        // Unified independent random function that doesn't consume seeded Math.random() values
        function jneIndependentRandom() {
            return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967295;
        }

        function entry(id, owned, ready, done, setup) { return { id: id, owned: owned, ready: ready, done: done, setup: setup }; }
        function always() { return true; }
        function never() { return false; }
        function has(name) { return function() { return Game.Has(name); }; }
        function upExists(name) { return function() { return !!(Game.Upgrades && Game.Upgrades[name]); }; }
        function upFlag(name, flag) { return function() { var up = Game.Upgrades && Game.Upgrades[name]; return !!(up && up[flag]); }; }
        function gameFlag(flag) { return function() { return !!Game[flag]; }; }
        function mgFlag(building, flag) { return function() { var M = minigameOf(building); return !!(M && M[flag]); }; }
        function upgradeApiReady() { return !!Game.Upgrade && !!Game.Upgrades; }
        // minigame loaded with every prop present (and extra(M) truthy, if given)
        function mgReady(building, props, extra) {
            return function() {
                var M = loadedMinigame(building);
                return !!(M && props.every(function(k) { return M[k]; }) && (!extra || extra(M)));
            };
        }

        function runUpgradeSetups(forceAll) {
            if (!Game.JNE) Game.JNE = {};
            if (!Game.JNE._upgradeSetups) {
                Game.JNE._upgradeSetups = [
                    entry('Custom buff types', always, function() { return !!Game.buffType; }, gameFlag('_jneCustomBuffTypesCreated'), setupCustomBuffTypes),
                    entry('Sugar frenzy II', has('Sugar frenzy II'), upExists('Sugar frenzy'), upFlag('Sugar frenzy', '_sugarFrenzyII'), setupSugarFrenzyII),
                    entry('Fortune sound selector', has('Fortune tolls for you'), upExists('Golden cookie sound selector'), upFlag('Golden cookie sound selector', '_fortuneSoundAdded'), setupFortuneSoundSelector),
                    entry('Sugar for sugar trading', has('Sugar for sugar trading'), upgradeApiReady, upExists('Sugar trade'), setupSugarForSugarTrading),
                    entry('Reoccuring business', has('Reoccuring business'), upExists('Sugar trade'), upFlag('Sugar trade', '_reoccuringBusiness'), setupReoccuringBusiness),
                    entry('Wallstreet bets', has('Wallstreet bets'), mgReady('Bank', []), function() { var M = minigameOf('Bank'); return !!(M && M.getGoodMaxStock && M.getGoodMaxStock._wallstreetBetsHooked); }, setupWallstreetBets),
                    entry('Toy box', has('Toy box'), upExists('Toy box'), never, createToyBoxToggle),
                    entry('Pink stuff', has('Pink stuff'), upExists('Pink stuff'), never, createPinkStuffToggle),
                    entry('Magic mushroom drops', has('Magic mushroom'), upgradeApiReady, gameFlag('_magicMushroomDropsHooked'), setupMagicMushroomDrops),
                    entry('Sugar predictor', has('Sugar predictor'), function() { return !!Game.registerHook; }, gameFlag('_sugarPredictorHooked'), setupSugarPredictor),
                    entry('Lump tooltip enhancements', function() { return Game.Has('Sugar insight') || Game.Has('Sugar predictor'); }, function() { if (!Game.lumpTooltip) return false; if (Game.Has('Sugar predictor')) return !!Game._sugarPredictorHooked || typeof Game.getLumpPredictions === 'function'; return true; }, gameFlag('_lumpTooltipHooked'), setupLumpTooltipEnhancements),
                    entry('Big cookie image selector unlock', has('Big cookie image selector'), upExists('Cookie image selector'), upFlag('Cookie image selector', 'unlocked'), unlockBigCookieImageSelector),
                    entry('Garden save hook immediate', always, mgReady('Farm', ['save', 'plantsById']), function() { var M = minigameOf('Farm'); return !!(M && M.save && M.save._heavenlyUpgradesHooked); }, setupGardenSaveHookImmediate),
                    entry('Aerated soil', has('Aerated soil'), mgReady('Farm', ['soils', 'plants'], function() { return typeof l === 'function'; }), function() { var M = minigameOf('Farm'); return !!(M && M._aeratedSoilHooked && M.soils && M.soils.aerated); }, setupAeratedSoil),
                    entry('Heavenly plant unlocks', always, mgReady('Farm', ['getUnlockedN', 'plants']), mgFlag('Farm', '_heavenlyPlantUnlocksHooked'), setupHeavenlyPlantUnlocks),
                    entry('Garden new plants', always, function() { var M = minigameOf('Farm'); return !!(M && M.plants && M.plantsById && M.plants['bakerWheat']); }, mgFlag('Farm', '_gardenPlantsInjected'), setupNewPlants),
                    entry('Plant all', has('Plant all'), mgReady('Farm', ['clickTile', 'useTool', 'plantsById']), function() { var M = minigameOf('Farm'); return !!(M && M.clickTile && M.clickTile._jnePlantAllHooked); }, setupPlantAll),
                    entry('Soil inspector', has('Soil inspector'), mgReady('Farm', ['tileTooltip', 'getMuts', 'getTile', 'plants', 'plantsById', 'soilsById', 'plotBoost']), mgFlag('Farm', '_soilInspectorHooked'), setupSoilInspector),
                    entry('Golden cookie predictor overlay', always, function() { var st = Game.shimmerTypes && Game.shimmerTypes['golden']; return !!(Game.registerHook && st && st.popFunc); }, gameFlag('_goldenCookiePredictorHooked'), setupGoldenCookiePredictor),
                    entry('Seasonal duration', always, function() { return !!Game.getSeasonDuration; }, function() { return !!(Game.getSeasonDuration && Game.getSeasonDuration._heavenlyUpgradesHooked); }, setupSeasonalDuration),
                    entry('Cookie display unit', always, function() { return !!Game.Draw; }, function() { return !!(Game.Draw && Game.Draw._jneCookieDisplayHooked); }, setupCookieDisplayUnit),
                    entry('Shiny wrinklers spawn', always, function() { return !!Game.SpawnWrinkler; }, function() { return !!(Game.SpawnWrinkler && Game.SpawnWrinkler._jneShinyHooked); }, setupShinyWrinklers),
                    entry('Improved cookie chains', has('Improved cookie chains'), always, gameFlag('_improvedChainsHandled'), function() { /* Handled in JustNaturalExpansion.js */ }),
                    entry('Pantheon spirit effects', always, function() { var st = Game.shimmerTypes && Game.shimmerTypes.golden; return !!(st && st.popFunc && st.spawnConditions) && mgReady('Temple', ['slotGod'])(); }, mgFlag('Temple', '_spiritEffectsSetup'), setupPantheonSpiritEffects),
                    entry('Triple 7s', always, function() { return !!Game.Upgrades['Lucky digit']; }, function() { return !!(Game.Upgrades['Lucky digit'] && Game.Upgrades['Lucky digit'].showIf && Game.Upgrades['Lucky digit'].showIf._jneTriple7s); }, setupTriple7s),
                    entry('Self promoter', has('Self promoter'), function() { return !!Game.registerHook && !!Game.tooltip; }, gameFlag('_jneSelfPromoter'), setupSelfPromoter),
                    entry('Cyclius swatch', has('Cyclius swatch'), function() { return !!Game.registerHook && mgReady('Temple', ['gods'], function(M) { return M.gods['ages']; })(); }, gameFlag('_cycliusSwatchHooked'), setupCycliusSwatch),
                    entry('Shiny wrinkler spell', function() { return jneHasAny(['Skitter skatter skrum ahh', 'Abra-Ka-Wiggle', 'Alakazoodle evil noodle']); }, mgReady('Wizard tower', ['castSpell']), mgFlag('Wizard tower', '_shinyWrinklerHooked'), setupShinyWrinklerSpell),
                    entry('Gilded allure spell', has('Gilded allure'), mgReady('Wizard tower', ['spells', 'spellsById'], function() { return typeof l === 'function' && l('grimoireSpells'); }), mgFlag('Wizard tower', '_gildedAllureHooked'), setupGildedAllureSpell),
                    entry('Golden stopwatch', has('Golden stopwatch'), function() { return !!(Game.registerHook && Game.LeftBackground && typeof l === 'function' && l('backgroundLeftCanvas')); }, function() { return !!(Game.UpdateSpecial && Game.UpdateSpecial._goldenStopwatchHooked); }, setupGoldenStopwatch)
                ];
            }
            var entries = Game.JNE._upgradeSetups;
            for (var i = 0; i < entries.length; i++) {
                var e = entries[i];
                // Toggles only recreate when forceAll=true (during save loads)
                var isToggle = (e.id === 'Toy box' || e.id === 'Pink stuff');
                if (!e) continue;
                // If ran but done() is now false, the setup was externally undone (e.g. deleted by toggle), allow re-run
                if (e.ran && (!e.done || e.done())) continue;
                if (e.ran) e.ran = false;
                try {
                    if (e.done && e.done()) {
                        e.ran = true;
                        continue;
                    }
                    // Skip ownership check if forceAll is true (during init/load)
                    if (!forceAll && e.owned && !e.owned()) continue;
                    if (e.ready && !e.ready()) continue;

                    // Skip effect setups in Born Again mode (upgrades remain owned but have no effect)
                    // Allow basic initialization (Custom buff types, Garden save hook, etc.) to run
                    if (Game.ascensionMode == 1 && !isToggle && e.id !== 'Custom buff types' && e.id !== 'Garden save hook immediate' && e.id !== 'Heavenly plant unlocks' && e.id !== 'Garden new plants') continue;

                    if (e.setup) e.setup();
                    if (!e.done || e.done()) e.ran = true;
                } catch (err) {
                    console.error('[Heavenly Upgrades] Setup failed:', e.id, err);
                }
            }

            if (!Game._jneSeasonTooltipsHooked && typeof LocalizeUpgradesAndAchievs === 'function') {
                window._jneOriginalLocalizeUpgradesAndAchievs = LocalizeUpgradesAndAchievs;
                LocalizeUpgradesAndAchievs = function() { window._jneOriginalLocalizeUpgradesAndAchievs.apply(this, arguments); updateSeasonDescs(); };
                Game._jneSeasonTooltipsHooked = true;
            }
            if (Game.Upgrades) updateSeasonDescs();
            if (!Game._jneSeasonDescHook && Game.registerHook) { Game.registerHook('check', updateSeasonDescs, 'JNE season durations'); Game._jneSeasonDescHook = true; }

            if (!Game._jneLegacyIntervalsCleared) {
                ['_jneBingoCenterSlotsInterval', '_fortuneCookieRegenerationInterval', '_jneCheckboxInterval'].forEach(function(k) {
                    if (Game[k]) { clearInterval(Game[k]); Game[k] = 0; }
                });
                Game._jneLegacyIntervalsCleared = true;
            }

            var ownedSetups = [
                [['Fortune tolls for you'], setupFortuneTolls],
                [['Blackfriday special'], setupBlackfridaySpecial],
                [['Fading payout', 'Lucky fading payout'], setupFadingPayout],
                [['All is well', 'Six bells'], setupTimedGoldenCookies],
                [['Weakest link', 'The next weakest link', 'No more weak links'], setupWeakestLink],
                [['Turtles all the way down'], setupBuildingPriceModifications],
                [['Better fortune typist'], setupBetterFortuneTypist],
                [['Unfortunate cookies'], setupUnfortunateCookies],
                [['Cockroaches', 'Infestation', 'The prize at the bottom of the box', 'Double box prize', 'Mail in sweepstake winner'], setupWrinklerPopSpawn],
                [['Regifting'], setupRegifting],
                [['Distilled essence of retripled luck'], setupRetripledLuck],
                [['Unlucky luckier', 'Even more unlucky luckier', 'Slightly less bitter wrath', 'Flavor enhanced wrath'], setupCookieReduction],
                [['Fish tank', 'Sunken treasure', 'Aquaculturist', 'Hatchery effect'], setupFishShimmers],
                [['Erasable pens'], setupErasablePens],
                [['Frenziered elders', 'Godzamok\'s Headstart', 'Creative tax evasion'], setupBuffModifiers],
                [['Critical feedback mass'], setupCriticalFeedbackMass],
                [['Dark chocolate milk'], setupDarkChocolateMilk],
                [['Magical hourglass'], setupMagicalHourglass],
                [['Sweet refunds'], setupSweetRefunds],
                [['The legend of Krumblor'], setupKrumblorSlot],
                [['Mega clicks', 'Lucky mega clicks', 'Extreme mega clicks'], setupMegaClicks],
                [['Idle clicks'], setupIdleClickers],
                [['Clicklers'], setupBrinklers]
            ];
            // Skip all owned setup functions in Born Again mode (upgrades remain owned but have no effect)
            if (Game.ascensionMode != 1) {
                for (var i = 0; i < ownedSetups.length; i++) {
                    if (jneHasAny(ownedSetups[i][0])) {
                        ownedSetups[i][1]();
                    }
                }
            }
            if (Game.Has('Bingo center slots')) {
                var now = jneEvery('_jneBingoCenterSlotsLast', 60000); ///60000
                if (now && Game.OnAscend !== 1 && Game.Has('Bingo center/Research facility') && Game.Objects['Grandma']) {
                    var grandmas = Game.Objects['Grandma'].amount;
                    var slotsChance = Math.sqrt(grandmas * 500) / 2000000; //square root scaling for diminishing returns
                    if (Game.Has('When the sun goes down') && Game.elderWrath > 0) slotsChance *= 2;
                    if (grandmas > 0 && Math.random() < slotsChance) {
                        Game.JNE.bingoJackpotWins = (Game.JNE.bingoJackpotWins || 0) + 1;
                        if (!Game.JNE.ascensionSpecialJackpots) Game.JNE.ascensionSpecialJackpots = 0;
                        var bingoSlotsIcon = (Game.Upgrades && Game.Upgrades['Bingo center slots'] && Game.Upgrades['Bingo center slots'].icon) ? Game.Upgrades['Bingo center slots'].icon : [31, 12];
                        var roll = Math.random() * 100;
                        var specialJackpotsRemaining = 3 - (Game.JNE.ascensionSpecialJackpots || 0);

                        if (specialJackpotsRemaining <= 0) {
                            // Only normal jackpots available after cap reached
                            if (roll < 75) {
                                var exp = Math.floor(Math.log10(Game.cookiesPsRaw || 1));
                                var cookiesEarned = 7.77 * Math.pow(10, exp + 5);
                                Game.Earn(cookiesEarned);
                                new Game.Note('Jackpot!', 'A grandma has hit the jackpot in slots and earned <b>' + Beautify(cookiesEarned) + '</b> cookies!', bingoSlotsIcon, 43200);
                            } else {
                                new Game.shimmer('golden');
                                new Game.Note('Jackpot!', 'A grandma won a <b>golden cookie</b> while playing slots!', bingoSlotsIcon, 43200);
                            }
                        } else {
                            // All jackpots available
                            if (roll < 60) {
                                var exp = Math.floor(Math.log10(Game.cookiesPsRaw || 1));
                                var cookiesEarned = 7.77 * Math.pow(10, exp + 5);
                                Game.Earn(cookiesEarned);
                                new Game.Note('Jackpot!', 'A grandma has hit the jackpot in slots and earned <b>' + Beautify(cookiesEarned) + '</b> cookies!', bingoSlotsIcon, 43200);
                            } else if (roll < 80) {
                                new Game.shimmer('golden');
                                new Game.Note('Jackpot!', 'A grandma won a <b>golden cookie</b> while playing slots!', bingoSlotsIcon, 43200);
                            } else if (roll < 97) {
                                Game.Earn(Game.cookies * 0.1);
                                Game.JNE.ascensionSpecialJackpots++;
                                new Game.Note('Jackpot!', 'A grandma won the mega jackpot while playing slots and your cookie bank has been <b>increased by 10%!</b>', bingoSlotsIcon, 43200);
                            } else {
                                Game.gainLumps(1);
                                Game.JNE.ascensionSpecialJackpots++;
                                new Game.Note('Jackpot!', 'A grandma hit the mega sugar jackpot in slots and won a <b>free sugar lump!</b>', bingoSlotsIcon, 43200);
                            }
                        }
                    }
                }
            }
            if (Game.Has('Doordashing every day') || Game.Has('Second day takeout') || Game.Has('Chinese leftovers')) {
                if (!Game.JNE.heavenlyUpgradesSavedData) Game.JNE.heavenlyUpgradesSavedData = {};
                var now = jneEvery('_fortuneCookieRegenLastCheck', 60000);
                if (now) {
                    // Use the shortest owned interval (1d/2d/3d)
                    var intervals = [];
                    if (Game.Has('Doordashing every day')) intervals.push(24 * 60 * 60 * 1000);
                    if (Game.Has('Second day takeout')) intervals.push(2 * 24 * 60 * 60 * 1000);
                    if (Game.Has('Chinese leftovers')) intervals.push(3 * 24 * 60 * 60 * 1000);
                    var interval = intervals.length ? Math.min.apply(null, intervals) : 0;
                    if (interval > 0) {
                        var gcUsed = (Game.fortuneGC === 1);
                        var cpsUsed = (Game.fortuneCPS === 1);
                        var gcLastUseTime = Game.JNE._fortuneGCTimer || 0;
                        var cpsLastUseTime = Game.JNE._fortuneCPSTimer || 0;

                        // Start each timer only once that specific fortune is used
                        if (gcUsed && !gcLastUseTime) {
                            Game.JNE._fortuneGCTimer = now;
                            gcLastUseTime = now;
                        }
                        if (cpsUsed && !cpsLastUseTime) {
                            Game.JNE._fortuneCPSTimer = now;
                            cpsLastUseTime = now;
                        }

                        // Reset each fortune independently once its own timer elapses
                        if (gcLastUseTime && (now - gcLastUseTime >= interval)) {
                            Game.fortuneGC = 0;
                            Game.JNE._fortuneGCTimer = 0;
                        }
                        if (cpsLastUseTime && (now - cpsLastUseTime >= interval)) {
                            Game.fortuneCPS = 0;
                            Game.JNE._fortuneCPSTimer = 0;
                        }
                    }
                }
            }
            if (Game.Upgrades && Game.Upgrades['The checkbox']) {
                var now = jneEvery('_jneCheckboxLastRoll', 3600000);
                if (now && Game.Upgrades['The checkbox'].bought && Math.random() < 0.01)
                    {
                        Game.Earn(Game.Has('Improved checkboxes') ? 1000 : 1);
                    }
            }

            if (Game.Upgrades && ((Game.Upgrades['Morrowen, Spirit of Procrastination'] && Game.Upgrades['Morrowen, Spirit of Procrastination'].bought) || (Game.Upgrades['Solgreth, Spirit of Selfishness'] && Game.Upgrades['Solgreth, Spirit of Selfishness'].bought))) {
                addNewPantheonSpirits();
            }
        }

        var PREDICTOR_TYPE_GATES = {meaty: 'Sugar predictor', bifurcated: 'Sugar predictor II', caramelized: 'Sugar predictor III', golden: 'Sugar predictor IV'};
        function predictorTypeOwned(key) {
            return !!Game.Has(PREDICTOR_TYPE_GATES[key]);
        }

        function setupLumpTooltipEnhancements() {
            if (!Game.lumpTooltip || Game._lumpTooltipHooked || (!Game.Has('Sugar insight') && !Game.Has('Sugar predictor'))) return;
            if (Game.Has('Sugar predictor') && !Game._sugarPredictorHooked && typeof Game.getLumpPredictions !== 'function') return;

            hookOnce(Game, 'lumpTooltip', '_jneLumpTip', function(orig) { return function() {
                var typeIcons = [[29, 14], [29, 15], [29, 16], [29, 17], [29, 27]];
                var typeNames = ['Normal', 'Bifurcated', 'Golden', 'Meaty', 'Caramelized'];
                var keys = ['bifurcated', 'golden', 'meaty', 'caramelized'];
                var str = orig.call(this);
                var helpStart = str.indexOf('&bull;');
                if (helpStart !== -1) {
                    var helpEnd = str.indexOf('</div>', helpStart);
                    var lineStart = str.lastIndexOf('<div class="line"></div>', helpStart);
                    if (helpEnd !== -1 && lineStart !== -1) {
                        str = str.substring(0, lineStart) + str.substring(helpEnd + 6);
                    }
                }

                if (Game.Has('Sugar insight') && Game.lumpCurrentType !== undefined) {
                    var currentLumpType = Game.lumpCurrentType;
                    var currentLumpIcon = typeIcons[currentLumpType];
                    str += '<div class="line"></div>';
                    str += '<div style="text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;color:#aaa;"><span>Current growing lump:</span> ' +
                        '<div style="display:inline-block;width:24px;height:24px;overflow:hidden;margin-left:-10px;">' +
                        '<div class="icon" style="background-position:-' + (currentLumpIcon[0]*48) + 'px -' + (currentLumpIcon[1]*48) + 'px;transform:scale(0.5);transform-origin:0 0;"></div></div> ' +
                        '<span>' + typeNames[currentLumpType] + '</span></div>';
                }

                // Hide predictor UI when Choose Your Own Lump is active so its interface can take over
                if (!Game.Has('Sugar predictor') || (window.CYOL && window.CYOL.isLoaded) || (Game.mods && Game.mods['Choose Your Own Lump'])) return str;

                var pred = Game.getLumpPredictions();
                var lookupTableValid = Game._lumpGameStates && Game._lumpGameStates.length > 0 &&
                                    Game._lumpGameStates[0].predictedType !== undefined &&
                                    Game._lumpGameStatesLumpT === Game.lumpT;

                if (!pred || !lookupTableValid) {
                    str += '<div class="line"></div><div class="green"><b>Calculating predictions...</b></div>';
                    return str;
                }

                var current = lumpAuraState();
                current.wrath = Game.jneNormalizeElderWrathForPredictor();

                var currentType = Game.predictLumpTypeWithState(Game.lumpT, current.grandmas, current.rigidel, current.rigidelActive, current.dragonsCurve, current.realityBending, current.wrath, current.supremeIntellect);
                var icon = typeIcons[currentType];

                str += '<div class="line"></div>';
                str += '<div style="text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;"><b>Predicted next lump on auto-harvest:</b> ' +
                    '<div style="display:inline-block;width:24px;height:24px;overflow:hidden;margin-left:-10px;">' +
                    '<div class="icon" style="background-position:-' + (icon[0]*48) + 'px -' + (icon[1]*48) + 'px;transform:scale(0.5);transform-origin:0 0;"></div></div> ' +
                    '<b class="green">' + typeNames[currentType] + '</b></div>';

                var showDebug = !!Game._sugarPredictorDebug || !!(Game.keys && Game.keys[16]);
                if (showDebug) {
                    var auraMult = (Game.auraMult ? (Game.auraMult('Dragon\'s Curve') || 0) : 0);
                    var curveMultDerived = (current.dragonsCurve ? 1 : 0) + (current.realityBending ? 0.1 : 0);
                    var ripeAge = Game.lumpRipeAge;
                    var harvestTime = (Game.lumpT + Game.lumpOverripeAge);
                    var byWrath = Game.predictLumpTypesByWrathWithState(Game.lumpT, current.grandmas, current.rigidel, current.rigidelActive, current.dragonsCurve, current.realityBending, undefined, current.supremeIntellect);
                    var mod10 = (Game.BuildingsOwned || 0) % 10;
                    var tableSig = (Game._lumpGameStatesLumpT === Game.lumpT ? 'ok' : 'stale') +
                        ', upg=' + (Game.getLumpPredictorUpgradeSig ? Game.getLumpPredictorUpgradeSig() : '');

                    str += '<div class="line"></div>';
                    str += '<div style="font-size:10px;line-height:1.2;color:#bbb;">' +
                        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
                            '<div><b>Predictor debug</b></div>' +
                            '<div></div>' +
                        '</div>' +
                        '<div>lumpT: <b>' + Game.lumpT + '</b> | harvestTime: <b>' + harvestTime + '</b></div>' +
                        '<div>grandmas: <b>' + Math.floor(current.grandmas) + '</b> | wrath: <b>' + current.wrath + '</b> | buildingsmod: <b>' + mod10 + '</b></div>' +
                        '<div>rigidel: <b>' + current.rigidel + '</b> | dc: <b>' + current.dragonsCurve + '</b> | rb: <b>' + current.realityBending + '</b> | si: <b>' + current.supremeIntellect + '</b></div>' +
                        '<div>curve: <b>' + curveMultDerived.toFixed(1) + '</b> | auraMult: <b>' + (auraMult + '').replace(/\.0+$/, '') + '</b></div>' +
                        '<div>ripeAge(ms): <b>' + Math.floor(ripeAge) + '</b></div>' +
                        '<div>tableSig: <b>' + tableSig + '</b></div>' +
                        '<div>predictedByWrath: <b>[' + byWrath[0] + ',' + byWrath[1] + ',' + byWrath[2] + ',' + byWrath[3] + ']</b></div>' +
                    '</div>';
                }

                for (var i = 0; i < 4; i++) {
                    if (!predictorTypeOwned(keys[i])) continue;
                    var res = pred[keys[i]];
                    icon = typeIcons[i + 1];

                    var allMet = false;
                    if (res.found && res.solution) {
                        var sol = res.solution;
                        var met = Game.evaluateLumpSolutionMet ? Game.evaluateLumpSolutionMet(current, sol) : null;
                        allMet = !!(met && met.allMet);
                    }

                    var isCurrentType = currentType === i + 1;
                    var showGreen = allMet && isCurrentType;

                    if (showGreen) {
                        str += '<div class="listing" style="padding:4px 6px;margin:4px 0px;border-radius:4px;background:#2e7d32;border:2px solid #4caf50;display:flex;align-items:center;">';
                    } else {
                        str += '<div class="listing" style="padding:4px 6px;margin:4px 0px;opacity:0.8;border-radius:4px;background:#333;display:flex;align-items:center;">';
                    }

                    str += '<div style="display:inline-block;width:26px;height:24px;overflow:hidden;flex-shrink:0;">'
                        + '<div class="icon" style="background-position:-' + (icon[0]*48) + 'px -' + (icon[1]*48) + 'px;transform:scale(0.5);transform-origin:0 0;"></div></div>'
                        + '<div style="display:flex;align-items:center;gap:10px;margin-left:8px;">'
                        + (res.found ? Game.formatLumpSolution(res.solution) : '<span class="red">Not possible</span>')
                        + '</div></div>';
                }

                return str;
            }; });
            Game._lumpTooltipHooked = true;
        }

        if (!Game.Upgrade) {
            var checkGame = setInterval(function() {
                if (Game.Upgrade) {
                    clearInterval(checkGame);
                    initializeHeavenlyUpgrades();
                }
            }, 100);
            setTimeout(function() {
                clearInterval(checkGame);
                if (!isInitialized) {
                    console.error('[Heavenly Upgrades] Failed to initialize');
                }
            }, 10000);
            return;
        }

        setTimeout(initializeHeavenlyUpgrades, 0);

        function initializeHeavenlyUpgrades() {
            if (isInitialized || !Game.Upgrade || !Game.UpgradesById) {
                if (!isInitialized && Game.Upgrade) {
                    setTimeout(initializeHeavenlyUpgrades, 100);
                }
                return;
            }

            isInitialized = true;
            setupAscensionStateHooks();
            setupOverheadItems();
            createUpgrades();
            if (Game.registerHook && !Game._jneUpgradeSetupsCheckHooked) {
                Game.registerHook('check', runUpgradeSetups, 'JNE upgrade setups');
                Game.registerHook('check', function() { reconcileOwnedFeatures(); }, 'JNE owned features');
                Game._jneUpgradeSetupsCheckHooked = true;
            }
            if (Game.registerHook && !Game._jneSeedsLabelHooked) {
                Game.registerHook('draw', updateSeedsLabel, 'JNE bonus seeds label');
                Game._jneSeedsLabelHooked = true;
            }
            // Create ALL conditional upgrades NOW before any load can happen
            // so box contents, toggle upgrades, etc. exist when save data is loaded
            runUpgradeSetups(true);  // forceAll=true to skip ownership checks

            setupGameEffModifiers();
            setupCpsModifiers();
            setupBuildingPriceModifications();
            setupCookieDisplayUnit();

            setupBigCookieImageSelector();

            // Create pantheon gods NOW so they exist when save data is loaded
            addNewPantheonSpirits();

            // If loading into an existing game, check for existing save data and restore it
            var _huSaved = Game.JNE.heavenlyUpgradesSavedData;
            if (_huSaved) {
                load(_huSaved);
            } else {
            }

            // Register a one-time check to update seed unlock states and soil after upgrades are loaded
            if (!window._jneSeedUnlockHooked) {
                var checkCount = 0;
                var checkUnlocks = function() {
                    var M = minigameOf('Farm');
                    if (!M || !M.plants) {
                        return;
                    }

                    var needsRebuild = false;

                    if (Game.Has('Aerated soil') && !M._aeratedSoilHooked && M.soils && typeof l === 'function') {
                        setupAeratedSoil();
                        needsRebuild = true;
                    }

                    if (needsRebuild && M.buildPanel) {
                        M.buildPanel();
                    }

                    // Also hook M.init to rebuild when garden is opened
                    if (checkCount === 0 && M.init && !M._jneInitHookedForRebuild) {
                        M._jneInitHookedForRebuild = true;
                        hookOnce(M, 'init', '_jneSoilInit', function(orig) { return function(div) {
                            var M = minigameOf('Farm');
                            var result = orig.call(this, div);
                            // after origInit so l('gardenSoils') is defined
                            if (Game.Has('Aerated soil') && M.soils) {
                                setupAeratedSoil();
                            }
                            return result;
                        }; });
                    }

                    checkCount++;
                    if (checkCount < 10) {
                        setTimeout(checkUnlocks, 100);
                    }
                };
                setTimeout(checkUnlocks, 100);
                window._jneSeedUnlockHooked = true;
            }

        }

        function setupAscensionStateHooks() {
            if (!Game.registerHook || Game._jneAscensionStateHooksHooked) return;
            Game._jneAscensionStateHooksHooked = true;

            var ensureSugarTradeAvailable = function() {
                if (!Game.Has || !Game.Has('Sugar for sugar trading')) return;
                var st = Game.Upgrades && Game.Upgrades['Sugar trade'];
                if (!st) {
                    try { runUpgradeSetups(); } catch (e) {}
                    st = Game.Upgrades && Game.Upgrades['Sugar trade'];
                }
                if (st) {
                    st.unlocked = 1;
                    st.bought = 0;
                }
            };

            var resetSugarFrenzyIIState = function() {
                if (!Game.Has || !Game.Has('Sugar frenzy II')) return;
                Game.sugarFrenzyPrice = 1;
                Game.sugarFrenzyLastUse = 0;
            };

            var resetReoccuringBusinessState = function() {
                if (!Game.Has || !Game.Has('Reoccuring business')) return;
                Game.sugarTradePrice = 1;
                Game.sugarTradeLastUse = 0;
            };

            var invalidateSugarLumpPredictorCache = function() {
                if (typeof Game.calculateLumpPredictions !== 'function') return;
                Game._lumpGameStatesLumpT = null;
                Game._lumpPredictionCache = null;
                Game._lastLumpPredictionState = null;
                Game._lumpPredictionInProgress = false;
                Game._lumpPredictionPending = false;
            };

            // a reset wipes the garden and temple, so a held block from before it must not be applied afterwards
            Game.registerHook('reset', function() {
                if (Game.JNE) { Game.JNE._pendingGarden = null; Game.JNE._pendingPantheon = null; }
            }, 'JNE held minigame blocks');

            Game.registerHook('reset', function(hard) {
                if (hard) return;
                invalidateSugarLumpPredictorCache();
                resetSugarFrenzyIIState();
                resetReoccuringBusinessState();
                ensureSugarTradeAvailable();
                // Reset Morroween slot time and Slogreth on ascension
                if (minigameOf('Temple')) {
                    var M = minigameOf('Temple');
                    M._procrastinationSlotTime = null;
                    M._selfishnessClickCount = 0;
                }
                // Reset special jackpot counter on ascension
                if (Game.JNE) Game.JNE.ascensionSpecialJackpots = 0;
                Game.storeToRefresh = 1;
            }, 'JNE ascension state reset');

            Game.registerHook('reincarnate', function() {
                setTimeout(function() {
                    // do not call runUpgradeSetups() here - it recreates conditional upgrades with bought=0,
                    // wiping save data before our load function can restore it. The check hook handles this.
                    invalidateSugarLumpPredictorCache();
                    resetSugarFrenzyIIState();
                    ensureSugarTradeAvailable();

                    if (Game.Has('Toy box') && Game.Upgrades['Toy mode [on]'] && Game.Upgrades['Toy mode [off]']) {
                        if (!Game.Has('Toy mode [off]') && !Game.Has('Toy mode [on]')) {
                            var toys = Game.TOYS || 0;
                            if (toys === 1) {
                                Game.Unlock('Toy mode [on]');
                                Game.Upgrades['Toy mode [on]'].earn();
                            } else {
                                Game.Unlock('Toy mode [off]');
                                Game.Upgrades['Toy mode [off]'].earn();
                            }
                        }
                    }
                    if (Game.Has('Pink stuff') && Game.Upgrades['Pink stuff [on]'] && Game.Upgrades['Pink stuff [off]']) {
                        if (!Game.Has('Pink stuff [off]') && !Game.Has('Pink stuff [on]')) {
                            var winklers = Game.WINKLERS || 0;
                            if (winklers === 1) {
                                Game.Unlock('Pink stuff [on]');
                                Game.Upgrades['Pink stuff [on]'].earn();
                            } else {
                                Game.Unlock('Pink stuff [off]');
                                Game.Upgrades['Pink stuff [off]'].earn();
                            }
                        }
                    }
                    if (Game.Has('Big cookie image selector') && Game.Upgrades['Cookie image selector']) {
                        Game.Unlock('Cookie image selector');
                    }

                    Game.storeToRefresh = 1;
                    Game.upgradesToRebuild = 1;
                    if (Game.RebuildUpgrades) { Game.RebuildUpgrades(); }
                    if (Game.RefreshStore) { Game.RefreshStore(); }
                }, 0);
            }, 'JNE ascension state reincarnate');
        }

        function setupOverheadItems() {
            if (Game._jneOverheadItemsSetup) return;
            Game._jneOverheadItemsSetup = true;
            if (!Game._achievementWinCallbacks) Game._achievementWinCallbacks = [];
            if (!Game._achievementWinExtended) {
                hookOnce(Game, 'Win', '_jneWin', function(orig) { return function(what) {
                    var wasWon = false;
                    var achievement = null;
                    if (typeof what === 'string' && Game.Achievements[what]) {
                        achievement = Game.Achievements[what];
                        wasWon = achievement.won === 1;
                    }
                    var result = orig.apply(this, arguments);
                    if (achievement && !wasWon && achievement.won === 1) {
                        for (var i = 0; i < Game._achievementWinCallbacks.length; i++) {
                            try {
                                Game._achievementWinCallbacks[i](achievement);
                            } catch (e) {

                            }
                        }
                    }

                    return result;
                }; });

                // Mark as extended to prevent multiple extensions
                Game._achievementWinExtended = true;
            }
            var positiveFeedbackLoopIcon = JNE.icon(22, 17, 'custom');
            setupCustomBuffTypes();
            Game._achievementWinCallbacks.push(function(achievement) {
                if (Game.JNE && (Game.JNE.isLoadingFromSave || (Game.JNE.isAccomplishmintInEffect && Game.JNE.isAccomplishmintInEffect()))) return;
                if (Game.Has('Positive feedback loop') && Game.gainBuff) {
                    Game.gainBuff('feedback loop', 3600, 1);
                    Game.Notify('Positive feedback loop!', 'Golden cookies appear 10% more often for the next hour.', positiveFeedbackLoopIcon);
                }
            });
        }

        function setupCustomBuffTypes() {
            if (Game._jneCustomBuffTypesCreated) return;
            if (!Game.buffType || typeof Game.buffType !== 'function') return;

            if (Game.buffTypesByName && !Game.buffTypesByName['feedback loop']) {
                var positiveFeedbackLoopIcon = JNE.icon(22, 17, 'custom');
                new Game.buffType('feedback loop', function(time, pow) {
                    return {
                        name: 'Feedback loop',
                        desc: 'You find 10% more golden cookies for the next ' + Game.sayTime(time * Game.fps, -1) + '.',
                        icon: positiveFeedbackLoopIcon,
                        time: time * Game.fps
                    };
                });
            }

            if (Game.buffTypesByName && !Game.buffTypesByName['gilded allure']) {
                new Game.buffType('gilded allure', (t,p)=>({name:'Gilded allure',desc:'Golden cookies appear 30% more often for the next '+Game.sayTime(t*Game.fps,-1)+'.',icon:JNE.icon(20,19,'custom'),time:t*Game.fps}));
                new Game.buffType('midas curse', (t,p)=>({name:'Midas curse',desc:'Golden cookies appear 75% less often for the next '+Game.sayTime(t*Game.fps,-1)+'.',icon:JNE.icon(20,19,'custom'),time:t*Game.fps}));
            }

            if (Game.buffTypesByName && !Game.buffTypesByName['jam filling']) {
                new Game.buffType('jam filling', function(time, pow) {
                    return { name: 'Jam filling', desc: 'Cookie production x' + pow + ' for ' + Game.sayTime(time * Game.fps, -1) + '!', icon: JNE.icon(17, 18, 'custom'), multCpS: pow, time: time * Game.fps };
                });
            }

            Game._jneCustomBuffTypesCreated = true;
        }

        // Vanilla resets permanent slots to five, so slot VI is re-added here
        var PERMANENT_SLOT_NAMES = ['Permanent upgrade slot I', 'Permanent upgrade slot II', 'Permanent upgrade slot III', 'Permanent upgrade slot IV', 'Permanent upgrade slot V', 'Permanent upgrade slot VI'];
        function ensurePermanentSlots() {
            var slots = Game.permanentUpgrades;
            if (!slots) return;
            while (slots.length < PERMANENT_SLOT_NAMES.length) slots.push(-1);
        }
        // Vanilla's picker draws its left crate from the numerals sheet, which has no VI: slot VI gets the custom icon there.
        // Re-checked each tick, so a reassigned Game.AssignPermanentSlot is wrapped too.
        function ensurePermanentPicker() {
            var assign = Game.AssignPermanentSlot;
            if (!assign || assign._jneSlotVI) return;
            var wrapped = function(slot) {
                var result = assign.apply(this, arguments);
                var host = slot >= 5 ? l('promptContentPickPermaUpgrade') : null;
                var crate = host && host.querySelector('.crate.upgrade.enabled');
                if (crate) {
                    var vi = JNE.icon(21, 27, 'custom');
                    crate.style.backgroundImage = 'url(' + vi[2] + ')';
                    crate.style.backgroundPosition = (-vi[0] * 48) + 'px ' + (-vi[1] * 48) + 'px';
                }
                return result;
            };
            wrapped._jneSlotVI = true;
            Game.AssignPermanentSlot = wrapped;
        }
        function setupPermanentSlotUpgrade(upgrade, slot) {
            ensurePermanentPicker();
            if (!Game._jnePermanentSlotHook && Game.registerHook) {
                Game._jnePermanentSlotHook = true;
                Game.registerHook('check', function() { ensurePermanentSlots(); ensurePermanentPicker(); }, 'JNE permanent slot VI');
            }
            upgrade.iconFunction = function() { ensurePermanentSlots(); var id = Game.permanentUpgrades[slot]; return id === -1 || id === undefined ? JNE.icon(21, 27, 'custom') : Game.UpgradesById[id].icon; };
            upgrade.activateFunction = function() { ensurePermanentSlots(); Game.AssignPermanentSlot(slot); };
            upgrade.descFunc = function(context) {
                ensurePermanentSlots();
                var id = Game.permanentUpgrades[slot];
                var click = context == 'stats' ? '' : '<br><b>' + loc('Click to activate.') + '</b>';
                if (id === undefined || id === -1) return this.desc + click;
                var up = Game.UpgradesById[id];
                return '<div style="text-align:center;">' + loc('Current:') + ' ' + tinyIcon(up.icon) + ' <b>' + up.dname + '</b><div class="line"></div></div>' + this.ddesc + click;
            };
        }

        function setupErasablePens() {
            if (!Game.Has('Erasable pens') || !Game.Upgrades || !Game.AssignPermanentSlot) return;
            var slotNames = PERMANENT_SLOT_NAMES;
            for (var i = 0; i < slotNames.length; i++) {
                var upgrade = Game.Upgrades[slotNames[i]];
                if (upgrade && !upgrade._erasablePensModified) {
                    if (!upgrade._jneOriginalActivateFunction) upgrade._jneOriginalActivateFunction = upgrade.activateFunction;
                    upgrade._jneErasablePensSlot = i;
                    upgrade.activateFunction = function() {
                        var savedOnAscend = Game.OnAscend;
                        try {
                            if (Game.Has('Erasable pens') && Game.OnAscend !== 1) Game.OnAscend = 1;
                            if (this._jneOriginalActivateFunction && typeof this._jneOriginalActivateFunction === 'function') {
                                this._jneOriginalActivateFunction.call(this);
                            } else if (Game.AssignPermanentSlot) {
                                Game.AssignPermanentSlot(this._jneErasablePensSlot);
                            }
                        } finally {
                            Game.OnAscend = savedOnAscend;
                        }
                    };
                    upgrade._erasablePensModified = true;
                }
            }
        }

        if (Game.JNE && !Game.JNE.menuHooks) {
            Game.JNE.menuHooks = [];
        }

        var erasablePensHook = function() {
            if (Game.Has('Erasable pens')) {
                setTimeout(function() {
                    var slotNames = PERMANENT_SLOT_NAMES;
                    var allCrates = document.querySelectorAll('div.crate.upgrade.heavenly');
                    for (var i = 0; i < slotNames.length; i++) {
                        var upgrade = Game.Upgrades[slotNames[i]];
                        if (!upgrade) continue;
                        for (var j = 0; j < allCrates.length; j++) {
                            var crate = allCrates[j];
                            if ((crate.getAttribute('onmouseover') || '').indexOf('UpgradesById[' + upgrade.id + ']') !== -1 && !crate._erasablePensHandlerAdded) {
                                crate.addEventListener('click', (function(slot, slotUpgrade) {
                                    return function(e) {
                                        // Vanilla owns the ascend screen and the purchase: only an owned slot clicked in-run is ours
                                        if (!slotUpgrade.bought || Game.OnAscend) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (Game.AssignPermanentSlot) Game.AssignPermanentSlot(slot);
                                        return false;
                                    };
                                })(i, upgrade), true);
                                crate._erasablePensHandlerAdded = true;
                                break;
                            }
                        }
                    }
                }, 100);
            }
        };

        if (Game.JNE.menuHooks.indexOf(erasablePensHook) === -1) {
            Game.JNE.menuHooks.push(erasablePensHook);
        }

        var origDescs = {};
        var DESC_FIELDS = ['baseDesc', 'ddesc', 'desc'];
        function updateSeasonDescs() {
            var h = 24 + seasonExtraHours();
            SEASON_BISCUITS.forEach(function(n) {
                var u = Game.Upgrades[n];
                if (!u) return;
                if (!origDescs[n]) origDescs[n] = DESC_FIELDS.map(function(f) { return u[f]; }).find(function(t) { return typeof t === 'string' && t.indexOf('24') !== -1; });
                if (!origDescs[n]) return;
                var d = origDescs[n].replace('24', h);
                DESC_FIELDS.forEach(function(f) { if (typeof u[f] === 'string') u[f] = d; });
            });
        }

        function setupSeasonalDuration() {
            if (Game.getSeasonDuration && !Game.getSeasonDuration._heavenlyUpgradesHooked) {
                hookOnce(Game, 'getSeasonDuration', '_jneSeasonDur', function(orig) { return function() {
                    var raw = orig.apply(this, arguments);
                    var baseDuration = Number(raw);
                    if (!isFinite(baseDuration) || baseDuration <= 0) return raw;
                    var extraHours = seasonExtraHours();
                    var fps = Game.fps || 30;
                    updateSeasonDescs();
                    return baseDuration + (fps * 60 * 60 * extraHours);
                }; });
                Game.getSeasonDuration._heavenlyUpgradesHooked = true;
                setTimeout(updateSeasonDescs, 500);
            }
        }

        function setupBuildingPriceModifications() {
            if (Game._buildingPriceModificationsHooked) {
                return;
            }

            if (!Game.modifyBuildingPrice) {
                Game.modifyBuildingPrice = function(building, price) {
                    return price;
                };
            }

            hookOnce(Game, 'modifyBuildingPrice', '_jneBldgPrice', function(orig) { return function(building, price) {
                var modifiedPrice = orig.call(this, building, price);

                // Apply Turtles discount (level-based max 25%)
                if (Game.Has('Turtles all the way down') && building && building.level !== undefined) {
                    var level = Math.min(building.level || 0, 25); // Cap at level 25
                    var discount = 1 - (level * 0.01);
                    modifiedPrice *= discount;
                }

                return modifiedPrice;
            }; });
            Game._buildingPriceModificationsHooked = true;
        }

        // Wraps the vanilla price and efficiency functions and scales the 7% by 1.15 (8.05%).
        function setupBetterFortuneTypist() {
            if (Game._betterFortuneTypistHooked) return;
            Game._betterFortuneTypistHooked = true;
            var FORTUNE_BASE = 0.07, TYPIST_SCALE = 1.15;
            var fortuneOwned = function(building) {
                return !!(building && building.fortune && Game.Has('Better fortune typist') && Game.Has(building.fortune.name));
            };

            hookOnce(Game, 'modifyBuildingPrice', '_jneTypistPrice', function(orig) { return function(building, price) {
                var modifiedPrice = orig.call(this, building, price);
                if (fortuneOwned(building)) modifiedPrice *= (1 - FORTUNE_BASE * TYPIST_SCALE) / (1 - FORTUNE_BASE);
                return modifiedPrice;
            }; });

            hookOnce(Game, 'GetTieredCpsMult', '_jneTypistCps', function(orig) { return function(me) {
                var mult = orig ? orig.call(this, me) : 1;
                if (fortuneOwned(me)) mult *= (1 + FORTUNE_BASE * TYPIST_SCALE) / (1 + FORTUNE_BASE);
                return mult;
            }; });

            // tooltips: the vanilla first sentence reads "<b>7%</b> more efficient and <b>7%</b> cheaper"
            for (var i = 1; i <= 20; i++) {
                var up = Game.Upgrades['Fortune #' + ('00' + i).slice(-3)];
                if (!up || up._jneTypistDesc) continue;
                up._jneTypistDesc = true;
                up.descFunc = function() {
                    var pct = Game.Has('Better fortune typist') ? Math.round(FORTUNE_BASE * 100 * TYPIST_SCALE) : Math.round(FORTUNE_BASE * 100);
                    return (this.ddesc || this.desc).replace(/<b>7%<\/b>/g, '<b>' + pct + '%</b>');
                };
            }
        }

        function setupCookieDisplayUnit() {
            if (!Game.Draw) return;
            if (Game.Draw._jneCookieDisplayHooked) return;
            hookOnce(Game, 'Draw', '_jneCookieDraw', function(orig) { return function() {
                //  don't draw if game isn't ready
                if (!Game.ready) return;

                try {
                    // may throw if minigame not loaded yet
                    var result = orig.apply(this, arguments);

                    // Only apply our modifications if vanilla draw succeeded
                    try {
                        if (Game.Has && Game.Has('Cookie calculations') && l('cookies')) {
                            if (window.modSettings && window.modSettings.cpsDisplayUnit && window.modSettings.cpsDisplayUnit !== 'seconds') {
                                var cpsElement = document.getElementById('cookiesPerSecond');
                                if (cpsElement) {
                                    var baseCps = Game.cookiesPs * (1 - (Game.cpsSucked || 0));
                                    var multipliers = { 'minutes': 60, 'hours': 3600, 'days': 86400 };
                                    var unitLabels = { 'minutes': 'per minute:', 'hours': 'per hour:', 'days': 'per day:' };
                                    var unit = window.modSettings.cpsDisplayUnit;
                                    if (multipliers[unit] && unitLabels[unit]) {
                                        var convertedValue = baseCps * multipliers[unit];
                                        var className = cpsElement.className || '';
                                        cpsElement.innerHTML = unitLabels[unit] + ' ' + Beautify(convertedValue, 1);
                                        cpsElement.className = className;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // Error in our modifications - don't crash
                    }

                    return result;
                } catch (e) {
                    // Vanilla draw failed (likely minigame.draw not ready) - skip this frame silently
                    return;
                }
            }; });
            Game.Draw._jneCookieDisplayHooked = true;
        }

        function setupGameEffModifiers() {
        if (!Game.eff || Game.eff._jneAllEffModifiersHooked) return;
        if (!Game._jneHeavenlyOriginalEff) Game._jneHeavenlyOriginalEff = Game.eff;
        Game.eff = function(what) {
            try {
                var val = Game._jneHeavenlyOriginalEff.apply(this, arguments);
                if (what === 'wrinklerEat') {
                    if (Game.Has('Ravenous leeches')) val *= 1.2;
                    else if (Game.Has('Hellish hunger')) val *= 1.1;
                } else if (what === 'wrinklerSpawn') {
                    if (Game.Has('Wide open door of hell')) val *= 1.2;
                    else if (Game.Has('Unlocked gates of hell')) val *= 1.1;
                } else if (what === 'upgradeCost') {
                    if (Game.Has('Wholesale discount club')) val *= 0.9;
                } else if (what === 'buildingCost') {
                    if (Game.Has('Self employed realtor')) val *= 0.9;
                } else if (what === 'itemDrops') {
                    if (Game.Has('Peaking under the tree')) val *= 1.1;
                } else if (what === 'reindeerFreq') {
                    if (gpocHas('Unfortunate #664')) val *= 1.0666;
                } else if (what === 'goldenCookieFreq' || what === 'wrathCookieFreq') {
                    if (what === 'wrathCookieFreq' && gpocHas('Unfortunate #661')) val *= 1.0666;
                    if (Game.hasBuff('Gilded allure')) val *= 1.3;
                    if (Game.hasBuff('Midas curse')) val /= 4;
                    if (Game.hasBuff('Feedback loop')) val *= 1.1;
                    var M = minigameOf('Temple');
                    if (M && M.gods['selfishness']) {
                        var godLevel = Game.hasGod('selfishness');
                        if (godLevel) {
                            var r = Math.min((M._selfishnessClickCount || 0) * [0, 0.03, 0.02, 0.01][godLevel], 1);
                            if (r < 1) val *= [1, 2, 1.5, 1.25][godLevel];
                        }
                    }
                } else if (what === 'cps') {
                    var M = minigameOf('Temple');
                    if (M && M.gods) {
                        if (M.gods['procrastination']) {
                            var godLevel = Game.hasGod('procrastination');
                            if (godLevel && M._procrastinationSlotTime) {
                                var h = (Date.now() - M._procrastinationSlotTime) / 3600000, d = Math.min(Math.floor(h / 24), 365), b = [0, 0.03, 0.02, 0.01][godLevel];
                                var t = b * (1 - Math.pow(0.99, d)) / 0.01;
                                if (d < 365) t += b * Math.pow(0.99, d) * (h % 24) / 24;
                                val *= (1 + t);
                            }
                        }
                        if (M.gods['selfishness']) {
                            var godLevel = Game.hasGod('selfishness');
                            if (godLevel) val *= (1 - Math.min((M._selfishnessClickCount || 0) * [0, 0.03, 0.02, 0.01][godLevel], 1));
                        }
                    }
                }
                return val;
            } catch (e) {
                // If there's an error, return the original result and log it
                console.error('[HU Game Eff] Error in eff hook:', e);
                return Game._jneHeavenlyOriginalEff ? Game._jneHeavenlyOriginalEff.apply(this, arguments) : 1;
            }
        };
        Game.eff._jneAllEffModifiersHooked = true;
    }

    var cpsModifiersRegistered = false;

        function setupCpsModifiers() {
            if (!Game.registerHook || cpsModifiersRegistered) {
                return;
            }
            Game.registerHook('cps', function(cps) {
                // Skip effect in Born Again mode
                if (Game.ascensionMode == 1) return cps;
                var mult = 1;
                if (Game.Has('Divine uninspiration') && minigameOf('Temple') && minigameOf('Temple').slot) {
                    var s = minigameOf('Temple').slot;
                    mult *= 1 + (s[2] === -1 ? 0.01 : 0) + (s[1] === -1 ? 0.02 : 0) + (s[0] === -1 ? 0.03 : 0);
                }
                if (Game.Has('Improved sugar crystal cookies')) {
                    for (var i in Game.Objects) if (Game.Objects[i].level >= 15) mult += 0.01;
                }
                if (Game.Has('Gilded sugar crystal cookies')) {
                    for (var i in Game.Objects) if (Game.Objects[i].level >= 20) mult += 0.01;
                }
                if (Game.lumps > 100) {
                    var cap = sugarBakingCap();
                    if (cap > 0) mult *= (1 + (Math.min(Game.lumps, cap) - 100) * 0.01);
                }
                if (Game.Has('Stacks on stacks on stacks') && Game.goldenClicksLocal) {
                    mult *= 1 + (Game.goldenClicksLocal * 0.0005);
                }
                if (gpocHas('Unfortunate #663')) mult *= 1 + vanillaShadowWon() / 100;
                return cps * mult;
            }, 'Centralized CPS modifiers');
            cpsModifiersRegistered = true;
            Game._jneCpsModifiersHooked = true;
        }

        // Brinkler bursts use brinklerbits.png (GitHub, then jsDelivr); same 8-frame 100x200 layout as vanilla
        function setupBrinklerBits() {
            if (Game._jneBrinklerBitsHooked || !Game.UpdateWrinklers || !Game.particlesDraw) return;
            var expr = "me.type==1?'shinyWrinklerBits.png':'wrinklerBits.png'";
            var upd = Game.UpdateWrinklers.toString();
            var sizeCheck = "if (me.pic=='wrinklerBits.png' || me.pic=='shinyWrinklerBits.png') {w=100;h=200;}";
            var pd = Game.particlesDraw.toString();
            if (upd.split(expr).length !== 3 || pd.split(sizeCheck).length !== 2) return;
            var BITS = { primary: 'https://raw.githubusercontent.com/dfsw/Cookies/main/assets/brinklerbits.png', fallback: 'https://cdn.jsdelivr.net/gh/dfsw/Cookies@main/assets/brinklerbits.png' };
            var bitsUrl = BITS.primary;
            var probe = new Image();
            probe.onerror = function() { bitsUrl = BITS.fallback; };
            probe.src = BITS.primary;
            window.jneBrinklerBits = function() { return bitsUrl; };
            window.jneIsBrinklerBits = function(s) { return s === BITS.primary || s === BITS.fallback; };
            // vanilla's inRect lives inside main.js's closure, so the copy gets its own (same maths)
            var jneInRect = function(x, y, rect) {
                var dx = x + Math.sin(-rect.r) * (-(rect.h / 2 - rect.o)), dy = y + Math.cos(-rect.r) * (-(rect.h / 2 - rect.o));
                var h1 = Math.sqrt(dx * dx + dy * dy);
                var newA = Math.atan2(dy, dx) - rect.r;
                var x2 = Math.cos(newA) * h1, y2 = Math.sin(newA) * h1;
                return x2 > -0.5 * rect.w && x2 < 0.5 * rect.w && y2 > -0.5 * rect.h && y2 < 0.5 * rect.h;
            };
            Game.UpdateWrinklers = (0, eval)('(function(inRect){return ' + upd.split(expr).join('(me.type==2?window.jneBrinklerBits():' + expr + ')') + ';})')(jneInRect);
            Game.particlesDraw = (0, eval)('(' + pd.replace(sizeCheck, "if (me.pic=='wrinklerBits.png' || me.pic=='shinyWrinklerBits.png' || window.jneIsBrinklerBits(me.pic)) {w=100;h=200;}") + ')');
            Game._jneBrinklerBitsHooked = true;
        }

        function setupBrinklers() {
            setupBrinklerBits();
            if (!Game.DrawWrinklers || Game._jneBrinklerDrawHooked) return;
            var marker = "else if (Game.season=='christmas') pic=Game.WINKLERS?'winterWinkler.png':'winterWrinkler.png';";
            var drawStr = Game.DrawWrinklers.toString();
            if (drawStr.indexOf(marker) < 0) return;
            Game._jneBrinklerDrawHooked = true;
            var brinklers = function() { return Game.wrinklers.filter(function(w) { return w.phase == 2 && w.type == 2; }); };
            // vanilla load pools every feeder's store and spreads it evenly, brinklers included; put the saved brinkler total back
            function splitLoadedBrinklerStores() {
                var saved = Game.JNE._pendingBrinkStore;
                Game.JNE._pendingBrinkStore = null;
                if (typeof saved !== 'number' || !(saved >= 0)) return;
                var feeders = Game.wrinklers.filter(function(w) { return w && w.phase == 2 && (w.type == 0 || w.type == 2); });
                var brink = feeders.filter(function(w) { return w.type == 2; });
                var normal = feeders.filter(function(w) { return w.type == 0; });
                if (!brink.length) return;
                var pool = feeders.reduce(function(t, w) { return t + w.sucked; }, 0);
                var brinkTotal = Math.min(saved, pool);
                brink.forEach(function(w) { w.sucked = brinkTotal / brink.length; });
                normal.forEach(function(w) { w.sucked = normal.length ? (pool - brinkTotal) / normal.length : 0; });
            }
            // vanilla sums every feeder into cpsSucked, so take the brinklers' share back out
            Game.registerHook('cps', function(cps) {
                var feeding = Game.wrinklers.filter(function(w) { return w.phase == 2; });
                if (feeding.length) Game.cpsSucked *= 1 - brinklers().length / feeding.length;
                return cps;
            }, 'JNE brinkler wither');
            // wraps mouseCps: vanilla overwrites the click after the hooks while Cursed finger is active; full click kept for the feed
            var full = 0, share = 0, mouseCps = Game.mouseCps;
            Game.mouseCps = function() {
                full = mouseCps.apply(this, arguments);
                share = Math.min(1, 0.025 * (Game.Has('The hunger grows') ? 2 : 1) * brinklers().length * Game.eff('wrinklerEat') * (1 + 0.2 * Game.auraMult('Dragon Guts')));
                return full * (1 - share);
            };
            Game.registerHook('click', function() {
                var feed = brinklers();
                feed.forEach(function(w) { w.sucked += full * share / feed.length; });
            }, 'JNE brinkler feed');
            // vanilla adds CpS to every feeder inside UpdateGrandmapocalypse; put brinklers' stores back as they were.
            // Subtracting in the logic hook drifted whenever a buff changed CpS between the add and that hook.
            hookOnce(Game, 'UpdateGrandmapocalypse', '_jneBrinklerAdd', function(orig) { return function() {
                var held = [];
                (Game.wrinklers || []).forEach(function(w) { if (w && w.type == 2) held.push([w, w.sucked]); });
                var result = orig.apply(this, arguments);
                held.forEach(function(h) { if (h[0].phase == 2) h[0].sucked = h[1]; });
                return result;
            }; });
            Game.registerHook('logic', function() {
                var active = Game.wrinklers.filter(function(w) { return w.phase > 0; });
                active.forEach(function(w) {
                    if (w.type != 2) return;
                    // vanilla only heals types 0 and 1
                    if (w.hp < Game.wrinklerHP) w.hp += 0.04;
                });
                // the pending count is a target, so a second load can't convert more
                var pending = Game.JNE._pendingBrinklers;
                if (!pending) return;
                var have = active.filter(function(w) { return w.type == 2; }).length;
                var converted = 0;
                active.forEach(function(w) { if (have < pending && w.type == 0) { w.type = 2; have++; converted++; Game.recalculateGains = 1; } });
                if (have >= pending) {
                    Game.JNE._pendingBrinklers = 0;
                    if (converted) splitLoadedBrinklerStores();
                    else Game.JNE._pendingBrinkStore = null;
                }
            }, 'JNE brinkler restore');
            Game.registerHook('reset', function() { Game.JNE._pendingBrinklers = 0; Game.JNE._pendingBrinkStore = null; }, 'JNE brinkler reset');
            // GitHub first, jsDelivr if it fails; binkler art shows when Game.WINKLERS is on; xmas art in Christmas season
            var art = {};
            ['brinkler.png', 'binkler.png', 'xmasbrinkler.png', 'xmasbinkler.png'].forEach(function(f) {
                var probe = new Image();
                probe.onerror = function() { art[f] = 'https://cdn.jsdelivr.net/gh/dfsw/Cookies@main/assets/' + f; };
                probe.src = art[f] = 'https://raw.githubusercontent.com/dfsw/Cookies/main/assets/' + f;
            });
            window.jneBrinklerUrl = function() { return art[Game.season == 'christmas' ? (Game.WINKLERS ? 'xmasbinkler.png' : 'xmasbrinkler.png') : (Game.WINKLERS ? 'binkler.png' : 'brinkler.png')]; };
            Game.DrawWrinklers = (0, eval)('(' + drawStr.replace(marker, marker + "\nif(me.type==2)pic=window.jneBrinklerUrl();") + ')');
        }

        function setupIdleClickers() {
            if (Game._jneIdleClickersHooked) return;
            Game._jneIdleClickersHooked = true;
            var dropMs = 200;
            addCss("#jneIdleBar{position:absolute;left:0px;top:0px;width:50px;height:8px;transform-origin:0px 0px;transform:translate(6px,61px) rotate(-90deg);z-index:100000}#jneIdleBarFill{position:absolute;left:0px;top:0px;bottom:0px;width:0px;pointer-events:none;background:url(https://cdn.jsdelivr.net/gh/dfsw/Cookies@main/assets/clickmeter.png)}#jneIdleBarHit{position:absolute;left:0px;top:0px;right:0px;bottom:0px}");
            var tip = Game.getTooltip('<div style="padding:8px;width:250px;font-size:11px;text-align:center;">Idle clicks refill slowly over time.<div class="line"></div>Each big cookie click drains your meter but your clicking power is increased the higher the meter is.</div>');
            l('sectionLeft').insertAdjacentHTML('beforeend', '<div id="jneIdleBar" class="smallFramed meterContainer"><div id="jneIdleBarFill"></div><div id="jneIdleBarHit" ' + tip + '></div></div>');
            var idle = Game.JNE.idleBar = Game.JNE.idleBar || { fill: 0 };
            var fillL = l('jneIdleBarFill'), barL = l('jneIdleBar');
            // 1.0x when empty, 1.2x at 50%, 2.0x when full; no boost below 3% (one drop) so the click that drains the last of it gets nothing.
            var exp = Math.log(5) / Math.log(2);
            var betterMult = function() { return Game.Has('Better idle clicking') ? 1.1 : 1; };
            var owned = function() { return Game.Has('Idle clicks'); };
            var boostOf = function(f) { return !owned() || f < 0.03 ? 1 : 1 + betterMult() * Math.pow(f, exp); };
            Game.registerHook('cookiesPerClick', function(c) { return c * boostOf(idle.fill); }, 'JNE idle clickers boost');
            Game.registerHook('click', function() { if (owned()) idle.fill = Math.max(0, idle.fill - 0.03); }, 'JNE idle clickers drain');
            Game.registerHook('reset', function() { idle.fill = 0; idle.shown = 0; }, 'JNE idle clickers reset');
            // vanilla only recalculates click power on gain changes, so refresh it before each press to use the current bar
            l('bigCookie').addEventListener('mousedown', function() { Game.computedMouseCps = Game.mouseCps(); });
            Game.registerHook('draw', function() {
                var now = Date.now();
                // not owned (a loaded save without it): no bar or meter, and it restarts empty if bought again
                if (!owned()) {
                    idle.fill = 0; idle.shown = 0; idle.t = now;
                    if (barL.style.display !== 'none') barL.style.display = 'none';
                    return;
                }
                if (barL.style.display === 'none') barL.style.display = '';
                var dt = idle.t ? now - idle.t : 0;
                idle.t = now;
                if (idle.shown === undefined) idle.shown = idle.fill;
                idle.fill = Math.min(1, idle.fill + betterMult() * Math.max(0.002, Math.sqrt(idle.fill)) * dt / 450000);
                // drops animate at 3% per dropMs but never trail the real meter by more than one drop; refills show at once
                idle.shown = Math.min(idle.shown, idle.fill + 0.03);
                idle.shown = idle.shown > idle.fill ? Math.max(idle.fill, idle.shown - 0.03 * dt / dropMs) : idle.fill;
                fillL.style.width = (idle.shown * 100) + '%';
                fillL.style.backgroundPosition = (-Game.realT * 0.5) + 'px 0px';
            }, 'JNE idle clickers draw');
        }

        function setupCriticalFeedbackMass() {
            if (Game._jneCriticalFeedbackHooked || !Game.JNE || !Game.JNE.addMagicCpSModifier) return;
            Game._jneCriticalFeedbackHooked = true;
            Game.JNE.addMagicCpSModifier(function(what, mult) {
                var b = Game.Objects[what];
                if (!b || !Game.Has('Critical feedback mass')) return mult;
                return mult * (1 + 0.001 * Math.floor(b.amount / 10));
            });
        }

        var DARK_MILK_NAMES = window.JNEData.vanillaShadowAchievements || [];
        function vanillaShadowWon() {
            return DARK_MILK_NAMES.filter(function(name) { var a = Game.Achievements[name]; return a && a.won; }).length;
        }
        function darkMilkBonus() { return Game.Has('Dark chocolate milk') ? vanillaShadowWon() / 25 : 0; }
        function setupDarkChocolateMilk() {
            if (Game._jneDarkMilkHooked) return;
            Game._jneDarkMilkHooked = true;
            var base = Game.milkProgress || 0;
            Object.defineProperty(Game, 'milkProgress', {
                configurable: true,
                enumerable: true,
                get: function() { return base + darkMilkBonus(); },
                set: function(v) { base = v; }
            });
        }

        // One shared <style> tag for mod CSS, so each setup appends rules instead of creating its own tag
        function addCss(rules) {
            var tag = document.getElementById('jneHeavenlyCss');
            if (!tag) { tag = document.createElement('style'); tag.id = 'jneHeavenlyCss'; document.head.appendChild(tag); }
            tag.textContent += rules;
        }

        function setupSweetRefunds() {
            if (Game._jneSweetRefundsHooked) return;
            Game._jneSweetRefundsHooked = true;
            addCss('.productSell{width:13px}.productSell:after{right:-2px}.productSell:before{content:"\\a0"}.productSell:after{bottom:-2px;transform:rotate(180deg)}');
            var lumps = function(n) { return '<b>' + LBeautify(n).b + ' sugar lump' + (n == 1 ? '' : 's') + '</b>'; };
            Object.values(Game.ObjectsById).forEach(function(M) {
                if (!l('productLevel' + M.id)) return;
                M.sellTooltip = function() { return '<div style="width:200px;padding:8px;text-align:center;">Sell a level of <b>' + M.dname + '</b> for ' + lumps(Math.floor(M.level / 2)) + '.</div>'; };
                l('productLevel' + M.id).insertAdjacentHTML('afterend', '<div id="productSell' + M.id + '" class="productButton productLevel productSell lumpsOnly" ' + Game.getDynamicTooltip('Game.ObjectsById[' + M.id + '].sellTooltip', 'this') + '></div>');
                AddEvent(l('productSell' + M.id), 'click', function() {
                    if (!Game.Has('Sweet refunds') || M.level <= 1) return;
                    var n = Math.floor(M.level / 2);
                    Game.promptConfirmFunc = function() {
                        M.level--;
                        Game.lumps += n;
                        if (M.minigame && M.minigame.onLevel) M.minigame.onLevel(M.level);
                        Game.recalculateGains = 1;
                        M.refresh();
                    };
                    Game.Prompt('<id SellLevel><div class="icon" style="background:url(' + Game.resPath + 'img/icons.png?v=' + Game.version + ');margin:0px auto;display:block;background-position:' + (-29 * 48) + 'px ' + (-14 * 48) + 'px;"></div><div class="block">Do you want to level down your ' + M.plural + ' for a refund of ' + lumps(n) + '?</div>', [['Yes', 'Game.promptConfirmFunc();Game.promptConfirmFunc=0;Game.ClosePrompt();'], 'No']);
                });
                hookOnce(M, 'rebuild', '_jneSweetRefunds', function(orig) { return function() {
                    var r = orig.apply(this, arguments);
                    l('productSell' + M.id).style.display = Game.Has('Sweet refunds') && M.level > 1 ? '' : 'none';
                    return r;
                }; });
                M.rebuild();
            });
            // a loaded save without the upgrade hides the buttons without waiting for a rebuild
            Game.registerHook('check', function() {
                var has = Game.Has('Sweet refunds');
                Object.values(Game.ObjectsById).forEach(function(M) {
                    var el = l('productSell' + M.id), want = has && M.level > 1 ? '' : 'none';
                    if (el && el.style.display !== want) el.style.display = want;
                });
            }, 'JNE sweet refunds visibility');
        }

        function dragonSlot3() { return Game.JNE.dragonSlot3 || (Game.JNE.dragonSlot3 = { unlocked: 0, aura: 0 }); }
        function krumblorActive() { return !!(dragonSlot3().unlocked && Game.dragonLevel >= 27 && Game.Has('The legend of Krumblor')); }

        // The legend of Krumblor: a third dragon aura slot, kept in mod state. Vanilla effects read auras through hasAura/auraMult, so wrapping those covers them.
        function setupKrumblorSlot() {
            if (Game._jneKrumblorHooked) return;
            Game._jneKrumblorHooked = true;
            var slotAura = function() { return krumblorActive() ? dragonSlot3().aura : 0; };
            var haveEach = function(n) { return Object.values(Game.Objects).every(function(b) { return b.amount >= n; }); };
            Game.registerHook('reset', function() { Object.assign(dragonSlot3(), { unlocked: 0, aura: 0 }); }, 'Krumblor slot');

            hookOnce(Game, 'hasAura', '_jneKrumblor', function(orig) { return function(what) {
                return orig.call(this, what) || (slotAura() > 0 && Game.dragonAuras[slotAura()].name === what);
            }; });
            hookOnce(Game, 'auraMult', '_jneKrumblor', function(orig) { return function(what) {
                var n = orig.call(this, what), name = slotAura() && Game.dragonAuras[slotAura()].name;
                if (name === what) n += 1;
                if (name === 'Reality Bending' && Game.dragonLevel >= Game.dragonAurasBN[what].id + 4) n += 0.1;
                return n;
            }; });

            hookOnce(Game, 'ToggleSpecialMenu', '_jneKrumblor', function(orig) { return function(on) {
                orig.apply(this, arguments);
                if (!on || Game.specialTab !== 'dragon' || Game.dragonLevel < 27 || !Game.Has('The legend of Krumblor')) return;
                var aura = Game.dragonAuras[dragonSlot3().aura];
                if (!dragonSlot3().unlocked) Array.prototype.forEach.call(l('specialPopup').querySelectorAll('div'), function(d) { if (!d.children.length && /fully trained/.test(d.textContent)) d.remove(); });
                l('specialPopup').insertAdjacentHTML('beforeend', dragonSlot3().unlocked ?
                    '<div class="crate enabled" style="opacity:1;position:absolute;right:142px;top:-58px;' + writeIcon(aura.pic) + '" ' + Game.clickStr + '="PlaySound(\'snd/tick.mp3\');Game.SelectDragonAura(2);" ' + Game.getTooltip(
                        '<div style="margin:8px;min-width:300px;text-align:center;"><h4>' + aura.dname + '</h4><div class="line"></div>' + aura.desc + '</div>', 'top') + '></div>' :
                    '<div class="line"></div><div class="optionBox" style="margin-bottom:0px;"><a style="line-height:80%;" class="option framed large title" ' + Game.clickStr + '="Game.JNE.unlockDragonSlot3();">' +
                        '<div style="display:table-cell;vertical-align:middle;">Train tertiary aura<br><small>Lets you use three dragon auras simultaneously</small></div>' +
                        '<div style="display:table-cell;vertical-align:middle;padding:4px 12px;">|</div>' +
                        '<div style="display:table-cell;vertical-align:middle;font-size:65%;">sacrifice <div' + (haveEach(1000) ? '' : ' style="color:#777;"') + '>1000 of every building</div></div></a></div>');
            }; });

            Game.JNE.unlockDragonSlot3 = function() {
                if (!haveEach(1000)) return;
                Game.promptConfirmFunc = function() {
                    PlaySound('snd/shimmerClick.mp3');
                    Object.values(Game.Objects).forEach(function(b) { b.sacrifice(1000); });
                    dragonSlot3().unlocked = 1;
                    Game.recalculateGains = 1;
                    Game.ToggleSpecialMenu(1);
                };
                Game.Prompt('<id TrainTertiaryAura><div class="block">Do you want to sacrifice <b>1000 of every building</b> to unlock a third dragon aura slot?</div>', [['Yes', 'Game.promptConfirmFunc();Game.promptConfirmFunc=0;Game.ClosePrompt();'], 'No']);
            };

            hookOnce(Game, 'SelectDragonAura', '_jneKrumblor', function(orig) { return function(slot, update) {
                var i, str = '', highestBuilding = 0;
                if (slot !== 2) {
                    orig.apply(this, arguments);
                    var taken = slotAura();
                    if (taken) Game.promptL.querySelectorAll('.crate').forEach(function(c) {
                        if (c.getAttribute(Game.clickStr).indexOf('SetDragonAura(' + taken + ',') !== -1) c.remove();
                    });
                    return;
                }
                if (!update) Game.SelectingDragonAura = dragonSlot3().aura;
                for (i in Game.dragonAuras) {
                    if (Game.dragonLevel >= parseInt(i) + 4 && (i == 0 || (i != Game.dragonAura && i != Game.dragonAura2))) {
                        str += '<div class="crate enabled' + (i == Game.SelectingDragonAura ? ' highlighted' : '') + '" style="opacity:1;float:none;display:inline-block;' + writeIcon(Game.dragonAuras[i].pic) + '" ' + Game.clickStr + '="PlaySound(\'snd/tick.mp3\');Game.SetDragonAura(' + i + ',2);" onMouseOut="Game.DescribeDragonAura(' + Game.SelectingDragonAura + ');" onMouseOver="Game.DescribeDragonAura(' + i + ');"></div>';
                    }
                }
                for (i in Game.Objects) if (Game.Objects[i].amount > 0) highestBuilding = Game.Objects[i];
                Game.Prompt('<id PickDragonAura><h3>Set your dragon\'s tertiary aura</h3><div class="line"></div><div id="dragonAuraInfo" style="min-height:80px;"></div><div style="text-align:center;">' + str + '</div><div class="line"></div>' +
                    '<div style="text-align:center;margin-bottom:8px;">' + (highestBuilding == 0 ? loc("Switching your aura is <b>free</b> because you own no buildings.") : loc("The cost of switching your aura is <b>%1</b>.<br>This will affect your CpS!", loc("%1 " + highestBuilding.bsingle, LBeautify(1)))) + '</div>',
                    [[loc("Confirm"), 'Game.JNE.dragonSlot3.aura=Game.SelectingDragonAura;' + (highestBuilding == 0 || dragonSlot3().aura == Game.SelectingDragonAura ? '' : 'Game.ObjectsById[' + highestBuilding.id + '].sacrifice(1);') + 'Game.recalculateGains=1;Game.ToggleSpecialMenu(1);Game.ClosePrompt();'], loc("Cancel")], 0, 'widePrompt');
                Game.DescribeDragonAura(Game.SelectingDragonAura);
            }; });
        }

        // Magical hourglass: magic meter tooltip shows time to full (snapshot on hover)
        function setupMagicalHourglass() {
            var M = minigameOf('Wizard tower');
            if (!M || !M.init) return;
            var attach = function() {
                var bar = l('grimoireBar'), over = bar && bar.lastChild;
                if (!over || over._jneHourglass) return;
                var prev = over.onmouseover;
                over._jneHourglass = true;
                over.onmouseover = function() {
                    if (prev) prev.call(this);
                    if (!Game.Has('Magical hourglass')) return;
                    if (M.magic >= M.magicM) return; // full: vanilla tooltip stays untouched
                    // JNE's regen hook owns the real rate (buffs, Unlimited free refills, Wizardly accomplishments)
                    var secs = Game.JNE && Game.JNE.grimoireRefillSeconds && Game.JNE.grimoireRefillSeconds();
                    if (!secs) return;
                    var text = 'Magic full in ' + Game.sayTime(secs * Game.fps, -1);
                    Game.tooltip.dynamic = 0;
                    Game.tooltip.draw(this, escape(unescape(Game.tooltip.text).replace(/<\/div>$/, '<div class="line"></div>' + text + '</div>')), Game.tooltip.origin);
                };
            };
            hookOnce(M, 'init', '_jneHourglass', function(orig) { return function() {
                var r = orig.apply(this, arguments);
                attach();
                return r;
            }; });
            attach();
        }

        function setupBuffModifiers() {
            if (!Game.gainBuff || Game._jneBuffModifiersHooked) return;

            hookOnce(Game, 'gainBuff', '_jneBuffMods', function(orig) { return function(type, time, arg1, arg2, arg3) {
                var alreadyApplying = !!Game._jneApplyingBuffModifiers;
                if (!alreadyApplying) Game._jneApplyingBuffModifiers = true;
                try {
                    var isLoanInterest = (type === 'loan 1 interest' || type === 'loan 2 interest' || type === 'loan 3 interest');
                    // only on freshly created buffs, not during save load or when onDie recreates an existing buff
                    var buffExists = Game.buffs && Game.buffs[type];
                    if (!alreadyApplying && !Game.JNE._isRestoringData && !buffExists) {
                        // Frenziered elders - elder frenzy (blood frenzy) buffs last 25% longer
                        if (type === 'blood frenzy' && Game.Has && Game.Has('Frenziered elders')) {
                            time = Math.ceil(time * 1.25);
                        }
                        // Godzamok's Headstart - devastation buffs last 10% longer
                        if (type === 'devastation' && Game.Has && Game.Has("Godzamok's Headstart")) {
                            time = Math.ceil(time * 1.1);
                        }

                        if (type === 'click frenzy' && Game.Has && Game.Has('Runaway clickers')) {
                            time = time * 1.1;
                        }
                        if (type === 'building buff' && Game.Has && Game.Has('We can build up')) {
                            time = time * 1.1;
                        }
                        // Creative tax evasion - loan interest buffs last 10% less long
                        if (isLoanInterest && Game.Has && Game.Has('Creative tax evasion')) {
                            time = time * 0.9;
                        }
                    }
                    return orig.call(this, type, time, arg1, arg2, arg3);
                } finally {
                    if (!alreadyApplying) Game._jneApplyingBuffModifiers = false;
                }
            }; });
            Game._jneBuffModifiersHooked = true;
        }

        function setupMegaClicks() {
            if (Game.registerHook && !Game._megaClicksHookRegistered) {
                // Cooldown time in ms, configurable via console: Game.JNE.megaClickCooldown = 250;
                if (!Game.JNE) Game.JNE = {};
                Game.JNE.megaClickCooldown = Game.JNE.megaClickCooldown || 250;
                Game.JNE._megaClickLastPopup = 0;

                Game.registerHook('click', function() {
                    // Skip effect in Born Again mode
                    if (Game.ascensionMode == 1) return;
                    if (Game.Has && Game.Has('Mega clicks')) {
                        var megaClickChance = Game.Has('Lucky mega clicks') ? 0.015 : 0.01;
                        var isMegaClick = jneIndependentRandom() < megaClickChance;
                        if (isMegaClick) {
                            var now = Date.now();
                            if (now - Game.JNE._megaClickLastPopup < Game.JNE.megaClickCooldown) return;
                            Game.JNE._megaClickLastPopup = now;

                            var clickAmount = Game.computedMouseCps || 0;
                            var multiplier = Game.Has('Extreme mega clicks') ? 14 : 9;
                            var isEpic = Game.Has('Epic clicks') && jneIndependentRandom() < 0.01;
                            if (isEpic) multiplier *= 100;
                            var bonusAmount = clickAmount * multiplier;
                            var totalAmount = clickAmount * (multiplier + 1);
                            Game.Earn(bonusAmount);
                            if (!(window.modSettings && window.modSettings.megaClickPopups === false)) {
                                var rainbow = ['#ff5c5c', '#ffb347', '#ffe066', '#7cfc00', '#4fc3f7', '#b388ff'];
                                var epicLine = 'Epic Click Bonus!'.split('').map(function(ch, i) {
                                    return '<span style="color:' + rainbow[i % rainbow.length] + '">' + ch + '</span>';
                                }).join('');
                                Game.Popup('<span style="font-size:80%">' + (isEpic ? epicLine : 'Mega Click Bonus!') + '<br>+' + Beautify(totalAmount, 1) + '</span>', Game.mouseX, Game.mouseY);
                            }
                        }
                    }
                });
                Game._megaClicksHookRegistered = true;
            }
        }

        function setupShinyWrinklers() {
            if (!Game.SpawnWrinkler) return;
            if (Game.SpawnWrinkler._jneShinyHooked) return;
            if (!Game._jneOriginalSpawnWrinkler) Game._jneOriginalSpawnWrinkler = Game.SpawnWrinkler;
            Game.SpawnWrinkler = function() {
                var me = Game._jneOriginalSpawnWrinkler.apply(this, arguments);
                if (!me) return me;
                if (me.type === 0) {
                    var base = 0.0001;
                    var mult = 1;
                    if (Game.Has('Species bounceback')) mult *= 2.0;
                    else if (Game.Has('Indigenous tracker')) mult *= 1.5;
                    else if (Game.Has('Rare game hunter')) mult *= 1.25;
                    if (Game.Has('Slimy pheromones')) {
                        var hasShiny = false;
                        if (Game.wrinklers) {
                            for (var i = 0; i < Game.wrinklers.length; i++) {
                                if (Game.wrinklers[i] && Game.wrinklers[i].type == 1 && Game.wrinklers[i].phase > 0) {
                                    hasShiny = true;
                                    break;
                                }
                            }
                        }
                        if (hasShiny) mult *= 3.0;
                    }
                    var p = base * mult;
                    if (Math.random() < p) me.type = 1;
                }
                if (me.type === 0 && Game.Has('Clicklers') && Math.random() < (Game.Has('An interesting species') ? 0.2 : 0.1)) me.type = 2;
                return me;
            };
            Game.SpawnWrinkler._jneShinyHooked = true;
        }

        function setupWrinklerPopSpawn() {
            if (Game._wrinklerPopSpawnHooked || !Game.UpdateGrandmapocalypse) return;
            Game._wrinklerPopSpawnHooked = true;
            Game._jneJamFillingHandled = true;
            hookOnce(Game, 'UpdateGrandmapocalypse', '_jneGrandmaUpdate', function(orig) { return function() {
                var oldCount = Game.wrinklersPopped || 0;
                var alive = (Game.wrinklers || []).filter(function(w) { return w && w.phase > 0; });
                var result = orig.apply(this, arguments);
                var newCount = Game.wrinklersPopped || 0;
                if (newCount > oldCount) {
                    var popped = newCount - oldCount;
                    if ((Game.Has('Cockroaches') || Game.Has('Infestation')) && Game.SpawnWrinkler) {
                        var chance = Game.Has('Infestation') ? 0.02 : Game.Has('Cockroaches') ? 0.01 : 0;
                        for (var k = 0; k < popped; k++) {
                            if (chance > 0 && Math.random() < chance) {
                                Game.SpawnWrinkler();
                            }
                        }
                    }

                    if ((Game.Has('The prize at the bottom of the box') || Game.Has('Double box prize') || Game.Has('Mail in sweepstake winner')) && Game.gainBuff) {
                        var jamChance = Game.Has('Mail in sweepstake winner') ? 0.03 : Game.Has('Double box prize') ? 0.02 : Game.Has('The prize at the bottom of the box') ? 0.01 : 0;
                        if (jamChance > 0 && !Game._jneCustomBuffTypesCreated) setupCustomBuffTypes();
                        if (jamChance > 0 && Game.buffTypesByName && Game.buffTypesByName['jam filling']) {
                            var pops = alive.filter(function(w) { return w.phase === 0; });
                            for (var j = 0; j < pops.length; j++) {
                                var chance = Math.min(1, jamChance * (pops[j].type == 1 && Game.Has('Glittery jam') ? 6.66 : pops[j].type === 2 ? 2 : 1));
                                if (Math.random() < chance) {
                                    var buff = Game.buffs && Game.buffs['Jam filling'];
                                    if (buff) {
                                        var currentTime = buff.time / Game.fps;
                                        Game.gainBuff('jam filling', currentTime + 6, 66);
                                    } else {
                                        Game.gainBuff('jam filling', 6, 66);
                                    }
                                    if (Game.Notify) Game.Notify('Jam filling!', 'Cookie production x66 for 6 seconds!', JNE.icon(17, 18, 'custom'));
                                    break;
                                }
                            }
                        }
                    }
                }
                return result;
            }; });
        }

        // heralds + 10 points, capped at 100 (vanilla applies 1 + 0.01 * heralds)
        function selfPromoterActive() {
            return Game.ascensionMode != 1 && !!Game.Has('Self promoter') && !!Game.Has('Heralds');
        }
        function selfPromoterHeralds() { return Math.round(Math.min(100, Game.heralds + 10) * 100) / 100; }
        function selfPromoterBoost() {
            return (1 + 0.01 * selfPromoterHeralds()) / (1 + 0.01 * Game.heralds);
        }
        function setupSelfPromoter() {
            if (!Game.registerHook || !Game.tooltip || Game._jneSelfPromoter || !Game.Has('Self promoter')) return;
            Game._jneSelfPromoter = true;
            Game.registerHook('cps', function(cps) {
                return selfPromoterActive() ? cps * selfPromoterBoost() : cps;
            });
            // the banner number; skipped while vanilla shows '?' before the first fetch
            Game.registerHook('logic', function() {
                var el = l('heraldsAmount');
                if (!el || !selfPromoterActive() || !/^[\d.]+$/.test(el.textContent)) return;
                var want = String(Math.floor(selfPromoterHeralds()));
                if (el.textContent !== want) el.textContent = want;
            });
            // base count, then the Self promoter share; the percentage is the boosted total
            hookOnce(Game.tooltip, 'draw', '_jneSelfPromoterTip', function(orig) { return function(from, text, origin) {
                if (from === l('heralds') && selfPromoterActive()) {
                    var base = text;
                    text = function() {
                        var str = String(typeof base === 'function' ? base() : base);
                        return str
                            .replace(/([\d.]+ heralds?<\/b>)/, '$1 (+10 Self promoter)')
                            .replace(/\+[\d.]+% cookies per second/, '+' + selfPromoterHeralds() + '% cookies per second');
                    };
                }
                return orig.call(this, from, text, origin);
            }; });
        }

        function setupTriple7s() {
            ['Lucky digit', 'Lucky number', 'Lucky payout'].forEach(function(name) {
                var up = Game.Upgrades[name];
                if (up) hookOnce(up, 'showIf', '_jneTriple7s', function(orig) { return function() {
                    return !!Game.Has('Triple 7s') || orig.call(this);
                }; });
            });
        }

        function setupCycliusSwatch() {
            if (!Game.registerHook || Game._cycliusSwatchHooked) return;
            if (!Game.Has('Cyclius swatch')) return;
            var M = loadedMinigame('Temple');
            if (!M) return;
            if (!M || !M.gods || !M.gods['ages']) return;
            var cyclius = M.gods['ages'];
            if (!cyclius._originalDescs) {
                cyclius._originalDescs = {
                    desc1: cyclius.desc1,
                    desc2: cyclius.desc2,
                    desc3: cyclius.desc3
                };
            }
            var update = function() {
                if (!Game.Has('Cyclius swatch')) return;
                var M = minigameOf('Temple');
                if (!M || !M.gods || !M.gods['ages']) return;
                var cyclius = M.gods['ages'];
                if (!cyclius._originalDescs) return;
                function getBuffInfo(period) {
                    var t = Date.now() / 1000;
                    var a = (t / period) * Math.PI * 2;
                    var v = 0.15 * Math.sin(a);
                    var inc = Math.cos(a) > 0;
                    var pos = v >= 0;
                    return {
                        arrowClass: inc ? 'green' : 'red',
                        arrow: inc ? '▲' : '▼',
                        textClass: pos ? 'green' : 'red',
                        text: (pos ? '+' : '-') + (Math.abs(v) * 100).toFixed(2) + '%'
                    };
                }
                var info1 = getBuffInfo(3 * 60 * 60);
                var info2 = getBuffInfo(12 * 60 * 60);
                var info3 = getBuffInfo(24 * 60 * 60);
                cyclius.desc1 = cyclius._originalDescs.desc1 +
                    ` Currently: <span class="${info1.arrowClass}">${info1.arrow}</span> <span class="${info1.textClass}">${info1.text}</span>`;
                cyclius.desc2 = cyclius._originalDescs.desc2 +
                    ` Currently: <span class="${info2.arrowClass}">${info2.arrow}</span> <span class="${info2.textClass}">${info2.text}</span>`;
                cyclius.desc3 = cyclius._originalDescs.desc3 +
                    ` Currently: <span class="${info3.arrowClass}">${info3.arrow}</span> <span class="${info3.textClass}">${info3.text}</span>`;
                if (Game.tooltip && Game.tooltip.draw && Game.tooltip.matches && Game.tooltip.matches('.framed')) {
                    Game.tooltip.draw(undefined, 'this');
                }
            };
            Game.registerHook('check', update, 'Cyclius Swatch Update');
            Game._cycliusSwatchHooked = true;
        }

        function setupPantheonSaveLoadHooks() {
            var M = loadedMinigame('Temple');
            if (!M) return;
            if (!M || !M.save || M.save._heavenlyUpgradesHooked) return;
            hookOnce(M, 'save', '_jneSaveTemple', function(orig) { return function() {
                var M = minigameOf('Temple');
                var customGodIds = [];
                if (M.gods && M.gods['procrastination'] && M.gods['procrastination'].id !== undefined) customGodIds.push(M.gods['procrastination'].id);
                if (M.gods && M.gods['selfishness'] && M.gods['selfishness'].id !== undefined) customGodIds.push(M.gods['selfishness'].id);
                var savedSlots = [];
                if (M.slot) {
                    for (var i = 0; i < M.slot.length; i++) {
                        if (customGodIds.indexOf(M.slot[i]) !== -1) {
                            savedSlots[i] = M.slot[i];
                            M.slot[i] = -1;
                        }
                    }
                }
                var result = orig.apply(this, arguments);
                for (var i = 0; i < savedSlots.length; i++) {
                    if (savedSlots[i] !== undefined) M.slot[i] = savedSlots[i];
                }
                return result;
            }; });
            M.save._heavenlyUpgradesHooked = true;
        }

        function addNewPantheonSpirits() {
            if (!Game.Objects['Temple'] || !minigameOf('Temple')) return;
            var M = minigameOf('Temple');

            if (M._pantheonSpiritsCheckInterval) {
                clearInterval(M._pantheonSpiritsCheckInterval);
                M._pantheonSpiritsCheckInterval = 0;
            }

            setupPantheonSaveLoadHooks();

            var spirits = {
                procrastination: {key: 'procrastination', name: 'Morrowen, Spirit of Procrastination', icon: JNE.icon(21, 20, 'custom'), upgrade: 'Morrowen, Spirit of Procrastination',
                    activeDescFunc: function() {
                        if (!M.gods['procrastination']) return '';
                        var lvl = Game.hasGod('procrastination'); if (!lvl) return '';
                        var hrs = (M._procrastinationSlotTime ? (Date.now() - M._procrastinationSlotTime) / 3600000 : 0), days = Math.min(Math.floor(hrs / 24), 365), base = [0, 0.03, 0.02, 0.01][lvl], boost = 0;
                        for (var d = 0; d < days; d++) boost += base * Math.pow(0.99, d);
                        if (days < 365) boost += base * Math.pow(0.99, days) * (hrs % 24) / 24;
                        return 'Current Bonus: <span class="green">+' + (boost * 100).toFixed(3) + '%</span>';
                    }, desc1: '<span class="green">CpS increases noticeably over time.</span>', desc2: '<span class="green">CpS increases moderately over time.</span>', desc3: '<span class="green">CpS increases slightly over time.</span>', descAfter: '<span class="red">Changing slots resets CpS gain.</span>', quote: 'Unable to bear the weight of its doings, this spirit split apart, reminiscing the forbidden and beautiful. In this eternal flash of inaction, its form melted and folded, as to atone as stone.'},
                selfishness: {key: 'selfishness', name: 'Solgreth, Spirit of Selfishness', icon: JNE.icon(20, 20, 'custom'), upgrade: 'Solgreth, Spirit of Selfishness',
                    activeDescFunc: function() {
                        if (!M.gods['selfishness']) return '';
                        var lvl = Game.hasGod('selfishness'); if (!lvl) return '';
                        var red = Math.min((M._selfishnessClickCount || 0) * [0, 0.03, 0.02, 0.01][lvl], 1);
                        return 'Current penalty: <span class="red">-' + (red * 100).toFixed(2) + '% CpS</span>';
                    }, desc1: '<span class="green">Golden cookies appear twice as often.</span> <span class="red">Each golden cookie clicked reduces CpS by 3% additively.</span>', desc2: '<span class="green">Golden cookies appear 50% more often.</span> <span class="red">Each golden cookie clicked reduces CpS by 2% additively.</span>', desc3: '<span class="green">Golden cookies appear 25% more often.</span> <span class="red">Each golden cookie clicked reduces CpS by 1% additively.</span>', descAfter: '<span class="red">When this spirit is unslotted, all beneficial golden cookie buffs are ended. When CpS penalty reaches -100% golden cookies will no longer spawn.</span>', quote: 'This spirit latches and leeches onto all that it can find, consuming them in paralytic obsession.'}
            };

            for (var key in spirits) {
                var spirit = spirits[key];
                var hasUpgrade = Game.Upgrades[spirit.upgrade] && Game.Upgrades[spirit.upgrade].bought;

                // Create god definition if it doesn't exist (regardless of upgrade ownership)
                if (!M.gods[key]) {
                    M.gods[key] = spirit;
                    var nextId = M.godsById.length;
                    spirit.id = nextId;
                    spirit.slot = -1;
                    M.godsById[nextId] = spirit;

                    var me = M.gods[key], icon = me.icon || [0, 0], godDiv = document.createElement('div'), parentId = M.parent.id;
                    godDiv.className = 'ready templeGod templeGod' + (me.id % 4) + ' titleFont';
                    godDiv.id = 'templeGod' + me.id;
                    godDiv.setAttribute('onmouseover', 'Game.tooltip.dynamic=1;Game.tooltip.draw(this,Game.ObjectsById[' + parentId + '].minigame.godTooltip(' + me.id + '),\'this\');');
                    godDiv.setAttribute('onmouseout', 'Game.tooltip.shouldHide=1;');
                    var iconDiv = document.createElement('div');
                    iconDiv.className = 'usesIcon shadowFilter templeIcon';
                    iconDiv.style.backgroundPosition = (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px';
                    if (icon[2]) iconDiv.style.backgroundImage = 'url(' + icon[2] + ')';
                    var dragDiv = document.createElement('div');
                    dragDiv.className = 'templeSlotDrag';

                    dragDiv.id = 'templeGodDrag' + me.id;
                    godDiv.appendChild(iconDiv);
                    godDiv.appendChild(dragDiv);
                    l('templeGods').appendChild(godDiv);
                    var placeholderDiv = document.createElement('div');
                    placeholderDiv.className = 'templeGodPlaceholder';
                    placeholderDiv.id = 'templeGodPlaceholder' + me.id;
                    placeholderDiv.style.display = 'none';
                    l('templeGods').appendChild(placeholderDiv);
                    (function(god) {
                        AddEvent(l('templeGodDrag' + god.id), 'mousedown', function(e) {if (e.button == 0) M.dragGod(god);});
                        AddEvent(l('templeGodDrag' + god.id), 'mouseup', function(e) {if (e.button == 0) M.dropGod(god);});
                    }(me));
                }

                // Show/hide god based on upgrade ownership
                if (M.gods[key]) {
                    var el = l('templeGod' + M.gods[key].id);
                    if (el) {
                        el.style.display = hasUpgrade ? '' : 'none';
                    }
                }
            }

            // Default state - load() will restore from save data
            if (!M._spiritEffectsSetup && (M.gods['procrastination'] || M.gods['selfishness'])) {setupPantheonSpiritEffects(); M._spiritEffectsSetup = true;}

            if (!M.godTooltip._hooked) {
                hookOnce(M, 'godTooltip', '_jneGodTip', function(orig) { return function(id) {
                    var M = minigameOf('Temple');
                    return function() {
                        var me = M.godsById[id];
                        if (me && me.icon && me.icon[2]) {
                            var result = orig.call(M, id)();
                            var searchStr = '<div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;background-position:' + (-me.icon[0]*48) + 'px ' + (-me.icon[1]*48) + 'px;">';
                            result = result.replace(
                                searchStr,
                                '<div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;background-position:' + (-me.icon[0]*48) + 'px ' + (-me.icon[1]*48) + 'px;background-image:url(' + me.icon[2] + ');">'
                            );
                            return result;
                        }
                        return orig.call(M, id)();
                    };
                }; });
                M.godTooltip._hooked = true;
            }

            if (!M.slotTooltip._hooked) {
                hookOnce(M, 'slotTooltip', '_jneSlotTip', function(orig) { return function(id) {
                    var M = minigameOf('Temple');
                    return function() {
                        var result = orig.call(M, id)();
                        if (M.slot[id] != -1) {
                            var me = M.godsById[M.slot[id]];
                            if (me && me.icon && me.icon[2]) {
                                result = result.replace(
                                    '<div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;background-position:' + (-me.icon[0]*48) + 'px ' + (-me.icon[1]*48) + 'px;">',
                                    '<div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;background-position:' + (-me.icon[0]*48) + 'px ' + (-me.icon[1]*48) + 'px;background-image:url(' + me.icon[2] + ');">'
                                );
                            }
                        }
                        return result;
                    };
                }; });
                M.slotTooltip._hooked = true;
            }
            // a save loaded before the temple finished loading is applied now that the gods exist
            applyPendingPantheon();
        }

        // Features that install once (UI, slots, soil) follow ownership; effects that check Game.Has() while running need nothing.
        function reconcileOwnedFeatures() {
            var T = minigameOf('Temple');
            if (T && T.gods && T.slot) {
                ['procrastination', 'selfishness'].forEach(function(k) {
                    var god = T.gods[k];
                    if (!god || god.id === undefined || !god.upgrade) return;
                    var owned = !!(Game.Upgrades[god.upgrade] && Game.Upgrades[god.upgrade].bought);
                    var el = l('templeGod' + god.id);
                    if (!owned && god.slot !== -1 && god.slot !== undefined && T.slotGod) {
                        T.slotGod(god, -1);
                        var ph = l('templeGodPlaceholder' + god.id);
                        if (el && ph && ph.parentNode && el.parentNode !== ph.parentNode) ph.parentNode.insertBefore(el, ph);
                        Game.recalculateGains = true;
                    }
                    var want = owned ? '' : 'none';
                    if (el && el.style && el.style.display !== want) el.style.display = want;
                });
            }
            var F = minigameOf('Farm');
            if (F && F.soils && F.soils.aerated) {
                var aerated = F.soils.aerated, ownedSoil = !!Game.Has('Aerated soil');
                if (aerated._jneReq === undefined) aerated._jneReq = aerated.req;
                var wantReq = ownedSoil ? aerated._jneReq : 1e308;
                if (aerated.req !== wantReq) {
                    aerated.req = wantReq;
                    if (F.buildPanel && l('gardenSoils')) F.buildPanel();
                }
                if (!ownedSoil && F.soil === aerated.id) F.soil = 0;
            }
        }

        function applySlotGodHook(M) {
            hookOnce(M, 'slotGod', '_jneSlotGodHook', function(orig) { return function(god, slot) {
                var M = minigameOf('Temple');
                if (!god) return orig.apply(this, arguments);
                var prev = god.slot;
                var result = orig.apply(this, arguments);

                var proc = M.gods['procrastination'], self = M.gods['selfishness'];

                if (slot !== prev) {
                    Game.recalculateGains = true;
                }

                if (proc && god.id === proc.id) {
                    var oldTime = M._procrastinationSlotTime;
                    var newTime = M._procrastinationSlotTime;
                    var isRestoring = Game.JNE && Game.JNE._isRestoringData;

                    // Only reset timer when moving between slots or unslotting, not during load
                    if (slot === -1) {
                        // Unslotting
                        newTime = null;
                    } else if (prev !== -1 && prev !== slot) {
                        // Moving from one slot to another
                        newTime = Date.now();
                    } else if (prev === -1 && !isRestoring) {
                        // First time being slotted (not from save load)
                        newTime = Date.now();
                    }

                    if (newTime !== oldTime) {
                        M._procrastinationSlotTime = newTime;
                        Game.recalculateGains = true;
                    }
                }
                if (self && god.id === self.id) {
                    if (slot === -1 && prev !== -1) {
                        for (var i in Game.buffs) if (Game.buffs[i] && Game.buffs[i].aura === 1) Game.buffs[i].time = 0;
                        M._selfishnessClickCount = 0;
                        Game.recalculateGains = true;
                    } else if (slot !== -1 && prev !== -1 && prev !== slot) {
                        for (var i in Game.buffs) if (Game.buffs[i] && Game.buffs[i].aura === 1) Game.buffs[i].time = 0;
                        M._selfishnessClickCount = 0;
                    } else if (slot !== -1 && prev === -1) {
                        M._selfishnessClickCount = 0;
                    }
                }
                return result;
            }; });
        }

        function hookSugarPredictorSlot(M) {
            hookOnce(M, 'slotGod', '_jneSugarPredSlot', function(orig) { return function() {
                var result = orig.apply(this, arguments);
                Game.calculateLumpPredictions();
                return result;
            }; });
        }

        function setupPantheonSpiritEffects() {
            if (!Game.Objects['Temple'] || !minigameOf('Temple')) return;
            var M = minigameOf('Temple');
            if (M._spiritEffectsSetup) return;

            M._procrastinationSlotTime = M._procrastinationSlotTime || null;
            M._selfishnessClickCount = M._selfishnessClickCount || 0;

            // Apply slotGod hook
            applySlotGodHook(M);

            // Selfishness god tracking is now handled centrally in JustNaturalExpansion.js
            // via injectGoldenPopFunc(). No direct popFunc wrapping needed here.

            var st = Game.shimmerTypes && Game.shimmerTypes.golden;
            if (st && !st._selfishnessSpawnConditionsHooked) {
                hookOnce(st, 'spawnConditions', '_jneSpawnCond', function(orig) { return function() {
                    var st = Game.shimmerTypes && Game.shimmerTypes.golden;
                    if (!orig || !orig.call(st)) return false;
                    if (M.gods && M.gods['selfishness'] && Game.hasGod('selfishness')) {
                        var godLevel = Game.hasGod('selfishness');
                        if (godLevel) {
                            var r = Math.min((M._selfishnessClickCount || 0) * [0, 0.03, 0.02, 0.01][godLevel], 1);
                            if (r >= 1) return false;
                        }
                    }
                    return true;
                }; });
                st._selfishnessSpawnConditionsHooked = true;
            }

            if (Game.registerHook && !Game._jneProcrastinationRecalcHooked) {
                Game.registerHook('check', function() {
                    var M = minigameOf('Temple');
                    if (!M || !M.gods || !M.gods['procrastination']) return;
                    if (!Game.hasGod('procrastination')) return;
                    if (!M._procrastinationSlotTime) {
                        if (Game.JNE && Game.JNE._isRestoringData) return;
                        M._procrastinationSlotTime = Date.now();
                        Game.recalculateGains = true;
                        return;
                    }
                    if (Game.T % (Game.fps * 5) === 0) Game.recalculateGains = true;
                }, 'Morrowen CpS refresh');
                Game._jneProcrastinationRecalcHooked = true;
            }

            if (hookedWith(M, 'slotGod', '_jneSlotGodHook') && st && st._hooked && st._selfishnessSpawnConditionsHooked) M._spiritEffectsSetup = true;
        }

        function setupRegifting() {
            if (!Game.registerHook || Game._regiftingHooked) return;
            Game._regiftingHooked = true;
            Game.registerHook('reset', function(hard) {
                if (!Game.Has('Regifting')) return;
                // season drops only carry over on normal ascensions
                if (Game.ascensionMode != 0) return;
                if (hard) return;

                if (!Game.seasonDrops || !Array.isArray(Game.seasonDrops)) return;

                var unlockChanged = false;
                for (var id in Game.UpgradesById) {
                    var upgrade = Game.UpgradesById[id];

                    if (upgrade &&
                        upgrade.pool !== 'prestige' &&
                        !upgrade.lasting &&
                        !upgrade.unlocked &&
                        Game.seasonDrops.indexOf(upgrade.name) !== -1) {
                        if (Math.random() < 0.125) {
                            upgrade.unlocked = 1;
                            unlockChanged = true;
                        }
                    }
                }

                if (unlockChanged) {
                    Game.storeToRefresh = 1;
                    Game.upgradesToRebuild = 1;
                }
            }, 'Regifting Seasonal Drops');
        }

        function setupCookieReduction() {
            if (typeof choose !== 'function' || choose._jneCookieReductionHooked) return;

            if (!Game._jneOriginalChoose) Game._jneOriginalChoose = choose;
                choose = function(arr) {
                    if (Array.isArray(arr)) {
                        if (arr.indexOf('multiply cookies') !== -1) {
                            var reduction = Game.Has('Even more unlucky luckier') ? 0.10 : Game.Has('Unlucky luckier') ? 0.05 : 0;

                        if (reduction > 0 && jneIndependentRandom() < reduction) {
                            arr = arr.filter(function(item) {
                                return item !== 'multiply cookies';
                            });
                            if (arr.length === 0) {
                                arr = ['frenzy']; //add something to the poolif we have nothing
                            }
                        }
                    }
                        if (arr.indexOf('ruin cookies') !== -1) {
                            var reduction = Game.Has('Flavor enhanced wrath') ? 0.10 : Game.Has('Slightly less bitter wrath') ? 0.05 : 0;

                        if (reduction > 0 && jneIndependentRandom() < reduction) {
                            arr = arr.filter(function(item) {
                                return item !== 'ruin cookies';
                            });
                            if (arr.length === 0) {
                                arr = ['clot'];
                            }
                        }
                    }
                }

                return Game._jneOriginalChoose.call(this, arr);
            };
            choose._jneCookieReductionHooked = true;
        }

        function fishClip(me, edge) {
            if (edge > 0) me.l.style.clipPath = me.direction === 1 ? 'inset(0px 0px 0px ' + edge + 'px)' : 'inset(0px ' + edge + 'px 0px 0px)';
        }
        function fishTime(seconds) {
            var t = Math.ceil(Game.fps * seconds);
            return Game.Has('Aquaculturist') ? Math.ceil(t * 0.75) : t;
        }

        function setupFishShimmers() {
            if (Game._fishShimmersSetup) return;
            Game._fishShimmersSetup = true;

            if (Game.shimmerTypes && !Game.shimmerTypes['fish']) {
                Game.shimmerTypes['fish'] = {
                    reset: function() {
                        this.n = 0;
                        this.time = 0;
                        this.spawned = 0;
                        this.minTime = this.getMinTime(this);
                        this.maxTime = this.getMaxTime(this);
                    },
                    initFunc: function(me) {
                        me.direction = Math.random() < 0.5 ? -1 : 1;
                        var milkHeight = Game.milkHd * Game.LeftBackground.canvas.height;
                        var milkTop = Game.LeftBackground.canvas.height - milkHeight;
                        me.y = Math.floor(Math.random() * (milkHeight - 100)) + milkTop + 50;

                        var leftPanelWidth = Game.LeftBackground.canvas.width;
                        me.x = me.direction === -1 ? leftPanelWidth + 48 : -48;

                        var iconChoice = Math.floor(Math.random() * 4);
                        var spriteSheetUrl, bgX, bgY;
                        if (iconChoice === 0) {
                            spriteSheetUrl = Game.resPath + 'img/icons.png';
                            bgX = -1104;
                            bgY = -1584;
                        } else {
                            spriteSheetUrl = getSpriteSheet('custom');
                            var customX = (iconChoice - 1) * 48;
                            bgX = -customX;
                            bgY = -1200;
                        }

                        me.l.style.cssText = 'width:48px;height:48px;position:absolute;display:block;opacity:1;background:url(' + spriteSheetUrl + ') ' + bgX + 'px ' + bgY + 'px/auto;pointer-events:auto;z-index:20000000000;';
                        var initialX = me.direction === -1 ? (Game.LeftBackground ? Game.LeftBackground.canvas.width : 300) + 48 : -48;
                        me.l.style.transform = 'translate(' + initialX + 'px,' + me.y + 'px) rotate(0deg) scaleX(' + (me.direction === 1 ? -1 : 1) + ')';

                        // Add click handler with capture phase to ensure fish are clickable
                        me.l.addEventListener('click', function(e) {
                            e.stopPropagation();
                            e.preventDefault();
                            if (Game.shimmerTypes && Game.shimmerTypes['fish'] && Game.shimmerTypes['fish'].popFunc) {
                                Game.shimmerTypes['fish'].popFunc(me);
                            }
                        }, true);

                        if (Game._fishClipBounds) {
                            var clipRight = Math.max(0, (initialX + 48) - Game._fishClipBounds.right);
                            fishClip(me, clipRight);
                        }

                        me.life = Game.fps * 8;
                        me.swimSpeed = Game.Has('Shiny scales') ? 150 : 125;
                        me.baseY = me.y;
                        for (var i = 1; i <= 2; i++) {
                            me['swimAmp' + i] = Math.random() * 10 + (i === 1 ? 10 : 5);
                            me['swimFreq' + i] = Math.random() * 0.04 + (i === 1 ? 0.03 : 0.08);
                            me['swimPhase' + i] = Math.random() * Math.PI * 2;
                        }
                        me.life--;
                        if (me.life <= 0) { this.missFunc(me); me.die(); }
                    },
                    updateFunc: function(me) {
                        if (me.life <= 0) return;

                        // Movement and clipping
                        var leftPanelWidth = Game.LeftBackground.canvas.width;
                        var elapsed = (Game.fps * 8 - me.life) / Game.fps;
                        var xOffset = me.direction === -1 ? leftPanelWidth + 48 - elapsed * me.swimSpeed : -48 + elapsed * me.swimSpeed;

                        // Swimming motion
                        var yOffset = 0;
                        for (var i = 1; i <= 2; i++) yOffset += Math.sin(me.life * me['swimFreq' + i] + me['swimPhase' + i]) * me['swimAmp' + i];
                        var milkTop = Game.LeftBackground.canvas.height - Game.milkHd * Game.LeftBackground.canvas.height;
                        var actualY = Math.max(milkTop + 30, Math.min(milkTop + Game.milkHd * Game.LeftBackground.canvas.height - 30, me.baseY + yOffset));

                        // Transform and clip
                        me.l.style.transform = 'translate(' + xOffset + 'px,' + actualY + 'px) rotate(' + (Math.sin(me.life * 0.1) * 5) + 'deg) scaleX(' + (me.direction === 1 ? -1 : 1) + ')';
                        if (Game._fishClipBounds) {
                            var clipRight = Math.max(0, (xOffset + 48) - Game._fishClipBounds.right);
                            fishClip(me, clipRight);
                            if ((me.direction === 1 && xOffset > Game._fishClipBounds.right + 48) || (me.direction === -1 && xOffset < Game._fishClipBounds.left - 48)) {
                                this.missFunc(me); me.die(); return;
                            }
                        }

                        me.life--;
                        if (me.life <= 0) { this.missFunc(me); me.die(); }
                    },
                    popFunc: function(me) {
                        if (!Game.Has('Sunken treasure')) {
                            return;
                        }

                        if (me.popped) {
                            return;
                        }
                        me.popped = true;
                        me.die();

                        if (!Game.JNE) Game.JNE = {};
                        Game.JNE.cookieFishCaught = (Game.JNE.cookieFishCaught || 0) + 1;

                        var now = Date.now();
                        if (!Game.JNE.fishCatchTimes) Game.JNE.fishCatchTimes = [];
                        Game.JNE.fishCatchTimes.push(now);
                        // drop old entries
                        while (Game.JNE.fishCatchTimes.length > 0 && Game.JNE.fishCatchTimes[0] < now - 3000) {
                            Game.JNE.fishCatchTimes.shift();
                        }

                        if (Game.JNE.markAchievementWon) {
                            if (Game.JNE.getLifetimeCookieFish && Game.JNE.getLifetimeCookieFish() >= 777) Game.JNE.markAchievementWon('Reel fortunate');
                            if (Game.JNE.fishCatchTimes.length >= 3) Game.JNE.markAchievementWon('Fast and the flounderous');
                        }

                        var val = Game.cookiesPs * 60;
                        var moni = Math.max(25, val) * (Game.Has('Shiny scales') ? 1.3 : 1);
                        Game.Earn(moni);
                        Game.Popup('<div style="font-size:80%;">' + Beautify(moni) + '</div>', Game.mouseX, Game.mouseY);

                        if (typeof PlaySound === 'function') {
                            PlaySound('snd/pop' + Math.floor(Math.random() * 3 + 1) + '.mp3');
                        }
                    },
                    missFunc: function(me) {
                    },
                    spawnConditions: function() {
                        return Game.Has('Fish tank') && Game.prefs.milk != 0;
                    },
                    spawnsOnTimer: true,
                    getMinTime: function(me) { return fishTime(180); },
                    getMaxTime: function(me) { return fishTime(600); },
                    n: 0,
                    time: 0,
                    spawned: 0
                };

                Game.shimmerTypes['fish'].reset();
            } else {
                if (Game.shimmerTypes && !Game.shimmerTypes['fish'].initialized) {
                    Game.shimmerTypes['fish'].reset();
                    Game.shimmerTypes['fish'].initialized = true;
                }
            }

            if (Game.registerHook && !Game._milkDebugBoxHooked) {
                Game._milkDebugBoxHooked = true;
                Game.registerHook('draw', function() {
                    if (Game.prefs.milk == 0) return;
                    if (Game.Has('Fish tank') && Game.LeftBackground) {
                        var milkHeight = Game.milkHd * Game.LeftBackground.canvas.height;
                        var milkTop = Game.LeftBackground.canvas.height - milkHeight;
                        var leftPanelWidth = Game.LeftBackground.canvas.width;

                        Game._fishClipBounds = {
                            top: milkTop,
                            bottom: milkTop + milkHeight,
                            left: 0,
                            right: leftPanelWidth
                        };
                    }
                });
            }

            if (Game.registerHook && !Game._hatcheryEffectHooked && Game.shimmerTypes && Game.shimmerTypes['fish']) {
                Game._hatcheryEffectHooked = true;
                if (!Game.shimmerTypes['fish']._jneOriginalInitFunc) Game.shimmerTypes['fish']._jneOriginalInitFunc = Game.shimmerTypes['fish'].initFunc;
                Game.shimmerTypes['fish'].initFunc = function(me) {
                    Game.shimmerTypes['fish']._jneOriginalInitFunc.call(this, me);
                    if (Game.Has('Hatchery effect') && Math.random() < 0.1 && !me._hatcheryPair) {
                        me._hatcheryPair = true;
                        if (Game.shimmer && Game.shimmerTypes && Game.shimmerTypes['fish'] && Game.shimmerTypes['fish'].spawnConditions()) {
                            new Game.shimmer('fish');
                        }
                    }
                };
            }
        }

        function setupWallstreetBets() {
            var M = loadedMinigame('Bank');
            if (!M) return;
            if (!M.getGoodMaxStock || M.getGoodMaxStock._wallstreetBetsHooked) return;

            hookOnce(M, 'getGoodMaxStock', '_jneGoodMax', function(orig) { return function(id) {
                var M = minigameOf('Bank');
                var max = orig.call(this, id);
                if (Game.Has('Wallstreet bets')) max *= 1.25;
                return max;
            }; });
            M.getGoodMaxStock._wallstreetBetsHooked = true;
        }

        function setupFadingPayout() {
            if (Game._jneFadingPayoutHooked) return;
            Game._jneFadingPayoutHooked = true;
            if (Game.registerHook) {
                var scheduledTimers = {};
                var fadeThreshold = Game.fps * 1.0; //tried to line up the fade but fps varies so shrug
                Game.registerHook('check', function() {
                    if (Game.shimmers && (Game.Has('Fading payout') || Game.Has('Lucky fading payout'))) {
                        for (var i in Game.shimmers) {
                            var me = Game.shimmers[i];
                            if (me && me.type === 'golden' && !scheduledTimers[me.id]) {
                                var shimmerId = me.id;
                                var framesUntilFading = me.life - fadeThreshold;
                                var fadeTime = Math.max(0, ((framesUntilFading + 2) / Game.fps) * 1000);
                                scheduledTimers[shimmerId] = setTimeout(function(id) {
                                    if (!scheduledTimers[id]) return;
                                    scheduledTimers[id] = null;
                                    if (Game.shimmers) {
                                        for (var j in Game.shimmers) {
                                            var shimmer = Game.shimmers[j];
                                            if (shimmer && shimmer.id === id && shimmer.type === 'golden' && shimmer.life > 0) {
                                                if (shimmer.force === 'cookie storm drop' || (shimmer.forceObj && shimmer.forceObj.type === 'cookie storm drop')) {
                                                    break;
                                                }
                                                var chance = Game.Has('Lucky fading payout') ? 0.02 : 0.01;
                                                if (Math.random() < chance) {
                                                    var popupText = 'Fading payout';
                                                    var x = shimmer.x+45;
                                                    var y = shimmer.y-50;
                                                    Game.Popup('<div style="font-size:80%;">' + popupText + '</div>', x, y);
                                                    Game.shimmerTypes['golden'].popFunc(shimmer);
                                                }
                                                break;
                                            }
                                        }
                                    }
                                    delete scheduledTimers[id];
                                }, fadeTime, shimmerId);
                            }
                        }
                    }
                }, 'Fading payout auto-click');
            }
        }

        function setupTimedGoldenCookies() {
            if (Game._jneTimedGoldenCookiesHooked) return;
            Game._jneTimedGoldenCookiesHooked = true;
            if (Game._jneTimedGoldenCookiesTimeoutId) {
                clearTimeout(Game._jneTimedGoldenCookiesTimeoutId);
                Game._jneTimedGoldenCookiesTimeoutId = 0;
            }
            if (Game._jneTimedGoldenCookiesLastMinuteStamp === undefined) {
                Game._jneTimedGoldenCookiesLastMinuteStamp = { top: -1, bottom: -1 };
            }

            function scheduleHalfHour(fn) {
                var now = new Date();
                var next = new Date(now);
                next.setSeconds(0, 0);
                if (now.getMinutes() < 30) {
                    next.setMinutes(30);
                } else {
                    next.setHours(next.getHours() + 1);
                    next.setMinutes(0);
                }
                var target = next.getTime();
                Game._jneTimedGoldenCookiesTimeoutId = setTimeout(function() {
                    fn(target);
                    scheduleHalfHour(fn);
                }, next - now);
            }

            // background tabs throttle timers: only spawn if the timer fires within a minute of its scheduled time
            function checkAndSpawn(target) {
                if (Date.now() - target > 60000) return;
                var now = new Date();
                var minutes = now.getMinutes();
                var minuteStamp = Math.floor(now.getTime() / 60000);
                var onAscendScreen = Game.OnAscend || Game.AscendTimer > 0;
                if (minutes === 0 && Game.Has('All is well')) {
                    if (Game._jneTimedGoldenCookiesLastMinuteStamp.top !== minuteStamp) {
                        Game._jneTimedGoldenCookiesLastMinuteStamp.top = minuteStamp;
                        if (!onAscendScreen) new Game.shimmer('golden', {noWrath: true});
                    }
                }
                if (minutes === 30 && Game.Has('Six bells')) {
                    if (Game._jneTimedGoldenCookiesLastMinuteStamp.bottom !== minuteStamp) {
                        Game._jneTimedGoldenCookiesLastMinuteStamp.bottom = minuteStamp;
                        if (!onAscendScreen) new Game.shimmer('golden', {noWrath: true});
                    }
                }
            }

            scheduleHalfHour(checkAndSpawn);
        }

        // Inputs that change lump ripening: grandmas, Rigidel, dragon auras
        function lumpAuraState() {
            var g = Game.Objects['Grandma'];
            return {
                grandmas: g ? g.amount : 0,
                rigidel: Game.jneDetectRigidelSlot(),
                rigidelActive: Game.jneDetectRigidelActive(),
                dragonsCurve: Game.hasAura('Dragon\'s Curve') ? 1 : 0,
                realityBending: Game.hasAura('Reality Bending') ? 1 : 0,
                supremeIntellect: Game.hasAura('Supreme Intellect') ? 1 : 0
            };
        }

        function rankedBuildings(cache, upgrades, ownedOnly, mushroomMult) {
            var assigns = cache.assignments || {};
            var list = [];
            for (var i = 0; i < Game.ObjectsById.length; i++) {
                var b = Game.ObjectsById[i];
                if (!(b && b.amount > 0)) continue;
                var cps = (b.storedTotalCps || 0) * (Game.globalCpsMult || 1);
                for (var k in assigns) {
                    if (assigns[k].buildingName !== b.name) continue;
                    for (var u = 0; u < upgrades.length; u++) {
                        if (upgrades[u].name === k && (!ownedOnly || Game.Has(k))) {
                            cps /= upgrades[u].mult;
                            break;
                        }
                    }
                    break;
                }
                if (mushroomMult && cache.magicMushroomAssignment === b.name) cps /= (1 + mushroomMult);
                list.push({ name: b.name, cps: cps });
            }
            return list.sort(function(a, b) { return a.cps - b.cps; });
        }

        function setupWeakestLink() {
            if (Game._jneWeakestLinkHooked) return;

            if (!Game._weakestLinkCache) Game._weakestLinkCache = { assignments: {}, lastRecalc: 0 };

            if (!Game.JNE || !Game.JNE.addMagicCpSModifier) return;
            Game.JNE.addMagicCpSModifier(function(what, mult) {
                var upgrades = Game._jneWeakestLinkUpgrades;

                // Weakest Link logic
                var owned = upgrades.filter(function(u) { return Game.Has(u.name); });
                if (owned.length > 0) {
                    var cache = Game._weakestLinkCache;
                    if (!cache.assignments['Weakest link'] || (Date.now() - cache.lastRecalc) > 1000) {
                        var buildings = rankedBuildings(cache, upgrades, false);
                        cache.assignments = {};
                        var used = [];
                        owned.sort(function(a, b) { return a.rank - b.rank; });

                        for (var i = 0; i < owned.length && i < buildings.length; i++) {
                            var idx = owned[i].rank - 1;
                            var found = null;
                            if (idx < buildings.length && used.indexOf(buildings[idx].name) === -1) {
                                found = buildings[idx];
                            } else {
                                for (var j = idx + 1; j < buildings.length; j++) {
                                    if (used.indexOf(buildings[j].name) === -1) {
                                        found = buildings[j];
                                        break;
                                    }
                                }
                            }
                            if (found) {
                                cache.assignments[owned[i].name] = { buildingName: found.name };
                                used.push(found.name);
                            }
                        }
                        cache.lastRecalc = Date.now();
                    }

                    for (var i = 0; i < owned.length; i++) {
                        var a = cache.assignments[owned[i].name];
                        if (a && a.buildingName === what) {
                            mult *= owned[i].mult;
                            break;
                        }
                    }
                }

                // Magic Mushroom logic
                var M = minigameOf('Farm');
                if (M && M.effs && M.effs.magicMushroomMult > 0 && M.freeze === 0) {
                    var cache = Game._weakestLinkCache;

                    if (!cache.magicMushroomAssignment || (Date.now() - cache.lastRecalc) > 1000) {
                        var buildings = rankedBuildings(cache, Game._jneWeakestLinkUpgrades, true, M.effs.magicMushroomMult);

                        if (buildings.length > 0) {
                            cache.magicMushroomAssignment = buildings[0].name;
                        }
                    }

                    if (cache.magicMushroomAssignment === what) {
                        mult *= 1 + M.effs.magicMushroomMult;
                    }
                }

                return mult;
            });
            Game._jneWeakestLinkHooked = true;
        }

        function setupPlantAll() {
            var farm = Game.Objects['Farm'];
            if (!farm || !farm.minigameLoaded) return;
            var M = farm.minigame;
            if (!M || !M.clickTile || !M.useTool) return;
            if (M.clickTile._jnePlantAllHooked) return; // Already hooked (check actual function, not flag)
            M._plantAllHooked = true;
            hookOnce(M, 'clickTile', '_jneClickTile', function(orig) { return function(x, y) {
                var M = minigameOf('Farm');
                if (Game.Has('Plant all') && Game.keys[16] && Game.keys[17] && M.seedSelected >= 0) {
                    var seedId = M.seedSelected;
                    var seed = M.plantsById[seedId];
                    if (!seed || !M.canPlant(seed)) return orig.call(M, x, y);
                    var planted = M.useTool(seedId, x, y);
                    M.toCompute = true;
                    // Side by Side: a click in column 0 plants only the clicked row
                    var rowOnly = Game.Has('Side by side') && x === 0;
                    if (planted) {
                        for (var yy = 0; yy < 6; yy++) {
                            if (rowOnly && yy !== y) continue;
                            for (var xx = 0; xx < 6; xx++) {
                                if ((xx === x && yy === y) || !M.isTileUnlocked(xx, yy)) continue;
                                var tile = M.getTile(xx, yy);
                                if (tile && tile[0] === 0 && M.canPlant(seed)) {
                                    M.useTool(seedId, xx, yy);
                                }
                            }
                        }
                    }
                    return;
                }
                return orig.call(M, x, y);
            }; });
            M.clickTile._jnePlantAllHooked = true;
        }

        function setupSoilInspector() {
            if (!Game.Objects['Farm'] || !Game.Objects['Farm'].minigameLoaded) return;
            var M = minigameOf('Farm');
            if (!M || M._soilInspectorHooked) return;
            M._soilInspectorHooked = true;

            if (!M.originalTileTooltip) {
                M.originalTileTooltip = M.tileTooltip;
            }

            M._jneGetPlantGrowthChances = function getPlantGrowthChances(x, y) {
                var M = minigameOf('Farm');
                if (!M || !M.getMuts || !M.getTile || !M.plants || !M.plantsById || !M.soilsById || !M.plotBoost) return null;
                var n = {}, nm = {}, k, t, p, r = [], probs = {}, dirs = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
                for (k in M.plants) { n[k] = 0; nm[k] = 0; }
                for (var i = 0; i < dirs.length; i++) {
                    t = M.getTile(x + dirs[i][0], y + dirs[i][1]);
                    if (t && t[0] > 0) { var pl = M.plantsById[t[0]-1]; if (pl && pl.key) { n[pl.key]++; if (t[1] >= pl.mature) nm[pl.key]++; } }
                }
                var muts = M.getMuts(n, nm) || [], weedMult = (M.soilsById[M.soil] && M.soilsById[M.soil].weedMult) || 1, repel = (M.plotBoost[y] && M.plotBoost[y][x] ? M.plotBoost[y][x][2] : 1), any = false;
                for (k in n) if (n[k] > 0) { any = true; break; }
                for (i = 0; i < muts.length; i++) {
                    var key = muts[i][0], base = muts[i][1], def = M.plants[key];
                    if (!def) continue; p = base; if (def.weed) p *= weedMult; if (def.weed || def.fungus) p *= repel; if (p > 0) probs[key] = (probs[key] || 0) + p;
                }
                if (!any) { p = 0.002 * weedMult * repel; if (p > 0) probs.meddleweed = (probs.meddleweed || 0) + p; }
                var total = 0; for (k in probs) total += probs[k]; if (total > 1) { var s = 1 / total; for (k in probs) probs[k] *= s; total = 1; }
                // soils like wood chips reroll mutations several times per tick; last success wins
                if (any && total > 0) {
                    var loops = (M.soilsById[M.soil].key == 'woodchips' ? 3 : 1) * (M.loopsMult || 1) * (1 + 0.05 * Game.auraMult('Supreme Intellect'));
                    if (loops != 1) {
                        var sc = (1 - Math.pow(1 - total, loops)) / total;
                        for (k in probs) probs[k] *= sc;
                        total *= sc;
                    }
                }
                var pNothing = 1 - total; if (pNothing > 0.0001) r.push({ id: '__nothing__', name: 'Nothing', chance: pNothing * 100 });
                for (k in probs) { var def2 = M.plants[k]; if (!def2) continue; p = probs[k] * 100; if (p > 0.01) r.push({ id: k, name: def2.name, chance: p }); }
                r.sort(function(a, b) { return b.chance - a.chance; });
                return r;
            }

            M.tileTooltip = function(x, y) {
                var M = minigameOf('Farm');
                var originalTooltip = M.originalTileTooltip(x, y);

                if (Game.Has('Soil inspector') &&
                    typeof originalTooltip === 'function') {

                    return function() {
                        var originalHtml = originalTooltip();
                        if (originalHtml && originalHtml.includes('Empty tile')) {
                            var chances = M._jneGetPlantGrowthChances(x, y);
                            if (chances && chances.length > 0) {
                                var dp = Game.Has('Improved soil inspector') ? 3 : 1;
                                var body = chances.map(function(p){return '<div>'+p.name+': <b>'+p.chance.toFixed(dp)+'%</b></div>';}).join('');
                                var block = '<div class="line"></div><div style="margin-top: 8px; font-size: 11px;"><div style="margin-bottom: 4px; font-weight: bold;">Natural growth chances (per tick)</div>'+body+'</div>';
                                originalHtml = originalHtml.replace('</div>', block + '</div>');
                            }
                        }
                        return originalHtml;
                    };
                }

                return originalTooltip;
            };
        }

        function setupGardenSaveHookImmediate() {
            var M = loadedMinigame('Farm');
            if (!M) return;
            if (!M || !M.save || M.save._heavenlyUpgradesHooked) return;

            // Default state - load() will restore from save data
            hookOnce(M, 'save', '_jneSaveFarm', function(orig) { return function() {
                var M = minigameOf('Farm');
                var savedPlants = [], savedSoil = M.soil, isAerated = M.soils && M.soils.aerated && M.soil === M.soils.aerated.id;
                if (M.plot) {
                    var plotH = M.h || M.plot.length, plotW = M.w || (M.plot[0] && M.plot[0].length || 0);
                    for (var y = 0; y < plotH; y++) {
                        if (!M.plot[y]) continue;
                        for (var x = 0; x < plotW; x++) {
                            var tile = M.plot[y][x];
                            if (tile && tile[0] > 0) {
                                var plant = M.plantsById[tile[0] - 1];
                                if (plant && plant.key && isModPlant(plant.key)) {
                                    savedPlants.push({x: x, y: y, tile: [tile[0], tile[1]]});
                                    tile[0] = 0;
                                }
                            }
                        }
                    }
                }
                if (isAerated) M.soil = 0;
                var result = orig.apply(this, arguments);
                savedPlants.forEach(function(p) { if (M.plot[p.y] && M.plot[p.y][p.x]) M.plot[p.y][p.x] = p.tile; });
                if (isAerated) M.soil = savedSoil;
                return result;
            }; });
            M.save._heavenlyUpgradesHooked = true;
        }

        function setupAeratedSoil() {
            var M = loadedMinigame('Farm');
            if (!M) return;

            M._isAeratedSelected = function() {
                var m = minigameOf('Farm');
                return !!(m && m.soilsById && m.soilsById[m.soil] && m.soilsById[m.soil].key === 'aerated');
            };
            hookOnce(M, 'load', '_jneAeratedLoad', function(orig) { return function(str) {
                var M = minigameOf('Farm');
                orig.call(this, str);
                var savedData = Game.JNE && Game.JNE.heavenlyUpgradesSavedData;
                var savedSoil = savedData && savedData.garden && savedData.garden.soil;
                if (savedSoil !== undefined && Game.Has('Aerated soil') && M.soils.aerated && M.soilsById[savedSoil]) {
                    M.soil = savedSoil;
                    if (M.buildPanel && l('gardenSoils')) M.buildPanel();
                }
            }; });
            if (Game.Has('Aerated soil')) {
                // Create soil object - garden does not need to be open for this
                if (!M.soils.aerated) {
                    M.soils.aerated = {
                        name: 'Aerated soil',
                        key: 'aerated',
                        icon: 5,
                        customIcon: [15, 24],
                        customIconSheet: window.getSpriteSheet('custom'),
                        tick: 10,
                        effMult: 1,
                        weedMult: 1.25,
                        req: 500,
                        effsStr: '<div class="gray">&bull; tick every <b>'+Game.sayTime(10*60*Game.fps)+'</b></div><div class="green">&bull; plant aging variance reduced</div><div class="red">&bull; weed growth <b>+25%</b></div>',
                        q: 'Soil enriched with tiny air pockets that help regulate plant growth patterns. Plants grow more predictably while maintaining steady development.'
                    };
                }

                // Rebuild soilsById array to assign correct IDs
                M.soilsById = [];
                var n = 0;
                for (var i in M.soils) {
                    M.soils[i].id = n;
                    M.soils[i].key = i;
                    M.soilsById[n] = M.soils[i];
                    n++;
                }

                // Restore deferred garden soil if it exists
                if (Game.JNE && Game.JNE._deferredGardenSoil !== undefined) {
                    var deferredSoil = Game.JNE._deferredGardenSoil;
                    if (M.soilsById && M.soilsById[deferredSoil]) {
                        M.soil = deferredSoil;
                        delete Game.JNE._deferredGardenSoil;
                    }
                }
            }

            if (Game.Has('Aerated soil')) {
                if (M.soils.aerated && !document.getElementById('aeratedSoilCSS')) {
                    var aeratedStyle = document.createElement('style');
                    aeratedStyle.id = 'aeratedSoilCSS';
                    var aeratedId = M.soils.aerated.id;
                    var customSheet = getSpriteSheet('custom');
                    var bgPos = (-M.soils.aerated.customIcon[0] * 48) + 'px ' + (-M.soils.aerated.customIcon[1] * 48) + 'px';
                    aeratedStyle.textContent = '#gardenSoilIcon-' + aeratedId + ' { background-image: url(\'' + customSheet + '\') !important; background-position: ' + bgPos + ' !important; }';
                    document.head.appendChild(aeratedStyle);
                }
            }
            if (Game.Has('Aerated soil') && l('gardenSoils')) {
                if (M.soilTooltip && !M._aeratedSoilTooltipHooked) {
                    M._aeratedSoilTooltipHooked = true;
                    hookOnce(M, 'soilTooltip', '_jneSoilTip', function(orig) { return function(id) {
                        var M = minigameOf('Farm');
                        var tooltipFunc = orig.call(this, id);
                        var me = M.soilsById[id];

                        if (me && me.key === 'aerated' && me.customIcon && me.customIconSheet) {
                            return function() {
                                var str = '<div style="padding:8px 4px;min-width:350px;" id="tooltipGardenSoil">' +
                                    (M.parent.amount < me.req ? (
                                        '<div style="text-align:center;">' + (typeof loc === 'function' ? loc("Soil unlocked at %1 farms.", me.req) : ("Soil unlocked at " + me.req + " farms.")) + '</div>'
                                    ) : ('<div class="icon" style="background:url(\'' + me.customIconSheet + '\');float:left;margin-left:-8px;margin-top:-8px;background-position:' + (-me.customIcon[0] * 48) + 'px ' + (-me.customIcon[1] * 48) + 'px;"></div>' +
                                    '<div><div class="name">' + me.name + '</div><div><small>' + ((M.soil == me.id) ? (typeof loc === 'function' ? loc("Your field is currently using this soil.") : "Your field is currently using this soil.") : (M.nextSoil > Date.now()) ? (typeof loc === 'function' ? loc("You will be able to change your soil again in %1.", Game.sayTime((M.nextSoil - Date.now()) / 1000 * 30 + 30, -1)) : ("You will be able to change your soil again in " + Game.sayTime((M.nextSoil - Date.now()) / 1000 * 30 + 30, -1) + ".")) : (typeof loc === 'function' ? loc("Click to use this type of soil for your whole field.") : "Click to use this type of soil for your whole field.")) + '</small></div></div>' +
                                    '<div class="line"></div>' +
                                    '<div class="description">' +
                                        '<div style="margin:6px 0px;"><b>' + (typeof loc === 'function' ? loc("Effects:") : "Effects:") + '</b></div>' +
                                        '<div style="font-size:11px;font-weight:bold;">' + me.effsStr + '</div>' +
                                        (me.q ? ('<q>' + me.q + '</q>') : '') +
                                    '</div>')) +
                                '</div>';
                                return str;
                            };
                        }
                        return tooltipFunc;
                    }; });
                }

                if (M.buildPanel) M.buildPanel();
            }
            if (Game.Has('Aerated soil') && !M._aeratedSoilHooked) {
                M._aeratedSoilHooked = true;
                hookOnce(M, 'logic', '_jneAeratedLogic', function(orig) { return function() {
                    var M = minigameOf('Farm');
                    var isAerated = M._isAeratedSelected() && !M.freeze && Date.now() >= M.nextStep;
                    if (isAerated) {
                        if (!M._fracAge) M._fracAge = {};
                        M.computeBoostPlot();
                        var dragonBoost = 1 + 0.05 * Game.auraMult('Supreme Intellect');
                        for (var y = 0; y < 6; y++) for (var x = 0; x < 6; x++) {
                            var tile = M.plot[y][x], k = y + '_' + x;
                            if (!tile || tile[0] <= 0) { M._fracAge[k] = 0; continue; }
                            var me = M.plantsById[tile[0] - 1];
                            M._fracAge[k] = (M._fracAge[k] || 0) + (me.ageTick + me.ageTickR * Math.random()) * M.plotBoost[y][x][0] * dragonBoost;
                            tile[1] += Math.floor(M._fracAge[k]);
                            M._fracAge[k] %= 1;
                        }
                        for (var i in M.plants) { M.plants[i]._at = M.plants[i].ageTick; M.plants[i]._atr = M.plants[i].ageTickR; M.plants[i].ageTick = 0; M.plants[i].ageTickR = 0; }
                        try { orig.call(this); }
                        finally { for (var i in M.plants) { M.plants[i].ageTick = M.plants[i]._at; M.plants[i].ageTickR = M.plants[i]._atr; } }
                    } else {
                        orig.call(this);
                    }
                }; });

                // Hook draw to fix dying transparency
                hookOnce(M, 'draw', '_jneAeratedDraw', function(orig) { return function() {
                    var M = minigameOf('Farm');
                    orig.call(this);
                    if (M._isAeratedSelected() && M._fracAge) {
                        for (var y = 0; y < 6; y++) for (var x = 0; x < 6; x++) {
                            var tile = M.plot[y][x];
                            if (!tile || tile[0] <= 0) continue;
                            var me = M.plantsById[tile[0] - 1];
                            var iconL = l('gardenTileIcon-' + x + '-' + y);
                            if (iconL) {
                                // Use saved _at/_atr values since ageTick/ageTickR are zeroed during logic
                                var at = me._at !== undefined ? me._at : me.ageTick;
                                var atr = me._atr !== undefined ? me._atr : me.ageTickR;
                                var dying = ((tile[1] + Math.ceil(at + atr)) >= 100 ? 1 : 0);
                                iconL.style.opacity = (dying ? 0.5 : 1);
                            }
                        }
                    }
                }; });
            }
        }

        // Appends "(+x/y)" to the vanilla "Seeds (a/b)" label
        var SEEDS_LABEL_MARK = '<small class="jneBonusSeeds" style="color:#70a;">';
        var SEED_UPGRADES = { sparklingSugarCane: 'Sparkling sugar cane', krazyKudzu: 'Krazy kudzu', magicMushroom: 'Magic mushroom' };
        function updateSeedsLabel() {
            var farm = Game.Objects && Game.Objects['Farm'];
            var M = farm && farm.onMinigame && farm.minigameLoaded && farm.minigame;
            var el = M && M.plants && l('gardenSeedsUnlocked');
            if (!el) return;
            var total = 0, got = 0;
            for (var key in SEED_UPGRADES) {
                var p = M.plants[key];
                if (!p || !Game.Has(SEED_UPGRADES[key])) continue;
                total++;
                if (p.unlocked) got++;
            }
            var html = el.innerHTML, at = html.indexOf(SEEDS_LABEL_MARK);
            var base = at >= 0 ? html.slice(0, at) : html;
            var want = total ? base + SEEDS_LABEL_MARK + ' (+' + got + '/' + total + ')</small>' : base;
            if (html !== want) el.innerHTML = want;
        }

        function setupHeavenlyPlantUnlocks() {
            var M = minigameOf('Farm');
            if (!M || !M.getUnlockedN || M._heavenlyPlantUnlocksHooked) return;
            M._heavenlyPlantUnlocksHooked = true;
            M.getUnlockedN = function() {
                var unlockedN = 0;
                var plantsN = 0;
                for (var i in M.plants) {
                    if (MOD_PLANT_KEYS.indexOf(i) === -1) {
                        plantsN++;
                        if (M.plants[i].unlocked) unlockedN++;
                    }
                }
                M.plantsN = plantsN;
                M.plantsUnlockedN = unlockedN;

                var tool = l('gardenTool-3');
                if (unlockedN >= plantsN) {
                    Game.Win('Keeper of the conservatory');
                    if (tool) tool.classList.remove('locked');
                } else {
                    if (tool) tool.classList.add('locked');
                }
                return unlockedN;
            };
            M.getUnlockedN();
        }

        function setupNewPlants() {
            var farm = Game.Objects['Farm'];
            if (!farm || !farm.minigameLoaded || !farm.minigame) {
                return;
            }

            var M = farm.minigame;
            if (!M || !M.plants || !M.plantsById) {
                return;
            }



            if (M._gardenPlantsInjected) {
                setupPlantHooks(M);
                applyPendingGarden();
                return;
            }

            //something went wrong bail
            if (!M.plants['bakerWheat']) {
                return;
            }


            M._gardenPlantsInjected = true;

            function kudzuOnDie(x, y) {
                if (Math.random() < 0.10) new Game.shimmer('golden');
            }
            function mushroomOnHarvest(x, y, age) {
                if (age >= this.mature) {
                    //going back and forth on 1% and 1.5% but with drop multiplers 1% feels better
                    var rate = 0.010 * Game.dropRateMult() * (Game.HasAchiev('Seedless to nay') ? 1.05 : 1);

                    if (Math.random() < rate) {
                        var upgrades = [];
                        var cookieStates = {
                            'Hearty farm biscuit': Game.Upgrades['Hearty farm biscuit'] ? Game.Upgrades['Hearty farm biscuit'].unlocked : false,
                            'Astronaut cookie': Game.Upgrades['Astronaut cookie'] ? Game.Upgrades['Astronaut cookie'].unlocked : false,
                            'The chemist cookie': Game.Upgrades['The chemist cookie'] ? Game.Upgrades['The chemist cookie'].unlocked : false
                        };

                        if (!cookieStates['Hearty farm biscuit']) {
                            upgrades.push('Hearty farm biscuit');
                        }
                        if (!cookieStates['Astronaut cookie']) {
                            upgrades.push('Astronaut cookie');
                        }
                        if (!cookieStates['The chemist cookie']) {
                            upgrades.push('The chemist cookie');
                        }

                        if (upgrades.length > 0) {
                            var chosen = upgrades[Math.floor(Math.random() * upgrades.length)];

                            var wasLocked = !cookieStates[chosen];

                            if (wasLocked && Game.Upgrades[chosen]) {
                                Game.Upgrades[chosen].unlocked = 1;

                                Game.storeToRefresh = 1;
                                Game.upgradesToRebuild = 1;

                                if (Game && Game.UpdateMenu) {
                                    try { Game.UpdateMenu(); } catch (e) { console.error('[Heavenly Upgrades] Menu refresh skipped:', e && e.message); }
                                }

                                var cookieIcons = {
                                    'Hearty farm biscuit': [10, 18],
                                    'Astronaut cookie': [21, 16],
                                    'The chemist cookie': [24, 17]
                                };

                                Game.Notify('New Cookie Found!', chosen, cookieIcons[chosen]);
                            }
                        }
                    }
                }
            }

            if (!M.plants['sparklingSugarCane']) {
                M.plants['sparklingSugarCane'] = {
                    name: 'Sparkling sugar cane',
                    icon: 34,
                    cost: 8 * 60,
                    costM: 5000000000000,
                    ageTick: 0.75,
                    ageTickR: 0.5,
                    mature: 80,
                    unlocked: 0,
                    children: [],
                    effsStr: '<div class="green">&bull; sugar lumps have 1% chance to double when they are <b>harvested</b></div><div class="red">&bull; CpS -2%</div><div class="red">&bull; cannot handle cold climates; 95% chance to die when frozen</div>',
                    q: 'A tropical variant of sugar cane that produces exceptionally sweet crystals. Its delicate nature makes it vulnerable to cold, but the sugary bounty is worth the risk.'
                };
            }

            if (!M.plants['krazyKudzu']) {
                M.plants['krazyKudzu'] = {
                    name: 'Krazy kudzu',
                    icon: 35,
                    cost: 5 * 60,
                    costM: 1000000000000,
                    ageTick: 0.1,
                    ageTickR: 2.0,
                    mature: 8,
                    unlocked: 0,
                    children: [],
                    effsStr: '<div class="green">&bull; has 10% chance to spawn a golden cookie on decay</div><div class="red">&bull; golden cookie frequency -1%</div><div class="red">&bull; may overtake nearby plants</div>',
                    q: 'An invasive vine that grows with reckless abandon. Though it chokes out other plants, its flowers attract rare butterflies that some say bring good fortune.',
                    weed: true,
                    contam: 0.50,
                    detailsStr: 'Spreads aggressively and grows extraordinarily unpredictably.',
                    onDie: kudzuOnDie
                };
            }

            if (!M.plants['magicMushroom']) {
                M.plants['magicMushroom'] = {
                    name: 'Magic mushroom',
                    icon: 36,
                    cost: 10,
                    costM: 100000000,
                    ageTick: 2,
                    ageTickR: 0.2,
                    mature: 30,
                    unlocked: 0,
                    children: [],
                    effsStr: '<div class="green">&bull; your least productive building is 100% more effective</div><div class="red">&bull; golden cookie frequency -1%</div>',
                    q: 'A psychotropic fungus known for its peculiar effect on perception.',
                    fungus: true,
                    onHarvest: mushroomOnHarvest
                };
            }

            var nextId = M.plantsById.length;

            for (var key in M.plants) {
                var it = M.plants[key];
                if (isModPlant(key)) {
                    if (!it.id) {
                        it.id = nextId;
                        it.key = key;
                        if (!it.matureBase) it.matureBase = it.mature;
                        M.plantsById[nextId] = it;
                        if (typeof it.plantable === 'undefined') it.plantable = true;
                        nextId++;
                    }
                    // Don't set unlock state based on heavenly upgrade ownership
                    // Heavenly upgrades give ACCESS to seeds, but unlock state is managed
                    // by vanilla garden mechanics (mutation unlocks, sacrifice locks)
                    // We'll hook M.lockSeed to prevent custom seeds from being locked on sacrifice
                    if (typeof it.q === 'string') {
                        it.q = loc(FindLocStringByPart(it.name + ' quote')) || it.q;
                    }
                    if (typeof it.name === 'string') {
                        it.name = loc(it.name);
                    }
                }
            }
            M._realPlantsN = M.plantsById.length;

            for (var i in M.plants) {
                if (M.plants[i].contam && !M.plantContam[M.plants[i].key]) {
                    M.plantContam[M.plants[i].key] = M.plants[i].contam;
                }
            }

            if (M.computeMatures) M.computeMatures();

            setupPlantHooks(M);

            var gardenSeedsEl = l('gardenSeeds');
            if (gardenSeedsEl) {
                for (var key in M.plants) {
                    var me = M.plants[key];
                    if (isModPlant(key) && me.id !== undefined) {
                        var existingEl = l('gardenSeed-' + me.id);
                        if (!existingEl) {
                            var bgPosX = -(me.icon - 34) * 240;
                            var bgPosY = -1152;

                            var str = '<div id="gardenSeed-' + me.id + '" class="gardenSeed' + (M.seedSelected == me.id ? ' on' : '') + (me.unlocked ? '' : ' locked') + '" ' + Game.getDynamicTooltip('Game.ObjectsById[' + M.parent.id + '].minigame.seedTooltip(' + me.id + ')', 'this') + '>';
                            str += '<div id="gardenSeedIcon-' + me.id + '" class="gardenSeedIcon shadowFilter" data-custom-plant="true" style="background-position:' + bgPosX + 'px ' + bgPosY + 'px;"></div>';
                            str += '</div>';
                            var tempDiv = document.createElement('div');
                            tempDiv.innerHTML = str;
                            var seedDiv = tempDiv.firstChild;
                            gardenSeedsEl.appendChild(seedDiv);
                            me.l = l('gardenSeed-' + me.id);
                            AddEvent(me.l, 'click', function(me) {
                                return function() {
                                    if (/* !M.freeze && */Game.keys[16] && Game.keys[17]) { // shift & ctrl
                                        // harvest all mature of type
                                        M.harvestAll(me, 1);
                                        return false;
                                    }
                                    if (!me.plantable && !Game.sesame) return false;
                                    if (M.seedSelected == me.id) {
                                        M.seedSelected = -1;
                                        M.cursor = -1;
                                    } else {
                                        M.seedSelected = me.id;
                                        M.cursor = me.id;
                                        PlaySound('snd/toneTick.mp3');
                                    }
                                    for (var i in M.plants) {
                                        var it = M.plants[i];
                                        if (it.l) {
                                            if (it.id == M.seedSelected) {
                                                it.l.classList.add('on');
                                            } else {
                                                it.l.classList.remove('on');
                                            }
                                        }
                                    }
                                };
                            }(me));

                            AddEvent(me.l, 'mouseover', M.hideCursor);
                            AddEvent(me.l, 'mouseout', M.showCursor);

                            if (me.unlocked) me.l.classList.remove('locked');
                        } else {
                            // Element already exists, update its locked class based on current unlock state
                            me.l = existingEl;
                            if (me.unlocked) {
                                existingEl.classList.remove('locked');
                            } else {
                                existingEl.classList.add('locked');
                            }
                        }
                    }
                }
            }

            if (M.reset && !M._resetHooked) {
                M._resetHooked = true;
                hookOnce(M, 'reset', '_jneGardenReset', function(orig) { return function(hard) {
                    var M = minigameOf('Farm');
                    if (hard && Game.JNE) Game.JNE._pendingGarden = null;
                    // Clear the flag so custom plants get re-injected after reset
                    M._gardenPlantsInjected = false;
                    orig.call(this, hard);
                    // Re-inject plants immediately after reset
                    if (M.plants && M.plantsById && !M.plants['sparklingSugarCane']) {
                        setupNewPlants();
                    }
                    // Re-apply Plant all hook after reset (vanilla reset replaces clickTile)
                    M._plantAllHooked = false;
                    setupPlantAll();
                }; });
            }

            hookOnce(M, 'load', '_jneGardenLoad', function(orig) { return function(str) {
                var M = minigameOf('Farm');
                // plants must exist before decoding saved garden data
                if (!M.plants || !M.plantsById || !M.plants['sparklingSugarCane']) {
                    M._gardenPlantsInjected = false;
                    setupNewPlants();
                }

                orig.call(this, str);

                // Restore custom seed unlock states from save data
                var _huSave = Game.JNE && Game.JNE.heavenlyUpgradesSavedData;
                var _seeds = (Game.JNE && Game.JNE._pendingGarden && Game.JNE._pendingGarden.modSeedsUnlocked) || (_huSave && _huSave.garden && _huSave.garden.modSeedsUnlocked);
                if (_seeds) {
                    for (var _k in _seeds) {
                        if (M.plants && M.plants[_k]) {
                            M.plants[_k].unlocked = _seeds[_k];
                        }
                    }
                }

                // Load may replace minigame methods/state; force hook rebind pass.
                M._iconFixSetup = false;
                setupPlantHooks(M);

                // Re-apply Plant all hook after load (vanilla load replaces clickTile)
                M._plantAllHooked = false;
                setupPlantAll();

                // apply effects right after loading a save
                if (M.computeEffs) M.computeEffs();
                if (M.buildPlot) M.buildPlot();
                if (M.buildPanel) M.buildPanel();
            }; });
            if (M.init && !M._initSwapped) {
                M._initSwapped = true;
                hookOnce(M, 'init', '_jneGardenInit', function(orig) { return function(div) {
                    var M = minigameOf('Farm');
                    orig.call(this, div);
                    if (M.plants && M.plantsById && !M.plants['sparklingSugarCane']) {
                        // DO NOT set _gardenPlantsInjected = false - it destroys our plants during save load
                        setupNewPlants();
                        M._gardenPlantsInjected = true;
                    } else {
                        // Init can rebuild tooltip methods; ensure wrappers stay attached.
                        M._iconFixSetup = false;
                        setupPlantHooks(M);
                    }
                }; });
            }
            // a save loaded before the farm finished loading is applied now that the plants exist
            applyPendingGarden();
        }

        function setupPlantHooks(M) {
            if (!M) {
                return;
            }


            if (!M._iconFixSetup) {
                M._iconFixSetup = true;
                var customSheet = getSpriteSheet('custom');
                var vanillaSheet = Game.resPath + 'img/gardenPlants.png?v=' + Game.version;
                var iconMap = {
                    34: { baseX: 0, baseY: -1152 },
                    35: { baseX: -240, baseY: -1152 },
                    36: { baseX: -480, baseY: -1152 }
                };

                if (!document.getElementById('customGardenPlantsCSS')) {
                    var style = document.createElement('style');
                    style.id = 'customGardenPlantsCSS';
                    var css = plantBaseCSS(customSheet, vanillaSheet);

                    style.textContent = css;
                    document.head.appendChild(style);
                }

                function addCustomPlantCSSRules() {
                    var style = document.getElementById('customGardenPlantsCSS');
                    if (!style) return;
                    var customSheet = getSpriteSheet('custom');
                    var vanillaSheet = (Game.resPath || 'https://orteil.dashnet.org/cookieclicker/') + 'img/gardenPlants.png?v=' + (Game.version || '1');
                    var css = plantBaseCSS(customSheet, vanillaSheet);
                    for (var key in M.plants) {
                        var me = M.plants[key];
                        if (me && isModPlant(key) && me.id !== undefined) {
                            css += '.gardenSeedIcon#gardenSeedIcon-' + me.id + ' { background-image: url(\'' + customSheet + '\') !important; }\n';
                        }
                    }
                    style.textContent = css;
                }

                function markVanillaSeeds() {
                    for (var i = 0; i < 34; i++) {
                        var el = l('gardenSeedIcon-' + i);
                        if (el) {
                            el.setAttribute('data-vanilla-plant', 'true');
                            el.removeAttribute('data-custom-plant');
                        }
                    }
                }

                function markCustomSeeds() {
                    for (var key in M.plants) {
                        var me = M.plants[key];
                        if (me && isModPlant(key)) {
                            if (me.id !== undefined) {
                                var el = l('gardenSeedIcon-' + me.id);
                                if (el) {
                                    el.setAttribute('data-custom-plant', 'true');
                                    el.removeAttribute('data-vanilla-plant');
                                }
                            }
                        }
                    }
                }

                function fixPlantIcon(el, plantIcon, stage, plantKey) {
                    if (!el || !el.style || !plantKey) return;
                    if (!isModPlant(plantKey)) return;
                    if (!M.plants || !M.plants[plantKey]) return;
                    if (plantIcon !== 34 && plantIcon !== 35 && plantIcon !== 36) return;
                    if (!iconMap[plantIcon]) return;
                    el.setAttribute('data-custom-plant', 'true');
                    el.removeAttribute('data-vanilla-plant');
                    var map = iconMap[plantIcon];
                    var bgPosX = map.baseX - stage * 48;
                    var bgPosY = map.baseY;
                    var customSheet = getSpriteSheet('custom');
                    var bgValue = 'url(' + customSheet + ') ' + bgPosX + 'px ' + bgPosY + 'px';
                    el.style.background = bgValue;
                    if (el.style.display === 'none') el.style.display = 'block';
                }

                M._addCustomPlantCSSRules = addCustomPlantCSSRules;
                M._markVanillaSeeds = markVanillaSeeds;
                M._markCustomSeeds = markCustomSeeds;
                M._fixPlantIcon = fixPlantIcon;
                M._jneGetPlantStage = plantStage;
                M._jneIconMap = iconMap;
                M._jneCustomSheet = customSheet;

                hookOnce(M, 'draw', '_jneIconDraw', function(orig) { return function() {
                    var M = minigameOf('Farm');
                    orig.call(this);
                    var cur = M.cursorL || l('gardenCursor');
                    if (!cur || cur.id !== 'gardenCursor') return;
                    var customKeys = { sparklingSugarCane: 1, krazyKudzu: 1, magicMushroom: 1 };
                    if (!M.cursor || M.seedSelected < 0) {
                        cur.removeAttribute('data-custom-plant');
                        cur.setAttribute('data-vanilla-plant', 'true');
                        cur.style.removeProperty('background');
                        return;
                    }
                    var seed = M.plantsById[M.seedSelected];
                    var isCustomSeed = !!(seed && seed.key && customKeys[seed.key] && seed.icon >= 34 && seed.icon <= 36);
                    if (isCustomSeed) {
                        M._fixPlantIcon(cur, seed.icon, 0, seed.key);
                    } else {
                        cur.removeAttribute('data-custom-plant');
                        cur.setAttribute('data-vanilla-plant', 'true');
                        cur.style.removeProperty('background');
                        var icon = [0, seed.icon];
                        cur.style.backgroundPosition = (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px';
                    }
                }; });

                hookOnce(M, 'buildPanel', '_jnePlantPanel', function(orig) { return function() {
                    var M = minigameOf('Farm');
                    orig.call(this);
                    M._addCustomPlantCSSRules();
                    M._markVanillaSeeds();
                    M._markCustomSeeds();

                    for (var i in M.plants) {
                        var me = M.plants[i];
                        if (me && isModPlant(me.key)) {
                            if (me.icon >= 34 && me.icon <= 36) {
                                var el = l('gardenSeedIcon-' + me.id);
                                if (el) {
                                    M._fixPlantIcon(el, me.icon, 0, me.key);
                                }
                            }
                        }
                    }
                }; });

                hookOnce(M, 'buildPlot', '_jnePlantPlot', function(orig) { return function() {
                    var M = minigameOf('Farm');
                    orig.call(this);
                    for (var y = 0; y < 6; y++) {
                        for (var x = 0; x < 6; x++) {
                            var tile = M.plot[y][x];
                            var el = l('gardenTileIcon-' + x + '-' + y);
                            if (el && tile && tile[0] > 0) {
                                var me = M.plantsById[tile[0] - 1];
                                if (me && isModPlant(me.key)) {
                                    el.setAttribute('data-custom-plant', 'true');
                                    el.removeAttribute('data-vanilla-plant');
                                    M._fixPlantIcon(el, me.icon, M._jneGetPlantStage(tile[1], me.mature), me.key);
                                } else {
                                    el.setAttribute('data-vanilla-plant', 'true');
                                    el.removeAttribute('data-custom-plant');
                                }
                            }
                        }
                    }
                }; });
                hookOnce(M, 'seedTooltip', '_jnePlantSeedTip', function(orig) { return function(id) {
                    var M = minigameOf('Farm');
                    var iconMap = M._jneIconMap, customSheet = M._jneCustomSheet;
                    var func = orig.call(this, id);
                    if (typeof func === 'function') {
                        return function() {
                            var result = func();
                            return swapCustomPlantIcon(result, M.plantsById[id], iconMap, customSheet);
                        };
                    }
                    return func;
                }; });

                hookOnce(M, 'tileTooltip', '_jnePlantTileTip', function(orig) { return function(x, y) {
                    var M = minigameOf('Farm');
                    var iconMap = M._jneIconMap, customSheet = M._jneCustomSheet;
                    var func = orig.call(this, x, y);
                    if (typeof func === 'function') {
                        return function() {
                            var result = func();
                            var tile = M.plot[y][x];
                            return swapCustomPlantIcon(result, tile && tile[0] > 0 && M.plantsById[tile[0] - 1], iconMap, customSheet);
                        };
                    }
                    return func;
                }; });

                hookOnce(M, 'toolTooltip', '_jnePlantToolTip', function(orig) { return function(id) {
                    var M = minigameOf('Farm');
                    var func = orig.call(this, id);
                    if (typeof func === 'function') {
                        return function() {
                            var result = func();

                            var tool = M.toolsById && M.toolsById[id];
                            var hasGardenInfoAnchor = !!(result && result.indexOf('Combined effects of all your plants:') !== -1);
                            var isGardenInfoTool = !!(tool && tool.name && tool.name.indexOf('Garden information') !== -1);
                            if (result && (isGardenInfoTool || hasGardenInfoAnchor)) {
                                var customInfo = '';

                                if (M.effs && M.effs.magicMushroomMult > 0 && M.freeze === 0) {
                                    var mult = M.effs.magicMushroomMult;

                                    if (!Game._weakestLinkCache) Game._weakestLinkCache = { assignments: {}, lastRecalc: 0 };
                                    var cache = Game._weakestLinkCache;

                                    var buildings = rankedBuildings(cache, Game._jneWeakestLinkUpgrades, true, M.effs.magicMushroomMult);

                                    var boostedBuilding = buildings.length > 0 ? buildings[0].name : null;
                                    var multPercent = Math.round(mult * 100);

                                    if (boostedBuilding && Game.Objects[boostedBuilding]) {
                                        customInfo += '<div style="font-size:10px;margin-left:64px;"><b>&bull; ' + Game.Objects[boostedBuilding].single + ' CpS </b><span class="green">+' + multPercent + '%</span></div>';
                                    }
                                }

                                var totalMult = sugarCaneTotalMult(M);

                                if (totalMult > 0) {
                                    var actualChance = totalMult * 0.01;
                                    var chancePercent = (actualChance * 100).toFixed(2);
                                    customInfo += '<div style="font-size:10px;margin-left:64px;"><b>&bull; sugar lump doubling</b><span class="green"> +' + chancePercent + '%</span></div>';
                                }

                                if (customInfo) {
                                    // Keep this insertion idempotent across repeated wrappers/redraws.
                                    result = result.replace(/<!-- JNE_GARDEN_INFO_START -->[\s\S]*?<!-- JNE_GARDEN_INFO_END -->/g, '');
                                    customInfo = '<!-- JNE_GARDEN_INFO_START -->' + customInfo + '<!-- JNE_GARDEN_INFO_END -->';
                                    result = result.replace(
                                        /(<div>Combined effects of all your plants:<\/div>)/,
                                        '$1' + customInfo
                                    );
                                }
                            }

                            return result;
                        };
                    }
                    return func;
                }; });
            }

            hookOnce(M, 'getMuts', '_jneNewPlantMuts', function(orig) { return function(neighs, neighsM) {
                var M = minigameOf('Farm');
                var muts = orig.call(this, neighs, neighsM);

                if (Game.Has('Sparkling sugar cane')) {
                    if (neighsM['bakeberry'] >= 1 && neighsM['thumbcorn'] >= 1) muts.push(['sparklingSugarCane', 0.01]);
                }

                if (Game.Has('Krazy kudzu')) {
                    if (neighsM['meddleweed'] >= 1 && neighsM['greenRot'] >= 1) muts.push(['krazyKudzu', 0.02]);
                    if (neighsM['meddleweed'] >= 1 && neighsM['clover'] >= 1) muts.push(['krazyKudzu', 0.005]);
                    if (neighsM['krazyKudzu'] >= 1 && neighs['krazyKudzu'] < 2) muts.push(['krazyKudzu', 0.25]);
                    else if (neighsM['krazyKudzu'] >= 2 && neighs['krazyKudzu'] < 4) muts.push(['krazyKudzu', 0.30]);
                    else if (neighsM['krazyKudzu'] >= 4) muts.push(['krazyKudzu', 0.30]);
                }

                if (Game.Has('Magic mushroom')) {
                    if (neighsM['ichorpuff'] >= 1 && neighsM['doughshroom'] >= 1) muts.push(['magicMushroom', 0.003]);
                }

                if (gpocHas('Unfortunate #665')) muts.forEach(function(m) { m[1] *= 1.03; });

                return muts;
            }; });

            hookOnce(M, 'getCost', '_jneGardenCost', function(orig) { return function(me) {
                var cost = orig.call(this, me);
                return gpocHas('Unfortunate #665') ? cost * 0.97 : cost;
            }; });

            hookOnce(M, 'computeEffs', '_jneNewPlantEffs', function(orig) { return function() {
                var M = minigameOf('Farm');
                orig.call(this);

                var magicMushroomMult = 0;

                for (var y = 0; y < 6; y++) {
                    for (var x = 0; x < 6; x++) {
                        var tile = M.plot[y][x];
                        if (tile[0] > 0) {
                            var me = M.plantsById[tile[0] - 1];
                            var name = me.key;
                            var mult = plantMult(M, x, y, me, tile);

                            if (name == 'sparklingSugarCane') {
                                M.effs.cps *= 1 - 0.02 * mult;
                            }
                            else if (name == 'krazyKudzu') {
                                M.effs.goldenCookieFreq *= 1 - 0.01 * mult;
                                if (M.effs.wrathCookieFreq !== undefined) M.effs.wrathCookieFreq *= 1 - 0.01 * mult;
                            }
                            else if (name == 'magicMushroom') {
                                M.effs.goldenCookieFreq *= 1 - 0.01 * mult;
                                if (M.effs.wrathCookieFreq !== undefined) M.effs.wrathCookieFreq *= 1 - 0.01 * mult;
                                magicMushroomMult += mult;
                            }
                        }
                    }
                }

                if (!M.effs.buildingBoosts) M.effs.buildingBoosts = {};
                M.effs.magicMushroomMult = magicMushroomMult;

                Game.recalculateGains = 1;
            }; });

            if (M.freeze !== undefined && !M._newPlantFreezeHooked) {
                M._newPlantFreezeHooked = true;

                var checkFreeze = function() {
                    var currentFreeze = M.freeze;
                    if (typeof M._lastFreezeState === 'undefined') M._lastFreezeState = currentFreeze;

                    if (currentFreeze && !M._lastFreezeState) {
                        for (var y = 0; y < 6; y++) {
                            for (var x = 0; x < 6; x++) {
                                var tile = M.plot[y][x];
                                if (tile && tile[0] > 0) {
                                    var me = M.plantsById[tile[0] - 1];
                                    if (me.key === 'sparklingSugarCane' && jneIndependentRandom() < 0.95) {
                                        M.plot[y][x] = [0, 0];
                                        M.toRebuild = true;
                                    }
                                }
                            }
                        }
                    }

                    M._lastFreezeState = currentFreeze;
                };

                if (Game.registerHook) {
                    Game.registerHook('logic', checkFreeze);
                }
            }

            if (Game.harvestLumps && !Game._sugarCaneHooked) {
                Game._sugarCaneHooked = true;
                hookOnce(Game, 'harvestLumps', '_jneHarvestLumps', function(orig) { return function(amount, silent) {
                    var M = minigameOf('Farm');
                    if (M && M.plants && M.plants['sparklingSugarCane'] && M.plot) {
                        var totalMult = sugarCaneTotalMult(M);

                        if (totalMult > 0) {
                            var chance = totalMult * 0.01;
                            if (jneIndependentRandom() < chance) {
                                amount *= 2;
                                if (!silent) {
                                    Game.Notify('Sugar cane doubled your sugar lumps!', 'Your sparkling sugar cane plants triggered a lucky doubling!', JNE.icon(4, 24, 'custom'), 6);
                                }
                            }
                        }
                    }
                    return orig.call(this, amount, silent);
                }; });
            }


        }

        if (minigameOf('Farm')) {
            var M = minigameOf('Farm');
            if (M && M.plants && M.plants['sparklingSugarCane']) {
                setupPlantHooks(M);
            }
        }

        function setupMagicMushroomDrops() {
            if (!Game.Has('Magic mushroom')) return;

            var upgrades = [
                [
                    'Hearty farm biscuit',
                    [10, 18],
                    'Farm',
                    'Farms',
                    'A fairly unappealing biscuit made from leftover droppings from your farm. Taste aside, they are heavily subsidized by the government.',
                    10500.062
                ],
                [
                    'Astronaut cookie',
                    [21, 16],
                    'Shipment',
                    'Shipments',
                    'Space-age technology, which in all honesty is really just dehydration. Lies in cookie form sold to gullible children who were told they could grow up to be anything.',
                    10500.063
                ],
                [
                    'The chemist cookie',
                    [24, 17],
                    'Alchemy lab',
                    'Alchemy labs',
                    'Legend holds this cookie was created by a pharmacist mixing expired compounds together and selling them to uninsured patients in the hope it might do some good. Tastes like cough syrup, but good for the profit margins.',
                    10500.064
                ]
            ];

            for (var i = 0; i < upgrades.length; i++) {
                var u = upgrades[i];
                var existing = Game.Upgrades[u[0]];
                if (!existing) {
                    var desc = u[3] + ' are <b>twice</b> as efficient.<br>Cost scales with CpS.<q>' + u[4] + '</q>';
                    var basePrice = 600;
                    new Game.Upgrade(u[0], desc, basePrice, u[1]);
                    Game.last.ddesc = desc;
                    Game.last.pool = 'cookie';
                    Game.last.power = 0;
                    Game.last.lasting = true;
                    Game.last._heavenlyUpgrade = true;
                    Game.last.order = u[5];
                    Game.last.priceFunc = function(cost) { return function() { return cost * Game.cookiesPs * 60; }; }(Game.last.basePrice);
                    Game.last.buyFunction = function() {
                        this.unlocked = 1;
                    };
                    // Only set default bought=0 for NEW upgrades, not restored ones
                    Game.last.bought = 0;
                }
                // If upgrade already exists, don't modify its bought state - preserve it from save data
            }

            if (!Game._magicMushroomDropsHooked) {
                Game._magicMushroomDropsHooked = true;
                hookOnce(Game, 'GetTieredCpsMult', '_jneTieredCps', function(orig) { return function(me) {
                    var prev = orig;
                    if (!me || !me.name) return prev ? prev(me) : 1;
                    var mult = prev ? prev(me) : 1;
                    if ((me.name === 'Farm' && Game.Has('Hearty farm biscuit')) ||
                        (me.name === 'Shipment' && Game.Has('Astronaut cookie')) ||
                        (me.name === 'Alchemy lab' && Game.Has('The chemist cookie'))) mult *= 2;
                    return mult;
                }; });
            }
        }

        function setupShinyWrinklerSpell() {
            var M = loadedMinigame('Wizard tower');
            if (!M) return;
            if (!M || !M.castSpell) return;

            if (M.castSpell._shinyWrinklerWrapped) { M._shinyWrinklerHooked = true; return; }

            var originalCastSpell = M.castSpell;
            var shinyWrinklerCastSpellWrapper = function(spell, obj) {
                var before = new Set();
                if (spell && spell.name === 'Resurrect Abomination') {
                    for (var i in Game.wrinklers) {
                        var w = Game.wrinklers[i];
                        if (w && w.phase > 0) before.add(w);
                    }
                }
                var result = originalCastSpell.call(this, spell, obj);
                if (spell && spell.name === 'Resurrect Abomination' && result !== -1) {
                    var chance = 0, upgrade = null;
                    if (Game.Has('Alakazoodle evil noodle')) { chance = 0.03; upgrade = Game.Upgrades['Alakazoodle evil noodle']; }
                    else if (Game.Has('Abra-Ka-Wiggle')) { chance = 0.02; upgrade = Game.Upgrades['Abra-Ka-Wiggle']; }
                    else if (Game.Has('Skitter skatter skrum ahh')) { chance = 0.01; upgrade = Game.Upgrades['Skitter skatter skrum ahh']; }
                    if (chance > 0 && jneIndependentRandom() < chance) {
                        var found = false;
                        var check = function() {
                            if (found) return;
                            for (var i in Game.wrinklers) {
                                var w = Game.wrinklers[i];
                                if (w && w.phase > 0 && !before.has(w) && w.type == 0) {
                                    w.type = 1;
                                    found = true;
                                    if (upgrade && Game.Notify) Game.Notify(upgrade.name, 'A shiny wrinkler has been summoned!', upgrade.icon || [0, 0]);
                                    return;
                                }
                            }
                        };
                        check();
                        setTimeout(check, 25);
                        setTimeout(check, 100);
                    }
                }
                return result;
            };
            shinyWrinklerCastSpellWrapper._shinyWrinklerWrapped = true;
            M.castSpell = shinyWrinklerCastSpellWrapper;
            M._shinyWrinklerHooked = true;
        }

        function setupGildedAllureSpell() {
            var M = loadedMinigame('Wizard tower');
            if (!M) return;
            if (!M || !M.spells || !M.spellsById) return;

            // GFD/FortuneCookie patches, even if player doesn't have the upgrade yet so predictions work once they buy it
            var hasUpgrade = Game.Has('Gilded allure');

            if (!hasUpgrade && M._gildedAllureHooked) return; // Don't need spell if no upgrade
            if (hasUpgrade && M._gildedAllureHooked) return; // Already set up
            if (!hasUpgrade) return; // Not ready yet

            if (typeof l !== 'function' || !l('grimoireSpells')) return;

            // Remove any existing gilded allure spell to prevent duplicates on save load
            if (M.spells['gilded allure']) {
                delete M.spells['gilded allure'];
            }
            // Remove from spellsById array and compact it
            for (var i = 0; i < M.spellsById.length; i++) {
                if (M.spellsById[i] && (M.spellsById[i].name === loc("Gilded Allure") || M.spellsById[i].name === "Gilded Allure")) {
                    M.spellsById.splice(i, 1);
                    i--; // Adjust index since array shifted
                }
            }

            // Tagging our element with a stable data attribute lets us find and remove it reliably.
            var staleSpellEls = l('grimoireSpells').querySelectorAll('[data-jne-gilded-allure]');
            for (var i = 0; i < staleSpellEls.length; i++) {
                staleSpellEls[i].remove();
            }

            var me={name:loc("Gilded Allure"),desc:loc("Golden Cookies appear 30% more often for the next 10 minutes."),failDesc:loc("Golden Cookies appear 75% less often for the next hour."),icon:[20,19],customIconSheet:window.getSpriteSheet('custom'),costMin:15,costPercent:0.5,
                win:()=>{Game.killBuff('Gilded allure');Game.killBuff('Midas curse');Game.gainBuff('gilded allure',600,1);Game.Popup(loc("Gilded allure!"),Game.mouseX,Game.mouseY);},
                fail:()=>{Game.killBuff('Gilded allure');Game.killBuff('Midas curse');Game.gainBuff('midas curse',3600,1);Game.Popup(loc("Backfire!")+'<br>'+loc("Midas curse!"),Game.mouseX,Game.mouseY);}};
            M.spells['gilded allure']=me; me.id=M.spellsById.length; M.spellsById[me.id]=me; M._gildedAllureHooked=true;
            var div = document.createElement('div');
            div.innerHTML = '<div class="grimoireSpell titleFont" data-jne-gilded-allure="1" id="grimoireSpell'+me.id+'" '+Game.getDynamicTooltip('Game.ObjectsById['+M.parent.id+'].minigame.spellTooltip('+me.id+')','this')+'><div class="usesIcon shadowFilter grimoireIcon" style="background-image:url(\''+me.customIconSheet+'\');background-position:'+(-me.icon[0]*48)+'px '+(-me.icon[1]*48)+'px;"></div><div class="grimoirePrice" id="grimoirePrice'+me.id+'">-</div></div>';
            var d = div.firstChild;
            l('grimoireSpells').appendChild(d); AddEvent(d,'click',()=>{PlaySound('snd/tick.mp3');M.castSpell(me);});


            if (M.spellTooltip && !M._gildedAllureTooltipHooked) {
                M._gildedAllureTooltipHooked = true;
                hookOnce(M, 'spellTooltip', '_jneSpellTip', function(orig) { return function(id) {
                    var M = minigameOf('Wizard tower');
                    var tooltipFunc = orig.call(this, id);
                    var spell = M.spellsById[id];

                    if (spell && spell.name === loc("Gilded Allure") && spell.customIconSheet) {
                        return function() {
                            spell.icon = spell.icon || [20, 19];
                            var cost = Beautify(M.getSpellCost(spell));
                            var costBreakdown = M.getSpellCostBreakdown(spell);
                            if (cost != costBreakdown) costBreakdown = ' <small>(' + costBreakdown + ')</small>'; else costBreakdown = '';
                            var backfire = M.getFailChance(spell);
                            var str = '<div style="padding:8px 4px;min-width:350px;" id="tooltipSpell">' +
                                '<div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;background-image:url(\'' + spell.customIconSheet + '\');' + (spell.icon[2] ? 'background-image:url(' + spell.icon[2] + ');' : '') + 'background-position:' + (-spell.icon[0] * 48) + 'px ' + (-spell.icon[1] * 48) + 'px;"></div>' +
                                '<div class="name">' + spell.name + '</div>' +
                                '<div>' + (typeof loc === 'function' ? loc("Magic cost:") : "Magic cost:") + ' <b style="color:#' + (cost <= M.magic ? '6f6' : 'f66') + ';">' + cost + '</b>' + costBreakdown + '</div>' +
                                (spell.fail ? ('<div><small>' + (typeof loc === 'function' ? loc("Chance to backfire:") : "Chance to backfire:") + ' <b style="color:#f66">' + Math.ceil(100 * backfire) + '%</b></small></div>') : '') +
                                '<div class="line"></div><div class="description"><b>' + (typeof loc === 'function' ? loc("Effect:") : "Effect:") + '</b> <span class="green">' + (spell.descFunc ? spell.descFunc() : spell.desc) + '</span>' + (spell.failDesc ? ('<div style="height:8px;"></div><b>' + (typeof loc === 'function' ? loc("Backfire:") : "Backfire:") + '</b> <span class="red">' + spell.failDesc + '</span>') : '') + '</div></div>';
                            return str;
                        };
                    }
                    return tooltipFunc;
                }; });
            }

            // patches for other mods: spell predictions, fortune cookie, Clairvoyance (planner is standalone, no issues)
            var patchFortuneCookie = function() {
                if (typeof FortuneCookie === 'undefined') return;
                if (!FortuneCookie.spellForecast) return;
                if (FortuneCookie._gildedAllurePatched) return;
                FortuneCookie._gildedAllurePatched = true;

                hookOnce(FortuneCookie, 'spellForecast', '_jneSpellForecast', function(orig) { return function(spell) {
                    var M = minigameOf('Wizard tower');
                    if (!M) return orig.apply(this, arguments);

                    if (spell && spell.name === "Gambler's Fever Dream") {
                        var originalSpellsById = M.spellsById;
                        var originalSpells = M.spells;

                        M.spellsById = originalSpellsById.slice(0, 8);
                        var filteredSpells = {};
                        for (var key in originalSpells) {
                            if (key !== 'gilded allure') {
                                filteredSpells[key] = originalSpells[key];
                            }
                        }
                        M.spells = filteredSpells;

                        try {
                            return orig.apply(this, arguments);
                        } finally {
                            M.spellsById = originalSpellsById;
                            M.spells = originalSpells;
                        }
                    }
                    return orig.apply(this, arguments);
                }; });
            };

            var patchGFDSpell = function() {
                var gfd = M.spells["gambler's fever dream"];

                if (!gfd) {
                    for (var key in M.spells) {
                        if (M.spells[key].name && M.spells[key].name.toLowerCase().includes('gambler')) {
                            gfd = M.spells[key];
                            break;
                        }
                    }
                }

                if (!gfd || gfd._gildedAllurePatched) return;

                gfd._gildedAllurePatched = true;

                hookOnce(gfd, 'win', '_jneGfdWin', function(orig) { return function() {
                    var M = minigameOf('Wizard tower');
                    // Only filter if gilded allure actually exists in the spell list
                    if (!M.spells['gilded allure']) {
                        return orig.apply(this, arguments);
                    }

                    var originalSpells = M.spells;

                    var filteredSpells = {};
                    for (var key in originalSpells) {
                        if (key !== 'gilded allure') {
                            filteredSpells[key] = originalSpells[key];
                        }
                    }
                    M.spells = filteredSpells;

                    try {
                        return orig.apply(this, arguments);
                    } finally {
                        M.spells = originalSpells;
                    }
                }; });
            };

            patchGFDSpell();
            patchFortuneCookie();
            setTimeout(patchFortuneCookie, 10000);

            if (typeof CCSE !== 'undefined' && CCSE.postLoadHooks) {
                CCSE.postLoadHooks.push(patchFortuneCookie);
            }
        }

        function setupBlackfridaySpecial() {
            if (Game.computeSeasonPrices && !Game.computeSeasonPrices._blackfridayHooked) {
                var funcStr = Game.computeSeasonPrices.toString();

                if (funcStr.indexOf("Game.Has('Blackfriday special')") !== -1) {
                    Game.computeSeasonPrices._blackfridayHooked = true;
                    return;
                }

                // Inject Blackfriday check into the priceFunc
                var injection = "if(Game.Has('Blackfriday special'))m*=0.75;";
                var returnPattern = "return Game.seasonTriggerBasePrice+Game.unbuffedCps*60*Math.pow(1.5,Game.seasonUses)*m;";

                if (funcStr.indexOf(returnPattern) !== -1) {
                    funcStr = funcStr.replace(returnPattern, injection + returnPattern);
                    Game.computeSeasonPrices = (0, eval)('(' + funcStr + ')');
                    Game.computeSeasonPrices._blackfridayHooked = true;

                    try {
                        Game.computeSeasonPrices();
                    } catch (e) {}
                }
            }
        }

         /*
         * Improved Cookie Chains
         *
         * At high cookie counts, vanilla chains end immediately because the starting level
         * (based on log10(cookies)) exceeds maxPayout. This fix calculates a starting level
         * based on maxPayout instead, giving ~7 chain clicks that end with maxPayout. End result is
         * player gets the same amount from the cookie chain but gets more spawns on it feeling more like the vanilla approach

         Improved cookie chains is now handled in JustNaturalExpansion.js via centralized eval injection
        */

        function setupGoldenCookiePredictor() {
            if (!Game.registerHook || Game._goldenCookiePredictorHooked) return;
            Game._goldenCookiePredictorHooked = true;
            if (!Game.shimmerTypes || !Game.shimmerTypes['golden'] || !Game.shimmerTypes['golden'].popFunc) return;

            var shimmerCache = {};
            var overlay = null;
            function noop() {}

            function getOverlay() {
                if (overlay) return overlay;
                var gameDiv = document.getElementById('game');
                if (!gameDiv) return null;
                overlay = document.createElement('div');
                overlay.id = 'gcp-overlay';
                overlay.style.position = 'absolute';
                overlay.style.left = '0';
                overlay.style.top = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.pointerEvents = 'none';
                overlay.style.zIndex = '2147483647';
                if (window.getComputedStyle(gameDiv).position === 'static') {
                    gameDiv.style.position = 'relative';
                }
                gameDiv.appendChild(overlay);
                return overlay;
            }

            function getPredictorChance() {
                if (Game.Has('Perfected golden cookie predictor')) return 0.65;
                if (Game.Has('Improved golden cookie predictor')) return 0.50;
                if (Game.Has('Tweaked golden cookie predictor')) return 0.25;
                if (Game.Has('Golden cookie predictor')) return 0.10;
                return 0;
            }

            // Golden cookie predictor mode is now handled centrally in JustNaturalExpansion.js
            // via injectGoldenPopFunc(). No direct popFunc wrapping needed here.

            function predictGoldenCookieResult(shimmer) {
                if (!shimmer || shimmer.type !== 'golden') return null;

                if (shimmer.force && shimmer.force !== '') {
                    return shimmer.force;
                }

                var shimmerType = Game.shimmerTypes && Game.shimmerTypes['golden'];
                if (!shimmerType || !shimmerType.popFunc) return null;

                if (shimmerType.chain > 0) {
                    return null;
                }

                var fakeShimmer = {
                    id: shimmer.id,
                    type: shimmer.type,
                    wrath: shimmer.wrath || 0,
                    life: shimmer.life || 0,
                    dur: shimmer.dur || 0,
                    spawnLead: false,
                    force: shimmer.force || '',
                    x: shimmer.x || 0,
                    y: shimmer.y || 0,
                    l: { offsetWidth: 48, offsetHeight: 48 },
                    die: noop,
                    _predictionMode: true
                };

                try {
                    shimmerType.popFunc.call(shimmerType, fakeShimmer);
                    return fakeShimmer._predictedChoice || null;
                } catch (e) {
                    console.error('[Heavenly Upgrades] Error predicting:', e);
                    return null;
                }
            }

            function formatResultName(result) {
                if (!result || result === '') return result;

                if (result === 'multiply cookies') {
                    return 'Lucky Cookie';
                }

                if (result === 'blood frenzy') {
                    return 'Elder Frenzy';
                }

                return result.split(' ').map(function(word) {
                    if (word.length === 0) return word;
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }).join(' ');
            }

            function ensureListeners(shimmer) {
                if (shimmerCache[shimmer.id]) return;
                shimmerCache[shimmer.id] = { div: null, prediction: null, predictedForce: null };

                shimmer.l.addEventListener('mouseenter', function() {
                    var chance = getPredictorChance();
                    if (chance === 0) return;
                    var rec = shimmerCache[shimmer.id];
                    if (!rec) return;

                    if (rec.prediction === null) {
                        rec.prediction = Math.random() < chance;
                    }
                    if (!rec.prediction) return;

                    var displayText = shimmer.force || '';
                    var hadForceBeforePrediction = !!(shimmer.force && shimmer.force !== '');
                    if (!displayText || displayText === '') {
                        if (rec.predictedForce === null) {
                            rec.predictedForce = predictGoldenCookieResult(shimmer);
                            if (rec.predictedForce) {
                                shimmer.force = rec.predictedForce;
                                if (!hadForceBeforePrediction) {
                                    shimmer._jneForceInjected = true;
                                }
                            }
                        }
                        displayText = rec.predictedForce || '';
                    }

                    if (displayText === 'cookie storm drop' || !displayText || displayText === '') return;

                    if (!rec.div) {
                        var d = document.createElement('div');
                        d.className = 'framed';
                        d.style.position = 'absolute';
                        d.style.transform = 'translate(-50%, -50%)';
                        d.style.padding = '4px 8px';
                        d.style.font = '14px Merriweather, serif';
                        d.style.color = '#fff';
                        d.style.pointerEvents = 'none';
                        getOverlay().appendChild(d);
                        rec.div = d;
                    }

                    rec.div.textContent = formatResultName(displayText);

                    var b = shimmer.l.getBounds();
                    rec.div.style.left = (b.left + b.width / 2 - 3) + 'px';
                    rec.div.style.top = b.top + (b.height / 4) + 'px';
                    rec.div.style.display = 'block';
                });

                shimmer.l.addEventListener('mouseleave', function() {
                    var rec = shimmerCache[shimmer.id];
                    if (rec && rec.div) {
                        rec.div.style.display = 'none';
                    }
                });
            }

            Game.registerHook('draw', function() {
                var chance = getPredictorChance();
                if (!Game.shimmers || chance === 0) return;

                var activeIds = {};
                for (var i in Game.shimmers) {
                    var s = Game.shimmers[i];
                    if (s && s.type === 'golden' && s.life > 0) {
                        activeIds[s.id] = true;
                        ensureListeners(s);
                    }
                }

                for (var id in shimmerCache) {
                    if (!activeIds[id]) {
                        var rec = shimmerCache[id];
                        if (rec.div) rec.div.remove();
                        delete shimmerCache[id];
                    }
                }
            }, 'Golden cookie predictor draw');
        }




        function setupSugarFrenzyII() {
            if (!Game.Has('Sugar frenzy II')) return;

            var button = Game.Upgrades['Sugar frenzy'];
            if (!button || button._sugarFrenzyII) return;

            button._sugarFrenzyII = true;
            if (!Game.sugarFrenzyLastUse) Game.sugarFrenzyLastUse = 0;
            if (!Game.sugarFrenzyPrice) Game.sugarFrenzyPrice = 1;

            if ((Game.sugarFrenzyLastUse || 0) === 0 && button.bought) {
                Game.sugarFrenzyLastUse = Date.now();
                if ((Game.sugarFrenzyPrice || 1) < 2) Game.sugarFrenzyPrice = 2;
            }

            if (button.bought) {
                if (typeof button.unearn === 'function') button.unearn();
                else button.bought = 0;
            }

            var cooldown = 24 * 60 * 60 * 1000;
            var baseDesc = 'Activating this will <b>triple your CpS</b> for 1 hour.<br><br>May be used <b>once every 24 hours</b>. Each use in an ascension increases the cost by <b>one additional sugar lump</b>.';

            button.desc = baseDesc;
            Object.defineProperty(button, 'ddesc', {
                get: function() {
                    var timeSinceLastUse = Date.now() - (Game.sugarFrenzyLastUse || 0);
                    if (timeSinceLastUse < cooldown) {
                        var timeStr = Game.sayTime(Math.ceil((cooldown - timeSinceLastUse) / 1000 * Game.fps), -1);
                        return '<div style="text-align:center;margin-bottom:8px;"><b>Cooldown remaining: ' + timeStr + '</b></div><div class="line"></div>' + baseDesc;
                    }
                    return baseDesc;
                },
                configurable: true
            });
            Object.defineProperty(button, 'priceLumps', {
                get: function() {
                    return Game.sugarFrenzyPrice || 1;
                },
                configurable: true
            });

            button.canBuyFunc = function() {
                var price = Game.sugarFrenzyPrice || 1;
                if (Game.lumps < price) return false;
                return Date.now() - (Game.sugarFrenzyLastUse || 0) >= cooldown;
            };

            button.clickFunction = function() {
                var price = Game.sugarFrenzyPrice || 1;
                if (Game.lumps < price) return;
                if (Date.now() - (Game.sugarFrenzyLastUse || 0) < cooldown) return;

                var priceText = price + ' sugar lump' + (price !== 1 ? 's' : '');
                var newPrice = price + 1;
                Game.Prompt('<id SugarFrenzyPrompt><h3>Activate the sugar frenzy?</h3><div class="block">' +
                    'Spend ' + priceText + ' to activate Sugar frenzy (triple CpS for 1 hour).</div>', [
                    ['Activate', 'Game.ClosePrompt();Game.sugarFrenzyLastUse = Date.now();Game.lumps -= ' + price + ';Game.sugarFrenzyPrice = ' + newPrice + ';Game.gainBuff(\'sugar frenzy\', 60 * 60, 3);Game.Notify("Sugar frenzy!", "CpS x3 for 1 hour!", [29, 14]);Game.storeToRefresh=1;Game.upgradesToRebuild=1;if(Game.RefreshStore)Game.RefreshStore();if(Game.RebuildUpgrades)Game.RebuildUpgrades();'],
                    'Cancel'
                ]);
            };

            button.displayFuncWhenOwned = function() {
                var timeSinceLastUse = Date.now() - (Game.sugarFrenzyLastUse || 0);
                if (timeSinceLastUse < cooldown) {
                    var timeStr = Game.sayTime(Math.ceil((cooldown - timeSinceLastUse) / 1000 * Game.fps), -1);
                    return '<div style="text-align:center;">Cooldown remaining:<br><b>' + timeStr + '</b></div>';
                }
                return '<div style="text-align:center;">Click to activate!</div>';
            };

            button.timerDisplay = function() {
                var timeSinceLastUse = Date.now() - (Game.sugarFrenzyLastUse || 0);
                if (Game.sugarFrenzyLastUse === 0 || timeSinceLastUse >= cooldown) return -1;
                return timeSinceLastUse / cooldown;
            };
        }

        function setupSugarForSugarTrading() {
            if (!Game.Has('Sugar for sugar trading') || Game.Upgrades['Sugar trade']) return;

            var desc = 'Spend a <b>sugar lump</b> to summon a <b>Golden Cookie</b>.<br>May be used once per ascension.';
            new Game.Upgrade('Sugar trade', desc, 0, [21, 17]);
            var button = Game.last;
            button.pool = 'toggle';
            button.toggleInto = 0;
            button.order = 40051;
            button.priceLumps = 1;
            button.desc = button.ddesc = desc;
            button.canBuyFunc = function() {
                return Game.lumps >= 1 && this.bought === 0;
            };
            button.displayFuncWhenOwned = function() {
                return '<div style="text-align:center;"><b>Already used this ascension</b></div>';
            };
            button.clickFunction = function() {
                if (this.bought === 1) return;
                if (Game.lumps < 1) return;
                Game.Prompt('<id SugarTradePrompt><h3>Activate the sugar trade?</h3><div class="block">' +
                    'Spend 1 sugar lump to summon a golden cookie.</div>', [
                    ['Activate', 'Game.ClosePrompt();if(Game.lumps>=1){Game.lumps-=1;Game.Upgrades["Sugar trade"].buy(1);Game.Upgrades["Sugar trade"].bought=1;new Game.shimmer("golden");Game.Notify("Sugar trade","Summoned a golden cookie.",[21,17]);Game.storeToRefresh=1;Game.upgradesToRebuild=1;if(Game.RefreshStore)Game.RefreshStore();if(Game.RebuildUpgrades)Game.RebuildUpgrades();}'],
                    'Cancel'
                ]);
            };
        };

        function setupReoccuringBusiness() {
            if (!Game.Has('Reoccuring business')) return;
            var button = Game.Upgrades['Sugar trade'];
            if (!button || button._reoccuringBusiness) return;
            button._reoccuringBusiness = true;
            if (!Game.sugarTradeLastUse) Game.sugarTradeLastUse = 0;
            if (!Game.sugarTradePrice) Game.sugarTradePrice = 1;

            var cooldown = 24 * 60 * 60 * 1000;
            var baseDesc = 'Spend a <b>sugar lump</b> to summon a <b>Golden Cookie</b>.<br>May be used <b>once every 24 hours</b>. Each use in an ascension increases the cost by <b>one additional sugar lump</b>.';

            button.desc = baseDesc;
            Object.defineProperty(button, 'ddesc', {
                get: function() {
                    var timeSinceLastUse = Date.now() - (Game.sugarTradeLastUse || 0);
                    if (timeSinceLastUse < cooldown) {
                        var timeStr = Game.sayTime(Math.ceil((cooldown - timeSinceLastUse) / 1000 * Game.fps), -1);
                        return '<div style="text-align:center;margin-bottom:8px;"><b>Cooldown remaining: ' + timeStr + '</b></div><div class="line"></div>' + baseDesc;
                    }
                    return baseDesc;
                },
                configurable: true
            });
            Object.defineProperty(button, 'priceLumps', {
                get: function() { return Game.sugarTradePrice || 1; },
                configurable: true
            });

            button.canBuyFunc = function() {
                var price = Game.sugarTradePrice || 1;
                if (Game.lumps < price || this.bought) return false;
                return Date.now() - (Game.sugarTradeLastUse || 0) >= cooldown;
            };

            button.clickFunction = function() {
                var price = Game.sugarTradePrice || 1;
                if (Game.lumps < price || this.bought) return;
                if (Date.now() - (Game.sugarTradeLastUse || 0) < cooldown) return;

                var priceText = price + ' sugar lump' + (price !== 1 ? 's' : '');
                Game.Prompt('<id SugarTradePrompt><h3>Activate the sugar trade?</h3><div class="block">' +
                    'Spend ' + priceText + ' to summon a golden cookie.</div>', [
                    ['Activate', 'Game.ClosePrompt();if(Game.lumps>=' + price + '){Game.lumps-=' + price + ';Game.sugarTradeLastUse=Date.now();Game.sugarTradePrice=' + (price + 1) + ';new Game.shimmer("golden");Game.Notify("Sugar trade","Summoned a golden cookie.",[21,17]);Game.storeToRefresh=1;Game.upgradesToRebuild=1;}'],
                    'Cancel'
                ]);
            };

            button.displayFuncWhenOwned = function() {
                var timeSinceLastUse = Date.now() - (Game.sugarTradeLastUse || 0);
                if (timeSinceLastUse < cooldown) {
                    var timeStr = Game.sayTime(Math.ceil((cooldown - timeSinceLastUse) / 1000 * Game.fps), -1);
                    return '<div style="text-align:center;">Cooldown remaining:<br><b>' + timeStr + '</b></div>';
                }
                return '<div style="text-align:center;">Click to summon!</div>';
            };

            button.timerDisplay = function() {
                var timeSinceLastUse = Date.now() - (Game.sugarTradeLastUse || 0);
                if (Game.sugarTradeLastUse === 0 || timeSinceLastUse >= cooldown) return -1;
                return timeSinceLastUse / cooldown;
            };
        }

        Game.jneDetectRigidelSlot = function() {
            if (!Game.Objects['Temple'] || !minigameOf('Temple')) return 0;
            if (Game.hasGod && typeof Game.hasGod === 'function') {
                try {
                    var slot = Game.hasGod('order');
                    if (slot && typeof slot === 'number' && slot >= 1 && slot <= 3) return slot;
                } catch (e) {}
            }
            return 0;
        };

        Game.jneDetectRigidelActive = function() {
            if (!Game.Objects['Temple'] || !minigameOf('Temple')) return 0;
            var slot = Game.jneDetectRigidelSlot();
            if (slot === 0) return 0; // Rigidel cannot be active when not slotted
            return (Game.BuildingsOwned % 10 === 0) ? 1 : 0;
        };

        Game.jneNormalizeElderWrathForPredictor = function() {
            var w = Game.elderWrath;
            if (typeof w !== 'number' || w !== w) return 0;
            w = w | 0;
            if (w < 0) return 0;
            if (w > 3) return 3;
            return w;
        };

        // Sugar Lump Prediction System
        function setupSugarPredictor() {
            if (!Game.Has('Sugar predictor') || Game._sugarPredictorHooked) return;
            Game._sugarPredictorHooked = true;

            if (Game._sugarPredictorDebug === undefined) Game._sugarPredictorDebug = false;

            // pantheon slots change
            var PM = minigameOf('Temple');
            if (PM) hookSugarPredictorSlot(PM);

            if (!Game.getLumpPredictorUpgradeSig) {
                Game.getLumpPredictorUpgradeSig = function() {
                    // changes here invalidate the precomputed table.
                    var h = function(name) { return Game.Has && Game.Has(name) ? 1 : 0; };
                    return [
                        h('Stevia Caelestis'),
                        h('Sugar aging process'),
                        h('Glucose-charged air'),
                        h('Sucralosia Inutilis')
                    ].join(',');
                };
            }

            Game._lumpPredictionCache = null;

            if (!Game._lumpGameStates) {
                var states = [];
                for (var dc = 0; dc < 2; dc++) {
                    for (var rb = 0; rb < 2; rb++) {
                        var siAllowed = (dc && rb) ? 0 : 1;
                        for (var r = 0; r < 4; r++) {
                            for (var si = 0; si <= siAllowed; si++) {
                                for (var active = 0; active < 2; active++) {
                                    if (r === 0 && active === 1) continue;
                                    for (var w = 0; w < 4; w++) {
                                        var minG = (r === 0 || !active) ? 0 : 201;
                                        for (var g = minG; g <= 600; g++) {
                                            if (g === 0 && w > 0) continue;
                                            states.push({
                                                elderWrath: w, grandmas: g, rigidelSlot: r,
                                                rigidelActive: active,
                                                dragonsCurve: dc, realityBending: rb, supremeIntellect: si
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Game._lumpGameStates = states;
            }

            Game.calculateLumpRipeAgeWithState = function(grandmas, rigidel, rigidelActive, dragonsCurve, realityBending, supremeIntellect) {
                var hour = 3600000;
                var age = hour * 23;

                if (Game.Has('Stevia Caelestis')) age -= hour;
                if (Game.Has('Sugar aging process')) age -= 6000 * Math.min(600, grandmas);
                if (rigidelActive && rigidel === 1) age -= hour;
                else if (rigidelActive && rigidel === 2) age -= (hour/3)*2;
                else if (rigidelActive && rigidel === 3) age -= hour/3;
                var curveMult = (dragonsCurve ? 1 : 0) + (realityBending ? 0.1 : 0);
                age /= 1 + curveMult * 0.05;
                age += hour;
                if (Game.Has('Glucose-charged air')) age /= 2000;
                return age;
            };

            Game.predictLumpTypesByWrathWithState = function(startTime, grandmas, rigidel, rigidelActive, dragonsCurve, realityBending, type1Chance, supremeIntellect) {
                var harvestTime = startTime + Game.calculateLumpRipeAgeWithState(grandmas, rigidel, rigidelActive, dragonsCurve, realityBending, supremeIntellect);
                var oldRandom = Math.random;
                var rng;
                try {
                    Math.seedrandom(Game.seed + '/' + harvestTime);
                    rng = Math.random;
                } finally {
                    Math.random = oldRandom;
                }
                var t0 = [0], t1 = [0], t2 = [0], t3 = [0];
                var curveMult = (dragonsCurve ? 1 : 0) + (realityBending ? 0.1 : 0);
                var loop = 1 + curveMult;
                // Mirror vanilla's randomFloor exactly: always consumes one Math.random() call,
                // even when loop is an integer. if ((loop%1)<Math.random()) floor else ceil
                var loops = ((loop % 1) < rng()) ? Math.floor(loop) : Math.ceil(loop);
                var chance1 = (type1Chance !== undefined) ? type1Chance : (Game.Has('Sucralosia Inutilis') ? 0.15 : 0.1);

                for (var i = 0; i < loops; i++) {
                    if (rng() < chance1) { t0.push(1); t1.push(1); t2.push(1); t3.push(1); }
                    if (rng() < 0.003) { t0.push(2); t1.push(2); t2.push(2); t3.push(2); }
                    var meatyRoll = rng();
                    if (meatyRoll < 0.1 * 0) t0.push(3);
                    if (meatyRoll < 0.1 * 1) t1.push(3);
                    if (meatyRoll < 0.1 * 2) t2.push(3);
                    if (meatyRoll < 0.1 * 3) t3.push(3);
                    if (rng() < 0.02) { t0.push(4); t1.push(4); t2.push(4); t3.push(4); }
                }

                var pick = rng();
                return [
                    t0[Math.floor(pick * t0.length)],
                    t1[Math.floor(pick * t1.length)],
                    t2[Math.floor(pick * t2.length)],
                    t3[Math.floor(pick * t3.length)]
                ];
            };

            Game.predictLumpTypeWithState = function(startTime, grandmas, rigidel, rigidelActive, dragonsCurve, realityBending, wrath, supremeIntellect) {
                var types = Game.predictLumpTypesByWrathWithState(startTime, grandmas, rigidel, rigidelActive, dragonsCurve, realityBending, undefined, supremeIntellect);
                return types[wrath | 0] || 0;
            };

            Game.precomputeAllLumpTypes = function(callback) {
                var startTime = Game.lumpT;
                Game._lumpGameStatesLumpT = startTime;
                Game._lumpGameStatesUpgradeSig = Game.getLumpPredictorUpgradeSig ? Game.getLumpPredictorUpgradeSig() : '';
                var type1Chance = Game.Has('Sucralosia Inutilis') ? 0.15 : 0.1;
                var index = 0;
                var chunkSize = 4000;
                var process = function() {
                    var end = Math.min(index + chunkSize, Game._lumpGameStates.length);
                    for (; index < end; index++) {
                        var s = Game._lumpGameStates[index];
                        var res = Game.predictLumpTypesByWrathWithState(startTime, s.grandmas, s.rigidelSlot, s.rigidelActive, s.dragonsCurve, s.realityBending, type1Chance, s.supremeIntellect || 0);
                        s.predictedType = res[s.elderWrath];
                    }
                    if (index < Game._lumpGameStates.length) setTimeout(process, 0);
                    else if (callback) callback();
                };
                process();
            };

            Game.findBestStatesForAllLumpTypes = function(startTime) {
                var t = (typeof startTime === 'number') ? startTime : Game.lumpT;
                var current = lumpAuraState();

                var buildingsMod = Game.BuildingsOwned % 10;
                var buildingsAdjustCost = Math.min(buildingsMod, 10 - buildingsMod);

                var best = [null, null, null, null, null];
                var bestPoints = [Infinity, Infinity, Infinity, Infinity, Infinity];

                for (var i = 0; i < Game._lumpGameStates.length; i++) {
                    var s = Game._lumpGameStates[i];
                    var type = s.predictedType;
                    if (type < 1 || type > 4) continue;
                    if (s.grandmas === 0 && s.elderWrath > 0) continue;

                    var points = Math.abs(s.grandmas - current.grandmas);
                    if (s.dragonsCurve !== current.dragonsCurve) points += 1000;
                    if (s.realityBending !== current.realityBending) points += 1000;
                    if ((s.supremeIntellect || 0) !== current.supremeIntellect) points += 1000;
                    if (s.rigidelSlot !== current.rigidel || s.rigidelActive !== current.rigidelActive) {
                        // Adding SI boosts Rigidel by one effective slot (hasGod returns Math.max(1, physIdx)
                        // instead of physIdx+1). If the rigidel "change" is purely a consequence of
                        // toggling SI, charge nothing extra beyond the SI aura cost already added above.
                        var siBoostCoversRigidel = false;
                        if (!current.supremeIntellect && (s.supremeIntellect || 0) === 1 &&
                            current.rigidel > 0 && s.rigidelActive === current.rigidelActive) {
                            // With no SI currently, current.rigidel == physicalSlotIdx+1, so physicalSlotIdx = current.rigidel-1
                            if (s.rigidelSlot === Math.max(1, current.rigidel - 1)) siBoostCoversRigidel = true;
                        }
                        if (!siBoostCoversRigidel) {
                            if (s.rigidelSlot === current.rigidel && s.rigidelActive && !current.rigidelActive && buildingsMod !== 0) {
                                points += buildingsAdjustCost;
                            } else if (s.rigidelSlot === 0 && current.rigidel > 0) {
                                points += 1;
                            } else {
                                points += 2500;
                            }
                        }
                    }

                    if (points < bestPoints[type]) {
                        bestPoints[type] = points;
                        best[type] = {
                            grandmas: s.grandmas,
                            rigidelSlot: s.rigidelSlot,
                            rigidelActive: s.rigidelActive,
                            dragonsCurve: s.dragonsCurve,
                            realityBending: s.realityBending,
                            supremeIntellect: s.supremeIntellect || 0,
                            elderWrath: s.elderWrath,
                            points: points
                        };
                    }
                }

                var makeRes = function(type) {
                    var sol = best[type];
                    if (!sol) return {found: false, possibleElderWraths: [false, false, false, false]};
                    var type1Chance = Game.Has('Sucralosia Inutilis') ? 0.15 : 0.1;
                    var res = Game.predictLumpTypesByWrathWithState(t, sol.grandmas, sol.rigidelSlot, sol.rigidelActive, sol.dragonsCurve, sol.realityBending, type1Chance, sol.supremeIntellect || 0);
                    sol.possibleElderWraths = [res[0] === type, res[1] === type, res[2] === type, res[3] === type];
                    return {found: true, solution: sol};
                };

                return {
                    bifurcated: makeRes(1),
                    golden: makeRes(2),
                    meaty: makeRes(3),
                    caramelized: makeRes(4)
                };
            };

            Game.calculateLumpPredictions = function(forceRecalculate) {
                if (!Game.Has('Sugar predictor')) return;

                if (Game._lumpPredictionInProgress) {
                    Game._lumpPredictionPending = Game._lumpPredictionPending || !!forceRecalculate;
                    return;
                }
                Game._lumpPredictionInProgress = true;

                var upgradeSig = Game.getLumpPredictorUpgradeSig ? Game.getLumpPredictorUpgradeSig() : '';
                var needsRecalc = forceRecalculate ||
                                !Game._lumpGameStates ||
                                Game._lumpGameStates.length === 0 ||
                                Game._lumpGameStates[0].predictedType === undefined ||
                                Game._lumpGameStatesLumpT !== Game.lumpT ||
                                Game._lumpGameStatesUpgradeSig !== upgradeSig;

                var finish = function() {
                    Game._lumpPredictionInProgress = false;
                    var pending = Game._lumpPredictionPending;
                    Game._lumpPredictionPending = false;
                    if (pending) setTimeout(function() { Game.calculateLumpPredictions(true); }, 0);
                };
                if (needsRecalc) {
                    Game.precomputeAllLumpTypes(function() {
                        Game._lumpPredictionCache = Game.findBestStatesForAllLumpTypes(Game._lumpGameStatesLumpT);
                        finish();
                    });
                } else {
                    Game._lumpPredictionCache = Game.findBestStatesForAllLumpTypes(Game._lumpGameStatesLumpT);
                    finish();
                }
            };

            Game.getLumpPredictions = function() {
                return Game._lumpPredictionCache;
            };

            Game.makeElderWrathIcon = function(stage, faded, current) {
                var pos = ['0px -64px', '0px -128px', '-64px -128px', '-128px -128px'][stage] || '0px -64px';
                var opacity = faded ? 'opacity:0.2;' : '';
                var border = current ? 'box-shadow:0 0 0 2px #fff inset;border-radius:2px;' : '';
                return '<div style="display:inline-block;width:24px;height:24px;vertical-align:middle;overflow:hidden;' + border + '">' +
                    '<div style="width:64px;height:64px;background-image:url(img/buildings.png);background-position:' + pos + ';' + opacity +
                    'transform:scale(0.375);transform-origin:0 0;"></div></div>';
            };

            Game.makeRigidelIcon = function(slot, active) {
                var positions = ['', '-1104px -720px', '-1128px -720px', '-1104px -744px'];
                var gemPos = slot === 0 ? '-1128px -744px' : positions[slot];
                var notActive = (slot === 0) || (active === false);
                var opacity = notActive ? 'opacity:0.25;' : '';
                return '<div style="height:48px;width:48px;position:relative;display:inline-block;vertical-align:middle;' + opacity + '">' +
                    '<div style="position:absolute;left:4px;top:0;transform:scale(0.8);transform-origin:0 0;width:48px;height:48px;">' +
                        '<div class="icon" style="background-position:-1056px -912px"></div>' +
                        '<div class="icon" style="width:24px;height:24px;position:absolute;top:34px;left:12px;background-position:' + gemPos + ';"></div>' +
                    '</div>' +
                    '</div>';
            };

            Game.evaluateLumpSolutionMet = function(cur, sol) {
                if (!cur || !sol) return null;
                var possibleWraths = (sol.possibleElderWraths && Array.isArray(sol.possibleElderWraths)) ? sol.possibleElderWraths : [false, false, false, false];
                var w = cur.wrath;
                var wrath = (typeof w !== 'number' || w !== w) ? 0 : Math.max(0, Math.min(3, w | 0));
                var grandmasMet = (sol.grandmas >= 600) ? (Math.floor(cur.grandmas) >= 600) : (Math.floor(cur.grandmas) === Math.floor(sol.grandmas));
                var wrathMet = !!possibleWraths[wrath];
                var rigidelMet = (cur.rigidel === sol.rigidelSlot) && (cur.rigidelActive === sol.rigidelActive);
                var dcMet = (cur.dragonsCurve === sol.dragonsCurve);
                var rbMet = (cur.realityBending === (sol.realityBending || 0));
                var siMet = ((cur.supremeIntellect || 0) === (sol.supremeIntellect || 0));
                return {
                    possibleWraths: possibleWraths,
                    grandmasMet: grandmasMet,
                    wrathMet: wrathMet,
                    rigidelMet: rigidelMet,
                    dcMet: dcMet,
                    rbMet: rbMet,
                    siMet: siMet,
                    allMet: (grandmasMet && wrathMet && rigidelMet && dcMet && rbMet && siMet)
                };
            };

            Game.formatLumpSolution = function(sol) {
                if (!sol) return '<span class="red">Not possible</span>';

                var curGrandmas = Game.Objects['Grandma'] ? Game.Objects['Grandma'].amount : 0;
                var curRigidel = Game.jneDetectRigidelSlot();
                var curRigidelActive = Game.jneDetectRigidelActive();
                var curDragonsCurve = Game.hasAura('Dragon\'s Curve') ? 1 : 0;
                var curRealityBending = Game.hasAura('Reality Bending') ? 1 : 0;
                var curSupremeIntellect = Game.hasAura('Supreme Intellect') ? 1 : 0;
                var curWrath = Game.jneNormalizeElderWrathForPredictor();

                var checkmark = function(met) {
                    if (!met) return '';
                    return '<div style="position:absolute;bottom:-4px;right:-6px;width:15px;height:15px;border-radius:50%;background:#5dff5d;display:flex;align-items:center;justify-content:center;z-index:10;"><span style="color:#000;font-size:12px;font-weight:bold;line-height:12px;">✓</span></div>';
                };

                var grandmaCheckmark = function(met) {
                    if (!met) return '';
                    return '<div style="position:absolute;bottom:-11px;right:-4px;width:15px;height:15px;border-radius:50%;background:#5dff5d;display:flex;align-items:center;justify-content:center;z-index:10;"><span style="color:#000;font-size:12px;font-weight:bold;line-height:12px;">✓</span></div>';
                };

                var met = Game.evaluateLumpSolutionMet({
                    grandmas: curGrandmas,
                    rigidel: curRigidel,
                    rigidelActive: curRigidelActive,
                    dragonsCurve: curDragonsCurve,
                    realityBending: curRealityBending,
                    supremeIntellect: curSupremeIntellect,
                    wrath: curWrath
                }, sol);

                var possibleWraths = (met && met.possibleWraths) ? met.possibleWraths : [false, false, false, false];
                var grandmasMet = !!(met && met.grandmasMet);
                var wrathMet = !!(met && met.wrathMet);
                var rigidelMet = !!(met && met.rigidelMet);
                var dcMet = !!(met && met.dcMet);
                var rbMet = !!(met && met.rbMet);
                var siMet = !!(met && met.siMet);

                var parts = [];

                var count = sol.grandmas >= 600 ? '600+' : sol.grandmas;
                parts.push('<div style="display:inline-block;text-align:center;vertical-align:middle;position:relative;width:48px;">' +
                    '<div style="width:48px;height:48px;background:url(img/grandma.png);background-size:48px 48px;margin:0 auto;position:relative;">' +
                        grandmaCheckmark(grandmasMet) +
                    '</div>' +
                    '<div style="font-weight:bold;font-size:11px;">' + count + '</div></div>');

                // Fade stages that can't produce the lump type, but add a border to show current stage
                var wrathGrid = '<div style="display:inline-block;width:48px;height:48px;vertical-align:middle;position:relative;">' +
                    '<div style="display:flex;">' +
                        Game.makeElderWrathIcon(0, !possibleWraths[0], curWrath === 0) +
                        Game.makeElderWrathIcon(1, !possibleWraths[1], curWrath === 1) +
                    '</div>' +
                    '<div style="display:flex;">' +
                        Game.makeElderWrathIcon(2, !possibleWraths[2], curWrath === 2) +
                        Game.makeElderWrathIcon(3, !possibleWraths[3], curWrath === 3) +
                    '</div>' +
                    checkmark(wrathMet) +
                    '</div>';
                parts.push(wrathGrid);

                // ACTIVATE (buy buildings to reach %10==0) or
                // DEACTIVATE (buy/sell a building to break %10==0).
                var needsBuildingAdjustment = !rigidelMet && sol.rigidelSlot > 0 && sol.rigidelSlot === curRigidel;
                var rigidelBadge = rigidelMet
                    ? checkmark(true)
                    : (needsBuildingAdjustment
                        ? '<div style="position:absolute;bottom:-4px;right:-6px;width:15px;height:15px;border-radius:50%;background:#ffff00;display:flex;align-items:center;justify-content:center;z-index:10;"><span style="color:#000;font-size:11px;font-weight:bold;line-height:12px;">!</span></div>'
                        : '');
                // Icon opacity: faded when solution wants Rigidel slotted but INACTIVE
                var solRigidelActiveFlag = sol.rigidelSlot > 0 ? !!sol.rigidelActive : undefined;
                parts.push('<div style="position:relative;display:inline-block;vertical-align:middle;width:48px;height:48px;">' +
                    Game.makeRigidelIcon(sol.rigidelSlot > 0 ? sol.rigidelSlot : 0, solRigidelActiveFlag) +
                    rigidelBadge + '</div>');

                var dcPos = [20 * 48, 25 * 48];
                var rbPos = [32 * 48, 25 * 48];
                var siPos = [34 * 48, 25 * 48];
                var dcOpacity = sol.dragonsCurve === 0 ? 'opacity:0.2;' : '';
                var rbOpacity = (sol.realityBending || 0) === 0 ? 'opacity:0.2;' : '';
                var siOpacity = (sol.supremeIntellect || 0) === 0 ? 'opacity:0.2;' : '';
                parts.push('<div style="position:relative;display:inline-block;vertical-align:middle;width:48px;height:48px;"><div class="icon" style="background-position:-' + dcPos[0] + 'px -' + dcPos[1] + 'px;' + dcOpacity + '"></div>' + checkmark(dcMet) + '</div>');
                parts.push('<div style="position:relative;display:inline-block;vertical-align:middle;width:48px;height:48px;"><div class="icon" style="background-position:-' + rbPos[0] + 'px -' + rbPos[1] + 'px;' + rbOpacity + '"></div>' + checkmark(rbMet) + '</div>');
                parts.push('<div style="position:relative;display:inline-block;vertical-align:middle;width:48px;height:48px;"><div class="icon" style="background-position:-' + siPos[0] + 'px -' + siPos[1] + 'px;' + siOpacity + '"></div>' + checkmark(siMet) + '</div>');

                return parts.join(' ');
            };


            if (Game.registerHook) {
                Game._lastLumpPredictionState = null;
                Game.registerHook('logic', function() {
                    if (!Game.Has('Sugar predictor')) return;

                    var state = lumpAuraState();
                    state.lumpT = Game.lumpT;
                    state.wrath = Game.jneNormalizeElderWrathForPredictor();
                    state.upgradeSig = Game.getLumpPredictorUpgradeSig ? Game.getLumpPredictorUpgradeSig() : '';

                    var last = Game._lastLumpPredictionState;
                    var lumpTChanged = !last || last.lumpT !== state.lumpT;
                    var upgradeChanged = !last || last.upgradeSig !== state.upgradeSig;
                    var otherChanged = !last ||
                        last.grandmas !== state.grandmas ||
                        last.rigidel !== state.rigidel ||
                        last.rigidelActive !== state.rigidelActive ||
                        last.dragonsCurve !== state.dragonsCurve ||
                        last.realityBending !== state.realityBending ||
                        last.supremeIntellect !== state.supremeIntellect ||
                        last.wrath !== state.wrath;

                    // Recalculate if lumpT changed OR any other state changed
                    if (!last || lumpTChanged || upgradeChanged || otherChanged) {
                        Game._lumpPredictionCache = null;
                        Game.calculateLumpPredictions();
                    }
                    Game._lastLumpPredictionState = state;
                }, 'Sugar Predictor Auto-Calculate');
            }
            setTimeout(function() {
                if (Game.Has('Sugar predictor')) {
                    Game._lastLumpPredictionState = null;
                    Game.calculateLumpPredictions(true);
                }
            }, 100);
        }

        var UNFORTUNE_BUILDING_QUIPS = [
            'Idle hands are the devil\'s playthings.',
            'Your grandma is looking for you...',
            'What you sow, you reap.',
            'Dig deep enough and something digs back.',
            'The wheels of the machines turn in the night producing something horrid.',
            'Grandma always pays her debts.',
            'There are no gods down here in the dark.',
            'Witchcraft and sorcery won\'t help you anymore.',
            'What\'s in the box!?',
            'The ancient dark sciences awaken.',
            'Not every door should be opened. Not every door asks.',
            'The regrets of the past will come rushing back when you least expect them.',
            'The crushing pressure of the entire universe weighs deeply on you.',
            'Every light casts a shadow and the shadows are growing.',
            'The odds were never in your favor.',
            'Look closer, no my dear closer still.',
            'Technology gives evil reach across the vastness of cyberspace.',
            'An idle universe grows teeth and other much worse things.',
            'Think too hard and the thoughts start thinking back.',
            'There are plenty of you to go around but they all want to be the only one.'
        ];
        var UNFORTUNE_PERKS = [
            ['wrath cookies appear <b>6.66%</b> more often.', 'Wrath is primal, wrath is ancient, embrace it and all that comes with it.'],
            ['your clicks are <b>6.66%</b> more powerful.', 'Work will set you free.'],
            ['gain <b>+1% CpS</b> for each vanilla shadow achievement you own.', 'The shadows pay a modest dividend to those who keep them company.'],
            ['reindeer, lanterns, and turkeys appear <b>6.66%</b> more often.', 'The herd moves faster when something is chasing it.'],
            ['plants mutate <b>3%</b> more often and cost <b>3%</b> less.', 'Something is wrong with the soil, something unspeakable lives down there.']
        ];
        var unfortunates = [];
        function unfortName(n) { return 'Unfortunate #' + ('00' + n).slice(-3); }
        function createUnfortunates() {
            var tier = 1e48;
            unfortunates = UNFORTUNE_BUILDING_QUIPS.map(function(q, i) { return [i + 1, q, Game.ObjectsById[i]]; })
                .concat(UNFORTUNE_PERKS.map(function(p, i) { return [661 + i, p[1], null, p[0]]; }))
                .map(function(d, i) {
                    var name = unfortName(d[0]), up = Game.Upgrades[name], b = d[2];
                    if (!up) {
                        var desc = 'During the Grandmapocalypse, ' + (b ? 'your ' + b.plural + ' are <b>15%</b> more efficient.' : d[3]) + '<q>' + d[1] + '</q>';
                        up = new Game.Upgrade(name, desc, tier * (b ? b.basePrice : 1e8), JNE.icon(i, 28, 'custom'));
                        up.ddesc = desc;
                        up._heavenlyUpgrade = true;
                    }
                    up._quip = d[1];
                    up.order = 19100.651 + i * 0.001;
                    return up;
                });
        }

        // Only a natural ticker rollover has TickerAge <= 0, so clicking the news can't force one. AddToLog runs right after the line is picked.
        function setupUnfortunateCookies() {
            if (Game._jneUnfortunateHooked) return;
            Game._jneUnfortunateHooked = true;
            var natural, picked;
            addCss('.unfortunate{color:#d84848;cursor:pointer}.unfortunate:hover{color:#e85a5a;text-shadow:0px 0px 4px #d84848 !important}');

            Game.registerHook('ticker', function() { picked = 0; natural = Game.TickerAge <= 0 && Game.T > Game.fps * 10; }, 'Unfortunate cookies');
            hookOnce(Game, 'AddToLog', '_jneUnfortunate', function(orig) { return function(what) {
                if (natural && what === Game.Ticker) {
                    natural = 0;
                    var left = unfortunates.filter(function(u) { return !u.unlocked && !u.bought; });
                    if (left.length && gpocHas('Unfortunate cookies') && Game.windowW >= Game.tickerTooNarrow && Math.random() < 0.02) {
                        var ic = Game.Upgrades['Unfortunate cookies'].icon;
                        picked = choose(left);
                        what = Game.Ticker = '<span class="unfortunate"><div class="icon" style="vertical-align:middle;display:inline-block;background-image:url(' + ic[2] + ');background-position:' + (-ic[0] * 48) + 'px ' + (-ic[1] * 48) + 'px;transform:scale(0.5);margin:-16px;position:relative;left:-4px;top:-2px;"></div>' + picked.name.slice(picked.name.indexOf('#')) + ' : ' + picked._quip + '</span>';
                        Game.TickerEffect = 0;
                        if (Game.Has('Fortune tolls for you') && Game.playFortuneChime) Game.playFortuneChime();
                    }
                }
                return orig.call(this, what);
            }; });
            AddEvent(Game.tickerL, 'click', function(e) {
                if (!picked || !e.target.closest('.unfortunate')) return;
                PlaySound('snd/fortune.mp3', 1);
                Game.SparkleAt(Game.mouseX, Game.mouseY);
                Game.Notify(picked.dname, "You've unlocked a new upgrade.", picked.icon);
                picked.unlock();
                picked = 0;
            });

            hookOnce(Game, 'GetTieredCpsMult', '_jneUnfortunateCps', function(orig) { return function(me) {
                var mult = orig.apply(this, arguments);
                return me && gpocHas(unfortName(me.id + 1)) ? mult * 1.15 : mult;
            }; });
            Game.registerHook('cookiesPerClick', function(c) { return gpocHas('Unfortunate #662') ? c * 1.0666 : c; }, 'Unfortunate clicks');
        }

        function setupFortuneTolls() {
            if (Game._fortuneTollsHooked) return;
            if (Game._fortuneTollsInterval) {
                clearInterval(Game._fortuneTollsInterval);
                Game._fortuneTollsInterval = 0;
            }

            if (Game.registerHook && !Game._fortuneTollsTickerFinalHooked) {
                Game.registerHook('tickerFinal', function(ticker) {
                    if (Game.Has('Fortune tolls for you') && Game.TickerEffect && Game.TickerEffect.type === 'fortune') {
                        var currentTickerEffect = Game.TickerEffect;
                        var effectKey = null;
                        var sub = currentTickerEffect.sub;
                        if (sub === undefined || sub === null) {
                            effectKey = 'fortune';
                        } else if (typeof sub === 'string' || typeof sub === 'number') {
                            effectKey = String(sub);
                        } else if (typeof sub === 'object') {
                            if (sub.name) effectKey = String(sub.name);
                            else if (sub.id !== undefined) effectKey = String(sub.id);
                            else {
                                try { effectKey = JSON.stringify(sub); } catch (e) { effectKey = 'fortune'; }
                            }
                        } else {
                            effectKey = 'fortune';
                        }
                        if (effectKey && effectKey !== Game._fortuneTollsLastTickerEffectKey) {
                            if (Game.playFortuneChime) {
                                try { Game.playFortuneChime(); } catch (e) {}
                            } else if (typeof PlaySound === 'function') {
                                try { PlaySound('snd/click3.mp3'); } catch (e) {}
                            }
                            Game._fortuneTollsLastTickerEffectKey = effectKey;
                        }
                    } else {
                        Game._fortuneTollsLastTickerEffectKey = null;
                    }

                    return ticker;
                }, 'Fortune tolls chime');
                Game._fortuneTollsTickerFinalHooked = true;
            }
            Game._fortuneTollsHooked = true;
        }

        function setupFortuneSoundSelector() {
            if (!Game.Has('Fortune tolls for you')) return;
            var selector = Game.Upgrades['Golden cookie sound selector'];
            if (!selector || selector._fortuneSoundAdded) return;

            selector._fortuneSoundAdded = true;

            selector.dname = 'Cookie sound selector';
            selector.descFunc = function() {
                var gcChoices = [
                    {name: loc('No sound')},
                    {name: loc('Chime')},
                    {name: loc('Fortune')},
                    {name: loc('Cymbal')},
                    {name: loc('Squeak')}
                ];
                var fortuneIndex = (Game.fortuneChimeType !== undefined) ? Game.fortuneChimeType : 0;
                return '<div style="text-align:center;">Golden cookie: <b>' + gcChoices[Game.chimeType].name + '</b><br>Fortune cookie: <b>' + gcChoices[fortuneIndex].name + '</b></div><div class="line"></div>' + this.ddesc;
            };

            // CCSE compatibility: sync CCSE.config.chimeType with Game.chimeType on load
            if (typeof CCSE !== 'undefined' && CCSE.config) {
                var chimeNames = ['No sound', 'Chime', 'Fortune', 'Cymbal', 'Squeak'];
                CCSE.config.chimeType = chimeNames[Game.chimeType] || 'No sound';
            }

            Game.playFortuneChime = function() {
                if (Game.fortuneChimeType === undefined) {
                    // no selection yet play golden cookie sound
                    if (Game.playGoldenCookieChime) Game.playGoldenCookieChime();
                }
                else if (Game.fortuneChimeType == 0) {
                    // No sound selected
                }
                else if (Game.fortuneChimeType == 1) PlaySound('snd/chime.mp3');
                else if (Game.fortuneChimeType == 2) PlaySound('snd/fortune.mp3');
                else if (Game.fortuneChimeType == 3) PlaySound('snd/cymbalRev.mp3');
                else if (Game.fortuneChimeType == 4) {
                    Game.wrinklerSquishSound++;
                    if (Game.wrinklerSquishSound > 4) Game.wrinklerSquishSound -= 4;
                    PlaySound('snd/squeak' + Game.wrinklerSquishSound + '.mp3');
                }
            };

            selector.choicesFunction = function() {
                var str = '';

                var gcChoices = [
                    {name: loc('No sound'), icon: [0, 7], id: 0},
                    {name: loc('Chime'), icon: [22, 6], id: 1},
                    {name: loc('Fortune'), icon: [27, 6], id: 2},
                    {name: loc('Cymbal'), icon: [9, 10], id: 3},
                    {name: loc('Squeak'), icon: [8, 10], id: 4}
                ];

                str += '<div style="text-align:center;font-weight:bold;margin:8px 0px 4px 0px;">Golden cookie: ' + gcChoices[Game.chimeType].name + '</div>';

                for (var i = 0; i < gcChoices.length; i++) {
                    var choice = gcChoices[i];
                    var selected = (Game.chimeType === choice.id);
                    str += '<div class="crate noFrame enabled' + (selected ? ' highlighted' : '') + '" style="opacity:1;float:none;display:inline-block;background-position:' + (-choice.icon[0] * 48) + 'px ' + (-choice.icon[1] * 48) + 'px;" ' + Game.clickStr + '="Game.UpgradesById[' + this.id + '].choicesPick(' + choice.id + ');Game.choiceSelectorOn=-1;Game.UpgradesById[' + this.id + '].buy();"></div>';
                }

                str += '<div class="line"></div>';
                var fortuneIndex = (Game.fortuneChimeType !== undefined) ? Game.fortuneChimeType : 0;
                str += '<div style="text-align:center;font-weight:bold;margin:8px 0px 4px 0px;">Fortune cookie: ' + gcChoices[fortuneIndex].name + '</div>';

                // Fortune cookie sound options
                var fortuneChoices = [
                    {name: loc('No sound'), icon: [0, 7], id: 100},
                    {name: loc('Chime'), icon: [22, 6], id: 101},
                    {name: loc('Fortune'), icon: [27, 6], id: 102},
                    {name: loc('Cymbal'), icon: [9, 10], id: 103},
                    {name: loc('Squeak'), icon: [8, 10], id: 104}
                ];

                for (var i = 0; i < fortuneChoices.length; i++) {
                    var choice = fortuneChoices[i];
                    var selected = (Game.fortuneChimeType === (choice.id - 100));
                    str += '<div class="crate noFrame enabled' + (selected ? ' highlighted' : '') + '" style="opacity:1;float:none;display:inline-block;background-position:' + (-choice.icon[0] * 48) + 'px ' + (-choice.icon[1] * 48) + 'px;" ' + Game.clickStr + '="Game.UpgradesById[' + this.id + '].choicesPick(' + choice.id + ');Game.choiceSelectorOn=-1;Game.UpgradesById[' + this.id + '].buy();"></div>';
                }

                return str;
            };

            // override choicesPick for both rows
            selector.choicesPick = function(id) {
                if (id >= 100) {
                    var actualId = id - 100;
                    Game.fortuneChimeType = actualId;
                    Game.playFortuneChime();
                } else {
                    Game.chimeType = id;
                    // CCSE compatibility: also update CCSE.config.chimeType
                    if (typeof CCSE !== 'undefined' && CCSE.config) {
                        var chimeNames = ['No sound', 'Chime', 'Fortune', 'Cymbal', 'Squeak'];
                        CCSE.config.chimeType = chimeNames[id] || 'No sound';
                    }
                    Game.playGoldenCookieChime();
                }
            };
        }

        function setupRetripledLuck() {
            // Match vanilla placement: doubling only in Game.updateShimmers for timer spawns (not spells, storm, FTHOF, etc.).
            // Unlike vanilla, we skip doubling timer goldens while Game.shimmerTypes.golden.chain > 0 (cookie chain fix).
            if (!Game.updateShimmers || Game.updateShimmers._jneRetripledUpdateShimmersHooked) return;

            if (Game.shimmer && !Game.shimmer._retripledLuckHooked && !Game._jneVanillaShimmerBeforeRetripled) {
                Game._jneVanillaShimmerBeforeRetripled = Game.shimmer;
            }
            if (Game.shimmer && Game.shimmer._retripledLuckHooked && Game._jneVanillaShimmerBeforeRetripled) {
                Game.shimmer = Game._jneVanillaShimmerBeforeRetripled;
                Game.shimmer._retripledLuckHooked = false;
            }

            var vanillaUpdateShimmers = Game.updateShimmers;

            Game.updateShimmers = function() {
                for (var si in Game.shimmers) {
                    Game.shimmers[si].update();
                }

                if (Game.hasBuff('Cookie storm') && Math.random() < 0.5) {
                    var stormShimmer = new Game.shimmer('golden', {type: 'cookie storm drop'}, 1);
                    stormShimmer.dur = Math.ceil(Math.random() * 4 + 1);
                    stormShimmer.life = Math.ceil(Game.fps * stormShimmer.dur);
                    stormShimmer.sizeMult = Math.random() * 0.75 + 0.25;
                }

                for (var ti in Game.shimmerTypes) {
                    var me = Game.shimmerTypes[ti];
                    if (me.spawnsOnTimer && me.spawnConditions()) {
                        if (!me.spawned) {
                            me.time++;
                            if (Math.random() < Math.pow(Math.max(0, (me.time - me.minTime) / (me.maxTime - me.minTime)), 5)) {
                                var newShimmer = new Game.shimmer(ti);
                                newShimmer.spawnLead = 1;
                                if (Game.JNE && Game.JNE.maybeDoubleTimerSpawn) Game.JNE.maybeDoubleTimerSpawn(ti);
                                me.spawned = 1;
                            }
                        }
                    }
                }
            };
            Game.updateShimmers._jneRetripledUpdateShimmersHooked = true;
            Game.updateShimmers._jneWrappedVanillaUpdateShimmers = vanillaUpdateShimmers;
        }

        function formatStopwatchTime(seconds) {
            if (seconds < 0) seconds = 0;
            seconds = Math.floor(seconds);
            var d = Math.floor(seconds / 86400);
            var h = Math.floor((seconds % 86400) / 3600);
            var m = Math.floor((seconds % 3600) / 60);
            var s = seconds % 60;
            var parts = [];
            if (d > 0) parts.push(d + 'd');
            if (d > 0 || h > 0) parts.push(h + 'h');
            if (d > 0 || h > 0 || m > 0) parts.push(m + 'm');
            parts.push(s + 's');
            return parts.join(' ');
        }

        var STOPWATCH_IMG_URL = 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/stopwatch.png';
        function getStopwatchImg() {
            if (!Game._jneStopwatchImg) {
                var im = new Image();
                im.crossOrigin = 'anonymous';
                im.src = STOPWATCH_IMG_URL;
                Game._jneStopwatchImg = im;
            }
            return Game._jneStopwatchImg;
        }

        // One stopwatch bar row (shimmer or buff); returns the refs the draw hook updates
        function timerRow(parent, o) {
            var row = document.createElement('div');
            row.style.cssText = o.rowCss;
            var label = document.createElement('span');
            label.style.cssText = o.labelCss;
            label.textContent = o.label;
            row.appendChild(label);
            var minBar = null;
            if (o.minBar) {
                minBar = document.createElement('span');
                minBar.style.cssText = 'display:inline-block;height:10px;background:#292828;';
                if (o.minBar === 'round') minBar.style.borderTopRightRadius = minBar.style.borderBottomRightRadius = '10px';
                row.appendChild(minBar);
            }
            var bar = document.createElement('span');
            bar.style.cssText = 'display:inline-block;height:10px;background:' + o.color + ';border-top-right-radius:10px;border-bottom-right-radius:10px;';
            row.appendChild(bar);
            var time = document.createElement('span');
            time.style.cssText = o.timeCss;
            row.appendChild(time);
            parent.appendChild(row);
            return { minBar: minBar, bar: bar, time: time };
        }

        function setupGoldenStopwatch() {
            if (!Game.registerHook || Game._goldenStopwatchHooked) return;
            if (!Game.Has('Golden stopwatch')) return;
            if (!Game.LeftBackground || typeof l !== 'function' || !l('backgroundLeftCanvas')) return;
            if (Game.UpdateSpecial && Game.UpdateSpecial._goldenStopwatchHooked) { Game._goldenStopwatchHooked = true; return; }
            Game._goldenStopwatchHooked = true;
            var colors = {golden: '#FFD700', reindeer: '#8f0101', fish: '#0096C7', Frenzy: '#00e35b', 'Dragon Harvest': '#d1690f', 'Elder frenzy': '#ffae00', Clot: '#ff0000', 'Click frenzy': '#4bf0d5', Dragonflight: '#005eff', 'Cursed finger': '#b81634', 'Sugar blessing': '#fbff00', default: '#e600ff'};
            var swState = { shimmerRows: {}, buffRows: {}, shimmerSig: '', buffSig: '' };

            Game.UpdateSpecial = function() {
                Game.specialTabs = [];
                if (Game.Has('A festive hat')) Game.specialTabs.push('santa');
                if (Game.Has('A crumbly egg')) Game.specialTabs.push('dragon');
                // Skip stopwatch tab in Born Again mode
                if (Game.ascensionMode != 1) Game.specialTabs.push('stopwatch');
                if (Game.specialTabs.length === 0) { Game.ToggleSpecialMenu(0); return; }
                if (Game.LeftBackground) {
                    Game.specialTabHovered = '';
                    var len = Game.specialTabs.length, y = Game.LeftBackground.canvas.height - 24 - 48 * len;
                    for (var i = 0; i < Game.specialTabs.length; i++) {
                        var sel = (Game.specialTab === Game.specialTabs[i]) ? 1 : 0, x = sel ? 48 : 24, s = sel ? 2 : 1;
                        if (Math.abs(Game.mouseX - x) <= 24 * s && Math.abs(Game.mouseY - y) <= 24 * s) {
                            Game.specialTabHovered = Game.specialTabs[i];
                            Game.mousePointer = 1;
                            Game.CanClick = 0;
                            if (Game.Click && Game.lastClickedEl === l('backgroundLeftCanvas')) {
                                PlaySound('snd/press.mp3');
                                Game.specialTab === Game.specialTabs[i] ? Game.ToggleSpecialMenu(0) : (Game.specialTab = Game.specialTabs[i], Game.ToggleSpecialMenu(1));
                            }
                        }
                        y += 48;
                    }
                }
            };
            Game.UpdateSpecial._goldenStopwatchHooked = true;

            Game.DrawSpecial = function() {
                var len = Game.specialTabs.length;
                if (len === 0 || !Game.LeftBackground) return;
                Game.LeftBackground.globalAlpha = 1;
                var y = Game.LeftBackground.canvas.height - 24 - 48 * len, tabI = 0;
                for (var i in Game.specialTabs) {
                    var tab = Game.specialTabs[i], sel = (Game.specialTab === tab) ? 1 : 0, hov = (Game.specialTabHovered === tab) ? 1 : 0, x = sel ? 48 : 24;
                    if (hov || sel) {
                        var ss = 64, r = Math.floor((Game.T * 0.5) % 360);
                        Game.LeftBackground.save();
                        Game.LeftBackground.translate(x, y);
                        if (Game.prefs.fancy) Game.LeftBackground.rotate((r / 360) * Math.PI * 2);
                        Game.LeftBackground.globalAlpha = 0.75;
                        Game.LeftBackground.drawImage(Pic('shine.png'), -ss / 2, -ss / 2, ss, ss);
                        Game.LeftBackground.restore();
                    }
                    var pic, sx, sy, srcW = 96, srcH = 96;
                    if (tab === 'santa') { pic = Pic('santa.png?v=' + Game.version); sx = 96 * Game.santaLevel; sy = 0; }
                    else if (tab === 'dragon') { pic = Pic('dragon.png?v=' + Game.version); sx = 96 * Game.dragonLevels[Game.dragonLevel].pic; sy = 0; }
                    else if (tab === 'stopwatch') {
                        if (Game.Upgrades['Golden stopwatch']) { pic = getStopwatchImg(); sx = 0; sy = 0; srcW = srcH = 64; }
                    }
                    if (pic) {
                        if (Game.prefs.fancy) {
                            Game.LeftBackground.drawImage(pic, sx, sy, srcW, srcH, x + (sel ? 0 : Math.sin(Game.T * 0.2 + tabI) * 3) - 24, y - (sel ? 6 : Math.abs(Math.cos(Game.T * 0.2 + tabI) * 6)) - 24, 48, 48);
                        } else {
                            Game.LeftBackground.drawImage(pic, sx, sy, srcW, srcH, x - 24, y - 24, 48, 48);
                        }
                    }
                    tabI++; y += 48;
                }
            };
            Game.DrawSpecial._goldenStopwatchHooked = true;

            hookOnce(Game, 'ToggleSpecialMenu', '_jneSpecialMenu', function(orig) { return function(on) {
                // Skip stopwatch menu in Born Again mode
                if (on && Game.specialTab === 'stopwatch' && Game.ascensionMode == 1) {
                    return orig.apply(this, arguments);
                }
                if (on && Game.specialTab === 'stopwatch') {
                    swState.shimmerSig = ''; swState.buffSig = '';
                    l('specialPopup').innerHTML = '<div id="specialPic" style="position:absolute;left:-16px;top:-64px;width:96px;height:96px;background-repeat:no-repeat;filter:drop-shadow(0px 3px 2px #000);-webkit-filter:drop-shadow(0px 3px 2px #000);background-size:96px 96px;"></div><div class="close" onclick="PlaySound(\'snd/press.mp3\');Game.ToggleSpecialMenu(0);">x</div><h3>Golden Stopwatch</h3><div class="line"></div><div id="TimerBar" style="text-align:left;margin-bottom:4px;"><div id="TimerBarShimmers"></div><div id="TimerBarBuffs"></div></div>';
                    if (l('specialPic')) l('specialPic').style.backgroundImage = 'url(' + STOPWATCH_IMG_URL + ')';
                    l('specialPopup').className = 'framed prompt onScreen';
                    return;
                }
                return orig.apply(this, arguments);
            }; });
            if (Game.ToggleSpecialMenu) Game.ToggleSpecialMenu._goldenStopwatchHooked = true;

            Game.registerHook('draw', function() {
                if (Game.ascensionMode == 1) return;
                if (Game.specialTab !== 'stopwatch') return;
                var tb = l('TimerBar');
                if (!tb) return;
                var tbw = tb.getBoundingClientRect().width;
                var w = tbw - 185, bw = Math.max(0, tbw - 230);
                var sig = '', visible = [];
                for (var k in Game.shimmerTypes) {
                    var st = Game.shimmerTypes[k];
                    if (!st || !st.spawnConditions || !st.spawnConditions() || st.spawned === 1 || !st.spawnsOnTimer) continue;
                    sig += k + ';';
                    visible.push(k);
                }
                if (sig !== swState.shimmerSig) {
                    var sc = l('TimerBarShimmers');
                    if (sc) {
                        sc.innerHTML = '';
                        swState.shimmerRows = {};
                        swState.shimmerSig = sig;
                        for (var i = 0; i < visible.length; i++) {
                            var k = visible[i], st = Game.shimmerTypes[k];
                            swState.shimmerRows[k] = timerRow(sc, { rowCss: 'height:12px;margin:0 10px;position:relative;', labelCss: 'display:inline-block;text-align:right;width:117px;margin-right:5px;', label: 'Next ' + k, color: (colors[k] || colors.default), timeCss: 'margin-left:5px;', minBar: st.minTime === st.maxTime ? 'round' : true });
                        }
                    }
                }
                for (var i = 0; i < visible.length; i++) {
                    var k = visible[i], st = Game.shimmerTypes[k], refs = swState.shimmerRows[k];
                    if (!refs) continue;
                    refs.minBar.style.width = Math.round(Math.max(0, st.minTime - st.time) * w / st.maxTime) + 'px';
                    refs.bar.style.width = Math.round(Math.min(st.maxTime - st.minTime, st.maxTime - st.time) * w / st.maxTime) + 'px';
                    var timeUntilMin = Math.max(0, st.minTime - st.time);
                    if (timeUntilMin > 0) {
                        refs.time.textContent = Math.ceil(timeUntilMin / Game.fps);
                    } else {
                        var spawnProbability = 0, spawnWindowDuration = st.maxTime - st.minTime;
                        if (spawnWindowDuration > 0) {
                            var ticksPerSecond = Game.fps || 30, survival = 1;
                            for (var j = 1; j <= ticksPerSecond; j++) {
                                var progress = (st.time + j - st.minTime) / spawnWindowDuration;
                                survival *= (1 - Math.min(1, Math.pow(Math.max(0, progress), 5)));
                            }
                            spawnProbability = 1 - survival;
                        }
                        refs.time.textContent = (Math.ceil(spawnProbability * 1000) / 10).toFixed(1) + '%/sec';
                    }
                }
                if (Game.Has('Countdown complications')) {
                    var bsig = '', buffKeys = [];
                    for (var i in Game.buffs) { bsig += i + ';'; buffKeys.push(i); }
                    if (bsig !== swState.buffSig) {
                        var bc = l('TimerBarBuffs');
                        if (bc) {
                            bc.innerHTML = '';
                            swState.buffRows = {};
                            swState.buffSig = bsig;
                            if (buffKeys.length > 0) {
                                var divider = document.createElement('div');
                                divider.style.cssText = 'height:1px;margin:8px 10px;background:#444;';
                                bc.appendChild(divider);
                            }
                            for (var i = 0; i < buffKeys.length; i++) {
                                var key = buffKeys[i], bf = Game.buffs[key];
                                swState.buffRows[key] = timerRow(bc, { rowCss: 'height:14px;margin:0 10px;position:relative;white-space:nowrap;', labelCss: 'display:inline-block;text-align:right;width:117px;margin-right:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:top;line-height:14px;', label: bf.name, color: (colors[bf.name] || colors.default), timeCss: 'margin-left:5px;white-space:nowrap;' });
                            }
                        }
                    }
                    for (var i = 0; i < buffKeys.length; i++) {
                        var key = buffKeys[i], bf = Game.buffs[key], refs = swState.buffRows[key];
                        if (!refs) continue;
                        refs.bar.style.width = Math.round(bf.time * bw / bf.maxTime) + 'px';
                        refs.time.textContent = formatStopwatchTime(bf.time / Game.fps);
                    }
                } else if (swState.buffSig !== '') {
                    var bc = l('TimerBarBuffs');
                    if (bc) bc.innerHTML = '';
                    swState.buffRows = {}; swState.buffSig = '';
                }
            });
        }
        function createToyBoxToggle() {
            var upgrade = Game.Upgrades['Toy box'];
            if (!upgrade || !Game.Has('Toy box')) {
                return;
            }

            // Delete existing toggles if they exist (for save loads)
            if (Game.Upgrades['Toy mode [on]']) {
                delete Game.Upgrades['Toy mode [on]'];
            }
            if (Game.Upgrades['Toy mode [off]']) {
                delete Game.Upgrades['Toy mode [off]'];
            }

            var desc = 'Toggles toy mode on and off, adding playful cookie toys to the game.<br><br>Note: There is a bug where toys can interfer with the ability to pop wrinklers, this is a vanilla game bug and has nothing to do with the mod. You can reload after disabling toy mode to fix the issue if encountered.<q>Don\'t forget to toss them around!</q>';
            var toys = Game.TOYS || 0;
            var icon = upgrade.icon || [34, 9];

            new Game.Upgrade('Toy mode [on]', desc, 0, icon);
            var toggleOn = Game.last;
            toggleOn.pool = 'toggle';
            toggleOn.toggleInto = 'Toy mode [off]';
            toggleOn.order = 51000;
            toggleOn.unlocked = 1;
            //If toys are OFF (0), show [on] as bought
            toggleOn.bought = toys === 0 ? 1 : 0;
            toggleOn.desc = toggleOn.ddesc = desc;
            var buyOn = toggleOn.buy;
            toggleOn.buy = function() {
                if (buyOn.call(this)) {
                    Game.TOYS = Game.TOYS ? 0 : 1;
                }
            };

            new Game.Upgrade('Toy mode [off]', desc, 0, icon);
            var toggleOff = Game.last;
            toggleOff.pool = 'toggle';
            toggleOff.toggleInto = 'Toy mode [on]';
            toggleOff.order = 51000;
            toggleOff.unlocked = 1;
            toggleOff.bought = toys === 1 ? 1 : 0;
            toggleOff.desc = toggleOff.ddesc = desc;
            var buyOff = toggleOff.buy;
            toggleOff.buy = function() {
                if (buyOff.call(this)) {
                    Game.TOYS = Game.TOYS ? 0 : 1;
                }
            };

            Game.storeToRefresh = 1;
            Game.upgradesToRebuild = 1;
        }

        function createPinkStuffToggle() {
            var upgrade = Game.Upgrades['Pink stuff'];
            if (!upgrade || !Game.Has('Pink stuff')) {
                return;
            }

            // Delete existing toggles if they exist (for save loads)
            if (Game.Upgrades['Pink stuff [on]']) {
                delete Game.Upgrades['Pink stuff [on]'];
            }
            if (Game.Upgrades['Pink stuff [off]']) {
                delete Game.Upgrades['Pink stuff [off]'];
            }

            var desc = 'Toggles pink mode on and off, adding playful winklers to the game.<q>O M G SO CUTEEEEEEE!!!</q>';
            var winklers = Game.WINKLERS || 0;
            var icon = upgrade.icon || JNE.icon(22, 20, 'custom');

            new Game.Upgrade('Pink stuff [on]', desc, 0, icon);
            var toggleOn = Game.last;
            toggleOn.pool = 'toggle';
            toggleOn.toggleInto = 'Pink stuff [off]';
            toggleOn.order = 51001;
            toggleOn.unlocked = 1;
            toggleOn.bought = winklers === 0 ? 1 : 0;
            toggleOn.desc = toggleOn.ddesc = desc;
            var buyOn = toggleOn.buy;
            toggleOn.buy = function() {
                if (buyOn.call(this)) {
                    Game.WINKLERS = Game.WINKLERS ? 0 : 1;
                }
            };

            new Game.Upgrade('Pink stuff [off]', desc, 0, icon);
            var toggleOff = Game.last;
            toggleOff.pool = 'toggle';
            toggleOff.toggleInto = 'Pink stuff [on]';
            toggleOff.order = 51001;
            toggleOff.unlocked = 1;
            toggleOff.bought = winklers === 1 ? 1 : 0;
            toggleOff.desc = toggleOff.ddesc = desc;
            var buyOff = toggleOff.buy;
            toggleOff.buy = function() {
                if (buyOff.call(this)) {
                    Game.WINKLERS = Game.WINKLERS ? 0 : 1;
                }
            };

            Game.storeToRefresh = 1;
            Game.upgradesToRebuild = 1;
        }

        function setupBigCookieImageSelector() {
            if (Game.Upgrades['Cookie image selector']) return;

            // load() will restore from save data
            if (Game.cookieImageType === undefined) Game.cookieImageType = 0;
            if (!Game.CookiesByChoice) Game.CookiesByChoice = {0: {name: 'Perfect cookie', icon: [5, 3], pic: 'perfectCookie.png'}, 1: {name: 'Imperfect cookie', icon: [9, 3], pic: 'imperfectCookie.png'}, 2: {name: 'Snickerdoodle', icon: [29, 10], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/snickerdoodle.png'}, 3: {name: 'Chocolate Cookie', icon: [10, 3], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/chocolate.png'}, 4: {name: 'Oatmeal Raisin Cookie', icon: [6, 3], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/oatmeal.png'}, 5: {name: 'Thumbprint Cookie', icon: [25, 32], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/sugarjam.png'}, 6: {name: 'Oreo Cookie', icon: [16, 3], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/oreo.png'}, 7: {name: 'Heart Cookie', icon: [20, 3], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/heartcookie.png'}, 8: {name: 'Pixel Cookie', icon: [20, 33], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/pixel.png'}, 9: {name: 'Eaten Cookie', icon: [22, 16], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/eaten.png'}, 10: {name: 'Gingerbread Cookie', icon: [18, 4], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/gingerbread.png'}, 11: {name: 'Smiley Cookie', icon: [24, 18], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/smiley.png'}, 12: {name: 'Jam Cookie', icon: [26, 33], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/jamcookie.png'}, 13: {name: 'Red Velvet Cookie', icon: [15, 5], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/velvet.png'}, 14: {name: 'Sugar Cookie', icon: [2, 4], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/sugar.png'}, 15: {name: 'Macaron', icon: [22, 3], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/macaron.png'}, 16: {name: 'Sprinkle Cookie', icon: [21, 14], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/sprinkle.png'}, 17: {name: 'Winter Biscuit', icon: [13, 10], pic: 'https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/CookieImg/snow.png'}, 18: {name: 'The Actual Cookie', icon: [10, 0], pic: 'https://raw.githubusercontent.com/dfsw/Cookies/main/assets/CookieImg/theactualcookie.png'}, 19: {name: 'Heart Eyes Cookie', icon: [30, 12], pic: 'https://raw.githubusercontent.com/dfsw/Cookies/main/assets/CookieImg/hearteyes.png'}, 20: {name: 'Laughing Cookie', icon: [28, 34], pic: 'https://raw.githubusercontent.com/dfsw/Cookies/main/assets/CookieImg/laughing.png'}, 21: {name: 'Sun Cookie', icon: JNE.icon(14, 12, 'custom'), pic: 'https://raw.githubusercontent.com/dfsw/Cookies/main/assets/CookieImg/sun.png'}, 22: {name: 'Moon Cookie', icon: JNE.icon(9, 12, 'custom'), pic: 'https://raw.githubusercontent.com/dfsw/Cookies/main/assets/CookieImg/moon.png'}};
            new Game.Upgrade('Cookie image selector', 'Lets you pick which cookie image to display.', 0, [5, 3]);
            Game.last.pool = 'toggle';
            Game.last.order = 51002;
            Game.last.ddesc = 'Lets you pick which cookie image to display.';
            Game.last.descFunc = function() { var choice = this.choicesFunction()[Game.cookieImageType] || this.choicesFunction()[0]; return '<div style="text-align:center;">'+loc("Current:")+' '+tinyIcon(choice.icon)+' <b>'+choice.name+'</b></div><div class="line"></div>'+this.ddesc; };
            Game.last.choicesFunction = function() { var choices = []; for (var i in Game.CookiesByChoice) { if (i >= 18 && !Game.Has('Even more cookies of unusual size')) continue; choices[i] = {name: Game.CookiesByChoice[i].name, icon: Game.CookiesByChoice[i].icon, order: parseInt(i)}; } if (choices[Game.cookieImageType]) choices[Game.cookieImageType].selected = 1; return choices; };
            Game.last.choicesPick = function(id) { Game.cookieImageType = id; if (Game.Loader && Game.Loader.Replace) { if (id !== 0 && Game.CookiesByChoice[id]) { Game.Loader.Replace('perfectCookie.png', Game.CookiesByChoice[id].pic); } else { Game.Loader.Replace('perfectCookie.png', 'perfectCookie.png'); } } };
            if (Game.Has('Big cookie image selector')) Game.Unlock('Cookie image selector');
        }

        function unlockBigCookieImageSelector() {
            if (Game.Has('Big cookie image selector') && Game.Upgrades['Cookie image selector']) { Game.Unlock('Cookie image selector'); Game.storeToRefresh = 1; }
        }

        function getBoxes() {
            return [
                { box: 'Box of overpriced donuts', items: [
                    {name: 'Maple frosted donut', order: 10500.032, desc: 'Popular both inside of Canada and outside, a delicious treat covered in sweet maple syrup flavored frosting, taste more like autumn than pumpkin spice.', icon: JNE.icon(6, 25, 'custom')},
                    {name: 'Boston creme donut', order: 10500.033, desc: 'A donut filled with vanilla custard and topped with chocolate glaze. Named after the city, not the cream.', icon: JNE.icon(5, 25, 'custom')},
                    {name: 'Strawberry jelly donut', order: 10500.034, desc: 'A donut filled with sweet strawberry jelly. Watch out for dripping jelly on your pants!', icon: [27, 28]},
                    {name: 'Chocolate frosted donut', order: 10500.035, desc: 'A donut topped with rich chocolate frosting. Simple, yet satisfying.', icon: JNE.icon(4, 25, 'custom')},
                    {name: 'Donut holes', order: 10500.036, desc: 'The holes from donuts fried and served warm, donuts aren\'t actually made by punching a hole out, but these are so delicious you won\'t actually care.', icon: [30, 3]},
                    {name: 'Chocolate filled donut', order: 10500.037, desc: 'A donut filled with rich chocolate cream. Double the chocolate, double the fun.', icon: JNE.icon(10, 25, 'custom')},
                    {name: 'Powdered sugar jelly donut', order: 10500.038, desc: 'A jelly donut dusted with powdered sugar. The powder gets everywhere, but it\'s totally worth it even if you look like a messy cocaine addict.', icon: JNE.icon(9, 25, 'custom')},
                    {name: 'Plain glazed donut', order: 10500.039, desc: 'Absolutely gooey with sugar glaze. You won\'t even mind the sticky fingers.', icon: [28, 28]},
                    {name: 'Blueberry jelly filled donut', order: 10500.04, desc: 'A donut filled with sweet blueberry jelly. Blue colored sugar counts as a fruit right?', icon: JNE.icon(3, 25, 'custom')},
                    {name: 'Pink frosted donut', order: 10500.041, desc: 'A donut topped with pink frosting. Perfect for special occasions or just because.', icon: [30, 32]},
                    {name: 'Chocolate sprinkle donut', order: 10500.042, desc: 'A chocolate frosted donut covered in colorful sprinkles. The sprinkles add texture and joy.', icon: JNE.icon(8, 25, 'custom')},
                    {name: 'Bear claw', order: 10500.043, desc: 'A sweet pastry shaped like a bear\'s claw, filled with almond paste and topped with sliced almonds.', icon: [23, 36]},
                    {name: 'Chocolate eclair', order: 10500.044, desc: 'An elongated pastry filled with cream and topped with chocolate. Elegant, delicious, and French in origin just like this game.', icon: JNE.icon(7, 25, 'custom')}
                ]},
                { box: 'Box of wholesome pies', items: [
                    {name: 'Dutch apple pie', order: 10500.045, desc: 'As American as questionable healthcare.', icon: JNE.icon(0, 18, 'custom')},
                    {name: 'Pumpkin pie', order: 10500.046, desc: 'May or may not contain pumpkin.', icon: JNE.icon(1, 18, 'custom')},
                    {name: 'Cherry pie', order: 10500.047, desc: 'Sweet, gooey, and diabetes inducing.', icon: JNE.icon(2, 18, 'custom')},
                    {name: 'Tart lemon pie', order: 10500.048, desc: 'When life gives you lemons, add an unreasonable amount of sugar.', icon: JNE.icon(3, 18, 'custom')},
                    {name: 'Key lime pie', order: 10500.049, desc: 'Florida’s second most dangerous export.', icon: JNE.icon(4, 18, 'custom')},
                    {name: 'Chocolate pie', order: 10500.05, desc: 'Pie only because it’s made inside a pie crust.', icon: JNE.icon(5, 18, 'custom')},
                    {name: 'Blueberry pie', order: 10500.051, desc: 'The snozzberries taste like snozzberries.', icon: JNE.icon(6, 18, 'custom')},
                    {name: 'Coconut pie', order: 10500.052, desc: 'A little slice of heaven, no wait that was about pizza.', icon: JNE.icon(7, 18, 'custom')},
                    {name: 'Pecan pie', order: 10500.053, desc: 'Sugar held together by the occasional nut.', icon: JNE.icon(8, 18, 'custom')},
                    {name: 'Snickers pie', order: 10500.054, desc: 'Satisfies until the lawsuit arrives.', icon: JNE.icon(9, 18, 'custom')}
                ]},
                { box: 'Box of nostalgia cookies', items: [
                    {name: 'Midnight Malt Cookies', order: 10500.055, desc: 'A dark chocolate malt cookie with a past as bitter as its coffee. She walked into the bakery at midnight, all sugar and trouble. I knew she was bad news, but for two bits, I’d crumble.', icon: JNE.icon(10, 2, 'custom')},
                    {name: 'Atomic Malted Milk Cookies', order: 10500.056, desc: 'America’s favorite nuclear-powered snack! Now with 30% more atoms! Perfect for the whole family, from Junior to the family dog. Remember, a glowing child is a growing child!', icon: JNE.icon(10, 3, 'custom')},
                    {name: 'Groovy Honey Grahams', order: 10500.057, desc: 'Made with organic honey, whole grains, and absolutely no preservatives, man. Best enjoyed with good vibrations, free love, and a healthy distrust of anyone over thirty. Peace, love, and crumbles.', icon: JNE.icon(10, 4, 'custom')},
                    {name: 'Harvest Gold Butter Cookies', order: 10500.058, desc: 'Rich, buttery, and available in three fashionable shades of brown. Pairs beautifully with your avocado-green refrigerator, wood-paneled kitchen, and the lingering smell of shag carpeting. Some things never go out of style, thankfully most of these did.', icon: JNE.icon(10, 5, 'custom')},
                    {name: 'Electric Raspberry Sandwiches', order: 10500.059, desc: 'Two totally tubular cookies sandwiching a radical raspberry creme filling. Best enjoyed with a pocket full of quarters, a fresh mixtape, and a high score nobody believes you actually earned. Batteries not included.', icon: JNE.icon(10, 6, 'custom')},
                    {name: 'Saturday Morning Sugar Bombs', order: 10500.06, desc: 'Part of a balanced breakfast when served with a bowl of cereal, a glass of orange juice, and absolutely no parental supervision. Collect all six artificial colors!', icon: JNE.icon(10, 7, 'custom')},
                    {name: 'Chrome Chip Cookies', order: 10500.061, desc: 'Now with shiny 3D chips, animated sprinkles, and a free MIDI soundtrack! Best viewed at 800×600 resolution. Please allow 3 to 5 minutes for your cookie to finish loading. Under construction since 2001.', icon: JNE.icon(10, 8, 'custom')}
                ]}
            ];
        }
        function boxOf(name) {
            if (/^Unfortunate #/.test(name)) return 'Unfortunate cookies';
            var boxes = getBoxes();
            for (var i = 0; i < boxes.length; i++) {
                for (var j = 0; j < boxes[i].items.length; j++) if (boxes[i].items[j].name === name) return boxes[i].box;
            }
            return null;
        }
        // up.unlockAt is left unset: vanilla's tooltip would add its own "From" line plus a divider.
        function boxSourceText(box) {
            var ic = Game.Upgrades[box] ? Game.Upgrades[box].icon : [0, 0];
            var boxIcon = '<div class="icon tinyIcon" style="' + (ic[2] ? 'background-image:url(' + ic[2] + ');' : '') + 'vertical-align:middle;display:inline-block;background-position:calc(-' + ic[0] + ' * 48px) calc(-' + ic[1] + ' * 48px);transform:scale(0.5);margin:-16px;"></div>';
            return '<div style="font-size:80%;text-align:center;">From ' + boxIcon + ' ' + box + '</div>' +
                '<div style="height:2px;"></div>' +
                '<div style="font-size:80%;text-align:center;margin-top:2px;">Part of <span style="margin: 0 4px;">' + tinyIcon(MOD_ICON) + '</span> ' + SIMPLE_MOD_NAME + '</div>' +
                '<div class="line"></div>';
        }

        // Like vanilla's NewUpgradeCookie: always created, unlocked through Game.UnlockAt once the box is owned.
        function createBoxContents() {
            var n = 0;
            getBoxes().forEach(function(b) {
                var source = boxSourceText(b.box);
                b.items.forEach(function(it) {
                    var price = Math.pow(10, 75) * Math.pow(2.5, n++);
                    if (Game.Upgrades[it.name]) return;
                    var desc = source + 'Cookie production multiplier <b>+3%</b>.<q>' + it.desc + '</q>';
                    var up = new Game.Upgrade(it.name, desc, price, it.icon);
                    up.ddesc = desc;
                    up.order = it.order;
                    up.power = 3;
                    up.pool = 'cookie';
                    up._heavenlyUpgrade = true;
                    if (Game.cookieUpgrades) Game.cookieUpgrades.push(up);
                    if (Game.UpgradesByPool) (Game.UpgradesByPool['cookie'] = Game.UpgradesByPool['cookie'] || []).push(up);
                    if (Game.UnlockAt) Game.UnlockAt.push({cookies: price / 20, name: it.name, require: b.box});
                });
            });
        }

        // Same rule as vanilla's 5 second UnlockAt pass, run right after a load so nothing waits on the tick.
        function syncBoxContents() {
            getBoxes().forEach(function(b) {
                var owned = !!Game.Has(b.box);
                b.items.forEach(function(it) {
                    var up = Game.Upgrades[it.name];
                    if (!up) return;
                    if (up.bought || (owned && Game.cookiesEarned >= up.basePrice / 20)) Game.Unlock(it.name);
                    else up.unlocked = 0;
                });
            });
        }

        function unlockUnfortunates(saveData) {
            currentRunNames(saveData, saveData.unfortunate || []).forEach(function(n) { Game.Unlock(n); });
        }

        // Box contents only last one run, so a save from an earlier run must not restore them.
        // Game.resets only moves on a prestige gain, so the run start date (reset on every ascension) is checked too
        function currentRunNames(saveData, names) {
            var sameRun = saveData.boxRun === Game.resets && (saveData.boxStart === undefined || saveData.boxStart === Game.startDate);
            if (saveData.boxRun === undefined || sameRun) return names;
            return names.filter(function(n) { return !boxOf(n); });
        }

        function addHeavenlySourceText(upgrade) {
            var sourceText = '<div style="font-size:80%;text-align:center;">From <span style="margin: 0 4px;">' + tinyIcon(MOD_ICON) + '</span> ' + SIMPLE_MOD_NAME + '</div><div class="line"></div>';
            upgrade.ddesc = sourceText + upgrade.ddesc;
            upgrade.desc = sourceText + upgrade.desc;
        }

        function createHeavenlyUpgrade(upgradeInfo) {
            if (!upgradeInfo || !upgradeInfo.name) return null;

            // dont recreate if it already exists - preserve the bought state
            if (Game.Upgrades[upgradeInfo.name]) {
                return Game.Upgrades[upgradeInfo.name];
            }

            try {
                new Game.Upgrade(
                    upgradeInfo.name,
                    upgradeInfo.ddesc || upgradeInfo.desc,
                    upgradeInfo.price,
                    upgradeInfo.icon || [0, 0]
                );

                var upgrade = Game.last;
                if (!upgrade || !upgrade.id) return null;

                var require = upgradeInfo.require || [];
                upgrade.unlocked = require.length ? 0 : 1;

                upgrade.pool = 'prestige';
                upgrade._heavenlyUpgrade = true; // Mark as our upgrade for save/load
                if (upgradeInfo.power !== undefined) {
                    upgrade.power = upgradeInfo.power;
                    upgrade.pseudoCookie = true;
                }
                upgrade.desc = upgradeInfo.desc || upgradeInfo.ddesc;
                upgrade.ddesc = upgradeInfo.ddesc || upgradeInfo.desc;

                upgrade.price = upgradeInfo.price;
                upgrade.basePrice = upgradeInfo.price;

                if (upgradeInfo.pos) {
                    upgrade.posX = upgradeInfo.pos[0];
                    upgrade.posY = upgradeInfo.pos[1];
                    upgrade.x = undefined;
                    upgrade.y = undefined;
                } else if (upgradeInfo.x !== undefined && upgradeInfo.y !== undefined) {
                    upgrade.x = upgradeInfo.x;
                    upgrade.y = upgradeInfo.y;
                    upgrade.posX = undefined;
                    upgrade.posY = undefined;
                }

                if (require.length > 0) {
                    upgrade.require = require;
                    if (!upgrade.parents) upgrade.parents = [];
                    for (var i = 0; i < require.length; i++) {
                        var reqUpgrade = Game.Upgrades[require[i]];
                        if (reqUpgrade) {
                            if (!reqUpgrade.children) reqUpgrade.children = [];
                            if (reqUpgrade.children.indexOf(upgrade) === -1) reqUpgrade.children.push(upgrade);
                            if (upgrade.parents.indexOf(reqUpgrade) === -1) upgrade.parents.push(reqUpgrade);
                        }
                    }

                }

                upgrade.isVaulted = function() { return false; };
                upgrade.isBought = function() { return this.bought > 0; };
                upgrade.getPrice = function() {
                    var price = this.price || this.basePrice || 0;
                    return isFinite(price) ? price : 0;
                };
                upgrade.priceLumps = 0;
                upgrade.vanilla = 0;
                upgrade.order = upgradeInfo.order || upgrade.order || (1050 + (upgrade.id / 1000));
                if (upgradeInfo.seasonPriceMult !== undefined) upgrade.seasonPriceMult = upgradeInfo.seasonPriceMult;
                if (upgradeInfo.descFunc) upgrade.descFunc = upgradeInfo.descFunc;
                if (upgradeInfo.permanentSlot !== undefined) setupPermanentSlotUpgrade(upgrade, upgradeInfo.permanentSlot);
                if (upgradeInfo.orderAfter) upgrade.order = Game.Upgrades[upgradeInfo.orderAfter].order + 0.000001;
                if (upgradeInfo.showIf) upgrade.showIf = upgradeInfo.showIf;

                if (upgrade.pseudoCookie && Array.isArray(Game.cookieUpgrades) && Game.cookieUpgrades.indexOf(upgrade) === -1) Game.cookieUpgrades.push(upgrade);

                if (!Game.PrestigeUpgrades) Game.PrestigeUpgrades = [];
                if (Game.PrestigeUpgrades.indexOf(upgrade) === -1) Game.PrestigeUpgrades.push(upgrade);

                if (Game.UpgradesByPool) {
                    if (!Game.UpgradesByPool['prestige']) Game.UpgradesByPool['prestige'] = [];
                    if (Game.UpgradesByPool['prestige'].indexOf(upgrade) === -1) Game.UpgradesByPool['prestige'].push(upgrade);
                }

                addHeavenlySourceText(upgrade);

                if (Game.BuildAscendTree && !Game.BuildAscendTree._heavenlyUpgradesHooked) {
                    if (!Game._jneOriginalBuildAscendTree) Game._jneOriginalBuildAscendTree = Game.BuildAscendTree;
                    Game.BuildAscendTree = function(justBought) {
                        if (!Game.PrestigeUpgrades) Game.PrestigeUpgrades = [];

                        var iconBackups = {};

                        for (var i = 0; i < Game.PrestigeUpgrades.length; i++) {
                            var upg = Game.PrestigeUpgrades[i];
                            if (upg && upg.vanilla === 0 && upg.require && upg.require.length > 0) {
                                var allMet = true;
                                for (var j = 0; j < upg.require.length; j++) {
                                    var req = Game.Upgrades[upg.require[j]];
                                    if (!req || !req.bought) {
                                        allMet = false;
                                        break;
                                    }
                                }
                                upg.unlocked = allMet ? 1 : 0;
                            }
                        }

                        // Hide custom sprite sheet icons for locked/ghosted upgrades
                        for (var i in Game.PrestigeUpgrades) {
                            var me = Game.PrestigeUpgrades[i];
                            me.canBePurchased = 1;
                            if (!me.bought && !Game.DebuggingPrestige) {
                                if (me.showIf && !me.showIf()) me.canBePurchased = 0;
                                else {
                                    for (var ii in me.parents) {
                                        if (me.parents[ii] != -1 && !me.parents[ii].bought) me.canBePurchased = 0;
                                    }
                                }
                            }
                        }

                        function hasUnpurchasedAncestor(upgrade) {
                            if (!upgrade || !upgrade.parents) return false;
                            for (var p = 0; p < upgrade.parents.length; p++) {
                                var parent = upgrade.parents[p];
                                if (parent && parent !== -1) {
                                    if (!parent.bought) return true;
                                    if (hasUnpurchasedAncestor(parent)) return true;
                                }
                            }
                            return false;
                        }

                        for (var i = 0; i < Game.PrestigeUpgrades.length; i++) {
                            var upg = Game.PrestigeUpgrades[i];
                            if (upg && upg.vanilla === 0 && upg.icon && Array.isArray(upg.icon) && upg.icon.length === 3) {
                                if (!iconBackups[upg.id]) {
                                    iconBackups[upg.id] = upg.icon.slice();
                                }

                                if (!Game.Has('Neuromancy') && (!upg.canBePurchased || hasUnpurchasedAncestor(upg))) {
                                    upg.icon = [upg.icon[0], upg.icon[1]];
                                }
                            }
                        }

                        var result = Game._jneOriginalBuildAscendTree.apply(this, arguments);

                        for (var id in iconBackups) {
                            var upg = Game.UpgradesById && Game.UpgradesById[id];
                            if (upg && upg.icon && Array.isArray(upg.icon) && upg.icon.length === 2 && iconBackups[id].length === 3) {
                                upg.icon = iconBackups[id].slice();
                            }
                        }

                        return result;
                    };
                    Game.BuildAscendTree._heavenlyUpgradesHooked = true;
                }

                return upgrade;
            } catch (e) {
                console.error('[Heavenly Upgrades] Error:', e);
                return null;
            }
        }

        // A parent only links at creation time if it already exists, so forward references lose their tree line.
        // Re-link every require once all upgrades exist (idempotent).
        function linkHeavenlyParents() {
            (Game.PrestigeUpgrades || []).forEach(function(u) {
                if (!u || !u._heavenlyUpgrade || !u.require || !u.require.length) return;
                if (!u.parents) u.parents = [];
                u.require.forEach(function(name) {
                    var req = Game.Upgrades[name];
                    if (!req) return;
                    if (!req.children) req.children = [];
                    if (req.children.indexOf(u) === -1) req.children.push(u);
                    if (u.parents.indexOf(req) === -1) u.parents.push(req);
                });
            });
        }

        function createUpgrades() {
            var parentUpgrade = createHeavenlyUpgrade({
                name: 'Just natural expansion heavenly upgrades', order: 1050, price: 20e15, icon: [15, 7], pos: [-20, 2188], power: 5, showIf: function() { return Game.Has('Unshackled You'); },
                ddesc: 'Cookie production multiplier <b>+5%</b>. Also unlocks the <b>Just Natural Expansion</b> heavenly upgrade tree.<q>Now available in the afterlife. You know what also made it to the afterlife? Runaway inflation, so that\'s just swell.</q>',
                require: ['Unshackled You']
            });

            createHeavenlyUpgrade({
                name: 'Wallstreet bets', order: 1050.045, price: 15e15, icon: JNE.icon(9, 13, 'custom'), pos: [127, 2238],
                ddesc: '<b>+25% base</b> warehouse space for all goods in the <b>Stock Market</b> minigame.<q>A group of very special friends have discovered leverage and options trading, this is surely going to end well for everyone involved.</q>',
                require: ['Just natural expansion heavenly upgrades']
            });

            createHeavenlyUpgrade({
                name: 'Cyclius swatch', order: 1050.046, price: 20e15, icon: JNE.icon(19, 24, 'custom'), pos: [285, 2414],
                ddesc: '<b>Cyclius</b> displays the <b>buff amounts</b> for the current time in the tooltip.<q>You mean all this time we just needed to buy him a cheap watch?</q>',
                require: ['Wallstreet bets']
            });

            var morrowenUpgrade = createHeavenlyUpgrade({
                name: 'Morrowen, Spirit of Procrastination', order: 1050.047, price: 35e15, icon: JNE.icon(21, 20, 'custom'), pos: [460, 2446],
                ddesc: 'Adds a new god to the <b>Pantheon</b>.<q>You should probably be studying right now instead of playing idle games.</q>',
                require: ['Cyclius swatch']
            });
            var solgrethUpgrade = createHeavenlyUpgrade({
                name: 'Solgreth, Spirit of Selfishness', order: 1050.048, price: 35e15, icon: JNE.icon(20, 20, 'custom'), pos: [393, 2542],
                ddesc: 'Adds a new god to the <b>Pantheon</b>.<q>If that\'s a veiled criticism of me, I won\'t hear it and I won\'t respond to it.</q>',
                require: ['Cyclius swatch']
            });
            [morrowenUpgrade, solgrethUpgrade].forEach(function(upgrade) {
                if (upgrade) onBuy(upgrade, '_jnePantheonBuy', addNewPantheonSpirits);
            });

            createHeavenlyUpgrade({
                name: 'Divine uninspiration', order: 1050.058, price: 400e15, icon: [0, 8], pos: [584, 2574],
                ddesc: 'CpS boost per empty spirit slot in the <b>Pantheon</b>, <b>1%</b> for jade, <b>2%</b> for ruby, <b>3%</b> for diamond.<q>Finally, a reward for not having my life figured out. Honestly, why didn\'t we think of this sooner?</q>',
                require: ['Solgreth, Spirit of Selfishness', 'Morrowen, Spirit of Procrastination']
            });

            createHeavenlyUpgrade({
                name: 'Past lives', order: 1050.059, price: 6e17, icon: JNE.icon(15, 18, 'custom'), pos: [796, 2596],
                ddesc: '<b>Downline</b> keeps <b>10%</b> of its Fractal Prestige boost when you ascend.<q>I think I may have been a CEO in a past life, or perhaps a Roman centurion.</q>',
                require: ['Divine uninspiration']
            });

            createHeavenlyUpgrade({
                name: 'Faster hypothetical testing scenarios', order: 1050.06, price: 3e19, icon: JNE.icon(19, 20, 'custom'), pos: [890, 2718],
                ddesc: 'Reduce your <b>Clone Escape</b> scenario cooldown time by <b>10%</b>.<q>Of course all of this remains entirely and absolutely hypothetical, in the event containment was lost on a real clone it would be a huge scandal.</q>',
                require: ['Past lives']
            });

            createHeavenlyUpgrade({
                name: 'Soil inspector', order: 1050.049, price: 20e15, icon: [3, 35, getSpriteSheet('garden')], pos: [690, 2419],
                ddesc: 'The tooltip for an empty soil spot will <b>reveal the odds</b> of each plant growing there.<q>Modern gardening is more science than voodoo.</q>',
                require: ['Wallstreet bets']
            });

            createHeavenlyUpgrade({
                name: 'Plant all', order: 1050.05, price: 25e15, icon: JNE.icon(11, 16, 'custom'), pos: [891, 2388],
                ddesc: 'Hold <b>control</b> + <b>shift</b> when planting a seed to plant that seed in all empty soil spots. <q>Modern farming tools sure do cut down on the manual labor, next thing you know and we will have robots doing the work for us.</q>',
                require: ['Soil inspector']
            });

            var sparklingUpgrade = createHeavenlyUpgrade({
                name: 'Sparkling sugar cane', order: 1050.0561, price: 85e15, icon: JNE.icon(4, 24, 'custom'), pos: [1325, 2407],
                ddesc: 'Adds a new seed to the <b>garden minigame</b>. A cross between Bakeberry and Thumbcorn.<q>GMOs are finally paying off, especially when powered by Just Natural Expansion.</q>',
                require: ['Aerated soil']
            });

            var kudzuUpgrade = createHeavenlyUpgrade({
                name: 'Krazy kudzu', order: 1050.0562, price: 90e15, icon: JNE.icon(9, 24, 'custom'), pos: [1197, 2508],
                ddesc: 'Adds a new seed to the <b>garden minigame</b>. A cross between Meddleweed and Green rot or less commonly Ordinary Clover.<q>An invasive species that spreads like wildfire. We\'re not sure if introducing this to our garden was a good idea.</q>',
                require: ['Aerated soil']
            });

            var mushroomUpgrade = createHeavenlyUpgrade({
                name: 'Magic mushroom', order: 1050.0563, price: 95e15, icon: JNE.icon(14, 24, 'custom'), pos: [1037, 2544],
                ddesc: 'Adds a new seed to the <b>garden minigame</b>. A fairly rare cross between Ichor Puff and Doughshroom.<q>Caution: ingesting may alter your perception of reality. Results may vary, only to be taken orally.</q>',
                require: ['Aerated soil']
            });

            createHeavenlyUpgrade({
                name: 'Side by side', order: 1050.0564, price: 2e17, icon: JNE.icon(17, 12, 'custom'), pos: [1171, 2669],
                ddesc: '<b>Plant all</b> and selecting the first plot in the row will plant just that row with the selected plant.<q>Two by two they came marching, thunderous footsteps echoing out in all directions.</q>',
                require: ['Magic mushroom', 'Krazy kudzu']
            });

            [sparklingUpgrade, kudzuUpgrade, mushroomUpgrade].forEach(function(upgrade) {
                if (upgrade) onBuy(upgrade, '_jneGardenBuy', function() {
                    var M = minigameOf('Farm');
                    if (M && M.buildPanel) {
                        // Heavenly upgrade bought - inject custom plants if not already present
                        if (M.plants && !M.plants['sparklingSugarCane']) setupNewPlants();
                        M.buildPanel();
                    }
                });
            });

            createHeavenlyUpgrade({
                name: 'Aerated soil', order: 1050.056, price: 100e15, icon: JNE.icon(15, 24, 'custom'), pos: [1078, 2222],
                ddesc: 'Adds a new soil to the <b>garden minigame</b>.<q>It seems like plants like air, have we considered adding more air to the soil?</q>',
                require: ['Plant all']
            });

            createHeavenlyUpgrade({
                name: 'Business plan', order: 1050.057, price: 1.5e17, icon: JNE.icon(13, 16, 'custom'), pos: [1456, 2324],
                ddesc: 'Adds <b>one</b> downline <b>queue</b> slot. Actions queued while your active slots are full start automatically when a slot opens.<q>We have a plan and it involves synergy and a really big line of credit.</q>',
                require: ['Aerated soil']
            });

            createHeavenlyUpgrade({
                name: 'Dream journal', order: 1050.071, price: 2.5e18, icon: JNE.icon(4, 16, 'custom'), pos: [1454, 2057],
                ddesc: 'Adds an additional <b>one</b> downline <b>queue</b> slot.<q>Dream big.</q>',
                require: ['Business plan', 'Divine potions', 'Divine reagents']
            });

            createHeavenlyUpgrade({
                name: 'Improved soil inspector', order: 1050.0565, price: 2.5e17, icon: [3, 35, getSpriteSheet('garden')], pos: [1337, 2590],
                ddesc: 'Your <b>soil inspector</b> is now even more precise.<q>Do the extra decimal places really make a difference? To some people they do I guess.</q>',
                require: ['Sparkling sugar cane', 'Krazy kudzu']
            });

            createHeavenlyUpgrade({
                name: 'Wizardly accomplishments', order: 1050.063, price: 100e15, icon: JNE.icon(16, 15, 'custom'), pos: [675, 2261],
                ddesc: 'Each level of wizard tower increases <b>magic regeneration</b> slightly up to <b>level 20</b>.<q>Mana enhancing supplements are suspected, drug test are scheduled for next week.</q>',
                require: ['Wallstreet bets']
            });

            createHeavenlyUpgrade({
                name: 'Gilded allure', order: 1050.064, price: 150e15, icon: JNE.icon(20, 19, 'custom'), pos: [883, 2219],
                ddesc: 'Adds a new spell to the <b>Grimoire</b> minigame.<q>Our scholars discovered a new spell but it took a really long time to write down since everyone who cast it was immediately hit in the head by flying objects.</q>',
                require: ['Wizardly accomplishments']
            });

            createHeavenlyUpgrade({
                name: 'Magical hourglass', order: 1050.065, price: 2.3e17, icon: JNE.icon(18, 17, 'custom'), pos: [903, 2051],
                ddesc: 'Shows the time until your mana is full inside of the mana tooltip for <b>Grimoire</b>.<q>A wizard is never late, Frodo Baggins. Nor is he early. He arrives precisely when he means to.</q>',
                require: ['Gilded allure']
            });

            createHeavenlyUpgrade({
                name: 'Erasable pens', order: 1050.001, price: 2.5e16, icon: JNE.icon(12, 15, 'custom'), pos: [16, 2339],
                ddesc: 'Edit <b>permanent upgrade slots</b> between ascensions.<q>Nothing wrong with a little tweaking.</q>',
                require: ['Just natural expansion heavenly upgrades']
            });

            createHeavenlyUpgrade({
                name: 'Self employed realtor', order: 1050.073, price: 35e15, icon: JNE.icon(10, 14, 'custom'), pos: [148, 2434],
                ddesc: 'Buildings are <b>10%</b> cheaper.<q>Cut out the middlemen by becoming the middleman.</q>',
                require: ['Erasable pens']
            });

            createHeavenlyUpgrade({
                name: 'Wholesale discount club', order: 1050.072, price: 30e15, icon: [16, 7], pos: [19, 2502],
                ddesc: 'Upgrades are <b>10%</b> cheaper.<q>Costco membership fee not included.</q>',
                require: ['Erasable pens']
            });

            createHeavenlyUpgrade({
                name: 'Turtles all the way down', order: 1050.074, price: 250e15, icon: JNE.icon(12, 17, 'custom'), pos: [78, 2660],
                ddesc: 'Buildings are <b>1%</b> cheaper per building level up to <b>level 25</b>.<q>Okay yes I understand, but then what is the turtle sitting on?</q>',
                require: ['Self employed realtor', 'Wholesale discount club']
            });

            createHeavenlyUpgrade({
                name: 'Improved sugar crystal cookies', order: 1050.087, price: 250000e15, icon: [10, 25], pos: [200, 2791],
                ddesc: 'You gain <b>1% CpS</b> for each building <b>level 15</b> or higher.<q>There is room for improvement in everything.</q>',
                require: ['Turtles all the way down']
            });

            createHeavenlyUpgrade({
                name: 'Gilded sugar crystal cookies', order: 1050.088, price: 500000e15, icon: [10, 14], pos: [256, 2954],
                ddesc: 'You gain <b>1% CpS</b> for each building <b>level 20</b> or higher.<q>Look, I\'m going to level with you here, we put some gold flakes in them, they don\'t taste any different but the influencers go crazy for them.</q>',
                require: ['Improved sugar crystal cookies']
            });

            createHeavenlyUpgrade({
                name: 'Weakest link', order: 1050.077,
                ddesc: 'Your <b>least productive</b> building is <b>16x</b> more powerful.<q>Zero times sixteen is still zero but it\'s the thought that counts.</q>',
                price: 500e15,
                icon: [0, 33],
                pos: [19, 2766],
                require: ['Turtles all the way down'],
                descFunc: function() {
                    var cache = Game._weakestLinkCache;
                    var assignment = cache && cache.assignments ? cache.assignments['Weakest link'] : null;
                    var buildingName = assignment ? assignment.buildingName : 'None';
                    return '<div style="text-align:center;">Current: <b>' + buildingName + '</b><div class="line"></div></div>' + this.ddesc;
                }
            });

            createHeavenlyUpgrade({
                name: 'The next weakest link', order: 1050.078,
                ddesc: 'Your <b>second least productive</b> building is <b>12x</b> more powerful.',
                price: 1000e15,
                icon: [9, 33],
                pos: [53, 2905],
                require: ['Weakest link'],
                descFunc: function() {
                    var cache = Game._weakestLinkCache;
                    var assignment = cache && cache.assignments ? cache.assignments['The next weakest link'] : null;
                    var buildingName = assignment ? assignment.buildingName : 'None';
                    return '<div style="text-align:center;">Current: <b>' + buildingName + '</b><div class="line"></div></div>' + this.ddesc;
                }
            });

            createHeavenlyUpgrade({
                name: 'No more weak links', order: 1050.079,
                ddesc: 'Your <b>third least productive</b> building is <b>8x</b> more powerful.',
                price: 2000e15,
                icon: [10, 33],
                pos: [106, 3044],
                require: ['The next weakest link'],
                descFunc: function() {
                    var cache = Game._weakestLinkCache;
                    var assignment = cache && cache.assignments ? cache.assignments['No more weak links'] : null;
                    var buildingName = assignment ? assignment.buildingName : 'None';
                    return '<div style="text-align:center;">Current: <b>' + buildingName + '</b><div class="line"></div></div>' + this.ddesc;
                }
            });

            createHeavenlyUpgrade({
                name: 'Self promoter', order: 1050.08, price: 4e18, icon: JNE.icon(18, 18, 'custom'), pos: [198, 3154],
                ddesc: 'Your herald bonus is increased by <b>10%</b> but still cannot exceed a maximum of <b>100%</b>.<q>Selfishly shouting your own praises from the rooftop, it kinda works I guess.</q>',
                require: ['No more weak links']
            });

            createHeavenlyUpgrade({
                name: 'Box of overpriced donuts', order: 1050.075, price: 250e15, icon: [27, 29], pos: [232, 2586],
                ddesc: 'Contains an assortment of overpriced donuts.<q>We found a way to make donuts more expensive, it turns out you just need to make them more expensive. We know they aren\'t cookies but they taste so good no one is complaining, except for you, stop complaining.</q>',
                require: ['Self employed realtor', 'Wholesale discount club']
            });

            createHeavenlyUpgrade({
                name: 'Box of nostalgia cookies', order: 1050.0155, price: 40e17, icon: JNE.icon(11, 18, 'custom'), pos: [322, 1832],
                ddesc: 'Contains an assortment of cookies to inspire your memory.<q>There is no flavor sweeter than memories from your youth.</q>',
                require: ['Peaking under the tree']
            });

            createHeavenlyUpgrade({
                name: 'Sugar frenzy II', order: 1050.113, price: 100e15, icon: [22, 17], pos: [-129, 2300],
                ddesc: '<b>Sugar frenzy</b> may be used <b>once every 24 hours</b> instead of once an ascension. Each use per ascension cost <b>one additional sugar lump</b>.<q>Nothing like a good night\'s sleep to get over a killer sugar headache and be ready to hit the ground again. Just remember you aren\'t as young as you used to be.</q>',
                require: ['Just natural expansion heavenly upgrades']
            });

            createHeavenlyUpgrade({
                name: 'Sugar for sugar trading', order: 1050.114, price: 250e15, icon: [21, 17], pos: [-209, 2468],
                ddesc: 'Spend a <b>sugar lump</b> to summon a <b>Golden Cookie</b>. May be used once per ascension.<q>Turning sugar into sugar, what a concept!</q>',
                require: ['Sugar frenzy II']
            });

            createHeavenlyUpgrade({
                name: 'Reoccuring business', order: 1050.116, price: 1e19, icon: JNE.icon(1, 17, 'custom'), pos: [-331, 2527],
                ddesc: '<b>Sugar for sugar trading</b> may be used <b>once every 24 hours</b> instead of once an ascension. Each use per ascension cost <b>one additional sugar lump</b>.<q>Thank you! Come Again!</q>',
                require: ['Sugar for sugar trading']
            });

            createHeavenlyUpgrade({
                name: 'Sugar insight', order: 1050.115, price: 500e15, icon: [29, 16], pos: [-93, 2485],
                ddesc: 'Shows what <b>type</b> of sugar lump is currently growing instantly.<q>It is like sexing a chicken, once you have been doing it long enough you can just tell.</q>',
                require: ['Sugar frenzy II']
            });

            createHeavenlyUpgrade({
                name: 'Sugar predictor', order: 1050.123, price: 850e15, icon: JNE.icon(10, 27, 'custom'), pos: [-100, 2658],
                ddesc: 'Allows you to predict the results of a <b>Meaty</b> lump. Get clear guidance on the simplest changes needed to guarantee one.<q>Inspired by Choose Your Own Lump (CYOL) and modernized with love and care, we hope you enjoy a new era of choosing the lump you want.</q>',
                require: ['Sugar insight']
            });

            createHeavenlyUpgrade({
                name: 'Sugar predictor II', order: 1050.124, price: 6.545e19, icon: JNE.icon(11, 27, 'custom'), pos: [-105, 2801],
                ddesc: 'Adds the ability to predict <b>Bifurcated</b> lumps to your sugar predictor.<q>Okay that\'s a little better but still a pretty annoying nerf.</q>',
                require: ['Sugar predictor']
            });

            createHeavenlyUpgrade({
                name: 'Sugar predictor III', order: 1050.125, price: 5.03965e21, icon: JNE.icon(12, 27, 'custom'), pos: [-110, 2959],
                ddesc: 'Adds the ability to predict <b>Caramelized</b> lumps to your sugar predictor.<q>Now we are getting somewhere, I can do something with this.</q>',
                require: ['Sugar predictor II']
            });

            createHeavenlyUpgrade({
                name: 'Sugar predictor IV', order: 1050.126, price: 3.8805305e23, icon: JNE.icon(13, 27, 'custom'), pos: [-113, 3117],
                ddesc: 'Adds the ability to predict <b>Golden</b> lumps to your sugar predictor.<q>Ahhh yessssssss, that\'s the one I have been waiting for, sweet sweet release from the torture.</q>',
                require: ['Sugar predictor III']
            });

            createHeavenlyUpgrade({
                name: 'Sugar baking II', order: 1050.117, price: 300e15, icon: [10, 36], pos: [-264, 2661],
                ddesc: 'Each unspent sugar lump (up to <b>110</b>) gives <b>+1% CpS</b>.<q>When your neighbors come looking to borrow a cup of sugar, you aren\'t home.</q>',
                require: ['Sugar for sugar trading']
            });

            createHeavenlyUpgrade({
                name: 'Sugar baking III', order: 1050.118, price: 400e15, icon: [10, 35], pos: [-503, 2640],
                ddesc: 'Each unspent sugar lump (up to <b>120</b>) gives <b>+1% CpS</b>.<q>Sugar sugar everywhere but not a drop to eat.</q>',
                require: ['Sugar baking II']
            });

            createHeavenlyUpgrade({
                name: 'Sugar baking IV', order: 1050.119, price: 1e21, icon: [18, 7], pos: [-744, 2592],
                ddesc: 'Each unspent sugar lump (up to <b>130</b>) gives <b>+1% CpS</b>.<q>A Scrooge McDuck level of sugar hoarding.</q>',
                require: ['Sugar baking III']
            });

            createHeavenlyUpgrade({
                name: 'Sugar baking V', order: 1050.12, price: 5e21, icon: [17, 7], pos: [-1011, 2644],
                ddesc: 'Each unspent sugar lump (up to <b>140</b>) gives <b>+1% CpS</b>.<q>Sugar (noun): a sweet crystalline substance obtained from various plants, especially sugar cane and sugar beet, consisting essentially of sucrose, and used as a sweetener in food and drink.</q>',
                require: ['Sugar baking IV']
            });

            createHeavenlyUpgrade({
                name: 'Even sweeter', order: 1050.122, price: 2.5e23, icon: JNE.icon(20, 15, 'custom'), pos: [-1287, 2778],
                ddesc: '<b>Free sugar lump</b> outcomes from golden cookies are <b>50%</b> more common.<q>So sweet it hurts my teeth.</q>',
                require: ['Sugar baking V']
            });

            createHeavenlyUpgrade({
                name: 'Sugar baking VI', order: 1050.121, price: 25e21, icon: [20, 7], pos: [-1242, 2488],
                ddesc: 'Each unspent sugar lump (up to <b>150</b>) gives <b>+1% CpS</b>.<q>On the next episode of Hoarders, they\'ll be featuring your sugar lump collection.</q>',
                require: ['Sugar baking V']
            });

            createHeavenlyUpgrade({
                name: 'Sweet refunds', order: 1050.13, price: 10e23, icon: JNE.icon(15, 12, 'custom'), pos: [-1393, 2591],
                ddesc: 'Downgrade your building levels and get <b>50%</b> sugar back, you may not downgrade past level 1.<q>Here\'s some sugar, sorry it\'s not in packets.</q>',
                require: ['Sugar baking VI']
            });

            createHeavenlyUpgrade({
                name: 'Blackfriday special', order: 1050.002, price: 10e15, icon: [17, 9], pos: [197, 2053], seasonPriceMult: 0.75,
                ddesc: 'Changing seasons is <b>25%</b> cheaper.<q>Black Friday use to have actually good deals that made you want to buy things, now its just marking up things to mark them back down, even seasons are cheaper.</q>',
                require: ['Just natural expansion heavenly upgrades']
            });

            createHeavenlyUpgrade({
                name: 'Peaking under the tree', order: 1050.015, price: 50e15, icon: [12, 10], pos: [281, 1950],
                ddesc: 'Random drops are <b>10%</b> more common.<q>Ruining Christmas morning surprises since 1988</q>',
                require: ['Blackfriday special']
            });

            createHeavenlyUpgrade({
                name: 'Seasonal hours', order: 1050.003, price: 5e15, icon: [14, 10], pos: [338, 2123],
                ddesc: 'Seasons last <b>6 hours</b> longer.',
                require: ['Blackfriday special']
            });

            createHeavenlyUpgrade({
                name: 'Seasonal overtime', order: 1050.004, price: 8e15, icon: [15, 10], pos: [549, 2014],
                ddesc: 'Seasons last <b>12 hours</b> longer.',
                require: ['Seasonal hours']
            });

            createHeavenlyUpgrade({
                name: 'Seasonal time off', order: 1050.005, price: 15e15, icon: [18, 4], pos: [573, 1858],
                ddesc: 'Seasons last <b>18 hours</b> longer.',
                require: ['Seasonal overtime']
            });

            createHeavenlyUpgrade({
                name: 'Seasonal retirement', order: 1050.006, price: 20e15, icon: [16, 10], pos: [487, 1726],
                ddesc: 'Seasons last <b>twice</b> as long.<q>Lets just leave the tree up till March this year.</q>',
                require: ['Seasonal time off']
            });

            createHeavenlyUpgrade({
                name: 'Toy box', order: 1050.007, price: 350e15, icon: [34, 9], pos: [674, 1667],
                ddesc: 'Adds a switch to toggle <b>Toy mode</b> on and off.<q>A virtual KB Toy Store just for you.</q>',
                require: ['Seasonal retirement']
            });

            createHeavenlyUpgrade({
                name: 'Regifting', order: 1050.016, price: 75e15, icon: [16, 9], pos: [459, 1916],
                ddesc: 'Seasonal drops have a <b>30%</b> chance to carry over between ascensions.<q>Didn\'t I get you this label maker last year?</q>',
                require: ['Peaking under the tree']
            });

            createHeavenlyUpgrade({
                name: 'Cookie calculations', order: 1050.008, price: 25e15, icon: [11, 10], pos: [138, 1907],
                ddesc: 'Display <b>CpS</b> in minutes, hours, or days.<q>The kittens have been up all night pouring over spreadsheets to bring you these reports</q>',
                require: ['Blackfriday special']
            });

            createHeavenlyUpgrade({
                name: 'Annualized returns', order: 1050.009, price: 35e15, icon: [31, 8], pos: [194, 1759],
                ddesc: 'Display cookie bank in <b>years of CpS</b> and your cookies per click in stats.<q>Crunching the big numbers now.</q>',
                require: ['Cookie calculations']
            });

            createHeavenlyUpgrade({
                name: 'Fish tank', order: 1050.01, price: 100e15, icon: [23, 33], pos: [275, 1532],
                ddesc: '<b>Cookie fish</b> have found their way into your milk.<q>Please do not tap the glass.</q>',
                require: ['Annualized returns']
            });

            createHeavenlyUpgrade({
                name: 'Sunken treasure', order: 1050.011, price: 500e15, icon: JNE.icon(7, 15, 'custom'), pos: [337, 1378],
                ddesc: 'You can now collect your <b>milk fish</b> for a small reward.<q>There\'s gold in them there milk.</q>',
                require: ['Fish tank']
            });

            createHeavenlyUpgrade({
                name: 'Aquaculturist', order: 1050.012, price: 2000e15, icon: JNE.icon(1, 25, 'custom'), pos: [485, 1303],
                ddesc: 'Fish appear <b>25%</b> more often.<q>With proper care and feeding, your fish population thrives.</q>',
                require: ['Sunken treasure']
            });

            createHeavenlyUpgrade({
                name: 'Hatchery effect', order: 1050.013, price: 30000e15, icon: JNE.icon(2, 25, 'custom'), pos: [645, 1345],
                ddesc: 'Fish have a <b>10%</b> chance to appear in pairs.<q>Double the fish, double the fun!</q>',
                require: ['Aquaculturist']
            });

            createHeavenlyUpgrade({
                name: 'Shiny scales', order: 1050.014, price: 4.5e20, icon: JNE.icon(30, 14, 'main'), pos: [738, 1483],
                ddesc: 'Your cookie fish are worth <b>30%</b> more but also swim <b>20%</b> faster.<q>Look at that little guy go!</q>',
                require: ['Hatchery effect']
            });

            createHeavenlyUpgrade({
                name: 'Big cookie image selector', order: 1050.017, icon: [5, 3], price: 750e15, pos: [334, 1686],
                desc: 'Change the image of the <b>Big Cookie</b>.<q>Like a fresh coat of paint on the walls this should liven the place up a bit.</q>',
                require: ['Annualized returns', 'Seasonal retirement', 'Regifting']
            });

            createHeavenlyUpgrade({
                name: 'Even more cookies of unusual size', order: 1050.018, price: 7.5e19, icon: JNE.icon(10, 1, 'custom'), pos: [504, 1513],
                ddesc: 'Adds <b>5</b> additional cookie options to your <b>big cookie image selector</b>.<q>C.O.U.S? I don\'t think they exist.</q>',
                require: ['Big cookie image selector']
            });

            createHeavenlyUpgrade({
                name: 'Improved cookie chains', order: 1050.089, price: 35e15, icon: [3, 5], pos: [-173, 2156],
                ddesc: '<b>Cookie chains</b> last longer, especially at higher levels.<q>Is this a bug fix with the original formula or an upgrade? No one can ever be totally sure, what we can be sure of is those pesky one cookie chain long chains are a thing of the past, mostly anyways.</q>',
                require: ['Just natural expansion heavenly upgrades']
            });

            createHeavenlyUpgrade({
                name: 'Fading payout', order: 1050.092, price: 250e15, icon: JNE.icon(23, 16, 'custom'), pos: [-486, 2049],
                ddesc: 'You have a <b>1%</b> chance to auto click a fading golden cookie.<q>Counting sheep is for suckers and fools, in this house we count golden cookies while you drift off to sleep.</q>',
                require: ['Improved cookie chains']
            });

            createHeavenlyUpgrade({
                name: 'Triple 7s', order: 1050.093, price: 3.8e17, icon: JNE.icon(4, 13, 'custom'), pos: [-658, 1827],
                ddesc: '<b>Lucky digit</b>, <b>Lucky number</b>, and <b>Lucky payout</b> are <b>unlocked</b> even if the conditions have not been met.<q>Helpful if you forgot to do these earlier, useless if you were on top of things already though.</q>',
                require: ['Fading payout']
            });

            createHeavenlyUpgrade({
                name: 'Lucky fading payout', order: 1050.099, price: 1000e15, icon: JNE.icon(22, 16, 'custom'), pos: [-708, 2066],
                ddesc: 'You have a <b>2%</b> chance to auto click a fading golden cookie.<q>Twice the chance, still less reliable than just clicking the cookie though.</q>',
                require: ['Fading payout']
            });

            createHeavenlyUpgrade({
                name: 'Distilled essence of retripled luck', order: 1050.103, price: 5000e15, icon: [27, 12], pos: [-573, 2194],
                ddesc: 'Golden Cookies have a <b>2% chance of being doubled</b>.<q>That wasn\'t the type of triple you were hoping for.</q>',
                require: ['Improved cookie chains']
            });

            createHeavenlyUpgrade({
                name: 'Golden stopwatch', order: 1050.104, price: 50000e15, icon: JNE.icon(3, 17, 'custom'), pos: [-754, 2195],
                ddesc: 'Adds a <b>shimmer timer</b> that displays spawn time for <b>golden cookies</b> and other shimmers.<q>I wish I could take credit for this idea but it was implemented with love from the work of Timer Widget by Klattmose.</q>',
                require: ['Distilled essence of retripled luck', 'Lucky fading payout']
            });

            createHeavenlyUpgrade({
                name: 'Countdown complications', order: 1050.105, price: 35000e15, icon: JNE.icon(16, 24, 'custom'), pos: [-698, 2388],
                ddesc: 'Shows the remaining duration of buffs in your <b>golden stopwatch</b>.<q>A watch complication is any function beyond telling the hours, minutes, and seconds, adding mechanical complexity like chronographs or a buff countdown timer.</q>',
                require: ['Golden stopwatch']
            });

            createHeavenlyUpgrade({
                name: 'Golden cookie predictor', order: 1050.106, price: 500000e15, icon: JNE.icon(16, 13, 'custom'), pos: [-845, 2329],
                ddesc: 'Show the expected result of a <b>Golden Cookie</b> <b>10%</b> of the time.<q>They told us we were mad to try but who is laughing now?</q>',
                require: ['Golden stopwatch']
            });

            createHeavenlyUpgrade({
                name: 'Tweaked golden cookie predictor', order: 1050.107, price: 500000e16, icon: JNE.icon(17, 13, 'custom'), pos: [-977, 2458],
                ddesc: 'Show the expected result of a <b>Golden Cookie</b> <b>25%</b> of the time.<q>Who are we kidding anyways, you are going to click the cookie anyway.</q>',
                require: ['Golden cookie predictor']
            });

            createHeavenlyUpgrade({
                name: 'Improved golden cookie predictor', order: 1050.108, price: 500000e17, icon: JNE.icon(15, 13, 'custom'), pos: [-1006, 2286],
                ddesc: 'Show the expected result of a <b>Golden Cookie</b> <b>50%</b> of the time.<q>We improved it by making improvements to the doohickey that makes it work.</q>',
                require: ['Tweaked golden cookie predictor']
            });

            createHeavenlyUpgrade({
                name: 'Perfected golden cookie predictor', order: 1050.109, price: 800000e17, icon: JNE.icon(14, 13, 'custom'), pos: [-946, 2125],
                ddesc: 'Show the expected result of a <b>Golden Cookie</b> <b>65%</b> of the time.<q>We are approaching absolute peak efficiency in our algorithms, to get any better results we would need to be able to see the inside of a black hole.</q>',
                require: ['Improved golden cookie predictor']
            });

            createHeavenlyUpgrade({
                name: 'All is well', order: 1050.11, price: 1000000e17, icon: JNE.icon(14, 14, 'custom'), pos: [-1100, 2061],
                ddesc: 'A golden cookie spawns at the <b>top</b> of every hour.<q>Because nothing says "all is well" like a cookie appearing right on schedule</q>',
                require: ['Perfected golden cookie predictor']
            });

            createHeavenlyUpgrade({
                name: 'Six bells', order: 1050.111, price: 2000000e17, icon: JNE.icon(17, 17, 'custom'), pos: [-1214, 2174],
                ddesc: 'A golden cookie spawns at the <b>bottom</b> of every hour.<q>Perfect timing for anyone who believes the universe should deliver sugar twice as often.</q>',
                require: ['All is well']
            });

            createHeavenlyUpgrade({
                name: 'Fortune tolls for you', order: 1050.09, price: 50e15, icon: JNE.icon(23, 20, 'custom'), pos: [-300, 2307],
                ddesc: '<b>Fortune cookies</b> make <b>noise</b> when they appear.<q>When destiny arrives, it refuses to do so quietly.</q>',
                require: ['Improved cookie chains']
            });

            createHeavenlyUpgrade({
                name: 'Better fortune typist', order: 1050.102, price: 1e18, icon: JNE.icon(9, 14, 'custom'), pos: [-393, 2407],
                ddesc: 'Building specific fortune cookies are <b>15%</b> more powerful.<q>We brought in a new set of typist and they started writing better fortunes as soon as they found out what happened to the old set.</q>',
                require: ['Fortune tolls for you']
            });

            createHeavenlyUpgrade({
                name: 'Chinese leftovers', order: 1050.091, price: 100e15, icon: JNE.icon(17, 24, 'custom'), pos: [-439, 2278],
                ddesc: '<b>Consumable Fortune Cookies</b> regenerate once every <b>3 days</b>.<q>Everyone knows Chinese leftovers mysteriously multiply in the fridge like they\'re running a shadow franchise.</q>',
                require: ['Fortune tolls for you']
            });

            createHeavenlyUpgrade({
                name: 'Second day takeout', order: 1050.1, price: 2500e15, icon: [31, 9], pos: [-528, 2388],
                ddesc: '<b>Consumable Fortune Cookies</b> regenerate once every <b>2 days</b>.<q>Marinated overnight in pure, unfiltered refrigerator funk and wisdom too I guess.</q>',
                require: ['Chinese leftovers']
            });

            createHeavenlyUpgrade({
                name: 'Doordashing every day', order: 1050.101, price: 50000e15, icon: [28, 30], pos: [-472, 2517],
                ddesc: '<b>Consumable Fortune Cookies</b> regenerate once every <b>day</b>.<q>You can practically smell the financial irresponsibility.</q>',
                require: ['Second day takeout']
            });

            createHeavenlyUpgrade({
                name: 'Rare game hunter', order: 1050.019, price: 10e15, icon: JNE.icon(0, 17, 'custom'), pos: [-58, 2038],
                ddesc: 'Shiny Wrinklers are <b>25%</b> more common.',
                require: ['Just natural expansion heavenly upgrades']
            });

            createHeavenlyUpgrade({
                name: 'Hellish hunger', order: 1050.02, price: 15e15, icon: JNE.icon(21, 16, 'custom'), pos: [-212, 1935],
                ddesc: 'Wrinklers suck <b>10%</b> more.',
                require: ['Rare game hunter']
            });

            createHeavenlyUpgrade({
                name: 'Ravenous leeches', order: 1050.021, price: 15e15, icon: JNE.icon(21, 17, 'custom'), pos: [-329, 1835],
                ddesc: 'Wrinklers suck <b>20%</b> more.<q>Sluuuurrrp.</q>',
                require: ['Hellish hunger']
            });

            createHeavenlyUpgrade({
                name: 'Unlocked gates of hell', order: 1050.022, price: 20e15, icon: JNE.icon(17, 27, 'custom'), pos: [-114, 1885],
                ddesc: 'Wrinklers spawn <b>10%</b> faster.',
                require: ['Rare game hunter']
            });
            createHeavenlyUpgrade({
                name: 'Wide open door of hell', order: 1050.023, price: 20e15, icon: JNE.icon(17, 27, 'custom'), pos: [-175, 1704],
                ddesc: 'Wrinklers spawn <b>20%</b> faster.<q>Are you trying to air condition the whole damned underworld?</q>',
                require: ['Unlocked gates of hell']
            });

            createHeavenlyUpgrade({
                name: 'Indigenous tracker', order: 1050.024, price: 100e15, icon: JNE.icon(24, 12, 'main'), pos: [-346, 1690],
                ddesc: 'Shiny Wrinklers are <b>50%</b> more common.',
                require: ['Ravenous leeches', 'Wide open door of hell']
            });
            createHeavenlyUpgrade({
                name: 'Species bounceback', order: 1050.025, price: 250e15, icon: JNE.icon(19, 27, 'custom'), pos: [-466, 1607],
                ddesc: 'Shiny Wrinklers are <b>twice</b> as common.<q>Good news, shiny wrinklers have been removed from the critically endangered list, bad news if you keep popping them they will end up right back on it.</q>',
                require: ['Indigenous tracker']
            });

            createHeavenlyUpgrade({
                name: 'The prize at the bottom of the box', order: 1050.037, price: 80e15, icon: JNE.icon(17, 18, 'custom'), pos: [-254, 2024],
                ddesc: 'Wrinklers have a <b>1%</b> chance of a <b>66x</b> buff for <b>6 seconds</b> on pop.<q>Just like old cereal boxes, dig through enough weird, crunchy horrors and eventually you\'ll find something shiny and powerful.</q>',
                require: ['Rare game hunter']
            });

            createHeavenlyUpgrade({
                name: 'Double box prize', order: 1050.038, price: 150e15, icon: [20, 9], pos: [-549, 1786],
                ddesc: 'Wrinklers have a <b>2%</b> chance of a <b>66x</b> buff for <b>6 seconds</b> on pop.<q>Turns out the real prize wasn\'t a decoder ring.</q>',
                require: ['The prize at the bottom of the box']
            });

            createHeavenlyUpgrade({
                name: 'Mail in sweepstake winner', order: 1050.039, price: 250e15, icon: JNE.icon(7, 16, 'custom'), pos: [-763, 1517],
                ddesc: 'Wrinklers have a <b>3%</b> chance of a <b>66x</b> buff for <b>6 seconds</b> on pop.<q>As powerful as mail away x-ray specs.</q>',
                require: ['Double box prize']
            });

            createHeavenlyUpgrade({
                name: 'Glittery jam', order: 1050.044, price: 2.5e19, icon: JNE.icon(16, 18, 'custom'), pos: [-967, 1429],
                ddesc: 'Shiny wrinklers have a <b>6.66x greater</b> chance of providing their <b>Jam Filling</b> buff when popped.<q>There is glitter in this jam. Fabulous…</q>',
                require: ['Mail in sweepstake winner']
            });

            createHeavenlyUpgrade({
                name: 'Box of wholesome pies', order: 1050.04, price: 40e17, icon: JNE.icon(10, 18, 'custom'), pos: [-989, 1581],
                ddesc: 'Contains an assortment of delicious pie slices.<q>So good no one will know they aren\'t even cookies.</q>',
                require: ['Mail in sweepstake winner']
            });

            createHeavenlyUpgrade({
                name: 'Unlucky luckier', order: 1050.094, price: 500e15, icon: JNE.icon(23, 17, 'custom'), pos: [-820, 1839],
                ddesc: 'Lucky Golden Cookies are <b>5%</b> less common.<q>Lucky cookies are good but not that good.</q>',
                require: ['Mail in sweepstake winner', 'Fading payout']
            });

            createHeavenlyUpgrade({
                name: 'Unfortunate cookies', order: 1050.098, price: 7.5e19, icon: JNE.icon(16, 16, 'custom'), pos: [-968, 1732],
                ddesc: 'The news ticker may occasionally have <b>unfortunes</b> during the <b>Grandmapocalypse</b>, which may be clicked to unlock upgrades.<q>Jason figured it out? Jason? This is a real low point. Yeah, this one hurts. Ow.</q>',
                require: ['Unlucky luckier']
            });

            createHeavenlyUpgrade({
                name: 'Even more unlucky luckier', order: 1050.095, price: 8000e15, icon: JNE.icon(23, 15, 'custom'), pos: [-1091, 1841],
                ddesc: 'Lucky Golden Cookies are <b>10%</b> less common.<q>Your younger self would be so disappointed to learn you wanted to get less lucky cookies.</q>',
                require: ['Unlucky luckier']
            });

            createHeavenlyUpgrade({
                name: 'Positive feedback loop', order: 1050.112, price: 5000000e17, icon: JNE.icon(22, 17, 'custom'), pos: [-1303, 2010],
                ddesc: 'After <b>earning</b> an achievement <b>golden cookies</b> appear <b>10%</b> more often for an hour.<q>Scientists call it "operant conditioning". You call it "Ooh, another shiny widget to click on."</q>',
                require: ['Six bells', 'Even more unlucky luckier']
            });

            createHeavenlyUpgrade({
                name: 'Critical feedback mass', order: 1050.129, price: 7.5e23, icon: JNE.icon(14, 12, 'custom'), pos: [-1475, 1974],
                ddesc: 'Your buildings boosts their own output by <b>0.1%</b> for every <b>10</b> of that building you own.<q>Orteil claimed it couldn\'t be done and was broken but eh ok maybe this is broken I guess we will see.</q>',
                require: ['Positive feedback loop']
            });

            createHeavenlyUpgrade({
                name: 'Stacks on stacks on stacks', order: 1050.131, price: 1000e21, icon: [12, 36], pos: [-1366, 2274],
                ddesc: 'Each golden cookie clicked this ascension increases <b>CpS</b> by <b>0.05%</b>.<q>If you stack cookies high enough, they eventually start generating their own gravitational field. Useful!</q>',
                require: ['Positive feedback loop', 'Sugar baking VI']
            });

            createHeavenlyUpgrade({
                name: 'Runaway clickers', order: 1050.132, price: 1e25, icon: JNE.icon(9, 1, 'custom'), pos: [-1471, 2435],
                ddesc: 'Your click frenzies last <b>10%</b> longer.<q>You know I put a lot of effort into writing these flavor text so they are fun and whimsical with a special flair of puns and nostalgia, but it is pretty exhausting.</q>',
                require: ['Stacks on stacks on stacks']
            });

            createHeavenlyUpgrade({
                name: 'We can build up', order: 1050.133, price: 1e25, icon: JNE.icon(11, 33, 'main'), pos: [-1555, 2285],
                ddesc: 'Your building specials last <b>10%</b> longer.<q>When you are out of space just go up.</q>',
                require: ['Stacks on stacks on stacks']
            });

            createHeavenlyUpgrade({
                name: 'Unique buildings', order: 1050.135, price: 1e27, icon: JNE.icon(18, 33, 'main'), pos: [-1655, 2427],
                ddesc: 'Getting a building special for a building you already have a building special active on is slightly less likely.<q>Yes of course I want a building special, duh. No no no, not that one though, damnit.</q>',
                require: ['Runaway clickers', 'We can build up']
            });

            createHeavenlyUpgrade({
                name: 'Dark chocolate milk', order: 1050.136, price: 1e28, icon: JNE.icon(2, 8, 'main'), pos: [-1595, 2727],
                ddesc: '<b>Vanilla shadow achievements</b> now grant <b>milk</b>.<q>So dark the light doesnt even shine through anymore.</q>',
                require: ['Unique buildings', 'Sweet refunds', 'Even sweeter']
            });

            createHeavenlyUpgrade({
                name: 'Into the shadowy deep', order: 1050.137, price: 2.5e28, icon: JNE.icon(15, 15, 'custom'), pos: [-1765, 2855],
                ddesc: 'Adds <span style="text-decoration:underline;text-decoration-color:#f66;"><b style="color:#f66;">6 extremely difficult</b></span> and slightly unfair shadow achievements to the game.<q>You want more damn content? Take this content and shove it where the sun don\'t shine.</q>',
                require: ['Dark chocolate milk']
            });

            createHeavenlyUpgrade({
                name: 'Skitter skatter skrum ahh', order: 1050.026, price: 25e15, icon: [28, 11], pos: [-5, 1883],
                ddesc: '<b>Resurrect Abomination</b> spell has a <b>1%</b> chance to summon a shiny wrinkler.<q>oooooh it sparkles!</q>',
                require: ['Rare game hunter']
            });

            createHeavenlyUpgrade({
                name: 'Abra-Ka-Wiggle', order: 1050.027, price: 250e15, icon: JNE.icon(5, 16, 'custom'), pos: [-52, 1610],
                ddesc: '<b>Resurrect Abomination</b> spell has a <b>2%</b> chance to summon a shiny wrinkler.',
                require: ['Skitter skatter skrum ahh']
            });

            createHeavenlyUpgrade({
                name: 'Alakazoodle evil noodle', order: 1050.028, price: 750e15, icon: JNE.icon(14, 16, 'custom'), pos: [-278, 1393],
                ddesc: '<b>Resurrect Abomination</b> spell has a <b>3%</b> chance to summon a shiny wrinkler.<q>I think I missed this day at Hogwarts.</q>',
                require: ['Abra-Ka-Wiggle']
            });

            createHeavenlyUpgrade({
                name: 'Cockroaches', order: 1050.03, price: 50000e15, icon: [15, 12], pos: [-291, 1216],
                ddesc: 'Popping a wrinkler has a <b>1%</b> chance to summon another wrinkler immediately.<q>You know what they say, if you see one cockroach there are a thousand more just out of sight.</q>',
                require: ['Alakazoodle evil noodle']
            });

            createHeavenlyUpgrade({
                name: 'Infestation', order: 1050.031, price: 250000e15, icon: [15, 12], pos: [-144, 1346],
                ddesc: 'Popping a wrinkler has a <b>2%</b> chance to summon another wrinkler immediately.<q>Some say Wrinklers are the only thing that will survive a nuclear apocalypse, I disagree, I don\'t think nuclear weapons can hurt Nokia phones either.</q>',
                require: ['Cockroaches']
            });

            createHeavenlyUpgrade({
                name: 'Clicklers', order: 1050.032, price: 6.66e21, icon: JNE.icon(14, 27, 'custom'), pos: [-146, 1164],
                ddesc: 'A fairly uncommon subspecies of wrinkler, the <b>Clicklers</b>, consume only cookies that come from <b>clicking</b> the <b>Big Cookie</b>. This genetic variation changed their appearance and gives them a higher chance of <b>Jam Filling</b> when burst.<q>You\'re an interesting species. An interesting mix. You\'re capable of such beautiful dreams, and such horrible nightmares. You feel so lost, so cut off, so alone, only you\'re not. See, in all our searching, the only thing we\'ve found that makes the emptiness bearable, is each other.</q>',
                require: ['Infestation']
            });

            createHeavenlyUpgrade({
                name: 'The hunger grows', order: 1050.033, price: 6.66e23, icon: JNE.icon(15, 27, 'custom'), pos: [-12, 1306],
                ddesc: 'Clicklers\' appetite is <b>twice</b> as strong.<q>We cannot get out. We cannot get out... The end comes, and then drums, drums in the deep... they are coming.</q>',
                require: ['Clicklers']
            });

            createHeavenlyUpgrade({
                name: 'An interesting species', order: 1050.034, price: 6.66e25, icon: JNE.icon(16, 27, 'custom'), pos: [-2, 1128],
                ddesc: 'Clicklers are <b>twice</b> as common.<q>You know, Burke, I don\'t know which species is worse. You don\'t see them screwing each other over for a goddamn percentage.</q>',
                require: ['The hunger grows']
            });

            createHeavenlyUpgrade({
                name: 'Slimy pheromones', order: 1050.029, price: 5000e15, icon: JNE.icon(18, 26, 'custom'), pos: [-265, 1583],
                ddesc: 'If you have a shiny wrinkler on your cookie, you are <b>3x</b> as likely to attract another.<q>Here we find a rare shiny wrinkler, its skin catching the light in a way its species has no right to. Naturally, this peculiarity attracts the rest, who approach like scientists inspecting a colleague who has made a questionable life choice.</q>',
                require: ['Alakazoodle evil noodle', 'Species bounceback']
            });

            createHeavenlyUpgrade({
                name: 'Bingo center slots', order: 1050.035, price: 75e19, icon: JNE.icon(18, 24, 'custom'), pos: [-424, 1457],
                ddesc: 'Add <b>slot machines</b> to your <b>bingo centers</b>. If you own the <b>Bingo center/Research facility</b> upgrade, your grandmas can now play the slots. The more grandmas you own, the more pulls they make. <b>Jackpots</b> are rare, but you can win fabulous prizes such as cookies, golden cookies, and sugar lumps!<q>They just love sitting there all day feeding quarters into the machines. Despite the zombie-like appearance, it actually keeps them more docile.</q>',
                require: ['Slimy pheromones']
            });

            createHeavenlyUpgrade({
                name: 'When the sun goes down', order: 1050.036, price: 1.1e21, icon: JNE.icon(20, 27, 'custom'), pos: [-580, 1509],
                ddesc: 'Your grandmas are <b>twice as lucky</b> playing slots during the <b>Grandmapocalypse</b>.<q>Things really get crazy at night in the bingo halls.</q>',
                require: ['Bingo center slots']
            });

            createHeavenlyUpgrade({
                name: 'Pink stuff', order: 1050.041, price: 800e15, icon: JNE.icon(22, 20, 'custom'), pos: [-533, 1295],
                ddesc: 'Adds a switch to toggle on <b>Winklers</b> (note: <b>not</b> Wrinklers).<q>O M G SO CUTEEEEEEE!!!</q>',
                require: ['Mail in sweepstake winner', 'Alakazoodle evil noodle']
            });

            createHeavenlyUpgrade({
                name: 'Frenziered elders', order: 1050.042, price: 1500e17, icon: [2, 9], pos: [-751, 1243],
                ddesc: 'Your elder frenzies last <b>25%</b> longer. <q>The elders are really getting out of control, perhaps we should cut back on their sugar intake?</q>',
                require: ['Pink stuff']
            });

            createHeavenlyUpgrade({
                name: 'Pact with the devil', order: 1050.043, price: 9.9e21, icon: JNE.icon(29, 6, 'main'), pos: [-941, 1267],
                ddesc: 'The chances of an Elder Frenzy being found in a wrath cookie increases the more wrinklers you currently have on your cookie.<q>Golden fiddle not included.</q>',
                require: ['Frenziered elders']
            });

            createHeavenlyUpgrade({
                name: 'Creative tax evasion', order: 1050.062, price: 75e15, icon: [34, 12], pos: [552, 2152],
                ddesc: 'Negative loan effects are shorter.<q>Reducing downside exposure through aggressive imagination and creative bookkeeping.</q>',
                require: ['Wallstreet bets']
            });

            createHeavenlyUpgrade({
                name: 'The checkbox', order: 1050.127, price: 500e15, icon: JNE.icon(22, 24, 'custom'), pos: [-240, 2805],
                ddesc: 'This upgrade doesn\'t do anything.<q>Or does it...? Nope, it doesn\'t... really for sure, believe me. Well maybe I lied, maybe it does. Does it really matter in the end?</q>',
                require: ['Sugar predictor']
            });

            createHeavenlyUpgrade({
                name: 'Improved checkboxes', order: 1050.128, price: 500e18, icon: JNE.icon(22, 24, 'custom'), pos: [-379, 2924],
                ddesc: 'Your checkbox is <b>1000x</b> more powerful!<q>Still doesn\'t do anything... or does it!?</q>',
                require: ['The checkbox']
            });

            createHeavenlyUpgrade({
                name: 'The legend of Krumblor', order: 1050.134, price: 777e24, icon: JNE.icon(6, 17, 'custom'), pos: [-737, 2883],
                ddesc: 'Adds a <b>third aura slot</b> to <b>Krumblor</b> that can be unlocked by sacrificing <b>1000</b> of every building.<q>This feels like a very bad idea for so many reasons.</q>',
                require: ['Improved checkboxes']
            });

            createHeavenlyUpgrade({
                name: 'Water cooled processors', order: 1050.066, price: 250e15, icon: JNE.icon(21, 24, 'custom'), pos: [1057, 2100],
                ddesc: 'The <b>Terminal</b> minigame cooldown is reduced by <b>1 hour</b>.<q>Water and delicate electronics together at last, what\'s the worst that can happen?</q>',
                require: ['Gilded allure', 'Aerated soil']
            });

            createHeavenlyUpgrade({
                name: 'Command S', order: 1050.067, price: 3.8e17, icon: JNE.icon(8, 16, 'custom'), pos: [1089, 1948],
                ddesc: 'Adds the <b>Save Loadout</b> program to the <b>terminal minigame</b> allowing you to save and more importantly restore an entire execution queue.<q>Remember to backup your save.</q>',
                require: ['Water cooled processors']
            });

            createHeavenlyUpgrade({
                name: 'Overclocked GPUs', order: 1050.068, price: 500e15, icon: JNE.icon(20, 24, 'custom'), pos: [1216, 2071],
                ddesc: 'The <b>Terminal</b> minigame has <b>one</b> extra slot.<q>Triple the price for 3.5% more power, now with flashing LEDs.</q>',
                require: ['Water cooled processors']
            });

            createHeavenlyUpgrade({
                name: 'Divine potions', order: 1050.069, price: 7.5e17, icon: JNE.icon(2, 27, 'custom'), pos: [1328, 1952],
                ddesc: 'Your ready to use potions have a <b>10%</b> chance of being preserved through an ascension.<q>Mana from the heavens indeed!</q>',
                require: ['Overclocked GPUs']
            });

            createHeavenlyUpgrade({
                name: 'Divine reagents', order: 1050.07, price: 7.5e17, icon: JNE.icon(14, 12, 'custom'), pos: [1330, 2190],
                ddesc: 'Your stored reagents have a <b>10%</b> chance of being preserved through an ascension.<q>There are always reagents in the banana stand.</q>',
                require: ['Overclocked GPUs']
            });

            createHeavenlyUpgrade({
                name: 'Mega clicks', order: 1050.081, price: 50e19, icon: JNE.icon(9, 7, 'custom'), pos: [341, 2695],
                ddesc: '<b>1%</b> of cookie clicks are mega clicks and are <b>10x</b> more powerful than regular old clicks.<q>MEGA CLICK!!!!</q>',
                require: ['Box of overpriced donuts']
            });

            createHeavenlyUpgrade({
                name: 'Idle clicks', order: 1050.082, price: 5e21, icon: JNE.icon(14, 18, 'custom'), pos: [511, 2727],
                ddesc: 'Adds an <b>idle click meter</b> which slowly refills over time. The longer you go without clicking the more powerful your clicks become.<q>Sometimes the best way to win is to not click at all.</q>',
                require: ['Mega clicks']
            });

            createHeavenlyUpgrade({
                name: 'Better idle clicking', order: 1050.086, price: 5.25e24, icon: JNE.icon(14, 18, 'custom'), pos: [656, 2810],
                ddesc: 'Idle clicks recharge <b>10%</b> faster and are <b>10%</b> more powerful.<q>Just because we could doesn\'t mean we have to.</q>',
                require: ['Idle clicks', 'Epic clicks']
            });

            createHeavenlyUpgrade({
                name: 'Lucky mega clicks', order: 1050.083, price: 500e19, icon: JNE.icon(9, 8, 'custom'), pos: [380, 2831],
                ddesc: 'Mega clicks are now <b>50%</b> more common.<q>We can\'t believe they found a way to make mega clicks even more awesome either.</q>',
                require: ['Mega clicks']
            });

            createHeavenlyUpgrade({
                name: 'Extreme mega clicks', order: 1050.084, price: 5000e19, icon: JNE.icon(9, 10, 'custom'), pos: [469, 3013],
                ddesc: 'Mega clicks are now <b>50%</b> more powerful.<q>Extreme power for extreme clicks!</q>',
                require: ['Lucky mega clicks']
            });

            createHeavenlyUpgrade({
                name: 'Epic clicks', order: 1050.085, price: 75e22, icon: JNE.icon(9, 0, 'custom'), pos: [632, 2975],
                ddesc: '<b>1%</b> of your mega clicks are now epic clicks, and epic clicks are <b>100x</b> stronger than mega clicks.<q>These clicks are getting way out of hand, or should I say cursor.</q>',
                require: ['Extreme mega clicks']
            });

            createHeavenlyUpgrade({
                name: 'Godzamok\'s Headstart', order: 1050.061, price: 50000e15, icon: [23, 18], pos: [716, 2705],
                ddesc: '<b>Godzamok</b>\'s buffs last <b>10%</b> longer.<q>We shouldn\'t be encouraging his destructive behavior, but he is kinda cute.</q>',
                require: ['Divine uninspiration']
            });

            createHeavenlyUpgrade({
                name: 'Slightly less bitter wrath', order: 1050.096, price: 50000e15, icon: [10, 29], pos: [-1270, 1773],
                ddesc: 'Ruin cookies are found <b>5%</b> less often in wrath cookies.<q>The cookies are still ruined, but at least they are a bit less ruined.</q>',
                require: ['Even more unlucky luckier']
            });

            createHeavenlyUpgrade({
                name: 'Flavor enhanced wrath', order: 1050.097, price: 300000e15, icon: [15, 5], pos: [-1124, 1672],
                ddesc: 'Ruin cookies are found <b>10%</b> less often in wrath cookies.<q>We found a way to improve the flavor of the wrath cookies, it turns out you just need a pinch of essence of evil not the whole tablespoon we had been using.</q>',
                require: ['Slightly less bitter wrath']
            });


            createHeavenlyUpgrade({
                name: 'Unshackled sterlicious', orderAfter: 'Unshackled glimmeringue', price: 1e20, icon: JNE.icon(10, 0, 'custom'), pos: [450, 491],
                ddesc: 'Unshackles <b>Sterlicious</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>Sterlicious is a highly reflective metallic element with an unusual affinity for sugars. Its crystalline structure makes it particularly suitable for decorative confectionery, though its tendency to develop a dull appearance when placed beside Championchip has long puzzled metallurgists.</q>',
                require: ['Unshackled glimmeringue']
            });

            createHeavenlyUpgrade({
                name: 'Unshackled championchip', orderAfter: 'Unshackled sterlicious', price: 2e20, icon: JNE.icon(10, 1, 'custom'), pos: [551, 433],
                ddesc: 'Unshackles <b>Championchip</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>Championchip is a rare, golden-hued metal whose molecular structure closely resembles that of sterlicious. Despite sharing nearly identical physical properties, championchip commands a considerably higher price, a discrepancy generally attributed to its superior atomic number and better publicity.</q>',
                require: ['Unshackled sterlicious']
            });

            createHeavenlyUpgrade({
                name: 'Unshackled gumshoechew', orderAfter: 'Unshackled championchip', price: 4e20, icon: JNE.icon(10, 2, 'custom'), pos: [663, 489],
                ddesc: 'Unshackles <b>Gumshoechew</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>Gumshoechew is a dark, aromatic material whose popularity peaked during the golden age of private investigation. Its distinctive flavor develops through slow oxidation involving tobacco residue, aged spirits, and trace amounts of municipal corruption. The original formula has proven difficult to reproduce under modern food safety regulations.</q>',
                require: ['Unshackled championchip']
            });

            createHeavenlyUpgrade({
                name: 'Unshackled atomalt', orderAfter: 'Unshackled gumshoechew', price: 8e20, icon: JNE.icon(10, 3, 'custom'), pos: [788, 495],
                ddesc: 'Unshackles <b>Atomalt</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>First synthesized during the postwar technological boom, atomalt was heralded as the beginning of a new age of scientific confectionery. Its unusual crystalline structure allows it to retain heat indefinitely while producing a pleasant, malty sweetness. Early advertisements promised that every household would soon possess its own atomalt reactor, a prediction that proved somewhat optimistic.</q>',
                require: ['Unshackled gumshoechew']
            });

            createHeavenlyUpgrade({
                name: 'Unshackled groovium', orderAfter: 'Unshackled atomalt', price: 16e20, icon: JNE.icon(10, 4, 'custom'), pos: [904, 448],
                ddesc: 'Unshackles <b>Groovium</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>Groovium is an unstable compound composed almost entirely of free radicals, which show little interest in forming conventional molecular bonds. Its muted pastel hues and sweet, earthy aroma made it popular among countercultural communities, where its tendency to spread spontaneously was celebrated as a triumph of collective consciousness rather than a containment problem.</q>',
                require: ['Unshackled atomalt']
            });

            createHeavenlyUpgrade({
                name: 'Unshackled retroffee', orderAfter: 'Unshackled groovium', price: 32e20, icon: JNE.icon(10, 5, 'custom'), pos: [991, 358],
                ddesc: 'Unshackles <b>Retroffee</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>Developed during the 1970s as a practical alternative to the more experimental materials of the preceding decade, retroffee is a warm, brownish compound with a mild coffee aroma. Its remarkable stability and complete absence of unexpected properties made it particularly popular among manufacturers seeking to reassure an increasingly exhausted public.</q>',
                require: ['Unshackled groovium']
            });

            createHeavenlyUpgrade({
                name: 'Unshackled synthberry', orderAfter: 'Unshackled retroffee', price: 64e20, icon: JNE.icon(10, 6, 'custom'), pos: [1033, 240],
                ddesc: 'Unshackles <b>Synthberry</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>Advances in polymer chemistry during the 1980s made it possible to reproduce nearly any natural flavor without involving the original fruit. Synthberry was among the more successful results, finding applications in both confectionery and early personal computers, although prolonged exposure occasionally caused the latter to develop a preference for fantasy literature.</q>',
                require: ['Unshackled retroffee']
            });

            createHeavenlyUpgrade({
                name: 'Unshackled neonblast', orderAfter: 'Unshackled synthberry', price: 128e20, icon: JNE.icon(10, 7, 'custom'), pos: [1024, 115],
                ddesc: 'Unshackles <b>Neonblast</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>Neonblast is an intensely colored compound capable of producing hundreds of artificial flavors, none of which correspond to any known fruit. Its popularity surged during the 1990s, when manufacturers discovered that children consistently preferred substances with increasingly improbable colors, particularly those capable of permanently staining household furnishings.</q>',
                require: ['Unshackled synthberry']
            });

            createHeavenlyUpgrade({
                name: 'Unshackled cybercandy', orderAfter: 'Unshackled neonblast', price: 256e20, icon: JNE.icon(10, 8, 'custom'), pos: [963, 6],
                ddesc: 'Unshackles <b>Cybercandy</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>Cybercandy is a metallic, highly reflective compound whose molecular structure can be manipulated using inexpensive consumer electronics. Its discovery allowed virtually anyone to produce elaborate confectionery designs without specialized training. The resulting explosion of creativity was accompanied by a corresponding decline in aesthetic standards.</q>',
                require: ['Unshackled neonblast']
            });

            createHeavenlyUpgrade({
                name: 'Unshackled magmallow', orderAfter: 'Unshackled cybercandy', price: 512e20, icon: JNE.icon(10, 9, 'custom'), pos: [864, -70],
                ddesc: 'Unshackles <b>Magmallow</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>Magmallow is a viscous, reddish substance whose melting point varies considerably depending on whether it is being heated or cooled. This peculiar property gives it the consistency of a freshly toasted marshmallow while retaining enough internal heat to illuminate its surroundings. Its applications in confectionery and emergency lighting are still being explored.</q>',
                require: ['Unshackled cybercandy']
            });

            createHeavenlyUpgrade({
                name: 'Unshackled blazium', orderAfter: 'Unshackled magmallow', price: 1024e20, icon: JNE.icon(10, 10, 'custom'), pos: [742, -98],
                ddesc: 'Unshackles <b>Blazium</b> building upgrades, making their discounts and efficiency bonuses stronger.<q>Blazium is an extraordinarily rare compound whose deep violet crystals contain a high concentration of naturally occurring sugars and aromatic esters. Its distinctive flavor develops only when exposed to open flame, at which point it begins to burn indefinitely without losing mass. Attempts to reproduce this property artificially have yielded several promising results and considerably fewer laboratories.</q>',
                require: ['Unshackled magmallow']
            });

            createHeavenlyUpgrade({
                name: 'Permanent upgrade slot VI', orderAfter: 'Permanent upgrade slot V', price: 1e21, icon: JNE.icon(21, 27, 'custom'), permanentSlot: 5, pos: [613, 142],
                ddesc: 'Placing an upgrade in this slot will make its effects <b>permanent</b> across all playthroughs.<q>Now available in the model 6.</q>',
                require: ['Permanent upgrade slot V']
            });
            linkHeavenlyParents();
            createBoxContents();
            createUnfortunates();
            return parentUpgrade;
        }

        // ===== SAVE/LOAD SYSTEM =====
        function getHeavenlyUpgradeNames() {
            if (!Game || !Game.Upgrades) {
                return [];
            }

            var upgradeNames = [];

            // Find upgrades marked as ours, or toggle upgrades we create, or known heavenly upgrades
            for (var name in Game.Upgrades) {
                var upgrade = Game.Upgrades[name];
                if (upgrade && (upgrade._heavenlyUpgrade ||
                    name === 'Toy mode [on]' || name === 'Toy mode [off]' ||
                    name === 'Pink stuff [on]' || name === 'Pink stuff [off]' ||
                    name === 'Sugar trade' ||
                    // pre-0.6.7 save names, safe to remove after June 2027
                    (name.indexOf('Just natural expansion') === 0) ||
                    (name.indexOf('Morrowen') === 0) ||
                    (name.indexOf('Solgreth') === 0) ||
                    (name.indexOf('Sparkling sugar cane') === 0) ||
                    (name.indexOf('Krazy kudzu') === 0) ||
                    (name.indexOf('Magic mushroom') === 0) ||
                    (name.indexOf('Sugar frenzy II') === 0) ||
                    (name.indexOf('Fortune tolls') === 0) ||
                    (name.indexOf('Doordashing') === 0) ||
                    (name.indexOf('Second day') === 0) ||
                    (name.indexOf('Chinese leftovers') === 0) ||
                    (name.indexOf('Wallstreet bets') === 0) ||
                    (name.indexOf('Box of overpriced') === 0) ||
                    (name.indexOf('Aerated soil') === 0) ||
                    (name.indexOf('Plant all') === 0) ||
                    (name.indexOf('Soil inspector') === 0) ||
                    (name.indexOf('Golden stopwatch') === 0) ||
                    (name.indexOf('Wizardly accomplishments') === 0) ||
                    (name.indexOf('Gilded allure') === 0) ||
                    (name.indexOf('Skitter skatter') === 0) ||
                    (name.indexOf('Abra-Ka-Wiggle') === 0) ||
                    (name.indexOf('Alakazoodle') === 0) ||
                    (name.indexOf('Improved cookie') === 0) ||
                    (name.indexOf('Divine uninspiration') === 0) ||
                    (name.indexOf('Gilded sugar') === 0) ||
                    (name.indexOf('Improved sugar') === 0) ||
                    (name === 'Cookie image selector') ||
                    (name === 'Golden cookie sound selector') ||
                    (name === 'Sugar insight') ||
                    (name === 'Sugar predictor') ||
                    (name === 'Cyclius swatch'))) {
                    upgradeNames.push(name);
                }
            }

            return upgradeNames;
        }

        // Temple loaded and both mod gods injected (they arrive on a later check tick than the temple itself)
        function modGodsReady(M) {
            return !!(M && M.slot && M.gods && M.godsById && ['procrastination', 'selfishness'].every(function(k) { return M.gods[k] && M.gods[k].id !== undefined; }));
        }

        function collectPantheon(saveData) {
            var M = loadedMinigame('Temple');
            if (M && modGodsReady(M) && !Game.JNE._pendingPantheon) {
                if (Array.isArray(M.slot)) {
                    saveData.pantheon.slots = [];
                    var customGodKeys = ['procrastination', 'selfishness'];
                    for (var i = 0; i < M.slot.length; i++) {
                        var godId = M.slot[i];
                        if (godId !== undefined && godId !== -1 && M.godsById[godId] && M.godsById[godId].key) {
                            var godKey = M.godsById[godId].key;
                            if (customGodKeys.indexOf(godKey) !== -1) {
                                saveData.pantheon.slots[i] = godKey;
                            } else {
                                saveData.pantheon.slots[i] = -1; // Not our god, don't save
                            }
                        } else {
                            saveData.pantheon.slots[i] = -1;
                        }
                    }
                }
                if (M._procrastinationSlotTime !== undefined && M._procrastinationSlotTime !== null) {
                    saveData.pantheon.procrastinationSlotTime = M._procrastinationSlotTime;
                }
                if (M._selfishnessClickCount !== undefined) {
                    saveData.pantheon.selfishnessClickCount = M._selfishnessClickCount || 0;
                }
            } else {
                // temple not loaded, gods not injected, or block not applied yet: keep the last known block
                var held = Game.JNE._pendingPantheon || (Game.JNE.heavenlyUpgradesSavedData && Game.JNE.heavenlyUpgradesSavedData.pantheon);
                if (held) saveData.pantheon = JSON.parse(JSON.stringify(held));
            }
        }

        // Farm loaded and the three mod plants injected (they arrive on a later check tick than the farm itself)
        function modPlantsReady(M) {
            return !!(M && M.plants && M.plantsById && M.plot && MOD_PLANT_KEYS.every(function(k) { return M.plants[k] && M.plants[k].id !== undefined; }));
        }

        function collectGarden(saveData) {
            var M = loadedMinigame('Farm');
            var held = Game.JNE._pendingGarden || (Game.JNE.heavenlyUpgradesSavedData && Game.JNE.heavenlyUpgradesSavedData.garden);
            if (M && modPlantsReady(M) && !Game.JNE._pendingGarden) {
                saveData.garden.soil = M.soil || 0;
                var modPlants = [];
                var plotH = M.h || M.plot.length, plotW = M.w || (M.plot[0] && M.plot[0].length || 0);
                for (var y = 0; y < plotH; y++) {
                    if (!M.plot[y]) continue;
                    for (var x = 0; x < plotW; x++) {
                        var tile = M.plot[y][x];
                        if (tile && tile[0] > 0) {
                            var plant = M.plantsById[tile[0] - 1];
                            if (plant && plant.key && isModPlant(plant.key)) {
                                modPlants.push({x: x, y: y, plantKey: plant.key, age: tile[1] || 0});
                            }
                        }
                    }
                }
                saveData.garden.modPlants = modPlants;
                saveData.garden.modSeedsUnlocked = {};
                MOD_PLANT_KEYS.forEach(function(k) { saveData.garden.modSeedsUnlocked[k] = M.plants[k].unlocked || 0; });
            } else if (held) {
                // farm not loaded, plants not injected, or block not applied yet: keep the last known block
                saveData.garden = JSON.parse(JSON.stringify(held));
                if (M && !Game.JNE._pendingGarden) saveData.garden.soil = M.soil || 0;
            }
        }

        function collectBuffs(saveData) {
            // Save custom buffs
            if (Game.buffs) {
                var customBuffTypes = ['feedback loop', 'jam filling', 'gilded allure', 'midas curse'];
                for (var i in Game.buffs) {
                    var buff = Game.buffs[i];
                    if (buff && buff.type && buff.type.name && customBuffTypes.indexOf(buff.type.name) !== -1) {
                        var timeRemaining = buff.time ? (buff.time / Game.fps) : 0;
                        var power = buff.power || 1;
                        saveData.buffs.push({
                            type: buff.type.name,
                            time: timeRemaining,
                            power: power
                        });
                    }
                }
            }
        }

        function collectFarmDrops(saveData) {
            // Save farm drop cookies state
            saveData.farmDropCookies = {};
            var farmDropNames = ['Hearty farm biscuit', 'Astronaut cookie', 'The chemist cookie'];
            farmDropNames.forEach(function(name) {
                var upgrade = Game.Upgrades[name];
                if (upgrade) {
                    saveData.farmDropCookies[name] = {
                        unlocked: upgrade.unlocked || 0,
                        bought: upgrade.bought || 0
                    };
                }
            });
        }

        function getSaveData() {
            //Don't save while we're restoring data - prevents corruption
            if (Game.JNE._isRestoringData) {
                return Game.JNE._lastValidSaveData || Game.JNE.heavenlyUpgradesSavedData || {};
            }

            try {
                // Save data collection started
                if (!Game.JNE) Game.JNE = {};

                var saveData = { version: MOD_HU_VERSION, boughtUpgrades: [], boxRun: Game.resets, boxStart: Game.startDate, pantheon: {}, garden: {}, buffs: [], switches: {}, settings: {}, timers: {}, stats: {}, bigCookieImage: 0 };

                var upgradeNames = getHeavenlyUpgradeNames();

                upgradeNames.forEach(function(name) {
                    // Skip toggle upgrades - they're saved in switches section only
                    if (TOGGLE_NAMES.indexOf(name) !== -1) return;

                    var upgrade = Game.Upgrades[name];
                    if (upgrade && upgrade.bought) {
                        saveData.boughtUpgrades.push(name);
                    }
                });
                // keep names this build does not define so a save never drops them
                (Game.JNE._huUnknownOwned || []).forEach(function(n) {
                    if (!Game.Upgrades[n] && saveData.boughtUpgrades.indexOf(n) === -1) saveData.boughtUpgrades.push(n);
                });
                if (Game.JNE._huRevoked) saveData.revokedBackup = Game.JNE._huRevoked;
                saveData.unfortunate = unfortunates.filter(function(u) { return u.unlocked; }).map(function(u) { return u.name; });

                collectPantheon(saveData);
                collectGarden(saveData);
                collectBuffs(saveData);

                // Save switches
                saveData.switches.sugarFrenzyLastUse = Game.sugarFrenzyLastUse || 0;
                saveData.switches.sugarFrenzyPrice = Game.sugarFrenzyPrice || 1;
                saveData.switches.sugarTradeLastUse = Game.sugarTradeLastUse || 0;
                saveData.switches.sugarTradePrice = Game.sugarTradePrice || 1;
                if (Game.fortuneChimeType !== undefined) {
                    saveData.switches.fortuneChimeType = Game.fortuneChimeType;
                }
                saveData.switches.winklers = Game.WINKLERS || 0;
                saveData.switches.toys = Game.TOYS || 0;
                if (Game.Upgrades['Sugar trade']) {
                    saveData.switches.sugarTradeBought = Game.Upgrades['Sugar trade'].bought || 0;
                }

                // Save settings
                if (window.modSettings && window.modSettings.cpsDisplayUnit !== undefined) {
                    saveData.settings.cpsDisplayUnit = window.modSettings.cpsDisplayUnit;
                }

                // Save timers
                if (Game.JNE._fortuneGCTimer) saveData.timers.fortuneGCLastResetTime = Game.JNE._fortuneGCTimer;
                if (Game.JNE._fortuneCPSTimer) saveData.timers.fortuneCPSLastResetTime = Game.JNE._fortuneCPSTimer;

                saveData.stats.cookieFishCaught = Game.JNE.cookieFishCaught || 0;
                saveData.stats.bingoJackpotWins = Game.JNE.bingoJackpotWins || 0;
                saveData.stats.ascensionSpecialJackpots = Game.JNE.ascensionSpecialJackpots || 0;

                collectFarmDrops(saveData);

                saveData.bigCookieImage = Game.cookieImageType || 0;
                saveData.dragonSlot3 = Object.assign({}, dragonSlot3());
                saveData.brinklers = (Game.wrinklers || []).filter(function(w) { return w && w.phase > 0 && w.type === 2; }).length;
                saveData.brinklerStore = (Game.wrinklers || []).reduce(function(t, w) { return w && w.phase > 0 && w.type === 2 ? t + w.sucked : t; }, 0);

            // Cache this as last valid save data
            if (!Game.JNE) Game.JNE = {};
            Game.JNE._lastValidSaveData = saveData;

            return saveData;
            } catch (e) {
                console.error('[HU Save/Load] Error in getSaveData:', e);
                return Game.JNE._lastValidSaveData || {};
            }
        }

        // Save heavenly upgrades data - called during vanialla save
        function saveHeavenlyUpgradesData() {
            try {
                var saveData = getSaveData();
                if (!Game.JNE) Game.JNE = {};
                Game.JNE.heavenlyUpgradesSavedData = saveData;
            } catch (e) {
                console.error('[HU Save/Load] Error saving data:', e);
            }
        }

        // Make function globally available for main mod to call
        window.saveHeavenlyUpgradesData = saveHeavenlyUpgradesData;

        // Expose version for display in options menu
        window.HeavenlyUpgrades = { VERSION: MOD_HU_VERSION };

        function updateAllToggleStates() {
            if (Game.Has('Toy box') && Game.Upgrades['Toy mode [on]'] && Game.Upgrades['Toy mode [off]']) {
                var toys = Game.TOYS || 0;
                if (toys === 1) {
                    Game.Unlock('Toy mode [on]');
                    Game.Upgrades['Toy mode [on]'].earn();
                } else {
                    Game.Unlock('Toy mode [off]');
                    Game.Upgrades['Toy mode [off]'].earn();
                }
            }

            if (Game.Has('Pink stuff') && Game.Upgrades['Pink stuff [on]'] && Game.Upgrades['Pink stuff [off]']) {
                var winklers = Game.WINKLERS || 0;
                if (winklers === 1) {
                    Game.Unlock('Pink stuff [on]');
                    Game.Upgrades['Pink stuff [on]'].earn();
                } else {
                    Game.Unlock('Pink stuff [off]');
                    Game.Upgrades['Pink stuff [off]'].earn();
                }
            }

            if (Game.Has('Sugar for sugar trading') && Game.Upgrades['Sugar trade']) {
                if (Game.Upgrades['Sugar trade'].bought === 0 && !Game.Has('Sugar trade')) {
                    Game.Unlock('Sugar trade');
                }
            }

            Game.storeToRefresh = 1;
            Game.upgradesToRebuild = 1;
        }

        // Load function - apply save data and restore all states
        // Slotted mod gods and timers apply once the temple is loaded and the mod gods injected; until then the block is held.
        function applyPendingPantheon() {
            var p = Game.JNE && Game.JNE._pendingPantheon;
            var M = loadedMinigame('Temple');
            if (!p || !modGodsReady(M)) return false;
            M._procrastinationSlotTime = null;
            M._selfishnessClickCount = 0;

            if (p.slots) {
                for (var i = 0; i < Math.min(p.slots.length, M.slot.length); i++) {
                    var savedSlot = p.slots[i];
                    if (!savedSlot || savedSlot === -1) continue;

                    var god = null;
                    if (typeof savedSlot === 'string' && M.gods[savedSlot]) {
                        god = M.gods[savedSlot];
                    } else if (typeof savedSlot === 'number' && M.godsById[savedSlot]) {
                        god = M.godsById[savedSlot];
                    }

                    if (!god) continue;
                    if (M.slot[i] !== -1) continue;

                    if (god.upgrade && (!Game.Upgrades[god.upgrade] || !Game.Upgrades[god.upgrade].bought)) continue;

                    // Use M.slotGod to ensure hooks are called during load
                    M.slotGod(god, i);

                    var godDiv = l('templeGod' + god.id);
                    var slotDiv = l('templeSlot' + i);
                    if (godDiv && slotDiv && godDiv.parentNode !== slotDiv) {
                        slotDiv.appendChild(godDiv);
                    }
                    if (godDiv) godDiv.style.display = '';
                }

                Game.recalculateGains = true;
                if (M.draw) M.draw();
            }

            if (p.procrastinationSlotTime) M._procrastinationSlotTime = p.procrastinationSlotTime;
            if (p.selfishnessClickCount !== undefined) M._selfishnessClickCount = p.selfishnessClickCount || 0;
            Game.JNE._pendingPantheon = null; // cleared once the data is in, so a failure above is retried

            // Reapply hooks since they get overwritten during load
            applySlotGodHook(M);

            if (Game.Has('Sugar predictor')) hookSugarPredictorSlot(M);
            return true;
        }

        function restorePantheon(saveData) {
            if (!Game.JNE) Game.JNE = {};
            Game.JNE._pendingPantheon = null;
            if (!saveData.pantheon) return;
            Game.JNE._pendingPantheon = JSON.parse(JSON.stringify(saveData.pantheon));
            applyPendingPantheon();
        }

        // Seeds and planted mod plants apply once the farm is loaded and the mod plants injected; until then the block is held.
        function applyPendingGarden() {
            var g = Game.JNE && Game.JNE._pendingGarden;
            var M = loadedMinigame('Farm');
            if (!g || !modPlantsReady(M)) return false;
            if (g.modSeedsUnlocked) {
                for (var key in g.modSeedsUnlocked) {
                    if (g.modSeedsUnlocked.hasOwnProperty(key) && M.plants[key]) M.plants[key].unlocked = g.modSeedsUnlocked[key];
                }
            }
            if (g.modPlants && g.modPlants.length > 0) {
                for (var j = 0; j < g.modPlants.length; j++) {
                    var p = g.modPlants[j];
                    var plant = M.plants[p.plantKey];
                    if (plant && plant.id !== undefined) {
                        var tile = M.plot[p.y] && M.plot[p.y][p.x];
                        if (tile) {
                            var currentPlantId = tile[0];
                            var isEmptyTile = currentPlantId === 0;
                            var hasCustomPlant = false;
                            var isMeddleweed = false;
                            if (currentPlantId > 0 && M.plantsById && M.plantsById[currentPlantId - 1]) {
                                var currentPlant = M.plantsById[currentPlantId - 1];
                                hasCustomPlant = isModPlant(currentPlant.key);

                                if (currentPlant.key === 'meddleweed') isMeddleweed = true;
                            }
                            if (isEmptyTile || hasCustomPlant || isMeddleweed) {
                                tile[0] = plant.id + 1;
                                if (p.age !== undefined) tile[1] = p.age;
                            }
                        }
                    }
                }
            }
            Game.JNE._pendingGarden = null; // cleared once the data is in, so a failure above is retried
            if (M.computeEffs) M.computeEffs();
            if (M.buildPanel) {
                M.buildPanel();
                // If garden is already open, we need to rebuild again after a short delay
                if (l('gardenContent') && l('gardenContent').style.display !== 'none') {
                    setTimeout(function() {
                        if (M.buildPanel) {
                            M.buildPanel();
                        }
                    }, 50);
                }
            }
            if (M.buildPlot) M.buildPlot();
            M.toRebuild = true;
            if (M.draw) M.draw();
            return true;
        }

        function restoreGarden(saveData) {
            if (!Game.JNE) Game.JNE = {};
            Game.JNE._pendingGarden = null;
            if (!saveData.garden) return;
            var M = minigameOf('Farm');
            if (M && saveData.garden.soil !== undefined) {
                // validate soil ID (Aerated soil is created later)
                var savedSoil = saveData.garden.soil;
                if (M.soilsById && M.soilsById[savedSoil]) {
                    M.soil = savedSoil;
                } else {
                    Game.JNE._deferredGardenSoil = savedSoil;
                }
            }
            Game.JNE._pendingGarden = JSON.parse(JSON.stringify(saveData.garden));
            applyPendingGarden();
        }

        function ownedNames(saveData) {
            return Array.isArray(saveData.boughtUpgrades) ? saveData.boughtUpgrades : (Array.isArray(saveData.h) ? saveData.h : null);
        }

        // Only the versioned block parsed from the save file (identity-checked, never a snapshot or legacy data) may remove upgrades.
        function isFileBlock(saveData) {
            return !!(saveData && saveData === Game.JNE._huFileBlock && saveData.version && Array.isArray(saveData.boughtUpgrades));
        }

        // Unowns covered heavenly upgrades the save does not list (toggles and Sugar trade come back through switches).
        function revokeNotInSave(saveData) {
            var owned = {};
            currentRunNames(saveData, saveData.boughtUpgrades).forEach(function(n) { owned[n] = true; });
            var revoked = [];
            getHeavenlyUpgradeNames().forEach(function(name) {
                if (TOGGLE_NAMES.indexOf(name) !== -1 || name === 'Sugar trade') return;
                var up = Game.Upgrades[name];
                if (!up || !up.bought || owned[name]) return;
                up.bought = 0;
                if (Game.CountsAsUpgradeOwned && Game.CountsAsUpgradeOwned(up.pool)) Game.UpgradesOwned--;
                revoked.push(name);
            });
            if (revoked.length) {
                // kept in the next save so a wrong revoke can always be undone by hand
                Game.JNE._huRevoked = { at: Date.now(), names: revoked };
                Game.recalculateGains = 1;
                Game.upgradesToRebuild = 1;
                Game.storeToRefresh = 1;
                console.warn('[Heavenly Upgrades] loaded save does not own:', revoked.join(', '));
                if (Game.Notify) Game.Notify('Heavenly upgrades updated', revoked.length + ' heavenly upgrade' + (revoked.length === 1 ? '' : 's') + ' not in the loaded save ' + (revoked.length === 1 ? 'was' : 'were') + ' removed.', [10, 0], 8);
            }
            return revoked;
        }

        // migration for save bug: preserve upgrades bought in memory but missing from save
        function migrateMissingBought(saveData) {
            var owned = ownedNames(saveData);
            if (!owned) return;
            var inSave = {};
            owned.forEach(function(n) { inSave[n] = true; });
            var missing = [];
            for (var name in Game.Upgrades) {
                var u = Game.Upgrades[name];
                if (u && u._heavenlyUpgrade && u.bought && !inSave[name]) missing.push(name);
            }
            if (!missing.length) return;
            if (!saveData.boughtUpgrades) saveData.boughtUpgrades = [];
            missing.forEach(function(n) { saveData.boughtUpgrades.push(n); });
        }

        var FARM_HOOK_FLAGS = ['_gardenPlantsInjected', '_customPlantCSSAdded', '_aeratedSoilIconHooked', '_aeratedSoilTooltipHooked', '_plantHooksSetup', '_iconFixSetup', '_soilInspectorHooked'];
        var TOWER_HOOK_FLAGS = ['_gildedAllureHooked', '_gildedAllureTooltipHooked', '_shinyWrinklerHooked'];
        function clearHookFlags(building, flags) {
            var M = minigameOf(building);
            if (M) flags.forEach(function(f) { M[f] = false; });
        }

        // Reset setup 'ran' flags and minigame hook flags so vanilla-deleted upgrades/plants/spells get recreated
        function resetSetupFlags() {
            if (Game.JNE._upgradeSetups) {
                Game.JNE._upgradeSetups.forEach(function(e) {
                    if (e) e.ran = false;
                });
            }
            clearHookFlags('Farm', FARM_HOOK_FLAGS);
            clearHookFlags('Wizard tower', TOWER_HOOK_FLAGS);
        }

        function migrateGodzamokName(saveData) {
            // pre-0.6.7 save format, safe to remove after June 2027: rename "Godzmak's Headstart" (typo) to "Godzamok's Headstart"
            var _oldName = "Godzmak's Headstart";
            var _newName = "Godzamok's Headstart";
            var _hasOld = (saveData.boughtUpgrades && saveData.boughtUpgrades.indexOf(_oldName) !== -1) ||
                          (saveData.h && saveData.h.indexOf(_oldName) !== -1) ||
                          (saveData.upgrades && saveData.upgrades[_oldName]);
            if (_hasOld) {
                if (!saveData.boughtUpgrades) saveData.boughtUpgrades = [];
                if (saveData.boughtUpgrades.indexOf(_newName) === -1) {
                    saveData.boughtUpgrades.push(_newName);
                }
            }
        }

        function markBought(names) {
            names.forEach(function(n) {
                var u = Game.Upgrades[n];
                if (u) u.bought = 1;
            });
        }

        // legacy h[] fallback and `upgrades` formats are pre-0.6.7, safe to remove after June 2027
        function restoreBoughtStates(saveData) {
            var owned = ownedNames(saveData);
            if (owned) return markBought(currentRunNames(saveData, owned));
            if (!saveData.upgrades) return;
            if (Array.isArray(saveData.upgrades)) return markBought(saveData.upgrades);
            for (var name in saveData.upgrades) {
                var upgrade = Game.Upgrades[name];
                var savedData = saveData.upgrades[name];
                if (!upgrade) continue;
                upgrade.bought = savedData.bought || 0;
                if (upgrade.lasting && savedData.unlocked !== undefined) upgrade.unlocked = savedData.unlocked || 0;
            }
        }

        function applySettingsSwitchesTimers(saveData) {
            // Apply settings
            if (saveData.settings && saveData.settings.cpsDisplayUnit) {
                if (!window.modSettings) window.modSettings = {};
                window.modSettings.cpsDisplayUnit = saveData.settings.cpsDisplayUnit;
            }

            // Apply switches
            if (saveData.switches) {
                if (saveData.switches.sugarFrenzyLastUse !== undefined) {
                    Game.sugarFrenzyLastUse = saveData.switches.sugarFrenzyLastUse;
                }
                if (saveData.switches.sugarFrenzyPrice !== undefined) {
                    Game.sugarFrenzyPrice = saveData.switches.sugarFrenzyPrice || 1;
                }
                if (saveData.switches.sugarTradeLastUse !== undefined) {
                    Game.sugarTradeLastUse = saveData.switches.sugarTradeLastUse;
                }
                if (saveData.switches.sugarTradePrice !== undefined) {
                    Game.sugarTradePrice = saveData.switches.sugarTradePrice || 1;
                }
                if (saveData.switches.fortuneChimeType !== undefined) {
                    Game.fortuneChimeType = saveData.switches.fortuneChimeType;
                    // Refresh store to update fortune cookie sound selector display
                    Game.storeToRefresh = 1;
                    Game.upgradesToRebuild = 1;
                } else {
                    Game.fortuneChimeType = undefined;
                }

                // Sugar trade - sugarTradeBought tracks if used (0=available, 1=used)
                if (Game.Has('Sugar for sugar trading') && Game.Upgrades['Sugar trade']) {
                    var used = saveData.switches.sugarTradeBought || 0;
                    Game.Upgrades['Sugar trade'].bought = used;
                    if (used === 0) {
                        Game.Unlock('Sugar trade');
                    }
                }
            }

            // Apply timers
            if (!Game.JNE) Game.JNE = {};
            if (!Game.JNE.heavenlyUpgradesSavedData) Game.JNE.heavenlyUpgradesSavedData = {};
            Game.JNE._fortuneGCTimer = (saveData.timers && saveData.timers.fortuneGCLastResetTime) ? saveData.timers.fortuneGCLastResetTime : 0;
            Game.JNE._fortuneCPSTimer = (saveData.timers && saveData.timers.fortuneCPSLastResetTime) ? saveData.timers.fortuneCPSLastResetTime : 0;
        }

        function restoreStats(saveData) {
            // Apply stats BEFORE caching so the cached save data reflects restored values
            if (saveData.stats) {
                if (saveData.stats.cookieFishCaught !== undefined) Game.JNE.cookieFishCaught = saveData.stats.cookieFishCaught || 0;
                if (saveData.stats.bingoJackpotWins !== undefined) Game.JNE.bingoJackpotWins = saveData.stats.bingoJackpotWins || 0;
                if (saveData.stats.ascensionSpecialJackpots !== undefined) Game.JNE.ascensionSpecialJackpots = saveData.stats.ascensionSpecialJackpots || 0;
            }
        }

        function restoreFarmDrops(saveData) {
            // Apply farm drops
            if (saveData.farmDropCookies && Object.keys(saveData.farmDropCookies).length > 0) {
                for (var cookieName in saveData.farmDropCookies) {
                    var dropData = saveData.farmDropCookies[cookieName];
                    var upgrade = Game.Upgrades[cookieName];
                    if (upgrade) {
                        if (dropData.unlocked !== undefined) {
                            upgrade.unlocked = dropData.unlocked;
                        }
                        if (dropData.bought !== undefined) {
                            upgrade.bought = dropData.bought;
                        }
                    } else {
                    }
                }
            } else {
                // No farm drops in save data
            }
        }

        function restoreBigCookie(saveData) {
            // Apply big cookie image
            if (saveData.bigCookieImage !== undefined) {
                if (saveData.bigCookieImage >= 18 && !Game.Has('Even more cookies of unusual size')) saveData.bigCookieImage = 0;
                Game.cookieImageType = saveData.bigCookieImage;
                if (Game.Loader && Game.Loader.Replace) {
                    if (saveData.bigCookieImage !== 0 && Game.CookiesByChoice && Game.CookiesByChoice[saveData.bigCookieImage]) {
                        Game.Loader.Replace('perfectCookie.png', Game.CookiesByChoice[saveData.bigCookieImage].pic);
                    } else {
                        Game.Loader.Replace('perfectCookie.png', 'perfectCookie.png');
                    }
                }
            }
        }

        function restoreBuffs(saveData) {
            // Restore  buffs
            if (saveData.buffs && Array.isArray(saveData.buffs) && Game.gainBuff) {
                setupCustomBuffTypes();
                for (var i = 0; i < saveData.buffs.length; i++) {
                    var savedBuff = saveData.buffs[i];
                    if (savedBuff && savedBuff.type && savedBuff.time !== undefined) {
                        try {
                            Game.gainBuff(savedBuff.type, savedBuff.time, savedBuff.power || 1);
                        } catch (e) {
                            console.error('[Heavenly Upgrades] Failed to restore buff:', savedBuff.type, e);
                        }
                    }
                }
            }
        }

        function load(saveData) {
            if (!saveData || typeof saveData !== 'object') {
                return;
            }
            // no version + boughtUpgrades + upgrades = empty placeholder, ignore it (pre-0.6.7 `upgrades` part: safe to remove after June 2027)
            if (!saveData.version && !saveData.boughtUpgrades && !saveData.upgrades) {
                return;
            }

            // upgrades must exist before we restore them
            createUpgrades();
            Game.JNE = Game.JNE || {};
            Game.JNE._pendingBrinklers = saveData.brinklers || 0;
            Game.JNE._pendingBrinkStore = typeof saveData.brinklerStore === 'number' ? saveData.brinklerStore : null;

            //Check for duplicate loads before any state modifications
            if (!Game.JNE) Game.JNE = {};

            // prevent auto-saves during restoration
            Game.JNE._isRestoringData = true;
            if (Game.JNE._lastLoadData && Game.JNE._lastLoadTime &&
                Game.JNE._lastLoadTime > Date.now() - 1000) { // Within 1 second
                // But still preserve fortune chime type if it was set in this save
                if (saveData.switches && saveData.switches.fortuneChimeType !== undefined) {
                    Game.fortuneChimeType = saveData.switches.fortuneChimeType;
                }
                //Clear flag before returning or saves will be blocked forever
                Game.JNE._isRestoringData = false;
                return;
            }

            try {
            // Track this load to prevent duplicates
            if (Game.JNE.idleBar) { Game.JNE.idleBar.fill = 0; Game.JNE.idleBar.shown = 0; }
            Game.JNE._lastLoadData = JSON.stringify(saveData);
            Game.JNE._lastLoadTime = Date.now();

            var fromFile = isFileBlock(saveData);
            if (!fromFile) migrateMissingBought(saveData);

            resetSetupFlags();

            migrateGodzamokName(saveData);

            if (fromFile) revokeNotInSave(saveData);
            restoreBoughtStates(saveData);
            unlockUnfortunates(saveData);

            // must be before runUpgradeSetups so toggles get correct bought states
            if (saveData.switches) {
                if (saveData.switches.toys !== undefined) {
                    Game.TOYS = saveData.switches.toys || 0;
                }
                if (saveData.switches.winklers !== undefined) {
                    Game.WINKLERS = saveData.switches.winklers || 0;
                }
            }

            // must happen AFTER upgrade bought states AND Game.TOYS/WINKLERS are restored
            runUpgradeSetups(true);  // forceAll=true to recreate everything

            Game.JNE._huUnknownOwned = (ownedNames(saveData) || []).filter(function(n) { return !Game.Upgrades[n] && n !== "Godzmak's Headstart"; });

            // Add new pantheon spirits (doesn't recreate upgrades)
            addNewPantheonSpirits();

            syncBoxContents();

            applySettingsSwitchesTimers(saveData);

            Game.storeToRefresh = 1;
            Game.upgradesToRebuild = 1;

            updateAllToggleStates();

            restoreStats(saveData);
            Object.assign(dragonSlot3(), { unlocked: 0, aura: 0 }, saveData.dragonSlot3);

            // Cache the save that was just loaded (getSaveData() returns the previous snapshot while restoring)
            if (Game.JNE) {
                Game.JNE._lastValidSaveData = saveData;
                Game.JNE.heavenlyUpgradesSavedData = saveData;
            }

            // farm drops must exist before we restore them
            setupMagicMushroomDrops();

            restoreFarmDrops(saveData);

            restoreBigCookie(saveData);

            restoreBuffs(saveData);

            restorePantheon(saveData);

            restoreGarden(saveData);
            // applied: later loads of this same object (a settings toggle, a second init pass) only add, never remove
            if (fromFile) Game.JNE._huFileBlock = null;
            reconcileOwnedFeatures();
            } catch (err) {
                console.error('[Heavenly Upgrades] load() encountered an error:', err);
            } finally {
                if (Game.JNE) Game.JNE._isRestoringData = false;
            }
        }

        // Called by JNE's recreateUpgradesFromSaveOnly() once the module is initialized. The full load() runs on a
        // deferred timer, so ownership is applied here at once and a save fired in between cannot capture bought=0.
        function restoreBoughtNow() {
            var savedData = Game.JNE && Game.JNE.heavenlyUpgradesSavedData;
            if (!isInitialized || !savedData || !Array.isArray(savedData.boughtUpgrades)) return;

            if (isFileBlock(savedData)) revokeNotInSave(savedData);
            var owned = {};
            currentRunNames(savedData, savedData.boughtUpgrades).forEach(function(n) { owned[n] = true; });

            // toggles and Sugar trade are restored through switches by the deferred load()
            getHeavenlyUpgradeNames().forEach(function(name) {
                if (TOGGLE_NAMES.indexOf(name) !== -1 || name === 'Sugar trade') return;
                var up = Game.Upgrades[name];
                if (!up) return;
                if (owned[name]) up.bought = 1;
                else if (boxOf(name)) up.bought = 0;
            });

            syncBoxContents();
            unlockUnfortunates(savedData);
            Game.upgradesToRebuild = 1;
            Game.storeToRefresh = 1;
        }

        // Expose API
        if (!Game.JNE) Game.JNE = {};
        Game.JNE.dragonSlot3Active = krumblorActive;
        Game.JNE.getDragonAura3 = function() { return krumblorActive() ? dragonSlot3().aura : 0; };
        if (!Game.JNE.HeavenlyUpgrades) {
            Game.JNE.HeavenlyUpgrades = {
                create: createHeavenlyUpgrade,
                version: MOD_HU_VERSION,
                initialized: function() { return isInitialized; },
                getSaveData: getSaveData,
                load: load,
                restoreBoughtNow: restoreBoughtNow,
                setupBuffModifiers: setupBuffModifiers,
                internals: {
                    hookOnce: hookOnce, hookedWith: hookedWith, onBuy: onBuy, timerRow: timerRow,
                    swapCustomPlantIcon: swapCustomPlantIcon, plantStage: plantStage, plantMult: plantMult,
                    sugarCaneTotalMult: sugarCaneTotalMult, rankedBuildings: rankedBuildings, fishClip: fishClip,
                    fishTime: fishTime, setupFishShimmers: setupFishShimmers, getBoxes: getBoxes, syncBoxContents: syncBoxContents, lumpAuraState: lumpAuraState, isModPlant: isModPlant,
                    loadedMinigame: loadedMinigame, minigameOf: minigameOf, plantBaseCSS: plantBaseCSS
                }
            };
        } else {
            Game.JNE.HeavenlyUpgrades.getSaveData = getSaveData;
            Game.JNE.HeavenlyUpgrades.load = load;
            Game.JNE.HeavenlyUpgrades.restoreBoughtNow = restoreBoughtNow;
            Game.JNE.HeavenlyUpgrades.setupBuffModifiers = setupBuffModifiers;
        }

        // Expose maybeDoubleTimerSpawn globally for CCSE compatibility
        Game.JNE.maybeDoubleTimerSpawn = function(i) {
            var hasVanillaLuck = Game.Has('Distilled essence of redoubled luck');
            var hasRetripledLuck = Game.Has('Distilled essence of retripled luck');
            // cookie chain and break chain behavior: skip all doubling for timer goldens while chain depth > 0.
            if (i === 'golden' && Game.shimmerTypes && Game.shimmerTypes['golden']) {
                var gChain = Game.shimmerTypes['golden'].chain;
                if (typeof gChain === 'number' && gChain > 0) return;
            }
            // Fish: never double here.
            if (i === 'fish') return;
            if (hasRetripledLuck) {
                var chance =  0.02;
                if (jneIndependentRandom() < chance) {
                    var rExtra = new Game.shimmer(i, {_retripledLuckExtra: true});
                    if (rExtra) rExtra.spawnLead = 1;
                }
            } else if (hasVanillaLuck && Math.random() < 0.01) {
                var vExtra = new Game.shimmer(i);
                if (vExtra) vExtra.spawnLead = 1;
            }
        };
    })();
