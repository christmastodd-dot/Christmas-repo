// ============================================================
// SUE-PER FRIEND! - An 80s Retro Laser-Shooting Hero Game
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ---- GAME STATE ----
let gameRunning = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('sueperFriendHigh') || '0');
let lives = 3;
let level = 1;
let enemiesDefeated = 0;
let enemiesToNextLevel = 10;
let frameCount = 0;
let shakeTimer = 0;
let flashTimer = 0;
let musicStarted = false;

// ---- AUDIO ENGINE (Web Audio API chiptune) ----
let audioCtx = null;
let masterGain = null;
let musicPlaying = false;
let musicInterval = null;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
}

function playTone(freq, duration, type = 'square', volume = 0.15, delay = 0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
}

function playLaserSound() {
    playTone(880, 0.08, 'sawtooth', 0.12);
    playTone(440, 0.12, 'square', 0.08, 0.04);
}

function playExplosionSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 0.25;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    noise.connect(gain);
    gain.connect(masterGain);
    noise.start();
}

function playHitSound() {
    playTone(200, 0.15, 'sawtooth', 0.2);
    playTone(100, 0.3, 'square', 0.15, 0.05);
}

function playPowerUpSound() {
    playTone(523, 0.1, 'square', 0.12);
    playTone(659, 0.1, 'square', 0.12, 0.1);
    playTone(784, 0.1, 'square', 0.12, 0.2);
    playTone(1047, 0.15, 'square', 0.15, 0.3);
}

function playLevelUpSound() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((n, i) => playTone(n, 0.12, 'square', 0.15, i * 0.1));
}

// 80s chiptune background music - looping melody
const melodyNotes = [
    // Bar 1 - energetic intro
    { f: 330, d: 0.15 }, { f: 392, d: 0.15 }, { f: 440, d: 0.15 }, { f: 523, d: 0.3 },
    { f: 440, d: 0.15 }, { f: 523, d: 0.15 }, { f: 587, d: 0.3 },
    // Bar 2 - rising action
    { f: 392, d: 0.15 }, { f: 440, d: 0.15 }, { f: 523, d: 0.15 }, { f: 587, d: 0.3 },
    { f: 523, d: 0.15 }, { f: 587, d: 0.15 }, { f: 659, d: 0.3 },
    // Bar 3 - heroic peak
    { f: 659, d: 0.15 }, { f: 784, d: 0.3 }, { f: 659, d: 0.15 }, { f: 587, d: 0.15 },
    { f: 523, d: 0.3 }, { f: 587, d: 0.15 }, { f: 659, d: 0.3 },
    // Bar 4 - resolve
    { f: 523, d: 0.15 }, { f: 440, d: 0.15 }, { f: 392, d: 0.3 }, { f: 440, d: 0.15 },
    { f: 523, d: 0.3 }, { f: 440, d: 0.3 }, { f: 330, d: 0.3 },
];

const bassNotes = [
    { f: 165, d: 0.3 }, { f: 165, d: 0.3 }, { f: 196, d: 0.3 }, { f: 196, d: 0.3 },
    { f: 220, d: 0.3 }, { f: 220, d: 0.3 }, { f: 196, d: 0.3 }, { f: 196, d: 0.3 },
    { f: 165, d: 0.3 }, { f: 165, d: 0.3 }, { f: 220, d: 0.3 }, { f: 220, d: 0.3 },
    { f: 196, d: 0.3 }, { f: 196, d: 0.3 }, { f: 165, d: 0.3 }, { f: 165, d: 0.3 },
];

let melodyIndex = 0;
let bassIndex = 0;
let nextMelodyTime = 0;
let nextBassTime = 0;

function startMusic() {
    if (musicPlaying) return;
    musicPlaying = true;
    melodyIndex = 0;
    bassIndex = 0;
    nextMelodyTime = 0;
    nextBassTime = 0;

    musicInterval = setInterval(() => {
        if (!musicPlaying || !audioCtx) return;

        const now = audioCtx.currentTime;

        if (now >= nextMelodyTime) {
            const note = melodyNotes[melodyIndex % melodyNotes.length];
            playTone(note.f, note.d * 0.9, 'square', 0.08);
            nextMelodyTime = now + note.d;
            melodyIndex++;
        }

        if (now >= nextBassTime) {
            const note = bassNotes[bassIndex % bassNotes.length];
            playTone(note.f, note.d * 0.9, 'triangle', 0.1);
            nextBassTime = now + note.d;
            bassIndex++;
        }
    }, 50);
}

function stopMusic() {
    musicPlaying = false;
    if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
    }
}

// ---- PIXEL ART SPRITE DRAWING ----

// Draw a pixel grid from a 2D array of colors
function drawSprite(x, y, sprite, scale = 2) {
    for (let row = 0; row < sprite.length; row++) {
        for (let col = 0; col < sprite[row].length; col++) {
            const color = sprite[row][col];
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(
                    Math.floor(x + col * scale),
                    Math.floor(y + row * scale),
                    scale,
                    scale
                );
            }
        }
    }
}

// Color palette
const C = {
    skin: '#ffcc99',
    hair: '#8B0000',
    cape: '#ff0066',
    capeDark: '#cc0052',
    suit: '#4400cc',
    suitLight: '#6633ff',
    boot: '#ff0066',
    eye: '#00ffff',
    eyeGlow: '#ffffff',
    gold: '#ffd700',
    black: '#000000',
    white: '#ffffff',
};

// Sue sprite (facing right) - 16x20 pixel art
const sueSprite = [
    // Hair top
    [0,0,0,0,0,C.hair,C.hair,C.hair,C.hair,C.hair,C.hair,0,0,0,0,0],
    [0,0,0,0,C.hair,C.hair,C.hair,C.hair,C.hair,C.hair,C.hair,C.hair,0,0,0,0],
    [0,0,0,C.hair,C.hair,C.hair,C.hair,C.hair,C.hair,C.hair,C.hair,C.hair,C.hair,0,0,0],
    // Face
    [0,0,0,C.hair,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.hair,0,0,0],
    [0,0,0,C.skin,C.skin,C.eye,C.skin,C.skin,C.skin,C.eye,C.skin,C.skin,C.skin,0,0,0],
    [0,0,0,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,0,0,0],
    [0,0,0,0,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,0,0,0,0],
    // Neck + Cape top
    [0,0,0,0,0,0,C.skin,C.skin,C.skin,C.skin,0,0,0,0,0,0],
    // Torso + Cape
    [C.cape,C.cape,0,0,C.suit,C.suit,C.suit,C.gold,C.suit,C.suit,C.suit,C.suit,0,0,C.cape,C.cape],
    [C.cape,C.capeDark,C.cape,C.suit,C.suit,C.suitLight,C.suit,C.gold,C.suit,C.suitLight,C.suit,C.suit,C.suit,C.cape,C.capeDark,C.cape],
    [0,C.cape,C.capeDark,C.suit,C.suit,C.suit,C.suit,C.gold,C.suit,C.suit,C.suit,C.suit,C.suit,C.capeDark,C.cape,0],
    [0,0,C.cape,C.suit,C.suit,C.suit,C.suit,C.suit,C.suit,C.suit,C.suit,C.suit,C.suit,C.cape,0,0],
    // Arms
    [0,0,0,C.skin,C.suit,C.suit,C.suit,C.suit,C.suit,C.suit,C.suit,C.suit,C.skin,0,0,0],
    [0,0,0,C.skin,C.skin,C.suit,C.suit,C.suit,C.suit,C.suit,C.suit,C.skin,C.skin,0,0,0],
    // Waist
    [0,0,0,0,0,C.gold,C.gold,C.gold,C.gold,C.gold,C.gold,0,0,0,0,0],
    // Legs
    [0,0,0,0,C.suit,C.suit,C.suit,0,0,C.suit,C.suit,C.suit,0,0,0,0],
    [0,0,0,0,C.suit,C.suit,C.suit,0,0,C.suit,C.suit,C.suit,0,0,0,0],
    [0,0,0,0,C.suit,C.suit,C.suit,0,0,C.suit,C.suit,C.suit,0,0,0,0],
    // Boots
    [0,0,0,0,C.boot,C.boot,C.boot,0,0,C.boot,C.boot,C.boot,0,0,0,0],
    [0,0,0,C.boot,C.boot,C.boot,C.boot,0,0,C.boot,C.boot,C.boot,C.boot,0,0,0],
];

// Enemy type 1: Skull Bot
const skullSprite = [
    [0,0,'#666','#888','#888','#888','#888','#666',0,0],
    [0,'#888','#fff','#fff','#fff','#fff','#fff','#fff','#888',0],
    ['#888','#fff','#f00','#f00','#fff','#fff','#f00','#f00','#fff','#888'],
    ['#888','#fff','#f00','#f00','#fff','#fff','#f00','#f00','#fff','#888'],
    ['#888','#fff','#fff','#fff','#fff','#fff','#fff','#fff','#fff','#888'],
    ['#888','#fff','#fff','#333','#fff','#fff','#333','#fff','#fff','#888'],
    [0,'#888','#fff','#333','#333','#333','#333','#fff','#888',0],
    [0,0,'#888','#fff','#fff','#fff','#fff','#888',0,0],
    [0,0,0,'#666','#888','#888','#666',0,0,0],
    [0,0,'#f00',0,'#f00','#f00',0,'#f00',0,0],
];

// Enemy type 2: Flying Drone
const droneSprite = [
    [0,0,0,'#0f0','#0f0','#0f0','#0f0',0,0,0],
    [0,'#555','#555','#888','#aaa','#aaa','#888','#555','#555',0],
    ['#555','#888','#aaa','#aaa','#f00','#f00','#aaa','#aaa','#888','#555'],
    [0,'#555','#888','#aaa','#aaa','#aaa','#aaa','#888','#555',0],
    [0,0,'#555','#555','#888','#888','#555','#555',0,0],
    [0,0,0,0,'#f00',0,'#f00',0,0,0],
];

// Enemy type 3: Big Boss (appears every few levels)
const bossSprite = [
    [0,0,0,'#f00','#f00','#f00','#f00','#f00','#f00',0,0,0],
    [0,0,'#f00','#800','#800','#f00','#f00','#800','#800','#f00',0,0],
    [0,'#f00','#800','#ff0','#ff0','#800','#800','#ff0','#ff0','#800','#f00',0],
    [0,'#f00','#800','#ff0','#000','#800','#800','#ff0','#000','#800','#f00',0],
    ['#f00','#800','#800','#800','#800','#800','#800','#800','#800','#800','#800','#f00'],
    ['#f00','#800','#800','#800','#fff','#fff','#fff','#fff','#800','#800','#800','#f00'],
    ['#f00','#800','#800','#fff','#800','#fff','#800','#fff','#800','#800','#800','#f00'],
    [0,'#f00','#800','#800','#800','#800','#800','#800','#800','#800','#f00',0],
    [0,0,'#f00','#800','#800','#800','#800','#800','#800','#f00',0,0],
    [0,'#f00',0,'#f00','#f00',0,0,'#f00','#f00',0,'#f00',0],
    ['#f00',0,0,0,'#f00',0,0,'#f00',0,0,0,'#f00'],
];

// Power-up: Heart
const heartSprite = [
    [0,'#f00','#f00',0,0,'#f00','#f00',0],
    ['#f00','#f66','#f00','#f00','#f00','#f66','#f00','#f00'],
    ['#f00','#f66','#f00','#f00','#f00','#f00','#f00','#f00'],
    ['#f00','#f00','#f00','#f00','#f00','#f00','#f00','#f00'],
    [0,'#f00','#f00','#f00','#f00','#f00','#f00',0],
    [0,0,'#f00','#f00','#f00','#f00',0,0],
    [0,0,0,'#f00','#f00',0,0,0],
];

// Power-up: Star (speed boost)
const starSprite = [
    [0,0,0,'#ff0',0,0,0],
    [0,0,'#ff0','#ff0','#ff0',0,0],
    ['#ff0','#ff0','#ff0','#ff0','#ff0','#ff0','#ff0'],
    [0,'#ff0','#ff0','#ff0','#ff0','#ff0',0],
    [0,'#ff0','#ff0',0,'#ff0','#ff0',0],
    ['#ff0','#ff0',0,0,0,'#ff0','#ff0'],
];

// ---- PLAYER ----
const player = {
    x: 100,
    y: H / 2,
    w: 32,
    h: 40,
    speed: 3.5,
    shootCooldown: 0,
    shootRate: 12,
    invincible: 0,
    powerUpTimer: 0,
    animFrame: 0,
};

// ---- GAME OBJECTS ----
let lasers = [];
let enemies = [];
let particles = [];
let powerUps = [];
let stars = []; // background stars

// Initialize background stars
function initStars() {
    stars = [];
    for (let i = 0; i < 80; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            speed: 0.3 + Math.random() * 1.5,
            size: Math.random() < 0.3 ? 2 : 1,
            brightness: Math.random(),
        });
    }
}

// ---- INPUT ----
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// ---- SPAWNING ----
function spawnEnemy() {
    const type = Math.random();
    let enemy;

    if (type < 0.5) {
        // Skull Bot - walks from right
        enemy = {
            type: 'skull',
            x: W + 20,
            y: 100 + Math.random() * (H - 200),
            w: 20,
            h: 20,
            speed: 1 + level * 0.2 + Math.random() * 0.5,
            hp: 1,
            points: 100,
            sinOffset: Math.random() * Math.PI * 2,
            sinAmp: 30 + Math.random() * 40,
        };
    } else if (type < 0.85) {
        // Flying Drone - zigzag
        enemy = {
            type: 'drone',
            x: W + 20,
            y: 50 + Math.random() * (H - 150),
            w: 20,
            h: 12,
            speed: 1.5 + level * 0.25 + Math.random() * 0.5,
            hp: 1,
            points: 150,
            sinOffset: Math.random() * Math.PI * 2,
            sinAmp: 50 + Math.random() * 30,
        };
    } else {
        // Tough skull
        enemy = {
            type: 'skull',
            x: W + 20,
            y: 100 + Math.random() * (H - 200),
            w: 20,
            h: 20,
            speed: 0.8 + level * 0.15,
            hp: 2 + Math.floor(level / 3),
            points: 250,
            sinOffset: Math.random() * Math.PI * 2,
            sinAmp: 20 + Math.random() * 20,
            tough: true,
        };
    }

    enemies.push(enemy);
}

function spawnBoss() {
    enemies.push({
        type: 'boss',
        x: W + 20,
        y: H / 2 - 30,
        w: 24,
        h: 22,
        speed: 0.5,
        hp: 10 + level * 5,
        maxHp: 10 + level * 5,
        points: 1000 + level * 500,
        sinOffset: 0,
        sinAmp: 80,
        shootTimer: 0,
    });
}

function spawnPowerUp(x, y) {
    if (Math.random() < 0.15) {
        const type = Math.random() < 0.5 ? 'heart' : 'star';
        powerUps.push({
            type,
            x,
            y,
            w: 16,
            h: 14,
            speed: 1,
            life: 300,
        });
    }
}

function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        const speed = 1 + Math.random() * 3;
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20 + Math.random() * 20,
            maxLife: 40,
            color,
            size: 2 + Math.random() * 3,
        });
    }
}

// ---- DRAWING HELPERS ----
function drawCity() {
    // Distant buildings
    ctx.fillStyle = '#1a0a2e';
    const buildings = [
        { x: 0, w: 60, h: 120 }, { x: 70, w: 40, h: 90 }, { x: 120, w: 55, h: 150 },
        { x: 185, w: 35, h: 80 }, { x: 230, w: 70, h: 130 }, { x: 310, w: 45, h: 100 },
        { x: 365, w: 60, h: 160 }, { x: 435, w: 40, h: 85 }, { x: 485, w: 55, h: 110 },
        { x: 550, w: 50, h: 140 }, { x: 610, w: 40, h: 95 },
    ];

    buildings.forEach(b => {
        ctx.fillStyle = '#1a0a2e';
        ctx.fillRect(b.x, H - b.h, b.w, b.h);

        // Windows
        ctx.fillStyle = (frameCount + b.x) % 60 < 30 ? '#ffff44' : '#aa8800';
        for (let wy = H - b.h + 8; wy < H - 10; wy += 14) {
            for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 10) {
                if (Math.random() > 0.3 || frameCount % 120 < 60) {
                    ctx.fillRect(wx, wy, 4, 6);
                }
            }
        }
    });

    // Ground
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, H - 30, W, 30);
    ctx.fillStyle = '#333';
    ctx.fillRect(0, H - 30, W, 2);
}

function drawHUD() {
    // Score
    ctx.fillStyle = '#ffff00';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 15, 25);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(score.toString().padStart(8, '0'), 15, 45);

    // Level
    ctx.fillStyle = '#00ffff';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL ' + level, W / 2, 25);

    // Lives
    ctx.fillStyle = '#ff0066';
    ctx.textAlign = 'right';
    ctx.fillText('LIVES', W - 15, 25);
    for (let i = 0; i < lives; i++) {
        drawSprite(W - 55 + i * 18, 32, heartSprite, 2);
    }

    // High score
    ctx.fillStyle = '#888';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HI ' + highScore.toString().padStart(8, '0'), W / 2, 45);

    // Power-up indicator
    if (player.powerUpTimer > 0) {
        ctx.fillStyle = '#00ff00';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('POWER UP!', W / 2, 65);
        // Timer bar
        ctx.fillStyle = '#333';
        ctx.fillRect(W / 2 - 50, 70, 100, 6);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(W / 2 - 50, 70, (player.powerUpTimer / 300) * 100, 6);
    }
}

function drawBackground() {
    // Night sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a001a');
    grad.addColorStop(0.5, '#1a0033');
    grad.addColorStop(1, '#0d0020');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    stars.forEach(star => {
        const twinkle = Math.sin(frameCount * 0.05 + star.brightness * 10) * 0.5 + 0.5;
        const alpha = 0.3 + twinkle * 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    });

    drawCity();
}

// ---- MAIN UPDATE ----
function update() {
    if (!gameRunning) return;
    frameCount++;

    // Move stars (parallax)
    stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < -2) star.x = W + 2;
    });

    // Player movement
    let dx = 0, dy = 0;
    if (keys['arrowleft'] || keys['a']) dx = -1;
    if (keys['arrowright'] || keys['d']) dx = 1;
    if (keys['arrowup'] || keys['w']) dy = -1;
    if (keys['arrowdown'] || keys['s']) dy = 1;

    // Normalize diagonal
    if (dx && dy) {
        dx *= 0.707;
        dy *= 0.707;
    }

    const spd = player.powerUpTimer > 0 ? player.speed * 1.5 : player.speed;
    player.x += dx * spd;
    player.y += dy * spd;

    // Clamp to bounds
    player.x = Math.max(5, Math.min(W - player.w - 5, player.x));
    player.y = Math.max(55, Math.min(H - player.h - 35, player.y));

    // Shooting
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (keys[' '] && player.shootCooldown <= 0) {
        const rate = player.powerUpTimer > 0 ? Math.floor(player.shootRate / 2) : player.shootRate;
        player.shootCooldown = rate;
        // Laser from eyes
        lasers.push({
            x: player.x + 22,
            y: player.y + 8,
            w: 16,
            h: 3,
            speed: 8,
            color: '#00ffff',
        });
        lasers.push({
            x: player.x + 22,
            y: player.y + 12,
            w: 16,
            h: 3,
            speed: 8,
            color: '#00ffff',
        });
        playLaserSound();
    }

    // Update lasers
    lasers.forEach(l => l.x += l.speed);
    lasers = lasers.filter(l => l.x < W + 20 && l.x > -20);

    // Spawn enemies
    let spawnRate = Math.max(30, 90 - level * 5);
    if (frameCount % spawnRate === 0) {
        spawnEnemy();
    }

    // Boss every 3 levels
    if (enemiesDefeated >= enemiesToNextLevel) {
        level++;
        enemiesDefeated = 0;
        enemiesToNextLevel = 10 + level * 3;
        playLevelUpSound();
        flashTimer = 20;

        if (level % 3 === 0) {
            spawnBoss();
        }
    }

    // Update enemies
    enemies.forEach(e => {
        e.x -= e.speed;
        const t = frameCount * 0.03 + e.sinOffset;
        if (e.type !== 'boss') {
            e.y += Math.sin(t) * (e.sinAmp * 0.02);
        } else {
            e.y = H / 2 - 30 + Math.sin(t) * e.sinAmp;
            // Boss stops at x=450
            if (e.x < 450) e.x = 450;
            // Boss shoots
            e.shootTimer = (e.shootTimer || 0) + 1;
            if (e.shootTimer > 60) {
                e.shootTimer = 0;
                lasers.push({
                    x: e.x - 10,
                    y: e.y + 10,
                    w: 12,
                    h: 4,
                    speed: -5,
                    color: '#ff0000',
                    enemy: true,
                });
            }
        }
    });

    // Laser-enemy collisions
    lasers.forEach(l => {
        if (l.enemy) return;
        enemies.forEach(e => {
            if (e.dead) return;
            const scale = e.type === 'boss' ? 3 : 2;
            const ew = e.w * scale;
            const eh = e.h * scale;
            if (l.x < e.x + ew && l.x + l.w > e.x && l.y < e.y + eh && l.y + l.h > e.y) {
                l.dead = true;
                e.hp--;
                if (e.hp <= 0) {
                    e.dead = true;
                    score += e.points;
                    enemiesDefeated++;
                    playExplosionSound();
                    spawnParticles(e.x + ew / 2, e.y + eh / 2, e.type === 'boss' ? '#ff4400' : '#ff00ff', e.type === 'boss' ? 20 : 10);
                    spawnPowerUp(e.x, e.y);
                    if (score > highScore) {
                        highScore = score;
                        localStorage.setItem('sueperFriendHigh', highScore.toString());
                    }
                } else {
                    spawnParticles(l.x, l.y, '#ffffff', 3);
                    playTone(300, 0.05, 'square', 0.08);
                }
            }
        });
    });

    lasers = lasers.filter(l => !l.dead);
    enemies = enemies.filter(e => {
        if (e.dead) return false;
        if (e.x < -60) return false;
        return true;
    });

    // Enemy-player collisions
    if (player.invincible > 0) {
        player.invincible--;
    } else {
        enemies.forEach(e => {
            if (e.dead) return;
            const scale = e.type === 'boss' ? 3 : 2;
            const ew = e.w * scale;
            const eh = e.h * scale;
            if (
                player.x < e.x + ew &&
                player.x + player.w > e.x &&
                player.y < e.y + eh &&
                player.y + player.h > e.y
            ) {
                lives--;
                player.invincible = 90;
                shakeTimer = 15;
                playHitSound();
                spawnParticles(player.x + 16, player.y + 20, '#ff0066', 6);
                if (lives <= 0) {
                    gameOver();
                }
            }
        });

        // Enemy laser hitting player
        lasers.forEach(l => {
            if (!l.enemy) return;
            if (
                l.x < player.x + player.w &&
                l.x + l.w > player.x &&
                l.y < player.y + player.h &&
                l.y + l.h > player.y
            ) {
                l.dead = true;
                lives--;
                player.invincible = 90;
                shakeTimer = 15;
                playHitSound();
                if (lives <= 0) {
                    gameOver();
                }
            }
        });
    }

    // Power-up collisions
    powerUps.forEach(p => {
        p.x -= p.speed;
        p.life--;
        if (
            player.x < p.x + p.w &&
            player.x + player.w > p.x &&
            player.y < p.y + p.h &&
            player.y + player.h > p.y
        ) {
            p.dead = true;
            playPowerUpSound();
            if (p.type === 'heart') {
                lives = Math.min(lives + 1, 5);
            } else {
                player.powerUpTimer = 300;
            }
            spawnParticles(p.x + 8, p.y + 7, '#ffff00', 8);
        }
    });
    powerUps = powerUps.filter(p => !p.dead && p.life > 0 && p.x > -20);

    // Update particles
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);

    // Timers
    if (shakeTimer > 0) shakeTimer--;
    if (flashTimer > 0) flashTimer--;
    if (player.powerUpTimer > 0) player.powerUpTimer--;
    player.animFrame++;
}

// ---- MAIN DRAW ----
function draw() {
    ctx.save();

    // Screen shake
    if (shakeTimer > 0) {
        const sx = (Math.random() - 0.5) * shakeTimer * 0.8;
        const sy = (Math.random() - 0.5) * shakeTimer * 0.8;
        ctx.translate(sx, sy);
    }

    drawBackground();

    // Draw power-ups
    powerUps.forEach(p => {
        const bob = Math.sin(frameCount * 0.1) * 3;
        if (p.type === 'heart') {
            drawSprite(p.x, p.y + bob, heartSprite, 2);
        } else {
            drawSprite(p.x, p.y + bob, starSprite, 2);
        }
    });

    // Draw enemies
    enemies.forEach(e => {
        if (e.type === 'skull') {
            const tint = e.tough ? 1 : 0;
            const sprite = e.tough ? skullSprite.map(row =>
                row.map(c => c === '#fff' ? '#ffa' : c === '#f00' ? '#f80' : c)
            ) : skullSprite;
            drawSprite(e.x, e.y, sprite, 2);
        } else if (e.type === 'drone') {
            drawSprite(e.x, e.y, droneSprite, 2);
        } else if (e.type === 'boss') {
            drawSprite(e.x, e.y, bossSprite, 3);
            // Boss health bar
            const barW = e.w * 3;
            ctx.fillStyle = '#333';
            ctx.fillRect(e.x, e.y - 10, barW, 5);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(e.x, e.y - 10, barW * (e.hp / e.maxHp), 5);
        }
    });

    // Draw lasers
    lasers.forEach(l => {
        ctx.fillStyle = l.color;
        ctx.fillRect(Math.floor(l.x), Math.floor(l.y), l.w, l.h);
        // Glow effect
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = l.enemy ? '#ff6600' : '#ffffff';
        ctx.fillRect(Math.floor(l.x) - 2, Math.floor(l.y) - 2, l.w + 4, l.h + 4);
        ctx.globalAlpha = 1;
    });

    // Draw Sue
    if (player.invincible === 0 || Math.floor(player.invincible / 4) % 2 === 0) {
        // Cape flutter animation
        const capeOffset = Math.sin(player.animFrame * 0.15) * 1;
        drawSprite(player.x, player.y + capeOffset * 0.3, sueSprite, 2);

        // Eye glow effect when shooting
        if (keys[' ']) {
            ctx.fillStyle = '#00ffff';
            ctx.globalAlpha = 0.6 + Math.sin(frameCount * 0.3) * 0.4;
            ctx.fillRect(player.x + 10, player.y + 8, 4, 4);
            ctx.fillRect(player.x + 18, player.y + 8, 4, 4);
            // Glow aura
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.arc(player.x + 16, player.y + 10, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // Draw particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
    });
    ctx.globalAlpha = 1;

    // Level up flash
    if (flashTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashTimer / 40})`;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#00ffff';
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL ' + level + '!', W / 2, H / 2);
    }

    drawHUD();

    ctx.restore();
}

// ---- GAME CONTROL ----
function startGame() {
    initAudio();
    score = 0;
    lives = 3;
    level = 1;
    enemiesDefeated = 0;
    enemiesToNextLevel = 10;
    frameCount = 0;
    player.x = 100;
    player.y = H / 2;
    player.invincible = 60;
    player.powerUpTimer = 0;
    lasers = [];
    enemies = [];
    particles = [];
    powerUps = [];
    initStars();
    gameRunning = true;

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';

    startMusic();
}

function gameOver() {
    gameRunning = false;
    stopMusic();

    // Death sound
    playTone(200, 0.3, 'sawtooth', 0.2);
    playTone(150, 0.3, 'sawtooth', 0.15, 0.15);
    playTone(100, 0.5, 'sawtooth', 0.2, 0.3);

    document.getElementById('finalScore').textContent = 'SCORE: ' + score.toString().padStart(8, '0');
    document.getElementById('highScoreText').textContent = 'HIGH SCORE: ' + highScore.toString().padStart(8, '0');
    document.getElementById('gameOverScreen').style.display = 'flex';
}

// ---- GAME LOOP ----
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ---- EVENT LISTENERS ----
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

// Also allow Enter/Space to start
document.addEventListener('keydown', (e) => {
    if (!gameRunning) {
        if (e.key === 'Enter' || e.key === ' ') {
            const startScreen = document.getElementById('startScreen');
            const gameOverScreen = document.getElementById('gameOverScreen');
            if (startScreen.style.display !== 'none' || gameOverScreen.style.display !== 'none') {
                startGame();
                e.preventDefault();
            }
        }
    }
});

// ---- INIT ----
initStars();
gameLoop();
