/* Site motion (projects + showcase pages). Everything here is an enhancement: with no
   script, reduced motion, or html[data-motion="off"], the pages show
   their finished static state. */
(function () {
  'use strict';
  const root = document.documentElement;
  if (root.dataset.motion === 'off') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // panels rise in the first time they scroll into view
  const reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length && 'IntersectionObserver' in window) {
    root.classList.add('js-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    reveals.forEach((el) => io.observe(el));
  }

  // GTFS feature panels play forward as their section scrolls up the
  // screen: p runs 0 -> 1 while the section top moves from 85% to 25%
  const route = document.getElementById('line1');
  const routeLen = route && route.getTotalLength ? route.getTotalLength() : 0;
  const scrubs = Array.from(document.querySelectorAll('[data-scrub]'));

  if (scrubs.length) {
    root.classList.add('js-scrub');

    const live = {
      bus: document.getElementById('live-bus'),
      trace: document.getElementById('live-trace'),
      speed: document.getElementById('live-speed'),
      end: 0.6176,     // where the static version parks the bus
    };

    const play = {
      trip(sec, p) {
        const stops = sec.querySelectorAll('.trip-stop');
        const n = stops.length;
        const idx = Math.round(p * (n - 1));
        stops.forEach((s, i) => {
          s.classList.toggle('passed', i < idx);
          s.classList.toggle('current', i === idx);
        });
        sec.querySelector('.trip-line').style.setProperty('--progress', n > 1 ? idx / (n - 1) : 0);
      },
      discover(sec, p) {
        sec.querySelector('.discover-ring.inner').style.transform = `scale(${Math.max(0.02, Math.min(1, p * 1.6))})`;
        sec.querySelector('.discover-ring.outer').style.transform = `scale(${Math.max(0.02, Math.min(1, p * 1.15))})`;
      },
      live(sec, p) {
        if (!routeLen || !live.bus) return;
        const d = p * live.end * routeLen;
        const pt = route.getPointAtLength(d);
        const ahead = route.getPointAtLength(Math.min(routeLen, d + 1));
        const angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
        live.bus.style.left = pt.x + 'px';
        live.bus.style.top = pt.y + 'px';
        live.bus.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        live.trace.setAttribute('stroke-dasharray', `${d} ${routeLen}`);
        live.speed.textContent = (p * 27.6).toFixed(1);
      },
    };

    function update() {
      const vh = window.innerHeight;
      scrubs.forEach((sec) => {
        const r = sec.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = clamp01((vh * 0.85 - r.top) / (vh * 0.6));
        sec.querySelectorAll('[data-step]').forEach((el) => {
          el.classList.toggle('on', p >= +el.dataset.step);
        });
        const fn = play[sec.dataset.scrub];
        if (fn) fn(sec, p);
      });
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', update);

    // sections below the fold start from the beginning ([data-step]
    // rows are already dimmed by CSS until they get .on)
    scrubs.forEach((sec) => {
      const fn = play[sec.dataset.scrub];
      if (fn && sec.getBoundingClientRect().top > window.innerHeight) fn(sec, 0);
    });
    update();
  }

  // hero: a train shuttles along Line 1 once the line has drawn in
  const heroBus = document.getElementById('hero-bus');
  if (heroBus && routeLen) {
    const leg = 14000;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const start = performance.now() + 2600;
    const frame = (now) => {
      const t = (Math.max(0, now - start) % (leg * 2)) / leg;
      const pt = route.getPointAtLength(ease(t < 1 ? t : 2 - t) * routeLen);
      heroBus.setAttribute('cx', pt.x);
      heroBus.setAttribute('cy', pt.y);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
})();
