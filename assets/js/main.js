/* The Sports Shed Co. — landing page behaviour.
   Three small jobs: the mobile menu, the lot rail (tabs + scroll),
   and the Thursday-drop signup. No dependencies. */
(function () {
  'use strict';

  /* ---------- mobile menu ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  if (burger && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        burger.focus();
      }
    });
  }

  /* ---------- lot rail ---------- */
  var rail = document.getElementById('rail');

  if (rail) {
    var lots = Array.prototype.slice.call(rail.querySelectorAll('.lot'));
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    var count = document.getElementById('railcount');
    var labels = { best: 'best-selling', 'new': 'newly arrived' };

    var applyFilter = function (key) {
      var shown = 0;
      lots.forEach(function (lot) {
        var match = lot.getAttribute('data-list').split(' ').indexOf(key) > -1;
        lot.hidden = !match;
        if (match) shown++;
      });
      tabs.forEach(function (tab) {
        var on = tab.getAttribute('data-filter') === key;
        tab.classList.toggle('is-on', on);
        tab.setAttribute('aria-selected', String(on));
      });
      if (count) {
        count.textContent = 'Showing ' + shown + ' ' + labels[key] + ' lot' + (shown === 1 ? '' : 's');
      }
      rail.scrollTo({ left: 0, behavior: 'smooth' });
    };

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        applyFilter(tab.getAttribute('data-filter'));
      });
    });

    document.querySelectorAll('[data-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = Number(btn.getAttribute('data-scroll'));
        var card = rail.querySelector('.lot:not([hidden])');
        var step = card ? card.getBoundingClientRect().width + 14 : rail.clientWidth * 0.8;
        var pages = Math.max(1, Math.floor((rail.clientWidth - 40) / step));
        rail.scrollBy({ left: dir * step * pages, behavior: 'smooth' });
      });
    });
  }

  /* ---------- Thursday drop signup ---------- */
  var form = document.getElementById('dropform');

  if (form) {
    var input = document.getElementById('dropemail');
    var msg = document.getElementById('dropmsg');
    var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();

      if (!valid.test(value)) {
        input.setAttribute('aria-invalid', 'true');
        msg.dataset.state = 'error';
        msg.textContent = 'That address looks incomplete — check for a typo and try again.';
        input.focus();
        return;
      }

      input.removeAttribute('aria-invalid');
      msg.dataset.state = 'ok';
      msg.textContent = "You're on the list. Wednesday's catalogue lands at 9:00 PM ET.";
      form.querySelector('button[type="submit"]').disabled = true;
      input.disabled = true;
    });

    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') {
        input.removeAttribute('aria-invalid');
        msg.textContent = '';
        delete msg.dataset.state;
      }
    });
  }
})();

/* FAQ / consign accordions (<details class nothing, targeted via .qa).
   Native <details> has no open/close transition — content just pops.
   Animate height with the Web Animations API: hardware-accelerated,
   interruptible (a fast double-click doesn't glitch), no library.
   Mirrors the --ease-out token in styles.css — keep both in sync. */
(function () {
  'use strict';

  var items = document.querySelectorAll('.qa details');
  if (!items.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

  items.forEach(function (details) {
    var summary = details.querySelector('summary');
    var body = details.querySelector('.qa__body');
    if (!summary || !body) return;

    var animation = null;
    var isClosing = false;
    var isExpanding = false;

    summary.addEventListener('click', function (e) {
      if (reduceMotion) return; // let the native toggle happen instantly
      e.preventDefault();
      if (isClosing || !details.open) {
        expand();
      } else if (isExpanding || details.open) {
        shrink();
      }
    });

    function shrink() {
      isClosing = true;
      var startHeight = details.offsetHeight + 'px';
      var endHeight = summary.offsetHeight + 'px';
      if (animation) animation.cancel();
      animation = details.animate(
        { height: [startHeight, endHeight] },
        { duration: 220, easing: EASE_OUT }
      );
      animation.onfinish = function () { onFinish(false); };
      animation.oncancel = function () { isClosing = false; };
    }

    function expand() {
      details.style.height = details.offsetHeight + 'px';
      details.open = true;
      window.requestAnimationFrame(function () {
        isExpanding = true;
        var startHeight = details.offsetHeight + 'px';
        var endHeight = summary.offsetHeight + body.offsetHeight + 'px';
        if (animation) animation.cancel();
        animation = details.animate(
          { height: [startHeight, endHeight] },
          { duration: 260, easing: EASE_OUT }
        );
        animation.onfinish = function () { onFinish(true); };
        animation.oncancel = function () { isExpanding = false; };
      });
    }

    function onFinish(open) {
      details.open = open;
      animation = null;
      isClosing = false;
      isExpanding = false;
      details.style.height = '';
    }
  });
})();

/* Consignment submission (consign.html).
   NOTE: there is no backend yet — see the TODO in consign.html. This validates
   and confirms client-side only; wire `send` to your form handler before launch. */
(function () {
  'use strict';

  var form = document.getElementById('consignform');
  if (!form) return;

  var msg = document.getElementById('consignmsg');
  var button = form.querySelector('button[type="submit"]');
  var email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var fail = function (field, text) {
    field.setAttribute('aria-invalid', 'true');
    msg.dataset.state = 'error';
    msg.textContent = text;
    field.focus();
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var required = form.querySelectorAll('[required]');
    for (var i = 0; i < required.length; i++) {
      var field = required[i];

      if (field.type === 'checkbox') {
        if (!field.checked) {
          return fail(field, 'Please confirm you own this piece or are authorised to consign it.');
        }
        continue;
      }
      if (!field.value.trim()) {
        var label = form.querySelector('label[for="' + field.id + '"]');
        var name = label ? label.textContent.replace(/optional/i, '').trim().toLowerCase() : 'this field';
        return fail(field, 'Still needed: ' + name + '.');
      }
      if (field.type === 'email' && !email.test(field.value.trim())) {
        return fail(field, 'That email address looks incomplete — check for a typo.');
      }
      field.removeAttribute('aria-invalid');
    }

    msg.dataset.state = 'ok';
    msg.textContent = 'Submitted. One of the four of us will reply within two business days.';
    button.disabled = true;
    form.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.disabled = true;
    });
  });

  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true') {
      e.target.removeAttribute('aria-invalid');
      msg.textContent = '';
      delete msg.dataset.state;
    }
  });
})();
