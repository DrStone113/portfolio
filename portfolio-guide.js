(() => {
  'use strict';

  const characterElement = document.getElementById('portfolioCharacter');
  const dialogueElement = document.getElementById('portfolioDialogue');
  const hero = document.querySelector('.launch-level');
  const heroWorld = document.querySelector('.launch-world');
  const heroAnchor = document.getElementById('heroCharacterAnchor');
  const story = document.getElementById('pixel-story');
  const storyCheckpoint = document.getElementById('storyCheckpoint');
  const missions = document.getElementById('missions');
  const projectTargets = [...document.querySelectorAll('[data-guide-comment]')];
  const skills = document.getElementById('skills');
  const inventoryTerminal = document.getElementById('inventoryTerminal');
  const quest = document.getElementById('journey');
  const questTrack = document.getElementById('questTrack');
  const questMilestones = [...document.querySelectorAll('.quest-track article')];
  const contact = document.getElementById('contact');
  const contactAnchor = document.getElementById('contactCharacterAnchor');
  const startButton = document.getElementById('startAdventure');
  const skipButton = document.getElementById('skipIntro');
  const replayButton = document.getElementById('replayIntro');
  if (!characterElement || !dialogueElement || !hero || !heroWorld || !heroAnchor || !story || !storyCheckpoint || !missions || !skills || !inventoryTerminal || !quest || !questTrack || !contact || !contactAnchor) return;
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
  let storyNarrationStage = -1;
  let decorationToken = 0;
  let projectHoverTimer = 0;
  let activeProject = null;
  let narrationSuppressed = false;
  let skillsOpened = false;
  let contactAnnounced = false;
  let currentScene = 'hero';
  let lastScrollY = window.scrollY;
  let scrollDirection = 'right';
  let scrollStopTimer = 0;
  const startedBelowHero = window.scrollY > INTRO_SCROLL_CANCEL;

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
    currentScene = 'hero';
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
    currentScene = 'story';
    const position = storyPosition(storyProgress);
    character.setVisible(true).face(scrollDirection).placeAt(position.x, position.y, {
      state: reducedMotionQuery.matches ? 'idle' : storyState(storyProgress)
    });
    dialogue.reposition();
  }

  function missionPosition(target = activeProject || missions) {
    const size = guideSize();
    const rect = target.getBoundingClientRect();
    if (window.innerWidth <= 640) {
      return {
        x: 12,
        y: clamp(rect.top - size - 12, 70, window.innerHeight - size - 18)
      };
    }
    return {
      x: window.innerWidth - size - 14,
      y: clamp(rect.top + 26, 82, window.innerHeight - size - 20)
    };
  }

  function syncToMissions() {
    currentScene = 'missions';
    const position = missionPosition();
    character.setVisible(true).face('left').placeAt(position.x, position.y, { state: 'idle' });
    dialogue.reposition();
  }

  function skillsPosition() {
    const size = guideSize();
    const rect = inventoryTerminal.getBoundingClientRect();
    if (window.innerWidth <= 640) {
      return { x: 14, y: clamp(rect.top - size - 10, 68, window.innerHeight - size - 16) };
    }
    return {
      x: window.innerWidth - size - 16,
      y: clamp(rect.top - size + 8, 78, window.innerHeight - size - 18)
    };
  }

  function syncToSkills() {
    currentScene = 'skills';
    const position = skillsPosition();
    if (!skillsOpened) {
      skillsOpened = true;
      skills.classList.add('inventory-open');
      inventoryTerminal.classList.add('is-open');
      const status = inventoryTerminal.querySelector('i');
      if (status) status.textContent = 'OPEN';
      character.setVisible(true).face('right').placeAt(position.x - (reducedMotionQuery.matches ? 0 : 46), position.y, { state: 'walk' });
      character.moveTo(position.x, position.y, {
        duration: reducedMotionQuery.matches ? 0 : 360,
        state: 'walk',
        endState: 'idle'
      });
      return;
    }
    if (!character.motion) character.setVisible(true).face('left').placeAt(position.x, position.y, { state: 'idle' });
    dialogue.reposition();
  }

  function questProgress() {
    const rect = quest.getBoundingClientRect();
    return clamp((window.innerHeight * .7 - rect.top) / Math.max(rect.height + window.innerHeight * .25, 1));
  }

  function syncToQuest() {
    currentScene = 'quest';
    const size = guideSize();
    const progress = questProgress();
    const activeIndex = Math.min(questMilestones.length - 1, Math.floor(progress * questMilestones.length));
    questMilestones.forEach((milestone, index) => milestone.classList.toggle('is-active', index === activeIndex));
    let x;
    let y;
    if (window.innerWidth <= 980) {
      const activeRect = questMilestones[activeIndex].getBoundingClientRect();
      x = window.innerWidth <= 640 ? 8 : 20;
      y = clamp(activeRect.top + 8, 76, window.innerHeight - size - 18);
    } else {
      const trackRect = questTrack.getBoundingClientRect();
      x = lerp(trackRect.left + 8, trackRect.right - size - 8, progress);
      y = clamp(trackRect.top - size + 30, 78, window.innerHeight - size - 18);
    }
    character.setVisible(true).face(scrollDirection).placeAt(x, y, {
      state: reducedMotionQuery.matches ? 'idle' : 'walk'
    });
    window.clearTimeout(scrollStopTimer);
    scrollStopTimer = window.setTimeout(() => {
      if (currentScene === 'quest') character.setState('idle');
    }, 150);
    dialogue.reposition();
  }

  function contactPosition() {
    const size = guideSize();
    const rect = contactAnchor.getBoundingClientRect();
    return {
      x: clamp(rect.left, 12, window.innerWidth - size - 12),
      y: clamp(rect.top, 76, window.innerHeight - size - 18)
    };
  }

  function syncToContact() {
    currentScene = 'contact';
    const position = contactPosition();
    character.setVisible(true).face('right').placeAt(position.x, position.y, { state: 'sit' });
    dialogue.reposition();
    if (!contactAnnounced && contact.getBoundingClientRect().top < window.innerHeight * .5) {
      contactAnnounced = true;
      sayDecoration("I'm currently looking for opportunities\nto build useful things with good people.", { duration: 1500 });
    }
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
    const missionRect = missions.getBoundingClientRect();
    const skillsRect = skills.getBoundingClientRect();
    const questRect = quest.getBoundingClientRect();
    const contactRect = contact.getBoundingClientRect();
    if (heroRect.bottom > window.innerHeight * .62) syncToHero();
    else if (storyRect.top > 0) syncAcrossHeroGap();
    else if (storyRect.bottom > 0) syncToStory();
    else if (missionRect.top < window.innerHeight && missionRect.bottom > 68) syncToMissions();
    else if (skillsRect.top < window.innerHeight && skillsRect.bottom > 68) syncToSkills();
    else if (questRect.top < window.innerHeight && questRect.bottom > 68) syncToQuest();
    else if (contactRect.top < window.innerHeight && contactRect.bottom > 68) syncToContact();
    else character.setVisible(false);
  }

  function sayDecoration(text, options = {}) {
    const token = ++decorationToken;
    return dialogue.say(text, {
      anchor: characterRect,
      typingSpeed: options.typingSpeed ?? 20,
      duration: options.duration ?? 1050,
      instant: reducedMotionQuery.matches
    }).then(completed => {
      if (completed && token === decorationToken) dialogue.hide();
      return completed;
    });
  }

  function updateStoryNarration(progress) {
    if (narrationSuppressed || startedBelowHero) {
      storyCheckpoint.hidden = true;
      storyNarrationStage = 2;
      return;
    }
    if (progress < .1 && storyNarrationStage < 0) {
      storyNarrationStage = 0;
      storyCheckpoint.hidden = false;
      window.requestAnimationFrame(() => storyCheckpoint.classList.add('is-visible'));
      sayDecoration('Every project starts with a problem.', { duration: 850 });
    } else if (progress >= .14 && storyNarrationStage < 1) {
      storyNarrationStage = 1;
      storyCheckpoint.classList.remove('is-visible');
      storyCheckpoint.hidden = true;
      sayDecoration('Let me show you how I solved some of them.', { duration: 950 });
    } else if (progress > .34) {
      storyCheckpoint.classList.remove('is-visible');
      storyCheckpoint.hidden = true;
    }
  }

  function reactToProject(target) {
    activeProject = target;
    projectTargets.forEach(project => project.classList.toggle('is-guide-active', project === target));
    const destination = missionPosition(target);
    const targetRect = target.getBoundingClientRect();
    const currentCenter = character.position.x + guideSize() / 2;
    const direction = targetRect.left + targetRect.width / 2 < currentCenter ? 'left' : 'right';
    character.setVisible(true).face(direction);
    const shortX = clamp(destination.x + (direction === 'left' ? -18 : 18), 10, window.innerWidth - guideSize() - 10);
    character.moveTo(shortX, destination.y, {
      duration: reducedMotionQuery.matches ? 0 : 280,
      state: 'walk',
      endState: 'idle'
    }).then(completed => {
      if (completed && activeProject === target) {
        sayDecoration(target.dataset.guideComment, { duration: 1100 });
      }
    });
  }

  function scheduleProjectReaction(target) {
    window.clearTimeout(projectHoverTimer);
    projectHoverTimer = window.setTimeout(() => reactToProject(target), 140);
  }

  function clearProjectReaction(target) {
    window.clearTimeout(projectHoverTimer);
    projectHoverTimer = 0;
    if (target.contains(document.activeElement) || target.matches(':hover')) return;
    if (activeProject === target) activeProject = null;
    target.classList.remove('is-guide-active');
    decorationToken += 1;
    dialogue.hide();
    requestScrollSync();
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
    narrationSuppressed = true;
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
      const nextScrollY = window.scrollY;
      if (nextScrollY !== lastScrollY) scrollDirection = nextScrollY < lastScrollY ? 'left' : 'right';
      lastScrollY = nextScrollY;
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
      updateStoryNarration(storyProgress);
    }
  });
  projectTargets.forEach(target => {
    target.addEventListener('mouseenter', () => scheduleProjectReaction(target));
    target.addEventListener('mouseleave', () => clearProjectReaction(target));
    target.addEventListener('focusin', () => scheduleProjectReaction(target));
    target.addEventListener('focusout', () => window.setTimeout(() => clearProjectReaction(target), 0));
  });
  reducedMotionQuery.addEventListener?.('change', event => {
    character.setReducedMotion(event.matches);
    if (event.matches && introRunning) completeIntro({ remember: true, sync: true });
    else requestScrollSync();
  });

  if (startedBelowHero || sessionHasSeenIntro() || reducedMotionQuery.matches) {
    completeIntro({ remember: startedBelowHero || sessionHasSeenIntro(), sync: true });
    if (reducedMotionQuery.matches && !startedBelowHero) {
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
    window.clearTimeout(projectHoverTimer);
    window.clearTimeout(scrollStopTimer);
    if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
  }, { once: true });
})();
