// Nightfall Minigame (Grandma building)
(function() {
'use strict';

const NIGHTFALL_VERSION = '0.0.1';

var NightfallM = {};
NightfallM.parent = Game.Objects && Game.Objects['Grandma'] ? Game.Objects['Grandma'] : {
    id: 0,
    level: 10,
    minigameName: 'Nightfall',
    minigameLoaded: false,
    minigameLoading: false,
    minigameDiv: null,
    l: null,
    refresh: function() {}
};

if (Game.Objects && Game.Objects['Grandma']) {
    NightfallM.parent.minigame = NightfallM;
}

function getGrandma() {
    return Game.Objects['Grandma'];
}

var G = {
    lastTick: 0,
    score: 0,
    time: 0,
    unlockedItems: {},
    placedItems: [],
    selectedTool: null,
    isDragging: false,
    dragGhost: null,
    dragGhostX: -1,
    dragGhostY: -1,
    debugMode: true,
    movingPlacedId: null,
    enemies: [],
    enemyIdCounter: 0,
    simAccumulator: 0,
    lastFrameTime: 0,
    lastSpawnTime: 0,
    difficultyMultiplier: 1,
    gameSpeed: 1,
    gameOver: false,
    gameStarted: false,
    triggerTiles: [],
    laneItems: null,
    needsRenderPlacedItems: false,
    lastRenderTime: 0,
    attackEffects: []
};

var GRID_CELL_SIZE = 14;
var GRID_ROWS = 6;
var GRID_OFFSET_Y = 56;
var SIM_STEP = 1 / 30;
var COLLISION_TILE_Y_OFFSETS = [-GRID_CELL_SIZE, 0, GRID_CELL_SIZE];

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
    var col = item.icon[0];
    var row = item.icon[1];
    var sheet = item.icon.length > 2 ? item.icon[2] : 'main';
    var iconUrl = getIconUrl(sheet);
    return { col: col, row: row, sheet: sheet, url: iconUrl, x: col * 48, y: row * 48 };
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

function initTriggerTiles() {
    G.triggerTiles = [];
    var cols = getGridCols();
    for (var row = 0; row < GRID_ROWS; row++) {
        G.triggerTiles.push({
            gridX: cols - 1,
            gridY: row
        });
    }
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
    var ids = ['nightfallTileStrip', 'nightfallGrid', 'nightfallTraps', 'nightfallPlacedItems', 'nightfallDragPreview', 'nightfallEntities'];
    for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) el.style.left = leftPx;
    }
}

NightfallM.launch = function() {
    var M = this;
    var grandma = getGrandma();
    M.name = (grandma && grandma.minigameName) || 'Nightfall';
};

NightfallM.init = function(div) {
    if (!div) return;
    NightfallM.div = div;
    div.style.position = 'relative';
    div.style.overflow = 'hidden';
    div.style.paddingBottom = '5px';

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
        { type: 'Barricades', name: 'Crate', health: 300, icon: [4, 0, 'nightfall'], animation: '', cost: 270, size: { w: 2, h: 2 }, unlock: { score: 800, time: 0 }, desc: 'A sturdy crate to block the path.<q>Heavy on defense, light on style.</q>', effects: [{ text: 'Blocks grandma movement', positive: true }, { text: 'Contains a surprise upon opening', positive: true }] },
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
        { type: 'Offensive', name: 'Bomb Launcher', health: 40, damage: 150, range: 140, minRange: 60, rangeType: 'circle', fireRate: 5, pierces: true, ignoresBarricades: true, icon: [0, 3, 'nightfall'], animation: '', cost: 3000, size: { w: 2, h: 2 }, unlock: { score: 1000, time: 60 }, desc: 'Launches explosive pastries at long range.<q>Cake delivered with extreme prejudice.</q>', effects: [{ text: 'Deals heavy AoE damage in a wide band', positive: true }] },
        { type: 'Offensive', name: 'Cannon', health: 45, damage: 68, range: 140, rangeType: 'lineAhead', fireRate: 3, pierces: true, ignoresBarricades: false, icon: [1, 3, 'nightfall'], animation: '', cost: 4200, size: { w: 4, h: 3 }, unlock: { score: 1600, time: 60 }, desc: 'A black-powder answer to a cookie problem.<q>Fire in the hole.</q>', effects: [{ text: 'Deals penetrating ranged damage in a straight line', positive: true },  { text: 'Cannot shoot through barricades', positive: false } ] },
        { type: 'Offensive', name: 'Burnt Toast', health: 50, damage: 15, range: 40, rangeType: 'circle', fireRate: 0.5, pierces: true, ignoresBarricades: true, icon: [5, 3, 'nightfall'], animation: '', cost: 5400, size: { w: 2, h: 2 }, unlock: { score: 2200, time: 60 }, desc: 'Charred breakfast projectiles, extra crispy.<q>Served hot and hazardous.</q>', effects: [{ text: 'Deals rapid close-range damage', positive: true }] },
        { type: 'Offensive', name: 'Paint Cans', health: 55, damage: 84, range: 80, rangeType: 'lineBoth', fireRate: 2, pierces: true, ignoresBarricades: true, icon: [2, 3, 'nightfall'], animation: '', cost: 6600, size: { w: 2, h: 2 }, unlock: { score: 2800, time: 60 }, desc: 'Splash damage in every color of the rainbow.<q>Paint the town red.</q>', effects: [{ text: 'Deals ranged damage in a swinging wave', positive: true }] },
        { type: 'Offensive', name: 'Robot Grandpas', health: 60, damage: 92, range: 100, rangeType: 'arcAhead', fireRate: 3, pierces: true, ignoresBarricades: true, icon: [3, 3, 'nightfall'], animation: '', cost: 7800, size: { w: 2, h: 2 }, unlock: { score: 3400, time: 60 }, desc: 'Mechanized grandfathers ready for combat.<q>While we still can\'t figure out where the actual grandpas have been stashed these mechanical ones are a good substitute.</q>', effects: [{ text: 'Approaches and eliminates grandmas.', positive: true }] },
        { type: 'Offensive', name: 'Cookie Sentry Gun', health: 65, damage: 30, range: 80, rangeType: 'arcAhead', fireRate: 1, pierces: false, ignoresBarricades: false, icon: [4, 3, 'nightfall'], animation: '', cost: 9000, size: { w: 2, h: 2 }, unlock: { score: 4000, time: 60 }, desc: 'An automated cookie-defense turret.<q>Nobody steals the cookies on its watch.</q>', effects: [{ text: 'Deals ranged damage to frontmost grandmas', positive: true }, { text: 'Cannot shoot through barricades', positive: false }] }
    ];

    NightfallM.grandmaData = [
        { file: 'alteredGrandma.png', name: 'Altered Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma summons wrinklers to do her bidding and absorb incoming damage.<q>Wrinklers are basically nature\'s bubble wrap, assuming the bubbles were alive, hungry, and deeply upsetting to look at.</q>' },
        { file: 'alternateGrandma.png', name: 'Alternative Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma comes from another dimension, but that does not make her any less deadly.<q>In her dimension, you are the grandma and she owns the bakery. Try not to think about it too hard; we certainly didn\'t.</q>' },
        { file: 'antiGrandma.png', name: 'Anti Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma controls black holes and can teleport to the location of any other grandma.<q>According to several highly respected physicists, none of this should be happening. They have since stopped returning our calls.</q>' },
        { file: 'bankGrandma.png', name: 'Bank Grandma', rarity: 10, speed: 13, damage: 8, info: 'Cold, hard, and highly motivated, this grandma smashes through defenses with exceptional force.<q>She denied your loan, froze your assets, and somehow charged the barricade a monthly maintenance fee.</q>' },
        { file: 'brainyGrandma.png', name: 'Brainy Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma can control objects with her mind, so you do not want to find yourself on the wrong side of her gaze.<q>She can bend steel with her thoughts but still needs you to come over and change the input on the television.</q>' },
        { file: 'bunnyGrandma.png', name: 'Bunny Grandma', rarity: 0, speed: 22, damage: 5, info: 'This grandma has a spring in her step and can jump over barricades and traps.<q>She was told to act her age, but nobody could agree whether rabbit years should be multiplied or divided by seven.</q>' },
        { file: 'cloneGrandma.png', name: 'Clone Grandma', rarity: 0, speed: 14, damage: 5, info: 'When this grandma is defeated, she returns as another random type of grandma.<q>They were so preoccupied with whether they could clone grandma that they never stopped to consider whether anyone wanted two grandmas asking why they never call.</q>' },
        { file: 'cosmicGrandma.png', name: 'Cosmic Grandma', rarity: 0, speed: 20, damage: 5, info: 'This grandma carries a ray gun and knows how to use it. Her extra feet also make her faster than the average grandma.<q>In space, no one can hear you scream, but somehow everyone can still hear grandma complain that the spaceship is too cold.</q>' },
        { file: 'elfGrandma.png', name: 'Elf Grandma', rarity: 0, speed: 14, damage: 5, info: 'This festive grandma can summon attacking reindeer to charge ahead and do her bidding.<q>She has a red nose, several unpaid seasonal workers, and a very loose interpretation of workplace safety laws.</q>' },
        { file: 'farmerGrandma.png', name: 'Farmer Grandma', rarity: 0, speed: 14, damage: 5, info: 'This grandma can attack from farther away thanks to the extended reach of her trusty pitchfork.<q>She wakes before sunrise, works sixteen hours, and still finds time to post twelve paragraphs online about how nobody wants to work anymore.</q>' },
        { file: 'grandma.png', name: 'Grandma', rarity: 15, speed: 15, damage: 5, info: 'Back to basics, this grandma has no special powers but is still fully capable of giving your defenses the walloping of a lifetime.<q>No lasers, no magic, no interdimensional nonsense. Just sensible shoes and forty years of unresolved family grievances.</q>' },
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

    function formatCostTime(sec) {
        if (!sec) return '';
        if (sec >= 86400) {
            var d = Math.floor(sec / 86400);
            var rest = sec % 86400;
            var h = Math.floor(rest / 3600);
            var dayStr = d + ' day' + (d !== 1 ? 's' : '');
            return h > 0 ? dayStr + ', ' + h + ' hour' + (h !== 1 ? 's' : '') : dayStr;
        }
        var m = sec / 60;
        return m < 60 ? Math.round(m) + ' min' : (m / 60).toFixed(1).replace(/\.0$/, '') + ' hour' + (m >= 120 ? 's' : '');
    }


    function checkCollision(gridX, gridY, item, excludeId) {
        var cells = itemToGridCells(item);
        if (gridX < 0 || gridY < 0 || gridX + cells.w > getGridCols() || gridY + cells.h > GRID_ROWS) {
            return true;
        }
        for (var i = 0; i < G.placedItems.length; i++) {
            var placed = G.placedItems[i];
            if (excludeId && placed.id === excludeId) continue;
            var placedCells = itemToGridCells(placed.item);
            if (gridX < placed.gridX + placedCells.w &&
                gridX + cells.w > placed.gridX &&
                gridY < placed.gridY + placedCells.h &&
                gridY + cells.h > placed.gridY) {
                return true;
            }
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
            var pxc = p.gridX;
            var pyc = p.gridY;
            for (var py = 0; py < pc.h; py++) {
                for (var px = 0; px < pc.w; px++) {
                    occupied.add((pxc + px) + ',' + (pyc + py));
                }
            }
        });
        var html = '';
        for (var dy = 0; dy < cells.h; dy++) {
            for (var dx = 0; dx < cells.w; dx++) {
                var cx = x0 + dx;
                var cy = y0 + dy;
                var outOfBounds = cx < 0 || cy < 0 || cx >= cols || cy >= GRID_ROWS;
                var isOccupied = outOfBounds || occupied.has(cx + ',' + cy);
                var bgColor = isOccupied ? 'rgba(255,0,0,0.6)' : 'rgba(0,255,0,0.4)';
                html += '<div style="position:absolute;left:' + (cx * GRID_CELL_SIZE) + 'px;top:' + (GRID_OFFSET_Y + cy * GRID_CELL_SIZE) + 'px;width:' + GRID_CELL_SIZE + 'px;height:' + GRID_CELL_SIZE + 'px;border:1px solid rgba(255,255,255,0.8);box-sizing:border-box;background:' + bgColor + ';pointer-events:none;"></div>';
            }
        }
        var range = G.selectedTool.range || 0;
        var rangeType = G.selectedTool.rangeType;
        var minRange = G.selectedTool.minRange || 0;
        if (range > 1) {
            var centerX = (x0 + cells.w / 2) * GRID_CELL_SIZE;
            var centerY = GRID_OFFSET_Y + (y0 + cells.h / 2) * GRID_CELL_SIZE;
            var itemRightX = (x0 + cells.w) * GRID_CELL_SIZE;
            var itemLeftX = x0 * GRID_CELL_SIZE;
            if (rangeType === 'circle' && minRange > 0) {
                var ringR = range - 1;
                var ringPath = 'M ' + range + ' ' + range + ' m -' + ringR + ' 0 a ' + ringR + ' ' + ringR + ' 0 1 0 ' + (ringR * 2) + ' 0 a ' + ringR + ' ' + ringR + ' 0 1 0 -' + (ringR * 2) + ' 0 M ' + range + ' ' + range + ' m -' + minRange + ' 0 a ' + minRange + ' ' + minRange + ' 0 1 0 ' + (minRange * 2) + ' 0 a ' + minRange + ' ' + minRange + ' 0 1 0 -' + (minRange * 2) + ' 0';
                html += '<svg viewBox="0 0 ' + (range * 2) + ' ' + (range * 2) + '" style="position:absolute;left:' + (centerX - range) + 'px;top:' + (centerY - range) + 'px;width:' + (range * 2) + 'px;height:' + (range * 2) + 'px;pointer-events:none;overflow:visible;"><path d="' + ringPath + '" fill="rgba(255,255,0,0.08)" fill-rule="evenodd" stroke="none"/><circle cx="' + range + '" cy="' + range + '" r="' + ringR + '" fill="none" stroke="rgba(255,255,0,0.6)" stroke-width="2"/><circle cx="' + range + '" cy="' + range + '" r="' + minRange + '" fill="none" stroke="rgba(255,150,0,0.5)" stroke-width="2" stroke-dasharray="4,3"/></svg>';
            } else if (rangeType === 'lineAhead' || rangeType === 'lineBoth') {
                var linePrevW = rangeType === 'lineBoth' ? range * 2 + cells.w * GRID_CELL_SIZE : range;
                html += '<div style="position:absolute;left:' + (itemLeftX - range) + 'px;top:' + (centerY - GRID_CELL_SIZE) + 'px;width:' + linePrevW + 'px;height:' + (GRID_CELL_SIZE * 2) + 'px;border:2px solid rgba(255,255,0,0.6);background:rgba(255,255,0,0.08);pointer-events:none;box-sizing:border-box;"></div>';
            } else if (rangeType === 'arcAhead') {
                var arcWide = range * 0.6;
                var arcNarrow = (cells.h * GRID_CELL_SIZE) / 3;
                var arcLeft = itemLeftX - range;
                var arcSvgW = range;
                var arcSvgH = arcWide * 2;
                var arcMidY = arcWide;
                html += '<svg viewBox="0 0 ' + arcSvgW + ' ' + arcSvgH + '" style="position:absolute;left:' + arcLeft + 'px;top:' + (centerY - arcWide) + 'px;width:' + arcSvgW + 'px;height:' + arcSvgH + 'px;pointer-events:none;overflow:visible;"><polygon points="' + arcSvgW + ',' + (arcMidY - arcNarrow) + ' 0,0 0,' + arcSvgH + ' ' + arcSvgW + ',' + (arcMidY + arcNarrow) + '" fill="rgba(255,255,0,0.08)" stroke="rgba(255,255,0,0.6)" stroke-width="2"/></svg>';
            } else {
                html += '<div style="position:absolute;left:' + (centerX - range) + 'px;top:' + (centerY - range) + 'px;width:' + (range * 2) + 'px;height:' + (range * 2) + 'px;border:2px solid rgba(255,255,0,0.6);border-radius:50%;background:rgba(255,255,0,0.08);pointer-events:none;box-sizing:border-box;"></div>';
            }
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
            var item = placed.item;
            var cells = itemToGridCells(item);
            var icon = getIconPosition(item);
            var iconUrl = icon.url;
            var iconX = icon.x;
            var iconY = icon.y;
            var width = cells.w * GRID_CELL_SIZE;
            var height = cells.h * GRID_CELL_SIZE;
            var itemHtml = '<div class="nightfall-placed-item" data-id="' + placed.id + '" style="position:absolute;left:' + (placed.gridX * GRID_CELL_SIZE) + 'px;top:' + (GRID_OFFSET_Y + placed.gridY * GRID_CELL_SIZE) + 'px;width:' + width + 'px;height:' + height + 'px;cursor:pointer;pointer-events:auto;"><div style="position:absolute;left:50%;top:50%;width:48px;height:48px;background-image:url(' + iconUrl + ');background-position:-' + iconX + 'px -' + iconY + 'px;background-repeat:no-repeat;transform:translate(-50%,-50%) scale(0.5);pointer-events:none;"></div></div>';
            if (item.type === 'Traps') {
                trapsHtml += itemHtml;
            } else {
                html += itemHtml;
            }
        });
        itemsEl.innerHTML = html;
        trapsEl.innerHTML = trapsHtml;

        if (!itemsEl._nightfallPlacedBound) {
            itemsEl._nightfallPlacedBound = true;
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
                if (toolItems[di].type === 'Offensive') {
                    allDps.push((toolItems[di].damage || 0) / (toolItems[di].fireRate || 1));
                }
            }
            var minDps = allDps.length ? Math.min.apply(null, allDps) : 0;
            var maxDps = allDps.length ? Math.max.apply(null, allDps) : 0;
            sections.forEach(function(type) {
                var items = toolItems.filter(function(item) { return item.type === type; });
                if (items.length === 0) return;
                html += '<div style="font-size:12px;font-weight:bold;color:#fff;padding:8px 0 2px 0;border-bottom:1px solid rgba(255,255,255,0.3);">' + type + '</div>';
                html += '<div style="display:flex;flex-wrap:wrap;padding:4px 0 2px 0;">';
                items.forEach(function(item) {
                var icon = getIconPosition(item);
                var iconUrl = icon.url;
                var iconX = icon.x;
                var iconY = icon.y;
                var unlockParts = [];
                if (item.unlock.score > 0) unlockParts.push('Score of ' + item.unlock.score);
                if (item.unlock.time > 0) {
                    var mins = Math.floor(item.unlock.time / 60);
                    var secs = item.unlock.time % 60;
                    var timeStr = (mins > 0 ? mins + ':' : '') + (secs < 10 && mins > 0 ? '0' : '') + secs + 's';
                    unlockParts.push('Surviving ' + timeStr);
                }
                var hasUnlock = unlockParts.length > 0;
                var unlockText = hasUnlock ? 'Unlocked by: ' + unlockParts.join(' or ') : '';
                var scoreMet = G.debugMode || item.unlock.score <= 0 || G.score >= item.unlock.score;
                var timeMet = G.debugMode || item.unlock.time <= 0 || G.time >= item.unlock.time;
                var wasUnlocked = G.unlockedItems[item.name];
                if (hasUnlock && (scoreMet && timeMet) && !wasUnlocked) {
                    G.unlockedItems[item.name] = true;
                    wasUnlocked = true;
                }
                var isLocked = hasUnlock && !wasUnlocked;
                var unlockColorClass = isLocked ? 'red' : 'green';
                var animText = item.animation ? '<div style="padding-top:4px;font-size:11px;color:#aaa;">Animation: ' + item.animation + '</div>' : '';

                var healthPct = item.type === 'Barricades' ? Math.min(1, Math.max(0, (item.health - 100) / 900)) : item.type === 'Distractions' ? Math.min(1, Math.max(0, (item.health - 10) / 110)) : Math.min(100, Math.max(0, item.health)) / 100;
                var damagePct = item.type === 'Traps' ? (item.damage <= 90 ? 0.05 + (Math.max(0, item.damage - 40) / 50) * 0.65 : 0.70 + (Math.min(1, (item.damage - 90) / 910)) * 0.30) : Math.min(100, Math.max(0, item.damage)) / 100;
                var dps = item.type === 'Offensive' ? (item.damage || 0) / (item.fireRate || 1) : 0;
                var dpsPct = 0;
                if (item.type === 'Offensive') {
                    dpsPct = (maxDps === minDps) ? 0.5 : 0.10 + 0.80 * ((dps - minDps) / (maxDps - minDps));
                }
                var healthBar = makeBar(healthPct, '#0a0,#6f6', true);
                var damageBar = makeBar(damagePct, '#f60,#fc0', false);
                var dpsBar = makeBar(dpsPct, '#f60,#fc0', false);

                var rawCpS = Game.cookiesPs || 1;
                var costCookies = rawCpS * item.cost;
                var canAfford = Game.cookies >= costCookies;
                var costStr = (typeof Beautify === 'function') ? Beautify(Math.round(costCookies)) : Math.round(costCookies);
                var costTime = formatCostTime(item.cost) + ' raw CpS';
                var priceHtml = '<div style="float:right;text-align:right;"><span class="price' + (canAfford ? '' : ' disabled') + '">' + costStr + '</span><div style="font-size:80%;opacity:0.8;">(' + costTime + ')</div></div>';

                var effectsHtml = '';
                if (item.effects && item.effects.length) {
                    var effectLines = item.effects.map(function(e) {
                        return '<div class="' + (e.positive ? 'green' : 'red') + '">&bull; ' + e.text + '</div>';
                    }).join('');
                    effectsHtml = '<div class="effects">' + effectLines + '</div>';
                }
                var ft = formatFlavorText(item.desc);
                var mainDesc = ft.main;
                var flavorText = ft.flavor;
                var tooltipHTML = '<div style="z-index:10;padding:8px 4px;min-width:280px;position:relative;" id="tooltipNightfallTool"><div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;width:48px;height:48px;background-image:url(' + iconUrl + ');background-position:-' + iconX + 'px -' + iconY + 'px;"></div><div class="name">' + item.name + '</div>' + priceHtml + '<div style="clear:both;"></div><div class="line"></div><div style="margin:6px 0px;font-size:11px;"><b>' + (item.type === 'Distractions' ? 'Distraction:' : 'Health:') + '</b> ' + healthBar + '</div>' + (item.type === 'Traps' ? '<div style="margin:6px 0px;font-size:11px;"><b>Damage:</b> ' + damageBar + '</div>' : '') + (item.type === 'Offensive' ? '<div style="margin:6px 0px;font-size:11px;"><b>DPS:</b> ' + dpsBar + '</div>' : '') + (hasUnlock ? '<div style="margin:6px 0px;font-size:11px;"><b>Unlocked by:</b> <span class="' + unlockColorClass + '">' + unlockText.replace('Unlocked by: ', '') + '</span></div>' : '') + '<div class="line"></div><div class="description">' + mainDesc + '</div>' + effectsHtml + flavorText + animText + '</div>';
                var tooltipAttrs = (Game.getTooltip ? Game.getTooltip(tooltipHTML, 'middle', true) : '');
                var isSelected = G.selectedTool && G.selectedTool.name === item.name;
                html += '<div class="nightfall-tool-slot shadowFilter' + (isLocked ? ' locked' : '') + (isSelected ? ' selected' : '') + '" data-item-name="' + item.name + '" style="width:48px;height:48px;background-image:url(' + iconUrl + ');background-position:-' + iconX + 'px -' + iconY + 'px;margin:2px;cursor:pointer;' + (isSelected ? 'box-shadow:0 0 0 2px #fff;' : '') + '" ' + tooltipAttrs + '></div>';
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
            var active = tab === activeTab;
            html += '<a href="#" class="smallFancyButton nightfall-tab-btn' + (active ? '' : ' off') + '" data-tab="' + tab + '" style="flex:1;padding:4px 2px;text-align:center;">' + tab + '</a>';
        });
        html += '</div>';
        if (activeTab === 'Grandmas') {
        var grandmas = NightfallM.grandmaData || [];
        html += '<div style="display:flex;flex-wrap:wrap;padding:8px;align-items:flex-start;">';
        grandmas.forEach(function(g) {
            var url = (Game.resPath || 'https://orteil.dashnet.org/cookieclicker/') + 'img/' + g.file;
            var ft2 = formatFlavorText(g.info);
            var mainInfo = ft2.main;
            var flavorText = ft2.flavor;
            var tooltipHTML = '<div style="padding:8px;min-width:220px;position:relative;"><div class="name">' + g.name + '</div><div class="description">' + mainInfo + '</div>' + flavorText + '</div>';
            var tooltipAttrs = (Game.getTooltip ? Game.getTooltip(tooltipHTML, 'middle', true) : '');
            html += '<div style="width:64px;height:64px;margin:2px;background-image:url(' + url + ');background-size:64px 64px;background-position:0 0;background-repeat:no-repeat;cursor:default;user-select:none;-webkit-user-drag:none;" ' + tooltipAttrs + '></div>';
        });
        html += '</div>';
    } else {
        html += '<div style="min-height:80px;padding:8px;color:#aaa;">No data yet.</div>';
    }
        contentEl.innerHTML = html;
    };

    NightfallM.unlockAll = function() {
        if (!G.unlockedItems) G.unlockedItems = {};
        (NightfallM.toolItems || []).forEach(function(item) {
            G.unlockedItems[item.name] = true;
        });
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
        '<div id="nightfallStatus" style="position:relative;box-sizing:border-box;width:' + effectiveWidth + 'px;height:24px;padding:0 8px;background:linear-gradient(180deg,#1a1a1a 0%,#0d0d0d 100%);font-size:12px;color:#fff;text-shadow:1px 1px 2px #000;">' +
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

    if (tilesViewport && !tilesViewport._nightfallDragBound) {
        tilesViewport._nightfallDragBound = true;
        var isDragging = false;
        var dragStartX = 0;
        var dragStartLeft = 0;
        tilesViewport.addEventListener('pointerdown', function(e) {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartLeft = parseFloat(tilesEl.style.left || 0);
            tilesViewport.style.cursor = 'grabbing';
        });
        window.addEventListener('pointermove', function(e) {
            if (!isDragging) return;
            var maxScroll = Math.max(0, (NightfallM.tileBgWidth || tilesEl.offsetWidth) - tilesViewport.offsetWidth);
            var newLeft = Math.max(-maxScroll, Math.min(0, dragStartLeft + (e.clientX - dragStartX)));
            setGameLayerScroll(newLeft);
            updateScrollbarThumb();
        });
        window.addEventListener('pointerup', function() {
            if (!isDragging) return;
            isDragging = false;
            tilesViewport.style.cursor = 'grab';
        });
    }

    if (scrollbarEl && !scrollbarEl._nightfallScrollbarBound) {
        scrollbarEl._nightfallScrollbarBound = true;
        var isThumbDragging = false;
        var thumbStartX = 0;
        var thumbStartLeft = 0;
        function setScrollFromThumb(newThumbLeft, viewportWidth, thumbWidth) {
            var contentWidth = NightfallM.tileBgWidth || tilesEl.offsetWidth;
            var maxScroll = Math.max(0, contentWidth - viewportWidth);
            var newScroll = (newThumbLeft / (viewportWidth - thumbWidth)) * maxScroll;
            setGameLayerScroll(-newScroll);
            updateScrollbarThumb();
        }
        scrollbarThumb.addEventListener('pointerdown', function(e) {
            e.preventDefault();
            isThumbDragging = true;
            thumbStartX = e.clientX;
            thumbStartLeft = parseFloat(scrollbarThumb.style.left) || 0;
            scrollbarThumb.style.cursor = 'grabbing';
        });
        scrollbarEl.addEventListener('pointerdown', function(e) {
            if (e.target === scrollbarThumb) return;
            var viewportWidth = tilesViewport.offsetWidth;
            var thumbWidth = parseFloat(scrollbarThumb.style.width) || 20;
            var clickX = e.clientX - scrollbarEl.getBoundingClientRect().left;
            var newThumbLeft = Math.max(0, Math.min(viewportWidth - thumbWidth, clickX - thumbWidth / 2));
            setScrollFromThumb(newThumbLeft, viewportWidth, thumbWidth);
        });
        window.addEventListener('pointermove', function(e) {
            if (!isThumbDragging) return;
            var viewportWidth = tilesViewport.offsetWidth;
            var thumbWidth = parseFloat(scrollbarThumb.style.width) || 20;
            var newThumbLeft = Math.max(0, Math.min(viewportWidth - thumbWidth, thumbStartLeft + e.clientX - thumbStartX));
            setScrollFromThumb(newThumbLeft, viewportWidth, thumbWidth);
        });
        window.addEventListener('pointerup', function() {
            if (!isThumbDragging) return;
            isThumbDragging = false;
            scrollbarThumb.style.cursor = 'grab';
        });
    }

    var toolsContentEl = document.getElementById('nightfallToolsContent');
    NightfallM.activeToolTab = NightfallM.activeToolTab || 'High Scores';
    if (toolsContentEl && !toolsContentEl._nightfallTabBound) {
        toolsContentEl._nightfallTabBound = true;
        toolsContentEl.addEventListener('click', function(e) {
            var btn = e.target.closest('.nightfall-tab-btn');
            if (!btn) return;
            e.preventDefault();
            NightfallM.activeToolTab = btn.getAttribute('data-tab');
            NightfallM.renderTools();
        });
    }
    NightfallM.gridEl = document.getElementById('nightfallGrid');
    NightfallM.trapsEl = document.getElementById('nightfallTraps');
    NightfallM.placedItemsEl = document.getElementById('nightfallPlacedItems');
    NightfallM.dragPreviewEl = document.getElementById('nightfallDragPreview');
    NightfallM.entitiesEl = document.getElementById('nightfallEntities');
    NightfallM.dragEl = document.getElementById('nightfallDrag');

    renderGrid();

    function placeSelectedTool(e) {
        if (!G.selectedTool || !G.isDragging || Game.elderWrath !== 0 || !NightfallM.gridEl) return;
        var shiftHeld = e && e.shiftKey;
        var gridBox = NightfallM.gridEl.getBoundingClientRect();
        var cursorX = (typeof NightfallM.cursorX === 'number') ? NightfallM.cursorX : Game.mouseX;
        var cursorY = (typeof NightfallM.cursorY === 'number') ? NightfallM.cursorY : Game.mouseY;
        var mx = cursorX - gridBox.left;
        var my = cursorY - gridBox.top;
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
                    placed.hp = placed.item.health;
                }
            } else {
                var itemHp = G.selectedTool.health;
                G.placedItems.push({
                    id: Date.now() + Math.random(),
                    item: G.selectedTool,
                    gridX: gridX,
                    gridY: gridY,
                    hp: itemHp
                });
            }
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

    if (NightfallM.gridEl && !NightfallM.gridEl._nightfallGridBound) {
        NightfallM.gridEl._nightfallGridBound = true;
        NightfallM.gridEl.addEventListener('click', placeSelectedTool);
    }

    if (toolsContentEl && !toolsContentEl._nightfallToolDragBound) {
        toolsContentEl._nightfallToolDragBound = true;
        toolsContentEl.addEventListener('click', function(e) {
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
    }

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

        tilesViewport.style.width = newEffectiveWidth + 'px';
        tilesEl.style.width = newStripW + 'px';

        var gridEl = NightfallM.gridEl || document.getElementById('nightfallGrid');
        var trapsEl = NightfallM.trapsEl || document.getElementById('nightfallTraps');
        var placedEl = NightfallM.placedItemsEl || document.getElementById('nightfallPlacedItems');
        var previewEl = NightfallM.dragPreviewEl || document.getElementById('nightfallDragPreview');
        var entitiesEl = document.getElementById('nightfallEntities');
        var layerEls = [gridEl, trapsEl, placedEl, previewEl, entitiesEl];
        for (var li = 0; li < layerEls.length; li++) {
            if (layerEls[li]) layerEls[li].style.width = NightfallM.tileBgWidth + 'px';
        }

        var maxScroll = Math.max(0, NightfallM.tileBgWidth - newEffectiveWidth);
        var currentLeft = parseFloat(tilesEl.style.left || 0);
        var clampedLeft = Math.max(-maxScroll, Math.min(0, currentLeft));
        setGameLayerScroll(clampedLeft);

        var imgs = buildTileImgHTML(newTilesNeeded, bgUrl, TILE_W, TILE_H);
        tilesEl.innerHTML = imgs;
        NightfallM.tileImgs = tilesEl.querySelectorAll('.nightfall-tile-img');

        var statusEl = document.getElementById('nightfallStatus');
        if (statusEl) statusEl.style.width = newEffectiveWidth + 'px';
        if (scrollbarEl) {
            scrollbarEl.style.width = newEffectiveWidth + 'px';
            scrollbarEl.style.display = newScrollbarDisplay;
        }
        updateScrollbarThumb();
        NightfallM.renderPlacedItems();
        renderGrid();
    }

    if (!NightfallM._resizeObserver && typeof ResizeObserver !== 'undefined') {
        NightfallM._resizeObserver = new ResizeObserver(function() { onResize(); });
        NightfallM._resizeObserver.observe(NightfallM.div);
    }

    if (div && !div._nightfallCancelBound) {
        div._nightfallCancelBound = true;
        div.addEventListener('click', function(e) {
            if (!G.isDragging) return;
            if (e.target.closest('#nightfallGrid, .nightfall-placed-item, .nightfall-tool-slot')) return;
            removeMovingPlaced();
            clearDrag();
            NightfallM.renderTools();
            NightfallM.renderPlacedItems();
            renderGrid();
        });
    }

    if (div && !div._nightfallPointerBound) {
        div._nightfallPointerBound = true;
        div.addEventListener('pointerdown', function(e) {
            NightfallM.cursorX = e.clientX;
            NightfallM.cursorY = e.clientY;
        });
    }
    if (!NightfallM._pointerMoveBound && typeof window !== 'undefined') {
        NightfallM._pointerMoveBound = true;
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

function getLaneY(lane, type) {
    var h = (type && type.frameH) || GRID_CELL_SIZE;
    return lane * GRID_CELL_SIZE + GRID_OFFSET_Y + GRID_CELL_SIZE - h / 2;
}

function makeBar(pct, gradient, marginRight) {
    var w = pct * 100;
    var mr = marginRight ? 'margin-right:8px;' : '';
    return '<div style="display:inline-block;vertical-align:middle;width:80px;height:8px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.2);position:relative;' + mr + '"><div style="position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,' + gradient + ');width:' + w + '%;"></div><div style="position:absolute;top:-2px;left:' + w + '%;width:2px;height:12px;background:#fff;transform:translateX(-50%);"></div></div>';
}

function removeMovingPlaced() {
    if (!G.movingPlacedId) return;
    var idx = G.placedItems.findIndex(function(p) { return p.id === G.movingPlacedId; });
    if (idx >= 0) {
        G.placedItems.splice(idx, 1);
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

var LANE_WEIGHTS = [2, 3, 6, 6, 6, 6];
var LANE_TOTAL_WEIGHT = 29;

function pickWeightedLane() {
    var roll = Math.random() * LANE_TOTAL_WEIGHT;
    var acc = 0;
    for (var li = 0; li < LANE_WEIGHTS.length; li++) {
        acc += LANE_WEIGHTS[li];
        if (roll < acc) return li;
    }
    return LANE_WEIGHTS.length - 1;
}

function removePlacedItem(placed) {
    var idx = G.placedItems.indexOf(placed);
    if (idx !== -1) G.placedItems.splice(idx, 1);
    G.needsRenderPlacedItems = true;
}

function updateEnemyAnimation(enemy, dt) {
    enemy.frameTimer += dt;
    var anim = enemy.type.anims && enemy.type.anims[enemy.anim];
    if (anim) {
        var frameDuration = 1 / anim.fps;
        while (enemy.frameTimer >= frameDuration) {
            enemy.frameTimer -= frameDuration;
            enemy.frame = (enemy.frame + 1) % anim.frames;
        }
    }
}

// Single source of truth for "what item (if any) would a grandma of width w, centered
// at (x, y), be colliding with right now?". Both real collision handling and avoidance
// look-ahead reuse this exact function, so they can never disagree with each other.
function findCollisionAt(x, y, w) {
    var left = x - w / 2;
    var right = x + w / 2;
    var top = y - GRID_CELL_SIZE / 2;
    var blocking = null;
    var distractions = [];
    var seenDist = {};
    var distDeepOverlap = false;
    var laneItems = G.laneItems;
    if (!laneItems) return null;
    for (var li = 0; li < COLLISION_TILE_Y_OFFSETS.length; li++) {
        var tileY = top + COLLISION_TILE_Y_OFFSETS[li];
        var candidateLanes = getLanesForTileY(tileY);
        for (var ci = 0; ci < candidateLanes.length; ci++) {
            var laneData = laneItems[candidateLanes[ci]];
            if (!laneData || !laneData.nonTraps) continue;
            var items = laneData.nonTraps;
            for (var i = 0; i < items.length; i++) {
                var placed = items[i];
                var c = getPlacedCenter(placed);
                var isDist = placed.item.type === 'Distractions';
                if (right > c.leftX + GRID_CELL_SIZE && left < c.rightX) {
                    if (tileY < c.botY && tileY + GRID_CELL_SIZE > c.topY) {
                        if (isDist) {
                            if (!seenDist[placed.id]) {
                                seenDist[placed.id] = true;
                                distractions.push(placed);
                            }
                            distDeepOverlap = true;
                        } else if (!blocking) {
                            blocking = placed;
                        }
                    }
                }
            }
        }
    }
    if (blocking) return { primary: blocking, distractions: distractions, deepOverlap: true };
    if (distractions.length > 0) return { primary: distractions[0], distractions: distractions, deepOverlap: distDeepOverlap };
    return null;
}

function checkGrandmaCollision(enemy) {
    var w = enemy.type.frameW;
    return findCollisionAt(enemy.x, enemy.y, w);
}

function checkTrapCollisions(enemy) {
    var w = enemy.type.frameW;
    var h = enemy.type.frameH;
    var tileLeft = enemy.x - w / 2 + GRID_CELL_SIZE * 2;
    var tileRight = tileLeft + GRID_CELL_SIZE;
    var grandmaTop = enemy.y - GRID_CELL_SIZE / 2;
    var traps = [];
    var seenTrap = {};
    var laneItems = G.laneItems;
    if (!laneItems) return traps;
    for (var li = 0; li < COLLISION_TILE_Y_OFFSETS.length; li++) {
        var tileY = grandmaTop + COLLISION_TILE_Y_OFFSETS[li];
        var candidateLanes = getLanesForTileY(tileY);
        for (var ci = 0; ci < candidateLanes.length; ci++) {
            var checkLane = candidateLanes[ci];
            var laneData = laneItems[checkLane];
            if (!laneData || !laneData.traps) continue;
            var items = laneData.traps;
            for (var i = 0; i < items.length; i++) {
                var placed = items[i];
                if (seenTrap[placed.id]) continue;
                var c = getPlacedCenter(placed);
                if (tileRight > c.leftX && tileLeft < c.rightX) {
                    if (tileY < c.botY && tileY + GRID_CELL_SIZE > c.topY) {
                        seenTrap[placed.id] = true;
                        traps.push(placed);
                    }
                }
            }
        }
    }
    return traps;
}

var SPAWN_CONFIG = {
    startRate: 0.1429,
    endRate: 3.0,
    rampTime: 1200,
    intervalFluctuationMin: 0.85,
    intervalFluctuationMax: 1.15,
    maxActiveEnemies: 200,
    healthRampRate: 0.015
};

function getDifficultyMultiplier(timeSeconds) {
    return 1 + timeSeconds * SPAWN_CONFIG.healthRampRate;
}

function getSpawnRate(timeSeconds) {
    var t = Math.min(timeSeconds / SPAWN_CONFIG.rampTime, 1);
    var eased = t * t * (3 - 2 * t);
    return SPAWN_CONFIG.startRate + (SPAWN_CONFIG.endRate - SPAWN_CONFIG.startRate) * eased;
}

function getSpawnInterval(timeSeconds) {
    var rate = getSpawnRate(timeSeconds);
    var baseInterval = 1 / rate;
    var fluctuation = SPAWN_CONFIG.intervalFluctuationMin + Math.random() * (SPAWN_CONFIG.intervalFluctuationMax - SPAWN_CONFIG.intervalFluctuationMin);
    return baseInterval * fluctuation;
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
    var w = type.frameW;
    var speedVariance = 0.80 + Math.random() * 0.4;
    var enemy = {
        id: ++G.enemyIdCounter,
        type: type,
        x: -w - 4 + (xOffset || 0),
        y: getLaneY(lane, type),
        lane: lane,
        hp: type.hp * G.difficultyMultiplier,
        maxHp: type.hp * G.difficultyMultiplier,
        speed: type.speed,
        speedVariance: speedVariance,
        anim: 'walk',
        frame: 0,
        frameTimer: 0,
        attackCooldown: 0,
        isDead: false
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
                enemy.y = getLaneY(newLane, enemy.type);
            }
        }
    }
}

function triggerTrap(trap, triggeringEnemy) {
    var trapDamage = trap.item.damage || 0;
    var trapRange = trap.item.range;
    var effect = trap.item.effect;

    if (!triggeringEnemy.trapsTriggered) triggeringEnemy.trapsTriggered = {};
    if (!triggeringEnemy.trapsTriggered[trap.id] && !triggeringEnemy.isDead) {
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
        var inRange = false;
        if (trapRange > 1) {
            var collisionTileXOffsets = getCollisionTileXOffsets(otherEnemy.type.frameW);
            var trapRangePxSq = trapRangePx * trapRangePx;
            for (var j = 0; j < COLLISION_TILE_Y_OFFSETS.length; j++) {
                var tileY = otherEnemy.y - GRID_CELL_SIZE / 2 + COLLISION_TILE_Y_OFFSETS[j];
                for (var xi = 0; xi < collisionTileXOffsets.length; xi++) {
                    var tileX = otherEnemy.x + collisionTileXOffsets[xi];
                    var dx = tileX - c.x;
                    var dy = tileY - c.y;
                    var distSq = dx * dx + dy * dy;
                    if (distSq <= trapRangePxSq) {
                        inRange = true;
                        break;
                    }
                }
                if (inRange) break;
            }
        }
        if (inRange) {
            otherEnemy.trapsTriggered[trap.id] = true;
            applyTrapEffect(otherEnemy, trapDamage, effect);
        }
    }
    if (trapDestroyed) {
        removePlacedItem(trap);
    }
}

var AVOIDANCE_LOOKAHEAD = GRID_CELL_SIZE * 2;

function checkAvoidanceItems(enemy) {
    if (!enemy.avoidanceChecked) enemy.avoidanceChecked = {};
    if (enemy.laneShiftTargetY !== undefined) return;
    var w = enemy.type.frameW;
    var rearX = enemy.x - w / 2;
    // Calculate current lane from actual Y position, not enemy.lane (may be out of sync due to trap effects)
    var currentLane = Math.floor((enemy.y - GRID_OFFSET_Y) / GRID_CELL_SIZE);
    var collision = findCollisionAt(enemy.x + AVOIDANCE_LOOKAHEAD, enemy.y, w);
    if (!collision || !collision.primary.item.avoidance) return;
    if (enemy.avoidanceChecked[collision.primary.id]) return;
    enemy.avoidanceChecked[collision.primary.id] = true;
    console.log('[DETOUR] Detected ' + collision.primary.item.name + ' at lane ' + currentLane);
    if (!G.debugMode && Math.random() >= collision.primary.item.avoidance) {
        console.log('[DETOUR] Random check failed');
        return;
    }
    var triggerC = getPlacedCenter(collision.primary);
    var detourTop = collision.primary.gridY;
    var detourBottom = collision.primary.gridY + triggerC.cells.h - 1;
    // Grandma's 3 collision tiles span currentLane-1, currentLane, currentLane+1
    // Shift to detourBottom + 2 (down) or detourTop - 2 (up) to ensure all tiles clear the detour
    var upLane = detourTop - 2;
    var downLane = detourBottom + 2;
    var canUp = upLane >= 0;
    var canDown = downLane < GRID_ROWS;
    console.log('[DETOUR] Detour lanes: ' + detourTop + '-' + detourBottom + ', grandma before: lanes ' + (currentLane - 1) + '-' + (currentLane + 1) + ' y:' + enemy.y.toFixed(1));
    console.log('[DETOUR] upLane:' + upLane + ' upY:' + getLaneY(upLane, enemy.type).toFixed(1) + ' canUp:' + canUp);
    console.log('[DETOUR] downLane:' + downLane + ' downY:' + getLaneY(downLane, enemy.type).toFixed(1) + ' canDown:' + canDown);
    if (canUp && canDown) {
        var dir = Math.random() < 0.5 ? upLane : downLane;
        var laneDelta = dir - currentLane;
        enemy.laneShiftTargetY = enemy.y + laneDelta * GRID_CELL_SIZE;
        enemy.laneShiftTargetLane = dir;
        console.log('[DETOUR] Shifting to lane ' + dir + ' (delta:' + laneDelta + '), grandma after: lanes ' + (dir - 1) + '-' + (dir + 1) + ' targetY:' + enemy.laneShiftTargetY.toFixed(1));
    } else if (canUp) {
        var laneDelta = upLane - currentLane;
        enemy.laneShiftTargetY = enemy.y + laneDelta * GRID_CELL_SIZE;
        enemy.laneShiftTargetLane = upLane;
        console.log('[DETOUR] Shifting up to lane ' + upLane + ' (delta:' + laneDelta + '), grandma after: lanes ' + (upLane - 1) + '-' + (upLane + 1) + ' targetY:' + enemy.laneShiftTargetY.toFixed(1));
    } else if (canDown) {
        var laneDelta = downLane - currentLane;
        enemy.laneShiftTargetY = enemy.y + laneDelta * GRID_CELL_SIZE;
        enemy.laneShiftTargetLane = downLane;
        console.log('[DETOUR] Shifting down to lane ' + downLane + ' (delta:' + laneDelta + '), grandma after: lanes ' + (downLane - 1) + '-' + (downLane + 1) + ' targetY:' + enemy.laneShiftTargetY.toFixed(1));
    } else {
        console.log('[DETOUR FAIL] No clear lane, grandma lanes: ' + (currentLane - 1) + '-' + (currentLane + 1) + ', detour lanes: ' + detourTop + '-' + detourBottom);
    }
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
            var spawnLane = Math.floor(Math.random() * GRID_ROWS);
            var enemy = spawnEnemy(type, spawnLane, c.x + 48);
            if (enemy) enemy.x = c.x + (Math.random() - 0.5) * c.cells.w * GRID_CELL_SIZE;
        }
        G.attackEffects.push({ x: c.x, y: c.y, range: 20, minRange: 0, rangeType: 'circle', life: 0.4, maxLife: 0.4 });
    } else if (roll < 0.90) {
        for (var ei = 0; ei < G.enemies.length; ei++) {
            var enemy2 = G.enemies[ei];
            if (enemy2.isDead) continue;
            var ddx = enemy2.x - c.x;
            var ddy = enemy2.y - c.y;
            if (ddx * ddx + ddy * ddy <= 35 * 35) {
                applyDamageToEnemy(enemy2, 50);
            }
        }
        G.attackEffects.push({ x: c.x, y: c.y, range: 35, minRange: 0, rangeType: 'circle', life: 0.5, maxLife: 0.5 });
    } else if (roll < 0.95) {
        if (typeof Game !== 'undefined' && Game.shimmer) {
            new Game.shimmer('golden', {noWrath: true});
        }
    } else {
        if (typeof Game !== 'undefined' && Game.shimmer) {
            new Game.shimmer('golden', {wrath: true});
        }
    }
}

function updateEnemy(enemy, dt) {
    if (enemy.isDead) return;
    if (!enemy.trapsTriggered) enemy.trapsTriggered = {};
    checkAvoidanceItems(enemy);
    var overlappingTraps = checkTrapCollisions(enemy);
    for (var ti = 0; ti < overlappingTraps.length; ti++) {
        if (enemy.isDead) break;
        var trap = overlappingTraps[ti];
        if (!enemy.trapsTriggered[trap.id]) {
            triggerTrap(trap, enemy);
        }
    }
    if (enemy.isDead) return;
    var collision = checkGrandmaCollision(enemy);
    var animHandled = false;
    if (collision) {
        var primary = collision.primary;
        var isDistraction = primary.item && primary.item.type === 'Distractions';
        if (isDistraction) {
            enemy.anim = 'walk';
            enemy.frame = 0;
        } else {
            enemy.anim = 'attack';
            enemy.attackCooldown += dt;
            var attackInterval = enemy.type.attackInterval;
            if (enemy.attackCooldown >= attackInterval) {
                enemy.attackCooldown -= attackInterval;
                var damage = enemy.type.damage;
                if (primary.hp !== undefined) {
                    primary.hp -= damage;
                    if (primary.hp <= 0) {
                        if (primary.item.name === 'Crate') {
                            triggerCrateOpen(primary);
                        }
                        removePlacedItem(primary);
                    }
                }
            }
            updateEnemyAnimation(enemy, dt);
            animHandled = true;
        }
        var allDistractions = collision.distractions;
        if (allDistractions.length > 0) {
            var closest = allDistractions[0];
            var closestDist = Math.abs(enemy.x - (closest.gridX * GRID_CELL_SIZE));
            for (var di = 1; di < allDistractions.length; di++) {
                var dist = allDistractions[di];
                var distVal = Math.abs(enemy.x - (dist.gridX * GRID_CELL_SIZE));
                if (distVal < closestDist) {
                    closest = dist;
                    closestDist = distVal;
                }
            }
            closest.triggered = true;
            closest.grandmaCount = (closest.grandmaCount || 0) + 1;
        }
    } else {
        enemy.anim = 'walk';
        enemy.attackCooldown = 0;
    }
    var speedMult = 1;
    var isBlocked = collision ? collision.deepOverlap : false;
    if (enemy.speedModifierTimer && enemy.speedModifierTimer > 0) {
        enemy.speedModifierTimer -= dt;
        if (enemy.speedModifierTimer <= 0) {
            enemy.speedModifier = 0;
            enemy.speedModifierType = null;
            enemy.speedModifierTimer = 0;
        } else if (enemy.speedModifierType === 'slow') {
            speedMult = 1 - enemy.speedModifier;
        } else if (enemy.speedModifierType === 'speed') {
            speedMult = 1 + enemy.speedModifier;
        }
    }
    if (!isBlocked) {
        enemy.x += enemy.speed * enemy.speedVariance * speedMult * dt;
    }
    if (enemy.laneShiftTargetY !== undefined && enemy.laneShiftTargetY !== null) {
        var shiftSpeed = 40;
        var dy = enemy.laneShiftTargetY - enemy.y;
        var step = shiftSpeed * dt;
        if (Math.abs(dy) <= step) {
            enemy.y = enemy.laneShiftTargetY;
            enemy.lane = enemy.laneShiftTargetLane;
            enemy.laneShiftTargetY = null;
            enemy.laneShiftTargetLane = null;
            console.log('[SHIFT] Complete, new lane: ' + enemy.lane + ' y:' + enemy.y.toFixed(1));
        } else {
            enemy.y += Math.sign(dy) * step;
        }
    }
    var enemyGridX = Math.floor(enemy.x / GRID_CELL_SIZE);
    var enemyGridY = Math.floor((enemy.y - GRID_OFFSET_Y) / GRID_CELL_SIZE);
    for (var i = 0; i < G.triggerTiles.length; i++) {
        var trigger = G.triggerTiles[i];
        if (enemyGridX === trigger.gridX && enemyGridY === trigger.gridY) {
            enemy.isDead = true;
            G.gameOver = true;
            break;
        }
    }
    if (!animHandled) {
        if (isBlocked || speedMult <= 0) {
            enemy.anim = 'walk';
            enemy.frame = 0;
        } else {
            updateEnemyAnimation(enemy, dt);
        }
    }
}

function getLanesForTileY(tileY) {
    var laneStart = Math.floor((tileY - GRID_OFFSET_Y) / GRID_CELL_SIZE);
    var laneEnd = Math.floor((tileY + GRID_CELL_SIZE - 1 - GRID_OFFSET_Y) / GRID_CELL_SIZE);
    var result = [];
    for (var l = laneStart; l <= laneEnd; l++) {
        if (l >= 0 && l < GRID_ROWS) result.push(l);
    }
    return result;
}

function applyDamageToEnemy(enemy, damage) {
    var actualDamage = Math.min(damage, enemy.hp);
    enemy.hp -= damage;
    var scoreRatio = enemy.maxHp > 0 ? enemy.type.hp / enemy.maxHp : 1;
    G.score += actualDamage * scoreRatio;
    if (enemy.hp <= 0) enemy.isDead = true;
}

function getPlacedCenter(placed) {
    var cells = itemToGridCells(placed.item);
    return {
        x: (placed.gridX + cells.w / 2) * GRID_CELL_SIZE,
        y: GRID_OFFSET_Y + (placed.gridY + cells.h / 2) * GRID_CELL_SIZE,
        leftX: placed.gridX * GRID_CELL_SIZE,
        rightX: (placed.gridX + cells.w) * GRID_CELL_SIZE,
        topY: GRID_OFFSET_Y + placed.gridY * GRID_CELL_SIZE,
        botY: GRID_OFFSET_Y + (placed.gridY + cells.h) * GRID_CELL_SIZE,
        cells: cells
    };
}

function getCollisionTileXOffsets(frameW) {
    var fw = frameW || 48;
    var offsets = [];
    for (var ox = -fw / 2; ox < fw / 2; ox += GRID_CELL_SIZE) {
        offsets.push(ox);
    }
    offsets.push(fw / 2 - 1);
    return offsets;
}

function getEnemiesInWeaponRange(placed) {
    var result = [];
    for (var ei = 0; ei < G.enemies.length; ei++) {
        var enemy = G.enemies[ei];
        if (enemy.isDead) continue;
        if (isEnemyInOffensiveRange(enemy, placed)) {
            if (!isBarricadeBlocking(placed, enemy.x)) {
                result.push(enemy);
            }
        }
    }
    return result;
}

function isEnemyInOffensiveRange(enemy, placed) {
    var item = placed.item;
    var c = getPlacedCenter(placed);
    var range = item.range || 0;
    var minRange = item.minRange || 0;
    var rangeType = item.rangeType;
    var itemRowStart = placed.gridY;
    var itemRowEnd = placed.gridY + c.cells.h - 1;

    var collisionTileXOffsets = getCollisionTileXOffsets(enemy.type.frameW);

    for (var ti = 0; ti < COLLISION_TILE_Y_OFFSETS.length; ti++) {
        var tileTop = enemy.y - GRID_CELL_SIZE / 2 + COLLISION_TILE_Y_OFFSETS[ti];
        var tileBot = tileTop + GRID_CELL_SIZE;
        var tileLanes = getLanesForTileY(tileTop);
        var laneOverlap = false;
        for (var li = 0; li < tileLanes.length; li++) {
            if (tileLanes[li] >= itemRowStart && tileLanes[li] <= itemRowEnd) {
                laneOverlap = true;
                break;
            }
        }

        for (var xi = 0; xi < collisionTileXOffsets.length; xi++) {
            var tileLeft = enemy.x + collisionTileXOffsets[xi];
            var tileRight = tileLeft + GRID_CELL_SIZE;

            if (rangeType === 'circle') {
                var cx = Math.max(tileLeft, Math.min(c.x, tileRight));
                var cy = Math.max(tileTop, Math.min(c.y, tileBot));
                var ddx = cx - c.x;
                var ddy = cy - c.y;
                var nearDistSq = ddx * ddx + ddy * ddy;
                if (nearDistSq > range * range) continue;
                if (minRange > 0) {
                    var fxx = (c.x < (tileLeft + tileRight) / 2) ? tileRight : tileLeft;
                    var fyy = (c.y < (tileTop + tileBot) / 2) ? tileBot : tileTop;
                    var fdx = fxx - c.x;
                    var fdy = fyy - c.y;
                    if (fdx * fdx + fdy * fdy < minRange * minRange) continue;
                }
                return true;
            } else if (rangeType === 'lineAhead' || rangeType === 'lineBoth') {
                if (!laneOverlap) continue;
                var lineEndX = rangeType === 'lineBoth' ? c.rightX + range : c.leftX;
                if (tileRight <= c.leftX - range || tileLeft >= lineEndX) continue;
                return true;
            } else if (rangeType === 'arcAhead') {
                if (tileRight <= c.leftX - range || tileLeft >= c.leftX) continue;
                var arcWide = range * 0.6;
                var arcNarrow = (c.cells.h * GRID_CELL_SIZE) / 3;
                var checkX = Math.max(tileLeft, c.leftX - range);
                var progress = (c.leftX - checkX) / range;
                var halfWidth = arcNarrow + progress * (arcWide - arcNarrow);
                if (tileBot > c.y - halfWidth && tileTop < c.y + halfWidth) return true;
            }
        }
    }
    return false;
}

function isBarricadeBlocking(placed, enemyX) {
    if (placed.item.ignoresBarricades) return false;
    var c = getPlacedCenter(placed);
    var minX = Math.min(c.leftX, enemyX);
    var maxX = Math.max(c.rightX, enemyX);
    for (var bi = 0; bi < G.placedItems.length; bi++) {
        var barricade = G.placedItems[bi];
        if (barricade === placed || barricade.item.type !== 'Barricades') continue;
        var bc = getPlacedCenter(barricade);
        if (c.y < bc.topY || c.y > bc.botY) continue;
        if ((bc.leftX > minX && bc.leftX < maxX) || (bc.rightX > minX && bc.rightX < maxX)) return true;
    }
    return false;
}

function processOffensiveFire(dt) {
    for (var pi = 0; pi < G.placedItems.length; pi++) {
        var placed = G.placedItems[pi];
        if (placed.item.type !== 'Offensive') continue;
        var fireRate = placed.item.fireRate || 3;
        var damage = placed.item.damage || 0;
        var pierces = placed.item.pierces !== false;
        var rangeType = placed.item.rangeType;
        var c = getPlacedCenter(placed);

        if (rangeType === 'lineBoth') {
            if (placed.wavePos === undefined) placed.wavePos = 0;
            placed.wavePos += dt / fireRate;
            if (placed.wavePos >= 1) placed.wavePos -= 1;
            var waveX = c.leftX - placed.item.range * (0.5 - Math.abs(placed.wavePos - 0.5));
            var waveHalfW = GRID_CELL_SIZE;
            var waveHit = false;
            for (var ei = 0; ei < G.enemies.length; ei++) {
                var enemy = G.enemies[ei];
                if (enemy.isDead) continue;
                if (Math.abs(enemy.x - waveX) <= waveHalfW && Math.abs(enemy.y - c.y) <= GRID_CELL_SIZE) {
                    waveHit = true;
                    applyDamageToEnemy(enemy, damage * dt);
                }
            }
            if (waveHit) {
                G.attackEffects.push({
                    x: waveX, y: c.y, range: 6, minRange: 0,
                    rangeType: 'wave', life: 0.15, maxLife: 0.15
                });
            }
            continue;
        }

        if (placed.fireCooldown === undefined) placed.fireCooldown = fireRate;
        placed.fireCooldown -= dt;
        if (placed.fireCooldown > 0) continue;
        placed.fireCooldown = fireRate;

        var enemiesInZone = getEnemiesInWeaponRange(placed);
        var hitAny = false;

        if (!pierces) {
            enemiesInZone.sort(function(a, b) { return a.x - b.x; });
            var blockedLanes = {};
            for (var ei3 = 0; ei3 < enemiesInZone.length; ei3++) {
                var enemy3 = enemiesInZone[ei3];
                var laneKey = Math.round(enemy3.y / GRID_CELL_SIZE);
                if (blockedLanes[laneKey]) continue;
                hitAny = true;
                applyDamageToEnemy(enemy3, damage);
                blockedLanes[laneKey] = true;
            }
        } else {
            for (var ei4 = 0; ei4 < enemiesInZone.length; ei4++) {
                hitAny = true;
                applyDamageToEnemy(enemiesInZone[ei4], damage);
            }
        }

        if (hitAny) {
            G.attackEffects.push({
                x: c.x, y: c.y,
                range: placed.item.range || 0,
                minRange: placed.item.minRange || 0,
                rangeType: rangeType,
                life: 0.4, maxLife: 0.4
            });
        }
    }
    for (var ai = G.attackEffects.length - 1; ai >= 0; ai--) {
        G.attackEffects[ai].life -= dt;
        if (G.attackEffects[ai].life <= 0) G.attackEffects.splice(ai, 1);
    }
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
    G.difficultyMultiplier = getDifficultyMultiplier(elapsed);
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
    buildLaneItems();
    G.needsRenderPlacedItems = false;
    for (var pi = 0; pi < G.placedItems.length; pi++) {
        if (G.placedItems[pi].item.type === 'Distractions') {
            G.placedItems[pi].grandmaCount = 0;
            G.placedItems[pi].triggered = false;
        }
    }
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
    for (var pi = G.placedItems.length - 1; pi >= 0; pi--) {
        var pitem = G.placedItems[pi];
        if (pitem.item.type === 'Distractions' && pitem.triggered && pitem.grandmaCount > 0) {
            var drainMult = 10 * (1 - Math.pow(0.9, pitem.grandmaCount));
            pitem.hp -= dt * drainMult;
            if (pitem.hp <= 0) {
                removePlacedItem(pitem);
            }
        }
    }
    if (G.needsRenderPlacedItems) {
        NightfallM.renderPlacedItems();
    }
}

function renderEntities() {
    var container = NightfallM.entitiesEl || document.getElementById('nightfallEntities');
    if (!container) return;
    var parts = [];
    var pIdx = 0;
    var sortedEnemies = G.enemies;
    if (sortedEnemies.length > 1) {
        sortedEnemies = sortedEnemies.slice().sort(function(a, b) { return a.y - b.y; });
    }
    for (var i = 0; i < sortedEnemies.length; i++) {
        var e = sortedEnemies[i];
        var type = e.type;
        var w = type.frameW;
        var h = type.frameH;
        var anim = type.anims && type.anims[e.anim];
        var url = (anim && anim.url) || type.sheetUrl || '';
        var x = e.frame * w;
        var y = anim.row * h;
        var left = e.x - w / 2;
        var top = e.y - h / 2;
        var opacity = e.isDead && e.fadeTimer !== undefined ? Math.max(0, e.fadeTimer) : 1;
        var opacityStyle = opacity < 1 ? 'opacity:' + opacity.toFixed(2) + ';' : '';
        if (url) {
            parts[pIdx++] = '<div style="position:absolute;left:' + left + 'px;top:' + top + 'px;width:' + w + 'px;height:' + h + 'px;pointer-events:none;background-image:url(' + url + ');background-position:-' + x + 'px -' + y + 'px;background-repeat:no-repeat;image-rendering:pixelated;' + opacityStyle + '">';
        } else {
            parts[pIdx++] = '<div style="position:absolute;left:' + left + 'px;top:' + top + 'px;width:' + w + 'px;height:' + h + 'px;pointer-events:none;background-color:#f0f;' + opacityStyle + '">';
        }
        if (e.hp < e.maxHp && !e.isDead) {
            var hpPct = Math.max(0, e.hp / e.maxHp);
            var barWidth = w * 0.4;
            var barHeight = 4;
            var barLeft = w / 2 - barWidth / 2;
            var barTop = -barHeight + 6;
            var hpColor = hpPct > 0.5 ? '#0f0' : (hpPct > 0.25 ? '#ff0' : '#f00');
            parts[pIdx++] = '<div style="position:absolute;left:' + barLeft + 'px;top:' + barTop + 'px;width:' + barWidth + 'px;height:' + barHeight + 'px;background-color:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.3);pointer-events:none;"><div style="position:absolute;left:0;top:0;height:100%;width:' + (hpPct * 100) + '%;background-color:' + hpColor + ';"></div></div>';
        }
        parts[pIdx++] = '</div>';
        if (G.debugMode) {
            var debugTop = e.y - GRID_CELL_SIZE / 2;
            for (var j = 0; j < COLLISION_TILE_Y_OFFSETS.length; j++) {
                var tileY = debugTop + COLLISION_TILE_Y_OFFSETS[j];
                parts[pIdx++] = '<div style="position:absolute;left:' + (e.x - w / 2 + GRID_CELL_SIZE * 2) + 'px;top:' + tileY + 'px;width:' + GRID_CELL_SIZE + 'px;height:' + GRID_CELL_SIZE + 'px;background-color:rgba(0,255,0,0.3);border:1px solid #0f0;pointer-events:none;"></div>';
            }
            var avoidTop = e.y - GRID_CELL_SIZE / 2 + COLLISION_TILE_Y_OFFSETS[0];
            var avoidHeight = GRID_CELL_SIZE * COLLISION_TILE_Y_OFFSETS.length;
            parts[pIdx++] = '<div style="position:absolute;left:' + e.x + 'px;top:' + avoidTop + 'px;width:' + AVOIDANCE_LOOKAHEAD + 'px;height:' + avoidHeight + 'px;background-color:rgba(0,100,255,0.2);border:1px dashed #00f;pointer-events:none;"></div>';
        }
    }
    if (G.debugMode) {
        var pulseTime = Date.now() / 1000;
        for (var di = 0; di < G.placedItems.length; di++) {
            var placed = G.placedItems[di];
            var c = getPlacedCenter(placed);
            var bgColor = 'rgba(255,0,0,0.3)';
            var borderClr = '#f00';
            if (placed.item.type === 'Distractions' && placed.triggered && placed.grandmaCount > 0) {
                var pulseSpeed = 2 + placed.grandmaCount * 2;
                var pulse = 0.5 + 0.5 * Math.sin(pulseTime * pulseSpeed);
                var alpha = (0.3 + pulse * 0.5).toFixed(2);
                bgColor = 'rgba(0,255,0,' + alpha + ')';
                borderClr = '#0f0';
            }
            parts[pIdx++] = '<div style="position:absolute;left:' + c.leftX + 'px;top:' + c.topY + 'px;width:' + (c.cells.w * GRID_CELL_SIZE) + 'px;height:' + (c.cells.h * GRID_CELL_SIZE) + 'px;background-color:' + bgColor + ';border:1px solid ' + borderClr + ';pointer-events:none;"></div>';
            if (placed.item.type === 'Traps') {
                var trapRange = placed.item.range;
                if (trapRange > 1) {
                    parts[pIdx++] = '<div style="position:absolute;left:' + (c.x - trapRange) + 'px;top:' + (c.y - trapRange) + 'px;width:' + (trapRange * 2) + 'px;height:' + (trapRange * 2) + 'px;border-radius:50%;background-color:rgba(255,255,0,0.2);border:1px solid #ff0;pointer-events:none;"></div>';
                }
            }
        }
        for (var ti = 0; ti < G.triggerTiles.length; ti++) {
            var trigger = G.triggerTiles[ti];
            parts[pIdx++] = '<div style="position:absolute;left:' + (trigger.gridX * GRID_CELL_SIZE) + 'px;top:' + (trigger.gridY * GRID_CELL_SIZE + GRID_OFFSET_Y) + 'px;width:' + GRID_CELL_SIZE + 'px;height:' + GRID_CELL_SIZE + 'px;background-color:rgba(255,255,0,0.5);border:2px solid #ff0;pointer-events:none;"></div>';
        }
    }
    for (var ai = 0; ai < G.attackEffects.length; ai++) {
        var fx = G.attackEffects[ai];
        var alpha = fx.life / fx.maxLife;
        var opacity = (alpha * 0.5).toFixed(2);
        var fillClr = 'rgba(255,100,0,' + (opacity * 0.3).toFixed(2) + ')';
        var strokeClr = 'rgba(255,100,0,' + opacity + ')';
        var range = fx.range;
        var rangeType = fx.rangeType;
        if (rangeType === 'circle') {
            if (fx.minRange > 0) {
                parts[pIdx++] = '<div style="position:absolute;left:' + (fx.x - fx.minRange) + 'px;top:' + (fx.y - fx.minRange) + 'px;width:' + (fx.minRange * 2) + 'px;height:' + (fx.minRange * 2) + 'px;border:2px dashed rgba(255,200,0,' + opacity + ');border-radius:50%;pointer-events:none;box-sizing:border-box;"></div>';
            }
            parts[pIdx++] = '<div style="position:absolute;left:' + (fx.x - range) + 'px;top:' + (fx.y - range) + 'px;width:' + (range * 2) + 'px;height:' + (range * 2) + 'px;border:2px solid ' + strokeClr + ';border-radius:50%;background:' + fillClr + ';pointer-events:none;box-sizing:border-box;"></div>';
        } else if (rangeType === 'lineAhead' || rangeType === 'lineBoth') {
            var lineW = rangeType === 'lineBoth' ? range * 2 : range;
            parts[pIdx++] = '<div style="position:absolute;left:' + (fx.x - range) + 'px;top:' + (fx.y - GRID_CELL_SIZE) + 'px;width:' + lineW + 'px;height:' + (GRID_CELL_SIZE * 2) + 'px;border:2px solid ' + strokeClr + ';background:' + fillClr + ';pointer-events:none;box-sizing:border-box;"></div>';
        } else if (rangeType === 'arcAhead') {
            var arcW = range * 0.6;
            var arcN = (2 * GRID_CELL_SIZE) / 3;
            var arcMid = arcW;
            parts[pIdx++] = '<svg viewBox="0 0 ' + range + ' ' + (arcW * 2) + '" style="position:absolute;left:' + (fx.x - range) + 'px;top:' + (fx.y - arcW) + 'px;width:' + range + 'px;height:' + (arcW * 2) + 'px;pointer-events:none;overflow:visible;"><polygon points="' + range + ',' + (arcMid - arcN) + ' 0,0 0,' + (arcW * 2) + ' ' + range + ',' + (arcMid + arcN) + '" fill="' + fillClr + '" stroke="' + strokeClr + '" stroke-width="2"/></svg>';
        } else if (rangeType === 'wave') {
            parts[pIdx++] = '<div style="position:absolute;left:' + (fx.x - 3) + 'px;top:' + (fx.y - GRID_CELL_SIZE) + 'px;width:6px;height:' + (GRID_CELL_SIZE * 2) + 'px;border:2px solid ' + strokeClr + ';background:' + fillClr + ';pointer-events:none;box-sizing:border-box;border-radius:3px;"></div>';
        }
    }
    container.innerHTML = parts.join('');
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
    G.savedPlacedItems = [];
    for (var pi = 0; pi < G.placedItems.length; pi++) {
        var placed = G.placedItems[pi];
        G.savedPlacedItems.push({
            id: placed.id,
            item: placed.item,
            gridX: placed.gridX,
            gridY: placed.gridY,
            hp: placed.item.health
        });
        placed.hp = placed.item.health;
        placed.fireCooldown = undefined;
        placed.wavePos = undefined;
        placed.triggered = false;
        placed.grandmaCount = 0;
    }
    NightfallM.startTime = Date.now();
    initTriggerTiles();
    var type = pickGrandmaTypeToSpawn(0);
    spawnEnemy(type, pickWeightedLane(), 0);
}

function stopNightfallGame() {
    G.gameStarted = false;
    G.gameOver = false;
    G.enemies = [];
    G.attackEffects = [];
    G.lastSpawnTime = 0;
    NightfallM.startTime = 0;
    if (G.savedPlacedItems && G.savedPlacedItems.length) {
        G.placedItems = G.savedPlacedItems.map(function(saved) {
            return {
                id: saved.id,
                item: saved.item,
                gridX: saved.gridX,
                gridY: saved.gridY,
                hp: saved.hp
            };
        });
        G.savedPlacedItems = null;
        buildLaneItems();
        G.needsRenderPlacedItems = true;
    }
    var container = NightfallM.entitiesEl || document.getElementById('nightfallEntities');
    if (container) container.innerHTML = '';
    NightfallM.renderTools();
}

function formatNightfallTime(totalSeconds) {
    var s = Math.max(0, Math.floor(totalSeconds));
    var hours = Math.floor(s / 3600);
    var minutes = Math.floor((s % 3600) / 60);
    var seconds = s % 60;
    var ss = seconds < 10 ? '0' + seconds : String(seconds);
    if (hours > 0) {
        var mm = minutes < 10 ? '0' + minutes : String(minutes);
        return hours + ':' + mm + ':' + ss;
    }
    return minutes + ':' + ss;
}

NightfallM.draw = function() {
    if (!NightfallM.timeL) return;
    var wrath = (Game && typeof Game.elderWrath === 'number') ? Game.elderWrath : 0;
    var targetBgUrl = (wrath > 0) ? NightfallM.bgUrlGpoc : NightfallM.bgUrlNormal;
    if (targetBgUrl && targetBgUrl !== NightfallM.currentBgUrl) {
        var imgs = NightfallM.tileImgs || [];
        for (var i = 0; i < imgs.length; i++) {
            imgs[i].src = targetBgUrl;
        }
        NightfallM.currentBgUrl = targetBgUrl;
    }

    if (G.selectedTool && G.isDragging && NightfallM.dragEl && G.dragGhost && NightfallM.gridEl) {
        var cursorX = (typeof NightfallM.cursorX === 'number') ? NightfallM.cursorX : Game.mouseX;
        var cursorY = (typeof NightfallM.cursorY === 'number') ? NightfallM.cursorY : Game.mouseY;
        if (cursorX !== G.lastDragCursorX || cursorY !== G.lastDragCursorY) {
            G.lastDragCursorX = cursorX;
            G.lastDragCursorY = cursorY;
            var gridBox = NightfallM.gridEl.getBoundingClientRect();
            var mx = cursorX - gridBox.left;
            var my = cursorY - gridBox.top;
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

    if (typeof NightfallM.renderGrid === 'function' && (
        G.selectedTool !== NightfallM.lastGridSelected ||
        G.isDragging !== NightfallM.lastGridDragging ||
        G.dragGhostX !== NightfallM.lastGridX ||
        G.dragGhostY !== NightfallM.lastGridY
    )) {
        NightfallM.lastGridSelected = G.selectedTool;
        NightfallM.lastGridDragging = G.isDragging;
        NightfallM.lastGridX = G.dragGhostX;
        NightfallM.lastGridY = G.dragGhostY;
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
        } else {
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
        }
    }
};

NightfallM._buildSaveDataImpl = function() {
    var enemies = [];
    for (var i = 0; i < G.enemies.length; i++) {
        var e = G.enemies[i];
        enemies.push({
            name: e.type.name,
            x: e.x,
            y: e.y,
            lane: e.lane,
            hp: e.hp,
            maxHp: e.maxHp,
            anim: e.anim,
            frame: e.frame
        });
    }
    return {
        lastTick: G.lastTick,
        score: G.score,
        time: G.time,
        unlockedItems: G.unlockedItems,
        gameStarted: G.gameStarted,
        gameOver: G.gameOver,
        enemyIdCounter: G.enemyIdCounter,
        enemies: enemies,
        lastSpawnTime: G.lastSpawnTime,
        isVisible: (NightfallM.parent && NightfallM.parent.onMinigame) ? 1 : 0
    };
};

NightfallM._saveImpl = function() {
    var payload = NightfallM._buildSaveDataImpl();
    var saveString = '';
    try {
        saveString = JSON.stringify(payload);
        saveString = encodeURIComponent(saveString);
    } catch (e) {
        saveString = '';
    }
    if (window.NightfallMinigame && window.NightfallMinigame.writeCache) {
        window.NightfallMinigame.writeCache(decodeURIComponent(saveString));
    }
    return saveString;
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
            var ed = data.enemies[ei];
            var type = ed && ed.name ? NightfallM.getGrandmaType(ed.name) : null;
            if (!type) continue;
            G.enemies.push({
                id: ++G.enemyIdCounter,
                type: type,
                x: ed.x,
                y: ed.y,
                lane: ed.lane,
                hp: ed.hp,
                maxHp: ed.maxHp,
                anim: ed.anim,
                frame: ed.frame,
                frameTimer: 0,
                attackCooldown: 0,
                isDead: false
            });
        }
    }

    if (NightfallM.parent && data.isVisible) {
        activateMinigame(getGrandma(), 50);
    }
};

NightfallM._resetImpl = function(hard) {
    G.lastTick = 0;
    G.score = 0;
    G.time = 0;
    G.unlockedItems = {};
    G.enemies = [];
    G.enemyIdCounter = 0;
    G.simAccumulator = 0;
    G.lastFrameTime = 0;
    G.lastSpawnTime = 0;
    G.difficultyMultiplier = 1;
    G.gameOver = false;
    G.gameStarted = false;
    G.savedPlacedItems = null;
    NightfallM.startTime = 0;
    NightfallM.elderWrathActive = false;
    NightfallM.lastWrath = undefined;
};

NightfallM.buildSaveString = function() {
    try { return JSON.stringify(NightfallM._buildSaveDataImpl()); } catch (e) { return ''; }
};
NightfallM.save = function() { return NightfallM._saveImpl(); };
NightfallM.load = function(str) { NightfallM._loadImpl(str); };
NightfallM.reset = function(hard) { NightfallM._resetImpl(hard); };

function initializeNightfallMinigame() {
    var grandma = getGrandma();
    if (!grandma) return;
    var flagDefined = !!(Game.JNE && Game.JNE.enableNightfallMinigame !== undefined);
    var isConsoleLoading = !flagDefined || (Game.JNE && Game.JNE.enableNightfallMinigame === false);
    var isEnabled = flagDefined ? !!Game.JNE.enableNightfallMinigame : true;

    function ensureMinigameDiv() {
        if (grandma.minigameDiv) return;
        var existingDiv = l('rowSpecial' + grandma.id);
        if (existingDiv) {
            grandma.minigameDiv = existingDiv;
        } else {
            grandma.minigameDiv = document.createElement('div');
            grandma.minigameDiv.id = 'rowSpecial' + grandma.id;
            grandma.minigameDiv.className = 'rowSpecial';
            if (grandma.l) grandma.l.appendChild(grandma.minigameDiv);
        }
    }

    function bootMinigame() {
        if (!grandma) return;
        if (!grandma.minigameLoaded) {
            grandma.minigameLoaded = true;
            grandma.minigameName = grandma.minigameName || 'Nightfall';
            grandma.minigameLoading = false;
        }
        ensureMinigameDiv();
        NightfallM.launch();
        NightfallM.init(grandma.minigameDiv);
        if (!grandma.minigame) grandma.minigame = NightfallM;
        if (Game.JNE && Game.JNE.nightfallSavedData) {
            NightfallM.load(Game.JNE.nightfallSavedData);
        }
        if (isConsoleLoading && !grandma.minigameUrl) grandma.minigameUrl = 'nightfall';
        if (typeof grandma.refresh === 'function') grandma.refresh();
        if (isConsoleLoading && Game.ObjectsById && Game.ObjectsById[grandma.id] && typeof Game.ObjectsById[grandma.id].draw === 'function') {
            Game.ObjectsById[grandma.id].draw();
        }
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

if (typeof window !== 'undefined') {
    window.initializeNightfallMinigame = initializeNightfallMinigame;

    var existingAPI = window.NightfallMinigame || {};
    var publicAPI = {
        save: function() { return NightfallM._saveImpl(); },
        load: function(str) { NightfallM._loadImpl(str); },
        reset: function(hard) { NightfallM._resetImpl(hard); },
        unlockAll: function() { NightfallM.unlockAll(); },
        buildSaveString: function() { return NightfallM.buildSaveString(); },
        buildSaveData: function() { return NightfallM._buildSaveDataImpl(); },
        setDebugMode: function(enabled) { G.debugMode = enabled; },
        setGameSpeed: function(speed) { G.gameSpeed = speed; },
        getSaveData: existingAPI.getSaveData || undefined,
        applySaveData: existingAPI.applySaveData || undefined,
        writeCache: existingAPI.writeCache || undefined,
        requestSave: existingAPI.requestSave || undefined
    };

    for (var key in publicAPI) {
        if (publicAPI[key] === undefined) delete publicAPI[key];
    }

    Object.defineProperty(window, 'NightfallMinigame', {
        value: Object.freeze(Object.assign({ VERSION: NIGHTFALL_VERSION }, publicAPI)),
        writable: false,
        enumerable: false,
        configurable: true
    });

}

})();
