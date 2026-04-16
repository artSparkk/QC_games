/* ===================================================================
   QUANTUM GAMES - Complete Game Engine
   By: Quantum Code Club | Developer: Issam - IT Dep
   =================================================================== */

// ==================== AUDIO ENGINE ====================
const Audio = (() => {
    let ctx = null;
    const getCtx = () => {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    };

    function play(freq, type, duration, vol = 0.15) {
        try {
            const c = getCtx();
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, c.currentTime);
            gain.gain.setValueAtTime(vol, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start();
            osc.stop(c.currentTime + duration);
        } catch (e) { /* silence errors */ }
    }

    return {
        jump:      () => play(520, 'square', 0.12, 0.1),
        score:     () => play(880, 'sine', 0.15, 0.1),
        hit:       () => play(150, 'sawtooth', 0.3, 0.12),
        move:      () => play(300, 'square', 0.05, 0.06),
        rotate:    () => play(400, 'square', 0.06, 0.06),
        drop:      () => play(200, 'triangle', 0.1, 0.08),
        clear:     () => { play(660, 'sine', 0.1, 0.1); setTimeout(() => play(880, 'sine', 0.15, 0.1), 80); },
        typeGood:  () => play(700, 'sine', 0.06, 0.06),
        typeBad:   () => play(200, 'sawtooth', 0.15, 0.08),
        engine:    () => play(120, 'sawtooth', 0.05, 0.04),
    };
})();


// ==================== PARTICLES BACKGROUND ====================
const Particles = (() => {
    const canvas = document.getElementById('bg-particles');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }

    function init() {
        resize();
        particles = [];
        const count = Math.min(60, Math.floor((w * h) / 18000));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 1.5 + 0.5,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                alpha: Math.random() * 0.5 + 0.1,
                color: Math.random() > 0.5 ? '124,58,237' : '0,229,255',
            });
        }
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
            ctx.fill();
        }
        // Draw faint connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(124,58,237,${0.08 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => { resize(); });
    init();
    animate();
})();


// ==================== LOCAL STORAGE HELPERS ====================
function getHighScore(gameId) {
    return parseInt(localStorage.getItem('qg_hs_' + gameId)) || 0;
}
function setHighScore(gameId, score) {
    const old = getHighScore(gameId);
    if (score > old) {
        localStorage.setItem('qg_hs_' + gameId, score);
        return true; // new high score
    }
    return false;
}


// ==================== DOM REFERENCES ====================
const $homeScreen   = document.getElementById('home-screen');
const $gameScreen    = document.getElementById('game-screen');
const $gamesGrid     = document.getElementById('games-grid');
const $gameTitle     = document.getElementById('game-title');
const $currentScore  = document.getElementById('current-score');
const $gameCanvas    = document.getElementById('game-canvas');
const $overlayStart  = document.getElementById('overlay-start');
const $overlayOver   = document.getElementById('overlay-gameover');
const $startGameName = document.getElementById('start-game-name');
const $startInstr    = document.getElementById('start-instructions');
const $finalScore    = document.getElementById('final-score');
const $highScoreMsg  = document.getElementById('high-score-msg');
const canvasCtx      = $gameCanvas.getContext('2d');

let currentGame = null;   // active game object
let gameRunning = false;


// ==================== GAME DEFINITIONS ====================
const GAMES = [
    { id: 'flappy',  name: 'Flappy Bird',   icon: '🐦', color: '#00e5ff', instructions: 'Press SPACE or tap to flap. Avoid the pipes!' },
    { id: 'snake',   name: 'Snake',          icon: '🐍', color: '#00ff88', instructions: 'Arrow keys or WASD to move. Eat food, don\'t hit walls or yourself!' },
    { id: 'dino',    name: 'Dino Runner',    icon: '🦖', color: '#a78bfa', instructions: 'Press SPACE or tap to jump. Dodge the cacti!' },
    { id: 'tetris',  name: 'Tetris',         icon: '🧱', color: '#7c3aed', instructions: 'Arrow keys to move/rotate. DOWN to soft drop, UP to rotate.' },
    { id: 'racing',  name: 'Racing',         icon: '🏎️', color: '#ff00e5', instructions: 'LEFT/RIGHT arrows or A/D to steer. Avoid oncoming cars!' },
    { id: 'typing',  name: 'Typing Speed',   icon: '⌨️', color: '#ffdd00', instructions: 'Type the falling words before they reach the bottom!' },
];


// ==================== BUILD HOME GRID ====================
function buildGrid() {
    $gamesGrid.innerHTML = '';
    for (const g of GAMES) {
        const hs = getHighScore(g.id);
        const card = document.createElement('div');
        card.className = 'game-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.innerHTML = `
            <span class="card-icon">${g.icon}</span>
            <div class="card-name">${g.name}</div>
            ${hs > 0 ? `<div class="card-hs">BEST: ${hs}</div>` : ''}
        `;
        card.addEventListener('click', () => openGame(g));
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openGame(g); });
        $gamesGrid.appendChild(card);
    }
}


// ==================== SCREEN NAVIGATION ====================
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function openGame(gameDef) {
    currentGame = gameDef;
    $gameTitle.textContent = gameDef.name;
    $startGameName.textContent = gameDef.name;
    $startInstr.textContent = gameDef.instructions;
    $currentScore.textContent = '0';
    $overlayStart.classList.add('active');
    $overlayOver.classList.remove('active');
    showScreen($gameScreen);
    resizeCanvas();
    // Initialize game (draw idle state)
    const game = gameInstances[gameDef.id];
    if (game) game.init();
}

function goHome() {
    gameRunning = false;
    currentGame = null;
    showScreen($homeScreen);
    buildGrid(); // refresh high scores
}

function startGame() {
    $overlayStart.classList.remove('active');
    $overlayOver.classList.remove('active');
    $currentScore.textContent = '0';
    gameRunning = true;
    const game = gameInstances[currentGame.id];
    if (game) game.start();
}

function gameOver(score) {
    gameRunning = false;
    const isNew = setHighScore(currentGame.id, score);
    $finalScore.textContent = score;
    $highScoreMsg.textContent = isNew ? '🏆 New High Score!' : `Best: ${getHighScore(currentGame.id)}`;
    $overlayOver.classList.add('active');
    Audio.hit();
}


// ==================== BUTTON EVENTS ====================
document.getElementById('btn-home').addEventListener('click', goHome);
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-retry').addEventListener('click', startGame);
document.getElementById('btn-gohome').addEventListener('click', goHome);


// ==================== CANVAS SIZING ====================
let CW = 800, CH = 600; // internal canvas resolution

function resizeCanvas() {
    const wrapper = $gameCanvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    $gameCanvas.width = CW = Math.floor(rect.width);
    $gameCanvas.height = CH = Math.floor(rect.height);
}
window.addEventListener('resize', () => {
    if (currentGame) {
        resizeCanvas();
        const game = gameInstances[currentGame.id];
        if (game && !gameRunning) game.init();
    }
});


// ==================== SCORE UPDATE ====================
function updateScore(val) {
    $currentScore.textContent = val;
}


// ================================================================
//                      GAME IMPLEMENTATIONS
// ================================================================

const gameInstances = {};


// ==================== 1. FLAPPY BIRD ====================
gameInstances.flappy = (() => {
    let bird, pipes, frame, score, animId;

    function init() {
        bird = { x: CW * 0.2, y: CH / 2, vy: 0, w: 30, h: 24 };
        pipes = [];
        frame = 0;
        score = 0;
        updateScore(0);
        drawFrame();
    }

    function start() {
        bird = { x: CW * 0.2, y: CH / 2, vy: 0, w: 30, h: 24 };
        pipes = [];
        frame = 0;
        score = 0;
        updateScore(0);
        loop();
    }

    function loop() {
        if (!gameRunning) return;
        update();
        drawFrame();
        animId = requestAnimationFrame(loop);
    }

    function update() {
        frame++;
        const gravity = 0.4;
        const flapPower = -6.5;
        bird.vy += gravity;
        bird.y += bird.vy;

        // Spawn pipes
        const gap = Math.max(120, CH * 0.22);
        const pipeW = Math.max(40, CW * 0.06);
        const interval = 90;
        if (frame % interval === 0) {
            const minY = 60;
            const maxY = CH - gap - 60;
            const topH = Math.random() * (maxY - minY) + minY;
            pipes.push({ x: CW, topH, gap, w: pipeW, scored: false });
        }

        // Move pipes
        const speed = Math.max(2, CW * 0.004);
        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= speed;
            // Score
            if (!pipes[i].scored && pipes[i].x + pipes[i].w < bird.x) {
                pipes[i].scored = true;
                score++;
                updateScore(score);
                Audio.score();
            }
            // Remove off-screen
            if (pipes[i].x + pipes[i].w < 0) pipes.splice(i, 1);
        }

        // Collision: ceiling/floor
        if (bird.y - bird.h / 2 < 0 || bird.y + bird.h / 2 > CH) {
            gameOver(score);
            return;
        }
        // Collision: pipes
        for (const p of pipes) {
            if (bird.x + bird.w / 2 > p.x && bird.x - bird.w / 2 < p.x + p.w) {
                if (bird.y - bird.h / 2 < p.topH || bird.y + bird.h / 2 > p.topH + p.gap) {
                    gameOver(score);
                    return;
                }
            }
        }
    }

    function flap() {
        if (!gameRunning) return;
        bird.vy = -6.5;
        Audio.jump();
    }

    function drawFrame() {
        const ctx = canvasCtx;
        // Sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, CH);
        grad.addColorStop(0, '#0d0221');
        grad.addColorStop(1, '#150040');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CW, CH);

        // Ground
        ctx.fillStyle = '#1a0a3e';
        ctx.fillRect(0, CH - 3, CW, 3);

        // Pipes
        for (const p of pipes) {
            // Top pipe
            const pg = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
            pg.addColorStop(0, '#2d0a5e');
            pg.addColorStop(0.5, '#5b21b6');
            pg.addColorStop(1, '#2d0a5e');
            ctx.fillStyle = pg;
            ctx.fillRect(p.x, 0, p.w, p.topH);
            // Top pipe cap
            ctx.fillStyle = '#7c3aed';
            ctx.fillRect(p.x - 4, p.topH - 16, p.w + 8, 16);
            // Bottom pipe
            ctx.fillStyle = pg;
            ctx.fillRect(p.x, p.topH + p.gap, p.w, CH - p.topH - p.gap);
            // Bottom pipe cap
            ctx.fillStyle = '#7c3aed';
            ctx.fillRect(p.x - 4, p.topH + p.gap, p.w + 8, 16);
            // Glow edge
            ctx.shadowColor = '#7c3aed';
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(124,58,237,0.3)';
            ctx.fillRect(p.x + p.w - 2, 0, 2, p.topH);
            ctx.fillRect(p.x + p.w - 2, p.topH + p.gap, 2, CH);
            ctx.shadowBlur = 0;
        }

        // Bird
        ctx.save();
        ctx.translate(bird.x, bird.y);
        const angle = Math.min(Math.max(bird.vy * 3, -30), 70) * Math.PI / 180;
        ctx.rotate(angle);
        // Body
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(0, 0, bird.w / 2, bird.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(8, -4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0d0221';
        ctx.beginPath();
        ctx.arc(9, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#ffdd00';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(22, 2);
        ctx.lineTo(14, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    return {
        init, start,
        handleKey(e) { if (e.code === 'Space') { e.preventDefault(); flap(); } },
        handleTap() { flap(); },
    };
})();


// ==================== 2. SNAKE ====================
gameInstances.snake = (() => {
    let snake, dir, nextDir, food, score, tick, tickRate, animId;

    function init() {
        const size = Math.max(15, Math.floor(Math.min(CW, CH) / 25));
        snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        score = 0;
        tick = 0;
        tickRate = 8;
        spawnFood();
        updateScore(0);
        drawSnakeGame();
    }

    function start() {
        init();
        loop();
    }

    function getGridSize() {
        return Math.max(15, Math.floor(Math.min(CW, CH) / 25));
    }

    function getGrid() {
        const s = getGridSize();
        return { cols: Math.floor(CW / s), rows: Math.floor(CH / s) };
    }

    function spawnFood() {
        const g = getGrid();
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * g.cols), y: Math.floor(Math.random() * g.rows) };
        } while (snake.some(s => s.x === pos.x && s.y === pos.y));
        food = pos;
    }

    function loop() {
        if (!gameRunning) return;
        animId = requestAnimationFrame(loop);
        tick++;
        if (tick < tickRate) return;
        tick = 0;

        dir = { ...nextDir };
        const g = getGrid();
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        // Wall collision
        if (head.x < 0 || head.x >= g.cols || head.y < 0 || head.y >= g.rows) {
            gameOver(score);
            return;
        }
        // Self collision
        if (snake.some(s => s.x === head.x && s.y === head.y)) {
            gameOver(score);
            return;
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score++;
            updateScore(score);
            Audio.score();
            spawnFood();
            if (tickRate > 3) tickRate -= 0.3;
        } else {
            snake.pop();
        }
        drawSnakeGame();
    }

    function drawSnakeGame() {
        const ctx = canvasCtx;
        const s = getGridSize();
        const g = getGrid();

        // Background
        ctx.fillStyle = '#0d0221';
        ctx.fillRect(0, 0, CW, CH);

        // Grid lines
        ctx.strokeStyle = 'rgba(124,58,237,0.06)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= g.cols; x++) {
            ctx.beginPath(); ctx.moveTo(x * s, 0); ctx.lineTo(x * s, g.rows * s); ctx.stroke();
        }
        for (let y = 0; y <= g.rows; y++) {
            ctx.beginPath(); ctx.moveTo(0, y * s); ctx.lineTo(g.cols * s, y * s); ctx.stroke();
        }

        // Food
        ctx.fillStyle = '#ff3355';
        ctx.shadowColor = '#ff3355';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(food.x * s + s / 2, food.y * s + s / 2, s / 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Snake
        for (let i = 0; i < snake.length; i++) {
            const seg = snake[i];
            const alpha = 1 - (i / snake.length) * 0.5;
            if (i === 0) {
                ctx.fillStyle = '#00ff88';
                ctx.shadowColor = '#00ff88';
                ctx.shadowBlur = 8;
            } else {
                ctx.fillStyle = `rgba(0,255,136,${alpha})`;
                ctx.shadowBlur = 0;
            }
            const pad = i === 0 ? 1 : 2;
            ctx.fillRect(seg.x * s + pad, seg.y * s + pad, s - pad * 2, s - pad * 2);
            ctx.shadowBlur = 0;
        }
    }

    return {
        init, start,
        handleKey(e) {
            const map = {
                'ArrowUp':    { x: 0, y: -1 }, 'KeyW': { x: 0, y: -1 },
                'ArrowDown':  { x: 0, y: 1 },  'KeyS': { x: 0, y: 1 },
                'ArrowLeft':  { x: -1, y: 0 }, 'KeyA': { x: -1, y: 0 },
                'ArrowRight': { x: 1, y: 0 },  'KeyD': { x: 1, y: 0 },
            };
            const d = map[e.code];
            if (d && !(d.x === -dir.x && d.y === -dir.y)) {
                e.preventDefault();
                nextDir = d;
                Audio.move();
            }
        },
        handleTap() {},
    };
})();


// ==================== 3. DINO RUNNER ====================
gameInstances.dino = (() => {
    let dino, cacti, frame, score, speed, animId;

    function init() {
        const groundY = CH - 50;
        dino = { x: CW * 0.15, y: groundY, w: 36, h: 44, vy: 0, grounded: true };
        cacti = [];
        frame = 0;
        score = 0;
        speed = 4;
        updateScore(0);
        drawDinoGame();
    }

    function start() {
        init();
        loop();
    }

    function jump() {
        if (!gameRunning || !dino.grounded) return;
        dino.vy = -11;
        dino.grounded = false;
        Audio.jump();
    }

    function loop() {
        if (!gameRunning) return;
        animId = requestAnimationFrame(loop);
        frame++;
        const groundY = CH - 50;

        // Gravity
        dino.vy += 0.6;
        dino.y += dino.vy;
        if (dino.y >= groundY) {
            dino.y = groundY;
            dino.vy = 0;
            dino.grounded = true;
        }

        // Speed up over time
        speed = 4 + Math.floor(frame / 300) * 0.5;

        // Spawn cacti
        const interval = Math.max(40, 80 - Math.floor(frame / 200) * 3);
        if (frame % interval === 0) {
            const h = 25 + Math.random() * 25;
            const w = 15 + Math.random() * 15;
            cacti.push({ x: CW + 20, y: groundY, w, h });
        }

        // Move cacti
        for (let i = cacti.length - 1; i >= 0; i--) {
            cacti[i].x -= speed;
            if (cacti[i].x + cacti[i].w < 0) {
                cacti.splice(i, 1);
                score++;
                updateScore(score);
                if (score % 10 === 0) Audio.score();
            }
        }

        // Collision
        for (const c of cacti) {
            if (dino.x + dino.w - 8 > c.x + 4 && dino.x + 8 < c.x + c.w - 4 &&
                dino.y > c.y - c.h + 4) {
                gameOver(score);
                return;
            }
        }

        drawDinoGame();
    }

    function drawDinoGame() {
        const ctx = canvasCtx;
        const groundY = CH - 50;

        // Sky
        ctx.fillStyle = '#0d0221';
        ctx.fillRect(0, 0, CW, CH);

        // Stars
        ctx.fillStyle = 'rgba(167,139,250,0.3)';
        for (let i = 0; i < 30; i++) {
            const sx = ((i * 137 + frame * 0.1) % CW);
            const sy = (i * 97) % (groundY - 40);
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Ground
        ctx.strokeStyle = '#5b21b6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY + 2);
        ctx.lineTo(CW, groundY + 2);
        ctx.stroke();

        // Ground details
        ctx.strokeStyle = 'rgba(91,33,182,0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            const gx = ((i * 60 - frame * speed) % CW + CW) % CW;
            ctx.beginPath();
            ctx.moveTo(gx, groundY + 8);
            ctx.lineTo(gx + 15, groundY + 8);
            ctx.stroke();
        }

        // Cacti
        for (const c of cacti) {
            ctx.fillStyle = '#5b21b6';
            ctx.shadowColor = '#7c3aed';
            ctx.shadowBlur = 6;
            // Main trunk
            ctx.fillRect(c.x + c.w * 0.3, c.y - c.h, c.w * 0.4, c.h);
            // Left arm
            if (c.h > 30) {
                ctx.fillRect(c.x, c.y - c.h * 0.7, c.w * 0.3, c.w * 0.25);
                ctx.fillRect(c.x, c.y - c.h * 0.7, c.w * 0.25, c.h * 0.3);
            }
            // Right arm
            if (c.h > 35) {
                ctx.fillRect(c.x + c.w * 0.7, c.y - c.h * 0.5, c.w * 0.3, c.w * 0.25);
                ctx.fillRect(c.x + c.w * 0.75, c.y - c.h * 0.5, c.w * 0.25, c.h * 0.25);
            }
            ctx.shadowBlur = 0;
        }

        // Dino
        ctx.fillStyle = '#a78bfa';
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 10;
        // Body
        ctx.fillRect(dino.x + 6, dino.y - dino.h + 6, dino.w - 12, dino.h - 14);
        // Head
        ctx.fillRect(dino.x + 10, dino.y - dino.h, dino.w - 8, 16);
        // Eye
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.fillRect(dino.x + dino.w - 10, dino.y - dino.h + 3, 4, 4);
        // Legs (animated)
        ctx.fillStyle = '#a78bfa';
        if (dino.grounded) {
            const legFrame = Math.floor(frame / 6) % 2;
            ctx.fillRect(dino.x + 8, dino.y - 8, 6, 8 + (legFrame ? 0 : 4));
            ctx.fillRect(dino.x + dino.w - 14, dino.y - 8, 6, 8 + (legFrame ? 4 : 0));
        } else {
            ctx.fillRect(dino.x + 8, dino.y - 10, 6, 6);
            ctx.fillRect(dino.x + dino.w - 14, dino.y - 10, 6, 6);
        }
        ctx.shadowBlur = 0;

        // Score display in canvas
        ctx.fillStyle = 'rgba(167,139,250,0.5)';
        ctx.font = `${Math.max(14, CW * 0.025)}px monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(`${String(Math.floor(score)).padStart(5, '0')}`, CW - 20, 30);
        ctx.textAlign = 'left';
    }

    return {
        init, start,
        handleKey(e) { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } },
        handleTap() { jump(); },
    };
})();


// ==================== 4. TETRIS ====================
gameInstances.tetris = (() => {
    const SHAPES = [
        [[1,1,1,1]],                         // I
        [[1,1],[1,1]],                       // O
        [[0,1,0],[1,1,1]],                   // T
        [[1,0,0],[1,1,1]],                   // L
        [[0,0,1],[1,1,1]],                   // J
        [[0,1,1],[1,1,0]],                   // S
        [[1,1,0],[0,1,1]],                   // Z
    ];
    const COLORS = ['#00e5ff','#ffdd00','#a78bfa','#ff8800','#3b82f6','#00ff88','#ff3355'];

    let grid, piece, pieceX, pieceY, pieceType, nextType;
    let score, lines, tick, dropRate, animId;
    let COLS, ROWS, CELL;

    function init() {
        CELL = Math.max(16, Math.floor(Math.min(CW / 12, CH / 22)));
        COLS = 10;
        ROWS = Math.floor((CH - 10) / CELL);
        grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        score = 0;
        lines = 0;
        tick = 0;
        dropRate = 30;
        pieceType = Math.floor(Math.random() * SHAPES.length);
        nextType = Math.floor(Math.random() * SHAPES.length);
        spawnPiece();
        updateScore(0);
        drawTetris();
    }

    function start() {
        init();
        loop();
    }

    function spawnPiece() {
        pieceType = nextType;
        nextType = Math.floor(Math.random() * SHAPES.length);
        piece = SHAPES[pieceType].map(r => [...r]);
        pieceX = Math.floor((COLS - piece[0].length) / 2);
        pieceY = 0;
        if (collides(piece, pieceX, pieceY)) {
            gameOver(score);
        }
    }

    function collides(p, px, py) {
        for (let r = 0; r < p.length; r++) {
            for (let c = 0; c < p[r].length; c++) {
                if (p[r][c]) {
                    const nx = px + c, ny = py + r;
                    if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
                    if (ny >= 0 && grid[ny][nx]) return true;
                }
            }
        }
        return false;
    }

    function rotate(p) {
        const rows = p.length, cols = p[0].length;
        const rotated = Array.from({ length: cols }, (_, c) =>
            Array.from({ length: rows }, (_, r) => p[rows - 1 - r][c])
        );
        return rotated;
    }

    function lockPiece() {
        for (let r = 0; r < piece.length; r++) {
            for (let c = 0; c < piece[r].length; c++) {
                if (piece[r][c]) {
                    const ny = pieceY + r, nx = pieceX + c;
                    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
                        grid[ny][nx] = pieceType + 1;
                    }
                }
            }
        }
        // Clear lines
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[r].every(c => c !== 0)) {
                grid.splice(r, 1);
                grid.unshift(Array(COLS).fill(0));
                cleared++;
                r++;
            }
        }
        if (cleared > 0) {
            const points = [0, 100, 300, 500, 800];
            score += points[cleared] || 800;
            lines += cleared;
            updateScore(score);
            Audio.clear();
            if (dropRate > 5) dropRate -= 1;
        }
        spawnPiece();
    }

    function loop() {
        if (!gameRunning) return;
        animId = requestAnimationFrame(loop);
        tick++;
        if (tick >= dropRate) {
            tick = 0;
            if (!collides(piece, pieceX, pieceY + 1)) {
                pieceY++;
            } else {
                lockPiece();
            }
        }
        drawTetris();
    }

    function drawTetris() {
        const ctx = canvasCtx;
        ctx.fillStyle = '#0d0221';
        ctx.fillRect(0, 0, CW, CH);

        const offsetX = Math.floor((CW - COLS * CELL) / 2);
        const offsetY = Math.floor((CH - ROWS * CELL) / 2);

        // Grid border
        ctx.strokeStyle = 'rgba(124,58,237,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(offsetX - 1, offsetY - 1, COLS * CELL + 2, ROWS * CELL + 2);

        // Grid background
        ctx.fillStyle = 'rgba(13,2,33,0.8)';
        ctx.fillRect(offsetX, offsetY, COLS * CELL, ROWS * CELL);

        // Grid lines
        ctx.strokeStyle = 'rgba(124,58,237,0.06)';
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath(); ctx.moveTo(offsetX + c * CELL, offsetY); ctx.lineTo(offsetX + c * CELL, offsetY + ROWS * CELL); ctx.stroke();
        }
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(offsetX, offsetY + r * CELL); ctx.lineTo(offsetX + COLS * CELL, offsetY + r * CELL); ctx.stroke();
        }

        // Placed blocks
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c]) {
                    drawBlock(ctx, offsetX + c * CELL, offsetY + r * CELL, CELL, COLORS[grid[r][c] - 1]);
                }
            }
        }

        // Current piece
        if (piece) {
            for (let r = 0; r < piece.length; r++) {
                for (let c = 0; c < piece[r].length; c++) {
                    if (piece[r][c]) {
                        drawBlock(ctx, offsetX + (pieceX + c) * CELL, offsetY + (pieceY + r) * CELL, CELL, COLORS[pieceType]);
                    }
                }
            }
            // Ghost piece
            let ghostY = pieceY;
            while (!collides(piece, pieceX, ghostY + 1)) ghostY++;
            ctx.globalAlpha = 0.2;
            for (let r = 0; r < piece.length; r++) {
                for (let c = 0; c < piece[r].length; c++) {
                    if (piece[r][c]) {
                        drawBlock(ctx, offsetX + (pieceX + c) * CELL, offsetY + (ghostY + r) * CELL, CELL, COLORS[pieceType]);
                    }
                }
            }
            ctx.globalAlpha = 1;
        }

        // Next piece preview
        const nextX = offsetX + COLS * CELL + 20;
        const nextY = offsetY + 10;
        ctx.fillStyle = 'rgba(167,139,250,0.6)';
        ctx.font = `${Math.max(11, CELL * 0.6)}px sans-serif`;
        ctx.fillText('NEXT', nextX, nextY);
        if (SHAPES[nextType]) {
            const np = SHAPES[nextType];
            const nCell = CELL * 0.7;
            for (let r = 0; r < np.length; r++) {
                for (let c = 0; c < np[r].length; c++) {
                    if (np[r][c]) {
                        drawBlock(ctx, nextX + c * nCell, nextY + 10 + r * nCell, nCell, COLORS[nextType]);
                    }
                }
            }
        }

        // Lines
        ctx.fillStyle = 'rgba(167,139,250,0.5)';
        ctx.fillText(`LINES: ${lines}`, nextX, nextY + 90);
    }

    function drawBlock(ctx, x, y, size, color) {
        const pad = 1;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
        ctx.shadowBlur = 0;
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + pad, y + pad, size - pad * 2, (size - pad * 2) * 0.3);
    }

    return {
        init, start,
        handleKey(e) {
            if (!gameRunning) return;
            switch (e.code) {
                case 'ArrowLeft':
                    e.preventDefault();
                    if (!collides(piece, pieceX - 1, pieceY)) { pieceX--; Audio.move(); }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (!collides(piece, pieceX + 1, pieceY)) { pieceX++; Audio.move(); }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (!collides(piece, pieceX, pieceY + 1)) { pieceY++; score += 1; updateScore(score); Audio.move(); }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    const rotated = rotate(piece);
                    if (!collides(rotated, pieceX, pieceY)) { piece = rotated; Audio.rotate(); }
                    else if (!collides(rotated, pieceX - 1, pieceY)) { piece = rotated; pieceX--; Audio.rotate(); }
                    else if (!collides(rotated, pieceX + 1, pieceY)) { piece = rotated; pieceX++; Audio.rotate(); }
                    break;
            }
        },
        handleTap() {},
    };
})();


// ==================== 5. RACING GAME ====================
gameInstances.racing = (() => {
    let player, enemies, roadMarkOffset, frame, score, speed, animId;
    let roadLeft, roadRight, roadWidth, laneWidth;

    function init() {
        roadWidth = Math.min(CW * 0.5, 280);
        roadLeft = (CW - roadWidth) / 2;
        roadRight = roadLeft + roadWidth;
        laneWidth = roadWidth / 3;
        const carW = laneWidth * 0.55;
        const carH = carW * 1.7;
        player = {
            x: roadLeft + laneWidth * 1.5 - carW / 2,
            y: CH - carH - 30,
            w: carW, h: carH,
        };
        enemies = [];
        roadMarkOffset = 0;
        frame = 0;
        score = 0;
        speed = 3;
        updateScore(0);
        drawRacing();
    }

    function start() {
        init();
        loop();
    }

    function loop() {
        if (!gameRunning) return;
        animId = requestAnimationFrame(loop);
        frame++;

        speed = 3 + Math.floor(frame / 400) * 0.5;

        // Road marks
        roadMarkOffset = (roadMarkOffset + speed) % 40;

        // Move enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].y += speed + enemies[i].speed;
            if (enemies[i].y > CH + 50) {
                enemies.splice(i, 1);
                score++;
                updateScore(score);
                if (score % 10 === 0) Audio.score();
            }
        }

        // Spawn enemies
        const interval = Math.max(25, 55 - Math.floor(frame / 300) * 2);
        if (frame % interval === 0) {
            const lane = Math.floor(Math.random() * 3);
            const carW = laneWidth * 0.55;
            const carH = carW * 1.7;
            enemies.push({
                x: roadLeft + lane * laneWidth + (laneWidth - carW) / 2,
                y: -carH - 20,
                w: carW, h: carH,
                speed: Math.random() * 2,
                color: ['#ff3355','#ff8800','#3b82f6','#ffdd00','#00ff88'][Math.floor(Math.random() * 5)],
            });
        }

        // Collision
        for (const e of enemies) {
            if (player.x + 4 < e.x + e.w - 4 && player.x + player.w - 4 > e.x + 4 &&
                player.y + 4 < e.y + e.h - 4 && player.y + player.h - 4 > e.y + 4) {
                gameOver(score);
                return;
            }
        }

        drawRacing();
    }

    function drawCar(ctx, x, y, w, h, color, isPlayer) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isPlayer ? 14 : 6;
        // Body
        const r = 4;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Windshield
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        if (isPlayer) {
            ctx.fillRect(x + w * 0.15, y + h * 0.15, w * 0.7, h * 0.2);
        } else {
            ctx.fillRect(x + w * 0.15, y + h * 0.65, w * 0.7, h * 0.2);
        }

        // Wheels
        ctx.fillStyle = '#222';
        ctx.fillRect(x - 3, y + h * 0.1, 5, h * 0.2);
        ctx.fillRect(x + w - 2, y + h * 0.1, 5, h * 0.2);
        ctx.fillRect(x - 3, y + h * 0.7, 5, h * 0.2);
        ctx.fillRect(x + w - 2, y + h * 0.7, 5, h * 0.2);
    }

    function drawRacing() {
        const ctx = canvasCtx;

        // Grass
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(0, 0, CW, CH);

        // Road
        const roadGrad = ctx.createLinearGradient(roadLeft, 0, roadRight, 0);
        roadGrad.addColorStop(0, '#1a1a2e');
        roadGrad.addColorStop(0.5, '#222240');
        roadGrad.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(roadLeft, 0, roadWidth, CH);

        // Road edges
        ctx.strokeStyle = '#5b21b6';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(roadLeft, 0); ctx.lineTo(roadLeft, CH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(roadRight, 0); ctx.lineTo(roadRight, CH); ctx.stroke();

        // Lane marks
        ctx.strokeStyle = 'rgba(167,139,250,0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 20]);
        ctx.lineDashOffset = -roadMarkOffset;
        for (let i = 1; i < 3; i++) {
            const lx = roadLeft + laneWidth * i;
            ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, CH); ctx.stroke();
        }
        ctx.setLineDash([]);

        // Enemies
        for (const e of enemies) {
            drawCar(ctx, e.x, e.y, e.w, e.h, e.color, false);
        }

        // Player
        drawCar(ctx, player.x, player.y, player.w, player.h, '#00e5ff', true);

        // Speed indicator
        ctx.fillStyle = 'rgba(167,139,250,0.5)';
        ctx.font = `${Math.max(12, CW * 0.02)}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`SPEED: ${Math.floor(speed * 30)} km/h`, 15, 25);
        ctx.textAlign = 'left';
    }

    function steerLeft() {
        if (!gameRunning) return;
        player.x -= laneWidth * 0.15;
        player.x = Math.max(roadLeft + 5, player.x);
        Audio.engine();
    }
    function steerRight() {
        if (!gameRunning) return;
        player.x += laneWidth * 0.15;
        player.x = Math.min(roadRight - player.w - 5, player.x);
        Audio.engine();
    }

    return {
        init, start,
        handleKey(e) {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); steerLeft(); }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); steerRight(); }
        },
        handleTap() {},
    };
})();


// ==================== 6. TYPING SPEED ====================
gameInstances.typing = (() => {
    const WORDS = [
        'quantum','code','pixel','matrix','neon','cyber','pulse','flux','node',
        'byte','data','sync','warp','grid','loop','hack','void','link','core',
        'beam','tech','wave','glow','dark','void','rust','java','react','stack',
        'array','class','style','query','event','input','debug','parse','fetch',
        'render','state','props','async','await','scope','yield','proxy','cache',
        'build','deploy','server','cloud','linux','shell','token','route','api',
        'brain','logic','stack','queue','graph','tree','hash','sort','search',
    ];

    let words, input, score, missCount, totalTyped, spawnTimer, speed, animId, timeLeft;

    function init() {
        words = [];
        input = '';
        score = 0;
        missCount = 0;
        totalTyped = 0;
        spawnTimer = 0;
        speed = 1;
        timeLeft = 60;
        updateScore(0);
        drawTypingGame();
    }

    function start() {
        init();
        loop();
        // Timer
        if (window._typingTimer) clearInterval(window._typingTimer);
        window._typingTimer = setInterval(() => {
            if (!gameRunning) return;
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(window._typingTimer);
                gameOver(score);
            }
        }, 1000);
    }

    function spawnWord() {
        const text = WORDS[Math.floor(Math.random() * WORDS.length)];
        const fontSize = Math.max(14, CW * 0.025);
        // Measure text width
        canvasCtx.font = `bold ${fontSize}px monospace`;
        const tw = canvasCtx.measureText(text).width;
        const x = Math.random() * (CW - tw - 40) + 20;
        words.push({ text, x, y: -20, speed: 0.5 + Math.random() * 0.5 + speed * 0.1 });
    }

    function loop() {
        if (!gameRunning) return;
        animId = requestAnimationFrame(loop);

        spawnTimer++;
        const interval = Math.max(30, 70 - speed * 5);
        if (spawnTimer >= interval) {
            spawnTimer = 0;
            spawnWord();
        }

        // Move words
        for (let i = words.length - 1; i >= 0; i--) {
            words[i].y += words[i].speed;
            if (words[i].y > CH - 20) {
                words.splice(i, 1);
                missCount++;
                Audio.typeBad();
                if (missCount >= 5) {
                    clearInterval(window._typingTimer);
                    gameOver(score);
                    return;
                }
            }
        }

        // Speed up
        speed = 1 + Math.floor((60 - timeLeft) / 15);

        drawTypingGame();
    }

    function handleInput(char) {
        if (!gameRunning) return;
        if (char.length !== 1) return;
        const ch = char.toLowerCase();
        if (ch < 'a' || ch > 'z') return;

        totalTyped++;

        // Find first word starting with current input + this char
        const newInput = input + ch;
        let matched = false;
        for (let i = 0; i < words.length; i++) {
            if (words[i].text.startsWith(newInput)) {
                input = newInput;
                if (input === words[i].text) {
                    // Word completed!
                    score++;
                    updateScore(score);
                    words.splice(i, 1);
                    input = '';
                    Audio.typeGood();
                } else {
                    Audio.typeGood();
                }
                matched = true;
                break;
            }
        }
        if (!matched) {
            // Wrong key
            input = '';
            Audio.typeBad();
        }
    }

    function drawTypingGame() {
        const ctx = canvasCtx;
        ctx.fillStyle = '#0d0221';
        ctx.fillRect(0, 0, CW, CH);

        const fontSize = Math.max(14, CW * 0.025);
        ctx.font = `bold ${fontSize}px monospace`;

        // Draw words
        for (const w of words) {
            const isTyping = w.text.startsWith(input);
            ctx.fillStyle = isTyping ? '#00e5ff' : 'rgba(167,139,250,0.7)';
            if (isTyping) {
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 8;
            }
            ctx.fillText(w.text, w.x, w.y);
            // Highlight typed portion
            if (isTyping && input.length > 0) {
                const typedWidth = ctx.measureText(input).width;
                ctx.fillStyle = '#fff';
                ctx.fillText(input, w.x, w.y);
            }
            ctx.shadowBlur = 0;
        }

        // Input display
        ctx.fillStyle = 'rgba(124,58,237,0.2)';
        ctx.fillRect(CW / 2 - 120, CH - 50, 240, 36);
        ctx.strokeStyle = 'rgba(124,58,237,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(CW / 2 - 120, CH - 50, 240, 36);
        ctx.fillStyle = '#00e5ff';
        ctx.font = `bold ${fontSize + 2}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(input + (gameRunning ? '|' : ''), CW / 2, CH - 26);
        ctx.textAlign = 'left';

        // Timer
        ctx.fillStyle = timeLeft <= 10 ? '#ff3355' : 'rgba(167,139,250,0.6)';
        ctx.font = `bold ${Math.max(12, CW * 0.02)}px monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(`TIME: ${timeLeft}s`, CW - 15, 25);
        // Misses
        ctx.fillStyle = '#ff3355';
        ctx.fillText(`MISS: ${missCount}/5`, CW - 15, 45);
        ctx.textAlign = 'left';

        // Instructions
        if (input.length === 0 && gameRunning) {
            ctx.fillStyle = 'rgba(167,139,250,0.3)';
            ctx.font = `${Math.max(11, CW * 0.017)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('Type the falling words!', CW / 2, CH - 65);
            ctx.textAlign = 'left';
        }
    }

    return {
        init, start,
        handleKey(e) {
            if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
                e.preventDefault();
                handleInput(e.key);
            }
            if (e.code === 'Backspace') {
                e.preventDefault();
                input = input.slice(0, -1);
            }
        },
        handleTap() {},
        handleCharInput: true,
    };
})();


// ==================== GLOBAL INPUT HANDLING ====================
document.addEventListener('keydown', (e) => {
    if (!currentGame || !gameInstances[currentGame.id]) return;
    const game = gameInstances[currentGame.id];
    if (game.handleKey) game.handleKey(e);
});

// For typing game - capture all key input
document.addEventListener('keypress', (e) => {
    if (!currentGame || !gameRunning) return;
    const game = gameInstances[currentGame.id];
    if (game.handleCharInput && game.handleKey) game.handleKey(e);
});

// Touch/click on canvas for games that use tap
 $gameCanvas.addEventListener('pointerdown', (e) => {
    if (!currentGame || !gameRunning) return;
    const game = gameInstances[currentGame.id];
    if (game.handleTap) game.handleTap(e);
});

// Prevent scrolling on touch
 $gameCanvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });


// ==================== INITIALIZE ====================
buildGrid();