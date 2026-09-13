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
