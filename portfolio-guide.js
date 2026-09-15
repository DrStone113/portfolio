(() => {
  'use strict';

  const characterElement = document.getElementById('portfolioCharacter');
  const dialogueElement = document.getElementById('portfolioDialogue');
  const hero = document.querySelector('.launch-level');
  const heroWorld = document.querySelector('.launch-world');
  const heroAnchor = document.getElementById('heroCharacterAnchor');
  const story = document.getElementById('pixel-story');
  const startButton = document.getElementById('startAdventure');
  const skipButton = document.getElementById('skipIntro');
  const replayButton = document.getElementById('replayIntro');
  if (!characterElement || !dialogueElement || !hero || !heroWorld || !heroAnchor || !story) return;
  if (!window.PortfolioCharacter || !window.PortfolioDialogue) return;

  const { CharacterController, MOTION } = window.PortfolioCharacter;
  const { DialogueController } = window.PortfolioDialogue;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const character = new CharacterController(characterElement, {
    reducedMotion: reducedMotionQuery.matches
  });
  const dialogue = new DialogueController(dialogueElement, {
    typingSpeed: MOTION.dialogueTypingSpeed
  });
  document.documentElement.classList.add('persistent-guide-active');

  const SESSION_KEY = 'portfolioIntroSeen';
  const INTRO_SCROLL_CANCEL = 96;
  const introTimers = new Map();
  let introToken = 0;
  let introRunning = false;
  let scrollRaf = 0;
  let storyProgress = 0;

  const messages = [
    { text: 'Hey!', duration: 300 },
    { text: "I'm Khang.", duration: 380 },
    { text: 'Final-year IT student\nat Can Tho University.', duration: 560 },
    { text: 'I build full-stack,\nreal-time & mobile systems.', duration: 600 },
    { text: "Want to see what I've built?", duration: 650 }
  ];

  function sessionHasSeenIntro() {
    try { return window.sessionStorage.getItem(SESSION_KEY) === 'true'; }
    catch { return false; }
  }

  function rememberIntro() {
    try { window.sessionStorage.setItem(SESSION_KEY, 'true'); }
    catch { /* Storage can be unavailable in privacy modes. */ }
  }

  function anchorPosition() {
    const rect = heroAnchor.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }

  function characterRect() {
    return characterElement.getBoundingClientRect();
  }

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function guideSize() {
    return window.innerWidth <= 640 ? 72 : 96;
  }

  function delay(duration, token) {
    return new Promise(resolve => {
      const timer = window.setTimeout(() => {
        introTimers.delete(timer);
        resolve(token === introToken);
      }, duration);
      introTimers.set(timer, resolve);
    });
  }

  function cancelIntroTimers() {
    introTimers.forEach((resolve, timer) => {
      window.clearTimeout(timer);
      resolve(false);
    });
    introTimers.clear();
  }

  function syncToHero() {
    const heroRect = hero.getBoundingClientRect();
    const anchor = anchorPosition();
    const visible = heroRect.bottom > 68 && anchor.y > -100 && anchor.y < window.innerHeight;
    character.setVisible(visible);
    if (visible) character.placeAt(anchor.x, anchor.y, { state: 'idle' });
  }

  function storyPosition(progress) {
    const size = guideSize();
    const startX = Math.max(window.innerWidth * .5, window.innerWidth - 530);
    const endX = window.innerWidth - size - 16;
    const groundY = Math.round(window.innerHeight * .76);
    const jump = Math.sin(clamp((progress - .24) / .48) * Math.PI) * window.innerHeight * .19;
    return {
      x: lerp(startX, endX, progress),
      y: groundY - size - jump
    };
  }

  function storyState(progress) {
    if (progress < .04) return 'idle';
    if (progress < .24) return 'run';
    if (progress < .48) return 'jump';
    if (progress < .72) return 'fall';
    return progress > .97 ? 'idle' : 'run';
  }

  function syncToStory() {
    const position = storyPosition(storyProgress);
    character.setVisible(true).face('right').placeAt(position.x, position.y, {
      state: reducedMotionQuery.matches ? 'idle' : storyState(storyProgress)
    });
  }

  function syncAcrossHeroGap() {
    if (reducedMotionQuery.matches) {
      character.setVisible(false);
      return;
    }
    const heroBottom = hero.getBoundingClientRect().bottom;
    const storyTop = story.getBoundingClientRect().top;
    const travelRange = Math.max(storyTop - heroBottom, 1);
    const amount = clamp((-heroBottom + window.innerHeight * .62) / (travelRange + window.innerHeight * .48));
    const size = guideSize();
    const start = anchorPosition();
    const destination = storyPosition(0);
    const runEnd = .24;
    const startY = window.innerHeight * .62 + (start.y - heroBottom);
    let x;
    let y;
    let state;

    if (amount < runEnd) {
      const runProgress = amount / runEnd;
      x = lerp(start.x, Math.min(window.innerWidth - size - 24, start.x + 150), runProgress);
      y = startY;
      state = 'run';
    } else {
      const jumpProgress = (amount - runEnd) / (1 - runEnd);
      const edgeX = Math.min(window.innerWidth - size - 24, start.x + 150);
      x = lerp(edgeX, destination.x, jumpProgress);
      y = lerp(startY, destination.y, jumpProgress)
        - Math.sin(jumpProgress * Math.PI) * Math.min(110, window.innerHeight * .14);
      state = jumpProgress < .52 ? 'jump' : 'fall';
    }

    character.setVisible(true).face('right').placeAt(x, y, { state });
  }

  function syncCharacterToScroll() {
    const heroRect = hero.getBoundingClientRect();
    const storyRect = story.getBoundingClientRect();
    if (heroRect.bottom > window.innerHeight * .62) syncToHero();
    else if (storyRect.top > 0) syncAcrossHeroGap();
    else if (storyRect.bottom > 0) syncToStory();
    else character.setVisible(false);
  }

  function cancelIntro({ remember = true } = {}) {
    introToken += 1;
    introRunning = false;
    cancelIntroTimers();
    character.cancelMotion();
    dialogue.hide();
    if (remember) rememberIntro();
  }

  function completeIntro({ remember = true, sync = true } = {}) {
    cancelIntro({ remember });
    character.setState('idle');
    startButton.classList.add('is-emphasized');
    skipButton.textContent = 'Show projects ↓';
    skipButton.setAttribute('aria-label', 'Show portfolio projects');
    replayButton.hidden = reducedMotionQuery.matches;
    document.documentElement.classList.add('intro-complete');
    if (sync) syncCharacterToScroll();
  }

  async function runIntro() {
    cancelIntro({ remember: false });
    const token = introToken;
    introRunning = true;
    document.documentElement.classList.remove('intro-complete');
    startButton.classList.remove('is-emphasized');
    skipButton.innerHTML = 'Skip intro / Show projects <b>↘</b>';
    skipButton.setAttribute('aria-label', 'Skip introduction and show projects');
    replayButton.hidden = true;

    const target = anchorPosition();
    const worldRect = heroWorld.getBoundingClientRect();
    const startX = Math.max(-110, worldRect.left - 120);
    character.setVisible(true).placeAt(startX, target.y, { state: 'run' });
    if (!await delay(480, token)) return;
    if (!await character.moveTo(target.x, target.y, {
      duration: MOTION.runDuration,
      state: 'run',
      endState: 'idle',
      easing: 'cubic-bezier(.18,.72,.2,1)'
    })) return;
    await character.land();
    if (token !== introToken || !await delay(260, token)) return;
    character.face('left').setState('talk');
    if (!await delay(260, token)) return;

    const completed = await dialogue.sequence(messages, {
      anchor: characterRect,
      typingSpeed: 20
    });
    if (!completed || token !== introToken) return;
    completeIntro({ remember: true, sync: true });
  }

  function showProjects() {
    completeIntro({ remember: true, sync: true });
    document.getElementById('missions')?.scrollIntoView({
      behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  function requestScrollSync() {
    if (scrollRaf) return;
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0;
      if (introRunning && window.scrollY > INTRO_SCROLL_CANCEL) {
        completeIntro({ remember: true, sync: true });
        return;
      }
      if (!introRunning) syncCharacterToScroll();
      else dialogue.reposition();
    });
  }

  function replayIntro() {
    window.scrollTo({ top: 0, behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' });
    window.setTimeout(() => {
      if (reducedMotionQuery.matches) {
        completeIntro({ remember: false, sync: true });
        dialogue.say("I'm Khang — I build full-stack, real-time & mobile systems.", {
          anchor: characterRect,
          instant: true,
          duration: 1400
        }).then(() => dialogue.hide());
      } else runIntro();
    }, reducedMotionQuery.matches ? 0 : 480);
  }

  skipButton.addEventListener('click', showProjects);
  startButton.addEventListener('click', () => completeIntro({ remember: true, sync: true }));
  replayButton.addEventListener('click', replayIntro);
  window.addEventListener('scroll', requestScrollSync, { passive: true });
  window.addEventListener('resize', requestScrollSync, { passive: true });
  window.addEventListener('pageshow', requestScrollSync);
  window.addEventListener('portfolio:storyprogress', event => {
    storyProgress = clamp(event.detail?.progress || 0);
    if (!introRunning && story.getBoundingClientRect().top <= 0 && story.getBoundingClientRect().bottom > 0) {
      syncToStory();
    }
  });
  reducedMotionQuery.addEventListener?.('change', event => {
    character.setReducedMotion(event.matches);
    if (event.matches && introRunning) completeIntro({ remember: true, sync: true });
    else requestScrollSync();
  });

  const startsBelowHero = window.scrollY > INTRO_SCROLL_CANCEL;
  if (startsBelowHero || sessionHasSeenIntro() || reducedMotionQuery.matches) {
    completeIntro({ remember: startsBelowHero || sessionHasSeenIntro(), sync: true });
    if (reducedMotionQuery.matches && !startsBelowHero) {
      dialogue.say("I'm Khang — I build full-stack, real-time & mobile systems.", {
        anchor: characterRect,
        instant: true,
        duration: 1400
      }).then(() => dialogue.hide());
    }
  } else runIntro();

  window.addEventListener('pagehide', () => {
    cancelIntro({ remember: false });
    dialogue.destroy();
    character.destroy();
    if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
  }, { once: true });
})();
