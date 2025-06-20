class ArticleProducts extends HTMLElement {
  constructor() {
    super();
    this.contentProdsEl = document.querySelector('.article-products');
    if (!this.contentProdsEl) return;

    window.initLazyScript(this, this.init.bind(this));
  }

  init() {
    this.prodEls = this.contentProdsEl.querySelectorAll('[data-lazy-product-handle]');
    this.ratioSetting = theme.settings.prodCardImageRatio;
    this.ratioValue = this.ratioSetting;

    if (this.ratioSetting === 'shortest') {
      this.ratioValue = 0;
    } else if (this.ratioSetting === 'tallest') {
      this.ratioValue = 99;
    }

    if (Shopify.designMode) {
      document.addEventListener('shopify:section:load', this.loadFeaturedProducts.bind(this));
    }

    this.loadFeaturedProducts();
  }

  /**
   * Loads cards for products mentioned in an article.
   */
  async loadFeaturedProducts() {
    this.contentProdsEl.classList.add('is-loading');

    await Promise.all(Array.from(this.prodEls).map(async (el) => {
      await this.getProduct(el);
    }));

    this.contentProdsEl.querySelectorAll('.prod-image__main').forEach((el) => {
      el.style.paddingTop = `${(1 / this.ratioValue) * 100}%`;
    });

    this.contentProdsEl.classList.remove('is-loading');
  }

  /**
   * Gets the markup for a product card.
   * @param {Element} el - Empty product card element.
   */
  async getProduct(el) {
    try {
      const response = await fetch(`/products/${el.dataset.lazyProductHandle}/?section_id=product-card`);
      if (!response.ok) throw new Error(response.status);

      const tmpl = document.createElement('template');
      tmpl.innerHTML = await response.text();

      if (this.ratioSetting === 'shortest' || this.ratioSetting === 'tallest') {
        const imgMain = tmpl.content.querySelector('.card__main-image');

        if (imgMain) {
          const { paddingTop } = imgMain.style;
          const thisRatio = 1 / (Number(paddingTop.slice(0, -1)) / 100);

          if (this.ratioSetting === 'shortest') {
            if (thisRatio > this.ratioValue) {
              this.ratioValue = thisRatio;
            }
          } else if (thisRatio < this.ratioValue) {
            this.ratioValue = thisRatio;
          }
        }
      }

      el.replaceWith(tmpl.content.querySelector('.card'));
    } catch (error) {
      el.remove();
    }
  }
}

customElements.define('article-products', ArticleProducts);
