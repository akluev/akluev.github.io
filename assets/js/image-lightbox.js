// Click any content image to view it in a full-viewport pop-up.
// Opt out with class="no-lightbox" (Kramdown: {: .no-lightbox }).
// Images wrapped in a link keep the link, e.g. tall diagrams that open in their own tab.
(function () {
  var EXCLUDE = '.no-lightbox, .brand-logo, .nationality-flags img';
  var dialog, dialogImg, dialogCaption;

  function buildDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Enlarged image');

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'lightbox-close';
    close.setAttribute('aria-label', 'Close enlarged image');
    close.textContent = '×';

    var figure = document.createElement('figure');
    dialogImg = document.createElement('img');
    dialogCaption = document.createElement('figcaption');
    figure.appendChild(dialogImg);
    figure.appendChild(dialogCaption);

    dialog.appendChild(close);
    dialog.appendChild(figure);
    document.body.appendChild(dialog);

    // Any click or tap inside the pop-up closes it; Esc is handled by <dialog>.
    dialog.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('close', function () {
      document.documentElement.classList.remove('lightbox-open');
      dialogImg.removeAttribute('src');
    });
  }

  function open(img) {
    if (!dialog) buildDialog();
    var src = img.currentSrc || img.src;
    var figure = img.closest('figure');
    var caption = figure && figure.querySelector('figcaption');

    dialogImg.src = src;
    dialogImg.alt = img.alt;
    dialogImg.classList.toggle('is-vector', /\.svg(\?|#|$)/i.test(src));
    dialogCaption.textContent = caption ? caption.textContent.trim() : '';
    dialogCaption.hidden = !caption;

    document.documentElement.classList.add('lightbox-open');
    dialog.showModal();
  }

  document.querySelectorAll('main img').forEach(function (img) {
    if (img.matches(EXCLUDE) || img.closest('a')) return;

    img.classList.add('zoomable');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'Enlarge image' + (img.alt ? ': ' + img.alt : ''));
    img.addEventListener('click', function () { open(img); });
    img.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(img);
      }
    });
  });
})();
