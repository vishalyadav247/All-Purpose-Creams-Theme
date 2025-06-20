if (!customElements.get('media-gallery')) {
  class MediaGallery extends HTMLElement {
    constructor() {
      super();

      if (Shopify.designMode) {
        setTimeout(() => this.init(), 200);
      } else {
        this.init();
      }
    }

    init() {
      this.setAttribute('loading', '');
      this.section = this.closest('.js-product');
      this.variantPicker = this.section.querySelector('variant-picker');
      this.mediaGroupingEnabled = this.variantPicker
        && this.hasAttribute('data-media-grouping-enabled')
        && this.getMediaGroupData();
      this.viewer = this.querySelector('.media-viewer');
      this.thumbs = this.querySelector('.media-thumbs');
      this.controls = this.querySelector('.media-ctrl');
      this.prevBtn = this.querySelector('.media-ctrl__btn[name="prev"]');
      this.nextBtn = this.querySelector('.media-ctrl__btn[name="next"]');
      this.counterCurrent = this.querySelector('.media-ctrl__current-item');
      this.counterTotal = this.querySelector('.media-ctrl__total-items');
      this.liveRegion = this.querySelector('.media-gallery__status');
      if (this.hasAttribute('data-zoom-enabled')) {
        this.galleryModal = this.querySelector('.js-media-zoom-template').content.firstElementChild.cloneNode(true);
      }
      this.xrButton = this.querySelector('.media-xr-button');

      if (this.mediaGroupingEnabled) {
        this.mediaLists = [
          this.viewer.querySelectorAll('.media-viewer__item')
        ];
        if (this.thumbs) {
          this.mediaLists.push(this.thumbs.querySelectorAll('.media-thumbs__item'));
        }
        this.setActiveMediaGroup(this.getMediaGroupFromOptionSelectors());
      }

      if (this.dataset.layout === 'stacked' && theme.mediaMatches.md) {
        this.resizeInitHandler = this.initGallery.bind(this);
        window.addEventListener('on:debounced-resize', this.resizeInitHandler);
      } else {
        this.initGallery();
      }

      this.section.addEventListener('on:variant:change', this.onVariantChange.bind(this));
      this.removeAttribute('loading');
      this.setAttribute('loaded', '');
    }

    /**
     * Initialises the media gallery slider and associated controls.
     * @param {object} evt - Event object.
     */
    initGallery(evt) {
      this.setVisibleItems();
      if (this.visibleItems.length <= 1) return;

      this.initialised = true;

      const activeItem = this.querySelector('.media-viewer__item.is-active');
      if (activeItem) {
        this.viewer.scrollLeft = activeItem.offsetLeft;
      }

      this.viewerItemOffset = this.visibleItems[1].offsetLeft - this.visibleItems[0].offsetLeft;

      if (activeItem) {
        this.setActiveMedia(activeItem, false);
      } else {
        this.currentIndex = Math.round(this.viewer.scrollLeft / this.viewerItemOffset);
        this.currentItem = this.visibleItems[this.currentIndex];

        if (this.thumbs) {
          this.currentThumb = this.thumbs.querySelector(`[data-media-id="${this.currentItem.dataset.mediaId}"]`);
        }
      }

      this.addListeners();

      if (evt && evt.type === 'on:debounced-resize') {
        window.removeEventListener('on:debounced-resize', this.resizeInitHandler);
      }
    }

    addListeners() {
      this.viewer.addEventListener('scroll', window.debounce(this.handleScroll.bind(this), 200));
      if (this.controls) this.controls.addEventListener('click', this.handleNavClick.bind(this));
      if (this.thumbs) this.thumbs.addEventListener('click', this.handleThumbClick.bind(this));
      window.addEventListener('on:debounced-resize', this.handleResize.bind(this));
    }

    /**
     * Handles 'scroll' events on the main media container.
     */
    handleScroll() {
      const newIndex = Math.round(this.viewer.scrollLeft / this.viewerItemOffset);

      if (newIndex !== this.currentIndex) {
        const viewerItemOffset = this.visibleItems[1].offsetLeft - this.visibleItems[0].offsetLeft;

        // If scroll wasn't caused by a resize event, update the active media.
        if (viewerItemOffset === this.viewerItemOffset) {
          this.setActiveMedia(this.visibleItems[newIndex], false, true);
        }
      }
    }

    /**
     * Handles 'click' events on the controls container.
     * @param {object} evt - Event object.
     */
    handleNavClick(evt) {
      if (!evt.target.matches('.media-ctrl__btn')) return;

      const itemToShow = evt.target === this.nextBtn
        ? this.visibleItems[this.currentIndex + 1]
        : this.visibleItems[this.currentIndex - 1];

      this.viewer.scrollTo({ left: itemToShow.offsetLeft, behavior: 'smooth' });
    }

    /**
     * Handles 'click' events on the thumbnails container.
     * @param {object} evt - Event object.
     */
    handleThumbClick(evt) {
      const thumb = evt.target.closest('[data-media-id]');
      if (!thumb) return;

      const itemToShow = this.querySelector(`[data-media-id="${thumb.dataset.mediaId}"]`);
      this.setActiveMedia(itemToShow, true, true);
    }

    /**
     * Handles debounced 'resize' events on the window.
     */
    handleResize() {
      // Reset distance from leading edge of one slide to the next.
      this.viewerItemOffset = this.visibleItems[1].offsetLeft - this.visibleItems[0].offsetLeft;

      if (this.thumbs) {
        this.checkThumbVisibilty(this.currentThumb);
      }
    }

    /**
     * Sets the active media item.
     * @param {Element} mediaItem - Media element to set as active.
     * @param {boolean} [scrollToItem=true] - Scroll to the active media item.
     * @param {boolean} [playMedia=false] - Play video or load model.
     */
    setActiveMedia(mediaItem, scrollToItem = true, playMedia = false) {
      if (mediaItem === this.currentItem) return;
      window.pauseAllMedia(this);

      this.currentItem = mediaItem;
      this.currentIndex = this.visibleItems.indexOf(this.currentItem);

      if (this.dataset.layout === 'stacked' && theme.mediaMatches.md) return;

      if (scrollToItem) this.viewer.scrollTo({ left: this.currentItem.offsetLeft });
      if (this.thumbs) this.setActiveThumb();

      if (this.controls) {
        if (this.prevBtn) {
          this.prevBtn.disabled = this.currentIndex === 0;
        }

        if (this.nextBtn) {
          this.nextBtn.disabled = this.currentIndex === this.visibleItems.length - 1;
        }

        if (this.counterCurrent) {
          this.counterCurrent.textContent = this.currentIndex + 1;
        }
      }

      if (playMedia) MediaGallery.playActiveMedia(mediaItem);

      if (this.xrButton && mediaItem.dataset.mediaType === 'model') {
        this.xrButton.dataset.shopifyModel3dId = mediaItem.dataset.mediaId;
      }

      this.announceLiveRegion(this.currentItem, this.currentIndex + 1);
    }

    /**
     * Sets the active thumbnail.
     */
    setActiveThumb() {
      this.currentThumb = this.thumbs.querySelector(`[data-media-id="${this.currentItem.dataset.mediaId}"]`);
      const btn = this.currentThumb.querySelector('button');

      this.thumbs.querySelectorAll('.media-thumbs__btn').forEach((el) => {
        el.classList.remove('is-active');
        el.removeAttribute('aria-current');
      });

      btn.classList.add('is-active');
      btn.setAttribute('aria-current', 'true');
      this.checkThumbVisibilty(this.currentThumb);
    }

    /**
     * Creates an array of the visible media items.
     */
    setVisibleItems() {
      this.viewerItems = this.querySelectorAll('.media-viewer__item');
      this.visibleItems = Array.from(this.viewerItems).filter((el) => el.clientWidth > 0);
      if (this.counterTotal) this.counterTotal.textContent = this.visibleItems.length;
      if (this.controls) this.controls.dataset.totalItems = this.visibleItems.length;
    }

    /**
     * Ensures a thumbnail is in the visible area of the slider.
     * @param {Element} thumb - Thumb item element.
     */
    checkThumbVisibilty(thumb) {
      const scrollPos = this.thumbs.scrollLeft;
      const lastVisibleThumbOffset = this.thumbs.clientWidth + scrollPos;
      const thumbOffset = thumb.offsetLeft;

      if ((thumbOffset + thumb.clientWidth) > lastVisibleThumbOffset || thumbOffset < scrollPos) {
        this.thumbs.scrollTo({ left: thumbOffset, behavior: 'smooth' });
      }
    }

    /**
     * Handle a change in variant on the page.
     * @param {Event} evt - variant change event dispatched by variant-picker
     */
    onVariantChange(evt) {
      if (this.mediaGroupingEnabled) {
        this.setActiveMediaGroup(this.getMediaGroupFromOptionSelectors(evt));
      }

      if (this.viewerItems) {
        if (evt.detail.variant && evt.detail.variant.featured_media) {
          const mediaId = evt.detail.variant.featured_media.id.toString();
          const mediaItem = Array.from(this.viewerItems)
            .find((el) => el.dataset.mediaId === mediaId);
          this.setActiveMedia(mediaItem, true);
        } else if (this.mediaGroupChanged) {
          // default to first visible image, if group has changed and current variant
          // has no related image
          const firstVisibleThumb = this.querySelector('.media-thumbs__item:not([hidden])');
          if (firstVisibleThumb) {
            const { mediaId } = firstVisibleThumb.dataset;
            const mediaItem = Array.from(this.viewerItems)
              .find((el) => el.dataset.mediaId === mediaId);
            this.setActiveMedia(mediaItem, true);
          }
        }
      }
    }

    /**
     * Gets the media group from currently selected variant options.
     * @param {Event} evt - variant change event dispatched by variant-picker
     * @returns {?object}
     */
    getMediaGroupFromOptionSelectors(evt) {
      if (evt) {
        return evt.detail.selectedOptions[this.getMediaGroupData().groupOptionIndex];
      }

      return this.getSelectedOptions()[this.getMediaGroupData().groupOptionIndex];
    }

    /**
     * Gets the variant media associations for a product.
     * @returns {?object}
     */
    getMediaGroupData() {
      if (typeof this.variantMediaData === 'undefined') {
        const dataEl = this.querySelector('.js-data-variant-media');
        this.variantMediaData = dataEl ? JSON.parse(dataEl.textContent) : false;
      }

      return this.variantMediaData;
    }

    /**
     * Show only images associated to the current variant.
     * @param {string} groupName - optional - Group to show (uses this.currentItem if empty)
     */
    setActiveMediaGroup(groupName) {
      this.mediaGroupChanged = this.currentMediaGroup !== groupName;
      this.currentMediaGroup = groupName;

      if (!this.mediaGroupChanged) return;

      const resetVisibility = () => {
        this.mediaLists.forEach((list) => {
          list.forEach((mediaItem) => { mediaItem.hidden = false; });
        });
        this.setVisibleItems();
      };

      if (!groupName) {
        resetVisibility();
        if (!this.initialised) this.initGallery();
        return;
      }

      const mediaGroupData = this.getMediaGroupData();

      this.mediaLists.forEach((list) => {
        let anyVisible = false;

        // Set hidden
        list.forEach((el) => {
          const mediaItemGroup = mediaGroupData.media[el.dataset.mediaId].group;
          const showThis = mediaItemGroup === groupName || mediaItemGroup === true;
          el.hidden = !showThis;
          if (showThis) {
            anyVisible = true;
          }
        });

        if (anyVisible) {
          // Move all-groups media to start/end
          [...list].forEach((el) => {
            if (mediaGroupData.media[el.dataset.mediaId].group === true) {
              if (mediaGroupData.media[el.dataset.mediaId].position === 'start') {
                el.parentElement.prepend(el);
              } else {
                el.parentElement.append(el);
              }
            }
          });

          // Move hidden elements to the end (to allow nth-child CSS in layouts)
          [...list].filter((el) => el.hidden).forEach((el) => el.parentElement.append(el));
        } else {
          resetVisibility();
        }

        // Refresh slider
        if (list.length > 0) {
          const slider = list[0].closest('carousel-slider');
          if (slider && slider.offsetParent) {
            slider.refresh();
          }
        }
      });

      this.currentItem = null;
      this.setVisibleItems();
      if (!this.initialised) this.initGallery();
    }

    /**
     * Gets the selected option element from each selector.
     * @returns {Array}
     */
    getSelectedOptions() {
      const selectedOptions = [];

      this.variantPicker.querySelectorAll('.option-selector').forEach((selector) => {
        if (selector.dataset.selectorType === 'dropdown') {
          selectedOptions.push(selector.querySelector('.custom-select__btn').textContent.trim());
        } else {
          selectedOptions.push(selector.querySelector('input:checked').value);
        }
      });

      return selectedOptions;
    }

    /**
     * Updates the media gallery status.
     * @param {Element} mediaItem - Active media element.
     * @param {number} index - Active media index.
     */
    announceLiveRegion(mediaItem, index) {
      const image = mediaItem.querySelector('.media-viewer img');
      if (!image) return;

      this.liveRegion.setAttribute('aria-hidden', 'false');
      this.liveRegion.innerHTML = theme.strings.imageAvailable.replace('[index]', index);

      setTimeout(() => {
        this.liveRegion.setAttribute('aria-hidden', 'true');
      }, 2000);
    }

    /**
     * Loads the deferred media for the active item.
     * @param {Element} mediaItem - Active media element.
     */
    static playActiveMedia(mediaItem) {
      window.pauseAllMedia();
      const deferredMedia = mediaItem.querySelector('deferred-media');
      if (deferredMedia) deferredMedia.loadContent();
    }
  }

  customElements.define('media-gallery', MediaGallery);
}
