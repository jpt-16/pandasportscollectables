/* Shop page only. Fetches the live product list from /api/products
   (which reads straight from Stripe's Product catalog — that's the
   inventory system, there's no separate database) and renders it.
   "Reserve this item" opens an inline order form (name + shipping
   address, no card) that posts to /api/order. No payment happens on
   this page at all — the item is reserved, and the buyer is invoiced
   separately once it ships. */
(function () {
  'use strict';

  var root = document.getElementById('shop-root');
  if (!root) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
      '<button class="btn btn--primary shop-card__buy" type="button">Reserve this item</button>' +
      '<form class="order-form" hidden>' +
      '  <label class="sr">Full name</label>' +
      '  <input class="order-form__name" type="text" autocomplete="name" placeholder="Full name" required>' +
      '  <label class="sr">Email address</label>' +
      '  <input class="order-form__email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>' +
      '  <label class="sr">Address line 1</label>' +
      '  <input class="order-form__address1" type="text" autocomplete="address-line1" placeholder="Street address" required>' +
      '  <label class="sr">Address line 2</label>' +
      '  <input class="order-form__address2" type="text" autocomplete="address-line2" placeholder="Apt / unit (optional)">' +
      '  <label class="sr">City</label>' +
      '  <input class="order-form__city" type="text" autocomplete="address-level2" placeholder="City" required>' +
      '  <label class="sr">State</label>' +
      '  <input class="order-form__state" type="text" autocomplete="address-level1" placeholder="State" required>' +
      '  <label class="sr">ZIP code</label>' +
      '  <input class="order-form__zip" type="text" inputmode="numeric" autocomplete="postal-code" placeholder="ZIP" required>' +
      '  <p class="order-form__fine">US shipping only for now. No card, no payment here — we’ll invoice you once it ships.</p>' +
      '  <div class="hp" aria-hidden="true">' +
      '    <label>Leave this field blank</label>' +
      '    <input class="order-form__hp" type="text" tabindex="-1" autocomplete="off">' +
      '  </div>' +
      '  <div class="order-form__actions">' +
      '    <button class="btn btn--primary" type="submit">Confirm reservation</button>' +
      '    <button class="btn btn--ghost order-form__cancel" type="button">Cancel</button>' +
      '  </div>' +
      '  <p class="signup__msg order-form__msg" role="status"></p>' +
      '</form>' +
      '</div>';

    var img = li.querySelector('img');
    if (img) img.src = item.image;
    li.querySelector('.shop-card__name').textContent = item.name;
    li.querySelector('.shop-card__desc').textContent = item.description || '';
    li.querySelector('.shop-card__price').textContent = money(item.amount, item.currency);

    var buyBtn = li.querySelector('.shop-card__buy');
    var form = li.querySelector('.order-form');
    var cancelBtn = li.querySelector('.order-form__cancel');
    var msg = li.querySelector('.order-form__msg');

    buyBtn.addEventListener('click', function () {
      buyBtn.hidden = true;
      form.hidden = false;
      form.querySelector('.order-form__name').focus();
    });

    cancelBtn.addEventListener('click', function () {
      form.hidden = true;
      buyBtn.hidden = false;
      msg.textContent = '';
      delete msg.dataset.state;
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var honeypot = form.querySelector('.order-form__hp').value.trim();
      var name = form.querySelector('.order-form__name').value.trim();
      var email = form.querySelector('.order-form__email').value.trim();
      var address1 = form.querySelector('.order-form__address1').value.trim();
      var address2 = form.querySelector('.order-form__address2').value.trim();
      var city = form.querySelector('.order-form__city').value.trim();
      var state = form.querySelector('.order-form__state').value.trim();
      var zip = form.querySelector('.order-form__zip').value.trim();

      if (!EMAIL_RE.test(email) || !name || !address1 || !city || !state || !zip) {
        msg.dataset.state = 'error';
        msg.textContent = 'Fill in your name, email and full shipping address.';
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      delete msg.dataset.state;
      msg.textContent = 'Reserving…';

      var idempotencyKey =
        window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : String(Date.now()) + '-' + Math.random().toString(36).slice(2);

      fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: item.priceId,
          name: name,
          email: email,
          address1: address1,
          address2: address2,
          city: city,
          state: state,
          zip: zip,
          company: honeypot,
          idempotencyKey: idempotencyKey
        })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { httpOk: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.httpOk && result.data && result.data.ok) {
            window.location.href = 'shop-success.html';
            return;
          }
          throw new Error((result.data && result.data.message) || '');
        })
        .catch(function (err) {
          submitBtn.disabled = false;
          cancelBtn.disabled = false;
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
