/* Shop page only. Fetches the live product list from /api/products
   (which reads straight from Stripe's Product catalog — that's the
   inventory system, there's no separate database) and renders it. A
   "Buy now" click posts to /api/checkout for that item's price and
   redirects to the Stripe Checkout page it returns. */
(function () {
  'use strict';

  var root = document.getElementById('shop-root');
  if (!root) return;

  function money(amount, currency) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: (currency || 'usd').toUpperCase()
      }).format(amount / 100);
    } catch (e) {
      return '$' + (amount / 100).toFixed(2);
    }
  }

  function buildCard(item) {
    var li = document.createElement('li');
    li.className = 'shop-card';
    li.innerHTML =
      '<div class="shop-card__img">' +
      (item.image ? '<img alt="" loading="lazy">' : '') +
      '</div>' +
      '<div class="shop-card__body">' +
      '<h3 class="shop-card__name"></h3>' +
      '<p class="shop-card__desc"></p>' +
      '<p class="shop-card__price"></p>' +
      '<button class="btn btn--primary shop-card__buy" type="button">Buy now</button>' +
      '<p class="shop-card__msg" role="status"></p>' +
      '</div>';

    var img = li.querySelector('img');
    if (img) img.src = item.image;
    li.querySelector('.shop-card__name').textContent = item.name;
    li.querySelector('.shop-card__desc').textContent = item.description || '';
    li.querySelector('.shop-card__price').textContent = money(item.amount, item.currency);

    var btn = li.querySelector('.shop-card__buy');
    var msg = li.querySelector('.shop-card__msg');

    btn.addEventListener('click', function () {
      btn.disabled = true;
      delete msg.dataset.state;
      msg.textContent = 'Taking you to checkout…';

      // One random key per click, sent to /api/checkout and on to Stripe.
      // If the browser or network silently retries this exact request, the
      // retry carries the same key — Stripe returns the original Checkout
      // Session instead of creating a duplicate one.
      var idempotencyKey =
        window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : String(Date.now()) + '-' + Math.random().toString(36).slice(2);

      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: item.priceId, idempotencyKey: idempotencyKey })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { httpOk: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.httpOk && result.data && result.data.ok && result.data.url) {
            window.location.href = result.data.url;
            return;
          }
          throw new Error((result.data && result.data.message) || '');
        })
        .catch(function (err) {
          btn.disabled = false;
          msg.dataset.state = 'error';
          msg.textContent = err.message || "That didn't go through — try again in a moment.";
        });
    });

    return li;
  }

  function render(items) {
    if (!items.length) {
      root.innerHTML =
        '<p class="shop-state">Nothing listed right now — check back soon, or ' +
        '<a href="index.html#notify">leave your email</a> to hear the moment something goes up.</p>';
      return;
    }
    var grid = document.createElement('ul');
    grid.className = 'shop-grid';
    items.forEach(function (item) {
      grid.appendChild(buildCard(item));
    });
    root.innerHTML = '';
    root.appendChild(grid);
  }

  if (/[?&]cancelled=1\b/.test(window.location.search)) {
    var note = document.createElement('p');
    note.className = 'shop-state';
    note.setAttribute('role', 'status');
    note.textContent = 'No charge was made — that item is still available.';
    root.parentNode.insertBefore(note, root);
  }

  fetch('/api/products')
    .then(function (response) {
      return response.json().then(function (data) {
        return { httpOk: response.ok, data: data };
      });
    })
    .then(function (result) {
      if (result.httpOk && result.data && result.data.ok) {
        render(result.data.items || []);
        return;
      }
      throw new Error();
    })
    .catch(function () {
      root.innerHTML =
        '<p class="shop-state" data-state="error">Couldn’t load the shop right now — refresh, ' +
        'or email <a href="mailto:support@pandasportsmemorabilia.com">support@pandasportsmemorabilia.com</a> ' +
        'if it keeps happening.</p>';
    });
})();
