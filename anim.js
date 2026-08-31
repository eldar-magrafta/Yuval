// ============================================================
//  Yuval — shared animation layer for every page.
//  Intro curtain, film grain, magnetic logo, hero lean, and
//  blur-to-sharp scroll reveals. All motion is gated behind
//  prefers-reduced-motion so it degrades to a calm static site.
// ============================================================
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  // ---------------------------------------------------------
  // 1. Hero — letters near the cursor pick up the accent colour
  //    (colour only — no tilt/movement)
  // ---------------------------------------------------------
  (function () {
    if (reduce || !finePointer) return;
    var name = document.getElementById('name');
    if (!name) return;
    var letters = name.querySelectorAll('span');
    name.addEventListener('pointermove', function (e) {
      var r = name.getBoundingClientRect();
      var cx = e.clientX - r.left;
      letters.forEach(function (l) {
        var lr = l.getBoundingClientRect();
        var lc = lr.left - r.left + lr.width / 2;
        var d = (cx - lc) / r.width;            // -1 .. 1
        l.style.color = Math.abs(d) < 0.12 ? 'var(--acc)' : '';
      });
    });
    name.addEventListener('pointerleave', function () {
      letters.forEach(function (l) { l.style.color = ''; });
    });
  })();

  // ---------------------------------------------------------
  // 2. Featured cards — fall from the sky in random order
  //    when the Work section first scrolls into view.
  // ---------------------------------------------------------
  (function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll('#work .feat'));
    if (!cards.length) return;
    if (reduce || !('IntersectionObserver' in window)) return; // leave in place

    // Only on the first visit this session (like the intro curtain) — after
    // that the cards just sit in place with no drop.
    try { if (sessionStorage.getItem('yuval-fell')) return; } catch (e) {}

    // Hide them up-front so nothing flashes in position before the drop.
    cards.forEach(function (c) { c.style.opacity = '0'; c.style.willChange = 'transform,opacity'; });

    var io = new IntersectionObserver(function (entries, obs) {
      var showing = entries.some(function (en) { return en.isIntersecting; });
      if (!showing) return;
      obs.disconnect();
      try { sessionStorage.setItem('yuval-fell', '1'); } catch (e) {}
      cards.forEach(function (c) {
        // random delay → they land a few hundred ms apart, in random order
        var delay = Math.round(Math.random() * 380);
        c.style.animation = 'fall 1.1s linear ' + delay + 'ms both';
        // tidy up once it has landed
        c.addEventListener('animationend', function () {
          c.style.animation = '';
          c.style.opacity = '';
          c.style.willChange = '';
        }, { once: true });
      });
    }, { threshold: 0.2 });
    cards.forEach(function (c) { io.observe(c); });
  })();

  // ---------------------------------------------------------
  // 3. Scroll reveals — blur-to-sharp, gently staggered
  // ---------------------------------------------------------
  (function () {
    var sel = '.row,.ind,.about-grid,.proj,.contact h2,.sec-lead';
    var els = Array.prototype.slice.call(document.querySelectorAll(sel));
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) return; // leave visible

    els.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      el.style.filter = 'blur(6px)';
      el.style.transition = 'opacity .8s cubic-bezier(.22,.61,.36,1),transform .8s cubic-bezier(.22,.61,.36,1),filter .8s cubic-bezier(.22,.61,.36,1)';
      el.style.willChange = 'opacity,transform';
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // stagger by position among siblings for a cascading feel
        var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
        var delay = Math.min(idx, 6) * 70;
        setTimeout(function () {
          el.style.opacity = '1';
          el.style.transform = 'none';
          el.style.filter = 'none';
        }, delay);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) { io.observe(el); });
  })();

  // ---------------------------------------------------------
  // 3. Magnetic logo — pulls gently toward the cursor
  // ---------------------------------------------------------
  (function () {
    if (reduce || !finePointer) return;
    document.querySelectorAll('.logo').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (x * 0.3) + 'px,' + (y * 0.3) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  })();

  // ---------------------------------------------------------
  // 4a. Contact heading — letters pick up the accent colour
  //     near the cursor, same idea as the hero name.
  // ---------------------------------------------------------
  (function () {
    if (reduce || !finePointer) return;
    var link = document.querySelector('.contact h2 a');
    if (!link) return;
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(link.childNodes, function (node) {
      if (node.nodeType === 3) {
        node.textContent.split('').forEach(function (ch) {
          var s = document.createElement('span');
          s.textContent = ch;
          frag.appendChild(s);
        });
      } else {
        frag.appendChild(node.cloneNode(true));
      }
    });
    link.innerHTML = '';
    link.appendChild(frag);

    var letters = link.querySelectorAll('span');
    var radius = 60;
    link.addEventListener('pointermove', function (e) {
      letters.forEach(function (l) {
        var r = l.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        l.style.color = Math.sqrt(dx * dx + dy * dy) < radius ? 'var(--acc)' : '';
      });
    });
    link.addEventListener('pointerleave', function () {
      letters.forEach(function (l) { l.style.color = ''; });
    });
  })();

  // ---------------------------------------------------------
  // 4b. Sticky header — shrinks and hides on scroll-down,
  //     reappears on scroll-up.
  // ---------------------------------------------------------
  (function () {
    var header = document.querySelector('header');
    if (!header || reduce) return;
    var lastY = window.scrollY;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        header.classList.toggle('is-scrolled', y > 80);
        if (y > lastY && y > 140) header.classList.add('is-hidden');
        else header.classList.remove('is-hidden');
        lastY = y;
        ticking = false;
      });
    });
  })();

  // ---------------------------------------------------------
  // 4c. Page transitions — fade to background before an
  //     internal link navigates to another page.
  // ---------------------------------------------------------
  (function () {
    if (reduce) return;
    var pt = document.createElement('div');
    pt.className = 'pt';
    pt.setAttribute('aria-hidden', 'true');
    document.body.appendChild(pt);

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (/^(https?:)?\/\//i.test(href) || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
      e.preventDefault();
      pt.classList.add('show');
      setTimeout(function () { location.href = href; }, 280);
    });
  })();

  // ---------------------------------------------------------
  // 4. Grain overlay — a still film-grain texture over everything
  // ---------------------------------------------------------
  (function () {
    var grain = document.createElement('div');
    grain.className = 'grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  })();

  // ---------------------------------------------------------
  // 5. Intro curtain — exit handling (markup lives in index.html)
  //    CSS auto-hides it too, so it works even without JS.
  // ---------------------------------------------------------
  (function () {
    var intro = document.querySelector('.intro');
    if (!intro) return;
    try { sessionStorage.setItem('yuval-seen', '1'); } catch (e) {}
    intro.addEventListener('animationend', function (e) {
      if (e.animationName === 'introOut') intro.remove();
    });
  })();
})();
