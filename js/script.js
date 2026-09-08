(function () {
  'use strict';

  var navbar = document.getElementById('navbar');
  var hamburger = document.getElementById('hamburger');
  var nav = document.getElementById('navbarNav');
  var navLinks = document.querySelectorAll('.navbar__link');
  var contactForm = document.getElementById('contactForm');
  var toast = document.getElementById('toast');
  var backToTop = document.getElementById('backToTop');

  var ticking = false;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('toast--visible');
    setTimeout(function () {
      toast.classList.remove('toast--visible');
    }, 3000);
  }

  /* ---- Scroll handler ---- */
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        var scrollY = window.scrollY || window.pageYOffset;

        if (navbar) {
          if (scrollY > 60) {
            navbar.classList.add('navbar--scrolled');
          } else {
            navbar.classList.remove('navbar--scrolled');
          }
        }

        if (backToTop) {
          if (scrollY > 400) {
            backToTop.classList.add('back-to-top--visible');
          } else {
            backToTop.classList.remove('back-to-top--visible');
          }
        }

        updateActiveLink();
        ticking = false;
      });
      ticking = true;
    }
  });

  /* ---- Navigation ---- */
  if (hamburger && nav) {
    hamburger.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('navbar__nav--open');
      hamburger.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (nav) nav.classList.remove('navbar__nav--open');
      if (hamburger) {
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      }
      document.body.style.overflow = '';
    });
  });

  /* ---- Active nav link ---- */
  // Multi-page: highlight the link matching the current page file.
  // Single-page anchors (#...) still get scroll-spy behaviour below.
  var currentPage = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0] || 'index.html';
  navLinks.forEach(function (link) {
    var href = link.getAttribute('href') || '';
    if (href && !href.startsWith('#') && (href === currentPage || (currentPage === '' && href === 'index.html'))) {
      link.classList.add('active');
    }
  });

  var sections = document.querySelectorAll('.section[id], .hero[id]');

  function updateActiveLink() {
    // On multi-page sites the active link is URL-based; only run
    // scroll-spy when the nav actually uses in-page anchors.
    var hasHashNav = Array.prototype.some.call(navLinks, function (link) {
      return (link.getAttribute('href') || '').charAt(0) === '#';
    });
    if (!hasHashNav) return;
    var scrollPos = window.scrollY + 100;
    var currentId = '';

    sections.forEach(function (section) {
      var top = section.offsetTop;
      var height = section.offsetHeight;
      var id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = id;
      }
    });

    navLinks.forEach(function (link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + currentId) {
        link.classList.add('active');
      }
    });
  }

  /* ---- Smooth scroll for in-page anchor links only ---- */
  // Multi-page nav links (about.html, contact.html, ...) must navigate normally.
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = this.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      e.preventDefault();
      var targetId = href.slice(1);
      var target = document.getElementById(targetId);
      if (target) {
        window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
      }
    });
  });

  /* ---- Back to top ---- */
  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Contact form (contact page only) ---- */
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('name').value.trim();
    var email = document.getElementById('email').value.trim();
    var message = document.getElementById('message').value.trim();

    if (!name) { showToast('Please enter your name.'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address.');
      return;
    }
    if (!message) { showToast('Please write a message.'); return; }

    var btn = contactForm.querySelector('button[type="submit"]');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<span>Sending...</span>';
    btn.disabled = true;

    setTimeout(function () {
      showToast('Message sent successfully! I\'ll get back to you soon.');
      contactForm.reset();
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 1200);
    });
  }

  /* ---- Intersection observer for scroll reveals ---- */
  var observerOptions = { threshold: 0.1, rootMargin: '0px 0px -60px 0px' };

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        entry.target.classList.add('revealed');
        /* Entrance stagger delays must not linger, or hover states feel laggy. */
        (function (elm) {
          setTimeout(function () { elm.style.transitionDelay = '0s'; }, 900);
        })(entry.target);
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObserver.observe(el);
  });

  document.querySelectorAll('.course-card, .achievement-card, .philosophy__point').forEach(function (el, i) {
    el.style.transitionDelay = (i * 0.08) + 's';
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  document.querySelectorAll('.stat').forEach(function (el, i) {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.1) + 's';
    revealObserver.observe(el);
  });

  /* ---- Hero parallax on mouse move ---- */

  var heroAvatar = document.querySelector('.hero__avatar');
  var heroRings = document.querySelectorAll('.hero__ring');

  if (heroAvatar && window.innerWidth > 768) {
    var heroEl = document.querySelector('.hero');
    if (heroEl) {
      heroEl.addEventListener('mousemove', function (e) {
      var rect = this.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;

      heroAvatar.style.transform = 'translate(' + (x * 12) + 'px, ' + (y * 12) + 'px)';

      heroRings.forEach(function (ring, i) {
        var factor = (i + 1) * 8;
        ring.style.transform = 'translate(' + (x * factor) + 'px, ' + (y * factor) + 'px)';
      });
    });

      heroEl.addEventListener('mouseleave', function () {
        heroAvatar.style.transform = '';
        heroRings.forEach(function (ring) { ring.style.transform = ''; });
      });
    }
  }

})();

/* ---- Delight module: progress, particles, counters, tilt, ripple ----
   All motion respects prefers-reduced-motion and bows out on touch
   devices / small screens where it would cost more than it gives. */
(function () {
  'use strict';

  var mm = window.matchMedia || function () { return { matches: false }; };
  var rafFn = window.requestAnimationFrame || function (fn) { fn(16); return 0; };
  var reduceMotion = mm('(prefers-reduced-motion: reduce)').matches;
  var finePointer = mm('(pointer: fine)').matches;
  var wideScreen = window.innerWidth >= 768;

  /* ---- Scroll progress bar ---- */
  (function initProgress() {
    var bar = document.createElement('div');
    bar.id = 'scrollProgress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop || window.scrollY || window.pageYOffset) / max : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { rafFn(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  if (reduceMotion) return;

  /* ---- Hero particle constellation ---- */
  (function initParticles() {
    if (!wideScreen || !finePointer) return;
    var hero = document.querySelector('.hero');
    if (!hero || !window.requestAnimationFrame) return;
    var host = hero.querySelector('.hero__bg') || hero;
    var canvas = document.createElement('canvas');
    canvas.className = 'hero-particles';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var W = 0, H = 0, parts = [], running = true, raf = 0;
    function resize() {
      var r = hero.getBoundingClientRect();
      W = canvas.width = Math.max(1, Math.floor(r.width));
      H = canvas.height = Math.max(1, Math.floor(r.height));
      var count = Math.min(85, Math.floor((W * H) / 16000));
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
          r: 1 + Math.random() * 1.8, tw: Math.random() * Math.PI * 2
        });
      }
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var i, j, p, q, dx, dy, d;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        p.x += p.vx; p.y += p.vy; p.tw += 0.02;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        var glow = 0.35 + 0.3 * Math.sin(p.tw);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + glow.toFixed(3) + ')';
        ctx.fill();
      }
      for (i = 0; i < parts.length; i++) {
        for (j = i + 1; j < parts.length; j++) {
          p = parts[i]; q = parts[j];
          dx = p.x - q.x; dy = p.y - q.y; d = dx * dx + dy * dy;
          if (d < 12100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.09 * (1 - d / 12100)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      raf = rafFn(frame);
    }

    function play() { if (!running) { running = true; raf = rafFn(frame); } }
    function pause() { running = false; if (raf) cancelAnimationFrame(raf); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) play(); else pause();
      }).observe(hero);
    }
    window.addEventListener('resize', resize);
    resize();
    frame();
  })();

  /* ---- Animated stat counters ---- */
  (function initCounters() {
    var nums = document.querySelectorAll('.stat__number');
    if (!nums.length || !('IntersectionObserver' in window)) return;
    function animate(elm, original) {
      var m = original.match(/([\d.,]+)/);
      if (!m) return;
      var target = parseFloat(m[1].replace(/,/g, ''));
      if (isNaN(target)) return;
      var decimals = (m[1].split('.')[1] || '').length;
      var prefix = original.slice(0, m.index);
      var suffix = original.slice(m.index + m[1].length);
      var start = 0, dur = 1400;
      function frame(t) {
        if (!start) start = t;
        var p = Math.min(1, (t - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        elm.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (p < 1) rafFn(frame);
        else elm.textContent = original;
      }
      rafFn(frame);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { animate(en.target, en.target.textContent || ''); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { io.observe(n); });
  })();

  /* ---- 3D tilt + cursor spotlight on cards, magnetic primary buttons ---- */
  (function initCardFx() {
    var cards = document.querySelectorAll('.course-card, .achievement-card, .philosophy__point, .contact__card');
    function clearFx(card) {
      card.style.removeProperty('--mx');
      card.style.removeProperty('--my');
      card.style.transform = '';
    }
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', Math.round(x) + 'px');
        card.style.setProperty('--my', Math.round(y) + 'px');
        if (finePointer && wideScreen) {
          var rx = ((y / r.height) - 0.5) * -7;
          var ry = ((x / r.width) - 0.5) * 7;
          card.style.transform = 'perspective(850px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-6px)';
        }
      });
      card.addEventListener('mouseleave', function () { clearFx(card); });
    });

    if (finePointer && wideScreen) {
      document.querySelectorAll('.btn--primary').forEach(function (btn) {
        btn.addEventListener('mousemove', function (e) {
          var r = btn.getBoundingClientRect();
          var x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
          var y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
          btn.style.transform = 'translate(' + (x * 4).toFixed(1) + 'px,' + (y * 3).toFixed(1) + 'px)';
        });
        btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
      });
    }
  })();

  /* ---- Click ripple on buttons ---- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    var btn = (t && t.closest) ? t.closest('.btn') : null;
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    var size = Math.max(r.width, r.height);
    var s = document.createElement('span');
    s.className = 'tf-ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top = (e.clientY - r.top - size / 2) + 'px';
    btn.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 650);
  });
})();

/* ---- Owner-only on-site editor loader ----
   Shows the "Edit this page" editor only to the teacher who owns this
   site (logged-in user id === page teacher id). Everyone else, including
   logged-out visitors and other teachers, gets zero editor code. */
(function () {
  'use strict';

  if (window.__tfEditorLoaded) return;
  window.__tfEditorLoaded = true;

  function teacherId() {
    var w = document.getElementById('chatWidget');
    return (w && w.getAttribute('data-teacher-id')) || null;
  }

  function loadEditor() {
    var s = document.createElement('script');
    s.src = 'js/editor.js';
    s.defer = true;
    document.body.appendChild(s);
  }

  try {
    var tid = teacherId();
    if (!tid) return;
    fetch('/api/auth', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.user && String(d.user.id) === String(tid)) loadEditor();
      })
      .catch(function () { /* visitors: no editor */ });
  } catch (e) { /* visitors: no editor */ }
})();