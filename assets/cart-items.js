/* global debounce, trapFocus */

if (!customElements.get('cart-items')) {
  class CartItems extends HTMLElement {
    constructor() {
      super();
      if (this.dataset.empty === 'false') this.init();
    }

    init() {
      this.fetchRequestOpts = {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      };

      this.cartDrawer = document.getElementById('cart-drawer');
      this.itemStatus = document.getElementById('cart-line-item-status');
      this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
        .reduce((total, quantityInput) => total + parseInt(quantityInput.value, 10), 0);

      this.addEventListener('click', this.handleClick.bind(this));
      this.addEventListener('change', debounce(this.handleChange.bind(this)));
    }

    /**
     * Handles 'click' events on the cart items element.
     * @param {object} evt - Event object.
     */
    handleClick(evt) {
      if (!evt.target.matches('.js-remove-item')) return;
      evt.preventDefault();
      this.updateQuantity(evt.target.dataset.index, 0);
    }

    /**
     * Handles 'change' events on the cart items element.
     * @param {object} evt - Event object.
     */
    handleChange(evt) {
      this.updateQuantity(evt.target.dataset.index, evt.target.value, document.activeElement.name);
    }

    /**
     * Updates the quantity of a line item.
     * @param {number} line - Line item index.
     * @param {number} quantity - Quantity to set.
     * @param {string} name - Active element name.
     */
    async updateQuantity(line, quantity, name) {
      this.enableLoading(line);

      this.fetchRequestOpts.body = JSON.stringify({
        line,
        quantity,
        sections: this.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname
      });

      try {
        const response = await fetch(`${theme.routes.cartChange}`, this.fetchRequestOpts);
        if (!response.ok) throw new Error(response.status);
        const data = await response.json();

        if (this.cartDrawer) {
          this.cartDrawer.querySelector('.drawer__content').classList.toggle('flex', data.item_count === 0);

          if (data.item_count === 0) {
            const recommendations = this.cartDrawer.querySelector('product-recommendations');
            if (recommendations) recommendations.remove();
          }
        }

        this.getSectionsToRender().forEach((section) => {
          const sectionEl = document.getElementById(section.id);
          if (!sectionEl) return;

          const el = sectionEl.querySelector(section.selector) || sectionEl;
          el.innerHTML = CartItems.getElementHTML(data.sections[section.section], section.selector);
        });

        this.updateRecommendations(data);
        this.updateLiveRegions(line, data.item_count);
        this.setFocus(line, data.item_count, name);
        this.dataset.empty = data.item_count === 0;
        this.dispatchEvent(new CustomEvent('on:line-item:change', {
          bubbles: true,
          detail: {
            cart: data
          }
        }));
      } catch (error) {
        const errors = document.getElementById('cart-errors');
        errors.textContent = theme.strings.cartError;
        errors.hidden = false;
        console.log(error); // eslint-disable-line

        this.querySelectorAll('.cart-item__loader').forEach((loader) => {
          loader.hidden = true;
        });

        this.dispatchEvent(new CustomEvent('on:cart:error', {
          bubbles: true,
          detail: {
            error: error.message
          }
        }));
      } finally {
        this.classList.remove('pointer-events-none');
      }
    }

    /**
     * Returns an array of objects containing required section details.
     * @returns {Array}
     */
    getSectionsToRender() {
      let sections = [
        {
          id: 'cart-icon-bubble',
          section: 'cart-icon-bubble',
          selector: '.shopify-section'
        },
        {
          id: 'cart-drawer',
          section: this.dataset.section,
          selector: '.js-drawer-header-title'
        },
        {
          id: 'cart-items',
          section: this.dataset.section,
          selector: 'cart-items'
        },
        {
          id: 'free-shipping-notice',
          section: this.dataset.section,
          selector: '.free-shipping-notice'
        }
      ];

      if (this.cartDrawer) {
        sections = [
          ...sections,
          {
            id: 'cart-drawer',
            section: this.dataset.section,
            selector: '.drawer__footer'
          }
        ];
      } else {
        sections = [
          ...sections,
          {
            id: 'cart-summary',
            section: document.getElementById('cart-summary').dataset.section,
            selector: '.cart__summary'
          }
        ];
      }

      return sections;
    }

    /**
     * Gets the innerHTML of an element.
     * @param {string} html - Section HTML.
     * @param {string} selector - CSS selector for the element to get the innerHTML of.
     * @returns {string}
     */
    static getElementHTML(html, selector) {
      const tmpl = document.createElement('template');
      tmpl.innerHTML = html;

      const el = tmpl.content.querySelector(selector);
      return el ? el.innerHTML : '';
    }

    /**
     * Shows a loading icon over a line item.
     * @param {string} line - Line item index.
     */
    enableLoading(line) {
      this.classList.add('pointer-events-none');

      const loader = this.querySelector(`#cart-item-${line} .cart-item__loader`);
      if (loader) loader.hidden = false;

      document.activeElement.blur();
      this.itemStatus.setAttribute('aria-hidden', 'false');
    }

    /**
     * Updates the cart recommendations.
     * @param {object} data - Cart data object.
     */
    updateRecommendations(data) {
      this.recommendations = this.recommendations || document.getElementById('cart-recommendations');
      if (!this.recommendations) return;

      if (data.item_count > 0) {
        this.recommendations.dataset.productId = data.items[0].product_id;
        this.recommendations.init();
      } else {
        this.recommendations.innerHTML = '';
      }
    }

    /**
     * Updates the live regions.
     * @param {number} line - Line item index.
     * @param {number} itemCount - Item count.
     */
    updateLiveRegions(line, itemCount) {
      if (itemCount === this.currentItemCount) {
        const itemError = document.getElementById(`line-item-error-${line}`);
        const itemQty = document.getElementById(`quantity-${line}`);
        itemError.innerHTML = theme.strings.cartQtyError.replace('[quantity]', itemQty.value);
        itemError.hidden = false;
      }

      this.currentItemCount = itemCount;
      this.itemStatus.setAttribute('aria-hidden', 'true');

      const cartStatus = document.getElementById('cart-live-region-text');
      cartStatus.setAttribute('aria-hidden', 'false');

      setTimeout(() => {
        cartStatus.setAttribute('aria-hidden', 'true');
      }, 1000);
    }

    /**
     * Traps focus in the relevant container or focuses the active element.
     * @param {number} line - Line item index.
     * @param {number} itemCount - Item count.
     * @param {string} name - Active element name.
     */
    setFocus(line, itemCount, name) {
      const lineItem = document.getElementById(`cart-item-${line}`);
      let activeEl;

      if (lineItem) {
        activeEl = lineItem.querySelector(`[name="${name}"]`);
      }

      if (this.cartDrawer) {
        if (lineItem && activeEl) {
          trapFocus(this.cartDrawer, activeEl);
        } else if (itemCount === 0) {
          trapFocus(this.cartDrawer.querySelector('.js-cart-empty'), this.cartDrawer.querySelector('a'));
        } else if (this.cartDrawer.querySelector('.cart-item')) {
          trapFocus(this.cartDrawer, document.querySelector('.js-item-name'));
        }
      } else if (lineItem && activeEl) {
        activeEl.focus();
      }
    }
  }

  customElements.define('cart-items', CartItems);
}
