/* Homepage presentation only. Existing quote, Turnstile and email code is unchanged. */
(() => {
  const facilities = [...document.querySelectorAll('.sr-facility')];
  facilities.forEach(current => {
    current.addEventListener('toggle', () => {
      if (current.open) facilities.forEach(other => { if (other !== current) other.open = false; });
    });
  });

  document.querySelectorAll('[data-sr-quote-service], [data-sr-contact]').forEach(link => {
    link.addEventListener('click', event => {
      const contact = document.getElementById('contact');
      const select = document.querySelector('#quoteForm select[name="service"]');
      if (!contact) return;
      const service = link.dataset.srQuoteService;
      if (service && select && [...select.options].some(option => option.value === service)) {
        select.value = service;
        select.dispatchEvent(new Event('change', {bubbles:true}));
      }
      event.preventDefault();
      history.replaceState(null, '', '#contact');
      const header = document.querySelector('.site-header');
      const y = contact.getBoundingClientRect().top + window.scrollY - (header?.offsetHeight || 0) - 12;
      window.scrollTo({top:y,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
      const name = contact.querySelector('input[name="name"]');
      name?.focus({preventScroll:true});
    });
  });

  const dialog = document.querySelector('.sr-video-dialog');
  const player = dialog?.querySelector('video');
  const title = dialog?.querySelector('#sr-player-title');
  const closeButton = dialog?.querySelector('.sr-player-close');
  let opener;
  if (!dialog || !player || typeof dialog.showModal !== 'function') return;
  document.querySelectorAll('[data-sr-video]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      opener = link;
      title.textContent = link.dataset.title;
      player.src = link.href;
      player.poster = link.dataset.poster;
      player.setAttribute('aria-label', link.dataset.title);
      dialog.showModal();
      closeButton.focus();
      player.play().catch(() => { /* Native controls remain available. */ });
    });
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    player.pause();
    player.removeAttribute('src');
    player.load();
    opener?.focus({preventScroll:true});
  });
})();
