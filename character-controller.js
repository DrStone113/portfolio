(() => {
  'use strict';

  const MOTION = Object.freeze({
    runDuration: 760,
    walkDuration: 1100,
    jumpDuration: 620,
    landingDuration: 260,
    dialogueTypingSpeed: 24,
    sectionTransitionDuration: 720
  });

  const SPRITES = Object.freeze({
    idle: { file: 'Idle (32x32).png', frames: 11, duration: 1100 },
    run: { file: 'Run (32x32).png', frames: 12, duration: 620 },
    walk: { file: 'Run (32x32).png', frames: 12, duration: 960 },
    jump: { file: 'Jump (32x32).png', frames: 1, duration: 1 },
    fall: { file: 'Fall (32x32).png', frames: 1, duration: 1 },
    land: { file: 'Idle (32x32).png', frames: 11, duration: 1100 },
    talk: { file: 'Idle (32x32).png', frames: 11, duration: 1250 },
    sit: { file: 'Idle (32x32).png', frames: 11, duration: 1500 },
    look_left: { file: 'Idle (32x32).png', frames: 11, duration: 1250 },
    look_right: { file: 'Idle (32x32).png', frames: 11, duration: 1250 }
  });

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  class CharacterController {
    constructor(element, options = {}) {
      if (!element) throw new Error('CharacterController requires a character element.');
      this.element = element;
      this.sprite = element.querySelector('.pixel-guide__sprite') || element;
      this.dust = element.querySelector('.pixel-guide__dust');
      this.assetRoot = options.assetRoot || 'assets/images/Main Characters/Virtual Guy/';
      this.position = { x: 0, y: 0 };
      this.state = 'idle';
      this.facing = 'right';
      this.motion = null;
      this.motionToken = 0;
      this.landingTimer = null;
      this.landingResolve = null;
      this.reducedMotion = Boolean(options.reducedMotion);
      this.setState('idle');
      this.face('right');
    }

    setReducedMotion(value) {
      this.reducedMotion = Boolean(value);
      if (this.reducedMotion) this.cancelMotion();
    }

    setState(nextState) {
      const normalized = String(nextState || 'idle').toLowerCase();
      const sprite = SPRITES[normalized];
      if (!sprite) throw new Error(`Unknown character state: ${nextState}`);
      this.state = normalized;
      this.element.dataset.state = normalized;
      this.sprite.style.setProperty('--sprite-image', `url("${this.assetRoot}${sprite.file}")`);
      this.sprite.style.setProperty('--sprite-frames', sprite.frames);
      this.sprite.style.setProperty('--sprite-duration', `${sprite.duration}ms`);
      if (normalized === 'look_left') this.face('left');
      if (normalized === 'look_right') this.face('right');
      return this;
    }

    face(direction) {
      this.facing = direction === 'left' ? 'left' : 'right';
      this.element.dataset.facing = this.facing;
      return this;
    }

    setVisible(visible) {
      this.element.hidden = !visible;
      this.element.setAttribute('aria-hidden', 'true');
      return this;
    }

    placeAt(x, y, options = {}) {
      this.cancelMotion();
      this.position = { x: Math.round(x), y: Math.round(y) };
      this.element.style.transform = this.transformFor(this.position.x, this.position.y);
      if (options.state) this.setState(options.state);
      return this;
    }

    moveTo(x, y, options = {}) {
      const target = { x: Math.round(x), y: Math.round(y) };
      const start = { ...this.position };
      const duration = this.reducedMotion ? 0 : (options.duration ?? MOTION.runDuration);
      const movingState = options.state || 'run';
      const endState = options.endState || 'idle';
      this.cancelMotion();
      const token = this.motionToken;

      if (target.x !== start.x) this.face(target.x > start.x ? 'right' : 'left');
      this.setState(movingState);

      if (!duration || typeof this.element.animate !== 'function') {
        this.position = target;
        this.element.style.transform = this.transformFor(target.x, target.y);
        this.setState(endState);
        return Promise.resolve(true);
      }

      const animation = this.element.animate([
        { transform: this.transformFor(start.x, start.y) },
        { transform: this.transformFor(target.x, target.y) }
      ], {
        duration,
        easing: options.easing || 'cubic-bezier(.2,.72,.22,1)',
        fill: 'forwards'
      });
      this.motion = animation;

      return animation.finished.then(() => {
        if (token !== this.motionToken) return false;
        this.position = target;
        this.element.style.transform = this.transformFor(target.x, target.y);
        animation.cancel();
        this.motion = null;
        this.setState(endState);
        return true;
      }).catch(() => false);
    }

    jumpTo(x, y, options = {}) {
      const target = { x: Math.round(x), y: Math.round(y) };
      const start = { ...this.position };
      const height = options.height ?? 86;
      const duration = this.reducedMotion ? 0 : (options.duration ?? MOTION.jumpDuration);
      this.cancelMotion();
      const token = this.motionToken;
      if (target.x !== start.x) this.face(target.x > start.x ? 'right' : 'left');
      this.setState('jump');

      if (!duration || typeof this.element.animate !== 'function') {
        this.position = target;
        this.element.style.transform = this.transformFor(target.x, target.y);
        this.setState(options.endState || 'idle');
        return Promise.resolve(true);
      }

      const animation = this.element.animate([
        { transform: this.transformFor(start.x, start.y), offset: 0 },
        { transform: this.transformFor((start.x + target.x) / 2, Math.min(start.y, target.y) - height), offset: .5 },
        { transform: this.transformFor(target.x, target.y), offset: 1 }
      ], { duration, easing: 'cubic-bezier(.36,.05,.2,1)', fill: 'forwards' });
      this.motion = animation;

      return animation.finished.then(async () => {
        if (token !== this.motionToken) return false;
        this.position = target;
        this.element.style.transform = this.transformFor(target.x, target.y);
        animation.cancel();
        this.motion = null;
        await this.land();
        if (token === this.motionToken) this.setState(options.endState || 'idle');
        return token === this.motionToken;
      }).catch(() => false);
    }

    land() {
      this.cancelLanding();
      this.setState('land');
      this.element.classList.remove('is-landing');
      void this.element.offsetWidth;
      this.element.classList.add('is-landing');
      if (this.dust) {
        this.dust.classList.remove('is-visible');
        void this.dust.offsetWidth;
        this.dust.classList.add('is-visible');
      }
      if (this.reducedMotion) return Promise.resolve();
      return new Promise(resolve => {
        this.landingResolve = resolve;
        this.landingTimer = window.setTimeout(() => {
          this.element.classList.remove('is-landing');
          if (this.dust) this.dust.classList.remove('is-visible');
          this.landingTimer = null;
          this.landingResolve = null;
          resolve();
        }, MOTION.landingDuration);
      });
    }

    cancelMotion() {
      this.motionToken += 1;
      if (this.motion) this.motion.cancel();
      this.motion = null;
      this.cancelLanding();
    }

    cancelLanding() {
      if (this.landingTimer) window.clearTimeout(this.landingTimer);
      this.landingTimer = null;
      this.element.classList.remove('is-landing');
      if (this.dust) this.dust.classList.remove('is-visible');
      if (this.landingResolve) this.landingResolve();
      this.landingResolve = null;
    }

    destroy() {
      this.cancelMotion();
      this.element.classList.remove('is-landing');
    }

    transformFor(x, y) {
      const safeX = clamp(Math.round(x), -200, window.innerWidth + 200);
      const safeY = clamp(Math.round(y), -200, window.innerHeight + 200);
      return `translate3d(${safeX}px, ${safeY}px, 0)`;
    }
  }

  window.PortfolioCharacter = Object.freeze({ CharacterController, MOTION, SPRITES });
})();
