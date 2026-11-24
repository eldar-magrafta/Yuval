// לחם ושעשועים: play only the video currently visible inside the phone,
// and let the visitor toggle sound for the whole feed.
(function () {
  var phone = document.querySelector('.phone');
  if (!phone) return;
  var feed = phone.querySelector('.phone-feed');
  var videos = Array.prototype.slice.call(feed.querySelectorAll('video'));
  var soundBtn = phone.querySelector('.phone-sound');
  var muted = true;

  // IntersectionObserver = the browser tells us when an element enters/leaves view.
  // Here "view" is the phone screen (root: feed), so a video plays when it's mostly on screen.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        v.muted = muted;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, { root: feed, threshold: 0.6 });
  videos.forEach(function (v) { io.observe(v); });

  feed.addEventListener('scroll', function () {
    if (feed.scrollTop > 10) phone.classList.add('is-swiped');
  }, { passive: true });

  soundBtn.addEventListener('click', function () {
    muted = !muted;
    videos.forEach(function (v) { v.muted = muted; });
    soundBtn.textContent = muted ? '🔇' : '🔊';
    soundBtn.setAttribute('aria-pressed', String(!muted));
    soundBtn.setAttribute('aria-label', muted ? 'הפעלת סאונד' : 'השתקה');
  });
})();
