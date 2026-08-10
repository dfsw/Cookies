// Nightfall Minigame
(function() {
'use strict';

const NIGHTFALL_VERSION = '0.0.1';

var NightfallM = {};
function getGrandma() { return Game.Objects && Game.Objects['Grandma']; }
NightfallM.parent = getGrandma() || { id: 0, level: 10, minigameName: 'Nightfall', minigameLoaded: false, minigameLoading: false, minigameDiv: null, l: null, refresh: function() {} };
if (getGrandma()) NightfallM.parent.minigame = NightfallM;

var G = {
    lastTick: 0, score: 0, time: 0, unlockedItems: {}, placedItems: [], selectedTool: null,
    isDragging: false, dragGhost: null, dragGhostX: -1, dragGhostY: -1, debugMode: true, movingPlacedId: null,
    enemies: [], enemyIdCounter: 0, simAccumulator: 0, lastFrameTime: 0, lastSpawnTime: 0, difficultyMultiplier: 1,
    gameSpeed: 1, gameOver: false, gameStarted: false, triggerTiles: [], laneItems: null,
    needsRenderPlacedItems: false, lastRenderTime: 0, attackEffects: [], distractionFx: [], killCounts: {},
    friendlyEntities: [], friendlyIdCounter: 0
};

var GRID_CELL_SIZE = 14;
var GRID_ROWS = 7;
var GRID_OFFSET_Y = 56;
var SIM_STEP = 1 / 30;

function buildTileImgHTML(count, bgUrl, tileW, tileH) {
    var html = '';
    for (var i = 0; i < count; i++) {
        html += '<img class="nightfall-tile-img" src="' + bgUrl + '" width="' + tileW + '" height="' + tileH + '" draggable="false" style="display:block;position:absolute;left:' + (i * tileW) + 'px;top:0px;width:' + tileW + 'px !important;height:' + tileH + 'px !important;max-width:' + tileW + 'px !important;max-height:' + tileH + 'px !important;padding:0 !important;margin:0 !important;border:none !important;image-rendering:pixelated;">';
    }
    return html;
}

var nightfallSheetUrl = 'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/nightfall.png';
var iconUrlCache = {};
function getIconUrl(sheet) {
    if (iconUrlCache[sheet] !== undefined) return iconUrlCache[sheet];
    var url = (sheet === 'nightfall') ? nightfallSheetUrl : ((window.getSpriteSheet ? window.getSpriteSheet(sheet) : '') || (Game.resPath + 'img/icons.png'));
    iconUrlCache[sheet] = url;
    return url;
}

function getIconPosition(item) {
    if (item._iconPos) return item._iconPos;
    var col = item.icon[0], row = item.icon[1], sheet = item.icon.length > 2 ? item.icon[2] : 'main';
    item._iconPos = { col: col, row: row, sheet: sheet, url: getIconUrl(sheet), x: col * 48, y: row * 48 };
    return item._iconPos;
}

function clearDrag() {
    G.selectedTool = null;
    G.isDragging = false;
    G.movingPlacedId = null;
    G.dragGhostX = -1;
    G.dragGhostY = -1;
    if (G.dragGhost) {
        G.dragGhost.remove();
        G.dragGhost = null;
    }
}

function getGridCols() {
    return Math.floor(NightfallM.tileBgWidth / GRID_CELL_SIZE);
}

function bindOnce(el, flagProp, eventType, handler) {
    if (!el || el[flagProp]) return;
    el[flagProp] = true;
    el.addEventListener(eventType, handler);
}

function getCursorPos() {
    return { x: (typeof NightfallM.cursorX === 'number') ? NightfallM.cursorX : Game.mouseX, y: (typeof NightfallM.cursorY === 'number') ? NightfallM.cursorY : Game.mouseY };
}

function initTriggerTiles() {
    G.triggerTiles = [];
    var cols = getGridCols();
    for (var row = 0; row < GRID_ROWS; row++) G.triggerTiles.push({ gridX: cols - 1, gridY: row });
}

function itemToGridCells(item) {
    if (item._cachedCells) return item._cachedCells;
    var w = Math.floor(item.size.w);
    var h = Math.floor(item.size.h);
    var cells = { w: w, h: h };
    item._cachedCells = cells;
    return cells;
}

function setGameLayerScroll(newLeft) {
    var leftPx = newLeft + 'px';
    var els = [NightfallM.tilesEl, NightfallM.gridEl, NightfallM.trapsEl, NightfallM.placedItemsEl, NightfallM.dragPreviewEl, NightfallM.entitiesEl];
    for (var i = 0; i < els.length; i++) if (els[i]) els[i].style.left = leftPx;
}

NightfallM.launch = function() { this.name = (getGrandma() && getGrandma().minigameName) || 'Nightfall'; };

NightfallM.init = function(div) {
    if (!div) return;
    NightfallM.div = div;
    div.style.position = 'relative';
    div.style.overflow = 'hidden';
    div.style.paddingBottom = '5px';

    if (!document.getElementById('nightfallStyles')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'nightfallStyles';
        styleEl.textContent = '@keyframes nightfallPulse{0%,100%{opacity:1}50%{opacity:0.5}}.nightfall-attacked{animation:nightfallPulse 0.5s infinite}';
        document.head.appendChild(styleEl);
    }

    var rowEl = div.parentNode;
    if (rowEl && rowEl.classList) rowEl.classList.add('onMinigame');

    var normalBgUrl = 'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/grandmaBackgroundExt.png';
    var gpocBgUrl = 'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/grandmaBackgroundExtGpoc.png';
    var startWrath = (typeof Game.elderWrath === 'number') ? Game.elderWrath : 0;
    var startBgUrl = (startWrath > 0) ? gpocBgUrl : normalBgUrl;
    var TILE_W = 128;
    var TILE_H = 140;

    var grandma = getGrandma();
    var grandmaLevel = (grandma && typeof grandma.level === 'number') ? grandma.level : 0;
    var extraWidth = 0;
    if (grandmaLevel <= 10) {
        extraWidth = grandmaLevel * 50;
    } else {
        extraWidth = 10 * 50 + (Math.min(grandmaLevel, 20) - 10) * 25;
    }
    var tileBgWidth = 450 + extraWidth;
    var containerWidth = div.clientWidth || div.offsetWidth || tileBgWidth;
    var effectiveWidth = Math.min(tileBgWidth, containerWidth);
    var tilesNeeded = Math.max(1, Math.ceil(tileBgWidth / TILE_W));
    var STRIP_W = tilesNeeded * TILE_W;
    var scrollbarDisplay = (tileBgWidth > effectiveWidth) ? 'block' : 'none';

    var tileImgs = buildTileImgHTML(tilesNeeded, startBgUrl, TILE_W, TILE_H);

    NightfallM.toolItems = [
        { type: 'Distractions', name: 'Hard Candy', health: 10, icon: [30, 10, 'main'], animation: '', cost: 100, size: { w: 2, h: 2 }, unlock: { score: 0, time: 0 }, desc: 'A sweet treat to slow the grandmas down.<q>Hard on teeth, harder on grandmas.</q>', effects: [{ text: 'Distracts nearby grandmas', positive: true }] },
        { type: 'Distractions', name: 'Fresh Cookies', health: 20, icon: [20, 33, 'main'], animation: '', cost: 140, size: { w: 2, h: 2 }, unlock: { score: 300, time: 0 }, desc: 'Freshly baked bait for the cookie horde.<q>Nothing beats the smell of fresh cookies.</q>', effects: [{ text: 'Distracts nearby grandmas', positive: true }] },
        { type: 'Distractions', name: 'Gift Package', health: 30, icon: [34, 10, 'main'], animation: '', cost: 180, size: { w: 2, h: 2 }, unlock: { score: 600, time: 0 }, desc: 'A mysterious box that lures curious grandmas.<q>It is the thought that counts.</q>', effects: [{ text: 'Distracts nearby grandmas', positive: true }] },
        { type: 'Distractions', name: 'Baby', health: 40, icon: [8, 10, 'main'], animation: '', cost: 220, size: { w: 2, h: 2 }, unlock: { score: 900, time: 0 }, desc: 'A cooing distraction that softens even the wrathful.<q>Who is a cute little distraction?</q>', effects: [{ text: 'Distracts nearby grandmas', positive: true }] },
        { type: 'Distractions', name: 'Phone Call', health: 60, icon: [0, 2, 'nightfall'], animation: '', cost: 260, size: { w: 2, h: 2 }, unlock: { score: 1200, time: 0 }, desc: 'A ringing phone that demands attention.<q>Hello? Yes, this is grandma.</q>', effects: [{ text: 'Distracts nearby grandmas', positive: true }] },
        { type: 'Distractions', name: 'Computer', health: 90, icon: [1, 2, 'nightfall'], animation: '', cost: 300, size: { w: 2, h: 2 }, unlock: { score: 1500, time: 0 }, desc: 'A glowing screen that mesmerizes the elderly.<q>They just want to forward one more email.</q>', effects: [{ text: 'Distracts nearby grandmas', positive: true }] },
        { type: 'Distractions', name: 'Slot Machine', health: 120, icon: [18, 24, 'custom'], animation: '', cost: 340, size: { w: 2, h: 2 }, unlock: { score: 1800, time: 0 }, desc: 'One-armed bandit for one-armed grandmas.<q>Jackpot of distraction.</q>', effects: [{ text: 'Distracts nearby grandmas', positive: true }] },
        { type: 'Barricades', name: 'Fence', health: 100, icon: [1, 0, 'nightfall'], animation: '', cost: 150, size: { w: 2, h: 2 }, unlock: { score: 0, time: 0 }, desc: 'A simple wooden fence to slow the advance.<q>Good fences make good defenses.</q>', effects: [{ text: 'Blocks grandma movement', positive: true }] },
        { type: 'Barricades', name: 'Detour Sign', health: 200, avoidance: 0.8, icon: [5, 0, 'nightfall'], animation: '', cost: 210, size: { w: 2, h: 2 }, unlock: { score: 400, time: 0 }, desc: 'A sign that sends grandmas the long way around.<q>Detour ahead, grandma.</q>', effects: [{ text: 'Blocks grandma movement', positive: true }, { text: '80% of grandmas will bypass to an adjacent lane', positive: true }] },
        { type: 'Barricades', name: 'Crate', health: 300, icon: [4, 0, 'nightfall'], animation: '', cost: 270, size: { w: 2, h: 2 }, unlock: { score: 800, time: 0 }, desc: 'A sturdy crate to block the path.<q>What could this crate contain!? Maybe its a golden cookie or a bomb, but its probably just even more grandmas.</q>', effects: [{ text: 'Blocks grandma movement', positive: true }, { text: 'Contains a surprise upon opening', positive: true }] },
        { type: 'Barricades', name: 'Bookcase', health: 400, icon: [0, 0, 'nightfall'], animation: '', cost: 330, size: { w: 2, h: 3 }, unlock: { score: 1200, time: 0 }, desc: 'Knowledge stacked high to hold the line.<q>Throw the book at them.</q>', effects: [{ text: 'Blocks grandma movement', positive: true }] },
        { type: 'Barricades', name: 'Sandbags', health: 500, icon: [2, 0, 'nightfall'], animation: '', cost: 390, size: { w: 2, h: 2 }, unlock: { score: 1600, time: 0 }, desc: 'Military-grade sand for military-grade grandmas.<q>Bagged and ready.</q>', effects: [{ text: 'Blocks grandma movement', positive: true }] },
        { type: 'Barricades', name: 'Filing Cabinet', health: 700, icon: [3, 0, 'nightfall'], animation: '', cost: 450, size: { w: 2, h: 3 }, unlock: { score: 2000, time: 0 }, desc: 'Bureaucratic bulk that stops grandma cold.<q>Please file your advance under denied.</q>', effects: [{ text: 'Blocks grandma movement', positive: true }] },
        { type: 'Barricades', name: 'Brick Wall', health: 1000, icon: [6, 0, 'nightfall'], animation: '', cost: 510, size: { w: 3, h: 3 }, unlock: { score: 2400, time: 0 }, desc: 'A solid brick wall, as straightforward as it gets.<q>Just another brick in the wall.</q>', effects: [{ text: 'Blocks grandma movement', positive: true }] },
        { type: 'Traps', name: 'Banana Peel', health: 30, damage: 40, range: 1, icon: [2, 1, 'nightfall'], animation: '', cost: 200, size: { w: 2, h: 2 }, unlock: {time: 60}, desc: 'A classic for a reason.<q>Watch your step, grandma.</q>', effects: [{ text: 'Damages nearby grandmas on contact', positive: true }, { text: 'Affected grandmas are slowed by 50% for 5 seconds.', positive: true }], effect: { type: 'slow', amount: 0.5, duration: 5 } },
        { type: 'Traps', name: 'Cactus', health: 50, damage: 50, range: 20, avoidance: 0.3, icon: [5, 1, 'nightfall'], animation: '', cost: 280, size: { w: 2, h: 2 }, unlock: {time: 3*60 }, desc: 'As all coyotes are well aware prickly, pointy, and precisely unpleasant.<q>Just because they look huggable doesn\'t mean you should hug.</q>', effects: [{ text: 'Damages nearby grandmas on contact', positive: true }, { text: 'More clever grandmas will step to avoid the cactus', positive: false }] },
        { type: 'Traps', name: 'Marbles', health: 30, damage: 60, range: 35, icon: [1, 1, 'nightfall'], animation: '', cost: 360, size: { w: 2, h: 2 }, unlock: {time: 5*60 }, desc: 'Small glass spheres of grandma doom.<q>Lost your marbles? Here they are.</q>', effects: [{ text: 'Damages nearby grandmas on contact', positive: true }, { text: 'May shift grandmas to an adjacent lane', positive: true }], effect: { type: 'laneShift' } },
        { type: 'Traps', name: 'Wet Floors', health: 100, damage: 70, range: 25, icon: [3, 1, 'nightfall'], animation: '', cost: 440, size: { w: 2, h: 2 }, unlock: { time: 10*60 }, desc: 'Caution: slippery when wet.<q>Liability lawsuit just waiting to happen.</q>', effects: [{ text: 'Damages nearby grandmas on contact', positive: true }, { text: 'Affected grandmas are slowed by 25% for 10 seconds.', positive: true }], effect: { type: 'slow', amount: 0.25, duration: 10 } },
        { type: 'Traps', name: 'Beehive', health: 50, damage: 80, range: 40, icon: [19, 33, 'main'], animation: '', cost: 520, size: { w: 2, h: 2 }, unlock: {time: 12*60 }, desc: 'An angry swarm that will make grandma put some hussle in her step.<q>Better bee careful.</q>', effects: [{ text: 'Damages nearby grandmas on contact', positive: true }, { text: 'Speeds grandmas up by 25% for 15 seconds', positive: false }], effect: { type: 'speed', amount: 0.25, duration: 5 } },
        { type: 'Traps', name: 'Bear Trap', health: 100, damage: 90, range: 1, icon: [4, 1, 'nightfall'], animation: '', cost: 600, size: { w: 2, h: 2 }, unlock: {time: 15*60 }, desc: 'A metal jaw ready to snap shut.<q>Do not step here.</q>', effects: [{ text: 'Stops grandmas completely for 5 seconds', positive: true }], effect: { type: 'slow', amount: 1.0, duration: 5 } },
        { type: 'Traps', name: 'Land Mine', health: 10, damage: 1000, range: 70, icon: [0, 1, 'nightfall'], animation: '', cost: 680, size: { w: 4, h: 4 }, unlock: {time: 20*60 }, desc: 'War crimes or not we are going to stop those pesky grandmas.<q>Step lively, grandma.</q>', effects: [{ text: 'Damages nearby grandmas on contact', positive: true }, { text: 'Single use only', positive: false }] },
        { type: 'Offensive', name: 'Bomb Launcher', health: 40, damage: 150, range: 130, minRange: 60, rangeType: 'circle', fireRate: 5, pierces: true, ignoresBarricades: true, icon: [0, 3, 'nightfall'], animation: '', cost: 3000, size: { w: 2, h: 2 }, unlock: { score: 1000, time: 60 }, desc: 'Launches explosive pastries at long range.<q>Cake delivered with extreme prejudice.</q>', effects: [{ text: 'Deals heavy AoE damage in a wide band', positive: true }] },
        { type: 'Offensive', name: 'Cannon', health: 45, damage: 500, range: 180, rangeType: 'lineAhead', fireRate: 3, pierces: true, ignoresBarricades: false, icon: [1, 3, 'nightfall'], animation: '', cost: 4200, size: { w: 4, h: 3 }, unlock: { score: 1600, time: 60 }, desc: 'A black-powder answer to a cookie problem.<q>Fire in the hole.</q>', effects: [{ text: 'Deals penetrating ranged damage in a straight line', positive: true },  { text: 'Cannot shoot through barricades', positive: false } ] },
        { type: 'Offensive', name: 'Burnt Toast', health: 50, damage: 15, range: 60, rangeType: 'circle', fireRate: 0.5, pierces: true, ignoresBarricades: true, icon: [5, 3, 'nightfall'], animation: '', cost: 5400, size: { w: 2, h: 2 }, unlock: { score: 2200, time: 60 }, desc: 'Charred breakfast projectiles, extra crispy.<q>Served hot and hazardous.</q>', effects: [{ text: 'Deals rapid close-range damage', positive: true }] },
        { type: 'Offensive', name: 'Paint Cans', health: 55, damage: 84, range: 80, rangeType: 'lineBoth', fireRate: 2, pierces: true, ignoresBarricades: true, icon: [2, 3, 'nightfall'], animation: '', cost: 6600, size: { w: 2, h: 2 }, unlock: { score: 2800, time: 60 }, desc: 'Splash damage in every color of the rainbow.<q>Paint the town red.</q>', effects: [{ text: 'Deals ranged damage in a swinging wave', positive: true }] },
        { type: 'Offensive', name: 'Robot Grandpas', health: 80, damage: 92, range: 100, rangeType: 'arcAhead', fireRate: 3, pierces: true, ignoresBarricades: false, icon: [3, 3, 'nightfall'], animation: '', cost: 7800, size: { w: 2, h: 2 }, unlock: { score: 3400, time: 60 }, desc: 'Mechanized grandpas programmed for combat.<q>While we still can\'t figure out where the actual grandpas have been stashed these mechanical ones are a good substitute.</q>', effects: [{ text: 'Approaches and eliminates grandmas.', positive: true }, { text: 'Heals when not engaged in combat.', positive: true }, { text: 'Damage increases each grandma eliminated.', positive: true }], placedSprite: { frameW: 64, frameH: 64, anims: { walk: { url: 'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/grandpawalk.png', frames: 9, fps: 8 }, attack: { url: 'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/grandpaattack.png', frames: 9, fps: 8 } } } },
        { type: 'Offensive', name: 'Cookie Sentry Gun', health: 65, damage: 30, range: 80, rangeType: 'arcAhead', fireRate: 1, pierces: false, ignoresBarricades: false, icon: [4, 3, 'nightfall'], animation: '', cost: 9000, size: { w: 2, h: 2 }, unlock: { score: 4000, time: 60 }, desc: 'An automated cookie-defense turret.<q>Nobody steals the cookies on its watch.</q>', effects: [{ text: 'Deals ranged damage to frontmost grandmas', positive: true }, { text: 'Cannot shoot through barricades', positive: false }] }
    ];

    NightfallM.grandmaData = [
        { file: 'alteredGrandma.png', name: 'Altered Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma summons wrinklers to do her bidding and absorb incoming damage.<q>Wrinklers are basically nature\'s bubble wrap, assuming the bubbles were alive, hungry, and deeply upsetting to look at.</q>' },
        { file: 'alternateGrandma.png', name: 'Alternative Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma comes from another dimension, but that does not make her any less deadly.<q>In her dimension, you are the grandma and she owns the bakery. Try not to think about it too hard; we certainly didn\'t.</q>' },
        { file: 'antiGrandma.png', name: 'Anti Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma controls black holes and can teleport to the location of any other grandma.<q>According to several highly respected physicists, none of this should be happening. They have since stopped returning our calls.</q>' },
        { file: 'bankGrandma.png', name: 'Bank Grandma', rarity: 8, speed: 13, damage: 8, info: 'Cold, hard, and highly motivated, this grandma smashes through defenses with exceptional force.<q>She denied your loan, froze your assets, and somehow charged the barricade a monthly maintenance fee.</q>' },
        { file: 'brainyGrandma.png', name: 'Brainy Grandma', rarity: 5, speed: 15, damage: 5, info: 'This grandma can control objects with her mind, so you do not want to find yourself on the wrong side of her gaze.<q>She can bend steel with her thoughts but still needs you to come over and change the input on the television.</q>' },
        { file: 'bunnyGrandma.png', name: 'Bunny Grandma', rarity: 0, speed: 22, damage: 5, info: 'This grandma has a spring in her step and can jump over barricades and traps.<q>She was told to act her age, but nobody could agree whether rabbit years should be multiplied or divided by seven.</q>' },
        { file: 'cloneGrandma.png', name: 'Clone Grandma', rarity: 0, speed: 14, damage: 5, info: 'When this grandma is defeated, she returns as another random type of grandma.<q>They were so preoccupied with whether they could clone grandma that they never stopped to consider whether anyone wanted two grandmas asking why they never call.</q>' },
        { file: 'cosmicGrandma.png', name: 'Cosmic Grandma', rarity: 0, speed: 20, damage: 5, info: 'This grandma carries a ray gun and knows how to use it. Her extra feet also make her faster than the average grandma.<q>In space, no one can hear you scream, but somehow everyone can still hear grandma complain that the spaceship is too cold.</q>' },
        { file: 'elfGrandma.png', name: 'Elf Grandma', rarity: 0, speed: 14, damage: 5, info: 'This festive grandma can summon attacking reindeer to charge ahead and do her bidding.<q>She has a red nose, several unpaid seasonal workers, and a very loose interpretation of workplace safety laws.</q>' },
        { file: 'farmerGrandma.png', name: 'Farmer Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma can attack from farther away thanks to the extended reach of her trusty pitchfork.<q>She wakes before sunrise, works sixteen hours, and still finds time to post twelve paragraphs online about how nobody wants to work anymore.</q>' },
        { file: 'grandma.png', name: 'Grandma', rarity: 15, speed: 12, damage: 5, info: 'Back to basics, this grandma has no special powers but is still fully capable of giving your defenses the walloping of a lifetime.<q>No lasers, no magic, no interdimensional nonsense. Just sensible shoes and forty years of unresolved family grievances.</q>' },
        { file: 'grandmasGrandma.png', name: 'Grandmas Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma comes from the past to look after her grandchild grandmas, healing them and keeping them safe.<q>She remembers when your grandma was this tall, cookies cost a nickel, and the Grandmapocalypse had decent manners.</q>' },
        { file: 'luckyGrandma.png', name: 'Lucky Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma has better luck than average and receives more favorable outcomes from events around her.<q>She has won bingo seventeen weeks in a row. The investigation remains open, but the witnesses have all received very nice fruit baskets.</q>' },
        { file: 'metaGrandma.png', name: 'Meta Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma is all grandmas at once and assumes whichever form is best suited to her current situation.<q>Her ability sounded much simpler before we had to program it. At this point she is mostly powered by switch statements and regret.</q>' },
        { file: 'minerGrandma.png', name: 'Miner Grandma', rarity: 5, speed: 10, damage: 7, info: 'This grandma spent her life in the mines and is exceptionally skilled at tearing down walls and barricades.<q>She worked the mines for fifty years without seeing daylight, which was still preferable to one afternoon helping you move apartments.</q>' },
        { file: 'rainbowGrandma.png', name: 'Rainbow Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma focuses the power of pure light into rainbow blasts that strike your defenses from afar.<q>Scientists once believed rainbows were harmless atmospheric phenomena. Scientists have been wrong about a surprising number of grandma-related subjects.</q>' },
        { file: 'scriptGrandma.png', name: 'Script Grandma', rarity: 0, speed: 14, damage: 5, info: 'The most technologically capable of all grandmas, she understands phones and computers and cannot be fooled by electronic distractions.<q>She fixed your printer, reset your router, and removed eleven browser toolbars you insist you never installed.</q>' },
        { file: 'templeGrandma.png', name: 'Temple Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma is in touch with the gods and can summon protective shields around other grandmas.<q>The gods work in mysterious ways, although lately most of those ways seem to involve granting damage resistance to elderly women in hallways.</q>' },
        { file: 'transmutedGrandma.png', name: 'Transmuted Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma creates a golden cookie when she is defeated.<q>The alchemists finally succeeded in turning grandma into gold. Unfortunately, they started with the outside and she was extremely unhappy about it.</q>' },
        { file: 'witchGrandma.png', name: 'Witch Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma spent her later years holed up in wizard towers and casts powerful spells when threatened.<q>She is not a witch because she weighs the same as a duck. We checked, and all we learned was that both the duck and grandma bite.</q>' },
        { file: 'workerGrandma.png', name: 'Worker Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma is not afraid of a hard day\'s work and uses her tools to disarm traps before they can injure anyone.<q>She can disable a pressure plate, defuse a landmine, and replace a garbage disposal, but she will still call you over to open a jar.</q>' }
    ];

    function getGrandmaSpriteBase() {
        return 'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/';
    }

    function getGrandmaTypeDefaults() {
        return {
            hp: 100, speed: 14, damage: 5, attackRange: 14, attackInterval: 1.0,
            collisionIgnore: [], abilities: [], frameW: 48, frameH: 48,
            spriteBase: getGrandmaSpriteBase(),
            anims: { walk:{row:0,frames:4,fps:8}, attack:{row:1,frames:4,fps:8}, hurt:{row:2,frames:2,fps:6} }
        };
    }

    var grandmaTypeOverrides = {
        'Bunny Grandma': { collisionIgnore: ['Barricade','Trap'] },
        'Cosmic Grandma': { attackRange: 80 },
        'Farmer Grandma': { attackRange: 35 },
        'Miner Grandma': { damageModVsType: { Barricade: 2.0 }, frameW: 64, frameH: 64, anims: { walk:{row:0,frames:9,fps:8,url:'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/minewalk.png'}, attack:{row:0,frames:9,fps:8,url:'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/mineattack.png'} } },
        'Bank Grandma': { damageModVsType: { Distraction: 1.5, Barricade: 1.5 }, frameW: 64, frameH: 64, anims: { walk:{row:0,frames:9,fps:8,url:'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/bankwalk.png'}, attack:{row:0,frames:9,fps:8,url:'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/bankattack.png'} } },
        'Brainy Grandma': { rangedAttack: true, rangedAttackRange: GRID_CELL_SIZE * 5, frameW: 64, frameH: 64, anims: { walk:{row:0,frames:9,fps:8,url:'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/brainwalk.png'}, attack:{row:0,frames:9,fps:8,url:'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/brainattack.png'} } },
        'Grandma': { frameW: 64, frameH: 64, anims: { walk:{row:0,frames:9,fps:8,url:'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/grandmawalk.png'}, attack:{row:0,frames:9,fps:8,url:'https://raw.githubusercontent.com/dfsw/Cookies/refs/heads/beta/Beta/nightfall/grandmaattack.png'} } },
        'Grandmas Grandma': { abilities: [{type:'aura', subtype:'heal', radius:60, amount:5, interval:2}] },
        'Temple Grandma': { abilities: [{type:'aura', subtype:'shield', radius:60, amount:0.5, interval:2}] },
        'Script Grandma': { statusImmune: ['Distracted'] }
    };

    var grandmaTypeCache = {};
    NightfallM.getGrandmaType = function(name) {
        if (grandmaTypeCache[name]) return grandmaTypeCache[name];
        var base = NightfallM.grandmaData.find(function(g) { return g.name === name; }) || null;
        if (!base) return null;
        var def = getGrandmaTypeDefaults();
        var over = grandmaTypeOverrides[name] || {};
        var result = Object.assign({}, def, base, over);
        if (!result.sheetUrl && base.file) result.sheetUrl = getGrandmaSpriteBase() + base.file;
        grandmaTypeCache[name] = result;
        return result;
    };

    var preloadedSprites = {};
    NightfallM.preloadGrandmaSprites = function() {
        if (!NightfallM.grandmaData) return;
        var c = document.getElementById('nightfallPreload') || (function() { var d = document.createElement('div'); d.id = 'nightfallPreload'; d.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none;'; document.body.appendChild(d); return d; })();
        NightfallM.grandmaData.forEach(function(g) {
            var t = NightfallM.getGrandmaType(g.name);
            if (!t) return;
            [t.sheetUrl].concat(t.anims ? Object.values(t.anims).map(function(a) { return a.url; }).filter(Boolean) : []).forEach(function(url) {
                if (!url || preloadedSprites[url]) return;
                preloadedSprites[url] = true;
                var img = document.createElement('img'); img.src = url; c.appendChild(img);
            });
        });
    };

    function formatCostTime(sec) {
        if (!sec) return '';
        if (sec >= 86400) { var d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), ds = d + ' day' + (d !== 1 ? 's' : ''); return h > 0 ? ds + ', ' + h + ' hour' + (h !== 1 ? 's' : '') : ds; }
        var m = sec / 60;
        return m < 60 ? Math.round(m) + ' min' : (m / 60).toFixed(1).replace(/\.0$/, '') + ' hour' + (m >= 120 ? 's' : '');
    }

    function checkCollision(gridX, gridY, item, excludeId) {
        var cells = itemToGridCells(item);
        if (gridX < 0 || gridY < 0 || gridX + cells.w > getGridCols() || gridY + cells.h > GRID_ROWS - 1) return true;
        for (var i = 0; i < G.placedItems.length; i++) {
            var placed = G.placedItems[i];
            if (excludeId && placed.id === excludeId) continue;
            var placedCells = itemToGridCells(placed.item);
            if (gridX < placed.gridX + placedCells.w && gridX + cells.w > placed.gridX && gridY < placed.gridY + placedCells.h && gridY + cells.h > placed.gridY) return true;
        }
        return false;
    }

    function renderGrid() {
        var previewEl = document.getElementById('nightfallDragPreview');
        if (!previewEl) return;
        if (!G.selectedTool || !G.isDragging) {
            previewEl.innerHTML = '';
            return;
        }
        var cols = getGridCols();
        var cells = itemToGridCells(G.selectedTool);
        var x0 = G.dragGhostX;
        var y0 = G.dragGhostY;
        var occupied = new Set();
        G.placedItems.forEach(function(p) {
            if (G.movingPlacedId && p.id === G.movingPlacedId) return;
            var pc = itemToGridCells(p.item);
            for (var py = 0; py < pc.h; py++) for (var px = 0; px < pc.w; px++) occupied.add((p.gridX + px) + ',' + (p.gridY + py));
        });
        var html = '';
        for (var dy = 0; dy < cells.h; dy++) {
            for (var dx = 0; dx < cells.w; dx++) {
                var cx = x0 + dx;
                var cy = y0 + dy;
                var outOfBounds = cx < 0 || cy < 0 || cx >= cols || cy >= GRID_ROWS - 1;
                var isOccupied = outOfBounds || occupied.has(cx + ',' + cy);
                var bgColor = isOccupied ? 'rgba(255,0,0,0.6)' : 'rgba(0,255,0,0.4)';
                html += '<div style="position:absolute;left:' + (cx * GRID_CELL_SIZE) + 'px;top:' + (GRID_OFFSET_Y + cy * GRID_CELL_SIZE) + 'px;width:' + GRID_CELL_SIZE + 'px;height:' + GRID_CELL_SIZE + 'px;border:1px solid rgba(255,255,255,0.8);box-sizing:border-box;background:' + bgColor + ';pointer-events:none;"></div>';
            }
        }
        var range = G.selectedTool.range || 0;
        if (range > 1) {
            var previewShape = G.selectedTool.type === 'Traps'
                ? { type: 'circle', x: (x0 + cells.w / 2) * GRID_CELL_SIZE, y: GRID_OFFSET_Y + (y0 + cells.h / 2) * GRID_CELL_SIZE, r: range, minR: 0 }
                : (function() { var ic = itemToGridCells(G.selectedTool); return getRangeShapeAtPos(G.selectedTool, (x0 + ic.w / 2) * GRID_CELL_SIZE, GRID_OFFSET_Y + (y0 + ic.h / 2) * GRID_CELL_SIZE, x0 * GRID_CELL_SIZE, ic); })();
            html += renderRangeShape(previewShape, 'rgba(255,255,0,0.08)', 'rgba(255,255,0,0.6)');
        }
        previewEl.innerHTML = html;
    }

    NightfallM.renderPlacedItems = function() {
        var itemsEl = document.getElementById('nightfallPlacedItems');
        var trapsEl = document.getElementById('nightfallTraps');
        if (!itemsEl || !trapsEl) return;
        var html = '';
        var trapsHtml = '';
        G.placedItems.forEach(function(placed) {
            if (G.movingPlacedId && placed.id === G.movingPlacedId) return;
            if (placed.item.placedSprite) {
                if (G.gameStarted) return;
                var ps = placed.item.placedSprite, c = getPlacedCenter(placed);
                var psUrl = ps.anims.walk ? ps.anims.walk.url : '';
                html += '<div class="nightfall-placed-item" data-id="' + placed.id + '" style="position:absolute;left:' + (placed.gridX * GRID_CELL_SIZE) + 'px;top:' + (GRID_OFFSET_Y + placed.gridY * GRID_CELL_SIZE) + 'px;width:' + (c.cells.w * GRID_CELL_SIZE) + 'px;height:' + (c.cells.h * GRID_CELL_SIZE) + 'px;cursor:pointer;pointer-events:auto;"><div style="position:absolute;left:50%;top:50%;width:' + ps.frameW + 'px;height:' + ps.frameH + 'px;background-image:url(' + psUrl + ');background-position:0px 0px;background-repeat:no-repeat;transform:translate(-50%,-50%);pointer-events:none;image-rendering:pixelated;"></div></div>';
                return;
            }
            var item = placed.item;
            var cells = itemToGridCells(item);
            var icon = getIconPosition(item), iconUrl = icon.url, iconX = icon.x, iconY = icon.y;
            var width = cells.w * GRID_CELL_SIZE;
            var height = cells.h * GRID_CELL_SIZE;
            var attackedClass = placed.beingAttacked ? ' nightfall-attacked' : '';
            var itemHtml = '<div class="nightfall-placed-item' + attackedClass + '" data-id="' + placed.id + '" style="position:absolute;left:' + (placed.gridX * GRID_CELL_SIZE) + 'px;top:' + (GRID_OFFSET_Y + placed.gridY * GRID_CELL_SIZE) + 'px;width:' + width + 'px;height:' + height + 'px;cursor:pointer;pointer-events:auto;"><div style="position:absolute;left:50%;top:50%;width:48px;height:48px;background-image:url(' + iconUrl + ');background-position:-' + iconX + 'px -' + iconY + 'px;background-repeat:no-repeat;transform:translate(-50%,-50%) scale(0.5);pointer-events:none;"></div></div>';
            if (item.type === 'Traps') {
                trapsHtml += itemHtml;
            } else {
                html += itemHtml;
            }
        });
        itemsEl.innerHTML = html;
        trapsEl.innerHTML = trapsHtml;

        if (!itemsEl._nightfallPlacedBound) { itemsEl._nightfallPlacedBound = true;
            var clickHandler = function(e) {
                if (Game.elderWrath !== 0) return;
                var itemEl = e.target.closest('.nightfall-placed-item');
                if (!itemEl) return;
                var id = parseFloat(itemEl.getAttribute('data-id'));
                var placedIndex = G.placedItems.findIndex(function(p) { return p.id === id; });
                if (placedIndex >= 0) {
                    var placed = G.placedItems[placedIndex];
                    clearDrag();
                    if (!(G.selectedTool && G.selectedTool.name === placed.item.name)) {
                        G.movingPlacedId = placed.id;
                        G.selectedTool = placed.item;
                        G.isDragging = true;
                        createDragGhost(placed.item);
                    }
                    updateToolSelection();
                    NightfallM.renderPlacedItems();
                    renderGrid();
                }
            };
            itemsEl.addEventListener('click', clickHandler);
            trapsEl.addEventListener('click', clickHandler);
        }
    }

    NightfallM.renderTools = function() {
        var contentEl = document.getElementById('nightfallToolsContent');
        if (!contentEl) return;
        if (Game.elderWrath === 0) {
            var toolItems = NightfallM.toolItems || [];
            var sections = ['Distractions', 'Barricades', 'Traps', 'Offensive'];
            var html = '';
            var allDps = [];
            for (var di = 0; di < toolItems.length; di++) {
                if (toolItems[di].type === 'Offensive') allDps.push((toolItems[di].damage || 0) / (toolItems[di].fireRate || 1));
            }
            var minDps = allDps.length ? Math.min.apply(null, allDps) : 0;
            var maxDps = allDps.length ? Math.max.apply(null, allDps) : 0;
            sections.forEach(function(type) {
                var items = toolItems.filter(function(item) { return item.type === type; });
                if (items.length === 0) return;
                html += '<div style="font-size:12px;font-weight:bold;color:#fff;padding:8px 0 2px 0;border-bottom:1px solid rgba(255,255,255,0.3);">' + type + '</div><div style="display:flex;flex-wrap:wrap;padding:4px 0 2px 0;">';
                items.forEach(function(item) {
                var icon = getIconPosition(item);
                var unlockParts = [];
                if (item.unlock.score > 0) unlockParts.push('Score of ' + item.unlock.score);
                if (item.unlock.time > 0) { var mins = Math.floor(item.unlock.time / 60), secs = item.unlock.time % 60; unlockParts.push('Surviving ' + (mins > 0 ? mins + ':' : '') + (secs < 10 && mins > 0 ? '0' : '') + secs + 's'); }
                var hasUnlock = unlockParts.length > 0, wasUnlocked = G.unlockedItems[item.name];
                if (hasUnlock && (G.debugMode || item.unlock.score <= 0 || G.score >= item.unlock.score) && (G.debugMode || item.unlock.time <= 0 || G.time >= item.unlock.time) && !wasUnlocked) { G.unlockedItems[item.name] = true; wasUnlocked = true; }
                var isLocked = hasUnlock && !wasUnlocked;
                var healthPct = item.type === 'Barricades' ? Math.min(1, Math.max(0, (item.health - 100) / 900)) : item.type === 'Distractions' ? Math.min(1, Math.max(0, (item.health - 10) / 110)) : Math.min(100, Math.max(0, item.health)) / 100;
                var damagePct = item.type === 'Traps' ? (item.damage <= 90 ? 0.05 + (Math.max(0, item.damage - 40) / 50) * 0.65 : 0.70 + (Math.min(1, (item.damage - 90) / 910)) * 0.30) : Math.min(100, Math.max(0, item.damage)) / 100;
                var dps = item.type === 'Offensive' ? (item.damage || 0) / (item.fireRate || 1) : 0;
                var dpsPct = item.type === 'Offensive' ? (maxDps === minDps ? 0.5 : 0.10 + 0.80 * ((dps - minDps) / (maxDps - minDps))) : 0;
                var costCookies = (Game.cookiesPs || 1) * item.cost, canAfford = Game.cookies >= costCookies;
                var costStr = (typeof Beautify === 'function') ? Beautify(Math.round(costCookies)) : Math.round(costCookies);
                var ft = formatFlavorText(item.desc);
                var effectsHtml = item.effects && item.effects.length ? '<div class="effects">' + item.effects.map(function(e) { return '<div class="' + (e.positive ? 'green' : 'red') + '">&bull; ' + e.text + '</div>'; }).join('') + '</div>' : '';
                var tooltipHTML = '<div style="z-index:10;padding:8px 4px;min-width:280px;position:relative;" id="tooltipNightfallTool"><div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;width:48px;height:48px;background-image:url(' + icon.url + ');background-position:-' + icon.x + 'px -' + icon.y + 'px;"></div><div class="name">' + item.name + '</div><div style="float:right;text-align:right;"><span class="price' + (canAfford ? '' : ' disabled') + '">' + costStr + '</span><div style="font-size:80%;opacity:0.8;">(' + formatCostTime(item.cost) + ' raw CpS)</div></div><div style="clear:both;"></div><div class="line"></div><div style="margin:6px 0px;font-size:11px;"><b>' + (item.type === 'Distractions' ? 'Distraction:' : 'Health:') + '</b> ' + makeBar(healthPct, '#3c3', true) + '</div>' + (item.type === 'Traps' ? '<div style="margin:6px 0px;font-size:11px;"><b>Damage:</b> ' + makeBar(damagePct, '#f80', false) + '</div>' : '') + (item.type === 'Offensive' ? '<div style="margin:6px 0px;font-size:11px;"><b>DPS:</b> ' + makeBar(dpsPct, '#f80', false) + '</div>' : '') + (hasUnlock ? '<div style="margin:6px 0px;font-size:11px;"><b>Unlocked by:</b> <span class="' + (isLocked ? 'red' : 'green') + '">' + unlockParts.join(' or ') + '</span></div>' : '') + '<div class="line"></div><div class="description">' + ft.main + '</div>' + effectsHtml + ft.flavor + (item.animation ? '<div style="padding-top:4px;font-size:11px;color:#aaa;">Animation: ' + item.animation + '</div>' : '') + '</div>';
                var isSelected = G.selectedTool && G.selectedTool.name === item.name;
                html += '<div class="nightfall-tool-slot shadowFilter' + (isLocked ? ' locked' : '') + (isSelected ? ' selected' : '') + '" data-item-name="' + item.name + '" style="width:48px;height:48px;background-image:url(' + icon.url + ');background-position:-' + icon.x + 'px -' + icon.y + 'px;margin:2px;cursor:pointer;' + (isSelected ? 'box-shadow:0 0 0 2px #fff;' : '') + '" ' + (Game.getTooltip ? Game.getTooltip(tooltipHTML, 'middle', true) : '') + '></div>';
                });
                html += '</div>';
            });
            if (html === '') {
                contentEl.innerHTML = '<div style="padding:8px;color:#aaa;">No items available.</div>';
                return;
            }
            contentEl.innerHTML = html;
            return;
        }
        var activeTab = NightfallM.activeToolTab || 'High Scores';
        var tabs = ['High Scores', 'Best Times', 'Grandmas'];
        var html = '<div style="display:flex;gap:2px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.2);">';
        tabs.forEach(function(tab) {
            html += '<a href="#" class="smallFancyButton nightfall-tab-btn' + (tab === activeTab ? '' : ' off') + '" data-tab="' + tab + '" style="flex:1;padding:4px 2px;text-align:center;">' + tab + '</a>';
        });
        html += '</div>';
        if (activeTab === 'Grandmas') {
            html += '<div style="display:flex;flex-wrap:wrap;padding:8px;align-items:flex-start;">';
            (NightfallM.grandmaData || []).forEach(function(g) {
                var ft2 = formatFlavorText(g.info);
                var kills = G.killCounts[g.name] || 0;
                var tooltipAttrs = (Game.getTooltip ? Game.getTooltip('<div style="padding:8px;min-width:220px;position:relative;"><div class="name">' + g.name + '</div><div class="description">' + ft2.main + '</div>' + ft2.flavor + (kills > 0 ? '<div class="line"></div><div style="font-size:11px;color:#fc0;">Dispatched: ' + kills + '</div>' : '') + '</div>', 'middle', true) : '');
                html += '<div style="position:relative;width:64px;height:64px;margin:2px;background-image:url(' + ((Game.resPath || 'https://orteil.dashnet.org/cookieclicker/') + 'img/' + g.file) + ');background-size:64px 64px;background-repeat:no-repeat;cursor:default;user-select:none;-webkit-user-drag:none;" ' + tooltipAttrs + '>' + (kills > 0 ? '<div style="position:absolute;top:-1px;right:-1px;min-width:14px;height:14px;padding:0 2px;background:#c00;border:1px solid #fff;color:#fff;font-size:10px;font-weight:bold;text-align:center;line-height:14px;pointer-events:none;">' + kills + '</div>' : '') + '</div>';
            });
            html += '</div>';
        } else {
            html += '<div style="min-height:80px;padding:8px;color:#aaa;">No data yet.</div>';
        }
        contentEl.innerHTML = html;
    };

    NightfallM.unlockAll = function() {
        if (!G.unlockedItems) G.unlockedItems = {};
        (NightfallM.toolItems || []).forEach(function(item) { G.unlockedItems[item.name] = true; });
        NightfallM.renderTools();
    };

    var styleId = 'nightfall-minigame-style';
    var oldStyle = document.getElementById(styleId);
    if (oldStyle) oldStyle.remove();
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = '#nightfallBG{background:url(' + (Game.resPath || 'https://orteil.dashnet.org/cookieclicker/') + 'img/shadedBorders.png),url(https://cdn.jsdelivr.net/gh/dfsw/Just-Natural-Expansion@main/assets/DownlineBG.png);background-size:100% 100%,auto;background-repeat:no-repeat,repeat;position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none;}#nightfallWrap .nightfall-tab-btn.off{opacity:0.15 !important;}.nightfall-tile-img{pointer-events:none;-webkit-user-drag:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;}.nightfall-tool-slot.locked{opacity:0.3;filter:grayscale(100%);}';
    document.head.appendChild(style);

    div.innerHTML = '<div id="nightfallBG"></div>' +
        '<div id="nightfallDrag" style="position:absolute;left:0;top:0;z-index:1000000000000;pointer-events:none;"></div>' +
        '<div id="nightfallWrap" style="position:relative;width:100%;overflow:visible;">' +
        '<div id="nightfallTiles" style="position:relative;width:' + effectiveWidth + 'px;height:' + TILE_H + 'px;overflow:hidden;cursor:grab;">' +
        '<div id="nightfallTileStrip" style="position:absolute;left:0px;top:0px;width:' + STRIP_W + 'px;height:' + TILE_H + 'px;">' + tileImgs + '</div>' +
        '<div id="nightfallGrid" style="position:absolute;left:0px;top:0px;width:' + tileBgWidth + 'px;height:' + TILE_H + 'px;z-index:2;"></div>' +
        '<div id="nightfallTraps" style="position:absolute;left:0px;top:0px;width:' + tileBgWidth + 'px;height:' + TILE_H + 'px;pointer-events:none;z-index:3;"></div>' +
        '<div id="nightfallPlacedItems" style="position:absolute;left:0px;top:0px;width:' + tileBgWidth + 'px;height:' + TILE_H + 'px;pointer-events:none;z-index:4;"></div>' +
        '<div id="nightfallDragPreview" style="position:absolute;left:0px;top:0px;width:' + tileBgWidth + 'px;height:' + TILE_H + 'px;pointer-events:none;z-index:5;"></div>' +
        '<div id="nightfallEntities" style="position:absolute;left:0px;top:0px;width:' + tileBgWidth + 'px;height:' + TILE_H + 'px;pointer-events:none;z-index:6;"></div>' +
        '</div>' +
        '<div id="nightfallStatus" style="position:relative;box-sizing:border-box;width:' + effectiveWidth + 'px;height:24px;padding:0 8px;background:#111;font-size:12px;color:#fff;text-shadow:1px 1px 2px #000;">' +
        '<span id="nightfallScore" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);">Score:</span>' +
        '<span id="nightfallTime" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);">Awaiting Grandmapocalypse</span>' +
        '</div>' +
        '<div id="nightfallScrollbar" style="position:relative;display:' + scrollbarDisplay + ';width:' + effectiveWidth + 'px;height:16px;background:rgba(0,0,0,0.3);cursor:pointer;">' +
        '<div id="nightfallScrollbarThumb" style="position:absolute;top:0px;height:100%;background:rgba(255,255,255,0.5);border-radius:4px;"></div>' +
        '</div>' +
        '<div id="nightfallTools" class="framed" style="min-height:120px;padding:8px 5px 0 8px;">' +
        '<div id="nightfallToolsContent"></div>' +
        '</div>' +
        '</div>';

    div.offsetHeight;

    var tilesEl = document.getElementById('nightfallTileStrip');
    var tilesViewport = document.getElementById('nightfallTiles');
    var scrollbarEl = document.getElementById('nightfallScrollbar');
    var scrollbarThumb = document.getElementById('nightfallScrollbarThumb');
    var timeSpan = document.getElementById('nightfallTime');

    NightfallM.timeL = timeSpan;
    NightfallM.bgUrlNormal = normalBgUrl;
    NightfallM.bgUrlGpoc = gpocBgUrl;
    NightfallM.currentBgUrl = startBgUrl;
    NightfallM.tileBgWidth = tileBgWidth;
    NightfallM.tilesEl = tilesEl;
    NightfallM.tilesViewport = tilesViewport;
    NightfallM.scrollbarEl = scrollbarEl;
    NightfallM.scrollbarThumb = scrollbarThumb;
    NightfallM.scoreEl = document.getElementById('nightfallScore');
    NightfallM.tileImgs = tilesEl ? tilesEl.querySelectorAll('.nightfall-tile-img') : [];

    renderGrid();
    NightfallM.renderPlacedItems();

    function updateScrollbarThumb() {
        var viewportWidth = tilesViewport.offsetWidth;
        var contentWidth = NightfallM.tileBgWidth || tilesEl.offsetWidth;
        var thumbWidth = Math.max(20, (viewportWidth / contentWidth) * viewportWidth);
        scrollbarThumb.style.width = thumbWidth + 'px';
        var maxScroll = Math.max(0, contentWidth - viewportWidth);
        var thumbLeft = maxScroll > 0 ? (-parseFloat(tilesEl.style.left || 0) / maxScroll) * (viewportWidth - thumbWidth) : 0;
        scrollbarThumb.style.left = thumbLeft + 'px';
    }

    updateScrollbarThumb();

    if (tilesViewport && !tilesViewport._nightfallDragBound) { tilesViewport._nightfallDragBound = true;
        var isDragging = false, dragStartX = 0, dragStartLeft = 0;
        tilesViewport.addEventListener('pointerdown', function(e) { isDragging = true; dragStartX = e.clientX; dragStartLeft = parseFloat(tilesEl.style.left || 0); tilesViewport.style.cursor = 'grabbing'; });
        window.addEventListener('pointermove', function(e) {
            if (!isDragging) return;
            var maxScroll = Math.max(0, (NightfallM.tileBgWidth || tilesEl.offsetWidth) - tilesViewport.offsetWidth);
            setGameLayerScroll(Math.max(-maxScroll, Math.min(0, dragStartLeft + (e.clientX - dragStartX))));
            updateScrollbarThumb();
        });
        window.addEventListener('pointerup', function() { if (!isDragging) return; isDragging = false; tilesViewport.style.cursor = 'grab'; });
    }

    if (scrollbarEl && !scrollbarEl._nightfallScrollbarBound) { scrollbarEl._nightfallScrollbarBound = true;
        var isThumbDragging = false, thumbStartX = 0, thumbStartLeft = 0;
        function setScrollFromThumb(newThumbLeft, viewportWidth, thumbWidth) {
            var maxScroll = Math.max(0, (NightfallM.tileBgWidth || tilesEl.offsetWidth) - viewportWidth);
            setGameLayerScroll(-(newThumbLeft / (viewportWidth - thumbWidth)) * maxScroll);
            updateScrollbarThumb();
        }
        scrollbarThumb.addEventListener('pointerdown', function(e) { e.preventDefault(); isThumbDragging = true; thumbStartX = e.clientX; thumbStartLeft = parseFloat(scrollbarThumb.style.left) || 0; scrollbarThumb.style.cursor = 'grabbing'; });
        scrollbarEl.addEventListener('pointerdown', function(e) {
            if (e.target === scrollbarThumb) return;
            var vw = tilesViewport.offsetWidth, tw = parseFloat(scrollbarThumb.style.width) || 20;
            setScrollFromThumb(Math.max(0, Math.min(vw - tw, e.clientX - scrollbarEl.getBoundingClientRect().left - tw / 2)), vw, tw);
        });
        window.addEventListener('pointermove', function(e) {
            if (!isThumbDragging) return;
            var vw = tilesViewport.offsetWidth, tw = parseFloat(scrollbarThumb.style.width) || 20;
            setScrollFromThumb(Math.max(0, Math.min(vw - tw, thumbStartLeft + e.clientX - thumbStartX)), vw, tw);
        });
        window.addEventListener('pointerup', function() { if (!isThumbDragging) return; isThumbDragging = false; scrollbarThumb.style.cursor = 'grab'; });
    }

    var toolsContentEl = document.getElementById('nightfallToolsContent');
    NightfallM.activeToolTab = NightfallM.activeToolTab || 'High Scores';
    bindOnce(toolsContentEl, '_nightfallTabBound', 'click', function(e) {
        var btn = e.target.closest('.nightfall-tab-btn');
        if (!btn) return;
        e.preventDefault();
        NightfallM.activeToolTab = btn.getAttribute('data-tab');
        NightfallM.renderTools();
    });
    NightfallM.gridEl = document.getElementById('nightfallGrid');
    NightfallM.trapsEl = document.getElementById('nightfallTraps');
    NightfallM.placedItemsEl = document.getElementById('nightfallPlacedItems');
    NightfallM.dragPreviewEl = document.getElementById('nightfallDragPreview');
    NightfallM.entitiesEl = document.getElementById('nightfallEntities');
    NightfallM.dragEl = document.getElementById('nightfallDrag');

    renderGrid();
    NightfallM.preloadGrandmaSprites();

    function placeSelectedTool(e) {
        if (!G.selectedTool || !G.isDragging || Game.elderWrath !== 0 || !NightfallM.gridEl) return;
        var shiftHeld = e && e.shiftKey;
        var gridBox = NightfallM.gridEl.getBoundingClientRect();
        var cursor = getCursorPos();
        var mx = cursor.x - gridBox.left;
        var my = cursor.y - gridBox.top;
        var gridX = Math.floor(mx / GRID_CELL_SIZE);
        var gridY = Math.floor((my - GRID_OFFSET_Y) / GRID_CELL_SIZE);
        var excludeId = (G.movingPlacedId && !shiftHeld) ? G.movingPlacedId : null;
        var collision = checkCollision(gridX, gridY, G.selectedTool, excludeId);
        if (gridX >= 0 && gridY >= 0 && !collision) {
            if (G.movingPlacedId && !(shiftHeld)) {
                var placed = G.placedItems.find(function(p) { return p.id === G.movingPlacedId; });
                if (placed) {
                    placed.gridX = gridX;
                    placed.gridY = gridY;
                    placed._center = null;
                    placed.hp = placed.item.health;
                    if (placed.item.placedSprite) {
                        for (var fi2 = 0; fi2 < G.friendlyEntities.length; fi2++) { if (G.friendlyEntities[fi2].placed === placed) { var fe2 = G.friendlyEntities[fi2]; var nc = getPlacedCenter(placed); fe2.x = nc.x; fe2.y = nc.y; fe2.homeX = nc.x; fe2.homeY = nc.y; fe2.lane = placed.gridY + Math.floor(nc.cells.h / 2); fe2.state = 'idle'; fe2.targetId = null; break; } }
                    }
                }
            } else {
                var itemHp = G.selectedTool.health;
                var newPlaced = { id: Date.now() + Math.random(), item: G.selectedTool, gridX: gridX, gridY: gridY, hp: itemHp };
                G.placedItems.push(newPlaced);
                if (G.selectedTool.placedSprite && G.gameStarted) spawnFriendlyEntity(newPlaced);
            }
            G.laneItemsDirty = true;
            if (shiftHeld) {
                G.movingPlacedId = null;
                G.isDragging = true;
            } else {
                clearDrag();
            }
            NightfallM.renderTools();
            NightfallM.renderPlacedItems();
            renderGrid();
        }
    }

    bindOnce(NightfallM.gridEl, '_nightfallGridBound', 'click', placeSelectedTool);

    bindOnce(toolsContentEl, '_nightfallToolDragBound', 'click', function(e) {
            if (Game.elderWrath !== 0) return;
            var toolSlot = e.target.closest('.nightfall-tool-slot');
            if (!toolSlot || toolSlot.classList.contains('locked')) return;
            var itemName = toolSlot.getAttribute('data-item-name');
            if (!itemName) return;
            var item = NightfallM.toolItems.find(function(i) { return i.name === itemName; });
            if (!item) return;

            removeMovingPlaced();

            if (G.selectedTool && G.selectedTool.name === itemName) {
                clearDrag();
            } else {
                clearDrag();
                G.selectedTool = item;
                G.isDragging = true;
                createDragGhost(item);
            }
            updateToolSelection();
        });

    function createDragGhost(item) {
        if (!NightfallM.dragEl) return;
        G.dragGhost = document.createElement('div');
        G.dragGhost.className = 'nightfall-tool-slot shadowFilter';
        var cells = itemToGridCells(item);
        var w = cells.w * GRID_CELL_SIZE;
        var h = cells.h * GRID_CELL_SIZE;
        G.dragGhost.style.cssText = 'position:absolute;pointer-events:none;z-index:1000000001;width:' + w + 'px;height:' + h + 'px;box-shadow:6px 6px 6px 2px #000;';
        var icon = getIconPosition(item);
        G.dragGhost.innerHTML = '<div style="position:absolute;left:50%;top:50%;width:48px;height:48px;background-image:url(' + icon.url + ');background-position:-' + icon.x + 'px -' + icon.y + 'px;background-repeat:no-repeat;transform:translate(-50%,-50%) scale(0.5);pointer-events:none;"></div>';
        NightfallM.dragEl.appendChild(G.dragGhost);
    }

    function updateToolSelection() {
        var allSlots = toolsContentEl.querySelectorAll('.nightfall-tool-slot');
        allSlots.forEach(function(slot) {
            slot.style.boxShadow = '';
            slot.classList.remove('selected');
        });
        if (G.selectedTool) {
            var selectedSlot = toolsContentEl.querySelector('[data-item-name="' + G.selectedTool.name + '"]');
            if (selectedSlot) {
                selectedSlot.style.boxShadow = '0 0 0 2px #fff';
                selectedSlot.classList.add('selected');
            }
        }
    }

    function onResize() {
        if (!NightfallM.div) return;
        var newContainerWidth = NightfallM.div.clientWidth || NightfallM.div.offsetWidth || NightfallM.tileBgWidth;
        var newEffectiveWidth = Math.min(NightfallM.tileBgWidth, newContainerWidth);
        var newTilesNeeded = Math.max(1, Math.ceil(NightfallM.tileBgWidth / TILE_W));
        var newStripW = newTilesNeeded * TILE_W;
        var newScrollbarDisplay = (NightfallM.tileBgWidth > newEffectiveWidth) ? 'block' : 'none';
        var bgUrl = NightfallM.currentBgUrl || startBgUrl;
        tilesViewport.style.width = newEffectiveWidth + 'px';        tilesEl.style.width = newStripW + 'px';

        var layerEls = [NightfallM.gridEl, NightfallM.trapsEl, NightfallM.placedItemsEl, NightfallM.dragPreviewEl, NightfallM.entitiesEl];
        for (var li = 0; li < layerEls.length; li++) if (layerEls[li]) layerEls[li].style.width = NightfallM.tileBgWidth + 'px';
        setGameLayerScroll(Math.max(-Math.max(0, NightfallM.tileBgWidth - newEffectiveWidth), Math.min(0, parseFloat(tilesEl.style.left || 0))));
        tilesEl.innerHTML = buildTileImgHTML(newTilesNeeded, bgUrl, TILE_W, TILE_H);
        NightfallM.tileImgs = tilesEl.querySelectorAll('.nightfall-tile-img');
        var statusEl = document.getElementById('nightfallStatus');
        if (statusEl) statusEl.style.width = newEffectiveWidth + 'px';
        if (scrollbarEl) { scrollbarEl.style.width = newEffectiveWidth + 'px'; scrollbarEl.style.display = newScrollbarDisplay; }
        updateScrollbarThumb();
        NightfallM.renderPlacedItems();
        renderGrid();
    }

    if (!NightfallM._resizeObserver && typeof ResizeObserver !== 'undefined') {
        NightfallM._resizeObserver = new ResizeObserver(function() { onResize(); });
        NightfallM._resizeObserver.observe(NightfallM.div);
    }

    bindOnce(div, '_nightfallCancelBound', 'click', function(e) {
        if (!G.isDragging) return;
        if (e.target.closest('#nightfallGrid, .nightfall-placed-item, .nightfall-tool-slot')) return;
        removeMovingPlaced();
        clearDrag();
        NightfallM.renderTools();
        NightfallM.renderPlacedItems();
        renderGrid();
    });

    bindOnce(div, '_nightfallPointerBound', 'pointerdown', function(e) {
        NightfallM.cursorX = e.clientX;
        NightfallM.cursorY = e.clientY;
    });
    if (!NightfallM._pointerMoveBound) { NightfallM._pointerMoveBound = true;
        window.addEventListener('pointermove', function(e) {
            if (G.isDragging) {
                NightfallM.cursorX = e.clientX;
                NightfallM.cursorY = e.clientY;
            }
        });
    }

    NightfallM.renderGrid = renderGrid;
    NightfallM.launched = true;
};

function getLaneY(lane) {
    return GRID_OFFSET_Y + lane * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
}

function makeBar(pct, color, marginRight) {
    var w = pct * 100;
    var mr = marginRight ? 'margin-right:8px;' : '';
    return '<div style="display:inline-block;vertical-align:middle;width:80px;height:8px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.2);position:relative;' + mr + '"><div style="position:absolute;left:0;top:0;bottom:0;background:' + color + ';width:' + w + '%;"></div><div style="position:absolute;top:-2px;left:' + w + '%;width:2px;height:12px;background:#fff;transform:translateX(-50%);"></div></div>';
}

function removeMovingPlaced() {
    if (!G.movingPlacedId) return;
    var idx = G.placedItems.findIndex(function(p) { return p.id === G.movingPlacedId; });
    if (idx >= 0) {
        G.placedItems.splice(idx, 1);
        G.laneItemsDirty = true;
        NightfallM.renderPlacedItems();
    }
}

function formatFlavorText(text) {
    var parts = text.split('<q>');
    var main = parts[0] || '';
    var flavor = parts.length > 1 ? '<q>' + parts.slice(1).join('<q>') : '';
    return { main: main, flavor: flavor };
}

function activateMinigame(grandma, delay) {
    setTimeout(function() {
        if (!grandma || grandma.onMinigame) return;
        if (grandma.switchMinigame) { grandma.switchMinigame(true); return; }
        grandma.onMinigame = 1;
        var specialEl = document.getElementById('rowSpecial' + grandma.id);
        if (specialEl) specialEl.style.display = 'block';
        var rowEl = document.getElementById('row' + grandma.id);
        if (rowEl) rowEl.classList.add('onMinigame');
        if (typeof grandma.refresh === 'function') grandma.refresh();
    }, delay || 100);
}

var LANE_WEIGHTS = [0, 4, 5, 6, 6, 6, 3];
var LANE_TOTAL_WEIGHT = LANE_WEIGHTS.reduce(function(a, b) { return a + b; }, 0);

function pickWeightedLane() {
    var roll = Math.random() * LANE_TOTAL_WEIGHT;
    var acc = 0;
    for (var li = 0; li < LANE_WEIGHTS.length; li++) {
        acc += LANE_WEIGHTS[li];
        if (roll < acc) return Math.max(0, li - 2);
    }
    return Math.max(0, LANE_WEIGHTS.length - 1 - 2);
}

function removePlacedItem(placed) {
    var idx = G.placedItems.indexOf(placed);
    if (idx !== -1) G.placedItems.splice(idx, 1);
    for (var fi = 0; fi < G.friendlyEntities.length; fi++) { if (G.friendlyEntities[fi].placed === placed) { G.friendlyEntities.splice(fi, 1); break; } }
    G.laneItemsDirty = true;
    G.needsRenderPlacedItems = true;
}

function updateEntityAnim(obj, anims, dt) {
    var anim = anims && anims[obj.anim];
    if (!anim) return;
    obj.frameTimer += dt;
    var fd = 1 / anim.fps;
    while (obj.frameTimer >= fd) { obj.frameTimer -= fd; obj.frame = (obj.frame + 1) % anim.frames; }
}

var _enemyBox = { left: 0, top: 0, w: GRID_CELL_SIZE, h: GRID_CELL_SIZE * 3 };
function getEnemyBox(x, lane, w) {
    _enemyBox.left = x - (w || GRID_CELL_SIZE) / 2;
    _enemyBox.top = GRID_OFFSET_Y + (lane - 1) * GRID_CELL_SIZE;
    _enemyBox.w = w || GRID_CELL_SIZE;
    return _enemyBox;
}

function distSqToBox(box, px, py) {
    var nx = Math.max(box.left, Math.min(px, box.left + box.w));
    var ny = Math.max(box.top, Math.min(py, box.top + box.h));
    var dx = nx - px, dy = ny - py;
    return dx * dx + dy * dy;
}

var _footprintCache = {};
function getFootprintLanes(lane) {
    var cached = _footprintCache[lane];
    if (cached) return cached;
    var lanes = [lane];
    if (lane - 1 >= 0) lanes.push(lane - 1);
    if (lane + 1 < GRID_ROWS) lanes.push(lane + 1);
    return _footprintCache[lane] = lanes;
}

function getRangeShapeAtPos(item, cx, cy, leftX, cells) {
    var range = item.range || 0, rangeType = item.rangeType, minRange = item.minRange || 0;
    cells = cells || itemToGridCells(item);
    if (rangeType === 'circle') return { type: 'circle', x: cx, y: cy, r: range, minR: minRange };
    if (rangeType === 'lineAhead') return { type: 'rect', left: leftX - range, top: cy - cells.h * GRID_CELL_SIZE / 2, w: range, h: cells.h * GRID_CELL_SIZE };
    if (rangeType === 'lineBoth') return { type: 'rect', left: leftX - range, top: cy - cells.h * GRID_CELL_SIZE / 2, w: range * 2 + cells.w * GRID_CELL_SIZE, h: cells.h * GRID_CELL_SIZE };
    if (rangeType === 'arcAhead') return { type: 'arc', x: cx, y: cy, leftX: leftX, range: range, arcWide: range * 0.6, arcNarrow: (cells.h * GRID_CELL_SIZE) / 3 };
    return null;
}

function fxToShape(fx) {
    if (fx.rangeType === 'circle') return { type: 'circle', x: fx.x, y: fx.y, r: fx.range, minR: fx.minRange || 0 };
    if (fx.rangeType === 'lineAhead') return { type: 'rect', left: fx.x - fx.range, top: fx.y - GRID_CELL_SIZE, w: fx.range, h: GRID_CELL_SIZE * 2 };
    if (fx.rangeType === 'lineBoth') return { type: 'rect', left: fx.x - fx.range, top: fx.y - GRID_CELL_SIZE, w: fx.range * 2, h: GRID_CELL_SIZE * 2 };
    if (fx.rangeType === 'arcAhead') return { type: 'arc', x: fx.x, y: fx.y, leftX: fx.x, range: fx.range, arcWide: fx.range * 0.6, arcNarrow: (2 * GRID_CELL_SIZE) / 3 };
    if (fx.rangeType === 'wave') return { type: 'rect', left: fx.x - 3, top: fx.y - GRID_CELL_SIZE, w: 6, h: GRID_CELL_SIZE * 2 };
    return null;
}

function renderRangeShape(shape, fillClr, strokeClr) {
    if (!shape) return '';
    if (shape.type === 'circle') {
        var html = '';
        if (shape.minR > 0) html += '<div style="position:absolute;left:' + (shape.x - shape.minR) + 'px;top:' + (shape.y - shape.minR) + 'px;width:' + (shape.minR * 2) + 'px;height:' + (shape.minR * 2) + 'px;border:2px dashed rgba(255,200,0,0.5);border-radius:50%;pointer-events:none;box-sizing:border-box;"></div>';
        html += '<div style="position:absolute;left:' + (shape.x - shape.r) + 'px;top:' + (shape.y - shape.r) + 'px;width:' + (shape.r * 2) + 'px;height:' + (shape.r * 2) + 'px;border:2px solid ' + strokeClr + ';border-radius:50%;background:' + fillClr + ';pointer-events:none;box-sizing:border-box;"></div>';
        return html;
    }
    if (shape.type === 'rect') return '<div style="position:absolute;left:' + shape.left + 'px;top:' + shape.top + 'px;width:' + shape.w + 'px;height:' + shape.h + 'px;border:2px solid ' + strokeClr + ';background:' + fillClr + ';pointer-events:none;box-sizing:border-box;"></div>';
    if (shape.type === 'arc') {
        var svgW = shape.range, svgH = shape.arcWide * 2, midY = shape.arcWide;
        return '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" style="position:absolute;left:' + (shape.leftX - shape.range) + 'px;top:' + (shape.y - shape.arcWide) + 'px;width:' + svgW + 'px;height:' + svgH + 'px;pointer-events:none;overflow:visible;"><polygon points="' + svgW + ',' + (midY - shape.arcNarrow) + ' 0,0 0,' + svgH + ' ' + svgW + ',' + (midY + shape.arcNarrow) + '" fill="' + fillClr + '" stroke="' + strokeClr + '" stroke-width="2"/></svg>';
    }
    return '';
}

var _laneFindBuf = [];
function findItemsInLanes(x, w, lanes, category) {
    var laneItems = G.laneItems;
    if (!laneItems) return _laneFindBuf.length = 0, _laneFindBuf;
    var left = x - w / 2, right = x + w / 2, found = _laneFindBuf;
    found.length = 0;
    for (var li = 0; li < lanes.length; li++) {
        var items = laneItems[lanes[li]]; if (!items) continue;
        items = items[category];
        for (var i = 0; i < items.length; i++) {
            var placed = items[i];
            if (placed._laneSeen) continue;
            var c = getPlacedCenter(placed);
            if (right <= c.leftX || left >= c.rightX) continue;
            placed._laneSeen = true;
            found.push(placed);
        }
    }
    for (var fi = 0; fi < found.length; fi++) found[fi]._laneSeen = false;
    return found;
}

function getOverlapCells(x, lane, w, placed) {
    var cells = itemToGridCells(placed.item);
    var gLeft = Math.floor((x - w / 2) / GRID_CELL_SIZE), gRight = Math.floor((x + w / 2 - 0.001) / GRID_CELL_SIZE);
    var xOverlap = Math.min(gRight, placed.gridX + cells.w - 1) - Math.max(gLeft, placed.gridX) + 1;
    if (xOverlap <= 0) return 0;
    var gTop = Math.max(0, lane - 1), gBot = Math.min(GRID_ROWS - 1, lane + 1);
    var yOverlap = Math.min(gBot, placed.gridY + cells.h - 1) - Math.max(gTop, placed.gridY) + 1;
    return yOverlap > 0 ? xOverlap * yOverlap : 0;
}

function findCollisionAt(x, lane, w) {
    w = w || GRID_CELL_SIZE;
    var items = findItemsInLanes(x, w, getFootprintLanes(lane), 'nonTraps');
    if (items.length === 0) return null;
    var blocking = null, blockingCells = 0, distractions = [], bestDist = null, bestDistCells = 0;
    for (var i = 0; i < items.length; i++) {
        var c = getOverlapCells(x, lane, w, items[i]);
        if (items[i].item.type === 'Distractions') { distractions.push(items[i]); if (c > bestDistCells) { bestDist = items[i]; bestDistCells = c; } }
        else if (c > blockingCells) { blocking = items[i]; blockingCells = c; }
    }
    if (distractions.length > 0) return { primary: bestDist, distractions: distractions, deepOverlap: true };
    if (blocking) return { primary: blocking, distractions: distractions, deepOverlap: true };
    return null;
}


var SPAWN_CONFIG = {
    startRate: 0.1429, endRate: 3.0, rampTime: 1200, intervalFluctuationMin: 0.85,
    intervalFluctuationMax: 1.15, maxActiveEnemies: 250, healthRampRate: 0.015
};

function getSpawnInterval(timeSeconds) {
    var t = Math.min(timeSeconds / SPAWN_CONFIG.rampTime, 1), eased = t * t * (3 - 2 * t);
    var rate = SPAWN_CONFIG.startRate + (SPAWN_CONFIG.endRate - SPAWN_CONFIG.startRate) * eased;
    var fluctuation = SPAWN_CONFIG.intervalFluctuationMin + Math.random() * (SPAWN_CONFIG.intervalFluctuationMax - SPAWN_CONFIG.intervalFluctuationMin);
    return (1 / rate) * fluctuation;
}

function pickGrandmaTypeToSpawn(timeSeconds) {
    if (pickGrandmaTypeToSpawn._totalRarity === undefined) {
        var sum = 0;
        for (var ri = 0; ri < NightfallM.grandmaData.length; ri++) {
            sum += NightfallM.grandmaData[ri].rarity;
        }
        pickGrandmaTypeToSpawn._totalRarity = sum;
    }
    var totalRarity = pickGrandmaTypeToSpawn._totalRarity;
    var roll = Math.random() * totalRarity;
    var accumulated = 0;
    for (var i = 0; i < NightfallM.grandmaData.length; i++) {
        accumulated += NightfallM.grandmaData[i].rarity;
        if (roll < accumulated) {
            return NightfallM.getGrandmaType(NightfallM.grandmaData[i].name);
        }
    }
    return NightfallM.getGrandmaType('Grandma');
}

function spawnEnemy(type, lane, xOffset) {
    if (!type) return null;
    lane = Math.max(0, Math.min(GRID_ROWS - 1, lane));
    var w = type.frameW;
    var speedVariance = 0.80 + Math.random() * 0.4;
    var enemy = {
        id: ++G.enemyIdCounter, type: type, x: -w - 4 + (xOffset || 0), y: getLaneY(lane), lane: lane,
        hp: type.hp * G.difficultyMultiplier, maxHp: type.hp * G.difficultyMultiplier, speed: type.speed,
        speedVariance: speedVariance, anim: 'walk', frame: 0, frameTimer: 0, attackCooldown: 0, isDead: false
    };
    G.enemies.push(enemy);
    return enemy;
}

function applyTrapEffect(enemy, trapDamage, effect) {
    applyDamageToEnemy(enemy, trapDamage);
    if (effect) {
        if (effect.type === 'slow' || effect.type === 'speed') {
            enemy.speedModifier = effect.amount;
            enemy.speedModifierType = effect.type;
            enemy.speedModifierTimer = effect.duration;
        } else if (effect.type === 'laneShift') {
            var validDirs = [];
            if (enemy.lane - 1 >= 0) validDirs.push(-1);
            if (enemy.lane + 1 < GRID_ROWS) validDirs.push(1);
            if (validDirs.length > 0) {
                var newLane = enemy.lane + validDirs[Math.floor(Math.random() * validDirs.length)];
                enemy.lane = newLane;
                enemy.y = getLaneY(newLane);
            }
        }
    }
}

function triggerTrap(trap, triggeringEnemy) {
    var trapDamage = trap.item.damage || 0;
    var trapRange = trap.item.range;
    var effect = trap.item.effect;

    if (!triggeringEnemy.isDead) {
        triggeringEnemy.trapsTriggered = triggeringEnemy.trapsTriggered || {};
        triggeringEnemy.trapsTriggered[trap.id] = true;
        applyTrapEffect(triggeringEnemy, trapDamage, effect);
    }

    var now = Date.now() / 1000;
    var cooldownElapsed = !trap.lastTriggerTime || (now - trap.lastTriggerTime >= 2);
    if (!cooldownElapsed) return;
    trap.lastTriggerTime = now;
    trap.hp -= 10;
    var trapDestroyed = trap.hp <= 0;
    var c = getPlacedCenter(trap);
    var trapRangePx = trapRange <= 1 ? 0 : trapRange;
    for (var i = 0; i < G.enemies.length; i++) {
        var otherEnemy = G.enemies[i];
        if (otherEnemy.isDead) continue;
        if (otherEnemy === triggeringEnemy) continue;
        if (!otherEnemy.trapsTriggered) otherEnemy.trapsTriggered = {};
        if (otherEnemy.trapsTriggered[trap.id]) continue;
        var box = getEnemyBox(otherEnemy.x, otherEnemy.lane);
        var inRange = trapRange > 1 && distSqToBox(box, c.x, c.y) <= trapRangePx * trapRangePx;
        if (inRange) {
            otherEnemy.trapsTriggered[trap.id] = true;
            applyTrapEffect(otherEnemy, trapDamage, effect);
        }
    }
    if (trapDestroyed) removePlacedItem(trap);
}

var AVOIDANCE_LOOKAHEAD = GRID_CELL_SIZE * 2;
var RANGED_ATTACK_LOOKAHEAD = GRID_CELL_SIZE * 5;

function findRangedTarget(enemy) {
    var range = enemy.type.rangedAttackRange || RANGED_ATTACK_LOOKAHEAD;
    var frontX = enemy.x + GRID_CELL_SIZE / 2;
    var attackReach = frontX + range;
    var scanRange = range * 2 + GRID_CELL_SIZE;
    var items = findItemsInLanes(frontX + scanRange / 2, scanRange, getFootprintLanes(enemy.lane), 'nonTraps');
    if (items.length === 0) return null;
    var nearestWeapon = null, weaponLeft = Infinity;
    var nearestBarricade = null, barricadeLeft = Infinity;
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var left = getPlacedCenter(it).leftX;
        if (left < enemy.x) continue;
        if (it.item.type === 'Offensive' && left < weaponLeft) { nearestWeapon = it; weaponLeft = left; }
        else if (it.item.type === 'Barricades' && left < barricadeLeft) { nearestBarricade = it; barricadeLeft = left; }
    }
    if (nearestWeapon && weaponLeft <= attackReach) return nearestWeapon;
    if (nearestWeapon && nearestBarricade && weaponLeft <= barricadeLeft + range) return null;
    if (nearestBarricade && frontX < barricadeLeft && barricadeLeft <= attackReach) return nearestBarricade;
    return null;
}

function checkAvoidanceItems(enemy) {
    if (enemy.laneShiftTargetY != null) return;
    var items = findItemsInLanes(enemy.x + AVOIDANCE_LOOKAHEAD / 2, GRID_CELL_SIZE + AVOIDANCE_LOOKAHEAD, getFootprintLanes(enemy.lane), 'avoidanceItems');
    if (items.length === 0) return;
    var item = items[0];
    if (!enemy.avoidanceChecked) enemy.avoidanceChecked = {};
    if (enemy.avoidanceChecked[item.id]) return;
    enemy.avoidanceChecked[item.id] = true;
    if (!G.debugMode && Math.random() >= item.item.avoidance) return;
    var c = getPlacedCenter(item), upLane = item.gridY - 2, downLane = item.gridY + c.cells.h + 1, targetLane = null;
    if (upLane >= 0 && downLane < GRID_ROWS) targetLane = Math.random() < 0.5 ? upLane : downLane;
    else if (upLane >= 0) targetLane = upLane;
    else if (downLane < GRID_ROWS) targetLane = downLane;
    if (targetLane === 0 || targetLane === 1) return;
    enemy.laneShiftTargetY = enemy.y + (targetLane - enemy.lane) * GRID_CELL_SIZE;
    enemy.laneShiftTargetLane = targetLane;
}

function triggerCrateOpen(placed) {
    var c = getPlacedCenter(placed);
    var crateLane = placed.gridY + Math.floor(c.cells.h / 2);
    if (crateLane < 0) crateLane = 0;
    if (crateLane >= GRID_ROWS) crateLane = GRID_ROWS - 1;
    var roll = Math.random();
    if (roll < 0.70) {
        var count = 1 + Math.floor(Math.random() * 5);
        for (var gi = 0; gi < count; gi++) {
            var type = pickGrandmaTypeToSpawn(G.time);
            var spawnLane = Math.floor(Math.random() * (GRID_ROWS - 2));
            var enemy = spawnEnemy(type, spawnLane, 0);
            if (enemy) {
                enemy.x = c.x + (Math.random() - 0.5) * c.cells.w * GRID_CELL_SIZE;
                enemy.y = getLaneY(spawnLane);
                enemy.spawnDelay = 0.5;
            }
        }
        G.attackEffects.push({ x: c.x, y: c.y, range: 20, minRange: 0, rangeType: 'circle', life: 0.4, maxLife: 0.4 });
    } else if (roll < 0.90) {
        for (var ei = 0; ei < G.enemies.length; ei++) {
            var enemy2 = G.enemies[ei];
            if (enemy2.isDead) continue;
            var ddx = enemy2.x - c.x, ddy = enemy2.y - c.y;
            if (ddx * ddx + ddy * ddy <= 35 * 35) applyDamageToEnemy(enemy2, 50);
        }
        G.attackEffects.push({ x: c.x, y: c.y, range: 35, minRange: 0, rangeType: 'circle', life: 0.5, maxLife: 0.5 });
    } else if (Game.shimmer) {
        new Game.shimmer('golden', roll < 0.95 ? {noWrath: true} : {wrath: true});
    }
}

var _friendlyByLane = null;
function buildFriendlyLaneCache() {
    _friendlyByLane = [];
    for (var l = 0; l < GRID_ROWS; l++) _friendlyByLane.push([]);
    for (var fi = 0; fi < G.friendlyEntities.length; fi++) {
        var fe = G.friendlyEntities[fi];
        if (fe.isDead) continue;
        if (_friendlyByLane[fe.lane]) _friendlyByLane[fe.lane].push(fe);
    }
}

function findFriendlyTarget(enemy) {
    if (!G.friendlyEntities.length) return null;
    if (!_friendlyByLane) buildFriendlyLaneCache();
    for (var dl = 0; dl <= 1; dl++) {
        for (var s = dl === 0 ? 0 : -1; s <= 1; s += 2) {
            var lane = enemy.lane + s * dl;
            if (lane < 0 || lane >= GRID_ROWS) continue;
            var ents = _friendlyByLane[lane];
            if (!ents) continue;
            for (var fi = 0; fi < ents.length; fi++) {
                var fe = ents[fi];
                if (Math.abs(enemy.x - fe.x) <= GRID_CELL_SIZE) return fe;
            }
        }
    }
    return null;
}

function enemyAttackPlaced(enemy, target, dt) {
    enemy.anim = 'attack';
    if (!target.beingAttacked) target.beingAttacked = true;
    enemy.attackCooldown += dt;
    if (enemy.attackCooldown >= enemy.type.attackInterval) {
        enemy.attackCooldown -= enemy.type.attackInterval;
        if (target.hp !== undefined) { target.hp -= enemy.type.damage; if (target.hp <= 0) { if (target.item.name === 'Crate') triggerCrateOpen(target); removePlacedItem(target); } }
    }
    updateEntityAnim(enemy, enemy.type.anims, dt);
}

function updateEnemy(enemy, dt) {
    if (enemy.isDead) return;
    if (enemy.spawnDelay > 0) { enemy.spawnDelay -= dt; return; }
    if (!enemy.trapsTriggered) enemy.trapsTriggered = {};
    checkAvoidanceItems(enemy);
    var overlappingTraps = findItemsInLanes(enemy.x, GRID_CELL_SIZE, getFootprintLanes(enemy.lane), 'traps');
    for (var ti = 0; ti < overlappingTraps.length; ti++) {
        if (enemy.isDead) break;
        if (!enemy.trapsTriggered[overlappingTraps[ti].id]) triggerTrap(overlappingTraps[ti], enemy);
    }
    if (enemy.isDead) return;
    var collision = findCollisionAt(enemy.x, enemy.lane), animHandled = false;
    var rangedTarget = enemy.type.rangedAttack ? findRangedTarget(enemy) : null;
    var friendlyTarget = findFriendlyTarget(enemy);
    if (rangedTarget) {
        enemyAttackPlaced(enemy, rangedTarget, dt); animHandled = true;
    } else if (friendlyTarget) {
        enemy.anim = 'attack';
        if (!friendlyTarget.placed.beingAttacked) friendlyTarget.placed.beingAttacked = true;
        enemy.attackCooldown += dt;
        if (enemy.attackCooldown >= enemy.type.attackInterval) { enemy.attackCooldown -= enemy.type.attackInterval; friendlyTarget.placed.hp -= enemy.type.damage; }
        updateEntityAnim(enemy, enemy.type.anims, dt); animHandled = true;
    } else if (collision) {
        var primary = collision.primary;
        if (primary.item && primary.item.type === 'Distractions') { enemy.anim = 'walk'; enemy.frame = 0; }
        else { enemyAttackPlaced(enemy, primary, dt); animHandled = true; }
        if (collision.distractions.length > 0) {
            var closest = collision.distractions.reduce(function(a, b) { return Math.abs(enemy.x - b.gridX * GRID_CELL_SIZE) < Math.abs(enemy.x - a.gridX * GRID_CELL_SIZE) ? b : a; });
            closest.triggered = true; closest.grandmaCount = (closest.grandmaCount || 0) + 1;
        }
    } else { enemy.anim = 'walk'; enemy.attackCooldown = 0; }
    var speedMult = 1, isBlocked = collision ? collision.deepOverlap : false;
    if (rangedTarget || friendlyTarget) isBlocked = true;
    if (enemy.speedModifierTimer && enemy.speedModifierTimer > 0) {
        enemy.speedModifierTimer -= dt;
        if (enemy.speedModifierTimer <= 0) { enemy.speedModifier = 0; enemy.speedModifierType = null; enemy.speedModifierTimer = 0; }
        else if (enemy.speedModifierType === 'slow') speedMult = 1 - enemy.speedModifier;
        else if (enemy.speedModifierType === 'speed') speedMult = 1 + enemy.speedModifier;
    }
    if (!isBlocked) enemy.x += enemy.speed * enemy.speedVariance * speedMult * dt;
    if (enemy.laneShiftTargetY != null) {
        var dy = enemy.laneShiftTargetY - enemy.y, step = 40 * dt;
        if (Math.abs(dy) <= step) { enemy.y = enemy.laneShiftTargetY; enemy.lane = enemy.laneShiftTargetLane; enemy.laneShiftTargetY = null; enemy.laneShiftTargetLane = null; enemy.avoidanceChecked = {}; }
        else enemy.y += Math.sign(dy) * step;
    }
    var enemyGridX = (enemy.x / GRID_CELL_SIZE) | 0, enemyGridY = ((enemy.y - GRID_OFFSET_Y) / GRID_CELL_SIZE) | 0;
    if (enemyGridX >= getGridCols() - 1 && enemyGridY >= 0 && enemyGridY < GRID_ROWS) {
        enemy.isDead = true; G.gameOver = true;
        console.log('Nightfall game over');
    }
    if (!animHandled) { if (isBlocked || speedMult <= 0) { enemy.anim = 'walk'; enemy.frame = 0; } else updateEntityAnim(enemy, enemy.type.anims, dt); }
}

function applyDamageToEnemy(enemy, damage) {
    var actualDamage = Math.min(damage, Math.max(0, enemy.hp));
    enemy.hp -= actualDamage;
    var scoreRatio = enemy.maxHp > 0 ? enemy.type.hp / enemy.maxHp : 1;
    G.score += actualDamage * scoreRatio;
    if (enemy.hp <= 0) { enemy.isDead = true; G.killCounts[enemy.type.name] = (G.killCounts[enemy.type.name] || 0) + 1; }
}

function getPlacedCenter(placed) {
    if (placed._center) return placed._center;
    var cells = itemToGridCells(placed.item);
    placed._center = {
        x: (placed.gridX + cells.w / 2) * GRID_CELL_SIZE,
        y: GRID_OFFSET_Y + (placed.gridY + cells.h / 2) * GRID_CELL_SIZE,
        leftX: placed.gridX * GRID_CELL_SIZE,
        rightX: (placed.gridX + cells.w) * GRID_CELL_SIZE,
        topY: GRID_OFFSET_Y + placed.gridY * GRID_CELL_SIZE,
        botY: GRID_OFFSET_Y + (placed.gridY + cells.h) * GRID_CELL_SIZE,
        cells: cells
    };
    return placed._center;
}

function getEnemiesInRangeAt(ent) {
    if (!G.enemies.length) return [];
    var placed = ent.placed, item = placed.item, cells = itemToGridCells(item);
    var leftX = ent.x - cells.w * GRID_CELL_SIZE / 2;
    var shape = getRangeShapeAtPos(item, ent.x, ent.y, leftX, cells);
    if (!shape) return [];
    var maxRange = item.range || 0;
    var result = [];
    for (var ei = 0; ei < G.enemies.length; ei++) {
        var enemy = G.enemies[ei];
        if (enemy.isDead) continue;
        var dx = enemy.x - ent.x;
        if (dx > maxRange + GRID_CELL_SIZE || dx < -(maxRange + GRID_CELL_SIZE)) continue;
        if (isEnemyInOffensiveRange(enemy, shape) && !isBarricadeBlocking(placed, enemy.x)) result.push(enemy);
    }
    return result;
}

function isEnemyInOffensiveRange(enemy, shape) {
    var r = getEnemyBox(enemy.x, enemy.lane);
    if (shape.type === 'circle') {
        if (distSqToBox(r, shape.x, shape.y) > shape.r * shape.r) return false;
        if (shape.minR > 0) {
            var fx = (shape.x < r.left + r.w / 2) ? r.left + r.w : r.left;
            var fy = (shape.y < r.top + r.h / 2) ? r.top + r.h : r.top;
            var fdx = fx - shape.x, fdy = fy - shape.y;
            if (fdx * fdx + fdy * fdy < shape.minR * shape.minR) return false;
        }
        return true;
    }
    if (shape.type === 'rect') {
        return r.left + r.w > shape.left && r.left < shape.left + shape.w &&
            r.top + r.h > shape.top && r.top < shape.top + shape.h;
    }
    if (shape.type === 'arc') {
        if (r.left + r.w <= shape.leftX - shape.range || r.left >= shape.leftX) return false;
        var checkX = Math.max(r.left, shape.leftX - shape.range);
        var progress = (shape.leftX - checkX) / shape.range;
        var halfWidth = shape.arcNarrow + progress * (shape.arcWide - shape.arcNarrow);
        return r.top + r.h > shape.y - halfWidth && r.top < shape.y + halfWidth;
    }
    return false;
}

function isBarricadeBlocking(placed, enemyX) {
    if (placed.item.ignoresBarricades) return false;
    var c = getPlacedCenter(placed);
    var minX = Math.min(c.leftX, enemyX), maxX = Math.max(c.rightX, enemyX);
    var lanes = G.laneItems;
    if (!lanes) return false;
    var topLane = Math.floor((c.topY - GRID_OFFSET_Y) / GRID_CELL_SIZE);
    var botLane = Math.floor((c.botY - GRID_OFFSET_Y - 1) / GRID_CELL_SIZE);
    for (var lane = topLane; lane <= botLane; lane++) {
        var ld = lanes[lane]; if (!ld) continue;
        for (var i = 0; i < ld.nonTraps.length; i++) {
            var barricade = ld.nonTraps[i];
            if (barricade === placed || barricade.item.type !== 'Barricades') continue;
            var bc = getPlacedCenter(barricade);
            if ((bc.leftX > minX && bc.leftX < maxX) || (bc.rightX > minX && bc.rightX < maxX)) return true;
        }
    }
    return false;
}

var FRIENDLY_SPEED = 20;
var FRIENDLY_ATTACK_INTERVAL = 0.7;
var FRIENDLY_HEAL_OUT = 1;
var FRIENDLY_HEAL_HOME = 10;
var FRIENDLY_KILL_DAMAGE_BONUS = 5;

function spawnFriendlyEntity(placed) {
    var c = getPlacedCenter(placed), ps = placed.item.placedSprite;
    var ent = { id: ++G.friendlyIdCounter, placed: placed, x: c.x, y: c.y, lane: placed.gridY + Math.floor(c.cells.h / 2),
        homeX: c.x, homeY: c.y, maxHp: placed.item.health, speed: FRIENDLY_SPEED, damage: placed.item.damage, baseDamage: placed.item.damage,
        state: 'idle', targetId: null, anim: 'walk', frame: 0, frameTimer: 0, attackCooldown: 0, facing: 1, healAccum: 0, isDead: false, fadeTimer: 0,
        frameW: ps.frameW, frameH: ps.frameH, anims: ps.anims };
    placed._friendlyId = ent.id;
    G.friendlyEntities.push(ent);
    return ent;
}

function acquireNewTarget(ent) {
    var inRange = getEnemiesInRangeAt(ent).filter(function(e) { return e.x >= 0; });
    if (inRange.length) {
        inRange.sort(function(a, b) { return b.x - a.x; });
        ent.targetId = inRange[0].id;
        return inRange[0];
    }
    ent.targetId = null;
    return null;
}

function moveFriendlyToward(ent, tx, ty, dt, placed) {
    var dx = tx - ent.x, dy = ty - ent.y, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) return;
    var nx = ent.x + (dx / dist) * ent.speed * dt;
    var ny = ent.y + (dy / dist) * ent.speed * dt;
    var newLane = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor((ny - GRID_OFFSET_Y) / GRID_CELL_SIZE)));
    if (!isBarricadeAt(nx, newLane, placed)) {
        ent.x = Math.max(0, nx); ent.y = ny; ent.lane = newLane;
    } else {
        var targetLane = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor((ty - GRID_OFFSET_Y) / GRID_CELL_SIZE)));
        var laneDir = (targetLane > ent.lane) ? 1 : (targetLane < ent.lane) ? -1 : (ent.lane > 0 ? -1 : 1);
        for (var attempt = 0; attempt < 2; attempt++) {
            var dir = (attempt === 0) ? laneDir : -laneDir;
            var altLane = ent.lane + dir;
            if (altLane < 0 || altLane >= GRID_ROWS) continue;
            var altY = ent.y + dir * ent.speed * dt;
            var altLaneClamped = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor((altY - GRID_OFFSET_Y) / GRID_CELL_SIZE)));
            if (!isBarricadeAt(ent.x, altLaneClamped, placed)) {
                ent.y = altY; ent.lane = altLaneClamped;
                break;
            }
        }
    }
    if (Math.abs(dx) > 0.5) ent.facing = dx > 0 ? -1 : 1;
}

function syncPlacedToEntity(ent) {
    var placed = ent.placed;
    if (!placed) return;
    var cells = itemToGridCells(placed.item);
    var newGridX = Math.round((ent.x - cells.w * GRID_CELL_SIZE / 2) / GRID_CELL_SIZE);
    var newGridY = Math.round((ent.y - GRID_OFFSET_Y - cells.h * GRID_CELL_SIZE / 2) / GRID_CELL_SIZE);
    if (newGridX !== placed.gridX || newGridY !== placed.gridY) {
        placed.gridX = newGridX;
        placed.gridY = newGridY;
        placed._center = null;
        G.laneItemsDirty = true;
    }
}

function updateFriendlyEntities(dt) {
    for (var fi = G.friendlyEntities.length - 1; fi >= 0; fi--) {
        var ent = G.friendlyEntities[fi], placed = ent.placed;
        if (!placed) { G.friendlyEntities.splice(fi, 1); continue; }
        if (placed.hp <= 0 && !ent.isDead) { ent.isDead = true; ent.fadeTimer = 0.3; ent.state = 'idle'; ent.targetId = null; }
        if (ent.isDead) continue;

        var target = null;
        if (ent.targetId != null) { for (var ei = 0; ei < G.enemies.length; ei++) { if (G.enemies[ei].id === ent.targetId && !G.enemies[ei].isDead) { target = G.enemies[ei]; break; } } }
        if (target && target.x < 0) { target = null; ent.targetId = null; }

        if (ent.state === 'idle') {
            target = acquireNewTarget(ent);
            if (target) { ent.state = 'walking'; }
            else { ent.anim = 'walk'; ent.frame = 0; ent.frameTimer = 0; }
        }

        if (ent.state === 'walking') {
            if (!target) {
                target = acquireNewTarget(ent);
                if (!target) { ent.state = 'returning'; }
            }
            if (target) {
                var dx = target.x - ent.x, dy = target.y - ent.y, dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= GRID_CELL_SIZE) { ent.state = 'attacking'; }
                else {
                    moveFriendlyToward(ent, target.x, target.y, dt, placed);
                    ent.anim = 'walk'; updateEntityAnim(ent, ent.anims, dt);
                }
            }
        }

        if (ent.state === 'attacking') {
            if (!target) {
                target = acquireNewTarget(ent);
                if (!target) { ent.state = 'returning'; }
            }
            if (target) {
                if (Math.abs(target.x - ent.x) > GRID_CELL_SIZE * 1.5 || Math.abs(target.y - ent.y) > GRID_CELL_SIZE * 1.5) { ent.state = 'walking'; }
                else {
                    if (Math.abs(target.x - ent.x) > 0.5) ent.facing = target.x > ent.x ? -1 : 1;
                    ent.anim = 'attack'; ent.attackCooldown += dt;
                    if (ent.attackCooldown >= FRIENDLY_ATTACK_INTERVAL) {
                        ent.attackCooldown -= FRIENDLY_ATTACK_INTERVAL;
                        var wasAlive = !target.isDead;
                        applyDamageToEnemy(target, ent.damage);
                        if (wasAlive && target.isDead) ent.damage += FRIENDLY_KILL_DAMAGE_BONUS;
                    }
                    updateEntityAnim(ent, ent.anims, dt);
                }
            }
        }

        if (ent.state === 'returning') {
            var hdx = ent.homeX - ent.x, hdy = ent.homeY - ent.y, hdist = Math.sqrt(hdx * hdx + hdy * hdy);
            if (hdist <= 2) { ent.x = ent.homeX; ent.y = ent.homeY; ent.state = 'idle'; ent.anim = 'walk'; ent.frame = 0; ent.frameTimer = 0; ent.facing = 1; }
            else {
                moveFriendlyToward(ent, ent.homeX, ent.homeY, dt, placed);
                ent.anim = 'walk'; updateEntityAnim(ent, ent.anims, dt);
            }
        }

        if (placed.hp < ent.maxHp) {
            ent.healAccum += dt;
            var healRate = ent.state === 'idle' ? FRIENDLY_HEAL_HOME : FRIENDLY_HEAL_OUT;
            var healAmount = Math.floor(ent.healAccum * healRate);
            if (healAmount > 0) { placed.hp = Math.min(ent.maxHp, placed.hp + healAmount); ent.healAccum -= healAmount / healRate; }
        }

        syncPlacedToEntity(ent);
    }
}

function isBarricadeAt(x, lane, self) {
    var items = G.laneItems && G.laneItems[lane] ? G.laneItems[lane].nonTraps : null;
    if (!items) return false;
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it === self || it.item.type !== 'Barricades') continue;
        var c = getPlacedCenter(it);
        if (x + GRID_CELL_SIZE / 2 > c.leftX && x - GRID_CELL_SIZE / 2 < c.rightX) return true;
    }
    return false;
}

var _offensiveItemsCache = null;
var _offensiveItemsCount = -1;
function getOffensiveItems() {
    if (_offensiveItemsCache && _offensiveItemsCount === G.placedItems.length) return _offensiveItemsCache;
    _offensiveItemsCache = [];
    for (var i = 0; i < G.placedItems.length; i++) {
        var placed = G.placedItems[i];
        if (placed.item.type === 'Offensive' && !placed.item.placedSprite) _offensiveItemsCache.push(placed);
    }
    _offensiveItemsCount = G.placedItems.length;
    return _offensiveItemsCache;
}

function processOffensiveFire(dt) {
    var offensiveItems = getOffensiveItems();
    for (var pi = 0; pi < offensiveItems.length; pi++) {
        var placed = offensiveItems[pi];
        var fireRate = placed.item.fireRate || 3, damage = placed.item.damage || 0, pierces = placed.item.pierces !== false, rangeType = placed.item.rangeType, c = getPlacedCenter(placed);
        if (rangeType === 'lineBoth') {
            if (placed.wavePos === undefined) placed.wavePos = 0;
            placed.wavePos += dt / fireRate; if (placed.wavePos >= 1) placed.wavePos -= 1;
            var waveX = c.leftX - placed.item.range * (0.5 - Math.abs(placed.wavePos - 0.5)), waveHit = false, itemLane = placed.gridY + Math.floor(c.cells.h / 2);
            for (var ei = 0; ei < G.enemies.length; ei++) { var en = G.enemies[ei]; if (!en.isDead && Math.abs(en.x - waveX) <= GRID_CELL_SIZE && Math.abs(en.lane - itemLane) <= 1) { waveHit = true; applyDamageToEnemy(en, damage * dt); } }
            if (waveHit) G.attackEffects.push({ x: waveX, y: c.y, range: 6, minRange: 0, rangeType: 'wave', life: 0.15, maxLife: 0.15 });
            continue;
        }
        if (placed.fireCooldown === undefined) placed.fireCooldown = fireRate;
        placed.fireCooldown -= dt;
        if (placed.fireCooldown > 0) continue;
        placed.fireCooldown = fireRate;
        var c2 = getPlacedCenter(placed);
        var enemiesInZone = getEnemiesInRangeAt({ placed: placed, x: c2.x, y: c2.y }), hitAny = false;
        if (!pierces) {
            enemiesInZone.sort(function(a, b) { return b.x - a.x; });
            var blockedRows = {};
            for (var ei = 0; ei < enemiesInZone.length; ei++) {
                var enemy = enemiesInZone[ei];
                var alreadyBlocked = false;
                for (var row = enemy.lane - 1; row <= enemy.lane + 1; row++) { if (blockedRows[row]) { alreadyBlocked = true; break; } }
                if (alreadyBlocked) continue;
                for (var row = enemy.lane - 1; row <= enemy.lane + 1; row++) blockedRows[row] = true;
                hitAny = true; applyDamageToEnemy(enemy, damage);
            }
        } else {
            for (var ei = 0; ei < enemiesInZone.length; ei++) { hitAny = true; applyDamageToEnemy(enemiesInZone[ei], damage); }
        }
        if (hitAny) G.attackEffects.push({ x: c.x, y: c.y, range: placed.item.range || 0, minRange: placed.item.minRange || 0, rangeType: rangeType, life: 0.4, maxLife: 0.4 });
    }
    for (var ai = G.attackEffects.length - 1; ai >= 0; ai--) { G.attackEffects[ai].life -= dt; if (G.attackEffects[ai].life <= 0) G.attackEffects.splice(ai, 1); }
}

function buildLaneItems() {
    var lanes = [];
    for (var l = 0; l < GRID_ROWS; l++) lanes.push({ nonTraps: [], traps: [], avoidanceItems: [] });
    for (var i = 0; i < G.placedItems.length; i++) {
        var placed = G.placedItems[i];
        var cells = getPlacedCenter(placed).cells;
        for (var row = placed.gridY; row < placed.gridY + cells.h && row < GRID_ROWS; row++) {
            if (row < 0) continue;
            if (placed.item.type === 'Traps') {
                lanes[row].traps.push(placed);
            } else {
                lanes[row].nonTraps.push(placed);
            }
            if (placed.item.avoidance) {
                lanes[row].avoidanceItems.push(placed);
            }
        }
    }
    G.laneItems = lanes;
}

function stepSimulation(dt) {
    if (!G.gameStarted || G.gameOver) return;
    G.time += dt;
    var elapsed = G.time;
    G.difficultyMultiplier = 1 + elapsed * SPAWN_CONFIG.healthRampRate;
    G.lastSpawnTime += dt;
    if (G.lastSpawnTime >= G.nextSpawnInterval) {
        G.lastSpawnTime = 0;
        if (G.enemies.length < SPAWN_CONFIG.maxActiveEnemies || G.debugMode) {
            var lane = pickWeightedLane();
            var type = pickGrandmaTypeToSpawn(elapsed);
            spawnEnemy(type, lane, Math.random() * 40 - 20);
        }
        G.nextSpawnInterval = getSpawnInterval(elapsed);
    }
    if (!G.laneItems || G.laneItemsDirty) {
        buildLaneItems();
        G.laneItemsDirty = false;
    }
    G.needsRenderPlacedItems = false;
    for (var pi = 0; pi < G.placedItems.length; pi++) {
        var _p = G.placedItems[pi];
        _p.beingAttacked = false;
        if (_p.item.type === 'Distractions') {
            _p.grandmaCount = 0;
            _p.triggered = false;
        }
    }
    buildFriendlyLaneCache();
    for (var i = G.enemies.length - 1; i >= 0; i--) {
        var e = G.enemies[i];
        if (e.isDead) {
            if (e.fadeTimer === undefined) e.fadeTimer = 0.3;
            e.fadeTimer -= dt;
            if (e.fadeTimer <= 0) G.enemies.splice(i, 1);
        } else {
            updateEnemy(e, dt);
        }
    }
    processOffensiveFire(dt);
    _friendlyByLane = null;
    updateFriendlyEntities(dt);
    for (var fi = G.friendlyEntities.length - 1; fi >= 0; fi--) {
        var fe = G.friendlyEntities[fi];
        if (fe.isDead) {
            fe.fadeTimer -= dt;
            if (fe.fadeTimer <= 0) { removePlacedItem(fe.placed); G.friendlyEntities.splice(fi, 1); }
        }
    }
    for (var pi = G.placedItems.length - 1; pi >= 0; pi--) {
        var pitem = G.placedItems[pi];
        if (pitem.item.type === 'Distractions' && pitem.triggered && pitem.grandmaCount > 0) {
            pitem.hp -= dt * 10 * (1 - Math.pow(0.9, pitem.grandmaCount));
            if (pitem.hp <= 0) removePlacedItem(pitem);
        }
    }
    for (pi = 0; pi < G.placedItems.length; pi++) {
        pitem = G.placedItems[pi];
        if (pitem.beingAttacked !== pitem._wasAttacked) {
            pitem._wasAttacked = pitem.beingAttacked;
            var itemEl = document.querySelector('.nightfall-placed-item[data-id="' + pitem.id + '"]');
            if (itemEl) itemEl.classList.toggle('nightfall-attacked', pitem.beingAttacked);
        }
        if (pitem.item.type !== 'Distractions' || !pitem.triggered || pitem.grandmaCount <= 0) { pitem.fxAccum = null; continue; }
        var dur = 0.9 - 0.6 * Math.min(1, (pitem.grandmaCount - 1) / 14);
        if (pitem.fxAccum === null) pitem.fxAccum = dur;
        pitem.fxAccum += dt;
        while (pitem.fxAccum >= dur) {
            pitem.fxAccum -= dur;
            var c = getPlacedCenter(pitem), icon = getIconPosition(pitem.item);
            G.distractionFx.push({ x: c.x, y: c.y, iconUrl: icon.url, iconX: icon.x, iconY: icon.y, life: dur, maxLife: dur, rise: 40, startAlpha: 0.8 });
        }
    }
    for (var fi = G.distractionFx.length - 1; fi >= 0; fi--) {
        if ((G.distractionFx[fi].life -= dt) <= 0) G.distractionFx.splice(fi, 1);
    }
    if (G.needsRenderPlacedItems) NightfallM.renderPlacedItems();
}

var entityPool = {};
function renderEntityEl(c, seen, key, x, y, w, h, url, frame, row, hp, maxHp, zIndex, opacity, flipX) {
    var el = entityPool[key];
    if (!el) { el = entityPool[key] = document.createElement('div'); el.style.cssText = 'position:absolute;pointer-events:none;'; c.appendChild(el); el._last = {}; }
    seen[key] = 1;
    var s = el.style, l = el._last;
    if (l.z !== zIndex) { s.zIndex = zIndex; l.z = zIndex; }
    var lx = (x - w/2) | 0, ly = (y - h/2) | 0;
    if (l.x !== lx) { s.left = lx + 'px'; l.x = lx; }
    if (l.y !== ly) { s.top = ly + 'px'; l.y = ly; }
    if (l.w !== w) { s.width = w + 'px'; l.w = w; }
    if (l.h !== h) { s.height = h + 'px'; l.h = h; }
    var opStr = opacity < 1 ? opacity.toFixed(2) : '1';
    if (l.op !== opStr) { s.opacity = opStr; l.op = opStr; }
    var tStr = flipX ? 'scaleX(-1)' : '';
    if (l.t !== tStr) { s.transform = tStr; l.t = tStr; }
    if (url) {
        var bgImg = 'url(' + url + ')', bgPos = '-' + (frame * w) + 'px -' + (row * h) + 'px';
        if (l.bg !== bgImg) { s.backgroundImage = bgImg; s.backgroundRepeat = 'no-repeat'; s.imageRendering = 'pixelated'; s.backgroundColor = ''; l.bg = bgImg; }
        if (l.bp !== bgPos) { s.backgroundPosition = bgPos; l.bp = bgPos; }
    } else { if (l.bg !== 'none') { s.backgroundColor = '#f0f'; s.backgroundImage = ''; l.bg = 'none'; } }
    if (hp < maxHp && hp > 0) {
        var pct = Math.max(0, hp / maxHp);
        if (!el._hp) { el._hp = document.createElement('div'); el._hpFill = document.createElement('div'); el._hp.appendChild(el._hpFill); el.appendChild(el._hp); el._hp.style.cssText = 'position:absolute;top:2px;height:4px;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.3);pointer-events:none;'; el._hpFill.style.cssText = 'position:absolute;left:0;top:0;height:100%;'; }
        var hpW = Math.round(w * 0.4), hpL = Math.round(w / 2 - w * 0.2);
        if (el._hp._w !== hpW) { el._hp.style.width = hpW + 'px'; el._hp.style.left = hpL + 'px'; el._hp._w = hpW; }
        if (el._hp._flip !== flipX) { el._hp.style.transform = flipX ? 'scaleX(-1)' : ''; el._hp._flip = flipX; }
        el._hp.style.display = '';
        var fillPct = Math.round(pct * 100), fillClr = pct > 0.5 ? '#0f0' : pct > 0.25 ? '#ff0' : '#f00';
        if (el._hpFill._pct !== fillPct) { el._hpFill.style.width = fillPct + '%'; el._hpFill._pct = fillPct; }
        if (el._hpFill._clr !== fillClr) { el._hpFill.style.background = fillClr; el._hpFill._clr = fillClr; }
    } else if (el._hp) el._hp.style.display = 'none';
}

var _entityYSort = function(a, b) { return a.y - b.y; };
function renderEntities() {
    var c = NightfallM.entitiesEl || document.getElementById('nightfallEntities');
    if (!c) return;
    var fx = c._fx;
    if (!fx || fx.parentNode !== c) { fx = c._fx = document.createElement('div'); fx.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;'; c.appendChild(fx); }
    G.enemies.sort(_entityYSort);
    var seen = {};
    for (var i = 0; i < G.enemies.length; i++) {
        var e = G.enemies[i], t = e.type, a = t.anims && t.anims[e.anim];
        var op = e.isDead && e.fadeTimer !== undefined ? Math.max(0, e.fadeTimer) : e.spawnDelay > 0 ? 1 - e.spawnDelay / 0.5 : 1;
        renderEntityEl(c, seen, e.id, e.x, e.y, t.frameW, t.frameH, (a && a.url) || t.sheetUrl || '', e.frame, a ? a.row : 0, e.hp, e.maxHp, i, op);
    }
    var pulseT = Date.now() / 1000;
    for (var fi = 0; fi < G.friendlyEntities.length; fi++) {
        var fe = G.friendlyEntities[fi], fa = fe.anims[fe.anim];
        var fop = fe.isDead ? Math.max(0, fe.fadeTimer / 0.3) : (fe.placed && fe.placed.beingAttacked ? 0.5 + 0.5 * Math.abs(Math.sin(pulseT * 6)) : 1);
        renderEntityEl(c, seen, 'f' + fe.id, fe.x, fe.y, fe.frameW, fe.frameH, fa ? fa.url : '', fe.frame, 0, fe.placed ? fe.placed.hp : 0, fe.maxHp, 1000 + fi, fop, fe.facing === -1);
    }
    for (var id in entityPool) if (!seen[id]) { entityPool[id].remove(); delete entityPool[id]; }
    var parts = [], p = 0;
    if (G.debugMode) {
        for (var i = 0; i < G.enemies.length; i++) {
            var e = G.enemies[i], bl = e.x - GRID_CELL_SIZE/2, bt = GRID_OFFSET_Y + e.lane * GRID_CELL_SIZE - GRID_CELL_SIZE;
            parts[p++] = '<div style="position:absolute;left:' + bl + 'px;top:' + bt + 'px;width:' + GRID_CELL_SIZE + 'px;height:' + (GRID_CELL_SIZE*3) + 'px;background:rgba(0,255,0,0.12);border:1px solid #0f0;pointer-events:none;box-sizing:border-box;"></div>';
            parts[p++] = '<div style="position:absolute;left:' + bl + 'px;top:' + bt + 'px;width:' + (GRID_CELL_SIZE+AVOIDANCE_LOOKAHEAD) + 'px;height:' + (GRID_CELL_SIZE*3) + 'px;background:rgba(0,100,255,0.15);border:1px dashed #00f;pointer-events:none;box-sizing:border-box;"></div>';
            if (e.type.rangedAttack) { var rl = e.x + GRID_CELL_SIZE/2, rrw = e.type.rangedAttackRange || RANGED_ATTACK_LOOKAHEAD; parts[p++] = '<div style="position:absolute;left:' + rl + 'px;top:' + bt + 'px;width:' + rrw + 'px;height:' + (GRID_CELL_SIZE*3) + 'px;background:rgba(150,0,150,0.15);border:1px dashed #a0a;pointer-events:none;box-sizing:border-box;"></div>'; }
        }
        for (var fi = 0; fi < G.friendlyEntities.length; fi++) {
            var fe2 = G.friendlyEntities[fi], fbl = fe2.x - GRID_CELL_SIZE/2, fbt = fe2.y - GRID_CELL_SIZE;
            parts[p++] = '<div style="position:absolute;left:' + fbl + 'px;top:' + fbt + 'px;width:' + GRID_CELL_SIZE + 'px;height:' + (GRID_CELL_SIZE*3) + 'px;background:rgba(0,255,255,0.15);border:1px solid #0ff;pointer-events:none;box-sizing:border-box;"></div>';
            if (fe2.placed && fe2.placed.item.rangeType) { var fcells = itemToGridCells(fe2.placed.item); parts[p++] = renderRangeShape(getRangeShapeAtPos(fe2.placed.item, fe2.x, fe2.y, fe2.x - fcells.w * GRID_CELL_SIZE / 2, fcells), 'rgba(0,255,255,0.06)', 'rgba(0,255,255,0.4)'); }
        }
        var pt = Date.now() / 1000;
        G.placedItems.forEach(function(placed) {
            var c = getPlacedCenter(placed), bg = 'rgba(255,0,0,0.3)', bd = '#f00';
            if (placed.item.type === 'Distractions' && placed.triggered && placed.grandmaCount > 0) { var pu = 0.5 + 0.5 * Math.sin(pt * (2 + placed.grandmaCount * 2)); bg = 'rgba(0,255,0,' + (0.3 + pu * 0.5).toFixed(2) + ')'; bd = '#0f0'; }
            parts[p++] = '<div style="position:absolute;left:' + c.leftX + 'px;top:' + c.topY + 'px;width:' + (c.cells.w*GRID_CELL_SIZE) + 'px;height:' + (c.cells.h*GRID_CELL_SIZE) + 'px;background:' + bg + ';border:1px solid ' + bd + ';pointer-events:none;"></div>';
            if (placed.item.type !== 'Distractions' && placed.item.type !== 'Traps') { var mx = 0; for (var ei = 0; ei < G.enemies.length; ei++) if (!G.enemies[ei].isDead) mx = Math.max(mx, getOverlapCells(G.enemies[ei].x, G.enemies[ei].lane, GRID_CELL_SIZE, placed)); if (mx > 0) parts[p++] = '<div style="position:absolute;left:' + (c.leftX+2) + 'px;top:' + (c.topY+2) + 'px;color:#fff;font-size:10px;pointer-events:none;text-shadow:1px 1px 1px #000;">' + mx + '</div>'; }
            if (placed.item.type === 'Traps' && placed.item.range > 1) parts[p++] = renderRangeShape({type:'circle',x:c.x,y:c.y,r:placed.item.range,minR:0}, 'rgba(255,255,0,0.08)', 'rgba(255,255,0,0.6)');
            else if (placed.item.rangeType) { var dcells = itemToGridCells(placed.item); parts[p++] = renderRangeShape(getRangeShapeAtPos(placed.item, (placed.gridX + dcells.w / 2) * GRID_CELL_SIZE, GRID_OFFSET_Y + (placed.gridY + dcells.h / 2) * GRID_CELL_SIZE, placed.gridX * GRID_CELL_SIZE, dcells), 'rgba(255,255,0,0.08)', 'rgba(255,255,0,0.6)'); }
        });
        G.triggerTiles.forEach(function(tr) { parts[p++] = '<div style="position:absolute;left:' + (tr.gridX*GRID_CELL_SIZE) + 'px;top:' + (tr.gridY*GRID_CELL_SIZE+GRID_OFFSET_Y) + 'px;width:' + GRID_CELL_SIZE + 'px;height:' + GRID_CELL_SIZE + 'px;background:rgba(255,255,0,0.5);border:2px solid #ff0;pointer-events:none;"></div>'; });
    }
    for (var ai = 0; ai < G.attackEffects.length; ai++) { var fx2 = G.attackEffects[ai], a2 = (fx2.life / fx2.maxLife * 0.5).toFixed(2); parts[p++] = renderRangeShape(fxToShape(fx2), 'rgba(255,100,0,' + (a2*0.3).toFixed(2) + ')', 'rgba(255,100,0,' + a2 + ')'); }
    for (var fi = 0; fi < G.distractionFx.length; fi++) { var dfx = G.distractionFx[fi], dt2 = 1 - dfx.life / dfx.maxLife; parts[p++] = '<div style="position:absolute;left:' + dfx.x + 'px;top:' + (dfx.y - dfx.rise * dt2 * dt2) + 'px;width:48px;height:48px;background-image:url(' + dfx.iconUrl + ');background-position:-' + dfx.iconX + 'px -' + dfx.iconY + 'px;background-repeat:no-repeat;transform:translate(-50%,-50%) scale(0.5);pointer-events:none;opacity:' + (dfx.startAlpha * (1 - dt2)).toFixed(2) + ';"></div>'; }
    fx.innerHTML = parts.join('');
}

function clearEntityContainer() {
    entityPool = {};
    var c = NightfallM.entitiesEl || document.getElementById('nightfallEntities');
    if (c) c.innerHTML = '';
}

function startNightfallGame() {
    if (G.gameStarted) return;
    clearDrag();
    NightfallM.renderTools();
    G.enemies = [];
    G.enemyIdCounter = 0;
    G.simAccumulator = 0;
    G.lastSpawnTime = 0;
    G.nextSpawnInterval = getSpawnInterval(0);
    G.gameOver = false;
    G.gameStarted = true;
    G.score = 0;
    G.time = 0;
    G.attackEffects = [];
    G.distractionFx = [];
    clearEntityContainer();
    G.killCounts = {};
    G.savedPlacedItems = [];
    G.friendlyEntities = [];
    G.friendlyIdCounter = 0;
    for (var pi = 0; pi < G.placedItems.length; pi++) {
        var placed = G.placedItems[pi];
        G.savedPlacedItems.push({ id: placed.id, item: placed.item, gridX: placed.gridX, gridY: placed.gridY, hp: placed.item.health });
        placed.hp = placed.item.health;
        placed.fireCooldown = undefined;
        placed.wavePos = undefined;
        placed.triggered = false;
        placed.grandmaCount = 0;
        if (placed.item.placedSprite) spawnFriendlyEntity(placed);
    }
    NightfallM.startTime = Date.now();
    initTriggerTiles();
    var type = pickGrandmaTypeToSpawn(0);
    spawnEnemy(type, pickWeightedLane(), 0);
}

function stopNightfallGame() {
    G.gameStarted = false; G.gameOver = false; G.enemies = []; G.friendlyEntities = [];
    G.attackEffects = []; G.distractionFx = []; G.lastSpawnTime = 0; NightfallM.startTime = 0;
    clearEntityContainer();
    if (G.savedPlacedItems && G.savedPlacedItems.length) {
        G.placedItems = G.savedPlacedItems.map(function(s) { return { id: s.id, item: s.item, gridX: s.gridX, gridY: s.gridY, hp: s.hp }; });
        G.savedPlacedItems = null;
        buildLaneItems();
        G.needsRenderPlacedItems = true;
    }
    NightfallM.renderTools();
}

function formatNightfallTime(totalSeconds) {
    var s = Math.max(0, Math.floor(totalSeconds)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var ss = sec < 10 ? '0' + sec : String(sec);
    return h > 0 ? h + ':' + (m < 10 ? '0' + m : m) + ':' + ss : m + ':' + ss;
}

NightfallM.draw = function() {
    if (!NightfallM.timeL) return;
    var wrath = (Game && typeof Game.elderWrath === 'number') ? Game.elderWrath : 0;
    var targetBgUrl = (wrath > 0) ? NightfallM.bgUrlGpoc : NightfallM.bgUrlNormal;
    if (targetBgUrl && targetBgUrl !== NightfallM.currentBgUrl) {
        var imgs = NightfallM.tileImgs || [];
        for (var i = 0; i < imgs.length; i++) imgs[i].src = targetBgUrl;
        NightfallM.currentBgUrl = targetBgUrl;
    }

    if (G.selectedTool && G.isDragging && NightfallM.dragEl && G.dragGhost && NightfallM.gridEl) {
        var cursor = getCursorPos();
        if (cursor.x !== G.lastDragCursorX || cursor.y !== G.lastDragCursorY) {
            G.lastDragCursorX = cursor.x;
            G.lastDragCursorY = cursor.y;
            var gridBox = NightfallM.gridEl.getBoundingClientRect();
            var mx = cursor.x - gridBox.left;
            var my = cursor.y - gridBox.top;
            var ghostX = Math.floor(mx / GRID_CELL_SIZE);
            var ghostY = Math.floor((my - GRID_OFFSET_Y) / GRID_CELL_SIZE);
            G.dragGhostX = ghostX;
            G.dragGhostY = ghostY;
            var dragBox = NightfallM.dragEl.getBoundingClientRect();
            var tx = gridBox.left - dragBox.left + ghostX * GRID_CELL_SIZE;
            var ty = gridBox.top - dragBox.top + GRID_OFFSET_Y + ghostY * GRID_CELL_SIZE;
            G.dragGhost.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
        }
    }

    if (typeof NightfallM.renderGrid === 'function' && (G.selectedTool !== NightfallM.lastGridSelected || G.isDragging !== NightfallM.lastGridDragging || G.dragGhostX !== NightfallM.lastGridX || G.dragGhostY !== NightfallM.lastGridY)) {
        NightfallM.lastGridSelected = G.selectedTool; NightfallM.lastGridDragging = G.isDragging; NightfallM.lastGridX = G.dragGhostX; NightfallM.lastGridY = G.dragGhostY;
        NightfallM.renderGrid();
    }

    if (wrath > 0 && !NightfallM.elderWrathActive) {
        NightfallM.elderWrathActive = true;
        startNightfallGame();
        var initialScore = 0;
        G.placedItems.forEach(function(placed) {
            initialScore -= placed.item.cost;
        });
        G.score = initialScore;
    } else if (wrath === 0 && NightfallM.elderWrathActive) {
        NightfallM.elderWrathActive = false;
        stopNightfallGame();
    }
    if (wrath !== NightfallM.lastWrath) {
        NightfallM.lastWrath = wrath;
        NightfallM.renderTools();
    }
    var text;
    if (wrath > 0 && NightfallM.startTime && !G.gameOver) {
        text = 'Time: ' + formatNightfallTime(G.time);
    } else if (G.gameOver) {
        text = 'Game Over - Time: ' + formatNightfallTime(G.time);
    } else {
        G.time = 0;
        text = 'Awaiting Grandmapocalypse';
    }
    if (text !== NightfallM.lastTimeString) {
        NightfallM.timeL.textContent = text;
        NightfallM.lastTimeString = text;
    }
    var scoreEl = NightfallM.scoreEl;
    if (scoreEl) {
        if (wrath > 0) {
            var scoreColor = G.score < 0 ? '#f00' : '#0f0';
            var displayScore = Math.ceil(G.score);
            var scoreHtml = 'Score: <span style="color:' + scoreColor + ';">' + displayScore + '</span>';
            if (scoreHtml !== NightfallM.lastScoreHtml) {
                scoreEl.innerHTML = scoreHtml;
                NightfallM.lastScoreHtml = scoreHtml;
            }
        } else if (NightfallM.lastScoreHtml !== '') {
            scoreEl.innerHTML = '';
            NightfallM.lastScoreHtml = '';
        }
    }

    if (G.gameStarted && !G.gameOver) {
        var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        var last = G.lastFrameTime || now;
        var dt = Math.min(0.25, (now - last) / 1000);
        G.lastFrameTime = now;
        if (G.simAccumulator === undefined) G.simAccumulator = 0;
        G.simAccumulator += dt * (G.gameSpeed || 1);
        var simRan = false;
        while (G.simAccumulator >= SIM_STEP) {
            stepSimulation(SIM_STEP);
            G.simAccumulator -= SIM_STEP;
            simRan = true;
        }
        if (simRan) {
            if (G.lastRenderTime === undefined) G.lastRenderTime = 0;
            if (now - G.lastRenderTime >= 33) {
                renderEntities();
                G.lastRenderTime = now;
            }
            if (NightfallM.activeToolTab === 'Grandmas' && (!NightfallM.lastKillRenderTime || now - NightfallM.lastKillRenderTime >= 500)) {
                NightfallM.lastKillRenderTime = now;
                NightfallM.renderTools();
            }
        }
    }
};

NightfallM._buildSaveDataImpl = function() {
    var enemies = [];
    for (var i = 0; i < G.enemies.length; i++) {
        var e = G.enemies[i];
        enemies.push({ name: e.type.name, x: e.x, y: e.y, lane: e.lane, hp: e.hp, maxHp: e.maxHp, anim: e.anim, frame: e.frame });
    }
    return {
        lastTick: G.lastTick, score: G.score, time: G.time, unlockedItems: G.unlockedItems,
        gameStarted: G.gameStarted, gameOver: G.gameOver, enemyIdCounter: G.enemyIdCounter, enemies: enemies,
        lastSpawnTime: G.lastSpawnTime, isVisible: (NightfallM.parent && NightfallM.parent.onMinigame) ? 1 : 0
    };
};

NightfallM._saveImpl = function() {
    var json = '';
    try { json = JSON.stringify(NightfallM._buildSaveDataImpl()); } catch (e) { return ''; }
    if (window.NightfallMinigame && window.NightfallMinigame.writeCache) window.NightfallMinigame.writeCache(json);
    return encodeURIComponent(json);
};

NightfallM._loadImpl = function(str) {
    var data = null;
    if (str) {
        try {
            var decoded = str;
            try { decoded = decodeURIComponent(str); } catch (decodeErr) { decoded = str; }
            data = JSON.parse(decoded);
        } catch (e) { data = null; }
    }
    if (!data || typeof data !== 'object') {
        NightfallM._resetImpl(false);
        return;
    }

    function num(v, d) { return typeof v === 'number' ? v : d; }
    G.lastTick = num(data.lastTick, 0);
    G.score = num(data.score, 0);
    G.time = num(data.time, 0);
    G.unlockedItems = typeof data.unlockedItems === 'object' && data.unlockedItems !== null ? data.unlockedItems : {};
    G.gameStarted = typeof data.gameStarted === 'boolean' ? data.gameStarted : G.gameStarted;
    G.gameOver = typeof data.gameOver === 'boolean' ? data.gameOver : false;
    if (G.gameStarted && !G.gameOver) {
        NightfallM.startTime = Date.now();
        NightfallM.elderWrathActive = (Game.elderWrath > 0);
    }
    G.enemyIdCounter = num(data.enemyIdCounter, 0);
    G.lastSpawnTime = num(data.lastSpawnTime, 0);

    G.enemies = [];
    if (Array.isArray(data.enemies)) {
        for (var ei = 0; ei < data.enemies.length; ei++) {
            var ed = data.enemies[ei], type = ed && ed.name ? NightfallM.getGrandmaType(ed.name) : null;
            if (!type) continue;
            G.enemies.push({ id: ++G.enemyIdCounter, type: type, x: ed.x, y: ed.y, lane: ed.lane, hp: ed.hp, maxHp: ed.maxHp, anim: ed.anim, frame: ed.frame, frameTimer: 0, attackCooldown: 0, isDead: false });
        }
    }

    if (NightfallM.parent && data.isVisible) activateMinigame(getGrandma(), 50);
};

NightfallM._resetImpl = function(hard) {
    G.lastTick = 0; G.score = 0; G.time = 0; G.unlockedItems = {};
    G.enemies = []; G.enemyIdCounter = 0; G.simAccumulator = 0; G.lastFrameTime = 0;
    G.lastSpawnTime = 0; G.difficultyMultiplier = 1; G.gameOver = false; G.gameStarted = false;
    G.savedPlacedItems = null; G.attackEffects = []; G.distractionFx = []; G.killCounts = {};
    clearEntityContainer();
    NightfallM.startTime = 0; NightfallM.elderWrathActive = false; NightfallM.lastWrath = undefined;
};

NightfallM.save = NightfallM._saveImpl;
NightfallM.load = NightfallM._loadImpl;
NightfallM.reset = NightfallM._resetImpl;

function initializeNightfallMinigame() {
    var grandma = getGrandma();
    if (!grandma) return;
    var flagDefined = !!(Game.JNE && Game.JNE.enableNightfallMinigame !== undefined);
    var isConsoleLoading = !flagDefined || (Game.JNE && Game.JNE.enableNightfallMinigame === false);
    var isEnabled = flagDefined ? !!Game.JNE.enableNightfallMinigame : true;

    function ensureMinigameDiv() {
        if (grandma.minigameDiv) return;
        var existingDiv = l('rowSpecial' + grandma.id);
        if (existingDiv) { grandma.minigameDiv = existingDiv; return; }
        grandma.minigameDiv = document.createElement('div');
        grandma.minigameDiv.id = 'rowSpecial' + grandma.id;
        grandma.minigameDiv.className = 'rowSpecial';
        if (grandma.l) grandma.l.appendChild(grandma.minigameDiv);
    }

    function bootMinigame() {
        if (!grandma) return;
        if (!grandma.minigameLoaded) { grandma.minigameLoaded = true; grandma.minigameName = grandma.minigameName || 'Nightfall'; grandma.minigameLoading = false; }
        ensureMinigameDiv();
        NightfallM.launch();
        NightfallM.init(grandma.minigameDiv);
        if (!grandma.minigame) grandma.minigame = NightfallM;
        if (Game.JNE && Game.JNE.nightfallSavedData) NightfallM.load(Game.JNE.nightfallSavedData);
        if (isConsoleLoading && !grandma.minigameUrl) grandma.minigameUrl = 'nightfall';
        if (typeof grandma.refresh === 'function') grandma.refresh();
        if (isConsoleLoading && Game.ObjectsById && Game.ObjectsById[grandma.id] && typeof Game.ObjectsById[grandma.id].draw === 'function') Game.ObjectsById[grandma.id].draw();
        activateMinigame(grandma, 100);
    }

    if (isEnabled || isConsoleLoading) {
        try {
            var minigameIsStub = !grandma.minigame || !grandma.minigame.init;
            if (!grandma.minigameLoaded || minigameIsStub || !NightfallM.launched) {
                bootMinigame();
            }
        } catch (e) {
            grandma.minigameLoading = false;
            throw e;
        }
        grandma.minigameLoading = false;
        if (!grandma.minigameUrl) grandma.minigameUrl = 'nightfall';
    } else {
        grandma.minigameLoading = false;
    }

    if (typeof grandma.switchMinigame === 'function' && !grandma._jneNightfallSwitchPatched) {
        grandma._jneNightfallSwitchOrig = grandma.switchMinigame;
        grandma._jneNightfallSwitchPatched = true;
        grandma.switchMinigame = function(on) {
            var orig = this._jneNightfallSwitchOrig;
            var result = (typeof orig === 'function') ? orig.apply(this, arguments) : undefined;
            var specialEl = document.getElementById('rowSpecial' + this.id);
            if (specialEl && this.onMinigame && specialEl.style.display === 'none') specialEl.style.display = '';
            return result;
        };
    }
}

initializeNightfallMinigame();

if (!getGrandma() || !getGrandma().minigame) {
    setTimeout(function() { initializeNightfallMinigame(); }, 1000);
}

window.initializeNightfallMinigame = initializeNightfallMinigame;

var existingAPI = window.NightfallMinigame || {};
var publicAPI = {
    save: NightfallM._saveImpl, load: NightfallM._loadImpl, reset: NightfallM._resetImpl,
    unlockAll: function() { NightfallM.unlockAll(); }, buildSaveString: function() { try { return JSON.stringify(NightfallM._buildSaveDataImpl()); } catch (e) { return ''; } },
    buildSaveData: NightfallM._buildSaveDataImpl,
    setDebugMode: function(enabled) { G.debugMode = enabled; }, setGameSpeed: function(speed) { G.gameSpeed = speed; },
    getSaveData: existingAPI.getSaveData, applySaveData: existingAPI.applySaveData,
    writeCache: existingAPI.writeCache, requestSave: existingAPI.requestSave
};
for (var key in publicAPI) { if (publicAPI[key] === undefined) delete publicAPI[key]; }

Object.defineProperty(window, 'NightfallMinigame', {
    value: Object.freeze(Object.assign({ VERSION: NIGHTFALL_VERSION }, publicAPI)),
    writable: false, enumerable: false, configurable: true
});

})();