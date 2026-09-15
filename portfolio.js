(() => {
  const story = document.getElementById('pixel-story');
  const canvas = document.getElementById('pixelStoryCanvas');
  if (!story || !canvas) return;

  document.documentElement.classList.add('js-scroll');
  const ctx = canvas.getContext('2d');
  const percentage = document.getElementById('storyPercentage');
  const meter = document.getElementById('storyMeter');
  const phase = document.getElementById('storyPhase');
  const description = document.getElementById('storyDescription');
  const caption = document.getElementById('storyCaption');
  const steps = [...story.querySelectorAll('.story-steps span')];
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  const imageRoot = 'assets/images/';
  const assets = {
    background: 'Background/Blue.png',
    terrain: 'Terrain/Terrain (16x16).png',
    runner: 'Main Characters/Pink Man/Run (32x32).png',
    apple: 'Items/Fruits/Apple.png',
    cherries: 'Items/Fruits/Cherries.png'
  };
  const images = {};
  let progress = 0;
  let width = 1;
  let height = 1;
  let raf = 0;

  const phases = [
    { label: 'STARTING LINE', description: 'Scroll down to move through a playable slice of Pixel Adventure. The character, world and checkpoints react directly to your scroll position.', caption: 'Pink Man is waiting at the starting platform.' },
    { label: 'COLLECTING', description: 'The world shifts with every pixel of your scroll. Collectibles and terrain form a small, interactive story instead of a static project card.', caption: 'Checkpoint reached — keep scrolling to collect the next fruit.' },
    { label: 'SHIPPING', description: 'The final stretch represents the shipped game: playable characters, enemies, achievements and a connected leaderboard built with Flutter and Flame.', caption: 'Level complete. Pixel Adventure is ready to play.' }
  ];

  function assetUrl(path) {
    return imageRoot + path.split('/').map(encodeURIComponent).join('/');
  }
  function load(key, path) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => { images[key] = image; resolve(); };
      image.onerror = () => resolve();
      image.src = assetUrl(path);
    });
  }
  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }
  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(width * dpr());
    canvas.height = Math.round(height * dpr());
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    ctx.imageSmoothingEnabled = false;
    render();
  }
  function drawImageTile(image, sourceX, sourceY, sourceWidth, sourceHeight, targetX, targetY, targetWidth, targetHeight) {
    if (!image) return;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, targetX, targetY, targetWidth, targetHeight);
  }
  function drawTerrainTile(id, x, y, scale, sourceHeight = 16) {
    const terrain = images.terrain;
    if (!terrain) {
      ctx.fillStyle = id < 20 ? '#5b9159' : '#7fc878';
      ctx.fillRect(x, y, 16 * scale, sourceHeight * scale);
      return;
    }
    const index = id - 1;
    drawImageTile(terrain, (index % 22) * 16, Math.floor(index / 22) * 16, 16, sourceHeight, x, y, 16 * scale, sourceHeight * scale);
  }
  function drawPlatform(startX, y, columns, scale, top = false) {
    const sourceHeight = top ? 5 : 16;
    for (let index = 0; index < columns; index += 1) {
      const first = index === 0;
      const last = index === columns - 1;
      const tile = top ? (first ? 40 : last ? 42 : 41) : (first ? 7 : last ? 9 : 8);
      drawTerrainTile(tile, startX + index * 16 * scale, y, scale, sourceHeight);
    }
  }
  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#5eadd9');
    sky.addColorStop(.58, '#bde0e4');
    sky.addColorStop(.59, '#a1d385');
    sky.addColorStop(1, '#487a54');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const tile = images.background;
    const size = Math.max(52, Math.round(width / 24));
    const backgroundOffset = -((progress * width * .28) % size);
    ctx.globalAlpha = .34;
    if (tile) {
      for (let x = backgroundOffset - size; x < width + size; x += size) {
        for (let y = 0; y < height * .77; y += size) drawImageTile(tile, 0, 0, tile.width, tile.height, x, y, size + 1, size + 1);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.13)';
      for (let x = backgroundOffset; x < width; x += size * 2) ctx.fillRect(x, height * .24, size, height * .22);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(50,108,91,.28)';
    ctx.beginPath();
    ctx.moveTo(0, height * .7);
    for (let x = -90; x <= width + 90; x += 90) ctx.quadraticCurveTo(x + 44, height * (.55 + ((x / 90) % 2 ? .07 : .02)), x + 90, height * .7);
    ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
  }
  function drawFruit(image, x, y, frame, scale) {
    if (!image) return;
    drawImageTile(image, frame * 32, 0, 32, 32, x, y, 32 * scale, 32 * scale);
  }
  function drawWorld() {
    const scale = Math.max(2.35, Math.min(4.4, width / 380));
    const groundY = Math.round(height * .76);
    drawPlatform(-12, groundY, Math.ceil(width / (16 * scale)) + 2, scale);
    const scrollX = -(progress * width * .12);
    drawPlatform(width * .58 + scrollX, height * .60, 8, scale, true);
    drawPlatform(width * .79 + scrollX, height * .48, 6, scale, true);
    const fruitFrame = Math.floor(progress * 102) % 17;
    drawFruit(images.apple, width * .66 + scrollX, height * .49, fruitFrame, scale * .7);
    drawFruit(images.cherries, width * .87 + scrollX, height * .37, (fruitFrame + 6) % 17, scale * .7);
    drawFruit(images.apple, width * .93 + scrollX, groundY - 72, (fruitFrame + 10) % 17, scale * .62);

    const runner = images.runner;
    const startX = Math.max(width * .50, width - 530);
    const characterX = startX + (width - startX - 98) * progress;
    const jump = Math.sin(clamp((progress - .24) / .48) * Math.PI) * height * .19;
    const characterY = groundY - 100 - jump;
    ctx.fillStyle = 'rgba(15,45,45,.26)';
    ctx.beginPath(); ctx.ellipse(characterX + 46, groundY + 9, 37, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (runner) {
      const frame = Math.floor(progress * 144) % 12;
      drawImageTile(runner, frame * 32, 0, 32, 32, characterX, characterY, 96, 96);
    } else {
      ctx.fillStyle = '#f29cb5'; ctx.fillRect(characterX + 24, characterY + 21, 45, 58);
      ctx.fillStyle = '#fff1f0'; ctx.fillRect(characterX + 32, characterY + 8, 28, 24);
    }
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '10px "DM Mono", monospace';
    ctx.fillText('PINK MAN', characterX + 5, characterY - 11);
  }
  function render() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawWorld();
  }
  function updateStory() {
    const rect = story.getBoundingClientRect();
    const travel = Math.max(story.offsetHeight - window.innerHeight, 1);
    progress = clamp(-rect.top / travel);
    const stage = progress < .34 ? 0 : progress < .68 ? 1 : 2;
    const data = phases[stage];
    percentage.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')}%`;
    meter.style.transform = `scaleX(${progress})`;
    phase.textContent = data.label;
    description.textContent = data.description;
    caption.textContent = data.caption;
    steps.forEach((step, index) => step.classList.toggle('is-active', index === stage));
    render();
  }
  function requestUpdate() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; updateStory(); });
  }

  Promise.all(Object.entries(assets).map(([key, path]) => load(key, path))).then(() => { resize(); updateStory(); });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', requestUpdate, { passive: true });
  updateStory();

  const revealElements = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    revealElements.forEach(element => observer.observe(element));
  } else revealElements.forEach(element => element.classList.add('is-revealed'));
})();
