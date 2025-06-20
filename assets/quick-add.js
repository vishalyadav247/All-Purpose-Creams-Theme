/* global SideDrawer */

if (!customElements.get('quick-add-drawer')) {
  class QuickAddDrawer extends SideDrawer {
    constructor() {
      super();
      this.content = this.querySelector('.js-product-details');
      this.form = this.querySelector('product-form');
      this.notification = this.querySelector('.js-added-to-cart');

      document.addEventListener('click', this.handleDocumentClick.bind(this));
      this.addEventListener('on:variant:change', this.handleVariantChange.bind(this));
    }

    /**
     * Handles 'click' events on the document.
     * @param {object} evt - Event object.
     */
    handleDocumentClick(evt) {
      if (!evt.target.matches('.js-quick-add')) return;
      this.open(evt.target);
    }

    /**
     * Handles 'on:variant:change' events on the Quick Add drawer.
     * @param {object} evt - Event object.
     */
    handleVariantChange(evt) {
      // Update product media
      if (evt.detail.variant) {
        const variantMedia = evt.detail.variant.featured_media || null;
        if (variantMedia) {
          this.updateMedia(variantMedia.id);
        }
      }

      // Update product links
      let url = this.productUrl;
      if (evt.detail.variant) {
        const separator = this.productUrl.split('?').length > 1 ? '&' : '?';
        url += `${separator}variant=${evt.detail.variant.id}`;
      }
      this.querySelectorAll('.js-prod-link').forEach((link) => {
        link.href = url;
      });
    }

    /**
     * Opens the drawer and fetches the product details.
     * @param {Element} opener - Element that triggered opening of the drawer.
     */
    async open(opener) {
      opener.setAttribute('aria-disabled', 'true');
      this.notification.hidden = true;

      // If it's the same product as previously shown, there's no need to re-fetch the details.
      if (this.productUrl && this.productUrl === opener.dataset.productUrl) {
        if (opener.dataset.selectedColor) this.setActiveVariant(opener);
        super.open(opener);
        opener.removeAttribute('aria-disabled');
        return;
      }

      this.productUrl = opener.dataset.productUrl;
      this.content.innerHTML = '';
      super.open(opener);

      const response = await fetch(opener.dataset.productUrl);
      if (response.ok) {
        const tmpl = document.createElement('template');
        tmpl.innerHTML = await response.text();
        this.productEl = tmpl.content.querySelector('.cc-main-product .js-product');
        this.renderProduct(opener);
      }

      opener.removeAttribute('aria-disabled');
    }

    /**
     * Renders the product details.
     * @param {Element} opener - Element that triggered opening of the drawer.
     */
    renderProduct(opener) {
      // Replace instances of section id to prevent duplicates on the product page.
      const sectionId = this.productEl.dataset.section;
      this.productEl.innerHTML = this.productEl.innerHTML.replaceAll(sectionId, 'quickadd');

      // Prevent variant picker from updating the URL on change.
      const variantPicker = this.productEl.querySelector('variant-picker');
      if (variantPicker) variantPicker.dataset.updateUrl = 'false';

      // Remove size chart modal and link (if they exist).
      const sizeChartModal = this.productEl.querySelector('#size-chart');
      if (sizeChartModal) {
        this.productEl.querySelector('[data-modal="size-chart"]').remove();
        sizeChartModal.remove();
      }

      this.updateForm();
      this.updateContent(); // variant-picker requires form on initialisation

      // Update the product media.
      let colorImageSet = false;
      if (opener.dataset.selectedColor) {
        this.setActiveVariant(opener);
        if (this.currentMediaId) {
          colorImageSet = true;
        }
      }

      if (!colorImageSet) {
        const activeMedia = this.productEl.querySelector('.media-viewer__item.is-active');
        if (activeMedia) this.updateMedia(Number(activeMedia.dataset.mediaId));
      }
    }

    /**
     * Set color variant to match the one selected in the card.
     * @param {Element} opener - Element that triggered opening of the drawer.
     */
    setActiveVariant(opener) {
      this.querySelectorAll('.option-selector').forEach((optionSelector) => {
        const colorOption = optionSelector.querySelector(`.opt-btn[value="${opener.dataset.selectedColor}"]`);
        if (colorOption) {
          colorOption.click();
          return;
        }
        const firstBtn = optionSelector.querySelector('.opt-btn:not(.is-unavailable)');
        if (firstBtn && !firstBtn.checked) firstBtn.click();
      });
    }

    /**
     * Updates the product media.
     * @param {string} mediaId - Id of the media item to show.
     */
    updateMedia(mediaId) {
      if (this.currentMediaId === mediaId) return;
      this.currentMediaId = mediaId;

      const img = this.productEl.querySelector(`[data-media-id="${mediaId}"] img`);
      if (!img) return;

      const src = img.src ? img.src.split('&width=')[0] : img.dataset.src.split('&width=')[0];
      const container = this.querySelector('.quick-add-info__media');
      const width = container.offsetWidth;
      const aspectRatio = img.width / img.height;

      container.innerHTML = `
        <img src="${src}&width=${width}" srcset="${src}&width=${width}, ${src}&width=${width * 2} 2x" width="${width * 2}" height="${(width * 2) / aspectRatio}" alt="${img.alt}">
      `;
    }

    /**
     * Builds the markup for the drawer content element.
     */
    updateContent() {
      this.content.innerHTML = `
        <div class="quick-add-info grid mb-8">
          <div class="quick-add-info__media"></div>
          <div class="quick-add-info__details">
            <div class="product-vendor-sku mb-2 text-sm">
              ${this.getElementHtml('.product-vendor-sku')}
            </div>
            <div class="product-title mb-2">
              <a class="h5 js-prod-link" href="${this.productUrl}">
                ${this.getElementHtml('.product-title')}
              </a>
            </div>
            <div class="product-price js-product-price">
              ${this.getElementHtml('.product-info__price')}
            </div>
            <div class="mt-4">
              <a href="${this.productUrl}" class="feature-link feature-link--light js-prod-link">${theme.strings.viewDetails}</a>
            </div>
          </div>
        </div>
        <div class="product-options">
          ${this.getElementHtml('.product-options', '.custom-option')}
        </div>
      `;
    }

    /**
     * Updates the Quick Add drawer form (buy buttons).
     */
    updateForm() {
      const productForm = this.productEl.querySelector('product-form');

      if (productForm) {
        this.form.innerHTML = productForm.innerHTML;
        QuickAddDrawer.restoreScripts(this.form);
        this.form.init();

        if (Shopify && Shopify.PaymentButton) {
          Shopify.PaymentButton.init();
        }
      } else {
        this.form.innerHTML = '';
      }
    }

    /**
     * Gets the innerHTML of elements within the product element.
     * @param {string} selector - CSS selector for the element.
     * @param {...*} additionalSelectors - Additional CSS selectors for elements.
     * @returns {?string}
     */
    getElementHtml(selector, ...additionalSelectors) {
      const selectors = [selector].concat(additionalSelectors);
      let html = '';
      selectors.forEach((sel) => {
        const els = this.productEl.querySelectorAll(sel);
        Array.from(els).forEach((el) => {
          html += el.innerHTML;
        });
      });
      return html;
    }

    /**
     * Shows an "Added to cart" message in the drawer.
     */
    addedToCart() {
      this.notification.hidden = false;
    }

    /**
     * Replace script elements with new ones, thereby triggering a download.
     * @param {HTMLElement} el - Container to search for script elements.
     */
    static restoreScripts(el) {
      Array.from(el.querySelectorAll('script'))
        .forEach((oldScriptEl) => {
          const newScriptEl = document.createElement('script');

          Array.from(oldScriptEl.attributes).forEach((attr) => {
            newScriptEl.setAttribute(attr.name, attr.value);
          });

          const scriptText = document.createTextNode(oldScriptEl.innerHTML);
          newScriptEl.appendChild(scriptText);

          oldScriptEl.parentNode.replaceChild(newScriptEl, oldScriptEl);
        });
    }
  }

  customElements.define('quick-add-drawer', QuickAddDrawer);
}
