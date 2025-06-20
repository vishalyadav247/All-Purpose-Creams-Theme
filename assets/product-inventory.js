if (!customElements.get('product-inventory')) {
  class ProductInventory extends HTMLElement {
    constructor() {
      super();
      window.initLazyScript(this, this.initLazySection.bind(this));
    }

    initLazySection() {
      this.threshold = parseInt(this.dataset.threshold, 10);
      this.productInventory = this.querySelector('.product-inventory');
      this.inventoryNotice = this.querySelector('.product-inventory__status');
      this.variantInventory = this.getVariantInventory();

      this.closest('.js-product').addEventListener('on:variant:change', this.handleVariantChange.bind(this));
    }

    /**
     * Gets the inventory data for all product variants
     * @returns {?object}
     */
    getVariantInventory() {
      const dataEl = this.querySelector('[type="application/json"]');
      return this.variantInventory || JSON.parse(dataEl.textContent);
    }

    /**
     * Handles a 'change' event on the variant picker element
     * @param {object} evt - Event object
     */
    handleVariantChange(evt) {
      this.updateInventory(
        evt.detail.variant
          ? this.variantInventory.find((v) => v.id === evt.detail.variant.id)
          : null
      );
    }

    /**
     *
     * Updates the inventory notice
     * @param {?object} inventory - the inventory data
     */
    updateInventory(inventory) {
      if (!inventory) {
        this.productInventory.hidden = true;
        return;
      }

      const count = inventory.inventory_quantity;
      const showCount = this.dataset.showInventoryCount === 'always'
        || (
          this.dataset.showInventoryCount === 'low'
          && count <= this.threshold
        );

      let notice = null;
      if (showCount) {
        if (count <= this.threshold) {
          notice = this.dataset.textXLeftLow.replace('[QTY]', count);
        } else {
          notice = this.dataset.textXLeftOk.replace('[QTY]', count);
        }
      } else {
        // eslint-disable-next-line no-lonely-if
        if (count <= this.threshold) {
          notice = this.dataset.textLow;
        } else {
          notice = this.dataset.textOk;
        }
      }

      this.productInventory.classList.toggle('product-inventory--low', count <= this.threshold);
      this.productInventory.classList.toggle('product-inventory--ok', count > this.threshold);
      this.querySelector('.product-inventory__icon-low').toggleAttribute('hidden', count > this.threshold);
      this.querySelector('.product-inventory__icon-ok').toggleAttribute('hidden', count <= this.threshold);
      this.inventoryNotice.innerText = notice;
      this.productInventory.hidden = false;
    }
  }

  customElements.define('product-inventory', ProductInventory);
}
