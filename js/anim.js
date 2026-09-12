// ============================================================
//  Yuval - shared animation layer for every page.
//  Intro curtain, film grain, magnetic logo, hero lean, and
//  blur-to-sharp scroll reveals. All motion is gated behind
//  prefers-reduced-motion so it degrades to a calm static site.
// ============================================================
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  // ---------------------------------------------------------
  // Generic scroll-in reveal: fades/rises elements up as they
  // enter the viewport, staggered within their own container.
  // Used for project credit rows, project copy, and bio text -
  // sections that otherwise have zero motion after page load.
  // ---------------------------------------------------------
  (function () {
    if (reduce) return;
    var groups = [
      document.querySelectorAll('.proj .credit'),
      document.querySelectorAll('.proj-content h3, .proj-content > .desc, .proj .case-block'),
      document.querySelectorAll('.about-hero-text p')
    ];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { threshold: .2 });
    groups.forEach(function (els) {
      els.forEach(function (el, i) {
        el.classList.add('reveal-up');
        el.style.transitionDelay = (i * 70) + 'ms';
        io.observe(el);
      });
    });
  })();

  // ---------------------------------------------------------
  // Premium polish pass: custom cursor with a "play" hint over
  // video tiles, tilt-toward-cursor on cards, a soft cursor-follow
  // glow behind the hero, and a fade/scale-in for grid videos once
  // their first frame is actually ready (instead of popping in).
  // ---------------------------------------------------------

  // -- custom cursor (desktop w/ a real mouse only) --
  (function () {
    if (!finePointer || reduce) return;
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.classList.add('has-custom-cursor');

    var tx = 0, ty = 0, x = 0, y = 0, shown = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { dot.classList.add('show'); shown = true; }
    });
    document.addEventListener('mouseleave', function () { dot.classList.remove('show'); });
    (function raf() {
      x += (tx - x) * .2; y += (ty - y) * .2;
      dot.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)';
      requestAnimationFrame(raf);
    })();

    document.querySelectorAll('.video-tile,.media-tile').forEach(function (tile) {
      tile.addEventListener('mouseenter', function () { dot.classList.add('video'); });
      tile.addEventListener('mouseleave', function () { dot.classList.remove('video'); });
    });
  })();

  // -- tilt-toward-cursor on cards (desktop only) --
  (function () {
    if (!finePointer || reduce) return;
    function initTilt(nodeList, max) {
      nodeList.forEach(function (el) {
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - .5;
          var py = (e.clientY - r.top) / r.height - .5;
          el.style.transition = 'transform .1s linear';
          el.style.transform = 'translateY(-4px) perspective(900px) rotateX(' + (-py * max) + 'deg) rotateY(' + (px * max) + 'deg)';
        });
        el.addEventListener('mouseleave', function () {
          el.style.transition = 'transform .5s var(--ease-lux)';
          el.style.transform = '';
        });
      });
    }
    initTilt(document.querySelectorAll('.video-tile'), 6);
    initTilt(document.querySelectorAll('.media-tile'), 5);
    initTilt(document.querySelectorAll('.service'), 4);
  })();

  // -- soft glow following the cursor behind the hero text --
  (function () {
    var hero = document.querySelector('.hero');
    if (!hero || !finePointer || reduce) return;
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
      hero.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
      hero.classList.add('glow-active');
    });
    hero.addEventListener('mouseleave', function () { hero.classList.remove('glow-active'); });
  })();

  // -- grid videos fade/scale in once their first frame is ready --
  (function () {
    document.querySelectorAll('.video-tile video,.media-tile video').forEach(function (v) {
      v.classList.add('vid-fade');
      if (v.readyState >= 2) { v.classList.add('loaded'); return; }
      v.addEventListener('loadeddata', function () { v.classList.add('loaded'); }, { once: true });
    });
  })();

  // ---------------------------------------------------------
  // -1. Alpha-transparent video via canvas - works on every
  //     browser including Safari, because the source video has
  //     NO real alpha channel (Safari can't play those anyway).
  //     The clip is exported as one ordinary video: the color
  //     frame stacked on top of a grayscale alpha-matte frame
  //     (white = opaque, black = transparent). Each frame we
  //     draw the color half normally, then use the matte half's
  //     brightness as the alpha channel before painting the
  //     canvas - so the canvas ends up genuinely transparent.
  // ---------------------------------------------------------
  (function () {
    var canvases = document.querySelectorAll('canvas[data-alpha-video]');
    canvases.forEach(function (canvas) {
      var src = canvas.getAttribute('data-alpha-video');
      var video = document.createElement('video');
      video.src = src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.style.position = 'fixed';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0';
      video.style.overflow = 'hidden';
      video.style.pointerEvents = 'none';
      video.setAttribute('aria-hidden', 'true');
      document.body.appendChild(video);

      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      var matte = document.createElement('canvas');
      var matteCtx = matte.getContext('2d', { willReadFrequently: true });
      var w = 0, h = 0, running = false;

      function size() {
        var rect = canvas.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = Math.max(1, Math.round((rect.width || 240) * dpr));
        h = Math.max(1, Math.round((rect.width || 240) * dpr * (video.videoHeight / 2) / video.videoWidth));
        canvas.width = w; canvas.height = h;
        matte.width = w; matte.height = h;
      }

      function draw() {
        if (!running) return;
        var vw = video.videoWidth, vh = video.videoHeight / 2;
        ctx.drawImage(video, 0, 0, vw, vh, 0, 0, w, h);
        var frame = ctx.getImageData(0, 0, w, h);
        matteCtx.drawImage(video, 0, vh, vw, vh, 0, 0, w, h);
        var alpha = matteCtx.getImageData(0, 0, w, h);
        var d = frame.data, a = alpha.data;
        for (var i = 3; i < d.length; i += 4) d[i] = a[i - 3];
        ctx.putImageData(frame, 0, 0);
        if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(draw);
        else requestAnimationFrame(draw);
      }

      video.addEventListener('loadedmetadata', function () {
        size();
        video.play().catch(function () {});
      });
      video.addEventListener('play', function () { running = true; draw(); });
      video.addEventListener('pause', function () { running = false; });
      window.addEventListener('resize', size);
    });
  })();

  // ---------------------------------------------------------
  // 0a. Mobile nav - hamburger toggles the dropdown menu.
  // ---------------------------------------------------------
  (function () {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;
    function close() {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '☰';
    }
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? '✕' : '☰';
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 640) close(); });
  })();

  // ---------------------------------------------------------
  // 0b. Pause-all-videos control - the preview grid autoplays
  //     and loops indefinitely, so WCAG 2.2.2 requires a way to
  //     stop it. One toggle button controls every clip on the page.
  // ---------------------------------------------------------
  var videosUserPaused = false;
  /*
  (function () {
    var vids = document.querySelectorAll('.video-tile video,.media-tile video');
    if (!vids.length) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'video-pause-toggle mono';
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = 'עצירת סרטונים';
    btn.addEventListener('click', function () {
      videosUserPaused = !videosUserPaused;
      btn.setAttribute('aria-pressed', videosUserPaused ? 'true' : 'false');
      btn.textContent = videosUserPaused ? 'הפעלת סרטונים' : 'עצירת סרטונים';
      vids.forEach(function (v) {
        if (videosUserPaused) v.pause();
        else v.play().catch(function () {});
      });
    });
    document.body.appendChild(btn);
  })();
  */

  // ---------------------------------------------------------
  // 0. Grid preview videos - only play the clips actually in view.
  //    Mobile browsers cap how many <video> elements can autoplay
  //    at once; with 12 on one page most just sit frozen on frame 1
  //    unless we play/pause them as they enter/leave the viewport.
  // ---------------------------------------------------------
  (function () {
    var vids = document.querySelectorAll('.video-tile video,.media-tile video');
    if (!vids.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) { if (!videosUserPaused) v.play().catch(function () {}); }
        else v.pause();
      });
    }, { rootMargin: '50px' });
    vids.forEach(function (v) { io.observe(v); });
  })();

  // ---------------------------------------------------------
  // 0c. Grid preview videos - hovering a tile (mouse only) pauses
  //     its clip in place, dims it, and shows its title; moving
  //     away resumes playback from that same paused frame.
  // ---------------------------------------------------------
  (function () {
    if (!finePointer) return;
    var tiles = document.querySelectorAll('.video-tile,.media-tile');
    tiles.forEach(function (tile) {
      var video = tile.querySelector('video');
      if (!video) return;
      tile.addEventListener('mouseenter', function () {
        tile.classList.add('is-hovered');
        video.pause();
      });
      tile.addEventListener('mouseleave', function () {
        tile.classList.remove('is-hovered');
        if (!videosUserPaused) video.play().catch(function () {});
      });
    });
  })();

  // ---------------------------------------------------------
  // 1. Hero - letters near the cursor pick up the accent colour
  //    (colour only - no tilt/movement)
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
  // 3. Scroll reveals - blur-to-sharp, gently staggered
  // ---------------------------------------------------------
  (function () {
    var sel = '.row,.ind,.about-grid,.proj,.contact h2,.sec-lead,.cat-title,.about-photo,.svc-photo,.media-tile,.about-hero-text p';
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
  // 4a. Contact heading - letters pick up the accent colour
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
  // 4b. Sticky header - shrinks and hides on scroll-down,
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
  // 4c. Page transitions - fade to background before an
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

    // Bfcache restores (e.g. browser Back) bring the page back exactly as it
    // was at unload - with the overlay still shown - so clear it on pageshow.
    window.addEventListener('pageshow', function () { pt.classList.remove('show'); });
  })();

  // ---------------------------------------------------------
  // 4. Grain overlay - a still film-grain texture over everything
  // ---------------------------------------------------------
  (function () {
    var grain = document.createElement('div');
    grain.className = 'grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  })();

  // ---------------------------------------------------------
  // 4d. Page frame - a thin accent-colour border around the
  //     whole viewport, fixed on top of everything.
  // ---------------------------------------------------------
  (function () {
    var frame = document.createElement('div');
    frame.className = 'page-frame';
    frame.setAttribute('aria-hidden', 'true');
    ['top', 'right', 'bottom', 'left'].forEach(function (side) {
      var bar = document.createElement('div');
      bar.className = 'frame-' + side;
      frame.appendChild(bar);
    });
    document.body.appendChild(frame);
  })();

  // ---------------------------------------------------------
  // 4e. Contact page - the peeking eyes follow the pointer.
  // ---------------------------------------------------------
  (function () {
    if (reduce) return;
    var pairs = Array.prototype.map.call(document.querySelectorAll('.c-eye'), function (eye) {
      return { eye: eye, pupil: eye.querySelector('.c-pupil') };
    }).filter(function (p) { return p.pupil; });
    if (!pairs.length) return;

    function update(x, y) {
      pairs.forEach(function (p) {
        var r = p.eye.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var dx = x - cx, dy = y - cy;
        var dist = Math.hypot(dx, dy) || 1;
        var max = r.width * 0.18;
        var move = Math.min(max, dist * 0.15);
        var angle = Math.atan2(dy, dx);
        p.pupil.style.transform = 'translate(' + (Math.cos(angle) * move) + 'px,' + (Math.sin(angle) * move) + 'px)';
      });
    }
    window.addEventListener('pointermove', function (e) { update(e.clientX, e.clientY); }, { passive: true });
  })();

  // ---------------------------------------------------------
  // 4f2. Contact page lead form - on submit, silently emails
  //      magrafta40@gmail.com via Formspree (no visitor-side
  //      "press send" step needed), and opens a pre-filled
  //      WhatsApp chat as a bonus channel for the visitor.
  //
  //      TODO: replace FORMSPREE_ENDPOINT below with the real
  //      endpoint from https://formspree.io once the form is
  //      created and magrafta40@gmail.com is verified there.
  // ---------------------------------------------------------
  (function () {
    var form = document.getElementById('lead-form');
    var status = document.getElementById('lead-form-status');
    if (!form) return;
    var FORMSPREE_ENDPOINT = 'https://formspree.io/f/REPLACE_ME';
    var WHATSAPP_NUMBER = '972524748456';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var contact = form.elements.contact.value.trim();

      window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent('שם: ' + name + '\nפרטי התקשרות: ' + contact), '_blank');

      if (status) status.textContent = 'שולח...';
      fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      }).then(function (res) {
        if (!res.ok) throw new Error('bad response');
        form.reset();
        if (status) status.textContent = 'הפרטים נשלחו, נדבר בקרוב!';
      }).catch(function () {
        if (status) status.textContent = 'משהו השתבש - אפשר לכתוב לנו גם בוואטסאפ או במייל למעלה.';
      });
    });
  })();

  // ---------------------------------------------------------
  // 4f. Contact page - one floating chip at a time turns
  //     accent-coloured, cycling to a new random one every 3s.
  // ---------------------------------------------------------
  (function () {
    if (reduce) return;
    var badges = document.querySelectorAll('.c-badge');
    if (!badges.length) return;
    var current = -1;
    function pick() {
      var next = current;
      if (badges.length > 1) {
        while (next === current) next = Math.floor(Math.random() * badges.length);
      } else {
        next = 0;
      }
      if (current >= 0) badges[current].classList.remove('is-accent');
      badges[next].classList.add('is-accent');
      current = next;
    }
    pick();
    setInterval(pick, 3000);
  })();

  // ---------------------------------------------------------
  // 5. Intro curtain - exit handling (markup lives in index.html)
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
