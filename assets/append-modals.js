if (!customElements.get('append-modals')) {
  class AppendModals extends HTMLElement {
    connectedCallback() {
      this.querySelectorAll('modal-dialog').forEach((el) => {
        this.append(el);
      });
    }
  }

  customElements.define('append-modals', AppendModals);
}
