if (!customElements.get('product-form')) {
  class ProductForm extends HTMLElement {
    constructor() {
      super();
      if (this.hasChildNodes()) this.init();
    }

    init() {
      this.form = this.querySelector('.js-product-form');
      this.form.querySelector('[name="id"]').disabled = false;
      this.cartDrawer = document.querySelector('cart-drawer');
      this.submitBtn = this.querySelector('[name="add"]');

      if (theme.settings.afterAtc !== 'no-js') {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
      }
    }

    /**
     * Handles submission of the product form.
     * @param {object} evt - Event object.
     */
    async handleSubmit(evt) {
      if (window.location.pathname === theme.routes.cart) return;

      evt.preventDefault();

      if (this.submitBtn.getAttribute('aria-disabled') === 'true') return;

      this.errorMsg = null;
      this.setErrorMsgState();

      // Disable "Add to Cart" button until submission is complete.
      this.submitBtn.setAttribute('aria-disabled', 'true');
      this.submitBtn.classList.add('is-loading');
      this.submitBtn.setAttribute('disabled', 'disabled');

      const formData = new FormData(this.form);
      const sections = this.cartDrawer ? `${this.cartDrawer.dataset.section},cart-icon-bubble` : 'cart-icon-bubble';

      formData.append('sections_url', window.location.pathname);
      formData.append('sections', sections);

      const fetchRequestOpts = {
        method: 'POST',
        headers: {
          Accept: 'application/javascript',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
      };

      try {
        const oldCartResponse = await fetch(`${theme.routes.cart}.js`);
        if (!oldCartResponse.ok) throw new Error(oldCartResponse.status);
        const oldCartData = await oldCartResponse.json();

        const response = await fetch(theme.routes.cartAdd, fetchRequestOpts);
        const data = await response.json();
        const error = typeof data.description === 'string' ? data.description : data.message;

        if (data.status) this.setErrorMsgState(error);

        if (!response.ok) throw new Error(response.status);

        if (theme.settings.afterAtc === 'page') {
          // Allow the tick animation to complete
          setTimeout(() => {
            window.location.href = theme.routes.cart;
          }, 300);
        } else {
          // Update cart icon count.
          ProductForm.updateCartIcon(data);

          // If item was added from Quick Add drawer, show "Added to cart" message.
          const quickAddDrawer = this.closest('quick-add-drawer');
          if (quickAddDrawer) quickAddDrawer.addedToCart();

          setTimeout(() => {
            // Update cart drawer contents.
            if (this.cartDrawer) {
              this.cartDrawer.renderContents(
                data,
                !quickAddDrawer && theme.settings.afterAtc === 'drawer'
              );
            } else if (window.location.pathname === theme.routes.cart) {
              const cartItems = document.querySelector('cart-items');
              if (cartItems) {
                if (cartItems.dataset.empty === 'true') {
                  window.location.reload();
                } else {
                  cartItems.refresh();
                }
              }
            }
          }, 700);
        }

        const newCartResponse = await fetch(`${theme.routes.cart}.js`);
        if (!newCartResponse.ok) throw new Error(newCartResponse.status);
        const newCartData = await newCartResponse.json();
        const itemInOldCart = oldCartData.items.filter(
          (item) => item.variant_id === data.variant_id
        )[0];

        // Check if product was already in the cart
        if (itemInOldCart) {
          this.dispatchEvent(new CustomEvent('on:line-item:change', {
            bubbles: true,
            detail: {
              cart: newCartData,
              variantId: data.variant_id,
              oldQuantity: itemInOldCart.quantity,
              newQuantity: (itemInOldCart.quantity === data.quantity)
                ? itemInOldCart.quantity : data.quantity
            }
          }));
        } else {
          this.dispatchEvent(new CustomEvent('on:cart:add', {
            bubbles: true,
            detail: {
              cart: newCartData,
              variantId: data.variant_id
            }
          }));
        }

        // Re-enable 'Add to Cart' button.
        this.submitBtn.classList.add('is-success');
        this.submitBtn.removeAttribute('aria-disabled');
        setTimeout(() => {
          this.submitBtn.classList.remove('is-loading');
          this.submitBtn.classList.remove('is-success');
          this.submitBtn.removeAttribute('disabled');
        }, 2000);
      } catch (error) {
        console.log(error); // eslint-disable-line
        this.dispatchEvent(new CustomEvent('on:cart:error', {
          bubbles: true,
          detail: {
            error: this.errorMsg.textContent
          }
        }));

        // Re-enable 'Add to Cart' button.
        this.submitBtn.classList.remove('is-loading');
        this.submitBtn.classList.remove('is-success');
        this.submitBtn.removeAttribute('disabled');
        this.submitBtn.removeAttribute('aria-disabled');

        // Reload cart drawer
        if (this.cartDrawer) this.cartDrawer.refresh(true);
      }
    }

    /**
     * Updates the cart icon count in the header.
     * @param {object} response - Response JSON.
     */
    static updateCartIcon(response) {
      const cartIconBubble = document.getElementById('cart-icon-bubble');
      cartIconBubble.innerHTML = response.sections['cart-icon-bubble'];
    }

    /**
     * Shows/hides an error message.
     * @param {string} [error=false] - Error to show a message for.
     */
    setErrorMsgState(error = false) {
      this.errorMsg = this.errorMsg || this.querySelector('.js-form-error');
      if (!this.errorMsg) return;

      this.errorMsg.hidden = !error;
      if (error) this.errorMsg.textContent = error;
    }
  }

  customElements.define('product-form', ProductForm);
}
