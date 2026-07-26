(function () {
  var coursesContainer = document.getElementById('coursesContainer');
  var achievementsContainer = document.getElementById('achievementsContainer');
  var philPointsContainer = document.getElementById('philPointsContainer');
  var statsContainer = document.getElementById('statsContainer');
  var previewContent = document.getElementById('previewContent');
  var btnGenerate = document.getElementById('btnGenerate');

  var defaultCourses = [
    { icon: '\uD83D\uDCD6', title: 'Mathematics', desc: 'From algebra to calculus, building strong foundations in mathematical thinking.', level: 'Grades 9-12' },
    { icon: '\uD83D\uDD2C', title: 'Science', desc: 'Engaging students in hands-on experiments and inquiry-based learning.', level: 'Grades 7-10' },
    { icon: '\u26A1', title: 'Physics', desc: 'Making physics intuitive through real-world applications.', level: 'Grades 11-12' },
    { icon: '\uD83D\uDCBB', title: 'Computer Science', desc: 'Introduction to programming, algorithms, and computational thinking.', level: 'Grades 9-12' }
  ];

  var defaultPhilPoints = [
    'Student-Centered Learning',
    'Inclusive Classroom',
    'Real-World Connections',
    'Continuous Growth'
  ];

  var defaultAchievements = [
    { year: '2023', title: 'Distinguished Teacher Award', desc: 'Recognized for outstanding contributions to student achievement.' },
    { year: '2022', title: 'Curriculum Development Lead', desc: 'Led development of a new interdisciplinary STEM curriculum.' },
    { year: '2021', title: 'Student Mentorship Excellence', desc: 'Awarded for mentoring underprivileged students.' },
    { year: '2019', title: 'National Conference Speaker', desc: 'Presented research on adaptive learning strategies.' }
  ];

  function createCourseRow(course) {
    var row = document.createElement('div');
    row.className = 'course-row';
    row.innerHTML =
      '<input type="text" class="course-icon-input" value="' + escapeAttr(course.icon) + '" placeholder="Icon" title="Emoji icon">' +
      '<input type="text" class="course-title-input" value="' + escapeAttr(course.title) + '" placeholder="Course Title">' +
      '<input type="text" class="course-desc-input" value="' + escapeAttr(course.desc) + '" placeholder="Description" title="Description">' +
      '<input type="text" class="course-level-input" value="' + escapeAttr(course.level) + '" placeholder="Level" title="Level">' +
      '<button type="button" class="btn-remove-course">&times;</button>';
    row.querySelector('.btn-remove-course').addEventListener('click', function () {
      row.remove();
      updatePreview();
    });
    row.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', updatePreview);
    });
    return row;
  }

  function createAchievementRow(achievement) {
    var row = document.createElement('div');
    row.className = 'achievement-row';
    row.innerHTML =
      '<input type="text" class="achievement-year-input" value="' + escapeAttr(achievement.year) + '" placeholder="Year" style="flex:0 0 60px">' +
      '<input type="text" class="achievement-title-input" value="' + escapeAttr(achievement.title) + '" placeholder="Title">' +
      '<input type="text" class="achievement-desc-input" value="' + escapeAttr(achievement.desc) + '" placeholder="Description" style="flex:1">' +
      '<button type="button" class="btn-remove-achievement">&times;</button>';
    row.querySelector('.btn-remove-achievement').addEventListener('click', function () {
      row.remove();
      updatePreview();
    });
    row.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', updatePreview);
    });
    return row;
  }

  function createPhilPointRow(text) {
    var row = document.createElement('div');
    row.className = 'phil-point-row';
    row.innerHTML =
      '<input type="text" value="' + escapeAttr(text) + '" placeholder="Philosophy point">' +
      '<button type="button" class="btn-remove-point">&times;</button>';
    row.querySelector('.btn-remove-point').addEventListener('click', function () {
      row.remove();
      updatePreview();
    });
    row.querySelector('input').addEventListener('input', updatePreview);
    return row;
  }

  function createStatRow(num, suffix, label) {
    var row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML =
      '<input type="number" class="stat-num" value="' + num + '" min="0" placeholder="Number">' +
      '<input type="text" class="stat-suffix" value="' + escapeAttr(suffix) + '" placeholder="Suffix">' +
      '<input type="text" class="stat-label" value="' + escapeAttr(label) + '" placeholder="Label">' +
      '<button type="button" class="btn-remove-stat">&times;</button>';
    row.querySelector('.btn-remove-stat').addEventListener('click', function () {
      row.remove();
      updatePreview();
    });
    row.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', updatePreview);
    });
    return row;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getInputValue(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function getColor(name) {
    var el = document.getElementById(name);
    return el ? el.value : '#4f46e5';
  }

  function collectCourses() {
    var rows = coursesContainer.querySelectorAll('.course-row');
    var courses = [];
    rows.forEach(function (row) {
      courses.push({
        icon: row.querySelector('.course-icon-input').value || '\uD83D\uDCD6',
        title: row.querySelector('.course-title-input').value || 'Course Title',
        desc: row.querySelector('.course-desc-input').value || 'Course description.',
        level: row.querySelector('.course-level-input').value || 'All Grades'
      });
    });
    return courses;
  }

  function collectAchievements() {
    var rows = achievementsContainer.querySelectorAll('.achievement-row');
    var achievements = [];
    rows.forEach(function (row) {
      achievements.push({
        year: row.querySelector('.achievement-year-input').value || '2024',
        title: row.querySelector('.achievement-title-input').value || 'Achievement Title',
        desc: row.querySelector('.achievement-desc-input').value || 'Description.'
      });
    });
    return achievements;
  }

  function collectPhilPoints() {
    var rows = philPointsContainer.querySelectorAll('.phil-point-row');
    var points = [];
    rows.forEach(function (row) {
      var val = row.querySelector('input').value;
      if (val) points.push(val);
    });
    return points;
  }

  function collectStats() {
    var rows = statsContainer.querySelectorAll('.stat-row');
    var stats = [];
    rows.forEach(function (row) {
      stats.push({
        num: row.querySelector('.stat-num').value || '0',
        suffix: row.querySelector('.stat-suffix').value || '',
        label: row.querySelector('.stat-label').value || 'Label'
      });
    });
    return stats;
  }

  function generateHTML() {
    var primary = getColor('colorPrimary');
    var accent = getColor('colorAccent');
    var primaryLight = hexToRgba(primary, 0.12);
    var accentLight = hexToRgba(accent, 0.12);

    var siteTitle = getInputValue('siteTitle') || 'Teacher Portfolio';
    var heroTitle = getInputValue('heroTitle') || 'Empowering Every Learner';
    var heroHighlight = getInputValue('heroHighlight') || 'Every Learner';
    var heroTagline = getInputValue('heroTagline') || 'Welcome to My Teaching Portfolio';
    var heroDesc = getInputValue('heroDesc') || 'A passionate educator dedicated to creating engaging learning experiences.';
    var initials = getInputValue('avatarInitials') || 'TP';
    var aboutLead = getInputValue('aboutLead') || 'A dedicated educator.';
    var aboutP1 = getInputValue('aboutP1') || 'Creating engaging and impactful learning experiences.';
    var aboutP2 = getInputValue('aboutP2') || 'Every student deserves a chance to shine.';
    var philQuote = getInputValue('philQuote') || '"Education is the passport to the future."';
    var philCite = getInputValue('philCite') || '— Malcolm X';
    var contactEmail = getInputValue('contactEmail') || 'teacher@example.com';
    var contactPhone = getInputValue('contactPhone') || '+1 (555) 000-0000';
    var contactLocation = getInputValue('contactLocation') || 'City, State / Country';

    var courses = collectCourses();
    var achievements = collectAchievements();
    var philPoints = collectPhilPoints();
    var stats = collectStats();

    var coursesHTML = '';
    courses.forEach(function (c) {
      coursesHTML += '<div class="course-card">' +
        '<div class="course-card__icon" style="background:' + primaryLight + ';color:' + primary + '">' + c.icon + '</div>' +
        '<h3 class="course-card__title">' + c.title + '</h3>' +
        '<p class="course-card__desc">' + c.desc + '</p>' +
        '<span class="course-card__level">' + c.level + '</span>' +
        '</div>';
    });

    var achievementsHTML = '';
    achievements.forEach(function (a) {
      achievementsHTML += '<div class="achievement-card">' +
        '<span class="achievement-card__year">' + a.year + '</span>' +
        '<h3 class="achievement-card__title">' + a.title + '</h3>' +
        '<p>' + a.desc + '</p>' +
        '</div>';
    });

    var philPointsHTML = '';
    philPoints.forEach(function (p) {
      philPointsHTML += '<div class="philosophy__point">' +
        '<h3>' + p + '</h3>' +
        '</div>';
    });

    var statsHTML = '';
    stats.forEach(function (s) {
      statsHTML += '<div class="stat">' +
        '<span class="stat__number">' + s.num + s.suffix + '</span>' +
        '<span class="stat__label">' + s.label + '</span>' +
        '</div>';
    });

    var html = '<!DOCTYPE html>\n' +
      '<html lang="en">\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>' + siteTitle + '</title>\n' +
      '  <link rel="stylesheet" href="css/style.css">\n' +
      '  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
      '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">\n' +
      '</head>\n' +
      '<body>\n' +
      '  <style>\n' +
      '    :root {\n' +
      '      --color-primary: ' + primary + ';\n' +
      '      --color-primary-dark: ' + darkenHex(primary) + ';\n' +
      '      --color-primary-light: ' + primaryLight + ';\n' +
      '      --color-accent: ' + accent + ';\n' +
      '      --color-accent-light: ' + accentLight + ';\n' +
      '    }\n' +
      '  </style>\n' +
      '  <header class="header" id="header">\n' +
      '    <div class="container header__inner">\n' +
      '      <a href="#home" class="logo">' + siteTitle + '</a>\n' +
      '      <nav class="nav" id="nav">\n' +
      '        <ul class="nav__list">\n' +
      '          <li><a href="#home" class="nav__link active">Home</a></li>\n' +
      '          <li><a href="#about" class="nav__link">About</a></li>\n' +
      '          <li><a href="#courses" class="nav__link">Courses</a></li>\n' +
      '          <li><a href="#philosophy" class="nav__link">Philosophy</a></li>\n' +
      '          <li><a href="#achievements" class="nav__link">Achievements</a></li>\n' +
      '          <li><a href="#contact" class="nav__link">Contact</a></li>\n' +
      '        </ul>\n' +
      '      </nav>\n' +
      '      <button class="hamburger" id="hamburger" aria-label="Toggle menu"><span></span><span></span><span></span></button>\n' +
      '    </div>\n' +
      '  </header>\n' +
      '  <main>\n' +
      '    <section class="hero" id="home">\n' +
      '      <div class="container hero__inner">\n' +
      '        <div class="hero__text">\n' +
      '          <p class="hero__tagline">' + heroTagline + '</p>\n' +
      '          <h1 class="hero__title">' + heroTitle.split(' ').map(function(w, i) { return i === heroTitle.indexOf(heroHighlight) ? '<span class="highlight">' + heroHighlight + '</span>' : w; }).join(' ') + '</h1>\n' +
      '          <p class="hero__desc">' + heroDesc + '</p>\n' +
      '          <div class="hero__actions">\n' +
      '            <a href="#contact" class="btn btn--primary">Get in Touch</a>\n' +
      '            <a href="#about" class="btn btn--outline">Learn More</a>\n' +
      '          </div>\n' +
      '        </div>\n' +
      '        <div class="hero__image">\n' +
      '          <div class="hero__avatar"><span class="hero__avatar-text">' + initials + '</span></div>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </section>\n' +
      '    <section class="section" id="about">\n' +
      '      <div class="container">\n' +
      '        <h2 class="section__title">About Me</h2>\n' +
      '        <div class="about__grid">\n' +
      '          <div class="about__image"><div class="about__img-placeholder"><span>Your Photo</span></div></div>\n' +
      '          <div class="about__content">\n' +
      '            <p class="about__lead">' + aboutLead + '</p>\n' +
      '            <p>' + aboutP1 + '</p>\n' +
      '            <p>' + aboutP2 + '</p>\n' +
      '            <div class="about__stats">' + statsHTML + '</div>\n' +
      '          </div>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </section>\n' +
      '    <section class="section section--alt" id="courses">\n' +
      '      <div class="container">\n' +
      '        <h2 class="section__title">Courses Taught</h2>\n' +
      '        <p class="section__subtitle">A selection of courses I have taught and developed.</p>\n' +
      '        <div class="courses__grid">' + coursesHTML + '</div>\n' +
      '      </div>\n' +
      '    </section>\n' +
      '    <section class="section" id="philosophy">\n' +
      '      <div class="container">\n' +
      '        <h2 class="section__title">Teaching Philosophy</h2>\n' +
      '        <div class="philosophy__content">\n' +
      '          <blockquote class="philosophy__quote"><p>' + philQuote + '</p><cite>' + philCite + '</cite></blockquote>\n' +
      '          <div class="philosophy__points">' + philPointsHTML + '</div>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </section>\n' +
      '    <section class="section section--alt" id="achievements">\n' +
      '      <div class="container">\n' +
      '        <h2 class="section__title">Achievements &amp; Recognition</h2>\n' +
      '        <div class="achievements__grid">' + achievementsHTML + '</div>\n' +
      '      </div>\n' +
      '    </section>\n' +
      '    <section class="section" id="contact">\n' +
      '      <div class="container">\n' +
      '        <h2 class="section__title">Get in Touch</h2>\n' +
      '        <p class="section__subtitle">Have a question or want to collaborate? I would love to hear from you.</p>\n' +
      '        <div class="contact__grid">\n' +
      '          <div class="contact__info">\n' +
      '            <div class="contact__info-item"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><div><h4>Email</h4><p>' + contactEmail + '</p></div></div>\n' +
      '            <div class="contact__info-item"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><div><h4>Phone</h4><p>' + contactPhone + '</p></div></div>\n' +
      '            <div class="contact__info-item"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><div><h4>Location</h4><p>' + contactLocation + '</p></div></div>\n' +
      '          </div>\n' +
      '          <form class="contact__form" id="contactForm"><div class="form__group"><label for="name">Name</label><input type="text" id="name" name="name" placeholder="Your name" required></div><div class="form__group"><label for="email">Email</label><input type="email" id="email" name="email" placeholder="your@email.com" required></div><div class="form__group"><label for="subject">Subject</label><input type="text" id="subject" name="subject" placeholder="How can I help?"></div><div class="form__group"><label for="message">Message</label><textarea id="message" name="message" rows="5" placeholder="Write your message..." required></textarea></div><button type="submit" class="btn btn--primary btn--full">Send Message</button></form>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </section>\n' +
      '  </main>\n' +
      '  <footer class="footer"><div class="container footer__inner"><p class="footer__copy">&copy; ' + new Date().getFullYear() + ' ' + siteTitle + '. All rights reserved.</p><div class="footer__social"><a href="#" aria-label="LinkedIn" class="footer__social-link">LI</a><a href="#" aria-label="Twitter" class="footer__social-link">TW</a><a href="#" aria-label="GitHub" class="footer__social-link">GH</a></div></div></footer>\n' +
      '  <div class="toast" id="toast"></div>\n' +
      '  <script src="js/script.js"></script>\n' +
      '</body>\n' +
      '</html>';

    return html;
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function darkenHex(hex) {
    var r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
    var g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
    var b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function updatePreview() {
    var primary = getColor('colorPrimary');
    var siteTitle = getInputValue('siteTitle') || 'Teacher Portfolio';
    var heroTitle = getInputValue('heroTitle') || 'Empowering Every Learner';
    var heroHighlight = getInputValue('heroHighlight') || 'Every Learner';
    var heroTagline = getInputValue('heroTagline') || 'Welcome';
    var aboutLead = getInputValue('aboutLead') || 'A dedicated educator.';
    var contactEmail = getInputValue('contactEmail') || 'teacher@example.com';

    previewContent.innerHTML =
      '<div style="text-align:center;margin-bottom:16px">' +
        '<span style="font-size:0.75rem;color:' + primary + ';font-weight:600;text-transform:uppercase;letter-spacing:0.1em">' + heroTagline + '</span>' +
        '<h1 style="font-size:1.3rem;margin-top:4px">' + heroTitle.replace(heroHighlight, '<span style="color:' + primary + '">' + heroHighlight + '</span>') + '</h1>' +
        '<p style="font-size:0.8rem;color:#64748b">' + getInputValue('heroDesc').substring(0, 80) + '...</p>' +
      '</div>' +
      '<div style="display:flex;gap:16px;justify-content:center;margin-bottom:16px">' +
        '<span class="preview-badge">Home</span>' +
        '<span class="preview-badge" style="background:#f1f5f9;color:#64748b">About</span>' +
        '<span class="preview-badge" style="background:#f1f5f9;color:#64748b">Courses</span>' +
        '<span class="preview-badge" style="background:#f1f5f9;color:#64748b">Contact</span>' +
      '</div>' +
      '<p style="font-size:0.8rem;margin-bottom:12px"><strong>' + aboutLead.substring(0, 60) + '</strong></p>' +
      '<div style="display:flex;gap:16px;justify-content:center">' +
        statsContainer.querySelectorAll('.stat-row').length > 0 ? '<span class="preview-stat">10+</span>' + '<span style="font-size:0.7rem;color:#64748b">Years</span>' : '' +
      '</div>' +
      '<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0">' +
        '<p style="font-size:0.7rem;color:#64748b">' + contactEmail + '</p>' +
      '</div>';
  }

  function downloadFiles() {
    var html = generateHTML();
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Website generated and downloaded as index.html!');
  }

  function showToast(message) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'toast toast--visible';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.classList.remove('toast--visible');
      setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
  }

  document.getElementById('addCourse').addEventListener('click', function () {
    coursesContainer.appendChild(createCourseRow({ icon: '\uD83D\uDCD6', title: '', desc: '', level: '' }));
    updatePreview();
  });

  document.getElementById('addAchievement').addEventListener('click', function () {
    achievementsContainer.appendChild(createAchievementRow({ year: '', title: '', desc: '' }));
    updatePreview();
  });

  document.getElementById('addPhilPoint').addEventListener('click', function () {
    philPointsContainer.appendChild(createPhilPointRow(''));
    updatePreview();
  });

  document.getElementById('addStat').addEventListener('click', function () {
    statsContainer.appendChild(createStatRow('', '', ''));
    updatePreview();
  });

  btnGenerate.addEventListener('click', downloadFiles);

  document.getElementById('editorForm').addEventListener('input', function () {
    updatePreview();
  });

  defaultCourses.forEach(function (c) {
    coursesContainer.appendChild(createCourseRow(c));
  });

  defaultAchievements.forEach(function (a) {
    achievementsContainer.appendChild(createAchievementRow(a));
  });

  defaultPhilPoints.forEach(function (p) {
    philPointsContainer.appendChild(createPhilPointRow(p));
  });

  updatePreview();

  var styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap';
  document.head.appendChild(styleLink);
})();