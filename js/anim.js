// ============================================================
//  Yuval - shared animation layer for every page.
//  Intro curtain, film grain, page frame, video grid/carousel,
//  card tilt, scroll reveals and the contact-page toys. All motion
//  is gated behind prefers-reduced-motion so it degrades to a
//  calm static site.
//
//  Structure: each concern below is its own named init*()
//  function, called in order at the bottom of the file. Every
//  function early-returns when its markup isn't on the page or
//  its feature is gated (reduced motion / no fine pointer), so
//  it's safe to call all of them unconditionally.
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
  function initCreditsRevealUp() {
    if (reduce) return;
    var groups = [
      document.querySelectorAll('.proj .credit'),
      document.querySelectorAll('.proj-content h3, .proj-content > .desc')
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
  }

  // ---------------------------------------------------------
  // Contextual "back" link - project pages reachable from more
  // than one grid (e.g. clb.html from both digital + social) carry
  // a ?from=home|social|digital on every tile link pointing to them;
  // swap the back-link's href/text to match wherever the visitor
  // actually came from, falling back to the HTML's own default
  // (author's best guess) when the param is missing or unrecognised.
  // ---------------------------------------------------------
  function initContextualBackLink() {
    var link = document.querySelector('.back[data-back-default]');
    if (!link) return;
    var targets = {
      home: ['index.html', '→ חזרה לדף הבית'],
      social: ['social.html', '→ חזרה לסושיאל'],
      digital: ['digital.html', '→ חזרה לדיגיטל']
    };
    var from = targets[new URLSearchParams(location.search).get('from')];
    if (!from) return;
    link.setAttribute('href', from[0]);
    link.textContent = from[1];
  }

  // ---------------------------------------------------------
  // Tilt-toward-cursor on cards (desktop only).
  // ---------------------------------------------------------
  function initCardTilt() {
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
  }

  // ---------------------------------------------------------
  // Grid videos fade/scale in once their first frame is ready,
  // instead of popping in. Skips videos with a poster attribute -
  // those already have a real thumbnail to show immediately, so
  // hiding them behind opacity:0 until the video data itself loads
  // would just needlessly blank out that poster.
  // ---------------------------------------------------------
  function initGridVideoFadeIn() {
    document.querySelectorAll('.video-tile video,.media-tile video').forEach(function (v) {
      if (v.hasAttribute('poster')) return;
      v.classList.add('vid-fade');
      if (v.readyState >= 2) { v.classList.add('loaded'); return; }
      v.addEventListener('loadeddata', function () { v.classList.add('loaded'); }, { once: true });
    });
  }

  // ---------------------------------------------------------
  // Alpha-transparent video via canvas - works on every browser
  // including Safari, because the source video has NO real alpha
  // channel (Safari can't play those anyway). The clip is
  // exported as one ordinary video: the color frame stacked on
  // top of a grayscale alpha-matte frame (white = opaque, black =
  // transparent). Each frame we draw the color half normally,
  // then use the matte half's brightness as the alpha channel
  // before painting the canvas - so the canvas ends up genuinely
  // transparent.
  // ---------------------------------------------------------
  function initAlphaVideoCanvases() {
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
  }

  // ---------------------------------------------------------
  // Mobile nav - hamburger toggles the dropdown menu.
  // ---------------------------------------------------------
  function initMobileNavToggle() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;
    function close() {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 640) close(); });
  }

  // ---------------------------------------------------------
  // Grid preview videos - only play the clips actually in view.
  // Mobile browsers cap how many <video> elements can autoplay
  // at once; with 12 on one page most just sit frozen on frame 1
  // unless we play/pause them as they enter/leave the viewport.
  // ---------------------------------------------------------
  function initGridVideoAutoplay() {
    var vids = document.querySelectorAll('.video-tile video,.media-tile video');
    if (!vids.length || !('IntersectionObserver' in window)) return;
    var carouselMq = window.matchMedia('(max-width:560px)');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        // Below 560px the home grid is initHomeCarousel()'s swipe carousel,
        // which plays exactly one clip (the centred card) at a time - let it
        // own play/pause there instead of fighting over it.
        if (carouselMq.matches && v.closest('.video-grid')) return;
        if (entry.isIntersecting) v.play().catch(function () {});
        else v.pause();
      });
    }, { rootMargin: '50px' });
    vids.forEach(function (v) { io.observe(v); });
  }

  // ---------------------------------------------------------
  // Mobile home page - liquid-glass swipe carousel. The CSS media
  // query (max-width:560px) turns .video-grid into a horizontal
  // snap-scroller with peeking side cards; this drives the actual
  // "liquid" part - continuously scaling/fading/blurring each card
  // by how far it sits from the centre as the visitor swipes, so
  // the current project glides into sharp focus while its neighbours
  // stay soft glass on the sides. Only active under that breakpoint;
  // switching to desktop width restores the plain grid look.
  //
  // Endless loop: the strip is a ring. Every time a swipe settles, the
  // cards are re-dealt (via flex `order`, no DOM moves) so the card the
  // visitor landed on sits in the MIDDLE slot of the strip, with the
  // other 11 wrapped around it in their circular order - and scrollLeft
  // is nudged by exactly the distance that re-deal shifted the strip, in
  // the same task, so nothing on screen moves. Only cards far off-screen
  // ever change slot. That leaves ~5 cards of runway on either side of
  // wherever you are, so a hard fling can travel as far as it likes in
  // either direction and never hits the physical end of the scroller.
  //
  // This used to be done with cloned first/last cards and a hidden jump
  // from the clone to its real twin once you settled on it. That was the
  // source of two visible seams: a clone is a fresh <video> that has to
  // download its own copy of the clip (so the "first" card looked like
  // it was loading again every lap), and the clone->real swap restarted
  // the clip from frame 0 in a different element (a one-frame flicker
  // every lap). Rotating the real elements keeps each clip in the one
  // <video> that already has it buffered, and the card under your thumb
  // is never replaced - so there is no seam to see.
  //
  // Playback: only the centred card's video ever plays. Every other
  // card is paused and reset to frame 0, so at most one clip decodes at
  // a time instead of 3+ peeking clips fighting for bandwidth/CPU (which
  // is what was making the carousel slow to get going).
  // ---------------------------------------------------------
  function initHomeCarousel() {
    var grid = document.querySelector('.video-grid');
    if (!grid) return;
    var tiles = Array.prototype.slice.call(grid.querySelectorAll('.video-tile'));
    if (!tiles.length) return;
    var mq = window.matchMedia('(max-width:560px)');
    var active = false;
    var ticking = false;
    var settleTimer = null;
    var touching = false;
    var lastActive = null;
    var ring = null;  // tiles in their mobile (CSS `order`) sequence - the fixed circular order
    var shift = 0;    // how many slots the ring is currently rotated by

    function playOnly(tile) {
      if (tile === lastActive) return;
      lastActive = tile;
      tiles.forEach(function (t) {
        var v = t.querySelector('video');
        if (!v) return;
        if (t === tile) {
          if (v.paused) v.play().catch(function () {});
        } else if (!v.paused || v.currentTime) {
          v.pause();
          try { v.currentTime = 0; } catch (e) {}
        }
      });
    }

    // Read the mobile order the stylesheet gives each card (the nth-child
    // order rules in the max-width:560px block of style.css) once, before
    // we start overriding it inline.
    function readRing() {
      if (ring) return;
      ring = tiles.slice().sort(function (a, b) {
        return (parseInt(getComputedStyle(a).order, 10) || 0) - (parseInt(getComputedStyle(b).order, 10) || 0);
      });
    }

    // Deal the ring into slots 0..n-1, rotated by `shift`.
    function applyShift(s) {
      var n = ring.length;
      shift = ((s % n) + n) % n;
      for (var i = 0; i < n; i++) ring[i].style.order = String((i + shift) % n);
    }

    // Instantly re-centres `tile` with no scroll animation.
    function jumpTo(tile) {
      var gridRect = grid.getBoundingClientRect();
      var tileRect = tile.getBoundingClientRect();
      grid.scrollLeft += (tileRect.left + tileRect.width / 2) - (gridRect.left + gridRect.width / 2);
    }

    // Rotate the ring so `tile` occupies the middle slot, then move
    // scrollLeft by exactly the amount the re-deal shifted the strip, so
    // the visible cards stay put to the pixel. Done in one task, so the
    // browser never paints an in-between state.
    function recentreRing(tile) {
      var n = ring.length;
      var idx = ring.indexOf(tile);
      if (idx < 0) return;
      var want = (((Math.floor(n / 2) - idx) % n) + n) % n;
      if (want === shift) return;
      var before = tile.getBoundingClientRect().left;
      applyShift(want);
      var after = tile.getBoundingClientRect().left; // forces the re-layout now, not at paint time
      grid.scrollLeft += after - before;
    }

    function update() {
      ticking = false;
      var rect = grid.getBoundingClientRect();
      var center = rect.left + rect.width / 2;
      var reach = rect.width; // ignore tiles further than ~1 container-width from centre
      // Pass 1: read every position first, with zero style writes in between -
      // interleaving reads and writes here (as this used to) forces the
      // browser to re-run layout on every single tile instead of once for
      // all of them, which is what was making this janky on phones.
      var infos = tiles.map(function (tile) {
        var tr = tile.getBoundingClientRect();
        return { tile: tile, dist: Math.abs((tr.left + tr.width / 2) - center), width: tr.width };
      });
      var current = null;
      // Pass 2: write. Most cards sit way outside the peeking window at any
      // given moment - skip touching them entirely instead of recomputing
      // transform/opacity/filter on all of them every frame, so the real
      // per-frame cost stays limited to the 3-4 cards actually visible.
      infos.forEach(function (info) {
        var tile = info.tile;
        if (info.dist > reach) {
          if (tile.classList.contains('is-jsdriven')) {
            tile.classList.remove('is-jsdriven', 'is-active');
            tile.style.transform = '';
            tile.style.opacity = '';
            tile.style.filter = '';
          }
          return;
        }
        tile.classList.add('is-jsdriven');
        var t = Math.min(info.dist / (info.width * .78), 1); // 0 = centred, 1 = fully off to the side
        tile.style.transform = 'scale(' + (1 - .1 * t).toFixed(3) + ')';
        tile.style.opacity = (1 - .4 * t).toFixed(3);
        tile.style.filter = t < .04 ? 'none' :
          'blur(' + (3 * t).toFixed(2) + 'px) saturate(' + (1 - .3 * t).toFixed(2) + ') brightness(' + (1 - .1 * t).toFixed(2) + ')';
        var isActive = t < .12;
        tile.classList.toggle('is-active', isActive);
        if (isActive) current = tile;
      });
      if (current) playOnly(current);
      return current;
    }
    function handleSettle() {
      if (touching) return; // finger's still down - a native touch/momentum
                             // scroll is still "live"; jumping now would fight
                             // it. Wait for touchend to try again.
      var current = update();
      if (!current) return;
      recentreRing(current);
      // The re-deal can bring a previously far-away card into the peeking
      // window; give it its proper distance-based look in this same task.
      update();
    }
    function scheduleSettle() {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(handleSettle, 140);
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
      scheduleSettle();
    }
    function onTouchStart() { touching = true; }
    function onTouchEnd() { touching = false; scheduleSettle(); }
    function enable() {
      if (active) return;
      active = true;
      readRing();
      applyShift(Math.floor(ring.length / 2)); // front card in the middle slot, cards peeking on both sides
      jumpTo(ring[0]);
      grid.addEventListener('scroll', onScroll, { passive: true });
      grid.addEventListener('scrollend', handleSettle);
      grid.addEventListener('touchstart', onTouchStart, { passive: true });
      grid.addEventListener('touchend', onTouchEnd, { passive: true });
      grid.addEventListener('touchcancel', onTouchEnd, { passive: true });
      update();
    }
    function disable() {
      if (!active) return;
      active = false;
      lastActive = null;
      touching = false;
      clearTimeout(settleTimer);
      grid.removeEventListener('scrollend', handleSettle);
      grid.removeEventListener('touchstart', onTouchStart);
      grid.removeEventListener('touchend', onTouchEnd);
      grid.removeEventListener('touchcancel', onTouchEnd);
      grid.removeEventListener('scroll', onScroll);
      tiles.forEach(function (tile) {
        tile.style.order = ''; // back to the stylesheet's order - the desktop grid also honours `order`
        tile.style.transform = '';
        tile.style.opacity = '';
        tile.style.filter = '';
        tile.classList.remove('is-active', 'is-jsdriven');
        // Hand video control back to initGridVideoAutoplay's visibility
        // observer, which owns things again once we're above 560px.
        var v = tile.querySelector('video');
        if (v) v.play().catch(function () {});
      });
    }
    function sync() { if (mq.matches) enable(); else disable(); }
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else if (mq.addListener) mq.addListener(sync);
    window.addEventListener('resize', function () { if (active) onScroll(); });
  }

  // ---------------------------------------------------------
  // Grid preview videos - hovering a tile (mouse only) pauses
  // its clip in place; moving away resumes playback from that
  // same paused frame. (The dim/zoom on hover is pure CSS.)
  // ---------------------------------------------------------
  function initGridVideoHoverPause() {
    if (!finePointer) return;
    var tiles = document.querySelectorAll('.video-tile,.media-tile');
    tiles.forEach(function (tile) {
      var video = tile.querySelector('video');
      if (!video) return;
      tile.addEventListener('mouseenter', function () { video.pause(); });
      tile.addEventListener('mouseleave', function () { video.play().catch(function () {}); });
    });
  }

  // ---------------------------------------------------------
  // Scroll reveals - blur-to-sharp, gently staggered.
  // ---------------------------------------------------------
  function initScrollReveals() {
    var sel = '.about-grid,.proj,.sec-lead,.cat-title,.about-photo,.svc-photo,.media-tile';
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
  }

  // ---------------------------------------------------------
  // Sticky header - shrinks and hides on scroll-down, reappears
  // on scroll-up.
  // ---------------------------------------------------------
  function initStickyHeader() {
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
  }

  // ---------------------------------------------------------
  // Page transitions - fade to background before an internal
  // link navigates to another page.
  // ---------------------------------------------------------
  function initPageTransitions() {
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
  }

  // ---------------------------------------------------------
  // Grain overlay - a still film-grain texture over everything.
  // ---------------------------------------------------------
  function initGrainOverlay() {
    var grain = document.createElement('div');
    grain.className = 'grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  }

  // ---------------------------------------------------------
  // Page frame - a thin accent-colour border around the whole
  // viewport, fixed on top of everything.
  // ---------------------------------------------------------
  function initPageFrame() {
    var frame = document.createElement('div');
    frame.className = 'page-frame';
    frame.setAttribute('aria-hidden', 'true');
    ['top', 'right', 'bottom', 'left'].forEach(function (side) {
      var bar = document.createElement('div');
      bar.className = 'frame-' + side;
      frame.appendChild(bar);
    });
    document.body.appendChild(frame);
  }

  // ---------------------------------------------------------
  // Contact page - the peeking eyes follow the pointer.
  // ---------------------------------------------------------
  function initContactEyes() {
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
  }

  // ---------------------------------------------------------
  // Contact page lead form - on submit, silently emails
  // magrafta40@gmail.com via EmailJS (no visitor-side "press
  // send" step needed). WhatsApp is a separate channel, opened
  // only via the phone number link elsewhere on the page.
  // ---------------------------------------------------------
  function initLeadForm() {
    var form = document.getElementById('lead-form');
    var status = document.getElementById('lead-form-status');
    if (!form) return;
    var EMAILJS_PUBLIC_KEY = '8tscJcgUmP_hJxCu-';
    var EMAILJS_SERVICE_ID = 'service_meyutxa';
    var EMAILJS_TEMPLATE_ID = 'template_z08j823';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var contact = form.elements.contact.value.trim();

      if (status) status.textContent = 'שולח...';
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { name: name, contact: contact }, EMAILJS_PUBLIC_KEY)
        .then(function () {
          form.reset();
          if (status) status.textContent = 'הפרטים נשלחו, נדבר בקרוב!';
        }).catch(function () {
          if (status) status.textContent = 'משהו השתבש - אפשר לכתוב לנו גם בוואטסאפ או במייל למעלה.';
        });
    });
  }

  // ---------------------------------------------------------
  // Contact page - one floating chip at a time turns
  // accent-coloured, cycling to a new random one every 3s.
  // ---------------------------------------------------------
  function initContactBadgeCycle() {
    if (reduce) return;
    var badges = document.querySelectorAll('.c-badge');
    if (!badges.length) return;
    var blob = document.querySelector('.contact-blob');

    // The blob is a flat-bottomed half-ellipse (border-radius:50% 50% 0 0).
    // Rather than sampling pixel colours, we can just compute whether a
    // chip's centre falls inside that ellipse - cheap and exact, since the
    // background here is only ever flat shapes, not a photo/gradient.
    function isOverBlob(el) {
      if (!blob) return false;
      var b = blob.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var halfW = b.width / 2;
      var dx = cx - (b.left + halfW);
      if (Math.abs(dx) >= halfW || b.height <= 0) return false;
      var domeY = b.bottom - b.height * Math.sqrt(1 - (dx / halfW) * (dx / halfW));
      return cy >= domeY && cy <= b.bottom;
    }

    var current = -1;
    function pick() {
      var next = current;
      if (badges.length > 1) {
        while (next === current) next = Math.floor(Math.random() * badges.length);
      } else {
        next = 0;
      }
      if (current >= 0) badges[current].classList.remove('is-accent', 'is-accent-dark');
      badges[next].classList.add(isOverBlob(badges[next]) ? 'is-accent-dark' : 'is-accent');
      current = next;
    }
    pick();
    setInterval(pick, 3000);
  }

  // ---------------------------------------------------------
  // Intro curtain - exit handling (markup lives in index.html).
  // CSS auto-hides it too, so it works even without JS.
  // ---------------------------------------------------------
  function initIntroCurtain() {
    var intro = document.querySelector('.intro');
    if (!intro) return;
    try { sessionStorage.setItem('yuval-seen', '1'); } catch (e) {}
    intro.addEventListener('animationend', function (e) {
      if (e.animationName === 'introOut') intro.remove();
    });
  }

  // ---------------------------------------------------------
  // Run everything.
  // ---------------------------------------------------------
  function initAll() {
    initCreditsRevealUp();
    initContextualBackLink();
    initCardTilt();
    initGridVideoFadeIn();
    initAlphaVideoCanvases();
    initMobileNavToggle();
    initGridVideoAutoplay();
    initGridVideoHoverPause();
    initHomeCarousel();
    initScrollReveals();
    initStickyHeader();
    initPageTransitions();
    initGrainOverlay();
    initPageFrame();
    initContactEyes();
    initLeadForm();
    initContactBadgeCycle();
    initIntroCurtain();
  }

  initAll();
})();
