(function () {
  'use strict';

  var header = document.getElementById('header');
  var hamburger = document.getElementById('hamburger');
  var nav = document.getElementById('nav');
  var navLinks = document.querySelectorAll('.nav__link');
  var contactForm = document.getElementById('contactForm');
  var toast = document.getElementById('toast');
  var backToTop = document.getElementById('backToTop');
  var cursorGlow = document.getElementById('cursorGlow');

  var ticking = false;
  var navHeight = 72;

  function showToast(message) {
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

        if (scrollY > 50) {
          header.classList.add('header--scrolled');
        } else {
          header.classList.remove('header--scrolled');
        }

        if (scrollY > 400) {
          backToTop.classList.add('back-to-top--visible');
        } else {
          backToTop.classList.remove('back-to-top--visible');
        }

        updateActiveLink();
        ticking = false;
      });
      ticking = true;
    }
  });

  /* ---- Navigation ---- */
  hamburger.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('nav--open');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('nav--open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  /* ---- Active nav link ---- */
  var sections = document.querySelectorAll('.section[id], .hero[id]');
  var headerHeight = header.offsetHeight;

  function updateActiveLink() {
    var scrollPos = window.scrollY + headerHeight + 80;
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

  /* ---- Smooth scroll for nav links ---- */
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var targetId = this.getAttribute('href').slice(1);
      var target = document.getElementById(targetId);
      if (target) {
        var top = target.offsetTop - headerHeight;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  /* ---- Back to top ---- */
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---- Contact form ---- */
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

  /* ---- Intersection observer for scroll reveals ---- */
  var observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  };

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.course-card, .achievement-card, .philosophy__point, .contact__info-card, .about__img-frame, .about__lead').forEach(function (el) {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  document.querySelectorAll('.stat').forEach(function (el, i) {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.1) + 's';
    revealObserver.observe(el);
  });

  document.querySelectorAll('.course-card, .achievement-card, .philosophy__point').forEach(function (el, i) {
    el.style.transitionDelay = (i * 0.08) + 's';
  });

  /* ---- Cursor glow effect ---- */
  if (cursorGlow && window.innerWidth > 1024) {
    document.addEventListener('mousemove', function (e) {
      cursorGlow.style.left = e.clientX + 'px';
      cursorGlow.style.top = e.clientY + 'px';
      if (!cursorGlow.classList.contains('cursor-glow--visible')) {
        cursorGlow.classList.add('cursor-glow--visible');
      }
    });

    document.addEventListener('mouseleave', function () {
      cursorGlow.classList.remove('cursor-glow--visible');
    });
  }

  /* ---- Hero parallax on mouse move ---- */
  var heroAvatar = document.querySelector('.hero__avatar');
  var heroRings = document.querySelectorAll('.hero__ring');

  if (heroAvatar && window.innerWidth > 768) {
    document.querySelector('.hero').addEventListener('mousemove', function (e) {
      var rect = this.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;

      heroAvatar.style.transform = 'translate(' + (x * 12) + 'px, ' + (y * 12) + 'px)';

      heroRings.forEach(function (ring, i) {
        var factor = (i + 1) * 8;
        ring.style.transform = 'translate(' + (x * factor) + 'px, ' + (y * factor) + 'px)';
      });
    });

    document.querySelector('.hero').addEventListener('mouseleave', function () {
      heroAvatar.style.transform = '';
      heroRings.forEach(function (ring) {
        ring.style.transform = '';
      });
    });
  }

})();
