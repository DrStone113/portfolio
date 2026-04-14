// ── SPRITE ENGINE ──────────────────────────────────────────────
const BASE = 'assets/images/';
function enc(s) {
  return s.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

// Cache loaded images
const imgCache = {};
function loadImage(src) {
  if (imgCache[src]) return imgCache[src];
  const p = new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  imgCache[src] = p;
  return p;
}

// Draw one frame of a sprite sheet onto a canvas
// canvas: HTMLCanvasElement (buffer size = frameW × frameH)
// img: loaded Image, frames: total frame count
// frameW/frameH: size of each frame in the sheet
// fps: playback speed
function animateSprite(canvas, img, frames, frameW, frameH, fps) {
  if (!canvas || !img) return;
  if (canvas.dataset.animated) return;
  canvas.dataset.animated = '1';
  // Set buffer to exact frame size
  canvas.width = frameW;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  let frame = 0;
  const ms = 1000 / fps;
  let last = 0;
  function tick(ts) {
    if (ts - last >= ms) {
      ctx.clearRect(0, 0, frameW, frameH);
      ctx.drawImage(img, frame * frameW, 0, frameW, frameH, 0, 0, frameW, frameH);
      frame = (frame + 1) % frames;
      last = ts;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── HERO SPRITE — Pink Man Idle (11 frames, 32×32) ──────────────
const heroCanvas = document.getElementById('heroSprite');
if (heroCanvas) {
  loadImage(BASE + enc('Main Characters/Virtual Guy/Idle (32x32).png')).then(img => {
    animateSprite(heroCanvas, img, 11, 32, 32, 20);
    heroCanvas.style.filter = 'drop-shadow(0 0 12px rgba(0,175,239,0.6))';
  });
}

// ── GROUND RUNNER — Ninja Frog Run (12 frames, 32×32) ───────────
const runnerCanvas = document.getElementById('groundRunner');
if (runnerCanvas) {
  loadImage(BASE + enc('Main Characters/Ninja Frog/Run (32x32).png')).then(img => {
    animateSprite(runnerCanvas, img, 12, 32, 32, 20);
  });
}

// ── FOOTER RUNNER — Pink Man Run (12 frames, 32×32) ─────────────
const footerCanvas = document.getElementById('footerRunner');
if (footerCanvas) {
  loadImage(BASE + enc('Main Characters/Pink Man/Run (32x32).png')).then(img => {
    animateSprite(footerCanvas, img, 12, 32, 32, 20);
  });
}

// ── FLOATING FRUITS — canvas, 1 frame shown at a time ───────────
// Fruit sheet: 544×32, 17 frames of 32×32
const fruitNames = ['Apple','Bananas','Cherries','Kiwi','Melon','Orange','Pineapple','Strawberry'];
const floatContainer = document.getElementById('floatingFruits');
if (floatContainer) {
  fruitNames.forEach(name => {
    loadImage(BASE + 'Items/Fruits/' + name + '.png').then(img => {
      if (!img) return;
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const c = document.createElement('canvas');
        c.className = 'fruit';
        c.width = 32;
        c.height = 32;
        const sz = (20 + Math.random() * 20);
        c.style.width = sz + 'px';
        c.style.height = sz + 'px';
        c.style.left = (Math.random() * 98) + 'vw';
        c.style.top = '0';
        const dur = (8 + Math.random() * 12);
        // Negative delay = start mid-cycle so fruits are already spread out on load
        const delay = -(Math.random() * dur);
        c.style.animationDuration = dur.toFixed(1) + 's';
        c.style.animationDelay = delay.toFixed(1) + 's';
        floatContainer.appendChild(c);
        animateSprite(c, img, 17, 32, 32, 12);
      }
    });
  });
}

// ── PIXEL ADVENTURE PAGE ─────────────────────────────────────────
// Hero row — 4 characters idle (11 frames, 32×32)
[
  ['sprPinkMan',    enc('Main Characters/Pink Man/Idle (32x32).png')],
  ['sprNinjaFrog',  enc('Main Characters/Ninja Frog/Idle (32x32).png')],
  ['sprMaskDude',   enc('Main Characters/Mask Dude/Idle (32x32).png')],
  ['sprVirtualGuy', enc('Main Characters/Virtual Guy/Idle (32x32).png')],
].forEach(([id, file]) => {
  const c = document.getElementById(id);
  if (c) loadImage(BASE + file).then(img => animateSprite(c, img, 11, 32, 32, 20));
});

// Game screen
const gameChar = document.getElementById('gameChar');
if (gameChar) loadImage(BASE + enc('Main Characters/Pink Man/Run (32x32).png')).then(img => animateSprite(gameChar, img, 12, 32, 32, 20));

const gameChicken = document.getElementById('gameChicken');
if (gameChicken) loadImage(BASE + enc('Enemies/Chicken/Run (32x34).png')).then(img => animateSprite(gameChicken, img, 14, 32, 34, 20));

const gameApple = document.getElementById('gameApple');
if (gameApple) loadImage(BASE + 'Items/Fruits/Apple.png').then(img => animateSprite(gameApple, img, 17, 32, 32, 15));

const gameCherry = document.getElementById('gameCherry');
if (gameCherry) loadImage(BASE + 'Items/Fruits/Cherries.png').then(img => animateSprite(gameCherry, img, 17, 32, 32, 15));

// Character cards (96px display, 32×32 buffer)
[
  ['charPinkMan',    enc('Main Characters/Pink Man/Idle (32x32).png')],
  ['charNinjaFrog',  enc('Main Characters/Ninja Frog/Idle (32x32).png')],
  ['charMaskDude',   enc('Main Characters/Mask Dude/Idle (32x32).png')],
  ['charVirtualGuy', enc('Main Characters/Virtual Guy/Idle (32x32).png')],
].forEach(([id, file]) => {
  const c = document.getElementById(id);
  if (c) loadImage(BASE + file).then(img => animateSprite(c, img, 11, 32, 32, 20));
});

// Fruit showcase canvases (48px display, 32×32 buffer, 17 frames)
[
  ['showcaseApple',      'Apple'],
  ['showcaseBananas',    'Bananas'],
  ['showcaseCherries',   'Cherries'],
  ['showcaseKiwi',       'Kiwi'],
  ['showcaseMelon',      'Melon'],
  ['showcaseOrange',     'Orange'],
  ['showcasePineapple',  'Pineapple'],
  ['showcaseStrawberry', 'Strawberry'],
].forEach(([id, name]) => {
  const c = document.getElementById(id);
  if (c) loadImage(BASE + 'Items/Fruits/' + name + '.png').then(img => animateSprite(c, img, 17, 32, 32, 15));
});

// HUD apple icon
const hudApple = document.getElementById('hudApple');
if (hudApple) loadImage(BASE + 'Items/Fruits/Apple.png').then(img => animateSprite(hudApple, img, 17, 32, 32, 15));

// ── TERRAIN PLATFORM RENDERER ────────────────────────────────────
// Atlas: 352×176, tile 16×16, 22 cols
// Tile ID (1-based): col = (id-1)%22, row = floor((id-1)/22)
// Ground top: 7(left)=col6,row0  8(mid)=col7,row0  9(right)=col8,row0
// Platform:  40(left)=col17,row1 41(mid)=col18,row1 42(right)=col19,row1
const ATLAS_COLS = 22;
const T = 16; // source tile size
const SCALE = 2; // display at 2× = 32px

function tileXY(id) {
  const col = (id - 1) % ATLAS_COLS;
  const row = Math.floor((id - 1) / ATLAS_COLS);
  return { x: col * T, y: row * T };
}

function drawPlatformTiles(canvas, terrainImg, leftId, midId, rightId) {
  if (!canvas || !terrainImg) return;
  const displayW = canvas.offsetWidth || parseInt(canvas.style.width) || 200;
  const displayH = T * SCALE;
  canvas.width  = displayW;
  canvas.height = displayH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const cols = Math.ceil(displayW / (T * SCALE));
  for (let i = 0; i < cols; i++) {
    const id = i === 0 ? leftId : (i === cols - 1 ? rightId : midId);
    const { x, y } = tileXY(id);
    ctx.drawImage(terrainImg,
      x, y, T, T,
      i * T * SCALE, 0, T * SCALE, T * SCALE
    );
  }
}

loadImage(BASE + enc('Terrain/Terrain (16x16).png')).then(terrainImg => {
  if (!terrainImg) return;
  // Ground floor: tile 7,8,9 (grass top-left, mid, right)
  const ground = document.getElementById('platformGround');
  // Floating platforms: tile 40,41,42
  const mid1 = document.getElementById('platformMid1');
  const mid2 = document.getElementById('platformMid2');

  requestAnimationFrame(() => {
    drawPlatformTiles(ground, terrainImg, 7, 8, 9);
    drawPlatformTiles(mid1,   terrainImg, 40, 41, 42);
    drawPlatformTiles(mid2,   terrainImg, 40, 41, 42);
  });

  window.addEventListener('resize', () => {
    drawPlatformTiles(ground, terrainImg, 7, 8, 9);
    drawPlatformTiles(mid1,   terrainImg, 40, 41, 42);
    drawPlatformTiles(mid2,   terrainImg, 40, 41, 42);
  });
});

// ── GAME WORLD TILED BACKGROUND ─────────────────────────────────
const gameWorldBg = document.getElementById('gameWorldBg');
if (gameWorldBg) {
  const gwCtx = gameWorldBg.getContext('2d');
  gwCtx.imageSmoothingEnabled = false;
  let gwOffset = 0, gwImg = null;

  loadImage(BASE + 'Background/Gray.png').then(img => { gwImg = img; });

  function resizeGw() {
    const p = gameWorldBg.parentElement;
    gameWorldBg.width  = p.offsetWidth  || 600;
    gameWorldBg.height = p.offsetHeight || 200;
  }
  resizeGw();
  window.addEventListener('resize', resizeGw);

  const GW_TILE = 64, GW_SPEED = 30;
  let lastGwTs = 0;
  function drawGw(ts) {
    if (!gwImg) { requestAnimationFrame(drawGw); return; }
    const dt = lastGwTs ? (ts - lastGwTs) / 1000 : 0;
    lastGwTs = ts;
    gwOffset += GW_SPEED * dt;
    if (gwOffset >= GW_TILE) gwOffset -= GW_TILE;
    const w = gameWorldBg.width, h = gameWorldBg.height;
    gwCtx.clearRect(0, 0, w, h);
    const cols = Math.ceil(w / GW_TILE) + 1;
    const rows = Math.ceil(h / GW_TILE) + 2;
    for (let r = -1; r < rows; r++)
      for (let c = 0; c < cols; c++)
        gwCtx.drawImage(gwImg, 0, 0, gwImg.width, gwImg.height,
          c * GW_TILE, r * GW_TILE + gwOffset, GW_TILE, GW_TILE);
    requestAnimationFrame(drawGw);
  }
  requestAnimationFrame(drawGw);
}

// ── PIXEL ADVENTURE TILED BACKGROUND ────────────────────────────
// Replicates Flutter AnimatedBackground: tile 64×64, scroll down at 25px/s
const pixelBgCanvas = document.getElementById('pixelBgCanvas');
if (pixelBgCanvas) {
  const bgCtx = pixelBgCanvas.getContext('2d');
  bgCtx.imageSmoothingEnabled = false;
  let bgOffset = 0;
  let bgImg = null;

  loadImage(BASE + 'Background/Gray.png').then(img => { bgImg = img; });

  function resizeBgCanvas() {
    const hero = pixelBgCanvas.parentElement;
    pixelBgCanvas.width  = hero.offsetWidth  || window.innerWidth;
    pixelBgCanvas.height = hero.offsetHeight || window.innerHeight;
  }
  resizeBgCanvas();
  window.addEventListener('resize', resizeBgCanvas);

  const TILE = 64;
  const SCROLL_SPEED = 25; // px/s — same as character_selection.dart
  let lastBgTs = 0;

  function drawBg(ts) {
    if (!bgImg) { requestAnimationFrame(drawBg); return; }
    const dt = lastBgTs ? (ts - lastBgTs) / 1000 : 0;
    lastBgTs = ts;

    bgOffset += SCROLL_SPEED * dt;
    if (bgOffset >= TILE) bgOffset -= TILE;

    const w = pixelBgCanvas.width;
    const h = pixelBgCanvas.height;
    bgCtx.clearRect(0, 0, w, h);

    const cols = Math.ceil(w / TILE) + 1;
    const rows = Math.ceil(h / TILE) + 2;

    for (let row = -1; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        bgCtx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height,
          col * TILE, row * TILE + bgOffset, TILE, TILE);
      }
    }
    requestAnimationFrame(drawBg);
  }
  requestAnimationFrame(drawBg);
}
const helmParticles = document.getElementById('helmParticles');
if (helmParticles) {
  const s = document.createElement('style');
  s.textContent = '@keyframes pf{from{transform:translateY(0) scale(1);opacity:.3}to{transform:translateY(-30px) scale(1.5);opacity:.8}}';
  document.head.appendChild(s);
  for (let i = 0; i < 30; i++) {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;width:${2+Math.random()*3}px;height:${2+Math.random()*3}px;border-radius:50%;background:rgba(52,211,153,${(.2+Math.random()*.4).toFixed(2)});left:${(Math.random()*100).toFixed(1)}%;top:${(Math.random()*100).toFixed(1)}%;animation:pf ${(4+Math.random()*6).toFixed(1)}s ease-in-out ${(Math.random()*4).toFixed(1)}s infinite alternate`;
    helmParticles.appendChild(d);
  }
}

// ── SCROLL REVEAL ────────────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 80);
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
