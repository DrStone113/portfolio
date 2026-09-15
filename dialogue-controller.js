(() => {
  'use strict';

  class DialogueController {
    constructor(element, options = {}) {
      if (!element) throw new Error('DialogueController requires a dialogue element.');
      this.element = element;
      this.speaker = element.querySelector('[data-dialogue-speaker]');
      this.text = element.querySelector('[data-dialogue-text]');
      this.typingSpeed = options.typingSpeed || 24;
      this.generation = 0;
      this.timers = new Map();
      this.anchor = null;
      this.boundReposition = () => this.reposition();
      window.addEventListener('resize', this.boundReposition, { passive: true });
    }

    show({ speaker = 'THACH', text = '', anchor = this.anchor } = {}) {
      this.cancel();
      const token = this.generation;
      this.anchor = anchor;
      this.speaker.textContent = speaker;
      this.text.textContent = text;
      this.element.hidden = false;
      this.element.classList.add('is-visible');
      this.reposition();
      return token;
    }

    say(text, options = {}) {
      this.cancel();
      const token = this.generation;
      return this.typeAndHold(String(text), { ...options, token });
    }

    async sequence(messages, options = {}) {
      this.cancel();
      const token = this.generation;
      for (const message of messages) {
        if (token !== this.generation) return false;
        const entry = typeof message === 'string' ? { text: message } : message;
        const completed = await this.typeAndHold(entry.text, {
          ...options,
          ...entry,
          token
        });
        if (!completed) return false;
      }
      return token === this.generation;
    }

    async typeAndHold(value, options) {
      const token = options.token;
      this.anchor = options.anchor || this.anchor;
      this.speaker.textContent = options.speaker || 'THACH';
      this.text.textContent = '';
      this.element.hidden = false;
      this.element.classList.add('is-visible');
      this.reposition();

      const speed = options.instant ? 0 : (options.typingSpeed ?? this.typingSpeed);
      if (!speed) this.text.textContent = value;
      else {
        for (let index = 0; index < value.length; index += 1) {
          if (token !== this.generation) return false;
          this.text.textContent = value.slice(0, index + 1);
          if (index % 3 === 0) this.reposition();
          await this.delay(speed, token);
        }
      }

      this.reposition();
      const hold = options.duration ?? Math.max(680, Math.min(1250, value.length * 28));
      return this.delay(hold, token);
    }

    reposition() {
      if (this.element.hidden || !this.anchor) return;
      const anchorRect = typeof this.anchor === 'function'
        ? this.anchor()
        : this.anchor.getBoundingClientRect();
      if (!anchorRect) return;

      const bubbleRect = this.element.getBoundingClientRect();
      const margin = 14;
      const canFitAbove = anchorRect.top >= bubbleRect.height + margin + 8;
      const y = canFitAbove
        ? anchorRect.top - bubbleRect.height - margin
        : anchorRect.bottom + margin;
      const idealX = anchorRect.left + (anchorRect.width - bubbleRect.width) / 2;
      const x = Math.max(12, Math.min(window.innerWidth - bubbleRect.width - 12, idealX));
      this.element.dataset.placement = canFitAbove ? 'above' : 'below';
      this.element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    }

    hide() {
      this.cancel();
      this.element.classList.remove('is-visible');
      this.element.hidden = true;
    }

    cancel() {
      this.generation += 1;
      this.timers.forEach((resolve, timer) => {
        window.clearTimeout(timer);
        resolve(false);
      });
      this.timers.clear();
    }

    delay(duration, token) {
      if (!duration) return Promise.resolve(token === this.generation);
      return new Promise(resolve => {
        const timer = window.setTimeout(() => {
          this.timers.delete(timer);
          resolve(token === this.generation);
        }, duration);
        this.timers.set(timer, resolve);
      });
    }

    destroy() {
      this.hide();
      window.removeEventListener('resize', this.boundReposition);
    }
  }

  window.PortfolioDialogue = Object.freeze({ DialogueController });
})();
