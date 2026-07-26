(function () {
  var STORAGE_KEY = 'teacher_portfolio_cms';
  var previewOpen = true;

  var tabs = [
    { id: 'general', label: 'General', icon: '\u2699' },
    { id: 'hero', label: 'Hero', icon: '\uD83C\uDFA8' },
    { id: 'about', label: 'About', icon: '\uD83D\uDC64' },
    { id: 'courses', label: 'Courses', icon: '\uD83D\uDCD6' },
    { id: 'philosophy', label: 'Philosophy', icon: '\u270D' },
    { id: 'achievements', label: 'Achievements', icon: '\u2B50' },
    { id: 'contact', label: 'Contact', icon: '\uD83D\uDCE7' },
    { id: 'theme', label: 'Theme', icon: '\uD83C\uDFFA' }
  ];

  var defaultData = {
    site: { title: 'Teacher Portfolio', primaryColor: '#4f46e5', accentColor: '#059669' },
    hero: { tagline: 'Welcome to My Teaching Portfolio', title: 'Empowering Every Learner', highlight: 'Every Learner', description: 'Passionate educator dedicated to creating engaging, inclusive, and impactful learning experiences that inspire students to reach their full potential.', initials: 'TP' },
    about: { lead: 'Hello! I am a dedicated educator with over 10 years of experience shaping young minds and fostering a love for learning.', paragraphs: ['My teaching journey has taken me through multiple subjects and grade levels, where I have developed innovative approaches to engage students and make complex concepts accessible and enjoyable.', 'I believe that every student is unique and has the potential to excel when given the right guidance, support, and encouragement.'], stats: [{ number: '10', suffix: '+', label: 'Years Experience' }, { number: '500', suffix: '+', label: 'Students Mentored' }, { number: '3', suffix: '', label: 'Subject Specializations' }] },
    courses: [{ icon: '\uD83D\uDCD6', title: 'Mathematics', description: 'From algebra to calculus, building strong foundations in mathematical thinking.', level: 'Grades 9-12' }, { icon: '\uD83D\uDD2C', title: 'Science', description: 'Engaging students in hands-on experiments and inquiry-based learning.', level: 'Grades 7-10' }, { icon: '\u26A1', title: 'Physics', description: 'Making physics intuitive through real-world applications.', level: 'Grades 11-12' }, { icon: '\uD83D\uDCBB', title: 'Computer Science', description: 'Introduction to programming, algorithms, and computational thinking.', level: 'Grades 9-12' }],
    philosophy: { quote: 'Education is not the filling of a pail, but the lighting of a fire.', attribution: '\u2014 William Butler Yeats', points: [{ title: 'Student-Centered Learning', description: 'Every student is unique and learns differently. My approach focuses on scaffolding instruction to meet individual needs while fostering independence.' }, { title: 'Inclusive Classroom', description: 'Creating a safe and welcoming environment where all students feel valued and encouraged to participate.' }, { title: 'Real-World Connections', description: 'Linking curriculum to real-life applications and current events helps students understand the relevance of what they are learning.' }, { title: 'Continuous Growth', description: 'Both students and teachers should embrace lifelong learning. I regularly seek feedback and adapt my methods to improve.' }] },
    achievements: [{ year: '2023', title: 'Distinguished Teacher Award', description: 'Recognized for outstanding contributions to student achievement.' }, { year: '2022', title: 'Curriculum Development Lead', description: 'Led the development of a new interdisciplinary STEM curriculum.' }, { year: '2021', title: 'Student Mentorship Excellence', description: 'Awarded for exceptional dedication to mentoring underprivileged students.' }, { year: '2019', title: 'National Conference Speaker', description: 'Shared research on adaptive learning strategies at a national conference.' }],
    contact: { email: 'teacher@example.com', phone: '+1 (555) 123-4567', location: 'City, State / Country' }
  };

  var data = null;
  var changed = false;

  function getData() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { /* ignore */ }
    }
    return null;
  }

  function saveData(d) {
    data = d;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    changed = true;
    updateSaveStatus();
  }

  function updateSaveStatus() {
    var el = document.getElementById('saveStatus');
    if (!el) return;
    if (changed) {
      el.textContent = 'Unsaved';
      el.className = 'cms-status cms-status--unsaved';
    } else {
      el.textContent = 'Saved';
      el.className = 'cms-status cms-status--saved';
    }
  }

  function getDataFile() {
    var input = document.getElementById('fileInput');
    input.click();
  }

  function handleFileLoad(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var parsed = JSON.parse(ev.target.result);
        saveData(parsed);
        render();
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleDownload() {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleBuild() {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('data.json downloaded! Place it in the project root and run `npm run build` to generate your website.');
  }

  function renderSidebar() {
    var nav = document.getElementById('sidebarNav');
    nav.innerHTML = tabs.map(function (t) {
      return '<div class="cms__nav-item' + (t.id === getCurrentTab() ? ' active' : '') + '" data-tab="' + t.id + '"><span class="cms__nav-icon">' + t.icon + '</span><span>' + t.label + '</span></div>';
    }).join('');
    nav.querySelectorAll('.cms__nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        switchTab(item.dataset.tab);
      });
    });
  }

  function getCurrentTab() {
    return document.querySelector('.cms__nav-item.active') ? document.querySelector('.cms__nav-item.active').dataset.tab : 'general';
  }

  function switchTab(tabId) {
    document.querySelectorAll('.cms__nav-item').forEach(function (n) {
      n.classList.toggle('active', n.dataset.tab === tabId);
    });
    document.querySelectorAll('.cms__tab').forEach(function (t) {
      t.classList.toggle('active', t.id === 'tab-' + tabId);
    });
    document.getElementById('topbarTitle').textContent = tabs.find(function (t) { return t.id === tabId; }).label;
    render();
  }

  function render() {
    renderSidebar();
    var content = document.getElementById('cmsContent');
    var tab = getCurrentTab();
    var html = '<div class="cms-tab active" id="tab-' + tab + '">';
    switch (tab) {
      case 'general': html += renderGeneral(); break;
      case 'hero': html += renderHero(); break;
      case 'about': html += renderAbout(); break;
      case 'courses': html += renderCourses(); break;
      case 'philosophy': html += renderPhilosophy(); break;
      case 'achievements': html += renderAchievements(); break;
      case 'contact': html += renderContact(); break;
      case 'theme': html += renderTheme(); break;
    }
    html += '</div>';
    content.innerHTML = html;

    content.querySelectorAll('input, textarea').forEach(function (el) {
      el.addEventListener('input', function () { onFieldChange(el); });
    });
    content.querySelectorAll('.btn-add').forEach(function (btn) {
      btn.addEventListener('click', function () { onAddClick(btn); });
    });
    content.querySelectorAll('.btn-remove').forEach(function (btn) {
      btn.addEventListener('click', function () { onRemoveClick(btn); });
    });
  }

  function onFieldChange(el) {
    var path = el.dataset.path;
    if (!path) return;
    setPath(data, path, el.value);
    saveData(data);
    updatePreview();
  }

  function onAddClick(btn) {
    var type = btn.dataset.add;
    var path = btn.dataset.path;
    if (type === 'course') {
      var arr = getPath(data, path);
      arr.push({ icon: '\uD83D\uDCD6', title: '', description: '', level: '' });
    } else if (type === 'achievement') {
      var arr2 = getPath(data, path);
      arr2.push({ year: '', title: '', description: '' });
    } else if (type === 'point') {
      var arr3 = getPath(data, path);
      arr3.push({ title: '', description: '' });
    } else if (type === 'stat') {
      var arr4 = getPath(data, path);
      arr4.push({ number: '', suffix: '', label: '' });
    } else if (type === 'paragraph') {
      var arr5 = getPath(data, path);
      arr5.push('');
    }
    saveData(data);
    render();
  }

  function onRemoveClick(btn) {
    var path = btn.dataset.path;
    var idx = parseInt(btn.dataset.index);
    var arr = getPath(data, path);
    if (arr && idx >= 0 && idx < arr.length) {
      arr.splice(idx, 1);
      saveData(data);
      render();
    }
  }

  function getPath(obj, path) {
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) return undefined;
      current = current[parts[i]];
    }
    return current[parts[parts.length - 1]];
  }

  function setPath(obj, path, value) {
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  function inputHTML(path, value, placeholder) {
    return '<input type="text" data-path="' + path + '" value="' + escAttr(value) + '" placeholder="' + escAttr(placeholder || '') + '">';
  }

  function textareaHTML(path, value, placeholder) {
    return '<textarea data-path="' + path + '" placeholder="' + escAttr(placeholder || '') + '">' + escHtml(value || '') + '</textarea>';
  }

  function escHtml(str) {
    if (!str && str !== 0) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escAttr(str) {
    if (!str && str !== 0) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderGeneral() {
    return '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Site Settings</div>' +
        '<div class="form-group">' + inputHTML('site.title', data.site.title, 'Your name or site title') + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderHero() {
    return '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Hero Section</div>' +
        '<div class="form-group">' + inputHTML('hero.tagline', data.hero.tagline, 'Welcome to My Teaching Portfolio') + '</div>' +
        '<div class="form-group">' + inputHTML('hero.title', data.hero.title, 'Empowering Every Learner') + '</div>' +
        '<div class="form-row">' +
          '<div class="form-group">' + inputHTML('hero.highlight', data.hero.highlight, 'Every Learner') + '</div>' +
          '<div class="form-group">' + inputHTML('hero.initials', data.hero.initials, 'TP') + '</div>' +
        '</div>' +
        '<div class="form-group">' + textareaHTML('hero.description', data.hero.description, 'Describe your teaching passion...') + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderAbout() {
    var html = '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">About Me</div>' +
        '<div class="form-group">' + textareaHTML('about.lead', data.about.lead, 'Bio lead sentence...') + '</div>';

    data.about.paragraphs.forEach(function (p, i) {
      html += '<div class="form-group">' + textareaHTML('about.paragraphs.' + i, p, 'Paragraph ' + (i + 1)) + '<button type="button" class="btn btn-sm btn-remove" data-path="about.paragraphs" data-index="' + i + '">&times;</button></div>';
    });

    html += '<div class="cms-data-actions"><button type="button" class="btn btn--sm btn--outline" data-add="paragraph" data-path="about.paragraphs">+ Add Paragraph</button></div>';

    html += '<div class="cms-section__title" style="margin-top:24px">Stats</div>';

    data.about.stats.forEach(function (s, i) {
      html += '<div class="list-row">' +
        '<input type="text" data-path="about.stats.' + i + '.number" value="' + escAttr(s.number) + '" placeholder="Number" style="flex:0 0 80px">' +
        '<input type="text" data-path="about.stats.' + i + '.suffix" value="' + escAttr(s.suffix) + '" placeholder="+">' +
        '<input type="text" data-path="about.stats.' + i + '.label" value="' + escAttr(s.label) + '" placeholder="Label">' +
        '<button type="button" class="btn-remove" data-path="about.stats" data-index="' + i + '">&times;</button>' +
        '</div>';
    });

    html += '<div class="cms-data-actions"><button type="button" class="btn btn--sm btn--outline" data-add="stat" data-path="about.stats">+ Add Stat</button></div>';
    html += '</div></div>';
    return html;
  }

  function renderCourses() {
    var html = '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Courses</div>';

    data.courses.forEach(function (c, i) {
      html += '<div class="cms-card">' +
        '<div class="cms-card__header">' +
          '<span class="cms-card__title">Course ' + (i + 1) + '</span>' +
          '<button type="button" class="btn btn-sm btn-remove" data-path="courses" data-index="' + i + '">&times;</button>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group">' + inputHTML('courses.' + i + '.icon', c.icon, '\uD83D\uDCD6') + '</div>' +
          '<div class="form-group">' + inputHTML('courses.' + i + '.level', c.level, 'All Grades') + '</div>' +
        '</div>' +
        '<div class="form-group">' + inputHTML('courses.' + i + '.title', c.title, 'Course Title') + '</div>' +
        '<div class="form-group">' + textareaHTML('courses.' + i + '.description', c.description, 'Course description...') + '</div>' +
      '</div>';
    });

    html += '<div class="cms-data-actions"><button type="button" class="btn btn--sm btn--outline" data-add="course" data-path="courses">+ Add Course</button></div>';
    html += '</div></div>';
    return html;
  }

  function renderPhilosophy() {
    var html = '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Teaching Philosophy</div>' +
        '<div class="form-group">' + textareaHTML('philosophy.quote', data.philosophy.quote, 'Your teaching philosophy quote...') + '</div>' +
        '<div class="form-group">' + inputHTML('philosophy.attribution', data.philosophy.attribution, '\u2014 Author Name') + '</div>' +
      '</div>' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Philosophy Points</div>';

    data.philosophy.points.forEach(function (p, i) {
      html += '<div class="cms-card">' +
        '<div class="cms-card__header">' +
          '<span class="cms-card__title">Point ' + (i + 1) + '</span>' +
          '<button type="button" class="btn btn-sm btn-remove" data-path="philosophy.points" data-index="' + i + '">&times;</button>' +
        '</div>' +
        '<div class="form-group">' + inputHTML('philosophy.points.' + i + '.title', p.title, 'Point title') + '</div>' +
        '<div class="form-group">' + textareaHTML('philosophy.points.' + i + '.description', p.description, 'Point description...') + '</div>' +
      '</div>';
    });

    html += '<div class="cms-data-actions"><button type="button" class="btn btn--sm btn--outline" data-add="point" data-path="philosophy.points">+ Add Point</button></div>';
    html += '</div></div>';
    return html;
  }

  function renderAchievements() {
    var html = '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Achievements</div>';

    data.achievements.forEach(function (a, i) {
      html += '<div class="cms-card">' +
        '<div class="cms-card__header">' +
          '<span class="cms-card__title">Achievement ' + (i + 1) + '</span>' +
          '<button type="button" class="btn btn-sm btn-remove" data-path="achievements" data-index="' + i + '">&times;</button>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group">' + inputHTML('achievements.' + i + '.year', a.year, '2024') + '</div>' +
          '<div class="form-group">' + inputHTML('achievements.' + i + '.title', a.title, 'Achievement Title') + '</div>' +
        '</div>' +
        '<div class="form-group">' + textareaHTML('achievements.' + i + '.description', a.description, 'Description...') + '</div>' +
      '</div>';
    });

    html += '<div class="cms-data-actions"><button type="button" class="btn btn--sm btn--outline" data-add="achievement" data-path="achievements">+ Add Achievement</button></div>';
    html += '</div></div>';
    return html;
  }

  function renderContact() {
    return '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Contact Information</div>' +
        '<div class="form-group">' + inputHTML('contact.email', data.contact.email, 'teacher@example.com') + '</div>' +
        '<div class="form-group">' + inputHTML('contact.phone', data.contact.phone, '+1 (555) 123-4567') + '</div>' +
        '<div class="form-group">' + inputHTML('contact.location', data.contact.location, 'City, State / Country') + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderTheme() {
    return '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Theme Colors</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Primary Color</label><div style="display:flex;align-items:center;gap:10px">' + inputHTML('site.primaryColor', data.site.primaryColor, '#4f46e5') + '<input type="color" data-path="site.primaryColor" value="' + escAttr(data.site.primaryColor) + '" style="width:40px;height:32px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer"></div></div>' +
          '<div class="form-group"><label>Accent Color</label><div style="display:flex;align-items:center;gap:10px">' + inputHTML('site.accentColor', data.site.accentColor, '#059669') + '<input type="color" data-path="site.accentColor" value="' + escAttr(data.site.accentColor) + '" style="width:40px;height:32px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer"></div></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function updatePreview() {
    var frame = document.getElementById('previewFrame');
    if (!frame || !previewOpen) return;
    var html = generatePreviewHTML();
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    frame.src = url;
  }

  function generatePreviewHTML() {
    var primary = data.site.primaryColor || '#4f46e5';
    var accent = data.site.accentColor || '#059669';

    function rgba(hex, a) {
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    var s = data.site || {};
    var h = data.hero || {};
    var a = data.about || {};
    var p = data.philosophy || {};
    var c = data.contact || {};

    var statsHtml = (a.stats || []).map(function (st) {
      return '<div><strong>' + escHtml(st.number) + (st.suffix || '') + '</strong> <span style="color:#64748b;font-size:0.8rem">' + escHtml(st.label || '') + '</span></div>';
    }).join('');

    var coursesHtml = (data.courses || []).map(function (co) {
      return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:8px">' +
        '<div style="font-size:1.3rem;margin-bottom:8px">' + escHtml(co.icon || '') + '</div>' +
        '<strong>' + escHtml(co.title || '') + '</strong>' +
        '<p style="font-size:0.75rem;color:#64748b">' + escHtml((co.description || '').substring(0, 80)) + '...</p>' +
        '<span style="font-size:0.65rem;background:#d1fae5;color:#059669;padding:2px 8px;border-radius:999px">' + escHtml(co.level || '') + '</span>' +
        '</div>';
    }).join('');

    var pointsHtml = (p.points || []).map(function (pt) {
      return '<div><strong>' + escHtml(pt.title || '') + '</strong><p style="font-size:0.7rem;color:#64748b">' + escHtml(pt.description || '').substring(0, 60) + '...</p></div>';
    }).join('');

    var achievementsHtml = (data.achievements || []).map(function (ach) {
      return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px">' +
        '<span style="font-size:0.65rem;background:#e0e7ff;color:#4f46e5;padding:2px 8px;border-radius:999px">' + escHtml(ach.year || '') + '</span>' +
        '<strong style="font-size:0.8rem">' + escHtml(ach.title || '') + '</strong>' +
        '<p style="font-size:0.7rem;color:#64748b">' + escHtml((ach.description || '').substring(0, 60)) + '...</p>' +
        '</div>';
    }).join('');

    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>' +
      ':root{--color-primary:' + primary + ';--color-primary-dark:' + darkenHex(primary) + ';--color-primary-light:' + rgba(primary, 0.12) + ';--color-accent:' + accent + ';--color-accent-light:' + rgba(accent, 0.12) + ';' +
      'body{font-family:Inter,sans-serif;color:#1e293b;line-height:1.7;margin:0;padding:0;background:#f8fafc}' +
      '.container{max-width:1120px;margin:0 auto;padding:0 24px}' +
      '.header{position:sticky;top:0;background:rgba(255,255,255,.85);backdrop-filter:blur(12px);border-bottom:1px solid #e2e8f0;padding:12px 0;z-index:100}' +
      '.header__inner{display:flex;justify-content:space-between;align-items:center}' +
      '.logo{font-family:Playfair Display,serif;font-size:1.2rem;font-weight:700;color:' + primary + '}' +
      '.hero{min-height:60vh;display:flex;align-items:center;padding:60px 0}' +
      '.hero__title{font-family:Playfair Display,serif;font-size:2.5rem;font-weight:700;line-height:1.2;margin-bottom:12px}' +
      '.hero__desc{color:#64748b;margin-bottom:20px}' +
      '.highlight{color:' + primary + '}' +
      '.section{padding:48px 0}' +
      '.section__title{font-family:Playfair Display,serif;font-size:1.6rem;font-weight:700;text-align:center;margin-bottom:24px}' +
      '.about__stats{display:flex;gap:24px;margin-top:20px}' +
      '.stat__number{font-size:1.5rem;font-weight:700;color:' + primary + '}' +
      '.stat__label{font-size:0.75rem;color:#64748b}' +
      '.course-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:12px}' +
      '.course-card__icon{font-size:1.3rem;margin-bottom:8px}' +
      '.course-card__level{font-size:0.65rem;background:var(--color-accent-light);color:var(--color-accent);padding:2px 8px;border-radius:999px;display:inline-block}' +
      '.philosophy__quote{border-left:3px solid ' + primary + ';padding:16px 20px;background:#f1f5f9;border-radius:0 8px 8px 0;margin-bottom:20px;font-style:italic}' +
      '.philosophy__points{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
      '.achievement-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:10px}' +
      '.achievement-card__year{font-size:0.65rem;background:var(--color-primary-light);color:' + primary + ';padding:2px 8px;border-radius:999px;font-weight:700}' +
      '.footer{padding:20px 0;text-align:center;font-size:0.7rem;color:#64748b;border-top:1px solid #e2e8f0;margin-top:40px}' +
      '@media(max-width:600px){.hero__title{font-size:1.6rem}.about__stats{flex-direction:column}.philosophy__points{grid-template-columns:1fr}}' +
      '</style></head><body>' +
      '<div class="header"><div class="container header__inner"><a href="#" class="logo">' + escHtml(s.title || 'Portfolio') + '</a></div></div>' +
      '<main><section class="hero"><div class="container"><p style="font-size:0.8rem;color:' + primary + ';text-transform:uppercase;letter-spacing:.1em">' + escHtml(h.tagline || '') + '</p>' +
      '<h1 class="hero__title">Empowering <span class="highlight">' + escHtml(h.highlight || '') + '</span></h1>' +
      '<p class="hero__desc">' + escHtml(h.description || '') + '</p></div></section>' +
      '<section class="section" id="about"><div class="container"><h2 class="section__title">About Me</h2>' +
      '<p style="font-weight:500">' + escHtml(a.lead || '') + '</p>' +
      '<div class="about__stats">' + statsHtml + '</div></div></section>' +
      '<section class="section" style="background:#f8fafc"><div class="container"><h2 class="section__title">Courses</h2>' + coursesHtml + '</div></section>' +
      '<section class="section"><div class="container"><h2 class="section__title">Philosophy</h2>' +
      '<blockquote style="border-left:3px solid ' + primary + ';padding:16px 20px;background:#f1f5f9;border-radius:0 8px 8px 0;font-style:italic;font-size:1.1rem">' + escHtml(p.quote || '') + '</blockquote>' +
      '<p style="font-size:0.8rem;color:#64748b">' + escHtml(p.attribution || '') + '</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' + pointsHtml + '</div></div></section>' +
      '<section class="section" style="background:#f8fafc"><div class="container"><h2 class="section__title">Achievements</h2>' + achievementsHtml + '</div></section>' +
      '<section class="section"><div class="container"><h2 class="section__title">Contact</h2><p style="color:#64748b">' + escHtml(c.email || '') + ' | ' + escHtml(c.phone || '') + ' | ' + escHtml(c.location || '') + '</p></div></section>' +
      '</main><footer class="footer"><p>&copy; ' + new Date().getFullYear() + ' ' + escHtml(s.title || '') + '</p></footer>' +
      '</body></html>';
  }

  function darkenHex(hex) {
    var r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
    var g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
    var b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function togglePreview() {
    previewOpen = !previewOpen;
    var panel = document.getElementById('cmsPreview');
    panel.style.display = previewOpen ? 'flex' : 'none';
  }

  function init() {
    var stored = getData();
    if (stored) {
      data = stored;
    } else {
      data = JSON.parse(JSON.stringify(defaultData));
      saveData(data);
    }

    document.getElementById('cmsContent').addEventListener('input', function (e) {
      changed = true;
      updateSaveStatus();
    });
    document.getElementById('cmsContent').addEventListener('change', function (e) {
      onFieldChange(e.target);
      updatePreview();
    });

    render();
    updatePreview();

    document.getElementById('btnLoad').addEventListener('click', getDataFile);
    document.getElementById('fileInput').addEventListener('change', handleFileLoad);
    document.getElementById('btnDownload').addEventListener('click', handleDownload);
    document.getElementById('btnBuild').addEventListener('click', handleBuild);
    document.getElementById('btnTogglePreview').addEventListener('click', togglePreview);
  }

  init();
})();