/**
 * Polyfills :focus-visible for non supporting browsers (Safari < 15.4).
 */
function focusVisiblePolyfill() {
  const navKeys = ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space', 'Escape', 'Home', 'End', 'PageUp', 'PageDown'];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (evt) => {
    if (navKeys.includes(evt.code)) mouseClick = false;
  });

  window.addEventListener('mousedown', () => {
    mouseClick = true;
  });

  window.addEventListener('focus', () => {
    if (currentFocusedElement) currentFocusedElement.classList.remove('is-focused');
    if (mouseClick) return;

    currentFocusedElement = document.activeElement;
    currentFocusedElement.classList.add('is-focused');
  }, true);
}

// Add polyfill if :focus-visible is not supported.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

/**
 * Creates a 'mediaMatches' object from the media queries specified in the theme,
 * and adds listeners for each media query. If a breakpoint is crossed, the mediaMatches
 * values are updated and a 'on:breakpoint-change' event is dispatched.
 */
(() => {
  const { mediaQueries } = theme;
  if (!mediaQueries) return;

  const mqKeys = Object.keys(mediaQueries);
  const mqLists = {};
  theme.mediaMatches = {};

  /**
   * Handles a media query (breakpoint) change.
   */
  const handleMqChange = () => {
    const newMatches = mqKeys.reduce((acc, media) => {
      acc[media] = !!(mqLists[media] && mqLists[media].matches);
      return acc;
    }, {});

    // Update mediaMatches values after breakpoint change.
    Object.keys(newMatches).forEach((key) => {
      theme.mediaMatches[key] = newMatches[key];
    });

    window.dispatchEvent(new CustomEvent('on:breakpoint-change'));
  };

  mqKeys.forEach((mq) => {
    // Create mqList object for each media query.
    mqLists[mq] = window.matchMedia(mediaQueries[mq]);

    // Get initial matches for each query.
    theme.mediaMatches[mq] = mqLists[mq].matches;

    // Add an event listener to each query.
    try {
      mqLists[mq].addEventListener('change', handleMqChange);
    } catch (err1) {
      // Fallback for legacy browsers (Safari < 14).
      mqLists[mq].addListener(handleMqChange);
    }
  });
})();

/**
 * Returns a function that as long as it continues to be invoked, won't be triggered.
 * @param {Function} fn - Callback function.
 * @param {number} [wait=300] - Delay (in milliseconds).
 * @returns {Function}
 */
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Sets a 'header-height' custom property on the root element.
 */
function setHeaderHeight() {
  const header = document.querySelector('.js-header-height');
  if (!header) return;
  let height = header.offsetHeight;

  // Add announcement bar height (if shown).
  const announcement = document.querySelector('.cc-announcement');
  const announcementHeight = announcement ? announcement.offsetHeight : 0;
  height += announcementHeight;

  document.documentElement.style.setProperty('--announcement-height', `${announcementHeight}px`);
  document.documentElement.style.setProperty('--header-height', `${height}px`);
}

/**
 * Sets a 'scrollbar-width' custom property on the root element.
 */
function setScrollbarWidth() {
  document.documentElement.style.setProperty(
    '--scrollbar-width',
    `${window.innerWidth - document.documentElement.clientWidth}px`
  );
}

/**
 * Sets the dimension variables.
 */
function setDimensionVariables() {
  setHeaderHeight();
  setScrollbarWidth();
}

// Set the dimension variables once the DOM is loaded
document.addEventListener('DOMContentLoaded', setDimensionVariables);

// Update the dimension variables if viewport resized.
window.addEventListener('resize', debounce(setDimensionVariables, 400));

/**
 * Adds an observer to initialise a script when an element is scrolled into view.
 * @param {Element} element - Element to observe.
 * @param {Function} callback - Function to call when element is scrolled into view.
 * @param {number} [threshold=500] - Distance from viewport (in pixels) to trigger init.
 */
function initLazyScript(element, callback, threshold = 500) {
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (typeof callback === 'function') {
            callback();
            observer.unobserve(entry.target);
          }
        }
      });
    }, { rootMargin: `0px 0px ${threshold}px 0px` });

    io.observe(element);
  } else {
    callback();
  }
}

/**
 * Pauses all media (videos/models) within an element.
 * @param {Element} [el=document] - Element to pause media within.
 */
function pauseAllMedia(el = document) {
  el.querySelectorAll('.js-youtube, .js-vimeo, video').forEach((video) => {
    const component = video.closest('video-component');
    if (component && component.dataset.background === 'true') return;

    if (video.matches('.js-youtube')) {
      video.contentWindow.postMessage('{ "event": "command", "func": "pauseVideo", "args": "" }', '*');
    } else if (video.matches('.js-vimeo')) {
      video.contentWindow.postMessage('{ "method": "pause" }', '*');
    } else {
      video.pause();
    }
  });

  el.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

class DeferredMedia extends HTMLElement {
  constructor() {
    super();

    const loadBtn = this.querySelector('.js-load-media');
    if (loadBtn) {
      loadBtn.addEventListener('click', this.loadContent.bind(this));
    } else {
      this.addObserver();
    }
  }

  /**
   * Adds an Intersection Observer to load the content when viewport scroll is near
   */
  addObserver() {
    if ('IntersectionObserver' in window === false) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadContent(false, false, 'observer');
          observer.unobserve(this);
        }
      });
    }, { rootMargin: '0px 0px 1000px 0px' });

    observer.observe(this);
  }

  /**
   * Loads the deferred media.
   * @param {boolean} [focus=true] - Focus the deferred media element after loading.
   * @param {boolean} [pause=true] - Whether to pause all media after loading.
   * @param {string} [loadTrigger='click'] - The action that caused the deferred content to load.
   */
  loadContent(focus = true, pause = true, loadTrigger = 'click') {
    if (pause) pauseAllMedia();
    if (this.getAttribute('loaded') !== null) return;

    this.loadTrigger = loadTrigger;
    const content = this.querySelector('template').content.firstElementChild.cloneNode(true);
    this.appendChild(content);
    this.setAttribute('loaded', '');

    const deferredEl = this.querySelector('video, model-viewer, iframe');
    if (deferredEl && focus) deferredEl.focus();
  }
}

customElements.define('deferred-media', DeferredMedia);

class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.disclosure = this.querySelector('details');
    this.toggle = this.querySelector('summary');
    this.panel = this.toggle.nextElementSibling;
    this.init();
  }

  init() {
    // Check if the content element has a CSS transition.
    if (window.getComputedStyle(this.panel).transitionDuration !== '0s') {
      this.toggle.addEventListener('click', this.handleToggle.bind(this));
      this.disclosure.addEventListener('transitionend', this.handleTransitionEnd.bind(this));
    }
  }

  /**
   * Handles 'click' events on the summary element.
   * @param {object} evt - Event object.
   */
  handleToggle(evt) {
    evt.preventDefault();

    if (!this.disclosure.open) {
      this.open();
    } else {
      this.close();
    }
  }

  /**
   * Handles 'transitionend' events on the details element.
   * @param {object} evt - Event object.
   */
  handleTransitionEnd(evt) {
    if (evt.target !== this.panel) return;

    if (this.disclosure.classList.contains('is-closing')) {
      this.disclosure.classList.remove('is-closing');
      this.disclosure.open = false;
    }

    this.panel.removeAttribute('style');
  }

  /**
   * Adds inline 'height' style to the content element, to trigger open transition.
   */
  addContentHeight() {
    this.panel.style.height = `${this.panel.scrollHeight}px`;
  }

  /**
   * Opens the details element.
   */
  open() {
    // Set content 'height' to zero before opening the details element.
    this.panel.style.height = '0';

    // Open the details element
    this.disclosure.open = true;

    // Set content 'height' to its scroll height, to enable CSS transition.
    this.addContentHeight();
  }

  /**
   * Closes the details element.
   */
  close() {
    // Set content height to its scroll height, to enable transition to zero.
    this.addContentHeight();

    // Add class to enable styling of content or toggle icon before or during close transition.
    this.disclosure.classList.add('is-closing');

    // Set content height to zero to trigger the transition.
    // Slight delay required to allow scroll height to be applied before changing to '0'.
    setTimeout(() => {
      this.panel.style.height = '0';
    });
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

/**
 * Provides convenient utility functions for interacting with elements
 */
(() => {
  theme.elementUtil = {};

  /**
   * Allows for removal of elements in one line of code
   * @param {object} elem - Element to remove
   */
  theme.elementUtil.remove = (elem) => {
    if (elem) {
      if (typeof elem.remove === 'function') {
        elem.remove();
      } else {
        elem.forEach((thisElem) => {
          thisElem.remove();
        });
      }
    }
  };

  /**
   * Checks if the passed element is in viewport or not
   * @param {object} elem - Element to check the view of
   * @returns {boolean}
   */
  theme.elementUtil.isInViewport = (elem) => {
    const rect = elem.getBoundingClientRect();
    return (
      Math.round(rect.top) >= 0
      && Math.round(rect.left) >= 0
      && Math.round(rect.bottom) <= (window.innerHeight || document.documentElement.clientHeight)
      && Math.round(rect.right) <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };
})();

window.addEventListener(
  'resize',
  debounce(() => {
    window.dispatchEvent(new CustomEvent('on:debounced-resize'));
  })
);

const trapFocusHandlers = {};

/**
 * Removes focus trap event listeners and optionally focuses an element.
 * @param {Element} [elementToFocus=null] - Element to focus when trap is removed.
 */
function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

/**
 * Traps focus within a container, e.g. modal or side drawer.
 * @param {Element} container - Container element to trap focus within.
 * @param {Element} [elementToFocus=container] - Initial element to focus when trap is applied.
 */
function trapFocus(container, elementToFocus = container) {
  const focusableEls = Array.from(
    container.querySelectorAll('summary, a[href], area[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), object, iframe, audio[controls], video[controls], [tabindex]:not([tabindex^="-"])')
  );

  const firstEl = focusableEls[0];
  const lastEl = focusableEls[focusableEls.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (evt) => {
    if (evt.target !== container && evt.target !== lastEl && evt.target !== firstEl) return;
    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = () => {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = (evt) => {
    if (evt.code !== 'Tab') return;

    // If tab pressed on last focusable element, focus the first element.
    if (evt.target === lastEl && !evt.shiftKey) {
      evt.preventDefault();
      firstEl.focus();
    }

    //  If shift + tab pressed on the first focusable element, focus the last element.
    if ((evt.target === container || evt.target === firstEl) && evt.shiftKey) {
      evt.preventDefault();
      lastEl.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  (elementToFocus || container).focus();
}

class Modal extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.handleClick.bind(this));
  }

  /**
   * Handles 'click' events on the modal.
   * @param {object} evt - Event object.
   */
  handleClick(evt) {
    if (evt.target !== this && !evt.target.matches('.js-close-modal')) return;
    this.close();
  }

  /**
   * Opens the modal.
   * @param {Element} opener - Modal opener element.
   */
  open(opener) {
    // Prevent page behind from scrolling when side drawer is open
    this.scrollY = window.scrollY;
    document.body.classList.add('fixed');
    document.body.style.top = `-${this.scrollY}px`;

    this.setAttribute('open', '');
    this.openedBy = opener;

    trapFocus(this);
    window.pauseAllMedia();

    // Add event handler (so the bound event listener can be removed).
    this.keyupHandler = (evt) => evt.key === 'Escape' && this.close();

    // Add event listener (for while modal is open).
    this.addEventListener('keyup', this.keyupHandler);

    // Wrap tables in a '.scrollable-table' element for a better mobile experience.
    this.querySelectorAll('table').forEach((table) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'scrollable-table';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  /**
   * Closes the modal.
   */
  close() {
    // Restore page position and scroll behaviour.
    document.body.style.top = '';
    document.body.classList.remove('fixed');
    window.scrollTo(0, this.scrollY);

    this.removeAttribute('open');

    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();

    // Remove event listener added on modal opening.
    this.removeEventListener('keyup', this.keyupHandler);
  }
}

customElements.define('modal-dialog', Modal);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');
    if (!button) return;

    button.addEventListener('click', () => {
      const modal = document.getElementById(this.dataset.modal);
      if (modal) modal.open(button);
    });
  }
}

customElements.define('modal-opener', ModalOpener);

class ProductCard extends HTMLElement {
  constructor() {
    super();
    window.initLazyScript(this, this.init.bind(this));
  }

  init() {
    this.images = this.querySelectorAll('.card__main-image');
    this.links = this.querySelectorAll('.js-prod-link');
    this.quickAddBtn = this.querySelector('.js-quick-add');
    this.carouselSlider = this.querySelector('product-card-image-slider');

    if (this.quickAddBtn) {
      this.productUrl = this.quickAddBtn.dataset.productUrl;
    } else if (this.links.length) {
      this.productUrl = this.links[0].href;
    }

    this.addEventListener('change', this.handleSwatchChange.bind(this));
  }

  /**
   * Handles 'change' events in the product card swatches.
   * @param {object} evt - Event object.
   */
  handleSwatchChange(evt) {
    if (!evt.target.matches('.opt-btn')) return;

    // Swap current card image to selected variant image.
    if (evt.target.dataset.mediaId && !this.carouselSlider) {
      const variantMedia = this.querySelector(`[data-media-id="${evt.target.dataset.mediaId}"]`);

      if (variantMedia) {
        this.images.forEach((image) => { image.hidden = true; });
        variantMedia.hidden = false;
      }
    }

    const separator = this.productUrl.split('?').length > 1 ? '&' : '?';
    const url = `${this.productUrl + separator}variant=${evt.target.dataset.variantId}`;

    // Update link hrefs to url of selected variant.
    this.links.forEach((link) => {
      link.href = url;
    });

    // Update the Quick Add button data.
    if (this.quickAddBtn) {
      this.quickAddBtn.dataset.selectedColor = evt.target.value;
    }
  }
}

customElements.define('product-card', ProductCard);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
    window.initLazyScript(this, this.init.bind(this), 500);
  }

  async init() {
    const { productId } = this.dataset;
    if (!productId) return;

    try {
      const response = await fetch(`${this.dataset.url}&product_id=${productId}`);
      if (!response.ok) throw new Error(response.status);

      const tmpl = document.createElement('template');
      tmpl.innerHTML = await response.text();

      const el = tmpl.content.querySelector('product-recommendations');
      if (el && el.hasChildNodes()) {
        this.innerHTML = el.innerHTML;
      }
    } catch (error) {
      console.log(error); // eslint-disable-line
    }
  }
}

customElements.define('product-recommendations', ProductRecommendations);

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('.qty-input__input');
    this.currentQty = this.input.value;
    this.changeEvent = new Event('change', { bubbles: true });

    this.addEventListener('click', this.handleClick.bind(this));
    this.input.addEventListener('focus', QuantityInput.handleFocus);
    this.input.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  /**
   * Handles 'click' events on the quantity input element.
   * @param {object} evt - Event object.
   */
  handleClick(evt) {
    if (!evt.target.matches('.qty-input__btn')) return;
    evt.preventDefault();

    this.currentQty = this.input.value;

    if (evt.target.name === 'plus') {
      this.input.stepUp();
    } else {
      this.input.stepDown();
    }

    if (this.input.value !== this.currentQty) {
      this.input.dispatchEvent(this.changeEvent);
      this.currentQty = this.input.value;
    }
  }

  /**
   * Handles 'focus' events on the quantity input element.
   * @param {object} evt - Event object.
   */
  static handleFocus(evt) {
    if (window.matchMedia('(pointer: fine)').matches) {
      evt.target.select();
    }
  }

  /**
   * Handles 'keydown' events on the input field.
   * @param {object} evt - Event object.
   */
  handleKeydown(evt) {
    if (evt.key !== 'Enter') return;
    evt.preventDefault();

    if (this.input.value !== this.currentQty) {
      this.input.blur();
      this.input.focus();
      this.currentQty = this.input.value;
    }
  }
}

customElements.define('quantity-input', QuantityInput);

class SideDrawer extends HTMLElement {
  constructor() {
    super();
    this.overlay = document.querySelector('.js-overlay');
  }

  /**
   * Handles a 'click' event on the drawer.
   * @param {object} evt - Event object.
   */
  handleClick(evt) {
    if (evt.target.matches('.js-close-drawer') || evt.target === this.overlay) {
      this.close();
    }
  }

  /**
   * Opens the drawer.
   * @param {Element} [opener] - Element that triggered opening of the drawer.
   * @param {Element} [elementToFocus] - Element to focus after drawer opened.
   * @param {Function} [callback] - Callback function to trigger after the open has completed
   */
  open(opener, elementToFocus, callback) {
    this.dispatchEvent(new CustomEvent(`on:${this.dataset.name}:before-open`, {
      bubbles: true
    }));

    // Prevent page behind from scrolling when side drawer is open.
    this.scrollY = window.scrollY;
    document.body.classList.add('fixed');
    document.body.style.top = `-${this.scrollY}px`;
    document.documentElement.style.height = '100svh';

    this.overlay.classList.add('is-visible');
    this.setAttribute('open', '');
    this.setAttribute('aria-hidden', 'false');
    this.opener = opener;

    trapFocus(this, elementToFocus);

    // Create event handler variables (so the bound event listeners can be removed).
    this.clickHandler = this.clickHandler || this.handleClick.bind(this);
    this.keyupHandler = (evt) => {
      if (evt.key !== 'Escape' || evt.target.closest('.cart-drawer-popup')) return;
      this.close();
    };

    // Add event listeners (for while drawer is open).
    this.addEventListener('click', this.clickHandler);
    this.addEventListener('keyup', this.keyupHandler);
    this.overlay.addEventListener('click', this.clickHandler);

    // Handle events after the drawer opens
    const transitionDuration = parseFloat(getComputedStyle(this).getPropertyValue('--longest-transition-in-ms'));
    setTimeout(() => {
      if (callback) callback();
      this.dispatchEvent(new CustomEvent(`on:${this.dataset.name}:after-open`, {
        bubbles: true
      }));
    }, transitionDuration);
  }

  /**
   * Closes the drawer.
   * @param {Function} [callback] - Call back function to trigger after the close has completed
   */
  close(callback) {
    this.dispatchEvent(new CustomEvent(`on:${this.dataset.name}:before-close`, {
      bubbles: true
    }));

    this.removeAttribute('open');
    this.setAttribute('aria-hidden', 'true');
    this.overlay.classList.remove('is-visible');

    removeTrapFocus(this.opener);

    // Restore page position and scroll behaviour.
    document.documentElement.style.height = '';
    document.body.style.top = '';
    document.body.classList.remove('fixed');
    window.scrollTo(0, this.scrollY);

    // Remove event listeners added on drawer opening.
    this.removeEventListener('click', this.clickHandler);
    this.removeEventListener('keyup', this.keyupHandler);
    this.overlay.removeEventListener('click', this.clickHandler);

    // Handle events after the drawer closes
    const transitionDuration = parseFloat(getComputedStyle(this).getPropertyValue('--longest-transition-in-ms'));
    setTimeout(() => {
      if (callback) callback();
      this.dispatchEvent(new CustomEvent(`on:${this.dataset.name}:after-close`, {
        bubbles: true
      }));
    }, transitionDuration);
  }
}

customElements.define('side-drawer', SideDrawer);

class CarouselSlider extends HTMLElement {
  constructor() {
    super();
    // Get slides, ignoring nested .slider__item elements
    this.slides = this.querySelector('.slider__item').parentElement.children;
    if (this.slides.length < 2) return;

    window.initLazyScript(this, this.init.bind(this));
  }

  init() {
    this.slider = this.querySelector('.slider');
    this.grid = this.querySelector('.slider__grid');
    this.nav = this.querySelector(`.slider-nav__btn[aria-controls='${this.slider.id}']`)?.closest('.slider-nav');
    this.rtl = document.dir === 'rtl';

    if (this.nav) {
      this.prevBtn = this.nav.querySelector('button[name="prev"]');
      this.nextBtn = this.nav.querySelector('button[name="next"]');
    }

    this.initSlider();
    window.addEventListener('on:breakpoint-change', this.handleBreakpointChange.bind(this));
  }

  initSlider() {
    this.gridWidth = this.grid.clientWidth;

    // Distance between leading edges of adjacent slides (i.e. width of card + gap).
    this.slideSpan = this.getWindowOffset(this.slides[1]) - this.getWindowOffset(this.slides[0]);

    // Width of gap between slides.
    this.slideGap = this.slideSpan - this.slides[0].clientWidth;

    this.slidesPerPage = Math.round((this.gridWidth + this.slideGap) / this.slideSpan);
    this.slidesToScroll = theme.settings.sliderItemsPerNav === 'page' ? this.slidesPerPage : 1;
    this.totalPages = this.slides.length - this.slidesPerPage + 1;

    this.setCarouselState(this.totalPages > 1);
    if (this.totalPages < 2 || !this.nav) return;

    this.sliderStart = this.getWindowOffset(this.slider);
    if (!this.sliderStart) this.sliderStart = (this.slider.clientWidth - this.gridWidth) / 2;
    this.sliderEnd = this.sliderStart + this.gridWidth;

    // Remove reveal transitions from off-screen slides
    if (!this.dataset.keepAnimations && this.grid.querySelector('[data-cc-animate]')) {
      for (let i = this.slidesPerPage; i < this.slides.length; i += 1) {
        this.slides[i].querySelectorAll('[data-cc-animate]').forEach((el) => {
          el.removeAttribute('data-cc-animate-delay');
          el.classList.add('cc-animate-in');
        });
      }
    }

    this.addListeners();
    this.setButtonStates();
  }

  addListeners() {
    this.scrollHandler = debounce(this.handleScroll.bind(this));
    this.navClickHandler = this.handleNavClick.bind(this);

    this.slider.addEventListener('scroll', this.scrollHandler);
    this.nav.addEventListener('click', this.navClickHandler);
  }

  removeListeners() {
    this.slider.removeEventListener('scroll', this.scrollHandler);
    this.nav.removeEventListener('click', this.navClickHandler);
  }

  /**
   * Handles 'scroll' events on the slider element.
   */
  handleScroll() {
    this.currentIndex = Math.round(this.slider.scrollLeft / this.slideSpan);
    this.setButtonStates();
  }

  /**
   * Handles 'click' events on the nav buttons container.
   * @param {object} evt - Event object.
   */
  handleNavClick(evt) {
    if (!evt.target.matches('.slider-nav__btn')) return;

    if ((evt.target.name === 'next' && !this.rtl) || (evt.target.name === 'prev' && this.rtl)) {
      this.scrollPos = this.slider.scrollLeft + (this.slidesToScroll * this.slideSpan);
    } else {
      this.scrollPos = this.slider.scrollLeft - (this.slidesToScroll * this.slideSpan);
    }

    this.slider.scrollTo({ left: this.scrollPos, behavior: 'smooth' });
  }

  /**
   * Handles 'on:breakpoint-change' events on the window.
   */
  handleBreakpointChange() {
    if (this.nav) this.removeListeners();
    this.initSlider();
  }

  /**
   * Gets the offset of an element from the edge of the viewport (left for ltr, right for rtl).
   * @param {number} el - Element.
   * @returns {number}
   */
  getWindowOffset(el) {
    return this.rtl
      ? window.innerWidth - el.getBoundingClientRect().right
      : el.getBoundingClientRect().left;
  }

  /**
   * Gets the visible state of a slide.
   * @param {Element} el - Slide element.
   * @returns {boolean}
   */
  getSlideVisibility(el) {
    const slideStart = this.getWindowOffset(el);
    const slideEnd = Math.floor(slideStart + this.slides[0].clientWidth);
    return slideStart >= this.sliderStart && slideEnd <= Math.ceil(this.sliderEnd);
  }

  /**
   * Sets the active state of the carousel.
   * @param {boolean} active - Set carousel as active.
   */
  setCarouselState(active) {
    if (active) {
      this.removeAttribute('inactive');

      // If slider width changed when activated, reinitialise it.
      if (this.gridWidth !== this.grid.clientWidth) {
        this.handleBreakpointChange();
      }
    } else {
      this.setAttribute('inactive', '');
    }
  }

  /**
   * Sets the disabled state of the nav buttons.
   */
  setButtonStates() {
    this.prevBtn.disabled = this.getSlideVisibility(this.slides[0]) && this.slider.scrollLeft === 0;
    this.nextBtn.disabled = this.getSlideVisibility(this.slides[this.slides.length - 1]);
  }
}

customElements.define('carousel-slider', CarouselSlider);

class PageHeader extends HTMLElement {
  connectedCallback() {
    this.announcement = document.querySelector('.announcement');
    this.header = this.querySelector('.header');
    this.inlineNavContainer = this.querySelector('.multi-level-nav');
    if (this.inlineNavContainer) {
      this.inlineNav = this.querySelector('.inline-header-nav .tier-1 > ul');
      this.inlineNavMegaMenu = this.inlineNavContainer.querySelector('#mega-menu-tier-2');
    }
    this.touchStartTime = 0;
    this.scrolledDown = false;

    this.init();
  }

  init() {
    this.setAnnouncementHeight();
    this.setScrolledState();
    this.checkInlineNavWidth();

    if (this.header.classList.contains('header--sticky')) {
      document.addEventListener('scroll', this.setScrolledState.bind(this));
    }

    if (this.inlineNavContainer) {
      window.addEventListener('on:debounced-resize', () => {
        this.checkInlineNavWidth();
        if (this.announcement) this.setAnnouncementHeight();

        // menu-drawer is dependent on a class set in checkInlineNavWidth
        const menuDrawer = document.querySelector('menu-drawer');
        if (menuDrawer.init) menuDrawer.init();
      });

      // Navigation events
      this.inlineNavMegaMenu.addEventListener('mouseenter', () => clearTimeout(this.closeMenuTimeout));
      this.inlineNavMegaMenu.addEventListener('mouseleave', this.closeChildMenu.bind(this));

      this.querySelectorAll('.contains-children').forEach((el) => {
        el.addEventListener('touchstart', this.selectNavParent.bind(this), { passive: true });
        el.addEventListener('touchend', this.selectNavParent.bind(this));
        el.addEventListener('click', this.selectNavParent.bind(this));
        el.querySelector('a').addEventListener('keydown', (evt) => {
          if (evt.key === 'Enter') {
            this.selectNavParent(evt);
          }
        });

        el.addEventListener('mouseenter', (evt) => {
          this.openChildMenu(evt.currentTarget);
        });

        el.addEventListener('mouseleave', this.closeChildMenu.bind(this));
      });
    }
  }

  /**
   * Handles any event that should toggle a dropdown menu.
   * @param {object} evt - Event object.
   */
  selectNavParent(evt) {
    if (!evt.target.matches('.has-children')) return;

    const toggleMenu = (parent) => {
      if (parent.querySelector('a').getAttribute('aria-expanded') === 'true') {
        this.closeChildMenu();
      } else {
        this.openChildMenu(parent);
      }
    };

    switch (evt.type) {
      case 'touchstart':
        this.touchStartTime = evt.timeStamp;
        break;

      case 'touchend':
        // Touch down and up in under a second - assume tap
        if (evt.timeStamp - this.touchStartTime < 1000) {
          this.touchOpenTriggeredAt = evt.timeStamp;
          toggleMenu(evt.currentTarget);
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;

      case 'click':
        // Click within second of a tap, stop event
        if (evt.timeStamp - this.touchOpenTriggeredAt < 1000) {
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;

      case 'keydown':
        toggleMenu(evt.currentTarget.parentElement);
        evt.preventDefault();
        break;
    }
  }

  /**
   * Open a child menu.
   * @param {HTMLElement} parent - Parent element.
   */
  openChildMenu(parent) {
    // Reset any open menus and timers
    clearTimeout(this.closeMenuTimeout);
    this.inlineNavContainer.querySelectorAll('[aria-expanded="true"]').forEach((el) => {
      el.setAttribute('aria-expanded', false);
      this.inlineNavMegaMenu.classList.remove('tier-appeared');
    });

    if (!this.imagesLoaded) {
      const revealImgs = (container) => {
        container.querySelectorAll('img[hidden]').forEach((el) => {
          el.sizes = `${el.closest('.nav-ctas__cta').clientWidth}px`;
          el.removeAttribute('hidden');
        });
      };

      // Load this menu's images immediately
      revealImgs(parent);

      // Load other menus momentarily
      setTimeout(() => revealImgs(this), 250);
      this.imagesLoaded = true;
    }

    // Set visible
    const parentLink = parent.querySelector('a');
    parentLink.setAttribute('aria-expanded', true);

    if (!parent.classList.contains('contains-mega-menu')) {
      return;
    }

    // Populate tier 2
    this.inlineNavMegaMenu.innerHTML = '';
    parent.childNodes.forEach((el, index) => {
      if (index > 1) {
        this.inlineNavMegaMenu.append(el.cloneNode(true));
      }
    });

    this.inlineNavMegaMenu.classList.add('tier-appeared');
  }

  /**
   * Close a child menu.
   */
  closeChildMenu() {
    this.closeMenuTimeout = setTimeout(() => {
      this.inlineNavContainer.querySelectorAll('[aria-expanded="true"]').forEach((el) => {
        el.setAttribute('aria-expanded', false);
        this.inlineNavMegaMenu.classList.remove('tier-appeared');
      });
    }, 750);
  }

  /**
   * Checks the width of the inline nav.
   */
  checkInlineNavWidth() {
    if (
      this.header.dataset.navInline === 'true'
      && (this.inlineNavContainer.offsetWidth > this.inlineNav.offsetWidth)
    ) {
      this.header.classList.add('header--inline-visible');
    } else {
      this.header.classList.remove('header--inline-visible');
    }
  }

  /**
   * Gets the height of the announcement bar and updates the variable.
   */
  setAnnouncementHeight() {
    this.announcementHeight = this.announcement ? this.announcement.clientHeight : 0;
  }

  /**
   * Toggles a 'scrolled-down' class on the body, according to the scrolled state of the page.
   */
  setScrolledState() {
    const scrollY = window.scrollY ? window.scrollY : -document.body.getBoundingClientRect().top;
    if (!this.scrolledDown) {
      if (scrollY > this.announcementHeight) {
        document.body.classList.add('scrolled-down');
        this.scrolledDown = true;
      }
    } else {
      clearTimeout(this.timeout);

      this.timeout = setTimeout(() => {
        document.body.classList.toggle('scrolled-down', scrollY > this.announcementHeight);
        this.scrolledDown = document.body.classList.contains('scrolled-down');
      }, window.scrollY <= 0 ? 0 : 200);
    }
  }
}

customElements.define('page-header', PageHeader);

// import SideDrawer from '@cc/lib/components/side-drawer/side-drawer';

customElements.whenDefined('side-drawer').then(() => {
  class MenuDrawer extends customElements.get('side-drawer') {
    connectedCallback() {
      if (super.connectedCallback) super.connectedCallback();
      this.header = document.querySelector('.header');
      this.menuToggle = document.querySelector('.menu-toggle');
      this.mainMenuPanel = document.getElementById('main-menu-panel');
      this.overlay = document.querySelector('.js-header-overlay');
      this.menuPanelDelay = 300;
      this.initialised = false;
      this.imagesLoaded = false;

      // 'header--inline-visible' is dependent on PageHeader's checkInlineNavWidth
      if (!this.header.classList.contains('header--inline-visible')) {
        this.init();
      }
    }

    init() {
      if (this.initialised || this.header.classList.contains('header--inline-visible')) return;
      document.getElementById('menu-disclosure').open = true;

      this.menuToggle.addEventListener('click', this.handleToggleClick.bind(this));
      this.addEventListener('click', this.handleNavClick.bind(this));
      this.initialised = true;
    }

    /**
     * Handles 'click' events on the menu toggle button.
     * @param {object} evt - Event object.
     */
    handleToggleClick(evt) {
      evt.preventDefault();

      if (this.hasAttribute('open')) {
        if (this.menuToggle.classList.contains('menu-toggle--back')) {
          const activePanel = this.getActivePanel();
          this.handleBackClick(activePanel);

          setTimeout(() => {
            const newActivePanel = this.getActivePanel();
            newActivePanel.setAttribute('aria-hidden', 'false');
            activePanel.setAttribute('aria-hidden', 'true');
          }, this.menuPanelDelay);

          return;
        }

        this.close();
      } else {
        this.open(this.menuToggle, this.querySelector('.main-menu-links a'));
      }
    }

    /**
     * Handles 'click' events on the navigation.
     * @param {object} evt - Event object.
     */
    handleNavClick(evt) {
      let el = evt.target;
      if (el.matches('.child-indicator')) el = el.parentElement;

      if (el.matches('.has-children > .main-menu-link')) {
        evt.preventDefault();
        el.setAttribute('aria-expanded', 'true');

        const menuToHide = el.closest('.main-menu-panel');
        const menuToShow = document.getElementById(el.getAttribute('aria-controls'));

        menuToHide.classList.add('main-menu-panel--inactive-left');
        menuToHide.setAttribute('aria-hidden', 'true');
        menuToShow.setAttribute('aria-hidden', 'false');

        this.menuToggle.classList.add('menu-toggle--back');

        setTimeout(() => {
          menuToShow.classList.remove('main-menu-panel--inactive-right');
        }, this.menuPanelDelay);
      }
    }

    /**
     * Handles 'click' events on the navigation.
     * @param {Element} activeNav - Active nav element.
     */
    handleBackClick(activeNav) {
      activeNav.classList.add('main-menu-panel--inactive-right');

      if (activeNav.dataset.backId === 'main-menu-panel') {
        this.menuToggle.classList.remove('menu-toggle--back');
      }

      setTimeout(() => {
        const menuToShow = document.getElementById(activeNav.dataset.backId);
        menuToShow.classList.remove('main-menu-panel--inactive-left');
      }, this.menuPanelDelay);
    }

    /**
     * Opens the menu drawer.
     */
    open() {
      this.checkMenuPadding();

      // Unhide images to trigger load (if not already loaded).
      if (!this.imagesLoaded) {
        this.querySelectorAll('img').forEach((img) => {
          img.hidden = false;
        });

        this.imagesLoaded = true;
      }

      document.body.classList.add('menu-drawer-open');
      super.open(this);
    }

    /**
     * Closes the menu drawer.
     */
    close() {
      document.body.classList.remove('menu-drawer-open');
      this.resetMenu();
      super.close();
    }

    /**
     * Checks and sets top padding of the menu so that links aren't obscured by the header.
     */
    checkMenuPadding() {
      let headerHeight = (this.header.offsetHeight / 2) + 42;
      const announcement = document.querySelector('.announcement');

      if (announcement && !document.body.classList.contains('scrolled-down')) {
        headerHeight += announcement.offsetHeight;
      }

      if (headerHeight > 90) {
        this.style.borderTopWidth = `${headerHeight}px`;
      } else {
        this.removeAttribute('style');
      }
    }

    getActivePanel() {
      return this.querySelector(
        '.main-menu-panel:not(.main-menu-panel--inactive-left):not(.main-menu-panel--inactive-right)'
      );
    }

    resetMenu() {
      this.menuToggle.classList.remove('menu-toggle--back');

      setTimeout(() => {
        this.querySelectorAll('.main-menu-panel').forEach((panel) => {
          panel.classList.remove('main-menu-panel--inactive-left');

          if (panel !== this.mainMenuPanel) {
            panel.classList.add('main-menu-panel--inactive-right');
          }
        });
      }, this.menuPanelDelay);
    }
  }

  customElements.define('menu-drawer', MenuDrawer);
});

if (!customElements.get('micro-carousel')) {
  class MicroCarousel extends HTMLElement {
    connectedCallback() {
      this.ltr = !document.querySelector('html[dir=rtl]');
      this.scrollContainer = this.querySelector('.micro-carousel__scroll-area');
      this.itemsContainer = this.querySelector('.micro-carousel__items');
      this.nextBtn = this.querySelector('.micro-carousel__next');
      this.handleResize();
      this.checkAtEnd();
      this.resizeObserver = new ResizeObserver(debounce(this.handleResize.bind(this), 300));
      this.resizeObserver.observe(this);
    }

    /**
     * Enable/disable carousel based on dimensions.
     */
    handleResize() {
      const isActive = this.itemsContainer.clientWidth > this.scrollContainer.clientWidth;

      if (this.isActive !== isActive) {
        this.isActive = isActive;

        if (this.isActive) {
          this.toggleAttribute('active', true);
          this.nextClickHandler = this.handleClickNext.bind(this);
          this.nextBtn.addEventListener('click', this.nextClickHandler);
          this.scrollHandler = debounce(this.checkAtEnd.bind(this), 100);
          this.scrollContainer.addEventListener('scroll', this.scrollHandler);
        } else {
          this.toggleAttribute('active', false);
          if (this.nextClickHandler) {
            this.nextBtn.removeEventListener('click', this.nextClickHandler);
            this.nextClickHandler = null;
          }
          if (this.scrollHandler) {
            this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
          }
        }
      }

      if (this.isActive) {
        this.itemVisibleBoundaryBeyond = parseFloat(this.style.getPropertyValue('--mc-item-visible-boundary-beyond'));
        if (Number.isNaN(this.itemVisibleBoundaryBeyond)) this.itemVisibleBoundaryBeyond = 0;
        this.checkAtEnd();
      }
    }

    /**
     * Check if the carousel shows the last item.
     */
    checkAtEnd() {
      this.atEnd = this.isItemVisible(this.itemsContainer.lastElementChild);
      this.toggleAttribute('at-end', this.atEnd);
    }

    /**
     * Handle a click event for revealing more items.
     * @param {object} evt - Event object.
     */
    handleClickNext(evt) {
      evt.preventDefault();

      let nextItem = null;

      if (this.atEnd) {
        nextItem = this.itemsContainer.firstElementChild;
      }

      if (!nextItem) {
        let foundVisibleItem = false;
        for (const item of this.itemsContainer.children) {
          if (item.clientWidth > 1) { // visually-hidden
            if (this.isItemVisible(item)) {
              foundVisibleItem = true;
            } else if (foundVisibleItem) {
              nextItem = item;
              break;
            }
          }
        }
      }

      if (!nextItem) {
        nextItem = this.itemsContainer.firstElementChild;
      }

      const scrollToLeft = nextItem.offsetLeft - this.itemsContainer.firstElementChild.offsetLeft;
      this.scrollContainer.scrollTo({ top: 0, left: scrollToLeft, behavior: 'smooth' });
    }

    /**
     * Determines if an item in the carousel is visible.
     * @param {HTMLElement} item - Carousel item to check.
     * @returns {number}
     */
    isItemVisible(item) {
      const scrollViewStart = Math.abs(this.scrollContainer.scrollLeft);
      const scrollViewEnd = scrollViewStart + this.scrollContainer.clientWidth;
      const itemStart = this.itemOffsetStart(item);
      const itemEnd = itemStart + item.offsetWidth + this.itemVisibleBoundaryBeyond;
      return itemStart >= scrollViewStart && itemEnd <= scrollViewEnd;
    }

    /**
     * Get an item's offset from the start of the scroll container, respecting flow direction.
     * @param {HTMLElement} item - Carousel item to use.
     * @returns {number}
     */
    itemOffsetStart(item) {
      if (this.ltr) {
        return item.offsetLeft;
      }
      return this.scrollContainer.clientWidth - item.offsetLeft - item.clientWidth;
    }
  }

  window.customElements.define('micro-carousel', MicroCarousel);
}

// import SideDrawer from '@cc/lib/components/side-drawer/side-drawer';

customElements.whenDefined('side-drawer').then(() => {
  class SearchDrawer extends customElements.get('side-drawer') {
    connectedCallback() {
      if (super.connectedCallback) super.connectedCallback();
      this.searchToggle = document.querySelector('.header-search-toggle');
      if (!this.searchToggle) return;

      this.init();
    }

    init() {
      this.overlay = document.querySelector('.js-header-overlay');

      this.searchToggle.addEventListener('click', (evt) => {
        evt.preventDefault();
        this.open(this.searchToggle, document.getElementById('search-drawer-input'));
      });
    }
  }

  customElements.define('search-drawer', SearchDrawer);
});

window.initLazyScript = initLazyScript;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.content-boundary--top, .content-boundary--top-flipped').forEach((el) => {
    const section = el.closest('.shopify-section');
    section.classList.add('has-content-boundary-top');
    if (el.classList.contains('content-boundary--top-flipped')) {
      section.classList.add('has-content-boundary-top--flipped');
    }
  });
});
