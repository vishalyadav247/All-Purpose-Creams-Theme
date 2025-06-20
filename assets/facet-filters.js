/* global SideDrawer */

if (!customElements.get('facet-filters')) {
  class FacetFilters extends SideDrawer {
    constructor() {
      super();
      this.filteringEnabled = this.dataset.filtering === 'true';
      this.sortingEnabled = this.dataset.sorting === 'true';
      this.results = document.getElementById('filter-results');

      if ((!this.filteringEnabled && !this.sortingEnabled) || !this.results) return;
      window.initLazyScript(this, this.init.bind(this));
    }

    init() {
      this.resultsCountEl = document.getElementById('results-count');
      this.form = document.getElementById('facets');

      if (this.filteringEnabled) {
        this.showFiltersBtn = document.querySelector('.js-show-filters');
        this.filters = this.querySelector('.facets__filters');
        this.activeFilters = document.querySelector('.active-filters');
        this.footer = this.querySelector('.facets__footer');
        this.filtersOpen = this.dataset.filtersOpen;

        this.showFiltersBtn.addEventListener('click', this.showFilters.bind(this));
        this.filters.addEventListener('click', this.handleFiltersClick.bind(this));
        this.filters.addEventListener('input', window.debounce(this.handleFilterChange.bind(this), 300));
        this.activeFilters.addEventListener('click', this.handleActiveFiltersClick.bind(this));
      }

      if (this.sortingEnabled) {
        this.desktopSortBy = document.getElementById('sort-by');
        this.desktopSortBy.addEventListener('change', this.handleFilterChange.bind(this));
      }

      window.addEventListener('popstate', this.handleHistoryChange.bind(this));
      window.addEventListener('on:debounced-resize', this.handleWindowResize.bind(this));

      this.handleWindowResize();
    }

    /**
     * Opens the filters drawer.
     */
    showFilters() {
      this.open(this.showFiltersBtn);
    }

    /**
     * Handles 'input' events on the filters and 'change' events on the sort by dropdown.
     * @param {object} evt - Event object.
     */
    handleFilterChange(evt) {
      const formData = new FormData(this.form);
      const searchParams = new URLSearchParams(formData);
      const emptyParams = [];

      if (this.sortingEnabled) {
        // Sync selected values of mobile and desktop 'sort by' dropdowns.
        if (evt.target === this.desktopSortBy) {
          const mobileSortBy = this.querySelector(`#drawer-sort-by input[name="sort_by"][value="${this.desktopSortBy.value}"]`);
          if (mobileSortBy) {
            mobileSortBy.checked = true;
          }
        } else if (evt.target.name === 'sort_by') {
          this.desktopSortBy.value = evt.target.value;
        }

        // Remove duplicate 'sort_by' parameters.
        searchParams.set('sort_by', this.desktopSortBy.value);
      }

      // Get empty parameters.
      searchParams.forEach((value, key) => {
        if (!value) emptyParams.push(key);
      });

      // Remove empty parameters.
      emptyParams.forEach((key) => {
        searchParams.delete(key);
      });

      this.applyFilters(searchParams.toString());
    }

    /**
     * Handles 'click' events on the filters.
     * @param {object} evt - Event object.
     */
    handleFiltersClick(evt) {
      const { target } = evt;

      // Filter 'clear' button clicked.
      if (target.matches('.js-clear-filter')) {
        evt.preventDefault();
        this.applyFilters(new URL(evt.target.href).searchParams.toString());
      }

      // Filter 'show more' button clicked.
      if (target.matches('.js-show-more')) {
        const filter = target.closest('.filter');
        target.remove();

        filter.querySelectorAll('li').forEach((el) => {
          el.classList.remove('js-hidden');
        });
      }
    }

    /**
     * Handles 'click' events on the active filters.
     * @param {object} evt - Event object.
     */
    handleActiveFiltersClick(evt) {
      if (evt.target.tagName !== 'A') return;
      evt.preventDefault();
      this.applyFilters(new URL(evt.target.href).searchParams.toString());
    }

    /**
     * Handles history changes (e.g. back button clicked).
     * @param {object} evt - Event object.
     */
    handleHistoryChange(evt) {
      let searchParams = '';

      if (evt.state && evt.state.searchParams) {
        ({ searchParams } = evt.state);
      }

      this.applyFilters(searchParams, false);
    }

    /**
     * Handles debounced 'resize' events on the window.
     */
    handleWindowResize() {
      if (!theme.mediaMatches.md) {
        this.querySelectorAll('.filter').forEach((el) => {
          el.open = false;
          el.classList.remove('is-open');
        });
      } else {
        this.querySelectorAll('.filter').forEach((el, index) => {
          if (this.filtersOpen === 'all' || (this.filtersOpen === 'some' && index < 5)) {
            el.open = true;
            el.classList.add('is-open');
          }
        });
      }
    }

    /**
     * Fetches the filtered/sorted page data and updates the current page.
     * @param {string} searchParams - Filter/sort search parameters.
     * @param {boolean} [updateUrl=true] - Update url with the selected options.
     */
    async applyFilters(searchParams, updateUrl = true) {
      this.results.classList.add('is-loading');

      // Fetch filtered products markup.
      const response = await fetch(`${window.location.pathname}?${searchParams}`);

      if (response.ok) {
        const tmpl = document.createElement('template');
        tmpl.innerHTML = await response.text();

        // Update the filters.
        if (this.filteringEnabled) this.updateFilters(tmpl.content);

        // Update the results.
        this.results.innerHTML = tmpl.content.getElementById('filter-results').innerHTML;

        // Update the URL.
        if (updateUrl) FacetFilters.updateURL(searchParams);
      }

      this.results.classList.remove('is-loading');
    }

    /**
     * Updates the filters with the fetched data.
     * @param {string} html - HTML of the fetched document.
     */
    updateFilters(html) {
      // Save current focus
      const currentFocusId = document.activeElement ? document.activeElement.id : null;

      // Save open filters
      const openedFilterIDs = [];
      this.querySelectorAll('.filter[open]').forEach((el) => openedFilterIDs.push(el.id));

      // Update filters
      this.filters.innerHTML = html.querySelector('.facets__filters').innerHTML;

      // Restore open filters
      openedFilterIDs.forEach((id) => {
        this.querySelectorAll(`#${CSS.escape(id)}`).forEach((el) => { el.open = true; });
      });

      // Preserve focus
      if (currentFocusId) {
        const focusEl = this.filters.querySelector(`#${CSS.escape(currentFocusId)}`);
        if (focusEl) focusEl.focus();
      }

      // Update total
      this.updateResultsTotal(html);

      // Update active filters.
      this.updateActiveFilters(html);

      // Update '[x] results' button (mobile only).
      const footerEl = html.querySelector('.facets__footer');
      this.footer.innerHTML = footerEl.innerHTML;
    }

    /**
     * Updates the result count.
     * @param {string} html - HTML of the fetched page.
     */
    updateResultsTotal(html) {
      if (this.resultsCountEl) {
        this.resultsCountEl.innerHTML = html.querySelector('#results-count').innerHTML;
      }
    }

    /**
     * Updates the active filters.
     * @param {string} html - HTML of the fetched page.
     */
    updateActiveFilters(html) {
      this.activeFilters.innerHTML = html.querySelector('.active-filters').innerHTML;
      this.activeFilters.hidden = !this.activeFilters.querySelector('.active-filters__item');
    }

    /**
     * Updates the url with the current filter/sort parameters.
     * @param {string} searchParams - Filter/sort parameters.
     */
    static updateURL(searchParams) {
      window.history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
    }
  }

  customElements.define('facet-filters', FacetFilters);
}
